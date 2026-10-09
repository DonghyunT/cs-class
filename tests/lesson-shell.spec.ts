import { expect, test, type Page } from "@playwright/test";
import { auth, db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";
import { seoulToday } from "../src/lib/classroom/planner";
import { createHash } from "node:crypto";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";

const studentId = "21001", uid = `student-${studentId}`, lesson = "review-sandwich";
const endpoint = `/api/classroom/work/${lesson}`;
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeAll(async () => { originalClass = (await db.doc("csClasses/2-10").get()).data(); });
async function enter(page: Page, from = "lessons") {
  await resetStudent(page.request, studentId);
  await db.doc(`csWork/${uid}__${lesson}`).delete();
  await db.doc("csClasses/2-10").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}${from ? `?from=${encodeURIComponent(from)}` : ""}`);
}
test.afterAll(async () => {
  await db.doc(`csWork/${uid}__${lesson}`).delete();
  await db.doc(`csAccounts/${uid}`).delete();
  await db.doc(`csAiUsage/${uid}`).delete();
  for (const password of [initialPassword, studentPassword]) await db.doc(`csRateLimits/${createHash("sha256").update(`credential:${uid}:${passwordDigest(password)}`).digest("hex")}`).delete();
  if (originalClass) await db.doc("csClasses/2-10").set(originalClass);
  await auth.deleteUser(uid).catch(() => {});
});

test("좁은 창에서 열린 학생 메뉴가 화면 안에 표시", async ({ page }) => {
  await enter(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await page.getByRole("button", { name: "학생 메뉴", exact: true }).click();
    const panel = page.getByRole("button", { name: "로그아웃", exact: true }).locator("..");
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "학생 메뉴", exact: true })).toBeFocused();
  }
});

test("대시보드 일정에서 수업에 들어갔다가 원래 대시보드로 복귀", async ({ page }) => {
  await enter(page);
  const schedule = db.doc("csSchedules/2-10"), original = (await schedule.get()).data();
  try {
    await schedule.set({ revision: 1, items: [{ id: "783b611e-18cf-49a3-a1ae-bc5c172526e3", title: "공통 틀 일정 복귀 검사", date: seoulToday(), lessonId: lesson }] });
    await page.goto("/student");
    const link = page.getByRole("region", { name: "다가오는 일정" }).getByRole("link", { name: /알고리즘 설계/ });
    await expect(link).toHaveAttribute("href", `/classroom/${lesson}?from=dashboard`);
    await link.click();
    await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
    await expect(page).toHaveURL(/\/student$/);
  } finally { if (original) await schedule.set(original); else await schedule.delete(); }
});

test("수업 전용 틀 · 한 제목 · 자유로운 단계와 메뉴 키보드 복귀", async ({ page }) => {
  await enter(page, "dashboard");
  await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toHaveAttribute("href", "/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  const concept = page.getByRole("tab", { name: /^개념/ });
  await expect(concept).toHaveAttribute("aria-selected", "true");
  await concept.press("End");
  await expect(page.getByRole("tab", { name: /^실습/ })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "자연어 명령" })).toBeVisible();
  const menu = page.getByRole("button", { name: "학생 메뉴", exact: true });
  await menu.click();
  await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toHaveAttribute("href", "/student");
});

for (const origin of ["lessons", "", "https://example.com", "dashboard&from=lessons"]) {
  test(`복귀 경로 제한: ${origin || "직접 입장"}`, async ({ page }) => {
    await enter(page, origin);
    const leave = page.getByRole("link", { name: "수업 나가기", exact: true });
    await expect(leave).toHaveAttribute("href", "/student/lessons");
    await leave.click();
    await expect(page).toHaveURL(/\/student\/lessons$/);
  });
}

test("학습 조회 실패에서도 나가기 · 저장 실패는 이동과 로그아웃 보호", async ({ page }) => {
  await enter(page);
  await page.route(`**${endpoint}`, route => route.request().method() === "GET"
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "조회 연결 실패" }) }) : route.continue());
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("조회 연결 실패");
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/lessons$/);
  await page.unrouteAll();
  await page.goto(`/classroom/${lesson}?from=lessons`);
  await page.getByRole("tab", { name: /^실습/ }).click();
  let fail = true;
  await page.route(`**${endpoint}`, route => route.request().method() === "POST" && fail
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "저장 연결 실패" }) }) : route.continue());
  const input = page.getByRole("textbox", { name: "자연어 명령" });
  await input.fill("빵 봉지를 열어");
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page.locator("#work-save-error")).toContainText("저장 연결 실패");
  await expect(input).toHaveValue("빵 봉지를 열어");
  await page.getByRole("button", { name: "학생 메뉴", exact: true }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/classroom\/review-sandwich/);
  await expect(input).toHaveValue("빵 봉지를 열어");
  fail = false;
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await page.getByRole("button", { name: "학생 메뉴", exact: true }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
});

test("낮은 창에서도 큰 조리대 · 첫 안내·입력·실행 · 좁은 창과 초점 보존", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await enter(page);
  await page.getByRole("tab", { name: /^실습/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const kitchen = page.getByRole("region", { name: "샌드위치 로봇의 주방" });
  const counter = await kitchen.locator("svg > rect").first().boundingBox();
  expect(counter!.width).toBeGreaterThan(490);
  const record = await page.getByRole("region", { name: "알고리즘 실행 기록", exact: true }).boundingBox();
  const studio = await page.locator('[data-practice="sandwich"]').boundingBox();
  expect(record!.width).toBeGreaterThan(studio!.width - 2);
  await expect(page.getByLabel("자연어 명령")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "실행", exact: true })).toBeInViewport({ ratio: 1 });
  const welcome = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  expect(await welcome.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await expect(kitchen.getByText("조리대 위에 재료들이 준비되어 있어요. 첫 명령을 내려 보세요!", { exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath("lesson-practice-1280.png") });
  for (const width of [821, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toBeVisible();
  }
  await page.getByLabel("자연어 명령").focus();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByLabel("자연어 명령")).toBeFocused();
  expect(errors).toEqual([]);
});

test("처음 학습을 불러온 뒤에도 상단 초점과 열린 학생 메뉴를 유지", async ({ page }) => {
  await enter(page);
  for (const target of ["leave", "account"]) {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**${endpoint}`, async route => { if (route.request().method() === "GET") await gate; await route.continue(); });
    await page.reload();
    const leave = page.getByRole("link", { name: "수업 나가기", exact: true });
    const logout = page.getByRole("button", { name: "로그아웃", exact: true });
    try {
      await expect(page.getByRole("tab", { name: /^개념/ })).toHaveCount(0);
      if (target === "leave") { await leave.focus(); await expect(leave).toBeFocused(); }
      else { await page.getByRole("button", { name: "학생 메뉴", exact: true }).click(); await expect(logout).toBeFocused(); }
    } finally { release(); }
    await expect(page.getByRole("tab", { name: /^개념/ })).toBeVisible();
    await expect(target === "leave" ? leave : logout).toBeFocused();
    if (target === "account") { await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "학생 메뉴", exact: true })).toBeFocused(); }
    await page.unroute(`**${endpoint}`);
  }
});

