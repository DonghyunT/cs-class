import { expect, test } from "@playwright/test";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { LESSONS, RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import type { ClassSettings, TeacherDashboard } from "../src/lib/classroom/types";
import { db, lessonId as legacyLessonId, localOnly, readyStudent, readyTeacher } from "./emulator";

const classRef = db.collection("csClasses").doc("2-1");
const emptyClassRef = db.collection("csClasses").doc("2-2");
const lessonId = RELEASED_LESSONS[0].id;
let originalClasses: DocumentSnapshot[] = [];

test.beforeEach(async ({ request }) => {
  await localOnly(request);
  originalClasses = await db.getAll(classRef, emptyClassRef);
});

test.afterEach(async () => {
  for (const snapshot of originalClasses) {
    if (snapshot.exists) await snapshot.ref.set(snapshot.data()!);
    else await snapshot.ref.delete();
  }
});

test("수업 관리: 이번 수업과 열린 수업 전체·미지정·빈 반·좁은 화면", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: LESSONS.map((lesson) => lesson.id) });
  await emptyClassRef.set({ id: "2-2", name: "2학년 2반", revision: 0, currentLessonId: null, openedLessonIds: [] });
  await page.goto("/teacher/classes?classId=2-1");
  const opened = page.getByRole("region", { name: "열린 수업", exact: true });
  const current = page.locator('section[aria-labelledby="current-lesson-title"]');
  await expect(current.getByRole("button", { name: "수업 관리", exact: true })).toHaveCount(0);
  const manage = page.getByRole("button", { name: "수업 관리", exact: true });
  await expect(manage).toBeVisible();
  await expect(manage.locator("..").getByRole("button", { name: "수업 새로고침", exact: true })).toBeVisible();
  await expect(current.getByRole("heading", { level: 2 })).toHaveText(RELEASED_LESSONS[0].title);
  await expect(current.getByText(`열린 수업 ${RELEASED_LESSONS.length}개 · 기존 수업은 계속 복습할 수 있어요.`, { exact: true })).toBeVisible();
  const preparation = page.getByRole("table", { name: "담당 반 수업 준비", exact: true });
  const classRow = preparation.getByRole("rowheader", { name: "2학년 1반", exact: true }).locator("..");
  await expect(classRow.getByRole("cell").nth(0)).toHaveText(RELEASED_LESSONS[0].title);
  await expect(classRow.getByRole("cell").nth(1)).toHaveText(`${RELEASED_LESSONS.length}개`);
  await expect(opened.getByRole("listitem")).toHaveCount(RELEASED_LESSONS.length);
  for (const lesson of RELEASED_LESSONS) {
    const item = opened.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3, name: lesson.title, exact: true }) });
    await expect(item).toContainText(lesson.description);
    await expect(item.getByText(lesson.id === lessonId ? "이번 수업" : "복습 가능", { exact: true })).toBeVisible();
  }
  await expect(opened.getByText("이번 수업", { exact: true })).toHaveCount(1);
  await expect(opened.getByText("복습 가능", { exact: true })).toHaveCount(RELEASED_LESSONS.length - 1);
  for (const id of ["sequence-lab", "flowchart-lab", "entry-bot-lab"]) await expect(opened.getByRole("heading", { name: LESSONS.find(lesson => lesson.id === id)!.title, exact: true })).toHaveCount(0);
  expect((await classRef.get()).data()!.openedLessonIds).toEqual(LESSONS.map(lesson => lesson.id));
  await expect(page.getByRole("link", { name: "학생 진행·제출 작품·계정 관리로 이동", exact: true })).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const refreshBox = await page.getByRole("button", { name: "수업 새로고침", exact: true }).boundingBox();
    expect(refreshBox?.width).toBe(44); expect(refreshBox?.height).toBe(44);
    await expect(manage).toBeVisible();
    await expect(opened.getByRole("heading", { level: 3 })).toHaveCount(RELEASED_LESSONS.length);
    if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`opened-lessons-${width}.png`), fullPage: true });
  }

  await classRef.update({ currentLessonId: null });
  await page.reload();
  await expect(current.getByRole("heading", { level: 2 })).toHaveText("이번 수업을 지정해 주세요.");
  await expect(opened.getByRole("listitem")).toHaveCount(RELEASED_LESSONS.length);
  await expect(opened.getByText("이번 수업", { exact: true })).toHaveCount(0);
  await expect(opened.getByText("복습 가능", { exact: true })).toHaveCount(RELEASED_LESSONS.length);
  expect((await classRef.get()).data()!.openedLessonIds).toEqual(LESSONS.map(lesson => lesson.id));

  await page.getByRole("combobox", { name: "담당 반", exact: true }).click();
  await page.getByRole("option", { name: "2학년 2반", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "담당 반", exact: true })).toHaveText("2학년 2반");
  await expect(opened.getByText("아직 열린 수업이 없어요.", { exact: true })).toBeVisible();
  await expect(opened.getByRole("listitem")).toHaveCount(0);
  await expect(opened.getByRole("heading", { level: 3 })).toHaveText("아직 열린 수업이 없어요.");
  expect(errors).toEqual([]);
});

