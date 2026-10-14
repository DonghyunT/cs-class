import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { expect, test, type Page } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";

const id = "review-abstraction", endpoint = `/api/classroom/work/${id}`;
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async ({ page }) => {
  originalClass = (await db.doc("csClasses/2-1").get()).data();
  await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({ openedLessonIds: [id, "review-flowchart", "programming-13"], currentLessonId: id });
  await db.doc(`csWork/student-20101__${id}`).delete();
  const initial = await (await page.request.get(endpoint)).json();
  const response = await page.request.post(endpoint, { headers, data: { revision: initial.revision, draft: { ...initial.draft, stage: "practice", reviewProject: { ...initial.draft.reviewProject, tutorialDone: true, view: "workbook", goal: "테스트 목표" } } } });
  expect(response.status()).toBe(200);
  await page.goto(`/classroom/${id}`);
  await expect(page.getByLabel("현재 상태", { exact: true })).toBeVisible();
});
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  await db.doc(`csWork/student-20101__${id}`).delete();
  await db.recursiveDelete(db.doc("csHelpRequests/student-20101"));
  await db.doc("csHelpSnapshots/student-20101").delete();
  await db.doc("csHelpLimits/student-20101").delete();
  if (originalClass) await db.doc("csClasses/2-1").set(originalClass);
});
async function stored(page: Page) { return (await (await page.request.get(endpoint)).json()).draft.reviewProject.current; }
const save = (page: Page) => page.getByRole("button", { name: "저장", exact: true });

test("편집·주기·hidden에는 저장하지 않고 저장 버튼으로만 초안을 복원한다", async ({ page }) => {
  let posts = 0; page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === endpoint) posts++; });
  await page.getByLabel("현재 상태", { exact: true }).fill("명시 저장할 내용");
  await page.waitForTimeout(5500);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { Reflect.deleteProperty(document, "visibilityState"); });
  expect(posts).toBe(0); expect(await stored(page)).toBe("");
  await save(page).click(); await expect(page.getByText("저장 완료", { exact: true }).first()).toBeVisible();
  expect(posts).toBe(1); await save(page).click(); expect(posts).toBe(1);
  await page.reload(); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("명시 저장할 내용");
});

test("저장 중 추가 편집은 자동 후속 저장 없이 다음 저장까지 유지한다", async ({ page }) => {
  let release!: () => void, started!: () => void, posts = 0;
  const gate = new Promise<void>(resolve => { release = resolve; }), pending = new Promise<void>(resolve => { started = resolve; });
  await page.route(`**${endpoint}`, async route => { if (route.request().method() !== "POST") return route.continue(); posts++; const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); });
  await page.getByLabel("현재 상태", { exact: true }).fill("snapshot A");
  try { await save(page).click(); await pending; await page.getByLabel("현재 상태", { exact: true }).fill("추가 편집 B"); } finally { release(); }
  await expect(page.getByText("저장하지 않은 변경 있음", { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(1200); expect(posts).toBe(1); expect(await stored(page)).toBe("snapshot A");
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("추가 편집 B");
  await save(page).click(); await expect.poll(() => stored(page)).toBe("추가 편집 B"); expect(posts).toBe(2);
});

test("위치만 바꾸면 저장 요청·나가기 경고가 없고 내용은 단계 이동 뒤 보존한다", async ({ page }) => {
  let posts = 0; page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === endpoint) posts++; });
  await page.getByRole("tab", { name: /개념/ }).click(); await page.getByRole("tab", { name: /실습/ }).click();
  expect(posts).toBe(0); await expect(page.getByText("저장하지 않은 변경 있음", { exact: true })).toHaveCount(0);
  await page.getByLabel("현재 상태", { exact: true }).fill("단계간 메모리");
  await page.getByRole("tab", { name: /개념/ }).click(); await page.getByRole("tab", { name: /실습/ }).click();
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("단계간 메모리"); expect(posts).toBe(0);
});

test("미저장 나가기 취소·폐기는 초점을 복구하고 폐기 초안을 되살리지 않는다", async ({ page }) => {
  await page.getByLabel("현재 상태", { exact: true }).fill("폐기할 내용");
  const leave = page.getByRole("link", { name: "수업 나가기", exact: true }); await leave.click();
  const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" }); await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(leave).toBeFocused();
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("폐기할 내용");
  await leave.click(); await dialog.getByRole("button", { name: "저장하지 않고 나가기", exact: true }).click(); await expect(page).toHaveURL(/\/student\/lessons$/);
  await page.goto(`/classroom/${id}`); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("");
});

