"use client";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { LessonWorkspace } from "@/components/student/lesson-workspace";
import type { Lesson } from "@/lib/classroom/types";
export function Classroom({ lesson }: { lesson: Lesson | null }) {
  const { session } = useSession();
  return <AppShell title="수업 공간">{lesson && session?.role === "student" && !session.mustChangePassword && <LessonWorkspace key={`${session.uid}:${lesson.id}`} lesson={lesson} uid={session.uid} />}</AppShell>;
}
