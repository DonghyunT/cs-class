import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (process.env.FIREBASE_PROJECT_ID !== "cs-class-f74c4" || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Only the approved cloud project is supported.");
const apply = process.argv.includes("--apply");
const credential = applicationDefault();
const db = getFirestore(initializeApp({ projectId: "cs-class-f74c4", credential }));
const refs = Array.from({ length: 11 }, (_, i) => db.collection("csClasses").doc(`2-${i + 1}`));
const snapshots = await db.getAll(...refs);
console.log(JSON.stringify({ project: "cs-class-f74c4", mode: apply ? "apply" : "plan", newEmptyClasses: snapshots.filter((s) => !s.exists).map((s) => s.id), existingClassesPreserved: snapshots.filter((s) => s.exists).length, enableEmailPassword: true, studentAccountsCreated: 0 }));
if (apply) {
  const { access_token: token } = await credential.getAccessToken();
  const response = await fetch("https://identitytoolkit.googleapis.com/admin/v2/projects/cs-class-f74c4/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }) });
  if (!response.ok) throw new Error(`Could not enable password sign-in: HTTP ${response.status}`);
  await db.runTransaction(async (tx) => {
    const latest = await tx.getAll(...refs);
    for (const snapshot of latest) if (!snapshot.exists) tx.create(snapshot.ref, { id: snapshot.id, name: `2학년 ${snapshot.id.split("-")[1]}반`, currentLessonId: null, openedLessonIds: [], revision: 0 });
  });
  console.log("Email/password sign-in enabled; missing empty classes created. No student accounts or existing records changed.");
}
await db.terminate();
