import { expect, test, type Page } from "@playwright/test";
import { buildEntryProject, parseEntryProject } from "../src/lib/classroom/entry-project";
import { buildProgrammingProject, parseProgrammingProject, programmingMissions } from "../src/lib/classroom/programming-entry";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { emptyWork } from "../src/lib/classroom/progress";
import { resumeLabelFor } from "../src/lib/classroom/lesson-navigation";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword, saveDraft } from "./emulator";

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

async function enter(page: Page, lesson: "programming-13" | "entry-bot-lab", options: { waitForReady?: boolean; programmingProject?: string } = {}) {
  await resetStudent(page.request, studentId);
  await db.collection("csWork").doc(`student-${studentId}__${lesson}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  const endpoint = `/api/classroom/work/${lesson}`;
  const work: Work = await (await page.request.get(endpoint)).json();
  const project = buildEntryProject(["when_run_button_click", "move_direction", "dialog_time"]);
  const draft = { ...work.draft, stage: "practice", ...(lesson === "programming-13" ? { programming: { mission: "name", projects: { name: options.programmingProject ?? buildProgrammingProject() }, reflection: "" } } : { entryProject: project, practiceOrder: parseEntryProject(project)!.order }) };
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}`, { waitUntil: options.waitForReady === false ? "domcontentloaded" : "load" });
  await page.locator("iframe").scrollIntoViewIfNeeded();
  if (options.waitForReady !== false) await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return endpoint;
}

async function expectEntryFallback(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && active.id === "entry-run") return !active.disabled;
    const box = active?.getBoundingClientRect();
    return active?.textContent?.trim() === "엔트리 작업실" && !!box && box.width > 20 && box.height > 10;
  })).toBe(true);
}

