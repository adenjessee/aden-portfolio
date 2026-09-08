import { limits } from "../config/site";

export type WorkerEnv = Env | undefined;

export function readNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function sessionQuestionCap(env?: WorkerEnv): number {
  return readNumber(env?.SESSION_QUESTION_CAP ?? import.meta.env.SESSION_QUESTION_CAP, limits.sessionQuestions);
}

export function sessionVoiceCap(env?: WorkerEnv): number {
  return readNumber(env?.SESSION_VOICE_SECONDS ?? import.meta.env.SESSION_VOICE_SECONDS, limits.sessionVoiceSeconds);
}

export function dailyBudgetUsd(env?: WorkerEnv): number {
  return readNumber(env?.DAILY_BUDGET_USD ?? import.meta.env.DAILY_BUDGET_USD, limits.dailyBudgetUsd);
}

export function llmModel(env?: WorkerEnv): string {
  return env?.LLM_MODEL || import.meta.env.LLM_MODEL || "gpt-4o-mini";
}

export function openaiKey(env?: WorkerEnv): string | undefined {
  return env?.OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || undefined;
}

export function gatewayUrl(env?: WorkerEnv): string | undefined {
  return env?.AI_GATEWAY_URL || import.meta.env.AI_GATEWAY_URL || undefined;
}

export function elevenKey(env?: WorkerEnv): string | undefined {
  return env?.ELEVENLABS_API_KEY || import.meta.env.ELEVENLABS_API_KEY || undefined;
}

export function elevenVoice(env?: WorkerEnv): string | undefined {
  return env?.ELEVENLABS_VOICE_ID || import.meta.env.ELEVENLABS_VOICE_ID || undefined;
}

export function elevenModel(env?: WorkerEnv): string {
  return env?.ELEVENLABS_MODEL_ID || import.meta.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export function sessionId(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)aden_sid=([^;]+)/);
  return match?.[1] || crypto.randomUUID();
}

export function sessionCookie(id: string): string {
  return `aden_sid=${id}; Path=/; Max-Age=86400; SameSite=Lax; HttpOnly`;
}
