import { notFound } from "next/navigation";
import { findLesson } from "@/lib/classroom/catalog";
import { Classroom } from "@/components/classroom";
import { getWork } from "@/lib/server/classroom";
import { isConfigured } from "@/lib/server/firebase";
import { ServiceError } from "@/lib/server/errors";
import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = findLesson(id);
  if (!lesson) notFound();
  if (!isConfigured()) return <Classroom lesson={null} />;
  try { await getWork(id); }
  catch (error) {
    if (error instanceof ServiceError && error.status === 401) redirect("/login/student");
    if (error instanceof ServiceError && error.status === 403) redirect("/student");
    throw error;
  }
  return <Classroom lesson={lesson} />;
}
