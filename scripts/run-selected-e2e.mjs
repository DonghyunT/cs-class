import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { testEnv } from "./local-test-env.mjs";
import { selectScope } from "./ci-policy.mjs";

const args = process.argv.slice(2);
const isRunning = args.includes("--running");
const planArgIdx = args.indexOf("--plan");
const planPath = planArgIdx !== -1
  ? args[planArgIdx + 1]
  : (process.env.CS_E2E_PLAN_PATH || "scratch/ci/e2e-plan.json");

let plan;
if (existsSync(planPath)) {
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (err) {
    console.error(`Invalid plan JSON at ${planPath}:`, err.message);
    process.exit(1);
  }
} else {
  // Generate plan dynamically if no plan file exists
  plan = await selectScope(process.env);
  try {
    mkdirSync(path.dirname(planPath), { recursive: true });
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
  } catch {}
}

if (!plan || !plan.mode) {
  console.error("Plan does not contain a valid mode property:", plan);
  process.exit(1);
}

console.log(`[E2E Runner] Mode: ${plan.mode}, Reason: ${plan.reason}`);

if (plan.mode === "docs") {
  console.log("Documents only: skipping E2E tests.");
  process.exit(0);
}

let testTargets = [];
const env = { ...process.env, ...testEnv };

if (plan.mode === "affected") {
  if (!Array.isArray(plan.testFiles) || plan.testFiles.length === 0) {
    console.error("Affected mode requested but no test files were specified!");
    process.exit(1);
  }
  // Validate that all test files exist
  for (const file of plan.testFiles) {
    if (!existsSync(file)) {
      console.error(`Specified test file does not exist: ${file}`);
      process.exit(1);
    }
  }
  testTargets = [...plan.testFiles, "tests/lesson-smoke.spec.ts"];
  if (Array.isArray(plan.lessonIds) && plan.lessonIds.length > 0) {
    env.CS_SMOKE_LESSON_IDS = JSON.stringify(plan.lessonIds);
  }
  console.log(`[E2E Runner] Selected tests (${testTargets.length}):\n  ${testTargets.join("\n  ")}`);
} else {
  console.log("[E2E Runner] Running full test suite.");
  delete env.CS_SMOKE_LESSON_IDS;
}

if (isRunning) {
  // Execute playwright directly against already running server/emulators
  const playwrightBin = path.join("node_modules", "@playwright", "test", "cli.js");
  const child = spawn(process.execPath, [playwrightBin, "test", ...testTargets], {
    env,
    stdio: "inherit"
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  // Wrap with firebase emulators:exec
  env.CS_E2E_PLAN_PATH = path.resolve(planPath);
  const childCmd = `node scripts/run-selected-e2e.mjs --running`;
  const firebaseBin = path.join("node_modules", "firebase-tools", "lib", "bin", "firebase.js");
  const child = spawn(process.execPath, [
    firebaseBin, "emulators:exec",
    "--only", "auth,firestore",
    "--project", "demo-cs-class",
    childCmd
  ], {
    env,
    stdio: "inherit"
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
