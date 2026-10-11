"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigationGuard } from "@/components/navigation-provider";
import { ApiError, classroomApi } from "@/lib/classroom/client";
import { practiceMatches } from "@/lib/classroom/progress";
import { programmingProjectMatches } from "@/lib/classroom/programming-entry";
import { reviewProjectSchema, sameReviewProject } from "@/lib/classroom/review/project";
import type { Submission, ValidationResult, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import type { AiReply, AiTask, FlowPlanning } from "@/lib/classroom/review/ai";

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
const stringRecord = (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every(item => typeof item === "string");
function hasRecoveryFields(value: Work): boolean {
  const draft = value.draft;
  const feedback = (record: Work["conceptFeedback"]) => !!record && typeof record === "object" && !Array.isArray(record) && Object.values(record).every(item => item && typeof item.correct === "boolean" && typeof item.message === "string");
  const ids = (items: string[]) => Array.isArray(items) && items.every(item => typeof item === "string");
  const project = (item: WorkDraft["reviewProject"]) => {
    if (item === undefined) return true;
    const checked = reviewProjectSchema.safeParse(item);
    // Work contains the schema's output shape. Reject missing defaulted fields rather than rewrite a draft.
    return checked.success && Object.keys(checked.data).every(key => Object.hasOwn(item, key));
  };
  const practice = (item: Submission | ValidationResult | null) => item === null || !!item && ids(item.order) && project(item.reviewProject) &&
    ("passed" in item ? typeof item.passed === "boolean" && typeof item.message === "string" : typeof item.id === "string" && Number.isFinite(item.submittedAt));
  return Number.isSafeInteger(value.revision) && value.revision >= 0 &&
    Number.isSafeInteger(value.quizRound) && typeof value.quizRoundGraded === "boolean" &&
    ids(value.conceptSolved) && ids(value.quizSolved) && ids(value.quizRoundIds) &&
    feedback(value.conceptFeedback) && feedback(value.quizFeedback) &&
    practice(value.validation) && practice(value.submission) &&
    (!value.missions || typeof value.missions === "object" && !Array.isArray(value.missions) &&
      Object.values(value.missions).every(item => item && practice(item.validation) && practice(item.submission))) &&
    (!value.review || !!value.review.project && project(value.review.project)) &&
    (!value.aiReview || !!value.aiReview.project && project(value.aiReview.project)) &&
    !!draft && ["concept", "quiz", "practice"].includes(draft.stage) &&
    stringRecord(draft.conceptAnswers) && stringRecord(draft.quizAnswers) && ids(draft.practiceOrder) &&
    project(draft.reviewProject) &&
    (!draft.programming || typeof draft.programming.mission === "string" &&
      typeof draft.programming.reflection === "string" && stringRecord(draft.programming.projects));
}

// Confirm an available result for the saved request, never infer non-execution from a GET.
function hasActionResult(before: Work, action: WorkAction, next: Work): boolean {
  if (next.lessonId !== before.lessonId || next.revision < before.revision || next.revision > before.revision + 1) return false;
  const expected = structuredClone(before.draft);
  if (action.type === "retry-quiz") {
    const remaining = before.quizRoundIds.filter(id => !before.quizSolved.includes(id));
    for (const id of remaining) delete expected.quizAnswers[id];
    return sameDraft(expected, next.draft) && next.revision === before.revision + 1 &&
      next.quizRound === before.quizRound + 1 && !next.quizRoundGraded &&
      JSON.stringify(next.quizRoundIds) === JSON.stringify(remaining) &&
      JSON.stringify(next.quizSolved) === JSON.stringify(before.quizSolved) && remaining.every(id => !next.quizFeedback[id]);
  }
  if (!sameDraft(expected, next.draft)) return false;
  if (action.type === "grade-quiz") return next.revision === before.revision + 1 && next.quizRound === before.quizRound && next.quizRoundGraded &&
    JSON.stringify(next.quizRoundIds) === JSON.stringify(before.quizRoundIds) && before.quizRoundIds.every(id => next.quizFeedback[id]);
  if (action.type === "check-concept") return next.revision === before.revision + 1 && !!next.conceptFeedback[action.conceptId];
  if (action.type === "request-review") return next.revision === before.revision + 1 && !!next.review && next.review.id !== before.review?.id &&
    next.review.missionId === action.missionId && sameReviewProject(before.draft.reviewProject, next.review.project, action.missionId);
  const record = action.missionId ? next.missions?.[action.missionId] : next;
  const saved = action.type === "validate-practice" ? record?.validation : record?.submission;
  if (!saved || action.type === "validate-practice" && next.revision === before.revision) return false;
  return before.draft.programming && action.missionId ? programmingProjectMatches(before.draft.programming.projects[action.missionId], saved.entryProject) :
    before.draft.reviewProject ? sameReviewProject(before.draft.reviewProject, saved.reviewProject, action.missionId) : practiceMatches(before.draft, saved);
}

export function useWork(initial: Work, uid: string, readEditorDraft?: (draft: WorkDraft) => Promise<WorkDraft>) {
  const key = `${uid}:${initial.lessonId}`;
  const [work, setWork] = useState(initial);
  const [draft, setDraft] = useState(() => {
    const cached = recovery.get(key);
    return cached && Date.now() - cached.at < 20 * 60_000 ? cached.draft : initial.draft;
  });
  const [saveState, setSaveState] = useState<SaveState>(() => sameDraft(draft, initial.draft) ? "saved" : "dirty");
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
  const clearActionFailure = useCallback(() => { failedAction.current = null; setActionFailure(null); }, []);

  const adopt = useCallback((next: Work, captured: WorkDraft) => {
    if (!active.current) return;
    server.current = next;
    setWork(next);
    if (sameDraft(local.current, captured)) { local.current = next.draft; setDraft(next.draft); }
    if (sameDraft(local.current, next.draft)) recovery.delete(key);
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

  const flush = useCallback(function flushWork(captureEditor = false): Promise<boolean> {
    if (pendingAi.current) return pendingAi.current.then(() => flushWork(captureEditor));
    if (saving.current) return captureEditor ? saving.current.then((saved) => saved ? flushWork(true) : false) : saving.current;
    if (!active.current || blocked.current) return Promise.resolve(false);
    if (!isDirty() && !(captureEditor && readEditorDraft)) { setSaveState("saved"); return Promise.resolve(true); }
    const operation = (async () => {
      setSaveState("saving");
      try {
        // Native editors may still hold an uncommitted field when leaving or submitting.
        if (captureEditor && readEditorDraft) {
          const captured = await readEditorDraft(local.current);
          if (!active.current) return false;
          if (!sameDraft(local.current, captured)) {
            local.current = captured; setDraft(captured);
            recovery.set(key, { revision: server.current.revision, draft: captured, at: Date.now() });
          }
        }
        // A single writer drains edits made during an outstanding request.
        while (active.current && isDirty()) {
          const captured = local.current;
          const next = await classroomApi.saveWork(initial.lessonId, server.current.revision, captured, uid);
          if (!active.current) return false;
          adopt(next, captured);
        }
        if (!active.current) return false;
        setSaveState("saved"); setError("");
        return true;
      } catch (problem) { fail(problem); return false; }
      finally { saving.current = null; }
    })();
    saving.current = operation;
    return operation;
  }, [adopt, fail, initial.lessonId, isDirty, key, readEditorDraft, uid]);

  const update = useCallback((next: WorkDraft) => {
    if (!active.current || actionPending.current) return;
    local.current = next;
    recovery.set(key, { revision: server.current.revision, draft: next, at: Date.now() });
    setDraft(next);
    if (!blocked.current || failedAction.current?.uncertain) setSaveState(sameDraft(next, server.current.draft) ? "saved" : "dirty");
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
        adopt(next, captured); setSaveState("saved"); setError("");
        return true;
      } catch (problem) {
        if (!active.current) return false;
        if (!before || problem instanceof ApiError && problem.code === "REVISION_CONFLICT") fail(problem);
        else {
          const uncertain = !(problem instanceof ApiError && problem.status >= 400 && problem.status < 500);
          const failure = { action, before, uncertain, message: problem instanceof Error ? problem.message : "요청 결과를 확인하지 못했어요." };
          failedAction.current = failure; setActionFailure(failure);
          blocked.current = uncertain;
          setSaveState(isDirty() ? "dirty" : "saved");
        }
        return false;
      }
      finally { pendingAction.current = null; actionPending.current = false; if (active.current) setBusy(false); }
    })();
    pendingAction.current = operation;
    return operation;
  }, [adopt, clearActionFailure, fail, flush, initial.lessonId, isDirty, uid]);

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
        setSaveState(isDirty() ? "dirty" : "saved");
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
  }, [adopt, clearActionFailure, fail, initial.lessonId, isDirty, uid]);

  const requestAi = useCallback(async (task: AiTask, input: string, missionId?: string, requestId = crypto.randomUUID(), planning?: FlowPlanning): Promise<AiReply | null> => {
    if (actionPending.current || pendingAi.current || preparingAi.current || !active.current) return null;
    preparingAi.current = true;
    setAiBusy(true);
    try {
      if (!(await flush(true)) || !active.current) return null;
      const captured = local.current;
      const adoptResponse = (next: Work) => {
        const incoming = next.draft.reviewProject, edited = local.current.reviewProject;
        if (incoming?.type === "sandwich" && edited?.type === "sandwich" && incoming.runId === edited.runId) {
          local.current = { ...local.current, reviewProject: { ...incoming, input: edited.input === input ? incoming.input : edited.input } };
          setDraft(local.current);
        }
        adopt(next, captured);
        setSaveState(sameDraft(local.current, next.draft) ? "saved" : "dirty");
      };
      const operation = (async () => {
        try {
        const reply = await classroomApi.ai(initial.lessonId, server.current.revision, task, input, requestId, missionId, uid, planning);
        if (!active.current) return null;
        // AI appends a signed command while the student may already be typing the next one.
        // Merge only that server change; keep edits made both during preparation and the call.
        adoptResponse(reply.work);
        return reply.work.draft.reviewProject?.type === "sandwich" || sameDraft(local.current, reply.work.draft) ? reply : null;
        } catch (problem) {
          // Failed reviews may leave a snapshot-bound teacher request available.
          try { const latest = await classroomApi.work(initial.lessonId); if (active.current && latest.revision >= server.current.revision) adoptResponse(latest); } catch { /* Keep the original error and local input. */ }
          throw problem;
        }
      })();
      pendingAi.current = operation.catch(() => null);
      return await operation;
    } finally { pendingAi.current = null; preparingAi.current = false; if (active.current) setAiBusy(false); }
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
    if (local.current.stage === stage) return flush(true);
    actionPending.current = true;
    const operation = (async () => {
      try {
        if (!(await flush(true)) || !active.current) return false;
        const captured = local.current;
        setSaveState("saving");
        const next = await classroomApi.saveWork(initial.lessonId, server.current.revision, { ...captured, stage }, uid);
        if (!active.current) return false;
        adopt(next, captured); setSaveState("saved"); setError("");
        return true;
      } catch (problem) { fail(problem); return false; }
      finally { pendingAction.current = null; actionPending.current = false; }
    })();
    pendingAction.current = operation;
    return operation;
  }, [adopt, fail, flush, initial.lessonId, uid]);

  useEffect(() => {
    active.current = true;
    const cached = recovery.get(key);
    if (cached && cached.revision !== initial.revision && isDirty()) {
      // A navigation may return after another tab saved. Never apply stale recovery silently.
      queueMicrotask(() => { if (active.current) { blocked.current = true; setConflict(true); setSaveState("failed"); setError("다른 창의 기록이 바뀌었어요. 보관한 입력과 서버 기록을 비교해 주세요."); } });
    }
    return () => { active.current = false; };
  }, [initial.revision, isDirty, key]);

  useEffect(() => register({
    flush: async () => {
      if (pendingAi.current) await pendingAi.current;
      if (pendingAction.current) await pendingAction.current;
      return flush(true);
    },
    isDirty: () => isDirty() || blocked.current || actionPending.current || !!pendingAi.current,
  }), [flush, isDirty, register]);
  useEffect(() => {
    if (saveState !== "dirty") return;
    const timer = window.setTimeout(() => { void flush(); }, 900);
    return () => clearTimeout(timer);
  }, [draft, flush, saveState]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!blocked.current && !actionPending.current && isDirty()) void flush(); }, 5_000);
    const visible = () => { if (document.visibilityState === "hidden" && !blocked.current) void flush(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [flush, isDirty]);

  return { work, draft, saveState, error, conflict, remote, busy, aiBusy, actionFailure, actionBlocked: !!actionFailure?.uncertain, checkingResult, recoverAction, requestAi, update, perform, retry, compare, resolve, switchStage, flush, getDraft: () => local.current };
}
