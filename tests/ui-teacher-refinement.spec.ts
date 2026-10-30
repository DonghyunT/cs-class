import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { LESSONS, RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject, missionsFor } from "../src/lib/classroom/programming-entry";
import { emptyWork, progressFor, submissionCountFor } from "../src/lib/classroom/progress";
import type { StudentRow, TeacherDashboard, Work } from "../src/lib/classroom/types";
import { localOnly, readyTeacher } from "./emulator";

const lesson = LESSONS.find((item) => item.id === "programming-13")!;
const reviewLesson = RELEASED_LESSONS.find((item) => item.mode === "review")!;
const project = buildProgrammingProject();
function workWith(missions: string[], edited = false): Work {
  const work = emptyWork(lesson);
  work.updatedAt = missions.length ? 1000 : null;
  work.conceptSolved = missions.length === 4 ? lesson.concepts.map((item) => item.id) : [];
  work.quizSolved = missions.length === 4 ? lesson.quiz.map((item) => item.id) : [];
  work.missions = Object.fromEntries(missions.map((id) => [id, { validation: null, submission: { id: `submission-${id}`, order: [], entryProject: project, submittedAt: 1000 } }]));
  work.draft.programming!.projects = Object.fromEntries(missions.map((id) => [id, edited ? buildProgrammingProject([[{ type: "when_run_button_click", params: [null] }, { type: "move_direction", params: [{ type: "number", params: [10] }, null] }]]) : project]));
  return work;
}
const rows: StudentRow[] = [[], ["name"], ["name", "multiply", "move"], ["name", "multiply", "move", "keys"], ["average"], ["name"]].map((missions, index) => ({ uid: `ui-teacher-${index}`, studentId: `2018${index + 1}`, mustChangePassword: index === 0, work: { ...workWith(missions, index === 5), edited: index === 5, validated: false } }));

async function syntheticRows(page: Page, state: "normal" | "no-lesson" | "no-students" | "review" = "normal", students = rows) {
  const initialLessonId = state === "review" ? reviewLesson.id : lesson.id;
  await localOnly(page.request);
  await readyTeacher(page.request);
  await page.route("**/api/classroom/students/ui-teacher-*/work/**", async route => {
    const uid = new URL(route.request().url()).pathname.split("/")[4];
    const row = students.find(row => row.uid === uid);
    await route.fulfill({ status: row ? 200 : 404, contentType: "application/json", body: JSON.stringify(row?.work ?? {}) });
  });
  await page.route("**/api/classroom/teacher?**", async (route) => {
    const url = new URL(route.request().url());
    const selectedLessonId = state === "no-lesson" ? null : state === "review" ? reviewLesson.id : url.searchParams.get("lessonId") ?? lesson.id;
    url.searchParams.delete("lessonId");
    const response = await route.fetch({ url: url.toString() });
    expect(response.status()).toBe(200);
    const data = await response.json() as TeacherDashboard;
    await route.fulfill({ response, json: { ...data, selectedLessonId, lessons: RELEASED_LESSONS, classroom: { ...data.classroom, currentLessonId: selectedLessonId, openedLessonIds: state === "no-lesson" ? [] : RELEASED_LESSONS.map((item) => item.id) }, students: state === "no-students" ? [] : students.map((row) => state === "no-lesson" ? { ...row, work: null } : row) } });
  });
  await page.goto(`/teacher/students?classId=2-1${state === "no-lesson" ? "" : `&lessonId=${initialLessonId}`}`);
  if (state !== "no-students") await expect(page.locator("tbody tr")).toHaveCount(students.length);
}
async function filter(page: Page, name: string, choice: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: choice, exact: true }).click();
}

