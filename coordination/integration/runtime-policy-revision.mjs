const HEX64 = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;

const EXPECTED_ROOT_KEYS = [
  "schemaVersion",
  "proposalId",
  "relation",
  "status",
  "sealedEvidenceRawSha256",
  "observerExecutionCommit",
  "targetBaselineCommit",
  "staleExpectedPolicyDigest",
  "observedPolicyDigest",
  "sealedDelta",
  "unchangedBindings",
  "classification",
  "authorization"
];
const EXPECTED_DELTA_KEYS = [
  "fromCommit",
  "toCommit",
  "changedFields",
  "source",
  "observed"
];
const EXPECTED_DELTA_FIELDS = [
  "edgeCount",
  "edgeDigest",
  "fsReadAllowlistDigest",
  "nextDynamicCallsiteDigest",
  "topologyEdgeCount",
  "topologyEdgeDigest"
];
const EXPECTED_POLICY_FIELDS = [
  "edgeCount",
  "edgeDigest",
  "fsReadAllowlistDigest",
  "nextDynamicCallsiteDigest",
  "topologyEdgeCount",
  "topologyEdgeDigest"
];
const EXPECTED_BINDING_KEYS = [
  "candidateDigest",
  "sourceCommit",
  "checkerVersion",
  "checkerBundleDigest",
  "checkerReleaseCommit"
];
const EXPECTED_CLASSIFICATION_KEYS = [
  "newStaticDependencyEdge",
  "graphTopologyExpansion",
  "reachablePathSetExpansion",
  "newLoaderCapability",
  "fsReadCapabilityExpansion",
  "dynamicImportTargetExpansion",
  "newNonliteralDynamicImport",
  "zeroBaselineLoaderExpansion"
];
const EXPECTED_AUTHORIZATION_KEYS = [
  "proposalAllowed",
  "workflowSelectorMutationAllowed",
  "manifestMutationAllowed",
  "shadowAllowed",
  "liveAllowed"
];

export const SEALED_POLICY_DIGESTS = Object.freeze({
  stale: "3cb75bdc2457f3d875351e89869fc0c28bb8edd94d1afe6a0d6090a0fd23349f",
  observed: "43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5"
});

export const SEALED_POLICY_DELTA = Object.freeze({
  fromCommit: "00929b2bdf88368dd838d7ff11bda13d3707e0e1",
  toCommit: "d0394f016eb91c3b065d4751601be65a7186e5ac",
  changedFields: EXPECTED_DELTA_FIELDS,
  source: Object.freeze({
    edgeCount: 3589,
    edgeDigest: "d8391d4a583e85069df1eefb11d173abc6e861385c33fa2b0e3a11781ce724b1",
    fsReadAllowlistDigest: "4086cb7cf516c752440fd29eb6ff71e65a1b1b239171660be225c79a58d5727e",
    nextDynamicCallsiteDigest: "4b439b4c150905bdf53347dbb3d87927c504f6841ef4a84b40220fd17022baaa",
    topologyEdgeCount: 3589,
    topologyEdgeDigest: "0660f9987830ac6e73bc101f5364be084d61ffc3daa8dac56e92e8284c1c64c4"
  }),
  observed: Object.freeze({
    edgeCount: 3590,
    edgeDigest: "cf5c6ff473ae2a2c6f2dc1ee63744db092d1f49680324fe3dcc3757e24d2dff8",
    fsReadAllowlistDigest: "4c3c8843388b25a798555da08e8cd826bbab48cc7742295f3954d1ff54b142f8",
    nextDynamicCallsiteDigest: "39181db66a0ab49a9a0b90c133f260094f277de1a4d5afbc276882892959b6e7",
    topologyEdgeCount: 3590,
    topologyEdgeDigest: "c14b18046e860c27e8bbda2b5df7d7ca14a4c4b89bd1153645f36b5044604637"
  })
});

export class RuntimePolicyRevisionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RuntimePolicyRevisionError";
    this.code = code;
    this.outcome = "blocked";
  }
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label} has an unexpected field set.`);
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha(value, label) {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label} must be a lowercase SHA-256 digest.`);
  }
}

function commit(value, label) {
  if (typeof value !== "string" || !COMMIT.test(value)) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label} must be a lowercase commit SHA.`);
  }
}

function policyProjection(value, label) {
  exactKeys(value, EXPECTED_POLICY_FIELDS, label);
  if (!Number.isSafeInteger(value.edgeCount) || value.edgeCount < 0) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label}.edgeCount must be a non-negative integer.`);
  }
  if (!Number.isSafeInteger(value.topologyEdgeCount) || value.topologyEdgeCount < 0) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", `${label}.topologyEdgeCount must be a non-negative integer.`);
  }
  for (const field of EXPECTED_POLICY_FIELDS.filter((key) => key.endsWith("Digest"))) sha(value[field], `${label}.${field}`);
}

