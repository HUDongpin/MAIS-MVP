import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NATURAL_LIFECYCLE_CONTRACT,
  bindingForReceiptNode,
  canonicalDigest,
  loadNaturalEvidenceSchema,
  validateNaturalEvidence,
} from "./verify-evidence-envelope.mjs";
import {
  clone,
  hash,
  makeClosedPacket,
  makeCustodyBlockedPacket,
  makeM3Packet,
  makeSyntheticPacket,
  makeUnregisteredPacket,
  makeUnknownActivityPacket,
  refreshEvidenceHashes,
  refreshGraphBindings,
  runScript,
  timestamp,
  withTempText,
} from "./test-fixtures.mjs";

function hasIssue(result, code) {
  return result.issues.some((entry) => entry.code === code);
}

const STANDALONE_SCHEMA_PATH = fileURLToPath(new URL("../assets/natural-evaluation-state.schema.json", import.meta.url));

function graphNode(packet, kind) {
  return packet.receiptGraph.find((node) => node.kind === kind);
}

function rechain(packet) {
  let parent = null;
  packet.receiptGraph.forEach((node, sequence) => {
    node.sequence = sequence;
    node.parentSha256 = parent;
    parent = node.receiptSha256;
  });
}

function moveGraphNodeBefore(packet, kind, beforeKind) {
  const from = packet.receiptGraph.findIndex((node) => node.kind === kind);
  const before = packet.receiptGraph.findIndex((node) => node.kind === beforeKind);
  assert.notEqual(from, -1, kind);
  assert.notEqual(before, -1, beforeKind);
  const [node] = packet.receiptGraph.splice(from, 1);
  const insertion = packet.receiptGraph.findIndex((entry) => entry.kind === beforeKind);
  packet.receiptGraph.splice(insertion, 0, node);

  const startMs = Date.parse(packet.receiptGraph[0].observedAt);
  packet.receiptGraph.forEach((entry, index) => {
    entry.observedAt = timestamp(startMs + index * 1_000);
  });
  const firstActivity = packet.receiptGraph.find((entry) => entry.activityEvent
    && entry.activityEvent.eventType !== "RECONCILIATION");
  packet.materialCurrentness.firstProviderActivity = {
    status: "OBSERVED",
    receiptSha256: firstActivity.receiptSha256,
    observedAt: firstActivity.observedAt,
    phase: firstActivity.activityEvent.phase,
  };
  refreshGraphBindings(packet);
}

function invalidatedRegistrations(packet) {
  return [
    packet.protocol.registrationSha256,
    packet.sampleFreeze.freezeReceiptSha256,
    packet.runner.registrationSha256,
  ];
}

function clearAggregateExport(packet) {
  packet.aggregateExport = {
    status: "NOT_REQUESTED",
    authorizationReceiptSha256: null,
    exportReceiptSha256: null,
    resultReceiptSha256: null,
    claimBindingSha256: null,
    metricsProvenance: "NONE",
    aggregateMetricsSha256: null,
    allowlistValidated: false,
    publicationAuthorized: false,
    protectedContentIncluded: false,
    itemIdentifiersIncluded: false,
    rawResponsesIncluded: false,
  };
  packet.authority.required = packet.authority.required.filter((code) => code !== "AGGREGATE_EXPORT");
  packet.authority.proven = packet.authority.proven.filter((code) => code !== "AGGREGATE_EXPORT");
  packet.authority.missing = packet.authority.missing.filter((code) => code !== "AGGREGATE_EXPORT");
  packet.checks = packet.checks.filter((check) => check.id !== "AGGREGATE_EXPORT_SAFETY");
}

function emptyActivityPhase(phase) {
  const metric = () => ({ known: false, value: null, receiptSha256: null });
  return {
    phase,
    status: "NOT_STARTED",
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

function resetPreProviderActivity(packet) {
  packet.materialCurrentness.currentnessReceiptSha256 = null;
  packet.materialCurrentness.hasProviderActivity = false;
  packet.materialCurrentness.firstProviderActivity = {
    status: "NONE",
    receiptSha256: null,
    observedAt: null,
    phase: "NONE",
  };
  packet.activity = {
    attempts: { known: false, count: null, receiptSha256: null },
    completedCalls: { known: false, count: null, receiptSha256: null },
    egress: { known: false, count: null, receiptSha256: null },
    reference: emptyActivityPhase("REFERENCE_LABELING"),
    evaluatedCanary: emptyActivityPhase("EVALUATED_CANARY"),
    evaluatedRun: emptyActivityPhase("EVALUATED_RUN"),
    summaryReceiptSha256: null,
    unknown: { present: false, categories: [], reconciliationReceiptSha256: null },
  };
}

function blockedReviewProjection() {
  return {
    status: "BLOCKED",
    receiptSha256: null,
    signatureStatus: "MISSING",
    identityAnchorSha256: null,
    reviewedBindingsSha256: null,
  };
}

function makeLateReviewOutcomePacket(name, outcome, nowMs = Date.now(), { signed = true } = {}) {
  const kind = name === "final" ? "FINAL_REVIEW" : "CLAIM_REVIEW";
  const packet = makeClosedPacket(nowMs);
  const reviewIndex = packet.receiptGraph.findIndex((node) => node.kind === kind);
  packet.receiptGraph = packet.receiptGraph.slice(0, reviewIndex + (signed ? 1 : 0));
  packet.independentReview[name] = signed
    ? { ...packet.independentReview[name], status: outcome }
    : blockedReviewProjection();
  if (name === "final") {
    packet.independentReview.claimBoundary = {
      status: "PENDING",
      receiptSha256: null,
      signatureStatus: "MISSING",
      identityAnchorSha256: null,
      reviewedBindingsSha256: null,
    };
  }
  clearAggregateExport(packet);
  packet.resolvedState = "UNREVIEWABLE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["INDEPENDENT_REVIEW_MISSING"];
  return refreshGraphBindings(packet);
}

function makeEarlyReviewOutcomePacket(name, outcome, nowMs = Date.now(), { signed = true } = {}) {
  const kind = name === "freeze" ? "FREEZE_REVIEW" : "RUNNER_REVIEW";
  const packet = makeM3Packet(nowMs);
  const reviewIndex = packet.receiptGraph.findIndex((node) => node.kind === kind);
  packet.receiptGraph = packet.receiptGraph.slice(0, reviewIndex + (signed ? 1 : 0));
  resetPreProviderActivity(packet);
  packet.independentReview[name] = signed
    ? { ...packet.independentReview[name], status: outcome }
    : blockedReviewProjection();
  packet.independentReview.final = {
    status: "PENDING", receiptSha256: null, signatureStatus: "MISSING",
    identityAnchorSha256: null, reviewedBindingsSha256: null,
  };
  packet.independentReview.claimBoundary = clone(packet.independentReview.final);

  if (name === "freeze") {
    packet.sampleFreeze.status = "FROZEN";
    packet.independentReview.runner = clone(packet.independentReview.final);
    packet.runner = {
      ...packet.runner,
      status: "NOT_STARTED",
      registrationSha256: null,
      sourceCommit: null,
      sourceClosureSha256: null,
      closeoutReceiptSha256: null,
      independentReviewReceiptSha256: null,
      reviewDecision: "NOT_REVIEWED",
      tracked: false,
      clean: false,
      custodyContextSha256: null,
    };
    for (const bindings of [packet.materialCurrentness.registeredBindings, packet.materialCurrentness.currentBindings]) {
      bindings.runnerRegistrationSha256 = null;
      bindings.runnerClosureSha256 = null;
      bindings.runnerCommit = null;
    }
    packet.registeredInferenceFrame.runnerClosureSha256 = null;
    packet.registeredInferenceFrame.runnerCommit = null;
  } else {
    packet.runner.status = "CLOSEOUT_RECORDED";
    packet.runner.reviewDecision = outcome;
    packet.runner.independentReviewReceiptSha256 = signed
      ? packet.independentReview.runner.receiptSha256
      : null;
  }

  packet.resolvedState = "UNREVIEWABLE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["INDEPENDENT_REVIEW_MISSING"];
  packet.checks = [{
    id: "RECEIPT_GRAPH",
    status: "pass",
    evidenceRef: `sha256:${packet.receiptGraph.at(-1).receiptSha256}`,
  }];
  return refreshGraphBindings(packet);
}

test("accepts a closed, fully bound, independently reviewed natural packet", async () => {
  const nowMs = Date.now();
  const result = await validateNaturalEvidence(makeClosedPacket(nowMs), { nowMs });
  assert.equal(result.result, "valid", JSON.stringify(result.issues));
  assert.equal(result.lifecycleState, "CLOSED");
  assert.equal(result.effectiveState, "CLOSED");
});

test("public EvidenceEnvelopeV1 definitions preserve suite parity exactly", async () => {
  const schema = await loadNaturalEvidenceSchema();
  assert.deepEqual(schema.$defs.dateTime, {
    type: "string",
    format: "date-time",
    pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
  });
  assert.deepEqual(schema.$defs.repository, {
    type: "object",
    additionalProperties: false,
    required: ["head", "branch", "clean"],
    properties: {
      head: { type: ["string", "null"], pattern: "^[a-f0-9]{40}$" },
      branch: {
        type: ["string", "null"],
        minLength: 1,
        maxLength: 200,
        pattern: "^[A-Za-z0-9][A-Za-z0-9._/-]*$",
      },
      clean: { type: ["boolean", "null"] },
    },
  });
  assert.deepEqual(schema.$defs.sourceIdentity.required, ["logicalId"]);
  assert.equal(schema.$defs.sourceIdentity.additionalProperties, false);
  assert.deepEqual(schema.$defs.authority.required, ["required", "proven", "missing"]);
  assert.equal(schema.$defs.authority.additionalProperties, false);
  assert.deepEqual(schema.$defs.check.required, ["id", "status"]);
  assert.equal(schema.$defs.check.additionalProperties, false);
  assert.deepEqual(schema.$defs.redaction, {
    type: "object",
    additionalProperties: false,
    required: ["protectedContentIncluded", "credentialsIncluded", "rawProviderResponsesIncluded"],
    properties: {
      protectedContentIncluded: { const: false },
      credentialsIncluded: { const: false },
      rawProviderResponsesIncluded: { const: false },
    },
  });
  assert.deepEqual(schema.properties.evidenceClass, { type: "string", const: "natural-sample-evaluation" });
  assert.deepEqual(schema.properties.mode.enum, [
    "AUDIT_STATUS", "DESIGN_OR_FREEZE", "PROVIDER_PREFLIGHT",
    "EXECUTE_OR_RESUME", "RECOVER", "SCORE_REVIEW_EXPORT",
  ]);
  for (const field of ["skill", "mode", "evidenceClass", "resolvedState", "claimCeiling", "nextAllowedAction"]) {
    assert.equal(schema.properties[field].type, "string", `${field} must retain explicit common string type`);
  }
});

test("A: ProviderGrantBindingV1 is closed and includes exact scope, identity, time, cap, and receipt fields", async () => {
  const schema = await loadNaturalEvidenceSchema();
  const grant = schema.$defs.providerGrantBinding;
  assert.equal(grant.additionalProperties, false);
  assert.deepEqual(grant.properties.role.enum, ["REFERENCE_PROVIDER", "EVALUATED_PROVIDER"]);
  for (const field of [
    "providerAdapterId", "modelId", "routeAnchorSha256", "phase", "credentialScopeSha256",
    "privacyRightsScopeSha256", "savePolicy", "redactionPolicy", "protocolRegistrationSha256",
    "sampleManifestSha256", "runnerRegistrationSha256", "runnerClosureSha256", "runnerCommit",
    "issuedAt", "expiresAt", "caps", "grantReceiptSha256",
  ]) assert.ok(grant.required.includes(field), field);
  assert.deepEqual(grant.properties.caps.$ref, "#/$defs/providerCaps");
  assert.equal(schema.$defs.providerCaps.properties.concurrencyCap.minimum, 1);
});

test("A: provider, source-rights, and authorization-node grant tuples must be identical", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.sourceRights.referenceGrantBinding.modelId = `model-probe-${hash("grant-three-way-probe").slice(0, 16)}`;
  refreshEvidenceHashes(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "PROVIDER_GRANT_THREE_WAY_MISMATCH"));
});

