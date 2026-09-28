import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "cs-class-f74c4" || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run against the approved cloud project without emulator variables.");
const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
const app = initializeApp({ projectId: "cs-class-f74c4", credential });
const db = getFirestore(app);
const classes = await db.collection("csClasses").limit(1).get();
// Counts/flags only: never print profiles, passwords, bearer tokens or private keys.
await getAuth(app).listUsers(1);
const { access_token: token } = await credential.getAccessToken();
const request = async (path) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/cs-class-f74c4/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, data: response.ok ? await response.json() : null };
};
const [config, google] = await Promise.all([request("config"), request("defaultSupportedIdpConfigs/google.com")]);
console.log(JSON.stringify({ project: "cs-class-f74c4", firestoreRead: "ok", authAdminRead: "ok", hasClassRecords: !classes.empty, configStatus: config.status, emailPasswordEnabled: config.data?.signIn?.email?.enabled ?? null, googleEnabled: google.data?.enabled ?? null, googleConfigStatus: google.status, authorizedDomains: config.data?.authorizedDomains ?? [] }));
await db.terminate();
