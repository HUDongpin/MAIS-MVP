import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { createPersistentF3BudgetLedger } from "./f3-persistent-budget-ledger.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const PRICES = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const CAPS = Object.freeze({ providerCallCap: 20, tokenCap: 100_000, currencyCapUsd: 10 });
const BINDING = Object.freeze({
  candidateSetSha256: "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c",
  entrypointReceiptSha256: "a".repeat(64),
  campaignId: "fixture-campaign"
});
const LEDGER_MODULE_URL = new URL("./f3-persistent-budget-ledger.mjs", import.meta.url).href;

const CHILD_WORKER_SOURCE = `
import { existsSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createPersistentF3BudgetLedger } from ${JSON.stringify(LEDGER_MODULE_URL)};

const config = JSON.parse(process.argv[1]);
try {
  if (config.startPath) while (!existsSync(config.startPath)) await delay(5);
  const ledger = createPersistentF3BudgetLedger(config.ledger);
  if (config.statusPath) writeFileSync(config.statusPath, JSON.stringify({ acquired: true }) + "\\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  if (config.mode === "crashed-writer") {
    if (config.reserveBeforeExit) ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
    // Deliberately abandon only this test-owned process's lease, then reap it in the parent.
    process.exit(0);
  } else if (config.mode === "holder") {
    ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
    writeFileSync(config.readyPath, "ready\\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
    while (!existsSync(config.releasePath)) await delay(10);
  } else if (config.mode === "successor") {
    const reservation = ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
    ledger.settleFailure(reservation);
  } else if (config.mode === "stale-stampede") {
    while (!existsSync(config.releasePath)) await delay(5);
  } else if (config.mode !== "contender") {
    throw new Error("unknown fixture worker mode");
  }
  ledger.close();
} catch (error) {
  if (config.statusPath && !existsSync(config.statusPath)) {
    writeFileSync(config.statusPath, JSON.stringify({ acquired: false, rejected: true }) + "\\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  }
  process.stderr.write(String(error?.message ?? error));
  process.exitCode = 23;
}
`;

function startLedgerWorker(config) {
  const child = spawn(process.execPath, ["--input-type=module", "--eval", CHILD_WORKER_SOURCE, JSON.stringify(config)], {
    env: { TMPDIR: os.tmpdir() },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  return { child, completed };
}

async function createAbandonedWriterLease(ledgerConfig, { reserveBeforeExit = false } = {}) {
  const worker = startLedgerWorker({ mode: "crashed-writer", ledger: ledgerConfig, reserveBeforeExit });
  const result = await worker.completed;
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  const lock = JSON.parse(await readFile(`${ledgerConfig.journalPath}.writer.lock`, "utf8"));
  assert.equal(lock.pid, worker.child.pid);
  return lock;
}

async function waitForFile(filePath) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    try {
      await access(filePath);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await delay(10);
    }
  }
  throw new Error(`Timed out waiting for fixture file ${filePath}.`);
}

function committedUsage(providerCalls = 2) {
  return {
    providerCalls,
    promptCacheHitTokens: 20,
    promptCacheMissTokens: 180,
    outputTokens: 40,
    apiCostUsd: 0.0003976,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0
  };
}

