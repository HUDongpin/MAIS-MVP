import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Readable } from "node:stream";
import test from "node:test";
import { once } from "node:events";
import {
  acquireSqliteAppLease,
  assertIsolatedAppPlatform,
  captureIsolatedAppRunRootIdentity,
  captureIsolatedAppTempTsconfigIdentity,
  cleanupIsolatedAppLifecycle,
  isolatedAppProcessEnvironment,
  removeCapturedIsolatedAppRunRoot,
  removeCapturedIsolatedAppTempTsconfig,
  sqliteAppLeaseDatabasePath,
  sqliteAppLeaseStatePath,
  sqliteHolderPids,
  startIsolatedApp,
  startSqliteAppLeaseGuardian,
  stopIsolatedProcessTree
} from "./isolated-app";

async function stopChild(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}

function processGroupIsRunning(processGroupId: number) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function waitForProcessGroupExit(processGroupId: number, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupIsRunning(processGroupId) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(processGroupIsRunning(processGroupId), false, `process group ${processGroupId} should exit`);
}

async function unusedLocalPort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForLeaseRecovery(dbPath: string, runId: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return acquireSqliteAppLease(dbPath, { runId });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`SQLite app lease did not recover for ${dbPath}`, { cause: lastError });
}

type RawGuardianMessage = {
  type: string;
  operation?: string;
  message?: string;
  guardianPid?: number;
  processGroupId?: number;
  processIdentity?: string;
};

