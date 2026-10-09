import { TeacherDashboardView } from "@/components/teacher/dashboard";
export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ classId?: string | string[]; manage?: string | string[] }> }) {
  const { classId, manage } = await searchParams;
  const selectedClassId = typeof classId === "string" ? classId : undefined;
  return <TeacherDashboardView view="classes" classId={selectedClassId} manage={Boolean(selectedClassId && manage === "1")} />;
}
