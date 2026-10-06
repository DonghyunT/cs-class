"use client";
import { useCallback, useState } from "react";
import { SessionAccess } from "@/components/session-access";
import type { LessonOrigin } from "@/components/student/lesson-shell";
import { useSession } from "@/components/session-provider";
import { LessonWorkspace } from "@/components/student/lesson-workspace";
import type { Lesson, Stage } from "@/lib/classroom/types";
export function Classroom({ lesson, returnOrigin = "lessons" }: { lesson: Lesson | null; returnOrigin?: LessonOrigin }) {
  const { session } = useSession();
  const workspaceId = lesson && session ? `${session.uid}:${lesson.id}` : null;
  const [view, setView] = useState<{ id: string | null; stage: Stage | null; wide: boolean }>({ id: null, stage: null, wide: false });
  const reportStage = useCallback((stage: Stage) => setView(current => current.id === workspaceId && current.stage === stage ? current : { id: workspaceId, stage, wide: current.id === workspaceId ? current.wide : false }), [workspaceId]);
  const canWiden = lesson?.practice.type === "entryjs" || lesson?.practice.type === "programming" || lesson?.practice.type === "sandwich" || lesson?.practice.type === "abstraction" || lesson?.practice.type === "flowchart";
  const workspaceWide = !!workspaceId && canWiden && view.id === workspaceId && view.stage === "practice" && view.wide;
  const workspace = lesson && session?.role === "student" && !session.mustChangePassword && <LessonWorkspace key={workspaceId} lesson={lesson} uid={session.uid} returnOrigin={returnOrigin} workspaceWide={workspaceWide} onWorkspaceStageChange={reportStage} onWorkspaceWideChange={(wide) => setView(current => ({ ...current, wide }))} />;
  return <SessionAccess>{workspace}</SessionAccess>;
}
