"use client";
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut, type Auth } from "firebase/auth";
import { api, ApiError, classroomApi } from "./client";
let ready: Promise<Auth> | null = null;
export function prepareGoogleLogin() {
  if (!ready) ready = (async () => {
    const config = await api<{ configured: boolean; apiKey: string; projectId: string; authDomain: string; emulatorHost: string | null }>("auth/config");
    if (!config.configured) throw new ApiError("NOT_CONFIGURED", "로그인 서비스 연결을 준비하고 있어요.", 503);
    const app = getApps().find((value) => value.name === "cs-class-browser") ?? initializeApp({ apiKey: config.apiKey, projectId: config.projectId, authDomain: config.authDomain }, "cs-class-browser");
    const auth = getAuth(app);
    if (config.emulatorHost && !auth.emulatorConfig) connectAuthEmulator(auth, `http://${config.emulatorHost}`, { disableWarnings: true });
    await setPersistence(auth, inMemoryPersistence);
    return auth;
  })().catch((error) => { ready = null; throw error; });
  return ready;
}
export async function googleLogin() {
  const auth = await prepareGoogleLogin();
  const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    return await classroomApi.google(await result.user.getIdToken());
  } finally { await signOut(auth).catch(() => undefined); }
}
