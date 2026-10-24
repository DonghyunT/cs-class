import { expect, test, type Page } from "@playwright/test";
import { buildProgrammingProject, missionStarter, parseProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { conditionalConcepts, conditionalQuestions } from "../src/lib/classroom/conditionals-data";
import { db, headers, readyStudent, entryReset, entryStart } from "./emulator";

const id = "conditionals", endpoint = `/api/classroom/work/${id}`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const text = (v: string) => node("text", v);
const number = (v: string) => node("number", v);
const answer = () => node("get_canvas_input_value", null);
const variable = (name: string) => node("get_variable", `cs-${name}`);
const start = () => node("when_run_button_click", null);
const ask = (question = "숫자는?") => node("ask_and_wait", text(question), null);
const speak = (value: EntryNode) => node("dialog", value, "speak", null);
const compare = (left: EntryNode, op: string, right: EntryNode) => node("boolean_basic_operator", left, op, right);
const ifElse = (condition: EntryNode, yes: EntryNode[], no: EntryNode[]): EntryNode => ({ ...node("if_else", condition, null, null), statements: [yes, no] });
const store = (name: string) => [ask(), node("set_variable", `cs-${name}`, answer(), null)];

// Dog-free lessons start with the official Entrybot (`bot`); solutions are built on it.
const onBot = (mission: string, threads: EntryNode[][]) => buildProgrammingProject(undefined, parseProgrammingProject(missionStarter(mission))!.added.map((o) => ({ ...o, threads })), -1);
// Reference solutions a student could build from the mission hints.
const solutions: Record<string, { project: string; runs: [string[], string][] }> = {
  average: { project: onBot("average", [[start(), ...store("A"), ...store("B"), speak(node("calc_basic", node("calc_basic", variable("A"), "PLUS", variable("B")), "DIVIDE", number("2")))]]), runs: [[["6", "4"], "5"]] },
  pass: { project: onBot("pass", [[start(), ask("점수는?"), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("60")), [speak(text("합격"))], [speak(text("불합격"))])]]), runs: [[["60"], "합격"], [["59"], "불합격"]] },
  freethrow: { project: onBot("freethrow", [[start(), ask("몇 개?"), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("8")), [speak(text("훌륭해요!"))], [ifElse(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak(text("잘했어요!"))], [speak(text("더 연습해 보자!"))])])]]), runs: [[["6"], "잘했어요!"]] },
  ride: { project: onBot("ride", [[start(), ask("키는?"), node("set_variable", "cs-A", answer(), null), ask("나이는?"), node("set_variable", "cs-B", answer(), null), ifElse(node("boolean_and_or", compare(variable("A"), "GREATER_OR_EQUAL", number("130")), "AND", compare(variable("B"), "GREATER_OR_EQUAL", number("10"))), [speak(text("탈 수 있어요"))], [speak(text("탈 수 없어요"))])]]), runs: [[["130", "10"], "탈 수 있어요"], [["130", "9"], "탈 수 없어요"]] },
};

// Work saved before the lessons dropped the dog keeps the dog and still runs and grades.
solutions.legacy = { project: buildProgrammingProject([[start(), ask("점수는?"), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("60")), [speak(text("합격"))], [speak(text("불합격"))])]]), runs: [[["61"], "합격"]] };
const missionOf = (key: string) => key === "legacy" ? "pass" : key;

async function open(page: Page, mission?: string) {
  // Leave the previous editor first so it cannot save over the new fixture.
  await page.goto("about:blank");
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: ["programming-13", id] });
  if (mission) {
    const work: Work = await (await page.request.get(endpoint)).json();
    expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission: missionOf(mission), projects: { [missionOf(mission)]: solutions[mission].project }, reflection: "" } } } })).status()).toBe(200);
  }
  await page.goto(`/classroom/${id}?from=dashboard`);
}

