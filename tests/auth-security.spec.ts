import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { auth, clearLoginLimit, db, headers, initialPassword, lessonId, loginStudent, readyStudent, readyTeacher, resetStudent, studentPassword } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";

const resetPath = "/api/classroom/students/student-20101/reset";
test("개별 임시 비밀번호는 다른 학생·Firebase·공통값으로 우회할 수 없고 소비 뒤 폐기", async ({ request, playwright }) => {
  await readyStudent(request);
  const originalWork = await (await request.get(`/api/classroom/work/${lessonId}`)).json();
  const staff = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await resetStudent(staff, "20102"); await readyTeacher(staff);
    const reset = await staff.post(resetPath, { headers, data: {} }); expect(reset.status()).toBe(200);
    const first = await reset.json();
    const second = await (await staff.post("/api/classroom/students/student-20102/reset", { headers, data: {} })).json();
    expect(first.password === second.password).toBe(false);
    expect((await request.get(`/api/classroom/work/${lessonId}`)).status()).toBe(401);
    for (const password of [initialPassword, testEnv.CS_RESET_PASSWORD, second.password, studentPassword]) expect((await loginStudent(request, password)).status()).toBe(401);
    const direct = await request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only", { data: { email: "s-20101@cs-class.invalid", password: first.password, returnSecureToken: true } });
    expect(direct.status()).toBe(400);
    expect((await loginStudent(request, first.password)).status()).toBe(200);
    expect((await request.get("/api/classroom/student")).status()).toBe(403);
    const profile = (await db.collection("csAccounts").doc("student-20101").get()).data()!;
    expect(JSON.stringify(profile).includes(first.password)).toBe(false);
    for (const password of ["a12345", "password1", first.password]) expect((await request.post("/api/auth/password", { headers, data: { password } })).status()).toBe(400);
    expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
    expect((await db.collection("csAccounts").doc("student-20101").get()).data()!.temporaryPassword).toBeNull();
    expect((await (await request.get(`/api/classroom/work/${lessonId}`)).json())).toEqual(originalWork);
    expect((await loginStudent(request, first.password)).status()).toBe(401);
    expect((await loginStudent(request, studentPassword)).status()).toBe(200);
  } finally { await staff.dispose(); }
});

test("만료·이전 임시값·검증값 없는 기존 공통 계정은 재발급을 요구", async ({ request }) => {
  await resetStudent(request); await readyTeacher(request);
  const first = await (await request.post(resetPath, { headers, data: {} })).json();
  const second = await (await request.post(resetPath, { headers, data: {} })).json();
  expect((await loginStudent(request, first.password)).status()).toBe(401);
  expect((await loginStudent(request, second.password)).status()).toBe(200);
  await db.collection("csAccounts").doc("student-20101").update({ "temporaryPassword.expiresAt": Date.now() - 1 });
  expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(401);
  expect((await loginStudent(request, second.password)).status()).toBe(401);
  await db.collection("csAccounts").doc("student-20101").update({ temporaryPassword: null });
  expect((await loginStudent(request, initialPassword)).status()).toBe(401);
});

test("계정 상한은 비밀번호를 바꿔 넣어도 30회에서 잠그고, 다른 계정은 그대로·교사 초기화로 풀림", async ({ request, playwright }) => {
  await resetStudent(request); await clearLoginLimit("instructor");
  const staff = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    for (let i = 0; i < 29; i++) expect((await loginStudent(request, `wrong-security-${i}`)).status()).toBe(401);
    expect((await loginStudent(request)).status()).toBe(200);
    expect((await loginStudent(request)).status()).toBe(429);
    expect((await request.post("/api/auth/login", { headers, data: { role: "instructor", studentId: "", password: testEnv.CS_TEST_INSTRUCTOR_PASSWORD } })).status()).toBe(200);
    await readyTeacher(staff);
    const reset = await staff.post(resetPath, { headers, data: {} }); expect(reset.status()).toBe(200);
    expect((await loginStudent(request, (await reset.json()).password)).status()).toBe(200);
  } finally {
    // 동일한 에뮬레이터에서 재검사해도 이 검사가 쓴 예산을 다음 실행에 남기지 않는다.
    await staff.dispose(); await clearLoginLimit("student-20101"); await clearLoginLimit("instructor");
  }
});

test("출처 예산은 학번·전달 헤더를 바꿔도 적용되고 기존 세션은 유지", async ({ request }) => {
  await readyStudent(request);
  const ref = db.collection("csRateLimits").doc(createHash("sha256").update("source:local").digest("hex"));
  await ref.set({ start: Date.now(), count: 599 });
  try {
    expect((await loginStudent(request, "wrong", "29998")).status()).toBe(401);
    expect((await request.post("/api/auth/login", { headers: { ...headers, "x-forwarded-for": "192.0.2.9", "x-vercel-forwarded-for": "192.0.2.10" }, data: { role: "student", studentId: "29999", password: "different" } })).status()).toBe(429);
    expect((await request.get("/api/classroom/student")).status()).toBe(200);
    await ref.set({ start: Date.now() - 60_001, count: 600 });
    expect((await loginStudent(request, studentPassword)).status()).toBe(200);
  } finally { await ref.delete(); }
});

