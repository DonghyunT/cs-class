import { expect, test, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { REVIEW_LESSONS } from "../src/lib/classroom/review/lessons";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { CONDITIONALS_LESSON } from "../src/lib/classroom/conditionals-lesson";
import { LOOPS_LESSON } from "../src/lib/classroom/loops-lesson";
import { emptyWork } from "../src/lib/classroom/progress";
import { concepts, questions } from "../src/lib/classroom/programming-data";
import { conditionalConcepts, conditionalQuestions } from "../src/lib/classroom/conditionals-data";
import { loopConcepts, loopQuestions } from "../src/lib/classroom/loops-data";
import { UNIT_QUIZ_DATA } from "../src/lib/server/review-quiz.mjs";
import type { Work } from "../src/lib/classroom/types";
const lessons = [PROGRAMMING_LESSON, CONDITIONALS_LESSON, LOOPS_LESSON, ...REVIEW_LESSONS];
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.doc("csClasses/2-1").get()).data(); });
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  for (const lesson of lessons) await db.doc(`csWork/student-20101__${lesson.id}`).delete();
  if (originalClass) await db.doc("csClasses/2-1").set(originalClass);
});
async function enter(page: Page, id = "review-abstraction") {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ currentLessonId: "programming-13", openedLessonIds: lessons.map(lesson => lesson.id) });
  await page.goto(`/classroom/${id}?from=lessons`);
  await expect(page.getByRole("tablist", { name: "수업 단계" })).toBeVisible();
}
test("공통 수업 헤더·단계 폭과 완료 진도는 모든 수업에서 일치한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await enter(page);
  let first: { leave: number; leaveY: number; tabs: number } | undefined;
  for (const lesson of lessons) {
    await page.goto("about:blank");
    const work = emptyWork(lesson);
    work.conceptSolved = [lesson.concepts[0].id]; work.quizSolved = [lesson.quiz[0].id];
    work.updatedAt = 1;
    // Validation and optional challenge are deliberately excluded from completion.
    work.validation = { passed: true, message: "합성 검증", order: [] };
    if (lesson.id === "programming-13") work.missions = { average: { validation: null, submission: { id: "optional", order: [], submittedAt: 1 } } };
    await db.doc(`csWork/student-20101__${lesson.id}`).set(work);
    await page.goto(`/classroom/${lesson.id}?from=lessons`);
    const tabs = page.getByRole("tablist", { name: "수업 단계" });
    await expect(tabs).toBeVisible();
    const leave = (await page.getByRole("link", { name: "수업 나가기", exact: true }).boundingBox())!;
    const geometry = { leave: leave.x, leaveY: leave.y, tabs: (await tabs.boundingBox())!.width };
    if (first) expect(geometry).toEqual(first); else first = geometry;
    await expect(page.getByText("수업 안내 · 이어하기 기준 · 학습 진행", { exact: true })).toHaveCount(0);
    const tracks = tabs.locator("[data-stage-progress]");
    await expect(tracks).toHaveCount(3);
    expect(await tracks.nth(0).getAttribute("data-percent")).toBe(String(Math.round(100 / lesson.concepts.length)));
    expect(await tracks.nth(1).getAttribute("data-percent")).toBe(String(Math.round(100 / lesson.quiz.length)));
    expect(await tracks.nth(2).getAttribute("data-percent")).toBe("0");
    for (const track of await tracks.all()) expect((await track.boundingBox())!.height).toBe(4);
    await page.screenshot({ path: testInfo.outputPath(`lesson-${lesson.id}-1920.png`) });
  }
});
test("공개 6수업의 개념 확인·퀴즈 오답은 힌트와 다른 문구를 받고 화면에 '다시 생각해 보기'·같은 버튼 이름·바로 저장 안내로 보인다", async ({ page }) => {
  test.setTimeout(120_000);
  await enter(page);
  await db.doc("csClasses/2-1").update({ openedLessonIds: RELEASED_LESSONS.map((lesson) => lesson.id) });
  const correct: Record<string, number> = {};
  concepts.forEach((c, i) => { correct[`pc${i}`] = c.correct; });
  for (const item of [...questions, ...conditionalConcepts, ...conditionalQuestions, ...loopConcepts, ...loopQuestions]) correct[item.id] = item.correct;
  for (const lesson of RELEASED_LESSONS) {
    const unit = Object.values(UNIT_QUIZ_DATA)[["review-abstraction", "review-sandwich", "review-flowchart"].indexOf(lesson.id)];
    const right = (id: string, kind: "concept" | "quiz") => unit ? kind === "concept" ? 0 : unit.questions.find((q) => String(q.id) === id)!.options.findIndex((o) => o.correct) : correct[id];
    const wrong = (id: string, kind: "concept" | "quiz", count: number) => String((right(id, kind) + 1) % count);
    const concept = lesson.concepts[0];
    const endpoint = `/api/classroom/work/${lesson.id}`;
    await db.doc(`csWork/student-20101__${lesson.id}`).delete();
    let work: Work = await (await page.request.get(endpoint)).json();
    const quizAnswers = Object.fromEntries(work.quizRoundIds.map((id) => [id, wrong(id, "quiz", lesson.quiz.find((q) => q.id === id)!.options.length)]));
    let response = await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, conceptAnswers: { [concept.id]: wrong(concept.id, "concept", concept.question.options.length) }, quizAnswers } } });
    expect(response.status(), lesson.id).toBe(200); work = await response.json();
    for (const action of [{ type: "check-concept", conceptId: concept.id }, { type: "grade-quiz" }]) {
      response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action } });
      expect(response.status(), `${lesson.id} ${action.type}`).toBe(200); work = await response.json();
    }
    expect(work.conceptFeedback[concept.id].correct, lesson.id).toBe(false);
    expect(work.conceptFeedback[concept.id].message, lesson.id).toBeTruthy();
    expect(work.conceptFeedback[concept.id].message, lesson.id).not.toBe(concept.question.hint);
    for (const question of lesson.quiz) {
      expect(work.quizFeedback[question.id].correct, `${lesson.id} ${question.id}`).toBe(false);
      expect(work.quizFeedback[question.id].message, `${lesson.id} ${question.id}`).toBeTruthy();
      expect(work.quizFeedback[question.id].message, `${lesson.id} ${question.id}`).not.toBe(question.hint);
    }
    await page.goto(`/classroom/${lesson.id}?from=lessons`);
    await expect(page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: new RegExp(concept.title.replace(/[?()]/g, "\\$&")) })).toContainText("다시 생각해 보기");
    await expect(page.getByRole("button", { name: "정답 확인", exact: true })).toBeVisible();
    await expect(page.getByText("확인 결과는 저장 버튼 없이 바로 저장돼요.", { exact: true })).toBeVisible();
    // The save notice is a small helper line, like the other smallNote text.
    expect(await page.getByText("확인 결과는 저장 버튼 없이 바로 저장돼요.", { exact: true }).evaluate((note) => getComputedStyle(note).fontSize), lesson.id).toBe("14px");
    const feedbackBox = (await page.locator(lesson.id === "programming-13" ? "#concept-feedback" : `#concept-feedback-${concept.id}`).boundingBox())!;
    expect((await page.getByText("확인 결과는 저장 버튼 없이 바로 저장돼요.", { exact: true }).boundingBox())!.y - feedbackBox.y - feedbackBox.height, lesson.id).toBeGreaterThanOrEqual(11);
    const list = page.getByRole("navigation", { name: "개념 목록", exact: true });
    // Only lessons with a hands-on concept experience invite students to change things.
    if (lesson.id === "conditionals" || lesson.id === "loops") { await expect(list).toContainText("예시를 읽고 결과를 예상한 뒤"); await expect(list).not.toContainText("직접 바꾸고"); }
    else await expect(list).toContainText("직접 바꾸고");
    await page.getByRole("tab", { name: /^퀴즈/ }).click();
    await expect(page.getByText("힌트 보기", { exact: true })).toBeVisible();
    await expect(page.getByText(/채점한 답안과 결과는 저장 버튼 없이 바로 저장돼요./)).toBeVisible();
  }
});

