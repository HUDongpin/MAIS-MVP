import { createHash } from "node:crypto";
import {
  ACTIVE_MANIFEST_VERSION,
  D_PRIME_CURRENT_SET_DOMAIN,
  D_PRIME_INVALIDATED_SET_DOMAIN,
  LIVE_AUTHORITY_CODE,
  OFFLINE_AUTHORITY_CODE,
  RECEIPT_BINDING_VERSION,
  canonicalSha256,
  computeActiveReceiptManifestSha256,
  computeAuthorizationSha256,
  computeBoundReceiptSha256,
  computeDPrimeValidationReceiptSha256,
  computeExecutableCodeManifestSha256,
  computeReceiptSetSha256,
  computeReceiptArtifactSha256,
  computeResultSha256,
  computeTrustReceiptIdentitySha256,
  computeValidationReceiptSha256,
  expectedValidationRoleForSlot,
} from "./machine-qa-contract.mjs";

export function hash(label) {
  return createHash("sha256").update(`mais-machine-qa-fixture:${label}`, "utf8").digest("hex");
}

export function typedId(prefix, label, length = 16) {
  return `${prefix}-${hash(label).slice(0, length)}`;
}

export function timestamp(milliseconds) {
  return new Date(milliseconds).toISOString();
}

export function clone(value) {
  return structuredClone(value);
}

const C0_ROLES = [
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier",
];

function receiptBinding(slot, label, controlPlane, lineage = {}) {
  const controlPlaneSha256 = canonicalSha256(controlPlane);
  const outputDigestSha256 = hash(`${label}:output:${slot}`);
  const expectedRole = expectedValidationRoleForSlot(slot);
  const surfaceSetSha256 = hash(`${label}:surface-set:${slot}`);
  const validationReceiptBody = {
    receiptVersion: "1.0.0",
    receiptDomain: "mais-rsi-active-validation-receipt-v1",
    slot,
    controlPlaneSha256,
    projectionManifestSha256: controlPlane.projectionManifestSha256,
    evidenceSchemaVersion: controlPlane.evidenceSchemaVersion,
    taxonomyVersion: controlPlane.taxonomyVersion,
    expectedRole,
    observedRole: expectedRole,
    responseDigestSha256: outputDigestSha256,
    responseByteLength: 1,
    parseStatus: "passed",
    projectionStatus: "passed",
    schemaStatus: "passed",
    roleStatus: "passed",
    taxonomyStatus: "passed",
    surfaceCoverage: {
      status: "passed",
      expectedCount: 1,
      inspectedCount: 1,
      expectedSurfaceSetSha256: surfaceSetSha256,
      inspectedSurfaceSetSha256: surfaceSetSha256,
    },
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
  };
  const validationProjection = {
    projectionVersion: "1.0.0",
    status: "passed",
    projectionManifestSha256: controlPlane.projectionManifestSha256,
    validationReceiptBody,
    validationReceiptSha256: computeValidationReceiptSha256(validationReceiptBody),
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
  };
  const resultBody = {
    resultVersion: "1.0.0",
    slot,
    status: "complete",
    inspectionComplete: true,
    findingsCount: 0,
    outputDigestSha256,
    controlPlane: clone(controlPlane),
    controlPlaneSha256,
    validationProjection,
    validationProjectionSha256: canonicalSha256(validationProjection),
    ...lineage,
  };
  const resultSha256 = computeResultSha256(resultBody);
  const artifactSha256 = computeReceiptArtifactSha256(
    slot,
    resultSha256,
    controlPlaneSha256,
  );
  return {
    slot,
    resultBody,
    resultSha256,
    artifactSha256,
    controlPlaneSha256,
    bindingSha256: computeBoundReceiptSha256(slot, artifactSha256, controlPlaneSha256),
  };
}

