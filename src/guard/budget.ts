import { dailyBudgetUsd, type WorkerEnv } from "../lib/env";
import { memoryKv } from "./memoryStore";

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
  const kv = env?.SESSION && typeof env.SESSION.get === "function" ? env.SESSION : null;
  const raw = kv ? await kv.get(key()) : await memoryKv.get(key());
  if (!raw) return { date: today(), spentUsd: 0 };
  try {
    return JSON.parse(raw) as BudgetState;
  } catch {
    return { date: today(), spentUsd: 0 };
  }
}

export async function budgetRemaining(env: WorkerEnv): Promise<{ remaining: number; state: BudgetState; exhausted: boolean }> {
  const state = await read(env);
  const ceiling = dailyBudgetUsd(env);
  const remaining = Math.max(0, ceiling - state.spentUsd);
  return { remaining, state, exhausted: remaining <= 0 };
}

export async function chargeBudget(env: WorkerEnv, amountUsd: number): Promise<BudgetState> {
  const state = await read(env);
  state.spentUsd = Number((state.spentUsd + amountUsd).toFixed(6));
  const value = JSON.stringify(state);
  if (env?.SESSION && typeof env.SESSION.put === "function") {
    await env.SESSION.put(key(), value, { expirationTtl: 172800 });
  } else {
    await memoryKv.put(key(), value, 172800);
  }
  return state;
}
