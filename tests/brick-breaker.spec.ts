import { expect, test, type Page } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import {
  buildProgrammingProject,
  missionStarter,
  missionsFor,
  parseProgrammingProject,
  type EntryNode
} from "../src/lib/classroom/programming-entry";
import { checkProgrammingMission } from "../src/lib/server/programming-grader";
import { BRICK_ASSEMBLY } from "../src/lib/server/brick-assembly";
import { blockText } from "../src/lib/classroom/assemble";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, readyTeacher, entryReset, entryStart, entryStop } from "./emulator";

const id = "brick-breaker", endpoint = `/api/classroom/work/${id}`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string) => node("number", v);
const text = (v: string) => node("text", v);
const start = () => node("when_run_button_click", null);
const forever = (inner: EntryNode[]): EntryNode => ({ ...node("repeat_inf", null, null), statements: [inner] });
const ifNode = (cond: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("_if", cond, null), statements: [inner] });

function onBrickStarter(mission: string, byObject: Record<string, EntryNode[][]>) {
  const parsed = parseProgrammingProject(missionStarter(mission))!;
  const added = parsed.added.map((o) => byObject[o.id] ? { ...o, threads: byObject[o.id] } : o);
  return buildProgrammingProject(undefined, added, -1, false, parsed.variables, parsed.functions);
}

const paddleThread: EntryNode[] = [start(), forever([node("locate_x", node("coordinate_mouse", null, "x", null), null)])];
const ballThread: EntryNode[] = [
  node("when_object_click", null),
  forever([
    node("move_direction", number("4"), null),
    node("bounce_wall", null),
    ifNode(node("reach_something", null, "paddle", null), [node("func_pbounce", null)]),
    ifNode(node("reach_something", null, "wall_down", null), [node("stop_object", "all", null)])
  ])
];
const brickHitThread: EntryNode[] = [
  start(),
  forever([
    ifNode(node("reach_something", null, "ball", null), [
      node("change_variable", "score", number("1"), null),
      node("hide", null)
    ])
  ])
];
const youWinThread: EntryNode[] = [
  start(),
  forever([
    ifNode(node("boolean_basic_operator", node("get_variable", "score"), "EQUAL", number("3")), [
      node("show", null),
      node("stop_object", "all", null)
    ])
  ])
];
const ballBrickBounceThread: EntryNode[] = [
  start(),
  forever([
    node("move_direction", number("10"), null),
    node("bounce_wall", null),
    ifNode(node("reach_something", null, "paddle", null), [node("direction_relative", node("angle", "90"), null)]),
    ifNode(node("reach_something", null, "brick1", null), [node("direction_relative", node("angle", "180"), null)]),
    ifNode(node("reach_something", null, "brick2", null), [node("direction_relative", node("angle", "180"), null)]),
    ifNode(node("reach_something", null, "brick3", null), [node("direction_relative", node("angle", "180"), null)]),
    ifNode(node("reach_something", null, "wall_down", null), [node("stop_object", "all", null)])
  ])
];

const solutions: Record<string, string> = {
  paddle: onBrickStarter("paddle", { paddle: [paddleThread] }),
  ball: onBrickStarter("ball", { paddle: [paddleThread], ball: [ballThread] }),
  brick: onBrickStarter("brick", { youwin: [youWinThread], ball: [ballThread], brick1: [brickHitThread] }),
  "brick-bounce": onBrickStarter("brick-bounce", { ball: [ballBrickBounceThread] })
};

async function open(page: Page, mission: string, project = missionStarter(mission)) {
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

const OBJECT_NAMES = ["You win!", "공", "막대", "벽돌1", "벽돌2", "벽돌3"];
// Assembles one concept through the real buttons and checks it.
async function solveConcept(page: Page, conceptId: string) {
  const assemble = RELEASED_LESSONS.find((lesson) => lesson.id === id)!.concepts.find((concept) => concept.id === conceptId)!.question.assemble!;
  const tray = page.getByRole("group", { name: "블록 모음" });
  for (const blockId of BRICK_ASSEMBLY[conceptId].split(",")) await tray.getByRole("button", { name: blockText(assemble.blocks.find((block) => block.id === blockId)!.label), exact: true }).click();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator(`#concept-feedback-${conceptId}`)).toContainText("맞았어요");
}

