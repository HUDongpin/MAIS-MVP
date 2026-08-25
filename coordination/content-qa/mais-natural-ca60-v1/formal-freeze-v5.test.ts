import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildV5SourceEnumerationHashErratum,
} from "./source-enumeration-hash-erratum-v5.mjs";
import {
  buildFrameItemEgressDecisionV4,
  calculateFrameSelectionContentRootV3,
} from "./sample-contract-v5.mjs";
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  runCaliforniaFormalFreezeV5,
} from "./formal-freeze-v5";
import {
  persistCaliforniaFormalFreezeV5,
} from "./formal-freeze-v5-storage";

const OWNER_DECISION_PATH = new URL(
  "../../research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json",
  import.meta.url,
);

const HASHES = Object.freeze({
  converterImplementationHash: "1".repeat(64),
  normalizationImplementationHash: "2".repeat(64),
  publicProjectionImplementationHash: "3".repeat(64),
  dependencyClosureExtractorImplementationHash: "4".repeat(64),
  scannerImplementationHash: "5".repeat(64),
  clusteringAlgorithmHash: "6".repeat(64),
  extractorImplementationHash: "7".repeat(64),
});

async function buildRealRuntimeBundle(startedAt = "2026-08-25T19:40:00.000Z") {
  const ownerDecisionReceipt = JSON.parse(await readFile(OWNER_DECISION_PATH, "utf8"));
  return runCaliforniaFormalFreezeV5({
    sourceCommit: "a".repeat(40),
    runnerCommit: "a".repeat(40),
    runnerHash: "b".repeat(64),
    repositoryIdentity: "HUDongpin/MAIS-MVP",
    sourceModuleFiles: [
      { repoRelativePath: "data/usCaliforniaTopics.ts", gitBlobOid: "c".repeat(40) },
      { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "d".repeat(40) },
    ],
    sourceClosureParityHash: "e".repeat(64),
    approvedReadinessSourceCommit: "bd44971158979b5e31acf5bf0b1fabc360c9a53a",
    ownerDecisionReceipt,
    sourceEnumerationHashErratum: buildV5SourceEnumerationHashErratum({
      recordedAt: "2026-08-25T19:37:37.000Z",
    }),
    implementationHashes: HASHES,
    startedAt,
  });
}

let sharedRealRuntimeBundle: ReturnType<typeof buildRealRuntimeBundle> | null = null;
function getSharedRealRuntimeBundle() {
  sharedRealRuntimeBundle ??= buildRealRuntimeBundle();
  return sharedRealRuntimeBundle;
}

