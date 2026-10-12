import { expect, test, type Page } from "@playwright/test";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const endpoint = "/api/classroom/work/review-flowchart";
const correct = {
  "1": { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" },
  "2": { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" },
  "3": { s2: "b-m3-in", s3: "b-m3-chk", s4_yes: "b-m3-yes", s4_no: "b-m3-no" },
};
let classBefore: FirebaseFirestore.DocumentData | undefined;
const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();
const execution = (page: Page) => page.getByRole("region", { name: "순서도 실행", exact: true });
async function prepare(page: Page, mission: "1" | "2" | "3" = "1", placements: FlowchartProject["placements"] = correct) {
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ currentLessonId: null, openedLessonIds: ["review-flowchart"] });
  await db.doc("csWork/student-20101__review-flowchart").delete();
  const work = await stored(page);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", reviewProject: { ...work.draft.reviewProject, mission, placements } } } })).status()).toBe(200);
  await page.goto("/classroom/review-flowchart?from=lessons");
  await execution(page).getByLabel("실행 속도", { exact: true }).selectOption("2");
}
async function start(page: Page) { await execution(page).getByRole("button", { name: "자동 실행", exact: true }).click(); }
test.beforeEach(async ({ page }) => { await page.goto("about:blank"); classBefore = (await db.doc("csClasses/2-1").get()).data(); });
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  if (classBefore) await db.doc("csClasses/2-1").set(classBefore);
  await db.doc("csWork/student-20101__review-flowchart").delete();
});

