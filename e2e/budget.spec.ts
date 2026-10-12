import { expect, test } from "@playwright/test";

test("health exposes the daily ceiling", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();
  expect(body.dailyBudgetUsd).toBeGreaterThan(0);
});

test("cross-site posts are refused", async ({ request }) => {
  const response = await request.post("/api/ask", { data: { question: "hi" }, headers: { origin: "https://evil.example" } });
  expect(response.status()).toBe(403);
});

test("speech-to-text refuses non-audio", async ({ request }) => {
  const response = await request.post("/api/stt", { data: "hello", headers: { "content-type": "text/plain" } });
  expect(response.status()).toBe(415);
});
