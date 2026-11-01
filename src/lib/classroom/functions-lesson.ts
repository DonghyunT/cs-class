import type { Lesson } from "./types";
import { functionConcepts, functionQuestions } from "./functions-data";

// Every answer is option 0 in the data, so show options in this order instead; ids keep the data index so saved answers do not move.
const SHOWN: Record<string, number[]> = { fc0: [1, 0, 2], fc2: [2, 1, 0], fc3: [1, 0, 2], fc4: [2, 0, 1], calls: [1, 2, 0], "repeat-call": [2, 0, 1], "reset-bug": [1, 0, 2], "missing-call": [2, 1, 0] };
const options = (id: string, labels: readonly string[]) => (SHOWN[id] ?? labels.map((_, i) => i)).map((i) => ({ id: String(i), label: labels[i] }));

export const FUNCTIONS_LESSON: Lesson = {
  id: "functions", title: "나만의 명령, 함수", category: "프로그래밍 · 함수와 디버깅", description: "여러 명령을 이름 붙인 함수로 묶어 부르고, 고장 난 코드를 찾아 고치는 프로그램을 만들어요.",
  concepts: functionConcepts.map((c) => ({ id: c.id, title: c.title, explanation: c.explanation, example: c.example, question: { id: c.id, prompt: c.prompt, options: options(c.id, c.options), hint: c.hint } })),
  quiz: functionQuestions.map((q) => ({ id: q.id, prompt: q.prompt, scene: [...q.scene], options: options(q.id, q.options), hint: q.hint })),
  practice: { type: "programming", title: "함수로 만드는 프로그램", description: "함수로 고양이를 걷게 하고, 창문을 두 번 그리고, 고장 난 도형 코드를 디버깅해요.", blocks: [] },
};
