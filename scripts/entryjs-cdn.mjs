// Serves the Entry workspace from Cloudflare instead of Vercel (docs/FIREBASE_SETUP.md, "엔트리 라이브러리 CDN").
//   node scripts/entryjs-cdn.mjs html    (prebuild) on Vercel production builds, point the lesson iframe at the CDN
//   node scripts/entryjs-cdn.mjs bundle  write scratch/entry-cdn/ for `wrangler deploy`
// CDN layout:
//   /<vendor fingerprint 16>/…               Entry vendor files of one scripts/entryjs-assets.json version
//   /v/<bridge 16>-<vendor 16>/workspace.*   the bridge (workspace.html/js/css), several versions side by side
//   /entryjs/…                               the app's /entryjs/ files: saved projects name pictures by that path
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// No import.meta: Playwright loads this module from CommonJS-compiled specs. npm runs scripts from the repo root.
const root = process.cwd();
const entryjs = path.join(root, "public/entryjs");
const vendor = path.join(entryjs, "vendor");
const workspace = path.join(entryjs, "workspace.html");
const workspaceSrc = path.join(root, "src/lib/classroom/entry-workspace.json");
const bundle = path.join(root, "scratch/entry-cdn");

export const LOCAL_WORKSPACE = "/entryjs/workspace.html";
export const BRIDGE_FILES = ["workspace.html", "workspace.js", "workspace.css"];
// Bridge versions kept on the CDN, so a page opened before an upload or a rolled-back deployment still finds its own.
export const KEPT_BRIDGES = 20;
// Workers Free static asset limits (developers.cloudflare.com/workers/platform/limits/#static-assets).
const MAX_FILES = 20_000, MAX_FILE_BYTES = 25 * 1024 * 1024;

function cdnOrigin(base) {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) throw new Error(`Entry CDN base must be a bare https origin: ${base}`);
  return url.origin;
}

// The vendor files of one scripts/entryjs-assets.json version live under their own path, so versions never mix.
export function cdnPrefix(base, fingerprint) {
  return `${cdnOrigin(base)}/${fingerprint.slice(0, 16)}`;
}

// The bridge path names both fingerprints, so a file under it never changes and may be cached for good.
export function bridgePrefix(base, bridge, fingerprint) {
  return `${cdnOrigin(base)}/v/${bridge.slice(0, 16)}-${fingerprint.slice(0, 16)}`;
}

// Hashes the three bridge files with Windows line endings folded, so a Windows checkout, git and Vercel agree.
export function bridgeFingerprint(files) {
  const hash = createHash("sha256");
  for (const name of BRIDGE_FILES) hash.update(`${name}\0${files[name].replaceAll("\r\n", "\n")}\0`);
  return hash.digest("hex");
}

export function rewriteWorkspace(html, prefix) {
  const rewritten = html.replaceAll('"/entryjs/vendor/', `"${prefix}/`);
  if (!rewritten.includes(`"${prefix}/entry/dist/entry.min.js"`)) throw new Error("workspace.html no longer loads entry.min.js from /entryjs/vendor/");
  // The bridge loads its own files relative to the page, so the same HTML works from /entryjs/ and from the CDN.
  if (!rewritten.includes('src="workspace.js"') || !rewritten.includes('href="workspace.css"')) throw new Error("workspace.html must load workspace.js and workspace.css by relative path");
  return rewritten;
}

const readText = (fetchImpl, url) => fetchImpl(url, { signal: AbortSignal.timeout(10_000) }).then((response) => response.ok ? response.text() : "").catch(() => "");

// Returns the workspace HTML to ship and the address the lesson iframe opens. Anything but a production build with a
// configured base that the CDN already serves keeps the local files, so a deployment that reaches Vercel before its
// CDN upload cannot break lessons; it only keeps using Vercel requests until the next build.
export async function workspaceForBuild({ html, bridge, vercelEnv, base, fingerprint, fetchImpl = fetch }) {
  if (vercelEnv !== "production" || !base) return { html, src: LOCAL_WORKSPACE, reason: "local" };
  const prefix = cdnPrefix(base, fingerprint);
  if ((await readText(fetchImpl, `${prefix}/version.txt`)).trim() !== fingerprint) return { html, src: LOCAL_WORKSPACE, reason: `missing ${prefix}/version.txt` };
  const rewritten = rewriteWorkspace(html, prefix);
  const bridged = bridgePrefix(base, bridge, fingerprint);
  if ((await readText(fetchImpl, `${bridged}/version.txt`)).trim() !== `${bridge} ${fingerprint}`) return { html: rewritten, src: LOCAL_WORKSPACE, reason: `${prefix}, missing ${bridged}/version.txt` };
  return { html: rewritten, src: `${bridged}/workspace.html`, reason: `${prefix}, ${bridged}` };
}

// The bridge versions to keep: the checked-out files first, then the latest distinct versions on origin/main that
// already talk to their page by referrer (older ones only worked from the app's own origin and nothing points at them).
export function bridgeVersions({ current, git, limit = KEPT_BRIDGES }) {
  const versions = new Map([[bridgeFingerprint(current), current]]);
  const commits = git(["log", "--format=%H", "origin/main", "--", ...BRIDGE_FILES.map((name) => `public/entryjs/${name}`)]).split("\n").filter(Boolean);
  for (const commit of commits) {
    if (versions.size >= limit) break;
    let files;
    try { files = Object.fromEntries(BRIDGE_FILES.map((name) => [name, git(["show", `${commit}:public/entryjs/${name}`])])); }
    catch { break; }
    if (!files["workspace.js"].includes("const APP_ORIGIN")) break;
    const key = bridgeFingerprint(files);
    if (!versions.has(key)) versions.set(key, files);
  }
  return versions;
}

