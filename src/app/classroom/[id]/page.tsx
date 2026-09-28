import { notFound } from "next/navigation";
import { LESSONS, findLesson } from "@/lib/classroom/catalog";
import { Classroom } from "@/components/classroom";
export function generateStaticParams() {
  return LESSONS.map((item) => ({ id: item.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = findLesson(id);
  if (!lesson) notFound();
  return <Classroom lesson={lesson} />;
}
