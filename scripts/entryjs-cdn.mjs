// Serves the Entry vendor files from Cloudflare instead of Vercel (docs/plans/entry-assets-cloudflare.md).
//   node scripts/entryjs-cdn.mjs html    (prebuild) on Vercel production builds, point workspace.html at the CDN
//   node scripts/entryjs-cdn.mjs bundle  write scratch/entry-cdn/ for `wrangler deploy`
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const vendor = path.join(root, "public/entryjs/vendor");
const workspace = path.join(root, "public/entryjs/workspace.html");
const bundle = path.join(root, "scratch/entry-cdn");

// The vendor files of one scripts/entryjs-assets.json version live under their own path, so versions never mix.
export function cdnPrefix(base, fingerprint) {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) throw new Error(`Entry CDN base must be a bare https origin: ${base}`);
  return `${url.origin}/${fingerprint.slice(0, 16)}`;
}

export function rewriteWorkspace(html, prefix) {
  const rewritten = html.replaceAll('"/entryjs/vendor/', `"${prefix}/`);
  if (!rewritten.includes(`"${prefix}/entry/dist/entry.min.js"`)) throw new Error("workspace.html no longer loads entry.min.js from /entryjs/vendor/");
  return rewritten;
}

// Returns the workspace HTML to ship. Anything but a production build with a configured base that the CDN
// already serves keeps the local files, so a vendor bump deployed before the CDN upload cannot break lessons.
export async function workspaceForBuild({ html, vercelEnv, base, fingerprint, fetchImpl = fetch }) {
  if (vercelEnv !== "production" || !base) return { html, reason: "local" };
  const prefix = cdnPrefix(base, fingerprint);
  const version = await fetchImpl(`${prefix}/version.txt`).then((response) => response.ok ? response.text() : "").catch(() => "");
  if (version.trim() !== fingerprint) return { html, reason: `missing ${prefix}/version.txt` };
  return { html: rewriteWorkspace(html, prefix), reason: prefix };
}

async function main(mode) {
  const fingerprint = (await readFile(path.join(vendor, ".prepared"), "utf8")).trim();
  if (mode === "html") {
    const { base } = JSON.parse(await readFile(new URL("./entryjs-cdn.json", import.meta.url), "utf8"));
    const html = await readFile(workspace, "utf8");
    const result = await workspaceForBuild({ html, vercelEnv: process.env.VERCEL_ENV, base, fingerprint });
    // Rewritten in place: only Vercel's throwaway build checkout reaches this branch.
    if (result.html !== html) await writeFile(workspace, result.html);
    console.log(`Entry vendor files: ${result.reason}`);
  } else if (mode === "bundle") {
    // This directory contains only generated files; never delete outside it.
    if (path.relative(root, bundle) !== path.join("scratch", "entry-cdn")) throw new Error("Invalid Entry CDN bundle directory");
    await rm(bundle, { recursive: true, force: true });
    const target = path.join(bundle, fingerprint.slice(0, 16));
    await mkdir(target, { recursive: true });
    await cp(vendor, target, { recursive: true, filter: (source) => path.basename(source) !== ".prepared" });
    await writeFile(path.join(target, "version.txt"), fingerprint);
    // Files under a version path never change. The sandboxed iframe has an opaque origin, so CORS must allow any.
    await writeFile(path.join(bundle, "_headers"), "/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable\n");
    console.log(`Entry CDN bundle ready: scratch/entry-cdn/${fingerprint.slice(0, 16)}`);
  } else {
    throw new Error("Usage: node scripts/entryjs-cdn.mjs html|bundle");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main(process.argv[2]);