// Header rules must not overlap: Cloudflare joins a header that two matching rules set with a comma.
// The sandboxed iframe has an opaque origin, so CORS must allow any.
export function cdnHeaders(fingerprint) {
  return [
    "/*", "  Access-Control-Allow-Origin: *", "  X-Content-Type-Options: nosniff", "  X-Robots-Tag: noindex",
    `/${fingerprint.slice(0, 16)}/*`, "  Cache-Control: public, max-age=31536000, immutable",
    "/v/*", "  Cache-Control: public, max-age=31536000, immutable",
    // Same as next.config.ts gives these paths on Vercel: they keep their URLs when a picture changes.
    "/entryjs/*", "  Cache-Control: public, max-age=86400",
  ].join("\n") + "\n";
}

async function listFiles(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

// Writes the whole CDN folder. `out` must be a folder that holds only generated files: it is emptied first.
export async function writeBundle({ out, base, fingerprint, versions, source = entryjs }) {
  await rm(out, { recursive: true, force: true });
  const vendorTarget = path.join(out, fingerprint.slice(0, 16));
  await mkdir(vendorTarget, { recursive: true });
  await cp(path.join(source, "vendor"), vendorTarget, { recursive: true, filter: (file) => path.basename(file) !== ".prepared" });
  await writeFile(path.join(vendorTarget, "version.txt"), fingerprint);
  // Everything else the app serves under /entryjs/; the bridge itself only lives under /v/.
  await cp(source, path.join(out, "entryjs"), { recursive: true, filter: (file) => path.basename(file) !== ".prepared" && !(path.dirname(file) === source && BRIDGE_FILES.includes(path.basename(file))) });
  const vendorPrefix = cdnPrefix(base, fingerprint);
  for (const [bridge, files] of versions) {
    const target = path.join(out, new URL(bridgePrefix(base, bridge, fingerprint)).pathname);
    await mkdir(target, { recursive: true });
    const lf = Object.fromEntries(BRIDGE_FILES.map((name) => [name, files[name].replaceAll("\r\n", "\n")]));
    await writeFile(path.join(target, "workspace.html"), rewriteWorkspace(lf["workspace.html"], vendorPrefix));
    await writeFile(path.join(target, "workspace.js"), lf["workspace.js"]);
    await writeFile(path.join(target, "workspace.css"), lf["workspace.css"]);
    await writeFile(path.join(target, "version.txt"), `${bridge} ${fingerprint}`);
  }
  await writeFile(path.join(out, "_headers"), cdnHeaders(fingerprint));
  const files = await listFiles(out);
  const large = files.filter((file) => statSync(file).size > MAX_FILE_BYTES);
  if (files.length > MAX_FILES || large.length) throw new Error(`Entry CDN bundle exceeds the Workers Free limits: ${files.length} files, too large: ${large.join(", ")}`);
  return files.length;
}

async function main(mode) {
  if (!existsSync(path.join(root, "scripts/entryjs-cdn.mjs"))) throw new Error("Run scripts/entryjs-cdn.mjs from the repository root");
  const fingerprint = (await readFile(path.join(vendor, ".prepared"), "utf8")).trim();
  const { base } = JSON.parse(await readFile(path.join(root, "scripts/entryjs-cdn.json"), "utf8"));
  const current = Object.fromEntries(BRIDGE_FILES.map((name) => [name, readFileSync(path.join(entryjs, name), "utf8")]));
  if (mode === "html") {
    const html = current["workspace.html"];
    const result = await workspaceForBuild({ html, bridge: bridgeFingerprint(current), vercelEnv: process.env.VERCEL_ENV, base, fingerprint });
    // Rewritten in place: only Vercel's throwaway build checkout reaches these branches.
    if (result.html !== html) await writeFile(workspace, result.html);
    if (result.src !== LOCAL_WORKSPACE) await writeFile(workspaceSrc, `${JSON.stringify({ src: result.src }, null, 2)}\n`);
    console.log(`Entry vendor files: ${result.reason}`);
  } else if (mode === "bundle") {
    if (!base) throw new Error("Set base in scripts/entryjs-cdn.json first");
    // This directory contains only generated files; never delete outside it.
    if (path.relative(root, bundle) !== path.join("scratch", "entry-cdn")) throw new Error("Invalid Entry CDN bundle directory");
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    // Every upload replaces the whole CDN, so start from the deployed history: production runs a version from origin/main.
    git(["fetch", "--quiet", "origin", "main"]);
    const versions = bridgeVersions({ current, git });
    const count = await writeBundle({ out: bundle, base, fingerprint, versions });
    console.log(`Entry CDN bundle ready: scratch/entry-cdn (${count} files, ${versions.size} bridge versions, current ${bridgePrefix(base, bridgeFingerprint(current), fingerprint)})`);
  } else {
    throw new Error("Usage: node scripts/entryjs-cdn.mjs html|bundle");
  }
}

if (path.basename(process.argv[1] ?? "") === "entryjs-cdn.mjs") main(process.argv[2]).catch((error) => { console.error(error); process.exitCode = 1; });
