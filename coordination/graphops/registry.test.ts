import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_LEVELS,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  LIFECYCLE_STATES,
  NODE_OUTCOMES,
  SIDE_EFFECT_CLASSES,
  getRunnerRegistry,
} from "./index";

const EXPECTED_RUNNER_IDS = [
  "git.bind-protected-main",
  "release.owner-currentness",
  "github.required-checks",
  "release.build-gate",
  "vercel.prepare-staging",
  "vercel.deploy-preview",
  "vercel.inspect-preview",
  "smoke.preview-readonly",
  "github.verify-production-approval",
  "schema.production-preflight",
  "schema.production-apply",
  "vercel.deploy-production-candidate",
  "vercel.verify-production-candidate",
  "vercel.promote",
  "smoke.production-readonly",
  "vercel.restore-previous",
  "release.closeout",
] as const;

test("publishes the fixed v1 runner registry in the approved order", () => {
  assert.equal(GRAPHOPS_RUNNER_REGISTRY_VERSION, "mais-graphops-runner-registry.v1");
  assert.deepEqual(GRAPHOPS_RUNNER_IDS, EXPECTED_RUNNER_IDS);

  const registry = getRunnerRegistry();
  assert.deepEqual(
    registry.map((node) => node.runnerId),
    EXPECTED_RUNNER_IDS,
  );
  assert.equal(new Set(registry.map((node) => node.runnerId)).size, 17);

  const requiredFields = [
    "allowedReadScopes",
    "allowedWriteScopes",
    "authorizationClass",
    "dependsOn",
    "id",
    "inputSchema",
    "outputSchema",
    "ownerRole",
    "requiredEvidence",
    "retryPolicy",
    "reviewerRoles",
    "runnerId",
    "sideEffectClass",
    "terminalOutcomes",
    "timeoutMs",
    "version",
  ].sort();
  for (const node of registry) {
    assert.deepEqual(Object.keys(node).sort(), requiredFields);
    assert.equal(node.id, node.runnerId);
    assert.equal(node.version, "1.0.0");
    assert.match(node.ownerRole, /^A(?:10|11|12|22|25)$/);
    assert.ok(node.reviewerRoles.length > 0);
    assert.ok(node.inputSchema.startsWith("mais.graphops.schema."));
    assert.ok(node.outputSchema.startsWith("mais.graphops.schema."));
    assert.ok(node.requiredEvidence.length > 0);
    assert.ok(node.allowedReadScopes.length > 0);
    assert.ok(SIDE_EFFECT_CLASSES.includes(node.sideEffectClass));
    assert.ok(["none", "preview-authorized", "production-owner"].includes(node.authorizationClass));
    assert.ok(node.timeoutMs > 0);
    assert.ok(node.terminalOutcomes.every((outcome) => NODE_OUTCOMES.includes(outcome)));
    assert.ok(node.terminalOutcomes.length > 0);
    if (
      [
        "EXTERNAL_PREVIEW_WRITE",
        "PRODUCTION_SCHEMA_WRITE",
        "PRODUCTION_DEPLOYMENT_WRITE",
        "PRODUCTION_TRAFFIC_SWITCH",
        "COMPENSATING_ROLLBACK",
      ].includes(node.sideEffectClass)
    ) {
      assert.equal(node.retryPolicy.maxAttempts, 1);
      assert.equal(node.retryPolicy.reconcileBeforeRetry, true);
    }
  }

  for (const singleAttemptRunner of [
    "release.build-gate",
    "smoke.preview-readonly",
    "smoke.production-readonly",
  ] as const) {
    assert.equal(
      registry.find((node) => node.runnerId === singleAttemptRunner)?.retryPolicy.maxAttempts,
      1,
    );
  }
});

test("publishes the exact approved outcome, side-effect, lifecycle, and evidence vocabularies", () => {
  assert.deepEqual(NODE_OUTCOMES, [
    "PASS",
    "BLOCKED",
    "REPAIR_REQUIRED",
    "REJECTED",
    "INCONCLUSIVE",
    "ROLLED_BACK",
    "CANCELLED",
    "FAILED_INTERNAL",
  ]);
  assert.deepEqual(SIDE_EFFECT_CLASSES, [
    "READ_ONLY",
    "LOCAL_EPHEMERAL_WRITE",
    "EXTERNAL_PREVIEW_WRITE",
    "PRODUCTION_SCHEMA_WRITE",
    "PRODUCTION_DEPLOYMENT_WRITE",
    "PRODUCTION_TRAFFIC_SWITCH",
    "COMPENSATING_ROLLBACK",
  ]);
  assert.deepEqual(LIFECYCLE_STATES, [
    "PLANNED",
    "VALIDATING",
    "PREVIEW_DEPLOYED",
    "PREVIEW_VERIFIED",
    "AWAITING_PRODUCTION_APPROVAL",
    "PRODUCTION_APPROVED",
    "SCHEMA_APPLIED",
    "PRODUCTION_CANDIDATE_VERIFIED",
    "PROMOTED",
    "LIVE_VERIFIED",
    "CLOSED",
    "BLOCKED",
    "REPAIR_REQUIRED",
    "REJECTED",
    "INCONCLUSIVE",
    "ROLLED_BACK",
    "CANCELLED",
    "FAILED_INTERNAL",
  ]);
  assert.deepEqual(EVIDENCE_LEVELS, ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7"]);
});

test("limits restoration to traffic compensation and makes normal closeout read-only", () => {
  const registry = getRunnerRegistry();
  const restore = registry.find(
    (node) => node.runnerId === "vercel.restore-previous",
  );
  const closeout = registry.find(
    (node) => node.runnerId === "release.closeout",
  );

  assert.ok(restore);
  assert.deepEqual(restore.dependsOn, ["vercel.promote"]);

  assert.ok(closeout);
  assert.deepEqual(closeout.dependsOn, ["smoke.production-readonly"]);
  assert.equal(closeout.sideEffectClass, "READ_ONLY");
  assert.deepEqual(closeout.allowedWriteScopes, []);
  assert.equal(closeout.retryPolicy.maxAttempts, 1);
  assert.equal(closeout.retryPolicy.reconcileBeforeRetry, false);
});
