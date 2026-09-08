import type { APIRoute } from "astro";
import { loadBundledChunks } from "../../rag/localIndex";
import { dailyBudgetUsd } from "../../lib/env";
import { budgetRemaining } from "../../guard/budget";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const budget = await budgetRemaining(env);
  return new Response(
    JSON.stringify({
      ok: true,
      chunks: loadBundledChunks().length,
      vectorize: Boolean(env?.VECTORIZE),
      ai: Boolean(env?.AI),
      kv: Boolean(env?.SESSION),
      dailyBudgetUsd: dailyBudgetUsd(env),
      spentUsd: budget.state.spentUsd,
      budgetExhausted: budget.exhausted,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
