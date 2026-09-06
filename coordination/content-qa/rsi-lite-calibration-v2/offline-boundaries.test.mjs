import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { executeFormalCalibrationV2 } from "./formal-execution-v2.mjs";
import { runFormalCliV2 } from "./run-formal-v2.mjs";
import { createDeepSeekProviderAdapterV2 } from "./provider-adapter-v2.mjs";

for (const [name, entrypoint] of [
  ["historical live CLI", runFormalCliV2],
  ["historical live execute", executeFormalCalibrationV2]
]) {
  test(`${name} refuses before inspecting credentials, paths, streams or callbacks`, async () => {
    let inspectedArguments = 0;
    const protectedInputs = new Proxy({}, {
      get() {
        inspectedArguments += 1;
        throw new Error("Fixture input must not be inspected.");
      }
    });
    await assert.rejects(() => entrypoint(protectedInputs), /historical.*live.*disabled/i);
    assert.equal(inspectedArguments, 0);
  });
}

test("provider adapter has no implicit live transport even with a credential-shaped fixture", () => {
  assert.throws(() => createDeepSeekProviderAdapterV2({ apiKey: "test-owned-fake-key" }), /offline.*transport|live.*disabled/i);
});

test("the actual historical CLI flag exits disabled without consuming credential-shaped stdin", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./run-formal-v2.mjs", import.meta.url)), "--execute-formal-168-plus-21"], {
    cwd: process.cwd(), env: process.env, input: "test-owned stdin canary; never a real credential",
    encoding: "utf8", timeout: 5_000, maxBuffer: 1024 * 1024
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /historical.*live.*disabled/i);
  assert.doesNotMatch(result.stderr, /stdin canary/);
});


import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { offlineRunFixtureV2 } from "./test-fixtures.mjs";
import { validateCoreReceiptV2, scoreCalibrationV2 } from "./scoring.mjs";
import { readCommittedRunV2, writeCommittedRunV2, computeRepeatabilityV2 } from "./formal-campaign-v2.mjs";
import { runPackageRepeatV2 } from "./formal-runner-v2.mjs";

function rehashReceipt(receipt) {
  for (const execution of receipt.roleExecutions ?? []) {
    const { executionSha256, ...body } = execution;
    execution.executionSha256 = canonicalSha256(body);
  }
  for (const surface of receipt.surfaceResults ?? []) {
    const { evidenceSha256, ...body } = surface;
    surface.evidenceSha256 = canonicalSha256(body);
  }
  const { receiptSha256, ...body } = receipt;
  receipt.receiptSha256 = canonicalSha256(body);
  return receipt;
}

async function assertPersistenceRejects(receipt, invalid, expectedPackage, originalReceipt) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-v2-quality-"));
  try {
    const context = { collectionRoot: root, expectedPackage, originalReceipt };
    await assert.rejects(() => writeCommittedRunV2({ ...context, receipt: invalid }), /offline|evidence|role|execution|projection|finding|inspection|arm|repeat|receipt/i);
    await writeCommittedRunV2({ ...context, receipt });
    const directory = path.join(root, receipt.runId);
    const marker = JSON.parse(await readFile(path.join(directory, "COMMITTED.json"), "utf8"));
    marker.receiptSha256 = invalid.receiptSha256;
    marker.receiptFileCanonicalSha256 = canonicalSha256(invalid);
    const { markerSha256, ...body } = marker;
    marker.markerSha256 = canonicalSha256(body);
    await writeFile(path.join(directory, "receipt.json"), JSON.stringify(invalid));
    await writeFile(path.join(directory, "COMMITTED.json"), JSON.stringify(marker));
    await assert.rejects(() => readCommittedRunV2({ ...context, expected: { runId: receipt.runId } }), /offline|evidence|role|execution|projection|finding|inspection|arm|repeat|receipt/i);
  } finally { await rm(root, { recursive: true, force: true }); }
}

