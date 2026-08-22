import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS,
  CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT,
  assertCaliforniaSignatureQaRuntimeMarker,
  assertCaliforniaSignatureExhaustiveArtifactSchema,
  assertCaliforniaSignatureExhaustiveMatrixComplete,
  assertCaliforniaSignatureLayoutSettleEvidence,
  assertCaliforniaSignatureSourceExpectedRuntimeExact,
  assertReviewedCaliforniaSignatureExhaustiveSnapshot,
  buildCaliforniaSignatureExhaustivePackages,
  buildCaliforniaSignatureAxis,
  buildCaliforniaSignatureExternalEvidenceExpectations,
  deriveCaliforniaSignatureRuntimeSnapshotFromSource,
  digestCaliforniaSignatureLayoutSettleEvidence,
  missingCaliforniaSignatureSourceExpectedProvider,
  parseCaliforniaSignatureShard,
  requireCaliforniaSignatureCanvasRuntimeRunId,
  resolveCaliforniaSignatureActiveEndpointPairs,
  snapshotCaliforniaSignatureExhaustiveEvidence,
  validateCaliforniaSignatureEvidenceRecords,
  type CaliforniaSignatureExactEvidenceRecord,
  type CaliforniaSignatureRuntimeControl,
  type CaliforniaSignatureSourceExpectedProvider
} from "./california-signature-exhaustive-qa";
import {
  CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE,
  CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
  CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
  buildCaliforniaSignatureArtifactValidationContext,
  buildCaliforniaSignatureExpectedArtifactMatrix,
  assertReviewedCaliforniaSignatureStreamingAggregate,
  californiaSignatureArtifactRunIdentityFromEnvironment,
  sealCaliforniaSignatureOfficialArtifactRun,
  validateCaliforniaSignatureStreamingAggregate
} from "./california-signature-exhaustive-artifact-lifecycle";
import { buildCaliforniaSignatureSourceManifest } from "./california-signature-control-manifest";
import { buildCaliforniaSignatureSourceExpectedEvidenceOracle } from
  "./california-signature-source-expected-provider";
import {
  CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
  summarizeCaliforniaBaseContrastEvidence,
  summarizeCaliforniaHardenedTextContrastScan,
  type CaliforniaContrastEvidence
} from "./california-visualization-contrast-audit";
import type { HkVisualizationContrastScanResult } from "./hk-visualization-text-contrast-scanner";

const manifest = buildCaliforniaSignatureSourceManifest();
const bench = manifest.benches[0];
const step = bench.lessonSteps[0];
const site = bench.controlSites[0];
const validResetEvidence = {
  activeBenchRestored: true,
  canvasReady: true,
  canvasReplaced: true,
  defaultControlFingerprint: "control-default",
  defaultModelFingerprint: "model-default",
  defaultSurfaceFingerprint: "surface-default",
  defaultSurfaceStable: true,
  restoredControlFingerprint: "control-default",
  restoredDefault: true,
  restoredModelFingerprint: "model-default",
  restoredSurfaceFingerprint: "surface-default",
  restoredSurfaceStable: true,
  surfaceChangedPixelRatio: 0,
  surfaceComparison: "stable-pixel-tolerance" as const,
  surfaceEdgeMismatchRatio: 0,
  surfaceMeanAbsoluteDiffRatio: 0
} as const;

