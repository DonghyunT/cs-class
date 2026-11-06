import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { changedFiles, classify, codeFingerprint, codeToRecord, findBaseline, findTestedRun, findVerifiedRun, ignoreBuild, selectScope } from "../scripts/ci-policy.mjs";

const sha = "a".repeat(40);
const env = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main", GITHUB_TOKEN: "test-only",
  GITHUB_REPOSITORY: "example/project", GITHUB_RUN_ID: "9", GITHUB_SHA: "b".repeat(40) };
// main pushes look for a pull_request run that already tested the same tree; these tests have none.
const unverified = async () => null;

const prEnv = { ...env, GITHUB_EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/5/merge", GITHUB_HEAD_REF: "fix/work" };
const passedRun = { id: 7, event: "pull_request", status: "completed", conclusion: "success", head_branch: "fix/work",
  head_repository: { full_name: "example/project" } };
const recorded = (code, conclusion = "success") => [{ name: "app", steps: [{ name: "Run npm run build", conclusion: "success" },
  { name: `Record tested code ${code}`, conclusion }] }];
// Answers both calls findTestedRun makes: the branch's run list, then that run's jobs.
const ciApi = (runs, jobs) => async (url) => ({ ok: true, json: async () => url.includes("/jobs") ? { jobs } : { workflow_runs: runs } });

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
  }, unverified)).mode, "smoke");

  // Single lesson affected scope
  const sandwichScope = await selectScope(env, baseline, () => ["src/components/student/review/sandwich.tsx"], unverified);
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
  const common = await selectScope(env, async () => sha, () => ["src/components/student/use-work.ts"], unverified);
  assert.equal(common.mode, "smoke");
  assert.deepEqual(common.testFiles, ["tests/lesson-smoke.spec.ts"]);
  // Hosting the Entry workspace (with its unit test) needs only programming-classroom, not every Entry lesson.
  const hosting = await selectScope(env, async () => sha, () => ["scripts/entryjs-cdn.mjs", "tests/entryjs-cdn.test.mjs"], unverified);
  assert.equal(hosting.mode, "smoke");
  assert.deepEqual(hosting.testFiles, ["tests/programming-classroom.spec.ts", "tests/lesson-smoke.spec.ts"]);
});

test("automatic smoke runs the specs that pin session and polling timing", async () => {
  const timing = ["tests/classroom-api.spec.ts", "tests/manual-save-entry.spec.ts", "tests/read-polling.spec.ts"];
  for (const file of ["src/components/session-provider.tsx", "src/app/api/auth/[action]/route.ts", "src/lib/classroom/features.ts",
    "src/components/student/lesson-workspace.tsx", "src/components/student/dashboard.tsx", "src/components/dashboard/dashboard.tsx", "tests/read-polling.spec.ts"]) {
    const plan = await selectScope(env, async () => sha, () => [file], unverified);
    assert.equal(plan.mode, "smoke", file);
    assert.deepEqual(new Set(plan.testFiles), new Set([...timing, "tests/lesson-smoke.spec.ts"]), file);
  }
  // Locally these shared files still need the user's full-suite decision.
  assert.equal((await selectScope({}, undefined, () => ["src/components/session-provider.tsx"])).mode, "full");
});

test("local common changes still require a full-suite decision by the user", async () => {
  assert.equal((await selectScope({}, undefined, () => ["src/components/student/use-work.ts"])).mode, "full");
});

