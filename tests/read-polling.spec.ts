import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { randomUUID } from "node:crypto";
import { expect, test, type Page, type Request } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import type { HelpRequest } from "../src/lib/classroom/help";
import { db, lessonId, readyStudent, readyTeacher } from "./emulator";

const lesson = LESSONS.find(item => item.id === lessonId)!;
const classroom = (id: string) => ({ id, name: `2학년 ${id.slice(2)}반`, revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });
const studentHelp: HelpRequest = { id: randomUUID(), uid: "student-20101", studentId: "20101", classId: "2-1", lessonId, stage: "concept", mission: null, requestedAt: Date.now(), revision: 0, status: "pending" };
const helpUrl = (url: URL) => url.pathname === "/api/classroom/help" || url.pathname === "/api/classroom/help/cancel";
function gate() {
  let release!: () => void;
  return { wait: new Promise<void>(resolve => { release = resolve; }), release: () => release() };
}
async function painted(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function tick(page: Page, ms: number) { await page.clock.runFor(ms); await painted(page); }

test("학생 수업 설정 API는 본인 반·공개 수업만 반환하고 작품과 교사 접근을 제외한다", async ({ page }) => {
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ openedLessonIds: [lessonId, "programming-13"], currentLessonId: "programming-13" });
  const response = await page.request.get("/api/classroom/student/class");
  expect(response.status()).toBe(200);
  const value = await response.json();
  expect(value.classroom).toMatchObject({ id: "2-1", currentLessonId: "programming-13" });
  expect(value.lessons.map((item: { id: string }) => item.id)).toEqual(["programming-13"]);
  expect(value).not.toHaveProperty("work");
  await readyTeacher(page.request);
  expect((await page.request.get("/api/classroom/student/class")).status()).toBe(403);
});

test("학생 수업 안내는 전체 작품 대신 반 설정을 30초마다 조회한다", async ({ page }) => {
  await readyStudent(page.request);
  await page.clock.install();
  let fullReads = 0, classReads = 0;
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/classroom/student") fullReads++;
    if (path === "/api/classroom/student/class") classReads++;
  });
  await page.goto(`/classroom/${lessonId}`);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  expect(fullReads).toBe(0);
  const initialReads = classReads;
  expect(initialReads).toBeGreaterThan(0);
  await tick(page, 30_000);
  await expect.poll(() => classReads).toBe(initialReads + 1);
  expect(fullReads).toBe(0);
});

test("창 포커스 재조회는 30초 안에서는 생략하고, 활동 기록 직후에는 세션을 다시 읽지 않는다", async ({ page }) => {
  await readyStudent(page.request);
  const session = (await (await page.request.get("/api/auth/session")).json()).session;
  await page.clock.install();
  let classReads = 0, sessionReads = 0, touches = 0;
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/classroom/student/class") classReads++;
    if (path === "/api/auth/session") sessionReads++;
  });
  // Answer activity without real account writes; the client paces touches by its own clock.
  await page.route("**/api/auth/activity", async route => { touches++; await route.fulfill({ json: { session: { ...session, idleMs: 0 } } }); });
  await page.goto(`/classroom/${lessonId}`);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  await painted(page);
  const focus = () => page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const initial = { classReads, sessionReads };
  // Returning from the Entry iframe or another window within 30 seconds reuses the last check.
  await focus(); await focus(); await painted(page);
  expect({ classReads, sessionReads }).toEqual(initial);
  // An activity touch already confirms the session, so the 30-second session read is skipped.
  for (let i = 0; i < 4; i++) { await page.locator("h1").first().click(); await tick(page, 30_000); }
  await expect.poll(() => touches).toBeGreaterThanOrEqual(3);
  expect(sessionReads).toBeLessThanOrEqual(initial.sessionReads + 1);
  await expect.poll(() => classReads).toBe(initial.classReads + 4);
  // After a hidden stretch longer than 30 seconds, focus checks both again right away.
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }));
  await tick(page, 60_000);
  const hidden = { classReads, sessionReads };
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); });
  // Back-to-back focus events while the first check is in flight send one request each.
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("focus")); });
  await expect.poll(() => classReads).toBe(hidden.classReads + 1);
  await expect.poll(() => sessionReads).toBe(hidden.sessionReads + 1);
  await page.waitForTimeout(500);
  expect({ classReads, sessionReads }).toEqual({ classReads: hidden.classReads + 1, sessionReads: hidden.sessionReads + 1 });
});

