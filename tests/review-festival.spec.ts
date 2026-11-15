import { expect, test, type Locator, type Page } from "@playwright/test";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FestivalProject } from "../src/lib/classroom/review/project";

const id = "review-festival", endpoint = `/api/classroom/work/${id}`, workPath = `csWork/student-20101__${id}`;
const frame = (page: Page) => page.locator('iframe[title="내일, 축제에서 만나 게임"]');
const game = (page: Page) => page.frameLocator('iframe[title="내일, 축제에서 만나 게임"]');
const status = (page: Page) => page.locator("[data-lesson-shell] header [role=status]");
const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();
const project = async (page: Page) => (await stored(page)).draft.reviewProject as FestivalProject;
const firstTry = (...questionIds: string[]) => Object.fromEntries(questionIds.map(questionId => [questionId, { firstAttempt: true, solved: true, conceptTitle: questionId }]));
const retried = (questionId: string) => ({ [questionId]: { firstAttempt: false, solved: true, conceptTitle: questionId } });
const chapterOneEnd = { onboarded: true, chapterId: 1, sceneId: "ch1-7", activeRuns: { 1: { missedThisRun: {}, solvedThisRun: firstTry("ch1-q1", "ch1-q2", "ch1-q3", "ch1-q4") } } } as Partial<FestivalProject>;
const beforeEnding = {
  onboarded: true, chapterId: 3, sceneId: "ch3-6",
  chapterResults: {
    1: { completed: true, hearts: 3, questions: { ...firstTry("ch1-q1", "ch1-q3", "ch1-q4"), ...retried("ch1-q2") } },
    2: { completed: true, hearts: 4, questions: firstTry("ch2-q1", "ch2-q2", "ch2-q3", "ch2-q4") },
    3: { completed: false, hearts: 0, questions: {} },
  },
  activeRuns: { 3: { missedThisRun: { "ch3-q4": true }, solvedThisRun: { ...firstTry("ch3-q1", "ch3-q2", "ch3-q3"), ...retried("ch3-q4") } } },
} as Partial<FestivalProject>;
// Console errors and uncaught exceptions anywhere on the page, the game frame included.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
let classBefore: FirebaseFirestore.DocumentData | undefined;

test.beforeEach(async ({ page }) => {
  await page.goto("about:blank");
  classBefore = (await db.doc("csClasses/2-1").get()).data();
  // A first-time student's title screen looks the same before and after festival:init, so mark its arrival in the game frame.
  await page.addInitScript(() => addEventListener("message", event => { if (event.data?.type === "festival:init") document.documentElement.dataset.testInit = "true"; }));
});
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  if (classBefore) await db.doc("csClasses/2-1").set(classBefore);
  await db.doc(workPath).delete();
});

async function open(page: Page) {
  await page.goto(`/classroom/${id}?from=lessons`);
  await expect(game(page).locator("html[data-test-init]")).toBeAttached();
}
// Saves a game state through the classroom API, as a student who played up to it would have.
async function prepare(page: Page, state: Partial<FestivalProject>) {
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ currentLessonId: null, openedLessonIds: [id] });
  await db.doc(workPath).delete();
  const work = await stored(page);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, reviewProject: { ...work.draft.reviewProject, ...state } } } })).status()).toBe(200);
}
// Moves the story on, taking the first answer that does not push 하루 away, until `target` shows.
async function playUntil(page: Page, target: Locator) {
  for (let step = 0; step < 40 && !(await target.count()); step++) {
    const answers = game(page).locator('#story-choices:not([hidden]) button:not([data-cold-choice="true"])');
    await (await answers.count() ? answers.first() : game(page).locator("#next-button")).click();
  }
  await expect(target).toBeVisible();
}

