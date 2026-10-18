import { body, failure, failureResponse, json } from "@/lib/server/http";
import { decideReview, getWork, mutateWork, studentClassroom, studentDashboard, teacherDashboard, teacherWork, updateClass } from "@/lib/server/classroom";
import { classroomAi } from "@/lib/server/review-ai";
import { resetStudentPassword } from "@/lib/server/auth";
import { readTodos, saveTodos, readSchedule, saveSchedule, refreshScheduleTimetable } from "@/lib/server/planner";
import { clearHelp, raiseHelp, readHelp, readHelpSnapshot } from "@/lib/server/help";
import { createQuestion, deleteQuestion, readCommunity, readQuestion, replyQuestion, resolveQuestion } from "@/lib/server/community";
import type { FailureOperation } from "@/lib/server/failure-log";
import { CLASSROOM_HELP_ENABLED } from "@/lib/classroom/features";
import { requireCondition } from "@/lib/server/errors";
import { findLesson } from "@/lib/classroom/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  let operation: FailureOperation = "classroom.request";
  try {
    const { path } = await context.params; const query = new URL(request.url).searchParams;
    requireCondition(path[0] !== "help" || CLASSROOM_HELP_ENABLED, 403, "HELP_DISABLED", "손들기는 잠시 사용하지 않아요.");
    if (path.length === 1 && path[0] === "community") { operation = "classroom.community.list"; return json(await readCommunity(query.get("classId") ?? undefined, query.get("after") ?? undefined)); }
    if (path.length === 2 && path[0] === "community") { operation = "classroom.community.read"; return json(await readQuestion(path[1])); }
    if (path.length === 1 && path[0] === "help") { operation = "classroom.help.list"; return json(await readHelp(query.get("classId") ?? undefined)); }
    if (path.length === 2 && path[0] === "help" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) { operation = "classroom.help.snapshot"; return json(await readHelpSnapshot(path[1], query.get("id"), query.get("latest") === "1")); }
    if (path.length === 1 && path[0] === "todos") { operation = "classroom.todos.read"; return json(await readTodos()); }
    if (path.length === 1 && path[0] === "schedule") { operation = "classroom.schedule.read"; return json(await readSchedule(query.get("classId") ?? undefined)); }
    if (path.length === 1 && path[0] === "student") { operation = "classroom.student.dashboard"; return json(await studentDashboard()); }
    if (path.length === 2 && path[0] === "student" && path[1] === "class") { operation = "classroom.student.dashboard"; return json(await studentClassroom()); }
    if (path.length === 1 && path[0] === "teacher") { operation = "classroom.teacher.dashboard"; return json(await teacherDashboard(query.get("classId") ?? undefined, query.get("lessonId") ?? undefined)); }
    if (path.length === 2 && path[0] === "work") { operation = "classroom.work.read"; return json(await getWork(path[1])); }
    if (path.length === 4 && path[0] === "students" && path[2] === "work" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) { operation = "classroom.teacher.work.read"; return json(await teacherWork(path[1], path[3])); }
    return failureResponse({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404, { operation });
  } catch (error) { return failure(error, { operation }); }
}
export async function POST(request: Request, context: Context) {
  let operation: FailureOperation = "classroom.request";
  try {
    const { path } = await context.params;
    requireCondition(path[0] !== "help" || CLASSROOM_HELP_ENABLED, 403, "HELP_DISABLED", "손들기는 잠시 사용하지 않아요.");
    // Entry lessons send every mission's project in one draft.
    const input = await body(request, path.length === 2 && path[0] === "work" && (findLesson(path[1])?.practice.type === "programming" || path[1].startsWith("review-")) ? 192000 : 32768);
    if (path.length === 2 && path[0] === "community") { operation = "classroom.community.create"; return json(await createQuestion(path[1], input)); }
    if (path.length === 3 && path[0] === "community" && path[2] === "answers") { operation = "classroom.community.reply"; return json(await replyQuestion(path[1], input)); }
    if (path.length === 3 && path[0] === "community" && path[2] === "resolve") { operation = "classroom.community.resolve"; return json(await resolveQuestion(path[1], input)); }
    if (path.length === 3 && path[0] === "community" && path[2] === "delete") { operation = "classroom.community.delete"; return json(await deleteQuestion(path[1], input)); }
    if (path.length === 1 && path[0] === "help") { operation = "classroom.help.raise"; return json(await raiseHelp(input)); }
    if (path.length === 2 && path[0] === "help" && path[1] === "cancel") { operation = "classroom.help.cancel"; return json(await clearHelp(undefined, input)); }
    if (path.length === 3 && path[0] === "help" && path[2] === "resolve" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) { operation = "classroom.help.resolve"; return json(await clearHelp(path[1], input)); }
    if (path.length === 1 && path[0] === "ai") { operation = "classroom.ai"; return json(await classroomAi(input)); }
    if (path.length === 4 && path[0] === "students" && path[2] === "review" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) { operation = "classroom.review.decide"; return json(await decideReview(path[1], path[3], input)); }
    if (path.length === 1 && path[0] === "todos") { operation = "classroom.todos.save"; return json(await saveTodos(input)); }
    if (path.length === 2 && path[0] === "schedule" && /^2-(?:[1-9]|1[01])$/.test(path[1])) { operation = "classroom.schedule.save"; return json(await saveSchedule(path[1], input)); }
    if (path.length === 2 && path[0] === "timetable" && /^2-(?:[1-9]|1[01])$/.test(path[1])) { operation = "classroom.timetable.refresh"; return json(await refreshScheduleTimetable(path[1], input)); }
    if (path.length === 2 && path[0] === "classes") { operation = "classroom.classes.update"; return json(await updateClass(path[1], input)); }
    if (path.length === 3 && path[0] === "students" && path[2] === "reset" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) { operation = "classroom.student.password.reset"; return json(await resetStudentPassword(path[1])); }
    if (path.length === 2 && path[0] === "work") { operation = "classroom.work.save"; return json(await mutateWork(path[1], input, false)); }
    if (path.length === 3 && path[0] === "work" && path[2] === "action") { operation = "classroom.work.action"; return json(await mutateWork(path[1], input, true)); }
    return failureResponse({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404, { operation });
  } catch (error) { return failure(error, { operation }); }
}
