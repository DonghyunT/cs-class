import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { selectE2E, matchLesson } from "../scripts/e2e-scope.mjs";

function runPlan(plan, event = "push") {
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
    writeFileSync(path.join(directory, "plan.json"), JSON.stringify(plan));
    return spawnSync(process.execPath, [path.resolve("scripts/run-selected-e2e.mjs"), "--running", "--plan", "plan.json"], {
      cwd: directory, encoding: "utf8", timeout: 10_000,
      env: { ...process.env, GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: event, CS_SMOKE_LESSON_IDS: '["review-sandwich"]' },
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("matchLesson matches lesson specific files accurately", () => {
  assert.equal(matchLesson("src/components/student/review/sandwich.tsx"), "review-sandwich");
  assert.equal(matchLesson("src/lib/classroom/review/sandwich-engine.mjs"), "review-sandwich");
  assert.equal(matchLesson("src/components/student/review/flowchart.tsx"), "review-flowchart");
  assert.equal(matchLesson("src/components/student/review/flow-diagram.tsx"), "review-flowchart");
  assert.equal(matchLesson("src/lib/classroom/review/flow-runner.mjs"), "review-flowchart");
  assert.equal(matchLesson("src/components/student/review/abstraction.tsx"), "review-abstraction");
  assert.equal(matchLesson("src/components/student/programming-lesson.tsx"), "programming-13");
  assert.equal(matchLesson("src/components/student/entry-practice-workspace.tsx"), "programming-13");
  assert.equal(matchLesson("public/entryjs/workspace.js"), "programming-13");
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

  const programming = selectE2E(["src/components/student/programming-lesson.tsx"]);
  assert.equal(programming.mode, "affected");
  assert.deepEqual(programming.lessonIds, ["programming-13"]);
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
