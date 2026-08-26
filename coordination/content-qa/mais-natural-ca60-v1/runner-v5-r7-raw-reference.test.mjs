import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  reconstructAttemptGraphV5R7,
  validateAttemptGraphReconstructionReceiptV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  buildProviderAttemptCommitIntentV5R7,
  buildResolvedProviderAttemptReceiptV5R7,
} from "./attempt-transaction-v5-r7.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  buildResolvedDispatchPermitV5R6,
  buildStateBoundDispatchAuditV5R6,
  createResolvedExactProviderTransportV5R6,
  runGuardedProviderAttemptV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  createRawResponseCustodyStoreV5R6,
  buildRawResponseBindingReceiptV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildRawAuthoritativeMachineReferenceSealV5R7,
  buildRawAuthoritativeReferenceValidationV5R7,
  validateRawAuthoritativeMachineReferenceSealV5R7,
  validateRawAuthoritativeReferenceValidationV5R7,
} from "./raw-authoritative-reference-v5-r7.mjs";
import {
  openAIResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  buildResolvedActivationFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";

const SECRET_SENTINEL = "r7-reference-fixture-secret-never-persist";

function responsePayload(role) {
  if (["A_LABEL", "B_LABEL"].includes(role)) {
    return {
      rawLabel: "NO_FINDING",
      rawTaxonomyCodes: ["NO_FINDING"],
      rawSeverity: "NONE",
      rawFindingFamilies: { NO_FINDING: null },
      rawFindings: [],
      rawUncertain: false,
    };
  }
  return { solution: "fixture solution", solvability: "SOLVABLE", uncertain: false };
}

function transportClock(at) {
  let milliseconds = Date.parse(at);
  return () => new Date(milliseconds += 10);
}

function itemLeafFor(fixture, manifestOrdinal) {
  const row = fixture.sampleManifest.selectedRows[manifestOrdinal - 1];
  return fixture.itemLeaves.find(({ itemId }) => itemId === row.itemId);
}

async function buildCompleteRawReferenceFixture(actionCount = 240) {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-reference-"));
  const fixture = buildResolvedActivationFixtureV5R6("OPENAI_DIRECT");
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const atomicLedger = await createAtomicExecutionLedgerV5R7({
    trustedRoot,
    ledgerRelativePath: "reference-ledger",
    authorization: fixture.authorization.compatibilityAuthorization,
    inventory: fixture.inventory,
    priceSnapshot: fixture.priceSnapshot,
  });
  const custody = await createRawResponseCustodyStoreV5R6({ protectedRoot });
  const requestArtifacts = [];
  const dispatchAudits = [];
  const dispatchPermits = [];
  const compatibilityDispatchPermits = [];
  const rawResponseArtifacts = [];
  const rawResponseBindingReceipts = [];
  const attemptCommitIntents = [];
  const resolvedAttemptReceipts = [];

  for (let actionIndex = 0; actionIndex < actionCount; actionIndex += 1) {
    const verifiedBefore = await atomicLedger.verify();
    assert.deepEqual(verifiedBefore.errors, []);
    const at = new Date(Date.parse("2026-08-26T10:00:00.000Z") + actionIndex * 1_000).toISOString();
    const stateInput = { ...fixture, ledgerEntries: verifiedBefore.entries, at };
    const dispatchAudit = buildStateBoundDispatchAuditV5R6(stateInput);
    const itemLeaf = itemLeafFor(fixture, dispatchAudit.executionPlan.manifestOrdinal);
    const requestArtifact = buildProviderRequestArtifactV5R6({
      activeRegistration: fixture.activeRegistration,
      authorization: fixture.authorization,
      registration: fixture.registration,
      inventory: fixture.inventory,
      sampleManifest: fixture.sampleManifest,
      itemLeaf,
      role: dispatchAudit.role,
      attemptId: dispatchAudit.attemptId,
      ledgerEntries: verifiedBefore.entries,
    });
    let rawResponseArtifact = null;
    let rawResponseBindingReceipt = null;
    let authoritativeRoleOutput = null;
    let attemptCommitIntent = null;
    const rawResponseStore = {
      persist: async (input) => {
        const persisted = await custody.persist(input);
        rawResponseArtifact = persisted.artifact;
        return persisted;
      },
      persistBinding: async (binding) => {
        // R6 constructs this provisional binding against an outer-registration
        // role output. R7 deliberately withholds it from durable custody and
        // persists the corrected compatibility output binding inside the
        // intent-aware ledger callback before completion.
        return { binding, contentHash: binding.selfHash, persistedBeforeCompletion: true };
      },
    };
    const ledger = {
      reserve: (input) => atomicLedger.reserve(input),
      complete: async ({ reservationHash, providerEventReceipt, roleOutput }) => {
        const current = await atomicLedger.verify();
        const reservation = current.entries.find(({ selfHash }) => selfHash === reservationHash);
        const dispatchPermit = buildResolvedDispatchPermitV5R6({
          input: { ...stateInput, requestArtifact },
          reservation,
          dispatchAudit,
        });
        const { selfHash: _provisionalOutputHash, ...provisionalOutputBody } = roleOutput;
        authoritativeRoleOutput = sealV5R3Artifact({
          ...provisionalOutputBody,
          runnerRegistrationHash: fixture.registration.selfHash,
        });
        rawResponseBindingReceipt = buildRawResponseBindingReceiptV5R6({
          activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
          rawResponseArtifact,
          providerEventReceipt,
          roleOutput: authoritativeRoleOutput,
          requestArtifact,
          boundAt: providerEventReceipt.finishedAt,
        });
        const durableBinding = await custody.persistBinding(rawResponseBindingReceipt);
        assert.equal(durableBinding.persistedBeforeCompletion, true);
        const committed = await atomicLedger.completeWithDurableIntent({
          reservationHash,
          providerEventReceipt,
          roleOutput: authoritativeRoleOutput,
          persistIntent: async (preparedCompletion) => {
            attemptCommitIntent = buildProviderAttemptCommitIntentV5R7({
              activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
              authorizationHash: fixture.authorization.selfHash,
              requestArtifact,
              dispatchAudit,
              reservation,
              dispatchPermit,
              compatibilityDispatchPermit: providerEventReceipt.dispatchPermit,
              rawResponseArtifact,
              rawResponseBindingReceipt,
              providerEventReceipt,
              roleOutput: authoritativeRoleOutput,
              preparedCompletion,
              rawAndBindingDurable: true,
              preparedAt: "2026-08-26T11:00:00.000Z",
            });
            await atomicWriteProtectedJsonV5R4({
              trustedRoot,
              relativePath: path.join("attempt-intents", `${attemptCommitIntent.selfHash}.json`),
              value: attemptCommitIntent,
            });
            return { intent: attemptCommitIntent, contentHash: attemptCommitIntent.selfHash };
          },
        });
        return committed.completion;
      },
    };
    const transport = createResolvedExactProviderTransportV5R6({
      clock: transportClock(at),
      credentialReader: async () => ({
        apiKey: SECRET_SENTINEL,
        subjectIdentity: fixture.subjectIdentity,
        openAIProjectId: fixture.subjectIdentity,
      }),
      fetchImplementation: async () => new Response(JSON.stringify(openAIResponseEnvelopeV5R4(
        responsePayload(dispatchAudit.role))), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": `r7-reference-${actionIndex}` },
      }),
    });
    const run = await runGuardedProviderAttemptV5R6({
      ...stateInput,
      requestArtifact,
      itemLeaf,
      ledger,
      rawResponseStore,
      transport,
      dispatchAuditStore: { append: async (value) => ({ contentHash: value.selfHash }) },
      attemptReceiptStore: { append: async (value) => ({ contentHash: value.selfHash }) },
      failureClock: transportClock(at),
    });
    assert.equal(run.status, "SUCCEEDED", run.errors.join("; "));
    assert.ok(attemptCommitIntent && rawResponseArtifact && rawResponseBindingReceipt
      && authoritativeRoleOutput);
    const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
      activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
      authorizationHash: fixture.authorization.selfHash,
      authenticatedRouteEvidenceHash: fixture.authenticatedRouteEvidence.selfHash,
      requestArtifact,
      dispatchAudit,
      reservation: run.reservation,
      dispatchPermit: run.permit,
      compatibilityDispatchPermit: run.compatibilityPermit,
      rawResponseArtifact,
      rawResponseBindingReceipt,
      providerEventReceipt: run.providerEventReceipt,
      roleOutput: authoritativeRoleOutput,
      preparedCompletion: run.completion,
      rawAndBindingDurable: true,
      projectResidency: fixture.authorization.projectResidency,
      dataRegion: fixture.authorization.dataRegion,
      credentialReadCount: run.credentialReadCount,
      preparedAt: attemptCommitIntent.preparedAt,
      intent: attemptCommitIntent,
      committedCompletion: run.completion,
    });
    await atomicWriteProtectedJsonV5R4({
      trustedRoot,
      relativePath: path.join("resolved-attempts", `${resolvedAttemptReceipt.selfHash}.json`),
      value: resolvedAttemptReceipt,
    });
    requestArtifacts.push(requestArtifact);
    dispatchAudits.push(dispatchAudit);
    dispatchPermits.push(run.permit);
    compatibilityDispatchPermits.push(run.compatibilityPermit);
    rawResponseArtifacts.push(rawResponseArtifact);
    rawResponseBindingReceipts.push(rawResponseBindingReceipt);
    attemptCommitIntents.push(attemptCommitIntent);
    resolvedAttemptReceipts.push(resolvedAttemptReceipt);
  }
  const verified = await atomicLedger.verify();
  assert.deepEqual(verified.errors, []);
  assert.equal(verified.entries.length, actionCount * 2);
  const attemptGraphContext = {
    ...fixture,
    activeRegistration: fixture.activeRegistration,
    authorization: fixture.authorization,
    authenticatedRouteEvidence: fixture.authenticatedRouteEvidence,
    registration: fixture.registration,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaves: fixture.itemLeaves,
    ledgerEntries: verified.entries,
    requestArtifacts,
    dispatchAudits,
    dispatchPermits,
    compatibilityDispatchPermits,
    rawResponseArtifacts,
    rawResponseBindingReceipts,
    attemptCommitIntents,
    resolvedAttemptReceipts,
    derivedAt: "2026-08-26T11:10:00.000Z",
  };
  const graph = reconstructAttemptGraphV5R7(attemptGraphContext);
  return { protectedRoot, fixture, attemptGraphContext, graph };
}

