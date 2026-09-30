import { TeacherDashboardView } from "@/components/teacher/dashboard";
export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;
  return <TeacherDashboardView view="classes" classId={classId} />;
}
