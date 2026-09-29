import "server-only";
import { z } from "zod";
import type { Transaction } from "firebase-admin/firestore";
import { LESSONS, findLesson } from "../classroom/catalog";
import { emptyWork, practiceMatches } from "../classroom/progress";
import type { ClassSettings, StudentDashboard, TeacherDashboard, Work } from "../classroom/types";
import { admin } from "./firebase";
import { authorized, identity, type Account } from "./auth";
import { requireCondition } from "./errors";
import { actionSchema, applyAction, draftSchema, revisionSchema, sameOrder, validateDraft } from "./learning";

type StoredWork = Work & { uid: string; classId: string };
function workRef(uid: string, lessonId: string) { return admin().db.collection("csWork").doc(`${uid}__${lessonId}`); }
function toWork(data: StoredWork | undefined, lessonId: string): Work {
  const lesson = findLesson(lessonId)!;
  if (!data) return emptyWork(lesson);
  return { lessonId: data.lessonId, revision: data.revision, draft: data.draft, conceptSolved: data.conceptSolved, conceptFeedback: data.conceptFeedback, quizSolved: data.quizSolved, quizRound: data.quizRound, quizRoundIds: data.quizRoundIds, quizRoundGraded: data.quizRoundGraded, quizFeedback: data.quizFeedback, validation: data.validation, submission: data.submission, updatedAt: data.updatedAt };
}
async function studentClass(tx: Transaction, account: Account) {
  requireCondition(account.role === "student" && account.classId, 403, "FORBIDDEN", "학생 계정으로 입장해 주세요.");
  const classroom = (await tx.get(admin().db.collection("csClasses").doc(account.classId))).data() as ClassSettings | undefined;
  requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 반이 준비되지 않았어요. 선생님께 알려 주세요.");
  return classroom;
}
export async function studentDashboard(): Promise<StudentDashboard> {
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    const lessons = LESSONS.filter((lesson) => classroom.openedLessonIds.includes(lesson.id));
    const work: Record<string, Work> = {};
    for (const lesson of lessons) work[lesson.id] = toWork((await tx.get(workRef(account.uid, lesson.id))).data() as StoredWork | undefined, lesson.id);
    return { classroom, lessons, work };
  });
}
export async function getWork(lessonId: string) {
  requireCondition(findLesson(lessonId), 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    requireCondition(classroom.openedLessonIds.includes(lessonId), 403, "LESSON_CLOSED", "우리 반에 아직 열리지 않은 수업이에요.");
    return toWork((await tx.get(workRef(account.uid, lessonId))).data() as StoredWork | undefined, lessonId);
  });
}
export async function mutateWork(lessonId: string, payload: unknown, actionRequest: boolean) {
  const lesson = findLesson(lessonId); requireCondition(lesson, 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  const save = actionRequest ? null : z.object({ revision: revisionSchema, draft: draftSchema }).strict().parse(payload);
  const act = actionRequest ? z.object({ revision: revisionSchema, action: actionSchema }).strict().parse(payload) : null;
  if (save) save.draft = validateDraft(save.draft, lesson);
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    requireCondition(classroom.openedLessonIds.includes(lessonId), 403, "LESSON_CLOSED", "우리 반에 아직 열리지 않은 수업이에요.");
    const ref = workRef(account.uid, lessonId);
    const previous = toWork((await tx.get(ref)).data() as StoredWork | undefined, lessonId);
    // A save whose acknowledgement was lost is safe to repeat without another write.
    const samePractice = (a: typeof previous.draft, b: typeof previous.draft) =>
      sameOrder(a.practiceOrder, b.practiceOrder) && (a.entryProject ?? null) === (b.entryProject ?? null);
    const sameDraft = (a: typeof previous.draft, b: typeof previous.draft) =>
      a.stage === b.stage &&
      samePractice(a, b) &&
      JSON.stringify(a.conceptAnswers) === JSON.stringify(b.conceptAnswers) &&
      JSON.stringify(a.quizAnswers) === JSON.stringify(b.quizAnswers);
    if (save && sameDraft(save.draft, previous.draft)) return previous;
    if (act?.action.type === "submit-practice" && previous.submission && previous.validation?.passed && practiceMatches(previous.draft, previous.validation) && practiceMatches(previous.draft, previous.submission)) return previous;
    requireCondition(previous.revision === (save?.revision ?? act?.revision), 409, "REVISION_CONFLICT", "다른 탭에서 작업이 바뀌었어요. 현재 내용을 보관한 뒤 최신 기록을 확인해 주세요.");
    let next: Work;
    if (save) {
      next = { ...previous, draft: save.draft, revision: previous.revision + 1, updatedAt: Date.now(), validation: practiceMatches(save.draft, previous.validation) ? previous.validation : null };
      next.conceptFeedback = { ...previous.conceptFeedback };
      for (const id of Object.keys(next.conceptFeedback)) {
        if (previous.draft.conceptAnswers[id] !== save.draft.conceptAnswers[id]) delete next.conceptFeedback[id];
      }
    } else next = applyAction(previous, act!.action, lesson);
    tx.set(ref, { ...next, uid: account.uid, classId: account.classId });
    return next;
  });
}
export async function teacherDashboard(classId?: string, lessonId?: string): Promise<TeacherDashboard> {
  return authorized(await identity(), async (tx, account) => {
    requireCondition(account.role !== "student", 403, "FORBIDDEN", "선생님 계정으로 입장해 주세요.");
    const selectedClassId = classId ?? account.classIds[0];
    requireCondition(account.classIds.includes(selectedClassId), 403, "FORBIDDEN", "담당 반만 확인할 수 있어요.");
    const classrooms: ClassSettings[] = [];
    for (const id of account.classIds) {
      const value = (await tx.get(admin().db.collection("csClasses").doc(id))).data() as ClassSettings | undefined;
      if (value) classrooms.push(value);
    }
    const classroom = classrooms.find((c) => c.id === selectedClassId);
    requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 준비되지 않은 반이에요.");
    const selectedLessonId = lessonId ?? classroom.currentLessonId ?? classroom.openedLessonIds[0] ?? null;
    requireCondition(selectedLessonId === null || classroom.openedLessonIds.includes(selectedLessonId), 400, "INVALID_LESSON", "이 반에 열린 수업을 선택해 주세요.");
    const roster = await tx.get(admin().db.collection("csAccounts").where("classId", "==", selectedClassId));
    const students = [];
    for (const doc of roster.docs) {
      const student = doc.data() as Account;
      if (student.role !== "student" || student.disabled || !student.studentId) continue;
      const work = selectedLessonId ? toWork((await tx.get(workRef(student.uid, selectedLessonId))).data() as StoredWork | undefined, selectedLessonId) : null;
      students.push({ uid: student.uid, studentId: student.studentId, mustChangePassword: student.mustChangePassword, work });
    }
    students.sort((a, b) => a.studentId.localeCompare(b.studentId));
    return { classrooms, lessons: LESSONS, classroom, selectedLessonId, students };
  });
}
export async function updateClass(classId: string, payload: unknown) {
  const change = z.object({ revision: revisionSchema, currentLessonId: z.string().max(80).nullable(), openedLessonIds: z.array(z.string().max(80)).max(30) }).strict().parse(payload);
  requireCondition(new Set(change.openedLessonIds).size === change.openedLessonIds.length && change.openedLessonIds.every((id) => findLesson(id)) && (!change.currentLessonId || change.openedLessonIds.includes(change.currentLessonId)), 400, "INVALID_LESSON", "열린 수업 중에서 이번 수업을 선택해 주세요.");
  return authorized(await identity(), async (tx, account) => {
    requireCondition(account.role !== "student" && account.classIds.includes(classId), 403, "FORBIDDEN", "담당 반만 변경할 수 있어요.");
    const ref = admin().db.collection("csClasses").doc(classId); const previous = (await tx.get(ref)).data() as ClassSettings | undefined;
    requireCondition(previous, 404, "CLASS_NOT_FOUND", "반을 찾을 수 없어요.");
    requireCondition(previous.revision === change.revision, 409, "REVISION_CONFLICT", "수업 설정이 변경됐어요. 최신 설정을 불러와 주세요.");
    requireCondition(previous.openedLessonIds.every((id) => change.openedLessonIds.includes(id)), 400, "CLOSING_NOT_SUPPORTED", "한 번 열린 수업은 복습할 수 있도록 유지해요.");
    const next = { ...previous, ...change, revision: previous.revision + 1 };
    tx.set(ref, next); return next;
  });
}
