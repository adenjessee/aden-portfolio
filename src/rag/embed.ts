import type { WorkerEnv } from "../lib/env";
import type { KbChunk } from "./types";

const MODEL = "@cf/baai/bge-base-en-v1.5";

export async function embedQuery(env: WorkerEnv, text: string): Promise<number[] | null> {
  if (!env?.AI || typeof env.AI.run !== "function") return null;
  const result = await env.AI.run(MODEL, { text: [text] });
  const data = (result as { data?: number[][] }).data;
  return data?.[0] ?? null;
}

export async function embedChunks(env: WorkerEnv, chunks: KbChunk[]): Promise<Array<{ id: string; values: number[] }> | null> {
  if (!env?.AI || typeof env.AI.run !== "function") return null;
  const result = await env.AI.run(MODEL, { text: chunks.map((chunk) => chunk.text) });
  const data = (result as { data?: number[][] }).data;
  if (!data) return null;
  return chunks.map((chunk, index) => ({ id: chunk.id, values: data[index] }));
}