test("teacher CI adds each role's specs and preserves student smoke for mixed and duplicate changes", async () => {
  for (const event of [env, prEnv]) {
    for (const [file, expected] of [["assessment.tsx", "teacher-assessment"], ["work-details.tsx", "teacher-review-workflow"],
      ["dashboard.tsx", "teacher-class-management"], ["lesson-preview.tsx", "teacher-preview-api"]]) {
      const plan = await selectScope(event, async () => sha, () => [`src/components/teacher/${file}`], unverified, unverified);
      assert.equal(plan.mode, "smoke");
      assert.ok(plan.testFiles.includes(`tests/${expected}.spec.ts`));
      assert.ok(plan.testFiles.includes("tests/lesson-smoke.spec.ts"));
    }
  }
  const files = ["src/components/teacher/assessment.tsx", "src/components/teacher/dashboard.tsx",
    "src/components/teacher/dialogs.tsx", "src/components/teacher/work-details.tsx", "src/components/teacher/lesson-preview.tsx",
    "src/components/student/review/sandwich.tsx", "src/lib/server/classroom.ts", "src/components/teacher/dashboard.tsx"];
  const plan = await selectScope(prEnv, async () => sha, () => files, unverified, unverified);
  assert.equal(plan.mode, "smoke");
  for (const spec of ["teacher-assessment", "teacher-review-workflow", "teacher-class-management", "teacher-lesson-preview",
    "teacher-preview-api", "classroom-api", "teacher-preparation", "ui-teacher-refinement", "review-sandwich", "lesson-smoke"]) {
    assert.ok(plan.testFiles.includes(`tests/${spec}.spec.ts`), spec);
  }
  assert.equal(plan.testFiles.length, new Set(plan.testFiles).size);
  assert.deepEqual(plan.lessonIds, ["review-sandwich"]);
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

test("main reuses only a passed pull_request run on the same tree, and never on pull requests or docs", async () => {
  const tree = "d".repeat(40);
  const passed = { id: 7, event: "pull_request", conclusion: "success", status: "completed", head_commit: { tree_id: tree } };
  const lookup = (runs) => findVerifiedRun(env, async () => ({ ok: true, json: async () => ({ workflow_runs: runs }) }), () => tree);
  assert.equal(await lookup([{ ...passed, id: 1, conclusion: "failure" }, { ...passed, id: 2, event: "push" },
    { ...passed, id: 3, status: "in_progress" }, { ...passed, id: 4, head_commit: { tree_id: "e".repeat(40) } }, passed]), 7);
  assert.equal(await lookup([{ ...passed, head_commit: null }]), null);
  await assert.rejects(findVerifiedRun(env, async () => ({ ok: false }), () => tree));
  assert.equal(await findVerifiedRun({}), null);

  const lesson = () => ["src/components/student/review/sandwich.tsx"];
  const reused = await selectScope(env, async () => sha, lesson, async () => 7);
  assert.equal(reused.mode, "verified");
  assert.match(reused.reason, /run 7/);
  assert.equal(reused.base, sha);
  assert.deepEqual(reused.testFiles, []);
  // Shared code too: the pull_request run already ran its smoke scope on this tree.
  assert.equal((await selectScope(env, async () => sha, () => ["src/components/student/use-work.ts"], async () => 7)).mode, "verified");

  assert.equal((await selectScope({ ...env, GITHUB_EVENT_NAME: "pull_request" }, async () => sha, lesson, async () => 7)).mode, "affected");
  assert.equal((await selectScope(env, async () => sha, () => ["docs/HANDOFF.md"], async () => 7)).mode, "docs");
  assert.equal((await selectScope(env, async () => sha, lesson, async () => { throw new Error("API failure"); })).mode, "affected");
});

test("a pull_request run reuses the last passed run of its branch only when that run recorded the same code", async () => {
  const code = "c".repeat(64);
  const lookup = (runs, jobs, runEnv = prEnv) => findTestedRun(runEnv, ciApi(runs, jobs), () => code);
  assert.equal(await lookup([passedRun], recorded(code)), 7);

  const urls = [];
  await findTestedRun(prEnv, async (url) => { urls.push(url); return ciApi([passedRun], recorded(code))(url); }, () => code);
  assert.match(urls[0], /verify\.yml\/runs\?branch=fix%2Fwork&event=pull_request&status=success&per_page=1$/);
  assert.match(urls[1], /actions\/runs\/7\/jobs$/);

  // No proof: each of these must leave E2E to run.
  assert.equal(await lookup([], recorded(code)), null);
  assert.equal(await lookup([passedRun], recorded("d".repeat(64))), null);
  assert.equal(await lookup([passedRun], recorded(code, "skipped")), null);
  assert.equal(await lookup([passedRun], [{ name: "app", steps: [{ name: "Run npm run build", conclusion: "success" }] }]), null);
  for (const other of [{ conclusion: "failure" }, { status: "in_progress" }, { event: "push" }, { event: "workflow_dispatch" },
    { head_branch: "fix/other" }, { head_repository: { full_name: "someone/fork" } }, { head_repository: null }, { id: 9 }]) {
    assert.equal(await lookup([{ ...passedRun, ...other }], recorded(code)), null, JSON.stringify(other));
  }
  // Nothing to ask with: these must not even reach the API.
  const noRequest = async () => { throw new Error("must not call the API"); };
  assert.equal(await findTestedRun({ ...prEnv, GITHUB_HEAD_REF: "" }, noRequest, () => code), null);
  assert.equal(await findTestedRun({ ...prEnv, GITHUB_TOKEN: "" }, noRequest, () => code), null);

  // Failed lookups reject here; selectScope turns that into its own E2E (below).
  await assert.rejects(findTestedRun(prEnv, async () => ({ ok: false }), () => code));
  await assert.rejects(findTestedRun(prEnv, async (url) => url.includes("/jobs") ? { ok: false } : ciApi([passedRun])(url), () => code));
  await assert.rejects(lookup([passedRun], undefined));
  await assert.rejects(findTestedRun(prEnv, ciApi([passedRun], recorded(code)), () => { throw new Error("no git"); }));
});

test("only pull_request events consult the tested-code lookup, and any failure runs E2E", async () => {
  const lesson = () => ["src/components/student/review/sandwich.tsx"];
  const refuse = async () => { throw new Error("must not be consulted"); };
  const reused = await selectScope(prEnv, async () => sha, lesson, refuse, async () => 7);
  assert.equal(reused.mode, "verified");
  assert.match(reused.reason, /run 7/);
  assert.equal(reused.base, sha);
  assert.deepEqual(reused.testFiles, []);
  assert.equal((await selectScope(prEnv, async () => sha, () => ["src/components/student/use-work.ts"], refuse, async () => 7)).mode, "verified");

  // No match or a failed lookup keeps today's scope.
  assert.equal((await selectScope(prEnv, async () => sha, lesson, refuse, async () => null)).mode, "affected");
  assert.equal((await selectScope(prEnv, async () => sha, lesson, refuse, refuse)).mode, "affected");
  const shared = await selectScope(prEnv, async () => sha, () => ["src/components/student/use-work.ts"], refuse, refuse);
  assert.equal(shared.mode, "smoke");
  assert.deepEqual(shared.testFiles, ["tests/lesson-smoke.spec.ts"]);
  // A real lookup failing on the API also ends there, not in a crash or a skip.
  const unreachable = (runEnv) => findTestedRun(runEnv, async () => ({ ok: false }), () => "c".repeat(64));
  assert.equal((await selectScope(prEnv, async () => sha, lesson, refuse, unreachable)).mode, "affected");

  // These lookups would claim a match, so a wrong call to them shows up as `verified`.
  const match = async () => 7;
  assert.equal((await selectScope(prEnv, async () => sha, () => ["docs/HANDOFF.md"], match, match)).mode, "docs");
  assert.equal((await selectScope(prEnv, async () => sha, lesson, match, async () => null)).mode, "affected");
  assert.equal((await selectScope(env, async () => sha, lesson, async () => null, match)).mode, "affected");
  assert.equal((await selectScope({ GITHUB_ACTIONS: "true" }, async () => sha, lesson, match, match)).mode, "affected");
  assert.equal((await selectScope({ ...prEnv, GITHUB_EVENT_NAME: "workflow_dispatch" }, refuse, lesson, match, match)).mode, "full");
});

test("only a pull_request run on its normal scope leaves a record", async () => {
  const code = () => "c".repeat(64);
  for (const mode of ["affected", "smoke", "verified"]) assert.equal(codeToRecord(prEnv, { mode, base: sha }, code), code());
  assert.equal(codeToRecord(prEnv, { mode: "docs", base: sha }, code), "");
  assert.equal(codeToRecord(env, { mode: "affected", base: sha }, code), "");
  assert.equal(codeToRecord({ ...prEnv, GITHUB_EVENT_NAME: "workflow_dispatch" }, { mode: "full", base: null }, code), "");
  assert.equal(codeToRecord(prEnv, { mode: "smoke", base: sha }, () => { throw new Error("no git"); }), "");
  // Without a baseline, or when comparison fails, the run tried smoke alone and must not stand in for the real scope.
  for (const [baseline, diff] of [[async () => null], [async () => { throw new Error("API failure"); }],
    [async () => sha, () => { throw new Error("missing history"); }]]) {
    assert.equal(codeToRecord(prEnv, await selectScope(prEnv, baseline, diff), code), "");
  }
});

test("the workflow records tested code last, under the name the next run looks for", () => {
  const workflow = readFileSync(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8");
  const step = workflow.indexOf("- name: Record tested code ${{ steps.scope.outputs.code }}");
  const e2e = workflow.lastIndexOf("run: npm run test:e2e:scope");
  assert.ok(e2e > 0 && step > e2e, "must run after E2E");
  assert.doesNotMatch(workflow.slice(step + 1), /^\s+- /m, "must be the last step");
  // No status function here: a failed step above skips the record.
  assert.match(workflow.slice(step), /\n\s+if: steps\.scope\.outputs\.code != ''\s/);
});

test("the fingerprint changes with every non-document file and with nothing else", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cs-class-code-"));
  const previous = process.cwd();
  const runGit = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const commit = () => {
    runGit("add", "-A");
    runGit("-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
  };
  const write = (file, text) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); };
  try {
    runGit("init", "--quiet");
    write("src/app.ts", "one\n"); write("docs/guide.md", "one\n"); commit();
    process.chdir(root);
    const first = codeFingerprint();
    assert.match(first, /^[a-f0-9]{64}$/);

    write("docs/guide.md", "two\n"); write("docs/new/deep.md", "new\n"); write("README.md", "new\n"); write("AGENTS.md", "new\n"); commit();
    assert.equal(codeFingerprint(), first);
    rmSync(path.join(root, "docs/new/deep.md")); commit();
    assert.equal(codeFingerprint(), first);

    // What classify treats as code stays code, wherever it lives.
    for (const file of ["docs/example.ts", "notes.md", "src/README.md", "docs/guide.md.bak"]) {
      write(file, "x\n"); commit();
      assert.notEqual(codeFingerprint(), first, file);
      rmSync(path.join(root, file)); commit();
      assert.equal(codeFingerprint(), first, file);
    }
    write("src/app.ts", "two\n"); commit();
    assert.notEqual(codeFingerprint(), first);
    write("src/app.ts", "one\n"); commit();
    assert.equal(codeFingerprint(), first);
    renameSync(path.join(root, "src/app.ts"), path.join(root, "src/moved.ts")); commit();
    assert.notEqual(codeFingerprint(), first, "same content under a new path");
    renameSync(path.join(root, "src/moved.ts"), path.join(root, "src/app.ts")); commit();
    assert.equal(codeFingerprint(), first);
    runGit("update-index", "--chmod=+x", "src/app.ts");
    runGit("-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "mode");
    assert.notEqual(codeFingerprint(), first, "mode change");
  } finally { process.chdir(previous); rmSync(root, { recursive: true, force: true }); }
});

test("a chain of pull_request runs stays tied to the code that last passed E2E", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "cs-class-chain-"));
  const previous = process.cwd();
  const runGit = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const identity = ["-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "-c", "commit.gpgsign=false"];
  const commitFile = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
    runGit("add", "-A");
    runGit(...identity, "commit", "-qm", file);
    return runGit("rev-parse", "HEAD");
  };
  const commitOn = (branch, file, text) => { runGit("checkout", "-q", branch); return commitFile(file, text); };
  // GitHub checks out a throwaway merge of the pull request into main's tip; pull_request runs see that.
  let last = null;
  const prRun = async ({ pass = true } = {}) => {
    runGit("checkout", "-q", "--detach", "main");
    runGit(...identity, "merge", "-q", "--no-ff", "-m", "test merge", "work");
    const lookup = (runEnv) => findTestedRun(runEnv, ciApi(last ? [passedRun] : [], last));
    const plan = await selectScope(prEnv, async () => base, changedFiles, unverified, lookup);
    // The API filters on success, so a failed run leaves the previous record as the latest.
    if (pass) {
      const code = codeToRecord(prEnv, plan);
      assert.ok(code, "a normal scope records its code");
      last = recorded(code);
    }
    return plan.mode;
  };
  let base;
  try {
    runGit("init", "--quiet", "-b", "main");
    base = commitFile("src/main.ts", "main\n");
    commitFile("docs/guide.md", "guide\n");
    runGit("checkout", "-q", "-b", "work");
    process.chdir(root);

    const firstCode = commitOn("work", "src/work.ts", "one\n");
    assert.equal(await prRun(), "smoke", "nothing recorded yet");
    assert.equal(await prRun(), "verified", "same commit again");

    commitOn("work", "docs/guide-work.md", "docs\n");
    assert.equal(await prRun(), "verified", "docs commit");
    commitOn("work", "docs/guide-more.md", "more docs\n");
    assert.equal(await prRun(), "verified", "second docs commit reads the record of a run that skipped E2E");
    commitOn("main", "README.md", "main moved by documents\n");
    assert.equal(await prRun(), "verified", "main moved by documents only");

    commitOn("work", "src/work.ts", "two\n");
    assert.equal(await prRun({ pass: false }), "smoke", "code after a verified run still runs E2E");
    commitOn("work", "docs/after-failure.md", "docs\n");
    assert.equal(await prRun(), "smoke", "docs on top of failed code do not inherit the older pass");
    commitOn("work", "docs/after-pass.md", "docs\n");
    assert.equal(await prRun(), "verified", "that E2E pass counts for the next docs commit");

    commitOn("main", "src/main.ts", "main moved by code\n");
    commitOn("work", "docs/after-move.md", "docs\n");
    assert.equal(await prRun(), "smoke", "main moved by code: the merged files are new");
    assert.equal(await prRun(), "verified", "then that merge has passed");

    // A force-push back to older code differs from the last record even if that code once passed.
    runGit("checkout", "-q", "work");
    runGit("reset", "-q", "--hard", firstCode);
    assert.equal(await prRun(), "smoke", "force-push to older code");
  } finally { process.chdir(previous); rmSync(root, { recursive: true, force: true }); }
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
