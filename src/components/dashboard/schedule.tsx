"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Pencil, Trash2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PLANNER_LIMIT, TIMETABLE_SCHOOL, eventDate, seoulToday, type ClassEvent, type ScheduleData } from "@/lib/classroom/planner";
import { api } from "@/lib/classroom/client";
import { useSavedList } from "./use-saved-list";
import { composing } from "./todos";
import { LoadingList } from "./loading-list";
import styles from "./dashboard.module.css";

export function ScheduleScreen({ teacher = false, classId }: { teacher?: boolean; classId?: string }) {
  const { session } = useSession();
  const selection = useTeacherClass(classId);
  const selected = teacher ? selection.classId : session?.classId ?? undefined;
  return <AppShell teacher={teacher} title="반 일정">{session && selected ? <ScheduleList key={`${session.uid}:${selected}`} uid={session.uid} teacher={teacher} classId={selected} /> : <p className={styles.empty}>담당 반이 연결되면 일정을 확인할 수 있어요.</p>}</AppShell>;
}
export function ScheduleList({ uid, teacher, classId, summary = false }: { uid: string; teacher: boolean; classId?: string; summary?: boolean }) {
  const path = `classroom/schedule?${new URLSearchParams(classId ? { classId } : {})}`;
  const list = useSavedList<ClassEvent, ScheduleData>(path, `classroom/schedule/${classId ?? ""}`, uid);
  const [draft, setDraft] = useState<{ id: string | null; title: string; date: string; lessonId: string | null }>({ id: null, title: "", date: seoulToday(), lessonId: null });
  const [focus, setFocus] = useState(0);
  const [refreshingTimetable, setRefreshingTimetable] = useState(false);
  const [timetableMessage, setTimetableMessage] = useState("");
  const [timetableError, setTimetableError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLInputElement>(null);
  const { register, beforeLeave } = useNavigationGuard();
  const router = useRouter();
  const { send, flush, isDirty } = list;
  const home = teacher ? "/teacher" : "/student";
  useEffect(() => {
    if (focus) { title.current?.focus(); title.current?.scrollIntoView({ block: "center" }); }
  }, [focus]);
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
  const timetable = list.data?.timetable;
  const sorted = [
    ...list.items.map((item) => ({ ...item, slot: null })),
    ...(timetable?.items ?? []).map((slot) => ({ id: slot.id, title: `정보 · ${slot.period}교시`, date: slot.date, lessonId: null, slot })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.slot?.period ?? 99) - (b.slot?.period ?? 99) || a.id.localeCompare(b.id));
  const upcoming = sorted.filter((item) => item.date >= today);
  const past = sorted.filter((item) => item.date < today);
  const items = summary ? upcoming.slice(0, 5) : upcoming;
  const locked = list.saving || !!list.error || !!list.loadError || refreshingTimetable;
  const renderEvents = (events: typeof sorted) => <ul className={styles.eventList}>{events.map((item) => <li key={item.id}>
    <time dateTime={item.date}>{eventDate(item.date)}{!summary && item.date < today && <small>지난 일정</small>}</time>
    <div><strong>{item.title}</strong>{item.slot && <><small>{item.slot.startsAt} 시작 · 학교 시간표</small>{item.slot.changed && <small className={styles.timetableChanged}>변경된 수업</small>}</>}{item.lessonId && <Link href={teacher ? `/teacher/students?classId=${resolvedClassId}&lessonId=${encodeURIComponent(item.lessonId)}` : `/classroom/${encodeURIComponent(item.lessonId)}?from=${summary ? "dashboard" : "lessons"}`}>{list.data!.lessons.find((lesson) => lesson.id === item.lessonId)?.title ?? "연결된 수업"}<ArrowRight size={14} aria-hidden="true" /></Link>}{list.changes.some((change) => change.id === item.id) && <small>{list.error ? "저장 실패 · 변경 보관 중" : "저장 중"}</small>}</div>
    {!summary && teacher && !item.slot && <div className={styles.rowActions}><button type="button" aria-label={`${item.title} 수정`} disabled={locked} onClick={() => { setDraft({ id: item.id, title: item.title, date: item.date, lessonId: item.lessonId }); setFocus((value) => value + 1); }}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`${item.title} 삭제`} disabled={locked} onClick={() => { send({ id: item.id, item: null }); setFocus((value) => value + 1); }}><Trash2 size={16} aria-hidden="true" /></button></div>}
  </li>)}</ul>;
  async function refreshSchool() {
    if (!resolvedClassId || refreshingTimetable || !(await flush())) return;
    setRefreshingTimetable(true); setTimetableError(""); setTimetableMessage("");
    try {
      await api<ScheduleData>(`classroom/timetable/${encodeURIComponent(resolvedClassId)}`, {}, "POST", uid);
      if (await list.refresh()) setTimetableMessage("학교 시간표를 갱신했어요.");
    } catch (error) {
      setTimetableError(error instanceof Error ? error.message : "학교 시간표를 갱신하지 못했어요.");
      await list.refresh();
    } finally { setRefreshingTimetable(false); }
  }
  return <section className={summary ? `${styles.panel} ${styles.schedulePanel}` : styles.page} aria-labelledby="schedule-heading">
    {!summary && <header className={styles.heading}><div><span className={styles.eyebrow}>우리 반 일정</span><h1>다가오는 일을 살펴봐요.</h1><p>날짜는 한국 시간 기준이에요. 날짜가 지나도 수업·제출은 계속할 수 있어요.</p></div><CalendarDays aria-hidden="true" /></header>}
    <div className={styles.sectionHeading}><div className={styles.sectionTitle}>{summary && <span className={`${styles.titleIcon} ${styles.scheduleIcon}`}><CalendarDays size={19} aria-hidden="true" /></span>}<h2 id="schedule-heading">{summary ? "다가오는 일정" : "오늘 이후 일정"}</h2></div>{summary ? <Link href={`${home}/schedule${teacher && classId ? `?classId=${encodeURIComponent(classId)}` : ""}`}>{teacher ? "일정 관리" : "전체 보기"} <ArrowRight size={15} aria-hidden="true" /></Link> : <div className={styles.sectionTools}>{list.data && <label className={styles.classPicker}>담당 반{teacher ? <Select label="담당 반" value={list.data.classroom.id} onValueChange={async (selected) => { if (await beforeLeave()) router.push(`${home}/schedule?classId=${encodeURIComponent(selected)}`); }} options={list.data.classrooms.map((item) => ({ value: item.id, label: item.name }))} /> : <span>{list.data.classroom.name}</span>}</label>}{teacher && list.data && <Button variant="outline" onClick={() => setFocus(value => value + 1)}>일정 등록</Button>}<Button variant="ghost" className={styles.compactControl} aria-label="일정 새로고침" title="일정 새로고침" disabled={locked} onClick={() => void list.refresh()}><RefreshCw size={15} aria-hidden="true" />새로고침</Button></div>}</div>
    {summary && <MonthCalendar today={today} events={sorted} pending={!list.data} />}
    {list.loadError && <div className={styles.error} role="alert"><p>{list.loadError} {list.data && "마지막으로 조회한 일정이에요."}</p><Button variant="outline" disabled={list.saving} onClick={() => void list.refresh()}>일정 다시 불러오기</Button></div>}
    {!list.data && !list.loadError && <LoadingList label="일정을 불러오고 있어요." />}
    {list.data && <>
      {!summary && timetable && <div className={styles.timetableNotice}>
        <div><strong>{TIMETABLE_SCHOOL.name} · 정보 수업 시간표</strong><p>{timetable.scheduled ? "매일 저녁 7시경 갱신해요." : "선생님이 학교 시간표를 가져오면 각 반에 표시돼요."} {timetable.checkedAt ? <>마지막 확인 <time dateTime={new Date(timetable.checkedAt).toISOString()}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: false }).format(timetable.checkedAt)}</time></> : "아직 가져온 시간표가 없어요."}</p>
          {timetable.rangeStart && timetable.rangeEnd && <p>공개된 기간 {eventDate(timetable.rangeStart)} ~ {eventDate(timetable.rangeEnd)}</p>}
          <a href={TIMETABLE_SCHOOL.url} target="_blank" rel="noopener noreferrer">학교 시간표 보기<span className="sr-only"> · 새 창</span></a>
        </div>
        {teacher && <Button variant="ghost" className={styles.compactControl} aria-label={refreshingTimetable ? "학교 시간표 갱신 중" : "학교 시간표 지금 갱신"} title="학교 시간표 지금 갱신" disabled={list.saving || !!list.error || !!list.loadError || !resolvedClassId || (!!timetable.refreshing && !refreshingTimetable)} aria-disabled={refreshingTimetable} aria-busy={refreshingTimetable} onClick={() => void refreshSchool()}><RefreshCw size={15} aria-hidden="true" />{refreshingTimetable ? "갱신 중" : "갱신"}</Button>}
      </div>}
      {timetable?.error && <p className={styles.error}>{timetable.error}</p>}
      {timetable?.stale && <p className={styles.muted}>시간표 갱신이 늦어지고 있어요. 마지막 확인 시각을 확인해 주세요.</p>}
      {!summary && timetableError && <p className={styles.error} role="alert">{timetableError}</p>}
      {!summary && <p role="status" className={styles.saveStatus}>{refreshingTimetable ? "학교의 공개 시간표를 가져오고 있어요." : timetableMessage}</p>}
      {!items.length && <p className={styles.empty}>{summary ? "다가오는 일정이 없어요." : sorted.length ? "오늘 이후 일정이 없어요." : "아직 등록된 일정이 없어요."}{!teacher && !sorted.length && " 선생님이 일정을 등록하면 여기에 보여요."}</p>}
      {renderEvents(items)}
      {!summary && past.length > 0 && <details className={styles.scheduleHistory}><summary>지난 일정 {past.length}개</summary>{renderEvents(past)}</details>}
      {summary && upcoming.length > items.length && <Link className={styles.scheduleRemainder} href={`${home}/schedule${teacher && resolvedClassId ? `?classId=${encodeURIComponent(resolvedClassId)}` : ""}`}>외 {upcoming.length - items.length}개 · 전체 보기<ArrowRight size={15} aria-hidden="true" /></Link>}
      {!summary && teacher && <ScheduleForm key={resolvedClassId} resolvedClassId={resolvedClassId} draft={draft} setDraft={setDraft} form={form} title={title} locked={locked} lessons={list.data.lessons} submit={submit} cancel={() => { setDraft({ id: null, title: "", date: seoulToday(), lessonId: null }); setFocus((value) => value + 1); }} />}
      {!summary && teacher && list.items.length >= PLANNER_LIMIT && <p className={styles.muted}>파일럿은 반 일정 {PLANNER_LIMIT}개까지 저장해요. 필요 없는 일정을 지워 주세요.</p>}
      {!summary && teacher && <p role="status" className={styles.saveStatus}>{list.saving ? "일정을 저장하고 있어요." : list.error ? "아직 저장하지 못했어요." : list.loadError ? "마지막 조회 자료 · 최신 기록 확인 필요" : list.saved ? "저장 완료" : "담당 선생님이 관리하는 반 일정이에요."}</p>}
      {list.error && <div className={styles.error} role="alert"><p>{list.error} 등록·수정·삭제 의도를 보관했어요. 재시도하면 같은 항목에는 내 변경을 적용해요.</p><Button variant="outline" onClick={() => void list.retry()}>최신 기록에 내 변경 재시도</Button></div>}
    </>}
  </section>;
}

