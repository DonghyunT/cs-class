// Retakes the guide's screenshots from the local demo site (never the production site).
// Run `npm run dev:emulator` first, then: node teaching-materials/instructor-guide/capture.mjs
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { testEnv } from "../../scripts/local-test-env.mjs";
import { passwordDigest } from "../../src/lib/server/temporary-password.mjs";

const base = "http://localhost:3000", out = new URL("./images/", import.meta.url);
// Check the demo target before UI actions or synthetic account writes.
const config = await (await fetch(`${base}/api/auth/config`)).json();
assert.equal(config.projectId, "demo-cs-class");
assert.equal(config.emulatorHost, "127.0.0.1:9099");
Object.assign(process.env, testEnv);
const app = initializeApp({ projectId: "demo-cs-class" }, "instructor-guide-capture");
const auth = getAuth(app), db = getFirestore(app);
await db.doc("csClasses/2-10").set({ id: "2-10", name: "2학년 10반", currentLessonId: "programming-13", openedLessonIds: ["programming-13", "conditionals", "loops"], revision: 1 });
for (const studentId of ["21001", "21002", "21003"]) {
  const uid = `student-${studentId}`;
  try { await auth.createUser({ uid, email: `s-${studentId}@cs-class.invalid`, password: testEnv.CS_INITIAL_PASSWORD }); }
  catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser(uid, { password: testEnv.CS_INITIAL_PASSWORD, disabled: false }); }
  await db.doc(`csAccounts/${uid}`).set({ uid, role: "student", studentId, classId: "2-10", classIds: [], mustChangePassword: true, temporaryPassword: { hash: passwordDigest(testEnv.CS_INITIAL_PASSWORD), expiresAt: Date.now() + 30 * 60_000 }, disabled: false, authVersion: 0, authBusy: null, session: null });
  await db.doc(`csWork/${uid}__programming-13`).delete();
}
const browser = await chromium.launch();
const errors = [], captures = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5 });
const studentContext = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5 });
const page = await context.newPage(), student = await studentContext.newPage();
for (const p of [page, student]) {
  p.on("pageerror", error => errors.push(error.message));
  p.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
}
const headers = { "X-CS-Class": "1" };
async function shot(name, target, options = {}) {
  await target.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)), animations: "disabled", ...options });
  captures.push(name);
  console.log(`Captured ${name}`);
}
async function visit(p, path) { await p.goto(`${base}${path}`); await p.waitForLoadState("networkidle"); }
try {
  const login = await page.request.post(`${base}/api/auth/login`, { headers, data: { role: "instructor", studentId: "", password: testEnv.CS_TEST_INSTRUCTOR_PASSWORD } });
  assert.equal(login.status(), 200);
  await visit(page, "/teacher?classId=2-10");
  await shot("22-teacher-home", page, { clip: { x: 0, y: 0, width: 1280, height: 650 } });
  await visit(page, "/teacher/classes?classId=2-10");
  await page.getByRole("link", { name: "2학년 10반 설정 열기" }).click();
  const settings = page.getByRole("dialog");
  const bounds = await settings.boundingBox();
  assert.ok(bounds);
  await shot("10-class-settings", page, { clip: { x: bounds.x, y: bounds.y, width: bounds.width, height: 460 } });
  await settings.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await shot("10b-class-settings-save", page, { clip: { x: bounds.x, y: bounds.y + bounds.height - 300, width: bounds.width, height: 300 } });
  await page.keyboard.press("Escape");
  await visit(page, "/teacher/students?classId=2-10&lessonId=programming-13");
  await page.getByRole("button", { name: "첫 입장 열기", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "첫 입장 열기", exact: true }).click();
  const code = (await page.getByLabel(/^입장 코드/).textContent()).trim();
  assert.match(code, /^\d{6}$/);
  await shot("11-first-entry", page.getByRole("dialog"));
  await visit(student, "/login/student");
  await shot("12-student-login", student.locator("form"));
  await student.getByLabel("학번", { exact: true }).fill("21001");
  await student.getByLabel("비밀번호", { exact: true }).fill(code);
  await student.getByRole("button", { name: "교실 입장", exact: true }).click();
  await expect(student.getByLabel("새 비밀번호", { exact: true })).toBeVisible();
  await shot("13-personal-password", student.locator("form"));
  await student.getByLabel("새 비밀번호", { exact: true }).fill(testEnv.CS_TEST_GUEST_PASSWORD);
  await student.getByLabel("새 비밀번호 확인", { exact: true }).fill(testEnv.CS_TEST_GUEST_PASSWORD);
  await student.getByRole("button", { name: "비밀번호 저장하고 입장", exact: true }).click();
  await student.waitForURL(`${base}/student`);
  await page.getByRole("button", { name: "첫 입장 닫기", exact: true }).click();
  await visit(student, "/classroom/programming-13");
  await shot("14-concept", student.locator("fieldset"));
  await student.getByRole("tab", { name: /퀴즈/ }).click();
  await shot("15-quiz", student.getByRole("tabpanel"));
  await student.getByRole("tab", { name: /실습/ }).click();
  await student.frameLocator("iframe").getByRole("button", { name: "시작하기", exact: true }).waitFor({ timeout: 45000 });
  const endpoint = `${base}/api/classroom/work/programming-13`;
  const work = await (await student.request.get(endpoint)).json();
  const project = JSON.parse(work.draft.programming.projects.name);
  project.objects[0].script = [[{ type: "when_run_button_click", params: [null] }, { type: "direction_absolute", params: [{ type: "angle", params: [90] }, null] }, { type: "move_direction", params: [{ type: "number", params: [10] }, null] }]];
  work.draft.stage = "practice";
  work.draft.programming.mission = "move";
  work.draft.programming.projects.move = JSON.stringify(project);
  const saved = await student.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } });
  assert.equal(saved.status(), 200);
  await student.reload();
  await student.frameLocator("iframe").getByRole("button", { name: "시작하기", exact: true }).waitFor({ timeout: 45000 });
  await student.getByRole("button", { name: "저장", exact: true }).click();
  await expect(student.locator("[data-lesson-shell] header [role=status]")).toContainText("저장 완료");
  await expect(student.getByText("엔트리 작업실을 불러오는 중…", { exact: true })).toBeHidden();
  await shot("16-practice", student.locator("iframe"));
  await shot("18-save-header", student.getByRole("button", { name: "저장", exact: true }).locator(".."));
  await student.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(student.getByRole("button", { name: "작품 제출", exact: true })).toBeEnabled();
  const validation = student.getByRole("button", { name: "조건 검증", exact: true }).locator("..");
  await shot("19-validation-submit", validation);
  await student.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(student.getByRole("button", { name: "이 작품 제출 완료", exact: true })).toBeVisible();
  await shot("20-submitted", student.getByRole("group", { name: "작품 저장·검증·제출 상태", exact: true }).locator(":scope > span").last());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await visit(page, "/teacher/students?classId=2-10&lessonId=programming-13");
  await shot("17b-refresh", page.getByRole("button", { name: "수업 새로고침", exact: true }).locator("../.."));
  await shot("17-student-progress", page.locator('section[aria-labelledby="students-title"]'));
  assert.deepEqual(errors, []);
  assert.equal(captures.length, 14);
  console.log(`PASS: ${captures.length} local demo screenshots; first entry, save, validate and submit confirmed; page errors 0.`);
} finally {
  await page.request.post(`${base}/api/classroom/first-entry/2-10`, { headers, data: { action: "close" } }).catch(error => { console.warn(`Local first-entry cleanup failed (${error.name}); the code expires automatically.`); });
  await browser.close();
}
