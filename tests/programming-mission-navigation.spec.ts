import { expect, test, type Page } from "@playwright/test";
import { buildProgrammingProject, programmingProjectMatches, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { DocumentData } from "firebase-admin/firestore";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent } from "./emulator";

const id = "programming-13", endpoint = `/api/classroom/work/${id}`;
const workRef = db.doc(`csWork/student-20101__${id}`), classRef = db.doc("csClasses/2-1");
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (value: number) => node("number", String(value));
const moveProject = buildProgrammingProject([[node("when_run_button_click", null), node("move_direction", number(10), null)]]);
const averageProject = buildProgrammingProject([[
  node("when_run_button_click", null),
  node("ask_and_wait", node("text", "첫 수는?"), null), node("set_variable", "cs-A", node("get_canvas_input_value", null), null),
  node("ask_and_wait", node("text", "둘째 수는?"), null), node("set_variable", "cs-B", node("get_canvas_input_value", null), null),
  node("dialog_time", node("calc_basic", node("calc_basic", node("get_variable", "cs-A"), "PLUS", node("get_variable", "cs-B")), "DIVIDE", number(2)), number(0.2), "speak", null),
]]);
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

async function prepare(page: Page, mission = "move", submitted = false) {
  const project = mission === "average" ? averageProject : moveProject;
  const before: Work = await (await page.request.get(endpoint)).json();
  let response = await page.request.post(endpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } });
  expect(response.status()).toBe(200);
  if (submitted) {
    for (const type of ["validate-practice", "submit-practice"]) {
      const work: Work = await response.json();
      response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type, missionId: mission } } });
      expect(response.status()).toBe(200);
    }
  }
  await page.goto(`/classroom/${id}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
}

async function validate(page: Page) {
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toBeFocused();
  await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toBeEnabled();
}

test("미션 제출 응답 뒤 다음 버튼으로 초점·강조를 옮기고 앞뒤로 저장한 작품을 유지한다", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1920, height: 900 });
  await prepare(page);
  await validate(page);
  let started!: () => void, release!: () => void;
  const pending = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}/action`, async route => { const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); }, { times: 1 });
  const next = page.getByRole("button", { name: "다음 미션", exact: true });
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await pending;
  try {
    await expect(next).toBeDisabled();
    await expect(page.getByRole("button", { name: "이전 미션", exact: true })).toBeDisabled();
    await expect(next).not.toBeFocused();
    await expect(page.getByRole("navigation", { name: "미션 앞뒤 이동", exact: true })).toHaveAttribute("data-submitted", "false");
  } finally { release(); }
  await expect(next).toBeFocused();
  await expect(next).toHaveAccessibleDescription(/제출 완료/);
  await expect(page.getByRole("tab", { name: "실습 25%", exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "미션 앞뒤 이동", exact: true });
  await expect(navigation).toHaveAttribute("data-submitted", "true");
  const positions = await navigation.evaluate(element => {
    const buttons = Array.from(element.querySelectorAll("button")).map(button => button.getBoundingClientRect());
    return buttons.map(({ x, y, width, height }) => ({ x, y, width, height }));
  });
  expect(positions[0].height).toBeGreaterThanOrEqual(48);
  expect(positions[0].width).toBe(positions[1].width);
  expect(positions[0].y).toBe(positions[1].y);
  await page.screenshot({ path: info.outputPath("submitted-next-mission.png") });
  await next.click();
  await expect(page.locator("#programming-mission-title")).toHaveText("방향키로 움직임 개선");
  await expect(page.locator("#programming-mission-title")).toBeFocused();
  await expect(page.locator("iframe")).toHaveAttribute("src", /mission=keys/);
  await expect(page.getByRole("button", { name: "이전 미션", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "이전 미션", exact: true }).click();
  await expect(page.locator("#programming-mission-title")).toHaveText("시작 버튼으로 움직이기");
  await expect(page.locator("#programming-mission-title")).toBeFocused();
  const work: Work = await (await page.request.get(endpoint)).json();
  expect(programmingProjectMatches(work.draft.programming!.projects.move, work.missions!.move.submission!.entryProject)).toBe(true);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(next).toBeEnabled();
  }
});

