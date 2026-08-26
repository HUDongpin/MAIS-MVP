import {
  canonicalJsonV5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import { V5_R4_SCHEMA_CATALOG } from "./schema-contract-v5-r4.mjs";
import ACTIVE_REGISTRATION_SCHEMA from "./schemas/NaturalCaExecutionRunnerSupersedingRegistrationV1.schema.json" with { type: "json" };
import REVIEW_SCHEMA from "./schemas/IndependentExecutionRunnerReviewReceiptV3.schema.json" with { type: "json" };
import ROUTE_SOURCE_SCHEMA from "./schemas/AuthenticatedRouteEvidenceSourceV1.schema.json" with { type: "json" };
import ROUTE_RECEIPT_SCHEMA from "./schemas/AuthenticatedRouteEvidenceReceiptV1.schema.json" with { type: "json" };
import COST_PREVIEW_SCHEMA from "./schemas/ProviderCostPreviewReceiptV1.schema.json" with { type: "json" };
import ACTIVATION_GRANT_SCHEMA from "./schemas/OwnerRunnerActivationGrantV1.schema.json" with { type: "json" };
import DISPATCH_AUDIT_SCHEMA from "./schemas/StateBoundDispatchAuditReceiptV1.schema.json" with { type: "json" };
import C0_PREDICATE_SCHEMA from "./schemas/DeepSeekC0PredicateReceiptV1.schema.json" with { type: "json" };
import C0_SET_SCHEMA from "./schemas/DeepSeekC0ExecutionSetV3.schema.json" with { type: "json" };
import REFERENCE_SEAL_SCHEMA from "./schemas/MachineReferenceSealV4.schema.json" with { type: "json" };
import INTEGRITY_SCHEMA from "./schemas/ExecutionIntegrityEvidenceV1.schema.json" with { type: "json" };
import SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV3.schema.json" with { type: "json" };
import ATTEMPT_RECOVERY_SCHEMA from "./schemas/InterruptedAttemptRecoveryReceiptV1.schema.json" with { type: "json" };
import LOCK_RECOVERY_SCHEMA from "./schemas/StaleLedgerLockRecoveryReceiptV1.schema.json" with { type: "json" };
import WORKFLOW_INDEX_SCHEMA from "./schemas/ProtectedWorkflowIndexV2.schema.json" with { type: "json" };
import WORKFLOW_TRANSITION_SCHEMA from "./schemas/WorkflowCommandTransitionReceiptV1.schema.json" with { type: "json" };
import COMMAND_SCHEMA from "./schemas/NaturalCaRunnerCommandReceiptV4.schema.json" with { type: "json" };
import LEDGER_LOCK_SCHEMA from "./schemas/ExecutionLedgerLockV1.schema.json" with { type: "json" };
import RECOVERY_AUTHORIZATION_SCHEMA from "./schemas/LedgerRecoveryAuthorizationV1.schema.json" with { type: "json" };
import CANARY_GATE_V2_SCHEMA from "./schemas/CanaryGateReceiptV2.schema.json" with { type: "json" };
import REFERENCE_VALIDATION_V2_SCHEMA from "./schemas/ReferenceSealValidationReceiptV2.schema.json" with { type: "json" };
import DEEPSEEK_REGISTRATION_V3_SCHEMA from "./schemas/DeepSeekExecutionRegistrationV3.schema.json" with { type: "json" };
import EXACT_REGISTRATION_EVIDENCE_SCHEMA from "./schemas/ExactRunnerSupersedingRegistrationEvidenceV1.schema.json" with { type: "json" };
import FINAL_VERIFICATION_V2_SCHEMA from "./schemas/FinalExecutionVerificationReceiptV2.schema.json" with { type: "json" };

const R5_SCHEMAS = Object.freeze({
  NaturalCaExecutionRunnerSupersedingRegistrationV1: ACTIVE_REGISTRATION_SCHEMA,
  IndependentExecutionRunnerReviewReceiptV3: REVIEW_SCHEMA,
  AuthenticatedRouteEvidenceSourceV1: ROUTE_SOURCE_SCHEMA,
  AuthenticatedRouteEvidenceReceiptV1: ROUTE_RECEIPT_SCHEMA,
  ProviderCostPreviewReceiptV1: COST_PREVIEW_SCHEMA,
  OwnerRunnerActivationGrantV1: ACTIVATION_GRANT_SCHEMA,
  StateBoundDispatchAuditReceiptV1: DISPATCH_AUDIT_SCHEMA,
  DeepSeekC0PredicateReceiptV1: C0_PREDICATE_SCHEMA,
  DeepSeekC0ExecutionSetV3: C0_SET_SCHEMA,
  MachineReferenceSealV4: REFERENCE_SEAL_SCHEMA,
  ExecutionIntegrityEvidenceV1: INTEGRITY_SCHEMA,
  NaturalCaAggregateScoreReceiptV3: SCORE_SCHEMA,
  InterruptedAttemptRecoveryReceiptV1: ATTEMPT_RECOVERY_SCHEMA,
  StaleLedgerLockRecoveryReceiptV1: LOCK_RECOVERY_SCHEMA,
  ProtectedWorkflowIndexV2: WORKFLOW_INDEX_SCHEMA,
  WorkflowCommandTransitionReceiptV1: WORKFLOW_TRANSITION_SCHEMA,
  NaturalCaRunnerCommandReceiptV4: COMMAND_SCHEMA,
  ExecutionLedgerLockV1: LEDGER_LOCK_SCHEMA,
  LedgerRecoveryAuthorizationV1: RECOVERY_AUTHORIZATION_SCHEMA,
  CanaryGateReceiptV2: CANARY_GATE_V2_SCHEMA,
  ReferenceSealValidationReceiptV2: REFERENCE_VALIDATION_V2_SCHEMA,
  DeepSeekExecutionRegistrationV3: DEEPSEEK_REGISTRATION_V3_SCHEMA,
  ExactRunnerSupersedingRegistrationEvidenceV1: EXACT_REGISTRATION_EVIDENCE_SCHEMA,
  FinalExecutionVerificationReceiptV2: FINAL_VERIFICATION_V2_SCHEMA,
});

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function same(left, right) {
  try { return canonicalJsonV5R3(left) === canonicalJsonV5R3(right); } catch { return false; }
}

function resolveReference(root, reference) {
  if (typeof reference !== "string") return null;
  if (reference.startsWith("#/")) {
    const schema = reference.slice(2).split("/").reduce((cursor, segment) => {
      const key = segment.replace(/~1/gu, "/").replace(/~0/gu, "~");
      return plainObject(cursor) || Array.isArray(cursor) ? cursor[key] : undefined;
    }, root);
    return schema ? { schema, root } : null;
  }
  const match = /(?:^|\/)([A-Za-z0-9]+)\.schema\.json$/u.exec(reference);
  if (!match) return null;
  const externalRoot = R5_SCHEMAS[match[1]] ?? V5_R4_SCHEMA_CATALOG[match[1]];
  return externalRoot ? { schema: externalRoot, root: externalRoot } : null;
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
    return target ? validateNode(value, target.schema, target.root, at) : [`${at}: schema reference is unresolved`];
  }
  if (Array.isArray(schema.allOf)) for (const branch of schema.allOf) errors.push(...validateNode(value, branch, root, at));
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((branch) => validateNode(value, branch, root, at).length === 0)) errors.push(`${at}: no anyOf branch matched`);
  if (Array.isArray(schema.oneOf) && schema.oneOf.filter((branch) => validateNode(value, branch, root, at).length === 0).length !== 1) errors.push(`${at}: oneOf requires exactly one matching branch`);
  if (plainObject(schema.not) && validateNode(value, schema.not, root, at).length === 0) errors.push(`${at}: forbidden schema matched`);
  if (plainObject(schema.if)) {
    const matched = validateNode(value, schema.if, root, at).length === 0;
    if (matched && plainObject(schema.then)) errors.push(...validateNode(value, schema.then, root, at));
    if (!matched && plainObject(schema.else)) errors.push(...validateNode(value, schema.else, root, at));
  }
  if (Object.hasOwn(schema, "const") && !same(value, schema.const)) errors.push(`${at}: const mismatch`);
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => same(value, candidate))) errors.push(`${at}: enum mismatch`);

  if (schema.type === "null" && value !== null) errors.push(`${at}: expected null`);
  if (schema.type === "boolean" && typeof value !== "boolean") errors.push(`${at}: expected boolean`);
  if (schema.type === "string" && typeof value !== "string") errors.push(`${at}: expected string`);
  if (schema.type === "integer" && !Number.isSafeInteger(value)) errors.push(`${at}: expected safe integer`);
  if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) errors.push(`${at}: expected finite number`);
  if (schema.type === "array" && !Array.isArray(value)) errors.push(`${at}: expected array`);
  if (schema.type === "object" && !plainObject(value)) errors.push(`${at}: expected plain object`);

  if (typeof value === "string") {
    if (Number.isSafeInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${at}: string shorter than minLength`);
    if (Number.isSafeInteger(schema.maxLength) && value.length > schema.maxLength) errors.push(`${at}: string longer than maxLength`);
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${at}: pattern mismatch`);
    if (schema.format === "date-time" && !validDateTime(value)) errors.push(`${at}: date-time must be canonical ISO-8601 UTC`);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${at}: below minimum`);
    if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${at}: above maximum`);
    if (Number.isFinite(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) errors.push(`${at}: at or below exclusiveMinimum`);
    if (Number.isFinite(schema.exclusiveMaximum) && value >= schema.exclusiveMaximum) errors.push(`${at}: at or above exclusiveMaximum`);
    if (Number.isFinite(schema.multipleOf) && Math.abs((value / schema.multipleOf) - Math.round(value / schema.multipleOf)) > Number.EPSILON * 16) errors.push(`${at}: not a multipleOf value`);
  }
  // Applicator subschemas are allowed to add array constraints without repeating
  // `type: array`. JSON Schema 2020-12 still requires those constraints to apply.
  if (Array.isArray(value)) {
    if (Number.isSafeInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${at}: array shorter than minItems`);
    if (Number.isSafeInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${at}: array longer than maxItems`);
    if (schema.uniqueItems === true && new Set(value.map((entry) => canonicalJsonV5R3(entry))).size !== value.length) errors.push(`${at}: array values are not unique`);
    if (plainObject(schema.items)) value.forEach((entry, index) => errors.push(...validateNode(entry, schema.items, root, `${at}[${index}]`)));
  }
  if (plainObject(value)) {
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
  return errors;
}

