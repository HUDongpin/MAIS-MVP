import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runVercelStagingBuildGate } from "./vercel-staging-build-gate.mjs";

test("staging build gate builds only a private copy and re-verifies the upload package", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mais-staging-build-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stagingDir = path.join(root, "staging");
  const dependenciesRoot = path.join(root, "dependencies");
  await fs.mkdir(path.join(stagingDir, "app"), { recursive: true });
  await fs.mkdir(path.join(dependenciesRoot, "node_modules", "next", "dist", "bin"), {
    recursive: true
  });
  await fs.writeFile(path.join(stagingDir, "app", "source.txt"), "immutable source\n");
  await fs.writeFile(
    path.join(dependenciesRoot, "node_modules", "next", "dist", "bin", "next"),
    "fixture"
  );
  const verificationSnapshots = [];
  let buildCwd = null;
  let buildEnv = null;
  const result = await runVercelStagingBuildGate({
    dependenciesRoot,
    env: {
      PATH: "/fixture/bin",
      CI: "true",
      GITHUB_TOKEN: "fixture-github-token-not-real",
      VERCEL_TOKEN: "fixture-vercel-token-not-real",
      MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
      POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
      RESEND_API_KEY: "fixture-resend-key-not-real"
    },
    staging: {
      candidateSha: "a".repeat(40),
      stagingDir
    },
    operations: {
      verifyStaging: async (staging) => {
        verificationSnapshots.push(await fs.readFile(path.join(staging.stagingDir, "app", "source.txt"), "utf8"));
      },
      runBuild: async (_command, _args, options) => {
        buildCwd = options.cwd;
        buildEnv = options.env;
        const dist = path.join(options.cwd, options.env.NEXT_DIST_DIR);
        for (const output of [
          "BUILD_ID",
          "server/app/parent/page.js",
          "server/app/api/parent/foundation/route.js",
          "server/app/api/parent/messages/route.js",
          "server/app/api/parent/notices/[recipientId]/ack/route.js",
          "server/app/api/health/teacher-notices/route.js",
          "server/app/api/cron/teacher-notice-email/route.js"
        ]) {
          await fs.mkdir(path.dirname(path.join(dist, output)), { recursive: true });
          await fs.writeFile(path.join(dist, output), "fixture");
        }
        await fs.writeFile(path.join(options.cwd, "app", "source.txt"), "build copy mutated\n");
        return { exitCode: 0 };
      }
    }
  });

  assert.deepEqual(verificationSnapshots, ["immutable source\n", "immutable source\n"]);
  assert.equal(await fs.readFile(path.join(stagingDir, "app", "source.txt"), "utf8"), "immutable source\n");
  assert.equal(result.sourceKind, "verified-private-staging-copy");
  assert.equal(result.outputChecks.every((check) => check.present), true);
  assert.equal(await fs.stat(buildCwd).catch(() => null), null, "private build copy must be removed");
  assert.equal(buildEnv.PATH, "/fixture/bin");
  assert.equal(buildEnv.CI, "true");
  assert.equal(buildEnv.MAIS_RELEASE_SHA, "a".repeat(40));
  for (const key of [
    "GITHUB_TOKEN",
    "VERCEL_TOKEN",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM",
    "POSTGRES_URL",
    "RESEND_API_KEY"
  ]) {
    assert.equal(buildEnv[key], undefined, `${key} must not reach the staging Next build`);
  }
});

test("staging build gate fails closed and removes its private copy when build fails", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mais-staging-build-fail-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stagingDir = path.join(root, "staging");
  const dependenciesRoot = path.join(root, "dependencies");
  await fs.mkdir(stagingDir, { recursive: true });
  await fs.mkdir(path.join(dependenciesRoot, "node_modules", "next", "dist", "bin"), {
    recursive: true
  });
  await fs.writeFile(
    path.join(dependenciesRoot, "node_modules", "next", "dist", "bin", "next"),
    "fixture"
  );
  let buildCwd = null;
  await assert.rejects(runVercelStagingBuildGate({
    dependenciesRoot,
    staging: { candidateSha: "b".repeat(40), stagingDir },
    operations: {
      verifyStaging: async () => {},
      runBuild: async (_command, _args, options) => {
        buildCwd = options.cwd;
        return { exitCode: 1, privateOutput: "must not surface" };
      }
    }
  }), /output redacted/i);
  assert.equal(await fs.stat(buildCwd).catch(() => null), null);
});
