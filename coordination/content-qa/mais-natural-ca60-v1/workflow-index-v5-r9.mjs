import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJsonV5R3,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  loadExactFreshRunnerReviewV5R9,
  loadExactTrackedRunnerRegistrationV5R9,
  validateExactRunnerRegistrationEvidenceV5R9,
} from "./execution-evidence-v5-r9.mjs";
import {
  buildWorkflowIndexSupersessionV5R6,
} from "./workflow-index-v5-r6.mjs";
import {
  loadProtectedWorkflowIndexV5R7,
} from "./workflow-index-v5-r7.mjs";
import {
  buildWorkflowCommandTransitionReceiptV5R5,
} from "./workflow-index-v5-r5.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  validateResumeCustodyV5R9,
} from "./attempt-recovery-v5-r9.mjs";
import {
  reloadAttemptCustodyStoreV5R9,
} from "./attempt-custody-store-v5-r9.mjs";
import {
  validateClosedSelfHashedArtifactV5R9,
} from "./schema-contract-v5-r9.mjs";

export const ACTIVE_REVIEW_KIND_V5_R9 = "FRESH_RUNNER_REVIEW_V5_R9";
export const ACTIVE_REGISTRATION_KIND_V5_R9 = "ACTIVE_RUNNER_REGISTRATION_V5_R9";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function providerPrefix(provider) {
  return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
}

export function executionLedgerRelativePathV5R9(provider, compatibilityAuthorizationHash) {
  requireCondition(["OPENAI_DIRECT", "DEEPSEEK_DIRECT"].includes(provider)
    && /^[0-9a-f]{64}$/u.test(compatibilityAuthorizationHash ?? ""),
  "R9 execution-ledger path requires an exact provider and compatibility authorization hash");
  return path.join("execution-ledgers-v5-r9", provider === "OPENAI_DIRECT"
    ? "openai-reference" : "deepseek-evaluation", compatibilityAuthorizationHash);
}

function valuesBySchema(artifacts, schemaVersion) {
  return [...artifacts.values()].filter((value) => value?.schemaVersion === schemaVersion);
}

export async function reloadCommandJournalSidecarsV5R9(context) {
  requireCondition(context?.trustedRoot?.root && context?.activeRegistration?.selfHash,
    "R9 command-journal sidecar reload requires a trusted root and active registration");
  const relativeDirectory = path.join("runtime-custody-v5-r9", "transition-journals");
  const directory = path.join(context.trustedRoot.root, relativeDirectory);
  let names;
  try {
    const metadata = await lstat(directory);
    requireCondition(!metadata.isSymbolicLink() && metadata.isDirectory(),
      "R9 command-journal sidecar root must be a real directory");
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return Object.freeze([]);
    throw error;
  }
  requireCondition(names.every((name) => /^[0-9a-f]{64}\.json$/u.test(name)),
    "R9 command-journal sidecar root contains an unexpected entry");
  const journals = [];
  for (const name of [...names].sort()) {
    const value = await readProtectedJsonV5R4({ trustedRoot: context.trustedRoot,
      relativePath: path.join(relativeDirectory, name) });
    const errors = validateClosedSelfHashedArtifactV5R9(value,
      "CommandTransitionJournalReceiptV2");
    requireCondition(errors.length === 0
      && `${value.selfHash}.json` === name
      && value.activeRunnerRegistrationHash === context.activeRegistration.selfHash,
    `R9 command-journal sidecar is invalid or registration-drifted: ${errors.join("; ")}`);
    journals.push(value);
  }
  requireCondition(new Set(journals.map(({ selfHash }) => selfHash)).size === journals.length,
    "R9 command-journal sidecar set contains duplicate hashes");
  return Object.freeze(journals);
}

