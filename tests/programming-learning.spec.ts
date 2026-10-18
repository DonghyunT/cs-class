import { expect, test } from "@playwright/test";
import { buildProgrammingProject } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, headers, readyStudent, readyTeacher } from "./emulator";

test("programming-intro: 새 첫 개념은 옛 pc0~3 답안·제출을 보존하고 별도로 확인한다", async ({ page }, info) => {
  const id = "programming-13", endpoint = `/api/classroom/work/${id}`;
  const classRef = db.doc("csClasses/2-1"), workRef = db.doc(`csWork/student-20101__${id}`);
  const original = (await classRef.get()).data()!;
  const oldAnswers = { pc0: "0", pc1: "2", pc2: "1", pc3: "1" };
  try {
    await readyStudent(page.request); await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    const old: Work = await (await page.request.get(endpoint)).json();
    old.conceptSolved = ["pc0", "pc1", "pc2", "pc3"];
    old.draft.conceptAnswers = oldAnswers;
    const project = buildProgrammingProject([[{ type: "when_run_button_click", params: [null] }, { type: "move_direction", params: [{ type: "number", params: [10] }, null] }]]);
    old.draft.programming!.projects.move = project;
    old.draft.programming!.reflection = "이전 발견 기록";
    old.missions = { move: { validation: null, submission: { id: "legacy-move", order: [], entryProject: project, submittedAt: 1000 } } };
    await workRef.set({ ...old, uid: "student-20101", classId: "2-1" });
    await page.goto(`/classroom/${id}`);
    await expect(page.locator("#concept-title")).toHaveText("프로그래밍이란?");
    await page.screenshot({ path: info.outputPath("programming-intro.png"), fullPage: true });
    const list = page.getByRole("navigation", { name: "개념 목록", exact: true });
    await expect(list.getByRole("button")).toHaveCount(5);
    await expect(page.getByRole("tab", { name: "개념 80%", exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "프로그램을 만들고 실행해 보며 고치는 과정", exact: true }).check();
    await page.getByRole("button", { name: "생각 확인하기", exact: true }).click();
    await expect(page.getByRole("tab", { name: "개념 100%", exact: true })).toBeVisible();
    const saved: Work = await (await page.request.get(endpoint)).json();
    expect(saved.conceptSolved).toEqual(["pc0", "pc1", "pc2", "pc3", "pc4"]);
    expect(saved.draft.conceptAnswers).toEqual({ ...oldAnswers, pc4: "0" });
    expect(saved.missions?.move?.submission).toEqual(old.missions.move.submission);
    expect(saved.draft.programming?.reflection).toBe("이전 발견 기록");
    await list.getByRole("button", { name: /컴퓨터에게 전하는 말/ }).click();
    await expect(page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true })).toBeChecked();
    await expect(page.getByText("프로그래밍 언어로 명령을 표현해 프로그램을 만드는 과정이 프로그래밍이에요.", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("tab", { name: "개념 100%", exact: true })).toBeVisible();
    await readyTeacher(page.request);
    const before = (await workRef.get()).data();
    await page.goto(`/teacher/preview/${id}?classId=2-1`);
    await expect(page.locator("#concept-title")).toHaveText("프로그래밍이란?");
    await page.getByRole("radio", { name: "프로그램을 만들고 실행해 보며 고치는 과정", exact: true }).check();
    await page.getByRole("button", { name: "생각 확인하기", exact: true }).click();
    await expect(page.getByRole("tab", { name: "개념 20%", exact: true })).toBeVisible();
    expect((await workRef.get()).data()).toEqual(before);
  } finally { await workRef.delete(); await classRef.set(original); }
});

