import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { auth, clearLoginLimit, db, headers, localOnly, loginStudent, studentPassword } from "./emulator";

const studentId = "20192", uid = `student-${studentId}`, googleUid = "settings-google-test";
const newPassword = "settings-test-9251", wrongPassword = "settings-wrong-9123";
const profilePath = "**/api/auth/profile";
const ref = db.doc(`csAccounts/${uid}`);
let ownsAccounts = false;

async function removeOwned() {
  for (const user of [uid, googleUid]) {
    await auth.deleteUser(user).catch(error => { if (error.code !== "auth/user-not-found") throw error; });
    await db.doc(`csAccounts/${user}`).delete();
    await db.doc(`csWork/${user}__sequence-lab`).delete();
    await db.doc(`csRateLimits/${createHash("sha256").update(`password-change:${user}`).digest("hex")}`).delete();
    await clearLoginLimit(user);
  }
}
test.beforeAll(async ({ request }) => {
  await localOnly(request);
  for (const user of [uid, googleUid]) {
    expect((await db.doc(`csAccounts/${user}`).get()).exists).toBe(false);
    await auth.getUser(user).then(() => { throw new Error("설정 검사의 합성 계정이 이미 존재합니다."); }, error => { if (error.code !== "auth/user-not-found") throw error; });
  }
  ownsAccounts = true;
});
test.beforeEach(async ({ page }) => {
  await removeOwned();
  await auth.createUser({ uid, email: `s-${studentId}@cs-class.invalid`, password: studentPassword });
  await ref.set({ uid, role: "student", studentId, classId: "2-1", classIds: [], mustChangePassword: false, temporaryPassword: null, disabled: false, authVersion: 0, authBusy: null, session: null });
  expect((await loginStudent(page.request, studentPassword, studentId)).status()).toBe(200);
});
test.afterAll(async () => { if (ownsAccounts) await removeOwned(); });

test("닉네임만 저장·trim·제어문자와 계정 식별정보 변경 거부", async ({ page }) => {
  const before = (await ref.get()).data()!;
  const profile = await page.request.get("/api/auth/profile");
  expect(profile.status()).toBe(200);
  expect((await profile.json()).passwordProvider).toBe("password");
  for (const data of [{ nickname: "가".repeat(21) }, { nickname: "학생\u0000" }, { nickname: "학생\n" }, { nickname: "친구", role: "teacher" }, { nickname: "친구", studentId: "20101" }, { nickname: "친구", uid: "instructor" }, { nickname: "친구", classId: "2-2" }]) expect((await page.request.post("/api/auth/profile", { headers, data })).status()).toBe(400);
  const saved = await page.request.post("/api/auth/profile", { headers, data: { nickname: "  <b>친구</b>  " } });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).session.nickname).toBe("<b>친구</b>");
  expect((await (await page.request.get("/api/auth/session")).json()).session.nickname).toBe("<b>친구</b>");
  const after = (await ref.get()).data()!;
  for (const key of ["uid", "studentId", "classId", "role", "authVersion", "session"]) expect(after[key]).toEqual(before[key]);
  expect((await page.request.post("/api/auth/profile", { headers, data: { nickname: " " } })).status()).toBe(200);
  expect((await ref.get()).data()!.nickname).toBe("");
});

test("현재 비밀번호 오류는 세션을 보존하고 성공은 쿠키만 회전하며 학습 기록 유지", async ({ page, playwright }) => {
  const snapshot = { lessonId: "sequence-lab", marker: "settings-work-preserved" };
  await db.doc(`csWork/${uid}__sequence-lab`).set(snapshot);
  const before = (await ref.get()).data()!;
  const oldCookie = (await page.context().cookies()).find(cookie => cookie.name === "cs_session")!;
  const wrong = await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: wrongPassword, password: newPassword } });
  expect(wrong.status()).toBe(403);
  expect((await wrong.json()).code).toBe("CURRENT_PASSWORD");
  expect((await (await page.request.get("/api/auth/session")).json()).session.uid).toBe(uid);
  expect((await ref.get()).data()!.session).toEqual(before.session);
  expect((await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: studentPassword, password: "short1" } })).status()).toBe(400);
  expect((await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: studentPassword, password: studentPassword } })).status()).toBe(400);
  const changed = await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: studentPassword, password: newPassword } });
  expect(changed.status()).toBe(200);
  expect((await changed.json()).session.uid).toBe(uid);
  const after = (await ref.get()).data()!;
  expect(after.authVersion).toBe(before.authVersion + 1);
  expect(after.authBusy).toBeNull();
  expect(after.session.hash).not.toBe(before.session.hash);
  expect((await db.doc(`csWork/${uid}__sequence-lab`).get()).data()).toEqual(snapshot);
  const stale = await playwright.request.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: { Cookie: `cs_session=${oldCookie.value}` } });
  try { expect((await (await stale.get("/api/auth/session")).json()).reason).toBe("SESSION_REPLACED"); } finally { await stale.dispose(); }
  expect((await loginStudent(page.request, studentPassword, studentId)).status()).toBe(401);
  expect((await loginStudent(page.request, newPassword, studentId)).status()).toBe(200);
});

