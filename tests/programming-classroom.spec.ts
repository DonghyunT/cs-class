import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { buildProgrammingProject, checkProgrammingMission, parseProgrammingProject, programmingProjectMatches, type EntryNode } from "../src/lib/classroom/programming-entry";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { emptyWork, progressFor } from "../src/lib/classroom/progress";
import { questions } from "../src/lib/classroom/programming-data";
import type { Work, WorkAction } from "../src/lib/classroom/types";
import { auth, db, headers, localOnly, loginStudent, readyStudent, readyTeacher, studentPassword, saveDraft } from "./emulator";
import { createHash } from "node:crypto";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";

const id = PROGRAMMING_LESSON.id, endpoint = `/api/classroom/work/${id}`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string | number) => node("number", String(v));
const answer = () => node("get_canvas_input_value", null);
const variable = (id: string) => node("get_variable", `cs-${id}`);
const start = () => node("when_run_button_click", null);
const ask = () => node("ask_and_wait", node("text", "숫자는?"), null);
const say = (value: EntryNode) => node("dialog_time", value, number(0.2), "speak", null);
const math = (average = false) => buildProgrammingProject([[start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), say(average ? node("calc_basic", node("calc_basic", variable("A"), "PLUS", variable("B")), "DIVIDE", number(2)) : node("calc_basic", variable("A"), "MULTI", variable("B")))]]);
const movement = (direction: number, amount = "10") => [node("direction_absolute", node("angle", String(direction)), null), node("move_direction", number(amount), null)];
const moveProject = buildProgrammingProject([[start(), ...movement(90)]]);
const keysProject = buildProgrammingProject([[start(), ...movement(90)], ...[["38", 0], ["39", 90], ["40", 180], ["37", 270]].map(([key, direction]) => [node("when_some_key_pressed", null, String(key)), ...movement(Number(direction))])]);
const nameProject = buildProgrammingProject([[start(), node("ask_and_wait", node("text", "이름은?"), null), say(answer())]]);

async function prepare(page: Page, mission = "name", project = buildProgrammingProject()) {
  // Stop the previous editor before replacing its account and server fixture.
  // Otherwise its autosave can write the old mission after the new fixture POST.
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  const work: Work = await (await page.request.get(endpoint)).json();
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.locator("iframe")).toHaveAttribute("src", new RegExp(`[?&]mission=${mission}(?:&|$)`));
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();

test("entry-guidance: 두 이름 확인 수와 검증 부족 초점·수정·단계 이동 안내", async ({ page }) => {
  const frame = await prepare(page, "name", nameProject);
  const count = page.getByRole("status", { name: "서로 다른 이름 확인", exact: true });
  await expect(count).toHaveText("서로 다른 이름 확인 0/2");
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#entry-local-feedback")).toBeFocused();
  await expect(page.locator("#entry-local-feedback")).toContainText("서로 다른 이름");
  await expect(page.locator("#entry-local-feedback")).not.toContainText("연결");
  for (const [name, expected] of [["초코", 1], ["초코", 1], ["보리", 2]] as const) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    await expect(count).toHaveText(`서로 다른 이름 확인 ${expected}/2`);
  }
  await frame.locator("#entryWorkspaceBoard").getByText("0.2", { exact: true }).first().locator("..").click();
  const duration = frame.locator("input.entry-widget-input-field:visible"); await duration.fill("0.3"); await duration.press("Enter");
  await expect(count).toHaveText("서로 다른 이름 확인 0/2");
  await expect(page.getByText("작품 내용이 바뀌어 실행 확인을 다시 시작해요.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /퀴즈/ }).click(); await page.getByRole("tab", { name: /실습/ }).click();
  await expect(count).toHaveText("서로 다른 이름 확인 0/2");
  await expect(page.getByText(/저장된 작품은 유지돼요\. 이 화면에서/)).toBeVisible();
  await saveDraft(page);
  expect(parseProgrammingProject((await stored(page)).draft.programming!.projects.name)?.threads[0][2].params[1]).toMatchObject({ type: "number", params: ["0.3"] });
});

test("entry-guidance: 시작 블록의 다음 행동과 위아래 위치를 정확히 안내한다", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "시작 신호가 준비됐어요." })).toContainText("질문");
  await prepare(page, "move", buildProgrammingProject([[start(), ...movement(0, "10")]]));
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "현재 위치" })).toContainText("X 0 · Y 10");
  await prepare(page, "name", buildProgrammingProject([[start()], [node("ask_and_wait", node("text", "분리된 질문"), null)]]));
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "실행을 마쳤어요." })).toContainText("마지막 말: 아직 없음");
  await expect(page.getByText("시작 신호가 준비됐어요.", { exact: false })).toHaveCount(0);
});