function record(overrides: Partial<CaliforniaSignatureExactEvidenceRecord> = {}): CaliforniaSignatureExactEvidenceRecord {
  const target = site.endpointTargets[0];
  const base = {
    axisId: "desktop-en-light",
    benchId: bench.benchId,
    branchPath: [],
    canvasGraphicsContrastAck: null,
    canvasGraphicsEvidence: null,
    canvasGraphicsNodeAck: null,
    combinationActivations: null,
    endpoint: "activate",
    instanceKey: "direct",
    labId: "synthetic-lab",
    layoutSettleEvidence: null,
    numericMidpoint: site.kind === "range" || site.kind === "number" ? {
      max: "10",
      mid: "5",
      min: "0",
      reachableCardinality: 3 as const,
      reason: null,
      sourceExpression: site.numericMidpoint?.sourceExpression ?? "canonical-midpoint(min=0;max=10;step=1)",
      status: "available" as const,
      step: "1"
    } : null,
    phase: "functional" as const,
    resetEvidence: validResetEvidence,
    sourceEndpoint: target ? {
      instanceKey: `${target.key}:0`,
      sourceTargetKey: target.key,
      value: target.sourceExpression || target.name
    } : null,
    sourceSiteKey: site.siteKey,
    stepKey: step.key
  };
  const value = {
    ...base,
    ...overrides,
    numericMidpoint: Object.prototype.hasOwnProperty.call(overrides, "numericMidpoint")
      ? overrides.numericMidpoint ?? null
      : overrides.sourceSiteKey === null ? null : base.numericMidpoint,
    resetEvidence: Object.prototype.hasOwnProperty.call(overrides, "resetEvidence")
      ? overrides.resetEvidence ?? null
      : overrides.endpoint === null ? null : base.resetEvidence,
    sourceEndpoint: Object.prototype.hasOwnProperty.call(overrides, "sourceEndpoint")
      ? overrides.sourceEndpoint ?? null
      : overrides.endpoint === null ? null : base.sourceEndpoint ?? null
  };
  const layoutSettleEvidenceSha256 = digestCaliforniaSignatureLayoutSettleEvidence(
    value.layoutSettleEvidence
  );
  const canvasGraphicsEvidenceSha256 = value.canvasGraphicsEvidence?.evidenceSha256 ?? null;
  const resetEvidenceSha256 = value.resetEvidence === null
    ? null
    : createHash("sha256").update(stableJson(value.resetEvidence)).digest("hex");
  // Canonical key is intentionally produced through the public snapshot input
  // format rather than duplicated from production code in real artifacts.
  const canonical = JSON.stringify({
    axisId: value.axisId,
    benchId: value.benchId,
    branchPath: value.branchPath,
    combinationActivations: value.combinationActivations,
    endpoint: value.endpoint,
    instanceKey: value.instanceKey,
    labId: value.labId,
    numericMidpoint: value.numericMidpoint,
    phase: value.phase,
    sourceEndpoint: value.sourceEndpoint,
    sourceSiteKey: value.sourceSiteKey,
    stepKey: value.stepKey
  });
  return {
    ...value,
    canvasGraphicsEvidenceSha256,
    key: createHash("sha256").update(canonical).digest("hex"),
    layoutSettleEvidenceSha256,
    resetEvidenceSha256
  };
}

function exactSet(expected: readonly string[], actual: readonly string[], label: string) {
  assert.equal(new Set(actual).size, actual.length, `${label}: duplicate`);
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));
  assert.deepEqual({ extra, missing }, { extra: [], missing: [] }, label);
}