test("숨긴 과거 수업만 열린 반은 공개 수업 0개·미지정·비활성 선택을 표시하고 DB 원본을 유지", async ({ page }) => {
  await readyTeacher(page.request);
  const original = { id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: legacyLessonId, openedLessonIds: [legacyLessonId] };
  await classRef.set(original);
  await page.goto("/teacher/classes?classId=2-1");
  const current = page.locator('section[aria-labelledby="current-lesson-title"]');
  await expect(current.getByRole("heading", { level: 2 })).toHaveText("이번 수업을 지정해 주세요.");
  await expect(current.getByText("열린 수업 0개 · 기존 수업은 계속 복습할 수 있어요.", { exact: true })).toBeVisible();
  const classRow = page.getByRole("table", { name: "담당 반 수업 준비", exact: true }).getByRole("rowheader", { name: "2학년 1반", exact: true }).locator("..");
  await expect(classRow.getByRole("cell").nth(0)).toHaveText("미지정");
  await expect(classRow.getByRole("cell").nth(1)).toHaveText("0개");
  await expect(page.getByRole("region", { name: "열린 수업", exact: true }).getByRole("listitem")).toHaveCount(0);
  await page.goto("/teacher/students?classId=2-1");
  const lessonPicker = page.getByRole("combobox", { name: "확인할 수업", exact: true });
  await expect(lessonPicker).toBeDisabled();
  await expect(lessonPicker).toHaveText("열린 수업이 없어요");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect((await classRef.get()).data()).toEqual(original);
});

