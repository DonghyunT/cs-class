import { expect, test, type Page } from "@playwright/test";
import { db, headers, initialPassword, loginStudent, resetStudent, studentPassword } from "./emulator";
import type { Work } from "../src/lib/classroom/types";

// 화면을 검토하는 20102 계정과 분리한 로컬 합성 계정이다.
const studentId = "21001", classId = "2-10", endpoint = "/api/classroom/work/review-sandwich";
const workRef = db.collection("csWork").doc(`student-${studentId}__review-sandwich`);
let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async ({ page }) => {
  originalClass = (await db.collection("csClasses").doc(classId).get()).data();
  await resetStudent(page.request, studentId);
  expect((await loginStudent(page.request, initialPassword, studentId)).status()).toBe(200);
  expect((await page.request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
  await db.collection("csClasses").doc(classId).update({ openedLessonIds: ["review-sandwich"], currentLessonId: "review-sandwich" });
  await workRef.delete();
  await page.goto("/classroom/review-sandwich");
  await page.getByRole("tab", { name: /실습/ }).click();
});
test.afterEach(async () => {
  if (originalClass) await db.collection("csClasses").doc(classId).set(originalClass);
  await workRef.delete();
});

async function execute(page: Page, input: string) {
  await page.getByLabel("자연어 명령").fill(input);
  await page.getByRole("button", { name: "규칙 해석으로 실행", exact: true }).click();
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText(input);
  await expect(page.getByRole("button", { name: "명령 다시 실행", exact: true })).toBeEnabled();
}

test("큰 화면의 재료 크기와 주방·대화 배치", async ({ page }, testInfo) => {
  const consolePanel = page.getByRole("region", { name: "로봇에게 명령하기" });
  const kitchen = page.getByRole("region", { name: "샌드위치 로봇의 주방" });
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1854, height: 717 }]) {
    await page.setViewportSize(viewport);
    await kitchen.scrollIntoViewIfNeeded();
    const [left, right, counter] = await Promise.all([kitchen, consolePanel, kitchen.locator('svg > rect').first()].map(item => item.boundingBox()));
    expect(counter!.width).toBeGreaterThan(900);
    expect(right!.width).toBeGreaterThan(500);
    expect(left!.width / right!.width).toBeGreaterThan(1.8);
    expect(left!.width / right!.width).toBeLessThan(2.2);
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(2);
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
    const executeBounds = await page.getByRole("button", { name: "AI로 명령 실행", exact: true }).boundingBox();
    expect(executeBounds!.y + executeBounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: testInfo.outputPath(`practice-${viewport.width}.png`) });
  }
  await execute(page, "식빵 두 장을 꺼내");
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await expect.poll(async () => {
    const work: Work = await (await page.request.get(endpoint)).json();
    return work.draft.reviewProject?.type === "sandwich" ? work.draft.reviewProject.input : "";
  }).toBe("빵 봉지를 열어");
  await expect(page.getByRole("button", { name: "AI로 명령 실행", exact: true })).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
  await page.screenshot({ path: testInfo.outputPath("practice-conversation-1854.png") });
});

test("명령과 로봇 응답이 시간순으로 이어지고 읽던 위치·초안을 유지", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await execute(page, "식빵 두 장을 꺼내");
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText("빵 봉지가 닫혀");
  await execute(page, "빵 봉지를 열어");
  const stage = page.getByRole("img", { name: /접시에 빵/ });
  const [stageBounds, clipBounds] = await Promise.all([stage.boundingBox(), stage.locator('[data-part="bag-clip"]').boundingBox()]);
  expect(clipBounds!.y).toBeGreaterThanOrEqual(stageBounds!.y);
  const feed = page.getByRole("region", { name: "로봇과의 대화", exact: true });
  const turns = feed.locator('[data-command-id]');
  await expect(turns).toHaveCount(2);
  await expect(turns.first()).toContainText("식빵 두 장을 꺼내");
  await expect(turns.last()).toContainText("빵 봉지를 열어");
  const input = page.getByLabel("자연어 명령");
  const [feedBounds, inputBounds] = await Promise.all([feed.boundingBox(), input.boundingBox()]);
  expect(inputBounds!.y).toBeGreaterThan(feedBounds!.y + feedBounds!.height);

  // 서버가 서명한 실제 명령으로 충분한 기록을 만든 뒤 복원한다.
  for (let index = 0; index < 8; index++) {
    const work: Work = await (await page.request.get(endpoint)).json();
    expect((await page.request.post("/api/classroom/ai", { headers, data: { lessonId: "review-sandwich", revision: work.revision, task: "sandwich-rules", input: "빵 봉지를 열어", requestId: crypto.randomUUID() } })).status()).toBe(200);
  }
  await page.reload();
  await expect(turns).toHaveCount(10);
  expect((await page.getByRole("region", { name: "로봇에게 명령하기" }).boundingBox())!.height).toBeLessThan(900);
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  await feed.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => feed.evaluate(element => element.scrollTop)).toBe(0);
  await input.fill("다음에 실행할 명령");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/ai", async route => { await gate; await route.fulfill({ status: 503, json: { message: "합성 연결 실패: 입력을 유지해요.", code: "UNAVAILABLE" } }); });
  await page.getByRole("button", { name: "AI로 명령 실행", exact: true }).click();
  await expect(feed.getByRole("status")).toContainText("해석하고 있어요");
  await expect(feed).toContainText("다음에 실행할 명령");
  await input.fill("작성 중인 다음 명령");
  release();
  await expect(feed.getByRole("alert")).toContainText("합성 연결 실패");
  expect(await feed.evaluate(element => element.scrollTop)).toBeLessThan(5);
  await expect(input).toHaveValue("작성 중인 다음 명령");
  await input.focus();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await feed.focus();
  await page.keyboard.press("End");
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  await page.unroute("**/api/classroom/ai");
  await execute(page, "식빵 두 장을 꺼내");
  await expect(feed).toContainText("합성 연결 실패: 입력을 유지해요.");
  await expect(feed).toContainText("다음에 실행할 명령");
  await expect.poll(() => feed.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(5);
  const commandCount = await turns.count();
  await input.fill("알아서 샌드위치를 만들어");
  await page.getByRole("button", { name: "규칙 해석으로 실행", exact: true }).click();
  await expect(page.getByRole("region", { name: "최신 명령 결과" })).toContainText("'알아서'라는 명령을 이해할 수 없습니다");
  await expect(turns).toHaveCount(commandCount);
  await execute(page, "빵 봉지를 열어");
  await expect(feed).toContainText("'알아서'라는 명령을 이해할 수 없습니다");
  await expect(feed).toContainText("알아서 샌드위치를 만들어");
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[aria-label="샌드위치 로봇의 주방"]')!.getBoundingClientRect().top + scrollY - 90));
  await page.screenshot({ path: testInfo.outputPath("conversation.png") });
  await page.getByRole("button", { name: "새 레시피 만들기", exact: true }).click();
  await expect(turns).toHaveCount(0);
  await expect(feed).not.toContainText("합성 연결 실패");
  await expect(feed).not.toContainText("알아서 샌드위치를 만들어");
  await expect(input).toHaveValue("");
  await expect.poll(async () => {
    const work: Work = await (await page.request.get(endpoint)).json();
    return work.draft.reviewProject?.type === "sandwich" ? work.draft.reviewProject.commands.length : -1;
  }).toBe(0);
});
