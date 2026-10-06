import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import { REVIEW_LESSONS } from "../src/lib/classroom/review/lessons";

const studentId = "20102", uid = `student-${studentId}`;
const lessonIds = ["review-sandwich", "review-abstraction", "review-flowchart", "programming-13", "entry-bot-lab"];
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async () => {
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
  for (const id of [...lessonIds, "sequence-lab"]) await db.collection("csWork").doc(`${uid}__${id}`).delete();
});

async function prepare(page: Page, id = "review-sandwich") {
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [...new Set([...lessonIds, id])], currentLessonId: id });
  await db.collection("csWork").doc(`${uid}__${id}`).delete();
  await page.goto(`/classroom/${id}`);
  await expect(page.getByRole("tab", { name: /개념/ })).toBeVisible();
  return `/api/classroom/work/${id}`;
}
async function savedWork(page: Page, endpoint: string): Promise<Work> { return (await page.request.get(endpoint)).json(); }
async function action(page: Page, endpoint: string, value: object) {
  const work = await savedWork(page, endpoint);
  const response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: value } });
  expect(response.status()).toBe(200);
  return response.json() as Promise<Work>;
}

test("representative-flow: demo 대표 수업의 답안·작품과 단계 왕복·재접속", async ({ page }, testInfo) => {
  const endpoint = await prepare(page);
  const work = await savedWork(page, endpoint);
  const response = await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, conceptAnswers: { clear: "0" } } } });
  expect(response.status()).toBe(200);
  await page.reload();
  await expect(page.locator("#concept-clear")).toBeVisible();
  for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(size);
    await page.screenshot({ path: testInfo.outputPath(`concept-${size.width}.png`) });
  }
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.locator("#panel-quiz article").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("quiz-1280.png") });
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.getByLabel("자연어 명령")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("practice-1280.png") });
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.reload();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
  expect((await savedWork(page, endpoint)).draft.conceptAnswers.clear).toBe("0");
});

test("concept-nav: 한 개념·자유 이동·순서 밖 완료와 단계 왕복 위치", async ({ page }) => {
  const endpoint = await prepare(page);
  const work = await savedWork(page, endpoint);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, conceptAnswers: { clear: "0", structure: "0" } } } })).status()).toBe(200);
  await action(page, endpoint, { type: "check-concept", conceptId: "clear" });
  await action(page, endpoint, { type: "check-concept", conceptId: "structure" });
  await page.reload();
  await expect(page.locator("#panel-concept article")).toHaveCount(1);
  await expect(page.locator("#concept-finite")).toBeVisible();
  await page.getByRole("button", { name: /순차·선택·반복/ }).click();
  await expect(page.locator("#concept-structure")).toBeVisible();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await page.getByRole("tab", { name: /개념/ }).click();
  await expect(page.locator("#concept-structure")).toBeVisible();
  await page.getByRole("button", { name: /알고리즘의 다섯 조건/ }).click();
  await page.getByRole("radio", { name: "유한성", exact: true }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#concept-feedback-finite")).toBeFocused();
  await expect(page.locator("#concept-finite")).toBeVisible();
  await page.reload();
  await expect(page.locator("#concept-clear")).toBeVisible();
  expect((await savedWork(page, endpoint)).conceptSolved.sort()).toEqual(["clear", "finite", "structure"]);
});

test("concept-nav: 연결된 수업과 공개 프로토타입의 개념 진입", async ({ page }) => {
  for (const id of lessonIds.slice(0, 4)) {
    await prepare(page, id);
    const nav = page.getByRole("navigation", { name: "개념 목록" });
    await nav.getByRole("button").nth(1).click();
    const title = await page.locator(id === "programming-13" ? "#concept-title" : "#panel-concept article h3").first().textContent();
    await page.getByRole("tab", { name: /퀴즈/ }).click();
    await page.getByRole("tab", { name: /개념/ }).click();
    await expect(page.locator(id === "programming-13" ? "#concept-title" : "#panel-concept article h3").first()).toHaveText(title!);
  }
  await page.goto("/prototype/programming");
  await expect(page.getByRole("navigation", { name: "개념 목록" })).toBeVisible();
});