test("제출 응답의 최신 단계가 달라지면 사라진 다음 버튼 대신 현재 단계로 초점을 복구한다", async ({ page }) => {
  await prepare(page);
  await validate(page);
  await page.route(`**${endpoint}/action`, async route => {
    const response = await route.fetch(), submitted = await response.json() as Work;
    const shifted = await page.request.post(endpoint, { headers, data: { revision: submitted.revision, draft: { ...submitted.draft, stage: "concept", programming: { ...submitted.draft.programming!, mission: "average", projects: { ...submitted.draft.programming!.projects, average: averageProject } } } } });
    expect(shifted.status()).toBe(200);
    await route.fulfill({ response, json: await shifted.json() });
  }, { times: 1 });
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.locator("#stage-heading-concept")).toBeFocused();
  await expect(page.getByRole("tab", { name: /^개념/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#programming-next-mission")).toHaveCount(0);
});

test("이전 제출 복원과 자동 저장은 초점을 빼앗지 않고 작품 수정 시 다음 버튼 강조를 해제한다", async ({ page }) => {
  await prepare(page, "move", true);
  const navigation = page.getByRole("navigation", { name: "미션 앞뒤 이동", exact: true });
  const next = page.getByRole("button", { name: "다음 미션", exact: true });
  await expect(navigation).toHaveAttribute("data-submitted", "true");
  await expect(next).not.toBeFocused();
  const reflection = page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?");
  await reflection.fill("앞뒤로 작품을 살펴봤어요.");
  await expect.poll(async () => (await page.request.get(endpoint)).json().then((work: Work) => work.draft.programming!.reflection)).toBe("앞뒤로 작품을 살펴봤어요.");
  await expect(reflection).toBeFocused();
  const frame = page.frameLocator("iframe");
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true }).first().locator("..").click();
  const input = frame.locator("input.entry-widget-input-field:visible");
  await input.fill("11"); await input.press("Enter");
  await expect(navigation).toHaveAttribute("data-submitted", "false");
  await expect(next).not.toBeFocused();
  await expect(page.getByRole("group", { name: "작품 저장·검증·제출 상태", exact: true })).toContainText("이전 제출 유지 · 수정 중");
});

for (const lost of [false, true]) {
  test(`제출 ${lost ? "응답 유실을 확인 조회로 복구한" : "거부 뒤 다시 성공한"} 경우에만 다음 미션을 강조한다`, async ({ page }) => {
    await prepare(page);
    await validate(page);
    let posts = 0;
    await page.route(`**${endpoint}/action`, async route => {
      posts++;
      if (posts > 1) return route.continue();
      if (lost) { await route.fetch(); await route.abort("failed"); }
      else await route.fulfill({ status: 403, json: { code: "ACTION_DENIED", message: "합성 제출 거부" } });
    });
    const next = page.getByRole("button", { name: "다음 미션", exact: true });
    await page.getByRole("button", { name: "작품 제출", exact: true }).click();
    await expect(page.locator("#work-action-error")).toBeFocused();
    await expect(next).not.toBeFocused();
    await expect(page.getByRole("navigation", { name: "미션 앞뒤 이동", exact: true })).toHaveAttribute("data-submitted", "false");
    if (lost) {
      await expect(next).toBeDisabled();
      await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    } else await page.getByRole("button", { name: "작품 제출", exact: true }).click();
    await expect(next).toBeFocused();
    await expect(page.getByRole("navigation", { name: "미션 앞뒤 이동", exact: true })).toHaveAttribute("data-submitted", "true");
    expect(posts).toBe(lost ? 1 : 2);
  });
}

test("마지막 선택 미션 제출은 완료 안내에 초점을 두고 이전 미션으로 돌아갈 수 있다", async ({ page }) => {
  await prepare(page, "average");
  await validate(page);
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.locator("#programming-mission-complete")).toBeFocused();
  await expect(page.locator("#programming-mission-complete")).toContainText("이 미션의 작품을 제출했어요");
  await expect(page.getByRole("button", { name: "다음 미션", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "이전 미션", exact: true }).click();
  await expect(page.locator("#programming-mission-title")).toHaveText("방향키로 움직임 개선");
  await expect(page.locator("#programming-mission-title")).toBeFocused();
});
