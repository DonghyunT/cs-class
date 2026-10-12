import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork } from "../src/lib/classroom/progress";
import { buildProgrammingProject } from "../src/lib/classroom/programming-entry";
import type { StudentDashboard, Work, WorkAction } from "../src/lib/classroom/types";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";
import { auth, db, headers, initialPassword, localOnly, loginStudent, resetStudent, studentPassword } from "./emulator";

const studentId = "20190", uid = `student-${studentId}`, classId = "2-1";
const programming = LESSONS.find(lesson => lesson.id === "programming-13")!;
const review = LESSONS.find(lesson => lesson.id === "review-abstraction")!;
const reviews = LESSONS.filter(lesson => lesson.mode === "review");
const endpoint = `/api/classroom/work/${programming.id}`;
const studentEndpoint = "**/api/classroom/student";
let originalClass: FirebaseFirestore.DocumentData | undefined;
let ownsStudent = false;

const nameProject = buildProgrammingProject([[
  { type: "when_run_button_click", params: [null] },
  { type: "ask_and_wait", params: [{ type: "text", params: ["이름은?"] }, null] },
  { type: "dialog_time", params: [{ type: "get_canvas_input_value", params: [null] }, { type: "number", params: ["0.2"] }, "speak", null] },
]]);

const submission = (id: string) => ({ id, order: [], entryProject: nameProject, submittedAt: 1_700_000_000_000 });
async function saveWork(work: Work) {
  await db.doc(`csWork/${uid}__${work.lessonId}`).set({ ...work, uid, classId });
}
async function openLessons(ids: string[], current: string | null = ids[0] ?? null) {
  await db.doc(`csClasses/${classId}`).update({ openedLessonIds: ids, currentLessonId: current });
}
function progressRegion(page: Page) { return page.getByRole("region", { name: "나의 학습 진도", exact: true }); }
async function showDashboardFixture(page: Page, lessons: StudentDashboard["lessons"], currentLessonId: string | null, work: StudentDashboard["work"] = {}) {
  await page.unrouteAll({ behavior: "wait" });
  await openLessons(lessons.map(lesson => lesson.id), currentLessonId);
  for (const lesson of lessons) {
    if (work[lesson.id]) await saveWork(work[lesson.id]);
    else await db.doc(`csWork/${uid}__${lesson.id}`).delete();
  }
  const response = await page.request.get("/api/classroom/student");
  expect(response.status()).toBe(200);
  const data = await response.json() as StudentDashboard;
  await page.route(studentEndpoint, route => route.fulfill({ json: { ...data, classroom: { ...data.classroom, currentLessonId, openedLessonIds: lessons.map(lesson => lesson.id) }, lessons, work } }));
  await page.goto("/student");
  await expect(progressRegion(page).locator("#current-heading")).toHaveText(lessons.find(lesson => lesson.id === currentLessonId)?.title ?? "다음 수업을 기다리고 있어요.");
}
async function expectMobileCurrentFirst(page: Page) {
  const overview = progressRegion(page);
  // Read both positions in one frame so smooth scrolling cannot mix viewport coordinates.
  const layout = await overview.evaluate(element => {
    const currentHeading = element.querySelector("#current-heading")!;
    const summaryHeading = element.querySelector("#learning-overview-heading")!;
    const current = currentHeading.parentElement!.getBoundingClientRect();
    const summary = summaryHeading.parentElement!.getBoundingClientRect();
    return {
      currentBottom: current.bottom + scrollY,
      summaryTop: summary.top + scrollY,
      hasSize: current.width > 0 && current.height > 0 && summary.width > 0 && summary.height > 0,
      currentFirst: Boolean(currentHeading.compareDocumentPosition(summaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(layout.hasSize, "이번 수업과 진도 요약이 실제 크기로 표시됨").toBe(true);
  expect(layout.currentBottom, "이번 수업 전체가 진도 요약보다 위에 표시됨").toBeLessThanOrEqual(layout.summaryTop);
  expect(layout.currentFirst, "읽기 순서도 이번 수업 다음에 진도 요약").toBe(true);
}
async function expectProgress(page: Page, count: string, percent: number) {
  const region = progressRegion(page);
  const bar = region.getByRole("progressbar", { name: "전체 필수 활동 완료율", exact: true });
  await expect(region).toBeVisible();
  await expect(region.getByText(`필수 활동 ${count}개 완료`, { exact: true })).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", String(percent));
  await expect(bar).toHaveAttribute("aria-valuetext", `필수 활동 ${count}개 완료`);
  await expect(region).toHaveAccessibleDescription("현재 열린 정규 수업 기준");
  const scope = (await region.getByText("현재 열린 정규 수업 기준", { exact: true }).boundingBox())!;
  expect(scope.width).toBeLessThanOrEqual(1);
  expect(scope.height).toBeLessThanOrEqual(1);
}
async function action(page: Page, work: Work, value: WorkAction): Promise<Work> {
  const response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: value } });
  expect(response.status()).toBe(200);
  return response.json();
}

test.beforeAll(async ({ request }) => {
  await localOnly(request);
  originalClass = (await db.doc(`csClasses/${classId}`).get()).data();
  expect(originalClass).toBeDefined();
  expect((await db.doc(`csAccounts/${uid}`).get()).exists).toBe(false);
  ownsStudent = true;
});
test.beforeEach(async ({ page }) => {
  await resetStudent(page.request, studentId);
  for (const lesson of LESSONS) await db.doc(`csWork/${uid}__${lesson.id}`).delete();
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.session?.studentId).toBe(studentId);
});
test.afterAll(async () => {
  if (!ownsStudent) return;
  for (const lesson of LESSONS) await db.doc(`csWork/${uid}__${lesson.id}`).delete();
  for (const collection of ["csAccounts", "csAiUsage"]) await db.doc(`${collection}/${uid}`).delete();
  for (const password of [initialPassword, studentPassword]) {
    const key = createHash("sha256").update(`credential:${uid}:${passwordDigest(password)}`).digest("hex");
    await db.doc(`csRateLimits/${key}`).delete();
  }
  await auth.deleteUser(uid).catch(error => { if (error.code !== "auth/user-not-found") throw error; });
  if (originalClass) await db.doc(`csClasses/${classId}`).set(originalClass);
});

test("entry-guidance: 계산 안내 없이 정규 완료 수를 표시하고 선택 복습 추가로 집계를 바꾸지 않는다", async ({ page }) => {
  const work = emptyWork(programming); work.conceptSolved = ["pc0", "pc1"]; work.quizSolved = ["language"]; work.updatedAt = Date.now();
  await showDashboardFixture(page, [programming], programming.id, { [programming.id]: work });
  await expectProgress(page, "3/13", 23);
  await expect(progressRegion(page).getByText("진도 계산 안내", { exact: true })).toHaveCount(0);
  await expect(progressRegion(page).locator("details")).toHaveCount(0);
  await showDashboardFixture(page, [programming, ...reviews], programming.id, { [programming.id]: work });
  await expectProgress(page, "3/13", 23);
  await expect(progressRegion(page).getByText("진도 계산 안내", { exact: true })).toHaveCount(0);
});

test("필수 활동 개수를 합산하며 단계 평균·선택 복습·심화 제출을 제외", async ({ page }, testInfo) => {
  await openLessons([programming.id, ...reviews.map(lesson => lesson.id)], programming.id);
  const partial = emptyWork(programming);
  partial.conceptSolved = ["pc0"];
  partial.quizSolved = ["language", "flow"];
  partial.missions = { name: { validation: null, submission: submission("name-submitted") }, average: { validation: null, submission: submission("optional-submitted") } };
  partial.updatedAt = Date.now();
  await saveWork(partial);
  const optional = emptyWork(review);
  optional.conceptSolved = review.concepts.map(concept => concept.id);
  optional.quizSolved = review.quiz.map(question => question.id);
  optional.submission = submission("review-submitted");
  optional.updatedAt = Date.now();
  await saveWork(optional);
  await page.goto("/student");
  // Four of thirteen required activities give 31%, unlike averaging 25%, 40%, and 25%.
  await expectProgress(page, "4/13", 31);
  const overview = progressRegion(page);
  const concept = overview.getByRole("button", { name: /^개념 진도:/ });
  const quiz = overview.getByRole("button", { name: /^퀴즈 진도:/ });
  const practice = overview.getByRole("button", { name: /^실습 진도:/ });
  await expect(concept).toHaveAccessibleName("개념 진도: 1/4개 완료, 25%");
  await expect(quiz).toHaveAccessibleName("퀴즈 진도: 2/5개 완료, 40%");
  await expect(practice).toHaveAccessibleName("실습 진도: 1/4개 완료, 25%");
  await expect(overview.getByRole("tooltip")).toHaveCount(0);
  await concept.focus();
  const tooltip = overview.getByRole("tooltip");
  await expect(tooltip).toContainText("개념");
  await expect(tooltip).toContainText("1/4개 완료");
  await expect(tooltip).toContainText("25%");
  await concept.press("Escape");
  await expect(overview.getByRole("tooltip")).toHaveCount(0);
  await expect(concept).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(quiz).toBeFocused();
  await expect(tooltip).toContainText("2/5개 완료");
  await expect(tooltip).toContainText("40%");
  await quiz.press("Escape");
  // The SVG strokes expose the same details as the keyboard/touch legend.
  const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
  await refresh.focus();
  const svg = overview.locator("svg").filter({ has: page.locator('[data-stage="concept"]') });
  const svgBox = (await svg.boundingBox())!;
  const center = { x: svgBox.x + svgBox.width / 2, y: svgBox.y + svgBox.height / 2 };
  const stageGeometry = await Promise.all(["concept", "quiz", "practice"].map(stage => overview.locator(`svg [data-stage="${stage}"]`).evaluate(element => {
    const path = element as SVGGeometryElement;
    const screenPoint = (distance: number) => {
      const point = path.getPointAtLength(distance);
      const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    };
    const length = path.getTotalLength();
    return { start: screenPoint(0), middle: screenPoint(length / 2), end: screenPoint(length) };
  })));
  const stagePoints = stageGeometry.map(sector => sector.middle);
  // One circle has three equal sectors, clockwise from twelve o'clock.
  for (let index = 0; index < 3; index++) {
    const end = stageGeometry[index].end, next = stageGeometry[(index + 1) % 3].start;
    expect(Math.hypot(end.x - next.x, end.y - next.y), "배경 진도 트랙은 구간 경계에서 끊기지 않음").toBeLessThan(.5);
  }
  const radii = stagePoints.map(point => Math.hypot(point.x - center.x, point.y - center.y));
  expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(2);
  expect(stagePoints[0].x).toBeGreaterThan(center.x);
  expect(stagePoints[0].y).toBeLessThan(center.y);
  expect(Math.abs(stagePoints[1].x - center.x)).toBeLessThan(2);
  expect(stagePoints[1].y).toBeGreaterThan(center.y);
  expect(stagePoints[2].x).toBeLessThan(center.x);
  expect(stagePoints[2].y).toBeLessThan(center.y);
  for (const fill of await svg.locator("path[stroke-dasharray]").all()) {
    expect(await fill.evaluate(element => getComputedStyle(element).strokeLinecap)).toBe("round");
  }
  await page.mouse.move(stagePoints[2].x, stagePoints[2].y);
  await expect(tooltip).toContainText("실습");
  await expect(tooltip).toContainText("1/4개 완료");
  await expect(tooltip).toContainText("25%");
  await page.mouse.move(stagePoints[0].x, stagePoints[0].y);
  await expect(tooltip).toContainText("1/4개 완료");
  // Details for one sector must not obstruct the other sectors.
  await page.mouse.move(stagePoints[1].x, stagePoints[1].y);
  await expect(tooltip).toContainText("2/5개 완료");
  await page.mouse.move(stagePoints[2].x, stagePoints[2].y);
  await expect(tooltip).toContainText("1/4개 완료");
  await page.keyboard.press("Escape");
  await expect(overview.getByRole("tooltip")).toHaveCount(0);
  await expect(refresh).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(overview.getByRole("tooltip")).toHaveCount(0);
  const lessonBars = page.getByRole("region", { name: "수업별 학습 진도", exact: true });
  await expect(lessonBars.getByRole("progressbar")).toHaveCount(3);
  await expect(lessonBars).toContainText(programming.title);
  for (const link of await lessonBars.getByRole("article").getByRole("link").all()) {
    const chrome = await link.evaluate(element => {
      const style = getComputedStyle(element);
      return { border: style.borderTopWidth, background: style.backgroundColor, height: element.getBoundingClientRect().height };
    });
    expect(chrome.border).toBe("0px");
    expect(chrome.background).toBe("rgba(0, 0, 0, 0)");
    expect(chrome.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("student-progress-31-percent.png"), fullPage: true });
  await page.goto("/student/lessons");
  for (const lesson of [programming]) {
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: lesson.title, exact: true }) });
    await expect(card.getByRole("progressbar")).toHaveCount(3);
  }
});

