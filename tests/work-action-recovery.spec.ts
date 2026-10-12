import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { auth, correctOrder, db, headers, initialPassword, lessonId, loginStudent, resetStudent, studentPassword } from "./emulator";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";
import type { Work, WorkAction } from "../src/lib/classroom/types";

const studentId = "20109", uid = `student-${studentId}`;
const endpoint = `/api/classroom/work/${lessonId}`;
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeAll(async () => { originalClass = (await db.doc("csClasses/2-1").get()).data(); });
test.beforeEach(async ({ page }) => {
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await page.goto(`/classroom/${lessonId}`);
});
test.afterAll(async () => {
  await db.doc(`csWork/${uid}__${lessonId}`).delete();
  await db.doc(`csWork/${uid}__programming-13`).delete();
  await db.doc(`csAccounts/${uid}`).delete();
  for (const password of [initialPassword, studentPassword]) await db.doc(`csRateLimits/${createHash("sha256").update(`credential:${uid}:${passwordDigest(password)}`).digest("hex")}`).delete();
  if (originalClass) await db.doc("csClasses/2-1").set(originalClass);
  await auth.deleteUser(uid).catch(() => {});
});
async function chooseConcept(page: Page) {
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true }).check();
}
async function stored(page: Page): Promise<Work> { return (await page.request.get(endpoint)).json(); }
async function prepareAction(page: Page, type: WorkAction["type"]) {
  let work = await stored(page);
  const draft = { ...work.draft, stage: type === "grade-quiz" || type === "retry-quiz" ? "quiz" : "practice", quizAnswers: { q1: "a", q2: "a", q3: "c" }, practiceOrder: correctOrder };
  const save = await page.request.post(endpoint, { headers, data: { revision: work.revision, draft } });
  expect(save.status()).toBe(200); work = await save.json();
  if (type === "retry-quiz" || type === "submit-practice") {
    const result = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: type === "retry-quiz" ? "grade-quiz" : "validate-practice" } } });
    expect(result.status()).toBe(200); work = await result.json();
  }
  await page.reload();
  return work;
}

for (const status of [200, 503, 409]) {
  test(`단계 저장 대기 안내·중복 이동 차단·입력 보존 (${status})`, async ({ page }) => {
    let started!: () => void, release!: () => void, posts = 0;
    const pending = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**${endpoint}`, async route => {
      if (route.request().method() !== "POST" || route.request().postDataJSON().draft.stage !== "quiz") return route.continue();
      posts++; started(); await gate;
      if (status === 200) await route.continue();
      else await route.fulfill({ status, json: { code: status === 409 ? "REVISION_CONFLICT" : "UNAVAILABLE", message: "시험 단계 저장 실패" } });
    });
    await chooseConcept(page);
    const quiz = page.getByRole("tab", { name: "퀴즈 0%", exact: true });
    try {
      await quiz.click(); await pending;
      await expect(page.getByText("입력 저장 후 퀴즈로 이동 중…", { exact: true })).toBeVisible();
      await expect(quiz).toBeDisabled();
      await expect(page.getByRole("tab", { name: "개념 0%", exact: true })).toHaveAttribute("aria-selected", "true");
      await quiz.dispatchEvent("click");
      expect(posts).toBe(1);
    } finally { release(); }
    await expect(page.getByText("입력 저장 후 퀴즈로 이동 중…", { exact: true })).toHaveCount(0);
    if (status === 200) {
      await expect(quiz).toHaveAttribute("aria-selected", "true");
      await expect(quiz).toBeFocused();
      expect((await stored(page)).draft.conceptAnswers.algorithm).toBe("clear");
    } else {
      await expect(page.locator("#work-save-error")).toContainText("시험 단계 저장 실패");
      await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true })).toBeChecked();
      await expect(page.getByRole("tab", { name: "개념 0%", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(quiz).toBeEnabled();
    }
    expect(posts).toBe(1);
  });
}

test("저장 성공 뒤 행동 거부는 저장 실패로 표시하거나 이동을 막지 않음", async ({ page }) => {
  await page.route(`**${endpoint}/action`, route => route.fulfill({ status: 400, json: { code: "ACTION_DENIED", message: "현재 답안으로는 확인할 수 없어요." } }));
  await chooseConcept(page);
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#work-action-error")).toContainText("현재 답안으로는 확인할 수 없어요.");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
  await expect(page.locator("#work-action-error")).toContainText("현재 답안으로는 확인할 수 없어요.");
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/lessons$/);
});

for (const [type, label] of [["grade-quiz", "이번 회차 결과 확인"], ["retry-quiz", "틀린 문제만 다시 풀기"], ["validate-practice", "순서 검증"], ["submit-practice", "작품 제출"]] as const) {
  test(`${type} 반영 뒤 응답 유실은 중복 실행 없이 원래 기록을 표시`, async ({ page }) => {
    const before = await prepareAction(page, type);
    let posts = 0;
    await page.route(`**${endpoint}/action`, async route => { posts++; await route.fetch(); await route.abort("failed"); });
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator("#work-action-error")).toBeVisible();
    await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    const after = await stored(page);
    expect(after.revision).toBe(before.revision + 1);
    expect(posts).toBe(1);
    if (type === "retry-quiz") {
      expect(after.quizRound).toBe(before.quizRound + 1);
      await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
      expect(after.draft.quizAnswers.q2).toBeUndefined();
    } else if (type === "grade-quiz") await expect(page.getByRole("tab", { name: "퀴즈 67%", exact: true })).toBeVisible();
    else if (type === "validate-practice") await expect(page.locator("#practice-feedback")).toBeFocused();
    else await expect(page.getByRole("tab", { name: "실습 100%", exact: true })).toContainText("완료");
  });
}

for (const originalFirst of [false, true]) {
  test(`GET가 원래 revision이어도 미실행으로 단정하지 않고 같은 요청만 수동 전송 (${originalFirst ? "원 요청" : "재요청"} 먼저)`, async ({ page }) => {
    const before = await prepareAction(page, "retry-quiz");
    let posts = 0;
    const payload = { revision: before.revision, action: { type: "retry-quiz" } };
    await page.route(`**${endpoint}/action`, async route => {
      posts++;
      expect(route.request().postDataJSON()).toEqual(payload);
      if (posts === 1) await route.abort("failed");
      else {
        if (originalFirst) expect((await page.request.post(`${endpoint}/action`, { headers, data: payload })).status()).toBe(200);
        await route.fulfill({ response: await route.fetch() });
      }
    });
    await page.getByRole("button", { name: "틀린 문제만 다시 풀기", exact: true }).click();
    await expect(page.locator("#work-action-error")).toBeVisible();
    await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    await expect(page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true })).toBeVisible();
    expect(posts).toBe(1);
    await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/classroom/${lessonId}$`));
    await page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true }).click();
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    if (!originalFirst) expect((await page.request.post(`${endpoint}/action`, { headers, data: payload })).status()).toBe(409);
    expect((await stored(page)).quizRound).toBe(before.quizRound + 1);
    expect(posts).toBe(2);
  });
}

