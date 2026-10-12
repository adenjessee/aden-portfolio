import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chargeBudget, budgetRemaining } from "../src/guard/budget";
import { consumeQuestion } from "../src/guard/sessionCap";
import { checkRateLimit } from "../src/guard/rateLimit";
import { resetMemoryStore } from "../src/guard/memoryStore";
import { guardAsk } from "../src/guard/pipeline";
import { estimateAskCost } from "../src/guard/costTable";

describe("guards", () => {
  beforeEach(() => resetMemoryStore());
  afterEach(() => vi.unstubAllEnvs());

  it("caps a session at five questions and refuses a spend that would cross it", async () => {
    let last = await consumeQuestion(undefined, "s1");
    for (let i = 0; i < 3; i += 1) last = await consumeQuestion(undefined, "s1");
    expect(last.ok).toBe(true);
    expect((await consumeQuestion(undefined, "s1", 2)).ok).toBe(false);
    expect((await consumeQuestion(undefined, "s1")).ok).toBe(true);
    expect((await consumeQuestion(undefined, "s1")).ok).toBe(false);
  });

  it("rate limits after ten local hits in a minute", async () => {
    for (let i = 0; i < 10; i += 1) expect((await checkRateLimit(undefined, "10.0.0.1")).ok).toBe(true);
    expect((await checkRateLimit(undefined, "10.0.0.1")).ok).toBe(false);
  });

  it("answers free from the notes when no model is configured", async () => {
    vi.stubEnv("LLM_PROVIDER", "none");
    const guard = await guardAsk(undefined, "1.2.3.4", "fresh");
    expect(guard.ok && guard.live).toBe(false);
    if (guard.ok) expect(guard.freeReason).toBe("no_model");
  });

  it("stops the model at the daily ceiling without consuming the visit's questions", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    await chargeBudget(undefined, 5);
    expect((await budgetRemaining(undefined)).exhausted).toBe(true);
    const guard = await guardAsk(undefined, "1.2.3.4", "fresh");
    expect(guard.ok && guard.live).toBe(false);
    if (guard.ok) {
      expect(guard.freeReason).toBe("budget_exhausted");
      expect(guard.questionsUsed).toBe(0);
    }
  });

  it("prices cache reads and writes", () => {
    const cold = estimateAskCost({ usedLlm: true, model: "claude-opus-5-5", inputTokens: 1000, outputTokens: 300, cacheWriteTokens: 1500, cacheReadTokens: 0 });
    const warm = estimateAskCost({ usedLlm: true, model: "claude-opus-5-5", inputTokens: 1000, outputTokens: 300, cacheWriteTokens: 0, cacheReadTokens: 1500 });
    expect(warm).toBeLessThan(cold);
    expect(estimateAskCost({ usedLlm: false })).toBe(0);
  });
});
