import { createDecipheriv, createHash, createHmac } from "node:crypto";
import type { TimetableFields } from "../classroom/timetable";

// Pure Comcigan v2 helpers, kept apart from timetable.ts so its "server-only" import does not block unit tests.
export function deobfuscate(array: [number, string][], key: number): string {
  let s = "";
  for (let i = 0; i < array.length; i++) {
    const [flag, str] = array[i];
    if (flag) {
      s += str;
      continue;
    }
    for (let j = 0; j < str.length; j += 4) {
      const code = parseInt(str.slice(j, j + 4), 16) ^ ((key + (j / 4) * 13) & 255);
      s += String.fromCharCode(code);
    }
  }
  return s;
}

export function extractPayload(source: string, marker: string): { array: [number, string][]; key: number; nextIdx: number } | null {
  try {
    const markerIdx = source.indexOf(marker);
    if (markerIdx === -1) return null;
    const startParen = source.indexOf("})([", markerIdx);
    if (startParen === -1) return null;
    const arrayStart = startParen + 3;
    // Plain segments are JS source and may hold ");", so anchor on the array's end and the numeric key.
    const end = /\]\s*,\s*(\d+)\s*\)\s*;/.exec(source.slice(arrayStart));
    if (!end) return null;
    const array = JSON.parse(source.slice(arrayStart, arrayStart + end.index + 1)) as [number, string][];
    if (!Array.isArray(array)) return null;
    return { array, key: Number(end[1]), nextIdx: arrayStart + end.index + end[0].length };
  } catch {
    return null;
  }
}

export function decryptPayload(raw: string, aesKey?: Buffer): string {
  const trimmed = raw.replace(/\x00+$/, "");
  if (!trimmed.startsWith("enc5:") && !trimmed.startsWith("enc1:")) return trimmed;
  if (!aesKey) throw new Error("TIMETABLE_CRYPTO");
  const parts = trimmed.split(":");
  if (parts.length !== 4) throw new Error("TIMETABLE_CRYPTO");
  const isBase64 = parts[0] === "enc5";
  const iv = Buffer.from(parts[1], isBase64 ? "base64" : "hex");
  const ciphertext = Buffer.from(parts[2], isBase64 ? "base64" : "hex");
  const tag = parts[3];

  const hmacKey = createHash("sha256").update(aesKey).digest();
  const computedTag = createHmac("sha256", hmacKey).update(parts.slice(0, 3).join(":")).digest(isBase64 ? "base64" : "hex");
  if (computedTag !== tag) throw new Error("TIMETABLE_AUTH");

  const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(ciphertext, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted.replace(/\x00+$/, "");
}

// Comcigan renumbers its 자료### fields, so read them from the render code that uses them instead of pinning them.
export function readTimetableFields(client: string): TimetableFields | null {
  const subjects = /과목명\s*=\s*Q과목명\(자료\.(자료\d+)\[/.exec(client)?.[1];
  const original = /원자료\s*=\s*Q자료\(자료\.(자료\d+)\[/.exec(client)?.[1];
  const current = /일일자료\s*=\s*Q자료\(자료\.(자료\d+)\[/.exec(client)?.[1];
  if (!subjects || !original || !current) return null;
  // Since 2026-11 the week's start, period times and week list are numbered fields too; older pages keep their plain names.
  const start = /new Date\(QnmsbChange\(자료\.(자료\d+)\)\)/.exec(client)?.[1];
  const times = /class='교시'>"\s*\+\s*자료\.(자료\d+)\[교시-1\]/.exec(client)?.[1];
  const weeks = /일자설정하기\(H시간표\.(자료\d+),/.exec(client)?.[1];
  return { subjects, original, current, ...(start ? { start } : {}), ...(times ? { times } : {}), ...(weeks ? { weeks } : {}) };
}

// Comcigan hides single values (school names and codes, dates, subjects) behind a second layer:
// base64, XOR with a key spelled out in its QnmsbChange function, then EUC-KR. Read the key from that function.
export function readFieldCipher(client: string): ((value: string) => string) | null {
  const codes = /function QnmsbChange\([^)]*\)\s*\{[\s\S]*?String\.fromCharCode\(([\d,\s]+)\)/.exec(client)?.[1];
  const key = codes?.split(",").map(Number);
  if (!key?.length || key.some((code) => !Number.isInteger(code) || code < 0 || code > 255)) return null;
  return (value) => {
    if (value === "") return "";
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error("TIMETABLE_FIELD");
    const bytes = Buffer.from(value, "base64");
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= key[i % key.length];
    return new TextDecoder("euc-kr", { fatal: true }).decode(bytes);
  };
}

// The school code sits in a column that depends on the row's first number; the page states the divisor.
export function readSchoolCodeDivisor(client: string): number | null {
  const divisor = Number(/Math\.floor\(학교명단\[i\]\[0\]\/(\d+)\)\+2/.exec(client)?.[1]);
  return Number.isSafeInteger(divisor) && divisor > 0 ? divisor : null;
}