test("교사가 연 축제 게임은 창을 채우고, 게임 안 Ctrl+S로 저장한 장면에서 새로고침 뒤 이어진다", async ({ page, browser }) => {
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ currentLessonId: null, openedLessonIds: [] });
  await db.doc(workPath).delete();
  const teacher = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher.request);
    const manage = await teacher.newPage();
    await manage.goto("/teacher/classes?classId=2-1");
    await manage.getByRole("button", { name: "수업 관리", exact: true }).click();
    const dialog = manage.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
    await dialog.getByRole("checkbox", { name: /내일, 축제에서 만나/ }).check();
    await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
    await expect(dialog).toBeHidden();
  } finally { await teacher.close(); }
  expect((await db.doc("csClasses/2-1").get()).data()!.openedLessonIds).toEqual([id]);

  const errors = watchErrors(page);
  await page.setViewportSize({ width: 1366, height: 657 });
  await open(page);
  await expect(page.getByRole("tablist", { name: "수업 단계" })).toBeHidden();
  await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  const header = page.locator("[data-lesson-shell] > header");
  // A Chromebook window gets a side rail and a game as tall as the window; a portrait tablet gets a slim top row.
  let box = (await frame(page).boundingBox())!, bar = (await header.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(bar.x + bar.width);
  expect([box.y, box.height, box.x + box.width]).toEqual([0, 657, 1366]);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(async () => (await header.boundingBox())!.width).toBe(768);
  box = (await frame(page).boundingBox())!; bar = (await header.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  expect([box.x, box.width, box.y + box.height]).toEqual([0, 768, 1024]);

  await game(page).getByRole("button", { name: "새 이야기 시작", exact: true }).click();
  await game(page).locator("#onboard-name").fill("축제단");
  await game(page).getByRole("button", { name: "1챕터 시작하기 →", exact: true }).click();
  await expect(game(page).getByRole("heading", { name: "밤 11시 14분, 버그 제보", exact: true })).toBeVisible();
  const episode = game(page).getByRole("heading", { name: /^EP 1 · / });
  await playUntil(page, episode);
  await expect(status(page)).toHaveText("저장하지 않은 변경 있음");
  const save = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === endpoint);
  await game(page).locator("body").press("Control+s");
  await save;
  await expect(status(page)).toHaveText("저장 완료");
  expect(await project(page)).toMatchObject({ nickname: "축제단", onboarded: true, chapterId: 1, sceneId: "ch1-2" });

  await page.reload();
  await expect(game(page).locator("html[data-test-init]")).toBeAttached();
  await expect(episode).toBeVisible();
  expect(errors).toEqual([]);
});

test("1장을 끝내면 저장 버튼 없이 한 번 저장된다", async ({ page }) => {
  await prepare(page, chapterOneEnd);
  const errors = watchErrors(page);
  const saves: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === endpoint) saves.push(request.url()); });
  await open(page);
  await expect(game(page).getByRole("heading", { name: "자정 직전, 첫 단추 완료", exact: true })).toBeVisible();
  await playUntil(page, game(page).getByRole("heading", { name: "1장 완료 · 밤의 디버깅 보고서", exact: true }));
  await expect(game(page).getByText("1장 하트: ♥ 4 / 4", { exact: true })).toBeVisible();
  await expect.poll(async () => (await project(page)).chapterResults[1]).toMatchObject({ completed: true, hearts: 4 });
  await expect(status(page)).toHaveText("저장 완료");
  expect(saves).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("저장하는 동안 장을 끝내도 그 장의 완료가 이어서 저장된다", async ({ page }) => {
  await prepare(page, chapterOneEnd);
  const errors = watchErrors(page), posted: boolean[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    posted.push(route.request().postDataJSON().draft.reviewProject.chapterResults[1].completed);
    // The first save stays in flight while the chapter ends.
    if (posted.length === 1) await held;
    await route.continue();
  });
  await open(page);
  await expect(game(page).getByRole("heading", { name: "자정 직전, 첫 단추 완료", exact: true })).toBeVisible();
  // Switching 하루's voice is a change the game reports, so the in-game Ctrl+S has something to save.
  await game(page).getByRole("radio", { name: "여", exact: true }).check();
  await expect(status(page)).toHaveText("저장하지 않은 변경 있음");
  await game(page).locator("body").press("Control+s");
  await expect.poll(() => posted.length).toBe(1);
  await playUntil(page, game(page).getByRole("heading", { name: "1장 완료 · 밤의 디버깅 보고서", exact: true }));
  release();
  await expect.poll(async () => (await project(page)).chapterResults[1]).toMatchObject({ completed: true, hearts: 4 });
  await expect(status(page)).toHaveText("저장 완료");
  expect(posted).toEqual([false, true]);
  expect(errors).toEqual([]);
});

