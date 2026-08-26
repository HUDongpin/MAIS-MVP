import ATTEMPT_GRAPH_SCHEMA from "./schemas/AttemptGraphReconstructionReceiptV2.schema.json" with { type: "json" };
import RECOVERY_AUTH_SCHEMA from "./schemas/AttemptCustodyReconciliationAuthorizationV1.schema.json" with { type: "json" };
import RECOVERY_RECEIPT_SCHEMA from "./schemas/AttemptCustodyReconciliationReceiptV1.schema.json" with { type: "json" };
import TRUSTED_SOURCE_SCHEMA from "./schemas/TrustedProviderEvidenceSourceV1.schema.json" with { type: "json" };
import TRUSTED_ENVELOPE_SCHEMA from "./schemas/TrustedProviderEvidenceEnvelopeV1.schema.json" with { type: "json" };
import STATIC_IMPORT_SCHEMA from "./schemas/IndependentStaticImportGraphReceiptV1.schema.json" with { type: "json" };
import FORBIDDEN_SCAN_SCHEMA from "./schemas/ForbiddenPrimaryScorerPathScanReceiptV1.schema.json" with { type: "json" };
import COMMAND_RUNTIME_SCHEMA from "./schemas/IndependentCommandRuntimeReceiptV1.schema.json" with { type: "json" };
import SOURCE_ENUMERATION_SCHEMA from "./schemas/IndependentSourceEnumerationReceiptV1.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV6.schema.json" with { type: "json" };
import OBSERVED_SCHEMA from "./schemas/ObservedEvaluationLedgerV2.schema.json" with { type: "json" };
import COUNTERFACTUAL_SCHEMA from "./schemas/CounterfactualLedgerV2.schema.json" with { type: "json" };
import METRIC_INPUT_SCHEMA from "./schemas/MetricInputLedgerV2.schema.json" with { type: "json" };
import FINAL_SCHEMA from "./schemas/FinalEvaluationReceiptV2.schema.json" with { type: "json" };
import TERMINAL_SCHEMA from "./schemas/TerminalExecutionDecisionReceiptV1.schema.json" with { type: "json" };
import AGGREGATE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV6.schema.json" with { type: "json" };
import REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV4.schema.json" with { type: "json" };
import EXACT_REGISTRATION_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV4.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV7.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSchemaV5R7,
  validateClosedSelfHashedArtifactV5R7,
  V5_R7_SCHEMA_CATALOG,
} from "./schema-contract-v5-r7.mjs";

const R8_SCHEMAS = Object.freeze({
  AttemptGraphReconstructionReceiptV2: ATTEMPT_GRAPH_SCHEMA,
  AttemptCustodyReconciliationAuthorizationV1: RECOVERY_AUTH_SCHEMA,
  AttemptCustodyReconciliationReceiptV1: RECOVERY_RECEIPT_SCHEMA,
  TrustedProviderEvidenceSourceV1: TRUSTED_SOURCE_SCHEMA,
  TrustedProviderEvidenceEnvelopeV1: TRUSTED_ENVELOPE_SCHEMA,
  IndependentStaticImportGraphReceiptV1: STATIC_IMPORT_SCHEMA,
  ForbiddenPrimaryScorerPathScanReceiptV1: FORBIDDEN_SCAN_SCHEMA,
  IndependentCommandRuntimeReceiptV1: COMMAND_RUNTIME_SCHEMA,
  IndependentSourceEnumerationReceiptV1: SOURCE_ENUMERATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV6: REVIEW_SCHEMA,
  ObservedEvaluationLedgerV2: OBSERVED_SCHEMA,
  CounterfactualLedgerV2: COUNTERFACTUAL_SCHEMA,
  MetricInputLedgerV2: METRIC_INPUT_SCHEMA,
  FinalEvaluationReceiptV2: FINAL_SCHEMA,
  TerminalExecutionDecisionReceiptV1: TERMINAL_SCHEMA,
  NaturalCaAggregateScoreReceiptV6: AGGREGATE_SCHEMA,
  NaturalCaExecutionRunnerSupersedingRegistrationV4: REGISTRATION_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV4: EXACT_REGISTRATION_SCHEMA,
  NaturalCaRunnerCommandReceiptV7: COMMAND_RECEIPT_SCHEMA,
});

export function validateClosedSchemaV5R8(value, schemaName = value?.schemaVersion) {
  const schema = R8_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : validateClosedSchemaV5R7(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R8(value, schemaName = value?.schemaVersion) {
  const schema = R8_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R7(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R8(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R8(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R8_SCHEMA_CATALOG = Object.freeze({ ...V5_R7_SCHEMA_CATALOG, ...R8_SCHEMAS });
