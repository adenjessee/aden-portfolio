import { elevenKey, type WorkerEnv } from "../lib/env";

// ElevenLabs lists Scribe at about $0.40 per hour of audio.
const USD_PER_SECOND = 0.4 / 3600;
export const STT_MODEL = "scribe_v1";

export type Transcript = { text: string; seconds: number; costUsd: number };

export class SttUnavailable extends Error {}

/** Batch speech-to-text for one spoken question. */
export async function transcribe(env: WorkerEnv, audio: Blob): Promise<Transcript> {
  const key = elevenKey(env);
  if (!key) throw new SttUnavailable("no_key");
  const form = new FormData();
  form.set("model_id", STT_MODEL);
  form.set("tag_audio_events", "false");
  form.set("file", audio, "question");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (response.status === 401 || response.status === 403) throw new SttUnavailable("no_permission");
  if (!response.ok) throw new Error(`stt_${response.status}`);
  const data = (await response.json()) as { text?: string; words?: { end?: number }[] };
  const seconds = data.words?.length ? Math.max(0, data.words[data.words.length - 1].end ?? 0) : 0;
  return { text: (data.text ?? "").trim(), seconds, costUsd: Number((seconds * USD_PER_SECOND).toFixed(6)) };
}
