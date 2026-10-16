import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Lesson, Work, WorkAction } from "../classroom/types";
import { parseEntryProject } from "../classroom/entry-project";
import { MAX_PROJECT_BYTES, checkProgrammingMission, missionById, parseProgrammingProject, programmingProjectMatches } from "../classroom/programming-entry";
import { practiceMatches } from "../classroom/progress";
import { requireCondition } from "./errors";
import { getLessonSolution } from "./solutions";
import { basicReviewCheck, frozenReviewProject, isReviewType, reviewMissionIds, reviewProjectSchema, sameReviewProject } from "../classroom/review/project";

export const revisionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const draftSchema = z.object({
  stage: z.enum(["concept", "quiz", "practice"]),
  conceptAnswers: z.record(z.string().max(30), z.string().max(30)),
  quizAnswers: z.record(z.string().max(30), z.string().max(30)),
  practiceOrder: z.array(z.string().max(30)).max(50),
  entryProject: z.string().max(100000).nullable().optional(),
  programming: z.object({ mission: z.string().max(20), projects: z.record(z.string().max(20), z.string().max(80000)), reflection: z.string().max(500) }).strict().optional(),
  reviewProject: reviewProjectSchema.optional(),
}).strict();

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("check-concept"), conceptId: z.string().max(30) }).strict(),
  z.object({ type: z.literal("grade-quiz") }).strict(),
  z.object({ type: z.literal("retry-quiz") }).strict(),
  z.object({ type: z.literal("validate-practice"), missionId: z.string().max(20).optional() }).strict(),
  z.object({ type: z.literal("submit-practice"), missionId: z.string().max(20).optional() }).strict(),
  z.object({ type: z.literal("request-review"), missionId: z.string().max(20).optional() }).strict(),
]);

export function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => b[i] === id);
}

export function validateDraft(draft: z.infer<typeof draftSchema>, lesson: Lesson) {
  for (const [id, value] of Object.entries(draft.conceptAnswers)) {
    requireCondition(lesson.concepts.find((c) => c.id === id)?.question.options.some((option) => option.id === value), 400, "INVALID_ANSWER", "개념 답안을 확인해 주세요.");
  }
  for (const [id, value] of Object.entries(draft.quizAnswers)) {
    requireCondition(lesson.quiz.find((q) => q.id === id)?.options.some((option) => option.id === value), 400, "INVALID_ANSWER", "퀴즈 답안을 확인해 주세요.");
  }
  if (isReviewType(lesson.practice.type)) {
    requireCondition(draft.reviewProject?.type === lesson.practice.type && !draft.programming && !draft.entryProject && !draft.practiceOrder.length, 400, "INVALID_PROJECT", "이 복습 수업의 작품 형식을 확인해 주세요.");
    requireCondition(Buffer.byteLength(JSON.stringify(draft), "utf8") <= 160000, 400, "PROJECT_TOO_LARGE", "작품이 저장 한도를 넘었어요. 입력을 보존하고 필요한 내용만 남겨 주세요.");
    return draft;
  }
  requireCondition(!draft.reviewProject, 400, "INVALID_PROJECT", "이 수업의 작품 형식을 확인해 주세요.");
  if (lesson.practice.type === "programming") {
    requireCondition(draft.programming && missionById(draft.programming.mission) && Object.keys(draft.programming.projects).length <= 5 && Object.entries(draft.programming.projects).every(([id, raw]) => missionById(id) && parseProgrammingProject(raw)), 400, "INVALID_PROJECT", "미션의 작품과 입력값을 확인해 주세요.");
    // Store the server's own normalization, never the client's raw extra fields.
    const projects = Object.fromEntries(Object.entries(draft.programming!.projects).map(([id, raw]) => [id, JSON.stringify(parseProgrammingProject(raw)!.project)]));
    const normalized = { ...draft, programming: { ...draft.programming!, projects }, entryProject: null, practiceOrder: [] };
    requireCondition(Object.values(projects).every((project) => Buffer.byteLength(project, "utf8") <= MAX_PROJECT_BYTES) && Buffer.byteLength(JSON.stringify(normalized), "utf8") <= 120000, 400, "PROJECT_TOO_LARGE", "작품이 저장 한도를 넘었어요. 현재 블록을 보존하고 필요한 블록만 남겨 다시 시도해 주세요.");
    return normalized;
  }
  requireCondition(!draft.programming, 400, "INVALID_PROJECT", "이 수업의 작품 형식을 확인해 주세요.");
  if (lesson.practice.type === "entryjs") {
    const blocks = parseEntryProject(draft.entryProject);
    requireCondition(blocks, 400, "INVALID_PROJECT", "이 실습에서 사용하는 블록과 값을 확인해 주세요.");
    return { ...draft, practiceOrder: blocks.order };
  } else {
    // Default: ordering practice
    requireCondition(new Set(draft.practiceOrder).size === lesson.practice.blocks.length && draft.practiceOrder.every((id) => lesson.practice.blocks.some((block) => block.id === id)), 400, "INVALID_ORDER", "실습 블록을 확인해 주세요.");
  }
  return draft;
}

