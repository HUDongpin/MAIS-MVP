import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as releaseBuildGate from "./release-build-gate.mjs";

const {
  REQUIRED_BUILD_OUTPUTS,
  buildReleaseBuildChildEnvironment,
  buildReleaseBuildGateConfig,
  restoreFileSnapshot,
  snapshotFile,
  verifyBuildOutputs
} = releaseBuildGate;

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("release build gate validates the App Router dashboard server output", async (t) => {
  assert.ok(REQUIRED_BUILD_OUTPUTS.includes("server/app/dashboard/page.js"));
  assert.ok(!REQUIRED_BUILD_OUTPUTS.includes("server/app/dashboard.html"));

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mais-release-build-output-"));
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  for (const relativePath of REQUIRED_BUILD_OUTPUTS) {
    const absolutePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, "fixture\n");
  }

  const checks = await verifyBuildOutputs(tempDir);
  assert.equal(checks.length, REQUIRED_BUILD_OUTPUTS.length);
  assert.ok(checks.every((check) => check.present));

  await fs.rm(path.join(tempDir, "server/app/dashboard/page.js"));
  await assert.rejects(
    verifyBuildOutputs(tempDir),
    /server\/app\/dashboard\/page\.js/u
  );
});

test("release build child environment is a strict non-credential allowlist", () => {
  const childEnv = buildReleaseBuildChildEnvironment(
    {
      PATH: "/fixture/bin",
      CI: "true",
      LANG: "en_US.UTF-8",
      NODE_OPTIONS: "--max-old-space-size=4096",
      GITHUB_TOKEN: "fixture-github-token-not-real",
      GH_TOKEN: "fixture-gh-token-not-real",
      VERCEL_TOKEN: "fixture-vercel-token-not-real",
      MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
      POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
      RESEND_API_KEY: "fixture-resend-key-not-real",
      QWEN_API_KEY: "fixture-qwen-key-not-real",
      AWS_SECRET_ACCESS_KEY: "fixture-aws-secret-not-real"
    },
    {
      NEXT_DIST_DIR: ".tmp/release-build-gate-next-fixture",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_TSCONFIG_PATH: "tsconfig.next.json"
    }
  );

  assert.equal(childEnv.PATH, "/fixture/bin");
  assert.equal(childEnv.CI, "true");
  assert.equal(childEnv.NODE_OPTIONS, "--max-old-space-size=4096");
  assert.equal(childEnv.NEXT_DIST_DIR, ".tmp/release-build-gate-next-fixture");
  for (const key of [
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "VERCEL_TOKEN",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM",
    "POSTGRES_URL",
    "RESEND_API_KEY",
    "QWEN_API_KEY",
    "AWS_SECRET_ACCESS_KEY"
  ]) {
    assert.equal(childEnv[key], undefined, `${key} must not reach a Next build child`);
  }
  assert.throws(
    () => buildReleaseBuildChildEnvironment({}, { POSTGRES_URL: "not-allowed" }),
    /build environment override/u
  );
});

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
