import { expect, test, type Page } from "@playwright/test";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";
import type { Work } from "../src/lib/classroom/types";

// 화면을 검토하는 20102 계정과 분리한 로컬 합성 계정이다.
const studentId = "21001", classId = "2-10", endpoint = "/api/classroom/work/review-sandwich";
const workRef = db.collection("csWork").doc(`student-${studentId}__review-sandwich`);
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async ({ page }) => {
  originalClass = (await db.collection("csClasses").doc(classId).get()).data();
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await db.collection("csClasses").doc(classId).update({ openedLessonIds: ["review-sandwich"], currentLessonId: "review-sandwich" });
  await workRef.delete();
  await page.goto("/classroom/review-sandwich");
  await page.getByRole("tab", { name: /실습/ }).click();
});
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  if (originalClass) await db.collection("csClasses").doc(classId).set(originalClass);
  await workRef.delete();
});

test("단계 왕복에도 명령 대화·실패·확인 질문과 읽던 위치를 유지한다", async ({ page }) => {
  const input = page.getByLabel("자연어 명령"), feed = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  let count = 0;
  for (const command of ["빵 봉지를 열어", "식빵 두 장을 꺼내", "잼 뚜껑을 열어", "칼에 잼을 묻혀"]) {
    await input.fill(command);
    await expect(page.getByRole("button", { name: "실행", exact: true })).toBeEnabled();
    await input.press("Enter");
    await expect(feed.locator("[data-command-id]")).toHaveCount(++count);
    await expect(feed.getByText("명령을 해석하고 있어요. 다음 입력을 작성해도 유지돼요.")).toHaveCount(0);
  }
  await input.fill("알아서 샌드위치를 만들어");
  await expect(page.getByRole("button", { name: "실행", exact: true })).toBeEnabled();
  await input.press("Enter");
  await expect(feed).toContainText("합성 AI 피드백");
  await page.route("**/api/classroom/ai", route => route.fulfill({ status: 503, json: { message: "왕복 검사 AI 실패", code: "UNAVAILABLE" } }));
  await input.fill("식빵에 잼을 발라");
  await expect(page.getByRole("button", { name: "실행", exact: true })).toBeEnabled();
  await input.press("Enter");
  await expect(feed.getByRole("alert")).toContainText("왕복 검사 AI 실패");
  await input.fill("다음에 보낼 작성 중 명령");
  await feed.focus();
  // Home의 늦은 scrollend를 다음 방향키의 완료로 받지 않는다.
  for (const key of ["Home", "ArrowDown"]) {
    await expect(feed).toBeFocused();
    await feed.evaluate(element => {
      element.setAttribute("data-test-scroll-ended", "false");
      element.addEventListener("scrollend", () => element.setAttribute("data-test-scroll-ended", "true"), { once: true });
    });
    await page.keyboard.press(key);
    await expect(feed).toHaveAttribute("data-test-scroll-ended", "true");
    if (key === "Home") await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBe(0);
  }
  await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const readingPosition = await feed.evaluate(element => element.scrollTop);
  expect(readingPosition).toBeGreaterThan(0);
  const records = await feed.locator("[data-command-id]").count();
  await page.getByRole("tab", { name: /^개념/ }).click();
  await expect(feed).toBeHidden();
  await page.getByRole("tab", { name: /^실습/ }).click();
  await expect(feed).toContainText("왕복 검사 AI 실패");
  await expect(feed).toContainText("알아서 샌드위치를 만들어");
  await expect(feed).toContainText("합성 AI 피드백");
  await expect(feed.locator("[data-command-id]")).toHaveCount(records);
  await expect(input).toHaveValue("다음에 보낼 작성 중 명령");
  expect(await feed.evaluate(element => element.scrollTop)).toBeCloseTo(readingPosition, 0);
});

