import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createTemporaryPassword } from "../src/lib/server/temporary-password.mjs";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Operator recovery, not a public endpoint. Stop the app before applying so an
// old provider request cannot finish after the recovery reset.
const studentId = process.argv[2];
if (!/^2\d{4}$/.test(studentId ?? "")) throw new Error("Usage: node --env-file=.env.local scripts/recover-account.mjs <student-id> [--apply-app-stopped --credential-file <private-new-file>]");
const projectId = process.env.FIREBASE_PROJECT_ID;
const emulator = projectId === "demo-cs-class" && process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" && process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080";
if (projectId !== "cs-class-f74c4" && !emulator) throw new Error("Unexpected project.");
if (!emulator && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) throw new Error("Mixed cloud/emulator environment.");
const app = initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });
const db = getFirestore(app); const auth = getAuth(app); const ref = db.collection("csAccounts").doc(`student-${studentId}`);
const original = (await ref.get()).data();
if (original?.role !== "student" || !original.authBusy) throw new Error("No locked student account to recover.");
const apply = process.argv.includes("--apply-app-stopped");
console.log(JSON.stringify({ projectId, lockedAt: original.authBusyAt ?? null, mode: apply ? "recover" : "plan", preservesWork: true }));
if (apply) {
  const fileIndex = process.argv.indexOf("--credential-file");
  const credentialFile = fileIndex >= 0 ? process.argv[fileIndex + 1] : null;
  if (!credentialFile || credentialFile.startsWith("--")) throw new Error("Provide --credential-file <private-new-file>; passwords are never printed.");
  const credential = createTemporaryPassword();
  // 먼저 전달 파일을 확보합니다. 실패하면 계정을 변경하지 않습니다. 재시도는 새 파일을 사용합니다.
  await writeFile(credentialFile, JSON.stringify({ uid: original.uid, password: credential.password, expiresAt: credential.temporaryPassword.expiresAt }), { flag: "wx", mode: 0o600 });
  const lock = randomUUID();
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (latest?.authBusy !== original.authBusy || latest?.role !== "student") throw new Error("Account changed; inspect again.");
    tx.update(ref, { authBusy: lock, authBusyAt: Date.now(), session: null });
  });
  // Keep the new lock if any provider or finalization step fails. Rerunning this
  // recovery after the service is healthy resets again, rather than reviving a token.
  await auth.updateUser(original.uid, { password: credential.providerPassword });
  await auth.revokeRefreshTokens(original.uid);
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (latest?.authBusy !== lock) throw new Error("Account changed during recovery.");
    tx.update(ref, { authBusy: null, authBusyAt: null, authVersion: latest.authVersion + 1, mustChangePassword: true, temporaryPassword: credential.temporaryPassword, session: null });
  });
  console.log("Recovered the locked student; next login requires a new password. Learning records preserved.");
}
await db.terminate();
