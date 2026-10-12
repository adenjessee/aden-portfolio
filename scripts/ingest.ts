/**
 * Personal knowledge intake. Raw exports and everything extracted from them stay in private/ (gitignored).
 *
 *   npm run ingest -- linkedin [dir]          LinkedIn export, unzipped     (default private/inbox/linkedin)
 *   npm run ingest -- chatgpt [file]          ChatGPT conversations.json    (default private/inbox/chatgpt/conversations.json)
 *   npm run ingest -- corpus <file.md>...     Aden's own messages in the TRON voice-corpus format
 *   npm run ingest -- review                  merge + de-duplicate everything into private/review/facts.md
 *   npm run ingest -- promote                 write the facts ticked in facts.md into content/kb, then reindex
 *
 * chatgpt and corpus call the configured model (Haiku by default, a few cents per thousand messages).
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { llmClient } from "../src/director/llm";
import { estimateAskCost } from "../src/guard/costTable";
import { llmModel } from "../src/lib/env";
import { extractFacts, stillPublishable } from "../src/ingest/extract";
import { LINKEDIN_FILES, linkedinCandidates } from "../src/ingest/linkedin";
import { chatgptMessages, corpusMessages, toBatches } from "../src/ingest/messages";
import { mergeIntoNote } from "../src/ingest/promote";
import { dedupe, parseReview, renderReview } from "../src/ingest/review";
import type { Candidate } from "../src/ingest/types";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const priv = (...p: string[]) => join(root, "private", ...p);
const [command, ...args] = process.argv.slice(2);

async function save(name: string, candidates: Candidate[], stats: Record<string, unknown>) {
  await mkdir(priv("extracted"), { recursive: true });
  const file = priv("extracted", `${name}.json`);
  await writeFile(file, JSON.stringify({ extractedAt: new Date().toISOString(), stats, candidates }, null, 2));
  console.log(`${candidates.length} candidates -> private/extracted/${name}.json`, stats);
}

async function extractFrom(name: string, messages: { source: string; text: string }[]) {
  const llm = llmClient(undefined);
  if (!llm) throw new Error("Set ANTHROPIC_API_KEY (in .env, then `set -a; . ./.env`) to run the extractor.");
  const batches = toBatches(messages);
  console.log(`${messages.length} messages in ${batches.length} batches, extracting with ${llmModel(undefined)}…`);
  const result = await extractFacts(llm, batches, {
    onProgress: (done, total) => process.stdout.write(`\r  ${done}/${total}`),
  });
  process.stdout.write("\n");
  const costUsd = estimateAskCost({ usedLlm: true, model: llmModel(undefined), inputTokens: result.inputTokens, outputTokens: result.outputTokens });
  await save(name, result.candidates, { messages: messages.length, batches: batches.length, droppedPrivate: result.dropped, failedBatches: result.failures, costUsd });
}

switch (command) {
  case "linkedin": {
    const dir = args[0] ?? priv("inbox", "linkedin");
    const files: Record<string, string> = {};
    for (const name of LINKEDIN_FILES) if (existsSync(join(dir, name))) files[name] = await readFile(join(dir, name), "utf8");
    if (!Object.keys(files).length) throw new Error(`No LinkedIn CSVs in ${dir}. Unzip the export there.`);
    await save("linkedin", linkedinCandidates(files), { files: Object.keys(files) });
    break;
  }
  case "chatgpt": {
    const file = args[0] ?? priv("inbox", "chatgpt", "conversations.json");
    await extractFrom("chatgpt", chatgptMessages(await readFile(file, "utf8")));
    break;
  }
  case "corpus": {
    if (!args.length) throw new Error("Pass one or more corpus markdown files.");
    const messages = (await Promise.all(args.map(async (f) => corpusMessages(await readFile(f, "utf8"), basename(f, ".md"))))).flat();
    await extractFrom(`corpus-${args.map((f) => basename(f, ".md")).join("+")}`, messages);
    break;
  }
  case "review": {
    const dir = priv("extracted");
    const names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    const all: Candidate[] = [];
    for (const name of names) all.push(...(JSON.parse(await readFile(join(dir, name), "utf8")) as { candidates: Candidate[] }).candidates);
    // Re-applies the privacy gate, so files extracted before a rule was added are filtered too.
    const unique = dedupe(all.filter((c) => stillPublishable(c.claim)));
    await mkdir(priv("review"), { recursive: true });
    await writeFile(priv("review", "facts.md"), renderReview(unique, { generatedAt: new Date().toISOString().slice(0, 16), sources: names }));
    console.log(`${all.length} candidates, ${unique.length} after merging duplicates -> private/review/facts.md`);
    break;
  }
  case "promote": {
    const ticked = parseReview(await readFile(priv("review", "facts.md"), "utf8"));
    const date = new Date().toISOString().slice(0, 10);
    let count = 0;
    for (const [target, facts] of ticked) {
      const file = join(root, "content", "kb", `${target}.md`);
      await mkdir(join(file, ".."), { recursive: true });
      const existing = existsSync(file) ? await readFile(file, "utf8") : null;
      await writeFile(file, mergeIntoNote(existing, target, facts.map((f) => f.claim), date));
      count += facts.length;
      console.log(`  ${target}: ${facts.length}`);
    }
    execSync("npx tsx scripts/index-kb.ts", { cwd: root, stdio: "inherit" });
    console.log(`${count} facts written. Review with git diff content/kb, then run npm test.`);
    break;
  }
  default:
    console.log("Usage: npm run ingest -- linkedin|chatgpt|corpus|review|promote (see scripts/ingest.ts)");
}
