import { expect, test } from "@playwright/test";
import { api, setExpectedUser } from "../src/lib/classroom/client";

const originalFetch = globalThis.fetch;
const originalTimeout = AbortSignal.timeout;
let controller: AbortController;
let deadline: number;

test.beforeEach(() => {
  setExpectedUser("synthetic-student");
  controller = new AbortController();
  AbortSignal.timeout = (ms: number) => { deadline = ms; return controller.signal; };
});
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
  setExpectedUser(null);
});

test("일반 요청은 65초, AI는 50초 제한을 실제 fetch에 전달한다", async () => {
  globalThis.fetch = async (_url, options) => {
    expect(options?.signal).toBe(controller.signal);
    return Response.json({ ok: true });
  };
  await expect(api("classroom/work/synthetic", {})).resolves.toEqual({ ok: true });
  expect(deadline).toBe(65_000);
  await api("classroom/ai", {});
  expect(deadline).toBe(50_000);
});

test("응답 대기 중 시간 초과는 성공으로 처리하지 않고 자동 재전송하지 않는다", async () => {
  let requests = 0;
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, options) => {
    requests++;
    signal = options?.signal;
    return new Promise<Response>((_resolve, reject) => controller.signal.addEventListener("abort", () => reject(controller.signal.reason)));
  };
  const pending = api("classroom/work/synthetic", {});
  const rejected = expect(pending).rejects.toMatchObject({ code: "NETWORK", status: 0 });
  controller.abort(new DOMException("Synthetic deadline", "TimeoutError"));
  await rejected;
  expect(signal).toBe(controller.signal);
  expect(requests).toBe(1);
});

test("성공 헤더 뒤 본문 읽기가 중단되어도 빈 저장본을 반환하지 않는다", async () => {
  globalThis.fetch = async () => new Response(new ReadableStream({ start(body) {
    body.enqueue(new TextEncoder().encode('{"ok":'));
    controller.signal.addEventListener("abort", () => body.error(controller.signal.reason));
  } }));
  const rejected = expect(api("classroom/work/synthetic", {})).rejects.toMatchObject({ code: "NETWORK", status: 0 });
  controller.abort(new DOMException("Synthetic deadline", "TimeoutError"));
  await rejected;
});

test("성공 응답의 깨진 JSON도 불확실한 결과로 남긴다", async () => {
  globalThis.fetch = async () => new Response("{", { status: 200 });
  await expect(api("classroom/work/synthetic", {})).rejects.toMatchObject({ code: "NETWORK", status: 0 });
});

test("JSON이 아닌 실패 응답도 원래 HTTP 상태로 안내한다", async () => {
  globalThis.fetch = async () => new Response("synthetic service failure", { status: 503 });
  await expect(api("classroom/work/synthetic", {})).rejects.toMatchObject({ code: "SERVER", status: 503 });
});

test("이전 계정의 늦은 성공 응답은 새 계정에 전달하지 않는다", async () => {
  globalThis.fetch = async () => { setExpectedUser("another-synthetic-student"); return Response.json({ ok: true }); };
  await expect(api("classroom/work/synthetic", {})).rejects.toMatchObject({ code: "SESSION_REPLACED", status: 401 });
});