test("설정 저장: 실패 시 입력 유지·재시도·초점 복귀·토스트 자동 닫힘과 조작", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("503")) errors.push(message.text()); });
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId, legacyLessonId] });
  await page.clock.install();
  let failNext = true;
  await page.route("**/api/classroom/classes/2-1", async (route) => {
    if (route.request().method() === "POST" && failNext) {
      failNext = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "SAVE_UNAVAILABLE", message: "수업 설정을 저장하지 못했어요. 다시 시도해 주세요." }) });
    } else await route.continue();
  });
  await page.goto("/teacher/classes?classId=2-1");
  const manage = page.getByRole("button", { name: "수업 관리", exact: true });
  const toast = page.locator('[data-slot="toast"]').filter({ hasText: "2학년 1반 수업 설정을 저장했어요." });
  await manage.focus();
  await manage.press("Enter");
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  await expect(dialog.getByRole("checkbox", { name: new RegExp(LESSONS.find(lesson => lesson.id === legacyLessonId)!.title) })).toHaveCount(0);
  const added = dialog.getByRole("checkbox", { name: new RegExp(RELEASED_LESSONS[1].title) });
  await added.check();
  const currentPicker = dialog.getByRole("combobox", { name: "이번 수업", exact: true });
  await currentPicker.click();
  await page.getByRole("option", { name: RELEASED_LESSONS[1].title, exact: true }).click();
  const summary = dialog.getByRole("region", { name: "저장할 수업 설정", exact: true });
  await expect(summary).toContainText("새로 공개할 수업 1개");
  await expect(summary).toContainText(`이번 수업 변경: ${RELEASED_LESSONS[1].title}`);
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("수업 설정을 저장하지 못했어요");
  await expect(added).toBeChecked();
  await expect(currentPicker).toHaveText(RELEASED_LESSONS[1].title);
  await expect(summary).toContainText("새로 공개할 수업 1개");
  await expect(toast).toHaveCount(0);
  expect((await classRef.get()).data()).toMatchObject({ revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId, legacyLessonId] });

  await dialog.getByRole("button", { name: "설정 저장", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  await expect(page.locator("#current-lesson-title")).toHaveText(RELEASED_LESSONS[1].title);
  await expect(toast).toBeVisible();
  expect((await classRef.get()).data()).toMatchObject({ revision: 1, currentLessonId: RELEASED_LESSONS[1].id, openedLessonIds: [lessonId, legacyLessonId, RELEASED_LESSONS[1].id] });
  await toast.hover();
  await page.clock.fastForward(6000);
  await expect(toast).toBeVisible();
  const dismiss = toast.getByRole("button", { name: "알림 닫기", exact: true });
  await dismiss.focus();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6000);
  await expect(toast).toBeVisible();
  await manage.focus();
  await page.clock.fastForward(5000);
  await expect(toast).toBeHidden();

  await manage.press("Enter");
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(toast).toBeVisible();
  await page.clock.fastForward(2500);
  await expect(toast).toBeVisible();
  await manage.press("Enter");
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  await page.clock.fastForward(2500);
  await expect(toast).toBeVisible();
  // Base UI exposes the close button when the toast is expanded by hover or focus.
  await toast.hover();
  await dismiss.click();
  await expect(toast).toBeHidden();

  await manage.press("Enter");
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(toast).toBeVisible();
  await manage.press("Enter");
  await expect(dialog).toBeVisible();
  // Base UI queues initial focus on the next frame; visibility alone is not keyboard readiness.
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("F6");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).press("Enter");
  const menu = page.getByRole("dialog", { name: "교실 탐색 메뉴", exact: true });
  await expect(menu).toBeVisible();
  const closeMenu = menu.getByRole("button", { name: "메뉴 닫기", exact: true });
  await expect(closeMenu).toBeFocused();
  await page.keyboard.press("F6");
  await expect(closeMenu).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await menu.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeFocused();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5000);
  await expect(toast).toBeHidden();
  expect(errors).toEqual([]);
});

