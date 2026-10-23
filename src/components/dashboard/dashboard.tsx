"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ListChecks, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TeacherToolbar } from "@/components/teacher/teacher-toolbar";
import { ClassProgress } from "@/components/teacher/class-progress";
import { HelpRequests, type HelpRequestsStatus } from "@/components/classroom/help-requests";
import { LoadingState, Skeleton } from "@/components/ui/loading-state";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import { classroomApi } from "@/lib/classroom/client";
import { CLASSROOM_HELP_ENABLED } from "@/lib/classroom/features";
import { latestSubmissionAtFor, submissionCountFor } from "@/lib/classroom/progress";
import { seoulToday, eventDate } from "@/lib/classroom/planner";
import type { Session, StudentDashboard, TeacherDashboard } from "@/lib/classroom/types";
import { TodoList } from "./todos";
import { ScheduleList } from "./schedule";
import { LoadingList } from "./loading-list";
import { dateLabel } from "@/components/teacher/presentation";
import { LearningOverview, StudentLessonProgress } from "@/components/student/learning-overview";
import { StudentBadges } from "@/components/student/badges";
import styles from "./dashboard.module.css";

export function DashboardScreen({ teacher = false, classId }: { teacher?: boolean; classId?: string }) {
  const { session } = useSession();
  return <AppShell title="대시보드" teacher={teacher}>{session && !session.mustChangePassword && (teacher ? session.role !== "student" : session.role === "student") && <Dashboard key={`${session.uid}:${classId ?? ""}`} session={session} teacher={teacher} explicitClassId={classId} />}</AppShell>;
}
function Dashboard({ session, teacher, explicitClassId }: { session: Session; teacher: boolean; explicitClassId?: string }) {
  const selection = useTeacherClass(explicitClassId);
  const classId = teacher ? selection.classId : session.classId ?? undefined;
  const [data, setData] = useState<StudentDashboard | TeacherDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [helpStatus, setHelpStatus] = useState<HelpRequestsStatus | null>(null);
  const request = useRef(0);
  const inFlight = useRef<{ key: string; version: number; promise: Promise<void> } | null>(null);
  const { beforeLeave } = useNavigationGuard();
  const refresh = useCallback((): Promise<void> => {
    const key = `${teacher}:${classId ?? ""}`;
    if (inFlight.current?.key === key && inFlight.current.version === request.current) return inFlight.current.promise;
    const version = ++request.current;
    setLoading(true);
    const promise = Promise.resolve().then(async () => { try {
      const value = teacher ? (classId ? await classroomApi.teacher(classId) : null) : await classroomApi.student();
      if (version === request.current) { setData(value); setUpdatedAt(Date.now()); setError(""); }
    } catch (problem) { if (version === request.current) setError(problem instanceof Error ? problem.message : "수업 기록을 불러오지 못했어요."); }
    finally {
      if (version === request.current) setLoading(false);
      if (inFlight.current?.version === version) inFlight.current = null;
    } });
    inFlight.current = { key, version, promise };
    return promise;
  }, [teacher, classId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const timer = teacher ? null : setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { active = false; request.current += 1; if (timer !== null) clearInterval(timer); };
  }, [refresh, teacher]);
  const active = data && (!classId || data.classroom.id === classId) ? data : null;
  const student = active && "work" in active ? active : null;
  const staff = active && "students" in active ? active : null;
  const current = active?.lessons.find((lesson) => lesson.id === active.classroom.currentLessonId);
  const currentTitle = current?.title ?? (!active && loading ? "이번 수업을 확인하고 있어요." : !active && error ? "이번 수업을 확인하지 못했어요." : teacher ? "이번 수업을 지정해 주세요." : "다음 수업을 기다리고 있어요.");
  const home = teacher ? "/teacher" : "/student";
  const staffLesson = staff?.lessons.find((lesson) => lesson.id === staff.selectedLessonId);
  const submitted = staffLesson ? (staff?.students.filter((item) => submissionCountFor(staffLesson, item.work) > 0) ?? []).sort((a, b) => latestSubmissionAtFor(staffLesson, b.work) - latestSubmissionAtFor(staffLesson, a.work) || a.studentId.localeCompare(b.studentId)) : [];
  const pending = staff?.students.filter(item => item.work?.review?.status === "pending").length ?? 0;
  const submissionCount = staffLesson ? submitted.reduce((count, item) => count + submissionCountFor(staffLesson, item.work), 0) : 0;
  const help = helpStatus?.classId === classId ? helpStatus : null;
  return <div className={`${styles.page} ${styles.dashboardHome}`} data-role={teacher ? "teacher" : "student"}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>{teacher ? "선생님 공간" : `${session.studentId} 학생의 교실`}</span><h1>오늘은 무엇을 해볼까요?</h1><p>할 일을 살펴보고, 하던 활동을 이어가세요.</p></div><div className={styles.headingTools}><time dateTime={seoulToday()}><CalendarDays size={16} aria-hidden="true" />{eventDate(seoulToday())}</time>{!teacher && <Button className={styles.refresh} size="icon" variant="ghost" aria-label="수업 새로고침" title="새로고침" onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" /></Button>}</div></header>
    {teacher && session.classIds.length > 0 && <TeacherToolbar classId={classId} classrooms={staff?.classrooms ?? session.classIds.map(id => ({ id, name: `2학년 ${id.split("-")[1]}반` }))} onClassChange={async value => { if (await beforeLeave()) { request.current += 1; selection.setClassId(value); } }} onRefresh={refresh} refreshing={loading} updatedAt={updatedAt}><Button variant="outline" nativeButton={false} render={<Link href={`/teacher/classes${classId ? `?classId=${classId}` : ""}`} />}>수업 관리<ArrowRight size={16} aria-hidden="true" /></Button></TeacherToolbar>}
    {teacher && CLASSROOM_HELP_ENABLED && classId && <div className={styles.helpJump}>{help?.count != null ? help.count > 0 ? <a href="#help-heading-all" onClick={event => { event.preventDefault(); const heading = document.getElementById("help-heading-all"); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: "start" }); }}>손든 학생 {help.count}명 보기<ArrowRight size={16} aria-hidden="true" /></a> : <span>손든 학생이 없어요.</span> : <span role="status">{help?.error ? "손들기 확인 필요 · 아래에서 다시 조회해 주세요." : "손들기 확인 중…"}</span>}{help?.count != null && help.error && <small>마지막 조회 기록 · 최신 확인 필요</small>}</div>}
    {error && <div className={styles.error} role="alert"><p>{error} {active && "마지막으로 확인한 수업 기록이에요."}</p><Button variant="outline" onClick={() => void refresh()}>수업 다시 불러오기</Button></div>}
    {loading && !active && !error && <LoadingState>수업 기록을 확인하고 있어요.</LoadingState>}
    {!teacher ? <LearningOverview data={student} loading={loading} error={Boolean(error)} /> : <section className={styles.current} aria-labelledby="current-heading"><div><span className={styles.eyebrow}><BookOpen size={17} aria-hidden="true" />{active?.classroom.name && `${active.classroom.name} · `}이번 수업</span>{loading && !active && !error ? <><h2 id="current-heading" className="sr-only">이번 수업 확인 중</h2><div className={styles.currentLoading}><Skeleton /><Skeleton /></div></> : <><h2 id="current-heading">{currentTitle}</h2><p>{current?.description ?? "수업 관리에서 담당 반의 수업을 준비해요."}</p>{current && classId && <Button className={styles.currentAction} variant="outline" nativeButton={false} render={<Link href={`/teacher/preview/${encodeURIComponent(current.id)}?classId=${encodeURIComponent(classId)}`} />}>수업 미리보기<ArrowRight size={16} aria-hidden="true" /></Button>}</>}</div>
      {staff && current && staffLesson?.id === current.id && <div className={styles.currentProgress}><ClassProgress lesson={current} students={staff.students} checkedAt={updatedAt ?? 0} /></div>}
    </section>}
    <div className={styles.columns}><div className={styles.mainColumn}>{!teacher && <><StudentLessonProgress data={student} loading={loading && !error} /><StudentBadges data={student} loading={loading && !error} /><TodoList uid={session.uid} /></>}{teacher && <section className={`${styles.panel} ${styles.actionsPanel}`} aria-labelledby="actions-heading"><div className={styles.sectionHeading}><div className={styles.sectionTitle}><span className={`${styles.titleIcon} ${styles.actionIcon}`}><ListChecks size={19} aria-hidden="true" /></span><h2 id="actions-heading">교사가 확인할 일</h2></div><Link href={`/teacher/students${classId ? `?classId=${classId}` : ""}`}>학생 현황<ArrowRight size={15} aria-hidden="true" /></Link></div>
      {loading && !active && !error && <LoadingList label="담당 반의 기록을 불러오고 있어요." />}
        {!session.classIds.length && <p className={styles.empty}>아직 담당 반이 없어요. 개인 할 일은 사용할 수 있어요.</p>}
        {staff && staffLesson && <p className={styles.cardLesson}><BookOpen size={16} aria-hidden="true" />{staffLesson.title}</p>}
        {staff && staffLesson && <ClassProgress lesson={staffLesson} students={staff.students} checkedAt={updatedAt ?? 0} stagesOnly />}
        {staff && <>
          <ul className={styles.actionList}>
            {staffLesson && <li><Link data-pending={pending > 0 || undefined} aria-label={`${staffLesson.title} · 확인 요청 ${pending}명`} href={`/teacher/students?classId=${staff.classroom.id}&lessonId=${staffLesson.id}&review=pending`}><span>확인 요청 <b>{pending}명</b><small>{pending > 0 ? "학생이 선생님 확인을 기다리고 있어요." : "기다리는 확인 요청이 없어요."}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>}
            <li><Link href={`/teacher/students?classId=${staff.classroom.id}${staff.selectedLessonId ? `&lessonId=${staff.selectedLessonId}` : ""}`}><span>학생별 학습 현황<small>등록 학생 <b>{staff.students.length}명</b>{staffLesson && <> · 제출 학생 <b>{submitted.length}명</b> · 저장된 제출 작품 <b>{submissionCount}개</b></>}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>
          </ul>
          {submitted.length > 0 && <>
            <h3 className={styles.recentHeading}>최근 제출 학생</h3>
            <ul className={styles.actionList} aria-label="최근 제출 학생">{submitted.slice(0, 3).map((item) => <li key={item.uid}><Link href={`/teacher/students?classId=${staff.classroom.id}&lessonId=${staff.selectedLessonId}&studentId=${item.studentId}`}><span className={styles.avatar} aria-hidden="true">{Number(item.studentId.slice(-2))}</span><span><strong>{item.studentId}</strong> 제출 작품 보기<small>작품 {staffLesson ? submissionCountFor(staffLesson, item.work) : 0}개 · {staffLesson && dateLabel(latestSubmissionAtFor(staffLesson, item.work))} 제출</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul>
            <p className={styles.muted}>작품을 열어 본 여부는 기록하지 않아요.</p>
          </>}
        </>}
        {staff && staffLesson && !submitted.length && <p className={styles.muted}>아직 이 수업에 저장된 제출 작품이 없어요.</p>}
      {!active && session.classIds.length > 0 && <p className={styles.muted}>수업 기록을 확인하면 다음 행동이 보여요.</p>}
    </section>}{teacher && CLASSROOM_HELP_ENABLED && classId && <HelpRequests key={classId} classId={classId} onStatusChange={setHelpStatus} />}{teacher && <TodoList uid={session.uid} />}</div><div className={styles.sideColumn}>{classId ? <ScheduleList key={classId} uid={session.uid} teacher={teacher} classId={classId} summary /> : <section className={styles.panel}><h2>다가오는 일정</h2><p className={styles.empty}>담당 반이 연결되면 일정을 확인할 수 있어요.</p></section>}<p className={styles.footnote}>일정은 수업을 준비하는 안내예요.<br />학습과 제출 상태는 수업 기록에서 확인해요.</p></div></div>
    <Link className={styles.allLessons} href={teacher ? `/teacher/classes${classId ? `?classId=${encodeURIComponent(classId)}` : ""}` : `${home}/lessons`}>{teacher ? "담당 반 수업 관리" : "다른 수업도 이어갈 수 있어요. 열린 수업 보기"}<ArrowRight size={16} aria-hidden="true" /></Link>
  </div>;
}