test("Enter 전송은 한글 조합·줄바꿈·응답 대기를 구분하고 실패 때만 대체 실행을 제공", async ({ page }) => {
  const input = page.getByLabel("자연어 명령"), feed = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  await input.fill("빵 봉지를 열어");
  await input.press("Enter");
  await expect(feed.locator('[data-command-id]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "AI 없이 실행", exact: true })).toHaveCount(0);
  await input.fill("식빵 두 장을 꺼내");
  await expect(page.getByRole("button", { name: "실행", exact: true })).toBeEnabled();
  await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", keyCode: 229 });
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("식빵 두 장을 꺼내\n");
  await expect(feed.locator('[data-command-id]')).toHaveCount(1);
  let calls = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/ai", async route => { calls++; await gate; await route.fulfill({ status: 503, json: { message: "합성 AI 연결 실패", code: "UNAVAILABLE" } }); });
  await input.fill("식빵 두 장을 꺼내");
  await input.press("Enter");
  await expect(feed.getByRole("status")).toContainText("해석하고 있어요");
  await input.press("Enter");
  await input.fill("딸기잼 뚜껑을 열어");
  release();
  await expect(feed.getByRole("alert")).toContainText("합성 AI 연결 실패");
  expect(calls).toBe(1);
  await expect(input).toHaveValue("딸기잼 뚜껑을 열어");
  await page.unroute("**/api/classroom/ai");
  await page.getByRole("button", { name: "AI 없이 실행", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(feed.locator('[data-command-id]')).toHaveCount(2);
  await expect(feed.locator('[data-command-id]').last()).toContainText("규칙 해석");
  await expect(feed).toContainText("합성 AI 연결 실패");
});

test("기본 폭에서 시작하고 실행 기록·보조 도구·새 레시피를 관련 영역에 배치", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const layout = page.locator('[data-workspace-wide]').first();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "true");
  const consolePanel = page.getByRole("region", { name: "로봇에게 명령하기" });
  await expect(consolePanel.getByRole("button", { name: "새 레시피", exact: true })).toBeVisible();
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByLabel("자연어 명령").press("Enter");
  await expect(page.getByRole("region", { name: "로봇과의 대화", exact: true }).locator('[data-command-id]')).toHaveCount(1);
  const record = page.getByRole("region", { name: "알고리즘 실행 기록", exact: true });
  const [left, right, bottom] = await Promise.all([page.getByRole("region", { name: "샌드위치 로봇의 주방" }), consolePanel, record].map(item => item.boundingBox()));
  expect(Math.abs(bottom!.x - left!.x)).toBeLessThan(2);
  expect(Math.abs(bottom!.x + bottom!.width - right!.x - right!.width)).toBeLessThan(2);
  await expect(page.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeHidden();
  await record.getByText("기록 도구", { exact: true }).click();
  await expect(record.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeEnabled();
  await record.getByRole("button", { name: "명령 다시 실행", exact: true }).click();
  await expect(record.getByRole("button", { name: "다시 실행 멈추기", exact: true })).toBeVisible();
  await expect(record.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeEnabled();
  await record.getByRole("button", { name: "마지막 명령 되돌리기", exact: true }).click();
  await expect(page.getByLabel("자연어 명령")).toBeFocused();
  await expect(page.getByRole("region", { name: "로봇과의 대화", exact: true }).locator('[data-command-id]')).toHaveCount(0);
  await page.getByLabel("자연어 명령").fill("식빵 두 장을 꺼내");
  await page.getByLabel("자연어 명령").press("Enter");
  await expect(page.getByRole("region", { name: "로봇과의 대화", exact: true }).locator('[data-command-id]')).toHaveCount(1);
  await expect(consolePanel.getByRole("button", { name: "새 레시피", exact: true })).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("practice-wide-controls.png"), fullPage: true });
  await consolePanel.getByRole("button", { name: "새 레시피", exact: true }).click();
  await expect(page.getByLabel("자연어 명령")).toBeFocused();
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "true");
  await expect(consolePanel.getByRole("button", { name: "실행", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("자연어 명령")).toBeVisible();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("practice-default.png"), fullPage: true });
});

test("개념 기준선과 체험 초기화 위치·선택 표현을 맞추고 답안과 완료 기록을 보존", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("tab", { name: /개념/ }).click();
  const nav = page.getByRole("navigation", { name: "개념 목록" }), article = page.locator("#concept-clear");
  const footer = article.getByRole("button", { name: "다음 개념", exact: true }).locator("..");
  const bounds = await Promise.all([nav, article, footer].map(item => item.boundingBox()));
  expect(bounds[0]!.x + bounds[0]!.width).toBeLessThan(bounds[1]!.x);
  expect(Math.abs(bounds[0]!.y - bounds[1]!.y)).toBeLessThan(20);
  expect(Math.abs(bounds[2]!.x - bounds[1]!.x)).toBeLessThan(2);
  expect(Math.abs(bounds[2]!.width - bounds[1]!.width)).toBeLessThan(2);
  const experience = article.locator('[data-concept-experience]');
  const reset = experience.getByRole("button", { name: "체험 초기화", exact: true });
  await expect(reset).toBeVisible();
  const [resetBounds, titleBounds] = await Promise.all([reset, experience.locator("h4").first()].map(item => item.boundingBox()));
  expect(Math.abs(resetBounds!.y - titleBounds!.y)).toBeLessThan(90);
  const choice = experience.getByRole("group", { name: "바르는 면 비교", exact: true }).getByRole("button", { name: /^넓은 면에 골고루 발라/ });
  await choice.click(); await expect(choice).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(article).toContainText("완료");
  // 완료 표시 이후 정답 확인의 Effect가 피드백으로 초점을 옮긴 뒤 다음 조작을 시작한다.
  await expect(article.locator("#concept-feedback-clear")).toBeFocused();
  await reset.click();
  await expect(reset).toBeFocused();
  await expect(experience.locator('[data-jam]')).toHaveCount(0);
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(article).toContainText("완료");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("concept-controls.png"), fullPage: true });
});

