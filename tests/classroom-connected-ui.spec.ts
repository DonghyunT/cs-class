import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import type { Session, StudentRow, TeacherDashboard } from "../src/lib/classroom/types";
import { localOnly, readyStudent, readyTeacher } from "./emulator";

const lesson = LESSONS.find(item => item.id === "programming-13")!;
const requiredMissions = ["name", "multiply", "move", "keys"];
const todoText = "다음 수업 준비물 확인하기";

function classroomRows(checkedAt: number): StudentRow[] {
  // These students exist only in an HTTP response; no accounts or DB rows are created.
  return Array.from({ length: 27 }, (_, index) => {
    const lastActiveAt = index === 0 ? checkedAt - 30_000 : index === 9 ? checkedAt - 90_000 : index === 18 ? checkedAt - 119_999 : index === 1 ? checkedAt - 120_000 : index === 2 ? checkedAt - 120_001 : null;
    const student = { uid: `connected-ui-${index}`, studentId: `241${String(index + 1).padStart(2, "0")}`, nickname: `검증 학생 ${index + 1}`, mustChangePassword: false, lastActiveAt };
    if (index < 9) return { ...student, work: null };
    const missions = index === 17 ? [...requiredMissions, "average"] : requiredMissions;
    return { ...student, work: { lessonId: lesson.id, revision: 0, updatedAt: checkedAt - 90_000, conceptSolved: lesson.concepts.map(item => item.id), quizSolved: index >= 18 ? lesson.quiz.map(item => item.id) : [], missions: Object.fromEntries(missions.map(id => [id, { submission: { id: `connected-${index}-${id}`, submittedAt: checkedAt - 90_000 } }])), submission: null, edited: false, validated: true } };
  });
}

async function nickname(page: Page, value: string) {
  await page.unroute("**/api/auth/session");
  await page.route("**/api/auth/session", async route => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const data = await response.json() as { session: Session | null };
    await route.fulfill({ response, json: { ...data, session: data.session ? { ...data.session, nickname: value } : null } });
  });
}

async function teacherFixture(page: Page) {
  await localOnly(page.request);
  await readyTeacher(page.request);
  const checkedAt = Date.now();
  // Fixed Date preserves real timers while making the 120-second activity boundary exact.
  await page.clock.setFixedTime(checkedAt);
  const students = classroomRows(checkedAt);
  await page.route("**/api/classroom/teacher?**", async route => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const data = await response.json() as TeacherDashboard;
    await route.fulfill({ response, json: { ...data, selectedLessonId: lesson.id, lessons: LESSONS, classroom: { ...data.classroom, currentLessonId: lesson.id, openedLessonIds: [lesson.id] }, students } });
  });
  await page.route("**/api/classroom/help?**", route => route.fulfill({ status: 200, json: { requests: [] } }));
  await page.route("**/api/classroom/todos", route => route.fulfill({ status: 200, json: { revision: 0, items: [{ id: "connected-readonly-todo", text: todoText, completed: false }] } }));
  await nickname(page, "연결 검증 선생님");
  return checkedAt;
}

