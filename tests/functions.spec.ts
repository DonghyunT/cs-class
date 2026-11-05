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

test("작업실 활동 메시지는 실제 조작만 초당 한 번 보내고 JavaScript 오류가 없다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const frame = await open(page, id, "cat-walk");
  await frame.locator("#entryCategoryfunc").click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 2000)));
  await page.evaluate(() => {
    const state = window as unknown as { activityMessages: number };
    state.activityMessages = 0;
    window.addEventListener("message", event => {
      if (event.data?.channel === "cs-class-entryjs" && event.data.type === "activity") state.activityMessages++;
    });
  });
  const count = () => page.evaluate(() => (window as unknown as { activityMessages: number }).activityMessages);
  for (let i = 0; i < 6; i++) await page.keyboard.press("Shift");
  await expect.poll(count).toBe(1);
  await page.clock.fastForward(1000);
  await workspaceFrame(page).evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true })));
  expect(await count()).toBe(1);
  await page.keyboard.press("Shift");
  await expect.poll(count).toBe(2);
  expect(errors).toEqual([]);
});

for (const keysOnly of [false, true]) test(`${keysOnly ? "실행 중 방향키만 눌러도" : "함수 편집 창에서 블록만 움직여도"} 활동을 전달하고, 멈추면 자동 로그아웃한다`, async ({ page }) => {
  const frame = await open(page, id, "cat-walk", keysOnly ? solutions["cat-walk"] : missionStarter("cat-walk"));
  await page.clock.install();
  await page.reload();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  if (keysOnly) {
    await entryStart(page).click();
  } else {
    await frame.locator("#entryCategoryfunc").click();
    await press(page, frame.locator("tspan", { hasText: "함수 만들기" }));
    await expect.poll(() => editing(page)).toBe(true);
  }
  const touches: number[] = [];
  const session = (await (await page.request.get("/api/auth/session")).json()).session;
  // Keep the emulator's real clock from refreshing the page's virtual idle time.
  await page.route("**/api/auth/session", route => route.fulfill({ json: { session: { ...session, idleMs: 9 * 60_000 }, configured: true } }));
  await page.route("**/api/auth/activity", route => {
    touches.push(route.request().postDataJSON().idleForMs);
    return route.fulfill({ json: { session: { ...session, idleMs: 0 } } });
  });
  const block = frame.locator("g.block").filter({ hasText: "함수" }).last();
  for (let minute = 0; minute < 11; minute++) {
    if (keysOnly) await page.keyboard.press("ArrowRight");
    else {
      const box = (await block.boundingBox())!;
      await page.mouse.move(box.x + 20, box.y + 12);
      await page.mouse.down();
      await page.mouse.move(box.x + 20 + (minute % 2 ? -10 : 10), box.y + 12, { steps: 3 });
      await page.mouse.up();
    }
    await page.clock.fastForward(30_000);
    await page.clock.fastForward(30_000);
    await expect(page.getByText("곧 자동 로그아웃돼요.")).toBeHidden();
    await expect(page.getByText("오랫동안 사용하지 않아 로그아웃됐어요.", { exact: false })).toBeHidden();
    if (!keysOnly) expect(await editing(page)).toBe(true);
  }
  expect(touches.length).toBeGreaterThan(0);
  expect(touches.length).toBeLessThanOrEqual(4);
  for (let minute = 0; minute < 11; minute++) await page.clock.fastForward(60_000);
  await expect(page.getByText("오랫동안 사용하지 않아 로그아웃됐어요.", { exact: false })).toBeVisible();
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

// Each concept is a hands-on experience; finishing it offers the check question and moves focus there.
async function openConcepts(page: Page) {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);
  return page.getByRole("region", { name: "함수 개념 체험" });
}
async function toCheck(page: Page, conceptId: string) {
  const experience = page.getByRole("region", { name: "함수 개념 체험" });
  await experience.getByRole("button", { name: "확인 문제로" }).click();
  await expect(page.locator(`#concept-${conceptId} input[type=radio]`).first()).toBeFocused();
}

test("함수 개념 다섯 개는 직접 해 보는 체험이고, 체험을 마치면 확인 문제로 초점이 이어진다", async ({ page }) => {
  test.setTimeout(90_000);
  const experience = await openConcepts(page);
  const status = experience.getByRole("status").first();
  // 1 · A beat chosen by the student plays in order, and its Entry blocks follow the choice.
  await expect(experience.getByRole("button", { name: "확인 문제로" })).toHaveCount(0);
  await experience.getByRole("button", { name: "3번째 동작 짝, 눌러서 바꾸기" }).click();
  await expect(experience.getByText("쿵 말하기")).toHaveCount(3);
  await experience.getByRole("button", { name: "“비트!” 부르기" }).click();
  await expect(status).toContainText("쿵·쿵·쿵");
  // Finishing the experience hands focus to the next step instead of dropping it.
  await expect(experience.getByRole("button", { name: "확인 문제로" })).toBeFocused();
  await toCheck(page, "fc0");
  await page.getByRole("button", { name: "다음 개념" }).click();
  // 2 · Make the function like in Entry (create, fill, save); then a definition alone runs nothing, a call runs it.
  await expect(experience.getByRole("button", { name: "‘비트’ 블록 끼우기" })).toBeDisabled();
  await experience.getByRole("button", { name: "함수 만들기" }).click();
  await expect(experience.getByRole("button", { name: "쿵 말하기 넣기" })).toBeFocused();
  await experience.getByRole("button", { name: "쿵 말하기 넣기" }).click();
  await experience.getByRole("button", { name: "쿵 말하기 넣기" }).click();
  await experience.getByRole("button", { name: "짝 말하기 넣기" }).click();
  await experience.getByRole("button", { name: "저장", exact: true }).click();
  await expect(experience.getByRole("button", { name: "시작하기 실행" })).toBeFocused();
  // The call opens only after seeing that a saved definition alone runs nothing.
  await expect(experience.getByRole("button", { name: "‘비트’ 블록 끼우기" })).toBeDisabled();
  await experience.getByRole("button", { name: "시작하기 실행" }).click();
  await expect(status).toContainText("아무것도 실행되지 않았어요");
  await experience.getByRole("button", { name: "‘비트’ 블록 끼우기" }).click();
  await experience.getByRole("button", { name: "시작하기 실행" }).click();
  await expect(status).toContainText("쿵·쿵·짝");
  await toCheck(page, "fc1");
  await page.getByRole("button", { name: "다음 개념" }).click();
  // 3 · A score with a loop and separate calls, next to the one definition every call runs.
  await expect(experience.getByText("함수 정의하기")).toBeVisible();
  await experience.getByRole("button", { name: "연주하기" }).click();
  await expect(status).toContainText("비트를 5번 불렀어요");
  await experience.getByRole("button", { name: "비트 더하기" }).click();
  await experience.getByRole("button", { name: "연주하기" }).click();
  await expect(status).toContainText("비트를 6번 불렀어요");
  // Removing a block with the keyboard keeps focus on a neighbouring control.
  await experience.getByRole("button", { name: "4번째 블록 빼기" }).press("Enter");
  await expect(experience.getByRole("button", { name: "3번째 블록 빼기" })).toBeFocused();
  await toCheck(page, "fc2");
  await page.getByRole("button", { name: "다음 개념" }).click();
  // 4 · Run first, then edit, then re-run: the edit shows at both calls.
  await expect(experience.getByRole("button", { name: "짝 하나 더하기" })).toBeDisabled();
  await experience.getByRole("button", { name: "실행", exact: true }).click();
  await experience.getByRole("button", { name: "짝 하나 더하기" }).click();
  await expect(experience.getByText("고치기 전 연주예요")).toBeVisible();
  await experience.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(status).toContainText("두 곳 모두 쿵·쿵·짝·짝");
  await toCheck(page, "fc3");
  await page.getByRole("button", { name: "다음 개념" }).click();
  // 5 · Run, see the open shape, change one value, run again. The pen blocks are part of the code.
  await expect(experience.getByText("그리기 시작하기")).toBeVisible();
  await experience.getByRole("button", { name: "실행", exact: true }).click();
  await expect(status).toContainText("열린 모양");
  for (let i = 0; i < 3; i++) await experience.getByRole("button", { name: "각도 늘리기" }).click();
  await expect(status).toContainText("다시 실행");
  await experience.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(status).toContainText("정삼각형");
  await toCheck(page, "fc4");
  // Extra strokes after the triangle are named as overlaps, not as an open shape.
  await experience.getByRole("button", { name: "반복 늘리기" }).click();
  await experience.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(status).toContainText("더 그려 겹쳤어요");
  await expect(experience.getByRole("img", { name: /겹/ })).toBeVisible();
  for (let i = 0; i < 2; i++) await experience.getByRole("button", { name: "반복 늘리기" }).click();
  await experience.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(status).toContainText("두 번 겹쳐");
});

test("체험 초기화는 체험만 처음으로 되돌리고, 이미 푼 개념에서는 확인 문제로가 다음 개념 버튼으로 이어진다", async ({ page }) => {
  const experience = await openConcepts(page);
  await experience.getByRole("button", { name: "1번째 동작 쿵, 눌러서 바꾸기" }).click();
  await expect(experience.getByText("짝 말하기")).toHaveCount(2);
  await page.getByRole("button", { name: "체험 초기화" }).click();
  await expect(experience.getByText("짝 말하기")).toHaveCount(1);
  // A student who moves to the answers during the run keeps that focus when the run ends.
  await experience.getByRole("button", { name: "“비트!” 부르기" }).click();
  const firstAnswer = page.locator("#concept-fc0 input[type=radio]").first();
  await firstAnswer.focus();
  await expect(experience.getByRole("button", { name: "확인 문제로" })).toBeVisible();
  await expect(firstAnswer).toBeFocused();
  // Solve the check, then the experience's shortcut lands on the next button instead of the locked choices.
  await page.locator("#concept-fc0").getByRole("radio", { name: "4번" }).check();
  await page.getByRole("button", { name: "정답 확인" }).click();
  await expect(page.locator("#concept-next-fc0")).toBeFocused();
  await experience.getByRole("button", { name: "“비트!” 부르기" }).click();
  await experience.getByRole("button", { name: "확인 문제로" }).click();
  await expect(page.locator("#concept-next-fc0")).toBeFocused();
});

test("퀴즈 코드에 같은 줄이 여러 번 나와도 줄이 빠지지 않고 화면 오류가 없다", async ({ page }) => {
  const keyErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && message.text().includes("same key")) keyErrors.push(message.text()); });
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  const work: Work = await (await page.request.get(endpoint)).json();
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "quiz" } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`);
  const scene = page.getByRole("group", { name: "읽어 볼 코드" });
  let stars = 0;
  for (let i = 0; i < 5; i++) {
    await expect(scene).toBeVisible();
    // Students read Entry's own blocks; the code lines stay for screen readers only.
    const pictures = scene.locator("img");
    expect(await pictures.count()).toBeGreaterThan(0);
    for (const img of await pictures.all()) await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    expect(await scene.locator("code").first().evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    if (await page.getByRole("heading", { name: "스페이스 키를 한 번 누르면 도장은 몇 번 찍힐까요?" }).isVisible()) stars = await scene.getByText("└ 별 찍기").count();
    // The last question shows another button instead of ‘다음 문제’.
    const next = page.getByRole("button", { name: "다음 문제" });
    if (!await next.count()) break;
    await next.click();
  }
  expect(stars).toBe(3);
  expect(keyErrors).toEqual([]);
});
