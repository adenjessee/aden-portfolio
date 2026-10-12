import type { APIRoute } from "astro";
import { limits } from "../../config/site";
import { fitCheck } from "../../director/fit";
import { chargeBudget } from "../../guard/budget";
import { guardAsk } from "../../guard/pipeline";
import { clientIp, sessionCookie, sessionId } from "../../lib/env";
import { json, sameOrigin } from "../../lib/http";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const cookie = sessionCookie(sid);
  const body = (await request.json().catch(() => ({}))) as { jd?: unknown };
  const jd = typeof body.jd === "string" ? body.jd.trim().slice(0, 6000) : "";
  if (jd.length < 80) return json({ error: "Paste the job description: at least a few lines of responsibilities or requirements." }, { status: 400, cookie });

  const guard = await guardAsk(env, clientIp(request), sid, limits.fitCheckCost);
  if (!guard.ok) return json({ error: "Too many requests from this network in the last minute." }, { status: 429, cookie });

  const report = await fitCheck(env, jd, guard.live);
  const budget = await chargeBudget(env, report.costUsd);
  recordEvent(env, { name: "fit", costUsd: report.costUsd, usedLlm: report.mode === "llm", degraded: !guard.live, reason: guard.freeReason });
  return json(
    {
      report,
      meter: {
        live: guard.live,
        freeReason: guard.freeReason ?? null,
        questionsUsed: guard.questionsUsed,
        questionCap: guard.questionCap,
        spentUsd: budget.spentUsd,
        ceilingUsd: guard.ceilingUsd,
      },
    },
    { cookie },
  );
};
