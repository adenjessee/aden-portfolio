import { limits } from "../config/site";
import type { Retrieved } from "./types";

export function bestMatch(hits: Retrieved[]): number {
  return hits.reduce((best, hit) => Math.max(best, hit.match), 0);
}

/** True when some note covers enough of the question to count as a position on record. */
export function hasPosition(hits: Retrieved[], threshold = limits.retrievalThreshold): boolean {
  return bestMatch(hits) >= threshold;
}
