import type { APIRoute } from "astro";
import { budgetRemaining, chargeBudget } from "../../guard/budget";
import { checkRateLimit } from "../../guard/rateLimit";
import { countMessage } from "../../guard/sessionCap";
import { agentId, clientIp, elevenKey, sessionCookie, sessionId } from "../../lib/env";
import { json, sameOrigin } from "../../lib/http";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

/** Live calls per visit. Each is capped at five minutes on the agent itself. */
const CALLS_PER_VISIT = 3;
// Agents bill by the minute; this reserves a typical two-minute call against the daily ceiling.
const ESTIMATED_CALL_USD = 0.2;

/**
 * Hands the page a short-lived WebRTC token for one live voice call with the ElevenLabs agent.
 * The API key never reaches the browser, and the agent refuses calls without a token.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const cookie = sessionCookie(sid);
  const id = agentId(env);
  const key = elevenKey(env);
  if (!id || !key) return json({ unavailable: "not_configured" }, { status: 503, cookie });

  if (!(await checkRateLimit(env, clientIp(request))).ok) return json({ error: "Too many requests from this network." }, { status: 429, cookie });
  if ((await budgetRemaining(env)).exhausted) return json({ unavailable: "budget" }, { status: 503, cookie });
  // Reuses the per-visit counter keyed separately from messages.
  if (!(await countMessage(env, `${sid}:live`, CALLS_PER_VISIT))) return json({ unavailable: "visit_limit" }, { status: 503, cookie });

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(id)}`, {
    headers: { "xi-api-key": key },
  });
  if (!response.ok) {
    recordEvent(env, { name: "live_error", reason: `token_${response.status}` });
    return json({ unavailable: response.status === 401 || response.status === 403 ? "no_permission" : "token_failed" }, { status: 503, cookie });
  }
  const { token } = (await response.json()) as { token?: string };
  await chargeBudget(env, ESTIMATED_CALL_USD);
  recordEvent(env, { name: "live_call", costUsd: ESTIMATED_CALL_USD });
  return json({ token }, { cookie });
};
