import { expect, test } from "@playwright/test";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import { createHash, randomUUID } from "node:crypto";
const id = "review-abstraction";
async function finishTutorial(page: import("@playwright/test").Page, startingStep = 1) {
  for (let step = startingStep; step < 4; step++) await page.getByRole("button", { name: "맛보기 다음", exact: true }).click();
  await page.getByRole("button", { name: "나의 실전 워크북 시작", exact: true }).click();
  await expect(page.getByRole("heading", { name: "현재와 목표를 정의하기", exact: true })).toBeFocused();
}
async function moveTo(page: import("@playwright/test").Page, from: number, to: number) {
  const headings = ["현재와 목표를 정의하기", "지킬 조건 찾기", "핵심과 노이즈 구분하기", "나의 추상화 처방전"];
  for (let step = from; step !== to;) {
    const next = step < to;
    const aiButton = page.getByRole("button", { name: next && step === 2 ? "AI로 요소 만들고 다음" : "AI로 처방전 초안 만들기", exact: true });
    if (next && await aiButton.count()) {
      await page.getByRole("button", { name: step === 2 ? "직접 요소 정리하고 다음" : "직접 계획 작성하고 다음", exact: true }).click();
    } else await page.getByRole("button", { name: next ? "다음 단계 →" : "이전 단계", exact: true }).click();
    step += next ? 1 : -1;
    await expect(page.getByRole("heading", { name: headings[step - 1], exact: true })).toBeFocused();
  }
}
async function prepare(request: Parameters<typeof readyStudent>[0]) {
  await readyStudent(request);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id] });
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  return await (await request.get(`/api/classroom/work/${id}`)).json() as Work;
}

test("AI 후보 채택·맛보기 저장·키보드·상담 비보관", async ({ page }) => {
  await prepare(page.request); await db.collection("csAiUsage").doc("student-20101").delete();
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  await page.getByLabel("맛보기 상황").selectOption("late"); await page.getByRole("button", { name: "맛보기 다음" }).click(); await page.getByRole("button", { name: "맛보기 다음" }).click();
  await page.getByRole("button", { name: "남김 · 침대 이불 색깔" }).click(); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole("button", { name: "버림 · 침대 이불 색깔" })).toBeVisible();
  await finishTutorial(page, 3); await page.getByLabel("고민 키워드").fill("지각"); await page.getByRole("button", { name: "현재·목표 후보 받기" }).click();
  await page.getByRole("button", { name: "이 제안 채택" }).first().click(); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("지각함");
  await moveTo(page, 1, 2); await expect(page.getByRole("button", { name: "이 제안 채택" })).toHaveCount(0);
  await page.getByRole("button", { name: "조건 추천 받기" }).click(); await page.getByRole("button", { name: "이 제안 채택" }).first().click();
  await moveTo(page, 2, 3); await page.getByRole("button", { name: "생각 다이어트 단어 받기" }).click(); await expect(page.getByRole("button", { name: "핵심으로 남기기" })).toHaveCount(7); await page.getByRole("button", { name: "핵심으로 남기기" }).first().click();
  await moveTo(page, 3, 4); await page.getByText("실천 계획 한 번에 편집", { exact: true }).click(); await page.getByLabel("해결 계획", { exact: true }).fill("알람 설정"); await page.getByRole("button", { name: "AI 처방전 리뷰" }).click(); await expect(page.getByRole("button", { name: "선생님 확인 요청" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: "scratch/review-lessons/abstraction-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "선생님 확인 요청" }).focus(); expect((await page.getByRole("button", { name: "선생님 확인 요청" }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); const requestId = randomUUID();
  const chat = await page.request.post("/api/classroom/ai", { headers, data: { lessonId: id, revision: work.revision, task: "abstraction-chat", input: "개인 상담 질문", requestId } }); expect(chat.status()).toBe(200);
  const stored = await db.collection("csAiRequests").doc(createHash("sha256").update(JSON.stringify(["student-20101", requestId])).digest("hex")).get(); expect(stored.data()?.result).toBeUndefined(); expect(JSON.stringify(stored.data())).not.toContain("개인 상담");
});
test("맛보기 최초 완료를 유지하며 실전의 불완전 입력과 처방전을 재접속 뒤 복원한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  await finishTutorial(page);
  await page.getByLabel("현재 상태", { exact: true }).fill("과제를 미루고 있어요"); await page.getByLabel("목표 상태", { exact: true }).fill("마감 전에 제출함");
  await moveTo(page, 1, 2); await page.getByText("조건 한 번에 편집", { exact: true }).click(); await page.getByLabel("지킬 조건", { exact: true }).fill("밤 10시 이전\n");
  await moveTo(page, 2, 3); await page.getByText("후보 단어 직접 편집", { exact: true }).click(); await page.getByLabel("핵심 요소", { exact: true }).fill("현재 시각\n남은 과제");
  await moveTo(page, 3, 4); await page.getByText("실천 계획 한 번에 편집", { exact: true }).click(); await page.getByLabel("해결 계획", { exact: true }).fill("남은 과제를 확인한다\n작게 나눠 해결한다");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload();
  await expect(page.getByLabel("해결 계획", { exact: true })).toHaveValue("남은 과제를 확인한다\n작게 나눠 해결한다", { timeout: 15000 });
  await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await page.getByRole("button", { name: "작품 제출", exact: true }).click(); await expect(page.getByText("복습 작품을 제출했어요.")).toBeVisible();
  await moveTo(page, 4, 1); await page.getByLabel("현재 상태", { exact: true }).fill(""); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(work.submission.reviewProject.current).toBe("과제를 미루고 있어요"); expect(work.draft.reviewProject.plans).toHaveLength(2);
});
test("추상화의 보완 요청은 고정한 작품을 승인하며 재요청 뒤 옛 요청을 거부한다", async ({ request, playwright }) => {
  let work = await prepare(request);
  const project = work.draft.reviewProject!;
  if (project.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(project, { current: "지각함", goal: "정시 등교함", conditions: ["7시 30분에 기상"], core: ["현재 시각"], plans: ["알람 설정"] });
  const saved = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(saved.status()).toBe(200); work = await saved.json();
  await db.collection("csWork").doc(`student-20101__${id}`).update({ aiReview: { project, verdict: "uncertain", message: "계획을 함께 확인해 주세요." } });
  const ask = async () => { const response = await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type: "request-review" } } }); expect(response.status()).toBe(200); work = await response.json(); };
  await ask(); const oldId = work.review!.id; await ask(); expect(work.review!.id).not.toBe(oldId);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }); await readyTeacher(teacher);
  const decide = (requestId: string) => teacher.post(`/api/classroom/students/student-20101/review/${id}`, { headers, data: { requestId, decision: "approve", message: "" } });
  expect((await decide(oldId)).status()).toBe(409);
  if (work.draft.reviewProject?.type === "abstraction") work.draft.reviewProject.goal = "수정 중인 다른 목표";
  const edit = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(edit.status()).toBe(200);
  const approved = await decide(work.review!.id); expect(approved.status()).toBe(200); const latest = await approved.json(); expect(latest.submission.reviewProject.goal).toBe("정시 등교함"); expect(latest.draft.reviewProject.goal).toBe("수정 중인 다른 목표"); await teacher.dispose();
});

