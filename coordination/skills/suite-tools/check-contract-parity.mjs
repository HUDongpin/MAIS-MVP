#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SUITE_DIR = path.resolve(SCRIPT_DIR, "..");

export const DEFAULT_SCHEMA_PATHS = [
  path.join(SUITE_DIR, "mais-rsi-machine-qa-workflow/assets/machine-qa-evidence.schema.json"),
  path.join(SUITE_DIR, "mais-natural-sample-evaluation/assets/natural-evaluation-state.schema.json"),
  path.join(SUITE_DIR, "mais-content-promotion-gate/assets/promotion-gate-handoff.schema.json"),
];

export const COMMON_FIELDS = [
  "schemaVersion",
  "skill",
  "mode",
  "observedAt",
  "repository",
  "evidenceClass",
  "sourceIdentity",
  "resolvedState",
  "authority",
  "checks",
  "blockers",
  "claimCeiling",
  "nextAllowedAction",
  "evidenceHashes",
  "redaction",
];

const ALLOWED_EVIDENCE_CLASSES = new Set([
  "synthetic-calibration",
  "natural-sample-evaluation",
  "exact-package-machine-review",
]);

const SHA256_PATTERN = "^[a-f0-9]{64}$";
const CANONICAL_TIMESTAMP_PATTERN = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$";

function issue(issues, schemaLabel, code, field, detail) {
  issues.push({ schema: schemaLabel, code, field, detail });
}

