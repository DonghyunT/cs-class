import { test, expect } from "@playwright/test";
import { resetStudent, loginStudent, initialPassword, studentPassword, readyStudent, readyTeacher, localOnly, headers, lessonId, correctOrder, db } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";
import type { Work } from "../src/lib/classroom/types";

test("공개 홈 · 모바일 · 키보드 · 콘솔", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("정보 수업을 위한온라인 교실");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 바로가기" })).toBeFocused();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await page.getByRole("dialog").getByRole("link", { name: "학생으로 입장" }).click();
  await expect(page.getByLabel("학번", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "교실 입장", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

for (const role of ["student", "teacher", "instructor"] as const) {
  test(`${role} 로그인 후 홈 입장은 선택창 없이 대시보드로 이동`, async ({ page }) => {
    if (role === "student") await readyStudent(page.request);
    else if (role === "teacher") await readyTeacher(page.request);
    else {
      await localOnly(page.request);
      expect((await page.request.post("/api/auth/login", { headers, data: { role, studentId: "", password: testEnv.CS_TEST_INSTRUCTOR_PASSWORD } })).status()).toBe(200);
    }

    const destination = role === "student" ? "/student" : "/teacher";
    await page.goto("/");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const entry = page.getByRole("link", { name: "교실 입장", exact: true });
      await expect(entry).toHaveAttribute("href", destination);
      await entry.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(`http://localhost:3000${destination}`);
      await expect(page.getByRole("dialog")).toBeHidden();
      if (role === "student") await expect(page.getByRole("heading", { name: "수업을 이어가 볼까요?" })).toBeVisible();
      else await expect(page.getByRole("combobox", { name: "담당 반" })).toBeVisible();
      if (width === 1440) await page.getByRole("link", { name: "CS Class 홈", exact: true }).click();
      else await page.goto("/");
      await expect(page).toHaveURL("http://localhost:3000/");
    }
    await page.reload();
    await expect(page.getByRole("link", { name: "교실 입장", exact: true })).toHaveAttribute("href", destination);
  });
}

test("비밀번호 변경 전 홈 입장은 변경 화면으로 연결", async ({ page }) => {
  await resetStudent(page.request);
  expect((await loginStudent(page.request)).status()).toBe(200);
  await page.goto("/");
  await page.getByRole("link", { name: "교실 입장", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  await expect(page.getByRole("heading", { name: "나만의 비밀번호를 만들어요" })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await page.request.get("/api/classroom/student")).status()).toBe(403);
});

test("세션 확인 중에는 역할 선택을 보류하고 확인 후 내 교실로 연결", async ({ page }) => {
  await readyStudent(page.request);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/auth/session", async (route) => { await pending; await route.continue(); });
  try {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "교실 입장", exact: true })).toBeDisabled();
    await expect(page.getByRole("dialog")).toBeHidden();
    release();
    await page.getByRole("link", { name: "교실 입장", exact: true }).click();
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  } finally { release(); }
});

test("첫 로그인 비밀번호 변경 · 새로고침 유지 · 세션 쿠키 · 로그아웃", async ({ page }) => {
  await resetStudent(page.request);
  await page.goto("/login/student");
  await page.getByLabel("학번", { exact: true }).fill("20101");
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText("확인");
  await page.getByLabel("비밀번호", { exact: true }).fill(initialPassword);
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "나만의 비밀번호를 만들어요" })).toBeVisible();
  await page.getByLabel("새 비밀번호", { exact: true }).fill("letters");
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill("letters");
  await page.getByRole("button", { name: "비밀번호 저장하고 입장" }).click();
  await expect(page.locator("#login-error")).toContainText("영문과 숫자");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(studentPassword);
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill(studentPassword);
  await page.getByRole("button", { name: "비밀번호 저장하고 입장" }).click();
  await expect(page).toHaveURL("http://localhost:3000/student");
  await page.reload();
  await expect(page.getByRole("heading", { name: "수업을 이어가 볼까요?" })).toBeVisible();
  const cookie = (await page.context().cookies()).find((value) => value.name === "cs_session");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict", expires: -1 });
  if (process.env.CI) expect(cookie?.secure).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes("cs_session"))).toBeFalsy();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  expect((await (await page.request.get("/api/auth/session")).json()).session).toBeNull();
});

test("교사 실제 기록 · 제출 작품 · 수업 지정 · 초기화 · 작은 화면", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await readyStudent(page.request);
  const endpoint = `/api/classroom/work/${lessonId}`;
  let work: Work = await (await page.request.get(endpoint)).json();
  work.draft.practiceOrder = correctOrder;
  work = await (await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).json();
  for (const type of ["validate-practice", "submit-practice"]) work = await (await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type } } })).json();
  await readyTeacher(page.request);
  await page.goto("/teacher");
  await expect(page.getByRole("combobox", { name: "담당 반" }).getByRole("option")).toHaveCount(11);
  await page.getByLabel("학번 검색").fill("20101");
  await page.getByRole("button", { name: "20101 제출 작품 보기" }).click();
  await expect(page.getByRole("dialog")).toContainText("20101 학생의 제출 작품");
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "수업 관리", exact: true }).click();
  await page.getByRole("combobox", { name: "이번 수업", exact: true }).selectOption("");
  await page.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(page.getByText("2학년 1반 수업 설정을 저장했어요.")).toBeVisible();
  expect((await db.collection("csClasses").doc("2-1").get()).data()!.openedLessonIds).toEqual([lessonId]);
  await page.getByRole("button", { name: "20101 비밀번호 초기화" }).click();
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "취소", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByRole("button", { name: "20101 비밀번호 초기화" })).toBeFocused();
  await page.getByRole("button", { name: "20101 비밀번호 초기화" }).click();
  await page.getByRole("button", { name: "초기화하기", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByText("20101 학생의 비밀번호를 초기화했어요. 다음 입장 시 변경이 필요해요.")).toBeVisible();
  expect((await db.collection("csWork").doc(`student-20101__${lessonId}`).get()).data()!.submission.id).toBe(work.submission!.id);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.screenshot({ path: "test-results/teacher-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/teacher-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(page.getByRole("button", { name: "메뉴 닫기", exact: true }).first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  expect(errors).toEqual([]);
});
