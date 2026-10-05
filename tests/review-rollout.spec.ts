import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { db, localOnly } from "./emulator";
import { testEnv } from "../scripts/local-test-env.mjs";
const exec = promisify(execFile);
test("11개 반 계획·경합 거부·적용·반복·복구는 작품을 보존한다", async ({ request }) => {
  // Five independent CLI processes include Admin SDK startup and transaction cleanup.
  test.setTimeout(120_000);
  await localOnly(request);
  const refs = Array.from({ length: 11 }, (_, i) => db.collection("csClasses").doc(`2-${i + 1}`)), before = await db.getAll(...refs);
  const artifact = db.collection("csWork").doc("rollout-synthetic__review-sandwich"); await artifact.set({ sentinel: "preserved" });
  const file = `scratch/review-lessons/demo-rollout-${randomUUID()}.json`;
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV, ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL)/.test(key))), ...testEnv };
  const cli = (mode: string) => test.step(`설정 CLI ${mode}`, () => exec(process.execPath, ["scripts/review-rollout.mjs", "--mode", mode, ...(mode === "plan" ? ["--phase", "flowchart", "--output", file] : ["--plan", file, "--confirm-project", "demo-cs-class"])], { env, encoding: "utf8", timeout: 30_000 }));
  try {
    for (const ref of refs) await ref.set({ id: ref.id, name: ref.id, revision: 0, openedLessonIds: ["programming-13", "sequence-lab"], currentLessonId: "programming-13" });
    await cli("plan"); const plan = JSON.parse(await readFile(file, "utf8")); expect(plan.plan.classes).toHaveLength(11);
    await refs[0].update({ revision: 1 }); await expect(cli("apply")).rejects.toThrow(/settings changed/); expect((await refs[1].get()).data()?.revision).toBe(0);
    await refs[0].update({ revision: 0 }); await cli("apply"); expect(JSON.parse((await cli("apply")).stdout).status).toBe("already-completed");
    const settings = (await db.getAll(...refs)).map(s => s.data()!); expect(settings.every(s => s.openedLessonIds.length === 4 && s.currentLessonId === "programming-13" && s.revision === 1)).toBe(true);
    await cli("restore"); expect((await refs[0].get()).data()).toMatchObject({ openedLessonIds: ["programming-13", "sequence-lab"], currentLessonId: "programming-13", revision: 2 }); expect((await artifact.get()).data()).toEqual({ sentinel: "preserved" });
  } finally { const batch = db.batch(); before.forEach((snapshot, i) => snapshot.exists ? batch.set(refs[i], snapshot.data()!) : batch.delete(refs[i])); batch.delete(artifact); await batch.commit(); }
});
