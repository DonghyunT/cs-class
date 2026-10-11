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
