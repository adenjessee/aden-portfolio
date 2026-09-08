import type { WorkerEnv } from "../lib/env";
import { budgetRemaining } from "./budget";
import { checkRateLimit } from "./rateLimit";
import { consumeQuestion, type SessionDecision } from "./sessionCap";

export type GuardOk = {
  ok: true;
  session: Extract<SessionDecision, { ok: true }>;
  budgetExhausted: boolean;
  degradeToCached: boolean;
};

export type GuardFail = {
  ok: false;
  reason: "rate_limited" | "session_exhausted";
  degradeToCached: true;
};

export async function guardAsk(env: WorkerEnv, ip: string, sid: string): Promise<GuardOk | GuardFail> {
  const rate = await checkRateLimit(env, ip);
  if (!rate.ok) return { ok: false, reason: "rate_limited", degradeToCached: true };

  const session = await consumeQuestion(env, sid);
  if (!session.ok) return { ok: false, reason: "session_exhausted", degradeToCached: true };

  const budget = await budgetRemaining(env);
  return {
    ok: true,
    session,
    budgetExhausted: budget.exhausted,
    degradeToCached: budget.exhausted,
  };
}
