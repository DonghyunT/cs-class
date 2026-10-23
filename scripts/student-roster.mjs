import { createHash, randomBytes, randomUUID } from "node:crypto";
import { open, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createTemporaryPassword } from "../src/lib/server/temporary-password.mjs";

// Operator CLI. The default is a read-only plan; credentials never reach stdout.
const flags = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (!["--csv", "--year", "--mode", "--class", "--output", "--confirm-project", "--apply", "--resume"].includes(flag) || flags.has(flag)) throw Error("Unknown or repeated option.");
  const value = ["--apply", "--resume"].includes(flag) ? true : process.argv[++i];
  if (!value || String(value).startsWith("--")) throw Error("Missing option value.");
  flags.set(flag, value);
}
const mode = flags.get("--mode") ?? "plan", year = Number(flags.get("--year"));
if (!["validate", "plan", "register", "issue", "backup"].includes(mode) || !Number.isInteger(year) || year < 2026 || year > 2100 || !flags.get("--csv")) throw Error("Use --csv <file> --year <year> [--mode validate|plan|register|issue|backup].");
if (flags.has("--apply") && !["register", "issue", "backup"].includes(mode)) throw Error("This mode does not apply changes.");
if (flags.has("--resume") && mode !== "register") throw Error("Resume is only for an interrupted registration owned by this roster.");
const text = (await readFile(flags.get("--csv"), "utf8")).replace(/^\uFEFF/, "");
if (Buffer.byteLength(text) > 64000) throw Error("Roster too large.");
const lines = text.trim().split(/\r?\n/);
if (lines.shift()?.replaceAll('"', "") !== "학년,반,번호,학번") throw Error("CSV header must be 학년,반,번호,학번. Do not include names or passwords.");
const rows = lines.map((line, i) => {
  const fields = line.split(",").map((v) => /^"\d+"$/.test(v) ? v.slice(1, -1) : v);
  const [grade, classroom, number] = fields.slice(0, 3).map(Number), studentId = fields[3];
  if (fields.length !== 4 || fields.some((v) => !/^\d+$/.test(v)) || grade !== 2 || classroom < 1 || classroom > 11 || number < 1 || number > 27 || studentId !== `2${String(classroom).padStart(2, "0")}${String(number).padStart(2, "0")}`) throw Error(`Invalid roster row ${i + 2}.`);
  return { studentId, classId: `2-${classroom}`, uid: `student-${studentId}`, email: `s-${studentId}@cs-class.invalid` };
});
if (!rows.length || rows.length > 297 || new Set(rows.map((r) => r.uid)).size !== rows.length) throw Error("Empty, oversized or duplicate roster.");
const rosterHash = createHash("sha256").update(JSON.stringify(rows.map((r) => r.studentId).sort())).digest("hex");
const marker = `CSClass:${year}:${rosterHash.slice(0, 24)}`;
const selected = flags.get("--class");
if (selected && !/^2-(?:[1-9]|10|11)$/.test(selected)) throw Error("Class must be 2-1 through 2-11.");
const target = rows.filter((r) => !selected || r.classId === selected);
if (!target.length) throw Error("No rows for the selected class.");
if (mode === "issue" && !selected) throw Error("Issue one class immediately before its lesson with --class 2-N.");
const summary = { mode, year, total: rows.length, selectedCount: target.length, counts: Object.fromEntries([...new Set(rows.map((r) => r.classId))].map((id) => [id, rows.filter((r) => r.classId === id).length])), rosterHash };
if (mode === "validate") { console.log(JSON.stringify(summary)); process.exit(0); }

