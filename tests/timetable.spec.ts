import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parseTimetableWeek } from "../src/lib/classroom/timetable";
import type { ScheduleData } from "../src/lib/classroom/planner";
import { timetableWeek } from "../scripts/timetable-fixture.mjs";
import { db, headers, localOnly, readyStudent, readyTeacher } from "./emulator";

const cache = db.collection("csTimetables").doc("74022");
const cronHeaders = { Authorization: "Bearer cron-local-test-only-73194826" };
const refreshPath = "/api/classroom/timetable/2-1";

test("공개 시간표에서 11개 반의 정보 교시만 추출 · 변경과 열람 제한 · 잘못된 구조 거부", () => {
  const source = timetableWeek("2026-10-12", true);
  const parsed = parseTimetableWeek(source);
  expect(parsed.end).toBe("2026-10-17");
  expect(parsed.items).toHaveLength(11);
  expect(parsed.items.find((item) => item.classId === "2-1")).toMatchObject({ date: "2026-10-14", period: 2, startsAt: "09:55", changed: true });
  expect(new Set(parsed.items.map((item) => item.id)).size).toBe(11);
  expect(JSON.stringify(parsed)).not.toContain("fixture-teacher");
  source.열람제한일 = "2026-10-13";
  expect(parseTimetableWeek(source).items).toHaveLength(10);
  expect(() => parseTimetableWeek({ ...source, 자료147: [] })).toThrow();
  expect(() => parseTimetableWeek({ ...source, 시작일: "2026-02-30" })).toThrow();
  expect(() => parseTimetableWeek({ ...source, 학급수: [31, 9, 10, 11] })).toThrow();
  expect(() => parseTimetableWeek({ ...source, 열람제한일: "1899-12-30", 일과시간: ["1(25:60)", "2(09:55)"] })).toThrow();
  const missing = timetableWeek("2026-10-12"); missing.자료492[25] = "수학";
  expect(() => parseTimetableWeek(missing)).toThrow();
  const empty = timetableWeek("2026-10-12");
  const grid = empty.자료147[2] as unknown as number[][][];
  for (let classroom = 1; classroom <= 11; classroom++) grid[classroom][1][1] = 0;
  expect(parseTimetableWeek(empty).items).toEqual([]);
  const legacy: Record<string, unknown> = timetableWeek("2026-10-12");
  legacy.변경알림 = 0; legacy.자료481 = structuredClone(legacy.자료147);
  (legacy.자료147 as (string | number)[][][][])[2][1][1][1] = "25001";
  expect(parseTimetableWeek(legacy).items[0].changed).toBe(false);
  (legacy.자료481 as (string | number)[][][][])[2][1][1][1] = 0;
  expect(parseTimetableWeek(legacy).items[0].changed).toBe(true);
});

