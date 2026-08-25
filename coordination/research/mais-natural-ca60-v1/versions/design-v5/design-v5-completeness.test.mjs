import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V4 = path.resolve(HERE, "../design-v4");
const ACTIVE_POINTER = path.resolve(HERE, "../../ACTIVE-DESIGN-REGISTRATION.json");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function liveInventory(root) {
  const files = (await walkFiles(root)).sort();
  return Promise.all(files.map(async (absolute) => {
    const bytes = await readFile(absolute);
    return {
      path: path.relative(root, absolute),
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
    };
  }));
}

async function loadJson(name) {
  return JSON.parse(await readFile(path.join(HERE, name), "utf8"));
}

test("V5 exact-binds every immutable V4 candidate byte and leaves the active V3 pointer unchanged", async () => {
  const inventory = await loadJson("predecessor-package-inventory-v4.json");
  const live = await liveInventory(V4);
  const v4Bytes = await readFile(path.join(V4, "design-registration.json"));
  const pointer = JSON.parse(await readFile(ACTIVE_POINTER, "utf8"));

  assert.equal(inventory.schemaVersion, "PredecessorPackageInventoryV2");
  assert.equal(inventory.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(inventory.disposition, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(inventory.providerEventCount, 0);
  assert.equal(inventory.fileCount, live.length);
  assert.deepEqual(inventory.entries, live);
  assert.equal(inventory.inventoryRootHash, sha256(Buffer.from(canonicalJson(live), "utf8")));
  assert.equal(inventory.registrationByteSha256, sha256(v4Bytes));
  assert.equal(pointer.activeDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(pointer.firstProviderExecutionAllowed, false);
});

test("V5 is a sealed non-active candidate with a valid registration hash and no execution authority", async () => {
  const registration = await loadJson("design-registration.json");
  const contract = await import("./design-contract.mjs");

  assert.equal(registration.designKind, "APPEND_ONLY_COMPOSITE_PRE_EXECUTION_DESIGN_REGISTRATION");
  assert.equal(registration.candidateRevision, 2);
  assert.equal(
    registration.supersedesCandidateRegistrationHash,
    "74729685c89abf873c3dbf49ec41d429c4107a2b4707167208856648fd9b788b",
  );
  assert.deepEqual(registration.preIndependentReviewCorrection, {
    correctionId: "V5-CANDIDATE-REVISION-2-RUNNER-COMMIT-GIT-OID",
    recordedAt: "2026-08-25T17:21:42.000Z",
    priorCommit: "32bab56fac164631ba095a36aafc5eb0c8ee6bc5",
    priorRegistrationHash: "74729685c89abf873c3dbf49ec41d429c4107a2b4707167208856648fd9b788b",
    priorPackageRootHash: "5e8ba0d47de9dcc1fa419dd43bfb1dc424e49d3ebcab47ccc6fa72e86684d7f2",
    priorDisposition: "SUPERSEDED_PRE_INDEPENDENT_REVIEW",
    providerEventCountAtCorrection: 0,
    firstProviderExecutionOccurred: false,
    changedContract: "ProviderAuthorizationV2.properties.runnerCommit.pattern",
    previousPattern: "^[0-9a-f]{64}$",
    correctedPattern: "^[0-9a-f]{40}$",
    reasonCode: "RUNNER_COMMIT_MUST_BIND_CURRENT_REPOSITORY_GIT_SHA1_OBJECT_ID",
  });
  assert.equal(registration.lifecycleStatus, "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW");
  assert.equal(registration.freezeAllowed, true);
  assert.equal(registration.activationAllowed, false);
  assert.equal(registration.firstProviderExecutionAllowed, false);
  assert.equal(registration.providerEventCount, 0);
  assert.deepEqual(registration.blockingActivationCodes, [
    "A11_INDEPENDENT_REVIEW_REQUIRED",
    "A21_RUNNER_V5_MIGRATION_REQUIRED",
    "OPENAI_PROJECT_ROUTE_PREFLIGHT_REQUIRED",
    "HASH_BOUND_OPENAI_AUTHORIZATION_REQUIRED",
    "HASH_BOUND_DEEPSEEK_AUTHORIZATION_REQUIRED",
  ]);
  assert.match(registration.frozenAt, /^2026-08-25T/u);
  assert.equal(Date.parse(registration.thresholdsFrozenAt) <= Date.parse(registration.frozenAt), true);
  assert.match(registration.registrationHash, /^[0-9a-f]{64}$/u);
  assert.equal(registration.registrationHash, contract.calculateRegistrationHash(registration));
  assert.equal(registration.preExecutionState.designRegistrationHash, null);
  for (const [section, expectedHash] of Object.entries(registration.frozenContractHashes)) {
    assert.equal(expectedHash, contract.jcsHash(registration[section]), `${section} frozen section hash drift`);
  }
  assert.equal(
    registration.frozenContractRootHash,
    contract.jcsHash(Object.entries(registration.frozenContractHashes)),
  );
  assert.deepEqual(registration, await contract.buildDesignRegistrationV5());
});

test("ProviderAuthorizationV2 accepts the repository's exact 40-hex Git commit instead of a fabricated SHA-256", async () => {
  const schema = JSON.parse(await readFile(path.join(HERE, "schemas/ProviderAuthorizationV2.schema.json"), "utf8"));
  assert.deepEqual(schema.properties.runnerCommit, {
    type: "string",
    pattern: "^[0-9a-f]{40}$",
  });
});

test("V5 freezes unchanged sampling, label, threshold, decision, power, and claim boundaries", async () => {
  const registration = await loadJson("design-registration.json");
  const v4 = JSON.parse(await readFile(path.join(V4, "design-registration.json"), "utf8"));

  for (const section of [
    "scope",
    "eligibility",
    "stratification",
    "homologyClustering",
    "deterministicSelection",
    "taxonomy",
    "analysis",
    "independentReview",
    "publicReport",
  ]) {
    assert.equal(
      registration.composition.inheritedMethodSections[section],
      sha256(Buffer.from(canonicalJson(v4[section]), "utf8")),
      `${section} changed during provider-only migration`,
    );
  }

  assert.equal(registration.scope.targetClusterCount, 60);
  assert.equal(registration.scope.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.scope.claimScopeCeiling, "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY");
  assert.equal(registration.scope.humanGoldClaim, false);
  assert.equal(registration.analysis.thresholds.surfaceSensitivityOneSidedWilsonLcb95AtLeast, 0.9);
  assert.equal(registration.analysis.thresholds.specificityOneSidedWilsonLcb95AtLeast, 0.95);
  assert.equal(registration.analysis.thresholds.p0ObservedFalseNegativesExactly, 0);
  assert.equal(registration.analysis.thresholds.minimumResolvedPositiveClusters, 25);
  assert.equal(registration.analysis.thresholds.minimumResolvedNegativeClusters, 52);
  assert.equal(registration.analysis.structuralFeasibility.ca60CanSimultaneouslyMeetSurfaceConfidenceGates, false);
  assert.equal(registration.analysis.structuralFeasibility.minimumCombinedItems, 77);
  assert.equal(registration.analysis.decisionVocabulary.includes("PASS"), false);
  assert.equal(registration.analysis.decisionVocabulary.includes("LIMITED_GENERALIZATION_EVIDENCE"), true);
  assert.equal(registration.analysis.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
});

test("OpenAI reference roles preserve blindness while binding new V5 prompts and strict schemas", async () => {
  const registration = await loadJson("design-registration.json");
  const roles = registration.providerControls.openaiReferenceRoleContractCatalog.roles;
  const expectedRoles = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"];

  assert.deepEqual(Object.keys(roles), expectedRoles);
  for (const [role, contract] of Object.entries(roles)) {
    assert.equal(contract.provider, "OPENAI_DIRECT");
    assert.equal(contract.model, "gpt-5.6-luna");
    assert.match(contract.promptLiteral, /^OPENAI_GPT_5_6_LUNA_/u);
    assert.doesNotMatch(contract.promptLiteral, /QWEN|qwen3\.8|max/iu);
    assert.equal(contract.promptHash, sha256(Buffer.from(contract.promptLiteral, "utf8")));
    assert.equal(contract.schemaHash, sha256(Buffer.from(contract.schemaLiteral, "utf8")));
    assert.match(contract.roleContractHash, /^[0-9a-f]{64}$/u, role);
    const outputSchema = JSON.parse(contract.schemaLiteral);
    assert.equal(outputSchema.additionalProperties, false);
    assert.deepEqual([...outputSchema.required].sort(), Object.keys(outputSchema.properties).sort());
  }

  assert.deepEqual(registration.machineReferenceWorkflow.panelRoleOrder, expectedRoles);
  assert.equal(registration.machineReferenceWorkflow.referenceProvider.provider, "OPENAI_DIRECT");
  assert.equal(registration.machineReferenceWorkflow.referenceProvider.requestedModel, "gpt-5.6-luna");
  assert.equal(registration.machineReferenceWorkflow.humanGold, false);
  assert.equal(registration.machineReferenceWorkflow.correlatedSameModelErrorRisk, true);
  assert.equal(registration.machineReferenceWorkflow.agreementDoesNotEstablishHumanValidity, true);
  assert.deepEqual(registration.machineReferenceWorkflow.roleInputDenylist, [
    "DEEPSEEK_OUTPUT",
    "OTHER_ITEM",
    "CREDENTIAL",
    "SOURCE_PATH",
    "GIT_METADATA",
    "STUDENT_OR_USER_DATA",
    "UNAUTHORIZED_COPYRIGHT_CONTENT",
  ]);
});

test("provider and residency selection remain distinct from hash-bound live authorization", async () => {
  const registration = await loadJson("design-registration.json");
  const controls = registration.providerControls;
  const openai = controls.openaiReferenceEnvelope;

  assert.equal(registration.ownerProviderDecision.decisionType, "DESIGN_SELECTION_ONLY_NOT_LIVE_EXECUTION_AUTHORIZATION");
  assert.equal(registration.ownerProviderDecision.egressAuthorizationGranted, false);
  assert.equal(registration.ownerProviderDecision.providerExecutionAuthorizationGranted, false);
  assert.equal(openai.fullAuthorizationAllowed, false);
  assert.equal(openai.currentAuthorizationHash, null);
  assert.equal(openai.projectRoutePreflightReceiptHash, null);
  assert.equal(openai.credentialReadinessReceiptHash, null);
  assert.equal(openai.priceSnapshotHash, null);
  assert.equal(openai.providerEventCount, 0);
  assert.deepEqual(openai.fullAuthorizationBlockers, [
    "ACTIVE_V5_DESIGN_REGISTRATION_REQUIRED",
    "A21_RUNNER_V5_MIGRATION_REQUIRED",
    "FROZEN_FRAME_AND_SAMPLE_REQUIRED",
    "OPENAI_PROJECT_ROUTE_PREFLIGHT_REQUIRED",
    "OPENAI_CREDENTIAL_READINESS_REQUIRED",
    "CURRENT_PRICE_SNAPSHOT_REQUIRED",
    "HASH_BOUND_OWNER_AUTHORIZATION_REQUIRED",
  ]);
  assert.equal(controls.authorizationTemplates.OPENAI_MACHINE_REFERENCE.isCurrentAuthorization, false);
  assert.equal(controls.authorizationTemplates.OPENAI_MACHINE_REFERENCE.grantsProviderExecution, false);
  assert.equal(controls.authorizationTemplates.DEEPSEEK_EVALUATION.isCurrentAuthorization, false);
  assert.equal(controls.authorizationTemplates.DEEPSEEK_EVALUATION.grantsProviderExecution, false);
  assert.equal(controls.currentOpenAIReferenceAuthorizationHash, null);
  assert.equal(controls.currentDeepSeekAuthorizationHash, null);
  assert.equal(JSON.stringify(controls).includes("qwenEnvelope"), false);
  assert.equal(JSON.stringify(controls).includes("qwen3.8-max"), false);
});

test("V5 binds official capability URLs without pretending they prove project entitlement or price", async () => {
  const registration = await loadJson("design-registration.json");
  const evidence = registration.providerControls.openaiReferenceEnvelope.officialCapabilityEvidence;

  assert.equal(evidence.evidenceType, "OFFICIAL_DOCUMENTATION_CAPABILITY_ONLY");
  assert.equal(evidence.projectEntitlementVerified, false);
  assert.equal(evidence.modelAvailabilityOnOwnerProjectVerified, false);
  assert.equal(evidence.priceSnapshotCaptured, false);
  assert.deepEqual(evidence.urls, [
    "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
    "https://developers.openai.com/api/docs/guides/your-data",
    "https://developers.openai.com/api/reference/resources/responses/methods/create",
  ]);
});

test("the migration chronology cannot reach execution before review, runner migration, frame/sample, and two authorizations", async () => {
  const registration = await loadJson("design-registration.json");
  assert.deepEqual(registration.freezeChain, [
    "OWNER_REFERENCE_PROVIDER_DECISION_V5",
    "V4_CANDIDATE_DISPOSITION_SUPERSEDED_NOT_EXECUTED",
    "V5_SEALED_CANDIDATE",
    "A11_V5_INDEPENDENT_REVIEW",
    "ACTIVE_V5_DESIGN_POINTER",
    "CLEAN_RUNTIME_SOURCE_BINDING",
    "FRAME_REGISTRATION",
    "SAMPLE_REGISTRATION",
    "OPENAI_PROJECT_ROUTE_PREFLIGHT_AUTHORIZATION",
    "OPENAI_PROJECT_ROUTE_PREFLIGHT_RECEIPT",
    "OPENAI_REFERENCE_AUTHORIZATION",
    "OPENAI_REFERENCE_ATTEMPT_HISTORY_NONZERO",
    "REFERENCE_LABEL_SEAL",
    "DEEPSEEK_ROUTE_PROBE_AUTHORIZATION",
    "DEEPSEEK_ROUTE_PROBE_RECEIPT",
    "DEEPSEEK_AUTHORIZATION",
    "EXECUTION_REGISTRATION",
  ]);
  assert.equal(registration.preExecutionState.openaiReferenceAttemptCount, 0);
  assert.equal(registration.preExecutionState.deepSeekRouteProbeAttemptCount, 0);
  assert.equal(registration.preExecutionState.deepSeekNaturalItemAttemptCount, 0);
  assert.equal(registration.preExecutionState.referenceLabelSealHash, null);
  assert.equal(registration.preExecutionState.frameRegistrationHash, null);
  assert.equal(registration.preExecutionState.sampleManifestHash, null);
});
