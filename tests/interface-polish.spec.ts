import { expect, test } from "@playwright/test";
import { db, lessonId, readyStudent, readyTeacher } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";

test("교사 로그인 방식은 같은 크기·다른 색상이며 비밀번호 입장과 초점 복귀를 지원", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("401")) errors.push(message.text()); });
  await page.goto("/login/teacher");
  const google = page.getByRole("button", { name: "Google 계정으로 로그인", exact: true });
  const passwordLogin = page.getByRole("button", { name: "교사 비밀번호 로그인", exact: true });
  await expect(google).toBeEnabled();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const first = (await google.boundingBox())!;
    const second = (await passwordLogin.boundingBox())!;
    expect(second.width).toBe(first.width);
    expect(second.height).toBe(first.height);
    expect(second.y).toBeGreaterThan(first.y + first.height);
    expect(await passwordLogin.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(await google.evaluate((node) => getComputedStyle(node).backgroundColor));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440 || width === 390) await page.screenshot({ path: `scratch/interface-login-${width}.png`, fullPage: true });
  }
  await passwordLogin.focus();
  await page.keyboard.press("Enter");
  const password = page.getByLabel("비밀번호", { exact: true });
  await expect(password).toBeFocused();
  await password.fill("incorrect-credential");
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(password).toHaveValue("incorrect-credential");
  await page.getByRole("button", { name: "교사 Google 로그인으로 돌아가기" }).click();
  await expect(google).toBeFocused();
  await passwordLogin.click();
  await password.fill(testEnv.CS_TEST_INSTRUCTOR_PASSWORD);
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await password.press("Enter");
  expect((await login).status()).toBe(200);
  await expect(page).toHaveURL(/\/teacher$/);
  await expect(page.getByRole("combobox", { name: "담당 반", exact: true })).toBeVisible();
  const session = (await (await page.request.get("/api/auth/session")).json()).session;
  expect(session.role).toBe("instructor");
  expect(session.classIds).toEqual(["2-10", "2-11"]);
  expect(errors).toEqual([]);
});

test("공통 선택 메뉴의 둥근 팝업·좁은 창·키보드·대화상자 초점과 빈 선택 저장", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-2").set({ id: "2-2", name: "2학년 2반", revision: 0, currentLessonId: null, openedLessonIds: [] });
  await readyTeacher(page.request);
  await page.goto("/teacher/students?classId=2-1");
  const classes = page.getByRole("combobox", { name: "담당 반", exact: true });
  await expect(classes).toHaveText("2학년 1반");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await classes.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveCount(11);
    const popup = page.locator('[data-slot="select-popup"]');
    await expect(popup).toHaveCSS("border-radius", "16px");
    await expect(page.getByRole("option").first()).toHaveCSS("border-radius", "10px");
    await expect(page.getByRole("option", { name: "2학년 1반", exact: true })).toHaveAttribute("aria-selected", "true");
    const box = (await popup.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    if (width === 1440 || width === 390) await page.screenshot({ path: `scratch/interface-select-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await expect(classes).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "2학년 1반", exact: true })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "2학년 1반", exact: true })).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "2학년 2반", exact: true })).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(classes).toHaveText("2학년 2반");
  await expect(page.getByRole("combobox", { name: "확인할 수업", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "확인할 수업", exact: true })).toHaveText("열린 수업이 없어요");
  await page.goto("/teacher/classes?classId=2-1");
  const manage = page.getByRole("button", { name: "수업 관리", exact: true });
  await manage.click();
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  const current = dialog.getByRole("combobox", { name: "이번 수업", exact: true });
  await current.click();
  await expect(page.getByRole("option", { name: "지정하지 않음", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(current).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toHaveAttribute("data-open", "");
  await expect(current).toBeFocused();
  await current.press("ArrowDown");
  await page.getByRole("option", { name: "지정하지 않음", exact: true }).click();
  await expect(current).toHaveText("지정하지 않음");
  await expect(current).toBeFocused();
  await page.screenshot({ path: "scratch/interface-select-dialog-320.png", fullPage: true });
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  const settings = (await db.collection("csClasses").doc("2-1").get()).data()!;
  expect(settings.currentLessonId).toBeNull();
  expect(settings.openedLessonIds).toEqual([lessonId]);
  expect(errors).toEqual([]);
});

test("홈 체험 안내는 화면 안의 조작을 가리키며 화살표 없이 모바일에서도 넘치지 않음", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".landing-story")).toHaveAttribute("data-pinned", "true");
  await page.getByRole("tab", { name: "개념학습", exact: true }).click();
  const footer = page.locator(".lesson-windowfooter");
  await expect(footer).toContainText("화면 안의 버튼을 눌러 보세요");
  await expect(footer.locator("svg")).toHaveCount(0);
  const signal = page.getByRole("button", { name: "비트 신호", exact: true });
  await signal.click();
  await expect(signal).toHaveAttribute("aria-pressed", "false");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) await page.screenshot({ path: "scratch/interface-home-hint.png" });
  }
});
