import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);

// The browser downloads everything these folders hold, so a right answer or after-answer feedback written there can be
// read before answering. They belong in src/lib/server/lesson-answers.ts.
test("정규 수업 문항 파일에는 정답 번호와 답한 뒤 보여 주는 문구가 없다", () => {
  const data = files("src/lib/classroom").filter((file) => /-data\.ts$/.test(file));
  expect(data.length).toBeGreaterThanOrEqual(6);
  for (const file of data) expect(readFileSync(file, "utf8"), file).not.toMatch(/\b(?:correct|retry|why)\s*:/);
});

test("화면 코드는 서버 전용 폴더를 불러오지 않는다", () => {
  for (const file of [...files("src/components"), ...files("src/lib/classroom")].filter((name) => /\.(?:tsx?|mjs)$/.test(name))) {
    expect(readFileSync(file, "utf8"), file).not.toMatch(/from\s+["'](?:@\/lib\/server|(?:\.\.\/)+(?:lib\/)?server)\//);
  }
});
