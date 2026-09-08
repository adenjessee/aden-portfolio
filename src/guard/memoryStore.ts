type Row = { value: string; expiresAt?: number };

const store = new Map<string, Row>();

export const memoryKv = {
  async get(key: string): Promise<string | null> {
    const row = store.get(key);
    if (!row) return null;
    if (row.expiresAt && Date.now() > row.expiresAt) {
      store.delete(key);
      return null;
    }
    return row.value;
  },
  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },
};

export function resetMemoryStore(): void {
  store.clear();
}
