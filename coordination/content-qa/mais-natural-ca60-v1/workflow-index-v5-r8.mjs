import path from "node:path";

import {
  canonicalJsonV5R3,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  loadExactFreshRunnerReviewV5R8,
  loadExactTrackedRunnerRegistrationV5R8,
  validateExactRunnerRegistrationEvidenceV5R8,
} from "./execution-evidence-v5-r8.mjs";
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

export const ACTIVE_REVIEW_KIND_V5_R8 = "FRESH_RUNNER_REVIEW_V5_R8";
export const ACTIVE_REGISTRATION_KIND_V5_R8 = "ACTIVE_RUNNER_REGISTRATION_V5_R8";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

async function persistContentAddressedV5R8({ trustedRoot, family, value }) {
  requireCondition(/^[a-z0-9][a-z0-9-]*$/u.test(family) && validateSelfHashV5R3(value),
    "R8 protected artifact family or self-hash is invalid");
  const relativePath = path.join("derived-v5-r8", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R8 content-addressed artifact path contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return relativePath;
}

export async function advanceProtectedWorkflowIndexV5R8({ context, command, appendedArtifacts,
  committedAt }) {
  requireCondition(context?.trustedRoot && context?.index && context?.activeRegistration
    && Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0,
  "loaded R8 workflow context and at least one append-only artifact are required");
  const persisted = [];
  for (const entry of appendedArtifacts) {
    const relativePath = await persistContentAddressedV5R8({ trustedRoot: context.trustedRoot,
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
  const nextIndexRelativePath = path.join("workflow-indexes-v5-r8", `${nextIndex.selfHash}.json`);
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
  const transitionRelativePath = await persistContentAddressedV5R8({
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

export function resolveActiveRunnerReviewV5R8(artifactMap) {
  const review = artifactMap?.get?.(ACTIVE_REVIEW_KIND_V5_R8);
  requireCondition(review !== undefined,
    `protected workflow is missing ${ACTIVE_REVIEW_KIND_V5_R8}`);
  return review;
}

export async function loadProtectedWorkflowIndexV5R8(indexPath, { protectedRoot, repoRoot,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R8({ repoRoot }),
  freshReviewLoader = ({ registrationEvidence }) => loadExactFreshRunnerReviewV5R8({
    repoRoot, registrationEvidence,
  }),
} = {}) {
  const compatibilityContext = await loadProtectedWorkflowIndexV5R7(indexPath, {
    protectedRoot, repoRoot,
  });
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R8(registrationEvidence);
  requireCondition(evidenceErrors.length === 0,
    `exact R8 runner registration evidence failed: ${evidenceErrors.join("; ")}`);
  const activeRegistration = registrationEvidence.activeRegistration;
  const exactReview = await freshReviewLoader({ registrationEvidence });
  const indexBoundToR8 = compatibilityContext.index.schemaVersion === "ProtectedWorkflowIndexV2"
    && compatibilityContext.index.activeRunnerRegistrationHash === activeRegistration.selfHash;
  if (indexBoundToR8) {
    requireCondition(compatibilityContext.artifacts.get(ACTIVE_REGISTRATION_KIND_V5_R8)?.selfHash
      === activeRegistration.selfHash
      && compatibilityContext.artifacts.get(ACTIVE_REVIEW_KIND_V5_R8)?.selfHash
        === exactReview.freshReview.selfHash,
    "active R8 workflow index lacks the exact append-only registration and review artifacts");
  }
  return {
    ...compatibilityContext,
    registrationEvidence,
    activeRegistration,
    exactReview,
    freshReview: exactReview.freshReview,
    processArtifacts: exactReview.processArtifacts,
    reviewCustody: exactReview.reviewCustody,
    needsR8Adoption: !indexBoundToR8,
  };
}

export const WORKFLOW_INDEX_V5_R8_CONSTANTS = Object.freeze({
  activeReviewKind: ACTIVE_REVIEW_KIND_V5_R8,
  activeRegistrationKind: ACTIVE_REGISTRATION_KIND_V5_R8,
  priorReviewKindsRetainedAsHistory: Object.freeze([
    "FRESH_RUNNER_REVIEW", "FRESH_RUNNER_REVIEW_V5_R6", "FRESH_RUNNER_REVIEW_V5_R7",
  ]),
  derivedArtifactRoot: "derived-v5-r8",
  indexRoot: "workflow-indexes-v5-r8",
  adoptionRequiresGitCustodiedFreshReview: true,
});
