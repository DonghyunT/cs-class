import { ScheduleScreen } from "@/components/dashboard/schedule";
export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;
  return <ScheduleScreen teacher classId={classId} />;
}
