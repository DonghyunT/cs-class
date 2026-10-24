import { expect, test } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { badgeKey, badgesFor, lessonBadgesFor, remainingFor, seenKeys } from "../src/lib/classroom/achievements";
import { emptyWork } from "../src/lib/classroom/progress";
import { requiredMissionsFor } from "../src/lib/classroom/programming-entry";
import type { Lesson, Work } from "../src/lib/classroom/types";

const lesson = (id: string) => LESSONS.find(item => item.id === id)!;
const submission = { id: "s", order: [], submittedAt: 1 };
function done(target: Lesson, patch: Partial<Work> = {}): Work {
  const work = emptyWork(target);
  return {
    ...work, updatedAt: 1, quizRound: 1,
    conceptSolved: target.concepts.map(c => c.id), quizSolved: target.quiz.map(q => q.id),
    ...(target.practice.type === "programming" ? { missions: Object.fromEntries(requiredMissionsFor(target.id).map(m => [m.id, { validation: null, submission }])) } : { submission }),
    ...patch,
  };
}

test("남은 활동은 개념·퀴즈·실습 순서로 남은 개수만 보여 준다", () => {
  const loops = lesson("loops");
  expect(remainingFor(loops, null)).toEqual(["개념 5개", "퀴즈 5문제", "미션 3개"]);
  expect(remainingFor(loops, done(loops, { quizSolved: ["distance"] }))).toEqual(["퀴즈 4문제"]);
  expect(remainingFor(loops, done(loops))).toEqual([]);
  const abstraction = lesson("review-abstraction");
  expect(remainingFor(abstraction, done(abstraction, { submission: null }))).toEqual(["실습 제출"]);
  const flowchart = lesson("review-flowchart");
  expect(remainingFor(flowchart, { ...emptyWork(flowchart), conceptSolved: flowchart.concepts.map(c => c.id), quizSolved: flowchart.quiz.map(q => q.id) })).toEqual(["작품 4개"]);
});

test("한 수업의 배지는 저장된 진도와 퀴즈 회차로 정한다", () => {
  const conditionals = lesson("conditionals");
  expect(lessonBadgesFor(conditionals, null)).toEqual([]);
  expect(lessonBadgesFor(conditionals, done(conditionals))).toEqual(["concepts", "perfect-quiz", "missions", "lesson-complete"]);
  expect(lessonBadgesFor(conditionals, done(conditionals, { quizRound: 2 }))).toEqual(["concepts", "missions", "lesson-complete"]);
  // A first round that is not fully solved yet is not a full score.
  expect(lessonBadgesFor(conditionals, done(conditionals, { quizSolved: ["order"] }))).toEqual(["concepts", "missions"]);
  const sandwich = lesson("review-sandwich");
  expect(lessonBadgesFor(sandwich, done(sandwich))).toEqual(["review-complete"]);
  // Review quizzes count toward 오뚝이 too.
  expect(lessonBadgesFor(sandwich, done(sandwich, { quizRound: 3 }))).toEqual(["review-complete", "comeback"]);
});

test("배지 모음은 열린 수업 기준으로 세고, 셀 수 없는 배지는 숨긴다", () => {
  const programming = lesson("programming-13"), loops = lesson("loops"), abstraction = lesson("review-abstraction");
  const work = {
    [programming.id]: done(programming, { quizRound: 3 }),
    [loops.id]: done(loops, { quizSolved: [], missions: { square: { validation: null, submission }, safe: { validation: null, submission } } }),
  };
  const badges = Object.fromEntries(badgesFor([programming, loops, abstraction], work).map(badge => [badge.id, [badge.count, badge.total, badge.earned]]));
  expect(badges).toEqual({
    "first-step": [1, 1, true],
    "first-work": [1, 1, true],
    concepts: [2, 2, true],
    "perfect-quiz": [0, 2, false],
    missions: [1, 2, true],
    challenge: [1, 2, true],
    "lesson-complete": [1, 2, true],
    "review-complete": [0, 1, false],
    // programming: concepts, missions, complete; loops: concepts. The first star needs 10 stamps.
    stamps: [4, 8, false],
    "all-clear": [0, 2, false],
    comeback: [1, 3, true],
  });
  const where = Object.fromEntries(badgesFor([programming, loops, abstraction], work).map(badge => [badge.id, badge.lessons]));
  expect(where).toMatchObject({
    "first-step": [programming.title, loops.title],
    concepts: [programming.title, loops.title],
    "perfect-quiz": [],
    missions: [programming.title],
    challenge: [loops.title],
    "lesson-complete": [programming.title],
    "review-complete": [],
    comeback: [programming.title],
  });
  // No review and fewer than three regular lessons: those badges disappear.
  expect(badgesFor([programming], {}).map(badge => badge.id)).toEqual(["stamps", "all-clear", "comeback", "concepts", "perfect-quiz", "missions", "challenge", "lesson-complete", "first-step", "first-work"]);
  expect(badgesFor([], {})).toEqual([]);
});

