import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.test.ts",
  workers: 1,
  forbidOnly: !!process.env.CI,
  timeout: 10_000,
});