test("algorithm-scene: 그림의 도포 면과 로봇 해석 예시", async ({ page }) => {
  await prepare(page);
  const scene = page.getByRole("img", { name: "잼을 바르는 면 비교" });
  await page.getByRole("button", { name: "잼을 발라", exact: true }).click();
  await expect(scene.locator('[data-jam="edge"]')).toBeVisible();
  await expect(page.getByText(/이 체험 로봇의 해석 예시/)).toBeVisible();
  await page.getByRole("button", { name: "넓은 면에 골고루 발라", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(scene.locator('[data-jam="flat"]')).toBeVisible();
  await expect(scene.locator('[data-jam="edge"]')).toHaveCount(0);
  await page.getByRole("button", { name: "체험 초기화", exact: true }).click();
  await expect(scene.locator("[data-jam]")).toHaveCount(0);
});

test("algorithm-scene: 3회 자동 종료·외부 중지·움직임 줄이기", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: /알고리즘의 다섯 조건/ }).click();
  await page.getByRole("button", { name: "3번만 반복", exact: true }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("3회 · 자동 종료");
  await page.getByRole("button", { name: "끝없이 반복", exact: true }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("실행 중");
  await page.getByRole("button", { name: "실행 중지", exact: true }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("외부에서 중지");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "3번만 반복", exact: true }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("3회 · 자동 종료");
  await page.getByRole("button", { name: "입력", exact: true }).click();
  await expect(page.getByRole("region", { name: "알고리즘 개념 체험" }).getByText(/입력은 없을 수도/)).toBeVisible();
});

test("algorithm-scene: 조건·횟수와 표현 전환의 실제 경로", async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /순차·선택·반복/ }).click();
  await page.getByRole("button", { name: "선택", exact: true }).click();
  await page.getByRole("button", { name: "우유 없음", exact: true }).click();
  await page.getByRole("button", { name: "흐름 실행", exact: true }).click();
  const path = page.getByRole("list", { name: "이번 실행 경로" });
  await expect(path).toContainText("물 넣기");
  await expect(path).not.toContainText("우유 넣기");
  for (const representation of ["순서도", "의사 코드", "자연어"]) {
    await page.getByRole("button", { name: representation, exact: true }).click();
    await expect(path).toContainText("물 넣기");
    if (representation === "순서도") {
      const diagram = page.getByRole("img", { name: "선택한 알고리즘의 순서도" });
      await expect(diagram.getByText("우유 넣기", { exact: true })).toBeVisible();
      await expect(diagram.getByText("물 넣기", { exact: true })).toBeVisible();
      await expect(diagram.getByText("예", { exact: true })).toBeVisible();
      await expect(diagram.getByText("아니오", { exact: true })).toBeVisible();
      await expect(diagram.locator('[data-branch="water"]')).toHaveAttribute("data-selected", "true");
      await page.getByRole("button", { name: "우유 있음", exact: true }).click();
      await expect(diagram.locator('[data-branch="milk"]')).toHaveAttribute("data-selected", "true");
      await expect(diagram.locator('[data-branch="water"]')).toHaveAttribute("data-selected", "false");
      await page.getByRole("button", { name: "흐름 실행", exact: true }).click();
      await expect(path).toContainText("우유 넣기");
      await expect(path).not.toContainText("물 넣기");
      await page.getByRole("button", { name: "우유 없음", exact: true }).click();
      await page.getByRole("button", { name: "흐름 실행", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "반복", exact: true }).click();
  await page.getByRole("button", { name: "3회", exact: true }).click();
  await page.getByRole("button", { name: "흐름 실행", exact: true }).click();
  await expect(path.getByText("젓기", { exact: true })).toHaveCount(3);
});

test("quiz-nav: 단일 문항·미답변 이동·채점·오답만 재도전·위치 보존", async ({ page }) => {
  const endpoint = await prepare(page);
  const questions = REVIEW_LESSONS.find(lesson => lesson.id === "review-sandwich")!.quiz;
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.locator("#panel-quiz article")).toHaveCount(1);
  const nav = page.getByRole("navigation", { name: "퀴즈 문항 목록" });
  await nav.getByRole("button").last().click();
  await page.getByRole("button", { name: "답하지 않은 문제로 이동", exact: true }).click();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions[0].prompt);
  for (let i = 0; i < questions.length; i++) {
    await nav.getByRole("button").nth(i).click();
    await page.getByRole("radio").first().check();
  }
  await expect.poll(async () => Object.keys((await savedWork(page, endpoint)).draft.quizAnswers).length).toBe(questions.length);
  const before = await savedWork(page, endpoint);
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  await page.getByRole("button", { name: "이번 문제 결과 확인", exact: true }).click();
  await expect(page.locator("#quiz-round-result")).toBeFocused();
  const graded = await savedWork(page, endpoint);
  expect(graded.draft.quizAnswers).toEqual(before.draft.quizAnswers);
  const wrong = graded.quizRoundIds.filter(id => !graded.quizSolved.includes(id));
  expect(wrong.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.find(q => q.id === wrong[0])!.prompt);
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기", exact: true }).click();
  await expect(page.locator("#quiz-question-title")).toBeFocused();
  expect((await savedWork(page, endpoint)).quizRoundIds).toEqual(wrong);
});