export function validateRuntimePolicyRevisionProposal(proposal) {
  exactKeys(proposal, EXPECTED_ROOT_KEYS, "runtime policy revision proposal");
  if (proposal.schemaVersion !== "mais-runtime-policy-revision-proposal.v1") {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", "Unsupported runtime policy revision proposal schema.");
  }
  if (proposal.relation !== "append-only-reaffirmation" || proposal.status !== "candidate-only") {
    throw new RuntimePolicyRevisionError("REVISION_ORDERING_INVALID", "Runtime policy proposal must remain an append-only candidate-only revision.");
  }
  if (typeof proposal.proposalId !== "string" || proposal.proposalId.length < 1) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", "Runtime policy proposal id is required.");
  }
  sha(proposal.sealedEvidenceRawSha256, "sealedEvidenceRawSha256");
  if (proposal.sealedEvidenceRawSha256 !== "ddecb0dc10674115ff723b5785f6f5d0f4a934e532049c2d687f174c5aa3423f") {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "Proposal does not bind the sealed exact-delta evidence bytes.");
  }
  commit(proposal.observerExecutionCommit, "observerExecutionCommit");
  if (proposal.observerExecutionCommit !== "e170e6260f565abf1a2c576de3b3df388490c669") {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "Proposal observer execution commit does not match the sealed evidence.");
  }
  commit(proposal.targetBaselineCommit, "targetBaselineCommit");
  if (proposal.targetBaselineCommit !== "d0394f016eb91c3b065d4751601be65a7186e5ac") {
    throw new RuntimePolicyRevisionError("REVISION_BASELINE_INVALID", "Proposal target baseline is not the sealed baseline.");
  }
  sha(proposal.staleExpectedPolicyDigest, "staleExpectedPolicyDigest");
  sha(proposal.observedPolicyDigest, "observedPolicyDigest");
  if (proposal.staleExpectedPolicyDigest !== SEALED_POLICY_DIGESTS.stale) {
    throw new RuntimePolicyRevisionError("REVISION_POLICY_INPUT_INVALID", "Proposal stale policy digest is not the observed native blocker input.");
  }
  if (proposal.observedPolicyDigest !== SEALED_POLICY_DIGESTS.observed) {
    throw new RuntimePolicyRevisionError("REVISION_POLICY_INPUT_INVALID", "Proposal observed policy digest is not the sealed native observation.");
  }

  exactKeys(proposal.sealedDelta, EXPECTED_DELTA_KEYS, "sealedDelta");
  commit(proposal.sealedDelta.fromCommit, "sealedDelta.fromCommit");
  commit(proposal.sealedDelta.toCommit, "sealedDelta.toCommit");
  if (proposal.sealedDelta.fromCommit !== SEALED_POLICY_DELTA.fromCommit || proposal.sealedDelta.toCommit !== SEALED_POLICY_DELTA.toCommit) {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "Sealed policy delta commits do not match the exact review evidence.");
  }
  if (JSON.stringify(proposal.sealedDelta.changedFields) !== JSON.stringify(EXPECTED_DELTA_FIELDS)) {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "Sealed policy delta field ordering or membership changed.");
  }
  policyProjection(proposal.sealedDelta.source, "sealedDelta.source");
  policyProjection(proposal.sealedDelta.observed, "sealedDelta.observed");
  if (JSON.stringify(proposal.sealedDelta.source) !== JSON.stringify(SEALED_POLICY_DELTA.source) || JSON.stringify(proposal.sealedDelta.observed) !== JSON.stringify(SEALED_POLICY_DELTA.observed)) {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "Sealed policy projection does not match the exact six-field delta.");
  }

  exactKeys(proposal.unchangedBindings, EXPECTED_BINDING_KEYS, "unchangedBindings");
  sha(proposal.unchangedBindings.candidateDigest, "unchangedBindings.candidateDigest");
  commit(proposal.unchangedBindings.sourceCommit, "unchangedBindings.sourceCommit");
  sha(proposal.unchangedBindings.checkerBundleDigest, "unchangedBindings.checkerBundleDigest");
  commit(proposal.unchangedBindings.checkerReleaseCommit, "unchangedBindings.checkerReleaseCommit");
  if (proposal.unchangedBindings.checkerVersion !== "promotion-gate-shadow-v2.6") {
    throw new RuntimePolicyRevisionError("REVISION_BINDING_INVALID", "Checker version changed in an append-only proposal.");
  }

  exactKeys(proposal.classification, EXPECTED_CLASSIFICATION_KEYS, "classification");
  if (proposal.classification.newStaticDependencyEdge !== true || proposal.classification.graphTopologyExpansion !== true) {
    throw new RuntimePolicyRevisionError("REVISION_CLASSIFICATION_INVALID", "The real static graph-topology expansion must remain explicit.");
  }
  for (const field of EXPECTED_CLASSIFICATION_KEYS.filter((key) => key !== "newStaticDependencyEdge" && key !== "graphTopologyExpansion")) {
    if (proposal.classification[field] !== false) {
      throw new RuntimePolicyRevisionError("REVISION_CAPABILITY_EXPANSION", "An unreviewed runtime capability expansion is not permitted.");
    }
  }

  exactKeys(proposal.authorization, EXPECTED_AUTHORIZATION_KEYS, "authorization");
  for (const field of EXPECTED_AUTHORIZATION_KEYS) {
    if (proposal.authorization[field] !== false) {
      throw new RuntimePolicyRevisionError("REVISION_ORDERING_INVALID", "A candidate policy proposal cannot authorize execution, selector, Manifest, Shadow, or live mutation.");
    }
  }
  return Object.freeze({
    proposalId: proposal.proposalId,
    relation: proposal.relation,
    status: proposal.status,
    staleExpectedPolicyDigest: proposal.staleExpectedPolicyDigest,
    observedPolicyDigest: proposal.observedPolicyDigest,
    changedFields: [...proposal.sealedDelta.changedFields],
    liveAllowed: false
  });
}

