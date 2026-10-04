"use client";

import Link from "next/link";
import { Toast } from "@base-ui/react/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardArt } from "@/components/dashboard-art";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SuccessToasts } from "@/components/ui/toast";
import { classroomApi } from "@/lib/classroom/client";
import { practiceMatches, progressFor, STATUS_LABELS, submissionCountFor } from "@/lib/classroom/progress";
import { programmingMissions, programmingProjectMatches } from "@/lib/classroom/programming-entry";
import type { ClassSettings, Lesson, Progress, StudentRow, TeacherDashboard, Work } from "@/lib/classroom/types";
import { ManageLessons, ResetPassword, SubmissionViewer } from "./dialogs";
import { dateLabel, problemMessage } from "./presentation";
import styles from "./teacher.module.css";

type TeacherView = { view: "classes" | "students"; classId?: string; lessonId?: string; studentId?: string };
export function TeacherDashboardView(props: TeacherView) {
  const { session } = useSession();
  return <AppShell title={props.view === "classes" ? "수업 관리" : "학생 현황·계정"} teacher>{session && session.role !== "student" && (session.classIds.length ? <TeacherWorkspace key={`${session.uid}:${props.classId}:${props.lessonId}:${props.studentId}`} instructor={session.role === "instructor"} {...props} /> : <div className={styles.empty}><Users size={28} aria-hidden="true" /><h1>아직 담당 반이 없어요.</h1><p>담당 반이 연결되면 수업과 학생 기록을 확인할 수 있어요.</p></div>)}</AppShell>;
}