test("entry-guidance: 두 이름 확인은 같은 이름 아홉 번·중지·실행 실패 뒤에도 유지한다", async ({ page }) => {
  test.setTimeout(90000);
  const frame = await prepare(page, "name", nameProject);
  const count = page.getByRole("status", { name: "서로 다른 이름 확인", exact: true });
  for (const [index, name] of ["초코", "보리", ...Array<string>(9).fill("보리")].entries()) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    await expect(count).toHaveText(`서로 다른 이름 확인 ${index ? 2 : 1}/2`);
  }
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(frame.getByLabel("강아지 이름 대답")).toBeVisible();
  await page.getByRole("button", { name: "실행 정지", exact: true }).click();
  await expect(count).toHaveText("서로 다른 이름 확인 2/2");
  const native = page.frames().find(item => item.url().includes("mission=name"))!;
  // Fail the engine's answer dependency once without changing any blocks.
  await native.evaluate(() => {
    const container = (window as unknown as { Entry: { container: { getInputValue: () => string } } }).Entry.container;
    const original = container.getInputValue;
    container.getInputValue = () => { container.getInputValue = original; throw new Error("합성 실행 응답 실패"); };
  });
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  const input = frame.getByLabel("강아지 이름 대답"); await input.fill("실패 입력"); await input.press("Enter");
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await expect(count).toHaveText("서로 다른 이름 확인 2/2");
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toBeEnabled();
});
test.afterEach(async () => {
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: "sequence-lab", openedLessonIds: ["sequence-lab"] });
});

test("미션은 입력·계산·네 방향을 확인하고 미완성 입력과 별도 작품을 보존한다", () => {
  for (const [mission, project] of [["name", nameProject], ["multiply", math()], ["average", math(true)], ["move", moveProject], ["keys", keysProject]]) expect(checkProgrammingMission(mission, project).passed).toBe(true);
  expect(checkProgrammingMission("keys", moveProject).passed).toBe(false);
  const keyDraft = buildProgrammingProject([[node("when_some_key_pressed", null, "81"), ...movement(90)]]);
  expect(parseProgrammingProject(keyDraft)?.threads[0][0].params[1]).toBe("81");
  expect(checkProgrammingMission("keys", keyDraft).passed).toBe(false);
  const wrong = JSON.parse(math()); wrong.objects[0].script[0][2].params[1] = variable("B");
  expect(checkProgrammingMission("multiply", JSON.stringify(wrong)).passed).toBe(false);
  const fake = JSON.parse(math()); fake.objects[0].script[0][5].params[0] = node("combine_something", null, answer(), null, node("text", "24 21 -10 0"), null);
  expect(checkProgrammingMission("multiply", JSON.stringify(fake)).passed).toBe(false);
  const blank = buildProgrammingProject([[start(), ...movement(90, "")], [variable("A")]]);
  expect(parseProgrammingProject(blank)?.threads[0][2].params[0]).toEqual(number(""));
  expect(checkProgrammingMission("move", blank).passed).toBe(false);
  const repositioned = JSON.parse(moveProject); repositioned.objects[0].script[0][0].x = 550;
  expect(programmingProjectMatches(moveProject, JSON.stringify(repositioned))).toBe(true);
  const work = emptyWork(PROGRAMMING_LESSON);
  work.missions = { average: { validation: null, submission: { id: "optional", order: [], submittedAt: 1 } } };
  expect(progressFor(PROGRAMMING_LESSON, work).practice.completed).toBe(0);
});

