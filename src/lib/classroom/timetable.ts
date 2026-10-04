import { z } from "zod";
import { TIMETABLE_SCHOOL, type TimetableEvent } from "./planner";

const date = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const weekSchema = z.object({
  시작일: date, 자료244: z.string().regex(/^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  학년도: z.number().int(), 학급수: z.array(z.number().int().min(0).max(150)).length(4),
  가상학급수: z.array(z.number().int().min(0).max(150)).length(4),
  자료492: z.array(z.union([z.string().max(80), z.number()])).max(1000),
  자료147: z.array(z.unknown()).length(4), 일과시간: z.array(z.string().max(30)).max(9),
  자료481: z.array(z.unknown()).length(4).optional(),
  열람제한일: z.string().max(30), 변경알림: z.number().int(), 분리: z.union([z.literal(100), z.literal(1000)]).default(100),
  일자자료: z.array(z.tuple([z.number().int().min(1).max(100), z.string().regex(/^\d{2}-\d{2}-\d{2} ~ \d{2}-\d{2}-\d{2}$/)])).min(1).max(4),
});
const cells = z.array(z.union([z.number().int().nonnegative().safe(), z.string().regex(/^>?\d{1,15}$/)])).min(1).max(9);

export function parseTimetableWeek(input: unknown) {
  // Only school dates, subjects and periods leave this parser. Teacher fields are discarded.
  const value = weekSchema.parse(input);
  if (value.학급수[2] - value.가상학급수[2] !== 11) throw new Error("TIMETABLE_CLASS_COUNT");
  if (!value.자료492.includes("정보")) throw new Error("TIMETABLE_SUBJECT");
  const grade = z.array(z.unknown()).length(value.학급수[2] + 1).parse(value.자료147[2]);
  const items: TimetableEvent[] = [];
  const limit = new Date(value.열람제한일);
  for (let classroom = 1; classroom <= 11; classroom++) {
    const days = z.array(z.unknown()).min(6).max(8).parse(grade[classroom]);
    for (let weekday = 1; weekday <= 5; weekday++) {
      const periods = cells.parse(days[weekday]);
      const day = new Date(`${value.시작일}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() + weekday - 1);
      if (!Number.isNaN(limit.valueOf()) && limit.getUTCFullYear() >= 2014 && day >= limit) continue;
      const dayString = day.toISOString().slice(0, 10);
      for (let period = 1; period < periods.length; period++) {
        const raw = periods[period];
        const packed = Number(String(raw).replace(/^>/, ""));
        if (!Number.isSafeInteger(packed)) throw new Error("TIMETABLE_CELL");
        const subject = value.자료492[Math.floor(packed / 1000) % value.분리];
        if (packed % 1000 === 0 || subject !== "정보") continue;
        const time = /^(\d+)\((([01]\d|2[0-3]):[0-5]\d)\)$/.exec(value.일과시간[period - 1] ?? "");
        if (!time || Number(time[1]) !== period) throw new Error("TIMETABLE_PERIOD");
        let changed = String(raw).startsWith(">");
        if (value.변경알림 === 0) {
          const originalGrade = z.array(z.unknown()).parse(value.자료481?.[2]);
          const originalDays = z.array(z.unknown()).parse(originalGrade[classroom]);
          const originalPeriods = cells.parse(originalDays[weekday]);
          changed = packed !== Number(String(originalPeriods[period] ?? 0).replace(/^>/, ""));
        }
        items.push({ id: `comci-${TIMETABLE_SCHOOL.code}-2-${classroom}-${dayString}-${period}`, classId: `2-${classroom}`, date: dayString, period, startsAt: time[2], changed });
      }
    }
  }
  const published = value.일자자료.find(([, label]) => `20${label.slice(0, 8)}` === value.시작일);
  if (!published) throw new Error("TIMETABLE_RANGE");
  const end = date.parse(`20${published[1].slice(-8)}`);
  const duration = new Date(`${end}T00:00:00Z`).valueOf() - new Date(`${value.시작일}T00:00:00Z`).valueOf();
  if (duration < 0 || duration > 6 * 86400_000) throw new Error("TIMETABLE_RANGE");
  return { start: value.시작일, end, updatedAt: value.자료244, weeks: value.일자자료, items };
}
