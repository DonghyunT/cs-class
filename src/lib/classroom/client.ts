"use client";
import type { ClassSettings, Session, StudentDashboard, TeacherDashboard, Work, WorkAction, WorkDraft } from "./types";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
let expectedUser: string | null = null;
let sessionEpoch = 0;
export function setExpectedUser(uid: string | null) { expectedUser = uid; sessionEpoch += 1; }
export async function api<T>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST", boundUid?: string): Promise<T> {
  if (boundUid && boundUid !== expectedUser) throw new ApiError("SESSION_REPLACED", "계정이 바뀌어 이전 작업의 전송을 중단했어요.", 401);
  if (path.startsWith("classroom/") && !expectedUser) throw new ApiError("SIGNED_OUT", "다시 로그인해 주세요.", 401);
  const requestingUser = expectedUser;
  const requestingEpoch = sessionEpoch;
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, { method, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CS-Class": "1", ...(expectedUser ? { "X-CS-User": expectedUser } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new ApiError("NETWORK", "서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.", 0); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new ApiError(payload.code ?? "SERVER", payload.message ?? "처리하지 못했어요. 잠시 후 다시 시도해 주세요.", response.status);
    if (response.status === 401 && requestingUser === expectedUser && requestingEpoch === sessionEpoch && !path.startsWith("auth/login") && path !== "auth/google") window.dispatchEvent(new CustomEvent("cs-session-ended", { detail: error.message }));
    throw error;
  }
  return payload as T;
}
export const classroomApi = {
  session: () => api<{ session: Session | null; configured: boolean; reason?: string }>("auth/session"),
  login: (role: "student" | "instructor", studentId: string, password: string) => api<{ session: Session }>("auth/login", { role, studentId, password }),
  google: (idToken: string) => api<{ session: Session }>("auth/google", { idToken }),
  changePassword: (password: string) => api<{ session: Session }>("auth/password", { password }),
  touch: (idleForMs = 0) => api<{ session: Session }>("auth/activity", { idleForMs }),
  logout: () => api<{ ok: boolean }>("auth/logout", {}),
  student: () => api<StudentDashboard>("classroom/student"),
  teacher: (classId?: string, lessonId?: string) => api<TeacherDashboard>(`classroom/teacher?${new URLSearchParams({ ...(classId ? { classId } : {}), ...(lessonId ? { lessonId } : {}) })}`),
  updateClass: (classId: string, revision: number, currentLessonId: string | null, openedLessonIds: string[], expectedUid?: string) => api<ClassSettings>(`classroom/classes/${encodeURIComponent(classId)}`, { revision, currentLessonId, openedLessonIds }, "POST", expectedUid),
  resetPassword: (uid: string, expectedUid?: string) => api<{ ok: boolean }>(`classroom/students/${encodeURIComponent(uid)}/reset`, {}, "POST", expectedUid),
  work: (lessonId: string) => api<Work>(`classroom/work/${encodeURIComponent(lessonId)}`),
  saveWork: (lessonId: string, revision: number, draft: WorkDraft, expectedUid?: string) => api<Work>(`classroom/work/${encodeURIComponent(lessonId)}`, { revision, draft }, "POST", expectedUid),
  act: (lessonId: string, revision: number, action: WorkAction, expectedUid?: string) => api<Work>(`classroom/work/${encodeURIComponent(lessonId)}/action`, { revision, action }, "POST", expectedUid),
};
