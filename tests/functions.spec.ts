import { expect, test, type Page } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject, missionStarter, missionsFor, parseProgrammingProject, type EntryNode, type ProgramFunction } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, readyTeacher, entryReset, entryStart } from "./emulator";

const id = "functions", endpoint = `/api/classroom/work/${id}`;
const EDITING = "함수 편집 창에서 ‘저장’이나 ‘취소’를 먼저 눌러 주세요.";
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string) => node("number", v);
const start = () => node("when_run_button_click", null);
const loopOf = (count: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", count, null), statements: [inner] });
const square: EntryNode[] = [node("start_drawing", null), loopOf(number("4"), [node("move_direction", number("50"), null), node("direction_relative", node("angle", "90"), null)]), node("stop_drawing", null)];
// Missions start from their starter object; solutions replace its code and add functions.
const onStarter = (mission: string, threads: EntryNode[][], functions: ProgramFunction[]) => buildProgrammingProject(undefined, parseProgrammingProject(missionStarter(mission))!.added.map((o) => ({ ...o, threads })), -1, false, [], functions);
const windows = onStarter("windows", [[start(), node("func_win1", null), node("move_x", number("100"), null), node("func_win1", null)]], [{ id: "win1", name: "창문 그리기", body: square }]);
const keyLine = (key: string, move: string) => [node("when_some_key_pressed", null, key), node("move_x", number(move), null), node("func_cat1", null)];
// The broken-shapes starter with its two bugs fixed: the pentagon turns 72° and the hexagon is called.
function repairedShapes() {
  const p = parseProgrammingProject(missionStarter("fix-shapes"))!, [, pentagon, hexagon] = p.functions;
  const fixed = p.functions.map((f) => f === pentagon ? { ...f, body: [node("start_drawing", null), loopOf(number("5"), [node("move_direction", number("50"), null), node("direction_relative", node("angle", "72"), null)]), node("stop_drawing", null)] } : f);
  return buildProgrammingProject(undefined, [{ ...p.added[0], threads: [[...p.added[0].threads[0], node(`func_${hexagon.id}`, null)]] }], -1, false, [], fixed);
}
const solutions: Record<string, string> = {
  "cat-walk": onStarter("cat-walk", [keyLine("39", "10"), keyLine("37", "-10")], [{ id: "cat1", name: "고양이 걸음", body: [node("change_to_next_shape", "next", null)] }]),
  windows,
  "fix-shapes": repairedShapes(),
  flower: onStarter("flower", [[start(), loopOf(number("6"), [node("func_pet1", null), node("direction_relative", node("angle", "60"), null)])]], [{ id: "pet1", name: "꽃잎", body: square }]),
};

async function open(page: Page, lesson: string, mission: string, project = missionStarter(mission)) {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${lesson}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  const path = `/api/classroom/work/${lesson}`, work: Work = await (await page.request.get(path)).json();
  expect((await page.request.post(path, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
const workspaceFrame = (page: Page) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!;
const editing = (page: Page) => workspaceFrame(page).evaluate(() => (window as unknown as { Entry: { Func: { isEdit: boolean } } }).Entry.Func.isEdit);
const status = (page: Page) => page.locator("[data-lesson-shell] header [role=status]");
// Entry draws these buttons in SVG under an overlay, so press them where they are on screen.
async function press(page: Page, target: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>) {
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("다른 엔트리 수업에는 함수 메뉴가 없다", async ({ page }) => {
  const frame = await open(page, "loops", "square");
  await expect(frame.locator("#entryCategorymoving")).toBeVisible();
  await expect(frame.locator("#entryCategoryfunc")).toHaveCount(0);
});

test("함수 편집 중에는 저장·검증·이동이 멈추고, 편집 창을 닫으면 바로 된다", async ({ page }) => {
  const frame = await open(page, id, "cat-walk");
  await frame.locator("#entryCategoryfunc").click();
  await press(page, frame.locator("tspan", { hasText: "함수 만들기" }));
  await expect.poll(() => editing(page)).toBe(true);
  // The editor menu offers only plain functions: no parameter fields, no properties panel.
  for (const hidden of ["문자/숫자값", "판단값", "함수 속성 보기"]) await expect(frame.getByText(hidden, { exact: true }), hidden).not.toBeVisible();
  const before = await status(page).textContent();
  const revision = async () => ((await (await page.request.get(endpoint)).json()) as Work).revision;
  const saved = await revision();

  // Ctrl+S inside the workspace comes back as the frame's save request; it is the first attempt, so the notice proves it was refused.
  await frame.locator("#entryCategoryfunc").click();
  await page.keyboard.press("Control+s");
  await expect(page.getByText(EDITING).first()).toBeVisible();
  await expect(status(page)).toHaveText(before ?? "");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(status(page)).toHaveText(before ?? "");
  // Leaving by link stops at reading the work, so the page stays.
  await page.getByRole("link", { name: /수업 나가기/ }).click();
  await expect(page).toHaveURL(new RegExp(`/classroom/${id}`));
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByText(EDITING).first()).toBeVisible();
  // Mission and stage switches keep the editor open.
  await page.getByRole("button", { name: /창문 두 개/ }).click();
  await expect(page.getByRole("heading", { name: "고양이 걸음" })).toBeVisible();
  await page.getByRole("tab", { name: /개념/ }).click();
  await expect(page.getByRole("tab", { name: /실습/ })).toHaveAttribute("aria-selected", "true");
  expect(await editing(page)).toBe(true);
  expect(await revision()).toBe(saved);

  // After the function editor saves, Save and validation work without a retry.
  await press(page, frame.locator("text.entryFunctionButton", { hasText: "저장" }));
  await expect.poll(() => editing(page)).toBe(false);
  await expect(page.getByText(EDITING)).toHaveCount(0);
  // Ctrl+S from the workspace saves once the editor is closed.
  await frame.locator("#entryCategoryfunc").click();
  await page.keyboard.press("Control+s");
  await expect(status(page)).toHaveText("저장 완료");
  const stored = ((await (await page.request.get(endpoint)).json()) as Work).draft.programming!.projects["cat-walk"];
  expect(parseProgrammingProject(stored)!.functions).toHaveLength(1);
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByText(/키마다 10만큼 움직이고/)).toBeVisible();
});

test("함수 안에서만 그린 선이 실행 뒤 남는다", async ({ page }) => {
  await open(page, id, "windows", windows);
  await entryStart(page).click();
  await expect(page.getByText("정지하면 무대가 처음 상태로 돌아가고", { exact: false }).first()).toBeVisible({ timeout: 15000 });
  // keepsDrawing reads a function body through its Code's block list.
  expect(await workspaceFrame(page).evaluate(() => typeof (window as unknown as { Entry: { variableContainer: { functions_: Record<string, { content: { getBlockList?: unknown } }> } } }).Entry.variableContainer.functions_.win1.content.getBlockList)).toBe("function");
  const drawn = await workspaceFrame(page).evaluate(() => {
    const entry = (window as unknown as { Entry: { container: { getAllObjects: () => { entity: { shapes: unknown[] } }[] } } }).Entry;
    return entry.container.getAllObjects().some((object) => object.entity.shapes.length > 0);
  });
  expect(drawn).toBe(true);
});

test("함수 수업은 공개되어 미션 네 개(필수 셋·도전 하나)를 보여 준다", () => {
  expect(RELEASED_LESSONS.some((lesson) => lesson.id === id)).toBe(true);
  expect(missionsFor(id).map((mission) => [mission.id, !!mission.optional])).toEqual([["cat-walk", false], ["windows", false], ["fix-shapes", false], ["flower", true]]);
});

for (const mission of Object.keys(solutions)) test(`${mission}: 안내대로 만든 작품은 검증·제출되고 새로고침 뒤에도 함수가 남는다`, async ({ page }) => {
  await open(page, id, mission, solutions[mission]);
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect.poll(async () => !!((await (await page.request.get(endpoint)).json()) as Work).missions?.[mission]?.submission).toBe(true);
  const expected = parseProgrammingProject(solutions[mission])!.functions.length;
  await page.reload();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  await expect.poll(() => workspaceFrame(page).evaluate(() => Object.keys((window as unknown as { Entry: { variableContainer: { functions_: Record<string, unknown> } } }).Entry.variableContainer.functions_).length)).toBe(expected);
});

test("교사 작품 보기에 함수 정의와 호출이 보이고, 실행하면 함수 안에서 그린 선이 남는다", async ({ page }) => {
  const classRef = db.doc("csClasses/2-1"), workRef = db.doc(`csWork/student-20101__${id}`), original = (await classRef.get()).data()!;
  try {
    await readyStudent(page.request); await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    const current: Work = await (await page.request.get(endpoint)).json();
    current.draft.programming = { mission: "windows", projects: { windows }, reflection: "" };
    let response = await page.request.post(endpoint, { headers, data: { revision: current.revision, draft: current.draft } }); expect(response.status()).toBe(200);
    for (const type of ["validate-practice", "submit-practice"]) { const work: Work = await response.json(); response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type, missionId: "windows" } } }); expect(response.status()).toBe(200); }
    await readyTeacher(page.request);
    await page.goto(`/teacher/students?classId=2-1&lessonId=${id}`);
    await page.getByRole("button", { name: "20101 제출 작품 보기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "20101 학생의 제출 작품", exact: true });
    await expect(dialog.getByText("함수 ‘창문 그리기’", { exact: true })).toBeVisible();
    await expect(dialog.getByText("‘창문 그리기’ 부르기", { exact: true })).toHaveCount(2);
    await dialog.getByRole("button", { name: "작업실에서 실행해 보기", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "무대 처음 위치로", exact: true })).toBeEnabled({ timeout: 20000 });
    await page.frameLocator('iframe[title*="교사 실행 작업실"]').getByRole("button", { name: "시작하기", exact: true }).click();
    await expect(dialog.getByRole("status").filter({ hasText: "실행을 마쳤어요." })).toContainText("그린 결과를 다 봤으면", { timeout: 10000 });
  } finally { await workRef.delete(); await classRef.set(original); }
});

test("1,024px에서 작업실과 함수 편집 창의 저장·취소 버튼이 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const frame = await open(page, id, "cat-walk");
  await frame.locator("#entryCategoryfunc").click();
  await press(page, frame.locator("tspan", { hasText: "함수 만들기" }));
  await expect.poll(() => editing(page)).toBe(true);
  const iframe = (await page.locator("iframe").boundingBox())!;
  for (const label of ["저장", "취소"]) {
    const button = (await frame.locator("text", { hasText: label }).filter({ hasText: new RegExp(`^${label}$`) }).last().boundingBox())!;
    expect(button.x + button.width, label).toBeLessThanOrEqual(iframe.x + iframe.width);
    expect(button.y + button.height, label).toBeLessThanOrEqual(iframe.y + iframe.height);
    expect(button.x + button.width, label).toBeLessThanOrEqual(1024);
  }
});

