"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { classroomApi, setExpectedUser } from "@/lib/classroom/client";
import styles from "./session-provider.module.css";
import type { Session } from "@/lib/classroom/types";

interface SessionContextValue {
  session: Session | null; loading: boolean; configured: boolean; error: string;
  acceptSession: (session: Session) => void; refresh: () => Promise<void>; logout: () => Promise<void>;
}
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const current = useRef<Session | null>(null);
  const [loading, setLoading] = useState(true); const [configured, setConfigured] = useState(true);
  const [error, setError] = useState(""); const [remaining, setRemaining] = useState<number | null>(null);
  const activity = useRef(0); const lastSent = useRef(0); const busy = useRef(false);
  const generation = useRef(0);
  const acceptSession = useCallback((value: Session) => { generation.current += 1; if (current.current?.uid !== value.uid) window.dispatchEvent(new Event("cs-draft-clear")); current.current = value; setExpectedUser(value.uid); setSession(value); activity.current = value.lastActivityAt; lastSent.current = value.lastActivityAt; setError(""); setLoading(false); }, []);
  const clear = useCallback((message = "") => { generation.current += 1; window.dispatchEvent(new Event("cs-draft-clear")); current.current = null; setExpectedUser(null); setSession(null); setError(message); setRemaining(null); setLoading(false); }, []);
  const refresh = useCallback(async () => {
    const started = generation.current;
    try {
      const value = await classroomApi.session(); if (started !== generation.current) return; setConfigured(value.configured);
      if (value.session && (!current.current || value.session.uid === current.current.uid)) {
        if (!current.current) acceptSession(value.session);
        else { current.current = value.session; setSession(value.session); activity.current = Math.max(activity.current, value.session.lastActivityAt); }
      } else clear(value.reason === "SESSION_REPLACED" ? "다른 곳에서 로그인되었거나 계정이 초기화되어 로그아웃됐어요." : value.reason === "SESSION_EXPIRED" ? "오랫동안 사용하지 않아 로그아웃됐어요." : "");
    } catch (problem) { if (started === generation.current) setError(problem instanceof Error ? problem.message : "접속을 확인하지 못했어요."); }
    finally { if (started === generation.current) setLoading(false); }
  }, [acceptSession, clear]);
  const logout = useCallback(async () => { const started = generation.current; await classroomApi.logout(); if (started === generation.current) clear(); }, [clear]);
  useEffect(() => { let alive = true; queueMicrotask(() => { if (alive) void refresh(); }); const ended = (event: Event) => clear((event as CustomEvent<string>).detail); window.addEventListener("cs-session-ended", ended); return () => { alive = false; window.removeEventListener("cs-session-ended", ended); }; }, [refresh, clear]);
  const sessionUid = session?.uid;
  useEffect(() => {
    if (!sessionUid) return;
    const uid = sessionUid;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("cs-class-activity");
    const onActivity = (event: Event) => {
      if (!event.isTrusted || !current.current) return;
      const now = Date.now(); if (now - activity.current < 1000) return;
      activity.current = now; channel?.postMessage({ uid, at: now });
    };
    if (channel) channel.onmessage = (event) => { if (event.data?.uid === uid && typeof event.data.at === "number" && event.data.at <= Date.now() + 1000) activity.current = Math.max(activity.current, event.data.at); };
    const events = ["pointerdown", "keydown", "input", "scroll", "touchstart"];
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }));
    let tick = 0;
    const timer = window.setInterval(async () => {
      const value = current.current; if (!value) return;
      const now = Date.now(); const left = value.idleTimeoutMs - (now - activity.current);
      setRemaining(value.role === "student" && left <= 60_000 ? Math.max(0, Math.ceil(left / 1000)) : null);
      if (left <= 0) {
        void classroomApi.logout().catch(() => undefined);
        clear("오랫동안 사용하지 않아 로그아웃됐어요. 저장된 작업은 다음 로그인에서 이어갈 수 있어요.");
        return;
      }
      if (busy.current) return;
      if (activity.current > lastSent.current && now - lastSent.current >= 30_000 && now - activity.current < 60_000) {
        busy.current = true;
        const started = generation.current;
        try { const touched = await classroomApi.touch(Math.max(0, now - activity.current)); if (started === generation.current) { lastSent.current = touched.session.lastActivityAt; current.current = touched.session; } }
        catch { /* A later interaction retries; 401 is handled by the central event. */ }
        finally { busy.current = false; }
      } else if (++tick % 30 === 0 && document.visibilityState === "visible") { busy.current = true; try { await refresh(); } finally { busy.current = false; } }
    }, 1000);
    const onFocus = () => { void refresh(); }; window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); channel?.close(); events.forEach((name) => window.removeEventListener(name, onActivity, true)); window.removeEventListener("focus", onFocus); };
  }, [sessionUid, clear, refresh]); // Session timing lives in refs; no listener churn on polling.
  async function extend() { const started = generation.current; try { const result = await classroomApi.touch(); if (started === generation.current) { acceptSession(result.session); setRemaining(null); } } catch (problem) { if (started === generation.current) setError(problem instanceof Error ? problem.message : "접속을 연장하지 못했어요."); } }
  return <Context.Provider value={{ session, loading, configured, error, acceptSession, refresh, logout }}>
    {children}
    {remaining !== null && session && <div className={styles.warning} role="alert"><div><strong>곧 자동 로그아웃돼요.</strong><p>{remaining}초 안에 계속 사용하기를 눌러 주세요.</p></div><button type="button" onClick={() => void extend()}>계속 사용하기</button></div>}
  </Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error("SessionProvider is missing"); return value; }
