import { limits } from "../config/site";
import type { WorkerEnv } from "../lib/env";
import { embedQuery } from "./embed";
import { loadBundledChunks, scoreLocal } from "./localIndex";
import { bestMatch, hasPosition } from "./threshold";
import type { KbChunk, Retrieved } from "./types";

// bge-base cosine: unrelated text sits near 0.45, a paraphrase of the same claim near 0.8.
function vectorMatch(cosine: number): number {
  return Math.max(0, Math.min(1, (cosine - 0.45) / 0.35));
}

const RRF_K = 60;

/** Reciprocal rank fusion: rank agreement between the two retrievers beats either raw score. */
function fuse(lexical: Retrieved[], vector: Retrieved[], topK: number): Retrieved[] {
  const rows = new Map<string, Retrieved & { rrf: number }>();
  const add = (list: Retrieved[]) =>
    list.forEach((hit, rank) => {
      const existing = rows.get(hit.id);
      const rrf = 1 / (RRF_K + rank + 1);
      if (existing) {
        existing.rrf += rrf;
        existing.match = Math.max(existing.match, hit.match);
        existing.via = "hybrid";
      } else {
        rows.set(hit.id, { ...hit, rrf });
      }
    });
  add(lexical);
  add(vector);
  return [...rows.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, topK)
    .map(({ rrf, ...hit }) => ({ ...hit, score: rrf }));
}

export async function retrieve(env: WorkerEnv, query: string, topK = limits.retrievalTopK): Promise<Retrieved[]> {
  const local = loadBundledChunks();
  const lexical = scoreLocal(query, local, topK * 2);

  const canVectorize = Boolean(env?.VECTORIZE && typeof env.VECTORIZE.query === "function");
  if (!canVectorize) return lexical.slice(0, topK);

  const vector = await embedQuery(env, query).catch(() => null);
  if (!vector) return lexical.slice(0, topK);

  const matches = await env!.VECTORIZE!.query(vector, { topK: topK * 2, returnMetadata: "all" }).catch(() => null);
  const byId = new Map<string, KbChunk>(local.map((chunk) => [chunk.id, chunk]));
  const vectorHits: Retrieved[] = (matches?.matches ?? []).flatMap((m) => {
    // The bundled index is the source of truth for text; Vectorize only contributes a ranking.
    const chunk = byId.get(String(m.id));
    if (!chunk) return [];
    return [{ ...chunk, score: m.score ?? 0, match: vectorMatch(m.score ?? 0), via: "vector" as const }];
  });

  if (vectorHits.length === 0) return lexical.slice(0, topK);
  return fuse(lexical, vectorHits, topK);
}

/**
 * Retrieval for one turn of a conversation. The question is tried on its own first; only when that
 * finds nothing on record is the previous question attached, so "why?" or "and the cost?" still land
 * while a new short question ("are you open to roles?") is not dragged back to the last topic.
 */
export async function retrieveForTurn(env: WorkerEnv, question: string, previousQuestion?: string): Promise<Retrieved[]> {
  const alone = await retrieve(env, question);
  if (!previousQuestion || hasPosition(alone)) return alone;
  const joined = await retrieve(env, `${question} ${previousQuestion}`);
  return bestMatch(joined) > bestMatch(alone) ? joined : alone;
}
