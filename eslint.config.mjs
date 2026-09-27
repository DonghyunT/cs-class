import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**", "test-results/**", "playwright-report/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Reference material and local artifacts are not application source.
    "archive/**",
    "docs/**",
    "outputs/**",
    "scratch/**",
    "temp/**",
    "백업용/**",
  ]),
]);

export default eslintConfig;
