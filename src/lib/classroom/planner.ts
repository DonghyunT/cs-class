// Fits the existing 32KB request limit even with maximum-length Korean text.
export const PLANNER_LIMIT = 50;
export interface Todo { id: string; text: string; completed: boolean }
export interface ClassEvent { id: string; title: string; date: string; lessonId: string | null }
export interface SavedList<T> { revision: number; items: T[] }
export interface ScheduleData extends SavedList<ClassEvent> {
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
