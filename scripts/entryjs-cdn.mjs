// Serves the Entry workspace from its own host or from Cloudflare (docs/FIREBASE_SETUP.md, "엔트리 작업실 주소").
//   node scripts/entryjs-cdn.mjs html    (prebuild) on Vercel production builds, point the lesson iframe there
//   node scripts/entryjs-cdn.mjs bundle  write scratch/entry-cdn/ for `wrangler deploy`
// CDN layout:
//   /<vendor fingerprint 16>/…               Entry vendor files of one scripts/entryjs-assets.json version
//   /v/<bridge 16>-<vendor 16>/workspace.*   the bridge (workspace.html/js/css), several versions side by side
//   /entryjs/…                               the app's /entryjs/ files: saved projects name pictures by that path;
//                                            /entryjs/cdn-version.txt names the mirror and vendor fingerprints
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
export const MIRROR_VERSION = "entryjs/cdn-version.txt";
// Workers Free static asset limits (developers.cloudflare.com/workers/platform/limits/#static-assets).
const MAX_FILES = 20_000, MAX_FILE_BYTES = 25 * 1024 * 1024;

function cdnOrigin(base) {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) throw new Error(`Entry CDN base must be a bare https origin: ${base}`);
  return url.origin;
}

// A second production domain of this Vercel project that serves only /entryjs/ (next.config.ts redirects the rest).
export function workspaceHostSrc(host) {
  const url = new URL(`https://${host}`);
  if (url.host !== host || url.port) throw new Error(`Entry workspaceHost must be a bare host name: ${host}`);
  return `https://${host}${LOCAL_WORKSPACE}`;
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

async function listFiles(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

// Vercel builds without the files .vercelignore names (sprites/library/NOTICE.md through `*.md`), so the mirror and
// its fingerprint leave them out too. Patterns with a slash match from the repository root, others any path segment.
export function vercelIgnored(file, patterns) {
  const glob = (pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*")}$`);
  const segments = file.split("/");
  return patterns.some((pattern) => pattern.includes("/")
    ? segments.some((_, i) => glob(pattern.replace(/\/$/, "")).test(segments.slice(0, i + 1).join("/")))
    : segments.some((segment) => glob(pattern).test(segment)));
}

const ignorePatterns = () => existsSync(path.join(root, ".vercelignore"))
  ? readFileSync(path.join(root, ".vercelignore"), "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
  : [];
// A file under `source` as the repository names it, for .vercelignore.
const repoPath = (source, file) => path.relative(root, path.join(source, file)).split(path.sep).join("/");

// Hashes what the /entryjs/ mirror serves besides the vendor copy (named by its own fingerprint) and the bridge, so a
// build whose sprites the CDN does not have yet keeps the app's files. Every file gets CRLF folded byte for byte,
// binary ones too, so a Windows checkout and Vercel's Linux checkout agree.
export async function mirrorFingerprint(source = entryjs, patterns = ignorePatterns()) {
  const files = (await listFiles(source)).map((file) => path.relative(source, file).split(path.sep).join("/"))
    .filter((file) => !file.startsWith("vendor/") && !BRIDGE_FILES.includes(file) && !vercelIgnored(repoPath(source, file), patterns)).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update((await readFile(path.join(source, file), "latin1")).replaceAll("\r\n", "\n"), "latin1");
    hash.update("\0");
  }
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
// configured host or base that already serves the workspace keeps the local files, so a build that runs before the
// domain is set up or the CDN upload cannot break lessons; it only keeps using the app's own copy until the next build.
export async function workspaceForBuild({ html, bridge, mirror, vercelEnv, base, workspaceHost, fingerprint, fetchImpl = fetch }) {
  if (vercelEnv !== "production" || (!base && !workspaceHost)) return { html, src: LOCAL_WORKSPACE, reason: "local" };
  if (!base) {
    // The host serves the same deployment as the app, so its vendor paths stay as they are. A domain that still
    // redirects to the app would open the app's own sandboxed copy and gain nothing.
    const src = workspaceHostSrc(workspaceHost);
    const status = await fetchImpl(src, { redirect: "manual", signal: AbortSignal.timeout(10_000) }).then((response) => response.status).catch(() => 0);
    return status === 200 ? { html, src, reason: `workspace host ${workspaceHost}` } : { html, src: LOCAL_WORKSPACE, reason: `${workspaceHost} answered ${status || "nothing"} for ${LOCAL_WORKSPACE}` };
  }
  const prefix = cdnPrefix(base, fingerprint);
  if ((await readText(fetchImpl, `${prefix}/version.txt`)).trim() !== fingerprint) return { html, src: LOCAL_WORKSPACE, reason: `missing ${prefix}/version.txt` };
  const rewritten = rewriteWorkspace(html, prefix);
  const bridged = bridgePrefix(base, bridge, fingerprint);
  if ((await readText(fetchImpl, `${bridged}/version.txt`)).trim() !== `${bridge} ${fingerprint}`) return { html: rewritten, src: LOCAL_WORKSPACE, reason: `${prefix}, missing ${bridged}/version.txt` };
  // Sprites added or changed in this build must already be on the CDN before the iframe moves there.
  const mirrored = `${cdnOrigin(base)}/${MIRROR_VERSION}`;
  if ((await readText(fetchImpl, mirrored)).trim() !== `${mirror} ${fingerprint}`) return { html: rewritten, src: LOCAL_WORKSPACE, reason: `${prefix}, ${bridged}, stale ${mirrored} (this build: ${mirror.slice(0, 16)})` };
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

// Writes the whole CDN folder. `out` must be a folder that holds only generated files: it is emptied first.
export async function writeBundle({ out, base, fingerprint, versions, source = entryjs }) {
  await rm(out, { recursive: true, force: true });
  const vendorTarget = path.join(out, fingerprint.slice(0, 16));
  await mkdir(vendorTarget, { recursive: true });
  await cp(path.join(source, "vendor"), vendorTarget, { recursive: true, filter: (file) => path.basename(file) !== ".prepared" });
  await writeFile(path.join(vendorTarget, "version.txt"), fingerprint);
  // Everything else the app serves under /entryjs/; the bridge itself only lives under /v/.
  const patterns = ignorePatterns();
  await cp(source, path.join(out, "entryjs"), { recursive: true, filter: (file) => path.basename(file) !== ".prepared" && !(path.dirname(file) === source && BRIDGE_FILES.includes(path.basename(file))) && !vercelIgnored(repoPath(source, path.relative(source, file)), patterns) });
  await writeFile(path.join(out, MIRROR_VERSION), `${await mirrorFingerprint(source, patterns)} ${fingerprint}`);
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
  const { base, workspaceHost } = JSON.parse(await readFile(path.join(root, "scripts/entryjs-cdn.json"), "utf8"));
  const current = Object.fromEntries(BRIDGE_FILES.map((name) => [name, readFileSync(path.join(entryjs, name), "utf8")]));
  if (mode === "html") {
    const html = current["workspace.html"];
    const result = await workspaceForBuild({ html, bridge: bridgeFingerprint(current), mirror: await mirrorFingerprint(), vercelEnv: process.env.VERCEL_ENV, base, workspaceHost, fingerprint });
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
    // The mirror replaces what production reads under /entryjs/, so it must hold everything already on main and only
    // committed files: an older branch would drop merged sprites, uncommitted edits would reach no build.
    try { git(["merge-base", "--is-ancestor", "origin/main", "HEAD"]); }
    catch { throw new Error("Upload from a checkout that contains origin/main (merge or rebase it first)"); }
    if (git(["status", "--porcelain", "--", "public/entryjs"]).trim()) throw new Error("Commit or discard the changes under public/entryjs before uploading");
    const versions = bridgeVersions({ current, git });
    const count = await writeBundle({ out: bundle, base, fingerprint, versions });
    console.log(`Entry CDN bundle ready: scratch/entry-cdn (${count} files, ${versions.size} bridge versions, current ${bridgePrefix(base, bridgeFingerprint(current), fingerprint)})`);
  } else {
    throw new Error("Usage: node scripts/entryjs-cdn.mjs html|bundle");
  }
}

if (path.basename(process.argv[1] ?? "") === "entryjs-cdn.mjs") main(process.argv[2]).catch((error) => { console.error(error); process.exitCode = 1; });
