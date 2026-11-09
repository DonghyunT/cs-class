import type { Lesson } from "./types";
import { hamsterConcepts, hamsterQuestions } from "./hamster-robot-data";

// Every answer is option 0 in the data, so show options in this order instead; ids keep the data index so saved answers do not move.
const SHOWN: Record<string, number[]> = { hc0: [1, 0, 2], hc1: [2, 1, 0], hc2: [1, 2, 0], hq1: [2, 0, 1], hq2: [1, 0, 2], hq3: [0, 2, 1] };
const options = (id: string, labels: readonly string[]) => SHOWN[id].map((i) => ({ id: String(i), label: labels[i] }));

export const HAMSTER_ROBOT_LESSON: Lesson = {
  id: "hamster-robot",
  title: "햄스터S와 만나는 피지컬 컴퓨팅",
  category: "피지컬 컴퓨팅 · 로봇 제어",
  description: "USB 동글로 햄스터S를 연결하고, 블록으로 바퀴와 LED, 소리를 움직여요.",
  concepts: hamsterConcepts.map((c) => ({
    id: c.id, title: c.title, explanation: c.explanation, keyPoint: c.keyPoint, example: c.example,
    question: { id: c.id, prompt: c.prompt, options: options(c.id, c.options), hint: c.hint },
  })),
  quiz: hamsterQuestions.map((q) => ({ id: q.id, prompt: q.prompt, options: options(q.id, q.options), hint: q.hint })),
  practice: { type: "programming", title: "햄스터S 움직이기", description: "로봇을 연결해 앞뒤로 움직이고, LED와 소리로 신호를 보내요. 검증은 블록을 확인하고, 실제 움직임은 선생님과 함께 확인해요.", blocks: [] },
};
