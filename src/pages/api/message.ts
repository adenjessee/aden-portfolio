import type { APIRoute } from "astro";
import { limits } from "../../config/site";
import { checkRateLimit } from "../../guard/rateLimit";
import { countMessage } from "../../guard/sessionCap";
import { store } from "../../guard/store";
import { clientIp, sessionCookie, sessionId } from "../../lib/env";
import { cleanHistory, json, sameOrigin } from "../../lib/http";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

export type InboxMessage = {
  id: string;
  receivedAt: string;
  kind: "message" | "book_call";
  name: string;
  email: string;
  company: string;
  message: string;
  transcript: { role: "visitor" | "aden"; text: string }[];
};

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * The one write AI Aden can make on Aden's behalf: a message the visitor typed and sent themselves.
 * Stored for 30 days. Nothing is emailed or forwarded automatically.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const cookie = sessionCookie(sid);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Bots fill every field; people never see this one.
  if (clip(body.website, 200)) return json({ ok: true }, { cookie });

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const message = clip(body.message, 2000);
  if (!name || !EMAIL.test(email) || message.length < 10) {
    return json({ error: "Add your name, a working email, and a sentence or two." }, { status: 400, cookie });
  }

  const rate = await checkRateLimit(env, clientIp(request));
  if (!rate.ok) return json({ error: "Too many requests from this network. Try again in a minute." }, { status: 429, cookie });
  if (!(await countMessage(env, sid, limits.messagesPerSession))) {
    return json({ error: "Two messages per visit. Aden has the first ones and will reply." }, { status: 429, cookie });
  }

  const receivedAt = new Date().toISOString();
  const id = `${receivedAt}-${crypto.randomUUID().slice(0, 8)}`;
  const record: InboxMessage = {
    id,
    receivedAt,
    kind: body.kind === "book_call" ? "book_call" : "message",
    name,
    email,
    company: clip(body.company, 160),
    message,
    transcript: cleanHistory(body.transcript, 6),
  };
  await store(env).put(`inbox:${id}`, JSON.stringify(record), 60 * 60 * 24 * 30);
  recordEvent(env, { name: "message", reason: record.kind });
  return json({ ok: true, id }, { cookie });
};
