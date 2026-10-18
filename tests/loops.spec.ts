import { expect, test } from "@playwright/test";
import { LESSONS, RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject, missionsFor, type EntryNode } from "../src/lib/classroom/programming-entry";
import { emptyWork } from "../src/lib/classroom/progress";
import type { Work, WorkAction } from "../src/lib/classroom/types";
import { headers, localOnly, readyTeacher } from "./emulator";

const id = "loops", lesson = LESSONS.find((item) => item.id === id)!;
const endpoint = `/api/teacher-preview/${id}/evaluate`;
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string) => node("number", v);
const answer = () => node("get_canvas_input_value", null);
const start = () => node("when_run_button_click", null);
const loopOf = (count: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", count, null), statements: [inner] });
const draw = (count: EntryNode, angle: EntryNode) => [node("start_drawing", null), loopOf(count, [node("move_direction", number("100"), null), node("direction_relative", angle, null)])];

// Reference solutions a student could build from the mission hints.
const solutions: Record<string, string> = {
  square: buildProgrammingProject([[start(), ...draw(number("4"), node("angle", "90"))]]),
  polygon: buildProgrammingProject([[start(), node("ask_and_wait", node("text", "변의 수는?"), null), ...draw(answer(), node("calc_basic", number("360"), "DIVIDE", answer()))]]),
  safe: buildProgrammingProject([[start(), { ...node("repeat_while_true", node("boolean_basic_operator", answer(), "EQUAL", number("1234")), "until", null), statements: [[node("ask_and_wait", node("text", "비밀번호는?"), null)]] }, node("dialog", node("text", "금고가 열렸어요!"), "speak", null)]]),
};

test.beforeEach(async ({ request }) => { await localOnly(request); });

test("반복 수업은 교사 미리보기에서만 열리고, 준비된 세 미션을 서버가 판정한다", async ({ request }) => {
  // Students cannot open it until the tree mission ships.
  expect(RELEASED_LESSONS.some((item) => item.id === id)).toBe(false);
  expect(missionsFor(id).map((mission) => mission.id)).toEqual(["square", "polygon", "safe"]);
  await readyTeacher(request);
  let work: Work = emptyWork(lesson);
  work.draft.programming = { mission: "square", projects: solutions, reflection: "" };
  for (const mission of Object.keys(solutions)) {
    for (const type of ["validate-practice", "submit-practice"] as WorkAction["type"][]) {
      const response = await request.post(endpoint, { headers, data: { classId: "2-1", work, action: { type, missionId: mission } } });
      expect(response.status(), `${mission} ${type}`).toBe(200);
      work = await response.json();
    }
    expect(work.missions?.[mission]?.validation?.passed, mission).toBe(true);
  }
  // A mission this lesson does not list yet cannot be checked.
  expect((await request.post(endpoint, { headers, data: { classId: "2-1", work, action: { type: "validate-practice", missionId: "tree" } } })).status()).toBe(400);
});

test("반복 수업 미리보기 화면은 개념·코드 읽기 퀴즈·세 미션을 보여 준다", async ({ page }) => {
  await readyTeacher(page.request);
  await page.goto(`/teacher/preview/${id}?classId=2-1`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("반복으로 똑똑하게");
  await expect(page.getByRole("heading", { name: "같은 일을 줄여 주는 반복" })).toBeVisible();
  await page.getByRole("tab", { name: /퀴즈/ }).click();
  await expect(page.getByRole("group", { name: "읽어 볼 코드" })).toContainText("4번 반복하기");
  await page.getByRole("tab", { name: /^실습/ }).click();
  const missions = page.getByRole("navigation", { name: "실습 미션" }).getByRole("button");
  await expect(missions).toHaveCount(3);
  await expect(missions.nth(2)).toContainText("도전 · 비밀번호 금고");
});
