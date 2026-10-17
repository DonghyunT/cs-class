import { test, expect } from "@playwright/test";
import { guestLoginEnabled } from "../src/lib/server/guest-mode";
import { testEnv } from "../scripts/local-test-env.mjs";
import { clearLoginLimit, db, headers, localOnly } from "./emulator";
import type { Work } from "../src/lib/classroom/types";

const lessonId = "programming-13";

test.beforeEach(async ({ request }) => {
  await localOnly(request);
  for (const uid of ["student-21099", "guest-teacher"]) {
    await clearLoginLimit(uid);
  }
});

test("게스트는 두 로컬 에뮬레이터와 전용 demo 프로젝트에서만 허용", () => {
  expect(guestLoginEnabled(testEnv)).toBe(true);
  expect(guestLoginEnabled({ ...testEnv, NODE_ENV: "production" })).toBe(true);
  for (const override of [
    { VERCEL: "1" },
    { FIREBASE_PROJECT_ID: "cs-class-f74c4" },
    { FIREBASE_PROJECT_ID: "demo-other" },
    { FIREBASE_AUTH_EMULATOR_HOST: "" },
    { FIREBASE_AUTH_EMULATOR_HOST: "other.invalid:9099" },
    { FIRESTORE_EMULATOR_HOST: "" },
    { FIRESTORE_EMULATOR_HOST: "other.invalid:8080" },
    { CS_TEST_GUEST_PASSWORD: "" },
  ]) expect(guestLoginEnabled({ ...testEnv, ...override })).toBe(false);
});

test("게스트 API의 요청 출처·계정 상태·역할·담당 반 경계", async ({ request }) => {
  expect((await (await request.get("/api/auth/config")).json()).guestLoginEnabled).toBe(true);
  expect((await request.post("/api/auth/guest", { data: { role: "student" } })).status()).toBe(403);
  expect((await request.post("/api/auth/guest", { headers: { ...headers, Origin: "https://other.invalid" }, data: { role: "teacher" } })).status()).toBe(403);
  for (const data of [{ role: "instructor" }, { role: "teacher", uid: "student-20101" }, { role: "student", password: "forged" }]) {
    expect((await request.post("/api/auth/guest", { headers, data })).status()).toBe(400);
  }
  const profile = db.collection("csAccounts").doc("student-21099");
  try {
    await profile.update({ disabled: true });
    expect((await request.post("/api/auth/guest", { headers, data: { role: "student" } })).status()).toBe(401);
    await profile.update({ disabled: false, authBusy: "test" });
    expect((await request.post("/api/auth/guest", { headers, data: { role: "student" } })).status()).toBe(423);
  } finally { await profile.update({ disabled: false, authBusy: null }); }
  const student = await request.post("/api/auth/guest", { headers, data: { role: "student" } });
  expect(student.status()).toBe(200);
  expect((await student.json()).session).toMatchObject({ uid: "student-21099", role: "student", classId: "2-10", mustChangePassword: false });
  expect((await request.get("/api/classroom/teacher")).status()).toBe(403);
  const teacher = await request.post("/api/auth/guest", { headers, data: { role: "teacher" } });
  expect(teacher.status()).toBe(200);
  expect((await teacher.json()).session).toMatchObject({ uid: "guest-teacher", role: "teacher", classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) });
  expect((await request.get("/api/classroom/student")).status()).toBe(403);
  expect((await request.get("/api/classroom/teacher?classId=2-1")).status()).toBe(200);
  expect((await request.get("/api/classroom/teacher?classId=2-11")).status()).toBe(200);
  // Out-of-class reset denial is covered by the 10·11 instructor case in classroom-api.spec.ts.
  expect((await request.get("/api/classroom/teacher?classId=2-99")).status()).toBe(403);
});

