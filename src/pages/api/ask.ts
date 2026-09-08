import type { APIRoute } from "astro";
import { directAnswer } from "../../director/llmAdapter";
import { chargeBudget } from "../../guard/budget";
import { estimateAskCost } from "../../guard/costTable";
import { guardAsk } from "../../guard/pipeline";
import { retrieve } from "../../rag/retrieve";
import { recordEvent } from "../../telemetry/events";
import { cachedAnswers } from "../../client/askClient";
import { clientIp, sessionCookie, sessionId } from "../../lib/env";

export const prerender = false;

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const sid = sessionId(request);
  const ip = clientIp(request);
  const body = (await request.json().catch(() => ({}))) as { question?: string };
  const question = (body.question || "").trim().slice(0, 500);

  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question." }), { status: 400 });
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Set-Cookie": sessionCookie(sid),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(new TextEncoder().encode(sse(event)));
      try {
        send({ type: "status", value: "guard" });
        const guard = await guardAsk(env, ip, sid);
        if (!guard.ok) {
          recordEvent(env, { name: "ask_blocked", reason: guard.reason, degraded: true });
          send({
            type: "error",
            message:
              guard.reason === "rate_limited"
                ? "Too many questions from this network. Read the work, or try later."
                : "That is the live-question cap for this visit. The text FAQ and cached answers stay open.",
            reason: guard.reason,
          });
          send({
            type: "answer",
            output: cachedAnswers[0].output,
            provenance: [],
            voiceAllowed: false,
            degraded: true,
          });
          return;
        }

        if (guard.degradeToCached) {
          recordEvent(env, { name: "ask_budget", degraded: true, costUsd: 0 });
          send({
            type: "answer",
            output: cachedAnswers.find((item) => question.toLowerCase().includes("graph"))?.output ?? cachedAnswers[0].output,
            provenance: [],
            voiceAllowed: false,
            degraded: true,
          });
          return;
        }

        send({ type: "status", value: "retrieve" });
        const hits = await retrieve(env, question);
        send({ type: "status", value: "direct" });
        const result = await directAnswer(env, question, hits);
        const cost = estimateAskCost({
          usedLlm: result.usedLlm,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        await chargeBudget(env, cost);
        recordEvent(env, {
          name: "ask",
          costUsd: cost,
          usedLlm: result.usedLlm,
          path: hits[0]?.path,
        });
        send({
          type: "answer",
          output: result.output,
          provenance: result.provenance,
          voiceAllowed: guard.session.voiceAllowed,
          degraded: false,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        recordEvent(env, { name: "ask_error", reason });
        send({ type: "error", message: "The live path failed. Cached answer follows.", reason });
        send({
          type: "answer",
          output: cachedAnswers[0].output,
          provenance: [],
          voiceAllowed: false,
          degraded: true,
        });
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
