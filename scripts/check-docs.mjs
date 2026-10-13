import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function activeDocuments(root) {
  const docs = ["AGENTS.md", "README.md"];
  const visit = (directory) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (relative === "docs/archive") continue;
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile() && entry.name.endsWith(".md")) docs.push(relative);
    }
  };
  visit("docs");
  return docs;
}

export function anchors(content) {
  const result = new Set();
  const counts = new Map();
  let fenced = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = line.match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/);
    if (heading) {
      const slug = heading[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "")
        .trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
      const count = counts.get(slug) ?? 0;
      result.add(count ? `${slug}-${count}` : slug);
      counts.set(slug, count + 1);
    }
    for (const match of line.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) result.add(match[1]);
  }
  return result;
}

export function checkDocuments(root, docs = activeDocuments(root)) {
  const errors = [];
  const cache = new Map();
  for (const doc of docs) {
    const filename = path.resolve(root, doc);
    if (!existsSync(filename)) { errors.push(`${doc}: missing document`); continue; }
    let fenced = false;
    const lines = readFileSync(filename, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const at = `${doc}:${index + 1}`;
      // Two spaces are Markdown's intentional hard line break.
      if (/\t+$/.test(line) || /(?<! ) $/.test(line) || / {3,}$/.test(line)) errors.push(`${at}: trailing whitespace`);
      if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
      if (fenced) return;
      for (const match of line.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^)]*)?\)/g)) {
        const href = match[1].replace(/^<|>$/g, "");
        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
        try {
          const [file, fragment] = href.split("#");
          const target = file ? path.resolve(path.dirname(filename), decodeURIComponent(file)) : filename;
          const relative = path.relative(root, target).replaceAll("\\", "/");
          if (relative.startsWith("../") || path.isAbsolute(relative)) throw new Error("target outside repository");
          if (!existsSync(target)) throw new Error(`missing target ${href}`);
          if (fragment && /\.md$/i.test(target) && !/^(docs\/archive|archive)\//.test(relative)) {
            if (!cache.has(target)) cache.set(target, anchors(readFileSync(target, "utf8")));
            if (!cache.get(target).has(decodeURIComponent(fragment))) throw new Error(`missing anchor ${href}`);
          }
        } catch (error) { errors.push(`${at}: ${error.message}`); }
      }
    });
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkDocuments(root);
  errors.forEach((error) => console.error(error));
  console.log(`Active documents: ${activeDocuments(root).length}; errors: ${errors.length}`);
  process.exitCode = errors.length ? 1 : 0;
}
