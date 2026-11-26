import { expect, test } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { prioritizedLessons, resumeLabelFor, resumeStageFor } from "../src/lib/classroom/lesson-navigation";
import { emptyWork } from "../src/lib/classroom/progress";

const ids = (currentLessonId: string | null) => prioritizedLessons(RELEASED_LESSONS, currentLessonId).map(lesson => lesson.id);

test("열린 수업은 이번 수업, 정규 수업 최신순, 선택 복습 순으로 놓인다", () => {
  expect(ids(null)).toEqual(["hamster-robot", "brick-breaker", "functions", "loops", "conditionals", "programming-13", "review-abstraction", "review-sandwich", "review-flowchart", "review-festival"]);
  // An old lesson picked as this lesson for a review day still comes first.
  expect(ids("programming-13")).toEqual(["programming-13", "hamster-robot", "brick-breaker", "functions", "loops", "conditionals", "review-abstraction", "review-sandwich", "review-flowchart", "review-festival"]);
  expect(ids("review-sandwich")).toEqual(["review-sandwich", "hamster-robot", "brick-breaker", "functions", "loops", "conditionals", "programming-13", "review-abstraction", "review-flowchart", "review-festival"]);
  expect(ids("closed-lesson")).toEqual(ids(null));
});

test("이어하기는 끝난 단계 대신 남은 첫 단계를 열고, 하던 단계와 복습 수업은 그대로 둔다", () => {
  const lesson = RELEASED_LESSONS.find(item => item.id === "conditionals")!;
  const work = emptyWork(lesson);
  work.updatedAt = 1;
  expect(resumeStageFor(lesson, work)).toBe("concept");
  // Concepts done, tab never saved after that: resume at the quiz.
  work.conceptSolved = lesson.concepts.map(concept => concept.id);
  expect(resumeStageFor(lesson, work)).toBe("quiz");
  expect(resumeLabelFor(lesson, work)).toBe("퀴즈 이어하기");
  // A stage still in progress is where the student was.
  work.draft.stage = "practice";
  expect(resumeStageFor(lesson, work)).toBe("practice");
  // Quiz done too, saved on the quiz tab: the practice is what is left.
  work.draft.stage = "quiz";
  work.quizSolved = lesson.quiz.map(question => question.id);
  expect(resumeStageFor(lesson, work)).toBe("practice");
  const review = RELEASED_LESSONS.find(item => item.mode === "review" && item.concepts.length > 0)!;
  const reviewed = emptyWork(review);
  reviewed.conceptSolved = review.concepts.map(concept => concept.id);
  expect(resumeStageFor(review, reviewed)).toBe(reviewed.draft.stage);
});