test("계정 수업의 개념·퀴즈 오답 재도전과 재접속 · 교사의 미션 제출 화면", async ({ page }) => {
  test.setTimeout(60000);
  const id = "programming-13", endpoint = `/api/classroom/work/${id}`, classRef = db.collection("csClasses").doc("2-1"), workRef = db.collection("csWork").doc(`student-20101__${id}`);
  const original = (await classRef.get()).data()!;
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await readyStudent(page.request); await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    await page.goto(`/classroom/${id}?from=dashboard`);
    await expect(page.getByRole("heading", { name: "프로그래밍의 기초", level: 1, exact: true })).toBeVisible();
    const conceptList = page.getByRole("navigation", { name: "개념 목록", exact: true });
    await expect(conceptList.getByRole("button")).toHaveCount(5);
    const terms = [
      ["프로그래밍", "컴퓨터가 할 일을 생각하고, 명령을 만들어 실행해 보며 고치는 과정이에요."],
      ["프로그래밍 언어", "컴퓨터가 할 일을 표현할 때 사용하는 약속된 언어예요. 엔트리의 블록이나 파이썬의 글자로 명령을 나타낼 수 있어요."],
      ["프로그램", "컴퓨터가 할 일을 순서와 규칙에 맞게 적어 놓은 명령의 모음이에요."],
    ];
    for (const [term, explanation] of terms) {
      await expect(page.getByText(term, { exact: true })).toBeVisible();
      await expect(page.getByText(explanation, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("프로그래밍 언어로 명령을 표현해 프로그램을 만드는 과정이 프로그래밍이에요.", { exact: true })).toBeVisible();
    const answers = ["프로그램을 만들고 실행해 보며 고치는 과정", "컴퓨터가 할 일을 명령으로 표현해요", "출력", "3", "오른쪽 화살표 키를 누를 때"];
    for (let i = 0; i < answers.length; i++) {
      await page.getByRole("radio", { name: answers[i], exact: true }).check();
      if (i === 0) {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        await page.route(`**${endpoint}/action`, async (route) => { const response = await route.fetch(); await gate; await route.fulfill({ response }); }, { times: 1 });
        const checking = page.waitForRequest((request) => request.url().endsWith(`${endpoint}/action`));
        await page.getByRole("button", { name: "생각 확인하기" }).click(); await checking;
        try { await expect(page.getByRole("button", { name: "다음 개념", exact: true })).toBeDisabled(); }
        finally { release(); }
      } else await page.getByRole("button", { name: "생각 확인하기" }).click();
      await expect(page.locator("#concept-feedback")).toBeFocused();
      await expect(page.getByRole("button", { name: "개념 확인 완료" })).toBeDisabled();
      if (i < answers.length - 1) await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    }
    await expect(page.getByRole("tab", { name: "개념 100%" })).toBeVisible();
    await page.getByRole("button", { name: "퀴즈에 도전하기" }).click();
    for (const [i, answer] of ["명령을 표현하는 방법", "수 입력 → 곱하기 → 결과 보여주기", "6", "각 대답을 받은 직후 해당 변수에 저장하기", "90°"].entries()) {
      await page.getByRole("radio", { name: answer, exact: false }).check();
      if (i < 4) await page.getByRole("button", { name: "다음 문제", exact: true }).click();
    }
    await page.getByRole("button", { name: "이번 회차 결과 확인" }).click();
    await expect(page.getByRole("tab", { name: "퀴즈 80%" })).toBeVisible();
    await expect(page.locator("#programming-quiz-result")).toBeFocused();
    await page.getByRole("button", { name: "틀린 문제만 다시 풀기" }).click();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.locator("#programming-question")).toBeFocused();
    await page.getByRole("radio", { name: "3", exact: true }).check();
    await page.getByRole("button", { name: "이번 회차 결과 확인" }).click();
    await expect(page.getByRole("tab", { name: "퀴즈 100%" })).toBeVisible();
    await page.reload(); await expect(page.getByRole("tab", { name: "개념 100%" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "퀴즈 100%" })).toBeVisible();
    await page.getByRole("tab", { name: "개념 100%", exact: true }).click();
    await conceptList.getByRole("button", { name: /프로그래밍이란/ }).click();
    for (const [, explanation] of terms) await expect(page.getByText(explanation, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "개념 확인 완료", exact: true })).toBeDisabled();
    await page.getByRole("link", { name: "수업 나가기", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
    const current: Work = await (await page.request.get(endpoint)).json();
    const project = buildProgrammingProject([[{ type: "when_run_button_click", params: [null] }, { type: "move_direction", params: [{ type: "number", params: [10] }, null] }]]);
    current.draft.programming!.mission = "move"; current.draft.programming!.projects.move = project;
    let response = await page.request.post(endpoint, { headers, data: { revision: current.revision, draft: current.draft } }); expect(response.status()).toBe(200);
    for (const type of ["validate-practice", "submit-practice"]) { const work: Work = await response.json(); response = await page.request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type, missionId: "move" } } }); expect(response.status()).toBe(200); }
    await readyTeacher(page.request);
    await page.goto(`/teacher/students?classId=2-1&lessonId=${id}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    const open = page.getByRole("button", { name: "20101 제출 작품 보기", exact: true }); await open.click();
    const dialog = page.getByRole("dialog", { name: "20101 학생의 제출 작품", exact: true });
    await expect(dialog.locator("details")).toHaveCount(1);
    await expect(dialog.getByRole("group", { name: "오브젝트 요약" })).toContainText("강아지");
    await expect(dialog.getByText("시작 묶음 1", { exact: true })).toBeVisible();
    await expect(dialog.getByText("이동 방향으로 10만큼 움직이기", { exact: false })).toBeVisible();
    expect(Math.round((await dialog.boundingBox())!.width)).toBe(860);
    const runToggle = dialog.getByRole("button", { name: "작업실에서 실행해 보기", exact: true });
    await runToggle.click();
    await expect(dialog.getByRole("button", { name: "작업실 닫기", exact: true })).toBeVisible();
    await expect.poll(async () => Math.round((await dialog.boundingBox())!.width)).toBe(1220);
    await expect(dialog.locator('iframe[title*="교사 실행 작업실"]')).toBeVisible();
    await expect(dialog.getByRole("button", { name: "무대 처음 위치로", exact: true })).toBeEnabled({ timeout: 20000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe[title*="교사 실행 작업실"]')).toHaveCount(0);
    await expect(runToggle).toBeFocused();
    await expect.poll(async () => Math.round((await dialog.boundingBox())!.width)).toBe(860);
    await dialog.locator("summary").click();
    await expect(dialog.getByText("이동 방향으로 10만큼 움직이기", { exact: false })).toBeHidden();
    await dialog.locator("summary").click();
    await expect(dialog.getByText("이동 방향으로 10만큼 움직이기", { exact: false })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(open).toBeFocused();
    expect(errors).toEqual([]);
  } finally { await workRef.delete(); await classRef.set(original); }
});
