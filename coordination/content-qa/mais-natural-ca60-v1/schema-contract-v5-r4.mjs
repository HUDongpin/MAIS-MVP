import REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerRegistrationV3.schema.json" with { type: "json" };
import INVENTORY_SCHEMA from "./schemas/SampleExecutionInventoryV2.schema.json" with { type: "json" };
import PRICE_SCHEMA from "./schemas/ProviderPriceSnapshotV2.schema.json" with { type: "json" };
import AUTHORIZATION_SCHEMA from "./schemas/ProviderAuthorizationV4.schema.json" with { type: "json" };
import REQUEST_SCHEMA from "./schemas/ProviderRequestArtifactV4.schema.json" with { type: "json" };
import EVENT_SCHEMA from "./schemas/ProviderEventReceiptV4.schema.json" with { type: "json" };
import RESERVATION_SCHEMA from "./schemas/ProviderDispatchReservationV2.schema.json" with { type: "json" };
import COMPLETION_SCHEMA from "./schemas/ProviderDispatchCompletionV2.schema.json" with { type: "json" };
import ROUTE_SCHEMA from "./schemas/RouteEvidenceBundleV1.schema.json" with { type: "json" };
import EXECUTION_REGISTRATION_SCHEMA from "./schemas/DeepSeekExecutionRegistrationV2.schema.json" with { type: "json" };
import C0_EXECUTION_SET_SCHEMA from "./schemas/DeepSeekC0ExecutionSetV2.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV2.schema.json" with { type: "json" };
import ROUTE_AUTHORIZATION_SCHEMA from "./schemas/RouteProbeAuthorizationV1.schema.json" with { type: "json" };
import ROUTE_ATTEMPT_SCHEMA from "./schemas/ProviderRouteProbeAttemptReceiptV1.schema.json" with { type: "json" };
import ROUTE_LEAF_SCHEMA from "./schemas/ProviderRouteEvidenceLeafV1.schema.json" with { type: "json" };
import CREDENTIAL_SCHEMA from "./schemas/CredentialReadinessReceiptV2.schema.json" with { type: "json" };
import OWNER_GRANT_SCHEMA from "./schemas/OwnerProviderGrantV2.schema.json" with { type: "json" };
import ROLE_OUTPUT_SCHEMA from "./schemas/ProviderRoleOutputV1.schema.json" with { type: "json" };
import DISPATCH_PERMIT_SCHEMA from "./schemas/ProviderDispatchPermitV3.schema.json" with { type: "json" };
import REFERENCE_SEAL_SCHEMA from "./schemas/MachineReferenceSealV3.schema.json" with { type: "json" };
import REFERENCE_LABEL_SCHEMA from "./schemas/MachineReferenceLabelV1.schema.json" with { type: "json" };
import RAW_REFERENCE_LABEL_SCHEMA from "./schemas/RawMachineReferenceLabelV1.schema.json" with { type: "json" };
import ADJUDICATION_TRIGGER_SCHEMA from "./schemas/OpenAIAdjudicationTriggerReceiptV1.schema.json" with { type: "json" };
import REFERENCE_VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV1.schema.json" with { type: "json" };
import ITEM_RESULT_SCHEMA from "./schemas/ItemEvaluationResultV2.schema.json" with { type: "json" };
import AGGREGATE_SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV2.schema.json" with { type: "json" };
import EXECUTION_PLAN_SCHEMA from "./schemas/ExecutionPlanReceiptV1.schema.json" with { type: "json" };
import CANARY_GATE_SCHEMA from "./schemas/CanaryGateReceiptV1.schema.json" with { type: "json" };
import FINAL_VERIFICATION_SCHEMA from "./schemas/FinalExecutionVerificationReceiptV1.schema.json" with { type: "json" };
import RESULT_REVIEW_SCHEMA from "./schemas/IndependentExecutionResultReviewReceiptV1.schema.json" with { type: "json" };
import CLAIM_REVIEW_SCHEMA from "./schemas/ClaimBoundaryReviewReceiptV2.schema.json" with { type: "json" };
import PUBLICATION_AUTHORIZATION_SCHEMA from "./schemas/AggregatePublicationAuthorizationV1.schema.json" with { type: "json" };
import PUBLIC_REPORT_SCHEMA from "./schemas/PublicAggregateReportV1.schema.json" with { type: "json" };
import COMMAND_RECEIPT_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV3.schema.json" with { type: "json" };
import WORKFLOW_INDEX_SCHEMA from "./schemas/ProtectedWorkflowIndexV1.schema.json" with { type: "json" };
import COMPLETED_ITEM_MARKER_SCHEMA from "./schemas/CompletedItemCommitMarkerV2.schema.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const SCHEMAS = Object.freeze({
  NaturalCaExecutionRunnerRegistrationV3: REGISTRATION_SCHEMA,
  SampleExecutionInventoryV2: INVENTORY_SCHEMA,
  ProviderPriceSnapshotV2: PRICE_SCHEMA,
  ProviderAuthorizationV4: AUTHORIZATION_SCHEMA,
  ProviderRequestArtifactV4: REQUEST_SCHEMA,
  ProviderEventReceiptV4: EVENT_SCHEMA,
  ProviderDispatchReservationV2: RESERVATION_SCHEMA,
  ProviderDispatchCompletionV2: COMPLETION_SCHEMA,
  RouteEvidenceBundleV1: ROUTE_SCHEMA,
  DeepSeekExecutionRegistrationV2: EXECUTION_REGISTRATION_SCHEMA,
  DeepSeekC0ExecutionSetV2: C0_EXECUTION_SET_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV2: REVIEW_SCHEMA,
  RouteProbeAuthorizationV1: ROUTE_AUTHORIZATION_SCHEMA,
  ProviderRouteProbeAttemptReceiptV1: ROUTE_ATTEMPT_SCHEMA,
  ProviderRouteEvidenceLeafV1: ROUTE_LEAF_SCHEMA,
  CredentialReadinessReceiptV2: CREDENTIAL_SCHEMA,
  OwnerProviderGrantV2: OWNER_GRANT_SCHEMA,
  ProviderRoleOutputV1: ROLE_OUTPUT_SCHEMA,
  ProviderDispatchPermitV3: DISPATCH_PERMIT_SCHEMA,
  MachineReferenceSealV3: REFERENCE_SEAL_SCHEMA,
  MachineReferenceLabelV1: REFERENCE_LABEL_SCHEMA,
  RawMachineReferenceLabelV1: RAW_REFERENCE_LABEL_SCHEMA,
  OpenAIAdjudicationTriggerReceiptV1: ADJUDICATION_TRIGGER_SCHEMA,
  ReferenceSealValidationReceiptV1: REFERENCE_VALIDATION_SCHEMA,
  ItemEvaluationResultV2: ITEM_RESULT_SCHEMA,
  NaturalCaAggregateScoreReceiptV2: AGGREGATE_SCORE_SCHEMA,
  ExecutionPlanReceiptV1: EXECUTION_PLAN_SCHEMA,
  CanaryGateReceiptV1: CANARY_GATE_SCHEMA,
  FinalExecutionVerificationReceiptV1: FINAL_VERIFICATION_SCHEMA,
  IndependentExecutionResultReviewReceiptV1: RESULT_REVIEW_SCHEMA,
  ClaimBoundaryReviewReceiptV2: CLAIM_REVIEW_SCHEMA,
  AggregatePublicationAuthorizationV1: PUBLICATION_AUTHORIZATION_SCHEMA,
  PublicAggregateReportV1: PUBLIC_REPORT_SCHEMA,
  NaturalCaRunnerCommandReceiptV3: COMMAND_RECEIPT_SCHEMA,
  ProtectedWorkflowIndexV1: WORKFLOW_INDEX_SCHEMA,
  CompletedItemCommitMarkerV2: COMPLETED_ITEM_MARKER_SCHEMA,
});

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function same(left, right) {
  try { return canonicalJsonV5R3(left) === canonicalJsonV5R3(right); } catch { return false; }
}