test("exhaustive endpoint evidence requires a real learner Reset receipt", () => {
  assert.throws(
    () => validateCaliforniaSignatureEvidenceRecords({
      evidence: [record({ resetEvidence: null, resetEvidenceSha256: null })],
      manifest
    }),
    /reset.*evidence|evidence.*reset/i,
    "an endpoint row without measured learner Reset evidence must fail closed"
  );

  const source = readFileSync(
    new URL("./california-signature-exhaustive-qa.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /resetSignatureBench\(/,
    "exhaustive endpoint execution must call the audited real learner Reset helper");
  assert.doesNotMatch(source, /const restored = await reachLessonStep\(/,
    "fresh reopen/replay must not be accepted as endpoint Reset evidence");
});

const canaryKeys = [
  "mode:first",
  "mode:middle",
  "mode:last",
  "control:first",
  "control:middle",
  "control:last",
  "endpoint:min",
  "endpoint:max",
  "axis:desktop-en-light",
  "axis:mobile-zhCN-light"
];

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const contrastContext = {
  benchId: "SyntheticLab",
  state: "synthetic-state",
  viewport: "desktop" as const
};
const rawBaseContrastEvidence: readonly CaliforniaContrastEvidence[] = [{
  background: { alpha: 1, blue: 248, green: 250, red: 248 },
  backgroundSampleCount: 1,
  contextKind: "html",
  effectiveFontSizePx: 16,
  essential: null,
  foreground: { alpha: 1, blue: 15, green: 23, red: 42 },
  groupId: "synthetic-base-group",
  hasExecutableContrastProvider: null,
  hasExecutableNonTextEvidence: null,
  kind: "html-text",
  label: "Synthetic learner label",
  ratio: 4.6,
  ratios: [4.6],
  reasons: [],
  sampleCount: 1,
  sampleX: 12,
  sampleY: 18,
  threshold: 4.5
}];
const baseContrastSummary = summarizeCaliforniaBaseContrastEvidence(
  rawBaseContrastEvidence,
  contrastContext
);
const hardenedTextRawScan: HkVisualizationContrastScanResult = {
  checkedTextCount: 1,
  evidence: [{
    background: "rgb(248, 250, 248)",
    backgroundLuminance: 0.95,
    contrastRatio: 4.6,
    effectiveOpacity: 1,
    foreground: "rgb(15, 23, 42)",
    requiredRatio: 4.5,
    target: "div \"Synthetic learner label\""
  }],
  issues: [],
  worst: {
    background: "rgb(248, 250, 248)",
    backgroundLuminance: 0.95,
    contrastRatio: 4.6,
    effectiveOpacity: 1,
    foreground: "rgb(15, 23, 42)",
    requiredRatio: 4.5,
    target: "div \"Synthetic learner label\""
  }
};
const hardenedTextSummary = summarizeCaliforniaHardenedTextContrastScan(
  hardenedTextRawScan,
  contrastContext
).hardenedText;
const settledEvidence = {
  activeAnimationCount: 0 as const,
  candidateTargetCount: 7,
  contrastAuditedLabelCount: baseContrastSummary.auditedLabelCount,
  contrastCandidateLabelCount: baseContrastSummary.candidateLabelCount,
  contrastContext,
  contrastEvidence: rawBaseContrastEvidence,
  contrastEvidenceSha256: createHash("sha256").update(stableJson(rawBaseContrastEvidence)).digest("hex"),
  contrastFindingCount: baseContrastSummary.findings.length,
  contrastFindings: baseContrastSummary.findings,
  contrastMinRatio: baseContrastSummary.minRatio!,
  contrastWorstKind: baseContrastSummary.worstKind!,
  contrastWorstLabel: baseContrastSummary.worstLabel!,
  contrastWorstRequiredRatio: baseContrastSummary.worstRequiredRatio!,
  controlStateSha256: "d".repeat(64),
  deviceScaleFactor: 1,
  documentLanguage: "en",
  effectiveTheme: "light",
  fontStatus: "loaded" as const,
  geometryVisibilitySha256: "a".repeat(64),
  hardenedTextAlgorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
  hardenedTextAuditedCount: hardenedTextSummary.auditedTextCount,
  hardenedTextCandidateCount: hardenedTextSummary.candidateTextCount,
  hardenedTextCompleted: hardenedTextSummary.completed,
  hardenedTextEvidenceSha256: hardenedTextSummary.evidenceSha256,
  hardenedTextFindingCount: hardenedTextSummary.findingCount,
  hardenedTextMinRatio: hardenedTextSummary.minRatio!,
  hardenedTextRawScan,
  hardenedTextWorstLabel: hardenedTextSummary.worstLabel!,
  hardenedTextWorstRequiredRatio: hardenedTextSummary.worstRequiredRatio!,
  postControlStateSha256: "d".repeat(64),
  postGeometryVisibilitySha256: "a".repeat(64),
  postRootStateSha256: "e".repeat(64),
  rootStateSha256: "e".repeat(64),
  stableRafSnapshots: 3,
  svgTargetCount: 2,
  url: "http://127.0.0.1:3138/student/tools/visualizations?grade=P1&track=all",
  viewportHeight: 720,
  viewportWidth: 1280
};

function syntheticExactControl(): CaliforniaSignatureRuntimeControl {
  const sourceEndpoints = site.endpointTargets.flatMap((target) =>
    Array.from({ length: target.expectedMultiplicity }, (_, index) => ({
      instanceKey: `${target.key}:${index}`,
      sourceTargetKey: target.key,
      value: target.sourceExpression || target.name
    }))
  );
  assert.ok(sourceEndpoints.length > 0, "synthetic source site must expose an endpoint target");
  return {
    checked: null,
    disabled: false,
    endpoints: sourceEndpoints.map((_, index) => `source:${index}`),
    instanceKey: "source-active-canary",
    kind: site.kind,
    max: null,
    maxLength: -1,
    min: null,
    minLength: -1,
    name: "",
    numericMidpoint: null,
    optionValues: [],
    pressed: false,
    sourceConditionKeys: site.sourceConditionKeys,
    sourceEndpoints,
    sourceSiteKey: site.siteKey,
    tagName: "synthetic",
    step: null,
    type: site.kind,
    value: "",
    visible: true
  };
}

function syntheticActiveProvider(
  control: CaliforniaSignatureRuntimeControl,
  activeForStep: (stepKey: string) => readonly string[]
): CaliforniaSignatureSourceExpectedProvider {
  return {
    async activeEndpoints({ context }) { return activeForStep(context.stepKey); },
    async activateNonFormEndpoint() {},
    async assertReady() {},
    async branchEndpoints() { return []; },
    async expectedControls() {
      return [{
        endpoints: control.endpoints,
        instanceKey: control.instanceKey,
        kind: control.kind,
        numericMidpoint: control.numericMidpoint,
        sourceConditionKeys: control.sourceConditionKeys,
        sourceEndpoints: control.sourceEndpoints,
        sourceSiteKey: control.sourceSiteKey
      }];
    },
    async navigationContract() {
      return { answerSiteKey: site.siteKey, backSiteKey: `${site.siteKey}:back`, nextSiteKey: `${site.siteKey}:next` };
    },
    async resolveRuntimeControls({ controls }) { return controls; },
    async settleEndpoint() {}
  };
}

test("aggregate canaries reject a missing middle mode", () => {
  assert.throws(() => exactSet(canaryKeys, canaryKeys.filter((key) => key !== "mode:middle"), "missing-middle-mode"),
    /missing-middle-mode/);
});

test("aggregate canaries reject a missing non-first control", () => {
  assert.throws(() => exactSet(canaryKeys, canaryKeys.filter((key) => key !== "control:middle"), "missing-control"),
    /missing-control/);
});

test("aggregate canaries reject a missing endpoint", () => {
  assert.throws(() => exactSet(canaryKeys, canaryKeys.filter((key) => key !== "endpoint:max"), "missing-endpoint"),
    /missing-endpoint/);
});

test("aggregate canaries reject a missing axis", () => {
  assert.throws(() => exactSet(canaryKeys, canaryKeys.filter((key) => key !== "axis:mobile-zhCN-light"), "missing-axis"),
    /missing-axis/);
});

test("aggregate canaries reject duplicate exact keys", () => {
  assert.throws(() => snapshotCaliforniaSignatureExhaustiveEvidence([record(), record()]), /duplicate exact keys/);
});

test("aggregate canaries reject a misattributed source-site key", () => {
  const evidence = record({ sourceSiteKey: "action-button:999:misattributed" });
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [evidence], manifest }),
    /misattributed|tampered/);
});

