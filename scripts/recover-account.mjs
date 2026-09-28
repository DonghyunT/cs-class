import { randomUUID } from "node:crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Operator recovery, not a public endpoint. Stop the app before applying so an
// old provider request cannot finish after the recovery reset.
const studentId = process.argv[2];
if (!/^2\d{4}$/.test(studentId ?? "")) throw new Error("Usage: node --env-file=.env.local scripts/recover-account.mjs <student-id> [--apply-app-stopped]");
const projectId = process.env.FIREBASE_PROJECT_ID;
const emulator = projectId === "demo-cs-class" && process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" && process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080";
if (projectId !== "cs-class-f74c4" && !emulator) throw new Error("Unexpected project.");
if (!emulator && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) throw new Error("Mixed cloud/emulator environment.");
const password = process.env.CS_RESET_PASSWORD;
if (!password || password.length < 6 || password === process.env.CS_INITIAL_PASSWORD) throw new Error("Configure a distinct reset password.");
const app = initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });
const db = getFirestore(app); const auth = getAuth(app); const ref = db.collection("csAccounts").doc(`student-${studentId}`);
const original = (await ref.get()).data();
if (original?.role !== "student" || !original.authBusy) throw new Error("No locked student account to recover.");
const apply = process.argv.includes("--apply-app-stopped");
console.log(JSON.stringify({ projectId, lockedAt: original.authBusyAt ?? null, mode: apply ? "recover" : "plan", preservesWork: true }));
if (apply) {
  const lock = randomUUID();
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (latest?.authBusy !== original.authBusy || latest?.role !== "student") throw new Error("Account changed; inspect again.");
    tx.update(ref, { authBusy: lock, authBusyAt: Date.now(), session: null });
  });
  // Keep the new lock if any provider or finalization step fails. Rerunning this
  // recovery after the service is healthy resets again, rather than reviving a token.
  await auth.updateUser(original.uid, { password });
  await auth.revokeRefreshTokens(original.uid);
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (latest?.authBusy !== lock) throw new Error("Account changed during recovery.");
    tx.update(ref, { authBusy: null, authBusyAt: null, authVersion: latest.authVersion + 1, mustChangePassword: true, session: null });
  });
  console.log("Recovered the locked student; next login requires a new password. Learning records preserved.");
}
await db.terminate();
