import { CommunityScreen } from "@/components/community/community";
export default async function TeacherCommunity({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;
  return <CommunityScreen teacher classId={classId} />;
}