function resolveReference(root, reference) {
  if (typeof reference !== "string" || !reference.startsWith("#/")) return null;
  return reference.slice(2).split("/").reduce((cursor, segment) => {
    const key = segment.replace(/~1/gu, "/").replace(/~0/gu, "~");
    return plainObject(cursor) || Array.isArray(cursor) ? cursor[key] : undefined;
  }, root);
}

function validDateTime(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}

function validateNode(value, schema, root, at) {
  if (!plainObject(schema)) return [`${at}: schema node is invalid`];
  const errors = [];
  if (typeof schema.$ref === "string") {
    const target = resolveReference(root, schema.$ref);
    return target ? validateNode(value, target, root, at) : [`${at}: schema reference is unresolved`];
  }
  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) errors.push(...validateNode(value, branch, root, at));
  }
  if (Array.isArray(schema.anyOf)) {
    if (!schema.anyOf.some((branch) => validateNode(value, branch, root, at).length === 0)) errors.push(`${at}: no anyOf branch matched`);
  }
  if (Array.isArray(schema.oneOf)) {
    if (schema.oneOf.filter((branch) => validateNode(value, branch, root, at).length === 0).length !== 1) errors.push(`${at}: oneOf requires exactly one matching branch`);
  }
  if (plainObject(schema.not) && validateNode(value, schema.not, root, at).length === 0) errors.push(`${at}: forbidden schema matched`);
  if (plainObject(schema.if)) {
    const conditionMatched = validateNode(value, schema.if, root, at).length === 0;
    if (conditionMatched && plainObject(schema.then)) errors.push(...validateNode(value, schema.then, root, at));
    if (!conditionMatched && plainObject(schema.else)) errors.push(...validateNode(value, schema.else, root, at));
  }
  if (Object.hasOwn(schema, "const") && !same(value, schema.const)) errors.push(`${at}: const mismatch`);
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => same(value, candidate))) errors.push(`${at}: enum mismatch`);
  if (schema.type === "null" && value !== null) errors.push(`${at}: expected null`);
  if (schema.type === "boolean" && typeof value !== "boolean") errors.push(`${at}: expected boolean`);
  if (schema.type === "string") {
    if (typeof value !== "string") errors.push(`${at}: expected string`);
    else {
      if (Number.isSafeInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${at}: string shorter than minLength`);
      if (Number.isSafeInteger(schema.maxLength) && value.length > schema.maxLength) errors.push(`${at}: string longer than maxLength`);
      if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${at}: pattern mismatch`);
      if (schema.format === "date-time" && !validDateTime(value)) errors.push(`${at}: date-time must be canonical ISO-8601 UTC`);
    }
  }
  if (schema.type === "integer") {
    if (!Number.isSafeInteger(value)) errors.push(`${at}: expected safe integer`);
    else {
      if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${at}: below minimum`);
      if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${at}: above maximum`);
      if (Number.isFinite(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) errors.push(`${at}: at or below exclusiveMinimum`);
    }
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${at}: expected finite number`);
    else {
      if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${at}: below minimum`);
      if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${at}: above maximum`);
      if (Number.isFinite(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) errors.push(`${at}: at or below exclusiveMinimum`);
      if (Number.isFinite(schema.multipleOf) && Math.abs((value / schema.multipleOf) - Math.round(value / schema.multipleOf)) > Number.EPSILON * 16) errors.push(`${at}: not a multipleOf value`);
    }
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) errors.push(`${at}: expected array`);
    else {
      if (Number.isSafeInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${at}: array shorter than minItems`);
      if (Number.isSafeInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${at}: array longer than maxItems`);
      if (schema.uniqueItems === true && new Set(value.map((entry) => canonicalJsonV5R3(entry))).size !== value.length) errors.push(`${at}: array values are not unique`);
      if (plainObject(schema.items)) value.forEach((entry, index) => errors.push(...validateNode(entry, schema.items, root, `${at}[${index}]`)));
    }
  }
  if (schema.type === "object") {
    if (!plainObject(value)) errors.push(`${at}: expected plain object`);
    else {
      const keys = Object.keys(value);
      if (Number.isSafeInteger(schema.minProperties) && keys.length < schema.minProperties) errors.push(`${at}: too few properties`);
      if (Number.isSafeInteger(schema.maxProperties) && keys.length > schema.maxProperties) errors.push(`${at}: too many properties`);
      for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required property missing`);
      for (const [key, dependencies] of Object.entries(schema.dependentRequired ?? {})) {
        if (Object.hasOwn(value, key)) for (const dependency of dependencies) if (!Object.hasOwn(value, dependency)) errors.push(`${at}.${dependency}: dependent property required by ${key}`);
      }
      for (const key of keys) {
        if (plainObject(schema.propertyNames)) errors.push(...validateNode(key, schema.propertyNames, root, `${at}{propertyName}`));
        if (plainObject(schema.properties?.[key])) errors.push(...validateNode(value[key], schema.properties[key], root, `${at}.${key}`));
        else if (schema.additionalProperties === false) errors.push(`${at}.${key}: additional property forbidden`);
        else if (plainObject(schema.additionalProperties)) errors.push(...validateNode(value[key], schema.additionalProperties, root, `${at}.${key}`));
      }
    }
  }
  return errors;
}

