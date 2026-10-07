"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, LayoutGrid, List, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, LoadingState, Skeleton } from "@/components/ui/loading-state";
import { useSession } from "@/components/session-provider";
import { classroomApi } from "@/lib/classroom/client";
import { prioritizedLessons, resumeLabelFor } from "@/lib/classroom/lesson-navigation";
import { progressFor } from "@/lib/classroom/progress";
import type { StudentDashboard } from "@/lib/classroom/types";
import { LearningStatus, ProgressSummary } from "./progress-summary";
import { ActivityProgressRing } from "./activity-progress-ring";
import styles from "./student.module.css";

export function StudentDashboardView() {
  const { session } = useSession();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unfinished" | "completed">("all");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const alive = useRef(true);
  const fetching = useRef(false);
  const refresh = useCallback(async (requested = false) => {
    if (requested) setRefreshing(true);
    if (fetching.current) return;
    fetching.current = true;
    try { const result = await classroomApi.student(); if (alive.current) { setData(result); setError(""); } }
    catch (problem) { if (alive.current) setError(problem instanceof Error ? problem.message : "수업을 불러오지 못했어요."); }
    finally { fetching.current = false; if (alive.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) void refresh(); });
    const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(visibleRefresh, 30_000);
    window.addEventListener("focus", visibleRefresh);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener("focus", visibleRefresh); };
  }, [refresh]);
  if (loading) return <div className={styles.dashboard} aria-busy="true">
    <div className={styles.lessonLoadingHeader} aria-hidden="true"><Skeleton /><Skeleton /></div>
    <LoadingState>열린 수업을 불러오고 있어요.</LoadingState>
    <div className={`${styles.lessonList} ${styles.lessonLoadingList}`} aria-hidden="true">{[0, 1, 2].map((row) => <div key={row} className={styles.lessonCard}>
      <Skeleton className={styles.lessonLoadingTitle} /><Skeleton className={styles.lessonLoadingDescription} /><Skeleton className={styles.lessonLoadingProgress} /><Skeleton className={styles.lessonLoadingAction} />
    </div>)}</div>
  </div>;
  if (!data) return <div className={styles.empty} role="alert"><BookOpen size={32} /><h1>수업을 불러오지 못했어요.</h1><p>{error}</p>{refreshing && <LoadingState>수업 기록을 확인하고 있어요.</LoadingState>}<Button aria-disabled={refreshing} onClick={() => void refresh(true)}>다시 불러오기</Button></div>;
  const current = data.lessons.find((lesson) => lesson.id === data.classroom.currentLessonId);
  const completed = data.lessons.filter((lesson) => progressFor(lesson, data.work[lesson.id]).status === "completed").length;
  const shown = prioritizedLessons(data.lessons, data.classroom.currentLessonId, data.work).filter((lesson) => filter === "all" || (progressFor(lesson, data.work[lesson.id]).status === "completed") === (filter === "completed"));
  return <div className={styles.dashboard}>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}>{data.classroom.name} · 나의 학습 공간</span><h1>열린 수업을 살펴봐요.</h1><p>{session?.studentId} 학생의 학습 기록을 확인해요.</p></div>
      <div className={styles.headingTools}>
        <dl className={styles.overview} aria-label="학습 현황"><div><dt>열린 수업</dt><dd>{data.lessons.length}<small>개</small></dd></div><div><dt>완료한 수업</dt><dd>{completed}<small>개</small></dd></div></dl>
        <Button variant="ghost" aria-label="수업 새로고침" aria-disabled={refreshing} onClick={() => void refresh(true)}>{refreshing ? <LoadingSpinner /> : <RefreshCw size={16} aria-hidden="true" />}<span>{refreshing ? "확인 중" : "새로고침"}</span></Button>
      </div>
    </header>
    <span className={styles.srOnly} role="status" aria-live="polite">{refreshing ? "수업 기록을 확인하고 있어요." : ""}</span>
    {error && <div className={styles.notice} role="alert">{error} 마지막으로 확인한 수업을 보여드리고 있어요.</div>}
    <section className={styles.library} aria-labelledby="lessons-heading">
      <div className={styles.sectionHeading}><div><h2 id="lessons-heading">열린 수업 <span>{data.lessons.length}</span></h2><p>단계별 진행을 확인하고 하던 곳에서 이어가세요.</p></div>
        <div className={styles.libraryTools}><div className={styles.filters} role="group" aria-label="열린 수업 필터">{([['all', '전체'], ['unfinished', '미완료'], ['completed', '완료']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className={styles.layoutPicker} role="group" aria-label="열린 수업 보기 방식"><button type="button" aria-label="목록 보기" aria-pressed={layout === "list"} aria-controls="opened-lessons" onClick={() => setLayout("list")}><List size={16} aria-hidden="true" />목록</button><button type="button" aria-label="격자 보기" aria-pressed={layout === "grid"} aria-controls="opened-lessons" onClick={() => setLayout("grid")}><LayoutGrid size={16} aria-hidden="true" />격자</button></div></div>
      </div>
      <div id="opened-lessons" className={`${styles.lessonCollection} ${layout === "list" ? styles.lessonRows : styles.lessonTiles}`} data-layout={layout}>{shown.map((lesson) => {
        const work = data.work[lesson.id], progress = progressFor(lesson, work);
        const parts = ([['concept', '개념'], ['quiz', '퀴즈'], ['practice', '실습']] as const).map(([stage, label]) => ({ stage, label, ...progress[stage] }));
        const entryLabel = lesson.mode === "review" ? work?.updatedAt ? "이어서 복습하기" : "다시 둘러보기" : progress.status === "completed" ? "다시 보기" : work?.updatedAt ? "이어하기" : "수업 시작";
        return <article key={lesson.id} className={styles.lessonRecord} aria-labelledby={`lesson-card-${lesson.id}`}>
          <div className={styles.lessonIdentity}><div className={styles.inline}>{current?.id === lesson.id && <span className={styles.tag}>이번 수업</span>}<LearningStatus lesson={lesson} work={work} /></div><h3 id={`lesson-card-${lesson.id}`}>{lesson.title}</h3>{lesson.mode !== "review" && work?.updatedAt && progress.status !== "completed" && <p className={styles.lessonResume}>이어갈 곳: {resumeLabelFor(lesson, work)}</p>}</div>
          <div className={styles.lessonMetrics}>{lesson.mode !== "review" ? layout === "list" ? <ProgressSummary lesson={lesson} work={work} /> : <div className={styles.lessonTileVisual}><ActivityProgressRing parts={parts} label={`${lesson.title} 필수 활동 완료율`} size="compact" interactive={false} /><p className={styles.lessonDescription} title={lesson.description}>{lesson.description}</p></div> : <div className={styles.lessonReview}>{layout === "grid" && <p className={styles.lessonDescription} title={lesson.description}>{lesson.description}</p>}<span>선택 복습 · 성적에 반영하지 않아요</span></div>}</div>
          <div className={styles.lessonEntry}><Button variant="outline" nativeButton={false} aria-label={entryLabel} title={`${lesson.title} · ${entryLabel}`} render={<Link href={`/classroom/${lesson.id}?from=lessons`} />}>{entryLabel === "수업 시작" ? "시작하기" : entryLabel === "이어서 복습하기" ? "복습하기" : entryLabel === "다시 둘러보기" ? "둘러보기" : entryLabel}<ArrowRight size={16} aria-hidden="true" /></Button></div>
        </article>;
      })}</div>
      {!shown.length && <div className={styles.empty}><BookOpen size={32} /><h3>{data.lessons.length ? "해당하는 수업이 없어요." : "아직 열린 수업이 없어요."}</h3><p>{data.lessons.length ? "전체 수업에서 학습할 수업을 확인하세요." : "선생님이 수업을 열면 이곳에서 시작할 수 있어요."}</p>{data.lessons.length > 0 && <Button variant="outline" onClick={() => setFilter("all")}>전체 수업 보기</Button>}</div>}
    </section>
  </div>;
}
