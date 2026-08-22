import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runGeneratedArtifactCleanup } from "./cleanup-generated-artifacts.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureParent = path.join(repoRoot, ".tmp", "next-env-restore-tests");
const wrapperPath = path.join(repoRoot, "scripts", "with-next-env-restore.mjs");
const originalNextEnv = [
  '/// <reference types="next" />',
  '/// <reference path="./.next/types/routes.d.ts" />',
  ""
].join("\n");

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function processGroupIsAlive(processGroupId) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function waitFor(predicate, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for wrapper state.");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function createFixture() {
  mkdirSync(fixtureParent, { recursive: true });
  const cwd = mkdtempSync(path.join(fixtureParent, "case-"));
  writeFileSync(path.join(cwd, "next-env.d.ts"), originalNextEnv);
  return cwd;
}

function nextEnvLockPaths(cwd) {
  const canonicalCwd = realpathSync(cwd);
  const uid = process.getuid?.();
  assert.equal(typeof uid, "number", "POSIX lock tests require a numeric uid");
  const digest = createHash("sha256").update(canonicalCwd).digest("hex");
  const lockRoot = path.join(
    realpathSync(tmpdir()),
    "mais-next-env-restore-locks",
    `uid-${uid}-${digest}`
  );
  return {
    lockRoot,
    lockPath: path.join(lockRoot, "next-env-restore.lock"),
    recoveryLockPath: path.join(lockRoot, "next-env-restore.lock.recovery")
  };
}

function cleanupLockFixture(cwd) {
  rmSync(nextEnvLockPaths(cwd).lockRoot, { recursive: true, force: true });
}

function mutatingChild(exitCode, linger = false) {
  return [
    process.execPath,
    "-e",
    [
      'require("node:fs").writeFileSync("next-env.d.ts", "mutated by isolated build\\n")',
      'process.stdout.write("mutated\\n")',
      linger ? "setInterval(() => {}, 1000)" : `process.exit(${exitCode})`
    ].join(";")
  ];
}

