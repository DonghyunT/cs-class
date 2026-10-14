import { CLASSROOM_HELP_ENABLED } from "../src/lib/classroom/features";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { auth, db, headers, localOnly, lessonId, studentPassword } from "./emulator";
import { loginStudent } from "./emulator";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";

const uid = "student-20188", teacherUid = "help-teacher-test";
let classBefore: FirebaseFirestore.DocumentData | undefined;
async function session(request: APIRequestContext, target: string) {
  const secret = randomBytes(32).toString("hex");
  await db.collection("csAccounts").doc(target).update({ session: { hash: createHash("sha256").update(secret).digest("hex"), startedAt: Date.now(), lastActivityAt: Date.now() } });
  return { ...headers, Cookie: `cs_session=${target}.${secret}` };
}
test.beforeEach(async ({ request }) => {
  await localOnly(request); classBefore = (await db.collection("csClasses").doc("2-1").get()).data();
  await db.collection("csClasses").doc("2-1").set({ id: "2-1", name: "2학년 1반", revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });
  for (const [id, role] of [[uid, "student"], [teacherUid, "teacher"]]) {
    try { await auth.createUser({ uid: id, email: role === "student" ? "s-20188@cs-class.invalid" : `${id}@cs-class.invalid`, password: studentPassword }); } catch (error) { if ((error as { code: string }).code !== "auth/uid-already-exists") throw error; }
    await db.collection("csAccounts").doc(id).set({ uid: id, role, studentId: role === "student" ? "20188" : null, classId: role === "student" ? "2-1" : null, classIds: role === "teacher" ? ["2-1"] : [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null });
  }
});

test("요청 당시 저장본과 이후 저장본을 구분하고 새로운 손들기를 이전 처리로 지우지 않는다", async ({ request }) => {
  const studentHeaders = await session(request, uid), teacherHeaders = await session(request, teacherUid), id = randomUUID();
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } })).status()).toBe(200);
  const work = await (await request.get(`/api/classroom/work/${lessonId}`, { headers: studentHeaders })).json();
  expect((await request.post(`/api/classroom/work/${lessonId}`, { headers: studentHeaders, data: { revision: work.revision, draft: { ...work.draft, stage: "quiz" } } })).status()).toBe(200);
  const original = await (await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: teacherHeaders })).json();
  expect(original).toMatchObject({ latest: false, work: { revision: 0, draft: { stage: "concept" } } });
  const latest = await (await request.get(`/api/classroom/help/${uid}?id=${id}&latest=1`, { headers: teacherHeaders })).json();
  expect(latest).toMatchObject({ latest: true, work: { revision: 1, draft: { stage: "quiz" } } });
  const next = randomUUID();
  const nextResponse = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: next, lessonId } });
  expect(nextResponse.status()).toBe(200);
  const nextRequest = (await nextResponse.json()).request;
  expect(nextRequest).toMatchObject({ id: next, revision: 1, stage: "quiz", status: "pending" });
  const nextSnapshot = (await db.doc(`csHelpSnapshots/${uid}`).get()).data();
  const limitBeforeReplay = (await db.doc(`csHelpLimits/${uid}`).get()).data();
  expect((await request.post(`/api/classroom/work/${lessonId}`, { headers: studentHeaders, data: { revision: latest.work.revision, draft: { ...latest.work.draft, stage: "practice" } } })).status()).toBe(200);
  const replay = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } });
  expect(replay.status()).toBe(409);
  expect((await replay.json()).code).toBe("REQUEST_CHANGED");
  expect((await (await request.get("/api/classroom/help", { headers: studentHeaders })).json()).request).toEqual(nextRequest);
  expect((await db.doc(`csHelpSnapshots/${uid}`).get()).data()).toEqual(nextSnapshot);
  expect((await db.doc(`csHelpLimits/${uid}`).get()).data()).toEqual(limitBeforeReplay);
  const preserved = await request.get(`/api/classroom/help/${uid}?id=${next}`, { headers: teacherHeaders });
  expect(preserved.status()).toBe(200);
  expect(await preserved.json()).toMatchObject({ request: { id: next, revision: 1 }, work: { revision: 1, draft: { stage: "quiz" } }, latest: false });
  expect((await request.post(`/api/classroom/help/${uid}/resolve`, { headers: teacherHeaders, data: { id } })).status()).toBe(409);
  expect((await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: teacherHeaders })).status()).toBe(409);
  expect((await (await request.get("/api/classroom/help", { headers: studentHeaders })).json()).request.id).toBe(next);
  expect((await request.post(`/api/classroom/help/${uid}/resolve`, { headers: teacherHeaders, data: { id: next } })).status()).toBe(200);
  expect((await (await request.get("/api/classroom/help", { headers: studentHeaders })).json()).request).toBeNull();
  expect((await db.collection("csHelpSnapshots").doc(uid).get()).exists).toBe(false);

  const cancelled = randomUUID(), afterCancel = randomUUID();
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: cancelled, lessonId } })).status()).toBe(200);
  expect((await request.post("/api/classroom/help/cancel", { headers: studentHeaders, data: { id: cancelled } })).status()).toBe(200);
  const cancelledRepeat = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: cancelled, lessonId } });
  expect(cancelledRepeat.status()).toBe(200);
  expect((await cancelledRepeat.json()).request.status).toBe("cancelled");
  expect((await db.doc(`csHelpSnapshots/${uid}`).get()).exists).toBe(false);
  const afterCancelResponse = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: afterCancel, lessonId } });
  expect(afterCancelResponse.status()).toBe(200);
  const afterCancelRequest = (await afterCancelResponse.json()).request;
  expect(afterCancelRequest).toMatchObject({ id: afterCancel, revision: 2, stage: "practice", status: "pending" });
  const snapshotBeforeCancelledReplay = (await db.doc(`csHelpSnapshots/${uid}`).get()).data();
  const limitBeforeCancelledReplay = (await db.doc(`csHelpLimits/${uid}`).get()).data();
  const cancelledReplay = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: cancelled, lessonId } });
  expect(cancelledReplay.status()).toBe(409);
  expect((await cancelledReplay.json()).code).toBe("REQUEST_CHANGED");
  expect((await (await request.get("/api/classroom/help", { headers: studentHeaders })).json()).request).toEqual(afterCancelRequest);
  expect((await db.doc(`csHelpSnapshots/${uid}`).get()).data()).toEqual(snapshotBeforeCancelledReplay);
  expect((await db.doc(`csHelpLimits/${uid}`).get()).data()).toEqual(limitBeforeCancelledReplay);
  expect((await request.post(`/api/classroom/help/${uid}/resolve`, { headers: teacherHeaders, data: { id: afterCancel } })).status()).toBe(200);
  const resolved = (await db.doc(`csHelpRequests/${uid}`).get()).data();
  const lateCancel = await request.post("/api/classroom/help/cancel", { headers: studentHeaders, data: { id: afterCancel } });
  expect(lateCancel.status()).toBe(200);
  expect((await lateCancel.json()).request.status).toBe("resolved");
  expect((await db.doc(`csHelpRequests/${uid}`).get()).data()).toEqual(resolved);
  expect((await (await request.get("/api/classroom/help?classId=2-1", { headers: teacherHeaders })).json()).requests.some((item: { uid: string }) => item.uid === uid)).toBe(false);
});

