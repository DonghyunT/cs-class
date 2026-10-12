import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import { missions } from "../src/lib/classroom/review/flowchart-data.mjs";
import { guideGraph } from "../src/lib/classroom/review/flow-experience";
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
function puzzleSlot(page: Page, missionId: number, slotId: string) {
  const slot = missions.find(mission => mission.id === missionId)?.slots.find(item => item.id === slotId);
  if (!slot?.hint) throw Error("No editable puzzle slot");
  return page.getByLabel(slot.hint, { exact: true });
}
async function recipe(page: Page) {
  await page.getByRole("button", { name: /처방전 채우기/ }).click();
  const dialog = page.getByRole("dialog", { name: /추상화 처방전/ });
  await expect(dialog).toBeVisible(); return dialog;
}
test.describe("V1 순서도 직접 조작", () => {
  let classBefore: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async () => { classBefore = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async () => { if (classBefore) await db.collection("csClasses").doc("2-1").set(classBefore); });
  async function free(page: Page) {
    const work = await prepare(page.request);
    if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
    Object.assign(work.draft.reviewProject, {
      mission: "free", current: "비밀번호가 틀림", goal: "로그인 성공", conditions: ["비밀번호가 맞을 때 종료"], core: ["비밀번호"],
      cards: [{ id: "loop", type: "loop", text: "비밀번호가 틀린 동안", yes: "다시 입력받기", no: "로그인 성공 알리기" }],
      nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 60 }, { id: "step", shape: "process", text: "알람 켜기", x: 300, y: 210 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 370 }], edges: [], pan: { x: 0, y: 0 },
    });
    expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
    await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
    return work.draft.reviewProject;
  }
  test("기호 안에서 한글을 편집하고 포트를 끌어 연결한 답안을 재접속으로 복원한다", async ({ page }) => {
    const initial = await free(page);
    const node = page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true });
    await node.dblclick(); const editor = page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true });
    await expect(editor).toBeFocused(); await editor.fill("비밀번호 다시 입력받기");
    await editor.dispatchEvent("compositionstart"); await editor.dispatchEvent("keydown", { key: "Delete", keyCode: 229, isComposing: true }); await editor.dispatchEvent("compositionend", { data: "기" });
    await expect(editor).toContainText("비밀번호 다시 입력받기"); await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "처리 기호: 비밀번호 다시 입력받기", exact: true })).toBeFocused();
    const source = page.getByRole("button", { name: "시작 다음 연결점", exact: true }), target = page.getByRole("button", { name: "비밀번호 다시 입력받기 연결 받기", exact: true });
    const sourceBox = await source.boundingBox(), targetBox = await target.boundingBox(); if (!sourceBox || !targetBox) throw Error("port missing");
    const canvasBounds = await page.getByLabel("실제 순서도 연결", { exact: true }).boundingBox();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2); await page.mouse.down();
    await expect(page.getByText("시작에서 다음으로 이어질 기호의 연결점을 고르세요.", { exact: true })).toBeVisible();
    expect(await page.getByLabel("실제 순서도 연결", { exact: true }).boundingBox()).toEqual(canvasBounds);
    expect(await target.boundingBox()).toEqual(targetBox);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 }); await page.mouse.up();
    await page.getByRole("button", { name: "비밀번호 다시 입력받기 다음 연결점", exact: true }).focus(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "종료 연결 받기", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.edges).toEqual([{ from: "start", to: "step", label: "", fromPort: "bottom", toPort: "top" }, { from: "step", to: "end", label: "", fromPort: "bottom", toPort: "top" }]);
    const saved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
    expect(saved.nodes.find((n: { id: string }) => n.id === "step")).toMatchObject({ text: "비밀번호 다시 입력받기", x: 300, y: 210 }); expect(saved.cards).toEqual(initial.cards);
    await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: 비밀번호 다시 입력받기", exact: true })).toBeVisible();
    expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.edges).toEqual(saved.edges);
  });
  test("팔레트 드래그·빈 화면 팬·정렬·휴지통은 계획과 기존 연결을 보존한다", async ({ page }) => {
    const initial = await free(page); const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    const source = page.getByRole("button", { name: "입출력 기호 추가", exact: true }); await source.scrollIntoViewIfNeeded();
    await source.evaluate(element => window.scrollBy({ top: element.getBoundingClientRect().top - 180, behavior: "instant" }));
    const sourceBox = await source.boundingBox(), canvasBox = await viewport.boundingBox(); if (!sourceBox || !canvasBox) throw Error("canvas missing");
    const dropPoint = { x: canvasBox.x + canvasBox.width / 2 + 150, y: canvasBox.y + 120 };
    expect(dropPoint.y).toBeLessThan(page.viewportSize()!.height);
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2); await page.mouse.down(); await page.mouse.move(dropPoint.x, dropPoint.y, { steps: 8 }); await page.mouse.up();
    await expect(page.getByRole("button", { name: "입출력 기호: 내용 입력", exact: true })).toBeVisible();
    await viewport.scrollIntoViewIfNeeded(); const box = await viewport.boundingBox(); if (!box) throw Error("canvas missing");
    await page.mouse.move(box.x + 25, box.y + 120); await page.mouse.down(); await page.mouse.move(box.x + 100, box.y + 155, { steps: 6 }); await page.mouse.up();
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.pan.x).toBe(-75);
    await page.getByRole("button", { name: "기호 세로 정렬", exact: true }).click();
    await expect.poll(async () => {
      const p = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
      return new Set(p.nodes.map((n: { x: number; shape: string }) => n.x + (n.shape === "terminal" ? 200 : n.shape === "process" ? 210 : 220) / 2)).size;
    }).toBe(1);
    await page.getByRole("button", { name: /화면 중앙/ }).click();
    const node = page.getByRole("button", { name: "입출력 기호: 내용 입력", exact: true }); await node.scrollIntoViewIfNeeded(); await node.focus(); await page.keyboard.press("Enter");
    const trash = page.getByRole("button", { name: "기호를 끌어 삭제", exact: true });
    const nodeBox = await node.locator("[data-flow-shape]").boundingBox(), trashBox = await trash.boundingBox(); if (!nodeBox || !trashBox) throw Error("trash missing");
    await page.mouse.move(nodeBox.x + 30, nodeBox.y + 15); await page.mouse.down(); await page.mouse.move(trashBox.x + trashBox.width / 2, trashBox.y + trashBox.height / 2, { steps: 8 }); await page.mouse.up();
    await expect(node).toHaveCount(0); await expect(viewport).toBeFocused();
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes.length).toBe(3);
    const saved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject; expect(saved.cards).toEqual(initial.cards); expect(saved.edges).toEqual([]);
    await page.setViewportSize({ width: 390, height: 680 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test("반복 카드와 접힌 기획서는 기존 조건·행동·종료 기록을 그대로 보존한다", async ({ page }) => {
    const initial = await free(page);
    await expect(page.getByLabel("반복 지속 조건", { exact: true })).toHaveValue("비밀번호가 틀린 동안"); await expect(page.getByLabel("반복할 행동", { exact: true })).toHaveValue("다시 입력받기");
    await page.getByText("반복이 끝난 뒤 (선택)", { exact: true }).click(); await expect(page.getByLabel("반복이 끝난 뒤의 행동", { exact: true })).toHaveValue("로그인 성공 알리기");
    await page.getByRole("button", { name: "기획서 접기", exact: true }).click(); await expect(page.getByLabel("반복 지속 조건", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "기획서 펼치기", exact: true }).click(); await expect(page.getByRole("button", { name: "기획서 접기", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "반복 카드 추가", exact: true }).click(); const cards = page.locator('fieldset[data-structure="loop"]');
    await cards.last().getByLabel("반복 지속 조건", { exact: true }).fill("정답이 아닌 동안"); await cards.last().getByLabel("반복할 행동", { exact: true }).fill("답을 다시 입력받기");
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.cards.length).toBe(2);
    const saved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
    expect(saved.cards[0]).toEqual(initial.cards[0]); expect(saved.cards[1]).toMatchObject({ type: "loop", text: "정답이 아닌 동안", yes: "답을 다시 입력받기", no: "" });
    await page.reload(); await expect(page.getByLabel("반복 지속 조건", { exact: true }).last()).toHaveValue("정답이 아닌 동안");
  });
  test("실행 속도를 고른 뒤 실제 순차 화살표를 한 단계씩 실행한다", async ({ page }) => {
    const work = await prepare(page.request); if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
    work.draft.reviewProject.placements = { "1": { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" } };
    expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
    await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
    const run = page.getByRole("region", { name: "순서도 실행" }); await run.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
    await expect(run.getByRole("status")).toContainText("현재 기호: 물 500ml 냄비에 붓기");
    await run.getByRole("button", { name: "자동 실행", exact: true }).click(); await expect(run.getByRole("status")).toContainText("종료에 도달했어요!");
    await expect(run.getByLabel("실시간 데이터 흐름")).toContainText("면과 분말스프 넣고 4분 끓이기");
    await run.getByRole("button", { name: "실행 중지", exact: true }).click(); await expect(run.getByRole("button", { name: "실행 준비 / 다시 시작" })).toBeFocused();
  });
  test("빈 캔버스를 이동한 뒤 시작으로 보기는 실제 시작 기호를 다시 보여 준다", async ({ page }) => {
    const initial = await free(page), viewport = page.getByLabel("실제 순서도 연결", { exact: true }); await viewport.scrollIntoViewIfNeeded();
    const box = await viewport.boundingBox(); if (!box) throw Error("canvas missing");
    await page.mouse.move(box.x + box.width - 35, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 35, box.y + 200, { steps: 8 }); await page.mouse.up();
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.pan.x).toBeGreaterThan(460);
    await page.getByRole("button", { name: "시작으로 보기", exact: true }).click();
    const start = page.getByRole("button", { name: "시작·종료 기호: 시작", exact: true }).locator("[data-flow-shape]");
    await expect.poll(async () => {
      const symbol = await start.boundingBox(), frame = await viewport.boundingBox();
      return !!symbol && !!frame && symbol.x >= frame.x && symbol.x + symbol.width <= frame.x + frame.width && symbol.y >= frame.y && symbol.y + symbol.height <= frame.y + frame.height;
    }).toBe(true);
    await expect.poll(async () => {
      const p = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
      return p.pan.x < 300;
    }).toBe(true);
    const saved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject; expect(saved.nodes).toEqual(initial.nodes); expect(saved.edges).toEqual(initial.edges); expect(saved.cards).toEqual(initial.cards);
  });
  test("200개 기호를 정렬해도 허용 좌표 안에서 저장하고 모든 문구를 보존한다", async ({ page }) => {
    await free(page); await page.goto("about:blank"); let work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
    if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
    const nodes = Array.from({ length: 200 }, (_, i) => ({ id: `layout-${i}`, shape: i === 0 || i === 199 ? "terminal" as const : "process" as const, text: i === 0 ? "시작" : i === 199 ? "종료" : `처리 ${i}`, x: 80 + i % 10 * 180, y: 60 + Math.floor(i / 10) * 140 }));
    work.draft.reviewProject.nodes = nodes;
    const response = await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(response.status()).toBe(200); work = await response.json() as Work;
    await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "기호 세로 정렬", exact: true }).click();
    await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).revision).toBeGreaterThan(work.revision);
    const saved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
    expect(saved.nodes).toHaveLength(200); expect(saved.nodes.every((n: { x: number; y: number }) => Math.abs(n.x) <= 10000 && Math.abs(n.y) <= 10000)).toBe(true);
    expect(saved.nodes.map(({ id, shape, text }: { id: string; shape: string; text: string }) => ({ id, shape, text }))).toEqual(nodes.map(({ id, shape, text }) => ({ id, shape, text })));
    expect(saved.edges).toEqual([]);
  });
});
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
    const run = scene.getByRole("group", { name: "개념 흐름 실행 조작", exact: true }).getByRole("button", { name: "흐름 실행", exact: true });
    for (const [height, branch, output] of [[140, "no", "대기 안내"], [160, "yes", "탑승 가능 안내"], [150, "yes", "탑승 가능 안내"]] as const) {
      await scene.getByRole("button", { name: `${height}cm`, exact: true }).click();
      await run.click();
      await expect(scene.getByRole("status")).toContainText("종료에 도달");
      await expect(scene.locator(`[data-edge="${branch}"]`)).toHaveAttribute("data-visited", "true");
      await expect(scene.locator(`[data-edge="${branch === "yes" ? "no" : "yes"}"]`)).toHaveAttribute("data-visited", "false");
      await expect(scene.getByRole("list", { name: "이번 실행 경로" })).toContainText(output);
    }
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("list", { name: "이번 실행 경로" }).getByRole("listitem")).toHaveCount(1);
    await run.click();
    await scene.getByRole("button", { name: "실행 중지", exact: true }).click();
    await expect(run).toBeFocused();
    const stopped = await scene.getByRole("list", { name: "이번 실행 경로" }).textContent();
    await page.waitForTimeout(850);
    expect(await scene.getByRole("list", { name: "이번 실행 경로" }).textContent()).toBe(stopped);
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await scene.getByRole("button", { name: "150cm", exact: true }).click();
    await run.click();
    await expect(scene.getByRole("status")).toContainText("종료에 도달");
    await page.setViewportSize({ width: 390, height: 620 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scene.getByRole("img").locator("text").evaluateAll(nodes => Math.min(...nodes.map(n => parseFloat(getComputedStyle(n).fontSize) * ((n as SVGGraphicsElement).getScreenCTM()?.a ?? 1))))).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: testInfo.outputPath("flowchart-branches-mobile.png"), fullPage: true }); expect(errors).toEqual([]);
  });
  test("틀림은 입력으로 돌아가고 맞음은 종료하며 저장한 답안을 보존한다", async ({ page }) => {
    const scene = await concept(page, 2);
    const run = scene.getByRole("group", { name: "개념 흐름 실행 조작", exact: true }).getByRole("button", { name: "흐름 실행", exact: true });
    await expect(scene.locator('[data-node="fail"]')).toHaveAttribute("data-shape", "io");
    await expect(scene.locator('[data-node="fail"] polygon')).toHaveCount(1);
    await page.getByRole("radio", { name: "비밀번호 입력 단계", exact: true }).check();
    await page.getByRole("button", { name: "정답 확인", exact: true }).click();
    await expect(page.locator("#concept-feedback-loop")).toBeFocused();
    await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
    const before = await (await page.request.get(`/api/classroom/work/${id}`)).json();
    expect(before.conceptSolved).toEqual(["loop"]);
    for (let i = 0; i < 5; i++) await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("입력 단계로 돌아왔어요");
    await expect(scene.locator('[data-edge="return"]')).toHaveAttribute("data-visited", "true");
    await expect(scene.getByRole("list", { name: "이번 실행 경로" }).getByRole("listitem").last()).toHaveText("예시 입력");
    await scene.getByRole("button", { name: "예시 입력: 맞음", exact: true }).click();
    for (let i = 0; i < 3; i++) await scene.getByRole("button", { name: "한 단계 실행", exact: true }).click();
    await expect(scene.getByRole("status")).toContainText("종료에 도달");
    await expect(scene.locator('[data-edge="yes"]')).toHaveAttribute("data-visited", "true");
    await expect(run).toBeFocused();
    await scene.getByRole("button", { name: "예시 흐름 초기화", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await run.click();
    await expect(scene.getByRole("status")).toContainText("입력 단계로 돌아왔어요");
    await scene.getByRole("button", { name: "예시 입력: 맞음", exact: true }).click();
    await run.click();
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
    await page.getByRole("button", { name: "입출력 기호: 입출력 ▱ (물 500ml 붓기)", exact: true }).click();
    const boil = palette.getByRole("button", { name: "가스레인지 켜서 물 끓이기", exact: true }); await boil.focus(); await page.keyboard.press("Enter");
    const process = page.getByRole("button", { name: "처리 기호: 처리 ▭ (물 끓이기)", exact: true }); await process.focus(); await page.keyboard.press("Enter");
    const dragSource = palette.getByRole("button", { name: "면과 분말스프 넣고 4분 끓이기", exact: true });
    const dragTarget = page.getByRole("button", { name: "처리 기호: 처리 ▭ (면과 스프 넣기)", exact: true });
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
      expect(await canvas.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(width < 390);
      expect(await canvas.locator("text").evaluateAll(nodes => Math.min(...nodes.map(n => parseFloat(getComputedStyle(n).fontSize))))).toBeGreaterThanOrEqual(14);
    }
    await page.screenshot({ path: testInfo.outputPath("flowchart-practice-320.png"), fullPage: true });
  });
});
test("V1처럼 틀린 배치와 빈 기호를 실행하지 않고 답안을 보존한다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { mission: "2", placements: { "2": { ...correct[1], s2: "b-m2-yes" } } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const run = page.getByRole("region", { name: "순서도 실행" });
  const inputSlot = page.locator('[data-flow-node="s2"]');
  await expect(inputSlot.locator("title")).toHaveText("'탑승 가능' 안내 출력");
  await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click();
  await expect(run.getByRole("status")).toContainText("배치를 다시 확인해 주세요."); await expect(run.getByRole("button", { name: "한 단계 실행" })).toBeDisabled();
  await expect(page.getByLabel("실제 순서도 연결", { exact: true }).getByLabel("키 입력값")).toHaveCount(0); await expect(run.getByLabel("실시간 데이터 흐름")).not.toContainText("출력:");
  expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.placements["2"].s2).toBe("b-m2-yes");
  await page.getByText("목록으로 배치하기", { exact: true }).click(); await puzzleSlot(page, 2, "s2").selectOption("b-m2-1");
  await expect(inputSlot.locator("title")).toHaveText("사용자 키(Height) 입력");
  await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await expect(run.getByRole("button", { name: "한 단계 실행" })).toBeEnabled();
  await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  const input = page.getByLabel("실제 순서도 연결", { exact: true }).getByLabel("키 입력값");
  await expect(input).toBeFocused(); await input.fill("160"); await input.press("Enter");
  await run.getByRole("button", { name: "자동 실행", exact: true }).click(); await expect(run.getByRole("status")).toContainText("종료에 도달했어요!");
  await expect(run.getByLabel("실시간 데이터 흐름")).toContainText("출력: 탑승 가능");
  await puzzleSlot(page, 2, "s2").selectOption(""); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click();
  await expect(run).toContainText("빈 기호를 먼저 채워 주세요."); await expect(run.getByRole("button", { name: "한 단계 실행" })).toBeDisabled();
  await expect(inputSlot.locator("title")).toHaveText("입출력 ▱ (키 입력받기)");
  await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.placements["2"].s2).toBe("");
});
test("자유 캔버스 초기화는 퍼즐·기획서·공방을 보존하고 기호만 되돌릴 수 있다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  const p = work.draft.reviewProject;
  Object.assign(p, { mission: "free", placements: Object.fromEntries(correct.map((value, i) => [String(i + 1), value])), guideStep: 4, current: "현재 기록", goal: "목표 기록", conditions: ["필수 조건"], core: ["핵심 요소"], cards: [{ id: "plan", type: "sequence", text: "계획 보존", yes: "", no: "" }], nodes: [...p.nodes, { id: "step", shape: "process", text: "추가 처리", x: 80, y: 160 }], edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }], pan: { x: 100, y: 100 } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "캔버스 초기화", exact: true }).click();
  await page.getByRole("dialog", { name: "캔버스를 비울까요?", exact: true }).getByRole("button", { name: "기호와 화살표 비우기", exact: true }).click();
  await expect(page.getByRole("button", { name: "🚀 5. 나만의 백지", exact: true })).toHaveAttribute("aria-pressed", "true");
  const definition = await recipe(page); await expect(definition.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록"); await definition.getByRole("button", { name: "처방전 닫기", exact: true }).click();
  await expect(page.getByRole("region", { name: "자연어 기획서", exact: true }).getByLabel("실행 계획", { exact: true })).toHaveValue("계획 보존"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const fresh = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(fresh).toMatchObject({ placements: p.placements, guideStep: 4, current: p.current, goal: p.goal, conditions: p.conditions, core: p.core, cards: p.cards, edges: [], pan: { x: 0, y: 0 } }); expect(fresh.nodes).toHaveLength(2);
  await page.getByRole("button", { name: "편집 되돌리기", exact: true }).click(); await expect(page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); const restoredDefinition = await recipe(page); await expect(restoredDefinition.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록"); await restoredDefinition.getByRole("button", { name: "처방전 닫기", exact: true }).click();
  await page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true }).focus(); await page.keyboard.press("Delete");
  await page.getByRole("button", { name: "처리 기호 추가", exact: true }).click();
  await page.getByRole("button", { name: "처리 기호: 내용 입력", exact: true }).focus(); await page.keyboard.press("F2");
  await page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true }).fill("알람 켜기"); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "시작 다음 연결점", exact: true }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "알람 켜기 연결 받기", exact: true }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "알람 켜기 다음 연결점", exact: true }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "종료 연결 받기", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const beforeMove = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes.find((n: { text: string }) => n.text === "알람 켜기");
  const alarm = page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true }); await alarm.scrollIntoViewIfNeeded(); const box = await alarm.locator("[data-flow-shape]").boundingBox(); if (!box) throw new Error("No visible node");
  await page.mouse.move(box.x + 30, box.y + 15); await page.mouse.down(); await page.mouse.move(box.x + 80, box.y + 45, { steps: 4 }); await page.mouse.up();
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
  const recipeTrigger = page.getByRole("button", { name: /처방전 채우기/ });
  await viewport.scrollIntoViewIfNeeded(); await recipeTrigger.focus(); await viewport.scrollIntoViewIfNeeded();
  const wideViewport = await viewport.boundingBox(); if (!wideViewport) throw Error("No visible wide canvas");
  await page.mouse.move(wideViewport.x + wideViewport.width / 2, wideViewport.y + 80); await page.mouse.wheel(-1000, 0);
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBe(0);
  const chosenCenter = await viewport.evaluate(element => element.scrollLeft + element.clientWidth / 2);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect.poll(() => viewport.evaluate((element, center) => {
    const expectedCenter = Math.max(element.clientWidth / 2, Math.min(center, element.scrollWidth - element.clientWidth / 2));
    return Math.abs(element.scrollLeft + element.clientWidth / 2 - expectedCenter);
  }, chosenCenter)).toBeLessThanOrEqual(1);
  await expect(recipeTrigger).toBeFocused();
  const afterResize = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(afterResize.nodes).toEqual(moved.nodes); expect(afterResize.edges).toEqual(moved.edges); expect(afterResize.pan).toEqual(moved.pan);
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.getByRole("button", { name: "🛠️ 4. 예시 공방", exact: true }).click();
  await page.getByRole("button", { name: /4단계: 순차 구조/ }).click();
  await page.getByRole("button", { name: "나만의 백지로 이동" }).click();
  await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
  await page.getByRole("button", { name: "화면 원점", exact: true }).click();
  await viewport.scrollIntoViewIfNeeded(); const panBox = await viewport.boundingBox(); if (!panBox) throw Error("No visible canvas");
  await page.mouse.move(panBox.x + panBox.width - 50, panBox.y + 100); await page.mouse.down(); await page.mouse.move(panBox.x + panBox.width - 250, panBox.y + 100, { steps: 6 }); await page.mouse.up();
  await viewport.focus();
  await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.pan).toEqual({ x: 200, y: 0 });
  const panCenter = await viewport.evaluate(element => element.scrollLeft + element.clientWidth / 2);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect.poll(() => viewport.evaluate((element, center) => {
    const expectedCenter = Math.max(element.clientWidth / 2, Math.min(center, element.scrollWidth - element.clientWidth / 2));
    return Math.abs(element.scrollLeft + element.clientWidth / 2 - expectedCenter);
  }, panCenter)).toBeLessThanOrEqual(1);
  await expect(viewport).toBeFocused();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.pan).toEqual({ x: 200, y: 0 });
});
test("세 퍼즐은 오류 관찰·실행·각 제출·재접속 기록을 유지한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await expect(page.getByText("기호의 역할과 예·아니오, 돌아가는 연결을 확인해 주세요.", { exact: true })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole("button", { name: i === 1 ? /2\. 선택 \(놀이기구\)/ : /3\. 반복 \(비밀번호\)/ }).click();
    if (!(await puzzleSlot(page, i + 1, "s2").isVisible())) await page.getByText("목록으로 배치하기", { exact: true }).click();
    for (const [slot, block] of Object.entries(correct[i])) await puzzleSlot(page, i + 1, slot).selectOption(block);
    await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await page.getByRole("button", { name: "작품 제출", exact: true }).click(); await expect(page.getByText("복습 작품을 제출했어요.")).toBeVisible();
  }
  await page.reload(); await expect(page.getByRole("button", { name: /3\. 반복 \(비밀번호\)/ })).toHaveAttribute("aria-pressed", "true");
  const run = page.getByRole("region", { name: "순서도 실행" }); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  for (const wrong of ["1111", "07777", "abc", " 7777", ""]) {
    await expect(page.getByLabel("실제 순서도 연결", { exact: true }).getByLabel("비밀번호 입력값")).toHaveAttribute("inputmode", "text");
    await page.getByLabel("실제 순서도 연결", { exact: true }).getByLabel("비밀번호 입력값").fill(wrong); await page.getByLabel("실제 순서도 연결", { exact: true }).getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
    await expect(run.getByRole("status")).toContainText("현재 기호: '비밀번호 불일치'"); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  }
  await page.getByLabel("실제 순서도 연결", { exact: true }).getByLabel("비밀번호 입력값").fill("7777"); await page.getByLabel("실제 순서도 연결", { exact: true }).getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "자동 실행", exact: true }).click(); await expect(run.getByText("종료에 도달했어요!", { exact: true })).toBeVisible(); expect(errors).toEqual([]);
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(Object.values(work.missions).filter((m: unknown) => (m as { submission: unknown }).submission)).toHaveLength(3);
});
test("자유 캔버스·공방·키보드·추상화 복사·교사 승인은 수정본과 독립이다", async ({ page, playwright }) => {
  const prepared = await prepare(page.request);
  if (prepared.draft.reviewProject?.type !== "flowchart") throw Error("wrong lesson");
  Object.assign(prepared.draft.reviewProject, guideGraph(4));
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: prepared.revision, draft: prepared.draft } })).status()).toBe(200);
  const abstraction: Work = await (await page.request.get("/api/classroom/work/review-abstraction")).json();
  if (abstraction.draft.reviewProject?.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(abstraction.draft.reviewProject, { current: "지각함", goal: "정시에 등교함", conditions: ["7시 30분에 기상"], core: ["현재 시각"], plans: ["알람 설정"] });
  const saved = await page.request.post("/api/classroom/work/review-abstraction", { headers, data: { revision: abstraction.revision, draft: abstraction.draft } }); expect(saved.status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "🛠️ 4. 예시 공방", exact: true }).click(); await page.getByRole("button", { name: /4단계: 순차 구조/ }).click(); await page.getByRole("button", { name: "나만의 백지로 이동" }).click();
  const importedRecipe = await recipe(page); await importedRecipe.getByText("추상화 기록에서 가져오기", { exact: true }).click(); await importedRecipe.getByLabel("가져올 추상화 기록").selectOption("draft"); await importedRecipe.getByRole("button", { name: "추상화 기록 살펴보기" }).click(); await importedRecipe.getByRole("button", { name: "이 정의를 내 작품에 복사" }).click();
  await expect(importedRecipe.getByLabel("현재 상태", { exact: true })).toHaveValue("지각함"); await importedRecipe.getByRole("button", { name: "처방전으로 초안 채우기", exact: true }).click(); await page.getByRole("button", { name: "계획 카드 추가" }).click(); await page.getByLabel("실행 계획", { exact: true }).fill("시각을 확인하고 조건에 맞춰 등교 준비와 버스 탑승을 한다");
  const node = page.getByRole("button", { name: "처리 기호: 기상 및 세수하기", exact: true }); await node.focus(); await page.keyboard.press("ArrowRight"); await expect(node).toBeFocused();
  await page.getByRole("button", { name: /AI 검사 후 제출/ }).click(); await page.getByRole("button", { name: "AI 설계 리뷰 받기" }).click(); await page.getByRole("button", { name: "선생님 확인 요청" }).click(); await expect(page.getByText(/선생님 확인 대기 중이에요/)).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); const work = await (await page.request.get(`/api/classroom/work/${id}`)).json();
  await page.getByRole("dialog", { name: /Solar AI 설계 점검/ }).press("Escape"); const changedRecipe = await recipe(page); await changedRecipe.getByLabel("목표 상태", { exact: true }).fill("수정 중인 별도 목표"); await changedRecipe.getByRole("button", { name: "처방전으로 초안 채우기", exact: true }).click();
  await expect.poll(async () => (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.goal).toBe("수정 중인 별도 목표");
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }); await readyTeacher(teacher);
  const approve = await teacher.post(`/api/classroom/students/${uid}/review/${id}`, { headers, data: { requestId: work.review.id, decision: "approve", message: "" } }); expect(approve.status()).toBe(200); const latest = await approve.json(); expect(latest.missions.free.submission.reviewProject.goal).toBe("정시에 등교함"); expect(latest.draft.reviewProject.goal).toBe("수정 중인 별도 목표"); await teacher.dispose();
  await page.reload(); const restoredRecipe = await recipe(page); await expect(restoredRecipe.getByLabel("목표 상태", { exact: true })).toHaveValue("수정 중인 별도 목표"); await restoredRecipe.getByRole("button", { name: "처방전 닫기", exact: true }).click();
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
