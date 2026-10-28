import "server-only";
import { z } from "zod";
import { findLesson } from "../classroom/catalog";
import { emptyWork } from "../classroom/progress";
import { isKnownLessonMission, knownMissionCount } from "../classroom/programming-entry";
import { isReviewType, reviewMissionIds, reviewProjectSchema } from "../classroom/review/project";
import type { Lesson, Submission, ValidationResult, Work } from "../classroom/types";
import { authorized, identity } from "./auth";
import { requireCondition } from "./errors";
import { admin } from "./firebase";
import { actionSchema, applyAction, draftSchema, revisionSchema, validateDraft } from "./learning";

const idSchema = z.string().min(1).max(30);
const idsSchema = z.array(idSchema).max(100);
const timeSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const messageSchema = z.string().max(32000);
const feedbackSchema = z.record(idSchema, z.object({ correct: z.boolean(), message: messageSchema }).strict());
const snapshotFields = {
  order: z.array(idSchema).max(50),
  entryProject: z.string().max(100000).nullable().optional(),
  reviewProject: reviewProjectSchema.optional(),
};
const validationSchema = z.object({
  passed: z.boolean(), message: messageSchema, ...snapshotFields,
  criteriaResults: z.array(z.object({ id: idSchema, passed: z.boolean(), message: messageSchema }).strict()).max(50).optional(),
}).strict();
const submissionSchema = z.object({ id: z.uuid(), submittedAt: timeSchema, firstSubmittedAt: timeSchema.optional(), ...snapshotFields }).strict();
const workSchema = z.object({
  lessonId: z.string().min(1).max(80), revision: revisionSchema, draft: draftSchema,
  conceptSolved: idsSchema, conceptFeedback: feedbackSchema,
  quizSolved: idsSchema, quizRound: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  quizRoundIds: idsSchema, quizRoundGraded: z.boolean(), quizFeedback: feedbackSchema,
  validation: validationSchema.nullable(), submission: submissionSchema.nullable(),
  missions: z.record(z.string().min(1).max(20), z.object({ validation: validationSchema.nullable(), submission: submissionSchema.nullable() }).strict()).optional(),
  updatedAt: timeSchema.nullable(),
}).strict();
const inputSchema = z.object({ classId: z.string().min(1).max(80), work: workSchema, action: actionSchema }).strict();

