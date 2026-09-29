import type { Lesson, Progress, Work } from "./types";

export const STATUS_LABELS = { "not-started": "시작 전", "in-progress": "진행 중", completed: "완료" };
export function emptyWork(lesson: Lesson): Work {
  return {
    lessonId: lesson.id, revision: 0,
    draft: {
      stage: "concept",
      conceptAnswers: {},
      quizAnswers: {},
      practiceOrder: lesson.practice.blocks ? lesson.practice.blocks.map((block) => block.id) : [],
      entryProject: lesson.practice.defaultProject ?? null,
    },
    conceptSolved: [], conceptFeedback: {}, quizSolved: [], quizRound: 1,
    quizRoundIds: lesson.quiz.map((question) => question.id), quizRoundGraded: false,
    quizFeedback: {}, validation: null, submission: null, updatedAt: null,
  };
}
export function progressFor(lesson: Lesson, work?: Work | null): Progress {
  const ratio = (completed: number, total: number) => ({ completed, total, percent: total ? Math.round(completed / total * 100) : 100 });
  const concept = ratio(lesson.concepts.filter((c) => work?.conceptSolved.includes(c.id)).length, lesson.concepts.length);
  const quiz = ratio(lesson.quiz.filter((q) => work?.quizSolved.includes(q.id)).length, lesson.quiz.length);
  const practice = ratio(work?.submission ? 1 : 0, 1);
  const completed = concept.percent === 100 && quiz.percent === 100 && practice.percent === 100;
  return { concept, quiz, practice, status: completed ? "completed" : work?.updatedAt ? "in-progress" : "not-started" };
}
