import { TeacherAssessmentView } from "@/components/teacher/assessment";
export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ classId?: string | string[] }> }) {
  const { classId } = await searchParams;
  return <TeacherAssessmentView classId={typeof classId === "string" ? classId : undefined} />;
}
