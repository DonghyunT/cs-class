import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { randomUUID } from "node:crypto";
import { expect, test, type Page, type Response } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork } from "../src/lib/classroom/progress";
import type { HelpRequest } from "../src/lib/classroom/help";
import { db, lessonId, readyStudent, readyTeacher } from "./emulator";

const lesson = LESSONS.find(item => item.id === lessonId)!;
const classroom = { id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] };
const helpPath = "/api/classroom/help";
const isHelp = (url: URL) => url.pathname === helpPath || url.pathname.startsWith(`${helpPath}/`);

function gate() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}

function requestFor(name: string, studentId: string): HelpRequest {
  return { id: randomUUID(), uid: `help-race-${studentId}`, nickname: name, studentId, classId: "2-1", lessonId, stage: "concept", mission: null, requestedAt: Date.now(), revision: 0, status: "pending" };
}

async function teacherPage(page: Page) {
  await readyTeacher(page.request);
  await page.route("**/api/classroom/teacher?**", route => route.fulfill({ json: { classroom, classrooms: [classroom], lessons: [lesson], selectedLessonId: lessonId, students: [] } }));
  await page.goto("/teacher?classId=2-1");
}

async function painted(page: Page) {
  // Finish the delivered response's UI update before asserting that it was ignored.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function settledResponse(page: Page, response: () => Response | null) {
  await expect.poll(() => Boolean(response())).toBe(true);
  await response()!.finished();
  await painted(page);
}

test("늦은 손들기 조회가 성공한 새 도움 요청 상태를 덮어쓰지 않는다", async ({ page }) => {
  const classRef = db.doc("csClasses/2-1"), classBefore = await classRef.get();
  const delayed = gate();
  let delayNextRead = false, gateEntered = false, delayedResponse: Response | null = null;
  page.on("response", response => { if (response.headers()["x-help-race"] === "student-old-read") delayedResponse = response; });
  try {
    await readyStudent(page.request);
    await page.clock.install();
    await page.route(isHelp, async route => {
      if (route.request().method() === "GET") {
        if (delayNextRead) {
          delayNextRead = false; gateEntered = true;
          await delayed.wait;
          await route.fulfill({ json: { request: null }, headers: { "x-help-race": "student-old-read" } });
        } else await route.fulfill({ json: { request: null } });
      } else {
        const payload = route.request().postDataJSON() as { id: string; lessonId: string };
        await route.fulfill({ json: { request: { ...requestFor("학생", "20101"), uid: "student-20101", ...payload } } });
      }
    });
    await page.goto(`/classroom/${lessonId}`);
    const raise = page.getByRole("button", { name: "손들기", exact: true });
    await expect(raise).toBeEnabled();
    await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).toBeVisible();
    delayNextRead = true;
    await page.clock.fastForward(60_001);
    await expect.poll(() => gateEntered).toBe(true);
    await raise.click();
    const lower = page.getByRole("button", { name: "손 내리기", exact: true });
    await expect(lower).toBeEnabled();
    delayed.release();
    await settledResponse(page, () => delayedResponse);
    await lower.focus();
    await expect(lower).toBeFocused();
    await expect(lower).toHaveAttribute("aria-pressed", "true");
  } finally {
    delayed.release();
    await page.unrouteAll({ behavior: "wait" });
    if (classBefore.exists) await classRef.set(classBefore.data()!); else await classRef.delete();
  }
});

