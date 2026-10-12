import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:4321",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
