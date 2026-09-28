import type { Lesson } from "./types";

export const SAMPLE_LESSON: Lesson = {
  id: "sequence-lab",
  title: "순서가 만드는 알고리즘",
  description: "할 일을 나누고, 알맞은 순서로 연결해 봅니다.",
  concepts: [
    {
      id: "algorithm", title: "알고리즘은 해결 절차예요",
      explanation: "알고리즘은 어떤 문제를 해결하기 위한 구체적인 절차입니다. 다른 사람도 따라 할 수 있도록 무엇을 할지 분명하게 설명해야 합니다.",
      example: "‘물을 마신다’는 목표예요. ‘컵을 준비한다 → 물을 따른다 → 마신다’는 목표를 이루는 절차예요.",
      question: { id: "algorithm", prompt: "다른 사람이 그대로 따라 할 수 있는 설명은 무엇일까요?", options: [{ id: "vague", label: "물을 적당히 준비한다" }, { id: "clear", label: "컵에 물을 200mL 따른다" }], hint: "양과 행동이 구체적으로 정해져 있는지 살펴보세요." },
    },
    {
      id: "sequence", title: "순서에 따라 결과가 달라져요",
      explanation: "순차 구조에서는 명령을 정해진 순서대로 하나씩 실행합니다. 앞의 행동이 끝나야 할 수 있는 다음 행동이 있는지 생각해 보세요.",
      example: "‘손에 비누를 묻힌다 → 손을 문지른다 → 물로 헹군다’는 순서예요. 헹군 뒤 비누를 묻히면 결과가 달라져요.",
      question: { id: "sequence", prompt: "파일에 새 내용을 적은 뒤, 그 내용을 남기려면 무엇을 해야 할까요?", options: [{ id: "close", label: "저장하지 않고 창을 닫아요" }, { id: "save", label: "내용을 저장해요" }], hint: "화면에서 바뀐 내용이 실제 기록으로 남는 순간을 생각해 보세요." },
    },
  ],
  quiz: [
    { id: "q1", prompt: "‘로봇이 교실 문까지 가게 하기’에서 더 구체적인 명령은 무엇인가요?", options: [{ id: "a", label: "앞으로 3칸 이동한다" }, { id: "b", label: "문 쪽으로 잘 이동한다" }, { id: "c", label: "알아서 움직인다" }], hint: "로봇이 스스로 추측하지 않아도 되는 명령을 골라 보세요." },
    { id: "q2", prompt: "입력한 숫자를 화면에 보여 주려면 어떤 순서가 맞나요?", options: [{ id: "a", label: "숫자 출력 → 숫자 입력" }, { id: "b", label: "숫자 입력 → 숫자 출력" }, { id: "c", label: "입력 없이 숫자 출력" }], hint: "화면에 보여 줄 값을 먼저 알아야 해요." },
    { id: "q3", prompt: "같은 행동들로 만든 알고리즘도 순서를 바꾸면 어떻게 될까요?", options: [{ id: "a", label: "결과는 항상 같아요" }, { id: "b", label: "항상 더 빨라져요" }, { id: "c", label: "결과가 달라질 수 있어요" }], hint: "양말과 신발을 신는 순서를 바꿔 생각해 보세요." },
  ],
  practice: {
    title: "입력한 이름으로 인사하기",
    description: "이름을 입력받고 ‘안녕, 이름!’이라는 인사말을 만든 뒤 화면에 보여 주세요. 시작과 끝도 알맞은 위치에 놓아야 합니다.",
    blocks: [
      { id: "output", label: "만든 인사말을 화면에 보여 준다" },
      { id: "end", label: "종료" },
      { id: "input", label: "이름을 입력받는다" },
      { id: "start", label: "시작" },
      { id: "greeting", label: "입력한 이름으로 인사말을 만든다" },
    ],
  },
};
export const LESSONS = [SAMPLE_LESSON];
export function findLesson(id: string) { return LESSONS.find((lesson) => lesson.id === id); }
