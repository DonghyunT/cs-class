"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardArt } from "@/components/dashboard-art";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classroomApi } from "@/lib/classroom/client";
import { progressFor, STATUS_LABELS } from "@/lib/classroom/progress";
import type { ClassSettings, Progress, TeacherDashboard, Work } from "@/lib/classroom/types";
import { ManageLessons, ResetPassword, SubmissionViewer } from "./dialogs";
import { dateLabel, problemMessage } from "./presentation";
import styles from "./teacher.module.css";

type TeacherView = { view: "classes" | "students"; classId?: string; lessonId?: string; studentId?: string };
export function TeacherDashboardView(props: TeacherView) {
  const { session } = useSession();
  return <AppShell title={props.view === "classes" ? "수업 관리" : "학생 현황·계정"} teacher>{session && session.role !== "student" && (session.classIds.length ? <TeacherWorkspace key={`${session.uid}:${props.classId}:${props.lessonId}:${props.studentId}`} instructor={session.role === "instructor"} {...props} /> : <div className={styles.empty}><Users size={28} aria-hidden="true" /><h1>아직 담당 반이 없어요.</h1><p>담당 반이 연결되면 수업과 학생 기록을 확인할 수 있어요.</p></div>)}</AppShell>;
}

function TeacherWorkspace({ instructor, view, classId, lessonId, studentId }: { instructor: boolean } & TeacherView) {
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [selection, setSelection] = useState<{ classId?: string; lessonId?: string }>({ classId, lessonId });
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(studentId ?? "");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const request = useRef(0);
  const busy = useRef(false);
  const mutating = useRef(false);
  const lastFetched = useRef(0);

  const load = useCallback((): Promise<TeacherDashboard | null> => {
    if (mutating.current) return Promise.resolve(null);
    const version = ++request.current;
    busy.current = true;
    return classroomApi.teacher(selection.classId, selection.lessonId).then((result) => {
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
  }, [selection.classId, selection.lessonId]);

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

  const matching = data && (!selection.classId || selection.classId === data.classroom.id) && (!selection.lessonId || selection.lessonId === data.selectedLessonId);
  const active = matching ? data : null;
  const lesson = active?.lessons.find((item) => item.id === active.selectedLessonId);
  const current = active?.lessons.find((item) => item.id === active.classroom.currentLessonId);
  const filtered = active?.students.filter((student) => student.studentId.includes(search.trim())) ?? [];
  const completed = active && lesson ? active.students.filter((student) => progressFor(lesson, student.work).status === "completed").length : 0;
  const submitted = active?.students.filter((student) => student.work?.submission).length ?? 0;

  function selectClass(classId: string) {
    request.current += 1; setFetching(true); setSelection({ classId }); setSearch(""); setNotice(""); setError("");
  }

  function updateSettings(settings: ClassSettings) {
    setData((previous) => previous ? { ...previous, classroom: settings, classrooms: previous.classrooms.map((item) => item.id === settings.id ? settings : item) } : null);
    setNotice(`${settings.name} 수업 설정을 저장했어요.`);
    setFetching(true);
    void load();
  }

  return <div className={styles.page}>
    <div className={styles.heading}>
      <div><p className={styles.kicker}>선생님 공간</p><h1>우리 반 수업을 살펴봐요.</h1><p>수업을 준비하고, 학생이 어디까지 해냈는지 확인해요.</p></div>
      <span className={styles.role}><ShieldCheck size={16} aria-hidden="true" />{instructor ? "강사 · 담당 반 관리" : "교사 · 수업 관리"}</span>
    </div>
    <div className={styles.toolbar}>
      <label className={styles.classPicker}>담당 반<select value={selection.classId ?? data?.classroom.id ?? ""} onChange={(event) => selectClass(event.target.value)} disabled={!data?.classrooms.length}>
        {!data?.classrooms.length && <option value="">반 정보 확인 중</option>}
        {data?.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
      </select></label>
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
      {view === "classes" && <p className={styles.inlineNote}><Link href={`/teacher/students?classId=${active.classroom.id}`}>학생 진행·제출 작품·계정 관리로 이동</Link></p>}
      {view === "students" && <section className={styles.students} aria-labelledby="students-title">
        <div className={styles.sectionHeading}><div><h2 id="students-title">학생별 학습 현황</h2><p>개념·퀴즈·실습의 진행과 제출된 작품을 확인해요.</p></div><label className={styles.lessonPicker}>확인할 수업<select value={active.selectedLessonId ?? ""} disabled={!active.classroom.openedLessonIds.length} onChange={(event) => { request.current += 1; setFetching(true); setSelection({ classId: active.classroom.id, lessonId: event.target.value }); setError(""); }}>
          {!active.selectedLessonId && <option value="">열린 수업이 없어요</option>}
          {active.lessons.filter((item) => active.classroom.openedLessonIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label></div>
        <div className={styles.summary}>
          <div><Users size={19} aria-hidden="true" /><span>등록 학생</span><strong>{active.students.length}<small>명</small></strong></div>
          <div><CheckCircle2 size={19} aria-hidden="true" /><span>수업 완료</span><strong>{lesson ? completed : "—"}<small>{lesson ? "명" : ""}</small></strong></div>
          <div><ClipboardCheck size={19} aria-hidden="true" /><span>실습 제출</span><strong>{lesson ? submitted : "—"}<small>{lesson ? "명" : ""}</small></strong></div>
        </div>
        {!lesson && <p className={styles.inlineNote}>아직 열린 수업이 없어요. <Link href={`/teacher/classes?classId=${active.classroom.id}`}>수업 관리에서 수업을 열어 주세요.</Link> 학생 계정은 아래에서 관리할 수 있어요.</p>}
        <div className={styles.listToolbar}><span>{lesson?.title ?? "학생 계정 관리"}</span><label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">학번 검색</span><Input placeholder="학번 검색" type="search" inputMode="numeric" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
        {active.students.length === 0 ? <div className={styles.empty}><Users size={28} aria-hidden="true" /><h3>등록된 학생이 없어요.</h3><p>이 반에 학생 계정이 등록되면 학습 현황을 볼 수 있어요.</p></div> : filtered.length === 0 ? <div className={styles.empty}><Search size={28} aria-hidden="true" /><h3>일치하는 학번이 없어요.</h3><p>선택한 반의 학번을 확인해 주세요.</p><Button variant="outline" onClick={() => setSearch("")}>검색 지우기</Button></div> : <div className={styles.tableFrame}>
          <table className={styles.table}><caption className="sr-only">{active.classroom.name} {lesson?.title ?? "계정"} 학생별 현황</caption><thead><tr><th scope="col">학생</th><th scope="col">개념</th><th scope="col">퀴즈</th><th scope="col">실습</th><th scope="col">수업 상태</th><th scope="col">계정·작품</th></tr></thead><tbody>{filtered.map((student) => {
            const progress = lesson ? progressFor(lesson, student.work) : null;
            return <tr key={student.uid}>
              <th scope="row" className={styles.studentIdentity}><span className={styles.avatar}>{Number(student.studentId.slice(-2))}</span><span><strong>{student.studentId}</strong><small>{student.mustChangePassword ? "비밀번호 변경 필요" : "비밀번호 변경 완료"}</small></span></th>
              <td><span className={styles.mobileLabel}>개념</span>{progress ? <StageProgress value={progress.concept} unit="개" /> : <span className={styles.noRecord}>수업 미지정</span>}</td>
              <td><span className={styles.mobileLabel}>퀴즈</span>{progress ? <StageProgress value={progress.quiz} unit="문항" /> : <span className={styles.noRecord}>수업 미지정</span>}</td>
              <td><span className={styles.mobileLabel}>실습</span>{progress ? <><StageProgress value={progress.practice} unit="개" /><span className={styles.practiceState}>{practiceLabel(student.work)}</span></> : <span className={styles.noRecord}>수업 미지정</span>}</td>
              <td><span className={styles.mobileLabel}>수업 상태</span><span className={`${styles.status} ${progress?.status === "completed" ? styles.complete : ""}`}>{progress ? STATUS_LABELS[progress.status] : "수업 미지정"}</span></td>
              <td className={styles.rowActions}>{lesson && <SubmissionViewer student={student} lesson={lesson} />}<ResetPassword student={student} onLock={lockMutation} onComplete={() => {
                setData((previous) => previous ? { ...previous, students: previous.students.map((item) => item.uid === student.uid ? { ...item, mustChangePassword: true } : item) } : null);
                setNotice(`${student.studentId} 학생의 비밀번호를 초기화했어요. 다음 입장 시 변경이 필요해요.`);
              }} /></td>
            </tr>;
          })}</tbody></table>
        </div>}
        <div className={styles.listFooter}><span>{filtered.length}명 표시 · 전체 {active.students.length}명</span><span>비밀번호 초기화 후에도 학습 기록은 유지돼요.</span></div>
      </section>}
    </>}
  </div>;
}

function StageProgress({ value, unit }: { value: Progress["concept"]; unit: string }) {
  return <div className={styles.progress}><strong>{value.percent}%</strong><span>{value.total}{unit} 중 {value.completed}{unit} 완료</span><div className={styles.track} aria-hidden="true"><span style={{ width: `${value.percent}%` }} /></div></div>;
}

function practiceLabel(work: Work | null) {
  if (work?.submission) return work.draft.practiceOrder.join("|") === work.submission.order.join("|") ? "제출 완료" : "제출 완료 · 수정 중";
  if (work?.validation?.passed) return "검증 통과 · 제출 전";
  return "아직 제출하지 않았어요";
}
