export function guestLoginEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return !env.VERCEL && env.FIREBASE_PROJECT_ID === "demo-cs-class"
    && env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099"
    && env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080"
    && Boolean(env.CS_TEST_GUEST_PASSWORD);
}