test("quiz-nav: 채점·재도전 실패는 답안과 현재 문항을 보존", async ({ page }) => {
  const endpoint = await prepare(page);
  const questions = REVIEW_LESSONS.find(lesson => lesson.id === "review-sandwich")!.quiz;
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  const nav = page.getByRole("navigation", { name: "퀴즈 문항 목록" });
  for (let i = 0; i < questions.length; i++) { await nav.getByRole("button").nth(i).click(); await page.getByRole("radio").first().check(); }
  await page.route(`${endpoint}/action`, route => route.fulfill({ status: 503, json: { error: "잠시 저장할 수 없어요. 현재 답을 유지하고 다시 시도해 주세요." } }));
  await page.getByRole("button", { name: "이번 문제 결과 확인", exact: true }).click();
  await expect(page.locator("#work-save-error")).toBeVisible();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  await expect(page.getByRole("radio").first()).toBeChecked();
  expect((await savedWork(page, endpoint)).quizRoundGraded).toBe(false);
  await page.unroute(`${endpoint}/action`);
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await page.getByRole("button", { name: "이번 문제 결과 확인", exact: true }).click();
  await expect(page.locator("#quiz-round-result")).toBeFocused();
  const graded = await savedWork(page, endpoint);
  await page.route(`${endpoint}/action`, route => route.fulfill({ status: 503, json: { error: "재도전 회차를 저장하지 못했어요." } }));
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기", exact: true }).click();
  await expect(page.locator("#work-save-error")).toBeVisible();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  expect((await savedWork(page, endpoint)).quizRound).toBe(graded.quizRound);
});

test("reading-layout: 실제 개념·퀴즈 화면 크기와 키보드·가로 넘침", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page);
  await mkdir("scratch/readability-20261006/after", { recursive: true });
  const metrics: unknown[] = [];
  for (const width of [1440, 1920, 1280, 821, 820, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : width === 1280 ? 720 : 900 });
    for (let i = 0; i < 3; i++) {
      await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button").nth(i).click();
      await expect(page.locator("#panel-concept article h3")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#panel-concept button:focus, #panel-concept input:focus, #panel-concept summary:focus")).toHaveCount(1);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `scratch/readability-20261006/after/concept-${i}-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      metrics.push(await page.locator("#panel-concept article").evaluate((article, width) => ({ width, text: getComputedStyle(article.querySelector("p")!).fontSize, line: getComputedStyle(article.querySelector("p")!).lineHeight, example: getComputedStyle(article.querySelector('[class*="example"]')!).backgroundColor, labels: [...article.querySelectorAll("button")].map(button => ({ text: button.textContent, height: button.getBoundingClientRect().height, width: button.getBoundingClientRect().width })) }), width));
    }
    await page.getByRole("tab", { name: /퀴즈/ }).click();
    await expect(page.locator("#quiz-question-title")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `scratch/readability-20261006/after/quiz-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("tab", { name: /개념/ }).click();
  }
  await writeFile("scratch/readability-20261006/after/reading-metrics.json", JSON.stringify(metrics, null, 2));
  expect(errors).toEqual([]);
});

test("workspace-width: 기본 폭·수동 확대·단계 저장 실패·재접속", async ({ page }) => {
  await prepare(page);
  const layout = page.locator('[data-workspace-wide]').first();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByRole("tab", { name: /실습/ })).toBeFocused();
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  const restore = page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true });
  await restore.click();
  const expand = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
  await expect(expand).toBeFocused();
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByLabel("자연어 명령")).toHaveValue("빵 봉지를 열어");
  await expand.click();
  for (const width of [821, 820, 821]) { await page.setViewportSize({ width, height: 900 }); await expect(page.getByLabel("자연어 명령")).toHaveValue("빵 봉지를 열어"); }
  await page.getByLabel("자연어 명령").focus(); await page.keyboard.press("Escape");
  await expect(layout).toHaveAttribute("data-workspace-wide", "true");
  await restore.focus(); await page.keyboard.press("Escape");
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(expand).toBeFocused();
  await page.reload();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByLabel("자연어 명령")).toHaveValue("빵 봉지를 열어");
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.route("**/api/classroom/work/review-sandwich", async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, json: { error: "단계를 저장하지 못했어요." } }); else await route.continue();
  });
  await page.getByRole("radio").first().check();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.locator("#work-save-error")).toBeVisible();
  await expect(page.getByRole("tab", { name: /개념/ })).toHaveAttribute("aria-selected", "true");
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
});

test("workspace-width: 연결된 네 수업의 기본 폭과 수동 선택", async ({ page }) => {
  test.setTimeout(120_000);
  for (const id of lessonIds.slice(0, 4)) {
    await prepare(page, id);
    await page.getByRole("tab", { name: /실습/ }).click();
    await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "false");
    await expect(page.getByRole("tab", { name: /실습/ })).toBeFocused();
    await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
    await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click();
    await page.getByRole("tab", { name: /개념/ }).click();
    await page.getByRole("tab", { name: /실습/ }).click();
    await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "false");
  }
});

test("workspace-width: 기본 폭에서 탐색 초점 유지와 순서 배열의 기본 폭", async ({ page }) => {
  const endpoint = await prepare(page);
  const work = await savedWork(page, endpoint);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice" } } })).status()).toBe(200);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}`, async route => { if (route.request().method() === "GET") await gate; await route.continue(); });
  await page.reload();
  const sidebarLink = page.getByRole("link", { name: "수업 나가기", exact: true });
  await sidebarLink.focus(); await expect(sidebarLink).toBeFocused();
  release();
  await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "false");
  await expect(sidebarLink).toBeFocused();
  await page.unroute(`**${endpoint}`);
  await prepare(page, "sequence-lab");
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByRole("navigation", { name: "교실 메뉴" })).toHaveCount(0);
  await db.collection("csWork").doc(`${uid}__sequence-lab`).delete();
});