test("A: route, runner, sample, receipt, and cap mutations cannot retain authorization", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.reference.grantBinding.runnerClosureSha256 = hash("wrong-runner-closure");
  packet.sourceRights.referenceGrantBinding = clone(packet.reference.grantBinding);
  const node = graphNode(packet, "REFERENCE_AUTHORIZATION");
  node.providerGrantBinding = clone(packet.reference.grantBinding);
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "PROVIDER_GRANT_BINDING_MISMATCH"));
});

test("A/H: grant freshness is derived and an expired grant blocks even AUDIT_STATUS", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.mode = "AUDIT_STATUS";
  packet.resolvedState = "BLOCKED_AUTHORITY";
  packet.nextAllowedAction = "RENEW_PROVIDER_GRANT";
  const stale = timestamp(nowMs - 1_000);
  for (const name of ["reference", "evaluated"]) {
    packet[name].grantBinding.expiresAt = stale;
    packet.sourceRights[`${name}GrantBinding`] = clone(packet[name].grantBinding);
    const node = graphNode(packet, name === "reference" ? "REFERENCE_AUTHORIZATION" : "EVALUATED_AUTHORIZATION");
    node.providerGrantBinding = clone(packet[name].grantBinding);
    node.expiresAt = stale;
  }
  packet.authority.expiresAt = stale;
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.effectiveState, "BLOCKED_AUTHORITY");
  assert.ok(hasIssue(result, "PROVIDER_GRANT_STALE"));
  assert.ok(hasIssue(result, "AUTHORITY_EXPIRED"));
});

test("A: grantFresh cannot be self-reported", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.reference.grantFresh = true;
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "SCHEMA_UNKNOWN_PROPERTY"));
});

test("A: EXECUTE requires an explicit nonempty authority partition", async () => {
  const nowMs = Date.now();
  const packet = makeUnknownActivityPacket(nowMs);
  packet.mode = "EXECUTE_OR_RESUME";
  packet.authority.required = [];
  packet.authority.proven = [];
  packet.authority.missing = [];
  refreshEvidenceHashes(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "EXECUTION_AUTHORITY_REQUIRED_EMPTY"));
});

test("A: PROVIDER_PREFLIGHT cannot authorize natural-text egress", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.mode = "PROVIDER_PREFLIGHT";
  packet.reference.naturalTextEgressAuthorized = true;
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "PREFLIGHT_NATURAL_TEXT_EGRESS_FORBIDDEN"));
});

test("B: every graph node is subject- and binding-digest-bound", async () => {
  const nowMs = Date.now();
  const digestPacket = makeClosedPacket(nowMs);
  graphNode(digestPacket, "SAMPLE_FREEZE").bindingDigestSha256 = hash("unbound-sample");
  assert.ok(hasIssue(await validateNaturalEvidence(digestPacket, { nowMs }), "GRAPH_BINDING_DIGEST_MISMATCH"));

  const subjectPacket = makeClosedPacket(nowMs);
  graphNode(subjectPacket, "SAMPLE_FREEZE").subject = "RUNNER";
  assert.ok(hasIssue(await validateNaturalEvidence(subjectPacket, { nowMs }), "GRAPH_SUBJECT_MISMATCH"));
});

test("B: top-level receipts must equal their active graph nodes", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.sampleFreeze.freezeReceiptSha256 = hash("wrong-sample-freeze-receipt");
  refreshEvidenceHashes(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "RECEIPT_TOP_LEVEL_MISMATCH"));
});

test("B/G: truncated graph with residual CLOSED fields is invalid", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.receiptGraph.pop();
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "RECEIPT_WITHOUT_ACTIVE_NODE"));
  assert.ok(hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"));
});

test("B/G: full graph with NOT_STARTED status is invalid", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.evaluated.status = "NOT_STARTED";
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"));
});

test("B/G: invalid terminal status projection can never report CLOSED or CLOSE", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.reference.status = "NOT_STARTED";

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.notEqual(result.effectiveState, "CLOSED");
  assert.notEqual(result.nextAllowedAction, "CLOSE");
  assert.ok(hasIssue(result, "REFERENCE_NOT_SEALED"));
});

test("B/G: any terminal schema failure resolves to a non-advancing safe state", async () => {
  const packet = makeClosedPacket();
  packet.unrecognizedTerminalAuthority = "CLOSE_ANYWAY";

  const result = await validateNaturalEvidence(packet);
  assert.equal(result.result, "invalid");
  assert.equal(result.effectiveState, "INVALID_HASH_OR_SIGNATURE");
  assert.equal(result.nextAllowedAction, "STOP_BLOCKED");
});

test("B/G: a NOT_STARTED top level cannot retain non-receipt future artifacts", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.result.currentBindingsSha256 = hash("residual-future-result-binding");
  refreshEvidenceHashes(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "RESULT_FUTURE_FIELDS_PRESENT"));
});

test("B: direct-parent and milestone-prefix drift cannot pass", async () => {
  const nowMs = Date.now();
  const parentPacket = makeClosedPacket(nowMs);
  parentPacket.receiptGraph[5].parentSha256 = parentPacket.receiptGraph[1].receiptSha256;
  assert.ok(hasIssue(await validateNaturalEvidence(parentPacket, { nowMs }), "GRAPH_DIRECT_PARENT_MISMATCH"));

  const prefixPacket = makeClosedPacket(nowMs);
  const first = prefixPacket.receiptGraph.findIndex((node) => node.kind === "FRAME_READINESS");
  const second = prefixPacket.receiptGraph.findIndex((node) => node.kind === "FRAME_FREEZE");
  [prefixPacket.receiptGraph[first], prefixPacket.receiptGraph[second]] = [prefixPacket.receiptGraph[second], prefixPacket.receiptGraph[first]];
  rechain(prefixPacket);
  refreshGraphBindings(prefixPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(prefixPacket, { nowMs }), "GRAPH_MILESTONE_PREFIX_INVALID"));
});

test("B: every receipt identity is the canonical content address of a closed receiptBody", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  for (const node of packet.receiptGraph) {
    assert.equal(node.receiptSha256, canonicalDigest(node.receiptBody), node.kind);
    assert.equal(node.receiptBody.directParentSha256, node.parentSha256, node.kind);
    assert.equal(node.receiptBody.bindingDigestSha256, node.bindingDigestSha256, node.kind);
    assert.equal(node.receiptBody.kind, node.kind, node.kind);
    assert.equal(node.receiptBody.subject, node.subject, node.kind);
    assert.equal(Object.prototype.hasOwnProperty.call(node.receiptBody, "bindingProjectionCanonical"), true);
  }

  const tampered = makeClosedPacket(nowMs);
  graphNode(tampered, "RESULT_SEAL").receiptBody.status = "SCORED";
  const result = await validateNaturalEvidence(tampered, { nowMs });
  assert.ok(hasIssue(result, "GRAPH_RECEIPT_BODY_MISMATCH"));
  assert.ok(hasIssue(result, "GRAPH_RECEIPT_CONTENT_ADDRESS_MISMATCH"));
});

test("B: grant, material, prompt, reviewer, metrics, and export semantics cannot retain an old receipt identity", async () => {
  const nowMs = Date.now();
  const probes = [
    (packet) => {
      packet.reference.grantBinding.modelId = `model-mutated-${hash("grant-model").slice(0, 16)}`;
      packet.sourceRights.referenceGrantBinding = clone(packet.reference.grantBinding);
      graphNode(packet, "REFERENCE_AUTHORIZATION").providerGrantBinding = clone(packet.reference.grantBinding);
    },
    (packet) => { packet.frame.manifestSha256 = hash("mutated-material-manifest"); },
    (packet) => {
      packet.materialCurrentness.registeredBindings.promptManifestSha256 = hash("mutated-prompt");
      packet.materialCurrentness.currentBindings.promptManifestSha256 = packet.materialCurrentness.registeredBindings.promptManifestSha256;
    },
    (packet) => { packet.independentReview.final.reviewedBindingsSha256 = hash("mutated-review-projection"); },
    (packet) => { packet.result.metrics.metricsManifestSha256 = hash("mutated-metrics-projection"); },
    (packet) => { packet.aggregateExport.allowlistValidated = false; },
  ];
  for (const mutate of probes) {
    const packet = makeClosedPacket(nowMs);
    mutate(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(hasIssue(result, "GRAPH_RECEIPT_BODY_MISMATCH") || hasIssue(result, "GRAPH_BINDING_DIGEST_MISMATCH"), JSON.stringify(result.issues));
  }
});

test("B: a semantic revision creates a new immutable receipt and updates every downstream parent", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const before = new Map(packet.receiptGraph.map((node) => [node.kind, node.receiptSha256]));
  const prompt = hash("new-registered-prompt-projection");
  packet.materialCurrentness.registeredBindings.promptManifestSha256 = prompt;
  packet.materialCurrentness.currentBindings.promptManifestSha256 = prompt;
  packet.registeredInferenceFrame.promptManifestSha256 = prompt;
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "valid", JSON.stringify(result.issues));
  assert.equal(graphNode(packet, "PROTOCOL_REGISTRATION").receiptSha256, before.get("PROTOCOL_REGISTRATION"));
  assert.notEqual(graphNode(packet, "FREEZE_REVIEW").receiptSha256, before.get("FREEZE_REVIEW"));
  assert.notEqual(graphNode(packet, "AGGREGATE_EXPORT").receiptSha256, before.get("AGGREGATE_EXPORT"));
});

test("C: pre-activity material drift requires re-freeze and invalidates old reviews", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.materialCurrentness.currentBindings.promptManifestSha256 = hash("new-prompt-before-activity");
  packet.materialCurrentness.status = "PRE_ACTIVITY_DRIFT";
  packet.materialCurrentness.invalidatedRegistrationReceipts = invalidatedRegistrations(packet);
  packet.resolvedState = "MATERIAL_REFREEZE_REQUIRED";
  packet.nextAllowedAction = "FREEZE_FRAME_AND_SAMPLE";
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.effectiveState, "MATERIAL_REFREEZE_REQUIRED");
  assert.ok(hasIssue(result, "MATERIAL_BINDING_DRIFT"));
  assert.ok(hasIssue(result, "CURRENTNESS_STALE_ARTIFACT_REUSE"));
});

test("C: post-activity drift resolves only to NEW_REGISTRATION_REQUIRED", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.materialCurrentness.currentBindings.taxonomySha256 = hash("new-taxonomy-after-activity");
  packet.materialCurrentness.status = "POST_ACTIVITY_DRIFT";
  packet.materialCurrentness.invalidatedRegistrationReceipts = invalidatedRegistrations(packet);
  packet.resolvedState = "NEW_REGISTRATION_REQUIRED";
  packet.nextAllowedAction = "CREATE_NEW_REGISTRATION";
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.effectiveState, "NEW_REGISTRATION_REQUIRED");
  assert.ok(hasIssue(result, "CURRENTNESS_STALE_ARTIFACT_REUSE"));
  assert.ok(hasIssue(result, "PROVIDER_GRANT_STALE"));
});

