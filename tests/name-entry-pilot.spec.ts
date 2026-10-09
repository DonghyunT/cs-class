import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildNameProject, checkNameMission, parseNameProject, type NameRun } from "../src/lib/classroom/name-entry";
import { initialState, LEGACY_STORAGE_KEY, restoreState, STORAGE_KEY, type Block } from "../src/lib/prototype/programming";

const code: Block[] = [{ id: "s", kind: "start", value: "click" }, { id: "q", kind: "ask", value: "name" }, { id: "a", kind: "say", value: "answer" }];
const complete = buildNameProject(code)!;

test("entry-guidance: 이름 연결 오류와 현재 작품의 두 이름 실행 부족을 구분한다", () => {
  const key = parseNameProject(complete)!.key;
  const run = (name: string, id = name): NameRun => ({ id, key, reason: "finished", steps: [{ kind: "ask", value: "강아지 이름은?" }, { kind: "answer", value: name }, { kind: "say", value: `내 이름은 ${name}!` }] });
  expect(checkNameMission("unreadable", [])).toMatchObject({ passed: false, issue: "project", validNames: 0 });
  expect(checkNameMission(buildNameProject()!, [])).toMatchObject({ passed: false, issue: "structure", validNames: 0 });
  expect(checkNameMission(complete, [])).toMatchObject({ passed: false, issue: "runs", validNames: 0 });
  expect(checkNameMission(complete, [run("초코"), run("초코", "duplicate"), ...["stopped", "timeout", "error"].map(reason => ({ ...run("보리", reason), reason })), { ...run("보리", "old"), key: "old" }])).toMatchObject({ passed: false, issue: "runs", validNames: 1 });
  expect(checkNameMission(complete, [run("초코"), run("보리"), run("두부")])).toMatchObject({ passed: true, issue: null, validNames: 2 });
  const moved = JSON.parse(complete); moved.objects[0].script[0][0].x = 600; moved.objects[0].script[0][0].id = "moved-start";
  expect(checkNameMission(JSON.stringify(moved), [run("초코"), run("보리")])).toMatchObject({ passed: true, validNames: 2 });
  const literal = JSON.parse(complete); literal.objects[0].script[0][2].params[0] = { type: "text", params: ["초코"] };
  expect(checkNameMission(JSON.stringify(literal), [])).toMatchObject({ passed: false, issue: "structure", validNames: 0 });
  const changed = JSON.parse(complete); changed.objects[0].script[0][1].params[0] = { type: "text", params: ["새 이름은?"] };
  expect(checkNameMission(JSON.stringify(changed), [run("초코"), run("보리")])).toMatchObject({ passed: false, issue: "runs", validNames: 0 });
});
async function enter(page: Page, project = complete) {
  await page.goto("/prototype/programming");
  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY)).not.toBeNull();
  await page.evaluate(({ key, state }) => sessionStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state: { ...initialState(), stage: "practice", nameEntryProject: project } });
  await page.reload();
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe[title='강아지 이름 짓기 엔트리 작업실']");
}
async function respond(page: Page, name: string) {
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  const frame = page.frameLocator("iframe[title='강아지 이름 짓기 엔트리 작업실']");
  const input = frame.locator("input:not([disabled]):visible");
  await expect(input).toBeVisible();
  await input.fill(name); await input.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: `마지막 말: 내 이름은 ${name}!` })).toBeVisible();
}

