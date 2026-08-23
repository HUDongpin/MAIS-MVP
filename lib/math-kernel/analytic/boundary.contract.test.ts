import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const directory = resolve(process.cwd(), "lib/math-kernel/analytic");

test("browser analytic modules do not import server code, CAS, React, DOM, or renderer libraries", () => {
  for (const name of ["types.ts", "expressions.ts", "numeric.ts", "sourceTraceability.ts"]) {
    const source = readFileSync(join(directory, name), "utf8");
    assert.doesNotMatch(source, /\.server(?:["'])/);
    assert.doesNotMatch(source, /@cortex-js\/compute-engine|\breact\b|\bthree\b|@react-three|\bdocument\b|\bwindow\b/i);
  }
});

test("server boundary is explicit and no analytic module evaluates strings", () => {
  const server = readFileSync(join(directory, "analyticKernel.server.ts"), "utf8");
  assert.match(server, /^import "server-only";/);
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".ts"))) {
    const source = readFileSync(join(directory, name), "utf8");
    assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(/);
  }
});
