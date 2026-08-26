import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOpenAIAdjudicationTriggerReceiptV1,
  buildSampleExecutionInventoryV1,
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildMachineReferenceSealV2,
  buildRawMachineReferenceLabelV1,
  validateMachineReferenceSealV2,
} from "./reference-label-seal-v5-r3.mjs";

const H = (character) => character.repeat(64);
const BASE_ROLES = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"];

function fixture() {
  const inventoryItems = Array.from({ length: 60 }, (_, index) => ({
    itemHash: sha256V5R3(`item-${index}`),
    itemIdPseudonym: `item-${index + 1}`,
    clusterId: `cluster-${index + 1}`,
    privacyScreenEvidenceHash: sha256V5R3(`privacy-${index}`),
    rightsScreenEvidenceHash: sha256V5R3(`rights-${index}`),
    egressEligible: true,
  }));
  const sorted = [...inventoryItems].sort((left, right) => left.itemHash < right.itemHash ? -1 : left.itemHash > right.itemHash ? 1 : 0);
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV2",
    runnerVersion: "V5-R3",
    designId: "MAIS-NATURAL-CA60-V5",
    sampleManifestHash: H("a"),
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash }) => itemHash))),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]))),
    labelingAndAdjudicationHash: H("b"),
    taxonomyHash: H("c"),
  });
  const inventory = buildSampleExecutionInventoryV1({ registration, items: inventoryItems });
  const authorization = sealV5R3Artifact({
    schemaVersion: "ProviderAuthorizationV3",
    runnerRegistrationHash: registration.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    maximumAttempts: 610,
  });
  const ledgerEntries = [];
  const itemBundles = [];
  let previousEntryHash = null;
  let sequenceNumber = 0;
  for (const item of inventoryItems) {
    const roleOutputs = {};
    for (const role of BASE_ROLES) {
      const attemptId = `${item.itemIdPseudonym}-${role}`;
      const reservation = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchReservationV1",
        entryType: "DISPATCH_RESERVED",
        sequenceNumber: ++sequenceNumber,
        previousEntryHash,
        authorizationHash: authorization.selfHash,
        attemptId,
        role,
        ...item,
        sampleExecutionInventoryHash: inventory.selfHash,
      });
      ledgerEntries.push(reservation);
      previousEntryHash = reservation.selfHash;
      const attemptReceipt = sealV5R3Artifact({
        schemaVersion: "ProviderEventReceiptV3",
        reservationHash: reservation.selfHash,
        authorizationHash: authorization.selfHash,
        attemptId,
        role,
        itemHash: item.itemHash,
        itemIdPseudonym: item.itemIdPseudonym,
        clusterId: item.clusterId,
        sampleExecutionInventoryHash: inventory.selfHash,
        provider: "OPENAI_DIRECT",
        requestedModel: "gpt-5.6-luna",
        requestedEndpoint: "https://us.api.openai.com/v1/responses",
        attemptStatus: "SUCCEEDED",
        completedAt: "2026-08-26T06:00:00.000Z",
      });
      const completion = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchCompletionV1",
        entryType: "DISPATCH_COMPLETED",
        sequenceNumber: ++sequenceNumber,
        previousEntryHash,
        authorizationHash: authorization.selfHash,
        reservationHash: reservation.selfHash,
        providerEventReceiptHash: attemptReceipt.selfHash,
        providerEventReceipt: attemptReceipt,
        attemptStatus: "SUCCEEDED",
      });
      ledgerEntries.push(completion);
      previousEntryHash = completion.selfHash;
      const parsedPayload = role.endsWith("LABEL")
        ? { rawLabel: "NO_FINDING", rawTaxonomyCodes: ["NO_FINDING"], rawSeverity: "NONE", rawFindingFamilies: { NO_FINDING: null }, rawFindings: [], rawUncertain: false }
        : { solution: "fixture solution", solvability: "SOLVABLE", uncertain: false };
      roleOutputs[role] = sealV5R3Artifact({
        schemaVersion: "OpenAIReferenceRoleOutputV5R3",
        provider: "OPENAI_DIRECT",
        role,
        attemptId,
        attemptReceiptHash: attemptReceipt.selfHash,
        itemHash: item.itemHash,
        itemIdPseudonym: item.itemIdPseudonym,
        clusterId: item.clusterId,
        parsedPayload,
        parsedPayloadHash: sha256V5R3(canonicalJsonV5R3(parsedPayload)),
      });
    }
    const rawA = buildRawMachineReferenceLabelV1(roleOutputs.A_LABEL);
    const rawB = buildRawMachineReferenceLabelV1(roleOutputs.B_LABEL);
    const adjudicationTrigger = buildOpenAIAdjudicationTriggerReceiptV1({
      item: { itemHash: item.itemHash, itemIdPseudonym: item.itemIdPseudonym },
      labelA: rawA,
      labelB: rawB,
      triggerEngineHash: H("d"),
    });
    itemBundles.push({ item, roleOutputs, adjudicationTrigger });
  }
  return { registration, authorization, inventory, ledgerEntries, itemBundles };
}

test("reference seal is derived from 60 complete four-role lineages and retains machine-reference limits", async () => {
  const input = fixture();
  const seal = buildMachineReferenceSealV2({
    ...input,
    sealedAt: "2026-08-26T07:00:00.000Z",
  });
  assert.deepEqual(validateMachineReferenceSealV2({ ...input, seal }), []);
  assert.equal(seal.itemCount, 60);
  assert.equal(seal.baseSuccessfulCallCount, 240);
  assert.equal(seal.adjudicationSuccessfulCallCount, 0);
  assert.equal(seal.labelSourceType, "machine_reference_panel");
  assert.equal(seal.humanGold, false);
  assert.equal(seal.sameModelCorrelatedErrorRisk, true);
  assert.equal(seal.finalLabels.every((label) => label.label === "NO_FINDING"), true);
  const sealSchema = JSON.parse(await readFile(new URL("./schemas/MachineReferenceSealV2.schema.json", import.meta.url), "utf8"));
  const labelSchema = JSON.parse(await readFile(new URL("./schemas/MachineReferenceLabelV1.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(seal).sort(), [...sealSchema.required].sort());
  assert.deepEqual(Object.keys(seal.finalLabels[0]).sort(), [...labelSchema.required].sort());
});

test("missing, tampered, or cross-item role lineage cannot produce a reference seal", () => {
  const input = fixture();
  delete input.itemBundles[0].roleOutputs.B_LABEL;
  assert.throws(() => buildMachineReferenceSealV2({ ...input, sealedAt: "2026-08-26T07:00:00.000Z" }), /B_LABEL|role/u);
});
