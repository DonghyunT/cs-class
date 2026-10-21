import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { db, lessonId, readyStudent, readyTeacher } from "./emulator";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";

// A bounded local sample, not a billing meter. Extrapolate one active student to 27.
test("읽기 사용량 측정: 27명·11개 담당 반·10분 가상 수업", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  await readyStudent(page.request);
  const ids = Array.from({ length: 27 }, (_, i) => `student-201${String(i + 1).padStart(2, "0")}`);
  const extraRoster = (await db.collection("csAccounts").where("classId", "==", "2-1").get()).docs.filter(doc => !ids.includes(doc.id));
  const paths = [...new Set([...ids.map(uid => `csAccounts/${uid}`), ...extraRoster.map(doc => doc.ref.path), "csClasses/2-1"])];
  const previous = await db.getAll(...paths.map(path => db.doc(path)));
  const helpBefore = await db.collection("csHelpRequests").where("classId", "==", "2-1").get();
  const batch = db.batch();
  ids.slice(1).forEach(uid => batch.set(db.doc(`csAccounts/${uid}`), { uid, role: "student", studentId: uid.slice(8), classId: "2-1", classIds: [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null }));
  extraRoster.forEach(doc => batch.delete(doc.ref));
  batch.update(db.doc("csClasses/2-1"), { currentLessonId: "programming-13", openedLessonIds: [lessonId, ...RELEASED_LESSONS.map(lesson => lesson.id)] });
  helpBefore.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  const teacherContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const teacherPage = await teacherContext.newPage();
  const student: Record<string, number> = {}, teacher: Record<string, number> = {};
  const collect = (counts: Record<string, number>) => (request: { url(): string; method(): string }) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/")) { const key = `${request.method()} ${path}`; counts[key] = (counts[key] ?? 0) + 1; }
  };
  try {
    await readyTeacher(teacherContext.request);
    const dashboard = await (await teacherContext.request.get("/api/classroom/teacher?classId=2-1")).json();
    expect(dashboard.students).toHaveLength(27);
    expect(dashboard.classrooms).toHaveLength(11);
    expect(dashboard.selectedLessonId).toBe("programming-13");
    const studentDashboard = await (await page.request.get("/api/classroom/student")).json();
    expect(Object.keys(studentDashboard.work)).toHaveLength(RELEASED_LESSONS.length);
    const rosterSize = (await db.collection("csAccounts").where("classId", "==", "2-1").get()).size;
    const studentSession = (await (await page.request.get("/api/auth/session")).json()).session;
    const teacherSession = (await (await teacherContext.request.get("/api/auth/session")).json()).session;
    await page.clock.install(); await teacherPage.clock.install();
    // Keep activity account writes out of the read sample and avoid contention
    // with the dashboard transaction.
    for (const [target, session] of [[page, studentSession], [teacherPage, teacherSession]] as const) {
      await target.route("**/api/auth/activity", async route => route.fulfill({ json: { session: { ...session, idleMs: 0 } } }));
    }
    page.on("request", collect(student)); teacherPage.on("request", collect(teacher));
    await page.goto(`/classroom/${lessonId}`); await teacherPage.goto("/teacher?classId=2-1");
    await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
    await expect(teacherPage.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
    const initial = { student: { ...student }, teacher: { ...teacher } };
    for (let i = 0; i < 20; i++) {
      // Trusted activity keeps both sessions alive without saving or raising help.
      await page.locator("h1").first().click(); await teacherPage.locator("h1").first().click();
      await page.clock.runFor(30_000); await teacherPage.clock.runFor(30_000);
      await expect(teacherPage.getByRole("button", { name: "수업 새로고침", exact: true })).toBeEnabled();
      await page.waitForTimeout(100);
    }
    const report = { label: process.env.CS_READ_SAMPLE ?? "verification", helpEnabled: CLASSROOM_HELP_ENABLED, teacherRefresh: "manual", virtualMinutes: 10, studentCount: 27, teacherClassCount: 11, releasedLessonCount: RELEASED_LESSONS.length, selectedLessonId: dashboard.selectedLessonId,
      documentReadModel: { teacherWorkPerRequest: 1 + dashboard.classrooms.length + rosterSize + dashboard.students.length, studentDashboardPerRequest: 2 + Object.keys(studentDashboard.work).length, studentClassPerRequest: 2, studentHelpPerRequest: 3, emptyTeacherHelpPerRequest: 2 }, initial, totals: { student, teacher },
      recurring: { studentHelp: (student["GET /api/classroom/help"] ?? 0) - (initial.student["GET /api/classroom/help"] ?? 0), teacherWork: (teacher["GET /api/classroom/teacher"] ?? 0) - (initial.teacher["GET /api/classroom/teacher"] ?? 0) },
      limitations: "Observed local read API requests with a Playwright virtual clock and one student multiplied by 27; not live billing. Activity responses are fixtures so account writes stay out of the sample; account activity/session cost is modeled separately. No help pending, save/grading/AI actions, or quantified transaction retries. Initial navigation recorded separately." };
    expect(report.recurring.teacherWork).toBe(0);
    if (!CLASSROOM_HELP_ENABLED) {
      expect(student["GET /api/classroom/help"] ?? 0).toBe(0);
      expect(teacher["GET /api/classroom/help"] ?? 0).toBe(0);
    }
    const output = testInfo.outputPath("read-usage.json");
    await writeFile(output, JSON.stringify(report, null, 2));
    await testInfo.attach("read-usage", { path: output, contentType: "application/json" });
    await mkdir("scratch/firestore-read-optimization", { recursive: true });
    await writeFile(`scratch/firestore-read-optimization/${report.label}-usage.json`, JSON.stringify(report, null, 2));
  } finally {
    try { await teacherContext.close(); }
    finally {
      const restore = db.batch(); previous.forEach(doc => doc.exists ? restore.set(doc.ref, doc.data()!) : restore.delete(doc.ref));
      helpBefore.docs.forEach(doc => restore.set(doc.ref, doc.data()));
      await restore.commit();
    }
  }
});
