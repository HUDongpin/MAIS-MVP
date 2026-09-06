import assert from "node:assert/strict";
import test from "node:test";

import { completeRoleResult, samplePackage } from "./test-fixtures.mjs";

async function subject() {
  return import("./role-contract.mjs");
}

function finding(overrides = {}) {
  return {
    findingId: "finding-1",
    surfaceId: "q-mc",
    family: "F2",
    severity: "P1",
    code: "MISSING_OPTIONS",
    detail: "A multiple-choice item has no usable options.",
    ...overrides
  };
}

test("preserves type in the bilingual projection for every response form", async () => {
  const { buildRoleProjectionV2 } = await subject();
  const projection = buildRoleProjectionV2({
    role: "bilingual-curriculum-critic",
    packageContent: samplePackage()
  });

  assert.deepEqual(projection.questions.map((row) => [row.id, row.type]), [
    ["q-mc", "multiple-choice"],
    ["q-fill", "fill-in"],
    ["q-short", "short-answer"]
  ]);
});

test("exposes a closed per-role taxonomy with at least one code for every F1-F9 family", async () => {
  const { FINDING_TAXONOMY, ROLE_FINDING_ALLOWLISTS } = await subject();
  const families = new Set(Object.values(FINDING_TAXONOMY).map((row) => row.family));

  assert.deepEqual([...families].filter((value) => /^F[1-9]$/.test(value)).sort(), [
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"
  ]);
  for (const [role, codes] of Object.entries(ROLE_FINDING_ALLOWLISTS)) {
    assert.ok(codes.length > 0, role);
    assert.equal(new Set(codes).size, codes.length, role);
    assert.ok(codes.every((code) => FINDING_TAXONOMY[code]), role);
  }
  assert.equal(ROLE_FINDING_ALLOWLISTS["bilingual-curriculum-critic"].includes("MISSING_OPTIONS"), false);
});

test("rejects MISSING_OPTIONS on fill-in and short-answer surfaces", async () => {
  const { buildRoleProjectionV2, validateRoleResultV2 } = await subject();
  const packageContent = samplePackage();
  const projection = buildRoleProjectionV2({ role: "tool-verifier", packageContent });

  for (const surfaceId of ["q-fill", "q-short"]) {
    const result = completeRoleResult({
      role: "tool-verifier",
      packageContent,
      findings: [finding({ surfaceId })]
    });
    const issues = validateRoleResultV2({ result, role: "tool-verifier", packageId: packageContent.packageId, projection });
    assert.ok(issues.some((row) => row.code === "missing-options-not-multiple-choice"), surfaceId);
  }
});

test("accepts MISSING_OPTIONS only for a multiple-choice surface whose options are actually absent", async () => {
  const { buildRoleProjectionV2, validateRoleResultV2 } = await subject();
  const missingPackage = samplePackage({ multipleChoiceHasOptions: false });
  const missingProjection = buildRoleProjectionV2({ role: "tool-verifier", packageContent: missingPackage });
  const accepted = validateRoleResultV2({
    result: completeRoleResult({ role: "tool-verifier", packageContent: missingPackage, findings: [finding()] }),
    role: "tool-verifier",
    packageId: missingPackage.packageId,
    projection: missingProjection
  });
  assert.deepEqual(accepted, []);

  const completePackage = samplePackage({ multipleChoiceHasOptions: true });
  const completeProjection = buildRoleProjectionV2({ role: "tool-verifier", packageContent: completePackage });
  const rejected = validateRoleResultV2({
    result: completeRoleResult({ role: "tool-verifier", packageContent: completePackage, findings: [finding()] }),
    role: "tool-verifier",
    packageId: completePackage.packageId,
    projection: completeProjection
  });
  assert.ok(rejected.some((row) => row.code === "missing-options-not-missing"));
});

test("rejects unknown codes, family-code mismatches, and codes outside the assigned role", async () => {
  const { buildRoleProjectionV2, validateRoleResultV2 } = await subject();
  const packageContent = samplePackage();
  const toolProjection = buildRoleProjectionV2({ role: "tool-verifier", packageContent });

  const unknown = validateRoleResultV2({
    result: completeRoleResult({
      role: "tool-verifier",
      packageContent,
      findings: [finding({ code: "INVENTED_CODE" })]
    }),
    role: "tool-verifier",
    packageId: packageContent.packageId,
    projection: toolProjection
  });
  assert.ok(unknown.some((row) => row.code === "unknown-finding-code"));

  const mismatched = validateRoleResultV2({
    result: completeRoleResult({
      role: "tool-verifier",
      packageContent,
      findings: [finding({ family: "F8" })]
    }),
    role: "tool-verifier",
    packageId: packageContent.packageId,
    projection: toolProjection
  });
  assert.ok(mismatched.some((row) => row.code === "finding-family-code-mismatch"));

  const bilingualProjection = buildRoleProjectionV2({ role: "bilingual-curriculum-critic", packageContent });
  const outsideRole = validateRoleResultV2({
    result: completeRoleResult({
      role: "bilingual-curriculum-critic",
      packageContent,
      findings: [finding({
        family: "F1",
        severity: "P0",
        code: "ANSWER_INDEPENDENT_MISMATCH"
      })]
    }),
    role: "bilingual-curriculum-critic",
    packageId: packageContent.packageId,
    projection: bilingualProjection
  });
  assert.ok(outsideRole.some((row) => row.code === "finding-code-not-allowed-for-role"));
});

test("requires each finding to carry a family and the taxonomy severity", async () => {
  const { buildRoleProjectionV2, validateRoleResultV2 } = await subject();
  const packageContent = samplePackage({ multipleChoiceHasOptions: false });
  const projection = buildRoleProjectionV2({ role: "tool-verifier", packageContent });
  const result = completeRoleResult({
    role: "tool-verifier",
    packageContent,
    findings: [finding({ family: undefined, severity: "P3" })]
  });
  const issues = validateRoleResultV2({ result, role: "tool-verifier", packageId: packageContent.packageId, projection });

  assert.ok(issues.some((row) => row.code === "finding-family-required"));
  assert.ok(issues.some((row) => row.code === "finding-severity-taxonomy-mismatch"));
});
