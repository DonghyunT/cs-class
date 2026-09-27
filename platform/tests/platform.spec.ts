import { test, expect, type Page } from "@playwright/test";

async function chooseEntry(page: Page, role: "student" | "teacher") {
  await page.getByRole("button", { name: "교실 입장", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", {
      name: role === "student" ? "학생으로 입장" : "선생님으로 입장",
    })
    .click();
}

async function studentLogin(page: Page, id = "20101", password = "class-demo") {
  await chooseEntry(page, "student");
  await page.getByLabel("학번", { exact: true }).fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "내 교실로 입장", exact: true })
    .click();
}
async function changePassword(page: Page) {
  await expect(
    page.getByRole("heading", { name: "나만의 비밀번호 만들기" }),
  ).toBeVisible();
  await page.getByLabel("새 비밀번호", { exact: true }).fill("example-pass");
  await page.getByLabel("새 비밀번호 확인").fill("example-pass");
  await page.getByRole("button", { name: "변경하고 교실로 가기" }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.locator(".dashboard-main")).toBeVisible();
}
async function teacherLogin(page: Page) {
  await chooseEntry(page, "teacher");
  await page.getByRole("button", { name: "Google 로그인 화면 체험" }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await expect(page.locator(".dashboard-main")).toBeVisible();
}
test("공개 홈·모바일·키보드·콘솔", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "정보 수업을 위한온라인 교실",
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "본문으로 바로가기" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await chooseEntry(page, "student");
  await expect(page.getByLabel("학번", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("학생 오류·변경·활동·교사 초기화 후 기록 보존", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await studentLogin(page, "20101", "incorrect");
  await expect(page.locator("#login-error")).toContainText("다시 확인");
  await page.getByLabel("비밀번호", { exact: true }).fill("class-demo");
  await page
    .getByRole("button", { name: "내 교실로 입장", exact: true })
    .click();
  await page.getByLabel("새 비밀번호", { exact: true }).fill("example-pass");
  await page.getByLabel("새 비밀번호 확인").fill("wrong-pass");
  await page.getByRole("button", { name: "변경하고 교실로 가기" }).click();
  await expect(page.locator("#login-error")).toContainText("두 비밀번호");
  await changePassword(page);
  await page.screenshot({
    path: "test-results/student-desktop.png",
    fullPage: true,
  });
  await page.locator('a[href="/classroom/flow"]').first().click();
  await page.getByRole("button", { name: "둘러보기 기록 남기기" }).click();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await teacherLogin(page);
  await page.getByLabel("학번 검색").fill("20101");
  await page.getByRole("button", { name: "20101 비밀번호 초기화" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "20101 비밀번호 초기화" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "20101 비밀번호 초기화" }).click();
  await page.getByRole("button", { name: "초기화하기", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "시안 비밀번호를 초기화",
  );
  await page.getByRole("button", { name: "로그아웃" }).click();
  await studentLogin(page);
  await changePassword(page);
  await expect(
    page.getByText("수업 공간 둘러봄 · 이번 화면 체험"),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/student-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(
    page.getByRole("button", { name: "메뉴 닫기", exact: true }).first(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "교실에 입장해 주세요." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(errors).toEqual([]);
});
test("교사 수업 설정이 11반 학생에게 반영", async ({ page }) => {
  await page.goto("/");
  await teacherLogin(page);
  await expect(page.getByRole("button", { name: /^\d+반$/ })).toHaveCount(11);
  await page.screenshot({
    path: "test-results/teacher-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "11반", exact: true }).click();
  await expect(page.getByText("아직 지정된 수업이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: "수업 관리" }).click();
  await page.getByRole("checkbox", { name: /생각을 잇는 순서도/ }).check();
  await page.getByLabel("이번 수업", { exact: true }).selectOption("flow");
  await page.getByRole("button", { name: "설정 적용" }).click();
  await expect(page.getByRole("status")).toContainText("11반 수업 설정");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await studentLogin(page, "21101");
  await changePassword(page);
  await expect(page.locator(".current-lesson h2")).toHaveText(
    "생각을 잇는 순서도",
  );
  await expect(page.locator(".student-lessons .explore-card")).toHaveCount(1);
});
test("11반 빈 상태 및 강사 반 범위·검색·모바일", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await studentLogin(page, "21101");
  await changePassword(page);
  await expect(page.getByText("다음 수업을 기다리는 중!")).toBeVisible();
  await expect(page.getByText("곧 새로운 수업이 열릴 거야.")).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await chooseEntry(page, "teacher");
  await page.getByLabel("비밀번호", { exact: true }).fill("teacher-demo");
  await page.getByRole("button", { name: "강사님으로 입장" }).click();
  await expect(page.getByRole("button", { name: /^\d+반$/ })).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "10반", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("21001", { exact: true })).toBeVisible();
  await page.getByLabel("학번 검색").fill("20101");
  await expect(page.getByText("일치하는 학번이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: "검색 지우기" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/teacher-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "21001 비밀번호 초기화" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  expect(errors).toEqual([]);
});

test("학생 수업 필터·좁은 화면·메뉴 초점과 크기 변경", async ({ page }) => {
  await page.goto("/");
  await studentLogin(page);
  await changePassword(page);
  await page.getByRole("button", { name: "둘러본 수업", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "아직 둘러본 수업이 없어." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "전체 수업 보기", exact: true })
    .click();
  await expect(page.locator(".student-lessons .explore-card")).toHaveCount(2);
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  const menu = page.getByRole("dialog", { name: "교실 탐색 메뉴" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "CS Class 홈" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    menu.getByRole("link", { name: "공개 홈 둘러보기" }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(menu).toHaveCount(0);
  await expect(page.locator(".app-content")).not.toHaveAttribute("inert", "");
});
