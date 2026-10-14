import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { changedFiles, classify, findBaseline, ignoreBuild, selectScope } from "../scripts/ci-policy.mjs";

const sha = "a".repeat(40);
const env = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main", GITHUB_TOKEN: "test-only",
  GITHUB_REPOSITORY: "example/project", GITHUB_RUN_ID: "9", GITHUB_SHA: "b".repeat(40) };

test("only explicit documentation paths are light checks", () => {
  assert.equal(classify(["README.md", "AGENTS.md", "docs/HANDOFF.md", "docs/archive/old.md"]), "docs");
  for (const file of ["src/app/page.tsx", "package-lock.json", ".github/workflows/verify.yml", ".gitattributes",
    "scripts/build.mjs", "docs/example.ts", "unknown.md", "vercel.json"]) {
    assert.equal(classify(["README.md", file]), "full");
  }
  assert.equal(classify([]), "full");
  // --no-renames supplies both old and new paths, including movement out of docs.
  assert.equal(classify(["docs/old.md", "docs/new.md"]), "docs");
  assert.equal(classify(["docs/old.md", "src/new.md"]), "full");
});

test("only explicit manual CI runs select the full E2E suite", async () => {
  assert.equal((await selectScope({ ...env, GITHUB_EVENT_NAME: "workflow_dispatch" }, async () => {
    throw new Error("manual execution must not need a baseline");
  })).mode, "full");
  for (const automatic of [env, { ...env, GITHUB_EVENT_NAME: "pull_request" },
    { ...env, GITHUB_REF: "refs/heads/codex/work" }, { GITHUB_ACTIONS: "true" }]) {
    const plan = await selectScope(automatic, async () => null);
    assert.equal(plan.mode, "smoke");
    assert.deepEqual(plan.testFiles, ["tests/lesson-smoke.spec.ts"]);
  }
  for (const [baseline, diff] of [
    [async () => { throw new Error("API failure"); }],
    [async () => sha, () => { throw new Error("missing history"); }],
  ]) {
    const plan = await selectScope(env, baseline, diff);
    assert.equal(plan.mode, "smoke");
    assert.deepEqual(plan.testFiles, ["tests/lesson-smoke.spec.ts"]);
  }
});

test("scope compares all changes since last success, including failed code before docs push", async () => {
  const baseline = async () => sha;
  assert.equal((await selectScope(env, baseline, () => ["docs/HANDOFF.md"])).mode, "docs");
  assert.equal((await selectScope(env, baseline, (base) => {
    assert.equal(base, sha); return ["src/lib/save.ts", "docs/HANDOFF.md"];
  })).mode, "smoke");

  // Single lesson affected scope
  const sandwichScope = await selectScope(env, baseline, () => ["src/components/student/review/sandwich.tsx"]);
  assert.equal(sandwichScope.mode, "affected");
  assert.deepEqual(sandwichScope.lessonIds, ["review-sandwich"]);
  assert.ok(sandwichScope.testFiles.length > 0);
  assert.equal(sandwichScope.base, sha);
});

test("shared changes retain related lesson tests and all registered lesson smoke checks", async () => {
  const plan = await selectScope({ ...env, GITHUB_EVENT_NAME: "pull_request" }, async () => sha,
    () => ["src/components/student/review/sandwich.tsx", "src/components/student/use-work.ts"]);
  assert.equal(plan.mode, "smoke");
  assert.equal(plan.base, sha);
  assert.deepEqual(plan.lessonIds, ["review-sandwich"]);
  assert.deepEqual(new Set(plan.testFiles), new Set(["tests/review-sandwich.spec.ts", "tests/sandwich-conversation.spec.ts",
    "tests/review-practice-ui.spec.ts", "tests/lesson-feedback-workspace.spec.ts", "tests/lesson-smoke.spec.ts"]));
  const common = await selectScope(env, async () => sha, () => ["src/components/student/use-work.ts"]);
  assert.equal(common.mode, "smoke");
  assert.deepEqual(common.testFiles, ["tests/lesson-smoke.spec.ts"]);
});

test("local common changes still require a full-suite decision by the user", async () => {
  assert.equal((await selectScope({}, undefined, () => ["src/components/student/use-work.ts"])).mode, "full");
});

test("baseline rejects failed/canceled/manual/current/nonancestor runs", async () => {
  const success = { id: 1, event: "push", head_branch: "main", head_sha: sha, conclusion: "success", status: "completed" };
  const runs = [{ ...success, conclusion: "cancelled" }, { ...success, conclusion: "failure" },
    { ...success, event: "workflow_dispatch" }, { ...success, id: 9 },
    { ...success, head_sha: env.GITHUB_SHA }, { ...success, head_sha: "c".repeat(40) }, success];
  assert.equal(await findBaseline(env, async () => ({ ok: true, json: async () => ({ workflow_runs: runs }) }),
    (candidate) => candidate === sha), sha);
  await assert.rejects(findBaseline(env, async () => ({ ok: false })));
  await assert.rejects(findBaseline(env, async () => ({ ok: true, json: async () => ({}) })));
  assert.equal(await findBaseline({}), null);
});

test("Vercel skips only proven docs; missing baseline/history builds", () => {
  assert.equal(ignoreBuild({ VERCEL_GIT_PREVIOUS_SHA: sha }, () => ["docs/HANDOFF.md"]), true);
  assert.equal(ignoreBuild({ VERCEL_GIT_PREVIOUS_SHA: sha }, () => ["src/app/page.tsx"]), false);
  assert.equal(ignoreBuild({}, () => { throw new Error("no baseline"); }), false);
});

test("real Git diff includes cumulative code and both sides of a rename", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cs-class-ci-"));
  const previous = process.cwd();
  const runGit = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const commit = () => {
    runGit("add", ".");
    runGit("-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
    return runGit("rev-parse", "HEAD");
  };
  try {
    runGit("init", "--quiet");
    mkdirSync(path.join(root, "docs")); mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "docs/old.md"), "original\n");
    const base = commit();
    writeFileSync(path.join(root, "src/save.ts"), "export const save = true;\n");
    const code = commit();
    writeFileSync(path.join(root, "README.md"), "documentation\n"); commit();
    process.chdir(root);
    assert.equal(classify(changedFiles(base)), "full");
    assert.equal(classify(changedFiles(code)), "docs");
    assert.equal(ignoreBuild({ VERCEL_GIT_PREVIOUS_SHA: "f".repeat(40) }), false);
    renameSync(path.join(root, "docs/old.md"), path.join(root, "src/old.md")); commit();
    const files = changedFiles(code);
    assert.ok(files.includes("docs/old.md")); assert.ok(files.includes("src/old.md"));
    assert.equal(classify(files), "full");
    assert.throws(() => changedFiles("invalid"));
    // Vercel removes ignored files before running the skip command. Keep commit
    // objects/refs, but remove authentication configuration, hooks and reflogs.
    rmSync(path.join(root, ".git/config"));
    rmSync(path.join(root, ".git/hooks"), { recursive: true, force: true });
    rmSync(path.join(root, ".git/logs"), { recursive: true, force: true });
    assert.deepEqual(changedFiles(code), files);
    assert.equal(ignoreBuild({ VERCEL_GIT_PREVIOUS_SHA: code }), false);
  } finally { process.chdir(previous); rmSync(root, { recursive: true, force: true }); }
});
