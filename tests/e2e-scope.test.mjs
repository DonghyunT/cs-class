import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { selectE2E, matchLesson, matchLessons } from "../scripts/e2e-scope.mjs";

function runRunner({ plan, planFile = "plan.json", args = [], event = "push", setup } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "cs-class-e2e-plan-"));
  assert.equal(path.dirname(directory), path.resolve(tmpdir()));
  try {
    const cli = path.join(directory, "node_modules/@playwright/test");
    mkdirSync(cli, { recursive: true });
    // Observe the real runner's command boundary without launching a browser or emulator.
    writeFileSync(path.join(cli, "cli.js"), 'console.log(JSON.stringify({args:process.argv.slice(2),smokeFilter:process.env.CS_SMOKE_LESSON_IDS??null}));');
    mkdirSync(path.join(directory, "tests"));
    for (const file of ["lesson-smoke.spec.ts", "review-sandwich.spec.ts"]) {
      writeFileSync(path.join(directory, "tests", file), "");
    }
    if (plan) {
      mkdirSync(path.dirname(path.join(directory, planFile)), { recursive: true });
      writeFileSync(path.join(directory, planFile), JSON.stringify(plan));
    }
    setup?.(directory);
    const env = { ...process.env, CS_SMOKE_LESSON_IDS: '["review-sandwich"]' };
    for (const key of ["GITHUB_ACTIONS", "GITHUB_EVENT_NAME", "CS_E2E_PLAN_PATH"]) delete env[key];
    if (event) Object.assign(env, { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: event });
    return spawnSync(process.execPath, [path.resolve("scripts/run-selected-e2e.mjs"), "--running", ...args], {
      cwd: directory, encoding: "utf8", timeout: 10_000, env,
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

function runPlan(plan, event = "push") {
  return runRunner({ plan, args: ["--plan", "plan.json"], event });
}

const stalePlan = { mode: "full", reason: "unmapped file: firestore.indexes.json", lessonIds: [], testFiles: [], base: "local" };

function observedArgs(result) {
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)).args;
}

test("matchLesson matches lesson specific files accurately", () => {
  assert.equal(matchLesson("src/components/student/review/sandwich.tsx"), "review-sandwich");
  assert.equal(matchLesson("src/lib/classroom/review/sandwich-engine.mjs"), "review-sandwich");
  assert.equal(matchLesson("src/components/student/review/flowchart.tsx"), "review-flowchart");
  assert.equal(matchLesson("src/components/student/review/flow-diagram.tsx"), "review-flowchart");
  assert.equal(matchLesson("src/lib/classroom/review/flow-runner.mjs"), "review-flowchart");
  assert.equal(matchLesson("src/components/student/review/abstraction.tsx"), "review-abstraction");
  assert.equal(matchLesson("src/components/student/programming-lesson.tsx"), "programming-13");
  assert.equal(matchLesson("src/lib/classroom/entry-palette.ts"), "programming-13");
  assert.equal(matchLesson("src/lib/classroom/programming-entry.ts"), "programming-13");
  assert.equal(matchLesson("src/components/student/entry-practice-workspace.tsx"), "programming-13");
  assert.equal(matchLesson("public/entryjs/workspace.js"), "programming-13");
  assert.equal(matchLesson("tests/entry-palette.test.ts"), "programming-13");
  assert.equal(matchLesson("tests/fixtures/entry-legacy-keys.json"), "programming-13");
  assert.equal(matchLesson("src/lib/server/programming-grader.ts"), "programming-13");
  assert.deepEqual(matchLessons("src\\lib\\classroom\\programming-entry.ts"), ["programming-13", "conditionals", "loops"]);
  assert.deepEqual(matchLessons("src/lib/classroom/conditionals-data.ts"), ["conditionals"]);
  assert.deepEqual(matchLessons("src/components/student/programming-concept.tsx"), ["programming-13"]);
  assert.deepEqual(matchLessons("src/components/student/use-work.ts"), []);
  assert.equal(matchLesson("src/components/student/use-work.ts"), null);
  assert.equal(matchLesson("src/components/student/lesson-editor.tsx"), null);
});

test("selectE2E classifies empty or invalid inputs as full", () => {
  assert.deepEqual(selectE2E([]), { mode: "full", reason: "no changed files provided", lessonIds: [], testFiles: [] });
  assert.deepEqual(selectE2E(null), { mode: "full", reason: "no changed files provided", lessonIds: [], testFiles: [] });
});

test("selectE2E classifies documentation-only changes as docs", () => {
  const result = selectE2E(["README.md", "docs/DEVELOPMENT.md"]);
  assert.equal(result.mode, "docs");
  assert.deepEqual(result.lessonIds, []);
  assert.deepEqual(result.testFiles, []);
});

test("selectE2E classifies single lesson changes as affected", () => {
  const sandwich = selectE2E(["src/components/student/review/sandwich.tsx"]);
  assert.equal(sandwich.mode, "affected");
  assert.deepEqual(sandwich.lessonIds, ["review-sandwich"]);
  assert.ok(sandwich.testFiles.includes("tests/review-sandwich.spec.ts"));
  assert.ok(sandwich.testFiles.includes("tests/sandwich-conversation.spec.ts"));

  const flowchart = selectE2E(["src/components/student/review/flowchart.tsx", "docs/DESIGN.md"]);
  assert.equal(flowchart.mode, "affected");
  assert.deepEqual(flowchart.lessonIds, ["review-flowchart"]);
  assert.ok(flowchart.testFiles.includes("tests/review-flowchart.spec.ts"));
  assert.ok(flowchart.testFiles.includes("tests/review-practice-ui.spec.ts"));

  // The shared Entry practice screen selects every Entry lesson's tests.
  const programming = selectE2E(["src/components/student/programming-lesson.tsx"]);
  assert.equal(programming.mode, "affected");
  assert.deepEqual(programming.lessonIds, ["conditionals", "loops", "programming-13"]);
  assert.ok(programming.testFiles.includes("tests/conditionals.spec.ts"));
  assert.ok(programming.testFiles.includes("tests/programming-classroom.spec.ts"));
  assert.ok(programming.testFiles.includes("tests/entryjs-ui.spec.ts"));
});

test("selectE2E classifies multiple lesson changes as affected union", () => {
  const result = selectE2E([
    "src/components/student/review/sandwich.tsx",
    "src/components/student/review/abstraction.tsx"
  ]);
  assert.equal(result.mode, "affected");
  assert.deepEqual(result.lessonIds, ["review-abstraction", "review-sandwich"]);
  assert.ok(result.testFiles.includes("tests/review-sandwich.spec.ts"));
  assert.ok(result.testFiles.includes("tests/review-abstraction.spec.ts"));
});

test("selectE2E elevates to full if unmapped or shared code is modified", () => {
  const shared = selectE2E([
    "src/components/student/review/sandwich.tsx",
    "src/components/student/use-work.ts"
  ]);
  assert.equal(shared.mode, "full");
  assert.ok(shared.reason.includes("unmapped file: src/components/student/use-work.ts"));

  const server = selectE2E(["src/lib/server/classroom.ts"]);
  assert.equal(server.mode, "full");
});

test("selectE2E normalizes Windows path separators", () => {
  const winPath = selectE2E(["src\\components\\student\\review\\sandwich.tsx"]);
  assert.equal(winPath.mode, "affected");
  assert.deepEqual(winPath.lessonIds, ["review-sandwich"]);
});

test("automatic runners reject a stale full plan and unknown modes before starting tests", () => {
  for (const mode of ["full", "unknown"]) {
    const result = runPlan({ mode, testFiles: [] });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /"args"/);
  }
  assert.equal(runPlan({ mode: "full", testFiles: [] }, "workflow_dispatch").status, 0);
});

