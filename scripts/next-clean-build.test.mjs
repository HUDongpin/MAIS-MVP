import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as nextCleanBuildModule from "./next-clean-build.mjs";
import { withGeneratedCleanupLock } from "./cleanup-generated-artifacts.mjs";

const {
  assertSharedNextBuildIsIsolated,
  buildCleanBuildConfig,
  cleanNextBuildDirectory,
  findActiveNextProcesses,
  parseActiveNextProcesses,
  writeBuildAttestation
} = nextCleanBuildModule;

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("next clean build detects active Next processes in the same repository", () => {
  const output = [
    `123 1 node ${repoRoot}/node_modules/.bin/next dev --port 3008`,
    `124 1 node ${repoRoot}/node_modules/next/dist/bin/next build`,
    "125 1 node /Users/example/other/node_modules/.bin/next dev --port 3010",
    `126 1 node ${repoRoot}/scripts/next-clean-build.mjs`
  ].join("\n");

  const processes = parseActiveNextProcesses(output, { currentPid: 999, repoRoot });

  assert.equal(processes.length, 2);
  assert.deepEqual(processes.map((processInfo) => processInfo.pid), [123, 124]);
});

test("next clean build detects relative and retitled Next processes from PID cwd evidence", () => {
  const otherRoot = "/Users/example/other";
  const output = [
    "201 1 node node_modules/next/dist/bin/next dev",
    "202 201 next-server (v15.5.15)",
    "203 1 node node_modules/.bin/next start",
    "204 203 next-server (v15.5.15)"
  ].join("\n");
  const cwdByPid = new Map([
    [201, repoRoot],
    [202, repoRoot],
    [203, otherRoot],
    [204, otherRoot]
  ]);

  const processes = parseActiveNextProcesses(output, {
    currentPid: 999,
    repoRoot,
    cwdByPid
  });

  assert.deepEqual(processes.map((processInfo) => processInfo.pid), [201, 202]);
});

test("next clean build fails closed when a relative Next process cannot be scoped", async () => {
  await assert.rejects(
    findActiveNextProcesses({
      currentPid: 999,
      repoRoot,
      processOutput: "201 1 node node_modules/next/dist/bin/next dev",
      resolveProcessCwd: async () => ({
        state: "unavailable",
        detail: "cwd probe unavailable"
      })
    }),
    /Could not determine the working directory.*pid 201/
  );
});

test("next clean build scopes relative and retitled processes through live cwd evidence", async () => {
  const processOutput = [
    "201 1 node node_modules/next/dist/bin/next dev",
    "202 201 next-server (v15.5.15)"
  ].join("\n");

  const processes = await findActiveNextProcesses({
    currentPid: 999,
    repoRoot,
    processOutput,
    resolveProcessCwd: async () => ({ state: "resolved", cwd: repoRoot })
  });

  assert.deepEqual(processes.map((processInfo) => processInfo.pid), [201, 202]);
});

test("next clean build ignores the current process while checking active Next processes", () => {
  const output = `123 1 node ${repoRoot}/node_modules/.bin/next dev --port 3008`;
  const processes = parseActiveNextProcesses(output, { currentPid: 123, repoRoot });
  assert.deepEqual(processes, []);
});

test("next clean build treats default builds as shared .next builds", () => {
  const config = buildCleanBuildConfig({});
  assert.equal(config.distDir, ".next");
  assert.equal(config.usesSharedNextDir, true);
  assert.equal(config.nextBuildDir, path.join(repoRoot, ".next"));
});

test("next clean build allows isolated generated dist directories", () => {
  const config = buildCleanBuildConfig({
    NEXT_DIST_DIR: ".tmp/dashboard-runtime-next-test"
  });

  assert.equal(config.usesSharedNextDir, false);
  assert.equal(config.nextBuildDir, path.join(repoRoot, ".tmp", "dashboard-runtime-next-test"));
});

test("next clean build records an exact, privacy-safe source and BUILD_ID attestation", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-build-attestation-"));
  const nextBuildDir = path.join(isolatedRepoRoot, ".next");
  t.after(() => fs.rm(isolatedRepoRoot, { recursive: true, force: true }));
  await fs.mkdir(nextBuildDir, { recursive: true });
  await fs.writeFile(path.join(nextBuildDir, "BUILD_ID"), "build_Abcdefghijklmnop\n");

  const sourceState = {
    candidateSha: "a".repeat(40),
    clean: true,
    statusFingerprint: "f".repeat(64)
  };
  const attestation = await writeBuildAttestation({
    config: {
      distDir: ".next",
      nextBuildDir,
      repoRoot: isolatedRepoRoot
    },
    sourceBefore: sourceState,
    sourceAfter: sourceState,
    buildStartedAt: "2026-08-24T08:00:00.000Z",
    completedAt: "2026-08-24T08:10:00.000Z"
  });

  assert.deepEqual(attestation, {
    schemaVersion: 1,
    candidateSha: sourceState.candidateSha,
    buildId: "build_Abcdefghijklmnop",
    distDir: ".next",
    sourceTreeClean: true,
    sourceTreeStable: true,
    buildStartedAt: "2026-08-24T08:00:00.000Z",
    completedAt: "2026-08-24T08:10:00.000Z"
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(nextBuildDir, "mais-build-attestation.json"), "utf8")),
    attestation
  );
  assert.doesNotMatch(JSON.stringify(attestation), /email|recipient|secret|statusFingerprint/u);
});

