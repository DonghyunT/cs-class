import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Transaction } from "firebase-admin/firestore";
import { parseTimetableWeek, type TimetableFields } from "../classroom/timetable";
import { decryptPayload, deobfuscate, extractPayload, readFieldCipher, readSchoolCodeDivisor, readTimetableFields } from "./timetable-protocol";
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

  async function text(path: string, encoding = "utf-8", headers?: HeadersInit) {
    const response = await fetch(`${base}${path}`, {
      signal,
      redirect: "error",
      cache: "no-store",
      headers: { Referer: `${base}/st`, "X-Requested-With": "XMLHttpRequest", ...headers },
    });
    if (!response.ok || !response.body) throw new Error("TIMETABLE_RESPONSE");
    const cookie = response.headers.getSetCookie?.()?.[0]?.split(";")?.[0]
      ?? response.headers.get("set-cookie")?.split(";")?.[0] ?? "";
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 1_000_000) { await reader.cancel(); throw new Error("TIMETABLE_SIZE"); }
      chunks.push(part.value);
    }
    const decoded = new TextDecoder(encoding, { fatal: true }).decode(Buffer.concat(chunks));
    return { text: decoded, cookie };
  }

  const { text: page, cookie } = await text("/st", "euc-kr");

  let endpoint = "";
  let schoolQuery = "";
  let weekQuery: (index: number) => string;
  let aesKey: Buffer | undefined;
  let fields: TimetableFields | undefined;
  let decode: ((value: string) => string) | undefined;
  let codeDivisor: number | null = null;
  let apiHeaders: Record<string, string> = {};

  if (page.includes("/* hour-obfuscated-v2 */")) {
    const token = /window\.__HourRequestToken\s*=\s*['"]([^'"]+)['"]/.exec(page)?.[1] ?? "";
    const p1 = extractPayload(page, "/* hour-obfuscated-v2 */");
    const p2 = p1 ? extractPayload(page.slice(p1.nextIdx), "/* hour-obfuscated-v2 */") : null;
    if (!p1 || !p2) throw new Error("TIMETABLE_PROTOCOL");
    const decoded1 = deobfuscate(p1.array, p1.key);
    const decoded2 = deobfuscate(p2.array, p2.key);

    const a1 = extractPayload(decoded1, "/* hour-ajax-obfuscated-v1 */");
    const a2 = a1 ? extractPayload(decoded1.slice(a1.nextIdx), "/* hour-ajax-obfuscated-v1 */") : null;
    if (!a1 || !a2) throw new Error("TIMETABLE_PROTOCOL");
    const inner0 = deobfuscate(a1.array, a1.key);
    const inner1 = deobfuscate(a2.array, a2.key);

    const ep = /url:['"]\.\/(\d+)\?\s*'\s*\+/g.exec(inner0)?.[1];
    const searchPrefix = /btoa\(['"](\d+l)['"]\s*\+/g.exec(inner0)?.[1];
    const timetablePrefix = /sc_data\(['"](\d+_)['"]/.exec(decoded2)?.[1];
    const permMatch = /return\s+a\[(\d)\]\+a\[(\d)\]\+a\[(\d)\]\+a\[(\d)\]/.exec(inner1);
    const keyPartsMatch = /\(\['([0-9a-f]+)',\s*'([0-9a-f]+)',\s*'([0-9a-f]+)',\s*'([0-9a-f]+)'\]\)/.exec(inner1);
    const liveFields = readTimetableFields(decoded1);
    if (!ep || !searchPrefix || !timetablePrefix || !permMatch || !keyPartsMatch || !liveFields) throw new Error("TIMETABLE_PROTOCOL");

    const rawParts = [keyPartsMatch[1], keyPartsMatch[2], keyPartsMatch[3], keyPartsMatch[4]];
    const hexKey = rawParts[Number(permMatch[1])] + rawParts[Number(permMatch[2])] + rawParts[Number(permMatch[3])] + rawParts[Number(permMatch[4])];
    aesKey = Buffer.from(hexKey, "hex");
    fields = liveFields;
    // Absent on pages from before 2026-11, whose values were plain.
    decode = readFieldCipher(inner1) ?? undefined;
    codeDivisor = readSchoolCodeDivisor(decoded1);
    if (decode && !codeDivisor) throw new Error("TIMETABLE_PROTOCOL");
    endpoint = ep;
    schoolQuery = encodeURIComponent(Buffer.from(`${searchPrefix}${encodeURIComponent(TIMETABLE_SCHOOL.name.slice(0, 2))}_enc5`).toString("base64"));
    weekQuery = (index) => encodeURIComponent(Buffer.from(`${timetablePrefix}${TIMETABLE_SCHOOL.code}_0_${index}_enc5`).toString("base64"));
    apiHeaders = {
      ...(token ? { "X-Hour-Token": token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    };
  } else {
    const ep = /url:['"]\.\/(\d+)\?17384l/.exec(page)?.[1];
    const prefix = /sc_data\('(\d+)_',sc,/.exec(page)?.[1];
    if (!ep || !prefix) throw new Error("TIMETABLE_PROTOCOL");
    endpoint = ep;
    schoolQuery = "17384l%B1%DD%BF%C1";
    weekQuery = (index) => Buffer.from(`${prefix}_${TIMETABLE_SCHOOL.code}_0_${index}`).toString("base64");
  }

  async function json(path: string) {
    const { text: source } = await text(path, "utf-8", apiHeaders);
    const decrypted = decryptPayload(source, aesKey);
    const end = decrypted.lastIndexOf("}");
    if (end < 0 || !/^[\x00 \t\r\n]*$/.test(decrypted.slice(end + 1))) throw new Error("TIMETABLE_JSON");
    return JSON.parse(decrypted.slice(0, end + 1)) as unknown;
  }

  const schools = z.object({
    학교검색: z.array(z.array(z.union([z.number(), z.string()]))).max(50),
  }).parse(await json(`/${endpoint}?${schoolQuery}`));

  const found = schools.학교검색.some((school) => {
    if (!decode) return school[1] === "서울" && school[2] === TIMETABLE_SCHOOL.name && school.slice(3).some((code) => String(code) === TIMETABLE_SCHOOL.code);
    const text = (item: unknown) => typeof item === "string" ? decode(item) : "";
    return school[0] !== 0 && text(school[1]) === "서울" && text(school[2]) === TIMETABLE_SCHOOL.name
      && text(school[Math.floor(Number(school[0]) / codeDivisor!) + 2]) === TIMETABLE_SCHOOL.code;
  });
  if (!found) throw new Error("TIMETABLE_SCHOOL");

  const week = async (index: number) => parseTimetableWeek(await json(`/${endpoint}?${weekQuery(index)}`), fields, decode);
  const first = await week(1);
  const results = [first];
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
    requireCondition((previous?.leaseUntil ?? 0) <= now, 409, "TIMETABLE_BUSY", "학교 시간표를 갱신하고 있어요. 잠시 후 다시 시도해 주세요.");
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
