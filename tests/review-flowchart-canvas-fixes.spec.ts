import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const lessonId = "review-flowchart", uid = "student-20101", workUrl = `/api/classroom/work/${lessonId}`;
async function readWork(request: APIRequestContext) { const response = await request.get(workUrl); expect(response.status()).toBe(200); return await response.json() as Work; }
async function prepare(page: Page, fields: Partial<FlowchartProject>) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: [lessonId] });
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  const work = await readWork(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong project");
  Object.assign(work.draft.reviewProject, fields);
  const saved = await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(saved.status()).toBe(200);
  await page.goto(`/classroom/${lessonId}?from=lessons`); await page.getByRole("tab", { name: /실습/ }).click();
}

test.describe("순서도 표시와 연결 회귀", () => {
  let originalClass: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => { await page.goto("about:blank"); originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async ({ page }) => { await page.goto("about:blank"); if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass); await db.collection("csWork").doc(`${uid}__${lessonId}`).delete(); });

  test("블록을 반복해서 끌 때 다른 기호와 화면은 움직이지 않고 포인터를 따라간다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await prepare(page, { mission: "free", nodes: [{ id: "start", shape: "terminal", text: "시작", x: 200, y: 40 }, { id: "drag", shape: "process", text: "움직이는 기호", x: 650, y: 270 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 430 }], edges: [], pan: { x: -200, y: -30 } });
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    const node = page.locator('[data-flow-node="drag"]'), start = page.locator('[data-flow-node="start"]');
    const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    await expect(node).toBeVisible();
    const initial = await start.boundingBox();
    for (const delta of [{ x: -250, y: 0 }, { x: 600, y: 60 }, { x: -450, y: -50 }]) {
      const box = (await node.boundingBox())!;
      // Grab the shape above its editable label and away from the connection ports.
      const shape = (await node.locator('[data-flow-shape]').boundingBox())!;
      const grab = { x: shape.x + 55, y: shape.y + 12 };
      await page.mouse.move(grab.x, grab.y); await page.mouse.down();
      for (let step = 1; step <= 10; step++) {
        await page.mouse.move(grab.x + delta.x * step / 10, grab.y + delta.y * step / 10);
        await expect.poll(async () => { const current = (await node.boundingBox())!; return Math.max(Math.abs(current.x - box.x - delta.x * step / 10), Math.abs(current.y - box.y - delta.y * step / 10)); }).toBeLessThanOrEqual(1);
        expect(await start.boundingBox()).toEqual(initial);
        await expect(node).toHaveCSS("outline-style", "none");
      }
      await page.mouse.up();
    }
    await expect(node).toHaveCSS("outline-style", "none");
    await testInfo.attach("flowchart-drag-no-overlay", { body: await viewport.screenshot(), contentType: "image/png" });
    await expect(viewport.locator('[data-flow-node]')).toHaveCount(3);
    await expect(node).toBeFocused();
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
    await expect(node.locator('[data-flow-shape]')).toHaveCSS("stroke-width", "4px");
    await page.keyboard.press("Tab"); await start.focus();
    await expect(start).toHaveAttribute("data-selected", "false");
    await expect(start.locator('[data-flow-shape]')).toHaveCSS("stroke-width", "4px");
    await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
    const saved = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    expect(saved.nodes.find(item => item.id === "drag")).toMatchObject({ x: 550, y: 280 });
    await page.reload();
    await expect(page.locator('[data-flow-node="drag"]')).toHaveAttribute("transform", "translate(550,280)");
    await node.focus(); await page.keyboard.press("ArrowRight");
    await expect(node).toBeFocused();
    await expect(node).toHaveAttribute("transform", "translate(570,280)");
    await expect(node.locator('[data-flow-shape]')).toHaveCSS("stroke-width", "4px");
  });

  test("여러 줄 기호가 모두 표시되고 PNG에도 같은 문구를 담는다", async ({ page }) => {
    const text = "첫째 줄\n둘째 줄\n셋째 줄과 긴 설명을 모두 읽을 수 있어요";
    await page.setViewportSize({ width: 1920, height: 1080 });
    await prepare(page, { mission: "free", nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 40 }, { id: "multiline", shape: "process", text, x: 300, y: 200 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 520 }], edges: [{ from: "start", to: "multiline", label: "" }, { from: "multiline", to: "end", label: "" }] });
    const node = page.locator('[data-flow-node="multiline"]');
    await expect(node).toBeVisible();
    await expect(node.locator('[data-flow-label]').first()).toHaveText("첫째 줄");
    const rendered = await node.locator('[data-flow-label]').allTextContents();
    expect(rendered.join("")).toBe(text.replaceAll("\n", ""));
    expect(await node.evaluate(element => { const shape = element.querySelector<SVGGraphicsElement>("[data-flow-shape]")!.getBBox(); return [...element.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")].every(label => { const b = label.getBBox(); return b.x >= shape.x && b.y >= shape.y && b.x + b.width <= shape.x + shape.width && b.y + b.height <= shape.y + shape.height; }); })).toBe(true);
    await page.evaluate(() => { const original = XMLSerializer.prototype.serializeToString; XMLSerializer.prototype.serializeToString = function (root) { const value = original.call(this, root); if (root instanceof SVGSVGElement) document.documentElement.dataset.exportedFlowSvg = value; return value; }; });
    await page.getByRole("button", { name: /작품 내보내기/ }).click();
    const image = page.getByRole("img", { name: "문제 정의와 자연어 기획서, 순서도를 담은 작품 이미지", exact: true });
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const exported = await page.evaluate(() => { const svg = new DOMParser().parseFromString(document.documentElement.dataset.exportedFlowSvg!, "image/svg+xml"); return [...svg.querySelectorAll('[data-flow-node="multiline"] [data-flow-label]')].map(item => item.textContent).join(""); });
    expect(exported).toBe(text.replaceAll("\n", ""));
    await page.getByRole("dialog", { name: /내 알고리즘 작품 내보내기/ }).press("Escape");
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).nodes.find(n => n.id === "multiline")?.text).toBe(text);
  });

  test("입력 포트는 연결을 시작하지 않고 기존 측면 연결도 재접속 시 보존한다", async ({ page }) => {
    const edges: FlowchartProject["edges"] = [{ from: "start", to: "check", label: "", fromPort: "right", toPort: "left" }, { from: "check", to: "end", label: "예" }, { from: "check", to: "end", label: "아니오" }];
    await prepare(page, { mission: "free", nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 30 }, { id: "check", shape: "decision", text: "준비됐나요?", x: 300, y: 180 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 400 }], edges });
    const input = page.getByRole("button", { name: "준비됐나요? 연결 받기", exact: true });
    await input.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "입력 연결점" })).toContainText("출발");
    await expect(page.locator('[data-flow-canvas] [data-pending-edge]')).toHaveCount(0);
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).edges).toEqual(edges);
    await page.reload();
    await expect(page.locator('[data-flow-edge]').first()).toBeVisible();
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).edges).toEqual(edges);
  });

  test("음수 화면 이동 뒤에도 넓은 작업실 안의 기호가 SVG 경계에서 잘리지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    const nodes: FlowchartProject["nodes"] = [{ id: "start", shape: "terminal", text: "시작", x: 120, y: 40 }, { id: "end", shape: "terminal", text: "종료", x: 750, y: 340 }];
    const pan = { x: -400, y: -80 };
    await prepare(page, { mission: "free", nodes, edges: [], pan });
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    await page.getByRole("button", { name: "기획서 접기", exact: true }).click();
    const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    expect(await viewport.evaluate(element => {
      const frame = element.getBoundingClientRect(), svg = element.querySelector("svg")!.getBoundingClientRect();
      return [...element.querySelectorAll("[data-flow-node]")].every(node => { const box = node.getBoundingClientRect(); return box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom && box.left >= svg.left && box.right <= svg.right && box.top >= svg.top && box.bottom <= svg.bottom; });
    })).toBe(true);
    await viewport.getByRole("button", { name: "종료 기호 문구 편집", exact: true }).click();
    const editor = viewport.getByRole("textbox", { name: "시작·종료 기호 문구 직접 편집", exact: true });
    await expect(editor).toBeFocused(); await editor.press("Escape");
    const restored = (await readWork(page.request)).draft.reviewProject as FlowchartProject;
    expect(restored.nodes).toEqual(nodes); expect(restored.pan).toEqual(pan);
  });

  test("기본 판단선은 좌우로 곧게 분기하고 명시한 연결점과 화살촉 크기를 보존한다", async ({ page }) => {
    const edges: FlowchartProject["edges"] = [{ from: "choice", to: "yes", label: "예" }, { from: "choice", to: "no", label: "아니오" }, { from: "yes", to: "end", label: "", fromPort: "right", toPort: "left" }];
    await prepare(page, { mission: "free", nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 30 }, { id: "choice", shape: "decision", text: "준비됐나요?", x: 300, y: 180 }, { id: "yes", shape: "process", text: "준비한다", x: 80, y: 380 }, { id: "no", shape: "process", text: "다시 확인한다", x: 650, y: 380 }, { id: "end", shape: "terminal", text: "종료", x: 850, y: 550 }], edges });
    const routing = await page.locator('[data-flow-canvas] svg').evaluate(element => {
      const svg = element as SVGSVGElement;
      const choice = svg.querySelector<SVGGElement>('[data-flow-node="choice"]')!, shape = choice.querySelector<SVGGraphicsElement>("[data-flow-shape]")!.getBBox(), offset = choice.transform.baseVal.getItem(0).matrix;
      return { paths: [...svg.querySelectorAll('[data-flow-edge] path[marker-end]')].map(path => path.getAttribute("d")), left: offset.e, right: offset.e + shape.width + 8, sideY: offset.f + (shape.height + 8) / 2, markerUnits: [...svg.querySelectorAll("marker")].map(marker => marker.getAttribute("markerUnits")) };
    });
    expect(routing.paths[0]).toMatch(new RegExp(`^M${routing.left},${routing.sideY} H[\\d.]+ V[\\d.]+$`));
    expect(routing.paths[1]).toMatch(new RegExp(`^M${routing.right},${routing.sideY} H[\\d.]+ V[\\d.]+$`));
    expect(routing.paths[2]).toMatch(/^M290,420 H[\d.]+ V[\d.]+ H850$/);
    expect(routing.markerUnits).toEqual(["userSpaceOnUse", "userSpaceOnUse", "userSpaceOnUse"]);
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).edges).toEqual(edges);
  });

  test("완성한 예시 공방의 예·아니오 분기는 같은 길이의 선으로 좌우에 놓인다", async ({ page }) => {
    await prepare(page, { mission: "guide", guideStep: 4 });
    const branches = page.locator('[data-flow-canvas] [data-flow-edge]').filter({ has: page.locator('text').filter({ hasText: /^(예|아니오)$/ }) });
    await expect(branches).toHaveCount(2);
    const paths = await branches.locator('path[marker-end]').evaluateAll(elements => elements.map(element => element.getAttribute("d")!));
    expect(paths).toHaveLength(2);
    const points = paths.map(path => /^M([\d.]+),([\d.]+) H([\d.]+) V([\d.]+)$/.exec(path));
    expect(points.every(Boolean)).toBe(true);
    const [yes, no] = points.map(point => point!.slice(1).map(Number));
    expect(yes[0] - yes[2]).toBeGreaterThanOrEqual(48);
    expect(no[2] - no[0]).toBe(yes[0] - yes[2]);
    expect(yes[1]).toBe(no[1]); expect(yes[3]).toBe(no[3]);
  });

  test("고정 퍼즐은 FHD에서 불필요한 가로 스크롤 없이 원래 글자 크기로 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await prepare(page, { mission: "1", placements: { "1": { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" } } });
    const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    await expect(viewport.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toBeVisible();
    expect(await viewport.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await viewport.locator('[data-flow-label]').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await viewport.locator("svg").evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(1000);
  });
});
