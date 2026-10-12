/**
 * The events /api/ask streams to the page, in order: status updates, the retrieved notes, voice
 * chunks as they are synthesized, then the answer. Server and client both import these types.
 */
import type { AnswerTrace } from "./director/answer";
import type { Action } from "./director/wire";
import type { Provenance } from "./rag/types";
import type { DirectorOutput } from "./scene/schema";
import type { TtsAlignment } from "./voice/ttsStream";

export type Meter = {
  live: boolean;
  freeReason: "no_model" | "budget_exhausted" | "session_exhausted" | null;
  questionsUsed: number;
  questionCap: number;
  spentUsd: number;
  ceilingUsd: number;
};

export type AnswerEvent = {
  type: "answer";
  output: DirectorOutput;
  summary: string;
  citations: string[];
  action: Action;
  provenance: Provenance[];
  trace: AnswerTrace;
  voiceCostUsd: number;
  meter: Meter;
};

export type AudioEvent = { type: "audio"; index: number; sampleRate: number; audio: string; alignment: TtsAlignment | null };

export type AskEvent =
  | { type: "status"; value: "guard" | "retrieve" | "direct" | "assemble" }
  | { type: "retrieved"; provenance: Provenance[] }
  | { type: "voice"; sampleRate: number }
  | AudioEvent
  | { type: "voice_error"; reason: string }
  | AnswerEvent
  | { type: "error"; message: string; reason?: string };
