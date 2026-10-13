import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildEntryProject, parseEntryProject } from "../src/lib/classroom/entry-project";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword, saveDraft } from "./emulator";

const studentId = "20104";
const lessonId = "entry-bot-lab";
const endpoint = `/api/classroom/work/${lessonId}`;

async function connect(page: Page, source: Locator, target: Locator, offsetY: number, offsetX = 40) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  // EntryJS updates the newly selected palette's model coordinates after drawing.
  await expect.poll(() => source.evaluate((element) => (element as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + offsetX, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(to.x + offsetX, to.y + offsetY, { steps: 12 });
  await page.mouse.up();
}

async function enter(page: Page, project?: string, waitForReady = true) {
  await resetStudent(page.request, studentId);
  await db.collection("csWork").doc(`student-${studentId}__${lessonId}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lessonId, openedLessonIds: ["sequence-lab", lessonId] });
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  if (project) {
    const work: Work = await (await page.request.get(endpoint)).json();
    expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, entryProject: project, practiceOrder: parseEntryProject(project)!.order } } })).status()).toBe(200);
  }
  await page.goto(`/classroom/${lessonId}`);
  await page.getByRole("tab", { name: "실습 0%" }).click();
  if (waitForReady) await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return page.frameLocator('iframe[title="엔트리봇 블록 편집기와 실행 무대"]');
}

test("실제 EntryJS 블록 조립·실행·저장·검증·제출·복원", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const frame = await enter(page);
  await expect(frame.locator("#entryCanvas")).toBeVisible();
  await expect(frame.locator("#entryWorkspaceBoard")).toBeVisible();
  await expect(frame.locator("#load-error")).toBeHidden();
  await frame.getByText("움직임", { exact: true }).click();
  const move = frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "이동 방향으로" }).first();
  const start = frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "시작하기 버튼" }).first();
  await connect(page, move, start, 46);
  await saveDraft(page);
  await saveDraft(page);
  const stored = async (): Promise<Work> => (await page.request.get(endpoint)).json();
  await expect.poll(async () => parseEntryProject((await stored()).draft.entryProject)?.order).toEqual(["when_run_button_click", "move_direction"]);
  await frame.getByText("생김새", { exact: true }).click();
  const say = frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "초 동안" }).first();
  const connectedMove = frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: /^이동 방향으로10만큼 움직이기$/ }).first();
  await connect(page, say, connectedMove, 42, 140);
  await saveDraft(page);
  await saveDraft(page);
  await expect.poll(async () => parseEntryProject((await stored()).draft.entryProject)?.order).toEqual(["when_run_button_click", "move_direction", "dialog_time"]);
  await frame.locator("#entryWorkspaceBoard").getByText("4", { exact: true }).locator("..").click();
  const input = frame.locator("input:not([disabled]):visible");
  await input.fill("2"); await input.press("Enter");
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByText("실행을 마쳤어요. 현재 위치 X 10 · Y 0 · 마지막 말: 안녕!", { exact: true })).toBeVisible();
  const native = page.frames().find((item) => item.url().endsWith("/entryjs/workspace.html"))!;
  expect(await native.evaluate(() => (window as unknown as { Entry: { container: { getObject: (id: string) => { entity: { getX: () => number } } } } }).Entry.container.getObject("entrybot").entity.getX())).toBe(0);
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByText("검증 통과 · 아직 제출 전이에요.")).toBeVisible();
  await expect(page.locator("#practice-feedback")).toBeFocused();
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("tab", { name: "실습 100%" })).toBeVisible();
  await expect(page.locator("#submitted-heading")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("entryjs-desktop.png"), fullPage: true });
  const submitted = (await stored()).submission;
  await page.reload();
  await expect(page.getByRole("button", { name: "이 작품 제출 완료" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true }).locator("..").click();
  await frame.locator("input:not([disabled]):visible").fill("20");
  expect(parseEntryProject((await stored()).draft.entryProject)?.threads[0][1]).toEqual({ type: "move_direction", amount: 10 });
  // Editing stays local and must not close an active native field.
  await expect(frame.locator("input:not([disabled]):visible")).toBeFocused();
  await frame.locator("input:not([disabled]):visible").press("End");
  await frame.locator("input:not([disabled]):visible").pressSequentially("1");
  await expect(frame.locator("input:not([disabled]):visible")).toHaveValue("201");
  await frame.locator("input:not([disabled]):visible").fill("20");
  await frame.locator("input:not([disabled]):visible").press("Enter");
  await expect(page.getByRole("button", { name: "수정한 작품 제출" })).toBeDisabled();
  await saveDraft(page);
  await expect.poll(async () => parseEntryProject((await stored()).draft.entryProject)?.threads[0][1]).toEqual({ type: "move_direction", amount: 20 });
  expect((await stored()).submission).toEqual(submitted);
  await page.reload();
  await expect(frame.locator("#entryWorkspaceBoard").getByText("20", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "실습 100%" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("EntryJS 저장 실패 복구 · 단계 이동 직전 입력 · 좁은 화면과 키보드", async ({ page }, testInfo) => {
  const frame = await enter(page, buildEntryProject(["when_run_button_click", "move_direction", "dialog_time"]));
  const native = page.frames().find((item) => item.url().endsWith("/entryjs/workspace.html"))!;
  expect(await native.evaluate(() => {
    try { return parent.document.cookie; } catch { return "isolated"; }
  })).toBe("isolated");
  await frame.locator("#entryWorkspaceBoard").getByText("10", { exact: true }).locator("..").click();
  const input = frame.locator("input:not([disabled]):visible");
  await expect(input).toBeFocused();
  // Inject the edited draft's failure after opening the field: initial editor
  // normalization can otherwise insert an alert and shift the click target.
  await page.route(`**${endpoint}`, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await input.fill("20");
  await input.press("Enter");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("서버에 연결하지 못했어요");
  await page.getByRole("tab", { name: "개념 0%" }).click();
  await expect(page.getByRole("tab", { name: "개념 0%" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "실습 0%" }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await expect(frame.locator("#entryWorkspaceBoard").getByText("20", { exact: true })).toBeVisible();
  await page.unroute(`**${endpoint}`);
  await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await saveDraft(page); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await frame.locator("#entryWorkspaceBoard").getByText("20", { exact: true }).locator("..").click();
  await frame.locator("input:not([disabled]):visible").fill("30");
  // Changing stages must commit an active native field without requiring Enter.
  await page.getByRole("tab", { name: "개념 0%" }).click();
  await expect(page.getByRole("tab", { name: "개념 0%" })).toHaveAttribute("aria-selected", "true");
  await saveDraft(page);
  const work: Work = await (await page.request.get(endpoint)).json();
  expect(parseEntryProject(work.draft.entryProject)?.threads[0][1]).toEqual({ type: "move_direction", amount: 30 });
  await page.getByRole("tab", { name: "실습 0%" }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await frame.locator("#entryWorkspaceBoard").getByText("30", { exact: true }).locator("..").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#entry-run")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "무대 처음 위치로" })).toBeFocused();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const scroll = page.getByRole("region", { name: "엔트리 작업실 가로 이동" });
  await scroll.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("entryjs-mobile.png"), fullPage: true });
});

test("EntryJS 파일 로딩 실패 뒤 다시 불러오기에서 저장본 유지", async ({ page }) => {
  const project = buildEntryProject(["when_run_button_click", "move_direction"]);
  await page.route("**/entryjs/vendor/entry/dist/entry.min.js", (route) => route.abort("failed"));
  await enter(page, project, false);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("작업실을 불러오지 못했어요");
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeDisabled();
  expect((await (await page.request.get(endpoint)).json()).draft.entryProject).toBe(project);
  await page.unroute("**/entryjs/vendor/entry/dist/entry.min.js");
  await page.getByRole("button", { name: "작업실 다시 불러오기" }).click();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  await expect(page.frameLocator('iframe[title="엔트리봇 블록 편집기와 실행 무대"]').locator("#entryWorkspaceBoard").getByText("10", { exact: true })).toBeVisible();
});
