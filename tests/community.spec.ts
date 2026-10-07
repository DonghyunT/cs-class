import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";
import { auth, db, headers, initialPassword, localOnly, loginStudent, readyTeacher, resetStudent, studentPassword } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";

const studentIds = ["20193", "20194"];
const uids = studentIds.map(id => `student-${id}`);
const originalClasses = new Map<string, FirebaseFirestore.DocumentData | undefined>();
let originalTeacherClasses: string[] | undefined;
let teacherUid = "";
let ownsAccounts = false;
const base = "/api/classroom/community";

async function enter(request: APIRequestContext, studentId: string) {
  await resetStudent(request, studentId);
  expect((await loginStudent(request, initialPassword, studentId)).status()).toBe(200);
  expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
}
async function clearQuestions() {
  const questions = await db.collection("csQuestions").where("author.uid", "in", uids).get();
  for (const question of questions.docs) {
    for (const answer of (await question.ref.collection("answers").get()).docs) await answer.ref.delete();
    await question.ref.delete();
  }
  for (const uid of uids) await db.doc(`csCommunityLimits/${uid}`).delete();
}
test.beforeAll(async ({ request }) => {
  await localOnly(request);
  for (const classId of ["2-1", "2-2"]) originalClasses.set(classId, (await db.doc(`csClasses/${classId}`).get()).data());
  for (const uid of uids) expect((await db.doc(`csAccounts/${uid}`).get()).exists).toBe(false);
  ownsAccounts = true;
  try {
    teacherUid = (await auth.getUserByEmail(testEnv.CS_TEACHER_EMAILS)).uid;
    originalTeacherClasses = (await db.doc(`csAccounts/${teacherUid}`).get()).data()?.classIds;
  } catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
});
test.beforeEach(async ({ page, request }) => {
  await clearQuestions();
  await enter(page.request, studentIds[0]);
  await enter(request, studentIds[1]);
  await db.doc(`csAccounts/${uids[0]}`).update({ nickname: "초코" });
  await db.doc(`csAccounts/${uids[1]}`).update({ classId: "2-2" });
  expect((await (await page.request.get("/api/auth/session")).json()).session.studentId).toBe(studentIds[0]);
});
test.afterAll(async () => {
  if (!ownsAccounts) return;
  await clearQuestions();
  for (const uid of uids) {
    for (const lesson of LESSONS) await db.doc(`csWork/${uid}__${lesson.id}`).delete();
    for (const collection of ["csAccounts", "csAiUsage"]) await db.doc(`${collection}/${uid}`).delete();
    for (const password of [initialPassword, studentPassword]) {
      const key = createHash("sha256").update(`credential:${uid}:${passwordDigest(password)}`).digest("hex");
      await db.doc(`csRateLimits/${key}`).delete();
    }
    await auth.deleteUser(uid).catch(error => { if (error.code !== "auth/user-not-found") throw error; });
  }
  for (const [classId, data] of originalClasses) {
    const ref = db.doc(`csClasses/${classId}`);
    if (data) await ref.set(data); else await ref.delete();
  }
  if (teacherUid && originalTeacherClasses) await db.doc(`csAccounts/${teacherUid}`).update({ classIds: originalTeacherClasses });
});

test("우리 반 질문 저장·UUID 재전송·닉네임과 반 권한을 서버에서 확인", async ({ page, request }) => {
  const id = randomUUID();
  const input = { id, title: "입력 순서가 궁금해요", body: "이름을 물은 뒤 출력해야 하는 이유를 알려 주세요.", lessonId: "sequence-lab" };
  const created = await page.request.post(`${base}/2-1`, { headers, data: input });
  expect(created.status()).toBe(200);
  const question = await created.json();
  expect(question).toMatchObject({ id, classId: "2-1", title: input.title, body: input.body, resolved: false, author: { uid: uids[0], role: "student", studentId: studentIds[0], nickname: "초코" }, answers: [] });
  const repeat = await page.request.post(`${base}/2-1`, { headers, data: input });
  expect(repeat.status()).toBe(200);
  expect((await repeat.json()).createdAt).toBe(question.createdAt);
  const classroom = db.doc("csClasses/2-1"), original = (await classroom.get()).data()!;
  try {
    await classroom.update({ openedLessonIds: original.openedLessonIds.filter((lessonId: string) => lessonId !== input.lessonId), currentLessonId: original.currentLessonId === input.lessonId ? null : original.currentLessonId });
    const closedRepeat = await page.request.post(`${base}/2-1`, { headers, data: input });
    expect(closedRepeat.status()).toBe(200);
    expect(await closedRepeat.json()).toMatchObject({ id, body: input.body, createdAt: question.createdAt });
    expect((await page.request.post(`${base}/2-1`, { headers, data: { ...input, body: "닫힌 뒤 바꾼 본문" } })).status()).toBe(409);
    expect((await page.request.post(`${base}/2-1`, { headers, data: { ...input, id: randomUUID() } })).status()).toBe(400);
  } finally {
    await classroom.update({ openedLessonIds: original.openedLessonIds, currentLessonId: original.currentLessonId });
  }
  const list = await page.request.get(base);
  expect(list.status()).toBe(200);
  expect((await list.json()).questions.filter((item: { id: string }) => item.id === id)).toHaveLength(1);
  expect((await request.get(`${base}?classId=2-1`)).status()).toBe(403);
  expect((await request.post(`${base}/${id}/answers`, { headers, data: { id: randomUUID(), body: "다른 반에서 작성" } })).status()).toBe(403);
  expect((await page.request.post(`${base}/2-2`, { headers, data: { ...input, id: randomUUID() } })).status()).toBe(403);
});

