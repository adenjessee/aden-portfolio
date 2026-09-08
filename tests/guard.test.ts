import { beforeEach, describe, expect, it } from "vitest";
import { chargeBudget, budgetRemaining } from "../src/guard/budget";
import { consumeQuestion } from "../src/guard/sessionCap";
import { checkRateLimit } from "../src/guard/rateLimit";
import { resetMemoryStore } from "../src/guard/memoryStore";
import { guardAsk } from "../src/guard/pipeline";

describe("guards", () => {
  beforeEach(() => resetMemoryStore());

  it("caps a session at five questions", async () => {
    let last = await consumeQuestion(undefined, "s1");
    for (let i = 0; i < 4; i += 1) last = await consumeQuestion(undefined, "s1");
    expect(last.ok).toBe(true);
    const done = await consumeQuestion(undefined, "s1");
    expect(done.ok).toBe(false);
  });

  it("rate limits after ten local hits in a minute", async () => {
    for (let i = 0; i < 10; i += 1) {
      const hit = await checkRateLimit(undefined, "10.0.0.1");
      expect(hit.ok).toBe(true);
    }
    const blocked = await checkRateLimit(undefined, "10.0.0.1");
    expect(blocked.ok).toBe(false);
  });

  it("marks budget exhausted after the ceiling", async () => {
    await chargeBudget(undefined, 5);
    const budget = await budgetRemaining(undefined);
    expect(budget.exhausted).toBe(true);
    const guard = await guardAsk(undefined, "1.2.3.4", "fresh");
    expect(guard.ok).toBe(true);
    if (guard.ok) expect(guard.degradeToCached).toBe(true);
  });
});