test("formal V5 freeze materializes the complete CA frame and exactly 60 unique clusters without provider authority", async () => {
  const result = await getSharedRealRuntimeBundle();

  assert.equal(result.frameRows.length, 2_802);
  assert.equal(result.frameRegistration.frameRowCount, 2_802);
  assert.equal(result.frameRegistration.eligibleRowCount, 482);
  assert.equal(result.frameRegistration.eligibleClusterCount, 106);
  assert.equal(result.sampleManifest.selectedRows.length, 60);
  assert.equal(new Set(result.sampleManifest.selectedRows.map((row: { clusterId: string }) => row.clusterId)).size, 60);
  assert.equal(result.c0RandomAudit.selectedRows.length, 12);
  assert.equal(result.publicReceipt.ownerDecisionRequestHash, "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78");
  assert.equal(result.publicReceipt.approvedPotentialEligibleContentRootHash, "58de40eb4db30ec717aa0758fb3aba8b88e63a2e66f24941fcbc47c9193e9ea3");
  assert.equal(result.publicReceipt.providerExecutionAuthorized, false);
  assert.equal(result.publicReceipt.questionEgressAuthorizedNow, false);
  assert.equal(result.publicReceipt.providerRequestCount, 0);
  assert.equal(result.publicReceipt.credentialReadCount, 0);
  assert.equal(result.publicReceipt.naturalQuestionEgressCount, 0);
  assert.equal(result.publicReceipt.tokenAuthorizationCreated, false);
  assert.equal(result.publicReceipt.attemptAuthorizationCreated, false);
  assert.equal(result.publicReceipt.usdAuthorizationCreated, false);
  assert.equal(result.publicReceipt.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(result.publicReceipt.claimCeiling, "FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED");

  const firstRow = result.frameRows[0];
  const evidence = result.frameFreezeEvidenceInput;
  const independentlySlowDecision = buildFrameItemEgressDecisionV4({
    item: firstRow,
    rightsDecisionInput: evidence.rightsDecisionInput,
    rightsDecisionTable: evidence.rightsDecisionTable,
    trustedOwnerApprovalRootHash: evidence.trustedOwnerApprovalRootHash,
    screenEvidence: evidence.itemScreenEvidence.find((entry) => entry.itemId === firstRow.itemId),
    scannerExecutionReceiptInventory: evidence.scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: evidence.trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: evidence.trustedScreeningPolicyHash,
    trustedScannerImplementationHash: evidence.trustedScannerImplementationHash,
    trustedScannerRunnerHash: evidence.trustedScannerRunnerHash,
  });
  assert.deepEqual(independentlySlowDecision, result.itemEgressDecisions[0]);
});

test("formal V5 selection is result-blind and stable when only freeze timestamps move", async () => {
  const result = await getSharedRealRuntimeBundle();
  const timestampOnlyRows = structuredClone(result.frameRows);
  for (const row of timestampOnlyRows) {
    row.frameFrozenAt = "2026-08-25T19:50:09.000Z";
    row.rowHash = calculateArtifactHash(row, "rowHash");
  }
  assert.equal(
    result.frameRegistration.frameSelectionContentRootHash,
    calculateFrameSelectionContentRootV3(timestampOnlyRows),
  );
  const timestampOnlyManifest = structuredClone(result.sampleManifest);
  timestampOnlyManifest.manifestFrozenAt = "2026-08-25T19:50:11.000Z";
  const timestampOnlySelfHash = calculateArtifactHash(timestampOnlyManifest, "sampleManifestHash");
  assert.equal(result.sampleManifest.manifestTupleRootHash, timestampOnlyManifest.manifestTupleRootHash);
  assert.notEqual(result.sampleManifest.sampleManifestHash, timestampOnlySelfHash);
});

test("tampered or broadened owner authority fails before a formal freeze artifact is returned", async () => {
  const ownerDecisionReceipt = JSON.parse(await readFile(OWNER_DECISION_PATH, "utf8"));
  ownerDecisionReceipt.providerExecutionAuthorized = true;
  await assert.rejects(
    runCaliforniaFormalFreezeV5({
      sourceCommit: "a".repeat(40),
      runnerCommit: "a".repeat(40),
      runnerHash: "b".repeat(64),
      repositoryIdentity: "HUDongpin/MAIS-MVP",
      sourceModuleFiles: [{ repoRelativePath: "data/usCaliforniaTopics.ts", gitBlobOid: "c".repeat(40) }],
      sourceClosureParityHash: "e".repeat(64),
      approvedReadinessSourceCommit: "bd44971158979b5e31acf5bf0b1fabc360c9a53a",
      ownerDecisionReceipt,
      sourceEnumerationHashErratum: buildV5SourceEnumerationHashErratum({
        recordedAt: "2026-08-25T19:37:37.000Z",
      }),
      implementationHashes: HASHES,
      startedAt: "2026-08-25T19:40:00.000Z",
    }),
    /owner decision/iu,
  );
});

test("protected persistence is append-only, custody-bound, permission-restricted, and public-ID blind", async () => {
  const result = await getSharedRealRuntimeBundle();
  const temporaryParent = await mkdtemp(path.join(os.tmpdir(), "mais-ca60-v5-freeze-"));
  const outputRoot = path.join(temporaryParent, "protected");
  try {
    const first = await persistCaliforniaFormalFreezeV5({ outputRoot, bundle: result });
    assert.equal(first.protectedFileCount, 25);
    assert.equal(first.publicReceipt.protectedCustodyBound, true);
    assert.equal(first.publicReceipt.protectedCustodyManifestHash, first.custodyManifestHash);
    assert.equal(first.publicReceipt.formalFreezeReceiptHash, first.finalFormalFreezeReceiptHash);
    assert.equal(first.publicReceipt.providerRequestCount, 0);
    assert.equal(first.publicReceipt.credentialReadCount, 0);
    assert.equal(first.publicReceipt.naturalQuestionEgressCount, 0);

    const custody = JSON.parse(await readFile(path.join(outputRoot, "custody-manifest.json"), "utf8"));
    const publicReceiptBytes = await readFile(path.join(outputRoot, "formal-freeze-receipt.json"), "utf8");
    const publicReceipt = JSON.parse(publicReceiptBytes);
    assert.equal(custody.fileCount, 23);
    assert.equal(custody.custodyManifestHash, first.custodyManifestHash);
    assert.equal(custody.providerExecutionAuthorized, false);
    assert.equal(custody.credentialReadAuthorized, false);
    assert.equal(custody.questionEgressAuthorizedNow, false);
    assert.doesNotMatch(publicReceiptBytes, new RegExp(result.frameRows[0].itemId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.doesNotMatch(publicReceiptBytes, /"prompt"|"answer"|"explanation"/u);

    for (const [schemaName, artifact] of [
      ["NaturalCaFormalFreezeCustodyManifestV1.schema.json", custody],
      ["NaturalCaFormalFreezeReceiptV1.schema.json", publicReceipt],
    ] as const) {
      const schema = JSON.parse(await readFile(new URL(`./schemas/${schemaName}`, import.meta.url), "utf8"));
      assert.equal(schema.type, "object", schemaName);
      assert.equal(schema.additionalProperties, false, schemaName);
      assert.deepEqual([...schema.required].sort(), Object.keys(artifact).sort(), schemaName);
      assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(artifact).sort(), schemaName);
      for (const [field, definition] of Object.entries(schema.properties) as Array<[string, { const?: unknown }]>) {
        if (Object.hasOwn(definition, "const")) assert.deepEqual(artifact[field], definition.const, `${schemaName}:${field}`);
      }
    }
    const custodyPreimage = { ...custody };
    delete custodyPreimage.custodyManifestHash;
    assert.equal(custody.custodyManifestHash, jcsHash(custodyPreimage));
    const receiptPreimage = { ...publicReceipt };
    delete receiptPreimage.formalFreezeReceiptHash;
    assert.equal(publicReceipt.formalFreezeReceiptHash, jcsHash(receiptPreimage));

    assert.equal((await stat(outputRoot)).mode & 0o777, 0o700);
    for (const relativePath of first.files) {
      assert.equal((await stat(path.join(outputRoot, relativePath))).mode & 0o777, 0o600, relativePath);
    }
    for (const entry of custody.entries) {
      const bytes = await readFile(path.join(outputRoot, entry.relativePath));
      assert.equal(bytes.byteLength, entry.byteLength, entry.relativePath);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, entry.relativePath);
    }

    const idempotent = await persistCaliforniaFormalFreezeV5({ outputRoot, bundle: result });
    assert.equal(idempotent.runCompletionHash, first.runCompletionHash);

    await writeFile(path.join(outputRoot, "sampling-frame.jsonl"), "tampered-local-test-fixture\n", { mode: 0o600 });
    await assert.rejects(
      persistCaliforniaFormalFreezeV5({ outputRoot, bundle: result }),
      /append-only protected artifact conflict/u,
    );
  } finally {
    await rm(temporaryParent, { recursive: true, force: true });
  }
});
