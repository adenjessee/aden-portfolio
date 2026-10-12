import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../src/rag/chunk";
import { extractiveAnswer, loadBundledChunks, queryTerms, scoreLocal } from "../src/rag/localIndex";
import { hasPosition } from "../src/rag/threshold";

const sample = `---
source: Aden / test.md
confidence: high
status: verified
last_updated: 2026-09-04
title: Graph engineering
---

Graph comprehension is becoming more valuable relative to code generation.

A model can write a function. It still cannot know the blast radius.
`;

describe("local retrieval", () => {
  it("chunks on paragraph boundaries and keeps frontmatter", () => {
    const chunks = chunkMarkdown("positions/graph-engineering.md", sample);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].source).toBe("Aden / test.md");
    expect(chunks[0].confidence).toBe("high");
    expect(chunks[0].status).toBe("verified");
  });

  it("finds a covered question and clears the threshold", () => {
    const chunks = chunkMarkdown("graph.md", sample);
    const hits = scoreLocal("why does graph engineering matter", chunks, 4);
    expect(hits[0]?.match).toBeGreaterThan(0.5);
    expect(hasPosition(hits)).toBe(true);
  });

  it("does not invent a position on unrelated questions", () => {
    const chunks = chunkMarkdown("graph.md", sample);
    const hits = scoreLocal("what is your favorite pizza topping", chunks, 4);
    expect(hasPosition(hits)).toBe(false);
  });

  it("stems so different forms of a word meet", () => {
    expect(queryTerms("making").map((t) => t.term)).toEqual(queryTerms("make").map((t) => t.term));
    expect(queryTerms("weaknesses")[0].term).toBe(queryTerms("weakest")[0].term);
  });

  it("never quotes a placeholder sentence", () => {
    const mock = chunkMarkdown(
      "career/compensation.md",
      `---\nstatus: mock\ntitle: Compensation\n---\n\nMy target base is [MOCK: $X to $Y]. I discuss compensation on a call.`,
    );
    const { text } = extractiveAnswer(scoreLocal("compensation target base", mock, 2), "compensation target base");
    expect(text).not.toContain("[MOCK");
  });

  it("ranks the note titled with the subject first", () => {
    const hits = scoreLocal("What is GridSeak?", loadBundledChunks(), 3);
    expect(hits[0].path).toBe("projects/gridseak.md");
  });
});

describe("conversation turns", () => {
  it("does not drag a new short question back to the last topic", async () => {
    const { retrieveForTurn } = await import("../src/rag/retrieve");
    const hits = await retrieveForTurn(undefined, "Are you open to new roles?", "What is your favorite pizza topping?");
    expect(hasPosition(hits)).toBe(true);
    expect(hits.some((h) => h.path === "career/roles-i-want.md" || h.path === "faq/common-questions.md")).toBe(true);
  });

  it("carries a bare follow-up on the previous question", async () => {
    const { retrieveForTurn } = await import("../src/rag/retrieve");
    const hits = await retrieveForTurn(undefined, "why?", "Why does graph engineering matter?");
    expect(hits[0].path).toBe("positions/graph-engineering.md");
  });
});
