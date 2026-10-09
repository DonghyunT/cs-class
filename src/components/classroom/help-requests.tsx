"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/classroom/client";
import type { HelpRequest, HelpSnapshot } from "@/lib/classroom/help";
import { helpContextLabel } from "@/lib/classroom/help";
import { resumeLabelFor } from "@/lib/classroom/lesson-navigation";
import { parseEntryProject, entryInstructionLabel } from "@/lib/classroom/entry-project";
import { programmingProjectLines } from "@/lib/classroom/programming-entry";
import { ReviewProjectPreview } from "@/components/teacher/work-details";
import styles from "./help.module.css";

const message = (error: unknown) => error instanceof Error ? error.message : "도움 요청을 확인하지 못했어요.";
const time = (value: number) => new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(value);

export type HelpRequestsStatus = { classId: string; count: number | null; lastCheckedAt: number | null; loading: boolean; error: string };

export function HelpRequests({ classId, lessonId, onStatusChange }: { classId: string; lessonId?: string; onStatusChange?: (status: HelpRequestsStatus) => void }) {
  const [requests, setRequests] = useState<HelpRequest[]>([]), [error, setError] = useState("");
  const [loading, setLoading] = useState(false), [selected, setSelected] = useState<HelpRequest | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const version = useRef(0), inFlight = useRef(false);
  const refreshButton = useRef<HTMLButtonElement>(null), restoreRefreshFocus = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; const current = ++version.current; setLoading(true);
    try { const value = await api<{ requests: HelpRequest[] }>(`classroom/help?classId=${encodeURIComponent(classId)}`); if (current === version.current) { setRequests(value.requests); setLastCheckedAt(Date.now()); setError(""); } }
    catch (problem) { if (current === version.current) setError(message(problem)); }
    finally { if (current === version.current) { setLoading(false); inFlight.current = false; } }
  }, [classId]);
  useEffect(() => {
    let active = true; queueMicrotask(() => { if (active) void refresh(); });
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { active = false; version.current += 1; inFlight.current = false; clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    if (loading || selected || !restoreRefreshFocus.current) return;
    restoreRefreshFocus.current = false;
    if (document.activeElement === document.body) refreshButton.current?.focus();
  }, [loading, selected]);
  const visible = requests.filter(item => item.classId === classId && (!lessonId || item.lessonId === lessonId));
  useEffect(() => {
    onStatusChange?.({ classId, count: lastCheckedAt === null ? null : visible.length, lastCheckedAt, loading, error });
  }, [classId, lastCheckedAt, visible.length, loading, error, onStatusChange]);
  return <section className={styles.panel} aria-labelledby={`help-heading-${lessonId ?? "all"}`}>
    <div className={styles.heading}><h2 id={`help-heading-${lessonId ?? "all"}`} tabIndex={-1}><Hand size={19} aria-hidden="true" />손든 학생 {lastCheckedAt !== null && <span>{visible.length}</span>}</h2><Button ref={refreshButton} variant="ghost" size="icon" aria-label="손들기 새로고침" title="새로고침" disabled={loading} onClick={() => { restoreRefreshFocus.current = true; void refresh(); }}><RefreshCw size={16} aria-hidden="true" /></Button></div>
    {lastCheckedAt !== null && <p className={styles.checked}>마지막 확인 <time dateTime={new Date(lastCheckedAt).toISOString()}>{time(lastCheckedAt)}</time>{error && " · 최신 조회 실패"}</p>}
    {error && <p role="alert">{error}</p>}
    {visible.length ? <ul className={styles.requests}>{visible.map(item => <li key={item.id}><button type="button" onClick={() => setSelected(item)}><span><strong>{item.nickname || item.studentId}</strong>{item.nickname && <small>{item.studentId}</small>}<small className={styles.context}>{helpContextLabel(item)}</small></span><time>{time(item.requestedAt)}</time></button></li>)}</ul> : <p className={styles.empty}>{loading || lastCheckedAt === null && !error ? "도움 요청을 확인하고 있어요." : lastCheckedAt === null ? "새로고침으로 도움 요청을 다시 확인해 주세요." : "도움 요청이 들어오면 여기에서 확인해요."}</p>}
    <Dialog open={Boolean(selected && selected.classId === classId)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className={styles.dialog}><DialogHeader><DialogTitle>{selected?.nickname || selected?.studentId} 학생의 도움 요청</DialogTitle><DialogDescription>손들 때 저장한 학습 위치와 작품을 확인해요.</DialogDescription></DialogHeader>{selected && selected.classId === classId && <Snapshot key={selected.id} request={selected} onResolved={() => { restoreRefreshFocus.current = true; setSelected(current => current?.id === selected.id ? null : current); setRequests(items => items.filter(item => item.id !== selected.id)); version.current += 1; inFlight.current = false; void refresh(); }} />}</DialogContent></Dialog>
  </section>;
}

function Snapshot({ request, onResolved }: { request: HelpRequest; onResolved: () => void }) {
  const [snapshot, setSnapshot] = useState<HelpSnapshot | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [resolving, setResolving] = useState(false);
  const version = useRef(0);
  const refreshButton = useRef<HTMLButtonElement>(null), restoreRefreshFocus = useRef(false);
  const load = useCallback(async (latest = false) => {
    const current = ++version.current; setLoading(true);
    try { const value = await api<HelpSnapshot>(`classroom/help/${encodeURIComponent(request.uid)}?id=${request.id}${latest ? "&latest=1" : ""}`); if (current === version.current) { setSnapshot(value); setError(""); } }
    catch (problem) { if (current === version.current) setError(message(problem)); }
    finally { if (current === version.current) setLoading(false); }
  }, [request.id, request.uid]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; version.current += 1; }; }, [load]);
  useEffect(() => {
    if (loading || !restoreRefreshFocus.current) return;
    restoreRefreshFocus.current = false;
    if (document.activeElement === document.body) refreshButton.current?.focus();
  }, [loading]);
  async function resolve() {
    const current = version.current;
    setResolving(true); setError("");
    try { await api(`classroom/help/${encodeURIComponent(request.uid)}/resolve`, { id: request.id }); if (current === version.current) onResolved(); }
    catch (problem) { if (current === version.current) setError(message(problem)); }
    finally { if (current === version.current) setResolving(false); }
  }
  const work = snapshot?.work, lesson = snapshot?.lesson;
  const project = work?.draft.programming ? work.draft.programming.projects[work.draft.programming.mission] : work?.draft.entryProject;
  const lines = work?.draft.programming ? programmingProjectLines(project ?? "") : parseEntryProject(project)?.threads.flat().map(entryInstructionLabel);
  return <div className={styles.snapshot}>
    <div className={styles.snapshotTools}><span>{snapshot ? `${snapshot.latest ? "최근 저장본" : "요청 당시 저장본"} · ${time(snapshot.snapshotAt)}` : "저장본 확인 중…"}</span><Button ref={refreshButton} variant="outline" disabled={loading || resolving} onClick={() => { restoreRefreshFocus.current = true; void load(true); }}><RefreshCw size={16} aria-hidden="true" />새로고침</Button></div>
    {error && <p role="alert">{error}</p>}
    {work && lesson && <><h3>{lesson.title}</h3><p className={styles.location}>학습 위치 · {resumeLabelFor(lesson, work)}</p><div className={styles.preview} aria-label="저장된 실습 작품"><h4>실습 작품</h4>{work.draft.reviewProject ? <ReviewProjectPreview project={work.draft.reviewProject} /> : <ol>{(lines?.length ? lines : work.draft.practiceOrder.map(id => lesson.practice.blocks.find(block => block.id === id)?.label ?? id)).map((line, index) => <li key={index}>{line}</li>)}</ol>}{work.draft.programming?.reflection && <p>{work.draft.programming.reflection}</p>}</div></>}
    <div className={styles.footer}><Button disabled={loading || resolving || !snapshot} onClick={() => void resolve()}>{resolving ? "처리 중…" : "도움 완료"}</Button></div>
  </div>;
}
