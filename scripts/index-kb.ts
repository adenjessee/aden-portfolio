import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { chunkMarkdown } from "../src/rag/chunk";
import type { KbChunk } from "../src/rag/types";

const root = new URL("..", import.meta.url);
const kbRoot = join(root.pathname, "content/kb");
const outFile = join(root.pathname, "src/rag/generated/kb-index.json");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

const files = await walk(kbRoot);
const chunks: KbChunk[] = [];

for (const file of files) {
  const raw = await readFile(file, "utf8");
  const path = relative(kbRoot, file);
  chunks.push(...chunkMarkdown(path, raw));
}

await mkdir(join(root.pathname, "src/rag/generated"), { recursive: true });
await writeFile(
  outFile,
  JSON.stringify({ generatedAt: new Date().toISOString(), chunks }, null, 2),
);
console.log(`indexed ${chunks.length} chunks from ${files.length} files`);
