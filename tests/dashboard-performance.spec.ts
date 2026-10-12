import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, localOnly, readyStudent, readyTeacher } from "./emulator";
import { LESSONS, RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork } from "../src/lib/classroom/progress";

const lessonId = "programming-13";

async function fixture(request: APIRequestContext) {
  await localOnly(request);
  const ids = Array.from({ length: 30 }, (_, i) => `201${String(i + 1).padStart(2, "0")}`);
  const paths = [
    ...Array.from({ length: 11 }, (_, i) => `csClasses/2-${i + 1}`),
    ...ids.map((id) => `csAccounts/student-${id}`),
    "csAccounts/student-20199", "csAccounts/perf-staff", "csAccounts/perf-missing-id",
    ...ids.map((id) => `csWork/student-${id}__${lessonId}`),
    ...LESSONS.filter((lesson) => lesson.id !== lessonId).map((lesson) => `csWork/student-20101__${lesson.id}`),
  ];
  const previous = await db.getAll(...paths.map((path) => db.doc(path)));
  const batch = db.batch();
  for (const path of paths.filter((path) => path.startsWith("csWork/"))) batch.delete(db.doc(path));
  for (let i = 1; i <= 11; i++) batch.set(db.doc(`csClasses/2-${i}`), { id: `2-${i}`, name: `2학년 ${i}반`, revision: 0, currentLessonId: i === 1 ? lessonId : null, openedLessonIds: i === 1 ? LESSONS.map((lesson) => lesson.id) : [] });
  for (const id of ids) {
    const uid = `student-${id}`;
    const original = previous.find((snap) => snap.ref.path === `csAccounts/${uid}`)?.data();
    batch.set(db.doc(`csAccounts/${uid}`), { uid, role: "student", studentId: id, classId: "2-1", classIds: [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: original?.session ?? null });
  }
  const base = { classId: "2-1", classIds: [], mustChangePassword: false, authVersion: 0, authBusy: null, session: null };
  batch.set(db.doc("csAccounts/student-20199"), { ...base, uid: "student-20199", role: "student", studentId: "20199", disabled: true });
  batch.set(db.doc("csAccounts/perf-staff"), { ...base, uid: "perf-staff", role: "teacher", studentId: "20198", disabled: false });
  batch.set(db.doc("csAccounts/perf-missing-id"), { ...base, uid: "perf-missing-id", role: "student", studentId: null, disabled: false });
  for (const id of ["20101", "20115", "20130"]) {
    const work = emptyWork(LESSONS.find((lesson) => lesson.id === lessonId)!);
    batch.set(db.doc(`csWork/student-${id}__${lessonId}`), { ...work, uid: `student-${id}`, classId: "2-1", revision: 2, updatedAt: 1000, draft: { ...work.draft, stage: "quiz" } });
  }
  await batch.commit();
  return { ids, restore: async () => {
    const restore = db.batch();
    for (const snap of previous) { if (snap.exists) restore.set(snap.ref, snap.data()!); else restore.delete(snap.ref); }
    await restore.commit();
  } };
}

async function measure(page: Page, role: "student" | "teacher") {
  const samples = [];
  for (let index = 0; index < 6; index++) {
    const paths = ["/api/auth/session", `/api/classroom/${role}`, "/api/classroom/todos", "/api/classroom/schedule"];
    const responses = paths.map((path) => page.waitForResponse((response) => new URL(response.url()).pathname === path && response.status() === 200));
    const start = performance.now();
    await page.goto(`/${role}`);
    const completed = await Promise.all(responses);
    await Promise.all(completed.map((response) => response.finished()));
    await expect(page.locator('span[class*="skeleton"]')).toHaveCount(0);
    const visibleMs = Math.round(performance.now() - start);
    const api = await Promise.all(completed.map(async (response) => {
      const request = response.request(), time = request.timing(), size = await request.sizes();
      return { path: new URL(response.url()).pathname, durationMs: Math.round(time.responseEnd), ttfbMs: Math.round(time.responseStart - time.requestStart), responseBodyBytes: size.responseBodySize };
    }));
    // timing.responseEnd is relative to timing.startTime, not an epoch timestamp.
    const resourceCount = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).pathname.startsWith("/api/")).length);
    samples.push({ index, kind: index ? "repeat" : "first-observed", visibleMs, requestCount: resourceCount, api });
  }
  return samples;
}