test("설정의 CSRF·사용자 교체·비활성·idle 만료·계정 잠금 경계", async ({ page, playwright }) => {
  const anonymous = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try { expect((await anonymous.get("/api/auth/profile")).status()).toBe(401); } finally { await anonymous.dispose(); }
  expect((await page.request.post("/api/auth/profile", { headers: { ...headers, Origin: "https://elsewhere.invalid" }, data: { nickname: "거부" } })).status()).toBe(403);
  expect((await page.request.post("/api/auth/profile", { headers: { ...headers, "X-CS-User": "student-20101" }, data: { nickname: "거부" } })).status()).toBe(401);
  expect((await ref.get()).data()!.nickname).toBeUndefined();
  await ref.update({ authBusy: "settings-test-lock" });
  expect((await page.request.get("/api/auth/profile")).status()).toBe(423);
  await ref.update({ authBusy: null, disabled: true });
  expect((await page.request.get("/api/auth/profile")).status()).toBe(401);
  await ref.update({ disabled: false, "session.lastActivityAt": Date.now() - 11 * 60_000 });
  expect((await page.request.post("/api/auth/profile", { headers, data: { nickname: "거부" } })).status()).toBe(401);
});

test("현재 비밀번호 확인 한도를 넘겨도 정상 접속과 기록은 보존", async ({ page }) => {
  const snapshot = { lessonId: "sequence-lab", marker: "settings-rate-limit-preserved" };
  await db.doc(`csWork/${uid}__sequence-lab`).set(snapshot);
  const before = (await ref.get()).data()!;
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: wrongPassword, password: newPassword } });
    expect(response.status()).toBe(403);
    expect((await response.json()).code).toBe("CURRENT_PASSWORD");
  }
  expect((await page.request.post("/api/auth/password-self", { headers, data: { currentPassword: studentPassword, password: newPassword } })).status()).toBe(429);
  const after = (await ref.get()).data()!;
  expect(after.authVersion).toBe(before.authVersion);
  expect(after.session).toEqual(before.session);
  expect(after.authBusy).toBeNull();
  expect((await db.doc(`csWork/${uid}__sequence-lab`).get()).data()).toEqual(snapshot);
  expect((await (await page.request.get("/api/auth/session")).json()).session.uid).toBe(uid);
});

test("닉네임 저장 실패·이동 보호·재시도와 좁은 창", async ({ page }, info) => {
  await page.goto("/student/settings");
  const panel = page.getByRole("region", { name: "닉네임", exact: true });
  const nickname = panel.getByLabel("닉네임", { exact: true });
  await expect(nickname).toBeVisible();
  await nickname.fill("  다정한 친구  ");
  await page.route(profilePath, route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { message: "닉네임 저장 연결 실패" } }) : route.continue());
  const save = panel.getByRole("button", { name: "저장", exact: true });
  await save.click();
  await expect(panel.getByRole("alert")).toContainText("닉네임 저장 연결 실패");
  await expect(nickname).toHaveValue("  다정한 친구  ");
  await page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/settings$/);
  await expect(page.getByRole("alert").filter({ hasText: "저장하거나" })).toBeVisible();
  await page.unroute(profilePath);
  await save.click();
  await expect(panel.getByRole("status")).toContainText("저장했어요");
  await expect(nickname).toHaveValue("다정한 친구");
  for (const width of [1440, 390, 320]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.screenshot({ path: info.outputPath("student-settings-320.png"), fullPage: true });
  await page.goto("/student/settings");
  await expect(nickname).toHaveValue("다정한 친구");
});