test("결과 조회 실패와 느린 조회 중 새 입력은 보존하고 해결 후 저장", async ({ page }) => {
  await page.route(`**${endpoint}/action`, async route => { await route.fetch(); await route.abort("failed"); });
  await chooseConcept(page);
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#work-action-error")).toBeVisible();
  let fail = true, savePosts = 0, started!: () => void, release!: () => void;
  const getStarted = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() === "POST") { savePosts++; await route.continue(); }
    else if (fail) await route.fulfill({ status: 503, json: { message: "결과 조회 실패" } });
    else { started(); await gate; await route.continue(); }
  });
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.locator("#work-action-error")).toContainText("결과 조회 실패");
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true })).toBeChecked();
  fail = false;
  try {
    await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    await getStarted;
    await page.getByRole("radio", { name: "물을 적당히 준비한다", exact: true }).check();
    expect(savePosts).toBe(0);
  } finally { release(); }
  await expect(page.locator("#work-action-error")).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).draft.conceptAnswers.algorithm).toBe("vague");
});

test("불완전한 결과 응답과 다른 창의 변경은 자동 채택하지 않음", async ({ page }) => {
  await prepareAction(page, "validate-practice");
  await page.route(`**${endpoint}/action`, async route => { await route.fetch(); await route.abort("failed"); });
  await page.getByRole("button", { name: "순서 검증", exact: true }).click();
  await expect(page.locator("#work-action-error")).toBeVisible();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const missing of ["conceptSolved", "draft"] as const) {
    await page.route(`**${endpoint}`, async route => {
      const response = await route.fetch(), data = await response.json();
      if (missing === "draft") data.draft = {};
      else delete data.conceptSolved;
      await route.fulfill({ response, json: data });
    });
    await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
    await expect(page.locator("#work-action-error")).toContainText("수업 기록을 확인하지 못했어요.");
    await expect(page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true })).toHaveCount(0);
    await page.unroute(`**${endpoint}`);
  }
  const current = await stored(page);
  expect((await page.request.post(endpoint, { headers, data: { revision: current.revision, draft: { ...current.draft, practiceOrder: [...correctOrder].reverse() } } })).status()).toBe(200);
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.getByRole("region", { name: "저장 충돌 비교", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "서버 기록으로 이어하기", exact: true }).click();
  await expect(page.locator("#work-save-error")).toHaveCount(0);
});

