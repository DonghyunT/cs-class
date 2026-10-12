import { expect, test } from "@playwright/test";
import { db, headers, readyStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
import type { AbstractionProject } from "../src/lib/classroom/review/project";

const id = "review-abstraction";
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async ({ page }) => {
  await page.goto("about:blank");
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
});

async function openWorkbook(page: import("@playwright/test").Page, step = 2, topic = "과제", fields: Partial<AbstractionProject> = {}) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id], currentLessonId: null });
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csAiUsage").doc("student-20101").delete();
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  if (work.draft.reviewProject?.type !== "abstraction") throw Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { tutorialDone: true, view: "workbook", step, topic, current: "과제가 남았어요", goal: "마감 전에 제출함", conditions: ["밤 10시 이전", "직접 해결하기", ""], core: ["남은 과제", "현재 시각"], noise: ["노트 표지 색"], plans: ["내가 정한 계획"], ...fields });
  work.draft.stage = "practice";
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).ok()).toBe(true);
  if (fields.tutorialDone === false) await db.collection("csWork").doc(`student-20101__${id}`).update({ submission: { id: "legacy-submission", order: [], submittedAt: 1, reviewProject: { ...work.draft.reviewProject, current: "제출한 현재 상태", plans: ["제출한 실천 계획"] } } });
  await page.goto(`/classroom/${id}`);
  if (fields.tutorialDone !== false) await expect(page.getByText(`Step ${step}/4 · 나의 문제 해결 워크북`, { exact: false })).toBeVisible();
}

async function moveTo(page: import("@playwright/test").Page, from: number, to: number) {
  const headings = ["현재와 목표를 정의하기", "지킬 조건 찾기", "핵심과 노이즈 구분하기", "나의 추상화 처방전"];
  for (let step = from; step !== to;) {
    await page.getByRole("button", { name: step < to ? "다음 단계 →" : "이전 단계", exact: true }).click();
    step += step < to ? 1 : -1;
    await expect(page.getByRole("heading", { name: headings[step - 1], exact: true })).toBeFocused();
  }
}

test("미완료 옛 워크북은 맛보기 1회를 거친 뒤 원래 단계와 미완성 작품으로 돌아온다", async ({ page }) => {
  await openWorkbook(page, 4, "과제", { tutorialDone: false, current: "", plans: [""], adopted: [{ kind: "core", value: "현재 시각" }] });
  await expect(page.getByRole("heading", { name: /맛보기 1\/4/ })).toBeVisible();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "추상화 활동", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "워크북 단계", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "맛보기 다음", exact: true }).click();
  await page.getByRole("button", { name: "맛보기 다음", exact: true }).click();
  await page.getByRole("button", { name: "남김 · 마지막 연락 시간", exact: true }).click();
  await page.getByRole("button", { name: "맛보기 다음", exact: true }).click();
  await page.getByRole("button", { name: "나의 실전 워크북 시작", exact: true }).click();
  await expect(page.getByRole("heading", { name: "나의 추상화 처방전", exact: true })).toBeFocused();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  expect(work.draft.reviewProject).toMatchObject({ tutorialDone: true, step: 4, current: "", core: ["남은 과제", "현재 시각"], plans: [""], adopted: [{ kind: "core", value: "현재 시각" }] });
  expect(work.submission).toMatchObject({ id: "legacy-submission", submittedAt: 1, reviewProject: { current: "제출한 현재 상태", plans: ["제출한 실천 계획"] } });
});

