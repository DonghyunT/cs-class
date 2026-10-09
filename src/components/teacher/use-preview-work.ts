"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session-provider";
import { classroomApi } from "@/lib/classroom/client";
import { emptyWork } from "@/lib/classroom/progress";
import type { Lesson, WorkAction, WorkDraft } from "@/lib/classroom/types";
import type { WorkController } from "../student/work-controller";

export function usePreviewWork(lesson: Lesson, classId: string, uid: string, readEditorDraft?: (draft: WorkDraft) => Promise<WorkDraft>): WorkController {
  const { session } = useSession();
  const [work, setWork] = useState(() => emptyWork(lesson));
  const [draft, setDraft] = useState(work.draft);
  const local = useRef(draft), memory = useRef(work), active = useRef(true), busyRef = useRef(false);
  const currentUid = useRef(session?.uid);
  useEffect(() => { currentUid.current = session?.uid; }, [session?.uid]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [actionFailure, setActionFailure] = useState<WorkController["actionFailure"]>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const available = useCallback(() => active.current && currentUid.current === uid, [uid]);
  const update = useCallback((next: WorkDraft) => {
    if (!available()) return;
    local.current = next; setDraft(next); setActionFailure(null);
  }, [available]);
  const flush = useCallback(async (captureEditor = false): Promise<boolean> => {
    if (!available()) return false;
    try {
      const next = captureEditor && readEditorDraft ? await readEditorDraft(local.current) : local.current;
      if (!available()) return false;
      local.current = next; setDraft(next);
      memory.current = { ...memory.current, draft: next }; setWork(memory.current); setError("");
      return true;
    } catch (problem) {
      if (available()) setError(problem instanceof Error ? problem.message : "체험 작품을 확인하지 못했어요. 현재 입력은 유지됩니다.");
      return false;
    }
  }, [available, readEditorDraft]);
  const perform = useCallback(async (action: WorkAction): Promise<boolean> => {
    if (!available() || busyRef.current) return false;
    busyRef.current = true; setBusy(true); setActionFailure(null);
    let before = memory.current;
    try {
      if (!await flush(true)) return false;
      before = { ...memory.current, draft: local.current };
      const next = await classroomApi.previewEvaluate(lesson.id, classId, before, action, uid);
      if (!available()) return false;
      memory.current = next; local.current = next.draft; setWork(next); setDraft(next.draft); setError("");
      return true;
    } catch (problem) {
      if (available()) setActionFailure({ action, before, uncertain: false, message: problem instanceof Error ? problem.message : "체험 평가를 완료하지 못했어요. 입력은 유지됩니다." });
      return false;
    } finally { busyRef.current = false; if (available()) setBusy(false); }
  }, [available, flush, lesson.id, classId, uid]);
  const switchStage = useCallback(async (stage: WorkDraft["stage"]): Promise<boolean> => {
    if (busyRef.current || !await flush(true)) return false;
    const next = { ...local.current, stage }; update(next);
    memory.current = { ...memory.current, draft: next }; setWork(memory.current);
    return true;
  }, [flush, update]);
  return {
    work, draft, busy, error, actionFailure, saveState: error ? "failed" : "saved",
    conflict: false, remote: null, aiBusy: false, actionBlocked: false, checkingResult: false,
    update, flush, perform, switchStage, getDraft: () => local.current,
    retry: () => flush(true), compare: async () => {}, resolve: async () => {},
    recoverAction: async () => actionFailure ? perform(actionFailure.action) : false,
    requestAi: async () => null,
  };
}