test("같은 학교 출처의 27명 동시 입장이 모두 성공", async ({ playwright }, testInfo) => {
  const ref = db.collection("csRateLimits").doc(createHash("sha256").update("source:local").digest("hex"));
  const classroomRef = db.doc("csClasses/2-2");
  const previousClassroom = (await classroomRef.get()).data();
  const students = await Promise.all(Array.from({ length: 27 }, async (_, index) => ({
    studentId: `202${String(index + 1).padStart(2, "0")}`,
    request: await playwright.request.newContext({ baseURL: "http://localhost:3000" }),
  })));
  try {
    for (const student of students) await resetStudent(student.request, student.studentId);
    await ref.delete();
    const startedAt = Date.now();
    const results = await Promise.all(students.map(async ({ request, studentId }) => {
      const response = await loginStudent(request, initialPassword, studentId);
      return { studentId, status: response.status(), body: await response.json() };
    }));
    expect(results.map(({ status }) => status)).toEqual(Array(27).fill(200));
    for (const result of results) expect(result.body.session.studentId).toBe(result.studentId);
    expect((await ref.get()).data()!.count).toBe(27);
    testInfo.annotations.push({ type: "동시 입장 소요 시간", description: `${Date.now() - startedAt}ms / 27명` });
  } finally {
    await ref.delete();
    for (const { studentId, request } of students) {
      await db.doc(`csAccounts/student-${studentId}`).delete();
      await clearLoginLimit(`student-${studentId}`);
      await auth.deleteUser(`student-${studentId}`).catch((error: { code: string }) => {
        if (error.code !== "auth/user-not-found") throw error;
      });
      await request.dispose();
    }
    if (previousClassroom) await classroomRef.set(previousClassroom);
    else await classroomRef.delete();
  }
});

test("미공개 수업 본문은 익명·변경 필요·닫힌 수업·교사 응답에 없고 열린 학생만 전달", async ({ request }) => {
  const path = `/classroom/${lessonId}`;
  const marker = "컵에 물을 200mL";
  const hidden = async () => {
    for (const requestHeaders of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const result = await request.get(path, { headers: requestHeaders, maxRedirects: 0 });
      expect((await result.text()).includes(marker)).toBe(false);
    }
  };
  await hidden();
  await resetStudent(request); await loginStudent(request); await hidden();
  await request.post("/api/auth/password", { headers, data: { password: studentPassword } });
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [] }); await hidden();
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [lessonId] });
  const response = await request.get(path); expect(response.status()).toBe(200); expect((await response.text()).includes(marker)).toBe(true);
  await readyTeacher(request); await hidden();
});

test("운영 점검 쓰기는 인증·네트워크·환경 준비 전 거부", async () => {
  await expect(promisify(execFile)(process.execPath, ["scripts/check-cloud-flow.mjs", "--apply"], { env: { PATH: process.env.PATH, NODE_ENV: "test" } })).rejects.toThrow("Cloud write smoke tests are retired");
  // 관리 권한이 필요한 Auth 객체는 로컬 전용 테스트 도우미에서만 사용합니다.
  expect(auth.app.options.projectId).toBe("demo-cs-class");
});

test("일괄 발급(pendingOnly)은 자기 비밀번호를 정했거나 접속 중인 학생을 건너뛰고 미설정 학생만 발급", async ({ request, playwright }) => {
  await readyStudent(request);
  const staff = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    await resetStudent(staff, "20102"); await readyTeacher(staff);
    for (const data of [{ pendingOnly: false }, { pendingOnly: "yes" }, { pendingOnly: true, extra: 1 }, []]) expect((await staff.post(resetPath, { headers, data })).status()).toBe(400);
    const active = await staff.post(resetPath, { headers, data: { pendingOnly: true } });
    expect(active.status()).toBe(409); expect((await active.json()).code).toBe("ALREADY_ACTIVE");
    expect((await request.get("/api/auth/session")).status()).toBe(200);
    expect((await (await request.get("/api/auth/session")).json()).session.uid).toBe("student-20101");
    const pending = await staff.post("/api/classroom/students/student-20102/reset", { headers, data: { pendingOnly: true } });
    expect(pending.status()).toBe(200);
    const credential = await pending.json();
    const student = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    try {
      expect((await loginStudent(student, credential.password, "20102")).status()).toBe(200);
      const signedIn = await staff.post("/api/classroom/students/student-20102/reset", { headers, data: { pendingOnly: true } });
      expect(signedIn.status()).toBe(409); expect((await signedIn.json()).code).toBe("ALREADY_ACTIVE");
    } finally { await student.dispose(); }
  } finally { await staff.dispose(); }
  expect((await loginStudent(request, studentPassword)).status()).toBe(200);
});