test("명시한 AI 생성은 최신 3단계의 요소 7개를 모두 남기고 클릭한 요소만 제자리에서 버린다", async ({ page }) => {
  await openWorkbook(page, 2, "과제", { core: [], noise: [], plans: [] });
  const requestStarted = page.waitForRequest(request => request.url().endsWith("/api/classroom/ai"));
  await page.getByRole("button", { name: "AI로 요소 만들고 다음", exact: true }).click();
  expect((await requestStarted).postDataJSON()).toMatchObject({ task: "abstraction-help" });
  await expect(page.getByRole("heading", { name: "핵심과 노이즈 구분하기", exact: true })).toBeFocused();
  const candidates = page.getByLabel("생각 다이어트 후보 단어", { exact: true });
  await expect(candidates.getByRole("button")).toHaveCount(7);
  const order = await candidates.getByRole("button").allTextContents();
  const word = order[1].replace("남김 · ", "");
  await candidates.getByRole("button", { name: `남김 · ${word}`, exact: true }).click();
  await expect(candidates.getByRole("button", { name: `버림 · ${word}`, exact: true })).toBeFocused();
  expect((await candidates.getByRole("button").allTextContents()).map(text => text.replace(/^(남김|버림) · /, ""))).toEqual(order.map(text => text.replace("남김 · ", "")));
  await expect(page.getByRole("region", { name: "버릴 노이즈", exact: true })).toContainText(word);
  await expect(page.getByRole("region", { name: "닥터 대화", exact: true })).toContainText("합성 AI 피드백");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const discarded = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  expect(discarded.draft.reviewProject).toMatchObject({ step: 3, noise: [word] });
  await page.reload();
  await expect(candidates.getByRole("button")).toHaveCount(7);
  expect((await candidates.getByRole("button").allTextContents()).map(text => text.replace(/^(남김|버림) · /, ""))).toEqual(order.map(text => text.replace("남김 · ", "")));
  await candidates.getByRole("button", { name: `버림 · ${word}`, exact: true }).click();
  await page.getByRole("button", { name: "AI로 처방전 초안 만들기", exact: true }).click();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).not.toHaveValue("");
  const plans = page.getByRole("list", { name: "실천 계획", exact: true }).locator("li");
  expect(await plans.count()).toBeGreaterThanOrEqual(3);
  expect(await plans.count()).toBeLessThanOrEqual(5);
  await moveTo(page, 4, 3);
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  if (work.draft.reviewProject?.type !== "abstraction") throw Error("wrong lesson");
  expect(work.draft.reviewProject.noise).toEqual([]);
  expect(work.draft.reviewProject.core).toHaveLength(7);
});

test("길이 1인 빈 요소와 계획은 AI가 덮지 않고 단계 왕복과 재접속 뒤 보존한다", async ({ page }) => {
  await openWorkbook(page, 2, "과제", { core: [""], noise: [], plans: [""] });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) requests.push(request.url()); });
  await expect(page.getByRole("button", { name: "AI로 요소 만들고 다음", exact: true })).toHaveCount(0);
  await moveTo(page, 2, 3);
  await expect(page.getByRole("button", { name: "AI로 처방전 초안 만들기", exact: true })).toHaveCount(0);
  await moveTo(page, 3, 4);
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("");
  await moveTo(page, 4, 3);
  await page.getByText("후보 단어 직접 편집", { exact: true }).click();
  await expect(page.getByLabel("핵심 요소", { exact: true })).toHaveValue("");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json() as Work;
  expect(work.draft.reviewProject).toMatchObject({ core: [""], noise: [], plans: [""] });
  expect(requests).toEqual([]);
});

test("최초 요소 생성의 늦은 응답은 기다리며 직접 입력한 핵심을 덮지 않는다", async ({ page }) => {
  await openWorkbook(page, 2, "fixture-slow", { core: [], noise: [], plans: [] });
  const started = page.waitForRequest(request => request.url().endsWith("/api/classroom/ai"));
  await page.getByRole("button", { name: "AI로 요소 만들고 다음", exact: true }).click();
  await started;
  await page.getByText("후보 단어 직접 편집", { exact: true }).click();
  await page.getByLabel("핵심 요소", { exact: true }).fill("직접 쓴 핵심\n");
  await expect(page.getByRole("region", { name: "닥터 대화", exact: true }).getByRole("alert")).toContainText(/작품이 바뀌|보존/);
  await expect(page.getByLabel("핵심 요소", { exact: true })).toHaveValue("직접 쓴 핵심\n");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText("후보 단어 직접 편집", { exact: true }).click();
  await expect(page.getByLabel("핵심 요소", { exact: true })).toHaveValue("직접 쓴 핵심\n");
});