test("[후속3b-요약] 공개 선택·해제·취소와 이번 수업만 변경·미지정은 저장 전 차분으로 안내", async ({ page }, testInfo) => {
  const [first, alreadyOpened, newlyOpened] = RELEASED_LESSONS;
  const longTitle = `${newlyOpened.title} · ${"긴 제목도 공개 범위에 포함되는 수업 ".repeat(8)}`.trim();
  const initial = { id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: first.id, openedLessonIds: [first.id, alreadyOpened.id] };
  await readyTeacher(page.request);
  await classRef.set(initial);
  await page.route("**/api/classroom/teacher?*", async route => {
    const response = await route.fetch();
    const data = await response.json() as TeacherDashboard;
    data.lessons = data.lessons.map(lesson => lesson.id === newlyOpened.id ? { ...lesson, title: longTitle } : lesson);
    await route.fulfill({ response, json: data });
  });
  await page.setViewportSize({ width: 390, height: 712 });
  await page.goto("/teacher/classes?classId=2-1");
  const manage = page.getByRole("button", { name: "수업 관리", exact: true });
  await manage.click();
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  const summary = dialog.getByRole("region", { name: "저장할 수업 설정", exact: true });
  const added = dialog.getByRole("checkbox", { name: new RegExp(newlyOpened.title) });
  const currentPicker = dialog.getByRole("combobox", { name: "이번 수업", exact: true });
  const warning = summary.getByText(/^닫을 수업/);
  await expect(summary).toContainText("새로 공개할 수업이 없어요.");
  await expect(summary).toContainText(`이번 수업 유지: ${first.title}`);
  await expect(warning).toHaveCount(0);

  await added.check();
  await expect(added.locator("..").getByText("저장하면 학생에게 공개돼요", { exact: true })).toBeVisible();
  await expect(summary).toContainText("새로 공개할 수업 1개");
  await expect(summary.getByText(longTitle, { exact: true })).toBeVisible();
  await expect(warning).toHaveCount(0);
  await currentPicker.click();
  await page.getByRole("option", { name: longTitle, exact: true }).click();
  await expect(summary).toContainText(`이번 수업 변경: ${longTitle}`);
  await summary.scrollIntoViewIfNeeded();
  expect(await summary.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("publish-summary-long-title-390.png"), fullPage: true });

  await added.uncheck();
  await expect(added).toBeFocused();
  await expect(summary).toContainText("새로 공개할 수업이 없어요.");
  await expect(summary).toContainText("이번 수업 미지정");
  await expect(currentPicker).toHaveText("지정하지 않음");
  await expect(warning).toHaveCount(0);
  expect((await classRef.get()).data()).toMatchObject(initial);
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  expect((await classRef.get()).data()).toMatchObject(initial);

  await manage.press("Enter");
  await expect(added).not.toBeChecked();
  await expect(summary).toContainText(`이번 수업 유지: ${first.title}`);
  await currentPicker.click();
  await page.getByRole("option", { name: alreadyOpened.title, exact: true }).click();
  await expect(summary).toContainText("새로 공개할 수업이 없어요.");
  await expect(summary).toContainText(`이번 수업 변경: ${alreadyOpened.title}`);
  await expect(warning).toHaveCount(0);
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await classRef.get()).data()).toMatchObject({ ...initial, revision: 1, currentLessonId: alreadyOpened.id });

  await manage.press("Enter");
  await expect(summary).toContainText(`이번 수업 유지: ${alreadyOpened.title}`);
  await currentPicker.click();
  await page.getByRole("option", { name: "지정하지 않음", exact: true }).click();
  await expect(summary).toContainText("이번 수업 미지정");
  await expect(summary).toContainText("새로 공개할 수업이 없어요.");
  await expect(warning).toHaveCount(0);
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  expect((await classRef.get()).data()).toMatchObject({ ...initial, revision: 2, currentLessonId: null });
});