const workspaceFrame = (page: Page) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!;

test("벽돌 깨기 수업은 공개되어 미션 네 개(필수 셋·도전 하나)와 여섯 오브젝트·점수 변수를 제공한다", () => {
  expect(RELEASED_LESSONS.some((lesson) => lesson.id === id)).toBe(true);
  expect(missionsFor(id).map((mission) => [mission.id, !!mission.optional])).toEqual([
    ["paddle", false],
    ["ball", false],
    ["brick", false],
    ["brick-bounce", true]
  ]);
  for (const mission of ["paddle", "ball", "brick", "brick-bounce"]) {
    const parsed = parseProgrammingProject(missionStarter(mission))!;
    expect([...parsed.added.map((o) => o.name)].sort()).toEqual(OBJECT_NAMES);
    expect(parsed.variables.some((v) => v.id === "score" && v.name === "점수" && v.value === 0)).toBe(true);
  }
});

test("벽돌 깨기 채점기는 흔한 오개념(일회성 이동·고정 좌표·튕기기 누락·비교 연산자·잘못된 멈추기 대상)을 구분하고 올바른 대안 풀이를 허용한다", () => {
  // 1. paddle
  expect(checkProgrammingMission("paddle", missionStarter("paddle")).passed).toBe(false);
  const oncePaddle = onBrickStarter("paddle", { paddle: [[start(), node("locate_x", node("coordinate_mouse", null, "x", null), null)]] });
  expect(checkProgrammingMission("paddle", oncePaddle)).toMatchObject({
    passed: false,
    message: expect.stringContaining("계속 반복하기")
  });
  const fixedPaddle = onBrickStarter("paddle", { paddle: [[start(), forever([node("locate_x", number("100"), null)])]] });
  expect(checkProgrammingMission("paddle", fixedPaddle)).toMatchObject({
    passed: false,
    message: expect.stringContaining("마우스 x 좌푯값")
  });
  const moveXPaddle = onBrickStarter("paddle", { paddle: [[start(), forever([node("move_x", node("coordinate_mouse", null, "x", null), null)])]] });
  expect(checkProgrammingMission("paddle", moveXPaddle)).toMatchObject({
    passed: false,
    message: expect.stringContaining("x: ( ) 위치로 이동하기")
  });
  expect(checkProgrammingMission("paddle", solutions.paddle).passed).toBe(true);

  // 2. ball
  expect(checkProgrammingMission("ball", missionStarter("ball")).passed).toBe(false);
  const noBounceWall = onBrickStarter("ball", {
    ball: [[
      start(),
      forever([
        node("move_direction", number("10"), null),
        ifNode(node("reach_something", null, "paddle", null), [node("direction_relative", node("angle", "90"), null)]),
        ifNode(node("reach_something", null, "wall_down", null), [node("stop_object", "all", null)])
      ])
    ]]
  });
  expect(checkProgrammingMission("ball", noBounceWall)).toMatchObject({
    passed: false,
    message: expect.stringContaining("화면 끝 튕기기")
  });
  const noWallDownStop = onBrickStarter("ball", {
    ball: [[
      start(),
      forever([
        node("move_direction", number("10"), null),
        node("bounce_wall", null),
        ifNode(node("reach_something", null, "paddle", null), [node("direction_relative", node("angle", "90"), null)])
      ])
    ]]
  });
  expect(checkProgrammingMission("ball", noWallDownStop)).toMatchObject({
    passed: false,
    message: expect.stringContaining("아래쪽 벽에 닿았는가?")
  });
  // `stop_object("otherThread")` does not stop the ball itself and must fail
  const wrongStopBall = onBrickStarter("ball", {
    ball: [[
      start(),
      forever([
        node("move_direction", number("10"), null),
        node("bounce_wall", null),
        ifNode(node("reach_something", null, "paddle", null), [node("direction_relative", node("angle", "90"), null)]),
        ifNode(node("reach_something", null, "wall_down", null), [node("stop_object", "otherThread", null)])
      ])
    ]]
  });
  expect(checkProgrammingMission("ball", wrongStopBall).passed).toBe(false);
  expect(checkProgrammingMission("ball", solutions.ball).passed).toBe(true);

  // 3. brick
  expect(checkProgrammingMission("brick", missionStarter("brick"))).toMatchObject({
    passed: false,
    message: expect.stringContaining("벽돌1")
  });
  const noHideBrick = onBrickStarter("brick", {
    brick1: [[
      start(),
      forever([
        ifNode(node("reach_something", null, "ball", null), [
          node("change_variable", "score", number("1"), null)
        ]),
        ifNode(node("boolean_basic_operator", node("get_variable", "score"), "EQUAL", number("3")), [
          node("dialog", text("성공!"), "speak", null),
          node("stop_object", "all", null)
        ])
      ])
    ]]
  });
  expect(checkProgrammingMission("brick", noHideBrick)).toMatchObject({
    passed: false,
    message: expect.stringContaining("숨기는지")
  });
  const greaterThanThreeBrick = onBrickStarter("brick", {
    brick1: [[
      start(),
      forever([
        ifNode(node("reach_something", null, "ball", null), [
          node("change_variable", "score", number("1"), null),
          node("hide", null)
        ]),
        ifNode(node("boolean_basic_operator", node("get_variable", "score"), "GREATER", number("3")), [
          node("dialog", text("성공!"), "speak", null),
          node("stop_object", "all", null)
        ])
      ])
    ]]
  });
  expect(checkProgrammingMission("brick", greaterThanThreeBrick)).toMatchObject({
    passed: false,
    message: expect.stringContaining("점수 값 = 3")
  });
  expect(checkProgrammingMission("brick", solutions.brick).passed).toBe(true);

  // 4. brick-bounce (including `direction_absolute` alternative solution)
  expect(checkProgrammingMission("brick-bounce", solutions.brick)).toMatchObject({
    passed: false,
    message: expect.stringContaining("벽돌1·벽돌2·벽돌3에 닿았을 때")
  });
  expect(checkProgrammingMission("brick-bounce", solutions["brick-bounce"]).passed).toBe(true);
  const absoluteBounceBall = onBrickStarter("brick-bounce", {
    ball: [[
      start(),
      forever([
        node("move_direction", number("10"), null),
        node("bounce_wall", null),
        ifNode(node("reach_something", null, "paddle", null), [node("direction_absolute", node("angle", "45"), null)]),
        ifNode(node("reach_something", null, "brick1", null), [node("direction_absolute", node("angle", "180"), null)]),
        ifNode(node("reach_something", null, "brick2", null), [node("direction_absolute", node("angle", "180"), null)]),
        ifNode(node("reach_something", null, "brick3", null), [node("direction_absolute", node("angle", "180"), null)]),
        ifNode(node("reach_something", null, "wall_down", null), [node("stop_object", "all", null)])
      ])
    ]]
  });
  expect(checkProgrammingMission("brick-bounce", absoluteBounceBall).passed).toBe(true);
});

