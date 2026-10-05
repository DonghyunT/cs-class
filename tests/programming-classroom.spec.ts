import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildProgrammingProject, checkProgrammingMission, parseProgrammingProject, programmingProjectMatches, type EntryNode } from "../src/lib/classroom/programming-entry";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { emptyWork, progressFor } from "../src/lib/classroom/progress";
import { questions } from "../src/lib/prototype/programming";
import type { Work, WorkAction } from "../src/lib/classroom/types";
import { auth, db, headers, localOnly, loginStudent, readyStudent, readyTeacher, studentPassword } from "./emulator";
import { createHash } from "node:crypto";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";

const id = PROGRAMMING_LESSON.id, endpoint = `/api/classroom/work/${id}`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string | number) => node("number", String(v));
const answer = () => node("get_canvas_input_value", null);
const variable = (id: string) => node("get_variable", `cs-${id}`);
const start = () => node("when_run_button_click", null);
const ask = () => node("ask_and_wait", node("text", "숫자는?"), null);
const say = (value: EntryNode) => node("dialog_time", value, number(0.2), "speak", null);
const math = (average = false) => buildProgrammingProject([[start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), say(average ? node("calc_basic", node("calc_basic", variable("A"), "PLUS", variable("B")), "DIVIDE", number(2)) : node("calc_basic", variable("A"), "MULTI", variable("B")))]]);
const movement = (direction: number, amount = "10") => [node("direction_absolute", node("angle", String(direction)), null), node("move_direction", number(amount), null)];
const moveProject = buildProgrammingProject([[start(), ...movement(90)]]);
const keysProject = buildProgrammingProject([[start(), ...movement(90)], ...[["38", 0], ["39", 90], ["40", 180], ["37", 270]].map(([key, direction]) => [node("when_some_key_pressed", null, String(key)), ...movement(Number(direction))])]);
const nameProject = buildProgrammingProject([[start(), node("ask_and_wait", node("text", "이름은?"), null), say(answer())]]);

async function prepare(page: Page, mission = "name", project = buildProgrammingProject()) {
  await readyStudent(page.request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  const work: Work = await (await page.request.get(endpoint)).json();
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", programming: { mission, projects: { [mission]: project }, reflection: "" } } } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`);
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled({ timeout: 20000 });
  return page.frameLocator("iframe");
}
const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();
test.afterEach(async () => {
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: "sequence-lab", openedLessonIds: ["sequence-lab"] });
});

test("미션은 입력·계산·네 방향을 확인하고 미완성 입력과 별도 작품을 보존한다", () => {
  for (const [mission, project] of [["name", nameProject], ["multiply", math()], ["average", math(true)], ["move", moveProject], ["keys", keysProject]]) expect(checkProgrammingMission(mission, project).passed).toBe(true);
  expect(checkProgrammingMission("keys", moveProject).passed).toBe(false);
  const keyDraft = buildProgrammingProject([[node("when_some_key_pressed", null, "81"), ...movement(90)]]);
  expect(parseProgrammingProject(keyDraft)?.threads[0][0].params[1]).toBe("81");
  expect(checkProgrammingMission("keys", keyDraft).passed).toBe(false);
  const wrong = JSON.parse(math()); wrong.objects[0].script[0][2].params[1] = variable("B");
  expect(checkProgrammingMission("multiply", JSON.stringify(wrong)).passed).toBe(false);
  const fake = JSON.parse(math()); fake.objects[0].script[0][5].params[0] = node("combine_something", null, answer(), null, node("text", "24 21 -10 0"), null);
  expect(checkProgrammingMission("multiply", JSON.stringify(fake)).passed).toBe(false);
  const blank = buildProgrammingProject([[start(), ...movement(90, "")], [variable("A")]]);
  expect(parseProgrammingProject(blank)?.threads[0][2].params[0]).toEqual(number(""));
  expect(checkProgrammingMission("move", blank).passed).toBe(false);
  const repositioned = JSON.parse(moveProject); repositioned.objects[0].script[0][0].x = 550;
  expect(programmingProjectMatches(moveProject, JSON.stringify(repositioned))).toBe(true);
  const work = emptyWork(PROGRAMMING_LESSON);
  work.missions = { average: { validation: null, submission: { id: "optional", order: [], submittedAt: 1 } } };
  expect(progressFor(PROGRAMMING_LESSON, work).practice.completed).toBe(0);
});

