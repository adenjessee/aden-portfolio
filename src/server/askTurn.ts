import { answerQuestion } from "../director/answer";
import type { HistoryTurn } from "../director/prompt";
import { SentenceSplitter } from "../director/speechStream";
import { budgetRemaining, chargeBudget } from "../guard/budget";
import { guardAsk } from "../guard/pipeline";
import { addVoiceSeconds, peekSession } from "../guard/sessionCap";
import { sessionVoiceCap, type WorkerEnv } from "../lib/env";
import type { AskEvent } from "../protocol";
import { toProvenance } from "../rag/provenance";
import { retrieveForTurn } from "../rag/retrieve";
import { recordEvent } from "../telemetry/events";
import { SpeechPipeline, TTS_SAMPLE_RATE, voiceConfigured } from "../voice/ttsStream";

export type Turn = {
  question: string;
  history: HistoryTurn[];
  /** The page wants the answer spoken (/ask does, /inspect can). */
  voice: boolean;
  sid: string;
  ip: string;
};

// About fourteen characters of speech per second.
const CHARS_PER_SECOND = 14;

async function voiceAllowed(env: WorkerEnv, sid: string): Promise<boolean> {
  if (!voiceConfigured(env)) return false;
  if ((await budgetRemaining(env)).exhausted) return false;
  return (await peekSession(env, sid)).voiceSeconds < sessionVoiceCap(env);
}

/**
 * One question, start to finish: limits, retrieval, the answer (streamed from the model or assembled
 * from the notes), the voice, and the bill. Everything the page sees goes through `emit`, so this
 * runs the same behind SSE, in a test, or in a script.
 */
export async function runAskTurn(env: WorkerEnv, turn: Turn, emit: (event: AskEvent) => void): Promise<void> {
  emit({ type: "status", value: "guard" });
  const guard = await guardAsk(env, turn.ip, turn.sid);
  if (!guard.ok) {
    recordEvent(env, { name: "ask_blocked", reason: guard.reason, degraded: true });
    emit({ type: "error", message: "Too many questions from this network in the last minute. The notes are open at /notes.", reason: guard.reason });
    return;
  }

  emit({ type: "status", value: "retrieve" });
  const previous = [...turn.history].reverse().find((t) => t.role === "visitor")?.text;
  const hits = await retrieveForTurn(env, turn.question, previous);
  // Before the model runs, so the page can draw the retrieval while the answer is written.
  emit({ type: "retrieved", provenance: toProvenance(hits) });

  // Sentences go to the voice as the model writes them; audio comes back on the same stream.
  const speech = turn.voice && (await voiceAllowed(env, turn.sid)) ? new SpeechPipeline(env, (chunk) => emit({ type: "audio", ...chunk, sampleRate: TTS_SAMPLE_RATE })) : null;
  const splitter = new SentenceSplitter();
  if (speech) emit({ type: "voice", sampleRate: TTS_SAMPLE_RATE });

  emit({ type: "status", value: guard.live ? "direct" : "assemble" });
  const answer = await answerQuestion(env, {
    question: turn.question,
    history: turn.history,
    hits,
    allowLlm: guard.live,
    onSpeech: speech ? (text) => splitter.push(text).forEach((sentence) => speech.push(sentence)) : undefined,
  });

  let voiceCostUsd = 0;
  if (speech) {
    splitter.flush().forEach((sentence) => speech.push(sentence));
    const spoken = await speech.finish();
    voiceCostUsd = spoken.costUsd;
    await addVoiceSeconds(env, turn.sid, Math.ceil(spoken.characters / CHARS_PER_SECOND));
    if (spoken.failure) emit({ type: "voice_error", reason: spoken.failure });
    recordEvent(env, { name: "tts", costUsd: voiceCostUsd, reason: spoken.failure ?? undefined });
  }

  const budget = await chargeBudget(env, answer.trace.costUsd + voiceCostUsd);
  recordEvent(env, {
    name: "ask",
    costUsd: answer.trace.costUsd,
    usedLlm: answer.trace.mode === "llm",
    path: answer.citations[0] ?? hits[0]?.path,
    reason: answer.trace.failure ?? answer.trace.screened ?? guard.freeReason,
    degraded: !guard.live,
  });

  emit({
    type: "answer",
    output: answer.output,
    summary: answer.summary,
    citations: answer.citations,
    action: answer.action,
    provenance: answer.provenance,
    trace: answer.trace,
    voiceCostUsd,
    meter: {
      live: guard.live,
      freeReason: guard.freeReason ?? null,
      questionsUsed: guard.questionsUsed,
      questionCap: guard.questionCap,
      spentUsd: budget.spentUsd,
      ceilingUsd: guard.ceilingUsd,
    },
  });
}
