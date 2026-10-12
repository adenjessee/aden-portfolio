/** USD per million tokens. Cache writes bill at 1.25x input; reads at the listed rate. */
type ModelPrice = { input: number; output: number; cacheRead: number };

export const modelPrices: Record<string, ModelPrice> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cacheRead: 0.075 },
};

// Unknown model ids are priced as Opus so the daily ceiling errs toward stopping early.
const fallbackPrice = modelPrices["claude-opus-5-5"];

export const costUsd = {
  ttsPer1kChars: 0.05,
  /** Retrieval plus the extractive answer runs inside the Worker; Workers AI embeddings are a rounding error. */
  extractiveQuestion: 0,
} as const;

export function priceFor(model: string): ModelPrice {
  const exact = modelPrices[model];
  if (exact) return exact;
  const prefix = Object.keys(modelPrices).find((id) => model.startsWith(id));
  return prefix ? modelPrices[prefix] : fallbackPrice;
}

export type Usage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export function estimateAskCost(opts: { usedLlm: boolean } & Partial<Usage>): number {
  if (!opts.usedLlm) return costUsd.extractiveQuestion;
  const price = priceFor(opts.model ?? "");
  const usd =
    ((opts.inputTokens ?? 0) * price.input +
      (opts.cacheWriteTokens ?? 0) * price.input * 1.25 +
      (opts.cacheReadTokens ?? 0) * price.cacheRead +
      (opts.outputTokens ?? 0) * price.output) /
    1_000_000;
  return Number(usd.toFixed(6));
}

export function estimateTtsCost(characters: number): number {
  return (characters / 1000) * costUsd.ttsPer1kChars;
}
