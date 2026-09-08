export async function playAudioBuffer(buffer: ArrayBuffer): Promise<HTMLAudioElement> {
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play().catch(() => undefined);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  return audio;
}

export function listenForSpeech(onText: (text: string) => void): { stop: () => void; supported: boolean } {
  const Speech = (window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

  if (!Speech) return { stop() {}, supported: false };

  const recognition = new Speech();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript;
    if (text) onText(text);
  };
  recognition.start();
  return { stop: () => recognition.stop(), supported: true };
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results?: Array<Array<{ transcript?: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};
