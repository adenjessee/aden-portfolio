import { chunkMarkdown } from "./chunk";
import type { KbChunk, Retrieved } from "./types";
import bundled from "./generated/kb-index.json";

type Bundle = {
  chunks: KbChunk[];
};

const STOP = new Set(
  (
    "the a an and or but to of in on at by for from is it its that this these those with as be been being are was were " +
    "i me you we us they them he she what why how who whom when where which your yours my mine our does do did doing " +
    "can could would should will shall may might must if about into over than then there here so such just also very " +
    "any all some each much many more most other already have has had not no yes please tell explain think thoughts " +
    "aden aden's someone something thing things kind sort get got like say said want matter matters keep up long"
  ).split(" "),
);

// Visitors ask in their own words. Each entry widens a query term to the words the notes use.
const SYNONYMS: Record<string, string[]> = {
  hire: ["hiring", "job", "role", "candidate"],
  job: ["role", "hire", "work", "position"],
  salary: ["compensation", "pay", "rate"],
  pay: ["compensation", "salary", "rate"],
  money: ["compensation", "price", "cost"],
  price: ["cost", "rate", "tuition"],
  cost: ["budget", "price", "spend"],
  remote: ["location", "relocate", "timezone"],
  location: ["remote", "based", "boise"],
  stack: ["skills", "tools", "languages", "typescript", "python"],
  skill: ["skills", "stack", "strengths"],
  tech: ["stack", "skills", "tools"],
  experience: ["career", "history", "worked", "years"],
  background: ["biography", "career", "history"],
  weakness: ["weaknesses", "mistakes", "gaps"],
  mistake: ["mistakes", "wrong", "failure"],
  agent: ["agents", "agentic", "tool"],
  llm: ["model", "models", "ai"],
  rag: ["retrieval", "grounding", "corpus"],
  bootcamp: ["gridschool", "residency", "course"],
  school: ["gridschool", "residency"],
  student: ["students", "residency", "gridschool"],
  guarantee: ["promise", "refund", "guaranteed"],
  contact: ["email", "reach", "message", "book", "call"],
  available: ["availability", "open", "start"],
  open: ["availability", "available", "roles"],
  freelance: ["contract", "consulting", "client"],
  repo: ["repository", "codebase"],
  relocate: ["relocation", "remote", "location"],
  team: ["teammate", "collaborate", "working"],
  language: ["typescript", "python", "stack"],
  codebase: ["repository", "repo"],
  role: ["job", "work", "hire", "position"],
  junior: ["juniors", "new", "grad"],
  weak: ["weakness", "weaknesses", "mistakes"],
  really: ["ai", "real", "person"],
  test: ["tests", "evals", "verify", "verification"],
  eval: ["evals", "evaluation", "verify"],
};

/** Deliberately crude, but applied identically to notes and questions, so "make", "making" and "makes" meet. */
function stem(word: string): string {
  let w = word;
  if (w.length > 7 && w.endsWith("nesses")) w = w.slice(0, -6);
  else if (w.length > 5 && w.endsWith("ness")) w = w.slice(0, -4);
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 6 && w.endsWith("est")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

const STEMMED_SYNONYMS = new Map<string, string[]>(Object.entries(SYNONYMS).map(([key, words]) => [stem(key), words.map(stem)]));

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token))
    .map(stem);
}

type Doc = { chunk: KbChunk; tf: Map<string, number>; titleTerms: Set<string>; bigrams: Set<string>; questions: Set<string>[]; length: number };
type Index = { docs: Doc[]; df: Map<string, number>; avgLength: number; source: KbChunk[] };

const K1 = 1.4;
const B = 0.72;
const TITLE_WEIGHT = 2;

let cached: Index | null = null;