export function applyAction(work: Work, action: WorkAction, lesson: Lesson): Work {
  const next = structuredClone(work);
  const solution = getLessonSolution(lesson.id);
  requireCondition(solution, 500, "SOLUTION_MISSING", "수업 정답 정보가 준비되지 않았어요.");

  if (isReviewType(lesson.practice.type) && ["validate-practice", "submit-practice", "request-review"].includes(action.type)) {
    const project = next.draft.reviewProject!;
    const missionId = "missionId" in action ? action.missionId : undefined;
    requireCondition(project.type === "flowchart" ? !!missionId && reviewMissionIds.includes(missionId) : !missionId, 400, "INVALID_MISSION", "현재 실습을 선택해 주세요.");
    const checked = basicReviewCheck(project, missionId);
    const snapshot = frozenReviewProject(project, missionId);
    const previous = missionId ? next.missions?.[missionId] ?? { validation: null, submission: null } : next;
    const needsAi = project.type === "flowchart" && missionId === "free";
    const review = next.aiReview;
    const aiPassed = !needsAi || !!review && review.verdict === "pass" && review.missionId === missionId && sameReviewProject(project, review.project, missionId);
    if (action.type === "validate-practice") {
      const validation = { ...checked, passed: checked.passed && aiPassed, order: [], reviewProject: snapshot, message: checked.passed && !aiPassed ? "기본 검사를 통과했어요. 현재 작품의 AI 설계 리뷰를 받아 주세요." : checked.message };
      if (missionId) next.missions = { ...next.missions, [missionId]: { ...previous, validation, submission: previous.submission } };
      else next.validation = validation;
    } else if (action.type === "request-review") {
      requireCondition(checked.passed && review && review.verdict !== "pass" && review.missionId === missionId, 409, "REVIEW_NOT_AVAILABLE", "기본 검사를 통과하고 AI가 보완이나 확인을 안내한 작품을 요청해 주세요.");
      requireCondition(review && sameReviewProject(project, review.project, missionId), 409, "AI_REVIEW_REQUIRED", "현재 작품의 AI 리뷰를 먼저 받아 주세요.");
      next.review = { id: randomUUID(), ...(missionId ? { missionId } : {}), project: snapshot, status: "pending", message: review.message, requestedAt: Date.now() };
    } else {
      requireCondition(checked.passed && aiPassed && previous.validation?.passed && sameReviewProject(project, previous.validation.reviewProject, missionId), 409, "VALIDATION_REQUIRED", "현재 작품을 검증한 뒤 제출해 주세요.");
      const submission = { id: randomUUID(), order: [], reviewProject: snapshot, submittedAt: Date.now() };
      if (missionId) next.missions = { ...next.missions, [missionId]: { validation: previous.validation, submission } };
      else next.submission = submission;
      if (next.review?.status === "pending") next.review = { ...next.review, status: "replaced" };
    }
    next.revision++; next.updatedAt = Date.now(); return next;
  }
  requireCondition(action.type !== "request-review", 400, "INVALID_ACTION", "이 수업에서는 확인 요청을 사용할 수 없어요.");

  if (action.type === "validate-practice" || action.type === "submit-practice") {
    if (lesson.practice.type === "programming") {
      const id = action.missionId;
      requireCondition(id && missionById(id), 400, "MISSION_REQUIRED", "확인할 미션을 선택해 주세요.");
      const project = next.draft.programming?.projects[id];
      requireCondition(project && parseProgrammingProject(project), 400, "INVALID_PROJECT", "현재 작품을 확인해 주세요.");
      const checked = checkProgrammingMission(id, project);
      const previous = next.missions?.[id] ?? { validation: null, submission: null };
      if (action.type === "validate-practice") next.missions = { ...next.missions, [id]: { ...previous, validation: { ...checked, order: [], entryProject: project } } };
      else {
        requireCondition(previous.validation?.passed && programmingProjectMatches(project, previous.validation.entryProject) && checked.passed, 409, "VALIDATION_REQUIRED", "현재 작품을 검증한 뒤 제출해 주세요.");
        next.missions = { ...next.missions, [id]: { ...previous, submission: { id: randomUUID(), order: [], entryProject: project, submittedAt: Date.now() } } };
      }
      next.revision += 1; next.updatedAt = Date.now();
      return next;
    }
    requireCondition(!action.missionId, 400, "INVALID_MISSION", "이 수업의 실습을 확인해 주세요.");
  }

  if (action.type === "check-concept") {
    const concept = lesson.concepts.find((c) => c.id === action.conceptId);
    requireCondition(concept, 404, "NOT_FOUND", "개념을 찾을 수 없어요.");
    const answer = next.draft.conceptAnswers[concept.id];
    requireCondition(answer, 400, "ANSWER_REQUIRED", "답을 먼저 선택해 주세요.");
    const correct = solution.conceptAnswers[concept.id] === answer;
    next.conceptFeedback[concept.id] = { correct, message: correct ? concept.explanation : concept.question.hint };
    if (correct && !next.conceptSolved.includes(concept.id)) next.conceptSolved.push(concept.id);
  } else if (action.type === "grade-quiz") {
    requireCondition(!next.quizRoundGraded, 409, "ROUND_GRADED", "이미 확인한 풀이예요. 틀린 문제 다시 풀기를 선택해 주세요.");
    requireCondition(next.quizRoundIds.length && next.quizRoundIds.every((id) => next.draft.quizAnswers[id]), 400, "UNANSWERED", "이번 풀이의 모든 문항에 답한 뒤 확인해 주세요.");
    for (const id of next.quizRoundIds) {
      const correct = next.draft.quizAnswers[id] === solution.quizAnswers[id];
      const question = lesson.quiz.find((q) => q.id === id)!;
      const customFeedback = solution.quizFeedback?.[id];
      const defaultCorrectMsg = "맞았어요. 구체적인 명령과 실행 순서가 중요해요.";
      next.quizFeedback[id] = {
        correct,
        message: correct ? (customFeedback?.correct ?? defaultCorrectMsg) : (customFeedback?.incorrect ?? question.hint),
      };
      if (correct && !next.quizSolved.includes(id)) next.quizSolved.push(id);
    }
    next.quizRoundGraded = true;
  } else if (action.type === "retry-quiz") {
    requireCondition(next.quizRoundGraded, 409, "ROUND_NOT_GRADED", "현재 풀이를 먼저 확인해 주세요.");
    const remaining = lesson.quiz.map((q) => q.id).filter((id) => !next.quizSolved.includes(id));
    requireCondition(remaining.length, 409, "QUIZ_COMPLETE", "모든 문제를 해결했어요.");
    next.quizRoundIds = remaining;
    next.quizRound += 1;
    next.quizRoundGraded = false;
    for (const id of remaining) {
      delete next.draft.quizAnswers[id];
      delete next.quizFeedback[id];
    }
  } else if (action.type === "validate-practice") {
    if (solution.practice.type === "ordering") {
      const passed = sameOrder(next.draft.practiceOrder, solution.practice.expectedOrder);
      next.validation = {
        passed,
        order: [...next.draft.practiceOrder],
        entryProject: next.draft.entryProject ?? null,
        message: passed ? solution.practice.successMessage : solution.practice.failureMessage,
      };
    } else {
      const results = solution.practice.criteria.map((c) => ({
        id: c.id,
        label: c.label,
        ...c.check(next.draft.entryProject, next.draft),
      }));
      const passed = results.every((r) => r.passed);
      next.validation = {
        passed,
        order: [...next.draft.practiceOrder],
        entryProject: next.draft.entryProject ?? null,
        message: passed ? solution.practice.successMessage : solution.practice.failureMessage,
        criteriaResults: results.map((r) => ({ id: r.id, passed: r.passed, message: r.message })),
      };
    }
  } else {
    // action.type === "submit-practice"
    if (solution.practice.type === "ordering") {
      requireCondition(
        next.validation?.passed &&
        practiceMatches(next.draft, next.validation) &&
        sameOrder(next.draft.practiceOrder, solution.practice.expectedOrder),
        409,
        "VALIDATION_REQUIRED",
        "현재 작품을 검증한 뒤 제출해 주세요."
      );
      next.submission = { id: randomUUID(), order: [...next.draft.practiceOrder], submittedAt: Date.now() };
    } else {
      const allPassed = solution.practice.criteria.every((c) => c.check(next.draft.entryProject, next.draft).passed);
      requireCondition(
        next.validation?.passed && practiceMatches(next.draft, next.validation) && allPassed,
        409,
        "VALIDATION_REQUIRED",
        "현재 작품을 검증한 뒤 제출해 주세요."
      );
      next.submission = {
        id: randomUUID(),
        order: [...next.draft.practiceOrder],
        entryProject: next.draft.entryProject ?? null,
        submittedAt: Date.now(),
      };
    }
  }
  next.revision += 1;
  next.updatedAt = Date.now();
  return next;
}