function MonthCalendar({ today, events, pending }: { today: string; events: Pick<ClassEvent, "date">[]; pending: boolean }) {
  const [year, month] = today.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, index) => index - start + 1);
  const counts = new Map<string, number>();
  for (const item of events) counts.set(item.date, (counts.get(item.date) ?? 0) + 1);

  return <table className={styles.monthCalendar} aria-label={`${year}년 ${month}월 일정 달력`}>
    <caption><span>{year}년 {month}월</span><span className={styles.calendarKey}>{pending ? "일정 확인 전" : <><span aria-hidden="true" />일정이 있는 날</>}</span></caption>
    <thead><tr>{["일", "월", "화", "수", "목", "금", "토"].map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
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
    <div className={styles.formColumns}><label>날짜 · 한국 시간<input required type="date" min="2000-01-01" max="2100-12-31" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>연결할 수업 · 선택<Select label="연결할 수업 · 선택" value={draft.lessonId ?? ""} onValueChange={(value) => setDraft({ ...draft, lessonId: value || null })} options={[{ value: "", label: "연결하지 않음" }, ...lessons.map((lesson) => ({ value: lesson.id, label: lesson.title }))]} /></label></div>
    <div className={styles.formActions}><Button type="submit" disabled={locked || !resolvedClassId || !draft.title.trim()}>{draft.id ? "일정 수정 저장" : "일정 저장"}</Button>{draft.id && <Button variant="outline" type="button" onClick={cancel}>수정 취소</Button>}</div>
  </form>;
}
