import CLOSEOUT_SCHEMA from "./schemas/A07RunnerCloseoutReceiptV3.schema.json" with { type: "json" };
import EXACT_REGISTRATION_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV7.schema.json" with { type: "json" };
import FORBIDDEN_SCAN_SCHEMA from "./schemas/ForbiddenPrimaryScorerPathScanReceiptV2.schema.json" with { type: "json" };
import COMMAND_RUNTIME_SCHEMA from "./schemas/IndependentCommandRuntimeReceiptV2.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV9.schema.json" with { type: "json" };
import SOURCE_ENUMERATION_SCHEMA from "./schemas/IndependentSourceEnumerationReceiptV2.schema.json" with { type: "json" };
import STATIC_IMPORT_GRAPH_SCHEMA from "./schemas/IndependentStaticImportGraphReceiptV2.schema.json" with { type: "json" };
import SEAL_SCHEMA from "./schemas/MachineReferenceSealV7.schema.json" with { type: "json" };
import REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV7.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV10.schema.json" with { type: "json" };
import VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV5.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSchemaV5R10,
  validateClosedSelfHashedArtifactV5R10,
  V5_R10_SCHEMA_CATALOG,
} from "./schema-contract-v5-r10.mjs";

const R11_SCHEMAS = Object.freeze({
  A07RunnerCloseoutReceiptV3: CLOSEOUT_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV7: EXACT_REGISTRATION_SCHEMA,
  ForbiddenPrimaryScorerPathScanReceiptV2: FORBIDDEN_SCAN_SCHEMA,
  IndependentCommandRuntimeReceiptV2: COMMAND_RUNTIME_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV9: REVIEW_SCHEMA,
  IndependentSourceEnumerationReceiptV2: SOURCE_ENUMERATION_SCHEMA,
  IndependentStaticImportGraphReceiptV2: STATIC_IMPORT_GRAPH_SCHEMA,
  MachineReferenceSealV7: SEAL_SCHEMA,
  NaturalCaExecutionRunnerSupersedingRegistrationV7: REGISTRATION_SCHEMA,
  NaturalCaRunnerCommandReceiptV10: COMMAND_RECEIPT_SCHEMA,
  ReferenceSealValidationReceiptV5: VALIDATION_SCHEMA,
});

export function validateClosedSchemaV5R11(value, schemaName = value?.schemaVersion) {
  const schema = R11_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : validateClosedSchemaV5R10(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R11(value, schemaName = value?.schemaVersion) {
  const schema = R11_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R10(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R11(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R11(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R11_SCHEMA_CATALOG = Object.freeze({ ...V5_R10_SCHEMA_CATALOG, ...R11_SCHEMAS });
