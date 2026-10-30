import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cdnPrefix, rewriteWorkspace, workspaceForBuild } from "../scripts/entryjs-cdn.mjs";

const html = readFileSync(new URL("../public/entryjs/workspace.html", import.meta.url), "utf8");
const fingerprint = "0123456789abcdef".repeat(4);
const base = "https://entry-cdn.test";
const prefix = "https://entry-cdn.test/0123456789abcdef";
const serving = (body, ok = true) => async () => ({ ok, text: async () => body });

test("the committed CDN base is empty or a bare https origin", () => {
  const { base: committed } = JSON.parse(readFileSync(new URL("../scripts/entryjs-cdn.json", import.meta.url), "utf8"));
  if (committed) assert.doesNotThrow(() => cdnPrefix(committed, fingerprint));
});

test("cdnPrefix accepts only a bare https origin", () => {
  assert.equal(cdnPrefix(`${base}/`, fingerprint), prefix);
  for (const bad of ["http://entry-cdn.test", "https://entry-cdn.test/path", "https://entry-cdn.test/?x=1", "not a url"]) {
    assert.throws(() => cdnPrefix(bad, fingerprint), bad);
  }
});

test("rewriteWorkspace moves every vendor file and nothing else", () => {
  const rewritten = rewriteWorkspace(html, prefix);
  assert.doesNotMatch(rewritten, /"\/entryjs\/vendor\//);
  assert.match(rewritten, new RegExp(`src="${prefix}/entry/dist/entry\\.min\\.js"`));
  assert.match(rewritten, new RegExp(`href="${prefix}/entry/dist/entry\\.css"`));
  // The bridge and its stylesheet stay same-origin with the app (workspace.js checks location.origin).
  assert.match(rewritten, /src="\/entryjs\/workspace\.js"/);
  assert.match(rewritten, /href="\/entryjs\/workspace\.css"/);
  assert.equal(rewritten.match(new RegExp(prefix, "g")).length, html.match(/"\/entryjs\/vendor\//g).length);
  assert.throws(() => rewriteWorkspace("<script src=\"/elsewhere/entry.min.js\"></script>", prefix));
});

test("workspaceForBuild keeps local files outside a ready production build", async () => {
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { ok: true, text: async () => fingerprint }; };
  for (const options of [{ vercelEnv: undefined, base }, { vercelEnv: "preview", base }, { vercelEnv: "production", base: "" }]) {
    const result = await workspaceForBuild({ html, fingerprint, fetchImpl, ...options });
    assert.equal(result.html, html);
    assert.equal(result.reason, "local");
  }
  assert.deepEqual(fetched, []);
  for (const fetchImpl of [serving("other"), serving(fingerprint, false), async () => { throw new Error("offline"); }]) {
    const result = await workspaceForBuild({ html, vercelEnv: "production", base, fingerprint, fetchImpl });
    assert.equal(result.html, html);
    assert.match(result.reason, /^missing /);
  }
});

test("workspaceForBuild points a production build at the CDN once it serves this version", async () => {
  let asked;
  const result = await workspaceForBuild({ html, vercelEnv: "production", base, fingerprint, fetchImpl: async (url) => { asked = url; return { ok: true, text: async () => `${fingerprint}\n` }; } });
  assert.equal(asked, `${prefix}/version.txt`);
  assert.equal(result.html, rewriteWorkspace(html, prefix));
});
