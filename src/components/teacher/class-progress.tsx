import { ActivityProgressRing } from "@/components/student/activity-progress-ring";
import { progressFor } from "@/lib/classroom/progress";
import type { Lesson, StudentRow } from "@/lib/classroom/types";
import styles from "./class-progress.module.css";

export function ClassProgress({ lesson, students, checkedAt, stagesOnly = false }: { lesson: Lesson; students: StudentRow[]; checkedAt: number; stagesOnly?: boolean }) {
  if (lesson.mode === "review") return <p className={styles.review}>선택 복습 수업 · 필수 활동 완료율에 포함하지 않아요.</p>;
  if (!students.length) return <p className={styles.review}>학생이 등록되면 학습 현황을 볼 수 있어요.</p>;
  const progress = students.map(student => progressFor(lesson, student.work));
  const parts = ([['concept', '개념'], ['quiz', '퀴즈'], ['practice', '실습']] as const).map(([stage, label]) => {
    const completed = progress.reduce((sum, value) => sum + value[stage].completed, 0), total = progress.reduce((sum, value) => sum + value[stage].total, 0);
    return { stage, label, completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
  });
  const total = parts.reduce((sum, part) => sum + part.total, 0), completed = parts.reduce((sum, part) => sum + part.completed, 0);
  const recent = students.filter(student => student.lastActiveAt && checkedAt - student.lastActiveAt < 120_000).length;
  if (stagesOnly) return <div className={styles.stageGrid} aria-label="반 전체 단계별 진도">{parts.map(part => <div key={part.stage} data-stage={part.stage}><div><span>{part.label}</span><strong>{part.completed}/{part.total}</strong></div><span className={styles.track} role="progressbar" aria-label={`반 전체 ${part.label} 진도`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={part.percent} aria-valuetext={`${part.completed}/${part.total}개 완료`}><i style={{ width: `${part.percent}%` }} /></span></div>)}</div>;
  return <div className={styles.overview} aria-label="이번 수업 학생 학습 현황">
    <ActivityProgressRing parts={parts} size="compact" interactive={false} label="반 전체 필수 활동 완료율" />
    <div className={styles.metrics}><strong>필수 활동 {completed}/{total}개 완료</strong><div className={styles.states}>{([['not-started', '시작 전'], ['in-progress', '진행 중'], ['completed', '완료']] as const).map(([status, label]) => <span key={status} data-state={status}><i aria-hidden="true" />{label}<b>{progress.filter(value => value.status === status).length}명</b></span>)}</div><small>등록 {students.length}명 · 최근 2분 활동 {recent}명</small></div>
  </div>;
}
