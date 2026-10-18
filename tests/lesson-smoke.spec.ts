import { test, expect } from "@playwright/test";
import { db, readyStudent, saveDraft } from "./emulator";

// Environment variable CS_SMOKE_LESSON_IDS can specify a subset, e.g. '["review-sandwich"]'
const ALL_LESSON_IDS = [
  "review-sandwich",
  "review-flowchart",
  "review-abstraction",
  "programming-13",
  "conditionals"
];

function getSelectedLessonIds(): string[] {
  if (process.env.CS_SMOKE_LESSON_IDS) {
    try {
      const parsed = JSON.parse(process.env.CS_SMOKE_LESSON_IDS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback to all
    }
  }
  return ALL_LESSON_IDS;
}

const selectedLessons = getSelectedLessonIds();

test.describe("선별 수업 스모크 검증 (Lesson Smoke)", () => {
  test.beforeEach(async ({ page }) => {
    await readyStudent(page.request);
    await db.collection("csClasses").doc("2-1").update({
      currentLessonId: null,
      openedLessonIds: ALL_LESSON_IDS
    });
  });

  if (selectedLessons.includes("review-sandwich")) {
    test("샌드위치: 자연어 명령 입력 후 저장 및 새로고침 복원", async ({ page }) => {
      await db.collection("csWork").doc("student-20101__review-sandwich").delete();
      const marker = `식빵 두 장을 꺼내 ${Date.now()}`;
      await page.goto("/classroom/review-sandwich?from=lessons");
      await page.getByRole("tab", { name: /실습/ }).click();

      const input = page.getByLabel("자연어 명령");
      await input.fill(marker);
      await saveDraft(page);

      await page.reload();
      await page.getByRole("tab", { name: /실습/ }).click();
      await expect(page.getByLabel("자연어 명령")).toHaveValue(marker);
    });
  }

  if (selectedLessons.includes("review-flowchart")) {
    test("순서도: 나만의 백지 카드 추가 후 저장 및 새로고침 복원", async ({ page }) => {
      await db.collection("csWork").doc("student-20101__review-flowchart").delete();
      await page.goto("/classroom/review-flowchart?from=lessons");
      await page.getByRole("tab", { name: /실습/ }).click();

      const nav = page.getByRole("navigation", { name: "순서도 실습", exact: true });
      await nav.getByRole("button", { name: "🚀 5. 나만의 백지", exact: true }).click();

      await page.getByRole("button", { name: "계획 카드 추가" }).click();
      await saveDraft(page);

      await page.reload();
      await page.getByRole("tab", { name: /실습/ }).click();
      await nav.getByRole("button", { name: "🚀 5. 나만의 백지", exact: true }).click();
      await expect(page.getByRole("region", { name: "자연어 기획서" })).toContainText("순차");
    });
  }

  if (selectedLessons.includes("review-abstraction")) {
    test("추상화: 맛보기 카드 상태 변경 후 저장 및 새로고침 복원", async ({ page }) => {
      await db.collection("csWork").doc("student-20101__review-abstraction").delete();
      await page.goto("/classroom/review-abstraction?from=lessons");
      await page.getByRole("tab", { name: /실습/ }).click();

      await page.getByLabel("맛보기 상황").selectOption("late");
      await page.getByRole("button", { name: "맛보기 다음" }).click();
      await page.getByRole("button", { name: "맛보기 다음" }).click();

      // Click item button to toggle its keep/discard state
      const itemBtn = page.getByRole("button", { name: "남김 · 침대 이불 색깔" });
      await itemBtn.click();
      await saveDraft(page);

      await page.reload();
      await page.getByRole("tab", { name: /실습/ }).click();
      await expect(page.getByRole("button", { name: "버림 · 침대 이불 색깔" })).toBeVisible();
    });
  }

  if (selectedLessons.includes("programming-13")) {
    test("프로그래밍: 후기 입력 후 저장 및 새로고침 복원", async ({ page }) => {
      await db.collection("csWork").doc("student-20101__programming-13").delete();
      const marker = `스모크 테스트 소감 ${Date.now()}`;
      await page.goto("/classroom/programming-13?from=lessons");
      await page.getByRole("tab", { name: /실습/ }).click();

      const textarea = page.getByRole("textbox", { name: "오늘 발견한 것을 한 줄로 남겨볼까요?" });
      await textarea.fill(marker);
      await saveDraft(page);

      await page.reload();
      await page.getByRole("tab", { name: /실습/ }).click();
      await expect(page.getByRole("textbox", { name: "오늘 발견한 것을 한 줄로 남겨볼까요?" })).toHaveValue(marker);
    });
  }

  if (selectedLessons.includes("conditionals")) {
    test("조건 수업: 후기 입력 후 저장 및 새로고침 복원", async ({ page }) => {
      await db.collection("csWork").doc("student-20101__conditionals").delete();
      const marker = `조건 스모크 소감 ${Date.now()}`;
      await page.goto("/classroom/conditionals?from=lessons");
      await page.getByRole("tab", { name: /실습/ }).click();

      const textarea = page.getByRole("textbox", { name: "오늘 발견한 것을 한 줄로 남겨볼까요?" });
      await textarea.fill(marker);
      await saveDraft(page);

      await page.reload();
      await page.getByRole("tab", { name: /실습/ }).click();
      await expect(page.getByRole("textbox", { name: "오늘 발견한 것을 한 줄로 남겨볼까요?" })).toHaveValue(marker);
    });
  }
});
