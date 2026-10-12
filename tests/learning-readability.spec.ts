import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import { REVIEW_LESSONS } from "../src/lib/classroom/review/lessons";
import { LESSONS } from "../src/lib/classroom/catalog";
import { UNIT_QUIZ_DATA } from "../src/lib/server/review-quiz.mjs";

const studentId = "20102", uid = `student-${studentId}`;
const lessonIds = ["review-sandwich", "review-abstraction", "review-flowchart", "programming-13", "entry-bot-lab"];
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async () => {
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
  for (const id of [...lessonIds, "sequence-lab"]) await db.collection("csWork").doc(`${uid}__${id}`).delete();
});

async function prepare(page: Page, id = "review-sandwich") {
  await page.goto("about:blank");
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

test("abstraction: 남기는 이유와 지도 전환에서 같은 역·연결을 보존한다", async ({ page }, testInfo) => {
  await prepare(page, "review-abstraction");
  const experience = page.getByRole("region", { name: "추상화 개념 체험" });
  for (const name of ["노트 표지 색", "필기구 브랜드", "책상 장식"]) await experience.getByRole("button", { name, exact: true }).click();
  await expect(experience.getByRole("status")).toContainText("핵심 정보 세 가지");
  const reasons = experience.getByRole("list", { name: "남기는 정보와 이유" });
  await expect(reasons).toContainText("목표 공부 시간");
  await expect(reasons).toContainText("남은 과제");
  await expect(reasons).toContainText("현재 시각");
  const maps = experience.getByRole("img");
  await expect(maps).toHaveCount(1);
  const network = await maps.evaluateAll(elements => elements.map(svg => ({
    stations: [...svg.querySelectorAll("[data-station]")].map(node => node.getAttribute("data-station")),
    edges: [...svg.querySelectorAll("[data-edge]")].map(node => node.getAttribute("data-edge")),
  })));
  expect(network[0].stations.length).toBeGreaterThanOrEqual(3);
  expect(network[0].edges.length).toBeGreaterThanOrEqual(2);
  await experience.getByRole("button", { name: "지하철 노선도", exact: true }).click();
  expect(await maps.evaluateAll(elements => elements.map(svg => ({
    stations: [...svg.querySelectorAll("[data-station]")].map(node => node.getAttribute("data-station")),
    edges: [...svg.querySelectorAll("[data-edge]")].map(node => node.getAttribute("data-edge")),
  })))).toEqual(network);
  for (const width of [1440, 821, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("abstraction-essential-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "체험 초기화", exact: true }).click();
  await expect(experience.getByRole("button", { name: "노트 표지 색", exact: true })).toBeVisible();
});

test("abstraction: 상태·조건과 목표를 연결하고 하위 단계를 펼쳐도 완료 답안을 보존한다", async ({ page }) => {
  const endpoint = await prepare(page, "review-abstraction");
  await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button", { name: /현재에서 목표로/ }).click();
  const experience = page.getByRole("region", { name: "추상화 개념 체험" });
  await expect(experience.getByRole("list", { name: "현재에서 목표로 가는 흐름" })).toContainText("초기 상태");
  await experience.getByRole("button", { name: "조건", exact: true }).click();
  await expect(experience.getByRole("status")).toContainText("밤 10시");
  await experience.getByRole("button", { name: "목표 상태", exact: true }).click();
  await expect(experience.getByRole("status")).toContainText("제출");
  await page.getByRole("radio", { name: "목표 상태", exact: true }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#concept-feedback-state")).toBeFocused();
  await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button", { name: /분해하고 핵심/ }).click();
  await expect(experience.getByText("목표: 안전하게 라면을 끓여 먹기", { exact: true })).toBeVisible();
  await experience.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(experience.getByText("냄비·물·라면을 준비해요.", { exact: true })).toBeVisible();
  await experience.getByRole("button", { name: "등교하기", exact: true }).click();
  await expect(experience.getByText("목표: 준비물을 챙겨 정시에 학교에 도착하기", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.getByRole("tab", { name: /개념/ }).click();
  await expect(page.locator("#concept-decompose")).toBeVisible();
  await page.reload();
  expect((await savedWork(page, endpoint)).conceptSolved).toContain("state");
  expect((await savedWork(page, endpoint)).draft.conceptAnswers.state).toBe("0");
});

test("abstraction-workbook: AI 대기·실패와 저장503·충돌409 뒤에도 입력을 복원한다", async ({ page }, testInfo) => {
  const endpoint = await prepare(page, "review-abstraction");
  await page.getByRole("tab", { name: /실습/ }).click();
  for (let step = 1; step < 4; step++) await page.getByRole("button", { name: "맛보기 다음", exact: true }).click();
  await page.getByRole("button", { name: "나의 실전 워크북 시작", exact: true }).click();
  await page.getByLabel("고민 키워드", { exact: true }).fill("과제 계획");
  const current = page.getByLabel("현재 상태", { exact: true });
  await current.fill("과제 하나가 남았어요");
  await page.getByLabel("목표 상태", { exact: true }).fill("밤 10시 전에 제출함");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/ai", async route => { await gate; await route.fulfill({ status: 503, json: { message: "합성 AI 연결 실패", code: "UNAVAILABLE" } }); });
  const coach = page.getByRole("complementary", { name: "추상화 닥터" });
  await coach.getByRole("button", { name: "현재·목표 후보 받기", exact: true }).click();
  await expect(coach.getByRole("button", { name: "닥터가 생각 중…", exact: true })).toBeDisabled();
  await current.fill("기다리면서도 내 상태를 다듬어요");
  release();
  await expect(coach.getByRole("alert")).toContainText("합성 AI 연결 실패");
  await expect(current).toHaveValue("기다리면서도 내 상태를 다듬어요");
  await page.unroute("**/api/classroom/ai");
  let failure = 503;
  await page.route(`**${endpoint}`, async route => { if (route.request().method() === "POST") await route.fulfill({ status: failure, json: { message: "합성 저장 실패", code: failure === 409 ? "REVISION_CONFLICT" : "UNAVAILABLE" } }); else await route.continue(); });
  await current.fill("저장되지 않은 나의 현재 상태");
  await expect(page.locator("#work-save-error")).toBeVisible();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(current).toHaveValue("저장되지 않은 나의 현재 상태");
  failure = 409;
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(page.locator("#work-save-error")).toContainText("저장 기록이 서로 달라요");
  await page.getByRole("button", { name: "서버 기록과 비교", exact: true }).click();
  await expect(page.getByRole("region", { name: "저장 충돌 비교" })).toContainText("저장되지 않은 나의 현재 상태");
  await page.unroute(`**${endpoint}`);
  await page.getByRole("button", { name: "현재 입력을 새 버전으로 저장", exact: true }).click();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.reload();
  await expect(current).toHaveValue("저장되지 않은 나의 현재 상태");
  await expect(page.getByLabel("목표 상태", { exact: true })).toHaveValue("밤 10시 전에 제출함");
  await page.setViewportSize({ width: 390, height: 720 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("abstraction-workbook-mobile.png"), fullPage: true });
});

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
  await expect(page.getByText("수업 안내 · 이어하기 기준 · 학습 진행", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-stage-progress="concept"]')).toHaveAttribute("data-percent", "67");
  await expect(page.locator("#concept-structure")).toBeVisible();
  expect((await savedWork(page, endpoint)).conceptSolved.sort()).toEqual(["clear", "structure"]);
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
  await page.getByRole("group", { name: "바르는 면 비교", exact: true }).getByRole("button", { name: /^잼을 발라/ }).click();
  await expect(scene.locator('[data-jam="edge"]')).toBeVisible();
  await expect(page.getByText(/이 체험 로봇의 해석 예시/)).toBeVisible();
  await page.getByRole("group", { name: "바르는 면 비교", exact: true }).getByRole("button", { name: /^넓은 면에 골고루 발라/ }).focus();
  await page.keyboard.press("Enter");
  await expect(scene.locator('[data-jam="flat"]')).toBeVisible();
  await expect(scene.locator('[data-jam="edge"]')).toHaveCount(0);
  await page.getByRole("button", { name: "체험 초기화", exact: true }).click();
  await expect(scene.locator("[data-jam]")).toHaveCount(0);
});

test("algorithm-scene: 3회 자동 종료·외부 중지·움직임 줄이기", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: /알고리즘의 다섯 조건/ }).click();
  await page.getByRole("group", { name: "반복 실행", exact: true }).getByRole("button", { name: /^3번만 반복/ }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("3회 · 자동 종료");
  await page.getByRole("group", { name: "반복 실행", exact: true }).getByRole("button", { name: /^끝없이 반복/ }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("실행 중");
  await page.getByRole("button", { name: "실행 중지", exact: true }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("외부에서 중지");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("group", { name: "반복 실행", exact: true }).getByRole("button", { name: /^3번만 반복/ }).click();
  await expect(page.getByRole("status", { name: "반복 결과" })).toContainText("3회 · 자동 종료");
  await page.getByRole("button", { name: "입력", exact: true }).click();
  await expect(page.getByRole("region", { name: "알고리즘 개념 체험" }).getByText(/입력은 없을 수도/)).toBeVisible();
});

test("algorithm-scene: 조건·횟수와 표현 전환의 실제 경로", async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /순차·선택·반복/ }).click();
  await page.getByRole("group", { name: "알고리즘 구조 선택", exact: true }).getByRole("button", { name: /^선택 구조/ }).click();
  await page.getByRole("button", { name: "우유 없음", exact: true }).click();
  await page.getByRole("group", { name: "흐름 실행 조작", exact: true }).getByRole("button", { name: /흐름 실행/ }).click();
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
      await page.getByRole("group", { name: "흐름 실행 조작", exact: true }).getByRole("button", { name: /흐름 실행/ }).click();
      await expect(path).toContainText("우유 넣기");
      await expect(path).not.toContainText("물 넣기");
      await page.getByRole("button", { name: "우유 없음", exact: true }).click();
      await page.getByRole("group", { name: "흐름 실행 조작", exact: true }).getByRole("button", { name: /흐름 실행/ }).click();
    }
  }
  await page.getByRole("group", { name: "알고리즘 구조 선택", exact: true }).getByRole("button", { name: /^반복 구조/ }).click();
  await page.getByRole("button", { name: "3회", exact: true }).click();
  await page.getByRole("group", { name: "흐름 실행 조작", exact: true }).getByRole("button", { name: /흐름 실행/ }).click();
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
  await nav.getByRole("button").nth(1).click();
  await page.getByRole("radio").first().check();
  await expect.poll(async () => (await savedWork(page, endpoint)).draft.quizAnswers[questions[1].id]).toBeTruthy();
  await page.reload();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions[0].prompt);
  for (let i = 0; i < questions.length; i++) {
    await nav.getByRole("button").nth(i).click();
    await page.getByRole("radio").first().check();
  }
  await expect.poll(async () => Object.keys((await savedWork(page, endpoint)).draft.quizAnswers).length).toBe(questions.length);
  const before = await savedWork(page, endpoint);
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await page.reload();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions[0].prompt);
  expect((await savedWork(page, endpoint)).draft.quizAnswers).toEqual(before.draft.quizAnswers);
  await nav.getByRole("button").last().click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  await page.getByRole("button", { name: "이번 회차 결과 확인", exact: true }).click();
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
  for (let index = 0; index < wrong.length; index++) {
    await nav.getByRole("button").nth(index).click();
    const original = UNIT_QUIZ_DATA.algorithm.questions.find(question => String(question.id) === wrong[index])!;
    await page.getByRole("radio").nth(original.options.findIndex(option => option.correct)).check();
  }
  await page.getByRole("button", { name: "이번 회차 결과 확인", exact: true }).click();
  await expect(page.locator("#quiz-round-result")).toBeFocused();
  const completed = await savedWork(page, endpoint);
  expect(completed.quizSolved.sort()).toEqual(questions.map(question => question.id).sort());
  await nav.getByRole("button").last().click();
  await page.reload();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.find(question => question.id === wrong[0])!.prompt);
  expect((await savedWork(page, endpoint)).draft.quizAnswers).toEqual(completed.draft.quizAnswers);
});

