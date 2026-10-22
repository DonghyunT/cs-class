import { expect, test, type Page } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject, missionStarter, missionsFor, parseProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, entryReset, entryStart, entryStop } from "./emulator";

const id = "loops", endpoint = `/api/classroom/work/${id}`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const text = (v: string) => node("text", v);
const number = (v: string) => node("number", v);
const answer = () => node("get_canvas_input_value", null);
const start = () => node("when_run_button_click", null);
const compare = (left: EntryNode, op: string, right: EntryNode) => node("boolean_basic_operator", left, op, right);
const loopOf = (count: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", count, null), statements: [inner] });
const draw = (count: EntryNode, angle: EntryNode, side = "60") => [node("start_drawing", null), loopOf(count, [node("move_direction", number(side), null), node("direction_relative", angle, null)])];
const grow = (count: string) => ({ ...node("_if", compare(node("get_variable", "cs-clicks"), "EQUAL", number(count)), null), statements: [[node("change_to_next_shape", "next", null), ...(count === "25" ? [node("dialog", text("성공~!"), "speak", null)] : [])]] });

// The tree solution from the official material, placed on the starter's tree.
function treeSolution() {
  const starter = parseProgrammingProject(missionStarter("tree"))!;
  const code = [[node("mouse_clicked", null), node("change_variable", "cs-clicks", text("1"), null), ...["5", "10", "15", "20", "25"].map(grow)]];
  return buildProgrammingProject(undefined, starter.added.map((o) => o.id === "tree" ? { ...o, threads: code } : o), starter.mainIndex, true);
}
// Dog-free lessons start with the official Entrybot (`bot`); solutions are built on it.
const onBot = (mission: string, threads: EntryNode[][]) => buildProgrammingProject(undefined, parseProgrammingProject(missionStarter(mission))!.added.map((o) => ({ ...o, threads })), -1);
const solutions: Record<string, string> = {
  square: onBot("square", [[start(), ...draw(number("4"), node("angle", "90"), "100")]]),
  polygon: onBot("polygon", [[start(), node("ask_and_wait", text("변의 수는?"), null), ...draw(answer(), node("calc_basic", number("360"), "DIVIDE", answer()))]]),
  safe: onBot("safe", [[start(), { ...node("repeat_while_true", compare(answer(), "EQUAL", number("1234")), "until", null), statements: [[node("ask_and_wait", text("비밀번호는?"), null)]] }, node("dialog", text("금고가 열렸어요!"), "speak", null)]]),
  tree: treeSolution(),
};

async function open(page: Page, mission: string, project = solutions[mission]) {
  // Leave the previous editor first so it cannot save over the new fixture.
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  const work: Work = await (await page.request.get(endpoint)).json();
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
// Reads an object's state from the real EntryJS stage.
const stageOf = (page: Page, objectId: string) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!.evaluate((target) => {
  const entry = (window as unknown as { Entry: { container: { getObject: (id: string) => { entity: { getX: () => number; getY: () => number; picture: { id: string }; brush: unknown; shapes: unknown[] } }; getVariableByName?: (name: string) => { getValue: () => unknown } } } }).Entry;
  const entity = entry.container.getObject(target).entity;
  return { x: Math.round(entity.getX() * 100) / 100, y: Math.round(entity.getY() * 100) / 100, picture: entity.picture.id, drawn: !!entity.brush && entity.shapes.length > 0 };
}, objectId);
// Entry drops an answer typed before its next question is up (the last answer is still `complete`),
// so a test waits for the ask, and then for Entry to take the answer.
const askState = (page: Page) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!.evaluate(() => {
  const entry = (window as unknown as { Entry: { container: { inputValue: { complete?: boolean }; getInputValue: () => unknown }; stage: { inputField?: { _isHidden: boolean } } } }).Entry;
  return { asking: entry.container.inputValue.complete === false && entry.stage.inputField?._isHidden === false, answer: String(entry.container.getInputValue()) };
});
const drawingWait = "정지하면 무대가 처음 상태로 돌아가고, 그다음 조건을 검증할 수 있어요.";
// A drawing run stays on the stage until the student stops it; stopping resets the stage and allows validation.
async function keepsDrawingUntilStop(page: Page, start: { x: number; y: number }) {
  await expect(page.getByRole("status").filter({ hasText: drawingWait })).toBeVisible({ timeout: 10000 });
  await expect(entryStop(page)).toBeVisible();
  expect((await stageOf(page, "bot")).drawn).toBe(true);
  await expect(page.getByRole("button", { name: "조건 검증", exact: true })).toBeDisabled();
  await entryStop(page).click();
  await expect(entryStart(page)).toBeVisible();
  const stopped = await stageOf(page, "bot");
  expect([stopped.x, stopped.y, stopped.drawn]).toEqual([start.x, start.y, false]);
  await expect(page.getByRole("status").filter({ hasText: drawingWait })).toHaveCount(0);
}
async function validateAndSubmit(page: Page, mission: string) {
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect.poll(async () => !!((await (await page.request.get(endpoint)).json()) as Work).missions?.[mission]?.submission).toBe(true);
}

test("반복 수업은 공개되어 미션 네 개(필수 셋·도전 하나)를 보여 준다", () => {
  expect(RELEASED_LESSONS.some((lesson) => lesson.id === id)).toBe(true);
  expect(missionsFor(id).map((mission) => [mission.id, !!mission.optional])).toEqual([["square", false], ["polygon", false], ["tree", false], ["safe", true]]);
});

test("반복 수업 도형: 실제 엔트리에서 그린 선이 정지 전까지 남고, 정지하면 제자리로 돌아오며 서버 검증·제출이 일치한다", async ({ page }) => {
  test.setTimeout(120000);
  await open(page, "square");
  const before = await stageOf(page, "bot");
  await entryStart(page).click();
  await keepsDrawingUntilStop(page, before);
  await validateAndSubmit(page, "square");
  const frame = await open(page, "polygon");
  const start5 = await stageOf(page, "bot");
  await entryStart(page).click();
  const input = frame.getByLabel("질문 대답", { exact: true }); await expect(input).toBeVisible(); await input.fill("5"); await input.press("Enter");
  await keepsDrawingUntilStop(page, start5);
  await validateAndSubmit(page, "polygon");
});

test("반복 수업 도형: 시작 줄에 연결되지 않은 붓 블록은 실행을 붙잡지 않는다", async ({ page }) => {
  test.setTimeout(60000);
  await open(page, "square", onBot("square", [[start(), node("move_direction", number("10"), null)], [node("start_drawing", null)]]));
  await entryStart(page).click();
  await expect(page.getByRole("status").filter({ hasText: "실행을 마쳤어요." })).toBeVisible({ timeout: 10000 });
  await expect(entryStart(page)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: drawingWait })).toHaveCount(0);
});

