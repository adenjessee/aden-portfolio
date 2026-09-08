import { chunkMarkdown } from "./chunk";
import type { KbChunk, Retrieved } from "./types";
import bundled from "./generated/kb-index.json";

type Bundle = {
  chunks: KbChunk[];
};

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "it",
  "that",
  "this",
  "with",
  "as",
  "be",
  "are",
  "was",
  "i",
  "you",
  "we",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

export function loadBundledChunks(): KbChunk[] {
  return (bundled as Bundle).chunks ?? [];
}

export function scoreLocal(query: string, chunks: KbChunk[], topK: number): Retrieved[] {
  const q = tokens(query);
  if (q.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const titleTokens = tokens(chunk.title);
    const hay = tokens(`${chunk.title} ${chunk.text}`);
    let overlap = 0;
    for (const token of q) {
      const titleHit = titleTokens.some((word) => word === token || word.startsWith(token) || token.startsWith(word));
      const hits = hay.filter((word) => word === token || word.startsWith(token) || token.startsWith(word)).length;
      overlap += hits > 0 ? 1 + Math.min(hits, 3) * 0.15 : 0;
      if (titleHit) overlap += 1.2;
    }
    const score = overlap / q.length;
    return { ...chunk, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function extractiveAnswer(hits: Retrieved[], maxChars = 900): string {
  const parts = hits.slice(0, 3).map((hit) => hit.text.replace(/\s+/g, " ").trim());
  const joined = parts.join(" ");
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars - 1).trimEnd()}.`;
}

export { chunkMarkdown };
