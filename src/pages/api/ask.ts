import type { APIRoute } from "astro";
import { limits } from "../../config/site";
import { answerQuestion } from "../../director/answer";
import { chargeBudget } from "../../guard/budget";
import { guardAsk } from "../../guard/pipeline";
import { store } from "../../guard/store";
import { clientIp, sessionCookie, sessionId } from "../../lib/env";
import { cleanHistory, json, sameOrigin } from "../../lib/http";
import { retrievalQuery, retrieve } from "../../rag/retrieve";
import { toProvenance } from "../../rag/provenance";
import { recordEvent } from "../../telemetry/events";

export const prerender = false;

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json({ error: "Cross-site request." }, { status: 403 });
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const ip = clientIp(request);
  const body = (await request.json().catch(() => ({}))) as { question?: unknown; history?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return json({ error: "Missing question." }, { status: 400 });
  const history = cleanHistory(body.history, limits.historyTurns);

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Set-Cookie": sessionCookie(sid),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) => controller.enqueue(encoder.encode(sse(event)));
      try {
        send({ type: "status", value: "guard" });
        const guard = await guardAsk(env, ip, sid);
        if (!guard.ok) {
          recordEvent(env, { name: "ask_blocked", reason: guard.reason, degraded: true });
          send({ type: "error", message: "Too many questions from this network in the last minute. The notes are open at /notes.", reason: guard.reason });
          return;
        }

        send({ type: "status", value: "retrieve" });
        const previous = [...history].reverse().find((turn) => turn.role === "visitor")?.text;
        const hits = await retrieve(env, retrievalQuery(question, previous));
        // Sent before the model runs so the page can draw the retrieval while the answer is written.
        send({ type: "retrieved", provenance: toProvenance(hits) });

        send({ type: "status", value: guard.live ? "direct" : "assemble" });
        const answer = await answerQuestion(env, { question, history, hits, allowLlm: guard.live });
        const budget = await chargeBudget(env, answer.trace.costUsd);
        recordEvent(env, {
          name: "ask",
          costUsd: answer.trace.costUsd,
          usedLlm: answer.trace.mode === "llm",
          path: answer.citations[0] ?? hits[0]?.path,
          reason: answer.trace.failure ?? answer.trace.screened ?? guard.freeReason,
          degraded: !guard.live,
        });

        const answerId = crypto.randomUUID();
        const voiceAllowed = guard.voiceAllowed && answer.trace.mode === "llm";
        if (voiceAllowed) {
          // /api/tts only ever speaks text this route produced, for the session that asked.
          await store(env).put(`speech:${answerId}`, JSON.stringify({ sid, text: answer.output.speech }), 3600);
        }

        send({
          type: "answer",
          answerId,
          output: answer.output,
          citations: answer.citations,
          action: answer.action,
          provenance: answer.provenance,
          trace: answer.trace,
          voiceAllowed,
          meter: {
            live: guard.live,
            freeReason: guard.freeReason ?? null,
            questionsUsed: guard.questionsUsed,
            questionCap: guard.questionCap,
            spentUsd: budget.spentUsd,
            ceilingUsd: guard.ceilingUsd,
          },
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        recordEvent(env, { name: "ask_error", reason });
        send({ type: "error", message: "Something broke on my side. The notes are still readable at /notes.", reason: "server_error" });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, { headers });
};