export async function reconstructAttemptCustodyByProviderV5R9(context) {
  const result = {};
  const allIntents = valuesBySchema(context.artifacts, "ProviderAttemptCommitIntentV1");
  const allResolved = valuesBySchema(context.artifacts, "ResolvedProviderAttemptReceiptV2");
  const inventory = context.artifacts.get("SAMPLE_EXECUTION_INVENTORY_V2")
    ?? context.artifacts.get("SAMPLE_INVENTORY");
  for (const provider of ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"]) {
    const prefix = providerPrefix(provider);
    const authorization = context.artifacts.get(`${prefix}_AUTHORIZATION_V5_R9`);
    if (!authorization) {
      const orphans = [...allIntents, ...allResolved].filter((value) => value.provider === provider
        && value.activeRunnerRegistrationHash === context.activeRegistration.selfHash);
      requireCondition(orphans.length === 0,
        `R9 ${provider} attempt artifacts exist without the exact active authorization`);
      result[provider] = Object.freeze({ ledgerEntries: Object.freeze([]),
        preparedCompletions: Object.freeze([]),
        attemptCommitIntents: Object.freeze([]), resolvedAttemptReceipts: Object.freeze([]),
        commandJournals: Object.freeze([]), ledger: null, custodyErrors: Object.freeze([]) });
      continue;
    }
    requireCondition(validateSelfHashV5R3(authorization)
      && authorization.schemaVersion === "ProviderAuthorizationV5"
      && authorization.provider === provider
      && authorization.activeRunnerRegistrationHash === context.activeRegistration.selfHash,
    `R9 ${provider} active authorization is invalid or registration-drifted`);
    const priceSnapshot = context.artifacts.get(`${prefix}_PRICE_SNAPSHOT_V5_R9`);
    requireCondition(validateSelfHashV5R3(priceSnapshot) && validateSelfHashV5R3(inventory),
      `R9 ${provider} ledger cannot reload without sealed price and inventory artifacts`);
    const ledger = await createAtomicExecutionLedgerV5R7({
      trustedRoot: context.trustedRoot,
      ledgerRelativePath: executionLedgerRelativePathV5R9(provider,
        authorization.compatibilityAuthorizationHash),
      authorization: authorization.compatibilityAuthorization,
      inventory,
      priceSnapshot,
    });
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0,
      `R9 ${provider} ledger reload failed: ${verified.errors.join("; ")}`);
    const indexedAttemptCommitIntents = allIntents.filter((value) =>
      value.activeRunnerRegistrationHash === context.activeRegistration.selfHash
      && value.authorizationHash === authorization.selfHash && value.provider === provider);
    const indexedResolvedAttemptReceipts = allResolved.filter((value) =>
      value.activeRunnerRegistrationHash === context.activeRegistration.selfHash
      && value.authorizationHash === authorization.selfHash && value.provider === provider);
    const reloaded = await reloadAttemptCustodyStoreV5R9({ trustedRoot: context.trustedRoot,
      provider, authorizationHash: authorization.selfHash, ledgerEntries: verified.entries });
    requireCondition(reloaded.orphanDirectoryHashes.length === 0,
      `R9 ${provider} attempt custody contains directories without ledger reservations`);
    const mergeExact = (left, right, label) => {
      const byHash = new Map();
      for (const value of [...left, ...right]) {
        requireCondition(validateSelfHashV5R3(value),
          `R9 ${provider} ${label} merge contains an invalid self-hashed artifact`);
        const existing = byHash.get(value.selfHash);
        requireCondition(existing === undefined
          || canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
        `R9 ${provider} ${label} merge contains different canonical bytes for one self-hash`);
        if (existing === undefined) byHash.set(value.selfHash, value);
      }
      return [...byHash.values()];
    };
    const attemptCommitIntents = mergeExact(indexedAttemptCommitIntents,
      reloaded.attemptCommitIntents, "intent");
    const resolvedAttemptReceipts = mergeExact(indexedResolvedAttemptReceipts,
      reloaded.resolvedAttemptReceipts, "resolved receipt");
    const commandJournals = valuesBySchema(context.artifacts, "CommandTransitionJournalReceiptV2")
      .filter((value) => value.activeRunnerRegistrationHash === context.activeRegistration.selfHash);
    const custody = { ledgerEntries: verified.entries, preparedCompletions: reloaded.preparedCompletions,
      attemptCommitIntents, resolvedAttemptReceipts, reconciliationReceipts: reloaded.reconciliationReceipts,
      commandJournals, ledger, custodyStore: reloaded.store };
    result[provider] = Object.freeze({ ...custody,
      custodyErrors: validateResumeCustodyV5R9(custody) });
  }
  return Object.freeze(result);
}

