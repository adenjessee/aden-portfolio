import { limits } from "../config/site";
import type { Retrieved } from "./types";

export function bestScore(hits: Retrieved[]): number {
  return hits[0]?.score ?? 0;
}

export function hasPosition(hits: Retrieved[], threshold = limits.retrievalThreshold): boolean {
  return bestScore(hits) >= threshold;
}