test("동시 답변·유실 응답 재전송을 보존하고 작성자·담당 교사만 해결 표시", async ({ page, request }) => {
  await db.doc(`csAccounts/${uids[1]}`).update({ classId: "2-1" });
  const id = randomUUID();
  expect((await page.request.post(`${base}/2-1`, { headers, data: { id, title: "두 답변을 함께 보고 싶어요", body: "서로 다른 설명을 부탁해요.", lessonId: null } })).status()).toBe(200);
  const first = { id: randomUUID(), body: "입력받은 값을 다음 블록에서 사용해요." };
  const second = { id: randomUUID(), body: "출력 전에 값을 알아야 해요." };
  const replies = await Promise.all([page.request.post(`${base}/${id}/answers`, { headers, data: first }), request.post(`${base}/${id}/answers`, { headers, data: second })]);
  expect(replies.map(response => response.status())).toEqual([200, 200]);
  expect((await page.request.post(`${base}/${id}/answers`, { headers, data: first })).status()).toBe(200);
  expect((await page.request.post(`${base}/${id}/answers`, { headers, data: { ...first, body: "같은 UUID로 바꾼 설명" } })).status()).toBe(409);
  expect((await request.post(`${base}/${id}/answers`, { headers, data: first })).status()).toBe(409);
  const question = await (await page.request.get(`${base}/${id}`)).json();
  expect(question.answers.map((answer: { id: string }) => answer.id).sort()).toEqual([first.id, second.id].sort());
  expect(question.answers.find((answer: { id: string; body: string }) => answer.id === first.id).body).toBe(first.body);
  expect(question.answerCount).toBe(2);
  expect(question.resolved).toBe(false);
  expect((await request.post(`${base}/${id}/resolve`, { headers, data: { resolved: true } })).status()).toBe(403);
  expect((await page.request.post(`${base}/${id}/resolve`, { headers, data: { resolved: true } })).status()).toBe(200);
  await readyTeacher(request);
  teacherUid = (await auth.getUserByEmail(testEnv.CS_TEACHER_EMAILS)).uid;
  const teacherReply = await request.post(`${base}/${id}/answers`, { headers, data: { id: randomUUID(), body: "입력과 출력을 순서대로 연결하면 됩니다." } });
  expect(teacherReply.status()).toBe(200);
  expect((await teacherReply.json()).answer.author).toMatchObject({ role: "teacher", studentId: null });
  expect((await request.post(`${base}/${id}/resolve`, { headers, data: { resolved: false } })).status()).toBe(200);
  expect((await (await request.get(`${base}/${id}`)).json()).resolved).toBe(false);
  await db.doc(`csAccounts/${teacherUid}`).update({ classIds: ["2-2"] });
  expect((await request.get(`${base}/${id}`)).status()).toBe(403);
  expect((await request.post(`${base}/${id}/answers`, { headers, data: { id: randomUUID(), body: "권한 없는 교사" } })).status()).toBe(403);
});