test("빈 계획 제안 실패와 재시도는 기존 계획과 상담 입력을 보존한다", async ({ page }) => {
  await openWorkbook(page, 4, "fixture-whitespace-plan");
  const chat = page.getByRole("region", { name: "닥터 대화", exact: true });
  const input = page.getByLabel("처방전 상담 질문", { exact: true });
  await input.fill("이미 작성하던 상담 질문");
  await page.getByRole("button", { name: "해결 계획 추천 받기", exact: true }).click();
  await expect(chat.getByRole("alert")).toContainText("빈 단계");
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("내가 정한 계획");
  await expect(input).toHaveValue("이미 작성하던 상담 질문");
  await expect(chat.getByRole("button", { name: "추천 계획 모두 채택", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "이 요청 다시 시도", exact: true }).click();
  await expect(chat.getByRole("alert")).toHaveCount(2);
  await expect(input).toHaveValue("이미 작성하던 상담 질문");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("실천 계획 1", { exact: true })).toHaveValue("내가 정한 계획");
});

test("네 단계 닥터의 Enter·줄바꿈·한글 조합과 단계별 입력 초안을 유지한다", async ({ page }) => {
  await openWorkbook(page, 1);
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) requests.push(request.url()); });
  const doctor = page.getByRole("complementary", { name: "추상화 닥터", exact: true });
  for (let step = 1; step <= 4; step++) {
    const input = doctor.getByRole("textbox");
    await input.fill(`${step}단계 질문`);
    await input.press("Shift+Enter");
    await expect(input).toHaveValue(`${step}단계 질문\n`);
    await input.evaluate(element => { element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })); element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 229, isComposing: true, bubbles: true })); element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })); });
    expect(requests).toHaveLength(step - 1);
    const sent = page.waitForRequest(request => request.url().endsWith("/api/classroom/ai"));
    await input.press("Enter");
    await sent;
    await expect(doctor.getByRole("region", { name: "닥터 대화", exact: true })).toContainText("합성 AI 피드백");
    await expect(doctor.getByRole("button", { name: step === 4 ? "처방전 상담하기" : "전송", exact: true })).toBeEnabled();
    await input.fill(`${step}단계 다음 입력`);
    if (step < 4) await moveTo(page, step, step + 1);
  }
  await moveTo(page, 4, 1);
  await expect(doctor.getByRole("textbox")).toHaveValue("1단계 다음 입력");
  await expect(doctor.getByRole("region", { name: "닥터 대화", exact: true })).toContainText("1단계 질문");
  expect(requests).toHaveLength(4);
});

test("긴 닥터 대화는 내부에서 읽고 과거를 읽는 중 새 요청과 실패 뒤 위치를 유지한다", async ({ page }) => {
  await openWorkbook(page, 4);
  const doctor = page.getByRole("complementary", { name: "추상화 닥터", exact: true });
  const chat = doctor.getByRole("region", { name: "닥터 대화", exact: true });
  const input = page.getByLabel("처방전 상담 질문", { exact: true });
  const initialHeight = (await doctor.boundingBox())!.height;
  for (let i = 0; i < 4; i++) {
    await input.fill(`상담 ${i}: ${"현재 계획을 어떻게 실행할까요? ".repeat(30)}`);
    await input.press("Enter");
    await expect(chat.getByText("합성 AI 피드백", { exact: true })).toHaveCount(i + 1);
  }
  await expect.poll(() => chat.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  expect((await doctor.boundingBox())!.height).toBe(initialHeight);
  await chat.focus();
  await chat.press("Home");
  await expect.poll(() => chat.evaluate(element => element.scrollTop)).toBe(0);
  await input.fill("fixture-network");
  await input.press("Enter");
  await expect(chat.getByRole("alert")).toBeVisible();
  expect(await chat.evaluate(element => element.scrollTop)).toBe(0);
  await expect(input).toHaveValue("fixture-network");
  await moveTo(page, 4, 3);
  await moveTo(page, 3, 4);
  expect(await chat.evaluate(element => element.scrollTop)).toBe(0);
  await expect(input).toHaveValue("fixture-network");
  await expect(chat.getByText("합성 AI 피드백", { exact: true })).toHaveCount(4);
  await chat.focus();
  await chat.press("End");
  await expect.poll(() => chat.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop < 2)).toBe(true);
  await expect(page.getByRole("button", { name: "처방전 상담하기", exact: true })).toBeVisible();
});

