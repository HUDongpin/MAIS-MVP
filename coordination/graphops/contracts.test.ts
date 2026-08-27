import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
  validateGraphManifest,
} from "./index";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function manifestFixture(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "mais-graphops-manifest.v1",
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runId: "run-001",
    candidate: { commitSha: SHA_A, treeSha: SHA_B },
    runnerIds: [...GRAPHOPS_RUNNER_IDS],
    ...overrides,
  };
}

test("validates a closed manifest and defaults every side-effect authorization off", () => {
  const manifest = validateGraphManifest(manifestFixture());

  assert.deepEqual(manifest.authorizations, {
    previewAllowed: false,
    productionAllowed: false,
  });
  assert.equal(manifest.candidate.commitSha, SHA_A);
  assert.equal(manifest.candidate.treeSha, SHA_B);
  assert.equal(manifest.graphId, "mais.release.v1");
  assert.equal(manifest.graphVersion, "1.0.0");
  assert.equal(manifest.graphSpecDigest, getGraphSpecDigest());
  assert.equal(manifest.runnerRegistryDigest, getRunnerRegistryDigest());
  assert.deepEqual(manifest.runnerIds, GRAPHOPS_RUNNER_IDS);
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.authorizations));
});

test("rejects manifest graph identity, version, and digest drift", () => {
  assert.throws(
    () => validateGraphManifest(manifestFixture({ graphId: "other.release.v1" })),
    /graphId|fixed graph/i,
  );
  assert.throws(
    () => validateGraphManifest(manifestFixture({ graphVersion: "1.0.1" })),
    /graphVersion|fixed graph/i,
  );
  assert.throws(
    () => validateGraphManifest(manifestFixture({ graphSpecDigest: "0".repeat(64) })),
    /graphSpecDigest|drift/i,
  );
  assert.throws(
    () =>
      validateGraphManifest(
        manifestFixture({ runnerRegistryDigest: "1".repeat(64) }),
      ),
    /runnerRegistryDigest|drift/i,
  );
});

test("hard-seals Foundation manifests against Preview and production capabilities", () => {
  assert.throws(
    () =>
      validateGraphManifest(
        manifestFixture({
          authorizations: { previewAllowed: true, productionAllowed: false },
        }),
      ),
    /Foundation.*previewAllowed=false/i,
  );
  assert.throws(
    () =>
      validateGraphManifest(
        manifestFixture({
          authorizations: { previewAllowed: false, productionAllowed: true },
        }),
      ),
    /Foundation.*productionAllowed=false/i,
  );
});

test("rejects command, environment, SQL, URL, provider, deploy, and network fields at any depth", () => {
  const forbiddenFields = [
    "command",
    "shell",
    "env",
    "rawSQL",
    "targetUrl",
    "providerConfig",
    "deployArgs",
    "networkEndpoint",
  ];

  for (const forbiddenField of forbiddenFields) {
    assert.throws(
      () =>
        validateGraphManifest({
          ...manifestFixture(),
          metadata: { safeWrapper: { [forbiddenField]: "arbitrary payload" } },
        }),
      new RegExp(`forbidden manifest field.*${forbiddenField}`, "i"),
      forbiddenField,
    );
  }
});

test("rejects unknown, missing, duplicated, or reordered runner IDs", () => {
  const unknown = [...GRAPHOPS_RUNNER_IDS] as string[];
  unknown[3] = "shell.exec-arbitrary";
  assert.throws(
    () => validateGraphManifest(manifestFixture({ runnerIds: unknown })),
    /not a registered runner ID/,
  );

  const reordered = [...GRAPHOPS_RUNNER_IDS];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.throws(
    () => validateGraphManifest(manifestFixture({ runnerIds: reordered })),
    /exactly match.*registry order/,
  );
  assert.throws(
    () =>
      validateGraphManifest(
        manifestFixture({ runnerIds: GRAPHOPS_RUNNER_IDS.slice(0, -1) }),
      ),
    /exactly match.*registry order/,
  );
  assert.throws(
    () =>
      validateGraphManifest(
        manifestFixture({
          runnerIds: [GRAPHOPS_RUNNER_IDS[0], ...GRAPHOPS_RUNNER_IDS],
        }),
      ),
    /exactly match.*registry order/,
  );
});
