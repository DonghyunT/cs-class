import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { testEnv } from "../scripts/local-test-env.mjs";
import { db, readyStudent, headers, lessonId, loginStudent } from "./emulator";

test("중단된 비밀번호 변경 복구는 기존 세션을 종료하고 학습 기록 보존", async ({ request }) => {
  await readyStudent(request);
  const endpoint = `/api/classroom/work/${lessonId}`;
  const work = await (await request.get(endpoint)).json(); work.draft.stage = "quiz";
  await request.post(endpoint, { headers, data: { revision: 0, draft: work.draft } });
  // No provider operation is in flight: model the state left by a terminated server.
  await db.collection("csAccounts").doc("student-20101").update({ authBusy: "interrupted-operation", authBusyAt: Date.now() - 3_600_000 });
  expect((await request.get(endpoint)).status()).toBe(423);
  await promisify(execFile)(process.execPath, ["scripts/recover-account.mjs", "20101", "--apply-app-stopped"], { env: { ...process.env, ...testEnv } });
  expect((await request.get(endpoint)).status()).toBe(401);
  expect((await loginStudent(request, testEnv.CS_RESET_PASSWORD)).status()).toBe(200);
  expect((await request.get(endpoint)).status()).toBe(403);
  const profile = (await db.collection("csAccounts").doc("student-20101").get()).data()!;
  expect(profile.authBusy).toBeNull(); expect(profile.mustChangePassword).toBe(true);
  expect((await db.collection("csWork").doc(`student-20101__${lessonId}`).get()).data()!.draft.stage).toBe("quiz");
});