test("persists a reservation before provider egress and converts an active reservation to a conservative failure debit after restart", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-persistent-ledger-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  try {
    const first = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 1, tokens: 150, usd: 0.00033 },
      maxUncommittedProviderCalls: 4
    });
    first.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });

    const onDiskBeforeRestart = JSON.parse(await readFile(journalPath, "utf8"));
    assert.equal(onDiskBeforeRestart.activeReservations.length, 1);
    assert.equal(onDiskBeforeRestart.usage.providerCalls, 4);
    assert.equal((await stat(journalPath)).mode & 0o777, 0o600);
    first.close();

    const restarted = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 1, tokens: 150, usd: 0.00033 },
      maxUncommittedProviderCalls: 4
    });
    const audit = restarted.auditSnapshot();
    assert.equal(audit.activeReservations, 0);
    assert.equal(audit.usage.providerCalls, 4);
    assert.equal(audit.committedProviderCalls, 2);
    assert.equal(audit.uncommittedProviderCalls, 2);
    assert.equal(audit.usage.conservativeFailureDebitTokens, 300);
    assert.equal(audit.recoveredActiveReservationCount, 1);
    assert.match(audit.journalSha256, /^[a-f0-9]{64}$/);
    restarted.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("holds an exclusive cross-process writer lease so a second ledger cannot overwrite the first writer", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-writer-lock-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  try {
    const first = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    assert.throws(
      () => createPersistentF3BudgetLedger({
        journalPath,
        binding: BINDING,
        caps: CAPS,
        pricesUsdPerMillion: PRICES,
        committedUsage: committedUsage(),
        priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
        maxUncommittedProviderCalls: 4
      }),
      /active writer lease/i
    );
    first.close();
    const successor = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    successor.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("a real second OS process cannot overwrite an active writer and both accepted reservations remain conservatively accounted", { timeout: 15_000 }, async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-two-process-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  const readyPath = path.join(temporaryRoot, "holder.ready");
  const releasePath = path.join(temporaryRoot, "holder.release");
  const ledgerConfig = {
    journalPath,
    binding: BINDING,
    caps: CAPS,
    pricesUsdPerMillion: PRICES,
    committedUsage: committedUsage(),
    priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
    maxUncommittedProviderCalls: 4
  };
  let holder;
  try {
    holder = startLedgerWorker({ mode: "holder", ledger: ledgerConfig, readyPath, releasePath });
    await waitForFile(readyPath);
    const beforeContention = JSON.parse(await readFile(journalPath, "utf8"));
    assert.equal(beforeContention.usage.providerCalls, 3);
    assert.equal(beforeContention.activeReservations.length, 1);

    const contender = startLedgerWorker({ mode: "contender", ledger: ledgerConfig });
    const contenderResult = await contender.completed;
    assert.equal(contenderResult.code, 23);
    assert.match(contenderResult.stderr, /active writer lease/i);
    const afterRejectedContention = JSON.parse(await readFile(journalPath, "utf8"));
    assert.equal(afterRejectedContention.journalSha256, beforeContention.journalSha256);
    assert.equal(afterRejectedContention.usage.providerCalls, 3);
    assert.equal(afterRejectedContention.activeReservations.length, 1);

    await writeFile(releasePath, "release\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
    const holderResult = await holder.completed;
    assert.equal(holderResult.code, 0, holderResult.stderr);

    const successor = startLedgerWorker({ mode: "successor", ledger: ledgerConfig });
    const successorResult = await successor.completed;
    assert.equal(successorResult.code, 0, successorResult.stderr);
    const finalJournal = JSON.parse(await readFile(journalPath, "utf8"));
    const { journalSha256, ...finalBody } = finalJournal;
    assert.equal(journalSha256, canonicalSha256(finalBody));
    assert.equal(finalJournal.usage.providerCalls, 4);
    assert.equal(finalJournal.activeReservations.length, 0);
    assert.equal(finalJournal.usage.conservativeFailureDebitTokens, 300);
    assert.equal(finalJournal.recoveredActiveReservationCount, 1);
  } finally {
    if (holder && holder.child.exitCode === null && holder.child.signalCode === null) {
      holder.child.kill("SIGTERM");
      await holder.completed;
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("serializes a real OS-process stampede that races to recover one test-owned exited writer lease", { timeout: 60_000 }, async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-stale-stampede-"));
  const contenderCount = 16;
  const rounds = 30;
  try {
    for (let round = 0; round < rounds; round += 1) {
      const roundRoot = path.join(temporaryRoot, `round-${round}`);
      const journalPath = path.join(roundRoot, "ledger.json");
      const startPath = path.join(roundRoot, "start");
      const releasePath = path.join(roundRoot, "release");
      const ledgerConfig = {
        journalPath,
        binding: BINDING,
        caps: CAPS,
        pricesUsdPerMillion: PRICES,
        committedUsage: committedUsage(),
        priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
        maxUncommittedProviderCalls: 4
      };
      await createAbandonedWriterLease(ledgerConfig);

      const statusPaths = Array.from({ length: contenderCount }, (_, index) => path.join(roundRoot, `status-${index}.json`));
      const workers = statusPaths.map((statusPath) => startLedgerWorker({
        mode: "stale-stampede",
        ledger: ledgerConfig,
        startPath,
        releasePath,
        statusPath
      }));
      try {
        await writeFile(startPath, "start\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
        await Promise.all(statusPaths.map((statusPath) => waitForFile(statusPath)));
        const statuses = await Promise.all(statusPaths.map(async (statusPath) => JSON.parse(await readFile(statusPath, "utf8"))));
        assert.equal(
          statuses.filter((row) => row.acquired === true).length,
          1,
          `round ${round} allowed more than one process to acquire the recovered writer lease`
        );
      } finally {
        await writeFile(releasePath, "release\n", { encoding: "utf8", mode: 0o600 }).catch(() => {});
        await Promise.all(workers.map((worker) => worker.completed));
      }
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("fails closed without journal mutation when an acquisition guard is orphaned or ambiguous", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-orphan-guard-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  const guardPath = `${journalPath}.writer.lock.acquire`;
  const ledgerConfig = {
    journalPath,
    binding: BINDING,
    caps: CAPS,
    pricesUsdPerMillion: PRICES,
    committedUsage: committedUsage(),
    priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
    maxUncommittedProviderCalls: 4
  };
  try {
    const initial = createPersistentF3BudgetLedger(ledgerConfig);
    initial.close();
    const before = await readFile(journalPath, "utf8");
    await writeFile(guardPath, "ambiguous-orphan-guard\n", { encoding: "utf8", mode: 0o600, flag: "wx" });

    assert.throws(
      () => createPersistentF3BudgetLedger(ledgerConfig),
      /acquisition guard.*ambiguous/i
    );
    assert.equal(await readFile(journalPath, "utf8"), before);
    assert.equal((await stat(guardPath)).mode & 0o777, 0o600);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("quarantines a test-owned exited writer lease and recovers its active reservation exactly once", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-stale-lock-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  try {
    await createAbandonedWriterLease({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    }, { reserveBeforeExit: true });

    const recovered = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    const audit = recovered.auditSnapshot();
    assert.equal(audit.recoveredActiveReservationCount, 1);
    assert.equal(audit.usage.providerCalls, 3);
    assert.equal(audit.usage.conservativeFailureDebitTokens, 150);
    recovered.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("uses a journal generation compare-and-swap and fails closed on a re-signed out-of-band update", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-ledger-cas-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  try {
    const ledger = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    const stored = JSON.parse(await readFile(journalPath, "utf8"));
    const tamperedBody = { ...stored, generation: stored.generation + 1 };
    delete tamperedBody.journalSha256;
    const tampered = { ...tamperedBody, journalSha256: canonicalSha256(tamperedBody) };
    await writeFile(journalPath, `${JSON.stringify(tampered, null, 2)}\n`, { mode: 0o600 });
    assert.throws(
      () => ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 }),
      /compare-and-swap|generation/i
    );
    ledger.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("mechanically reserves the successful denominator by refusing calls beyond the global uncommitted-call slack", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-overhead-cap-"));
  try {
    const ledger = createPersistentF3BudgetLedger({
      journalPath: path.join(temporaryRoot, "ledger.json"),
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 2, tokens: 300, usd: 0.00066 },
      maxUncommittedProviderCalls: 3
    });
    const reservation = ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
    ledger.settleFailure(reservation);
    assert.throws(
      () => ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 }),
      /uncommitted provider-call slack/i
    );
    ledger.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("reconciles a receipt committed just before process interruption without double-counting provider usage", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-commit-reconcile-"));
  const journalPath = path.join(temporaryRoot, "ledger.json");
  try {
    const ledger = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: committedUsage(),
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    const reservation = ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
    ledger.settleSuccess(reservation, { promptCacheHitTokens: 10, promptCacheMissTokens: 60, completionTokens: 20 });

    const afterCommit = {
      ...committedUsage(3),
      promptCacheHitTokens: 30,
      promptCacheMissTokens: 240,
      outputTokens: 60,
      apiCostUsd: 0.0005512
    };
    ledger.close();
    const restarted = createPersistentF3BudgetLedger({
      journalPath,
      binding: BINDING,
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      committedUsage: afterCommit,
      priorUncommittedDebit: { providerCalls: 0, tokens: 0, usd: 0 },
      maxUncommittedProviderCalls: 4
    });
    assert.equal(restarted.auditSnapshot().committedProviderCalls, 3);
    assert.equal(restarted.auditSnapshot().uncommittedProviderCalls, 0);
    assert.equal(restarted.auditSnapshot().usage.providerCalls, 3);
    restarted.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
