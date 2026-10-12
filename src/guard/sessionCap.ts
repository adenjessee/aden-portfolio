import { sessionQuestionCap, sessionVoiceCap, type WorkerEnv } from "../lib/env";
import { getJson, store } from "./store";

export type SessionState = {
  questions: number;
  voiceSeconds: number;
  messages: number;
  startedAt: number;
};

export type SessionDecision =
  | { ok: true; state: SessionState; voiceAllowed: boolean }
  | { ok: false; reason: "session_exhausted"; state: SessionState; voiceAllowed: false };

function empty(): SessionState {
  return { questions: 0, voiceSeconds: 0, messages: 0, startedAt: Date.now() };
}

async function read(env: WorkerEnv, sid: string): Promise<SessionState> {
  const state = await getJson<Partial<SessionState>>(store(env), `session:${sid}`);
  return { ...empty(), ...(state ?? {}) };
}

async function write(env: WorkerEnv, sid: string, state: SessionState): Promise<void> {
  await store(env).put(`session:${sid}`, JSON.stringify(state), 86400);
}

/** Spends `count` live questions. Refuses, without spending, when the visit has fewer left. */
export async function consumeQuestion(env: WorkerEnv, sid: string, count = 1): Promise<SessionDecision> {
  const state = await read(env, sid);
  const cap = sessionQuestionCap(env);
  if (state.questions + count > cap) {
    return { ok: false, reason: "session_exhausted", state, voiceAllowed: false };
  }
  state.questions += count;
  await write(env, sid, state);
  const voiceAllowed = state.voiceSeconds < sessionVoiceCap(env);
  return { ok: true, state, voiceAllowed };
}

export async function addVoiceSeconds(env: WorkerEnv, sid: string, seconds: number): Promise<boolean> {
  const state = await read(env, sid);
  state.voiceSeconds += seconds;
  await write(env, sid, state);
  return state.voiceSeconds < sessionVoiceCap(env);
}

export async function countMessage(env: WorkerEnv, sid: string, cap: number): Promise<boolean> {
  const state = await read(env, sid);
  if (state.messages >= cap) return false;
  state.messages += 1;
  await write(env, sid, state);
  return true;
}

export async function peekSession(env: WorkerEnv, sid: string): Promise<SessionState> {
  return read(env, sid);
}
