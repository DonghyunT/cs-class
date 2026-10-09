import { expect, test, type APIRequestContext } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { buildEntryProject, parseEntryProject } from "../src/lib/classroom/entry-project";
import { buildProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import { emptyWork } from "../src/lib/classroom/progress";
import { initialReviewProject, type FlowchartProject } from "../src/lib/classroom/review/project";
import type { Work, WorkAction } from "../src/lib/classroom/types";
import { db, headers, localOnly, readyTeacher } from "./emulator";

const lesson = (id: string) => LESSONS.find(item => item.id === id)!;
const endpoint = (id: string) => `/api/teacher-preview/${id}/evaluate`;
const payload = (work: Work, action: WorkAction) => ({ classId: "2-1", work, action });
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (value: number) => node("number", String(value));
const start = () => node("when_run_button_click", null);
const ask = () => node("ask_and_wait", node("text", "합성 질문"), null);
const answer = () => node("get_canvas_input_value", null);
const variable = (id: string) => node("get_variable", `cs-${id}`);
const say = (value: EntryNode) => node("dialog_time", value, number(0.2), "speak", null);
const movement = (direction: number) => [node("direction_absolute", node("angle", String(direction)), null), node("move_direction", number(10), null)];
const math = (average = false) => buildProgrammingProject([[start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), say(average ? node("calc_basic", node("calc_basic", variable("A"), "PLUS", variable("B")), "DIVIDE", number(2)) : node("calc_basic", variable("A"), "MULTI", variable("B")))]]);
const projects = {
  name: buildProgrammingProject([[start(), ask(), say(answer())]]),
  multiply: math(),
  move: buildProgrammingProject([[start(), ...movement(90)]]),
  keys: buildProgrammingProject([[start(), ...movement(90)], ...[["38", 0], ["39", 90], ["40", 180], ["37", 270]].map(([key, direction]) => [node("when_some_key_pressed", null, String(key)), ...movement(Number(direction))])]),
  average: math(true),
};
async function evaluate(request: APIRequestContext, work: Work, action: WorkAction) {
  const response = await request.post(endpoint(work.lessonId), { headers, data: payload(work, action) });
  expect(response.status()).toBe(200);
  return await response.json() as Work;
}
async function learningRecords() {
  const result: Record<string, unknown> = {};
  for (const collection of ["csWork", "csHelpRequests", "csHelpSnapshots", "csAiUsage", "csAiRequests"]) {
    const snapshot = await db.collection(collection).get();
    result[collection] = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })).sort((a, b) => a.id.localeCompare(b.id));
  }
  return result;
}
test.beforeEach(async ({ request }) => { await localOnly(request); });

test("preview-api: 5개 프로그래밍 미션 판정·제출과 초안 정규화는 학생 저장을 만들지 않는다", async ({ request }) => {
  await readyTeacher(request);
  const before = await learningRecords();
  let work = emptyWork(lesson("programming-13"));
  work.draft.programming = { mission: "name", projects, reflection: "합성 체험" };
  work.draft.entryProject = "legacy-normalization-sentinel";
  work.draft.practiceOrder = ["legacy-normalization-sentinel"];
  for (const id of Object.keys(projects)) {
    work = await evaluate(request, work, { type: "validate-practice", missionId: id });
    expect(work.draft.entryProject).toBeNull();
    expect(work.draft.practiceOrder).toEqual([]);
    expect(work.missions?.[id].validation?.passed).toBe(true);
    work = await evaluate(request, work, { type: "submit-practice", missionId: id });
    expect(work.missions?.[id].submission?.entryProject).toBe(projects[id as keyof typeof projects]);
  }
  let entry = emptyWork(lesson("entry-bot-lab"));
  entry.draft.entryProject = buildEntryProject(["when_run_button_click", "move_direction", "dialog_time"]);
  entry.draft.practiceOrder = ["legacy-normalization-sentinel"];
  entry = await evaluate(request, entry, { type: "validate-practice" });
  expect(entry.draft.practiceOrder).toEqual(parseEntryProject(entry.draft.entryProject)!.order);
  expect(await learningRecords()).toEqual(before);
});

