import path from "node:path";

import {
  canonicalJsonV5R3,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R7,
  validateExactRunnerRegistrationEvidenceV5R7,
} from "./execution-evidence-v5-r7.mjs";
import {
  buildWorkflowIndexSupersessionV5R6,
  loadProtectedWorkflowIndexV5R6,
} from "./workflow-index-v5-r6.mjs";
import {
  buildWorkflowCommandTransitionReceiptV5R5,
} from "./workflow-index-v5-r5.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";

export const ACTIVE_REVIEW_KIND_V5_R7 = "FRESH_RUNNER_REVIEW_V5_R7";
export const ACTIVE_REGISTRATION_KIND_V5_R7 = "ACTIVE_RUNNER_REGISTRATION_V5_R7";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

async function persistContentAddressedV5R7({ trustedRoot, family, value }) {
  requireCondition(/^[a-z0-9][a-z0-9-]*$/u.test(family) && validateSelfHashV5R3(value),
    "R7 protected artifact family or self-hash is invalid");
  const relativePath = path.join("derived-v5-r7", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R7 content-addressed artifact path contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return relativePath;
}

export async function advanceProtectedWorkflowIndexV5R7({ context, command, appendedArtifacts,
  committedAt }) {
  requireCondition(context?.trustedRoot && context?.index && context?.activeRegistration
    && Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0,
  "loaded R7 workflow context and at least one append-only artifact are required");
  const persisted = [];
  for (const entry of appendedArtifacts) {
    const relativePath = await persistContentAddressedV5R7({
      trustedRoot: context.trustedRoot,
      family: entry.family,
      value: entry.value,
    });
    persisted.push({ kind: entry.kind, relativePath, value: entry.value });
  }
  const nextIndex = buildWorkflowIndexSupersessionV5R6({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    priorIndex: context.index,
    appendedArtifacts: persisted,
    legacyPriorArtifactValues: context.artifacts,
    createdAt: committedAt,
  });
  const nextIndexRelativePath = path.join("workflow-indexes-v5-r7", `${nextIndex.selfHash}.json`);
  await atomicWriteProtectedJsonV5R4({
    trustedRoot: context.trustedRoot,
    relativePath: nextIndexRelativePath,
    value: nextIndex,
  });
  const transitionReceipt = buildWorkflowCommandTransitionReceiptV5R5({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    command,
    priorIndex: context.index,
    nextIndex,
    derivedArtifact: appendedArtifacts[0].value,
    committedAt,
  });
  const transitionRelativePath = await persistContentAddressedV5R7({
    trustedRoot: context.trustedRoot,
    family: "workflow-transitions",
    value: transitionReceipt,
  });
  context.index = nextIndex;
  for (const entry of persisted) context.artifacts.set(entry.kind, entry.value);
  return Object.freeze({
    persistedArtifacts: Object.freeze(persisted.map(({ kind, relativePath, value }) => Object.freeze({
      kind,
      relativePath,
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

export function resolveActiveRunnerReviewV5R7(artifactMap) {
  const review = artifactMap?.get?.(ACTIVE_REVIEW_KIND_V5_R7);
  requireCondition(review !== undefined,
    `protected workflow is missing ${ACTIVE_REVIEW_KIND_V5_R7}`);
  return review;
}

export async function loadProtectedWorkflowIndexV5R7(indexPath, {
  protectedRoot,
  repoRoot,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R7({ repoRoot }),
} = {}) {
  const compatibilityContext = await loadProtectedWorkflowIndexV5R6(indexPath, {
    protectedRoot,
    repoRoot,
  });
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R7(registrationEvidence);
  requireCondition(evidenceErrors.length === 0,
    `exact R7 runner registration evidence failed: ${evidenceErrors.join("; ")}`);
  const activeRegistration = registrationEvidence.activeRegistration;
  const indexBoundToR7 = compatibilityContext.index.schemaVersion === "ProtectedWorkflowIndexV2"
    && compatibilityContext.index.activeRunnerRegistrationHash === activeRegistration.selfHash;
  if (indexBoundToR7) {
    requireCondition(compatibilityContext.artifacts.get(ACTIVE_REGISTRATION_KIND_V5_R7)?.selfHash
      === activeRegistration.selfHash,
    "active R7 workflow index lacks the exact append-only registration artifact");
  }
  return {
    ...compatibilityContext,
    registrationEvidence,
    activeRegistration,
    needsR7Adoption: !indexBoundToR7,
  };
}

export const WORKFLOW_INDEX_V5_R7_CONSTANTS = Object.freeze({
  activeReviewKind: ACTIVE_REVIEW_KIND_V5_R7,
  activeRegistrationKind: ACTIVE_REGISTRATION_KIND_V5_R7,
  priorReviewKindsRetainedAsHistory: Object.freeze([
    "FRESH_RUNNER_REVIEW", "FRESH_RUNNER_REVIEW_V5_R6",
  ]),
  derivedArtifactRoot: "derived-v5-r7",
  indexRoot: "workflow-indexes-v5-r7",
  adoptionReachableFromPublicRegisterCommand: true,
});