test("0%는 실제 값과 별도의 짧은 시작 표시를 유지하고 100%는 메인·격자에서 같은 세 구간을 채움", async ({ page }, testInfo) => {
  await openLessons([programming.id]);
  await page.goto("/student");
  await expectProgress(page, "0/13", 0);
  const overview = progressRegion(page);
  await expect(overview.locator("svg [data-stage]")).toHaveCount(3);
  await expect(overview.locator("svg path[stroke-dasharray]")).toHaveCount(0);
  const start = overview.locator("svg [data-start-marker]");
  await expect(start).toHaveCount(1);
  const geometry = await start.evaluate(element => {
    const path = element as SVGGeometryElement;
    const point = path.getPointAtLength(0);
    return { startX: point.x, startY: point.y, degrees: path.getTotalLength() / 78 * 180 / Math.PI, cap: getComputedStyle(path).strokeLinecap, stroke: getComputedStyle(path).stroke };
  });
  expect(geometry.startX).toBeCloseTo(90, 1);
  expect(geometry.startY).toBeCloseTo(12, 1);
  expect(geometry.degrees).toBeGreaterThanOrEqual(4);
  expect(geometry.degrees).toBeLessThanOrEqual(6);
  expect(geometry.cap).toBe("butt");
  expect(geometry.stroke).not.toBe(await overview.locator('svg [data-stage="concept"]').evaluate(element => getComputedStyle(element).stroke));
  for (const stage of ["개념", "퀴즈", "실습"]) {
    const legend = overview.getByRole("button", { name: new RegExp(`^${stage} 진도:`) });
    await legend.focus();
    await expect(overview.getByRole("tooltip")).toContainText("0%");
    await legend.press("Escape");
    await expect(overview.getByRole("tooltip")).toHaveCount(0);
    await expect(legend).toBeFocused();
  }
  await expect(overview.getByRole("button", { name: "수업 시작", exact: true })).toHaveText("시작하기");
  const lessonRow = page.getByRole("region", { name: "수업별 학습 진도", exact: true }).getByRole("article", { name: programming.title, exact: true });
  await expect(lessonRow.getByRole("link")).toHaveText("시작하기");
  await overview.screenshot({ path: testInfo.outputPath("activity-ring-zero.png") });
  await page.goto("/student/lessons");
  const course = page.getByRole("article", { name: programming.title, exact: true });
  await expect(course.getByRole("button", { name: "수업 시작", exact: true })).toHaveText("시작하기");
  await page.getByRole("button", { name: "격자 보기", exact: true }).click();
  await expect(course.locator("svg [data-stage]")).toHaveCount(3);
  await expect(course.locator("svg path[stroke-dasharray]")).toHaveCount(0);
  await expect(course.locator("svg [data-start-marker]")).toHaveCount(1);
  await expect(course.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(course.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "필수 활동 0/13개 완료");
  const completed = emptyWork(programming);
  completed.conceptSolved = programming.concepts.map(concept => concept.id);
  completed.quizSolved = programming.quiz.map(question => question.id);
  completed.missions = Object.fromEntries(["name", "multiply", "move", "keys"].map(id => [id, { validation: null, submission: submission(`${id}-completed`) }]));
  completed.updatedAt = Date.now();
  await saveWork(completed);
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
  await expect(course.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expect(course.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "필수 활동 13/13개 완료");
  await expect(course.locator("svg path[stroke-dasharray]")).toHaveCount(3);
  await expect(course.locator("svg [data-start-marker]")).toHaveCount(0);
  await course.screenshot({ path: testInfo.outputPath("activity-ring-grid-completed.png") });
  await page.goto("/student");
  await expectProgress(page, "13/13", 100);
  await expect(overview.locator("svg [data-start-marker]")).toHaveCount(0);
  for (const label of ["개념", "퀴즈", "실습"]) {
    const legend = overview.getByRole("button", { name: new RegExp(`^${label} 진도:`) });
    await legend.focus();
    await expect(overview.getByRole("tooltip")).toContainText("100%");
    await legend.press("Escape");
    await expect(overview.getByRole("tooltip")).toHaveCount(0);
    await expect(legend).toBeFocused();
  }
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).focus();
  await overview.screenshot({ path: testInfo.outputPath("activity-ring-main-completed.png") });
});

test("단계별 0%와 100%를 터치로 확인하고 정규 수업과 복습을 좁은 창에서 구분", async ({ page, browser }, testInfo) => {
  await openLessons([programming.id, ...reviews.map(lesson => lesson.id)], programming.id);
  const work = emptyWork(programming);
  work.conceptSolved = programming.concepts.map(concept => concept.id);
  work.updatedAt = Date.now();
  await saveWork(work);
  await page.goto("/student");
  const overview = progressRegion(page);
  const concept = overview.getByRole("button", { name: /^개념 진도:/ });
  const quiz = overview.getByRole("button", { name: /^퀴즈 진도:/ });
  await expect(concept).toHaveAccessibleName("개념 진도: 4/4개 완료, 100%");
  await expect(quiz).toHaveAccessibleName("퀴즈 진도: 0/5개 완료, 0%");
  await expect(overview.locator("svg [data-start-marker]")).toHaveCount(0);
  const lessons = page.getByRole("region", { name: "수업별 학습 진도", exact: true });
  await expect(lessons.getByRole("article")).toHaveCount(1);
  await expect(lessons.getByRole("link", { name: "선택 복습 수업 둘러보기", exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
    const refreshBox = (await refresh.boundingBox())!;
    const overviewBox = (await overview.boundingBox())!;
    expect(refreshBox.width).toBeLessThanOrEqual(48);
    expect(refreshBox.height).toBeLessThanOrEqual(48);
    expect(refreshBox.x).toBeGreaterThan(overviewBox.x + overviewBox.width / 2);
    await expect(refresh).toHaveText("");
    const rows = lessons.getByRole("article");
    const first = (await rows.first().boundingBox())!;
    const last = (await rows.last().boundingBox())!;
    expect(last.y + last.height - first.y, `정규 수업 진도는 ${width}px에서 간결하게 표시`).toBeLessThanOrEqual(400);
    for (const row of await rows.all()) {
      const bars = await row.getByRole("progressbar").all();
      const boxes = await Promise.all(bars.map(bar => bar.boundingBox()));
      expect(Math.max(...boxes.map(box => box!.y)) - Math.min(...boxes.map(box => box!.y))).toBeLessThan(2);
      await expect(row.getByRole("link")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("student-progress-compact-320.png"), fullPage: true });
  // One open course reaches 100% independently of its unanswered quizzes and practice.
  await openLessons([programming.id]);
  const context = await browser.newContext({ baseURL: "http://localhost:3000", hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    await context.addCookies(await page.context().cookies());
    const touchPage = await context.newPage();
    await touchPage.goto("/student");
    await expectProgress(touchPage, "4/13", 31);
    const touchOverview = progressRegion(touchPage);
    const touchConcept = touchOverview.getByRole("button", { name: /^개념 진도:/ });
    await expect(touchConcept).toHaveAccessibleName("개념 진도: 4/4개 완료, 100%");
    await touchConcept.tap();
    await expect(touchOverview.getByRole("tooltip")).toContainText("4/4개 완료");
    await expect(touchOverview.getByRole("tooltip")).toContainText("100%");
    await touchOverview.getByRole("button", { name: /^퀴즈 진도:/ }).tap();
    await expect(touchOverview.getByRole("tooltip")).toContainText("0/5개 완료");
    await expect(touchOverview.getByRole("tooltip")).toContainText("0%");
    await touchPage.getByRole("button", { name: "수업 새로고침", exact: true }).tap();
    await expect(touchOverview.getByRole("tooltip")).toHaveCount(0);
    await expectProgress(touchPage, "4/13", 31);
  } finally { await context.close(); }
});

test("수업 목록·격자 전환에서 필터·현재 수업 순서·복습 제외·이어서 이동을 유지", async ({ page }, testInfo) => {
  const finishedReview = reviews.find(lesson => lesson.id === "review-sandwich")!;
  await openLessons([programming.id, ...reviews.map(lesson => lesson.id)], programming.id);
  const finished = emptyWork(finishedReview);
  finished.conceptSolved = finishedReview.concepts.map(concept => concept.id);
  finished.quizSolved = finishedReview.quiz.map(question => question.id);
  finished.submission = submission("review-finished");
  finished.updatedAt = Date.now();
  await saveWork(finished);
  const partial = emptyWork(programming);
  partial.conceptSolved = ["pc0"];
  partial.quizSolved = ["language", "flow"];
  partial.missions = { name: { validation: null, submission: submission("name-finished") } };
  partial.draft.stage = "practice";
  partial.draft.programming!.mission = "multiply";
  partial.updatedAt = Date.now();
  await saveWork(partial);
  await page.goto("/student/lessons");
  const list = page.getByRole("button", { name: "목록 보기", exact: true });
  const grid = page.getByRole("button", { name: "격자 보기", exact: true });
  const cards = page.getByRole("article");
  const programCard = page.getByRole("article", { name: programming.title, exact: true });
  const finishedCard = page.getByRole("article", { name: finishedReview.title, exact: true });
  const reviewCard = page.getByRole("article", { name: review.title, exact: true });
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(grid).toHaveAttribute("aria-pressed", "false");
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveAccessibleName(programming.title);
  await expect(programCard).toContainText("이어갈 곳: 실습 · 곱셈 계산기");
  await expect(programCard.getByRole("progressbar")).toHaveCount(3);
  await grid.focus();
  await grid.press("Enter");
  await expect(grid).toBeFocused();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  const programRing = programCard.getByRole("progressbar", { name: `${programming.title} 필수 활동 완료율`, exact: true });
  await expect(programRing).toHaveAttribute("aria-valuenow", "31");
  await expect(programRing).toHaveAttribute("aria-valuetext", "필수 활동 4/13개 완료");
  await expect(programCard.locator("svg [data-stage]")).toHaveCount(3);
  await expect(programCard.locator("svg [data-start-marker]")).toHaveCount(0);
  await expect(finishedCard.getByRole("progressbar")).toHaveCount(0);
  await expect(finishedCard).toContainText("복습 수업");
  await expect(page.getByText("완료한 수업", { exact: true }).locator("..").locator("dd")).toHaveText("1개");
  await expect(reviewCard.getByRole("progressbar")).toHaveCount(0);
  await expect(reviewCard.locator("svg [data-stage]")).toHaveCount(0);
  await expect(reviewCard).toContainText("선택 복습 · 성적에 반영하지 않아요");
  const filters = page.getByRole("group", { name: "열린 수업 필터", exact: true });
  const unfinished = filters.getByRole("button", { name: "미완료", exact: true });
  await unfinished.click();
  await expect(unfinished).toBeFocused();
  await expect(cards).toHaveCount(3);
  await expect(finishedCard).toHaveCount(0);
  await expect(cards.first()).toHaveAccessibleName(programming.title);
  await list.focus();
  await list.press("Enter");
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(unfinished).toHaveAttribute("aria-pressed", "true");
  await expect(programCard.getByRole("progressbar")).toHaveCount(3);
  await expect(reviewCard.getByRole("progressbar")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(grid).toBeFocused();
  await grid.press("Space");
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await filters.getByRole("button", { name: "완료", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toHaveAccessibleName(finishedReview.title);
  await expect(finishedCard.getByRole("progressbar")).toHaveCount(0);
  await filters.getByRole("button", { name: "전체", exact: true }).click();
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveAccessibleName(programming.title);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(programRing).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("student-lessons-grid-390.png"), fullPage: true });
  await page.route(studentEndpoint, route => route.fulfill({ status: 503, json: { message: "격자 진도 조회 연결 실패" } }));
  const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
  await refresh.focus();
  await refresh.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "격자 진도 조회 연결 실패" })).toContainText("마지막으로 확인한 수업");
  await expect(refresh).toBeFocused();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveCount(4);
  await expect(programRing).toHaveAttribute("aria-valuenow", "31");
  await page.unroute(studentEndpoint);
  const resume = programCard.getByRole("button", { name: "이어하기", exact: true });
  await expect(resume).toHaveAttribute("href", `/classroom/${programming.id}?from=lessons`);
  await resume.focus();
  await resume.press("Enter");
  await expect(page).toHaveURL(/\/classroom\/programming-13\?from=lessons$/);
  await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toBeVisible();
});

test("초안·검증은 집계하지 않고 제출 후 수정 완료를 유지하며 좁은 창에서 이어하기", async ({ page }) => {
  await openLessons([programming.id]);
  let work = emptyWork(programming);
  work.draft.conceptAnswers = { pc0: "0" };
  work.draft.quizAnswers = { language: "0" };
  work.draft.programming!.projects.name = nameProject;
  work.updatedAt = Date.now();
  await saveWork(work);
  await page.goto("/student");
  await expectProgress(page, "0/13", 0);
  work = await action(page, work, { type: "validate-practice", missionId: "name" });
  await page.reload();
  await expectProgress(page, "0/13", 0);
  work = await action(page, work, { type: "submit-practice", missionId: "name" });
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
  await expectProgress(page, "1/13", 8);
  const previous = work.missions!.name.submission;
  const draft = { ...work.draft, programming: { ...work.draft.programming!, projects: { name: buildProgrammingProject() } } };
  const saved = await page.request.post(endpoint, { headers, data: { revision: work.revision, draft } });
  expect(saved.status()).toBe(200);
  const modified = await saved.json() as Work;
  expect(modified.missions!.name.validation).toBeNull();
  expect(modified.missions!.name.submission).toEqual(previous);
  await page.reload();
  await expectProgress(page, "1/13", 8);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const continuation = page.getByRole("button", { name: "이어하기", exact: true }).first();
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).focus();
  for (let index = 0; index < 20 && !await continuation.evaluate(element => element === document.activeElement); index++) await page.keyboard.press("Tab");
  await expect(continuation).toBeFocused();
  await continuation.press("Enter");
  await expect(page).toHaveURL(/\/classroom\/programming-13\?from=dashboard$/);
  await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toBeVisible();
});

test("빈 반과 선택 복습만 열린 반은 0% 대신 집계를 기다림", async ({ page }) => {
  for (const ids of [[], [review.id]]) {
    await openLessons(ids);
    await page.goto("/student");
    const region = progressRegion(page);
    await expect(region.getByText("아직 열린 정규 수업이 없어요.", { exact: true })).toBeVisible();
    await expect(region.getByRole("progressbar")).toHaveCount(0);
    await expect(region.locator("svg [data-start-marker]")).toHaveCount(0);
    await expect(region).not.toContainText("0%");
    await expect(region).not.toContainText("0/0");
  }
});

test("followup45-home: 390×720에서 미지정·시작·이어하기를 먼저 보여주고 열린 수업으로 진입", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 720 });
  const resumed = emptyWork(programming);
  resumed.conceptSolved = ["pc0"];
  resumed.updatedAt = 1_700_000_000_000;
  const fixtures = [
    { id: "unassigned", lessons: [programming], current: null, label: "열린 수업 보기", work: {}, regular: true },
    { id: "start", lessons: [programming], current: programming.id, label: "수업 시작", work: {}, regular: true },
    { id: "resume", lessons: [programming], current: programming.id, label: "이어하기", work: { [programming.id]: resumed }, regular: true },
    { id: "empty", lessons: [], current: null, label: "열린 수업 보기", work: {}, regular: false },
    { id: "review-only", lessons: [review], current: review.id, label: "수업 시작", work: {}, regular: false },
  ];
  for (const fixture of fixtures) await test.step(fixture.id, async () => {
    await showDashboardFixture(page, fixture.lessons, fixture.current, fixture.work);
    const overview = progressRegion(page);
    const enter = overview.getByRole("button", { name: fixture.label, exact: true });
    await expectMobileCurrentFirst(page);
    const box = (await enter.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `${fixture.id} 주 버튼 전체가 첫 화면 안에 표시됨`).toBeLessThanOrEqual(720);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    if (fixture.regular) {
      await expect(overview.getByRole("progressbar")).toHaveCount(1);
      await expect(overview.locator("svg").filter({ has: page.locator("[data-stage]") })).toHaveCount(1);
      for (const stage of ["개념", "퀴즈", "실습"]) {
        const legend = (await overview.getByRole("button", { name: new RegExp(`^${stage} 진도:`) }).boundingBox())!;
        expect(legend.width).toBeGreaterThanOrEqual(44);
        expect(legend.height).toBeGreaterThanOrEqual(44);
      }
    } else {
      await expect(overview.getByText("아직 열린 정규 수업이 없어요.", { exact: true })).toBeVisible();
      await expect(overview.getByRole("progressbar")).toHaveCount(0);
      await expect(overview).not.toContainText("0%");
      await expect(overview).not.toContainText("0/0");
    }
    const path = fixture.current ? `/classroom/${fixture.current}?from=dashboard` : "/student/lessons";
    await expect(enter).toHaveAttribute("href", path);
    if (["unassigned", "start", "resume"].includes(fixture.id)) await page.screenshot({ path: testInfo.outputPath(`followup45-home-${fixture.id}-390.png`), fullPage: true });
    await page.unrouteAll({ behavior: "wait" });
    await enter.focus();
    await enter.press("Enter");
    await expect(page).toHaveURL(`http://localhost:3000${path}`);
    if (fixture.current) {
      await expect(page.getByRole("heading", { name: fixture.lessons[0].title, level: 1, exact: true })).toBeVisible();
      await expect(page.getByRole("tab", { name: fixture.id === "resume" ? "개념 25%" : "개념 0%", exact: true })).toHaveAttribute("aria-selected", "true");
      const content = page.getByRole("tabpanel", { name: /^개념/ });
      await expect(content).toBeVisible();
      await expect(content.locator('[id^="concept-title"]').first()).toBeVisible();
    } else await expect(page.getByRole("heading", { name: "열린 수업을 살펴봐요.", level: 1, exact: true })).toBeVisible();
  });
});

