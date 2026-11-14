import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { requiredMissionsFor } from "../src/lib/classroom/programming-entry";
import { emptyWork } from "../src/lib/classroom/progress";
import type { Lesson, Work } from "../src/lib/classroom/types";
import { db, headers, localOnly, readyStudent, readyTeacher } from "./emulator";

// Class 2-6 has no seeded students and no other spec uses it.
const classRef = db.collection("csClasses").doc("2-6");
const regular = RELEASED_LESSONS.filter((lesson) => lesson.mode !== "review");
const [first, second, closed] = regular;
const students = [
  { uid: "assessment-a", studentId: "20601", nickname: "다해냄" },
  { uid: "assessment-b", studentId: "20602", nickname: "=SUM(1)" },
  { uid: "assessment-c", studentId: "20603" },
];
// Listed students only: one taken off the list and one trial account must not count.
const unlisted = [{ uid: "assessment-off", studentId: "20604", disabled: true }, { uid: "assessment-trial", studentId: "20699", disabled: false }];
const workIds = [...students, ...unlisted].flatMap((student) => regular.map((lesson) => `${student.uid}__${lesson.id}`));
let originalClass: DocumentSnapshot;

function work(lesson: Lesson, { practice }: { practice: boolean }): Work {
  const value = emptyWork(lesson);
  value.updatedAt = 1000;
  value.conceptSolved = lesson.concepts.map((item) => item.id);
  value.quizSolved = lesson.quiz.map((item) => item.id);
  if (practice) value.missions = Object.fromEntries(requiredMissionsFor(lesson.id).map((mission) => [mission.id, { validation: null, submission: { id: `submission-${mission.id}`, order: [], entryProject: null, submittedAt: 1000 } }]));
  return value;
}

test.beforeEach(async ({ request }) => {
  await localOnly(request);
  originalClass = await classRef.get();
  await classRef.set({ id: "2-6", name: "2학년 6반", revision: 0, currentLessonId: first.id, openedLessonIds: [first.id, second.id] });
  for (const student of [...students.map((value) => ({ ...value, disabled: false })), ...unlisted]) {
    await db.collection("csAccounts").doc(student.uid).set({ uid: student.uid, role: "student", studentId: student.studentId, classId: "2-6", classIds: [], ...("nickname" in student ? { nickname: student.nickname } : {}), mustChangePassword: false, disabled: student.disabled, authVersion: 0, authBusy: null, session: null });
  }
  // a finishes everything; b does concepts and quizzes but no practice; c has no work at all.
  for (const lesson of [first, second, closed]) {
    await db.collection("csWork").doc(`assessment-a__${lesson.id}`).set({ ...work(lesson, { practice: true }), uid: "assessment-a", classId: "2-6" });
    await db.collection("csWork").doc(`assessment-b__${lesson.id}`).set({ ...work(lesson, { practice: false }), uid: "assessment-b", classId: "2-6" });
    await db.collection("csWork").doc(`assessment-off__${lesson.id}`).set({ ...work(lesson, { practice: true }), uid: "assessment-off", classId: "2-6" });
  }
});

test.afterEach(async () => {
  if (originalClass.exists) await classRef.set(originalClass.data()!); else await classRef.delete();
  for (const student of [...students, ...unlisted]) await db.collection("csAccounts").doc(student.uid).delete();
  for (const id of workIds) await db.collection("csWork").doc(id).delete();
});