test("comments-layout: 탭을 중앙에 두고 실습 안내·간결한 작업실 상단·키보드·모바일 배치를 유지", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1544, height: 712 });
  await enter(page, "programming-13");
  const mission = programmingMissions[0];
  const guidance = page.getByRole("complementary", { name: mission.title, exact: true });
  const editor = page.getByRole("region", { name: "엔트리 블록 코딩 작업", exact: true });
  const missions = page.getByRole("navigation", { name: "실습 미션", exact: true });
  const tabs = page.getByRole("tablist", { name: "수업 단계", exact: true });
  const iframe = editor.locator("iframe");
  const toolbar = editor.getByRole("heading", { name: "엔트리 작업실", exact: true }).locator("..");
  const states = editor.getByRole("group", { name: "작품 저장·검증·제출 상태", exact: true });
  const help = editor.locator("summary").filter({ hasText: "작업실 사용 안내" });
  const toggle = editor.getByRole("button", { name: "작업실 넓게 보기", exact: true });
  const scroller = editor.getByRole("region", { name: "엔트리 작업실 가로 이동", exact: true });
  const experiment = guidance.getByText(mission.experiment, { exact: true });
  const hint = guidance.getByText("블록 연결 힌트", { exact: true });
  await expect(guidance.getByRole("heading", { name: mission.title, exact: true })).toBeVisible();
  await expect(guidance.getByText(mission.goal, { exact: true })).toBeVisible();
  await expect(experiment).toBeVisible();
  await expect(guidance.getByText(mission.hint, { exact: true })).toBeHidden();
  await expect(page.frameLocator("iframe").locator("#entryWorkspaceBoard")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(experiment).toBeInViewport();
  const guideBox = (await guidance.boundingBox())!, editorBox = (await editor.boundingBox())!;
  const missionBox = (await missions.boundingBox())!, tabBox = (await tabs.boundingBox())!;
  expect(guideBox.width).toBeGreaterThanOrEqual(258);
  expect(guideBox.width).toBeLessThanOrEqual(262);
  expect(editorBox.x - guideBox.x - guideBox.width).toBeGreaterThanOrEqual(15);
  expect(Math.abs(guideBox.y - editorBox.y)).toBeLessThanOrEqual(1);
  expect(missionBox.y + missionBox.height).toBeLessThanOrEqual(Math.min(guideBox.y, editorBox.y));
  expect(tabBox.y + tabBox.height).toBeLessThanOrEqual(missionBox.y);
  const stageRow = await tabs.evaluate(element => {
    const row = element.closest("details")!.parentElement!;
    const toggle = row.querySelector<HTMLButtonElement>("button[aria-pressed]")!;
    return { width: row.getBoundingClientRect().width, button: toggle.getBoundingClientRect().width, gap: parseFloat(getComputedStyle(row).columnGap) };
  });
  expect(stageRow.width).toBe(1440);
  expect(tabBox.width + stageRow.button + stageRow.gap).toBeCloseTo(stageRow.width, 1);
  const iframeBox = (await iframe.boundingBox())!, toolbarBox = (await toolbar.boundingBox())!;
  expect(iframeBox.width).toBeGreaterThanOrEqual(1000);
  expect(toolbarBox.height).toBeLessThanOrEqual(80);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(iframeBox.y);
  await expect(toolbar.getByRole("button")).toHaveCount(3);
  for (const support of [states, help]) {
    await expect(support).toBeVisible();
    expect((await support.boundingBox())!.y).toBeGreaterThanOrEqual(iframeBox.y + iframeBox.height);
  }
  expect(await scroller.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await testInfo.attach("comments-layout-desktop-geometry", { body: JSON.stringify({ viewport: "1544x712", guidance: guideBox, editor: editorBox, missions: missionBox, stages: tabBox, iframe: await iframe.boundingBox() }), contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("comments-layout-1544.png") });
  for (const width of [1114, 1544]) {
    await page.setViewportSize({ width, height: 712 });
    const stages = (await tabs.boundingBox())!, navigation = (await tabs.locator("..").boundingBox())!;
    expect(Math.abs(stages.x + stages.width / 2 - navigation.x - navigation.width / 2)).toBeLessThanOrEqual(1);
  }
  await missions.getByRole("button").last().focus();
  await page.keyboard.press("Tab");
  await expect(hint).toBeFocused();
  await hint.press("Enter");
  await expect(guidance.getByText(mission.hint, { exact: true })).toBeVisible();
  await hint.press("Enter");
  await expect(guidance.getByText(mission.hint, { exact: true })).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(editor.getByRole("button", { name: "실행하기", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(editor.getByRole("button", { name: "무대 처음 위치로 초기화", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(scroller).toBeFocused();
  await page.keyboard.press("Tab");
  await expect.poll(() => iframe.evaluate(element => document.activeElement === element)).toBe(true);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 712 });
    // Resizing a focused iframe can scroll the page between separate geometry reads.
    const { guide: narrowGuide, editor: narrowEditor } = await guidance.evaluate(element => {
      const editor = document.querySelector<HTMLElement>('[aria-label="엔트리 블록 코딩 작업"]')!;
      return { guide: element.getBoundingClientRect().toJSON(), editor: editor.getBoundingClientRect().toJSON() };
    });
    await testInfo.attach(`comments-layout-${width}-geometry`, { body: JSON.stringify({ guidance: narrowGuide, editor: narrowEditor }), contentType: "application/json" });
    expect(narrowGuide.y + narrowGuide.height).toBeLessThanOrEqual(narrowEditor.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await expect(experiment).toBeVisible();
  }
});

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
  await expect(page.getByText("수업 안내 · 이어하기 기준 · 학습 진행", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "실습 0%" })).toContainText("0/4개 제출");
  await expect(page.locator('[data-stage-progress="practice"]')).toHaveAttribute("data-percent", "0");
  const identity = await iframe.elementHandle();
  const native = page.frames().find((frame) => frame.url().includes("exercise=programming"))!;
  const before = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  const toggle = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
  const restore = page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true });
  await expect(toggle).toBeHidden();
  await page.setViewportSize({ width: 1920, height: 720 });
  const defaultWidth = (await iframe.boundingBox())!.width;
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(restore).toBeFocused();
  await expect.poll(async () => (await iframe.boundingBox())!.width).toBeGreaterThan(defaultWidth);
  expect(await identity!.evaluate((element) => element === document.querySelector("iframe"))).toBe(true);
  const beforeProgram = parseProgrammingProject(JSON.stringify(before));
  expect(beforeProgram).not.toBeNull();
  const widened = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  expect(parseProgrammingProject(JSON.stringify(widened))?.key).toEqual(beforeProgram!.key);
  const scroller = page.getByRole("region", { name: "엔트리 작업실 가로 이동" });
  expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("workspace-wide-1920.png") });
  await page.setViewportSize({ width: 768, height: 720 });
  await expect(restore).toBeVisible();
  await expect(page.locator("[data-lesson-shell]")).toHaveAttribute("data-workspace-wide", "true");
  const account = page.getByRole("button", { name: "학생 메뉴", exact: true });
  await account.click();
  await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await restore.click();
  await expect(toggle).toBeHidden();
  await expectEntryFallback(page);
  await page.setViewportSize({ width: 1920, height: 720 });
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

