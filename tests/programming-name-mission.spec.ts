import { expect, test, type Page } from "@playwright/test";
import type { DocumentData } from "firebase-admin/firestore";
import { buildProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";
import type { Work } from "../src/lib/classroom/types";
import { db, entryReset, entryStart, entryStop, headers, readyStudent } from "./emulator";

// The rest runs on the real lesson (formerly checked on the removed public prototype).
test.describe("정식 수업 programming-13", () => {
  const id = "programming-13", endpoint = `/api/classroom/work/${id}`;
  const workRef = db.doc(`csWork/student-20101__${id}`), classRef = db.doc("csClasses/2-1");
  const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
  const nameProject = buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "강아지 이름은?"), null), node("dialog_time", node("get_canvas_input_value", null), node("number", "0.2"), "speak", null)]]);
  const stored = async (page: Page): Promise<Work> => (await page.request.get(endpoint)).json();
  let originalClass: DocumentData | undefined;

  test.beforeEach(async ({ page }) => {
    originalClass = (await classRef.get()).data();
    await readyStudent(page.request);
    await workRef.delete();
    await classRef.update({ currentLessonId: id, openedLessonIds: [id] });
  });
  test.afterEach(async ({ page }) => {
    await page.goto("about:blank");
    await workRef.delete();
    if (originalClass) await classRef.set(originalClass);
  });

  async function enter(page: Page, project = nameProject) {
    const before = await stored(page);
    expect((await page.request.post(endpoint, { headers, data: { revision: before.revision, draft: { ...before.draft, stage: "practice", programming: { mission: "name", projects: { name: project }, reflection: "" } } } })).status()).toBe(200);
    await page.goto(`/classroom/${id}?from=dashboard`);
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
    return page.frameLocator("iframe");
  }
  async function respond(page: Page, name: string) {
    await entryStart(page).click();
    const input = page.frameLocator("iframe").getByLabel("강아지 이름 대답");
    await input.fill(name); await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: `마지막 말: ${name}` })).toBeVisible({ timeout: 10000 });
  }

  test("질문을 기다리는 시간은 15초 실행 제한에 넣지 않고 정지 뒤 다시 대답한다", async ({ page }) => {
    test.setTimeout(60000);
    const frame = await enter(page);
    await entryStart(page).click();
    await expect(frame.getByLabel("강아지 이름 대답")).toBeVisible();
    await page.waitForTimeout(16000);
    await expect(entryStop(page)).toBeEnabled();
    await expect(page.getByText("15초가 지나 실행을 멈췄어요.", { exact: false })).toHaveCount(0);
    await entryStop(page).click();
    await expect(page.getByRole("status").filter({ hasText: /^실행을 멈췄어요\./ })).toBeVisible();
    await respond(page, "두부");
  });

  test("실행하지 않아도 조건 검증으로 채점하고, 대답 대신 인사를 말하는 작품은 통과하지 않는다", async ({ page }) => {
    test.setTimeout(60000);
    // The dog greets instead of saying the answer.
    await enter(page, buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "강아지 이름은?"), null), node("dialog", node("text", "안녕"), "speak", null)]]));
    await page.getByRole("button", { name: "조건 검증", exact: true }).click();
    await expect(page.locator("#practice-feedback")).toHaveText("질문 다음에 말하기를 연결하고, 말하기 안에 ‘대답’을 넣어 보세요.");
    await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toBeDisabled();
  });

  test("초가 없는 ‘말하기’와 기다리기로 만든 이름 작품도 실행 없이 바로 검증을 통과한다", async ({ page }) => {
    test.setTimeout(60000);
    await enter(page, buildProgrammingProject([[node("when_run_button_click", null), node("ask_and_wait", node("text", "강아지 이름은?"), null), node("wait_second", node("number", "0.2"), null), node("dialog", node("get_canvas_input_value", null), "speak", null)]]));
    await page.getByRole("button", { name: "조건 검증", exact: true }).click();
    await expect(page.locator("#practice-feedback")).toContainText("목표 조건을 확인했어요");
    await expect(page.getByRole("button", { name: "작품 제출", exact: true })).toBeEnabled();
    await expect(page.getByText(/서로 다른 이름 확인|0\/2/)).toHaveCount(0);
  });

  test("작품 export 실패는 단계·미션 이동과 수업 나가기를 막고 작업실 입력을 유지한다", async ({ page }) => {
    test.setTimeout(60000);
    await page.addInitScript(() => window.addEventListener("message", (event) => {
      if (document.documentElement.dataset.blockExport === "true" && event.data?.type === "exported") event.stopImmediatePropagation();
    }, { capture: true }));
    const frame = await enter(page);
    await frame.locator("#entryWorkspaceBoard").getByText("강아지 이름은?", { exact: true }).locator("..").click();
    await frame.locator("input.entry-widget-input-field:visible").fill("보존할 질문");
    await page.evaluate(() => { document.documentElement.dataset.blockExport = "true"; });
    const nextMission = page.getByRole("navigation", { name: "실습 미션" }).getByRole("button", { name: /곱셈 계산기/ });
    for (const target of [page.getByRole("tab", { name: /퀴즈/ }), nextMission, page.getByRole("link", { name: "수업 나가기", exact: true })]) {
      await target.click();
      // Each move waits for the editor export; the mission buttons stay disabled until it gives up.
      await expect(nextMission).toBeDisabled();
      await expect(nextMission).toBeEnabled({ timeout: 10000 });
      await expect(page.locator("#work-save-error")).toContainText("작품을 확인하지 못했어요");
      await expect(page).toHaveURL(new RegExp(`/classroom/${id}`));
      await expect(page.getByRole("tab", { name: /실습/ })).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#programming-mission-title")).toHaveText("강아지 이름 짓기");
      await expect(frame.locator("#entryWorkspaceBoard").getByText("보존할 질문", { exact: true })).toBeVisible();
    }
  });

  test("저장 중 늦게 도착한 작품 export는 그사이 쓴 발견 기록을 덮어쓰지 않는다", async ({ page }) => {
    await page.addInitScript(() => window.addEventListener("message", (event) => {
      if (document.documentElement.dataset.delayExport !== "true" || event.data?.type !== "exported" || event.data?.delayed) return;
      event.stopImmediatePropagation();
      setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: { ...event.data, delayed: true }, origin: event.origin, source: event.source })), 1500);
    }, { capture: true }));
    await enter(page);
    await page.evaluate(() => { document.documentElement.dataset.delayExport = "true"; });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    const reflection = page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?");
    await reflection.fill("저장 중에도 남긴 발견");
    await expect.poll(async () => (await stored(page)).draft.programming?.reflection).toBe("저장 중에도 남긴 발견");
    await expect(reflection).toHaveValue("저장 중에도 남긴 발견");
  });

  test("programming-readability: 서로 다른 체험의 실행 결과가 개념 왕복에서 섞이지 않는다", async ({ page }) => {
    await page.goto(`/classroom/${id}`);
    const reset = page.getByRole("group", { name: /개념 체험$/ }).getByRole("button", { name: "체험 초기화", exact: true });
    await page.getByRole("navigation", { name: "개념 목록", exact: true }).getByRole("button", { name: /컴퓨터에게 전하는 말/ }).click();
    await page.getByRole("button", { name: "이 명령 실행하기" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^안녕!$/ })).toBeVisible();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(page.getByText("말풍선이 기다리고 있어요", { exact: true })).toBeVisible();
    await page.getByLabel("강아지 이름", { exact: true }).fill("보리");
    await page.getByRole("button", { name: "인사말 만들어 보기" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^내 이름은 보리!$/ })).toBeVisible();
    await page.getByRole("button", { name: "이전 개념", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^안녕!$/ })).toBeVisible();
    await reset.click();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(page.getByLabel("강아지 이름", { exact: true })).toHaveValue("보리");
    await expect(page.getByRole("status").filter({ hasText: /^내 이름은 보리!$/ })).toBeVisible();
  });

  test("programming-readability: 관찰하며 체험을 초기화해도 답안과 완료는 유지", async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`/classroom/${id}`);
    const experiment = page.getByRole("group", { name: /개념 체험$/ });
    const observation = page.locator("#programming-observation");
    const reset = experiment.getByRole("button", { name: "체험 초기화", exact: true });
    await expect(page.locator("#concept-title")).toHaveText("프로그래밍이란?");
    await expect(observation).toBeVisible();
    await expect(experiment.getByRole("definition")).toHaveCount(3);
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/블록.*텍스트.*결과/);
    await expect(experiment.getByRole("definition")).toHaveCount(0);
    await page.getByRole("button", { name: "텍스트", exact: true }).click();
    await page.getByRole("button", { name: "이 명령 실행하기" }).click();
    await expect(experiment.getByText("안녕!", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true }).check();
    await page.getByRole("button", { name: "정답 확인" }).click();
    await expect(page.getByRole("button", { name: "개념 확인 완료" })).toBeDisabled();
    await reset.click();
    await expect(page.getByRole("button", { name: "블록", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(experiment.getByText("어떤 명령을 줄까?", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "컴퓨터가 할 일을 명령으로 표현해요", exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "개념 확인 완료" })).toBeDisabled();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/이름.*인사말/);
    await page.getByLabel("강아지 이름", { exact: true }).fill("보리");
    await page.getByRole("button", { name: "인사말 만들어 보기" }).click();
    await expect(experiment.getByText("내 이름은 보리!", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "출력", exact: true }).check();
    await reset.click();
    await expect(page.getByLabel("강아지 이름", { exact: true })).toHaveValue("초코");
    await expect(experiment.getByText("말풍선이 기다리고 있어요", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "출력", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/A.*B.*계산 결과/);
    await page.getByLabel("변수 A", { exact: true }).fill("-2");
    await page.getByLabel("변수 B", { exact: true }).fill("3");
    await expect(experiment.getByText("-6", { exact: true })).toBeVisible();
    await reset.click();
    await expect(page.getByLabel("변수 A", { exact: true })).toHaveValue("6");
    await expect(page.getByLabel("변수 B", { exact: true })).toHaveValue("4");
    await expect(experiment.getByText("24", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "다음 개념", exact: true }).click();
    await expect(experiment).toHaveAccessibleDescription(/방향키.*좌표/);
    const stage = page.getByRole("group", { name: "방향키 실험 무대" });
    await stage.focus(); await stage.press("ArrowRight");
    await expect(stage).toContainText("x 10 · y 0");
    await reset.click();
    await expect(stage).toContainText("x 0 · y 0");
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(await observation.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(width > 600 ? 18 : 16);
      expect(await stage.locator("span").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      await page.screenshot({ path: info.outputPath(`programming-concept-${width}.png`), fullPage: true });
    }
    expect((await stored(page)).conceptSolved).toEqual(["pc0"]);
    expect(errors).toEqual([]);
  });
});
