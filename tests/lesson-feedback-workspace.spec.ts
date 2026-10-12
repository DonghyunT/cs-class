import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const workUrl = "/api/classroom/work/review-flowchart", workId = "student-20101__review-flowchart";
async function readWork(request: APIRequestContext) {
  const response = await request.get(workUrl); expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function prepare(page: Page) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: null, openedLessonIds: ["review-flowchart"] });
  await db.collection("csWork").doc(workId).delete();
  const work = await readWork(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong project");
  Object.assign(work.draft.reviewProject, {
    mission: "free", current: "준비 전", goal: "준비 완료", conditions: ["준비물을 보존"],
    cards: [{ id: "plan", type: "sequence", text: "준비하기", yes: "", no: "" }], pan: { x: 0, y: 0 },
    nodes: [{ id: "start", shape: "terminal", text: "시작", x: 120, y: 40 }, { id: "step", shape: "process", text: "준비하기", x: 120, y: 190 }, { id: "end", shape: "terminal", text: "종료", x: 120, y: 340 }],
    edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }],
  } satisfies Partial<FlowchartProject>);
  expect((await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto("/classroom/review-flowchart?from=lessons");
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.getByLabel("실제 순서도 연결", { exact: true })).toBeVisible();
}

test.describe("수업 피드백 자유 공방", () => {
  let originalClass: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => { await page.goto("about:blank"); originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async ({ page }) => { await page.goto("about:blank"); if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass); await db.collection("csWork").doc(workId).delete(); });

  test("통합 도구에서 기획·점검을 열고 취소하면 초점과 작품을 보존한다", async ({ page }) => {
    await page.setViewportSize({ width: 1544, height: 712 }); await prepare(page);
    const before = (await readWork(page.request)).draft.reviewProject;
    const toolbar = page.getByRole("toolbar", { name: "자유 공방 도구", exact: true });
    for (const name of ["편집", "화면", "점검·내보내기"]) await expect(toolbar.getByRole("group", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "AI 설계 점검 열기", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^(시작으로 보기|화면 원점)$/ })).toHaveCount(0);
    const recipe = toolbar.getByRole("button", { name: "자연어 기획서 채우기", exact: true });
    await recipe.click(); await expect(page.getByRole("dialog", { name: /추상화 처방전/ })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(recipe).toBeFocused();
    const review = toolbar.getByRole("button", { name: "AI 설계 점검 열기", exact: true });
    await review.click(); await expect(page.getByRole("dialog", { name: /Solar AI 설계 점검/ })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(review).toBeFocused();
    const clear = toolbar.getByRole("button", { name: "캔버스 초기화", exact: true });
    await clear.click(); await page.getByRole("dialog", { name: "캔버스를 비울까요?", exact: true }).getByRole("button", { name: "취소", exact: true }).click();
    await expect(clear).toBeFocused();
    expect((await readWork(page.request)).draft.reviewProject).toEqual(before);
    await page.getByRole("button", { name: "선택 카드 추가", exact: true }).click();
    await expect(page.getByLabel("판단 조건", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "반복 카드 추가", exact: true }).click();
    await expect(page.getByLabel("반복 지속 조건", { exact: true })).toBeFocused();
  });

  test("낮은 창에서 네 기호를 읽고 얇은 실행바를 키보드와 드래그로 옮긴다", async ({ page }, info) => {
    await page.setViewportSize({ width: 1544, height: 712 }); await prepare(page);
    const palette = page.getByRole("region", { name: "자유 기호 보관함", exact: true });
    await expect.poll(() => palette.evaluate(element => {
      const rail = element.getBoundingClientRect();
      return [...element.querySelectorAll("button")].every(button => { const box = button.getBoundingClientRect(); return box.top >= rail.top && box.bottom <= rail.bottom && box.bottom <= innerHeight; });
    })).toBe(true);
    expect(await palette.locator("button > span > strong").first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(13);
    const grip = page.getByRole("button", { name: "실행 제어 이동", exact: true });
    expect(await grip.evaluate(element => element.parentElement!.getBoundingClientRect().height)).toBeLessThanOrEqual(44);
    await page.screenshot({ path: info.outputPath("flowchart-free-1544.png"), fullPage: true });
    const before = await grip.boundingBox(); if (!before) throw Error("execution grip missing");
    await grip.focus(); await page.keyboard.press("Shift+ArrowUp");
    await expect.poll(async () => (await grip.boundingBox())!.y).toBe(before.y - 20);
    await page.keyboard.press("Home"); await expect.poll(async () => (await grip.boundingBox())!.y).toBe(before.y);
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2); await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 40, before.y + before.height / 2 - 30, { steps: 4 }); await page.mouse.up();
    expect(await grip.evaluate(element => {
      const bar = element.parentElement!.getBoundingClientRect(), bounds = element.parentElement!.parentElement!.getBoundingClientRect();
      return bar.left >= bounds.left && bar.right <= bounds.right && bar.top >= bounds.top && bar.bottom <= bounds.bottom;
    })).toBe(true);
    await grip.focus(); await page.keyboard.press("Home");
    await expect(page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true }).getByRole("button", { name: "한 단계 실행", exact: true })).toBeVisible();
  });

  test("숨긴 스크롤바에서도 휠·방향키와 SVG 밖 마우스·터치 이동을 보존한다", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 712 }); await prepare(page);
    const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    expect(await viewport.evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe("none");
    expect(await viewport.evaluate(element => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === "auto")).toBe(true);
    await viewport.hover();
    await viewport.evaluate(element => { element.setAttribute("data-scroll-ended", "false"); element.addEventListener("scrollend", () => element.setAttribute("data-scroll-ended", "true"), { once: true }); });
    await page.mouse.wheel(0, 80); await expect(viewport).toHaveAttribute("data-scroll-ended", "true");
    await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    const wheelTop = await viewport.evaluate(element => element.scrollTop);
    await viewport.focus();
    await viewport.evaluate(element => { element.setAttribute("data-scroll-ended", "false"); element.addEventListener("scrollend", () => element.setAttribute("data-scroll-ended", "true"), { once: true }); });
    await page.keyboard.press("ArrowDown"); await expect(viewport).toHaveAttribute("data-scroll-ended", "true");
    await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(wheelTop);
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    await page.getByRole("button", { name: "기획서 접기", exact: true }).click();
    const outside = await viewport.evaluate(element => {
      element.scrollTo({ left: 0, top: 0 });
      const box = element.getBoundingClientRect(), svg = element.querySelector("svg")!.getBoundingClientRect();
      return { x: box.right - 24, y: box.top + 60, svgRight: svg.right, width: box.width };
    });
    expect(outside.x).toBeGreaterThan(outside.svgRight + 20);
    const initialPan = ((await readWork(page.request)).draft.reviewProject as FlowchartProject).pan;
    await page.mouse.move(outside.x, outside.y); await page.mouse.down();
    await page.mouse.move(outside.x - 40, outside.y - 20, { steps: 4 }); await page.mouse.up();
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).pan).toEqual({ x: initialPan.x + 40, y: initialPan.y + 20 });
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: outside.x, y: outside.y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: outside.x - 30, y: outside.y - 10 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await session.detach();
    await expect.poll(async () => ((await readWork(page.request)).draft.reviewProject as FlowchartProject).pan).toEqual({ x: initialPan.x + 70, y: initialPan.y + 30 });
  });
});
