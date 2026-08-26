import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildDeepSeekC0ExecutionSetV5R5,
  validateDeepSeekC0ExecutionSetV5R5,
} from "./c0-trigger-v5-r5.mjs";
import {
  runCliV5R10,
} from "./runner-v5-r10-cli.mjs";
import {
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";
import {
  buildFrozenStatisticalBundleV5R10,
  verifyFrozenStatisticalBundleV5R10,
} from "./statistical-kernel-v5-r10.mjs";

const H = (value) => sha256V5R3(`r9-public-cli-offline-fixture:${value}`);
const CONTEXT_PATH = "/protected/offline-fixture/workflow-index.json";
const REGISTERED_AT = "2026-08-27T00:00:00.000Z";
const SCORED_AT = "2026-08-27T01:00:00.000Z";

function noTriggerPredicateInput(item) {
  const itemScopeTags = ["REGION:CALIFORNIA", "PROFILE:US_CA_MATH", "GRADE:6",
    "TOPIC:NUMBER", "RESPONSE:multiple-choice", "DIFFICULTY:Medium"];
  const bPrimeCritique = {
    schemaVersion: "BPrimeCritiqueEvidenceV1",
    itemHash: item.itemHash,
    requiredRevisionCodes: [],
    validityStatus: "VALID",
  };
  bPrimeCritique.artifactHash = calculateArtifactHash(bPrimeCritique, "artifactHash");
  const bPrimeRevision = {
    schemaVersion: "BPrimeRevisionEvidenceV1",
    itemHash: item.itemHash,
    resolvedCritiqueCodes: [],
    finalFindingKeys: [],
    validityStatus: "VALID",
  };
  bPrimeRevision.artifactHash = calculateArtifactHash(bPrimeRevision, "artifactHash");
  return Object.freeze({
    localDeterministicEvidence: {
      schemaVersion: "C0LocalDeterministicEvidenceV1",
      algorithmSetHash: H("local-c0-algorithm"),
      itemHash: item.itemHash,
      mathAnswerKey: { screenComplete: true, issueCodes: [] },
      rightsProvenanceReconstruction: {
        screenComplete: true,
        disposition: "CLEARED_FOR_AUTHORIZED_EGRESS",
        issueCodes: [],
      },
      learnerFit: {
        screenComplete: true,
        checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"],
        issueCodes: [],
      },
      answerCriticalEvidence: {
        screenComplete: true,
        requiredAssetTypes: [],
        verifiedAssetTypes: [],
        issueCodes: [],
      },
      validation: {
        schemaValid: true,
        roleSequenceValid: true,
        taxonomyCodesValid: true,
        errorCodes: [],
      },
      deterministicFindingKeys: [],
    },
    bPrimeCritique,
    bPrimeRevision,
    validatedScope: {
      schemaVersion: "C0ValidatedScopeV1",
      itemHash: item.itemHash,
      itemScopeTags,
      allowedScopeTags: [...itemScopeTags],
      metadataEvidenceComplete: true,
      declaredDistribution: "IN_SCOPE",
    },
  });
}

function fixture() {
  const activeRegistration = sealV5R3Artifact({
    schemaVersion: "OfflinePublicCliFixtureRegistrationV1",
    registeredAt: REGISTERED_AT,
    sampleManifestHash: H("sample-manifest"),
    routeAuthenticityState: "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
  });
  const inventory = sealV5R3Artifact({
    schemaVersion: "OfflinePublicCliFixtureInventoryV1",
    items: Array.from({ length: 60 }, (_, index) => ({
      manifestOrdinal: index + 1,
      itemHash: H(`item:${index}`),
      itemIdPseudonym: `offline-ca60-${String(index + 1).padStart(2, "0")}`,
      clusterId: `offline-cluster-${index + 1}`,
      registeredRandomAudit: index < 12,
    })),
  });
  const executionRegistration = sealV5R3Artifact({
    schemaVersion: "OfflinePublicCliFixtureExecutionRegistrationV1",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    registeredAt: "2026-08-27T00:30:00.000Z",
  });
  const predicateInputsByItem = new Map(inventory.items.map((item) =>
    [item.itemHash, noTriggerPredicateInput(item)]));
  const c0ExecutionSet = buildDeepSeekC0ExecutionSetV5R5({
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    inventory,
    predicateInputsByItem,
  });
  assert.deepEqual(validateDeepSeekC0ExecutionSetV5R5({
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    inventory,
    predicateInputsByItem,
    c0ExecutionSet,
  }), []);
  assert.equal(c0ExecutionSet.selectedItemCount, 12);
  assert.equal(c0ExecutionSet.expectedSuccessfulCallCount, 180);

  const roots = {
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    sampleManifestHash: activeRegistration.sampleManifestHash,
    referenceSealHash: H("reference-seal"),
    executionRegistrationHash: executionRegistration.selfHash,
    deepSeekAuthorizationHash: H("deepseek-authorization"),
    c0ExecutionSetHash: c0ExecutionSet.selfHash,
  };
  const itemResults = inventory.items.map((item) => sealV5R3Artifact({
    schemaVersion: "ItemEvaluationResultV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: roots.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: roots.sampleExecutionInventoryHash,
    referenceSealHash: roots.referenceSealHash,
    executionRegistrationHash: roots.executionRegistrationHash,
    deepSeekAuthorizationHash: roots.deepSeekAuthorizationHash,
    c0ExecutionSetHash: roots.c0ExecutionSetHash,
    manifestOrdinal: item.manifestOrdinal,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    executionDisposition: "COMPLETE",
    machineDisposition: "RESOLVED",
    machineNonresolvedReasonCodes: [],
    referenceDisposition: "RESOLVED_NEGATIVE",
    machineSurfaceFinding: false,
    referenceFindings: [],
    machineFindings: [],
    finalReferenceLabelHash: H(`reference-label:${item.manifestOrdinal}`),
    requiredRoleOrder: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION",
      ...(item.registeredRandomAudit ? ["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2",
        "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"] : [])],
    successfulRoleOutputHashes: Array.from({ length: item.registeredRandomAudit ? 7 : 2 },
      (_, index) => H(`role-output:${item.manifestOrdinal}:${index}`)),
    attemptReceiptHashes: Array.from({ length: item.registeredRandomAudit ? 7 : 2 },
      (_, index) => H(`attempt:${item.manifestOrdinal}:${index}`)),
    completedItemMarkerHash: H(`completed-marker:${item.manifestOrdinal}`),
  }));
  const statisticalInput = {
    ...roots,
    itemResults,
    thresholdsFrozenAt: "2026-08-25T00:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-27T00:10:00.000Z",
    firstEvaluationAttemptAt: "2026-08-27T00:40:00.000Z",
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
    scoredAt: SCORED_AT,
  };
  return { activeRegistration, inventory, executionRegistration, c0ExecutionSet,
    statisticalInput };
}

