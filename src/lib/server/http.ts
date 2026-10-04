import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError, requireCondition } from "./errors";

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
export function failure(error: unknown) {
  if (error instanceof ServiceError) return json({ code: error.code, message: error.message }, error.status);
  if (error instanceof ZodError) return json({ code: "INVALID", message: "입력한 내용을 확인하고 다시 시도해 주세요." }, 400);
  // Do not include database documents, credentials, request bodies or provider errors in logs/responses.
  return json({ code: "UNAVAILABLE", message: "서버에서 처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, 503);
}