test("단계 배지는 고정 개수로 별을 올리고, 희귀 배지는 조건을 모두 채워야 받는다", () => {
  const programming = lesson("programming-13"), conditionals = lesson("conditionals"), loops = lesson("loops"), review = lesson("review-sandwich");
  const badge = (lessons: Lesson[], work: Record<string, Work>, id: string) => badgesFor(lessons, work).find(item => item.id === id);
  // Twenty regular lessons with a single submission as practice: counts of 4 and 20 sit between and on the 1·3·5·10·20 steps.
  const many = Array.from({ length: 20 }, (_, i): Lesson => ({ ...conditionals, id: `copy-${i}`, practice: lesson("review-abstraction").practice }));
  const all = Object.fromEntries(many.map(item => [item.id, done(item)]));
  expect(badge(many, all, "lesson-complete")).toMatchObject({ count: 20, stars: 5, next: null });
  const four = Object.fromEntries(many.slice(0, 4).map(item => [item.id, done(item)]));
  expect(badge(many, four, "lesson-complete")).toMatchObject({ count: 4, stars: 2, next: 5 });
  // Stamps use their own steps (10·25·50·100·150): 20 lessons × 4 stamps = 80.
  expect(badge(many, all, "stamps")).toMatchObject({ count: 80, stars: 3, next: 100 });
  // A lesson without questions never gives quiz badges.
  const noQuiz = { ...conditionals, quiz: [] };
  expect(lessonBadgesFor(noQuiz, done(noQuiz, { quizRound: 3 }))).not.toContain("perfect-quiz");
  expect(lessonBadgesFor(noQuiz, done(noQuiz, { quizRound: 3 }))).not.toContain("comeback");

  // 오뚝이: three or more rounds, then everything solved.
  expect(lessonBadgesFor(conditionals, done(conditionals, { quizRound: 3 }))).toContain("comeback");
  expect(lessonBadgesFor(conditionals, done(conditionals, { quizRound: 2 }))).not.toContain("comeback");
  expect(lessonBadgesFor(conditionals, done(conditionals, { quizRound: 4, quizSolved: ["order"] }))).not.toContain("comeback");

  // 올클리어 needs the optional mission too, on top of a first-try full score and completion.
  const loopsAll = done(loops, { missions: { ...done(loops).missions, safe: { validation: null, submission } } });
  expect(lessonBadgesFor(loops, loopsAll)).toContain("all-clear");
  expect(lessonBadgesFor(loops, done(loops))).not.toContain("all-clear");
  expect(lessonBadgesFor(loops, { ...loopsAll, quizRound: 2 })).not.toContain("all-clear");
  expect(lessonBadgesFor(programming, done(programming))).not.toContain("all-clear");

  // 연속 완주: three neighbouring open regular lessons; a review in between does not break the run.
  const regular = [programming, conditionals, review, loops];
  const finished = Object.fromEntries([programming, conditionals, loops].map(item => [item.id, done(item)]));
  expect(badge(regular, finished, "streak")).toMatchObject({ earned: true, lessons: [programming.title, conditionals.title, loops.title] });
  expect(badge(regular, { ...finished, [conditionals.id]: done(conditionals, { conceptSolved: [] }) }, "streak")).toMatchObject({ earned: false, lessons: [] });
  expect(badge([programming, conditionals], finished, "streak")).toBeUndefined();

  // Seen keys cover every level reached, so a star lost when a lesson closes is not "new" again.
  const threeStars = badge(many, Object.fromEntries(many.slice(0, 5).map(item => [item.id, done(item)])), "lesson-complete")!;
  const twoStars = badge(many, four, "lesson-complete")!;
  expect(seenKeys(threeStars)).toEqual(["lesson-complete:1", "lesson-complete:2", "lesson-complete:3"]);
  expect(seenKeys(threeStars)).toContain(badgeKey(twoStars));
  expect(seenKeys(badge(many, {}, "lesson-complete")!)).toEqual([]);
});