test("수행평가: 고른 수업만 읽어 1/3 진행률·점수를 보이고 이름을 가린 채 CSV로 내려받음", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await readyTeacher(page.request);
  const opening = page.waitForResponse((response) => response.url().includes("/api/classroom/assessment"));
  await page.goto("/teacher/assessment?classId=2-6");
  // Opening the page reads no student work.
  expect((await (await opening).json()).report).toBeNull();
  await expect(page.getByRole("heading", { level: 1, name: "수행평가 진행률" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "교실 메뉴" }).getByRole("link", { name: "수행평가", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("checkbox", { name: `${first.title} 열림` })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: `${second.title} 열림` })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: `${closed.title} 닫힘` })).not.toBeChecked();
  await expect(page.getByRole("table")).toHaveCount(0);

  await page.getByRole("button", { name: "진행률 불러오기", exact: true }).click();
  const table = page.getByRole("table", { name: "2학년 6반 수행평가 진행률" });
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByText("3명 표시 · 전체 3명", { exact: true })).toBeVisible();
  // Names stay hidden until asked for.
  await expect(table).not.toContainText("20601");
  await expect(table).not.toContainText("다해냄");
  const row = (name: string) => table.getByRole("row", { name: new RegExp(`^${name} `) });
  await expect(row("학생 1").getByRole("cell")).toHaveText(["100%", "30점", /^\d+\/\d+$/, /^\d+\/\d+$/, /^\d+\/\d+$/, "없음"]);
  // Concepts and quizzes done without practice are two of three thirds.
  await expect(row("학생 2").getByRole("cell").nth(0)).toHaveText("66%");
  await expect(row("학생 2").getByRole("cell").nth(1)).toHaveText("16점");
  await expect(row("학생 2").getByRole("listitem")).toHaveText([`${first.title} · 실습 0/${requiredMissionsFor(first.id).length}`, `${second.title} · 실습 0/${requiredMissionsFor(second.id).length}`]);
  await expect(row("학생 3").getByRole("cell").nth(0)).toHaveText("0%");
  await expect(row("학생 3").getByRole("cell").nth(1)).toHaveText("6점");
  // An untouched lesson is one chip, not one per stage.
  await expect(row("학생 3").getByRole("listitem")).toHaveText([`${first.title} · 시작 전`, `${second.title} · 시작 전`]);

  await page.getByRole("checkbox", { name: "학번·닉네임 보기" }).check();
  await expect(row("20601").getByRole("rowheader")).toHaveText("20601다해냄");
  await page.getByRole("checkbox", { name: "100% 미만만" }).check();
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText("2명 표시 · 전체 3명", { exact: true })).toBeVisible();

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px에서 가로 넘침 없음`).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`assessment-${width}.png`), fullPage: true });
  }

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내려받기" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^수행평가-진행률-2학년 6반-\d{12}\.csv$/);
  const bytes = await readFile((await download.path())!);
  // Excel needs the UTF-8 BOM to read Korean.
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const lines = bytes.subarray(3).toString("utf8").split("\r\n");
  expect(lines).toHaveLength(4);
  expect(lines[1]).toMatch(/^"2학년 6반","20601","다해냄","100","30",/);
  expect(lines[2]).toMatch(/^"2학년 6반","20602","'=SUM\(1\)","66","16",/);
  expect(lines[3]).toMatch(/^"2학년 6반","20603","","0","6",/);

  // Changing the chosen lessons waits for an explicit reload.
  await page.getByRole("checkbox", { name: `${second.title} 열림` }).uncheck();
  await expect(page.getByText("고른 수업이 바뀌었어요. 다시 불러와야 표에 반영돼요.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "진행률 다시 불러오기", exact: true }).click();
  await expect(page.getByText(`${first.title} 기준이에요.`, { exact: true })).toBeVisible();
  await expect(row("20602").getByRole("listitem")).toHaveText([`${first.title} · 실습 0/${requiredMissionsFor(first.id).length}`]);
  expect(errors).toEqual([]);
});

test("수행평가 API: 학생·담당 밖 반·복습 수업은 거절", async ({ page }) => {
  await readyTeacher(page.request);
  const review = RELEASED_LESSONS.find((lesson) => lesson.mode === "review")!;
  expect((await page.request.get(`/api/classroom/assessment?classId=2-6&lessons=${review.id}`, { headers })).status()).toBe(400);
  expect((await page.request.get("/api/classroom/assessment?classId=2-6&lessons=", { headers })).status()).toBe(400);
  expect((await page.request.get("/api/classroom/assessment?classId=3-1", { headers })).status()).toBe(403);
  const allowed = await page.request.get(`/api/classroom/assessment?classId=2-6&lessons=${first.id}`, { headers });
  expect(allowed.status()).toBe(200);
  expect((await allowed.json()).report.rows.map((row: { studentId: string }) => row.studentId)).toEqual(["20601", "20602", "20603"]);
  await readyStudent(page.request);
  expect((await page.request.get(`/api/classroom/assessment?lessons=${first.id}`, { headers })).status()).toBe(403);
});
