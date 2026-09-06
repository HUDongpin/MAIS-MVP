import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectV2RuntimeAndLegacyProof,
  loadV2Manifest
} from "./v2/promotion-gate-v2-lib.mjs";
import {
  assertObservedRuntimePolicy,
  validateRevisedRuntimePolicyManifest,
  validateRuntimePolicyRevisionProposal
} from "./runtime-policy-revision.mjs";

const ACTIVE_MANIFEST =
  "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/promotion-manifest.v2.json";
const REVISION_ROOT =
  "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901";

test("sealed observed policy digest is required before a revision can supersede stale policy", () => {
  assert.throws(
    () => assertObservedRuntimePolicy({
      expectedPolicyDigest: "3cb75bdc2457f3d875351e89869fc0c28bb8edd94d1afe6a0d6090a0fd23349f",
      observedPolicyDigest: "43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5",
      targetBaselineCommit: "d0394f016eb91c3b065d4751601be65a7186e5ac"
    }),
    (error) => error?.code === "V2_RUNTIME_GRAPH_DRIFT" && error?.outcome === "blocked"
  );
});

test("candidate runtime-policy proposal is exact and fully non-live", async () => {
  const proposalPath = `${REVISION_ROOT}/runtime-policy-proposal.v1.json`;
  const proposal = JSON.parse(await readFile(proposalPath, "utf8"));

  assert.deepEqual(validateRuntimePolicyRevisionProposal(proposal), {
    proposalId: "runtime-policy-exact-delta-20260901",
    relation: "append-only-reaffirmation",
    status: "candidate-only",
    staleExpectedPolicyDigest: "3cb75bdc2457f3d875351e89869fc0c28bb8edd94d1afe6a0d6090a0fd23349f",
    observedPolicyDigest: "43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5",
    changedFields: [
      "edgeCount",
      "edgeDigest",
      "fsReadAllowlistDigest",
      "nextDynamicCallsiteDigest",
      "topologyEdgeCount",
      "topologyEdgeDigest"
    ],
    liveAllowed: false
  });
});

test("revised Manifest differs only by the sealed six-field runtime policy", async () => {
  const [proposal, activeManifest, revisedManifest] = await Promise.all([
    readFile(`${REVISION_ROOT}/runtime-policy-proposal.v1.json`, "utf8").then(JSON.parse),
    readFile(ACTIVE_MANIFEST, "utf8").then(JSON.parse),
    readFile(`${REVISION_ROOT}/promotion-manifest.v2.json`, "utf8").then(JSON.parse)
  ]);
  assert.deepEqual(validateRevisedRuntimePolicyManifest(activeManifest, revisedManifest, proposal), {
    changedFields: [
      "edgeCount",
      "edgeDigest",
      "fsReadAllowlistDigest",
      "nextDynamicCallsiteDigest",
      "topologyEdgeCount",
      "topologyEdgeDigest"
    ],
    targetBaselineCommit: "d0394f016eb91c3b065d4751601be65a7186e5ac",
    candidateDigest: "c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6",
    sourceCommit: "faf57280778c4b6543d15ce675638ac480b42864",
    checkerVersion: "promotion-gate-shadow-v2.6",
    liveAllowed: false
  });

  const bindingMutation = structuredClone(revisedManifest);
  bindingMutation.sourceCommit = "0".repeat(40);
  assert.throws(
    () => validateRevisedRuntimePolicyManifest(activeManifest, bindingMutation, proposal),
    (error) => error?.code === "REVISION_BINDING_INVALID" && error?.outcome === "blocked"
  );
});

test("sealed source, target, and observer commit identities stay distinct and exact", async () => {
  const proposal = JSON.parse(await readFile(`${REVISION_ROOT}/runtime-policy-proposal.v1.json`, "utf8"));
  assert.equal(proposal.sealedDelta.fromCommit, "00929b2bdf88368dd838d7ff11bda13d3707e0e1");
  assert.equal(proposal.sealedDelta.toCommit, "d0394f016eb91c3b065d4751601be65a7186e5ac");
  assert.equal(proposal.observerExecutionCommit, "e170e6260f565abf1a2c576de3b3df388490c669");
  assert.notEqual(proposal.sealedDelta.toCommit, proposal.observerExecutionCommit);

  for (const [field, value] of [
    ["fromCommit", "f".repeat(40)],
    ["toCommit", proposal.observerExecutionCommit]
  ]) {
    const mutated = structuredClone(proposal);
    mutated.sealedDelta[field] = value;
    assert.throws(
      () => validateRuntimePolicyRevisionProposal(mutated),
      (error) => error?.code === "REVISION_DELTA_INVALID" && error?.outcome === "blocked"
    );
  }
});

test("runtime-policy proposal fails closed on capability expansion and execution authorization", async () => {
  const proposal = JSON.parse(await readFile(`${REVISION_ROOT}/runtime-policy-proposal.v1.json`, "utf8"));

  for (const field of [
    "reachablePathSetExpansion",
    "newLoaderCapability",
    "fsReadCapabilityExpansion",
    "dynamicImportTargetExpansion",
    "newNonliteralDynamicImport",
    "zeroBaselineLoaderExpansion"
  ]) {
    const capabilityExpansion = structuredClone(proposal);
    capabilityExpansion.classification[field] = true;
    assert.throws(
      () => validateRuntimePolicyRevisionProposal(capabilityExpansion),
      (error) => error?.code === "REVISION_CAPABILITY_EXPANSION" && error?.outcome === "blocked"
    );
  }

  for (const field of ["newStaticDependencyEdge", "graphTopologyExpansion"]) {
    const hiddenExpansion = structuredClone(proposal);
    hiddenExpansion.classification[field] = false;
    assert.throws(
      () => validateRuntimePolicyRevisionProposal(hiddenExpansion),
      (error) => error?.code === "REVISION_CLASSIFICATION_INVALID" && error?.outcome === "blocked"
    );
  }
  const authorizedExecution = structuredClone(proposal);
  authorizedExecution.authorization.shadowAllowed = true;
  assert.throws(
    () => validateRuntimePolicyRevisionProposal(authorizedExecution),
    (error) => error?.code === "REVISION_ORDERING_INVALID" && error?.outcome === "blocked"
  );
});

test("every sealed runtime-policy field fails closed on mutation", async () => {
  const proposal = JSON.parse(await readFile(`${REVISION_ROOT}/runtime-policy-proposal.v1.json`, "utf8"));
  for (const field of proposal.sealedDelta.changedFields) {
    const mutated = structuredClone(proposal);
    if (field.endsWith("Count")) mutated.sealedDelta.observed[field] += 1;
    else mutated.sealedDelta.observed[field] = "0".repeat(64);
    assert.throws(
      () => validateRuntimePolicyRevisionProposal(mutated),
      (error) => error?.code === "REVISION_DELTA_INVALID" && error?.outcome === "blocked"
    );
  }
});

test("stale expected runtime policy rejects the target baseline with V2_RUNTIME_GRAPH_DRIFT", async () => {
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const { manifest } = await loadV2Manifest(repoRoot, ACTIVE_MANIFEST);

  await assert.rejects(
    collectV2RuntimeAndLegacyProof(repoRoot, manifest, "e170e6260f565abf1a2c576de3b3df388490c669"),
    (error) => error?.code === "V2_RUNTIME_GRAPH_DRIFT" && error?.outcome === "blocked"
  );
});
