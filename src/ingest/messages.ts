import { scrub } from "./pii";

/** Aden's own words from one place, grouped so a batch fits comfortably in one extraction call. */
export type MessageBatch = { source: string; text: string };

type ChatGptNode = { message?: { author?: { role?: string }; content?: { content_type?: string; parts?: unknown[] }; create_time?: number } | null };
type ChatGptConversation = { title?: string; create_time?: number; mapping?: Record<string, ChatGptNode> };

const MIN_CHARS = 40; // "ok", "do it", "thanks" carry no facts
const BATCH_CHARS = 18000;

/** Only what Aden typed: the assistant's replies are not facts about him. */
export function chatgptMessages(exportJson: string): { source: string; text: string }[] {
  const conversations = JSON.parse(exportJson) as ChatGptConversation[];
  const out: { source: string; text: string }[] = [];
  for (const conversation of conversations) {
    const date = conversation.create_time ? new Date(conversation.create_time * 1000).toISOString().slice(0, 10) : "undated";
    const title = (conversation.title || "untitled").slice(0, 60);
    for (const node of Object.values(conversation.mapping ?? {})) {
      const m = node.message;
      if (m?.author?.role !== "user" || m.content?.content_type !== "text") continue;
      const text = (m.content.parts ?? []).filter((p): p is string => typeof p === "string").join("\n").trim();
      if (text.length >= MIN_CHARS) out.push({ source: `chatgpt:${date}:${title}`, text });
    }
  }
  return out;
}

/** The TRON voice corpus format: "*YYYY-MM-DD*" headings, messages separated by "---". */
export function corpusMessages(markdown: string, name: string): { source: string; text: string }[] {
  const out: { source: string; text: string }[] = [];
  for (const block of markdown.split(/\n---\n/)) {
    const date = block.match(/^\*(\d{4}-\d{2}-\d{2})\*/m)?.[1] ?? "undated";
    const text = block.replace(/^\*\d{4}-\d{2}-\d{2}\*\s*/m, "").replace(/^#.*$/gm, "").trim();
    if (text.length >= MIN_CHARS) out.push({ source: `corpus:${name}:${date}`, text });
  }
  return out;
}

/**
 * Scrubbed, size-bounded batches. Very long single messages (pasted documents, transcripts) are
 * truncated: they are rarely about Aden, and they would crowd out his own words.
 */
export function toBatches(messages: { source: string; text: string }[]): MessageBatch[] {
  const batches: MessageBatch[] = [];
  let text = "";
  let sources = new Set<string>();
  const flush = () => {
    if (text) batches.push({ source: [...sources].slice(0, 3).join(" + ") + (sources.size > 3 ? ` +${sources.size - 3}` : ""), text });
    text = "";
    sources = new Set();
  };
  for (const m of messages) {
    const body = scrub(m.text.length > 4000 ? `${m.text.slice(0, 4000)} [...]` : m.text);
    const entry = `<message source="${m.source}">\n${body}\n</message>\n`;
    if (text.length + entry.length > BATCH_CHARS) flush();
    text += entry;
    sources.add(m.source);
  }
  flush();
  return batches;
}