test("운영 수업 API · 미션별 검증/제출 · 재시도 · 수정 뒤 이전 기록 · 교사 조회", async ({ request, playwright }) => {
  await readyStudent(request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  let work: Work = await (await request.get(endpoint)).json();
  const save = async () => { const r = await request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } }); expect(r.status()).toBe(200); work = await r.json(); };
  const act = async (action: WorkAction) => { const r = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action } }); expect(r.status()).toBe(200); work = await r.json(); };
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: 0, action: { type: "validate-practice" } } })).status()).toBe(400);
  work.draft.programming!.projects = { name: nameProject, multiply: math(), move: moveProject, keys: keysProject, average: math(true) }; await save();
  for (const missionId of ["name", "multiply", "move", "keys", "average"]) {
    await act({ type: "validate-practice", missionId }); await act({ type: "submit-practice", missionId });
  }
  expect(progressFor(PROGRAMMING_LESSON, work).practice).toEqual({ completed: 4, total: 4, percent: 100 });
  const submissions = structuredClone(work.missions);
  const revision = work.revision;
  await act({ type: "submit-practice", missionId: "move" }); expect(work.revision).toBe(revision);
  work.draft.programming!.projects.move = buildProgrammingProject([[start(), ...movement(90, "")]]);
  work.draft.programming!.reflection = "남겨둘 발견";
  work.draft.conceptAnswers.pc0 = "0"; await save();
  expect(work.missions!.move.validation).toBeNull(); expect(work.missions!.move.submission).toEqual(submissions!.move.submission);
  expect(work.missions!.multiply).toEqual(submissions!.multiply);
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice", missionId: "move" } } })).status()).toBe(409);
  expect((await request.get(endpoint)).status()).toBe(200);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher);
    const result = await teacher.get(`/api/classroom/teacher?classId=2-1&lessonId=${id}`);
    expect(result.status()).toBe(200);
    const summary = (await result.json()).students.find((s: { uid: string }) => s.uid === "student-20101").work;
    expect(summary.missions.keys.submission).toEqual({ id: submissions!.keys.submission!.id, submittedAt: submissions!.keys.submission!.submittedAt });
    expect(summary.draft).toBeUndefined();
    const detail = await teacher.get(`/api/classroom/students/student-20101/work/${id}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).missions.keys.submission).toEqual(submissions!.keys.submission);
  } finally { await teacher.dispose(); }
});

async function connect(page: Page, source: Locator, target: Locator, offsetY: number, offsetX = 40, targetX = offsetX) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  await expect.poll(() => source.evaluate((el) => (el as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + offsetX, from.y + 15); await page.mouse.down();
  await page.mouse.move(to.x + targetX, to.y + offsetY, { steps: 12 }); await page.mouse.up();
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

async function attachAnswerState(page: Page, info: TestInfo, errors: string[]) {
  const native = page.frames().find((frame) => frame.url().includes("mission=name"));
  const state = await native?.evaluate(() => {
    const entry = (window as unknown as { Entry: {
      engine: { state: string }; stage: { inputField?: { _readonly: boolean; _hasFocus: boolean; _isHidden: boolean; _hiddenInput: HTMLInputElement } };
      container: { inputValue: { complete: boolean; value?: string } };
    } }).Entry;
    const field = entry.stage.inputField, input = entry.container.inputValue;
    return { engine: entry.engine.state, readonly: field?._readonly, hasFocus: field?._hasFocus, hidden: field?._isHidden,
      nativeFocus: document.activeElement === field?._hiddenInput, inputComplete: input.complete,
      fieldValueLength: field?._hiddenInput.value.length, answerValueLength: String(input.value ?? "").length };
  }).catch(() => null);
  await info.attach("entry-answer-state", { body: JSON.stringify({ state, errors }), contentType: "application/json" });
}

test("entry-answer: 실제 질문칸에서 한글·조합 Enter·저장 대기·두 번 실행 후 Enter로 대답한다", async ({ page }, info) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const frame = await prepare(page, "name", nameProject);
  try {
    for (const name of ["초코", "보리"]) {
      await page.getByRole("button", { name: "실행하기", exact: true }).click();
      const input = frame.getByLabel("강아지 이름 대답"); await expect(input).toBeVisible();
      await clickAnswerCanvas(page);
      await expect(input).toBeFocused();
      await input.dispatchEvent("compositionstart");
      await page.keyboard.insertText(name);
      await input.dispatchEvent("keydown", { key: "Enter", keyCode: 13, which: 13, isComposing: true });
      await expect(page.getByRole("button", { name: "실행 정지", exact: true })).toBeEnabled();
      await expect(input).toHaveValue(name);
      await input.dispatchEvent("compositionend", { data: name });
      // The 900 ms debounce and five-second save interval must not blur the answer.
      await page.waitForTimeout(5500);
      await expect(input).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    }
    expect(errors).toEqual([]);
  } catch (error) { await attachAnswerState(page, info, errors); throw error; }
});

test("entry-answer: 정지 뒤 다시 실행한 질문칸의 실제 파란 체크로 한글 대답을 보낸다", async ({ page }, info) => {
  test.setTimeout(45000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const frame = await prepare(page, "name", nameProject);
  try {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    await expect(frame.getByLabel("강아지 이름 대답")).toBeVisible();
    await page.getByRole("button", { name: "실행 정지", exact: true }).click();
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await expect(input).toBeVisible();
    await clickAnswerCanvas(page); await expect(input).toBeFocused();
    await page.keyboard.insertText("바둑이");
    await expect(input).toHaveValue("바둑이");
    await page.waitForTimeout(5500);
    await clickAnswerCanvas(page, true);
    await expect(page.getByRole("status").filter({ hasText: "마지막 말: 바둑이" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    expect(errors).toEqual([]);
  } catch (error) { await attachAnswerState(page, info, errors); throw error; }
});

test("entry-assets: 그림 준비 전 실행을 막고 그림 로딩 실패에도 작품을 보존한다", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  let release = () => {}, waiting = 0;
  const asset = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/entryjs/name-dog.svg", async (route) => { waiting++; await asset; await route.continue(); });
  const preparation = prepare(page, "name", nameProject);
  try {
    await expect.poll(() => waiting, { timeout: 20000 }).toBeGreaterThan(0);
    const native = page.frames().find((frame) => frame.url().includes("mission=name"))!;
    await expect.poll(() => native.evaluate(() => (window as unknown as { Entry?: { isLoadProject: boolean } }).Entry?.isLoadProject)).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeDisabled();
  } finally { release(); await preparation; }
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  const input = page.frameLocator("iframe").getByLabel("강아지 이름 대답");
  await clickAnswerCanvas(page); await expect(input).toBeFocused();
  await page.keyboard.insertText("별이"); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 별이" })).toBeVisible();
  const project = (await stored(page)).draft.programming!.projects.name;
  await page.unroute("**/entryjs/name-dog.svg");
  await page.route("**/entryjs/name-dog.svg", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("button", { name: "작업실 다시 불러오기", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeDisabled();
  expect(programmingProjectMatches(project, (await stored(page)).draft.programming!.projects.name)).toBe(true);
  await page.unroute("**/entryjs/name-dog.svg");
  await page.getByRole("button", { name: "작업실 다시 불러오기", exact: true }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("entry-flicker: 대답 완료와 수동 정지 뒤 숨은 질문칸을 무대에 다시 그리지 않는다", async ({ page }) => {
  test.setTimeout(45000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const frame = await prepare(page, "name", nameProject);
  const run = page.getByRole("button", { name: "실행하기", exact: true });
  await run.click();
  const input = frame.getByLabel("강아지 이름 대답"); await expect(input).toBeVisible();
  const native = page.frames().find((entryFrame) => entryFrame.url().includes("mission=name"))!;
  await native.evaluate(() => {
    const entry = (window as unknown as { Entry: {
      engine: { isState: (state: string) => boolean };
      stage: { inputField: { _isHidden: boolean; _renderCanvas: HTMLCanvasElement; _ctx: CanvasRenderingContext2D } };
    } }).Entry;
    const field = entry.stage.inputField, ctx = field._ctx;
    const draw = ctx.drawImage.bind(ctx) as (image: CanvasImageSource, ...coordinates: number[]) => void;
    const probe = { hiddenPaints: 0 }; Object.assign(window, { entryFlickerProbe: probe });
    // Observe real canvas output; the hidden DOM input stays mounted after stop.
    ctx.drawImage = (image: CanvasImageSource, ...coordinates: number[]) => {
      if (image === field._renderCanvas && field._isHidden && entry.engine.isState("stop")) probe.hiddenPaints++;
      draw(image, ...coordinates);
    };
  });
  const stoppedState = () => native.evaluate(() => {
    const entry = (window as unknown as { Entry: { engine: { isState: (state: string) => boolean }; stage: { inputField: { _isHidden: boolean } } } }).Entry;
    const { hiddenPaints } = (window as unknown as { entryFlickerProbe: { hiddenPaints: number } }).entryFlickerProbe;
    return { stopped: entry.engine.isState("stop"), hidden: entry.stage.inputField._isHidden, hiddenPaints };
  });
  await clickAnswerCanvas(page); await expect(input).toBeFocused();
  await page.keyboard.insertText("별이"); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 별이" })).toBeVisible();
  await expect(run).toBeEnabled();
  // Cover two cursor-blink periods, rather than sampling one still screenshot.
  await page.waitForTimeout(1200);
  expect(await stoppedState()).toEqual({ stopped: true, hidden: true, hiddenPaints: 0 });
  await run.click(); await expect(input).toBeVisible();
  await clickAnswerCanvas(page); await expect(input).toBeFocused();
  await page.keyboard.insertText("미완료");
  await page.getByRole("button", { name: "실행 정지", exact: true }).click();
  await expect(run).toBeEnabled(); await page.waitForTimeout(1200);
  expect(await stoppedState()).toEqual({ stopped: true, hidden: true, hiddenPaints: 0 });
  expect(errors).toEqual([]);
});

test("실제 팔레트 이름 조립 · 서로 다른 두 입력 · 검증/제출 · 복원", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const frame = await prepare(page);
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "키를 눌렀을 때" })).toHaveCount(0);
  await expect(frame.getByText("자료", { exact: true })).toBeVisible();
  const menu = frame.locator("#entryWorkspaceBlockMenu g.block"), board = frame.locator("#entryWorkspaceBoard g.block");
  await frame.getByText("자료", { exact: true }).click();
  await connect(page, menu.filter({ hasText: "묻고 대답 기다리기" }).first(), board.filter({ hasText: "시작하기 버튼" }).first(), 46);
  await frame.getByText("생김새", { exact: true }).click();
  await connect(page, menu.filter({ hasText: "초 동안" }).first(), board.filter({ hasText: "묻고 대답 기다리기" }).last(), 42, 140);
  await frame.getByText("자료", { exact: true }).click();
  await connect(page, menu.filter({ hasText: /^\s*대답\s*$/ }).first(), board.filter({ hasText: "초 동안" }).last().getByText("안녕!", { exact: true }).locator(".."), 12, 18, -8);
  for (const name of ["초코", "보리"]) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
  }
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toBeFocused();
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("tab", { name: "실습 25%" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "실습 25%" })).toContainText("1/4개 제출");
  await expect(page.locator("#programming-next-mission")).toBeFocused();
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("대답을 말하기에 넣었어요.");
  await saveDraft(page);
  await expect.poll(async () => (await stored(page)).draft.programming!.reflection).toBe("대답을 말하기에 넣었어요.");
  await page.reload(); await expect(page.getByRole("button", { name: "이 작품 제출 완료" })).toBeDisabled();
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await frame.locator("#entryWorkspaceBoard").getByText("안녕!", { exact: true }).first().locator("..").click();
  await page.keyboard.press("Escape"); await expect(page.locator("#entry-run")).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "무대 처음 위치로" })).toBeFocused();
  await page.screenshot({ path: info.outputPath("programming-desktop.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("곱셈·평균 실제 실행 · 변수 팔레트 · 이동 이어 만들기 · 방향키 · 미완성 복원", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  let frame = await prepare(page, "multiply", math());
  await frame.getByText("자료", { exact: true }).click();
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "정하기" }).first()).toBeVisible();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  for (const value of ["6", "4"]) { const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter"); if (value === "6") await expect(input).toHaveValue(""); }
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 24" })).toBeVisible();
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
  const averageWork = await stored(page); averageWork.draft.programming!.mission = "average"; averageWork.draft.programming!.projects.average = math(true);
  expect((await page.request.post(endpoint, { headers, data: { revision: averageWork.revision, draft: averageWork.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`); await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  for (const value of ["6", "4"]) { const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter"); if (value === "6") await expect(input).toHaveValue(""); }
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 5" })).toBeVisible();
  await page.getByRole("button", { name: /시작 버튼으로 움직이기/ }).click();
  await page.locator('iframe[src$="mission=move"]').scrollIntoViewIfNeeded();
  frame = page.frameLocator("iframe");
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await frame.getByText("움직임", { exact: true }).click();
  await connect(page, frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "이동 방향으로" }).first(), frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "시작하기 버튼" }).first(), 46);
  await saveDraft(page);
  await expect.poll(async () => parseProgrammingProject((await stored(page)).draft.programming!.projects.move)?.order).toEqual(["when_run_button_click", "move_direction"]);
  const moveBefore = (await stored(page)).draft.programming!.projects.move;
  await page.getByRole("button", { name: /방향키로 움직임 개선/ }).click();
  await page.locator('iframe[src$="mission=keys"]').scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  const displayedScript = await frame.locator("body").evaluate(() => (window as unknown as { Entry: { container: { getObject: (id: string) => { getScriptText: () => string } } } }).Entry.container.getObject("entrybot").getScriptText());
  expect(programmingProjectMatches(JSON.stringify({ objects: [{ script: displayedScript }] }), moveBefore)).toBe(true);
  expect((await stored(page)).draft.programming!.projects.move).toBe(moveBefore);
  await frame.getByText("시작", { exact: true }).click();
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "키를 눌렀을 때" }).first()).toContainText("위쪽");
  // Load a four-key work through the same save API, then operate the real engine.
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
  let work = await stored(page); work.draft.programming!.mission = "keys"; work.draft.programming!.projects.keys = keysProject;
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`); await page.locator("iframe").scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  const native = page.frames().find((f) => f.url().includes("mission=keys"))!;
  const position = () => native.evaluate(() => { const e = (window as unknown as { Entry: { container: { getObject: (id: string) => { entity: { getX: () => number; getY: () => number } } } } }).Entry.container.getObject("entrybot").entity; return [Math.round(e.getX()) || 0, Math.round(e.getY()) || 0]; });
  await page.getByRole("button", { name: "실행하기", exact: true }).click(); await expect.poll(position).toEqual([10, 0]);
  for (const [label, expected] of [["↑ 위", [10, 10]], ["← 왼쪽", [0, 10]], ["↓ 아래", [0, 0]], ["→ 오른쪽", [10, 0]]] as const) { await page.getByRole("button", { name: label, exact: true }).click(); await expect.poll(position).toEqual(expected); }
  await page.getByRole("button", { name: "실행 정지" }).click(); await expect.poll(position).toEqual([0, 0]);
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" });
  if (await dialog.isVisible()) await dialog.getByRole("button", { name: "저장하지 않고 나가기", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  work = await stored(page); work.draft.programming!.projects.keys = buildProgrammingProject([[start(), ...movement(90, "")]]);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`); await page.locator("iframe").scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  expect(parseProgrammingProject((await stored(page)).draft.programming!.projects.keys)?.threads[0][2].params[0]).toEqual(number(""));
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "이동 방향으로" }).first()).toBeVisible();
  await saveDraft(page); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("programming-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("한 반 27명의 동시 입장·작품 저장·검증은 각 학생의 기록으로 남는다", async ({ request, playwright }, info) => {
  test.setTimeout(90000); await localOnly(request);
  const classRef = db.collection("csClasses").doc("2-8"), original = (await classRef.get()).data()!;
  const rows = Array.from({ length: 27 }, (_, i) => ({ studentId: `208${String(i + 1).padStart(2, "0")}`, uid: `student-208${String(i + 1).padStart(2, "0")}` }));
  const created: string[] = [], contexts = [];
  try {
    for (const row of rows) {
      expect((await db.collection("csAccounts").doc(row.uid).get()).exists).toBe(false);
      await auth.createUser({ uid: row.uid, email: `s-${row.studentId}@cs-class.invalid`, password: studentPassword }); created.push(row.uid);
      await db.collection("csAccounts").doc(row.uid).create({ ...row, role: "student", classId: "2-8", classIds: [], mustChangePassword: false, temporaryPassword: null, disabled: false, authVersion: 0, authBusy: null, session: null });
    }
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    for (const row of rows) contexts.push({ row, api: await playwright.request.newContext({ baseURL: "http://localhost:3000" }) });
    const started = Date.now();
    await Promise.all(contexts.map(async ({ row, api }) => {
      expect((await loginStudent(api, studentPassword, row.studentId)).status()).toBe(200);
      const work: Work = await (await api.get(endpoint)).json();
      work.draft.programming!.mission = "move"; work.draft.programming!.projects.move = moveProject;
      work.draft.programming!.reflection = `동시 저장 ${row.studentId}`;
      const saved = await api.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } }); expect(saved.status()).toBe(200);
      const next: Work = await saved.json();
      const checked = await api.post(`${endpoint}/action`, { headers, data: { revision: next.revision, action: { type: "validate-practice", missionId: "move" } } }); expect(checked.status()).toBe(200); expect((await checked.json()).missions.move.validation.passed).toBe(true);
      expect((await (await api.get(endpoint)).json()).draft.programming.reflection).toBe(`동시 저장 ${row.studentId}`);
    }));
    await info.attach("classroom-27", { body: JSON.stringify({ project: "demo-cs-class", count: 27, flow: "parallel login/read/save/validate/read", elapsedMs: Date.now() - started, productionPerformanceGuarantee: false }), contentType: "application/json" });
  } finally {
    for (const { api } of contexts) await api.dispose();
    for (const uid of created) {
      await auth.deleteUser(uid); await db.collection("csAccounts").doc(uid).delete(); await db.collection("csWork").doc(`${uid}__${id}`).delete();
      await db.collection("csRateLimits").doc(createHash("sha256").update(`credential:${uid}:${passwordDigest(studentPassword)}`).digest("hex")).delete();
    }
    await classRef.set(original);
  }
});

