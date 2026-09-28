// Public lesson previews. Auth and saved learning use lib/classroom and lib/server.
export type LessonId = "flow" | "data" | "digital";
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
