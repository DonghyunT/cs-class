export type Role = "student" | "teacher" | "instructor";
export type Session = {
  role: Role;
  studentId?: string;
  classId?: number;
  mustChange?: boolean;
};
export type LessonId = "flow" | "data" | "digital";
export type ClassState = { current: LessonId | null; opened: LessonId[] };

export const DEMO_PASSWORD = "class-demo";
export const INSTRUCTOR_PASSWORD = "teacher-demo";
export const lessons: {
  id: LessonId;
  title: string;
  subtitle: string;
  category: string;
  color: string;
  number: string;
}[] = [
  {
    id: "flow",
    title: "생각을 잇는 순서도",
    subtitle: "한 걸음씩, 나만의 해결 과정을 그려요.",
    category: "알고리즘",
    color: "blue",
    number: "01",
  },
  {
    id: "data",
    title: "데이터 속 이야기",
    subtitle: "흩어진 정보에서 새로운 의미를 찾아요.",
    category: "데이터",
    color: "orange",
    number: "02",
  },
  {
    id: "digital",
    title: "함께 만드는 디지털 세상",
    subtitle: "연결된 세상에서 나와 우리를 생각해요.",
    category: "디지털 시민",
    color: "purple",
    number: "03",
  },
];
export function getClassId(id: string) {
  if (!/^2\d{4}$/.test(id)) return null;
  const classId = Number(id.slice(1, 3));
  const number = Number(id.slice(3));
  return classId >= 1 && classId <= 11 && number >= 1 && number <= 27
    ? classId
    : null;
}
export function studentIds(classId: number) {
  return Array.from(
    { length: 27 },
    (_, index) =>
      `2${String(classId).padStart(2, "0")}${String(index + 1).padStart(2, "0")}`,
  );
}
export function allowedClasses(role: Role) {
  return role === "instructor"
    ? [10, 11]
    : role === "teacher"
      ? Array.from({ length: 11 }, (_, i) => i + 1)
      : [];
}
export function initialClasses(): Record<number, ClassState> {
  return Object.fromEntries(
    Array.from({ length: 11 }, (_, i) => [
      i + 1,
      {
        current: i === 10 ? null : "flow",
        opened: i === 10 ? [] : ["flow", "data"],
      },
    ]),
  );
}
