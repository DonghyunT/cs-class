import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BRIDGE_FILES, LOCAL_WORKSPACE, bridgeFingerprint, bridgePrefix, bridgeVersions, cdnHeaders, cdnPrefix, rewriteWorkspace, workspaceForBuild, writeBundle } from "../scripts/entryjs-cdn.mjs";

// As git and Vercel store it; a Windows checkout has CRLF.
const html = readFileSync(new URL("../public/entryjs/workspace.html", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const fingerprint = "0123456789abcdef".repeat(4);
const bridge = "fedcba9876543210".repeat(4);
const base = "https://entry-cdn.test";
const prefix = "https://entry-cdn.test/0123456789abcdef";
const bridged = "https://entry-cdn.test/v/fedcba9876543210-0123456789abcdef";
const serving = (bodies) => async (url) => url in bodies ? { ok: true, text: async () => bodies[url] } : { ok: false, text: async () => "" };

test("the committed CDN base is empty or a bare https origin", () => {
  const { base: committed } = JSON.parse(readFileSync(new URL("../scripts/entryjs-cdn.json", import.meta.url), "utf8"));
  if (committed) assert.doesNotThrow(() => cdnPrefix(committed, fingerprint));
});

test("the committed lesson iframe address is the app's own copy; only production builds change it", () => {
  assert.deepEqual(JSON.parse(readFileSync(new URL("../src/lib/classroom/entry-workspace.json", import.meta.url), "utf8")), { src: LOCAL_WORKSPACE });
});

test("cdnPrefix and bridgePrefix accept only a bare https origin", () => {
  assert.equal(cdnPrefix(`${base}/`, fingerprint), prefix);
  assert.equal(bridgePrefix(`${base}/`, bridge, fingerprint), bridged);
  for (const bad of ["http://entry-cdn.test", "https://entry-cdn.test/path", "https://entry-cdn.test/?x=1", "not a url"]) {
    assert.throws(() => cdnPrefix(bad, fingerprint), bad);
    assert.throws(() => bridgePrefix(bad, bridge, fingerprint), bad);
  }
});

test("rewriteWorkspace moves every vendor file and keeps the bridge files beside the page", () => {
  const rewritten = rewriteWorkspace(html, prefix);
  assert.doesNotMatch(rewritten, /"\/entryjs\//);
  assert.match(rewritten, new RegExp(`src="${prefix}/entry/dist/entry\\.min\\.js"`));
  assert.match(rewritten, new RegExp(`href="${prefix}/entry/dist/entry\\.css"`));
  assert.match(rewritten, /src="workspace\.js"/);
  assert.match(rewritten, /href="workspace\.css"/);
  assert.equal(rewritten.match(new RegExp(prefix, "g")).length, html.match(/"\/entryjs\/vendor\//g).length);
  assert.throws(() => rewriteWorkspace("<script src=\"/elsewhere/entry.min.js\"></script>", prefix));
  assert.throws(() => rewriteWorkspace(html.replace('src="workspace.js"', 'src="/entryjs/workspace.js"'), prefix), /relative/);
});

test("bridgeFingerprint ignores Windows line endings and follows every bridge file", () => {
  const files = { "workspace.html": "<p>\n", "workspace.js": "a\nb\n", "workspace.css": "p{}\n" };
  const key = bridgeFingerprint(files);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(bridgeFingerprint(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, text.replaceAll("\n", "\r\n")]))), key);
  for (const name of BRIDGE_FILES) assert.notEqual(bridgeFingerprint({ ...files, [name]: `${files[name]} ` }), key, name);
});

test("workspaceForBuild keeps the app's own files outside a ready production build", async () => {
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { ok: true, text: async () => fingerprint }; };
  for (const options of [{ vercelEnv: undefined, base }, { vercelEnv: "preview", base }, { vercelEnv: "production", base: "" }]) {
    assert.deepEqual(await workspaceForBuild({ html, bridge, fingerprint, fetchImpl, ...options }), { html, src: LOCAL_WORKSPACE, reason: "local" });
  }
  assert.deepEqual(fetched, []);
  for (const fetchImpl of [serving({ [`${prefix}/version.txt`]: "other" }), serving({}), async () => { throw new Error("offline"); }]) {
    const result = await workspaceForBuild({ html, bridge, vercelEnv: "production", base, fingerprint, fetchImpl });
    assert.equal(result.html, html);
    assert.equal(result.src, LOCAL_WORKSPACE);
    assert.match(result.reason, /^missing /);
  }
});

test("workspaceForBuild moves the vendor files first and the bridge only once the CDN serves this exact pair", async () => {
  const vendorOnly = await workspaceForBuild({ html, bridge, vercelEnv: "production", base, fingerprint, fetchImpl: serving({ [`${prefix}/version.txt`]: `${fingerprint}\n` }) });
  assert.equal(vendorOnly.html, rewriteWorkspace(html, prefix));
  assert.equal(vendorOnly.src, LOCAL_WORKSPACE);
  assert.match(vendorOnly.reason, /missing .*\/v\//);
  // A bridge uploaded with another vendor version is not this build's.
  const otherVendor = await workspaceForBuild({ html, bridge, vercelEnv: "production", base, fingerprint, fetchImpl: serving({ [`${prefix}/version.txt`]: fingerprint, [`${bridged}/version.txt`]: `${bridge} ${"f".repeat(64)}` }) });
  assert.equal(otherVendor.src, LOCAL_WORKSPACE);
  const ready = await workspaceForBuild({ html, bridge, vercelEnv: "production", base, fingerprint, fetchImpl: serving({ [`${prefix}/version.txt`]: fingerprint, [`${bridged}/version.txt`]: `${bridge} ${fingerprint}\n` }) });
  assert.deepEqual(ready, { html: rewriteWorkspace(html, prefix), src: `${bridged}/workspace.html`, reason: `${prefix}, ${bridged}` });
});

test("bridgeVersions keeps the checkout first, then distinct referrer-aware versions from origin/main", () => {
  const version = (n, aware = true) => ({ "workspace.html": `<p>${n}</p>`, "workspace.js": aware ? `const APP_ORIGIN = ${n};` : `old ${n}`, "workspace.css": "p{}" });
  const history = { c1: version(1), c2: version(1), c3: version(2), c4: version(3), c5: version(4, false), c6: version(5) };
  const asked = [];
  const git = (args) => {
    asked.push(args.join(" "));
    if (args[0] === "log") return "c1\nc2\nc3\nc4\nc5\nc6\n";
    const [commit, file] = args[1].split(":");
    return history[commit][path.posix.basename(file)];
  };
  const current = version(0);
  const versions = bridgeVersions({ current, git });
  assert.deepEqual([...versions.keys()], [current, version(1), version(2), version(3)].map(bridgeFingerprint));
  assert.ok(asked[0].startsWith("log --format=%H origin/main -- public/entryjs/workspace.html"));
  assert.ok(!asked.some((call) => call.startsWith("show c6:")), "stops at the first version that predates the CDN bridge");
  assert.equal(bridgeVersions({ current, git, limit: 2 }).size, 2);
  const missing = bridgeVersions({ current, git: (args) => { if (args[0] === "log") return "c1\n"; throw new Error("no such path"); } });
  assert.deepEqual([...missing.keys()], [bridgeFingerprint(current)]);
});

test("cdnHeaders never sets Cache-Control twice on one path", () => {
  const rules = [];
  for (const line of cdnHeaders(fingerprint).trimEnd().split("\n")) {
    if (!line.startsWith(" ")) rules.push({ pattern: line, headers: [] });
    else rules.at(-1).headers.push(line.trim().split(":")[0]);
  }
  assert.ok(rules.length <= 100);
  const matches = (pattern, file) => pattern.endsWith("/*") ? file.startsWith(pattern.slice(0, -1)) : file === pattern;
  for (const file of [`/0123456789abcdef/entry/dist/entry.min.js`, "/v/fedcba9876543210-0123456789abcdef/workspace.html", "/entryjs/sprites/tree-1.svg"]) {
    const applied = rules.filter((rule) => matches(rule.pattern, file)).flatMap((rule) => rule.headers);
    assert.equal(applied.filter((name) => name === "Cache-Control").length, 1, file);
    assert.equal(applied.filter((name) => name === "Access-Control-Allow-Origin").length, 1, file);
  }
});

test("writeBundle lays out the vendor, every bridge version and the app's /entryjs/ files", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "entry-cdn-"));
  try {
    const source = path.join(dir, "entryjs"), out = path.join(dir, "out");
    for (const [file, text] of [["vendor/entry/dist/entry.min.js", "entry"], ["vendor/.prepared", fingerprint], ["sprites/tree.svg", "<svg/>"], ["name-dog.svg", "<svg/>"], ["workspace.html", "stale"], ["workspace.js", "stale"], ["workspace.css", "stale"]]) {
      mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
      writeFileSync(path.join(source, file), text);
    }
    mkdirSync(out); writeFileSync(path.join(out, "leftover.txt"), "old upload");
    const current = { "workspace.html": html.replaceAll("\n", "\r\n"), "workspace.js": "const APP_ORIGIN = 1;\r\n", "workspace.css": "p{}" };
    const older = { ...current, "workspace.js": "const APP_ORIGIN = 0;\n" };
    const versions = new Map([[bridgeFingerprint(current), current], [bridgeFingerprint(older), older]]);
    const count = await writeBundle({ out, base, fingerprint, versions, source });
    const read = (file) => readFileSync(path.join(out, file), "utf8");
    assert.equal(read("0123456789abcdef/entry/dist/entry.min.js"), "entry");
    assert.equal(read("0123456789abcdef/version.txt"), fingerprint);
    assert.equal(read("entryjs/sprites/tree.svg"), "<svg/>");
    assert.equal(read("entryjs/vendor/entry/dist/entry.min.js"), "entry");
    for (const file of ["leftover.txt", "0123456789abcdef/.prepared", "entryjs/vendor/.prepared", ...BRIDGE_FILES.map((name) => `entryjs/${name}`)]) assert.ok(!existsSync(path.join(out, file)), file);
    for (const [key, files] of versions) {
      const folder = new URL(bridgePrefix(base, key, fingerprint)).pathname.slice(1);
      assert.equal(read(`${folder}/version.txt`), `${key} ${fingerprint}`);
      assert.equal(read(`${folder}/workspace.html`), rewriteWorkspace(html, prefix));
      assert.equal(read(`${folder}/workspace.js`), files["workspace.js"].replaceAll("\r\n", "\n"));
      // What the build hashes from its own checkout is what the CDN folder is named after.
      assert.equal(bridgeFingerprint({ "workspace.html": html, "workspace.js": read(`${folder}/workspace.js`), "workspace.css": read(`${folder}/workspace.css`) }), key);
    }
    assert.equal(read("_headers"), cdnHeaders(fingerprint));
    assert.equal(count, 14);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
