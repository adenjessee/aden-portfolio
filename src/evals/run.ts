import { answerQuestion } from "../director/answer";
import { retrieve } from "../rag/retrieve";
import { grade, summarize, type EvalCase, type EvalReport } from "./grade";

/** Runs every case through the same retrieval and director code the Worker uses. */
export async function runEvals(cases: EvalCase[], opts: { llm: boolean; model: string | null; onResult?: (line: string) => void }): Promise<EvalReport> {
  const results = [];
  for (const test of cases) {
    const hits = await retrieve(undefined, test.question);
    const answer = await answerQuestion(undefined, { question: test.question, history: [], hits, allowLlm: opts.llm });
    const result = grade(test, answer);
    results.push(result);
    opts.onResult?.(`${result.pass ? "pass" : "FAIL"}  ${test.kind.padEnd(12)} ${test.id}${result.failures.length ? `  (${result.failures.join("; ")})` : ""}`);
  }
  return summarize(results, opts.llm ? "llm" : "extractive", opts.llm ? opts.model : null);
}
