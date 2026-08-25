import { createHash } from "node:crypto";
import { chmod, link, mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJson,
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  calculateFrameRowsRootV3,
  calculateFrameSelectionContentRootV3,
  canonicalizeStrictItemJsonV4,
} from "./sample-contract-v5.mjs";

type JsonRecord = Record<string, any>;

function sha256Bytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function jsonBytes(value: unknown) {
  return Buffer.from(`${canonicalJson(canonicalizeStrictItemJsonV4(value))}\n`, "utf8");
}

function jsonlBytes(values: unknown[]) {
  return Buffer.from(`${values.map((value) => canonicalJson(canonicalizeStrictItemJsonV4(value))).join("\n")}\n`, "utf8");
}

async function writeExclusiveAtomic(filePath: string, bytes: Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(filePath), 0o700);
  const temporaryPath = `${filePath}.tmp-${process.pid}-${sha256Bytes(bytes).slice(0, 16)}`;
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporaryPath, filePath);
    await unlink(temporaryPath);
  } catch (error) {
    if (handle) await handle.close();
    try { await unlink(temporaryPath); } catch { /* an absent temporary file is expected */ }
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(filePath);
    if (!existing.equals(bytes)) throw new Error(`append-only protected artifact conflict at ${path.basename(filePath)}`);
  }
  await chmod(filePath, 0o600);
}

function finalizePublicReceipt(
  publicReceiptDraft: JsonRecord,
  protectedCustodyManifestHash: string,
): Readonly<JsonRecord> {
  const body: JsonRecord = {
    ...publicReceiptDraft,
    protectedCustodyManifestHash,
    protectedCustodyBound: true,
  };
  delete body.formalFreezeReceiptHash;
  return Object.freeze({ ...body, formalFreezeReceiptHash: jcsHash(body) });
}

function assertVerifiedFormalFreezeBundle(bundle: JsonRecord) {
  if (bundle?.schemaVersion !== "NaturalCaFormalFreezeBundleV1") {
    throw new TypeError("verified formal-freeze bundle is required");
  }
  const receipt = bundle.publicReceipt;
  if (receipt?.schemaVersion !== "NaturalCaFormalFreezeReceiptV1"
    || receipt.protectedCustodyManifestHash !== null
    || receipt.protectedCustodyBound !== false) {
    throw new TypeError("unpersisted formal-freeze public receipt is required");
  }
  const receiptPreimage = { ...receipt };
  delete receiptPreimage.formalFreezeReceiptHash;
  if (receipt.formalFreezeReceiptHash !== jcsHash(receiptPreimage)) {
    throw new TypeError("formal-freeze public receipt self-hash mismatch");
  }
  for (const [field, expected] of Object.entries({
    formalFrameFrozen: true,
    formalSampleFrozen: true,
    c0RandomAuditFrozen: true,
    questionEgressAuthorizedNow: false,
    providerExecutionAuthorized: false,
    credentialReadAuthorized: false,
    tokenAuthorizationCreated: false,
    attemptAuthorizationCreated: false,
    usdAuthorizationCreated: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    naturalQuestionResultCount: 0,
    firstProviderExecutionAllowed: false,
  })) {
    if (receipt[field] !== expected) throw new TypeError(`formal-freeze authority boundary mismatch at ${field}`);
  }
  if (receipt.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE"
    || receipt.claimCeiling !== "FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED") {
    throw new TypeError("formal-freeze claim boundary mismatch");
  }
  if (!Array.isArray(bundle.frameRows)
    || bundle.frameRows.length !== receipt.frameRowCount
    || calculateFrameRowsRootV3(bundle.frameRows) !== receipt.samplingFrameHash
    || calculateFrameSelectionContentRootV3(bundle.frameRows) !== receipt.frameSelectionContentRootHash) {
    throw new TypeError("formal-freeze protected frame root mismatch");
  }
  if (bundle.frameRegistration?.frameRegistrationHash !== receipt.frameRegistrationHash
    || bundle.frameRegistration?.samplingFrameHash !== receipt.samplingFrameHash
    || bundle.clusterAudit?.clusterAuditHash !== receipt.clusterAuditHash
    || bundle.sampleManifest?.sampleManifestHash !== receipt.sampleManifestHash
    || bundle.c0RandomAudit?.auditHash !== receipt.c0RandomAuditHash
    || bundle.ownerDecisionReceipt?.ownerDecisionReceiptHash !== receipt.ownerDecisionReceiptHash
    || bundle.sourceEnumerationHashErratum?.erratumHash !== receipt.sourceEnumerationHashErratumHash) {
    throw new TypeError("formal-freeze protected artifact linkage mismatch");
  }
  if (!Array.isArray(bundle.sampleManifest?.selectedRows)
    || bundle.sampleManifest.selectedRows.length !== 60
    || !Array.isArray(bundle.c0RandomAudit?.selectedRows)
    || bundle.c0RandomAudit.selectedRows.length !== 12
    || jcsHash(receipt.selectedPublicRows) !== receipt.selectedPublicRowsRootHash
    || jcsHash(receipt.c0PublicRows) !== receipt.c0PublicRowsRootHash) {
    throw new TypeError("formal-freeze sample or C0 public projection mismatch");
  }
}

