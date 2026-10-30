import { overallPercent } from "./progress";
import type { AssessmentLesson, AssessmentRow, Stage } from "./types";

export const ASSESSMENT_STAGES: readonly { stage: Stage; label: string }[] = [{ stage: "concept", label: "개념" }, { stage: "quiz", label: "퀴즈" }, { stage: "practice", label: "실습" }];

// Full marks only at 100%; every 5% short costs 2 points, down to the floor of 6 (2026-10-30 teacher decision).
export function assessmentScore(percent: number): number {
  return Math.max(6, 30 - 2 * Math.ceil((100 - percent) / 5));
}

// Counts across the chosen lessons, the way the student's dashboard ring adds up its open lessons.
export function stageTotals(row: AssessmentRow, lessonIds: readonly string[]): Record<Stage, { completed: number; total: number }> {
  const sum = (stage: Stage) => lessonIds.reduce((total, id) => {
    const value = row.progress[id]?.[stage];
    return { completed: total.completed + (value?.completed ?? 0), total: total.total + (value?.total ?? 0) };
  }, { completed: 0, total: 0 });
  return { concept: sum("concept"), quiz: sum("quiz"), practice: sum("practice") };
}

export function rowPercent(row: AssessmentRow, lessonIds: readonly string[]): number {
  const totals = stageTotals(row, lessonIds);
  return overallPercent(ASSESSMENT_STAGES.map(({ stage }) => totals[stage]));
}

// Excel runs a cell that starts with = + - @ (or tab/CR) as a formula; a leading quote keeps nicknames as text.
function cell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

// Counts sit in their own numeric cells, totals in the headers: "3/5" would open in Excel as a date.
export function assessmentCsv(className: string, lessons: readonly AssessmentLesson[], rows: readonly AssessmentRow[]): string {
  const ids = lessons.map((lesson) => lesson.id);
  const first = rows[0];
  const totals = first ? stageTotals(first, ids) : null;
  const header = ["반", "학번", "닉네임", "전체 진행률(%)", "점수",
    ...ASSESSMENT_STAGES.map(({ stage, label }) => `${label} 완료(전체 ${totals?.[stage].total ?? 0})`),
    ...lessons.flatMap((lesson) => ASSESSMENT_STAGES.map(({ stage, label }) => `${lesson.title} ${label}(전체 ${first?.progress[lesson.id]?.[stage].total ?? 0})`))];
  const lines = rows.map((row) => {
    const percent = rowPercent(row, ids), sums = stageTotals(row, ids);
    return [className, row.studentId, row.nickname ?? "", percent, assessmentScore(percent),
      ...ASSESSMENT_STAGES.map(({ stage }) => sums[stage].completed),
      ...lessons.flatMap((lesson) => ASSESSMENT_STAGES.map(({ stage }) => row.progress[lesson.id]?.[stage].completed ?? 0))];
  });
  return [header, ...lines].map((line) => line.map(cell).join(",")).join("\r\n");
}
