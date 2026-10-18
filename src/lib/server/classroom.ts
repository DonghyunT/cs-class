import "server-only";
import { z } from "zod";
import type { Transaction } from "firebase-admin/firestore";
import { RELEASED_LESSONS, findLesson } from "../classroom/catalog";
import { emptyWork, practiceMatches } from "../classroom/progress";
import { isLessonMission, missionsFor, programmingProjectMatches } from "../classroom/programming-entry";
import type { ClassSettings, StudentDashboard, TeacherDashboard, Work, WorkSummary } from "../classroom/types";
import { randomUUID } from "node:crypto";
import { basicReviewCheck } from "../classroom/review/project";
import { admin } from "./firebase";
import { authorized, identity, type Account } from "./auth";
import { requireCondition } from "./errors";
import { actionSchema, applyAction, draftSchema, revisionSchema, sameOrder, validateDraft } from "./learning";
import { sameReviewProject } from "../classroom/review/project";
import { verifyCommands } from "./review-proof";

type StoredWork = Work & { uid: string; classId: string };
export function workRef(uid: string, lessonId: string) { return admin().db.collection("csWork").doc(`${uid}__${lessonId}`); }
export function toWork(data: StoredWork | undefined, lessonId: string): Work {
  const lesson = findLesson(lessonId)!;
  if (!data) return emptyWork(lesson);
  // A mission that left the lesson opens as the first current one; its saved project stays.
  const programming = data.draft.programming;
  const draft = programming && !isLessonMission(lessonId, programming.mission) ? { ...data.draft, programming: { ...programming, mission: missionsFor(lessonId)[0].id } } : data.draft;
  return { lessonId: data.lessonId, revision: data.revision, draft, conceptSolved: data.conceptSolved, conceptFeedback: data.conceptFeedback, quizSolved: data.quizSolved, quizRound: data.quizRound, quizRoundIds: data.quizRoundIds, quizRoundGraded: data.quizRoundGraded, quizFeedback: data.quizFeedback, validation: data.validation, submission: data.submission, updatedAt: data.updatedAt, ...(data.missions ? { missions: data.missions } : {}), ...(data.review ? { review: data.review } : {}), ...(data.aiReview ? { aiReview: data.aiReview } : {}) };
}
export async function studentClass(tx: Transaction, account: Account) {
  requireCondition(account.role === "student" && account.classId, 403, "FORBIDDEN", "학생 계정으로 입장해 주세요.");
  const classroom = (await tx.get(admin().db.collection("csClasses").doc(account.classId))).data() as ClassSettings | undefined;
  requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 반이 준비되지 않았어요. 선생님께 알려 주세요.");
  return classroom;
}
export async function studentDashboard(): Promise<StudentDashboard> {
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    const lessons = RELEASED_LESSONS.filter((lesson) => classroom.openedLessonIds.includes(lesson.id));
    const work: Record<string, Work> = {};
    const snapshots = lessons.length ? await tx.getAll(...lessons.map((lesson) => workRef(account.uid, lesson.id))) : [];
    lessons.forEach((lesson, index) => { work[lesson.id] = toWork(snapshots[index].data() as StoredWork | undefined, lesson.id); });
    return { classroom, lessons, work };
  });
}
export async function studentClassroom(): Promise<Pick<StudentDashboard, "classroom" | "lessons">> {
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    return { classroom, lessons: RELEASED_LESSONS.filter(lesson => classroom.openedLessonIds.includes(lesson.id)) };
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
  // Checked before the idempotent submit reply below, so a retired mission cannot be re-submitted.
  const missionId = act && "missionId" in act.action ? act.action.missionId : undefined;
  if (lesson.practice.type === "programming" && missionId) requireCondition(isLessonMission(lesson.id, missionId), 400, "MISSION_REQUIRED", "확인할 미션을 선택해 주세요.");
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    requireCondition(classroom.openedLessonIds.includes(lessonId), 403, "LESSON_CLOSED", "우리 반에 아직 열리지 않은 수업이에요.");
    const ref = workRef(account.uid, lessonId);
    const previous = toWork((await tx.get(ref)).data() as StoredWork | undefined, lessonId);
    const project = save?.draft.reviewProject ?? previous.draft.reviewProject;
    if (project?.type === "sandwich") verifyCommands(account.uid, project);
    // A save whose acknowledgement was lost is safe to repeat without another write.
    const samePractice = (a: typeof previous.draft, b: typeof previous.draft) =>
      sameOrder(a.practiceOrder, b.practiceOrder) && (a.entryProject ?? null) === (b.entryProject ?? null);
    const sameDraft = (a: typeof previous.draft, b: typeof previous.draft) =>
      a.stage === b.stage &&
      samePractice(a, b) &&
      JSON.stringify(a.conceptAnswers) === JSON.stringify(b.conceptAnswers) &&
      JSON.stringify(a.quizAnswers) === JSON.stringify(b.quizAnswers) &&
      JSON.stringify(a.programming) === JSON.stringify(b.programming) &&
      JSON.stringify(a.reviewProject) === JSON.stringify(b.reviewProject);
    if (save && sameDraft(save.draft, previous.draft)) return previous;
    if (act?.action.type === "submit-practice" && previous.submission && previous.validation?.passed && practiceMatches(previous.draft, previous.validation) && practiceMatches(previous.draft, previous.submission)) return previous;
    if (act?.action.type === "submit-practice" && act.action.missionId) {
      const mission = previous.missions?.[act.action.missionId];
      if (mission?.submission && mission.validation?.passed && (lesson.practice.type === "flowchart" ? sameReviewProject(previous.draft.reviewProject, mission.submission.reviewProject, act.action.missionId) && sameReviewProject(mission.validation.reviewProject, mission.submission.reviewProject, act.action.missionId) : programmingProjectMatches(previous.draft.programming?.projects[act.action.missionId], mission.submission.entryProject) && programmingProjectMatches(mission.validation.entryProject, mission.submission.entryProject))) return previous;
    }
    requireCondition(previous.revision === (save?.revision ?? act?.revision), 409, "REVISION_CONFLICT", "다른 탭에서 작업이 바뀌었어요. 현재 내용을 보관한 뒤 최신 기록을 확인해 주세요.");
    let next: Work;
    if (save) {
      next = { ...previous, draft: save.draft, revision: previous.revision + 1, updatedAt: Date.now(), validation: practiceMatches(save.draft, previous.validation) ? previous.validation : null };
      next.conceptFeedback = { ...previous.conceptFeedback };
      if (previous.missions) next.missions = Object.fromEntries(Object.entries(previous.missions).map(([id, record]) => [id, { ...record, validation: (lesson.practice.type === "flowchart" ? sameReviewProject(save.draft.reviewProject, record.validation?.reviewProject, id) : programmingProjectMatches(save.draft.programming?.projects[id], record.validation?.entryProject)) ? record.validation : null }]));
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
    const classSnapshots = await tx.getAll(...account.classIds.map((id) => admin().db.collection("csClasses").doc(id)));
    const classrooms = classSnapshots.map((snap) => snap.data() as ClassSettings | undefined).filter((value): value is ClassSettings => !!value);
    const classroom = classrooms.find((c) => c.id === selectedClassId);
    requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 준비되지 않은 반이에요.");
    const openedReleased = classroom.openedLessonIds.filter((id) => RELEASED_LESSONS.some((lesson) => lesson.id === id));
    const selectedLessonId = lessonId ?? (classroom.currentLessonId && openedReleased.includes(classroom.currentLessonId) ? classroom.currentLessonId : openedReleased[0] ?? null);
    requireCondition(selectedLessonId === null || classroom.openedLessonIds.includes(selectedLessonId), 400, "INVALID_LESSON", "이 반에 열린 수업을 선택해 주세요.");
    const roster = await tx.get(admin().db.collection("csAccounts").where("classId", "==", selectedClassId));
    const students = roster.docs.map((doc) => doc.data() as Account).filter((student): student is Account & { studentId: string } => student.role === "student" && !student.disabled && !!student.studentId);
    const workSnapshots = selectedLessonId && students.length ? await tx.getAll(...students.map((student) => workRef(student.uid, selectedLessonId))) : [];
    const records = students.map((student, index) => ({ uid: student.uid, studentId: student.studentId, ...(student.nickname ? { nickname: student.nickname } : {}), lastActiveAt: student.session?.lastActivityAt ?? null, mustChangePassword: student.mustChangePassword, work: selectedLessonId ? workSummary(toWork(workSnapshots[index].data() as StoredWork | undefined, selectedLessonId)) : null }));
    records.sort((a, b) => a.studentId.localeCompare(b.studentId));
    return { classrooms, lessons: RELEASED_LESSONS, classroom, selectedLessonId, students: records };
  });
}
function workSummary(work: Work): WorkSummary {
  const edited = work.draft.programming ? Object.entries(work.missions ?? {}).some(([id, record]) => isLessonMission(work.lessonId, id) && record.submission && !programmingProjectMatches(work.draft.programming?.projects[id], record.submission.entryProject)) : work.draft.reviewProject?.type === "flowchart" ? Object.entries(work.missions ?? {}).some(([id, record]) => record.submission && !sameReviewProject(work.draft.reviewProject, record.submission.reviewProject, id)) : !!work.submission && !practiceMatches(work.draft, work.submission);
  const summary = { edited, validated: !!work.validation?.passed };
  const submission = (value: Work["submission"]) => value ? { id: value.id, submittedAt: value.submittedAt } : null;
  return { ...summary, lessonId: work.lessonId, revision: work.revision, conceptSolved: work.conceptSolved, quizSolved: work.quizSolved, updatedAt: work.updatedAt, submission: submission(work.submission), ...(work.missions ? { missions: Object.fromEntries(Object.entries(work.missions).map(([id, record]) => [id, { submission: submission(record.submission) }])) } : {}), ...(work.review ? { review: { id: work.review.id, status: work.review.status, requestedAt: work.review.requestedAt, ...(work.review.missionId ? { missionId: work.review.missionId } : {}) } } : {}) };
}
export async function teacherWork(uid: string, lessonId: string) {
  requireCondition(findLesson(lessonId), 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  return authorized(await identity(), async (tx, account) => {
    const student = (await tx.get(admin().db.collection("csAccounts").doc(uid))).data() as Account | undefined;
    requireCondition(account.role !== "student" && student?.role === "student" && student.classId && account.classIds.includes(student.classId), 403, "FORBIDDEN", "담당 반의 학생 작품만 확인할 수 있어요.");
    return toWork((await tx.get(workRef(uid, lessonId))).data() as StoredWork | undefined, lessonId);
  });
}
export async function decideReview(uid: string, lessonId: string, payload: unknown) {
  const input = z.object({ requestId: z.string().uuid(), decision: z.enum(["approve", "changes"]), message: z.string().max(1000) }).strict().parse(payload);
  requireCondition(findLesson(lessonId), 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  return authorized(await identity(), async (tx, account) => {
    const student = (await tx.get(admin().db.collection("csAccounts").doc(uid))).data() as Account | undefined;
    requireCondition(account.role !== "student" && student?.role === "student" && student.classId && account.classIds.includes(student.classId), 403, "FORBIDDEN", "담당 반의 확인 요청만 처리할 수 있어요.");
    const ref = workRef(uid, lessonId), work = toWork((await tx.get(ref)).data() as StoredWork | undefined, lessonId), request = work.review;
    requireCondition(request?.id === input.requestId && request.status === "pending", 409, "REVIEW_REPLACED", "학생이 요청을 바꾸거나 제출했어요. 최신 요청을 다시 확인해 주세요.");
    requireCondition(input.decision !== "changes" || input.message.trim(), 400, "MESSAGE_REQUIRED", "학생에게 수정할 내용을 알려 주세요.");
    requireCondition(basicReviewCheck(request.project, request.missionId).passed, 409, "BASIC_CHECK_REQUIRED", "요청본의 필수 내용을 확인해 주세요.");
    work.review = { ...request, status: input.decision === "approve" ? "approved" : "changes", message: input.message.trim() || "선생님이 요청한 작품을 확인하고 승인했어요.", decidedAt: Date.now() };
    if (input.decision === "approve") {
      const submission = { id: randomUUID(), order: [], reviewProject: request.project, submittedAt: Date.now(), approvedByTeacher: true };
      if (request.missionId) work.missions = { ...work.missions, [request.missionId]: { validation: work.missions?.[request.missionId]?.validation ?? null, submission } };
      else work.submission = submission;
    }
    // Revision guards the student's draft; a decision leaves the draft alone, so an open student screen keeps saving.
    work.updatedAt = Date.now(); tx.set(ref, { ...work, uid, classId: student.classId }); return work;
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
    requireCondition(change.openedLessonIds.every(id => previous.openedLessonIds.includes(id) || RELEASED_LESSONS.some(lesson => lesson.id === id)), 400, "LESSON_NOT_RELEASED", "아직 공개 준비가 끝나지 않은 수업이에요.");
    requireCondition(previous.openedLessonIds.every((id) => change.openedLessonIds.includes(id)), 400, "CLOSING_NOT_SUPPORTED", "한 번 열린 수업은 복습할 수 있도록 유지해요.");
    const next = { ...previous, ...change, revision: previous.revision + 1 };
    tx.set(ref, next); return next;
  });
}