test("학번·닉네임 검색은 공백·대소문자·동일 닉네임과 q/기존 링크·계정 필터를 보존", async ({ page }, testInfo) => {
  const students = rows.map((row, index) => ({ ...row, nickname: ["초코", "초코", "CodeCat", "아주 긴 닉네임을 쓰는 학생 이름", undefined, "별"][index], mustChangePassword: index < 2 }));
  await syntheticRows(page, "normal", students);
  const search = page.getByRole("searchbox");
  await search.dispatchEvent("compositionstart", { data: "", bubbles: true });
  for (const value of ["초", "초코"]) {
    await search.evaluate((input, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertCompositionText", isComposing: true }));
      input.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: value }));
    }, value);
    await expect(search).toHaveValue(value);
    await expect(page.locator("tbody tr")).toHaveCount(2);
  }
  await search.dispatchEvent("compositionend", { data: "초코", bubbles: true });
  await expect(search).toHaveValue("초코");
  expect(new URL(page.url()).searchParams.get("q")).toBe("초코");
  const compositionProof = testInfo.outputPath("search-composition.json");
  await writeFile(compositionProof, JSON.stringify({ environment: "synthetic composition events", value: await search.inputValue(), rows: await page.locator("tbody tr").count() }));
  await testInfo.attach("search-composition", { path: compositionProof, contentType: "application/json" });
  await search.fill("  초코  ");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  expect(new URL(page.url()).searchParams.get("q")).toBe("초코");
  expect(new URL(page.url()).searchParams.has("studentId")).toBe(false);
  await page.reload(); await expect(search).toHaveValue("초코");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await search.fill("cOdEc");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("20183");
  await search.fill("20185");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("20185");
  await search.fill("   ");
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(search).not.toHaveAttribute("inputmode", "numeric");
  await page.goto(`/teacher/students?classId=2-1&lessonId=${lesson.id}&studentId=20182`);
  await expect(search).toHaveValue("20182");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await search.fill("초코");
  const account = page.getByRole("checkbox", { name: "비밀번호 변경 필요만", exact: true });
  await account.check();
  expect(new URL(page.url()).searchParams.get("password")).toBe("required");
  expect(new URL(page.url()).searchParams.has("studentId")).toBe(false);
  await page.reload(); await expect(account).toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator('[class*="summary"]')).toContainText("등록 학생6명");
  await search.fill("CodeCat");
  await expect(page.getByText("조건에 맞는 학생이 없어요.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "검색·필터 초기화", exact: true }).click();
  for (const key of ["q", "studentId", "password", "review"]) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
  await expect(account).not.toBeChecked();
  await page.goto(`/teacher/students?classId=2-1&lessonId=${lesson.id}&q=&studentId=20181&password=invalid`);
  await expect(search).toHaveValue(""); await expect(account).not.toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.goto(`/teacher/students?classId=2-1&lessonId=${lesson.id}&q=초코&q=별`);
  await expect(search).toHaveValue("초코");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("열린 수업이 없어도 닉네임 검색과 비밀번호 조건은 AND로 동작", async ({ page }) => {
  const students = rows.map((row, index) => ({ ...row, nickname: index < 2 ? "초코" : undefined }));
  await syntheticRows(page, "no-lesson", students);
  await page.getByRole("searchbox").fill("초코");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "비밀번호 변경 필요만", exact: true }).check();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("20181");
  await expect(page.getByRole("checkbox", { name: "확인 요청만", exact: true })).toBeDisabled();
  await page.reload(); await expect(page.locator("tbody tr")).toHaveCount(1);
  await filter(page, "담당 반", "2학년 2반");
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: "비밀번호 변경 필요만", exact: true })).not.toBeChecked();
  for (const key of ["q", "studentId", "password", "review"]) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
});