function createOfflinePublicCliHarness() {
  const data = fixture();
  const state = {
    adopted: false,
    routeProviders: new Set(),
    authorizedProviders: new Set(),
    referenceSuccessfulCalls: 0,
    referenceSealed: false,
    deepSeekRegistrationFrozen: false,
    deepSeekSuccessfulCalls: 0,
    normalC0Frozen: false,
    scoreBundle: null,
    independentlyRecomputed: false,
  };
  const context = {
    activeRegistration: data.activeRegistration,
    routeAuthenticityState: data.activeRegistration.routeAuthenticityState,
  };
  const ok = (status, extra = {}) => ({ ok: true, status,
    providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, referenceLabelCount: 0,
    naturalQuestionResultCount: 0, activityAccountingStatus: "EXACT", ...extra });
  const blocked = (status) => ({ ...ok(status), ok: false });
  return {
    state,
    data,
    deps: {
      loadWorkflowContext: async (contextPath) => {
        assert.equal(contextPath, CONTEXT_PATH);
        return context;
      },
      adoptR9WorkflowIndex: async () => {
        state.adopted = true;
        return ok("OFFLINE_FIXTURE_R9_INDEX_ADOPTED");
      },
      verifyFrozenUpstream: async () => state.adopted
        ? ok("OFFLINE_FIXTURE_FROZEN_UPSTREAM_VERIFIED")
        : blocked("OFFLINE_FIXTURE_R9_INDEX_NOT_ADOPTED"),
      dryRun: async () => state.adopted
        ? ok("OFFLINE_FIXTURE_DRY_RUN_COMPLETE") : blocked("OFFLINE_FIXTURE_NOT_READY"),
      registerTrustedRouteEvidence: async (_context, provider) => {
        state.routeProviders.add(provider);
        return ok("OFFLINE_FIXTURE_ROUTE_EVIDENCE_REGISTERED");
      },
      authorizeCheck: async (_context, provider) => {
        if (!state.routeProviders.has(provider)) return blocked("OFFLINE_FIXTURE_ROUTE_ABSENT");
        state.authorizedProviders.add(provider);
        return ok("OFFLINE_FIXTURE_AUTHORIZATION_CONTRACT_VERIFIED");
      },
      executeOpenAIResumeStep: async () => {
        if (!state.authorizedProviders.has("OPENAI_DIRECT") || state.referenceSuccessfulCalls >= 240) {
          return blocked("OFFLINE_FIXTURE_REFERENCE_STEP_BLOCKED");
        }
        state.referenceSuccessfulCalls += 1;
        return ok("OFFLINE_FIXTURE_REFERENCE_ROLE_COMPLETED");
      },
      rejectLegacyQwenCommand: async () => blocked("LEGACY_QWEN_COMMAND_REJECTED_ZERO_HTTP"),
      sealReferenceLabels: async () => {
        if (state.referenceSuccessfulCalls !== 240) return blocked("OFFLINE_FIXTURE_REFERENCE_INCOMPLETE");
        state.referenceSealed = true;
        return ok("OFFLINE_FIXTURE_MACHINE_REFERENCE_LABELS_FROZEN", { referenceLabelCount: 60 });
      },
      freezeDeepSeekExecutionRegistration: async () => {
        if (!state.referenceSealed || !state.authorizedProviders.has("DEEPSEEK_DIRECT")) {
          return blocked("OFFLINE_FIXTURE_DEEPSEEK_FREEZE_BLOCKED");
        }
        state.deepSeekRegistrationFrozen = true;
        return ok("OFFLINE_FIXTURE_DEEPSEEK_REGISTRATION_FROZEN");
      },
      executeDeepSeekCanaryStep: async () => {
        if (!state.deepSeekRegistrationFrozen || state.deepSeekSuccessfulCalls >= 7) {
          return blocked("OFFLINE_FIXTURE_CANARY_STEP_BLOCKED");
        }
        state.deepSeekSuccessfulCalls += 1;
        return ok("OFFLINE_FIXTURE_CANARY_ROLE_COMPLETED");
      },
      executeDeepSeekResumeStep: async () => {
        if (state.deepSeekSuccessfulCalls < 7
          || state.deepSeekSuccessfulCalls >= data.c0ExecutionSet.expectedSuccessfulCallCount) {
          return blocked("OFFLINE_FIXTURE_DEEPSEEK_RESUME_BLOCKED");
        }
        state.deepSeekSuccessfulCalls += 1;
        if (state.deepSeekSuccessfulCalls >= 120) state.normalC0Frozen = true;
        return ok("OFFLINE_FIXTURE_DEEPSEEK_ROLE_COMPLETED");
      },
      score: async () => {
        if (!state.normalC0Frozen
          || state.deepSeekSuccessfulCalls !== data.c0ExecutionSet.expectedSuccessfulCallCount) {
          return blocked("OFFLINE_FIXTURE_COMPLETE_SCORE_BLOCKED");
        }
        state.scoreBundle = buildFrozenStatisticalBundleV5R10(data.statisticalInput);
        return ok(state.scoreBundle.finalReceipt.overallDecision, {
          naturalQuestionResultCount: state.scoreBundle.observedLedger.accounting.completeReceiptItemCount,
        });
      },
      verify: async () => {
        if (!state.scoreBundle) return blocked("OFFLINE_FIXTURE_SCORE_ABSENT");
        const rebuilt = buildFrozenStatisticalBundleV5R10(data.statisticalInput);
        const errors = verifyFrozenStatisticalBundleV5R10(data.statisticalInput, state.scoreBundle);
        if (errors.length > 0
          || canonicalJsonV5R3(rebuilt.finalReceipt) !== canonicalJsonV5R3(state.scoreBundle.finalReceipt)) {
          return blocked("OFFLINE_FIXTURE_INDEPENDENT_RECOMPUTATION_FAILED");
        }
        state.independentlyRecomputed = true;
        return ok("OFFLINE_FIXTURE_COMPLETE_SCORE_RECOMPUTED", { naturalQuestionResultCount: 60 });
      },
      exportAggregateReport: async () => state.independentlyRecomputed
        ? ok("OFFLINE_FIXTURE_AGGREGATE_REPORT_EXPORTED_CLAIM_CEILING_ENFORCED",
          { naturalQuestionResultCount: 60 })
        : blocked("OFFLINE_FIXTURE_AGGREGATE_EXPORT_BLOCKED"),
      auditAttemptCustody: async () => ok("OFFLINE_FIXTURE_ATTEMPT_CUSTODY_RECONCILED"),
    },
  };
}