test("aggregate canaries reject a misattributed source-target key", () => {
  const evidence = record({
    sourceEndpoint: { instanceKey: "wrong:0", sourceTargetKey: "source-target:missing", value: "wrong" }
  });
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [evidence], manifest }),
    /unknown source target/);
});

test("synthetic ledger helper normalizes an explicit undefined source endpoint to null", () => {
  const evidence = record({
    endpoint: null,
    instanceKey: null,
    sourceEndpoint: undefined,
    sourceSiteKey: null
  });
  assert.equal(evidence.sourceEndpoint, null);
});

test("layout endpoint evidence is fail-closed without a real Canvas graphics receipt", () => {
  const evidence = record({ phase: "layout" });
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [evidence], manifest }),
    /layout evidence has no Canvas graphics receipt/);
});

test("all-axis structural state evidence is fail-closed without a real Canvas graphics receipt", () => {
  const evidence = record({
    endpoint: null,
    instanceKey: null,
    phase: "structural",
    sourceEndpoint: null,
    sourceSiteKey: null
  });
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [evidence], manifest }),
    /structural evidence has no Canvas graphics receipt/);
});

test("measured collision, touch, and contrast settle evidence passes its independent validator", () => {
  assert.doesNotThrow(() => assertCaliforniaSignatureLayoutSettleEvidence(settledEvidence));
});

test("all-axis structural state cannot substitute DOM/SVG settle evidence for a Canvas receipt", () => {
  const evidence = record({
    endpoint: null,
    instanceKey: null,
    layoutSettleEvidence: settledEvidence,
    phase: "structural",
    sourceEndpoint: null,
    sourceSiteKey: null
  });
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [evidence], manifest }),
    /structural evidence has no Canvas graphics receipt/);
});

test("durable contrast settle evidence rejects a forged zero-finding low ratio", () => {
  const evidence = record({
    endpoint: null,
    instanceKey: null,
    layoutSettleEvidence: {
      ...settledEvidence,
      contrastFindingCount: 0,
      contrastMinRatio: 2.99
    },
    phase: "structural",
    sourceEndpoint: null,
    sourceSiteKey: null
  });
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(evidence.layoutSettleEvidence!),
    /base contrast minimum does not recompute|durable contrast evidence lacks a passing measured ratio/
  );
});

test("durable contrast settle evidence rejects stale or forged hardened scanner evidence", () => {
  const staleAlgorithm = record({
    endpoint: null,
    instanceKey: null,
    layoutSettleEvidence: {
      ...settledEvidence,
      hardenedTextAlgorithmSha256: "1".repeat(64)
    },
    phase: "structural",
    sourceEndpoint: null,
    sourceSiteKey: null
  });
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(staleAlgorithm.layoutSettleEvidence!),
    /hardened text contrast algorithm is stale or unreviewed/
  );

  const forgedLowRatio = record({
    endpoint: null,
    instanceKey: null,
    layoutSettleEvidence: {
      ...settledEvidence,
      hardenedTextFindingCount: 0,
      hardenedTextMinRatio: 2.99
    },
    phase: "structural",
    sourceEndpoint: null,
    sourceSiteKey: null
  });
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(forgedLowRatio.layoutSettleEvidence!),
    /hardened minimum does not recompute|hardened text contrast lacks a passing measured ratio/
  );
});

