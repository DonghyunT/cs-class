import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent, saveDraft } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";
import { missions } from "../src/lib/classroom/review/flowchart-data.mjs";

const lessonId = "review-flowchart", uid = "student-20101", workUrl = `/api/classroom/work/${lessonId}`;
const correct = { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" };
async function read(request: APIRequestContext) {
  const response = await request.get(workUrl); expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function prepare(page: Page, fields: Partial<FlowchartProject> = {}) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: [lessonId] });
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  const work = await read(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
  Object.assign(work.draft.reviewProject, fields);
  work.draft.stage = "practice";
  const response = await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(response.status()).toBe(200);
  await page.goto(`/classroom/${lessonId}?from=lessons`);
  await page.getByRole("tab", { name: /실습/ }).click();
  return work.draft.reviewProject;
}
const project = async (page: Page) => (await read(page.request)).draft.reviewProject as FlowchartProject;
const navigation = (page: Page) => page.getByRole("navigation", { name: "순서도 실습", exact: true });

test.describe("순서도 퍼즐·예시 공방 V1 누락 회귀", () => {
  let classBefore: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => { await page.goto("about:blank"); classBefore = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async ({ page }) => {
    await page.goto("about:blank");
    if (classBefore) await db.collection("csClasses").doc("2-1").set(classBefore);
    await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  });

  test("보관함 조각은 한 칸만 차지하고 이동·제거 뒤 복귀하며 재접속 초안은 보존한다", async ({ page }) => {
    await prepare(page);
    const palette = page.getByRole("region", { name: "순서도 기호 보관함", exact: true });
    await expect(palette.locator("[data-shape]")).toHaveCount(3);
    const order = await palette.locator("[data-shape]").evaluateAll(items => items.map(item => item.getAttribute("aria-label")));
    expect(order).not.toEqual(missions[0].palette.map(block => block.text));
    const water = palette.getByRole("button", { name: "물 500ml 냄비에 붓기", exact: true });
    const slot = page.getByRole("button", { name: "입출력 기호: 입출력 ▱ (물 500ml 붓기)", exact: true });
    await expect(slot).toBeVisible(); await water.click(); await slot.click(); await expect(water).toBeDisabled();
    await palette.getByText("목록으로 배치하기", { exact: true }).click();
    const target = palette.getByLabel("처리 ▭ (물 끓이기)", { exact: true });
    await target.selectOption("b-m1-1");
    await saveDraft(page);
    await expect.poll(async () => (await project(page)).placements["1"]).toEqual({ s2: "", s3: "b-m1-1" });
    await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "물 500ml 냄비에 붓기 기호 제거", exact: true }).click();
    await expect(water).toBeEnabled();
    await expect(page.getByRole("button", { name: "처리 기호: 처리 ▭ (물 끓이기)", exact: true })).toBeFocused();
    expect(await palette.locator("[data-shape]").evaluateAll(items => items.map(item => item.getAttribute("aria-label")))).toEqual(order);
    await target.selectOption("b-m1-2");
    await saveDraft(page);
    await expect.poll(async () => (await project(page)).placements["1"]).toEqual({ s2: "", s3: "b-m1-2" });
    await page.reload();
    await expect(page.getByRole("button", { name: "처리 기호: 가스레인지 켜서 물 끓이기", exact: true })).toBeVisible();
    expect((await project(page)).placements["1"]).toEqual({ s2: "", s3: "b-m1-2" });
  });

  test("이전 버전에서 중복 배치한 작품은 조회·재접속만으로 초기화하지 않는다", async ({ page }) => {
    const placements = { "1": { s2: "b-m1-1", s3: "b-m1-1", s4: "b-m1-3" } };
    await prepare(page, { placements });
    await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toHaveCount(2);
    await page.reload();
    await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toHaveCount(2);
    expect((await project(page)).placements).toEqual(placements);
  });

  test("앞 예시 카드를 다시 읽어도 완성한 기호와 자유 작품을 보존한다", async ({ page }) => {
    const original = await prepare(page, {
      mission: "guide", guideStep: 4, current: "내가 작성한 문제", goal: "완성", conditions: ["기록 보존"], core: ["내 변수"],
      nodes: [{ id: "own-start", shape: "terminal", text: "시작", x: 333, y: 77 }, { id: "own-end", shape: "terminal", text: "종료", x: 333, y: 377 }],
      edges: [{ from: "own-start", to: "own-end", label: "", fromPort: "right", toPort: "left" }],
      cards: [{ id: "own-card", type: "sequence", text: "내가 작성한 계획", yes: "", no: "" }],
    });
    const planner = page.getByRole("region", { name: "예시 자연어 기획서", exact: true });
    await planner.getByRole("button", { name: /1단계: 순차 구조/ }).click();
    await expect(page.getByLabel("실제 순서도 연결", { exact: true }).locator("[data-flow-node]")).toHaveCount(8);
    expect((await project(page)).guideStep).toBe(4);
    await expect(page.getByLabel("실제 순서도 연결", { exact: true }).locator('[data-flow-node="check"]')).toHaveAttribute("aria-label", "판단 기호: 7시 30분이거나 그 이전인가요?");
    await page.getByRole("button", { name: "나만의 백지로 이동", exact: true }).click();
    await expect(navigation(page).getByRole("button", { name: "🚀 5. 나만의 백지", exact: true })).toHaveAttribute("aria-pressed", "true");
    // 읽기 위치는 메모리에서만 바뀌고 기존 작품은 서버와 화면 모두 유지됩니다.
    expect((await project(page)).mission).toBe("guide");
    const saved = await project(page);
    expect(saved.nodes).toEqual(original.nodes); expect(saved.edges).toEqual(original.edges); expect(saved.cards).toEqual(original.cards);
    expect(saved.current).toBe(original.current);
    await page.reload(); await page.getByRole("button", { name: "나만의 백지로 이동", exact: true }).click(); await expect(page.getByRole("button", { name: "시작·종료 기호: 시작", exact: true })).toBeVisible();
    expect((await project(page)).nodes).toEqual(original.nodes);
  });

  test("라면 실행은 완성 결과와 순차 구조를 설명하고 기록 완료 후 다음 단계로 이동한다", async ({ page }) => {
    await prepare(page, { placements: { "1": correct } });
    const execution = page.getByRole("region", { name: "순서도 실행", exact: true });
    await expect(execution).toContainText("물 500ml");
    await execution.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await execution.getByRole("button", { name: "자동 실행", exact: true }).click();
    await expect(execution).toContainText("라면이 완성됐어요");
    await expect(execution).toContainText("순차 구조");
    await expect(execution.getByRole("button", { name: "다시 실행", exact: true })).toBeEnabled();
    await expect.poll(async () => !!(await read(page.request)).missions?.["1"]?.submission).toBe(true);
    await execution.getByRole("button", { name: "다음 미션: 선택 구조", exact: true }).click();
    await expect(navigation(page).getByRole("button", { name: "🎡 2. 선택 (놀이기구)", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await read(page.request)).missions?.["1"]?.submission).toBeTruthy();
  });

  test("고정 예시의 실행바는 캔버스 위에 있고 시간 선택은 실제 분기를 강조한다", async ({ page }) => {
    await page.setViewportSize({ width: 1544, height: 712 });
    await prepare(page, { mission: "guide", guideStep: 4 });
    const canvas = page.getByLabel("실제 순서도 연결", { exact: true });
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    const boxes = await Promise.all([toolbar.boundingBox(), canvas.boundingBox()]);
    expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(boxes[1]!.y);
    await toolbar.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await toolbar.getByRole("button", { name: "자동 실행", exact: true }).click();
    const yes = canvas.getByRole("button", { name: "07:20 · 예로 진행", exact: true });
    await expect(yes).toBeFocused(); await yes.click();
    await expect(canvas.locator('[data-flow-edge][data-active="true"][data-branch="예"]')).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "종료에 도달했어요!" })).toBeVisible();
    for (const width of [821, 820, 390]) {
      await page.setViewportSize({ width, height: 712 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(toolbar).toBeVisible();
    }
  });
});
