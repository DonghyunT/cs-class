import { missionById } from "./programming-entry";
import { progressFor } from "./progress";
import type { Lesson, Work } from "./types";

export function prioritizedLessons(lessons: Lesson[], currentLessonId: string | null, work: Record<string, Work>) {
  const rank = (lesson: Lesson) => lesson.id === currentLessonId ? 0 : ({ "in-progress": 1, "not-started": 2, completed: 3 })[progressFor(lesson, work[lesson.id]).status];
  return [...lessons].sort((a, b) => rank(a) - rank(b));
}

export function resumeLabelFor(lesson: Lesson, work?: Work | null) {
  if (lesson.mode === "review") return work?.updatedAt ? "이어서 복습하기" : "다시 둘러보기";
  if (!work?.updatedAt) return "수업 시작";
  if (progressFor(lesson, work).status === "completed") return "필수 활동 완료 · 복습하기";
  if (work.draft.stage === "practice") {
    const title = lesson.practice.type === "programming"
      ? missionById(work.draft.programming?.mission ?? "")?.title ?? lesson.practice.title
      : lesson.practice.title;
    return `실습 · ${title}`;
  }
  return work.draft.stage === "concept" ? "개념 이어하기" : "퀴즈 이어하기";
}
