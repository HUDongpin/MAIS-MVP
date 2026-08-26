import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  V5_R7_SCHEMA_CATALOG,
  validateClosedSchemaV5R7,
} from "./schema-contract-v5-r7.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const R7_SCHEMA_NAMES = Object.freeze([
  "NaturalCaExecutionRunnerSupersedingRegistrationV3",
  "IndependentExecutionRunnerReviewReceiptV5",
  "ExactRunnerSupersedingRegistrationEvidenceV3",
  "ProviderEvidenceCaptureReceiptV2",
  "ProviderRouteProbeAttemptReceiptV2",
  "OwnerEvidenceAttestationReceiptV1",
  "AuthenticatedRouteEvidenceReceiptV3",
  "CommandTransitionIntentReceiptV1",
  "CommandTransitionJournalReceiptV2",
  "RoleAttemptEvidenceReceiptV1",
  "SemanticDispatchVerificationReceiptV1",
  "CanaryGateReceiptV3",
  "ProviderAttemptCommitIntentV1",
  "ResolvedProviderAttemptReceiptV2",
  "AttemptGraphReconstructionReceiptV1",
  "SemanticDispatchAuthorityReceiptV1",
  "MachineReferenceSealV6",
  "ReferenceSealValidationReceiptV4",
  "NaturalCaAggregateScoreReceiptV5",
  "NaturalCaScoringInputV1",
  "NaturalCaRunnerCommandReceiptV6",
  "ReferenceDispatchAuthorityReceiptV1",
  "ProviderDispatchPermitV5",
]);

test("every V5-R7 artifact schema is tracked, closed, self-hashed, and catalogued by exact version", async () => {
  assert.equal(new Set(R7_SCHEMA_NAMES).size, R7_SCHEMA_NAMES.length);
  for (const schemaName of R7_SCHEMA_NAMES) {
    const schemaPath = path.join(here, "schemas", `${schemaName}.schema.json`);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    assert.equal(schema.type, "object", `${schemaName} must be an object schema`);
    assert.equal(schema.additionalProperties, false, `${schemaName} must reject unknown fields`);
    assert.ok(schema.required.includes("schemaVersion"), `${schemaName} must require schemaVersion`);
    assert.ok(schema.required.includes("selfHash"), `${schemaName} must require selfHash`);
    assert.equal(schema.properties.schemaVersion.const, schemaName,
      `${schemaName} must bind its exact schemaVersion`);
    assert.ok(schema.properties.selfHash, `${schemaName} must define selfHash`);
    assert.deepEqual(V5_R7_SCHEMA_CATALOG[schemaName], schema,
      `${schemaName} catalog entry differs from its tracked JSON schema`);
  }
});

test("V5-R7 catalog remains closed and fails unknown or extra artifact fields", () => {
  const unknownErrors = validateClosedSchemaV5R7({ schemaVersion: "UnknownV5R7Schema" });
  assert.equal(unknownErrors.length, 1);
  assert.match(unknownErrors[0], /unsupported .*schema.*UnknownV5R7Schema/iu);
  const minimal = {
    schemaVersion: "ProviderDispatchPermitV5",
    unexpectedField: "must-fail-closed",
  };
  const errors = validateClosedSchemaV5R7(minimal, minimal.schemaVersion);
  assert.ok(errors.some((message) => message.includes("unexpectedField")),
    `unknown field was not rejected: ${errors.join("; ")}`);
});
