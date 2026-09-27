import { expect, test } from "@playwright/test";

test("공간 안내 링크가 제목과 역할 화면을 한 화면에 보여줌", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1920, height: 910 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "주 메뉴" })
      .getByRole("link", { name: "공간 안내", exact: true })
      .click();
    await expect(page).toHaveURL(/#classrooms$/);
    await expect
      .poll(() =>
        page
          .locator("#classrooms")
          .evaluate((node) => node.getBoundingClientRect().top),
      )
      .toBeLessThanOrEqual(110);
    const header = await page.locator(".landing-header").boundingBox();
    const heading = await page.locator("#classrooms").boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.height + 12);
    for (const role of ["교사 공간", "학생 공간"]) {
      await page.getByRole("button", { name: role, exact: true }).click();
      const surface = await page.locator(".role-surface").boundingBox();
      expect(surface!.y + surface!.height).toBeLessThanOrEqual(
        viewport.height - 12,
      );
    }
    await expect(page.locator(".role-description")).toHaveCSS("opacity", "1");
    if (viewport.width === 1440)
      await page.screenshot({ path: "test-results/home-role-anchor.png" });
  }
});

test("하나의 화면에서 스크롤로 다섯 장면 전환·역방향·건너뛰기", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const story = page.locator(".landing-story");
  await expect(story).toHaveAttribute("data-pinned", "true");
  await expect(page.locator(".lesson-device")).toHaveCount(1);
  const travel = await story.evaluate((node) => {
    const distance =
      node.getBoundingClientRect().height -
      node.querySelector(".story-pin")!.getBoundingClientRect().height;
    window.scrollTo({
      top: scrollY + node.getBoundingClientRect().top - 84 + distance * 0.05,
      behavior: "instant",
    });
    return distance;
  });
  await expect(
    page.getByRole("tab", { name: "이번 수업", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const frame = page.locator(".lesson-device");
  const original = await frame.boundingBox();
  await frame.hover({ position: { x: 35, y: 35 } });
  await expect
    .poll(() =>
      frame.evaluate((node) => node.style.getPropertyValue("--tilt-y")),
    )
    .not.toBe("");
  await page.mouse.move(30, 100);
  await expect
    .poll(() =>
      frame.evaluate((node) => node.style.getPropertyValue("--tilt-y")),
    )
    .toBe("");
  for (const name of ["개념학습", "퀴즈", "실습", "이어하기"]) {
    await page.mouse.wheel(0, travel / 5);
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect
      .poll(async () => Math.abs((await frame.boundingBox())!.y - original!.y))
      .toBeLessThan(2);
  }
  await page.mouse.wheel(0, -travel / 5);
  await expect(
    page.getByRole("tab", { name: "실습", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: "test-results/home-scroll-practice.png" });
  await page.getByRole("link", { name: "공간 안내로 건너뛰기" }).click();
  await expect(
    page.getByRole("button", { name: "교사 공간", exact: true }),
  ).toBeInViewport();
  expect(errors).toEqual([]);
});

test("클릭·방향키로 단계 이동, 퀴즈·비트 상태 유지, 교사 공간", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "퀴즈", exact: true }).click();
  const quiz = page.getByRole("tabpanel", { name: "퀴즈", exact: true });
  await quiz.getByRole("button", { name: "1 2가지", exact: true }).click();
  await expect(quiz.getByRole("status")).toContainText("다시 생각해 볼까요");
  await page.getByRole("tab", { name: "퀴즈", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "실습", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("tabpanel", { name: "실습", exact: true }),
  ).toBeFocused();
  for (const name of ["이어하기", "이번 수업", "개념학습", "퀴즈", "실습"]) {
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("tabpanel", { name, exact: true }),
    ).toBeFocused();
  }
  await page.getByRole("button", { name: "8 비트", exact: true }).click();
  await expect(page.getByRole("status", { name: "10진수 결과" })).toHaveText(
    "13",
  );
  await page.getByRole("tab", { name: "퀴즈", exact: true }).click();
  await expect(
    quiz.getByRole("button", { name: "1 2가지", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await quiz.getByRole("button", { name: "2 4가지", exact: true }).click();
  await expect(quiz.getByRole("status")).toContainText("맞아요");
  await page.getByRole("tab", { name: "개념학습", exact: true }).click();
  await page.getByRole("button", { name: "비트 신호", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "비트 신호", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "교사 공간", exact: true }).click();
  await page.getByRole("button", { name: "2반", exact: true }).click();
  await expect(page.getByText("2반 수업 설정", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "선생님으로 입장" })
    .click();
  await expect(page).toHaveURL(/\/login\/teacher$/);
});

test("320px·짧은 창·움직임 줄이기에서도 모든 장면 사용 가능", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "움직임 줄이기", exact: true })
    .click();
  await expect(page.locator(".landing-story")).toHaveAttribute(
    "data-pinned",
    "false",
  );
  await page.getByRole("tab", { name: "실습", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "8 비트", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".landing-reactive").first()).toHaveCSS(
    "transform",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  // The requested home default is motion on, regardless of the OS preference.
  await expect(page.locator(".landing-story")).toHaveAttribute(
    "data-pinned",
    "true",
  );
  await expect(page.locator(".pixel-float")).toHaveCSS(
    "animation-name",
    "pixel-drift",
  );
  await page
    .getByRole("button", { name: "움직임 줄이기", exact: true })
    .click();
  await expect(page.locator(".landing-story")).toHaveAttribute(
    "data-pinned",
    "false",
  );
  await expect(page.locator(".story-caption")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".pixel-float")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "움직임 켜기", exact: true }).click();
  await expect(page.locator(".landing-story")).toHaveAttribute(
    "data-pinned",
    "true",
  );
  await expect(page.locator(".lesson-scene").first()).toHaveCSS(
    "transition-duration",
    "0.38s, 0.55s, 0s",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator(".landing-story")).toHaveAttribute(
    "data-pinned",
    "true",
  );
  await page.getByRole("tab", { name: "실습", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "스위치 초기화" }),
  ).toBeInViewport();
  for (const size of [
    { width: 320, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 650 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator(".landing-story")).toHaveAttribute(
      "data-pinned",
      "false",
    );
    for (const name of ["이번 수업", "개념학습", "퀴즈", "실습", "이어하기"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        page.getByRole("tabpanel", { name, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "실습", exact: true }).click();
  await page.screenshot({
    path: "test-results/home-interactive-mobile.png",
    fullPage: true,
  });
});

test("첫 화면은 다음 구간 없이 채우고 마지막 화면은 두 역할 입장 제공", async ({
  page,
}) => {
  await page.goto("/");
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 812 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const layout = await page.evaluate(() => ({
      heroBottom: document
        .querySelector(".landing-hero")!
        .getBoundingClientRect().bottom,
      viewport: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(layout.heroBottom).toBeGreaterThanOrEqual(layout.viewport - 1);
    // These standard viewports fit one introductory screen without a dead scroll area.
    expect(layout.heroBottom).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.overflow).toBe(false);
    await expect(
      page.getByRole("link", { name: "수업 방식 보기" }),
    ).toBeInViewport();
    await expect(page.locator(".landing-motion-control")).toBeInViewport();
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({
        path: `test-results/home-hero-${viewport.width}.png`,
      });
    }
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    const finale = page.locator(".landing-finale");
    await expect(finale.getByRole("heading")).toBeInViewport();
    await expect(
      finale.getByRole("link", { name: "학생으로 입장" }),
    ).toBeInViewport();
    await expect(
      finale.getByRole("link", { name: "선생님으로 입장" }),
    ).toBeInViewport();
    await expect(page.getByText(/©.*안동현T/)).toBeInViewport();
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({
        path: `test-results/home-finale-${viewport.width}.png`,
      });
    }
  }
  const finale = page.locator(".landing-finale");
  await finale.getByRole("link", { name: "학생으로 입장" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    finale.getByRole("link", { name: "선생님으로 입장" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login\/teacher$/);
  await page.goto("/");
  await page
    .locator(".landing-finale")
    .getByRole("link", { name: "학생으로 입장" })
    .click();
  await expect(page).toHaveURL(/\/login\/student$/);
});

test("중앙 목차·움직임 툴팁·입장 선택창의 키보드와 좁은 화면", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "주 메뉴" });
  await expect(nav.getByRole("link")).toHaveCount(2);
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await nav.boundingBox();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
  }
  const motion = page.getByRole("button", {
    name: "움직임 줄이기",
    exact: true,
  });
  await motion.hover();
  await expect(page.getByRole("tooltip")).toHaveText("움직임 줄이기");
  await page.mouse.move(10, 120);
  await expect(page.getByRole("tooltip")).toBeHidden();
  await nav.getByRole("link", { name: "공간 안내", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(motion).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText("움직임 줄이기");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await page.keyboard.press("Tab");
  const entry = page.getByRole("button", { name: "교실 입장", exact: true });
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "어떤 공간으로 갈까요?" });
  const student = dialog.getByRole("link", { name: "학생으로 입장" });
  const teacher = dialog.getByRole("link", { name: "선생님으로 입장" });
  await expect(student).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(teacher).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "닫기" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(student).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(entry).toBeFocused();
  await entry.click();
  await page
    .locator('[data-slot="dialog-overlay"]')
    .click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
  await expect(entry).toBeFocused();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 812 });
    await entry.click();
    await expect(student).toBeInViewport();
    await expect(teacher).toBeInViewport();
    await expect(dialog).toHaveCSS("opacity", "1");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/home-entry-${width}.png` });
    await dialog.getByRole("button", { name: "닫기" }).click();
    await expect(entry).toBeFocused();
  }
  await entry.click();
  await teacher.click();
  await expect(page).toHaveURL(/\/login\/teacher$/);
  await page.goto("/");
  await entry.click();
  await student.click();
  await expect(page).toHaveURL(/\/login\/student$/);
  expect(errors).toEqual([]);
});

test("픽셀 캔버스는 포인터·키보드·터치와 움직임 줄이기에서 작동", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  const canvas = page.getByRole("button", { name: /픽셀 모양 바꾸기/ });
  await canvas.hover({ position: { x: 50, y: 50 } });
  await expect
    .poll(() =>
      canvas.evaluate((node) => node.style.getPropertyValue("--pixel-tilt-y")),
    )
    .not.toBe("");
  await canvas.click();
  await expect(canvas).toHaveAccessibleName("픽셀 모양 바꾸기, 현재 반짝임");
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAccessibleName("픽셀 모양 바꾸기, 현재 코드");
  await page
    .getByRole("button", { name: "움직임 줄이기", exact: true })
    .click();
  await canvas.hover();
  await expect
    .poll(() =>
      canvas.evaluate((node) => node.style.getPropertyValue("--pixel-tilt-y")),
    )
    .toBe("");
  await canvas.click();
  await expect(canvas).toHaveAccessibleName("픽셀 모양 바꾸기, 현재 커서");
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const mobile = await touch.newPage();
    await mobile.goto(new URL("/", page.url()).href);
    await mobile.getByRole("button", { name: /픽셀 모양 바꾸기/ }).tap();
    await expect(
      mobile.getByRole("button", { name: /픽셀 모양 바꾸기/ }),
    ).toHaveAccessibleName("픽셀 모양 바꾸기, 현재 반짝임");
    await mobile.getByRole("button", { name: "교실 입장", exact: true }).tap();
    await mobile
      .getByRole("dialog")
      .getByRole("link", { name: "학생으로 입장" })
      .tap();
    await expect(mobile).toHaveURL(/\/login\/student$/);
  } finally {
    await touch.close();
  }
});