test("C: first provider activity and invalidation receipts are derived, not self-reported", async () => {
  const nowMs = Date.now();
  const activityPacket = makeUnknownActivityPacket(nowMs);
  activityPacket.materialCurrentness.firstProviderActivity.receiptSha256 = hash("wrong-first-activity");
  refreshGraphBindings(activityPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(activityPacket, { nowMs }), "CURRENTNESS_FIRST_ACTIVITY_MISMATCH"));

  const driftPacket = makeM3Packet(nowMs);
  driftPacket.materialCurrentness.currentBindings.scorerSha256 = hash("new-scorer");
  driftPacket.materialCurrentness.status = "PRE_ACTIVITY_DRIFT";
  driftPacket.materialCurrentness.invalidatedRegistrationReceipts = [];
  driftPacket.resolvedState = "MATERIAL_REFREEZE_REQUIRED";
  driftPacket.nextAllowedAction = "FREEZE_FRAME_AND_SAMPLE";
  refreshGraphBindings(driftPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(driftPacket, { nowMs }), "CURRENTNESS_INVALIDATION_INCOMPLETE"));
});

test("D: custody need is derived from context inequality and missing handoff is blocked", async () => {
  const nowMs = Date.now();
  const result = await validateNaturalEvidence(makeCustodyBlockedPacket(nowMs), { nowMs });
  assert.equal(result.result, "blocked");
  assert.equal(result.effectiveState, "BLOCKED_CUSTODY");
  assert.ok(hasIssue(result, "CUSTODY_HANDOFF_REQUIRED"));
});

test("D: custody handoff is sequenced after exact runner registration, closure, and review", () => {
  const kinds = NATURAL_LIFECYCLE_CONTRACT.map(([kind]) => kind);
  assert.ok(kinds.indexOf("CUSTODY_HANDOFF") > kinds.indexOf("RUNNER_REVIEW"));
  assert.ok(kinds.indexOf("CUSTODY_HANDOFF") < kinds.indexOf("REFERENCE_PREFLIGHT"));
});

test("D: handoff binds exact sample, runner closure, roles, method, modes, symlinks, signature, and active receipt", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.runner.custodyHandoff.sampleManifestSha256 = hash("wrong-handoff-sample");
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "CUSTODY_HANDOFF_BINDING_MISMATCH"));
});

test("D: a handoff is forbidden when sample and runner custody contexts are equal", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.runner.custodyContextSha256 = packet.sampleFreeze.custody.custodyContextSha256;
  packet.materialCurrentness.registeredBindings.runnerClosureSha256 = packet.runner.sourceClosureSha256;
  packet.materialCurrentness.currentBindings = clone(packet.materialCurrentness.registeredBindings);
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "CUSTODY_HANDOFF_UNEXPECTED"));
  assert.ok(hasIssue(result, "GRAPH_KIND_NOT_IN_ACTIVE_LIFECYCLE"));
});

test("E: known activity requires a current summary receipt; unknown remains null", async () => {
  const nowMs = Date.now();
  const knownPacket = makeClosedPacket(nowMs);
  knownPacket.activity.attempts.receiptSha256 = hash("stale-activity-summary");
  refreshGraphBindings(knownPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(knownPacket, { nowMs }), "ACTIVITY_SUMMARY_COUNTER_MISMATCH"));

  const unknownPacket = makeUnknownActivityPacket(nowMs);
  unknownPacket.activity.attempts.count = 0;
  refreshGraphBindings(unknownPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(unknownPacket, { nowMs }), "ACTIVITY_COUNTER_WITHOUT_SUMMARY"));
});

test("E: known zero is accepted only through current phase reconciliations and summary", async () => {
  const nowMs = Date.now();
  const valid = await validateNaturalEvidence(makeM3Packet(nowMs), { nowMs });
  assert.equal(valid.result, "blocked");
  assert.ok(!hasIssue(valid, "ACTIVITY_RECONCILED_METRIC_MISMATCH"));

  const packet = makeM3Packet(nowMs);
  packet.activity.reference.reconciliationReceiptSha256 = null;
  for (const key of ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd", "peakConcurrency"]) {
    packet.activity.reference[key].receiptSha256 = null;
  }
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "RECEIPT_TOP_LEVEL_MISMATCH"));
  assert.ok(hasIssue(result, "ACTIVITY_RECONCILIATION_RECEIPT_MISMATCH"));
});

test("E: per-phase attempts, egress, tokens, USD, and concurrency cannot exceed grant caps", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  graphNode(packet, "REFERENCE_RESERVATION").activityEvent.reservationsDelta = 9;
  graphNode(packet, "REFERENCE_ATTEMPT").activityEvent.attemptsDelta = 9;
  graphNode(packet, "REFERENCE_COMPLETION").activityEvent.completedCallsDelta = 9;
  graphNode(packet, "REFERENCE_EGRESS").activityEvent.egressDelta = 9;
  for (const key of ["reservations", "attempts", "completedCalls", "egress"]) packet.activity.reference[key].value = 9;
  packet.activity.attempts.count = 11;
  packet.activity.completedCalls.count = 11;
  packet.activity.egress.count = 11;
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "ACTIVITY_CAP_EXCEEDED"));
});

test("E: evaluated canary and full-run usage share one aggregate grant cap", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.evaluated.grantBinding.caps.attemptCap = 2;
  packet.sourceRights.evaluatedGrantBinding = clone(packet.evaluated.grantBinding);
  graphNode(packet, "EVALUATED_AUTHORIZATION").providerGrantBinding = clone(packet.evaluated.grantBinding);
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "blocked");
  assert.ok(hasIssue(result, "ACTIVITY_CAP_EXCEEDED"));
  assert.notEqual(result.effectiveState, "CLOSED");
});

test("E: a terminal cap violation cannot retain CLOSED or CLOSE", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.evaluated.grantBinding.caps.attemptCap = 2;
  packet.sourceRights.evaluatedGrantBinding = clone(packet.evaluated.grantBinding);
  graphNode(packet, "EVALUATED_AUTHORIZATION").providerGrantBinding = clone(packet.evaluated.grantBinding);
  packet.resolvedState = "BLOCKED_SEQUENCE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["CAP_EXCEEDED"];
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "blocked");
  assert.equal(result.lifecycleState, "CLOSED");
  assert.equal(result.effectiveState, "BLOCKED_SEQUENCE");
  assert.ok(hasIssue(result, "ACTIVITY_CAP_EXCEEDED"));
});

test("E: terminal declared blockers and non-passing checks cannot retain CLOSED or CLOSE", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.blockers = ["MISSING_EVIDENCE"];
  packet.checks[0].status = "blocked";
  packet.resolvedState = "BLOCKED_MISSING_EVIDENCE";
  packet.nextAllowedAction = "SUPPLY_MISSING_EVIDENCE";
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "blocked");
  assert.equal(result.effectiveState, "BLOCKED_MISSING_EVIDENCE");
  assert.ok(!hasIssue(result, "RESOLVED_STATE_GRAPH_MISMATCH"));
  assert.ok(!hasIssue(result, "NEXT_ACTION_MISMATCH"));
});

test("E: mutating one packet's activity events cannot contaminate later immutable fixtures", () => {
  const nowMs = Date.now();
  const first = makeClosedPacket(nowMs);
  graphNode(first, "REFERENCE_RESERVATION").activityEvent.reservationsDelta = 99;
  graphNode(first, "REFERENCE_ATTEMPT").activityEvent.attemptsDelta = 99;

  const second = makeClosedPacket(nowMs);
  assert.equal(graphNode(second, "REFERENCE_RESERVATION").activityEvent.reservationsDelta, 2);
  assert.equal(graphNode(second, "REFERENCE_ATTEMPT").activityEvent.attemptsDelta, 2);
});

test("E: reservation-only interruption stays unknown and RECOVER permits only offline reconciliation", async () => {
  const nowMs = Date.now();
  const packet = makeUnknownActivityPacket(nowMs);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.effectiveState, "INTERRUPTED_RECONCILIATION_REQUIRED");
  assert.equal(packet.activity.attempts.count, null);
  assert.ok(packet.activity.unknown.categories.includes("ATTEMPT_RESERVATION_ONLY"));

  packet.nextAllowedAction = "RESUME_EVALUATED_RUN";
  const wrong = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(wrong, "RECOVER_OFFLINE_ACTION_REQUIRED"));
});

test("E: unknown activity categories are the exact packet-derived reservation-only dimensions", async () => {
  const nowMs = Date.now();
  const expected = [
    "ATTEMPT_RESERVATION_ONLY",
    "PROVIDER_DELIVERY_UNKNOWN",
    "COMPLETION_UNKNOWN",
    "EGRESS_UNKNOWN",
    "TOKEN_USAGE_UNKNOWN",
    "COST_UNKNOWN",
    "CONCURRENCY_UNKNOWN",
  ];
  const packet = makeUnknownActivityPacket(nowMs);
  assert.deepEqual(packet.activity.unknown.categories, expected);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(!hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_INCOMPLETE"));
  assert.ok(!hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED"));
});

test("E: an attempted but unreconciled prefix derives unknown dimensions without reservation-only", async () => {
  const nowMs = Date.now();
  const packet = makeUnknownActivityPacket(nowMs, { referencePrefix: ["RESERVATION", "ATTEMPT"] });
  assert.deepEqual(packet.activity.unknown.categories, [
    "PROVIDER_DELIVERY_UNKNOWN",
    "COMPLETION_UNKNOWN",
    "EGRESS_UNKNOWN",
    "TOKEN_USAGE_UNKNOWN",
    "COST_UNKNOWN",
    "CONCURRENCY_UNKNOWN",
  ]);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(!hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_INCOMPLETE"));
  assert.ok(!hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED"));
});

test("E: deleting any packet-derived unknown category fails with one closed issue code", async (context) => {
  const nowMs = Date.now();
  const valid = makeUnknownActivityPacket(nowMs);
  for (const category of valid.activity.unknown.categories) {
    await context.test(category, async () => {
      const packet = clone(valid);
      packet.activity.unknown.categories = packet.activity.unknown.categories.filter((entry) => entry !== category);
      refreshGraphBindings(packet);
      const result = await validateNaturalEvidence(packet, { nowMs });
      assert.ok(hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_INCOMPLETE"));
    });
  }
});

test("E: unsupported or packet-inapplicable unknown categories fail closed", async () => {
  const nowMs = Date.now();
  const inapplicable = makeUnknownActivityPacket(nowMs, { referencePrefix: ["RESERVATION", "ATTEMPT"] });
  inapplicable.activity.unknown.categories.push("ATTEMPT_RESERVATION_ONLY");
  refreshGraphBindings(inapplicable);
  assert.ok(hasIssue(
    await validateNaturalEvidence(inapplicable, { nowMs }),
    "ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED",
  ));

  const unsupported = makeUnknownActivityPacket(nowMs);
  unsupported.activity.unknown.categories.push("FUTURE_UNKNOWN_CATEGORY");
  refreshGraphBindings(unsupported);
  const result = await validateNaturalEvidence(unsupported, { nowMs });
  assert.ok(hasIssue(result, "ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED"));
  assert.ok(result.issues.some((entry) => entry.code.startsWith("SCHEMA_")));
});

test("E: reconciliation must follow every phase event", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const egressIndex = packet.receiptGraph.findIndex((node) => node.kind === "REFERENCE_EGRESS");
  const reconcileIndex = packet.receiptGraph.findIndex((node) => node.kind === "REFERENCE_RECONCILIATION");
  [packet.receiptGraph[egressIndex], packet.receiptGraph[reconcileIndex]] = [packet.receiptGraph[reconcileIndex], packet.receiptGraph[egressIndex]];
  rechain(packet);
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "ACTIVITY_RECONCILIATION_NOT_CURRENT"));
  assert.ok(hasIssue(result, "ACTIVITY_CAUSAL_PREFIX_INVALID"));
});

test("E: each activity phase enforces causal counter invariants at every receipt prefix", async () => {
  const nowMs = Date.now();
  for (const [kind, beforeKind] of [
    ["REFERENCE_ATTEMPT", "REFERENCE_RESERVATION"],
    ["REFERENCE_COMPLETION", "REFERENCE_ATTEMPT"],
    ["REFERENCE_EGRESS", "REFERENCE_ATTEMPT"],
  ]) {
    const packet = makeClosedPacket(nowMs);
    moveGraphNodeBefore(packet, kind, beforeKind);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(
      hasIssue(result, "ACTIVITY_CAUSAL_PREFIX_INVALID"),
      `${kind} before ${beforeKind}: ${JSON.stringify(result.issues)}`,
    );
  }
});

test("E: deleting positive phase receipts cannot preserve provider terminal milestones", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const removed = new Set(["REFERENCE_RESERVATION", "REFERENCE_ATTEMPT", "REFERENCE_COMPLETION", "REFERENCE_EGRESS"]);
  packet.receiptGraph = packet.receiptGraph.filter((node) => !removed.has(node.kind));
  for (const key of ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd", "peakConcurrency"]) packet.activity.reference[key].value = 0;
  packet.activity.attempts.count = 2;
  packet.activity.completedCalls.count = 2;
  packet.activity.egress.count = 2;
  const first = graphNode(packet, "EVALUATED_CANARY_RESERVATION");
  packet.materialCurrentness.firstProviderActivity = { status: "OBSERVED", receiptSha256: first.receiptSha256, observedAt: first.observedAt, phase: "EVALUATED_CANARY" };
  rechain(packet);
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "PROVIDER_TERMINAL_ACTIVITY_PROOF_INCOMPLETE"));
});

