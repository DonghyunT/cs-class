import { parseEntryProject } from "./entry-project";
import { missionStarter, missionsFor, programmingProjectMatches, requiredMissionsFor } from "./programming-entry";
import type { Lesson, Progress, Submission, ValidationResult, Work, WorkDraft, WorkSummary } from "./types";
import { initialReviewProject, isReviewType, sameReviewProject, reviewMissionIds } from "./review/project";

// A new submission keeps the first one's time. A submission saved before firstSubmittedAt existed
// hands on its own submittedAt, which is then only the latest time the first submission can have been.
export function submissionTimes(previous: Pick<Submission, "submittedAt" | "firstSubmittedAt"> | null | undefined, now = Date.now()) {
  return { submittedAt: now, firstSubmittedAt: previous ? previous.firstSubmittedAt ?? previous.submittedAt : now };
}
export const STATUS_LABELS ={ "not-started": "시작 전", "in-progress": "진행 중", completed: "완료" };
export function submissionCountFor(lesson: Lesson, work?: Work | WorkSummary | null): number {
  return lesson.practice.type === "flowchart" ? reviewMissionIds.filter(id => work?.missions?.[id]?.submission).length : lesson.practice.type === "programming" ? missionsFor(lesson.id).filter((mission) => work?.missions?.[mission.id]?.submission).length : work?.submission ? 1 : 0;
}
export function latestSubmissionAtFor(lesson: Lesson, work?: Work | WorkSummary | null): number {
  const ids = lesson.practice.type === "flowchart" ? reviewMissionIds :
    lesson.practice.type === "programming" ? missionsFor(lesson.id).map(mission => mission.id) : null;
  return ids ? Math.max(0, ...ids.map(id => work?.missions?.[id]?.submission?.submittedAt ?? 0)) :
    work?.submission?.submittedAt ?? 0;
}
// A retry round lists only the questions still wrong; once all are solved the whole quiz comes back to look over.
export function shownQuizIds(lesson: Lesson, work: Pick<Work, "quizRoundIds" | "quizSolved">): string[] {
  return lesson.quiz.length && lesson.quiz.every((question) => work.quizSolved.includes(question.id)) ? lesson.quiz.map((question) => question.id) : work.quizRoundIds;
}
export function emptyWork(lesson: Lesson): Work {
  return {
    lessonId: lesson.id, revision: 0,
    draft: {
      stage: "concept",
      conceptAnswers: {},
      quizAnswers: {},
      practiceOrder: lesson.practice.type === "entryjs" ? parseEntryProject(lesson.practice.defaultProject)?.order ?? [] : lesson.practice.blocks.map((block) => block.id),
      entryProject: lesson.practice.defaultProject ?? null,
      ...(lesson.practice.type === "programming" ? { programming: { mission: missionsFor(lesson.id)[0].id, projects: { [missionsFor(lesson.id)[0].id]: missionStarter(missionsFor(lesson.id)[0].id) }, reflection: "" } } : {}),
      ...(isReviewType(lesson.practice.type) ? { reviewProject: initialReviewProject(lesson.practice.type!) } : {}),
    },
    conceptSolved: [], conceptFeedback: {}, quizSolved: [], quizRound: 1,
    quizRoundIds: lesson.quiz.map((question) => question.id), quizRoundGraded: false,
    quizFeedback: {}, validation: null, submission: null, updatedAt: null,
  };
}
export function practiceMatches(draft: WorkDraft, saved: Pick<ValidationResult, "order" | "entryProject" | "reviewProject"> | null | undefined): boolean {
  if (draft.reviewProject || saved?.reviewProject) return sameReviewProject(draft.reviewProject, saved?.reviewProject);
  if (!saved || draft.practiceOrder.length !== saved.order.length || !draft.practiceOrder.every((id, index) => id === saved.order[index])) return false;
  if (!draft.entryProject && !saved.entryProject) return true;
  const current = parseEntryProject(draft.entryProject);
  const previous = parseEntryProject(saved.entryProject);
  return current && previous ? JSON.stringify(current.threads) === JSON.stringify(previous.threads) : programmingProjectMatches(draft.entryProject, saved.entryProject);
}
// The fields progress reads, so the assessment can pass work read through a field mask.
type ProgressSource = Pick<WorkSummary, "conceptSolved" | "quizSolved" | "updatedAt"> & { submission: unknown; missions?: Record<string, { submission: unknown }> };
export function progressFor(lesson: Lesson, work?: ProgressSource | null): Progress {
  const ratio = (completed: number, total: number) => ({ completed, total, percent: total ? Math.round(completed / total * 100) : 100 });
  const concept = ratio(lesson.concepts.filter((c) => work?.conceptSolved.includes(c.id)).length, lesson.concepts.length);
  const quiz = ratio(lesson.quiz.filter((q) => work?.quizSolved.includes(q.id)).length, lesson.quiz.length);
  const required = requiredMissionsFor(lesson.id);
  const practice = lesson.practice.type === "flowchart" ? ratio(reviewMissionIds.filter(id => work?.missions?.[id]?.submission).length, reviewMissionIds.length) : lesson.practice.type === "programming" ? ratio(required.filter((m) => work?.missions?.[m.id]?.submission).length, required.length) : ratio(work?.submission ? 1 : 0, 1);
  const completed = concept.percent === 100 && quiz.percent === 100 && practice.percent === 100;
  return { concept, quiz, practice, status: completed ? "completed" : work?.updatedAt ? "in-progress" : "not-started" };
}
// Concept, quiz and practice weigh a third each however many items they hold; a stage with no items is left out.
// Floored, so 100 means every item is done, after rounding away float error (94.99999999999999 for a true 95).
export function overallPercent(stages: readonly { completed: number; total: number }[]): number {
  const present = stages.filter((stage) => stage.total > 0);
  if (!present.length) return 0;
  const mean = present.reduce((sum, stage) => sum + stage.completed / stage.total, 0) / present.length;
  return Math.floor(+(mean * 100).toFixed(6));
}
