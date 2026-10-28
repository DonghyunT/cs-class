import { expect, test } from "@playwright/test";
import { submissionTimes } from "../src/lib/classroom/progress";

test("첫 제출 시각은 첫 제출에서 정하고 다시 제출해도 유지", () => {
  const first = submissionTimes(null, 100);
  expect(first).toEqual({ submittedAt: 100, firstSubmittedAt: 100 });
  expect(submissionTimes(undefined, 100)).toEqual(first);
  const again = submissionTimes(first, 200);
  expect(again).toEqual({ submittedAt: 200, firstSubmittedAt: 100 });
  expect(submissionTimes(again, 300)).toEqual({ submittedAt: 300, firstSubmittedAt: 100 });
});

test("첫 제출 시각이 없는 이전 제출은 그 제출 시각을 넘겨줌", () => {
  expect(submissionTimes({ submittedAt: 50 }, 200)).toEqual({ submittedAt: 200, firstSubmittedAt: 50 });
});