test("다른 이번 수업 링크는 나가기 옆에서 헤더 높이를 늘리지 않고 저장 실패 시 이동을 막는다", async ({ page }) => {
  await enter(page, "review-sandwich");
  const link = page.locator("header").getByRole("link", { name: /이번 수업:.*이동/ });
  await expect(link).toHaveAttribute("href", "/classroom/programming-13?from=lessons");
  await expect(page.getByText("하던 학습을 계속하거나 저장한 뒤 이동할 수 있어요.")).toHaveCount(0);
  for (const width of [1544, 1280, 821, 820, 390]) {
    await page.setViewportSize({ width, height: 712 });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (width >= 1280) expect((await page.getByRole("banner").boundingBox())!.height).toBeLessThanOrEqual(72);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByRole("tab", { name: /^실습/ }).click();
  await page.route("**/api/classroom/work/review-sandwich", route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { message: "합성 저장 실패" } }) : route.continue());
  await page.getByRole("textbox", { name: "자연어 명령" }).fill("빵 봉지를 열어");
  await link.click();
  await page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" }).getByRole("button", { name: "저장 후 나가기", exact: true }).click();
  await expect(page.locator("#work-save-error")).toContainText("합성 저장 실패");
  await expect(page).toHaveURL(/review-sandwich/);
  await expect(page.getByRole("textbox", { name: "자연어 명령" })).toHaveValue("빵 봉지를 열어");
});
test("한 지도에서 제거할 정보와 유지할 역·연결을 키보드로 비교한다", async ({ page }, testInfo) => {
  await enter(page);
  const map = page.getByRole("figure", { name: "일반 지도와 지하철 노선도 비교" });
  await expect(map).toBeVisible();
  const topology = () => map.locator("svg").evaluate(svg => ({ stations: [...svg.querySelectorAll("[data-station]")].map(node => node.getAttribute("data-station")), edges: [...svg.querySelectorAll("[data-edge]")].map(node => node.getAttribute("data-edge")) }));
  const before = await topology();
  expect(before.stations).toHaveLength(5); expect(before.edges).toHaveLength(4);
  await expect(map.locator("[data-geographic-details]")).toBeVisible();
  await map.screenshot({ path: testInfo.outputPath("map-geographic.png") });
  await map.getByRole("button", { name: "지하철 노선도", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(map.locator("[data-geographic-details]")).toHaveCount(0);
  expect(await topology()).toEqual(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[1920,1080], [1544,712], [1280,720], [821,712], [820,712], [390,712]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => map.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await expect.poll(() => map.locator("svg text").first().evaluate(text => parseFloat(getComputedStyle(text).fontSize) * (text as SVGGraphicsElement).getScreenCTM()!.a)).toBeGreaterThanOrEqual(14);
    expect(await topology()).toEqual(before);
    await map.screenshot({ path: testInfo.outputPath(`map-subway-${width}.png`) });
  }
  await page.screenshot({ path: testInfo.outputPath("map-390.png") });
});
test("추상화 처방전 인쇄는 현재 결과만 한 열로 읽고 입력은 보존한다", async ({ page }, testInfo) => {
  await enter(page);
  await page.goto("about:blank");
  const work = emptyWork(REVIEW_LESSONS.find(lesson => lesson.id === "review-abstraction")!);
  if (work.draft.reviewProject?.type !== "abstraction") throw Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { tutorialDone: true, view: "workbook", step: 4, current: "과제가 남음", goal: "제시간에 제출", conditions: ["밤 10시까지"], core: ["남은 과제"], noise: ["표지 색"], plans: ["할 일을 나눠 적는다", "남은 시간을 확인한다", ""] });
  work.draft.stage = "practice";
  await db.doc("csWork/student-20101__review-abstraction").set(work);
  await page.goto("/classroom/review-abstraction");
  const prescription = page.getByRole("region", { name: "추상화 처방전", exact: true });
  await expect(prescription).toBeVisible();
  for (const [width, height] of [[1920,1080], [1544,712], [390,712]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`prescription-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-lesson-shell]>header")).toBeHidden();
  await expect(page.getByRole("tablist", { name: "수업 단계" })).toBeHidden();
  await expect(page.getByRole("complementary", { name: "추상화 닥터" })).toBeHidden();
  await expect(prescription.locator("p").filter({ hasText: /^할 일을 나눠 적는다$/ })).toBeVisible();
  await expect(prescription.locator("p").filter({ hasText: /^남은 시간을 확인한다$/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("prescription-print.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });
  await expect(page.getByLabel("실천 계획 3", { exact: true })).toHaveValue("");
  await page.getByRole("tab", { name: /^개념/ }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-lesson-shell]>header")).toBeVisible();
});