test("preview-api: 순서도 이전 미션 검증·제출 스냅샷을 보존하고 자유 설계 AI 제한을 유지한다", async ({ request }) => {
  await readyTeacher(request);
  let work = emptyWork(lesson("review-flowchart"));
  const project = work.draft.reviewProject as FlowchartProject;
  project.placements = {
    "1": { s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" },
    "2": { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" },
    "3": { s2: "b-m3-in", s3: "b-m3-chk", s4_yes: "b-m3-yes", s4_no: "b-m3-no" },
  };
  for (const id of ["1", "2", "3"]) {
    (work.draft.reviewProject as FlowchartProject).mission = id as FlowchartProject["mission"];
    work = await evaluate(request, work, { type: "validate-practice", missionId: id });
    expect(work.missions?.[id].validation?.passed).toBe(true);
    work = await evaluate(request, work, { type: "submit-practice", missionId: id });
    expect((work.missions?.[id].submission?.reviewProject as FlowchartProject).mission).toBe(id);
  }
  expect(Object.keys(work.missions!)).toEqual(["1", "2", "3"]);
  const free = { ...initialReviewProject("flowchart") as FlowchartProject, mission: "free" as const, current: "합성 현재 상태", goal: "합성 목표", conditions: ["합성 조건"], cards: [{ id: "plan", type: "sequence" as const, text: "활동", yes: "", no: "" }], nodes: [{ id: "start", shape: "terminal" as const, text: "시작", x: 0, y: 0 }, { id: "activity", shape: "process" as const, text: "활동", x: 0, y: 100 }, { id: "end", shape: "terminal" as const, text: "종료", x: 0, y: 200 }], edges: [{ from: "start", to: "activity", label: "" as const }, { from: "activity", to: "end", label: "" as const }] };
  work.draft.reviewProject = free;
  work = await evaluate(request, work, { type: "validate-practice", missionId: "free" });
  expect(work.missions?.free.validation?.passed).toBe(false);
  expect(work.missions?.free.validation?.message).toContain("AI 설계 리뷰");
  expect((await request.post(endpoint(work.lessonId), { headers, data: payload(work, { type: "submit-practice", missionId: "free" }) })).status()).toBe(409);
  expect((await request.post(endpoint(work.lessonId), { headers, data: payload(work, { type: "request-review", missionId: "free" }) })).status()).toBe(400);
});

test("preview-api: 위조 상태·승인·문항·미션·과거 작품 형식과 한도를 엄격히 거부한다", async ({ request }) => {
  await readyTeacher(request);
  const base = emptyWork(lesson("sequence-lab"));
  const action: WorkAction = { type: "validate-practice" };
  const invalid = [
    { ...base, uid: "forged-user" },
    { ...base, aiReview: { verdict: "pass" } },
    { ...base, review: { status: "approved" } },
    { ...base, conceptSolved: ["unknown"] },
    { ...base, quizRoundIds: ["unknown"] },
    { ...base, conceptFeedback: { unknown: { correct: true, message: "forged" } } },
    { ...base, submission: { id: "6f98ce35-a574-4a73-96d8-7d40213d2706", order: base.draft.practiceOrder, submittedAt: 1, approvedByTeacher: true } },
    { ...base, missions: { unknown: { validation: null, submission: null } } },
    { ...base, validation: { passed: true, message: "forged", order: ["unknown"] } },
  ];
  for (const work of invalid) expect((await request.post(endpoint(base.lessonId), { headers, data: { classId: "2-1", work, action } })).status()).toBe(400);
  let programming = emptyWork(lesson("programming-13"));
  programming.draft.programming = { mission: "name", projects: { name: projects.name }, reflection: "" };
  programming = await evaluate(request, programming, { type: "validate-practice", missionId: "name" });
  programming = await evaluate(request, programming, { type: "submit-practice", missionId: "name" });
  const oversizedRaw = projects.name + " ".repeat(32769);
  for (const location of ["validation", "submission"] as const) {
    const work = structuredClone(programming);
    work.missions!.name[location]!.entryProject = oversizedRaw;
    expect((await request.post(endpoint(work.lessonId), { headers, data: payload(work, { type: "validate-practice", missionId: "name" }) })).status()).toBe(400);
  }
  const flow = emptyWork(lesson("review-flowchart"));
  const past = { ...initialReviewProject("flowchart") as FlowchartProject, mission: "2" as const, conditions: Array<string>(60).fill("가".repeat(1000)) };
  for (const location of ["validation", "submission"] as const) {
    const work = structuredClone(flow);
    work.missions = { "2": { validation: null, submission: null } };
    if (location === "validation") work.missions["2"].validation = { passed: true, message: "합성", order: [], reviewProject: past };
    else work.missions["2"].submission = { id: "6f98ce35-a574-4a73-96d8-7d40213d2706", order: [], submittedAt: 1, reviewProject: past };
    expect((await request.post(endpoint(work.lessonId), { headers, data: payload(work, { type: "validate-practice", missionId: "1" }) })).status()).toBe(400);
  }
});

test("preview-api: 본문 앞 권한 확인·CSRF·1MiB 요청 한도와 실패 요청 ID", async ({ request }) => {
  const anonymous = await request.post(endpoint("sequence-lab"), { data: "invalid-json", headers: { "Content-Type": "application/json" } });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
  await readyTeacher(request);
  const work = emptyWork(lesson("sequence-lab"));
  expect((await request.post(endpoint(work.lessonId), { data: payload(work, { type: "validate-practice" }) })).status()).toBe(403);
  expect((await request.post(endpoint(work.lessonId), { headers, data: { ...payload(work, { type: "validate-practice" }), padding: "x".repeat(1024 * 1024) } })).status()).toBe(413);
  expect((await request.post(endpoint(work.lessonId), { headers, data: { ...payload(work, { type: "validate-practice" }), classId: "2-99" } })).status()).toBe(403);
});
