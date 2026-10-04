import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Transaction } from "firebase-admin/firestore";
import { parseTimetableWeek } from "../classroom/timetable";
import { seoulToday, TIMETABLE_SCHOOL, type ClassTimetable, type TimetableSnapshot } from "../classroom/planner";
import { admin } from "./firebase";
import { requireCondition, ServiceError } from "./errors";

interface Cache extends Partial<TimetableSnapshot> {
  lease?: string | null; leaseUntil?: number; attemptedAt?: number; cronDay?: string; error?: string | null;
}
const cacheRef = () => admin().db.collection("csTimetables").doc(TIMETABLE_SCHOOL.code);
const refreshFailure = "학교 시간표를 갱신하지 못했어요. 마지막으로 확인한 시간표를 표시합니다.";

export async function readClassTimetable(tx: Transaction, classId: string): Promise<ClassTimetable> {
  const cached = (await tx.get(cacheRef())).data() as Cache | undefined;
  return {
    checkedAt: cached?.checkedAt ?? null, sourceUpdatedAt: cached?.sourceUpdatedAt ?? null,
    rangeStart: cached?.rangeStart ?? null, rangeEnd: cached?.rangeEnd ?? null, error: cached?.error ?? null,
    refreshing: (cached?.leaseUntil ?? 0) > Date.now(), scheduled: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16 && process.env.VERCEL_ENV === "production"),
    stale: Boolean(cached?.checkedAt && Date.now() - cached.checkedAt > 36 * 60 * 60_000),
    items: (cached?.items ?? []).filter((item) => item.classId === classId),
  };
}
async function fetchSchoolTimetable(): Promise<TimetableSnapshot> {
  // The fixture is available only to the exact local demo runtime, never a deployment.
  const fixture = process.env.CS_TIMETABLE_FIXTURE === "1" && !process.env.VERCEL && process.env.FIREBASE_PROJECT_ID === "demo-cs-class"
    && process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" && process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080";
  const base = fixture ? "http://127.0.0.1:4781" : "http://comci.net:4082";
  const signal = AbortSignal.timeout(45_000);
  async function text(path: string, encoding = "utf-8") {
    const response = await fetch(`${base}${path}`, { signal, redirect: "error", cache: "no-store", headers: { Referer: `${base}/st`, "X-Requested-With": "XMLHttpRequest" } });
    if (!response.ok || !response.body) throw new Error("TIMETABLE_RESPONSE");
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.byteLength;
      if (length > 1_000_000) { await reader.cancel(); throw new Error("TIMETABLE_SIZE"); }
      chunks.push(part.value);
    }
    return new TextDecoder(encoding, { fatal: true }).decode(Buffer.concat(chunks));
  }
  async function json(path: string) {
    const source = await text(path); const end = source.lastIndexOf("}");
    if (end < 0 || !/^[\x00 \t\r\n]*$/.test(source.slice(end + 1))) throw new Error("TIMETABLE_JSON");
    return JSON.parse(source.slice(0, end + 1)) as unknown;
  }
  const page = await text("/st", "euc-kr");
  const endpoint = /url:['"]\.\/(\d+)\?17384l/.exec(page)?.[1];
  const prefix = /sc_data\('(\d+)_',sc,/.exec(page)?.[1];
  if (!endpoint || !prefix) throw new Error("TIMETABLE_PROTOCOL");
  // Comcigan's public school search uses EUC-KR query bytes and UTF-8 JSON.
  const schools = z.object({ 학교검색: z.array(z.tuple([z.number(), z.string(), z.string(), z.number()])).max(50) }).parse(await json(`/${endpoint}?17384l%B1%DD%BF%C1`));
  if (!schools.학교검색.some((school) => school[1] === "서울" && school[2] === TIMETABLE_SCHOOL.name && String(school[3]) === TIMETABLE_SCHOOL.code)) throw new Error("TIMETABLE_SCHOOL");
  const week = async (index: number) => parseTimetableWeek(await json(`/${endpoint}?${Buffer.from(`${prefix}_${TIMETABLE_SCHOOL.code}_0_${index}`).toString("base64")}`));
  const first = await week(1); const results = [first];
  if (!first.weeks.some(([index]) => index === 1) || new Set(first.weeks.map(([index]) => index)).size !== first.weeks.length) throw new Error("TIMETABLE_WEEKS");
  for (const [index] of first.weeks) if (index !== 1) results.push(await week(index));
  if (results.some((result) => result.updatedAt !== first.updatedAt)) throw new Error("TIMETABLE_CHANGED_DURING_REFRESH");
  const starts = results.map((result) => result.start).sort();
  if (new Set(starts).size !== results.length) throw new Error("TIMETABLE_WEEKS");
  const items = results.flatMap((result) => result.items).sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period || a.classId.localeCompare(b.classId));
  return { checkedAt: Date.now(), sourceUpdatedAt: first.updatedAt, rangeStart: starts[0], rangeEnd: results.map((result) => result.end).sort().at(-1)!, items };
}
export async function refreshTimetable(cron = false) {
  requireCondition(!process.env.VERCEL || process.env.VERCEL_ENV === "production", 403, "PREVIEW_DISABLED", "시간표 갱신은 운영 환경에서 사용할 수 있어요.");
  const { db } = admin(); const ref = cacheRef(); const lease = randomUUID(); const now = Date.now(); const day = seoulToday();
  const acquired = await db.runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data() as Cache | undefined;
    if (cron && previous?.cronDay === day) return false;
    requireCondition((previous?.leaseUntil ?? 0) <= now, 409, "TIMETABLE_BUSY", "학교 시간표를 갱신하고 있어요. 잠시 후 일정을 다시 불러와 주세요.");
    if (cron && previous?.checkedAt && now - previous.checkedAt < 5 * 60_000 && !previous.error) {
      tx.set(ref, { cronDay: day }, { merge: true }); return false;
    }
    requireCondition(now - (previous?.attemptedAt ?? 0) >= 5 * 60_000, 429, "TIMETABLE_COOLDOWN", "최근에 시간표 갱신을 요청했어요. 5분 뒤 다시 시도해 주세요.");
    tx.set(ref, { lease, leaseUntil: now + 90_000, attemptedAt: now }, { merge: true }); return true;
  });
  if (!acquired) return { refreshed: false };
  try {
    const snapshot = await fetchSchoolTimetable();
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Cache;
      requireCondition(current.lease === lease, 409, "TIMETABLE_BUSY", "다른 갱신 결과를 확인해 주세요.");
      tx.set(ref, { ...snapshot, lease: null, leaseUntil: 0, error: null, ...(cron ? { cronDay: day } : {}) }, { merge: true });
    });
    return { refreshed: true };
  } catch {
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Cache;
      if (current.lease === lease) tx.set(ref, { lease: null, leaseUntil: 0, error: refreshFailure }, { merge: true });
    });
    throw new ServiceError(503, "TIMETABLE_UNAVAILABLE", refreshFailure);
  }
}
