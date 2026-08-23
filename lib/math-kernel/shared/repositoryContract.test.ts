import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
) as { scripts?: Record<string, string> };
const ciWorkflow = readFileSync(
  new URL("../../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

test("package exposes the complete server-only math-kernel test suite", () => {
  assert.equal(
    packageJson.scripts?.["test:math-kernel"],
    'node --conditions=react-server --import tsx --test "lib/math-kernel/**/*.test.ts"',
  );
});

test("CI runs the math-kernel suite immediately after type-check", () => {
  assert.match(
    ciWorkflow,
    /- name: Type check\n\s+run: npm run type-check\n\n\s+- name: Run math kernel tests\n\s+run: npm run test:math-kernel/,
  );
});
