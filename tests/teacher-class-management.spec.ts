import { expect, test } from "@playwright/test";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { LESSONS } from "../src/lib/classroom/catalog";
import { db, lessonId, localOnly, readyStudent, readyTeacher } from "./emulator";

const classRef = db.collection("csClasses").doc("2-1");
const emptyClassRef = db.collection("csClasses").doc("2-2");
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
  await expect(current.getByRole("heading", { level: 2 })).toHaveText(LESSONS[0].title);
  await expect(opened.getByRole("listitem")).toHaveCount(LESSONS.length);
  for (const lesson of LESSONS) {
    const item = opened.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3, name: lesson.title, exact: true }) });
    await expect(item).toContainText(lesson.description);
    await expect(item.getByText(lesson.id === lessonId ? "이번 수업" : "복습 가능", { exact: true })).toBeVisible();
  }
  await expect(opened.getByText("이번 수업", { exact: true })).toHaveCount(1);
  await expect(opened.getByText("복습 가능", { exact: true })).toHaveCount(LESSONS.length - 1);
  await expect(page.getByRole("link", { name: "학생 진행·제출 작품·계정 관리로 이동", exact: true })).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(opened.getByRole("heading", { level: 3 })).toHaveCount(LESSONS.length);
    if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`opened-lessons-${width}.png`), fullPage: true });
  }

  await classRef.update({ currentLessonId: null });
  await page.reload();
  await expect(current.getByRole("heading", { level: 2 })).toHaveText("이번 수업을 지정해 주세요.");
  await expect(opened.getByRole("listitem")).toHaveCount(LESSONS.length);
  await expect(opened.getByText("이번 수업", { exact: true })).toHaveCount(0);
  await expect(opened.getByText("복습 가능", { exact: true })).toHaveCount(LESSONS.length);

  await page.getByRole("combobox", { name: "담당 반", exact: true }).click();
  await page.getByRole("option", { name: "2학년 2반", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "담당 반", exact: true })).toHaveText("2학년 2반");
  await expect(opened.getByText("아직 열린 수업이 없어요.", { exact: true })).toBeVisible();
  await expect(opened.getByRole("listitem")).toHaveCount(0);
  await expect(opened.getByRole("heading", { level: 3 })).toHaveText("아직 열린 수업이 없어요.");
  expect(errors).toEqual([]);
});

test("설정 저장: 실패 시 입력 유지·재시도·초점 복귀·토스트 자동 닫힘과 조작", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("503")) errors.push(message.text()); });
  await readyTeacher(page.request);
  await classRef.set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });
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
  const added = dialog.getByRole("checkbox", { name: new RegExp(LESSONS[1].title) });
  await added.check();
  const currentPicker = dialog.getByRole("combobox", { name: "이번 수업", exact: true });
  await currentPicker.click();
  await page.getByRole("option", { name: LESSONS[1].title, exact: true }).click();
  await dialog.getByRole("button", { name: "설정 저장", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("수업 설정을 저장하지 못했어요");
  await expect(added).toBeChecked();
  await expect(currentPicker).toHaveText(LESSONS[1].title);
  await expect(toast).toHaveCount(0);
  expect((await classRef.get()).data()).toMatchObject({ revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });

  await dialog.getByRole("button", { name: "설정 저장", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();
  await expect(page.locator("#current-lesson-title")).toHaveText(LESSONS[1].title);
  await expect(toast).toBeVisible();
  expect((await classRef.get()).data()).toMatchObject({ revision: 1, currentLessonId: LESSONS[1].id, openedLessonIds: [lessonId, LESSONS[1].id] });
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
      await expect(links).toHaveCount(role === "teacher" ? 4 : 3);
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