test("저장 후 나가기 실패는 입력을 보존하고 재시도 성공 후 이동한다", async ({ page }) => {
  let fail = true;
  await page.route(`**${endpoint}`, route => route.request().method() === "POST" && fail ? route.fulfill({ status: 503, json: { code: "UNAVAILABLE", message: "합성 저장 실패" } }) : route.continue());
  await page.getByLabel("현재 상태", { exact: true }).fill("실패해도 보존"); await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" }); await dialog.getByRole("button", { name: "저장 후 나가기", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/classroom/${id}$`)); await expect(page.locator("#work-save-error")).toContainText("합성 저장 실패");
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("실패해도 보존"); fail = false;
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click(); await dialog.getByRole("button", { name: "저장 후 나가기", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/lessons$/); expect(await stored(page)).toBe("실패해도 보존");
});

test("Ctrl+S는 학생 초안을 저장하고 손들기는 최신 작품을 별도 저장한다", async ({ page }) => {
  test.skip(!CLASSROOM_HELP_ENABLED, "손들기 활성 모드 검사; 일반 Ctrl+S는 별도 검사");
  const input = page.getByLabel("현재 상태", { exact: true }); await input.fill("단축키 저장"); await input.press("Control+s");
  await expect.poll(() => stored(page)).toBe("단축키 저장"); await input.fill("도움 요청본");
  const helpResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/help" && response.request().method() === "POST");
  await page.getByRole("button", { name: "손들기", exact: true }).click(); expect((await helpResponse).status()).toBe(200);
  await expect.poll(() => stored(page)).toBe("도움 요청본"); await expect(page.getByRole("dialog")).toHaveCount(0);
  const snapshot = (await db.doc("csHelpSnapshots/student-20101").get()).data(); expect(snapshot?.work.draft.reviewProject.current).toBe("도움 요청본");
});

test("순서도 직접 편집칸의 Ctrl+S와 반복 키·조합 키는 저장 호출을 구분한다", async ({ page }) => {
  await page.goto("about:blank"); const flow = "review-flowchart", path = `/api/classroom/work/${flow}`;
  const work = await (await page.request.get(path)).json();
  const project = { ...work.draft.reviewProject, mission: "free", nodes: [{ id: "start", shape: "terminal", text: "시작", x: 300, y: 60 }, { id: "step", shape: "process", text: "처리", x: 300, y: 210 }, { id: "end", shape: "terminal", text: "종료", x: 300, y: 370 }], edges: [] };
  expect((await page.request.post(path, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", reviewProject: project } } })).status()).toBe(200);
  await page.goto(`/classroom/${flow}`); await page.getByRole("button", { name: "처리 기호: 처리", exact: true }).dblclick();
  const editor = page.getByRole("textbox", { name: "처리 기호 문구 직접 편집", exact: true }); await editor.fill("직접 편집 저장");
  let posts = 0; page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === path) posts++; });
  await editor.dispatchEvent("keydown", { key: "s", ctrlKey: true, repeat: true });
  await editor.dispatchEvent("keydown", { key: "s", ctrlKey: true, isComposing: true, keyCode: 229 }); expect(posts).toBe(0);
  await editor.press("Control+s"); await expect.poll(async () => (await (await page.request.get(path)).json()).draft.reviewProject.nodes.find((node: { id: string }) => node.id === "step").text).toBe("직접 편집 저장");
  expect(posts).toBe(1); await expect(editor).toBeFocused(); await db.doc(`csWork/student-20101__${flow}`).delete();
});

test("저장 조작은 PC·모바일·낮은 창에서 접근 가능하고 성공이 초점을 빼앗지 않는다", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 600 }, { width: 1280, height: 600 }]) {
    await page.setViewportSize(viewport); await page.getByLabel("현재 상태", { exact: true }).fill(`화면 ${viewport.width}`);
    await save(page).focus(); await page.keyboard.press("Enter"); await expect(page.locator("[data-lesson-shell] header [role=status]")).toHaveText("저장 완료"); await expect(save(page)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await save(page).boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    if (viewport.width !== 1280) await page.screenshot({ path: info.outputPath(`manual-save-${viewport.width}.png`) });
  }
  expect(errors).toEqual([]);
});

test("브라우저 새로고침 경고 취소는 미저장 입력을 지키고 종료 저장을 보내지 않는다", async ({ page }) => {
  let posts = 0, warnings = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === endpoint) posts++; });
  page.on("dialog", async dialog => { expect(dialog.type()).toBe("beforeunload"); warnings++; await dialog.dismiss(); });
  const input = page.getByLabel("현재 상태", { exact: true });
  await input.click(); await input.fill("새로고침 취소 후 보존");
  await page.evaluate(() => location.reload());
  expect(warnings).toBe(1); expect(posts).toBe(0); await expect(input).toHaveValue("새로고침 취소 후 보존");
  await save(page).click(); await expect(page.locator('[data-lesson-shell] header [role=status]')).toHaveText("저장 완료");
  await page.reload(); expect(warnings).toBe(1); expect(posts).toBe(1); await expect(input).toHaveValue("새로고침 취소 후 보존");
});