test("첫 시도에 틀리고 저장한 문항은 다시 열어 맞혀도 하트를 주지 않는다", async ({ page }) => {
  await prepare(page, { onboarded: true, chapterId: 1, sceneId: "ch1-2", activeRuns: { 1: { missedThisRun: {}, solvedThisRun: {} } } });
  const errors = watchErrors(page);
  await open(page);
  const heart = game(page).locator('#chapter-hearts [aria-label^="문항 1 "]'), choice = game(page).locator("[data-quiz-choice]").first();
  await expect(heart).toHaveAttribute("aria-label", "문항 1 도전 전");
  await playUntil(page, choice);
  await game(page).locator('[data-quiz-choice="set-ask-say"]').click();
  await expect(heart).toHaveAttribute("aria-label", "문항 1 첫 시도 실패");
  await game(page).locator("body").press("Control+s");
  await expect.poll(async () => (await project(page)).activeRuns[1]?.missedThisRun).toEqual({ "ch1-q1": true });

  await page.reload();
  await expect(game(page).locator("html[data-test-init]")).toBeAttached();
  await expect(heart).toHaveAttribute("aria-label", "문항 1 첫 시도 실패");
  await playUntil(page, choice);
  await game(page).locator('[data-quiz-choice="ask-set-say"]').click();
  await expect(game(page).locator("#companion-note-text")).toContainText("다음엔 첫 시도에 노려 보자");
  await expect(heart).toHaveAttribute("aria-label", "문항 1 첫 시도 실패");
  await expect(game(page).locator("#total-hearts")).toHaveText("총 ♥ 0/12");
  await game(page).locator("body").press("Control+s");
  await expect.poll(async () => (await project(page)).activeRuns[1]?.solvedThisRun["ch1-q1"]).toMatchObject({ solved: true, firstAttempt: false });
  expect(errors).toEqual([]);
});

test("엔딩 직전 상태에서 끝내면 제출되고 교사는 하트·엔딩·놓친 문항을 본다", async ({ page, browser }) => {
  await prepare(page, beforeEnding);
  const errors = watchErrors(page), actions: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === `${endpoint}/action`) actions.push(request.postDataJSON().action.type); });
  await open(page);
  await expect(game(page).getByRole("heading", { name: "점등 직전 · 마음 선택지 ②", exact: true })).toBeVisible();
  await playUntil(page, game(page).locator('.ending-report-layout[data-outcome="friend"]'));
  await expect(page.locator("#review-action-feedback")).toHaveText("복습 기록을 남겼어요.");
  // The game shows its own ending report; no completion card covers it.
  await expect(page.locator("[data-lesson-complete]")).toHaveCount(0);
  expect(actions).toEqual(["validate-practice", "submit-practice"]);
  expect(errors).toEqual([]);
  const work = await stored(page);
  expect(work.validation?.passed).toBe(true);
  expect(work.submission?.reviewProject).toMatchObject({ type: "festival", endingOutcome: "friend", totalHearts: 10 });

  const teacher = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher.request);
    const students = await teacher.newPage();
    await students.goto(`/teacher/students?classId=2-1&lessonId=${id}`);
    await students.locator("tbody tr").filter({ hasText: "20101" }).getByRole("button", { name: "20101 제출 작품 보기", exact: true }).click();
    const viewer = students.getByRole("dialog", { name: "20101 학생의 제출 작품", exact: true });
    await expect(viewer.getByText("총 하트 10/12개 · 엔딩 찐친", { exact: true })).toBeVisible();
    for (const [chapter, hearts] of [[1, 3], [2, 4], [3, 3]]) await expect(viewer.getByText(`${chapter}장 하트 ${hearts}/4개`, { exact: true })).toBeVisible();
    const missed = viewer.getByRole("heading", { name: "첫 시도에 놓친 문항", exact: true }).locator("+ ul > li");
    await expect(missed).toHaveText(["EP 2 · 초대장에 찍힌 '정문 님'", "EP 12 · 피날레 직전, 1에서 멈춘 카운터"]);
  } finally { await teacher.close(); }
});

