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
const solutions: Record<string, string> = {
  square: buildProgrammingProject([[start(), ...draw(number("4"), node("angle", "90"), "100")]]),
  polygon: buildProgrammingProject([[start(), node("ask_and_wait", text("변의 수는?"), null), ...draw(answer(), node("calc_basic", number("360"), "DIVIDE", answer()))]]),
  safe: buildProgrammingProject([[start(), { ...node("repeat_while_true", compare(answer(), "EQUAL", number("1234")), "until", null), statements: [[node("ask_and_wait", text("비밀번호는?"), null)]] }, node("dialog", text("금고가 열렸어요!"), "speak", null)]]),
  tree: treeSolution(),
};

async function open(page: Page, mission: string) {
  // Leave the previous editor first so it cannot save over the new fixture.
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  const work: Work = await (await page.request.get(endpoint)).json();
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: solutions[mission] }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
// Reads an object's state from the real EntryJS stage.
const stageOf = (page: Page, objectId: string) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!.evaluate((target) => {
  const entry = (window as unknown as { Entry: { container: { getObject: (id: string) => { entity: { getX: () => number; getY: () => number; picture: { id: string } } }; getVariableByName?: (name: string) => { getValue: () => unknown } } } }).Entry;
  const entity = entry.container.getObject(target).entity;
  return { x: Math.round(entity.getX() * 100) / 100, y: Math.round(entity.getY() * 100) / 100, picture: entity.picture.id };
}, objectId);
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

test("반복 수업 도형: 실제 엔트리에서 그린 뒤 제자리로 돌아오고 서버 검증·제출이 일치한다", async ({ page }) => {
  test.setTimeout(120000);
  await open(page, "square");
  const before = await stageOf(page, "entrybot");
  await entryStart(page).click();
  await expect(entryStart(page)).toBeVisible({ timeout: 10000 });
  const after = await stageOf(page, "entrybot");
  expect([after.x, after.y]).toEqual([before.x, before.y]);
  await validateAndSubmit(page, "square");
  const frame = await open(page, "polygon");
  const start5 = await stageOf(page, "entrybot");
  await entryStart(page).click();
  const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill("5"); await input.press("Enter");
  await expect(entryStart(page)).toBeVisible({ timeout: 10000 });
  const end5 = await stageOf(page, "entrybot");
  expect([end5.x, end5.y]).toEqual([start5.x, start5.y]);
  await validateAndSubmit(page, "polygon");
});

test("반복 수업 금고: 맞힐 때까지 묻고, 다시 실행하면 처음부터 다시 묻는다", async ({ page }) => {
  test.setTimeout(90000);
  const frame = await open(page, "safe");
  for (let run = 0; run < 2; run++) {
    await entryStart(page).click();
    for (const value of ["1111", "1234"]) {
      const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter");
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