test.describe("학교 시간표 연동", () => {
  let previous: FirebaseFirestore.DocumentData | undefined;
  let limitedAccount: FirebaseFirestore.DocumentReference | undefined;
  test.beforeEach(async ({ request }) => {
    await localOnly(request); limitedAccount = undefined; previous = (await cache.get()).data(); await cache.delete();
    expect((await request.post("http://127.0.0.1:4781/__fixture?mode=normal")).status()).toBe(200);
  });
  test.afterEach(async () => {
    if (limitedAccount) await limitedAccount.update({ classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) });
    if (previous) await cache.set(previous); else await cache.delete();
  });

  test("수동 갱신의 권한·전송 보호 · 반별 조회 · 학생 27회 조회에도 외부 호출 없음", async ({ request }) => {
    expect((await request.post(refreshPath, { headers, data: {} })).status()).toBe(401);
    await readyStudent(request);
    expect((await request.post(refreshPath, { headers, data: {} })).status()).toBe(403);
    await readyTeacher(request);
    expect((await request.post(refreshPath, { data: {} })).status()).toBe(403);
    expect((await request.post(refreshPath, { headers: { ...headers, Origin: "https://elsewhere.invalid" }, data: {} })).status()).toBe(403);
    const session = await (await request.get("/api/auth/session")).json();
    const account = db.collection("csAccounts").doc(session.session.uid);
    limitedAccount = account;
    await account.update({ classIds: ["2-1"] });
    expect((await request.post("/api/classroom/timetable/2-2", { headers, data: {} })).status()).toBe(403);
    const result = await request.post(refreshPath, { headers, data: {} }); expect(result.status()).toBe(200);
    const value: ScheduleData = await result.json();
    expect(value.timetable.items).toHaveLength(2);
    expect(value.timetable.items.every((item) => item.classId === "2-1")).toBe(true);
    expect((await request.post(refreshPath, { headers, data: {} })).status()).toBe(429);
    const count = (await (await request.get("http://127.0.0.1:4781/__fixture")).json()).calls;
    expect(count).toBe(4);
    await readyStudent(request);
    const results = await Promise.all(Array.from({ length: 27 }, () => request.get("/api/classroom/schedule")));
    for (const response of results) { expect(response.status()).toBe(200); expect((await response.json()).timetable.items.every((item: { classId: string }) => item.classId === "2-1")).toBe(true); }
    expect((await request.get("/api/classroom/schedule?classId=2-2")).status()).toBe(403);
    expect((await (await request.get("http://127.0.0.1:4781/__fixture")).json()).calls).toBe(count);
    const stored = (await cache.get()).data()!;
    expect(stored.items).toHaveLength(22); expect(JSON.stringify(stored)).not.toContain("fixture-teacher");
    await account.update({ classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) });
  });

  test("Cron 인증·하루 중복 방지 · 동시 갱신 차단 · 실패 시 마지막 정상본과 직접 일정 보존", async ({ request }) => {
    const schedule = db.collection("csSchedules").doc("2-1"), oldSchedule = (await schedule.get()).data();
    try {
      const manual = { revision: 8, items: [{ id: randomUUID(), title: "직접 등록한 수업 준비", date: "2026-10-12", lessonId: null }] };
      await schedule.set(manual);
      expect((await request.get("/api/cron/timetable")).status()).toBe(401);
      expect((await request.get("/api/cron/timetable", { headers: { Authorization: "Bearer undefined" } })).status()).toBe(401);
      await request.post("http://127.0.0.1:4781/__fixture?mode=slow");
      const [a, b] = await Promise.all([1, 2].map(() => request.get("/api/cron/timetable", { headers: cronHeaders })));
      expect([a.status(), b.status()].sort()).toEqual([200, 409]);
      expect((await request.get("/api/cron/timetable", { headers: cronHeaders })).status()).toBe(200);
      expect((await (await request.get("http://127.0.0.1:4781/__fixture")).json()).calls).toBe(4);
      const normal = (await cache.get()).data()!;
      await readyTeacher(request);
      for (const mode of ["failed", "invalid"]) {
        await cache.update({ attemptedAt: 0 }); await request.post(`http://127.0.0.1:4781/__fixture?mode=${mode}`);
        expect((await request.post(refreshPath, { headers, data: {} })).status()).toBe(503);
        const latest = (await cache.get()).data()!;
        expect(latest.items).toEqual(normal.items); expect(latest.checkedAt).toBe(normal.checkedAt);
        expect(latest.error).toContain("마지막"); expect(latest.leaseUntil).toBe(0);
        expect((await schedule.get()).data()).toEqual(manual);
      }
      await cache.update({ attemptedAt: 0 }); await request.post("http://127.0.0.1:4781/__fixture?mode=changed");
      expect((await request.post(refreshPath, { headers, data: {} })).status()).toBe(200);
      const changed = (await cache.get()).data()!;
      expect(changed.items.filter((item: { classId: string; changed: boolean }) => item.classId === "2-1" && item.changed)).toHaveLength(2);
      expect(changed.error).toBeNull(); expect((await schedule.get()).data()).toEqual(manual);
    } finally { if (oldSchedule) await schedule.set(oldSchedule); else await schedule.delete(); }
  });

  test("교사 갱신과 미전송 입력 보존 · 학생의 일정·달력 · 좁은 화면·키보드·콘솔", async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const schedule = db.collection("csSchedules").doc("2-1"), oldSchedule = (await schedule.get()).data();
    try {
      await schedule.delete(); await readyTeacher(page.request); await page.goto("/teacher/schedule?classId=2-1");
      const refresh = page.getByRole("button", { name: "학교 시간표 지금 갱신", exact: true });
      await expect(refresh).toBeVisible(); await expect(page.getByText("아직 가져온 시간표가 없어요.")).toBeVisible();
      await page.getByLabel("일정 제목", { exact: true }).fill("미전송 제목을 보존");
      await refresh.focus(); await page.keyboard.press("Enter");
      await expect(page.getByText("학교 시간표를 갱신했어요.", { exact: true })).toBeVisible();
      await expect(page.getByLabel("일정 제목", { exact: true })).toHaveValue("미전송 제목을 보존");
      await expect(refresh).toBeFocused();
      await expect(page.getByText("정보 · 1교시", { exact: true })).toHaveCount(2);
      expect((await schedule.get()).exists).toBe(false);
      await page.getByRole("button", { name: "일정 저장", exact: true }).click();
      await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
      await cache.update({ attemptedAt: 0 }); await page.request.post("http://127.0.0.1:4781/__fixture?mode=changed");
      await refresh.click(); await expect(page.getByText("변경된 수업", { exact: true })).toHaveCount(2);
      await expect(page.getByText("미전송 제목을 보존", { exact: true })).toBeVisible();
      for (const width of [327, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width === 390) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await mkdir("outputs/classroom-readiness", { recursive: true });
          await page.screenshot({ path: "outputs/classroom-readiness/timetable-teacher-390-demo.png", fullPage: true });
        }
      }
      await readyStudent(page.request); await page.goto("/student/schedule");
      await expect(page.getByText("정보 · 2교시", { exact: true })).toHaveCount(2);
      await expect(page.getByRole("button", { name: "학교 시간표 지금 갱신", exact: true })).toHaveCount(0);
      await page.screenshot({ path: "outputs/classroom-readiness/timetable-student-1440-demo.png", fullPage: true });
      await page.goto("/student"); await expect(page.getByRole("table", { name: /일정 달력/ })).toBeVisible();
      await expect(page.locator('time[data-event="true"]').first()).toBeVisible(); expect(errors).toEqual([]);
    } finally { if (oldSchedule) await schedule.set(oldSchedule); else await schedule.delete(); }
  });
});
