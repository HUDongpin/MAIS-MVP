import INTENT_SCHEMA from "./schemas/CommandTransitionIntentReceiptV1.schema.json" with { type: "json" };
import JOURNAL_SCHEMA from "./schemas/CommandTransitionJournalReceiptV2.schema.json" with { type: "json" };
import SUBRECEIPT_SCHEMA from "./schemas/CommandTransitionSubreceiptV1.schema.json" with { type: "json" };

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function intent(journal, fields) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "CommandTransitionIntentReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    commandId: journal.commandId,
    activeRunnerRegistrationHash: journal.activeRunnerRegistrationHash,
    intentOrdinal: journal.intents.length + 1,
    intentKind: fields.intentKind,
    stepName: fields.stepName,
    attemptId: fields.attemptId ?? null,
    providerActivityPossible: fields.providerActivityPossible === true,
    naturalQuestionEgressPossible: fields.naturalQuestionEgressPossible === true,
    priorWorkflowIndexHash: fields.priorWorkflowIndexHash ?? null,
    preparedAt: fields.preparedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, INTENT_SCHEMA, receipt.schemaVersion);
  return receipt;
}

function committedSubreceipt(journal, stepName, transition, committedAt) {
  requireCondition(transition?.transitionReceipt?.priorWorkflowIndexHash
    && transition?.transitionReceipt?.selfHash && transition?.nextIndex?.selfHash
    && Array.isArray(transition.persistedArtifacts) && transition.persistedArtifacts.length > 0,
  `${stepName} transition lacks durable workflow custody fields`);
  const derivedArtifactHashes = transition.persistedArtifacts.map((artifact) =>
    artifact.semanticSelfHash ?? artifact.contentHash).filter(Boolean);
  requireCondition(derivedArtifactHashes.length === transition.persistedArtifacts.length,
    `${stepName} transition contains an unbound derived artifact`);
  const receipt = sealV5R3Artifact({
    schemaVersion: "CommandTransitionSubreceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    commandId: journal.commandId,
    activeRunnerRegistrationHash: journal.activeRunnerRegistrationHash,
    stepOrdinal: journal.observedTransitions.length + 1,
    stepName,
    priorWorkflowIndexHash: transition.transitionReceipt.priorWorkflowIndexHash,
    nextWorkflowIndexHash: transition.nextIndex.selfHash,
    workflowTransitionReceiptHash: transition.transitionReceipt.selfHash,
    derivedArtifactHashes,
    committedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, SUBRECEIPT_SCHEMA, receipt.schemaVersion);
  return receipt;
}

function buildFinal(journal, status, errorClass, finishedAt) {
  const observed = journal.observedTransitions;
  const persisted = journal.persistedSubreceipts;
  const activityPossible = journal.providerDispatchIntents > 0
    && (journal.providerEventCount === null || journal.httpRequestCount === null
      || journal.credentialReadCount === null || journal.naturalQuestionEgressCount === null);
  const activityAccountingStatus = activityPossible
    ? "UNKNOWN_FAIL_CLOSED"
    : journal.providerDispatchIntents > journal.providerEventCount
      ? "LOWER_BOUND_PROVIDER_ACTIVITY_POSSIBLE" : "EXACT";
  const effectiveStatus = activityPossible ? "PROVIDER_ACTIVITY_POSSIBLE_ACCOUNTING_INCOMPLETE" : status;
  const receipt = sealV5R3Artifact({
    schemaVersion: "CommandTransitionJournalReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    commandId: journal.commandId,
    activeRunnerRegistrationHash: journal.activeRunnerRegistrationHash,
    status: effectiveStatus,
    preparedIntentCount: journal.intents.length,
    preparedIntentHashes: journal.intents.map(({ selfHash }) => selfHash),
    observedDurableTransitionCount: observed.length,
    observedDurableSteps: observed.map(({ stepName }) => stepName),
    observedDurableTransitionHashes: observed.map(({ selfHash }) => selfHash),
    persistedSubreceiptCount: persisted.length,
    persistedSubreceiptHashes: persisted.map(({ selfHash }) => selfHash),
    lastObservedDurableWorkflowIndexHash: observed.at(-1)?.nextWorkflowIndexHash ?? null,
    providerDispatchIntentCount: journal.providerDispatchIntents,
    providerEventCountLowerBound: journal.providerEventCount ?? 0,
    httpRequestCountLowerBound: journal.httpRequestCount ?? 0,
    credentialReadCountLowerBound: journal.credentialReadCount ?? 0,
    naturalQuestionEgressCountLowerBound: journal.naturalQuestionEgressCount ?? 0,
    activityAccountingStatus,
    errorClass,
    startedAt: journal.startedAt,
    finishedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, JOURNAL_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function createCommandTransitionJournalV5R7({
  commandId,
  activeRunnerRegistrationHash,
  startedAt,
  persistIntent,
  persistSubreceipt,
  persistFinalJournal,
}) {
  requireCondition(/^[0-9a-f]{64}$/u.test(commandId ?? "")
    && /^[0-9a-f]{64}$/u.test(activeRunnerRegistrationHash ?? "") && iso(startedAt)
    && typeof persistIntent === "function" && typeof persistSubreceipt === "function"
    && typeof persistFinalJournal === "function",
  "R7 journal requires exact identity, chronology, and durable persistence functions");
  return {
    commandId,
    activeRunnerRegistrationHash,
    startedAt,
    intents: [],
    observedTransitions: [],
    persistedSubreceipts: [],
    providerDispatchIntents: 0,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    persistIntent,
    persistSubreceipt,
    persistFinalJournal,
  };
}

export async function prepareProviderDispatchIntentV5R7(journal, {
  attemptId,
  stepName,
  priorWorkflowIndexHash,
  naturalQuestionEgressPossible,
  preparedAt,
}) {
  requireCondition(typeof attemptId === "string" && attemptId.length > 0 && iso(preparedAt),
    "provider dispatch intent identity or chronology is invalid");
  const receipt = intent(journal, { intentKind: "PROVIDER_DISPATCH", stepName, attemptId,
    providerActivityPossible: true, naturalQuestionEgressPossible, priorWorkflowIndexHash, preparedAt });
  await journal.persistIntent(receipt);
  journal.intents.push(receipt);
  journal.providerDispatchIntents += 1;
  journal.providerEventCount = null;
  journal.httpRequestCount = null;
  journal.credentialReadCount = null;
  journal.naturalQuestionEgressCount = null;
  return receipt;
}

export function recordObservedProviderActivityV5R7(journal, activity) {
  for (const field of ["providerEventCount", "httpRequestCount", "credentialReadCount", "naturalQuestionEgressCount"]) {
    requireCondition(Number.isSafeInteger(activity?.[field]) && activity[field] >= 0,
      `observed ${field} is invalid`);
    journal[field] = activity[field];
  }
}

export async function runJournaledTransitionSequenceV5R7({ journal, steps, finishedAt }) {
  requireCondition(Array.isArray(steps) && steps.length > 0 && iso(finishedAt)
    && Date.parse(finishedAt) >= Date.parse(journal?.startedAt ?? ""),
  "R7 journaled transition sequence is invalid");
  try {
    for (const step of steps) {
      requireCondition(typeof step?.name === "string" && typeof step?.run === "function",
        "R7 journaled transition step is invalid");
      const priorWorkflowIndexHash = typeof step.priorWorkflowIndexHash === "function"
        ? step.priorWorkflowIndexHash() : step.priorWorkflowIndexHash ?? null;
      const prepared = intent(journal, { intentKind: "WORKFLOW_TRANSITION", stepName: step.name,
        priorWorkflowIndexHash, providerActivityPossible: false,
        naturalQuestionEgressPossible: false, preparedAt: step.preparedAt ?? journal.startedAt });
      await journal.persistIntent(prepared);
      journal.intents.push(prepared);
      const transition = await step.run();
      const subreceipt = committedSubreceipt(journal, step.name, transition, finishedAt);
      // Record the observed durable transition before attempting to persist its
      // sidecar receipt. A sidecar failure may not erase already committed state.
      journal.observedTransitions.push(subreceipt);
      await journal.persistSubreceipt(subreceipt);
      journal.persistedSubreceipts.push(subreceipt);
    }
    const final = buildFinal(journal, "COMPLETED", null, finishedAt);
    await journal.persistFinalJournal(final);
    return Object.freeze({ ok: true, journal: final, error: null });
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : "UNKNOWN_ERROR";
    const observed = journal.observedTransitions.length;
    const persisted = journal.persistedSubreceipts.length;
    const status = observed === 0 ? "FAILED_BEFORE_DURABLE_TRANSITION"
      : persisted < observed ? "FAILED_AFTER_DURABLE_TRANSITION_PERSISTENCE_UNCERTAIN"
        : "FAILED_AFTER_DURABLE_TRANSITION";
    const final = buildFinal(journal, status, errorClass, finishedAt);
    try { await journal.persistFinalJournal(final); } catch {
      // The returned receipt remains fail-closed machine-readable evidence; its
      // persistence failure is visible to the caller and must block execution.
    }
    return Object.freeze({ ok: false, journal: final,
      error: error instanceof Error ? error.message : String(error) });
  }
}

export function validateCommandTransitionJournalV5R7(receipt) {
  return validateClosedSelfHashedAgainstV5R5(receipt, JOURNAL_SCHEMA);
}

export const TRANSITION_JOURNAL_V5_R7_CONSTANTS = Object.freeze({
  writeAheadIntentRequired: true,
  durableTransitionObservedBeforeSidecarPersistence: true,
  unknownProviderActivityNeverReportedAsExactZero: true,
});
