import { expect, test } from "@playwright/test";
import { SESSION_ACTIVITY_MS, SESSION_RETRY_MS, STUDENT_CLASS_POLL_MS, STUDENT_IDLE_TIMEOUT_MS } from "../src/lib/classroom/features";

// The page warns a minute before the student timeout; activity must reach the server before that even if one report fails.
test("활동 기록 간격은 한 번 실패해도 학생 로그아웃 예고 전에 서버에 닿는다", () => {
  const warning = STUDENT_IDLE_TIMEOUT_MS - 60_000;
  expect(2 * SESSION_ACTIVITY_MS + SESSION_RETRY_MS).toBeLessThan(warning);
  expect(SESSION_RETRY_MS).toBeLessThan(SESSION_ACTIVITY_MS);
});

test("반 설정 조회는 활동 기록보다 드물게 한다", () => {
  expect(STUDENT_CLASS_POLL_MS).toBeGreaterThanOrEqual(SESSION_ACTIVITY_MS);
});