test("개념 도식 네 개와 퀴즈 다섯 문항의 코드 장면이 오류 없이 표시된다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);

  for (let i = 0; i < 4; i++) {
    const figure = page.locator("figure").first();
    await expect(figure).toBeVisible();
    for (const svgText of await figure.locator("svg text").all()) {
      expect(await svgText.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const next = page.getByRole("button", { name: "다음 개념" });
    if (i < 3) { await expect(next).toBeDisabled(); await solveConcept(page, `bc${i}`); await next.click(); }
  }

  await page.getByRole("tab", { name: /^퀴즈/ }).click();
  const scene = page.getByRole("group", { name: "읽어 볼 코드" });
  for (let i = 0; i < 5; i++) {
    await expect(scene.locator("img")).toBeVisible();
    await expect.poll(() => scene.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const next = page.getByRole("button", { name: "다음 문제" });
    if (!await next.count()) break;
    await next.click();
  }
  expect(errors).toEqual([]);
});

test("개념 그림은 좁은 화면(375px)에서도 페이지를 넘치게 하지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);
  for (let i = 0; i < 4; i++) {
    await expect(page.locator("figure").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `concept ${i}`).toBeLessThanOrEqual(1);
    if (i < 3) { await solveConcept(page, `bc${i}`); await page.getByRole("button", { name: "다음 개념" }).click(); }
  }
});

test("개념 조립은 틀리면 틀린 칸을 알려 주고, 맞혀야 다음 개념이 열린다", async ({ page }) => {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);
  const assemble = RELEASED_LESSONS.find((lesson) => lesson.id === id)!.concepts[0].question.assemble!;
  const tray = page.getByRole("group", { name: "블록 모음" }), check = page.getByRole("button", { name: "정답 확인", exact: true });
  await expect(check).toBeDisabled();
  for (const block of assemble.blocks.slice(0, assemble.slots.length)) await tray.getByRole("button", { name: blockText(block.label), exact: true }).click();
  await check.click();
  await expect(page.locator("#concept-feedback-bc0")).toContainText("1번 칸부터");
  await expect(page.getByRole("button", { name: "다음 개념" })).toBeDisabled();
  await page.getByRole("button", { name: "모두 빼기" }).click();
  await solveConcept(page, "bc0");
  await expect(page.getByRole("button", { name: "다음 개념" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: /변수로 게임 점수/ })).toContainText("확인 완료");
});

