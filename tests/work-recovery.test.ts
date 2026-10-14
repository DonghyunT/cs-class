import { expect, test } from "@playwright/test";
import { hasActionResult, hasRecoveryFields } from "../src/components/student/work-recovery";
import { buildProgrammingProject } from "../src/lib/classroom/programming-entry";
import { initialReviewProject } from "../src/lib/classroom/review/project";
import type { Submission, Work } from "../src/lib/classroom/types";

function work(): Work {
  return {
    lessonId: "sequence-lab",
    revision: 4,
    draft: {
      stage: "practice",
      conceptAnswers: { c1: "answer" },
      quizAnswers: { q1: "a", q2: "b" },
      practiceOrder: ["start", "move"],
      entryProject: null,
    },
    conceptSolved: [],
    conceptFeedback: {},
    quizSolved: ["q1"],
    quizRound: 2,
    quizRoundIds: ["q1", "q2"],
    quizRoundGraded: false,
    quizFeedback: {},
    validation: null,
    submission: null,
    updatedAt: 100,
  };
}

function submitted(): Submission {
  return { id: "submission", order: ["start", "move"], submittedAt: 101 };
}

test("복구 기록은 유효한 저장본을 받아들이고 입력을 바꾸지 않는다", () => {
  const value = work();
  const snapshot = structuredClone(value);
  expect(hasRecoveryFields(value)).toBe(true);
  expect(value).toEqual(snapshot);
});

test("복구 기록은 revision·답안·피드백·제출 형식이 잘못되면 거절한다", () => {
  const invalid: Work[] = [
    { ...work(), revision: -1 },
    { ...work(), revision: NaN },
    { ...work(), quizRound: 1.5 },
    { ...work(), draft: { ...work().draft, quizAnswers: { q1: 1 } } } as unknown as Work,
    { ...work(), conceptFeedback: { c1: { correct: "yes", message: "result" } } } as unknown as Work,
    { ...work(), submission: { ...submitted(), submittedAt: Infinity } },
    { ...work(), missions: { name: { validation: null } } } as unknown as Work,
  ];
  for (const value of invalid) expect(hasRecoveryFields(value)).toBe(false);
});

test("복습 기본값이 빠진 서버 기록을 자동 보정된 저장본으로 인정하지 않는다", () => {
  const value = work();
  value.draft.reviewProject = initialReviewProject("abstraction");
  expect(hasRecoveryFields(value)).toBe(true);
  const incomplete = structuredClone(value);
  delete (incomplete.draft.reviewProject as unknown as Record<string, unknown>).view;
  const snapshot = structuredClone(incomplete);
  expect(hasRecoveryFields(incomplete)).toBe(false);
  expect(incomplete).toEqual(snapshot);
});

test("복구 기록은 미션별 결과와 교사·AI 요청 작품도 확인한다", () => {
  const value = work();
  const project = initialReviewProject("flowchart");
  value.missions = { free: { validation: null, submission: { ...submitted(), reviewProject: project } } };
  value.review = { id: "review", status: "pending", project, message: "", requestedAt: 100 };
  value.aiReview = { project, verdict: "uncertain", message: "" };
  expect(hasRecoveryFields(value)).toBe(true);
  const invalid = structuredClone(value);
  invalid.missions!.free.submission!.order = [1] as unknown as string[];
  expect(hasRecoveryFields(invalid)).toBe(false);
});

test("개념 확인은 같은 수업·한 단계 증가한 revision·같은 초안의 결과만 인정한다", () => {
  const before = work();
  const next = { ...structuredClone(before), revision: 5, conceptFeedback: { c1: { correct: false, message: "오답" } } };
  const action = { type: "check-concept", conceptId: "c1" } as const;
  expect(hasActionResult(before, action, next)).toBe(true);
  for (const revision of [3, 4, 6]) expect(hasActionResult(before, action, { ...next, revision })).toBe(false);
  expect(hasActionResult(before, action, { ...next, lessonId: "other" })).toBe(false);
  expect(hasActionResult(before, action, { ...next, draft: { ...next.draft, conceptAnswers: { c1: "later edit" } } })).toBe(false);
  expect(hasActionResult(before, action, { ...next, conceptFeedback: {} })).toBe(false);
});

test("퀴즈 채점은 요청한 회차의 모든 문항 결과가 있을 때 확인한다", () => {
  const before = work();
  const next = {
    ...structuredClone(before), revision: 5, quizRoundGraded: true,
    quizFeedback: { q1: { correct: true, message: "정답" }, q2: { correct: false, message: "오답" } },
  };
  expect(hasActionResult(before, { type: "grade-quiz" }, next)).toBe(true);
  expect(hasActionResult(before, { type: "grade-quiz" }, { ...next, quizRound: 3 })).toBe(false);
  expect(hasActionResult(before, { type: "grade-quiz" }, { ...next, quizRoundGraded: false })).toBe(false);
  expect(hasActionResult(before, { type: "grade-quiz" }, { ...next, quizFeedback: { q1: next.quizFeedback.q1 } })).toBe(false);
});