test("닫힌 수업·스푸핑·긴 입력·UUID 충돌과 답변 한도를 서버에서 거부", async ({ page }) => {
  const id = randomUUID(), input = { id, title: "입력 확인", body: "내용", lessonId: null };
  for (const payload of [{ ...input, title: " " }, { ...input, title: "가".repeat(81) }, { ...input, body: "가".repeat(2001) }, { ...input, lessonId: "programming-13" }, { ...input, author: { role: "teacher" } }, { ...input, id: "../../outside" }]) {
    expect((await page.request.post(`${base}/2-1`, { headers, data: payload })).status()).toBe(400);
  }
  expect((await page.request.post(`${base}/2-1`, { headers, data: input })).status()).toBe(200);
  expect((await page.request.post(`${base}/2-1`, { headers, data: { ...input, body: "변경된 요청" } })).status()).toBe(409);
  expect((await page.request.post(`${base}/${id}/answers`, { headers, data: { id: randomUUID(), body: "가".repeat(1501) } })).status()).toBe(400);
  await db.doc(`csQuestions/${id}`).update({ answerCount: 39 });
  const batch = db.batch();
  for (let index = 0; index < 39; index++) {
    const answerId = randomUUID();
    batch.set(db.doc(`csQuestions/${id}/answers/${answerId}`), { id: answerId, body: `설명 ${index + 1}`, author: { uid: uids[0], role: "student", studentId: studentIds[0], nickname: "초코" }, createdAt: 1_700_000_000_000 + index });
  }
  await batch.commit();
  await page.goto("/student/community");
  await page.getByRole("region", { name: "우리 반 질문 목록", exact: true }).getByRole("button", { name: /입력 확인/ }).click();
  const thread = page.getByRole("region", { name: "질문과 답변", exact: true });
  await expect(thread.getByRole("heading", { name: "답변 39개", exact: true })).toBeVisible();
  await page.getByLabel("답변 내용", { exact: true }).fill("마지막으로 덧붙이는 설명이에요.");
  const answerButton = thread.getByRole("button", { name: "답변 등록", exact: true });
  await answerButton.focus();
  await answerButton.press("Enter");
  await expect(thread.getByRole("heading", { name: "답변 40개", exact: true })).toBeVisible();
  await expect(thread.getByRole("listitem")).toHaveCount(40);
  await expect(thread.getByRole("button", { name: "답변 등록", exact: true })).toHaveCount(0);
  await expect(thread).toContainText("답변은 한 질문에 40개까지 등록할 수 있어요.");
  await expect(thread.getByRole("heading", { name: "입력 확인", exact: true })).toBeFocused();
  expect((await page.request.post(`${base}/${id}/answers`, { headers, data: { id: randomUUID(), body: "한도 다음 답변" } })).status()).toBe(409);
});

test("동일 시각 질문도 페이지 사이에 빠짐·중복 없이 읽고 목록에서 본문·답변은 제외", async ({ page }) => {
  const ids = Array.from({ length: 51 }, () => randomUUID()).sort().reverse();
  const batch = db.batch();
  ids.forEach((id, index) => batch.set(db.doc(`csQuestions/${id}`), { id, classId: "2-1", title: `페이지 질문 ${index}`, body: "상세에서만 읽는 본문", lessonId: null, author: { uid: uids[0], role: "student", studentId: studentIds[0], nickname: "초코" }, createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000, resolved: false, resolvedAt: null, resolvedBy: null, answerCount: 0 }));
  await batch.commit();
  const first = await (await page.request.get(base)).json();
  expect(first.questions.map((question: { id: string }) => question.id)).toEqual(ids.slice(0, 50));
  expect(first.nextCursor).toBe(ids[49]);
  expect(first.questions.every((question: Record<string, unknown>) => !("body" in question) && !("answers" in question))).toBe(true);
  const next = await (await page.request.get(`${base}?after=${first.nextCursor}`)).json();
  expect(next.questions.map((question: { id: string }) => question.id)).toEqual([ids[50]]);
  expect(next.nextCursor).toBeNull();
  expect((await page.request.get(`${base}?after=${randomUUID()}`)).status()).toBe(400);
});