function buildIndex(chunks: KbChunk[]): Index {
  if (cached && cached.source === chunks) return cached;
  const df = new Map<string, number>();
  const docs: Doc[] = chunks.map((chunk) => {
    const tf = new Map<string, number>();
    const add = (token: string, weight: number) => tf.set(token, (tf.get(token) ?? 0) + weight);
    const titleTerms = new Set(tokens(chunk.title));
    for (const token of titleTerms) add(token, TITLE_WEIGHT);
    const body = tokens(chunk.text);
    for (const token of body) add(token, 1);
    for (const token of tf.keys()) df.set(token, (df.get(token) ?? 0) + 1);
    const bigrams = new Set<string>();
    for (let i = 1; i < body.length; i += 1) bigrams.add(`${body[i - 1]} ${body[i]}`);
    // Questions the note already answers in so many words ("Are you open to work?").
    const questions = (chunk.text.match(/[^.?!\n]*\?/g) ?? []).map((q) => new Set(tokens(q))).filter((q) => q.size > 0);
    const length = [...tf.values()].reduce((sum, n) => sum + n, 0);
    return { chunk, tf, titleTerms, bigrams, questions, length };
  });
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length);
  cached = { docs, df, avgLength, source: chunks };
  return cached;
}

function idf(index: Index, term: string): number {
  const n = index.docs.length;
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

/** `parent` links a synonym back to the visitor's word it stands in for. */
export type QueryTerms = { term: string; weight: number; original: boolean; parent?: string }[];

// Phrases whose meaning lives in stopwords ("how long" asks for a duration).
const PHRASES: [RegExp, string[]][] = [
  [/\bhow long\b/i, ["week", "month", "duration"]],
  [/\bhow much\b/i, ["price", "cost", "rate"]],
  [/\bwork(ing)? with\b/i, ["working", "collaborate"]],
  [/\bwho are you\b|\babout (yourself|you)\b/i, ["biography", "founder", "engineer"]],
  [/\bwhat do you (do|build|work on|make)\b/i, ["biography", "applied", "system"]],
];

export function queryTerms(query: string): QueryTerms {
  const originals = [...new Set(tokens(query))];
  const out: QueryTerms = originals.map((term) => ({ term, weight: 1, original: true }));
  const seen = new Set(originals);
  for (const [pattern, words] of PHRASES) {
    if (!pattern.test(query)) continue;
    for (const word of words.map(stem)) {
      if (seen.has(word)) continue;
      seen.add(word);
      // A question made only of stopwords ("who are you?") is carried entirely by its phrase.
      out.push({ term: word, weight: originals.length ? 0.6 : 1, original: originals.length === 0 });
    }
  }
  for (const term of originals) {
    for (const stemmed of STEMMED_SYNONYMS.get(term) ?? []) {
      if (seen.has(stemmed)) continue;
      seen.add(stemmed);
      out.push({ term: stemmed, weight: 0.45, original: false, parent: term });
    }
  }
  return out;
}

export function loadBundledChunks(): KbChunk[] {
  return (bundled as Bundle).chunks ?? [];
}

/**
 * BM25 for ranking, plus a bonus when two adjacent question words appear adjacent in the note
 * ("GridSchool cost"). `match` is idf-weighted coverage of the visitor's own terms (synonyms count at
 * reduced weight), taken over the chunk or, slightly discounted, over the whole note it belongs to, since
 * a note often answers a question across two paragraphs. A question made of words the notes never use
 * scores near zero however long the corpus gets.
 */
export function scoreLocal(query: string, chunks: KbChunk[], topK: number): Retrieved[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const index = buildIndex(chunks);
  const originals = terms.filter((t) => t.original);
  const originalMass = originals.reduce((sum, t) => sum + idf(index, t.term), 0) || 1;
  const pairs = originals.slice(1).map((t, i) => `${originals[i].term} ${t.term}`);

  // Share of the visitor's words a set of tokens speaks to. A synonym earns most of its parent's weight.
  const credit = (has: (term: string) => boolean, hits?: Set<string>) =>
    originals.reduce((sum, t) => {
      if (has(t.term)) {
        hits?.add(t.term);
        return sum + idf(index, t.term);
      }
      const viaSynonym = terms.some((s) => s.parent === t.term && has(s.term));
      if (viaSynonym) hits?.add(t.term);
      return sum + (viaSynonym ? 0.8 * idf(index, t.term) : 0);
    }, 0) / originalMass;

  const rows: { doc: Doc; score: number; covered: number; hitTerms: Set<string> }[] = [];
  for (const doc of index.docs) {
    let score = 0;
    for (const { term, weight } of terms) {
      const f = doc.tf.get(term);
      if (!f) continue;
      score += weight * idf(index, term) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.length) / index.avgLength)));
    }
    const hitTerms = new Set<string>();
    const covered = credit((term) => doc.tf.has(term), hitTerms);
    if (score <= 0) continue;
    for (const pair of pairs) {
      if (!doc.bigrams.has(pair)) continue;
      const [a, b] = pair.split(" ");
      score += 1.5 * (idf(index, a) + idf(index, b));
    }
    // A written question that shares most of the visitor's words is the strongest signal there is.
    let bestQuestion = 0;
    for (const question of doc.questions) bestQuestion = Math.max(bestQuestion, credit((term) => question.has(term)));
    if (bestQuestion >= 0.5) score *= 1 + bestQuestion;
    // "What is GridSeak?" is answered by the note titled GridSeak, however often other notes mention it.
    const titleShare = credit((term) => doc.titleTerms.has(term));
    if (titleShare >= 0.5) score *= 1 + 0.8 * titleShare;
    // Placeholder notes stay findable, so AI Aden can say a topic is not filled in, but never outrank a real note.
    if (doc.chunk.status === "mock") score *= 0.55;
    rows.push({ doc, score, covered, hitTerms });
  }

  const noteTerms = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = noteTerms.get(row.doc.chunk.path) ?? new Set<string>();
    row.hitTerms.forEach((term) => set.add(term));
    noteTerms.set(row.doc.chunk.path, set);
  }
  const noteCoverage = (path: string) =>
    credit((term) => noteTerms.get(path)?.has(term) ?? false);

  return rows
    .map(({ doc, score, covered }) => ({
      ...doc.chunk,
      score,
      match: Number(Math.min(1, Math.max(covered, 0.9 * noteCoverage(doc.chunk.path))).toFixed(3)),
      via: "lexical" as const,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function sentences(text: string): string[] {
  return text
    .replace(/^#+\s.*$/gm, "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z"[])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    // FAQ notes are written as "question? answer." Quote the answer, not the question.
    .flatMap((sentence) => {
      const answer = sentence.split(/\?\s+/).pop() ?? "";
      return answer.endsWith("?") || answer.length <= 20 ? [] : [answer];
    })
    // Placeholder facts are never quoted as if they were true.
    .filter((sentence) => !sentence.includes("[MOCK"));
}

/**
 * The no-model answer: the sentences from the best one or two notes that share the most terms with
 * the question, kept in their original order so they still read as Aden wrote them.
 */
export function extractiveAnswer(
  hits: Retrieved[],
  query = "",
  maxChars = 640,
): { text: string; usedIds: string[] } {
  const top = hits[0];
  if (!top) return { text: "", usedIds: [] };
  const wanted = new Set(queryTerms(query).map((t) => t.term));
  const pool = hits
    .slice(0, 3)
    .filter((hit, index) => index === 0 || (hit.path !== top.path && hit.match >= top.match * 0.8 && hit.score >= top.score * 0.6))
    .slice(0, 2);

  const picked: { text: string; id: string; order: number }[] = [];
  let budget = maxChars;
  for (const [hitIndex, hit] of pool.entries()) {
    const ranked = sentences(hit.text)
      .map((sentence, order) => {
        const overlap = tokens(sentence).filter((token) => wanted.has(token)).length;
        return { sentence, order, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap || a.order - b.order);
    const take = hitIndex === 0 ? 3 : 1;
    for (const item of ranked.slice(0, take)) {
      if (item.sentence.length > budget) continue;
      if (hitIndex > 0 && item.overlap === 0) continue;
      picked.push({ text: item.sentence, id: hit.id, order: hitIndex * 1000 + item.order });
      budget -= item.sentence.length + 1;
    }
  }

  if (picked.length === 0) {
    if (top.status === "mock" || top.text.includes("[MOCK")) {
      return { text: `My notes on ${top.title.toLowerCase()} are a placeholder I have not filled in yet. Leave me a message and I will answer it myself.`, usedIds: [] };
    }
    const text = top.text.replace(/\s+/g, " ").trim();
    return { text: text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`, usedIds: [top.id] };
  }
  picked.sort((a, b) => a.order - b.order);
  return { text: picked.map((p) => p.text).join(" "), usedIds: [...new Set(picked.map((p) => p.id))] };
}

export { chunkMarkdown };
