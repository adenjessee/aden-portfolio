import type { Provenance, Retrieved } from "./types";

export function toProvenance(hits: Retrieved[], citedIds: string[] = []): Provenance[] {
  const cited = new Set(citedIds);
  return hits.map((hit) => ({
    id: hit.id,
    path: hit.path,
    title: hit.title,
    claim: hit.text.replace(/\s+/g, " ").slice(0, 220),
    source: hit.source,
    confidence: hit.confidence,
    status: hit.status,
    lastUpdated: hit.lastUpdated,
    match: Number(hit.match.toFixed(3)),
    cited: cited.has(hit.id),
  }));
}

/** Public URL of the note a chunk came from. */
export function noteHref(path: string): string {
  return `/notes/${path.replace(/\.md$/, "")}`;
}
