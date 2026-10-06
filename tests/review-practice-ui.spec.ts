import { expect, test } from "@playwright/test";
import { db, readyStudent } from "./emulator";

let originalClass: FirebaseFirestore.DocumentData | undefined;
test.beforeEach(async () => { originalClass = (await db.collection("csClasses").doc("2-1").get()).data(); });
test.afterEach(async () => {
  if (originalClass) await db.collection("csClasses").doc("2-1").set(originalClass);
  for (const id of ["review-sandwich", "review-abstraction", "review-flowchart"]) {
    await db.collection("csWork").doc(`student-20101__${id}`).delete();
  }
});

async function openPractice(page: import("@playwright/test").Page, id: string) {
  await readyStudent(page.request);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id], currentLessonId: null });
  await db.collection("csWork").doc(`student-20101__${id}`).delete();
  await page.goto(`/classroom/${id}`);
  await page.getByRole("tab", { name: /실습/ }).click();
}

test("원작 조리대의 실제 도구·8개 상태와 명령 오류를 보여 준다", async ({ page }) => {
  await openPractice(page, "review-sandwich");
  const stage = page.getByRole("img", { name: /접시에 빵/ });
  await expect(stage).toHaveAttribute("viewBox", "0 40 980 410");
  await expect(stage.locator('[data-part="knife"]')).toBeVisible();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li")).toHaveCount(8);
  await page.getByLabel("자연어 명령").fill("식빵 1의 넓은 면에 잼을 발라");
  await page.getByRole("button", { name: "실행" }).click();
  await expect(page.getByRole("status").filter({ hasText: /접시에 식빵이 없습니다/ }).first()).toBeVisible();
  await expect(stage.locator('[data-part="error"]')).toBeVisible();
  await expect(page.getByRole("list", { name:"누적 알고리즘 파이프라인" }).locator("li").last()).toHaveAttribute("data-active","true");
  expect(await stage.locator('[data-part="knife"]').getAttribute("transform")).toBe("translate(905,290) rotate(-25)");
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어");
  await page.getByRole("button", { name: "실행" }).click();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
  await expect(stage.locator('[data-part="error"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("list", { name: "재료와 조리 상태" }).locator("li").first()).toContainText("열림");
});

test("추상화는 색으로 구분한 핵심·노이즈 작업 영역을 제공한다", async ({ page }) => {
  await openPractice(page, "review-abstraction");
  await page.getByRole("button", { name: "실전 워크북", exact: true }).click();
  await page.getByRole("button", { name: "3. 생각 다이어트", exact: true }).click();
  await expect(page.getByRole("region", { name: "남길 핵심" })).toBeVisible();
  await expect(page.getByRole("region", { name: "버릴 노이즈" })).toBeVisible();
  await page.getByLabel("핵심 요소").fill("현재 시각\n");
  await page.getByRole("textbox", { name: "버릴 노이즈", exact: true }).fill("시계 색상");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("핵심 요소")).toHaveValue("현재 시각\n");
});

test("세 실습의 넓게 보기·복귀 초점·좁은 화면을 유지한다", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const id of ["review-sandwich", "review-abstraction", "review-flowchart"]) {
    await openPractice(page,id);
    const toggle = page.getByRole("button", { name: "작업실 넓게 보기", exact: true });
    const restore = page.getByRole("button", { name: "기본 크기로 돌아가기", exact: true });
    await expect(toggle).toHaveAttribute("aria-pressed","false");
    await toggle.click();
    await expect(restore).toBeFocused();
    await expect(restore).toHaveAttribute("aria-pressed","true");
    await restore.press("Escape"); await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-pressed","false");
    await page.setViewportSize({ width:1440,height:1300 });
    await page.locator('[data-practice]').screenshot({ path:`scratch/review-lessons/${id}-original-ui-desktop.png` });
    for (const width of [821,820,390,320]) {
      await page.setViewportSize({ width,height:844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (id === "review-flowchart") {
        let geometry: unknown;
        try {
          await expect.poll(async () => {
            const node = await page.getByRole("button", { name:"시작·종료 기호: 시작",exact:true }).boundingBox();
            const viewport = await page.getByLabel("실제 순서도 연결", { exact:true }).boundingBox();
            const scroll = await page.getByLabel("실제 순서도 연결", { exact:true }).evaluate(element => ({ left: element.scrollLeft, width: element.clientWidth }));
            geometry = { screenWidth: width, node, viewport, scroll };
            return !!node && !!viewport && node.x >= viewport.x && node.x + node.width <= viewport.x + viewport.width;
          }).toBe(true);
        } catch (error) {
          await testInfo.attach("flowchart-viewport-geometry", { body: JSON.stringify(geometry), contentType: "application/json" });
          throw error;
        }
      }
    }
    await page.setViewportSize({ width:390,height:844 });
    await page.emulateMedia({ reducedMotion:"reduce" });
    await page.locator('[data-practice]').screenshot({ path:`scratch/review-lessons/${id}-original-ui-mobile.png` });
    await page.emulateMedia({ reducedMotion:"no-preference" });
    await page.setViewportSize({ width:1440,height:1000 });
  }
  expect(errors).toEqual([]);
});

test("순서도 보관함에서 선택해 실제 기호 빈칸에 놓고 저장한다", async ({ page }) => {
  await openPractice(page, "review-flowchart");
  const palette = page.getByRole("region", { name: "순서도 기호 보관함" });
  const block = palette.getByRole("button", { name: "물 500ml 냄비에 붓기", exact: true });
  await block.focus(); await page.keyboard.press("Enter");
  const slot = page.getByRole("button", { name: "입출력 기호: 빈 기호", exact: true });
  await slot.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true }).locator("polygon").evaluate(element => getComputedStyle(element).strokeWidth)).toBe("4px");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toBeVisible();
  const source = palette.getByRole("button", { name: "가스레인지 켜서 물 끓이기", exact: true }), target = page.getByRole("button", { name: "처리 기호: 빈 기호", exact: true }).first();
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox(), targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw Error("drag positions unavailable");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2,sourceBox.y + sourceBox.height / 2); await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2,targetBox.y + targetBox.height / 2,{ steps:8 });
  await page.mouse.move(targetBox.x + targetBox.width / 2 + 1,targetBox.y + targetBox.height / 2 + 1); await page.mouse.up();
  await expect(page.getByRole("button", { name:"처리 기호: 가스레인지 켜서 물 끓이기",exact:true })).toBeVisible();
  await palette.getByRole("button", { name: "면과 분말스프 넣고 4분 끓이기", exact: true }).click();
  await page.getByRole("button", { name: "처리 기호: 빈 기호", exact: true }).click();
  await page.getByRole("button", { name: "실행 준비 / 다시 시작", exact: true }).click();
  await expect(page.getByRole("button", { name: "시작·종료 기호: 시작", exact: true })).toHaveAttribute("data-active","true");
  await expect.poll(() => page.getByRole("button", { name:"시작·종료 기호: 시작",exact:true }).locator("ellipse").evaluate(element => getComputedStyle(element).stroke)).toBe("rgb(249, 115, 22)");
  await page.getByRole("button", { name: "한 단계 실행", exact: true }).click();
  await expect(page.getByRole("button", { name: "입출력 기호: 물 500ml 냄비에 붓기", exact: true })).toHaveAttribute("data-active","true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("한 번에 지시한 샌드위치 행동도 조리대에서 차례로 보여 준다", async ({ page }) => {
  await openPractice(page,"review-sandwich");
  await page.getByLabel("자연어 명령").fill("빵 봉지를 열어, 식빵 두 장을 꺼내, 잼 뚜껑을 열어");
  await page.getByRole("button", { name:"실행",exact:true }).click();
  await page.getByRole("region", { name: "알고리즘 실행 기록", exact: true }).getByText("기록 도구", { exact: true }).click();
  await expect(page.getByRole("button", { name:"다시 실행 멈추기",exact:true })).toBeVisible();
  await expect(page.getByRole("button", { name:"명령 다시 실행",exact:true })).toBeVisible();
  await expect(page.getByRole("img", { name:/접시에 빵/ })).toHaveAttribute("aria-label",/접시에 빵 2장/);
});