export function validateClosedSchemaV5R4(value, schemaName = value?.schemaVersion) {
  const schema = SCHEMAS[schemaName];
  if (!schema) return Object.freeze([`unsupported closed schema: ${String(schemaName)}`]);
  return Object.freeze([...new Set(validateNode(value, schema, schema, "$"))]);
}

export function validateClosedSelfHashedArtifactV5R4(value, schemaName = value?.schemaVersion) {
  const errors = [...validateClosedSchemaV5R4(value, schemaName)];
  if (!validateSelfHashV5R3(value)) errors.push("artifact selfHash does not equal canonical content hash");
  return Object.freeze([...new Set(errors)]);
}

export function assertClosedSelfHashedArtifactV5R4(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R4(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export function validateFreshA11RunnerReviewV5R4({ registration, review }) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3")];
  errors.push(...validateClosedSelfHashedArtifactV5R4(review, "IndependentExecutionRunnerReviewReceiptV2"));
  if (review?.designId !== "MAIS-NATURAL-CA60-V5" || review?.runnerVersion !== "V5-R4" || review?.reviewerLane !== "A11") errors.push("fresh review attribution or V5-R4 identity is invalid");
  if (review?.decision !== "CONCURRED" || review?.findingCount !== 0) errors.push("fresh A11 review must be CONCURRED with zero findings");
  if (review?.reviewedRunnerRegistrationHash !== registration?.selfHash
    || review?.reviewedRunnerSourceCommit !== registration?.runnerSourceCommit
    || review?.reviewedProductionSourceRootHash !== registration?.productionSourceRootHash
    || review?.reviewedTestSourceRootHash !== registration?.testSourceRootHash) errors.push("fresh A11 review does not bind the exact registration and source roots");
  if (!validDateTime(review?.reviewedAt) || !validDateTime(registration?.registeredAt)
    || Date.parse(review.reviewedAt) <= Date.parse(registration.registeredAt)) errors.push("fresh A11 review must strictly postdate registration");
  return Object.freeze([...new Set(errors)]);
}

export const V5_R4_SCHEMA_CATALOG = Object.freeze(SCHEMAS);
