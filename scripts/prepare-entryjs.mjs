import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestText = (await readFile(new URL("./entryjs-assets.json", import.meta.url), "utf8")).replace(/^\uFEFF/, "");
const manifest = JSON.parse(manifestText);
// This script's copy rules shape the output too, and the fingerprint names the Entry CDN version (scripts/entryjs-cdn.mjs).
// LF only: a Windows checkout (core.autocrlf) must name the same version as Vercel's Linux build.
const fingerprint = createHash("sha256").update(`${manifestText}\0${await readFile(new URL(import.meta.url), "utf8")}`.replace(/\r\n/g, "\n")).digest("hex");
const output = path.join(root, "public/entryjs/vendor");
const marker = path.join(output, ".prepared");
if (await readFile(marker, "utf8").catch(() => "") === fingerprint) process.exit(0);

const cache = path.join(root, "scratch/entryjs");
await mkdir(cache, { recursive: true });
// This directory contains only generated assets; never delete outside it.
if (path.relative(root, output) !== path.join("public", "entryjs", "vendor")) throw new Error("Invalid EntryJS output directory");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function download(url, filename, integrity) {
  const target = path.join(cache, filename);
  let bytes = await readFile(target).catch(() => null);
  if (!bytes || `sha512-${createHash("sha512").update(bytes).digest("base64")}` !== integrity) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`EntryJS asset download failed (${response.status}): ${filename}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (`sha512-${createHash("sha512").update(bytes).digest("base64")}` !== integrity) {
      throw new Error(`EntryJS asset integrity mismatch: ${filename}`);
    }
    await writeFile(target, bytes);
  }
  return target;
}

await Promise.all(manifest.packages.map(async (asset) => {
  const basename = asset.name.split("/").at(-1);
  const filename = `${asset.name.replace(/^@/, "").replace("/", "-")}-${asset.version}.tgz`;
  const archive = await download(`https://registry.npmjs.org/${asset.name}/-/${basename}-${asset.version}.tgz`, filename, asset.integrity);
  const extracted = path.join(cache, `prepared-${asset.directory}-${asset.version}`);
  await mkdir(extracted, { recursive: true });
  const files = ["package.json", ...asset.files];
  execFileSync("tar", ["-xzf", archive, "-C", extracted, ...files.map((file) => `package/${file}`)]);
  for (const file of files) {
    const destination = path.join(output, asset.directory, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(extracted, "package", file), destination, {
      recursive: true,
      // Hardware and AI resources are outside this first practice.
      filter: (source) => !/[/\\]images[/\\](?:hardware|hw)(?:[/\\]|$)/.test(source),
    });
  }
}));
await Promise.all(manifest.downloads.map(async (asset) => {
  await cp(await download(asset.url, asset.file, asset.integrity), path.join(output, asset.file));
}));
await writeFile(marker, fingerprint);
console.log(`EntryJS ${manifest.packages[0].version} browser assets ready.`);
