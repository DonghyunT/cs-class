import { test, expect } from "@playwright/test";
import { db, headers, lessonId, correctOrder, readyStudent, loginStudent, studentPassword, readyTeacher, googleToken, initialPassword } from "./emulator";
import type { Work, WorkAction } from "../src/lib/classroom/types";
import { SAMPLE_LESSON } from "../src/lib/classroom/catalog";
import { progressFor } from "../src/lib/classroom/progress";
import { buildEntryProject } from "../src/lib/classroom/entry-project";

test("서버에서만 완료 판정 · 오답 회차 · 검증/제출 분리 · 이전 제출 유지", async ({ request }) => {
  await readyStudent(request);
  const endpoint = `/api/classroom/work/${lessonId}`;
  let work: Work = await (await request.get(endpoint)).json();
  async function save() { const result = await request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } }); expect(result.status()).toBe(200); work = await result.json(); }
  async function act(action: WorkAction) { const result = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action } }); expect(result.status()).toBe(200); work = await result.json(); }
  const forged = await request.post(endpoint, { headers, data: { revision: 0, draft: work.draft, conceptSolved: ["algorithm", "sequence"] } });
  expect(forged.status()).toBe(400);
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: 0, action: { type: "submit-practice" } } })).status()).toBe(409);
  work.draft.conceptAnswers = { algorithm: "clear", sequence: "save" }; await save();
  await act({ type: "check-concept", conceptId: "algorithm" }); await act({ type: "check-concept", conceptId: "sequence" });
  work.draft.stage = "quiz"; work.draft.quizAnswers = { q1: "a", q2: "a" }; await save();
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "grade-quiz" } } })).status()).toBe(400);
  work.draft.quizAnswers.q3 = "c"; await save(); await act({ type: "grade-quiz" });
  expect(work.quizSolved).toEqual(["q1", "q3"]);
  await act({ type: "retry-quiz" }); expect(work.quizRoundIds).toEqual(["q2"]); expect(work.draft.quizAnswers.q2).toBeUndefined();
  work.draft.stage = "practice"; await save(); expect(work.quizSolved).toHaveLength(2);
  work.draft.practiceOrder = correctOrder; await save(); await act({ type: "validate-practice" });
  expect(progressFor(SAMPLE_LESSON, work).practice.percent).toBe(0);
  await act({ type: "submit-practice" }); const submitted = work.submission;
  expect(progressFor(SAMPLE_LESSON, work).status).toBe("in-progress");
  work.draft.quizAnswers.q2 = "b"; await save(); await act({ type: "grade-quiz" });
  expect(progressFor(SAMPLE_LESSON, work).status).toBe("completed");
  work.draft.practiceOrder = [...correctOrder].reverse(); await save();
  expect(work.validation).toBeNull(); expect(work.submission).toEqual(submitted);
  expect(progressFor(SAMPLE_LESSON, work).status).toBe("completed");
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice" } } })).status()).toBe(409);
  expect(await (await request.get(endpoint)).json()).toEqual(work);
});

test("동시 저장 충돌 · 응답 유실 재시도 · 타 학생으로 전송 차단", async ({ request }) => {
  await readyStudent(request);
  const endpoint = `/api/classroom/work/${lessonId}`;
  const initial: Work = await (await request.get(endpoint)).json();
  const a = { ...initial.draft, stage: "quiz" }; const b = { ...initial.draft, stage: "practice" };
  const results = await Promise.all([a, b].map((draft) => request.post(endpoint, { headers, data: { revision: 0, draft } })));
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const saved: Work = await results.find((r) => r.status() === 200)!.json();
  const retry = await request.post(endpoint, { headers, data: { revision: 0, draft: saved.draft } });
  expect(retry.status()).toBe(200); expect((await retry.json()).revision).toBe(1);
  expect((await request.post(endpoint, { headers: { ...headers, "X-CS-User": "student-21101" }, data: { revision: 1, draft: b } })).status()).toBe(401);
  expect((await request.post(endpoint, { headers, data: { revision: 1, draft: { ...b, practiceOrder: Array(5).fill("start") } } })).status()).toBe(400);
});

