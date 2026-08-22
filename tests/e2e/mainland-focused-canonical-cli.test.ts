import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMainlandFocusedCanonicalCli,
  type MainlandFocusedCanonicalSpecFile,
} from "./mainland-focused-canonical-cli";

const g06 =
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts" satisfies MainlandFocusedCanonicalSpecFile;
const cli = "/Volumes/Starship/private/node_modules/@playwright/test/cli.js";

function argv(...args: string[]) {
  return [process.execPath, cli, "test", ...args];
}

test("accepts exact list and final-report invocations", () => {
  assert.deepEqual(
    assertMainlandFocusedCanonicalCli({
      argv: argv(g06, "--workers=1", "--retries", "0", "--list", "--reporter=list"),
      requiredSpec: g06,
    }),
    {
      listOnly: true,
      reporters: ["list"],
      requiredSpec: g06,
      retries: 0,
      selectedSpecs: [g06],
      workers: 1,
    },
  );
  assert.deepEqual(
    assertMainlandFocusedCanonicalCli({
      argv: argv(g06, "-j1", "--retries=0", "--reporter=list,json"),
      requiredSpec: g06,
    }).reporters,
    ["list", "json"],
  );
});

test("rejects an injected later test token and requires the final JSON receipt", () => {
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({
      argv: argv(
        g06,
        "--project=desktop-chrome",
        "--grep",
        "test",
        g06,
        "--workers=1",
        "--retries=0",
        "--reporter=list",
      ),
      requiredSpec: g06,
    }),
    /exactly one Playwright test command/u,
  );
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({
      argv: argv(g06, "--workers=1", "--retries=0"),
      requiredSpec: g06,
    }),
    /final execution requires exactly the list and json reporters/u,
  );
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({
      argv: argv(g06, "--workers=1", "--retries=0", "--reporter=json"),
      requiredSpec: g06,
    }),
    /final execution requires exactly the list and json reporters/u,
  );
});

test("uses the wrapper-sealed original CLI inside Playwright loader and worker subprocesses", () => {
  const previous = process.env.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON;
  process.env.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON = JSON.stringify([
    "test",
    g06,
    "-j1",
    "--retries=0",
    "--reporter=list,json",
  ]);
  try {
    assert.deepEqual(
      assertMainlandFocusedCanonicalCli({ requiredSpec: g06 }).selectedSpecs,
      [g06],
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON;
    } else {
      process.env.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON = previous;
    }
  }
});

test("accepts the exact four-spec combined invocation", () => {
  const specs = [
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
    "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
    "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
    g06,
  ] satisfies MainlandFocusedCanonicalSpecFile[];
  assert.deepEqual(
    assertMainlandFocusedCanonicalCli({
      argv: argv(...specs, "--workers", "1", "--retries=0", "--reporter", "json,list"),
      requiredSpec: g06,
    }).selectedSpecs,
    specs,
  );
});

test("rejects compact and spaced worker drift", () => {
  for (const args of [
    [g06, "-j2"],
    [g06, "-j=2"],
    [g06, "-j", "2"],
    [g06, "--workers=2"],
    [g06, "--workers", "50%"],
  ]) {
    assert.throws(
      () => assertMainlandFocusedCanonicalCli({ argv: argv(...args), requiredSpec: g06 }),
      /workers must equal 1/u,
    );
  }
});

test("requires one explicit workers and retries flag and rejects prefix-spoofed specs", () => {
  for (const args of [
    [g06, "--retries=0", "--reporter=list,json"],
    [g06, "--workers=1", "--reporter=list,json"],
    [g06, "--workers=1", "-j1", "--retries=0", "--reporter=list,json"],
    [g06, "--workers=1", "--retries=0", "--retries=0", "--reporter=list,json"],
  ]) {
    assert.throws(
      () => assertMainlandFocusedCanonicalCli({ argv: argv(...args), requiredSpec: g06 }),
      /exactly one explicit workers=1|exactly one explicit retries=0/u,
    );
  }
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({
      argv: argv(
        `/Volumes/Starship/attacker/${g06}`,
        "--workers=1",
        "--retries=0",
        "--reporter=list,json",
      ),
      requiredSpec: g06,
    }),
    /unexpected positional test filter/u,
  );
});

test("rejects every filtering, partial, debug, and zero-test option form", () => {
  for (const args of [
    [g06, "-gchunk-01"],
    [g06, "-g", "chunk-01"],
    [g06, "--grep=chunk-01"],
    [g06, "--grep-invert", "chunk-02"],
    [g06, "--project=desktop-chrome"],
    [g06, "--shard=1/2"],
    [g06, "--test-list=selected.txt"],
    [g06, "--test-list-invert", "skipped.txt"],
    [g06, "--pass-with-no-tests"],
    [g06, "--last-failed"],
    [g06, "--only-changed"],
    [g06, "--max-failures=1"],
    [g06, "--repeat-each=2"],
    [g06, "--debug"],
    [g06, "--ui"],
    [g06, "-x"],
  ]) {
    assert.throws(
      () => assertMainlandFocusedCanonicalCli({ argv: argv(...args), requiredSpec: g06 }),
      /forbidden or unknown option/u,
    );
  }
});

test("rejects positional line filters, unrelated specs, duplicates, and missing required spec", () => {
  for (const args of [
    [`${g06}:100`],
    ["tests/e2e/unrelated.spec.ts"],
    [g06, g06],
  ]) {
    assert.throws(
      () => assertMainlandFocusedCanonicalCli({ argv: argv(...args), requiredSpec: g06 }),
      /unexpected positional test filter|duplicated/u,
    );
  }
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({
      argv: argv("tests/e2e/china-mainland-g03-signed-real-production.spec.ts"),
      requiredSpec: g06,
    }),
    /required spec/u,
  );
});

test("rejects retries, reporter drift, missing values, and a missing test command", () => {
  for (const args of [
    [g06, "--retries=1"],
    [g06, "--reporter=html"],
    [g06, "--reporter=list,list"],
    [g06, "--workers"],
    [g06, "--retries"],
  ]) {
    assert.throws(
      () => assertMainlandFocusedCanonicalCli({ argv: argv(...args), requiredSpec: g06 }),
      /retries must equal 0|reporters must be unique|requires a value/u,
    );
  }
  assert.throws(
    () => assertMainlandFocusedCanonicalCli({ argv: [process.execPath, cli], requiredSpec: g06 }),
    /test command is missing/u,
  );
});
