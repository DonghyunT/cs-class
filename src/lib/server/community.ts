import "server-only";
import { z } from "zod";
import { FieldPath, type Transaction } from "firebase-admin/firestore";
import { LESSONS, RELEASED_LESSONS } from "../classroom/catalog";
import { QUESTION_ANSWER_LIMIT, type CommunityData, type CommunityQuestion, type QuestionAuthor, type QuestionAnswer, type QuestionReplyResult, type QuestionSummary } from "../classroom/community";
import type { ClassSettings } from "../classroom/types";
import { authorized, identity, type Account } from "./auth";
import { studentClass } from "./classroom";
import { admin } from "./firebase";
import { requireCondition } from "./errors";

type StoredQuestion = QuestionSummary & { body: string };
const uuid = z.string().uuid();
const questionInput = z.object({ id: uuid, title: z.string().trim().min(1).max(80), body: z.string().trim().min(1).max(2000), lessonId: z.string().min(1).max(80).nullable() }).strict();
const answerInput = z.object({ id: uuid, body: z.string().trim().min(1).max(1500) }).strict();
const resolveInput = z.object({ resolved: z.boolean() }).strict();
const deleteInput = z.object({}).strict();
const questionRef = (id: string) => admin().db.collection("csQuestions").doc(id);
const authorFor = (account: Account): QuestionAuthor => {
  const nickname = Reflect.get(account, "nickname");
  return { uid: account.uid, role: account.role, studentId: account.studentId, nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 24) : null };
};
function summary(question: StoredQuestion): QuestionSummary {
  const { id, classId, title, lessonId, author, createdAt, updatedAt, resolved, resolvedAt, resolvedBy, answerCount } = question;
  return { id, classId, title, lessonId, author, createdAt, updatedAt, resolved, resolvedAt, resolvedBy, answerCount };
}
async function scope(tx: Transaction, account: Account, requested?: string) {
  if (account.role === "student") {
    requireCondition(!requested || requested === account.classId, 403, "FORBIDDEN", "우리 반 질문만 확인할 수 있어요.");
    const classroom = await studentClass(tx, account);
    return { classroom, classrooms: [{ id: classroom.id, name: classroom.name }] };
  }
  const selected = requested ?? account.classIds[0];
  requireCondition(selected && account.classIds.includes(selected), 403, "FORBIDDEN", "담당 반의 질문만 확인할 수 있어요.");
  const snapshots = await tx.getAll(...account.classIds.map(id => admin().db.collection("csClasses").doc(id)));
  const classrooms = snapshots.map(snap => snap.data() as ClassSettings | undefined).filter((value): value is ClassSettings => !!value);
  const classroom = classrooms.find(value => value.id === selected);
  requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 준비되지 않은 반이에요.");
  return { classroom, classrooms: classrooms.map(({ id, name }) => ({ id, name })) };
}
async function storedQuestion(tx: Transaction, account: Account, id: string) {
  const value = (await tx.get(questionRef(id))).data() as StoredQuestion | undefined;
  requireCondition(value, 404, "QUESTION_NOT_FOUND", "질문을 찾을 수 없어요.");
  await scope(tx, account, value.classId);
  return value;
}
async function readAnswers(tx: Transaction, id: string) {
  const snapshot = await tx.get(questionRef(id).collection("answers").orderBy("createdAt").orderBy(FieldPath.documentId()).limit(QUESTION_ANSWER_LIMIT));
  return snapshot.docs.map(doc => doc.data() as QuestionAnswer);
}
async function takeWriteSlot(tx: Transaction, account: Account) {
  const ref = admin().db.collection("csCommunityLimits").doc(account.uid);
  const previous = (await tx.get(ref)).data();
  const now = Date.now(), fresh = !previous || now - previous.start >= 60_000;
  requireCondition(fresh || previous.count < 30, 429, "QUESTION_LIMIT", "질문과 답변을 많이 등록했어요. 잠시 후 다시 시도해 주세요.");
  tx.set(ref, { start: fresh ? now : previous.start, count: fresh ? 1 : previous.count + 1 });
}
export async function readCommunity(classId?: string, after?: string): Promise<CommunityData> {
  if (after) uuid.parse(after);
  return authorized(await identity(), async (tx, account) => {
    const selected = await scope(tx, account, classId);
    let query = admin().db.collection("csQuestions").where("classId", "==", selected.classroom.id).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(51);
    if (after) {
      const cursor = await tx.get(questionRef(after));
      requireCondition(cursor.exists && cursor.data()?.classId === selected.classroom.id, 400, "INVALID_CURSOR", "질문 목록을 처음부터 다시 확인해 주세요.");
      query = query.startAfter(cursor);
    }
    const questions = (await tx.get(query)).docs.map(doc => summary(doc.data() as StoredQuestion));
    return { classroom: { id: selected.classroom.id, name: selected.classroom.name }, classrooms: selected.classrooms, lessons: RELEASED_LESSONS.filter(lesson => selected.classroom.openedLessonIds.includes(lesson.id)).map(({ id, title }) => ({ id, title })), questions: questions.slice(0, 50), nextCursor: questions.length > 50 ? questions[49].id : null };
  });
}
export async function readQuestion(questionId: string): Promise<CommunityQuestion> {
  uuid.parse(questionId);
  return authorized(await identity(), async (tx, account) => {
    const question = await storedQuestion(tx, account, questionId);
    return { ...summary(question), body: question.body, answers: await readAnswers(tx, questionId) };
  });
}
export async function createQuestion(classId: string, payload: unknown): Promise<CommunityQuestion> {
  const input = questionInput.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const selected = await scope(tx, account, classId);
    const ref = questionRef(input.id), previous = (await tx.get(ref)).data() as StoredQuestion | undefined;
    if (previous) {
      requireCondition(previous.author.uid === account.uid && previous.classId === classId && previous.title === input.title && previous.body === input.body && previous.lessonId === input.lessonId, 409, "REQUEST_CHANGED", "이 요청으로 이미 등록한 질문이 있어요. 새 질문으로 다시 등록해 주세요.");
      return { ...summary(previous), body: previous.body, answers: await readAnswers(tx, input.id) };
    }
    requireCondition(!input.lessonId || selected.classroom.openedLessonIds.includes(input.lessonId) && LESSONS.some(lesson => lesson.id === input.lessonId), 400, "LESSON_CLOSED", "우리 반에 열린 수업만 연결할 수 있어요.");
    await takeWriteSlot(tx, account);
    const now = Date.now();
    const question: StoredQuestion = { ...input, classId, author: authorFor(account), createdAt: now, updatedAt: now, resolved: false, resolvedAt: null, resolvedBy: null, answerCount: 0 };
    tx.create(ref, question);
    return { ...question, answers: [] };
  });
}
export async function replyQuestion(questionId: string, payload: unknown): Promise<QuestionReplyResult> {
  uuid.parse(questionId);
  const input = answerInput.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const question = await storedQuestion(tx, account, questionId);
    const ref = questionRef(questionId).collection("answers").doc(input.id);
    const previous = (await tx.get(ref)).data() as QuestionAnswer | undefined;
    if (previous) {
      requireCondition(previous.author.uid === account.uid && previous.body === input.body, 409, "REQUEST_CHANGED", "이 요청으로 이미 등록한 답변이 있어요. 새 답변으로 다시 등록해 주세요.");
      return { question: summary(question), answer: previous };
    }
    requireCondition(question.answerCount < QUESTION_ANSWER_LIMIT, 409, "ANSWER_LIMIT", `한 질문에는 답변을 ${QUESTION_ANSWER_LIMIT}개까지 등록할 수 있어요. 새 질문에서 이어 주세요.`);
    await takeWriteSlot(tx, account);
    const now = Date.now(), answer: QuestionAnswer = { ...input, author: authorFor(account), createdAt: now };
    const next = { ...question, answerCount: question.answerCount + 1, updatedAt: now };
    tx.create(ref, answer);
    tx.update(questionRef(questionId), { answerCount: next.answerCount, updatedAt: now });
    return { question: summary(next), answer };
  });
}
export async function resolveQuestion(questionId: string, payload: unknown): Promise<QuestionSummary> {
  uuid.parse(questionId);
  const input = resolveInput.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const question = await storedQuestion(tx, account, questionId);
    requireCondition(question.author.uid === account.uid || account.role !== "student", 403, "FORBIDDEN", "질문한 학생이나 담당 선생님만 해결 표시를 바꿀 수 있어요.");
    if (question.resolved === input.resolved) return summary(question);
    await takeWriteSlot(tx, account);
    const now = Date.now(), next = { ...question, resolved: input.resolved, resolvedAt: input.resolved ? now : null, resolvedBy: input.resolved ? authorFor(account) : null, updatedAt: now };
    tx.update(questionRef(questionId), { resolved: next.resolved, resolvedAt: next.resolvedAt, resolvedBy: next.resolvedBy, updatedAt: now });
    return summary(next);
  });
}
export async function deleteQuestion(questionId: string, payload: unknown) {
  uuid.parse(questionId);
  deleteInput.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const question = await storedQuestion(tx, account, questionId);
    requireCondition(question.author.uid === account.uid || account.role !== "student", 403, "FORBIDDEN", "작성자와 담당 선생님만 삭제할 수 있어요.");
    const ref = questionRef(questionId);
    const answers = await tx.get(ref.collection("answers"));
    await takeWriteSlot(tx, account);
    answers.docs.forEach(answer => tx.delete(answer.ref));
    tx.delete(ref);
    return { id: questionId };
  });
}
