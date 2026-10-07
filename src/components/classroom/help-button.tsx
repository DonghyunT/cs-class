"use client";

import { useEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "@/components/navigation-provider";
import { api } from "@/lib/classroom/client";
import type { HelpRequest } from "@/lib/classroom/help";
import styles from "./help.module.css";

export function HelpButton({ lessonId }: { lessonId: string }) {
  const { beforeLeave } = useNavigationGuard();
  const [request, setRequest] = useState<HelpRequest | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const busyRef = useRef(false);
  const version = useRef(0);
  const retryId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (busyRef.current) return;
      const current = ++version.current;
      try { const value = await api<{ request: HelpRequest | null }>("classroom/help"); if (active && current === version.current && !busyRef.current) { setRequest(value.request); setReady(true); } }
      catch (problem) { if (active && current === version.current) { setReady(true); setError(problem instanceof Error ? problem.message : "손들기 상태를 확인하지 못했어요."); } }
    };
    void load(); const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => { active = false; version.current += 1; clearInterval(timer); };
  }, [lessonId]);
  async function toggle() {
    if (busyRef.current) return; busyRef.current = true; const current = ++version.current; setBusy(true); setError("");
    try {
      if (request) { await api("classroom/help/cancel", { id: request.id }); if (current === version.current) { setRequest(null); retryId.current = null; } }
      else {
        if (!(await beforeLeave())) { setError("저장 문제를 해결한 뒤 손들어 주세요."); return; }
        if (current !== version.current) return;
        retryId.current ??= crypto.randomUUID();
        const value = await api<{ request: HelpRequest }>("classroom/help", { id: retryId.current, lessonId });
        if (current === version.current) { setRequest(value.request.status === "pending" ? value.request : null); retryId.current = null; }
      }
    } catch (problem) { if (current === version.current) setError(problem instanceof Error ? problem.message : "손들기를 저장하지 못했어요. 다시 시도해 주세요."); }
    finally { busyRef.current = false; if (current === version.current) setBusy(false); }
  }
  return <div><Button variant="ghost" className={styles.raise} data-pending={Boolean(request)} aria-pressed={Boolean(request)} disabled={busy || !ready} title={request ? "손 내리기" : "현재 작업을 저장하고 선생님께 도움 요청"} onClick={() => void toggle()}><Hand size={17} aria-hidden="true" />{busy || !ready ? "확인 중…" : request ? "손 내리기" : "손들기"}</Button>{error && <p className={styles.raiseError} role="alert">{error}</p>}</div>;
}