test("제공자 시간 초과·연결·JSON 오류도 현재 작품의 교사 확인을 허용한다", async ({ request }) => {
  let work = await prepare(request); await db.collection("csAiUsage").doc("student-20101").delete();
  if (work.draft.reviewProject?.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { current: "지각함", goal: "등교함", conditions: ["시간 준수"], core: ["시각"], plans: ["알람 설정"] });
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json();
  for (const input of ["fixture-timeout", "fixture-network", "fixture-json"]) {
    const response = await request.post("/api/classroom/ai", { headers, data: { lessonId: id, task: "abstraction-review", requestId: randomUUID(), revision: work.revision, input } }); expect(response.status()).toBe(input === "fixture-timeout" ? 504 : 502);
    work = await (await request.get(`/api/classroom/work/${id}`)).json(); expect(work.aiReview?.verdict).toBe("uncertain");
    const ask = await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type: "request-review" } } }); expect(ask.status()).toBe(200); work = await ask.json();
  }
});

test("빈 요소·중복 요소·빈 계획·503·시간 초과를 성공 초안으로 바꾸지 않고 원래 작품을 보존한다", async ({ request }) => {
  let work = await prepare(request); await db.collection("csAiUsage").doc("student-20101").delete();
  if (work.draft.reviewProject?.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { tutorialDone: true, view: "workbook", step: 3, current: "과제가 남았어요", goal: "제출 완료함", conditions: ["밤 10시 이전", ""], core: ["남은 과제", ""], noise: ["노트 색"], plans: ["내 계획", ""] });
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json();
  for (const [input, task, status] of [["fixture-empty-options", "abstraction-help", 502], ["fixture-duplicate-options", "abstraction-help", 502], ["fixture-empty-plan", "abstraction-plan", 502], ["fixture-whitespace-plan", "abstraction-plan", 502], ["fixture-unavailable", "abstraction-help", 503], ["fixture-timeout", "abstraction-help", 504]] as const) {
    const response = await request.post("/api/classroom/ai", { headers, data: { lessonId: id, task, requestId: randomUUID(), revision: work.revision, input } });
    expect(response.status()).toBe(status);
    const latest = await (await request.get(`/api/classroom/work/${id}`)).json() as Work;
    expect(latest.draft.reviewProject).toEqual(work.draft.reviewProject);
    expect(latest.submission).toEqual(work.submission);
  }
});

test("31줄의 불완전 편집은 AI 채택과 재접속 뒤에도 보존하며 직접 입력 상한을 안내한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await finishTutorial(page); await moveTo(page, 1, 2);
  await page.getByText("조건 한 번에 편집", { exact: true }).click();
  const input = page.getByLabel("지킬 조건", { exact: true }), lines = Array.from({ length: 31 }, (_, i) => `조건${i}`).join("\n");
  await input.fill(lines); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(input).toHaveValue(lines);
  await db.collection("csAiUsage").doc("student-20101").delete();
  await page.getByRole("button", { name: "조건 추천 받기" }).click(); await page.getByRole("button", { name: "이 제안 채택" }).first().click();
  await expect(input).toHaveValue(`${lines}\n조건을 지키기`); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(input).toHaveValue(`${lines}\n조건을 지키기`);
  await expect(input).toHaveAttribute("maxlength", "1000"); await page.getByText("조건 한 번에 편집", { exact: true }).click(); await input.fill("가".repeat(1000)); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(input).toHaveValue("가".repeat(1000));
  await page.getByText("조건 한 번에 편집", { exact: true }).click(); await input.fill("\n".repeat(1000)); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "조건 다시 추천 받기", exact: true }).click(); await page.getByRole("button", { name: "이 제안 채택" }).first().click();
  await expect(page.getByRole("complementary", { name: "추상화 닥터" }).getByRole("alert")).toContainText("제안이 저장 한도를 넘어요"); await expect(input).toHaveValue("\n".repeat(1000)); await page.reload(); await expect(input).toHaveValue("\n".repeat(1000));
});
