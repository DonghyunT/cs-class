import { body, failure, json } from "@/lib/server/http";
import { getWork, mutateWork, studentDashboard, teacherDashboard, updateClass } from "@/lib/server/classroom";
import { resetStudentPassword } from "@/lib/server/auth";
import { readTodos, saveTodos, readSchedule, saveSchedule } from "@/lib/server/planner";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params; const query = new URL(request.url).searchParams;
    if (path.length === 1 && path[0] === "todos") return json(await readTodos());
    if (path.length === 1 && path[0] === "schedule") return json(await readSchedule(query.get("classId") ?? undefined));
    if (path.length === 1 && path[0] === "student") return json(await studentDashboard());
    if (path.length === 1 && path[0] === "teacher") return json(await teacherDashboard(query.get("classId") ?? undefined, query.get("lessonId") ?? undefined));
    if (path.length === 2 && path[0] === "work") return json(await getWork(path[1]));
    return json({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const input = await body(request); const { path } = await context.params;
    if (path.length === 1 && path[0] === "todos") return json(await saveTodos(input));
    if (path.length === 2 && path[0] === "schedule" && /^2-(?:[1-9]|1[01])$/.test(path[1])) return json(await saveSchedule(path[1], input));
    if (path.length === 2 && path[0] === "classes") return json(await updateClass(path[1], input));
    if (path.length === 3 && path[0] === "students" && path[2] === "reset" && /^[a-zA-Z0-9_-]{1,128}$/.test(path[1])) return json(await resetStudentPassword(path[1]));
    if (path.length === 2 && path[0] === "work") return json(await mutateWork(path[1], input, false));
    if (path.length === 3 && path[0] === "work" && path[2] === "action") return json(await mutateWork(path[1], input, true));
    return json({ code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." }, 404);
  } catch (error) { return failure(error); }
}