for (const lessonId of ["sequence-lab", "programming-13"]) {
  for (const position of ["first", "last"] as const) {
    test(`quiz-viewport: ${lessonId} ${position} 문제·선택·주행동을 1280×720 한 화면에서 조작한다`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      const endpoint = await prepare(page, lessonId);
      const questions = LESSONS.find(lesson => lesson.id === lessonId)!.quiz;
      await page.getByRole("tab", { name: /퀴즈/ }).click();
      const panel = page.locator("#panel-quiz");
      const nav = page.getByRole("navigation", { name: "퀴즈 문항 목록" });
      if (position === "last") {
        for (let i = 0; i < questions.length; i++) {
          await nav.getByRole("button").nth(i).click();
          await panel.getByRole("radio").first().check();
        }
        await expect.poll(async () => Object.keys((await savedWork(page, endpoint)).draft.quizAnswers).length).toBe(questions.length);
      }
      const title = panel.locator(lessonId === "programming-13" ? "#programming-question" : "#quiz-question-title");
      await expect(title).toHaveText(questions[position === "first" ? 0 : questions.length - 1].prompt);
      await expect(panel.getByRole("radio")).toHaveCount(questions[position === "first" ? 0 : questions.length - 1].options.length);
      const primary = panel.getByRole("button", { name: position === "first" ? "다음 문제" : "이번 회차 결과 확인", exact: true });
      await expect(primary).toBeEnabled();
      // Playwright clicks may scroll controls into view; compare their original document position at the top.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      const elements = [title, ...await panel.locator("fieldset label, code").all(), primary];
      for (const element of elements) {
        const box = await element.boundingBox();
        expect(box, await element.innerText()).not.toBeNull();
        expect(box!.y, await element.innerText()).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, await element.innerText()).toBeLessThanOrEqual(720);
      }
      for (const element of [...await panel.locator("fieldset label").all(), primary]) {
        const box = (await element.boundingBox())!;
        expect(box.height, await element.innerText()).toBeGreaterThanOrEqual(44);
        expect(box.width, await element.innerText()).toBeGreaterThanOrEqual(44);
        expect(await element.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
      }
      expect((await savedWork(page, endpoint)).quizRoundGraded).toBe(false);
    });
  }
}