test("엔딩 기록을 남기지 못하면 결과를 확인한 뒤 보이는 버튼 하나로 마저 남긴다", async ({ page }) => {
  await prepare(page, beforeEnding);
  let dropped = false;
  await page.route(`**${endpoint}/action`, route => {
    // The first check never reaches the server, as on a Wi-Fi drop.
    if (!dropped && route.request().postDataJSON().action.type === "validate-practice") { dropped = true; return route.abort("internetdisconnected"); }
    return route.continue();
  });
  await open(page);
  await playUntil(page, game(page).locator('.ending-report-layout[data-outcome="friend"]'));
  const failure = page.locator("#work-action-error"), finish = page.getByRole("button", { name: "복습 기록 남기기", exact: true });
  await expect(failure).toContainText("요청 결과를 확인해 주세요.");
  await expect(finish).toBeDisabled();
  await failure.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await failure.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true }).click();
  await expect(failure).toBeHidden();
  // The resent check passed but nothing is submitted yet, so focus goes to the visible button that finishes it.
  await expect(finish).toBeFocused();
  await finish.click();
  await expect(page.locator("#review-action-feedback")).toHaveText("복습 기록을 남겼어요.");
  await expect(finish).toBeHidden();
  // With the button gone, focus returns to the game.
  await expect(frame(page)).toBeFocused();
  expect((await stored(page)).submission?.reviewProject).toMatchObject({ type: "festival", endingOutcome: "friend", totalHearts: 10 });
});

test("저장 기록이 충돌해 서버 기록과 비교하는 동안 엔딩 안내를 읽어 주지 않는다", async ({ page }) => {
  await prepare(page, chapterOneEnd);
  await open(page);
  // Another window saves first, so this page's next save is refused as a revision conflict.
  const work = await stored(page);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, reviewProject: { ...work.draft.reviewProject, nickname: "다른창" } } } })).status()).toBe(200);
  await game(page).getByRole("radio", { name: "여", exact: true }).check();
  await game(page).locator("body").press("Control+s");
  const compare = page.getByRole("button", { name: "서버 기록과 비교", exact: true });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}`, async route => { if (route.request().method() === "GET") await held; await route.continue(); });
  await compare.click();
  // Comparing marks the work busy (the button turns off) while nothing is being finished.
  await expect(compare).toBeDisabled();
  await expect(page.locator("#review-action-feedback")).toHaveText("");
  release();
  await expect(page.getByRole("region", { name: "저장 충돌 비교", exact: true })).toBeVisible();
});

test("200% 확대한 크롬북 창에서도 레일을 굴려 학생 메뉴의 로그아웃까지 닿는다", async ({ page }) => {
  await prepare(page, { onboarded: true, chapterId: 1, sceneId: "ch1-2" });
  // During class the teacher's current lesson adds a link to the rail.
  await db.doc("csClasses/2-1").update({ currentLessonId: "programming-13", openedLessonIds: [id, "programming-13"] });
  const errors = watchErrors(page);
  // 1366x657 at 200% zoom is 683x328 CSS pixels, still wider than the 16:9 game, so the header stays a side rail.
  await page.setViewportSize({ width: 683, height: 328 });
  await open(page);
  const current = page.getByRole("link", { name: /^이번 수업:/ }), menu = page.getByRole("button", { name: "학생 메뉴", exact: true });
  await expect(current).toBeVisible();
  expect(await current.evaluate(link => parseFloat(getComputedStyle(link).fontSize))).toBeGreaterThanOrEqual(13);
  // The longest save status wraps to the most lines in the rail.
  await game(page).getByRole("radio", { name: "여", exact: true }).check();
  await expect(status(page)).toHaveText("저장하지 않은 변경 있음");
  // Wheel over the rail, as a mouse user would; Playwright's own clicks would scroll even an unscrollable box.
  await page.mouse.move(50, 200);
  await page.mouse.wheel(0, 800);
  await expect(menu).toBeInViewport({ ratio: 1 });
  await menu.click();
  const logout = page.getByRole("button", { name: "로그아웃", exact: true });
  await page.mouse.move(50, 200);
  await page.mouse.wheel(0, 800);
  await expect(logout).toBeInViewport({ ratio: 1 });
  expect(errors).toEqual([]);
});
