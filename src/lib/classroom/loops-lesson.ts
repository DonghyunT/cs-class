import type { Lesson } from "./types";
import { loopConcepts, loopQuestions } from "./loops-data";

const options = (labels: readonly string[]) => labels.map((label, i) => ({ id: String(i), label }));

export const LOOPS_LESSON: Lesson = {
  id: "loops", title: "반복으로 똑똑하게", category: "프로그래밍 · 반복 구조", description: "같은 일을 반복 블록으로 줄이고, 도형을 그리고, 조건이 될 때까지 되풀이하는 프로그램을 만들어요.",
  concepts: loopConcepts.map((c) => ({ id: c.id, title: c.title, explanation: c.explanation, example: c.example, question: { id: c.id, prompt: c.prompt, options: options(c.options), hint: c.hint } })),
  quiz: loopQuestions.map((q) => ({ id: q.id, prompt: q.prompt, scene: [...q.scene], options: options(q.options), hint: q.hint })),
  practice: { type: "programming", title: "반복으로 만드는 프로그램", description: "반복 블록으로 도형을 그리고, 클릭할수록 자라는 나무와 맞힐 때까지 묻는 금고를 만들어요.", blocks: [] },
};