test("퀴즈 재시도는 푼 답을 보존하고 남은 답·피드백만 비운 결과를 인정한다", () => {
  const before = work();
  const next = structuredClone(before);
  next.revision = 5;
  next.quizRound = 3;
  next.quizRoundIds = ["q2"];
  next.draft.quizAnswers = { q1: "a" };
  expect(hasActionResult(before, { type: "retry-quiz" }, next)).toBe(true);
  expect(hasActionResult(before, { type: "retry-quiz" }, { ...next, draft: { ...next.draft, quizAnswers: {} } })).toBe(false);
  expect(hasActionResult(before, { type: "retry-quiz" }, { ...next, quizSolved: [] })).toBe(false);
  expect(hasActionResult(before, { type: "retry-quiz" }, { ...next, quizFeedback: { q2: { correct: false, message: "old" } } })).toBe(false);
});

test("교사 요청은 새 요청 ID·같은 미션·요청 당시 작품으로 확인한다", () => {
  const before = work();
  before.draft.reviewProject = initialReviewProject("abstraction");
  before.review = { id: "old", project: before.draft.reviewProject, status: "pending", message: "", requestedAt: 100 };
  const next = structuredClone(before);
  next.revision = 5;
  next.review = { ...before.review, id: "new", missionId: "free" };
  const action = { type: "request-review", missionId: "free" } as const;
  expect(hasActionResult(before, action, next)).toBe(true);
  expect(hasActionResult(before, action, { ...next, review: { ...next.review, id: "old" } })).toBe(false);
  expect(hasActionResult(before, action, { ...next, review: { ...next.review, missionId: "other" } })).toBe(false);
  const changed = structuredClone(next);
  if (changed.review!.project.type === "abstraction") changed.review!.project.goal = "다른 작품";
  expect(hasActionResult(before, action, changed)).toBe(false);
});

test("실습 검증의 실패 판정도 새 revision의 요청 처리 결과로 확인한다", () => {
  const before = work();
  const next = { ...structuredClone(before), revision: 5, validation: { passed: false, message: "미완성", order: ["start", "move"] } };
  expect(hasActionResult(before, { type: "validate-practice" }, next)).toBe(true);
  expect(hasActionResult(before, { type: "validate-practice" }, { ...next, revision: 4 })).toBe(false);
  expect(hasActionResult(before, { type: "validate-practice" }, { ...next, validation: { ...next.validation, order: ["move", "start"] } })).toBe(false);
});

test("실습 제출은 동일 revision의 멱등 결과도 인정하며 다른 작품은 거절한다", () => {
  const before = work();
  const next = { ...structuredClone(before), submission: submitted() };
  expect(hasActionResult(before, { type: "submit-practice" }, next)).toBe(true);
  expect(hasActionResult(before, { type: "submit-practice" }, { ...next, submission: null })).toBe(false);
  expect(hasActionResult(before, { type: "submit-practice" }, { ...next, submission: { ...submitted(), order: [] } })).toBe(false);
});

test("프로그래밍은 요청한 미션의 작품을 비교하고 다른 미션 결과로 대체하지 않는다", () => {
  const before = work();
  const project = buildProgrammingProject();
  before.draft.programming = { mission: "name", projects: { name: project }, reflection: "" };
  const next = structuredClone(before);
  next.revision = 5;
  next.missions = { name: { validation: null, submission: { ...submitted(), entryProject: project } } };
  const action = { type: "submit-practice", missionId: "name" } as const;
  expect(hasActionResult(before, action, next)).toBe(true);
  expect(hasActionResult(before, { ...action, missionId: "move" }, next)).toBe(false);
  const invalid = structuredClone(next);
  invalid.missions!.name.submission!.entryProject = "not a project";
  expect(hasActionResult(before, action, invalid)).toBe(false);
});

test("순서도는 요청 미션의 결과를 사용하고 변경된 저장 작품은 거절한다", () => {
  const before = work();
  const project = initialReviewProject("flowchart");
  if (project.type !== "flowchart") throw new Error("flowchart fixture");
  project.mission = "free";
  before.draft.reviewProject = project;
  const next = structuredClone(before);
  next.revision = 5;
  next.missions = { free: { submission: null, validation: { passed: true, message: "", order: [], reviewProject: structuredClone(project) } } };
  const action = { type: "validate-practice", missionId: "free" } as const;
  expect(hasActionResult(before, action, next)).toBe(true);
  expect(hasActionResult(before, { ...action, missionId: "1" }, next)).toBe(false);
  const invalid = structuredClone(next);
  const saved = invalid.missions!.free.validation!.reviewProject;
  if (saved?.type === "flowchart") saved.goal = "다른 목표";
  expect(hasActionResult(before, action, invalid)).toBe(false);
  expect(before.revision).toBe(4);
  expect(before.draft.reviewProject).toEqual(project);
});