test("개념 체험은 답이 되는 블록을 보이지 않고, 움직이면 값이 바뀌며, 저장하지 않고 새로 고치면 처음으로 돌아간다", async ({ page }) => {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  await page.goto(`/classroom/${id}?from=dashboard`);
  const play = page.locator("figure").first(), saves: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/api/classroom/work/")) saves.push(request.url()); });
  const tile = (name: string) => play.locator("span", { hasText: name }).locator("b");
  await expect(page.locator("#concept-bc0").getByText("변수는 게임 중에 바뀌는 값", { exact: false })).toBeVisible();
  await expect(play.locator("[data-kind]")).toHaveCount(0);
  await expect(play.getByRole("button", { name: "벽돌 깨기" })).toBeDisabled();
  await play.getByRole("button", { name: "시작하기" }).click();
  await play.getByRole("button", { name: "벽돌 깨기" }).click();
  await play.getByRole("button", { name: "벽돌 깨기" }).click();
  await expect(tile("점수")).toHaveText("2");
  expect(saves).toEqual([]);
  await solveConcept(page, "bc0");
  await page.getByRole("button", { name: "다음 개념" }).click();
  saves.length = 0;

  const stage = play.getByRole("application");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25);
  await expect(tile("막대 x")).toHaveText("120");
  await expect(tile("마우스 y")).not.toHaveText("0");
  await expect(tile("막대 y")).toHaveText("-115");
  await stage.press("ArrowRight");
  await expect(tile("막대 x")).toHaveText("140");
  expect(saves).toEqual([]);
  await page.reload();
  await expect(page.locator("figure").first().locator("span", { hasText: "막대 x" }).locator("b")).toHaveText("0");
});

