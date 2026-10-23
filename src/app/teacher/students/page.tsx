import { TeacherDashboardView } from "@/components/teacher/dashboard";
import { STATUS_LABELS } from "@/lib/classroom/progress";
export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const classId = first("classId"), lessonId = first("lessonId"), studentId = first("studentId"), q = first("q"), password = first("password"), review = first("review"), status = first("status");
  return <TeacherDashboardView view="students" classId={classId} lessonId={lessonId} studentId={studentId} q={q} password={password === "required" ? "required" : undefined} review={review === "pending" ? "pending" : undefined} status={status && Object.hasOwn(STATUS_LABELS, status) ? status : undefined} />;
}
