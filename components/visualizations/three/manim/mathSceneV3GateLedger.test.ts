import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveMathSceneV3ReleaseStatus,
  emptyMathSceneV3ReviewLedger,
  type MathSceneV3ReviewLedger
} from "./mathSceneV3GateLedger";

function passedLedger(): MathSceneV3ReviewLedger {
  return {
    A06: { evidenceIds: ["a06-runtime-test"], status: "passed" },
    A11: { evidenceIds: ["a11-browser-download"], status: "passed" },
    A18: { evidenceIds: ["a18-teaching-signoff"], status: "passed" },
    A22: { evidenceIds: ["a22-clean-live"], status: "passed" }
  };
}

test("labels missing or failed gate evidence Beta", () => {
  assert.deepEqual(emptyMathSceneV3ReviewLedger(), {
    A06: { evidenceIds: [], status: "pending" },
    A11: { evidenceIds: [], status: "pending" },
    A18: { evidenceIds: [], status: "pending" },
    A22: { evidenceIds: [], status: "pending" }
  });

  const pending = deriveMathSceneV3ReleaseStatus({
    deployed: false,
    deploymentEvidenceIds: [],
    liveBrowserEvidenceIds: [],
    liveBrowserVerified: false,
    mergeEvidenceIds: [],
    merged: false,
    reviewLedger: emptyMathSceneV3ReviewLedger()
  });
  assert.equal(pending.label, "Beta");
  assert.equal(pending.ga, false);

  const missingEvidence = passedLedger();
  missingEvidence.A11.evidenceIds = [];
  assert.equal(deriveMathSceneV3ReleaseStatus({
    deployed: true,
    deploymentEvidenceIds: ["deploy"],
    liveBrowserEvidenceIds: ["live"],
    liveBrowserVerified: true,
    mergeEvidenceIds: ["merge"],
    merged: true,
    reviewLedger: missingEvidence
  }).label, "Beta");
});

test("labels all-green gates without complete release evidence v3 RC", () => {
  const result = deriveMathSceneV3ReleaseStatus({
    deployed: false,
    deploymentEvidenceIds: [],
    liveBrowserEvidenceIds: [],
    liveBrowserVerified: false,
    mergeEvidenceIds: ["pr-merge-pending"],
    merged: false,
    reviewLedger: passedLedger()
  });
  assert.equal(result.label, "v3 RC");
  assert.equal(result.ga, false);
  assert.deepEqual(result.releaseConditions, {
    deployed: false,
    deploymentEvidencePresent: false,
    liveBrowserEvidencePresent: false,
    liveBrowserVerified: false,
    mergeEvidencePresent: true,
    merged: false
  });
});

test("allows v3 GA only with all four gates plus separate merge, deploy, and live evidence", () => {
  const input = {
    deployed: true,
    deploymentEvidenceIds: ["provider-deployment-ready"],
    liveBrowserEvidenceIds: ["live-webm-download-ffprobe"],
    liveBrowserVerified: true,
    mergeEvidenceIds: ["remote-main-sha"],
    merged: true,
    reviewLedger: passedLedger()
  } as const;
  const result = deriveMathSceneV3ReleaseStatus(input);
  assert.equal(result.label, "v3 GA");
  assert.equal(result.ga, true);

  for (const field of ["merged", "deployed", "liveBrowserVerified"] as const) {
    assert.notEqual(deriveMathSceneV3ReleaseStatus({ ...input, [field]: false }).label, "v3 GA");
  }
  assert.notEqual(deriveMathSceneV3ReleaseStatus({ ...input, mergeEvidenceIds: [] }).label, "v3 GA");
  assert.notEqual(deriveMathSceneV3ReleaseStatus({ ...input, deploymentEvidenceIds: [] }).label, "v3 GA");
  assert.notEqual(deriveMathSceneV3ReleaseStatus({ ...input, liveBrowserEvidenceIds: [] }).label, "v3 GA");
});