test("타반·역할·CSRF·계정 교체와 이동·비활성 경계를 지키고 중복 전송은 한도를 소비하지 않는다", async ({ request }) => {
  const studentHeaders = await session(request, uid), teacherHeaders = await session(request, teacherUid), id = randomUUID();
  expect((await request.post("/api/classroom/help", { headers: { Cookie: studentHeaders.Cookie }, data: { id, lessonId } })).status()).toBe(403);
  expect((await request.post("/api/classroom/help", { headers: { ...studentHeaders, "X-CS-User": "different-user" }, data: { id, lessonId } })).status()).toBe(401);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId, uid: teacherUid } })).status()).toBe(400);
  expect((await request.post("/api/classroom/help", { headers: teacherHeaders, data: { id, lessonId } })).status()).toBe(403);
  expect((await request.get("/api/classroom/help?classId=2-2", { headers: studentHeaders })).status()).toBe(403);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId: "entry-bot-lab" } })).status()).toBe(403);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } })).status()).toBe(200);
  expect((await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: studentHeaders })).status()).toBe(403);
  expect((await request.post(`/api/classroom/help/${uid}/resolve`, { headers: studentHeaders, data: { id } })).status()).toBe(403);
  for (let i = 0; i < 11; i++) expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } })).status()).toBe(200);
  expect((await db.collection("csHelpLimits").doc(uid).get()).data()?.count).toBe(1);
  await db.collection("csAccounts").doc(teacherUid).update({ classIds: ["2-2"] });
  for (let i = 0; i < 9; i++) expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: randomUUID(), lessonId } })).status()).toBe(200);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: randomUUID(), lessonId } })).status()).toBe(429);
  expect((await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: teacherHeaders })).status()).toBe(403);
  await db.collection("csAccounts").doc(teacherUid).update({ classIds: ["2-1"] });
  await db.collection("csAccounts").doc(uid).update({ classId: "2-2" });
  expect((await (await request.get("/api/classroom/help?classId=2-1", { headers: teacherHeaders })).json()).requests).toHaveLength(0);
  expect((await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: teacherHeaders })).status()).toBe(403);
  expect((await request.post(`/api/classroom/help/${uid}/resolve`, { headers: teacherHeaders, data: { id } })).status()).toBe(403);
  await db.collection("csAccounts").doc(uid).update({ classId: "2-1", disabled: true });
  expect((await request.get("/api/classroom/help", { headers: studentHeaders })).status()).toBe(401);
  expect((await (await request.get("/api/classroom/help?classId=2-1", { headers: teacherHeaders })).json()).requests).toHaveLength(0);
});

