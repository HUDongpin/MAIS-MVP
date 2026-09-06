import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./run-sacrificial-dry-run.mjs", import.meta.url));
const sourceDirectory = path.dirname(scriptPath);

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-rsi-lite-dry-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function waitForPath(filePath, timeoutMilliseconds = 3_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

test("CLI requires an external attempt root and commits one four-receipt attempt", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    scriptPath,
    "--output-root", outputRoot,
    "--attempt-id", "cli-attempt-001"
  ]);

  assert.equal(stderr, "");
  assert.match(stdout, /offline-deterministic/);
  assert.match(stdout, /cli-attempt-001/);
  const attemptDirectory = path.join(outputRoot, "attempts", "cli-attempt-001");
  const summary = JSON.parse(await readFile(path.join(attemptDirectory, "summary.json"), "utf8"));
  const runtime = JSON.parse(await readFile(path.join(attemptDirectory, "runtime-observation.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(attemptDirectory, "commit-manifest.json"), "utf8"));
  assert.equal(summary.receiptCount, 4);
  assert.equal(summary.formalExecutionAuthorized, false);
  assert.equal(runtime.executionMode, "offline-deterministic");
  assert.equal(runtime.providerCalls, 0);
  assert.ok(runtime.observedRoleExecutionMilliseconds >= 0);
  assert.equal(manifest.complete, true);
  assert.ok(manifest.files.some((row) => row.path === "runtime-observation.json"));
});

test("CLI rejects formal, live-provider, production, deploy, legacy fixed-output, missing-output, and source-tree targets", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const cases = [
    ["--output-root", outputRoot, "--attempt-id", "forbidden-formal", "--formal-run"],
    ["--output-root", outputRoot, "--attempt-id", "forbidden-live", "--live-provider"],
    ["--output-root", outputRoot, "--attempt-id", "forbidden-production", "--production"],
    ["--output-root", outputRoot, "--attempt-id", "forbidden-deploy", "--deploy"],
    ["--output-dir", outputRoot],
    ["--attempt-id", "missing-root"],
    ["--output-root", sourceDirectory, "--attempt-id", "source-target"]
  ];

  for (const args of cases) {
    await assert.rejects(
      execFileAsync(process.execPath, [scriptPath, ...args]),
      (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /not authorized|requires|external temporary root|legacy/i);
        return true;
      }
    );
  }
});

test("SIGTERM during staging leaves an explicit aborted tombstone and no active lock, staging directory, or committed attempt", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const attemptId = "sigterm-attempt-001";
  const child = spawn(process.execPath, [
    scriptPath,
    "--output-root", outputRoot,
    "--attempt-id", attemptId,
    "--test-hold-before-commit-ms", "5000"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  await waitForPath(path.join(outputRoot, ".reservations", `${attemptId}.lock`));
  child.kill("SIGTERM");
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  assert.equal(result.signal, "SIGTERM");
  await assert.rejects(access(path.join(outputRoot, "attempts", attemptId)));
  await assert.rejects(access(path.join(outputRoot, ".reservations", `${attemptId}.lock`)));
  const aborted = JSON.parse(await readFile(path.join(outputRoot, ".reservations", `${attemptId}.aborted.json`), "utf8"));
  assert.equal(aborted.attemptId, attemptId);
  assert.equal(aborted.status, "aborted-before-commit");
  assert.equal(aborted.formalExecutionAuthorized, false);
  assert.equal((await readdir(path.join(outputRoot, ".staging"))).some((name) => name.startsWith(`${attemptId}-`)), false);

  await assert.rejects(
    execFileAsync(process.execPath, [scriptPath, "--output-root", outputRoot, "--attempt-id", attemptId]),
    (error) => error.code === 1 && /already reserved/.test(error.stderr)
  );
  const retryId = "sigterm-attempt-002";
  const retry = await execFileAsync(process.execPath, [scriptPath, "--output-root", outputRoot, "--attempt-id", retryId]);
  assert.match(retry.stdout, new RegExp(retryId));
});
