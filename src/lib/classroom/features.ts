// Restore after checking old pending requests, indexes and the active-mode tests.
// Shared by client and server; changing this setting requires a rebuild/deploy.
export const CLASSROOM_HELP_ENABLED: boolean = false;
// Students sign out after this long without input; the server enforces it and activity reports may carry ages up to it.
export const STUDENT_IDLE_TIMEOUT_MS = 10 * 60_000;
// Student screens re-check the class this rarely to stay within Vercel's free request quota; students press 새로고침 for changes.
export const STUDENT_CLASS_POLL_MS = 10 * 60_000;
// Activity reports and idle session checks per tab, and the wait after a failed report.
// tests/session-timing.test.ts keeps one failed report from reaching the student's timeout warning.
export const SESSION_ACTIVITY_MS = 3 * 60_000;
export const SESSION_RETRY_MS = 30_000;
