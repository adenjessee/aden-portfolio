import { expect, test } from "@playwright/test";

test("health exposes the daily ceiling", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();
  expect(body.dailyBudgetUsd).toBeGreaterThan(0);
  expect(body.budgetExhausted).toBe(false);
});

test("tts without credentials degrades quietly", async ({ request }) => {
  const response = await request.post("/api/tts", {
    data: { text: "Graph comprehension is becoming more valuable." },
  });
  expect([204, 200, 429]).toContain(response.status());
});
