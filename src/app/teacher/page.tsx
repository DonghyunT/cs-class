import { DashboardScreen } from "@/components/dashboard/dashboard";

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;
  return <DashboardScreen teacher classId={classId} />;
}
