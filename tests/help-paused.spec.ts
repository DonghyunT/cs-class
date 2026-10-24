import { createHash, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { db, headers, lessonId, readyStudent, readyTeacher } from "./emulator";
import { LESSONS } from "../src/lib/classroom/catalog";
import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";

test.skip(CLASSROOM_HELP_ENABLED, "손들기 중지 모드 전용 검사입니다.");

test("손들기 중지는 모든 API를 차단하고 기존 요청·저장본을 보존한다", async ({ page }) => {
  await readyStudent(page.request);
  const uid = "student-20101", id = randomUUID();
  const refs = [db.doc(`csHelpRequests/${uid}`), db.doc(`csHelpSnapshots/${uid}`), db.doc(`csHelpLimits/${uid}`)];
  const before = await db.getAll(...refs);
  const digest = async () => createHash("sha256").update(JSON.stringify((await db.getAll(...refs)).map(doc => doc.data() ?? null))).digest("hex");
  try {
    await refs[0].set({ id, uid, studentId: "20101", classId: "2-1", lessonId, stage: "concept", mission: null, requestedAt: Date.now(), revision: 0, status: "pending" });
    await refs[1].set({ id, classId: "2-1", snapshotAt: Date.now(), work: { revision: 0 } });
    const original = await digest();
    for (const path of ["help", "help?classId=2-1", `help/${uid}?id=${id}`]) {
      const response = await page.request.get(`/api/classroom/${path}`);
      expect(response.status()).toBe(403);
      expect((await response.json()).code).toBe("HELP_DISABLED");
    }
    for (const path of ["help", "help/cancel", `help/${uid}/resolve`]) {
      const response = await page.request.post(`/api/classroom/${path}`, { headers, data: { id, lessonId } });
      expect(response.status()).toBe(403);
      expect((await response.json()).code).toBe("HELP_DISABLED");
    }
    expect(await digest()).toBe(original);
  } finally {
    const restore = db.batch(); before.forEach(doc => doc.exists ? restore.set(doc.ref, doc.data()!) : restore.delete(doc.ref)); await restore.commit();
  }
});

test("학생 헤더와 교사 화면은 손들기 UI·요청·빈자리 없이 표시된다", async ({ page, browser }, testInfo) => {
  const helpCalls: string[] = [];
  const collect = (request: { url(): string }) => { if (new URL(request.url()).pathname.startsWith("/api/classroom/help")) helpCalls.push("help"); };
  page.on("request", collect);
  await readyStudent(page.request);
  await page.clock.install();
  await page.goto(`/classroom/${lessonId}`);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /손들기|손 내리기/ })).toHaveCount(0);
  await page.clock.runFor(120_000);
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "학생 메뉴", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`student-${width}.png`) });
  }
  const teacherContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const teacher = await teacherContext.newPage(); teacher.on("request", collect);
  try {
    await readyTeacher(teacherContext.request);
    for (const path of ["/teacher", "/teacher/students", "/teacher/classes"]) {
      await teacher.goto(`${path}?classId=2-1`);
      await expect(teacher.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
      await expect(teacher.getByRole("region", { name: /손든 학생/ })).toHaveCount(0);
      await expect(teacher.locator('[href="#help-heading-all"]')).toHaveCount(0);
      expect(helpCalls).toEqual([]);
    }
    await teacher.goto("/teacher?classId=2-1");
    await expect(teacher.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
    for (const width of [390, 768, 1440]) {
      await teacher.setViewportSize({ width, height: 900 });
      expect(await teacher.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await teacher.screenshot({ path: testInfo.outputPath(`teacher-${width}.png`) });
    }
  } finally { await teacherContext.close(); }
  expect(helpCalls).toEqual([]);
});

for (const path of ["/teacher", "/teacher/students", "/teacher/classes"]) {
  test(`${path} 현황은 시간·포커스로 재조회하지 않고 수동 갱신한다`, async ({ page }) => {
    await readyTeacher(page.request);
    await page.clock.install();
    let reads = 0;
    const classroom = { id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] };
    await page.route("**/api/classroom/teacher?**", route => {
      reads++;
      return route.fulfill({ json: { classroom, classrooms: [classroom], lessons: LESSONS, selectedLessonId: lessonId, students: [], offList: [] } });
    });
    await page.goto(`${path}?classId=2-1`);
    const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
    await expect(refresh).toBeEnabled();
    const initialReads = reads;
    await page.clock.runFor(120_000);
    await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(reads).toBe(initialReads);
    await refresh.click();
    await expect.poll(() => reads).toBe(initialReads + 1);
    await expect(refresh).toBeEnabled();
  });
}
