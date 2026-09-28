"use client";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
type Guard = { flush: () => Promise<boolean>; isDirty: () => boolean };
type HistoryPosition = { owner: string; index: number };
const POSITION_KEY = "__csClassHistory";

function positionOf(state: unknown): HistoryPosition | null {
  if (!state || typeof state !== "object") return null;
  const position = (state as Record<string, unknown>)[POSITION_KEY];
  if (!position || typeof position !== "object") return null;
  const { owner, index } = position as HistoryPosition;
  return typeof owner === "string" && Number.isSafeInteger(index) ? { owner, index } : null;
}

function withPosition(state: unknown, position: HistoryPosition) {
  // Preserve Next's __NA and router tree, as well as state owned by other tools.
  return { ...(state && typeof state === "object" ? state : {}), [POSITION_KEY]: position };
}

const Context = createContext<{ register: (guard: Guard) => () => void; beforeLeave: () => Promise<boolean> } | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter(); const guard = useRef<Guard | null>(null); const moving = useRef(false);
  const register = useCallback((value: Guard) => { guard.current = value; return () => { if (guard.current === value) guard.current = null; }; }, []);
  const beforeLeave = useCallback(() => guard.current?.flush() ?? Promise.resolve(true), []);
  useEffect(() => {
    let active = true;
    let position = positionOf(history.state) ?? { owner: crypto.randomUUID(), index: 0 };
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    type Traversal = {
      origin: HistoryPosition;
      target: number;
      guard: Guard;
      phase: "restoring" | "saving" | "resuming";
      result: boolean | null;
      started: boolean;
    };
    let traversal: Traversal | null = null;

    const push: History["pushState"] = function (this: History, state, title, url) {
      if (!active) return originalPush.call(this, state, title, url);
      const existing = positionOf(this.state) ?? position;
      const next = { owner: existing.owner, index: existing.index + 1 };
      originalPush.call(this, withPosition(state, next), title, url);
      position = next;
    };
    const replace: History["replaceState"] = function (this: History, state, title, url) {
      if (!active) return originalReplace.call(this, state, title, url);
      const next = positionOf(this.state) ?? position;
      originalReplace.call(this, withPosition(state, next), title, url);
      position = next;
    };
    history.pushState = push;
    history.replaceState = replace;
    originalReplace.call(history, withPosition(history.state, position), "");

    const finishAtOrigin = (attempt: Traversal) => {
      if (!active || traversal !== attempt) return;
      const physical = positionOf(history.state);
      if (!physical || physical.owner !== attempt.origin.owner || physical.index !== attempt.origin.index) return;
      if (attempt.result === null) return;
      // Logout, account changes, or another editor must not resume the old move.
      if (!attempt.result || guard.current !== attempt.guard) {
        traversal = null; moving.current = false;
        return;
      }
      attempt.phase = "resuming";
      history.go(attempt.target - attempt.origin.index);
    };

    const saveAtOrigin = (attempt: Traversal) => {
      if (attempt.started) { finishAtOrigin(attempt); return; }
      attempt.started = true; attempt.phase = "saving";
      // Wait until the browser is back at the original entry before saving.
      // The editor stays mounted because Next never receives the intercepted pop.
      void attempt.guard.flush().then((saved) => {
        attempt.result = saved;
        finishAtOrigin(attempt);
      }, () => {
        attempt.result = false;
        finishAtOrigin(attempt);
      });
    };

    const pop = (event: PopStateEvent) => {
      const target = positionOf(event.state);
      // Cross-document and entries predating this app use native beforeunload.
      if (!target || target.owner !== position.owner) {
        if (target && !traversal) position = target;
        return;
      }
      if (traversal) {
        const attempt = traversal;
        if (attempt.phase === "resuming" && target.index === attempt.target && !guard.current?.isDirty()) {
          position = target; traversal = null; moving.current = false;
          return;
        }
        event.stopImmediatePropagation();
        if (attempt.phase === "resuming") {
          // An edit made just after saving also needs to reach the server.
          attempt.phase = "restoring"; attempt.started = false; attempt.result = null;
        }
        if (target.index !== attempt.origin.index) {
          history.go(attempt.origin.index - target.index);
        } else saveAtOrigin(attempt);
        return;
      }
      const currentGuard = guard.current;
      if (!currentGuard?.isDirty() || target.index === position.index) {
        position = target;
        return;
      }
      event.stopImmediatePropagation();
      traversal = { origin: position, target: target.index, guard: currentGuard, phase: "restoring", result: null, started: false };
      moving.current = true;
      history.go(position.index - target.index);
    };

    const click = async (event: MouseEvent) => {
      if (!guard.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href); if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault(); event.stopPropagation(); if (moving.current) return;
      moving.current = true;
      try { if (await beforeLeave()) router.push(url.pathname + url.search + url.hash); } finally { moving.current = false; }
    };
    const unload = (event: BeforeUnloadEvent) => { if (guard.current?.isDirty()) { event.preventDefault(); event.returnValue = ""; } };
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    // Capture runs before Next's bubble listener so it cannot unmount the editor.
    window.addEventListener("popstate", pop, true);
    return () => {
      active = false; traversal = null; moving.current = false;
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", pop, true);
      // Next may wrap our methods later. In that case leave its wrapper intact;
      // our retired wrapper simply forwards without modifying state.
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
    };
  }, [beforeLeave, router]);
  return <Context.Provider value={{ register, beforeLeave }}>{children}</Context.Provider>;
}
export function useNavigationGuard() { const value = useContext(Context); if (!value) throw new Error("NavigationProvider is missing"); return value; }
