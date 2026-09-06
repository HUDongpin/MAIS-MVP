import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SACRIFICIAL_FIXTURE_SHA256,
  buildSacrificialBundle,
  canonicalSha256,
  runAllSacrificialArms,
  runSacrificialArm,
  validateSacrificialAttempt,
  validateSacrificialReceipt,
  writeSacrificialArtifacts,
  writeSacrificialAttempt
} from "./sacrificial-runner.mjs";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-rsi-lite-dry-run-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function resign(receipt) {
  const clone = structuredClone(receipt);
  delete clone.receiptSha256;
  return { ...clone, receiptSha256: canonicalSha256(clone) };
}

test("builds one commitment-bound tri-locale sacrificial fixture outside the formal sample", async () => {
  const bundle = buildSacrificialBundle();

  assert.equal(bundle.sacrificial, true);
  assert.equal(bundle.status, "candidate-only");
  assert.equal(bundle.formalSample, false);
  assert.equal(bundle.questions.length, 24);
  assert.equal(bundle.lessons.length, 2);
  assert.equal(bundle.browserRoutes.length, 0);
  assert.equal(canonicalSha256(bundle), SACRIFICIAL_FIXTURE_SHA256);
  assert.ok(bundle.questions.every((row) => row.prompt.en && row.prompt.zh && row.prompt.zhHans));

  const tampered = structuredClone(bundle);
  tampered.lessons.pop();
  await assert.rejects(runSacrificialArm({ arm: "A", bundle: tampered }), /fixture commitment/);
});

test("runs A B C0 C in deterministic no-charge mode with semantically valid receipts", async () => {
  const bundle = buildSacrificialBundle();
  const receipts = await runAllSacrificialArms(bundle);

  assert.deepEqual(receipts.map((row) => row.arm), ["A", "B", "C0", "C"]);
  for (const receipt of receipts) {
    assert.equal(receipt.protocolVersion, "1.1.1-f2-r");
    assert.equal(receipt.executionMode, "offline-deterministic");
    assert.equal(receipt.formalExecutionAuthorized, false);
    assert.equal(receipt.liveProviderCalibrated, false);
    assert.equal(receipt.resourceUsage.providerCalls, 0);
    assert.equal(receipt.resourceUsage.apiCost, 0);
    assert.equal(receipt.coverage.requiredSurfaces, 26);
    assert.equal(receipt.coverage.inspectedSurfaces, 26);
    assert.equal(receipt.surfaceResults.length, 26);
    assert.equal(new Set(receipt.surfaceResults.map((row) => row.surfaceId)).size, 26);
    assert.equal(receipt.surfaceResults.filter((row) => row.surfaceKind === "lesson").length, 2);
    assert.deepEqual(validateSacrificialReceipt(receipt, bundle), []);
  }

  assert.ok(receipts.find((row) => row.arm === "A").findings.length < receipts.find((row) => row.arm === "B").findings.length);
  assert.equal(receipts.find((row) => row.arm === "C0").findings.length, receipts.find((row) => row.arm === "C").findings.length);
});

test("executes C0 serially and C through isolated child processes with equal role tasks", async () => {
  const bundle = buildSacrificialBundle();
  const [c0, c] = await Promise.all(["C0", "C"].map((arm) => runSacrificialArm({ arm, bundle })));

  assert.deepEqual(c0.roleContract.roles, c.roleContract.roles);
  assert.deepEqual(c0.roleContract.roleTasks, c.roleContract.roleTasks);
  assert.deepEqual(c0.roleContract.toolCaps, c.roleContract.toolCaps);
  assert.equal(c0.roleContract.writerCount, 1);
  assert.equal(c.roleContract.writerCount, 1);
  assert.equal(c0.roleContract.topology, "serial-shared-state");
  assert.equal(c.roleContract.topology, "isolated-child-process-roles");
  assert.ok(c0.roleExecutions.every((row) => row.executionBoundary === "serial-shared-state"));
  assert.ok(c.roleExecutions.every((row) => row.executionBoundary === "child-process"));
  assert.equal(c0.roleExecutions.length, 5);
  assert.equal(c.roleExecutions.length, 5);
  assert.equal(c0.materialResultSha256, c.materialResultSha256);
});

test("refuses a non-sacrificial package and an unknown arm", async () => {
  const bundle = buildSacrificialBundle();
  await assert.rejects(runSacrificialArm({ arm: "D", bundle }), /Unknown arm/);
  await assert.rejects(runSacrificialArm({ arm: "A", bundle: { ...bundle, sacrificial: false } }), /fixture commitment/);
});

