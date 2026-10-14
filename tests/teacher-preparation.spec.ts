import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import type { HelpRequest } from "../src/lib/classroom/help";
import type { ClassSettings, TeacherDashboard } from "../src/lib/classroom/types";
import { readyTeacher } from "./emulator";

const programming = LESSONS.find(lesson => lesson.id === "programming-13")!;
const flowchart = LESSONS.find(lesson => lesson.id === "review-flowchart")!;
const helpRequests: HelpRequest[] = [
  { id: "00000000-0000-4000-8000-000000000001", uid: "preparation-student-1", studentId: "20181", classId: "2-1", lessonId: programming.id, stage: "practice", mission: "multiply", requestedAt: 1000, revision: 1, status: "pending" },
  { id: "00000000-0000-4000-8000-000000000002", uid: "preparation-student-2", studentId: "20182", classId: "2-1", lessonId: flowchart.id, stage: "practice", mission: "2", requestedAt: 2000, revision: 1, status: "pending" },
];
async function choose(page: Page, className: string) {
  await page.getByRole("combobox", { name: "담당 반", exact: true }).click();
  await expect(page.getByRole("option", { name: className, exact: true })).toBeVisible();
  await page.getByRole("option", { name: className, exact: true }).click();
}

test("[R3-help-context] 같은 손들기 조회로 여러 수업·미션과 상단 진입·성공 시각을 표시", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사");
  await readyTeacher(page.request);
  let reads = 0;
  await page.route("**/api/classroom/help?classId=*", async route => {
    reads++;
    await route.fulfill({ json: { requests: helpRequests } });
  });
  await page.goto("/teacher?classId=2-1");
  const jump = page.getByRole("link", { name: "손든 학생 2명 보기", exact: true });
  await expect(jump).toBeVisible();
  const help = page.getByRole("region", { name: /손든 학생/ });
  await expect(help.getByRole("button", { name: /20181/ })).toContainText(programming.title);
  await expect(help.getByRole("button", { name: /20181/ })).toContainText("실습 · 곱셈 계산기");
  await expect(help.getByRole("button", { name: /20182/ })).toContainText(flowchart.title);
  await expect(help.getByRole("button", { name: /20182/ })).toContainText("놀이기구 탑승 판정기");
  await expect(help.locator("p").filter({ hasText: "마지막 확인" }).locator("time")).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}T/);
  await jump.focus();
  await page.keyboard.press("Enter");
  await expect(help.getByRole("heading", { name: /손든 학생/ })).toBeFocused();
  expect(reads).toBe(1);
  await page.setViewportSize({ width: 390, height: 720 });
  await expect(jump).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("[R3-help-state] 최초 실패는 0명으로 숨기지 않고 마지막 성공조회·건수를 실패와 반전환에서 구분", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사");
  await readyTeacher(page.request);
  let fail = true;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/help?classId=*", async route => {
    const classId = new URL(route.request().url()).searchParams.get("classId");
    if (classId === "2-2") await gate;
    if (fail) await route.fulfill({ status: 503, json: { code: "UNAVAILABLE", message: "손들기 조회 시험 실패" } });
    else await route.fulfill({ json: { requests: classId === "2-1" ? helpRequests : [] } });
  });
  await page.goto("/teacher?classId=2-1");
  const help = page.getByRole("region", { name: /손든 학생/ });
  await expect(help.getByRole("alert")).toContainText("손들기 조회 시험 실패");
  await expect(page.getByRole("link", { name: /손든 학생 \d+명 보기/ })).toHaveCount(0);
  await expect(help.getByText("도움 요청이 들어오면 여기에서 확인해요.", { exact: true })).toHaveCount(0);
  fail = false;
  await help.getByRole("button", { name: "손들기 새로고침", exact: true }).click();
  await expect(page.getByRole("link", { name: "손든 학생 2명 보기", exact: true })).toBeVisible();
  const checked = help.locator("p").filter({ hasText: "마지막 확인" }).locator("time");
  const previousChecked = await checked.getAttribute("datetime");
  fail = true;
  await help.getByRole("button", { name: "손들기 새로고침", exact: true }).click();
  await expect(help.getByRole("alert")).toContainText("손들기 조회 시험 실패");
  await expect(checked).toHaveAttribute("datetime", previousChecked!);
  await expect(help.getByRole("button", { name: /20181/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "손든 학생 2명 보기", exact: true })).toBeVisible();
  fail = false;
  await choose(page, "2학년 2반");
  await expect(page.getByRole("link", { name: "손든 학생 2명 보기", exact: true })).toHaveCount(0);
  await expect(help.getByRole("button", { name: /20181/ })).toHaveCount(0);
  release();
  await expect(help.getByText("도움 요청이 들어오면 여기에서 확인해요.", { exact: true })).toBeVisible();
});

test("[R3-class-preparation] 숫자 반순·미지정·알 수 없는 수업과 정확한 반 설정창의 닫기·재접속", async ({ page }) => {
  await readyTeacher(page.request);
  const classrooms: ClassSettings[] = [
    { id: "2-11", name: "2학년 11반", revision: 0, currentLessonId: "unknown-lesson", openedLessonIds: ["unknown-lesson"] },
    { id: "2-2", name: "2학년 2반", revision: 0, currentLessonId: null, openedLessonIds: [] },
    { id: "2-10", name: "2학년 10반", revision: 0, currentLessonId: programming.id, openedLessonIds: [programming.id] },
    { id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: programming.id, openedLessonIds: [programming.id] },
  ];
  await page.route("**/api/classroom/teacher?*", async route => {
    const response = await route.fetch();
    const data = await response.json() as TeacherDashboard;
    const classId = new URL(route.request().url()).searchParams.get("classId");
    const classroom = classrooms.find(item => item.id === classId);
    await route.fulfill({ response, json: { ...data, classrooms, ...(classroom ? { classroom, selectedLessonId: classroom.openedLessonIds.includes(programming.id) ? programming.id : null, students: [] } : {}) } });
  });
  await page.goto("/teacher/classes?classId=2-1");
  const table = page.getByRole("table", { name: "담당 반 수업 준비", exact: true });
  await expect(table).toBeVisible();
  await expect(table.locator("tbody th")).toHaveText(["2학년 1반", "2학년 2반", "2학년 10반", "2학년 11반"]);
  await expect(table.getByRole("row", { name: /2학년 2반/ })).toContainText("미지정");
  const unpublished = table.getByRole("row", { name: /2학년 11반/ });
  await expect(unpublished.getByRole("cell").nth(0)).toHaveText("미지정");
  await expect(unpublished.getByRole("cell").nth(1)).toHaveText("0개");
  const row = table.getByRole("row", { name: /2학년 10반/ });
  await row.getByRole("link", { name: /설정 열기/ }).click();
  const dialog = page.getByRole("dialog", { name: "2학년 10반 수업 관리", exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/teacher\/classes\?classId=2-10$/);
  await expect(page.getByRole("button", { name: "수업 관리", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "수업 관리", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await table.getByRole("row", { name: /2학년 10반/ }).getByRole("link", { name: /설정 열기/ }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/teacher\/classes\?classId=2-10$/);
  await page.goto("/teacher/classes?classId=2-10&manage=1&manage=1");
  await expect(page.getByRole("button", { name: "수업 관리", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 720 });
  await expect(table).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
