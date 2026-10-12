import { expect, test, type Page } from "@playwright/test";
import { correctOrder, initialPassword, lessonId, resetStudent, studentPassword } from "./emulator";

const studentId = "20102";
const workPath = `**/api/classroom/work/${lessonId}`;
async function login(page: Page, password: string) {
  await page.goto("/login/student");
  await page.getByLabel("학번", { exact: true }).fill(studentId);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
}
async function enter(page: Page) {
  await login(page, initialPassword);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(studentPassword);
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill(studentPassword);
  await page.getByRole("button", { name: "비밀번호 저장하고 입장" }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { name: "오늘은 무엇을 해볼까요?", exact: true })).toBeVisible();
  await page.goto(`/classroom/${lessonId}?from=dashboard`);
  await expect(page.getByRole("heading", { name: "설명을 읽고 바로 확인해요" })).toBeVisible();
}
async function saved(page: Page) { await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); }

test.beforeEach(async ({ request }) => { await resetStudent(request, studentId); });

test("개념·오답 재도전·순서 실습·제출 후 수정과 재접속", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await enter(page);
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).first().click();
  await expect(page.locator("#concept-feedback-algorithm")).toBeFocused();
  await page.getByRole("button", { name: "다음 개념", exact: true }).click();
  await page.getByRole("radio", { name: "내용을 저장해요", exact: true }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.getByRole("tab", { name: "개념 100%" })).toBeVisible();
  await page.getByRole("button", { name: "퀴즈로 이동" }).click();
  await page.getByRole("radio", { name: "앞으로 3칸 이동한다" }).check();
  await expect(page.getByRole("button", { name: "이번 회차 결과 확인" })).toBeDisabled();
  await page.getByRole("button", { name: "먼저 실습하기" }).click();
  await expect(page.getByRole("tab", { name: "실습 0%" })).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.getByRole("tab", { name: "실습 0%" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await expect(page.locator("#quiz-question-title")).toContainText("입력한 숫자");
  await page.getByRole("navigation", { name: "퀴즈 문항 목록" }).getByRole("button").first().click();
  await expect(page.getByRole("radio", { name: "앞으로 3칸 이동한다" })).toBeChecked();
  await page.getByRole("button", { name: "다음 문제", exact: true }).click();
  await expect(page.getByRole("radio", { name: "숫자 입력 → 숫자 출력", exact: true })).not.toBeChecked();
  await page.getByRole("radio", { name: "숫자 출력 → 숫자 입력", exact: true }).check();
  await page.getByRole("button", { name: "다음 문제", exact: true }).click();
  await page.getByRole("radio", { name: "결과가 달라질 수 있어요" }).check();
  await page.getByRole("button", { name: "이번 회차 결과 확인" }).click();
  await expect(page.getByRole("tab", { name: "퀴즈 67%" })).toBeVisible();
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기" }).click();
  await expect(page.getByRole("radio")).toHaveCount(3);
  await expect(page.locator("#quiz-question-title")).toBeFocused();
  await expect(page.getByText("화면에 보여 줄 값을 먼저 알아야 해요.", { exact: true })).not.toBeVisible();
  await page.getByText("힌트 보기", { exact: true }).click();
  await expect(page.getByText("화면에 보여 줄 값을 먼저 알아야 해요.", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "숫자 입력 → 숫자 출력", exact: true }).check();
  await page.getByRole("button", { name: "이번 회차 결과 확인" }).click();
  await page.getByRole("button", { name: "실습으로 이동" }).click();
  await expect(page.locator("#stage-heading-practice")).toBeFocused();
  // Each next key starts after the previous render and its Effect have moved focus.
  async function moveUp(label: string, positions: number[]) {
    for (const position of positions) {
      await page.getByRole("button", { name: `${label} 위로 이동`, exact: true }).press("Enter");
      await expect(page.getByRole("region", { name: "순서 배열 작업" }).getByRole("listitem").nth(position - 1)).toContainText(label);
      await expect(page.getByRole("button", { name: `${label} ${position === 1 ? "아래" : "위"}로 이동`, exact: true })).toBeFocused();
    }
  }
  await moveUp("시작", [3, 2, 1]);
  await moveUp("이름을 입력받는다", [3, 2]);
  await moveUp("입력한 이름으로 인사말을 만든다", [4, 3]);
  await page.getByRole("button", { name: "순서 검증" }).click();
  await expect(page.getByText("검증 통과 · 아직 제출 전이에요.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "실습 0%" })).toBeVisible();
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("tab", { name: "실습 100%" })).toBeVisible();
  await page.getByRole("button", { name: "시작 아래로 이동", exact: true }).click();
  await expect(page.getByRole("button", { name: "수정한 작품 제출" })).toBeDisabled();
  await expect(page.getByRole("tab", { name: "실습 100%" })).toBeVisible();
  await saved(page);
  const persisted = await (await page.request.get(`/api/classroom/work/${lessonId}`)).json();
  expect(persisted.submission.order).toEqual(correctOrder);
  expect(persisted.draft.practiceOrder.slice(0, 2)).toEqual(["input", "start"]);
  await page.getByRole("button", { name: "학생 메뉴", exact: true }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/student$/);
  await login(page, studentPassword);
  await expect(page.getByRole("heading", { name: "오늘은 무엇을 해볼까요?", exact: true })).toBeVisible();
  await page.goto(`/classroom/${lessonId}?from=dashboard`);
  await expect(page.getByText("제출한 작품이 있어요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "실습 100%" })).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: testInfo.outputPath("practice-desktop.png"), fullPage: true });
  for (const width of [390, 320, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("practice-mobile.png"), fullPage: true });
  await page.getByRole("tab", { name: "실습 100%" }).press("Home");
  await expect(page.getByRole("tab", { name: "개념 100%" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("저장 실패 때 입력과 단계 유지, 재시도 후 이동", async ({ page }) => {
  await enter(page);
  await page.route(workPath, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("서버에 연결하지 못했어요");
  await expect(page.getByRole("tab", { name: "개념 0%" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).toBeChecked();
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/classroom/${lessonId}(\\?from=dashboard)?$`));
  await page.unroute(workPath);
  await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await saved(page);
  // A failure of only the new stage write must keep the old panel too.
  await page.route(workPath, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("서버에 연결하지 못했어요");
  await expect(page.getByRole("tab", { name: "개념 0%" })).toHaveAttribute("aria-selected", "true");
  await page.unroute(workPath);
  await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await expect(page.getByRole("tab", { name: "퀴즈 0%" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
});

test("느린 저장 중 새 입력을 보존하고 이동 전에 최신 답안을 저장", async ({ page }) => {
  await enter(page);
  let release = () => {};
  let entered = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  const captured = new Promise<void>((resolve) => { entered = resolve; });
  let once = true;
  await page.route(workPath, async (route) => {
    if (route.request().method() === "POST" && once) { once = false; entered(); await held; }
    await route.continue();
  });
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  await captured;
  await page.getByRole("radio", { name: "물을 적당히 준비한다" }).check();
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/classroom/${lessonId}(\\?from=dashboard)?$`));
  release();
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { name: "오늘은 무엇을 해볼까요?", exact: true })).toBeVisible();
  await page.goto(`/classroom/${lessonId}?from=dashboard`);
  await expect(page.getByRole("radio", { name: "물을 적당히 준비한다" })).toBeChecked();
  await page.reload();
  await expect(page.getByRole("radio", { name: "물을 적당히 준비한다" })).toBeChecked();
  const persisted = await (await page.request.get(`/api/classroom/work/${lessonId}`)).json();
  expect(persisted.draft.conceptAnswers.algorithm).toBe("vague");
});

test("두 탭 저장 충돌은 현재 입력을 유지하고 명시적으로 해결", async ({ page, context }) => {
  const answerSaved = (target: Page, answer: string) => target.waitForResponse(response =>
    response.url().endsWith(`/api/classroom/work/${lessonId}`) && response.request().method() === "POST" &&
    response.status() === 200 && response.request().postDataJSON().draft?.conceptAnswers?.algorithm === answer);
  await enter(page);
  const other = await context.newPage();
  await other.goto(`/classroom/${lessonId}`);
  await expect(other.getByRole("radio", { name: "물을 적당히 준비한다" })).toBeVisible();
  const firstSave = answerSaved(page, "clear");
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  const firstRecord = await (await firstSave).json();
  expect(firstRecord.draft.conceptAnswers.algorithm).toBe("clear");
  await saved(page);
  await other.getByRole("radio", { name: "물을 적당히 준비한다" }).check();
  await expect(other.getByRole("main").getByRole("alert")).toContainText("저장 기록이 서로 달라요");
  await expect(other.getByRole("radio", { name: "물을 적당히 준비한다" })).toBeChecked();
  await other.getByRole("button", { name: "서버 기록과 비교" }).click();
  await expect(other.getByRole("region", { name: "저장 충돌 비교" })).toContainText("컵에 물을 200mL 따른다");
  const resolvedSave = answerSaved(other, "vague");
  await other.getByRole("button", { name: "현재 입력을 새 버전으로 저장" }).click();
  const resolvedRecord = await (await resolvedSave).json();
  expect(resolvedRecord.draft.conceptAnswers.algorithm).toBe("vague");
  expect(resolvedRecord.revision).toBeGreaterThan(firstRecord.revision);
  await saved(other);
  const newerSave = answerSaved(other, "clear");
  await other.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  const newerRecord = await (await newerSave).json();
  expect(newerRecord.draft.conceptAnswers.algorithm).toBe("clear");
  expect(newerRecord.revision).toBeGreaterThan(resolvedRecord.revision);
  await saved(other);
  await page.getByRole("radio", { name: "물을 적당히 준비한다" }).check();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("저장 기록이 서로 달라요");
  await page.getByRole("button", { name: "서버 기록과 비교" }).click();
  await page.getByRole("button", { name: "서버 기록으로 이어하기" }).click();
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).toBeChecked();
  await saved(page);
  await other.close();
});
