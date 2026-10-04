import { parseEntryProject } from "./entry-project";
import { buildProgrammingProject, programmingMissions, programmingProjectMatches } from "./programming-entry";
import type { Lesson, Progress, ValidationResult, Work, WorkDraft } from "./types";

export const STATUS_LABELS = { "not-started": "시작 전", "in-progress": "진행 중", completed: "완료" };
export function emptyWork(lesson: Lesson): Work {
  return {
    lessonId: lesson.id, revision: 0,
    draft: {
      stage: "concept",
      conceptAnswers: {},
      quizAnswers: {},
      practiceOrder: lesson.practice.type === "entryjs" ? parseEntryProject(lesson.practice.defaultProject)?.order ?? [] : lesson.practice.blocks.map((block) => block.id),
      entryProject: lesson.practice.defaultProject ?? null,
      ...(lesson.practice.type === "programming" ? { programming: { mission: "name", projects: { name: buildProgrammingProject() }, reflection: "" } } : {}),
    },
    conceptSolved: [], conceptFeedback: {}, quizSolved: [], quizRound: 1,
    quizRoundIds: lesson.quiz.map((question) => question.id), quizRoundGraded: false,
    quizFeedback: {}, validation: null, submission: null, updatedAt: null,
  };
}
export function practiceMatches(draft: WorkDraft, saved: Pick<ValidationResult, "order" | "entryProject"> | null | undefined): boolean {
  if (!saved || draft.practiceOrder.length !== saved.order.length || !draft.practiceOrder.every((id, index) => id === saved.order[index])) return false;
  if (!draft.entryProject && !saved.entryProject) return true;
  const current = parseEntryProject(draft.entryProject);
  const previous = parseEntryProject(saved.entryProject);
  return current && previous ? JSON.stringify(current.threads) === JSON.stringify(previous.threads) : programmingProjectMatches(draft.entryProject, saved.entryProject);
}
export function progressFor(lesson: Lesson, work?: Work | null): Progress {
  const ratio = (completed: number, total: number) => ({ completed, total, percent: total ? Math.round(completed / total * 100) : 100 });
  const concept = ratio(lesson.concepts.filter((c) => work?.conceptSolved.includes(c.id)).length, lesson.concepts.length);
  const quiz = ratio(lesson.quiz.filter((q) => work?.quizSolved.includes(q.id)).length, lesson.quiz.length);
  const required = programmingMissions.filter((m) => !("optional" in m));
  const practice = lesson.practice.type === "programming" ? ratio(required.filter((m) => work?.missions?.[m.id]?.submission).length, required.length) : ratio(work?.submission ? 1 : 0, 1);
  const completed = concept.percent === 100 && quiz.percent === 100 && practice.percent === 100;
  return { concept, quiz, practice, status: completed ? "completed" : work?.updatedAt ? "in-progress" : "not-started" };
}
