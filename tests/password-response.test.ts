import { expect, test } from "@playwright/test";
import { passwordFailureIsWrongCredentials } from "../src/lib/server/password-response";

test("Firebase가 문서화한 네 가지 자격 증명 오류만 오답으로 분류한다", () => {
  for (const message of ["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED", "INVALID_LOGIN_CREDENTIALS"]) {
    expect(passwordFailureIsWrongCredentials(400, { error: { message } }), message).toBe(true);
  }
});

test("차단·요청 제한·설정 오류·빈 응답은 비밀번호 오답이 아니다", () => {
  for (const [status, payload] of [
    [403, { error: { message: "API_KEY_INVALID" } }],
    [429, { error: { message: "TOO_MANY_ATTEMPTS_TRY_LATER : Try later" } }],
    [500, { error: { message: "INTERNAL_ERROR" } }],
    [503, null], [400, {}], [400, "synthetic invalid JSON"],
  ] as const) expect(passwordFailureIsWrongCredentials(status, payload)).toBe(false);
});

test("5xx 응답은 자격 증명 오류 문구를 담아도 서비스 장애로 남긴다", () => {
  expect(passwordFailureIsWrongCredentials(503, { error: { message: "INVALID_PASSWORD" } })).toBe(false);
});
