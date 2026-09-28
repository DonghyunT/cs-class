import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function isConfigured() { return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_WEB_API_KEY); }
export function admin() {
  if (!isConfigured()) throw new Error("FIREBASE_NOT_CONFIGURED");
  if (process.env.VERCEL && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) throw new Error("EMULATOR_ON_DEPLOYMENT");
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (Boolean(process.env.FIRESTORE_EMULATOR_HOST) !== Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error("EMULATOR_CONFIG_MISMATCH");
  if (emulator && !process.env.FIREBASE_PROJECT_ID?.startsWith("demo-")) throw new Error("EMULATOR_REQUIRES_DEMO_PROJECT");
  let app = getApps().find((value) => value.name === "cs-class");
  if (!app) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, ...(emulator ? {} : { credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault() }) }, "cs-class");
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}