test("E: canary-only evaluated activity cannot satisfy EVALUATED_RUN or later milestones", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const fullRunKinds = new Set([
    "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION",
    "EVALUATED_RUN_EGRESS", "EVALUATED_RUN_RECONCILIATION",
  ]);
  packet.receiptGraph = packet.receiptGraph.filter((node) => !fullRunKinds.has(node.kind));
  packet.activity.evaluatedRun = emptyActivityPhase("EVALUATED_RUN");
  for (const key of ["attempts", "completedCalls", "egress"]) packet.activity[key].count = 3;
  rechain(packet);
  refreshGraphBindings(packet);
  const canary = graphNode(packet, "EVALUATED_CANARY");
  const run = graphNode(packet, "EVALUATED_RUN");
  for (const forbiddenMilestone of [
    "EVALUATED_RUN", "SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT",
  ]) assert.ok(graphNode(packet, forbiddenMilestone), forbiddenMilestone);
  const evaluatedActivityAfterCanary = packet.receiptGraph.filter((node) =>
    node.activityEvent?.phase === "EVALUATED_RUN"
      && node.sequence > canary.sequence
      && node.sequence < run.sequence);

  assert.equal(evaluatedActivityAfterCanary.length, 0, "fixture demonstrates the canary/full-run evidence collapse");
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "EVALUATED_FULL_RUN_ACTIVITY_PROOF_INCOMPLETE"));
});

test("E: canary and full-run milestones bind distinct reconciliation coverage", async () => {
  const packet = makeClosedPacket();
  const canaryReconciliation = graphNode(packet, "EVALUATED_CANARY_RECONCILIATION");
  const canary = graphNode(packet, "EVALUATED_CANARY");
  const fullRunReservation = graphNode(packet, "EVALUATED_RUN_RESERVATION");
  const fullRunReconciliation = graphNode(packet, "EVALUATED_RUN_RECONCILIATION");
  const run = graphNode(packet, "EVALUATED_RUN");
  const canaryBinding = bindingForReceiptNode(packet, canary);
  const runBinding = bindingForReceiptNode(packet, run);

  assert.ok(canaryReconciliation.sequence < canary.sequence);
  assert.ok(canary.sequence < fullRunReservation.sequence);
  assert.ok(fullRunReservation.sequence < fullRunReconciliation.sequence);
  assert.ok(fullRunReconciliation.sequence < run.sequence);
  assert.equal(canaryBinding.canaryReconciliationReceiptSha256, canaryReconciliation.receiptSha256);
  assert.equal(Object.hasOwn(canaryBinding, "fullRunReconciliationReceiptSha256"), false);
  assert.equal(runBinding.canaryReceiptSha256, canary.receiptSha256);
  assert.equal(runBinding.fullRunReconciliationReceiptSha256, fullRunReconciliation.receiptSha256);
  assert.match(runBinding.fullRunCoverageSha256, /^[a-f0-9]{64}$/);
  assert.notEqual(canaryReconciliation.receiptSha256, fullRunReconciliation.receiptSha256);
});

test("E: full-run activity moved before the canary milestone is rejected", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  for (const kind of [
    "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION",
    "EVALUATED_RUN_EGRESS", "EVALUATED_RUN_RECONCILIATION",
  ]) moveGraphNodeBefore(packet, kind, "EVALUATED_CANARY");

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "EVALUATED_FULL_RUN_ACTIVITY_SEQUENCE_INVALID"));
});

test("E: EVALUATED_RUN cannot reuse the canary reconciliation receipt", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const canaryReconciliation = packet.activity.evaluatedCanary.reconciliationReceiptSha256;
  packet.activity.evaluatedRun.reconciliationReceiptSha256 = canaryReconciliation;
  for (const key of ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd", "peakConcurrency"]) {
    packet.activity.evaluatedRun[key].receiptSha256 = canaryReconciliation;
  }
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "ACTIVITY_RECONCILIATION_RECEIPT_MISMATCH"));
});

test("E: all-zero reconciliations remain provider-unexecuted and cannot close result or export", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const activeKinds = new Set([
    "REFERENCE_RESERVATION", "REFERENCE_ATTEMPT", "REFERENCE_COMPLETION", "REFERENCE_EGRESS",
    "EVALUATED_CANARY_RESERVATION", "EVALUATED_CANARY_ATTEMPT", "EVALUATED_CANARY_COMPLETION", "EVALUATED_CANARY_EGRESS",
    "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION", "EVALUATED_RUN_EGRESS",
  ]);
  packet.receiptGraph = packet.receiptGraph.filter((node) => !activeKinds.has(node.kind));
  for (const phase of [packet.activity.reference, packet.activity.evaluatedCanary, packet.activity.evaluatedRun]) {
    for (const key of ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd", "peakConcurrency"]) phase[key].value = 0;
  }
  for (const key of ["attempts", "completedCalls", "egress"]) packet.activity[key].count = 0;
  packet.materialCurrentness.hasProviderActivity = false;
  packet.materialCurrentness.firstProviderActivity = { status: "NONE", receiptSha256: null, observedAt: null, phase: "NONE" };
  rechain(packet);
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "PROVIDER_TERMINAL_ACTIVITY_PROOF_INCOMPLETE"));
  assert.ok(hasIssue(result, "RESULT_REVIEW_EXPORT_REQUIRES_POSITIVE_ACTIVITY"));
});

test("E: unknown activity cannot be self-declared as a known zero", async () => {
  const nowMs = Date.now();
  const packet = makeUnknownActivityPacket(nowMs);
  packet.activity.attempts = { known: true, count: 0, receiptSha256: null };
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "ACTIVITY_COUNTER_WITHOUT_SUMMARY"));
  assert.ok(result.issues.some((entry) => entry.code.startsWith("SCHEMA_")));
});

test("F: CONCURRED always requires VERIFIED signature, exact identity anchor, receipt, and binding", async () => {
  const nowMs = Date.now();
  const signaturePacket = makeClosedPacket(nowMs);
  signaturePacket.independentReview.final.signatureStatus = "NOT_REQUIRED";
  refreshGraphBindings(signaturePacket);
  assert.ok(hasIssue(await validateNaturalEvidence(signaturePacket, { nowMs }), "REVIEW_BINDING_OR_SIGNATURE_INVALID"));

  const anchorPacket = makeClosedPacket(nowMs);
  anchorPacket.independentReview.runner.identityAnchorSha256 = hash("wrong-reviewer-anchor");
  refreshGraphBindings(anchorPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(anchorPacket, { nowMs }), "REVIEW_BINDING_OR_SIGNATURE_INVALID"));
});

test("F: every CONCURRED review arm is receipt-bound before its positive milestone is reported", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "valid", JSON.stringify(result.issues));
  for (const [name, kind] of [
    ["freeze", "FREEZE_REVIEW"],
    ["runner", "RUNNER_REVIEW"],
    ["final", "FINAL_REVIEW"],
    ["claimBoundary", "CLAIM_REVIEW"],
  ]) {
    assert.equal(packet.independentReview[name].status, "CONCURRED");
    assert.equal(packet.independentReview[name].receiptSha256, graphNode(packet, kind).receiptSha256);
    assert.equal(graphNode(packet, kind).receiptBody.status, "CONCURRED");
  }
  assert.equal(packet.sampleFreeze.status, "INDEPENDENTLY_VERIFIED");
  assert.equal(packet.runner.status, "INDEPENDENTLY_VERIFIED");
  assert.equal(packet.runner.reviewDecision, "CONCURRED");
});

test("F: signed OBJECTED and BLOCKED outcomes receive the same current binding checks as CONCURRED", async () => {
  const nowMs = Date.now();
  for (const outcome of ["OBJECTED", "BLOCKED"]) {
    for (const mutate of [
      (packet) => { packet.independentReview.final.identityAnchorSha256 = hash(`${outcome}-wrong-anchor`); },
      (packet) => { packet.independentReview.final.reviewedBindingsSha256 = hash(`${outcome}-stale-binding`); },
      (packet) => { packet.independentReview.final.receiptSha256 = hash(`${outcome}-wrong-receipt`); },
    ]) {
      const packet = makeLateReviewOutcomePacket("final", outcome, nowMs);
      mutate(packet);
      const result = await validateNaturalEvidence(packet, { nowMs });
      assert.ok(hasIssue(result, "REVIEW_BINDING_OR_SIGNATURE_INVALID"), `${outcome}: ${JSON.stringify(result.issues)}`);
    }
  }
});

test("F: the review receipt body cannot declare an outcome different from its review arm", async () => {
  const nowMs = Date.now();
  const packet = makeLateReviewOutcomePacket("final", "OBJECTED", nowMs);
  graphNode(packet, "FINAL_REVIEW").receiptBody.status = "CONCURRED";
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "GRAPH_RECEIPT_BODY_MISMATCH"));
});

test("F: signed final OBJECTED and BLOCKED outcomes bind their receipt and stop without positive advancement", async () => {
  const nowMs = Date.now();
  for (const outcome of ["OBJECTED", "BLOCKED"]) {
    const packet = makeLateReviewOutcomePacket("final", outcome, nowMs);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.equal(result.result, "blocked", `${outcome}: ${JSON.stringify(result.issues)}`);
    assert.equal(result.lifecycleState, "UNREVIEWABLE");
    assert.equal(result.effectiveState, "UNREVIEWABLE");
    assert.equal(packet.result.status, "SEALED");
    assert.equal(packet.independentReview.final.status, outcome);
    assert.equal(graphNode(packet, "FINAL_REVIEW").receiptBody.status, outcome);
    assert.ok(!hasIssue(result, "REVIEW_BINDING_OR_SIGNATURE_INVALID"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "RESOLVED_STATE_GRAPH_MISMATCH"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "NEXT_ACTION_MISMATCH"), JSON.stringify(result.issues));
  }
});

