import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, headers, initialPassword, loginStudent, readyStudent, readyTeacher, resetStudent, studentPassword, localOnly, lessonId } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";
import { seoulToday } from "../src/lib/classroom/planner";
import type { SavedList, Todo, ClassEvent } from "../src/lib/classroom/planner";

const todosPath = "/api/classroom/todos";
const schedulePath = "/api/classroom/schedule/2-1";
const todo = (text: string): Todo => ({ id: randomUUID(), text, completed: false });
const event = (title: string, date = seoulToday()): ClassEvent => ({ id: randomUUID(), title, date, lessonId });
const todos = (page: Page) => page.getByRole("region", { name: "내 할 일", exact: true });
async function readTodos(request: APIRequestContext): Promise<SavedList<Todo>> { return (await request.get(todosPath)).json(); }
async function add(page: Page, text: string) { await page.getByLabel("할 일 추가", { exact: true }).fill(text); await page.getByLabel("할 일 추가", { exact: true }).press("Enter"); }
async function saved(page: Page) { await expect(todos(page).getByText("저장 완료", { exact: true })).toBeVisible(); }
async function student(request: APIRequestContext, id: string) {
  await resetStudent(request, id);
  expect((await loginStudent(request, initialPassword, id)).status()).toBe(200);
  expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
}
test.beforeEach(async ({ request }) => {
  await localOnly(request);
  await db.collection("csTodos").doc("student-20101").delete();
  await db.collection("csSchedules").doc("2-1").delete();
  await db.collection("csSchedules").doc("2-10").delete();
});

