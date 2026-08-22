import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildReleaseBuildGateConfig,
  restoreFileSnapshot,
  snapshotFile
} from "./release-build-gate.mjs";

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

  assert.throws(
    () => buildReleaseBuildGateConfig({
      runId: "unit-test",
      tsconfigPath: "/Volumes/Starship/outside-tsconfig.json"
    }, {}),
    /tsconfig must stay inside the repository/
  );

  assert.throws(
    () => buildReleaseBuildGateConfig({
      runId: "unit-test",
      tsconfigPath: "scripts/tsconfig.next.json"
    }, {}),
    /root tsconfig/
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

test("release build gate refuses to restore through a replaced tsconfig pathname", async () => {
  const tempDir = path.join(repoRoot, ".tmp", "release-build-gate-path-identity-unit");
  const configPath = path.join(tempDir, "tsconfig.next.json");
  const victimPath = path.join(tempDir, "victim.json");
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(configPath, "{\"compilerOptions\":{}}\n");
  await fs.writeFile(victimPath, "owner bytes must remain unchanged\n");

  const snapshot = await snapshotFile(configPath);
  await fs.unlink(configPath);
  await fs.symlink(victimPath, configPath);

  await assert.rejects(
    () => restoreFileSnapshot(snapshot),
    /regular non-symlink|pathname identity changed/
  );
  assert.equal(await fs.readFile(victimPath, "utf8"), "owner bytes must remain unchanged\n");
  assert.equal((await fs.lstat(configPath)).isSymbolicLink(), true);

  await fs.rm(tempDir, { recursive: true, force: true });
});
