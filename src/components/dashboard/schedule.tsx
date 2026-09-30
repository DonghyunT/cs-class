"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Pencil, Trash2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import { Button } from "@/components/ui/button";
import { PLANNER_LIMIT, eventDate, seoulToday, type ClassEvent, type ScheduleData } from "@/lib/classroom/planner";
import { useSavedList } from "./use-saved-list";
import { composing } from "./todos";
import styles from "./dashboard.module.css";

export function ScheduleScreen({ teacher = false, classId }: { teacher?: boolean; classId?: string }) {
  const { session } = useSession();
  const selected = classId ?? (session?.role === "student" ? session.classId ?? undefined : session?.classIds[0]);
  return <AppShell teacher={teacher} title="반 일정">{session && selected ? <ScheduleList key={`${session.uid}:${selected}`} uid={session.uid} teacher={teacher} classId={selected} /> : <p className={styles.empty}>담당 반이 연결되면 일정을 확인할 수 있어요.</p>}</AppShell>;
}
export function ScheduleList({ uid, teacher, classId, summary = false }: { uid: string; teacher: boolean; classId?: string; summary?: boolean }) {
  const path = `classroom/schedule?${new URLSearchParams(classId ? { classId } : {})}`;
  const list = useSavedList<ClassEvent, ScheduleData>(path, `classroom/schedule/${classId ?? ""}`, uid);
  const [draft, setDraft] = useState<{ id: string | null; title: string; date: string; lessonId: string | null }>({ id: null, title: "", date: seoulToday(), lessonId: null });
  const [focus, setFocus] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLInputElement>(null);
  const { register, beforeLeave } = useNavigationGuard();
  const router = useRouter();
  const { send, flush, isDirty } = list;
  const home = teacher ? "/teacher" : "/student";
  useEffect(() => { if (focus) title.current?.focus(); }, [focus]);
  function submit() {
    if (!draft.title.trim() || (!draft.id && list.items.length >= PLANNER_LIMIT) || !form.current?.reportValidity()) return false;
    const item: ClassEvent = { ...draft, id: draft.id ?? crypto.randomUUID(), title: draft.title.trim() };
    if (!send({ id: item.id, item })) return false;
    setDraft({ id: null, title: "", date: seoulToday(), lessonId: null }); setFocus((value) => value + 1);
    return true;
  }
  useEffect(() => {
    if (summary || !teacher) return;
    return register({ isDirty: () => isDirty() || !!draft.title.trim() || !!draft.id, flush: async () => {
      if (draft.title.trim() || draft.id) {
        if (!draft.title.trim() || (!draft.id && list.items.length >= PLANNER_LIMIT) || !form.current?.reportValidity()) return false;
        const item: ClassEvent = { ...draft, id: draft.id ?? crypto.randomUUID(), title: draft.title.trim() };
        if (!send({ id: item.id, item })) return false;
        setDraft({ id: null, title: "", date: seoulToday(), lessonId: null });
      }
      return flush();
    } });
  }, [summary, teacher, register, isDirty, send, flush, draft, list.items.length]);
  // The concrete class comes from the authorized response, including the default class.
  const resolvedClassId = classId ?? list.data?.classroom.id;
  const today = seoulToday();
  const sorted = [...list.items].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const items = summary ? sorted.filter((item) => item.date >= today).slice(0, 3) : sorted;
  const locked = list.saving || !!list.error || !!list.loadError;
  return <section className={summary ? `${styles.panel} ${styles.schedulePanel}` : styles.page} aria-labelledby="schedule-heading">
    {!summary && <header className={styles.heading}><div><span className={styles.eyebrow}>우리 반 일정</span><h1>다가오는 일을 살펴봐요.</h1><p>날짜는 한국 시간 기준이에요. 날짜가 지나도 수업·제출은 계속할 수 있어요.</p></div><CalendarDays aria-hidden="true" /></header>}
    <div className={styles.sectionHeading}><div className={styles.sectionTitle}>{summary && <span className={`${styles.titleIcon} ${styles.scheduleIcon}`}><CalendarDays size={19} aria-hidden="true" /></span>}<h2 id="schedule-heading">{summary ? "다가오는 일정" : "전체 일정"}</h2></div>{summary ? <Link href={`${home}/schedule${teacher && classId ? `?classId=${encodeURIComponent(classId)}` : ""}`}>전체 보기 <ArrowRight size={15} aria-hidden="true" /></Link> : list.data && <label className={styles.classPicker}>담당 반{teacher ? <select value={list.data.classroom.id} onChange={async (event) => { const selected = event.target.value; if (await beforeLeave()) router.push(`${home}/schedule?classId=${encodeURIComponent(selected)}`); }}>{list.data.classrooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <span>{list.data.classroom.name}</span>}</label>}</div>
    {summary && list.data && <MonthCalendar today={today} events={list.data.items} />}
    {!summary && <button type="button" className={styles.textButton} disabled={locked} onClick={() => void list.refresh()}><RefreshCw size={15} aria-hidden="true" />일정 새로고침</button>}
    {list.loadError && <div className={styles.error} role="alert"><p>{list.loadError} {list.data && "마지막으로 조회한 일정이에요."}</p><Button variant="outline" disabled={list.saving} onClick={() => void list.refresh()}>일정 다시 불러오기</Button></div>}
    {!list.data && !list.loadError && <p role="status">일정을 불러오고 있어요.</p>}
    {list.data && <>
      {!items.length && <p className={styles.empty}>{summary ? "다가오는 일정이 없어요." : "아직 등록된 일정이 없어요."}{!teacher && " 선생님이 일정을 등록하면 여기에 보여요."}</p>}
      <ul className={styles.eventList}>{items.map((item) => <li key={item.id}>
        <time dateTime={item.date}>{eventDate(item.date)}{!summary && item.date < today && <small>지난 일정</small>}</time>
        <div><strong>{item.title}</strong>{item.lessonId && <Link href={teacher ? `/teacher/students?classId=${resolvedClassId}&lessonId=${encodeURIComponent(item.lessonId)}` : `/classroom/${encodeURIComponent(item.lessonId)}`}>{list.data!.lessons.find((lesson) => lesson.id === item.lessonId)?.title ?? "연결된 수업"}<ArrowRight size={14} aria-hidden="true" /></Link>}{list.changes.some((change) => change.id === item.id) && <small>{list.error ? "저장 실패 · 변경 보관 중" : "저장 중"}</small>}</div>
        {!summary && teacher && <div className={styles.rowActions}><button type="button" aria-label={`${item.title} 수정`} disabled={locked} onClick={() => { setDraft(item); setFocus((value) => value + 1); }}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`${item.title} 삭제`} disabled={locked} onClick={() => { send({ id: item.id, item: null }); setFocus((value) => value + 1); }}><Trash2 size={16} aria-hidden="true" /></button></div>}
      </li>)}</ul>
      {!summary && teacher && <ScheduleForm key={resolvedClassId} resolvedClassId={resolvedClassId} draft={draft} setDraft={setDraft} form={form} title={title} locked={locked} lessons={list.data.lessons} submit={submit} cancel={() => { setDraft({ id: null, title: "", date: seoulToday(), lessonId: null }); setFocus((value) => value + 1); }} />}
      {!summary && teacher && list.items.length >= PLANNER_LIMIT && <p className={styles.muted}>파일럿은 반 일정 {PLANNER_LIMIT}개까지 저장해요. 필요 없는 일정을 지워 주세요.</p>}
      {!summary && teacher && <p role="status" className={styles.saveStatus}>{list.saving ? "일정을 저장하고 있어요." : list.error ? "아직 저장하지 못했어요." : list.loadError ? "마지막 조회 자료 · 최신 기록 확인 필요" : list.saved ? "저장 완료" : "담당 선생님이 관리하는 반 일정이에요."}</p>}
      {list.error && <div className={styles.error} role="alert"><p>{list.error} 등록·수정·삭제 의도를 보관했어요. 재시도하면 같은 항목에는 내 변경을 적용해요.</p><Button variant="outline" onClick={() => void list.retry()}>최신 기록에 내 변경 재시도</Button></div>}
    </>}
  </section>;
}

