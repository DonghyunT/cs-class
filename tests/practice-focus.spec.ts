import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildProgrammingProject, parseProgrammingProject, programmingProjectMatches, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, saveDraft, entryReset, entryStart, entryStop } from "./emulator";

const lessonIds = ["programming-13", "entry-bot-lab", "review-sandwich", "review-abstraction", "review-flowchart"];
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeAll(async () => { originalClass = (await db.doc("csClasses/2-1").get()).data(); });
test.afterAll(async () => {
  if (originalClass) await db.doc("csClasses/2-1").set(originalClass);
  for (const id of lessonIds) await db.doc(`csWork/student-20101__${id}`).delete();
});

for (const id of lessonIds) {
  test(`practice-focus: ${id} 입력·같은 작업실·단계 기억·기본 복귀`, async ({ page }) => {
    await readyStudent(page.request);
    await db.doc("csClasses/2-1").update({ openedLessonIds: lessonIds, currentLessonId: null });
    await db.doc(`csWork/student-20101__${id}`).delete();
    await page.setViewportSize({ width: 1544, height: 900 });
    await page.goto(`/classroom/${id}`);
    await page.getByRole("tab", { name: /^실습/ }).click();
    const shell = page.locator("[data-lesson-shell]");
    const toggle = page.getByRole("button", { name: "실습 집중 모드", exact: true });
    await expect(toggle).toBeVisible();
    const iframe = page.locator('iframe[src*="/entryjs/workspace.html"]');
    if (id === "programming-13" || id === "entry-bot-lab") {
      await expect(iframe).toHaveCount(1);
      await expect(iframe).toBeVisible();
      await iframe.evaluate(el => el.setAttribute("data-focus-preserved", "same"));
    }
    const input = page.getByLabel("자연어 명령");
    if (id === "review-sandwich") await input.fill("작성 중인 명령");
    await toggle.click();
    await expect(shell).toHaveAttribute("data-practice-focused", "true");
    await expect(page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true })).toBeFocused();
    await expect(page.getByRole("tab", { name: /^개념/ })).toBeHidden();
    await expect(page.getByRole("link", { name: "수업 나가기", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "손들기", exact: true })).toHaveCount(CLASSROOM_HELP_ENABLED ? 1 : 0);
    if (await iframe.count()) await expect(iframe).toHaveAttribute("data-focus-preserved", "same");
    if (id === "review-sandwich") await expect(input).toHaveValue("작성 중인 명령");
    const wide = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
    if (await wide.isVisible()) {
      await wide.click();
      await expect(shell).toHaveAttribute("data-workspace-wide", "true");
      await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).press("Escape");
      await expect(shell).toHaveAttribute("data-workspace-wide", "false");
      await expect(shell).toHaveAttribute("data-practice-focused", "true");
    }
    const stages = page.getByText("단계 바꾸기", { exact: true });
    await stages.click();
    await page.getByRole("tab", { name: /^개념/ }).click();
    await expect(shell).toHaveAttribute("data-practice-focused", "false");
    await page.getByRole("tab", { name: /^실습/ }).click();
    await expect(shell).toHaveAttribute("data-practice-focused", "true");
    await page.getByRole("button", { name: "학생 메뉴", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(shell).toHaveAttribute("data-practice-focused", "true");
    await page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true }).press("Escape");
    await expect(shell).toHaveAttribute("data-practice-focused", "false");
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.setViewportSize({ width: 390, height: 720 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true })).toBeVisible();
    await page.reload();
    await expect(shell).toHaveAttribute("data-practice-focused", "false");
    await page.getByRole("tab", { name: /^실습/ }).click();
    await expect(toggle).toBeVisible();
  });
}

const programmingEndpoint = "/api/classroom/work/programming-13";
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const storedProgramming = async (page: Page): Promise<Work> => (await page.request.get(programmingEndpoint)).json();

