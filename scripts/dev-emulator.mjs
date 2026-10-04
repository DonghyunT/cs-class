import { spawn } from "node:child_process";
import { testEnv } from "./local-test-env.mjs";
import { startTimetableFixture } from "./timetable-fixture.mjs";
const env = { ...process.env, ...testEnv };
const fixture = env.CS_TIMETABLE_FIXTURE === "1" ? await startTimetableFixture() : null;
const seed = spawn(process.execPath, ["scripts/seed-emulator.mjs"], { stdio: "inherit", env });
seed.on("exit", (code) => {
  if (code !== 0) { fixture?.close(); process.exit(code ?? 1); }
  const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.env.CI ? "start" : "dev", "--hostname", "localhost", "--port", process.env.PORT ?? "3000"], { stdio: "inherit", env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { fixture?.close(); next.kill(signal); });
  next.on("exit", (nextCode) => { fixture?.close(); process.exit(nextCode ?? 0); });
});
