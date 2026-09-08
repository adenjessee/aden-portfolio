import { limits } from "../config/site";
import type { WorkerEnv } from "../lib/env";
import { embedQuery } from "./embed";
import { loadBundledChunks, scoreLocal } from "./localIndex";
import type { Retrieved } from "./types";

export async function retrieve(env: WorkerEnv, query: string, topK = limits.retrievalTopK): Promise<Retrieved[]> {
  const local = loadBundledChunks();
  const canVectorize = Boolean(env?.VECTORIZE && typeof env.VECTORIZE.query === "function");
  const vector = canVectorize ? await embedQuery(env, query) : null;

  if (canVectorize && vector) {
    const matches = await env.VECTORIZE.query(vector, { topK, returnMetadata: "all" });
    const hits: Retrieved[] = (matches.matches ?? []).map((match) => {
      const meta = (match.metadata ?? {}) as Record<string, string>;
      return {
        id: String(match.id),
        path: meta.path || "",
        title: meta.title || "",
        source: meta.source || "",
        confidence: (meta.confidence as Retrieved["confidence"]) || "medium",
        lastUpdated: meta.lastUpdated || "",
        text: meta.text || "",
        score: match.score ?? 0,
      };
    });
    if (hits.length > 0) return hits;
  }

  return scoreLocal(query, local, topK);
}
