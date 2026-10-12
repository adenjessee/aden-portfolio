import type { APIRoute } from "astro";
import { budgetRemaining, chargeBudget } from "../../guard/budget";
import { checkRateLimit } from "../../guard/rateLimit";
import { clientIp } from "../../lib/env";
import { json, sameOrigin } from "../../lib/http";
import { recordEvent } from "../../telemetry/events";
import { SttUnavailable, transcribe } from "../../voice/stt";

export const prerender = false;

const MAX_BYTES = 3_000_000; // about three minutes of Opus; a spoken question is a few seconds

/**
 * Turns a recorded question into text. 503 with `unavailable` tells the page to fall back to the
 * browser's own speech recognition.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("audio/")) return json({ error: "Send audio." }, { status: 415 });
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_BYTES) return json({ error: "Too long." }, { status: 413 });

  const rate = await checkRateLimit(env, clientIp(request));
  if (!rate.ok) return json({ error: "Too many requests from this network." }, { status: 429 });
  if ((await budgetRemaining(env)).exhausted) return json({ unavailable: "budget" }, { status: 503 });

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return json({ error: "Empty or too long." }, { status: 413 });

  try {
    const result = await transcribe(env, new Blob([body], { type }));
    await chargeBudget(env, result.costUsd);
    recordEvent(env, { name: "stt", costUsd: result.costUsd });
    return json({ text: result.text, seconds: result.seconds });
  } catch (error) {
    if (error instanceof SttUnavailable) return json({ unavailable: error.message }, { status: 503 });
    recordEvent(env, { name: "stt_error", reason: error instanceof Error ? error.message : "unknown" });
    return json({ error: "Could not transcribe that." }, { status: 502 });
  }
};
