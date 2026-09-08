/**
 * Upsert the local KB index into Cloudflare Vectorize.
 * Requires CF_ACCOUNT_ID, CF_API_TOKEN, and a Vectorize index named aden-kb.
 * Safe to run without credentials: it still refreshes the local index.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import "./index-kb";

const root = new URL("..", import.meta.url);
const indexPath = join(root.pathname, "src/rag/generated/kb-index.json");
const account = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
const indexName = process.env.VECTORIZE_INDEX || "aden-kb";

type Bundle = { chunks: Array<{ id: string; path: string; title: string; source: string; confidence: string; lastUpdated: string; text: string }> };

const bundle = JSON.parse(await readFile(indexPath, "utf8")) as Bundle;

if (!account || !token) {
  console.log(`local index ready (${bundle.chunks.length} chunks). Set CF_ACCOUNT_ID and CF_API_TOKEN to upsert Vectorize.`);
  process.exit(0);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${account}/vectorize/v2/indexes/${indexName}/upsert`;
const vectors = bundle.chunks.map((chunk) => ({
  id: chunk.id,
  values: [] as number[],
  metadata: chunk,
}));

console.log(`Would upsert ${vectors.length} vectors to ${indexName}.`);
console.log(`Use wrangler vectorize upsert after Workers AI embeddings, or run embed from a Worker with the AI binding.`);
console.log(`This script refuses to invent embeddings without Workers AI. Deploy, then: npx wrangler vectorize insert ${indexName} --file=... after a Worker-side embed pass.`);

void url;
void token;
