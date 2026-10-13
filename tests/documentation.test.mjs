import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { activeDocuments, anchors, checkDocuments } from "../scripts/check-docs.mjs";

test("headings include duplicate anchors and exclude fenced examples", () => {
  assert.deepEqual([...anchors('# 제목\n# 제목\n```\n# 예시\n```\n<a id="custom"></a>')], ["제목", "제목-1", "custom"]);
});

test("checks links/anchors/whitespace; archives are existence-only; external links are offline", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cs-class-docs-"));
  try {
    mkdirSync(path.join(root, "docs/archive"), { recursive: true });
    writeFileSync(path.join(root, "docs/target.md"), '# 제목\n# 제목\n<a id="custom"></a>');
    writeFileSync(path.join(root, "docs/archive/old.md"), '[broken](missing.md)');
    writeFileSync(path.join(root, "README.md"), '[ok](docs/target.md#제목-1)\n[custom](docs/target.md#custom)\n[old](docs/archive/old.md#gone)\n[external](https://example.invalid)\n');
    assert.deepEqual(checkDocuments(root, ["README.md"]), []);
    writeFileSync(path.join(root, "README.md"), '[bad](docs/target.md#gone)\n[missing](docs/no.md) \n');
    assert.equal(checkDocuments(root, ["README.md"]).length, 3);
    assert.equal(checkDocuments(root, ["absent.md"]).length, 1);
    writeFileSync(path.join(root, "AGENTS.md"), "# Instructions\n");
    writeFileSync(path.join(root, "README.md"), "# Overview\n");
    writeFileSync(path.join(root, "docs/new.md"), "[broken](missing.md)\n");
    assert.ok(activeDocuments(root).includes("docs/new.md"));
    assert.ok(!activeDocuments(root).includes("docs/archive/old.md"));
    assert.equal(checkDocuments(root).length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