test("조건 수업 개념·코드 읽기 퀴즈는 공통 화면에서 풀고 저장·이탈 안내를 따른다", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { name: "조건에 따라 달라지는 프로그램" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "산술 연산자", exact: true })).toBeVisible();
  // A wrong check re-asks without the answer and marks the concept for another look.
  await page.getByRole("radio", { name: "3", exact: true }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#concept-feedback-cc0")).toContainText(`다시 생각해 보기 ${conditionalConcepts[0].retry}`);
  await expect(page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: /산술 연산자/ })).toContainText("다시 생각해 보기");
  await page.getByRole("radio", { name: "1", exact: true }).check();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.locator("#concept-feedback-cc0")).toContainText("맞았어요.");
  await expect(page.locator("#concept-feedback-cc0")).toContainText("산술 연산자");
  await expect(page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: /산술 연산자/ })).toContainText("확인 완료");
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.getByRole("group", { name: "읽어 볼 코드" })).toContainText("② (A + B) ÷ 2");
  await page.getByRole("radio", { name: "① 8, ② 5", exact: true }).check();
  await expect(page.locator("[data-lesson-shell] header [role=status]")).toHaveText("저장하지 않은 변경 있음");
  await page.keyboard.press("Control+s");
  await expect(page.locator("[data-lesson-shell] header [role=status]")).toHaveText("저장 완료");
  expect((await (await page.request.get(endpoint)).json() as Work).draft.quizAnswers.order).toBe("0");
  await page.getByRole("radio", { name: "① 5, ② 5", exact: true }).check();
  await page.getByRole("link", { name: "수업 나가기", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const name of ["저장 후 나가기", "저장하지 않고 나가기", "취소"]) await expect(dialog.getByRole("button", { name, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/classroom/${id}`));
});

test("조건 수업 퀴즈 오답은 고른 답의 이유와 '다시 생각해 보기'를 보이고 결과 보기로 그 문항에 간다", async ({ page }) => {
  await open(page);
  const work: Work = await (await page.request.get(endpoint)).json();
  const quizAnswers = Object.fromEntries(conditionalQuestions.map((q) => [q.id, q.id === "order" ? "1" : String(q.correct)]));
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "quiz", quizAnswers } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}?from=dashboard`);
  await page.getByRole("button", { name: "이번 회차 결과 확인", exact: true }).first().click();
  await page.getByRole("navigation", { name: "재도전 문항 바로가기" }).getByRole("button", { name: "문제 1 결과 보기", exact: true }).click();
  const result = page.getByRole("status").filter({ hasText: "채점 당시 답안 결과" });
  await expect(result).toContainText("다시 생각해 보기");
  await expect(result).toContainText(conditionalQuestions[0].why["1"]);
  await expect(result).not.toContainText(conditionalQuestions[0].hint);
});

for (const mission of Object.keys(solutions)) {
  test(`조건 수업 ${mission}: 기준 해답을 실제 엔트리에서 실행한 말과 서버 검증·제출이 일치한다`, async ({ page }) => {
    test.setTimeout(90000);
    await open(page, mission);
    const frame = page.frameLocator("iframe");
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    for (const [inputs, said] of solutions[mission].runs) {
      await entryStart(page).click();
      for (const value of inputs) {
        const input = frame.getByLabel("질문 대답", { exact: true }); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter");
      }
      await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${said}` })).toBeVisible({ timeout: 10000 });
      await expect(entryStart(page)).toBeVisible();
    }
    await page.getByRole("button", { name: "조건 검증", exact: true }).click();
    await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
    await page.getByRole("button", { name: "작품 제출", exact: true }).click();
    await expect.poll(async () => !!((await (await page.request.get(endpoint)).json()) as Work).missions?.[missionOf(mission)]?.submission).toBe(true);
  });
}

test("「프로그래밍의 기초」에 남은 평균 작품은 저장되지만 그 수업에서는 검증할 수 없다", async ({ page }) => {
  await readyStudent(page.request);
  const old = "programming-13", oldEndpoint = `/api/classroom/work/${old}`;
  await db.collection("csWork").doc(`student-20101__${old}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: old, openedLessonIds: [old, id] });
  const work: Work = await (await page.request.get(oldEndpoint)).json();
  const saved = await page.request.post(oldEndpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, programming: { mission: "average", projects: { average: solutions.legacy.project }, reflection: "" } } } });
  expect(saved.status()).toBe(200);
  const normalized = await saved.json() as Work;
  expect(normalized.draft.programming?.mission).toBe("name");
  expect(normalized.draft.programming?.projects.average).toBeTruthy();
  const checked = await page.request.post(`${oldEndpoint}/action`, { headers, data: { revision: normalized.revision, action: { type: "validate-practice", missionId: "average" } } });
  expect(checked.status()).toBe(400);
  // An old record whose stored selection is still `average` opens on the first current mission.
  await db.doc(`csWork/student-20101__${old}`).update({ "draft.programming.mission": "average" });
  expect(((await (await page.request.get(oldEndpoint)).json()) as Work).draft.programming?.mission).toBe("name");
});