test("이식과 확인은 오답·원문·실제로 출력한 대답을 보존한다", () => {
  const legacy = { ...initialState(), version: 1, completed: [0, 2], reflection: "남길 기록", programs: [code, ...initialState().programs.slice(1)] };
  expect(restoreState(JSON.stringify(legacy))).toMatchObject({ version: 2, completed: [0, 2], reflection: "남길 기록" });
  const wrong = buildNameProject([{ id: "wrong", kind: "start", value: "ArrowRight" }, code[2], code[1]])!;
  expect(parseNameProject(wrong)?.threads[0].map((b) => b.type)).toEqual(["when_some_key_pressed", "dialog_time", "ask_and_wait"]);
  const invalid = JSON.parse(complete); invalid.objects[0].script[0][1].type = "unsupported";
  expect(restoreState(JSON.stringify({ ...initialState(), nameEntryProject: JSON.stringify(invalid) }))).toMatchObject({ nameImportFailed: true, nameImportRaw: JSON.stringify(invalid) });
  const preserved = restoreState(JSON.stringify({ ...initialState(), nameEntryProject: "x".repeat(98_500), completed: [0, 1] }))!;
  expect(restoreState(JSON.stringify(preserved))).toMatchObject({ completed: [0, 1], nameImportRaw: "x".repeat(98_500) });
  const key = parseNameProject(complete)!.key;
  const run = (name: string, id = name): NameRun => ({ id, key, reason: "finished", steps: [{ kind: "ask", value: "강아지 이름은?" }, { kind: "answer", value: name }, { kind: "say", value: `내 이름은 ${name}!` }] });
  expect(checkNameMission(complete, [run("초코"), run("보리")]).passed).toBe(true);
  expect(checkNameMission(complete, [run("초코", "1"), run("초코", "2")]).passed).toBe(false);
  expect(checkNameMission(complete, [run("초코"), { ...run("보리"), reason: "stopped" }]).passed).toBe(false);
  expect(checkNameMission(complete, [run("초코"), { ...run("보리"), key: "old" }]).passed).toBe(false);
  const literal = JSON.parse(complete); literal.objects[0].script[0][2].params[0] = { type: "text", params: ["초코"] };
  const literalRaw = JSON.stringify(literal), literalKey = parseNameProject(literalRaw)!.key;
  expect(checkNameMission(literalRaw, ["초코", "보리"].map((name) => ({ ...run(name), key: literalKey, steps: [...run(name).steps.slice(0, 2), { kind: "say" as const, value: "초코" }] }))).passed).toBe(false);
  const plain = JSON.parse(complete); plain.objects[0].script[0][2].params[0] = { type: "get_canvas_input_value", params: [null] };
  const plainRaw = JSON.stringify(plain), plainKey = parseNameProject(plainRaw)!.key;
  expect(checkNameMission(plainRaw, ["1.23456", "2.34567"].map((name, i) => ({ ...run(name), key: plainKey, steps: [...run(name).steps.slice(0, 2), { kind: "say" as const, value: ["1.235", "2.346"][i] }] }))).passed).toBe(true);
  const extra = buildNameProject([...code, { id: "extra", kind: "ask", value: "name" }])!;
  const extraRun = (last: string): NameRun => ({ ...run("초코", last), key: parseNameProject(extra)!.key, steps: [...run("초코").steps, { kind: "ask", value: "다시 물어요" }, { kind: "answer", value: last }] });
  expect(checkNameMission(extra, [extraRun("보리"), extraRun("두부")]).passed).toBe(false);
});

test("public entry-assets: 그림 준비 중 내부 작업실을 막고 준비 뒤 질문에 대답한다", async ({ page }) => {
  test.setTimeout(45000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  let release = () => {}, waiting = 0;
  const asset = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/entryjs/name-dog.svg", async (route) => { waiting++; await asset; await route.continue(); });
  await page.goto("/prototype/programming");
  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY)).not.toBeNull();
  await page.evaluate(({ key, state }) => sessionStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state: { ...initialState(), stage: "practice", nameEntryProject: complete } });
  await page.reload({ waitUntil: "domcontentloaded" }); await page.locator("iframe").scrollIntoViewIfNeeded();
  const run = page.getByRole("button", { name: "실행하기", exact: true });
  await expect.poll(() => waiting, { timeout: 20000 }).toBeGreaterThan(0);
  const native = page.frames().find((frame) => frame.url().includes("exercise=name"))!;
  try {
    await expect.poll(() => native.evaluate(() => (window as unknown as { Entry?: { isLoadProject: boolean } }).Entry?.isLoadProject)).toBe(true);
    await expect(page.frameLocator("iframe").locator("#entryWorkspaceBoard").getByText("묻고 대답 기다리기", { exact: false }).first()).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    // The public prototype has native run/edit controls inside its iframe.
    expect(await native.locator("#workspace").evaluate((element) => (element as HTMLElement).inert)).toBe(true);
    await expect(run).toBeDisabled();
  } finally { release(); await expect(run).toBeEnabled({ timeout: 20000 }); }
  expect(await native.locator("#workspace").evaluate((element) => (element as HTMLElement).inert)).toBe(false);
  await respond(page, "두부");
  expect(errors).toEqual([]);
});

