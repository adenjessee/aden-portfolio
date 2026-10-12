import type { z } from "zod";
import { llmProvider, type WorkerEnv } from "../lib/env";
import { callClaude } from "./anthropic";
import { callOpenAi } from "./openai";
import type { HistoryTurn } from "./prompt";

/** One structured request to a model: a system prompt, prior turns, this turn, and the schema to fill. */
export type LlmRequest<S extends z.ZodType> = {
  system: string;
  history: HistoryTurn[];
  user: string;
  schema: S;
  /** Streams the JSON text written so far, where the provider can. */
  onSnapshot?: (snapshot: string) => void;
};

export type LlmResult<T> = {
  value: T | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Set when the call failed or the model declined; callers fall back to the notes. */
  failure?: string;
};

/** What the answer and fit-check code depend on. Providers live behind it. */
export interface LlmClient {
  readonly provider: "anthropic" | "openai";
  complete<S extends z.ZodType>(request: LlmRequest<S>): Promise<LlmResult<z.infer<S>>>;
}

/** The configured model client, or null when no key is set (notes-only mode). */
export function llmClient(env: WorkerEnv): LlmClient | null {
  switch (llmProvider(env)) {
    case "anthropic":
      return { provider: "anthropic", complete: (request) => callClaude(env, request) };
    case "openai":
      return { provider: "openai", complete: (request) => callOpenAi(env, request) };
    default:
      return null;
  }
}
