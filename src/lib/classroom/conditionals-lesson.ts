import type { Lesson } from "./types";
import { conditionalConcepts, conditionalQuestions } from "./conditionals-data";

const options = (labels: readonly string[]) => labels.map((label, i) => ({ id: String(i), label }));

export const CONDITIONALS_LESSON: Lesson = {
  id: "conditionals", title: "조건에 따라 달라지는 프로그램", category: "프로그래밍 · 연산과 선택 구조", description: "연산자로 값을 계산하고 비교한 뒤, 조건에 따라 다른 말을 하는 프로그램을 만들어요.",
  concepts: conditionalConcepts.map((c) => ({ id: c.id, title: c.title, explanation: c.explanation, example: c.example, question: { id: c.id, prompt: c.prompt, options: options(c.options), hint: c.hint } })),
  quiz: conditionalQuestions.map((q) => ({ id: q.id, prompt: q.prompt, scene: [...q.scene], options: options(q.options), hint: q.hint })),
  practice: { type: "programming", title: "조건으로 판단하는 프로그램", description: "평균을 계산하고, 점수와 개수에 따라 다른 말을 하는 프로그램을 만들어요.", blocks: [] },
};
