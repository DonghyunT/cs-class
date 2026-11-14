// 운영 계정 생성 검사는 폐기했습니다. 로컬 서비스에 운영 비밀번호를 보내지 않습니다.
if (process.argv.includes("--apply")) throw new Error("Cloud write smoke tests are retired. Use npm run test:e2e:scope with local emulators.");
if (process.env.FIREBASE_PROJECT_ID !== "cs-class-f74c4" || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Expected the approved cloud project, without emulators.");
const response = await fetch("http://127.0.0.1:3001/api/auth/config", { signal: AbortSignal.timeout(5000) });
if (!response.ok) throw new Error("Local configuration endpoint is unavailable.");
const config = await response.json();
if (config.projectId !== "cs-class-f74c4" || config.emulatorHost !== null) throw new Error("Unexpected public configuration.");
console.log(JSON.stringify({ projectId: config.projectId, mode: "read-only-config", configured: config.configured, verifiesServerIdentity: false, cloudWrites: false }));
