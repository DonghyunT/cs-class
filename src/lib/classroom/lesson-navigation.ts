import { missionById } from "./programming-entry";
import { progressFor } from "./progress";
import type { Lesson, Work } from "./types";

// This lesson on top, then regular lessons newest first (the catalog lists them in teaching order), then optional reviews.
// Progress never moves a lesson, so students find each one where it was.
export function prioritizedLessons(lessons: readonly Lesson[], currentLessonId: string | null) {
  const rest = [...lessons.filter(lesson => lesson.mode !== "review").reverse(), ...lessons.filter(lesson => lesson.mode === "review")];
  return [...rest.filter(lesson => lesson.id === currentLessonId), ...rest.filter(lesson => lesson.id !== currentLessonId)];
}

export function resumeLabelFor(lesson: Lesson, work?: Work | null) {
  if (lesson.mode === "review") return progressFor(lesson, work).status === "completed" ? "복습 완료 · 다시 보기" : work?.updatedAt ? "이어서 복습하기" : "다시 둘러보기";
  if (!work?.updatedAt) return "수업 시작";
  if (progressFor(lesson, work).status === "completed") return "필수 활동 완료 · 다시 보기";
  if (work.draft.stage === "practice") {
    const title = lesson.practice.type === "programming"
      ? missionById(work.draft.programming?.mission ?? "")?.title ?? lesson.practice.title
      : lesson.practice.title;
    return `실습 · ${title}`;
  }
  return work.draft.stage === "concept" ? "개념 이어하기" : "퀴즈 이어하기";
}
