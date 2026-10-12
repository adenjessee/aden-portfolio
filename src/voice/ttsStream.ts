import { estimateTtsCost } from "../guard/costTable";
import { elevenKey, elevenModel, elevenVoice, type WorkerEnv } from "../lib/env";

export const TTS_SAMPLE_RATE = 24000;

export type TtsAlignment = { chars: string[]; startsMs: number[]; endsMs: number[] };
export type TtsChunk = { audio: string; alignment: TtsAlignment | null };

type RawChunk = {
  audio_base64?: string;
  alignment?: {
    characters?: string[];
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  } | null;
};

function toAlignment(raw: RawChunk["alignment"]): TtsAlignment | null {
  if (!raw?.characters?.length || !raw.character_start_times_seconds || !raw.character_end_times_seconds) return null;
  return {
    chars: raw.characters,
    startsMs: raw.character_start_times_seconds.map((s) => Math.round(s * 1000)),
    endsMs: raw.character_end_times_seconds.map((s) => Math.round(s * 1000)),
  };
}

/**
 * One sentence through ElevenLabs' streaming endpoint with character timestamps, as raw 16-bit PCM
 * so the browser can schedule each chunk the moment it arrives. previous/next text keep the
 * intonation continuous across sentence-sized requests.
 */
export async function* streamSentence(
  env: WorkerEnv,
  text: string,
  context: { previous?: string; next?: string } = {},
): AsyncGenerator<TtsChunk> {
  const key = elevenKey(env);
  const voice = elevenVoice(env);
  if (!key || !voice) return;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream/with-timestamps?output_format=pcm_${TTS_SAMPLE_RATE}`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: elevenModel(env),
        voice_settings: { stability: 0.45, similarity_boost: 0.75 },
        previous_text: context.previous || undefined,
        next_text: context.next || undefined,
      }),
    },
  );
  if (!response.ok || !response.body) {
    throw new Error(`elevenlabs_${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = function* (line: string): Generator<TtsChunk> {
    if (!line.trim()) return;
    const chunk = JSON.parse(line) as RawChunk;
    if (chunk.audio_base64) yield { audio: chunk.audio_base64, alignment: toAlignment(chunk.alignment) };
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) yield* parse(line);
  }
  yield* parse(buffer);
}

/**
 * Turns sentences into audio in order. Up to two requests run ahead so the next sentence is ready
 * when the current one ends; chunks are forwarded strictly in sentence order.
 */
export class SpeechPipeline {
  private sentences: string[] = [];
  private pending = new Map<number, Promise<TtsChunk[]>>();
  private next = 0;
  private closed = false;
  private wake: (() => void) | null = null;
  private done: Promise<void>;
  characters = 0;
  failure: string | null = null;

  constructor(
    private readonly env: WorkerEnv,
    private readonly emit: (event: { index: number; text: string } & TtsChunk) => void,
    private readonly lookahead = 2,
  ) {
    this.done = this.run();
  }

  push(sentence: string): void {
    if (this.closed || this.failure) return;
    this.sentences.push(sentence);
    this.prefetch();
    this.wake?.();
  }

  async finish(): Promise<{ characters: number; costUsd: number; failure: string | null }> {
    this.closed = true;
    this.wake?.();
    await this.done;
    return { characters: this.characters, costUsd: estimateTtsCost(this.characters), failure: this.failure };
  }

  /** Starts sentences after the one playing, up to the lookahead. Sentence 0 is never prefetched. */
  private prefetch(): void {
    const from = Math.max(1, this.next);
    for (let i = from; i < Math.min(this.sentences.length, this.next + 1 + this.lookahead); i += 1) {
      if (this.pending.has(i)) continue;
      const text = this.sentences[i];
      this.characters += text.length;
      const job = (async () => {
        const chunks: TtsChunk[] = [];
        for await (const chunk of streamSentence(this.env, text, { previous: this.sentences[i - 1], next: this.sentences[i + 1] })) {
          chunks.push(chunk);
        }
        return chunks;
      })();
      job.catch(() => undefined); // surfaced when awaited in order
      this.pending.set(i, job);
    }
  }

  private async waitFor(index: number): Promise<boolean> {
    while (this.sentences.length <= index) {
      if (this.closed) return false;
      await new Promise<void>((resolve) => (this.wake = resolve));
      this.wake = null;
    }
    return true;
  }

  private async run(): Promise<void> {
    try {
      while (await this.waitFor(this.next)) {
        const index = this.next;
        const text = this.sentences[index];
        if (index === 0) {
          // The first sentence streams straight through: its first chunk is the time to first sound.
          this.characters += text.length;
          for await (const chunk of streamSentence(this.env, text, { next: this.sentences[1] })) this.emit({ index, text, ...chunk });
        } else {
          if (!this.pending.has(index)) this.prefetch();
          const chunks = await this.pending.get(index)!;
          this.pending.delete(index);
          for (const chunk of chunks) this.emit({ index, text, ...chunk });
        }
        this.next += 1;
        this.prefetch();
      }
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "tts_failed";
    }
  }
}
