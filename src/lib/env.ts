import { limits } from "../config/site";

export type WorkerEnv = Env | undefined;

type EnvKey = keyof ImportMetaEnv & keyof Env;

// Worker bindings win, then Vite's import.meta.env, then process.env so scripts run under tsx.
function read(env: WorkerEnv, key: EnvKey): string | undefined {
  const fromWorker = env?.[key];
  if (typeof fromWorker === "string" && fromWorker) return fromWorker;
  const meta = (import.meta as { env?: Record<string, string | undefined> }).env;
  if (meta?.[key]) return meta[key];
  const proc = typeof process !== "undefined" ? process.env : undefined;
  return proc?.[key] || undefined;
}

export function readNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function sessionQuestionCap(env?: WorkerEnv): number {
  return readNumber(read(env, "SESSION_QUESTION_CAP"), limits.sessionQuestions);
}

export function sessionVoiceCap(env?: WorkerEnv): number {
  return readNumber(read(env, "SESSION_VOICE_SECONDS"), limits.sessionVoiceSeconds);
}

export function dailyBudgetUsd(env?: WorkerEnv): number {
  return readNumber(read(env, "DAILY_BUDGET_USD"), limits.dailyBudgetUsd);
}

export type LlmProvider = "anthropic" | "openai" | "none";

export function anthropicKey(env?: WorkerEnv): string | undefined {
  return read(env, "ANTHROPIC_API_KEY");
}

export function openaiKey(env?: WorkerEnv): string | undefined {
  return read(env, "OPENAI_API_KEY");
}

/** LLM_PROVIDER pins a provider; otherwise the first key present wins, Anthropic first. */
export function llmProvider(env?: WorkerEnv): LlmProvider {
  const pinned = read(env, "LLM_PROVIDER");
  if (pinned === "none") return "none";
  if (pinned === "anthropic") return anthropicKey(env) ? "anthropic" : "none";
  if (pinned === "openai") return openaiKey(env) ? "openai" : "none";
  if (anthropicKey(env)) return "anthropic";
  if (openaiKey(env)) return "openai";
  return "none";
}

export function llmModel(env?: WorkerEnv): string {
  const configured = read(env, "LLM_MODEL");
  if (configured) return configured;
  // Haiku: the avatar has to start talking quickly. Sonnet 5.5 is the step up when answers need more judgment.
  return llmProvider(env) === "openai" ? "gpt-4o-mini" : "claude-haiku-5-5";
}

export function gatewayUrl(env?: WorkerEnv): string | undefined {
  return read(env, "AI_GATEWAY_URL");
}

export function elevenKey(env?: WorkerEnv): string | undefined {
  return read(env, "ELEVENLABS_API_KEY");
}

// "Will - Relaxed Optimist", an ElevenLabs premade voice every account can use, until Aden's clone exists.
export const DEFAULT_VOICE_ID = "bIHbv24MWmeRgasZH58o";

export function elevenVoice(env?: WorkerEnv): string | undefined {
  return read(env, "ELEVENLABS_VOICE_ID") || DEFAULT_VOICE_ID;
}

export function elevenModel(env?: WorkerEnv): string {
  // v4 Turbo: ElevenLabs' most expressive real-time model. Measured 0.21s to first audio on our
  // streaming endpoint, faster than Flash v2.5 (0.29s), and it returns timings on almost every chunk.
  return read(env, "ELEVENLABS_MODEL_ID") || "eleven_v4_turbo";
}

/** Who turns speech into text: the browser (default, free, live partial words) or ElevenLabs Scribe. */
export function sttProvider(env?: WorkerEnv): "browser" | "elevenlabs" {
  return read(env, "STT_PROVIDER") === "elevenlabs" && elevenKey(env) ? "elevenlabs" : "browser";
}

export function inboxToken(env?: WorkerEnv): string | undefined {
  return read(env, "INBOX_TOKEN");
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
