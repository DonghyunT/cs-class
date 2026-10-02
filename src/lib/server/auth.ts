import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Transaction } from "firebase-admin/firestore";
import type { Role, Session } from "../classroom/types";
import { admin } from "./firebase";
import { guestLoginEnabled } from "./guest-mode";
import { createTemporaryPassword, passwordDigest } from "./temporary-password.mjs";
import { requireCondition, ServiceError } from "./errors";

export const SESSION_COOKIE = "cs_session";
export interface Account {
  uid: string; role: Role; studentId: string | null; classId: string | null; classIds: string[];
  mustChangePassword: boolean; disabled: boolean; authVersion: number; authBusy: string | null;
  authBusyAt?: number | null;
  temporaryPassword?: { hash: string; expiresAt: number } | null;
  session: { hash: string; lastActivityAt: number; startedAt: number } | null;
}
export interface Identity { uid: string; secret: string }
export function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function timeoutFor(role: Role) { return role === "student" ? 10 * 60_000 : 4 * 60 * 60_000; }
export function publicSession(account: Account): Session {
  return { uid: account.uid, role: account.role, studentId: account.studentId, classId: account.classId, classIds: account.classIds, mustChangePassword: account.mustChangePassword, lastActivityAt: account.session!.lastActivityAt, idleTimeoutMs: timeoutFor(account.role) };
}
export async function identity(): Promise<Identity> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const [uid, secret, extra] = value.split(".");
  requireCondition(!extra && /^[a-zA-Z0-9_-]{1,128}$/.test(uid ?? "") && /^[a-f0-9]{64}$/.test(secret ?? ""), 401, "SIGNED_OUT", "다시 로그인해 주세요.");
  const expectedUser = (await headers()).get("X-CS-User");
  requireCondition(!expectedUser || expectedUser === uid, 401, "SESSION_REPLACED", "다른 계정으로 로그인되어 이 화면을 종료했어요.");
  return { uid, secret };
}
export function validateSession(account: Account | undefined, who: Identity, allowPasswordChange = false, now = Date.now()): Account {
  requireCondition(account && !account.disabled, 401, "SIGNED_OUT", "사용할 수 없는 계정이에요. 선생님께 알려 주세요.");
  requireCondition(!account.authBusy, 423, "ACCOUNT_BUSY", "계정 정보를 변경하고 있어요. 잠시 후 다시 시도해 주세요.");
  const digest = hash(who.secret);
  requireCondition(account.session && account.session.hash.length === digest.length && timingSafeEqual(Buffer.from(account.session.hash), Buffer.from(digest)), 401, "SESSION_REPLACED", "다른 곳에서 로그인되었거나 계정이 초기화되어 로그아웃됐어요.");
  requireCondition(now - account.session.lastActivityAt < timeoutFor(account.role), 401, "SESSION_EXPIRED", "오랫동안 사용하지 않아 로그아웃됐어요. 다시 로그인해 주세요.");
  if (account.mustChangePassword) requireCondition(account.temporaryPassword && account.temporaryPassword.expiresAt > now, 401, "TEMP_PASSWORD_EXPIRED", "임시 비밀번호가 만료됐어요. 선생님께 다시 발급을 요청해 주세요.");
  requireCondition(allowPasswordChange || !account.mustChangePassword, 403, "PASSWORD_REQUIRED", "먼저 비밀번호를 바꿔 주세요.");
  return account;
}
export async function authorized<T>(who: Identity, action: (transaction: Transaction, account: Account) => Promise<T>, allowPasswordChange = false) {
  const { db } = admin();
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(db.collection("csAccounts").doc(who.uid));
    const account = validateSession(snap.exists ? snap.data() as Account : undefined, who, allowPasswordChange);
    return action(transaction, account);
  });
}
export async function readSession() {
  const who = await identity();
  return authorized(who, async (_transaction, account) => publicSession(account), true);
}
async function setSessionCookie(uid: string, secret: string) {
  (await cookies()).set(SESSION_COOKIE, `${uid}.${secret}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
}
async function limitLogin(key: string, maximum: number, windowMs: number) {
  const { db } = admin(); const ref = db.collection("csRateLimits").doc(hash(key)); const now = Date.now();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const fresh = !data || now - data.start >= windowMs;
    requireCondition(fresh || data.count < maximum, 429, "LOGIN_LIMIT", "로그인 요청이 많아요. 잠시 후 다시 시도해 주세요.");
    tx.set(ref, { start: fresh ? now : data.start, count: fresh ? 1 : data.count + 1 });
  });
}
async function openSession(uid: string, expectedVersion: number, expectedRole: Role) {
  const { db } = admin(); const secret = randomBytes(32).toString("hex"); const ref = db.collection("csAccounts").doc(uid);
  const session = await db.runTransaction(async (tx) => {
    const account = (await tx.get(ref)).data() as Account | undefined;
    requireCondition(account && !account.disabled && account.role === expectedRole && account.authVersion === expectedVersion && !account.authBusy, 401, "LOGIN_CHANGED", "계정 정보가 바뀌었어요. 다시 로그인해 주세요.");
    if (account.mustChangePassword) requireCondition(account.temporaryPassword && account.temporaryPassword.expiresAt > Date.now(), 401, "TEMP_PASSWORD_EXPIRED", "임시 비밀번호가 만료됐어요. 선생님께 다시 발급을 요청해 주세요.");
    account.session = { hash: hash(secret), startedAt: Date.now(), lastActivityAt: Date.now() };
    tx.update(ref, { session: account.session });
    return publicSession(account);
  });
  await setSessionCookie(uid, secret);
  return session;
}
export async function loginPassword(role: "student" | "instructor", studentId: string, password: string) {
  const uid = role === "student" ? `student-${studentId}` : "instructor";
  const email = role === "student" ? `s-${studentId}@cs-class.invalid` : "instructor@cs-class.invalid";
  return loginPasswordAccount(role, uid, email, password);
}
export async function loginGuest(role: "student" | "teacher") {
  requireCondition(guestLoginEnabled(), 404, "NOT_FOUND", "찾을 수 없는 요청입니다.");
  return loginPasswordAccount(role, role === "student" ? "student-21099" : "guest-teacher", role === "student" ? "s-21099@cs-class.invalid" : "guest-teacher@cs-class.invalid", process.env.CS_TEST_GUEST_PASSWORD!);
}
async function loginPasswordAccount(role: Role, uid: string, email: string, password: string) {
  const { auth, db } = admin();
  // Vercel가 덮어쓰는 출처만 신뢰합니다. 로컬에서는 전달 헤더로 제한을 우회하지 못합니다.
  const source = process.env.VERCEL ? (await headers()).get("x-vercel-forwarded-for") ?? "unknown" : "local";
  await limitLogin(`source:${source}`, 600, 60_000);
  // 같은 학교의 동시 입장은 허용하고, 타인의 오답은 정상 비밀번호의 예산을 소모하지 않습니다.
  await limitLogin(`credential:${uid}:${hash(password)}`, 12, 15 * 60_000);
  const initial = (await db.collection("csAccounts").doc(uid).get()).data() as Account | undefined;
  requireCondition(initial && initial.role === role && !initial.disabled, 401, "INVALID_LOGIN", "학번 또는 비밀번호를 확인해 주세요.");
  requireCondition(!initial?.authBusy, 423, "ACCOUNT_BUSY", "계정 정보를 변경하고 있어요. 잠시 후 다시 시도해 주세요.");
  if (initial.mustChangePassword) {
    const temporary = initial.temporaryPassword;
    requireCondition(temporary && temporary.expiresAt > Date.now(), 401, "TEMP_PASSWORD_EXPIRED", "선생님께 학생별 임시 비밀번호를 발급받아 주세요.");
    const digest = passwordDigest(password);
    requireCondition(temporary.hash.length === digest.length && timingSafeEqual(Buffer.from(temporary.hash), Buffer.from(digest)), 401, "INVALID_LOGIN", "학번 또는 비밀번호를 확인해 주세요.");
    return openSession(uid, initial.authVersion, role);
  }
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const endpoint = host ? `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` : "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY!)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }), cache: "no-store", signal: AbortSignal.timeout(15000) });
  requireCondition(response.ok, 401, "INVALID_LOGIN", "학번 또는 비밀번호를 확인해 주세요.");
  const data = await response.json();
  const token = await auth.verifyIdToken(data.idToken, true);
  requireCondition(initial && token.uid === uid && initial.role === role && !initial.disabled, 401, "INVALID_LOGIN", "학번 또는 비밀번호를 확인해 주세요.");
  return openSession(uid, initial.authVersion, role);
}
export async function loginGoogle(idToken: string) {
  const { auth, db } = admin();
  let token;
  try { token = await auth.verifyIdToken(idToken, true); }
  catch { throw new ServiceError(401, "INVALID_LOGIN", "Google 로그인을 다시 시도해 주세요."); }
  const allowed = (process.env.CS_TEACHER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  requireCondition(token.firebase.sign_in_provider === "google.com" && token.email_verified && token.email && allowed.includes(token.email.toLowerCase()), 403, "TEACHER_NOT_ALLOWED", "등록된 선생님 Google 계정으로 로그인해 주세요.");
  requireCondition(Date.now() / 1000 - token.auth_time <= 300, 401, "LOGIN_TOO_OLD", "Google 로그인을 새로 진행해 주세요.");
  const ref = db.collection("csAccounts").doc(token.uid); const used = db.collection("csGoogleExchanges").doc(hash(idToken));
  const account = await db.runTransaction(async (tx) => {
    const [snap, exchange] = await Promise.all([tx.get(ref), tx.get(used)]);
    requireCondition(!exchange.exists, 401, "LOGIN_REPLAY", "사용한 로그인 정보예요. Google 로그인을 다시 진행해 주세요.");
    const value = snap.exists ? snap.data() as Account : { uid: token.uid, role: "teacher" as const, studentId: null, classId: null, classIds: Array.from({ length: 11 }, (_, i) => `2-${i + 1}`), mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null };
    requireCondition(value.role === "teacher" && !value.disabled && !value.authBusy, 403, "TEACHER_NOT_ALLOWED", "선생님 계정을 확인해 주세요.");
    if (!snap.exists) tx.create(ref, value);
    tx.create(used, { usedAt: Date.now() });
    return value;
  });
  return openSession(account.uid, account.authVersion, "teacher");
}
export async function touchSession(idleForMs: number) {
  const who = await identity();
  return authorized(who, async (tx, account) => {
    account.session!.lastActivityAt = Math.max(account.session!.lastActivityAt, Date.now() - idleForMs);
    tx.update(admin().db.collection("csAccounts").doc(who.uid), { session: account.session });
    return publicSession(account);
  }, true);
}
export async function logout() {
  let who: Identity | null = null;
  try { who = await identity(); } catch (error) { if (!(error instanceof ServiceError) || error.code !== "SIGNED_OUT") throw error; }
  if (who) {
    const current = who; const ref = admin().db.collection("csAccounts").doc(current.uid);
    await admin().db.runTransaction(async (tx) => {
      const account = (await tx.get(ref)).data() as Account | undefined;
      if (account?.session?.hash === hash(current.secret)) tx.update(ref, { session: null });
    });
  }
  // Server-side revocation is authoritative. Do not send an expired Set-Cookie:
  // a delayed logout response from another tab could erase a newer login cookie.
}
export async function changePassword(password: string) {
  requireCondition(password.length >= 8 && password.length <= 128 && /[a-zA-Z]/.test(password) && /\d/.test(password), 400, "PASSWORD_POLICY", "영문과 숫자를 포함해 8자 이상으로 만들어 주세요.");
  requireCondition(!["password1", "password123", "qwerty12", "abc12345", "a1234567", "abcd1234"].includes(password.toLowerCase()) && password !== process.env.CS_INITIAL_PASSWORD && password !== process.env.CS_RESET_PASSWORD, 400, "PASSWORD_COMMON", "쉽게 추측할 수 있는 비밀번호는 피해주세요.");
  const who = await identity(); const { db, auth } = admin(); const ref = db.collection("csAccounts").doc(who.uid); const lock = randomBytes(16).toString("hex");
  await authorized(who, async (tx, account) => {
    requireCondition(account.role === "student" && account.mustChangePassword, 403, "PASSWORD_NOT_REQUIRED", "현재 비밀번호 변경 대상이 아니에요.");
    requireCondition(account.temporaryPassword?.hash !== passwordDigest(password), 400, "PASSWORD_COMMON", "임시 비밀번호와 다른 비밀번호를 사용해 주세요.");
    tx.update(ref, { authBusy: lock, authBusyAt: Date.now() });
  }, true);
  try { await auth.updateUser(who.uid, { password }); }
  catch (error) { await releaseLock(ref.path, lock); throw error; }
  const secret = randomBytes(32).toString("hex");
  const session = await db.runTransaction(async (tx) => {
    const account = (await tx.get(ref)).data() as Account;
    requireCondition(account.authBusy === lock, 409, "ACCOUNT_CHANGED", "계정 정보가 변경됐어요. 다시 로그인해 주세요.");
    const next = { ...account, authBusy: null, authBusyAt: null, authVersion: account.authVersion + 1, mustChangePassword: false, temporaryPassword: null, session: { hash: hash(secret), lastActivityAt: Date.now(), startedAt: Date.now() } };
    tx.set(ref, next); return publicSession(next);
  });
  await setSessionCookie(who.uid, secret); return session;
}
async function releaseLock(path: string, lock: string) {
  const { db } = admin(); const ref = db.doc(path);
  await db.runTransaction(async (tx) => { if ((await tx.get(ref)).data()?.authBusy === lock) tx.update(ref, { authBusy: null, authBusyAt: null }); });
}
export async function resetStudentPassword(uid: string) {
  const who = await identity(); const { db, auth } = admin(); const credential = createTemporaryPassword();
  const ref = db.collection("csAccounts").doc(uid); const lock = randomBytes(16).toString("hex");
  await authorized(who, async (tx, staff) => {
    requireCondition(staff.role !== "student", 403, "FORBIDDEN", "선생님만 초기화할 수 있어요.");
    const student = (await tx.get(ref)).data() as Account | undefined;
    requireCondition(student?.role === "student" && student.classId && staff.classIds.includes(student.classId), 403, "FORBIDDEN", "담당 반의 학생만 관리할 수 있어요.");
    requireCondition(!student.authBusy, 409, "ACCOUNT_BUSY", "이미 계정 정보를 변경하고 있어요.");
    tx.update(ref, { authBusy: lock, authBusyAt: Date.now() });
  });
  try { await auth.updateUser(uid, { password: credential.providerPassword }); }
  catch (error) { await releaseLock(ref.path, lock); throw error; }
  // If token revocation/finalization fails after the provider password changed,
  // keep the account locked instead of reviving an old authenticated session.
  await auth.revokeRefreshTokens(uid);
  await db.runTransaction(async (tx) => {
    const account = (await tx.get(ref)).data() as Account;
    requireCondition(account.authBusy === lock, 409, "ACCOUNT_CHANGED", "계정 상태를 다시 확인해 주세요.");
    tx.update(ref, { authBusy: null, authBusyAt: null, authVersion: account.authVersion + 1, mustChangePassword: true, temporaryPassword: credential.temporaryPassword, session: null });
  });
  return { password: credential.password, expiresAt: credential.temporaryPassword.expiresAt };
}
