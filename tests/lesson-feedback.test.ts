import { expect, test } from "@playwright/test";
import { RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { concepts, questions } from "../src/lib/classroom/programming-data";
import { conditionalConcepts, conditionalQuestions } from "../src/lib/classroom/conditionals-data";
import { loopConcepts, loopQuestions } from "../src/lib/classroom/loops-data";
import { UNIT_QUIZ_DATA } from "../src/lib/server/review-quiz.mjs";
import { missionById } from "../src/lib/classroom/programming-entry";
import { readFileSync } from "node:fs";

const UNITS = { "review-abstraction": "abstraction", "review-sandwich": "algorithm", "review-flowchart": "flowchart" } as const;

// Saved answers are option ids, so option counts, order and answers must not move when wording changes.
test("공개 수업의 개념 확인·퀴즈 선택지 수와 정답 번호는 그대로다", () => {
  const correct: Record<string, number> = {};
  concepts.forEach((c, i) => { correct[`programming-13:pc${i}`] = c.correct; });
  for (const q of questions) correct[`programming-13:${q.id}`] = q.correct;
  for (const c of [...conditionalConcepts, ...conditionalQuestions]) correct[`conditionals:${c.id}`] = c.correct;
  for (const c of [...loopConcepts, ...loopQuestions]) correct[`loops:${c.id}`] = c.correct;
  const reviewCorrect = (lesson: string, id: string) => UNIT_QUIZ_DATA[UNITS[lesson as keyof typeof UNITS]].questions.find((q) => String(q.id) === id)!.options.findIndex((o) => o.correct);
  const rows = RELEASED_LESSONS.map((lesson) => [lesson.id,
    lesson.concepts.map((c) => [c.id, c.question.options.length, correct[`${lesson.id}:${c.id}`] ?? 0]),
    lesson.quiz.map((q) => [q.id, q.options.length, correct[`${lesson.id}:${q.id}`] ?? reviewCorrect(lesson.id, q.id)])]);
  expect(rows).toEqual([
    ["programming-13", [["pc4", 3, 0], ["pc0", 3, 0], ["pc1", 3, 2], ["pc2", 3, 1], ["pc3", 3, 1]], [["language", 3, 0], ["flow", 3, 2], ["variable", 3, 1], ["answer", 3, 0], ["signal", 3, 1]]],
    ["conditionals", [["cc0", 3, 0], ["cc1", 3, 1], ["cc2", 2, 0], ["cc3", 3, 1], ["cc4", 3, 0]], [["order", 3, 0], ["pass", 3, 0], ["and", 2, 1], ["multi", 3, 1], ["bug", 3, 0]]],
    ["loops", [["lc0", 3, 0], ["lc1", 3, 0], ["lc2", 3, 0], ["lc3", 3, 0], ["lc4", 3, 0]], [["distance", 3, 0], ["pentagon", 3, 0], ["counter", 3, 0], ["until", 3, 0], ["nested", 3, 0]]],
    ["review-abstraction", [["essential", 2, 0], ["state", 2, 0], ["decompose", 2, 0]], [["1", 4, 1], ["2", 4, 2], ["3", 4, 0], ["4", 4, 0]]],
    ["review-sandwich", [["clear", 2, 0], ["finite", 2, 0], ["structure", 2, 0]], [["1", 4, 1], ["2", 4, 0], ["3", 4, 0], ["4", 4, 1]]],
    ["review-flowchart", [["symbols", 2, 0], ["branches", 2, 0], ["loop", 2, 0]], [["1", 4, 0], ["2", 4, 1], ["3", 4, 2], ["4", 4, 0]]],
  ]);
});

const noAnswer = (text: string, label: string) => {
  expect(text, label).toBeTruthy();
  expect(text, label).not.toContain("정답");
  expect(text.length, label).toBeLessThanOrEqual(170);
};

test("세 엔트리 수업 퀴즈의 모든 오답 보기에는 힌트·보기와 다른 이유 문구가 있고 정답 보기에는 없다", () => {
  for (const q of [...questions, ...conditionalQuestions, ...loopQuestions]) {
    const why: Record<string, string> = q.why;
    expect(Object.keys(why).sort(), q.id).toEqual(q.options.map((_, i) => String(i)).filter((id) => id !== String(q.correct)));
    for (const [id, text] of Object.entries(why)) {
      noAnswer(text, `${q.id} ${id}`);
      expect(text, q.id).not.toBe(q.hint);
      for (const option of q.options) expect(text, q.id).not.toBe(option);
    }
    expect(new Set(Object.values(why)).size, q.id).toBe(Object.keys(why).length);
  }
});

test("개념 확인 오답 되묻기는 개념마다 있고 힌트·설명과 다르다", () => {
  const lessonConcepts = RELEASED_LESSONS.flatMap((lesson) => lesson.concepts);
  const retries = [...concepts.map((c, i) => [`pc${i}`, c.retry] as const), ...[...conditionalConcepts, ...loopConcepts].map((c) => [c.id, c.retry] as const)];
  for (const [id, retry] of retries) {
    const concept = lessonConcepts.find((c) => c.id === id)!;
    noAnswer(retry, id);
    expect(retry, id).not.toBe(concept.question.hint);
    expect(retry, id).not.toBe(concept.explanation);
  }
  expect(new Set(retries.map(([, retry]) => retry)).size).toBe(retries.length);
});

test("복습 퀴즈 12문항의 오답 문구는 서로 다르고 미리 보이는 힌트와 다르다", () => {
  const wrong = Object.values(UNIT_QUIZ_DATA).flatMap((unit) => unit.questions.map((q) => q.wrong));
  expect(wrong).toHaveLength(12);
  expect(new Set(wrong).size).toBe(12);
  const hints = new Set(RELEASED_LESSONS.filter((lesson) => lesson.mode === "review").flatMap((lesson) => lesson.quiz.map((q) => q.hint)));
  for (const text of wrong) { noAnswer(text, text); expect(hints.has(text), text).toBe(false); }
});

test("답하기 전 힌트는 계산·규칙을 그대로 주지 않고 볼 곳만 알려 준다", () => {
  const hint = (id: string) => [...conditionalConcepts, ...loopConcepts, ...conditionalQuestions, ...loopQuestions, ...questions].find((item) => item.id === id)!.hint;
  expect(hint("cc0")).toBe("나머지는 나누고 ‘남는’ 수예요. 몫과 헷갈리지 않게 보세요.");
  expect(hint("cc2")).toBe("두 조건을 각각 참·거짓으로 바꾼 뒤, 개념 설명에서 ‘또는’이 언제 참인지 찾아보세요.");
  expect(hint("lc2")).toBe("한 바퀴를 다 돌면 모두 몇 도인지, 정육각형은 몇 번 꺾이는지 세어 보세요.");
  expect(hint("lc4")).toBe("‘더하기’는 원래 값에 더해요. 실행할 때마다 클릭 수가 어떻게 바뀌는지 차례로 적어 보세요.");
  expect(hint("order")).toBe("두 식에서 괄호가 있는 곳과 없는 곳을 비교하고, 먼저 계산할 부분에 표시해 보세요.");
  expect(hint("and")).toBe("두 조건을 하나씩 참·거짓으로 따진 뒤, 개념 ‘논리 연산자’에서 ‘그리고’가 언제 참인지 확인해 보세요.");
  expect(hint("pentagon")).toBe("다섯 번 꺾어서 처음 방향으로 돌아오려면 모두 몇 도를 돌아야 할까요?");
  expect(hint("signal")).toBe("개념 ‘어떤 신호에 움직일까?’ 실험의 방향 버튼 아래 적힌 각도를 떠올려 보세요.");
});

test("조건·반복 문구는 같은 대상·용어를 쓰고, 문항이 묻는 규칙을 본문 예시로 먼저 보인다", () => {
  for (const q of [...conditionalQuestions, ...loopQuestions]) expect(q.prompt, q.id).not.toContain("강아지");
  const concept = (id: string) => [...conditionalConcepts, ...loopConcepts].find((c) => c.id === id)!;
  expect(concept("lc4").example).toContain("무대를 클릭");
  expect(concept("lc2").explanation).toContain("바깥쪽");
  expect(concept("cc0").explanation).toContain("×, ÷를 +, −보다 먼저");
  expect(concept("cc0").example).toContain("나머지는 3");
  expect(concept("cc1").explanation).toContain("같을 때도 참");
  expect(concept("lc1").explanation).toContain("안쪽 반복이 처음부터");
  expect(missionById("freethrow")!.experiment).toMatch(/4, 5, 7, 8/);
  const abstraction = readFileSync("src/lib/classroom/review/abstraction-data.mjs", "utf8");
  expect(abstraction).not.toMatch(/순삭|안읽씹/);
});

test("샌드위치 로봇의 모든 오류 문장은 첫 문장 뒤에 다음 행동을 한 문장으로 알려 준다", () => {
  const messages = readFileSync("src/lib/classroom/review/sandwich-engine.mjs", "utf8").match(/"오류: [^"]*"/g)!;
  expect(messages.length).toBeGreaterThan(20);
  for (const message of messages) expect(message).toMatch(/^"오류: [^!]+! [^!]+주세요\."$/);
});

test("복습 체험·순서도 화면에는 영어 의사 코드·머리표가 남지 않고, 부분 초기화 버튼은 효과 범위를 이름으로 말한다", () => {
  const source = (path: string) => readFileSync(path, "utf8");
  expect(source("src/components/student/review/concepts.tsx")).not.toMatch(/\b(START|PREPARE|IF|ELSE|STIR|REPEAT|END)\b/);
  expect(source("src/components/student/review/flowchart.tsx")).not.toContain("Mission ");
  expect(source("src/components/student/review/flow-diagram.tsx")).not.toContain(">Drop<");
  expect(source("src/lib/classroom/review/flowchart-data.mjs")).not.toContain("(Height)");
  // The run button's accessible name is "자동 실행", so the visible text must contain it.
  expect(source("src/components/student/review/flow-execution.tsx")).not.toContain("▶ 실행 검증");
  expect(source("src/components/student/review/flowchart-concepts.tsx")).not.toContain(">초기화</Button>");
});

test("반복 lc2 예시와 그림은 개념 확인(정육각형)·퀴즈(정오각형)의 답을 미리 보여 주지 않는다", () => {
  const lc2 = loopConcepts.find((c) => c.id === "lc2")!;
  expect(lc2.example).not.toMatch(/정육각형|정오각형/);
  expect(readFileSync("src/components/student/concept-visual.tsx", "utf8")).not.toMatch(/n=\{[56]\}/);
});

test("반복 개념·퀴즈의 블록 이름은 팔레트 이름과 같고, 만든 뒤 확인 문장은 클릭 대상을 헷갈리게 하지 않는다", () => {
  const lc1 = loopConcepts.find((c) => c.id === "lc1")!;
  expect(lc1.example).toContain("‘이동 방향으로 100만큼 움직이기’와 ‘이동 방향을 90°만큼 회전하기’");
  expect(lc1.prompt).toContain("‘이동 방향으로 10만큼 움직이기’");
  expect(loopQuestions.find((q) => q.id === "distance")!.scene).toContain("  └ 이동 방향으로 10만큼 움직이기");
  expect(loopQuestions.find((q) => q.id === "pentagon")!.scene).toContain("  └ 이동 방향으로 100만큼 움직이기");
  expect(missionById("tree")!.experiment).not.toContain("물뿌리개");
  expect(missionById("escape")!.experiment).toContain("1과 1");
});