export function validateRevisedRuntimePolicyManifest(activeManifest, revisedManifest, proposal) {
  validateRuntimePolicyRevisionProposal(proposal);
  if (
    activeManifest?.schemaVersion !== "promotion-manifest.v2" ||
    revisedManifest?.schemaVersion !== "promotion-manifest.v2"
  ) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", "Both runtime-policy inputs must be v2 Promotion Manifests.");
  }
  const activePolicy = activeManifest.liveReachability?.expectedRuntimePolicy;
  const revisedPolicy = revisedManifest.liveReachability?.expectedRuntimePolicy;
  if (!activePolicy || !revisedPolicy) {
    throw new RuntimePolicyRevisionError("REVISION_SCHEMA_INVALID", "Both Manifests must contain a complete expected runtime policy.");
  }
  const activeWithoutPolicy = structuredClone(activeManifest);
  const revisedWithoutPolicy = structuredClone(revisedManifest);
  delete activeWithoutPolicy.liveReachability.expectedRuntimePolicy;
  delete revisedWithoutPolicy.liveReachability.expectedRuntimePolicy;
  if (stableJson(activeWithoutPolicy) !== stableJson(revisedWithoutPolicy)) {
    throw new RuntimePolicyRevisionError("REVISION_BINDING_INVALID", "The revised Manifest changed a non-policy binding.");
  }
  const changedFieldSet = new Set(Object.keys(revisedPolicy).filter(
    (field) => stableJson(activePolicy[field]) !== stableJson(revisedPolicy[field])
  ));
  const changedFields = EXPECTED_DELTA_FIELDS.filter((field) => changedFieldSet.has(field));
  if (changedFieldSet.size !== EXPECTED_DELTA_FIELDS.length || changedFields.length !== EXPECTED_DELTA_FIELDS.length) {
    throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", "The revised Manifest does not contain exactly the sealed six-field policy delta.");
  }
  for (const field of EXPECTED_DELTA_FIELDS) {
    if (
      stableJson(activePolicy[field]) !== stableJson(proposal.sealedDelta.source[field]) ||
      stableJson(revisedPolicy[field]) !== stableJson(proposal.sealedDelta.observed[field])
    ) {
      throw new RuntimePolicyRevisionError("REVISION_DELTA_INVALID", `The revised Manifest policy field ${field} does not match the sealed delta.`);
    }
  }
  if (
    revisedManifest.targetBaselineCommit !== proposal.targetBaselineCommit ||
    revisedManifest.candidateDigest !== proposal.unchangedBindings.candidateDigest ||
    revisedManifest.sourceCommit !== proposal.unchangedBindings.sourceCommit ||
    revisedManifest.checkerVersion !== proposal.unchangedBindings.checkerVersion ||
    revisedManifest.checkerRelease?.bundleDigest !== proposal.unchangedBindings.checkerBundleDigest ||
    revisedManifest.checkerRelease?.releaseCommit !== proposal.unchangedBindings.checkerReleaseCommit
  ) {
    throw new RuntimePolicyRevisionError("REVISION_BINDING_INVALID", "The revised Manifest changed a sealed candidate, source, baseline, or checker binding.");
  }
  return Object.freeze({
    changedFields,
    targetBaselineCommit: revisedManifest.targetBaselineCommit,
    candidateDigest: revisedManifest.candidateDigest,
    sourceCommit: revisedManifest.sourceCommit,
    checkerVersion: revisedManifest.checkerVersion,
    liveAllowed: false
  });
}

export function assertObservedRuntimePolicy({ expectedPolicyDigest, observedPolicyDigest, targetBaselineCommit }) {
  if (targetBaselineCommit !== "d0394f016eb91c3b065d4751601be65a7186e5ac") {
    throw new RuntimePolicyRevisionError("REVISION_BASELINE_INVALID", "Target baseline does not match the sealed runtime observation.");
  }
  if (expectedPolicyDigest !== observedPolicyDigest) {
    throw new RuntimePolicyRevisionError("V2_RUNTIME_GRAPH_DRIFT", "The complete runtime policy differs from the expected policy.");
  }
  return true;
}
