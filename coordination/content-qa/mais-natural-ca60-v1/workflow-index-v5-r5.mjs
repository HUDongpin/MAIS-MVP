import path from "node:path";

import V5_R4_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r4/runner-registration.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
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
  loadExactTrackedRunnerRegistrationV5R5,
  validateExactRunnerRegistrationEvidenceV5R5,
} from "./execution-evidence-v5-r5.mjs";

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value)
    && !path.normalize(value).split(path.sep).some((part) => ["", ".", ".."].includes(part));
}

export function buildWorkflowIndexSupersessionV5R5({ activeRunnerRegistrationHash, priorIndex, appendedArtifacts, legacyPriorArtifactValues, createdAt }) {
  requireCondition(typeof activeRunnerRegistrationHash === "string" && /^[0-9a-f]{64}$/u.test(activeRunnerRegistrationHash), "active runner hash is invalid");
  requireCondition(validateSelfHashV5R3(priorIndex), "prior workflow index is not self-hashed");
  requireCondition(priorIndex.schemaVersion === "ProtectedWorkflowIndexV1"
    || (priorIndex.schemaVersion === "ProtectedWorkflowIndexV2" && priorIndex.activeRunnerRegistrationHash === activeRunnerRegistrationHash),
  "prior workflow index is neither the immutable V5-R4 base nor the same active V5-R5 chain");
  requireCondition(Number.isFinite(Date.parse(createdAt)) && Number.isFinite(Date.parse(priorIndex.createdAt))
    && Date.parse(createdAt) > Date.parse(priorIndex.createdAt), "workflow supersession must strictly postdate its prior index");
  requireCondition(Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0, "workflow supersession requires at least one derived artifact");
  const rawPriorEntries = Array.isArray(priorIndex.artifactEntries) ? priorIndex.artifactEntries : [];
  const priorEntries = priorIndex.schemaVersion === "ProtectedWorkflowIndexV1" ? rawPriorEntries.map((entry) => {
    const value = legacyPriorArtifactValues?.get?.(entry.kind);
    requireCondition(value !== undefined
      && sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")) === entry.contentHash,
    `legacy workflow artifact ${entry.kind} is absent or differs from its V1 content hash`);
    return Object.freeze({ kind: entry.kind, relativePath: entry.relativePath, contentHash: entry.contentHash,
      semanticSelfHash: validateSelfHashV5R3(value) ? value.selfHash : null,
      canonicalByteLength: Buffer.byteLength(canonicalJsonV5R3(value), "utf8"),
      schemaVersion: value?.schemaVersion ?? "UNVERSIONED_PROTECTED_VALUE" });
  }) : rawPriorEntries;
  const additions = appendedArtifacts.map((entry) => {
    requireCondition(typeof entry.kind === "string" && entry.kind.length > 0 && safeRelative(entry.relativePath), "workflow artifact kind or protected path is invalid");
    requireCondition(validateSelfHashV5R3(entry.value), "workflow derived artifact is not self-hashed");
    return Object.freeze({
      kind: entry.kind,
      relativePath: entry.relativePath,
      contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(entry.value), "utf8")),
      semanticSelfHash: entry.value.selfHash,
      canonicalByteLength: Buffer.byteLength(canonicalJsonV5R3(entry.value), "utf8"),
      schemaVersion: entry.value.schemaVersion,
    });
  });
  const all = [...priorEntries.map((entry) => structuredClone(entry)), ...additions];
  requireCondition(new Set(all.map(({ kind }) => kind)).size === all.length, "workflow artifact kinds must be unique across the supersession chain");
  requireCondition(new Set(all.map(({ relativePath }) => relativePath)).size === all.length, "workflow artifact paths must be unique across the supersession chain");
  const index = sealV5R3Artifact({
    schemaVersion: "ProtectedWorkflowIndexV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    compatibilityBaseRunnerRegistrationHash: priorIndex.runnerRegistrationHash ?? priorIndex.compatibilityBaseRunnerRegistrationHash,
    previousWorkflowIndexHash: priorIndex.selfHash,
    priorArtifactCount: priorEntries.length,
    appendedArtifactCount: additions.length,
    artifactEntries: all,
    artifactSetHash: sha256V5R3(canonicalJsonV5R3(all)),
    createdAt,
  });
  assertClosedSelfHashedArtifactV5R5(index, "ProtectedWorkflowIndexV2");
  return index;
}

function relativeInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("workflow index must be a file strictly inside the protected root");
  return relative;
}

async function persistContentAddressed({ trustedRoot, family, value }) {
  requireCondition(/^[a-z0-9][a-z0-9-]*$/u.test(family), "protected artifact family is invalid");
  requireCondition(validateSelfHashV5R3(value), "protected artifact must be self-hashed");
  const relativePath = path.join("derived-v5-r5", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value), "content-addressed protected artifact path contains different bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return relativePath;
}

