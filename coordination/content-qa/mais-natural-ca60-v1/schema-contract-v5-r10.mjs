import CLOSEOUT_SCHEMA from "./schemas/A07RunnerCloseoutReceiptV2.schema.json" with { type: "json" };
import EXACT_REGISTRATION_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV6.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV8.schema.json" with { type: "json" };
import REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV6.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV9.schema.json" with { type: "json" };
import PRE_EXECUTION_FAILURE_SCHEMA from "./schemas/RunnerPreExecutionFailureReceiptV1.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSchemaV5R9,
  validateClosedSelfHashedArtifactV5R9,
  V5_R9_SCHEMA_CATALOG,
} from "./schema-contract-v5-r9.mjs";

const R10_SCHEMAS = Object.freeze({
  A07RunnerCloseoutReceiptV2: CLOSEOUT_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV6: EXACT_REGISTRATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV8: REVIEW_SCHEMA,
  NaturalCaExecutionRunnerSupersedingRegistrationV6: REGISTRATION_SCHEMA,
  NaturalCaRunnerCommandReceiptV9: COMMAND_RECEIPT_SCHEMA,
  RunnerPreExecutionFailureReceiptV1: PRE_EXECUTION_FAILURE_SCHEMA,
});

export function validateClosedSchemaV5R10(value, schemaName = value?.schemaVersion) {
  const schema = R10_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : validateClosedSchemaV5R9(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R10(value, schemaName = value?.schemaVersion) {
  const schema = R10_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R9(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R10(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R10(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R10_SCHEMA_CATALOG = Object.freeze({ ...V5_R9_SCHEMA_CATALOG, ...R10_SCHEMAS });