test("sandwich-layout: 낮은 창의 초기 입력·실행·결과와 실제 기록", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const endpoint = await prepare(page);
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const input = page.getByLabel("자연어 명령"), execute = page.getByRole("button", { name: "실행", exact: true });
  const caption = page.getByText("조리대 위에 재료들이 준비되어 있어요. 첫 명령을 내려 보세요!", { exact: true });
  const initialBounds = await Promise.all([input, execute, caption].map(target => target.boundingBox()));
  await writeFile("scratch/readability-20261006/after/practice-initial-bounds.json", JSON.stringify(initialBounds));
  for (const rect of initialBounds) {
    expect(rect).not.toBeNull(); expect(rect!.y).toBeGreaterThanOrEqual(0); expect(rect!.y + rect!.height).toBeLessThanOrEqual(720);
  }
  const conversation = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  const [feedBounds, welcomeBounds] = await Promise.all([conversation.boundingBox(), conversation.getByText(/재료 준비가 끝났어요!/).boundingBox()]);
  expect(welcomeBounds!.y).toBeGreaterThanOrEqual(feedBounds!.y);
  expect(welcomeBounds!.y + welcomeBounds!.height).toBeLessThanOrEqual(feedBounds!.y + feedBounds!.height);
  await page.screenshot({ path: "scratch/readability-20261006/after/practice-1280.png" });
  await expect(page.getByRole("region", { name: "이전 명령 기록" })).toHaveCount(0);
  await input.fill("빵 봉지를 열어"); await page.getByRole("button", { name: "실행", exact: true }).click();
  const latest = page.getByRole("region", { name: "최신 명령 결과" });
  await expect(latest).toContainText("빵 봉지를 열어");
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
  await page.getByRole("region", { name: "알고리즘 실행 기록", exact: true }).getByText("기록 도구", { exact: true }).click();
  await expect(page.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeEnabled();
  await input.fill("식빵 두 장을 꺼내"); await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(latest).toContainText("식빵 두 장을 꺼내");
  await expect(page.getByRole("region", { name: "이전 명령 기록" })).toContainText("빵 봉지를 열어");
  await page.getByRole("button", { name: "명령 다시 실행", exact: true }).waitFor();
  await page.getByRole("button", { name: "마지막 명령 되돌리기", exact: true }).click();
  await expect(latest).toContainText("빵 봉지를 열어");
  await expect.poll(async () => (await savedWork(page, endpoint)).draft.reviewProject?.type === "sandwich" && ((await savedWork(page, endpoint)).draft.reviewProject as { commands: unknown[] }).commands.length).toBe(1);
  await page.reload();
  await expect(latest).toContainText("빵 봉지를 열어");
});

