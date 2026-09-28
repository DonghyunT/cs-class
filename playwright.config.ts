import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    // Playwright's API cookie jar permits Secure cookies on localhost only.
    // Use the same hostname for browser/API tests of the production build.
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/dev-emulator.mjs",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
