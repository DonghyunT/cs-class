import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "demo-cs-class" || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Local demo emulators are required. Cloud seeding is not permitted by this script.");
const app = initializeApp({ projectId: "demo-cs-class" }); const auth = getAuth(app); const db = getFirestore(app);
const initial = process.env.CS_INITIAL_PASSWORD; const reset = process.env.CS_RESET_PASSWORD;
if (!initial || !reset || initial === reset) throw new Error("Distinct emulator passwords must be provided.");
for (let i = 1; i <= 11; i++) {
  const id = `2-${i}`;
  await db.collection("csClasses").doc(id).set({ id, name: `2학년 ${i}반`, currentLessonId: i === 1 ? "sequence-lab" : null, openedLessonIds: i === 1 ? ["sequence-lab"] : [], revision: 0 });
}
for (const studentId of ["20101", "20102", "21001", "21101"]) {
  const uid = `student-${studentId}`;
  try { await auth.createUser({ uid, email: `s-${studentId}@cs-class.invalid`, password: initial }); }
  catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser(uid, { password: initial, disabled: false }); }
  await db.collection("csAccounts").doc(uid).set({ uid, role: "student", studentId, classId: `2-${Number(studentId.slice(1, 3))}`, classIds: [], mustChangePassword: true, disabled: false, authVersion: 0, authBusy: null, session: null });
}
try { await auth.createUser({ uid: "instructor", email: "instructor@cs-class.invalid", password: process.env.CS_TEST_INSTRUCTOR_PASSWORD }); }
catch (error) { if (error.code !== "auth/uid-already-exists") throw error; await auth.updateUser("instructor", { password: process.env.CS_TEST_INSTRUCTOR_PASSWORD }); }
await db.collection("csAccounts").doc("instructor").set({ uid: "instructor", role: "instructor", studentId: null, classId: null, classIds: ["2-10", "2-11"], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null });
console.log("Local emulator ready: 11 empty class records, 4 synthetic student accounts, 1 instructor. No cloud writes.");
