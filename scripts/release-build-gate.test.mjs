import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import * as releaseBuildGate from "./release-build-gate.mjs";

const {
  buildReleaseBuildGateConfig,
  restoreFileSnapshot,
  snapshotFile
} = releaseBuildGate;

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("release build gate defaults to an isolated generated Next dist directory", () => {
  const config = buildReleaseBuildGateConfig({ runId: "unit-test" }, {});

  assert.equal(config.distDir, ".tmp/release-build-gate-next-unit-test");
  assert.equal(config.absoluteDistDir, path.join(repoRoot, ".tmp", "release-build-gate-next-unit-test"));
  assert.equal(config.cleanup, true);
  assert.equal(config.tsconfigPath, "tsconfig.next.json");
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

test("release build gate restores tsconfig and next-env after a mutating build action", async (t) => {
  const tempDir = path.join(repoRoot, ".tmp", "release-build-gate-input-restore-unit");
  const configPath = path.join(tempDir, "tsconfig.next.json");
  const nextEnvPath = path.join(tempDir, "next-env.d.ts");
  const originalConfig = JSON.stringify({ include: ["next-env.d.ts"] }, null, 2);
  const originalNextEnv = '/// <reference path="./.next/types/routes.d.ts" />\n';

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(configPath, originalConfig);
  await fs.writeFile(nextEnvPath, originalNextEnv);
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  assert.equal(typeof releaseBuildGate.withRestoredReleaseBuildInputs, "function");
  await assert.rejects(
    releaseBuildGate.withRestoredReleaseBuildInputs(
      { repoRoot: tempDir, tsconfigPath: "tsconfig.next.json" },
      async () => {
        await fs.writeFile(configPath, JSON.stringify({ include: ["generated/types/**/*.ts"] }, null, 2));
        await fs.writeFile(nextEnvPath, '/// <reference path="./generated/types/routes.d.ts" />\n');
        throw new Error("synthetic build failure");
      }
    ),
    /synthetic build failure/
  );

  assert.equal(await fs.readFile(configPath, "utf8"), originalConfig);
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), originalNextEnv);
});