test("실제 질문 두 번·완료·도움 스냅샷·복원과 좁은 화면", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const frame = await enter(page);
  await respond(page, "초코");
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await expect(page.getByRole("button", { name: "내 작업에 완료 표시" })).toBeDisabled();
  await respond(page, "보리");
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await page.getByRole("button", { name: "내 작업에 완료 표시" }).click();
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toBeVisible();
  await page.getByRole("button", { name: "막혔어요" }).click();
  await page.getByLabel("어떻게 되면 좋겠어?").fill("이름을 말하기");
  await page.getByLabel("지금은 어떤 일이 생겼어?").fill("두 이름을 말했어요");
  await page.getByRole("button", { name: "도움 요청 체험하기" }).click();
  await page.getByRole("button", { name: "요청받은 선생님 화면 보기" }).click();
  await expect(page.getByText("내 이름은 보리!", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "학생이 받은 피드백 보기" }).click();
  await page.getByRole("button", { name: "도움 닫기" }).click();
  for (const width of [1024, 768, 390, 320]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#name-run")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "무대 처음 위치로" })).toBeFocused();
  const scroll = page.getByRole("region", { name: "엔트리 작업실 가로 이동" });
  await scroll.focus(); await scroll.evaluate((e) => { e.scrollLeft = 0; }); await page.keyboard.press("ArrowRight");
  await expect.poll(() => scroll.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("name-entry-320.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내 작업에 완료 표시" })).toBeDisabled();
  await expect(frame.locator("#entryWorkspaceBoard").getByText("묻고 대답 기다리기", { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("질문을 기다리는 시간·중지·로딩 실패와 미편집 이동", async ({ page }) => {
  test.setTimeout(60000);
  const frame = await enter(page);
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(frame.locator("input:not([disabled]):visible")).toBeVisible();
  await page.waitForTimeout(16000);
  await expect(page.getByRole("button", { name: "중지", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "중지", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "무대를 처음 위치" })).toBeVisible();
  await respond(page, "두부");
  await page.route("**/entryjs/vendor/entry/dist/entry.min.js", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.getByRole("tab", { name: "퀴즈 0/5" }).click();
  await expect(page.getByRole("tab", { name: "퀴즈 0/5" })).toHaveAttribute("aria-selected", "true");
});

test("v1 초안은 이름·다른 답안·완료를 남기며 v1 원문을 유지한다", async ({ page }) => {
  await page.goto("/prototype/programming");
  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY)).not.toBeNull();
  const state = { ...initialState(), version: 1, stage: "practice", programs: [code, ...initialState().programs.slice(1)], completed: [2], reflection: "예전 발견" };
  const raw = JSON.stringify(state);
  await page.evaluate(({ key, legacy, raw }) => { sessionStorage.removeItem(key); sessionStorage.setItem(legacy, raw); }, { key: STORAGE_KEY, legacy: LEGACY_STORAGE_KEY, raw });
  await page.reload();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  await respond(page, "초코");
  expect(await page.evaluate((key) => sessionStorage.getItem(key), LEGACY_STORAGE_KEY)).toBe(raw);
  await expect(page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?")).toHaveValue("예전 발견");
});

async function connect(page: Page, source: Locator, target: Locator, offsetY: number, offsetX = 40, targetX = offsetX) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  await expect.poll(() => source.evaluate((element) => (element as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + offsetX, from.y + 15); await page.mouse.down();
  await page.mouse.move(to.x + targetX, to.y + offsetY, { steps: 12 }); await page.mouse.up();
}

test("시작 블록에서 실제 팔레트 조립·대답 연결·IME·수정 무효화·저장 실패 이동 보호", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => window.addEventListener("message", (event) => {
    if (document.documentElement.dataset.delayExport !== "true" || event.data?.type !== "exported" || event.data?.delayed || event.data.id === "before-run") return;
    event.stopImmediatePropagation();
    setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: { ...event.data, delayed: true }, origin: event.origin, source: event.source })), 500);
  }, { capture: true }));
  const frame = await enter(page, buildNameProject()!);
  await frame.getByText("자료", { exact: true }).click();
  const menu = frame.locator("#entryWorkspaceBlockMenu g.block"), board = frame.locator("#entryWorkspaceBoard g.block");
  await connect(page, menu.filter({ hasText: "묻고 대답 기다리기" }).first(), board.filter({ hasText: "시작하기 버튼" }).first(), 46);
  await frame.getByText("생김새", { exact: true }).click();
  await connect(page, menu.filter({ hasText: "초 동안" }).first(), board.filter({ hasText: "묻고 대답 기다리기" }).last(), 42, 140);
  await frame.getByText("자료", { exact: true }).click();
  const reporter = menu.filter({ hasText: /^\s*대답\s*$/ }).first();
  const socket = board.filter({ hasText: "초 동안" }).last().getByText("안녕!", { exact: true }).locator("..");
  await connect(page, reporter, socket, 12, 18, -8);
  await expect.poll(async () => {
    const raw = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).nameEntryProject, STORAGE_KEY);
    return parseNameProject(raw)?.threads[0].map((b) => b.type);
  }).toEqual(["when_run_button_click", "ask_and_wait", "dialog_time"]);
  await expect.poll(async () => { const raw = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).nameEntryProject, STORAGE_KEY); return parseNameProject(raw)?.threads[0][2].params[0]; }).toMatchObject({ type: "get_canvas_input_value" });
  for (const name of ["초코", "보리"]) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답");
    await input.fill(name);
    await input.dispatchEvent("compositionstart");
    await input.dispatchEvent("keydown", { key: "Enter", keyCode: 13, isComposing: true });
    await expect(page.getByRole("button", { name: "중지", exact: true })).toBeEnabled();
    await input.dispatchEvent("compositionend", { data: name }); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
  }
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await expect(page.getByRole("button", { name: "내 작업에 완료 표시" })).toBeEnabled();
  // Delay only the requested export while the student writes another answer.
  await page.evaluate(() => { document.documentElement.dataset.delayExport = "true"; });
  await page.getByRole("button", { name: "내 작업에 완료 표시" }).click();
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("완료 중에도 남긴 발견");
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toBeVisible();
  await expect(page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?")).toHaveValue("완료 중에도 남긴 발견");
  await frame.locator("#entryWorkspaceBoard").getByText("안녕!", { exact: true }).locator("..").click();
  const field = frame.locator("input.entry-widget-input-field:visible");
  await field.fill("새 이름을 알려줘");
  await expect(page.getByRole("button", { name: "내 작업에 완료 표시" })).toBeDisabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === "cs-class-programming-prototype-v2") throw new Error("test quota"); original.call(this, key, value); };
  });
  await page.getByRole("tab", { name: "퀴즈 0/5" }).click();
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("보관하지 못했어요");
  await expect(frame.locator("#entryWorkspaceBoard").getByText("새 이름을 알려줘", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("작품 export 실패는 단계·미션·교사 이동을 막고 네이티브 입력을 유지한다", async ({ page }) => {
  await page.addInitScript(() => window.addEventListener("message", (event) => {
    if (document.documentElement.dataset.blockExport === "true" && event.data?.type === "exported") event.stopImmediatePropagation();
  }, { capture: true }));
  const frame = await enter(page);
  await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
  await frame.locator("input.entry-widget-input-field:visible").fill("보존할 질문");
  await page.evaluate(() => { document.documentElement.dataset.blockExport = "true"; });
  for (const name of ["퀴즈 0/5", "02 곱셈 계산기", "교사 시점 체험", "정보 교실"]) {
    await page.getByRole(name.startsWith("퀴즈") ? "tab" : name === "정보 교실" ? "link" : "button", { name, exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("작품을 읽지 못했어요");
    await expect(page.getByRole("tab", { name: "실습 0/3" })).toHaveAttribute("aria-selected", "true");
    await expect(frame.locator("#entryWorkspaceBoard").getByText("보존할 질문", { exact: true })).toBeVisible();
  }
});

test("상수 출력은 두 실제 입력에도 통과하지 않고 실행 오류는 따로 안내한다", async ({ page }) => {
  const project = JSON.parse(complete);
  project.objects[0].script[0][2].params[0] = { type: "text", params: ["초코"] };
  const frame = await enter(page, JSON.stringify(project));
  for (const name of ["초코", "보리"]) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "마지막 말: 초코" })).toBeVisible();
  }
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await expect(page.getByRole("button", { name: "내 작업에 완료 표시" })).toBeDisabled();
  await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
  await frame.locator("input.entry-widget-input-field:visible").fill("");
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "실행기에서 오류가 생겼어요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
});

test("Entry 도움은 요청 버튼의 작품을 고정하고 이후 수정을 분리한다", async ({ page }) => {
  const frame = await enter(page);
  await page.getByRole("button", { name: "막혔어요" }).click();
  const question = frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..");
  await question.click(); await frame.locator("input.entry-widget-input-field:visible").fill("요청 직전 질문");
  await page.getByRole("button", { name: "도움 요청 체험하기" }).click();
  await frame.locator("#entryWorkspaceBoard").getByText("요청 직전 질문", { exact: true }).locator("..").click();
  await frame.locator("input.entry-widget-input-field:visible").fill("요청 뒤 질문");
  await page.getByRole("button", { name: "요청받은 선생님 화면 보기" }).click();
  await expect(page.getByText("요청 직전 질문 · 묻고 대답 기다리기", { exact: true })).toBeVisible();
  await expect(page.getByText("요청 뒤 학생이 코드를 바꿨어요.", { exact: false })).toBeVisible();
  await expect(page.getByText("직접 입력한 이름: 아직 없음", { exact: true })).toBeVisible();
});