test("반복 수업 금고: 맞힐 때까지 묻고, 다시 실행하면 처음부터 다시 묻는다", async ({ page }) => {
  test.setTimeout(90000);
  const frame = await open(page, "safe");
  for (let run = 0; run < 2; run++) {
    await entryStart(page).click();
    for (const value of ["1111", "1234"]) {
      await expect.poll(async () => (await askState(page)).asking).toBe(true);
      const input = frame.getByLabel("질문 대답", { exact: true }); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter");
      await expect.poll(async () => (await askState(page)).answer).toBe(value);
    }
    await expect(page.getByRole("status").filter({ hasText: "마지막 말: 금고가 열렸어요!" })).toBeVisible({ timeout: 10000 });
    await expect(entryStart(page)).toBeVisible();
  }
  await validateAndSubmit(page, "safe");
});

test("반복 수업 나무: 시작 작품의 나무가 실제 엔트리에서 클릭 25번에 다 자라고 서버 검증·제출이 일치한다", async ({ page }) => {
  test.setTimeout(150000);
  const frame = await open(page, "tree");
  expect((await stageOf(page, "tree")).picture).toBe("tree-pic");
  await entryStart(page).click();
  const stage = frame.locator("#entryCanvas");
  for (let click = 1; click <= 25; click++) {
    await stage.click({ position: { x: 40, y: 40 } });
    if (click === 5) await expect.poll(async () => (await stageOf(page, "tree")).picture).toBe("tree-pic2");
  }
  await expect.poll(async () => (await stageOf(page, "tree")).picture, { timeout: 10000 }).toBe("tree-pic6");
  await entryStop(page).click();
  await expect(entryStart(page)).toBeVisible();
  await validateAndSubmit(page, "tree");
});

test("반복 수업 오브젝트: 분류형 창에서 연필을 더하고, 모양 탭을 보며, 나무·물뿌리개는 지울 수 없다", async ({ page }) => {
  test.setTimeout(120000);
  const frame = await open(page, "square");
  const objectIds = () => page.frames().find((f) => f.url().includes("/entryjs/workspace.html"))!.evaluate(() => (window as unknown as { Entry: { container: { getAllObjects: () => { id: string }[] } } }).Entry.container.getAllObjects().map((o) => o.id));
  expect(await objectIds()).toEqual(["bot"]);
  await frame.getByText("오브젝트 추가하기").first().click();
  const dialog = page.getByRole("dialog", { name: "오브젝트 추가하기" });
  await expect(dialog.getByRole("button", { name: "배경", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "물건", exact: true }).click();
  await dialog.getByRole("button", { name: /^연필\(1\)/ }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(objectIds).toHaveLength(2);
  await expect(page.getByRole("status").filter({ hasText: "‘연필(1)’을(를) 추가했어요" })).toBeVisible();
  // The shape tab lists shapes; the painter stays hidden.
  await frame.locator("#entryPictureTab").click();
  await expect(frame.locator(".entryPlaygroundPictureElement").first()).toBeVisible();
  await expect(frame.locator(".entryPlaygroundPainter")).toBeHidden();
  // ‘새로 그리기’ would add a blank shape the project cannot load, so it only explains why it is locked.
  const shapes = await frame.locator(".entryPlaygroundPictureElement").count();
  await frame.getByText("새로 그리기", { exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "모양은 목록에서 보고 고르기만 할 수 있어요." })).toBeVisible();
  await expect(frame.locator(".entryPlaygroundPictureElement")).toHaveCount(shapes);
  await expect(page.getByRole("alert").filter({ hasText: "읽지 못한" })).toHaveCount(0);
  // The tree mission keeps its tree and watering can.
  await open(page, "tree");
  await page.frames().find((f) => f.url().includes("/entryjs/workspace.html"))!.evaluate(() => (window as unknown as { Entry: { container: { removeObject: (id: string) => void } } }).Entry.container.removeObject("tree"));
  await expect(page.getByRole("status").filter({ hasText: "‘나무’은(는) 이번 미션에 꼭 필요해서 지울 수 없어요." })).toBeVisible();
  expect(await objectIds()).toContain("tree");
});
