"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "@/components/navigation-provider";
import { api, ApiError } from "@/lib/classroom/client";
import type { HelpRequest } from "@/lib/classroom/help";
import styles from "./help.module.css";

export function HelpButton({ lessonId }: { lessonId: string }) {
  const { saveCurrent } = useNavigationGuard();
  const [request, setRequest] = useState<HelpRequest | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const busyRef = useRef(false);
  const version = useRef(0);
  const inFlight = useRef<{ version: number; promise: Promise<void> } | null>(null);
  const retryId = useRef<string | null>(null);
  const load = useCallback((recover = false): Promise<void> => {
    if (busyRef.current && !recover) return Promise.resolve();
    if (inFlight.current?.version === version.current) return inFlight.current.promise;
    const current = ++version.current;
    const promise = api<{ request: HelpRequest | null }>("classroom/help").then(value => {
      if (current === version.current) { setRequest(value.request); setReady(true); setError(""); }
    }, (problem: unknown) => {
      if (current === version.current) { setReady(true); setError(problem instanceof Error ? problem.message : "손들기 상태를 확인하지 못했어요."); }
    }).finally(() => { if (inFlight.current?.version === current) inFlight.current = null; });
    inFlight.current = { version: current, promise };
    return promise;
  }, []);
  useEffect(() => {
    void load();
    return () => { version.current += 1; };
  }, [lessonId, load]);
  const intervalMs = request ? 30_000 : 60_000;
  useEffect(() => {
    // Action responses already contain the latest state; a cadence change only resets the timer.
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, intervalMs);
    return () => clearInterval(timer);
  }, [lessonId, intervalMs, load]);
  async function toggle() {
    if (busyRef.current) return; busyRef.current = true; const current = ++version.current; setBusy(true); setError("");
    let completedVersion = current;
    try {
      if (request) { await api("classroom/help/cancel", { id: request.id }); if (current === version.current) { setRequest(null); retryId.current = null; } }
      else {
        if (!(await saveCurrent())) { setError("저장 문제를 해결한 뒤 손들어 주세요."); return; }
        if (current !== version.current) return;
        retryId.current ??= crypto.randomUUID();
        const value = await api<{ request: HelpRequest }>("classroom/help", { id: retryId.current, lessonId });
        if (current === version.current) { setRequest(value.request.status === "pending" ? value.request : null); retryId.current = null; }
      }
    } catch (problem) {
      if (current === version.current) {
        if (problem instanceof ApiError && problem.code === "REQUEST_CHANGED") {
          retryId.current = null;
          const recovery = load(true); completedVersion = version.current;
          await recovery;
        }
        else setError(problem instanceof Error ? problem.message : "손들기를 저장하지 못했어요. 다시 시도해 주세요.");
      }
    }
    finally { busyRef.current = false; if (completedVersion === version.current) setBusy(false); }
  }
  return <div><Button variant="ghost" className={styles.raise} data-pending={Boolean(request)} aria-pressed={Boolean(request)} disabled={busy || !ready} title={request ? "손 내리기" : "현재 작업을 저장하고 선생님께 도움 요청"} onClick={() => void toggle()}><Hand size={17} aria-hidden="true" />{busy || !ready ? "확인 중…" : request ? "손 내리기" : "손들기"}</Button>{error && <p className={styles.raiseError} role="alert">{error}</p>}</div>;
}
