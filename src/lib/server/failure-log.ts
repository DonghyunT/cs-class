import { randomUUID } from "node:crypto";

export const failureOperations = [
  "server.request", "auth.request", "auth.config", "auth.session", "auth.profile.read",
  "auth.guest", "auth.login", "auth.google", "auth.password.initial", "auth.profile.update",
  "auth.password.change", "auth.activity", "auth.logout", "classroom.request",
  "classroom.community.list", "classroom.community.read", "classroom.community.create",
  "classroom.community.reply", "classroom.community.resolve", "classroom.community.delete",
  "classroom.help.list", "classroom.help.snapshot", "classroom.help.raise", "classroom.help.cancel",
  "classroom.help.resolve", "classroom.todos.read", "classroom.todos.save", "classroom.schedule.read",
  "classroom.schedule.save", "classroom.student.dashboard", "classroom.teacher.dashboard",
  "classroom.work.read", "classroom.teacher.work.read", "classroom.ai", "classroom.review.decide",
  "classroom.timetable.refresh", "classroom.classes.update", "classroom.student.password.reset",
  "classroom.work.save", "classroom.work.action", "cron.timetable.refresh", "teacher-preview.evaluate",
] as const;
export type FailureOperation = typeof failureOperations[number];
const categories = ["invalid_input", "unauthenticated", "forbidden", "conflict", "rate_limited", "not_found", "unavailable", "unexpected"] as const;
export type FailureCategory = typeof categories[number];
export type FailureRecord = { requestId: string; operation: FailureOperation; category: FailureCategory; status: number; timestamp: string };

export function failureCategory(status: number): FailureCategory {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  return status >= 500 ? "unavailable" : "invalid_input";
}
export function createFailureRecord(details: { operation?: FailureOperation; category: FailureCategory; status: number }): FailureRecord {
  return {
    requestId: randomUUID(),
    operation: details.operation && failureOperations.includes(details.operation) ? details.operation : "server.request",
    category: categories.includes(details.category) ? details.category : "unexpected",
    status: Number.isInteger(details.status) && details.status >= 400 && details.status <= 599 ? details.status : 503,
    timestamp: new Date().toISOString(),
  };
}
export function writeFailureLog(record: FailureRecord) {
  try {
    if (record.status >= 500) console.error(JSON.stringify(record));
    else console.warn(JSON.stringify(record));
  } catch { /* A log sink failure must not replace the API response. */ }
}
export function logFailureResponse<T extends Response>(response: T, context?: { operation?: FailureOperation; category?: FailureCategory }): T {
  // Read only status and fixed context; the response body never enters the log.
  const record = createFailureRecord({ operation: context?.operation, status: response.status, category: context?.category ?? failureCategory(response.status) });
  response.headers.set("X-Request-ID", record.requestId);
  writeFailureLog(record);
  return response;
}
