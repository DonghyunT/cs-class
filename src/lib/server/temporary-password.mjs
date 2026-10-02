import { createHash, randomBytes } from "node:crypto";

/** @param {string} password */
export function passwordDigest(password) {
  return createHash("sha256").update(password).digest("hex");
}

export function createTemporaryPassword() {
  const password = `T${randomBytes(9).toString("hex")}9`;
  return {
    password,
    temporaryPassword: { hash: passwordDigest(password), expiresAt: Date.now() + 30 * 60_000 },
    // 임시 입장 정보로 Firebase 토큰을 얻거나 직접 비밀번호를 바꿀 수 없습니다.
    providerPassword: randomBytes(32).toString("hex"),
  };
}
