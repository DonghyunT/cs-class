import { expect, test } from "@playwright/test";
import { findLesson } from "../src/lib/classroom/catalog";
import { dropStaleAnswers, emptyWork } from "../src/lib/classroom/progress";

// A lesson edit can remove or rename a question after students saved answers to it. The server rejects a draft that
// names an unknown question, so stored work is cleaned when it is read; otherwise those students could not save again.
const loops = findLesson("loops")!;
const [firstConcept, secondConcept] = loops.concepts, [firstQuiz, secondQuiz] = loops.quiz;

test("수업에서 없어진 문항·보기의 답과 풀이 회차는 저장본을 읽을 때 걸러진다", () => {
  const work = emptyWork(loops);
  work.draft.conceptAnswers = { [firstConcept.id]: "1", removed: "0", [secondConcept.id]: "9" };
  work.draft.quizAnswers = { [firstQuiz.id]: "2", gone: "1" };
  work.quizRoundIds = [firstQuiz.id, "gone", secondQuiz.id];
  const current = dropStaleAnswers(loops, work);
  expect(current.draft.conceptAnswers).toEqual({ [firstConcept.id]: "1" });
  expect(current.draft.quizAnswers).toEqual({ [firstQuiz.id]: "2" });
  expect(current.quizRoundIds).toEqual([firstQuiz.id, secondQuiz.id]);
});

test("회차의 문항이 모두 없어지면 아직 못 푼 문항으로 회차를 다시 열고, 확인을 마친 회차는 비워 둔다", () => {
  const work = { ...emptyWork(loops), quizRoundIds: ["gone"], quizSolved: [firstQuiz.id] };
  expect(dropStaleAnswers(loops, work).quizRoundIds).toEqual(loops.quiz.slice(1).map((question) => question.id));
  // After grading, 틀린 문제 다시 풀기 builds the next round from the lesson itself.
  expect(dropStaleAnswers(loops, { ...work, quizRoundGraded: true }).quizRoundIds).toEqual([]);
});

test("조립형 답에 없어진 블록이 있으면 그 답을 버린다", () => {
  const brick = findLesson("brick-breaker")!;
  const [first, second] = brick.concepts;
  const kept = first.question.assemble!.blocks.slice(0, 2).map((block) => block.id).join(",");
  const work = emptyWork(brick);
  work.draft.conceptAnswers = { [first.id]: kept, [second.id]: `${second.question.assemble!.blocks[0].id},no-such-block` };
  expect(dropStaleAnswers(brick, work).draft.conceptAnswers).toEqual({ [first.id]: kept });
});

test("지금 수업과 맞는 저장본은 바뀌지 않는다", () => {
  const work = emptyWork(loops);
  work.draft.conceptAnswers = { [firstConcept.id]: "0" };
  work.draft.quizAnswers = { [firstQuiz.id]: "1" };
  work.quizRoundIds = [secondQuiz.id];
  expect(dropStaleAnswers(loops, work)).toEqual(work);
});
