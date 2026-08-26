import assert from "node:assert/strict";
import test from "node:test";

import { sha256V5R3 } from "./execution-integrity-v5-r3.mjs";
import {
  createCommandTransitionJournalV5R7,
  prepareProviderDispatchIntentV5R7,
  recordObservedProviderActivityV5R7,
  runJournaledTransitionSequenceV5R7,
  validateCommandTransitionJournalV5R7,
} from "./transition-journal-v5-r7.mjs";

const H = (value) => sha256V5R3(String(value));

function journal(overrides = {}) {
  return createCommandTransitionJournalV5R7({
    commandId: H("command"),
    activeRunnerRegistrationHash: H("registration"),
    startedAt: "2026-08-26T11:00:00.000Z",
    persistIntent: async () => undefined,
    persistSubreceipt: async () => undefined,
    persistFinalJournal: async () => undefined,
    ...overrides,
  });
}

function durableTransition() {
  return {
    nextIndex: { selfHash: H("next-index") },
    transitionReceipt: { priorWorkflowIndexHash: H("prior-index"), selfHash: H("transition") },
    persistedArtifacts: [{ semanticSelfHash: H("artifact") }],
  };
}

test("R7 retains an observed durable transition when sidecar persistence fails", async () => {
  let durableRuns = 0;
  const result = await runJournaledTransitionSequenceV5R7({
    journal: journal({ persistSubreceipt: async () => { throw new Error("sidecar unavailable"); } }),
    steps: [{ name: "DURABLE_TRANSITION", async run() { durableRuns += 1; return durableTransition(); } }],
    finishedAt: "2026-08-26T11:01:00.000Z",
  });

  assert.equal(durableRuns, 1);
  assert.equal(result.ok, false);
  assert.equal(result.journal.status, "FAILED_AFTER_DURABLE_TRANSITION_PERSISTENCE_UNCERTAIN");
  assert.equal(result.journal.observedDurableTransitionCount, 1);
  assert.equal(result.journal.persistedSubreceiptCount, 0);
  assert.equal(result.journal.lastObservedDurableWorkflowIndexHash, H("next-index"));
  assert.deepEqual(validateCommandTransitionJournalV5R7(result.journal), []);
});

test("R7 provider intent makes unknown post-dispatch activity fail closed instead of false zero", async () => {
  const instance = journal();
  await prepareProviderDispatchIntentV5R7(instance, {
    attemptId: "V5R7:fixture:1",
    stepName: "PROVIDER_DISPATCH",
    priorWorkflowIndexHash: H("prior-index"),
    naturalQuestionEgressPossible: true,
    preparedAt: "2026-08-26T11:00:01.000Z",
  });
  const result = await runJournaledTransitionSequenceV5R7({
    journal: instance,
    steps: [{ name: "POST_PROVIDER_PERSIST", async run() { throw new Error("post-provider failure"); } }],
    finishedAt: "2026-08-26T11:01:00.000Z",
  });

  assert.equal(result.journal.status, "PROVIDER_ACTIVITY_POSSIBLE_ACCOUNTING_INCOMPLETE");
  assert.equal(result.journal.activityAccountingStatus, "UNKNOWN_FAIL_CLOSED");
  assert.equal(result.journal.providerDispatchIntentCount, 1);
  assert.equal(result.journal.providerEventCountLowerBound, 0);
});

test("R7 records exact observed activity after a prepared provider dispatch", async () => {
  const instance = journal();
  await prepareProviderDispatchIntentV5R7(instance, {
    attemptId: "V5R7:fixture:1",
    stepName: "PROVIDER_DISPATCH",
    priorWorkflowIndexHash: H("prior-index"),
    naturalQuestionEgressPossible: true,
    preparedAt: "2026-08-26T11:00:01.000Z",
  });
  recordObservedProviderActivityV5R7(instance, {
    providerEventCount: 1,
    httpRequestCount: 1,
    credentialReadCount: 1,
    naturalQuestionEgressCount: 1,
  });
  const result = await runJournaledTransitionSequenceV5R7({
    journal: instance,
    steps: [{ name: "PERSIST_PROVIDER_RESULT", async run() { return durableTransition(); } }],
    finishedAt: "2026-08-26T11:01:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.journal.activityAccountingStatus, "EXACT");
  assert.equal(result.journal.providerEventCountLowerBound, 1);
  assert.equal(result.journal.observedDurableTransitionCount, 1);
});
