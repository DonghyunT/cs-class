import { expect, test } from "@playwright/test";
import { ZodError } from "zod";
import { createFailureRecord, failureCategory, logFailureResponse, writeFailureLog, type FailureCategory, type FailureOperation } from "../src/lib/server/failure-log";

const sentinel = "SYNTHETIC_ONLY_PRIVATE_SENTINEL";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("안전 로그: 오류 원문·본문·임의 코드를 허용한 5항목에 섞지 않음", () => {
  const errors = [new Error(sentinel, { cause: { key: sentinel } }), new ZodError([{ code: "custom", path: [sentinel], message: sentinel }]), { code: sentinel, url: sentinel, body: sentinel }];
  for (const error of errors) {
    const details = { operation: "classroom.work.save" as const, category: "unexpected" as const, status: 503, error, uid: sentinel, email: sentinel, project: sentinel, headers: { authorization: sentinel }, requestId: sentinel, timestamp: sentinel };
    const record = createFailureRecord(details);
    expect(Object.keys(record).sort()).toEqual(["category", "operation", "requestId", "status", "timestamp"]);
    expect(record.requestId).toMatch(uuid);
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
    expect(JSON.stringify(record)).not.toContain(sentinel);
    expect(record).toMatchObject({ operation: "classroom.work.save", category: "unexpected", status: 503 });
  }
});

test("안전 로그: 작업명·분류·상태를 런타임에서도 허용 목록으로 제한", () => {
  const record = createFailureRecord({ operation: sentinel as FailureOperation, category: sentinel as FailureCategory, status: Number.NaN });
  expect(record).toMatchObject({ operation: "server.request", category: "unexpected", status: 503 });
  expect(JSON.stringify(record)).not.toContain(sentinel);
  const first = createFailureRecord({ operation: "teacher-preview.evaluate", category: "invalid_input", status: 400 });
  const second = createFailureRecord({ category: "invalid_input", status: 400 });
  expect(first.requestId).not.toBe(second.requestId);
  expect(first.operation).toBe("teacher-preview.evaluate");
});

test("안전 로그: 알려진 상태를 고정 분류로 구분", () => {
  const cases: [number, FailureCategory][] = [[400, "invalid_input"], [413, "invalid_input"], [415, "invalid_input"], [401, "unauthenticated"], [403, "forbidden"], [404, "not_found"], [409, "conflict"], [429, "rate_limited"], [503, "unavailable"]];
  for (const [status, category] of cases) expect(failureCategory(status)).toBe(category);
});

test("안전 로그: 한 번 출력하고 출력 실패는 호출을 중단하지 않음", () => {
  const original = console.error, lines: string[] = [];
  try {
    console.error = (line: unknown) => { lines.push(String(line)); };
    const record = createFailureRecord({ operation: "classroom.work.action", status: 503, category: "unexpected" });
    writeFailureLog(record);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(record);
    console.error = () => { throw new Error(sentinel); };
    expect(() => writeFailureLog(record)).not.toThrow();
  } finally { console.error = original; }
});

test("안전 로그: 직접 503 본문·상태·기존 헤더 보존과 응답당 한 번 출력·출력 실패 격리", async () => {
  const original = console.error, lines: string[] = [];
  const unavailable = { code: "NOT_CONFIGURED", message: "아직 로그인 서비스를 연결하고 있어요. 선생님께 알려 주세요." };
  try {
    console.error = (line: unknown) => { lines.push(String(line)); };
    const response = new Response(JSON.stringify(unavailable), { status: 503, headers: { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Request-ID": sentinel } });
    const result = logFailureResponse(response, { operation: "auth.request" });
    expect(result).toBe(response);
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual(unavailable);
    expect(result.headers.get("Cache-Control")).toBe("no-store, private");
    expect(result.headers.get("Vary")).toBe("Cookie");
    expect(result.headers.get("X-Request-ID")).toMatch(uuid);
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]);
    expect(Object.keys(record).sort()).toEqual(["category", "operation", "requestId", "status", "timestamp"]);
    expect(record).toMatchObject({ requestId: result.headers.get("X-Request-ID"), operation: "auth.request", category: "unavailable", status: 503 });
    const privateBody = { code: sentinel, message: sentinel, error: { cause: sentinel } };
    const privateResponse = new Response(JSON.stringify(privateBody), { status: 503 });
    expect(await logFailureResponse(privateResponse, { operation: "auth.request" }).json()).toEqual(privateBody);
    expect(lines).toHaveLength(2);
    expect(lines.join("\n")).not.toContain(sentinel);
    console.error = () => { throw new Error(sentinel); };
    const sinkResponse = new Response(JSON.stringify(unavailable), { status: 503 });
    expect(() => logFailureResponse(sinkResponse, { operation: "auth.request" })).not.toThrow();
    expect(sinkResponse.status).toBe(503);
    expect(await sinkResponse.json()).toEqual(unavailable);
    expect(sinkResponse.headers.get("X-Request-ID")).toMatch(uuid);
  } finally { console.error = original; }
});
