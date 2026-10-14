import "server-only";
import { z } from "zod";
import { findLesson } from "../classroom/catalog";
import type { HelpRequest, HelpSnapshot } from "../classroom/help";
import { authorized, identity } from "./auth";
import { studentClass, toWork, workRef } from "./classroom";
import { requireCondition } from "./errors";
import { admin } from "./firebase";

const requestRef = (uid: string) => admin().db.collection("csHelpRequests").doc(uid);
const snapshotRef = (uid: string) => admin().db.collection("csHelpSnapshots").doc(uid);
const requestId = z.string().uuid();

export async function readHelp(classId?: string) {
  return authorized(await identity(), async (tx, account) => {
    if (account.role === "student") {
      const classroom = await studentClass(tx, account);
      requireCondition(!classId || classId === classroom.id, 403, "FORBIDDEN", "우리 반의 도움 요청만 확인할 수 있어요.");
      const request = (await tx.get(requestRef(account.uid))).data() as HelpRequest | undefined;
      return { request: request?.classId === classroom.id && request.status === "pending" ? request : null };
    }
    requireCondition(classId && account.classIds.includes(classId), 403, "FORBIDDEN", "담당 반의 도움 요청만 확인할 수 있어요.");
    const result = await tx.get(admin().db.collection("csHelpRequests").where("classId", "==", classId).where("status", "==", "pending"));
    const pending = result.docs.map(doc => doc.data() as HelpRequest).filter(item => item.status === "pending");
    const accounts = pending.length ? await tx.getAll(...pending.map(item => admin().db.collection("csAccounts").doc(item.uid))) : [];
    const requests = pending.filter((item, index) => { const student = accounts[index].data(); return student?.role === "student" && !student.disabled && student.classId === classId; }).sort((a, b) => a.requestedAt - b.requestedAt);
    return { requests };
  });
}

export async function raiseHelp(payload: unknown) {
  const input = z.object({ id: requestId, lessonId: z.string().min(1).max(80) }).strict().parse(payload);
  const lesson = findLesson(input.lessonId); requireCondition(lesson, 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
  return authorized(await identity(), async (tx, account) => {
    const classroom = await studentClass(tx, account);
    const previous = (await tx.get(requestRef(account.uid))).data() as HelpRequest | undefined;
    if (previous?.id === input.id) {
      requireCondition(previous.lessonId === input.lessonId && previous.classId === classroom.id, 409, "REQUEST_CHANGED", "이 요청 번호는 이미 사용했어요.");
      return { request: previous };
    }
    const receiptRef = requestRef(account.uid).collection("ids").doc(input.id);
    const receipt = await tx.get(receiptRef);
    requireCondition(!receipt.exists, 409, "REQUEST_CHANGED", "도움 요청이 바뀌었어요. 현재 요청을 다시 확인해 주세요.");
    requireCondition(classroom.openedLessonIds.includes(lesson.id), 403, "LESSON_CLOSED", "우리 반에 열린 수업에서 손들 수 있어요.");
    const work = toWork((await tx.get(workRef(account.uid, lesson.id))).data() as Parameters<typeof toWork>[0], lesson.id);
    const limitRef = admin().db.collection("csHelpLimits").doc(account.uid);
    const limit = (await tx.get(limitRef)).data() as { startedAt: number; count: number } | undefined;
    const now = Date.now(), count = limit && now - limit.startedAt < 60_000 ? limit.count : 0;
    requireCondition(count < 10, 429, "HELP_LIMIT", "잠시 기다린 뒤 다시 손들어 주세요.");
    const request: HelpRequest = { id: input.id, uid: account.uid, studentId: account.studentId!, ...(account.nickname ? { nickname: account.nickname } : {}), classId: classroom.id, lessonId: lesson.id, stage: work.draft.stage, mission: work.draft.programming?.mission ?? (work.draft.reviewProject?.type === "flowchart" ? work.draft.reviewProject.mission : null), requestedAt: now, revision: work.revision, status: "pending" };
    tx.set(limitRef, { startedAt: count ? limit!.startedAt : now, count: count + 1 });
    tx.set(receiptRef, { requestedAt: now });
    tx.set(requestRef(account.uid), request);
    tx.set(snapshotRef(account.uid), { id: request.id, classId: classroom.id, work, snapshotAt: now });
    return { request };
  });
}

export async function clearHelp(uid: string | undefined, payload: unknown) {
  const input = z.object({ id: requestId }).strict().parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const target = uid ?? account.uid;
    requireCondition(uid ? account.role !== "student" : account.role === "student", 403, "FORBIDDEN", "이 도움 요청을 처리할 수 없어요.");
    const request = (await tx.get(requestRef(target))).data() as HelpRequest | undefined;
    requireCondition(request && (uid ? account.classIds.includes(request.classId) : request.uid === account.uid && request.classId === account.classId), 403, "FORBIDDEN", "이 도움 요청을 처리할 수 없어요.");
    if (uid) {
      const student = (await tx.get(admin().db.collection("csAccounts").doc(target))).data();
      requireCondition(student?.role === "student" && !student.disabled && student.classId === request.classId, 403, "FORBIDDEN", "현재 담당 반에 있는 학생의 도움 요청만 처리할 수 있어요.");
    }
    requireCondition(request.id === input.id, 409, "REQUEST_CHANGED", "새 도움 요청이 들어왔어요. 목록을 다시 확인해 주세요.");
    if (request.status !== "pending") return { request };
    const next: HelpRequest = { ...request, status: uid ? "resolved" : "cancelled" };
    tx.set(requestRef(target), next); tx.delete(snapshotRef(target));
    return { request: next };
  });
}

export async function readHelpSnapshot(uid: string, id: string | null, latest: boolean): Promise<HelpSnapshot> {
  const selectedId = requestId.parse(id);
  return authorized(await identity(), async (tx, account) => {
    requireCondition(account.role !== "student", 403, "FORBIDDEN", "선생님만 학생의 저장본을 확인할 수 있어요.");
    const request = (await tx.get(requestRef(uid))).data() as HelpRequest | undefined;
    requireCondition(request && account.classIds.includes(request.classId), 403, "FORBIDDEN", "담당 반의 도움 요청만 확인할 수 있어요.");
    const student = (await tx.get(admin().db.collection("csAccounts").doc(uid))).data();
    requireCondition(student?.role === "student" && !student.disabled && student.classId === request.classId, 403, "FORBIDDEN", "현재 담당 반에 있는 학생만 확인할 수 있어요.");
    requireCondition(request.status === "pending" && request.id === selectedId, 409, "REQUEST_CHANGED", "도움 요청이 바뀌었어요. 목록을 다시 확인해 주세요.");
    const lesson = findLesson(request.lessonId); requireCondition(lesson, 404, "NOT_FOUND", "수업을 찾을 수 없어요.");
    if (latest) {
      const work = toWork((await tx.get(workRef(uid, lesson.id))).data() as Parameters<typeof toWork>[0], lesson.id);
      return { request, lesson, work, snapshotAt: work.updatedAt ?? request.requestedAt, latest: true };
    }
    const saved = (await tx.get(snapshotRef(uid))).data() as { id: string; classId: string; work: HelpSnapshot["work"]; snapshotAt: number } | undefined;
    requireCondition(saved?.id === selectedId && saved.classId === request.classId, 409, "REQUEST_CHANGED", "저장본이 바뀌었어요. 목록을 다시 확인해 주세요.");
    return { request, lesson, work: saved.work, snapshotAt: saved.snapshotAt, latest: false };
  });
}
