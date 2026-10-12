import { expect, test } from "@playwright/test";

test.describe("employer mode without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("home renders work and receipts", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Aden Jessee" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ask AI Aden" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "GridSeak", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "GridSchool", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "gridschool.org", exact: true })).toBeVisible();
  });

  test("resume is readable", async ({ page }) => {
    await page.goto("/resume");
    await expect(page.getByRole("heading", { name: "Aden Jessee" })).toBeVisible();
  });

  test("ask points to the notes when it cannot talk", async ({ page }) => {
    await page.goto("/ask");
    await expect(page.getByRole("heading", { name: "Ask AI Aden" })).toBeVisible();
    await expect(page.getByRole("link", { name: "/notes" })).toBeVisible();
  });

  test("every note is published", async ({ page }) => {
    await page.goto("/notes");
    await expect(page.getByRole("heading", { name: "Everything AI Aden is allowed to say" })).toBeVisible();
    await page.getByRole("link", { name: "GridSeak" }).first().click();
    await expect(page.getByRole("heading", { name: "GridSeak" })).toBeVisible();
  });

  test("evals are published", async ({ page }) => {
    await page.goto("/evals");
    await expect(page.getByRole("heading", { name: "How AI Aden is tested" })).toBeVisible();
    await expect(page.getByText("33/33").first()).toBeVisible();
  });
});

test("ask page talks: input, mic, and a log", async ({ page }) => {
  await page.goto("/ask");
  const input = page.getByPlaceholder("Ask Aden anything");
  await expect(input).toBeVisible();
  await input.fill("What is GridSeak?");
  await input.press("Enter");
  await expect(page.getByRole("list", { name: "Conversation" }).getByText("What is GridSeak?")).toBeVisible();
  await expect(page.locator(".stage-log li").first()).toHaveAttribute("data-state", /speaking|done/, { timeout: 30000 });
});
