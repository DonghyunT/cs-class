import { Check } from "lucide-react";
import { progressFor, STATUS_LABELS } from "@/lib/classroom/progress";
import type { Lesson, Work } from "@/lib/classroom/types";
import styles from "./student.module.css";

export function LearningStatus({ lesson, work }: { lesson: Lesson; work?: Work }) {
  const progress = progressFor(lesson, work);
  if (lesson.mode === "review") return progress.status === "completed" ? <span className={`${styles.status} ${styles.complete}`}><Check size={14} aria-hidden="true" />복습 완료</span> : <span className={styles.status}>복습 수업</span>;
  return <span className={`${styles.status} ${progress.status === "completed" ? styles.complete : ""}`}>
    {progress.status === "completed" && <Check size={14} aria-hidden="true" />}{STATUS_LABELS[progress.status]}
  </span>;
}

export function ProgressSummary({ lesson, work }: { lesson: Lesson; work?: Work }) {
  const progress = progressFor(lesson, work);
  return <dl className={styles.progressGrid} aria-label="단계별 진행">
    {([['concept', '개념'], ['quiz', '퀴즈'], ['practice', '실습']] as const).map(([stage, label]) => {
      const part = progress[stage];
      const detail = stage === "practice"
        ? lesson.practice.type === "flowchart" ? `4개 작품 중 ${part.completed}개 제출` : lesson.practice.type === "programming" ? `기본 ${part.total}개 미션 중 ${part.completed}개 제출` : work?.submission ? "제출 완료" : work?.validation?.passed ? "검증 통과 · 제출 전" : "제출 전"
        : `${part.total}${stage === "quiz" ? "문항" : "개"} 중 ${part.completed}${stage === "quiz" ? "문항 해결" : "개 완료"}`;
      return <div key={stage} className={styles.progressItem} data-stage={stage}>
        <dt>{label}<strong>{part.percent}%</strong></dt>
        <dd><span className={styles.track} role="progressbar" aria-label={`${label} 완료율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={part.percent} aria-valuetext={detail}><span style={{ width: `${part.percent}%` }} /></span><span>{detail}</span></dd>
      </div>;
    })}
  </dl>;
}