test("학생 손들기는 평상시 60초·대기 중 30초이며 상태 전환 직후 재조회하지 않는다", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사 보존");
  await readyStudent(page.request);
  await page.clock.install();
  let reads = 0, current: HelpRequest | null = null;
  await page.route(helpUrl, route => {
    if (route.request().method() === "GET") reads++;
    else current = new URL(route.request().url()).pathname.endsWith("cancel") ? null : { ...studentHelp, ...route.request().postDataJSON() };
    return route.fulfill({ json: { request: current } });
  });
  await page.goto(`/classroom/${lessonId}`);
  const raise = page.getByRole("button", { name: "손들기", exact: true });
  const lower = page.getByRole("button", { name: "손 내리기", exact: true });
  await expect(raise).toBeEnabled();
  await painted(page);
  const initialReads = reads;
  await tick(page, 30_000);
  expect(reads).toBe(initialReads);
  await tick(page, 30_000);
  await expect.poll(() => reads).toBe(initialReads + 1);
  await raise.click();
  await expect(lower).toBeEnabled();
  await painted(page);
  expect(reads).toBe(initialReads + 1);
  await tick(page, 30_000);
  await expect.poll(() => reads).toBe(initialReads + 2);
  // The teacher resolved it; the next pending-state poll clears the button.
  current = null;
  await tick(page, 30_000);
  await expect(raise).toBeEnabled();
  expect(reads).toBe(initialReads + 3);
  await tick(page, 30_000);
  expect(reads).toBe(initialReads + 3);
  await tick(page, 30_000);
  await expect.poll(() => reads).toBe(initialReads + 4);
});

test("학생의 느린 상태 조회는 겹치지 않고 해결된 요청 취소는 조용히 해제한다", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사 보존");
  await readyStudent(page.request);
  await page.clock.install();
  const delayed = gate();
  let reads = 0, cancels = 0, delayRead = false;
  await page.route(helpUrl, async route => {
    if (route.request().method() === "GET") {
      reads++;
      if (delayRead) await delayed.wait;
      await route.fulfill({ json: { request: studentHelp } });
    } else {
      cancels++;
      await route.fulfill({ json: { request: { ...studentHelp, status: "resolved" } } });
    }
  });
  try {
    await page.goto(`/classroom/${lessonId}`);
    const lower = page.getByRole("button", { name: "손 내리기", exact: true });
    await expect(lower).toBeEnabled();
    const initialReads = reads;
    delayRead = true;
    await tick(page, 30_000);
    await expect.poll(() => reads).toBe(initialReads + 1);
    await tick(page, 30_000);
    expect(reads).toBe(initialReads + 1);
    await lower.click();
    await expect(page.getByRole("button", { name: "손들기", exact: true })).toBeEnabled();
    expect(cancels).toBe(1);
    const response = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/classroom/help");
    delayed.release();
    await (await response).finished();
    await painted(page);
    await expect(page.getByRole("button", { name: "손들기", exact: true })).toBeEnabled();
  } finally { delayed.release(); await page.unrouteAll({ behavior: "wait" }); }
});

test("학생 취소 REQUEST_CHANGED는 최신 요청을 다시 조회해 복구한다", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사 보존");
  await readyStudent(page.request);
  await page.clock.install();
  const latest = { ...studentHelp, id: randomUUID() };
  let reads = 0, changed = false;
  await page.route(helpUrl, route => {
    if (route.request().method() === "GET") { reads++; return route.fulfill({ json: { request: changed ? latest : studentHelp } }); }
    const id = route.request().postDataJSON().id;
    return id === latest.id ? route.fulfill({ json: { request: { ...latest, status: "cancelled" } } }) : route.fulfill({ status: 409, json: { code: "REQUEST_CHANGED", message: "도움 요청이 바뀌었어요." } });
  });
  await page.goto(`/classroom/${lessonId}`);
  const lower = page.getByRole("button", { name: "손 내리기", exact: true });
  await expect(lower).toBeEnabled();
  const initialReads = reads;
  changed = true;
  await lower.click();
  await expect.poll(() => reads).toBe(initialReads + 1);
  await expect(lower).toBeEnabled();
  await lower.click();
  await expect(page.getByRole("button", { name: "손들기", exact: true })).toBeEnabled();
});