test("게스트 학생·교사 바로 입장, 로컬 기록 복원, 화면 크기와 키보드", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await db.collection("csWork").doc(`student-21099__${lessonId}`).delete();
  await page.goto("/login/student");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "게스트 학생", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "게스트 교사", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await page.getByRole("button", { name: "게스트 학생", exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: "test-results/guest-login-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/guest-login-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "게스트 학생", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "게스트 교사", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://localhost:3000/student");
  await expect(page.getByRole("heading", { name: "오늘은 무엇을 해볼까요?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "나만의 비밀번호를 만들어요" })).toHaveCount(0);
  const cookie = (await page.context().cookies()).find((value) => value.name === "cs_session");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict" });
  if (process.env.CI) expect(cookie!.secure).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes("cs_session"))).toBe(false);
  const endpoint = `/api/classroom/work/${lessonId}`;
  const initialWork = await page.request.get(endpoint);
  expect(initialWork.status()).toBe(200);
  const work: Work = await initialWork.json();
  work.draft.conceptAnswers.pc0 = "0";
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  const reentry = page.waitForResponse((response) => response.url().endsWith("/api/auth/guest") && response.request().method() === "POST");
  await page.getByRole("button", { name: "게스트 학생", exact: true }).click();
  expect((await reentry).status()).toBe(200);
  await expect(page).toHaveURL(/\/student$/);
  const restored = await page.request.get(endpoint);
  expect(restored.status()).toBe(200);
  expect((await restored.json()).draft.conceptAnswers.pc0).toBe("0");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  await page.goto("/login/teacher");
  await page.getByRole("button", { name: "게스트 교사", exact: true }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByRole("combobox", { name: "담당 반" }).click();
  await expect(page.getByRole("option")).toHaveCount(11);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "담당 반" })).toHaveText("2학년 1반");
  await page.goto("/teacher/students?classId=2-10");
  await page.getByLabel("학번·닉네임 검색").fill("21099");
  await expect(page.getByRole("button", { name: "21099 비밀번호 초기화" })).toBeHidden();
  const details = page.getByRole("button", { name: "21099 상세 보기", exact: true });
  await details.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "21099 비밀번호 초기화" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("게스트 실패는 입력 보존, 중복 요청 차단, 키보드 재시도", async ({ page }) => {
  await page.goto("/login/student");
  await page.getByLabel("학번", { exact: true }).fill("20101");
  await page.getByLabel("비밀번호", { exact: true }).fill("typed-password-123");
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/auth/guest", async (route) => {
    await pending;
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "LOGIN_FAILED", message: "연결을 확인하고 다시 시도해 주세요." }) });
  });
  try {
    await page.getByRole("button", { name: "게스트 학생", exact: true }).click();
    await expect(page.getByRole("button", { name: "게스트 학생", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "게스트 교사", exact: true })).toBeDisabled();
    release();
    await expect(page.locator("#login-error")).toContainText("연결을 확인");
    await expect(page.getByLabel("학번", { exact: true })).toHaveValue("20101");
    await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue("typed-password-123");
    await expect(page.getByRole("button", { name: "게스트 학생", exact: true })).toBeEnabled();
    await page.unroute("**/api/auth/guest");
    await page.getByRole("button", { name: "게스트 학생", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/student$/);
  } finally { release(); }
});

test("게스트 설정 비활성·조회 실패에는 버튼을 표시하지 않음", async ({ page }) => {
  for (const enabled of [false, "failed"] as const) {
    await page.route("**/api/auth/config", async (route) => {
      if (enabled === "failed") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "설정을 읽지 못했어요." }) });
      else {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...await response.json(), guestLoginEnabled: false } });
      }
    });
    for (const role of ["student", "teacher"]) {
      const response = page.waitForResponse("**/api/auth/config");
      await page.goto(`/login/${role}`);
      await response;
      await expect(page.getByRole("button", { name: role === "student" ? "교실 입장" : "Google 계정으로 로그인", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: "게스트 학생", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "게스트 교사", exact: true })).toHaveCount(0);
    }
    await page.unroute("**/api/auth/config");
  }
});
