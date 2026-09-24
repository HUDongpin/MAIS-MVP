import assert from "node:assert/strict";
import test from "node:test";

import { samplePackage } from "./test-fixtures.mjs";

async function subject() {
  return import("./deterministic-baseline.mjs");
}

test("detects a non-empty public template trace as an F8 identity leakage defect", async () => {
  const { runDeterministicBaselineV2 } = await subject();
  const result = runDeterministicBaselineV2(samplePackage({ templateLabel: "internal-template:L2:17" }));
  const finding = result.findings.find((row) => row.surfaceId === "q-mc" && row.code === "TEMPLATE_IDENTITY_LEAKAGE");

  assert.ok(finding);
  assert.equal(finding.family, "F8");
  assert.equal(finding.severity, "P0");
});

test("does not report F8 when the public template trace is null or blank", async () => {
  const { runDeterministicBaselineV2 } = await subject();
  for (const templateLabel of [null, "", "   "]) {
    const result = runDeterministicBaselineV2(samplePackage({ templateLabel }));
    assert.equal(result.findings.some((row) => row.code === "TEMPLATE_IDENTITY_LEAKAGE"), false);
  }
});

test("reports MISSING_OPTIONS only for multiple-choice questions and inspects every surface", async () => {
  const { runDeterministicBaselineV2 } = await subject();
  const packageContent = samplePackage({ multipleChoiceHasOptions: false });
  const result = runDeterministicBaselineV2(packageContent);

  assert.deepEqual(
    result.findings.filter((row) => row.code === "MISSING_OPTIONS").map((row) => row.surfaceId),
    ["q-mc"]
  );
  assert.equal(result.inspectionComplete, true);
  assert.deepEqual(new Set(result.inspectedSurfaceIds), new Set([
    ...packageContent.questions.map((row) => row.id),
    ...packageContent.lessons.map((row) => row.id)
  ]));
});
