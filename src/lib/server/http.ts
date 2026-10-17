import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError, requireCondition } from "./errors";
import { failureCategory, logFailureResponse, type FailureCategory, type FailureOperation } from "./failure-log";

export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } }); }
export async function body(request: Request, maxBytes = 32768) {
  requireCondition(request.headers.get("X-CS-Class") === "1", 403, "ORIGIN", "올바른 화면에서 다시 시도해 주세요.");
  const origin = request.headers.get("origin");
  // Next's internal URL can normalize 127.0.0.1 to localhost. Browsers send
  // the actual public authority in Host; JavaScript cannot forge that header.
  const url = new URL(request.url);
  const authority = request.headers.get("host") ?? url.host;
  const expectedOrigin = `${url.protocol}//${authority}`;
  requireCondition(!origin || origin === expectedOrigin, 403, "ORIGIN", "다른 사이트에서는 요청할 수 없어요.");
  requireCondition(request.headers.get("content-type")?.startsWith("application/json"), 415, "CONTENT_TYPE", "지원하지 않는 요청입니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError(400, "BODY", "요청 내용이 없어요.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const item = await reader.read(); if (item.done) break;
    length += item.value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new ServiceError(413, "TOO_LARGE", "한 번에 저장할 수 있는 크기를 넘었어요."); }
    chunks.push(item.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ServiceError(400, "BODY", "요청 내용을 확인해 주세요."); }
}
export function failureResponse(value: unknown, status: number, context?: { operation: FailureOperation }, category?: FailureCategory) {
  return logFailureResponse(json(value, status), { ...context, category });
}
export function failure(error: unknown, context?: { operation: FailureOperation }) {
  const service = error instanceof ServiceError, invalid = error instanceof ZodError;
  const status = service ? error.status : invalid ? 400 : 503;
  const value = service ? { code: error.code, message: error.message }
    : invalid ? { code: "INVALID", message: "입력한 내용을 확인하고 다시 시도해 주세요." }
      : { code: "UNAVAILABLE", message: "서버에서 처리하지 못했어요. 잠시 후 다시 시도해 주세요." };
  return logFailureResponse(json(value, status), { ...context, category: service ? failureCategory(status) : invalid ? "invalid_input" : "unexpected", error });
}
