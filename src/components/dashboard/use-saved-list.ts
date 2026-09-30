"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/classroom/client";
import type { SavedList } from "@/lib/classroom/planner";

type Change<T> = { id: string; item: T | null };
function apply<T extends { id: string }>(items: T[], change: Change<T>) {
  if (!change.item) return items.filter((item) => item.id !== change.id);
  return items.some((item) => item.id === change.id) ? items.map((item) => item.id === change.id ? change.item! : item) : [...items, change.item];
}
export function useSavedList<T extends { id: string }, D extends SavedList<T> = SavedList<T>>(path: string, savePath: string, uid: string) {
  const [data, setData] = useState<D | null>(null);
  const [changes, setChanges] = useState<Change<T>[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const current = useRef<D | null>(null);
  const pending = useRef<Change<T>[]>([]);
  const running = useRef<Promise<boolean> | null>(null);
  const failed = useRef(false);
  const alive = useRef(false);
  const loadVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const value = await api<D>(path, undefined, "GET", uid);
      if (!alive.current || version !== loadVersion.current) return false;
      current.current = value; setData(value); setLoadError("");
      return true;
    } catch (problem) {
      if (alive.current && version === loadVersion.current) setLoadError(problem instanceof Error ? problem.message : "목록을 불러오지 못했어요.");
      return false;
    }
  }, [path, uid]);
  const flush = useCallback((): Promise<boolean> => {
    if (running.current) return running.current;
    if (!pending.current.length) return Promise.resolve(true);
    if (failed.current || !current.current) return Promise.resolve(false);
    setSaving(true); setSaved(false);
    running.current = (async () => {
      try {
        while (pending.current.length && alive.current) {
          const previous = current.current!;
          const value = await api<D>(savePath, { revision: previous.revision, items: apply(previous.items, pending.current[0]) }, "POST", uid);
          if (!alive.current) return false;
          current.current = value; setData(value);
          pending.current = pending.current.slice(1); setChanges([...pending.current]);
        }
        if (alive.current) { setError(""); setSaved(true); }
        return alive.current;
      } catch (problem) {
        if (alive.current) { failed.current = true; setError(problem instanceof Error ? problem.message : "저장하지 못했어요."); }
        return false;
      } finally {
        running.current = null;
        if (alive.current) setSaving(false);
      }
    })();
    return running.current;
  }, [savePath, uid]);
  const send = useCallback((change: Change<T>) => {
    if (!current.current || failed.current) return false;
    // Stop an older refresh from replacing a save acknowledgement.
    loadVersion.current += 1;
    pending.current = [...pending.current, change]; setChanges([...pending.current]); setSaved(false);
    void flush();
    return true;
  }, [flush]);
  const retry = useCallback(async () => {
    if (running.current) return false;
    if (!(await refresh())) return false;
    // The explicit retry reapplies only the retained intent to the latest list.
    failed.current = false; setError("");
    return flush();
  }, [refresh, flush]);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) void refresh(); });
    return () => { alive.current = false; loadVersion.current += 1; };
  }, [refresh]);
  const items = changes.reduce((items, change) => change.item ? apply(items, change) : items, data?.items ?? []);
  const isDirty = useCallback(() => pending.current.length > 0, []);
  return { data, items, changes, error, loadError, saving, saved, send, refresh, retry, flush, isDirty };
}