test("저장 실패에도 미션 간 초안은 유지하고, 명시 저장한 개념·퀴즈는 재접속 뒤 이어간다", async ({ page }) => {
  await prepare(page, "move", moveProject);
  await page.route(`**${endpoint}`, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("저장 실패 중에도 유지");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: /방향키로 움직임 개선/ }).click();
  await expect(page.locator("#programming-mission-title")).toHaveText("방향키로 움직임 개선");
  await expect(page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?")).toHaveValue("저장 실패 중에도 유지");
  await expect(page.locator("#entry-run")).toBeEnabled();
  await page.unroute(`**${endpoint}`); await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await page.getByRole("tab", { name: "개념 0%" }).click();
  await expect(page.getByRole("tab", { name: "개념 0%" })).toBeFocused();
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await page.getByRole("radio").nth(questions[0].correct).check();
  await saveDraft(page);
  await expect.poll(async () => (await stored(page)).draft.quizAnswers[questions[0].id]).toBe(String(questions[0].correct));
  await page.getByRole("button", { name: "다음 문제" }).click();
  await page.reload();
  await expect(page.locator("#programming-question")).toHaveText(questions[1].prompt);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "퀴즈 문항 목록" }).getByRole("button", { name: /문제 1/ }).click();
  await expect(page.locator("#programming-question")).toHaveText(questions[0].prompt);
  await expect(page.getByRole("button", { name: "이전 문제" })).toBeDisabled();
  await expect(page.getByRole("radio").nth(questions[0].correct)).toBeChecked();
  expect((await stored(page)).draft.programming!.reflection).toBe("저장 실패 중에도 유지");
});
