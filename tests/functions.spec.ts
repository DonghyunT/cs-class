import { expect, test, type Page } from "@playwright/test";
import { buildProgrammingProject, missionStarter, parseProgrammingProject, type EntryNode, type ProgramFunction } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, entryReset, entryStart } from "./emulator";

const id = "functions", endpoint = `/api/classroom/work/${id}`;
const EDITING = "함수 편집 창에서 ‘저장’이나 ‘취소’를 먼저 눌러 주세요.";
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string) => node("number", v);
const start = () => node("when_run_button_click", null);
const loopOf = (count: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", count, null), statements: [inner] });
const square: EntryNode[] = [node("start_drawing", null), loopOf(number("4"), [node("move_direction", number("50"), null), node("direction_relative", node("angle", "90"), null)]), node("stop_drawing", null)];
// Missions start from their starter object; solutions replace its code and add functions.
const onStarter = (mission: string, threads: EntryNode[][], functions: ProgramFunction[]) => buildProgrammingProject(undefined, parseProgrammingProject(missionStarter(mission))!.added.map((o) => ({ ...o, threads })), -1, false, [], functions);
const windows = onStarter("windows", [[start(), node("func_win1", null), node("move_x", number("100"), null), node("func_win1", null)]], [{ id: "win1", name: "창문 그리기", body: square }]);

async function open(page: Page, lesson: string, mission: string, project = missionStarter(mission)) {
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${lesson}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: lesson, openedLessonIds: [lesson] });
  const path = `/api/classroom/work/${lesson}`, work: Work = await (await page.request.get(path)).json();
  expect((await page.request.post(path, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${lesson}?from=dashboard`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
const workspaceFrame = (page: Page) => page.frames().find((frame) => frame.url().includes("/entryjs/workspace.html"))!;
const editing = (page: Page) => workspaceFrame(page).evaluate(() => (window as unknown as { Entry: { Func: { isEdit: boolean } } }).Entry.Func.isEdit);
const status = (page: Page) => page.locator("[data-lesson-shell] header [role=status]");
// Entry draws these buttons in SVG under an overlay, so press them where they are on screen.
async function press(page: Page, target: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>) {
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("다른 엔트리 수업에는 함수 메뉴가 없다", async ({ page }) => {
  const frame = await open(page, "loops", "square");
  await expect(frame.locator("#entryCategorymoving")).toBeVisible();
  await expect(frame.locator("#entryCategoryfunc")).toHaveCount(0);
});

test("함수 편집 중에는 저장·검증·이동이 멈추고, 편집 창을 닫으면 바로 된다", async ({ page }) => {
  const frame = await open(page, id, "cat-walk");
  await frame.locator("#entryCategoryfunc").click();
  await press(page, frame.locator("tspan", { hasText: "함수 만들기" }));
  await expect.poll(() => editing(page)).toBe(true);
  const before = await status(page).textContent();
  const revision = async () => ((await (await page.request.get(endpoint)).json()) as Work).revision;
  const saved = await revision();

  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText(EDITING).first()).toBeVisible();
  await expect(status(page)).toHaveText(before ?? "");
  // Ctrl+S inside the workspace comes back as the frame's save request.
  await frame.locator("#entryCategoryfunc").click();
  await page.keyboard.press("Control+s");
  await expect(status(page)).toHaveText(before ?? "");
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByText(EDITING).first()).toBeVisible();
  // Mission and stage switches keep the editor open.
  await page.getByRole("button", { name: /창문 두 개/ }).click();
  await expect(page.getByRole("heading", { name: "고양이 걸음" })).toBeVisible();
  await page.getByRole("tab", { name: /개념/ }).click();
  await expect(page.getByRole("tab", { name: /실습/ })).toHaveAttribute("aria-selected", "true");
  expect(await editing(page)).toBe(true);
  expect(await revision()).toBe(saved);

  // After the function editor saves, Save and validation work without a retry.
  await press(page, frame.locator("text.entryFunctionButton", { hasText: "저장" }));
  await expect.poll(() => editing(page)).toBe(false);
  await expect(page.getByText(EDITING)).toHaveCount(0);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(status(page)).toHaveText("저장 완료");
  const stored = ((await (await page.request.get(endpoint)).json()) as Work).draft.programming!.projects["cat-walk"];
  expect(parseProgrammingProject(stored)!.functions).toHaveLength(1);
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.getByText(/키마다 10만큼 움직이고/)).toBeVisible();
});

test("함수 안에서만 그린 선이 실행 뒤 남는다", async ({ page }) => {
  await open(page, id, "windows", windows);
  await entryStart(page).click();
  await expect(page.getByText("정지하면 무대가 처음 상태로 돌아가고", { exact: false }).first()).toBeVisible({ timeout: 15000 });
  const drawn = await workspaceFrame(page).evaluate(() => {
    const entry = (window as unknown as { Entry: { container: { getAllObjects: () => { entity: { shapes: unknown[] } }[] } } }).Entry;
    return entry.container.getAllObjects().some((object) => object.entity.shapes.length > 0);
  });
  expect(drawn).toBe(true);
});
