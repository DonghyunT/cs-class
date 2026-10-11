import { expect, test } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork } from "../src/lib/classroom/progress";
import { db, headers, readyStudent, readyTeacher } from "./emulator";

const previewUrl = (id: string) => `/teacher/preview/${id}?classId=2-1`;
const evaluateUrl = (id: string) => `/api/teacher-preview/${id}/evaluate`;
async function learningRecords() {
  const result: Record<string, unknown> = {};
  for (const collection of ["csWork", "csHelpRequests", "csHelpSnapshots", "csAiUsage", "csAiRequests", "csAiCache"]) {
    const snapshot = await db.collection(collection).get();
    result[collection] = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })).sort((a, b) => a.id.localeCompare(b.id));
  }
  return result;
}

test("teacher-preview: 7수업 실제 화면·메모리 답안·초기화·학생 기록 불변", async ({ page }) => {
  test.setTimeout(90000);
  await readyTeacher(page.request);
  const before = await learningRecords();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const studentRequests: string[] = [];
  page.on("request", request => { if (/\/api\/classroom\/(work\/|student(?:[/?]|$)|ai(?:[/?]|$)|help(?:[/?]|$))/.test(request.url())) studentRequests.push(request.url()); });
  for (const lesson of LESSONS) {
    await page.goto(previewUrl(lesson.id));
    await expect(page.getByText("교사 미리보기 · 이 창에서만 체험", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lesson.title);
    await expect(page.getByRole("button", { name: "손들기", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "학생 메뉴", exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: /^실습/ }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    if (lesson.practice.type === "entryjs" || lesson.practice.type === "programming") {
      await page.locator("iframe").scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
    }
    await page.locator("[data-lesson-shell] > header").getByRole("button", { name: "체험 초기화", exact: true }).click();
    await expect(page.getByRole("tab", { name: /^개념/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-lesson-shell] > header").getByRole("button", { name: "체험 초기화", exact: true })).toBeFocused();
  }
  await page.goto(previewUrl("sequence-lab"));
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  const evaluation = page.waitForResponse(response => response.url().includes(evaluateUrl("sequence-lab")) && response.request().method() === "POST");
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  expect((await evaluation).status()).toBe(200);
  await expect(page.getByRole("tab", { name: "개념 50%", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).not.toBeChecked();
  await expect(page.getByRole("link", { name: "수업 관리로 돌아가기", exact: true })).toHaveAttribute("href", "/teacher/classes?classId=2-1");
  expect(studentRequests).toEqual([]);
  expect(await learningRecords()).toEqual(before);
  expect(errors).toEqual([]);
});

test("teacher-preview-entry: 그림을 불러오는 중 초기화해도 분리된 작업실의 늦은 오류를 보내지 않는다", async ({ page }) => {
  await readyTeacher(page.request);
  const before = await learningRecords(), errors: string[] = [], studentRequests: string[] = [], cancelled: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (/\/api\/classroom\/(work\/|student(?:[/?]|$)|ai(?:[/?]|$)|help(?:[/?]|$))/.test(request.url())) studentRequests.push(request.url()); });
  page.on("requestfailed", request => { if (request.url().endsWith("/entryjs/name-dog.svg")) cancelled.push(request.failure()?.errorText ?? "request failed"); });
  let release = () => {}, waiting = 0, hold = true;
  const asset = new Promise<void>(resolve => { release = resolve; });
  const pendingRoutes: Promise<void>[] = [];
  await page.route("**/entryjs/name-dog.svg", route => {
    if (!hold) return route.continue();
    waiting++;
    const pending = (async () => { await asset; await route.continue(); })();
    pendingRoutes.push(pending);
    return pending;
  });
  try {
    await page.goto(previewUrl("programming-13"));
    await page.evaluate(() => {
      const state = window as unknown as { previewEntryErrors: string[] };
      state.previewEntryErrors = [];
      window.addEventListener("message", event => {
        if (event.data?.channel === "cs-class-entryjs" && event.data.type === "error") state.previewEntryErrors.push(event.data.type);
      });
    });
    await page.getByRole("tab", { name: /^실습/ }).click();
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect.poll(() => waiting, { timeout: 20000 }).toBeGreaterThan(0);
    const oldFrame = page.frames().find(frame => frame.url().includes("mission=name"));
    if (!oldFrame) throw Error("name workspace frame missing");
    await expect.poll(() => oldFrame.evaluate(() => (window as unknown as { Entry?: { isLoadProject: boolean } }).Entry?.isLoadProject)).toBe(true);
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeDisabled();
    const reset = page.locator("[data-lesson-shell] > header").getByRole("button", { name: "체험 초기화", exact: true });
    await expect(reset).toBeEnabled(); await reset.click();
    await expect(page.getByRole("tab", { name: /^개념/ })).toHaveAttribute("aria-selected", "true");
    await expect(reset).toBeFocused(); await expect(page.locator("iframe")).toHaveCount(0);
    await expect.poll(() => oldFrame.isDetached()).toBe(true);
    hold = false; release(); await Promise.all(pendingRoutes);
    await expect.poll(() => cancelled.length).toBeGreaterThan(0);
    await page.getByRole("tab", { name: /^실습/ }).click();
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
    const newFrame = page.frames().find(frame => frame.url().includes("mission=name"));
    expect(newFrame).toBeDefined(); expect(newFrame).not.toBe(oldFrame);
    await expect(page.getByRole("button", { name: "작업실 다시 불러오기", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { previewEntryErrors: string[] }).previewEntryErrors)).toEqual([]);
    expect(studentRequests).toEqual([]); expect(await learningRecords()).toEqual(before); expect(errors).toEqual([]);
  } finally { hold = false; release(); await page.unrouteAll({ behavior: "wait" }); await Promise.allSettled(pendingRoutes); }
});

test("teacher-preview: 평가 실패 입력 보존·로컬 샌드위치·AI와 학생 기록 가져오기 차단", async ({ page }) => {
  await readyTeacher(page.request);
  await page.goto(previewUrl("sequence-lab"));
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  await page.route(`**${evaluateUrl("sequence-lab")}`, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "합성 체험 평가 실패" }) }));
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).toBeChecked();
  await expect(page.locator("#work-action-error")).toContainText("합성 체험 평가 실패");
  await page.unrouteAll();
  await page.goto(previewUrl("review-sandwich"));
  await page.getByRole("tab", { name: /^실습/ }).click();
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
  await page.goto(previewUrl("review-flowchart"));
  await page.getByRole("tab", { name: /^실습/ }).click();
  await page.getByRole("button", { name: "🚀 5. 나만의 백지", exact: true }).click();
  await page.getByRole("button", { name: /처방전 채우기/ }).click();
  await page.getByText("추상화 기록에서 가져오기", { exact: true }).click();
  await expect(page.getByRole("button", { name: "추상화 기록 살펴보기", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /AI 기획서 제안 받기/ })).toBeDisabled();
});

