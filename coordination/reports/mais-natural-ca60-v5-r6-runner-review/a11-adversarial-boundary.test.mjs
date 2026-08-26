import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sealV5R3Artifact,
} from "../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  validateProviderActivationV5R6,
} from "../../content-qa/mais-natural-ca60-v1/activation-guard-v5-r6.mjs";
import {
  buildStateBoundDispatchAuditV5R6,
} from "../../content-qa/mais-natural-ca60-v1/guarded-provider-attempt-v5-r6.mjs";
import {
  validateExternallyAttestedRouteEvidenceV5R6,
} from "../../content-qa/mais-natural-ca60-v1/route-evidence-custody-v5-r6.mjs";
import {
  runCliV5R6,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r6-cli.mjs";
import {
  H_V5_R6,
  buildResolvedActivationFixtureV5R6,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r6-test-fixtures.mjs";
import {
  validateAggregateScoreReceiptV5R6,
} from "../../content-qa/mais-natural-ca60-v1/scorer-v5-r6.mjs";
import {
  createCommandTransitionJournalV5R6,
  runJournaledTransitionSequenceV5R6,
} from "../../content-qa/mais-natural-ca60-v1/transition-journal-v5-r6.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = path.resolve(HERE, "../../content-qa/mais-natural-ca60-v1");
const AT = "2026-08-26T10:00:00.000Z";

function source(name) {
  return readFileSync(path.join(SOURCE_ROOT, name), "utf8");
}

function successfulBaseLedger(inventory) {
  const entries = [];
  for (const item of inventory.items.slice(1)) {
    for (const role of ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]) {
      const reservationHash = H_V5_R6(`reservation:${item.itemHash}:${role}`);
      entries.push({
        schemaVersion: "FixtureReservationV1",
        entryType: "DISPATCH_RESERVED",
        itemHash: item.itemHash,
        role,
        attemptId: `fixture:${item.itemHash}:${role}`,
        selfHash: reservationHash,
      });
      entries.push({
        schemaVersion: "FixtureCompletionV1",
        entryType: "DISPATCH_COMPLETED",
        reservationHash,
        attemptStatus: "SUCCEEDED",
        selfHash: H_V5_R6(`completion:${item.itemHash}:${role}`),
      });
    }
  }
  return entries;
}

test("R6 outer DeepSeek planner accepts caller-authored C0/gate state with no semantic self-hash", () => {
  const fixture = buildResolvedActivationFixtureV5R6("DEEPSEEK_DIRECT");
  const selected = fixture.inventory.items[1];
  const input = {
    ...fixture,
    mode: "DEEPSEEK_RESUME",
    at: AT,
    ledgerEntries: successfulBaseLedger(fixture.inventory),
    canaryGate: { state: "CANARY_INTEGRITY_CLEARED_NO_TUNING" },
    c0ExecutionSet: {
      selectedItemHashes: [selected.itemHash],
      decisions: [{ itemHash: selected.itemHash, selfHash: H_V5_R6("caller-authored-c0-decision") }],
    },
  };

  assert.deepEqual(validateProviderActivationV5R6(input), []);
  const audit = buildStateBoundDispatchAuditV5R6(input);
  assert.equal(audit.role, "C0_PRIME_ROLE_1");
  assert.equal(audit.itemHash, selected.itemHash);
  assert.equal(audit.executionRegistrationHash, fixture.executionRegistration.selfHash);
  assert.equal(audit.c0ExecutionSetHash, null);
  assert.equal(audit.canaryGateHash, null);
});

test("closed aggregate schema accepts a fabricated complete result without metric or integrity recomputation", () => {
  const fabricated = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV4",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: H_V5_R6("active-registration"),
    sampleExecutionInventoryHash: H_V5_R6("inventory"),
    c0ExecutionSetHash: H_V5_R6("c0-set"),
    executionIntegrityEvidenceHash: H_V5_R6("unrelated-integrity-hash"),
    executionIntegrityEvidence: { fabricated: true },
    analysisStatus: "COMPLETE_FROZEN_METRIC_ANALYSIS",
    observedItemResultCount: 60,
    observedItemResultSetHash: H_V5_R6("fabricated-results"),
    missingItemCount: 0,
    metricResults: { fabricated: true, sensitivity: 1, specificity: 1 },
    overallDecision: "INCONCLUSIVE_MACHINE_REFERENCE",
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    scoredAt: AT,
  });

  assert.deepEqual(validateAggregateScoreReceiptV5R6(fabricated), []);
});