test("개념·퀴즈 기록은 실습 시작으로 추정하지 않고 실제 필수 제출 수를 표시", async ({ page }, testInfo) => {
  await enter(page);
  const classRef = db.doc("csClasses/2-10"), previous = (await classRef.get()).data()!;
  const ids = ["sequence-lab", "programming-13"];
  try {
    await classRef.update({ openedLessonIds: ids, currentLessonId: ids[0] });
    for (const id of ids) {
      await db.doc(`csWork/${uid}__${id}`).delete();
      await page.goto(`/classroom/${id}`);
      const practice = page.getByRole("tab", { name: /^실습/ });
      await expect(practice).toBeVisible();
      await page.getByRole("tab", { name: /^퀴즈/ }).click();
      await expect(page.getByRole("tab", { name: /^퀴즈/ })).toHaveAttribute("aria-selected", "true");
      await expect(practice).not.toContainText("진행 중");
      await expect(practice).toContainText(id === "programming-13" ? "0/4개 제출" : "0/1개 제출");
      await page.reload();
      await expect(practice).toContainText(id === "programming-13" ? "0/4개 제출" : "0/1개 제출");
    }
    await page.setViewportSize({ width: 390, height: 720 });
    await expect(page.getByRole("tab", { name: /^실습/ })).toContainText("0/4개 제출");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("practice-submissions-390.png") });
  } finally {
    await classRef.set(previous);
    for (const id of ids) await db.doc(`csWork/${uid}__${id}`).delete();
  }
});