test("학생 저장 실패에서는 손들기를 보내지 않고 재시도 뒤 교사가 읽기 전용 저장본을 확인한다", async ({ page, browser }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  expect((await loginStudent(page.request, studentPassword, "20188")).status()).toBe(200);
  await page.goto(`/classroom/${lessonId}`);
  await expect(page.getByRole("button", { name: "손들기", exact: true })).toBeEnabled();
  await page.route(`**/api/classroom/work/${lessonId}`, route => route.request().method() === "POST" ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "UNAVAILABLE", message: "저장 검증 실패" }) }) : route.continue());
  let raises = 0; page.on("request", value => { if (value.method() === "POST" && value.url().endsWith("/api/classroom/help")) raises++; });
  await page.getByRole("radio", { name: "컵에 물을 200mL 따른다" }).check();
  await page.getByRole("button", { name: "손들기", exact: true }).click();
  await expect(page.getByText("저장 문제를 해결한 뒤 손들어 주세요.")).toBeVisible();
  expect(raises).toBe(0);
  await expect(page.getByRole("radio", { name: "컵에 물을 200mL 따른다" })).toBeChecked();
  await page.unroute(`**/api/classroom/work/${lessonId}`);
  await page.getByRole("button", { name: "저장 다시 확인", exact: true }).click();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "손들기", exact: true }).click();
  await expect(page.getByRole("button", { name: "손 내리기", exact: true })).toBeEnabled();
  const teacherHeaders = await session(page.request, teacherUid);
  const context = await browser.newContext({ viewport: { width: 390, height: 720 } });
  try {
    await context.addCookies([{ name: "cs_session", value: teacherHeaders.Cookie.split("=")[1], domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
    const teacherPage = await context.newPage(); teacherPage.on("pageerror", error => errors.push(error.message));
    await teacherPage.goto("/teacher/students?classId=2-1");
    const help = teacherPage.getByRole("region", { name: /손든 학생/ });
    await help.getByRole("button", { name: /20188/ }).click();
    const dialog = teacherPage.getByRole("dialog");
    await expect(dialog.getByText(/요청 당시 저장본/)).toBeVisible();
    await expect(dialog.getByText("학습 위치 · 개념 이어하기")).toBeVisible();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    const snapshotRefresh = dialog.getByRole("button", { name: "새로고침", exact: true });
    await snapshotRefresh.click();
    await expect(dialog.getByText(/최근 저장본/)).toBeVisible();
    await expect(snapshotRefresh).toBeFocused();
    expect(await dialog.locator("input,textarea,[contenteditable=true]").count()).toBe(0);
    expect(await teacherPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await dialog.getByRole("button", { name: "도움 완료", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(help.getByRole("button", { name: "손들기 새로고침", exact: true })).toBeFocused();
    await page.reload(); await expect(page.getByRole("button", { name: "손들기", exact: true })).toBeEnabled();
  } finally { await context.close(); }
  expect(errors).toEqual([]);
});
test.afterEach(async () => {
  for (const target of [uid, teacherUid]) {
    for (const consumed of (await db.collection("csHelpRequests").doc(target).collection("ids").get()).docs) await consumed.ref.delete();
  }
  for (const collection of ["csHelpRequests", "csHelpSnapshots", "csHelpLimits", "csAccounts"]) for (const target of [uid, teacherUid]) await db.collection(collection).doc(target).delete();
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  for (const target of [uid, teacherUid]) await auth.deleteUser(target).catch(() => undefined);
  await db.collection("csRateLimits").doc(createHash("sha256").update(`credential:${uid}:${passwordDigest(studentPassword)}`).digest("hex")).delete();
  if (classBefore) await db.collection("csClasses").doc("2-1").set(classBefore); else await db.collection("csClasses").doc("2-1").delete();
});

test("손들기는 저장된 작품과 위치를 보관하고 동일 요청 재전송은 중복되지 않는다", async ({ request }) => {
  const studentHeaders = await session(request, uid);
  const work = await (await request.get(`/api/classroom/work/${lessonId}`, { headers: studentHeaders })).json();
  const saved = await request.post(`/api/classroom/work/${lessonId}`, { headers: studentHeaders, data: { revision: work.revision, draft: { ...work.draft, stage: "practice", practiceOrder: ["start", "input", "greeting", "output", "end"] } } });
  expect(saved.status()).toBe(200);
  const id = randomUUID();
  const raised = await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } });
  expect(raised.status()).toBe(200);
  expect((await raised.json()).request).toMatchObject({ id, uid, stage: "practice", revision: 1, status: "pending" });
  const teacherHeaders = await session(request, teacherUid);
  const snapshot = await request.get(`/api/classroom/help/${uid}?id=${id}`, { headers: teacherHeaders });
  expect(snapshot.status()).toBe(200);
  expect((await snapshot.json()).work.draft.practiceOrder).toEqual(["start", "input", "greeting", "output", "end"]);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } })).status()).toBe(200);
  expect((await db.collection("csHelpRequests").where("classId", "==", "2-1").get()).docs.filter(doc => doc.id === uid)).toHaveLength(1);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [] });
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id, lessonId } })).status()).toBe(200);
  expect((await request.post("/api/classroom/help", { headers: studentHeaders, data: { id: randomUUID(), lessonId } })).status()).toBe(403);
  expect((await db.collection("csHelpLimits").doc(uid).get()).data()?.count).toBe(1);
});

// Retained for reactivation; disabled mode is checked by help-paused.spec.ts.
test.skip(!CLASSROOM_HELP_ENABLED, "손들기 일시 중지: 활성 모드 검사 보존");
