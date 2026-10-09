import { notFound, redirect } from "next/navigation";
import { LessonPreview } from "@/components/teacher/lesson-preview";
import { ServiceError } from "@/lib/server/errors";
import { authorizeTeacherPreview } from "@/lib/server/teacher-preview";

export default async function TeacherPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ classId?: string | string[] }> }) {
  const { id } = await params;
  const { classId } = await searchParams;
  if (Array.isArray(classId)) notFound();
  let preview;
  try { preview = await authorizeTeacherPreview(classId, id); }
  catch (error) {
    if (error instanceof ServiceError && error.status === 401) redirect("/login/teacher");
    if (error instanceof ServiceError && error.status === 403) redirect("/teacher/classes");
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }
  if (!preview.lesson) notFound();
  return <LessonPreview lesson={preview.lesson} classId={preview.classId} uid={preview.uid} />;
}
