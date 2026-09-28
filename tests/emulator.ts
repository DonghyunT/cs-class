import { randomUUID, createHash } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { testEnv } from "../scripts/local-test-env.mjs";

// This test harness can only contact the local demo project.
Object.assign(process.env, testEnv);
const app = getApps().find((item) => item.name === "test-emulator") ?? initializeApp({ projectId: "demo-cs-class" }, "test-emulator");
export const db = getFirestore(app);
export const auth = getAuth(app);
export const initialPassword = testEnv.CS_INITIAL_PASSWORD;
export const studentPassword = "student-test-7319";
export const lessonId = "sequence-lab";
export const correctOrder = ["start", "input", "greeting", "output", "end"];
export const headers = { "X-CS-Class": "1" };
export async function localOnly(request: APIRequestContext) {
  const config = await (await request.get("/api/auth/config")).json();
  expect(config.projectId).toBe("demo-cs-class");
  expect(config.emulatorHost).toBe("127.0.0.1:9099");
}
export async function resetStudent(request: APIRequestContext, studentId = "20101") {
  await localOnly(request);
  const uid = `student-${studentId}`;
  try { await auth.createUser({ uid, email: `s-${studentId}@cs-class.invalid`, password: initialPassword }); }
  catch (error) { if ((error as { code: string }).code !== "auth/uid-already-exists") throw error; await auth.updateUser(uid, { password: initialPassword, disabled: false }); }
  const classId = `2-${Number(studentId.slice(1, 3))}`;
  await db.collection("csAccounts").doc(uid).set({ uid, role: "student", studentId, classId, classIds: [], mustChangePassword: true, disabled: false, authVersion: 0, authBusy: null, session: null });
  await db.collection("csWork").doc(`${uid}__${lessonId}`).delete();
  await db.collection("csRateLimits").doc(createHash("sha256").update(uid).digest("hex")).delete();
  await db.collection("csClasses").doc(classId).set({ id: classId, name: `2학년 ${Number(studentId.slice(1, 3))}반`, revision: 0, currentLessonId: lessonId, openedLessonIds: [lessonId] });
}
export async function loginStudent(request: APIRequestContext, password = initialPassword, studentId = "20101") {
  return request.post("/api/auth/login", { headers, data: { role: "student", studentId, password } });
}
export async function readyStudent(request: APIRequestContext) {
  await resetStudent(request);
  expect((await loginStudent(request)).status()).toBe(200);
  expect((await request.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
}
export async function googleToken(email = testEnv.CS_TEACHER_EMAILS) {
  const identity = { sub: randomUUID(), email, email_verified: true };
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=emulator-only-key", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(JSON.stringify(identity))}&providerId=google.com`, requestUri: "http://localhost", returnSecureToken: true }),
  });
  expect(response.status).toBe(200);
  const value = await response.json();
  return value.idToken as string;
}
export async function readyTeacher(request: APIRequestContext) {
  await localOnly(request);
  const idToken = await googleToken();
  const user = await auth.getUserByEmail(testEnv.CS_TEACHER_EMAILS);
  const profile = db.collection("csAccounts").doc(user.uid);
  if ((await profile.get()).exists) await profile.update({ role: "teacher", classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) });
  const result = await request.post("/api/auth/google", { headers, data: { idToken } });
  expect(result.status()).toBe(200);
  return (await result.json()).session;
}