test("F: signed freeze and runner negative outcomes remain pre-approval states and bind runner.reviewDecision", async () => {
  const nowMs = Date.now();
  for (const name of ["freeze", "runner"]) {
    for (const outcome of ["OBJECTED", "BLOCKED"]) {
      const packet = makeEarlyReviewOutcomePacket(name, outcome, nowMs);
      const result = await validateNaturalEvidence(packet, { nowMs });
      assert.equal(result.result, "blocked", `${name}/${outcome}: ${JSON.stringify(result.issues)}`);
      assert.equal(result.lifecycleState, "UNREVIEWABLE");
      assert.equal(result.effectiveState, "UNREVIEWABLE");
      assert.equal(packet.sampleFreeze.status, name === "freeze" ? "FROZEN" : "INDEPENDENTLY_VERIFIED");
      assert.equal(packet.runner.status, name === "freeze" ? "NOT_STARTED" : "CLOSEOUT_RECORDED");
      assert.equal(packet.runner.reviewDecision, name === "runner" ? outcome : "NOT_REVIEWED");
      assert.equal(graphNode(packet, name === "freeze" ? "FREEZE_REVIEW" : "RUNNER_REVIEW").receiptBody.status, outcome);
      assert.ok(!hasIssue(result, "REVIEW_BINDING_OR_SIGNATURE_INVALID"), JSON.stringify(result.issues));
      assert.ok(!hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"), JSON.stringify(result.issues));
      assert.ok(!hasIssue(result, "RUNNER_REVIEW_DECISION_MISMATCH"), JSON.stringify(result.issues));
    }
  }
});

test("F: signed claim-boundary OBJECTED and BLOCKED outcomes cannot authorize aggregate export", async () => {
  const nowMs = Date.now();
  for (const outcome of ["OBJECTED", "BLOCKED"]) {
    const packet = makeLateReviewOutcomePacket("claimBoundary", outcome, nowMs);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.equal(result.result, "blocked", `${outcome}: ${JSON.stringify(result.issues)}`);
    assert.equal(result.lifecycleState, "UNREVIEWABLE");
    assert.equal(result.effectiveState, "UNREVIEWABLE");
    assert.equal(packet.aggregateExport.status, "NOT_REQUESTED");
    assert.equal(graphNode(packet, "CLAIM_REVIEW").receiptBody.status, outcome);
    assert.ok(!hasIssue(result, "REVIEW_BINDING_OR_SIGNATURE_INVALID"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"), JSON.stringify(result.issues));
  }
});

test("F: an applicable unsigned BLOCKED review uses the exact null/MISSING projection for every arm", async () => {
  const nowMs = Date.now();
  const packets = [
    ["freeze", makeEarlyReviewOutcomePacket("freeze", "BLOCKED", nowMs, { signed: false })],
    ["runner", makeEarlyReviewOutcomePacket("runner", "BLOCKED", nowMs, { signed: false })],
    ["final", makeLateReviewOutcomePacket("final", "BLOCKED", nowMs, { signed: false })],
    ["claimBoundary", makeLateReviewOutcomePacket("claimBoundary", "BLOCKED", nowMs, { signed: false })],
  ];
  for (const [name, packet] of packets) {
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.equal(result.result, "blocked", `${name}: ${JSON.stringify(result.issues)}`);
    assert.equal(result.lifecycleState, "UNREVIEWABLE");
    assert.equal(result.effectiveState, "UNREVIEWABLE");
    assert.deepEqual(packet.independentReview[name], blockedReviewProjection());
    assert.ok(!hasIssue(result, "REVIEW_BLOCKED_PROJECTION_INVALID"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "REVIEW_BINDING_OR_SIGNATURE_INVALID"), JSON.stringify(result.issues));
    assert.ok(!hasIssue(result, "STATUS_GRAPH_PROJECTION_MISMATCH"), JSON.stringify(result.issues));
    if (name === "runner") assert.equal(packet.runner.reviewDecision, "BLOCKED");
  }
});

test("F: an unsigned BLOCKED projection is invalid before its review arm becomes applicable", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.independentReview.final = blockedReviewProjection();
  packet.resolvedState = "UNREVIEWABLE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["INDEPENDENT_REVIEW_MISSING"];
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid", JSON.stringify(result.issues));
  assert.ok(hasIssue(result, "REVIEW_BLOCKED_NOT_APPLICABLE"), JSON.stringify(result.issues));
});

test("F: no append-only milestone may advance after a negative review receipt", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.independentReview.final.status = "OBJECTED";
  packet.resolvedState = "UNREVIEWABLE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["INDEPENDENT_REVIEW_MISSING"];
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid", JSON.stringify(result.issues));
  assert.ok(hasIssue(result, "REVIEW_NEGATIVE_OUTCOME_HAS_LATER_MILESTONE"), JSON.stringify(result.issues));
});

test("F: a negative review remains UNREVIEWABLE even when another blocking condition is also present", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const expired = timestamp(nowMs - 1);
  for (const [name, kind] of [["reference", "REFERENCE_AUTHORIZATION"], ["evaluated", "EVALUATED_AUTHORIZATION"]]) {
    packet[name].grantBinding.expiresAt = expired;
    packet.sourceRights[`${name}GrantBinding`] = clone(packet[name].grantBinding);
    graphNode(packet, kind).providerGrantBinding = clone(packet[name].grantBinding);
    graphNode(packet, kind).expiresAt = expired;
  }
  packet.authority.expiresAt = expired;
  refreshGraphBindings(packet);
  const finalIndex = packet.receiptGraph.findIndex((node) => node.kind === "FINAL_REVIEW");
  packet.receiptGraph = packet.receiptGraph.slice(0, finalIndex + 1);
  packet.independentReview.final.status = "OBJECTED";
  packet.independentReview.claimBoundary = {
    status: "PENDING", receiptSha256: null, signatureStatus: "MISSING",
    identityAnchorSha256: null, reviewedBindingsSha256: null,
  };
  clearAggregateExport(packet);
  packet.resolvedState = "UNREVIEWABLE";
  packet.nextAllowedAction = "STOP_BLOCKED";
  packet.blockers = ["INDEPENDENT_REVIEW_MISSING"];
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "blocked", JSON.stringify(result.issues));
  assert.equal(result.lifecycleState, "UNREVIEWABLE");
  assert.equal(result.effectiveState, "UNREVIEWABLE");
  assert.ok(!hasIssue(result, "RESOLVED_STATE_EFFECTIVE_MISMATCH"), JSON.stringify(result.issues));
  assert.ok(!hasIssue(result, "NEXT_ACTION_MISMATCH"), JSON.stringify(result.issues));
});

test("F/H: standalone reviewArm schema rejects incomplete and hybrid status projections", async () => {
  const nowMs = Date.now();
  const probes = [
    (packet) => {
      packet.independentReview.final.receiptSha256 = null;
      packet.independentReview.final.signatureStatus = "MISSING";
      packet.independentReview.final.identityAnchorSha256 = null;
      packet.independentReview.final.reviewedBindingsSha256 = null;
    },
    (packet) => {
      packet.independentReview.final.status = "PENDING";
      packet.independentReview.final.reviewedBindingsSha256 = hash("pending-must-not-retain-binding");
    },
    (packet) => {
      packet.independentReview.final.status = "NOT_REQUIRED";
      packet.independentReview.final.receiptSha256 = null;
      packet.independentReview.final.signatureStatus = "MISSING";
      packet.independentReview.final.identityAnchorSha256 = null;
      packet.independentReview.final.reviewedBindingsSha256 = null;
    },
    (packet) => {
      packet.independentReview.final.status = "OBJECTED";
      packet.independentReview.final.signatureStatus = "MISSING";
      packet.independentReview.final.identityAnchorSha256 = null;
    },
    (packet) => {
      packet.independentReview.final.status = "BLOCKED";
      packet.independentReview.final.receiptSha256 = hash("blocked-hybrid-receipt");
      packet.independentReview.final.signatureStatus = "MISSING";
      packet.independentReview.final.identityAnchorSha256 = null;
      packet.independentReview.final.reviewedBindingsSha256 = null;
    },
  ];

  for (const mutate of probes) {
    const packet = makeClosedPacket(nowMs);
    mutate(packet);
    refreshGraphBindings(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(
      result.issues.some((entry) => entry.code.startsWith("SCHEMA_") && entry.path.startsWith("#/independentReview/final")),
      JSON.stringify(result.issues),
    );
  }
});

test("F: independent reviewer identities and role anchors cannot collapse into one signer", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const freeze = graphNode(packet, "FREEZE_REVIEW");
  const final = graphNode(packet, "FINAL_REVIEW");
  final.signatureAnchorSha256 = freeze.signatureAnchorSha256;
  packet.independentReview.final.identityAnchorSha256 = freeze.signatureAnchorSha256;
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "REVIEWER_INDEPENDENCE_ANCHOR_REUSED"));
});

test("F: custody handoff reviewer cannot reuse another reviewer identity anchor", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  const custody = graphNode(packet, "CUSTODY_HANDOFF");
  const freeze = graphNode(packet, "FREEZE_REVIEW");
  custody.signatureAnchorSha256 = freeze.signatureAnchorSha256;
  packet.runner.custodyHandoff.signatureAnchorSha256 = freeze.signatureAnchorSha256;
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "REVIEWER_INDEPENDENCE_ANCHOR_REUSED"), JSON.stringify(result.issues));
});

test("F: custody handoff reviewer cannot reuse any provider or export authorizer identity anchor", async () => {
  const nowMs = Date.now();
  for (const authorizationKind of [
    "REFERENCE_PREFLIGHT",
    "REFERENCE_AUTHORIZATION",
    "EVALUATED_PREFLIGHT",
    "EVALUATED_AUTHORIZATION",
    "AGGREGATE_EXPORT_AUTHORIZATION",
  ]) {
    const packet = makeClosedPacket(nowMs);
    const custody = graphNode(packet, "CUSTODY_HANDOFF");
    const authorization = graphNode(packet, authorizationKind);
    custody.signatureAnchorSha256 = authorization.signatureAnchorSha256;
    packet.runner.custodyHandoff.signatureAnchorSha256 = authorization.signatureAnchorSha256;
    refreshGraphBindings(packet);

    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(
      hasIssue(result, "REVIEWER_AUTHORIZER_ROLE_COLLISION"),
      `${authorizationKind}: ${JSON.stringify(result.issues)}`,
    );
  }
});

test("F: aggregate authorization is bound to current result, claim review, provenance, and metrics", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.aggregateExport.resultReceiptSha256 = hash("wrong-result-receipt");
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "AGGREGATE_EXPORT_BINDING_INVALID"));
});

test("G: lifecycle contract is complete, ordered, and maps every milestone to a future action", () => {
  assert.equal(NATURAL_LIFECYCLE_CONTRACT.length, 29);
  assert.equal(new Set(NATURAL_LIFECYCLE_CONTRACT.map(([kind]) => kind)).size, 29);
  assert.equal(new Set(NATURAL_LIFECYCLE_CONTRACT.map(([, state]) => state)).size, 29);
  for (const [kind, state, next] of NATURAL_LIFECYCLE_CONTRACT) {
    assert.match(kind, /^[A-Z][A-Z0-9_]+$/);
    assert.match(state, /^[A-Z][A-Z0-9_]+$/);
    assert.match(next, /^[A-Z][A-Z0-9_]+$/);
  }
  assert.deepEqual(NATURAL_LIFECYCLE_CONTRACT.at(-1), ["AGGREGATE_EXPORT", "CLOSED", "CLOSE"]);
});

