"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, RefreshCw, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardArt } from "@/components/dashboard-art";
import { useSession } from "@/components/session-provider";
import { classroomApi } from "@/lib/classroom/client";
import { progressFor } from "@/lib/classroom/progress";
import type { StudentDashboard } from "@/lib/classroom/types";
import { LearningStatus, ProgressSummary } from "./progress-summary";
import styles from "./student.module.css";

export function StudentDashboardView() {
  const { session } = useSession();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unfinished" | "completed">("all");
  const alive = useRef(true);
  const fetching = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try { const result = await classroomApi.student(); if (alive.current) { setData(result); setError(""); } }
    catch (problem) { if (alive.current) setError(problem instanceof Error ? problem.message : "수업을 불러오지 못했어요."); }
    finally { fetching.current = false; if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) void refresh(); });
    const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(visibleRefresh, 30_000);
    window.addEventListener("focus", visibleRefresh);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener("focus", visibleRefresh); };
  }, [refresh]);
  if (loading) return <div className={styles.loading} role="status"><BookOpen aria-hidden="true" />우리 반 수업을 불러오고 있어요.</div>;
  if (!data) return <div className={styles.empty} role="alert"><BookOpen size={32} /><h1>수업을 불러오지 못했어요.</h1><p>{error}</p><Button onClick={() => void refresh()}>다시 불러오기</Button></div>;
  const current = data.lessons.find((lesson) => lesson.id === data.classroom.currentLessonId);
  const completed = data.lessons.filter((lesson) => progressFor(lesson, data.work[lesson.id]).status === "completed").length;
  const shown = data.lessons.filter((lesson) => filter === "all" || (progressFor(lesson, data.work[lesson.id]).status === "completed") === (filter === "completed"));
  return <div className={styles.dashboard}>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}>{data.classroom.name} · 나의 학습 공간</span><h1>수업을 이어가 볼까요?</h1><p>{session?.studentId} 학생의 학습 기록을 확인해요.</p></div>
      <div className={styles.headingTools}>
        <dl className={styles.overview} aria-label="학습 현황"><div><dt>열린 수업</dt><dd>{data.lessons.length}<small>개</small></dd></div><div><dt>완료한 수업</dt><dd>{completed}<small>개</small></dd></div></dl>
        <Button variant="ghost" aria-label="수업 새로고침" onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" /><span>새로고침</span></Button>
      </div>
    </header>
    {error && <div className={styles.notice} role="alert">{error} 마지막으로 확인한 수업을 보여드리고 있어요.</div>}
      <section className={styles.current} aria-labelledby="current-heading">
        <div className={styles.currentCopy}>
          <span className={styles.eyebrow}><span className={styles.dot} />이번 수업</span>
          <h2 id="current-heading">{current?.title ?? "다음 수업을 기다리고 있어요"}</h2>
          <p>{current?.description ?? "선생님이 이번 수업을 지정하면 여기에 보여요. 먼저 열린 수업을 살펴봐도 좋아요."}</p>
          <div className={styles.currentActions}>{current ? <><Button size="lg" nativeButton={false} render={<Link href={`/classroom/${current.id}`} />}>
            {progressFor(current, data.work[current.id]).status === "completed" ? "다시 보기" : data.work[current.id]?.updatedAt ? "이어하기" : "수업 시작"}<ArrowRight size={18} />
          </Button><LearningStatus lesson={current} work={data.work[current.id]} /></> : <Button variant="outline" nativeButton={false} render={<Link href="#lessons" />}>열린 수업 보기<ArrowRight size={16} /></Button>}</div>
        </div>
        <DashboardArt variant="student" className={styles.heroArt} />
      </section>
    <section id="lessons" className={styles.library} aria-labelledby="lessons-heading">
      <div className={styles.sectionHeading}><div><h2 id="lessons-heading">열린 수업 <span>{data.lessons.length}</span></h2><p>단계별 진행을 확인하고 하던 곳에서 이어가세요.</p></div>
        <div className={styles.filters} role="group" aria-label="열린 수업 필터">{([['all', '전체'], ['unfinished', '미완료'], ['completed', '완료']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      </div>
      <div className={styles.lessonList}>{shown.map((lesson) => <article key={lesson.id} className={styles.lessonCard}>
        <div className={styles.cardHeading}><span className={styles.lessonNumber}><Layers3 size={24} /></span><div><div className={styles.inline}>{current?.id === lesson.id && <span className={styles.tag}>이번 수업</span>}<LearningStatus lesson={lesson} work={data.work[lesson.id]} /></div><h3>{lesson.title}</h3><p>{lesson.description}</p></div></div>
        <ProgressSummary lesson={lesson} work={data.work[lesson.id]} />
        <div className={styles.cardFooter}><span><Check size={15} />필수 활동을 모두 마치면 수업 완료</span><Button variant="outline" nativeButton={false} render={<Link href={`/classroom/${lesson.id}`} />}>{progressFor(lesson, data.work[lesson.id]).status === "completed" ? "다시 보기" : data.work[lesson.id]?.updatedAt ? "이어하기" : "수업 시작"}<ArrowRight size={16} /></Button></div>
      </article>)}</div>
      {!shown.length && <div className={styles.empty}><BookOpen size={32} /><h3>{data.lessons.length ? "해당하는 수업이 없어요." : "아직 열린 수업이 없어요."}</h3><p>{data.lessons.length ? "전체 수업에서 학습할 수업을 확인하세요." : "선생님이 수업을 열면 이곳에서 시작할 수 있어요."}</p>{data.lessons.length > 0 && <Button variant="outline" onClick={() => setFilter("all")}>전체 수업 보기</Button>}</div>}
    </section>
  </div>;
}