test("the isolated-build wrapper restores next-env.d.ts after success", () => {
  const cwd = createFixture();
  try {
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8"
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("the isolated-build wrapper restores next-env.d.ts after a failing child", () => {
  const cwd = createFixture();
  try {
    const [command, ...args] = mutatingChild(23);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8"
    });

    assert.equal(result.status, 23, `${result.stdout}\n${result.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("the isolated-build wrapper removes a next-env.d.ts created by the child", () => {
  const cwd = createFixture();
  const nextEnvPath = path.join(cwd, "next-env.d.ts");
  rmSync(nextEnvPath);
  try {
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8"
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(existsSync(nextEnvPath), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

for (const [forwardedSignal, expectedExitCode] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
  ["SIGHUP", 129]
]) {
  test(`the isolated-build wrapper restores next-env.d.ts after ${forwardedSignal}`, async () => {
    const cwd = createFixture();
    try {
      const [command, ...args] = mutatingChild(0, true);
      const child = spawn(process.execPath, [wrapperPath, "--", command, ...args], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let signalled = false;
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (!signalled && stdout.includes("mutated\n")) {
          signalled = true;
          child.kill(forwardedSignal);
        }
      });
      child.stderr.on("data", (chunk) => { stderr += chunk; });

      const [code, signal] = await once(child, "exit");
      assert.equal(signal, null, `${stdout}\n${stderr}`);
      assert.equal(code, expectedExitCode, `${stdout}\n${stderr}`);
      assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    } finally {
      cleanupLockFixture(cwd);
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}

test("SIGTERM stops the complete child process tree before restoring next-env.d.ts", async () => {
  const cwd = createFixture();
  try {
    const lateMutation = [
      'require("node:fs").writeFileSync("next-env.d.ts", "late grandchild mutation\\n")',
      "process.exit(0)"
    ].join(";");
    const grandchildScript = `setTimeout(() => { ${lateMutation} }, 350)`;
    const childScript = [
      'const { spawn } = require("node:child_process")',
      'require("node:fs").writeFileSync("next-env.d.ts", "mutated by direct child\\n")',
      `spawn(process.execPath, ["-e", ${JSON.stringify(grandchildScript)}], { stdio: "ignore" })`,
      'process.stdout.write("mutated-with-grandchild\\n")',
      "setInterval(() => {}, 1000)"
    ].join(";");
    const wrapper = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let signalled = false;
    wrapper.stdout.setEncoding("utf8");
    wrapper.stderr.setEncoding("utf8");
    wrapper.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!signalled && stdout.includes("mutated-with-grandchild\n")) {
        signalled = true;
        wrapper.kill("SIGTERM");
      }
    });
    wrapper.stderr.on("data", (chunk) => { stderr += chunk; });

    const [code, signal] = await once(wrapper, "exit");
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.equal(signal, null, `${stdout}\n${stderr}`);
    assert.equal(code, 143, `${stdout}\n${stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("SIGTERM escalation force-kills an ignoring process group before restore", async () => {
  const cwd = createFixture();
  try {
    const grandchildScript = [
      'process.on("SIGTERM", () => {})',
      'setTimeout(() => require("node:fs").writeFileSync("next-env.d.ts", "late ignored mutation\\n"), 5_300)',
      "setInterval(() => {}, 1000)"
    ].join(";");
    const childScript = [
      'const { spawn } = require("node:child_process")',
      'process.on("SIGTERM", () => {})',
      `spawn(process.execPath, ["-e", ${JSON.stringify(grandchildScript)}], { stdio: "ignore" })`,
      'require("node:fs").writeFileSync("next-env.d.ts", "mutated by ignoring group\\n")',
      'process.stdout.write("ignoring-group-ready\\n")',
      "setInterval(() => {}, 1000)"
    ].join(";");
    const wrapper = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let signalled = false;
    wrapper.stdout.setEncoding("utf8");
    wrapper.stderr.setEncoding("utf8");
    wrapper.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!signalled && stdout.includes("ignoring-group-ready\n")) {
        signalled = true;
        wrapper.kill("SIGTERM");
      }
    });
    wrapper.stderr.on("data", (chunk) => { stderr += chunk; });

    const [code, signal] = await once(wrapper, "exit");
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(signal, null, `${stdout}\n${stderr}`);
    assert.equal(code, 143, `${stdout}\n${stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("concurrent wrappers serialize snapshot through restore", async () => {
  const cwd = createFixture();
  try {
    const startWrapper = (value, lingerMs) => {
      const childScript = [
        `require("node:fs").writeFileSync("next-env.d.ts", ${JSON.stringify(`${value}\n`)})`,
        `process.stdout.write(${JSON.stringify(`ready-${value}\n`)})`,
        `setTimeout(() => process.exit(0), ${lingerMs})`
      ].join(";");
      return spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
    };
    const waitForMarker = (child, marker) => new Promise((resolve, reject) => {
      let stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.includes(marker)) resolve();
      });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (!stdout.includes(marker)) reject(new Error(`wrapper exited before ${marker}: ${code}/${signal}`));
      });
    });

    const first = startWrapper("A", 450);
    await waitForMarker(first, "ready-A\n");
    const second = startWrapper("B", 750);
    const [[firstCode, firstSignal], [secondCode, secondSignal]] = await Promise.all([
      once(first, "exit"),
      once(second, "exit")
    ]);

    assert.deepEqual({ code: firstCode, signal: firstSignal }, { code: 0, signal: null });
    assert.deepEqual({ code: secondCode, signal: secondSignal }, { code: 0, signal: null });
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("repo tmp cleanup cannot remove the active lock or admit a second snapshot owner", async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const startWrapper = (value, lingerMs) => {
    const childScript = [
      `require("node:fs").writeFileSync("next-env.d.ts", ${JSON.stringify(`${value}\n`)})`,
      `process.stdout.write(${JSON.stringify(`ready-${value}\n`)})`,
      `setTimeout(() => process.exit(0), ${lingerMs})`
    ].join(";");
    const wrapper = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    wrapper.stdout.setEncoding("utf8");
    wrapper.stderr.setEncoding("utf8");
    wrapper.output = "";
    wrapper.errors = "";
    wrapper.stdout.on("data", (chunk) => { wrapper.output += chunk; });
    wrapper.stderr.on("data", (chunk) => { wrapper.errors += chunk; });
    return wrapper;
  };
  const marker = (wrapper, expected) => waitFor(() => wrapper.output.includes(expected), 3_000);
  let first;
  let second;

  try {
    first = startWrapper("A", 900);
    await marker(first, "ready-A\n");
    await waitFor(() => existsSync(lock.lockPath), 1_000);
    mkdirSync(path.join(cwd, ".tmp"), { recursive: true });
    writeFileSync(path.join(cwd, ".tmp", "cleanup-sentinel.txt"), "remove me\n");

    const cleanup = await runGeneratedArtifactCleanup({
      repoRoot: cwd,
      scope: "tmp-scratch",
      apply: true
    });
    assert.deepEqual(cleanup.targets.map((target) => target.path), [".tmp"]);
    assert.equal(existsSync(lock.lockPath), true, "repo cleanup must not remove the OS-temp lock");

    let firstExited = false;
    first.once("exit", () => { firstExited = true; });
    second = startWrapper("B", 150);
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(second.output.includes("ready-B\n"), false, "the second wrapper must still be waiting");

    const [firstCode, firstSignal] = await once(first, "exit");
    firstExited = true;
    await marker(second, "ready-B\n");
    assert.equal(firstExited, true, "the second wrapper entered before the first released the lock");
    const [secondCode, secondSignal] = await once(second, "exit");

    assert.deepEqual({ code: firstCode, signal: firstSignal }, { code: 0, signal: null }, first.errors);
    assert.deepEqual({ code: secondCode, signal: secondSignal }, { code: 0, signal: null }, second.errors);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    assert.equal(existsSync(lock.lockPath), false);
  } finally {
    for (const wrapper of [first, second]) {
      if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a crash before publish metadata never exposes a partial final lock and the orphan temp is recovered", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  try {
    const crashed = spawnSync(
      process.execPath,
      [wrapperPath, "--", process.execPath, "-e", "process.exit(0)"],
      {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_NEXT_ENV_RESTORE_TEST_CRASH_AFTER_TEMP_OPEN: "1"
        },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );

    assert.equal(crashed.status, null, `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(crashed.signal, "SIGKILL", `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(existsSync(lock.lockPath), false, "the final lock path must never expose partial metadata");
    const orphanNames = readdirSync(lock.lockRoot).filter((name) => name.includes(".publish-"));
    assert.equal(orphanNames.length, 1);
    assert.equal(statSync(path.join(lock.lockRoot, orphanNames[0])).size, 0);

    const [command, ...args] = mutatingChild(0);
    const recovered = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 3_000,
      killSignal: "SIGKILL"
    });
    assert.equal(recovered.status, 0, `${recovered.stdout}\n${recovered.stderr}`);
    assert.equal(recovered.signal, null, `${recovered.stdout}\n${recovered.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    assert.deepEqual(readdirSync(lock.lockRoot), [], "only the exact crashed publish temp should be removed");
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a lock replaced with a FIFO between path inspection and open cannot block the wrapper", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "replace-lock-with-fifo.mjs");
  try {
    mkdirSync(lock.lockRoot, { recursive: true, mode: 0o700 });
    writeFileSync(lock.lockPath, JSON.stringify({
      version: 1,
      pid: 2_147_483_647,
      token: "fifo-replacement-fixture",
      canonicalCwd: realpathSync(cwd),
      createdAt: "2026-01-01T00:00:00.000Z"
    }), { mode: 0o600 });
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import { spawnSync } from "node:child_process"',
      'import { syncBuiltinESMExports } from "node:module"',
      'import path from "node:path"',
      'const originalLstat = fs.lstatSync.bind(fs)',
      'const originalOpen = fs.openSync.bind(fs)',
      'const originalUnlink = fs.unlinkSync.bind(fs)',
      'let replaced = false',
      'const target = path.resolve(process.env.MAIS_TEST_LOCK_PATH)',
      'const replace = () => {',
      '  if (replaced) return',
      '  replaced = true',
      '  originalUnlink(target)',
      '  const result = spawnSync("mkfifo", [target], { encoding: "utf8" })',
      '  if (result.status !== 0) throw new Error(result.stderr || "mkfifo failed")',
      '}',
      'fs.lstatSync = (value, ...args) => {',
      '  const result = originalLstat(value, ...args)',
      '  if (path.resolve(String(value)) === target) replace()',
      '  return result',
      '}',
      'fs.openSync = (value, ...args) => {',
      '  if (path.resolve(String(value)) === target) replace()',
      '  return originalOpen(value, ...args)',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));

    const result = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", process.execPath, "-e", "process.exit(0)"],
      {
        cwd,
        encoding: "utf8",
        env: { ...process.env, MAIS_TEST_LOCK_PATH: lock.lockPath },
        timeout: 800,
        killSignal: "SIGKILL"
      }
    );

    assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /unsafe|regular file|lock node/u);
    assert.equal(lstatSync(lock.lockPath).isFIFO(), true);
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("lock metadata validation uses one no-follow nonblocking descriptor and a bounded read", () => {
  const source = readFileSync(wrapperPath, "utf8");

  assert.match(source, /O_NOFOLLOW/u);
  assert.match(source, /O_NONBLOCK/u);
  assert.match(source, /fstatSync\(descriptor\)/u);
  assert.match(source, /readSync\(descriptor,/u);
  assert.doesNotMatch(source, /readFileSync\(lockPath,/u);
});

test("release quarantines a replacement lock and does not overwrite a later next-env owner", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "replace-lock-before-quarantine.mjs");
  const replacement = "replacement lock must survive\n";
  const laterNextEnv = "later owner next-env content\n";
  try {
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import { syncBuiltinESMExports } from "node:module"',
      'import path from "node:path"',
      'const originalRename = fs.renameSync.bind(fs)',
      'const originalWrite = fs.writeFileSync.bind(fs)',
      'let replaced = false',
      'const target = path.resolve(process.env.MAIS_TEST_LOCK_PATH)',
      'const backup = `${target}.legitimate-owner`',
      'fs.renameSync = (from, to) => {',
      '  if (!replaced && path.resolve(String(from)) === target && path.basename(String(to)).includes(".quarantine-")) {',
      '    replaced = true',
      '    originalRename(from, backup)',
      '    originalWrite(from, process.env.MAIS_TEST_REPLACEMENT, { mode: 0o600 })',
      '    originalWrite(process.env.MAIS_TEST_NEXT_ENV_PATH, process.env.MAIS_TEST_LATER_NEXT_ENV)',
      '  }',
      '  return originalRename(from, to)',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", command, ...args],
      {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_TEST_LOCK_PATH: lock.lockPath,
          MAIS_TEST_REPLACEMENT: replacement,
          MAIS_TEST_NEXT_ENV_PATH: path.join(cwd, "next-env.d.ts"),
          MAIS_TEST_LATER_NEXT_ENV: laterNextEnv
        },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );

    assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), laterNextEnv);
    const preserved = readdirSync(lock.lockRoot).some((name) => {
      const candidate = path.join(lock.lockRoot, name);
      try {
        return lstatSync(candidate).isFile() && readFileSync(candidate, "utf8") === replacement;
      } catch {
        return false;
      }
    });
    assert.equal(preserved, true, "a replacement lock must be preserved, not unlinked");
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a recycled live PID with an expired lease identity is recovered without a 30-second wait", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  try {
    mkdirSync(lock.lockRoot, { recursive: true, mode: 0o700 });
    const token = "11111111-1111-4111-8111-111111111111";
    const leaseName = `.next-env-restore.lock.lease-${process.pid}-${token}`;
    const leasePath = path.join(lock.lockRoot, leaseName);
    writeFileSync(leasePath, `${token}\n`, { mode: 0o600 });
    const leaseStat = statSync(leasePath);
    const expiredAt = new Date(Date.now() - 20_000);
    utimesSync(leasePath, expiredAt, expiredAt);
    writeFileSync(lock.lockPath, JSON.stringify({
      version: 1,
      pid: process.pid,
      token,
      leaseName,
      leaseDevice: String(leaseStat.dev),
      leaseInode: String(leaseStat.ino),
      canonicalCwd: realpathSync(cwd),
      createdAt: "2026-01-01T00:00:00.000Z"
    }), { mode: 0o600 });
    const startedAt = Date.now();
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 2_500,
      killSignal: "SIGKILL"
    });

    assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(Date.now() - startedAt < 2_000, "an expired PID lease should not wait for the lock timeout");
    assert.equal(existsSync(lock.lockPath), false);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a validated lock whose owner is gone is removed before taking the snapshot", () => {
  const cwd = createFixture();
  const { lockRoot, lockPath } = nextEnvLockPaths(cwd);
  try {
    mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
    const stalePid = 2_147_483_647;
    const token = "22222222-2222-4222-8222-222222222222";
    const leaseName = `.next-env-restore.lock.lease-${stalePid}-${token}`;
    const leasePath = path.join(lockRoot, leaseName);
    writeFileSync(leasePath, `${token}\n`, { mode: 0o600 });
    const leaseStat = statSync(leasePath);
    writeFileSync(lockPath, JSON.stringify({
      version: 1,
      pid: stalePid,
      token,
      leaseName,
      leaseDevice: String(leaseStat.dev),
      leaseInode: String(leaseStat.ino),
      canonicalCwd: realpathSync(cwd),
      createdAt: "2026-01-01T00:00:00.000Z"
    }), { mode: 0o600 });
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 3_000,
      killSignal: "SIGKILL"
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
    assert.equal(existsSync(lockPath), false);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a Playwright-like detached webServer SIGTERM lets the wrapper restore before exit", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  let webServer;
  try {
    const childScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "mutated by detached webServer build\\n")',
      'process.stdout.write("detached-build-mutated\\n")',
      "setInterval(() => {}, 1000)"
    ].join(";");
    const command = [process.execPath, wrapperPath, "--", process.execPath, "-e", childScript]
      .map(shellQuote)
      .join(" ");
    webServer = spawn(command, {
      cwd,
      shell: true,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let signalled = false;
    webServer.stdout.setEncoding("utf8");
    webServer.stderr.setEncoding("utf8");
    webServer.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!signalled && stdout.includes("detached-build-mutated\n")) {
        signalled = true;
        process.kill(-webServer.pid, "SIGTERM");
      }
    });
    webServer.stderr.on("data", (chunk) => { stderr += chunk; });

    await once(webServer, "exit");
    await waitFor(() => (
      !processGroupIsAlive(webServer.pid) &&
      readFileSync(path.join(cwd, "next-env.d.ts"), "utf8") === originalNextEnv
    ));
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv, `${stdout}\n${stderr}`);
  } finally {
    if (webServer?.pid && processGroupIsAlive(webServer.pid)) {
      process.kill(-webServer.pid, "SIGKILL");
    }
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("stale-lock cleanup refuses a symlink without deleting its target", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const { lockRoot, lockPath } = nextEnvLockPaths(cwd);
  const externalOwner = path.join(cwd, "external-owner.json");
  try {
    mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
    writeFileSync(externalOwner, "must survive\n");
    symlinkSync(externalOwner, lockPath);
    const [command, ...args] = mutatingChild(0);
    const result = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8"
    });

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Refusing unsafe next-env lock node/u);
    assert.equal(lstatSync(lockPath).isSymbolicLink(), true);
    assert.equal(readFileSync(externalOwner, "utf8"), "must survive\n");
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("Windows execution fails fast instead of claiming unsupported process-tree safety", () => {
  const script = [
    'Object.defineProperty(process, "platform", { value: "win32" })',
    `const { runWithNextEnvRestore } = await import(${JSON.stringify(pathToFileURL(wrapperPath).href)})`,
    'await runWithNextEnvRestore(process.execPath, ["-e", "process.exit(0)"], { cwd: process.cwd() })'
  ].join(";");
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /requires POSIX process groups; Windows execution is intentionally unsupported/u);
});
