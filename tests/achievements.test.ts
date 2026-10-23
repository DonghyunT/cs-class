import { expect, test } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { badgesFor, lessonBadgesFor, remainingFor } from "../src/lib/classroom/achievements";
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
    concepts: [2, 2, true],
    "perfect-quiz": [0, 2, false],
    missions: [1, 2, true],
    challenge: [1, 1, true],
    "lesson-complete": [1, 2, true],
    "review-complete": [0, 1, false],
  });
  const where = Object.fromEntries(badgesFor([programming, loops, abstraction], work).map(badge => [badge.id, badge.lessons]));
  expect(where).toEqual({
    "first-step": [programming.title, loops.title],
    concepts: [programming.title, loops.title],
    "perfect-quiz": [],
    missions: [programming.title],
    challenge: [loops.title],
    "lesson-complete": [programming.title],
    "review-complete": [],
  });
  // Only regular lessons without optional missions and no review: challenge and review badges disappear.
  expect(badgesFor([programming], {}).map(badge => badge.id)).toEqual(["first-step", "concepts", "perfect-quiz", "missions", "lesson-complete"]);
  expect(badgesFor([], {})).toEqual([]);
});
