import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Reserved synthetic fixtures, never an actual student's account. Refuse any
// collision and clean up only the resources this invocation created.
const projectId = "cs-class-f74c4";
if (process.env.FIREBASE_PROJECT_ID !== projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Expected the approved cloud project, without emulators.");
const base = "http://127.0.0.1:3001";
const config = await (await fetch(`${base}/api/auth/config`)).json();
assert.equal(config.projectId, projectId); assert.equal(config.emulatorHost, null);
const app = initializeApp({ projectId, credential: applicationDefault() }); const auth = getAuth(app); const db = getFirestore(app);
const ids = ["instructor", "student-21199"];
const existing = await auth.getUsers(ids.map((uid) => ({ uid })));
assert.equal(existing.users.length, 0, "Reserved test identity already exists; no changes made.");
for (const uid of ids) assert.equal((await db.collection("csAccounts").doc(uid).get()).exists, false, "Reserved test profile already exists.");
const classRef = db.collection("csClasses").doc("2-11"); const initialClass = (await classRef.get()).data();
assert.ok(initialClass); assert.equal(initialClass.currentLessonId, null); assert.equal(initialClass.openedLessonIds.length, 0);
const workRef = db.collection("csWork").doc("student-21199__sequence-lab"); assert.equal((await workRef.get()).exists, false);
console.log(JSON.stringify({ projectId, mode: process.argv.includes("--apply") ? "temporary-cloud-test" : "plan", temporaryAccounts: 2, realStudentAccounts: 0, restoresEmptyClass: "2-11", removesTemporaryAccountsAfterward: true }));
if (!process.argv.includes("--apply")) { await db.terminate(); process.exit(0); }
const password = `Cloud${randomBytes(12).toString("hex")}9`;
const changedPassword = `Own${randomBytes(12).toString("hex")}8`;
const created = []; const profilesCreated = []; const rateRefs = ids.map((id) => db.collection("csRateLimits").doc(createHash("sha256").update(id).digest("hex")));
const originalRates = await db.getAll(...rateRefs);
let changedRevision = null; let verified = false;
const client = () => {
  let cookie = "";
  return async (path, data) => {
    const response = await fetch(`${base}/api/${path}`, { method: data === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", "X-CS-Class": "1", ...(cookie ? { Cookie: cookie } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
    const setCookie = response.headers.getSetCookie().find((value) => value.startsWith("cs_session="));
    if (setCookie) cookie = setCookie.split(";")[0];
    const result = await response.json();
    if (!response.ok) throw new Error(`Cloud flow ${path}: HTTP ${response.status}, ${result.code ?? "unknown"}`);
    return result;
  };
};
try {
  for (const uid of ids) {
    const student = uid.startsWith("student-");
    await auth.createUser({ uid, email: student ? "s-21199@cs-class.invalid" : "instructor@cs-class.invalid", password, displayName: "CS Class temporary connection check" });
    created.push(uid);
    await db.collection("csAccounts").doc(uid).create({ uid, role: student ? "student" : "instructor", studentId: student ? "21199" : null, classId: student ? "2-11" : null, classIds: student ? [] : ["2-10", "2-11"], disabled: false, mustChangePassword: student, authVersion: 0, authBusy: null, session: null });
    profilesCreated.push(uid);
  }
  const teacher = client(); const student = client();
  await teacher("auth/login", { role: "instructor", studentId: "", password });
  const setting = await teacher("classroom/classes/2-11", { revision: initialClass.revision, currentLessonId: "sequence-lab", openedLessonIds: ["sequence-lab"] }); changedRevision = setting.revision;
  await student("auth/login", { role: "student", studentId: "21199", password });
  await student("auth/password", { password: changedPassword });
  const endpoint = "classroom/work/sequence-lab";
  let work = await student(endpoint);
  const save = async () => { work = await student(endpoint, { revision: work.revision, draft: work.draft }); };
  const act = async (action) => { work = await student(`${endpoint}/action`, { revision: work.revision, action }); };
  work.draft.conceptAnswers = { algorithm: "clear", sequence: "save" }; await save();
  await act({ type: "check-concept", conceptId: "algorithm" }); await act({ type: "check-concept", conceptId: "sequence" });
  work.draft.quizAnswers = { q1: "a", q2: "b", q3: "c" }; work.draft.stage = "practice"; await save(); await act({ type: "grade-quiz" });
  work.draft.practiceOrder = ["start", "input", "greeting", "output", "end"]; await save(); await act({ type: "validate-practice" }); await act({ type: "submit-practice" });
  assert.equal(work.conceptSolved.length, 2); assert.equal(work.quizSolved.length, 3); assert.ok(work.submission);
  const resumed = client(); await resumed("auth/login", { role: "student", studentId: "21199", password: changedPassword });
  assert.deepEqual(await resumed(endpoint), work);
  const dashboard = await teacher("classroom/teacher?classId=2-11");
  assert.equal(dashboard.students.find((item) => item.uid === "student-21199").work.submission.id, work.submission.id);
  const direct = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/csWork/student-21199__sequence-lab?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY)}`);
  assert.equal(direct.status, 403);
  verified = true;
} finally {
  if (created.includes("student-21199")) await workRef.delete();
  for (const uid of created) await auth.deleteUser(uid);
  for (const uid of profilesCreated) await db.collection("csAccounts").doc(uid).delete();
  for (let index = 0; index < originalRates.length; index++) {
    if (originalRates[index].exists) await rateRefs[index].set(originalRates[index].data());
    else await rateRefs[index].delete();
  }
  let restored = changedRevision === null;
  if (changedRevision !== null) restored = await db.runTransaction(async (tx) => {
    const latest = (await tx.get(classRef)).data();
    if (latest.revision !== changedRevision) return false;
    tx.set(classRef, initialClass); return true;
  });
  console.log(JSON.stringify({ verified, temporaryAccountsRemoved: created.length, emptyClassRestored: restored }));
  await db.terminate();
}
