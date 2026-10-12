/**
 * Two ways to turn the visitor's voice into a question, behind one interface so the page does not
 * care which is in use: ElevenLabs speech-to-text via /api/stt (any browser), or the browser's own
 * speech recognition (Chrome, Safari, Edge) when the server path is unavailable.
 */
export type ListenEvents = {
  /** Microphone loudness 0..1, for the button's ring. */
  onLevel?: (level: number) => void;
  /** Words recognized so far, when the listener can tell. */
  onPartial?: (text: string) => void;
};

export interface Listener {
  readonly kind: "server" | "browser";
  /** Resolves with the final text ("" if nothing was said) once the visitor stops talking. */
  listen(events: ListenEvents): Promise<string>;
  /** Ends listening now and keeps what was heard. */
  stop(): void;
  /** Ends listening now and throws the audio away. */
  cancel(): void;
}

const SILENCE_MS = 900; // a pause this long after speech ends the question
const NO_SPEECH_MS = 7000; // give up if nothing is said
const MAX_MS = 30000;
const SPEECH_LEVEL = 0.045;

export class ServerListener implements Listener {
  readonly kind = "server";
  private finish: ((keep: boolean) => void) | null = null;

  listen(events: ListenEvents): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      void (async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        const parts: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size && parts.push(e.data);

        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const bins = new Uint8Array(analyser.fftSize);
        const started = performance.now();
        let heard = false;
        let lastLoud = started;
        let keep = true;
        let timer = 0;

        const done = (keepAudio: boolean) => {
          keep = keepAudio;
          window.clearInterval(timer);
          if (recorder.state !== "inactive") recorder.stop();
        };
        this.finish = done;

        timer = window.setInterval(() => {
          analyser.getByteTimeDomainData(bins);
          let sum = 0;
          for (const v of bins) sum += ((v - 128) / 128) ** 2;
          const level = Math.sqrt(sum / bins.length);
          events.onLevel?.(Math.min(1, level * 8));
          const now = performance.now();
          if (level > SPEECH_LEVEL) {
            heard = true;
            lastLoud = now;
          }
          if (heard && now - lastLoud > SILENCE_MS) done(true);
          else if (!heard && now - started > NO_SPEECH_MS) done(false);
          else if (now - started > MAX_MS) done(true);
        }, 50);

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
          this.finish = null;
          events.onLevel?.(0);
          if (!keep || !heard) return resolve("");
          const audio = new Blob(parts, { type: recorder.mimeType || "audio/webm" });
          const response = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": audio.type.split(";")[0] }, body: audio }).catch(() => null);
          if (response?.status === 503) return reject(new SttFallback());
          const payload = (await response?.json().catch(() => ({}))) as { text?: string } | undefined;
          resolve(payload?.text ?? "");
        };
        recorder.start(250);
      })().catch(reject);
    });
  }

  stop(): void {
    this.finish?.(true);
  }

  cancel(): void {
    this.finish?.(false);
  }
}

/** Thrown when the server cannot transcribe, so the page switches to the browser listener. */
export class SttFallback extends Error {}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function browserRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class BrowserListener implements Listener {
  readonly kind = "browser";
  private recognition: SpeechRecognitionLike | null = null;
  private keep = true;

  static available(): boolean {
    return typeof window !== "undefined" && browserRecognition() !== null;
  }

  listen(events: ListenEvents): Promise<string> {
    const Recognition = browserRecognition();
    if (!Recognition) return Promise.reject(new Error("no_speech_recognition"));
    return new Promise<string>((resolve, reject) => {
      const recognition = new Recognition();
      this.recognition = recognition;
      this.keep = true;
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      let text = "";
      recognition.onresult = (e) => {
        text = Array.from(e.results, (r) => r[0].transcript).join(" ").trim();
        events.onPartial?.(text);
        events.onLevel?.(0.6);
      };
      recognition.onerror = (e) => (e.error === "no-speech" || e.error === "aborted" ? undefined : reject(new Error(e.error)));
      recognition.onend = () => {
        events.onLevel?.(0);
        this.recognition = null;
        resolve(this.keep ? text : "");
      };
      recognition.start();
    });
  }

  stop(): void {
    this.recognition?.stop();
  }

  cancel(): void {
    this.keep = false;
    this.recognition?.abort();
  }
}
