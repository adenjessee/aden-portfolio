type Row = { value: string; expiresAt?: number };

const store = new Map<string, Row>();

function live(key: string): Row | null {
  const row = store.get(key);
  if (!row) return null;
  if (row.expiresAt && Date.now() > row.expiresAt) {
    store.delete(key);
    return null;
  }
  return row;
}

/** Stand-in for the SESSION KV namespace in `astro dev`, tests, and scripts. Per-process only. */
export const memoryKv = {
  async get(key: string): Promise<string | null> {
    return live(key)?.value ?? null;
  },
  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },
  async list(prefix: string): Promise<string[]> {
    return [...store.keys()].filter((key) => key.startsWith(prefix) && live(key));
  },
};

export function resetMemoryStore(): void {
  store.clear();
}