test("next clean build refuses non-generated clean targets", () => {
  assert.throws(
    () => buildCleanBuildConfig({ NEXT_DIST_DIR: "app" }),
    /Refusing to clean non-generated Next build directory/
  );
});

test("next clean build refuses next-dist directories outside generated roots", () => {
  for (const distDir of ["app/next-dist", "data/next-dist"]) {
    assert.throws(
      () => buildCleanBuildConfig({ NEXT_DIST_DIR: distDir }),
      /Refusing to clean non-generated Next build directory/,
      distDir
    );
  }
});

test("next clean build refuses traversal aliases and nested .next-* targets", () => {
  for (const distDir of [".tmp/../app", ".tmp/../../outside", ".next-safe/nested"]) {
    assert.throws(
      () => buildCleanBuildConfig({ NEXT_DIST_DIR: distDir }),
      /Refusing to clean (?:unsafe|non-generated) Next build directory/,
      distDir
    );
  }
});

test("next clean build refuses to remove a file at an allowed build path", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(isolatedRepoRoot, ".next"), "keep\n");

  const config = buildCleanBuildConfig({}, { repoRoot: isolatedRepoRoot });
  await assert.rejects(
    cleanNextBuildDirectory(config),
    /target is not a directory/
  );
  assert.equal(await fs.readFile(path.join(isolatedRepoRoot, ".next"), "utf8"), "keep\n");
});

test("next clean build active-process guard cannot be bypassed by the legacy allow environment variable", async () => {
  const config = buildCleanBuildConfig({});
  await assert.rejects(
    assertSharedNextBuildIsIsolated(
      config,
      { MAIS_ALLOW_SHARED_NEXT_BUILD_WITH_ACTIVE_NEXT: "1" },
      {
        findActiveNextProcesses: async () => [{
          pid: 123,
          command: `node ${repoRoot}/node_modules/.bin/next dev`
        }]
      }
    ),
    /Active Next\.js processes/
  );
});

test("next clean build checks active processes for a non-shared dist directory", async () => {
  const config = buildCleanBuildConfig({ NEXT_DIST_DIR: ".tmp/isolated-next" });
  await assert.rejects(
    assertSharedNextBuildIsIsolated(
      config,
      {},
      {
        findActiveNextProcesses: async () => [{
          pid: 123,
          command: `node ${repoRoot}/node_modules/.bin/next dev`
        }]
      }
    ),
    /Active Next\.js processes/
  );
});

test("next clean build runs guard, cleanup, and build in strict order despite the legacy skip variable", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  const exitCode = await nextCleanBuildModule.runNextCleanBuild({
    env: {
      NEXT_DIST_DIR: ".tmp/isolated-next",
      MAIS_SKIP_NEXT_CLEAN_BUILD: "1"
    },
    repoRoot: isolatedRepoRoot,
    lockTimeoutMs: 250,
    operations: {
      findActiveNextProcesses: async () => {
        events.push("guard");
        return [];
      },
      cleanNextBuildDirectory: async () => {
        events.push("cleanup");
        return false;
      },
      spawnNextBuild: async () => {
        events.push("build");
        return 0;
      }
    }
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(events, ["guard", "cleanup", "build"]);
});

test("next clean build does not spawn when the process guard fails", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  await assert.rejects(
    nextCleanBuildModule.runNextCleanBuild({
      repoRoot: isolatedRepoRoot,
      lockTimeoutMs: 250,
      operations: {
        findActiveNextProcesses: async () => {
          events.push("guard");
          throw new Error("guard failed");
        },
        cleanNextBuildDirectory: async () => {
          events.push("cleanup");
        },
        spawnNextBuild: async () => {
          events.push("build");
          return 0;
        }
      }
    }),
    /guard failed/
  );
  assert.deepEqual(events, ["guard"]);
});

test("next clean build runs the stray-types guard between the process guard and cleanup", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  const exitCode = await nextCleanBuildModule.runNextCleanBuild({
    repoRoot: isolatedRepoRoot,
    lockTimeoutMs: 250,
    operations: {
      findActiveNextProcesses: async () => {
        events.push("guard");
        return [];
      },
      checkStrayGeneratedTypes: () => {
        events.push("stray");
        return { broken: [], strayValid: [] };
      },
      cleanNextBuildDirectory: async () => {
        events.push("cleanup");
        return false;
      },
      spawnNextBuild: async () => {
        events.push("build");
        return 0;
      }
    }
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(events, ["guard", "stray", "cleanup", "build"]);
});

test("next clean build does not clean or spawn when the stray-types guard throws", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  await assert.rejects(
    nextCleanBuildModule.runNextCleanBuild({
      repoRoot: isolatedRepoRoot,
      lockTimeoutMs: 250,
      operations: {
        findActiveNextProcesses: async () => {
          events.push("guard");
          return [];
        },
        checkStrayGeneratedTypes: () => {
          events.push("stray");
          throw new Error("stray generated types reference deleted routes");
        },
        cleanNextBuildDirectory: async () => {
          events.push("cleanup");
        },
        spawnNextBuild: async () => {
          events.push("build");
          return 0;
        }
      }
    }),
    /stray generated types reference deleted routes/
  );
  assert.deepEqual(events, ["guard", "stray"]);
});

