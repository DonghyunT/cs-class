import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { matchLesson, selectE2E, smokeRelatedTests } from "./e2e-scope.mjs";

export function isDocument(file) {
  return file === "README.md" || file === "AGENTS.md" || /^docs\/.+\.md$/.test(file);
}

export function classify(files) {
  return files.length > 0 && files.every(isDocument) ? "docs" : "full";
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function changedFiles(base, head = "HEAD") {
  if (!/^[a-f0-9]{40}$/i.test(base)) throw new Error("Invalid comparison SHA");
  git("merge-base", "--is-ancestor", base, head);
  return git("diff", "--name-only", "--no-renames", "-z", base, head).split("\0").filter(Boolean);
}

export function changedFilesLocal(baseRef = "origin/main") {
  const files = new Set();
  try {
    // 1. Unstaged changes in working tree
    for (const f of git("diff", "--name-only", "--no-renames", "-z").split("\0").filter(Boolean)) {
      files.add(f);
    }
    // 2. Staged changes in index
    for (const f of git("diff", "--cached", "--name-only", "--no-renames", "-z").split("\0").filter(Boolean)) {
      files.add(f);
    }
    // 3. Committed changes compared to baseRef (or HEAD~1 if baseRef unavailable)
    let comparisonBase = baseRef;
    try {
      git("rev-parse", "--verify", comparisonBase);
    } catch {
      comparisonBase = "HEAD~1";
    }
    try {
      for (const f of git("diff", "--name-only", "--no-renames", "-z", comparisonBase, "HEAD").split("\0").filter(Boolean)) {
        files.add(f);
      }
    } catch {
      // If comparison fails, we rely on working tree + staged
    }
  } catch {
    // Fallback if git fails
  }
  return Array.from(files);
}

function canReadRuns(env) {
  return Boolean(env.GITHUB_TOKEN) && /^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? "");
}

