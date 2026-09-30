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
