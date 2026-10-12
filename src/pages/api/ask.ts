import type { APIRoute } from "astro";
import { limits } from "../../config/site";
import { clientIp, sessionCookie, sessionId } from "../../lib/env";
import { cleanHistory, json, sameOrigin } from "../../lib/http";
import type { AskEvent } from "../../protocol";
import { runAskTurn } from "../../server/askTurn";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

/** HTTP in, server-sent events out. The turn itself lives in src/server/askTurn.ts. */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const body = (await request.json().catch(() => ({}))) as { question?: unknown; history?: unknown; voice?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return json({ error: "Missing question." }, { status: 400 });

  const turn = { question, history: cleanHistory(body.history, limits.historyTurns), voice: body.voice === true, sid, ip: clientIp(request) };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AskEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        await runAskTurn(env, turn, emit);
      } catch (error) {
        recordEvent(env, { name: "ask_error", reason: error instanceof Error ? error.message : "unknown" });
        emit({ type: "error", message: "Something broke on my side. The notes are still readable at /notes.", reason: "server_error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Set-Cookie": sessionCookie(sid) },
  });
};