test("raw base contrast enforces its own 4.5 threshold and recomputes summaries after tampering", () => {
  const belowOwnThreshold = structuredClone(settledEvidence);
  belowOwnThreshold.contrastEvidence[0]!.ratio = 3.1;
  belowOwnThreshold.contrastEvidence[0]!.ratios = [3.1];
  belowOwnThreshold.contrastEvidenceSha256 = createHash("sha256")
    .update(stableJson(belowOwnThreshold.contrastEvidence)).digest("hex");
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(belowOwnThreshold),
    /below its own threshold/,
    "3.1 must fail when the measured target independently requires 4.5"
  );

  const ratioTamper = structuredClone(settledEvidence);
  ratioTamper.contrastEvidence[0]!.ratio = 5.1;
  ratioTamper.contrastEvidence[0]!.ratios = [5.1];
  ratioTamper.contrastEvidenceSha256 = createHash("sha256")
    .update(stableJson(ratioTamper.contrastEvidence)).digest("hex");
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(ratioTamper),
    /minimum does not recompute|worst .* does not recompute/,
    "rehashing raw ratios must not preserve a stale passing summary"
  );

  const reasonTamper = structuredClone(settledEvidence);
  reasonTamper.contrastEvidence[0]!.ratios = [];
  reasonTamper.contrastEvidence[0]!.ratio = null;
  reasonTamper.contrastEvidence[0]!.reasons = ["tampered unsupported paint"];
  reasonTamper.contrastEvidenceSha256 = createHash("sha256")
    .update(stableJson(reasonTamper.contrastEvidence)).digest("hex");
  assert.throws(
    () => assertCaliforniaSignatureLayoutSettleEvidence(reasonTamper),
    /findings do not recompute|audited count does not recompute/,
    "rehashing raw reasons must not preserve stale zero findings"
  );

  const originalRecord = record({ layoutSettleEvidence: settledEvidence, phase: "layout" });
  const groupTamper = structuredClone(originalRecord);
  groupTamper.layoutSettleEvidence!.contrastEvidence[0]!.groupId = "tampered-group";
  groupTamper.layoutSettleEvidence!.contrastEvidenceSha256 = createHash("sha256")
    .update(stableJson(groupTamper.layoutSettleEvidence!.contrastEvidence)).digest("hex");
  assert.throws(
    () => validateCaliforniaSignatureEvidenceRecords({ evidence: [groupTamper], manifest }),
    /layout settle evidence integrity digest drifted/,
    "a rehashed group identity must still break the separately durable settle receipt"
  );
});

test("raw hardened scanner rejects tampered worst, counts, duplicate targets, and issues", () => {
  const wrongWorst = structuredClone(settledEvidence);
  wrongWorst.hardenedTextRawScan.worst = {
    ...wrongWorst.hardenedTextRawScan.evidence[0]!,
    target: "div \"forged worst\""
  };
  assert.throws(() => assertCaliforniaSignatureLayoutSettleEvidence(wrongWorst),
    /worst record does not recompute/);

  const wrongCount = structuredClone(settledEvidence);
  wrongCount.hardenedTextRawScan.checkedTextCount = 2;
  assert.throws(() => assertCaliforniaSignatureLayoutSettleEvidence(wrongCount),
    /checked-count does not match raw evidence/);

  const duplicateTarget = structuredClone(settledEvidence);
  duplicateTarget.hardenedTextRawScan.evidence.push(
    structuredClone(duplicateTarget.hardenedTextRawScan.evidence[0]!)
  );
  duplicateTarget.hardenedTextRawScan.checkedTextCount = 2;
  assert.throws(() => assertCaliforniaSignatureLayoutSettleEvidence(duplicateTarget),
    /duplicate targets/);

  const injectedIssue = structuredClone(settledEvidence);
  injectedIssue.hardenedTextRawScan.issues.push({
    code: "insufficient-contrast",
    message: "synthetic injected issue",
    target: injectedIssue.hardenedTextRawScan.evidence[0]!.target
  });
  assert.throws(() => assertCaliforniaSignatureLayoutSettleEvidence(injectedIssue),
    /raw-evidence digest does not recompute|finding count does not recompute/);
});

test("pre/post root, control, and geometry fences reject any audit-time drift", () => {
  for (const [field, expectedPattern] of [
    ["postRootStateSha256", /root state drifted/],
    ["postControlStateSha256", /controls drifted/],
    ["postGeometryVisibilitySha256", /geometry drifted/]
  ] as const) {
    const drifted = structuredClone(settledEvidence);
    drifted[field] = "f".repeat(64);
    assert.throws(() => assertCaliforniaSignatureLayoutSettleEvidence(drifted), expectedPattern,
      `${field} drift must fail closed`);
  }
});

test("duplicate logical layout endpoints reject even when measured settle evidence differs", () => {
  const first = record({ layoutSettleEvidence: settledEvidence, phase: "layout" });
  const second = record({
    layoutSettleEvidence: { ...settledEvidence, geometryVisibilitySha256: "b".repeat(64) },
    phase: "layout"
  });
  assert.equal(first.key, second.key, "measured geometry must not enter the logical coverage key");
  assert.notEqual(first.layoutSettleEvidenceSha256, second.layoutSettleEvidenceSha256);
  assert.throws(() => snapshotCaliforniaSignatureExhaustiveEvidence([first, second]), /duplicate exact keys/);
});

