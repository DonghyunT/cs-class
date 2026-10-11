"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionAccess } from "@/components/session-access";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { LESSONS } from "@/lib/classroom/catalog";
import type { Lesson, Stage, WorkDraft } from "@/lib/classroom/types";
import { LessonEditor, type LessonFrame } from "../student/lesson-editor";
import { LessonShell } from "../student/lesson-shell";
import { readEntryDraft } from "../student/read-editor-draft";
import { usePreviewWork } from "./use-preview-work";

export function LessonPreview({ lesson, classId, uid }: { lesson: Lesson; classId: string; uid: string }) {
  const { session } = useSession();
  const [version, setVersion] = useState(0);
  return <SessionAccess teacher>{session?.uid === uid && <PreviewWorkspace key={`${uid}:${classId}:${lesson.id}:${version}`} lesson={lesson} classId={classId} uid={uid} restoreResetFocus={version > 0} reset={() => setVersion(value => value + 1)} />}</SessionAccess>;
}

function PreviewWorkspace({ lesson, classId, uid, reset, restoreResetFocus }: { lesson: Lesson; classId: string; uid: string; reset: () => void; restoreResetFocus: boolean }) {
  const router = useRouter();
  const exportRef = useRef<(() => Promise<string | null>) | null>(null);
  const readEditorDraft = useCallback((current: WorkDraft) => exportRef.current ? readEntryDraft(lesson, current, exportRef.current) : Promise.resolve(current), [lesson]);
  const controller = usePreviewWork(lesson, classId, uid, lesson.practice.type === "entryjs" || lesson.practice.type === "programming" ? readEditorDraft : undefined);
  const [initial] = useState(() => controller.work);
  const resetButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (restoreResetFocus) resetButton.current?.focus({ preventScroll: true }); }, [restoreResetFocus]);
  const [frame, setFrame] = useState<LessonFrame | null>(null);
  const [view, setView] = useState<{ stage: Stage; wide: boolean; focused: boolean }>({ stage: "concept", wide: false, focused: false });
  const reportStage = useCallback((stage: Stage) => setView(current => current.stage === stage ? current : { ...current, stage }), []);
  const canExpand = lesson.practice.type !== "ordering";
  const workspaceWide = canExpand && view.stage === "practice" && view.wide;
  const practiceFocused = canExpand && view.stage === "practice" && view.focused;
  const controls = <><label>체험 수업<select aria-label="체험 수업" value={lesson.id} disabled={controller.busy} onChange={event => router.push(`/teacher/preview/${encodeURIComponent(event.target.value)}?classId=${encodeURIComponent(classId)}`)}>{LESSONS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><Button ref={resetButton} variant="outline" disabled={controller.busy} onClick={reset}>체험 초기화</Button></>;
  return <LessonShell lesson={lesson} returnOrigin="lessons" workspaceWide={workspaceWide} practiceFocused={practiceFocused} practiceActive={view.stage === "practice"} onPracticeFocusedChange={focused => setView(current => ({ ...current, focused }))} preview={{ classId, controls }} saveLabel={frame?.saveLabel ?? "이 창에서 체험 중"} learningStatus={frame?.learningStatus} navigation={frame?.navigation} focusRequest={frame?.focusRequest}>
    <LessonEditor lesson={lesson} initial={initial} controller={controller} entryExport={exportRef} mode="preview" returnOrigin="lessons" workspaceWide={workspaceWide} practiceFocused={practiceFocused} onPracticeFocusedChange={focused => setView(current => ({ ...current, focused }))} onWorkspaceWideChange={wide => setView(current => ({ ...current, wide }))} onWorkspaceStageChange={reportStage} onFrameChange={setFrame} />
  </LessonShell>;
}
