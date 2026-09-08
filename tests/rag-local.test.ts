import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../src/rag/chunk";
import { scoreLocal } from "../src/rag/localIndex";
import { hasPosition } from "../src/rag/threshold";

const sample = `---
source: Aden / test.md
confidence: high
last_updated: 2026-09-04
title: Test
---

Graph comprehension is becoming more valuable relative to code generation.

A model can write a function. It still cannot know the blast radius.
`;

describe("local retrieval", () => {
  it("chunks on paragraph boundaries", () => {
    const chunks = chunkMarkdown("positions/graph-engineering.md", sample);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].source).toBe("Aden / test.md");
    expect(chunks[0].confidence).toBe("high");
  });

  it("scores graph questions above the empty case", () => {
    const chunks = chunkMarkdown("graph.md", sample);
    const hits = scoreLocal("why does graph engineering matter", chunks, 4);
    expect(hits[0]?.score).toBeGreaterThan(0.2);
    expect(hasPosition(hits)).toBe(true);
  });

  it("does not invent a position on unrelated questions", () => {
    const chunks = chunkMarkdown("graph.md", sample);
    const hits = scoreLocal("what is your favorite pizza topping", chunks, 4);
    expect(hits).toEqual([]);
    expect(hasPosition(hits)).toBe(false);
  });

  it("answers from the top hit only", async () => {
    const { extractiveAnswer } = await import("../src/rag/localIndex");
    const chunks = chunkMarkdown("graph.md", sample);
    const hits = scoreLocal("graph engineering blast radius", chunks, 4);
    const speech = extractiveAnswer(hits);
    expect(speech).toContain("Graph comprehension");
    expect(speech.includes("A model can write")).toBe(speech.length > 80);
  });
});