test("파일럿 API: 본인 목록·반 권한·직접 DB 차단·검증·동시 수정·재시도", async ({ request, playwright }) => {
  await readyStudent(request);
  const item = todo("개인 기록");
  const first = await request.post(todosPath, { headers, data: { revision: 0, items: [item] } });
  expect(first.status()).toBe(200);
  expect((await first.json()).revision).toBe(1);
  expect((await request.post(todosPath, { headers, data: { revision: 0, items: [item] } })).status()).toBe(200);
  expect((await readTodos(request)).revision).toBe(1);
  expect((await request.post(todosPath, { headers, data: { uid: "instructor", revision: 1, items: [item] } })).status()).toBe(400);
  expect((await request.post(todosPath, { headers, data: { revision: 1, items: [item, item] } })).status()).toBe(400);
  expect((await request.post(todosPath, { headers, data: { revision: 1, items: [{ ...item, text: "  " }] } })).status()).toBe(400);
  const changed = { ...item, text: "내 기록 수정" };
  const other = todo("다른 탭");
  const simultaneous = await Promise.all([request.post(todosPath, { headers, data: { revision: 1, items: [changed] } }), request.post(todosPath, { headers, data: { revision: 1, items: [item, other] } })]);
  expect(simultaneous.map((response) => response.status()).sort()).toEqual([200, 409]);
  const separate = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await db.collection("csTodos").doc("student-20102").delete();
    await student(separate, "20102");
    expect((await (await separate.get(`${todosPath}?uid=student-20101`)).json()).items).toEqual([]);
    expect((await separate.get(`${todosPath}/student-20101`)).status()).toBe(404);
    await readyTeacher(separate);
    const staff = (await (await separate.get("/api/auth/session")).json()).session;
    await db.collection("csTodos").doc(staff.uid).delete();
    expect((await separate.get(`${todosPath}?uid=student-20101`)).status()).toBe(200);
    expect((await readTodos(separate)).items).toEqual([]);
    const appointment = event("작품 제출 안내", "2026-01-01");
    expect((await separate.post(schedulePath, { headers, data: { revision: 0, items: [appointment] } })).status()).toBe(200);
    expect((await request.get("/api/classroom/schedule?classId=2-1")).status()).toBe(200);
    expect((await request.get("/api/classroom/schedule?classId=2-10")).status()).toBe(403);
    expect((await request.post(schedulePath, { headers, data: { revision: 1, items: [] } })).status()).toBe(403);
    expect((await request.get(`/api/classroom/work/${lessonId}`)).status()).toBe(200);
    expect((await separate.post(schedulePath, { headers, data: { revision: 1, items: [{ ...appointment, date: "2026-02-30" }] } })).status()).toBe(400);
    expect((await separate.post(schedulePath, { headers, data: { revision: 1, items: [{ ...appointment, lessonId: "entry-bot-lab" }] } })).status()).toBe(400);
    expect((await separate.post("/api/auth/login", { headers, data: { role: "instructor", studentId: "", password: testEnv.CS_TEST_INSTRUCTOR_PASSWORD } })).status()).toBe(200);
    expect((await separate.get("/api/classroom/schedule?classId=2-1")).status()).toBe(403);
    expect((await separate.post(schedulePath, { headers, data: { revision: 1, items: [] } })).status()).toBe(403);
    expect((await separate.post("/api/classroom/schedule/2-10", { headers, data: { revision: 0, items: [event("강사 담당 반", seoulToday())].map((value) => ({ ...value, lessonId: null })) } })).status()).toBe(200);
    const signIn = await request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only", { data: { email: "s-20101@cs-class.invalid", password: studentPassword, returnSecureToken: true } });
    const token = (await signIn.json()).idToken;
    for (const target of ["csTodos/student-20101", "csSchedules/2-1"]) {
      expect((await request.get(`http://127.0.0.1:8080/v1/projects/demo-cs-class/databases/(default)/documents/${target}`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
    }
    const revision = (await readTodos(request)).revision;
    const account = db.collection("csAccounts").doc("student-20101");
    await account.update({ "session.lastActivityAt": Date.now() - 11 * 60_000 });
    expect((await request.post(todosPath, { headers, data: { revision, items: [] } })).status()).toBe(401);
    expect((await db.collection("csTodos").doc("student-20101").get()).data()!.revision).toBe(revision);
  } finally { await separate.dispose(); }
});

for (const role of ["student", "teacher"] as const) {
  test(`내 할 일 낙관적 UI ${role}: 지연 중 다른 행 조작·삭제 복원·재시도`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("503")) errors.push(message.text()); });
    let uid: string;
    if (role === "student") { await readyStudent(page.request); uid = "student-20101"; }
    else uid = (await readyTeacher(page.request)).uid;
    const first = todo("먼저 완료할 일"), deleted = todo("곧 삭제할 일"), edited = todo("계속 수정할 일");
    await db.collection("csTodos").doc(uid).set({ revision: 0, items: [first, deleted, edited] });
    await page.goto(`/${role}`);
    await expect(todos(page).getByRole("checkbox")).toHaveCount(3);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let failed = false;
    await page.route(`**${todosPath}`, async (route) => {
      if (route.request().method() === "POST" && !failed) {
        await pending; failed = true;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "저장 연결을 확인해 주세요." }) });
      } else await route.continue();
    });
    try {
      const checkbox = todos(page).getByRole("checkbox", { name: "먼저 완료할 일 완료", exact: true });
      await checkbox.focus(); await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeFocused();
      await expect(todos(page).getByText(first.text, { exact: true })).toHaveCSS("text-decoration-line", "line-through");
      await expect(todos(page).getByRole("button", { name: `${first.text} 삭제`, exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "할 일 새로고침" })).toBeDisabled();
      await todos(page).getByRole("button", { name: `${deleted.text} 삭제`, exact: true }).click();
      await expect(todos(page).getByText(deleted.text, { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("할 일 추가", { exact: true })).toBeFocused();
      await todos(page).getByRole("button", { name: `${edited.text} 수정`, exact: true }).click();
      await page.getByLabel("할 일 수정", { exact: true }).fill("저장 중에도 수정한 일");
      await page.getByLabel("할 일 수정", { exact: true }).press("Enter");
      await add(page, "저장 중에도 추가한 일");
      await expect(todos(page).getByText("저장 중에도 추가한 일", { exact: true })).toBeVisible();
      expect((await readTodos(page.request)).items).toEqual([first, deleted, edited]);
      await expect(todos(page).getByText("저장 완료", { exact: true })).toHaveCount(0);
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      if (role === "student") await page.screenshot({ path: testInfo.outputPath("todo-optimistic.png"), fullPage: true });
      release();
      await expect(todos(page).getByRole("alert")).toContainText("저장 연결");
      await expect(todos(page).locator("[data-todo-id]").nth(1)).toContainText(deleted.text);
      await expect(todos(page).getByRole("checkbox", { name: "먼저 완료할 일 완료", exact: true })).toBeChecked();
      await page.getByRole("link", { name: "CS Class 홈", exact: true }).click();
      await expect(page).toHaveURL(`http://localhost:3000/${role}`);
      await todos(page).getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click();
      await saved(page);
      const stored = await readTodos(page.request);
      expect(stored.items.map((item) => item.text)).toEqual([first.text, "저장 중에도 수정한 일", "저장 중에도 추가한 일"]);
      expect(stored.items[0].completed).toBe(true);
      await page.reload();
      await expect(todos(page).getByRole("checkbox")).toHaveCount(3);
      await expect(todos(page).getByText(deleted.text, { exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test("내 할 일: 빠른 Enter·IME·인라인 수정·Space·삭제·재로그인 복원", async ({ page }) => {
  await readyStudent(page.request);
  await page.goto("/student");
  await expect(todos(page).getByText(/아직 내 할 일이 없어요/)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  await page.route(`**${todosPath}`, async (route) => { if (route.request().method() === "POST" && ++calls === 1) await gate; await route.continue(); });
  try {
    await add(page, "궁금한 점 정리하기");
    await add(page, "블록 실행 결과 메모하기");
    const input = page.getByLabel("할 일 추가", { exact: true });
    await input.fill("다음 입력 보존");
    await input.press("Tab");
    await expect(todos(page).getByRole("button", { name: "추가", exact: true })).toBeFocused();
    release(); await saved(page);
    await expect(input).toHaveValue("다음 입력 보존");
    await expect(todos(page).getByRole("button", { name: "추가", exact: true })).toBeFocused();
    await input.fill("한국어 조합");
    await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", keyCode: 229, isComposing: true, bubbles: true });
    expect((await readTodos(page.request)).items).toHaveLength(2);
    await input.press("Enter"); await saved(page);
    await input.press("Enter");
    expect((await readTodos(page.request)).items).toHaveLength(3);
    await todos(page).getByRole("button", { name: "한국어 조합 수정", exact: true }).click();
    await expect(page.getByLabel("할 일 수정", { exact: true })).toBeFocused();
    await page.getByLabel("할 일 수정", { exact: true }).fill("취소할 입력");
    await page.getByLabel("할 일 수정", { exact: true }).press("Escape");
    await expect(todos(page).getByRole("button", { name: "한국어 조합 수정", exact: true })).toBeFocused();
    await todos(page).getByRole("button", { name: "한국어 조합 수정", exact: true }).press("Enter");
    await page.getByLabel("할 일 수정", { exact: true }).fill("다음 시간에 질문하기");
    await page.getByLabel("할 일 수정", { exact: true }).press("Enter");
    await expect(input).toBeFocused(); await saved(page);
    const checkbox = todos(page).getByRole("checkbox", { name: "다음 시간에 질문하기 완료", exact: true });
    await checkbox.focus(); await page.keyboard.press("Space"); await saved(page); await expect(checkbox).toBeChecked(); await expect(checkbox).toBeFocused();
    await page.keyboard.press("Space"); await saved(page); await expect(checkbox).not.toBeChecked();
    await todos(page).getByRole("button", { name: "블록 실행 결과 메모하기 삭제", exact: true }).click(); await saved(page); await expect(input).toBeFocused();
    await page.reload(); await expect(todos(page).getByText("다음 시간에 질문하기", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "로그아웃", exact: true }).click(); await expect(page).toHaveURL(/\/login\/student$/);
    expect((await loginStudent(page.request, studentPassword)).status()).toBe(200);
    await page.goto("/student"); await expect(todos(page).getByText("궁금한 점 정리하기", { exact: true })).toBeVisible();
    expect((await readTodos(page.request)).items.map((item) => item.text)).toEqual(["궁금한 점 정리하기", "다음 시간에 질문하기"]);
    expect((await db.collection("csWork").doc(`student-20101__${lessonId}`).get()).exists).toBe(false);
    expect(await page.evaluate(() => Object.keys(localStorage).some((key) => /todo|planner|draft/i.test(key)))).toBe(false);
  } finally { release(); }
});

test("할 일 저장·조회 실패와 응답 유실: 의도·입력·이동 보호·중복 없는 재시도", async ({ page }) => {
  await readyStudent(page.request);
  let mode: "create" | "network" | "get" | "ok" = "get";
  await page.route(`**${todosPath}`, async (route) => {
    if (route.request().method() === "POST" && mode === "create") { await route.fetch(); await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "LOST_ACK", message: "저장 응답을 확인하지 못했어요." }) }); }
    else if (route.request().method() === "POST" && mode === "network") await route.abort("failed");
    else if (route.request().method() === "GET" && mode === "get") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "READ_FAILURE", message: "목록 연결 확인이 필요해요." }) });
    else await route.continue();
  });
  await page.goto("/student");
  await expect(todos(page).getByRole("alert")).toContainText("목록 연결 확인");
  await expect(todos(page).getByText(/아직 내 할 일이 없어요/)).toHaveCount(0);
  mode = "create"; await todos(page).getByRole("button", { name: "목록 다시 불러오기" }).click();
  await add(page, "실패에도 보관할 문장");
  await expect(todos(page).getByRole("alert")).toContainText("저장 응답");
  await page.getByRole("button", { name: "수업 시작", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  mode = "ok"; await todos(page).getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click(); await saved(page);
  expect((await readTodos(page.request)).items).toHaveLength(1);
  expect((await readTodos(page.request)).revision).toBe(1);
  mode = "network"; await todos(page).getByRole("checkbox").check();
  await expect(todos(page).getByRole("alert")).toContainText("서버에 연결하지 못했어요");
  await expect(todos(page).getByRole("checkbox")).toBeChecked(); expect((await readTodos(page.request)).items[0].completed).toBe(false);
  await page.getByLabel("할 일 추가", { exact: true }).fill("아직 입력 중인 문장");
  mode = "ok"; await todos(page).getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click(); await saved(page);
  await expect(page.getByLabel("할 일 추가", { exact: true })).toHaveValue("아직 입력 중인 문장");
  await page.getByLabel("할 일 추가", { exact: true }).fill("");
  mode = "network"; await todos(page).getByRole("button", { name: "실패에도 보관할 문장 삭제", exact: true }).click();
  await expect(todos(page).getByRole("alert")).toBeVisible(); await expect(todos(page).getByText("실패에도 보관할 문장", { exact: true })).toBeVisible();
  mode = "ok"; await todos(page).getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click(); await saved(page);
  await expect(todos(page).getByRole("checkbox")).toHaveCount(0);
  await add(page, "마지막 서버 자료"); await saved(page);
  mode = "get"; await todos(page).getByRole("button", { name: "할 일 새로고침" }).click();
  await expect(todos(page).getByRole("alert")).toContainText("마지막으로 조회한 목록");
  await expect(todos(page).getByText("마지막 서버 자료", { exact: true })).toBeVisible();
  mode = "ok"; await todos(page).getByRole("button", { name: "목록 다시 불러오기" }).click(); await expect(todos(page).getByRole("alert")).toHaveCount(0);
});

test("미편집 목록의 첫 조회 대기·실패는 홈·메뉴·로그아웃을 막지 않음", async ({ page }) => {
  await readyStudent(page.request);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  let delay = true;
  const unavailable = { status: 503, contentType: "application/json", body: JSON.stringify({ code: "READ_FAILURE", message: "목록 조회 점검 중이에요." }) };
  await page.route(`**${todosPath}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (delay) await waiting;
    await route.fulfill(unavailable);
  });
  try {
    await page.goto("/student");
    await expect(todos(page).getByText("할 일을 불러오고 있어요.")).toBeVisible();
    await page.getByRole("link", { name: "CS Class 홈", exact: true }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    delay = false; release();
    await page.goto("/student");
    await expect(todos(page).getByRole("alert")).toContainText("목록 조회 점검");
    await expect(todos(page).locator('span[class*="skeleton"]')).toHaveCount(0);
    await page.getByRole("link", { name: "열린 수업", exact: true }).click();
    await expect(page).toHaveURL(/\/student\/lessons$/);
    await page.goto("/student");
    await expect(todos(page).getByRole("alert")).toContainText("목록 조회 점검");
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(/\/login\/student$/);
    await readyTeacher(page.request);
    await page.route("**/api/classroom/schedule?**", (route) => route.fulfill(unavailable));
    await page.goto("/teacher/schedule");
    await expect(page.locator("main").getByRole("alert")).toContainText("목록 조회 점검");
    await page.getByRole("link", { name: "수업 관리", exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/classes\?classId=2-1$/);
  } finally { release(); }
});

test("세션 종료·계정 교체는 개인 화면을 지우고 늦은 이전 요청이 새 접속을 종료하지 않음", async ({ page }) => {
  await db.collection("csTodos").doc("student-20102").delete();
  await student(page.request, "20102"); await readyStudent(page.request); await page.goto("/student");
  await add(page, "이전 계정의 개인 기록"); await saved(page);
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const captured = new Promise<void>((resolve) => { started = resolve; });
  let hold = true;
  await page.route(`**${todosPath}`, async (route) => {
    if (hold && route.request().method() === "GET") {
      hold = false; started(); await gate;
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "SESSION_EXPIRED", message: "이전 접속이 끝났어요." }) });
    } else await route.continue();
  });
  try {
    await todos(page).getByRole("button", { name: "할 일 새로고침" }).click(); await captured;
    await page.getByRole("button", { name: "로그아웃", exact: true }).click(); await expect(page).toHaveURL(/\/login\/student$/);
    await page.getByLabel("학번", { exact: true }).fill("20102"); await page.getByLabel("비밀번호", { exact: true }).fill(studentPassword);
    await page.getByRole("button", { name: "교실 입장", exact: true }).click();
    await expect(todos(page).getByText(/아직 내 할 일이 없어요/)).toBeVisible();
    await expect(page.getByText("이전 계정의 개인 기록", { exact: true })).toHaveCount(0);
    const ended = page.waitForResponse((response) => response.url().endsWith(todosPath) && response.status() === 401);
    release(); await ended;
    await add(page, "새 계정의 저장 기록"); await saved(page);
    expect((await readTodos(page.request)).items.map((item) => item.text)).toEqual(["새 계정의 저장 기록"]);
    await db.collection("csAccounts").doc("student-20102").update({ "session.lastActivityAt": Date.now() - 11 * 60_000 });
    await add(page, "만료 후 전송하지 못한 입력");
    await expect(page.getByRole("heading", { name: "교실에 입장해 주세요.", exact: true })).toBeVisible();
    await expect(page.getByText("새 계정의 저장 기록", { exact: true })).toHaveCount(0);
    const stored = (await db.collection("csTodos").doc("student-20102").get()).data()!;
    expect(stored.items.map((item: Todo) => item.text)).toEqual(["새 계정의 저장 기록"]);
    await page.getByRole("button", { name: "입장 화면으로", exact: false }).click();
    await page.getByLabel("학번", { exact: true }).fill("20102"); await page.getByLabel("비밀번호", { exact: true }).fill(studentPassword);
    await page.getByRole("button", { name: "교실 입장", exact: true }).click();
    await expect(todos(page).getByText("새 계정의 저장 기록", { exact: true })).toBeVisible();
    await expect(page.getByLabel("할 일 추가", { exact: true })).toHaveValue("");
  } finally { release(); }
});

test("다른 탭의 목록 변경은 보관한 입력으로 명시적 재시도하고 다른 항목 유지", async ({ page }) => {
  await readyStudent(page.request); await page.goto("/student"); await add(page, "수정할 항목"); await saved(page);
  const server = await readTodos(page.request);
  const remote = todo("다른 탭이 추가한 항목");
  expect((await page.request.post(todosPath, { headers, data: { revision: server.revision, items: [...server.items, remote] } })).status()).toBe(200);
  await todos(page).getByRole("button", { name: "수정할 항목 수정", exact: true }).click();
  await page.getByLabel("할 일 수정", { exact: true }).fill("내 변경 보관"); await page.getByLabel("할 일 수정", { exact: true }).press("Enter");
  await expect(todos(page).getByRole("alert")).toContainText("다른 화면에서 목록이 바뀌었어요");
  await expect(todos(page).getByText("내 변경 보관", { exact: true })).toBeVisible();
  await todos(page).getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click(); await saved(page);
  await expect(todos(page).getByText(remote.text, { exact: true })).toBeVisible();
  expect((await readTodos(page.request)).items.map((item) => item.text)).toEqual(["내 변경 보관", remote.text]);
});

test("반 일정: 교사 CRUD·실패 복구·반 전환 보호·학생 조회·재로그인", async ({ page, playwright }) => {
  await readyStudent(page.request); await readyTeacher(page.request); await page.goto("/teacher/schedule");
  await expect(page.getByText("아직 등록된 일정이 없어요.", { exact: true })).toBeVisible();
  await page.getByLabel("일정 제목", { exact: true }).fill("정보 수업 준비");
  await page.getByRole("combobox", { name: "연결할 수업 · 선택", exact: true }).click();
  await page.getByRole("option", { name: "순서가 만드는 알고리즘", exact: true }).click();
  await page.getByRole("button", { name: "일정 저장", exact: true }).click();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await expect(page.getByLabel("일정 제목", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "정보 수업 준비 수정", exact: true }).click();
  await page.getByLabel("일정 제목", { exact: true }).fill("작품 제출 안내"); await page.getByLabel("일정 제목", { exact: true }).press("Enter");
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.route(`**${schedulePath}`, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByRole("button", { name: "작품 제출 안내 삭제", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("의도를 보관");
  await page.getByRole("combobox", { name: "담당 반", exact: true }).click();
  await page.getByRole("option", { name: "2학년 2반", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "담당 반", exact: true })).toHaveText("2학년 1반");
  await page.unroute(`**${schedulePath}`); await page.getByRole("button", { name: "최신 기록에 내 변경 재시도" }).click(); await expect(page.getByText("아직 등록된 일정이 없어요.", { exact: true })).toBeVisible();
  await page.getByLabel("일정 제목", { exact: true }).fill("재접속으로 확인할 일정"); await page.getByRole("button", { name: "일정 저장", exact: true }).click(); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText("재접속으로 확인할 일정", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click(); await expect(page).toHaveURL(/\/login\/teacher$/);
  await readyTeacher(page.request); await page.goto("/teacher/schedule"); await expect(page.getByText("재접속으로 확인할 일정", { exact: true })).toBeVisible();
  const separate = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    expect((await loginStudent(separate, studentPassword)).status()).toBe(200);
    expect((await (await separate.get("/api/classroom/schedule")).json()).items[0].title).toBe("재접속으로 확인할 일정");
  } finally { await separate.dispose(); }
  await page.getByRole("button", { name: "로그아웃", exact: true }).click(); expect((await loginStudent(page.request, studentPassword)).status()).toBe(200);
  await page.goto("/student/schedule"); await expect(page.getByText("재접속으로 확인할 일정", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: /수정|삭제/ })).toHaveCount(0);
  await page.route("**/api/classroom/schedule?**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "FAILED", message: "일정 연결을 확인해 주세요." }) }));
  await page.getByRole("button", { name: "일정 새로고침", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("마지막으로 조회한 일정");
  await page.unroute("**/api/classroom/schedule?**"); await page.getByRole("button", { name: "일정 다시 불러오기" }).click(); await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("학생·교사 실제 배치: 7개 너비·키보드·모바일·빈 상태·수업 복귀·화면 기록", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await readyStudent(page.request); await readyTeacher(page.request);
  const staff = (await (await page.request.get("/api/auth/session")).json()).session;
  await db.collection("csTodos").doc(staff.uid).delete();
  expect((await page.request.post(schedulePath, { headers, data: { revision: 0, items: [event("정보 수업 준비"), event("작품 살펴보기")] } })).status()).toBe(200);
  for (const role of ["student", "teacher"] as const) {
    if (role === "student") expect((await loginStudent(page.request, studentPassword)).status()).toBe(200);
    else { await page.getByRole("button", { name: "로그아웃", exact: true }).click(); await expect(page).toHaveURL(/\/login\/student$/); await readyTeacher(page.request); }
    await page.goto(`/${role}`); await expect(todos(page).getByText(/아직 내 할 일이 없어요/)).toBeVisible();
    await add(page, role === "student" ? "궁금한 점 정리하기" : "학생 작품 살펴보기"); await saved(page);
    await expect(page.locator("#current-heading")).toHaveText("순서가 만드는 알고리즘");
    const calendar = page.getByRole("table", { name: /일정 달력/ });
    const [year, month] = seoulToday().split("-").map(Number);
    await expect(calendar.locator("time")).toHaveCount(new Date(Date.UTC(year, month, 0)).getUTCDate());
    await expect(calendar.locator(`time[datetime="${seoulToday()}"]`)).toHaveAttribute("aria-current", "date");
    await expect(calendar.locator(`time[datetime="${seoulToday()}"]`)).toHaveAttribute("aria-label", /일정 2개/);
    if (role === "teacher") await expect(page.getByRole("link", { name: /학습 현황.*등록 학생/ })).toBeVisible();
    for (const width of [1440, 1024, 821, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("heading", { name: "오늘은 무엇을 해볼까요?" })).toBeVisible();
      await expect(todos(page).getByRole("button", { name: /삭제$/ })).toBeVisible();
      const touch = await todos(page).getByRole("checkbox").evaluate((input) => { const bounds = input.closest("label")!.getBoundingClientRect(); return { width: bounds.width, height: bounds.height }; });
      expect(touch.width).toBeGreaterThanOrEqual(44); expect(touch.height).toBeGreaterThanOrEqual(44);
      if (width <= 820) {
        await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "교실 탐색 메뉴" }).getByRole("button", { name: "메뉴 닫기", exact: true })).toBeFocused();
        await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeFocused();
      }
      if ([1440, 390].includes(width)) await page.screenshot({ path: testInfo.outputPath(`${role}-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 821, height: 900 });
    const dashboard = page.getByRole("navigation", { name: "교실 메뉴" }).getByRole("link", { name: "대시보드", exact: true });
    await dashboard.focus(); await page.setViewportSize({ width: 820, height: 900 }); await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "메뉴 열기", exact: true }).click(); await page.setViewportSize({ width: 821, height: 900 }); await expect(dashboard).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 }); await todos(page).getByRole("checkbox").check(); await saved(page);
    if (role === "student") {
      await page.getByRole("button", { name: "수업 시작", exact: true }).click();
      await page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true }).check();
      await page.getByRole("link", { name: "대시보드로", exact: true }).click(); await expect(page).toHaveURL(/\/student$/);
      await page.getByRole("button", { name: "이어하기", exact: true }).click(); await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true })).toBeChecked();
      await page.getByRole("link", { name: "대시보드로", exact: true }).click();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole("navigation", { name: "교실 메뉴" }).getByRole("link", { name: "열린 수업", exact: true }).click();
      await expect(page.getByRole("heading", { name: "열린 수업을 살펴봐요.", exact: true })).toBeVisible();
      const filters = page.getByRole("group", { name: "열린 수업 필터", exact: true });
      await filters.getByRole("button", { name: "완료", exact: true }).click(); await expect(page.getByRole("heading", { name: "순서가 만드는 알고리즘", exact: true })).toHaveCount(0);
      await filters.getByRole("button", { name: "미완료", exact: true }).click(); await expect(page.getByRole("heading", { name: "순서가 만드는 알고리즘", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "이어하기", exact: true }).click(); await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다", exact: true })).toBeChecked();
    } else {
      await page.getByRole("link", { name: /학습 현황.*등록 학생/ }).click();
      await expect(page.getByRole("heading", { name: "학생별 학습 현황", exact: true })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "확인할 수업", exact: true })).toHaveText("순서가 만드는 알고리즘");
    }
  }
  expect(errors).toEqual([]);
});