test("알려진 최근 작품만 집계하며 다른 수업으로 옮긴 미션과 수정 중 제출본은 기본 완료와 분리", () => {
  // 20185 only submitted the average calculator, which moved to the conditionals lesson.
  expect(rows.map((row) => submissionCountFor(lesson, row.work))).toEqual([0, 1, 3, 4, 0, 1]);
  expect(rows.filter((row) => submissionCountFor(lesson, row.work) > 0)).toHaveLength(4);
  expect(rows.map((row) => progressFor(lesson, row.work).practice.completed)).toEqual([0, 1, 3, 4, 0, 1]);
  const unknown = workWith(["unknown"]);
  expect(submissionCountFor(lesson, unknown)).toBe(0);
  const ordinary = LESSONS.find((item) => item.id === "sequence-lab")!;
  expect(submissionCountFor(ordinary, rows[1].work)).toBe(0);
  unknown.submission = { id: "ordinary", order: [], submittedAt: 1000 };
  expect(submissionCountFor(ordinary, unknown)).toBe(1);
  // Four basic missions count toward completion; the change calculator is an optional challenge.
  expect(missionsFor("programming-13").filter((mission) => !mission.optional)).toHaveLength(4);
});

test("교사 집계·진행 필터·검색 복구는 부분 제출과 이전 수업 기록을 정확히 표시", async ({ page }) => {
  await syntheticRows(page);
  const summary = page.locator('[class*="summary"]');
  await expect(summary).toContainText("수업 완료1명");
  await expect(summary).toContainText("실습 제출4명");
  await expect(page.getByRole("combobox", { name: "제출 상태", exact: true })).toHaveCount(0);
  await expect(page.locator("tbody tr").filter({ hasText: "20186" })).toContainText("수정 중");
  const challenge = page.locator("tbody tr").filter({ hasText: "20185" });
  await expect(challenge.getByRole("progressbar", { name: "20185 실습 진도", exact: true })).toHaveAttribute("aria-valuenow", "0");
  await expect(challenge.getByRole("button", { name: "20185 제출 작품 보기", exact: true })).toBeEnabled();
  await challenge.getByRole("button", { name: "20185 상세 보기", exact: true }).click();
  await expect(challenge.getByText("기본 0/4 제출", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "20181 제출 작품 보기", exact: true })).toBeDisabled();
  await filter(page, "진행 상태", "완료");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("20184");
  await filter(page, "진행 상태", "시작 전");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("20181");
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20183");
  await expect(page.getByText("조건에 맞는 학생이 없어요.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "검색·필터 초기화" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20183");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("1명 표시 · 전체 6명", { exact: true })).toBeVisible();
  await filter(page, "확인할 수업", reviewLesson.title);
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toHaveText("모든 진행");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toBeDisabled();
  await filter(page, "확인할 수업", lesson.title);
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toBeEnabled();
  await filter(page, "진행 상태", "시작 전");
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20181");
  await filter(page, "담당 반", "2학년 2반");
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toHaveText("모든 진행");
});

test("열린 수업 없음은 학습 필터만 비활성화하고 계정 조회·검색을 유지", async ({ page }) => {
  await syntheticRows(page, "no-lesson");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "제출 상태", exact: true })).toHaveCount(0);
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20181");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "20181 비밀번호 초기화", exact: true })).toBeVisible();
});

