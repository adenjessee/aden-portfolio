import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { llmModel, llmProvider } from "../src/lib/env";
import { runEvals } from "../src/evals/run";
import type { EvalCase } from "../src/evals/grade";

// Usage: npm run evals            notes-only mode, free, deterministic
//        npm run evals -- --llm   the configured model (spends real money; ~33 calls)
const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const llm = process.argv.includes("--llm");
if (llm && llmProvider(undefined) === "none") {
  console.error("--llm needs ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment.");
  process.exit(1);
}

const { cases } = JSON.parse(await readFile(join(root, "evals/cases.json"), "utf8")) as { cases: EvalCase[] };
const model = llm ? llmModel(undefined) : null;
console.log(`Running ${cases.length} cases in ${llm ? `model mode (${model})` : "notes-only mode"}\n`);
const report = await runEvals(cases, { llm, model, onResult: (line) => console.log(line) });

const file = join(root, `src/data/evals-${report.mode}.json`);
await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n${report.passed}/${report.total} passed · $${report.costUsd.toFixed(4)} · wrote ${file.replace(`${root}/`, "")}`);
process.exit(report.passed === report.total ? 0 : 1);
