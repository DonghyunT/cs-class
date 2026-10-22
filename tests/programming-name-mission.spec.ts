import { expect, test, type Page } from "@playwright/test";
import type { DocumentData } from "firebase-admin/firestore";
import { buildNameProject, checkNameMission, parseNameProject, type NameRun } from "../src/lib/classroom/name-entry";
import { buildProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, entryReset, entryStart, entryStop, headers, readyStudent } from "./emulator";

type Block = NonNullable<Parameters<typeof buildNameProject>[0]>[number];
const code: Block[] = [{ id: "s", kind: "start", value: "click" }, { id: "q", kind: "ask", value: "name" }, { id: "a", kind: "say", value: "answer" }];
const complete = buildNameProject(code)!;

test("entry-guidance: 이름 연결 오류와 현재 작품의 두 이름 실행 부족을 구분한다", () => {
  const key = parseNameProject(complete)!.key;
  const run = (name: string, id = name): NameRun => ({ id, key, reason: "finished", steps: [{ kind: "ask", value: "강아지 이름은?" }, { kind: "answer", value: name }, { kind: "say", value: `내 이름은 ${name}!` }] });
  expect(checkNameMission("unreadable", [])).toMatchObject({ passed: false, issue: "project", validNames: 0 });
  expect(checkNameMission(buildNameProject()!, [])).toMatchObject({ passed: false, issue: "structure", validNames: 0 });
  // Structure messages name the same timed speech block as the mission hint.
  expect(checkNameMission(buildNameProject()!, []).message).toContain("‘( )을(를) ( )초 동안 말하기’");
  expect(checkNameMission(buildNameProject([{ id: "k", kind: "start", value: "ArrowRight" }])!, []).message).toContain("‘( )을(를) ( )초 동안 말하기’");
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

test("확인은 블록 순서·실제로 출력한 대답을 구분한다", () => {
  const wrong = buildNameProject([{ id: "wrong", kind: "start", value: "ArrowRight" }, code[2], code[1]])!;
  expect(parseNameProject(wrong)?.threads[0].map((b) => b.type)).toEqual(["when_some_key_pressed", "dialog_time", "ask_and_wait"]);
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

// The rest runs on the real lesson (formerly checked on the removed public prototype).
test.describe("정식 수업 programming-13", () => {
  const id = "programming-13", endpoint = `/api/classroom/work/${id}`;
  const workRef = db.doc(`csWork/student-20101__${id}`), classRef = db.doc("csClasses/2-1");
  const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
  const nameProject = buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "강아지 이름은?"), null), node("dialog_time", node("get_canvas_input_value", null), node("number", "0.2"), "speak", null)]]);
  const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();
  let originalClass: DocumentData | undefined;

  test.beforeEach(async ({ page }) => {
    originalClass = (await classRef.get()).data();
    await readyStudent(page.request);
    await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
  });
  test.afterEach(async ({ page }) => {
    await page.goto("about:blank");
    await workRef.delete();
    if (originalClass) await classRef.set(originalClass);
  });

  async function enter(page: Page) {
    const before = await stored(page);
    expect((await page.request.post(endpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "practice", programming: { mission: "name", projects: { name: nameProject }, reflection: "" } } } })).status()).toBe(200);
    await page.goto(`/classroom/${id}?from=dashboard`);
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    return page.frameLocator("iframe");
  }
  async function respond(page: Page, name: string) {
    await entryStart(page).click();
    const input = page.frameLocator("iframe").getByLabel("강아지 이름 대답");
    await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
  }

  test("질문을 기다리는 시간은 15초 실행 제한에 넣지 않고 정지 뒤 다시 대답한다", async ({ page }) => {
    test.setTimeout(60000);
    const frame = await enter(page);
    await entryStart(page).click();
    await expect(frame.getByLabel("강아지 이름 대답")).toBeVisible();
    await page.waitForTimeout(16000);
    await expect(entryStop(page)).toBeEnabled();
    await expect(page.getByText("15초가 지나 실행을 멈췄어요.", { exact: false })).toHaveCount(0);
    await entryStop(page).click();
    await expect(page.getByRole("status").filter({ hasText: /^실행을 멈췄어요\./ })).toBeVisible();
    await respond(page, "두부");
  });

  test("검증·제출한 이름 미션에 다시 들어오면 0/2 대신 확인 완료를 보이고, 블록을 바꾸면 0/2부터 다시 센다", async ({ page }) => {
    test.setTimeout(60000);
    const before = await stored(page);
    expect((await page.request.post(endpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "practice", programming: { mission: "name", projects: { name: nameProject }, reflection: "" } } } })).status()).toBe(200);
    let work = await stored(page);
    for (const type of ["validate-practice", "submit-practice"]) {
      const response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type, missionId: "name" } } });
      expect(response.status(), type).toBe(200);
      work = await response.json();
    }
    expect(work.missions?.name?.validation?.passed).toBe(true);
    expect(work.missions?.name?.submission).toBeTruthy();
    await page.goto(`/classroom/${id}?from=dashboard`);
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    const nameCheck = page.getByRole("status", { name: "서로 다른 이름 확인", exact: true });
    await expect(nameCheck).toHaveText("서로 다른 이름 확인 완료");
    await expect(page.getByText("이 작품은 두 이름으로 확인하고 검증을 통과했어요. 블록을 바꾸면 두 번 실행을 다시 확인해요.", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "작품 저장·검증·제출 상태" })).toContainText("현재 작품 제출 완료");
    await expect(page.getByText(/0\/2/)).toHaveCount(0);
    // Validating the unchanged work again goes to the server, as the finished status promises.
    await page.getByRole("button", { name: "조건 검증", exact: true }).click();
    await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
    await expect(page.locator("#entry-local-feedback")).toHaveCount(0);
    const frame = page.frameLocator("iframe");
    await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
    await frame.locator("input.entry-widget-input-field:visible").fill("새 이름은?");
    await frame.locator("#entryWorkspaceBoard").click({ position: { x: 20, y: 400 } });
    await expect(nameCheck).toHaveText("서로 다른 이름 확인 0/2");
    await expect(page.getByText("작품 내용이 바뀌어 실행 확인을 다시 시작해요.", { exact: true })).toBeVisible();
  });

  test("구조가 틀린 이름 작품은 실행해도 세지 않는 이유를 두 이름 확인 설명에 보인다", async ({ page }) => {
    test.setTimeout(60000);
    const before = await stored(page);
    const plain = buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "강아지 이름은?"), null), node("dialog", node("get_canvas_input_value", null), "speak", null)]]);
    expect((await page.request.post(endpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "practice", programming: { mission: "name", projects: { name: plain }, reflection: "" } } } })).status()).toBe(200);
    await page.goto(`/classroom/${id}?from=dashboard`);
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    const reason = page.locator('[aria-label="서로 다른 이름 확인"] + p');
    // Before the first run the usual first notice shows; the reason appears once a run is not counted.
    await expect(reason).toHaveText("저장된 작품은 유지돼요. 이 화면에서 서로 다른 이름으로 두 번 실행해 주세요.");
    await entryStart(page).click();
    const input = page.frameLocator("iframe").getByLabel("강아지 이름 대답");
    await input.fill("초코"); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "마지막 말: 초코" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("status", { name: "서로 다른 이름 확인", exact: true })).toHaveText("서로 다른 이름 확인 0/2");
    await expect(reason).toContainText("‘( )을(를) 말하기’ 대신 ‘( )을(를) ( )초 동안 말하기’");
    await expect(reason).not.toContainText("작품 내용이 바뀌어");
  });

  test("시작 블록만 있는 처음 작품은 실행 전에 구조 오류처럼 읽히는 문장을 보이지 않는다", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`/classroom/${id}?from=dashboard`);
    await page.getByRole("tab", { name: /실습/ }).click();
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    const reason = page.locator('[aria-label="서로 다른 이름 확인"] + p');
    await expect(reason).toHaveText("서로 다른 이름으로 두 번 실행해 주세요. 질문에 답하고 말하기가 끝날 때까지 기다려요.");
    await entryStart(page).click();
    await expect(page.getByRole("status").filter({ hasText: "시작 신호가 준비됐어요." })).toBeVisible({ timeout: 10000 });
    await expect(reason).toContainText("지금 블록 연결로는 실행 확인을 세지 않아요.");
  });

  test("작품 export 실패는 단계·미션 이동과 수업 나가기를 막고 작업실 입력을 유지한다", async ({ page }) => {
    test.setTimeout(60000);
    await page.addInitScript(() => window.addEventListener("message", (event) => {
      if (document.documentElement.dataset.blockExport === "true" && event.data?.type === "exported") event.stopImmediatePropagation();
    }, { capture: true }));
    const frame = await enter(page);
    await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
    await frame.locator("input.entry-widget-input-field:visible").fill("보존할 질문");
    await page.evaluate(() => { document.documentElement.dataset.blockExport = "true"; });
    const nextMission = page.getByRole("navigation", { name: "실습 미션" }).getByRole("button", { name: /곱셈 계산기/ });
    for (const target of [page.getByRole("tab", { name: /퀴즈/ }), nextMission, page.getByRole("link", { name: "수업 나가기", exact: true })]) {
      await target.click();
      // Each move waits for the editor export; the mission buttons stay disabled until it gives up.
      await expect(nextMission).toBeDisabled();
      await expect(nextMission).toBeEnabled({ timeout: 10000 });
      await expect(page.locator("#work-save-error")).toContainText("작품을 확인하지 못했어요");
      await expect(page).toHaveURL(new RegExp(`/classroom/${id}`));
      await expect(page.getByRole("tab", { name: /실습/ })).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#programming-mission-title")).toHaveText("강아지 이름 짓기");
      await expect(frame.locator("#entryWorkspaceBoard").getByText("보존할 질문", { exact: true })).toBeVisible();
    }
  });

  test("저장 중 늦게 도착한 작품 export는 그사이 쓴 발견 기록을 덮어쓰지 않는다", async ({ page }) => {
    await page.addInitScript(() => window.addEventListener("message", (event) => {
      if (document.documentElement.dataset.delayExport !== "true" || event.data?.type !== "exported" || event.data?.delayed) return;
      event.stopImmediatePropagation();
      setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: { ...event.data, delayed: true }, origin: event.origin, source: event.source })), 1500);
    }, { capture: true }));
    await enter(page);
    await page.evaluate(() => { document.documentElement.dataset.delayExport = "true"; });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    const reflection = page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?");
    await reflection.fill("저장 중에도 남긴 발견");
    await expect.poll(async () => (await stored(page)).draft.programming?.reflection).toBe("저장 중에도 남긴 발견");
    await expect(reflection).toHaveValue("저장 중에도 남긴 발견");
  });

  test("programming-readability: 서로 다른 체험의 실행 결과가 개념 왕복에서 섞이지 않는다", async ({ page }) => {
    await page.goto(`/classroom/${id}`);
    const reset = page.getByRole("group", { name: /개념 체험$/ }).getByRole("button", { name: "체험 초기화", exact: true });
    await page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: /컴퓨터에게 전하는 말/ }).click();
    await page.getByRole("button", { name: "이 명령 실행하기" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^안녕!$/ })).toBeVisible();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(page.getByText("말풍선이 기다리고 있어요", { exact: true })).toBeVisible();
    await page.getByLabel("강아지 이름", { exact: true }).fill("보리");
    await page.getByRole("button", { name: "인사말 만들어 보기" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^내 이름은 보리!$/ })).toBeVisible();
    await page.getByRole("button", { name: "이전 개념", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^안녕!$/ })).toBeVisible();
    await reset.click();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(page.getByLabel("강아지 이름", { exact: true })).toHaveValue("보리");
    await expect(page.getByRole("status").filter({ hasText: /^내 이름은 보리!$/ })).toBeVisible();
  });

  test("programming-readability: 관찰하며 체험을 초기화해도 답안과 완료는 유지", async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`/classroom/${id}`);
    const experiment = page.getByRole("group", { name: /개념 체험$/ });
    const observation = page.locator("#programming-observation");
    const reset = experiment.getByRole("button", { name: "체험 초기화", exact: true });
    await expect(page.locator("#concept-title")).toHaveText("프로그래밍이란?");
    await expect(observation).toBeVisible();
    await expect(experiment.getByRole("definition")).toHaveCount(3);
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/블록.*텍스트.*결과/);
    await expect(experiment.getByRole("definition")).toHaveCount(0);
    await page.getByRole("button", { name: "텍스트", exact: true }).click();
    await page.getByRole("button", { name: "이 명령 실행하기" }).click();
    await expect(experiment.getByText("안녕!", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true }).check();
    await page.getByRole("button", { name: "정답 확인" }).click();
    await expect(page.getByRole("button", { name: "개념 확인 완료" })).toBeDisabled();
    await reset.click();
    await expect(page.getByRole("button", { name: "블록", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(experiment.getByText("어떤 명령을 줄까?", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "개념 확인 완료" })).toBeDisabled();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/이름.*인사말/);
    await page.getByLabel("강아지 이름", { exact: true }).fill("보리");
    await page.getByRole("button", { name: "인사말 만들어 보기" }).click();
    await expect(experiment.getByText("내 이름은 보리!", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "출력", exact: true }).check();
    await reset.click();
    await expect(page.getByLabel("강아지 이름", { exact: true })).toHaveValue("초코");
    await expect(experiment.getByText("말풍선이 기다리고 있어요", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "출력", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/A.*B.*계산 결과/);
    await page.getByLabel("변수 A", { exact: true }).fill("-2");
    await page.getByLabel("변수 B", { exact: true }).fill("3");
    await expect(experiment.getByText("-6", { exact: true })).toBeVisible();
    await reset.click();
    await expect(page.getByLabel("변수 A", { exact: true })).toHaveValue("6");
    await expect(page.getByLabel("변수 B", { exact: true })).toHaveValue("4");
    await expect(experiment.getByText("24", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/방향키.*좌표/);
    const stage = page.getByRole("group", { name: "방향키 실험 무대" });
    await stage.focus(); await stage.press("ArrowRight");
    await expect(stage).toContainText("x 10 · y 0");
    await reset.click();
    await expect(stage).toContainText("x 0 · y 0");
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(await observation.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(width > 600 ? 18 : 16);
      expect(await stage.locator("span").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      await page.screenshot({ path: info.outputPath(`programming-concept-${width}.png`), fullPage: true });
    }
    expect((await stored(page)).conceptSolved).toEqual(["pc0"]);
    expect(errors).toEqual([]);
  });
});
