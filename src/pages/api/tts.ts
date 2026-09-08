import type { APIRoute } from "astro";
import { addVoiceSeconds } from "../../guard/sessionCap";
import { chargeBudget } from "../../guard/budget";
import { synthesizeSpeech, ttsConfigured } from "../../voice/elevenlabsStream";
import { clientIp, sessionId } from "../../lib/env";
import { checkRateLimit } from "../../guard/rateLimit";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const ip = clientIp(request);
  const rate = await checkRateLimit(env, ip);
  if (!rate.ok) return new Response("rate limited", { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = (body.text || "").trim().slice(0, 1200);
  if (!text) return new Response("missing text", { status: 400 });

  if (!ttsConfigured(env)) {
    return new Response(null, { status: 204 });
  }

  const result = await synthesizeSpeech(env, text);
  const seconds = Math.ceil(text.length / 14);
  await addVoiceSeconds(env, sid, seconds);
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
