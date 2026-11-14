import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { auth, clearLoginLimit, db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";

const studentId = "21003", uid = `student-${studentId}`, classPath = "csClasses/2-10";
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeAll(async () => { originalClass = (await db.doc(classPath).get()).data(); });
test.beforeEach(async ({ page }) => {
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await db.doc(classPath).update({ openedLessonIds: LESSONS.map(lesson => lesson.id), currentLessonId: "review-sandwich" });
  for (const lesson of LESSONS) await db.doc(`csWork/${uid}__${lesson.id}`).delete();
});
test.afterAll(async () => {
  for (const lesson of LESSONS) await db.doc(`csWork/${uid}__${lesson.id}`).delete();
  for (const path of [`csAccounts/${uid}`, `csAiUsage/${uid}`]) await db.doc(path).delete();
  await clearLoginLimit(uid);
  if (originalClass) await db.doc(classPath).set(originalClass);
  await auth.deleteUser(uid).catch(() => {});
});
async function enter(page: Page, id: string) {
  await page.goto(`/classroom/${id}?from=lessons`);
  await expect(page.getByRole("navigation", { name: "개념 목록" })).toBeVisible();
}

test("모든 수업 개념은 같은 목록·본문 배치로 읽고 좁은 창에서는 위아래로 재배치", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const lesson of LESSONS) {
    await enter(page, lesson.id);
    const nav = page.getByRole("navigation", { name: "개념 목록" });
    // Only the first programming lesson has its own concept screen; later ones use the shared panel.
    const title = page.locator(lesson.id === "programming-13" ? "#concept-title" : `#concept-title-${lesson.concepts[0].id}`);
    for (const width of [1440, 821, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const [list, heading] = await Promise.all([nav.boundingBox(), title.locator("..").boundingBox()]);
      if (width > 760) {
        expect(list!.x + list!.width).toBeLessThan(heading!.x);
        expect(Math.abs(list!.y - heading!.y)).toBeLessThan(20);
      } else {
        expect(list!.y + list!.height).toBeLessThanOrEqual(heading!.y);
        expect(Math.abs(list!.x - heading!.x)).toBeLessThan(2);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const controls = await nav.getByRole("button").evaluateAll(buttons => buttons.map(button => ({ height: button.getBoundingClientRect().height, font: parseFloat(getComputedStyle(button.querySelector("strong") ?? button).fontSize) })));
      expect(controls.every(control => control.height >= 44 && control.font >= 14)).toBe(true);
      if (lesson.id === "review-sandwich" && [1440, 390].includes(width)) await page.screenshot({ path: testInfo.outputPath(`concept-${width}.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test("수업별 체험·확인 문제·완료 기록과 마지막 개념의 퀴즈 이동을 유지", async ({ page }) => {
  test.setTimeout(120_000);
  for (const lesson of LESSONS.filter(item => item.practice.type !== "programming")) {
    await enter(page, lesson.id);
    const nav = page.getByRole("navigation", { name: "개념 목록" });
    const first = lesson.concepts[0];
    await expect(page.locator(`#concept-${first.id}`)).toContainText(first.explanation);
    await expect(page.locator(`#concept-${first.id}`)).toContainText(first.example);
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "정답 확인", exact: true }).click();
    // A right answer moves focus to the next button, a wrong one to the feedback.
    await expect(page.locator(":focus")).toHaveAttribute("id", new RegExp(`^concept-(next|feedback)-${first.id}$`));
    if (["review-sandwich", "review-abstraction", "review-flowchart"].includes(lesson.id)) await expect(page.locator("[data-concept-experience]")).toBeVisible();
    await nav.getByRole("button").last().click();
    await expect(page.locator(`#concept-title-${lesson.concepts.at(-1)!.id}`)).toBeFocused();
    await page.getByRole("button", { name: "퀴즈로 이동", exact: true }).click();
    await expect(page.getByRole("tab", { name: /퀴즈/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: /개념/ }).click();
    await expect(page.locator(`#concept-title-${lesson.concepts.at(-1)!.id}`)).toBeVisible();
    await page.reload();
    await nav.getByRole("button").first().click();
    await expect(page.getByRole("radio").first()).toBeChecked();
    await expect(page.locator(`#concept-feedback-${first.id}`)).toBeVisible();
  }
});