function rawGuardianControl(guardianProcess: ReturnType<typeof spawn>) {
  const control = guardianProcess.stdio[3] as Readable | null;
  assert.ok(guardianProcess.stdin, "raw guardian must expose stdin");
  assert.ok(control, "raw guardian must expose fd 3 control output");
  const messages: RawGuardianMessage[] = [];
  let input = "";

  control.setEncoding("utf8");
  control.on("data", (chunk: string) => {
    input += chunk;
    while (input.includes("\n")) {
      const newline = input.indexOf("\n");
      const line = input.slice(0, newline).trim();
      input = input.slice(newline + 1);
      if (line) messages.push(JSON.parse(line) as RawGuardianMessage);
    }
  });

  return {
    messages,
    async send(command: unknown) {
      await new Promise<void>((resolve, reject) => {
        guardianProcess.stdin?.write(`${JSON.stringify(command)}\n`, (error) => error ? reject(error) : resolve());
      });
    },
    async waitFor(
      predicate: (message: RawGuardianMessage) => boolean,
      label: string,
      timeoutMs = 5_000
    ) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const message = messages.find(predicate);
        if (message) return message;
        if (guardianProcess.exitCode !== null || guardianProcess.signalCode !== null) {
          throw new Error(
            `raw guardian exited before ${label}: code=${guardianProcess.exitCode} signal=${guardianProcess.signalCode}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(`timed out waiting for raw guardian ${label}`);
    }
  };
}

function testOwnedIsolatedRunRoot(label: string) {
  const parent = path.join(process.cwd(), ".tmp", "e2e-isolated");
  mkdirSync(parent, { recursive: true });
  const suiteRoot = mkdtempSync(path.join(parent, `preflight-${label}-${process.pid}-`));
  const rootDir = path.join(
    suiteRoot,
    `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
  mkdirSync(rootDir);
  return rootDir;
}

function removeTestOwnedIsolatedRunRoot(rootDir: string) {
  rmSync(rootDir, { recursive: true, force: true });
  rmSync(path.dirname(rootDir), { recursive: true, force: true });
}

test("SQLite preflight uses procfs when lsof is unavailable or reports no holder", { timeout: 10_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-preflight-"));
  const dbPath = path.join(root, "holder.sqlite");
  const procRoot = path.join(root, "proc");
  const falseNegativeLsof = path.join(root, "false-negative-lsof");
  const child = spawn(process.execPath, [
    "-e",
    [
      "const { DatabaseSync } = require('node:sqlite');",
      "globalThis.database = new DatabaseSync(process.argv[1]);",
      "globalThis.database.exec('CREATE TABLE holder (id INTEGER PRIMARY KEY)');",
      "process.stdout.write('ready\\n');",
      "setInterval(() => {}, 1_000);"
    ].join("\n"),
    dbPath
  ]);

  try {
    await once(child.stdout, "data");
    assert.ok(child.pid);
    const fdRoot = path.join(procRoot, String(child.pid), "fd");
    mkdirSync(fdRoot, { recursive: true });
    symlinkSync(dbPath, path.join(fdRoot, "11"));
    writeFileSync(falseNegativeLsof, "#!/bin/sh\nexit 1\n", { mode: 0o755 });

    for (const lsofCommand of [path.join(root, "missing-lsof"), falseNegativeLsof]) {
      assert.deepEqual(
        sqliteHolderPids(dbPath, {
          lsofCommand,
          platform: "linux",
          procRoot
        }),
        [String(child.pid)]
      );
    }
  } finally {
    await stopChild(child);
    rmSync(root, { recursive: true, force: true });
  }
});

test("SQLite preflight fails closed when no holder inspector is available", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-preflight-"));
  const dbPath = path.join(root, "unused.sqlite");
  const falseNegativeLsof = path.join(root, "false-negative-lsof");

  try {
    writeFileSync(dbPath, "sqlite-inspection-sentinel");
    writeFileSync(falseNegativeLsof, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    for (const lsofCommand of [path.join(root, "missing-lsof"), falseNegativeLsof]) {
      assert.throws(
        () => sqliteHolderPids(dbPath, {
          lsofCommand,
          platform: "linux",
          procRoot: path.join(root, "missing-proc")
        }),
        /Preflight failed: no SQLite holder inspector is available/u
      );
    }
    assert.throws(
      () => assertIsolatedAppPlatform("win32"),
      /unsupported on Windows because its process-group and SQLite-holder teardown cannot be proven safe/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SQLite app lease blocks overlap without relying on a persistent product database fd", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-lease-"));
  const dbPath = path.join(root, "no-persistent-fd.sqlite");
  const setup = new DatabaseSync(dbPath);
  setup.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY)");
  setup.close();
  const first = acquireSqliteAppLease(dbPath, { runId: "lease-run-first" });

  try {
    assert.equal(existsSync(dbPath), true);
    assert.equal(
      sqliteHolderPids(dbPath).includes(String(process.pid)),
      false,
      "the lease owner must not keep an fd open on the existing product DB, WAL, or SHM"
    );
    assert.equal(existsSync(sqliteAppLeaseDatabasePath(dbPath)), true);
    assert.equal(first.owner.runId, "lease-run-first");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "lease-run-second" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    first.release();
  }

  const afterRelease = acquireSqliteAppLease(dbPath, { runId: "lease-run-after-release" });
  try {
    assert.equal(afterRelease.owner.runId, "lease-run-after-release");
  } finally {
    afterRelease.release();
    rmSync(root, { recursive: true, force: true });
  }
});

test("SQLite app lease canonicalizes existing-file and missing-file symlink aliases", {
  skip: process.platform === "win32"
}, () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-lease-alias-"));
  const realDir = path.join(root, "real");
  const aliasDir = path.join(root, "alias-dir");
  mkdirSync(realDir);
  symlinkSync(realDir, aliasDir, "dir");
  const existingRealPath = path.join(realDir, "existing.sqlite");
  const existingAliasPath = path.join(root, "existing-alias.sqlite");
  const futureRealPath = path.join(realDir, "future-real.sqlite");
  const futureAliasPath = path.join(root, "future-alias.sqlite");
  const hardlinkAliasPath = path.join(root, "existing-hardlink.sqlite");
  const setup = new DatabaseSync(existingRealPath);
  setup.close();
  symlinkSync(existingRealPath, existingAliasPath, "file");
  symlinkSync(futureRealPath, futureAliasPath, "file");

  try {
    for (const [realDbPath, aliasDbPath, runId] of [
      [existingRealPath, existingAliasPath, "existing-file-alias"],
      [path.join(realDir, "missing.sqlite"), path.join(aliasDir, "missing.sqlite"), "missing-file-alias"],
      [futureRealPath, futureAliasPath, "dangling-file-alias"]
    ] as const) {
      const first = acquireSqliteAppLease(realDbPath, { runId: `${runId}-first` });
      let unexpectedAliasLease: ReturnType<typeof acquireSqliteAppLease> | null = null;
      try {
        assert.equal(sqliteAppLeaseDatabasePath(aliasDbPath), first.leasePath);
        let overlapError: unknown = null;
        try {
          unexpectedAliasLease = acquireSqliteAppLease(aliasDbPath, { runId: `${runId}-second` });
        } catch (error) {
          overlapError = error;
        }
        assert.match(
          String(overlapError),
          /Preflight failed: SQLite database is already held by another isolated app lease/u
        );
      } finally {
        unexpectedAliasLease?.release();
        first.release();
      }
    }

    const procRoot = path.join(root, "proc");
    const fdRoot = path.join(procRoot, String(process.pid), "fd");
    const falseNegativeLsof = path.join(root, "false-negative-lsof");
    const canonicalWalPath = `${existingRealPath}-wal`;
    mkdirSync(fdRoot, { recursive: true });
    writeFileSync(canonicalWalPath, "sidecar-inspection-sentinel");
    symlinkSync(canonicalWalPath, path.join(fdRoot, "17"));
    writeFileSync(falseNegativeLsof, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    assert.deepEqual(
      sqliteHolderPids(existingAliasPath, {
        lsofCommand: falseNegativeLsof,
        platform: "linux",
        procRoot
      }),
      [String(process.pid)]
    );

    const physicalIdentityDbPath = path.join(realDir, "physical-identity.sqlite");
    const physicalIdentitySetup = new DatabaseSync(physicalIdentityDbPath);
    physicalIdentitySetup.close();
    const physicalIdentityLease = acquireSqliteAppLease(physicalIdentityDbPath, {
      runId: "physical-identity-owner"
    });
    physicalIdentityLease.release();
    const physicalStatePath = sqliteAppLeaseStatePath(physicalIdentityDbPath);
    const physicalState = JSON.parse(readFileSync(physicalStatePath, "utf8")) as {
      leasePhysicalIdentity: string;
      dbPhysicalIdentity: string;
    };
    const originalLeasePhysicalIdentity = physicalState.leasePhysicalIdentity;
    physicalState.leasePhysicalIdentity = "0:0";
    writeFileSync(physicalStatePath, JSON.stringify(physicalState));
    assert.throws(
      () => acquireSqliteAppLease(physicalIdentityDbPath, { runId: "lease-identity-mismatch" }),
      /lease-file physical identity changed unexpectedly/u
    );
    physicalState.leasePhysicalIdentity = originalLeasePhysicalIdentity;
    physicalState.dbPhysicalIdentity = "inode:0:0";
    writeFileSync(physicalStatePath, JSON.stringify(physicalState));
    assert.throws(
      () => acquireSqliteAppLease(physicalIdentityDbPath, { runId: "db-identity-mismatch" }),
      /product database physical identity changed unexpectedly/u
    );

    linkSync(existingRealPath, hardlinkAliasPath);
    for (const hardlinkedPath of [existingRealPath, hardlinkAliasPath]) {
      assert.throws(
        () => acquireSqliteAppLease(hardlinkedPath, { runId: "hardlink-must-fail-closed" }),
        /hard-linked SQLite database paths are unsupported because they can split isolated app leases/u
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("isolated app child receives the leased canonical DB and cannot override isolation-critical env", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-canonical-env-"));
  const realDir = path.join(root, "real");
  const aliasDir = path.join(root, "alias");
  const requestedDbPath = path.join(aliasDir, "leased.sqlite");
  const overrideDbPath = path.join(root, "must-not-win.sqlite");
  const outputPath = path.join(root, "child-env.json");
  const expectedNextDistDir = ".tmp/expected-next-dist";
  const expectedNextTsconfigPath = "tsconfig.expected-isolated.tmp.json";
  mkdirSync(realDir);
  symlinkSync(realDir, aliasDir, "dir");
  const canonicalDbPath = path.join(realpathSync.native(realDir), "leased.sqlite");
  const appEnv = isolatedAppProcessEnvironment(
    process.env,
    {
      HK_MATH_DB_PATH: overrideDbPath,
      NEXT_DIST_DIR: "../must-not-win-next",
      NEXT_TSCONFIG_PATH: "../must-not-win-tsconfig.json"
    },
    {
      authSessionSecret: "canonical-env-regression-secret",
      dbPath: canonicalDbPath,
      nextDistDir: expectedNextDistDir,
      nextTsconfigPath: expectedNextTsconfigPath
    }
  );
  const guardian = await startSqliteAppLeaseGuardian(requestedDbPath, {
    runId: "canonical-env-regression",
    env: appEnv
  });
  const port = await unusedLocalPort();
  const spawned = await guardian.spawnApp(
    process.execPath,
    [
      "-e",
      [
        "const { writeFileSync } = require('node:fs');",
        "writeFileSync(process.argv[1], JSON.stringify({",
        "  dbPath: process.env.HK_MATH_DB_PATH,",
        "  nextDistDir: process.env.NEXT_DIST_DIR,",
        "  nextTsconfigPath: process.env.NEXT_TSCONFIG_PATH",
        "}));",
        "setInterval(() => {}, 1_000);"
      ].join("\n"),
      outputPath
    ],
    port
  );

  try {
    const deadline = Date.now() + 5_000;
    while (!existsSync(outputPath) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), {
      dbPath: canonicalDbPath,
      nextDistDir: expectedNextDistDir,
      nextTsconfigPath: expectedNextTsconfigPath
    });
    assert.equal(guardian.owner.dbPath, canonicalDbPath);
    process.kill(-spawned.processGroupId, "SIGTERM");
    await waitForProcessGroupExit(spawned.processGroupId);
    await guardian.release();
  } finally {
    try {
      process.kill(-spawned.processGroupId, "SIGKILL");
    } catch {
      // The app group should already be gone on the passing path.
    }
    try {
      await waitForProcessGroupExit(spawned.processGroupId);
    } catch {
      // Preserve the primary assertion; guardian release remains fail-closed.
    }
    try {
      await guardian.release();
    } catch {
      // Preserve the primary assertion; test-owned process cleanup above is final.
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("SQLite app lease is released by the OS after an owner process crashes", { timeout: 10_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-lease-"));
  const dbPath = path.join(root, "crashed-owner.sqlite");
  const leasePath = sqliteAppLeaseDatabasePath(dbPath);
  const isolatedAppModule = path.join(process.cwd(), "tests", "e2e", "isolated-app.ts");
  const childSource = [
    `const { acquireSqliteAppLease } = await import(${JSON.stringify(isolatedAppModule)});`,
    `globalThis.lease = acquireSqliteAppLease(${JSON.stringify(dbPath)}, { runId: "crashed-owner" });`,
    "process.stdout.write('ready\\n');",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", childSource]
  );
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    await Promise.race([
      once(child.stdout, "data"),
      once(child, "exit").then(([code, signal]) => {
        throw new Error(`lease holder exited before ready: code=${code} signal=${signal}`);
      })
    ]);
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "blocked-by-crashed-owner" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    const crashedExit = once(child, "exit");
    child.kill("SIGKILL");
    await crashedExit;

    recovered = acquireSqliteAppLease(dbPath, { runId: "recovered-run" });
    assert.equal(recovered.owner.runId, "recovered-run");
    assert.equal(recovered.owner.ownerPid, process.pid);
    assert.equal(existsSync(leasePath), true, "the stale lease DB should be safely reused, not renamed or deleted");
  } finally {
    recovered?.release();
    await stopChild(child);
    rmSync(root, { recursive: true, force: true });
  }
});

test("same-nonce recovery cannot bypass an app-registering state without a durable process group", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-registering-window-"));
  const dbPath = path.join(root, "registering-window.sqlite");
  const recoveryNonce = "same-run-recovery-nonce";
  const isolatedAppModule = path.join(process.cwd(), "tests", "e2e", "isolated-app.ts");
  const wrapperSource = [
    "const { spawn } = await import('node:child_process');",
    `const { acquireSqliteAppLease } = await import(${JSON.stringify(isolatedAppModule)});`,
    `globalThis.lease = acquireSqliteAppLease(${JSON.stringify(dbPath)}, { runId: "registering-owner", recoveryNonce: ${JSON.stringify(recoveryNonce)} });`,
    "globalThis.lease.beginAppRegistration(49199);",
    "const app = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1_000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(JSON.stringify({ appPid: app.pid }) + '\\n');",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const wrapper = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", wrapperSource]);
  let appPid: number | null = null;

  try {
    const [readyChunk] = await Promise.race([
      once(wrapper.stdout, "data"),
      once(wrapper, "exit").then(([code, signal]) => {
        throw new Error(`registering wrapper exited before ready: code=${code} signal=${signal}`);
      })
    ]);
    appPid = (JSON.parse(String(readyChunk).trim()) as { appPid: number }).appPid;
    assert.ok(processGroupIsRunning(appPid));

    const wrapperExit = once(wrapper, "exit");
    wrapper.kill("SIGKILL");
    await wrapperExit;

    const deadline = Date.now() + 5_000;
    let failClosedError: unknown = null;
    while (Date.now() < deadline) {
      try {
        const unexpected = acquireSqliteAppLease(dbPath, {
          runId: "same-nonce-recovery",
          recoveryNonce
        });
        unexpected.release();
      } catch (error) {
        if (/interrupted isolated app registration cannot be proven inactive/u.test(String(error))) {
          failClosedError = error;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.match(
      String(failClosedError),
      /interrupted isolated app registration cannot be proven inactive/u
    );
    assert.ok(processGroupIsRunning(appPid), "the same-nonce rejection must occur while the unregistered group is alive");
  } finally {
    if (appPid) {
      try {
        process.kill(-appPid, "SIGKILL");
      } catch {
        // The unregistered group is test-owned and may already have exited.
      }
      try {
        await waitForProcessGroupExit(appPid);
      } catch {
        // The temporary directory cleanup below is still safe after SIGKILL.
      }
    }
    await stopChild(wrapper);
    rmSync(root, { recursive: true, force: true });
  }
});

test("successful isolated app cleanup removes its exact run-owned root", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("root-cleanup");
  const dbPath = path.join(rootDir, "hk-math-db.sqlite");
  const nextDistDir = path.join(rootDir, "next-dist");
  const port = await unusedLocalPort();
  mkdirSync(nextDistDir, { recursive: true });
  writeFileSync(path.join(nextDistDir, "sentinel"), "run-owned build artifact");
  const productDb = new DatabaseSync(dbPath);
  productDb.exec("CREATE TABLE cleanup_probe (id INTEGER PRIMARY KEY)");
  productDb.close();
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, path.basename(rootDir));

  let guardian: Awaited<ReturnType<typeof startSqliteAppLeaseGuardian>> | null = null;
  let processGroupId: number | null = null;
  let reacquired: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    guardian = await startSqliteAppLeaseGuardian(dbPath, {
      runId: "root-cleanup-owner",
      env: process.env
    });
    const spawned = await guardian.spawnApp(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000)"],
      port
    );
    processGroupId = spawned.processGroupId;
    assert.ok(existsSync(sqliteAppLeaseDatabasePath(dbPath)));
    assert.ok(existsSync(sqliteAppLeaseStatePath(dbPath)));

    const cleanupErrors = await cleanupIsolatedAppLifecycle({
      appProcess: spawned.appProcess,
      processGroupId,
      sqliteLease: guardian,
      dbPath,
      port,
      tempTsconfigPath: null,
      logs: [],
      rootDir,
      runRootIdentity
    } as Parameters<typeof cleanupIsolatedAppLifecycle>[0]);

    assert.deepEqual(cleanupErrors, []);
    assert.equal(
      existsSync(rootDir),
      false,
      "successful lifecycle cleanup must remove the exact run-owned root and all of its artifacts"
    );
    mkdirSync(rootDir);
    reacquired = acquireSqliteAppLease(dbPath, { runId: "after-root-cleanup" });
    assert.equal(reacquired.owner.runId, "after-root-cleanup");
  } finally {
    reacquired?.release();
    if (processGroupId && processGroupIsRunning(processGroupId)) {
      try {
        process.kill(-processGroupId, "SIGKILL");
      } catch {
        // The exact test-owned app group may already be gone.
      }
      try {
        await waitForProcessGroupExit(processGroupId);
      } catch {
        // Preserve the primary lifecycle assertion.
      }
    }
    try {
      await guardian?.release();
    } catch {
      // Preserve the primary lifecycle assertion; exact-path cleanup follows.
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("failed isolated app cleanup retains its root and lease, then a safe retry removes the root", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("root-retry");
  const dbPath = path.join(rootDir, "hk-math-db.sqlite");
  const port = await unusedLocalPort();
  const productDb = new DatabaseSync(dbPath);
  productDb.exec("CREATE TABLE retry_probe (id INTEGER PRIMARY KEY)");
  productDb.close();
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, path.basename(rootDir));

  let guardian: Awaited<ReturnType<typeof startSqliteAppLeaseGuardian>> | null = null;
  let processGroupId: number | null = null;
  let holder: DatabaseSync | null = null;
  let reacquired: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    guardian = await startSqliteAppLeaseGuardian(dbPath, {
      runId: "root-retry-owner",
      env: process.env
    });
    const spawned = await guardian.spawnApp(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000)"],
      port
    );
    processGroupId = spawned.processGroupId;
    holder = new DatabaseSync(dbPath);

    const lifecycle = {
      appProcess: spawned.appProcess,
      processGroupId,
      sqliteLease: guardian,
      dbPath,
      port,
      tempTsconfigPath: null,
      logs: [],
      rootDir,
      runRootIdentity
    } as Parameters<typeof cleanupIsolatedAppLifecycle>[0];
    const firstCleanupErrors = await cleanupIsolatedAppLifecycle(lifecycle);

    assert.equal(firstCleanupErrors.length, 1, "the DB holder must fail cleanup before lease/root release");
    assert.equal(existsSync(rootDir), true, "a failed cleanup must retain its explicit run-owned evidence root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-root-cleanup-failure" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    holder.close();
    holder = null;
    const retryErrors = await cleanupIsolatedAppLifecycle(lifecycle);

    assert.deepEqual(retryErrors, []);
    assert.equal(existsSync(rootDir), false, "a successful retry must remove the exact retained run-owned root");
    mkdirSync(rootDir);
    reacquired = acquireSqliteAppLease(dbPath, { runId: "after-root-cleanup-retry" });
    assert.equal(reacquired.owner.runId, "after-root-cleanup-retry");
  } finally {
    holder?.close();
    reacquired?.release();
    if (processGroupId && processGroupIsRunning(processGroupId)) {
      try {
        process.kill(-processGroupId, "SIGKILL");
      } catch {
        // The exact test-owned app group may already be gone.
      }
      try {
        await waitForProcessGroupExit(processGroupId);
      } catch {
        // Preserve the primary retry assertion.
      }
    }
    try {
      await guardian?.release();
    } catch {
      // Preserve the primary retry assertion; exact-path cleanup follows.
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("null-app lifecycle cleanup aggregates holder and port failures before a safe root-removing retry", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("null-app-boundary");
  const dbPath = path.join(rootDir, "null-app-boundary.sqlite");
  const runId = path.basename(rootDir);
  const lease = acquireSqliteAppLease(dbPath, { runId });
  let holder: DatabaseSync | null = new DatabaseSync(dbPath);
  holder.exec("CREATE TABLE null_app_probe (id INTEGER PRIMARY KEY)");
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => resolve());
  });
  const address = listener.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  const lifecycle = {
    appProcess: null,
    processGroupId: null,
    sqliteLease: lease,
    dbPath,
    port,
    tempTsconfigPath: null,
    logs: [],
    rootDir,
    runRootIdentity: captureIsolatedAppRunRootIdentity(rootDir, runId)
  } as Parameters<typeof cleanupIsolatedAppLifecycle>[0];

  try {
    const firstCleanupErrors = await cleanupIsolatedAppLifecycle(lifecycle);
    assert.equal(firstCleanupErrors.length, 2, "DB holder and live port errors must both be aggregated");
    assert.match(String(firstCleanupErrors[0]), /SQLite database is already held/u);
    assert.match(String(firstCleanupErrors[1]), /local server is already listening/u);
    assert.equal(existsSync(rootDir), true, "null-app boundary failure must retain the exact evidence root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-null-app-boundary-failure" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    holder.close();
    holder = null;
    await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    const retryErrors = await cleanupIsolatedAppLifecycle(lifecycle);
    assert.deepEqual(retryErrors, []);
    assert.equal(existsSync(rootDir), false, "safe null-app retry must remove the exact run-owned root");
  } finally {
    holder?.close();
    if (listener.listening) {
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
    try {
      lease.release();
    } catch {
      // Preserve the primary boundary assertion.
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("lifecycle cleanup without its original run-root identity retains the lease and root", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("missing-root-identity");
  const dbPath = path.join(rootDir, "missing-root-identity.sqlite");
  const runId = path.basename(rootDir);
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const lease = acquireSqliteAppLease(dbPath, { runId });
  const port = await unusedLocalPort();

  try {
    const missingIdentityErrors = await cleanupIsolatedAppLifecycle({
      appProcess: null,
      processGroupId: null,
      sqliteLease: lease,
      dbPath,
      port,
      tempTsconfigPath: null,
      logs: [],
      rootDir
    });
    assert.equal(missingIdentityErrors.length, 1);
    assert.match(String(missingIdentityErrors[0]), /without its original run-root identity/u);
    assert.equal(existsSync(rootDir), true, "missing identity must retain the exact root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-without-root-identity" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    const retryErrors = await cleanupIsolatedAppLifecycle({
      appProcess: null,
      processGroupId: null,
      sqliteLease: lease,
      dbPath,
      port,
      tempTsconfigPath: null,
      logs: [],
      rootDir,
      runRootIdentity
    });
    assert.deepEqual(retryErrors, []);
    assert.equal(existsSync(rootDir), false, "supplying the original identity must allow a safe retry");
  } finally {
    try {
      lease.release();
    } catch {
      // Preserve the primary missing-identity assertion.
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("lifecycle retry accepts an already removed registered temp artifact after lease release fails", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("temp-release-retry");
  const dbPath = path.join(rootDir, "temp-release-retry.sqlite");
  const runId = path.basename(rootDir);
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runId}.tmp.json`);
  writeFileSync(tempTsconfigPath, "{}\n", { flag: "wx", mode: 0o600 });
  const tempTsconfigIdentity = captureIsolatedAppTempTsconfigIdentity(tempTsconfigPath, runId);
  const innerLease = acquireSqliteAppLease(dbPath, { runId });
  const port = await unusedLocalPort();
  let releaseAttempts = 0;
  const retryingGuardianLease = {
    owner: innerLease.owner,
    removesRunArtifactsOnRelease: true,
    release() {
      releaseAttempts += 1;
      if (releaseAttempts === 1) {
        removeCapturedIsolatedAppTempTsconfig(tempTsconfigIdentity);
        throw new Error("injected guardian release failure after temp cleanup");
      }
      innerLease.release();
      removeCapturedIsolatedAppRunRoot(runRootIdentity);
    }
  };
  const lifecycle = {
    appProcess: null,
    processGroupId: null,
    sqliteLease: retryingGuardianLease,
    dbPath,
    port,
    tempTsconfigPath,
    tempTsconfigIdentity,
    logs: [],
    rootDir,
    runRootIdentity
  } as Parameters<typeof cleanupIsolatedAppLifecycle>[0];

  try {
    const firstErrors = await cleanupIsolatedAppLifecycle(lifecycle);
    assert.equal(firstErrors.length, 1);
    assert.match(String(firstErrors[0]), /injected guardian release failure/u);
    assert.equal(existsSync(tempTsconfigPath), false, "the original registered temp may already be safely removed");
    assert.equal(existsSync(rootDir), true, "failed lease release must retain the run root for retry");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-before-temp-release-retry" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    const retryErrors = await cleanupIsolatedAppLifecycle(lifecycle);
    assert.deepEqual(retryErrors, []);
    assert.equal(releaseAttempts, 2, "missing registered temp must not prevent a second release attempt");
    assert.equal(existsSync(rootDir), false, "the successful retry must remove the exact run-owned root");
  } finally {
    try {
      innerLease.release();
    } catch {
      // Preserve the primary retry assertion.
    }
    rmSync(tempTsconfigPath, { force: true });
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("guardian worker EOF before app spawn releases its lease and removes the exact run-owned root", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-prespawn-eof");
  const dbPath = path.join(rootDir, "prespawn-eof.sqlite");
  const runId = path.basename(rootDir);
  const productDb = new DatabaseSync(dbPath);
  productDb.exec("CREATE TABLE prespawn_probe (id INTEGER PRIMARY KEY)");
  productDb.close();
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const guardian = await startSqliteAppLeaseGuardian(dbPath, {
    runId,
    env: process.env,
    rootDir,
    runRootIdentity
  });
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    guardian.detachForOrphanCleanup();
    const rootRemovalDeadline = Date.now() + 5_000;
    while (existsSync(rootDir) && Date.now() < rootRemovalDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(existsSync(rootDir), false, "pre-spawn EOF must not strand its lease or run-owned root");
    mkdirSync(rootDir);
    recovered = acquireSqliteAppLease(dbPath, { runId: "after-prespawn-eof" });
    assert.equal(recovered.owner.runId, "after-prespawn-eof");
  } finally {
    recovered?.release();
    if (processGroupIsRunning(guardian.guardianPid)) {
      try {
        process.kill(-guardian.guardianPid, "SIGKILL");
      } catch {
        // The guardian should already be gone on the passing path.
      }
      try {
        await waitForProcessGroupExit(guardian.guardianPid);
      } catch {
        // Preserve the primary pre-spawn EOF assertion.
      }
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("guardian release followed immediately by worker EOF removes the exact run-owned root before exit", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-release-eof");
  const dbPath = path.join(rootDir, "release-eof.sqlite");
  const runId = path.basename(rootDir);
  const recoveryNonce = `release-eof-${process.pid}-${Date.now()}`;
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runId}.tmp.json`);
  writeFileSync(tempTsconfigPath, "{}\n", { flag: "wx", mode: 0o600 });
  const tempTsconfigIdentity = captureIsolatedAppTempTsconfigIdentity(tempTsconfigPath, runId);
  const guardianPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      dbPath,
      runId,
      recoveryNonce,
      rootDir,
      rootIdentity.filesystemIdentity,
      tempTsconfigPath,
      tempTsconfigIdentity.filesystemIdentity
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = rawGuardianControl(guardianProcess);
  let guardianPid: number | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const ready = await control.waitFor((message) => message.type === "ready", "ready");
    guardianPid = ready.guardianPid ?? guardianProcess.pid ?? null;
    removeCapturedIsolatedAppTempTsconfig(tempTsconfigIdentity);
    await control.send({ type: "release" });
    guardianProcess.stdin?.end();
    await control.waitFor((message) => message.type === "released", "release completion");
    const rootRemovalDeadline = Date.now() + 2_000;
    while (existsSync(rootDir) && Date.now() < rootRemovalDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(existsSync(rootDir), false, "release completion must include exact root removal before exit");
    mkdirSync(rootDir);
    recovered = acquireSqliteAppLease(dbPath, { runId: "after-release-eof" });
    assert.equal(recovered.owner.runId, "after-release-eof");
  } finally {
    recovered?.release();
    if (guardianPid && processGroupIsRunning(guardianPid)) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // The guardian should already be gone on the passing path.
      }
      try {
        await waitForProcessGroupExit(guardianPid);
      } catch {
        // Preserve the primary release/EOF assertion.
      }
    }
    rmSync(tempTsconfigPath, { force: true });
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("worker-side recovery after guardian crash removes its exact registered artifacts", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-crash-artifacts");
  const dbPath = path.join(rootDir, "guardian-crash-artifacts.sqlite");
  const runId = path.basename(rootDir);
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runId}.tmp.json`);
  writeFileSync(tempTsconfigPath, "{}\n", { flag: "wx", mode: 0o600 });
  const tempTsconfigIdentity = captureIsolatedAppTempTsconfigIdentity(tempTsconfigPath, runId);
  const guardian = await startSqliteAppLeaseGuardian(dbPath, {
    runId,
    env: process.env,
    rootDir,
    runRootIdentity: rootIdentity,
    tempTsconfigIdentity
  });
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    process.kill(-guardian.guardianPid, "SIGKILL");
    await waitForProcessGroupExit(guardian.guardianPid);
    await new Promise((resolve) => setTimeout(resolve, 50));

    await guardian.release();

    assert.equal(existsSync(tempTsconfigPath), false, "guardian-crash recovery must remove the registered temp tsconfig");
    assert.equal(existsSync(rootDir), false, "guardian-crash recovery must remove the exact registered run root");
    mkdirSync(rootDir);
    recovered = acquireSqliteAppLease(dbPath, { runId: "after-guardian-crash-artifact-recovery" });
    assert.equal(recovered.owner.runId, "after-guardian-crash-artifact-recovery");
  } finally {
    recovered?.release();
    try {
      await guardian.release();
    } catch {
      // Preserve the primary crash-recovery assertion.
    }
    rmSync(tempTsconfigPath, { force: true });
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("guardian refuses orphan cleanup when its temp tsconfig is replaced by a symlink", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-temp-replaced");
  const markerRoot = testOwnedIsolatedRunRoot("guardian-temp-target");
  const dbPath = path.join(rootDir, "temp-replaced.sqlite");
  const runId = path.basename(rootDir);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runId}.tmp.json`);
  const externalTarget = path.join(markerRoot, "must-not-delete");
  writeFileSync(tempTsconfigPath, "owned temp config", { flag: "wx", mode: 0o600 });
  writeFileSync(externalTarget, "external target");
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const tempIdentity = captureIsolatedAppTempTsconfigIdentity(tempTsconfigPath, runId);
  const recoveryNonce = `temp-replaced-${process.pid}-${Date.now()}`;
  const guardianPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      dbPath,
      runId,
      recoveryNonce,
      rootDir,
      rootIdentity.filesystemIdentity,
      tempTsconfigPath,
      tempIdentity.filesystemIdentity
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = rawGuardianControl(guardianProcess);
  let guardianPid: number | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const ready = await control.waitFor((message) => message.type === "ready", "ready");
    guardianPid = ready.guardianPid ?? guardianProcess.pid ?? null;
    rmSync(tempTsconfigPath);
    symlinkSync(externalTarget, tempTsconfigPath);
    guardianProcess.stdin?.end();

    const orphanError = await control.waitFor(
      (message) => message.type === "error" && message.operation === "orphan-cleanup",
      "replaced temp-tsconfig error"
    );
    assert.match(orphanError.message ?? "", /temp-tsconfig|symlink/u);
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(
      control.messages.filter(
        (message) => message.type === "error" && message.operation === "orphan-cleanup"
      ).length,
      1
    );
    assert.ok(guardianPid && processGroupIsRunning(guardianPid), "temp replacement must keep guardian and lease alive");
    assert.equal(existsSync(rootDir), true, "temp replacement must retain the exact run root");
    assert.equal(readFileSync(externalTarget, "utf8"), "external target", "symlink target must remain untouched");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-temp-replacement" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    if (guardianPid && processGroupIsRunning(guardianPid)) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // Manual recovery is required after the fail-closed replacement boundary.
      }
      try {
        await waitForProcessGroupExit(guardianPid);
      } catch {
        // Preserve the primary temp replacement assertion.
      }
    }
    rmSync(tempTsconfigPath, { force: true });
    try {
      recovered = await waitForLeaseRecovery(dbPath, "temp-replaced-cleanup", 2_000);
    } catch {
      // Exact-path cleanup follows.
    }
    recovered?.release();
    removeTestOwnedIsolatedRunRoot(rootDir);
    removeTestOwnedIsolatedRunRoot(markerRoot);
  }
});

test("guardian pre-spawn EOF with a DB holder fails closed once and retains its lease and root", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-prespawn-holder");
  const dbPath = path.join(rootDir, "prespawn-holder.sqlite");
  const runId = path.basename(rootDir);
  const recoveryNonce = `prespawn-holder-${process.pid}-${Date.now()}`;
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const guardianPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      dbPath,
      runId,
      recoveryNonce,
      rootDir,
      rootIdentity.filesystemIdentity
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = rawGuardianControl(guardianProcess);
  let guardianPid: number | null = null;
  let holder: DatabaseSync | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const ready = await control.waitFor((message) => message.type === "ready", "ready");
    guardianPid = ready.guardianPid ?? guardianProcess.pid ?? null;
    holder = new DatabaseSync(dbPath);
    holder.exec("CREATE TABLE prespawn_holder_probe (id INTEGER PRIMARY KEY)");
    guardianProcess.stdin?.end();

    const orphanError = await control.waitFor(
      (message) => message.type === "error" && message.operation === "orphan-cleanup",
      "pre-spawn holder error"
    );
    assert.match(orphanError.message ?? "", /SQLite product DB holder/u);
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(
      control.messages.filter(
        (message) => message.type === "error" && message.operation === "orphan-cleanup"
      ).length,
      1,
      "pre-spawn holder failure must be attempted once"
    );
    assert.equal(existsSync(rootDir), true, "pre-spawn holder failure must retain its root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-prespawn-holder" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    holder.close();
    holder = null;
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.ok(guardianPid && processGroupIsRunning(guardianPid), "single-attempt fail-closed guardian must await manual recovery");
    assert.equal(existsSync(rootDir), true, "closing the holder must not silently restart orphan cleanup");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-still-block-until-manual-recovery" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    holder?.close();
    if (guardianPid && processGroupIsRunning(guardianPid)) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // This is the documented manual recovery path for a fail-closed holder boundary.
      }
      try {
        await waitForProcessGroupExit(guardianPid);
      } catch {
        // Preserve the primary holder assertion.
      }
    }
    try {
      recovered = await waitForLeaseRecovery(dbPath, "prespawn-holder-cleanup", 2_000);
    } catch {
      // Exact-path removal below is the final fallback after process cleanup.
    }
    recovered?.release();
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("guardian rejects project, namespace, suite, and non-owned run roots before acquiring a lease", async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-root-boundary");
  const dbPath = path.join(rootDir, "root-boundary.sqlite");
  const isolatedRunsRoot = path.join(process.cwd(), ".tmp", "e2e-isolated");
  const unsafeRoots = [
    process.cwd(),
    isolatedRunsRoot,
    path.dirname(rootDir),
    tmpdir()
  ];

  try {
    for (const unsafeRoot of unsafeRoots) {
      assert.throws(
        () => captureIsolatedAppRunRootIdentity(unsafeRoot, path.basename(unsafeRoot)),
        /Refusing isolated app root cleanup/u
      );
    }
    await assert.rejects(
      startSqliteAppLeaseGuardian(dbPath, {
        runId: path.basename(process.cwd()),
        env: process.env,
        rootDir: process.cwd(),
        runRootIdentity: {
          rootDir: process.cwd(),
          runId: path.basename(process.cwd()),
          filesystemIdentity: "forged",
          projectRootIdentity: "forged",
          tmpRootIdentity: "forged",
          isolatedRunsRootIdentity: "forged",
          suiteRootIdentity: "forged"
        }
      }),
      /Refusing isolated app root cleanup/u
    );
    assert.equal(existsSync(sqliteAppLeaseDatabasePath(dbPath)), false, "unsafe root rejection must precede lease acquisition");
  } finally {
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("guardian requires the caller's original run-root identity before acquiring a lease", async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-missing-root-identity");
  const dbPath = path.join(rootDir, "missing-root-identity.sqlite");
  const runId = path.basename(rootDir);
  const unexpected: {
    guardian?: Awaited<ReturnType<typeof startSqliteAppLeaseGuardian>>;
  } = {};

  try {
    await assert.rejects(
      async () => {
        unexpected.guardian = await startSqliteAppLeaseGuardian(dbPath, {
          runId,
          env: process.env,
          rootDir
        });
      },
      /requires both a run root and its original identity/u
    );
    assert.equal(
      existsSync(sqliteAppLeaseDatabasePath(dbPath)),
      false,
      "missing original identity must be rejected before lease acquisition"
    );
  } finally {
    try {
      await unexpected.guardian?.release();
    } catch {
      // Preserve the primary missing-identity assertion.
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("run-root validation rejects a symlinked .tmp ancestor in an isolated child project", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "mais-run-root-ancestor-"));
  const fixtureProject = path.join(fixtureRoot, "project");
  const externalTmp = path.join(fixtureRoot, "external-tmp");
  const runRoot = path.join(externalTmp, "e2e-isolated", "suite", "run-owned");
  const isolatedAppModule = path.join(process.cwd(), "tests", "e2e", "isolated-app.ts");
  const tsxLoader = path.join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs");
  mkdirSync(fixtureProject);
  mkdirSync(runRoot, { recursive: true });
  symlinkSync(externalTmp, path.join(fixtureProject, ".tmp"), "dir");

  try {
    const probeSource = [
      `const { captureIsolatedAppRunRootIdentity } = await import(${JSON.stringify(isolatedAppModule)});`,
      `const { join } = await import("node:path");`,
      "let accepted = false;",
      "let message = '';",
      `try { captureIsolatedAppRunRootIdentity(join(process.cwd(), ".tmp", "e2e-isolated", "suite", "run-owned"), "run-owned"); accepted = true; }`,
      "catch (error) { message = error instanceof Error ? error.message : String(error); }",
      "process.stdout.write(JSON.stringify({ accepted, message }));"
    ].join("\n");
    const result = JSON.parse(execFileSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "-e", probeSource],
      { cwd: fixtureProject, encoding: "utf8" }
    )) as { accepted: boolean; message: string };
    assert.equal(result.accepted, false, "a symlinked .tmp ancestor must never become an owned run root");
    assert.match(result.message, /symlink/u);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("startIsolatedApp rejects a symlinked .tmp ancestor before deleting or creating external run data", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "mais-start-root-ancestor-"));
  const fixtureProject = path.join(fixtureRoot, "project");
  const externalTmp = path.join(fixtureRoot, "external-tmp");
  const suiteName = "symlink-start-boundary";
  const projectName = "fixture";
  const fixedNow = 1_700_000_000_000;
  const fixedRandom = 0.123456789;
  const runSlug = [
    suiteName,
    projectName,
    "worker-0",
    String(fixedNow),
    fixedRandom.toString(36).slice(2, 8)
  ].join("-");
  const externalRunRoot = path.join(externalTmp, "e2e-isolated", suiteName, runSlug);
  const sentinelPath = path.join(externalRunRoot, "must-survive");
  const tempTsconfigPath = path.join(fixtureProject, `tsconfig.${runSlug}.tmp.json`);
  const isolatedAppModule = path.join(process.cwd(), "tests", "e2e", "isolated-app.ts");
  const tsxLoader = path.join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs");
  mkdirSync(fixtureProject);
  mkdirSync(externalRunRoot, { recursive: true });
  writeFileSync(sentinelPath, "external data must not be touched");
  mkdirSync(tempTsconfigPath);
  symlinkSync(externalTmp, path.join(fixtureProject, ".tmp"), "dir");

  try {
    const probeSource = [
      `const { startIsolatedApp, sqliteAppLeaseDatabasePath } = await import(${JSON.stringify(isolatedAppModule)});`,
      `Date.now = () => ${fixedNow};`,
      `Math.random = () => ${fixedRandom};`,
      "let message = '';",
      `try { await startIsolatedApp(${JSON.stringify(suiteName)}, { project: { name: ${JSON.stringify(projectName)} }, workerIndex: 0 }, { mode: "dev" }); }`,
      "catch (error) { message = error instanceof Error ? error.message : String(error); }",
      `const dbPath = ${JSON.stringify(path.join(fixtureProject, ".tmp", "e2e-isolated", suiteName, runSlug, "hk-math-db.sqlite"))};`,
      `const { existsSync } = await import("node:fs");`,
      `process.stdout.write(JSON.stringify({ message, sentinelExists: existsSync(${JSON.stringify(sentinelPath)}), runRootExists: existsSync(${JSON.stringify(externalRunRoot)}), leaseExists: existsSync(sqliteAppLeaseDatabasePath(dbPath)) }));`
    ].join("\n");
    const result = JSON.parse(execFileSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "-e", probeSource],
      { cwd: fixtureProject, encoding: "utf8" }
    )) as { message: string; sentinelExists: boolean; runRootExists: boolean; leaseExists: boolean };
    assert.match(result.message, /symlink/u);
    assert.equal(result.sentinelExists, true, "startup rejection must not delete external sentinel data");
    assert.equal(result.runRootExists, true, "startup rejection must not replace the pre-existing external run root");
    assert.equal(result.leaseExists, false, "startup rejection must happen before lease acquisition");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("startIsolatedApp rejects an empty sanitized suite before creating a one-level run root", async () => {
  const isolatedRunsRoot = path.join(process.cwd(), ".tmp", "e2e-isolated");
  const listUnexpectedRuns = () => readdirSync(isolatedRunsRoot)
    .filter((entry) => entry.startsWith("empty-suite-worker-0-"))
    .sort();
  const before = listUnexpectedRuns();

  await assert.rejects(
    startIsolatedApp(
      "!!!",
      { project: { name: "empty-suite" }, workerIndex: 0 } as Parameters<typeof startIsolatedApp>[1],
      { mode: "dev" }
    ),
    /without one safe suite segment/u
  );
  assert.deepEqual(listUnexpectedRuns(), before, "empty suite rejection must precede any run-root mkdir");
});

test("run-owned lease guardian automatically tears down its detached app after a worker crash", {
  timeout: 20_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-worker-crash");
  const markerRoot = testOwnedIsolatedRunRoot("guardian-worker-marker");
  const dbPath = path.join(rootDir, "worker-crash.sqlite");
  const termMarkerPath = path.join(markerRoot, "app-received-term");
  const readyMarkerPath = path.join(markerRoot, "app-ready");
  const runId = path.basename(rootDir);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runId}.tmp.json`);
  writeFileSync(tempTsconfigPath, "worker-crash temp config", { flag: "wx", mode: 0o600 });
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const tempTsconfigIdentity = captureIsolatedAppTempTsconfigIdentity(tempTsconfigPath, runId);
  const port = await unusedLocalPort();
  const isolatedAppModule = path.join(process.cwd(), "tests", "e2e", "isolated-app.ts");
  const appSource = [
    "const { writeFileSync } = require('node:fs');",
    "process.on('SIGTERM', () => { writeFileSync(process.argv[1], 'SIGTERM'); process.exit(0); });",
    "writeFileSync(process.argv[2], 'ready');",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const wrapperSource = [
    `const { startSqliteAppLeaseGuardian } = await import(${JSON.stringify(isolatedAppModule)});`,
    `const { existsSync } = await import("node:fs");`,
    `const guardian = await startSqliteAppLeaseGuardian(${JSON.stringify(dbPath)}, { runId: ${JSON.stringify(runId)}, env: process.env, rootDir: ${JSON.stringify(rootDir)}, runRootIdentity: ${JSON.stringify(runRootIdentity)}, tempTsconfigPath: ${JSON.stringify(tempTsconfigPath)}, tempTsconfigIdentity: ${JSON.stringify(tempTsconfigIdentity)} });`,
    `const spawned = await guardian.spawnApp(process.execPath, ${JSON.stringify(["-e", appSource, termMarkerPath, readyMarkerPath])}, ${port});`,
    `while (!existsSync(${JSON.stringify(readyMarkerPath)})) await new Promise((resolve) => setTimeout(resolve, 10));`,
    "process.stdout.write(JSON.stringify({ guardianPid: guardian.guardianPid, appPid: spawned.processGroupId }) + '\\n');",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const wrapper = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", wrapperSource]);
  let guardianPid: number | null = null;
  let appPid: number | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const [readyChunk] = await Promise.race([
      once(wrapper.stdout, "data"),
      once(wrapper, "exit").then(([code, signal]) => {
        throw new Error(`worker wrapper exited before ready: code=${code} signal=${signal}`);
      })
    ]);
    const ready = JSON.parse(String(readyChunk).trim()) as { guardianPid: number; appPid: number };
    guardianPid = ready.guardianPid;
    appPid = ready.appPid;
    assert.ok(processGroupIsRunning(appPid));

    const wrapperExit = once(wrapper, "exit");
    wrapper.kill("SIGKILL");
    await wrapperExit;
    await waitForProcessGroupExit(appPid, 7_000);
    assert.equal(existsSync(termMarkerPath), true, "guardian must automatically TERM the orphaned app group");
    const rootRemovalDeadline = Date.now() + 5_000;
    while (existsSync(rootDir) && Date.now() < rootRemovalDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(existsSync(rootDir), false, "orphan cleanup must remove the exact run-owned root before recovery");
    assert.equal(existsSync(tempTsconfigPath), false, "worker-crash cleanup must remove its exact temp tsconfig");
    mkdirSync(rootDir);
    recovered = await waitForLeaseRecovery(dbPath, "after-worker-and-app-exit");
    assert.equal(recovered.owner.runId, "after-worker-and-app-exit");
  } finally {
    recovered?.release();
    if (appPid) {
      try {
        process.kill(-appPid, "SIGKILL");
      } catch {
        // The app group should already be gone on the passing path.
      }
    }
    if (guardianPid) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // The guardian should exit after orphan cleanup releases the lease.
      }
    }
    await stopChild(wrapper);
    rmSync(tempTsconfigPath, { force: true });
    removeTestOwnedIsolatedRunRoot(rootDir);
    removeTestOwnedIsolatedRunRoot(markerRoot);
  }
});

test("guardian orphan teardown escalates to SIGKILL and cleans an app that ignores SIGTERM", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-kill-escalation");
  const markerRoot = testOwnedIsolatedRunRoot("guardian-kill-marker");
  const dbPath = path.join(rootDir, "kill-escalation.sqlite");
  const readyMarkerPath = path.join(markerRoot, "app-ready");
  const termMarkerPath = path.join(markerRoot, "app-ignored-term");
  const runId = path.basename(rootDir);
  const runRootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const port = await unusedLocalPort();
  const guardian = await startSqliteAppLeaseGuardian(dbPath, {
    runId,
    env: process.env,
    rootDir,
    runRootIdentity
  });
  const appSource = [
    "const { writeFileSync } = require('node:fs');",
    "process.on('SIGTERM', () => { writeFileSync(process.argv[1], 'ignored'); });",
    "writeFileSync(process.argv[2], 'ready');",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const spawned = await guardian.spawnApp(
    process.execPath,
    ["-e", appSource, termMarkerPath, readyMarkerPath],
    port
  );
  const appPid = spawned.processGroupId;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const readyDeadline = Date.now() + 2_000;
    while (!existsSync(readyMarkerPath) && Date.now() < readyDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(existsSync(readyMarkerPath), true, "escalation fixture app must be running before EOF");

    guardian.detachForOrphanCleanup();
    await waitForProcessGroupExit(appPid, 8_000);
    assert.equal(existsSync(termMarkerPath), true, "fixture must prove it received and ignored SIGTERM");
    const rootRemovalDeadline = Date.now() + 3_000;
    while (existsSync(rootDir) && Date.now() < rootRemovalDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(existsSync(rootDir), false, "post-SIGKILL orphan cleanup must remove the exact run root");
    mkdirSync(rootDir);
    recovered = acquireSqliteAppLease(dbPath, { runId: "after-kill-escalation" });
    assert.equal(recovered.owner.runId, "after-kill-escalation");
  } finally {
    recovered?.release();
    if (processGroupIsRunning(appPid)) {
      try {
        process.kill(-appPid, "SIGKILL");
      } catch {
        // The exact test-owned group should already be gone.
      }
      try {
        await waitForProcessGroupExit(appPid);
      } catch {
        // Preserve the primary escalation assertion.
      }
    }
    if (processGroupIsRunning(guardian.guardianPid)) {
      try {
        process.kill(-guardian.guardianPid, "SIGKILL");
      } catch {
        // The guardian should already be gone on the passing path.
      }
      try {
        await waitForProcessGroupExit(guardian.guardianPid);
      } catch {
        // Preserve the primary escalation assertion.
      }
    }
    removeTestOwnedIsolatedRunRoot(rootDir);
    removeTestOwnedIsolatedRunRoot(markerRoot);
  }
});

test("guardian refuses SIGKILL when persisted identity changes after SIGTERM", {
  timeout: 12_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-prekill-identity");
  const markerRoot = testOwnedIsolatedRunRoot("guardian-prekill-marker");
  const dbPath = path.join(rootDir, "prekill-identity.sqlite");
  const readyMarkerPath = path.join(markerRoot, "app-ready");
  const termMarkerPath = path.join(markerRoot, "app-ignored-term");
  const runId = path.basename(rootDir);
  const recoveryNonce = `prekill-identity-${process.pid}-${Date.now()}`;
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const port = await unusedLocalPort();
  const guardianPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      dbPath,
      runId,
      recoveryNonce,
      rootDir,
      rootIdentity.filesystemIdentity
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = rawGuardianControl(guardianProcess);
  let guardianPid: number | null = null;
  let appPid: number | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const ready = await control.waitFor((message) => message.type === "ready", "ready");
    guardianPid = ready.guardianPid ?? guardianProcess.pid ?? null;
    const appSource = [
      "const { writeFileSync } = require('node:fs');",
      "process.on('SIGTERM', () => { writeFileSync(process.argv[1], 'ignored'); });",
      "writeFileSync(process.argv[2], 'ready');",
      "setInterval(() => {}, 1_000);"
    ].join("\n");
    await control.send({
      type: "spawn-app",
      command: process.execPath,
      args: ["-e", appSource, termMarkerPath, readyMarkerPath],
      port
    });
    const spawned = await control.waitFor((message) => message.type === "app-spawned", "app spawn");
    appPid = spawned.processGroupId ?? null;
    assert.ok(appPid);

    const readyDeadline = Date.now() + 2_000;
    while (!existsSync(readyMarkerPath) && Date.now() < readyDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(existsSync(readyMarkerPath), true);
    guardianProcess.stdin?.end();

    const termDeadline = Date.now() + 2_000;
    while (!existsSync(termMarkerPath) && Date.now() < termDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(existsSync(termMarkerPath), true, "fixture must receive and ignore SIGTERM before identity changes");
    const statePath = sqliteAppLeaseStatePath(dbPath);
    const persisted = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
    persisted.appProcessIdentity = `mismatched-after-term-${persisted.appProcessIdentity}`;
    writeFileSync(statePath, `${JSON.stringify(persisted)}\n`, { mode: 0o600 });

    const orphanError = await control.waitFor(
      (message) => message.type === "error" && message.operation === "orphan-cleanup",
      "pre-SIGKILL identity error",
      7_000
    );
    assert.match(orphanError.message ?? "", /identity changed before SIGKILL/u);
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(
      control.messages.filter(
        (message) => message.type === "error" && message.operation === "orphan-cleanup"
      ).length,
      1,
      "pre-SIGKILL identity mismatch must fail closed once"
    );
    assert.equal(processGroupIsRunning(appPid), true, "replacement identity must not receive SIGKILL");
    assert.ok(guardianPid && processGroupIsRunning(guardianPid), "pre-SIGKILL mismatch must keep guardian and lease alive");
    assert.equal(existsSync(rootDir), true, "pre-SIGKILL identity mismatch must retain the run-owned root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-prekill-identity-change" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    if (appPid && processGroupIsRunning(appPid)) {
      try {
        process.kill(-appPid, "SIGKILL");
      } catch {
        // The exact test-owned app group may already be gone.
      }
      try {
        await waitForProcessGroupExit(appPid);
      } catch {
        // Preserve the primary pre-SIGKILL identity assertion.
      }
    }
    if (guardianPid && processGroupIsRunning(guardianPid)) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // The exact test-owned guardian may already be gone.
      }
      try {
        await waitForProcessGroupExit(guardianPid);
      } catch {
        // Preserve the primary pre-SIGKILL identity assertion.
      }
    }
    try {
      recovered = await waitForLeaseRecovery(dbPath, "prekill-identity-cleanup", 2_000);
    } catch {
      // Exact-path removal below is the final fallback after process cleanup.
    }
    recovered?.release();
    removeTestOwnedIsolatedRunRoot(rootDir);
    removeTestOwnedIsolatedRunRoot(markerRoot);
  }
});

test("guardian worker-EOF teardown refuses a mismatched persisted app identity without TERM or KILL", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const rootDir = testOwnedIsolatedRunRoot("guardian-identity-mismatch");
  const dbPath = path.join(rootDir, "identity-mismatch.sqlite");
  const termMarkerPath = path.join(rootDir, "replacement-received-term");
  const port = await unusedLocalPort();
  const recoveryNonce = `identity-mismatch-${process.pid}-${Date.now()}`;
  const runId = path.basename(rootDir);
  const rootIdentity = captureIsolatedAppRunRootIdentity(rootDir, runId);
  const guardianPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      dbPath,
      runId,
      recoveryNonce,
      rootDir,
      rootIdentity.filesystemIdentity
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = rawGuardianControl(guardianProcess);
  let guardianPid: number | null = null;
  let appPid: number | null = null;
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    const ready = await control.waitFor((message) => message.type === "ready", "ready");
    guardianPid = ready.guardianPid ?? guardianProcess.pid ?? null;
    const appSource = [
      "const { writeFileSync } = require('node:fs');",
      "process.on('SIGTERM', () => { writeFileSync(process.argv[1], 'SIGTERM'); process.exit(0); });",
      "setInterval(() => {}, 1_000);"
    ].join("\n");
    await control.send({
      type: "spawn-app",
      command: process.execPath,
      args: ["-e", appSource, termMarkerPath],
      port
    });
    const spawned = await control.waitFor((message) => message.type === "app-spawned", "app spawn");
    appPid = spawned.processGroupId ?? null;
    assert.ok(appPid);
    assert.ok(spawned.processIdentity);
    assert.ok(processGroupIsRunning(appPid));

    const statePath = sqliteAppLeaseStatePath(dbPath);
    const persisted = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
    assert.equal(persisted.appProcessIdentity, spawned.processIdentity);
    persisted.appProcessIdentity = `mismatched-${spawned.processIdentity}`;
    writeFileSync(statePath, `${JSON.stringify(persisted)}\n`, { mode: 0o600 });

    guardianProcess.stdin?.end();
    await control.waitFor(
      (message) => message.type === "error" && message.operation === "orphan-cleanup",
      "single fail-closed orphan cleanup error"
    );
    await new Promise((resolve) => setTimeout(resolve, 650));

    const orphanErrors = control.messages.filter(
      (message) => message.type === "error" && message.operation === "orphan-cleanup"
    );
    assert.equal(orphanErrors.length, 1, "identity mismatch must fail closed once instead of polling release forever");
    assert.match(orphanErrors[0]?.message ?? "", /identity/u);
    assert.equal(existsSync(termMarkerPath), false, "identity mismatch must not receive SIGTERM");
    assert.equal(processGroupIsRunning(appPid), true, "identity mismatch must not receive SIGKILL");
    assert.ok(guardianPid && processGroupIsRunning(guardianPid), "identity mismatch must keep guardian and lease alive");
    assert.equal(existsSync(rootDir), true, "identity mismatch must retain the exact run-owned evidence root");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-block-after-guardian-identity-mismatch" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    if (appPid && processGroupIsRunning(appPid)) {
      try {
        process.kill(-appPid, "SIGKILL");
      } catch {
        // The exact test-owned app group may already be gone.
      }
      try {
        await waitForProcessGroupExit(appPid);
      } catch {
        // Preserve the primary mismatch assertion.
      }
    }
    if (guardianPid && processGroupIsRunning(guardianPid)) {
      try {
        process.kill(-guardianPid, "SIGKILL");
      } catch {
        // The exact test-owned guardian may already be gone.
      }
      try {
        await waitForProcessGroupExit(guardianPid);
      } catch {
        // Preserve the primary mismatch assertion.
      }
    }
    try {
      recovered = await waitForLeaseRecovery(dbPath, "identity-mismatch-cleanup", 2_000);
    } catch {
      // Exact-path removal below is the final fallback after process cleanup.
    }
    recovered?.release();
    removeTestOwnedIsolatedRunRoot(rootDir);
  }
});

test("persistent lease state fails closed when the guardian crashes before its app group", {
  timeout: 20_000,
  skip: process.platform === "win32"
}, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-guardian-crash-"));
  const dbPath = path.join(root, "guardian-crash.sqlite");
  const port = await unusedLocalPort();
  const guardian = await startSqliteAppLeaseGuardian(dbPath, {
    runId: "guardian-crash-owner",
    env: process.env
  });
  const spawned = await guardian.spawnApp(
    process.execPath,
    ["-e", "setInterval(() => {}, 1_000)"],
    port
  );
  const appPid = spawned.processGroupId;
  const statePath = sqliteAppLeaseStatePath(dbPath);
  const durableState = readFileSync(statePath, "utf8");
  let recovered: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    assert.ok(processGroupIsRunning(appPid));
    process.kill(-guardian.guardianPid, "SIGKILL");

    const deadline = Date.now() + 5_000;
    let failClosedError: unknown = null;
    while (Date.now() < deadline) {
      try {
        const unexpected = acquireSqliteAppLease(dbPath, { runId: "must-block-after-guardian-crash" });
        unexpected.release();
        assert.fail("a live app group must prevent recovery after guardian crash");
      } catch (error) {
        if (/surviving isolated app process group still owns the SQLite database/u.test(String(error))) {
          failClosedError = error;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.match(String(failClosedError), /surviving isolated app process group still owns the SQLite database/u);
    assert.ok(processGroupIsRunning(appPid), "the persistent-state rejection must occur while the app is alive");

    rmSync(statePath, { force: true });
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-fail-closed-without-state" }),
      /pre-existing isolated app lease DB has no recovery state/u
    );
    writeFileSync(statePath, durableState, { mode: 0o600 });

    process.kill(-appPid, "SIGTERM");
    await waitForProcessGroupExit(appPid);
    recovered = await waitForLeaseRecovery(dbPath, "after-guardian-and-app-exit");
    assert.equal(recovered.owner.runId, "after-guardian-and-app-exit");
  } finally {
    recovered?.release();
    try {
      process.kill(-appPid, "SIGKILL");
    } catch {
      // The app group should already be gone on the passing path.
    }
    try {
      process.kill(-guardian.guardianPid, "SIGKILL");
    } catch {
      // The guardian was deliberately killed by the regression.
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("isolated process stop waits until the captured descendant tree has exited", { timeout: 10_000 }, async () => {
  const parent = spawn(process.execPath, [
    "-e",
    [
      "const { spawn } = require('node:child_process');",
      "const child = spawn(process.execPath, ['-e', [",
      "  \"process.on('SIGTERM', () => setTimeout(() => process.exit(0), 350));\",",
      "  \"process.stdout.write('ready\\\\n');\",",
      "  \"setInterval(() => {}, 1_000);\"",
      "].join('\\n')], { stdio: ['ignore', 'pipe', 'ignore'] });",
      "child.stdout.once('data', () => process.stdout.write(String(child.pid) + '\\n'));",
      "setInterval(() => {}, 1_000);"
    ].join("\n")
  ]);
  let descendantPid: number | null = null;

  try {
    const [readyChunk] = await once(parent.stdout, "data");
    descendantPid = Number(String(readyChunk).trim());
    assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 0);

    await stopIsolatedProcessTree(parent);
    assert.throws(
      () => process.kill(descendantPid as number, 0),
      (error: unknown) => (error as NodeJS.ErrnoException).code === "ESRCH"
    );
  } finally {
    if (descendantPid) {
      try {
        process.kill(descendantPid, "SIGKILL");
      } catch {
        // The descendant should already be gone on the passing path.
      }
    }
    await stopChild(parent);
  }
});

test("isolated POSIX process-group stop catches a descendant created during SIGTERM", {
  timeout: 15_000,
  skip: process.platform === "win32"
}, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-process-group-"));
  const latePidPath = path.join(root, "late-descendant.pid");
  const parent = spawn(process.execPath, [
    "-e",
    [
      "const { spawn } = require('node:child_process');",
      "const { writeFileSync } = require('node:fs');",
      "process.on('SIGTERM', () => {",
      "  const late = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1_000)'], { stdio: 'ignore' });",
      "  writeFileSync(process.argv[1], String(late.pid));",
      "});",
      "process.stdout.write('ready\\n');",
      "setInterval(() => {}, 1_000);"
    ].join("\n"),
    latePidPath
  ], { detached: true });
  let latePid: number | null = null;

  try {
    await once(parent.stdout, "data");
    assert.ok(parent.pid);
    await stopIsolatedProcessTree(parent, undefined, parent.pid);
    latePid = Number(readFileSync(latePidPath, "utf8"));
    assert.ok(Number.isSafeInteger(latePid) && latePid > 0);
    assert.throws(
      () => process.kill(latePid as number, 0),
      (error: unknown) => (error as NodeJS.ErrnoException).code === "ESRCH"
    );
  } finally {
    if (latePid) {
      try {
        process.kill(latePid, "SIGKILL");
      } catch {
        // The process group should already be gone on the passing path.
      }
    }
    if (parent.pid) {
      try {
        process.kill(-parent.pid, "SIGKILL");
      } catch {
        // The process group should already be gone on the passing path.
      }
    }
    await stopChild(parent);
    rmSync(root, { recursive: true, force: true });
  }
});

test("isolated app cleanup refuses a reused process group and retains its SQLite lease", {
  timeout: 10_000,
  skip: process.platform === "win32"
}, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-pgid-reuse-"));
  const dbPath = path.join(root, "pgid-reuse.sqlite");
  const termMarkerPath = path.join(root, "replacement-received-term");
  const lease = acquireSqliteAppLease(dbPath, { runId: "pgid-reuse-owner" });
  const replacement = spawn(process.execPath, [
    "-e",
    [
      "const { writeFileSync } = require('node:fs');",
      "process.on('SIGTERM', () => writeFileSync(process.argv[1], 'SIGTERM'));",
      "process.stdout.write('ready\\n');",
      "setInterval(() => {}, 1_000);"
    ].join("\n"),
    termMarkerPath
  ], { detached: true });

  try {
    await once(replacement.stdout, "data");
    assert.ok(replacement.pid);

    const exitedHandleErrors = await cleanupIsolatedAppLifecycle({
      appProcess: {
        pid: replacement.pid,
        exitCode: 0,
        signalCode: null,
        processIdentity: "stale-original-process-identity"
      },
      processGroupId: replacement.pid,
      sqliteLease: lease,
      dbPath,
      port: await unusedLocalPort(),
      tempTsconfigPath: null,
      logs: []
    });
    assert.equal(exitedHandleErrors.length, 1);
    assert.match(
      String(exitedHandleErrors[0]),
      /Refusing to signal a process group after its recorded app handle exited/u
    );

    const mismatchedIdentityErrors = await cleanupIsolatedAppLifecycle({
      appProcess: {
        pid: replacement.pid,
        exitCode: null,
        signalCode: null,
        processIdentity: "stale-original-process-identity"
      },
      processGroupId: replacement.pid,
      sqliteLease: lease,
      dbPath,
      port: await unusedLocalPort(),
      tempTsconfigPath: null,
      logs: []
    });
    assert.equal(mismatchedIdentityErrors.length, 1);
    assert.match(
      String(mismatchedIdentityErrors[0]),
      /Refusing to send SIGTERM because isolated app process-group identity cannot be proven/u
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(existsSync(termMarkerPath), false, "replacement process group must not receive SIGTERM");
    assert.equal(
      processGroupIsRunning(replacement.pid),
      true,
      "replacement process group must remain alive, proving it did not receive SIGKILL"
    );
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-remain-blocked-after-pgid-reuse" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
  } finally {
    if (replacement.pid) {
      try {
        process.kill(-replacement.pid, "SIGKILL");
      } catch {
        // Preserve the primary assertion if the replacement exited unexpectedly.
      }
      await waitForProcessGroupExit(replacement.pid);
    }
    lease.release();
    rmSync(root, { recursive: true, force: true });
  }
});

test("isolated app pre-spawn failure removes its temporary Next tsconfig", { timeout: 10_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-start-cleanup-"));
  const dbPath = path.join(root, "blocked.sqlite");
  const heldLease = acquireSqliteAppLease(dbPath, { runId: "pre-spawn-cleanup-holder" });
  const prefix = "tsconfig.lease-cleanup-regression-preflight-cleanup-worker-0-";
  const listTempConfigs = () => readdirSync(process.cwd())
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".tmp.json"))
    .sort();
  const before = listTempConfigs();

  try {
    await assert.rejects(
      startIsolatedApp(
        "lease-cleanup-regression",
        { project: { name: "preflight-cleanup" }, workerIndex: 0 } as Parameters<typeof startIsolatedApp>[1],
        { dbPath, mode: "dev" }
      ),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );
    assert.deepEqual(listTempConfigs(), before);
  } finally {
    heldLease.release();
    for (const leakedConfig of listTempConfigs()) {
      if (!before.includes(leakedConfig)) rmSync(path.join(process.cwd(), leakedConfig), { force: true });
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("isolated app stop retains its lease and root on a boundary failure and can be retried", { timeout: 60_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-stop-retry-"));
  const dbPath = path.join(root, "stop-retry.sqlite");
  const testInfo = {
    project: { name: "stop-retry" },
    workerIndex: 0
  } as Parameters<typeof startIsolatedApp>[1];
  const app = await startIsolatedApp("lease-stop-retry-regression", testInfo, { dbPath, mode: "dev" });
  const runSlug = path.basename(app.rootDir);
  const tempTsconfigPath = path.join(process.cwd(), `tsconfig.${runSlug}.tmp.json`);
  let holder: DatabaseSync | null = null;
  let afterStopLease: ReturnType<typeof acquireSqliteAppLease> | null = null;

  try {
    holder = new DatabaseSync(dbPath);

    await assert.rejects(
      app.stop(),
      /SQLite database is already held/u
    );
    assert.equal(existsSync(app.rootDir), true, "failed public stop must retain its exact run-owned evidence root");
    assert.equal(existsSync(tempTsconfigPath), true, "failed public stop must retain its exact temp tsconfig evidence");
    assert.throws(
      () => acquireSqliteAppLease(dbPath, { runId: "must-remain-blocked-after-failed-stop" }),
      /Preflight failed: SQLite database is already held by another isolated app lease/u
    );

    holder.close();
    holder = null;
    await app.stop();
    assert.equal(existsSync(app.rootDir), false, "successful public stop retry must remove its exact run-owned root");
    assert.equal(existsSync(tempTsconfigPath), false, "successful public stop retry must remove its exact temp tsconfig");

    afterStopLease = acquireSqliteAppLease(dbPath, { runId: "after-retried-stop" });
    assert.equal(afterStopLease.owner.runId, "after-retried-stop");
  } finally {
    holder?.close();
    rmSync(tempTsconfigPath, { force: true });
    try {
      await app.stop();
    } catch {
      // Preserve the primary assertion; worker exit still releases a retained lease.
    }
    afterStopLease?.release();
    rmSync(app.rootDir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
