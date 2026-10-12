import type { WorkerEnv } from "../lib/env";
import { memoryKv } from "./memoryStore";

/** One interface over the SESSION KV binding and the in-memory fallback. */
export type Store = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, ttlSeconds?: number): Promise<void>;
  list(prefix: string, limit?: number): Promise<string[]>;
};

export function store(env: WorkerEnv): Store {
  const kv = env?.SESSION && typeof env.SESSION.get === "function" ? env.SESSION : null;
  if (!kv) {
    return {
      get: (key) => memoryKv.get(key),
      put: (key, value, ttl) => memoryKv.put(key, value, ttl),
      list: async (prefix, limit = 100) => (await memoryKv.list(prefix)).slice(0, limit),
    };
  }
  return {
    get: (key) => kv.get(key),
    // KV rejects TTLs under 60 seconds.
    put: (key, value, ttl) => kv.put(key, value, ttl ? { expirationTtl: Math.max(60, ttl) } : undefined),
    list: async (prefix, limit = 100) => (await kv.list({ prefix, limit })).keys.map((key) => key.name),
  };
}

export async function getJson<T>(s: Store, key: string): Promise<T | null> {
  const raw = await s.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
