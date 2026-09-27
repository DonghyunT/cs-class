import { notFound } from "next/navigation";
import { lessons } from "@/lib/demo-data";
import { Classroom } from "@/components/classroom";
export function generateStaticParams() {
  return lessons.map((item) => ({ id: item.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) notFound();
  return <Classroom lesson={lesson} />;
}
