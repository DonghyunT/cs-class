import { Check } from "lucide-react";
import { progressFor, STATUS_LABELS } from "@/lib/classroom/progress";
import type { Lesson, Work } from "@/lib/classroom/types";
import styles from "./student.module.css";

export function LearningStatus({ lesson, work }: { lesson: Lesson; work?: Work }) {
  const progress = progressFor(lesson, work);
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
        ? work?.submission ? "제출 완료" : work?.validation?.passed ? "검증 통과 · 제출 전" : "제출 전"
        : `${part.total}${stage === "quiz" ? "문항" : "개"} 중 ${part.completed}${stage === "quiz" ? "문항 해결" : "개 완료"}`;
      return <div key={stage} className={styles.progressItem}>
        <dt>{label}<strong>{part.percent}%</strong></dt>
        <dd><span className={styles.track}><span style={{ width: `${part.percent}%` }} /></span><span>{detail}</span></dd>
      </div>;
    })}
  </dl>;
}
