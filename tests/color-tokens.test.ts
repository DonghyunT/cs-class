import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const css = readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const token = (name: string) => {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1];
  if (!value) throw new Error(`--${name} is missing from globals.css`);
  return value;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// WCAG 2.x contrast ratio.
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test("단계·성취·일정 색의 글자는 4.5:1, 선과 채움은 3:1 이상이다", () => {
  for (const hue of ["stage-concept", "stage-quiz", "stage-practice", "gold", "plum"]) {
    expect(contrast(token(`${hue}-ink`), "#ffffff"), `${hue}-ink on white`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(`${hue}-ink`), token(`${hue}-soft`)), `${hue}-ink on its soft surface`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(hue), "#ffffff"), `${hue} line on white`).toBeGreaterThanOrEqual(3);
  }
  expect(contrast("#ffffff", token("primary")), "button text on primary").toBeGreaterThanOrEqual(4.5);
  expect(contrast(token("warm-foreground"), token("warm-surface")), "warm hint text").toBeGreaterThanOrEqual(4.5);
});