test("[후속3b-충돌] 다른 교사 공개 후 409·최신 조회로 공개 차분을 갱신하고 수동 저장·중복 차단", async ({ page }, testInfo) => {
  const [first, otherTeacherOpened, ownChoice] = RELEASED_LESSONS;
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: first.id, openedLessonIds: [first.id] });
  await page.clock.install();
  await page.goto("/teacher/classes?classId=2-1");
  const manage = page.getByRole("button", { name: "수업 관리", exact: true });
  await manage.click();
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  const summary = dialog.getByRole("region", { name: "저장할 수업 설정", exact: true });
  const other = dialog.getByRole("checkbox", { name: new RegExp(otherTeacherOpened.title) });
  const own = dialog.getByRole("checkbox", { name: new RegExp(ownChoice.title) });
  const currentPicker = dialog.getByRole("combobox", { name: "이번 수업", exact: true });
  await other.check();
  await own.check();
  await currentPicker.click();
  await page.getByRole("option", { name: ownChoice.title, exact: true }).click();
  await expect(summary).toContainText("새로 공개할 수업 2개");

  // An external teacher commits while this dialog still owns its original revision.
  await classRef.update({ revision: 1, currentLessonId: otherTeacherOpened.id, openedLessonIds: [first.id, otherTeacherOpened.id] });
  await page.clock.fastForward(60_000);
  // Manual refresh keeps the previous snapshot while this modal is open.
  await expect(page.locator("#current-lesson-title")).toHaveText(first.title);
  await expect(summary).toContainText("새로 공개할 수업 2개");
  await expect(currentPicker).toHaveText(ownChoice.title);

  const posts: Pick<ClassSettings, "revision" | "currentLessonId" | "openedLessonIds">[] = [];
  let holdSave = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/classes/2-1", async route => {
    if (route.request().method() === "POST") {
      posts.push(route.request().postDataJSON());
      if (holdSave) await gate;
    }
    await route.continue();
  });
  try {
    const save = dialog.getByRole("button", { name: "설정 저장", exact: true });
    const conflict = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/classes/2-1" && response.status() === 409);
    await save.click();
    await (await conflict).finished();
    await expect(dialog.getByRole("alert")).toContainText("수업 설정이 변경됐어요.");
    await expect(save).toBeDisabled();
    await expect(own).toBeChecked();
    await expect(currentPicker).toHaveText(ownChoice.title);
    await expect(summary).toContainText("새로 공개할 수업 2개");
    expect(posts).toHaveLength(1);
    expect(posts[0].revision).toBe(0);
    await page.setViewportSize({ width: 390, height: 712 });
    await dialog.getByRole("alert").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("publish-summary-conflict-390.png"), fullPage: true });

    await dialog.getByRole("button", { name: "최신 설정 확인 후 다시 적용", exact: true }).click();
    await expect(dialog.getByRole("status")).toContainText("최신 공개 목록을 반영했어요.");
    await expect(summary).toContainText("새로 공개할 수업 1개");
    await expect(summary.getByText(ownChoice.title, { exact: true })).toBeVisible();
    await expect(summary.getByText(otherTeacherOpened.title, { exact: true })).toHaveCount(0);
    await expect(summary).toContainText(`이번 수업 변경: ${ownChoice.title}`);
    await expect(other).toBeChecked();
    await expect(other).toBeEnabled();
    await expect(own).toBeChecked();
    await expect(currentPicker).toHaveText(ownChoice.title);
    await expect(save).toBeEnabled();
    expect(posts).toHaveLength(1);
    expect((await classRef.get()).data()).toMatchObject({ revision: 1, currentLessonId: otherTeacherOpened.id, openedLessonIds: [first.id, otherTeacherOpened.id] });

    holdSave = true;
    await save.scrollIntoViewIfNeeded();
    const box = await save.boundingBox();
    expect(box).not.toBeNull();
    await save.press("Enter");
    const pending = dialog.getByRole("button", { name: "저장 중…", exact: true });
    await expect(pending).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    await expect(own).toBeDisabled();
    await expect(currentPicker).toBeDisabled();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.keyboard.press("Enter");
    await expect.poll(() => posts.length).toBe(2);
    expect(posts[1]).toMatchObject({ revision: 1, currentLessonId: ownChoice.id });
    expect(posts[1].openedLessonIds).toEqual(expect.arrayContaining([first.id, otherTeacherOpened.id, ownChoice.id]));
    const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/classes/2-1" && response.status() === 200);
    release();
    await (await saved).finished();
    await expect(dialog).toBeHidden();
    await expect(manage).toBeFocused();
    expect(posts).toHaveLength(2);
    expect((await classRef.get()).data()).toMatchObject({ revision: 2, currentLessonId: ownChoice.id, openedLessonIds: [first.id, otherTeacherOpened.id, ownChoice.id] });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("교사·학생 탐색 메뉴: 동일한 아이콘 수·현재 화면 표시·모바일 키보드", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const role of ["teacher", "student"] as const) {
    if (role === "teacher") {
      await readyTeacher(page.request);
      await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });
    } else await readyStudent(page.request);
    await page.goto(role === "teacher" ? "/teacher/classes?classId=2-1" : "/student/lessons");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width <= 820) {
        await page.getByRole("button", { name: "메뉴 열기", exact: true }).press("Enter");
        const menu = page.getByRole("dialog", { name: "교실 탐색 메뉴", exact: true });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole("button", { name: "메뉴 닫기", exact: true })).toBeFocused();
      }
      const navigation = page.getByRole("navigation", { name: "교실 메뉴", exact: true });
      const links = navigation.getByRole("link");
      await expect(links).toHaveCount(role === "teacher" ? 5 : 4);
      for (const link of await links.all()) await expect(link.locator("svg")).toHaveCount(1);
      await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(1);
      await expect(navigation.getByRole("link", { name: role === "teacher" ? "수업 관리" : "열린 수업", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(navigation.getByRole("link", { name: "대시보드", exact: true })).not.toHaveAttribute("aria-current", "page");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`${role}-menu-${width}.png`), fullPage: true });
      if (width <= 820) {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: "교실 탐색 메뉴", exact: true })).toBeHidden();
        await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeFocused();
      }
    }
  }
  expect(errors).toEqual([]);
});