test("G: frozen frame and sample counts are nonnull and internally consistent", async () => {
  const nowMs = Date.now();
  const nullPacket = makeClosedPacket(nowMs);
  nullPacket.frame.rowCount = null;
  refreshGraphBindings(nullPacket);
  const nullResult = await validateNaturalEvidence(nullPacket, { nowMs });
  assert.ok(hasIssue(nullResult, "FRAME_FROZEN_FIELDS_INCOMPLETE"));
  assert.ok(hasIssue(nullResult, "CLOSED_REQUIRED_FIELD_INCOMPLETE"));

  const mismatchPacket = makeClosedPacket(nowMs);
  mismatchPacket.frame.eligibleCount = 7;
  refreshGraphBindings(mismatchPacket);
  assert.ok(hasIssue(await validateNaturalEvidence(mismatchPacket, { nowMs }), "FRAME_COUNT_MISMATCH"));

  const samplePacket = makeClosedPacket(nowMs);
  samplePacket.sampleFreeze.sampleSize = null;
  refreshGraphBindings(samplePacket);
  assert.ok(hasIssue(await validateNaturalEvidence(samplePacket, { nowMs }), "SAMPLE_FREEZE_FIELDS_INCOMPLETE"));
});

test("G: future action declarations are rejected at every resolved stage", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.nextAllowedAction = "EXPORT_REDACTED_AGGREGATE";
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "NEXT_ACTION_MISMATCH"));
});

test("H: canonical-looking but impossible calendar timestamps are invalid", async () => {
  const nowMs = Date.parse("2026-08-27T12:00:00.000Z");
  const packet = makeM3Packet(nowMs);
  packet.observedAt = "2026-02-30T10:00:00.000Z";
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "TIMESTAMP_INVALID"));
});

test("H: envelope, graph, and grant issue times cannot be future or out of order", async () => {
  const nowMs = Date.now();
  const futurePacket = makeClosedPacket(nowMs);
  futurePacket.observedAt = timestamp(nowMs + 2_000);
  graphNode(futurePacket, "AGGREGATE_EXPORT").observedAt = timestamp(nowMs + 1_000);
  refreshGraphBindings(futurePacket);
  const futureResult = await validateNaturalEvidence(futurePacket, { nowMs });
  assert.ok(hasIssue(futureResult, "TIMESTAMP_FUTURE"));

  const issuedPacket = makeClosedPacket(nowMs);
  const issuedAt = timestamp(nowMs + 1_000);
  const expiresAt = timestamp(nowMs + 7_200_000);
  issuedPacket.reference.grantBinding.issuedAt = issuedAt;
  issuedPacket.reference.grantBinding.expiresAt = expiresAt;
  issuedPacket.sourceRights.referenceGrantBinding = clone(issuedPacket.reference.grantBinding);
  graphNode(issuedPacket, "REFERENCE_AUTHORIZATION").providerGrantBinding = clone(issuedPacket.reference.grantBinding);
  graphNode(issuedPacket, "REFERENCE_AUTHORIZATION").expiresAt = expiresAt;
  refreshGraphBindings(issuedPacket);
  const issuedResult = await validateNaturalEvidence(issuedPacket, { nowMs });
  assert.ok(hasIssue(issuedResult, "TIMESTAMP_FUTURE"));
  assert.ok(hasIssue(issuedResult, "PROVIDER_GRANT_ISSUED_AFTER_RECEIPT"));
});

test("H: standalone metadata names resolver-only now, digest, parent, and issuer-authenticity checks", async () => {
  const schema = await loadNaturalEvidenceSchema();
  assert.match(schema["x-validation-scope"], /not semantic parity/i);
  for (const boundary of [
    "canonical-receipt-body-digest", "direct-parent-content-address-lineage",
    "observedAt-not-in-future", "material-currentness-binding-and-invalidation",
    "registration-bound-design-profile-power-artifact-and-ceiling",
    "provider-grant-three-way-binding-freshness-and-authority-partition",
    "activity-causal-prefix-and-current-reconciliation",
    "distinct-canary-full-run-activity-reconciliation-and-coverage",
    "first-provider-activity-receipt-order-and-phase-binding",
    "reviewer-anchor-uniqueness-authorizer-separation-and-current-binding",
    "review-outcome-receipt-node-binding-and-negative-terminal-order",
    "result-count-arithmetic-claim-ceiling-and-cross-receipt-export-binding",
    "resolved-state-and-next-action-from-active-lineage",
    "issuer-authenticity-and-native-trust-anchor-remain-external",
  ]) assert.ok(schema["x-resolver-enforced"].includes(boundary), boundary);
  assert.ok(!schema["x-resolver-enforced"].includes("result-claim-ceiling-provenance-and-export-binding"));
});

test("H: standalone schema rejects provider, preflight, result, and export status projection drift", async () => {
  const nowMs = Date.now();
  const probes = [
    {
      path: "#/reference",
      packet: () => makeClosedPacket(nowMs),
      mutate(packet) {
        packet.resolvedState = "AGGREGATE_EXPORT_AUTHORIZED";
        packet.nextAllowedAction = "EXPORT_REDACTED_AGGREGATE";
        packet.reference.status = "PREFLIGHT_AUTHORIZED";
      },
    },
    {
      path: "#/reference",
      packet: () => makeM3Packet(nowMs),
      mutate(packet) {
        packet.reference.status = "PREFLIGHT_AUTHORIZED";
        packet.reference.preflightReceiptSha256 = null;
        packet.reference.routeReceiptSha256 = null;
        packet.reference.routeTrustAnchorSha256 = null;
        packet.reference.grantBinding = null;
        packet.reference.naturalTextEgressAuthorized = false;
        packet.reference.labelingReceiptSha256 = null;
        packet.reference.sealReceiptSha256 = null;
      },
    },
    {
      path: "#/evaluated",
      packet: () => makeClosedPacket(nowMs),
      mutate(packet) {
        packet.resolvedState = "AGGREGATE_EXPORT_AUTHORIZED";
        packet.nextAllowedAction = "EXPORT_REDACTED_AGGREGATE";
        packet.evaluated.status = "EXECUTION_AUTHORIZED";
      },
    },
    {
      path: "#/result",
      packet: () => makeM3Packet(nowMs),
      mutate(packet) {
        packet.result.scoreReceiptSha256 = hash("future-score-with-not-started-result");
        packet.result.metrics.metricsManifestSha256 = hash("future-metrics-with-not-started-result");
        packet.result.metrics.sampleSize = 6;
        packet.result.metrics.successfulCount = 5;
        packet.result.metrics.failedCount = 1;
      },
    },
    {
      path: "#/aggregateExport",
      packet: () => makeClosedPacket(nowMs),
      mutate(packet) {
        packet.resolvedState = "AGGREGATE_EXPORT_AUTHORIZED";
        packet.nextAllowedAction = "EXPORT_REDACTED_AGGREGATE";
        packet.aggregateExport.status = "AUTHORIZED";
      },
    },
  ];

  for (const { path: expectedPath, packet: makePacket, mutate } of probes) {
    const packet = makePacket();
    mutate(packet);
    refreshGraphBindings(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(
      result.issues.some((entry) => entry.code.startsWith("SCHEMA_") && entry.path.startsWith(expectedPath)),
      `${expectedPath}: ${JSON.stringify(result.issues)}`,
    );
  }
});

test("H: standards-compliant Draft 2020-12 validation enforces reviewArm conditionals when available", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  await withTempText(JSON.stringify(makeClosedPacket()), async (file) => {
    const valid = spawnSync("jsonschema", [STANDALONE_SCHEMA_PATH, "-i", file], {
      encoding: "utf8",
      env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" },
    });
    assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
  });

  const incomplete = makeClosedPacket();
  incomplete.independentReview.final.receiptSha256 = null;
  incomplete.independentReview.final.signatureStatus = "MISSING";
  incomplete.independentReview.final.identityAnchorSha256 = null;
  incomplete.independentReview.final.reviewedBindingsSha256 = null;
  await withTempText(JSON.stringify(incomplete), async (file) => {
    const invalid = spawnSync("jsonschema", [STANDALONE_SCHEMA_PATH, "-i", file], {
      encoding: "utf8",
      env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" },
    });
    assert.notEqual(invalid.status, 0, "incomplete CONCURRED review unexpectedly passed standalone schema validation");
  });
});

test("H/J: standalone Draft 2020-12 schema enforces every source-rights status projection", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  async function schemaStatus(packet) {
    return withTempText(JSON.stringify(packet), async (file) => spawnSync(
      "jsonschema",
      [STANDALONE_SCHEMA_PATH, "-i", file],
      { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" } },
    ));
  }

  const notReviewed = makeM3Packet();
  notReviewed.sourceRights = {
    status: "NOT_REVIEWED",
    scopeReceiptSha256: null,
    sourceScopeSha256: null,
    providerEgressAuthorized: false,
    credentialAccessAuthorized: false,
    spendAuthorized: false,
    referenceGrantBinding: null,
    evaluatedGrantBinding: null,
  };
  assert.equal((await schemaStatus(notReviewed)).status, 0);
  for (const mutate of [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = hash("not-reviewed-scope-receipt"); },
    (packet) => { packet.sourceRights.sourceScopeSha256 = hash("not-reviewed-source-scope"); },
    (packet) => { packet.sourceRights.referenceGrantBinding = clone(makeClosedPacket().sourceRights.referenceGrantBinding); },
    (packet) => { packet.sourceRights.evaluatedGrantBinding = clone(makeClosedPacket().sourceRights.evaluatedGrantBinding); },
    (packet) => { packet.sourceRights.providerEgressAuthorized = true; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = true; },
    (packet) => { packet.sourceRights.spendAuthorized = true; },
  ]) {
    const packet = clone(notReviewed);
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "NOT_REVIEWED accepted future authority fields");
  }

  assert.equal((await schemaStatus(makeM3Packet())).status, 0);
  for (const mutate of [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = null; },
    (packet) => { packet.sourceRights.sourceScopeSha256 = null; },
    (packet) => { packet.sourceRights.referenceGrantBinding = clone(makeClosedPacket().sourceRights.referenceGrantBinding); },
    (packet) => { packet.sourceRights.evaluatedGrantBinding = clone(makeClosedPacket().sourceRights.evaluatedGrantBinding); },
    (packet) => { packet.sourceRights.providerEgressAuthorized = true; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = true; },
    (packet) => { packet.sourceRights.spendAuthorized = true; },
  ]) {
    const packet = makeM3Packet();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "AUTHORIZED_FOR_FREEZE accepted an invalid projection");
  }

  assert.equal((await schemaStatus(makeClosedPacket())).status, 0);
  for (const mutate of [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = null; },
    (packet) => { packet.sourceRights.sourceScopeSha256 = null; },
    (packet) => { packet.sourceRights.providerEgressAuthorized = false; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = false; },
    (packet) => { packet.sourceRights.spendAuthorized = false; },
    (packet) => {
      packet.sourceRights.referenceGrantBinding = null;
      packet.sourceRights.evaluatedGrantBinding = null;
    },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "AUTHORIZED_FOR_PROVIDER_EGRESS accepted an invalid projection");
  }
});

