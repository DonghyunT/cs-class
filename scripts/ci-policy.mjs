import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

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
  if (env.GITHUB_EVENT_NAME !== "push" || env.GITHUB_REF !== "refs/heads/main") {
    return { mode: "full", reason: "manual or non-main execution", base: null };
  }
  try {
    const base = await baseline(env);
    if (!base) return { mode: "full", reason: "no verified main baseline", base: null };
    const mode = classify(diff(base));
    return { mode, reason: mode === "docs" ? "documents only since successful main CI" : "runtime/configuration or unclassified changes", base };
  } catch {
    return { mode: "full", reason: "comparison unavailable; full verification required", base: null };
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
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\nbase=${result.base ?? ""}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Verification scope\n- Mode: ${result.mode}\n- Reason: ${result.reason}\n- Baseline: ${result.base ?? "none"}\n`);
  } else {
    console.error("Usage: node scripts/ci-policy.mjs scope|ignore-build");
    process.exitCode = 1;
  }
}