test("MAIS_SKIP_STRAY_TYPES_CHECK bypasses the stray-types guard", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  const exitCode = await nextCleanBuildModule.runNextCleanBuild({
    env: { MAIS_SKIP_STRAY_TYPES_CHECK: "1" },
    repoRoot: isolatedRepoRoot,
    lockTimeoutMs: 250,
    operations: {
      findActiveNextProcesses: async () => {
        events.push("guard");
        return [];
      },
      checkStrayGeneratedTypes: () => {
        events.push("stray");
        throw new Error("should have been skipped");
      },
      cleanNextBuildDirectory: async () => {
        events.push("cleanup");
        return false;
      },
      spawnNextBuild: async () => {
        events.push("build");
        return 0;
      }
    }
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(events, ["guard", "cleanup", "build"]);
});

test("next clean build does not spawn when safe cleanup fails", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];

  await assert.rejects(
    nextCleanBuildModule.runNextCleanBuild({
      repoRoot: isolatedRepoRoot,
      lockTimeoutMs: 250,
      operations: {
        findActiveNextProcesses: async () => {
          events.push("guard");
          return [];
        },
        cleanNextBuildDirectory: async () => {
          events.push("cleanup");
          throw new Error("cleanup failed");
        },
        spawnNextBuild: async () => {
          events.push("build");
          return 0;
        }
      }
    }),
    /cleanup failed/
  );
  assert.deepEqual(events, ["guard", "cleanup"]);
});

test("next clean build holds the canonical cleanup lock through build spawn", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  t.after(async () => {
    await fs.rm(isolatedRepoRoot, { recursive: true, force: true });
  });
  const events = [];
  let signalBuildStarted;
  const buildStarted = new Promise((resolve) => {
    signalBuildStarted = resolve;
  });
  let releaseBuild;
  const holdBuild = new Promise((resolve) => {
    releaseBuild = resolve;
  });

  const buildPromise = nextCleanBuildModule.runNextCleanBuild({
    repoRoot: isolatedRepoRoot,
    lockTimeoutMs: 250,
    operations: {
      findActiveNextProcesses: async () => {
        events.push("guard");
        return [];
      },
      cleanNextBuildDirectory: async () => {
        events.push("cleanup");
        return false;
      },
      spawnNextBuild: async () => {
        events.push("build");
        signalBuildStarted();
        await holdBuild;
        return 0;
      }
    }
  });

  await buildStarted;
  await assert.rejects(
    withGeneratedCleanupLock(
      { repoRoot: isolatedRepoRoot, timeoutMs: 25, retryDelayMs: 5 },
      async () => {}
    ),
    /cleanup lock/
  );
  releaseBuild();

  assert.equal(await buildPromise, 0);
  assert.deepEqual(events, ["guard", "cleanup", "build"]);
});

test("next clean build lock contention prevents guard, cleanup, and build", async (t) => {
  const isolatedRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-repo-"));
  const aliasParent = await fs.mkdtemp(path.join(os.tmpdir(), "mais-next-clean-alias-"));
  const repoAlias = path.join(aliasParent, "repo-link");
  await fs.symlink(isolatedRepoRoot, repoAlias, "dir");
  t.after(async () => {
    await Promise.all([
      fs.rm(isolatedRepoRoot, { recursive: true, force: true }),
      fs.rm(aliasParent, { recursive: true, force: true })
    ]);
  });
  const events = [];
  let releaseLock;
  const holdLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  let signalLockHeld;
  const lockHeld = new Promise((resolve) => {
    signalLockHeld = resolve;
  });
  const firstLock = withGeneratedCleanupLock(
    { repoRoot: isolatedRepoRoot, timeoutMs: 250, retryDelayMs: 5 },
    async () => {
      signalLockHeld();
      await holdLock;
    }
  );
  await lockHeld;

  await assert.rejects(
    nextCleanBuildModule.runNextCleanBuild({
      repoRoot: repoAlias,
      lockTimeoutMs: 25,
      operations: {
        findActiveNextProcesses: async () => {
          events.push("guard");
          return [];
        },
        cleanNextBuildDirectory: async () => {
          events.push("cleanup");
        },
        spawnNextBuild: async () => {
          events.push("build");
          return 0;
        }
      }
    }),
    /cleanup lock/
  );
  assert.deepEqual(events, []);

  releaseLock();
  await firstLock;
});
