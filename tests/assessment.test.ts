import { expect, test } from "@playwright/test";
import { assessmentCsv, assessmentScore, rowPercent } from "../src/lib/classroom/assessment";
import { overallPercent } from "../src/lib/classroom/progress";
import type { AssessmentRow } from "../src/lib/classroom/types";

const stage = (completed: number, total: number) => ({ completed, total, percent: 0 });
const row = (nickname: string | undefined, a: [number, number, number], b: [number, number, number]): AssessmentRow => ({
  uid: "u", studentId: "21001", ...(nickname === undefined ? {} : { nickname }),
  progress: {
    a: { concept: stage(a[0], 5), quiz: stage(a[1], 5), practice: stage(a[2], 4) },
    b: { concept: stage(b[0], 5), quiz: stage(b[1], 5), practice: stage(b[2], 3) },
  },
});

test("개념·퀴즈·실습은 항목 수와 상관없이 1/3씩, 모두 끝내야 100", () => {
  // 1/5, 2/5, 1/4 average 28.3%; counting items (4/14) would give 29%.
  expect(overallPercent([stage(1, 5), stage(2, 5), stage(1, 4)])).toBe(28);
  expect(overallPercent([stage(15, 15), stage(15, 15), stage(0, 10)])).toBe(66);
  expect(overallPercent([stage(30, 30), stage(30, 30), stage(29, 30)])).toBe(98);
  expect(overallPercent([stage(5, 5), stage(5, 5), stage(4, 4)])).toBe(100);
  // A stage without items is left out instead of counting as done or undone.
  expect(overallPercent([stage(2, 4), stage(0, 0), stage(1, 1)])).toBe(75);
  expect(overallPercent([stage(0, 0), stage(0, 0), stage(0, 0)])).toBe(0);
  // 19/20 in every stage is a true 95, which float math alone puts at 94.99999999999999.
  expect(overallPercent([stage(19, 20), stage(19, 20), stage(19, 20)])).toBe(95);
});

test("점수는 100%만 30점, 5%마다 2점씩 내려가 최저 6점", () => {
  const table: [number, number][] = [[100, 30], [99, 28], [95, 28], [94, 26], [90, 26], [80, 22], [50, 10], [45, 8], [44, 6], [0, 6]];
  for (const [percent, score] of table) expect(assessmentScore(percent), `${percent}%`).toBe(score);
});

test("선택한 수업만 합쳐 진행률을 계산", () => {
  const value = row("민수", [5, 5, 4], [5, 5, 0]);
  // Practice 4/7 with concept and quiz done: (1 + 1 + 4/7) / 3 = 85.7%.
  expect(rowPercent(value, ["a", "b"])).toBe(85);
  expect(rowPercent(value, ["a"])).toBe(100);
  expect(rowPercent(value, ["b"])).toBe(66);
});

test("CSV는 개수를 숫자 칸에 두고, 수식으로 실행될 닉네임을 글자로 막음", () => {
  const lessons = [{ id: "a", title: "변수", opened: true }, { id: "b", title: "조건 \"심화\"", opened: false }];
  const csv = assessmentCsv("2학년 10반", lessons, [row("=HYPERLINK(1)", [5, 5, 4], [5, 5, 0]), row(undefined, [0, 0, 0], [0, 0, 0])]);
  const [header, first, second] = csv.split("\r\n");
  expect(header).toBe([
    "반", "학번", "닉네임", "전체 진행률(%)", "점수", "개념 완료(전체 10)", "퀴즈 완료(전체 10)", "실습 완료(전체 7)",
    "변수 개념(전체 5)", "변수 퀴즈(전체 5)", "변수 실습(전체 4)", "조건 \"\"심화\"\" 개념(전체 5)", "조건 \"\"심화\"\" 퀴즈(전체 5)", "조건 \"\"심화\"\" 실습(전체 3)",
  ].map((value) => `"${value}"`).join(","));
  expect(first).toBe(["2학년 10반", "21001", "'=HYPERLINK(1)", "85", "24", "10", "10", "4", "5", "5", "4", "5", "5", "0"].map((value) => `"${value}"`).join(","));
  expect(second).toBe(["2학년 10반", "21001", "", "0", "6", "0", "0", "0", "0", "0", "0", "0", "0", "0"].map((value) => `"${value}"`).join(","));
  expect(csv).not.toMatch(/"\d+\/\d+"/);
});
