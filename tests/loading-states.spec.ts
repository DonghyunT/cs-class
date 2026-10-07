import { expect, test } from "@playwright/test";
import { localOnly, readyStudent, readyTeacher } from "./emulator";

test("최초 세션 대기: 접속 안내·홈 이동·로그인 입력 유지", async ({ page }, testInfo) => {
  await localOnly(page.request);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/auth/session", async (route) => { await waiting; await route.continue(); });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/student");
    await expect(page.getByRole("status")).toHaveText("로그인 상태를 확인하고 있어요.");
    await page.getByRole("link", { name: "공개 홈 둘러보기" }).click();
    await expect(page.getByRole("button", { name: "교실 입장", exact: true })).toHaveText("입장 준비 중");
    await page.screenshot({ path: testInfo.outputPath("home-session-loading.png") });
    await page.goto("/login/student");
    await expect(page.getByRole("status")).toContainText("로그인 상태를 확인");
    await page.getByLabel("학번", { exact: true }).fill("20101");
    await expect(page.getByRole("button", { name: "교실 입장", exact: true })).toBeDisabled();
    const checked = page.waitForResponse((response) => response.url().endsWith("/api/auth/session") && response.status() === 200);
    release();
    await checked;
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByLabel("학번", { exact: true })).toHaveValue("20101");
    await expect(page.getByLabel("학번", { exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "교실 입장", exact: true })).toBeEnabled();
  } finally { release(); }
});

for (const role of ["student", "teacher"] as const) {
  test(`${role} 조회 대기: 달력·스켈레톤·초점·좁은 화면·재조회 기록 유지`, async ({ page }, testInfo) => {
    if (role === "student") await readyStudent(page.request);
    else await readyTeacher(page.request);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    let release!: () => void;
    let waiting = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/classroom/**", async (route) => {
      if (route.request().method() === "GET") await waiting;
      await route.continue();
    });
    try {
      await page.goto(`/${role}`);
      await expect(page.getByRole("status").filter({ hasText: "할 일을 불러오고 있어요." })).toBeVisible();
      const skeletons = page.locator('span[class*="skeleton"]');
      await expect(skeletons.first()).toBeVisible();
      const calendar = page.getByRole("table", { name: /일정 달력/ });
      await expect(calendar.locator('[aria-current="date"]')).toBeVisible();
      await expect(calendar).toContainText("일정 확인 전");
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        if (width !== 320) await page.screenshot({ path: testInfo.outputPath(`${role}-loading-${width}.png`), fullPage: true });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await skeletons.first().evaluate((element) => getComputedStyle(element, "::after").animationName)).toBe("none");
      const next = page.getByRole("link", { name: role === "student" ? "수업 전체 보기" : "학생 현황", exact: true });
      await next.focus();
      release();
      await expect(skeletons).toHaveCount(0);
      await expect(next).toBeFocused();
      await expect(calendar).toContainText("일정이 있는 날");
      waiting = new Promise<void>((resolve) => { release = resolve; });
      await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
      await expect(skeletons).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      release();
      await next.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${role}/${role === "student" ? "lessons" : "students"}`));
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test("열린 수업 첫 조회: 스켈레톤·탐색 초점·좁은 화면 유지", async ({ page }, testInfo) => {
  await readyStudent(page.request);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/classroom/student", async (route) => { await waiting; await route.continue(); });
  try {
    await page.goto("/student/lessons");
    const skeletons = page.locator('span[class*="skeleton"]');
    await expect(skeletons.first()).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const shapes = await page.locator('div[class*="lessonLoadingList"] > div').first().locator("span").evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    expect(shapes[2].height).toBeGreaterThan(shapes[0].height * 2);
    expect(shapes[0].width).toBeLessThan(shapes[2].width);
    expect(shapes[3].height).toBeGreaterThanOrEqual(44);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await skeletons.first().evaluate((element) => getComputedStyle(element, "::after").animationName)).toBe("none");
    await page.screenshot({ path: testInfo.outputPath("opened-lessons-loading-320.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    const menu = page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "우리 반 질문", exact: true });
    await menu.focus();
    release();
    await expect(page.getByRole("heading", { name: "순서가 만드는 알고리즘", exact: true })).toBeVisible();
    await expect(skeletons).toHaveCount(0);
    await expect(menu).toBeFocused();
  } finally { release(); }
});

test("열린 수업 새로고침: 진행 표시·기존 기록·실패 후 재시도", async ({ page }) => {
  await readyStudent(page.request);
  let fail = false;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/classroom/student", async (route) => {
    if (fail) { await waiting; await route.fulfill({ status: 503, json: { message: "수업 조회를 다시 시도해 주세요." } }); }
    else await route.continue();
  });
  try {
    await page.goto("/student/lessons");
    const lesson = page.getByRole("heading", { name: "순서가 만드는 알고리즘", exact: true });
    await expect(lesson).toBeVisible();
    fail = true;
    const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
    await refresh.click();
    await expect(page.getByRole("status").filter({ hasText: "수업 기록을 확인하고 있어요." })).toBeVisible();
    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toBeFocused();
    await expect(lesson).toBeVisible();
    await expect(page.locator('span[class*="skeleton"]')).toHaveCount(0);
    release();
    await expect(page.getByRole("alert").filter({ hasText: "마지막으로 확인한 수업" })).toBeVisible();
    await expect(lesson).toBeVisible();
    await expect(refresh).toHaveAttribute("aria-disabled", "false");
    fail = false;
    await refresh.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "마지막으로 확인한 수업" })).toHaveCount(0);
    await expect(refresh).toBeFocused();
  } finally { release(); }
});

test("열린 수업 첫 조회 실패: 스켈레톤 종료·재시도 상태·탐색 가능", async ({ page }) => {
  await readyStudent(page.request);
  let fail = true;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/classroom/student", async (route) => {
    if (fail) await route.fulfill({ status: 503, json: { message: "수업 조회를 다시 시도해 주세요." } });
    else { await waiting; await route.continue(); }
  });
  try {
    await page.goto("/student/lessons");
    await expect(page.getByRole("heading", { name: "수업을 불러오지 못했어요." })).toBeVisible();
    await expect(page.locator('span[class*="skeleton"]')).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "다시 불러오기", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "수업 기록을 확인하고 있어요." })).toBeVisible();
    await page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "우리 반 질문", exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/student\/community$/);
    await expect(page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "우리 반 질문", exact: true })).toHaveAttribute("aria-current", "page");
    release();
    await expect(page.getByRole("heading", { name: "수업을 불러오지 못했어요." })).toHaveCount(0);
  } finally { release(); }
});