async function command(harness, argv) {
  const result = await runCliV5R10([...argv.slice(0, 1), "--context", CONTEXT_PATH, ...argv.slice(1)],
    harness.deps);
  assert.equal(result.exitCode, 0, `${argv.join(" ")}: ${result.receipt.status}`);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R10(result.receipt,
    "NaturalCaRunnerCommandReceiptV9"), []);
  assert.equal(result.receipt.providerEventCount, 0);
  assert.equal(result.receipt.httpRequestCount, 0);
  assert.equal(result.receipt.credentialReadCount, 0);
  assert.equal(result.receipt.naturalQuestionEgressCount, 0);
  return result;
}

test("R10 public CLI completes the entire offline fixture workflow through normal C0 and complete scoring", async () => {
  const harness = createOfflinePublicCliHarness();
  await command(harness, ["register"]);
  await command(harness, ["freeze-frame"]);
  await command(harness, ["audit-clusters"]);
  await command(harness, ["freeze-sample"]);
  await command(harness, ["dry-run"]);
  await command(harness, ["register-route-evidence", "--provider", "openai"]);
  await command(harness, ["authorize-check", "--provider", "openai"]);
  for (let index = 0; index < 240; index += 1) {
    await command(harness, ["label-reference", "--resume"]);
  }
  await command(harness, ["seal-reference-labels"]);
  await command(harness, ["register-route-evidence", "--provider", "deepseek"]);
  await command(harness, ["authorize-check", "--provider", "deepseek"]);
  await command(harness, ["freeze-deepseek-registration"]);
  for (let index = 0; index < 7; index += 1) {
    await command(harness, ["execute-deepseek", "--canary", "1"]);
  }
  while (harness.state.deepSeekSuccessfulCalls
    < harness.data.c0ExecutionSet.expectedSuccessfulCallCount) {
    await command(harness, ["execute-deepseek", "--resume"]);
  }
  const scored = await command(harness, ["score"]);
  await command(harness, ["verify"]);
  await command(harness, ["export-aggregate-report"]);

  assert.equal(harness.state.referenceSuccessfulCalls, 240);
  assert.equal(harness.state.deepSeekSuccessfulCalls, 180);
  assert.equal(harness.state.normalC0Frozen, true);
  assert.equal(harness.data.c0ExecutionSet.selectionFormula,
    "UNION(MANDATORY_TRIGGER_SET,RANDOM_AUDIT_12_SET)");
  assert.equal(harness.data.c0ExecutionSet.selectedItemCount, 12);
  assert.equal(harness.state.scoreBundle.observedLedger.accounting.completeReceiptItemCount, 60);
  assert.equal(harness.state.scoreBundle.metricResults.length, 11);
  assert.equal(harness.state.scoreBundle.finalReceipt.analysisStatus,
    "COMPLETE_FROZEN_METRIC_ANALYSIS");
  assert.equal(harness.state.scoreBundle.finalReceipt.overallDecision,
    "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(scored.receipt.status, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(scored.receipt.passClaimAllowed, false);
  assert.equal(scored.receipt.limitedGeneralizationEvidenceAllowed, false);
  assert.equal(harness.state.independentlyRecomputed, true);
});