test("실패 로그인은 기존 세션 유지 · 성공 로그인은 이전 세션 종료", async ({ request, playwright }) => {
  await readyStudent(request);
  const other = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    expect((await loginStudent(other, "incorrect" )).status()).toBe(401);
    expect((await request.get("/api/classroom/student")).status()).toBe(200);
    expect((await loginStudent(other, studentPassword)).status()).toBe(200);
    expect((await request.get("/api/classroom/student")).status()).toBe(401);
    expect((await other.get("/api/classroom/student")).status()).toBe(200);
  } finally { await other.dispose(); }
});

test("권한 · 초기화 후 기록 보존 · 기존 세션 종료 · 변경 전 차단", async ({ request, playwright }) => {
  await readyStudent(request);
  const endpoint = `/api/classroom/work/${lessonId}`;
  const work: Work = await (await request.get(endpoint)).json(); work.draft.stage = "quiz";
  expect((await request.post(endpoint, { headers, data: { revision: 0, draft: work.draft } })).status()).toBe(200);
  expect((await request.get("/api/classroom/teacher")).status()).toBe(403);
  expect((await request.post("/api/classroom/classes/2-1", { headers, data: { revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] } })).status()).toBe(403);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await readyTeacher(teacher);
    const reset = await teacher.post("/api/classroom/students/student-20101/reset", { headers, data: {} });
    expect(reset.status()).toBe(200);
    const credential = await reset.json();
    expect((await request.get(endpoint)).status()).toBe(401);
    expect((await loginStudent(request, credential.password)).status()).toBe(200);
    expect((await request.get(endpoint)).status()).toBe(403);
    expect((await request.post("/api/auth/password", { headers, data: { password: "letters-only" } })).status()).toBe(400);
    expect((await request.post("/api/auth/password", { headers, data: { password: initialPassword } })).status()).toBe(400);
    expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
    expect((await (await request.get(endpoint)).json()).draft.stage).toBe("quiz");
  } finally { await teacher.dispose(); }
});

test("로그인 이메일 허용 목록 · Google 토큰 재사용 · 강사 반 권한", async ({ request }) => {
  const denied = await googleToken("outsider@cs-class.invalid");
  expect((await request.post("/api/auth/google", { headers, data: { idToken: denied } })).status()).toBe(403);
  const token = await googleToken();
  expect((await request.post("/api/auth/google", { headers, data: { idToken: token } })).status()).toBe(200);
  expect((await request.post("/api/auth/google", { headers, data: { idToken: token } })).status()).toBe(401);
  // A scoped teacher fixture exercises the same server authorization as an instructor.
  const session = (await (await request.get("/api/auth/session")).json()).session;
  await db.collection("csAccounts").doc(session.uid).update({ role: "instructor", classIds: ["2-10", "2-11"] });
  expect((await request.get("/api/classroom/teacher?classId=2-1")).status()).toBe(403);
  expect((await request.post("/api/classroom/students/student-20101/reset", { headers, data: {} })).status()).toBe(403);
  expect((await request.get("/api/classroom/teacher?classId=2-10")).status()).toBe(200);
  await db.collection("csAccounts").doc(session.uid).update({ role: "teacher", classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) });
});