test("체험 중지·마지막 단계 뒤 초점을 실행 버튼으로 복구", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button", { name: /알고리즘의 다섯 조건/ }).click();
  const repeatControls = page.getByRole("group", { name: "반복 실행", exact: true });
  const infinite = repeatControls.getByRole("button", { name: /^끝없이 반복/ });
  await infinite.click();
  const stop = repeatControls.getByRole("button", { name: "실행 중지", exact: true });
  await stop.focus(); await stop.press("Enter");
  await expect(infinite).toBeFocused();
  await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button", { name: /순차·선택·반복/ }).click();
  const flowControls = page.getByRole("group", { name: "흐름 실행 조작", exact: true });
  const step = flowControls.getByRole("button", { name: "한 단계 실행", exact: true });
  for (let index = 0; index < 5; index++) { await step.focus(); await step.press("Enter"); }
  await expect(flowControls.getByRole("button", { name: "▶ 흐름 실행", exact: true })).toBeFocused();
});

async function execute(page: Page, input: string) {
  const turns = page.getByRole("region", { name: "로봇과의 대화", exact: true }).locator('[data-command-id]');
  const previous = await turns.count();
  await page.getByLabel("자연어 명령").fill(input);
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText(input);
  await expect(turns).toHaveCount(previous + 1);
  await expect(page.getByRole("button", { name: "새 레시피", exact: true })).toBeEnabled();
}

test("큰 화면의 재료 크기와 주방·대화 배치", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  const consolePanel = page.getByRole("region", { name: "로봇에게 명령하기" });
  const kitchen = page.getByRole("region", { name: "샌드위치 로봇의 주방" });
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1854, height: 717 }]) {
    await page.setViewportSize(viewport);
    await kitchen.scrollIntoViewIfNeeded();
    const [left, right, counter] = await Promise.all([kitchen, consolePanel, kitchen.locator('svg > rect').first()].map(item => item.boundingBox()));
    expect(counter!.width).toBeGreaterThan(900);
    expect(right!.width).toBeGreaterThan(500);
    expect(left!.width / right!.width).toBeGreaterThan(1.8);
    expect(left!.width / right!.width).toBeLessThan(2.2);
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(2);
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
    const executeBounds = await page.getByRole("button", { name: "실행", exact: true }).boundingBox();
    expect(executeBounds!.y + executeBounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: testInfo.outputPath(`practice-${viewport.width}.png`) });
  }
  await execute(page, "식빵 두 장을 꺼내");
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await expect.poll(async () => {
    const work: Work = await (await page.request.get(endpoint)).json();
    return work.draft.reviewProject?.type === "sandwich" ? work.draft.reviewProject.input : "";
  }).toBe("빵 봉지를 열어");
  await expect(page.getByRole("button", { name: "실행", exact: true })).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
  await page.screenshot({ path: testInfo.outputPath("practice-conversation-1854.png") });
});