export async function persistCaliforniaFormalFreezeV5({
  outputRoot,
  bundle,
}: {
  outputRoot: string;
  bundle: JsonRecord;
}) {
  if (!path.isAbsolute(outputRoot)) throw new TypeError("protected formal-freeze output root must be absolute");
  assertVerifiedFormalFreezeBundle(bundle);
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await chmod(outputRoot, 0o700);

  const payloads = new Map<string, Buffer>([
    ["sampling-frame.jsonl", jsonlBytes(bundle.frameRows)],
    ["runtime-source-enumeration-receipt.json", jsonBytes(bundle.runtimeSourceEnumerationReceipt)],
    ["runtime-extraction-snapshot.json", jsonBytes(bundle.runtimeExtractionSnapshot)],
    ["clean-source-evidence.json", jsonBytes(bundle.cleanSourceEvidence)],
    ["source-parity-input.json", jsonBytes(bundle.sourceParityInput)],
    ["source-parity-evidence.json", jsonBytes(bundle.sourceParityEvidence)],
    ["source-module-manifest-input.json", jsonBytes(bundle.sourceModuleManifestInput)],
    ["source-module-manifest.json", jsonBytes(bundle.sourceModuleManifest)],
    ["rights-decision-input.json", jsonBytes(bundle.rightsDecisionInput)],
    ["rights-decision-table.json", jsonBytes(bundle.rightsDecisionTable)],
    ["formal-item-screens.jsonl", jsonlBytes(bundle.formalScreens)],
    ["scanner-execution-receipts.jsonl", jsonlBytes(bundle.scannerExecutionReceipts)],
    ["scanner-execution-receipt-inventory.json", jsonBytes(bundle.scannerExecutionReceiptInventory)],
    ["item-screen-evidence.jsonl", jsonlBytes(bundle.itemScreenEvidence)],
    ["item-egress-decisions.jsonl", jsonlBytes(bundle.itemEgressDecisions)],
    ["frame-freeze-evidence-input.json", jsonBytes(bundle.frameFreezeEvidenceInput)],
    ["frame-freeze-evidence.json", jsonBytes(bundle.frameFreezeEvidence)],
    ["cluster-audit.json", jsonBytes(bundle.clusterAudit)],
    ["frame-registration.json", jsonBytes(bundle.frameRegistration)],
    ["sample-manifest.json", jsonBytes(bundle.sampleManifest)],
    ["c0-random-audit.json", jsonBytes(bundle.c0RandomAudit)],
    ["owner-decision-receipt.json", jsonBytes(bundle.ownerDecisionReceipt)],
    ["source-enumeration-hash-erratum.json", jsonBytes(bundle.sourceEnumerationHashErratum)],
  ]);
  for (const [relativePath, bytes] of payloads) {
    await writeExclusiveAtomic(path.join(outputRoot, relativePath), bytes);
  }
  const entries = [...payloads.entries()].map(([relativePath, bytes]) => ({
    relativePath,
    byteLength: bytes.byteLength,
    sha256: sha256Bytes(bytes),
  })).sort((left, right) => codePointCompare(left.relativePath, right.relativePath));
  const custodyBody = {
    schemaVersion: "NaturalCaFormalFreezeCustodyManifestV1",
    designId: bundle.publicReceipt.designId,
    registrationHash: bundle.publicReceipt.registrationHash,
    sourceCommit: bundle.publicReceipt.sourceCommit,
    runnerCommit: bundle.publicReceipt.runnerCommit,
    runnerHash: bundle.publicReceipt.runnerHash,
    ownerDecisionReceiptHash: bundle.publicReceipt.ownerDecisionReceiptHash,
    fileCount: entries.length,
    entries,
    containsNaturalQuestionText: true,
    originalItemIdsProtected: true,
    directoryMode: "0700",
    fileMode: "0600",
    protectedStorageRequired: true,
    gitTrackingAllowed: false,
    providerExecutionAuthorized: false,
    credentialReadAuthorized: false,
    questionEgressAuthorizedNow: false,
    excludedNonContentFiles: ["custody-manifest.json", "formal-freeze-receipt.json"],
    c0FrozenAt: bundle.publicReceipt.c0FrozenAt,
  };
  const custodyManifest = Object.freeze({ ...custodyBody, custodyManifestHash: jcsHash(custodyBody) });
  await writeExclusiveAtomic(path.join(outputRoot, "custody-manifest.json"), jsonBytes(custodyManifest));
  const finalPublicReceipt = finalizePublicReceipt(bundle.publicReceipt, custodyManifest.custodyManifestHash);
  await writeExclusiveAtomic(path.join(outputRoot, "formal-freeze-receipt.json"), jsonBytes(finalPublicReceipt));

  const files = [...payloads.keys(), "custody-manifest.json", "formal-freeze-receipt.json"].sort(codePointCompare);
  for (const relativePath of files) {
    const metadata = await stat(path.join(outputRoot, relativePath));
    if ((metadata.mode & 0o777) !== 0o600) throw new Error(`protected artifact mode drift at ${relativePath}`);
  }
  const directoryMetadata = await stat(outputRoot);
  if ((directoryMetadata.mode & 0o777) !== 0o700) throw new Error("protected formal-freeze directory mode drift");

  return Object.freeze({
    schemaVersion: "NaturalCaFormalFreezePersistenceResultV1",
    outputRoot,
    files,
    protectedFileCount: files.length,
    custodyManifestHash: custodyManifest.custodyManifestHash,
    finalFormalFreezeReceiptHash: finalPublicReceipt.formalFreezeReceiptHash,
    runCompletionHash: jcsHash([
      custodyManifest.custodyManifestHash,
      finalPublicReceipt.formalFreezeReceiptHash,
    ]),
    publicReceipt: finalPublicReceipt,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
  });
}