export function buildActiveReceiptManifest(identity, options = {}) {
  const label = options.label ?? "current";
  const c0Required = options.c0Required === true;
  const controlPlane = clone(identity);
  controlPlane.c0TriggerAssessment = {
    assessmentVersion: "1.0.0",
    assessed: true,
    triggerCodes: c0Required ? [...(options.triggerCodes ?? ["P0_ANSWER_RISK"])] : [],
    c0Required,
  };
  const controlPlaneSha256 = canonicalSha256(controlPlane);
  const c0Roles = c0Required
    ? Object.fromEntries(C0_ROLES.map((role) => [
      role,
      receiptBinding(`c0-${role}`, label, controlPlane),
    ]))
    : {};
  const deterministic = receiptBinding("deterministic", label, controlPlane);
  const bPrimeCritique = receiptBinding("b-prime-critique", label, controlPlane);
  const bPrimeRevision = receiptBinding("b-prime-revision", label, controlPlane, {
    predecessorReceiptSha256: bPrimeCritique.bindingSha256,
    critiqueThenRevision: true,
    freshContext: true,
  });
  const manifest = {
    manifestVersion: ACTIVE_MANIFEST_VERSION,
    controlPlane,
    controlPlaneSha256,
    c0Required,
    c0Status: c0Required ? "complete" : "not-required",
    bindings: {
      deterministic,
      bPrimeCritique,
      bPrimeRevision,
      c0Roles,
      independentReview: receiptBinding("independent-review", label, controlPlane),
    },
  };
  manifest.manifestSha256 = computeActiveReceiptManifestSha256(manifest);
  return manifest;
}

export function activeManifestBindings(manifest) {
  return [
    manifest.bindings.deterministic,
    manifest.bindings.bPrimeCritique,
    manifest.bindings.bPrimeRevision,
    ...Object.values(manifest.bindings.c0Roles),
    manifest.bindings.independentReview,
  ];
}

export function activeManifestHashes(manifest) {
  return activeManifestBindings(manifest).flatMap((binding) => [
    binding.resultBody.outputDigestSha256,
    binding.resultBody.validationProjection.validationReceiptSha256,
    binding.resultBody.validationProjectionSha256,
    binding.resultSha256,
    binding.artifactSha256,
    binding.bindingSha256,
  ]);
}

export function buildTrustAnchor(receiptKind, label, boundReceiptSha256, verifiedAt) {
  const anchor = {
    trustVersion: "1.0.0",
    receiptKind,
    status: "VERIFIED",
    sourceIdentitySha256: hash(`${label}:trust-source`),
    externalReceiptSha256: hash(`${label}:external-receipt`),
    boundReceiptSha256,
    verifiedAt,
  };
  anchor.receiptIdentitySha256 = computeTrustReceiptIdentitySha256(anchor);
  return anchor;
}

export function rebindTrustAnchor(anchor, boundReceiptSha256) {
  anchor.boundReceiptSha256 = boundReceiptSha256;
  anchor.receiptIdentitySha256 = computeTrustReceiptIdentitySha256(anchor);
  return anchor;
}

