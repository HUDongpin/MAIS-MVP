import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildHkVisualizationCanonicalE2eTsconfig,
  buildHkVisualizationCanonicalE2eTsconfigBytes,
  readHkVisualizationCanonicalTsconfigExcludes,
} from "./hk-visualization-e2e-tsconfig-contract.mjs";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const nextDistDir = join(workspace, ".tmp", "hk-viz-tsconfig-contract", "next-dist");

test("canonical e2e tsconfig derives excludes from the workspace baseline", () => {
  const baseline = JSON.parse(
    readFileSync(join(workspace, "tsconfig.json"), "utf8").replace(
      /\/\/.*$/gm,
      "",
    ),
  );
  const excludes = readHkVisualizationCanonicalTsconfigExcludes({ workspace });

  for (const exclude of baseline.exclude) assert.ok(excludes.includes(exclude));
  for (const exclude of [
    ".next-*",
    ".s??-*",
    "tmp",
    "temp",
    "output",
    "outputs",
    "coverage",
    "playwright-report",
    "test-results",
    "var",
    "var/**/*",
    "MAIS-MVP-*",
    "MAIS-MVP-*/**/*",
  ]) {
    assert.ok(excludes.includes(exclude));
  }
  assert.equal(new Set(excludes).size, excludes.length);
});

test("canonical e2e tsconfig bytes are deterministic pretty JSON", () => {
  const config = buildHkVisualizationCanonicalE2eTsconfig({
    workspace,
    nextDistDir,
  });
  const bytes = buildHkVisualizationCanonicalE2eTsconfigBytes({
    workspace,
    nextDistDir,
  });

  assert.deepEqual(JSON.parse(bytes.toString("utf8")), config);
  assert.deepEqual(
    bytes,
    Buffer.from(`${JSON.stringify(config, null, 2)}\n`, "utf8"),
  );
  assert.equal(
    config.include.at(-1),
    ".tmp/hk-viz-tsconfig-contract/next-dist/types/**/*.ts",
  );
});

test("canonical e2e tsconfig fails closed when baseline exclude is absent", () => {
  assert.throws(
    () =>
      readHkVisualizationCanonicalTsconfigExcludes({
        workspace,
        readConfigFile() {
          return { config: { include: ["**/*.ts"] } };
        },
      }),
    /Could not read `exclude`.*tsconfig\.json/i,
  );
});
