import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Lesson, Work, WorkAction } from "../classroom/types";
import { requireCondition } from "./errors";

export const revisionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const draftSchema = z.object({
  stage: z.enum(["concept", "quiz", "practice"]),
  conceptAnswers: z.record(z.string().max(30), z.string().max(30)),
  quizAnswers: z.record(z.string().max(30), z.string().max(30)),
  practiceOrder: z.array(z.string().max(30)).length(5),
}).strict();
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("check-concept"), conceptId: z.string().max(30) }).strict(),
  z.object({ type: z.literal("grade-quiz") }).strict(), z.object({ type: z.literal("retry-quiz") }).strict(),
  z.object({ type: z.literal("validate-practice") }).strict(), z.object({ type: z.literal("submit-practice") }).strict(),
]);
const conceptAnswers: Record<string, string> = { algorithm: "clear", sequence: "save" };
const quizAnswers: Record<string, string> = { q1: "a", q2: "b", q3: "c" };
const expectedOrder = ["start", "input", "greeting", "output", "end"];
export function sameOrder(a: string[], b: string[]) { return a.length === b.length && a.every((id, i) => b[i] === id); }
export function validateDraft(draft: z.infer<typeof draftSchema>, lesson: Lesson) {
  for (const [id, value] of Object.entries(draft.conceptAnswers)) {
    requireCondition(lesson.concepts.find((c) => c.id === id)?.question.options.some((option) => option.id === value), 400, "INVALID_ANSWER", "개념 답안을 확인해 주세요.");
  }
  for (const [id, value] of Object.entries(draft.quizAnswers)) {
    requireCondition(lesson.quiz.find((q) => q.id === id)?.options.some((option) => option.id === value), 400, "INVALID_ANSWER", "퀴즈 답안을 확인해 주세요.");
  }
  requireCondition(new Set(draft.practiceOrder).size === lesson.practice.blocks.length && draft.practiceOrder.every((id) => lesson.practice.blocks.some((block) => block.id === id)), 400, "INVALID_ORDER", "실습 블록을 확인해 주세요.");
  return draft;
}
export function applyAction(work: Work, action: WorkAction, lesson: Lesson): Work {
  const next = structuredClone(work);
  if (action.type === "check-concept") {
    const concept = lesson.concepts.find((c) => c.id === action.conceptId);
    requireCondition(concept, 404, "NOT_FOUND", "개념을 찾을 수 없어요.");
    const answer = next.draft.conceptAnswers[concept.id];
    requireCondition(answer, 400, "ANSWER_REQUIRED", "답을 먼저 선택해 주세요.");
    const correct = conceptAnswers[concept.id] === answer;
    next.conceptFeedback[concept.id] = { correct, message: correct ? concept.explanation : concept.question.hint };
    if (correct && !next.conceptSolved.includes(concept.id)) next.conceptSolved.push(concept.id);
  } else if (action.type === "grade-quiz") {
    requireCondition(!next.quizRoundGraded, 409, "ROUND_GRADED", "이미 확인한 풀이예요. 틀린 문제 다시 풀기를 선택해 주세요.");
    requireCondition(next.quizRoundIds.length && next.quizRoundIds.every((id) => next.draft.quizAnswers[id]), 400, "UNANSWERED", "이번 풀이의 모든 문항에 답한 뒤 확인해 주세요.");
    for (const id of next.quizRoundIds) {
      const correct = next.draft.quizAnswers[id] === quizAnswers[id];
      const question = lesson.quiz.find((q) => q.id === id)!;
      next.quizFeedback[id] = { correct, message: correct ? "맞았어요. 구체적인 명령과 실행 순서가 중요해요." : question.hint };
      if (correct && !next.quizSolved.includes(id)) next.quizSolved.push(id);
    }
    next.quizRoundGraded = true;
  } else if (action.type === "retry-quiz") {
    requireCondition(next.quizRoundGraded, 409, "ROUND_NOT_GRADED", "현재 풀이를 먼저 확인해 주세요.");
    const remaining = lesson.quiz.map((q) => q.id).filter((id) => !next.quizSolved.includes(id));
    requireCondition(remaining.length, 409, "QUIZ_COMPLETE", "모든 문제를 해결했어요.");
    next.quizRoundIds = remaining; next.quizRound += 1; next.quizRoundGraded = false;
    for (const id of remaining) { delete next.draft.quizAnswers[id]; delete next.quizFeedback[id]; }
  } else if (action.type === "validate-practice") {
    const passed = sameOrder(next.draft.practiceOrder, expectedOrder);
    next.validation = { passed, order: [...next.draft.practiceOrder], message: passed ? "이름을 입력받고 인사말을 보여 주는 순서가 완성됐어요. 제출하면 실습이 완료돼요." : "시작 → 이름 입력 → 인사말 만들기 → 화면에 보여 주기 → 종료의 흐름을 생각해 보세요." };
  } else {
    requireCondition(next.validation?.passed && sameOrder(next.validation.order, next.draft.practiceOrder) && sameOrder(next.draft.practiceOrder, expectedOrder), 409, "VALIDATION_REQUIRED", "현재 작품을 검증한 뒤 제출해 주세요.");
    next.submission = { id: randomUUID(), order: [...next.draft.practiceOrder], submittedAt: Date.now() };
  }
  next.revision += 1; next.updatedAt = Date.now(); return next;
}