test("H: standalone Draft 2020-12 schema enforces first-activity and blocked-export safe projections", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  async function schemaStatus(packet) {
    return withTempText(JSON.stringify(packet), async (file) => spawnSync(
      "jsonschema",
      [STANDALONE_SCHEMA_PATH, "-i", file],
      { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" } },
    ));
  }

  for (const mutate of [
    (packet) => { packet.materialCurrentness.firstProviderActivity.receiptSha256 = hash("none-with-receipt"); },
    (packet) => { packet.materialCurrentness.firstProviderActivity.observedAt = timestamp(Date.now()); },
    (packet) => { packet.materialCurrentness.firstProviderActivity.phase = "REFERENCE_LABELING"; },
  ]) {
    const packet = makeM3Packet();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "firstProviderActivity NONE accepted observed fields");
  }

  for (const mutate of [
    (packet) => { packet.materialCurrentness.firstProviderActivity.receiptSha256 = null; },
    (packet) => { packet.materialCurrentness.firstProviderActivity.observedAt = null; },
    (packet) => { packet.materialCurrentness.firstProviderActivity.phase = "NONE"; },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "firstProviderActivity OBSERVED accepted an incomplete projection");
  }

  const falseWithObserved = makeM3Packet();
  falseWithObserved.materialCurrentness.firstProviderActivity = clone(makeClosedPacket().materialCurrentness.firstProviderActivity);
  assert.notEqual((await schemaStatus(falseWithObserved)).status, 0, "hasProviderActivity=false accepted OBSERVED");
  const trueWithNone = makeClosedPacket();
  trueWithNone.materialCurrentness.firstProviderActivity = clone(makeM3Packet().materialCurrentness.firstProviderActivity);
  assert.notEqual((await schemaStatus(trueWithNone)).status, 0, "hasProviderActivity=true accepted NONE");

  const blocked = makeM3Packet();
  blocked.aggregateExport.status = "BLOCKED";
  assert.equal((await schemaStatus(blocked)).status, 0);
  for (const mutate of [
    (packet) => { packet.aggregateExport.authorizationReceiptSha256 = hash("blocked-auth"); },
    (packet) => { packet.aggregateExport.exportReceiptSha256 = hash("blocked-export"); },
    (packet) => { packet.aggregateExport.resultReceiptSha256 = hash("blocked-result"); },
    (packet) => { packet.aggregateExport.claimBindingSha256 = hash("blocked-claim"); },
    (packet) => { packet.aggregateExport.metricsProvenance = "natural-registered"; },
    (packet) => { packet.aggregateExport.aggregateMetricsSha256 = hash("blocked-metrics"); },
    (packet) => { packet.aggregateExport.allowlistValidated = true; },
    (packet) => { packet.aggregateExport.publicationAuthorized = true; },
  ]) {
    const packet = clone(blocked);
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "BLOCKED export accepted authority or publication fields");
  }
});

test("H: standalone Draft 2020-12 schema enforces provenance, provider role/phase, and runner review outcomes", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  async function schemaStatus(packet) {
    return withTempText(JSON.stringify(packet), async (file) => spawnSync(
      "jsonschema",
      [STANDALONE_SCHEMA_PATH, "-i", file],
      { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" } },
    ));
  }

  for (const mutate of [
    (packet) => { packet.result.provenance = "synthetic-fixture"; },
    (packet) => { packet.result.metrics.provenance = "synthetic-fixture"; },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "natural run accepted synthetic result provenance");
  }
  for (const mutate of [
    (packet) => { packet.result.provenance = "natural-registered"; },
    (packet) => { packet.result.metrics.provenance = "natural-registered"; },
  ]) {
    const packet = makeSyntheticPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "synthetic run accepted natural result provenance");
  }

  for (const mutate of [
    (packet) => {
      packet.reference.grantBinding.role = "EVALUATED_PROVIDER";
      packet.reference.grantBinding.phase = "EVALUATED_RUN";
    },
    (packet) => {
      packet.sourceRights.referenceGrantBinding.role = "EVALUATED_PROVIDER";
      packet.sourceRights.referenceGrantBinding.phase = "EVALUATED_RUN";
    },
    (packet) => {
      packet.evaluated.grantBinding.role = "REFERENCE_PROVIDER";
      packet.evaluated.grantBinding.phase = "REFERENCE_LABELING";
    },
    (packet) => {
      packet.sourceRights.evaluatedGrantBinding.role = "REFERENCE_PROVIDER";
      packet.sourceRights.evaluatedGrantBinding.phase = "REFERENCE_LABELING";
    },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "provider grant location accepted the other role/phase");
  }

  const objected = makeEarlyReviewOutcomePacket("runner", "OBJECTED");
  assert.equal((await schemaStatus(objected)).status, 0);
  for (const mutate of [
    (packet) => { packet.runner.reviewDecision = "CONCURRED"; },
    (packet) => { packet.runner.status = "INDEPENDENTLY_VERIFIED"; },
  ]) {
    const packet = clone(objected);
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "OBJECTED runner review advanced or changed decision");
  }
  const concurred = makeM3Packet();
  concurred.runner.reviewDecision = "OBJECTED";
  assert.notEqual((await schemaStatus(concurred)).status, 0, "CONCURRED runner review accepted OBJECTED decision");
  const unsignedBlocked = makeEarlyReviewOutcomePacket("runner", "BLOCKED", Date.now(), { signed: false });
  assert.equal((await schemaStatus(unsignedBlocked)).status, 0);
});

test("H: standards validator independently enforces provider, result, review, and export status dependencies", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  async function schemaStatus(packet) {
    return withTempText(JSON.stringify(packet), async (file) => spawnSync(
      "jsonschema",
      [STANDALONE_SCHEMA_PATH, "-i", file],
      { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" } },
    ));
  }

  for (const mutate of [
    (packet) => { packet.reference.status = "NOT_STARTED"; },
    (packet) => { packet.evaluated.status = "NOT_STARTED"; },
    (packet) => { packet.result.status = "SCORED"; },
    (packet) => { packet.aggregateExport.status = "AUTHORIZED"; },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "future provider/result/export fields survived a downgraded status");
  }

  for (const [name, packet] of [
    ["freeze", makeEarlyReviewOutcomePacket("freeze", "OBJECTED")],
    ["runner", makeEarlyReviewOutcomePacket("runner", "BLOCKED")],
    ["final", makeLateReviewOutcomePacket("final", "OBJECTED")],
    ["claimBoundary", makeLateReviewOutcomePacket("claimBoundary", "BLOCKED")],
  ]) {
    assert.equal((await schemaStatus(packet)).status, 0, `${name} negative projection should be schema-valid`);
    const advanced = clone(packet);
    advanced.resolvedState = "CLOSED";
    advanced.nextAllowedAction = "CLOSE";
    assert.notEqual((await schemaStatus(advanced)).status, 0, `${name} negative projection advanced to CLOSED`);
  }
});

test("H: standards validator requires distinct canary/full-run evidence and registered design artifacts", async (context) => {
  const availability = spawnSync("jsonschema", ["--version"], { encoding: "utf8" });
  if (availability.error?.code === "ENOENT") {
    context.skip("jsonschema CLI is not installed");
    return;
  }
  assert.equal(availability.status, 0, availability.stderr);

  async function schemaStatus(packet) {
    return withTempText(JSON.stringify(packet), async (file) => spawnSync(
      "jsonschema",
      [STANDALONE_SCHEMA_PATH, "-i", file],
      { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore::DeprecationWarning" } },
    ));
  }

  assert.equal((await schemaStatus(makeClosedPacket())).status, 0);

  const unregisteredHighCeiling = makeUnregisteredPacket();
  unregisteredHighCeiling.claimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  unregisteredHighCeiling.protocol.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  unregisteredHighCeiling.registeredInferenceFrame.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  assert.notEqual((await schemaStatus(unregisteredHighCeiling)).status, 0, "UNREGISTERED accepted a nontrivial claim ceiling");

  const closedWithBlocker = makeClosedPacket();
  closedWithBlocker.blockers = ["MISSING_EVIDENCE"];
  assert.notEqual((await schemaStatus(closedWithBlocker)).status, 0, "CLOSED accepted a declared blocker");
  const closedWithBlockedCheck = makeClosedPacket();
  closedWithBlockedCheck.checks[0].status = "blocked";
  assert.notEqual((await schemaStatus(closedWithBlockedCheck)).status, 0, "CLOSED accepted a non-passing check");
  const closedWithoutRegistration = makeClosedPacket();
  closedWithoutRegistration.receiptGraph = closedWithoutRegistration.receiptGraph
    .filter((node) => node.kind !== "PROTOCOL_REGISTRATION");
  assert.notEqual((await schemaStatus(closedWithoutRegistration)).status, 0, "CLOSED accepted no PROTOCOL_REGISTRATION receipt");

  const canaryOnly = makeClosedPacket();
  const fullRunKinds = new Set([
    "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION",
    "EVALUATED_RUN_EGRESS", "EVALUATED_RUN_RECONCILIATION",
  ]);
  canaryOnly.receiptGraph = canaryOnly.receiptGraph.filter((node) => !fullRunKinds.has(node.kind));
  assert.notEqual((await schemaStatus(canaryOnly)).status, 0, "CLOSED accepted canary-only activity");

  for (const mutate of [
    (packet) => { delete packet.protocol.designProfileId; },
    (packet) => { delete packet.protocol.registeredPowerArtifactSha256; },
    (packet) => { delete packet.registeredInferenceFrame.designProfileId; },
    (packet) => { delete packet.registeredInferenceFrame.registeredPowerArtifactSha256; },
  ]) {
    const packet = makeClosedPacket();
    mutate(packet);
    assert.notEqual((await schemaStatus(packet)).status, 0, "registration design binding became optional");
  }
});

test("H: CLOSED cross-custody packets require a structurally VERIFIED handoff", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.runner.custodyHandoff.status = "REQUIRED";
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "invalid");
  assert.ok(hasIssue(result, "SCHEMA_CONST_MISMATCH"));
  assert.ok(hasIssue(result, "CUSTODY_HANDOFF_BINDING_MISMATCH"));
});

test("H: external VERIFIED is a bound declaration, never offline issuer authentication or provider authority", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  await withTempText(JSON.stringify(packet), async (file) => {
    const cli = runScript("verify-evidence-envelope.mjs", [file]);
    assert.equal(cli.status, 0, cli.stdout);
    const output = JSON.parse(cli.stdout);
    assert.equal(output.contentAddressScope, "packet-local-internal-closure");
    assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
    assert.equal(output.providerAuthorityGranted, false);
  });

  const untrusted = makeClosedPacket(nowMs);
  const route = graphNode(untrusted, "REFERENCE_ROUTE");
  route.receiptBody.externalAuthority = { nativeReceiptRef: null, nativeReceiptSha256: null, trustAnchorSha256: null, verificationStatus: "UNKNOWN" };
  route.receiptSha256 = canonicalDigest(route.receiptBody);
  rechain(untrusted);
  const result = await validateNaturalEvidence(untrusted, { nowMs });
  assert.ok(hasIssue(result, "EXTERNAL_EVIDENCE_NOT_VERIFIED"));
  assert.notEqual(result.effectiveState, "CLOSED");
});

test("H: unregistered packets cannot publish a nontrivial registered claim ceiling", async () => {
  const packet = makeUnregisteredPacket();
  packet.claimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.protocol.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.registeredInferenceFrame.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.registeredInferenceFrame.inferenceFrameSha256 = canonicalDigest(
    Object.fromEntries(Object.entries(packet.registeredInferenceFrame)
      .filter(([key]) => key !== "inferenceFrameSha256")),
  );
  refreshEvidenceHashes(packet);

  const result = await validateNaturalEvidence(packet);
  assert.notEqual(result.result, "valid");
  assert.ok(hasIssue(result, "UNREGISTERED_CLAIM_CEILING_FORBIDDEN"));
});

