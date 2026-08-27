import assert from "node:assert/strict";
import test from "node:test";

import * as publicApi from "./index";

const binding = {
  runId: "run-approval-001",
  candidateSha: "a".repeat(40),
  candidateTreeSha: "b".repeat(40),
  previewDeploymentId: "preview-deployment-001",
  previewEvidenceDigest: "e".repeat(64),
  requiredChecksDigest: "f".repeat(64),
  changedPathPolicyDigest: "1".repeat(64),
  schemaSourcePlanDigest: "2".repeat(64),
  previousProductionBinding: {
    deploymentId: "production-deployment-previous",
    candidateSha: "3".repeat(40),
  },
  approvalExpiresAt: "2026-08-27T14:00:00.000Z",
  rollbackAuthorization: true as const,
};

test("computes a deterministic Preview-pilot approval envelope without granting execution", () => {
  const first = publicApi.createPreviewPilotApprovalEnvelope(binding);
  const replay = publicApi.createPreviewPilotApprovalEnvelope({ ...binding });

  assert.equal(first.graphVersion, "1.0.0");
  assert.equal(first.graphSpecDigest, publicApi.getGraphSpecDigest());
  assert.equal(first.runnerRegistryDigest, publicApi.getRunnerRegistryDigest());
  assert.equal(first.rollbackAuthorization, true);
  assert.equal(first.approvalDigest, replay.approvalDigest);
  assert.doesNotThrow(() => publicApi.verifyApprovalEnvelope(first));
  assert.deepEqual(Object.keys(first).sort(), [
    "approvalDigest",
    "approvalExpiresAt",
    "candidateSha",
    "candidateTreeSha",
    "changedPathPolicyDigest",
    "graphSpecDigest",
    "graphVersion",
    "previousProductionBinding",
    "previewDeploymentId",
    "previewEvidenceDigest",
    "requiredChecksDigest",
    "rollbackAuthorization",
    "runId",
    "runnerRegistryDigest",
    "schemaSourcePlanDigest",
  ].sort());
});

test("rejects envelope drift and exposes no public resume-approval authority factory", () => {
  const envelope = publicApi.createPreviewPilotApprovalEnvelope(binding);
  assert.throws(
    () => publicApi.verifyApprovalEnvelope({ ...envelope, graphSpecDigest: "0".repeat(64) }),
    /graphSpecDigest|drift|digest/i,
  );
  assert.throws(
    () =>
      publicApi.createPreviewPilotApprovalEnvelope({
        ...binding,
        rollbackAuthorization: false,
      } as unknown as typeof binding),
    /rollbackAuthorization.*true/i,
  );
  assert.equal("createResumeApproval" in publicApi, false);
  assert.equal("verifyResumeApproval" in publicApi, false);
});