for (const [name, arm, mutate] of [
  ["unknown inspection role", "A_PRIME", (r) => { r.surfaceResults[0].inspectedByRoles = ["not-inspected"]; }],
  ["missing actual executions", "A_PRIME", (r) => { r.roleExecutions = []; }],
  ["wrong arm", "A_PRIME", (r) => { r.arm = "C0_PRIME"; }],
  ["duplicated execution", "A_PRIME", (r) => { r.roleExecutions.push(structuredClone(r.roleExecutions[0])); }],
  ["wrong role-result package", "A_PRIME", (r) => { r.roleExecutions[0].roleResult.packageId = "other-package"; }],
  ["incomplete actual inspection", "A_PRIME", (r) => { r.roleExecutions[0].roleResult.inspectionComplete = false; }],
  ["wrong aggregation role", "B_PRIME", (r) => { r.aggregation.includedRoles.push("same-reviewer-critique"); }],
  ["critique attributed to final surface", "B_PRIME", (r) => { r.surfaceResults[0].inspectedByRoles.push("same-reviewer-critique"); }],
  ["revision detached from critique", "B_PRIME", (r) => { r.roleExecutions[2].projection.reviewContext.priorRoleResult.findings = [{ code: "fixture-tamper" }]; }],
  ["solver claims lesson outside scope", "C0_PRIME", (r) => { r.surfaceResults.find((s) => s.surfaceKind === "lesson").inspectedByRoles.push("answer-blind-solver"); }],
  ["unexecuted aggregate finding", "C0_PRIME", (r) => { r.findings.push({ findingId: "invented", sourceRole: "evidence-verifier", sourceFindingId: "missing", surfaceId: "q-mc", family: "F8", severity: "P0", code: "TEMPLATE_IDENTITY_LEAKAGE", detail: "Synthetic unsupported evidence" }); }]
]) {
  test(`core score/write/resume reject ${name} after consistent outer rehash`, async () => {
    const { receipt, expectedPackage } = await offlineRunFixtureV2({ arm });
    assert.equal(validateCoreReceiptV2(receipt, expectedPackage), true);
    const invalid = structuredClone(receipt); mutate(invalid); rehashReceipt(invalid);
    assert.throws(() => scoreCalibrationV2({ runReceipts: [invalid], expectedPackages: [expectedPackage], goldInstances: [] }), /role|execution|projection|finding|inspection|arm/i);
    await assertPersistenceRejects(receipt, invalid, expectedPackage);
  });
}

const invalidOfflineFields = {
  executionMode: "live", evidenceClass: "live-provider-evidence", providerCallsSimulated: false,
  liveProviderUsed: true, formalExecutionAuthorized: true, productionAuthorized: true,
  deploymentAuthorized: true, gitCommitAuthorized: true, gitPushAuthorized: true
};
for (const runKind of ["core", "repeat"]) {
  for (const [field, invalidValue] of Object.entries(invalidOfflineFields)) {
    test(`${runKind} write/resume reject contradictory or missing ${field}`, async () => {
      const fixture = await offlineRunFixtureV2({ arm: "B_PRIME" });
      const originalReceipt = fixture.receipt;
      const receipt = runKind === "core" ? originalReceipt : await runPackageRepeatV2({
        ...fixture, originalReceipt, expectedPackage: fixture.expectedPackage,
        repeatPlanRow: { originalPackageId: originalReceipt.packageId, arm: originalReceipt.arm,
          repeatGroupId: originalReceipt.repeatGroupId, providerCalls: 2, repeatIndex: 1 }
      });
      for (const missing of [false, true]) {
        const invalid = structuredClone(receipt);
        if (missing) delete invalid[field]; else invalid[field] = invalidValue;
        rehashReceipt(invalid);
        if (runKind === "core") {
          assert.throws(() => scoreCalibrationV2({ runReceipts: [invalid], expectedPackages: [fixture.expectedPackage], goldInstances: [] }), /offline|evidence/i);
        } else {
          assert.throws(() => computeRepeatabilityV2({ coreReceipts: [originalReceipt], repeatReceipts: [invalid], expectedPackages: [fixture.expectedPackage] }), /offline|evidence/i);
        }
        await assertPersistenceRejects(receipt, invalid, fixture.expectedPackage, originalReceipt);
      }
    });
  }
}

