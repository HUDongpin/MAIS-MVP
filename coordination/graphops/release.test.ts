import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  applyReceipt,
  createReceipt,
  createReleaseState,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
  sha256Digest,
  validateGraphManifest,
  validateReleaseState,
  verifyReceipt,
} from "./index";

function manifest(runId = "run-release-001") {
  return validateGraphManifest({
    schemaVersion: "mais-graphops-manifest.v1",
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runId,
    candidate: { commitSha: "c".repeat(40), treeSha: "d".repeat(40) },
    authorizations: { previewAllowed: false, productionAllowed: false },
    runnerIds: [...GRAPHOPS_RUNNER_IDS],
  });
}

function receiptAt(
  releaseManifest: ReturnType<typeof manifest>,
  state: ReturnType<typeof createReleaseState>,
  runnerId: (typeof GRAPHOPS_RUNNER_IDS)[number],
  minute: number,
) {
  return createReceipt({
    manifest: releaseManifest,
    state,
    runnerId,
    outcome: "PASS",
    evidenceDigest: sha256Digest({ runnerId, verified: true }),
    producedAt: new Date(Date.UTC(2026, 7, 27, 10, minute)).toISOString(),
  });
}

test("keeps lifecycle separate from evidence and makes semantic receipts run/timestamp independent", () => {
  const firstManifest = manifest("run-release-001");
  const secondManifest = manifest("run-release-002");
  const firstState = createReleaseState(firstManifest);
  const secondState = createReleaseState(secondManifest);
  const boundEvidenceDigest = sha256Digest({
    protectedMainBound: true,
    sourceSha: firstManifest.candidate.commitSha,
  });

  assert.equal(firstState.lifecycle, "PLANNED");
  assert.equal(firstState.evidenceLevel, "E0");
  assert.equal(firstState.threadId, firstManifest.runId);
  assert.deepEqual(firstState.nodeReceipts, []);
  assert.equal(firstState.preview, null);
  assert.equal(firstState.approval, null);
  assert.equal(firstState.productionCandidate, null);
  assert.equal(firstState.previousProduction, null);
  assert.deepEqual(firstState.schema, {
    status: "NOT_PLANNED",
    sourcePlanDigest: null,
  });
  assert.deepEqual(firstState.sideEffects, []);
  assert.equal(firstState.blocker, null);
  assert.deepEqual(Object.keys(firstState).sort(), [
    "approval",
    "blocker",
    "candidate",
    "evidenceLevel",
    "graphId",
    "graphSpecDigest",
    "graphVersion",
    "lifecycle",
    "manifestDigest",
    "nodeReceipts",
    "previousProduction",
    "preview",
    "productionCandidate",
    "registryVersion",
    "runId",
    "runnerRegistryDigest",
    "schema",
    "schemaVersion",
    "sideEffects",
    "threadId",
  ].sort());

  const first = createReceipt({
    manifest: firstManifest,
    state: firstState,
    runnerId: "git.bind-protected-main",
    outcome: "PASS",
    evidenceDigest: boundEvidenceDigest,
    producedAt: "2026-08-27T10:00:00.000Z",
  });
  const replay = createReceipt({
    manifest: secondManifest,
    state: secondState,
    runnerId: "git.bind-protected-main",
    outcome: "PASS",
    evidenceDigest: boundEvidenceDigest,
    producedAt: "2026-08-27T10:01:00.000Z",
  });

  assert.equal(first.stateAfter.lifecycle, "VALIDATING");
  assert.equal(first.stateAfter.evidenceLevel, "E0");
  assert.equal(first.attempt, 1);
  assert.equal(first.sourceSha, firstManifest.candidate.commitSha);
  assert.equal(first.treeSha, firstManifest.candidate.treeSha);
  assert.match(first.correlationId, /^[0-9a-f]{64}$/);
  assert.match(first.causationEventId, /^[0-9a-f]{64}$/);
  assert.match(first.runnerReleaseDigest, /^[0-9a-f]{64}$/);
  assert.match(first.rawInputDigest, /^[0-9a-f]{64}$/);
  assert.match(first.semanticInputDigest, /^[0-9a-f]{64}$/);
  assert.match(first.rawOutputDigest, /^[0-9a-f]{64}$/);
  assert.match(first.semanticOutputDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(first.stateBefore, { lifecycle: "PLANNED", evidenceLevel: "E0" });
  assert.deepEqual(first.stateAfter, { lifecycle: "VALIDATING", evidenceLevel: "E0" });
  assert.deepEqual(first.artifactRefs, []);
  assert.deepEqual(first.sideEffects, []);
  assert.deepEqual(Object.keys(first).sort(), [
    "approvalEnvelopeDigest",
    "artifactRefs",
    "attempt",
    "causationEventId",
    "correlationId",
    "evidenceDigest",
    "graphId",
    "graphSpecDigest",
    "graphVersion",
    "manifestDigest",
    "outcome",
    "previousRawReceiptDigest",
    "previousSemanticReceiptDigest",
    "producedAt",
    "rawInputDigest",
    "rawOutputDigest",
    "rawReceiptDigest",
    "registryVersion",
    "runId",
    "runnerId",
    "runnerRegistryDigest",
    "runnerReleaseDigest",
    "schemaVersion",
    "semanticInputDigest",
    "semanticOutputDigest",
    "semanticReceiptDigest",
    "sequence",
    "sideEffects",
    "sourceSha",
    "stateAfter",
    "stateBefore",
    "treeSha",
  ].sort());
  assert.equal(first.semanticReceiptDigest, replay.semanticReceiptDigest);
  assert.notEqual(first.rawReceiptDigest, replay.rawReceiptDigest);
  assert.match(first.evidenceDigest, /^[0-9a-f]{64}$/);
  assert.equal(first.evidenceDigest, boundEvidenceDigest);
  assert.equal("evidence" in first, false);
  assert.doesNotThrow(() => verifyReceipt(first, { manifest: firstManifest, state: firstState }));
});

test("enforces the fixed first node and every legal next dependency", () => {
  const releaseManifest = manifest();
  const state = createReleaseState(releaseManifest);
  assert.throws(
    () => receiptAt(releaseManifest, state, "vercel.promote", 0),
    /Foundation public receipts|first node|legal next/i,
  );

  const first = receiptAt(releaseManifest, state, "git.bind-protected-main", 1);
  const advanced = applyReceipt(state, first, { manifest: releaseManifest });
  assert.throws(
    () => receiptAt(releaseManifest, advanced, "github.required-checks", 2),
    /legal next/i,
  );
  assert.doesNotThrow(() =>
    receiptAt(releaseManifest, advanced, "release.owner-currentness", 2),
  );
});

test("keeps public Foundation receipt creation and verification read-only and non-production", () => {
  const releaseManifest = manifest();
  let state = createReleaseState(releaseManifest);
  for (const [minute, runnerId] of GRAPHOPS_RUNNER_IDS.slice(0, 3).entries()) {
    const receipt = receiptAt(releaseManifest, state, runnerId, minute);
    state = applyReceipt(state, receipt, { manifest: releaseManifest });
  }

  assert.equal(state.lifecycle, "VALIDATING");
  assert.equal(
    state.evidenceLevel,
    "E3",
    "protected-main required checks are E3; source binding alone must not claim E1 build evidence",
  );

  assert.throws(
    () => receiptAt(releaseManifest, state, "release.build-gate", 4),
    /Foundation public receipts.*read-only validation/i,
  );
  assert.throws(
    () => receiptAt(releaseManifest, createReleaseState(releaseManifest), "github.verify-production-approval", 5),
    /Foundation public receipts.*read-only validation/i,
  );

  const first = receiptAt(
    releaseManifest,
    createReleaseState(releaseManifest),
    "git.bind-protected-main",
    6,
  );
  assert.throws(
    () =>
      verifyReceipt(
        {
          ...first,
          runnerId: "github.verify-production-approval",
          approvalEnvelopeDigest: "a".repeat(64),
        },
        { manifest: releaseManifest, state: createReleaseState(releaseManifest) },
      ),
    /Foundation public receipts|exactly/i,
  );
});

test("rejects arbitrary receipt evidence bodies instead of interpreting runner-controlled prose", () => {
  const releaseManifest = manifest();
  const state = createReleaseState(releaseManifest);
  for (const field of ["command", "shell", "env", "rawSql", "targetUrl", "provider", "deployArgs", "networkEndpoint"]) {
    assert.throws(
      () =>
        createReceipt({
          manifest: releaseManifest,
          state,
          runnerId: "git.bind-protected-main",
          outcome: "PASS",
          evidenceDigest: "e".repeat(64),
          evidence: { safe: { nested: { [field]: "blocked" } } },
          producedAt: "2026-08-27T10:00:00.000Z",
        } as unknown as Parameters<typeof createReceipt>[0]),
      /must contain exactly/i,
      field,
    );
  }
});

test("stores only a caller-bound digest and rejects secret or PII evidence bodies", () => {
  const fakeProviderToken = [
    "gh",
    "p_",
    "1234567890abcdefghijklmnopqrstuvwx",
  ].join("");
  const fakeDatabaseUrl = [
    "postgres",
    "ql://runner:fixture-password@db.invalid/graphops",
  ].join("");
  const releaseManifest = manifest();
  const state = createReleaseState(releaseManifest);
  assert.throws(
    () =>
      createReceipt({
        manifest: releaseManifest,
        state,
        runnerId: "git.bind-protected-main",
        outcome: "PASS",
        evidenceDigest: "e".repeat(64),
        evidence: {
          message: `${fakeProviderToken} ${fakeDatabaseUrl}`,
          identity: "Jane Student completed Algebra",
        },
        producedAt: "2026-08-27T10:00:00.000Z",
      } as unknown as Parameters<typeof createReceipt>[0]),
    /must contain exactly/i,
  );
  const receipt = createReceipt({
    manifest: releaseManifest,
    state,
    runnerId: "git.bind-protected-main",
    outcome: "PASS",
    evidenceDigest: "e".repeat(64),
    producedAt: "2026-08-27T10:00:00.000Z",
  });
  const advanced = applyReceipt(state, receipt, { manifest: releaseManifest });

  for (const serialized of [JSON.stringify(receipt), JSON.stringify(advanced)]) {
    assert.equal(serialized.includes(fakeProviderToken), false);
    assert.equal(serialized.includes(fakeDatabaseUrl), false);
    assert.equal(serialized.includes("Jane Student"), false);
  }
  assert.equal(receipt.evidenceDigest, "e".repeat(64));
});

test("records a typed blocker and prevents traversal after a terminal node outcome", () => {
  const releaseManifest = manifest();
  const state = createReleaseState(releaseManifest);
  const blocked = createReceipt({
    manifest: releaseManifest,
    state,
    runnerId: "git.bind-protected-main",
    outcome: "BLOCKED",
    evidenceDigest: sha256Digest({ reasonCode: "protected-main-binding-missing" }),
    producedAt: "2026-08-27T10:00:00.000Z",
  });
  const blockedState = applyReceipt(state, blocked, {
    manifest: releaseManifest,
  });

  assert.equal(blockedState.lifecycle, "BLOCKED");
  assert.equal(blockedState.evidenceLevel, "E0");
  assert.deepEqual(blockedState.blocker, {
    runnerId: "git.bind-protected-main",
    outcome: "BLOCKED",
    evidenceDigest: blocked.semanticOutputDigest,
  });
  assert.throws(
    () =>
      receiptAt(
        releaseManifest,
        blockedState,
        "release.owner-currentness",
        1,
      ),
    /blocked Foundation state/i,
  );
});

test("rejects wrong digests, manifest drift, stale frontiers, and transition-drifted state chains", () => {
  const releaseManifest = manifest();
  const state = createReleaseState(releaseManifest);
  const receipt = receiptAt(releaseManifest, state, "git.bind-protected-main", 0);

  assert.throws(
    () => verifyReceipt({ ...receipt, rawReceiptDigest: "0".repeat(64) }, { manifest: releaseManifest, state }),
    /rawReceiptDigest mismatch/,
  );
  assert.throws(
    () => verifyReceipt({ ...receipt, semanticReceiptDigest: "1".repeat(64) }, { manifest: releaseManifest, state }),
    /semanticReceiptDigest mismatch/,
  );
  assert.throws(
    () => verifyReceipt({ ...receipt, rawInputDigest: "2".repeat(64) }, { manifest: releaseManifest, state }),
    /rawInputDigest mismatch/,
  );

  const otherManifest = manifest("run-release-drifted");
  assert.throws(
    () => verifyReceipt(receipt, { manifest: otherManifest, state: createReleaseState(otherManifest) }),
    /stale or drifted.*manifest/i,
  );

  const advanced = applyReceipt(state, receipt, { manifest: releaseManifest });
  assert.throws(
    () => verifyReceipt(receipt, { manifest: releaseManifest, state: advanced }),
    /stale or drifted.*frontier/i,
  );
  assert.throws(
    () =>
      validateReleaseState(
        {
          ...advanced,
          nodeReceipts: [{ ...receipt, runnerId: "vercel.promote" }],
        },
        { manifest: releaseManifest },
      ),
    /Foundation public receipts|digest|transition/i,
  );
});
