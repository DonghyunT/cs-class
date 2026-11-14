// Firebase also uses 4xx for configuration and provider errors.
const wrongCredentials = ["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED", "INVALID_LOGIN_CREDENTIALS"];

export function passwordFailureIsWrongCredentials(status: number, payload: unknown): boolean {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  const reason = /^[A-Z_]+/.exec(String(message ?? ""))?.[0];
  return status >= 400 && status < 500 && !!reason && wrongCredentials.includes(reason);
}