export async function advanceProtectedWorkflowIndexV5R5({ context, command, appendedArtifacts, committedAt }) {
  requireCondition(context?.trustedRoot && context?.index && context?.activeRegistration, "loaded V5-R5 workflow context is required");
  requireCondition(Array.isArray(appendedArtifacts) && appendedArtifacts.length > 0, "workflow transition requires derived artifacts");
  const persisted = [];
  for (const entry of appendedArtifacts) {
    const relativePath = await persistContentAddressed({ trustedRoot: context.trustedRoot, family: entry.family, value: entry.value });
    persisted.push({ kind: entry.kind, relativePath, value: entry.value });
  }
  const nextIndex = buildWorkflowIndexSupersessionV5R5({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    priorIndex: context.index,
    appendedArtifacts: persisted,
    legacyPriorArtifactValues: context.artifacts,
    createdAt: committedAt,
  });
  const nextIndexRelativePath = path.join("workflow-indexes-v5-r5", `${nextIndex.selfHash}.json`);
  await atomicWriteProtectedJsonV5R4({ trustedRoot: context.trustedRoot, relativePath: nextIndexRelativePath, value: nextIndex });
  const transitionReceipt = buildWorkflowCommandTransitionReceiptV5R5({
    activeRunnerRegistrationHash: context.activeRegistration.selfHash,
    command,
    priorIndex: context.index,
    nextIndex,
    derivedArtifact: appendedArtifacts[0].value,
    committedAt,
  });
  const transitionRelativePath = await persistContentAddressed({ trustedRoot: context.trustedRoot,
    family: "workflow-transitions", value: transitionReceipt });
  context.index = nextIndex;
  for (const entry of persisted) context.artifacts.set(entry.kind, entry.value);
  return Object.freeze({ persistedArtifacts: Object.freeze(persisted.map(({ kind, relativePath, value }) => Object.freeze({
    kind,
    relativePath,
    contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")),
    semanticSelfHash: value.selfHash,
  }))),
    nextIndex, nextIndexRelativePath, nextIndexPath: path.join(context.trustedRoot.root, nextIndexRelativePath),
    transitionReceipt, transitionRelativePath });
}

export async function loadProtectedWorkflowIndexV5R5(indexPath, {
  protectedRoot,
  repoRoot,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R5({ repoRoot }),
} = {}) {
  requireCondition(path.isAbsolute(indexPath ?? "") && path.isAbsolute(protectedRoot ?? "") && path.isAbsolute(repoRoot ?? ""),
    "V5-R5 workflow loader requires absolute index, protected-root, and repository paths");
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const indexRelativePath = relativeInside(trustedRoot.root, path.resolve(indexPath));
  const index = await readProtectedJsonV5R4({ trustedRoot, relativePath: indexRelativePath });
  if (index.schemaVersion === "ProtectedWorkflowIndexV1") assertClosedSelfHashedArtifactV5R4(index, "ProtectedWorkflowIndexV1");
  else assertClosedSelfHashedArtifactV5R5(index, "ProtectedWorkflowIndexV2");
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R5(registrationEvidence);
  requireCondition(evidenceErrors.length === 0, `exact V5-R5 runner registration evidence failed: ${evidenceErrors.join("; ")}`);
  const activeRegistration = registrationEvidence.activeRegistration;
  if (index.schemaVersion === "ProtectedWorkflowIndexV1") {
    requireCondition(index.runnerRegistrationHash === V5_R4_REGISTRATION.selfHash,
      "legacy workflow index is not bound to the immutable V5-R4 compatibility base");
  } else {
    requireCondition(index.activeRunnerRegistrationHash === activeRegistration.selfHash
      && index.compatibilityBaseRunnerRegistrationHash === V5_R4_REGISTRATION.selfHash,
    "V5-R5 workflow index active/base registration binding is invalid");
  }
  const kinds = index.artifactEntries.map(({ kind }) => kind);
  const paths = index.artifactEntries.map(({ relativePath }) => relativePath);
  requireCondition(new Set(kinds).size === kinds.length && new Set(paths).size === paths.length,
    "workflow index kinds and paths must each be unique");
  const artifacts = new Map();
  for (const entry of index.artifactEntries) {
    const value = await readProtectedJsonV5R4({ trustedRoot, relativePath: entry.relativePath });
    if (index.schemaVersion === "ProtectedWorkflowIndexV1") {
      requireCondition(sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")) === entry.contentHash,
        `legacy protected artifact ${entry.kind} content hash is invalid`);
    } else {
      requireCondition(sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")) === entry.contentHash
        && (entry.semanticSelfHash === null || (validateSelfHashV5R3(value) && value.selfHash === entry.semanticSelfHash))
        && (value?.schemaVersion ?? "UNVERSIONED_PROTECTED_VALUE") === entry.schemaVersion
        && Buffer.byteLength(canonicalJsonV5R3(value), "utf8") === entry.canonicalByteLength,
      `V5-R5 protected artifact ${entry.kind} hash, schema, or length is invalid`);
    }
    artifacts.set(entry.kind, value);
  }
  return { index, indexPath: path.resolve(indexPath), indexRelativePath, registrationEvidence,
    activeRegistration, registration: V5_R4_REGISTRATION, trustedRoot, artifacts };
}

export function buildWorkflowCommandTransitionReceiptV5R5({ activeRunnerRegistrationHash, command, priorIndex, nextIndex, derivedArtifact, committedAt }) {
  requireCondition(validateSelfHashV5R3(priorIndex) && validateSelfHashV5R3(nextIndex) && validateSelfHashV5R3(derivedArtifact), "workflow command transition inputs are not self-hashed");
  requireCondition(nextIndex.previousWorkflowIndexHash === priorIndex.selfHash
    && nextIndex.activeRunnerRegistrationHash === activeRunnerRegistrationHash, "workflow next index does not supersede the exact prior index");
  requireCondition(nextIndex.artifactEntries.some(({ semanticSelfHash }) => semanticSelfHash === derivedArtifact.selfHash), "workflow next index does not contain the derived artifact");
  const receipt = sealV5R3Artifact({
    schemaVersion: "WorkflowCommandTransitionReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    command,
    priorWorkflowIndexHash: priorIndex.selfHash,
    nextWorkflowIndexHash: nextIndex.selfHash,
    derivedArtifactHash: derivedArtifact.selfHash,
    crossProcessResumeStateCommitted: true,
    committedAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "WorkflowCommandTransitionReceiptV1");
  return receipt;
}
