import "server-only";
export class ServiceError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function requireCondition(condition: unknown, status: number, code: string, message: string): asserts condition {
  if (!condition) throw new ServiceError(status, code, message);
}