test("altered layout settle payload rejects its separately durable integrity digest", () => {
  const evidence = record({ layoutSettleEvidence: settledEvidence, phase: "layout" });
  const altered = {
    ...evidence,
    layoutSettleEvidence: { ...settledEvidence, geometryVisibilitySha256: "c".repeat(64) }
  };
  assert.throws(() => validateCaliforniaSignatureEvidenceRecords({ evidence: [altered], manifest }),
    /layout settle evidence integrity digest drifted/);
});

test("browser discovery refuses to start without the source expected-vs-runtime IR provider", async () => {
  await assert.rejects(() => missingCaliforniaSignatureSourceExpectedProvider.assertReady(manifest),
    /source expected-vs-runtime IR provider not installed/);
});

test("exhaustive UI acceptance does not claim synthetic endpoint analytics durability", () => {
  const qaSource = readFileSync(
    new URL("./california-signature-exhaustive-qa.ts", import.meta.url),
    "utf8"
  );
  const specSource = readFileSync(
    new URL("./california-signature-exhaustive.spec.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(specSource, /missingCaliforniaSignatureDurabilityProvider|durabilityProvider/,
    "the exhaustive spec must not install a provider for product events endpoint activations do not emit");
  assert.doesNotMatch(qaSource, /CaliforniaSignatureDurabilityProvider|durabilityProvider/,
    "the exhaustive UI runner must not claim unrelated analytics durability as endpoint evidence");
});

test("Canvas runtime run identity is one explicit cross-worker value and never a module fallback", () => {
  const runId = "ca-signature-run-0123456789abcdef";
  assert.equal(requireCaliforniaSignatureCanvasRuntimeRunId(`  ${runId}  `), runId);
  assert.throws(() => requireCaliforniaSignatureCanvasRuntimeRunId(""),
    /externally generated high-entropy ID shared by every worker/);
  assert.throws(() => requireCaliforniaSignatureCanvasRuntimeRunId("worker-local-short"),
    /externally generated high-entropy ID shared by every worker/);
});

test("source IR exact-set comparison rejects a missing middle mode and DOM-invented endpoint", async () => {
  const sourceEndpoints = site.endpointTargets.flatMap((target) =>
    Array.from({ length: target.expectedMultiplicity }, (_, index) => ({
      instanceKey: `${target.key}:${index}`,
      sourceTargetKey: target.key,
      value: target.sourceExpression || target.name
    }))
  );
  const activationEndpoints = sourceEndpoints.map((_, index) => `source:${index}`);
  const runtimeControl = (
    instanceKey: string,
    endpoints = activationEndpoints
  ): CaliforniaSignatureRuntimeControl => ({
    checked: null,
    disabled: false,
    endpoints,
    instanceKey,
    kind: "press-button",
    max: null,
    maxLength: -1,
    min: null,
    minLength: -1,
    name: "",
    numericMidpoint: null,
    optionValues: [],
    pressed: false,
    sourceConditionKeys: site.sourceConditionKeys,
    sourceEndpoints,
    sourceSiteKey: site.siteKey,
    tagName: "button",
    step: null,
    type: "button",
    value: "",
    visible: true
  });
  const expected = ["first", "middle", "last"].map((instanceKey) => ({
    endpoints: activationEndpoints,
    instanceKey,
    kind: "press-button" as const,
    numericMidpoint: null,
    sourceConditionKeys: site.sourceConditionKeys,
    sourceEndpoints,
    sourceSiteKey: site.siteKey
  }));
  const provider: CaliforniaSignatureSourceExpectedProvider = {
    async activeEndpoints({ control }) { return control.endpoints; },
    async activateNonFormEndpoint() {},
    async assertReady() {},
    async branchEndpoints() { return ["activate"]; },
    async expectedControls() { return expected; },
    async navigationContract() {
      return { answerSiteKey: site.siteKey, backSiteKey: `${site.siteKey}:back`, nextSiteKey: `${site.siteKey}:next` };
    },
    async resolveRuntimeControls({ controls }) { return controls; },
    async settleEndpoint() {}
  };
  const context = { bench, branchPath: [], stepKey: step.key };
  await assert.rejects(() => assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: [runtimeControl("first"), runtimeControl("last")],
    context,
    provider
  }), /source expected vs runtime actual is not exact.*middle/);
  await assert.rejects(() => assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: [
      runtimeControl("first"),
      runtimeControl("middle", activationEndpoints.map((endpoint, index) =>
        index === Math.floor(activationEndpoints.length / 2) ? "dom-invented" : endpoint)),
      runtimeControl("last")
    ],
    context,
    provider
  }), /source expected vs runtime actual is not exact.*dom-invented/);
});