test("H: blocked verifier output carries the same explicit offline authority boundary", async () => {
  const packet = makeM3Packet();
  await withTempText(JSON.stringify(packet), async (file) => {
    const cli = runScript("verify-evidence-envelope.mjs", [file]);
    assert.equal(cli.status, 2, cli.stdout);
    const output = JSON.parse(cli.stdout);
    assert.equal(output.result, "blocked");
    assert.equal(output.contentAddressScope, "packet-local-internal-closure");
    assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
    assert.equal(output.providerAuthorityGranted, false);
  });
});

test("I: registered inference frame is hash-bound to protocol/sample/prompt/schema/taxonomy/runner/scorer", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.registeredInferenceFrame.taxonomySha256 = hash("wrong-inference-taxonomy");
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "INFERENCE_FRAME_BINDING_MISMATCH"));
});

test("I: synthetic fixtures can validate structure but can never close natural result/export", async () => {
  const nowMs = Date.now();
  const structural = await validateNaturalEvidence(makeSyntheticPacket(nowMs), { nowMs });
  assert.equal(structural.result, "blocked");
  assert.ok(!hasIssue(structural, "PROVENANCE_SYNTHETIC_NATURAL_CLOSURE_FORBIDDEN"));

  const packet = makeClosedPacket(nowMs);
  packet.runProvenance = "synthetic-fixture";
  packet.result.provenance = "synthetic-fixture";
  packet.result.metrics.provenance = "synthetic-fixture";
  refreshGraphBindings(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "PROVENANCE_SYNTHETIC_NATURAL_CLOSURE_FORBIDDEN"));
});

test("I: a successor registered design derives its ceiling from an immutable profile and power artifact", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.protocol.family = "REGISTERED_NATURAL_EVALUATION";
  packet.protocol.designProfileId = `design-profile-${hash("successor-design-profile").slice(0, 16)}`;
  packet.protocol.registeredPowerArtifactSha256 = hash("successor-registered-power-artifact");
  packet.protocol.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.registeredInferenceFrame.designProfileId = packet.protocol.designProfileId;
  packet.registeredInferenceFrame.registeredPowerArtifactSha256 = packet.protocol.registeredPowerArtifactSha256;
  packet.registeredInferenceFrame.registeredClaimCeiling = packet.protocol.registeredClaimCeiling;
  packet.claimCeiling = packet.protocol.registeredClaimCeiling;
  packet.result.resultConclusion = packet.protocol.registeredClaimCeiling;
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.equal(result.result, "valid", JSON.stringify(result.issues));
});

test("I: design profile and registered power artifact are immutable registration bindings", async () => {
  const nowMs = Date.now();
  for (const mutate of [
    (packet) => { packet.protocol.designProfileId = `design-profile-${hash("unregistered-profile-swap").slice(0, 16)}`; },
    (packet) => { packet.protocol.registeredPowerArtifactSha256 = hash("unregistered-power-artifact-swap"); },
  ]) {
    const packet = makeClosedPacket(nowMs);
    mutate(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.equal(result.result, "invalid");
    assert.ok(
      hasIssue(result, "GRAPH_BINDING_DIGEST_MISMATCH") || hasIssue(result, "INFERENCE_FRAME_BINDING_MISMATCH"),
      JSON.stringify(result.issues),
    );
  }
});

test("I: result conclusions can never exceed their immutable registered ceilings", async () => {
  const nowMs = Date.now();
  const conclusion = makeClosedPacket(nowMs);
  conclusion.result.resultConclusion = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  refreshGraphBindings(conclusion);
  assert.ok(hasIssue(await validateNaturalEvidence(conclusion, { nowMs }), "RESULT_CONCLUSION_EXCEEDS_CLAIM_CEILING"));
});

test("I: result and aggregate metric provenance must match run provenance", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.result.metrics.provenance = "synthetic-fixture";
  refreshGraphBindings(packet);
  assert.ok(hasIssue(await validateNaturalEvidence(packet, { nowMs }), "RESULT_PROVENANCE_MISMATCH"));
});

test("J: Natural semantic overlays use positive grammars for public broad identifiers", async () => {
  const nowMs = Date.now();
  const probes = [
    (packet) => { packet.authority.required = ["APPROVED"]; packet.authority.proven = ["APPROVED"]; },
    (packet) => { packet.checks[0].id = "PASS"; },
    (packet) => { packet.checks[0].evidenceRef = "release-ready"; },
    (packet) => { packet.sourceIdentity[0].logicalId = "deploy-live"; },
    (packet) => { packet.result.status = "APPROVED"; },
  ];
  for (const mutate of probes) {
    const packet = makeClosedPacket(nowMs);
    mutate(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(result.issues.some((entry) => entry.code === "SCHEMA_ENUM_MISMATCH" || entry.code === "SCHEMA_PATTERN_MISMATCH"), JSON.stringify(result.issues));
  }
});

test("J: a source-rights receipt requires the fixed SOURCE_FREEZE_RIGHTS authority proof", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.authority.required = [];
  packet.authority.proven = [];
  refreshEvidenceHashes(packet);
  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.ok(hasIssue(result, "SOURCE_RIGHTS_AUTHORITY_PARTITION_MISMATCH"));
});

test("J: an authorized freeze cannot advance without a hash-bound source-rights scope", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.sourceRights.sourceScopeSha256 = null;
  packet.blockers = [];
  packet.checks = packet.checks.map((check) => ({ ...check, status: "pass" }));
  refreshGraphBindings(packet);

  const result = await validateNaturalEvidence(packet, { nowMs });
  assert.notEqual(result.result, "valid");
  assert.ok(hasIssue(result, "SOURCE_RIGHTS_SCOPE_INCOMPLETE"), JSON.stringify(result.issues));
});

test("J: source-rights semantic states enforce exact freeze and provider-egress authority projections", async () => {
  const nowMs = Date.now();
  const closed = makeClosedPacket(nowMs);
  const notReviewedBase = makeM3Packet(nowMs);
  notReviewedBase.sourceRights = {
    status: "NOT_REVIEWED",
    scopeReceiptSha256: null,
    sourceScopeSha256: null,
    providerEgressAuthorized: false,
    credentialAccessAuthorized: false,
    spendAuthorized: false,
    referenceGrantBinding: null,
    evaluatedGrantBinding: null,
  };
  for (const mutate of [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = hash("not-reviewed-semantic-scope-receipt"); },
    (packet) => { packet.sourceRights.sourceScopeSha256 = hash("not-reviewed-semantic-source-scope"); },
    (packet) => { packet.sourceRights.referenceGrantBinding = clone(closed.sourceRights.referenceGrantBinding); },
    (packet) => { packet.sourceRights.evaluatedGrantBinding = clone(closed.sourceRights.evaluatedGrantBinding); },
    (packet) => { packet.sourceRights.providerEgressAuthorized = true; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = true; },
    (packet) => { packet.sourceRights.spendAuthorized = true; },
  ]) {
    const packet = clone(notReviewedBase);
    mutate(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(hasIssue(result, "SOURCE_RIGHTS_FUTURE_FIELDS_PRESENT"), JSON.stringify(result.issues));
  }

  const freezeProbes = [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = null; },
    (packet) => { packet.sourceRights.sourceScopeSha256 = null; },
    (packet) => { packet.sourceRights.referenceGrantBinding = clone(closed.sourceRights.referenceGrantBinding); },
    (packet) => { packet.sourceRights.evaluatedGrantBinding = clone(closed.sourceRights.evaluatedGrantBinding); },
    (packet) => { packet.sourceRights.providerEgressAuthorized = true; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = true; },
    (packet) => { packet.sourceRights.spendAuthorized = true; },
  ];
  for (const mutate of freezeProbes) {
    const packet = makeM3Packet(nowMs);
    mutate(packet);
    refreshGraphBindings(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(hasIssue(result, "SOURCE_RIGHTS_SCOPE_INCOMPLETE"), JSON.stringify(result.issues));
  }

  const egressProbes = [
    (packet) => { packet.sourceRights.scopeReceiptSha256 = null; },
    (packet) => { packet.sourceRights.sourceScopeSha256 = null; },
    (packet) => { packet.sourceRights.providerEgressAuthorized = false; },
    (packet) => { packet.sourceRights.credentialAccessAuthorized = false; },
    (packet) => { packet.sourceRights.spendAuthorized = false; },
    (packet) => {
      packet.sourceRights.referenceGrantBinding = null;
      packet.sourceRights.evaluatedGrantBinding = null;
    },
  ];
  for (const mutate of egressProbes) {
    const packet = makeClosedPacket(nowMs);
    mutate(packet);
    refreshGraphBindings(packet);
    const result = await validateNaturalEvidence(packet, { nowMs });
    assert.ok(hasIssue(result, "SOURCE_RIGHTS_SCOPE_INCOMPLETE"), JSON.stringify(result.issues));
  }
});

test("common evidenceClass and canonical millisecond grammar are exact", async () => {
  const nowMs = Date.now();
  const wrongClass = makeClosedPacket(nowMs);
  wrongClass.evidenceClass = "STATUS_AUDIT";
  assert.ok(hasIssue(await validateNaturalEvidence(wrongClass, { nowMs }), "SCHEMA_CONST_MISMATCH"));

  const wrongTime = makeClosedPacket(nowMs);
  wrongTime.observedAt = "2026-08-27T12:34:56Z";
  assert.ok(hasIssue(await validateNaturalEvidence(wrongTime, { nowMs }), "SCHEMA_PATTERN_MISMATCH"));
});

test("user-facing templates preserve the authorization marker and language routing instruction", async () => {
  for (const name of [
    "claim-boundary-handoff.template.md",
    "project-adapter-map.template.md",
    "provider-grant-request.template.md",
  ]) {
    const content = await readFile(new URL(`../assets/${name}`, import.meta.url), "utf8");
    assert.equal(content.split(/\r?\n/, 1)[0], "# TEMPLATE_ONLY_NOT_AUTHORIZATION");
    assert.match(content, /^Output language \/ 输出语言: follow the user's language/m);
  }
});

test("CLI rejects malformed and unknown protected input without echo", async () => {
  await withTempText('{"rawProviderResponse":"MALFORMED-PROTECTED-CANARY-71"', async (file) => {
    const result = runScript("verify-evidence-envelope.mjs", [file]);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /rawProviderResponse|MALFORMED-PROTECTED-CANARY-71/);
    assert.equal(JSON.parse(result.stdout).issues[0].code, "JSON_MALFORMED");
  });

  const packet = clone(makeM3Packet());
  packet.unknownProtectedCanary = { secretProbeKey: "DO-NOT-ECHO-921" };
  await withTempText(JSON.stringify(packet), async (file) => {
    const result = runScript("verify-evidence-envelope.mjs", [file]);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /unknownProtectedCanary|secretProbeKey|DO-NOT-ECHO-921/);
    const output = JSON.parse(result.stdout);
    assert.ok(output.issues.some((entry) => entry.code === "SCHEMA_UNKNOWN_PROPERTY"));
    assert.ok(output.issues.every((entry) => entry.path === "#" || entry.path === "#[redacted]" || !/unknown|secret|probe/i.test(entry.path)));
  });
});

test("CLI help promises offline read-only zero-provider behavior", () => {
  const result = runScript("verify-evidence-envelope.mjs", ["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Offline, read-only/);
  assert.match(result.stdout, /never contacts a provider/);
  assert.match(result.stdout, /grants provider authority.*authenticates an issuer/i);
});
