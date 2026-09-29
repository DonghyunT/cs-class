import { expect, test, type Page } from "@playwright/test";
import { db, headers, initialPassword, lessonId, loginStudent, readyStudent, resetStudent, studentPassword } from "./emulator";

const studentId = "20102";
const workPath = `/api/classroom/work/${lessonId}`;
const classPath = `/classroom/${lessonId}`;
const answerName = "컵에 물을 200mL 따른다";

test("태블릿 메뉴와 양방향 화면 전환의 초점 복귀", async ({ page }) => {
  await readyStudent(page.request);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/student");
  const toggle = page.getByRole("button", { name: "메뉴 열기", exact: true });
  const menu = page.getByRole("dialog", { name: "교실 탐색 메뉴" });
  await toggle.click();
  await expect(menu.getByRole("button", { name: "메뉴 닫기", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(menu).toHaveCount(0);
  await expect(toggle).toBeHidden();
  await expect(page.getByRole("link", { name: "대시보드", exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(toggle).toBeFocused();
  for (const width of [821, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("link", { name: "대시보드", exact: true }).focus();
    await page.setViewportSize({ width: 820, height: 900 });
    await expect(toggle).toBeFocused();
  }
  const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
  await refresh.focus();
  await page.setViewportSize({ width: 821, height: 900 });
  await expect(refresh).toBeFocused();
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(refresh).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole("link", { name: "대시보드", exact: true }).focus();
  await page.getByRole("contentinfo").click();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

async function openLesson(page: Page) {
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await page.goto("/student");
  await page.getByRole("button", { name: "수업 시작", exact: true }).first().click();
  await expect(page.getByRole("radio", { name: answerName })).toBeVisible();
}

async function back(page: Page) { await page.evaluate(() => history.back()); }
async function forward(page: Page) { await page.evaluate(() => history.forward()); }
async function savedAnswer() {
  return (await db.collection("csWork").doc(`student-${studentId}__${lessonId}`).get()).data()?.draft.conceptAnswers.algorithm;
}

test("뒤로가기 저장 실패는 원래 수업 유지 · 재시도 후 이동과 로그아웃 기록 보존", async ({ page }) => {
  await openLesson(page);
  const historyLength = await page.evaluate(() => history.length);
  let fail = true;
  await page.route(`**${workPath}`, (route) => route.request().method() === "POST" && fail
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "TEST_FAILURE", message: "저장 연결 확인이 필요해요." }) })
    : route.continue());
  await page.getByRole("radio", { name: answerName }).check();
  await back(page);
  await expect(page.locator("main").getByRole("alert")).toContainText("저장 연결 확인");
  await expect(page).toHaveURL(new RegExp(`${classPath}$`));
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(await savedAnswer()).toBeUndefined();
  fail = false;
  await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await expect.poll(savedAnswer).toBe("clear");
  await back(page);
  await expect(page).toHaveURL(/\/student$/);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  expect(await savedAnswer()).toBe("clear");
  expect((await loginStudent(page.request, studentPassword, studentId)).status()).toBe(200);
  await page.goto(classPath);
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
});

test("저장 응답 대기 중 뒤로가기 · 한 번 저장 후 원래 목적지 이동 · 이력 유지", async ({ page }) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.defineProperty(window, "navigationTestEvents", { value: events });
    window.addEventListener("popstate", () => events.push(location.pathname), true);
  });
  await openLesson(page);
  const historyLength = await page.evaluate(() => history.length);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let postCount = 0;
  await page.route(`**${workPath}`, async (route) => {
    if (route.request().method() === "POST") { postCount += 1; await gate; }
    await route.continue();
  });
  await page.getByRole("radio", { name: answerName }).check();
  await expect.poll(() => postCount).toBe(1);
  await back(page);
  const observedPops = () => page.evaluate(() => (window as unknown as { navigationTestEvents: string[] }).navigationTestEvents);
  await expect.poll(observedPops).toEqual(["/student", classPath]);
  await expect(page).toHaveURL(new RegExp(`${classPath}$`));
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
  // Another press while the same save is pending must not escape the editor.
  await back(page);
  await expect.poll(observedPops).toEqual(["/student", classPath, "/student", classPath]);
  release();
  await expect(page).toHaveURL(/\/student$/);
  expect(postCount).toBe(1);
  expect(await savedAnswer()).toBe("clear");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  for (let index = 0; index < 3; index += 1) {
    await forward(page);
    await expect(page).toHaveURL(new RegExp(`${classPath}$`));
    await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
    expect(await page.evaluate(() => Boolean(history.state?.__NA && history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE))).toBe(true);
    await back(page);
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole("heading", { name: "수업을 이어가 볼까요?" })).toBeVisible();
  }
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test("앞으로가기의 새 답안도 저장 · Next 이력 상태와 추가 state 보존", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLesson(page);
  await page.getByRole("link", { name: "대시보드로", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  await back(page);
  await expect(page.getByRole("radio", { name: answerName })).toBeVisible();
  await page.evaluate(() => history.replaceState({ ...history.state, otherToolState: "retained" }, ""));
  const historyLength = await page.evaluate(() => history.length);
  await page.getByRole("radio", { name: answerName }).check();
  await forward(page);
  await expect(page).toHaveURL(/\/student$/);
  expect(await savedAnswer()).toBe("clear");
  await back(page);
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
  expect(await page.evaluate(() => ({ next: Boolean(history.state?.__NA && history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE), other: history.state?.otherToolState }))).toEqual({ next: true, other: "retained" });
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(errors).toEqual([]);
});

test("여러 항목을 건너뛰는 이력 이동도 저장하고 기존 앞뒤 경로 유지", async ({ page }) => {
  await openLesson(page);
  await page.getByRole("link", { name: "대시보드로", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  await page.getByRole("button", { name: "수업 시작", exact: true }).first().click();
  await expect(page.getByRole("radio", { name: answerName })).toBeVisible();
  const historyLength = await page.evaluate(() => history.length);
  await page.getByRole("radio", { name: answerName }).check();
  await page.evaluate(() => history.go(-3));
  await expect(page).toHaveURL(/\/student$/);
  await expect.poll(savedAnswer).toBe("clear");
  await forward(page);
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
  await forward(page);
  await expect(page).toHaveURL(/\/student$/);
  await forward(page);
  await expect(page.getByRole("radio", { name: answerName })).toBeChecked();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});
