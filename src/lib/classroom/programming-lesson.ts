import type { Lesson } from "./types";
import { concepts, questions } from "../prototype/programming";

export const PROGRAMMING_LESSON: Lesson = {
  id: "programming-13", title: "강아지와 시작하는 프로그래밍", category: "프로그래밍 · 입력과 변수", description: "직접 바꾸고 실행하며, 이름·계산·움직임을 만드는 네 가지 미션에 도전해요.",
  concepts: concepts.map((c, i) => ({ id: `pc${i}`, title: c.title, explanation: c.explanation, example: c.subtitle, question: { id: `pc${i}`, prompt: c.question, options: c.options.map((label, j) => ({ id: String(j), label })), hint: "실험의 입력과 결과를 비교해 보세요." } })),
  quiz: questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options.map((label, i) => ({ id: String(i), label })), hint: q.hint })),
  practice: { type: "programming", title: "나의 첫 프로그램", description: "이름과 계산은 새 작품으로, 움직임 개선은 앞 작품에 코드를 더해요.", blocks: [] },
};