function decodeJsonPointerToken(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function resolveLocalRef(schema, node) {
  let current = node;
  const seen = new Set();
  while (current && typeof current === "object" && typeof current.$ref === "string") {
    if (!current.$ref.startsWith("#/")) {
      throw new Error("Only local JSON Schema references are supported");
    }
    if (seen.has(current.$ref)) {
      throw new Error("Circular JSON Schema reference");
    }
    seen.add(current.$ref);
    const tokens = current.$ref.slice(2).split("/").map(decodeJsonPointerToken);
    current = tokens.reduce((value, token) => value?.[token], schema);
    if (!current) {
      throw new Error("Unresolved JSON Schema reference");
    }
  }
  return current;
}

function resolveForComparison(schema, node, refStack = new Set()) {
  if (Array.isArray(node)) return node.map((entry) => resolveForComparison(schema, entry, refStack));
  if (!node || typeof node !== "object") return node;
  if (typeof node.$ref === "string") {
    if (refStack.has(node.$ref)) throw new Error("Circular JSON Schema reference");
    const nextStack = new Set(refStack);
    nextStack.add(node.$ref);
    return resolveForComparison(schema, resolveLocalRef(schema, node), nextStack);
  }
  return Object.fromEntries(
    Object.keys(node).sort().map((key) => [key, resolveForComparison(schema, node[key], refStack)]),
  );
}

function commonDefinitionFingerprint(schema) {
  const properties = schema.properties ?? {};
  return JSON.stringify({
    observedAt: resolveForComparison(schema, properties.observedAt),
    repository: resolveForComparison(schema, properties.repository),
    sourceIdentityItem: resolveForComparison(schema, resolveLocalRef(schema, properties.sourceIdentity)?.items),
    authority: resolveForComparison(schema, properties.authority),
    checkItem: resolveForComparison(schema, resolveLocalRef(schema, properties.checks)?.items),
    redaction: resolveForComparison(schema, properties.redaction),
  });
}

function hasType(definition, expected) {
  if (!definition || typeof definition !== "object") return false;
  const types = Array.isArray(definition.type) ? definition.type : [definition.type];
  return types.includes(expected);
}

function hasNullableType(definition, baseType) {
  if (!definition || typeof definition !== "object") return false;
  const types = Array.isArray(definition.type) ? definition.type : [definition.type];
  return types.length === 2 && types.includes(baseType) && types.includes("null");
}

function isClosedObject(definition, required) {
  return hasType(definition, "object")
    && definition.additionalProperties === false
    && required.every((key) => definition.required?.includes(key));
}

function assertString(definition, issues, label, field) {
  if (!hasType(definition, "string")) {
    issue(issues, label, "COMMON_TYPE_MISMATCH", field, "must declare type string");
  }
}

function assertCanonicalTimestamp(definition, issues, label, field, { optional = false } = {}) {
  if (optional && Array.isArray(definition?.type)) {
    if (!definition.type.includes("string") || !definition.type.includes("null")) {
      issue(issues, label, "COMMON_TIMESTAMP_TYPE_MISMATCH", field, "must be string or null");
    }
  } else {
    assertString(definition, issues, label, field);
  }
  if (definition?.format !== "date-time" || definition?.pattern !== CANONICAL_TIMESTAMP_PATTERN) {
    issue(issues, label, "COMMON_TIMESTAMP_CONTRACT_MISMATCH", field, "must use canonical UTC millisecond date-time format and pattern");
  }
}

function checkRepository(schema, definition, issues, label) {
  const def = resolveLocalRef(schema, definition);
  if (!isClosedObject(def, ["head", "branch", "clean"])) {
    issue(issues, label, "COMMON_REPOSITORY_SHAPE_MISMATCH", "repository", "must be closed and require head, branch, clean");
    return;
  }
  if (!hasNullableType(def.properties?.head, "string")
      || !hasNullableType(def.properties?.branch, "string")
      || !hasNullableType(def.properties?.clean, "boolean")) {
    issue(issues, label, "COMMON_REPOSITORY_MEMBER_MISMATCH", "repository", "head/branch/clean must be nullable string/string/boolean");
  }
}

function checkSourceIdentity(schema, definition, issues, label) {
  const def = resolveLocalRef(schema, definition);
  const item = resolveLocalRef(schema, def?.items);
  if (!hasType(def, "array") || def.minItems !== 1 || !isClosedObject(item, ["logicalId"])) {
    issue(issues, label, "COMMON_SOURCE_IDENTITY_SHAPE_MISMATCH", "sourceIdentity", "must be a nonempty array of closed logicalId records");
    return;
  }
  assertString(item.properties?.logicalId, issues, label, "sourceIdentity[].logicalId");
  const sha = resolveLocalRef(schema, item.properties?.sha256);
  if (!hasType(sha, "string") || sha.pattern !== SHA256_PATTERN) {
    issue(issues, label, "COMMON_SHA256_MISMATCH", "sourceIdentity[].sha256", "optional sha256 must use lowercase 64-hex pattern");
  }
  if (!hasType(item.properties?.commit, "string")) {
    issue(issues, label, "COMMON_COMMIT_MISMATCH", "sourceIdentity[].commit", "optional commit must be a string");
  }
}

function checkAuthority(schema, definition, issues, label) {
  const def = resolveLocalRef(schema, definition);
  if (!isClosedObject(def, ["required", "proven", "missing"])) {
    issue(issues, label, "COMMON_AUTHORITY_SHAPE_MISMATCH", "authority", "must be closed and require required/proven/missing");
    return;
  }
  for (const key of ["required", "proven", "missing"]) {
    const arrayDef = resolveLocalRef(schema, def.properties?.[key]);
    const itemDef = resolveLocalRef(schema, arrayDef?.items);
    if (!hasType(arrayDef, "array") || !hasType(itemDef, "string") || arrayDef.uniqueItems !== true) {
      issue(issues, label, "COMMON_AUTHORITY_ARRAY_MISMATCH", `authority.${key}`, "must be a unique string array");
    }
  }
  const expires = resolveLocalRef(schema, def.properties?.expiresAt);
  assertCanonicalTimestamp(expires, issues, label, "authority.expiresAt", { optional: true });
}

function checkChecks(schema, definition, issues, label) {
  const def = resolveLocalRef(schema, definition);
  const item = resolveLocalRef(schema, def?.items);
  if (!hasType(def, "array") || !isClosedObject(item, ["id", "status"])) {
    issue(issues, label, "COMMON_CHECKS_SHAPE_MISMATCH", "checks", "must be an array of closed id/status records");
    return;
  }
  assertString(item.properties?.id, issues, label, "checks[].id");
  const statuses = item.properties?.status?.enum;
  const exactStatuses = ["pass", "fail", "blocked", "unknown"];
  if (!Array.isArray(statuses) || exactStatuses.some((value) => !statuses.includes(value)) || statuses.length !== exactStatuses.length) {
    issue(issues, label, "COMMON_CHECK_STATUS_MISMATCH", "checks[].status", "must use pass/fail/blocked/unknown exactly");
  }
  assertString(item.properties?.evidenceRef, issues, label, "checks[].evidenceRef");
}

function checkStringArray(schema, definition, issues, label, field, { sha256 = false } = {}) {
  const def = resolveLocalRef(schema, definition);
  const item = resolveLocalRef(schema, def?.items);
  if (!hasType(def, "array") || !hasType(item, "string")) {
    issue(issues, label, "COMMON_ARRAY_SHAPE_MISMATCH", field, "must be a string array");
    return;
  }
  if (sha256 && item.pattern !== SHA256_PATTERN) {
    issue(issues, label, "COMMON_SHA256_MISMATCH", `${field}[]`, "must use lowercase 64-hex pattern");
  }
}

function checkRedaction(schema, definition, issues, label) {
  const def = resolveLocalRef(schema, definition);
  const keys = ["protectedContentIncluded", "credentialsIncluded", "rawProviderResponsesIncluded"];
  if (!isClosedObject(def, keys)) {
    issue(issues, label, "COMMON_REDACTION_SHAPE_MISMATCH", "redaction", "must be a closed object with all three redaction fields");
    return;
  }
  for (const key of keys) {
    if (def.properties?.[key]?.const !== false) {
      issue(issues, label, "COMMON_REDACTION_CONST_MISMATCH", `redaction.${key}`, "must be const false");
    }
  }
}

export function validateCommonContract(schema, label = "schema") {
  const issues = [];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return [{ schema: label, code: "SCHEMA_NOT_OBJECT", field: "$", detail: "schema must be an object" }];
  }
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    issue(issues, label, "SCHEMA_DIALECT_MISMATCH", "$schema", "must declare JSON Schema Draft 2020-12");
  }
  if (!isClosedObject(schema, COMMON_FIELDS)) {
    issue(issues, label, "COMMON_ROOT_SHAPE_MISMATCH", "$", "root must be closed and require every EvidenceEnvelopeV1 common field");
  }
  for (const field of COMMON_FIELDS) {
    if (!schema.properties?.[field]) {
      issue(issues, label, "COMMON_FIELD_MISSING", field, "missing common property definition");
    }
  }
  if (issues.some((entry) => entry.code === "COMMON_FIELD_MISSING")) return issues;

  if (schema.properties.schemaVersion?.const !== "1.0") {
    issue(issues, label, "COMMON_SCHEMA_VERSION_MISMATCH", "schemaVersion", "must be const 1.0");
  }
  assertString(schema.properties.skill, issues, label, "skill");
  assertString(schema.properties.mode, issues, label, "mode");
  assertCanonicalTimestamp(resolveLocalRef(schema, schema.properties.observedAt), issues, label, "observedAt");
  checkRepository(schema, schema.properties.repository, issues, label);

  const evidenceClass = resolveLocalRef(schema, schema.properties.evidenceClass);
  const evidenceValues = evidenceClass.const !== undefined ? [evidenceClass.const] : evidenceClass.enum;
  if (!hasType(evidenceClass, "string") || !Array.isArray(evidenceValues) || evidenceValues.length === 0
      || evidenceValues.some((value) => !ALLOWED_EVIDENCE_CLASSES.has(value))) {
    issue(issues, label, "COMMON_EVIDENCE_CLASS_MISMATCH", "evidenceClass", "must be a nonempty subset of the three public evidence classes");
  }

  checkSourceIdentity(schema, schema.properties.sourceIdentity, issues, label);
  assertString(resolveLocalRef(schema, schema.properties.resolvedState), issues, label, "resolvedState");
  checkAuthority(schema, schema.properties.authority, issues, label);
  checkChecks(schema, schema.properties.checks, issues, label);
  checkStringArray(schema, schema.properties.blockers, issues, label, "blockers");
  assertString(resolveLocalRef(schema, schema.properties.claimCeiling), issues, label, "claimCeiling");
  assertString(resolveLocalRef(schema, schema.properties.nextAllowedAction), issues, label, "nextAllowedAction");
  checkStringArray(schema, schema.properties.evidenceHashes, issues, label, "evidenceHashes", { sha256: true });
  checkRedaction(schema, schema.properties.redaction, issues, label);
  return issues;
}

