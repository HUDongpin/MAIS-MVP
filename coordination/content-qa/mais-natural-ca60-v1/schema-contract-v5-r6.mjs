import ACTIVE_REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV2.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV4.schema.json" with { type: "json" };
import EXACT_EVIDENCE_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV2.schema.json" with { type: "json" };
import TERMINAL_PREDICATE_SCHEMA from "./schemas/DeepSeekC0TerminalPredicateReceiptV1.schema.json" with { type: "json" };
import TERMINAL_SET_SCHEMA from "./schemas/DeepSeekC0ExecutionSetV4.schema.json" with { type: "json" };
import INTEGRITY_SCHEMA from "./schemas/ExecutionIntegrityEvidenceV2.schema.json" with { type: "json" };
import SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV4.schema.json" with { type: "json" };
import CAPTURE_SCHEMA from "./schemas/ProviderEvidenceCaptureReceiptV1.schema.json" with { type: "json" };
import ROUTE_SCHEMA from "./schemas/AuthenticatedRouteEvidenceReceiptV2.schema.json" with { type: "json" };
import AUTHORIZATION_SCHEMA from "./schemas/ProviderAuthorizationV5.schema.json" with { type: "json" };
import REQUEST_SCHEMA from "./schemas/ProviderRequestArtifactV5.schema.json" with { type: "json" };
import RAW_SCHEMA from "./schemas/ProviderRawResponseArtifactV1.schema.json" with { type: "json" };
import RAW_BINDING_SCHEMA from "./schemas/ProviderRawResponseBindingReceiptV1.schema.json" with { type: "json" };
import SUBRECEIPT_SCHEMA from "./schemas/CommandTransitionSubreceiptV1.schema.json" with { type: "json" };
import JOURNAL_SCHEMA from "./schemas/CommandTransitionJournalReceiptV1.schema.json" with { type: "json" };
import PLAN_SCHEMA from "./schemas/ExecutionPlanReceiptV2.schema.json" with { type: "json" };
import DISPATCH_AUDIT_SCHEMA from "./schemas/StateBoundDispatchAuditReceiptV2.schema.json" with { type: "json" };
import DISPATCH_PERMIT_SCHEMA from "./schemas/ProviderDispatchPermitV4.schema.json" with { type: "json" };
import RESOLVED_ATTEMPT_SCHEMA from "./schemas/ResolvedProviderAttemptReceiptV1.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV5.schema.json" with { type: "json" };
import PROTECTED_ROUTE_SOURCE_SCHEMA from "./schemas/ProtectedProviderEvidenceArtifactV1.schema.json" with { type: "json" };
import REFERENCE_SEAL_SCHEMA from "./schemas/MachineReferenceSealV5.schema.json" with { type: "json" };
import REFERENCE_VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV3.schema.json" with { type: "json" };
import DEEPSEEK_EXECUTION_REGISTRATION_SCHEMA from "./schemas/DeepSeekExecutionRegistrationV4.schema.json" with { type: "json" };

import {
  validateClosedSchemaAgainstV5R5,
  validateClosedSchemaV5R5,
  validateClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedArtifactV5R5,
  V5_R5_SCHEMA_CATALOG,
} from "./schema-contract-v5-r5.mjs";

const R6_SCHEMAS = Object.freeze({
  NaturalCaExecutionRunnerSupersedingRegistrationV2: ACTIVE_REGISTRATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV4: REVIEW_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV2: EXACT_EVIDENCE_SCHEMA,
  DeepSeekC0TerminalPredicateReceiptV1: TERMINAL_PREDICATE_SCHEMA,
  DeepSeekC0ExecutionSetV4: TERMINAL_SET_SCHEMA,
  ExecutionIntegrityEvidenceV2: INTEGRITY_SCHEMA,
  NaturalCaAggregateScoreReceiptV4: SCORE_SCHEMA,
  ProviderEvidenceCaptureReceiptV1: CAPTURE_SCHEMA,
  AuthenticatedRouteEvidenceReceiptV2: ROUTE_SCHEMA,
  ProviderAuthorizationV5: AUTHORIZATION_SCHEMA,
  ProviderRequestArtifactV5: REQUEST_SCHEMA,
  ProviderRawResponseArtifactV1: RAW_SCHEMA,
  ProviderRawResponseBindingReceiptV1: RAW_BINDING_SCHEMA,
  CommandTransitionSubreceiptV1: SUBRECEIPT_SCHEMA,
  CommandTransitionJournalReceiptV1: JOURNAL_SCHEMA,
  ExecutionPlanReceiptV2: PLAN_SCHEMA,
  StateBoundDispatchAuditReceiptV2: DISPATCH_AUDIT_SCHEMA,
  ProviderDispatchPermitV4: DISPATCH_PERMIT_SCHEMA,
  ResolvedProviderAttemptReceiptV1: RESOLVED_ATTEMPT_SCHEMA,
  NaturalCaRunnerCommandReceiptV5: COMMAND_RECEIPT_SCHEMA,
  ProtectedProviderEvidenceArtifactV1: PROTECTED_ROUTE_SOURCE_SCHEMA,
  MachineReferenceSealV5: REFERENCE_SEAL_SCHEMA,
  ReferenceSealValidationReceiptV3: REFERENCE_VALIDATION_SCHEMA,
  DeepSeekExecutionRegistrationV4: DEEPSEEK_EXECUTION_REGISTRATION_SCHEMA,
});

export function validateClosedSchemaV5R6(value, schemaName = value?.schemaVersion) {
  const schema = R6_SCHEMAS[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema) : validateClosedSchemaV5R5(value, schemaName);
}

export function validateClosedSelfHashedArtifactV5R6(value, schemaName = value?.schemaVersion) {
  const schema = R6_SCHEMAS[schemaName];
  return schema ? validateClosedSelfHashedAgainstV5R5(value, schema)
    : validateClosedSelfHashedArtifactV5R5(value, schemaName);
}

export function assertClosedSelfHashedArtifactV5R6(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R6(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R6_SCHEMA_CATALOG = Object.freeze({ ...V5_R5_SCHEMA_CATALOG, ...R6_SCHEMAS });