export function refreshEvidenceHashes(packet) {
  const hashes = [];
  const add = (value) => {
    if (typeof value === "string" && /^[a-f0-9]{64}$/.test(value)) hashes.push(value);
  };
  for (const field of [
    "candidateSha256",
    "manifestSha256",
    "codeManifestSha256",
    "promptManifestSha256",
    "projectionManifestSha256",
  ]) add(packet.identity[field]);
  for (const source of packet.sourceIdentity ?? []) add(source.sha256);
  add(packet.activeReceiptManifest.controlPlaneSha256);
  add(packet.activeReceiptManifest.manifestSha256);
  for (const binding of activeManifestBindings(packet.activeReceiptManifest)) {
    add(binding.resultBody.outputDigestSha256);
    add(binding.resultBody.validationProjection?.validationReceiptSha256);
    add(binding.resultBody.validationProjectionSha256);
    add(binding.resultSha256);
    add(binding.artifactSha256);
    add(binding.controlPlaneSha256);
    add(binding.bindingSha256);
  }
  for (const boundary of Object.values(packet.proofBoundaries ?? {})) {
    if (boundary.status === "passed") add(boundary.evidenceSha256);
  }
  for (const check of packet.checks ?? []) {
    if (typeof check.evidenceRef === "string" && check.evidenceRef.startsWith("sha256:")) {
      add(check.evidenceRef.slice("sha256:".length));
    }
  }
  if (packet.authorization?.liveProviderUsed === true) {
    add(packet.authorization.authorizationSha256);
    add(packet.authorization.runnerSha256);
    for (const file of packet.executableCodeManifest?.files ?? []) add(file?.sha256);
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) add(packet.authorization.authorizationTrustAnchor?.[field]);
  }
  if (packet.remediation?.candidateMutated === true) {
    add(packet.remediation.validationReceiptSha256);
    add(packet.remediation.validationReceiptBody?.invalidatedReceiptSetSha256);
    add(packet.remediation.validationReceiptBody?.currentActiveReceiptSetSha256);
    add(packet.remediation.newReceiptBindings?.dPrimeValidationReceiptSha256);
    const prior = packet.remediation.priorReceiptBindings;
    add(prior?.priorEnvelopeSha256);
    add(prior?.activeReceiptManifestSha256);
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) add(prior?.priorTrustAnchor?.[field]);
  }
  packet.evidenceHashes = [...new Set(hashes)];
  return packet;
}

export function applyActiveReceiptManifest(packet, manifest) {
  packet.identity = clone(manifest.controlPlane);
  packet.activeReceiptManifest = manifest;
  packet.deterministic.receiptSha256 = manifest.bindings.deterministic.bindingSha256;
  packet.bPrime.critiqueReceiptSha256 = manifest.bindings.bPrimeCritique.bindingSha256;
  packet.bPrime.revisionReceiptSha256 = manifest.bindings.bPrimeRevision.bindingSha256;
  packet.bPrime.critiqueThenRevision = true;
  packet.bPrime.freshContext = true;
  packet.bPrime.revisionPredecessorReceiptSha256 =
    manifest.bindings.bPrimeCritique.bindingSha256;
  packet.independentReviewState.reviewReceiptSha256 = manifest.bindings.independentReview.bindingSha256;
  if (manifest.c0Required) {
    packet.c0Prime = {
      required: true,
      status: "complete",
      triggers: [...manifest.controlPlane.c0TriggerAssessment.triggerCodes],
      roles: Object.fromEntries(C0_ROLES.map((role) => [role, {
        status: "complete",
        inspectionComplete: true,
        receiptSha256: manifest.bindings.c0Roles[role].bindingSha256,
      }])),
    };
  } else {
    packet.c0Prime = { required: false, status: "not-required", triggers: [], roles: {} };
  }
  return refreshEvidenceHashes(packet);
}