test("source-inactive early endpoint remains exact and first source-active later step schedules activation", async () => {
  const control = syntheticExactControl();
  const provider = syntheticActiveProvider(control, (stepKey) =>
    stepKey === "authored-early" ? [] : [control.endpoints[0]]
  );
  const earlyContext = { bench, branchPath: [], stepKey: "authored-early" };
  await assert.doesNotReject(() => assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: [control],
    context: earlyContext,
    provider
  }), "inactive endpoints must not remove their controls from the exact contract");
  assert.deepEqual(await resolveCaliforniaSignatureActiveEndpointPairs({
    context: earlyContext,
    control,
    provider
  }), []);

  const laterPairs = await resolveCaliforniaSignatureActiveEndpointPairs({
    context: { bench, branchPath: [], stepKey: "authored-first-active" },
    control,
    provider
  });
  assert.deepEqual(laterPairs, [{
    endpoint: control.endpoints[0],
    sourceEndpoint: control.sourceEndpoints[0]
  }]);
});

test("source-declared inactive empty select stays present and disabled without inventing endpoints", async () => {
  const selectBench = manifest.benches.find((candidate) =>
    candidate.controlSites.some((candidateSite) =>
      candidateSite.kind === "select" &&
      candidateSite.endpointTargets.every((target) => target.multiplicityIsExact)
    )
  );
  assert.ok(selectBench, "source manifest must contain an exact-multiplicity select canary");
  const selectSite = selectBench.controlSites.find((candidateSite) =>
    candidateSite.kind === "select" &&
    candidateSite.endpointTargets.every((target) => target.multiplicityIsExact)
  )!;
  const inactiveControl: CaliforniaSignatureRuntimeControl = {
    checked: null,
    disabled: true,
    endpoints: [],
    instanceKey: "state-empty-disabled-select",
    kind: "select",
    max: null,
    maxLength: -1,
    min: null,
    minLength: -1,
    name: "",
    numericMidpoint: null,
    optionValues: [],
    pressed: null,
    sourceConditionKeys: selectSite.sourceConditionKeys,
    sourceEndpoints: [],
    sourceSiteKey: selectSite.siteKey,
    tagName: "select",
    step: null,
    type: "select",
    value: "",
    visible: true
  };
  const provider = syntheticActiveProvider(inactiveControl, () => []);
  const context = {
    bench: selectBench,
    branchPath: [],
    stepKey: selectBench.lessonSteps.at(-1)!.key
  };
  await assert.doesNotReject(() => assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: [inactiveControl],
    context,
    provider
  }));
  assert.deepEqual(await resolveCaliforniaSignatureActiveEndpointPairs({
    context,
    control: inactiveControl,
    provider
  }), []);

  await assert.rejects(() => assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: [{ ...inactiveControl, disabled: false }],
    context,
    provider
  }), /source-inactive empty endpoint control must remain disabled/);
});

test("unknown and duplicate source-active endpoints reject before activation discovery", async () => {
  const control = syntheticExactControl();
  const context = { bench, branchPath: [], stepKey: "authored-state" };
  await assert.rejects(() => resolveCaliforniaSignatureActiveEndpointPairs({
    context,
    control,
    provider: syntheticActiveProvider(control, () => ["source:not-authored"])
  }), /unknown active endpoint/);
  await assert.rejects(() => resolveCaliforniaSignatureActiveEndpointPairs({
    context,
    control,
    provider: syntheticActiveProvider(control, () => [control.endpoints[0], control.endpoints[0]])
  }), /repeats an active endpoint/);
});

test("the axis contract is exactly two viewports by three locales by two themes", () => {
  const ids = (["desktop", "mobile"] as const).flatMap((viewport) =>
    (["en", "zh", "zh-Hans"] as const).flatMap((language) =>
      (["light", "dark"] as const).map((theme) => buildCaliforniaSignatureAxis(viewport, language, theme).id)
    )
  );
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  assert.deepEqual(
    [...CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS].sort(),
    [...ids].sort(),
    "every endpoint layout/contrast state must run on all twelve axes, including dark mode"
  );
});

test("artifact aggregation freezes the independent 51-package by two-project matrix", () => {
  const frozenPackages = buildCaliforniaSignatureExhaustivePackages(
    manifest,
    CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE
  );
  assert.equal(frozenPackages.length, 51,
    "the reviewed four-bench package partition drifted from its frozen count");
  assert.deepEqual(
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    ["desktop-chrome", "mobile-chrome"],
    "the exhaustive artifact gate requires both frozen Chromium projects"
  );
  const runId = "ca-signature-independent-matrix-0123456789";
  const expectedMatrix = buildCaliforniaSignatureExpectedArtifactMatrix({
    packages: frozenPackages.map((workPackage) => ({
      benchIds: workPackage.benches.map(({ bench }) => bench.benchId),
      packageId: workPackage.id
    })),
    projects: CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
    runId
  });
  const independentlyEnumeratedKeys = CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.flatMap((projectName) =>
    frozenPackages.map((workPackage) => `${projectName}\0${workPackage.id}\0${0}`)
  ).sort();
  assert.equal(expectedMatrix.size, 102,
    "the official ledger must contain exactly 51 packages by two projects");
  assert.deepEqual([...expectedMatrix.keys()].sort(), independentlyEnumeratedKeys,
    "the expected artifact matrix must come from the frozen source package/project contract");
});

