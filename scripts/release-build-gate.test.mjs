import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildReleaseBuildCommand,
  buildReleaseBuildGateConfig,
  parseArgs,
  restoreFileSnapshot,
  snapshotFile
} from "./release-build-gate.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("release build gate defaults to an isolated generated Next dist directory", () => {
  const config = buildReleaseBuildGateConfig({ runId: "unit-test" }, {});

  assert.equal(config.distDir, ".tmp/release-build-gate-next-unit-test");
  assert.equal(config.absoluteDistDir, path.join(repoRoot, ".tmp", "release-build-gate-next-unit-test"));
  assert.equal(config.cleanup, true);
  assert.equal(config.bundler, "turbopack");
  assert.equal(config.tsconfigPath, "tsconfig.next.json");
  assert.deepEqual(buildReleaseBuildCommand(config).args, ["scripts/next-clean-build.mjs"]);
});

test("release build gate selects Webpack only when explicitly requested", () => {
  const config = buildReleaseBuildGateConfig({ bundler: "webpack", runId: "webpack-unit" }, {});

  assert.equal(config.bundler, "webpack");
  assert.deepEqual(buildReleaseBuildCommand(config).args, [
    "scripts/next-clean-build.mjs",
    "--webpack"
  ]);
  assert.throws(
    () => buildReleaseBuildGateConfig({ bundler: "rspack", runId: "invalid-unit" }, {}),
    /Unknown release build bundler/
  );
});

test("release build gate lets the environment select Webpack when the CLI omits a bundler", () => {
  const cliOptions = parseArgs(["--json", "--run-id", "env-webpack-unit"]);
  const config = buildReleaseBuildGateConfig(cliOptions, {
    MAIS_RELEASE_BUILD_GATE_BUNDLER: "webpack"
  });

  assert.equal(cliOptions.bundler, undefined);
  assert.equal(config.bundler, "webpack");
  assert.deepEqual(buildReleaseBuildCommand(config).args, [
    "scripts/next-clean-build.mjs",
    "--webpack"
  ]);
});

test("release build gate allows an explicit generated .tmp next dist directory", () => {
  const config = buildReleaseBuildGateConfig({
    distDir: ".tmp/custom-release-next-build",
    runId: "unit-test"
  }, {});

  assert.equal(config.distDir, ".tmp/custom-release-next-build");
  assert.equal(config.absoluteDistDir, path.join(repoRoot, ".tmp", "custom-release-next-build"));
});

test("release build gate refuses shared .next and non-generated clean targets", () => {
  assert.throws(
    () => buildReleaseBuildGateConfig({ distDir: ".next", runId: "unit-test" }, {}),
    /must stay under \.tmp/
  );

  assert.throws(
    () => buildReleaseBuildGateConfig({ distDir: ".tmp/release-build", runId: "unit-test" }, {}),
    /generated \.tmp\/\*-next\*/
  );
});

test("release build gate restores the configured tsconfig after Next mutates it", async () => {
  const tempDir = path.join(repoRoot, ".tmp", "release-build-gate-unit");
  const configPath = path.join(tempDir, "tsconfig.next.json");
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify({ include: ["next-env.d.ts"] }, null, 2));

  const snapshot = await snapshotFile(configPath);
  await fs.writeFile(
    configPath,
    JSON.stringify({ include: ["next-env.d.ts", ".tmp/release-build-gate-next-unit/types/**/*.ts"] }, null, 2)
  );

  await restoreFileSnapshot(snapshot);

  assert.equal(
    await fs.readFile(configPath, "utf8"),
    JSON.stringify({ include: ["next-env.d.ts"] }, null, 2)
  );

  await fs.rm(tempDir, { recursive: true, force: true });
});

test("release build gate restores an originally absent generated file to absence", async () => {
  const tempDir = path.join(repoRoot, ".tmp", "release-build-gate-absent-unit");
  const generatedPath = path.join(tempDir, "next-env.d.ts");
  await fs.mkdir(tempDir, { recursive: true });

  const snapshot = await snapshotFile(generatedPath);
  await fs.writeFile(generatedPath, "generated\n");
  await restoreFileSnapshot(snapshot);

  await assert.rejects(fs.stat(generatedPath), { code: "ENOENT" });
  await fs.rm(tempDir, { recursive: true, force: true });
});
