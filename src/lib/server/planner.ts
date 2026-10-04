import "server-only";
import { z } from "zod";
import type { Transaction } from "firebase-admin/firestore";
import type { ClassSettings } from "../classroom/types";
import { PLANNER_LIMIT, type ClassEvent, type SavedList, type ScheduleData, type Todo } from "../classroom/planner";
import { LESSONS } from "../classroom/catalog";
import { authorized, identity, type Account } from "./auth";
import { admin } from "./firebase";
import { requireCondition } from "./errors";
import { revisionSchema } from "./learning";
import { readClassTimetable, refreshTimetable } from "./timetable";

const id = z.string().uuid();
const todo = z.object({ id, text: z.string().trim().min(1).max(180), completed: z.boolean() }).strict();
const event = z.object({ id, title: z.string().trim().min(1).max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return value >= "2000-01-01" && value <= "2100-12-31" && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}), lessonId: z.string().max(80).nullable() }).strict();
const todosSchema = z.object({ revision: revisionSchema, items: z.array(todo).max(PLANNER_LIMIT) }).strict();
const eventsSchema = z.object({ revision: revisionSchema, items: z.array(event).max(PLANNER_LIMIT) }).strict();

function saveList<T extends { id: string }>(tx: Transaction, ref: FirebaseFirestore.DocumentReference, previous: SavedList<T>, next: SavedList<T>) {
  requireCondition(new Set(next.items.map((item) => item.id)).size === next.items.length, 400, "INVALID", "중복된 항목은 저장할 수 없어요.");
  // A lost acknowledgement can be retried without duplicating items or revisions.
  if (previous.items.length === next.items.length && previous.items.every((item, index) => Object.entries(next.items[index]).every(([key, value]) => Reflect.get(item, key) === value))) return previous;
  requireCondition(previous.revision === next.revision, 409, "REVISION_CONFLICT", "다른 화면에서 목록이 바뀌었어요. 최신 기록을 확인한 뒤 내 변경을 다시 저장해 주세요.");
  const saved = { revision: previous.revision + 1, items: next.items };
  tx.set(ref, saved);
  return saved;
}
export async function readTodos(): Promise<SavedList<Todo>> {
  return authorized(await identity(), async (tx, account) => {
    const value = (await tx.get(admin().db.collection("csTodos").doc(account.uid))).data();
    return value as SavedList<Todo> | undefined ?? { revision: 0, items: [] };
  });
}
export async function saveTodos(payload: unknown) {
  const next = todosSchema.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    const ref = admin().db.collection("csTodos").doc(account.uid);
    const previous = (await tx.get(ref)).data() as SavedList<Todo> | undefined ?? { revision: 0, items: [] };
    return saveList(tx, ref, previous, next);
  });
}
async function scheduleScope(tx: Transaction, account: Account, requested?: string): Promise<Pick<ScheduleData, "classroom" | "classrooms" | "lessons">> {
  const allowed = account.role === "student" ? [account.classId].filter((value): value is string => !!value) : account.classIds;
  const selected = requested ?? allowed[0];
  requireCondition(selected && allowed.includes(selected), 403, "FORBIDDEN", "본인 반이나 담당 반의 일정만 확인할 수 있어요.");
  const snapshots = await tx.getAll(...allowed.map((classId) => admin().db.collection("csClasses").doc(classId)));
  const classrooms = snapshots.map((snap) => snap.data() as ClassSettings | undefined).filter((value): value is ClassSettings => !!value);
  const classroom = classrooms.find((value) => value.id === selected);
  requireCondition(classroom, 404, "CLASS_NOT_FOUND", "아직 준비되지 않은 반이에요.");
  return { classroom: { id: classroom.id, name: classroom.name }, classrooms: classrooms.map(({ id, name }) => ({ id, name })), lessons: LESSONS.filter((value) => classroom.openedLessonIds.includes(value.id)).map(({ id, title }) => ({ id, title })) };
}
export async function readSchedule(classId?: string): Promise<ScheduleData> {
  return authorized(await identity(), async (tx, account) => {
    const scope = await scheduleScope(tx, account, classId);
    const value = (await tx.get(admin().db.collection("csSchedules").doc(scope.classroom.id))).data() as SavedList<ClassEvent> | undefined;
    return { ...scope, ...(value ?? { revision: 0, items: [] }), timetable: await readClassTimetable(tx, scope.classroom.id) };
  });
}
export async function saveSchedule(classId: string, payload: unknown) {
  const next = eventsSchema.parse(payload);
  return authorized(await identity(), async (tx, account) => {
    requireCondition(account.role !== "student", 403, "FORBIDDEN", "일정은 담당 선생님이 관리해요.");
    const scope = await scheduleScope(tx, account, classId);
    requireCondition(next.items.every((item) => !item.lessonId || scope.lessons.some((lesson) => lesson.id === item.lessonId)), 400, "INVALID_LESSON", "담당 반에 열린 수업만 연결할 수 있어요.");
    const ref = admin().db.collection("csSchedules").doc(scope.classroom.id);
    const previous = (await tx.get(ref)).data() as SavedList<ClassEvent> | undefined ?? { revision: 0, items: [] };
    const timetable = await readClassTimetable(tx, scope.classroom.id);
    return { ...scope, ...saveList(tx, ref, previous, next), timetable };
  });
}
export async function refreshScheduleTimetable(classId: string, payload: unknown) {
  z.object({}).strict().parse(payload);
  await authorized(await identity(), async (tx, account) => {
    requireCondition(account.role !== "student", 403, "FORBIDDEN", "시간표 갱신은 담당 선생님이 관리해요.");
    await scheduleScope(tx, account, classId);
  });
  await refreshTimetable();
  return readSchedule(classId);
}