export function validPacket(nowMs = Date.now()) {
  const observedAt = timestamp(nowMs - 3_000);
  const checkedAt = timestamp(nowMs - 1_000);
  const candidateSha256 = hash("candidate-new");
  const localProof = hash("proof-local");
  const receiptProof = hash("proof-receipt");
  const identity = {
    candidateId: typedId("candidate", "candidate-new"),
    candidateVersion: "2.0.0",
    candidateSha256,
    manifestSha256: hash("manifest"),
    policyVersion: "2.0.0",
    protocolId: `protocol-rsi-${hash("protocol-rsi").slice(0, 16)}`,
    protocolVersion: "2.0.0",
    codeManifestSha256: hash("code-manifest"),
    taxonomyVersion: "2.0.0",
    evidenceSchemaVersion: "1.0.0",
    promptManifestSha256: hash("prompt-manifest"),
    projectionManifestSha256: hash("projection-manifest"),
    c0TriggerAssessment: {
      assessmentVersion: "1.0.0",
      assessed: true,
      triggerCodes: [],
      c0Required: false,
    },
  };
  const manifest = buildActiveReceiptManifest(identity);
  const checkHash = hash("machine-envelope");
  const packet = {
    schemaVersion: "1.0",
    skill: "mais-rsi-machine-qa-workflow",
    mode: "audit-read-only",
    observedAt,
    repository: {
      head: "a".repeat(40),
      branch: `codex/qa-${hash("branch").slice(0, 8)}`,
      clean: true,
    },
    evidenceId: typedId("evidence", "evidence-fixture"),
    evidenceClass: "exact-package-machine-review",
    sourceIdentity: [{ logicalId: `source-candidate-${hash("source-candidate").slice(0, 16)}` }],
    resolvedState: "machine-evidence-complete",
    authority: {
      required: [OFFLINE_AUTHORITY_CODE],
      proven: [OFFLINE_AUTHORITY_CODE],
      missing: [],
    },
    status: "complete",
    identity,
    currentness: {
      candidateUnchanged: true,
      receiptCurrent: true,
      superseded: false,
      boundCandidateSha256: candidateSha256,
      checkedAt,
    },
    authorization: { liveProviderUsed: false },
    deterministic: {
      status: "complete",
      inspectionComplete: true,
      receiptSha256: manifest.bindings.deterministic.bindingSha256,
      findingsCount: 0,
    },
    bPrime: {
      status: "complete",
      inspectionComplete: true,
      critiqueReceiptSha256: manifest.bindings.bPrimeCritique.bindingSha256,
      revisionReceiptSha256: manifest.bindings.bPrimeRevision.bindingSha256,
      critiqueThenRevision: true,
      freshContext: true,
      revisionPredecessorReceiptSha256: manifest.bindings.bPrimeCritique.bindingSha256,
      findingsCount: 0,
    },
    c0Prime: {
      required: false,
      status: "not-required",
      triggers: [],
      roles: {},
    },
    machineDisposition: "candidate-only",
    independentReviewState: {
      status: "passed",
      freshContext: true,
      boundCandidateSha256: candidateSha256,
      reviewReceiptSha256: manifest.bindings.independentReview.bindingSha256,
      reviewerRole: "independent-machine-reviewer",
    },
    proofBoundaries: {
      localTest: { status: "passed", evidenceSha256: localProof },
      receipt: { status: "passed", evidenceSha256: receiptProof },
      trackedCommitted: { status: "unverified", evidenceSha256: null },
      main: { status: "unverified", evidenceSha256: null },
      ci: { status: "unverified", evidenceSha256: null },
      deployment: { status: "unverified", evidenceSha256: null },
      live: { status: "unverified", evidenceSha256: null },
    },
    checks: [
      { id: "IDENTITY_BOUND", status: "pass", evidenceRef: `sha256:${checkHash}` },
      { id: "REVIEW_COMPLETE", status: "pass" },
    ],
    blockers: [],
    deviations: [],
    activeReceiptManifest: manifest,
    evidenceHashes: [],
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
    remediation: { candidateMutated: false },
    claimCeiling: "machine-evidence-only",
    nextAllowedAction: "handoff-to-a18",
  };
  return refreshEvidenceHashes(packet);
}

export function withRequiredC0(packet) {
  return applyActiveReceiptManifest(
    packet,
    buildActiveReceiptManifest(packet.identity, { label: "current-c0", c0Required: true }),
  );
}

