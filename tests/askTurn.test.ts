import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMemoryStore } from "../src/guard/memoryStore";
import type { AskEvent } from "../src/protocol";
import { runAskTurn } from "../src/server/askTurn";

const turn = (question: string, voice = false) => ({ question, history: [], voice, sid: "t1", ip: "1.1.1.1" });

describe("one ask turn, notes-only", () => {
  beforeEach(() => {
    resetMemoryStore();
    vi.stubEnv("LLM_PROVIDER", "none");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("streams status, retrieval, then a cited answer, in that order", async () => {
    const events: AskEvent[] = [];
    await runAskTurn(undefined, turn("What is GridSeak?"), (e) => events.push(e));
    expect(events.map((e) => e.type)).toEqual(["status", "status", "retrieved", "status", "answer"]);
    const answer = events.at(-1);
    if (answer?.type !== "answer") throw new Error("no answer");
    expect(answer.citations[0]).toMatch(/^projects\/gridseak/);
    expect(answer.meter.live).toBe(false);
    expect(answer.voiceCostUsd).toBe(0);
  });

  it("speaks the answer when voice is on, and bills it", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "xi-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`${JSON.stringify({ audio_base64: btoa("pcm"), alignment: null })}\n`, { status: 200 })),
    );
    const events: AskEvent[] = [];
    await runAskTurn(undefined, turn("What is GridSeak?", true), (e) => events.push(e));
    const types = events.map((e) => e.type);
    expect(types).toContain("voice");
    expect(types.indexOf("audio")).toBeLessThan(types.indexOf("answer"));
    const answer = events.at(-1);
    if (answer?.type !== "answer") throw new Error("no answer");
    expect(answer.voiceCostUsd).toBeGreaterThan(0);
    expect(answer.meter.spentUsd).toBeCloseTo(answer.voiceCostUsd, 6);
  });

  it("stops at the rate limit with an error and no answer", async () => {
    const events: AskEvent[] = [];
    for (let i = 0; i < 11; i += 1) await runAskTurn(undefined, { ...turn("hi"), ip: "9.9.9.9" }, (e) => events.push(e));
    expect(events.at(-1)).toMatchObject({ type: "error", reason: "rate_limited" });
  });
});
