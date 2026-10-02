import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";

if (process.env.VERCEL || process.env.FIREBASE_PROJECT_ID !== "demo-cs-class" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080") throw new Error("Local demo emulators are required. Cloud seeding is not permitted by this script.");
const app = initializeApp({ projectId: "demo-cs-class" }); const auth = getAuth(app); const db = getFirestore(app);
const initial = process.env.CS_INITIAL_PASSWORD; const reset = process.env.CS_RESET_PASSWORD;
if (!initial || !reset || initial === reset || !process.env.CS_TEST_GUEST_PASSWORD) throw new Error("Emulator passwords must be provided; initial and reset passwords must differ.");
for (let i = 1; i <= 11; i++) {
  const id = `2-${i}`;
  const opened = i === 1 || i === 10;
  await db.collection("csClasses").doc(id).set({ id, name: `2학년 ${i}반`, currentLessonId: i === 1 ? "entry-bot-lab" : i === 10 ? "sequence-lab" : null, openedLessonIds: opened ? ["sequence-lab", "flowchart-lab", "entry-bot-lab"] : [], revision: 0 });
}
for (const studentId of ["20101", "20102", "21001", "21101"]) {
  const uid = `student-${studentId}`;
  try { await auth.createUser({ uid, email: `s-${studentId}@cs-class.invalid`, password: initial }); }
  catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser(uid, { password: initial, disabled: false }); }
  await db.collection("csAccounts").doc(uid).set({ uid, role: "student", studentId, classId: `2-${Number(studentId.slice(1, 3))}`, classIds: [], mustChangePassword: true, temporaryPassword: { hash: passwordDigest(initial), expiresAt: Date.now() + 30 * 60_000 }, disabled: false, authVersion: 0, authBusy: null, session: null });
}
try { await auth.createUser({ uid: "instructor", email: "instructor@cs-class.invalid", password: process.env.CS_TEST_INSTRUCTOR_PASSWORD }); }
catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser("instructor", { password: process.env.CS_TEST_INSTRUCTOR_PASSWORD }); }
await db.collection("csAccounts").doc("instructor").set({ uid: "instructor", role: "instructor", studentId: null, classId: null, classIds: ["2-10", "2-11"], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null });
for (const guest of [
  { uid: "student-21099", email: "s-21099@cs-class.invalid", role: "student", studentId: "21099" },
  { uid: "guest-teacher", email: "guest-teacher@cs-class.invalid", role: "teacher", studentId: null },
]) {
  try { await auth.createUser({ uid: guest.uid, email: guest.email, password: process.env.CS_TEST_GUEST_PASSWORD }); }
  catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser(guest.uid, { password: process.env.CS_TEST_GUEST_PASSWORD, disabled: false }); }
  await db.collection("csAccounts").doc(guest.uid).set({ uid: guest.uid, role: guest.role, studentId: guest.studentId, classId: guest.role === "student" ? "2-10" : null, classIds: guest.role === "teacher" ? ["2-10"] : [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null });
}
console.log("Local emulator ready: 11 class records, 4 synthetic students, 1 instructor, 2 guest accounts. No cloud writes.");
