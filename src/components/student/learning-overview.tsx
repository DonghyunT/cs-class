"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChartNoAxesColumn, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading-state";
import { prioritizedLessons, resumeLabelFor } from "@/lib/classroom/lesson-navigation";
import { progressFor } from "@/lib/classroom/progress";
import type { StudentDashboard } from "@/lib/classroom/types";
import { LearningStatus, ProgressSummary } from "./progress-summary";
import { ActivityProgressRing } from "./activity-progress-ring";
import styles from "./learning-overview.module.css";

export function LearningOverview({ data, loading, error }: { data: StudentDashboard | null; loading: boolean; error: boolean }) {
  const regular = data?.lessons.filter(lesson => lesson.mode !== "review") ?? [];
  const parts = regular.map(lesson => progressFor(lesson, data!.work[lesson.id]));
  const stages = ([['concept', '개념'], ['quiz', '퀴즈'], ['practice', '실습']] as const).map(([stage, label]) => {
    const completed = parts.reduce((sum, progress) => sum + progress[stage].completed, 0);
    const total = parts.reduce((sum, progress) => sum + progress[stage].total, 0);
    return { stage, label, completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
  });
  const completed = stages.reduce((sum, part) => sum + part.completed, 0);
  const total = stages.reduce((sum, part) => sum + part.total, 0);
  const current = data?.lessons.find(lesson => lesson.id === data.classroom.currentLessonId);
  const work = current ? data!.work[current.id] : undefined;
  const label = current ? progressFor(current, work).status === "completed" ? "다시 보기" : work?.updatedAt ? "이어하기" : "수업 시작" : "열린 수업 보기";
  return <section className={styles.overview} aria-labelledby="learning-overview-heading" aria-describedby="learning-overview-scope">
    <div className={styles.current}>
      <span className={styles.eyebrow}><BookOpen size={17} aria-hidden="true" />{data?.classroom.name && `${data.classroom.name} · `}이번 수업</span>
      <h3 id="current-heading">{current?.title ?? (!data && loading && !error ? "이번 수업을 확인하고 있어요." : !data && error ? "이번 수업을 확인하지 못했어요." : "다음 수업을 기다리고 있어요.")}</h3>
      <p>{current?.description ?? "열린 수업에서 먼저 학습해도 좋아요."}</p>
      {current && <div className={styles.resume}><LearningStatus lesson={current} work={work} /><span>{resumeLabelFor(current, work)}</span></div>}
      <Button nativeButton={false} aria-label={label} render={<Link href={current ? `/classroom/${current.id}?from=dashboard` : "/student/lessons"} />}>{label === "수업 시작" ? "시작하기" : label}<ArrowRight size={17} aria-hidden="true" /></Button>
    </div>
    <div className={styles.summary}>
      <h2 id="learning-overview-heading">나의 학습 진도</h2>
      {!data ? loading && !error ? <div className={styles.summaryLoading} aria-hidden="true"><Skeleton /><Skeleton /></div> : <p className={styles.empty}>수업 기록을 확인하면 진도가 보여요.</p> : total > 0 ? <>
        <ActivityProgressRing parts={stages} />
        <p className={styles.count}>필수 활동 {completed}/{total}개 완료</p>
      </> : <div className={styles.waiting}><BookOpen size={32} aria-hidden="true" /><p>아직 열린 정규 수업이 없어요.</p></div>}
      <p id="learning-overview-scope" className="sr-only">현재 열린 정규 수업 기준</p>
    </div>
  </section>;
}

export function StudentLessonProgress({ data, loading }: { data: StudentDashboard | null; loading: boolean }) {
  const lessons = data ? prioritizedLessons(data.lessons, data.classroom.currentLessonId, data.work).filter(lesson => lesson.mode !== "review") : [];
  return <section className={styles.lessons} aria-labelledby="lesson-progress-heading">
    <div className={styles.sectionHeading}><h2 id="lesson-progress-heading"><span className={styles.sectionIcon}><ChartNoAxesColumn size={20} aria-hidden="true" /></span>수업별 학습 진도</h2><Link href="/student/lessons">수업 전체 보기<LayoutGrid size={15} aria-hidden="true" /></Link></div>
    {loading && !data && <div className={styles.loading} aria-hidden="true"><Skeleton /><Skeleton /><Skeleton /></div>}
    {!loading && !data && <p className={styles.empty}>수업 기록을 확인하면 진도가 보여요.</p>}
    {data && !lessons.length && <p className={styles.empty}>정규 수업이 열리면 단계별 진도가 보여요.</p>}
    {lessons.map(lesson => <article key={lesson.id} className={styles.lesson} aria-labelledby={`progress-${lesson.id}`}>
      <div className={styles.lessonHeading}><div>{lesson.id === data!.classroom.currentLessonId && <span className={styles.currentBadge}>이번</span>}<h3 id={`progress-${lesson.id}`} title={lesson.title}>{lesson.title}</h3></div><LearningStatus lesson={lesson} work={data!.work[lesson.id]} /></div>
      <div className={styles.lessonProgress}><ProgressSummary lesson={lesson} work={data!.work[lesson.id]} /></div>
      <Link className={styles.lessonLink} href={`/classroom/${lesson.id}?from=dashboard`} aria-label={`${lesson.title} · ${resumeLabelFor(lesson, data!.work[lesson.id])}`} title={resumeLabelFor(lesson, data!.work[lesson.id])}>{progressFor(lesson, data!.work[lesson.id]).status === "completed" ? "복습" : data!.work[lesson.id]?.updatedAt ? "이어하기" : "시작하기"}<ArrowRight size={15} aria-hidden="true" /></Link>
    </article>)}
    {data?.lessons.some(lesson => lesson.mode === "review") && <Link className={styles.reviewLink} href="/student/lessons">선택 복습 수업 둘러보기<ArrowRight size={15} aria-hidden="true" /></Link>}
  </section>;
}
