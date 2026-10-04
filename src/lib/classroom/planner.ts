// Fits the existing 32KB request limit even with maximum-length Korean text.
export const PLANNER_LIMIT = 50;
export const TIMETABLE_SCHOOL = { code: "74022", name: "금옥중학교", url: "https://timetable.s2h9.dev/?sc=74022" };
export interface TimetableEvent { id: string; classId: string; date: string; period: number; startsAt: string; changed: boolean }
export interface TimetableSnapshot { checkedAt: number; sourceUpdatedAt: string; rangeStart: string; rangeEnd: string; items: TimetableEvent[] }
export interface ClassTimetable {
  checkedAt: number | null; sourceUpdatedAt: string | null; rangeStart: string | null; rangeEnd: string | null;
  error: string | null; refreshing: boolean; scheduled: boolean; stale: boolean; items: TimetableEvent[];
}
export interface Todo { id: string; text: string; completed: boolean }
export interface ClassEvent { id: string; title: string; date: string; lessonId: string | null }
export interface SavedList<T> { revision: number; items: T[] }
export interface ScheduleData extends SavedList<ClassEvent> {
  timetable: ClassTimetable;
  classroom: { id: string; name: string };
  classrooms: { id: string; name: string }[];
  lessons: { id: string; title: string }[];
}
export function seoulToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function eventDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00+09:00`));
}
