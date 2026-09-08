import type { Provenance, Retrieved } from "./types";

export function toProvenance(hits: Retrieved[]): Provenance[] {
  return hits.map((hit) => ({
    claim: hit.text.slice(0, 220),
    source: hit.source,
    confidence: hit.confidence,
    lastUpdated: hit.lastUpdated,
  }));
}
