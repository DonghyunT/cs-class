import { expect, test } from "@playwright/test";
import { festivalReport } from "../src/lib/classroom/review/festival-report";
import { initialReviewProject, type FestivalProject } from "../src/lib/classroom/review/project";

const base = initialReviewProject("festival") as FestivalProject;
const done = (hearts: number, questions: FestivalProject["chapterResults"][1]["questions"] = {}) => ({ completed: true, hearts, questions });

test("교사용 요약은 장별 하트, 총 하트, 엔딩 이름, 첫 시도에 놓친 문항을 EP 제목으로 보여 준다", () => {
  const project: FestivalProject = {
    ...base, totalHearts: 6, endingOutcome: "awkward",
    chapterResults: {
      1: done(3, { "ch1-q1": { firstAttempt: true, solved: true, conceptTitle: "a" }, "ch1-q2": { firstAttempt: false, solved: true, conceptTitle: "b" } }),
      2: done(2, { "ch2-q4": { firstAttempt: false, solved: true, conceptTitle: "c" }, "ch2-q1": { firstAttempt: false, solved: true, conceptTitle: "d" } }),
      3: done(1),
    },
  };
  const report = festivalReport(project);
  expect(report.chapters).toEqual([{ id: 1, hearts: 3 }, { id: 2, hearts: 2 }, { id: 3, hearts: 1 }]);
  expect([report.total, report.max, report.ending]).toEqual([6, 12, "다시 맞출 콤비"]);
  // Game order within a chapter, not the order the saved map happens to list them.
  expect(report.missed).toEqual([
    "EP 2 · 초대장에 찍힌 '정문 님'",
    "EP 5 · 7장 이상인데 7장은 튕기는 포토 부스",
    "EP 8 · 교환권 10장 모았는데 스티커가 웬 말?!",
  ]);
});

test("오답 이유(lastWrongWhy)가 기록되면 missed와 missedDetails에 함께 노출한다", () => {
  const project: FestivalProject = {
    ...base, totalHearts: 11, endingOutcome: "some",
    chapterResults: {
      1: done(3, { "ch1-q2": { firstAttempt: false, solved: true, conceptTitle: "변수 덮어쓰기", lastWrongWhy: "'대답'은 마지막 값만 기억해요." } }),
      2: done(4),
      3: done(4),
    },
  };
  const report = festivalReport(project);
  expect(report.ending).toBe("썸 시작");
  expect(report.missed).toEqual(["EP 2 · 초대장에 찍힌 '정문 님' — '대답'은 마지막 값만 기억해요."]);
  expect(report.missedDetails).toEqual([{
    id: "ch1-q2",
    title: "EP 2 · 초대장에 찍힌 '정문 님'",
    conceptTitle: "변수 덮어쓰기",
    lastWrongWhy: "'대답'은 마지막 값만 기억해요.",
  }]);
});

test("엔딩 이름과 아직 엔딩이 없는 상태", () => {
  expect(festivalReport({ ...base, endingOutcome: "some" }).ending).toBe("썸 시작");
  expect(festivalReport({ ...base, endingOutcome: "friend" }).ending).toBe("찐친");
  expect(festivalReport(base).ending).toBe("아직 엔딩 전");
  expect(festivalReport(base).missed).toEqual([]);
});

test("문항 제목에는 템플릿 자리표시자가 없고 EP 번호로 시작한다", () => {
  const titles = festivalReport({ ...base, chapterResults: Object.fromEntries([1, 2, 3].map(id => [id, done(0, Object.fromEntries([1, 2, 3, 4].map(n => [`ch${id}-q${n}`, { firstAttempt: false, solved: true, conceptTitle: "x" }])))])) as FestivalProject["chapterResults"] }).missed;
  expect(titles).toHaveLength(12);
  for (const title of titles) expect(title).toMatch(/^EP \d+ · [^{}]+$/);
});
