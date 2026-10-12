import type { KbChunk } from "./types";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

function field(block: string, key: string): string {
  const line = block.split("\n").find((entry) => entry.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : "";
}

export function parseKbMarkdown(path: string, raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER);
  const body = match ? raw.slice(match[0].length).trim() : raw.trim();
  const block = match?.[1] ?? "";
  return {
    meta: {
      source: field(block, "source") || `Aden / ${path}`,
      confidence: field(block, "confidence") || "medium",
      last_updated: field(block, "last_updated") || "1970-01-01",
      title: field(block, "title") || path,
      status: field(block, "status") || "draft",
    },
    body,
  };
}

export function chunkMarkdown(path: string, raw: string, maxChars = 700): KbChunk[] {
  const { meta, body } = parseKbMarkdown(path, raw);
  const paragraphs = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const groups: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      groups.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) groups.push(current);

  const confidence = (["high", "medium", "low"].includes(meta.confidence)
    ? meta.confidence
    : "medium") as KbChunk["confidence"];

  const status = (["verified", "draft", "mock"].includes(meta.status) ? meta.status : "draft") as KbChunk["status"];

  return groups.map((text, index) => ({
    id: `${path}#${index}`,
    path,
    title: meta.title,
    source: meta.source,
    confidence,
    status,
    lastUpdated: meta.last_updated,
    text,
  }));
}
