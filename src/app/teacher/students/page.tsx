import { TeacherDashboardView } from "@/components/teacher/dashboard";
export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ classId?: string; lessonId?: string; studentId?: string }> }) {
  const { classId, lessonId, studentId } = await searchParams;
  return <TeacherDashboardView view="students" classId={classId} lessonId={lessonId} studentId={studentId} />;
}