test("명령과 로봇 응답이 시간순으로 이어지고 읽던 위치·초안을 유지", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await execute(page, "식빵 두 장을 꺼내");
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText("빵 봉지가 닫혀");
  await execute(page, "빵 봉지를 열어");
  const stage = page.getByRole("img", { name: /접시에 빵/ });
  const [stageBounds, clipBounds] = await Promise.all([stage.boundingBox(), stage.locator('[data-part="bag-clip"]').boundingBox()]);
  expect(clipBounds!.y).toBeGreaterThanOrEqual(stageBounds!.y);
  const feed = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  const turns = feed.locator('[data-command-id]');
  await expect(turns).toHaveCount(2);
  await expect(turns.first()).toContainText("식빵 두 장을 꺼내");
  await expect(turns.last()).toContainText("빵 봉지를 열어");
  const input = page.getByLabel("자연어 명령");
  const [feedBounds, inputBounds] = await Promise.all([feed.boundingBox(), input.boundingBox()]);
  expect(inputBounds!.y).toBeGreaterThan(feedBounds!.y + feedBounds!.height);

  // 서버가 서명한 실제 명령으로 충분한 기록을 만든 뒤 복원한다.
  for (let index = 0; index < 8; index++) {
    const work: Work = await (await page.request.get(endpoint)).json();
    expect((await page.request.post("/api/classroom/ai", { headers, data: { lessonId: "review-sandwich", revision: work.revision, task: "sandwich-rules", input: "빵 봉지를 열어", requestId: crypto.randomUUID() } })).status()).toBe(200);
  }
  await page.reload();
  await expect(turns).toHaveCount(10);
  expect((await page.getByRole("region", { name: "로봇에게 명령하기" }).boundingBox())!.height).toBeLessThan(900);
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  await feed.focus();
  // 방향키 애니메이션의 중간 위치를 집중 모드 전환 전 기준으로 저장하지 않는다.
  for (const key of ["Home", "ArrowDown"]) {
    await feed.evaluate(element => {
      element.setAttribute("data-test-scroll-ended", "false");
      element.addEventListener("scrollend", () => element.setAttribute("data-test-scroll-ended", "true"), { once: true });
    });
    await page.keyboard.press(key);
    await expect(feed).toHaveAttribute("data-test-scroll-ended", "true");
    if (key === "Home") await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBe(0);
  }
  await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const readingPosition = await feed.evaluate(element => element.scrollTop);
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
  expect(await feed.evaluate(element => element.scrollTop)).toBeCloseTo(readingPosition, 0);
  await page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true }).click();
  expect(await feed.evaluate(element => element.scrollTop)).toBeCloseTo(readingPosition, 0);
  await feed.focus(); await page.keyboard.press("Home");
  await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBe(0);
  await input.fill("다음에 실행할 명령");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/ai", async route => { await gate; await route.fulfill({ status: 503, json: { message: "합성 연결 실패: 입력을 유지해요.", code: "UNAVAILABLE" } }); });
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(feed.getByRole("status")).toContainText("해석하고 있어요");
  await expect(feed).toContainText("다음에 실행할 명령");
  await input.fill("작성 중인 다음 명령");
  release();
  await expect(feed.getByRole("alert")).toContainText("합성 연결 실패");
  expect(await feed.evaluate(element => element.scrollTop)).toBeLessThan(5);
  await expect(input).toHaveValue("작성 중인 다음 명령");
  await input.focus();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await feed.focus();
  await page.keyboard.press("End");
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  await page.unroute("**/api/classroom/ai");
  await execute(page, "식빵 두 장을 꺼내");
  await expect(feed).toContainText("합성 연결 실패: 입력을 유지해요.");
  await expect(feed).toContainText("다음에 실행할 명령");
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  const commandCount = await turns.count();
  await input.fill("알아서 샌드위치를 만들어");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText("합성 AI 피드백");
  await expect(turns).toHaveCount(commandCount);
  await execute(page, "빵 봉지를 열어");
  await expect(feed).toContainText("합성 AI 피드백");
  await expect(feed).toContainText("알아서 샌드위치를 만들어");
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
  await page.screenshot({ path: testInfo.outputPath("conversation.png") });
  await page.getByRole("button", { name: "새 레시피", exact: true }).click();
  await expect(turns).toHaveCount(0);
  await expect(feed).not.toContainText("합성 연결 실패");
  await expect(feed).not.toContainText("알아서 샌드위치를 만들어");
  await expect(input).toHaveValue("");
  await expect.poll(async () => {
    const work: Work = await (await page.request.get(endpoint)).json();
    return work.draft.reviewProject?.type === "sandwich" ? work.draft.reviewProject.commands.length : -1;
  }).toBe(0);
});