test("질문·답변 실패의 초안을 보관하고 재시도·키보드·좁은 창·plain text 표시", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/student/community");
  await expect(page.getByRole("region", { name: "우리 반 질문 목록", exact: true })).toBeVisible();
  const writer = page.locator("summary").filter({ hasText: "질문 쓰기" });
  await writer.focus();
  await writer.press("Enter");
  const title = page.getByLabel("질문 제목", { exact: true });
  const body = page.getByLabel("질문 내용", { exact: true });
  await title.fill("키보드로 묻는 입력 순서");
  const literal = '<img src="x" onerror="alert(1)"> 문자는 설명 그대로 보여야 해요.';
  await body.fill(literal);
  let questionFailure = true;
  const questionIds: string[] = [];
  await page.route("**/api/classroom/community/2-1", async route => {
    questionIds.push(route.request().postDataJSON().id);
    if (questionFailure) { questionFailure = false; await route.fulfill({ status: 503, json: { code: "UNAVAILABLE", message: "시험 질문 등록 실패" } }); }
    else await route.continue();
  });
  const submit = page.getByRole("button", { name: "질문 등록", exact: true });
  await submit.focus(); await submit.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "시험 질문 등록 실패" })).toBeVisible();
  await expect(title).toHaveValue("키보드로 묻는 입력 순서");
  await expect(body).toHaveValue(literal);
  await page.getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/student");
  await page.goto("/student/community");
  await expect(title).toHaveValue("키보드로 묻는 입력 순서");
  await expect(body).toHaveValue(literal);
  await submit.click();
  const thread = page.getByRole("region", { name: "질문과 답변", exact: true });
  await expect(thread.getByRole("heading", { name: "키보드로 묻는 입력 순서", exact: true })).toBeVisible();
  expect(questionIds).toHaveLength(2);
  expect(questionIds[1]).toBe(questionIds[0]);
  await expect(thread.getByText(literal, { exact: true })).toBeVisible();
  await expect(thread.locator("img")).toHaveCount(0);
  await expect(title).toBeFocused();
  let answerFailure = true;
  const answerIds: string[] = [];
  await page.route("**/api/classroom/community/*/answers", async route => {
    answerIds.push(route.request().postDataJSON().id);
    if (answerFailure) { answerFailure = false; await route.fulfill({ status: 503, json: { code: "UNAVAILABLE", message: "시험 답변 등록 실패" } }); }
    else await route.continue();
  });
  const answer = page.getByLabel("답변 내용", { exact: true });
  await answer.fill("줄을 바꿔 설명해요.\n입력한 값을 다음 블록에서 써요.");
  const answerButton = thread.getByRole("button", { name: "답변 등록", exact: true });
  await answerButton.focus(); await answerButton.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "시험 답변 등록 실패" })).toBeVisible();
  await expect(answer).toHaveValue("줄을 바꿔 설명해요.\n입력한 값을 다음 블록에서 써요.");
  await answerButton.press("Enter");
  await expect(thread.getByRole("heading", { name: "답변 1개", exact: true })).toBeVisible();
  expect(answerIds).toHaveLength(2);
  expect(answerIds[1]).toBe(answerIds[0]);
  await expect(answer).toHaveValue("");
  await expect(answer).toBeFocused();
  await thread.getByRole("button", { name: "해결됨으로 표시", exact: true }).click();
  await expect(thread.getByRole("button", { name: "질문 다시 열기", exact: true })).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("community-320.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("첫 질문 조회 대기와 실패만으로 미편집 화면의 대시보드 이동을 막지 않음", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/community?**", async route => { await gate; await route.fulfill({ status: 503, json: { message: "질문 조회 실패" } }); });
  try {
    await page.goto("/student/community");
    await expect(page.getByRole("status").filter({ hasText: "우리 반 질문을 불러오고 있어요." })).toBeVisible();
    await page.getByRole("link", { name: "대시보드", exact: true }).click();
    await expect(page).toHaveURL("http://localhost:3000/student");
  } finally { release(); }
});

test("질문 초안을 탭에 보관한 뒤 실제 뒤로가기·앞으로가기를 재개하고 복원", async ({ page }) => {
  await page.goto("/student");
  await page.getByRole("link", { name: "우리 반 질문", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/student/community");
  await expect(page.getByRole("region", { name: "우리 반 질문 목록", exact: true })).toBeVisible();
  await page.locator("summary").filter({ hasText: "질문 쓰기" }).click();
  const title = page.getByLabel("질문 제목", { exact: true });
  const body = page.getByLabel("질문 내용", { exact: true });
  await page.evaluate(() => {
    Object.defineProperty(window, "communityOriginalSetItem", { value: Storage.prototype.setItem, configurable: true });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("cs-community-draft:")) throw new DOMException("테스트 보관 실패", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await title.fill("뒤로가도 이어 쓸 질문이에요");
  await body.fill("아직 전송하지 않은 두 줄\n탭에 보관하는 내용이에요.");
  await page.goBack();
  await expect(page.getByRole("alert").filter({ hasText: "작성 내용을 보관하지 못했어요." })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:3000/student/community");
  await expect(body).toHaveValue("아직 전송하지 않은 두 줄\n탭에 보관하는 내용이에요.");
  await page.evaluate(() => {
    Storage.prototype.setItem = Reflect.get(window, "communityOriginalSetItem") as Storage["setItem"];
    Reflect.deleteProperty(window, "communityOriginalSetItem");
  });
  await page.goBack();
  await expect(page).toHaveURL("http://localhost:3000/student");
  await expect(page.getByRole("region", { name: "우리 반 질문 목록", exact: true })).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL("http://localhost:3000/student/community");
  await expect(title).toHaveValue("뒤로가도 이어 쓸 질문이에요");
  await expect(body).toHaveValue("아직 전송하지 않은 두 줄\n탭에 보관하는 내용이에요.");
  expect((await (await page.request.get(base)).json()).questions).toHaveLength(0);
});
