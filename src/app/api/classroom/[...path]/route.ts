import { body, failure, json } from "@/lib/server/http";
import { decideReview, getWork, mutateWork, studentDashboard, teacherDashboard, teacherWork, updateClass } from "@/lib/server/classroom";
import { classroomAi } from "@/lib/server/review-ai";
import { resetStudentPassword } from "@/lib/server/auth";
import { readTodos, saveTodos, readSchedule, saveSchedule, refreshScheduleTimetable } from "@/lib/server/planner";
import { clearHelp, raiseHelp, readHelp, readHelpSnapshot } from "@/lib/server/help";
import { createQuestion, readCommunity, readQuestion, replyQuestion, resolveQuestion } from "@/lib/server/community";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params; const query = new URL(request.url).searchParams;
    if (path.length === 1 && path[0] === "community") return json(await readCommunity(query.get("classId") ?? undefined, query.get("after") ?? undefined));
    if (path.length === 2 && path[0] === "community") return json(await readQuestion(path[1]));
    if (path.length === 1 && path[0] === "help") return json(await readHelp(query.get("classId") ?? undefined));
    if (path.length === 2 && path[0] === "help" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await readHelpSnapshot(path[1], query.get("id"), query.get("latest") === "1"));
    if (path.length === 1 && path[0] === "todos") return json(await readTodos());
    if (path.length === 1 && path[0] === "schedule") return json(await readSchedule(query.get("classId") ?? undefined));
    if (path.length === 1 && path[0] === "student") return json(await studentDashboard());
    if (path.length === 1 && path[0] === "teacher") return json(await teacherDashboard(query.get("classId") ?? undefined, query.get("lessonId") ?? undefined));
    if (path.length === 2 && path[0] === "work") return json(await getWork(path[1]));
    if (path.length === 4 && path[0] === "students" && path[2] === "work" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await teacherWork(path[1], path[3]));
    return json({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const input = await body(request, path.length === 2 && path[0] === "work" && (path[1] === "programming-13" || path[1].startsWith("review-")) ? 192000 : 32768);
    if (path.length === 2 && path[0] === "community") return json(await createQuestion(path[1], input));
    if (path.length === 3 && path[0] === "community" && path[2] === "answers") return json(await replyQuestion(path[1], input));
    if (path.length === 3 && path[0] === "community" && path[2] === "resolve") return json(await resolveQuestion(path[1], input));
    if (path.length === 1 && path[0] === "help") return json(await raiseHelp(input));
    if (path.length === 2 && path[0] === "help" && path[1] === "cancel") return json(await clearHelp(undefined, input));
    if (path.length === 3 && path[0] === "help" && path[2] === "resolve" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await clearHelp(path[1], input));
    if (path.length === 1 && path[0] === "ai") return json(await classroomAi(input));
    if (path.length === 4 && path[0] === "students" && path[2] === "review" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await decideReview(path[1], path[3], input));
    if (path.length === 1 && path[0] === "todos") return json(await saveTodos(input));
    if (path.length === 2 && path[0] === "schedule" && /^2-(?:[1-9]|1[01])$/.test(path[1])) return json(await saveSchedule(path[1], input));
    if (path.length === 2 && path[0] === "timetable" && /^2-(?:[1-9]|1[01])$/.test(path[1])) return json(await refreshScheduleTimetable(path[1], input));
    if (path.length === 2 && path[0] === "classes") return json(await updateClass(path[1], input));
    if (path.length === 3 && path[0] === "students" && path[2] === "reset" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await resetStudentPassword(path[1]));
    if (path.length === 2 && path[0] === "work") return json(await mutateWork(path[1], input, false));
    if (path.length === 3 && path[0] === "work" && path[2] === "action") return json(await mutateWork(path[1], input, true));
    return json({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404);
  } catch (error) { return failure(error); }
}
