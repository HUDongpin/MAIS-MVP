import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { scripts?: Record<string, string> };
const ciWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
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

test("CI checks the emitted learner chunks immediately after the production build", () => {
  assert.match(
    ciWorkflow,
    /- name: Build\n\s+run: npm run build\n\n\s+- name: Verify server-only math CAS is absent from learner chunks\n\s+run: node scripts\/check-math-kernel-client-bundle\.mjs/,
  );
});