export function validLivePacket(nowMs = Date.now()) {
  const packet = validPacket(nowMs);
  const issuedAt = timestamp(nowMs - 5_000);
  const observedAt = timestamp(nowMs - 3_000);
  const callAt = timestamp(nowMs - 2_000);
  const checkedAt = timestamp(nowMs - 1_000);
  const expiresAt = timestamp(nowMs + 60_000);
  const runnerSha256 = hash("tracked-runner");
  const runnerPath = "scripts/fixture-runner.mjs";
  const runnerLogicalId = `runner-machineqa-${hash("runner-logical-id").slice(0, 16)}`;
  const executableCodeManifest = {
    manifestVersion: "1.0.0",
    manifestDomain: "mais-rsi-executable-code-manifest-v1",
    repositoryCommit: packet.repository.head,
    entrypoint: runnerPath,
    resolutionPolicy: "standalone-bundle-v1",
    runtime: { engine: "node", version: process.version },
    files: [
      {
        path: "package-lock.json",
        kind: "dependency-lock",
        mode: "100644",
        sha256: hash("fixture-package-lock"),
      },
      {
        path: "package.json",
        kind: "package-manifest",
        mode: "100644",
        sha256: hash("fixture-package-json"),
      },
      {
        path: runnerPath,
        kind: "entrypoint",
        mode: "100755",
        sha256: runnerSha256,
      },
    ],
    unresolvedImports: [],
    computedDynamicImports: [],
    customLoaders: [],
  };
  const codeManifestSha256 = computeExecutableCodeManifestSha256(
    executableCodeManifest,
  );
  packet.identity.codeManifestSha256 = codeManifestSha256;
  applyActiveReceiptManifest(
    packet,
    buildActiveReceiptManifest(packet.identity, { label: "live" }),
  );
  packet.executableCodeManifest = executableCodeManifest;
  packet.mode = "authorized-live-run";
  packet.observedAt = observedAt;
  packet.currentness.checkedAt = checkedAt;
  packet.authority = {
    required: [LIVE_AUTHORITY_CODE],
    proven: [LIVE_AUTHORITY_CODE],
    missing: [],
    expiresAt,
  };
  const authorizationId = typedId("authorization", "authorization-fixture");
  const provider = `provider-fixture-${hash("provider-fixture").slice(0, 16)}`;
  const model = `model-fixture-${hash("model-fixture").slice(0, 16)}`;
  const allowedRoles = ["b-prime-reviewer"];
  const authorizationProjection = {
    projectionVersion: "1.0.0",
    authorizationId,
    issuedAt,
    expiresAt,
    candidateId: packet.identity.candidateId,
    candidateVersion: packet.identity.candidateVersion,
    candidateSha256: packet.identity.candidateSha256,
    manifestSha256: packet.identity.manifestSha256,
    policyVersion: packet.identity.policyVersion,
    protocolId: packet.identity.protocolId,
    protocolVersion: packet.identity.protocolVersion,
    codeManifestSha256: packet.identity.codeManifestSha256,
    taxonomyVersion: packet.identity.taxonomyVersion,
    evidenceSchemaVersion: packet.identity.evidenceSchemaVersion,
    promptManifestSha256: packet.identity.promptManifestSha256,
    projectionManifestSha256: packet.identity.projectionManifestSha256,
    repositoryCommit: packet.repository.head,
    runnerLogicalId,
    runnerPath,
    runnerSha256,
    provider,
    model,
    allowedRoles,
    credentialAccessScope: "runtime-secret-reference-only",
    egressScope: "authorized-provider-endpoint-only",
    privacyRightsScope: "redacted-authorized-projection-only",
    attemptCap: 2,
    tokenCap: 1000,
    currencyCapUsd: 1,
  };
  packet.authorization = {
    liveProviderUsed: true,
    authorizationId,
    authorizationSha256: computeAuthorizationSha256(authorizationProjection),
    authorizationProjection,
    issuedAt,
    expiresAt,
    current: true,
    policyVersion: packet.identity.policyVersion,
    protocolId: packet.identity.protocolId,
    protocolVersion: packet.identity.protocolVersion,
    candidateSha256: packet.identity.candidateSha256,
    codeManifestSha256: packet.identity.codeManifestSha256,
    runnerLogicalId,
    runnerPath,
    runnerSha256,
    provider,
    model,
    allowedRoles,
    credentialAccessScope: "runtime-secret-reference-only",
    egressScope: "authorized-provider-endpoint-only",
    privacyRightsScope: "redacted-authorized-projection-only",
    attemptCap: 2,
    tokenCap: 1000,
    currencyCapUsd: 1,
  };
  packet.authorization.authorizationTrustAnchor = buildTrustAnchor(
    "live-authorization",
    "live-authorization",
    packet.authorization.authorizationSha256,
    timestamp(nowMs - 4_000),
  );
  packet.sourceIdentity.push({
    logicalId: `source-auth-${hash("live-authorization-source").slice(0, 16)}`,
    sha256: packet.authorization.authorizationTrustAnchor.sourceIdentitySha256,
  });
  packet.liveExecution = {
    runnerPath,
    runnerLogicalId,
    repositoryCommit: packet.repository.head,
    codeManifestSha256,
    runnerSha256,
    promptManifestSha256: packet.identity.promptManifestSha256,
    projectionManifestSha256: packet.identity.projectionManifestSha256,
    performedRoles: ["b-prime-reviewer"],
    callAt,
  };
  refreshEvidenceHashes(packet);
  return {
    packet,
    runtimeEvidence: {
      available: true,
      repositoryHead: packet.repository.head,
      repositoryBranch: packet.repository.branch,
      repositoryClean: packet.repository.clean,
      packetInputQuarantined: true,
      codeManifestSha256,
      codeManifestCurrent: true,
      codeManifestClosureValid: true,
      runtimeVersion: process.version,
      runnerTracked: true,
      runnerSha256,
      trackedRunnerSha256: runnerSha256,
      runnerExecutable: true,
      trackedRunnerExecutable: true,
      trackedRunnerMode: "100755",
    },
  };
}