test("운영 수업 API · 미션별 검증/제출 · 재시도 · 수정 뒤 이전 기록 · 교사 조회", async ({ request, playwright }) => {
  await readyStudent(request);
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await db.collection("csClasses").doc("2-1").update({ currentLessonId: id, openedLessonIds: [id] });
  let work: Work = await (await request.get(endpoint)).json();
  const save = async () => { const r = await request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } }); expect(r.status()).toBe(200); work = await r.json(); };
  const act = async (action: WorkAction) => { const r = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action } }); expect(r.status()).toBe(200); work = await r.json(); };
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: 0, action: { type: "validate-practice" } } })).status()).toBe(400);
  work.draft.programming!.projects = { name: nameProject, multiply: math(), move: moveProject, keys: keysProject, average: math(true) }; await save();
  for (const missionId of ["name", "multiply", "move", "keys", "average"]) {
    await act({ type: "validate-practice", missionId }); await act({ type: "submit-practice", missionId });
  }
  expect(progressFor(PROGRAMMING_LESSON, work).practice).toEqual({ completed: 4, total: 4, percent: 100 });
  const submissions = structuredClone(work.missions);
  const revision = work.revision;
  await act({ type: "submit-practice", missionId: "move" }); expect(work.revision).toBe(revision);
  work.draft.programming!.projects.move = buildProgrammingProject([[start(), ...movement(90, "")]]);
  work.draft.programming!.reflection = "남겨둘 발견";
  work.draft.conceptAnswers.pc0 = "0"; await save();
  expect(work.missions!.move.validation).toBeNull(); expect(work.missions!.move.submission).toEqual(submissions!.move.submission);
  expect(work.missions!.multiply).toEqual(submissions!.multiply);
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice", missionId: "move" } } })).status()).toBe(409);
  expect((await request.get(endpoint)).status()).toBe(200);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher);
    const result = await teacher.get(`/api/classroom/teacher?classId=2-1&lessonId=${id}`);
    expect(result.status()).toBe(200);
    const summary = (await result.json()).students.find((s: { uid: string }) => s.uid === "student-20101").work;
    expect(summary.missions.keys.submission).toEqual({ id: submissions!.keys.submission!.id, submittedAt: submissions!.keys.submission!.submittedAt });
    expect(summary.draft).toBeUndefined();
    const detail = await teacher.get(`/api/classroom/students/student-20101/work/${id}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).missions.keys.submission).toEqual(submissions!.keys.submission);
  } finally { await teacher.dispose(); }
});

async function connect(page: Page, source: Locator, target: Locator, offsetY: number, offsetX = 40, targetX = offsetX) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  await expect.poll(() => source.evaluate((el) => (el as unknown as { blockView: { block: { x: number } } }).blockView.block.x)).toBeGreaterThan(-2000);
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + offsetX, from.y + 15); await page.mouse.down();
  await page.mouse.move(to.x + targetX, to.y + offsetY, { steps: 12 }); await page.mouse.up();
}

test("실제 팔레트 이름 조립 · 서로 다른 두 입력 · 검증/제출 · 복원", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const frame = await prepare(page);
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "키를 눌렀을 때" })).toHaveCount(0);
  await expect(frame.getByText("자료", { exact: true })).toBeVisible();
  const menu = frame.locator("#entryWorkspaceBlockMenu g.block"), board = frame.locator("#entryWorkspaceBoard g.block");
  await frame.getByText("자료", { exact: true }).click();
  await connect(page, menu.filter({ hasText: "묻고 대답 기다리기" }).first(), board.filter({ hasText: "시작하기 버튼" }).first(), 46);
  await frame.getByText("생김새", { exact: true }).click();
  await connect(page, menu.filter({ hasText: "초 동안" }).first(), board.filter({ hasText: "묻고 대답 기다리기" }).last(), 42, 140);
  await frame.getByText("자료", { exact: true }).click();
  await connect(page, menu.filter({ hasText: /^\s*대답\s*$/ }).first(), board.filter({ hasText: "초 동안" }).last().getByText("안녕!", { exact: true }).locator(".."), 12, 18, -8);
  for (const name of ["초코", "보리"]) {
    await page.getByRole("button", { name: "실행하기", exact: true }).click();
    const input = frame.getByLabel("강아지 이름 대답"); await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
  }
  await page.getByRole("button", { name: "조건 검증", exact: true }).click();
  await expect(page.locator("#practice-feedback")).toBeFocused();
  await page.getByRole("button", { name: "작품 제출", exact: true }).click();
  await expect(page.getByRole("tab", { name: "실습 25%" })).toBeVisible();
  await expect(page.locator("#submitted-heading")).toBeFocused();
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("대답을 말하기에 넣었어요.");
  await expect.poll(async () => (await stored(page)).draft.programming!.reflection).toBe("대답을 말하기에 넣었어요.");
  await page.reload(); await expect(page.getByRole("button", { name: "이 작품 제출 완료" })).toBeDisabled();
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await frame.locator("#entryWorkspaceBoard").getByText("안녕!", { exact: true }).first().locator("..").click();
  await page.keyboard.press("Escape"); await expect(page.locator("#entry-run")).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "무대 처음 위치로" })).toBeFocused();
  await page.screenshot({ path: info.outputPath("programming-desktop.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("곱셈·평균 실제 실행 · 변수 팔레트 · 이동 이어 만들기 · 방향키 · 미완성 복원", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  let frame = await prepare(page, "multiply", math());
  await frame.getByText("자료", { exact: true }).click();
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "정하기" }).first()).toBeVisible();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  for (const value of ["6", "4"]) { const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter"); if (value === "6") await expect(input).toHaveValue(""); }
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 24" })).toBeVisible();
  await page.getByRole("link", { name: "대시보드로", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
  const averageWork = await stored(page); averageWork.draft.programming!.mission = "average"; averageWork.draft.programming!.projects.average = math(true);
  expect((await page.request.post(endpoint, { headers, data: { revision: averageWork.revision, draft: averageWork.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  for (const value of ["6", "4"]) { const input = frame.getByLabel("강아지 질문 대답"); await expect(input).toBeVisible(); await input.fill(value); await input.press("Enter"); if (value === "6") await expect(input).toHaveValue(""); }
  await expect(page.getByRole("status").filter({ hasText: "마지막 말: 5" })).toBeVisible();
  await page.getByRole("button", { name: /시작 버튼으로 움직이기/ }).click();
  await page.locator('iframe[src$="mission=move"]').scrollIntoViewIfNeeded();
  frame = page.frameLocator("iframe");
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  await frame.getByText("움직임", { exact: true }).click();
  await connect(page, frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "이동 방향으로" }).first(), frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "시작하기 버튼" }).first(), 46);
  await expect.poll(async () => parseProgrammingProject((await stored(page)).draft.programming!.projects.move)?.order).toEqual(["when_run_button_click", "move_direction"]);
  const moveBefore = (await stored(page)).draft.programming!.projects.move;
  await page.getByRole("button", { name: /방향키로 움직임 개선/ }).click();
  await page.locator('iframe[src$="mission=keys"]').scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  expect(programmingProjectMatches((await stored(page)).draft.programming!.projects.keys, moveBefore)).toBe(true);
  await frame.getByText("시작", { exact: true }).click();
  await expect(frame.locator("#entryWorkspaceBlockMenu g.block").filter({ hasText: "키를 눌렀을 때" }).first()).toContainText("위쪽");
  // Load a four-key work through the same save API, then operate the real engine.
  await page.getByRole("link", { name: "대시보드로", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
  let work = await stored(page); work.draft.programming!.projects.keys = keysProject;
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.locator("iframe").scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  const native = page.frames().find((f) => f.url().includes("mission=keys"))!;
  const position = () => native.evaluate(() => { const e = (window as unknown as { Entry: { container: { getObject: (id: string) => { entity: { getX: () => number; getY: () => number } } } } }).Entry.container.getObject("entrybot").entity; return [Math.round(e.getX()) || 0, Math.round(e.getY()) || 0]; });
  await page.getByRole("button", { name: "실행하기", exact: true }).click(); await expect.poll(position).toEqual([10, 0]);
  for (const [label, expected] of [["↑ 위", [10, 10]], ["← 왼쪽", [0, 10]], ["↓ 아래", [0, 0]], ["→ 오른쪽", [10, 0]]] as const) { await page.getByRole("button", { name: label, exact: true }).click(); await expect.poll(position).toEqual(expected); }
  await page.getByRole("button", { name: "실행 정지" }).click(); await expect.poll(position).toEqual([0, 0]);
  await page.getByRole("link", { name: "대시보드로", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
  work = await stored(page); work.draft.programming!.projects.keys = buildProgrammingProject([[start(), ...movement(90, "")]]);
  expect((await page.request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.locator("iframe").scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "실행하기", exact: true })).toBeEnabled();
  expect(parseProgrammingProject((await stored(page)).draft.programming!.projects.keys)?.threads[0][2].params[0]).toEqual(number(""));
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("iframe").scrollIntoViewIfNeeded();
  await expect(frame.locator("#entryWorkspaceBoard g.block").filter({ hasText: "이동 방향으로" }).first()).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("programming-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("한 반 27명의 동시 입장·작품 저장·검증은 각 학생의 기록으로 남는다", async ({ request, playwright }, info) => {
  test.setTimeout(90000); await localOnly(request);
  const classRef = db.collection("csClasses").doc("2-8"), original = (await classRef.get()).data()!;
  const rows = Array.from({ length: 27 }, (_, i) => ({ studentId: `208${String(i + 1).padStart(2, "0")}`, uid: `student-208${String(i + 1).padStart(2, "0")}` }));
  const created: string[] = [], contexts = [];
  try {
    for (const row of rows) {
      expect((await db.collection("csAccounts").doc(row.uid).get()).exists).toBe(false);
      await auth.createUser({ uid: row.uid, email: `s-${row.studentId}@cs-class.invalid`, password: studentPassword }); created.push(row.uid);
      await db.collection("csAccounts").doc(row.uid).create({ ...row, role: "student", classId: "2-8", classIds: [], mustChangePassword: false, temporaryPassword: null, disabled: false, authVersion: 0, authBusy: null, session: null });
    }
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
    for (const row of rows) contexts.push({ row, api: await playwright.request.newContext({ baseURL: "http://localhost:3000" }) });
    const started = Date.now();
    await Promise.all(contexts.map(async ({ row, api }) => {
      expect((await loginStudent(api, studentPassword, row.studentId)).status()).toBe(200);
      const work: Work = await (await api.get(endpoint)).json();
      work.draft.programming!.mission = "move"; work.draft.programming!.projects.move = moveProject;
      work.draft.programming!.reflection = `동시 저장 ${row.studentId}`;
      const saved = await api.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } }); expect(saved.status()).toBe(200);
      const next: Work = await saved.json();
      const checked = await api.post(`${endpoint}/action`, { headers, data: { revision: next.revision, action: { type: "validate-practice", missionId: "move" } } }); expect(checked.status()).toBe(200); expect((await checked.json()).missions.move.validation.passed).toBe(true);
      expect((await (await api.get(endpoint)).json()).draft.programming.reflection).toBe(`동시 저장 ${row.studentId}`);
    }));
    await info.attach("classroom-27", { body: JSON.stringify({ project: "demo-cs-class", count: 27, flow: "parallel login/read/save/validate/read", elapsedMs: Date.now() - started, productionPerformanceGuarantee: false }), contentType: "application/json" });
  } finally {
    for (const { api } of contexts) await api.dispose();
    for (const uid of created) {
      await auth.deleteUser(uid); await db.collection("csAccounts").doc(uid).delete(); await db.collection("csWork").doc(`${uid}__${id}`).delete();
      await db.collection("csRateLimits").doc(createHash("sha256").update(`credential:${uid}:${passwordDigest(studentPassword)}`).digest("hex")).delete();
    }
    await classRef.set(original);
  }
});

test("저장 실패는 미션 이동을 보호하고, 개념·퀴즈는 재접속 뒤 이어간다", async ({ page }) => {
  await prepare(page, "move", moveProject);
  await page.route(`**${endpoint}`, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("저장 실패 중에도 유지");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: /방향키로 움직임 개선/ }).click();
  await expect(page.locator("#programming-mission-title")).toHaveText("시작 버튼으로 움직이기");
  await page.unroute(`**${endpoint}`); await page.getByRole("button", { name: "저장 다시 확인" }).click();
  await page.getByRole("tab", { name: "개념 0%" }).click();
  await expect(page.getByRole("tab", { name: "개념 0%" })).toBeFocused();
  await page.getByRole("tab", { name: "퀴즈 0%" }).click();
  await page.getByRole("radio").nth(questions[0].correct).check();
  await expect.poll(async () => (await stored(page)).draft.quizAnswers[questions[0].id]).toBe(String(questions[0].correct));
  await page.getByRole("button", { name: "다음 문제" }).click();
  await page.reload(); await expect(page.getByRole("button", { name: "이전 문제" })).toBeDisabled();
  await expect(page.getByRole("radio").nth(questions[0].correct)).toBeChecked();
  expect((await stored(page)).draft.programming!.reflection).toBe("저장 실패 중에도 유지");
});
