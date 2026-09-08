import type { WorkerEnv } from "../lib/env";
import { memoryKv } from "./memoryStore";

export type RateDecision = { ok: true } | { ok: false; reason: "rate_limited" };

export async function checkRateLimit(env: WorkerEnv, ip: string): Promise<RateDecision> {
  if (env?.ASK_LIMIT && typeof env.ASK_LIMIT.limit === "function") {
    const result = await env.ASK_LIMIT.limit({ key: ip });
    return result.success ? { ok: true } : { ok: false, reason: "rate_limited" };
  }

  const bucket = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const current = Number((await memoryKv.get(bucket)) || "0");
  if (current >= 10) return { ok: false, reason: "rate_limited" };
  await memoryKv.put(bucket, String(current + 1), 120);
  return { ok: true };
}
