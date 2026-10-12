import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const lessonId = "review-flowchart", uid = "student-20101", workUrl = `/api/classroom/work/${lessonId}`;
async function read(request: APIRequestContext) {
  const response = await request.get(workUrl); expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function open(page: Page, fields: Partial<FlowchartProject>) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: [lessonId] });
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  const work = await read(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
  Object.assign(work.draft.reviewProject, {
    mission: "free", current: "입력 전", goal: "결과 출력", conditions: ["입력값과 실행 결과 보존"], core: ["입력값"],
    cards: [{ id: "plan", type: "sequence", text: "입력값을 확인하고 결과를 출력한다", yes: "", no: "" }], ...fields,
  });
  const response = await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(response.status()).toBe(200);
  const saved = await response.json() as Work;
  await page.goto(`/classroom/${lessonId}?from=lessons`); await page.getByRole("tab", { name: /실습/ }).click();
  return saved;
}
const canvas = (page: Page) => page.getByLabel("실제 순서도 연결", { exact: true });
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
async function step(page: Page) {
  const button = toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true });
  await expect(button).toBeEnabled(); await button.click();
}

test.describe("순서도 실행 정확성과 입력 복구", () => {
  let classBefore: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank"); await page.setViewportSize({ width: 1544, height: 712 });
    classBefore = (await db.collection("csClasses").doc("2-1").get()).data();
  });
  test.afterEach(async ({ page }) => {
    await page.goto("about:blank");
    if (classBefore) await db.collection("csClasses").doc("2-1").set(classBefore);
    await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  });

  test("문자 입력과 비교·출력이 실제 값으로 실행되고 한글 조합 Enter는 입력을 제출하지 않는다", async ({ page }) => {
    const saved = await open(page, {
      nodes: [
        { id: "start", shape: "terminal", text: "시작", x: 300, y: 30 },
        { id: "input", shape: "io", text: "이름 입력", x: 290, y: 150 },
        { id: "choice", shape: "decision", text: "이름 == '테스트'", x: 290, y: 340 },
        { id: "yes", shape: "io", text: "이름 + '님, 반가워요' 출력", x: 70, y: 540 },
        { id: "no", shape: "io", text: "'다른 이름이에요' 출력", x: 510, y: 540 },
        { id: "end", shape: "terminal", text: "종료", x: 300, y: 710 },
      ],
      edges: [{ from: "start", to: "input", label: "" }, { from: "input", to: "choice", label: "" }, { from: "choice", to: "yes", label: "예" }, { from: "choice", to: "no", label: "아니오" }, { from: "yes", to: "end", label: "" }, { from: "no", to: "end", label: "" }],
    });
    await toolbar(page).getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    await step(page); await step(page);
    const input = canvas(page).getByRole("textbox", { name: "이름 입력값", exact: true });
    await expect(input).toBeFocused(); await expect(input).toHaveAttribute("inputmode", "text");
    await input.fill("테스트");
    await input.dispatchEvent("compositionstart");
    await input.dispatchEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true });
    await expect(input).toBeFocused(); await expect(input).toHaveValue("테스트");
    await expect(toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true })).toBeDisabled();
    await input.dispatchEvent("compositionend", { data: "트" }); await input.press("Enter");
    await expect(toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true })).toBeFocused();
    await step(page);
    await expect(canvas(page).locator('[data-flow-edge][data-branch="예"][data-active="true"]')).toHaveCount(1);
    await expect(canvas(page).locator('[data-flow-node="yes"]')).toHaveAttribute("data-active", "true");
    await step(page);
    await expect(canvas(page).locator('[data-flow-interaction][data-node-id="yes"]')).toContainText("테스트님, 반가워요");
    await step(page);
    await expect(page.getByRole("status").filter({ hasText: "종료에 도달했어요!" })).toBeVisible();
    await page.getByRole("button", { name: "실행 과정 펼치기", exact: true }).click();
    const variables = page.getByRole("table", { name: "변수 살펴보기", exact: true });
    await expect(variables.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "이름", exact: true }) }).getByRole("cell")).toHaveText(["테스트", "—"]);
    expect((await read(page.request)).draft.reviewProject).toEqual(saved.draft.reviewProject);
  });

  test("숫자 입력 오류는 입력 초안과 기존 답안을 유지하며 같은 입력칸에서 수정해 재시도한다", async ({ page }) => {
    const saved = await open(page, { mission: "2", placements: { "2": { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" } } });
    await toolbar(page).getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    await step(page); await step(page);
    const input = canvas(page).getByRole("textbox", { name: "키 입력값", exact: true });
    await expect(input).toBeFocused(); await input.fill("백오십"); await input.press("Enter");
    await expect(canvas(page).getByRole("alert")).toHaveText("유한한 숫자를 입력해 주세요.");
    await expect(input).toHaveValue("백오십"); await expect(input).toBeFocused();
    await expect(toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true })).toBeDisabled();
    expect((await read(page.request)).draft.reviewProject).toEqual(saved.draft.reviewProject);
    await input.fill("150"); await input.press("Enter");
    await expect(canvas(page).getByRole("alert")).toHaveCount(0);
    await expect(toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true })).toBeFocused();
    await toolbar(page).getByRole("button", { name: /실행 속도/ }).click();
    await toolbar(page).getByRole("button", { name: "자동 실행", exact: true }).click();
    await expect(page.getByRole("region", { name: "순서도 실행", exact: true }).getByRole("status")).toHaveText("종료에 도달했어요!");
    await expect(canvas(page).locator('[data-flow-interaction]')).toContainText("탑승 가능");
    expect((await read(page.request)).draft.reviewProject).toEqual(saved.draft.reviewProject);
  });

  test("출력은 변수의 직전 대입값을 바꾸지 않고 마지막 단계 뒤 다시 실행으로 초점이 이어진다", async ({ page }) => {
    const saved = await open(page, {
      nodes: [
        { id: "start", shape: "terminal", text: "시작", x: 300, y: 30 },
        { id: "init", shape: "process", text: "값 = 1", x: 295, y: 160 },
        { id: "inc", shape: "process", text: "값 = 값 + 1", x: 295, y: 290 },
        { id: "output", shape: "io", text: "값 출력", x: 290, y: 420 },
        { id: "end", shape: "terminal", text: "종료", x: 300, y: 550 },
      ],
      edges: [{ from: "start", to: "init", label: "" }, { from: "init", to: "inc", label: "" }, { from: "inc", to: "output", label: "" }, { from: "output", to: "end", label: "" }],
    });
    await page.getByRole("button", { name: "실행 과정 펼치기", exact: true }).click();
    await toolbar(page).getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    await step(page); await step(page); await step(page);
    const values = page.getByRole("table", { name: "변수 살펴보기", exact: true }).getByRole("row").filter({ has: page.getByRole("rowheader", { name: "값", exact: true }) }).getByRole("cell");
    await expect(values).toHaveText(["2", "1"]);
    await step(page); await expect(values).toHaveText(["2", "1"]);
    await expect(canvas(page).locator('[data-flow-interaction][data-node-id="output"]').getByText("2", { exact: true })).toBeVisible();
    const lastStep = toolbar(page).getByRole("button", { name: "한 단계 실행", exact: true });
    await lastStep.focus(); await page.keyboard.press("Enter");
    const restart = toolbar(page).getByRole("button", { name: "다시 실행", exact: true });
    await expect(restart).toBeEnabled(); await expect(restart).toBeFocused();
    await expect(values).toHaveText(["2", "1"]);
    await page.keyboard.press("Enter");
    await expect(toolbar(page).getByRole("button", { name: "자동 실행 일시정지", exact: true })).toBeFocused();
    await expect(restart).toBeVisible(); await expect(restart).toBeFocused();
    await expect(values).toHaveText(["2", "1"]);
    await toolbar(page).getByRole("button", { name: "실행 중지", exact: true }).click();
    await expect(toolbar(page).getByRole("button", { name: "실행 준비 / 다시 시작", exact: true })).toBeFocused();
    expect((await read(page.request)).draft.reviewProject).toEqual(saved.draft.reviewProject);
  });
});