test("반 전체 진도는 필수 활동 합산이며 선택 도전·최근 활동과 출석을 구분", async ({ page }) => {
  const checkedAt = await teacherFixture(page);
  await page.goto("/teacher?classId=2-1");
  const current = page.locator('section[aria-labelledby="current-heading"]');
  const overall = current.getByRole("progressbar", { name: "반 전체 필수 활동 완료율", exact: true });
  await expect(page.getByRole("progressbar", { name: "반 전체 필수 활동 완료율", exact: true })).toHaveCount(1);
  await expect(overall).toHaveAttribute("aria-valuenow", "54");
  await expect(overall).toHaveAttribute("aria-valuetext", "필수 활동 189/351개 완료");
  await expect(current.getByText("필수 활동 189/351개 완료", { exact: true })).toBeVisible();
  for (const state of ["not-started", "in-progress", "completed"]) await expect(current.locator(`[data-state="${state}"] b`)).toHaveText("9명");
  await expect(current.getByText("등록 27명 · 최근 2분 활동 3명", { exact: true })).toBeVisible();
  await expect(current.getByText(/출석/)).toHaveCount(0);
  const actions = page.getByRole("region", { name: "교사가 확인할 일", exact: true });
  for (const [stage, completed, percent] of [["개념", 18, "67"], ["퀴즈", 9, "33"], ["실습", 18, "67"]] as const) {
    const bar = actions.getByRole("progressbar", { name: `반 전체 ${stage} 완료 학생`, exact: true });
    await expect(bar).toHaveAttribute("aria-valuenow", percent);
    await expect(bar).toHaveAttribute("aria-valuetext", `전체 학생 27명 중 ${completed}명 완료`);
    await expect(bar.locator("..")).toContainText(`${completed}/27명`);
  }
  const colors = await actions.getByRole("progressbar").locator("i").evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
  expect(new Set(colors).size).toBe(3);
  await expect(actions).toContainText("등록 학생 27명 · 제출 학생 18명 · 저장된 제출 작품 73개");

  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/teacher?**", async route => { await waiting; await route.fallback(); });
  try {
    await page.clock.setFixedTime(checkedAt + 120_001);
    await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "확인 중…" })).toBeVisible();
    await expect(current.getByText("등록 27명 · 최근 2분 활동 3명", { exact: true })).toBeVisible();
    release();
    await expect(current.getByText("등록 27명 · 최근 2분 활동 0명", { exact: true })).toBeVisible();
    await expect(overall).toHaveAttribute("aria-valuenow", "54");
  } finally { release(); }

  const review = LESSONS.find(item => item.mode === "review")!;
  await page.unroute("**/api/classroom/teacher?**");
  await page.route("**/api/classroom/teacher?**", async route => {
    const response = await route.fetch();
    const data = await response.json() as TeacherDashboard;
    await route.fulfill({ response, json: { ...data, selectedLessonId: review.id, lessons: LESSONS, classroom: { ...data.classroom, currentLessonId: review.id, openedLessonIds: [review.id] }, students: classroomRows(checkedAt).map(student => ({ ...student, work: null })) } });
  });
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
  await expect(current.getByText("선택 복습 수업 · 필수 활동 완료율에 포함하지 않아요.", { exact: true })).toBeVisible();
  await expect(actions.getByText("선택 복습 수업 · 필수 활동 완료율에 포함하지 않아요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /반 전체/ })).toHaveCount(0);
});

