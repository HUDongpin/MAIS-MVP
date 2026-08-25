import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateDeepSeekExecutionBundleV1,
  validateFinalEvaluationBundle,
  validateReferenceLabelSealExecutionBundle,
} from "./design-contract.mjs";
import {
  canExportAggregateReport,
  evaluateAggregatePublicationAuthorizationV1,
  validateAggregatePublicationConsistencyV1,
  validateIndependentReviewReceiptV1,
} from "./review-gate.mjs";
import { validateRuntimeSourceEnumerationReceiptV1, validateSampleAgainstFrame } from "./sample-contract.mjs";

const requiredOriginalInterfaces = [
  "NaturalCaPilotDesignRegistrationV4",
  "SamplingFrameRowV1",
  "SampleManifestV1",
  "MachineReferenceLabelV1",
  "ProviderAuthorizationV1",
  "ProviderAttemptReceiptV1",
  "ItemEvaluationResultV1",
  "FinalEvaluationReceiptV1",
  "IndependentReviewReceiptV1",
];

test("all standalone interfaces have one strict local schema and current frame/sample versions are explicit", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const names = (await readdir(new URL("./schemas/", import.meta.url))).filter((name) => name.endsWith(".schema.json")).sort();
  assert.equal(names.length, 45);
  assert.deepEqual(names.map((name) => name.replace(".schema.json", "")).sort(), [...registration.interfaces.schemaTitles].sort());
  for (const title of requiredOriginalInterfaces) assert.equal(registration.interfaces.schemaTitles.includes(title), true, title);
  assert.equal(registration.interfaces.semanticExecutionSamplingFrameSchema, "SamplingFrameRowV2");
  assert.equal(registration.interfaces.semanticExecutionFrameRegistrationSchema, "FrameRegistrationV2");
  assert.equal(registration.interfaces.semanticExecutionInitialSampleManifestSchema, "SampleManifestV2");
  assert.equal(registration.interfaces.semanticExecutionReplacementSampleManifestSchema, "SampleManifestV3");
  assert.equal(registration.interfaces.legacyStructuralSchemasAcceptedForExecution, false);
});

test("all cross-artifact validators are executable functions and structural schemas never substitute for them", async () => {
  for (const validator of [
    validateRuntimeSourceEnumerationReceiptV1,
    validateSampleAgainstFrame,
    validateReferenceLabelSealExecutionBundle,
    validateDeepSeekExecutionBundleV1,
    validateFinalEvaluationBundle,
    validateIndependentReviewReceiptV1,
    validateAggregatePublicationConsistencyV1,
  ]) assert.equal(typeof validator, "function");
  assert.deepEqual(evaluateAggregatePublicationAuthorizationV1(), {
    schemaVersion: "AggregatePublicationAuthorizationStatusV1",
    allowed: false,
    status: "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
    authorizationAvailable: false,
    callerSuppliedRootsAuthorized: false,
    blockerCodes: ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"],
    requiredCustodyArtifactSchema: "ProtectedExecutionCustodyRegistryV1",
    protectedRegistryRootHash: null,
    runnerHash: null,
  });
  assert.equal(canExportAggregateReport(), false);
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  assert.equal(registration.interfaces.structuralSchemaValidationAloneSufficient, false);
  assert.deepEqual(registration.interfaces.strongValidators, [
    "validateRuntimeSourceEnumerationReceiptV1",
    "validateSampleAgainstFrame",
    "validateReferenceLabelSealExecutionBundle",
    "validateDeepSeekExecutionBundleV1",
    "validateFinalEvaluationBundle",
    "validateIndependentReviewReceiptV1",
    "validateAggregatePublicationConsistencyV1",
  ]);
});

test("V4 candidate keeps the formal 17-code taxonomy and metric-eligible FALSE_ACCEPT_CORRECT_RESPONSE P0", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  assert.equal(registration.taxonomy.defectCodes.length, 17);
  assert.equal(registration.taxonomy.defectCodes.includes("FALSE_ACCEPT_CORRECT_RESPONSE"), true);
  assert.equal(registration.taxonomy.severityByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "P0");
  assert.equal(registration.taxonomy.familyByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "RESPONSE_ACCEPTANCE");
  assert.deepEqual(registration.taxonomy.acceptedCodeMapping.FALSE_ACCEPT_CORRECT_RESPONSE, ["FALSE_ACCEPT_CORRECT_RESPONSE"]);
  assert.equal(registration.taxonomy.falseAcceptCorrectResponseMetricCreditAllowed, true);
});

test("aggregate preflight evidence contains no item text and records why V1 lineage could not freeze", async () => {
  const evidence = JSON.parse(await readFile(new URL("./preflight-oversized-components-aggregate.json", import.meta.url), "utf8"));
  assert.equal(evidence.containsItemText, false);
  assert.deepEqual(evidence.aggregateOversizedGroups.map(({ approximateItemCount }) => approximateItemCount), [492, 1500, 810]);
  assert.equal(evidence.v3Disposition, "INHERITED_PREFLIGHT_EVIDENCE_ONLY_FINE_GRAINED_LINEAGE_RECOMPUTED_BEFORE_FRAME_FREEZE");
  assert.equal(evidence.activeDesignId, "MAIS-NATURAL-CA60-V4");
});

test("candidate hash dependency DAG is acyclic while statistical power remains explicitly unbound", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));
  assert.equal(registration.hashDependencyDag.cycleFree, true);
  assert.equal(registration.hashDependencyDag.naturalSchemaDerivedHashFieldsStructuralOnly, true);
  assert.equal(registration.hashDependencyDag.naturalSchemaExcludesRegistrationSectionCatalogSetAndSelfHashLiterals, true);
  assert.equal(registration.hashDependencyDag.registrationExcludesExternalStatisticalPowerArtifactHash, true);
  assert.equal(registration.hashDependencyDag.edges.includes("STATISTICAL_POWER_ARTIFACT->DESIGN_REGISTRATION_HASH"), false);
  assert.equal(registration.hashDependencyDag.edges.includes("DESIGN_REGISTRATION_HASH->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY"), false);
  assert.equal(power.designRegistrationHash, registration.registrationHash);
  assert.equal(registration.registrationHash, null);
  assert.equal(power.bindingStatus, "CANDIDATE_UNBOUND_PENDING_REGISTRATION_FREEZE");
  assert.equal(power.powerArtifactHash, null);
});
