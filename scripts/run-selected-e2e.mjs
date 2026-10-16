import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { testEnv } from "./local-test-env.mjs";
import { selectScope } from "./ci-policy.mjs";

const args = process.argv.slice(2);
const isRunning = args.includes("--running");
const allowFull = args.includes("--full");
const isCI = Boolean(process.env.GITHUB_EVENT_NAME || process.env.GITHUB_ACTIONS);
const planArgIdx = args.indexOf("--plan");
const explicitPlanPath = planArgIdx !== -1 ? args[planArgIdx + 1] : process.env.CS_E2E_PLAN_PATH;
// CI reads the plan written by `ci-policy.mjs scope`; local runs never reuse a leftover default file.
const planPath = explicitPlanPath || (isCI ? "scratch/ci/e2e-plan.json" : null);

let plan;
if (planPath && existsSync(planPath)) {
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (err) {
    console.error(`Invalid plan JSON at ${planPath}:`, err.message);
    process.exit(1);
  }
} else if (explicitPlanPath && !isCI) {
  console.error(`Plan file not found: ${explicitPlanPath}`);
  process.exit(1);
} else {
  plan = await selectScope(process.env);
  if (planPath) {
    try {
      mkdirSync(path.dirname(planPath), { recursive: true });
      writeFileSync(planPath, JSON.stringify(plan, null, 2));
    } catch {}
  }
}

if (!plan || !["docs", "affected", "smoke", "full"].includes(plan.mode)) {
  console.error("Plan does not contain a valid mode property:", plan);
  process.exit(1);
}

if (plan.mode === "full" && isCI && process.env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
  console.error("Full E2E requires workflow_dispatch; regenerate the automatic CI plan.");
  process.exit(1);
}

if (plan.mode === "full" && !isCI && !allowFull) {
  console.error(`[E2E Runner] Scope resolved to full E2E (${plan.reason}); not running it.`);
  console.error("Local full E2E needs the user's prior approval. After approval, rerun with --full.");
  process.exit(1);
}

console.log(`[E2E Runner] Mode: ${plan.mode}, Reason: ${plan.reason}`);

if (plan.mode === "docs") {
  console.log("Documents only: skipping E2E tests.");
  process.exit(0);
}

let testTargets = [];
const env = { ...process.env, ...testEnv };
delete env.CS_SMOKE_LESSON_IDS;

if (plan.mode === "affected" || plan.mode === "smoke") {
  if (!Array.isArray(plan.testFiles) || plan.testFiles.length === 0) {
    console.error("Selected mode requested but no test files were specified!");
    process.exit(1);
  }
  // Validate that all test files exist
  for (const file of plan.testFiles) {
    if (!existsSync(file)) {
      console.error(`Specified test file does not exist: ${file}`);
      process.exit(1);
    }
  }
  testTargets = [...new Set([...plan.testFiles, "tests/lesson-smoke.spec.ts"])];
  if (plan.mode === "affected" && Array.isArray(plan.lessonIds) && plan.lessonIds.length > 0) {
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
  let tempDir = null;
  if (planPath) {
    env.CS_E2E_PLAN_PATH = path.resolve(planPath);
  } else {
    // Hand the freshly computed local plan to the child without leaving a reusable default file.
    tempDir = mkdtempSync(path.join(tmpdir(), "cs-class-e2e-plan-"));
    env.CS_E2E_PLAN_PATH = path.join(tempDir, "plan.json");
    writeFileSync(env.CS_E2E_PLAN_PATH, JSON.stringify(plan, null, 2));
  }
  const childCmd = `node scripts/run-selected-e2e.mjs --running${allowFull ? " --full" : ""}`;
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
  child.on("exit", (code) => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    process.exit(code ?? 1);
  });
}