test("자동 입력된 현재 비밀번호는 닉네임 저장과 이동을 막지 않음", async ({ page }) => {
  await page.goto("/student/settings");
  const current = page.getByRole("region", { name: "비밀번호", exact: true }).getByLabel("현재 비밀번호", { exact: true });
  await current.fill(studentPassword);
  const panel = page.getByRole("region", { name: "닉네임", exact: true });
  await panel.getByLabel("닉네임", { exact: true }).fill("자동입력 친구");
  // 저장 뒤 세션 재확인이 느려도 이동은 막지 않아야 해요.
  let release!: () => void;
  const sessionHeld = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/session", async route => { await sessionHeld; await route.continue().catch(() => undefined); });
  await panel.getByRole("button", { name: "저장", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("저장했어요");
  await page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/, { timeout: 15_000 });
  release(); await page.unroute("**/api/auth/session");
  expect((await ref.get()).data()!.nickname).toBe("자동입력 친구");
});

test("비밀번호 변경 뒤 세션을 다시 읽는 동안 입력은 잠그고 이동은 허용", async ({ page }) => {
  await page.goto("/student/settings");
  const panel = page.getByRole("region", { name: "비밀번호", exact: true });
  await panel.getByLabel("현재 비밀번호", { exact: true }).fill(studentPassword);
  await panel.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await panel.getByLabel("새 비밀번호 확인", { exact: true }).fill(newPassword);
  let release!: () => void;
  const sessionHeld = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/session", async route => { await sessionHeld; await route.continue().catch(() => undefined); });
  await panel.getByRole("button", { name: "변경", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("변경했어요");
  // 다른 변경이 세션 쿠키를 또 바꾸지 않도록 재확인이 끝날 때까지 잠가 둬요.
  await expect(panel.getByRole("button", { name: "변경 중", exact: true })).toBeVisible();
  await expect(panel.getByLabel("새 비밀번호", { exact: true })).toHaveAttribute("readonly", "");
  await page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/, { timeout: 15_000 });
  release(); await page.unroute("**/api/auth/session");
});

test("새 비밀번호를 입력하던 중에는 이동을 막음", async ({ page }) => {
  await page.goto("/student/settings");
  await page.getByRole("region", { name: "비밀번호", exact: true }).getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await page.getByRole("navigation", { name: "교실 메뉴", exact: true }).getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/settings$/);
  await expect(page.getByRole("alert").filter({ hasText: "저장하거나" })).toBeVisible();
});

test("비밀번호 오류 입력 보존·변경 성공 후 입력 비우기와 접속 유지", async ({ page }) => {
  await page.goto("/student/settings");
  const panel = page.getByRole("region", { name: "비밀번호", exact: true });
  await panel.getByLabel("현재 비밀번호", { exact: true }).fill(wrongPassword);
  await panel.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await panel.getByLabel("새 비밀번호 확인", { exact: true }).fill(newPassword);
  await panel.getByRole("button", { name: "변경", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("현재 비밀번호");
  await expect(panel.getByLabel("현재 비밀번호", { exact: true })).toHaveValue(wrongPassword);
  for (const label of ["새 비밀번호", "새 비밀번호 확인"]) await expect(panel.getByLabel(label, { exact: true })).toHaveValue(newPassword);
  await expect(page).toHaveURL(/\/student\/settings$/);
  await panel.getByLabel("현재 비밀번호", { exact: true }).fill(studentPassword);
  await page.route("**/api/auth/password-self", route => route.fulfill({ status: 503, json: { message: "비밀번호 변경 연결 실패" } }));
  await panel.getByRole("button", { name: "변경", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("비밀번호 변경 연결 실패");
  await expect(panel.getByLabel("현재 비밀번호", { exact: true })).toHaveValue(studentPassword);
  for (const label of ["새 비밀번호", "새 비밀번호 확인"]) await expect(panel.getByLabel(label, { exact: true })).toHaveValue(newPassword);
  await page.unroute("**/api/auth/password-self");
  await panel.getByRole("button", { name: "변경", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("변경했어요");
  for (const label of ["현재 비밀번호", "새 비밀번호", "새 비밀번호 확인"]) await expect(panel.getByLabel(label, { exact: true })).toHaveValue("");
  expect((await (await page.request.get("/api/auth/session")).json()).session.uid).toBe(uid);
});

test("Google 교사 설정은 Google 관리를 안내하며 앱에서 비밀번호 변경을 거부", async ({ browser }) => {
  await auth.createUser({ uid: googleUid, email: "settings-google@cs-class.invalid" });
  await auth.updateUser(googleUid, { providerToLink: { uid: googleUid, providerId: "google.com", email: "settings-google@cs-class.invalid" } });
  const secret = randomBytes(32).toString("hex");
  await db.doc(`csAccounts/${googleUid}`).set({ uid: googleUid, role: "teacher", studentId: null, classId: null, classIds: [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: { hash: createHash("sha256").update(secret).digest("hex"), lastActivityAt: Date.now(), startedAt: Date.now() } });
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await context.addCookies([{ name: "cs_session", value: `${googleUid}.${secret}`, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage();
    const profile = await context.request.get("/api/auth/profile");
    expect(profile.status()).toBe(200); expect((await profile.json()).passwordProvider).toBe("google");
    await page.goto("/teacher/settings");
    const password = page.getByRole("region", { name: "비밀번호", exact: true });
    await expect(password).toContainText("Google 계정에서 관리");
    await expect(page.getByLabel("현재 비밀번호", { exact: true })).toHaveCount(0);
    const response = await context.request.post("/api/auth/password-self", { headers, data: { currentPassword: wrongPassword, password: newPassword } });
    expect(response.status()).toBe(403); expect((await response.json()).code).toBe("PASSWORD_PROVIDER");
    expect((await db.doc(`csAccounts/${googleUid}`).get()).data()!.authVersion).toBe(0);
  } finally { await context.close(); }
});
