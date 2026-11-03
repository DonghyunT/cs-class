import { execFileSync } from "node:child_process";
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

async function listRuns(env, query, request) {
  const response = await request(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/verify.yml/runs?${query}`, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Cannot read CI runs");
  const body = await response.json();
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

// A main commit whose files match a pull_request run that passed needs no second E2E.
// shortcut: a pull_request run tests the PR merged into main at that moment, not its head. The two differ only when main
// moved before the run; that move also changes the squash result, so the match fails and main runs E2E, unless main
// reverted it before the merge. Have pull_request runs record the tree they tested if that case ever matters.
export async function findVerifiedRun(env, request = fetch, tree = () => git("rev-parse", "HEAD^{tree}")) {
  if (!canReadRuns(env)) return null;
  const head = tree();
  const run = (await listRuns(env, "event=pull_request&status=success&per_page=100", request)).find(candidate =>
    candidate.event === "pull_request" && candidate.conclusion === "success" && candidate.status === "completed"
    && candidate.head_commit?.tree_id === head);
  return run?.id ?? null;
}

function smokeScope(reason, base = null, files = []) {
  const related = selectE2E(files.filter(file => matchLesson(file)));
  return { mode: "smoke", reason: `${reason}; full E2E requires workflow_dispatch`, base,
    lessonIds: related.mode === "affected" ? related.lessonIds : [],
    testFiles: [...new Set([...(related.mode === "affected" ? related.testFiles : []), ...smokeRelatedTests(files), "tests/lesson-smoke.spec.ts"])] };
}

export async function selectScope(env, baseline = findBaseline, diff = changedFiles, verified = findVerifiedRun) {
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
      if (plan.mode !== "docs" && env.GITHUB_EVENT_NAME === "push") {
        // Without that proof, or when the lookup fails, main runs its own E2E.
        const run = await verified(env).catch(() => null);
        if (run) return { mode: "verified", reason: `pull_request run ${run} passed E2E on the same file tree`, base, lessonIds: [], testFiles: [] };
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
      appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\nbase=${result.base ?? ""}\nplan=scratch/ci/e2e-plan.json\n`);
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
