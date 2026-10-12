import type { APIRoute } from "astro";
import { getJson, store } from "../../guard/store";
import { inboxToken } from "../../lib/env";
import { json } from "../../lib/http";
import type { InboxMessage } from "./message";

export const prerender = false;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Aden's read-only view of messages left through AI Aden. `npm run inbox` calls this. */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const token = inboxToken(env);
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !given || !timingSafeEqual(given, token)) return json({ error: "Not found." }, { status: 404 });

  const s = store(env);
  const keys = (await s.list("inbox:", 200)).sort().reverse();
  const messages = (await Promise.all(keys.map((key) => getJson<InboxMessage>(s, key)))).filter(Boolean);
  return json({ count: messages.length, messages });
};