export function validateClosedSchemaAgainstV5R5(value, schema) {
  if (!plainObject(schema)) return Object.freeze(["closed schema is unavailable"]);
  return Object.freeze([...new Set(validateNode(value, schema, schema, "$"))]);
}

export function validateClosedSelfHashedAgainstV5R5(value, schema) {
  const errors = [...validateClosedSchemaAgainstV5R5(value, schema)];
  if (!validateSelfHashV5R3(value)) errors.push("artifact selfHash does not equal canonical content hash");
  return Object.freeze([...new Set(errors)]);
}

export function validateClosedSchemaV5R5(value, schemaName = value?.schemaVersion) {
  const schema = R5_SCHEMAS[schemaName] ?? V5_R4_SCHEMA_CATALOG[schemaName];
  return schema ? validateClosedSchemaAgainstV5R5(value, schema)
    : Object.freeze([`unsupported V5-R5 closed schema: ${String(schemaName)}`]);
}

export function validateClosedSelfHashedArtifactV5R5(value, schemaName = value?.schemaVersion) {
  const errors = [...validateClosedSchemaV5R5(value, schemaName)];
  if (!validateSelfHashV5R3(value)) errors.push("artifact selfHash does not equal canonical content hash");
  return Object.freeze([...new Set(errors)]);
}

export function assertClosedSelfHashedArtifactV5R5(value, schemaName = value?.schemaVersion) {
  const errors = validateClosedSelfHashedArtifactV5R5(value, schemaName);
  if (errors.length > 0) throw new TypeError(`${schemaName} validation failed: ${errors.join("; ")}`);
  return value;
}

export function assertClosedSelfHashedAgainstV5R5(value, schema, label = value?.schemaVersion ?? "artifact") {
  const errors = validateClosedSelfHashedAgainstV5R5(value, schema);
  if (errors.length > 0) throw new TypeError(`${label} validation failed: ${errors.join("; ")}`);
  return value;
}

export const V5_R5_SCHEMA_CATALOG = Object.freeze({ ...V5_R4_SCHEMA_CATALOG, ...R5_SCHEMAS });
