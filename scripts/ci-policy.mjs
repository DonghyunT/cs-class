import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { selectE2E } from "./e2e-scope.mjs";

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

// Only successful main push runs can establish a baseline; canceled/manual runs cannot.
export async function findBaseline(env, request = fetch, ancestor = (sha) => {
  try { git("merge-base", "--is-ancestor", sha, "HEAD"); return true; }
  catch { return false; }
}) {
  if (!env.GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? "")) return null;
  const endpoint = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/verify.yml/runs`;
  for (let page = 1; page <= 10; page++) {
    const response = await request(`${endpoint}?branch=main&event=push&status=success&per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Cannot read successful CI runs");
    const body = await response.json();
    if (!Array.isArray(body.workflow_runs)) throw new Error("Invalid CI run list");
    for (const run of body.workflow_runs) {
      if (run.event === "push" && run.head_branch === "main" && run.conclusion === "success"
        && run.status === "completed" && String(run.id) !== env.GITHUB_RUN_ID
        && /^[a-f0-9]{40}$/i.test(run.head_sha ?? "") && run.head_sha !== env.GITHUB_SHA
        && ancestor(run.head_sha)) return run.head_sha;
    }
    if (body.workflow_runs.length < 100) break;
  }
  return null;
}

export async function selectScope(env, baseline = findBaseline, diff = changedFiles) {
  // Manual trigger in GitHub Actions is always full E2E
  if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
    return { mode: "full", reason: "manual workflow execution", base: null, lessonIds: [], testFiles: [] };
  }

  // CI push on main branch
  if (env.GITHUB_EVENT_NAME === "push" && env.GITHUB_REF === "refs/heads/main") {
    try {
      const base = await baseline(env);
      if (!base) return { mode: "full", reason: "no verified main baseline", base: null, lessonIds: [], testFiles: [] };
      const files = diff(base);
      const plan = selectE2E(files);
      return { ...plan, base };
    } catch {
      return { mode: "full", reason: "comparison unavailable; full verification required", base: null, lessonIds: [], testFiles: [] };
    }
  }

  // Other CI events (pull_request, etc.)
  if (env.GITHUB_EVENT_NAME || env.GITHUB_ACTIONS) {
    return { mode: "full", reason: "manual or non-main execution", base: null, lessonIds: [], testFiles: [] };
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
