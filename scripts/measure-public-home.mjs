import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [base = "https://cs-class-donghyunt.vercel.app", output = "scratch/public-home-performance.json"] = process.argv.slice(2);
if (!["https://cs-class-donghyunt.vercel.app", "http://localhost:3000"].includes(base)) throw new Error("Only the documented public production URL or local test URL is supported.");
// An isolated anonymous context: no saved credentials, HAR, screenshots or response bodies.
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const samples = [];
  for (let index = 0; index < 6; index++) {
    const session = page.waitForResponse((response) => response.url() === `${base}/api/auth/session` && response.status() === 200);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => [...document.querySelectorAll(".landing-button.compact")].some((element) => element.tagName === "A" || !element.disabled));
    const enabledMs = await page.evaluate(() => performance.now());
    const response = await session; await response.finished();
    const timing = response.request().timing(), sizes = await response.request().sizes();
    const navigation = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const session = resources.find((entry) => new URL(entry.name).pathname === "/api/auth/session");
      return { documentTtfbMs: Math.round(nav.responseStart - nav.requestStart), dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart), connectMs: Math.round(nav.connectEnd - nav.connectStart), documentRequestStartMs: Math.round(nav.requestStart), documentResponseEndMs: Math.round(nav.responseEnd), domReadyMs: Math.round(nav.domContentLoadedEventEnd), sessionStartMs: Math.round(session.startTime), apiRequestCount: resources.filter((entry) => new URL(entry.name).pathname.startsWith("/api/")).length };
    });
    samples.push({ index, kind: index ? "repeat" : "first-observed", enabledMs: Math.round(enabledMs), ...navigation, session: { durationMs: Math.round(timing.responseEnd), ttfbMs: Math.round(timing.responseStart - timing.requestStart), responseBodyBytes: sizes.responseBodySize } });
  }
  const report = { observedAt: new Date().toISOString(), base, role: "anonymous", samples };
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
