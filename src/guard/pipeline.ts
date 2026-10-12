import type { WorkerEnv } from "../lib/env";
import { llmProvider, sessionQuestionCap } from "../lib/env";
import { budgetRemaining } from "./budget";
import { checkRateLimit } from "./rateLimit";
import { consumeQuestion } from "./sessionCap";

/** Why a request is answered from the notes alone instead of the model. */
export type FreeReason = "no_model" | "budget_exhausted" | "session_exhausted";

export type GuardDecision =
  | { ok: false; reason: "rate_limited" }
  | {
      ok: true;
      live: boolean;
      freeReason?: FreeReason;
      voiceAllowed: boolean;
      questionsUsed: number;
      questionCap: number;
      spentUsd: number;
      ceilingUsd: number;
    };

/**
 * Rate limiting stops abuse. Everything else only decides whether the model runs: past the visit's
 * cap or the day's budget, visitors keep asking and get answers assembled from the notes, at no cost.
 */
export async function guardAsk(env: WorkerEnv, ip: string, sid: string, cost = 1): Promise<GuardDecision> {
  const rate = await checkRateLimit(env, ip);
  if (!rate.ok) return { ok: false, reason: "rate_limited" };

  const budget = await budgetRemaining(env);
  const base = { questionCap: sessionQuestionCap(env), spentUsd: budget.state.spentUsd, ceilingUsd: budget.ceiling };

  if (llmProvider(env) === "none") return { ok: true, live: false, freeReason: "no_model", voiceAllowed: false, questionsUsed: 0, ...base };
  if (budget.exhausted) return { ok: true, live: false, freeReason: "budget_exhausted", voiceAllowed: false, questionsUsed: 0, ...base };

  const session = await consumeQuestion(env, sid, cost);
  if (!session.ok) {
    return { ok: true, live: false, freeReason: "session_exhausted", voiceAllowed: false, questionsUsed: session.state.questions, ...base };
  }
  return { ok: true, live: true, voiceAllowed: session.voiceAllowed, questionsUsed: session.state.questions, ...base };
}
