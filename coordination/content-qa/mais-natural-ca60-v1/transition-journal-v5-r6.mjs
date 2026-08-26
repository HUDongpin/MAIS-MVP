import SUBRECEIPT_SCHEMA from "./schemas/CommandTransitionSubreceiptV1.schema.json" with { type: "json" };
import JOURNAL_SCHEMA from "./schemas/CommandTransitionJournalReceiptV1.schema.json" with { type: "json" };

import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function createCommandTransitionJournalV5R6({
  commandId,
  activeRunnerRegistrationHash,
  startedAt,
  persistSubreceipt = async () => undefined,
  persistFinalJournal = async () => undefined,
}) {
  requireCondition(/^[0-9a-f]{64}$/u.test(commandId ?? "")
    && /^[0-9a-f]{64}$/u.test(activeRunnerRegistrationHash ?? "") && iso(startedAt),
  "command transition journal identity or start time is invalid");
  return {
    commandId,
    activeRunnerRegistrationHash,
    startedAt,
    subreceipts: [],
    persistSubreceipt,
    persistFinalJournal,
  };
}

function buildSubreceipt(journal, stepName, transition, committedAt) {
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
    stepOrdinal: journal.subreceipts.length + 1,
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
  const receipt = sealV5R3Artifact({
    schemaVersion: "CommandTransitionJournalReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    commandId: journal.commandId,
    activeRunnerRegistrationHash: journal.activeRunnerRegistrationHash,
    status,
    committedTransitionCount: journal.subreceipts.length,
    committedSteps: journal.subreceipts.map(({ stepName }) => stepName),
    subreceiptHashes: journal.subreceipts.map(({ selfHash }) => selfHash),
    subreceipts: journal.subreceipts.map((receipt) => structuredClone(receipt)),
    lastDurableWorkflowIndexHash: journal.subreceipts.at(-1)?.nextWorkflowIndexHash ?? null,
    errorClass,
    startedAt: journal.startedAt,
    finishedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, JOURNAL_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export async function runJournaledTransitionSequenceV5R6({ journal, steps, finishedAt }) {
  requireCondition(Array.isArray(steps) && steps.length > 0 && iso(finishedAt)
    && Date.parse(finishedAt) >= Date.parse(journal?.startedAt ?? ""),
  "journaled transition sequence is invalid");
  try {
    for (const step of steps) {
      requireCondition(typeof step?.name === "string" && typeof step?.run === "function",
        "journaled transition step is invalid");
      const transition = await step.run();
      const subreceipt = buildSubreceipt(journal, step.name, transition, finishedAt);
      await journal.persistSubreceipt(subreceipt);
      journal.subreceipts.push(subreceipt);
    }
    const final = buildFinal(journal, "COMPLETED", null, finishedAt);
    await journal.persistFinalJournal(final);
    return Object.freeze({ ok: true, journal: final, error: null });
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : "UNKNOWN_ERROR";
    const status = journal.subreceipts.length > 0 ? "FAILED_AFTER_DURABLE_TRANSITION" : "FAILED_BEFORE_DURABLE_TRANSITION";
    const final = buildFinal(journal, status, errorClass, finishedAt);
    await journal.persistFinalJournal(final);
    return Object.freeze({ ok: false, journal: final,
      error: error instanceof Error ? error.message : String(error) });
  }
}

export const TRANSITION_JOURNAL_V5_R6_CONSTANTS = Object.freeze({
  everyDurableSubtransitionHasOwnReceipt: true,
  failureReturnsAllCommittedTransitions: true,
});