test("teacher-preview: 익명·학생·담당 외 반·승인 필드·잘못된 문항 거부", async ({ request, page }) => {
  const lesson = LESSONS.find(item => item.id === "sequence-lab")!;
  const payload = { classId: "2-1", work: emptyWork(lesson), action: { type: "grade-quiz" } };
  expect((await request.post(evaluateUrl(lesson.id), { headers, data: payload })).status()).toBe(401);
  await page.goto(previewUrl(lesson.id));
  await expect(page).toHaveURL(/\/login\/teacher$/);
  await readyStudent(request);
  expect((await request.post(evaluateUrl(lesson.id), { headers, data: payload })).status()).toBe(403);
  await readyStudent(page.request);
  await page.goto(previewUrl(lesson.id));
  await expect(page).toHaveURL(/\/teacher\/classes$/);
  await expect(page.getByText("교사 미리보기 · 이 창에서만 체험", { exact: true })).toHaveCount(0);
  await readyTeacher(page.request);
  expect((await page.request.post(evaluateUrl(lesson.id), { headers, data: { ...payload, classId: "2-99" } })).status()).toBe(403);
  await page.goto(`/teacher/preview/${lesson.id}?classId=2-99`);
  await expect(page).toHaveURL(/\/teacher\/classes$/);
  await expect(page.getByText("교사 미리보기 · 이 창에서만 체험", { exact: true })).toHaveCount(0);
  expect((await page.request.post(evaluateUrl(lesson.id), { headers, data: { ...payload, work: { ...payload.work, aiReview: { verdict: "pass" } } } })).status()).toBe(400);
  expect((await page.request.post(evaluateUrl(lesson.id), { headers, data: { ...payload, action: { type: "check-concept", conceptId: "unknown" } } })).status()).toBe(400);
  expect((await page.request.post(evaluateUrl(lesson.id), { headers, data: { ...payload, work: { ...payload.work, draft: { ...payload.work.draft, conceptAnswers: { unknown: "a" } } } } })).status()).toBe(400);
});