test("quiz-responsive: 1000/1001·390/320과 CSS 200% 모의 확대에서 문항과 초점을 보존한다", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const lessonId of ["sequence-lab", "programming-13"]) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await prepare(page, lessonId);
    const question = LESSONS.find(lesson => lesson.id === lessonId)!.quiz[0];
    await page.getByRole("tab", { name: /퀴즈/ }).click();
    const panel = page.locator("#panel-quiz"), heading = panel.locator("#stage-heading-quiz");
    const title = panel.locator(lessonId === "programming-13" ? "#programming-question" : "#quiz-question-title");
    await heading.focus();
    await expect(heading).toBeFocused();
    const headingBox = (await heading.boundingBox())!;
    expect(headingBox.width).toBeGreaterThan(20);
    expect(headingBox.height).toBeGreaterThanOrEqual(20);
    expect(await heading.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(3);
    // 640×360 models the layout space of a 1280×720 window at 200%; it is not actual browser zoom.
    for (const width of [1000, 1001, 390, 320, 640]) {
      await page.setViewportSize({ width, height: width === 640 ? 360 : 720 });
      await expect(title).toHaveText(question.prompt);
      await expect(panel.getByRole("radio")).toHaveCount(question.options.length);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const element of await panel.locator("fieldset label, fieldset label span, code, button").all()) {
        const box = (await element.boundingBox())!;
        expect(box.x, await element.innerText()).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, await element.innerText()).toBeLessThanOrEqual(width);
      }
      if (lessonId === "programming-13" && (width === 1000 || width === 1001)) {
        const titleBox = (await title.boundingBox())!, optionBox = (await panel.locator("fieldset label").first().boundingBox())!;
        if (width === 1001) expect(optionBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
        else {
          const lastCode = (await panel.locator("code").last().boundingBox())!;
          expect(optionBox.x).toBeCloseTo(titleBox.x, 1);
          expect(optionBox.y).toBeGreaterThanOrEqual(lastCode.y + lastCode.height);
        }
      }
    }
    await panel.locator("details summary").click();
    await expect(panel.locator("details p")).toHaveText(question.hint);
    await page.setViewportSize({ width: 1280, height: 720 });
    // CSS zoom exercises scaled content and wrapping, but does not reproduce browser zoom's media-query changes.
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    try {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(title).toHaveText(question.prompt);
      await expect(panel.locator("details p")).toHaveText(question.hint);
      for (const element of await panel.locator("fieldset label, button").all()) {
        const box = (await element.boundingBox())!;
        expect(box.height, await element.innerText()).toBeGreaterThanOrEqual(88);
        expect(box.x, await element.innerText()).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, await element.innerText()).toBeLessThanOrEqual(1280);
      }
      await title.focus();
      await expect(title).toBeFocused();
      await expect.poll(async () => {
        const focused = (await title.boundingBox())!;
        return focused.y >= 0 && focused.y + focused.height <= 720;
      }).toBe(true);
    } finally { await page.evaluate(() => { document.documentElement.style.zoom = ""; }); }
  }
  expect(errors).toEqual([]);
});

