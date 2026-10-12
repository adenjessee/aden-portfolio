import { expect, test } from "@playwright/test";

test("ask rate limit answers with an error event, not a crash", async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 14 && !limited; i += 1) {
    const response = await request.post("/api/ask", { data: { question: `rate ${i}` }, headers: { "x-forwarded-for": "10.9.9.9" } });
    expect(response.status()).toBe(200);
    limited = (await response.text()).includes("rate_limited");
  }
  expect(limited).toBe(true);
});
