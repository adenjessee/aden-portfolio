import { elevenKey, elevenModel, elevenVoice, type WorkerEnv } from "../lib/env";
import { estimateTtsCost } from "../guard/costTable";

export type TtsChunk = {
  audio?: string;
  alignment?: {
    chars?: string[];
    charStartTimesMs?: number[];
    charDurationsMs?: number[];
  };
  isFinal?: boolean;
};

export function ttsConfigured(env: WorkerEnv): boolean {
  return Boolean(elevenKey(env) && elevenVoice(env));
}

export async function synthesizeSpeech(env: WorkerEnv, text: string): Promise<{
  audio: ArrayBuffer | null;
  alignment?: TtsChunk["alignment"];
  costUsd: number;
  configured: boolean;
}> {
  const key = elevenKey(env);
  const voice = elevenVoice(env);
  if (!key || !voice) {
    return { audio: null, costUsd: 0, configured: false };
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: elevenModel(env),
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    return { audio: null, costUsd: estimateTtsCost(text.length), configured: true };
  }

  return {
    audio: await response.arrayBuffer(),
    costUsd: estimateTtsCost(text.length),
    configured: true,
  };
}

export function ttsWebSocketUrl(env: WorkerEnv): string | null {
  const voice = elevenVoice(env);
  if (!voice) return null;
  const model = elevenModel(env);
  return `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input?model_id=${model}&output_format=mp3_44100_128`;
}
