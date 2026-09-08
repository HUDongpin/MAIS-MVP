import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

import { COMMON_FIELDS, checkSchemas, validateCommonContract } from "./check-contract-parity.mjs";

const SHA = "^[a-f0-9]{64}$";
const TS = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$";

function stringArray({ uniqueItems = false, sha = false } = {}) {
  return { type: "array", uniqueItems, items: { type: "string", ...(sha ? { pattern: SHA } : {}) } };
}

function minimalSchema(skill, evidenceClass) {
  const properties = {
    schemaVersion: { const: "1.0" },
    skill: { type: "string", const: skill },
    mode: { type: "string", enum: ["AUDIT"] },
    observedAt: { type: "string", format: "date-time", pattern: TS },
    repository: {
      type: "object",
      additionalProperties: false,
      required: ["head", "branch", "clean"],
      properties: {
        head: { type: ["string", "null"] },
        branch: { type: ["string", "null"] },
        clean: { type: ["boolean", "null"] },
      },
    },
    evidenceClass: { type: "string", const: evidenceClass },
    sourceIdentity: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["logicalId"],
        properties: {
          logicalId: { type: "string" },
          sha256: { type: "string", pattern: SHA },
          commit: { type: "string" },
        },
      },
    },
    resolvedState: { type: "string" },
    authority: {
      type: "object",
      additionalProperties: false,
      required: ["required", "proven", "missing"],
      properties: {
        required: stringArray({ uniqueItems: true }),
        proven: stringArray({ uniqueItems: true }),
        missing: stringArray({ uniqueItems: true }),
        expiresAt: { type: ["string", "null"], format: "date-time", pattern: TS },
      },
    },
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "status"],
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["pass", "fail", "blocked", "unknown"] },
          evidenceRef: { type: "string" },
        },
      },
    },
    blockers: stringArray(),
    claimCeiling: { type: "string" },
    nextAllowedAction: { type: "string", enum: ["stop-blocked"] },
    evidenceHashes: stringArray({ sha: true }),
    redaction: {
      type: "object",
      additionalProperties: false,
      required: ["protectedContentIncluded", "credentialsIncluded", "rawProviderResponsesIncluded"],
      properties: {
        protectedContentIncluded: { const: false },
        credentialsIncluded: { const: false },
        rawProviderResponsesIncluded: { const: false },
      },
    },
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    required: [...COMMON_FIELDS],
    properties,
  };
}

test("three self-contained schemas pass the shared EvidenceEnvelopeV1 contract", () => {
  const entries = [
    { label: "rsi", schema: minimalSchema("mais-rsi-machine-qa-workflow", "exact-package-machine-review") },
    { label: "natural", schema: minimalSchema("mais-natural-sample-evaluation", "natural-sample-evaluation") },
    { label: "promotion", schema: minimalSchema("mais-content-promotion-gate", "exact-package-machine-review") },
  ];
  assert.deepEqual(checkSchemas(entries).issues, []);
});

test("missing common fields fail closed", () => {
  const schema = minimalSchema("broken", "exact-package-machine-review");
  delete schema.properties.authority;
  schema.required = schema.required.filter((field) => field !== "authority");
  assert(validateCommonContract(schema, "broken").some((entry) => entry.code === "COMMON_FIELD_MISSING"));
});

test("noncanonical timestamps and nullable redaction fields fail", () => {
  const schema = minimalSchema("broken", "natural-sample-evaluation");
  delete schema.properties.observedAt.pattern;
  schema.properties.redaction.properties.credentialsIncluded = { type: "boolean" };
  const issues = validateCommonContract(schema, "broken");
  assert(issues.some((entry) => entry.code === "COMMON_TIMESTAMP_CONTRACT_MISMATCH"));
  assert(issues.some((entry) => entry.code === "COMMON_REDACTION_CONST_MISMATCH"));
});

test("unknown evidence classes and widened check status fail", () => {
  const schema = minimalSchema("broken", "unknown-class");
  schema.properties.checks.items.properties.status.enum.push("skipped");
  const issues = validateCommonContract(schema, "broken");
  assert(issues.some((entry) => entry.code === "COMMON_EVIDENCE_CLASS_MISMATCH"));
  assert(issues.some((entry) => entry.code === "COMMON_CHECK_STATUS_MISMATCH"));
});

test("specialists may not silently tighten or widen a shared common definition", () => {
  const first = minimalSchema("first", "exact-package-machine-review");
  const second = minimalSchema("second", "natural-sample-evaluation");
  second.properties.repository.properties.branch.maxLength = 40;
  const result = checkSchemas([
    { label: "first", schema: first },
    { label: "second", schema: second },
  ]);
  assert(result.issues.some((entry) => entry.code === "COMMON_DEFINITION_PARITY_MISMATCH"));
});


test("independently packaged machine and natural strict parsers stay in parity", async () => {
  const machine = await readFile(new URL("../mais-rsi-machine-qa-workflow/scripts/strict-json.mjs", import.meta.url), "utf8");
  const natural = await readFile(new URL("../mais-natural-sample-evaluation/scripts/strict-json.mjs", import.meta.url), "utf8");
  assert.equal(machine, natural);
});
