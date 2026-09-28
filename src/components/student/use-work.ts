"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigationGuard } from "@/components/navigation-provider";
import { ApiError, classroomApi } from "@/lib/classroom/client";
import type { Work, WorkAction, WorkDraft } from "@/lib/classroom/types";

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

export function useWork(initial: Work, uid: string) {
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
  const server = useRef(initial);
  const local = useRef(draft);
  const active = useRef(true);
  const blocked = useRef(false);
  const actionPending = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  const pendingAction = useRef<Promise<boolean> | null>(null);
  const { register } = useNavigationGuard();
  const isDirty = useCallback(() => !sameDraft(local.current, server.current.draft), []);

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
    setSaveState("failed");
    setError(problem instanceof Error ? problem.message : "저장하지 못했어요. 현재 입력은 그대로 유지하고 있어요.");
    setConflict(problem instanceof ApiError && problem.code === "REVISION_CONFLICT");
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (saving.current) return saving.current;
    if (!active.current || blocked.current) return Promise.resolve(false);
    if (!isDirty()) { setSaveState("saved"); return Promise.resolve(true); }
    const operation = (async () => {
      setSaveState("saving");
      try {
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
  }, [adopt, fail, initial.lessonId, isDirty, uid]);

  const update = useCallback((next: WorkDraft) => {
    if (!active.current || actionPending.current) return;
    local.current = next;
    recovery.set(key, { revision: server.current.revision, draft: next, at: Date.now() });
    setDraft(next);
    if (!blocked.current) setSaveState(sameDraft(next, server.current.draft) ? "saved" : "dirty");
  }, [key]);

  const perform = useCallback((action: WorkAction): Promise<boolean> => {
    if (actionPending.current || !active.current) return Promise.resolve(false);
    actionPending.current = true; setBusy(true);
    const operation = (async () => {
      try {
        if (!(await flush()) || !active.current) return false;
        const captured = local.current;
        const next = await classroomApi.act(initial.lessonId, server.current.revision, action, uid);
        if (!active.current) return false;
        adopt(next, captured); setSaveState("saved"); setError("");
        return true;
      } catch (problem) { fail(problem); return false; }
      finally { pendingAction.current = null; actionPending.current = false; if (active.current) setBusy(false); }
    })();
    pendingAction.current = operation;
    return operation;
  }, [adopt, fail, flush, initial.lessonId, uid]);

  const retry = useCallback(async () => { blocked.current = false; setError(""); return flush(); }, [flush]);
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
    if (keepLocal) {
      recovery.set(key, { revision: remote.revision, draft: local.current, at: Date.now() });
      await flush();
    } else {
      local.current = remote.draft; setDraft(remote.draft); setSaveState("saved"); recovery.delete(key);
    }
  }, [flush, key, remote]);

  const switchStage = useCallback((stage: WorkDraft["stage"]): Promise<boolean> => {
    if (actionPending.current || !active.current) return Promise.resolve(false);
    if (local.current.stage === stage) return flush();
    actionPending.current = true;
    const operation = (async () => {
      try {
        if (!(await flush()) || !active.current) return false;
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
      if (pendingAction.current && !(await pendingAction.current)) return false;
      return flush();
    },
    isDirty: () => isDirty() || actionPending.current,
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

  return { work, draft, saveState, error, conflict, remote, busy, update, perform, retry, compare, resolve, switchStage };
}
