import { missionsFor } from "./programming-entry";
import { progressFor, submissionCountFor } from "./progress";
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

export type BadgeId = "first-step" | "first-work" | "concepts" | "perfect-quiz" | "missions" | "challenge" | "lesson-complete" | "review-complete" | "stamps" | "all-clear" | "comeback" | "reflection" | "streak";
export type BadgeKind = "common" | "tiered" | "level" | "rare" | "surprise";
// stars: tier reached (0-5) for tiered and level badges, 1 once earned otherwise; next: count needed for the next star, null at the top.
export type Badge = { id: BadgeId; kind: BadgeKind; title: string; how: string; teaser?: string; count: number; total: number; earned: boolean; stars: number; next: number | null; lessons: string[] };

// Fixed counts, not shares of open lessons, so a newly opened lesson never takes a star away.
const STEPS = [1, 3, 5, 10, 20], STAMP_STEPS = [10, 25, 50, 100, 150];
const BADGES: readonly { id: BadgeId; kind: BadgeKind; title: string; how: string; teaser?: string }[] = [
  { id: "stamps", kind: "level", title: "도장 수집가", how: "수업마다 개념·첫 회차 만점·미션·완주 도장을 모아요." },
  { id: "all-clear", kind: "rare", title: "올클리어", how: "한 수업에서 개념, 첫 회차 만점, 기본 미션, 도전 미션까지 모두 해내면 받아요.", teaser: "빈틈없이 완벽한 하루" },
  { id: "streak", kind: "rare", title: "만점 행진", how: "이어진 정규 수업 세 개에서 퀴즈를 모두 첫 회차에 만점으로 통과하면 받아요.", teaser: "당신은 혹시 정보 영재?" },
  { id: "concepts", kind: "tiered", title: "개념 탐험가", how: "한 수업의 개념을 모두 확인하면 받아요." },
  { id: "perfect-quiz", kind: "tiered", title: "한 번에 만점", how: "퀴즈를 다시 풀지 않고 첫 회차에 모두 맞히면 받아요." },
  { id: "missions", kind: "tiered", title: "미션 해결사", how: "한 수업의 기본 미션을 모두 제출하면 받아요." },
  { id: "challenge", kind: "tiered", title: "도전자", how: "선택 도전 미션을 제출하면 받아요." },
  { id: "lesson-complete", kind: "tiered", title: "수업 완주", how: "정규 수업의 필수 활동을 모두 마치면 받아요." },
  { id: "review-complete", kind: "tiered", title: "복습 완주", how: "선택 복습 수업을 모두 마치면 받아요." },
  { id: "comeback", kind: "surprise", title: "오뚝이", how: "세 번 넘어져도 끝까지 해냈어요! 퀴즈를 3회차 이상 다시 풀어 모두 맞히면 받아요.", teaser: "포기하지 않는 사람에게" },
  { id: "reflection", kind: "surprise", title: "생각 기록가", how: "실습 아래에 오늘 발견한 것을 적어 저장하면 받아요.", teaser: "작품 너머의 깨달음을 남기면" },
  { id: "first-step", kind: "common", title: "첫 발걸음", how: "개념 하나를 처음 확인하면 받아요." },
  { id: "first-work", kind: "common", title: "첫 작품", how: "실습 작품을 처음 제출하면 받아요." },
];

// The four stamps every regular lesson offers, in the order the stamp board shows them.
export const STAMPS = ["concepts", "perfect-quiz", "missions", "lesson-complete"] as const satisfies readonly BadgeId[];
const isStamp = (id: BadgeId) => (STAMPS as readonly BadgeId[]).includes(id);

// Badges earned in one lesson; the completion card and live toasts announce these and the stamp board uses the stamps among them.
export function lessonBadgesFor(lesson: Lesson, work: AnyWork): BadgeId[] {
  const progress = progressFor(lesson, work);
  // A lesson without questions counts as 100% solved, so it must not hand out quiz badges.
  const quizDone = lesson.quiz.length > 0 && progress.quiz.percent === 100;
  const comeback = quizDone && (work?.quizRound ?? 1) >= 3;
  if (lesson.mode === "review") return [...(progress.status === "completed" ? ["review-complete" as const] : []), ...(comeback ? ["comeback" as const] : [])];
  const earned: BadgeId[] = [];
  if (progress.concept.percent === 100) earned.push("concepts");
  // quizRound only grows on a retry, so round 1 with every question solved is a first-try full score.
  if (quizDone && work?.quizRound === 1) earned.push("perfect-quiz");
  if (progress.practice.percent === 100) earned.push("missions");
  const all = lesson.practice.type === "programming" ? missionsFor(lesson.id) : [];
  if (all.some(mission => mission.optional && work?.missions?.[mission.id]?.submission)) earned.push("challenge");
  if (progress.status === "completed") earned.push("lesson-complete");
  if (comeback) earned.push("comeback");
  if (lesson.practice.type === "programming" && work?.draft.programming?.reflection.trim()) earned.push("reflection");
  if (all.some(mission => mission.optional) && all.every(mission => work?.missions?.[mission.id]?.submission) && earned.includes("perfect-quiz") && earned.includes("lesson-complete")) earned.push("all-clear");
  return earned;
}

