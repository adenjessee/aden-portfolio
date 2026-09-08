/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type RateLimit = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

interface Env {
  AI?: Ai;
  VECTORIZE?: VectorizeIndex;
  SESSION?: KVNamespace;
  ASK_LIMIT?: RateLimit;
  TELEMETRY?: AnalyticsEngineDataset;
  OPENAI_API_KEY?: string;
  LLM_MODEL?: string;
  AI_GATEWAY_URL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ELEVENLABS_MODEL_ID?: string;
  DAILY_BUDGET_USD?: string;
  SESSION_QUESTION_CAP?: string;
  SESSION_VOICE_SECONDS?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface ImportMetaEnv {
  readonly OPENAI_API_KEY?: string;
  readonly LLM_MODEL?: string;
  readonly AI_GATEWAY_URL?: string;
  readonly ELEVENLABS_API_KEY?: string;
  readonly ELEVENLABS_VOICE_ID?: string;
  readonly ELEVENLABS_MODEL_ID?: string;
  readonly DAILY_BUDGET_USD?: string;
  readonly SESSION_QUESTION_CAP?: string;
  readonly SESSION_VOICE_SECONDS?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