test("rejects semantically tampered receipts even after an attacker recomputes the self-hash", async () => {
  const bundle = buildSacrificialBundle();
  const original = await runSacrificialArm({ arm: "C", bundle });
  const attacks = [];

  const staleMaterial = structuredClone(original);
  staleMaterial.findings.shift();
  attacks.push(["material-result-hash", resign(staleMaterial)]);

  const falseComplete = structuredClone(original);
  falseComplete.completionClaim = { state: "candidate-complete", formalCompletionClaim: true, openP0: 0, openP1: 0 };
  attacks.push(["completion-claim", resign(falseComplete)]);

  const roleDrift = structuredClone(original);
  roleDrift.roleContract.roles = ["invented-role"];
  roleDrift.roleContract.writerCount = 9;
  attacks.push(["role-contract", resign(roleDrift)]);

  const duplicateSurface = structuredClone(original);
  duplicateSurface.surfaceResults[0] = structuredClone(duplicateSurface.surfaceResults[1]);
  attacks.push(["surface-topology", resign(duplicateSurface)]);

  const fakeBaseline = structuredClone(original);
  fakeBaseline.sourceBaseline = "fake-baseline";
  attacks.push(["source-baseline", resign(fakeBaseline)]);

  for (const [expectedCode, receipt] of attacks) {
    const findings = validateSacrificialReceipt(receipt, bundle);
    assert.ok(findings.some((row) => row.code === expectedCode), `${expectedCode}: ${JSON.stringify(findings)}`);
  }
});

test("writes four public snapshot receipts atomically without live-provider claims", async (t) => {
  const directory = await temporaryDirectory(t);
  const bundle = buildSacrificialBundle();
  const receipts = await runAllSacrificialArms(bundle);

  const summary = await writeSacrificialArtifacts({ directory, bundle, receipts });

  assert.equal(summary.status, "candidate-only");
  assert.equal(summary.receiptCount, 4);
  assert.equal(summary.formalExecutionAuthorized, false);
  assert.equal(summary.liveProviderCalibrated, false);
  for (const arm of ["A", "B", "C0", "C"]) {
    assert.ok(await readFile(path.join(directory, "sacrificial-receipts", `${arm}.json`), "utf8"));
  }
  const summaryText = await readFile(path.join(directory, "f2-sacrificial-summary.json"), "utf8");
  assert.match(summaryText, /offline-deterministic/);
  assert.doesNotMatch(summaryText, /live-provider-pass/);
});

test("commits attempts atomically, refuses duplicate writers, and validates the commit manifest", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const bundle = buildSacrificialBundle();
  const receipts = await runAllSacrificialArms(bundle);

  const first = await writeSacrificialAttempt({ outputRoot, attemptId: "attempt-001", bundle, receipts });
  assert.equal(first.attemptId, "attempt-001");
  assert.deepEqual(await validateSacrificialAttempt({ attemptDirectory: first.attemptDirectory, bundle }), []);

  await assert.rejects(
    writeSacrificialAttempt({ outputRoot, attemptId: "attempt-001", bundle, receipts }),
    /already reserved/
  );

  const concurrent = await Promise.allSettled([
    writeSacrificialAttempt({ outputRoot, attemptId: "attempt-002", bundle, receipts }),
    writeSacrificialAttempt({ outputRoot, attemptId: "attempt-002", bundle, receipts })
  ]);
  assert.equal(concurrent.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((row) => row.status === "rejected").length, 1);
});

test("never exposes a committed attempt after a pre-commit interruption and permits a new-id retry", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const bundle = buildSacrificialBundle();
  const receipts = await runAllSacrificialArms(bundle);

  await assert.rejects(
    writeSacrificialAttempt({
      outputRoot,
      attemptId: "interrupted-001",
      bundle,
      receipts,
      beforeCommit: async () => {
        throw new Error("synthetic interruption");
      }
    }),
    /synthetic interruption/
  );
  await assert.rejects(access(path.join(outputRoot, "attempts", "interrupted-001")));
  await assert.rejects(access(path.join(outputRoot, ".reservations", "interrupted-001.lock")));
  const aborted = JSON.parse(await readFile(path.join(outputRoot, ".reservations", "interrupted-001.aborted.json"), "utf8"));
  assert.equal(aborted.status, "aborted-before-commit");
  assert.equal((await readdir(path.join(outputRoot, ".staging"))).some((name) => name.startsWith("interrupted-001-")), false);
  await assert.rejects(
    writeSacrificialAttempt({ outputRoot, attemptId: "interrupted-001", bundle, receipts }),
    /already reserved/
  );

  const retry = await writeSacrificialAttempt({ outputRoot, attemptId: "interrupted-002", bundle, receipts });
  assert.deepEqual(await validateSacrificialAttempt({ attemptDirectory: retry.attemptDirectory, bundle }), []);
});
