import type { APIRoute } from "astro";
import { addVoiceSeconds } from "../../guard/sessionCap";
import { budgetRemaining, chargeBudget } from "../../guard/budget";
import { getJson, store } from "../../guard/store";
import { synthesizeSpeech, ttsConfigured } from "../../voice/elevenlabsStream";
import { clientIp, sessionId } from "../../lib/env";
import { sameOrigin } from "../../lib/http";
import { checkRateLimit } from "../../guard/rateLimit";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

/**
 * Speaks an answer /api/ask already produced for this session, looked up by id. It never accepts text:
 * a cloned voice that reads arbitrary input would let anyone make Aden say anything.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return new Response("cross-site", { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const rate = await checkRateLimit(env, clientIp(request));
  if (!rate.ok) return new Response("rate limited", { status: 429 });
  if (!ttsConfigured(env)) return new Response(null, { status: 204 });

  const body = (await request.json().catch(() => ({}))) as { answerId?: unknown };
  const answerId = typeof body.answerId === "string" ? body.answerId.slice(0, 64) : "";
  if (!answerId) return new Response("missing answerId", { status: 400 });

  const s = store(env);
  const record = await getJson<{ sid: string; text: string }>(s, `speech:${answerId}`);
  if (!record || record.sid !== sid) return new Response(null, { status: 204 });
  // One playback per answer.
  await s.put(`speech:${answerId}`, JSON.stringify({ sid: "", text: "" }), 60);

  if ((await budgetRemaining(env)).exhausted) return new Response(null, { status: 204 });
  const result = await synthesizeSpeech(env, record.text);
  await addVoiceSeconds(env, sid, Math.ceil(record.text.length / 14));
  await chargeBudget(env, result.costUsd);
  recordEvent(env, { name: "tts", costUsd: result.costUsd });

  if (!result.audio) return new Response(null, { status: 204 });
  return new Response(result.audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
};