test("sandwich-layout: AI 대기 중 다음 입력·긴 오류·실행 중 폭 전환", async ({ page }) => {
  await prepare(page);
  await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const message = "현재 명령을 해석하지 못했어요. 입력은 유지되어 있으니 한 동작씩 구체적으로 작성해 다시 실행해 주세요. ".repeat(12);
  await page.route("**/api/classroom/ai", async route => { await gate; await route.fulfill({ status: 503, json: { message, code: "UNAVAILABLE" } }); });
  await input.fill("빵 봉지를 열어"); await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(page.getByRole("button", { name: "명령을 해석하고 있어요…", exact: true })).toBeVisible();
  await input.fill("다음에 실행할 명령");
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  await expect(input).toHaveValue("다음에 실행할 명령");
  release();
  await expect(page.getByRole("region", { name: "최신 명령 결과" }).getByRole("alert")).toHaveText(message);
  await expect(input).toHaveValue("다음에 실행할 명령");
  for (const width of [1280, 901, 900, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await input.scrollIntoViewIfNeeded(); await input.focus(); await page.keyboard.press("Escape");
    await expect(input).toBeFocused();
  }
  await page.unroute("**/api/classroom/ai");
  await input.fill("빵 봉지를 열어, 식빵 두 장을 꺼내, 잼 뚜껑을 열어");
  await page.getByRole("button", { name: "AI 없이 실행", exact: true }).click();
  await page.getByRole("region", { name: "알고리즘 실행 기록", exact: true }).getByText("기록 도구", { exact: true }).click();
  await expect(page.getByRole("button", { name: "다시 실행 멈추기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click();
  await expect(page.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" })).toContainText("2 장");
});

test("sandwich-layout: 저장503·충돌409와 이전 제출·명령·초안 보존", async ({ page }) => {
  const endpoint = await prepare(page);
  // 실제 demo 서버의 규칙 해석으로 서명된 제출 작품을 준비해 UI에 복원한다.
  for (const input of ["빵 봉지를 열어", "식빵 두 장을 꺼내", "잼 뚜껑을 열어", "칼에 잼을 묻혀", "식빵 1의 넓은 면에 잼을 발라", "식빵 2를 식빵 1 위에 덮어"]) {
    const work = await savedWork(page, endpoint);
    expect((await page.request.post("/api/classroom/ai", { headers, data: { lessonId: "review-sandwich", revision: work.revision, task: "sandwich-rules", input, requestId: crypto.randomUUID() } })).status()).toBe(200);
  }
  await action(page, endpoint, { type: "validate-practice" });
  const submitted = (await action(page, endpoint, { type: "submit-practice" })).submission;
  await page.reload();
  await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령");
  let failure = 503;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: failure, json: { message: "합성 저장 실패", code: failure === 409 ? "REVISION_CONFLICT" : "UNAVAILABLE" } }); else await route.continue();
  });
  await input.fill("아직 작성 중인 명령");
  await expect(page.locator("#work-save-error")).toBeVisible();
  await page.getByRole("tab", { name: /개념/ }).click();
  await expect(input).toHaveValue("아직 작성 중인 명령");
  failure = 409;
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(page.locator("#work-save-error")).toContainText("저장 기록이 서로 달라요");
  const latest = await savedWork(page, endpoint);
  expect(latest.submission).toEqual(submitted);
  expect(latest.draft.reviewProject?.type === "sandwich" && latest.draft.reviewProject.commands.length).toBe(6);
  await page.getByRole("button", { name: "서버 기록과 비교", exact: true }).click();
  await expect(page.getByRole("region", { name: "저장 충돌 비교" })).toContainText("아직 작성 중인 명령");
  await page.unroute(`**${endpoint}`);
  await page.getByRole("button", { name: "현재 입력을 새 버전으로 저장", exact: true }).click();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await page.reload(); await expect(input).toHaveValue("아직 작성 중인 명령");
  expect((await savedWork(page, endpoint)).submission).toEqual(submitted);
});