test("acceptance snapshot is explicitly pinned to the deterministic source contract", async () => {
  assert.match(CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT.keysSha256,
    /^[a-f0-9]{64}$/,
    "reviewed runtime snapshot must pin one exact SHA-256 digest");
  assert.ok(CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT.keyCount > 0,
    "reviewed runtime snapshot must pin one positive source-derived key count");
  const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
  assert.deepEqual(
    deriveCaliforniaSignatureRuntimeSnapshotFromSource({ manifest, oracle }),
    CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT,
    "reviewed runtime snapshot must exactly equal the independent source-derived projection"
  );
});

test("aggregate rejects legacy v1 through v7 artifacts after framed streaming expansion", () => {
  const legacy = /schema version must be 8.*v1-v7 evidence lacks/;
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 1 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 2 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 3 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 4 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 5 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 6 }, "legacy fixture"),
    legacy);
  assert.throws(() => assertCaliforniaSignatureExhaustiveArtifactSchema({ schemaVersion: 7 }, "legacy fixture"),
    legacy);
});

test("runtime ledger aggregation remains red when a real evidence directory is requested before pinning", async () => {
  const configured = process.env.CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR?.trim();
  if (!configured) {
    assert.throws(() => assertReviewedCaliforniaSignatureExhaustiveSnapshot([record()]),
      /reviewed runtime snapshot drifted/);
    return;
  }
  const runtimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId();
  const markers = await assertCaliforniaSignatureQaRuntimeMarker({ manifest });
  const expectedOrigin = process.env.CA_SIGNATURE_EXHAUSTIVE_ORIGIN?.trim();
  assert.ok(expectedOrigin, "CA_SIGNATURE_EXHAUSTIVE_ORIGIN is required for final aggregation");
  const expectedIdentity = californiaSignatureArtifactRunIdentityFromEnvironment({
    actualOrigin: expectedOrigin,
    markers,
    runtimeRunId
  });
  const allPackages = buildCaliforniaSignatureExhaustivePackages(
    manifest,
    CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE
  );
  const shardTotal = parseCaliforniaSignatureShard()?.total ?? 1;
  const expectedMatrix = buildCaliforniaSignatureExpectedArtifactMatrix({
    packages: allPackages.map((workPackage) => ({
      benchIds: workPackage.benches.map(({ bench }) => bench.benchId),
      packageId: workPackage.id
    })),
    runId: expectedIdentity.runId,
    shardTotal
  });
  const sourceEvidenceOracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
  const externalExpectations = buildCaliforniaSignatureExternalEvidenceExpectations({
    expectedOrigin: expectedIdentity.origin,
    expectedRuntimeRunId: expectedIdentity.runtimeRunId,
    manifest
  });
  const validationContexts = new Map(allPackages.map((workPackage) => [
    workPackage.id,
    buildCaliforniaSignatureArtifactValidationContext({
      expectedBenchIds: workPackage.benches.map(({ bench }) => bench.benchId),
      externalExpectations,
      manifest,
      sourceEvidenceOracle
    })
  ]));
  const producerSuccessSha256 = process.env.CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256?.trim() ?? "";
  assert.match(producerSuccessSha256, /^[a-f0-9]{64}$/,
    "CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256 must carry the in-memory producer receipt");
  const sealed = await sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity,
    expectedMatrix,
    ledgerRoot: configured,
    producerSuccessReceipt: {
      fileName: CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
      sha256: producerSuccessSha256
    },
    async validateAggregate(artifacts) {
      const aggregate = await validateCaliforniaSignatureStreamingAggregate({
        expectedIdentity,
        expectedMatrix,
        externalExpectations,
        loaded: artifacts,
        manifest,
        sourceEvidenceOracle,
        validationContexts
      });
      // This intentionally throws until the reviewed constant is replaced with
      // the digest printed after a complete no-filter discovery run. A run is
      // sealed only after this reviewed acceptance and is revalidated from disk.
      assertReviewedCaliforniaSignatureStreamingAggregate(aggregate);
    },
    validationContexts
  });
  assert.equal(sealed.sealReceipt.fileName, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
    "California signature finalizer returned the wrong terminal seal filename");
  console.log(
    `California signature exhaustive coverage sealed: ${sealed.artifacts.length} artifacts; ` +
    `${sealed.sealReceipt.fileName}=${sealed.sealReceipt.sha256}`
  );
});
