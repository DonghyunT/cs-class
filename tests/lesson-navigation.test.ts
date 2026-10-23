import { expect, test } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { prioritizedLessons } from "../src/lib/classroom/lesson-navigation";

const ids = (currentLessonId: string | null) => prioritizedLessons(RELEASED_LESSONS, currentLessonId).map(lesson => lesson.id);

test("열린 수업은 이번 수업, 정규 수업 최신순, 선택 복습 순으로 놓인다", () => {
  expect(ids(null)).toEqual(["loops", "conditionals", "programming-13", "review-abstraction", "review-sandwich", "review-flowchart"]);
  // An old lesson picked as this lesson for a review day still comes first.
  expect(ids("programming-13")).toEqual(["programming-13", "loops", "conditionals", "review-abstraction", "review-sandwich", "review-flowchart"]);
  expect(ids("review-sandwich")).toEqual(["review-sandwich", "loops", "conditionals", "programming-13", "review-abstraction", "review-flowchart"]);
  expect(ids("closed-lesson")).toEqual(ids(null));
});
