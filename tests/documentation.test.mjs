import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { activeDocuments, anchors, checkDocuments, checkHandoff, HANDOFF_MAX_BYTES } from "../scripts/check-docs.mjs";

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

test("HANDOFF stays within size and recent-item limits; plans must be linked; teaching materials are checked", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cs-class-handoff-"));
  try {
    mkdirSync(path.join(root, "docs/plans"), { recursive: true });
    mkdirSync(path.join(root, "teaching-materials/demo"), { recursive: true });
    writeFileSync(path.join(root, "teaching-materials/demo/README.md"), "# 자료\n");
    assert.ok(activeDocuments(root).includes("teaching-materials/demo/README.md"));
    const recent = (count) => Array.from({ length: count }, (_, i) => `- 항목 ${i}`).join("\r\n");
    writeFileSync(path.join(root, "docs/HANDOFF.md"), `# 인계\r\n\r\n## 최근 반영\r\n\r\n${recent(5)}\r\n\r\n## 다음\r\n- 다음 일\r\n`);
    assert.deepEqual(checkHandoff(root), []);
    writeFileSync(path.join(root, "docs/HANDOFF.md"), `## 최근 반영\n${recent(6)}\n`);
    assert.match(checkHandoff(root)[0], /6 recent items/);
    writeFileSync(path.join(root, "docs/HANDOFF.md"), `## 최근 반영\n- 하나\n${"가".repeat(HANDOFF_MAX_BYTES)}\n`);
    assert.match(checkHandoff(root)[0], /bytes exceeds/);
    writeFileSync(path.join(root, "docs/HANDOFF.md"), "## 최근 반영\n- 하나\n");
    writeFileSync(path.join(root, "docs/plans/2026-01-01-work.md"), "# 계획\n");
    assert.match(checkHandoff(root)[0], /not linked from HANDOFF/);
    writeFileSync(path.join(root, "docs/HANDOFF.md"), "## 최근 반영\n- [계획](plans/2026-01-01-work.md)\n");
    assert.deepEqual(checkHandoff(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
