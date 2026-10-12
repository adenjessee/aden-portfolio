import type { APIRoute } from "astro";
import { budgetRemaining } from "../../guard/budget";
import { peekSession } from "../../guard/sessionCap";
import { llmModel, llmProvider, sessionId, sessionQuestionCap } from "../../lib/env";
import { json } from "../../lib/http";

export const prerender = false;

/** Feeds the meter on /ask before the first question: which model is live and what is left. */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const provider = llmProvider(env);
  const [budget, session] = await Promise.all([budgetRemaining(env), peekSession(env, sessionId(request))]);
  return json({
    provider,
    model: provider === "none" ? null : llmModel(env),
    live: provider !== "none" && !budget.exhausted && session.questions < sessionQuestionCap(env),
    questionsUsed: session.questions,
    questionCap: sessionQuestionCap(env),
    spentUsd: budget.state.spentUsd,
    ceilingUsd: budget.ceiling,
  });
};
