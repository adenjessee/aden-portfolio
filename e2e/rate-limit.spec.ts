import { expect, test } from "@playwright/test";

test("ask rate limit eventually degrades", async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 14; i += 1) {
    const response = await request.post("/api/ask", { data: { question: `rate ${i} graph` } });
    statuses.push(response.status());
    const text = await response.text();
    if (text.includes("rate_limited")) {
      expect(text).toContain("degraded");
      return;
    }
  }
  expect(statuses.every((status) => status === 200)).toBeTruthy();
});
