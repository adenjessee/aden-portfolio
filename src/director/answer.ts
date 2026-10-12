import { limits } from "../config/site";
import { llmProvider, type WorkerEnv } from "../lib/env";
import { estimateAskCost, type Usage } from "../guard/costTable";
import { extractiveAnswer, queryTerms } from "../rag/localIndex";
import { toProvenance } from "../rag/provenance";
import { bestMatch, hasPosition } from "../rag/threshold";
import type { Provenance, Retrieved } from "../rag/types";
import { directorOutputSchema, type DirectorOutput } from "../scene/schema";
import { callClaude } from "./anthropic";
import { callOpenAi } from "./openai";
import { contactLine, pickRepresentation, systemPrompt, userPrompt, type HistoryTurn } from "./prompt";
import { screenQuestion } from "./screen";
import { SpeechExtractor } from "./speechStream";
import { defaultReason, fromWire, summarize, wireSchema, type Action } from "./wire";

export type AnswerMode = "llm" | "extractive" | "screened";

/** Everything the page needs to draw how an answer was made. */
export type AnswerTrace = {
  terms: string[];
  threshold: number;
  bestMatch: number;
  mode: AnswerMode;
  model: string | null;
  usage: Usage | null;
  costUsd: number;
  latencyMs: number;
  failure?: string;
  screened?: string;
};

export type Answer = {
  output: DirectorOutput;
  /** Three to eight words for the one-line conversation log. */
  summary: string;
  citations: string[];
  action: Action;
  provenance: Provenance[];
  trace: AnswerTrace;
};

const CONTACT = /\b(hire|hiring|interview|recruit|reach|contact|email|call|talk to|meet|book|schedule|available|availability|open to|join)\b/i;
const ROLE = /\b(job description|job posting|this role|the role|this opening|good fit|fit for|fit the)\b/i;

function extractiveFallback(
  question: string,
  hits: Retrieved[],
  noPosition: boolean,
): { output: DirectorOutput; summary: string; citations: string[]; action: Action } {
  const extras = pickRepresentation(question);
  const usable = noPosition ? [] : hits;
  // Spoken aloud, so shorter than a written answer would be.
  const { text, usedIds } = extractiveAnswer(usable, question, 420);
  const speech = noPosition
    ? `I have not written down a position on that, so I will not guess at one. Ask me about my work, how I build agents, or GridSchool, or leave me a message and I will answer it myself.`
    : text;

  let action: Action = null;
  if (ROLE.test(question)) action = { kind: "fit_check", reason: defaultReason("fit_check") };
  else if (CONTACT.test(question)) action = { kind: "book_call", reason: contactLine };
  else if (noPosition) action = { kind: "leave_message", reason: "Ask Aden directly. He replies to every message himself." };

  const output = directorOutputSchema.parse({
    speech,
    performance: {
      emotion: noPosition ? "thinking" : "serious",
      gesture: noPosition ? "shrug" : extras.gesture,
      lookAt: !noPosition && extras.scene[0] && "id" in extras.scene[0] ? extras.scene[0].id : "visitor",
    },
    scene: noPosition ? [] : extras.scene,
    noPosition,
  });
  return { output, summary: noPosition ? "Not in my notes yet" : summarize(output.speech), citations: usedIds, action };
}

export async function answerQuestion(
  env: WorkerEnv,
  input: {
    question: string;
    history: HistoryTurn[];
    hits: Retrieved[];
    allowLlm: boolean;
    /** Receives the spoken text as it becomes known: streamed from the model, or all at once otherwise. */
    onSpeech?: (text: string) => void;
  },
): Promise<Answer> {
  let spoken = "";
  const speak = (text: string) => {
    if (!text) return;
    spoken += text;
    input.onSpeech?.(text);
  };
  // Paths that know the whole answer at once still go through speak(), and a model that failed
  // after speaking part of an answer is not repeated from the start.
  const finish = (answer: Answer): Answer => {
    if (!spoken) speak(answer.output.speech);
    return answer;
  };
  const started = Date.now();
  const { question, hits } = input;
  const terms = queryTerms(question).filter((t) => t.original).map((t) => t.term);
  const retrievalHasPosition = hasPosition(hits);
  const baseTrace = { terms, threshold: limits.retrievalThreshold, bestMatch: Number(bestMatch(hits).toFixed(3)) };

  const screen = screenQuestion(question);
  if (!screen.ok) {
    const output = directorOutputSchema.parse({
      speech: screen.speech,
      performance: { emotion: "skeptical", gesture: "disagree", lookAt: "visitor" },
      scene: [],
      noPosition: true,
    });
    return finish({
      output,
      summary: screen.kind === "injection" ? "Declined: instructions in the question" : "Declined: I do not repeat lines",
      citations: [],
      action: null,
      provenance: [],
      trace: { ...baseTrace, mode: "screened", model: null, usage: null, costUsd: 0, latencyMs: Date.now() - started, screened: screen.kind },
    });
  }

  const provider = input.allowLlm ? llmProvider(env) : "none";
  if (provider !== "none") {
    const extractor = new SpeechExtractor();
    const request = {
      system: systemPrompt,
      history: input.history.slice(-limits.historyTurns * 2),
      user: userPrompt(question, hits, retrievalHasPosition),
      schema: wireSchema,
    };
    const result =
      provider === "anthropic"
        ? await callClaude(env, { ...request, onSnapshot: input.onSpeech ? (snapshot) => speak(extractor.feed(snapshot)) : undefined })
        : await callOpenAi(env, request);
    const usage: Usage = {
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cacheReadTokens: result.cacheReadTokens,
      cacheWriteTokens: result.cacheWriteTokens,
    };
    const costUsd = estimateAskCost({ usedLlm: result.inputTokens + result.outputTokens > 0, ...usage });
    if (result.value) {
      const directed = fromWire(result.value, hits);
      return finish({
        ...directed,
        provenance: toProvenance(hits, directed.citations),
        trace: { ...baseTrace, mode: "llm", model: result.model, usage, costUsd, latencyMs: Date.now() - started },
      });
    }
    // The model failed or declined. Answer from the notes anyway, and still charge what was spent.
    const fallback = extractiveFallback(question, hits, !retrievalHasPosition);
    return finish({
      ...fallback,
      provenance: toProvenance(hits, fallback.citations),
      trace: { ...baseTrace, mode: "extractive", model: null, usage, costUsd, latencyMs: Date.now() - started, failure: result.failure },
    });
  }

  const fallback = extractiveFallback(question, hits, !retrievalHasPosition);
  return finish({
    ...fallback,
    provenance: toProvenance(hits, fallback.citations),
    trace: { ...baseTrace, mode: "extractive", model: null, usage: null, costUsd: 0, latencyMs: Date.now() - started },
  });
}
