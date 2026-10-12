import { z } from "zod";
import type { LlmClient } from "../director/llm";
import { coerce } from "../director/wire";
import { scrub } from "./pii";
import type { MessageBatch } from "./messages";
import { PUBLISHABLE, TARGETS, type Candidate, type Sensitivity } from "./types";

const SENSITIVITIES = ["public", "professional", "private", "sensitive"] as const;

/**
 * Wording that is private whatever the model rated it: pay and money, health, family and
 * relationships, faith, debts. A second gate behind the model's own judgment.
 */
const ALWAYS_PRIVATE =
  /(\$\s?\d|\b\d+(\.\d+)?\s?k\b|\bsalary\b|\bincome\b|\bearn(s|ed|ing)?\b|\bdebt|\bloan\b|\brent\b|\bmortgage|\bsavings\b|\bpaycheck|\bdiagnos|\btherap|\bmedication|\billness\b|\bdepress|\banxiety\b|\bgirlfriend|\bboyfriend|\bwife\b|\bhusband\b|\bdating\b|\bdivorce|\bmy (mom|dad|mother|father|parents|brother|sister|family)\b|\breligio|\bchurch\b)/i;

export function stillPublishable(claim: string): boolean {
  return !ALWAYS_PRIVATE.test(claim);
}
const CONFIDENCES = ["high", "medium", "low"] as const;

const schema = z.object({
  facts: z.array(
    z.object({
      claim: z.string().describe("One fact about Aden, first person, one or two sentences, in plain words."),
      target: z.string().describe(`The note it belongs in: one of ${TARGETS.join(", ")}, or new/<short-slug> if none fits.`),
      sensitivity: z.string().describe("One of: public, professional, private, sensitive."),
      confidence: z.string().describe("One of: high, medium, low. Low if it is a guess, a plan, or a joke."),
      evidence: z.string().describe("A quote of at most 25 words from the message that supports the claim."),
      source: z.string().describe("The source attribute of the message the evidence came from."),
    }),
  ),
});

export const extractionSystem = `You read messages Aden Jessee typed to AI assistants and pull out facts about Aden that could go on his public professional portfolio, where an AI answers recruiters and engineers in his voice.

Extract: his work history, roles, projects and what he built, skills and tools he actually uses, results with numbers, how he works, opinions he states firmly about engineering, AI, agents, hiring and education, lessons and stories from his own experience, and what roles or work he wants.

Rate sensitivity honestly:
- public: fine on a public website.
- professional: fine for recruiters to hear, about his work.
- private: personal life, family, relationships, health, money, debts, feelings, struggles, anything about another named person, clients' or students' details, unreleased business numbers, anything he would not say to a stranger.
- sensitive: credentials, legal matters, medical, anything that could harm him or someone else.
When unsure, choose private.

Skip: instructions to the assistant, questions without an answer, pasted text written by someone else, and plans that are clearly brainstorming rather than decisions. Do not invent anything. Return an empty list when a batch has nothing.`;

/**
 * Runs the extractor over every batch, a few at a time. Private and sensitive facts are dropped here
 * and never written anywhere.
 */
export async function extractFacts(
  llm: LlmClient,
  batches: MessageBatch[],
  opts: { concurrency?: number; onProgress?: (done: number, total: number, costTokens: number) => void } = {},
): Promise<{ candidates: Candidate[]; dropped: number; inputTokens: number; outputTokens: number; failures: number }> {
  const candidates: Candidate[] = [];
  let dropped = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let failures = 0;
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      const result = await llm.complete({ system: extractionSystem, history: [], user: batch.text, schema });
      inputTokens += result.inputTokens + result.cacheReadTokens + result.cacheWriteTokens;
      outputTokens += result.outputTokens;
      if (!result.value) failures += 1;
      for (const [i, fact] of (result.value?.facts ?? []).entries()) {
        const sensitivity = coerce(fact.sensitivity, SENSITIVITIES, "private") as Sensitivity;
        if (!PUBLISHABLE.includes(sensitivity) || !stillPublishable(fact.claim)) {
          dropped += 1;
          continue;
        }
        const target = (TARGETS as readonly string[]).includes(fact.target) || /^new\/[a-z0-9-]{2,40}$/.test(fact.target) ? fact.target : "new/unsorted";
        candidates.push({
          id: `${fact.source || batch.source}#${i}`,
          source: fact.source || batch.source,
          target,
          claim: scrub(fact.claim).slice(0, 400),
          evidence: scrub(fact.evidence).slice(0, 220),
          sensitivity,
          confidence: coerce(fact.confidence, CONFIDENCES, "low"),
          seen: 1,
        });
      }
      opts.onProgress?.(++done, batches.length, inputTokens + outputTokens);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 4, batches.length) }, worker));
  return { candidates, dropped, inputTokens, outputTokens, failures };
}
