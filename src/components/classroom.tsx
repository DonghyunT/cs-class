"use client";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { LessonWorkspace } from "@/components/student/lesson-workspace";
import type { Lesson } from "@/lib/classroom/types";
export function Classroom({ lesson }: { lesson: Lesson | null }) {
  const { session } = useSession();
  const workspaceId = lesson && session ? `${session.uid}:${lesson.id}` : null;
  const [wideWorkspace, setWideWorkspace] = useState<string | null>(null);
  const workspaceWide = !!workspaceId && wideWorkspace === workspaceId;
  return <AppShell title="수업 공간" workspaceWide={workspaceWide}>{lesson && session?.role === "student" && !session.mustChangePassword && <LessonWorkspace key={workspaceId} lesson={lesson} uid={session.uid} workspaceWide={workspaceWide} onWorkspaceWideChange={(wide) => setWideWorkspace(wide ? workspaceId : null)} />}</AppShell>;
}
