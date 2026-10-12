import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropicKey, gatewayUrl, llmModel, type WorkerEnv } from "../lib/env";
import type { HistoryTurn } from "./prompt";
import type { Wire } from "./wire";
import type { z } from "zod";

export type ProviderCall<T> = {
  value: T | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Set when the call failed or the model declined; the caller falls back to the extractive path. */
  failure?: string;
};

// Opus 5.5, Opus 5, Fable 5.1 and Sonnet 5.5 accept server-side fallbacks on a policy decline.
const FALLBACK_MODELS = /^claude-(opus-5|fable-5-1|sonnet-5-5)/;

export function toMessages(history: HistoryTurn[], finalUser: string): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of history) {
    const role = turn.role === "visitor" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    // The API wants alternating roles starting with user; merge or skip anything that breaks that.
    if (!last && role === "assistant") continue;
    if (last?.role === role) {
      last.content = `${String(last.content)}\n\n${turn.text}`;
      continue;
    }
    messages.push({ role, content: turn.text });
  }
  if (messages[messages.length - 1]?.role === "user") messages.pop();
  messages.push({ role: "user", content: finalUser });
  return messages;
}

export async function callClaude<S extends z.ZodType>(
  env: WorkerEnv,
  opts: {
    system: string;
    history: HistoryTurn[];
    user: string;
    schema: S;
    maxTokens?: number;
    fetch?: typeof fetch;
    /** When set, the reply is streamed and this receives the JSON text written so far. */
    onSnapshot?: (snapshot: string) => void;
  },
): Promise<ProviderCall<z.infer<S>>> {
  const model = llmModel(env);
  const empty = { model, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const apiKey = anthropicKey(env);
  if (!apiKey) return { ...empty, value: null, failure: "no_key" };

  // AI_GATEWAY_URL, when set, should be the gateway's Anthropic endpoint (…/anthropic).
  const client = new Anthropic({ apiKey, baseURL: gatewayUrl(env) || undefined, maxRetries: 1, timeout: 45_000, fetch: opts.fetch });
  const fallback = FALLBACK_MODELS.test(model);

  try {
    // A plain JSON-schema format rather than the SDK's auto-parsing one: auto-parse throws on a refusal
    // or a cut-off reply before the stop reason or the billed usage can be read. The API still enforces it.
    const format = betaZodOutputFormat(opts.schema);
    const params = {
      model,
      max_tokens: opts.maxTokens ?? 8000,
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      // Chat answers do not repay deep thinking; low effort keeps the visitor's wait short.
      output_config: { effort: "low" as const, format: { type: format.type, schema: format.schema } },
      system: [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }],
      messages: toMessages(opts.history, opts.user),
    };

    let response: Anthropic.Beta.BetaMessage;
    if (opts.onSnapshot) {
      const stream = client.beta.messages.stream(params);
      stream.on("text", (_delta, snapshot) => opts.onSnapshot?.(snapshot));
      response = await stream.finalMessage();
    } else {
      response = await client.beta.messages.create(params);
    }

    const usage = {
      model: response.model,
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    };
    if (response.stop_reason === "refusal") return { ...usage, value: null, failure: "refusal" };
    if (response.stop_reason === "max_tokens") return { ...usage, value: null, failure: "max_tokens" };
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ...usage, value: null, failure: "unparsed" };
    }
    const parsed = opts.schema.safeParse(json);
    return parsed.success ? { ...usage, value: parsed.data as z.infer<S> } : { ...usage, value: null, failure: "schema_mismatch" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ...empty, value: null, failure: "provider_rate_limited" };
    if (error instanceof Anthropic.AuthenticationError) return { ...empty, value: null, failure: "provider_auth" };
    if (error instanceof Anthropic.APIError) return { ...empty, value: null, failure: `provider_${error.status ?? "error"}` };
    return { ...empty, value: null, failure: error instanceof Error ? error.message.slice(0, 120) : "unknown" };
  }
}

export type { Wire };
