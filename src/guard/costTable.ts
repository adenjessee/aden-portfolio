export const costUsd = {
  llmInputPerMTok: 0.2,
  llmOutputPerMTok: 1.2,
  ttsPerMinute: 0.05,
  fallbackQuestion: 0.0004,
} as const;

export function estimateAskCost(opts: { usedLlm: boolean; inputTokens: number; outputTokens: number }): number {
  if (!opts.usedLlm) return costUsd.fallbackQuestion;
  return (opts.inputTokens / 1_000_000) * costUsd.llmInputPerMTok + (opts.outputTokens / 1_000_000) * costUsd.llmOutputPerMTok;
}

export function estimateTtsCost(characters: number): number {
  return (characters / 1000) * costUsd.ttsPerMinute;
}