test("[수업 닫기] 열린 수업의 체크를 풀어 닫으면 학생에게서 사라지고 다시 열면 이어할 수 있다", async ({ page, request }) => {
  const [first, second] = RELEASED_LESSONS;
  await readyStudent(request);
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: second.id, openedLessonIds: [first.id, second.id] });
  expect((await request.get(`/api/classroom/work/${second.id}`)).status()).toBe(200);

  await page.goto("/teacher/classes?classId=2-1");
  await page.getByRole("button", { name: "수업 관리", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  const opened = dialog.getByRole("checkbox", { name: new RegExp(second.title) });
  await expect(opened).toBeEnabled();
  await opened.uncheck();
  const summary = dialog.getByRole("region", { name: "저장할 수업 설정", exact: true });
  await expect(summary).toContainText("닫을 수업 1개");
  await expect(summary).toContainText("이번 수업 미지정");
  await expect(opened.locator("..").getByText("저장하면 학생 화면에서 닫혀요", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(page.getByText("2학년 1반 수업 설정을 저장했어요.")).toBeVisible();
  expect((await classRef.get()).data()).toMatchObject({ revision: 1, currentLessonId: null, openedLessonIds: [first.id] });

  const closed = await request.get(`/api/classroom/work/${second.id}`);
  expect(closed.status()).toBe(403);
  expect(await closed.json()).toMatchObject({ code: "LESSON_CLOSED" });
  expect((await (await request.get("/api/classroom/student/class")).json()).lessons.map((lesson: { id: string }) => lesson.id)).toEqual([first.id]);
  // A teacher link to the closed lesson falls back to an open one instead of failing.
  const dashboard = await page.request.get(`/api/classroom/teacher?classId=2-1&lessonId=${second.id}`);
  expect(dashboard.status()).toBe(200);
  expect((await dashboard.json()).selectedLessonId).toBe(first.id);
  await page.goto(`/teacher/students?classId=2-1&lessonId=${second.id}`);
  await expect(page.getByRole("combobox", { name: "확인할 수업", exact: true })).toHaveText(first.title);
  await page.goto("/teacher/classes?classId=2-1");

  await page.getByRole("button", { name: "수업 관리", exact: true }).click();
  await opened.check();
  await expect(summary).toContainText("새로 공개할 수업 1개");
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect.poll(async () => (await classRef.get()).data()?.openedLessonIds).toEqual([first.id, second.id]);
  expect((await request.get(`/api/classroom/work/${second.id}`)).status()).toBe(200);
});

test("[수업 닫기-충돌] 다른 교사가 닫은 수업은 최신 설정을 반영해도 다시 열리지 않는다", async ({ page }) => {
  const [first, second, third] = RELEASED_LESSONS;
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: second.id, openedLessonIds: [first.id, second.id] });
  await page.goto("/teacher/classes?classId=2-1");
  await page.getByRole("button", { name: "수업 관리", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "2학년 1반 수업 관리", exact: true });
  await dialog.getByRole("checkbox", { name: new RegExp(third.title) }).check();
  await classRef.update({ revision: 1, currentLessonId: first.id, openedLessonIds: [first.id] });
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("수업 설정이 변경됐어요.");
  await dialog.getByRole("button", { name: "최신 설정 확인 후 다시 적용", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("최신 공개 목록을 반영했어요.");
  await expect(dialog.getByRole("checkbox", { name: new RegExp(second.title) })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: new RegExp(third.title) })).toBeChecked();
  await expect(dialog.getByRole("combobox", { name: "이번 수업", exact: true })).toHaveText("지정하지 않음");
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect.poll(async () => (await classRef.get()).data()).toMatchObject({ revision: 2, currentLessonId: null, openedLessonIds: [first.id, third.id] });
});
