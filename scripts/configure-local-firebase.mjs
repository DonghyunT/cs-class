import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

// Local setup only. Does not create cloud accounts, deploy rules or copy the key.
const credentialPath = process.argv[2];
const teacherEmail = process.argv[3];
if (!credentialPath || !teacherEmail?.includes("@")) throw new Error("Usage: node scripts/configure-local-firebase.mjs <credential-json-path> <teacher-email>");
const path = resolve(credentialPath);
const credential = JSON.parse(await readFile(path, "utf8"));
if (credential.type !== "service_account" || credential.project_id !== "cs-class-f74c4" || !credential.private_key || !credential.client_email) throw new Error("A service account for cs-class-f74c4 is required.");
const cli = spawnSync(process.execPath, ["node_modules/firebase-tools/lib/bin/firebase.js", "apps:sdkconfig", "WEB", "1:360756338861:web:d9bc80594bd573f537e624", "--project", "cs-class-f74c4", "--json"], { encoding: "utf8" });
if (cli.status !== 0) throw new Error("Could not read this project's public SDK configuration. Check Firebase CLI login.");
const config = JSON.parse(cli.stdout).result.sdkConfig;
if (config.projectId !== "cs-class-f74c4" || !config.apiKey) throw new Error("Unexpected project configuration.");
const secret = () => `Cs${randomBytes(16).toString("hex")}9`;
const fields = {
  FIREBASE_PROJECT_ID: config.projectId, FIREBASE_WEB_API_KEY: config.apiKey,
  FIREBASE_AUTH_DOMAIN: config.authDomain,
  GOOGLE_APPLICATION_CREDENTIALS: path.replaceAll("\\", "/"),
  CS_TEACHER_EMAILS: teacherEmail, CS_INITIAL_PASSWORD: secret(), CS_RESET_PASSWORD: secret(),
};
for (const value of Object.values(fields)) if (/["\r\n]/.test(value)) throw new Error("Unsupported configuration value.");
await writeFile(".env.local", Object.entries(fields).map(([name, value]) => `${name}="${value}"`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
console.log("Created ignored .env.local. The private key stays at its original path. Existing settings are never overwritten.");
