import { timingSafeEqual } from "node:crypto";
import { failure, json } from "@/lib/server/http";
import { refreshTimetable } from "@/lib/server/timetable";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || secret.length < 16 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json({ code: "UNAUTHORIZED", message: "허용되지 않은 요청입니다." }, 401);
  try { return json(await refreshTimetable(true)); } catch (error) { return failure(error); }
}