test("교사 세 화면은 공통 맥락 줄·44px 새로고침과 좁은 현재 수업 원형을 유지", async ({ page }) => {
  await teacherFixture(page);
  for (const path of ["/teacher", "/teacher/classes", "/teacher/students"]) {
    await page.goto(`${path}?classId=2-1`);
    const picker = page.getByRole("combobox", { name: "담당 반", exact: true });
    const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
    await expect(picker).toHaveCount(1);
    await expect(refresh).toHaveCount(1);
    await expect(refresh).toBeEnabled();
    const toolbar = refresh.locator("..").locator("..");
    await expect(toolbar.getByRole("combobox", { name: "담당 반", exact: true })).toHaveCount(1);
    expect(await toolbar.evaluate(element => ({ border: getComputedStyle(element).borderTopWidth, radius: getComputedStyle(element).borderRadius }))).toEqual({ border: "0px", radius: "0px" });
    for (const width of [320, 821, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await refresh.boundingBox();
      expect(bounds?.width).toBe(44); expect(bounds?.height).toBe(44);
      expect((await picker.boundingBox())?.height).toBe(44);
    }
  }
  await page.setViewportSize({ width: 437, height: 900 });
  await page.goto("/teacher?classId=2-1");
  const current = page.locator('section[aria-labelledby="current-heading"]');
  await expect(current.getByRole("progressbar", { name: "반 전체 필수 활동 완료율", exact: true })).toBeVisible();
  expect((await current.boundingBox())!.height).toBeLessThanOrEqual(320);
  const diameter = await current.locator('svg[viewBox="0 0 180 180"]').evaluate(element => {
    const svg = element as SVGSVGElement;
    return svg.getBBox().width * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  });
  expect(diameter).toBeGreaterThan(70);
});

test("닉네임은 상단·하단 프로필에 보이며 새 탐색 메뉴와 설정 진입을 유지", async ({ page }) => {
  await teacherFixture(page);
  for (const role of ["teacher", "student"] as const) {
    if (role === "student") await readyStudent(page.request);
    const value = role === "teacher" ? "연결 검증 선생님" : "차근차근 배우는 학생";
    await nickname(page, value);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${role}${role === "teacher" ? "?classId=2-1" : ""}`);
    const topbar = page.getByRole("banner");
    await expect(topbar.getByText(value, { exact: true })).toBeVisible();
    const profile = page.locator("aside").getByRole("link", { name: new RegExp(value) });
    await expect(profile).toBeVisible();
    await expect(profile).toHaveAttribute("href", role === "teacher" ? "/teacher/settings?classId=2-1" : "/student/settings");
    const menu = page.getByRole("navigation", { name: "교실 메뉴", exact: true });
    await expect(menu.getByRole("link")).toHaveCount(role === "teacher" ? 5 : 4);
    await expect(menu.getByRole("link", { name: "반 일정", exact: true })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "우리 반 질문", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "다가오는 일정", exact: true }).getByRole("link", { name: "전체 보기", exact: true })).toHaveAttribute("href", role === "teacher" ? "/teacher/schedule?classId=2-1" : "/student/schedule");
    await menu.getByRole("link", { name: "설정", exact: true }).press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${role}/settings${role === "teacher" ? "\\?classId=2-1" : ""}$`));
    await expect(menu.getByRole("link", { name: "설정", exact: true })).toHaveAttribute("aria-current", "page");
    for (const width of [320, 821, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 320) {
        await page.getByRole("button", { name: "메뉴 열기", exact: true }).press("Enter");
        await expect(page.getByRole("dialog", { name: "교실 탐색 메뉴", exact: true })).toBeVisible();
        await expect(profile).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeFocused();
      } else await expect(topbar.getByText(value, { exact: true })).toBeVisible();
    }
  }
});

test("할 일 설명은 제목·본문보다 작고 브랜드는 홈 링크와 줄인 모션을 지원", async ({ page }) => {
  await teacherFixture(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/teacher?classId=2-1");
  const todo = page.getByRole("region", { name: "내 할 일", exact: true });
  const subtitle = todo.getByText("개인 체크리스트예요. 체크해도 수업·제출 기록은 바뀌지 않아요.", { exact: true });
  await expect(todo.getByText(todoText, { exact: true })).toBeVisible();
  const font = async (selector: string) => todo.locator(selector).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(await font('p[class*="todoSubtitle"]')).toBeLessThan(await font("h2"));
  expect(await subtitle.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeLessThan(await todo.getByText(todoText, { exact: true }).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize)));
  const brand = page.locator("aside").getByRole("link", { name: "CS Class 홈", exact: true });
  await expect(brand).toHaveAttribute("href", "/");
  const symbol = brand.locator(".brand-symbol");
  const resting = await symbol.evaluate(element => getComputedStyle(element).transform);
  await brand.hover();
  await expect.poll(() => symbol.evaluate(element => getComputedStyle(element).transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.mouse.move(700, 70);
  await brand.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  await expect(brand).toBeFocused();
  await expect.poll(() => symbol.evaluate(element => getComputedStyle(element).transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await brand.hover();
  expect(await symbol.evaluate(element => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(.001);
  expect(await symbol.evaluate(element => getComputedStyle(element).transform)).toBe(resting);
  await brand.press("Enter");
  await expect(page).toHaveURL("http://localhost:3000/");
});