test("R7 partial reference attempts reconstruct one internally complete raw lineage graph", async () => {
  const context = await buildCompleteRawReferenceFixture(4);
  try {
    assert.equal(context.graph.receipt.graphStatus, "COMPLETE_VALID",
      context.graph.receipt.lineageErrors.join("; "));
    assert.equal(context.graph.receipt.successfulAttemptCount, 4);
    assert.equal(context.graph.receipt.roleAttemptEvidenceReceipts.length, 4);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 reference labels are sealed only after all 240 retained raw responses independently reparse", async () => {
  const context = await buildCompleteRawReferenceFixture();
  try {
    assert.equal(context.graph.receipt.graphStatus, "COMPLETE_VALID",
      context.graph.receipt.lineageErrors.join("; "));
    assert.equal(context.graph.receipt.successfulAttemptCount, 240);
    assert.equal(context.graph.receipt.rawReparseFailureCount, 0);
    assert.deepEqual(validateAttemptGraphReconstructionReceiptV5R7({
      ...context.attemptGraphContext,
      attemptGraphReceipt: context.graph.receipt,
    }), []);
    const input = {
      activeRegistration: context.fixture.activeRegistration,
      freshReview: context.fixture.freshReview,
      authorization: context.fixture.authorization,
      registration: context.fixture.registration,
      inventory: context.fixture.inventory,
      attemptGraphReceipt: context.graph.receipt,
      attemptGraphContext: context.attemptGraphContext,
      sealedAt: "2026-08-26T11:20:00.000Z",
    };
    const built = buildRawAuthoritativeMachineReferenceSealV5R7(input);
    assert.equal(built.seal.totalSuccessfulCallCount, 240);
    assert.equal(built.seal.unresolvedCount, 0);
    assert.deepEqual(validateRawAuthoritativeMachineReferenceSealV5R7({
      ...input,
      ...built,
    }), []);
    const validationReceipt = buildRawAuthoritativeReferenceValidationV5R7({
      ...input,
      ...built,
      validatedAt: "2026-08-26T11:21:00.000Z",
    });
    assert.deepEqual(validateRawAuthoritativeReferenceValidationV5R7({
      ...input,
      ...built,
      validationReceipt,
    }), []);

    const [first, ...rest] = context.attemptGraphContext.rawResponseArtifacts;
    const driftedContext = {
      ...context.attemptGraphContext,
      rawResponseArtifacts: [{ ...first, rawResponseBody: `${first.rawResponseBody} ` }, ...rest],
    };
    assert.ok(validateRawAuthoritativeMachineReferenceSealV5R7({
      ...input,
      attemptGraphContext: driftedContext,
      ...built,
    }).length > 0);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});
