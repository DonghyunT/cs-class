"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ListChecks, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import { classroomApi } from "@/lib/classroom/client";
import { progressFor } from "@/lib/classroom/progress";
import { seoulToday, eventDate } from "@/lib/classroom/planner";
import type { Session, StudentDashboard, TeacherDashboard } from "@/lib/classroom/types";
import { TodoList } from "./todos";
import { ScheduleList } from "./schedule";
import styles from "./dashboard.module.css";

export function DashboardScreen({ teacher = false }: { teacher?: boolean }) {
  const { session } = useSession();
  return <AppShell title="대시보드" teacher={teacher}>{session && !session.mustChangePassword && (teacher ? session.role !== "student" : session.role === "student") && <Dashboard key={session.uid} session={session} teacher={teacher} />}</AppShell>;
}
function Dashboard({ session, teacher }: { session: Session; teacher: boolean }) {
  const [classId, setClassId] = useState(teacher ? session.classIds[0] : session.classId ?? undefined);
  const [data, setData] = useState<StudentDashboard | TeacherDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const { beforeLeave } = useNavigationGuard();
  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      const value = teacher ? (classId ? await classroomApi.teacher(classId) : null) : await classroomApi.student();
      if (version === request.current) { setData(value); setError(""); }
    } catch (problem) { if (version === request.current) setError(problem instanceof Error ? problem.message : "수업 기록을 불러오지 못했어요."); }
    finally { if (version === request.current) setLoading(false); }
  }, [teacher, classId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { active = false; request.current += 1; clearInterval(timer); };
  }, [refresh]);
  const active = data && (!classId || data.classroom.id === classId) ? data : null;
  const student = active && "work" in active ? active : null;
  const staff = active && "students" in active ? active : null;
  const current = active?.lessons.find((lesson) => lesson.id === active.classroom.currentLessonId);
  const currentTitle = current?.title ?? (!active && loading ? "이번 수업을 확인하고 있어요." : !active && error ? "이번 수업을 확인하지 못했어요." : teacher ? "이번 수업을 지정해 주세요." : "다음 수업을 기다리고 있어요.");
  const home = teacher ? "/teacher" : "/student";
  const staffLesson = staff?.lessons.find((lesson) => lesson.id === staff.selectedLessonId);
  const submitted = staff?.students.filter((item) => item.work?.submission) ?? [];
  const unfinished = student?.lessons.filter((lesson) => progressFor(lesson, student.work[lesson.id]).status !== "completed") ?? [];
  return <div className={`${styles.page} ${styles.dashboardHome}`}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>{teacher ? "선생님 공간" : `${session.studentId} 학생의 교실`}</span><h1>오늘은 무엇을 해볼까요?</h1><p>할 일을 살펴보고, 하던 활동을 이어가세요.</p></div><time dateTime={seoulToday()}><CalendarDays size={16} aria-hidden="true" />{eventDate(seoulToday())}</time></header>
    {teacher && session.classIds.length > 0 && <div className={styles.toolbar}><label className={styles.classPicker}>담당 반<select value={classId} onChange={async (event) => { const value = event.target.value; if (await beforeLeave()) { request.current += 1; setClassId(value); } }}>
      {(staff?.classrooms ?? session.classIds.map((id) => ({ id, name: `2학년 ${id.split("-")[1]}반` }))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label><Button variant="ghost" aria-label="수업 새로고침" onClick={() => void refresh()}><RefreshCw size={17} aria-hidden="true" /></Button></div>}
    {!teacher && <Button className={styles.refresh} variant="ghost" aria-label="수업 새로고침" onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" />수업 기록 새로고침</Button>}
    {error && <div className={styles.error} role="alert"><p>{error} {active && "마지막으로 확인한 수업 기록이에요."}</p><Button variant="outline" onClick={() => void refresh()}>수업 다시 불러오기</Button></div>}
    {loading && <p role="status">수업 기록을 확인하고 있어요.</p>}
    <section className={styles.current} aria-labelledby="current-heading"><div><span className={styles.eyebrow}><BookOpen size={17} aria-hidden="true" />{active?.classroom.name && `${active.classroom.name} · `}이번 수업</span><h2 id="current-heading">{currentTitle}</h2><p>{current?.description ?? (teacher ? "수업 관리에서 담당 반의 수업을 준비해요." : "열린 수업에서 먼저 학습해도 좋아요.")}</p></div>
      <Button nativeButton={false} render={<Link href={teacher ? `/teacher/classes${classId ? `?classId=${classId}` : ""}` : current ? `/classroom/${current.id}` : "/student/lessons"} />}>{teacher ? "수업 관리" : current ? progressFor(current, student?.work[current.id]).status === "completed" ? "다시 보기" : student?.work[current.id]?.updatedAt ? "이어하기" : "수업 시작" : "열린 수업 보기"}<ArrowRight size={17} aria-hidden="true" /></Button>
    </section>
    <div className={styles.columns}><div className={styles.mainColumn}><TodoList uid={session.uid} /><section className={`${styles.panel} ${styles.actionsPanel}`} aria-labelledby="actions-heading"><div className={styles.sectionHeading}><div className={styles.sectionTitle}><span className={`${styles.titleIcon} ${styles.actionIcon}`}><ListChecks size={19} aria-hidden="true" /></span><h2 id="actions-heading">{teacher ? "교사가 확인할 일" : "수업에서 할 일"}</h2></div><Link href={teacher ? `/teacher/students${classId ? `?classId=${classId}` : ""}` : "/student/lessons"}>{teacher ? "학생 현황" : "수업 전체 보기"}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      {teacher ? <>
        {!session.classIds.length && <p className={styles.empty}>아직 담당 반이 없어요. 개인 할 일은 사용할 수 있어요.</p>}
        {staff && <ul className={styles.actionList}><li><Link href={`/teacher/students?classId=${staff.classroom.id}${staff.selectedLessonId ? `&lessonId=${staff.selectedLessonId}` : ""}`}><span>{staffLesson?.title ?? "담당 반"} 학습 현황<small>등록 학생 {staff.students.length}명{staffLesson && ` · 저장된 제출 작품 ${submitted.length}개`}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>{submitted.slice(0, 3).map((item) => <li key={item.uid}><Link href={`/teacher/students?classId=${staff.classroom.id}&lessonId=${staff.selectedLessonId}&studentId=${item.studentId}`}><span>{item.studentId} 제출 작품 보기<small>{staffLesson?.title} · 제출된 작품</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul>}
        {staff && !submitted.length && <p className={styles.muted}>아직 이 수업에 저장된 제출 작품이 없어요.</p>}
        <p className={styles.muted}>작품을 열어 본 여부는 기록하지 않아요.</p>
      </> : student && <>{!unfinished.length && <p className={styles.empty}>{student.lessons.length ? "열린 수업의 필수 활동을 모두 마쳤어요. 수업 목록에서 복습할 수 있어요." : "아직 열린 수업이 없어요."}</p>}<ul className={styles.actionList}>{unfinished.slice(0, 3).map((lesson) => <li key={lesson.id}><Link href={`/classroom/${lesson.id}`}><span>{lesson.title}<small>{student.work[lesson.id]?.updatedAt ? `${({ concept: "개념", quiz: "퀴즈", practice: "실습" })[student.work[lesson.id].draft.stage]} 이어하기` : "수업 시작"}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul></>}
      {!active && session.classIds.length > 0 && <p className={styles.muted}>수업 기록을 확인하면 다음 행동이 보여요.</p>}
    </section></div><div className={styles.sideColumn}>{classId ? <ScheduleList key={classId} uid={session.uid} teacher={teacher} classId={classId} summary /> : <section className={styles.panel}><h2>다가오는 일정</h2><p className={styles.empty}>담당 반이 연결되면 일정을 확인할 수 있어요.</p></section>}<p className={styles.footnote}>일정은 수업을 준비하는 안내예요.<br />학습과 제출 상태는 수업 기록에서 확인해요.</p></div></div>
    <Link className={styles.allLessons} href={teacher ? "/teacher/classes" : `${home}/lessons`}>{teacher ? "담당 반 수업 관리" : "다른 수업도 이어갈 수 있어요. 열린 수업 보기"}<ArrowRight size={16} aria-hidden="true" /></Link>
  </div>;
}
