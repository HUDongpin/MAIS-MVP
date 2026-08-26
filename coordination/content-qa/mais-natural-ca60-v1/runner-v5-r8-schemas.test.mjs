import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  V5_R8_SCHEMA_CATALOG,
  validateClosedSchemaV5R8,
} from "./schema-contract-v5-r8.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const R8_SCHEMA_NAMES = Object.freeze([
  "AttemptGraphReconstructionReceiptV2",
  "AttemptCustodyReconciliationAuthorizationV1",
  "AttemptCustodyReconciliationReceiptV1",
  "TrustedProviderEvidenceSourceV1",
  "TrustedProviderEvidenceEnvelopeV1",
  "IndependentStaticImportGraphReceiptV1",
  "ForbiddenPrimaryScorerPathScanReceiptV1",
  "IndependentCommandRuntimeReceiptV1",
  "IndependentSourceEnumerationReceiptV1",
  "IndependentExecutionRunnerReviewReceiptV6",
  "ObservedEvaluationLedgerV2",
  "CounterfactualLedgerV2",
  "MetricInputLedgerV2",
  "FinalEvaluationReceiptV2",
  "TerminalExecutionDecisionReceiptV1",
  "NaturalCaAggregateScoreReceiptV6",
  "NaturalCaExecutionRunnerSupersedingRegistrationV4",
  "ExactRunnerSupersedingRegistrationEvidenceV4",
  "NaturalCaRunnerCommandReceiptV7",
]);

test("every R8 receipt schema is tracked, top-level closed, self-hashed, and catalogued", async () => {
  assert.equal(new Set(R8_SCHEMA_NAMES).size, R8_SCHEMA_NAMES.length);
  for (const schemaName of R8_SCHEMA_NAMES) {
    const schema = JSON.parse(await readFile(path.join(here, "schemas", `${schemaName}.schema.json`), "utf8"));
    assert.equal(schema.type, "object", `${schemaName} must be an object`);
    assert.equal(schema.additionalProperties, false, `${schemaName} must be top-level closed`);
    assert.ok(schema.required.includes("schemaVersion"));
    assert.ok(schema.required.includes("selfHash"));
    assert.equal(schema.properties.schemaVersion.const, schemaName);
    assert.deepEqual(V5_R8_SCHEMA_CATALOG[schemaName], schema);
  }
});

test("R8 schema validation fails unknown and extra fields closed", () => {
  assert.match(validateClosedSchemaV5R8({ schemaVersion: "UnknownR8Schema" })[0], /unsupported/iu);
  const value = { schemaVersion: "TerminalExecutionDecisionReceiptV1", unexpected: true };
  assert.ok(validateClosedSchemaV5R8(value).some((error) => error.includes("unexpected")));
});