test("수동 재전송의 응답도 유실되면 자동 재전송 없이 다음 GET에서 복구", async ({ page }) => {
  const before = await prepareAction(page, "retry-quiz");
  let posts = 0;
  await page.route(`**${endpoint}/action`, async route => { posts++; if (posts > 1) await route.fetch(); await route.abort("failed"); });
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기", exact: true }).click();
  await expect(page.locator("#work-action-error")).toBeVisible();
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await page.getByRole("button", { name: "저장된 요청 다시 보내기", exact: true }).click();
  await expect(page.locator("#work-action-error")).toContainText("결과 조회도 완료하지 못했어요.");
  expect(posts).toBe(2);
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.locator("#work-action-error")).toHaveCount(0);
  expect((await stored(page)).quizRound).toBe(before.quizRound + 1);
  expect(posts).toBe(2);
});

for (const unknown of [false, true]) {
  test(`행동 응답을 기다리는 이동은 ${unknown ? "결과 불명에서 보호" : "확인된 거부 뒤 허용"}`, async ({ page }) => {
    let started!: () => void, release!: () => void;
    const pending = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**${endpoint}/action`, async route => {
      started(); await gate;
      if (unknown) await route.abort("failed");
      else await route.fulfill({ status: 400, json: { code: "ACTION_DENIED", message: "행동 거부" } });
    });
    await chooseConcept(page);
    try {
      await page.getByRole("button", { name: "정답 확인", exact: true }).click();
      await pending;
      await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/classroom/${lessonId}$`));
    } finally { release(); }
    if (unknown) {
      await expect(page.locator("#work-action-error")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/classroom/${lessonId}$`));
    } else await expect(page).toHaveURL(/\/student\/lessons$/);
  });
}

test("개념 요청 반영 뒤 응답 유실은 GET로 결과를 회복하고 POST를 반복하지 않음", async ({ page }) => {
  let posts = 0;
  await page.route(`**${endpoint}/action`, async route => { posts++; await route.fetch(); await route.abort("failed"); });
  await chooseConcept(page);
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await expect(page.locator("#work-action-error")).toBeVisible();
  await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
  await expect(page.locator("#concept-feedback-algorithm")).toBeFocused();
  await expect(page.getByRole("tab", { name: "개념 50%", exact: true })).toBeVisible();
  await expect(page.locator("#work-action-error")).toHaveCount(0);
  expect(posts).toBe(1);
});

for (const programming of [false, true]) {
  test(`복구 조회 중 개념 이동은 현재 개념 화면에 초점을 복구 (${programming ? "프로그래밍" : "일반"})`, async ({ page }) => {
    const id = programming ? "programming-13" : lessonId;
    const workEndpoint = `/api/classroom/work/${id}`;
    const first = programming ? "pc4" : "algorithm", second = programming ? "pc1" : "sequence";
    const answers = programming ? { pc4: "0", pc1: "2" } : { algorithm: "clear", sequence: "save" };
    const secondTitle = programming ? "이름이 인사말이 되기까지" : "순서에 따라 결과가 달라져요";
    const secondAnswer = programming ? "출력" : "내용을 저장해요";
    if (programming) {
      await db.doc(`csWork/${uid}__${id}`).delete();
      await db.doc("csClasses/2-1").update({ currentLessonId: id, openedLessonIds: [lessonId, id] });
    }
    let before: Work = await (await page.request.get(workEndpoint)).json();
    const save = await page.request.post(workEndpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "concept", conceptAnswers: answers } } });
    expect(save.status()).toBe(200); before = await save.json();
    // Give concept B an existing result so the shared programming feedback ID exposes a wrong focus target.
    const checked = await page.request.post(`${workEndpoint}/action`, { headers, data: { revision: before.revision, action: { type: "check-concept", conceptId: second } } });
    expect(checked.status()).toBe(200); before = await checked.json();
    await page.goto(`/classroom/${id}`);
    let posts = 0;
    await page.route(`**${workEndpoint}/action`, async route => {
      posts++;
      expect(route.request().postDataJSON()).toEqual({ revision: before.revision, action: { type: "check-concept", conceptId: first } });
      await route.fetch(); await route.abort("failed");
    });
    await page.getByRole("button", { name: programming ? "생각 확인하기" : "정답 확인", exact: true }).click();
    await expect(page.locator("#work-action-error")).toBeVisible();
    let started!: () => void, release!: () => void;
    const getStarted = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**${workEndpoint}`, async route => {
      if (route.request().method() === "GET") { started(); await gate; }
      await route.continue();
    });
    const secondHeading = page.locator(programming ? "#concept-title" : "#concept-title-sequence");
    try {
      await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
      await getStarted;
      await page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: new RegExp(secondTitle) }).click();
      await expect(secondHeading).toHaveText(secondTitle);
      await expect(page.locator(programming ? "#concept-feedback" : "#concept-feedback-sequence")).toBeVisible();
    } finally { release(); }
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    await expect(page.locator("#stage-heading-concept")).toBeFocused();
    await expect(secondHeading).toHaveText(secondTitle);
    await expect(page.getByRole("radio", { name: secondAnswer, exact: true })).toBeChecked();
    const after: Work = await (await page.request.get(workEndpoint)).json();
    expect(after.draft).toEqual(before.draft);
    expect(after.conceptSolved).toEqual([second, first]);
    expect(after.revision).toBe(before.revision + 1);
    expect(posts).toBe(1);
  });
}