test("함수 편집 중에 브라우저 뒤로 가기를 해도 수업 화면과 편집 창이 남는다", async ({ page }) => {
  await open(page, id, "cat-walk");
  // Arrive by an in-app link so Back stays inside the app's history.
  await page.goto("/student");
  await page.locator(`a[href*="/classroom/${id}"]`).first().click();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  const frame = page.frameLocator("iframe");
  await frame.locator("#entryCategoryfunc").click();
  await press(page, frame.locator("tspan", { hasText: "함수 만들기" }));
  await expect.poll(() => editing(page)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/classroom/${id}`));
  await expect(entryReset(page)).toBeVisible();
  expect(await editing(page)).toBe(true);
});

test("고장 난 도형의 함수 블록을 두 번 누르면 그 함수의 편집 창이 열린다", async ({ page }) => {
  await open(page, id, "fix-shapes");
  // The second block of the start line calls ‘사각형 그리기’.
  const rect = await workspaceFrame(page).evaluate(() => {
    const entry = (window as unknown as { Entry: { getMainWS: () => { board: { code: { getThreads: () => { getBlockList: () => { view: { svgGroup: Element } }[] }[] } } } } }).Entry;
    const box = entry.getMainWS().board.code.getThreads()[0].getBlockList()[1].view.svgGroup.getBoundingClientRect();
    // A block's group also holds the blocks below it, so press its first row.
    return { x: box.x + 12, y: box.y + 10 };
  });
  const frameBox = (await page.locator("iframe").boundingBox())!;
  await page.mouse.dblclick(frameBox.x + rect.x, frameBox.y + rect.y);
  await expect.poll(() => editing(page)).toBe(true);
  expect(await workspaceFrame(page).evaluate(() => (window as unknown as { Entry: { Func: { targetFunc: { id: string } } } }).Entry.Func.targetFunc.id)).toBe("fsq1");
});
