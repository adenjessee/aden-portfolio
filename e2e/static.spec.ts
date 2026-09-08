import { expect, test } from "@playwright/test";

test.describe("employer mode without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("home renders work and receipts", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Aden Jessee" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Talk to AI Aden" })).toBeVisible();
    await expect(page.getByRole("link", { name: "GridSeak", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "GridSchool", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Resume" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "gridschool.org", exact: true })).toBeVisible();
  });

  test("resume is readable", async ({ page }) => {
    await page.goto("/resume");
    await expect(page.getByRole("heading", { name: "Aden Jessee" })).toBeVisible();
    await expect(page.getByText("GridSchool", { exact: true })).toBeVisible();
  });

  test("ask page degrades to a text FAQ", async ({ page }) => {
    await page.goto("/ask");
    await expect(page.getByRole("heading", { name: "Talk to AI Aden" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Without the live model" })).toBeVisible();
    await expect(page.getByText("What is GridSchool?")).toBeVisible();
  });
});

test.describe("live path with JavaScript", () => {
  test("health reports a bundled corpus", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBeTruthy();
    expect(body.chunks).toBeGreaterThan(0);
  });

  test("ask returns a structured answer", async ({ request }) => {
    const response = await request.post("/api/ask", {
      data: { question: "Why does graph engineering matter?" },
    });
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("\"type\":\"answer\"");
    expect(text).toContain("speech");
  });

  test("session cap returns cached degradation", async ({ request }) => {
    let last = "";
    for (let i = 0; i < 6; i += 1) {
      const response = await request.post("/api/ask", { data: { question: `graph question ${i}` } });
      expect(response.ok()).toBeTruthy();
      last = await response.text();
    }
    expect(last).toMatch(/session_exhausted|degraded":true/);
  });
});