test("auto-completion: 세 퍼즐은 AI 없이 실행 종료 후 한 번 기록하고 재실행은 중복 제출하지 않는다", async ({ page }) => {
  const actions: string[] = [], ai: string[] = [];
  page.on("request", req => {
    if (req.url().endsWith(`${endpoint}/action`)) actions.push(req.postDataJSON().action.type);
    if (/\/api\/classroom\/ai/.test(req.url())) ai.push(req.url());
  });
  for (const mission of ["1", "2", "3"] as const) {
    await page.goto("about:blank"); await prepare(page, mission);
    await expect(page.getByRole("button", { name: "AI 오류 설명과 힌트", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toHaveCount(0);
    const before = actions.length;
    await start(page);
    if (mission !== "1") {
      const input = page.getByRole("textbox", { name: mission === "2" ? "키 입력값" : "비밀번호 입력값", exact: true });
      await expect(input).toBeFocused();
      expect((await stored(page)).missions?.[mission]?.submission).toBeUndefined();
      await input.fill(mission === "2" ? "150" : "7777");
      await page.getByRole("button", { name: "입력값 적용", exact: true }).click();
    }
    await expect(page.locator("#review-action-feedback")).toContainText("복습 기록 완료");
    await expect.poll(async () => !!(await stored(page)).missions?.[mission]?.submission).toBe(true);
    expect(actions.slice(before)).toEqual(["validate-practice", "submit-practice"]);
    const after = await stored(page);
    await execution(page).getByRole("button", { name: "다시 실행", exact: true }).click();
    await execution(page).getByRole("button", { name: "실행 중지", exact: true }).click();
    expect((await stored(page)).missions?.[mission]?.submission).toEqual(after.missions?.[mission]?.submission);
    expect(actions.length).toBe(before + 2);
  }
  expect(ai).toEqual([]);
});

test("auto-completion: 입력 대기·중지·잘못된 배치는 완료 기록을 만들지 않는다", async ({ page }) => {
  const actions: string[] = [];
  page.on("request", req => { if (req.url().endsWith(`${endpoint}/action`)) actions.push(req.postDataJSON().action.type); });
  await prepare(page, "3"); await start(page);
  const input = page.getByRole("textbox", { name: "비밀번호 입력값", exact: true });
  await expect(input).toBeFocused(); await input.fill("1111");
  await page.getByRole("button", { name: "입력값 적용", exact: true }).click();
  await expect(input).toBeFocused();
  await execution(page).getByRole("button", { name: "실행 중지", exact: true }).click();
  expect((await stored(page)).missions?.["3"]?.submission).toBeUndefined();
  expect(actions).toEqual([]);
  await page.goto("about:blank"); await prepare(page, "1", { "1": { s2: "b-m1-3", s3: "b-m1-2", s4: "b-m1-1" } });
  await start(page); await expect(execution(page)).toContainText("배치를 다시 확인해 주세요");
  expect((await stored(page)).missions?.["1"]?.submission).toBeFalsy();
  expect(actions).toEqual([]);
});

for (const lost of ["validate-practice", "submit-practice"] as const) {
  test(`auto-completion: ${lost} 응답 유실 복구는 같은 실행의 검증·제출을 한 번씩 마친다`, async ({ page }) => {
    await prepare(page);
    const actions: string[] = [];
    await page.route(`**${endpoint}/action`, async route => {
      const type = route.request().postDataJSON().action.type; actions.push(type);
      if (type === lost && actions.filter(item => item === lost).length === 1) { await route.fetch(); await route.abort("failed"); }
      else await route.continue();
    });
    await start(page);
    await expect(page.locator("#work-action-error")).toBeVisible();
    await expect(execution(page).getByRole("button", { name: "다음 미션: 선택 구조", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    await expect(page.locator("#review-action-feedback")).toContainText("복습 기록 완료");
    expect(actions).toEqual(["validate-practice", "submit-practice"]);
    expect((await stored(page)).missions?.["1"]?.submission).toBeTruthy();
  });
}

test("auto-completion: HTTP 성공이어도 서버 검증 실패는 제출하지 않는다", async ({ page }) => {
  await prepare(page); const actions: string[] = [];
  await page.route(`**${endpoint}/action`, async route => {
    actions.push(route.request().postDataJSON().action.type);
    const response = await route.fetch(), work: Work = await response.json();
    if (work.missions?.["1"]?.validation) work.missions["1"].validation.passed = false;
    await route.fulfill({ response, json: work });
  });
  await start(page); await expect(page.locator("#review-action-feedback")).toContainText("검증을 통과하지 못했어요");
  expect(actions).toEqual(["validate-practice"]);
  expect((await stored(page)).missions?.["1"]?.submission).toBeFalsy();
});

for (const rejected of ["validate-practice", "submit-practice"] as const) {
  test(`auto-completion: ${rejected} 확정 거절 뒤 새 실행으로 기록을 다시 요청할 수 있다`, async ({ page }) => {
    await prepare(page); const actions: string[] = [];
    await page.route(`**${endpoint}/action`, async route => {
      const type = route.request().postDataJSON().action.type; actions.push(type);
      if (type === rejected && actions.filter(item => item === rejected).length === 1) {
        await route.fulfill({ status: 403, json: { code: "LESSON_CLOSED", message: "합성 수업 닫힘 · 다시 실행해 주세요." } });
      } else await route.continue();
    });
    await start(page);
    await expect(page.locator("#work-action-error")).toBeVisible();
    await expect(page.locator("#review-action-feedback")).toContainText("다시 실행해 주세요");
    expect((await stored(page)).missions?.["1"]?.submission).toBeFalsy();
    const first = [...actions];
    await expect(execution(page).getByRole("button", { name: "다시 실행", exact: true })).toBeEnabled();
    await execution(page).getByRole("button", { name: "다시 실행", exact: true }).click();
    await expect(page.locator("#review-action-feedback")).toContainText("복습 기록 완료");
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    expect(actions.slice(first.length)).toEqual(["validate-practice", "submit-practice"]);
    expect((await stored(page)).missions?.["1"]?.submission).toBeTruthy();
  });
}

test("auto-completion: 검증 대기 중 실행을 중지하면 늦은 응답이 자동 제출하지 않는다", async ({ page }) => {
  await prepare(page); const actions: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}/action`, async route => {
    actions.push(route.request().postDataJSON().action.type);
    const response = await route.fetch(); await gate; await route.fulfill({ response });
  });
  try {
    await start(page);
    await expect.poll(() => actions).toEqual(["validate-practice"]);
    await expect(execution(page).getByRole("button", { name: "다시 실행", exact: true })).toBeDisabled();
    await expect(execution(page).getByRole("button", { name: "실행 준비 / 다시 시작", exact: true })).toBeDisabled();
    const stop = execution(page).getByRole("button", { name: "실행 중지", exact: true });
    await stop.focus(); await stop.press("Enter");
    await expect(execution(page).getByRole("status")).toBeFocused();
  } finally { release(); }
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await expect(page.locator("#review-action-feedback")).toContainText("종료에 도달하면");
  expect(actions).toEqual(["validate-practice"]);
  expect((await stored(page)).missions?.["1"]?.submission).toBeFalsy();
});

test("auto-completion: 교사 미리보기는 메모리에서 완료하고 학생 기록을 바꾸지 않는다", async ({ page }) => {
  await readyTeacher(page.request);
  const before = (await db.collection("csWork").get()).docs.map(doc => ({ id: doc.id, data: doc.data() }));
  const writes: string[] = [];
  page.on("request", req => { if (/\/api\/classroom\/(work|ai)/.test(req.url())) writes.push(req.url()); });
  await page.goto("/teacher/preview/review-flowchart?classId=2-1");
  await page.getByRole("tab", { name: /^실습/ }).click();
  const palette = page.getByRole("region", { name: "순서도 기호 보관함", exact: true });
  await palette.getByText("목록으로 배치하기", { exact: true }).click();
  for (const [label, value] of [["입출력 ▱ (물 500ml 붓기)", "b-m1-1"], ["처리 ▭ (물 끓이기)", "b-m1-2"], ["처리 ▭ (면과 스프 넣기)", "b-m1-3"]]) await palette.getByLabel(label, { exact: true }).selectOption(value);
  await execution(page).getByLabel("실행 속도", { exact: true }).selectOption("2"); await start(page);
  await expect(page.locator("#review-action-feedback")).toContainText("체험 완료");
  await expect(page.getByRole("tab", { name: "실습 25%", exact: true })).toBeVisible();
  expect((await db.collection("csWork").get()).docs.map(doc => ({ id: doc.id, data: doc.data() }))).toEqual(before);
  expect(writes).toEqual([]);
});