test("teacher-preview-entry: 실제 조립·질문 응답·보기 전환·체험 제출·미완성 메모리 복원", async ({ page }, info) => {
  test.setTimeout(90000);
  await readyTeacher(page.request);
  const before = await learningRecords(), studentRequests: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/\/api\/classroom\/(work\/|student(?:[/?]|$)|ai(?:[/?]|$)|help(?:[/?]|$))/.test(request.url())) studentRequests.push(request.url()); });
  await page.setViewportSize({ width: 1840, height: 1000 });
  await page.goto(previewUrl("programming-13"));
  await page.getByRole("tab", { name: /^실습/ }).click();
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  const frame = page.frameLocator("iframe");
  const menu = frame.locator("#entryWorkspaceBlockMenu g.block"), board = frame.locator("#entryWorkspaceBoard g.block");
  // Same palette coordinates and real drag used by programming-classroom.
  const connect = async (source: import("@playwright/test").Locator, target: import("@playwright/test").Locator, offsetY: number, offsetX = 40, targetX = offsetX) => {
    await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
    await expect.poll(() => source.evaluate(element => (element as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
    const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
    await page.mouse.move(from.x + offsetX, from.y + 15); await page.mouse.down();
    await page.mouse.move(to.x + targetX, to.y + offsetY, { steps: 12 }); await page.mouse.up();
  };
  await frame.getByText("자료", { exact: true }).click();
  await connect(menu.filter({ hasText: "묻고 대답 기다리기" }).first(), board.filter({ hasText: "시작하기 버튼" }).first(), 46);
  await frame.getByText("생김새", { exact: true }).click();
  await connect(menu.filter({ hasText: "초 동안" }).first(), board.filter({ hasText: "묻고 대답 기다리기" }).last(), 42, 140);
  await frame.getByText("자료", { exact: true }).click();
  await connect(menu.filter({ hasText: /^\s*대답\s*$/ }).first(), board.filter({ hasText: "초 동안" }).last().getByText("안녕!", { exact: true }).locator(".."), 12, 18, -8);
  await frame.locator("#entryWorkspaceBoard").getByText("4", { exact: true }).first().locator("..").click();
  const durationInput = frame.locator("input.entry-widget-input-field:visible");
  await durationInput.fill("0.2"); await durationInput.press("Enter");
  const iframe = (await page.locator("iframe").elementHandle())!;
  const input = frame.getByLabel("강아지 이름 대답");
  const clickCanvas = async (submit = false) => {
    await page.locator("iframe").scrollIntoViewIfNeeded();
    const native = page.frames().find(item => item.url().includes("mission=name"))!;
    const point = () => native.evaluate(submit => {
      const stage = (window as unknown as { Entry: { stage: {
        inputField: { _canvas: HTMLCanvasElement; _x: number; _y: number; _width: number; _height: number; _padding: number; _isHidden: boolean };
        inputSubmitButton: { getBounds: () => { x: number; y: number; width: number; height: number } | null; localToGlobal: (x: number, y: number) => { x: number; y: number } };
      } } }).Entry.stage;
      const field = stage.inputField, bounds = stage.inputSubmitButton.getBounds(), canvas = field._canvas, rect = canvas.getBoundingClientRect();
      if (field._isHidden || !bounds || !rect.width || !rect.height) return null;
      const point = submit ? stage.inputSubmitButton.localToGlobal(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        : { x: field._x + Math.min(40, field._width / 2), y: field._y + field._padding + field._height / 2 };
      return { x: rect.x + point.x * rect.width / canvas.width, y: rect.y + point.y * rect.height / canvas.height };
    }, submit);
    await expect.poll(point).not.toBeNull();
    const position = (await point())!, rect = (await page.locator("iframe").boundingBox())!;
    await page.mouse.click(rect.x + position.x, rect.y + position.y);
  };
  for (const [index, name] of ["교사 초코", "교사 보리"].entries()) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    await expect(input).toBeVisible(); await clickCanvas(); await expect(input).toBeFocused();
    await page.keyboard.insertText(name);
    if (index === 0) {
      await page.getByRole("button", { name: "실습 집중 모드", exact: true }).click();
      await page.getByRole("button", { name: "작업실 넓게 보기", exact: true }).click();
      expect(await iframe.evaluate(element => element === document.querySelector("iframe"))).toBe(true);
      await expect(page.getByRole("button", { name: "실행 정지", exact: true })).toBeEnabled();
      await expect(input).toHaveValue(name); await expect(input).toBeVisible();
      await clickCanvas(); await expect(input).toBeFocused(); await page.keyboard.press("Enter");
    } else await clickCanvas(true);
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
    await expect(page.getByRole("status", { name: "서로 다른 이름 확인", exact: true })).toHaveText(`서로 다른 이름 확인 ${index + 1}/2`);
  }
  await expect(page.locator("[data-lesson-shell]")).toHaveAttribute("data-practice-focused", "true");
  await expect(page.locator("[data-lesson-shell]")).toHaveAttribute("data-workspace-wide", "true");
  const evaluation = page.waitForResponse(response => response.url().includes(evaluateUrl("programming-13")) && response.request().method() === "POST");
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  expect((await evaluation).status()).toBe(200);
  await page.getByRole("button", { name: "체험 제출", exact: true }).click();
  await expect(page.getByRole("button", { name: "체험 제출 확인", exact: true })).toBeDisabled();
  await page.getByText("단계 바꾸기", { exact: true }).click();
  await expect(page.getByRole("tab", { name: /^실습/ })).toContainText("1/4개 제출");
  await frame.locator("#entryWorkspaceBoard").getByText("0.2", { exact: true }).first().locator("..").click();
  await durationInput.fill("");
  // Leaving without Enter exercises the preview controller's native-field flush.
  await expect(page.getByText("단계 바꾸기", { exact: true }).locator("..")).toHaveAttribute("open", "");
  await page.getByRole("tab", { name: /^퀴즈/ }).click();
  await page.getByRole("tab", { name: /^실습/ }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  // Read the restored engine only after execution has stopped; no export in run.
  const restoredProject = () => page.frames().find(item => item.url().includes("mission=name"))!.evaluate(() => {
    const project = (window as unknown as { Entry: { exportProject: () => { objects: { script: unknown }[] } } }).Entry.exportProject();
    const script = project.objects[0].script;
    const blocks = (typeof script === "string" ? JSON.parse(script) : script) as { type: string; params: unknown[] }[][];
    return {
      duration: (blocks.flat().find(block => block.type === "dialog_time")!.params[1] as { params: string[] }).params[0],
      questions: blocks.flat().filter(block => block.type === "ask_and_wait").length,
    };
  });
  // Entry's SVG nests connected block groups; count semantic blocks, not ancestor matches.
  await expect.poll(restoredProject).toEqual({ duration: "", questions: 1 });
  await page.getByText("단계 바꾸기", { exact: true }).click();
  await expect(page.getByRole("tab", { name: /^실습/ })).toContainText("1/4개 제출");
  await page.screenshot({ path: info.outputPath("teacher-preview-entry-memory.png"), fullPage: false });
  await page.reload();
  await expect(page.getByRole("tab", { name: /^개념/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /^실습/ }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  await expect(board.filter({ hasText: "묻고 대답 기다리기" })).toHaveCount(0);
  await expect(board.filter({ hasText: "초 동안" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /^실습/ })).toContainText("0/4개 제출");
  expect(studentRequests).toEqual([]);
  expect(await learningRecords()).toEqual(before);
  expect(errors).toEqual([]);
});