test("세 벽돌을 깨면 You win!과 점수가 정지하기 전까지 무대에 남는다", async ({ page }) => {
  await open(page, "brick", solutions.brick);
  const frame = workspaceFrame(page);
  const ending = () => frame.evaluate(() => {
    const E = (window as unknown as { Entry: Record<string, any> }).Entry; // eslint-disable-line @typescript-eslint/no-explicit-any
    const win = E.container.getAllObjects().find((o: { id: string }) => o.id === "youwin").entity;
    return { state: E.engine.state, score: Number(E.variableContainer.variables_.find((v: { getName: () => string }) => v.getName() === "점수").getValue()), shown: win.getVisible() };
  });
  await entryStart(page).click();
  // The ball is moved onto each brick: this test is about the ending, not about catching the ball.
  for (const brick of ["brick1", "brick2", "brick3"]) {
    await expect.poll(() => frame.evaluate((target) => {
      const objects = (window as unknown as { Entry: { container: { getAllObjects: () => { id: string; entity: { getX: () => number; getY: () => number; setX: (v: number) => void; setY: (v: number) => void; getVisible: () => boolean } }[] } } }).Entry.container.getAllObjects();
      const item = objects.find((o) => o.id === target)!.entity, ball = objects.find((o) => o.id === "ball")!.entity;
      if (!item.getVisible()) return true;
      ball.setX(item.getX()); ball.setY(item.getY());
      return false;
    }, brick)).toBe(true);
  }
  await expect.poll(ending).toMatchObject({ score: 3, shown: true });
  await page.waitForTimeout(1000);
  expect(await ending()).toMatchObject({ state: "run", score: 3, shown: true });
  await expect(page.getByText("결과를 다 봤으면").first()).toBeVisible();
  await entryStop(page).click();
  await expect.poll(async () => (await ending()).score).toBe(0);
});

for (const mission of Object.keys(solutions)) {
  test(`${mission}: 시작 오브젝트 여섯 개와 점수 변수는 잠겨 있고, 완성 작품은 검증·제출·새로고침 후에도 유지된다`, async ({ page }) => {
    await open(page, mission, solutions[mission]);
    const workspaceInfo = await workspaceFrame(page).evaluate(() => {
      const entry = (window as unknown as {
        Entry: {
          container: { getAllObjects: () => { id: string; name: string }[] };
          variableContainer: { variables_: { getName: () => string }[] };
        };
      }).Entry;
      return {
        objects: entry.container.getAllObjects().map((o) => o.name).sort(),
        variables: entry.variableContainer.variables_.map((v) => v.getName())
      };
    });
    expect(workspaceInfo.objects).toEqual(OBJECT_NAMES);
    expect(workspaceInfo.variables).toContain("점수");

    await page.getByRole("button", { name: "조건 검증", exact: true }).click();
    await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
    await page.getByRole("button", { name: "작품 제출", exact: true }).click();
    await expect.poll(async () => !!((await (await page.request.get(endpoint)).json()) as Work).missions?.[mission]?.submission).toBe(true);

    await page.reload();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    await expect.poll(() =>
      workspaceFrame(page).evaluate(() =>
        (window as unknown as { Entry: { container: { getAllObjects: () => { name: string }[] } } }).Entry.container
          .getAllObjects()
          .map((o) => o.name)
          .sort()
      )
    ).toEqual(OBJECT_NAMES);
  });
}

test("교사 작품 보기에서 벽돌 깨기 제출 작품의 오브젝트별 코드와 점수·숨기기 블록이 보인다", async ({ page }) => {
  const classRef = db.doc("csClasses/2-1"), workRef = db.doc(`csWork/student-20101__${id}`), original = (await classRef.get()).data()!;
  try {
    await readyStudent(page.request);
    await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    const current: Work = await (await page.request.get(endpoint)).json();
    current.draft.programming = { mission: "brick", projects: { brick: solutions.brick }, reflection: "" };
    let response = await page.request.post(endpoint, { headers, data: { revision: current.revision, draft: current.draft } });
    expect(response.status()).toBe(200);
    for (const type of ["validate-practice", "submit-practice"]) {
      const work: Work = await response.json();
      response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type, missionId: "brick" } } });
      expect(response.status()).toBe(200);
    }
    await readyTeacher(page.request);
    await page.goto(`/teacher/students?classId=2-1&lessonId=${id}`);
    await page.getByRole("button", { name: "20101 제출 작품 보기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "20101 학생의 제출 작품", exact: true });
    await expect(dialog.getByRole("heading", { name: "벽돌1", exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "막대", exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "공", exact: true })).toBeVisible();
    await expect(dialog.getByText("점수에 1만큼 더하기").first()).toBeVisible();
    await expect(dialog.getByText("모양 숨기기").first()).toBeVisible();
  } finally {
    await workRef.delete();
    await classRef.set(original);
  }
});