test("조회·자동 저장은 비활동 시간을 연장하지 않음 · 만료 시 거부", async ({ request }) => {
  await readyStudent(request);
  const ref = db.collection("csAccounts").doc("student-20101");
  const before = Date.now() - 8 * 60_000;
  await ref.update({ "session.lastActivityAt": before });
  await request.get("/api/auth/session");
  const work: Work = await (await request.get(`/api/classroom/work/${lessonId}`)).json();
  work.draft.stage = "quiz";
  await request.post(`/api/classroom/work/${lessonId}`, { headers, data: { revision: 0, draft: work.draft } });
  expect((await ref.get()).data()!.session.lastActivityAt).toBe(before);
  expect((await request.post("/api/auth/activity", { headers, data: { idleForMs: 5000 } })).status()).toBe(200);
  const touched = (await ref.get()).data()!.session.lastActivityAt;
  expect(touched).toBeGreaterThan(before); expect(touched).toBeLessThan(Date.now() - 4000);
  await ref.update({ "session.lastActivityAt": Date.now() - 11 * 60_000 });
  expect((await request.get("/api/classroom/student")).status()).toBe(401);
  expect((await request.post("/api/auth/activity", { headers, data: { idleForMs: 0 } })).status()).toBe(401);
});

test("교사 수업 설정 동시 변경 · 공개 유지 · 요청 출처/크기 검사", async ({ request }) => {
  await readyStudent(request); await readyTeacher(request);
  const endpoint = "/api/classroom/classes/2-1";
  const data = { revision: 0, currentLessonId: null, openedLessonIds: [lessonId] };
  expect((await request.post(endpoint, { headers, data })).status()).toBe(200);
  expect((await request.post(endpoint, { headers, data })).status()).toBe(409);
  expect((await request.post(endpoint, { headers, data: { ...data, revision: 1, openedLessonIds: [] } })).status()).toBe(400);
  expect((await request.post(endpoint, { headers: { ...headers, Origin: "https://other.invalid" }, data })).status()).toBe(403);
  expect((await request.post(endpoint, { data })).status()).toBe(403);
  expect((await request.post(endpoint, { headers, data: { padding: "x".repeat(33000) } })).status()).toBe(413);
});

test("직접 Firestore 읽기·쓰기 차단", async ({ request }) => {
  await readyStudent(request);
  const token = await googleToken();
  for (const authorization of [undefined, `Bearer ${token}`]) {
    const url = "http://127.0.0.1:8080/v1/projects/demo-cs-class/databases/(default)/documents/csAccounts/student-20101";
    const directHeaders = authorization ? { Authorization: authorization } : undefined;
    const read = await fetch(url, { headers: directHeaders }); expect(read.status).toBe(403);
    const write = await fetch(url, { method: "PATCH", headers: { ...directHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { role: { stringValue: "teacher" } } }) }); expect(write.status).toBe(403);
  }
});

test("다중 수업 지원 · 순서도 및 엔트리 실습 검증과 제출", async ({ request }) => {
  await readyStudent(request);
  // Historical lessons remain compatible; retired definitions cannot be newly opened.
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: ["sequence-lab", "flowchart-lab", "entry-bot-lab"] });
  await db.collection("csWork").doc("student-20101__entry-bot-lab").delete();
  await readyTeacher(request);
  const classRes = await request.get("/api/classroom/teacher?classId=2-1");
  const teacherDash = await classRes.json();
  const updateRes = await request.post("/api/classroom/classes/2-1", {
    headers,
    data: {
      revision: teacherDash.classroom.revision,
      currentLessonId: "entry-bot-lab",
      openedLessonIds: ["sequence-lab", "flowchart-lab", "entry-bot-lab"],
    },
  });
  expect(updateRes.status()).toBe(200);

  expect((await loginStudent(request, studentPassword)).status()).toBe(200);
  const endpoint = "/api/classroom/work/entry-bot-lab";
  let work: Work = await (await request.get(endpoint)).json();
  expect(work.lessonId).toBe("entry-bot-lab");

  // Incomplete native EntryJS project: a detached movement block cannot run.
  const starter = JSON.parse(work.draft.entryProject!);
  starter.objects[0].script = [[{ type: "move_direction", params: [{ type: "number", params: [10] }, null] }]];
  work.draft.entryProject = JSON.stringify(starter);
  let saveRes = await request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(saveRes.status()).toBe(200);
  work = await saveRes.json();

  let actRes = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "validate-practice" } } });
  expect(actRes.status()).toBe(200);
  work = await actRes.json();
  expect(work.validation?.passed).toBe(false);

  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice" } } })).status()).toBe(409);

  // Native exports store scripts as JSON strings with nested literal blocks.
  starter.objects[0].script = JSON.stringify([[
    { type: "when_run_button_click", params: [null] },
    { type: "move_direction", params: [{ type: "number", params: [10] }, null] },
    { type: "dialog_time", params: [{ type: "text", params: ["안녕!"] }, { type: "number", params: [2] }, "speak", null] },
  ]]);
  work.draft.entryProject = JSON.stringify(starter);
  saveRes = await request.post(endpoint, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(saveRes.status()).toBe(200);
  work = await saveRes.json();

  actRes = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "validate-practice" } } });
  expect(actRes.status()).toBe(200);
  work = await actRes.json();
  expect(work.validation?.passed).toBe(true);

  actRes = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice" } } });
  expect(actRes.status()).toBe(200);
  work = await actRes.json();
  expect(work.submission?.entryProject).toBe(work.draft.entryProject);
});

