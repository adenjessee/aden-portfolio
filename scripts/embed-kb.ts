/**
 * Embeds the bundled note index with Workers AI and upserts it into Vectorize.
 * Needs CF_ACCOUNT_ID and a CF_API_TOKEN with "Workers AI: Read" and "Vectorize: Edit".
 * Without them it only refreshes the local index, which the lexical retriever uses on its own.
 *
 * Ids are chunk ids. Text is not stored in Vectorize: retrieve() reads text from the bundled index and
 * ignores any vector id the bundle no longer has, so a removed note can never be quoted from a stale vector.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "./index-kb";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const account = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
const indexName = process.env.VECTORIZE_INDEX || "aden-kb";
const MODEL = "@cf/baai/bge-base-en-v1.5"; // 768 dimensions; must match src/rag/embed.ts
const BATCH = 50;

type Chunk = { id: string; path: string; title: string; text: string };
const { chunks } = JSON.parse(await readFile(join(root, "src/rag/generated/kb-index.json"), "utf8")) as { chunks: Chunk[] };

if (!account || !token) {
  console.log(`Local index ready (${chunks.length} chunks). Set CF_ACCOUNT_ID and CF_API_TOKEN to embed into Vectorize.`);
  process.exit(0);
}

const api = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const auth = { Authorization: `Bearer ${token}` };

async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch(`${api}/ai/run/${MODEL}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  const payload = (await response.json()) as { success: boolean; result?: { data: number[][] }; errors?: unknown };
  if (!response.ok || !payload.success || !payload.result) throw new Error(`Workers AI embed failed: ${JSON.stringify(payload.errors)}`);
  return payload.result.data;
}

let upserted = 0;
for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH);
  // Title first, matching how the lexical index weights it.
  const vectors = await embed(batch.map((chunk) => `${chunk.title}\n\n${chunk.text}`));
  const ndjson = batch.map((chunk, j) => JSON.stringify({ id: chunk.id, values: vectors[j], metadata: { path: chunk.path } })).join("\n");
  const response = await fetch(`${api}/vectorize/v2/indexes/${indexName}/upsert`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/x-ndjson" },
    body: ndjson,
  });
  if (!response.ok) throw new Error(`Vectorize upsert failed (${response.status}): ${await response.text()}`);
  upserted += batch.length;
  console.log(`upserted ${upserted}/${chunks.length}`);
}
console.log(`Done. ${upserted} vectors in ${indexName}. Vectorize applies upserts asynchronously; queries see them within a minute.`);
