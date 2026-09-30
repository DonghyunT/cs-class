import { expect, test } from "@playwright/test";
import { STORAGE_KEY, checkMission, initialState, newBlock, restoreState, runProgram, type Block, type BlockKind, type Signal } from "../src/lib/prototype/programming";

const make = (...items: [BlockKind, string][]): Block[] => items.map(([kind, value], i) => ({ ...newBlock(kind, String(i)), value }));
const calculator = make(["start", "click"], ["ask", "a"], ["store", "A"], ["ask", "b"], ["store", "B"], ["calculate", "multiply"]);

test("실행기는 대답 덮어쓰기·0/음수·평균·방향 신호·잘못된 복원을 구분한다", () => {
  const inputs = { name: "초코", a: "-2", b: "0" };
  expect(runProgram(calculator, inputs).frames.at(-1)?.speech).toBe("A × B = 0");
  expect(checkMission(1, calculator).passed).toBe(true);
  const broken = make(["start", "click"], ["ask", "a"], ["ask", "b"], ["store", "A"], ["store", "B"], ["calculate", "multiply"]);
  expect(checkMission(1, broken).passed).toBe(false);
  const average = calculator.map((b) => b.kind === "calculate" ? { ...b, value: "average" } : b);
  expect(runProgram(average, { ...inputs, a: "-4", b: "6" }).frames.at(-1)?.speech).toBe("A와 B의 평균 = 1");
  expect(checkMission(3, average).passed).toBe(true);
  for (const [signal, direction, x, y] of [["ArrowUp", "0", 0, 10], ["ArrowRight", "90", 10, 0], ["ArrowDown", "180", 0, -10], ["ArrowLeft", "270", -10, 0]] as const) {
    const result = runProgram(make(["start", signal], ["direction", direction], ["move", "10"]), inputs, signal as Signal);
    expect(result.error).toBe(""); expect(result.frames.at(-1)).toMatchObject({ x, y });
  }
  expect(runProgram(calculator, { ...inputs, a: "Infinity" }).error).toContain("숫자");
  expect(runProgram(calculator, { ...inputs, a: "" }).error).toContain("입력값");
  const initial = initialState();
  expect(restoreState(JSON.stringify(initial))).toEqual(initial);
  const draft = { ...initial, programs: initial.programs.map((p, i) => i === 2 ? [...p, { id: "empty", kind: "move", value: "" }] : p) };
  expect(restoreState(JSON.stringify(draft))?.programs[2].at(-1)?.value).toBe("");
  expect(checkMission(2, make(["start", "ArrowRight"], ["move", "10"])).passed).toBe(false);
  expect(checkMission(2, make(["start", "ArrowRight"], ["move", "10"], ["direction", "90"])).passed).toBe(false);
  const longDraft = { ...initial, programs: initial.programs.map((p, i) => i === 2 ? [...p, { id: "long", kind: "move", value: "100.0000" }] : p) };
  expect(restoreState(JSON.stringify(longDraft))?.programs[2].at(-1)?.value).toBe("100.0000");
  expect(restoreState(JSON.stringify({ ...initial, programs: [[{ id: "x", kind: "eval", value: "alert(1)" }]] }))).toBeNull();
  expect(restoreState(JSON.stringify({ ...initial, conceptDone: [0] }))).toBeNull();
  expect(restoreState("{" )).toBeNull();
});