async function prepareProgramming(page: Page, mission: "name" | "move", project = buildProgrammingProject()) {
  await readyStudent(page.request);
  await db.doc("csWork/student-20101__programming-13").delete();
  await db.doc("csClasses/2-1").update({ openedLessonIds: lessonIds, currentLessonId: "programming-13" });
  const work = await storedProgramming(page);
  expect((await page.request.post(programmingEndpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.setViewportSize({ width: 1840, height: 1000 });
  await page.goto("/classroom/programming-13?from=dashboard");
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}

// Use the same real palette drag and canvas click as the Entry UI regressions.
async function connect(page: Page, source: Locator, target: Locator, offsetY: number, offsetX = 40) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  await expect.poll(() => source.evaluate((element) => (element as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + offsetX, from.y + 15); await page.mouse.down();
  await page.mouse.move(to.x + offsetX, to.y + offsetY, { steps: 12 }); await page.mouse.up();
}

async function clickAnswerCanvas(page: Page, submit = false) {
  await page.locator("iframe").scrollIntoViewIfNeeded();
  const native = page.frames().find((frame) => frame.url().includes("mission=name"))!;
  const point = () => native.evaluate((submit) => {
    const { stage } = (window as unknown as { Entry: { stage: {
      inputField: { _canvas: HTMLCanvasElement; _x: number; _y: number; _width: number; _height: number; _padding: number; _isHidden: boolean };
      inputSubmitButton: { getBounds: () => { x: number; y: number; width: number; height: number } | null; localToGlobal: (x: number, y: number) => { x: number; y: number } };
    } } }).Entry;
    const field = stage.inputField, bounds = stage.inputSubmitButton?.getBounds();
    if (!field || field._isHidden || !bounds) return null;
    const canvas = field._canvas, rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const point = submit ? stage.inputSubmitButton.localToGlobal(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      : { x: field._x + Math.min(40, field._width / 2), y: field._y + field._padding + field._height / 2 };
    return { x: rect.x + point.x * rect.width / canvas.width, y: rect.y + point.y * rect.height / canvas.height };
  }, submit);
  await expect.poll(point).not.toBeNull();
  const position = (await point())!, frame = (await page.locator("iframe").boundingBox())!;
  await page.mouse.click(frame.x + position.x, frame.y + position.y);
}

test("practice-focus-live: 질문 대기 중 집중·넓게 전환 뒤 실제 체크로 대답한다", async ({ page }, info) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const project = buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "이름은?"), null), node("dialog_time", node("get_canvas_input_value", null), node("number", "0.2"), "speak", null)]]);
  const frame = await prepareProgramming(page, "name", project);
  const iframe = (await page.locator("iframe").elementHandle())!;
  const input = frame.getByLabel("강아지 이름 대답");
  const answer = "전환 중인 초코";
  await entryStart(page).click();
  await expect(input).toBeVisible(); await clickAnswerCanvas(page); await expect(input).toBeFocused();
  await page.keyboard.insertText(answer);
  const stillWaiting = async () => {
    expect(await iframe.evaluate(element => element === document.querySelector('iframe[src*="/entryjs/workspace.html"]'))).toBe(true);
    await expect(entryStop(page)).toBeEnabled();
    await expect(input).toBeVisible(); await expect(input).toHaveValue(answer);
    expect(programmingProjectMatches(project, (await storedProgramming(page)).draft.programming!.projects.name)).toBe(true);
  };
  await stillWaiting();
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click(); await stillWaiting();
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click(); await stillWaiting();
  await page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true }).click(); await stillWaiting();
  await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click(); await stillWaiting();
  await clickAnswerCanvas(page, true);
  await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${answer}` })).toBeVisible({ timeout: 10000 });
  await expect(entryStart(page)).toBeVisible();
  await expect(page.getByRole("status", { name: "서로 다른 이름 확인", exact: true })).toHaveText("서로 다른 이름 확인 1/2");
  await page.screenshot({ path: info.outputPath("focus-live-answer.png"), fullPage: false });
  expect(errors).toEqual([]);
});

test("practice-focus-space: 네 보기의 실제 작업영역 증가·빈 숫자 초안·단계 왕복·복원", async ({ page }, info) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const frame = await prepareProgramming(page, "move");
  const iframe = (await page.locator("iframe").elementHandle())!;
  await frame.getByText("움직임", { exact: true }).click();
  await connect(page, frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "이동 방향으로" }).first(), frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "시작하기 버튼" }).first(), 46);
  await saveDraft(page);
  await expect.poll(async () => parseProgrammingProject((await storedProgramming(page)).draft.programming!.projects.move)?.order).toEqual(["when_run_button_click", "move_direction"]);
  await frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true }).locator("..").click();
  const amount = frame.locator("input.entry-widget-input-field:visible"); await expect(amount).toBeFocused(); await amount.fill("");
  const savedAmount = async () => {
    const value = parseProgrammingProject((await storedProgramming(page)).draft.programming!.projects.move)?.threads[0][1].params[0];
    return value && typeof value === "object" && "type" in value && "params" in value ? { type: value.type, params: value.params } : value;
  };
  await amount.press("Control+s");
  await expect.poll(savedAmount).toEqual(node("number", ""));
  const region = page.getByRole("region", { name: "엔트리 작업실 가로 이동", exact: true });
  const width = async () => {
    expect(await iframe.evaluate(element => element === document.querySelector('iframe[src*="/entryjs/workspace.html"]'))).toBe(true);
    await expect.poll(savedAmount).toEqual(node("number", ""));
    return (await region.boundingBox())!.width;
  };
  const normal = await width();
  await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
  const focused = await width(); expect(focused).toBeGreaterThan(normal + 100);
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  const focusedWide = await width(); expect(focusedWide).toBeGreaterThan(focused + 100);
  await page.getByRole("button", { name: "실습 집중 모드 끝내기", exact: true }).click();
  const wide = await width(); expect(wide).toBeGreaterThan(normal + 100); expect(focusedWide).toBeGreaterThan(wide + 100);
  await info.attach("workspace-view-widths", { body: JSON.stringify({ viewport: 1840, normal, focused, wide, focusedWide }), contentType: "application/json" });
  await page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true }).click();
  expect(await width()).toBeCloseTo(normal, 0);
  await page.getByRole("tab", { name: /^퀴즈/ }).click(); await page.getByRole("tab", { name: /^실습/ }).click();
  await expect(entryStart(page)).toBeVisible();
  await expect.poll(savedAmount).toEqual(node("number", ""));
  await page.reload();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  await expect(page.locator("[data-lesson-shell]")).toHaveAttribute("data-practice-focused", "false");
  await expect(page.locator("[data-lesson-shell]")).toHaveAttribute("data-workspace-wide", "false");
  await expect.poll(savedAmount).toEqual(node("number", ""));
  await expect(frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "이동 방향으로" }).first()).toBeVisible();
  await expect(frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true })).toHaveCount(0);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("focus-restored-blank-number.png"), fullPage: false });
  expect(errors).toEqual([]);
});
