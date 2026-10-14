"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigationGuard } from "@/components/navigation-provider";
import { ApiError, classroomApi } from "@/lib/classroom/client";
import type { Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import type { AiReply, AiTask, FlowPlanning } from "@/lib/classroom/review/ai";
import { sameWorkContent } from "./work-draft";
import { hasActionResult, hasRecoveryFields } from "./work-recovery";

type SaveState = "saved" | "dirty" | "saving" | "failed";
type Recovery = { revision: number; draft: WorkDraft; at: number };
const recovery = new Map<string, Recovery>();
if (typeof window !== "undefined") {
  // Memory only: no student answers are persisted on a shared computer.
  const clear = () => recovery.clear();
  window.addEventListener("cs-session-ended", clear);
  window.addEventListener("cs-draft-clear", clear);
}
const sameDraft = (a: WorkDraft, b: WorkDraft) => JSON.stringify(a) === JSON.stringify(b);
type ActionFailure = {
  action: WorkAction;
  before: Work;
  message: string;
  uncertain: boolean;
  canResend?: boolean;
  verificationError?: string;
};
export function useWork(initial: Work, uid: string, readEditorDraft?: (draft: WorkDraft) => Promise<WorkDraft>) {
  const key = `${uid}:${initial.lessonId}`;
  const [work, setWork] = useState(initial);
  const [draft, setDraft] = useState(() => {
    const cached = recovery.get(key);
    return cached && Date.now() - cached.at < 20 * 60_000 ? cached.draft : initial.draft;
  });
  const [saveState, setSaveState] = useState<SaveState>(() => sameWorkContent(draft, initial.draft) ? "saved" : "dirty");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [remote, setRemote] = useState<Work | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [actionFailure, setActionFailure] = useState<ActionFailure | null>(null);
  const [checkingResult, setCheckingResult] = useState(false);
  const failedAction = useRef<ActionFailure | null>(null);
  const checkingAction = useRef(false);
  const pendingAi = useRef<Promise<AiReply | null> | null>(null);
  const finishingAi = useRef<Promise<void> | null>(null);
  const preparingAi = useRef(false);
  const server = useRef(initial);
  const local = useRef(draft);
  const active = useRef(true);
  const blocked = useRef(false);
  const actionPending = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  const pendingAction = useRef<Promise<boolean> | null>(null);
  const { register } = useNavigationGuard();
  const isDirty = useCallback(() => !sameDraft(local.current, server.current.draft), []);
  const hasUnsavedContent = useCallback(() => !sameWorkContent(local.current, server.current.draft), []);
  const clearActionFailure = useCallback(() => { failedAction.current = null; setActionFailure(null); }, []);

  const adopt = useCallback((next: Work, captured: WorkDraft) => {
    if (!active.current) return;
    server.current = next;
    setWork(next);
    if (sameDraft(local.current, captured)) { local.current = next.draft; setDraft(next.draft); }
    if (sameWorkContent(local.current, next.draft)) recovery.delete(key);
    else recovery.set(key, { revision: next.revision, draft: local.current, at: Date.now() });
  }, [key]);

  const fail = useCallback((problem: unknown) => {
    if (!active.current) return;
    blocked.current = true;
    clearActionFailure();
    setSaveState("failed");
    setError(problem instanceof Error ? problem.message : "저장하지 못했어요. 현재 입력은 그대로 유지하고 있어요.");
    setConflict(problem instanceof ApiError && problem.code === "REVISION_CONFLICT");
  }, [clearActionFailure]);

  const captureDraft = useCallback(async (): Promise<WorkDraft> => {
    if (!active.current) throw new Error("수업 화면이 바뀌었어요.");
    if (!readEditorDraft) return structuredClone(local.current);
    const before = structuredClone(local.current);
    setCapturing(true);
    try {
      const captured = await readEditorDraft(before);
      if (!active.current) throw new Error("수업 화면이 바뀌었어요.");
      // Preserve edits in other fields made while native export was outstanding.
      const latest = local.current;
      const next = sameDraft(before, latest) ? captured : before.programming && captured.programming && latest.programming
        ? { ...latest, programming: { ...latest.programming, projects: { ...latest.programming.projects, [before.programming.mission]: captured.programming.projects[before.programming.mission] } } }
        : { ...latest, entryProject: captured.entryProject, practiceOrder: captured.practiceOrder };
      local.current = next; setDraft(next);
      if (hasUnsavedContent()) recovery.set(key, { revision: server.current.revision, draft: next, at: Date.now() });
      return structuredClone(next);
    } catch (problem) { fail(problem); throw problem; }
    finally { if (active.current) setCapturing(false); }
  }, [fail, hasUnsavedContent, key, readEditorDraft]);

  const flush = useCallback(function flushWork(captureEditor = false, contentOnly = false): Promise<boolean> {
    if (pendingAi.current) return pendingAi.current.then(() => flushWork(captureEditor, contentOnly));
    if (saving.current) return contentOnly ? saving.current : saving.current.then(saved => saved ? flushWork(captureEditor) : false);
    if (!active.current || blocked.current) return Promise.resolve(false);
    if (!isDirty() && !(captureEditor && readEditorDraft)) { setSaveState("saved"); return Promise.resolve(true); }
    const operation = (async () => {
      setSaveState("saving");
      try {
        const captured = captureEditor ? await captureDraft() : structuredClone(local.current);
        if (!active.current) return false;
        if (isDirty() && (!contentOnly || hasUnsavedContent())) {
          const next = await classroomApi.saveWork(initial.lessonId, server.current.revision, captured, uid);
          if (!active.current) return false;
          adopt(next, captured);
        }
        if (!active.current) return false;
        setSaveState(hasUnsavedContent() ? "dirty" : "saved"); setError("");
        return true;
      } catch (problem) { fail(problem); return false; }
      finally { saving.current = null; }
    })();
    saving.current = operation;
    return operation;
  }, [adopt, captureDraft, fail, hasUnsavedContent, initial.lessonId, isDirty, readEditorDraft, uid]);

  const save = useCallback(() => {
    if (actionPending.current || preparingAi.current || pendingAi.current || failedAction.current?.uncertain) return Promise.resolve(false);
    if (blocked.current) {
      // A conflict requires explicit comparison; definite transport failures can be retried.
      if (conflict) return Promise.resolve(false);
      blocked.current = false; setError("");
    }
    return flush(true, true);
  }, [conflict, flush]);

  const update = useCallback((next: WorkDraft) => {
    if (!active.current || actionPending.current) return;
    local.current = next;
    recovery.set(key, { revision: server.current.revision, draft: next, at: Date.now() });
    setDraft(next);
    if ((!blocked.current || failedAction.current?.uncertain) && !saving.current) setSaveState(sameWorkContent(next, server.current.draft) ? "saved" : "dirty");
  }, [key]);

  const perform = useCallback((action: WorkAction): Promise<boolean> => {
    if (actionPending.current || pendingAi.current || preparingAi.current || blocked.current || !active.current) return Promise.resolve(false);
    actionPending.current = true; setBusy(true);
    const operation = (async () => {
      let before: Work | null = null;
      try {
        if (!(await flush(true)) || !active.current) return false;
        clearActionFailure();
        before = server.current;
        const captured = local.current;
        const next = await classroomApi.act(initial.lessonId, server.current.revision, action, uid);
        if (!active.current) return false;
        adopt(next, captured); setSaveState(hasUnsavedContent() ? "dirty" : "saved"); setError("");
        return true;
      } catch (problem) {
        if (!active.current) return false;
        if (!before || problem instanceof ApiError && problem.code === "REVISION_CONFLICT") fail(problem);
        else {
          const uncertain = !(problem instanceof ApiError && problem.status >= 400 && problem.status < 500);
          const failure = { action, before, uncertain, message: problem instanceof Error ? problem.message : "요청 결과를 확인하지 못했어요." };
          failedAction.current = failure; setActionFailure(failure);
          blocked.current = uncertain;
          setSaveState(hasUnsavedContent() ? "dirty" : "saved");
        }
        return false;
      }
      finally { pendingAction.current = null; actionPending.current = false; if (active.current) setBusy(false); }
    })();
    pendingAction.current = operation;
    return operation;
  }, [adopt, clearActionFailure, fail, flush, hasUnsavedContent, initial.lessonId, uid]);

  const recoverAction = useCallback(async (resend = false): Promise<boolean> => {
    const failure = failedAction.current;
    if (!failure?.uncertain || checkingAction.current || actionPending.current || !active.current) return false;
    checkingAction.current = true; setCheckingResult(true);
    const inspect = (latest: Work) => {
      if (!active.current || failedAction.current !== failure) return "stale";
      if (latest.lessonId !== initial.lessonId || !hasRecoveryFields(latest)) throw new Error("수업 기록을 확인하지 못했어요. 결과를 다시 확인해 주세요.");
      if (hasActionResult(failure.before, failure.action, latest)) {
        if (failure.action.type === "retry-quiz") {
          // Only apply the server's answer clearing where the student has not edited since the request.
          const quizAnswers = { ...local.current.quizAnswers };
          for (const id of latest.quizRoundIds) if (quizAnswers[id] === failure.before.draft.quizAnswers[id]) delete quizAnswers[id];
          local.current = { ...local.current, quizAnswers }; setDraft(local.current);
        }
        adopt(latest, failure.before.draft); clearActionFailure(); blocked.current = false;
        setSaveState(hasUnsavedContent() ? "dirty" : "saved");
        return "confirmed";
      }
      if (latest.revision !== failure.before.revision || !sameDraft(latest.draft, failure.before.draft)) {
        fail(new ApiError("REVISION_CONFLICT", "서버 기록이 달라졌어요. 현재 입력과 확인한 기록을 비교해 주세요.", 409));
        setRemote(latest);
        return "conflict";
      }
      setActionFailure({ ...failure, canResend: true });
      return "unknown";
    };
    try {
      const state = inspect(await classroomApi.work(initial.lessonId));
      if (state === "confirmed") return true;
      if (state !== "unknown" || !resend) return false;
      // Manual resends stay bound to the original revision. A late original request can win, but not both.
      try { return inspect(await classroomApi.act(initial.lessonId, failure.before.revision, failure.action, uid)) === "confirmed"; }
      catch (problem) {
        if (problem instanceof ApiError && problem.code === "REVISION_CONFLICT") return inspect(await classroomApi.work(initial.lessonId)) === "confirmed";
        throw problem;
      }
    } catch (problem) {
      if (active.current && failedAction.current === failure) setActionFailure({ ...failure, verificationError: problem instanceof Error ? problem.message : "결과를 확인하지 못했어요." });
      return false;
    } finally { checkingAction.current = false; if (active.current) setCheckingResult(false); }
  }, [adopt, clearActionFailure, fail, hasUnsavedContent, initial.lessonId, uid]);

  const requestAi = useCallback(async (task: AiTask, input: string, missionId?: string, requestId = crypto.randomUUID(), planning?: FlowPlanning): Promise<AiReply | null> => {
    if (actionPending.current || pendingAi.current || preparingAi.current || !active.current) return null;
    preparingAi.current = true;
    let finishAi!: () => void;
    finishingAi.current = new Promise<void>(resolve => { finishAi = resolve; });
    setAiBusy(true);
    try {
      if (!(await flush(true)) || !active.current) return null;
      // AI evaluates the confirmed server snapshot, not later edits made while saving it.
      const captured = server.current.draft;
      const adoptResponse = (next: Work) => {
        const incoming = next.draft.reviewProject, edited = local.current.reviewProject;
        if (incoming?.type === "sandwich" && edited?.type === "sandwich" && incoming.runId === edited.runId) {
          local.current = { ...local.current, reviewProject: { ...incoming, input: edited.input === input ? incoming.input : edited.input } };
          setDraft(local.current);
        }
        adopt(next, captured);
        setSaveState(sameWorkContent(local.current, next.draft) ? "saved" : "dirty");
      };
      const operation = (async () => {
        try {
        const reply = await classroomApi.ai(initial.lessonId, server.current.revision, task, input, requestId, missionId, uid, planning);
        if (!active.current) return null;
        // AI appends a signed command while the student may already be typing the next one.
        // Merge only that server change; keep edits made both during preparation and the call.
        adoptResponse(reply.work);
        return reply.work.draft.reviewProject?.type === "sandwich" || sameWorkContent(local.current, reply.work.draft) ? reply : null;
        } catch (problem) {
          // Failed reviews may leave a snapshot-bound teacher request available.
          try { const latest = await classroomApi.work(initial.lessonId); if (active.current && latest.revision >= server.current.revision) adoptResponse(latest); } catch { /* Keep the original error and local input. */ }
          throw problem;
        }
      })();
      pendingAi.current = operation.catch(() => null);
      return await operation;
    } finally { pendingAi.current = null; preparingAi.current = false; finishingAi.current = null; finishAi(); if (active.current) setAiBusy(false); }
  }, [adopt, flush, initial.lessonId, uid]);

  const retry = useCallback(async () => { if (failedAction.current?.uncertain) return false; blocked.current = false; setError(""); return flush(true); }, [flush]);
  const compare = useCallback(async () => {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true);
    try { const latest = await classroomApi.work(initial.lessonId); if (active.current) setRemote(latest); }
    catch (problem) { fail(problem); }
    finally { actionPending.current = false; if (active.current) setBusy(false); }
  }, [fail, initial.lessonId]);

  const resolve = useCallback(async (keepLocal: boolean) => {
    if (!remote || actionPending.current || !active.current) return;
    server.current = remote; setWork(remote); setRemote(null); setConflict(false); setError(""); blocked.current = false;
    clearActionFailure();
    if (keepLocal) {
      recovery.set(key, { revision: remote.revision, draft: local.current, at: Date.now() });
      await flush();
    } else {
      local.current = remote.draft; setDraft(remote.draft); setSaveState("saved"); recovery.delete(key);
    }
  }, [clearActionFailure, flush, key, remote]);

  const switchStage = useCallback((stage: WorkDraft["stage"]): Promise<boolean> => {
    if (actionPending.current || !active.current) return Promise.resolve(false);
    actionPending.current = true;
    const operation = (async () => {
      try {
        const captured = await captureDraft();
        const next = { ...captured, stage };
        local.current = next; setDraft(next);
        if (hasUnsavedContent()) recovery.set(key, { revision: server.current.revision, draft: next, at: Date.now() });
        if (!blocked.current) setSaveState(hasUnsavedContent() ? "dirty" : "saved");
        return true;
      } catch (problem) { fail(problem); return false; }
      finally { pendingAction.current = null; actionPending.current = false; }
    })();
    pendingAction.current = operation;
    return operation;
  }, [captureDraft, fail, hasUnsavedContent, key]);

  useEffect(() => {
    active.current = true;
    const cached = recovery.get(key);
    if (cached && cached.revision !== initial.revision && hasUnsavedContent()) {
      // A navigation may return after another tab saved. Never apply stale recovery silently.
      queueMicrotask(() => { if (active.current) { blocked.current = true; setConflict(true); setSaveState("failed"); setError("다른 창의 기록이 바뀌었어요. 보관한 입력과 서버 기록을 비교해 주세요."); } });
    }
    return () => { active.current = false; };
  }, [initial.revision, hasUnsavedContent, key]);

  const discardDraft = useCallback(() => {
    if (saving.current || actionPending.current || pendingAi.current || preparingAi.current || failedAction.current?.uncertain) return false;
    local.current = structuredClone(server.current.draft); setDraft(local.current);
    recovery.delete(key); blocked.current = false; setConflict(false); setRemote(null); setError("");
    clearActionFailure(); setSaveState("saved"); return true;
  }, [clearActionFailure, key]);

  const prepareLeave = useCallback(async () => {
    if (finishingAi.current) await finishingAi.current;
    if (pendingAction.current) await pendingAction.current;
    if (saving.current) await saving.current;
    if (!active.current || failedAction.current?.uncertain) return false;
    try { await captureDraft(); return true; } catch (problem) { fail(problem); return false; }
  }, [captureDraft, fail]);

  useEffect(() => register({
    flush: async () => {
      if (finishingAi.current) await finishingAi.current;
      if (pendingAction.current) await pendingAction.current;
      return flush(true);
    },
    save, prepareLeave, discard: discardDraft,
    isDirty: () => hasUnsavedContent() || blocked.current || actionPending.current || preparingAi.current || !!pendingAi.current || !!saving.current,
  }), [discardDraft, flush, hasUnsavedContent, prepareLeave, register, save]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      if (!(event.target instanceof Element) || !event.target.closest("[data-lesson-shell]")) return;
      event.preventDefault();
      if (event.repeat || event.isComposing || event.keyCode === 229 || document.querySelector("[role=dialog]")) return;
      if (event.target.closest("[data-lesson-shell]")?.querySelector<HTMLButtonElement>("[data-work-save]")?.matches('[disabled], [aria-disabled="true"]')) return;
      void save();
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, [save]);

  return { work, draft, saveState, error, conflict, remote, busy, aiBusy, capturing, actionFailure, actionBlocked: !!actionFailure?.uncertain, checkingResult, recoverAction, requestAi, update, perform, retry, compare, resolve, switchStage, flush, captureDraft, save, discardDraft, prepareLeave, getDraft: () => local.current };
}
