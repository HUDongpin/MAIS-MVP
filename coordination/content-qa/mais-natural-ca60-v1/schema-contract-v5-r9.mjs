import ATTEMPT_GRAPH_SCHEMA from "./schemas/AttemptGraphReconstructionReceiptV2.schema.json" with { type: "json" };
import RECOVERY_AUTH_SCHEMA from "./schemas/AttemptCustodyReconciliationAuthorizationV1.schema.json" with { type: "json" };
import RECOVERY_RECEIPT_SCHEMA from "./schemas/AttemptCustodyReconciliationReceiptV1.schema.json" with { type: "json" };
import RECOVERY_COMMAND_BUNDLE_SCHEMA from "./schemas/AttemptRecoveryCommandAuthorizationBundleV1.schema.json" with { type: "json" };
import TRUSTED_SOURCE_SCHEMA from "./schemas/TrustedProviderEvidenceSourceV1.schema.json" with { type: "json" };
import TRUSTED_ENVELOPE_SCHEMA from "./schemas/TrustedProviderEvidenceEnvelopeV2.schema.json" with { type: "json" };
import ROUTE_PROBE_GRAPH_SCHEMA from "./schemas/RouteProbeCustodyGraphV1.schema.json" with { type: "json" };
import ROUTE_PROBE_ARTIFACT_SET_SCHEMA from "./schemas/RouteProbeArtifactSetV1.schema.json" with { type: "json" };
import STATIC_IMPORT_SCHEMA from "./schemas/IndependentStaticImportGraphReceiptV1.schema.json" with { type: "json" };
import FORBIDDEN_SCAN_SCHEMA from "./schemas/ForbiddenPrimaryScorerPathScanReceiptV1.schema.json" with { type: "json" };
import COMMAND_RUNTIME_SCHEMA from "./schemas/IndependentCommandRuntimeReceiptV1.schema.json" with { type: "json" };
import SOURCE_ENUMERATION_SCHEMA from "./schemas/IndependentSourceEnumerationReceiptV1.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV7.schema.json" with { type: "json" };
import OBSERVED_SCHEMA from "./schemas/ObservedEvaluationLedgerV2.schema.json" with { type: "json" };
import COUNTERFACTUAL_SCHEMA from "./schemas/CounterfactualLedgerV2.schema.json" with { type: "json" };
import METRIC_INPUT_SCHEMA from "./schemas/MetricInputLedgerV2.schema.json" with { type: "json" };
import FINAL_SCHEMA from "./schemas/FinalEvaluationReceiptV2.schema.json" with { type: "json" };
import TERMINAL_SCHEMA from "./schemas/TerminalExecutionDecisionReceiptV2.schema.json" with { type: "json" };
import DECISION_EVIDENCE_SCHEMA from "./schemas/DecisionEvidenceReceiptV1.schema.json" with { type: "json" };
import CLOSEOUT_SCHEMA from "./schemas/A07RunnerCloseoutReceiptV1.schema.json" with { type: "json" };
import AGGREGATE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV7.schema.json" with { type: "json" };
import REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV5.schema.json" with { type: "json" };
import EXACT_REGISTRATION_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV5.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV8.schema.json" with { type: "json" };
import TERMINAL_C0_SCOPE_SCHEMA from "./schemas/TerminalC0RequirementScopeV1.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSchemaV5R8,
  validateClosedSelfHashedArtifactV5R8,
  V5_R8_SCHEMA_CATALOG,
} from "./schema-contract-v5-r8.mjs";

const R9_SCHEMAS = Object.freeze({
  AttemptGraphReconstructionReceiptV2: ATTEMPT_GRAPH_SCHEMA,
  AttemptCustodyReconciliationAuthorizationV1: RECOVERY_AUTH_SCHEMA,
  AttemptCustodyReconciliationReceiptV1: RECOVERY_RECEIPT_SCHEMA,
  AttemptRecoveryCommandAuthorizationBundleV1: RECOVERY_COMMAND_BUNDLE_SCHEMA,
  TrustedProviderEvidenceSourceV1: TRUSTED_SOURCE_SCHEMA,
  TrustedProviderEvidenceEnvelopeV2: TRUSTED_ENVELOPE_SCHEMA,
  RouteProbeCustodyGraphV1: ROUTE_PROBE_GRAPH_SCHEMA,
  RouteProbeArtifactSetV1: ROUTE_PROBE_ARTIFACT_SET_SCHEMA,
  IndependentStaticImportGraphReceiptV1: STATIC_IMPORT_SCHEMA,
  ForbiddenPrimaryScorerPathScanReceiptV1: FORBIDDEN_SCAN_SCHEMA,
  IndependentCommandRuntimeReceiptV1: COMMAND_RUNTIME_SCHEMA,
  IndependentSourceEnumerationReceiptV1: SOURCE_ENUMERATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV7: REVIEW_SCHEMA,
  ObservedEvaluationLedgerV2: OBSERVED_SCHEMA,
  CounterfactualLedgerV2: COUNTERFACTUAL_SCHEMA,
  MetricInputLedgerV2: METRIC_INPUT_SCHEMA,
  FinalEvaluationReceiptV2: FINAL_SCHEMA,
  TerminalExecutionDecisionReceiptV2: TERMINAL_SCHEMA,
  DecisionEvidenceReceiptV1: DECISION_EVIDENCE_SCHEMA,
  A07RunnerCloseoutReceiptV1: CLOSEOUT_SCHEMA,
  NaturalCaAggregateScoreReceiptV7: AGGREGATE_SCHEMA,
  NaturalCaExecutionRunnerSupersedingRegistrationV5: REGISTRATION_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV5: EXACT_REGISTRATION_SCHEMA,
  NaturalCaRunnerCommandReceiptV8: COMMAND_RECEIPT_SCHEMA,
  TerminalC0RequirementScopeV1: TERMINAL_C0_SCOPE_SCHEMA,
});

export function validateClosedSchemaV5R9(value, schemaName = value?.schemaVersion) {
  const schema = R9_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : validateClosedSchemaV5R8(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R9(value, schemaName = value?.schemaVersion) {
  const schema = R9_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R8(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R9(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R9(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R9_SCHEMA_CATALOG = Object.freeze({ ...V5_R8_SCHEMA_CATALOG, ...R9_SCHEMAS });
