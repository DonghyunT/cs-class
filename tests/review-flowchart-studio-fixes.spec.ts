import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";
import { flowchartPresets } from "../src/components/student/review/flowchart-presets";

const workUrl = "/api/classroom/work/review-flowchart";
const workId = "student-20101__review-flowchart";
async function readWork(request: APIRequestContext): Promise<Work> {
  const response = await request.get(workUrl);
  expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function prepare(page: Page) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: ["review-flowchart"] });
  await db.collection("csWork").doc(workId).delete();
  const work = await readWork(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong project");
  Object.assign(work.draft.reviewProject, {
    mission: "free", current: "준비 전", goal: "준비 완료", conditions: ["빠짐없이 준비"],
    nodes: [{ id: "start", shape: "terminal", text: "시작", x: 120, y: 40 }, { id: "step", shape: "process", text: "준비하기", x: 120, y: 190 }, { id: "end", shape: "terminal", text: "종료", x: 120, y: 340 }],
    edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }],
  } satisfies Partial<FlowchartProject>);
  expect((await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto("/classroom/review-flowchart?from=lessons");
  await page.getByRole("tab", { name: /실습/ }).click();
}

test.describe("순서도 자유 공방 복원 보강", () => {
  let originalClass: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => { await page.goto("about:blank"); originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async ({ page }) => { await page.goto("about:blank"); if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass); await db.collection("csWork").doc(workId).delete(); });

  test("기존 출구를 덮어쓰지 않고 빠진 시작 기호를 다시 추가한다", async ({ page }) => {
    await prepare(page);
    await expect(page.getByText("키보드 편집 · 기호와 연결 설정", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "시작 다음 연결점", exact: true }).focus(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "종료 연결 받기", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "기존 화살표를 먼저 삭제" })).toBeVisible();
    expect((await readWork(page.request)).draft.reviewProject).toMatchObject({ edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }] });
    await page.getByRole("button", { name: "시작·종료 기호: 시작", exact: true }).focus(); await page.keyboard.press("Delete");
    await page.getByRole("button", { name: "시작·종료 기호 추가", exact: true }).click();
    await expect.poll(async () => { const p = (await readWork(page.request)).draft.reviewProject as FlowchartProject; return p.nodes.filter(n => n.shape === "terminal").map(n => n.text).sort(); }).toEqual(["시작", "종료"]);
    await page.getByRole("button", { name: "시작·종료 기호 추가", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "시작과 종료 기호가 이미" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("실제 순서도 연결", { exact: true }).locator('[data-flow-node][data-shape="terminal"]')).toHaveCount(2);
  });

  test("추천·직접 작성과 처방 검토를 구분하며 미채택 후보를 보존한다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1544, height: 712 });
    await prepare(page);
    const before = (await readWork(page.request)).draft.reviewProject;
    await page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
    await expect(dialog.getByRole("tab", { name: "추천 문제", exact: true })).toHaveAttribute("aria-selected", "true");
    await dialog.getByRole("button", { name: /비밀번호 5회 검증/ }).click();
    await expect(dialog.getByRole("button", { name: /비밀번호 5회 검증/ })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: testInfo.outputPath("flowchart-prescription-1544.png") });
    await expect(dialog.getByLabel("반복 지속 조건", { exact: true })).toHaveValue(/5.*동안/);
    await dialog.getByRole("tab", { name: "나만의 문제", exact: true }).click();
    await dialog.getByLabel("현재 상태", { exact: true }).fill("내가 직접 정의한 문제");
    await dialog.getByRole("button", { name: "처방전 닫기", exact: true }).click();
    expect((await readWork(page.request)).draft.reviewProject).toEqual(before);
    await page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }).click();
    await expect(dialog.getByLabel("현재 상태", { exact: true })).toHaveValue("내가 직접 정의한 문제");
    await expect(dialog.getByRole("region", { name: "처방전 결과 검토", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "처방전으로 초안 채우기", exact: true }).click();
    await expect.poll(async () => (await readWork(page.request)).draft.reviewProject).toMatchObject({ current: "내가 직접 정의한 문제", conditions: expect.arrayContaining([expect.stringContaining("5회")]) });
  });

  test("구조 점검은 AI 요청 없이 결손 기호로 이동한다", async ({ page }) => {
    await prepare(page);
    const node = page.getByRole("button", { name: "처리 기호: 준비하기", exact: true });
    await node.focus(); await page.keyboard.press("F2");
    await page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true }).fill(""); await page.keyboard.press("Enter");
    let aiCalls = 0; page.on("request", request => { if (request.url().includes("/ai")) aiCalls++; });
    await page.getByRole("button", { name: "AI 설계 점검 열기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /Solar AI 설계 점검/ });
    await expect(dialog.getByRole("region", { name: "기본 구조 점검", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /이 기호의 내용이 비어 있습니다/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-flow-node="step"]')).toBeFocused();
    await page.keyboard.press("F2"); await expect(page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true })).toBeFocused();
    expect(aiCalls).toBe(0);
  });

  test("현재 문제만으로 AI 정의 후보를 만들고 채택·재접속 경계를 지킨다", async ({ page }) => {
    await prepare(page);
    const before = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    let aiCalls = 0;
    page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) aiCalls++; });
    await page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
    await dialog.getByRole("tab", { name: "나만의 문제", exact: true }).click();
    await dialog.getByLabel("현재 상태", { exact: true }).fill("아침 준비물을 빠뜨리는 문제");
    await dialog.getByLabel("목표 상태", { exact: true }).fill("");
    await dialog.getByLabel("필수 조건", { exact: true }).fill("");
    await dialog.getByLabel("핵심 요소", { exact: true }).fill("");
    const request = dialog.getByRole("button", { name: /AI 기획서 제안 받기/ });
    await expect(request).toBeEnabled();
    expect(aiCalls).toBe(0);
    await request.click();
    await expect(dialog.getByLabel("목표 상태", { exact: true })).toHaveValue("합성 목표: 문제 해결");
    await expect(dialog.getByLabel("필수 조건", { exact: true })).toHaveValue("조건을 확인한다");
    await expect(dialog.getByLabel("핵심 요소", { exact: true })).toHaveValue("필요한 정보");
    await expect(dialog.getByLabel("실행 계획", { exact: true })).toHaveCount(3);
    expect(aiCalls).toBe(1);
    expect((await readWork(page.request)).draft.reviewProject).toEqual(before);
    await dialog.getByRole("button", { name: "처방전으로 초안 채우기", exact: true }).click();
    await expect.poll(async () => (await readWork(page.request)).draft.reviewProject).toMatchObject({ current: "아침 준비물을 빠뜨리는 문제", goal: "합성 목표: 문제 해결", conditions: ["조건을 확인한다"], core: ["필요한 정보"], nodes: before.nodes, edges: before.edges, cards: [{ text: "상태 확인" }, { text: "조건 확인" }, { text: "목표 실행" }] });
    await page.reload();
    await expect(page.getByLabel("실행 계획", { exact: true }).first()).toHaveValue("상태 확인");
    await page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }).click();
    await expect(dialog.getByLabel("목표 상태", { exact: true })).toHaveValue("합성 목표: 문제 해결");
    expect(aiCalls).toBe(1);
  });

  test("다른 빠른 시작은 이전 문제의 처방 후보를 비우고 새 AI 제안을 받는다", async ({ page }) => {
    await prepare(page);
    const before = (await readWork(page.request)).draft.reviewProject;
    const requests: { planning: { current: string; goal: string; conditions: string[]; core: string[] } }[] = [];
    await page.route("**/api/classroom/ai", async route => {
      requests.push(route.request().postDataJSON());
      const response = await route.fetch(), reply = await response.json();
      reply.result.definition = { goal: "페트병을 올바르게 분리수거하기", conditions: ["라벨을 떼고 세척하기"], core: ["페트병", "라벨"] };
      await route.fulfill({ response, json: reply });
    });
    await page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
    await dialog.getByRole("button", { name: /비밀번호 5회 검증/ }).click();
    await dialog.getByRole("tab", { name: "나만의 문제", exact: true }).click();
    await expect(dialog.getByLabel("필수 조건", { exact: true })).toHaveValue(/5회/);
    await expect(dialog.getByLabel("반복 지속 조건", { exact: true })).toHaveCount(1);
    await dialog.getByRole("button", { name: "페트병 분리수거", exact: true }).click();
    await expect(dialog.getByLabel("현재 상태", { exact: true })).toHaveValue(/페트병/);
    await expect(dialog.getByLabel("필수 조건", { exact: true })).toHaveValue("");
    await expect(dialog.getByLabel("핵심 요소", { exact: true })).toHaveValue("");
    await expect(dialog.locator("fieldset")).toHaveCount(0);
    expect((await readWork(page.request)).draft.reviewProject).toEqual(before);
    await dialog.getByRole("button", { name: /AI 기획서 제안 받기/ }).click();
    await expect(dialog.getByLabel("실행 계획", { exact: true })).toHaveCount(3);
    await expect(dialog.getByLabel("필수 조건", { exact: true })).toHaveValue("라벨을 떼고 세척하기");
    await expect(dialog.getByLabel("핵심 요소", { exact: true })).toHaveValue("페트병\n라벨");
    expect(requests).toHaveLength(1);
    expect(requests[0].planning).toMatchObject({ current: expect.stringContaining("페트병"), conditions: [], core: [] });
    expect((await readWork(page.request)).draft.reviewProject).toEqual(before);
  });
});

test("비밀번호 5회 예시는 성공 또는 횟수 한도까지 반복한다", () => {
  const preset = flowchartPresets.find(item => item.id === "login")!;
  expect(preset.conditions.join(" ")).toContain("5회");
  expect(preset.cards.find(card => card.type === "loop")).toMatchObject({ text: expect.stringMatching(/5.*동안/), yes: expect.stringContaining("시도 횟수") });
  expect(preset.cards.at(-1)).toMatchObject({ type: "selection", text: expect.stringContaining("성공"), no: expect.stringContaining("잠금") });
});
