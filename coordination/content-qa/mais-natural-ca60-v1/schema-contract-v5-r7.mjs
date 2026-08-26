import ACTIVE_REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV3.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV5.schema.json" with { type: "json" };
import EXACT_EVIDENCE_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV3.schema.json" with { type: "json" };
import CAPTURE_SCHEMA from "./schemas/ProviderEvidenceCaptureReceiptV2.schema.json" with { type: "json" };
import PROBE_SCHEMA from "./schemas/ProviderRouteProbeAttemptReceiptV2.schema.json" with { type: "json" };
import ATTESTATION_SCHEMA from "./schemas/OwnerEvidenceAttestationReceiptV1.schema.json" with { type: "json" };
import ROUTE_SCHEMA from "./schemas/AuthenticatedRouteEvidenceReceiptV3.schema.json" with { type: "json" };
import INTENT_SCHEMA from "./schemas/CommandTransitionIntentReceiptV1.schema.json" with { type: "json" };
import JOURNAL_SCHEMA from "./schemas/CommandTransitionJournalReceiptV2.schema.json" with { type: "json" };
import ROLE_ATTEMPT_SCHEMA from "./schemas/RoleAttemptEvidenceReceiptV1.schema.json" with { type: "json" };
import SEMANTIC_DISPATCH_SCHEMA from "./schemas/SemanticDispatchVerificationReceiptV1.schema.json" with { type: "json" };
import CANARY_GATE_SCHEMA from "./schemas/CanaryGateReceiptV3.schema.json" with { type: "json" };
import ATTEMPT_INTENT_SCHEMA from "./schemas/ProviderAttemptCommitIntentV1.schema.json" with { type: "json" };
import RESOLVED_ATTEMPT_SCHEMA from "./schemas/ResolvedProviderAttemptReceiptV2.schema.json" with { type: "json" };
import ATTEMPT_GRAPH_SCHEMA from "./schemas/AttemptGraphReconstructionReceiptV1.schema.json" with { type: "json" };
import SEMANTIC_AUTHORITY_SCHEMA from "./schemas/SemanticDispatchAuthorityReceiptV1.schema.json" with { type: "json" };
import MACHINE_REFERENCE_SEAL_SCHEMA from "./schemas/MachineReferenceSealV6.schema.json" with { type: "json" };
import REFERENCE_VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV4.schema.json" with { type: "json" };
import AGGREGATE_SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV5.schema.json" with { type: "json" };
import SCORING_INPUT_V1_SCHEMA from "./schemas/NaturalCaScoringInputV1.schema.json" with { type: "json" };
import BASE_AGGREGATE_SCORE_V1_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV1.schema.json" with { type: "json" };
import COMMAND_RECEIPT_V6_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV6.schema.json" with { type: "json" };
import REFERENCE_AUTHORITY_SCHEMA from "./schemas/ReferenceDispatchAuthorityReceiptV1.schema.json" with { type: "json" };
import DISPATCH_PERMIT_V5_SCHEMA from "./schemas/ProviderDispatchPermitV5.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSchemaV5R6,
  validateClosedSelfHashedArtifactV5R6,
  V5_R6_SCHEMA_CATALOG,
} from "./schema-contract-v5-r6.mjs";

const R7_SCHEMAS = Object.freeze({
  NaturalCaExecutionRunnerSupersedingRegistrationV3: ACTIVE_REGISTRATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV5: REVIEW_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV3: EXACT_EVIDENCE_SCHEMA,
  ProviderEvidenceCaptureReceiptV2: CAPTURE_SCHEMA,
  ProviderRouteProbeAttemptReceiptV2: PROBE_SCHEMA,
  OwnerEvidenceAttestationReceiptV1: ATTESTATION_SCHEMA,
  AuthenticatedRouteEvidenceReceiptV3: ROUTE_SCHEMA,
  CommandTransitionIntentReceiptV1: INTENT_SCHEMA,
  CommandTransitionJournalReceiptV2: JOURNAL_SCHEMA,
  RoleAttemptEvidenceReceiptV1: ROLE_ATTEMPT_SCHEMA,
  SemanticDispatchVerificationReceiptV1: SEMANTIC_DISPATCH_SCHEMA,
  CanaryGateReceiptV3: CANARY_GATE_SCHEMA,
  ProviderAttemptCommitIntentV1: ATTEMPT_INTENT_SCHEMA,
  ResolvedProviderAttemptReceiptV2: RESOLVED_ATTEMPT_SCHEMA,
  AttemptGraphReconstructionReceiptV1: ATTEMPT_GRAPH_SCHEMA,
  SemanticDispatchAuthorityReceiptV1: SEMANTIC_AUTHORITY_SCHEMA,
  MachineReferenceSealV6: MACHINE_REFERENCE_SEAL_SCHEMA,
  ReferenceSealValidationReceiptV4: REFERENCE_VALIDATION_SCHEMA,
  NaturalCaAggregateScoreReceiptV5: AGGREGATE_SCORE_SCHEMA,
  NaturalCaScoringInputV1: SCORING_INPUT_V1_SCHEMA,
  NaturalCaAggregateScoreReceiptV1: BASE_AGGREGATE_SCORE_V1_SCHEMA,
  NaturalCaRunnerCommandReceiptV6: COMMAND_RECEIPT_V6_SCHEMA,
  ReferenceDispatchAuthorityReceiptV1: REFERENCE_AUTHORITY_SCHEMA,
  ProviderDispatchPermitV5: DISPATCH_PERMIT_V5_SCHEMA,
});

export function validateClosedSchemaV5R7(value, schemaName = value?.schemaVersion) {
  const schema = R7_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : validateClosedSchemaV5R6(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R7(value, schemaName = value?.schemaVersion) {
  const schema = R7_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R6(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R7(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R7(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R7_SCHEMA_CATALOG = Object.freeze({ ...V5_R6_SCHEMA_CATALOG, ...R7_SCHEMAS });