async function readActions(env, path, request) {
  const response = await request(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/${path}`, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Cannot read CI runs");
  return response.json();
}

async function listRuns(env, query, request) {
  const body = await readActions(env, `workflows/verify.yml/runs?${query}`, request);
  if (!Array.isArray(body.workflow_runs)) throw new Error("Invalid CI run list");
  return body.workflow_runs;
}

// Only successful main push runs can establish a baseline; canceled/manual runs cannot.
export async function findBaseline(env, request = fetch, ancestor = (sha) => {
  try { git("merge-base", "--is-ancestor", sha, "HEAD"); return true; }
  catch { return false; }
}) {
  if (!canReadRuns(env)) return null;
  for (let page = 1; page <= 10; page++) {
    const runs = await listRuns(env, `branch=main&event=push&status=success&per_page=100&page=${page}`, request);
    for (const run of runs) {
      if (run.event === "push" && run.head_branch === "main" && run.conclusion === "success"
        && run.status === "completed" && String(run.id) !== env.GITHUB_RUN_ID
        && /^[a-f0-9]{40}$/i.test(run.head_sha ?? "") && run.head_sha !== env.GITHUB_SHA
        && ancestor(run.head_sha)) return run.head_sha;
    }
    if (runs.length < 100) break;
  }
  return null;
}

// Main can reuse a trusted PR's actual tested code, even when only documents changed after that run.
export async function findVerifiedRun(env, request = fetch, fingerprint = codeFingerprint) {
  if (!canReadRuns(env)) return null;
  const code = fingerprint();
  for (const run of await listRuns(env, "event=pull_request&status=success&per_page=100", request)) {
    if (await hasTestedCode(env, run, code, request)) return run.id;
  }
  return null;
}

// What E2E can see: the checked-out merge commit's paths, modes and contents, without documents. It compares what was
// actually tested, so main moving, force-pushes and chains of runs need no separate handling.
export function codeFingerprint() {
  const code = git("ls-tree", "-r", "-z", "HEAD").split("\0").filter(entry => entry && !isDocument(entry.slice(entry.indexOf("\t") + 1)));
  return createHash("sha256").update(code.join("\0")).digest("hex");
}

// A pull_request run's last step is named after the code it passed (the API leaves no other trace of what a run merged).
// Only the branch's latest passed run counts; forks are out because they can rewrite the workflow that names the step.
export async function findTestedRun(env, request = fetch, fingerprint = codeFingerprint) {
  if (!canReadRuns(env) || !env.GITHUB_HEAD_REF) return null;
  const [run] = await listRuns(env, `branch=${encodeURIComponent(env.GITHUB_HEAD_REF)}&event=pull_request&status=success&per_page=1`, request);
  if (run?.head_branch !== env.GITHUB_HEAD_REF) return null;
  return await hasTestedCode(env, run, fingerprint(), request) ? run.id : null;
}

async function hasTestedCode(env, run, code, request) {
  if (run?.event !== "pull_request" || run.conclusion !== "success" || run.status !== "completed"
    || String(run.id) === env.GITHUB_RUN_ID || run.head_repository?.full_name !== env.GITHUB_REPOSITORY) return false;
  const { jobs } = await readActions(env, `runs/${run.id}/jobs`, request);
  const record = `Record tested code ${code}`;
  return jobs.some(job => job.name === "app" && job.conclusion === "success"
    && job.steps.some(step => step.name === record && step.conclusion === "success"));
}

// Docs runs skip E2E, and a run without a baseline tried smoke alone, so neither may stand in for a later commit's scope.
export function codeToRecord(env, plan, fingerprint = codeFingerprint) {
  if (env.GITHUB_EVENT_NAME !== "pull_request" || !plan.base || plan.mode === "docs") return "";
  try { return fingerprint(); }
  catch { return ""; }
}

function smokeScope(reason, base = null, files = []) {
  const related = selectE2E(files.filter(file => matchLesson(file)));
  return { mode: "smoke", reason: `${reason}; full E2E requires workflow_dispatch`, base,
    lessonIds: related.mode === "affected" ? related.lessonIds : [],
    testFiles: [...new Set([...(related.mode === "affected" ? related.testFiles : []), ...smokeRelatedTests(files), "tests/lesson-smoke.spec.ts"])] };
}

export async function selectScope(env, baseline = findBaseline, diff = changedFiles, verified = findVerifiedRun, tested = findTestedRun) {
  // Manual trigger in GitHub Actions is always full E2E
  if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
    return { mode: "full", reason: "manual workflow execution", base: null, lessonIds: [], testFiles: [] };
  }

  // Automatic CI never escalates to the full suite, even if comparison fails.
  if (env.GITHUB_EVENT_NAME || env.GITHUB_ACTIONS) {
    try {
      const base = await baseline(env);
      if (!base) return smokeScope("no successful main baseline");
      const files = diff(base);
      const plan = selectE2E(files);
      const reuse = { push: verified, pull_request: tested }[env.GITHUB_EVENT_NAME];
      if (plan.mode !== "docs" && reuse) {
        // Without that proof, or when the lookup fails, this run does its own app checks.
        const run = await reuse(env).catch(() => null);
        if (run) return { mode: "verified", reason: `pull_request run ${run} already passed on this code`, base, lessonIds: [], testFiles: [] };
      }
      if (plan.mode === "full") return smokeScope(plan.reason, base, files);
      return { ...plan, base };
    } catch {
      return smokeScope("comparison unavailable");
    }
  }

  // Local development execution (outside CI)
  try {
    const files = typeof diff === "function" && diff !== changedFiles ? diff("local") : changedFilesLocal();
    const plan = selectE2E(files);
    return { ...plan, base: "local" };
  } catch {
    return { mode: "full", reason: "local diff inspection failed", base: null, lessonIds: [], testFiles: [] };
  }
}

export function ignoreBuild(env, diff = changedFiles) {
  try { return classify(diff(env.VERCEL_GIT_PREVIOUS_SHA)) === "docs"; }
  catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "ignore-build") {
    const skip = ignoreBuild(process.env);
    console.log(skip ? "Documents only: skip app build" : "Build required (changes or unavailable baseline)");
    process.exitCode = skip ? 0 : 1;
  } else if (process.argv[2] === "scope") {
    const result = await selectScope(process.env);
    console.log(JSON.stringify(result));
    try {
      mkdirSync("scratch/ci", { recursive: true });
      writeFileSync("scratch/ci/e2e-plan.json", JSON.stringify(result, null, 2));
    } catch (err) {
      console.warn("Could not write scratch/ci/e2e-plan.json:", err.message);
    }
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\nbase=${result.base ?? ""}\nplan=scratch/ci/e2e-plan.json\ncode=${codeToRecord(process.env, result)}\n`);
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `### Verification scope\n- Mode: ${result.mode}\n- Reason: ${result.reason}\n- Baseline: ${result.base ?? "none"}\n- Lessons: ${result.lessonIds.join(", ") || "none"}\n- Test files: ${result.testFiles.length}\n`);
    }
  } else {
    console.error("Usage: node scripts/ci-policy.mjs scope|ignore-build");
    process.exitCode = 1;
  }
}
