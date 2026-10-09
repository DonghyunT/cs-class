import { expect, test } from "@playwright/test";
import { headers, localOnly } from "./emulator";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
test.beforeEach(async ({ request }) => { await localOnly(request); });

test("안전 로그 API: 익명·출처·잘못된 입력의 기존 응답과 오류 번호", async ({ request }) => {
  const signedOut = await request.get("/api/classroom/student");
  expect(signedOut.status()).toBe(401);
  expect(await signedOut.json()).toEqual({ code: "SIGNED_OUT", message: "다시 로그인해 주세요." });
  expect(signedOut.headers()["x-request-id"]).toMatch(uuid);
  const blocked = await request.post("/api/classroom/todos", { data: {} });
  expect(blocked.status()).toBe(403);
  expect(await blocked.json()).toEqual({ code: "ORIGIN", message: "올바른 화면에서 다시 시도해 주세요." });
  expect(blocked.headers()["x-request-id"]).toMatch(uuid);
  const invalid = await request.post("/api/auth/guest", { headers, data: { role: "SYNTHETIC_ONLY_PRIVATE_SENTINEL" } });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({ code: "INVALID", message: "입력한 내용을 확인하고 다시 시도해 주세요." });
  expect(invalid.headers()["x-request-id"]).toMatch(uuid);
  expect(new Set([signedOut, blocked, invalid].map(response => response.headers()["x-request-id"])).size).toBe(3);
});

test("안전 로그 API: 정상 익명 세션은 실패 번호 없이 기존 결과 유지", async ({ request }) => {
  const response = await request.get("/api/auth/session");
  expect(response.status()).toBe(200);
  expect((await response.json()).session).toBeNull();
  expect(response.headers()["x-request-id"]).toBeUndefined();
});

test("안전 로그 API: 직접 반환한 auth·classroom 404의 기존 본문과 고유 오류 번호", async ({ request }) => {
  const responses = [];
  for (const domain of ["auth", "classroom"]) {
    for (const method of ["get", "post"] as const) {
      const path = `/api/${domain}/synthetic-unknown-request`;
      const response = method === "get" ? await request.get(path) : await request.post(path, { headers, data: { marker: "SYNTHETIC_ONLY_PRIVATE_SENTINEL" } });
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual(domain === "auth" ? { message: "찾을 수 없는 요청입니다." } : { code: "NOT_FOUND", message: "찾을 수 없는 요청입니다." });
      expect.soft(response.headers()["x-request-id"], `${domain} ${method} 직접 404`).toMatch(uuid);
      responses.push(response);
    }
  }
  expect(new Set(responses.map(response => response.headers()["x-request-id"])).size).toBe(4);
});

test("안전 로그 API: 예약 실행의 직접 401도 기존 본문과 오류 번호 유지", async ({ request }) => {
  const response = await request.get("/api/cron/timetable");
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED", message: "허용되지 않은 요청입니다." });
  expect(response.headers()["x-request-id"]).toMatch(uuid);
});
