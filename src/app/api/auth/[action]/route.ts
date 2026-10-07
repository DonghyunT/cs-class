import { z } from "zod";
import { body, failure, json } from "@/lib/server/http";
import { isConfigured } from "@/lib/server/firebase";
import { changePassword, changeOwnPassword, loginGoogle, loginGuest, loginPassword, logout, readProfile, readSession, touchSession, updateNickname } from "@/lib/server/auth";
import { ServiceError } from "@/lib/server/errors";
import { guestLoginEnabled } from "@/lib/server/guest-mode";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    if (action === "config") return json({ configured: isConfigured(), apiKey: process.env.FIREBASE_WEB_API_KEY ?? "", projectId: process.env.FIREBASE_PROJECT_ID ?? "", authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "", emulatorHost: process.env.VERCEL ? null : process.env.FIREBASE_AUTH_EMULATOR_HOST ?? null, guestLoginEnabled: guestLoginEnabled() });
    if (action === "profile") return json(await readProfile());
    if (action !== "session") return json({ message: "찾을 수 없는 요청입니다." }, 404);
    if (!isConfigured()) return json({ session: null, configured: false });
    try { return json({ session: await readSession(), configured: true }); }
    catch (error) {
      if (error instanceof ServiceError && error.status === 401) return json({ session: null, configured: true, reason: error.code });
      throw error;
    }
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const input = await body(request); const { action } = await context.params;
    if (action === "guest") return json({ session: await loginGuest(z.object({ role: z.enum(["student", "teacher"]) }).strict().parse(input).role) });
    if (!isConfigured()) return json({ code: "NOT_CONFIGURED", message: "아직 로그인 서비스를 연결하고 있어요. 선생님께 알려 주세요." }, 503);
    if (action === "login") {
      const parsed = z.object({ role: z.enum(["student", "instructor"]), studentId: z.string().regex(/^$|^2\d{4}$/), password: z.string().min(1).max(128) }).strict().parse(input);
      return json({ session: await loginPassword(parsed.role, parsed.studentId, parsed.password) });
    }
    if (action === "google") return json({ session: await loginGoogle(z.object({ idToken: z.string().min(20).max(15000) }).strict().parse(input).idToken) });
    if (action === "password") return json({ session: await changePassword(z.object({ password: z.string().max(128) }).strict().parse(input).password) });
    if (action === "profile") return json({ session: await updateNickname(z.object({ nickname: z.string().max(128) }).strict().parse(input).nickname) });
    if (action === "password-self") {
      const parsed = z.object({ currentPassword: z.string().min(1).max(128), password: z.string().max(128) }).strict().parse(input);
      return json({ session: await changeOwnPassword(parsed.currentPassword, parsed.password) });
    }
    if (action === "activity") return json({ session: await touchSession(z.object({ idleForMs: z.number().int().min(0).max(60000) }).strict().parse(input).idleForMs) });
    if (action === "logout") { await logout(); return json({ ok: true }); }
    return json({ message: "찾을 수 없는 요청입니다." }, 404);
  } catch (error) { return failure(error); }
}
