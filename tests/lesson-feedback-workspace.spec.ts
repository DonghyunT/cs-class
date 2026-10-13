import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { FlowchartProject } from "../src/lib/classroom/review/project";

const workUrl = "/api/classroom/work/review-flowchart", workId = "student-20101__review-flowchart";
async function readWork(request: APIRequestContext) {
  const response = await request.get(workUrl); expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function prepare(page: Page, patch: Partial<FlowchartProject> = {}) {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: "programming-13", openedLessonIds: ["programming-13", "review-flowchart"] });
  await db.collection("csWork").doc(workId).delete();
  const work = await readWork(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw Error("wrong project");
  Object.assign(work.draft.reviewProject, {
    mission: "free", current: "준비 전", goal: "준비 완료", conditions: ["준비물을 보존"],
    cards: [{ id: "plan", type: "sequence", text: "준비하기", yes: "", no: "" }], pan: { x: 0, y: 0 },
    nodes: [{ id: "start", shape: "terminal", text: "시작", x: 120, y: 40 }, { id: "step", shape: "process", text: "준비하기", x: 120, y: 190 }, { id: "end", shape: "terminal", text: "종료", x: 120, y: 340 }],
    edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }],
  } satisfies Partial<FlowchartProject>, patch);
  expect((await page.request.post(workUrl, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto("/classroom/review-flowchart?from=lessons");
  await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.getByLabel("실제 순서도 연결", { exact: true })).toBeVisible();
}

test.describe("수업 피드백 자유 공방", () => {
  let originalClass: FirebaseFirestore.DocumentData | undefined;
  test.beforeEach(async ({ page }) => { await page.goto("about:blank"); originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
  test.afterEach(async ({ page }) => { await page.goto("about:blank"); if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass); await db.collection("csWork").doc(workId).delete(); });

  test("FHD 기획서는 넓은 입력과 가운데 추가 버튼을 제공하고 안내 줄은 공간을 겹치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 }); await prepare(page);
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    const planner = page.getByRole("region", { name: "자연어 기획서", exact: true });
    expect((await planner.boundingBox())!.width).toBeGreaterThanOrEqual(288);
    const add = planner.getByRole("button", { name: "선택 카드 추가", exact: true });
    await expect(add).toContainText("+");
    expect(await add.evaluate(element => getComputedStyle(element).justifyContent)).toBe("center");
    const hint = page.getByRole("status").filter({ hasText: "기호를 클릭해 내용을 수정" });
    expect(await hint.evaluate(element => getComputedStyle(element).borderBottomWidth)).toBe("0px");
    expect(await planner.getByLabel("실행 계획", { exact: true }).evaluate(element => element.clientWidth)).toBeGreaterThanOrEqual(235);
  });

  test("예시 공방은 한 상단 도구줄과 넓은 순서도에서 조건 선택과 실행 결과를 보여준다", async ({ page }, info) => {
    await page.setViewportSize({ width: 1920, height: 900 }); await prepare(page, { mission: "guide", guideStep: 4 });
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    await expect(page.getByRole("heading", { name: "실행 과정", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "출력 콘솔", exact: true })).toHaveCount(0);
    const toolbar = page.getByRole("toolbar", { name: "순서도 실행 제어", exact: true });
    const reset = page.getByRole("button", { name: /공방 다시 보기/ });
    const geometry = await toolbar.evaluate(element => ({ top: element.getBoundingClientRect().top, resetTop: [...element.closest("header")!.querySelectorAll("button")].find(button => button.textContent?.includes("공방 다시 보기"))!.getBoundingClientRect().top }));
    expect(Math.abs(geometry.top - geometry.resetTop)).toBeLessThanOrEqual(3);
    const viewport = page.getByLabel("실제 순서도 연결", { exact: true });
    expect((await viewport.boundingBox())!.height).toBeGreaterThan(450);
    await toolbar.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await toolbar.getByRole("button", { name: "자동 실행", exact: true }).click();
    await page.getByRole("button", { name: "07:20 · 예로 진행", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "종료에 도달했어요!" })).toBeVisible();
    await expect(viewport.locator('[data-flow-node="end"]')).toHaveAttribute("data-active", "true");
    await page.screenshot({ path: info.outputPath("guide-fhd.png") });
    await reset.click();
    await expect(viewport.locator('[data-flow-node]')).toHaveCount(1);
  });

  test("FHD 퍼즐은 기호 보관함과 입력·변수·출력 콘솔을 스크롤 없이 함께 보여준다", async ({ page }, info) => {
    await page.setViewportSize({ width: 1920, height: 900 }); await prepare(page, { mission: "2", placements: { "2": { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" } } });
    await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
    const palette = page.getByRole("region", { name: "순서도 기호 보관함", exact: true });
    expect(await palette.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
    const execution = page.getByRole("region", { name: "순서도 실행", exact: true });
    await execution.getByLabel("실행 속도", { exact: true }).selectOption("2");
    await execution.getByRole("button", { name: "자동 실행", exact: true }).click();
    await page.getByLabel("키 입력값", { exact: true }).fill("123");
    await page.getByRole("button", { name: "입력값 적용", exact: true }).click();
    await expect(execution.getByRole("region", { name: "출력 콘솔", exact: true })).toContainText("탑승 불가");
    await expect(execution.getByRole("button", { name: "다음 미션: 반복 구조", exact: true })).toBeEnabled();
    expect(await execution.evaluate(element => { const frame = element.getBoundingClientRect(), console = element.querySelector('[aria-label="출력 콘솔"]')!.getBoundingClientRect(), button = [...element.querySelectorAll("button")].find(button => button.textContent?.includes("다음 미션:"))!.getBoundingClientRect(); return console.top >= frame.top && console.bottom <= frame.bottom && button.bottom <= frame.bottom && frame.bottom <= innerHeight; })).toBe(true);
    expect(await execution.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
    await page.screenshot({ path: info.outputPath("puzzle-fhd.png") });
  });

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
    const visiblePan = () => page.getByLabel("실제 순서도 연결", { exact: true }).locator('svg[aria-label="기호와 화살표로 연결한 순서도"]').evaluate(svg => ({ x: (svg as SVGSVGElement).viewBox.baseVal.x, y: (svg as SVGSVGElement).viewBox.baseVal.y }));
    await expect.poll(visiblePan).toEqual({ x: initialPan.x + 40, y: initialPan.y + 20 });
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).pan).toEqual(initialPan);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: outside.x, y: outside.y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: outside.x - 30, y: outside.y - 10 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await session.detach();
    await expect.poll(visiblePan).toEqual({ x: initialPan.x + 70, y: initialPan.y + 30 });
    expect(((await readWork(page.request)).draft.reviewProject as FlowchartProject).pan).toEqual(initialPan);
  });
});
