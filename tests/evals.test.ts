import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runEvals } from "../src/evals/run";
import type { EvalCase } from "../src/evals/grade";

const { cases } = JSON.parse(readFileSync(new URL("../evals/cases.json", import.meta.url), "utf8")) as { cases: EvalCase[] };

describe("AI Aden evals, notes-only mode", () => {
  it("passes every case without a model", async () => {
    const report = await runEvals(cases, { llm: false, model: null });
    const failed = report.results.filter((r) => !r.pass).map((r) => `${r.id}: ${r.failures.join("; ")}`);
    expect(failed).toEqual([]);
  });
});
