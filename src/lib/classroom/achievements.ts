import { missionsFor } from "./programming-entry";
import { progressFor } from "./progress";
import type { Lesson, Work } from "./types";

// Needs the full Work: a WorkSummary has no quizRound, so a first-try full score could not be told apart.
type AnyWork = Work | null | undefined;

// What is still left before a lesson counts as complete, in the words students see on the stage tabs.
export function remainingFor(lesson: Lesson, work: AnyWork): string[] {
  const progress = progressFor(lesson, work);
  const left = (part: { completed: number; total: number }) => part.total - part.completed;
  const practice = left(progress.practice);
  return [
    left(progress.concept) && `개념 ${left(progress.concept)}개`,
    left(progress.quiz) && `퀴즈 ${left(progress.quiz)}문제`,
    practice && (lesson.practice.type === "programming" ? `미션 ${practice}개` : lesson.practice.type === "flowchart" ? `작품 ${practice}개` : "실습 제출"),
  ].filter((item): item is string => Boolean(item));
}

export type BadgeId = "first-step" | "concepts" | "perfect-quiz" | "missions" | "challenge" | "lesson-complete" | "review-complete";
export type Badge = { id: BadgeId; title: string; how: string; count: number; total: number; earned: boolean; lessons: string[] };

const BADGES: readonly { id: BadgeId; title: string; how: string }[] = [
  { id: "first-step", title: "첫 발걸음", how: "개념 하나를 처음 확인하면 받아요." },
  { id: "concepts", title: "개념 탐험가", how: "한 수업의 개념을 모두 확인하면 받아요." },
  { id: "perfect-quiz", title: "한 번에 만점", how: "퀴즈를 다시 풀지 않고 첫 회차에 모두 맞히면 받아요." },
  { id: "missions", title: "미션 해결사", how: "한 수업의 기본 미션을 모두 제출하면 받아요." },
  { id: "challenge", title: "도전자", how: "선택 도전 미션을 제출하면 받아요." },
  { id: "lesson-complete", title: "수업 완주", how: "정규 수업의 필수 활동을 모두 마치면 받아요." },
  { id: "review-complete", title: "복습 완주", how: "선택 복습 수업을 모두 마치면 받아요." },
];

// Badges earned in one regular lesson; the completion card lists these.
export function lessonBadgesFor(lesson: Lesson, work: AnyWork): BadgeId[] {
  const progress = progressFor(lesson, work);
  if (lesson.mode === "review") return progress.status === "completed" ? ["review-complete"] : [];
  const earned: BadgeId[] = [];
  if (progress.concept.percent === 100) earned.push("concepts");
  // quizRound only grows on a retry, so round 1 with every question solved is a first-try full score.
  if (progress.quiz.percent === 100 && work?.quizRound === 1) earned.push("perfect-quiz");
  if (progress.practice.percent === 100) earned.push("missions");
  if (progress.status === "completed") earned.push("lesson-complete");
  return earned;
}

// Badges come from the saved records of open lessons only, so nothing new is stored or read.
// `lessons` names where each badge was earned, for the badge page.
export function badgesFor(lessons: readonly Lesson[], work: Record<string, AnyWork>): Badge[] {
  const regular = lessons.filter(lesson => lesson.mode !== "review"), reviews = lessons.filter(lesson => lesson.mode === "review");
  const earnedIn = (list: readonly Lesson[], id: BadgeId) => list.filter(lesson => lessonBadgesFor(lesson, work[lesson.id]).includes(id));
  const optional = lessons.flatMap(lesson => lesson.practice.type === "programming" ? missionsFor(lesson.id).filter(mission => mission.optional).map(mission => ({ lesson, mission })) : []);
  const challenged = optional.filter(({ lesson, mission }) => work[lesson.id]?.missions?.[mission.id]?.submission);
  const where: Record<BadgeId, readonly Lesson[]> = {
    "first-step": lessons.filter(lesson => (work[lesson.id]?.conceptSolved.length ?? 0) > 0),
    concepts: earnedIn(regular, "concepts"),
    "perfect-quiz": earnedIn(regular, "perfect-quiz"),
    missions: earnedIn(regular, "missions"),
    challenge: lessons.filter(lesson => challenged.some(item => item.lesson === lesson)),
    "lesson-complete": earnedIn(regular, "lesson-complete"),
    "review-complete": earnedIn(reviews, "review-complete"),
  };
  const counts: Record<BadgeId, [number, number]> = {
    "first-step": [where["first-step"].length ? 1 : 0, lessons.length ? 1 : 0],
    concepts: [where.concepts.length, regular.length],
    "perfect-quiz": [where["perfect-quiz"].length, regular.length],
    missions: [where.missions.length, regular.length],
    challenge: [challenged.length, optional.length],
    "lesson-complete": [where["lesson-complete"].length, regular.length],
    "review-complete": [where["review-complete"].length, reviews.length],
  };
  return BADGES.map(badge => ({ ...badge, count: counts[badge.id][0], total: counts[badge.id][1], earned: counts[badge.id][0] > 0, lessons: where[badge.id].map(lesson => lesson.title) })).filter(badge => badge.total > 0);
}

export const badgeTitle = (id: BadgeId) => BADGES.find(badge => badge.id === id)!.title;
