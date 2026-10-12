import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const lessonId = "review-flowchart", uid = "student-20101";
const workUrl = `/api/classroom/work/${lessonId}`;
const sequencePlacement = { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" };
const lessonSteps = ["🍜 1. 순차 (라면)", "🎡 2. 선택 (놀이기구)", "🔒 3. 반복 (비밀번호)", "🛠️ 4. 예시 공방", "🚀 5. 나만의 백지"];

async function readWork(request: APIRequestContext): Promise<Work> {
  const response = await request.get(workUrl); expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function prepare(request: APIRequestContext, fields: Partial<FlowchartProject> = {}) {
  await readyStudent(request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: [lessonId, "review-abstraction"] });
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  await db.collection("csAiUsage").doc(uid).delete();
  const work = await readWork(request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong review project");
  Object.assign(work.draft.reviewProject, fields);
  const response = await request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function openPractice(page: Page) {
  await page.goto(`/classroom/${lessonId}?from=lessons`);
  await page.getByRole("tab", { name: /실습/ }).click();
}
async function perform(request: APIRequestContext, work: Work, type: "validate-practice" | "submit-practice") {
  const response = await request.post(`${workUrl}/action`, { headers, data: { revision: work.revision, action: { type, missionId: "free" } } });
  expect(response.status()).toBe(200); return await response.json() as Work;
}
function savedFree(): Partial<FlowchartProject> {
  return {
    mission: "free", placements: { "1": sequencePlacement }, guideStep: 4,
    current: "준비 전", goal: "준비 완료", conditions: ["기록을 보존", ""], core: ["준비물", ""],
    cards: [{ id: "legacy-loop", type: "loop", text: "준비가 끝나지 않은 동안", yes: "준비물을 챙긴다", no: "등교한다" }],
    nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 60 }, { id: "step", shape: "process", text: "준비물을 챙긴다", x: 300, y: 220 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 400 }],
    edges: [{ from: "start", to: "step", label: "", fromPort: "right", toPort: "left" }, { from: "step", to: "end", label: "" }], pan: { x: 0, y: 0 },
  };
}

test.describe("순서도 연구소 V1 작업실", () => {
  let originalClass: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
    originalClass = (await db.collection("csClasses").doc("2-1").get()).data();
  });
  test.afterEach(async ({ page }) => {
    await page.goto("about:blank");
    if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
    await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
    await db.collection("csAiUsage").doc(uid).delete();
  });

  test("V1의 다섯 단계·퍼즐 작업실·예시 공방은 기존 배치를 유지한다", async ({ page }, testInfo) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 1920, height: 1080 });
    await prepare(page.request, { placements: { "1": sequencePlacement } }); await openPractice(page);
    const nav = page.getByRole("navigation", { name: "순서도 실습", exact: true });
    for (const name of lessonSteps) await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
    const palette = page.getByRole("region", { name: "순서도 기호 보관함", exact: true });
    const canvas = page.getByLabel("실제 순서도 연결", { exact: true });
    const execution = page.getByRole("region", { name: "순서도 실행", exact: true });
    const boxes = await Promise.all([palette.boundingBox(), canvas.boundingBox(), execution.boundingBox()]);
    if (boxes.some(box => !box)) throw Error("puzzle panels missing");
    expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);
    expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
    await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: lessonSteps[1], exact: true }).click();
    await expect(page.getByRole("heading", { name: "놀이기구 탑승 판정기 (선택 구조)", exact: true }).last()).toBeVisible();
    await nav.getByRole("button", { name: lessonSteps[2], exact: true }).click();
    await expect(page.getByRole("heading", { name: "비밀번호 맞추기 루프 (반복 구조)", exact: true }).last()).toBeVisible();
    await nav.getByRole("button", { name: lessonSteps[3], exact: true }).click();
    await page.getByRole("button", { name: /전체 완성/ }).click();
    const guideProcess = canvas.locator('[data-flow-node][data-shape="process"]').filter({ hasText: "기상 및 세수하기" });
    await expect(guideProcess).toBeVisible(); await expect(guideProcess.locator("[data-flow-shape]")).toHaveCount(1);
    await nav.getByRole("button", { name: lessonSteps[0], exact: true }).click();
    await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toBeVisible();
    await expect.poll(async () => (await readWork(page.request)).draft.reviewProject).toMatchObject({ placements: { "1": sequencePlacement } });
    await page.screenshot({ path: testInfo.outputPath("v1-flowchart-puzzle-1920.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("기획서·기호 보관함·캔버스·실행 과정은 V1처럼 배치되고 접기와 화면 전환은 답안을 보존한다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const seeded = await prepare(page.request, savedFree()); await openPractice(page);
    const planner = page.getByRole("region", { name: "자연어 기획서", exact: true });
    const palette = page.getByRole("region", { name: "자유 기호 보관함", exact: true });
    const canvas = page.getByRole("region", { name: "순서도 자유 캔버스", exact: true });
    const rail = page.getByRole("button", { name: "실행 과정 펼치기", exact: true });
    const boxes = await Promise.all([planner.boundingBox(), palette.boundingBox(), canvas.boundingBox(), rail.boundingBox()]);
    if (boxes.some(box => !box)) throw Error("free workshop panels missing");
    for (let i = 0; i < 3; i++) expect(boxes[i]!.x + boxes[i]!.width).toBeLessThanOrEqual(boxes[i + 1]!.x);
    expect(boxes[0]!.width).toBe(240); expect(boxes[1]!.width).toBe(100);
    expect(await rail.evaluate(element => element.parentElement!.getBoundingClientRect().width)).toBe(40);
    await expect(page.getByText("키보드 편집 · 기호와 연결 설정", { exact: true })).toHaveCount(0);
    await expect(canvas.getByRole("button", { name: "편집 되돌리기", exact: true })).toBeVisible();
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    await expect(toolbar).toBeVisible();
    expect(await toolbar.evaluate(element => element.closest('[aria-label="순서도 자유 캔버스"]') !== null)).toBe(true);
    await page.getByRole("button", { name: "기획서 접기", exact: true }).click();
    await expect(page.getByLabel("반복 지속 조건", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "기획서 펼치기", exact: true })).toBeFocused();
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(boxes[2]!.width);
    await page.getByRole("button", { name: "기획서 펼치기", exact: true }).click();
    await expect(page.getByRole("button", { name: "기획서 접기", exact: true })).toBeFocused();
    await expect(page.getByLabel("반복 지속 조건", { exact: true })).toHaveValue("준비가 끝나지 않은 동안");
    await rail.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "실행 과정 접기", exact: true })).toBeFocused();
    expect(await page.getByRole("button", { name: "실행 과정 접기", exact: true }).evaluate(element => element.parentElement!.getBoundingClientRect().width)).toBe(220);
    await expect(page.getByRole("table", { name: "변수 살펴보기", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "실행 과정 접기", exact: true }).press("Enter"); await expect(rail).toBeFocused();
    for (const [width, height] of [[1689, 790], [1280, 720], [821, 712], [820, 712], [390, 712]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: "기획서 접기", exact: true })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "한 단계 실행", exact: true })).toBeVisible();
      if (width >= 1280) {
        await expect.poll(() => canvas.evaluate(element => {
          const workspace = element.parentElement!.getBoundingClientRect();
          return workspace.bottom <= innerHeight - 12 && workspace.bottom >= innerHeight - 28;
        })).toBe(true);
        expect(await page.getByLabel("실제 순서도 연결", { exact: true }).evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(300);
      }
      if (width === 390) {
        const mobilePanels = await Promise.all([canvas.boundingBox(), planner.boundingBox()]);
        if (mobilePanels.some(box => !box)) throw Error("mobile workshop panels missing");
        expect(mobilePanels[0]!.y + mobilePanels[0]!.height).toBeLessThanOrEqual(mobilePanels[1]!.y);
        expect(await toolbar.evaluate(element => element.parentElement!.getBoundingClientRect().height)).toBeLessThanOrEqual(108);
      }
      if (width === 1689 || width === 390) await page.screenshot({ path: testInfo.outputPath(`v1-flowchart-free-${width}.png`), fullPage: true });
    }
    const saved = await readWork(page.request); expect(saved.draft.reviewProject).toEqual(seeded.draft.reviewProject);
    await page.reload(); await expect(page.getByLabel("반복할 행동", { exact: true })).toHaveValue("준비물을 챙긴다");
    expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
  });

  test("낮은 창에서도 다섯 단계의 작업실 높이와 실행 조작을 확보한다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await prepare(page.request, { placements: { "1": sequencePlacement }, guideStep: 4 }); await openPractice(page);
    const nav = page.getByRole("navigation", { name: "순서도 실습", exact: true });
    for (const name of lessonSteps) {
      await nav.getByRole("button", { name, exact: true }).click();
      const diagram = page.getByLabel("실제 순서도 연결", { exact: true });
      await expect.poll(() => diagram.evaluate(element => {
        const workspace = element.closest("[data-flow-canvas]")?.parentElement?.closest("section")?.parentElement?.getBoundingClientRect();
        return !!workspace && workspace.bottom <= innerHeight - 12 && workspace.bottom >= innerHeight - 28;
      })).toBe(true);
      expect(await diagram.evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(220);
      await expect(page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true }).getByRole("button", { name: "자동 실행", exact: true })).toBeInViewport();
    }
  });

  test("부동 실행바로 실제 계산·자연어 분기를 실행하며 현재값·직전값·콘솔을 살펴본다", async ({ page }) => {
    await page.setViewportSize({ width: 1544, height: 712 });
    const seeded = await prepare(page.request, {
      ...savedFree(),
      nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 40 }, { id: "init", shape: "process", text: "값 = 1", x: 300, y: 170 }, { id: "inc", shape: "process", text: "값 = 값 + 1", x: 300, y: 300 }, { id: "choice", shape: "decision", text: "다음으로 넘어갈까요?", x: 300, y: 440 }, { id: "yes", shape: "io", text: "'완료' 출력", x: 80, y: 600 }, { id: "no", shape: "io", text: "'다시' 출력", x: 520, y: 600 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 760 }],
      edges: [{ from: "start", to: "init", label: "" }, { from: "init", to: "inc", label: "" }, { from: "inc", to: "choice", label: "" }, { from: "choice", to: "yes", label: "예" }, { from: "choice", to: "no", label: "아니오" }, { from: "yes", to: "end", label: "" }, { from: "no", to: "end", label: "" }],
    });
    await openPractice(page);
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    await toolbar.getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    const step = toolbar.getByRole("button", { name: "한 단계 실행", exact: true });
    for (let i = 0; i < 3; i++) { await expect(step).toBeEnabled(); await step.click(); }
    await page.getByRole("button", { name: "실행 과정 펼치기", exact: true }).click();
    const variables = page.getByRole("table", { name: "변수 살펴보기", exact: true });
    await expect(variables.getByRole("row").filter({ hasText: "값" }).last()).toHaveText(/값\s*2\s*1/);
    const log = page.getByRole("list", { name: "실시간 데이터 흐름", exact: true });
    await expect(log).toContainText("값 = 1"); await expect(log).toContainText("값 = 2");
    await step.click(); const yes = page.getByLabel("실제 순서도 연결", { exact: true }).getByRole("button", { name: "예로 진행", exact: true });
    await expect(yes).toBeFocused(); await expect(step).toBeDisabled();
    await yes.click(); await expect(log).toContainText("다음으로 넘어갈까요? → 예");
    const speed = toolbar.getByRole("button", { name: /실행 속도/ });
    await expect(speed).toHaveText("1×"); await speed.click(); await expect(speed).toHaveText("2×");
    await speed.click(); await expect(speed).toHaveText("0.5×"); await speed.click(); await expect(speed).toHaveText("1×");
    await speed.click(); await expect(speed).toHaveText("2×");
    const consolePanel = page.getByRole("region", { name: "출력 콘솔", exact: true });
    await expect(consolePanel).toHaveCSS("background-color", "rgb(15, 23, 42)");
    await expect(variables).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await toolbar.getByRole("button", { name: "자동 실행", exact: true }).click();
    await expect(log).toContainText("출력: 완료"); await expect(log).toContainText("종료에 도달했어요.");
    const completedVariables = await variables.getByRole("row").allTextContents();
    await page.getByRole("button", { name: "출력 콘솔 지우기", exact: true }).click();
    await expect(log.getByRole("listitem")).toHaveCount(0);
    expect(await variables.getByRole("row").allTextContents()).toEqual(completedVariables);
    await expect(page.getByRole("status").filter({ hasText: "종료에 도달했어요!" })).toBeVisible(); await expect(step).toBeDisabled();
    await toolbar.getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    for (let i = 0; i < 3; i++) { await expect(step).toBeEnabled(); await step.click(); }
    await expect(log).toContainText("값 = 1"); await expect(log).toContainText("값 = 2");
    await expect(variables.getByRole("row").filter({ hasText: "값" }).last()).toHaveText(/값\s*2\s*1/);
    await toolbar.getByRole("button", { name: "실행 중지", exact: true }).click();
    await expect(toolbar.getByRole("button", { name: "실행 준비 / 다시 시작", exact: true })).toBeFocused();
    expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
  });

  test("긴 변수표와 콘솔은 각 영역 안에서 읽고 실행바와 작품을 유지한다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const nodes: FlowchartProject["nodes"] = [
      { id: "start", shape: "terminal", text: "시작", x: 300, y: 40 },
      ...Array.from({ length: 16 }, (_, index) => ({ id: `value-${index}`, shape: "process" as const, text: `값${index + 1} = ${index + 1}`, x: 300, y: 160 + index * 110 })),
      { id: "end", shape: "terminal", text: "종료", x: 300, y: 1940 },
    ];
    const seeded = await prepare(page.request, { ...savedFree(), nodes, edges: nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id, label: "" })) });
    await openPractice(page); await page.getByRole("button", { name: "실행 과정 펼치기", exact: true }).click();
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    await toolbar.getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
    for (let index = 0; index < nodes.length; index++) await toolbar.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    const values = page.getByRole("region", { name: "변수표 값", exact: true });
    const log = page.getByRole("list", { name: "실시간 데이터 흐름", exact: true });
    for (const area of [values, log]) {
      expect(await area.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
      await area.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await area.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    }
    await expect(toolbar.getByRole("button", { name: "다시 실행", exact: true })).toBeInViewport();
    expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
  });

  test("이전 작품의 포트·기획서·제출은 복원되고 배치 이동과 직접 문구 변경을 구분한다", async ({ page }) => {
    let work = await prepare(page.request, savedFree());
    const ai = await page.request.post("/api/classroom/ai", { headers, data: { lessonId, task: "flow-review", revision: work.revision, requestId: randomUUID(), missionId: "free", input: "fixture-pass" } });
    expect(ai.status()).toBe(200); work = (await ai.json()).work as Work;
    work = await perform(page.request, work, "validate-practice"); work = await perform(page.request, work, "submit-practice");
    const submission = work.missions!.free.submission, original = work.draft.reviewProject as FlowchartProject;
    await openPractice(page);
    await page.getByRole("button", { name: "AI 설계 점검 열기", exact: true }).click();
    await expect(page.getByRole("button", { name: "이 작품 제출 완료", exact: true })).toBeDisabled();
    await page.getByRole("dialog", { name: /Solar AI 설계 점검/ }).press("Escape");
    await page.getByRole("button", { name: "처리 기호: 준비물을 챙긴다", exact: true }).focus(); await page.keyboard.press("ArrowRight");
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).nodes.find(node => node.id === "step")!.x).toBeGreaterThan(original.nodes[1].x);
    work = await readWork(page.request); expect(work.missions!.free.validation?.passed).toBe(true); expect(work.missions!.free.submission).toEqual(submission);
    await page.reload(); const restored = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    expect(restored.cards).toEqual(original.cards); expect(restored.conditions).toEqual(original.conditions); expect(restored.core).toEqual(original.core); expect(restored.edges).toEqual(original.edges);
    const node = page.getByRole("button", { name: "처리 기호: 준비물을 챙긴다", exact: true }); await node.focus(); await page.keyboard.press("F2");
    const editor = page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true }); await expect(editor).toBeFocused(); await editor.fill("준비물을 다시 확인한다");
    await editor.dispatchEvent("compositionstart"); await editor.dispatchEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true }); await expect(editor).toBeVisible();
    await editor.dispatchEvent("compositionend", { data: "다" }); await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "처리 기호: 준비물을 다시 확인한다", exact: true })).toBeFocused();
    const oldConnection = page.getByRole("button", { name: "시작에서 준비물을 다시 확인한다 다음 연결선 삭제", exact: true });
    await oldConnection.focus(); await page.keyboard.press("Delete");
    await page.getByRole("button", { name: "시작·종료 기호: 시작", exact: true }).focus();
    for (let index = 0; index < 3; index++) await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "시작 다음 연결점", exact: true })).toBeFocused(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "처리 기호: 준비물을 다시 확인한다", exact: true }).focus();
    for (let index = 0; index < 3; index++) await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "준비물을 다시 확인한다 연결 받기", exact: true })).toBeFocused(); await page.keyboard.press("Enter");
    await expect.poll(async () => (await readWork(page.request)).missions!.free.validation).toBeNull();
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).edges.find(edge => edge.from === "start")).toMatchObject({ from: "start", to: "step", label: "", fromPort: "bottom", toPort: "top" });
    work = await readWork(page.request); expect(work.missions!.free.submission).toEqual(submission);
    const latest = work.draft.reviewProject as FlowchartProject; expect(latest.cards).toEqual(original.cards); expect(latest.placements).toEqual(original.placements);
    await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: 준비물을 다시 확인한다", exact: true })).toBeVisible();
    expect((await readWork(page.request)).draft.reviewProject).toEqual(latest); expect((await readWork(page.request)).missions!.free.submission).toEqual(submission);
    await page.getByRole("button", { name: /작품 내보내기/ }).click();
    const exported = page.getByRole("dialog", { name: /내 알고리즘 작품 내보내기/ });
    const image = exported.getByRole("img", { name: "문제 정의와 자연어 기획서, 순서도를 담은 작품 이미지", exact: true });
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(exported.getByRole("link", { name: "PNG 다운로드", exact: true })).toHaveAttribute("download", "나의-순서도-작품.png");
    expect(await image.evaluate(async element => (await fetch((element as HTMLImageElement).src)).headers.get("content-type"))).toBe("image/png");
    await exported.press("Escape"); await expect(page.getByRole("button", { name: /작품 내보내기/ })).toBeFocused();
  });

  test("처방전 초안과 AI 후보는 닫았다 열어도 유지되고 채택 전에는 기존 작품을 바꾸지 않는다", async ({ page }) => {
    const seeded = await prepare(page.request, savedFree()); await openPractice(page);
    const trigger = page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }); await trigger.click();
    const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
    await dialog.getByLabel("현재 상태", { exact: true }).fill("아직 채택하지 않은 등교 준비");
    await dialog.getByLabel("목표 상태", { exact: true }).fill("준비물을 챙겨 등교하기");
    await dialog.getByLabel("필수 조건", { exact: true }).fill("준비물 확인\n");
    await dialog.getByLabel("핵심 요소", { exact: true }).fill("준비물 목록");
    await dialog.getByRole("button", { name: "처방전 닫기", exact: true }).click(); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(dialog.getByLabel("현재 상태", { exact: true })).toHaveValue("아직 채택하지 않은 등교 준비");
    await expect(dialog.getByLabel("필수 조건", { exact: true })).toHaveValue("준비물 확인\n");
    expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
    const requested = page.waitForRequest(request => request.url().endsWith("/api/classroom/ai"));
    await dialog.getByRole("button", { name: /AI 기획서 제안 받기/ }).click();
    const payload = (await requested).postDataJSON();
    expect(payload).toMatchObject({ task: "flow-plan", missionId: "free", planning: { current: "아직 채택하지 않은 등교 준비", goal: "준비물을 챙겨 등교하기", conditions: ["준비물 확인", ""], core: ["준비물 목록"] } });
    await expect(dialog.getByLabel("실행 계획", { exact: true })).toHaveCount(3);
    expect(await dialog.getByLabel("실행 계획", { exact: true }).evaluateAll(elements => elements.map(element => (element as HTMLTextAreaElement).value))).toEqual(["상태 확인", "조건 확인", "목표 실행"]);
    expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
    await dialog.getByRole("button", { name: "처방전 닫기", exact: true }).click(); await trigger.click();
    await expect(dialog.getByLabel("실행 계획", { exact: true }).first()).toHaveValue("상태 확인");
    await dialog.getByRole("button", { name: "처방전으로 초안 채우기", exact: true }).click();
    await expect.poll(async () => (await readWork(page.request)).draft.reviewProject).toMatchObject({ current: "아직 채택하지 않은 등교 준비", goal: "준비물을 챙겨 등교하기", conditions: ["준비물 확인", ""], core: ["준비물 목록"], cards: [{ type: "sequence", text: "상태 확인" }, { type: "sequence", text: "조건 확인" }, { type: "sequence", text: "목표 실행" }] });
    const saved = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    expect(saved.nodes).toEqual((seeded.draft.reviewProject as FlowchartProject).nodes); expect(saved.edges).toEqual((seeded.draft.reviewProject as FlowchartProject).edges);
    await page.reload(); await expect(page.getByLabel("실행 계획", { exact: true }).first()).toHaveValue("상태 확인");
  });

  test("늦은 기획서 추천은 새 입력과 닫은 처방전의 미채택 내용을 덮어쓰지 않는다", async ({ page }) => {
    const seeded = await prepare(page.request, savedFree()); await openPractice(page);
    const gates: { release: () => void }[] = [];
    await page.route("**/api/classroom/ai", async route => {
      const response = await route.fetch(); let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; }); gates.push({ release });
      await gate; await route.fulfill({ response });
    });
    try {
      const trigger = page.getByRole("button", { name: "자연어 기획서 채우기", exact: true }); await trigger.click();
      const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
      await dialog.getByLabel("현재 상태", { exact: true }).fill("첫 추천 요청의 상태");
      await dialog.getByRole("button", { name: /AI 기획서 제안 받기/ }).click(); await expect.poll(() => gates.length).toBe(1);
      await dialog.getByLabel("현재 상태", { exact: true }).fill("응답을 기다리며 직접 고친 상태");
      expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
      gates[0].release(); await expect(dialog.getByRole("alert")).toContainText("작성 내용이 바뀌었거나");
      await expect(dialog.getByLabel("현재 상태", { exact: true })).toHaveValue("응답을 기다리며 직접 고친 상태");
      await expect(dialog.getByLabel("반복 지속 조건", { exact: true })).toHaveValue("준비가 끝나지 않은 동안");
      await expect(dialog.getByLabel("실행 계획", { exact: true })).toHaveCount(0);
      await dialog.getByRole("button", { name: /AI 기획서 제안 받기/ }).click(); await expect.poll(() => gates.length).toBe(2);
      await dialog.getByLabel("목표 상태", { exact: true }).fill("닫기 전에 직접 수정한 목표");
      await dialog.getByRole("button", { name: "처방전 닫기", exact: true }).click();
      const finished = page.waitForResponse(response => response.url().endsWith("/api/classroom/ai")); gates[1].release(); await finished;
      await expect(trigger).toBeEnabled(); await trigger.click();
      await expect(dialog.getByLabel("현재 상태", { exact: true })).toHaveValue("응답을 기다리며 직접 고친 상태");
      await expect(dialog.getByLabel("목표 상태", { exact: true })).toHaveValue("닫기 전에 직접 수정한 목표");
      await expect(dialog.getByLabel("반복 지속 조건", { exact: true })).toHaveValue("준비가 끝나지 않은 동안");
      await expect(dialog.getByLabel("실행 계획", { exact: true })).toHaveCount(0); expect(gates).toHaveLength(2);
      expect((await readWork(page.request)).draft.reviewProject).toEqual(seeded.draft.reviewProject);
    } finally { for (const gate of gates) gate.release(); await page.unrouteAll({ behavior: "wait" }); }
  });

  test("기호 안에서 연속 글 입력과 한글 조합을 해도 편집 DOM·초점·전체 문구를 보존한다", async ({ page }) => {
    const seeded = await prepare(page.request, savedFree()); await openPractice(page);
    const node = page.getByRole("button", { name: "처리 기호: 준비물을 챙긴다", exact: true });
    await node.locator('[data-flow-edit="true"]').last().click();
    const editor = page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true });
    await expect(editor).toBeFocused(); const originalEditor = await editor.elementHandle(); if (!originalEditor) throw Error("No inline editor");
    await editor.press("Control+A"); await editor.pressSequentially("Check supplies"); await expect(editor).toHaveText("Check supplies");
    await editor.press("End"); await editor.dispatchEvent("compositionstart"); await page.keyboard.insertText(" 준비물 확인");
    await editor.dispatchEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true }); await expect(editor).toBeFocused();
    await editor.dispatchEvent("compositionend", { data: " 준비물 확인" }); await expect(editor).toHaveText("Check supplies 준비물 확인");
    expect(await originalEditor.evaluate(element => element === document.querySelector('[aria-label="처리 기호 문구 직접 편집"]'))).toBe(true);
    await expect(editor).toBeFocused(); await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "처리 기호: Check supplies 준비물 확인", exact: true })).toBeFocused();
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).nodes.find(item => item.id === "step")!.text).toBe("Check supplies 준비물 확인");
    const saved = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    expect(saved.cards).toEqual((seeded.draft.reviewProject as FlowchartProject).cards); expect(saved.edges).toEqual((seeded.draft.reviewProject as FlowchartProject).edges);
    await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: Check supplies 준비물 확인", exact: true })).toBeVisible();
  });

  test("예시 공방 실행은 전체를 완성하고 질문을 자동으로 펼쳐 초점을 옮긴 뒤 예 갈래로 종료한다", async ({ page }) => {
    await prepare(page.request, { mission: "guide", guideStep: 0 }); await openPractice(page);
    await expect(page.getByRole("button", { name: "🛠️ 4. 예시 공방", exact: true })).toHaveAttribute("aria-pressed", "true");
    const details = page.locator('[data-practice="flowchart"] details').filter({ has: page.locator("summary").filter({ hasText: "실행 과정" }) });
    await expect(details).not.toHaveAttribute("open", "");
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    await toolbar.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await toolbar.getByRole("button", { name: "자동 실행", exact: true }).click();
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).guideStep).toBe(4);
    const yes = page.getByLabel("실제 순서도 연결", { exact: true }).getByRole("button", { name: "07:20 · 예로 진행", exact: true });
    await expect(details).toHaveAttribute("open", ""); await expect(yes).toBeFocused();
    await expect(toolbar.getByRole("button", { name: "한 단계 실행", exact: true })).toBeDisabled();
    await expect(page.getByLabel("실제 순서도 연결", { exact: true }).locator('[data-shape="decision"][data-active="true"]')).toHaveCount(1);
    await yes.click();
    await expect(details.getByRole("list", { name: "실시간 데이터 흐름", exact: true })).toContainText("→ 예");
    await expect(details.getByRole("list", { name: "실시간 데이터 흐름", exact: true })).toContainText("종료에 도달했어요.");
    await expect(page.getByRole("status").filter({ hasText: "종료에 도달했어요!" })).toBeVisible();
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).guideStep).toBe(4);
  });
});