async function persistContentAddressedV5R9({ trustedRoot, family, value }) {
  requireCondition(/^[a-z0-9][a-z0-9-]*$/u.test(family) && validateSelfHashV5R3(value),
    "R9 protected artifact family or self-hash is invalid");
  const relativePath = path.join("derived-v5-r9", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R9 content-addressed artifact path contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return relativePath;
}

export async function advanceProtectedWorkflowIndexV5R9({ context, command, appendedArtifacts,
  committedAt }) {
  requireCondition(context?.trustedRoot && context?.index && context?.activeRegistration
    && Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0,
  "loaded R9 workflow context and at least one append-only artifact are required");
  const persisted = [];
  for (const entry of appendedArtifacts) {
    const relativePath = await persistContentAddressedV5R9({ trustedRoot: context.trustedRoot,
      family: entry.family, value: entry.value });
    persisted.push({ kind: entry.kind, relativePath, value: entry.value });
  }
  const nextIndex = buildWorkflowIndexSupersessionV5R6({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    priorIndex: context.index,
    appendedArtifacts: persisted,
    legacyPriorArtifactValues: context.artifacts,
    createdAt: committedAt,
  });
  const nextIndexRelativePath = path.join("workflow-indexes-v5-r9", `${nextIndex.selfHash}.json`);
  await atomicWriteProtectedJsonV5R4({ trustedRoot: context.trustedRoot,
    relativePath: nextIndexRelativePath, value: nextIndex });
  const transitionReceipt = buildWorkflowCommandTransitionReceiptV5R5({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    command,
    priorIndex: context.index,
    nextIndex,
    derivedArtifact: appendedArtifacts[0].value,
    committedAt,
  });
  const transitionRelativePath = await persistContentAddressedV5R9({
    trustedRoot: context.trustedRoot, family: "workflow-transitions", value: transitionReceipt,
  });
  context.index = nextIndex;
  for (const entry of persisted) context.artifacts.set(entry.kind, entry.value);
  return Object.freeze({
    persistedArtifacts: Object.freeze(persisted.map(({ kind, relativePath, value }) => Object.freeze({
      kind, relativePath,
      contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")),
      semanticSelfHash: value.selfHash,
    }))),
    nextIndex,
    nextIndexRelativePath,
    nextIndexPath: path.join(context.trustedRoot.root, nextIndexRelativePath),
    transitionReceipt,
    transitionRelativePath,
  });
}

export function resolveActiveRunnerReviewV5R9(artifactMap) {
  const review = artifactMap?.get?.(ACTIVE_REVIEW_KIND_V5_R9);
  requireCondition(review !== undefined,
    `protected workflow is missing ${ACTIVE_REVIEW_KIND_V5_R9}`);
  return review;
}

export async function loadProtectedWorkflowIndexV5R9(indexPath, { protectedRoot, repoRoot,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R9({ repoRoot }),
  freshReviewLoader = ({ registrationEvidence }) => loadExactFreshRunnerReviewV5R9({
    repoRoot, registrationEvidence,
  }),
} = {}) {
  const compatibilityContext = await loadProtectedWorkflowIndexV5R7(indexPath, {
    protectedRoot, repoRoot,
  });
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R9(registrationEvidence);
  requireCondition(evidenceErrors.length === 0,
    `exact R9 runner registration evidence failed: ${evidenceErrors.join("; ")}`);
  const activeRegistration = registrationEvidence.activeRegistration;
  const exactReview = await freshReviewLoader({ registrationEvidence });
  const indexBoundToR9 = compatibilityContext.index.schemaVersion === "ProtectedWorkflowIndexV2"
    && compatibilityContext.index.activeRunnerRegistrationHash === activeRegistration.selfHash;
  if (indexBoundToR9) {
    requireCondition(compatibilityContext.artifacts.get(ACTIVE_REGISTRATION_KIND_V5_R9)?.selfHash
      === activeRegistration.selfHash
      && compatibilityContext.artifacts.get(ACTIVE_REVIEW_KIND_V5_R9)?.selfHash
        === exactReview.freshReview.selfHash,
    "active R9 workflow index lacks the exact append-only registration and review artifacts");
  }
  const context = {
    ...compatibilityContext,
    registrationEvidence,
    activeRegistration,
    exactReview,
    freshReview: exactReview.freshReview,
    processArtifacts: exactReview.processArtifacts,
    reviewCustody: exactReview.reviewCustody,
    reviewerIdentityAnchor: exactReview.reviewerIdentityAnchor,
    closeoutReceipt: exactReview.closeoutReceipt,
    closeoutCommit: exactReview.closeoutCommit,
    needsR9Adoption: !indexBoundToR9,
  };
  const sidecarJournals = await reloadCommandJournalSidecarsV5R9(context);
  for (const journal of sidecarJournals) {
    const indexed = valuesBySchema(context.artifacts, "CommandTransitionJournalReceiptV2")
      .find(({ selfHash }) => selfHash === journal.selfHash);
    requireCondition(indexed === undefined
      || canonicalJsonV5R3(indexed) === canonicalJsonV5R3(journal),
    "R9 indexed command journal differs from its protected sidecar bytes");
    if (!indexed) context.artifacts.set(
      `RUNTIME_COMMAND_TRANSITION_JOURNAL_V5_R9:${journal.selfHash}`, journal);
  }
  context.attemptCustodyByProvider = await reconstructAttemptCustodyByProviderV5R9(context);
  return context;
}

export const WORKFLOW_INDEX_V5_R9_CONSTANTS = Object.freeze({
  activeReviewKind: ACTIVE_REVIEW_KIND_V5_R9,
  activeRegistrationKind: ACTIVE_REGISTRATION_KIND_V5_R9,
  priorReviewKindsRetainedAsHistory: Object.freeze([
    "FRESH_RUNNER_REVIEW", "FRESH_RUNNER_REVIEW_V5_R6", "FRESH_RUNNER_REVIEW_V5_R7",
  ]),
  derivedArtifactRoot: "derived-v5-r9",
  indexRoot: "workflow-indexes-v5-r9",
  adoptionRequiresGitCustodiedFreshReview: true,
  custodyReconstructedFromProtectedLedgerOnEveryLoad: true,
  orphanCompletionsRejectedBeforeResume: true,
  commandJournalSidecarsReloadedOnEveryContextLoad: true,
});