test("comments-layout/followup45-home: 반응형 경계에서 카드 높이·원형·진입 요소와 초점을 유지하고 진입 다음 범례로 이동", async ({ page }) => {
  const work = emptyWork(programming);
  work.conceptSolved = ["pc0"];
  work.updatedAt = 1_700_000_000_000;
  await showDashboardFixture(page, [programming], programming.id, { [programming.id]: work });
  await expectProgress(page, "1/13", 8);
  const overview = progressRegion(page);
  const enter = overview.getByRole("button", { name: "이어하기", exact: true });
  const ring = overview.locator("svg").filter({ has: page.locator("[data-stage]") });
  const bar = overview.getByRole("progressbar", { name: "전체 필수 활동 완료율", exact: true });
  const legends = ["개념", "퀴즈", "실습"].map(stage => overview.getByRole("button", { name: new RegExp(`^${stage} 진도:`) }));
  for (const width of [320, 390, 600, 601, 820, 821, 1280, 1544]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px에서 가로 넘침 없음`).toBe(true);
    await expect(ring).toHaveCount(1);
    await expect(bar).toHaveCount(1);
    if (width === 1544) expect((await overview.boundingBox())!.height, "이번 수업 카드의 높이를 줄이되 진도와 조작 영역 유지").toBeLessThanOrEqual(330);
    if (width <= 600) await expectMobileCurrentFirst(page);
    else {
      const summary = (await overview.locator("#learning-overview-heading").locator("..").boundingBox())!;
      const current = (await overview.locator("#current-heading").locator("..").boundingBox())!;
      expect(summary.x + summary.width, `${width}px에서 기존 진도 왼쪽·이번 수업 오른쪽 배치`).toBeLessThanOrEqual(current.x);
    }
    for (const legend of legends) {
      const box = (await legend.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 600, height: 720 });
  const handles = await Promise.all([enter, ring, bar, ...legends].map(element => element.elementHandle()));
  for (const control of [enter, legends[0]]) {
    await control.focus();
    const focused = await control.elementHandle();
    for (const width of [601, 600]) {
      await page.setViewportSize({ width, height: 720 });
      await expect(control).toBeFocused();
      expect(await focused!.evaluate(element => element === document.activeElement)).toBe(true);
      for (const handle of handles) expect(await handle!.evaluate(element => element.isConnected), "반응형 전환에서 같은 진입·원형·범례 요소 유지").toBe(true);
      await expect(ring).toHaveCount(1);
    }
  }
  await legends[0].press("Escape");
  await expect(overview.getByRole("tooltip")).toHaveCount(0);
  await expect(legends[0]).toBeFocused();
  for (const width of [600, 601, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await enter.focus();
    for (const legend of legends) {
      await page.keyboard.press("Tab");
      await expect(legend).toBeFocused();
    }
  }
  await page.setViewportSize({ width: 600, height: 720 });
  const menu = page.getByRole("button", { name: "메뉴 열기", exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "메뉴 닫기", exact: true }).first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
});

test("followup45-home: 긴 제목과 낮은 창은 글자를 자르지 않고 세로 스크롤로 수업에 진입", async ({ page }) => {
  const longLesson = { ...programming, title: "우리 반의 아주 긴 프로그래밍 수업 제목과 여러 가지 컴퓨터 활용 활동 ".repeat(5).trim(), description: "친구들과 차근차근 활동을 살펴보고 저장한 학습을 이어가요. ".repeat(4).trim() };
  await showDashboardFixture(page, [longLesson], longLesson.id);
  const overview = progressRegion(page);
  const heading = overview.getByRole("heading", { name: longLesson.title, exact: true });
  const enter = overview.getByRole("button", { name: "수업 시작", exact: true });
  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 480 }]) {
    await page.setViewportSize(viewport);
    await expectMobileCurrentFirst(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(heading).toHaveText(longLesson.title);
    const text = await heading.evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight, width: element.clientWidth, contentWidth: element.scrollWidth, fontSize: parseFloat(getComputedStyle(element).fontSize) }));
    expect(text.contentHeight).toBeLessThanOrEqual(text.height + 1);
    expect(text.contentWidth).toBeLessThanOrEqual(text.width + 1);
    expect(text.fontSize).toBeGreaterThanOrEqual(22);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
    await enter.focus();
    await expect(enter).toBeFocused();
    await expect.poll(async () => {
      const currentBox = await enter.boundingBox();
      return !!currentBox && currentBox.y >= 0 && currentBox.y + currentBox.height <= viewport.height;
    }).toBe(true);
    const box = (await enter.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
  await page.unrouteAll({ behavior: "wait" });
  await enter.press("Enter");
  await expect(page).toHaveURL(`http://localhost:3000/classroom/${programming.id}?from=dashboard`);
  await expect(page.getByRole("heading", { name: programming.title, level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "개념 0%", exact: true })).toHaveAttribute("aria-selected", "true");
  const content = page.getByRole("tabpanel", { name: /^개념/ });
  await expect(content).toBeVisible();
  await expect(content.locator('[id^="concept-title"]').first()).toBeVisible();
});

test("첫 조회는 초점을 유지하며 대기·실패의 가짜 0%와 재조회 실패의 진도 유실을 방지", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await openLessons([programming.id]);
  const work = emptyWork(programming);
  work.missions = { name: { validation: null, submission: submission("saved-name") } };
  work.updatedAt = Date.now();
  await saveWork(work);
  let mode: "waiting" | "failed" | "live" = "waiting";
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(studentEndpoint, async route => {
    if (mode === "waiting") await gate;
    if (mode === "failed") await route.fulfill({ status: 503, json: { message: "진도 조회 연결 실패" } });
    else await route.continue();
  });
  try {
    await page.goto("/student");
    await expect(page.getByRole("status").filter({ hasText: "수업 기록을 확인하고 있어요." })).toBeVisible();
    await expect(progressRegion(page).getByRole("progressbar")).toHaveCount(0);
    await expect(progressRegion(page).locator("svg [data-start-marker]")).toHaveCount(0);
    await expect(progressRegion(page).locator("#current-heading")).toHaveText("이번 수업을 확인하고 있어요.");
    await expectMobileCurrentFirst(page);
    const enterLessons = page.getByRole("button", { name: "열린 수업 보기", exact: true });
    await enterLessons.focus();
    await expect(enterLessons).toBeFocused();
    const focusedButton = await enterLessons.elementHandle();
    mode = "live"; release();
    await expectProgress(page, "1/13", 8);
    await expectMobileCurrentFirst(page);
    expect(await focusedButton!.evaluate(element => element === document.activeElement)).toBe(true);
    mode = "failed";
    await page.reload();
    await expect(page.getByRole("alert").filter({ hasText: "진도 조회 연결 실패" })).toBeVisible();
    await expect(progressRegion(page).getByRole("progressbar")).toHaveCount(0);
    await expect(progressRegion(page).locator("svg [data-start-marker]")).toHaveCount(0);
    await expect(progressRegion(page).locator("#current-heading")).toHaveText("이번 수업을 확인하지 못했어요.");
    await expectMobileCurrentFirst(page);
    mode = "live";
    await page.getByRole("button", { name: "수업 다시 불러오기", exact: true }).click();
    await expectProgress(page, "1/13", 8);
    const savedEnter = await progressRegion(page).getByRole("button", { name: "이어하기", exact: true }).elementHandle();
    const savedRing = await progressRegion(page).getByRole("progressbar").elementHandle();
    mode = "failed";
    const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
    await refresh.click();
    await expect(page.getByRole("alert").filter({ hasText: "마지막으로 확인한 수업 기록" })).toBeVisible();
    await expectProgress(page, "1/13", 8);
    await expectMobileCurrentFirst(page);
    await expect(progressRegion(page).locator("#current-heading")).toHaveText(programming.title);
    expect(await savedEnter!.evaluate(element => element.isConnected)).toBe(true);
    expect(await savedRing!.evaluate(element => element.isConnected)).toBe(true);
    await expect(refresh).toBeFocused();
  } finally { release(); }
});