test("B and C0 actual role scopes survive score and persistence with honest offline evidence", async () => {
  for (const arm of ["A_PRIME", "B_PRIME", "C0_PRIME"]) {
    const { receipt, expectedPackage } = await offlineRunFixtureV2({ arm });
    const lesson = receipt.surfaceResults.find((row) => row.surfaceKind === "lesson");
    assert.deepEqual(lesson.inspectedByRoles, arm === "C0_PRIME"
      ? ["bilingual-curriculum-critic", "evidence-verifier"]
      : arm === "B_PRIME" ? ["deterministic-baseline", "same-reviewer-revision"] : ["deterministic-baseline"]);
    assert.equal(validateCoreReceiptV2(receipt, expectedPackage), true);
    assert.ok(scoreCalibrationV2({ runReceipts: [receipt], expectedPackages: [expectedPackage], goldInstances: [] }));
  }
});


for (const [name, mutate] of [
  ["missing role", (r) => { r.roleExecutions.pop(); }],
  ["wrong arm", (r) => { r.arm = "C0_PRIME"; }],
  ["incomplete result", (r) => { r.roleExecutions[0].providerReceipt.roleResult.inspectionComplete = false; }],
  ["forged pair receipt", (r) => { r.pairAudits[0].originalRecordSha256 = "0".repeat(64); }],
  ["extra lesson inspection", (r) => { r.roleExecutions[0].providerReceipt.roleResult.inspectedSurfaceIds.push("not-projected"); }]
]) {
  test(`repeat score/write/resume reject ${name}`, async () => {
    const fixture = await offlineRunFixtureV2({ arm: "B_PRIME" });
    const originalReceipt = fixture.receipt;
    const receipt = await runPackageRepeatV2({ ...fixture, originalReceipt,
      repeatPlanRow: { originalPackageId: originalReceipt.packageId, arm: "B_PRIME", repeatGroupId: originalReceipt.repeatGroupId, providerCalls: 2, repeatIndex: 1 } });
    const invalid = structuredClone(receipt); mutate(invalid); rehashReceipt(invalid);
    assert.throws(() => computeRepeatabilityV2({ coreReceipts: [originalReceipt], repeatReceipts: [invalid], expectedPackages: [fixture.expectedPackage] }), /role|inspection|repeat|evidence/i);
    await assertPersistenceRejects(receipt, invalid, fixture.expectedPackage, originalReceipt);
  });
}

test("repeat validates the original core evidence before any mock model or budget call", async () => {
  const fixture = await offlineRunFixtureV2({ arm: "B_PRIME" });
  for (const [field, value] of Object.entries(invalidOfflineFields)) {
    const invalid = structuredClone(fixture.receipt); invalid[field] = value; rehashReceipt(invalid);
    const before = fixture.getProviderCalls();
    await assert.rejects(() => runPackageRepeatV2({ ...fixture, originalReceipt: invalid,
      repeatPlanRow: { originalPackageId: invalid.packageId, arm: "B_PRIME", repeatGroupId: invalid.repeatGroupId, providerCalls: 2, repeatIndex: 1 } }), /offline|evidence/i);
    assert.equal(fixture.getProviderCalls(), before);
  }
});

test("B critique remains actual execution evidence but only revision findings enter final aggregation", async () => {
  const finding = (findingId) => ({ findingId, surfaceId: "q-mc", family: "F1", severity: "P0", code: "ANSWER_INDEPENDENT_MISMATCH", detail: "Synthetic role-source parity fixture" });
  const { receipt, expectedPackage } = await offlineRunFixtureV2({ arm: "B_PRIME", findingsByRole: {
    "same-reviewer-critique": [finding("critique-only")], "same-reviewer-revision": [finding("revision-only")]
  } });
  assert.equal(receipt.roleExecutions.find((row) => row.role === "same-reviewer-critique").providerReceipt.roleResult.findings.length, 1);
  assert.equal(receipt.findings.some((row) => row.sourceFindingId === "critique-only"), false);
  assert.equal(receipt.findings.filter((row) => row.sourceFindingId === "revision-only").length, 1);
  assert.equal(validateCoreReceiptV2(receipt, expectedPackage), true);
});