test("등록 학생 없음은 필터 결과 없음과 구분", async ({ page }) => {
  await syntheticRows(page, "no-students");
  await expect(page.getByText("등록된 학생이 없어요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "검색·필터 초기화" })).toHaveCount(0);
});

test("좁은 학생 행은 요약·상세를 분리하고 대화상자/화면 전환 뒤 초점을 보존", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 900 });
  await syntheticRows(page);
  const row = page.locator("tbody tr").filter({ hasText: "20182" });
  const toggle = row.getByRole("button", { name: "20182 상세 보기" });
  const viewer = page.getByRole("button", { name: "20182 제출 작품 보기", exact: true });
  const reset = page.getByRole("button", { name: "20182 비밀번호 초기화", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(viewer).toBeHidden();
  await expect(reset).toBeHidden();
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await viewer.click();
  const dialog = page.getByRole("dialog", { name: "20182 학생의 제출 작품", exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeFocused();
  await reset.click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm.getByRole("button", { name: "취소", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(reset).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 }); await expect(reset).toBeFocused();
  await page.setViewportSize({ width: 768, height: 900 }); await expect(reset).toBeFocused();
  await toggle.click(); await expect(viewer).toBeHidden();
  await toggle.focus();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(toggle).toBeFocused(); await expect(viewer).toBeVisible();
  await viewer.click();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.keyboard.press("Escape"); await expect(viewer).toBeFocused();
  for (const width of [320, 768, 1180, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("교사 목록·격자는 진행/검색·작품·계정과 재조회 실패 뒤 상태를 유지", async ({ page }) => {
  await syntheticRows(page);
  const list = page.getByRole("button", { name: "목록 보기", exact: true });
  const grid = page.getByRole("button", { name: "격자 보기", exact: true });
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(18);
  const challenge = page.locator("tbody tr").filter({ hasText: "20185" });
  await expect(challenge.getByRole("progressbar", { name: "20185 실습 진도", exact: true })).toHaveAttribute("aria-valuetext", "0/4개 완료, 0%");

  await grid.focus(); await page.keyboard.press("Enter");
  await expect(grid).toBeFocused();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(6);
  await expect(page.locator("tbody tr").filter({ hasText: "20184" }).getByRole("progressbar", { name: "20184 필수 활동 완료율", exact: true })).toHaveAttribute("aria-valuenow", "100");
  await expect(challenge.getByRole("progressbar", { name: "20185 필수 활동 완료율", exact: true })).toHaveAttribute("aria-valuenow", "0");
  await expect(challenge.getByRole("progressbar", { name: "20185 필수 활동 완료율", exact: true })).toHaveAttribute("aria-valuetext", "필수 활동 0/14개 완료");
  await expect(challenge.locator("svg [data-start-marker]")).toHaveCount(3);
  await expect(page.locator("tbody tr").filter({ hasText: "20184" }).locator("svg [data-start-marker]")).toHaveCount(0);
  await expect(challenge.locator("svg [data-stage]")).toHaveCount(3);
  await expect(challenge.getByRole("button", { name: "20185 제출 작품 보기", exact: true })).toBeEnabled();
  await expect(challenge.getByRole("button", { name: "20185 비밀번호 초기화", exact: true })).toBeVisible();

  await filter(page, "진행 상태", "진행 중");
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20182");
  const row = page.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("progressbar", { name: "20182 필수 활동 완료율", exact: true })).toHaveAttribute("aria-valuetext", "필수 활동 1/14개 완료");
  await expect(row.locator("svg [data-start-marker]")).toHaveCount(2);
  const viewer = row.getByRole("button", { name: "20182 제출 작품 보기", exact: true });
  await viewer.click();
  await expect(page.getByRole("dialog", { name: "20182 학생의 제출 작품", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(viewer).toBeFocused();
  await row.getByRole("button", { name: "20182 비밀번호 초기화", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "취소", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");

  await list.focus(); await page.keyboard.press("Space");
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByRole("progressbar", { name: "20182 실습 진도", exact: true })).toHaveAttribute("aria-valuenow", "25");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toHaveText("진행 중");
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("20182");
  await grid.click();
  await page.route("**/api/classroom/teacher?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "FETCH_UNAVAILABLE", message: "학습 기록을 불러오지 못했어요. 다시 시도해 주세요." }) }));
  const refresh = page.getByRole("button", { name: "수업 새로고침", exact: true });
  await refresh.click();
  await expect(page.getByRole("alert").filter({ hasText: "학습 기록을 불러오지 못했어요" })).toContainText("학습 기록을 불러오지 못했어요");
  await expect(refresh).toBeEnabled();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("20182");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toHaveText("진행 중");
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("progressbar", { name: "20182 필수 활동 완료율", exact: true })).toHaveAttribute("aria-valuenow", "8");
});

test("선택 복습과 미지정 학생은 목록·격자에서 정규 완료율을 만들지 않음", async ({ page }) => {
  const review = LESSONS.find(item => item.mode === "review")!;
  const students = rows.map(row => ({ ...row, work: { ...emptyWork(review), edited: false, validated: false } }));
  await syntheticRows(page, "review", students);
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toBeDisabled();
  await expect(page.locator('[class*="summary"]')).toContainText("수업 완료—");
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator("tbody tr").first()).toContainText("선택 복습");
  await page.getByRole("button", { name: "격자 보기", exact: true }).click();
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText("선택 복습은 수업 완료율에 포함하지 않아요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "20181 비밀번호 초기화", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("20181");
  await expect(page.locator("tbody tr")).toHaveCount(1);

  await page.unroute("**/api/classroom/teacher?**");
  await syntheticRows(page, "no-lesson");
  await page.getByRole("button", { name: "격자 보기", exact: true }).click();
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "20181 비밀번호 초기화", exact: true })).toBeVisible();
});

test("27명 기본 목록은 작은 행과 3색 막대를 유지하며 두 보기 모두 좁은 창에 맞음", async ({ page }, testInfo) => {
  // Response-only fixtures do not create student accounts or write classroom records.
  const students: StudentRow[] = Array.from({ length: 27 }, (_, index) => ({ ...rows[index % rows.length], uid: `ui-teacher-density-${index}`, studentId: `231${String(index + 1).padStart(2, "0")}`, nickname: `연습 학생 ${index + 1}` }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await syntheticRows(page, "normal", students);
  const studentRows = page.locator("tbody tr");
  await expect(studentRows).toHaveCount(27);
  await expect(page.locator("tbody").getByRole("progressbar")).toHaveCount(81);
  const heights = await studentRows.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(Math.max(...heights)).toBeLessThanOrEqual(88);
  await testInfo.attach("student-list-row-density", { body: JSON.stringify({ count: heights.length, minimum: Math.min(...heights), maximum: Math.max(...heights), average: heights.reduce((sum, height) => sum + height, 0) / heights.length }), contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("teacher-students-list-27.png"), fullPage: true });
  const view = page.getByRole("group", { name: "학생 현황 보기", exact: true });
  for (const layout of ["목록 보기", "격자 보기"]) {
    await view.getByRole("button", { name: layout, exact: true }).click();
    for (const width of [1440, 1180, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(studentRows).toHaveCount(27);
      const first = studentRows.first();
      await expect(first.getByRole("progressbar")).toHaveCount(layout === "목록 보기" ? 3 : 1);
      const toggle = first.getByRole("button", { name: "23101 상세 보기", exact: true });
      const bounds = await toggle.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44); expect(bounds?.height).toBeGreaterThanOrEqual(44);
      if (layout === "격자 보기") await expect(first.getByRole("button", { name: "23101 비밀번호 초기화", exact: true })).toBeVisible();
    }
  }
  await page.reload();
  await expect(view.getByRole("button", { name: "목록 보기", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("제출 작품 창에서 다른 열린 수업을 고르면 그 학생의 그 수업 작품만 다시 읽고 최근 제출본을 펼침", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => { const match = request.url().match(/students\/ui-teacher-2\/work\/([^/?]+)/); if (match) requested.push(match[1]); });
  await syntheticRows(page);
  const pending = { id: "other-lesson-request", status: "pending", message: "다른 수업 확인 요청", requestedAt: 2000, project: { type: "abstraction", current: "", goal: "", conditions: [], core: [], noise: [], plans: [] } };
  await page.route("**/api/classroom/students/ui-teacher-2/work/conditionals**", route => route.fulfill({ json: { ...rows[2].work, review: pending } }));
  await page.getByRole("button", { name: "20183 제출 작품 보기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "20183 학생의 제출 작품", exact: true });
  await expect(dialog.locator("details")).toHaveCount(3);
  await expect(dialog.locator("details[open]")).toHaveCount(1);
  // 개발 서버의 StrictMode는 같은 조회를 두 번 할 수 있어 수업 종류만 비교해요.
  await expect.poll(() => [...new Set(requested)]).toEqual([lesson.id]);
  await dialog.getByRole("combobox", { name: "볼 수업", exact: true }).click();
  await page.getByRole("option", { name: "조건에 따라 달라지는 프로그램", exact: true }).click();
  await expect(dialog).toContainText("조건에 따라 달라지는 프로그램 · ");
  await expect.poll(() => [...new Set(requested)]).toEqual([lesson.id, "conditionals"]);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "요청본 승인", exact: true })).toBeEnabled();
  await page.route("**/api/classroom/students/ui-teacher-2/work/loops**", route => route.fulfill({ json: { ...rows[2].work, missions: {}, review: null } }));
  await dialog.getByRole("combobox", { name: "볼 수업", exact: true }).click();
  await page.getByRole("option", { name: "반복으로 똑똑하게", exact: true }).click();
  await expect(dialog).toContainText("이 수업에는 아직 제출한 작품이 없어요.");
  await expect(dialog.locator("details")).toHaveCount(0);
});

test("임시 비밀번호 일괄 발급은 미설정 학생만 고르고 최근 접속 학생은 기본 제외하며 값은 숨김으로 보여 줌", async ({ page }) => {
  const students = rows.map((row, index) => ({ ...row, mustChangePassword: index < 3, lastActiveAt: index === 1 ? Date.now() : null }));
  const bodies: { uid: string; body: unknown }[] = [];
  await page.route("**/api/classroom/students/*/reset", async route => {
    const uid = new URL(route.request().url()).pathname.split("/")[4];
    bodies.push({ uid, body: route.request().postDataJSON() });
    await route.fulfill(uid === "ui-teacher-2" ? { status: 409, json: { code: "ALREADY_ACTIVE", message: "이미 비밀번호를 정했거나 접속 중이라 건너뛰었어요." } } : { json: { password: `temp-${uid}`, expiresAt: Date.now() + 30 * 60_000 } });
  });
  await syntheticRows(page, "normal", students);
  await page.getByRole("button", { name: "임시 비밀번호 한꺼번에 발급", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox")).toHaveCount(3);
  await expect(dialog.getByRole("checkbox", { name: /20182/ })).not.toBeChecked();
  await dialog.getByRole("button", { name: "2명 발급하기", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("1명 발급 · 1명 건너뜀");
  expect(bodies).toEqual([{ uid: "ui-teacher-0", body: { pendingOnly: true } }, { uid: "ui-teacher-2", body: { pendingOnly: true } }]);
  await expect(dialog).not.toContainText("temp-ui-teacher-0");
  await expect(dialog).toContainText("건너뛰었어요");
  const unloadBlocked = () => page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
  expect(await unloadBlocked()).toBe(true);
  await dialog.getByRole("button", { name: "비밀번호 보이기", exact: true }).click();
  await expect(dialog).toContainText("temp-ui-teacher-0");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByText("2학년 1반 · 20181", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "학생별 학습 현황", exact: true })).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await dialog.getByRole("button", { name: "전달 완료", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("temp-ui-teacher-0")).toHaveCount(0);
  expect(await unloadBlocked()).toBe(false);
  await expect(page.getByText("1명에게 임시 비밀번호를 발급했어요.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "임시 비밀번호 한꺼번에 발급", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: /20181/ })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /20181/ })).toHaveAccessibleName(/발급됨/);
  await expect(dialog.getByRole("button", { name: "1명 발급하기", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "학생별 학습 현황", exact: true })).toBeVisible();
});

test("학생별 초기화 직후 일괄 발급 창은 방금 받은 학생을 기본 선택하지 않음", async ({ page }) => {
  const students = rows.map((row, index) => ({ ...row, mustChangePassword: index < 3, lastActiveAt: null }));
  await page.route("**/api/classroom/students/*/reset", route => route.fulfill({ json: { password: "temp-single", expiresAt: Date.now() + 30 * 60_000 } }));
  await syntheticRows(page, "normal", students);
  await page.getByRole("button", { name: "20183 비밀번호 초기화", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "초기화하기", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "전달 완료", exact: true }).click();
  await page.getByRole("button", { name: "임시 비밀번호 한꺼번에 발급", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox", { name: /20183/ })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /20183/ })).toHaveAccessibleName(/발급됨/);
  await expect(dialog.getByRole("button", { name: "2명 발급하기", exact: true })).toBeVisible();
});
