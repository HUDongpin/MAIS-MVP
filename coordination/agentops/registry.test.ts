import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { sha256Digest } from "./canonical";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("lane registry contains exactly A01-A25 and the digest binds every executable registry", async () => {
  const {
    LANE_REGISTRY,
    LANE_REGISTRY_DIGEST,
    PROBE_REGISTRY,
    SHARED_PATH_OWNER_REGISTRY,
    SPECIALIST_REGISTRY,
  } = await import("./registry");
  const expected = Array.from(
    { length: 25 },
    (_unused, index) => `A${String(index + 1).padStart(2, "0")}`,
  );

  assert.deepEqual(Object.keys(LANE_REGISTRY).sort(), expected);
  assert.match(LANE_REGISTRY_DIGEST, /^[a-f0-9]{64}$/);
  assert.equal(
    LANE_REGISTRY_DIGEST,
    sha256Digest({
      lanes: LANE_REGISTRY,
      probes: PROBE_REGISTRY,
      sharedPathOwners: SHARED_PATH_OWNER_REGISTRY,
      specialists: SPECIALIST_REGISTRY,
    }),
  );
  assert.ok(Object.isFrozen(LANE_REGISTRY));
  for (const lane of Object.values(LANE_REGISTRY)) {
    assert.equal(lane.laneId.startsWith("A"), true);
    assert.ok(lane.objectKinds.length > 0);
    assert.ok(lane.ownedPathScopes.length > 0);
  }
});

test("lane registry remains in parity with AGENTS and release-intake owners", async () => {
  const { verifyLaneRegistryParity } = await import("./registry");
  const result = await verifyLaneRegistryParity(repoRoot);

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.missingFromRegistry, []);
  assert.deepEqual(result.invalidReleaseOwners, []);
  assert.deepEqual(result.invalidSharedOwners, []);
  assert.deepEqual(result.sharedOwnerScopeMismatches, []);
  assert.deepEqual(result.undocumentedSharedOwnerScopes, []);
  assert.match(result.agentsPolicyDigest, /^[a-f0-9]{64}$/);
  assert.match(result.releaseRegistryDigest, /^[a-f0-9]{64}$/);
});

test("probe and specialist registries expose ids but never arbitrary commands or providers", async () => {
  const { PROBE_REGISTRY, SPECIALIST_REGISTRY } = await import("./registry");

  assert.deepEqual(Object.keys(PROBE_REGISTRY).sort(), [
    "git.snapshot",
    "git.worktrees",
    "repo.context-boundaries",
    "repo.policy-digests",
    "repo.specialist-availability",
  ]);
  const encoded = JSON.stringify({ PROBE_REGISTRY, SPECIALIST_REGISTRY });
  assert.doesNotMatch(encoded, /providerExecution|credentialAccess|deploymentAllowed/);
  assert.doesNotMatch(encoded, /\bshell\b|https?:\/\//i);
  assert.equal(
    SPECIALIST_REGISTRY["question-machine-qa.v1"].availabilityPolicy,
    "reviewed-currentness-marker-required",
  );
  assert.ok(
    SPECIALIST_REGISTRY["question-machine-qa.v1"].requiredPaths.some((value) =>
      value.endsWith("question-machine-qa.reviewed-current.json"),
    ),
  );
});

test("question machine QA pins reviewed source provenance without promoting currentness", async () => {
  const { SPECIALIST_REGISTRY } = await import("./registry");
  const workflow = SPECIALIST_REGISTRY["question-machine-qa.v1"];

  assert.deepEqual(workflow.reviewedSource, {
    status: "source-package-installation-verified",
    evidenceBasis: "committed-redacted-receipt-not-agentops-execution",
    suiteName: "mais-question-qa-skill-suite",
    suiteVersion: "1.0.0",
    sourceBranch: "codex/a10-qa-skill-distillation-20260827",
    sourceCommit: "e33bf615846b708edf8339a4a82c6b760574c349",
    receiptCommit: "a49914a4dc34212354a64dbcad13c28f899c3782",
    baseCommit: "f001a9570f2a0ef066b1a83a33619f72215ff354",
    sourceScope: "coordination/skills/**",
    changedFileCount: 92,
    packageName: "mais-rsi-machine-qa-workflow",
    packagePath: "coordination/skills/mais-rsi-machine-qa-workflow",
    sourceTreeSha256: "6fe8303c91b5ba276632e4ad7a74c0e9c30a15cd8e71e33cc4cebaa790137e24",
    packageViewSha256: "fd4953c1cde7b0564d7706e1353ef5a80d7d1b976589ee53ad735ae1dc607b01",
    packageArchiveSha256: "7d42cf2837a274b678f5e7b00e0aa7464ad4d0498e4c9e3dc89f4d3aa84be1e1",
    installedReadbackSha256: "fd4953c1cde7b0564d7706e1353ef5a80d7d1b976589ee53ad735ae1dc607b01",
    installationReceiptSha256: "250211c582f855d468697e9b364e074e9a9493b8a11bb215c981f64117981927",
    packageBuildVerified: true,
    installationReadbackVerified: true,
    backupRollbackDrillVerified: true,
    finalReceiptCommitVerified: true,
  });
  assert.deepEqual(workflow.reviewedRepository, {
    reviewedMainCommit: "9bf9cfb99f75a0dbc5a298e0d6aae74594571890",
    agentopsCommit: "150ded76db7d64c368e5db7e6cb30f3d90d40f78",
  });
  assert.equal(workflow.availabilityPolicy, "reviewed-currentness-marker-required");
  assert.ok(
    workflow.requiredPaths.includes(
      "coordination/agentops/currentness/question-machine-qa.reviewed-current.json",
    ),
  );
});
