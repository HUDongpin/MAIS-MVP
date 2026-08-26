import path from "node:path";

import V5_R4_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r4/runner-registration.json" with { type: "json" };

import WORKFLOW_SCHEMA from "./schemas/ProtectedWorkflowIndexV2.schema.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  buildWorkflowCommandTransitionReceiptV5R5,
} from "./workflow-index-v5-r5.mjs";

export const ACTIVE_REVIEW_KIND_V5_R6 = "FRESH_RUNNER_REVIEW_V5_R6";
export const ACTIVE_REGISTRATION_KIND_V5_R6 = "ACTIVE_RUNNER_REGISTRATION_V5_R6";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value)
    && !path.normalize(value).split(path.sep).some((part) => ["", ".", ".."].includes(part));
}

function expandedLegacyEntries(priorIndex, legacyPriorArtifactValues) {
  if (priorIndex.schemaVersion !== "ProtectedWorkflowIndexV1") {
    return priorIndex.artifactEntries.map((entry) => structuredClone(entry));
  }
  return priorIndex.artifactEntries.map((entry) => {
    const value = legacyPriorArtifactValues?.get?.(entry.kind);
    requireCondition(value !== undefined
      && sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")) === entry.contentHash,
    `legacy workflow artifact ${entry.kind} is absent or differs from its content hash`);
    return {
      kind: entry.kind,
      relativePath: entry.relativePath,
      contentHash: entry.contentHash,
      semanticSelfHash: validateSelfHashV5R3(value) ? value.selfHash : null,
      canonicalByteLength: Buffer.byteLength(canonicalJsonV5R3(value), "utf8"),
      schemaVersion: value?.schemaVersion ?? "UNVERSIONED_PROTECTED_VALUE",
    };
  });
}

export function buildWorkflowIndexSupersessionV5R6({
  activeRunnerRegistrationHash,
  priorIndex,
  appendedArtifacts,
  legacyPriorArtifactValues,
  createdAt,
}) {
  requireCondition(/^[0-9a-f]{64}$/u.test(activeRunnerRegistrationHash ?? ""), "active R6 runner hash is invalid");
  requireCondition(validateSelfHashV5R3(priorIndex)
    && ["ProtectedWorkflowIndexV1", "ProtectedWorkflowIndexV2"].includes(priorIndex.schemaVersion),
  "prior workflow index is invalid");
  requireCondition(Number.isFinite(Date.parse(createdAt)) && Date.parse(createdAt) > Date.parse(priorIndex.createdAt),
    "R6 workflow supersession must strictly postdate its prior index");
  requireCondition(Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0,
    "R6 workflow supersession requires at least one appended artifact");
  const priorEntries = expandedLegacyEntries(priorIndex, legacyPriorArtifactValues);
  const additions = appendedArtifacts.map((entry) => {
    requireCondition(typeof entry.kind === "string" && entry.kind.length > 0 && safeRelative(entry.relativePath)
      && validateSelfHashV5R3(entry.value), "R6 workflow appended artifact is invalid");
    return {
      kind: entry.kind,
      relativePath: entry.relativePath,
      contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(entry.value), "utf8")),
      semanticSelfHash: entry.value.selfHash,
      canonicalByteLength: Buffer.byteLength(canonicalJsonV5R3(entry.value), "utf8"),
      schemaVersion: entry.value.schemaVersion,
    };
  });
  const artifactEntries = [...priorEntries, ...additions];
  requireCondition(new Set(artifactEntries.map(({ kind }) => kind)).size === artifactEntries.length,
    "R6 workflow artifact kinds must be unique; use a versioned kind instead of replacing history");
  requireCondition(new Set(artifactEntries.map(({ relativePath }) => relativePath)).size === artifactEntries.length,
    "R6 workflow artifact paths must be unique");
  const compatibilityBaseRunnerRegistrationHash = priorIndex.schemaVersion === "ProtectedWorkflowIndexV1"
    ? priorIndex.runnerRegistrationHash
    : priorIndex.compatibilityBaseRunnerRegistrationHash;
  const next = sealV5R3Artifact({
    schemaVersion: "ProtectedWorkflowIndexV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    compatibilityBaseRunnerRegistrationHash,
    previousWorkflowIndexHash: priorIndex.selfHash,
    priorArtifactCount: priorEntries.length,
    appendedArtifactCount: additions.length,
    artifactEntries,
    artifactSetHash: sha256V5R3(canonicalJsonV5R3(artifactEntries)),
    createdAt,
  });
  assertClosedSelfHashedAgainstV5R5(next, WORKFLOW_SCHEMA, next.schemaVersion);
  return next;
}

export function resolveActiveRunnerReviewV5R6(artifactMap) {
  const review = artifactMap?.get?.(ACTIVE_REVIEW_KIND_V5_R6);
  requireCondition(review !== undefined, `protected workflow is missing ${ACTIVE_REVIEW_KIND_V5_R6}`);
  return review;
}

function relativeInside(root, candidate) {
  const relative = path.relative(root, candidate);
  requireCondition(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    "workflow index must be a file strictly inside the protected root");
  return relative;
}

