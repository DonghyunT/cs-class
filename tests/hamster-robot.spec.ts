import { expect, test, type Page } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject, missionStarter, missionsFor, parseProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import { checkProgrammingMission } from "../src/lib/server/programming-grader";
import type { Work } from "../src/lib/classroom/types";
import { db, entryReset, entryStart, headers, readyStudent } from "./emulator";

const id = "hamster-robot";
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const secs = (type: string, value: string) => node(type, node("text", value), null);
const start = node("when_run_button_click", null);
const forward = (value = "1") => secs("hamsterlite_move_forward_for_secs", value), backward = (value = "1") => secs("hamsterlite_move_backward_for_secs", value);
const led = node("hamsterlite_set_led_to", "BOTH", "2", null), beep = node("hamsterlite_beep", null), off = node("hamsterlite_clear_led", "BOTH", null);
const hand = node("hamsterlite_hand_found"), notHand = node("boolean_not", null, hand, null);
const forever = (inner: EntryNode[]): EntryNode => ({ ...node("repeat_inf", null, null), statements: [inner] });
const ifElse = (cond: EntryNode, yes: EntryNode[], no: EntryNode[]): EntryNode => ({ ...node("if_else", cond, null, null), statements: [yes, no] });
const _if = (cond: EntryNode, yes: EntryNode[]): EntryNode => ({ ...node("_if", cond, null), statements: [yes] });

function project(mission: string, threads: EntryNode[][]) {
  const parsed = parseProgrammingProject(missionStarter(mission))!;
  return buildProgrammingProject(undefined, parsed.added.map((object) => ({ ...object, threads })), -1);
}