test("대시보드 성능: 동일 빌드·11개 반·30명·첫 관찰과 반복 5회", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  await readyStudent(page.request);
  const data = await fixture(page.request);
  const teacher = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher.request);
    const studentValue = await (await page.request.get("/api/classroom/student")).json();
    const teacherValue = await (await teacher.request.get("/api/classroom/teacher?classId=2-1")).json();
    expect(teacherValue.students.map((item: { studentId: string }) => item.studentId)).toEqual(data.ids);
    expect(Object.keys(studentValue.work)).toEqual(RELEASED_LESSONS.map((lesson) => lesson.id));
    expect(studentValue.work[lessonId]).toMatchObject({ revision: 2, draft: { stage: "quiz" } });
    for (const lesson of RELEASED_LESSONS.filter((item) => item.id !== lessonId)) expect(studentValue.work[lesson.id]).toEqual(emptyWork(lesson));
    const report = {
      environment: process.env.CI ? "local-production-build" : "local-development",
      label: process.env.CS_PERF_LABEL ?? "verification",
      studentPayloadHash: createHash("sha256").update(JSON.stringify(studentValue)).digest("hex"),
      teacherPayloadHash: createHash("sha256").update(JSON.stringify(teacherValue)).digest("hex"),
      student: await measure(page, "student"), teacher: await measure(await teacher.newPage(), "teacher"),
    };
    const output = testInfo.outputPath("performance.json");
    await writeFile(output, JSON.stringify(report, null, 2));
    await testInfo.attach("performance", { path: output, contentType: "application/json" });
  } finally { await teacher.close(); await data.restore(); }
});

test("일괄 조회 경계: 빈 반·열린 수업 없음·누락 작품·누락 반·학생 정렬", async ({ page, browser }) => {
  await readyStudent(page.request);
  const data = await fixture(page.request);
  const teacher = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher.request);
    const get = async (path: string) => { const response = await teacher.request.get(path); expect(response.status()).toBe(200); return response.json(); };
    const populated = await get("/api/classroom/teacher?classId=2-1");
    expect(populated.classrooms.map((item: { id: string }) => item.id)).toEqual(Array.from({ length: 11 }, (_, i) => `2-${i + 1}`));
    expect(populated.students.map((item: { studentId: string }) => item.studentId)).toEqual(data.ids);
    expect(populated.students[0].work).toMatchObject({ revision: 2, updatedAt: 1000 });
    expect(populated.students[0].work.draft).toBeUndefined();
    const emptyWorkSummary = populated.students[1].work;
    expect(emptyWorkSummary).toMatchObject({ lessonId, revision: 0, conceptSolved: [], quizSolved: [], submission: null, edited: false, validated: false });
    expect(emptyWorkSummary.draft).toBeUndefined();
    const detail = await get(`/api/classroom/students/student-${data.ids[0]}/work/${lessonId}`);
    expect(detail.draft.stage).toBe("quiz");
    const empty = await get("/api/classroom/teacher?classId=2-2");
    expect(empty.students).toEqual([]); expect(empty.selectedLessonId).toBeNull();
    await db.doc("csClasses/2-1").update({ currentLessonId: null, openedLessonIds: [] });
    const closed = await get("/api/classroom/teacher?classId=2-1");
    expect(closed.students).toHaveLength(30);
    expect(closed.students.every((item: { work: unknown }) => item.work === null)).toBeTruthy();
    const student = await page.request.get("/api/classroom/student"); expect(student.status()).toBe(200);
    expect(await student.json()).toMatchObject({ lessons: [], work: {} });
    await db.doc("csClasses/2-3").delete();
    expect((await get("/api/classroom/schedule?classId=2-1")).classrooms).toHaveLength(10);
    expect((await teacher.request.get("/api/classroom/teacher?classId=2-3")).status()).toBe(404);
    expect((await teacher.request.get("/api/classroom/schedule?classId=2-3")).status()).toBe(404);
    expect((await page.request.get("/api/classroom/teacher?classId=2-1")).status()).toBe(403);
    expect((await page.request.get("/api/classroom/schedule?classId=2-2")).status()).toBe(403);
  } finally { await teacher.close(); await data.restore(); }
});