test("닫은 A 요청의 늦은 완료 응답이 새로 연 B 대화상자를 닫지 않는다", async ({ page }) => {
  const a = requestFor("경합 A", "20196"), b = requestFor("경합 B", "20197"), delayed = gate();
  let resolveStarted = false, resolveResponse: Response | null = null;
  page.on("response", response => { if (response.url().endsWith(`${helpPath}/${a.uid}/resolve`)) resolveResponse = response; });
  await page.route(isHelp, async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      resolveStarted = true; await delayed.wait;
      await route.fulfill({ json: { request: { ...a, status: "resolved" } } });
    } else if (url.pathname === helpPath) await route.fulfill({ json: { requests: [a, b] } });
    else {
      const selected = url.pathname.endsWith(a.uid) ? a : b;
      await route.fulfill({ json: { request: selected, lesson, work: emptyWork(lesson), snapshotAt: selected.requestedAt, latest: false } });
    }
  });
  try {
    await teacherPage(page);
    const help = page.getByRole("region", { name: /손든 학생/ });
    await help.getByRole("button", { name: /경합 A/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "도움 완료", exact: true })).toBeEnabled();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await dialog.getByRole("button", { name: "도움 완료", exact: true }).click();
    await expect.poll(() => resolveStarted).toBe(true);
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(dialog).toBeHidden();
    await help.getByRole("button", { name: /경합 B/ }).click();
    await expect(dialog.getByRole("heading", { name: "경합 B 학생의 도움 요청", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "도움 완료", exact: true })).toBeEnabled();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    delayed.release();
    await settledResponse(page, () => resolveResponse);
    await expect(dialog.getByRole("heading", { name: "경합 B 학생의 도움 요청", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "도움 완료", exact: true })).toBeEnabled();
  } finally { delayed.release(); await page.unrouteAll({ behavior: "wait" }); }
});

test("완료 처리 중이던 이전 목록 응답이 완료한 학생을 다시 표시하지 않는다", async ({ page }) => {
  const a = requestFor("경합 A", "20196"), b = requestFor("경합 B", "20197"), delayed = gate();
  let reads = 0, delayNextRead = false, gateEntered = false, resolved = false, delayedResponse: Response | null = null;
  page.on("response", response => { if (response.headers()["x-help-race"] === "teacher-old-read") delayedResponse = response; });
  await page.clock.install();
  await page.route(isHelp, async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      resolved = true;
      await route.fulfill({ json: { request: { ...a, status: "resolved" } } });
    } else if (url.pathname === helpPath) {
      reads++;
      if (delayNextRead) {
        delayNextRead = false; gateEntered = true;
        await delayed.wait;
        await route.fulfill({ json: { requests: [a, b] }, headers: { "x-help-race": "teacher-old-read" } });
      } else await route.fulfill({ json: { requests: resolved ? [b] : [a, b] } });
    } else await route.fulfill({ json: { request: a, lesson, work: emptyWork(lesson), snapshotAt: a.requestedAt, latest: false } });
  });
  try {
    await teacherPage(page);
    const help = page.getByRole("region", { name: /손든 학생/ });
    await expect(help.getByRole("button", { name: /경합 A/ })).toBeVisible();
    await expect(help.getByRole("button", { name: "손들기 새로고침", exact: true })).toBeEnabled();
    delayNextRead = true;
    await page.clock.fastForward(30_001);
    await expect.poll(() => gateEntered).toBe(true);
    const readsBeforeResolve = reads;
    await help.getByRole("button", { name: /경합 A/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "도움 완료", exact: true })).toBeEnabled();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await dialog.getByRole("button", { name: "도움 완료", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => reads).toBeGreaterThan(readsBeforeResolve);
    await expect(help.getByRole("button", { name: /경합 A/ })).toHaveCount(0);
    await expect(help.getByRole("button", { name: /경합 B/ })).toBeVisible();
    delayed.release();
    await settledResponse(page, () => delayedResponse);
    await expect(help.getByRole("button", { name: /경합 A/ })).toHaveCount(0);
    await expect(help.getByRole("button", { name: /경합 B/ })).toBeVisible();
    await expect(help.getByRole("heading", { name: /손든 학생/ })).toHaveText("손든 학생 1");
  } finally { delayed.release(); await page.unrouteAll({ behavior: "wait" }); }
});

// Retained for reactivation; disabled mode is checked by help-paused.spec.ts.
test.skip(!CLASSROOM_HELP_ENABLED, "손들기 일시 중지: 활성 모드 검사 보존");