export async function authorizeTeacherPreview(classId?: string, lessonId?: string): Promise<{ uid: string; classId: string; lesson: Lesson | null }> {
  const who = await identity();
  return authorized(who, async (transaction, account) => {
    requireCondition(account.role === "teacher" || account.role === "instructor", 403, "FORBIDDEN", "선생님만 수업을 미리 볼 수 있어요.");
    const selectedClassId = classId ?? account.classIds[0] ?? "";
    // With no arguments this checks the session and role before the route reads its body.
    if (classId !== undefined || lessonId !== undefined) {
      requireCondition(account.classIds.includes(selectedClassId), 403, "FORBIDDEN", "담당 반만 확인할 수 있어요.");
      const classroom = await transaction.get(admin().db.collection("csClasses").doc(selectedClassId));
      requireCondition(classroom.exists, 404, "NOT_FOUND", "반을 찾을 수 없어요.");
    }
    const lesson = lessonId === undefined ? null : findLesson(lessonId);
    requireCondition(lessonId === undefined || lesson, 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
    return { uid: who.uid, classId: selectedClassId, lesson: lesson ?? null };
  });
}

function validateIds(ids: string[], allowed: string[]) {
  requireCondition(new Set(ids).size === ids.length && ids.every(id => allowed.includes(id)), 400, "INVALID_WORK", "미리보기의 문항과 완료 기록을 확인해 주세요.");
}

function validateSnapshot(snapshot: ValidationResult | Submission | null, lesson: Lesson, missionId?: string) {
  if (!snapshot) return;
  const draft = emptyWork(lesson).draft;
  if (lesson.practice.type === "programming") {
    requireCondition(missionId && isKnownLessonMission(lesson.id, missionId) && typeof snapshot.entryProject === "string" && !snapshot.order.length && !snapshot.reviewProject, 400, "INVALID_PROJECT", "이전 미션의 작품 형식을 확인해 주세요.");
    draft.programming = { mission: missionId, projects: { [missionId]: snapshot.entryProject }, reflection: "" };
  } else if (isReviewType(lesson.practice.type)) {
    const project = snapshot.reviewProject;
    requireCondition(project && project.type === lesson.practice.type && !snapshot.entryProject && !snapshot.order.length, 400, "INVALID_PROJECT", "이전 복습 작품의 형식을 확인해 주세요.");
    if (project.type === "flowchart") requireCondition(project.mission === missionId, 400, "INVALID_MISSION", "이전 순서도의 미션을 확인해 주세요.");
    draft.reviewProject = project;
  } else {
    requireCondition(!snapshot.reviewProject, 400, "INVALID_PROJECT", "이전 실습 작품의 형식을 확인해 주세요.");
    draft.entryProject = snapshot.entryProject ?? null;
    draft.practiceOrder = snapshot.order;
  }
  // Each historical project gets the same parser and byte limits as a current draft.
  const normalized = validateDraft(draft, lesson);
  requireCondition(normalized.practiceOrder.length === snapshot.order.length && normalized.practiceOrder.every((id, index) => snapshot.order[index] === id), 400, "INVALID_ORDER", "이전 실습 블록을 확인해 주세요.");
  if ("criteriaResults" in snapshot && snapshot.criteriaResults) {
    validateIds(snapshot.criteriaResults.map(result => result.id), lesson.practice.criteria?.map(criterion => criterion.id) ?? []);
  }
}

function validateWork(work: Work, lesson: Lesson) {
  requireCondition(work.lessonId === lesson.id, 400, "INVALID_WORK", "미리보기 수업을 확인해 주세요.");
  const concepts = lesson.concepts.map(item => item.id), quiz = lesson.quiz.map(item => item.id);
  validateIds(work.conceptSolved, concepts); validateIds(Object.keys(work.conceptFeedback), concepts);
  validateIds(work.quizSolved, quiz); validateIds(work.quizRoundIds, quiz); validateIds(Object.keys(work.quizFeedback), quiz);
  work.draft = validateDraft(work.draft, lesson);
  const multipleMissions = lesson.practice.type === "programming" || lesson.practice.type === "flowchart";
  requireCondition(multipleMissions ? !work.validation && !work.submission : !work.missions, 400, "INVALID_WORK", "수업의 실습 기록 형식을 확인해 주세요.");
  if (multipleMissions) {
    const entries = Object.entries(work.missions ?? {});
    requireCondition(entries.length <= (lesson.practice.type === "programming" ? knownMissionCount(lesson.id) : 4), 400, "INVALID_MISSION", "미션 기록을 확인해 주세요.");
    for (const [id, mission] of entries) {
      requireCondition(lesson.practice.type === "programming" ? isKnownLessonMission(lesson.id, id) : reviewMissionIds.includes(id), 400, "INVALID_MISSION", "미션 기록을 확인해 주세요.");
      validateSnapshot(mission.validation, lesson, id); validateSnapshot(mission.submission, lesson, id);
    }
  } else {
    validateSnapshot(work.validation, lesson); validateSnapshot(work.submission, lesson);
  }
}

export async function evaluateTeacherPreview(lessonId: string, input: unknown): Promise<Work> {
  const value = inputSchema.parse(input);
  const { lesson } = await authorizeTeacherPreview(value.classId, lessonId);
  requireCondition(lesson, 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  const action = value.action;
  requireCondition(action.type !== "request-review", 400, "INVALID_ACTION", "미리보기에서는 AI와 선생님 확인 요청을 사용할 수 없어요.");
  if (action.type === "check-concept") requireCondition(lesson.concepts.some(item => item.id === action.conceptId), 400, "INVALID_ANSWER", "미리보기 문항을 확인해 주세요.");
  validateWork(value.work, lesson);
  return applyAction(value.work, action, lesson);
}