test("EntryJS는 실제 스크립트의 연결·값을 검사하고 변경된 작품의 재검증을 요구한다", async ({ request }) => {
  await readyStudent(request);
  await db.collection("csWork").doc("student-20101__entry-bot-lab").delete();
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: ["sequence-lab", "entry-bot-lab"], currentLessonId: "entry-bot-lab" });
  const endpoint = "/api/classroom/work/entry-bot-lab";
  let work: Work = await (await request.get(endpoint)).json();
  const correct = JSON.parse(buildEntryProject(["when_run_button_click", "move_direction", "dialog_time"]));
  const script = correct.objects[0].script;
  const invalidScripts = [
    [[script[0][1], script[0][2]]],
    [[script[0][1], script[0][0], script[0][2]]],
    [[script[0][0], script[0][2], script[0][1]]],
    [script[0], [script[0][1]]],
    [[script[0][0], { ...script[0][1], params: [{ type: "number", params: [20] }, null] }, script[0][2]]],
    [[script[0][0], script[0][1], { ...script[0][2], params: [{ type: "text", params: ["다른 말"] }, { type: "number", params: [2] }, "speak", null] }]],
    [[script[0][0], script[0][1], { ...script[0][2], params: [{ type: "text", params: ["안녕!"] }, { type: "number", params: [1] }, "speak", null] }]],
    [[script[0][0], script[0][1], { ...script[0][2], params: [{ type: "text", params: ["안녕!"] }, { type: "number", params: [2] }, "think", null] }]],
  ];
  async function save(project: string) {
    const response = await request.post(endpoint, { headers, data: { revision: work.revision, draft: { ...work.draft, entryProject: project } } });
    expect(response.status()).toBe(200); work = await response.json();
  }
  async function validate() {
    const response = await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "validate-practice" } } });
    expect(response.status()).toBe(200); work = await response.json();
  }
  for (const blocks of invalidScripts) {
    await save(JSON.stringify({ ...correct, objects: [{ ...correct.objects[0], script: JSON.stringify(blocks) }] }));
    await validate(); expect(work.validation?.passed).toBe(false);
    expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice" } } })).status()).toBe(409);
  }
  const before = work.revision;
  expect((await request.post(endpoint, { headers, data: { revision: before, draft: { ...work.draft, entryProject: JSON.stringify({ objects: [{ script: [[{ type: "get_variable", params: ["x"] }]] }] }) } } })).status()).toBe(400);
  expect(((await (await request.get(endpoint)).json()) as Work).revision).toBe(before);
  await save(JSON.stringify(correct)); await validate(); expect(work.validation?.passed).toBe(true);
  await save(JSON.stringify({ ...correct, objects: [{ ...correct.objects[0], script: invalidScripts[4] }] }));
  expect(work.validation).toBeNull();
  expect((await request.post(`${endpoint}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice" } } })).status()).toBe(409);
});
