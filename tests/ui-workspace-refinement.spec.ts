import { expect, test, type Page } from "@playwright/test";
import { buildEntryProject, parseEntryProject } from "../src/lib/classroom/entry-project";
import { buildProgrammingProject } from "../src/lib/classroom/programming-entry";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { emptyWork } from "../src/lib/classroom/progress";
import { resumeLabelFor } from "../src/lib/classroom/lesson-navigation";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";

const studentId = "20102";
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async () => {
  for (const lesson of ["programming-13", "entry-bot-lab"]) await db.collection("csWork").doc(`student-${studentId}__${lesson}`).delete();
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
});

test("이어하기는 저장하지 않는 개념·문제 위치를 약속하지 않고 저장된 실습 미션을 안내", () => {
  const work = emptyWork(PROGRAMMING_LESSON);
  work.updatedAt = 1;
  work.draft.stage = "concept";
  expect(resumeLabelFor(PROGRAMMING_LESSON, work)).toBe("개념 이어하기");
  work.draft.stage = "quiz";
  expect(resumeLabelFor(PROGRAMMING_LESSON, work)).toBe("퀴즈 이어하기");
  work.draft.stage = "practice";
  work.draft.programming = { mission: "multiply", projects: {}, reflection: "" };
  expect(resumeLabelFor(PROGRAMMING_LESSON, work)).toBe("실습 · 곱셈 계산기");
});

async function enter(page: Page, lesson: "programming-13" | "entry-bot-lab") {
  await resetStudent(page.request, studentId);
  await db.collection("csWork").doc(`student-${studentId}__${lesson}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  const endpoint = `/api/classroom/work/${lesson}`;
  const work: Work = await (await page.request.get(endpoint)).json();
  const project = buildEntryProject(["when_run_button_click", "move_direction", "dialog_time"]);
  const draft = { ...work.draft, stage: "practice", ...(lesson === "programming-13" ? { programming: { mission: "name", projects: { name: buildProgrammingProject() }, reflection: "" } } : { entryProject: project, practiceOrder: parseEntryProject(project)!.order }) };
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return endpoint;
}

test("실습 기본 배치를 줄이고 넓게 보기에서도 같은 작업실·초점·모바일 경계를 유지", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await enter(page, "programming-13");
  const iframe = page.locator("iframe");
  const top = await iframe.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  await testInfo.attach("workspace-default-geometry", { body: JSON.stringify({ viewport: "1280x720", iframeTop: top }), contentType: "application/json" });
  expect(top).toBeLessThan(740); // Baseline: 1031px at this viewport.
  await page.frameLocator("iframe").locator("#entryWorkspaceBoard").waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("workspace-default-1280.png") });
  await expect(page.getByRole("tab", { name: "개념 0%" })).toBeVisible();
  await page.getByText("수업 안내 · 자세한 학습 진행", { exact: true }).click();
  await expect(page.getByRole("definition").filter({ hasText: "기본 4개 미션" })).toBeVisible();
  await page.getByText("수업 안내 · 자세한 학습 진행", { exact: true }).click();
  const identity = await iframe.elementHandle();
  const native = page.frames().find((frame) => frame.url().includes("exercise=programming"))!;
  const before = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  const toggle = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
  const restore = page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(restore).toBeFocused();
  expect(await identity!.evaluate((element) => element === document.querySelector("iframe"))).toBe(true);
  expect(await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject())).toEqual(before);
  const scroller = page.getByRole("region", { name: "엔트리 작업실 가로 이동" });
  expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("workspace-wide-1280.png") });
  await page.setViewportSize({ width: 768, height: 720 });
  const account = page.getByRole("button", { name: "학생 메뉴", exact: true });
  await account.click();
  await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await restore.click();
  await toggle.click();
  await restore.press("Escape");
  await expect(toggle).toBeFocused();
  for (const width of [821, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await iframe.scrollIntoViewIfNeeded();
  await expect(page.frameLocator("iframe").locator("#entryWorkspaceBoard")).toBeVisible();
  await testInfo.attach("workspace-mobile-editor", { body: await scroller.screenshot(), contentType: "image/png" });
  await page.screenshot({ path: testInfo.outputPath("workspace-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("작업실 가까이 저장·검증·제출을 구분하고 수정·저장 실패에도 이전 제출을 보존", async ({ page }) => {
  const endpoint = await enter(page, "entry-bot-lab");
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  const states = page.getByRole("group", { name: "작품 저장·검증·제출 상태" });
  await expect(states).toContainText("저장 완료");
  await expect(states).toContainText("검증 전");
  await expect(states).toContainText("아직 제출 전");
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(states).toContainText("검증 통과");
  await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toHaveClass(/bg-primary/);
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(states).toContainText("현재 작품 제출 완료");
  const submitted = ((await (await page.request.get(endpoint)).json()) as Work).submission;
  const frame = page.frameLocator("iframe");
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true }).locator("..").click();
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let saveResponse = 503;
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await held;
    await route.fulfill({ status: saveResponse, contentType: "application/json", body: JSON.stringify({ message: "합성 저장 실패", code: saveResponse === 409 ? "REVISION_CONFLICT" : "UNAVAILABLE" }) });
  });
  await frame.locator("input:not([disabled]):visible").fill("20");
  await frame.locator("input:not([disabled]):visible").press("Enter");
  await expect(states).toContainText("변경 내용 저장 대기");
  await expect(states).toContainText("다시 검증 필요");
  await expect(states).toContainText("이전 제출 유지 · 수정 중");
  await expect(states).toContainText("저장 중");
  release();
  await expect(states).toContainText("저장 확인 필요");
  await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "현재 입력은 이 화면에 유지" })).toBeVisible();
  saveResponse = 409;
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(states).toContainText("저장 기록 충돌");
  await page.getByRole("button", { name: "저장 오류 확인", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "저장 기록이 서로 달라요" })).toBeFocused();
  expect(((await (await page.request.get(endpoint)).json()) as Work).submission).toEqual(submitted);
});