test("route bundle validates when retained source bodies contain no evidence for the asserted claims", () => {
  const fixture = buildResolvedActivationFixtureV5R6("OPENAI_DIRECT");
  const receipt = fixture.authenticatedRouteEvidence;

  assert.equal(receipt.directBillingConfirmed, true);
  assert.equal(receipt.provenanceStatus, "EXTERNALLY_ATTESTED_AND_REPLAYABLE");
  assert.ok(receipt.rawSourceArtifacts.every(({ rawSourceBody }) => {
    const parsed = JSON.parse(rawSourceBody);
    return parsed.fixture === "offline non-secret"
      && parsed.directBillingConfirmed === undefined
      && parsed.subjectIdentityHash === undefined
      && parsed.inputUsdPerMillionTokens === undefined
      && parsed.outputUsdPerMillionTokens === undefined;
  }));
  assert.deepEqual(validateExternallyAttestedRouteEvidenceV5R6(receipt), []);
});

test("public register command verifies upstream state but has no fresh-review adoption transition", async () => {
  let verifyCalls = 0;
  let adoptCalls = 0;
  const context = { activeRegistration: { selfHash: H_V5_R6("active-registration") } };
  const result = await runCliV5R6(["register", "--context", "fixture.json"], {
    async loadWorkflowContext() { return context; },
    async verifyFrozenUpstream() {
      verifyCalls += 1;
      return { ok: true, status: "FROZEN_UPSTREAM_VERIFIED" };
    },
    async adoptFreshRunnerReview() {
      adoptCalls += 1;
      return { ok: true, status: "FRESH_REVIEW_ADOPTED" };
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(verifyCalls, 1);
  assert.equal(adoptCalls, 0);
  assert.equal(result.receipt.stateTransitionCommitted, false);
});

test("a subreceipt persistence failure erases an already durable workflow transition from the final journal", async () => {
  let durableWorkflowTransitions = 0;
  const journal = createCommandTransitionJournalV5R6({
    commandId: H_V5_R6("journal-command"),
    activeRunnerRegistrationHash: H_V5_R6("active-registration"),
    startedAt: "2026-08-26T09:59:00.000Z",
    async persistSubreceipt() { throw new Error("fixture subreceipt store unavailable"); },
    async persistFinalJournal() { return undefined; },
  });
  const result = await runJournaledTransitionSequenceV5R6({
    journal,
    steps: [{
      name: "DURABLE_WORKFLOW_TRANSITION",
      async run() {
        durableWorkflowTransitions += 1;
        return {
          nextIndex: { selfHash: H_V5_R6("durable-next-index") },
          transitionReceipt: {
            priorWorkflowIndexHash: H_V5_R6("prior-index"),
            selfHash: H_V5_R6("durable-transition"),
          },
          persistedArtifacts: [{ semanticSelfHash: H_V5_R6("durable-artifact") }],
        };
      },
    }],
    finishedAt: AT,
  });

  assert.equal(durableWorkflowTransitions, 1);
  assert.equal(result.ok, false);
  assert.equal(result.journal.status, "FAILED_BEFORE_DURABLE_TRANSITION");
  assert.equal(result.journal.committedTransitionCount, 0);
  assert.equal(result.journal.lastDurableWorkflowIndexHash, null);
});

test("activation accepts a minimal self-hashed cost declaration without a recomputable buffered preview", () => {
  const fixture = buildResolvedActivationFixtureV5R6("OPENAI_DIRECT");

  assert.equal(Object.hasOwn(fixture.costPreview, "worstCaseCostPreviewUsd"), false);
  assert.equal(Object.hasOwn(fixture.costPreview, "bufferMultiplier"), false);
  assert.equal(Object.hasOwn(fixture.costPreview, "priceEvidenceHash"), false);
  assert.deepEqual(validateProviderActivationV5R6(fixture), []);
});

test("CLI exception boundary can report false zero activity after an engine-side provider event", async () => {
  let simulatedProviderEvents = 0;
  const context = { activeRegistration: { selfHash: H_V5_R6("active-registration") } };
  const result = await runCliV5R6(["label-openai", "--context", "fixture.json", "--resume"], {
    async loadWorkflowContext() { return context; },
    async executeOpenAIResumeStep() {
      simulatedProviderEvents += 1;
      throw new Error("fixture post-provider persistence failure");
    },
  });

  assert.equal(simulatedProviderEvents, 1);
  assert.equal(result.exitCode, 3);
  assert.equal(result.receipt.status, "ENGINE_FAIL_CLOSED");
  assert.equal(result.receipt.providerCommandInvoked, false);
  assert.equal(result.receipt.providerEventCount, 0);
  assert.equal(result.receipt.httpRequestCount, 0);
  assert.equal(result.receipt.credentialReadCount, 0);
});

test("runtime has only terminal C0 and incomplete-score construction, so normal successful scoring is unreachable", () => {
  const runtime = source("runner-v5-r6-runtime.mjs");
  const scorer = source("scorer-v5-r6.mjs");

  assert.match(runtime, /buildTerminalC0ExecutionSetV5R6/);
  assert.match(runtime, /buildIncompleteExecutionScoreReceiptV5R6/);
  assert.doesNotMatch(runtime, /buildDeepSeekC0ExecutionSetV5R5|buildC0PredicateReceiptV5R5/);
  assert.doesNotMatch(scorer, /COMPLETE_FROZEN_METRIC_ANALYSIS/);
  assert.deepEqual([...scorer.matchAll(/export function\s+([A-Za-z0-9_]+)/gu)].map((match) => match[1]), [
    "deriveExecutionIntegrityEvidenceV5R6",
    "validateExecutionIntegrityEvidenceV5R6",
    "buildIncompleteExecutionScoreReceiptV5R6",
    "validateAggregateScoreReceiptV5R6",
  ]);
  assert.match(scorer, /metricResults:\s*null/u);
  assert.match(runtime, /terminalEvidenceCode\s*=\s*"ATTEMPT_CAP_EXHAUSTED"/u);
});

test("reference seal claims full raw reconstruction without accepting raw artifacts or binding receipts", () => {
  const freezeSource = source("reference-execution-freeze-v5-r6.mjs");

  assert.match(freezeSource, /FULL_RAW_LEDGER_RECONSTRUCTION_VALID_AND_BOUND_TO_R6/);
  assert.doesNotMatch(freezeSource, /rawResponseArtifacts|rawResponseBindingReceipts/);
  assert.doesNotMatch(freezeSource, /independentlyReparseRawResponseV5R6/);
});

test("runtime attempt projection hardcodes order validity and infers state binding from schema name", () => {
  const runtime = source("runner-v5-r6-runtime.mjs");

  assert.match(runtime, /stateBound:\s*audit\?\.schemaVersion\s*===\s*"StateBoundDispatchAuditReceiptV2"/u);
  assert.match(runtime, /canaryOrOrderViolation:\s*false/u);
});

test("ledger completion precedes append-only resolved-attempt receipt persistence", () => {
  const guarded = source("guarded-provider-attempt-v5-r6.mjs");
  const completeIndex = guarded.indexOf("const completion = await input.ledger.complete");
  const resolvedReceiptIndex = guarded.indexOf("const resolvedAttemptReceipt = sealV5R3Artifact");
  const attemptAppendIndex = guarded.indexOf("await input.attemptReceiptStore.append(resolvedAttemptReceipt)");

  assert.ok(completeIndex >= 0);
  assert.ok(resolvedReceiptIndex > completeIndex);
  assert.ok(attemptAppendIndex > resolvedReceiptIndex);
});