test("개념→퀴즈 오답 재도전→실습·도움·교사 피드백과 재접속", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/prototype/programming");
  await expect(page.getByRole("tab", { name: "개념 0/4" })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("concept-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "텍스트", exact: true }).click();
  await expect(page.getByText("print(", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "이 명령 실행하기" }).click();
  await expect(page.getByText("안녕!", { exact: true })).toBeVisible();
  const conceptAnswers = ["컴퓨터가 할 일을 명령으로 표현해요", "출력", "3", "오른쪽 화살표 키를 누를 때"];
  for (let i = 0; i < 4; i++) {
    await page.getByRole("radio", { name: conceptAnswers[i], exact: true }).check();
    await page.getByRole("button", { name: "생각 확인하기" }).click();
    await expect(page.locator("#concept-feedback")).toBeFocused();
    if (i < 3) await page.getByRole("button", { name: "다음 개념", exact: true }).click();
  }
  await page.getByRole("button", { name: "퀴즈에 도전하기" }).click();
  const answers = ["명령을 표현하는 방법", "수 입력 → 곱하기 → 결과 보여주기", "6", "각 대답을 받은 직후 해당 변수에 저장하기", "90°"];
  for (let i = 0; i < 5; i++) {
    await page.getByRole("radio", { name: answers[i], exact: false }).check();
    if (i < 4) await page.getByRole("button", { name: "다음 문제", exact: true }).click();
  }
  await page.screenshot({ path: info.outputPath("quiz-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "이번 도전 결과 보기" }).click();
  await expect(page.getByRole("tab", { name: "퀴즈 4/5" })).toBeVisible();
  await expect(page.locator("#quiz-result")).toBeFocused();
  await page.getByRole("button", { name: "틀린 문제만 다시 풀기" }).click();
  await expect(page.getByRole("radio")).toHaveCount(3);
  await page.getByRole("radio", { name: "B 3", exact: true }).check();
  await page.getByRole("button", { name: "이번 도전 결과 보기" }).click();
  await expect(page.getByRole("tab", { name: "퀴즈 5/5" })).toBeVisible();
  await page.getByRole("button", { name: "실습으로 이동" }).click();
  await page.getByRole("button", { name: "묻고 대답 기다리기", exact: true }).dragTo(page.locator("ol").first());
  await page.getByRole("button", { name: "대답 말하기", exact: true }).click();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "내 이름은 초코!" })).toBeVisible();
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await page.getByRole("button", { name: "내 작업에 완료 표시" }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("li[data-kind]")).toHaveCount(3);
  await page.getByRole("button", { name: "곱셈 계산기", exact: false }).click();
  for (const name of ["묻고 대답 기다리기", "묻고 대답 기다리기", "대답을 변수에 저장하기", "계산해서 말하기"]) await page.getByRole("button", { name, exact: true }).click();
  await page.getByLabel("4번 블록 변수").selectOption("B");
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "계산하려면 A와 B" })).toBeVisible();
  await page.getByRole("button", { name: "막혔어요" }).click();
  await page.getByRole("button", { name: "도움 요청 체험하기" }).click();
  await page.getByRole("button", { name: "요청받은 선생님 화면 보기" }).click();
  await expect(page.getByRole("heading", { name: "요청 당시의 코드" })).toBeVisible();
  const requestedCode = page.getByRole("heading", { name: "요청 당시의 코드" }).locator("..").getByRole("list").first();
  await expect(requestedCode).toContainText("시작 버튼");
  await expect(requestedCode).toContainText("A의 값");
  await expect(requestedCode).toContainText("A × B");
  await page.getByLabel("다음에 해볼 행동을 짧게 남겨주세요").fill("A를 물은 직후 A에 저장하는 블록을 넣고 다시 실행해보자.");
  await page.getByRole("button", { name: "학생 화면에 피드백 남기기" }).click();
  await page.screenshot({ path: info.outputPath("teacher-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "학생이 받은 피드백 보기" }).click();
  await expect(page.getByText("A를 물은 직후 A에 저장하는 블록을 넣고 다시 실행해보자.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "도움 닫기" }).click();
  await page.getByRole("button", { name: "대답을 변수에 저장하기", exact: true }).click();
  const id = await page.locator("li[data-kind='store']").last().getAttribute("id");
  const block = page.locator(`#${id}`);
  await block.getByRole("combobox").selectOption("A");
  for (let i = 0; i < 3; i++) await block.getByRole("button", { name: /위로 이동/ }).click();
  await page.getByRole("button", { name: "실행하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "A × B = 24" })).toBeVisible();
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await page.getByRole("button", { name: "내 작업에 완료 표시" }).click();
  await page.screenshot({ path: info.outputPath("practice-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "막혔어요" }).click();
  await page.getByRole("button", { name: "다시 해보고 해결했어요" }).click();
  await expect(page.getByText("내가 해결 표시함", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "요청받은 선생님 화면 보기" }).click();
  await expect(page.getByText("요청 뒤 학생이 코드를 바꿨어요.", { exact: false })).toBeVisible();
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("teacher-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("방향키는 무대에서만 동작하고 중지·좁은 창·탭 이동이 작업을 보존한다", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/prototype/programming");
  await page.getByRole("tab", { name: "실습 0/3" }).click();
  await page.getByRole("button", { name: "방향키로 강아지 움직이기", exact: false }).click();
  await page.getByLabel("1번 블록 시작 신호").selectOption("ArrowRight");
  await page.getByRole("button", { name: "이동 방향 정하기", exact: true }).click();
  await page.getByRole("button", { name: "이동 방향으로 움직이기", exact: true }).click();
  const stage = page.getByRole("group", { name: "강아지 실행 무대" });
  await stage.focus(); await stage.press("ArrowRight");
  await expect(page.getByRole("status").filter({ hasText: "(10, 0)로 움직였어요" })).toBeVisible();
  await page.getByLabel("3번 블록 이동 거리").focus();
  await page.getByLabel("3번 블록 이동 거리").press("ArrowRight");
  await expect(page.getByText("x 10 · y 0 · 방향 90°", { exact: true })).toBeVisible();
  await stage.press("ArrowRight");
  await page.getByRole("button", { name: "중지", exact: true }).click();
  await expect(page.getByText("x 0 · y 0 · 방향 90°", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "미션 조건 확인" }).click();
  await page.getByRole("button", { name: "내 작업에 완료 표시" }).click();
  await page.getByRole("tab", { name: "실습 1/3" }).press("Home");
  await expect(page.getByRole("tab", { name: "개념 0/4" })).toBeFocused();
  for (const stageName of ["개념 0/4", "퀴즈 0/5", "실습 1/3"]) {
    await page.getByRole("tab", { name: stageName }).click();
    for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("practice-mobile.png"), fullPage: true });
  await page.reload();
  await expect(page.getByLabel("3번 블록 이동 거리")).toHaveValue("10");
  await page.getByLabel("3번 블록 이동 거리").fill("");
  await page.reload();
  await expect(page.getByLabel("3번 블록 이동 거리")).toHaveValue("");
  await expect(page.getByRole("tab", { name: "실습 1/3" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("3번 블록 이동 거리").fill("100.0000");
  await page.reload();
  await expect(page.getByLabel("3번 블록 이동 거리")).toHaveValue("100.0000");
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY);
  expect(restoreState(stored)?.completed).toEqual([2]);
  await page.getByRole("button", { name: "막혔어요" }).click();
  await page.getByRole("button", { name: "곱셈 계산기", exact: false }).click();
  await expect(page.getByRole("heading", { name: "같이 다음 한 걸음을 찾자" })).not.toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "체험 처음부터" }).click();
  await expect(page.getByRole("tab", { name: "개념 0/4" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#concept-title")).toBeFocused();
});

test("탭 보관 실패는 답안을 유지하고 이동을 막고 재시도 뒤 복원한다", async ({ page }) => {
  await page.goto("/prototype/programming");
  await expect(page.getByRole("tab", { name: "개념 0/4" })).toBeEnabled();
  await page.evaluate(() => {
    Reflect.set(window, "originalPrototypeSetItem", Storage.prototype.setItem);
    Storage.prototype.setItem = function (key, value) { if (key === "cs-class-programming-prototype-v1") throw new DOMException("quota", "QuotaExceededError"); Reflect.get(window, "originalPrototypeSetItem").call(this, key, value); };
  });
  await page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true }).check();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("보관하지 못했어요");
  await page.getByRole("tab", { name: "퀴즈 0/5" }).click();
  await expect(page.getByRole("tab", { name: "개념 0/4" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true })).toBeChecked();
  await page.evaluate(() => { Storage.prototype.setItem = Reflect.get(window, "originalPrototypeSetItem"); });
  await page.getByRole("button", { name: "탭 보관 재시도" }).click();
  await page.getByRole("tab", { name: "퀴즈 0/5" }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: "퀴즈 0/5" })).toHaveAttribute("aria-selected", "true");
});