for (const programming of [false, true]) {
  test(`복구 조회 중 후기 답안은 보존하고 채점 당시 결과로 표시 (${programming ? "프로그래밍" : "일반"})`, async ({ page }) => {
    const id = programming ? "programming-13" : lessonId;
    const workEndpoint = `/api/classroom/work/${id}`;
    const question = programming ? "flow" : "q2", lateAnswer = programming ? "2" : "b";
    const answerLabel = programming ? "수 입력 → 곱하기 → 결과 보여주기" : "숫자 입력 → 숫자 출력";
    const hint = programming ? "계산을 시작하려면 무엇을 먼저 알아야 할까요?" : "화면에 보여 줄 값을 먼저 알아야 해요.";
    let before: Work;
    if (programming) {
      await db.doc(`csWork/${uid}__${id}`).delete();
      await db.doc("csClasses/2-1").update({ currentLessonId: id, openedLessonIds: [lessonId, id] });
      const work: Work = await (await page.request.get(workEndpoint)).json();
      const save = await page.request.post(workEndpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "quiz", quizAnswers: { language: "0", flow: "0", variable: "1", answer: "0", signal: "1" } } } });
      expect(save.status()).toBe(200); before = await save.json();
      await page.goto(`/classroom/${id}`);
    } else before = await prepareAction(page, "grade-quiz");
    let posts = 0, graded!: Work;
    await page.route(`**${workEndpoint}/action`, async route => {
      posts++;
      expect(route.request().postDataJSON()).toEqual({ revision: before.revision, action: { type: "grade-quiz" } });
      const response = await route.fetch();
      expect(response.status()).toBe(200); graded = await response.json();
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "이번 회차 결과 확인", exact: true }).click();
    await expect(page.locator("#work-action-error")).toBeVisible();
    let started!: () => void, release!: () => void, savePosts = 0;
    const getStarted = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**${workEndpoint}`, async route => {
      if (route.request().method() === "GET") { started(); await gate; }
      else savePosts++;
      await route.continue();
    });
    const panel = page.locator("#panel-quiz");
    try {
      await page.getByRole("button", { name: "결과 다시 확인", exact: true }).click();
      await getStarted;
      await page.getByRole("navigation", { name: "퀴즈 문항 목록", exact: true }).getByRole("button").nth(1).click();
      await panel.getByRole("radio", { name: answerLabel, exact: true }).check();
      expect(savePosts).toBe(0);
    } finally { release(); }
    await expect(page.locator("#work-action-error")).toHaveCount(0);
    const result = page.locator(programming ? "#programming-quiz-result" : "#quiz-round-result");
    await expect(result).toContainText("이번 회차 결과는 채점할 때 저장된 답안 기준이에요.");
    await expect(panel.getByRole("status").filter({ hasText: "채점 당시 답안 결과" })).toContainText(hint);
    await expect(panel.getByRole("radio", { name: answerLabel, exact: true })).toBeChecked();
    await expect.poll(async () => ((await (await page.request.get(workEndpoint)).json()) as Work).draft.quizAnswers[question]).toBe(lateAnswer);
    const after: Work = await (await page.request.get(workEndpoint)).json();
    expect(after.quizFeedback).toEqual(graded.quizFeedback);
    expect(after.quizFeedback[question].correct).toBe(false);
    expect(after.quizSolved).toEqual(programming ? ["language", "variable", "answer", "signal"] : ["q1", "q3"]);
    expect(after.quizRound).toBe(before.quizRound);
    expect(after.quizRoundIds).toEqual(before.quizRoundIds);
    expect(after.quizRoundGraded).toBe(true);
    expect(posts).toBe(1);
    await page.reload();
    await expect(panel.getByRole("radio", { name: answerLabel, exact: true })).toBeChecked();
    await expect(result).toContainText("이번 회차 결과는 채점할 때 저장된 답안 기준이에요.");
    await expect(panel.getByRole("status").filter({ hasText: "채점 당시 답안 결과" })).toContainText(hint);
    expect(posts).toBe(1);
  });
}
