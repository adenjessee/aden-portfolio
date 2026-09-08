import { sessionQuestionCap, sessionVoiceCap, type WorkerEnv } from "../lib/env";
import { memoryKv } from "./memoryStore";

export type SessionState = {
  questions: number;
  voiceSeconds: number;
  startedAt: number;
};

export type SessionDecision =
  | { ok: true; state: SessionState; voiceAllowed: boolean }
  | { ok: false; reason: "session_exhausted"; state: SessionState; voiceAllowed: false };

function empty(): SessionState {
  return { questions: 0, voiceSeconds: 0, startedAt: Date.now() };
}

async function read(env: WorkerEnv, sid: string): Promise<SessionState> {
  const kv = env?.SESSION && typeof env.SESSION.get === "function" ? env.SESSION : null;
  const raw = kv ? await kv.get(`session:${sid}`) : await memoryKv.get(`session:${sid}`);
  if (!raw) return empty();
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return empty();
  }
}

async function write(env: WorkerEnv, sid: string, state: SessionState): Promise<void> {
  const value = JSON.stringify(state);
  if (env?.SESSION && typeof env.SESSION.put === "function") {
    await env.SESSION.put(`session:${sid}`, value, { expirationTtl: 86400 });
    return;
  }
  await memoryKv.put(`session:${sid}`, value, 86400);
}

export async function consumeQuestion(env: WorkerEnv, sid: string): Promise<SessionDecision> {
  const state = await read(env, sid);
  const cap = sessionQuestionCap(env);
  if (state.questions >= cap) {
    return { ok: false, reason: "session_exhausted", state, voiceAllowed: false };
  }
  state.questions += 1;
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

export async function peekSession(env: WorkerEnv, sid: string): Promise<SessionState> {
  return read(env, sid);
}
