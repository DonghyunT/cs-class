import type { Lesson } from "./types";
import { concepts, conceptOrder, questions } from "./programming-data";

export const PROGRAMMING_LESSON: Lesson = {
  id: "programming-13", title: "프로그래밍의 기초", category: "프로그래밍 · 입력과 변수", description: "직접 바꾸고 실행하며, 이름·계산·움직임을 만드는 네 가지 미션에 도전해요.",
  concepts: conceptOrder.map((i) => { const c = concepts[i]; return { id: `pc${i}`, title: c.title, explanation: c.explanation, example: c.subtitle, question: { id: `pc${i}`, prompt: c.question, options: c.options.map((label, j) => ({ id: String(j), label })), hint: i === 4 ? "세 용어의 뜻과 관계를 비교해 보세요." : "실험의 입력과 결과를 비교해 보세요." } }; }),
  quiz: questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options.map((label, i) => ({ id: String(i), label })), hint: q.hint })),
  practice: { type: "programming", title: "나의 첫 프로그램", description: "이름·계산·움직임·방향키를 미션마다 새 작품으로 만들어요.", blocks: [] },
};