async function persistContentAddressedV5R6({ trustedRoot, family, value }) {
  requireCondition(/^[a-z0-9][a-z0-9-]*$/u.test(family), "protected R6 artifact family is invalid");
  requireCondition(validateSelfHashV5R3(value), "protected R6 artifact must be self-hashed");
  const relativePath = path.join("derived-v5-r6", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "content-addressed R6 artifact path contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return relativePath;
}

export async function advanceProtectedWorkflowIndexV5R6({ context, command, appendedArtifacts, committedAt }) {
  requireCondition(context?.trustedRoot && context?.index && context?.activeRegistration,
    "loaded V5-R6 workflow context is required");
  requireCondition(Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0,
    "R6 workflow transition requires derived artifacts");
  const persisted = [];
  for (const entry of appendedArtifacts) {
    const relativePath = await persistContentAddressedV5R6({
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
  const nextIndexRelativePath = path.join("workflow-indexes-v5-r6", `${nextIndex.selfHash}.json`);
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
  const transitionRelativePath = await persistContentAddressedV5R6({ trustedRoot: context.trustedRoot,
    family: "workflow-transitions", value: transitionReceipt });
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

export async function loadProtectedWorkflowIndexV5R6(indexPath, {
  protectedRoot,
  repoRoot,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R6({ repoRoot }),
} = {}) {
  requireCondition(path.isAbsolute(indexPath ?? "") && path.isAbsolute(protectedRoot ?? "")
    && path.isAbsolute(repoRoot ?? ""),
  "V5-R6 workflow loader requires absolute index, protected-root, and repository paths");
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const indexRelativePath = relativeInside(trustedRoot.root, path.resolve(indexPath));
  const index = await readProtectedJsonV5R4({ trustedRoot, relativePath: indexRelativePath });
  if (index.schemaVersion === "ProtectedWorkflowIndexV1") {
    assertClosedSelfHashedArtifactV5R4(index, "ProtectedWorkflowIndexV1");
  } else {
    assertClosedSelfHashedAgainstV5R5(index, WORKFLOW_SCHEMA, "ProtectedWorkflowIndexV2");
  }
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R6(registrationEvidence);
  requireCondition(evidenceErrors.length === 0,
    `exact V5-R6 runner registration evidence failed: ${evidenceErrors.join("; ")}`);
  const activeRegistration = registrationEvidence.activeRegistration;
  if (index.schemaVersion === "ProtectedWorkflowIndexV1") {
    requireCondition(index.runnerRegistrationHash === V5_R4_REGISTRATION.selfHash,
      "legacy workflow index is not bound to the immutable V5-R4 compatibility base");
  } else {
    requireCondition(index.compatibilityBaseRunnerRegistrationHash === V5_R4_REGISTRATION.selfHash,
      "R6 workflow index compatibility-base registration is invalid");
  }
  const kinds = index.artifactEntries.map(({ kind }) => kind);
  const paths = index.artifactEntries.map(({ relativePath }) => relativePath);
  requireCondition(new Set(kinds).size === kinds.length && new Set(paths).size === paths.length,
    "workflow index kinds and paths must each be unique");
  const artifacts = new Map();
  for (const entry of index.artifactEntries) {
    const value = await readProtectedJsonV5R4({ trustedRoot, relativePath: entry.relativePath });
    const canonical = canonicalJsonV5R3(value);
    requireCondition(sha256V5R3(Buffer.from(canonical, "utf8")) === entry.contentHash,
      `protected R6 workflow artifact ${entry.kind} content hash is invalid`);
    if (index.schemaVersion === "ProtectedWorkflowIndexV2") {
      requireCondition((entry.semanticSelfHash === null
        || (validateSelfHashV5R3(value) && value.selfHash === entry.semanticSelfHash))
        && (value?.schemaVersion ?? "UNVERSIONED_PROTECTED_VALUE") === entry.schemaVersion
        && Buffer.byteLength(canonical, "utf8") === entry.canonicalByteLength,
      `protected R6 workflow artifact ${entry.kind} semantic hash, schema, or length is invalid`);
    }
    artifacts.set(entry.kind, value);
  }
  const indexBoundToR6 = index.schemaVersion === "ProtectedWorkflowIndexV2"
    && index.activeRunnerRegistrationHash === activeRegistration.selfHash;
  if (indexBoundToR6) {
    const registered = artifacts.get(ACTIVE_REGISTRATION_KIND_V5_R6);
    requireCondition(registered?.selfHash === activeRegistration.selfHash,
      "active R6 workflow index lacks its exact versioned runner registration artifact");
  }
  return {
    index,
    indexPath: path.resolve(indexPath),
    indexRelativePath,
    registrationEvidence,
    activeRegistration,
    registration: V5_R4_REGISTRATION,
    trustedRoot,
    artifacts,
    needsR6Adoption: !indexBoundToR6,
  };
}

export const WORKFLOW_INDEX_V5_R6_CONSTANTS = Object.freeze({
  activeReviewKind: ACTIVE_REVIEW_KIND_V5_R6,
  activeRegistrationKind: ACTIVE_REGISTRATION_KIND_V5_R6,
  legacyReviewKindRetainedAsHistory: "FRESH_RUNNER_REVIEW",
  derivedArtifactRoot: "derived-v5-r6",
  indexRoot: "workflow-indexes-v5-r6",
});