test("추상화 조건·태그·처방전 카드를 직접 편집하고 미완성 값을 복원한다", async ({ page }) => {
  await openWorkbook(page);
  const requests: string[] = []; page.on("request", request => { if (request.url().endsWith("/api/classroom/ai")) requests.push(request.url()); });
  const conditions = page.getByRole("list", { name: "조건 목록", exact: true });
  await expect(conditions.locator("li")).toHaveCount(3);
  await page.getByLabel("조건 2", { exact: true }).fill("직접 생각하고 해결하기");
  await page.getByRole("button", { name: "조건 1 삭제", exact: true }).click();
  await expect(page.getByLabel("조건 1", { exact: true })).toBeFocused();
  await moveTo(page, 2, 3);
  await page.getByRole("button", { name: "남김 · 현재 시각", exact: true }).click();
  await expect(page.getByRole("button", { name: "버림 · 현재 시각", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "버릴 노이즈", exact: true })).toContainText("현재 시각");
  await page.getByRole("button", { name: "버림 · 현재 시각", exact: true }).click();
  await expect(page.getByRole("button", { name: "남김 · 현재 시각", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "생각 다이어트 단어 받기", exact: true })).toBeVisible();
  await moveTo(page, 3, 4);
  const prescription = page.getByRole("region", { name: "추상화 처방전", exact: true });
  await expect(prescription).toContainText("과제가 남았어요");
  await expect(prescription).toContainText("직접 생각하고 해결하기");
  await page.getByLabel("실천 계획 1", { exact: true }).fill("남은 과제를 먼저 확인한다");
  await page.getByRole("button", { name: "실천 단계 추가", exact: true }).click();
  await expect(page.getByLabel("실천 계획 2", { exact: true })).toBeFocused();
  await page.getByText("문제 상태와 생각 다이어트 수정", { exact: true }).click();
  await page.getByLabel("현재 상태", { exact: true }).fill("과제가 아직 두 개 남았어요");
  await expect(prescription).toContainText("과제가 아직 두 개 남았어요");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "처방전 복사", exact: true }).click();
  await expect(page.getByText("처방전을 복사했어요.", { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("현재: 과제가 아직 두 개 남았어요");
  expect(copied).toContain("1. 남은 과제를 먼저 확인한다");
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
  await moveTo(page, 4, 2);
  await page.getByRole("button", { name: "조건 추천 받기", exact: true }).click();
  await expect(chat).toContainText("조건을 지키기");
  await chat.getByRole("button", { name: "이 제안 채택", exact: true }).first().click();
  await page.getByRole("tab", { name: /^개념 / }).click();
  await page.getByRole("tab", { name: /^실습 / }).click();
  await expect(chat).toContainText("조건을 지키기");
  await expect(page.getByRole("button", { name: "조건 다시 추천 받기", exact: true })).toBeVisible();
  await moveTo(page, 2, 4);
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
  await moveTo(page, 4, 2);
  await expect(page.getByRole("button", { name: "조건 다시 추천 받기", exact: true })).toBeVisible();
});
