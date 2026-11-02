// Restore after checking old pending requests, indexes and the active-mode tests.
// Shared by client and server; changing this setting requires a rebuild/deploy.
export const CLASSROOM_HELP_ENABLED: boolean = false;
// Student screens re-check the class this rarely to stay within Vercel's free request quota; students press 새로고침 for changes.
export const STUDENT_CLASS_POLL_MS = 10 * 60_000;
// Activity reports and session checks per tab; under half the 10-minute student timeout so one failed report still leaves room.
export const SESSION_ACTIVITY_MS = 3 * 60_000;
// Oldest activity age a report may carry: the student timeout, past which the session has ended anyway.
export const MAX_ACTIVITY_AGE_MS = 10 * 60_000;
