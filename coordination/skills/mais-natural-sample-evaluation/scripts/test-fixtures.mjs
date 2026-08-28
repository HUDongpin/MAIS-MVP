import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  bindingForReceiptNode,
  canonicalDigest,
  deriveUnknownActivityCategories,
  expectedNodeSubject,
  receiptBodyForNode,
} from "./verify-evidence-envelope.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export function hash(label) {
  return createHash("sha256").update(label).digest("hex");
}

export function commit(label) {
  return hash(label).slice(0, 40);
}

export function clone(value) {
  return structuredClone(value);
}

export function timestamp(ms) {
  return new Date(ms).toISOString();
}

export async function withTempText(text, callback) {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-natural-skill-test-"));
  const file = path.join(directory, "packet.json");
  try {
    await writeFile(file, text, "utf8");
    return await callback(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function runScript(scriptName, args = []) {
  return spawnSync(process.execPath, [path.join(SCRIPT_DIR, scriptName), ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_PROXY: "*", HTTPS_PROXY: "", HTTP_PROXY: "" },
  });
}

function collectHashes(value, key = "", output = new Set()) {
  if (Array.isArray(value)) {
    if (key === "evidenceHashes") return output;
    for (const entry of value) collectHashes(entry, "", output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectHashes(child, childKey, output);
    return output;
  }
  if (typeof value === "string") {
    if ((key === "sha256" || key.endsWith("Sha256")) && /^[a-f0-9]{64}$/.test(value)) output.add(value);
    if (key === "evidenceRef" && /^sha256:[a-f0-9]{64}$/.test(value)) output.add(value.slice(7));
  }
  return output;
}

export function refreshEvidenceHashes(packet) {
  packet.evidenceHashes = [...collectHashes(packet)].sort();
  return packet;
}

const SIGNED = new Set([
  "FREEZE_REVIEW", "CUSTODY_HANDOFF", "RUNNER_REVIEW", "REFERENCE_PREFLIGHT",
  "REFERENCE_AUTHORIZATION", "EVALUATED_PREFLIGHT", "EVALUATED_AUTHORIZATION",
  "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION",
]);
const AUTHORIZATION = new Set(["REFERENCE_AUTHORIZATION", "EVALUATED_AUTHORIZATION"]);
const SIGNER_ROLE = new Map([
  ["FREEZE_REVIEW", "INDEPENDENT_FREEZE_REVIEWER"],
  ["CUSTODY_HANDOFF", "CUSTODY_HANDOFF_REVIEWER"],
  ["RUNNER_REVIEW", "INDEPENDENT_RUNNER_REVIEWER"],
  ["REFERENCE_PREFLIGHT", "REFERENCE_PREFLIGHT_AUTHORIZER"],
  ["REFERENCE_AUTHORIZATION", "REFERENCE_EXECUTION_AUTHORIZER"],
  ["EVALUATED_PREFLIGHT", "EVALUATED_PREFLIGHT_AUTHORIZER"],
  ["EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_AUTHORIZER"],
  ["FINAL_REVIEW", "INDEPENDENT_RESULT_REVIEWER"],
  ["CLAIM_REVIEW", "INDEPENDENT_CLAIM_REVIEWER"],
  ["AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT_AUTHORIZER"],
]);
const EXTERNAL_EVIDENCE = new Set([
  "REFERENCE_ROUTE", "REFERENCE_AUTHORIZATION", "REFERENCE_RESERVATION", "REFERENCE_ATTEMPT",
  "REFERENCE_COMPLETION", "REFERENCE_EGRESS", "REFERENCE_RECONCILIATION", "REFERENCE_LABELING",
  "REFERENCE_SEAL", "EVALUATED_ROUTE", "EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_REGISTRATION",
  "EVALUATED_CANARY_RESERVATION", "EVALUATED_CANARY_ATTEMPT", "EVALUATED_CANARY_COMPLETION",
  "EVALUATED_CANARY_EGRESS", "EVALUATED_CANARY_RECONCILIATION", "EVALUATED_CANARY",
  "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION",
  "EVALUATED_RUN_EGRESS", "EVALUATED_RUN_RECONCILIATION", "EVALUATED_RUN", "SCORE", "RESULT_SEAL",
  "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT",
]);

function event(phase, eventType, overrides = {}) {
  return {
    phase,
    eventType,
    reservationsDelta: 0,
    attemptsDelta: 0,
    completedCallsDelta: 0,
    egressDelta: 0,
    tokensDelta: 0,
    costUsdDelta: 0,
    concurrencyObserved: 0,
    ...overrides,
  };
}

function graphEntries(kinds) {
  return kinds.map((entry) => typeof entry === "string"
    ? { kind: entry, activityEvent: null }
    : structuredClone(entry));
}

function makeGraph(entries, nowMs, label) {
  const normalized = graphEntries(entries);
  const start = nowMs - (normalized.length + 3) * 1_000;
  let parent = null;
  return normalized.map(({ kind, activityEvent }, sequence) => {
    const receiptSha256 = hash(`${label}-receipt-${kind}-${sequence}`);
    const signed = SIGNED.has(kind);
    const node = {
      sequence,
      kind,
      subject: expectedNodeSubject(kind),
      receiptSha256,
      parentSha256: parent,
      observedAt: timestamp(start + sequence * 1_000),
      appendOnly: true,
      bindingDigestSha256: hash(`${label}-binding-placeholder-${sequence}`),
      signatureStatus: signed ? "VERIFIED" : "NOT_REQUIRED",
      signatureAnchorSha256: signed ? hash(`${label}-identity-${SIGNER_ROLE.get(kind)}`) : null,
      expiresAt: null,
      providerGrantBinding: null,
      activityEvent,
      receiptBody: null,
    };
    parent = receiptSha256;
    return node;
  });
}

function graphNode(graph, kind) {
  return graph.find((node) => node.kind === kind) ?? null;
}

function nodeHash(graph, kind) {
  return graphNode(graph, kind)?.receiptSha256 ?? null;
}

function materialHashes(label) {
  return {
    promptManifestSha256: hash(`${label}-prompt-manifest`),
    evidenceSchemaSha256: hash(`${label}-evidence-schema`),
    taxonomySha256: hash(`${label}-taxonomy`),
    scorerSha256: hash(`${label}-scorer`),
  };
}

function pendingReview() {
  return {
    status: "PENDING",
    receiptSha256: null,
    signatureStatus: "MISSING",
    identityAnchorSha256: null,
    reviewedBindingsSha256: null,
  };
}

function reviewBindings(packet, name) {
  if (name === "freeze") {
    return canonicalDigest({
      protocolRegistrationSha256: packet.materialCurrentness.registeredBindings.protocolRegistrationSha256,
      sampleManifestSha256: packet.materialCurrentness.registeredBindings.sampleManifestSha256,
      promptManifestSha256: packet.materialCurrentness.registeredBindings.promptManifestSha256,
      evidenceSchemaSha256: packet.materialCurrentness.registeredBindings.evidenceSchemaSha256,
      taxonomySha256: packet.materialCurrentness.registeredBindings.taxonomySha256,
      scorerSha256: packet.materialCurrentness.registeredBindings.scorerSha256,
      frameManifestSha256: packet.frame.manifestSha256,
    });
  }
  if (name === "runner") {
    return canonicalDigest({
      registeredBindings: packet.materialCurrentness.registeredBindings,
      runnerRegistrationSha256: packet.runner.registrationSha256,
      runnerClosureSha256: packet.runner.sourceClosureSha256,
      runnerCommit: packet.runner.sourceCommit,
    });
  }
  if (name === "final") {
    return canonicalDigest({
      resultReceiptSha256: packet.result.resultReceiptSha256,
      currentBindingsSha256: packet.result.currentBindingsSha256,
      resultConclusion: packet.result.resultConclusion,
      metricsManifestSha256: packet.result.metrics.metricsManifestSha256,
    });
  }
  return canonicalDigest({
    resultReceiptSha256: packet.result.resultReceiptSha256,
    resultConclusion: packet.result.resultConclusion,
    claimCeiling: packet.claimCeiling,
  });
}

function concurredReview(packet, graph, name, kind) {
  const node = graphNode(graph, kind);
  return {
    status: "CONCURRED",
    receiptSha256: node.receiptSha256,
    signatureStatus: "VERIFIED",
    identityAnchorSha256: node.signatureAnchorSha256,
    reviewedBindingsSha256: reviewBindings(packet, name),
  };
}

function inferenceFrame(registeredBindings, sampleSize, designProfileId, registeredPowerArtifactSha256, ceiling) {
  const frame = {
    inferenceFrameSha256: null,
    protocolRegistrationSha256: registeredBindings.protocolRegistrationSha256,
    sampleManifestSha256: registeredBindings.sampleManifestSha256,
    promptManifestSha256: registeredBindings.promptManifestSha256,
    evidenceSchemaSha256: registeredBindings.evidenceSchemaSha256,
    taxonomySha256: registeredBindings.taxonomySha256,
    runnerClosureSha256: registeredBindings.runnerClosureSha256,
    runnerCommit: registeredBindings.runnerCommit,
    scorerSha256: registeredBindings.scorerSha256,
    sampleSize,
    designProfileId,
    registeredPowerArtifactSha256,
    registeredClaimCeiling: ceiling,
  };
  const { inferenceFrameSha256: ignored, ...payload } = frame;
  frame.inferenceFrameSha256 = canonicalDigest(payload);
  return frame;
}

function knownUsage(phase, receiptSha256, values) {
  const metric = (value) => ({ known: true, value, receiptSha256 });
  return {
    phase,
    status: "RECONCILED",
    reservations: metric(values.reservations),
    attempts: metric(values.attempts),
    completedCalls: metric(values.completedCalls),
    egress: metric(values.egress),
    tokens: metric(values.tokens),
    costUsd: metric(values.costUsd),
    peakConcurrency: metric(values.peakConcurrency),
    reconciliationReceiptSha256: receiptSha256,
  };
}

function unknownUsage(phase, status = "NOT_STARTED") {
  const metric = () => ({ known: false, value: null, receiptSha256: null });
  return {
    phase,
    status,
    reservations: metric(),
    attempts: metric(),
    completedCalls: metric(),
    egress: metric(),
    tokens: metric(),
    costUsd: metric(),
    peakConcurrency: metric(),
    reconciliationReceiptSha256: null,
  };
}

function projectedProviderStatus(graph, prefix) {
  const stages = prefix === "REFERENCE"
    ? [["REFERENCE_PREFLIGHT", "PREFLIGHT_AUTHORIZED"], ["REFERENCE_ROUTE", "ROUTE_TRUSTED"], ["REFERENCE_AUTHORIZATION", "EXECUTION_AUTHORIZED"], ["REFERENCE_LABELING", "LABELING_COMPLETE"], ["REFERENCE_SEAL", "SEALED"]]
    : [["EVALUATED_PREFLIGHT", "PREFLIGHT_AUTHORIZED"], ["EVALUATED_ROUTE", "ROUTE_TRUSTED"], ["EVALUATED_AUTHORIZATION", "EXECUTION_AUTHORIZED"], ["EVALUATED_EXECUTION_REGISTRATION", "EXECUTION_REGISTRATION_FROZEN"], ["EVALUATED_CANARY", "CANARY_COMPLETE"], ["EVALUATED_RUN", "RUN_COMPLETE"]];
  let status = "NOT_STARTED";
  for (const [kind, candidate] of stages) if (nodeHash(graph, kind)) status = candidate;
  return status;
}

function noHandoff() {
  return {
    status: "NOT_REQUIRED",
    custodyRelation: "SAME_CONTEXT",
    handoffReceiptSha256: null,
    sampleManifestSha256: null,
    runnerRegistrationSha256: null,
    runnerClosureSha256: null,
    sourceCustodyRefSha256: null,
    destinationCustodyRefSha256: null,
    senderRole: "NOT_APPLICABLE",
    receiverRole: "NOT_APPLICABLE",
    transferMethod: "NOT_APPLICABLE",
    directoryModeVerification: "NOT_APPLICABLE",
    filesModeVerification: "NOT_APPLICABLE",
    symlinkVerification: "NOT_APPLICABLE",
    signatureStatus: "NOT_APPLICABLE",
    signatureAnchorSha256: null,
    contentCopiedToPublicArea: false,
  };
}

function requiredHandoff() {
  return { ...noHandoff(), status: "REQUIRED", custodyRelation: "CROSS_CUSTODY" };
}

function installGrant(packet, graph, name, nowMs, label) {
  const isReference = name === "reference";
  const authKind = isReference ? "REFERENCE_AUTHORIZATION" : "EVALUATED_AUTHORIZATION";
  const authNode = graphNode(graph, authKind);
  const routeAnchorSha256 = packet[name].routeTrustAnchorSha256;
  const expiresAt = timestamp(nowMs + 3_600_000);
  const issuedAt = timestamp(Date.parse(authNode.observedAt) - 500);
  const grant = {
    role: isReference ? "REFERENCE_PROVIDER" : "EVALUATED_PROVIDER",
    providerAdapterId: `provider-adapter-fixture-${hash(`${label}-${name}-adapter`).slice(0, 16)}`,
    modelId: `model-fixture-${hash(`${label}-${name}-model`).slice(0, 16)}`,
    routeAnchorSha256,
    phase: isReference ? "REFERENCE_LABELING" : "EVALUATED_RUN",
    credentialScopeSha256: hash(`${label}-${name}-credential-scope`),
    privacyRightsScopeSha256: packet.sourceRights.sourceScopeSha256,
    savePolicy: "SAVE_REDACTED_HASHES_ONLY",
    redactionPolicy: "REDACT_PROTECTED_CONTENT_AND_RAW_RESPONSES",
    protocolRegistrationSha256: packet.materialCurrentness.currentBindings.protocolRegistrationSha256,
    sampleManifestSha256: packet.materialCurrentness.currentBindings.sampleManifestSha256,
    runnerRegistrationSha256: packet.materialCurrentness.currentBindings.runnerRegistrationSha256,
    runnerClosureSha256: packet.materialCurrentness.currentBindings.runnerClosureSha256,
    runnerCommit: packet.materialCurrentness.currentBindings.runnerCommit,
    issuedAt,
    expiresAt,
    caps: { attemptCap: 8, tokenCap: 20_000, currencyCapUsd: 8, concurrencyCap: 2 },
    grantReceiptSha256: authNode.receiptSha256,
  };
  packet[name].grantBinding = grant;
  packet[name].naturalTextEgressAuthorized = true;
  if (isReference) packet.sourceRights.referenceGrantBinding = clone(grant);
  else packet.sourceRights.evaluatedGrantBinding = clone(grant);
  authNode.providerGrantBinding = clone(grant);
  authNode.expiresAt = expiresAt;
  return grant;
}

function replaceHashReferences(value, oldHash, newHash) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (entry === oldHash) value[index] = newHash;
      else if (entry === `sha256:${oldHash}`) value[index] = `sha256:${newHash}`;
      else replaceHashReferences(entry, oldHash, newHash);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (child === oldHash) value[key] = newHash;
    else if (child === `sha256:${oldHash}`) value[key] = `sha256:${newHash}`;
    else replaceHashReferences(child, oldHash, newHash);
  }
}

function refreshInferenceFrame(packet) {
  const { inferenceFrameSha256: ignored, ...payload } = packet.registeredInferenceFrame;
  packet.registeredInferenceFrame.inferenceFrameSha256 = canonicalDigest(payload);
}

function refreshDerivedForKind(packet, kind) {
  refreshInferenceFrame(packet);
  const reviewName = new Map([
    ["FREEZE_REVIEW", "freeze"], ["RUNNER_REVIEW", "runner"],
    ["FINAL_REVIEW", "final"], ["CLAIM_REVIEW", "claimBoundary"],
  ]).get(kind);
  if (reviewName && packet.independentReview[reviewName].status === "CONCURRED") {
    packet.independentReview[reviewName].reviewedBindingsSha256 = reviewBindings(packet, reviewName);
  }
  if (["SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].includes(kind)
      && ["SCORED", "SEALED"].includes(packet.result.status)) {
    packet.result.currentBindingsSha256 = canonicalDigest(packet.materialCurrentness.currentBindings);
    packet.result.registeredInferenceFrameSha256 = packet.registeredInferenceFrame.inferenceFrameSha256;
  }
  if (["AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].includes(kind)
      && ["AUTHORIZED", "EXPORTED"].includes(packet.aggregateExport.status)) {
    packet.aggregateExport.claimBindingSha256 = reviewBindings(packet, "claimBoundary");
    packet.aggregateExport.aggregateMetricsSha256 = canonicalDigest({
      resultMetricsManifestSha256: packet.result.metrics.metricsManifestSha256,
      resultConclusion: packet.result.resultConclusion,
      sampleSize: packet.result.metrics.sampleSize,
      successfulCount: packet.result.metrics.successfulCount,
      failedCount: packet.result.metrics.failedCount,
    });
  }
}

function externalAuthority(packet, node) {
  const provider = node.kind.startsWith("REFERENCE_") ? packet.reference
    : node.kind.startsWith("EVALUATED_") ? packet.evaluated : null;
  if (!EXTERNAL_EVIDENCE.has(node.kind) || (provider && provider.routeTrustAnchorSha256 === null)) {
    return { nativeReceiptRef: null, nativeReceiptSha256: null, trustAnchorSha256: null, verificationStatus: "UNKNOWN" };
  }
  const nativeReceiptSha256 = hash(`native-evidence:${node.kind}:${node.observedAt}:${node.sequence}`);
  const trustAnchorSha256 = provider?.routeTrustAnchorSha256
    ?? node.signatureAnchorSha256
    ?? hash(`native-trust:${node.subject}`);
  return {
    nativeReceiptRef: `sha256:${nativeReceiptSha256}`,
    nativeReceiptSha256,
    trustAnchorSha256,
    verificationStatus: "VERIFIED",
  };
}

export function refreshGraphBindings(packet) {
  let parentSha256 = null;
  for (let index = 0; index < packet.receiptGraph.length; index += 1) {
    const node = packet.receiptGraph[index];
    const oldHash = node.receiptSha256;
    node.sequence = index;
    node.parentSha256 = parentSha256;
    refreshDerivedForKind(packet, node.kind);
    const binding = bindingForReceiptNode(packet, node);
    node.bindingDigestSha256 = canonicalDigest(binding);
    node.receiptBody = {
      externalAuthority: externalAuthority(packet, node),
    };
    node.receiptBody = receiptBodyForNode(packet, node);
    const newHash = canonicalDigest(node.receiptBody);
    node.receiptSha256 = newHash;
    replaceHashReferences(packet, oldHash, newHash);
    parentSha256 = newHash;
  }
  return refreshEvidenceHashes(packet);
}

function basePacket(graph, nowMs, label, { differentCustody = false } = {}) {
  const protocolRegistrationSha256 = nodeHash(graph, "PROTOCOL_REGISTRATION");
  const sampleManifestSha256 = hash(`${label}-sample-manifest`);
  const runnerRegistrationSha256 = nodeHash(graph, "RUNNER_REGISTRATION");
  const runnerClosureSha256 = runnerRegistrationSha256 ? hash(`${label}-runner-closure`) : null;
  const runnerCommit = runnerRegistrationSha256 ? commit(`${label}-runner-commit`) : null;
  const extras = materialHashes(label);
  const registeredBindings = {
    protocolRegistrationSha256,
    sampleManifestSha256: nodeHash(graph, "SAMPLE_FREEZE") ? sampleManifestSha256 : null,
    ...extras,
    runnerRegistrationSha256,
    runnerClosureSha256,
    runnerCommit,
  };
  const sampleCustody = hash(`${label}-sample-custody-context`);
  const runnerCustody = differentCustody ? hash(`${label}-runner-custody-context`) : sampleCustody;
  const designProfileId = `design-profile-${hash(`${label}-design-profile`).slice(0, 16)}`;
  const registeredPowerArtifactSha256 = hash(`${label}-registered-power-artifact`);
  const packet = {
    schemaVersion: "1.0",
    skill: "mais-natural-sample-evaluation",
    mode: "AUDIT_STATUS",
    observedAt: timestamp(nowMs - 100),
    repository: {
      head: commit(`${label}-repository-head`),
      branch: "codex/natural-evaluation-fixture",
      clean: true,
    },
    evidenceClass: "natural-sample-evaluation",
    sourceIdentity: [{
      logicalId: `source-runtime-${hash(`${label}-source-logical`).slice(0, 16)}`,
      sha256: hash(`${label}-source-identity`),
      commit: commit(`${label}-source-commit`),
    }],
    resolvedState: "UNREGISTERED",
    authority: { required: [], proven: [], missing: [] },
    checks: [{ id: "RECEIPT_GRAPH", status: "pass", evidenceRef: `sha256:${graph.at(-1)?.receiptSha256 ?? hash(`${label}-empty-graph`)}` }],
    blockers: [],
    claimCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    nextAllowedAction: "REGISTER_PROTOCOL",
    evidenceHashes: [],
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
    protocol: {
      status: "ACTIVATED",
      family: "REGISTERED_NATURAL_EVALUATION",
      logicalId: `protocol-natural-${hash(`${label}-protocol-logical`).slice(0, 16)}`,
      registrationSha256: protocolRegistrationSha256,
      activationReceiptSha256: nodeHash(graph, "PROTOCOL_ACTIVATION"),
      activePointerSha256: nodeHash(graph, "PROTOCOL_ACTIVATION") ? hash(`${label}-active-pointer`) : null,
      immutable: true,
      designProfileId,
      registeredPowerArtifactSha256,
      registeredClaimCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    },
    sourceRights: {
      status: "AUTHORIZED_FOR_FREEZE",
      scopeReceiptSha256: nodeHash(graph, "SOURCE_RIGHTS"),
      sourceScopeSha256: nodeHash(graph, "SOURCE_RIGHTS") ? hash(`${label}-source-rights-scope`) : null,
      providerEgressAuthorized: false,
      credentialAccessAuthorized: false,
      spendAuthorized: false,
      referenceGrantBinding: null,
      evaluatedGrantBinding: null,
    },
    frame: {
      status: "FROZEN",
      readinessReceiptSha256: nodeHash(graph, "FRAME_READINESS"),
      freezeReceiptSha256: nodeHash(graph, "FRAME_FREEZE"),
      manifestSha256: nodeHash(graph, "FRAME_READINESS") ? hash(`${label}-frame-manifest`) : null,
      runtimeVisibleScopeBound: true,
      syntheticExcluded: true,
      rowCount: nodeHash(graph, "FRAME_FREEZE") ? 10 : null,
      eligibleCount: nodeHash(graph, "FRAME_FREEZE") ? 8 : null,
      excludedCount: nodeHash(graph, "FRAME_FREEZE") ? 2 : null,
    },
    sampleFreeze: {
      status: "INDEPENDENTLY_VERIFIED",
      freezeReceiptSha256: nodeHash(graph, "SAMPLE_FREEZE"),
      sampleManifestSha256: nodeHash(graph, "SAMPLE_FREEZE") ? sampleManifestSha256 : null,
      homologyManifestSha256: nodeHash(graph, "SAMPLE_FREEZE") ? hash(`${label}-homology-manifest`) : null,
      sampleSize: nodeHash(graph, "SAMPLE_FREEZE") ? 6 : null,
      onePerCluster: true,
      rerollForbidden: true,
      custody: {
        metadataReceiptSha256: nodeHash(graph, "SAMPLE_FREEZE") ? hash(`${label}-custody-metadata`) : null,
        custodyContextSha256: nodeHash(graph, "SAMPLE_FREEZE") ? sampleCustody : null,
        protectedRootRefSha256: nodeHash(graph, "SAMPLE_FREEZE") ? hash(`${label}-protected-root-ref`) : null,
        directoryMode: nodeHash(graph, "SAMPLE_FREEZE") ? "MODE_0700_VERIFIED" : "UNKNOWN",
        filesMode: nodeHash(graph, "SAMPLE_FREEZE") ? "MODE_0600_VERIFIED" : "UNKNOWN",
        symlinkStatus: nodeHash(graph, "SAMPLE_FREEZE") ? "SYMLINK_FREE_VERIFIED" : "UNKNOWN",
        contentExposed: false,
      },
    },
    runner: {
      status: "INDEPENDENTLY_VERIFIED",
      registrationSha256: runnerRegistrationSha256,
      sourceCommit: runnerCommit,
      sourceClosureSha256: runnerClosureSha256,
      closeoutReceiptSha256: nodeHash(graph, "RUNNER_CLOSEOUT"),
      independentReviewReceiptSha256: nodeHash(graph, "RUNNER_REVIEW"),
      reviewDecision: nodeHash(graph, "RUNNER_REVIEW") ? "CONCURRED" : "NOT_REVIEWED",
      tracked: true,
      clean: true,
      custodyContextSha256: runnerRegistrationSha256 ? runnerCustody : runnerCustody,
      custodyHandoff: differentCustody ? requiredHandoff() : noHandoff(),
    },
    reference: {
      status: projectedProviderStatus(graph, "REFERENCE"),
      preflightReceiptSha256: nodeHash(graph, "REFERENCE_PREFLIGHT"),
      routeReceiptSha256: nodeHash(graph, "REFERENCE_ROUTE"),
      routeTrustAnchorSha256: nodeHash(graph, "REFERENCE_ROUTE") ? hash(`${label}-reference-route-trust`) : null,
      grantBinding: null,
      naturalTextEgressAuthorized: false,
      labelingReceiptSha256: nodeHash(graph, "REFERENCE_LABELING"),
      sealReceiptSha256: nodeHash(graph, "REFERENCE_SEAL"),
    },
    evaluated: {
      status: projectedProviderStatus(graph, "EVALUATED"),
      preflightReceiptSha256: nodeHash(graph, "EVALUATED_PREFLIGHT"),
      routeReceiptSha256: nodeHash(graph, "EVALUATED_ROUTE"),
      routeTrustAnchorSha256: nodeHash(graph, "EVALUATED_ROUTE") ? hash(`${label}-evaluated-route-trust`) : null,
      grantBinding: null,
      naturalTextEgressAuthorized: false,
      executionRegistrationSha256: nodeHash(graph, "EVALUATED_EXECUTION_REGISTRATION"),
      canaryReceiptSha256: nodeHash(graph, "EVALUATED_CANARY"),
      runReceiptSha256: nodeHash(graph, "EVALUATED_RUN"),
    },
    materialCurrentness: {
      status: "CURRENT",
      sourceBaselineReceiptSha256: nodeHash(graph, "SOURCE_BASELINE"),
      currentnessReceiptSha256: nodeHash(graph, "MATERIAL_CURRENTNESS"),
      registeredBindings,
      currentBindings: clone(registeredBindings),
      hasProviderActivity: false,
      firstProviderActivity: { status: "NONE", receiptSha256: null, observedAt: null, phase: "NONE" },
      invalidatedRegistrationReceipts: [],
    },
    runProvenance: "natural-registered",
    registeredInferenceFrame: inferenceFrame(
      registeredBindings,
      nodeHash(graph, "SAMPLE_FREEZE") ? 6 : null,
      designProfileId,
      registeredPowerArtifactSha256,
      "INCONCLUSIVE_MACHINE_REFERENCE",
    ),
    activity: {
      attempts: { known: false, count: null, receiptSha256: null },
      completedCalls: { known: false, count: null, receiptSha256: null },
      egress: { known: false, count: null, receiptSha256: null },
      reference: unknownUsage("REFERENCE_LABELING"),
      evaluatedCanary: unknownUsage("EVALUATED_CANARY"),
      evaluatedRun: unknownUsage("EVALUATED_RUN"),
      summaryReceiptSha256: nodeHash(graph, "ACTIVITY_SUMMARY"),
      unknown: { present: false, categories: [], reconciliationReceiptSha256: nodeHash(graph, "ACTIVITY_SUMMARY") },
    },
    result: {
      status: "NOT_STARTED",
      provenance: "natural-registered",
      scoreReceiptSha256: nodeHash(graph, "SCORE"),
      resultReceiptSha256: nodeHash(graph, "RESULT_SEAL"),
      currentBindingsSha256: null,
      registeredInferenceFrameSha256: null,
      resultConclusion: "NO_EVALUATION_CLAIM",
      metrics: {
        provenance: "natural-registered",
        metricsManifestSha256: null,
        sampleSize: null,
        successfulCount: null,
        failedCount: null,
      },
    },
    independentReview: {
      freeze: pendingReview(),
      runner: pendingReview(),
      final: pendingReview(),
      claimBoundary: pendingReview(),
    },
    aggregateExport: {
      status: "NOT_REQUESTED",
      authorizationReceiptSha256: nodeHash(graph, "AGGREGATE_EXPORT_AUTHORIZATION"),
      exportReceiptSha256: nodeHash(graph, "AGGREGATE_EXPORT"),
      resultReceiptSha256: null,
      claimBindingSha256: null,
      metricsProvenance: "NONE",
      aggregateMetricsSha256: null,
      allowlistValidated: false,
      publicationAuthorized: false,
      protectedContentIncluded: false,
      itemIdentifiersIncluded: false,
      rawResponsesIncluded: false,
    },
    receiptGraph: graph,
  };
  return packet;
}

const CLOSED_ENTRIES = [
  "PROTOCOL_REGISTRATION", "PROTOCOL_ACTIVATION", "SOURCE_BASELINE", "SOURCE_RIGHTS",
  "FRAME_READINESS", "FRAME_FREEZE", "SAMPLE_FREEZE", "FREEZE_REVIEW",
  "RUNNER_REGISTRATION", "RUNNER_CLOSEOUT", "RUNNER_REVIEW", "CUSTODY_HANDOFF", "REFERENCE_PREFLIGHT", "REFERENCE_ROUTE",
  "REFERENCE_AUTHORIZATION",
  { kind: "REFERENCE_RESERVATION", activityEvent: event("REFERENCE_LABELING", "RESERVATION", { reservationsDelta: 2 }) },
  { kind: "REFERENCE_ATTEMPT", activityEvent: event("REFERENCE_LABELING", "ATTEMPT", { attemptsDelta: 2, concurrencyObserved: 1 }) },
  { kind: "REFERENCE_COMPLETION", activityEvent: event("REFERENCE_LABELING", "COMPLETION", { completedCallsDelta: 2, tokensDelta: 500, costUsdDelta: 0.5 }) },
  { kind: "REFERENCE_EGRESS", activityEvent: event("REFERENCE_LABELING", "EGRESS", { egressDelta: 2 }) },
  { kind: "REFERENCE_RECONCILIATION", activityEvent: event("REFERENCE_LABELING", "RECONCILIATION") },
  "REFERENCE_LABELING", "REFERENCE_SEAL", "EVALUATED_PREFLIGHT", "EVALUATED_ROUTE",
  "EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_REGISTRATION",
  { kind: "EVALUATED_CANARY_RESERVATION", activityEvent: event("EVALUATED_CANARY", "RESERVATION", { reservationsDelta: 1 }) },
  { kind: "EVALUATED_CANARY_ATTEMPT", activityEvent: event("EVALUATED_CANARY", "ATTEMPT", { attemptsDelta: 1, concurrencyObserved: 1 }) },
  { kind: "EVALUATED_CANARY_COMPLETION", activityEvent: event("EVALUATED_CANARY", "COMPLETION", { completedCallsDelta: 1, tokensDelta: 200, costUsdDelta: 0.2 }) },
  { kind: "EVALUATED_CANARY_EGRESS", activityEvent: event("EVALUATED_CANARY", "EGRESS", { egressDelta: 1 }) },
  { kind: "EVALUATED_CANARY_RECONCILIATION", activityEvent: event("EVALUATED_CANARY", "RECONCILIATION") },
  "EVALUATED_CANARY",
  { kind: "EVALUATED_RUN_RESERVATION", activityEvent: event("EVALUATED_RUN", "RESERVATION", { reservationsDelta: 2 }) },
  { kind: "EVALUATED_RUN_ATTEMPT", activityEvent: event("EVALUATED_RUN", "ATTEMPT", { attemptsDelta: 2, concurrencyObserved: 1 }) },
  { kind: "EVALUATED_RUN_COMPLETION", activityEvent: event("EVALUATED_RUN", "COMPLETION", { completedCallsDelta: 2, tokensDelta: 700, costUsdDelta: 0.7 }) },
  { kind: "EVALUATED_RUN_EGRESS", activityEvent: event("EVALUATED_RUN", "EGRESS", { egressDelta: 2 }) },
  { kind: "EVALUATED_RUN_RECONCILIATION", activityEvent: event("EVALUATED_RUN", "RECONCILIATION") },
  "EVALUATED_RUN", "ACTIVITY_SUMMARY", "MATERIAL_CURRENTNESS", "SCORE", "RESULT_SEAL",
  "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT",
];

export function makeClosedPacket(nowMs = Date.now()) {
  const label = "closed-fixture";
  const graph = makeGraph(CLOSED_ENTRIES, nowMs, label);
  const packet = basePacket(graph, nowMs, label, { differentCustody: true });
  packet.mode = "SCORE_REVIEW_EXPORT";
  packet.resolvedState = "CLOSED";
  packet.nextAllowedAction = "CLOSE";

  const handoffNode = graphNode(graph, "CUSTODY_HANDOFF");
  packet.runner.custodyHandoff = {
    status: "VERIFIED",
    custodyRelation: "CROSS_CUSTODY",
    handoffReceiptSha256: handoffNode.receiptSha256,
    sampleManifestSha256: packet.sampleFreeze.sampleManifestSha256,
    runnerRegistrationSha256: packet.runner.registrationSha256,
    runnerClosureSha256: packet.runner.sourceClosureSha256,
    sourceCustodyRefSha256: packet.sampleFreeze.custody.custodyContextSha256,
    destinationCustodyRefSha256: packet.runner.custodyContextSha256,
    senderRole: "SAMPLE_CUSTODIAN",
    receiverRole: "RUNNER_CUSTODIAN",
    transferMethod: "CONTROLLED_MOUNT",
    directoryModeVerification: "MODE_0700_VERIFIED",
    filesModeVerification: "MODE_0600_VERIFIED",
    symlinkVerification: "SYMLINK_FREE_VERIFIED",
    signatureStatus: "VERIFIED",
    signatureAnchorSha256: handoffNode.signatureAnchorSha256,
    contentCopiedToPublicArea: false,
  };

  const firstActivityNode = graph.find((node) => [
    "REFERENCE_RESERVATION", "REFERENCE_ATTEMPT", "REFERENCE_COMPLETION", "REFERENCE_EGRESS",
    "EVALUATED_CANARY_RESERVATION", "EVALUATED_CANARY_ATTEMPT", "EVALUATED_CANARY_COMPLETION", "EVALUATED_CANARY_EGRESS",
    "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION", "EVALUATED_RUN_EGRESS",
  ].includes(node.kind));
  packet.materialCurrentness.hasProviderActivity = true;
  packet.materialCurrentness.firstProviderActivity = {
    status: "OBSERVED",
    receiptSha256: firstActivityNode.receiptSha256,
    observedAt: firstActivityNode.observedAt,
    phase: firstActivityNode.activityEvent.phase,
  };

  installGrant(packet, graph, "reference", nowMs, label);
  installGrant(packet, graph, "evaluated", nowMs, label);
  packet.sourceRights.status = "AUTHORIZED_FOR_PROVIDER_EGRESS";
  packet.sourceRights.providerEgressAuthorized = true;
  packet.sourceRights.credentialAccessAuthorized = true;
  packet.sourceRights.spendAuthorized = true;

  const refReconcile = nodeHash(graph, "REFERENCE_RECONCILIATION");
  const evalCanaryReconcile = nodeHash(graph, "EVALUATED_CANARY_RECONCILIATION");
  const evalRunReconcile = nodeHash(graph, "EVALUATED_RUN_RECONCILIATION");
  const summary = nodeHash(graph, "ACTIVITY_SUMMARY");
  packet.activity.reference = knownUsage("REFERENCE_LABELING", refReconcile, { reservations: 2, attempts: 2, completedCalls: 2, egress: 2, tokens: 500, costUsd: 0.5, peakConcurrency: 1 });
  packet.activity.evaluatedCanary = knownUsage("EVALUATED_CANARY", evalCanaryReconcile, { reservations: 1, attempts: 1, completedCalls: 1, egress: 1, tokens: 200, costUsd: 0.2, peakConcurrency: 1 });
  packet.activity.evaluatedRun = knownUsage("EVALUATED_RUN", evalRunReconcile, { reservations: 2, attempts: 2, completedCalls: 2, egress: 2, tokens: 700, costUsd: 0.7, peakConcurrency: 1 });
  packet.activity.attempts = { known: true, count: 5, receiptSha256: summary };
  packet.activity.completedCalls = { known: true, count: 5, receiptSha256: summary };
  packet.activity.egress = { known: true, count: 5, receiptSha256: summary };
  packet.activity.unknown = { present: false, categories: [], reconciliationReceiptSha256: summary };

  packet.result = {
    status: "SEALED",
    provenance: "natural-registered",
    scoreReceiptSha256: nodeHash(graph, "SCORE"),
    resultReceiptSha256: nodeHash(graph, "RESULT_SEAL"),
    currentBindingsSha256: canonicalDigest(packet.materialCurrentness.currentBindings),
    registeredInferenceFrameSha256: packet.registeredInferenceFrame.inferenceFrameSha256,
    resultConclusion: "INCONCLUSIVE_MACHINE_REFERENCE",
    metrics: {
      provenance: "natural-registered",
      metricsManifestSha256: hash(`${label}-result-metrics`),
      sampleSize: 6,
      successfulCount: 5,
      failedCount: 1,
    },
  };

  packet.independentReview.freeze = concurredReview(packet, graph, "freeze", "FREEZE_REVIEW");
  packet.independentReview.runner = concurredReview(packet, graph, "runner", "RUNNER_REVIEW");
  packet.independentReview.final = concurredReview(packet, graph, "final", "FINAL_REVIEW");
  packet.independentReview.claimBoundary = concurredReview(packet, graph, "claimBoundary", "CLAIM_REVIEW");
  packet.runner.independentReviewReceiptSha256 = packet.independentReview.runner.receiptSha256;

  packet.aggregateExport = {
    status: "EXPORTED",
    authorizationReceiptSha256: nodeHash(graph, "AGGREGATE_EXPORT_AUTHORIZATION"),
    exportReceiptSha256: nodeHash(graph, "AGGREGATE_EXPORT"),
    resultReceiptSha256: packet.result.resultReceiptSha256,
    claimBindingSha256: reviewBindings(packet, "claimBoundary"),
    metricsProvenance: "natural-registered",
    aggregateMetricsSha256: canonicalDigest({
      resultMetricsManifestSha256: packet.result.metrics.metricsManifestSha256,
      resultConclusion: packet.result.resultConclusion,
      sampleSize: packet.result.metrics.sampleSize,
      successfulCount: packet.result.metrics.successfulCount,
      failedCount: packet.result.metrics.failedCount,
    }),
    allowlistValidated: true,
    publicationAuthorized: true,
    protectedContentIncluded: false,
    itemIdentifiersIncluded: false,
    rawResponsesIncluded: false,
  };
  const expiresAt = packet.reference.grantBinding.expiresAt;
  packet.authority = {
    required: ["SOURCE_FREEZE_RIGHTS", "REFERENCE_PROVIDER_EXECUTION", "EVALUATED_PROVIDER_EXECUTION", "AGGREGATE_EXPORT"],
    proven: ["SOURCE_FREEZE_RIGHTS", "REFERENCE_PROVIDER_EXECUTION", "EVALUATED_PROVIDER_EXECUTION", "AGGREGATE_EXPORT"],
    missing: [],
    expiresAt,
  };
  packet.checks = [
    { id: "RECEIPT_GRAPH", status: "pass", evidenceRef: `sha256:${nodeHash(graph, "AGGREGATE_EXPORT")}` },
    { id: "MATERIAL_CURRENTNESS", status: "pass", evidenceRef: `sha256:${nodeHash(graph, "MATERIAL_CURRENTNESS")}` },
    { id: "ACTIVITY_RECONCILIATION", status: "pass", evidenceRef: `sha256:${summary}` },
    { id: "AGGREGATE_EXPORT_SAFETY", status: "pass", evidenceRef: `sha256:${nodeHash(graph, "AGGREGATE_EXPORT_AUTHORIZATION")}` },
  ];
  return refreshGraphBindings(packet);
}

const M3_ENTRIES = [
  "PROTOCOL_REGISTRATION", "PROTOCOL_ACTIVATION", "SOURCE_BASELINE", "SOURCE_RIGHTS",
  "FRAME_READINESS", "FRAME_FREEZE", "SAMPLE_FREEZE", "FREEZE_REVIEW",
  "RUNNER_REGISTRATION", "RUNNER_CLOSEOUT", "RUNNER_REVIEW",
  { kind: "REFERENCE_RECONCILIATION", activityEvent: event("REFERENCE_LABELING", "RECONCILIATION") },
  { kind: "EVALUATED_CANARY_RECONCILIATION", activityEvent: event("EVALUATED_CANARY", "RECONCILIATION") },
  { kind: "EVALUATED_RUN_RECONCILIATION", activityEvent: event("EVALUATED_RUN", "RECONCILIATION") },
  "ACTIVITY_SUMMARY", "MATERIAL_CURRENTNESS",
];

export function makeM3Packet(nowMs = Date.now()) {
  const label = "m3-fixture";
  const graph = makeGraph(M3_ENTRIES, nowMs, label);
  const packet = basePacket(graph, nowMs, label);
  packet.resolvedState = "RUNNER_INDEPENDENTLY_VERIFIED";
  packet.nextAllowedAction = "REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION";
  packet.authority = {
    required: ["SOURCE_FREEZE_RIGHTS"],
    proven: ["SOURCE_FREEZE_RIGHTS"],
    missing: [],
  };
  packet.blockers = ["AUTHORITY_MISSING", "ROUTE_AUTHENTICITY_UNPROVEN"];
  packet.independentReview.freeze = concurredReview(packet, graph, "freeze", "FREEZE_REVIEW");
  packet.independentReview.runner = concurredReview(packet, graph, "runner", "RUNNER_REVIEW");
  packet.runner.independentReviewReceiptSha256 = packet.independentReview.runner.receiptSha256;
  const refReceipt = nodeHash(graph, "REFERENCE_RECONCILIATION");
  const evalCanaryReceipt = nodeHash(graph, "EVALUATED_CANARY_RECONCILIATION");
  const evalRunReceipt = nodeHash(graph, "EVALUATED_RUN_RECONCILIATION");
  const summary = nodeHash(graph, "ACTIVITY_SUMMARY");
  const zero = { reservations: 0, attempts: 0, completedCalls: 0, egress: 0, tokens: 0, costUsd: 0, peakConcurrency: 0 };
  packet.activity.reference = knownUsage("REFERENCE_LABELING", refReceipt, zero);
  packet.activity.evaluatedCanary = knownUsage("EVALUATED_CANARY", evalCanaryReceipt, zero);
  packet.activity.evaluatedRun = knownUsage("EVALUATED_RUN", evalRunReceipt, zero);
  packet.activity.attempts = { known: true, count: 0, receiptSha256: summary };
  packet.activity.completedCalls = { known: true, count: 0, receiptSha256: summary };
  packet.activity.egress = { known: true, count: 0, receiptSha256: summary };
  packet.activity.unknown = { present: false, categories: [], reconciliationReceiptSha256: summary };
  packet.checks = [
    { id: "RECEIPT_GRAPH", status: "pass", evidenceRef: `sha256:${graph.at(-1).receiptSha256}` },
    { id: "MATERIAL_CURRENTNESS", status: "pass", evidenceRef: `sha256:${nodeHash(graph, "MATERIAL_CURRENTNESS")}` },
    { id: "ACTIVITY_RECONCILIATION", status: "pass", evidenceRef: `sha256:${summary}` },
  ];
  return refreshGraphBindings(packet);
}

const INTERRUPTED_BASE_ENTRIES = [
  "PROTOCOL_REGISTRATION", "PROTOCOL_ACTIVATION", "SOURCE_BASELINE", "SOURCE_RIGHTS",
  "FRAME_READINESS", "FRAME_FREEZE", "SAMPLE_FREEZE", "FREEZE_REVIEW",
  "RUNNER_REGISTRATION", "RUNNER_CLOSEOUT", "RUNNER_REVIEW", "REFERENCE_PREFLIGHT", "REFERENCE_ROUTE",
  "REFERENCE_AUTHORIZATION",
];

const REFERENCE_PREFIX_ORDER = ["RESERVATION", "ATTEMPT", "COMPLETION", "EGRESS"];

function interruptedReferenceEntry(eventType) {
  if (eventType === "RESERVATION") return { kind: "REFERENCE_RESERVATION", activityEvent: event("REFERENCE_LABELING", eventType, { reservationsDelta: 1 }) };
  if (eventType === "ATTEMPT") return { kind: "REFERENCE_ATTEMPT", activityEvent: event("REFERENCE_LABELING", eventType, { attemptsDelta: 1, concurrencyObserved: 1 }) };
  if (eventType === "COMPLETION") return { kind: "REFERENCE_COMPLETION", activityEvent: event("REFERENCE_LABELING", eventType, { completedCallsDelta: 1, tokensDelta: 1, costUsdDelta: 0.01 }) };
  if (eventType === "EGRESS") return { kind: "REFERENCE_EGRESS", activityEvent: event("REFERENCE_LABELING", eventType, { egressDelta: 1 }) };
  throw new TypeError("UNSUPPORTED_REFERENCE_PREFIX_EVENT");
}

export function makeUnknownActivityPacket(nowMs = Date.now(), { referencePrefix = ["RESERVATION"] } = {}) {
  if (!Array.isArray(referencePrefix)
      || referencePrefix.length < 1
      || referencePrefix.some((eventType, index) => eventType !== REFERENCE_PREFIX_ORDER[index])) {
    throw new TypeError("REFERENCE_PREFIX_MUST_BE_ORDERED_PREFIX");
  }
  const label = "interrupted-fixture";
  const graph = makeGraph([
    ...INTERRUPTED_BASE_ENTRIES,
    ...referencePrefix.map(interruptedReferenceEntry),
    "MATERIAL_CURRENTNESS",
  ], nowMs, label);
  const packet = basePacket(graph, nowMs, label);
  packet.mode = "RECOVER";
  packet.resolvedState = "INTERRUPTED_RECONCILIATION_REQUIRED";
  packet.nextAllowedAction = "RECONCILE_ACTIVITY_OFFLINE";
  packet.blockers = ["UNKNOWN_ACTIVITY"];
  packet.independentReview.freeze = concurredReview(packet, graph, "freeze", "FREEZE_REVIEW");
  packet.independentReview.runner = concurredReview(packet, graph, "runner", "RUNNER_REVIEW");
  packet.runner.independentReviewReceiptSha256 = packet.independentReview.runner.receiptSha256;
  installGrant(packet, graph, "reference", nowMs, label);
  packet.sourceRights.status = "AUTHORIZED_FOR_PROVIDER_EGRESS";
  packet.sourceRights.providerEgressAuthorized = true;
  packet.sourceRights.credentialAccessAuthorized = true;
  packet.sourceRights.spendAuthorized = true;
  const reservation = graphNode(graph, "REFERENCE_RESERVATION");
  packet.materialCurrentness.hasProviderActivity = true;
  packet.materialCurrentness.firstProviderActivity = {
    status: "OBSERVED",
    receiptSha256: reservation.receiptSha256,
    observedAt: reservation.observedAt,
    phase: "REFERENCE_LABELING",
  };
  packet.activity.reference = unknownUsage("REFERENCE_LABELING", "RESERVED");
  packet.activity.evaluatedCanary = unknownUsage("EVALUATED_CANARY");
  packet.activity.evaluatedRun = unknownUsage("EVALUATED_RUN");
  packet.activity.unknown = {
    present: true,
    categories: [],
    reconciliationReceiptSha256: null,
  };
  packet.activity.unknown.categories = deriveUnknownActivityCategories(packet);
  packet.authority = {
    required: ["SOURCE_FREEZE_RIGHTS", "REFERENCE_PROVIDER_EXECUTION"],
    proven: ["SOURCE_FREEZE_RIGHTS", "REFERENCE_PROVIDER_EXECUTION"],
    missing: [],
    expiresAt: packet.reference.grantBinding.expiresAt,
  };
  packet.checks = [
    { id: "RECEIPT_GRAPH", status: "pass", evidenceRef: `sha256:${graph.at(-1).receiptSha256}` },
    { id: "ACTIVITY_RECONCILIATION", status: "unknown", evidenceRef: `sha256:${reservation.receiptSha256}` },
  ];
  return refreshGraphBindings(packet);
}

const CUSTODY_BLOCKED_ENTRIES = [
  "PROTOCOL_REGISTRATION", "PROTOCOL_ACTIVATION", "SOURCE_BASELINE", "SOURCE_RIGHTS",
  "FRAME_READINESS", "FRAME_FREEZE", "SAMPLE_FREEZE", "FREEZE_REVIEW",
  "RUNNER_REGISTRATION", "RUNNER_CLOSEOUT", "RUNNER_REVIEW",
];

export function makeCustodyBlockedPacket(nowMs = Date.now()) {
  const label = "custody-blocked-fixture";
  const graph = makeGraph(CUSTODY_BLOCKED_ENTRIES, nowMs, label);
  const packet = basePacket(graph, nowMs, label, { differentCustody: true });
  packet.mode = "EXECUTE_OR_RESUME";
  packet.resolvedState = "BLOCKED_CUSTODY";
  packet.nextAllowedAction = "CREATE_CONTROLLED_CUSTODY_HANDOFF";
  packet.runner.custodyHandoff = requiredHandoff();
  packet.independentReview.freeze = concurredReview(packet, graph, "freeze", "FREEZE_REVIEW");
  packet.independentReview.runner = concurredReview(packet, graph, "runner", "RUNNER_REVIEW");
  packet.runner.independentReviewReceiptSha256 = packet.independentReview.runner.receiptSha256;
  packet.authority = {
    required: ["SOURCE_FREEZE_RIGHTS", "REFERENCE_PROVIDER_EXECUTION"],
    proven: ["SOURCE_FREEZE_RIGHTS"],
    missing: ["REFERENCE_PROVIDER_EXECUTION"],
  };
  packet.blockers = ["CUSTODY_HANDOFF_MISSING", "AUTHORITY_MISSING", "ROUTE_AUTHENTICITY_UNPROVEN"];
  packet.checks = [
    { id: "RECEIPT_GRAPH", status: "pass", evidenceRef: `sha256:${graph.at(-1).receiptSha256}` },
    { id: "CUSTODY", status: "blocked", evidenceRef: `sha256:${packet.sampleFreeze.custody.metadataReceiptSha256}` },
  ];
  return refreshGraphBindings(packet);
}

export function makeExecutionBlockedPacket(nowMs = Date.now()) {
  return makeCustodyBlockedPacket(nowMs);
}

export function makeUnregisteredPacket(nowMs = Date.now()) {
  const label = "unregistered-fixture";
  const packet = basePacket([], nowMs, label);
  packet.protocol.status = "UNREGISTERED";
  packet.protocol.logicalId = null;
  packet.protocol.registrationSha256 = null;
  packet.protocol.activationReceiptSha256 = null;
  packet.protocol.activePointerSha256 = null;
  packet.protocol.immutable = false;
  packet.sourceRights.status = "NOT_REVIEWED";
  packet.frame.status = "NOT_STARTED";
  packet.frame.runtimeVisibleScopeBound = false;
  packet.frame.syntheticExcluded = false;
  packet.sampleFreeze.status = "NOT_STARTED";
  packet.sampleFreeze.onePerCluster = false;
  packet.sampleFreeze.rerollForbidden = false;
  packet.runner.status = "NOT_STARTED";
  packet.runner.registrationSha256 = null;
  packet.runner.sourceCommit = null;
  packet.runner.sourceClosureSha256 = null;
  packet.runner.closeoutReceiptSha256 = null;
  packet.runner.independentReviewReceiptSha256 = null;
  packet.runner.reviewDecision = "NOT_REVIEWED";
  packet.runner.tracked = false;
  packet.runner.clean = false;
  packet.runner.custodyContextSha256 = null;
  packet.runner.custodyHandoff = noHandoff();
  packet.claimCeiling = "NO_EVALUATION_CLAIM";
  packet.protocol.registeredClaimCeiling = "NO_EVALUATION_CLAIM";
  packet.registeredInferenceFrame.registeredClaimCeiling = "NO_EVALUATION_CLAIM";
  packet.registeredInferenceFrame.inferenceFrameSha256 = canonicalDigest(
    Object.fromEntries(Object.entries(packet.registeredInferenceFrame)
      .filter(([key]) => key !== "inferenceFrameSha256")),
  );
  return refreshGraphBindings(packet);
}

export function makeSyntheticPacket(nowMs = Date.now()) {
  const packet = makeM3Packet(nowMs);
  packet.runProvenance = "synthetic-fixture";
  packet.claimCeiling = "NO_EVALUATION_CLAIM";
  packet.protocol.registeredClaimCeiling = "NO_EVALUATION_CLAIM";
  packet.registeredInferenceFrame.registeredClaimCeiling = "NO_EVALUATION_CLAIM";
  const { inferenceFrameSha256: ignored, ...framePayload } = packet.registeredInferenceFrame;
  packet.registeredInferenceFrame.inferenceFrameSha256 = canonicalDigest(framePayload);
  packet.result.status = "STRUCTURE_VALIDATED";
  packet.result.provenance = "synthetic-fixture";
  packet.result.metrics.provenance = "synthetic-fixture";
  packet.result.resultConclusion = "NO_EVALUATION_CLAIM";
  packet.blockers = ["SYNTHETIC_ONLY"];
  return refreshGraphBindings(packet);
}