async function open(page: Page, lesson: string, mission: string, source = missionStarter(mission)) {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${lesson}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  const url = `/api/classroom/work/${lesson}`;
  const work: Work = await (await page.request.get(url)).json();
  expect((await page.request.post(url, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: source }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!;
}

const serialAccess = () => (navigator as Navigator & { serial: { getPorts(): Promise<unknown[]> } }).serial.getPorts().then((ports) => `ports:${ports.length}`, (error: Error) => error.name);

test("로봇 수업은 공개 목록에 있고 미션 세 개는 블록 순서와 초를 확인한다", () => {
  expect(RELEASED_LESSONS.some((lesson) => lesson.id === id)).toBe(true);
  expect(missionsFor(id).map((mission) => mission.id)).toEqual(["robot-go", "robot-signal", "robot-sensor"]);
  const go = (threads: EntryNode[][]) => checkProgrammingMission("robot-go", project("robot-go", threads)).passed;
  expect(go([[start, forward(), backward()]])).toBe(true);
  expect(go([[start, forward("2"), backward("2")]])).toBe(true);
  expect(go([[start, forward("1"), forward("1"), backward("2")]])).toBe(true);
  expect(go([[start, forward()]]), "돌아오지 않음").toBe(false);
  expect(go([[start, backward(), forward()]]), "순서가 반대").toBe(false);
  expect(go([[start, forward("1"), backward("2")]]), "시간이 다름").toBe(false);
  expect(go([[start, forward("1"), backward("1"), forward("5")]]), "뒤로 온 뒤 다시 앞으로 감").toBe(false);
  expect(go([[forward(), backward()]]), "시작 블록 없음").toBe(false);
  const signal = (threads: EntryNode[][]) => checkProgrammingMission("robot-signal", project("robot-signal", threads)).passed;
  expect(signal([[start, led, forward(), beep, off]])).toBe(true);
  expect(signal([[start, led, beep, forward(), off]]), "소리가 먼저").toBe(false);
  expect(signal([[start, led, forward(), beep]]), "LED를 끄지 않음").toBe(false);
  expect(signal([[start, led, forward("0"), beep, off]]), "0초라 움직이지 않음").toBe(false);
  expect(signal([[start, led, forward("-1"), beep, off]]), "음수 초는 뒤로 감").toBe(false);
  const sensor = (threads: EntryNode[][]) => checkProgrammingMission("robot-sensor", project("robot-sensor", threads)).passed;
  expect(sensor([[start, forever([ifElse(hand, [led, beep], [off])])]])).toBe(true);
  expect(sensor([[start, forever([ifElse(hand, [beep, led], [off])])]])).toBe(true);
  expect(sensor([[start, forever([ifElse(notHand, [off], [led, beep])])]])).toBe(true);
  expect(sensor([[start, forever([_if(hand, [led, beep]), _if(notHand, [off])])]])).toBe(true);
  expect(sensor([[start, ifElse(hand, [led, beep], [off])]]), "계속 반복 없음").toBe(false);
  expect(sensor([[start, forever([ifElse(node("True", null), [led, beep], [off])])]]), "손 찾음 조건 없음").toBe(false);
  expect(sensor([[start, forever([ifElse(hand, [led], [off])])]]), "소리 없음").toBe(false);
  expect(sensor([[start, forever([ifElse(hand, [led, beep], [])])]]), "LED 끄기 없음").toBe(false);
  expect(sensor([[start, forever([ifElse(hand, [off], [led, beep])])]]), "참/거짓 뒤바뀜").toBe(false);
  expect(sensor([[forever([ifElse(hand, [led, beep], [off])])]]), "시작 블록 없음").toBe(false);
});

test("다섯 개 개념의 시각 자료가 모두 그려지고 그림 파일이 깨지지 않으며 가로로 넘치지 않는다", async ({ page }) => {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);
  const nav = page.getByRole("navigation", { name: "개념 목록" });
  const buttons = nav.getByRole("button");
  await expect(buttons).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await buttons.nth(i).click();
    const figure = page.locator('figure[role="img"]');
    await expect(figure).toBeVisible();
    for (const img of await figure.locator("img").all()) {
      await expect(img).toBeVisible();
      const ok = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
      expect(ok, `concept ${i} image`).toBe(true);
    }
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `concept ${i} width ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test("로봇 작업실은 연결 버튼과 로봇 블록을 보여 주고, 로봇 없이도 검증·제출할 수 있다", async ({ page }) => {
  const frame = await open(page, id, "robot-go", project("robot-go", [[start, forward(), backward()]]));
  await expect(page.locator("iframe")).toHaveAttribute("allow", "serial");
  expect(await frame.evaluate(serialAccess)).toBe("ports:0");

  const editor = page.frameLocator("iframe");
  await editor.locator("#entryCategoryarduino").click();
  const palette = editor.locator("#entryWorkspaceBlockMenu");
  await expect(palette).toContainText("햄스터S 연결하기");
  await expect(palette).toContainText("손 찾음?");
  await expect(palette).toContainText("앞으로");
  await expect(palette).not.toContainText("하드웨어를 찾을 수 없습니다");
  await expect(editor.locator("#entryWorkspaceBoard g.block").filter({ hasText: "뒤로" }).first()).toBeVisible();

  // A run without a connection still finishes, so the page says why the robot stayed still.
  await entryStart(page).click();
  await expect(page.getByRole("status").filter({ hasText: "로봇이 연결되지 않았어요" })).toBeVisible({ timeout: 20000 });
  await entryReset(page).click();
  await expect(page.getByRole("status").filter({ hasText: /^무대를 처음 위치로 돌렸어요\.$/ })).toBeVisible();
  // No robot here, so the result workspace.js reports after a connected run is sent by hand.
  await frame.evaluate('send("result", { x: 0, y: 0, speech: "", reason: "finished", robotConnected: true })');
  await expect(page.getByRole("status").filter({ hasText: "실행을 마쳤어요. 로봇이 코드대로 움직였는지" })).toBeVisible();

  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("button", { name: "이 작품 제출 완료", exact: true })).toBeVisible();
  const saved = (await db.collection("csWork").doc(`student-20101__${id}`).get()).data()!;
  expect(JSON.stringify(saved)).toContain("hamsterlite_move_backward_for_secs");
});

test("손 감지 경보기 미션은 실행 중에도 로봇 미연결을 알리고 정지하면 확인 안내를 띄운다", async ({ page }) => {
  const frame = await open(page, id, "robot-sensor", project("robot-sensor", [[start, forever([ifElse(hand, [led, beep], [off])])]]));
  await entryStart(page).click();
  await expect(page.getByRole("status").filter({ hasText: "실행 중이에요. 로봇이 연결되지 않았어요." })).toBeVisible({ timeout: 20000 });
  await page.frameLocator("iframe").getByRole("button", { name: "정지하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "실행을 멈췄어요. 로봇이 연결되지 않았어요." })).toBeVisible({ timeout: 20000 });
  await frame.evaluate('send("result", { x: 0, y: 0, speech: "", reason: "stopped", robotConnected: true })');
  await expect(page.getByRole("status").filter({ hasText: "실행을 멈췄어요. 로봇이 코드대로 움직였는지" })).toBeVisible();
});

test("작업실이 열리자마자 끌어온 블록도 보드 안에 놓인다", async ({ page }) => {
  const frame = await open(page, id, "robot-go");
  const editor = page.frameLocator("iframe");
  const block = (await editor.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "시작하기 버튼" }).first().boundingBox())!;
  const board = (await editor.locator("#entryWorkspaceBoard").boundingBox())!;
  await page.mouse.move(block.x + 14, block.y + block.height / 2);
  await page.mouse.down();
  await page.mouse.move(board.x + board.width / 2, board.y + board.height / 2, { steps: 15 });
  await page.mouse.up();
  const x = () => frame.evaluate(() => (window as unknown as { Entry: { getMainWS(): { board: { code: { getThreads(): { getFirstBlock(): { x: number } }[] } } } } }).Entry.getMainWS().board.code.getThreads()[0]?.getFirstBlock().x ?? null);
  await expect.poll(x).not.toBeNull();
  expect(await x()).toBeGreaterThan(-1000);
});

test("로봇 수업이 아닌 작업실은 시리얼 포트를 쓸 수 없다", async ({ page }) => {
  const frame = await open(page, "conditionals", "average");
  await expect(page.locator("iframe")).not.toHaveAttribute("allow", /serial/);
  expect(await frame.evaluate(serialAccess)).toBe("SecurityError");
});