test("smoke runners pass explicit targets once and clear inherited lesson restrictions", () => {
  const result = runPlan({ mode: "smoke", lessonIds: ["review-sandwich"],
    testFiles: ["tests/review-sandwich.spec.ts", "tests/lesson-smoke.spec.ts"] });
  assert.equal(result.status, 0);
  const observed = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.deepEqual(observed, { args: ["test", "tests/review-sandwich.spec.ts", "tests/lesson-smoke.spec.ts"], smokeFilter: null });
});

test("local runs ignore a leftover default plan and recompute the scope", () => {
  const git = (directory, ...args) => execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd: directory, stdio: "ignore" });
  const expected = selectE2E(["src/components/student/review/sandwich.tsx"]);
  const result = runRunner({ plan: stalePlan, planFile: "scratch/ci/e2e-plan.json", event: null, setup(directory) {
    for (const file of expected.testFiles) writeFileSync(path.join(directory, file), "");
    const lesson = path.join(directory, "src/components/student/review/sandwich.tsx");
    mkdirSync(path.dirname(lesson), { recursive: true });
    writeFileSync(lesson, "export {};");
    git(directory, "init", "-q");
    git(directory, "add", "-A");
    git(directory, "commit", "-q", "-m", "base");
    writeFileSync(lesson, "export const changed = true;");
  } });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /firestore\.indexes\.json/);
  assert.match(result.stdout, /Mode: affected/);
  assert.deepEqual(observedArgs(result), ["test", ...new Set([...expected.testFiles, "tests/lesson-smoke.spec.ts"])]);
});

test("local full scope stops before testing unless --full is given", () => {
  // Outside a git repository the local diff is empty, which resolves to full.
  const refused = runRunner({ event: null });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /full E2E \(no changed files provided\)/);
  assert.match(refused.stderr, /--full/);
  assert.doesNotMatch(refused.stdout, /"args"/);

  const explicitFull = runRunner({ plan: stalePlan, args: ["--plan", "plan.json"], event: null });
  assert.equal(explicitFull.status, 1);
  assert.doesNotMatch(explicitFull.stdout, /"args"/);

  const approved = runRunner({ plan: stalePlan, args: ["--plan", "plan.json", "--full"], event: null });
  assert.equal(approved.status, 0, approved.stderr);
  assert.deepEqual(observedArgs(approved), ["test"]);
});

test("local runs read an explicit plan and reject a missing one", () => {
  const explicit = runRunner({ plan: { mode: "affected", lessonIds: ["review-sandwich"], testFiles: ["tests/review-sandwich.spec.ts"] },
    args: ["--plan", "plan.json"], event: null });
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.deepEqual(observedArgs(explicit), ["test", "tests/review-sandwich.spec.ts", "tests/lesson-smoke.spec.ts"]);

  const missing = runRunner({ args: ["--plan", "missing.json"], event: null });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Plan file not found/);
});