test("quiz-nav: 채점·재도전 실패는 답안과 현재 문항을 보존", async ({ page }) => {
  const endpoint = await prepare(page);
  const questions = REVIEW_LESSONS.find(lesson => lesson.id === "review-sandwich")!.quiz;
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  const nav = page.getByRole("navigation", { name: "퀴즈 문항 목록" });
  for (let i = 0; i < questions.length; i++) { await nav.getByRole("button").nth(i).click(); await page.getByRole("radio").first().check(); }
  let posts = 0, gradePayload: unknown;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith(`${endpoint}/action`)) posts++; });
  await page.route(`${endpoint}/action`, route => { gradePayload = route.request().postDataJSON(); return route.fulfill({ status: 503, json: { error: "채점 요청 결과를 확인하지 못했어요." } }); });
  await page.getByRole("button", { name: "이번 회차 결과 확인", exact: true }).click();
  await expect(page.locator("#work-action-error")).toBeFocused();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  await expect(page.getByRole("radio").first()).toBeChecked();
  expect((await savedWork(page, endpoint)).quizRoundGraded).toBe(false);
  await page.unroute(`${endpoint}/action`);
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true })).toBeVisible();
  expect(posts).toBe(1);
  const gradeResend = page.waitForRequest(request => request.url().endsWith(`${endpoint}/action`) && request.method() === "POST");
  await page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true }).click();
  expect((await gradeResend).postDataJSON()).toEqual(gradePayload);
  await expect(page.locator("#work-action-error")).toHaveCount(0);
  await expect(page.locator("#quiz-round-result")).toBeFocused();
  const graded = await savedWork(page, endpoint);
  expect(posts).toBe(2);
  let retryPayload: unknown;
  await page.route(`${endpoint}/action`, route => { retryPayload = route.request().postDataJSON(); return route.fulfill({ status: 503, json: { error: "재도전 요청 결과를 확인하지 못했어요." } }); });
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기", exact: true }).click();
  await expect(page.locator("#work-action-error")).toBeFocused();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await expect(page.locator("#quiz-question-title")).toHaveText(questions.at(-1)!.prompt);
  expect((await savedWork(page, endpoint)).quizRound).toBe(graded.quizRound);
  await page.unroute(`${endpoint}/action`);
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true })).toBeVisible();
  expect(posts).toBe(3);
  const retryResend = page.waitForRequest(request => request.url().endsWith(`${endpoint}/action`) && request.method() === "POST");
  await page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true }).click();
  expect((await retryResend).postDataJSON()).toEqual(retryPayload);
  await expect(page.locator("#work-action-error")).toHaveCount(0);
  await expect(page.locator("#quiz-question-title")).toBeFocused();
  expect((await savedWork(page, endpoint)).quizRound).toBe(graded.quizRound + 1);
  expect(posts).toBe(4);
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