test("workspace-availability: 실제 셸 경계·로딩 중 초점·입력·실행과 수동 넓게 보기를 보존", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 720 });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/entryjs\/workspace\.html\?exercise=programming&mission=name$/, async route => { await held; await route.continue(); }, { times: 1 });
  const project = buildProgrammingProject([[
    { type: "when_run_button_click", params: [null] },
    { type: "ask_and_wait", params: [{ type: "text", params: ["이름은?"] }, null] },
  ]]);
  const endpoint = await enter(page, "programming-13", { waitForReady: false, programmingProject: project });
  const shell = page.locator("[data-lesson-shell]"), iframe = page.locator("iframe");
  const identity = await iframe.elementHandle();
  const run = page.locator("#entry-run");
  const toggle = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
  const restore = page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true });
  try {
    await expect(run).toBeDisabled();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(toggle).toBeHidden();
    // A disabled run button cannot receive the disappearing toggle's focus.
    await expect(page.getByText("엔트리 작업실", { exact: true })).toBeFocused();
  } finally { release(); }
  await expect(run).toBeEnabled({ timeout: 20_000 });
  expect(await identity!.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
  const native = page.frames().find(frame => frame.url().includes("exercise=programming"))!;
  const before = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  const beforeProgram = parseProgrammingProject(JSON.stringify(before));
  expect(beforeProgram).not.toBeNull();
  const reflection = page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?", { exact: true });
  await reflection.fill("폭을 바꿔도 입력을 이어가요");
  await reflection.press("Control+s");
  await expect.poll(async () => ((await (await page.request.get(endpoint)).json()) as Work).draft.programming?.reflection).toBe("폭을 바꿔도 입력을 이어가요");
  const guidance = page.getByRole("complementary", { name: programmingMissions[0].title, exact: true });
  const editor = page.getByRole("region", { name: "엔트리 블록 코딩 작업", exact: true });
  for (const width of [1339, 1340, 1339]) {
    await page.setViewportSize({ width, height: 720 });
    // Compare both boxes before the focused iframe's scroll position can change.
    const { guide: guideBox, editor: editorBox } = await guidance.evaluate(element => {
      const editor = document.querySelector<HTMLElement>('[aria-label="엔트리 블록 코딩 작업"]')!;
      return { guide: element.getBoundingClientRect().toJSON(), editor: editor.getBoundingClientRect().toJSON() };
    });
    if (width < 1340) expect(guideBox.y + guideBox.height).toBeLessThanOrEqual(editorBox.y);
    else expect(guideBox.x + guideBox.width).toBeLessThanOrEqual(editorBox.x);
    expect(await identity!.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
    await expect(reflection).toBeFocused();
    await expect(reflection).toHaveValue("폭을 바꿔도 입력을 이어가요");
  }
  const resized = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  expect(parseProgrammingProject(JSON.stringify(resized))?.key).toBe(beforeProgram!.key);
  // The shell's available width, including scrollbar effects, governs the 1472px boundary.
  for (const width of [1472, 1473, 1440, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    const available = (await shell.boundingBox())!.width;
    if (available > 1472) await expect(toggle).toBeVisible();
    else await expect(toggle).toBeHidden();
    await expect(reflection).toBeFocused();
    await expect(reflection).toHaveValue("폭을 바꿔도 입력을 이어가요");
  }
  await page.setViewportSize({ width: 1920, height: 720 });
  await toggle.focus();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(toggle).toBeHidden();
  await expectEntryFallback(page);
  await page.setViewportSize({ width: 1920, height: 720 });
  const defaultWidth = (await iframe.boundingBox())!.width;
  await toggle.click();
  await expect.poll(async () => (await iframe.boundingBox())!.width).toBeGreaterThan(defaultWidth);
  await reflection.focus();
  for (const width of [1280, 821, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(shell).toHaveAttribute("data-workspace-wide", "true");
    await expect(restore).toBeVisible();
    await expect(reflection).toBeFocused();
    expect(await identity!.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
  }
  await restore.press("Escape");
  await expect(shell).toHaveAttribute("data-workspace-wide", "false");
  await expect(toggle).toBeHidden();
  await expectEntryFallback(page);
  await page.setViewportSize({ width: 1920, height: 720 });
  await toggle.click();
  await run.click();
  const stop = page.getByRole("button", { name: "실행 정지", exact: true });
  await expect(stop).toBeVisible();
  const response = page.frameLocator("iframe").locator("input:not([disabled]):visible");
  await expect(response).toBeVisible();
  await response.fill("초코");
  for (const width of [1339, 1340, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(restore).toBeVisible();
    await expect(response).toBeFocused();
    await expect(response).toHaveValue("초코");
    await expect(stop).toBeVisible();
    expect(await identity!.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
  }
  await restore.click();
  await expect(stop).toBeVisible();
  await expect(response).toHaveValue("초코");
  await stop.click();
  await expect(run).toBeEnabled();
  expect(await identity!.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
  const after = await native.evaluate(() => (window as unknown as { Entry: { exportProject: () => unknown } }).Entry.exportProject());
  expect(parseProgrammingProject(JSON.stringify(after))?.key).toBe(beforeProgram!.key);
  await expect(reflection).toHaveValue("폭을 바꿔도 입력을 이어가요");
});

test("작업실 가까이 저장·검증·제출을 구분하고 수정·저장 실패에도 이전 제출을 보존", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 720 });
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
  await expect(states).toContainText("저장하지 않은 변경 있음");
  await expect(states).toContainText("다시 검증 필요");
  await expect(states).toContainText("이전 제출 유지 · 수정 중");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(states).toContainText("저장 중");
  release();
  await expect(states).toContainText("저장 확인 필요");
  await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "현재 입력은 이 화면에 유지" })).toBeVisible();
  saveResponse = 409;
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(states).toContainText("저장 기록 충돌");
  const saveError = page.getByRole("button", { name: "저장 오류 확인", exact: true });
  await expect(saveError).toBeVisible();
  const saveErrorBox = (await saveError.boundingBox())!, iframeBox = (await page.locator("iframe").boundingBox())!;
  expect(saveErrorBox.y + saveErrorBox.height).toBeLessThanOrEqual(iframeBox.y);
  await saveError.click();
  await expect(page.getByRole("alert").filter({ hasText: "저장 기록이 서로 달라요" })).toBeFocused();
  expect(((await (await page.request.get(endpoint)).json()) as Work).submission).toEqual(submitted);
});
