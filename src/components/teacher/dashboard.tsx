"use client";

import Link from "next/link";
import { Toast } from "@base-ui/react/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardCheck, LayoutGrid, List, Search, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { HelpRequests } from "@/components/classroom/help-requests";
import { DashboardArt } from "@/components/dashboard-art";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { ActivityProgressRing } from "@/components/student/activity-progress-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SuccessToasts } from "@/components/ui/toast";
import { classroomApi } from "@/lib/classroom/client";
import { progressFor, STATUS_LABELS, submissionCountFor } from "@/lib/classroom/progress";
import { programmingMissions } from "@/lib/classroom/programming-entry";
import type { ClassSettings, Lesson, Progress, Stage, StudentRow, TeacherDashboard, WorkSummary } from "@/lib/classroom/types";
import { ManageLessons, ResetPassword, SubmissionViewer } from "./dialogs";
import { dateLabel, problemMessage } from "./presentation";
import { TeacherToolbar } from "./teacher-toolbar";
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
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [filterClassId, setFilterClassId] = useState(selectedClassId);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const request = useRef(0);
  const busy = useRef(false);
  const mutating = useRef(false);
  const lastFetched = useRef(0);
  if (filterClassId !== selectedClassId) {
    setFilterClassId(selectedClassId); setSelectedLessonId(undefined); setSearch(""); setStatusFilter("all");
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
  const regularLesson = lesson && lesson.mode !== "review";
  const current = active?.lessons.find((item) => item.id === active.classroom.currentLessonId);
  const openedLessons = active?.lessons.filter((item) => active.classroom.openedLessonIds.includes(item.id)) ?? [];
  const filtered = active?.students.filter((student) => student.studentId.includes(search.trim()) && (!lesson || !regularLesson || statusFilter === "all" || progressFor(lesson, student.work).status === statusFilter)) ?? [];
  const completed = active && lesson && regularLesson ? active.students.filter((student) => progressFor(lesson, student.work).status === "completed").length : 0;
  const submitted = active && lesson ? active.students.filter((student) => submissionCountFor(lesson, student.work) > 0).length : 0;

  function resetFilters() { setSearch(""); setStatusFilter("all"); }

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
    <TeacherToolbar classId={selectedClassId ?? data?.classroom.id} classrooms={data?.classrooms ?? []} onClassChange={selectClass} onRefresh={() => { setFetching(true); void load(); }} refreshing={fetching} updatedAt={active ? updatedAt : null}>
      {view === "classes" && active && <ManageLessons key={active.classroom.id} classroom={active.classroom} lessons={active.lessons} onSaved={updateSettings} onLock={lockMutation} onRefresh={load} />}
    </TeacherToolbar>
    {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="outline" disabled={fetching} onClick={() => { setFetching(true); void load(); }}>다시 불러오기</Button>{active && <span>마지막으로 확인한 기록을 표시하고 있어요.</span>}</div>}
    <div role="status" aria-live="polite" className={notice ? styles.notice : styles.silentNotice}>{notice && <><CheckCircle2 size={18} aria-hidden="true" /><span>{notice}</span></>}</div>
    {!active && !error && <div className={styles.loading} role="status"><span className={styles.loadingBar} /><p>반과 학습 기록을 불러오고 있어요.</p></div>}
    {active && <>
      {view === "classes" && <section className={styles.currentLesson} aria-labelledby="current-lesson-title">
        <div className={styles.currentCopy}><p className={styles.kicker}><span className={styles.dot} />{active.classroom.name} · 이번 수업</p><h2 id="current-lesson-title">{current?.title ?? "이번 수업을 지정해 주세요."}</h2><p>{current?.description ?? "수업을 열고 지정하면 학생 대시보드에 먼저 보여요."}</p><span className={styles.currentMeta}>열린 수업 {active.classroom.openedLessonIds.length}개 · 기존 수업은 계속 복습할 수 있어요.</span></div>
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
      {view === "students" && <HelpRequests classId={active.classroom.id} lessonId={active.selectedLessonId ?? undefined} />}
      {view === "students" && <section className={styles.students} aria-labelledby="students-title">
        <div className={styles.sectionHeading}><div><h2 id="students-title">학생별 학습 현황</h2><p>개념·퀴즈·실습의 진행과 제출된 작품을 확인해요.</p></div><label className={styles.lessonPicker}>확인할 수업<Select label="확인할 수업" value={active.selectedLessonId ?? ""} disabled={!active.classroom.openedLessonIds.length} onValueChange={(value) => { request.current += 1; setFetching(true); setSelectedLessonId(value); resetFilters(); setError(""); }} options={[...(!active.selectedLessonId ? [{ value: "", label: "열린 수업이 없어요" }] : []), ...active.lessons.filter((item) => active.classroom.openedLessonIds.includes(item.id)).map((item) => ({ value: item.id, label: item.title }))]} /></label></div>
        <div className={styles.summary}>
          <div><Users size={19} aria-hidden="true" /><span>등록 학생</span><strong>{active.students.length}<small>명</small></strong></div>
          <div><CheckCircle2 size={19} aria-hidden="true" /><span>수업 완료</span><strong>{regularLesson ? completed : "—"}<small>{regularLesson ? "명" : ""}</small></strong></div>
          <div><ClipboardCheck size={19} aria-hidden="true" /><span>실습 제출</span><strong>{lesson ? submitted : "—"}<small>{lesson ? "명" : ""}</small></strong></div>
        </div>
        {!lesson && <p className={styles.inlineNote}>아직 열린 수업이 없어요. <Link href={`/teacher/classes?classId=${active.classroom.id}`}>수업 관리에서 수업을 열어 주세요.</Link> 학생 계정은 아래에서 관리할 수 있어요.</p>}
        <div className={styles.listToolbar}><span>{lesson?.title ?? "학생 계정 관리"}</span><div className={styles.filters}>
          <Select label="진행 상태" value={statusFilter} disabled={!regularLesson} onValueChange={setStatusFilter} options={[{ value: "all", label: "모든 진행" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]} />
          <label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">학번 검색</span><Input placeholder="학번 검색" type="search" inputMode="numeric" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div></div>
        <div className={styles.resultToolbar}><p className={styles.resultCount} role="status">{filtered.length}명 표시 · 전체 {active.students.length}명</p><div className={styles.viewToggle} role="group" aria-label="학생 현황 보기"><Button variant="ghost" aria-label="목록 보기" title="목록 보기" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={17} aria-hidden="true" /></Button><Button variant="ghost" aria-label="격자 보기" title="격자 보기" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={17} aria-hidden="true" /></Button></div></div>
        {active.students.length === 0 ? <div className={styles.empty}><Users size={28} aria-hidden="true" /><h3>등록된 학생이 없어요.</h3><p>이 반에 학생 계정이 등록되면 학습 현황을 볼 수 있어요.</p></div> : filtered.length === 0 ? <div className={styles.empty}><Search size={28} aria-hidden="true" /><h3>조건에 맞는 학생이 없어요.</h3><p>학번이나 진행 조건을 바꿔 확인해 주세요.</p><Button variant="outline" onClick={resetFilters}>검색·필터 초기화</Button></div> : <div className={styles.tableFrame} data-layout={layout}>
          <table className={styles.table} data-layout={layout}><caption className="sr-only">{active.classroom.name} {lesson?.title ?? "계정"} 학생별 현황</caption><thead><tr><th scope="col">학생</th><th scope="col">수업 상태</th><th scope="col">개념·퀴즈·실습</th><th scope="col">계정·작품</th></tr></thead><tbody>{filtered.map((student) => <TeacherStudentRow key={`${active.classroom.id}:${active.selectedLessonId}:${student.uid}`} student={student} lesson={lesson} layout={layout} onLock={lockMutation} onReset={() => {
                setData((previous) => previous ? { ...previous, students: previous.students.map((item) => item.uid === student.uid ? { ...item, mustChangePassword: true } : item) } : null);
                setNotice(`${student.studentId} 학생의 비밀번호를 초기화했어요. 다음 입장 시 변경이 필요해요.`);
              }} />)}</tbody></table>
        </div>}
        <div className={styles.listFooter}><span>{lesson?.mode === "review" ? "선택 복습은 수업 완료율에 포함하지 않아요." : "상세 보기에서 완료 개수와 실습 제출 상태를 확인할 수 있어요."}</span><span>비밀번호 초기화 후에도 학습 기록은 유지돼요.</span></div>
      </section>}
    </>}
  </div>;
}

const stages: readonly { stage: Stage; label: string; unit: string }[] = [{ stage: "concept", label: "개념", unit: "개" }, { stage: "quiz", label: "퀴즈", unit: "문항" }, { stage: "practice", label: "실습", unit: "개" }];

function StageProgress({ value, stage, label, unit, studentId }: { value: Progress["concept"]; stage: Stage; label: string; unit: string; studentId: string }) {
  return <div className={`${styles.progress} ${styles[stage]}`}><span>{label}</span><div className={styles.track} role="progressbar" aria-label={`${studentId} ${label} 진도`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value.percent} aria-valuetext={`${value.completed}/${value.total}${unit} 완료, ${value.percent}%`}><span style={{ width: `${value.percent}%` }} /></div><strong aria-hidden="true">{value.percent}%</strong></div>;
}

function TeacherStudentRow({ student, lesson, layout, onLock, onReset }: { student: StudentRow; lesson?: Lesson; layout: "list" | "grid"; onLock: (value: boolean) => void; onReset: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const row = useRef<HTMLTableRowElement>(null);
  const progress = lesson && lesson.mode !== "review" ? progressFor(lesson, student.work) : null;
  const lastActiveAt = student.lastActiveAt ?? student.work?.updatedAt;
  const detailId = `student-detail-${student.uid}`;
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const onResize = () => {
      if (media.matches && row.current?.querySelector('[data-row-detail]:focus-within')) setExpanded(true);
    };
    media.addEventListener("change", onResize);
    return () => media.removeEventListener("change", onResize);
  }, []);
  return <tr ref={row} className={styles.studentRow} data-expanded={expanded} onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest("[data-row-detail]")) setExpanded(true);
  }}>
    <th scope="row" className={styles.studentIdentity}><div className={styles.identityCopy}><span className={styles.avatar}>{Number(student.studentId.slice(-2))}</span><span><strong>{student.nickname || student.studentId}</strong><small>{student.nickname && `${student.studentId} · `}{student.mustChangePassword ? "비밀번호 변경 필요" : "비밀번호 변경 완료"}</small></span></div><Button variant="ghost" className={styles.detailToggle} aria-label={`${student.studentId} 상세 보기`} title={expanded ? "상세 접기" : "상세 보기"} aria-expanded={expanded} aria-controls={`${detailId}-details ${detailId}-actions`} onClick={() => setExpanded(previous => !previous)}><ChevronDown size={17} aria-hidden="true" /></Button></th>
    <td className={styles.rowSummary}><span className={`${styles.status} ${progress?.status === "completed" ? styles.complete : ""}`}>{progress ? STATUS_LABELS[progress.status] : lesson?.mode === "review" ? "선택 복습" : "수업 미지정"}</span>{student.work?.edited && <span className={styles.practiceNote}>수정 중</span>}{student.work?.review?.status === "pending" && <span className={styles.practiceNote}>확인 대기</span>}</td>
    <td className={styles.stageCell}>
      {progress ? layout === "grid" ? <ActivityProgressRing parts={stages.map(({ stage, label }) => ({ stage, label, ...progress[stage] }))} label={`${student.studentId} 필수 활동 완료율`} size="compact" interactive={false} /> : <div className={styles.stageGroup}>{stages.map(({ stage, label, unit }) => <StageProgress key={stage} value={progress[stage]} stage={stage} label={label} unit={unit} studentId={student.studentId} />)}</div> : <span className={styles.noRecord}>{lesson?.mode === "review" ? "완료율에 포함하지 않는 복습이에요." : "수업 미지정"}</span>}
      <div id={`${detailId}-details`} className={styles.stageDetails} hidden={!expanded}>{progress && stages.map(({ stage, label, unit }) => <span key={stage}>{label} {progress[stage].completed}/{progress[stage].total}{unit} 완료</span>)}{lesson && <span className={styles.practiceState}>{practiceLabel(lesson, student.work)}</span>}<span>최근 활동 {lastActiveAt ? dateLabel(lastActiveAt) : "없음"}</span></div>
    </td>
    <td id={`${detailId}-actions`} data-row-detail className={styles.rowActions}>{lesson && <SubmissionViewer student={student} lesson={lesson} />}<ResetPassword student={student} onLock={onLock} onComplete={onReset} /></td>
  </tr>;
}

function practiceLabel(lesson: Lesson, work: WorkSummary | null) {
  if (lesson.practice.type === "programming") {
    const required = programmingMissions.filter((mission) => !("optional" in mission));
    const submitted = required.filter((mission) => work?.missions?.[mission.id]?.submission).length;
    const edited = work?.edited;
    const challenge = work?.missions?.average?.submission;
    return `기본 ${submitted}/4 제출${challenge ? " · 도전 제출" : ""}${edited ? " · 수정 중" : ""}`;
  }
  if (work?.submission) return work.edited ? "제출 완료 · 수정 중" : "제출 완료";
  if (lesson.practice.type === "flowchart") return `${Object.values(work?.missions ?? {}).filter(record => record.submission).length}/4 작품 제출${work?.review?.status === "pending" ? " · 확인 대기" : ""}`;
  if (work?.validated) return "검증 통과 · 제출 전";
  return "아직 제출하지 않았어요";
}