test("workspace-width: 복습의 기본 폭·집중 확대·단계 저장 실패·재접속", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepare(page);
  const layout = page.locator('[data-workspace-wide]').first();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByRole("tab", { name: /실습/ })).toBeFocused();
  await expect(page.getByRole("button", { name: "작업실 넓게 보기", exact: true })).toBeHidden();
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
  const restore = page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true });
  await restore.click();
  const expand = page.getByRole("button", { name: "실습 집중 모드", exact: true });
  await expect(expand).toBeFocused();
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByRole("tab", { name: /개념/ }).click();
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(page.getByLabel("자연어 명령")).toHaveValue("빵 봉지를 열어");
  await expand.click();
  const input = page.getByLabel("자연어 명령");
  await input.focus();
  for (const width of [1472, 1440, 1280, 821, 820, 821]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(layout).toHaveAttribute("data-workspace-wide", "true");
    await expect(restore).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("빵 봉지를 열어");
  }
  await page.getByLabel("자연어 명령").focus(); await page.keyboard.press("Escape");
  await expect(layout).toHaveAttribute("data-workspace-wide", "false");
  await expect(expand).toBeFocused();
  await expect(input).toHaveValue("빵 봉지를 열어");
  await page.setViewportSize({ width: 1920, height: 900 });
  await expect(expand).toBeVisible();
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