export function validMutatedPacket(nowMs = Date.now()) {
  const packet = validPacket(nowMs);
  const priorIdentity = {
    candidateId: typedId("candidate", "candidate-prior"),
    candidateVersion: "1.0.0",
    candidateSha256: hash("candidate-prior"),
    manifestSha256: hash("prior-manifest"),
    policyVersion: "1.0.0",
    protocolId: `protocol-rsi-${hash("prior-protocol-rsi").slice(0, 16)}`,
    protocolVersion: "1.0.0",
    codeManifestSha256: hash("prior-code-manifest"),
    taxonomyVersion: "1.0.0",
    evidenceSchemaVersion: "1.0.0",
    promptManifestSha256: hash("prior-prompt-manifest"),
    projectionManifestSha256: hash("prior-projection-manifest"),
  };
  const priorManifest = buildActiveReceiptManifest(priorIdentity, {
    label: "prior",
    c0Required: true,
  });
  const priorC0Receipts = Object.fromEntries(C0_ROLES.map((role) => [
    role,
    priorManifest.bindings.c0Roles[role].bindingSha256,
  ]));
  const priorCandidate = {
    id: priorIdentity.candidateId,
    version: priorIdentity.candidateVersion,
    sha256: priorIdentity.candidateSha256,
  };
  const priorEnvelopeBody = {
    envelopeVersion: "1.0.0",
    priorCandidate,
    activeReceiptManifestSha256: priorManifest.manifestSha256,
    c0Required: true,
    c0Status: "complete",
    activeReceiptHashes: activeManifestHashes(priorManifest),
  };
  const priorEnvelopeSha256 = canonicalSha256(priorEnvelopeBody);
  const priorTrustAnchor = buildTrustAnchor(
    "prior-envelope",
    "prior-envelope",
    priorEnvelopeSha256,
    timestamp(nowMs - 4_000),
  );
  const priorReceiptBindings = {
    priorEnvelopeSha256,
    priorEnvelopeBody,
    priorTrustAnchor,
    activeReceiptManifestSha256: priorManifest.manifestSha256,
    activeReceiptManifest: priorManifest,
    c0Required: true,
    c0Status: "complete",
    deterministicReceiptSha256: priorManifest.bindings.deterministic.bindingSha256,
    bPrimeCritiqueReceiptSha256: priorManifest.bindings.bPrimeCritique.bindingSha256,
    bPrimeRevisionReceiptSha256: priorManifest.bindings.bPrimeRevision.bindingSha256,
    c0RoleReceipts: priorC0Receipts,
    independentReviewReceiptSha256: priorManifest.bindings.independentReview.bindingSha256,
  };
  const invalidatedReceiptHashes = activeManifestHashes(priorManifest);
  const currentActiveReceiptHashes = activeManifestHashes(packet.activeReceiptManifest);
  const validationReceiptBody = {
    receiptVersion: "1.0.0",
    receiptDomain: "mais-rsi-d-prime-validation-receipt-v1",
    priorCandidate: clone(priorCandidate),
    newCandidate: {
      id: packet.identity.candidateId,
      version: packet.identity.candidateVersion,
      sha256: packet.identity.candidateSha256,
    },
    priorActiveReceiptManifestSha256: priorManifest.manifestSha256,
    currentActiveReceiptManifestSha256: packet.activeReceiptManifest.manifestSha256,
    invalidatedReceiptSetSha256: computeReceiptSetSha256(
      D_PRIME_INVALIDATED_SET_DOMAIN,
      invalidatedReceiptHashes,
    ),
    currentActiveReceiptSetSha256: computeReceiptSetSha256(
      D_PRIME_CURRENT_SET_DOMAIN,
      currentActiveReceiptHashes,
    ),
    deterministicReceiptSha256: packet.deterministic.receiptSha256,
    bPrime: {
      critiqueReceiptSha256: packet.bPrime.critiqueReceiptSha256,
      revisionReceiptSha256: packet.bPrime.revisionReceiptSha256,
      revisionPredecessorReceiptSha256: packet.bPrime.revisionPredecessorReceiptSha256,
      critiqueThenRevision: true,
      freshContext: true,
    },
    c0Prime: {
      required: false,
      status: "not-required",
      roleReceipts: {},
    },
    independentReviewReceiptSha256: packet.independentReviewState.reviewReceiptSha256,
    freshContext: true,
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
  };
  const dPrimeValidationReceiptSha256 =
    computeDPrimeValidationReceiptSha256(validationReceiptBody);
  packet.remediation = {
    candidateMutated: true,
    freshContext: true,
    validationReceiptBody,
    validationReceiptSha256: dPrimeValidationReceiptSha256,
    priorCandidate,
    priorReceiptBindings,
    newCandidate: {
      id: packet.identity.candidateId,
      version: packet.identity.candidateVersion,
      sha256: packet.identity.candidateSha256,
    },
    invalidatedReceiptHashes,
    newReceiptBindings: {
      candidateId: packet.identity.candidateId,
      candidateVersion: packet.identity.candidateVersion,
      candidateSha256: packet.identity.candidateSha256,
      manifestSha256: packet.identity.manifestSha256,
      policyVersion: packet.identity.policyVersion,
      protocolId: packet.identity.protocolId,
      protocolVersion: packet.identity.protocolVersion,
      codeManifestSha256: packet.identity.codeManifestSha256,
      taxonomyVersion: packet.identity.taxonomyVersion,
      evidenceSchemaVersion: packet.identity.evidenceSchemaVersion,
      promptManifestSha256: packet.identity.promptManifestSha256,
      projectionManifestSha256: packet.identity.projectionManifestSha256,
      activeReceiptManifestSha256: packet.activeReceiptManifest.manifestSha256,
      deterministicReceiptSha256: packet.deterministic.receiptSha256,
      bPrimeCritiqueReceiptSha256: packet.bPrime.critiqueReceiptSha256,
      bPrimeRevisionReceiptSha256: packet.bPrime.revisionReceiptSha256,
      c0RoleReceipts: {},
      independentReviewReceiptSha256: packet.independentReviewState.reviewReceiptSha256,
      dPrimeValidationReceiptSha256,
    },
  };
  packet.sourceIdentity.push({
    logicalId: `source-prior-${hash("prior-envelope-source").slice(0, 16)}`,
    sha256: priorTrustAnchor.sourceIdentitySha256,
  });
  refreshEvidenceHashes(packet);
  return packet;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function addSelfHash(receipt, field = "selfHash") {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize(receipt)), "utf8")
    .digest("hex");
  return { ...receipt, [field]: digest };
}
