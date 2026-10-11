import { expect, test } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";

const id = "review-abstraction";
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
});

async function openWorkbook(page: import("@playwright/test").Page, step = 2, topic = "과제") {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id], currentLessonId: null });
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csAiUsage").doc("student-20101").delete();
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  if (work.draft.reviewProject?.type !== "abstraction") throw Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { view: "workbook", step, topic, current: "과제가 남았어요", goal: "마감 전에 제출함", conditions: ["밤 10시 이전", "직접 해결하기", ""], core: ["남은 과제", "현재 시각"], noise: ["노트 표지 색"], plans: ["내가 정한 계획"] });
  work.draft.stage = "practice";
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).ok()).toBe(true);
  await page.goto(`/classroom/${id}`);
  await expect(page.getByRole("button", { name: "실전 워크북", exact: true })).toHaveAttribute("aria-pressed", "true");
}

test("추상화 조건·태그·처방전 카드를 직접 편집하고 미완성 값을 복원한다", async ({ page }) => {
  await openWorkbook(page);
  const requests: string[] = []; page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) requests.push(request.url()); });
  const conditions = page.getByRole("list", { name: "조건 목록", exact: true });
  await expect(conditions.locator("li")).toHaveCount(3);
  await page.getByLabel("조건 2", { exact: true }).fill("직접 생각하고 해결하기");
  await page.getByRole("button", { name: "조건 1 삭제", exact: true }).click();
  await expect(page.getByLabel("조건 1", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "3. 생각 다이어트", exact: true }).click();
  await page.getByRole("button", { name: "남김 · 현재 시각", exact: true }).click();
  await expect(page.getByRole("button", { name: "버림 · 현재 시각", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "버릴 노이즈", exact: true })).toContainText("현재 시각");
  await page.getByRole("button", { name: "버림 · 현재 시각", exact: true }).click();
  await expect(page.getByRole("button", { name: "남김 · 현재 시각", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "생각 다이어트 단어 받기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4. 처방전", exact: true }).click();
  const prescription = page.getByRole("region", { name: "추상화 처방전", exact: true });
  await expect(prescription).toContainText("과제가 남았어요");
  await expect(prescription).toContainText("직접 생각하고 해결하기");
  await page.getByLabel("실천 계획 1", { exact: true }).fill("남은 과제를 먼저 확인한다");
  await page.getByRole("button", { name: "실천 단계 추가", exact: true }).click();
  await expect(page.getByLabel("실천 계획 2", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "인쇄 / PDF", exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("남은 과제를 먼저 확인한다");
  await expect(page.getByLabel("실천 계획 2", { exact: true })).toHaveValue("");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  if (work.draft.reviewProject?.type !== "abstraction") throw Error("wrong lesson");
  expect(work.draft.reviewProject.conditions).toEqual(["직접 생각하고 해결하기", ""]);
  expect(work.draft.reviewProject.core).toEqual(["남은 과제", "현재 시각"]);
  expect(requests).toEqual([]);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("complementary", { name: "추상화 닥터", exact: true })).toBeHidden();
  const printedPlan = prescription.getByRole("list", { name: "실천 계획", exact: true }).locator("p").first();
  await expect(printedPlan).toBeVisible();
  await expect(printedPlan).toHaveText("남은 과제를 먼저 확인한다");
  expect((await prescription.boundingBox())?.width).toBeGreaterThan((page.viewportSize()?.width ?? 1280) * 0.8);
});

test("추상화 닥터 중복 요청은 한 번만 보내고 늦은 응답은 새 계획을 덮지 않는다", async ({ page }) => {
  await openWorkbook(page, 4, "fixture-slow");
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) requests.push(request.url()); });
  const requestStarted = page.waitForRequest(request => request.url().endsWith("/api/classroom/ai"));
  await page.getByRole("button", { name: "해결 계획 추천 받기", exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click();
  });
  await requestStarted;
  await page.getByLabel("실천 계획 1", { exact: true }).fill("응답을 기다리며 직접 수정한 계획");
  const chat = page.getByRole("region", { name: "닥터 대화", exact: true });
  await expect(chat.getByRole("alert")).toContainText(/작품이 바뀌|보존/);
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("응답을 기다리며 직접 수정한 계획");
  await expect(chat.getByRole("button", { name: "추천 계획 모두 채택", exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(1);
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("응답을 기다리며 직접 수정한 계획");
  expect(requests).toHaveLength(1);
});

test("추상화 닥터의 단계별 대화와 실패 전 제안을 유지하고 기존 계획에 선택해 더한다", async ({ page }) => {
  await openWorkbook(page, 4);
  await page.getByRole("button", { name: "해결 계획 추천 받기", exact: true }).click();
  const chat = page.getByRole("region", { name: "닥터 대화", exact: true });
  await expect(chat).toContainText("조건을 지키기");
  await expect(page.getByRole("button", { name: "해결 계획 다시 추천 받기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "추천 계획 모두 채택", exact: true }).click();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("내가 정한 계획");
  await expect(page.getByLabel("실천 계획 2", { exact: true })).toHaveValue("조건을 지키기");
  await page.getByRole("button", { name: "2. 조건", exact: true }).click();
  await page.getByRole("button", { name: "조건 추천 받기", exact: true }).click();
  await expect(chat).toContainText("조건을 지키기");
  await chat.getByRole("button", { name: "이 제안 채택", exact: true }).first().click();
  await page.getByRole("tab", { name: /^개념 / }).click();
  await page.getByRole("tab", { name: /^실습 / }).click();
  await expect(chat).toContainText("조건을 지키기");
  await expect(page.getByRole("button", { name: "조건 다시 추천 받기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4. 처방전", exact: true }).click();
  await expect(chat).toContainText("목표에 도달하기");
  await page.getByLabel("처방전 상담 질문", { exact: true }).fill("fixture-network");
  await page.getByRole("button", { name: "처방전 상담하기", exact: true }).click();
  await expect(chat.getByRole("alert")).toBeVisible();
  await expect(chat).toContainText("목표에 도달하기");
  await expect(page.getByLabel("처방전 상담 질문", { exact: true })).toHaveValue("fixture-network");
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("내가 정한 계획");
  await page.getByRole("button", { name: "이 요청 다시 시도", exact: true }).click();
  await expect(chat.getByRole("alert")).toHaveCount(2);
  await expect(chat).toContainText("목표에 도달하기");
  await expect(page.getByLabel("처방전 상담 질문", { exact: true })).toHaveValue("fixture-network");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "해결 계획 다시 추천 받기", exact: true })).toBeVisible();
  await expect(chat).not.toContainText("fixture-network");
  await page.getByRole("button", { name: "2. 조건", exact: true }).click();
  await expect(page.getByRole("button", { name: "조건 다시 추천 받기", exact: true })).toBeVisible();
});
