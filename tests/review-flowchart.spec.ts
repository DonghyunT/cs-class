import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
const id = "review-flowchart", uid = "student-20101";
async function prepare(request: APIRequestContext) {
  await readyStudent(request); await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id, "review-abstraction", "programming-13"] });
  await db.collection("csWork").doc(`${uid}__${id}`).delete(); await db.collection("csAiUsage").doc(uid).delete();
  return await (await request.get(`/api/classroom/work/${id}`)).json() as Work;
}
async function action(request: APIRequestContext, work: Work, type: string, missionId: string) {
  const response = await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type, missionId } } }); expect(response.status()).toBe(200); return await response.json() as Work;
}
const correct = [{ s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" }, { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" }, { s2: "b-m3-in", s3: "b-m3-chk", s4_yes: "b-m3-yes", s4_no: "b-m3-no" }];
test.describe("flowchart 개념과 읽기 배치", () => {
  let classBefore: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async () => { classBefore = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async () => { if (classBefore) await db.collection("csClasses").doc("2-1").set(classBefore); });
  async function concept(page: Page, index: number) {
    await prepare(page.request); await page.goto(`/classroom/${id}`);
    await page.getByRole("tab", { name: /개념/ }).click();
    await page.getByRole("navigation", { name: "개념 목록" }).getByRole("button").nth(index).click();
    return page.getByRole("region", { name: "순서도 개념 체험" });
  }
  test("실제 네 기호와 뜻·예시·엔트리 동작을 연결한다", async ({ page }, testInfo) => {
    const scene = await concept(page, 0);
    for (const [name, shape, meaning, example, entry] of [
      ["단말", "ellipse", "시작과 종료", "시작", "시작하기 버튼을 클릭했을 때"],
      ["입출력", "polygon", "자료를 입력받거나 결과를 보여", "키 입력", "묻고 대답 기다리기"],
      ["처리", "rect", "행동을 실행하거나 값을 계산", "키에 10 더하기", "변수 바꾸기"],
      ["판단", "polygon", "조건을 확인", "키가 150 이상인가?", "만일 조건이라면"],
    ]) {
      await scene.getByRole("button", { name, exact: true }).click();
      const diagram = scene.getByRole("img", { name: `${name} 기호와 예시` });
      await expect(diagram.locator(`[data-symbol-shape] ${shape}`)).toHaveCount(1);
      if (name === "입출력" || name === "판단") {
        const points = await diagram.locator("polygon").evaluate(el => Array.from((el as SVGPolygonElement).points, point => ({ x: point.x, y: point.y })));
        expect(points).toHaveLength(4);
        if (name === "입출력") { expect(points[0].y).toBe(points[1].y); expect(points[2].y).toBe(points[3].y); expect(points[0].x).toBeGreaterThan(points[3].x); }
        else { expect(points[0].x).toBe(points[2].x); expect(points[1].y).toBe(points[3].y); expect(points[0].y).toBeLessThan(points[1].y); }
      }
      await expect(diagram).toContainText(example); await expect(scene.getByRole("status")).toContainText(meaning);
      await expect(scene.getByText(entry, { exact: false })).toBeVisible();
    }
    await scene.getByRole("button", { name: "기호 선택 초기화", exact: true }).click();
    await expect(scene.getByRole("button", { name: "단말", exact: true })).toHaveAttribute("aria-pressed", "true");
    for (const width of [1440, 821, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const name of ["단말", "입출력", "처리", "판단"]) {
      await scene.getByRole("button", { name, exact: true }).click();
      const diagram = scene.getByRole("img", { name: `${name} 기호와 예시` });
      expect(await diagram.evaluate(el => el.getBoundingClientRect().width <= el.parentElement!.clientWidth)).toBe(true);
      expect(await diagram.locator("text").evaluate(el => parseFloat(getComputedStyle(el).fontSize) * ((el as SVGGraphicsElement).getScreenCTM()?.a ?? 1))).toBeGreaterThanOrEqual(14);
    }
    await page.screenshot({ path: testInfo.outputPath("flowchart-symbols-320.png"), fullPage: true });
  });
  test("140·160·150cm는 실제 조건과 같은 갈래로만 진행하고 중지·초기화한다", async ({ page }, testInfo) => {
    const scene = await concept(page, 1), errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
    for (const [height, branch, output] of [[140, "no", "대기 안내"], [160, "yes", "탑승 가능 안내"], [150, "yes", "탑승 가능 안내"]] as const) {
      await scene.getByRole("button", { name: `${height}cm`, exact: true }).click();
      await scene.getByRole("button", { name: "흐름 실행", exact: true }).click();
      await expect(scene.getByRole("status")).toContainText("종료에 도달");
      await expect(scene.locator(`[data-edge="${branch}"]`)).toHaveAttribute("data-visited", "true");
      await expect(scene.locator(`[data-edge="${branch === "yes" ? "no" : "yes"}"]`)).toHaveAttribute("data-visited", "false");
      await expect(scene.getByRole("list", { name: "이번 실행 경로" })).toContainText(output);
    }
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("list", { name: "이번 실행 경로" }).getByRole("listitem")).toHaveCount(1);
    await scene.getByRole("button", { name: "흐름 실행", exact: true }).click();
    await scene.getByRole("button", { name: "실행 중지", exact: true }).click();
    await expect(scene.getByRole("button", { name: "흐름 실행", exact: true })).toBeFocused();
    const stopped = await scene.getByRole("list", { name: "이번 실행 경로" }).textContent();
    await page.waitForTimeout(850);
    expect(await scene.getByRole("list", { name: "이번 실행 경로" }).textContent()).toBe(stopped);
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await scene.getByRole("button", { name: "150cm", exact: true }).click();
    await scene.getByRole("button", { name: "흐름 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("종료에 도달");
    await page.setViewportSize({ width: 390, height: 620 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scene.getByRole("img").locator("text").evaluateAll(nodes => Math.min(...nodes.map(n => parseFloat(getComputedStyle(n).fontSize) * ((n as SVGGraphicsElement).getScreenCTM()?.a ?? 1))))).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: testInfo.outputPath("flowchart-branches-mobile.png"), fullPage: true }); expect(errors).toEqual([]);
  });
  test("틀림은 입력으로 돌아가고 맞음은 종료하며 저장한 답안을 보존한다", async ({ page }) => {
    const scene = await concept(page, 2);
    await expect(scene.locator('[data-node="fail"]')).toHaveAttribute("data-shape", "io");
    await expect(scene.locator('[data-node="fail"] polygon')).toHaveCount(1);
    await page.getByRole("radio", { name: "비밀번호 입력 단계", exact: true }).check();
    await page.getByRole("button", { name: "정답 확인", exact: true }).click();
    await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
    const before = await (await page.request.get(`/api/classroom/work/${id}`)).json();
    for (let i = 0; i < 5; i++) await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("입력 단계로 돌아왔어요");
    await expect(scene.locator('[data-edge="return"]')).toHaveAttribute("data-visited", "true");
    await expect(scene.getByRole("list", { name: "이번 실행 경로" }).getByRole("listitem").last()).toHaveText("예시 입력");
    await scene.getByRole("button", { name: "예시 입력: 맞음", exact: true }).click();
    for (let i = 0; i < 3; i++) await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("종료에 도달");
    await expect(scene.locator('[data-edge="yes"]')).toHaveAttribute("data-visited", "true");
    await expect(scene.getByRole("button", { name: "흐름 실행", exact: true })).toBeFocused();
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await scene.getByRole("button", { name: "흐름 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("입력 단계로 돌아왔어요");
    await scene.getByRole("button", { name: "예시 입력: 맞음", exact: true }).click();
    await scene.getByRole("button", { name: "흐름 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("종료에 도달");
    await page.getByRole("button", { name: "체험 초기화", exact: true }).click();
    const after = await (await page.request.get(`/api/classroom/work/${id}`)).json();
    expect(after.draft.conceptAnswers).toEqual(before.draft.conceptAnswers); expect(after.conceptSolved).toEqual(before.conceptSolved);
    await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("tab", { name: /개념/ }).click();
    await expect(scene.getByRole("button", { name: "예시 입력: 틀림", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("radio", { name: "비밀번호 입력 단계", exact: true })).toBeChecked();
  });
  test("팔레트 클릭·Enter 배치와 내부 스크롤·저장·재접속을 유지한다", async ({ page }, testInfo) => {
    await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
    const palette = page.getByRole("region", { name: "순서도 기호 보관함" });
    await palette.getByRole("button", { name: "물 500ml 냄비에 붓기", exact: true }).click();
    await page.getByRole("button", { name: "입출력 기호: 빈 기호", exact: true }).click();
    const boil = palette.getByRole("button", { name: "가스레인지 켜서 물 끓이기", exact: true }); await boil.focus(); await page.keyboard.press("Enter");
    const process = page.getByRole("button", { name: "처리 기호: 빈 기호", exact: true }).first(); await process.focus(); await page.keyboard.press("Enter");
    const dragSource = palette.getByRole("button", { name: "면과 분말스프 넣고 4분 끓이기", exact: true });
    const dragTarget = page.getByRole("button", { name: "처리 기호: 빈 기호", exact: true });
    await dragTarget.scrollIntoViewIfNeeded();
    const sourceBox = await dragSource.boundingBox(), targetBox = await dragTarget.boundingBox();
    if (!sourceBox || !targetBox) throw Error("Drag source or target missing");
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2); await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 6 });
    await page.mouse.move(targetBox.x + targetBox.width / 2 + 2, targetBox.y + targetBox.height / 2 + 2); await page.mouse.up();
    await expect(page.getByRole("button", { name: "처리 기호: 면과 분말스프 넣고 4분 끓이기", exact: true })).toBeVisible();
    await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
    const saved = await (await page.request.get(`/api/classroom/work/${id}`)).json();
    expect(saved.draft.reviewProject.placements["1"]).toEqual(correct[0]);
    await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: 가스레인지 켜서 물 끓이기", exact: true })).toBeVisible();
    for (const width of [1440, 821, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const canvas = page.getByLabel("실제 순서도 연결", { exact: true });
      expect(await canvas.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
      expect(await canvas.locator("text").evaluateAll(nodes => Math.min(...nodes.map(n => parseFloat(getComputedStyle(n).fontSize))))).toBeGreaterThanOrEqual(14);
    }
    await page.screenshot({ path: testInfo.outputPath("flowchart-practice-320.png"), fullPage: true });
  });
});
test("퍼즐 실행은 실제 선택한 출력 기호를 실행하고 빈 기호를 보정하지 않는다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { mission: "2", placements: { "2": { ...correct[1], s2: "b-m2-yes" } } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const run = page.getByRole("region", { name: "순서도 실행" });
  await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  await expect(run.getByLabel("키 입력값")).toHaveCount(0); await expect(run).toContainText("출력: 탑승 가능");
  await page.getByText("목록으로 배치하기", { exact: true }).click(); await page.locator('select[id$="-s2"]').selectOption(""); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click();
  await expect(run).toContainText("빈 기호를 먼저 채워 주세요."); await expect(run.getByRole("button", { name: "한 단계 실행" })).toBeDisabled();
});
test("자유 캔버스 초기화는 퍼즐·기획서·공방을 보존하고 기호만 되돌릴 수 있다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  const p = work.draft.reviewProject;
  Object.assign(p, { mission: "free", placements: Object.fromEntries(correct.map((value, i) => [String(i + 1), value])), guideStep: 4, current: "현재 기록", goal: "목표 기록", conditions: ["필수 조건"], core: ["핵심 요소"], cards: [{ id: "plan", type: "sequence", text: "계획 보존", yes: "", no: "" }], nodes: [...p.nodes, { id: "step", shape: "process", text: "추가 처리", x: 80, y: 160 }], edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }], pan: { x: 100, y: 100 } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "캔버스 초기화", exact: true }).click();
  await expect(page.getByRole("button", { name: "자유 캔버스", exact: true })).toHaveAttribute("aria-pressed", "true"); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록");
  await expect(page.getByLabel("계획 / 판단 조건", { exact: true })).toHaveValue("계획 보존"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const fresh = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(fresh).toMatchObject({ placements: p.placements, guideStep: 4, current: p.current, goal: p.goal, conditions: p.conditions, core: p.core, cards: p.cards, edges: [], pan: { x: 0, y: 0 } }); expect(fresh.nodes).toHaveLength(2);
  await page.getByRole("button", { name: "편집 되돌리기", exact: true }).click(); await expect(page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록");
  await page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true }).click(); await page.getByRole("button", { name: "선택 기호와 연결 삭제", exact: true }).click();
  await page.getByRole("button", { name: "처리 기호 추가", exact: true }).click(); await page.getByLabel("기호 내용", { exact: true }).fill("알람 켜기");
  await page.getByRole("combobox", { name: "출발 기호", exact: true }).selectOption({ label: "시작" }); await page.getByRole("combobox", { name: "도착 기호", exact: true }).selectOption({ label: "알람 켜기" }); await page.getByRole("button", { name: "이 화살표 연결", exact: true }).click();
  await page.getByRole("combobox", { name: "출발 기호", exact: true }).selectOption({ label: "알람 켜기" }); await page.getByRole("combobox", { name: "도착 기호", exact: true }).selectOption({ label: "종료" }); await page.getByRole("button", { name: "이 화살표 연결", exact: true }).click();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const beforeMove = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes.find((n: { text: string }) => n.text === "알람 켜기");
  const alarm = page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true }); await alarm.scrollIntoViewIfNeeded(); const box = await alarm.boundingBox(); if (!box) throw new Error("No visible node");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); const moved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(moved.nodes).toHaveLength(3); expect(moved.edges).toHaveLength(2); expect(moved.nodes.find((n: { text: string }) => n.text === "알람 켜기").x).toBeGreaterThan(beforeMove.x);
  await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes).toEqual(moved.nodes);
  const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
  await viewport.scrollIntoViewIfNeeded(); await alarm.focus();
  const viewportBox = await viewport.boundingBox(); if (!viewportBox) throw Error("No visible canvas viewport");
  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + 80); await page.mouse.wheel(180, 0);
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  for (const width of [821, 820, 390, 320, 821, 1440]) {
    const previousCenter = await viewport.evaluate(element => element.scrollLeft + element.clientWidth / 2);
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => viewport.evaluate((element, center) => {
      const expectedCenter = Math.max(element.clientWidth / 2, Math.min(center, element.scrollWidth - element.clientWidth / 2));
      return Math.abs(element.scrollLeft + element.clientWidth / 2 - expectedCenter);
    }, previousCenter)).toBeLessThanOrEqual(1);
    await expect(alarm).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await viewport.scrollIntoViewIfNeeded(); await page.getByLabel("현재 상태", { exact: true }).focus();
  const wideViewport = await viewport.boundingBox(); if (!wideViewport) throw Error("No visible wide canvas");
  await page.mouse.move(wideViewport.x + wideViewport.width / 2, wideViewport.y + 80); await page.mouse.wheel(-1000, 0);
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBe(0);
  const chosenCenter = await viewport.evaluate(element => element.scrollLeft + element.clientWidth / 2);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect.poll(() => viewport.evaluate((element, center) => {
    const expectedCenter = Math.max(element.clientWidth / 2, Math.min(center, element.scrollWidth - element.clientWidth / 2));
    return Math.abs(element.scrollLeft + element.clientWidth / 2 - expectedCenter);
  }, chosenCenter)).toBeLessThanOrEqual(1);
  await expect(page.getByLabel("현재 상태", { exact: true })).toBeFocused();
  const afterResize = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(afterResize.nodes).toEqual(moved.nodes); expect(afterResize.edges).toEqual(moved.edges); expect(afterResize.pan).toEqual(moved.pan);
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.getByRole("button", { name: "예시 공방 (선택)" }).click();
  await page.getByRole("button", { name: /4단계: 순차 구조/ }).click();
  await page.getByRole("button", { name: "공방 기호를 자유 캔버스에 복사" }).click();
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  await page.getByRole("button", { name: "화면 원점", exact: true }).click();
  await page.getByRole("button", { name: "화면 오른쪽", exact: true }).click();
  const panCenter = await viewport.evaluate(element => element.scrollLeft + element.clientWidth / 2);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect.poll(() => viewport.evaluate((element, center) => {
    const expectedCenter = Math.max(element.clientWidth / 2, Math.min(center, element.scrollWidth - element.clientWidth / 2));
    return Math.abs(element.scrollLeft + element.clientWidth / 2 - expectedCenter);
  }, panCenter)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "화면 오른쪽", exact: true })).toBeFocused();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.pan).toEqual({ x: 200, y: 0 });
});
test("세 퍼즐은 오류 관찰·실행·각 제출·재접속 기록을 유지한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await expect(page.getByText("기호의 역할과 예·아니오, 돌아가는 연결을 확인해 주세요.", { exact: true })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole("button", { name: i === 1 ? /2\. 선택 퍼즐/ : /3\. 반복 퍼즐/ }).click();
    if (!(await page.locator('select[id$="-s2"]').isVisible())) await page.getByText("목록으로 배치하기", { exact: true }).click();
    for (const [slot, block] of Object.entries(correct[i])) await page.locator(`select[id$="-${slot}"]`).selectOption(block);
    await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await page.getByRole("button", { name: "작품 제출", exact: true }).click(); await expect(page.getByText("복습 작품을 제출했어요.")).toBeVisible();
  }
  await page.reload(); await expect(page.getByRole("button", { name: /3\. 반복 퍼즐/ })).toHaveAttribute("aria-pressed", "true");
  const run = page.getByRole("region", { name: "순서도 실행" }); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  for (const wrong of ["1111", "07777", "abc", " 7777", ""]) {
    await expect(run.getByLabel("비밀번호 입력값")).toHaveAttribute("inputmode", "text");
    await run.getByLabel("비밀번호 입력값").fill(wrong); await run.getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
    await expect(run.getByRole("status")).toContainText("현재 기호: '비밀번호 불일치'"); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  }
  await run.getByLabel("비밀번호 입력값").fill("7777"); await run.getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "자동 실행", exact: true }).click(); await expect(run.getByText("종료에 도달했어요!", { exact: true })).toBeVisible(); expect(errors).toEqual([]);
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(Object.values(work.missions).filter((m: unknown) => (m as { submission: unknown }).submission)).toHaveLength(3);
});
test("자유 캔버스·공방·키보드·추상화 복사·교사 승인은 수정본과 독립이다", async ({ page, playwright }) => {
  await prepare(page.request); const abstraction: Work = await (await page.request.get("/api/classroom/work/review-abstraction")).json();
  if (abstraction.draft.reviewProject?.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(abstraction.draft.reviewProject, { current: "지각함", goal: "정시에 등교함", conditions: ["7시 30분에 기상"], core: ["현재 시각"], plans: ["알람 설정"] });
  const saved = await page.request.post("/api/classroom/work/review-abstraction", { headers, data: { revision: abstraction.revision, draft: abstraction.draft } }); expect(saved.status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "예시 공방 (선택)" }).click(); await page.getByRole("button", { name: /4단계: 순차 구조/ }).click(); await page.getByRole("button", { name: "공방 기호를 자유 캔버스에 복사" }).click();
  await page.getByText("추상화 기록이나 예시에서 시작하기", { exact: true }).click(); await page.getByLabel("가져올 추상화 기록").selectOption("draft"); await page.getByRole("button", { name: "추상화 기록 살펴보기" }).click(); await page.getByRole("button", { name: "이 정의를 내 작품에 복사" }).click();
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("지각함"); await page.getByRole("button", { name: "계획 카드 추가" }).click(); await page.getByLabel("계획 / 판단 조건", { exact: true }).fill("시각을 확인하고 조건에 맞춰 등교 준비와 버스 탑승을 한다");
  const node = page.getByRole("button", { name: "처리 기호: 기상 및 세수하기", exact: true }); await node.focus(); await page.keyboard.press("ArrowRight"); await expect(node).toBeFocused();
  await page.getByRole("button", { name: "AI 설계 리뷰 받기" }).click(); await page.getByRole("button", { name: "선생님 확인 요청" }).click(); await expect(page.getByText(/선생님 확인 대기 중이에요/)).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); const work = await (await page.request.get(`/api/classroom/work/${id}`)).json();
  await page.getByLabel("목표 상태", { exact: true }).fill("수정 중인 별도 목표"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }); await readyTeacher(teacher);
  const approve = await teacher.post(`/api/classroom/students/${uid}/review/${id}`, { headers, data: { requestId: work.review.id, decision: "approve", message: "" } }); expect(approve.status()).toBe(200); const latest = await approve.json(); expect(latest.missions.free.submission.reviewProject.goal).toBe("정시에 등교함"); expect(latest.draft.reviewProject.goal).toBe("수정 중인 별도 목표"); await teacher.dispose();
  await page.reload(); await expect(page.getByLabel("목표 상태", { exact: true })).toHaveValue("수정 중인 별도 목표");
  await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: "scratch/review-lessons/flowchart-mobile.png", fullPage: true });
  expect((await page.getByRole("button", { name: "계획 카드 추가" }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
});
test("현재 검증·AI가 수정과 경합할 때 이전 제출을 유지하고 타 반 교사 요청을 거부한다", async ({ request, playwright }) => {
  let work = await prepare(request); if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  const p = work.draft.reviewProject; Object.assign(p, { mission: "free", current: "알람 꺼짐", goal: "기상함", conditions: ["7시 전에 기상"], cards: [{ id: "one", type: "sequence", text: "알람을 켠다", yes: "", no: "" }], nodes: [...p.nodes, { id: "alarm", shape: "process", text: "알람 켜기", x: 80, y: 180 }], edges: [{ from: "start", to: "alarm", label: "" }, { from: "alarm", to: "end", label: "" }] });
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json();
  const ai = await request.post("/api/classroom/ai", { headers, data: { lessonId: id, task: "flow-review", revision: work.revision, requestId: randomUUID(), missionId: "free", input: "fixture-pass" } }); expect(ai.status()).toBe(200); work = (await ai.json()).work;
  work = await action(request, work, "validate-practice", "free"); work = await action(request, work, "submit-practice", "free"); const submission = work.missions!.free.submission;
  if (work.draft.reviewProject?.type === "flowchart") work.draft.reviewProject.nodes[0].x += 40;
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json(); expect(work.missions!.free.validation?.passed).toBe(true);
  if (work.draft.reviewProject?.type === "flowchart") work.draft.reviewProject.goal = "변경한 목표";
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json(); expect(work.missions!.free.validation).toBeNull(); expect(work.missions!.free.submission).toEqual(submission);
  expect((await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice", missionId: "free" } } })).status()).toBe(409);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }), session = await readyTeacher(teacher);
  const profile = db.collection("csAccounts").doc(session.uid); await profile.update({ role: "instructor", classIds: ["2-2"] });
  try {
    expect((await teacher.get(`/api/classroom/students/${uid}/work/${id}`)).status()).toBe(403);
    expect((await teacher.post(`/api/classroom/students/${uid}/review/${id}`, { headers, data: { requestId: randomUUID(), decision: "approve", message: "" } })).status()).toBe(403);
  } finally { await profile.update({ role: "teacher", classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) }); await teacher.dispose(); }
});
