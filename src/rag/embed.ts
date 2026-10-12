import type { WorkerEnv } from "../lib/env";

// 768 dimensions. scripts/embed-kb.ts embeds the notes with the same model.
const MODEL = "@cf/baai/bge-base-en-v1.5";

export async function embedQuery(env: WorkerEnv, text: string): Promise<number[] | null> {
  if (!env?.AI || typeof env.AI.run !== "function") return null;
  // bge v1.5 retrieves better when short queries carry this instruction; passages are embedded without it.
  const result = await env.AI.run(MODEL, { text: [`Represent this sentence for searching relevant passages: ${text}`] });
  const data = (result as { data?: number[][] }).data;
  return data?.[0] ?? null;
}

