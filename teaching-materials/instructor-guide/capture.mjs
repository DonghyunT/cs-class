// Retakes the guide's screenshots from the local demo site (never the production site).
// Run `npm run dev:emulator` first, then: node teaching-materials/instructor-guide/capture.mjs
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { testEnv } from "../../scripts/local-test-env.mjs";

const base = "http://localhost:3000", out = new URL("./images/", import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
// `clip` crops to the part the guide talks about (the local-only guest buttons stay out of the login shot).
const shot = (name, clip) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)), clip });

await page.goto(`${base}/login/teacher`);
await page.getByRole("button", { name: "교사 비밀번호 로그인", exact: true }).click();
await shot("02-login", { x: 400, y: 270, width: 480, height: 360 });
await page.getByLabel("비밀번호", { exact: true }).fill(testEnv.CS_TEST_INSTRUCTOR_PASSWORD);
await page.keyboard.press("Enter");
await page.waitForURL(`${base}/teacher`);
await page.waitForLoadState("networkidle");
await shot("03-teacher-home");
await page.goto(`${base}/teacher/classes`);
await page.waitForLoadState("networkidle");
await shot("04-classes");
await page.getByRole("link", { name: "2학년 10반 설정 열기" }).click();
await page.getByRole("dialog").waitFor();
await shot("04b-class-settings");
await page.keyboard.press("Escape");
await page.goto(`${base}/teacher/students`);
await page.waitForLoadState("networkidle");
await page.getByRole("table").first().scrollIntoViewIfNeeded();
await shot("05b-student-rows");
// The teacher preview shows the student screens without touching student records.
await page.goto(`${base}/teacher/preview/conditionals`);
await page.waitForLoadState("networkidle");
await shot("06-preview-concept");
await page.getByRole("tab", { name: /실습/ }).click();
await page.frameLocator("iframe").getByRole("button", { name: "시작하기", exact: true }).waitFor({ timeout: 30000 });
await shot("07-preview-practice", { x: 0, y: 190, width: 1280, height: 390 });
await browser.close();