test("workspace-width: 연결된 네 수업의 기본 폭과 활동별 확대 선택", async ({ page }) => {
  test.setTimeout(120_000);
  for (const id of lessonIds.slice(0, 4)) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await prepare(page, id);
    await page.getByRole("tab", { name: /실습/ }).click();
    await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "false");
    await expect(page.getByRole("tab", { name: /실습/ })).toBeFocused();
    await expect(page.getByRole("button", { name: "작업실 넓게 보기", exact: true })).toBeHidden();
    await page.setViewportSize({ width: 1920, height: 900 });
    const review = id.startsWith("review-");
    await page.getByRole("button", { name: review ? "실습 집중 모드" : "작업실 넓게 보기", exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('[data-workspace-wide]').first()).toHaveAttribute("data-workspace-wide", "true");
    await page.getByRole("button", { name: review ? "실습 집중 모드 끝내기" : "기본 크기로 돌아가기", exact: true }).click();
    await expect(page.getByRole("button", { name: "작업실 넓게 보기", exact: true })).toBeHidden();
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
  await page.setViewportSize({ width: 1920, height: 720 });
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
  await expect(input).toHaveValue("다음에 실행할 명령");
  release();
  await expect(page.getByRole("region", { name: "최신 명령 결과" }).getByRole("alert")).toHaveText(message);
  await expect(input).toHaveValue("다음에 실행할 명령");
  for (const width of [1280, 901, 900, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await input.scrollIntoViewIfNeeded(); await input.focus();
    const focused = await page.locator("[data-lesson-shell]").getAttribute("data-practice-focused") === "true";
    await page.keyboard.press("Escape");
    if (focused) await expect(page.getByRole("button", { name: "실습 집중 모드", exact: true })).toBeFocused();
    else await expect(input).toBeFocused();
  }
  await page.unroute("**/api/classroom/ai");
  await input.fill("빵 봉지를 열어, 식빵 두 장을 꺼내, 잼 뚜껑을 열어");
  await page.getByRole("button", { name: "AI 없이 실행", exact: true }).click();
  await page.getByRole("region", { name: "알고리즘 실행 기록", exact: true }).getByText("기록 도구", { exact: true }).click();
  await expect(page.getByRole("button", { name: "다시 실행 멈추기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
  await page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true }).click();
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
