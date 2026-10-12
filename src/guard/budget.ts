import { dailyBudgetUsd, type WorkerEnv } from "../lib/env";
import { getJson, store } from "./store";

export type BudgetState = {
  date: string;
  spentUsd: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function key(): string {
  return `budget:${today()}`;
}

async function read(env: WorkerEnv): Promise<BudgetState> {
  return (await getJson<BudgetState>(store(env), key())) ?? { date: today(), spentUsd: 0 };
}

export async function budgetRemaining(env: WorkerEnv): Promise<{ remaining: number; state: BudgetState; exhausted: boolean; ceiling: number }> {
  const state = await read(env);
  const ceiling = dailyBudgetUsd(env);
  const remaining = Math.max(0, ceiling - state.spentUsd);
  return { remaining, state, exhausted: remaining <= 0, ceiling };
}

/**
 * KV has no atomic increment, so two answers finishing at once can each read the old total. At this
 * site's traffic the overshoot is one answer's cost; the ceiling is a brake, not an invoice.
 */
export async function chargeBudget(env: WorkerEnv, amountUsd: number): Promise<BudgetState> {
  const state = await read(env);
  if (amountUsd <= 0) return state;
  state.spentUsd = Number((state.spentUsd + amountUsd).toFixed(6));
  await store(env).put(key(), JSON.stringify(state), 172800);
  return state;
}
