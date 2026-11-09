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
  return subjects && original && current ? { subjects, original, current } : null;
}
