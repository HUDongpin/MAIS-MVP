import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
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
    if (error?.code === "EPERM") return true;
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
    realpathSync("/tmp"),
    `mais-next-env-restore-locks-uid-${uid}`,
    digest
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

function persistedChildProcessGroupId(lockRoot) {
  if (!existsSync(lockRoot)) return null;
  const childStateName = readdirSync(lockRoot).find((name) => name.includes(".lock.child-"));
  if (!childStateName) return null;
  const payload = JSON.parse(readFileSync(path.join(lockRoot, childStateName), "utf8"));
  return Number.isSafeInteger(payload.processGroupId) ? payload.processGroupId : null;
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

test("a transient process-group EPERM is fenced until ESRCH before restoring next-env.d.ts", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const preloadPath = path.join(cwd, "transient-process-group-eperm.mjs");
  const injectedMarker = path.join(cwd, "eperm-injected");
  const lateMutationMarker = path.join(cwd, "late-group-mutation");
  try {
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'const originalKill = process.kill.bind(process)',
      'let injectedSignal = false',
      'function permissionError() {',
      '  const error = new Error("synthetic process-group EPERM")',
      '  error.code = "EPERM"',
      '  return error',
      '}',
      'process.kill = (target, signal) => {',
      '  if (!Number.isSafeInteger(target) || target >= 0) return originalKill(target, signal)',
      '  if (signal !== 0 && !injectedSignal) {',
      '    injectedSignal = true',
      '    fs.writeFileSync(process.env.MAIS_TEST_EPERM_MARKER, `${signal}\\n`)',
      '    throw permissionError()',
      '  }',
      '  return originalKill(target, signal)',
      '}',
      ""
    ].join("\n"));

    const grandchildScript = [
      'const fs = require("node:fs")',
      'setTimeout(() => {',
      '  fs.writeFileSync("next-env.d.ts", "late mutation while process group is still alive\\n")',
      `  fs.writeFileSync(${JSON.stringify(lateMutationMarker)}, "late mutation completed\\n")`,
      '  process.exit(0)',
      '}, 250)'
    ].join(";");
    const childScript = [
      'const { spawn } = require("node:child_process")',
      'require("node:fs").writeFileSync("next-env.d.ts", "direct child mutation\\n")',
      `spawn(process.execPath, ["-e", ${JSON.stringify(grandchildScript)}], { stdio: "ignore" })`,
      'process.exit(0)'
    ].join(";");
    const startedAt = Date.now();
    const result = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", process.execPath, "-e", childScript],
      {
        cwd,
        encoding: "utf8",
        env: { ...process.env, MAIS_TEST_EPERM_MARKER: injectedMarker },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
    assert.equal(readFileSync(injectedMarker, "utf8"), "SIGTERM\n");
    assert.equal(readFileSync(lateMutationMarker, "utf8"), "late mutation completed\n");
    assert.ok(Date.now() - startedAt >= 200, "the wrapper restored before the surviving process group exited");
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

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

test("TMPDIR, TMP, and TEMP cannot split one worktree into concurrent snapshot owners", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const tempA = path.join(cwd, "temp-a");
  const tempB = path.join(cwd, "temp-b");
  let first;
  let second;

  try {
    mkdirSync(tempA, { mode: 0o700 });
    mkdirSync(tempB, { mode: 0o700 });
    const startWrapper = (label, tempRoot, lingerMs) => {
      const childScript = [
        `require("node:fs").writeFileSync("next-env.d.ts", ${JSON.stringify(`${label} mutation\n`)})`,
        `process.stdout.write(${JSON.stringify(`${label}-entered\n`)})`,
        `setTimeout(() => process.exit(0), ${lingerMs})`
      ].join(";");
      const wrapper = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
        cwd,
        env: { ...process.env, TMPDIR: tempRoot, TMP: tempRoot, TEMP: tempRoot },
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

    first = startWrapper("first-temp", tempA, 750);
    const firstOutcome = once(first, "exit");
    await waitFor(() => first.output.includes("first-temp-entered\n"), 3_000);
    second = startWrapper("second-temp", tempB, 100);
    const secondOutcome = once(second, "exit");

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(
      second.output.includes("second-temp-entered\n"),
      false,
      "environment-specific temp roots must not create overlapping snapshot owners"
    );

    const [[firstCode, firstSignal], [secondCode, secondSignal]] = await Promise.all([
      firstOutcome,
      secondOutcome
    ]);
    assert.deepEqual({ code: firstCode, signal: firstSignal }, { code: 0, signal: null }, first.errors);
    assert.deepEqual({ code: secondCode, signal: secondSignal }, { code: 0, signal: null }, second.errors);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    for (const wrapper of [first, second]) {
      if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a SIGKILLed wrapper fences its still-active child group and durably recovers the original snapshot", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const finishedMarker = path.join(cwd, "first-child-finished");
  let first;
  let second;
  let firstChildProcessGroupId = null;

  try {
    const firstScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "first active mutation\\n")',
      'process.stdout.write(`first-child-pgid:${process.pid}\\n`)',
      'setTimeout(() => require("node:fs").writeFileSync("next-env.d.ts", "first late mutation\\n"), 550)',
      `setTimeout(() => { require("node:fs").writeFileSync(${JSON.stringify(finishedMarker)}, "done\\n"); process.exit(0) }, 850)`
    ].join(";");
    first = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", firstScript], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    first.stdout.setEncoding("utf8");
    first.stderr.setEncoding("utf8");
    first.output = "";
    first.errors = "";
    first.stdout.on("data", (chunk) => {
      first.output += chunk;
      const match = /first-child-pgid:(\d+)/u.exec(first.output);
      if (match) firstChildProcessGroupId = Number(match[1]);
    });
    first.stderr.on("data", (chunk) => { first.errors += chunk; });
    await waitFor(() => Number.isSafeInteger(firstChildProcessGroupId), 3_000);
    firstChildProcessGroupId = persistedChildProcessGroupId(lock.lockRoot) ?? firstChildProcessGroupId;

    first.kill("SIGKILL");
    const [firstCode, firstSignal] = await once(first, "exit");
    assert.deepEqual({ code: firstCode, signal: firstSignal }, { code: null, signal: "SIGKILL" });
    assert.equal(processGroupIsAlive(firstChildProcessGroupId), true, "the detached child fixture must outlive its wrapper");

    const secondScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "second mutation\\n")',
      'process.stdout.write("second-entered\\n")',
      "process.exit(0)"
    ].join(";");
    second = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", secondScript], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    second.stdout.setEncoding("utf8");
    second.stderr.setEncoding("utf8");
    second.output = "";
    second.errors = "";
    second.stdout.on("data", (chunk) => { second.output += chunk; });
    second.stderr.on("data", (chunk) => { second.errors += chunk; });

    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(existsSync(finishedMarker), false, "the first child should still be active during the takeover probe");
    assert.equal(second.output.includes("second-entered\n"), false, "a contender must not snapshot an active abandoned child mutation");

    await waitFor(() => existsSync(finishedMarker), 3_000);
    await waitFor(() => !processGroupIsAlive(firstChildProcessGroupId), 3_000);
    firstChildProcessGroupId = null;
    const [secondCode, secondSignal] = await once(second, "exit");
    assert.deepEqual({ code: secondCode, signal: secondSignal }, { code: 0, signal: null }, second.errors);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    assert.deepEqual(readdirSync(lock.lockRoot), [], "durable crash recovery must remove only its token-bound state");
  } finally {
    for (const wrapper of [first, second]) {
      if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    }
    if (firstChildProcessGroupId && processGroupIsAlive(firstChildProcessGroupId)) {
      process.kill(-firstChildProcessGroupId, "SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("macOS process-birth identity stays stable across owner and contender locale and timezone", {
  skip: process.platform !== "darwin"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "locale-sensitive-ps.mjs");
  const finishedMarker = path.join(cwd, "locale-owner-child-finished");
  let first;
  let contender;
  let childProcessGroupId = null;

  try {
    writeFileSync(preloadPath, [
      'import childProcess from "node:child_process"',
      'import { syncBuiltinESMExports } from "node:module"',
      'const originalExecFileSync = childProcess.execFileSync.bind(childProcess)',
      'childProcess.execFileSync = (file, args, options) => {',
      '  if (file !== "/bin/ps") return originalExecFileSync(file, args, options)',
      '  const effectiveEnv = options?.env ?? process.env',
      '  return `${effectiveEnv.LC_ALL ?? ""}|${effectiveEnv.LANG ?? ""}|${effectiveEnv.LANGUAGE ?? ""}|${effectiveEnv.TZ ?? ""}|synthetic-start`',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));
    const preloadOption = `--import=${pathToFileURL(preloadPath).href}`;
    const nodeOptions = [process.env.NODE_OPTIONS, preloadOption].filter(Boolean).join(" ");
    const ownerScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "locale owner active mutation\\n")',
      'process.stdout.write(`locale-owner-pgid:${process.pid}\\n`)',
      `setTimeout(() => { require("node:fs").writeFileSync(${JSON.stringify(finishedMarker)}, "done\\n"); process.exit(0) }, 900)`
    ].join(";");
    first = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", ownerScript], {
      cwd,
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        LC_ALL: "zh_CN.UTF-8",
        LANG: "zh_CN.UTF-8",
        LANGUAGE: "zh_CN.UTF-8",
        TZ: "Asia/Hong_Kong",
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    first.stdout.setEncoding("utf8");
    first.stderr.setEncoding("utf8");
    first.output = "";
    first.errors = "";
    first.stdout.on("data", (chunk) => {
      first.output += chunk;
      const match = /locale-owner-pgid:(\d+)/u.exec(first.output);
      if (match) childProcessGroupId = Number(match[1]);
    });
    first.stderr.on("data", (chunk) => { first.errors += chunk; });

    await waitFor(() => Number.isSafeInteger(childProcessGroupId), 3_000);
    childProcessGroupId = persistedChildProcessGroupId(lock.lockRoot) ?? childProcessGroupId;
    first.kill("SIGKILL");
    assert.deepEqual(await once(first, "exit"), [null, "SIGKILL"]);
    assert.equal(processGroupIsAlive(childProcessGroupId), true);

    const contenderScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "unsafe locale contender mutation\\n")',
      'process.stdout.write("locale-contender-entered\\n")',
      "process.exit(0)"
    ].join(";");
    contender = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", contenderScript], {
      cwd,
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        LC_ALL: "C",
        LANG: "C",
        LANGUAGE: "C",
        TZ: "UTC",
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    contender.stdout.setEncoding("utf8");
    contender.stderr.setEncoding("utf8");
    contender.output = "";
    contender.errors = "";
    contender.stdout.on("data", (chunk) => { contender.output += chunk; });
    contender.stderr.on("data", (chunk) => { contender.errors += chunk; });

    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(existsSync(finishedMarker), false, "the differently localized owner group must still be active");
    assert.equal(
      contender.output.includes("locale-contender-entered\n"),
      false,
      "locale and timezone changes must not look like a recycled live PGID"
    );

    await waitFor(() => existsSync(finishedMarker), 3_000);
    await waitFor(() => !processGroupIsAlive(childProcessGroupId), 3_000);
    childProcessGroupId = null;
    assert.deepEqual(await once(contender, "exit"), [0, null], contender.errors);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    for (const wrapper of [first, contender]) {
      if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    }
    if (childProcessGroupId && processGroupIsAlive(childProcessGroupId)) {
      process.kill(-childProcessGroupId, "SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a stale child heartbeat cannot admit a contender while an identity-unknown process group survives", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  let first;
  let contender;
  let childProcessGroupId = null;
  let directChildPid = null;
  let grandchildPid = null;

  try {
    const grandchildScript = [
      'process.on("SIGTERM", () => {})',
      "setInterval(() => {}, 1000)"
    ].join(";");
    const childScript = [
      'const { spawn } = require("node:child_process")',
      'process.on("SIGTERM", () => {})',
      `const grandchild = spawn(process.execPath, ["-e", ${JSON.stringify(grandchildScript)}], { stdio: "ignore" })`,
      'require("node:fs").writeFileSync("next-env.d.ts", "leader-gone active mutation\\n")',
      'process.stdout.write(`leader-gone-ready:${process.pid}:${grandchild.pid}\\n`)',
      "setInterval(() => {}, 1000)"
    ].join(";");
    first = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    first.stdout.setEncoding("utf8");
    first.stderr.setEncoding("utf8");
    first.output = "";
    first.errors = "";
    first.stdout.on("data", (chunk) => {
      first.output += chunk;
      const match = /leader-gone-ready:(\d+):(\d+)/u.exec(first.output);
      if (match) {
        directChildPid = Number(match[1]);
        grandchildPid = Number(match[2]);
      }
    });
    first.stderr.on("data", (chunk) => { first.errors += chunk; });

    await waitFor(() => first.output.includes("leader-gone-ready:"), 3_000);
    childProcessGroupId = persistedChildProcessGroupId(lock.lockRoot);
    assert.ok(Number.isSafeInteger(childProcessGroupId));
    first.kill("SIGKILL");
    assert.deepEqual(await once(first, "exit"), [null, "SIGKILL"]);
    assert.equal(processGroupIsAlive(childProcessGroupId), true);

    // Kill only the detached gate leader, never the negative process group.
    // The direct command and grandchild intentionally remain in its PGID.
    process.kill(childProcessGroupId, "SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(processGroupIsAlive(childProcessGroupId), true, "the leaderless fixture group must still be active");

    const contenderScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "unsafe contender mutation\\n")',
      'process.stdout.write("leader-gone-contender-entered\\n")',
      "process.exit(0)"
    ].join(";");
    contender = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", contenderScript], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    contender.stdout.setEncoding("utf8");
    contender.stderr.setEncoding("utf8");
    contender.output = "";
    contender.errors = "";
    contender.stdout.on("data", (chunk) => { contender.output += chunk; });
    contender.stderr.on("data", (chunk) => { contender.errors += chunk; });

    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.equal(
      contender.output.includes("leader-gone-contender-entered\n"),
      false,
      "an identity-unknown live PGID must remain fail-closed after its heartbeat expires"
    );
    assert.equal(existsSync(lock.lockPath), true, "the canonical main lock must remain the recovery barrier");
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), "leader-gone active mutation\n");

    contender.kill("SIGKILL");
    assert.deepEqual(await once(contender, "exit"), [null, "SIGKILL"]);
    for (const processId of [directChildPid, grandchildPid]) {
      try {
        if (processId) process.kill(processId, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
  } finally {
    for (const wrapper of [first, contender]) {
      if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    }
    for (const processId of [directChildPid, grandchildPid]) {
      try {
        if (processId) process.kill(processId, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a lease heartbeat failure stops the child group and restores before failing", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "fail-heartbeat.mjs");
  let wrapper;
  let childProcessGroupId = null;

  try {
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import { syncBuiltinESMExports } from "node:module"',
      'fs.futimesSync = () => { const error = new Error("synthetic heartbeat EIO"); error.code = "EIO"; throw error }',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));
    const childScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "heartbeat mutation\\n")',
      'process.stdout.write(`heartbeat-child-pgid:${process.pid}\\n`)',
      "setInterval(() => {}, 1000)"
    ].join(";");
    wrapper = spawn(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", process.execPath, "-e", childScript],
      { cwd, stdio: ["ignore", "pipe", "pipe"] }
    );
    wrapper.stdout.setEncoding("utf8");
    wrapper.stderr.setEncoding("utf8");
    wrapper.output = "";
    wrapper.errors = "";
    wrapper.stdout.on("data", (chunk) => {
      wrapper.output += chunk;
      const match = /heartbeat-child-pgid:(\d+)/u.exec(wrapper.output);
      if (match) childProcessGroupId = Number(match[1]);
    });
    wrapper.stderr.on("data", (chunk) => { wrapper.errors += chunk; });
    await waitFor(() => Number.isSafeInteger(childProcessGroupId), 3_000);
    childProcessGroupId = persistedChildProcessGroupId(lock.lockRoot) ?? childProcessGroupId;

    const outcome = await Promise.race([
      once(wrapper, "exit"),
      new Promise((resolve) => setTimeout(() => resolve(["timeout", "timeout"]), 2_000))
    ]);
    assert.notDeepEqual(outcome, ["timeout", "timeout"], "heartbeat failure must enter the wrapper control flow");
    assert.deepEqual(outcome, [1, null], wrapper.errors);
    assert.match(wrapper.errors, /heartbeat|synthetic heartbeat EIO/u);
    assert.equal(processGroupIsAlive(childProcessGroupId), false);
    childProcessGroupId = null;
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    if (childProcessGroupId && processGroupIsAlive(childProcessGroupId)) {
      process.kill(-childProcessGroupId, "SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a child-gate heartbeat failure reaps its full orphaned process group after the wrapper is SIGKILLed", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const heartbeatFailureMarker = path.join(cwd, "fail-child-gate-heartbeat");
  const preloadPath = path.join(cwd, "fail-child-gate-heartbeat.mjs");
  let wrapper;
  let childProcessGroupId = null;

  try {
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import { syncBuiltinESMExports } from "node:module"',
      `const failureMarker = ${JSON.stringify(heartbeatFailureMarker)}`,
      'if (process.argv.includes("--child-gate")) {',
      '  const originalFutimesSync = fs.futimesSync',
      '  fs.futimesSync = (...args) => {',
      '    if (fs.existsSync(failureMarker)) {',
      '      const error = new Error("synthetic orphan child-gate heartbeat EIO")',
      '      error.code = "EIO"',
      '      throw error',
      '    }',
      '    return originalFutimesSync(...args)',
      '  }',
      '  syncBuiltinESMExports()',
      '}',
      ""
    ].join("\n"));
    const grandchildScript = [
      'process.on("SIGTERM", () => {})',
      'setInterval(() => {}, 1000)'
    ].join(";");
    const childScript = [
      'const { spawn } = require("node:child_process")',
      `const grandchild = spawn(process.execPath, ["-e", ${JSON.stringify(grandchildScript)}], { stdio: "ignore" })`,
      'require("node:fs").writeFileSync("next-env.d.ts", "orphan heartbeat mutation\\n")',
      'process.stdout.write(`orphan-heartbeat-ready:${process.pid}:${grandchild.pid}\\n`)',
      'setInterval(() => {}, 1000)'
    ].join(";");
    wrapper = spawn(process.execPath, [wrapperPath, "--", process.execPath, "-e", childScript], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500",
        NODE_OPTIONS: `--import=${pathToFileURL(preloadPath).href}`
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    wrapper.stdout.setEncoding("utf8");
    wrapper.stderr.setEncoding("utf8");
    wrapper.output = "";
    wrapper.errors = "";
    wrapper.stdout.on("data", (chunk) => { wrapper.output += chunk; });
    wrapper.stderr.on("data", (chunk) => { wrapper.errors += chunk; });

    await waitFor(() => wrapper.output.includes("orphan-heartbeat-ready:"), 3_000);
    childProcessGroupId = persistedChildProcessGroupId(lock.lockRoot);
    assert.ok(Number.isSafeInteger(childProcessGroupId));
    assert.equal(processGroupIsAlive(childProcessGroupId), true);

    wrapper.kill("SIGKILL");
    const [wrapperCode, wrapperSignal] = await once(wrapper, "exit");
    assert.deepEqual({ code: wrapperCode, signal: wrapperSignal }, { code: null, signal: "SIGKILL" });
    writeFileSync(heartbeatFailureMarker, "fail\n");

    await waitFor(() => !processGroupIsAlive(childProcessGroupId), 2_000);
    childProcessGroupId = null;

    const [command, ...args] = mutatingChild(0);
    const contender = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500"
      },
      encoding: "utf8",
      timeout: 5_000
    });
    assert.equal(contender.status, 0, `${contender.stdout}\n${contender.stderr}`);
    assert.equal(contender.signal, null, `${contender.stdout}\n${contender.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    assert.deepEqual(readdirSync(lock.lockRoot), []);
  } finally {
    if (wrapper?.exitCode === null && wrapper?.signalCode === null) wrapper.kill("SIGKILL");
    if (childProcessGroupId && processGroupIsAlive(childProcessGroupId)) {
      process.kill(-childProcessGroupId, "SIGKILL");
    }
    cleanupLockFixture(cwd);
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

test("a crash during snapshot-state publish leaves no partial final state and its exact temp is recovered", {
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
          MAIS_NEXT_ENV_RESTORE_TEST_CRASH_AFTER_SNAPSHOT_TEMP_OPEN: "1"
        },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );

    assert.equal(crashed.status, null, `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(crashed.signal, "SIGKILL", `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(existsSync(lock.lockPath), true, "the complete main lock is published before snapshot state");
    const stateNames = readdirSync(lock.lockRoot).filter((name) => name.includes(".snapshot"));
    assert.equal(stateNames.filter((name) => name.includes(".publish-")).length, 1);
    assert.equal(stateNames.filter((name) => !name.includes(".publish-")).length, 0, "partial state must never occupy its final name");
    assert.equal(statSync(path.join(lock.lockRoot, stateNames[0])).size, 0);

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
    assert.deepEqual(readdirSync(lock.lockRoot), [], "only the exact crashed state temp should be removed");
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a release crash after the main-lock rename cannot strand an unrestored next-env snapshot", {
  skip: process.platform === "win32"
}, () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "crash-after-main-release-rename.mjs");
  const leaseOrderFailureMarker = path.join(cwd, "main-renamed-before-lease-cleanup");
  try {
    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import path from "node:path"',
      'import { syncBuiltinESMExports } from "node:module"',
      'const originalRename = fs.renameSync.bind(fs)',
      'const target = path.resolve(process.env.MAIS_TEST_LOCK_PATH)',
      'fs.renameSync = (from, to) => {',
      '  const metadata = path.resolve(String(from)) === target',
      '    ? JSON.parse(fs.readFileSync(from, "utf8"))',
      '    : null',
      '  const result = originalRename(from, to)',
      '  if (path.resolve(String(from)) === target && path.basename(String(to)).includes(".quarantine-release-")) {',
      '    const leasePath = path.join(path.dirname(target), metadata.leaseName)',
      '    if (fs.existsSync(leasePath)) fs.writeFileSync(process.env.MAIS_TEST_LEASE_ORDER_FAILURE, "lease still present\\n")',
      '    process.kill(process.pid, "SIGKILL")',
      '  }',
      '  return result',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));

    const [command, ...args] = mutatingChild(0);
    const crashed = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", command, ...args],
      {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_TEST_LOCK_PATH: lock.lockPath,
          MAIS_TEST_LEASE_ORDER_FAILURE: leaseOrderFailureMarker
        },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );
    assert.equal(crashed.status, null, `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(crashed.signal, "SIGKILL", `${crashed.stdout}\n${crashed.stderr}`);
    assert.equal(
      readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"),
      originalNextEnv,
      "the durable snapshot must be restored before the canonical main lock can be renamed away"
    );
    assert.equal(
      existsSync(leaseOrderFailureMarker),
      false,
      "the canonical lease must be removed before the canonical main lock is renamed away"
    );

    const recovered = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 3_000,
      killSignal: "SIGKILL"
    });
    assert.equal(recovered.status, 0, `${recovered.stdout}\n${recovered.stderr}`);
    assert.equal(recovered.signal, null, `${recovered.stdout}\n${recovered.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a stale-recovery crash after the main-lock rename cannot admit an unrestored third owner", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "crash-after-stale-main-rename.mjs");
  let abandonedWrapper;
  let abandonedProcessGroupId = null;
  try {
    const abandonedScript = [
      'require("node:fs").writeFileSync("next-env.d.ts", "abandoned stale mutation\\n")',
      'process.stdout.write(`stale-release-ready:${process.pid}\\n`)',
      "setTimeout(() => process.exit(0), 350)"
    ].join(";");
    abandonedWrapper = spawn(
      process.execPath,
      [wrapperPath, "--", process.execPath, "-e", abandonedScript],
      {
        cwd,
        env: { ...process.env, MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500" },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    abandonedWrapper.stdout.setEncoding("utf8");
    abandonedWrapper.stderr.setEncoding("utf8");
    abandonedWrapper.output = "";
    abandonedWrapper.errors = "";
    abandonedWrapper.stdout.on("data", (chunk) => { abandonedWrapper.output += chunk; });
    abandonedWrapper.stderr.on("data", (chunk) => { abandonedWrapper.errors += chunk; });
    await waitFor(() => abandonedWrapper.output.includes("stale-release-ready:"), 3_000);
    abandonedProcessGroupId = persistedChildProcessGroupId(lock.lockRoot);
    assert.ok(Number.isSafeInteger(abandonedProcessGroupId));
    abandonedWrapper.kill("SIGKILL");
    assert.deepEqual(await once(abandonedWrapper, "exit"), [null, "SIGKILL"]);
    await waitFor(() => !processGroupIsAlive(abandonedProcessGroupId), 3_000);
    abandonedProcessGroupId = null;

    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import path from "node:path"',
      'import { syncBuiltinESMExports } from "node:module"',
      'const originalRename = fs.renameSync.bind(fs)',
      'const target = path.resolve(process.env.MAIS_TEST_LOCK_PATH)',
      'fs.renameSync = (from, to) => {',
      '  const result = originalRename(from, to)',
      '  if (path.resolve(String(from)) === target && path.basename(String(to)).includes(".quarantine-stale-main-")) {',
      '    process.kill(process.pid, "SIGKILL")',
      '  }',
      '  return result',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));

    const [command, ...args] = mutatingChild(0);
    const crashedRecovery = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", command, ...args],
      {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500",
          MAIS_TEST_LOCK_PATH: lock.lockPath
        },
        timeout: 3_000,
        killSignal: "SIGKILL"
      }
    );
    assert.equal(crashedRecovery.status, null, `${crashedRecovery.stdout}\n${crashedRecovery.stderr}`);
    assert.equal(crashedRecovery.signal, "SIGKILL", `${crashedRecovery.stdout}\n${crashedRecovery.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);

    const thirdOwner = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      env: { ...process.env, MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: "500" },
      encoding: "utf8",
      timeout: 3_000,
      killSignal: "SIGKILL"
    });
    assert.equal(thirdOwner.status, 0, `${thirdOwner.stdout}\n${thirdOwner.stderr}`);
    assert.equal(thirdOwner.signal, null, `${thirdOwner.stdout}\n${thirdOwner.stderr}`);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    if (abandonedWrapper?.exitCode === null && abandonedWrapper?.signalCode === null) {
      abandonedWrapper.kill("SIGKILL");
    }
    if (abandonedProcessGroupId && processGroupIsAlive(abandonedProcessGroupId)) {
      process.kill(-abandonedProcessGroupId, "SIGKILL");
    }
    cleanupLockFixture(cwd);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("two contenders can race to clean one crashed publish inode without failing or double-owning the lock", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  const preloadPath = path.join(cwd, "orphan-cleanup-barrier.mjs");
  let first;
  let second;

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
    assert.equal(crashed.signal, "SIGKILL", `${crashed.stdout}\n${crashed.stderr}`);
    const [orphanName] = readdirSync(lock.lockRoot).filter((name) => name.includes(".publish-"));
    assert.ok(orphanName, "the crash fixture must leave one publish inode");
    const orphanPath = path.join(lock.lockRoot, orphanName);

    writeFileSync(preloadPath, [
      'import fs from "node:fs"',
      'import path from "node:path"',
      'import { syncBuiltinESMExports } from "node:module"',
      'const originalUnlink = fs.unlinkSync.bind(fs)',
      'const target = path.resolve(process.env.MAIS_TEST_ORPHAN_PATH)',
      'const barrierRoot = path.resolve(process.env.MAIS_TEST_BARRIER_ROOT)',
      'let waited = false',
      'fs.unlinkSync = (value) => {',
      '  if (!waited && path.resolve(String(value)) === target) {',
      '    waited = true',
      '    fs.writeFileSync(path.join(barrierRoot, `ready-${process.pid}`), "ready\\n")',
      '    const deadline = Date.now() + 3000',
      '    while (fs.readdirSync(barrierRoot).filter((name) => name.startsWith("ready-")).length < 2) {',
      '      if (Date.now() >= deadline) throw new Error("orphan cleanup barrier timed out")',
      '      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)',
      '    }',
      '  }',
      '  return originalUnlink(value)',
      '}',
      'syncBuiltinESMExports()',
      ""
    ].join("\n"));

    const startContender = (label) => {
      const childScript = [
        `require("node:fs").writeFileSync("next-env.d.ts", ${JSON.stringify(`${label} mutation\n`)})`,
        `process.stdout.write(${JSON.stringify(`${label}-entered\n`)})`,
        "setTimeout(() => process.exit(0), 120)"
      ].join(";");
      const contender = spawn(
        process.execPath,
        ["--import", pathToFileURL(preloadPath).href, wrapperPath, "--", process.execPath, "-e", childScript],
        {
          cwd,
          env: {
            ...process.env,
            MAIS_TEST_ORPHAN_PATH: orphanPath,
            MAIS_TEST_BARRIER_ROOT: cwd
          },
          stdio: ["ignore", "pipe", "pipe"]
        }
      );
      contender.stdout.setEncoding("utf8");
      contender.stderr.setEncoding("utf8");
      contender.output = "";
      contender.errors = "";
      contender.stdout.on("data", (chunk) => { contender.output += chunk; });
      contender.stderr.on("data", (chunk) => { contender.errors += chunk; });
      return contender;
    };

    first = startContender("first");
    second = startContender("second");
    const [[firstCode, firstSignal], [secondCode, secondSignal]] = await Promise.all([
      once(first, "exit"),
      once(second, "exit")
    ]);

    assert.deepEqual({ code: firstCode, signal: firstSignal }, { code: 0, signal: null }, first.errors);
    assert.deepEqual({ code: secondCode, signal: secondSignal }, { code: 0, signal: null }, second.errors);
    assert.match(first.output, /first-entered/u);
    assert.match(second.output, /second-entered/u);
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
    assert.deepEqual(
      readdirSync(lock.lockRoot),
      [],
      "the orphan and both exact token-bound lock states must be removed"
    );
  } finally {
    for (const contender of [first, second]) {
      if (contender?.exitCode === null && contender?.signalCode === null) contender.kill("SIGKILL");
    }
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

test("a live recycled child PGID with the wrong process-birth identity is recovered without killing it", {
  skip: process.platform === "win32"
}, async () => {
  const cwd = createFixture();
  const lock = nextEnvLockPaths(cwd);
  let decoy;
  try {
    decoy = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      detached: true,
      stdio: "ignore"
    });
    assert.ok(decoy.pid);
    await waitFor(() => processGroupIsAlive(decoy.pid), 1_000);

    mkdirSync(lock.lockRoot, { recursive: true, mode: 0o700 });
    const stalePid = 2_147_483_647;
    const token = "33333333-3333-4333-8333-333333333333";
    const leaseName = `.next-env-restore.lock.lease-${stalePid}-${token}`;
    const snapshotName = `.next-env-restore.lock.snapshot-${stalePid}-${token}`;
    const childName = `.next-env-restore.lock.child-${stalePid}-${token}`;
    const leasePath = path.join(lock.lockRoot, leaseName);
    writeFileSync(leasePath, `${token}\n`, { mode: 0o600 });
    const leaseStat = statSync(leasePath);
    const expiredAt = new Date(Date.now() - 20_000);
    utimesSync(leasePath, expiredAt, expiredAt);
    writeFileSync(path.join(lock.lockRoot, snapshotName), `${JSON.stringify({
      version: 1,
      kind: "snapshot",
      token,
      canonicalCwd: realpathSync(cwd),
      existed: true,
      contentsBase64: Buffer.from(originalNextEnv).toString("base64"),
      mode: 0o644
    })}\n`, { mode: 0o600 });
    writeFileSync(path.join(lock.lockRoot, childName), `${JSON.stringify({
      version: 1,
      kind: "child",
      token,
      canonicalCwd: realpathSync(cwd),
      processGroupId: decoy.pid,
      processBirthIdentity: `sha256:${"0".repeat(64)}`,
      createdAt: new Date().toISOString()
    })}\n`, { mode: 0o600 });
    writeFileSync(lock.lockPath, JSON.stringify({
      version: 2,
      role: "main",
      pid: stalePid,
      token,
      leaseName,
      leaseDevice: String(leaseStat.dev),
      leaseInode: String(leaseStat.ino),
      canonicalCwd: realpathSync(cwd),
      createdAt: "2026-01-01T00:00:00.000Z",
      snapshotName,
      childName
    }), { mode: 0o600 });

    // Keep a wide separation between normal process-startup noise and the
    // stale-heartbeat window. A busy CI runner can take more than 450ms merely
    // to spawn the wrapper; an implementation that actually waits for this
    // four-second lease must still fail the two-second recovery budget.
    const recycledLockLeaseTimeoutMs = 4_000;
    const immediateRecoveryBudgetMs = 2_000;
    const startedAt = Date.now();
    const [command, ...args] = mutatingChild(0);
    const recovered = spawnSync(process.execPath, [wrapperPath, "--", command, ...args], {
      cwd,
      env: {
        ...process.env,
        MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS: String(recycledLockLeaseTimeoutMs)
      },
      encoding: "utf8",
      timeout: 5_000,
      killSignal: "SIGKILL"
    });
    assert.equal(recovered.status, 0, `${recovered.stdout}\n${recovered.stderr}`);
    assert.equal(recovered.signal, null, `${recovered.stdout}\n${recovered.stderr}`);
    const elapsedMs = Date.now() - startedAt;
    assert.ok(
      elapsedMs < immediateRecoveryBudgetMs,
      `wrong process-birth identity must not hold the lock for a stale heartbeat window (${elapsedMs}ms >= ${immediateRecoveryBudgetMs}ms; lease ${recycledLockLeaseTimeoutMs}ms)`
    );
    assert.equal(processGroupIsAlive(decoy.pid), true, "a recycled, unrelated process group must never be killed");
    assert.equal(readFileSync(path.join(cwd, "next-env.d.ts"), "utf8"), originalNextEnv);
  } finally {
    if (decoy?.pid && decoy.exitCode === null && decoy.signalCode === null) {
      process.kill(-decoy.pid, "SIGKILL");
    }
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
    if (webServer?.pid && webServer.exitCode === null && webServer.signalCode === null) {
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