// Badges come from the saved records of open lessons only, so nothing new is stored or read.
// `lessons` names where each badge was earned, for the badge page.
export function badgesFor(lessons: readonly Lesson[], work: Record<string, AnyWork>): Badge[] {
  const regular = lessons.filter(lesson => lesson.mode !== "review"), reviews = lessons.filter(lesson => lesson.mode === "review");
  const earnedIn = (list: readonly Lesson[], id: BadgeId) => list.filter(lesson => lessonBadgesFor(lesson, work[lesson.id]).includes(id));
  const optional = lessons.flatMap(lesson => lesson.practice.type === "programming" ? missionsFor(lesson.id).filter(mission => mission.optional).map(mission => ({ lesson, mission })) : []);
  const challenged = optional.filter(({ lesson, mission }) => work[lesson.id]?.missions?.[mission.id]?.submission);
  const stamps = regular.reduce((sum, lesson) => sum + lessonBadgesFor(lesson, work[lesson.id]).filter(isStamp).length, 0);
  // Any three neighbouring open regular lessons (catalog order) with a first-try full score; reviews and closed lessons are skipped.
  const perfect = regular.map(lesson => lessonBadgesFor(lesson, work[lesson.id]).includes("perfect-quiz"));
  const run = perfect.findIndex((_, i) => i + 3 <= perfect.length && perfect.slice(i, i + 3).every(Boolean));
  const where: Record<BadgeId, readonly Lesson[]> = {
    "first-step": lessons.filter(lesson => (work[lesson.id]?.conceptSolved.length ?? 0) > 0),
    "first-work": lessons.filter(lesson => submissionCountFor(lesson, work[lesson.id]) > 0),
    concepts: earnedIn(regular, "concepts"),
    "perfect-quiz": earnedIn(regular, "perfect-quiz"),
    missions: earnedIn(regular, "missions"),
    challenge: earnedIn(regular, "challenge"),
    "lesson-complete": earnedIn(regular, "lesson-complete"),
    "review-complete": earnedIn(reviews, "review-complete"),
    stamps: [],
    "all-clear": earnedIn(regular, "all-clear"),
    comeback: earnedIn(lessons, "comeback"),
    reflection: earnedIn(regular, "reflection"),
    streak: run < 0 ? [] : regular.slice(run, run + 3),
  };
  const counts: Record<BadgeId, [number, number]> = {
    "first-step": [where["first-step"].length ? 1 : 0, lessons.length ? 1 : 0],
    "first-work": [where["first-work"].length ? 1 : 0, lessons.length ? 1 : 0],
    concepts: [where.concepts.length, regular.length],
    "perfect-quiz": [where["perfect-quiz"].length, regular.length],
    missions: [where.missions.length, regular.length],
    challenge: [challenged.length, optional.length],
    "lesson-complete": [where["lesson-complete"].length, regular.length],
    "review-complete": [where["review-complete"].length, reviews.length],
    stamps: [stamps, regular.length * STAMPS.length],
    "all-clear": [where["all-clear"].length, regular.filter(lesson => optional.some(item => item.lesson === lesson)).length],
    comeback: [where.comeback.length, lessons.filter(lesson => lesson.quiz.length > 0).length],
    reflection: [where.reflection.length, regular.filter(lesson => lesson.practice.type === "programming").length],
    streak: [run < 0 ? 0 : 1, regular.length >= 3 ? 1 : 0],
  };
  return BADGES.map(badge => {
    const [count, total] = counts[badge.id];
    const steps = badge.kind === "level" ? STAMP_STEPS : badge.kind === "tiered" ? STEPS : null;
    const stars = steps ? steps.filter(step => count >= step).length : count > 0 ? 1 : 0;
    return { ...badge, count, total, earned: stars > 0, stars, next: steps?.find(step => count < step) ?? null, lessons: where[badge.id].map(lesson => lesson.title) };
  }).filter(badge => badge.total > 0);
}

// Earned badges are remembered per star level, so a new star counts as new again.
export const badgeKey = (badge: Badge) => `${badge.id}:${badge.stars}`;
// Every level up to the current one, so dropping a star after a lesson closes is not shown as new.
export const seenKeys = (badge: Badge) => Array.from({ length: badge.stars }, (_, i) => `${badge.id}:${i + 1}`);

export const badgeTitle = (id: BadgeId) => BADGES.find(badge => badge.id === id)!.title;
