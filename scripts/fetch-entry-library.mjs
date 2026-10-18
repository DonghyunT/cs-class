import { mkdir, readFile, writeFile } from "node:fs/promises";

// One-off operator script: downloads the curated official Entry objects listed in
// scripts/entry-library-picks.json into public/entryjs/sprites/library and writes
// src/lib/classroom/entry-library.json. The app never contacts playentry.org at run time.
// Entry objects: NAVER Connect Foundation, used for education with attribution.
const ORIGIN = "https://playentry.org";
const OUT = "public/entryjs/sprites/library";
const MAX_PICTURES = 10, MAX_BYTES = 2_000_000;
const QUERY = `query GET_SPRITES($category_main: String) { sprites(category_main: $category_main) { list { id name category { main } pictures { filename imageType dimension { width height } } } } }`;

const picks = JSON.parse(await readFile("scripts/entry-library-picks.json", "utf8"));
const page = await fetch(`${ORIGIN}/ws/new`);
const cookie = page.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const csrf = (await page.text()).match(/csrfToken":"([^"]+)/)?.[1];
if (!csrf) throw Error("No CSRF token on the Entry page.");
const res = await fetch(`${ORIGIN}/graphql/GET_SPRITES`, { method: "POST", headers: { "Content-Type": "application/json", "x-client-type": "Client", "CSRF-Token": csrf, cookie }, body: JSON.stringify({ query: QUERY, variables: { category_main: null } }) });
const all = (await res.json()).data?.sprites?.list;
if (!Array.isArray(all)) throw Error("Unexpected sprite list.");
const byId = new Map(all.map((s) => [s.id, s]));

// Downloaded files are untrusted: SVGs with scripts, event handlers or external references are dropped.
const unsafeSvg = /<script|<foreignObject|\son\w+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#|data:image\/)/i;
const path = (f, kind, ext) => `/uploads/${f.slice(0, 2)}/${f.slice(2, 4)}/${kind}/${f}.${ext}`;
async function download(url, dest, type) {
  const r = await fetch(ORIGIN + url);
  const body = Buffer.from(await r.arrayBuffer());
  if (!r.ok || !String(r.headers.get("content-type")).startsWith(type) || body.length > MAX_BYTES) return false;
  if (type === "image/svg" && unsafeSvg.test(body.toString("utf8"))) return false;
  await writeFile(dest, body);
  return body.length;
}

await mkdir(`${OUT}/thumb`, { recursive: true });
const library = [];
let bytes = 0;
const dropped = [];
for (const [category, ids] of Object.entries(picks)) {
  for (const id of ids) {
    const sprite = byId.get(id);
    if (!sprite) { dropped.push(id); continue; }
    const pictures = [];
    for (const p of sprite.pictures.slice(0, MAX_PICTURES)) {
      if (!/^[a-z0-9]{32}$/.test(p.filename)) continue;
      const ext = p.imageType === "svg" ? "svg" : "png";
      const size = await download(path(p.filename, "image", ext), `${OUT}/${p.filename}.${ext}`, ext === "svg" ? "image/svg" : "image/png");
      if (!size) continue;
      bytes += size;
      pictures.push({ file: `/entryjs/sprites/library/${p.filename}.${ext}`, width: Math.round(p.dimension?.width) || 100, height: Math.round(p.dimension?.height) || 100 });
    }
    const first = sprite.pictures[0]?.filename;
    const thumbSize = pictures.length && await download(path(first, "thumb", "png"), `${OUT}/thumb/${first}.png`, "image/png");
    if (!pictures.length) { dropped.push(id); continue; }
    if (thumbSize) bytes += thumbSize;
    library.push({ id: `e${id}`, name: sprite.name.replace(/^\[(묶음|믂음)\]\s*/, "").trim().slice(0, 20), category, pictures, thumb: thumbSize ? `/entryjs/sprites/library/thumb/${first}.png` : pictures[0].file });
  }
}
await writeFile("src/lib/classroom/entry-library.json", JSON.stringify(library, null, 1) + "\n");
console.log(JSON.stringify({ sprites: library.length, pictures: library.reduce((n, s) => n + s.pictures.length, 0), megabytes: +(bytes / 1e6).toFixed(1), dropped }));
