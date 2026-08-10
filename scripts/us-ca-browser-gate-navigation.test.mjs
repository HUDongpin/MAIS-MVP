import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (name) => readFileSync(path.join(ROOT, "scripts", name), "utf8");

for (const gate of [
  "audit-us-ca-lesson-label-motion.mjs",
  "audit-us-ca-lesson-figure-bounds.mjs",
]) {
  test(`${gate} waits for the document and then the real lesson figure`, () => {
    const text = source(gate);
    assert.match(text, /waitUntil:\s*"domcontentloaded"/);
    assert.doesNotMatch(text, /waitUntil:\s*"networkidle"/);
    assert.match(text, /waitForSelector\('svg\[role="img"\], svg\[role="group"\]'/);
  });
}

test("figure-bounds uses the proven runtime interaction timeout", () => {
  const runtime = source("audit-us-ca-lesson-page-runtime.mjs");
  const bounds = source("audit-us-ca-lesson-figure-bounds.mjs");
  assert.match(runtime, /button\.click\(\{ timeout: 4000 \}\)/);
  assert.match(bounds, /button\.click\(\{ timeout: 4000 \}\)/);
});

test("figure-bounds lets the hydrated lesson layout settle before endpoint clicks", () => {
  const bounds = source("audit-us-ca-lesson-figure-bounds.mjs");
  const settle = bounds.indexOf("await page.waitForTimeout(3000);");
  const endpointSweep = bounds.indexOf('for (const direction of ["max", "min"])');
  assert.ok(settle >= 0, "missing the proven 3-second post-hydration settling interval");
  assert.ok(settle < endpointSweep, "the settling interval must precede endpoint traversal");
});

test("figure-bounds suppresses presentation motion while measuring endpoint geometry", () => {
  const bounds = source("audit-us-ca-lesson-figure-bounds.mjs");
  assert.match(bounds, /reducedMotion:\s*"reduce"/);
});

test("figure-bounds requires the complete assigned CCSS lesson sequence before traversal", () => {
  const bounds = source("audit-us-ca-lesson-figure-bounds.mjs");
  assert.match(bounds, /ccssLessonSequenceForTopic/);
  assert.match(bounds, /\[data-ccss-lesson\]/);
  assert.match(bounds, /mounted\.length === expected\.length/);
  assert.match(bounds, /mounted\.every\(\(value, index\) => value === expected\[index\]\)/);
});