function MonthCalendar({ today, events }: { today: string; events: ClassEvent[] }) {
  const [year, month] = today.split("-").map(Number);
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, index) => index - start + 1);
  const counts = new Map<string, number>();
  for (const item of events) counts.set(item.date, (counts.get(item.date) ?? 0) + 1);

  return <table className={styles.monthCalendar} aria-label={`${year}년 ${month}월 일정 달력`}>
    <caption><span>{year}년 {month}월</span><span className={styles.calendarKey}><span aria-hidden="true" />일정이 있는 날</span></caption>
    <thead><tr>{["월", "화", "수", "목", "금", "토", "일"].map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
    <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map((day, weekday) => {
      if (day < 1 || day > days) return <td key={weekday} />;
      const date = `${today.slice(0, 7)}-${String(day).padStart(2, "0")}`;
      const count = counts.get(date) ?? 0;
      return <td key={weekday}><time dateTime={date} aria-current={date === today ? "date" : undefined} aria-label={`${month}월 ${day}일${count ? `, 일정 ${count}개` : ""}`} data-event={count > 0}>{day}{count > 0 && <span className={styles.calendarDot} aria-hidden="true" />}</time></td>;
    })}</tr>)}</tbody>
  </table>;
}

function ScheduleForm({ resolvedClassId, draft, setDraft, form, title, locked, lessons, submit, cancel }: {
  resolvedClassId?: string;
  draft: { id: string | null; title: string; date: string; lessonId: string | null };
  setDraft: (value: typeof draft) => void;
  form: React.RefObject<HTMLFormElement | null>; title: React.RefObject<HTMLInputElement | null>;
  locked: boolean; lessons: ScheduleData["lessons"]; submit: () => boolean; cancel: () => void;
}) {
  return <form ref={form} className={styles.eventForm} onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <h2>{draft.id ? "일정 수정" : "일정 등록"}</h2>
    <label>일정 제목<input ref={title} required autoComplete="off" maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter" && composing(event)) event.preventDefault(); if (event.key === "Escape" && !composing(event)) { event.preventDefault(); cancel(); } }} /></label>
    <div className={styles.formColumns}><label>날짜 · 한국 시간<input required type="date" min="2000-01-01" max="2100-12-31" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>연결할 수업 · 선택<select value={draft.lessonId ?? ""} onChange={(event) => setDraft({ ...draft, lessonId: event.target.value || null })}><option value="">연결하지 않음</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label></div>
    <div className={styles.formActions}><Button type="submit" disabled={locked || !resolvedClassId || !draft.title.trim()}>{draft.id ? "일정 수정 저장" : "일정 저장"}</Button>{draft.id && <Button variant="outline" type="button" onClick={cancel}>수정 취소</Button>}</div>
  </form>;
}
