import { expect, test } from "@playwright/test";

test("ask rate limit answers with an error event, not a crash", async ({ request }) => {
  // A fresh address per run, so a bucket left over from the previous run (same minute) cannot interfere.
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.9`;
  let limited = false;
  for (let i = 0; i < 14 && !limited; i += 1) {
    const response = await request.post("/api/ask", { data: { question: `rate ${i}` }, headers: { "x-forwarded-for": ip } });
    expect(response.status()).toBe(200);
    limited = (await response.text()).includes("rate_limited");
  }
  expect(limited).toBe(true);
});