test("홈 대시보드는 느린 조회를 합치되 반 전환은 즉시 조회하며 이전 종료는 새 가드를 해제하지 않는다", async ({ page }) => {
  await readyTeacher(page.request);
  await page.clock.install();
  const a = gate(), b = gate();
  const reads: string[] = [];
  await page.route("**/api/classroom/teacher?**", async route => {
    const id = new URL(route.request().url()).searchParams.get("classId")!;
    reads.push(id);
    if (id === "2-1" && reads.filter(value => value === id).length > 1) await a.wait;
    if (id === "2-2") await b.wait;
    await route.fulfill({ json: { classroom: classroom(id), classrooms: [classroom("2-1"), classroom("2-2")], lessons: [lesson], selectedLessonId: lessonId, students: [] } });
  });
  try {
    await page.goto("/teacher?classId=2-1");
    await expect(page.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
    await expect.poll(() => reads.length).toBe(2);
    await tick(page, 60_000);
    expect(reads).toEqual(["2-1", "2-1"]);
    await page.getByRole("combobox", { name: "담당 반", exact: true }).click();
    await page.getByRole("option", { name: "2학년 2반", exact: true }).click();
    await expect.poll(() => reads).toEqual(["2-1", "2-1", "2-2"]);
    const response = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/teacher" && new URL(response.url()).searchParams.get("classId") === "2-1");
    a.release();
    await (await response).finished();
    await painted(page);
    await tick(page, 60_000);
    expect(reads).toEqual(["2-1", "2-1", "2-2"]);
    b.release();
    await expect(page.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
    await expect(page.getByRole("heading", { name: lesson.title, exact: true })).toBeVisible();
  } finally { a.release(); b.release(); await page.unrouteAll({ behavior: "wait" }); }
});

// School PCs can run minutes off the server clock; the heartbeat must still pace itself by the PC's own clock.
async function skewedClock(page: Page, offsetMs: number) {
  // Virtual seconds pass faster than the real server clock, so each test starts a minute after the last
  // recorded activity and watches less than the 30-second session re-check.
  await db.doc("csAccounts/student-20101").update({ "session.lastActivityAt": Date.now() - 60_000 });
  await page.clock.install({ time: Date.now() + offsetMs });
  const count = { touches: 0, open: 0, statuses: [] as number[] };
  const touch = (request: Request) => new URL(request.url()).pathname === "/api/auth/activity";
  page.on("request", request => { if (touch(request)) { count.touches++; count.open++; } });
  const done = (request: Request) => { if (touch(request)) count.open--; };
  page.on("requestfinished", done); page.on("requestfailed", done);
  page.on("response", response => { if (touch(response.request())) count.statuses.push(response.status()); });
  // One virtual second at a time against the real server, letting each touch finish before the next tick.
  const seconds = async (n: number) => { for (let i = 0; i < n; i++) { await page.clock.runFor(1000); await expect.poll(() => count.open).toBe(0); } };
  return { count, seconds };
}

for (const minutes of [5, 11]) test(`PC 시계가 서버보다 ${minutes}분 빨라도 활동 기록을 매초 보내지 않고 바로 로그아웃하지 않는다`, async ({ page }) => {
  await readyStudent(page.request);
  const { count, seconds } = await skewedClock(page, minutes * 60_000);
  await page.goto(`/classroom/${lessonId}`);
  const save = page.getByRole("button", { name: "저장", exact: true });
  await expect(save).toBeVisible();
  await painted(page);
  // A clock beyond the 10-minute student timeout used to log out on the first tick.
  await seconds(3);
  await expect(save).toBeVisible();
  await expect(page.getByText("곧 자동 로그아웃돼요.")).toBeHidden();
  await page.locator("h1").first().click();
  await seconds(5);
  // A second click within 30 seconds waits for the next touch.
  await page.locator("h1").first().click();
  await seconds(5);
  expect(count.touches).toBe(1);
  expect(count.statuses).toEqual([200]);
});

test("PC 시계가 서버보다 느려도 활동은 서버에 보낸다", async ({ page }) => {
  await readyStudent(page.request);
  const { count, seconds } = await skewedClock(page, -5 * 60_000);
  await page.goto(`/classroom/${lessonId}`);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  await painted(page);
  await page.locator("h1").first().click();
  await seconds(10);
  expect(count.touches).toBe(1);
  // The real server accepted it, so the session stays alive.
  expect(count.statuses).toEqual([200]);
});
