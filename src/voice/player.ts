import type { Viseme } from "./alignmentToVisemes";

export type StreamAlignment = { chars: string[]; startsMs: number[]; endsMs: number[] } | null;

type MouthFrame = { start: number; end: number; viseme: Viseme; open: number };

// How far each letter opens the mouth, and with which shape. Closed consonants (m, b, p) shut it.
const SHAPES: Record<string, [Viseme, number]> = {
  a: ["aa", 1], e: ["ee", 0.75], i: ["ih", 0.7], o: ["oh", 0.9], u: ["ou", 0.75], y: ["ih", 0.5],
  w: ["ou", 0.5], r: ["ou", 0.35], l: ["ih", 0.35], h: ["aa", 0.35],
  m: ["aa", 0], b: ["aa", 0], p: ["aa", 0], f: ["ih", 0.2], v: ["ih", 0.2],
};

/**
 * Plays text-to-speech audio as it streams in and knows, at any instant, which mouth shape the
 * avatar should make. Audio and mouth share one clock: the AudioContext's.
 */
export class SpeechPlayer {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private nextTime = 0;
  private frames: MouthFrame[] = [];
  private sources = new Set<AudioBufferSourceNode>();
  private sentence = { index: -1, start: 0, lastEndMs: 0 };
  private bins = new Uint8Array(256);

  /** Must run inside the key press or click that sent the question, or browsers keep it muted. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.gain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.gain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  /** Cuts the current answer off, for when the visitor asks something new mid-sentence. */
  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already ended
      }
    }
    this.sources.clear();
    this.frames = [];
    this.nextTime = 0;
    this.sentence = { index: -1, start: 0, lastEndMs: 0 };
  }

  get speaking(): boolean {
    return Boolean(this.ctx && this.ctx.currentTime < this.nextTime);
  }

  /** Seconds until everything queued has played. */
  get remaining(): number {
    return this.ctx ? Math.max(0, this.nextTime - this.ctx.currentTime) : 0;
  }

  enqueue(base64: string, sampleRate: number, index: number, alignment: StreamAlignment): void {
    if (!this.ctx || !this.gain) return;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    if (samples.length === 0) return;
    const buffer = this.ctx.createBuffer(1, samples.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 32768;

    const startAt = Math.max(this.ctx.currentTime + 0.05, this.nextTime);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start(startAt);
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    this.nextTime = startAt + buffer.duration;

    const firstChunk = index !== this.sentence.index;
    if (firstChunk) this.sentence = { index, start: startAt, lastEndMs: 0 };
    if (alignment?.chars.length) {
      // ElevenLabs timestamps count from the start of the sentence's audio. If a later chunk's
      // timestamps restart near zero instead, they count from that chunk, so anchor them there.
      const cumulative = firstChunk || alignment.startsMs[0] >= this.sentence.lastEndMs - 50;
      const origin = cumulative ? this.sentence.start : startAt;
      for (let i = 0; i < alignment.chars.length; i += 1) {
        const shape = SHAPES[alignment.chars[i].toLowerCase()];
        if (!shape) continue;
        this.frames.push({
          start: origin + alignment.startsMs[i] / 1000,
          end: origin + Math.max(alignment.endsMs[i], alignment.startsMs[i] + 40) / 1000,
          viseme: shape[0],
          open: shape[1],
        });
      }
      this.sentence.lastEndMs = alignment.endsMs[alignment.endsMs.length - 1] ?? this.sentence.lastEndMs;
    }
  }

  /** The mouth shape for right now: letter timing picks the shape, loudness scales how open it is. */
  mouth(): { viseme: Viseme; weight: number } {
    if (!this.ctx || !this.analyser || !this.speaking) return { viseme: "aa", weight: 0 };
    const now = this.ctx.currentTime;
    while (this.frames.length && this.frames[0].end < now - 0.05) this.frames.shift();
    const frame = this.frames.find((f) => f.start <= now && now <= f.end);

    this.analyser.getByteTimeDomainData(this.bins);
    let sum = 0;
    for (const value of this.bins) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    const loudness = Math.min(1, Math.sqrt(sum / this.bins.length) * 4.5);
    if (frame) return { viseme: frame.viseme, weight: Math.min(1, frame.open * (0.45 + loudness * 0.75)) };
    return { viseme: "aa", weight: loudness > 0.08 ? loudness * 0.6 : 0 };
  }
}
