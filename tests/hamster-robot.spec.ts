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

test("로봇 수업은 공개 목록에 있고 미션 두 개는 블록 순서와 초를 확인한다", () => {
  expect(RELEASED_LESSONS.some((lesson) => lesson.id === id)).toBe(true);
  expect(missionsFor(id).map((mission) => mission.id)).toEqual(["robot-go", "robot-signal"]);
  const go = (threads: EntryNode[][]) => checkProgrammingMission("robot-go", project("robot-go", threads)).passed;
  expect(go([[start, forward(), backward()]])).toBe(true);
  expect(go([[start, forward("2"), backward("2")]])).toBe(true);
  expect(go([[start, forward()]]), "돌아오지 않음").toBe(false);
  expect(go([[start, backward(), forward()]]), "순서가 반대").toBe(false);
  expect(go([[start, forward("1"), backward("2")]]), "시간이 다름").toBe(false);
  expect(go([[forward(), backward()]]), "시작 블록 없음").toBe(false);
  const signal = (threads: EntryNode[][]) => checkProgrammingMission("robot-signal", project("robot-signal", threads)).passed;
  expect(signal([[start, led, forward(), beep, off]])).toBe(true);
  expect(signal([[start, led, beep, forward(), off]]), "소리가 먼저").toBe(false);
  expect(signal([[start, led, forward(), beep]]), "LED를 끄지 않음").toBe(false);
});

test("로봇 작업실은 연결 버튼과 로봇 블록을 보여 주고, 로봇 없이도 검증·제출할 수 있다", async ({ page }) => {
  const frame = await open(page, id, "robot-go", project("robot-go", [[start, forward(), backward()]]));
  await expect(page.locator("iframe")).toHaveAttribute("allow", "serial");
  expect(await frame.evaluate(serialAccess)).toBe("ports:0");

  const editor = page.frameLocator("iframe");
  await editor.locator("#entryCategoryarduino").click();
  const palette = editor.locator("#entryWorkspaceBlockMenu");
  await expect(palette).toContainText("햄스터S 연결하기");
  await expect(palette).toContainText("앞으로");
  await expect(palette).not.toContainText("하드웨어를 찾을 수 없습니다");
  await expect(editor.locator("#entryWorkspaceBoard g.block").filter({ hasText: "뒤로" }).first()).toBeVisible();

  await entryStart(page).click();
  await expect(page.getByRole("status").filter({ hasText: "로봇이 코드대로 움직였는지" })).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("button", { name: "이 작품 제출 완료", exact: true })).toBeVisible();
  const saved = (await db.collection("csWork").doc(`student-20101__${id}`).get()).data()!;
  expect(JSON.stringify(saved)).toContain("hamsterlite_move_backward_for_secs");
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