function TeacherWorkspace({ instructor, view, classId, lessonId, studentId }: { instructor: boolean } & TeacherView) {
  const { classId: selectedClassId, setClassId } = useTeacherClass(classId);
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState(lessonId);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toastManager] = useState(() => Toast.createToastManager());
  const [search, setSearch] = useState(studentId ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submissionFilter, setSubmissionFilter] = useState("all");
  const [filterClassId, setFilterClassId] = useState(selectedClassId);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const request = useRef(0);
  const busy = useRef(false);
  const mutating = useRef(false);
  const lastFetched = useRef(0);
  if (filterClassId !== selectedClassId) {
    setFilterClassId(selectedClassId); setSelectedLessonId(undefined); setSearch(""); setStatusFilter("all"); setSubmissionFilter("all");
  }

  const load = useCallback((): Promise<TeacherDashboard | null> => {
    if (mutating.current) return Promise.resolve(null);
    const version = ++request.current;
    busy.current = true;
    return classroomApi.teacher(selectedClassId, selectedLessonId).then((result) => {
      if (version !== request.current) return null;
      setData(result); setError("");
      const now = Date.now(); setUpdatedAt(now); lastFetched.current = now;
      return result;
    }, (problem: unknown) => {
      if (version === request.current) setError(problemMessage(problem));
      return null;
    }).finally(() => {
      if (version === request.current) { busy.current = false; setFetching(false); }
    });
  }, [selectedClassId, selectedLessonId]);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible" && !busy.current && !mutating.current && Date.now() - lastFetched.current >= 10_000) { setFetching(true); void load(); }
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      request.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load]);

  const lockMutation = useCallback((locked: boolean) => {
    mutating.current = locked;
    if (locked) { request.current += 1; busy.current = false; setFetching(false); }
  }, []);

  const matching = data && (!selectedClassId || selectedClassId === data.classroom.id) && (!selectedLessonId || selectedLessonId === data.selectedLessonId);
  const active = matching ? data : null;
  const lesson = active?.lessons.find((item) => item.id === active.selectedLessonId);
  const current = active?.lessons.find((item) => item.id === active.classroom.currentLessonId);
  const openedLessons = active?.lessons.filter((item) => active.classroom.openedLessonIds.includes(item.id)) ?? [];
  const filtered = active?.students.filter((student) => student.studentId.includes(search.trim()) && (!lesson || (statusFilter === "all" || progressFor(lesson, student.work).status === statusFilter) && (submissionFilter === "all" || (submissionCountFor(lesson, student.work) > 0) === (submissionFilter === "submitted")))) ?? [];
  const completed = active && lesson ? active.students.filter((student) => progressFor(lesson, student.work).status === "completed").length : 0;
  const submitted = active && lesson ? active.students.filter((student) => submissionCountFor(lesson, student.work) > 0).length : 0;

  function resetFilters() { setSearch(""); setStatusFilter("all"); setSubmissionFilter("all"); }

  function selectClass(classId: string) {
    if (!data?.classrooms.some((item) => item.id === classId) || classId === selectedClassId) return;
    toastManager.close();
    request.current += 1; setFetching(true); setClassId(classId); setSelectedLessonId(undefined); resetFilters(); setNotice(""); setError("");
  }

  function updateSettings(settings: ClassSettings) {
    setData((previous) => previous ? { ...previous, classroom: settings, classrooms: previous.classrooms.map((item) => item.id === settings.id ? settings : item) } : null);
    toastManager.add({ id: "class-settings", title: `${settings.name} 수업 설정을 저장했어요.`, priority: "low" });
    setFetching(true);
    void load();
  }

  return <div className={styles.page}>
    <SuccessToasts manager={toastManager} />
    <div className={styles.heading}>
      <div><p className={styles.kicker}>선생님 공간</p><h1>우리 반 수업을 살펴봐요.</h1><p>수업을 준비하고, 학생이 어디까지 해냈는지 확인해요.</p></div>
      <span className={styles.role}><ShieldCheck size={16} aria-hidden="true" />{instructor ? "강사 · 담당 반 관리" : "교사 · 수업 관리"}</span>
    </div>
    <div className={styles.toolbar}>
      <label className={styles.classPicker}>담당 반<Select label="담당 반" value={selectedClassId ?? data?.classroom.id ?? ""} onValueChange={selectClass} disabled={!data?.classrooms.length} options={data?.classrooms.length ? data.classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name })) : [{ value: "", label: "반 정보 확인 중" }]} /></label>
      <div className={styles.refresh}><span>{fetching ? "기록을 확인하고 있어요." : updatedAt && active ? `${dateLabel(updatedAt)} 확인` : "서버에 저장된 기록을 확인해요."}</span><Button variant="outline" aria-label="수업 새로고침" disabled={fetching} onClick={() => { setFetching(true); void load(); }}><RefreshCw size={16} aria-hidden="true" /><span>새로고침</span></Button></div>
    </div>
    {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="outline" disabled={fetching} onClick={() => { setFetching(true); void load(); }}>다시 불러오기</Button>{active && <span>마지막으로 확인한 기록을 표시하고 있어요.</span>}</div>}
    <div role="status" aria-live="polite" className={notice ? styles.notice : styles.silentNotice}>{notice && <><CheckCircle2 size={18} aria-hidden="true" /><span>{notice}</span></>}</div>
    {!active && !error && <div className={styles.loading} role="status"><span className={styles.loadingBar} /><p>반과 학습 기록을 불러오고 있어요.</p></div>}
    {active && <>
      {view === "classes" && <section className={styles.currentLesson} aria-labelledby="current-lesson-title">
        <div className={styles.currentCopy}><p className={styles.kicker}><span className={styles.dot} />{active.classroom.name} · 이번 수업</p><h2 id="current-lesson-title">{current?.title ?? "이번 수업을 지정해 주세요."}</h2><p>{current?.description ?? "수업을 열고 지정하면 학생 대시보드에 먼저 보여요."}</p><span className={styles.currentMeta}>열린 수업 {active.classroom.openedLessonIds.length}개 · 기존 수업은 계속 복습할 수 있어요.</span><ManageLessons key={active.classroom.id} classroom={active.classroom} lessons={active.lessons} onSaved={updateSettings} onLock={lockMutation} onRefresh={load} /></div>
        <DashboardArt variant="teacher" className={styles.heroArt} />
      </section>}
      {view === "classes" && <section className={styles.openedLessons} aria-labelledby="opened-lessons-title">
        <div className={styles.sectionHeading}><div><h2 id="opened-lessons-title">열린 수업</h2><p>학생이 학습하고 복습할 수 있는 수업이에요.</p></div><span className={styles.openedCount}>{openedLessons.length}개</span></div>
        {openedLessons.length ? <ul className={styles.lessonList}>{openedLessons.map((item) => {
          const isCurrent = item.id === active.classroom.currentLessonId;
          return <li key={item.id} className={`${styles.lessonCard} ${isCurrent ? styles.currentCard : ""}`}>
            <span className={`${styles.lessonBadge} ${isCurrent ? styles.currentBadge : ""}`}>{isCurrent ? "이번 수업" : "복습 가능"}</span>
            <h3>{item.title}</h3><p>{item.description}</p>
          </li>;
        })}</ul> : <div className={styles.empty}><h3>아직 열린 수업이 없어요.</h3><p>위의 수업 관리에서 학생에게 열어 줄 수업을 선택해 주세요.</p></div>}
      </section>}
      {view === "students" && <section className={styles.students} aria-labelledby="students-title">
        <div className={styles.sectionHeading}><div><h2 id="students-title">학생별 학습 현황</h2><p>개념·퀴즈·실습의 진행과 제출된 작품을 확인해요.</p></div><label className={styles.lessonPicker}>확인할 수업<Select label="확인할 수업" value={active.selectedLessonId ?? ""} disabled={!active.classroom.openedLessonIds.length} onValueChange={(value) => { request.current += 1; setFetching(true); setSelectedLessonId(value); resetFilters(); setError(""); }} options={[...(!active.selectedLessonId ? [{ value: "", label: "열린 수업이 없어요" }] : []), ...active.lessons.filter((item) => active.classroom.openedLessonIds.includes(item.id)).map((item) => ({ value: item.id, label: item.title }))]} /></label></div>
        <div className={styles.summary}>
          <div><Users size={19} aria-hidden="true" /><span>등록 학생</span><strong>{active.students.length}<small>명</small></strong></div>
          <div><CheckCircle2 size={19} aria-hidden="true" /><span>수업 완료</span><strong>{lesson ? completed : "—"}<small>{lesson ? "명" : ""}</small></strong></div>
          <div><ClipboardCheck size={19} aria-hidden="true" /><span>실습 제출</span><strong>{lesson ? submitted : "—"}<small>{lesson ? "명" : ""}</small></strong></div>
        </div>
        {!lesson && <p className={styles.inlineNote}>아직 열린 수업이 없어요. <Link href={`/teacher/classes?classId=${active.classroom.id}`}>수업 관리에서 수업을 열어 주세요.</Link> 학생 계정은 아래에서 관리할 수 있어요.</p>}
        <div className={styles.listToolbar}><span>{lesson?.title ?? "학생 계정 관리"}</span><div className={styles.filters}>
          <Select label="진행 상태" value={statusFilter} disabled={!lesson} onValueChange={setStatusFilter} options={[{ value: "all", label: "모든 진행" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]} />
          <Select label="제출 상태" value={submissionFilter} disabled={!lesson} onValueChange={setSubmissionFilter} options={[{ value: "all", label: "모든 제출" }, { value: "not-submitted", label: "미제출" }, { value: "submitted", label: "제출함" }]} />
          <label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">학번 검색</span><Input placeholder="학번 검색" type="search" inputMode="numeric" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div></div>
        <p className={styles.resultCount} role="status">{filtered.length}명 표시 · 전체 {active.students.length}명</p>
        {active.students.length === 0 ? <div className={styles.empty}><Users size={28} aria-hidden="true" /><h3>등록된 학생이 없어요.</h3><p>이 반에 학생 계정이 등록되면 학습 현황을 볼 수 있어요.</p></div> : filtered.length === 0 ? <div className={styles.empty}><Search size={28} aria-hidden="true" /><h3>조건에 맞는 학생이 없어요.</h3><p>학번이나 진행·제출 조건을 바꿔 확인해 주세요.</p><Button variant="outline" onClick={resetFilters}>검색·필터 초기화</Button></div> : <div className={styles.tableFrame}>
          <table className={styles.table}><caption className="sr-only">{active.classroom.name} {lesson?.title ?? "계정"} 학생별 현황</caption><thead><tr><th scope="col">학생</th><th scope="col">개념</th><th scope="col">퀴즈</th><th scope="col">실습</th><th scope="col">수업 상태</th><th scope="col">계정·작품</th></tr></thead><tbody>{filtered.map((student) => <TeacherStudentRow key={`${active.classroom.id}:${active.selectedLessonId}:${student.uid}`} student={student} lesson={lesson} onLock={lockMutation} onReset={() => {
                setData((previous) => previous ? { ...previous, students: previous.students.map((item) => item.uid === student.uid ? { ...item, mustChangePassword: true } : item) } : null);
                setNotice(`${student.studentId} 학생의 비밀번호를 초기화했어요. 다음 입장 시 변경이 필요해요.`);
              }} />)}</tbody></table>
        </div>}
        <div className={styles.listFooter}><span>제출함은 기본·도전 작품 중 하나 이상 제출한 학생이에요.</span><span>비밀번호 초기화 후에도 학습 기록은 유지돼요.</span></div>
      </section>}
    </>}
  </div>;
}

