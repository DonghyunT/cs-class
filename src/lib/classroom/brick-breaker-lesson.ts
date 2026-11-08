import type { Lesson } from "./types";
import { brickBreakerConcepts, brickBreakerQuestions } from "./brick-breaker-data";

// Every answer is option 0 in the data, so show options in this order instead; ids keep the data index so saved answers do not move.
const SHOWN: Record<string, number[]> = {
  bq1: [1, 0, 2], bq2: [2, 1, 0], bq3: [0, 1, 2], bq4: [2, 0, 1], bq5: [1, 2, 0],
};
const options = (id: string, labels: readonly string[]) => (SHOWN[id] ?? labels.map((_, i) => i)).map((i) => ({ id: String(i), label: labels[i] }));

export const BRICK_BREAKER_LESSON: Lesson = {
  id: "brick-breaker",
  title: "변수와 조건으로 만드는 벽돌 깨기",
  category: "프로그래밍 · 변수와 게임 설계",
  description: "마우스를 따라 움직이는 막대, 통통 튀는 공, 점수가 오르며 사라지는 벽돌을 차례로 조립해 게임을 완성해요.",
  concepts: brickBreakerConcepts.map((c) => ({
    id: c.id, title: c.title, explanation: c.explanation, keyPoint: c.keyPoint, example: "",
    question: { id: c.id, prompt: c.prompt, options: [], assemble: { head: c.head, blocks: c.blocks.map((block) => ({ ...block })), slots: [...c.slots] }, hint: c.hint },
  })),
  quiz: brickBreakerQuestions.map((q) => ({
    id: q.id, prompt: q.prompt, scene: [...q.scene], captures: q.captures.map((c) => ({ ...c })), options: options(q.id, q.options), hint: q.hint,
  })),
  practice: {
    type: "programming",
    title: "차근차근 완성하는 벽돌 깨기 게임",
    description: "막대 움직이기 → 공 튕기기 → 벽돌 깨고 점수 올리기 순서로 벽돌 깨기 게임을 완성해요.",
    blocks: [],
  },
};