const projectId = process.env.FIREBASE_PROJECT_ID;
const emulator = projectId === "demo-cs-class" && process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" && process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080";
if (process.env.VERCEL || (!emulator && projectId !== "cs-class-f74c4") || (!emulator && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST))) throw Error("Unexpected project or mixed cloud/emulator environment.");
if (flags.has("--apply") && flags.get("--confirm-project") !== projectId) throw Error("Applying requires --confirm-project with the actual project ID.");
const accountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let serviceAccount;
if (!emulator && accountJson) { try { serviceAccount = JSON.parse(accountJson); } catch { throw Error("Invalid service account configuration."); } if (serviceAccount.project_id !== projectId) throw Error("Service account project mismatch."); }
const app = initializeApp({ projectId, ...(emulator ? {} : { credential: serviceAccount ? cert(serviceAccount) : applicationDefault() }) });
const db = getFirestore(app), auth = getAuth(app);
const accounts = db.collection("csAccounts");
const owned = (data) => data?.role === "student" && data?.roster?.year === year && data.roster.hash === rosterHash;
const getUser = async (uid) => { try { return await auth.getUser(uid); } catch (e) { if (e.code === "auth/user-not-found") return null; throw e; } };
let file;
try {
  // Inspect every target before changing any account. Existing unrelated or
  // cross-year records are never adopted or overwritten, even if IDs match.
  const plans = [];
  let offList = 0;
  for (const row of target) {
    const profile = (await accounts.doc(row.uid).get()).data(), provider = await getUser(row.uid);
    if (!(await db.collection("csClasses").doc(row.classId).get()).exists) throw Error("Class settings missing; prepare classes first.");
    if ((profile || provider) && (!owned(profile) || profile.studentId !== row.studentId || profile.classId !== row.classId || provider && provider.email !== row.email)) throw Error("Existing account conflict; inspect privately. No accounts changed.");
    if (profile?.authBusy && !(mode === "register" && flags.has("--resume") && profile.authBusy === marker && (!provider || provider.displayName === marker))) throw Error("Interrupted account found; inspect the registration or password recovery procedure first.");
    if (profile && !provider && !profile.authBusy) throw Error("Provider account missing; inspect privately.");
    if (provider && profile?.authBusy && provider.displayName !== marker) throw Error("Provider ownership mismatch.");
    if (!provider) { const collision = await auth.getUserByEmail(row.email).catch((e) => { if (e.code === "auth/user-not-found") return null; throw e; }); if (collision) throw Error("Provider email collision; inspect privately. No accounts changed."); }
    // Students the teacher took off the class list (e.g. transferred) get no new password.
    if (mode === "issue" && profile?.disabled && !profile.authBusy) { offList += 1; continue; }
    plans.push({ row, profile });
  }
  console.log(JSON.stringify({ ...summary, projectId, offList, existing: plans.filter((p) => p.profile).length, pending: plans.filter((p) => p.profile?.authBusy).length, new: plans.filter((p) => !p.profile).length, apply: flags.has("--apply") }));
  if (!flags.has("--apply")) process.exitCode = 0;
  else {
    if (mode === "issue" && plans.some((p) => !p.profile || !p.profile.mustChangePassword || p.profile.disabled || p.profile.authBusy)) throw Error("Issue only active registered students who still need their personal password. Use the teacher reset for an individual existing student.");
    if (["issue", "backup"].includes(mode)) {
      if (!flags.get("--output")) throw Error("Provide a new private --output file.");
      // Resolve the parent first to reject symlink escapes and acquire a new file
      // before any password mutation. Directory ACLs are the operator's duty.
      const parent = await realpath(path.dirname(path.resolve(flags.get("--output"))));
      const privateRoot = await realpath(path.resolve("private"));
      const relative = path.relative(privateRoot, parent);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw Error("Output must be inside this repository's ignored private directory.");
      file = await open(path.join(parent, path.basename(flags.get("--output"))), "wx", 0o600);
    }
    if (mode === "register") {
      for (const { row, profile } of plans) {
        if (profile && !profile.authBusy) continue;
        const ref = accounts.doc(row.uid);
        if (!profile) await ref.create({ uid: row.uid, role: "student", studentId: row.studentId, classId: row.classId, classIds: [], mustChangePassword: true, temporaryPassword: null, disabled: true, authVersion: 0, authBusy: marker, authBusyAt: Date.now(), session: null, roster: { year, hash: rosterHash } });
        let provider = await getUser(row.uid);
        if (!provider) {
          const collision = await auth.getUserByEmail(row.email).catch((e) => { if (e.code === "auth/user-not-found") return null; throw e; });
          if (collision) throw Error("Provider email collision; registration is locked for inspection.");
          provider = await auth.createUser({ uid: row.uid, email: row.email, displayName: marker, disabled: true, password: randomBytes(32).toString("hex") });
        }
        if (provider.displayName !== marker || provider.email !== row.email) throw Error("Provider ownership mismatch; registration remains locked.");
        await auth.updateUser(row.uid, { disabled: false });
        await db.runTransaction(async (tx) => {
          const latest = (await tx.get(ref)).data();
          if (!owned(latest) || latest.authBusy !== marker) throw Error("Registration changed; inspect privately.");
          tx.update(ref, { disabled: false, authBusy: null, authBusyAt: null });
        });
      }
      console.log("Registration complete. No temporary passwords issued; existing learning records preserved.");
    } else if (mode === "issue") {
      await file.write(JSON.stringify({ projectId, year, rosterHash, classId: selected, createdAt: Date.now(), expiresInMinutes: 30 }) + "\n"); await file.sync();
      for (const { row } of plans) {
        const ref = accounts.doc(row.uid), lock = randomUUID(), credential = createTemporaryPassword();
        // Each line is durable before touching Auth. A failed line is marked by
        // the absence of an issued confirmation; never hand out pending lines.
        await file.write(JSON.stringify({ status: "pending", studentId: row.studentId, password: credential.password, expiresAt: credential.temporaryPassword.expiresAt }) + "\n"); await file.sync();
        await db.runTransaction(async (tx) => {
          const latest = (await tx.get(ref)).data();
          if (!owned(latest) || !latest.mustChangePassword || latest.disabled || latest.authBusy) throw Error("Account changed before issue.");
          tx.update(ref, { authBusy: lock, authBusyAt: Date.now(), session: null });
        });
        await auth.updateUser(row.uid, { password: credential.providerPassword }); await auth.revokeRefreshTokens(row.uid);
        await db.runTransaction(async (tx) => {
          const latest = (await tx.get(ref)).data();
          if (latest?.authBusy !== lock) throw Error("Account changed during issue; inspect recovery.");
          tx.update(ref, { authBusy: null, authBusyAt: null, temporaryPassword: credential.temporaryPassword, authVersion: latest.authVersion + 1, session: null });
        });
        await file.write(JSON.stringify({ status: "issued", studentId: row.studentId }) + "\n"); await file.sync();
      }
      console.log("Class credentials issued to the private file. Share only confirmed lines with each student; expires in 30 minutes.");
    } else if (mode === "backup") {
      const classes = [], profiles = [], work = [];
      for (const classId of new Set(target.map((r) => r.classId))) classes.push({ id: classId, data: (await db.collection("csClasses").doc(classId).get()).data() });
      for (const { row } of plans) {
        const data = (await accounts.doc(row.uid).get()).data();
        if (data) { const { temporaryPassword, session, authBusy, ...safe } = data; void temporaryPassword; void session; void authBusy; profiles.push({ id: row.uid, data: safe }); }
        const records = await db.collection("csWork").where("uid", "==", row.uid).get();
        records.forEach((record) => work.push({ id: record.id, data: record.data() }));
      }
      await file.write(JSON.stringify({ version: 1, projectId, year, rosterHash, capturedAt: Date.now(), consistentSnapshot: false, scope: "class settings, selected student profiles without credentials/session, selected csWork; excludes Auth and planner", classes, profiles, work })); await file.sync();
      console.log("Private learning backup written. Pause classroom edits for a consistent capture; restore requires separate review.");
    }
  }
} catch (e) {
  // No SDK diagnostics, input values, passwords or raw profile bodies in logs.
  console.error(e.code ? `Student operation failed (${String(e.code).replace(/[^\w/.-]/g, "").slice(0, 80)}). Inspect locks and private output before retrying.` : e.message);
  process.exitCode = 1;
} finally { await file?.close(); await db.terminate(); }