function StageProgress({ value, unit }: { value: Progress["concept"]; unit: string }) {
  return <div className={styles.progress}><strong>{value.percent}%</strong><span>{value.total}{unit} 중 {value.completed}{unit} 완료</span><div className={styles.track} aria-hidden="true"><span style={{ width: `${value.percent}%` }} /></div></div>;
}

function TeacherStudentRow({ student, lesson, onLock, onReset }: { student: StudentRow; lesson?: Lesson; onLock: (value: boolean) => void; onReset: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const row = useRef<HTMLTableRowElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const toggleFocused = useRef(false);
  const identity = useRef<HTMLTableCellElement>(null);
  const progress = lesson ? progressFor(lesson, student.work) : null;
  const detailId = `student-detail-${student.uid}`;
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const onResize = () => {
      if (!media.matches && (document.activeElement === toggle.current || toggleFocused.current && document.activeElement === document.body)) { identity.current?.focus(); toggleFocused.current = false; }
      if (media.matches && row.current?.querySelector('[data-row-detail]:focus-within')) setExpanded(true);
    };
    media.addEventListener("change", onResize);
    return () => media.removeEventListener("change", onResize);
  }, []);
  return <tr ref={row} className={styles.studentRow} data-expanded={expanded} onFocusCapture={(event) => {
    if ((event.target as HTMLElement).closest("[data-row-detail]")) setExpanded(true);
  }}>
    <th ref={identity} tabIndex={-1} scope="row" className={styles.studentIdentity}><span className={styles.avatar}>{Number(student.studentId.slice(-2))}</span><span><strong>{student.studentId}</strong><small>{student.mustChangePassword ? "비밀번호 변경 필요" : "비밀번호 변경 완료"}</small></span><Button ref={toggle} variant="outline" className={styles.detailToggle} aria-label={`${student.studentId} 상세 보기`} aria-expanded={expanded} aria-controls={`${detailId}-concept ${detailId}-quiz ${detailId}-practice ${detailId}-actions`} onFocus={() => { toggleFocused.current = true; }} onBlur={(event) => { if (event.relatedTarget || matchMedia("(max-width: 1180px)").matches) toggleFocused.current = false; }} onClick={() => setExpanded((previous) => !previous)}>{expanded ? "상세 접기" : "상세 보기"}</Button></th>
    <td id={`${detailId}-concept`} data-row-detail className={styles.rowDetail}><span className={styles.mobileLabel}>개념</span>{progress ? <StageProgress value={progress.concept} unit="개" /> : <span className={styles.noRecord}>수업 미지정</span>}</td>
    <td id={`${detailId}-quiz`} data-row-detail className={styles.rowDetail}><span className={styles.mobileLabel}>퀴즈</span>{progress ? <StageProgress value={progress.quiz} unit="문항" /> : <span className={styles.noRecord}>수업 미지정</span>}</td>
    <td id={`${detailId}-practice`} data-row-detail className={styles.rowDetail}><span className={styles.mobileLabel}>실습</span>{progress && lesson ? <><StageProgress value={progress.practice} unit="개" /><span className={styles.practiceState}>{practiceLabel(lesson, student.work)}</span></> : <span className={styles.noRecord}>수업 미지정</span>}</td>
    <td className={styles.rowSummary}><span className={styles.mobileLabel}>수업 상태</span><span className={`${styles.status} ${progress?.status === "completed" ? styles.complete : ""}`}>{progress ? STATUS_LABELS[progress.status] : "수업 미지정"}</span>{lesson && <span className={styles.mobilePractice}>{practiceLabel(lesson, student.work)}</span>}</td>
    <td id={`${detailId}-actions`} data-row-detail className={`${styles.rowActions} ${styles.rowDetail}`}>{lesson && <SubmissionViewer student={student} lesson={lesson} />}<ResetPassword student={student} onLock={onLock} onComplete={onReset} /></td>
  </tr>;
}

function practiceLabel(lesson: Lesson, work: Work | null) {
  if (lesson.practice.type === "programming") {
    const required = programmingMissions.filter((mission) => !("optional" in mission));
    const submitted = required.filter((mission) => work?.missions?.[mission.id]?.submission).length;
    const edited = programmingMissions.some((mission) => {
      const submission = work?.missions?.[mission.id]?.submission;
      return submission && !programmingProjectMatches(work?.draft.programming?.projects[mission.id], submission.entryProject);
    });
    const challenge = work?.missions?.average?.submission;
    return `기본 ${submitted}/4 제출${challenge ? " · 도전 제출" : ""}${edited ? " · 수정 중" : ""}`;
  }
  if (work?.submission) return practiceMatches(work.draft, work.submission) ? "제출 완료" : "제출 완료 · 수정 중";
  if (work?.validation?.passed && practiceMatches(work.draft, work.validation)) return "검증 통과 · 제출 전";
  return "아직 제출하지 않았어요";
}
