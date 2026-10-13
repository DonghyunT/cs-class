"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classroomApi } from "@/lib/classroom/client";
import type { Lesson, StudentDashboard, Work, WorkDraft } from "@/lib/classroom/types";
import { LessonShell } from "./lesson-shell";
import { LessonEditor, type LessonFrame, type WorkspaceView } from "./lesson-editor";
import { readEntryDraft } from "./read-editor-draft";
import { useWork } from "./use-work";
import styles from "./student.module.css";

export function LessonWorkspace({ lesson, uid, returnOrigin, workspaceWide, practiceFocused, onPracticeFocusedChange, onWorkspaceWideChange, onWorkspaceStageChange }: { lesson: Lesson; uid: string } & WorkspaceView) {
  const [frame, setFrame] = useState<LessonFrame | null>(null);
  const [initial, setInitial] = useState<Work | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void classroomApi.work(lesson.id).then((work) => { if (!cancelled) { setInitial(work); setError(""); } }).catch((problem) => { if (!cancelled) setError(problem instanceof Error ? problem.message : "수업을 불러오지 못했어요."); });
    return () => { cancelled = true; };
  }, [attempt, lesson.id]);
  useEffect(() => {
    let cancelled = false;
    let fetching = false;
    const refresh = async () => {
      if (fetching || document.visibilityState !== "visible") return;
      fetching = true;
      try { const value = await classroomApi.student(); if (!cancelled) setDashboard(value); }
      catch { /* Work requests show actionable errors; a failed announcement refresh does not replace an editor. */ }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    const focused = () => { void refresh(); };
    window.addEventListener("focus", focused);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("focus", focused); };
  }, []);
  const otherCurrent = dashboard?.lessons.find((item) => item.id === dashboard.classroom.currentLessonId && item.id !== lesson.id);
  return <LessonShell lesson={lesson} returnOrigin={returnOrigin} workspaceWide={workspaceWide} practiceFocused={practiceFocused} practiceActive={frame?.stage === "practice"} onPracticeFocusedChange={onPracticeFocusedChange} saveLabel={frame?.saveLabel ?? (error ? "학습 기록 확인 필요" : "학습 불러오는 중…")} save={frame?.save} saveDisabled={frame?.saveDisabled} learningStatus={frame?.learningStatus} navigation={frame?.navigation} otherCurrent={otherCurrent} focusRequest={frame?.focusRequest}>
    {initial ? <StudentWorkEditor lesson={lesson} initial={initial} uid={uid} returnOrigin={returnOrigin} workspaceWide={workspaceWide} practiceFocused={practiceFocused} onPracticeFocusedChange={onPracticeFocusedChange} onWorkspaceWideChange={onWorkspaceWideChange} onWorkspaceStageChange={onWorkspaceStageChange} onFrameChange={setFrame} /> : error ? <div className={styles.empty} role="alert"><h2>수업을 불러오지 못했어요.</h2><p>{error}</p><Button onClick={() => setAttempt(value => value + 1)}>다시 불러오기</Button></div> : <div className={styles.loading} role="status"><BookOpen />저장된 학습을 불러오고 있어요.</div>}
  </LessonShell>;
}


const StudentWorkEditor = memo(function StudentWorkEditor({ lesson, initial, uid, ...view }: { lesson: Lesson; initial: Work; uid: string; onFrameChange: (frame: LessonFrame) => void } & WorkspaceView) {
  const entryExport = useRef<(() => Promise<string | null>) | null>(null);
  const readEditorDraft = useCallback((current: WorkDraft) => {
    if (entryExport.current) return readEntryDraft(lesson, current, entryExport.current);
    return Promise.resolve(current);
  }, [lesson]);
  const controller = useWork(initial, uid, lesson.practice.type === "entryjs" || lesson.practice.type === "programming" ? readEditorDraft : undefined);
  return <LessonEditor lesson={lesson} initial={initial} controller={controller} entryExport={entryExport} {...view} />;
});