export function checkSchemas(schemaEntries) {
  const issues = [];
  for (const { schema, label } of schemaEntries) {
    try {
      issues.push(...validateCommonContract(schema, label));
    } catch {
      issue(issues, label, "SCHEMA_REFERENCE_INVALID", "$", "schema contains an invalid local reference");
    }
  }
  if (schemaEntries.length > 1) {
    try {
      const baseline = commonDefinitionFingerprint(schemaEntries[0].schema);
      for (const { schema, label } of schemaEntries.slice(1)) {
        if (commonDefinitionFingerprint(schema) !== baseline) {
          issue(
            issues,
            label,
            "COMMON_DEFINITION_PARITY_MISMATCH",
            "$defs",
            "observedAt, repository, source identity item, authority, check item, and redaction must be structurally identical across specialist schemas",
          );
        }
      }
    } catch {
      issue(issues, "suite", "COMMON_DEFINITION_COMPARISON_FAILED", "$defs", "common definitions could not be dereferenced for parity comparison");
    }
  }
  return {
    schemaVersion: "1.0",
    result: issues.length === 0 ? "pass" : "fail",
    checkedSchemas: schemaEntries.map(({ label }) => label),
    commonFields: COMMON_FIELDS,
    issues,
  };
}

function help() {
  return `Usage: node check-contract-parity.mjs [SCHEMA_1 SCHEMA_2 SCHEMA_3]

Read three specialist JSON Schemas and verify the common EvidenceEnvelopeV1
contract. The command is offline, read-only, and prints no schema payloads.

Exit codes:
  0  all common contract checks pass
  2  malformed input, missing schema, or contract mismatch
`;
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(help());
    return 0;
  }
  if (argv.length !== 0 && argv.length !== 3) {
    process.stdout.write(JSON.stringify({ result: "fail", issues: [{ code: "ARGUMENT_COUNT_INVALID" }] }) + "\n");
    return 2;
  }
  const paths = argv.length === 3 ? argv.map((value) => path.resolve(value)) : DEFAULT_SCHEMA_PATHS;
  const entries = [];
  for (const schemaPath of paths) {
    try {
      const raw = fs.readFileSync(schemaPath, "utf8");
      entries.push({ schema: JSON.parse(raw), label: path.basename(schemaPath) });
    } catch {
      process.stdout.write(JSON.stringify({ result: "fail", issues: [{ code: "SCHEMA_READ_OR_PARSE_FAILED", schema: path.basename(schemaPath) }] }) + "\n");
      return 2;
    }
  }
  const result = checkSchemas(entries);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  return result.result === "pass" ? 0 : 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
