import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { chromium, type Browser, type Locator, type Request } from "@playwright/test";
import sharp from "sharp";
import { installCaliforniaCanvasTextAudit } from "./california-canvas-text-audit";
import {
  CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasPaintSite
} from "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION,
  californiaCanvasGraphicsFinalCompositorBindingSha256,
  installCaliforniaCanvasGraphicsRuntime,
  verifyCaliforniaCanvasGraphicsContrastConsumeAck,
  verifyCaliforniaCanvasGraphicsStateEvidence,
  type CaliforniaCanvasGraphicsCanvasEvidence,
  type CaliforniaCanvasGraphicsContrastConsumeAck,
  type CaliforniaCanvasGraphicsFinalCompositorProof,
  type CaliforniaCanvasGraphicsPaintEnvironmentSnapshot,
  type CaliforniaCanvasGraphicsSiteEvidence,
  type CaliforniaCanvasGraphicsStateEvidence
} from "./california-canvas-graphics-runtime";
import { CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256 } from "./california-visualization-contrast-audit";
import {
  CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
  buildCaliforniaVisualizationCoverageExpectedArtifactMatrix,
  buildCaliforniaVisualizationCoverageRunIdentity,
  sealCaliforniaVisualizationCoverageArtifactRun
} from "./california-visualization-artifact-lifecycle";
import {
  CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
  CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
  auditCaliforniaPremiumWebGlGraphicsContracts,
  auditCaliforniaPremiumWebGlRetainedContrastEvidence,
  auditCaliforniaPremiumWebGlStateSequence,
  californiaPremiumWebGlCompositorBindingSha256,
  californiaPremiumWebGlExpectedSceneProjectionForLab,
  type CaliforniaPremiumWebGlExpectedTargetContract,
  type CaliforniaPremiumWebGlScreenshotTargetEvidence
} from "./california-premium-webgl-graphics-contract";
import { MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT } from "../../components/visualizations/three/manim/mathSceneVisualPalette";
import {
  CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO,
  CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
  CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
  CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT,
  CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS,
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME,
  CALIFORNIA_FORMAL_PROJECT_NAMES,
  CALIFORNIA_FORMAL_TEST_TIMEOUT_MS,
  CaliforniaBrowserDiagnostics,
  assertCaliforniaFormalQaConfig,
  buildCaliforniaCoverageProvenance,
  buildCaliforniaQaWorkItems,
  californiaQaPackageTimeoutMs,
  californiaVisualizationQaInventory,
  captureSignatureBenchDefaultState,
  collectVisualizationUiFindings,
  compareSignatureResetVisuals,
  readCaliforniaQaConfig,
  resetSignatureBench,
  runCaliforniaQaAction,
  type CaliforniaCoverageProvenance,
  type CaliforniaFormalProjectEvidence,
  type CaliforniaFormalProjectName,
  type CaliforniaPremiumWebGlContrastEvidence
} from "./california-visualization-qa-helpers";

const EXPECTED_RECOVERY_DEADLINE_MS = 60_000;
const EXPECTED_UX_READY_MS = 30_000;
const MIN_PLAYING_MEAN_DIFF_RATIO = 0.001;
const MIN_PLAYING_CHANGED_PIXEL_RATIO = 0.005;
const MAX_RESET_MEAN_DIFF_RATIO = 0.08;
const MAX_RESET_CHANGED_PIXEL_RATIO = 0.4;

const californiaCanvasGraphicsSourceContract = buildCaliforniaCanvasGraphicsSourceContract();
const californiaCanvasEssentialPaintSites = californiaCanvasGraphicsSourceContract.paintSites
  .filter((site) => site.role === "essential");
const californiaCanvasEssentialSourceSiteKeys = californiaCanvasEssentialPaintSites
  .map((site) => site.sourceSiteKey)
  .sort();

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function digestKeys(keys: readonly string[]) {
  return sha256(keys.slice().sort().join("\n"));
}

function groupByKey<K, V>(values: readonly V[], keyFor: (value: V) => K) {
  const grouped = new Map<K, V[]>();
  for (const value of values) {
    const key = keyFor(value);
    const entries = grouped.get(key) ?? [];
    entries.push(value);
    grouped.set(key, entries);
  }
  return grouped;
}

const expectedAxisIds = Object.values(CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT).flat();
const expectedGradeIds = Array.from(new Set(
  californiaVisualizationQaInventory.labs.map((lab) => lab.grade)
)).sort();
const EXPECTED_DIRECTORY_RECORDS = californiaVisualizationQaInventory.visitCount * expectedAxisIds.length;
const EXPECTED_PREMIUM_RECORDS = californiaVisualizationQaInventory.premiumLabs.length * expectedAxisIds.length;
const californiaPremiumWebGlGraphicsAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
assert.deepEqual(
  californiaPremiumWebGlGraphicsAudit.issues,
  [],
  "California premium WebGL source contract must be green before durable ledger verification"
);
type UiGateMetric = {
  completed: boolean;
  findingCount: number;
  state: string;
};

type CanvasGateMetric = {
  canvasCount: number;
  clippedTextLayerCount: number;
  completed: boolean;
  findingCount: number;
  state: string;
  textLayerCount: number;
};

type ContrastGateMetric = {
  auditedLabelCount: number;
  canvasSurfaceCount: number;
  candidateLabelCount: number;
  completed: boolean;
  evidenceSha256: string;
  executableCanvasSurfaceCount: number;
  executableWebGlCanvasSurfaceCount: number;
  findingCount: number;
  geometryVisibilitySha256: string;
  hardenedTextAlgorithmSha256: string;
  hardenedTextAuditedCount: number;
  hardenedTextCandidateCount: number;
  hardenedTextCompleted: boolean;
  hardenedTextEvidenceSha256: string;
  hardenedTextFindingCount: number;
  hardenedTextMinRatio: number | null;
  hardenedTextWorstLabel: string | null;
  hardenedTextWorstRequiredRatio: number | null;
  minRatio: number | null;
  stableRafSnapshots: number;
  state: string;
  worstKind: string | null;
  worstLabel: string | null;
  webGlCanvasSurfaceCount: number;
};

type PremiumWebGlContrastMetric = CaliforniaPremiumWebGlContrastEvidence;

type CanvasGraphicsNodeAck = {
  consumed: true;
  evidenceSha256: string;
  receiptId: string;
  runtimeRunId: string;
};

type CanvasGraphicsGateMetric = {
  canvasGraphicsContrastAck: CaliforniaCanvasGraphicsContrastConsumeAck;
  canvasGraphicsEvidence: CaliforniaCanvasGraphicsStateEvidence;
  canvasGraphicsNodeAck: CanvasGraphicsNodeAck;
};

type PremiumFrameMetric = {
  attachmentName: string;
  changedPixelRatioFromDefault: number;
  contextKind: "webgl" | "webgl2";
  entropyBits: number;
  foregroundRatio: number;
  height: number;
  meanAbsoluteDiffRatioFromDefault: number;
  opaquePixelRatio: number;
  playbackStateAfterCapture: "paused" | "playing";
  playbackStateBeforeCapture: "paused" | "playing";
  pixelCount: number;
  recorderSignature: string;
  sha256: string;
  state: "default" | "playing" | "reset";
  width: number;
};

type StructuredRecordEvidence = {
  canvasGraphicsGates: CanvasGraphicsGateMetric[];
  canvasGates: CanvasGateMetric[];
  contrastGates: ContrastGateMetric[];
  premium?: {
    control: {
      documentLanguage: string;
      finalState: "paused";
      initialState: "paused";
      labelsVerified: boolean;
      learnerPresentation: boolean;
      playbackAdvanced: boolean;
      playingStateObserved: boolean;
      resetRewound: boolean;
      resetState: "paused";
      visibleAuthoringControlCount: number;
    };
    frames: PremiumFrameMetric[];
    surfaceScreenshots: Array<{ attachmentName: string; state: "default" | "playing" | "reset" }>;
    webGlContrast: PremiumWebGlContrastMetric[];
  };
  reset?: {
    activeBenchRestored: boolean;
    canvasReady: boolean;
    canvasReplaced: boolean;
    defaultControlFingerprint: string;
    defaultModelFingerprint: string;
    defaultSurfaceFingerprint: string;
    defaultSurfaceStable: boolean;
    restoredControlFingerprint: string;
    restoredDefault: boolean;
    restoredModelFingerprint: string;
    restoredSurfaceFingerprint: string;
    restoredSurfaceStable: boolean;
    surfaceChangedPixelRatio: number | null;
    surfaceComparison: "dynamic-semantic" | "stable-pixel-tolerance";
    surfaceEdgeMismatchRatio: number | null;
    surfaceMeanAbsoluteDiffRatio: number | null;
  };
  signatureControl?: {
    changedModelFingerprint: string;
    defaultModelFingerprint: string;
    defaultSemanticFingerprint: string;
    kind: string;
    label: string;
    modelChanged: boolean;
    restoration: "reset" | "self";
    restored: boolean;
  };
  uiGates: UiGateMetric[];
};

type CoverageProvenance = CaliforniaCoverageProvenance;

type CoverageRecord = {
  attempted: boolean;
  auditEvidence?: string[];
  axisId: string;
  benchId: string;
  detail?: string;
  durationMs?: number;
  evidence?: StructuredRecordEvidence;
  labId: string;
  routeKind: "directory" | "premium-direct";
  status: "failed" | "passed" | "pending";
};

type CoverageArtifact = {
  attachmentsDurable: boolean;
  axes: string[];
  budgets: {
    packageTimeoutMs: number;
    recoveryDeadlineMs: number;
    uxReadyMs: number;
  };
  createdAt: string;
  expected: number;
  execution: {
    repeatEachIndex: number;
    retry: number;
  };
  project: string;
  projectEvidence: CaliforniaFormalProjectEvidence;
  provenance: CoverageProvenance;
  packageIssues: string[];
  records: CoverageRecord[];
  schemaVersion: number;
  selection: {
    grades: string[];
    includePremiumDirect: boolean;
    labIds: string[];
    shard: { index: number; total: number } | null;
  };
  summary: {
    attempted: number;
    failed: number;
    passed: number;
    pending: number;
    unattempted: number;
  };
  terminalQuiescenceByAxis?: Array<{
    axisId: string;
    diagnosticCount: number;
    pendingRequestCount: number;
    quiescent: boolean;
    waitedMs: number;
  }>;
  workItem: {
    id: string;
    kind: "directory" | "premium-direct";
    visitCount: number;
  };
};

function recordKey(record: Pick<CoverageRecord, "axisId" | "benchId" | "labId" | "routeKind">) {
  return `${record.axisId}:${record.routeKind}:${record.labId}:${record.benchId}`;
}

type ExpectedWorkItemContract = {
  id: string;
  kind: CoverageArtifact["workItem"]["kind"];
  targets: Array<{ benchId: string; labId: string }>;
  visitCount: number;
};

function expectedWorkItemContracts(config: Parameters<typeof buildCaliforniaQaWorkItems>[0]) {
  return new Map(buildCaliforniaQaWorkItems({ ...config, shard: null }).map((workItem) => {
    const targets = workItem.labs.flatMap((lab) => workItem.kind === "directory"
      ? [lab.assignment.primary, ...(lab.assignment.related ?? [])].map((benchId) => ({ benchId, labId: lab.labId }))
      : [{ benchId: "premium-3d", labId: lab.labId }]
    );
    assert.equal(targets.length, workItem.visitCount, `${workItem.id}: generated work-item target count drifted`);
    return [workItem.id, {
      id: workItem.id,
      kind: workItem.kind,
      targets,
      visitCount: workItem.visitCount
    }] as const;
  }));
}

function expectedCoverageKeys() {
  const directoryTargets = californiaVisualizationQaInventory.labs.flatMap((lab) =>
    [lab.assignment.primary, ...(lab.assignment.related ?? [])].map((benchId) => ({
      benchId,
      labId: lab.labId,
      routeKind: "directory" as const
    }))
  );
  const premiumTargets = californiaVisualizationQaInventory.premiumLabs.map((lab) => ({
    benchId: "premium-3d",
    labId: lab.labId,
    routeKind: "premium-direct" as const
  }));
  assert.equal(
    directoryTargets.length,
    californiaVisualizationQaInventory.visitCount,
    "authoritative California directory target count drifted"
  );
  assert.equal(
    premiumTargets.length,
    californiaVisualizationQaInventory.premiumLabs.length,
    "authoritative California premium target count drifted"
  );
  return new Set(expectedAxisIds.flatMap((axisId) =>
    [...directoryTargets, ...premiumTargets].map((target) => recordKey({ axisId, ...target }))
  ));
}

function compactKeys(keys: string[]) {
  return keys.slice(0, 12).join(", ") + (keys.length > 12 ? ` ... +${keys.length - 12}` : "");
}

function exactStateMap<T extends { state: string }>(
  values: T[] | undefined,
  states: readonly string[],
  label: string
) {
  assert.ok(values, `missing ${label}`);
  assert.deepEqual(
    values.map((value) => value.state).sort(),
    [...states].sort(),
    `missing or extra ${label}`
  );
  return new Map(values.map((value) => [value.state, value]));
}

function verifyUiGateEvidence(record: CoverageRecord, states: readonly string[], key: string) {
  const gates = exactStateMap(record.evidence?.uiGates, states, `${key} UI gate`);
  for (const state of states) {
    const gate = gates.get(state)!;
    assert.equal(gate.completed, true, `${key}: ${state} UI gate did not complete`);
    assert.equal(gate.findingCount, 0, `${key}: ${state} UI gate recorded findings`);
  }
}

function verifyContrastGateEvidence(record: CoverageRecord, states: readonly string[], key: string) {
  const gates = exactStateMap(record.evidence?.contrastGates, states, `${key} numeric contrast gate`);
  for (const state of states) {
    const gate = gates.get(state)!;
    assert.equal(gate.completed, true, `${key}: ${state} contrast gate did not complete`);
    assert.equal(gate.findingCount, 0, `${key}: ${state} contrast gate recorded findings`);
    assert.ok(gate.candidateLabelCount > 0, `${key}: ${state} contrast gate found no candidates`);
    assert.ok(gate.auditedLabelCount > 0, `${key}: ${state} contrast gate measured no candidates`);
    assert.ok(gate.auditedLabelCount <= gate.candidateLabelCount,
      `${key}: ${state} contrast gate audited more labels than it discovered`);
    assert.match(gate.evidenceSha256, /^[a-f0-9]{64}$/,
      `${key}: ${state} contrast evidence digest is malformed`);
    assert.ok(Number.isInteger(gate.canvasSurfaceCount) && gate.canvasSurfaceCount >= 0,
      `${key}: ${state} contrast gate has an invalid Canvas surface count`);
    assert.ok(
      Number.isInteger(gate.executableCanvasSurfaceCount) &&
      gate.executableCanvasSurfaceCount >= 0 &&
      gate.executableCanvasSurfaceCount <= gate.canvasSurfaceCount,
      `${key}: ${state} contrast gate executable Canvas count exceeds discovered Canvas surfaces`
    );
    assert.ok(gate.executableWebGlCanvasSurfaceCount <= gate.webGlCanvasSurfaceCount,
      `${key}: ${state} contrast gate executable WebGL count exceeds discovered WebGL surfaces`);
    assert.match(gate.geometryVisibilitySha256, /^[a-f0-9]{64}$/,
      `${key}: ${state} contrast settle digest is malformed`);
    assert.equal(gate.hardenedTextCompleted, true,
      `${key}: ${state} hardened text contrast gate did not complete`);
    assert.equal(gate.hardenedTextAlgorithmSha256, CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
      `${key}: ${state} hardened text contrast algorithm is stale or unreviewed`);
    assert.ok(gate.hardenedTextCandidateCount > 0,
      `${key}: ${state} hardened text contrast gate found no candidates`);
    assert.ok(gate.hardenedTextAuditedCount > 0,
      `${key}: ${state} hardened text contrast gate measured no candidates`);
    assert.ok(gate.hardenedTextAuditedCount <= gate.hardenedTextCandidateCount,
      `${key}: ${state} hardened text contrast gate audited more labels than it discovered`);
    assert.equal(gate.hardenedTextFindingCount, 0,
      `${key}: ${state} hardened text contrast gate recorded findings`);
    assert.match(gate.hardenedTextEvidenceSha256, /^[a-f0-9]{64}$/,
      `${key}: ${state} hardened text evidence digest is malformed`);
    assert.ok(gate.hardenedTextMinRatio !== null && gate.hardenedTextMinRatio >= 3,
      `${key}: ${state} hardened text contrast gate lacks a passing measured ratio`);
    assert.ok(gate.hardenedTextWorstLabel?.trim(),
      `${key}: ${state} hardened text contrast gate lacks worst-label attribution`);
    assert.ok(
      gate.hardenedTextWorstRequiredRatio === 3 || gate.hardenedTextWorstRequiredRatio === 4.5,
      `${key}: ${state} hardened text contrast gate lacks an exact required ratio`
    );
    assert.ok(gate.stableRafSnapshots >= 3,
      `${key}: ${state} contrast gate lacks three stable requestAnimationFrame snapshots`);
    assert.ok(gate.minRatio !== null && gate.minRatio >= 3,
      `${key}: ${state} contrast gate lacks a passing measured ratio`);
    assert.ok(gate.worstKind?.trim(), `${key}: ${state} contrast gate lacks worst-kind attribution`);
    assert.ok(gate.worstLabel?.trim(), `${key}: ${state} contrast gate lacks worst-label attribution`);
  }
}

function verifyDirectoryCanvasGraphicsGate(
  gate: CanvasGraphicsGateMetric,
  record: CoverageRecord,
  expectedState: "default" | "after-control" | "after-reset",
  key: string
) {
  const evidence = gate.canvasGraphicsEvidence;
  const contrastAck = gate.canvasGraphicsContrastAck;
  const nodeAck = gate.canvasGraphicsNodeAck;
  assert.ok(evidence && contrastAck && nodeAck,
    `${key}: ${expectedState} Canvas graphics gate is not a full raw three-part receipt`);
  assert.equal(evidence.stateKey, expectedState,
    `${key}: ${expectedState} Canvas graphics evidence state is misattributed`);
  assert.equal(evidence.surfaceKey, "signature-canvas",
    `${key}: ${expectedState} Canvas graphics evidence targets the wrong surface`);
  assert.ok(evidence.canvases.length > 0,
    `${key}: ${expectedState} Canvas graphics evidence contains no executable 2-D Canvas`);
  assert.ok(evidence.canvases.every((canvas) => canvas.benchId === record.benchId),
    `${key}: ${expectedState} Canvas graphics evidence is bound to another bench`);

  const lab = californiaVisualizationQaInventory.labs.find((candidate) => candidate.labId === record.labId);
  assert.ok(lab, `${key}: ${expectedState} Canvas graphics evidence references an unknown lab`);
  const capturedUrl = new URL(evidence.capturedUrl);
  assert.equal(capturedUrl.pathname, "/student/tools/visualizations",
    `${key}: ${expectedState} Canvas graphics evidence was not captured on the directory route`);
  assert.equal(capturedUrl.searchParams.get("lab"), record.labId,
    `${key}: ${expectedState} Canvas graphics capture lab query is misattributed`);
  assert.equal(capturedUrl.searchParams.get("grade"), lab.grade,
    `${key}: ${expectedState} Canvas graphics capture grade query drifted`);
  assert.equal(capturedUrl.searchParams.get("track"), "all",
    `${key}: ${expectedState} Canvas graphics capture track query drifted`);
  assert.deepEqual([...capturedUrl.searchParams.keys()].sort(), ["grade", "lab", "track"],
    `${key}: ${expectedState} Canvas graphics capture contains unexpected query state`);

  const expectation = {
    benchId: record.benchId,
    capturedUrl: evidence.capturedUrl,
    maxAgeMs: 0,
    nowEpochMs: evidence.capturedAtEpochMs,
    runtimeRunId: evidence.runtimeRunId,
    stateKey: expectedState,
    surfaceKey: "signature-canvas"
  } as const;
  assert.deepEqual(
    verifyCaliforniaCanvasGraphicsStateEvidence(
      evidence,
      expectation,
      californiaCanvasGraphicsSourceContract
    ),
    [],
    `${key}: ${expectedState} Canvas graphics evidence failed exact source/raster revalidation`
  );
  assert.deepEqual(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      contrastAck,
      evidence,
      {
        ...expectation,
        nowEpochMs: contrastAck.acknowledgedAtEpochMs
      },
      californiaCanvasGraphicsSourceContract
    ),
    [],
    `${key}: ${expectedState} Canvas browser contrast ACK is forged or identity-drifted`
  );
  assert.deepEqual(
    Object.keys(nodeAck).sort(),
    ["consumed", "evidenceSha256", "receiptId", "runtimeRunId"],
    `${key}: ${expectedState} Canvas Node ACK schema drifted`
  );
  assert.equal(nodeAck.consumed, true,
    `${key}: ${expectedState} Canvas graphics receipt was not consumed by Node`);
  assert.equal(nodeAck.receiptId, evidence.receiptId,
    `${key}: ${expectedState} Canvas Node ACK receipt identity drifted`);
  assert.equal(nodeAck.evidenceSha256, evidence.evidenceSha256,
    `${key}: ${expectedState} Canvas Node ACK evidence identity drifted`);
  assert.equal(nodeAck.runtimeRunId, evidence.runtimeRunId,
    `${key}: ${expectedState} Canvas Node ACK runtime identity drifted`);
  return gate;
}

function verifyDirectoryEvidence(record: CoverageRecord, key: string) {
  verifyUiGateEvidence(record, ["default", "after-control", "after-reset"], key);
  verifyContrastGateEvidence(record, ["default", "after-control", "after-reset"], key);
  for (const gate of record.evidence!.contrastGates) {
    assert.equal(gate.canvasSurfaceCount, 0,
      `${key}: ${gate.state} segmented DOM/SVG contrast gate unexpectedly classified Canvas`);
    assert.equal(gate.executableCanvasSurfaceCount, 0,
      `${key}: ${gate.state} segmented DOM/SVG contrast gate consumed Canvas executable evidence`);
    assert.equal(gate.webGlCanvasSurfaceCount, 0,
      `${key}: ${gate.state} directory signature gate unexpectedly classified WebGL`);
    assert.equal(gate.executableWebGlCanvasSurfaceCount, 0,
      `${key}: ${gate.state} directory signature gate forged executable WebGL evidence`);
  }
  const canvasGraphicsGates = exactStateMap(
    record.evidence?.canvasGraphicsGates?.map((gate) => ({
      ...gate,
      state: gate.canvasGraphicsEvidence.stateKey
    })),
    ["default", "after-control", "after-reset"],
    `${key} Canvas graphics one-shot gate`
  );
  const verifiedCanvasGraphicsGates = (["default", "after-control", "after-reset"] as const)
    .map((state) => verifyDirectoryCanvasGraphicsGate(
      canvasGraphicsGates.get(state)!,
      record,
      state,
      key
    ));
  const canvasGates = exactStateMap(
    record.evidence?.canvasGates,
    ["default", "after-control", "after-reset"],
    `${key} Canvas gate`
  );
  for (const state of ["default", "after-control", "after-reset"] as const) {
    const gate = canvasGates.get(state)!;
    assert.equal(gate.completed, true, `${key}: ${state} Canvas gate did not complete`);
    assert.equal(gate.findingCount, 0, `${key}: ${state} Canvas gate recorded findings`);
    assert.ok(gate.canvasCount > 0, `${key}: ${state} Canvas gate observed no canvas`);
    assert.ok(gate.textLayerCount >= 0 && gate.clippedTextLayerCount >= 0, `${key}: invalid Canvas text metrics`);
  }
  const control = record.evidence?.signatureControl;
  assert.ok(control, `${key}: missing signature control evidence`);
  assert.ok(control.kind.trim() && control.label.trim(), `${key}: incomplete signature control evidence`);
  assert.equal(control.modelChanged, true, `${key}: missing deterministic control model-change`);
  assert.match(control.defaultModelFingerprint, /^[a-f0-9]{64}$/, `${key}: invalid default model fingerprint`);
  assert.match(control.changedModelFingerprint, /^[a-f0-9]{64}$/, `${key}: invalid changed model fingerprint`);
  assert.match(control.defaultSemanticFingerprint, /^[a-f0-9]{64}$/, `${key}: invalid default semantic fingerprint`);
  assert.notEqual(
    control.changedModelFingerprint,
    control.defaultModelFingerprint,
    `${key}: draw revision/form-only change did not alter the stable model fingerprint`
  );
  assert.equal(control.restored, true, `${key}: signature control state was not restored`);
  assert.ok(control.restoration === "self" || control.restoration === "reset", `${key}: invalid control restoration mode`);
  const reset = record.evidence?.reset;
  assert.ok(reset, `${key}: missing reset restoration evidence`);
  assert.equal(reset.canvasReplaced, true, `${key}: reset restoration did not replace the canvas`);
  assert.equal(reset.canvasReady, true, `${key}: reset restoration did not produce a ready canvas`);
  assert.equal(reset.activeBenchRestored, true, `${key}: reset restoration lost the active bench`);
  assert.equal(reset.restoredDefault, true, `${key}: reset restoration did not restore the default model`);
  for (const [label, fingerprint] of Object.entries({
    defaultControl: reset.defaultControlFingerprint,
    defaultModel: reset.defaultModelFingerprint,
    defaultSurface: reset.defaultSurfaceFingerprint,
    restoredControl: reset.restoredControlFingerprint,
    restoredModel: reset.restoredModelFingerprint,
    restoredSurface: reset.restoredSurfaceFingerprint
  })) {
    assert.match(fingerprint, /^[a-f0-9]{64}$/, `${key}: invalid ${label} reset fingerprint`);
  }
  assert.equal(
    reset.restoredControlFingerprint,
    reset.defaultControlFingerprint,
    `${key}: reset did not restore the measured default control fingerprint`
  );
  assert.equal(
    reset.restoredModelFingerprint,
    reset.defaultModelFingerprint,
    `${key}: reset did not restore the measured stable default model fingerprint`
  );
  assert.equal(
    control.defaultSemanticFingerprint,
    reset.defaultModelFingerprint,
    `${key}: control and reset evidence disagree about the default mathematical semantics fingerprint`
  );
  assert.equal(
    reset.restoredSurfaceStable,
    reset.defaultSurfaceStable,
    `${key}: reset changed the measured surface stability class`
  );
  if (reset.surfaceComparison === "stable-pixel-tolerance") {
    assert.equal(reset.defaultSurfaceStable, true, `${key}: stable reset comparison lacks a stable default surface`);
    assert.equal(reset.restoredSurfaceStable, true, `${key}: stable reset comparison lacks a stable restored surface`);
    assert.ok(
      reset.surfaceChangedPixelRatio !== null &&
      Number.isFinite(reset.surfaceChangedPixelRatio) &&
      reset.surfaceChangedPixelRatio >= 0 &&
      reset.surfaceChangedPixelRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO,
      `${key}: stable reset changed-pixel ratio exceeded tolerance`
    );
    assert.ok(
      reset.surfaceEdgeMismatchRatio !== null &&
      Number.isFinite(reset.surfaceEdgeMismatchRatio) &&
      reset.surfaceEdgeMismatchRatio >= 0 &&
      reset.surfaceEdgeMismatchRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
      `${key}: stable reset edge-mismatch ratio exceeded tolerance`
    );
    assert.ok(
      reset.surfaceMeanAbsoluteDiffRatio !== null &&
      Number.isFinite(reset.surfaceMeanAbsoluteDiffRatio) &&
      reset.surfaceMeanAbsoluteDiffRatio >= 0 &&
      reset.surfaceMeanAbsoluteDiffRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
      `${key}: stable reset mean visual difference exceeded tolerance`
    );
  } else {
    assert.equal(reset.surfaceComparison, "dynamic-semantic", `${key}: unknown reset surface comparison mode`);
    assert.ok(
      !reset.defaultSurfaceStable || !reset.restoredSurfaceStable,
      `${key}: dynamic reset comparison cannot replace available stable-pixel evidence`
    );
    assert.equal(reset.surfaceChangedPixelRatio, null, `${key}: dynamic reset comparison fabricated a changed-pixel ratio`);
    assert.equal(reset.surfaceEdgeMismatchRatio, null, `${key}: dynamic reset comparison fabricated an edge-mismatch ratio`);
    assert.equal(reset.surfaceMeanAbsoluteDiffRatio, null, `${key}: dynamic reset comparison fabricated a mean visual difference`);
  }
  return verifiedCanvasGraphicsGates;
}

function verifyDirectoryCanvasGraphicsAggregate(gates: readonly CanvasGraphicsGateMetric[]) {
  assert.ok(gates.length > 0, "full matrix contains no directory Canvas graphics receipts");
  const receiptIds = new Set<string>();
  const browserAckIdentities = new Set<string>();
  const nodeAckReceiptIds = new Set<string>();
  const runtimeRunIds = new Set<string>();
  const observedSourceSiteKeys = new Set<string>();
  for (const gate of gates) {
    const evidence = gate.canvasGraphicsEvidence;
    const browserAck = gate.canvasGraphicsContrastAck;
    const nodeAck = gate.canvasGraphicsNodeAck;
    assert.equal(receiptIds.has(evidence.receiptId), false,
      `duplicate Canvas graphics receipt across directory ledger: ${evidence.receiptId}`);
    receiptIds.add(evidence.receiptId);
    const browserAckIdentity = `${browserAck.receiptId}:${browserAck.ackNonce}`;
    assert.equal(browserAckIdentities.has(browserAckIdentity), false,
      `duplicate Canvas graphics browser ACK across directory ledger: ${browserAckIdentity}`);
    browserAckIdentities.add(browserAckIdentity);
    assert.equal(nodeAckReceiptIds.has(nodeAck.receiptId), false,
      `Canvas graphics receipt was Node-consumed more than once: ${nodeAck.receiptId}`);
    nodeAckReceiptIds.add(nodeAck.receiptId);
    runtimeRunIds.add(evidence.runtimeRunId);
    runtimeRunIds.add(browserAck.runtimeRunId);
    runtimeRunIds.add(nodeAck.runtimeRunId);
    for (const sourceSiteKey of evidence.observedSourceSiteKeys) {
      observedSourceSiteKeys.add(sourceSiteKey);
    }
  }
  assert.equal(receiptIds.size, gates.length,
    "every directory Canvas graphics gate must have one unique executable receipt");
  assert.equal(browserAckIdentities.size, gates.length,
    "every directory Canvas graphics receipt must have one unique browser contrast ACK");
  assert.equal(nodeAckReceiptIds.size, gates.length,
    "every directory Canvas graphics receipt must be consumed exactly once by Node");
  assert.equal(runtimeRunIds.size, 1,
    `directory Canvas graphics receipts mix runtime runs: ${[...runtimeRunIds].sort().join(",")}`);

  const observedKeys = [...observedSourceSiteKeys].sort();
  const expectedKeys = californiaCanvasEssentialSourceSiteKeys;
  assert.equal(
    observedKeys.length,
    expectedKeys.length,
    `aggregate Canvas essential source coverage count drifted: ${observedKeys.length}!=${expectedKeys.length}`
  );
  assert.equal(
    digestKeys(observedKeys),
    digestKeys(expectedKeys),
    "aggregate Canvas essential source coverage digest drifted"
  );
  assert.deepEqual(
    observedKeys,
    expectedKeys,
    "aggregate Canvas essential source coverage is missing or inventing exact source sites"
  );
}

function expectedDocumentLanguage(axisId: string) {
  if (axisId.includes("zhCN")) return /^zh-(?:hans|cn)/i;
  if (axisId.includes("zhHK")) return /^zh-(?:hant|hk)/i;
  return /^en(?:-|$)/i;
}

function verifyPremiumFrameMetric(frame: PremiumFrameMetric, key: string) {
  assert.ok(frame.contextKind === "webgl" || frame.contextKind === "webgl2", `${key}: non-WebGL premium frame`);
  assert.ok(frame.width > 0 && frame.height > 0 && frame.pixelCount === frame.width * frame.height, `${key}: invalid frame size`);
  assert.match(frame.sha256, /^[a-f0-9]{64}$/, `${key}: invalid frame hash`);
  assert.ok(frame.recorderSignature.trim(), `${key}: missing recorder signature`);
  assert.ok(Number.isFinite(frame.entropyBits) && frame.entropyBits > 0, `${key}: empty frame entropy`);
  assert.ok(frame.foregroundRatio > 0 && frame.foregroundRatio <= 1, `${key}: empty frame foreground`);
  assert.ok(frame.opaquePixelRatio > 0 && frame.opaquePixelRatio <= 1, `${key}: empty frame opacity`);
  assert.ok(frame.attachmentName.trim(), `${key}: missing WebGL frame attachment`);
  assert.ok(frame.changedPixelRatioFromDefault >= 0 && frame.changedPixelRatioFromDefault <= 1, `${key}: invalid changed-pixel ratio`);
  assert.ok(frame.meanAbsoluteDiffRatioFromDefault >= 0 && frame.meanAbsoluteDiffRatioFromDefault <= 1, `${key}: invalid mean diff ratio`);
  const expectedPlaybackState = frame.state === "playing" ? "playing" : "paused";
  assert.equal(
    frame.playbackStateBeforeCapture,
    expectedPlaybackState,
    `${key}: frame was not bound to the expected playback state before capture`
  );
  assert.equal(
    frame.playbackStateAfterCapture,
    expectedPlaybackState,
    `${key}: frame was not bound to the expected playback state after capture`
  );
}

function verifyPremiumWebGlTargetEvidence(
  actualContract: CaliforniaPremiumWebGlExpectedTargetContract[],
  actualEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[],
  expectedContract: CaliforniaPremiumWebGlExpectedTargetContract[],
  key: string
) {
  assert.deepEqual(actualContract, expectedContract, `${key}: projected target contract drifted`);
  const expectedTargets = new Map(expectedContract.map((target) => [target.evidenceId, target]));
  const actualTargets = new Map(actualEvidence.map((target) => [target.evidenceId, target]));
  assert.equal(actualTargets.size, actualEvidence.length, `${key}: target evidence contains duplicate identities`);
  assert.deepEqual(
    [...actualTargets.keys()].sort(),
    [...expectedTargets.keys()].sort(),
    `${key}: target evidence is not the exact scene-derived set`
  );
  for (const [evidenceId, expectedTarget] of expectedTargets) {
    const target = actualTargets.get(evidenceId)!;
    assert.equal(target.objectId, expectedTarget.objectId, `${key}/${evidenceId}: object identity drifted`);
    assert.equal(target.primitiveId, expectedTarget.primitiveId, `${key}/${evidenceId}: primitive identity drifted`);
    assert.equal(target.role, expectedTarget.role, `${key}/${evidenceId}: role attribution drifted`);
    assert.equal(target.cameraProjectionDigest, expectedTarget.cameraProjectionDigest,
      `${key}/${evidenceId}: camera projection drifted`);
    assert.equal(target.projectedGeometryDigest, expectedTarget.projectedGeometryDigest,
      `${key}/${evidenceId}: projected geometry drifted`);
    assert.deepEqual(target.expectedRegion, expectedTarget.expectedRegion,
      `${key}/${evidenceId}: expected projected region drifted`);
    assert.equal(target.projectedPointCount, expectedTarget.projectedPointCount,
      `${key}/${evidenceId}: projected point count drifted`);
    assert.equal(target.segmentCount, expectedTarget.segmentCount,
      `${key}/${evidenceId}: topology segment count drifted`);
    assert.equal(target.topology, expectedTarget.topology, `${key}/${evidenceId}: topology drifted`);
    assert.equal(target.passed, true, `${key}/${evidenceId}: target failed`);
    assert.ok(target.corePixelCount >= expectedTarget.minimumCorePixels,
      `${key}/${evidenceId}: target lacks the required terminal core pixels`);
    assert.ok(target.largestConnectedCorePixelCount >= expectedTarget.minimumConnectedPixels,
      `${key}/${evidenceId}: target lacks the required connected terminal core`);
    assert.ok(target.largestConnectedCorePixelCount <= target.corePixelCount,
      `${key}/${evidenceId}: connected core exceeds target core`);
    assert.ok(target.requiredSpatialSampleCount > 0,
      `${key}/${evidenceId}: spatial sample threshold is missing`);
    assert.ok(target.matchedSpatialSampleCount >= target.requiredSpatialSampleCount,
      `${key}/${evidenceId}: projected geometry is spatially incomplete`);
    assert.ok(target.spatialCoverageRatio >= expectedTarget.minimumSpatialCoverageRatio,
      `${key}/${evidenceId}: projected geometry coverage is below contract`);
    assert.equal(target.arcLengthBucketCount, expectedTarget.arcLengthBucketCount,
      `${key}/${evidenceId}: arc-length bucket inventory drifted`);
    assert.ok(target.matchedArcLengthBucketCount >= expectedTarget.minimumMatchedArcLengthBucketCount,
      `${key}/${evidenceId}: arc-length/topology coverage is incomplete`);
    assert.ok(target.maximumConsecutiveMissingBuckets <= expectedTarget.maximumConsecutiveMissingBuckets,
      `${key}/${evidenceId}: consecutive arc-length misses exceed the reviewed bound`);
    assert.ok(target.endpointMatchCount >= expectedTarget.minimumEndpointMatchCount,
      `${key}/${evidenceId}: required projected endpoints are missing`);
    assert.ok(target.onPathCorePixelCount >= expectedTarget.minimumOnPathCorePixels,
      `${key}/${evidenceId}: required core pixels are not on the reviewed path`);
    assert.ok(target.offCorridorCorePixelCount >= 0 &&
      target.offCorridorCorePixelRatio >= 0 && target.offCorridorCorePixelRatio <= 1 &&
      target.offCorridorCorePixelRatio <= expectedTarget.maximumOffCorridorCorePixelRatio,
    `${key}/${evidenceId}: same-color pixels escape the approved projected corridor union`);
  }
}

function verifyPremiumEvidence(record: CoverageRecord, key: string) {
  verifyUiGateEvidence(record, ["default", "after-control-reset"], key);
  verifyContrastGateEvidence(record, ["default", "playing", "reset"], key);
  assert.deepEqual(record.evidence?.canvasGraphicsGates, [],
    `${key}: premium WebGL records must not carry directory 2-D Canvas graphics receipts`);
  const premium = record.evidence?.premium;
  assert.ok(premium, `${key}: missing premium structured evidence`);
  const control = premium.control;
  assert.match(control.documentLanguage, expectedDocumentLanguage(record.axisId), `${key}: premium locale evidence mismatch`);
  assert.equal(control.labelsVerified, true, `${key}: localized premium labels were not verified`);
  assert.equal(control.learnerPresentation, true, `${key}: premium learner presentation was not verified`);
  assert.equal(control.visibleAuthoringControlCount, 0, `${key}: authoring controls were visible`);
  assert.equal(control.initialState, "paused", `${key}: premium initial state was not exact paused`);
  assert.equal(control.playingStateObserved, true, `${key}: premium playing state was not observed`);
  assert.equal(control.playbackAdvanced, true, `${key}: premium timeline did not advance`);
  assert.equal(control.resetRewound, true, `${key}: premium reset did not rewind`);
  assert.equal(control.resetState, "paused", `${key}: premium reset state was not exact paused`);
  assert.equal(control.finalState, "paused", `${key}: premium final state was not exact paused`);

  const frames = exactStateMap(premium.frames, ["default", "playing", "reset"], `${key} premium frame`);
  const contrastGates = exactStateMap(
    record.evidence!.contrastGates,
    ["default", "playing", "reset"],
    `${key} premium numeric contrast gate`
  );
  const webGlContrast = exactStateMap(
    premium.webGlContrast,
    ["default", "playing", "reset"],
    `${key} premium executable WebGL contrast evidence`
  );
  for (const state of ["default", "playing", "reset"] as const) verifyPremiumFrameMetric(frames.get(state)!, `${key}:${state}`);
  for (const state of ["default", "playing", "reset"] as const) {
    const gate = contrastGates.get(state)!;
    assert.equal(gate.webGlCanvasSurfaceCount, 1,
      `${key}: ${state} numeric contrast gate must classify exactly one WebGL surface`);
    assert.equal(gate.executableWebGlCanvasSurfaceCount, 1,
      `${key}: ${state} WebGL surface lacks executable source/raster evidence`);
    const executable = webGlContrast.get(state)!;
    assert.equal(
      executable.providerVersion,
      CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
      `${key}: ${state} unknown WebGL contrast provider version`
    );
    assert.equal(executable.labId, record.labId, `${key}: ${state} WebGL contrast evidence is misattributed`);
    assert.equal(executable.stateKey, state,
      `${key}: ${state} WebGL provider state key is misattributed`);
    assert.equal(executable.playbackState, state === "playing" ? "playing" : "paused",
      `${key}: ${state} WebGL provider playback binding is incorrect`);
    assert.equal(executable.bitmapRgbaSha256, frames.get(state)!.sha256,
      `${key}: ${state} WebGL contrast evidence does not bind the retained frame`);
    assert.equal(executable.bitmapWidth, frames.get(state)!.width,
      `${key}: ${state} WebGL retained bitmap width does not bind the retained frame`);
    assert.equal(executable.bitmapHeight, frames.get(state)!.height,
      `${key}: ${state} WebGL retained bitmap height does not bind the retained frame`);
    assert.equal(executable.sourceContract, CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
      `${key}: ${state} WebGL source contract is not the exact reviewed contract`);
    assert.equal(executable.visualPaletteSourceContract, MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT,
      `${key}: ${state} WebGL palette source contract is not the exact reviewed contract`);
    assert.deepEqual(executable.terminalIssues, [], `${key}: ${state} WebGL terminal audit recorded issues`);
    assert.ok(executable.opaquePixelRatio >= 0.999,
      `${key}: ${state} WebGL terminal frame is not effectively opaque`);
    assert.ok(executable.backgroundCorePixelRatio >= 0.12,
      `${key}: ${state} WebGL terminal frame lacks the canonical background core`);
    const internalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(record.labId, state, {
      elapsedSeconds: executable.elapsedSeconds,
      height: executable.bitmapHeight,
      width: executable.bitmapWidth
    });
    assert.equal(executable.cameraProjectionDigest, internalProjection.cameraProjectionDigest,
      `${key}: ${state} internal camera projection drifted`);
    assert.equal(executable.projectionAspectRatio, internalProjection.projectionAspectRatio,
      `${key}: ${state} internal projection aspect ratio drifted`);
    assert.equal(executable.sceneObjectCount, internalProjection.sceneObjectCount,
      `${key}: ${state} internal scene object count drifted`);
    assert.equal(executable.renderedObjectCount, internalProjection.renderedObjectCount,
      `${key}: ${state} internal rendered object count drifted`);
    assert.equal(executable.sceneTopologyDigest, internalProjection.sceneTopologyDigest,
      `${key}: ${state} internal scene topology drifted`);
    verifyPremiumWebGlTargetEvidence(
      executable.targetContract,
      executable.targetEvidence,
      internalProjection.targetContract,
      `${key}:${state}:internal`
    );

    assert.match(executable.compositorPngSha256, /^[a-f0-9]{64}$/,
      `${key}: ${state} compositor PNG digest is invalid`);
    assert.match(executable.compositorRgbaSha256, /^[a-f0-9]{64}$/,
      `${key}: ${state} compositor RGBA digest is invalid`);
    assert.ok(executable.compositorPngByteLength > 0,
      `${key}: ${state} compositor PNG is empty`);
    assert.deepEqual(executable.compositorIssues, [],
      `${key}: ${state} compositor audit recorded issues`);
    assert.ok(executable.compositorOpaquePixelRatio >= 0.999,
      `${key}: ${state} compositor crop is not effectively opaque`);
    assert.ok(executable.compositorBackgroundCorePixelRatio >= 0.12,
      `${key}: ${state} compositor crop lacks the canonical background core`);
    const expectedClip = {
      x: Math.max(0, Math.floor(executable.pageX)),
      y: Math.max(0, Math.floor(executable.pageY)),
      width: Math.max(
        1,
        Math.ceil(executable.pageX + executable.cssWidth) - Math.floor(executable.pageX)
      ),
      height: Math.max(
        1,
        Math.ceil(executable.pageY + executable.cssHeight) - Math.floor(executable.pageY)
      )
    };
    assert.deepEqual(executable.compositorClip, expectedClip,
      `${key}: ${state} compositor crop is not bound to the exact Canvas box`);
    assert.ok(Math.abs(executable.compositorWidth - executable.compositorClip.width) <= 1,
      `${key}: ${state} compositor width is not bound to the crop`);
    assert.ok(Math.abs(executable.compositorHeight - executable.compositorClip.height) <= 1,
      `${key}: ${state} compositor height is not bound to the crop`);
    assert.ok(executable.compositorCaptureStartedAtMs >= executable.captureStartedAtMs,
      `${key}: ${state} compositor capture predates the internal capture`);
    assert.ok(executable.compositorCaptureEndedAtMs >= executable.compositorCaptureStartedAtMs,
      `${key}: ${state} compositor capture window is inverted`);
    const compositorProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(record.labId, state, {
      elapsedSeconds: executable.compositorElapsedSeconds,
      height: executable.compositorHeight,
      width: executable.compositorWidth
    });
    assert.equal(executable.compositorCameraProjectionDigest, compositorProjection.cameraProjectionDigest,
      `${key}: ${state} compositor camera projection drifted`);
    assert.equal(executable.compositorProjectionAspectRatio, compositorProjection.projectionAspectRatio,
      `${key}: ${state} compositor projection aspect ratio drifted`);
    assert.equal(executable.compositorSceneObjectCount, compositorProjection.sceneObjectCount,
      `${key}: ${state} compositor scene object count drifted`);
    assert.equal(executable.compositorRenderedObjectCount, compositorProjection.renderedObjectCount,
      `${key}: ${state} compositor rendered object count drifted`);
    assert.equal(executable.compositorSceneTopologyDigest, compositorProjection.sceneTopologyDigest,
      `${key}: ${state} compositor scene topology drifted`);
    verifyPremiumWebGlTargetEvidence(
      executable.compositorTargetContract,
      executable.compositorTargetEvidence,
      compositorProjection.targetContract,
      `${key}:${state}:compositor`
    );
    assert.equal(
      executable.compositorBindingSha256,
      californiaPremiumWebGlCompositorBindingSha256({
        captureToken: executable.captureToken,
        capturedUrl: executable.capturedUrl,
        clip: executable.compositorClip,
        compositorElapsedBracket: executable.compositorElapsedBracket,
        compositorElapsedSeconds: executable.compositorElapsedSeconds,
        compositorFrameIndexBracket: executable.compositorFrameIndexBracket,
        compositorPngSha256: executable.compositorPngSha256,
        compositorRgbaSha256: executable.compositorRgbaSha256,
        stateKey: executable.stateKey,
        targetContract: executable.compositorTargetContract,
        timelineValueBracket: executable.compositorTimelineValueBracket
      }),
      `${key}: ${state} compositor binding digest drifted`
    );
    const capturedUrl = new URL(executable.capturedUrl);
    const routeLabId = decodeURIComponent(capturedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "");
    assert.equal(routeLabId, record.labId, `${key}: ${state} WebGL capture URL is misattributed`);
    const premiumLab = californiaVisualizationQaInventory.premiumLabs.find((lab) => lab.labId === record.labId);
    assert.ok(premiumLab, `${key}: ${state} WebGL capture references a non-premium California lab`);
    assert.equal(capturedUrl.searchParams.get("grade"), premiumLab.grade,
      `${key}: ${state} WebGL capture grade query drifted`);
    assert.equal(capturedUrl.searchParams.get("track"), "all",
      `${key}: ${state} WebGL capture track query drifted`);
    assert.deepEqual([...capturedUrl.searchParams.keys()].sort(), ["grade", "track"],
      `${key}: ${state} WebGL capture contains unexpected query state`);
    const retainedIssues = auditCaliforniaPremiumWebGlRetainedContrastEvidence(executable, {
      expectedStateKey: state
    });
    assert.deepEqual(
      retainedIssues,
      [],
      `${key}: ${state} WebGL retained executable evidence failed exact revalidation: ${retainedIssues.join("|")}`
    );
  }
  const webGlStateSequence = [
    webGlContrast.get("default")!,
    webGlContrast.get("playing")!,
    webGlContrast.get("reset")!
  ];
  const playingCompositorSamples = webGlContrast.get("playing")!.playingCompositorSamples;
  assert.equal(playingCompositorSamples.length, 2,
    `${key}: playing final compositor must retain exactly two time-separated samples`);
  for (const [index, sample] of playingCompositorSamples.entries()) {
    assert.ok(sample.compositorChangedPixelRatioFromPrevious !== null &&
      sample.compositorMeanAbsoluteDiffRatioFromPrevious !== null &&
      (sample.compositorChangedPixelRatioFromPrevious >= MIN_PLAYING_CHANGED_PIXEL_RATIO ||
        sample.compositorMeanAbsoluteDiffRatioFromPrevious >= MIN_PLAYING_MEAN_DIFF_RATIO),
    `${key}: playing compositor sample ${index} is static`);
  }
  const compositorResetDifference = webGlContrast.get("reset")!.compositorResetDifference;
  assert.deepEqual(compositorResetDifference, { changedPixelRatio: 0, meanAbsoluteDiffRatio: 0 },
    `${key}: reset final compositor did not canonically restore default`);
  const webGlStateSequenceIssues = auditCaliforniaPremiumWebGlStateSequence(webGlStateSequence);
  assert.deepEqual(webGlStateSequenceIssues, [],
    `${key}: final compositor state sequence failed exact revalidation: ${webGlStateSequenceIssues.join("|")}`);
  const defaultFrame = frames.get("default")!;
  assert.equal(defaultFrame.changedPixelRatioFromDefault, 0, `${key}: default frame changed ratio must be zero`);
  assert.equal(defaultFrame.meanAbsoluteDiffRatioFromDefault, 0, `${key}: default frame mean diff must be zero`);
  const playingFrame = frames.get("playing")!;
  assert.ok(
    playingFrame.changedPixelRatioFromDefault >= MIN_PLAYING_CHANGED_PIXEL_RATIO ||
      playingFrame.meanAbsoluteDiffRatioFromDefault >= MIN_PLAYING_MEAN_DIFF_RATIO,
    `${key}: missing meaningful playing frame change`
  );
  const resetFrame = frames.get("reset")!;
  assert.ok(
    resetFrame.changedPixelRatioFromDefault <= MAX_RESET_CHANGED_PIXEL_RATIO &&
      resetFrame.meanAbsoluteDiffRatioFromDefault <= MAX_RESET_MEAN_DIFF_RATIO,
    `${key}: reset frame did not return within default tolerance`
  );
  const screenshots = exactStateMap(
    premium.surfaceScreenshots,
    ["default", "playing", "reset"],
    `${key} premium surface screenshot`
  );
  for (const state of ["default", "playing", "reset"] as const) {
    assert.ok(screenshots.get(state)!.attachmentName.trim(), `${key}: missing ${state} surface screenshot`);
  }
}

type ConsumedAuditEntry = {
  entry: string;
  index: number;
  match: RegExpExecArray;
};

function verifyExactAuditEvidence(record: CoverageRecord, key: string) {
  const evidence = record.auditEvidence;
  assert.ok(Array.isArray(evidence), `${key}: missing audit evidence array`);
  const unconsumed = new Set(evidence.map((_, index) => index));
  const consume = (
    pattern: RegExp,
    label: string,
    expectedCount?: number
  ): ConsumedAuditEntry[] => {
    const matches = evidence.flatMap((entry, index) => {
      const match = pattern.exec(entry);
      return match ? [{ entry, index, match }] : [];
    });
    if (expectedCount !== undefined) {
      assert.equal(matches.length, expectedCount, `${key}: expected exactly ${expectedCount} ${label} evidence entr${expectedCount === 1 ? "y" : "ies"}`);
    }
    for (const match of matches) unconsumed.delete(match.index);
    return matches;
  };

  const uxReady = consume(
    /^ux-ready:(premium|primary|related):(\d+)ms:budget=30000ms$/,
    "UX-ready",
    1
  )[0];
  const expectedVisitKind = (() => {
    if (record.routeKind === "premium-direct") return "premium";
    const lab = californiaVisualizationQaInventory.labs.find((candidate) => candidate.labId === record.labId);
    assert.ok(lab, `${key}: catalog lab missing while verifying audit evidence`);
    if (record.benchId === lab.assignment.primary) return "primary";
    assert.ok(
      lab.assignment.related?.some((benchId) => benchId === record.benchId),
      `${key}: bench is neither primary nor related`
    );
    return "related";
  })();
  assert.equal(uxReady.match[1], expectedVisitKind, `${key}: UX-ready visit kind does not match catalog assignment`);
  assert.ok(Number(uxReady.match[2]) <= EXPECTED_UX_READY_MS, `${key}: UX-ready evidence exceeded 30000ms`);

  const recovery = consume(
    /^recovery-window:(\d+)ms:deadline=60000ms$/,
    "recovery-window",
    1
  )[0];
  assert.equal(Number(recovery.match[1]), record.durationMs, `${key}: recovery evidence disagrees with record duration`);

  const preNavigation = consume(
    /^pre-navigation-quiescence:quiescent=true:waited=(\d+)ms:pending=0:diagnostics=0$/,
    "pre-navigation quiescence"
  );
  assert.equal(
    preNavigation.length,
    expectedVisitKind === "related" ? 0 : 1,
    `${key}: destructive route entry must have exactly one strict pre-navigation quiescence record`
  );

  const terminal = consume(
    /^terminal-quiescence:quiescent=true:waited=(\d+)ms:pending=0$/,
    "terminal quiescence"
  );
  assert.ok(terminal.length <= 1, `${key}: duplicate terminal quiescence evidence`);

  if (record.routeKind === "premium-direct") {
    consume(/^premium-presentation:learner:visible-authoring-controls=0$/, "premium learner presentation", 1);

    const canvasEntries = consume(
      /^premium-canvas:(default|playing|reset):visible=(\d+):webgl=(\d+):2d-overlay=(\d+):unsupported=(\d+):registry-v4=true$/,
      "premium Canvas classification",
      3
    );
    const canvases = exactStateMap(
      canvasEntries.map(({ match }) => ({
        overlay: Number(match[4]),
        state: match[1],
        unsupported: Number(match[5]),
        visible: Number(match[2]),
        webgl: Number(match[3])
      })),
      ["default", "playing", "reset"],
      `${key} premium Canvas audit state`
    );
    for (const state of ["default", "playing", "reset"] as const) {
      const canvas = canvases.get(state)!;
      assert.equal(canvas.webgl, 1, `${key}: ${state} premium evidence must classify exactly one WebGL canvas`);
      assert.equal(canvas.unsupported, 0, `${key}: ${state} premium evidence classified unsupported canvases`);
      assert.equal(
        canvas.visible,
        canvas.webgl + canvas.overlay,
        `${key}: ${state} premium visible Canvas count is internally inconsistent`
      );
    }

    const frameEntries = consume(
      /^premium-webgl-frame:(default|playing|reset):context=(webgl|webgl2):size=(\d+)x(\d+):sha256=([a-f0-9]{64}):entropy=(\d+\.\d{4}):foreground=(\d+\.\d{6}):opaque=(\d+\.\d{6}):mean-diff=(\d+\.\d{6}):changed-pixels=(\d+\.\d{6})$/,
      "premium WebGL frame",
      3
    );
    const premium = record.evidence?.premium;
    assert.ok(premium, `${key}: missing premium structured evidence for audit cross-check`);
    const expectedFrames = premium.frames.map((frame) =>
      `premium-webgl-frame:${frame.state}:context=${frame.contextKind}:size=${frame.width}x${frame.height}:` +
      `sha256=${frame.sha256}:entropy=${frame.entropyBits.toFixed(4)}:` +
      `foreground=${frame.foregroundRatio.toFixed(6)}:opaque=${frame.opaquePixelRatio.toFixed(6)}:` +
      `mean-diff=${frame.meanAbsoluteDiffRatioFromDefault.toFixed(6)}:` +
      `changed-pixels=${frame.changedPixelRatioFromDefault.toFixed(6)}`
    ).sort();
    assert.deepEqual(
      frameEntries.map(({ entry }) => entry).sort(),
      expectedFrames,
      `${key}: premium WebGL audit strings disagree with structured frame evidence`
    );

    const compositorEntries = consume(
      /^premium-webgl-compositor:(default|playing|reset):attachment=([^:]+):clip=(\d+),(\d+),(\d+)x(\d+):png=([a-f0-9]{64}):rgba=([a-f0-9]{64}):binding=([a-f0-9]{64}):objects=(\d+)\/(\d+):targets=(\d+):topology=([a-f0-9]{64})$/,
      "premium WebGL page compositor",
      3
    );
    const expectedCompositors = premium.webGlContrast.map((entry) =>
      `premium-webgl-compositor:${entry.state}:` +
      `attachment=california-premium-webgl-${record.axisId}-${record.labId}-${entry.state}-page-compositor:` +
      `clip=${entry.compositorClip.x},${entry.compositorClip.y},` +
      `${entry.compositorClip.width}x${entry.compositorClip.height}:` +
      `png=${entry.compositorPngSha256}:rgba=${entry.compositorRgbaSha256}:` +
      `binding=${entry.compositorBindingSha256}:` +
      `objects=${entry.compositorRenderedObjectCount}/${entry.compositorSceneObjectCount}:` +
      `targets=${entry.compositorTargetEvidence.length}:topology=${entry.compositorSceneTopologyDigest}`
    ).sort();
    assert.deepEqual(
      compositorEntries.map(({ entry }) => entry).sort(),
      expectedCompositors,
      `${key}: compositor audit strings disagree with structured compositor evidence`
    );

    const overlayEntries = consume(
      /^premium-2d-overlay:(default|playing|reset):dom-index=(\d+):canvas-text-audit$/,
      "premium 2D overlay"
    );
    for (const state of ["default", "playing", "reset"] as const) {
      const stateEntries = overlayEntries.filter(({ match }) => match[1] === state);
      assert.equal(
        stateEntries.length,
        canvases.get(state)!.overlay,
        `${key}: ${state} premium overlay evidence count disagrees with Canvas classification`
      );
      assert.equal(
        new Set(stateEntries.map(({ match }) => match[2])).size,
        stateEntries.length,
        `${key}: ${state} premium overlay evidence repeats a DOM index`
      );
    }

    const screenshotEntries = consume(
      /^premium-surface-screenshot:(default|playing|reset):(.+)$/,
      "premium surface screenshot",
      3
    );
    const expectedScreenshots = premium.surfaceScreenshots.map((screenshot) =>
      `premium-surface-screenshot:${screenshot.state}:${screenshot.attachmentName}`
    ).sort();
    assert.deepEqual(
      screenshotEntries.map(({ entry }) => entry).sort(),
      expectedScreenshots,
      `${key}: premium screenshot audit strings disagree with structured attachment evidence`
    );
  }

  assert.deepEqual(
    Array.from(unconsumed).map((index) => evidence[index]),
    [],
    `${key}: unrecognized, duplicate, forged, skipped, exempted, or extra audit evidence`
  );
  return { terminalCount: terminal.length };
}

export function verifyCaliforniaVisualizationCoverageArtifacts(
  artifacts: CoverageArtifact[],
  expectedCurrentProvenance?: CaliforniaCoverageProvenance,
  expectedWorkItems?: ReadonlyMap<string, ExpectedWorkItemContract>
) {
  assert.ok(artifacts.length > 0, "no California Visualization coverage artifacts were found");
  const provenanceFields = [
    "matrixRunId",
    "buildId",
    "baselineSha",
    "sourceHash",
    "sourceSnapshotSha256",
    "harnessHash",
    "catalogHash",
    "matrixConfigHash"
  ] as const satisfies readonly (keyof CoverageProvenance)[];
  for (const artifact of artifacts) {
    assert.equal(artifact.schemaVersion, 5, `${artifact.workItem?.id ?? "unknown"}: unsupported ledger schema`);
    assert.ok(Number.isInteger(artifact.execution?.repeatEachIndex) && artifact.execution.repeatEachIndex >= 0,
      `${artifact.workItem?.id ?? "unknown"}: invalid repeat index`);
    assert.equal(artifact.execution?.retry, 0,
      `${artifact.workItem?.id ?? "unknown"}: formal coverage requires retry=0`);
    assert.ok(!Number.isNaN(Date.parse(artifact.createdAt)), `${artifact.workItem?.id ?? "unknown"}: invalid createdAt`);
    for (const field of provenanceFields) {
      assert.ok(
        typeof artifact.provenance?.[field] === "string" && artifact.provenance[field].trim().length > 0,
        `${artifact.workItem?.id ?? "unknown"}: invalid provenance field ${field}`
      );
    }
    assert.match(artifact.provenance.baselineSha, /^[a-f0-9]{7,64}$/i, `${artifact.workItem.id}: invalid baselineSha`);
    for (const field of [
      "sourceHash",
      "sourceSnapshotSha256",
      "harnessHash",
      "catalogHash",
      "matrixConfigHash"
    ] as const) {
      assert.match(artifact.provenance[field], /^[a-f0-9]{64}$/i, `${artifact.workItem.id}: invalid ${field}`);
    }
  }
  const referenceProvenance = artifacts[0].provenance;
  for (const field of provenanceFields) {
    const values = new Set(artifacts.map((artifact) => artifact.provenance[field]));
    assert.equal(
      values.size,
      1,
      `mixed matrix provenance field ${field}: expected ${referenceProvenance[field]}, received ${Array.from(values).join(", ")}`
    );
    if (expectedCurrentProvenance) {
      assert.equal(
        referenceProvenance[field],
        expectedCurrentProvenance[field],
        `stale matrix provenance field ${field}: expected current ${expectedCurrentProvenance[field]}, ` +
        `received ${referenceProvenance[field]}`
      );
    }
  }

  const artifactsByLogicalKey = new Map<string, CoverageArtifact[]>();
  for (const artifact of artifacts) {
    const logicalKey = [
      artifact.provenance.matrixRunId,
      artifact.project,
      artifact.workItem.id,
      artifact.execution.repeatEachIndex
    ].join(":");
    const grouped = artifactsByLogicalKey.get(logicalKey) ?? [];
    grouped.push(artifact);
    artifactsByLogicalKey.set(logicalKey, grouped);
  }
  const finalArtifacts: CoverageArtifact[] = [];
  for (const [logicalKey, attempts] of artifactsByLogicalKey) {
    assert.equal(attempts.length, 1,
      `formal coverage repeats logical artifact ${logicalKey}`);
    finalArtifacts.push(attempts[0]);
  }
  const expectedKeys = expectedCoverageKeys();
  assert.equal(
    expectedKeys.size,
    EXPECTED_DIRECTORY_RECORDS + EXPECTED_PREMIUM_RECORDS,
    "authoritative full-matrix key count drifted"
  );

  const records: CoverageRecord[] = [];
  for (const artifact of finalArtifacts) {
    assert.ok(
      CALIFORNIA_FORMAL_PROJECT_NAMES.includes(artifact.project as CaliforniaFormalProjectName),
      `${artifact.workItem.id}: unknown formal Playwright project ${JSON.stringify(artifact.project)}`
    );
    const formalProject = artifact.project as CaliforniaFormalProjectName;
    assert.deepEqual(
      artifact.axes,
      CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT[formalProject],
      `${artifact.workItem.id}: axes drifted from exact project-to-axis contract for ${formalProject}`
    );
    assert.deepEqual(
      artifact.projectEvidence,
      CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[formalProject],
      `${artifact.workItem.id}: viewport/device evidence drifted for ${formalProject}`
    );
    const expectedWorkItem = expectedWorkItems?.get(artifact.workItem.id);
    if (expectedWorkItems) {
      assert.ok(expectedWorkItem, `${artifact.workItem.id}: unexpected work item artifact`);
    }
    assert.ok(artifact.workItem.visitCount > 0, `${artifact.workItem.id}: zero-record work-item visit count`);
    assert.equal(
      artifact.records.length,
      artifact.workItem.visitCount * artifact.axes.length,
      `${artifact.workItem.id}: artifact target count does not equal visitCount x axes`
    );
    if (expectedWorkItem) {
      assert.equal(artifact.workItem.kind, expectedWorkItem.kind, `${artifact.workItem.id}: work-item kind drifted`);
      assert.equal(artifact.workItem.visitCount, expectedWorkItem.visitCount, `${artifact.workItem.id}: work-item visit count drifted`);
      const expectedArtifactKeys = artifact.axes.flatMap((axisId) => expectedWorkItem.targets.map((target) =>
        recordKey({ axisId, routeKind: expectedWorkItem.kind, ...target })
      )).sort();
      assert.deepEqual(
        artifact.records.map(recordKey).sort(),
        expectedArtifactKeys,
        `${artifact.workItem.id}: artifact target keys drifted from the catalog-derived work item`
      );
      assert.equal(
        artifact.budgets.packageTimeoutMs,
        californiaQaPackageTimeoutMs({
          axisCount: artifact.axes.length,
          config: {
            expectTimeoutMs: CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS,
            timeoutMs: CALIFORNIA_FORMAL_TEST_TIMEOUT_MS
          },
          visitCount: expectedWorkItem.visitCount
        }),
        `${artifact.workItem.id}: package timeout drifted from the frozen formal budget formula`
      );
    }
    assert.equal(artifact.attachmentsDurable, true, `${artifact.workItem.id}: Playwright attachments were not durable`);
    assert.deepEqual(artifact.packageIssues, [], `${artifact.workItem.id}: package-level issues were recorded`);
    assert.equal(
      artifact.budgets.recoveryDeadlineMs,
      EXPECTED_RECOVERY_DEADLINE_MS,
      `${artifact.workItem.id}: final recovery deadline must be exactly 60000ms`
    );
    assert.equal(
      artifact.budgets.uxReadyMs,
      EXPECTED_UX_READY_MS,
      `${artifact.workItem.id}: final UX ready budget must be exactly 30000ms`
    );
    assert.equal(artifact.expected, artifact.records.length, `${artifact.workItem.id}: incomplete artifact record array`);
    assert.equal(artifact.summary.attempted, artifact.records.filter((record) => record.attempted).length);
    assert.equal(artifact.summary.failed, artifact.records.filter((record) => record.status === "failed").length);
    assert.equal(artifact.summary.passed, artifact.records.filter((record) => record.status === "passed").length);
    assert.equal(artifact.summary.pending, artifact.records.filter((record) => record.status === "pending").length);
    assert.equal(artifact.summary.unattempted, artifact.records.filter((record) => !record.attempted).length);
    assert.deepEqual(
      [...artifact.selection.grades].sort(),
      expectedGradeIds,
      `${artifact.workItem.id}: full-matrix selection grades drifted`
    );
    assert.equal(
      artifact.selection.includePremiumDirect,
      true,
      `${artifact.workItem.id}: full-matrix selection must include catalog-derived premium routes`
    );
    assert.deepEqual(
      artifact.selection.labIds,
      [],
      `${artifact.workItem.id}: full-matrix selection labIds must be empty`
    );
    assert.ok(artifact.axes.length > 0, `${artifact.workItem.id}: artifact has no axes`);
    assert.deepEqual(
      artifact.axes.filter((axisId) => !expectedAxisIds.includes(axisId)),
      [],
      `${artifact.workItem.id}: artifact contains an unexpected axis`
    );
    const terminalByAxis = exactStateMap(
      artifact.terminalQuiescenceByAxis?.map((terminal) => ({ ...terminal, state: terminal.axisId })),
      artifact.axes,
      `${artifact.workItem.id} terminal quiescence by axis`
    );
    for (const axisId of artifact.axes) {
      const terminal = terminalByAxis.get(axisId)!;
      assert.equal(terminal.quiescent, true, `${artifact.workItem.id}: terminal quiescence failed for axis ${axisId}`);
      assert.equal(terminal.pendingRequestCount, 0, `${artifact.workItem.id}: terminal requests remained for axis ${axisId}`);
      assert.equal(terminal.diagnosticCount, 0, `${artifact.workItem.id}: terminal diagnostics remained for axis ${axisId}`);
      assert.ok(Number.isFinite(terminal.waitedMs) && terminal.waitedMs >= 0, `${artifact.workItem.id}: invalid terminal wait`);
      const axisRecords = artifact.records.filter((record) => record.axisId === axisId);
      const terminalEvidenceCount = axisRecords.reduce((count, record) => count + (
        record.auditEvidence?.filter((entry) =>
          /^terminal-quiescence:quiescent=true:waited=\d+ms:pending=0$/.test(entry)
        ).length ?? 0
      ), 0);
      assert.equal(
        terminalEvidenceCount,
        1,
        `${artifact.workItem.id}: axis ${axisId} must contain exactly one terminal quiescence evidence entry`
      );
    }
    for (const record of artifact.records) {
      assert.ok(artifact.axes.includes(record.axisId), `${artifact.workItem.id}: record axis absent from artifact axes`);
      assert.equal(record.routeKind, artifact.workItem.kind, `${recordKey(record)}: work-item route kind mismatch`);
      records.push(record);
    }
  }

  assert.ok(finalArtifacts.every((artifact) => artifact.selection.shard === null),
    "formal full-matrix coverage forbids sharded artifacts");

  const directoryRecords = records.filter((record) => record.routeKind === "directory");
  const premiumRecords = records.filter((record) => record.routeKind === "premium-direct");
  assert.equal(
    directoryRecords.length,
    EXPECTED_DIRECTORY_RECORDS,
    `full matrix must contain ${EXPECTED_DIRECTORY_RECORDS} directory records`
  );
  assert.equal(
    premiumRecords.length,
    EXPECTED_PREMIUM_RECORDS,
    `full matrix must contain ${EXPECTED_PREMIUM_RECORDS} catalog-derived premium records`
  );

  const actualKeys = records.map(recordKey);
  const duplicateKeys = actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index);
  assert.deepEqual(Array.from(new Set(duplicateKeys)), [], `duplicate ledger keys: ${compactKeys(duplicateKeys)}`);
  const actualKeySet = new Set(actualKeys);
  const missingKeys = Array.from(expectedKeys).filter((key) => !actualKeySet.has(key));
  const unexpectedKeys = Array.from(actualKeySet).filter((key) => !expectedKeys.has(key));
  assert.deepEqual(missingKeys, [], `missing full-matrix keys: ${compactKeys(missingKeys)}`);
  assert.deepEqual(unexpectedKeys, [], `unexpected full-matrix keys: ${compactKeys(unexpectedKeys)}`);

  const directoryCanvasGraphicsGates: CanvasGraphicsGateMetric[] = [];
  // Verify the small premium set first. This preserves exact coverage while
  // keeping a premium hard-negative from needlessly re-hashing every valid
  // directory receipt before reaching the forged record.
  for (const record of [...premiumRecords, ...directoryRecords]) {
    const key = recordKey(record);
    assert.equal(record.attempted, true, `${key}: visit was not attempted`);
    assert.equal(record.status, "passed", `${key}: status=${record.status}${record.detail ? ` detail=${record.detail}` : ""}`);
    assert.ok(Number.isFinite(record.durationMs) && record.durationMs! >= 0, `${key}: missing finite duration`);
    assert.ok(record.durationMs! <= EXPECTED_RECOVERY_DEADLINE_MS, `${key}: recovery duration exceeded 60000ms`);
    if (record.routeKind === "premium-direct") verifyPremiumEvidence(record, key);
    else directoryCanvasGraphicsGates.push(...verifyDirectoryEvidence(record, key));
    verifyExactAuditEvidence(record, key);
  }
  verifyDirectoryCanvasGraphicsAggregate(directoryCanvasGraphicsGates);

  for (const axisId of expectedAxisIds) {
    assert.equal(
      directoryRecords.filter((record) => record.axisId === axisId).length,
      californiaVisualizationQaInventory.visitCount,
      `${axisId}: directory coverage must contain exactly ${californiaVisualizationQaInventory.visitCount} records`
    );
    assert.equal(
      premiumRecords.filter((record) => record.axisId === axisId).length,
      californiaVisualizationQaInventory.premiumLabs.length,
      `${axisId}: premium coverage must contain exactly ${californiaVisualizationQaInventory.premiumLabs.length} records`
    );
  }
}

const syntheticCanvasRuntimeRunId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const syntheticCanvasCapturedAtEpochMs = Date.parse("2026-08-09T00:00:00.000Z");
const californiaCanvasEssentialSitesByBench = groupByKey(
  californiaCanvasEssentialPaintSites,
  (site) => String(site.benchId)
);

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stableValue(entry)]));
}

function syntheticCanvasPaintEnvironment(
  evidence: CaliforniaCanvasGraphicsStateEvidence
): CaliforniaCanvasGraphicsPaintEnvironmentSnapshot {
  const kindCounts = {
    animation: 2,
    cssom: 3,
    focus: 1,
    font: 0,
    fullscreen: 0,
    media: 1,
    pointer: 2,
    scroll: 4,
    state: 2,
    viewport: 1
  };
  const payload = {
    animationFingerprintSha256: sha256(`${evidence.receiptId}:environment:animation`),
    epoch: Object.values(kindCounts).reduce((sum, count) => sum + count, 0),
    focusFingerprintSha256: sha256(`${evidence.receiptId}:environment:focus`),
    fontFingerprintSha256: sha256(`${evidence.receiptId}:environment:font`),
    fullscreenFingerprintSha256: sha256(`${evidence.receiptId}:environment:fullscreen`),
    kindCounts,
    mediaFingerprintSha256: sha256(`${evidence.receiptId}:environment:media`),
    pointerFingerprintSha256: sha256(`${evidence.receiptId}:environment:pointer`),
    scrollFingerprintSha256: sha256(`${evidence.receiptId}:environment:scroll`),
    stateFingerprintSha256: sha256(`${evidence.receiptId}:environment:state`),
    viewportFingerprintSha256: sha256(`${evidence.receiptId}:environment:viewport`)
  };
  return {
    ...payload,
    fingerprintSha256: sha256(JSON.stringify(stableValue(payload)))
  };
}

function sealSyntheticCanvasEvidence(evidence: CaliforniaCanvasGraphicsStateEvidence) {
  const copy = structuredClone(evidence);
  const { evidenceSha256: _evidenceSha256, ...payload } = copy;
  copy.evidenceSha256 = sha256(JSON.stringify(stableValue(payload)));
  return copy;
}

function sealSyntheticCanvasAck(ack: CaliforniaCanvasGraphicsContrastConsumeAck) {
  const copy = structuredClone(ack);
  const { ackSha256: _ackSha256, ...payload } = copy;
  copy.ackSha256 = sha256(JSON.stringify(stableValue(payload)));
  return copy;
}

function rebindSyntheticFinalCompositor(
  proof: CaliforniaCanvasGraphicsFinalCompositorProof
) {
  const copy = structuredClone(proof);
  const { bindingSha256: _bindingSha256, ...payload } = copy;
  copy.bindingSha256 = californiaCanvasGraphicsFinalCompositorBindingSha256(payload);
  return copy;
}

function resealSyntheticCanvasAckCanvasSet(
  ack: CaliforniaCanvasGraphicsContrastConsumeAck
) {
  const copy = structuredClone(ack);
  copy.canvasSetDigest = sha256(JSON.stringify(stableValue(copy.canvases)));
  return sealSyntheticCanvasAck(copy);
}

function syntheticCanvasSiteEvidence(site: CaliforniaCanvasPaintSite): CaliforniaCanvasGraphicsSiteEvidence {
  return {
    backgroundNeighborPixelCount: 12,
    changedPixelCount: 64,
    clearEpoch: 1,
    corePixelCount: 48,
    corePixelCoverageRatio: 48 / 56,
    invocationCount: 1,
    largestConnectedCorePixelCount: 40,
    latestRafEpoch: 1,
    minimumCoreContrastRatio: 7.25,
    operation: site.operation,
    paintServerKinds: ["solid"],
    role: "essential",
    sourceSiteKey: site.sourceSiteKey,
    terminalVisiblePixelCount: 56
  };
}

function syntheticCanvasEvidenceForBinding(options: {
  benchId: string;
  bindingKey: string;
  domCanvasIndex: number;
  receiptId: string;
  receiptOrdinal: number;
  sites: readonly CaliforniaCanvasPaintSite[];
}): CaliforniaCanvasGraphicsCanvasEvidence {
  const siteEvidence = options.sites.map(syntheticCanvasSiteEvidence);
  const observedSourceSiteKeys = siteEvidence.map((site) => site.sourceSiteKey).sort();
  const runtimeCanvasId = options.receiptOrdinal * 10 + options.domCanvasIndex + 1;
  return {
    backingHeight: 120,
    backingWidth: 240,
    benchId: options.benchId,
    bindingKey: options.bindingKey,
    canvasIdentity: `${options.receiptId}:${options.bindingKey}:canvas-${runtimeCanvasId}`,
    compositedOpaquePixelRatio: 1,
    cssHeight: 120,
    cssWidth: 240,
    domCanvasIndex: options.domCanvasIndex,
    issues: [],
    latestClearEpoch: 1,
    latestClearWasFull: true,
    latestPaintRafEpoch: 1,
    latestSettledRafEpoch: 1,
    minimumNumericNonTextContrastRatio: 7.25,
    observedSourceSiteCount: observedSourceSiteKeys.length,
    observedSourceSiteDigest: digestKeys(observedSourceSiteKeys),
    observedSourceSiteKeys,
    paperProof: {
      canvasBackgroundColor: "rgba(0, 0, 0, 0)",
      canvasBackgroundImage: "none",
      canvasOpacity: 1,
      compositingLayers: [
        {
          backdropFilter: "none",
          backgroundColor: "rgba(0, 0, 0, 0)",
          backgroundImage: "none",
          boxShadow: "none",
          elementIdentity: `canvas:${options.receiptId}:${options.domCanvasIndex}`,
          filter: "none",
          isPaperSurface: false,
          maskImage: "none",
          mixBlendMode: "normal",
          opacity: 1,
          withinPaperStack: true
        },
        {
          backdropFilter: "none",
          backgroundColor: "rgb(251, 251, 248)",
          backgroundImage: "none",
          boxShadow: "none",
          elementIdentity: "section.synthetic-signature-paper",
          filter: "none",
          isPaperSurface: true,
          maskImage: "none",
          mixBlendMode: "normal",
          opacity: 1,
          withinPaperStack: true
        }
      ],
      effectiveOpaqueBackgroundColor: "rgb(251, 251, 248)",
      expectedPaperColor: CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
      paperOpaque: true,
      surfaceBackgroundColor: "rgb(251, 251, 248)",
      surfaceColorScheme: "light"
    },
    pendingRafCount: 0,
    qaReadbackCount: options.sites.length * 2 + 1,
    qaReadbackMode: "native-existing-2d-context",
    roleBackgroundNeighborPixelCount: siteEvidence.length * 12,
    roleConnectedCorePixelCount: siteEvidence.length * 40,
    roleCorePixelCount: siteEvidence.length * 48,
    runtimeCanvasId,
    siteEvidence,
    sourcePaintRevision: options.sites.length,
    terminalRasterSha256: sha256(`${options.receiptId}:${options.bindingKey}:terminal-raster`)
  };
}

function syntheticCanvasFinalCompositorProof(options: {
  canvas: CaliforniaCanvasGraphicsCanvasEvidence;
  evidence: CaliforniaCanvasGraphicsStateEvidence;
}): CaliforniaCanvasGraphicsFinalCompositorProof {
  const clip = {
    height: options.canvas.cssHeight,
    width: options.canvas.cssWidth,
    x: options.canvas.domCanvasIndex * options.canvas.cssWidth,
    y: 0
  };
  const raster = {
    height: clip.height,
    pngByteLength: 128,
    pngSha256: sha256(
      `${options.evidence.receiptId}:${options.canvas.canvasIdentity}:compositor-png`
    ),
    rgbaSha256: sha256(
      `${options.evidence.receiptId}:${options.canvas.canvasIdentity}:compositor-rgba`
    ),
    width: clip.width
  };
  const fenceSha256 = sha256(
    `${options.evidence.receiptId}:${options.canvas.canvasIdentity}:layout-paint-fence`
  );
  const withoutBinding: Omit<CaliforniaCanvasGraphicsFinalCompositorProof,
    "bindingSha256"> = {
      backingSize: {
        height: options.canvas.backingHeight,
        width: options.canvas.backingWidth
      },
      bindingKey: options.canvas.bindingKey,
      canvasIdentity: options.canvas.canvasIdentity,
      canvasPageRect: clip,
      captureScrollOffset: { x: 0, y: 0 },
      captureViewportClip: clip,
      captureViewportSize: {
        height: clip.height,
        width: clip.x + clip.width
      },
      capturedUrl: options.evidence.capturedUrl,
      clip,
      comparison: {
        changedPixelCount: 0,
        changedPixelRatio: 0,
        channelTolerance: CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE,
        maxChangedPixelRatio:
          CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO,
        maxMeanAbsoluteDiffRatio:
          CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
        maximumChannelDifference: 0,
        meanAbsoluteDiffRatio: 0,
        passed: true,
        pixelCount: clip.width * clip.height
      },
      compositor: raster,
      cssSize: { height: options.canvas.cssHeight, width: options.canvas.cssWidth },
      deviceScaleFactor: 1,
      domCanvasIndex: options.canvas.domCanvasIndex,
      evidenceSha256: options.evidence.evidenceSha256,
      layoutFenceAfterSha256: fenceSha256,
      layoutFenceBeforeSha256: fenceSha256,
      paintEnvironment: syntheticCanvasPaintEnvironment(options.evidence),
      receiptId: options.evidence.receiptId,
      reference: { ...raster },
      runtimeCanvasId: options.canvas.runtimeCanvasId,
      sourcePaintRevision: options.canvas.sourcePaintRevision,
      stateKey: options.evidence.stateKey,
      surfaceKey: options.evidence.surfaceKey,
      terminalRasterSha256: options.canvas.terminalRasterSha256,
      version: CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION
    };
  return {
    ...withoutBinding,
    bindingSha256: californiaCanvasGraphicsFinalCompositorBindingSha256(withoutBinding)
  };
}

function buildSyntheticCanvasGraphicsGate(options: {
  axisId: string;
  benchId: string;
  capturedUrl: string;
  receiptId?: string;
  receiptOrdinal: number;
  runtimeRunId?: string;
  selectedSites: readonly CaliforniaCanvasPaintSite[];
  stateKey: "default" | "after-control" | "after-reset";
}): CanvasGraphicsGateMetric {
  assert.ok(options.selectedSites.length > 0,
    `${options.benchId}:${options.stateKey} synthetic graphics gate has no essential source sites`);
  const benchSites = californiaCanvasEssentialSitesByBench.get(options.benchId) ?? [];
  assert.ok(benchSites.length > 0, `${options.benchId}: missing synthetic Canvas source contract`);
  const receiptId = options.receiptId ?? `${sha256([
    options.axisId,
    options.benchId,
    options.stateKey,
    String(options.receiptOrdinal)
  ].join(":"))}-${options.receiptOrdinal.toString(16)}`;
  const sitesByBinding = groupByKey(
    options.selectedSites,
    (site) => site.canvasContextKeys[0]
  );
  const canvases = [...sitesByBinding.entries()].map(([bindingKey, sites], domCanvasIndex) => {
    assert.ok(bindingKey, `${options.benchId}:${options.stateKey} source site lacks a Canvas binding`);
    return syntheticCanvasEvidenceForBinding({
      benchId: options.benchId,
      bindingKey,
      domCanvasIndex,
      receiptId,
      receiptOrdinal: options.receiptOrdinal,
      sites
    });
  });
  const observedSourceSiteKeys = options.selectedSites.map((site) => site.sourceSiteKey).sort();
  const benchExpectedKeys = benchSites.map((site) => site.sourceSiteKey).sort();
  const runtimeRunId = options.runtimeRunId ?? syntheticCanvasRuntimeRunId;
  const capturedAtEpochMs = syntheticCanvasCapturedAtEpochMs + options.receiptOrdinal * 3;
  const capturedAtPerformanceMs = options.receiptOrdinal * 3;
  const runtimeSessionId = `synthetic-session-${options.receiptOrdinal}`;
  const rootRuntimeId = options.receiptOrdinal + 1;
  const canvasGraphicsEvidence = sealSyntheticCanvasEvidence({
    benchExpectedEssentialCount: benchExpectedKeys.length,
    benchExpectedEssentialDigest: digestKeys(benchExpectedKeys),
    capturedAtEpochMs,
    capturedAtPerformanceMs,
    capturedUrl: options.capturedUrl,
    captureFenceSignature: `synthetic-fence:${receiptId}`,
    canvases,
    evidenceSha256: "",
    issues: [],
    observedSourceSiteCount: observedSourceSiteKeys.length,
    observedSourceSiteDigest: digestKeys(observedSourceSiteKeys),
    observedSourceSiteKeys,
    receiptId,
    rootRuntimeId,
    runtimeRunId,
    runtimeSessionId,
    runtimeVersion: 1,
    sourceContractSha256: californiaCanvasGraphicsSourceContract.contractSha256,
    sourceExpectedEssentialCount: californiaCanvasEssentialSourceSiteKeys.length,
    sourceExpectedEssentialDigest: digestKeys(californiaCanvasEssentialSourceSiteKeys),
    sourceProductSha256: californiaCanvasGraphicsSourceContract.sourceSha256,
    stateKey: options.stateKey,
    surfaceKey: "signature-canvas"
  });
  const ackCanvases = canvasGraphicsEvidence.canvases.slice()
    .sort((left, right) => left.domCanvasIndex - right.domCanvasIndex)
    .map((canvas) => ({
      backingHeight: canvas.backingHeight,
      backingWidth: canvas.backingWidth,
      bindingKey: canvas.bindingKey,
      canvasIdentity: canvas.canvasIdentity,
      domCanvasIndex: canvas.domCanvasIndex,
      finalCompositor: syntheticCanvasFinalCompositorProof({
        canvas,
        evidence: canvasGraphicsEvidence
      }),
      runtimeCanvasId: canvas.runtimeCanvasId,
      sourcePaintRevision: canvas.sourcePaintRevision,
      terminalPixelSnapshotSha256: sha256(`${receiptId}:${canvas.canvasIdentity}:pixels`),
      terminalRasterSha256: canvas.terminalRasterSha256
    }));
  const canvasGraphicsContrastAck = sealSyntheticCanvasAck({
    ackNonce: sha256(`ack-nonce:${receiptId}`),
    ackSha256: "",
    ackVersion: CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION,
    acknowledgedAtEpochMs: capturedAtEpochMs + 2,
    acknowledgedAtPerformanceMs: capturedAtPerformanceMs + 2,
    auditedRootIdentity: `${runtimeSessionId}:root-${rootRuntimeId}`,
    canvasSetDigest: sha256(JSON.stringify(stableValue(ackCanvases))),
    canvases: ackCanvases,
    captureFenceSignature: canvasGraphicsEvidence.captureFenceSignature,
    capturedUrl: options.capturedUrl,
    contrastConsumedAtEpochMs: capturedAtEpochMs + 1,
    contrastConsumedAtPerformanceMs: capturedAtPerformanceMs + 1,
    evidenceSha256: canvasGraphicsEvidence.evidenceSha256,
    paintEnvironment: syntheticCanvasPaintEnvironment(canvasGraphicsEvidence),
    receiptId,
    rootRuntimeId,
    runtimeRunId,
    runtimeSessionId,
    sourceContractSha256: canvasGraphicsEvidence.sourceContractSha256,
    sourceProductSha256: canvasGraphicsEvidence.sourceProductSha256,
    stateKey: options.stateKey,
    surfaceKey: "signature-canvas"
  });
  return {
    canvasGraphicsContrastAck,
    canvasGraphicsEvidence,
    canvasGraphicsNodeAck: {
      consumed: true,
      evidenceSha256: canvasGraphicsEvidence.evidenceSha256,
      receiptId,
      runtimeRunId
    }
  };
}

const californiaCanvasEssentialSiteByKey = new Map(
  californiaCanvasEssentialPaintSites.map((site) => [site.sourceSiteKey, site])
);

function rebuildSyntheticCanvasGraphicsGate(
  gate: CanvasGraphicsGateMetric,
  overrides: {
    receiptId?: string;
    receiptOrdinal: number;
    runtimeRunId?: string;
    stateKey?: "default" | "after-control" | "after-reset";
  }
) {
  const selectedSites = gate.canvasGraphicsEvidence.observedSourceSiteKeys.map((sourceSiteKey) => {
    const site = californiaCanvasEssentialSiteByKey.get(sourceSiteKey);
    assert.ok(site, `synthetic graphics gate references unknown source site ${sourceSiteKey}`);
    return site;
  });
  return buildSyntheticCanvasGraphicsGate({
    axisId: "synthetic-mutated-axis",
    benchId: gate.canvasGraphicsEvidence.canvases[0]!.benchId,
    capturedUrl: gate.canvasGraphicsEvidence.capturedUrl,
    receiptId: overrides.receiptId,
    receiptOrdinal: overrides.receiptOrdinal,
    runtimeRunId: overrides.runtimeRunId ?? gate.canvasGraphicsEvidence.runtimeRunId,
    selectedSites,
    stateKey: overrides.stateKey ?? gate.canvasGraphicsEvidence.stateKey as
      "default" | "after-control" | "after-reset"
  });
}

type SyntheticFullArtifactOptions = {
  omitCanvasSourceSiteKey?: string;
};

function syntheticPremiumWebGlTargetEvidence(
  targets: CaliforniaPremiumWebGlExpectedTargetContract[]
): CaliforniaPremiumWebGlScreenshotTargetEvidence[] {
  return targets.map((target) => {
    const requiredSpatialSampleCount = Math.max(
      1,
      Math.ceil(target.projectedPoints.length * target.minimumSpatialCoverageRatio)
    );
    return {
      arcLengthBucketCount: target.arcLengthBucketCount,
      cameraProjectionDigest: target.cameraProjectionDigest,
      corePixelCount: target.minimumCorePixels + target.minimumConnectedPixels + 10,
      endpointMatchCount: target.minimumEndpointMatchCount,
      evidenceId: target.evidenceId,
      expectedRegion: target.expectedRegion,
      largestConnectedCorePixelCount: target.minimumConnectedPixels + 5,
      matchedArcLengthBucketCount: target.arcLengthBucketCount,
      matchedSpatialSampleCount: target.projectedPoints.length,
      maximumConsecutiveMissingBuckets: 0,
      objectId: target.objectId,
      offCorridorCorePixelCount: 0,
      offCorridorCorePixelRatio: 0,
      onPathCorePixelCount: Math.max(target.minimumOnPathCorePixels, target.minimumCorePixels),
      passed: true,
      primitiveId: target.primitiveId,
      projectedGeometryDigest: target.projectedGeometryDigest,
      projectedPointCount: target.projectedPointCount,
      requiredSpatialSampleCount,
      role: target.role,
      segmentCount: target.segmentCount,
      spatialCoverageRatio: 1,
      topology: target.topology
    };
  });
}

const syntheticPremiumWebGlEvidenceCache = new Map<string, CaliforniaPremiumWebGlContrastEvidence>();

function syntheticPremiumWebGlEvidence(
  labId: string,
  state: "default" | "playing" | "reset"
): CaliforniaPremiumWebGlContrastEvidence {
  const cacheKey = `${labId}:${state}`;
  const cached = syntheticPremiumWebGlEvidenceCache.get(cacheKey);
  if (cached) return structuredClone(cached);
  const elapsedSeconds = state === "playing" ? 1 : 0;
  const width = 320;
  const height = 240;
  const rendererElapsedBracket = state === "playing"
    ? { after: 1, before: 0.99 }
    : { after: 0, before: 0 };
  const rendererFrameIndexBracket = state === "playing"
    ? { after: 60, before: 59 }
    : { after: 0, before: 0 };
  const timelineValueBracket = state === "playing"
    ? { after: 100, before: 99 }
    : { after: 0, before: 0 };
  const compositorElapsedBracket = state === "playing"
    ? { after: 1.01, before: 1 }
    : { after: 0, before: 0 };
  const compositorFrameIndexBracket = state === "playing"
    ? { after: 61, before: 60 }
    : { after: 0, before: 0 };
  const compositorTimelineValueBracket = state === "playing"
    ? { after: 101, before: 100 }
    : { after: 0, before: 0 };
  const compositorElapsedSeconds = compositorElapsedBracket.before;
  const internalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(labId, state, {
    elapsedSeconds,
    height,
    width
  });
  const compositorProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(labId, state, {
    elapsedSeconds: compositorElapsedSeconds,
    height,
    width
  });
  const captureToken = (state === "default" ? "a" : state === "playing" ? "b" : "c").repeat(32);
  const capturedUrl = `http://127.0.0.1:3020/student/tools/visualizations/${labId}?grade=${
    californiaVisualizationQaInventory.premiumLabs.find((lab) => lab.labId === labId)!.grade
  }&track=all`;
  const compositorClip = { height, width, x: 24, y: 96 };
  const compositorPngSha256 = (state === "default" ? "1" : state === "playing" ? "2" : "3").repeat(64);
  const compositorRgbaSha256 = (state === "playing" ? "5" : "4").repeat(64);
  const captureStartedAtMs = state === "default" ? 1_000_000 : state === "playing" ? 1_000_200 : 1_000_500;
  const captureEndedAtMs = captureStartedAtMs + 50;
  const compositorCaptureStartedAtMs = captureStartedAtMs + 60;
  const compositorCaptureEndedAtMs = captureStartedAtMs + 90;
  const compositorBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
    captureToken,
    capturedUrl,
    clip: compositorClip,
    compositorElapsedBracket,
    compositorElapsedSeconds,
    compositorFrameIndexBracket,
    compositorPngSha256,
    compositorRgbaSha256,
    stateKey: state,
    targetContract: compositorProjection.targetContract,
    timelineValueBracket: compositorTimelineValueBracket
  });
  const playingCompositorSamples = state === "playing"
    ? (() => {
        const secondElapsedBracket = { after: 1.21, before: 1.2 };
        const secondFrameIndexBracket = { after: 73, before: 72 };
        const secondTimelineValueBracket = { after: 121, before: 120 };
        const secondCaptureToken = "d".repeat(32);
        const secondPngSha256 = "8".repeat(64);
        const secondRgbaSha256 = "7".repeat(64);
        const secondProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(labId, "playing", {
          elapsedSeconds: secondElapsedBracket.before,
          height,
          width
        });
        const secondBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
          captureToken: secondCaptureToken,
          capturedUrl,
          clip: compositorClip,
          compositorElapsedBracket: secondElapsedBracket,
          compositorElapsedSeconds: secondElapsedBracket.before,
          compositorFrameIndexBracket: secondFrameIndexBracket,
          compositorPngSha256: secondPngSha256,
          compositorRgbaSha256: secondRgbaSha256,
          stateKey: "playing",
          targetContract: secondProjection.targetContract,
          timelineValueBracket: secondTimelineValueBracket
        });
        return [
          {
            cameraProjectionDigest: compositorProjection.cameraProjectionDigest,
            captureEndedAtMs: compositorCaptureEndedAtMs,
            captureStartedAtMs: compositorCaptureStartedAtMs,
            captureToken,
            compositorBindingSha256,
            compositorChangedPixelRatioFromPrevious: 0.02,
            compositorElapsedBracket,
            compositorElapsedSeconds,
            compositorFrameIndexBracket,
            compositorMeanAbsoluteDiffRatioFromPrevious: 0.002,
            compositorPngByteLength: 768,
            compositorPngSha256,
            compositorRgbaSha256,
            height,
            sceneTopologyDigest: compositorProjection.sceneTopologyDigest,
            targetContract: compositorProjection.targetContract,
            targetEvidence: syntheticPremiumWebGlTargetEvidence(compositorProjection.targetContract),
            timelineValueBracket: compositorTimelineValueBracket,
            width
          },
          {
            cameraProjectionDigest: secondProjection.cameraProjectionDigest,
            captureEndedAtMs: 1_000_350,
            captureStartedAtMs: 1_000_320,
            captureToken: secondCaptureToken,
            compositorBindingSha256: secondBindingSha256,
            compositorChangedPixelRatioFromPrevious: 0.02,
            compositorElapsedBracket: secondElapsedBracket,
            compositorElapsedSeconds: secondElapsedBracket.before,
            compositorFrameIndexBracket: secondFrameIndexBracket,
            compositorMeanAbsoluteDiffRatioFromPrevious: 0.002,
            compositorPngByteLength: 769,
            compositorPngSha256: secondPngSha256,
            compositorRgbaSha256: secondRgbaSha256,
            height,
            sceneTopologyDigest: secondProjection.sceneTopologyDigest,
            targetContract: secondProjection.targetContract,
            targetEvidence: syntheticPremiumWebGlTargetEvidence(secondProjection.targetContract),
            timelineValueBracket: secondTimelineValueBracket,
            width
          }
        ];
      })()
    : [];
  const evidence: CaliforniaPremiumWebGlContrastEvidence = {
    backingHeight: height,
    backingWidth: width,
    backgroundCorePixelRatio: 0.75,
    bitmapHeight: height,
    bitmapPngByteLength: 1024,
    bitmapPngSha256: (state === "default" ? "d" : state === "playing" ? "e" : "f").repeat(64),
    bitmapRgbaSha256: (state === "playing" ? "b" : "a").repeat(64),
    bitmapWidth: width,
    cameraProjectionDigest: internalProjection.cameraProjectionDigest,
    captureEndedAtMs,
    captureStartedAtMs,
    captureToken,
    capturedUrl,
    compositorBackgroundCorePixelRatio: 0.75,
    compositorBindingSha256,
    compositorCameraProjectionDigest: compositorProjection.cameraProjectionDigest,
    compositorCaptureEndedAtMs,
    compositorCaptureStartedAtMs,
    compositorClip,
    compositorElapsedBracket,
    compositorElapsedSeconds,
    compositorFrameIndexBracket,
    compositorHeight: height,
    compositorIssues: [],
    compositorOpaquePixelRatio: 1,
    compositorPngByteLength: 768,
    compositorPngSha256,
    compositorProjectionAspectRatio: compositorProjection.projectionAspectRatio,
    compositorRenderedObjectCount: compositorProjection.renderedObjectCount,
    compositorRgbaSha256,
    compositorSceneObjectCount: compositorProjection.sceneObjectCount,
    compositorSceneTopologyDigest: compositorProjection.sceneTopologyDigest,
    compositorTargetContract: compositorProjection.targetContract,
    compositorTargetEvidence: syntheticPremiumWebGlTargetEvidence(compositorProjection.targetContract),
    compositorTimelineValueBracket,
    compositorWidth: width,
    cssHeight: height,
    cssWidth: width,
    cssX: 24,
    cssY: 96,
    devicePixelRatio: 1,
    elapsedSeconds: internalProjection.elapsedSeconds,
    frameIndex: rendererFrameIndexBracket.after,
    labId,
    opaquePixelRatio: 1,
    pageX: 24,
    pageY: 96,
    playingCompositorSamples,
    playbackState: state === "playing" ? "playing" : "paused",
    projectionAspectRatio: internalProjection.projectionAspectRatio,
    providerVersion: CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
    renderedObjectCount: internalProjection.renderedObjectCount,
    rendererElapsedBracket,
    rendererFrameIndexBracket,
    sceneObjectCount: internalProjection.sceneObjectCount,
    sceneTopologyDigest: internalProjection.sceneTopologyDigest,
    compositorResetDifference: state === "reset"
      ? { changedPixelRatio: 0, meanAbsoluteDiffRatio: 0 }
      : null,
    sourceContract: CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
    state,
    stateKey: state,
    targetContract: internalProjection.targetContract,
    targetEvidence: syntheticPremiumWebGlTargetEvidence(internalProjection.targetContract),
    terminalIssues: [],
    timelineValue: timelineValueBracket.after,
    timelineValueBracket,
    visualPaletteSourceContract: MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT
  };
  syntheticPremiumWebGlEvidenceCache.set(cacheKey, evidence);
  return structuredClone(evidence);
}

function syntheticFullArtifact(
  kind: CoverageArtifact["workItem"]["kind"],
  project: CaliforniaFormalProjectName,
  options: SyntheticFullArtifactOptions = {}
): CoverageArtifact {
  const artifactAxisIds = [...CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT[project]];
  const projectAxisOffset = CALIFORNIA_FORMAL_PROJECT_NAMES.indexOf(project) * artifactAxisIds.length;
  const targets = kind === "directory"
    ? californiaVisualizationQaInventory.labs.flatMap((lab) =>
      [lab.assignment.primary, ...(lab.assignment.related ?? [])].map((benchId) => ({ benchId, labId: lab.labId }))
    )
    : californiaVisualizationQaInventory.premiumLabs.map((lab) => ({ benchId: "premium-3d", labId: lab.labId }));
  const syntheticCanvasGraphicsGatesByRecordKey = new Map<string, CanvasGraphicsGateMetric[]>();
  if (kind === "directory") {
    const gateSlotCountByBench = new Map<string, number>();
    for (const target of targets) {
      gateSlotCountByBench.set(
        target.benchId,
        (gateSlotCountByBench.get(target.benchId) ?? 0) + expectedAxisIds.length * 3
      );
    }
    const gateCursorByBench = new Map<string, number>(
      targets.map((target) => [target.benchId, projectAxisOffset * 3])
    );
    let receiptOrdinal = 0;
    for (const axisId of artifactAxisIds) {
      for (const target of targets) {
        const lab = californiaVisualizationQaInventory.labs.find((candidate) => candidate.labId === target.labId);
        assert.ok(lab, `${target.labId}: synthetic Canvas fixture references an unknown lab`);
        const capturedUrl = `https://qa.invalid/student/tools/visualizations?${new URLSearchParams({
          grade: lab.grade,
          lab: target.labId,
          track: "all"
        }).toString()}`;
        const benchSites = californiaCanvasEssentialSitesByBench.get(target.benchId) ?? [];
        assert.ok(benchSites.length > 0,
          `${target.benchId}: synthetic Canvas fixture has no essential source sites`);
        const availableSites = benchSites.filter((site) =>
          site.sourceSiteKey !== options.omitCanvasSourceSiteKey
        );
        assert.ok(availableSites.length > 0,
          `${target.benchId}: synthetic source omission removed every essential site`);
        const slotCount = gateSlotCountByBench.get(target.benchId)!;
        const gates = (["default", "after-control", "after-reset"] as const).map((stateKey) => {
          const gateCursor = gateCursorByBench.get(target.benchId) ?? 0;
          gateCursorByBench.set(target.benchId, gateCursor + 1);
          const selectedSites = benchSites.filter((site, siteIndex) =>
            siteIndex % slotCount === gateCursor &&
            site.sourceSiteKey !== options.omitCanvasSourceSiteKey
          );
          if (selectedSites.length === 0) {
            selectedSites.push(availableSites[gateCursor % availableSites.length]!);
          }
          receiptOrdinal += 1;
          return buildSyntheticCanvasGraphicsGate({
            axisId,
            benchId: target.benchId,
            capturedUrl,
            receiptOrdinal,
            selectedSites,
            stateKey
          });
        });
        syntheticCanvasGraphicsGatesByRecordKey.set(
          `${axisId}:${target.labId}:${target.benchId}`,
          gates
        );
      }
    }
  }
  const records: CoverageRecord[] = artifactAxisIds.flatMap((axisId) => targets.map((target) => {
    const premiumWebGlContrast = kind === "premium-direct"
      ? (["default", "playing", "reset"] as const)
        .map((state) => syntheticPremiumWebGlEvidence(target.labId, state))
      : [];
    return ({
    attempted: true,
    auditEvidence: [
      ...(kind === "premium-direct" || californiaVisualizationQaInventory.labs.find(
        (lab) => lab.labId === target.labId
      )?.assignment.primary === target.benchId ? [
        "pre-navigation-quiescence:quiescent=true:waited=1ms:pending=0:diagnostics=0"
      ] : []),
      `ux-ready:${kind === "premium-direct"
        ? "premium"
        : californiaVisualizationQaInventory.labs.find((lab) => lab.labId === target.labId)?.assignment.primary === target.benchId
          ? "primary"
          : "related"}:1ms:budget=30000ms`,
      "recovery-window:1ms:deadline=60000ms",
      ...(kind === "premium-direct" ? [
        "premium-presentation:learner:visible-authoring-controls=0",
        "premium-canvas:default:visible=1:webgl=1:2d-overlay=0:unsupported=0:registry-v4=true",
        `premium-webgl-frame:default:context=webgl2:size=320x240:sha256=${"a".repeat(64)}:` +
          "entropy=3.0000:foreground=0.250000:opaque=1.000000:mean-diff=0.000000:changed-pixels=0.000000",
        "premium-canvas:playing:visible=1:webgl=1:2d-overlay=0:unsupported=0:registry-v4=true",
        `premium-webgl-frame:playing:context=webgl2:size=320x240:sha256=${"b".repeat(64)}:` +
          "entropy=3.0000:foreground=0.250000:opaque=1.000000:mean-diff=0.020000:changed-pixels=0.120000",
        "premium-canvas:reset:visible=1:webgl=1:2d-overlay=0:unsupported=0:registry-v4=true",
        `premium-webgl-frame:reset:context=webgl2:size=320x240:sha256=${"a".repeat(64)}:` +
          "entropy=3.0000:foreground=0.250000:opaque=1.000000:mean-diff=0.000000:changed-pixels=0.000000",
        ...premiumWebGlContrast.map((entry) =>
          `premium-webgl-compositor:${entry.state}:` +
          `attachment=california-premium-webgl-${axisId}-${target.labId}-${entry.state}-page-compositor:` +
          `clip=${entry.compositorClip.x},${entry.compositorClip.y},` +
          `${entry.compositorClip.width}x${entry.compositorClip.height}:` +
          `png=${entry.compositorPngSha256}:rgba=${entry.compositorRgbaSha256}:` +
          `binding=${entry.compositorBindingSha256}:` +
          `objects=${entry.compositorRenderedObjectCount}/${entry.compositorSceneObjectCount}:` +
          `targets=${entry.compositorTargetEvidence.length}:topology=${entry.compositorSceneTopologyDigest}`
        ),
        "premium-surface-screenshot:default:synthetic-surface-default",
        "premium-surface-screenshot:playing:synthetic-surface-playing",
        "premium-surface-screenshot:reset:synthetic-surface-reset"
      ] : [])
    ],
    axisId,
    benchId: target.benchId,
    durationMs: 1,
    evidence: kind === "directory" ? {
      canvasGraphicsGates: syntheticCanvasGraphicsGatesByRecordKey.get(
        `${axisId}:${target.labId}:${target.benchId}`
      )!,
      canvasGates: ["default", "after-control", "after-reset"].map((state) => ({
        canvasCount: 1,
        clippedTextLayerCount: 0,
        completed: true,
        findingCount: 0,
        state,
        textLayerCount: 1
      })),
      contrastGates: ["default", "after-control", "after-reset"].map((state) => ({
        auditedLabelCount: 12,
        canvasSurfaceCount: 0,
        candidateLabelCount: 12,
        completed: true,
        evidenceSha256: "a".repeat(64),
        executableCanvasSurfaceCount: 0,
        executableWebGlCanvasSurfaceCount: 0,
        findingCount: 0,
        geometryVisibilitySha256: "3".repeat(64),
        hardenedTextAlgorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
        hardenedTextAuditedCount: 12,
        hardenedTextCandidateCount: 12,
        hardenedTextCompleted: true,
        hardenedTextEvidenceSha256: "9".repeat(64),
        hardenedTextFindingCount: 0,
        hardenedTextMinRatio: 4.5,
        hardenedTextWorstLabel: "synthetic hardened text label",
        hardenedTextWorstRequiredRatio: 4.5,
        minRatio: 4.5,
        stableRafSnapshots: 3,
        state,
        worstKind: "html-text",
        worstLabel: "synthetic contrast label",
        webGlCanvasSurfaceCount: 0
      })),
      reset: {
        activeBenchRestored: true,
        canvasReady: true,
        canvasReplaced: true,
        defaultControlFingerprint: "6".repeat(64),
        defaultModelFingerprint: "7".repeat(64),
        defaultSurfaceFingerprint: "8".repeat(64),
        defaultSurfaceStable: true,
        restoredControlFingerprint: "6".repeat(64),
        restoredDefault: true,
        restoredModelFingerprint: "7".repeat(64),
        restoredSurfaceFingerprint: "9".repeat(64),
        restoredSurfaceStable: true,
        surfaceChangedPixelRatio: 0.01,
        surfaceComparison: "stable-pixel-tolerance",
        surfaceEdgeMismatchRatio: 0.001,
        surfaceMeanAbsoluteDiffRatio: 0.001
      },
      signatureControl: {
        changedModelFingerprint: "5".repeat(64),
        defaultModelFingerprint: "4".repeat(64),
        defaultSemanticFingerprint: "7".repeat(64),
        kind: "range",
        label: "synthetic",
        modelChanged: true,
        restoration: "reset",
        restored: true
      },
      uiGates: ["default", "after-control", "after-reset"].map((state) => ({
        completed: true,
        findingCount: 0,
        state
      }))
    } : {
      canvasGraphicsGates: [],
      canvasGates: [],
      contrastGates: ["default", "playing", "reset"].map((state) => ({
        auditedLabelCount: 12,
        canvasSurfaceCount: 1,
        candidateLabelCount: 12,
        completed: true,
        evidenceSha256: "a".repeat(64),
        executableCanvasSurfaceCount: 1,
        executableWebGlCanvasSurfaceCount: 1,
        findingCount: 0,
        geometryVisibilitySha256: "3".repeat(64),
        hardenedTextAlgorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
        hardenedTextAuditedCount: 12,
        hardenedTextCandidateCount: 12,
        hardenedTextCompleted: true,
        hardenedTextEvidenceSha256: "9".repeat(64),
        hardenedTextFindingCount: 0,
        hardenedTextMinRatio: 4.5,
        hardenedTextWorstLabel: "synthetic hardened text label",
        hardenedTextWorstRequiredRatio: 4.5,
        minRatio: 4.5,
        stableRafSnapshots: 3,
        state,
        worstKind: "html-text",
        worstLabel: "synthetic contrast label",
        webGlCanvasSurfaceCount: 1
      })),
      premium: {
        control: {
          documentLanguage: axisId.includes("zhCN") ? "zh-Hans-CN" : axisId.includes("zhHK") ? "zh-Hant-HK" : "en-US",
          finalState: "paused",
          initialState: "paused",
          labelsVerified: true,
          learnerPresentation: true,
          playbackAdvanced: true,
          playingStateObserved: true,
          resetRewound: true,
          resetState: "paused",
          visibleAuthoringControlCount: 0
        },
        frames: ([
          { state: "default", changedPixelRatioFromDefault: 0, meanAbsoluteDiffRatioFromDefault: 0 },
          { state: "playing", changedPixelRatioFromDefault: 0.12, meanAbsoluteDiffRatioFromDefault: 0.02 },
          { state: "reset", changedPixelRatioFromDefault: 0, meanAbsoluteDiffRatioFromDefault: 0 }
        ] as const).map((frame) => ({
          attachmentName: `synthetic-${frame.state}`,
          contextKind: "webgl2" as const,
          entropyBits: 3,
          foregroundRatio: 0.25,
          height: 240,
          opaquePixelRatio: 1,
          playbackStateAfterCapture: frame.state === "playing" ? "playing" as const : "paused" as const,
          playbackStateBeforeCapture: frame.state === "playing" ? "playing" as const : "paused" as const,
          pixelCount: 76_800,
          recorderSignature: `synthetic-${frame.state}-revision`,
          sha256: (frame.state === "playing" ? "b" : "a").repeat(64),
          width: 320,
          ...frame
        })),
        surfaceScreenshots: (["default", "playing", "reset"] as const).map((state) => ({
          attachmentName: `synthetic-surface-${state}`,
          state
        })),
        webGlContrast: premiumWebGlContrast
      },
      uiGates: ["default", "after-control-reset"].map((state) => ({
        completed: true,
        findingCount: 0,
        state
      }))
    },
    labId: target.labId,
    routeKind: kind,
    status: "passed"
    });
  }));
  for (const axisId of artifactAxisIds) {
    records.filter((record) => record.axisId === axisId).at(-1)?.auditEvidence?.push(
      "terminal-quiescence:quiescent=true:waited=1ms:pending=0"
    );
  }
  return {
    attachmentsDurable: true,
    axes: artifactAxisIds,
    budgets: {
      packageTimeoutMs: californiaQaPackageTimeoutMs({
        axisCount: artifactAxisIds.length,
        config: {
          expectTimeoutMs: CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS,
          timeoutMs: CALIFORNIA_FORMAL_TEST_TIMEOUT_MS
        },
        visitCount: targets.length
      }),
      recoveryDeadlineMs: EXPECTED_RECOVERY_DEADLINE_MS,
      uxReadyMs: EXPECTED_UX_READY_MS
    },
    expected: records.length,
    createdAt: "2026-08-09T00:00:00.000Z",
    execution: {
      repeatEachIndex: 0,
      retry: 0
    },
    packageIssues: [],
    project,
    projectEvidence: structuredClone(CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[project]),
    provenance: {
      baselineSha: "d".repeat(40),
      buildId: "synthetic-build",
      catalogHash: "e".repeat(64),
      harnessHash: "f".repeat(64),
      matrixConfigHash: "1".repeat(64),
      matrixRunId: "synthetic-run",
      sourceHash: "2".repeat(64),
      sourceSnapshotSha256: "3".repeat(64)
    },
    records,
    schemaVersion: 5,
    selection: {
      grades: [...expectedGradeIds],
      includePremiumDirect: true,
      labIds: [],
      shard: null
    },
    summary: {
      attempted: records.length,
      failed: 0,
      passed: records.length,
      pending: 0,
      unattempted: 0
    },
    terminalQuiescenceByAxis: artifactAxisIds.map((axisId) => ({
      axisId,
      diagnosticCount: 0,
      pendingRequestCount: 0,
      quiescent: true,
      waitedMs: 1
    })),
    workItem: {
      id: `synthetic-${kind}`,
      kind,
      visitCount: targets.length
    }
  };
}

function syntheticExactArtifacts() {
  return CALIFORNIA_FORMAL_PROJECT_NAMES.flatMap((project) => [
    syntheticFullArtifact("directory", project),
    syntheticFullArtifact("premium-direct", project)
  ]);
}

function cloneCoverageRecordSharingCanvasReceipts(record: CoverageRecord) {
  const canvasGraphicsGates = record.evidence?.canvasGraphicsGates ?? [];
  const cloned = structuredClone({
    ...record,
    evidence: record.evidence ? {
      ...record.evidence,
      canvasGraphicsGates: []
    } : undefined
  }) as CoverageRecord;
  if (cloned.evidence) cloned.evidence.canvasGraphicsGates = [...canvasGraphicsGates];
  return cloned;
}

/**
 * Negative canaries mutate one record or artifact field. Clone only that
 * record up front and keep all other immutable full-matrix records shared.
 * This is copy-on-write test scaffolding only; the positive verifier still
 * traverses and revalidates every raw Canvas receipt.
 */
function cloneCoverageArtifactsSharingCanvasReceipts(artifacts: readonly CoverageArtifact[]) {
  return artifacts.map((artifact) => {
    const records = [...artifact.records];
    if (records[0]) records[0] = cloneCoverageRecordSharingCanvasReceipts(records[0]);
    return {
      ...artifact,
      axes: [...artifact.axes],
      budgets: { ...artifact.budgets },
      execution: { ...artifact.execution },
      packageIssues: [...artifact.packageIssues],
      projectEvidence: structuredClone(artifact.projectEvidence),
      provenance: { ...artifact.provenance },
      records,
      selection: {
        ...artifact.selection,
        grades: [...artifact.selection.grades],
        labIds: [...artifact.selection.labIds],
        shard: artifact.selection.shard ? { ...artifact.selection.shard } : null
      },
      summary: { ...artifact.summary },
      terminalQuiescenceByAxis: artifact.terminalQuiescenceByAxis?.map((terminal) => ({ ...terminal })),
      workItem: { ...artifact.workItem }
    } satisfies CoverageArtifact;
  });
}

function cloneCoverageArtifactSharingCanvasReceipts(artifact: CoverageArtifact) {
  return cloneCoverageArtifactsSharingCanvasReceipts([artifact])[0];
}

function syntheticExpectedWorkItems(artifacts: readonly CoverageArtifact[]) {
  return new Map(artifacts.map((artifact) => [artifact.workItem.id, {
    id: artifact.workItem.id,
    kind: artifact.workItem.kind,
    targets: artifact.records
      .filter((record) => record.axisId === artifact.axes[0])
      .map((record) => ({ benchId: record.benchId, labId: record.labId })),
    visitCount: artifact.workItem.visitCount
  }] as const));
}

test("California Visualization aggregate verifier exact and targeted-run canaries", () => {
  const exact = syntheticExactArtifacts();
  assert.doesNotThrow(() => verifyCaliforniaVisualizationCoverageArtifacts(exact));
  const syntheticWorkItems = syntheticExpectedWorkItems(exact);
  assert.doesNotThrow(
    () => verifyCaliforniaVisualizationCoverageArtifacts(exact, undefined, syntheticWorkItems),
    "catalog-derived work-item contracts must accept the exact artifact target partition"
  );

  const targeted = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  targeted[0].records.pop();
  targeted[0].expected -= 1;
  targeted[0].summary.attempted -= 1;
  targeted[0].summary.passed -= 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(targeted),
    new RegExp(`artifact target count|full matrix must contain ${EXPECTED_DIRECTORY_RECORDS} directory records`)
  );

  const extra = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  extra[0].records.push(cloneCoverageRecordSharingCanvasReceipts(extra[0].records[0]));
  extra[0].expected += 1;
  extra[0].summary.attempted += 1;
  extra[0].summary.passed += 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(extra),
    new RegExp(
      `artifact target count|full matrix must contain ${EXPECTED_DIRECTORY_RECORDS} directory records|duplicate ledger keys`
    ),
    "an extra record must never be accepted as full-matrix evidence"
  );

  const zeroRecordArtifact = cloneCoverageArtifactSharingCanvasReceipts(exact[0]);
  zeroRecordArtifact.workItem = { id: "unexpected-empty-work-item", kind: "directory", visitCount: 0 };
  zeroRecordArtifact.records = [];
  zeroRecordArtifact.expected = 0;
  zeroRecordArtifact.summary = { attempted: 0, failed: 0, passed: 0, pending: 0, unattempted: 0 };
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts([...exact, zeroRecordArtifact], undefined, syntheticWorkItems),
    /unexpected work item|zero-record|visit count|artifact target/,
    "an extra zero-record artifact must never be accepted as full-matrix evidence"
  );
});

test("California Visualization aggregate rejects tampered package timeout evidence", () => {
  const exact = syntheticExactArtifacts();
  const tampered = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  tampered[0].budgets.packageTimeoutMs += 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(
      tampered,
      undefined,
      syntheticExpectedWorkItems(exact)
    ),
    /package timeout drifted from the frozen formal budget formula/,
    "a self-reported package timeout cannot widen or rewrite the frozen formal budget"
  );
});

test("California Visualization aggregate binds each formal project to exact axes and viewport/device evidence", () => {
  const exact = syntheticExactArtifacts();
  assert.doesNotThrow(() => verifyCaliforniaVisualizationCoverageArtifacts(exact));

  const swappedProjects = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const desktopProject = swappedProjects[0].project;
  swappedProjects[0].project = swappedProjects[2].project;
  swappedProjects[2].project = desktopProject;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(swappedProjects),
    /axes drifted from exact project-to-axis contract/,
    "swapping desktop/mobile project labels must not preserve formal evidence"
  );

  const swappedDeviceEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  swappedDeviceEvidence[0].projectEvidence = structuredClone(
    CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME["mobile-chrome"]
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(swappedDeviceEvidence),
    /viewport\/device evidence drifted/,
    "a project label and axis list cannot certify another project's device evidence"
  );
});

test("California Visualization aggregate rejects mixed matrix runs", () => {
  const exact = syntheticExactArtifacts();
  exact[0].provenance.matrixRunId = "run-old";
  exact[1].provenance.matrixRunId = "run-new";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(exact),
    /mixed matrix provenance/
  );
});

test("California Visualization aggregate rejects every retry and repeated logical artifact", () => {
  const retried = syntheticExactArtifacts();
  retried[0] = cloneCoverageArtifactSharingCanvasReceipts(retried[0]);
  retried[0].execution.retry = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(retried),
    /formal coverage requires retry=0/
  );

  const repeated = syntheticExactArtifacts();
  const duplicate = cloneCoverageArtifactSharingCanvasReceipts(repeated[0]);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts([...repeated, duplicate]),
    /formal coverage repeats logical artifact/,
    "a repeated retry-zero artifact must never be selected or collapsed"
  );

  const sharded = syntheticExactArtifacts();
  sharded[0].selection.shard = { index: 1, total: 1 };
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(sharded),
    /formal full-matrix coverage forbids sharded artifacts/
  );
});

test("California Visualization aggregate requires complete unified provenance and rejects stale partial mixtures", () => {
  const fields = [
    "matrixRunId",
    "buildId",
    "baselineSha",
    "sourceHash",
    "sourceSnapshotSha256",
    "harnessHash",
    "catalogHash",
    "matrixConfigHash"
  ] as const satisfies readonly (keyof CoverageProvenance)[];
  for (const field of fields) {
    const invalid = syntheticExactArtifacts();
    invalid[0].provenance[field] = "";
    assert.throws(
      () => verifyCaliforniaVisualizationCoverageArtifacts(invalid),
      new RegExp(`invalid provenance.*${field}`)
    );
  }

  const sourceDrift = syntheticExactArtifacts();
  sourceDrift[1].provenance.sourceHash = "3".repeat(64);
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(sourceDrift), /mixed matrix provenance.*sourceHash/);

  const frozenSnapshotDrift = syntheticExactArtifacts();
  frozenSnapshotDrift[1].provenance.sourceSnapshotSha256 = "4".repeat(64);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(frozenSnapshotDrift),
    /mixed matrix provenance.*sourceSnapshotSha256/
  );

  const oldFull = syntheticExactArtifacts();
  oldFull.forEach((artifact) => { artifact.provenance.matrixRunId = "old-full-run"; });
  const newPartial = syntheticFullArtifact("directory", "desktop-chrome");
  newPartial.provenance.matrixRunId = "new-partial-run";
  newPartial.records = newPartial.records.slice(0, 10);
  newPartial.expected = 10;
  newPartial.summary.attempted = 10;
  newPartial.summary.passed = 10;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts([...oldFull, newPartial]),
    /mixed matrix provenance.*matrixRunId/
  );

  const current = syntheticExactArtifacts();
  const expectedCurrentProvenance = structuredClone(current[0].provenance);
  assert.doesNotThrow(() => verifyCaliforniaVisualizationCoverageArtifacts(current, expectedCurrentProvenance));
  const whollyStale = cloneCoverageArtifactsSharingCanvasReceipts(current);
  whollyStale.forEach((artifact) => { artifact.provenance.sourceHash = "3".repeat(64); });
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(whollyStale, expectedCurrentProvenance),
    /stale matrix provenance.*sourceHash/,
    "a complete internally consistent ledger from stale product source must be rejected"
  );
});

test("California Visualization aggregate rejects targeted or internally inconsistent full-matrix selections", () => {
  const targeted = syntheticExactArtifacts();
  targeted[0].selection.labIds = [targeted[0].records[0].labId];
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(targeted), /full-matrix selection.*labIds/);

  const noPremium = syntheticExactArtifacts();
  noPremium[1].selection.includePremiumDirect = false;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(noPremium), /full-matrix selection.*premium/);

  const gradeSubset = syntheticExactArtifacts();
  gradeSubset[0].selection.grades.pop();
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(gradeSubset), /full-matrix selection.*grades/);
});

test("California Visualization aggregate rejects missing structured gate evidence", () => {
  const exact = syntheticExactArtifacts();

  const legacyContrastlessSchema = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  legacyContrastlessSchema[0].schemaVersion = 2;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(legacyContrastlessSchema),
    /unsupported ledger schema/,
    "schema v2 artifacts cannot certify the all-state numeric contrast matrix"
  );

  const legacyUnhardenedSchema = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  legacyUnhardenedSchema[0].schemaVersion = 3;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(legacyUnhardenedSchema),
    /unsupported ledger schema/,
    "schema v3 artifacts cannot certify hardened text and capture-bound graphics evidence"
  );

  const legacyCanvasSummarySchema = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  legacyCanvasSummarySchema[0].schemaVersion = 4;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(legacyCanvasSummarySchema),
    /unsupported ledger schema/,
    "schema v4 summary artifacts cannot certify exact-root Canvas graphics receipts"
  );

  const missingCanvasGraphicsGate = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingCanvasGraphicsGate[0].records[0].evidence!.canvasGraphicsGates.pop();
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingCanvasGraphicsGate),
    /missing or extra .* Canvas graphics one-shot gate/,
    "every directory record must retain all three exact-state Canvas graphics receipts"
  );

  const forgedCanvasBrowserAck = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const forgedAckGates = forgedCanvasBrowserAck[0].records[0]
    .evidence!.canvasGraphicsGates;
  forgedAckGates[0] = structuredClone(forgedAckGates[0]);
  const forgedAckGate = forgedAckGates[0];
  forgedAckGate.canvasGraphicsContrastAck.receiptId = "b".repeat(64);
  forgedAckGate.canvasGraphicsContrastAck = sealSyntheticCanvasAck(
    forgedAckGate.canvasGraphicsContrastAck
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedCanvasBrowserAck),
    /Canvas browser contrast ACK is forged or identity-drifted/,
    "a validly resealed browser ACK for another receipt must not certify Canvas contrast"
  );

  const legacyV1CanvasAck = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const legacyV1Gates = legacyV1CanvasAck[0].records[0]
    .evidence!.canvasGraphicsGates;
  legacyV1Gates[0] = structuredClone(legacyV1Gates[0]);
  const legacyV1Gate = legacyV1Gates[0];
  (legacyV1Gate.canvasGraphicsContrastAck as unknown as { ackVersion: number })
    .ackVersion = 1;
  delete (legacyV1Gate.canvasGraphicsContrastAck.canvases[0] as Partial<
    CaliforniaCanvasGraphicsContrastConsumeAck["canvases"][number]
  >).finalCompositor;
  legacyV1Gate.canvasGraphicsContrastAck = resealSyntheticCanvasAckCanvasSet(
    legacyV1Gate.canvasGraphicsContrastAck
  );
  const legacyIssues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    legacyV1Gate.canvasGraphicsContrastAck,
    legacyV1Gate.canvasGraphicsEvidence,
    {
      benchId: legacyV1Gate.canvasGraphicsEvidence.canvases[0].benchId,
      capturedUrl: legacyV1Gate.canvasGraphicsEvidence.capturedUrl,
      maxAgeMs: 0,
      nowEpochMs: legacyV1Gate.canvasGraphicsContrastAck.acknowledgedAtEpochMs,
      runtimeRunId: legacyV1Gate.canvasGraphicsEvidence.runtimeRunId,
      stateKey: legacyV1Gate.canvasGraphicsEvidence.stateKey,
      surfaceKey: legacyV1Gate.canvasGraphicsEvidence.surfaceKey
    },
    californiaCanvasGraphicsSourceContract
  ).join("|");
  assert.match(legacyIssues, /contrast-ack-version-mismatch/);
  assert.match(legacyIssues, /final-compositor-proof-missing/);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(legacyV1CanvasAck),
    /Canvas browser contrast ACK is forged or identity-drifted/,
    "unchanged broad schema cannot admit a validly resealed pre-compositor ACK v1"
  );

  const falseZeroDiffCanvasAck = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const falseZeroDiffGates = falseZeroDiffCanvasAck[0].records[0]
    .evidence!.canvasGraphicsGates;
  falseZeroDiffGates[0] = structuredClone(falseZeroDiffGates[0]);
  const falseZeroDiffGate = falseZeroDiffGates[0];
  const falseZeroDiffProof = falseZeroDiffGate.canvasGraphicsContrastAck
    .canvases[0].finalCompositor;
  falseZeroDiffProof.compositor.rgbaSha256 = sha256(
    "validly-resealed-but-different-page-compositor-rgba"
  );
  falseZeroDiffGate.canvasGraphicsContrastAck.canvases[0].finalCompositor =
    rebindSyntheticFinalCompositor(falseZeroDiffProof);
  falseZeroDiffGate.canvasGraphicsContrastAck = resealSyntheticCanvasAckCanvasSet(
    falseZeroDiffGate.canvasGraphicsContrastAck
  );
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      falseZeroDiffGate.canvasGraphicsContrastAck,
      falseZeroDiffGate.canvasGraphicsEvidence,
      {
        benchId: falseZeroDiffGate.canvasGraphicsEvidence.canvases[0].benchId,
        capturedUrl: falseZeroDiffGate.canvasGraphicsEvidence.capturedUrl,
        maxAgeMs: 0,
        nowEpochMs: falseZeroDiffGate.canvasGraphicsContrastAck.acknowledgedAtEpochMs,
        runtimeRunId: falseZeroDiffGate.canvasGraphicsEvidence.runtimeRunId,
        stateKey: falseZeroDiffGate.canvasGraphicsEvidence.stateKey,
        surfaceKey: falseZeroDiffGate.canvasGraphicsEvidence.surfaceKey
      },
      californiaCanvasGraphicsSourceContract
    ).join("|"),
    /final-compositor-reference-compositor-rgba-mismatch/,
    "ledger recheck must independently cross-link decoded reference/compositor RGBA"
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(falseZeroDiffCanvasAck),
    /Canvas browser contrast ACK is forged or identity-drifted/,
    "nested proof, canvas-set, ACK, and artifact seals cannot legalize false zero-diff RGBA"
  );

  const duplicateCanvasState = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const duplicateStateGates = duplicateCanvasState[0].records[0]
    .evidence!.canvasGraphicsGates;
  duplicateStateGates[1] = rebuildSyntheticCanvasGraphicsGate(duplicateStateGates[1], {
    receiptOrdinal: 800_002,
    stateKey: "default"
  });
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(duplicateCanvasState),
    /missing or extra .* Canvas graphics one-shot gate/,
    "one receipt cannot substitute a repeated state for the missing after-control state"
  );

  const segmentedContrastConsumedCanvas = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  segmentedContrastConsumedCanvas[0].records[0].evidence!.contrastGates[0]
    .canvasSurfaceCount = 1;
  segmentedContrastConsumedCanvas[0].records[0].evidence!.contrastGates[0]
    .executableCanvasSurfaceCount = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(segmentedContrastConsumedCanvas),
    /segmented DOM\/SVG contrast gate unexpectedly classified Canvas/,
    "segmented DOM/SVG scans must never consume the one-shot Canvas receipt"
  );

  const premiumBorrowedDirectoryCanvasGate = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  premiumBorrowedDirectoryCanvasGate[1].records[0].evidence!.canvasGraphicsGates.push(
    structuredClone(exact[0].records[0].evidence!.canvasGraphicsGates[0])
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(premiumBorrowedDirectoryCanvasGate),
    /premium WebGL records must not carry directory 2-D Canvas graphics receipts/,
    "premium WebGL evidence cannot borrow a directory 2-D Canvas receipt"
  );

  const missingDirectoryContrast = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingDirectoryContrast[0].records[0].evidence!.contrastGates =
    missingDirectoryContrast[0].records[0].evidence!.contrastGates
      .filter((gate) => gate.state !== "after-control");
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingDirectoryContrast),
    /missing or extra .* numeric contrast gate/
  );

  const missingPremiumPlayingContrast = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingPremiumPlayingContrast[1].records[0].evidence!.contrastGates =
    missingPremiumPlayingContrast[1].records[0].evidence!.contrastGates
      .filter((gate) => gate.state !== "playing");
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingPremiumPlayingContrast),
    /missing or extra .* numeric contrast gate/
  );

  const lowContrastWithForgedZeroFindingCount = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  lowContrastWithForgedZeroFindingCount[0].records[0].evidence!.contrastGates[0].minRatio = 2.99;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(lowContrastWithForgedZeroFindingCount),
    /lacks a passing measured ratio/
  );

  const staleHardenedScanner = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  staleHardenedScanner[0].records[0].evidence!.contrastGates[0].hardenedTextAlgorithmSha256 = "1".repeat(64);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(staleHardenedScanner),
    /hardened text contrast algorithm is stale or unreviewed/
  );

  const forgedHardenedZeroFindings = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  forgedHardenedZeroFindings[0].records[0].evidence!.contrastGates[0].hardenedTextMinRatio = 2.99;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedHardenedZeroFindings),
    /hardened text contrast gate lacks a passing measured ratio/
  );

  const missingHardenedEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact) as unknown as Array<Record<string, any>>;
  delete missingHardenedEvidence[0].records[0].evidence.contrastGates[0].hardenedTextEvidenceSha256;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingHardenedEvidence as never),
    /hardened text evidence digest is malformed/
  );

  const unsettledContrast = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  unsettledContrast[0].records[0].evidence!.contrastGates[0].stableRafSnapshots = 2;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(unsettledContrast),
    /lacks three stable requestAnimationFrame snapshots/
  );

  const missingExecutableWebGl = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingExecutableWebGl[1].records[0].evidence!.contrastGates[0].executableWebGlCanvasSurfaceCount = 0;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingExecutableWebGl),
    /WebGL surface lacks executable source\/raster evidence/
  );

  const reusedWebGlStateEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  reusedWebGlStateEvidence[1].records[0].evidence!.premium!.webGlContrast[1].state = "default";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(reusedWebGlStateEvidence),
    /missing or extra .* executable WebGL contrast evidence/
  );

  const wrongProviderStateKey = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  wrongProviderStateKey[1].records[0].evidence!.premium!.webGlContrast[0].stateKey = "playing";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(wrongProviderStateKey),
    /provider state key is misattributed/
  );

  const wrongProviderPlayback = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  wrongProviderPlayback[1].records[0].evidence!.premium!.webGlContrast[0].playbackState = "playing";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(wrongProviderPlayback),
    /provider playback binding is incorrect/
  );

  const webGlScreenshotMisattribution = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  webGlScreenshotMisattribution[1].records[0].evidence!.premium!.webGlContrast[1].bitmapRgbaSha256 = "a".repeat(64);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(webGlScreenshotMisattribution),
    /does not bind the retained frame/
  );

  const legacyWebGlProvider = cloneCoverageArtifactsSharingCanvasReceipts(exact) as unknown as Array<Record<string, any>>;
  legacyWebGlProvider[1].records[0].evidence.premium.webGlContrast[0].providerVersion = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(legacyWebGlProvider as never),
    /unknown WebGL contrast provider version/
  );

  const malformedWebGlPngIdentity = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  malformedWebGlPngIdentity[1].records[0].evidence!.premium!.webGlContrast[0].bitmapPngSha256 = "not-a-digest";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(malformedWebGlPngIdentity),
    /WebGL retained executable evidence failed exact revalidation/
  );

  const driftedWebGlBitmapSize = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  driftedWebGlBitmapSize[1].records[0].evidence!.premium!.webGlContrast[0].bitmapWidth += 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(driftedWebGlBitmapSize),
    /retained bitmap width does not bind the retained frame/
  );

  const forgedWebGlCaptureToken = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  forgedWebGlCaptureToken[1].records[0].evidence!.premium!.webGlContrast[0].captureToken = "forged";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedWebGlCaptureToken),
    /compositor binding digest drifted/
  );

  const missingCompositorTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingCompositorTarget[1].records[0].evidence!.premium!.webGlContrast[0]
    .compositorTargetEvidence.pop();
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingCompositorTarget),
    /compositor.*target evidence is not the exact scene-derived set/,
    "each state must retain exact object-level final-compositor evidence"
  );

  const extraCompositorTargetContract = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  extraCompositorTargetContract[1].records[0].evidence!.premium!.webGlContrast[0]
    .compositorTargetContract.push(structuredClone(
      extraCompositorTargetContract[1].records[0].evidence!.premium!.webGlContrast[0]
        .compositorTargetContract[0]
    ));
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(extraCompositorTargetContract),
    /compositor.*projected target contract drifted/,
    "final-compositor target contracts reject duplicate or extra objects"
  );

  const movedCompositorGeometry = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  movedCompositorGeometry[1].records[0].evidence!.premium!.webGlContrast[0]
    .compositorTargetEvidence[0].projectedGeometryDigest = "0".repeat(64);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(movedCompositorGeometry),
    /compositor.*projected geometry drifted/,
    "same-color objects cannot move to a forged region in final compositor evidence"
  );

  const wrongCompositorObjectCount = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  wrongCompositorObjectCount[1].records[0].evidence!.premium!.webGlContrast[0]
    .compositorRenderedObjectCount -= 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(wrongCompositorObjectCount),
    /compositor rendered object count drifted/,
    "final compositor evidence must bind the exact scene object inventory"
  );

  const forgedCompositorBinding = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  forgedCompositorBinding[1].records[0].evidence!.premium!.webGlContrast[0]
    .compositorBindingSha256 = "0".repeat(64);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedCompositorBinding),
    /compositor binding digest drifted/,
    "terminal evidence must bind route, state, crop, compositor pixels, and projected targets"
  );

  const staticPlayingCompositor = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const staticPlayingEvidence = staticPlayingCompositor[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  staticPlayingEvidence.playingCompositorSamples[1].compositorChangedPixelRatioFromPrevious = 0;
  staticPlayingEvidence.playingCompositorSamples[1].compositorMeanAbsoluteDiffRatioFromPrevious = 0;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(staticPlayingCompositor),
    /playing compositor sample 1 is static/,
    "internal WebGL changes cannot substitute for a visibly changing final-compositor sequence"
  );

  const reusedPlayingCompositorPixels = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const reusedPlayingEvidence = reusedPlayingCompositorPixels[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  const reusedFirstSample = reusedPlayingEvidence.playingCompositorSamples[0];
  const reusedSecondSample = reusedPlayingEvidence.playingCompositorSamples[1];
  reusedSecondSample.compositorPngSha256 = reusedFirstSample.compositorPngSha256;
  reusedSecondSample.compositorRgbaSha256 = reusedFirstSample.compositorRgbaSha256;
  reusedSecondSample.compositorBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
    captureToken: reusedSecondSample.captureToken,
    capturedUrl: reusedPlayingEvidence.capturedUrl,
    clip: reusedPlayingEvidence.compositorClip,
    compositorElapsedBracket: reusedSecondSample.compositorElapsedBracket,
    compositorElapsedSeconds: reusedSecondSample.compositorElapsedSeconds,
    compositorFrameIndexBracket: reusedSecondSample.compositorFrameIndexBracket,
    compositorPngSha256: reusedSecondSample.compositorPngSha256,
    compositorRgbaSha256: reusedSecondSample.compositorRgbaSha256,
    stateKey: "playing",
    targetContract: reusedSecondSample.targetContract,
    timelineValueBracket: reusedSecondSample.timelineValueBracket
  });
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(reusedPlayingCompositorPixels),
    /playing-compositor-static-or-reused/,
    "nonzero claimed diff metrics cannot certify a reused or static compositor bitmap"
  );

  const unionPlayingCompositor = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const unionPlayingEvidence = unionPlayingCompositor[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  const unionSample = unionPlayingEvidence.playingCompositorSamples[1];
  unionSample.targetContract.push(structuredClone(unionSample.targetContract[0]));
  unionSample.targetEvidence.push(structuredClone(unionSample.targetEvidence[0]));
  unionSample.compositorBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
    captureToken: unionSample.captureToken,
    capturedUrl: unionPlayingEvidence.capturedUrl,
    clip: unionPlayingEvidence.compositorClip,
    compositorElapsedBracket: unionSample.compositorElapsedBracket,
    compositorElapsedSeconds: unionSample.compositorElapsedSeconds,
    compositorFrameIndexBracket: unionSample.compositorFrameIndexBracket,
    compositorPngSha256: unionSample.compositorPngSha256,
    compositorRgbaSha256: unionSample.compositorRgbaSha256,
    stateKey: "playing",
    targetContract: unionSample.targetContract,
    timelineValueBracket: unionSample.timelineValueBracket
  });
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(unionPlayingCompositor),
    /playing-compositor-1-projection-drift/,
    "a compositor union or duplicate target set cannot stand in for the exact later playing state"
  );

  const weakenedPlayingSampleGeometry = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const weakenedPlayingEvidence = weakenedPlayingSampleGeometry[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  weakenedPlayingEvidence.playingCompositorSamples[1]
    .targetEvidence[0].matchedArcLengthBucketCount = 0;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(weakenedPlayingSampleGeometry),
    /playing-compositor-1-target-evidence-drift/,
    "the later compositor sample must independently retain full topology and corridor evidence"
  );

  const averagedPlayingTimestamp = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const averagedPlayingEvidence = averagedPlayingTimestamp[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  const averagedSample = averagedPlayingEvidence.playingCompositorSamples[1];
  averagedSample.compositorElapsedSeconds =
    (averagedSample.compositorElapsedBracket.before + averagedSample.compositorElapsedBracket.after) / 2;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(averagedPlayingTimestamp),
    /playing-compositor-1-time-is-not-lower-fence/,
    "a bracket average must never be presented as the exact compositor capture timestamp"
  );

  const nonCanonicalResetCompositor = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const nonCanonicalResetEvidence = nonCanonicalResetCompositor[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "reset")!;
  nonCanonicalResetEvidence.compositorResetDifference = {
    changedPixelRatio: 0.01,
    meanAbsoluteDiffRatio: 0.001
  };
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(nonCanonicalResetCompositor),
    /reset final compositor did not canonically restore default/,
    "reset must restore the exact canonical default compositor, not merely a tolerant approximation"
  );

  const missingArcBuckets = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingArcBuckets[1].records[0].evidence!.premium!.webGlContrast[0]
    .targetEvidence[0].matchedArcLengthBucketCount = 0;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(missingArcBuckets),
    /arc-length\/topology coverage is incomplete/,
    "durable evidence must recheck arc-length buckets instead of trusting a global pixel ratio"
  );

  const escapedApprovedCorridor = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  escapedApprovedCorridor[1].records[0].evidence!.premium!.webGlContrast[0]
    .targetEvidence[0].offCorridorCorePixelRatio = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(escapedApprovedCorridor),
    /same-color pixels escape the approved projected corridor union/,
    "durable evidence must reject local or same-color union overlays outside reviewed corridors"
  );

  const weakenedWebGlTargetContract = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  weakenedWebGlTargetContract[1].records[0].evidence!.premium!.webGlContrast[0]
    .targetContract[0].minimumCorePixels = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(weakenedWebGlTargetContract),
    /projected target contract drifted/
  );

  const exactDefaultWebGl = exact[1].records[0].evidence!.premium!.webGlContrast
    .find((entry) => entry.state === "default")!;
  const exactPlayingWebGl = exact[1].records[0].evidence!.premium!.webGlContrast
    .find((entry) => entry.state === "playing")!;
  const defaultTargetIds = new Set(exactDefaultWebGl.targetContract.map((target) => target.evidenceId));
  const playingOnlyTarget = exactPlayingWebGl.targetContract
    .find((target) => !defaultTargetIds.has(target.evidenceId));
  assert.ok(playingOnlyTarget, "synthetic v3 fixture must retain a playing-only target contract");
  const playingOnlyEvidence = exactPlayingWebGl.targetEvidence
    .find((target) => target.evidenceId === playingOnlyTarget.evidenceId);
  assert.ok(playingOnlyEvidence, "synthetic v3 fixture must retain playing-only target evidence");

  const defaultWithPlayingOnlyTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const defaultWithPlayingOnlyEvidence = defaultWithPlayingOnlyTarget[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "default")!;
  defaultWithPlayingOnlyEvidence.targetContract.push(structuredClone(playingOnlyTarget));
  defaultWithPlayingOnlyEvidence.targetEvidence.push(structuredClone(playingOnlyEvidence));
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(defaultWithPlayingOnlyTarget),
    /projected target contract drifted/,
    "default/reset evidence cannot borrow the animated playing-only target"
  );

  const playingWithoutPlayingOnlyTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const playingWithoutPlayingOnlyEvidence = playingWithoutPlayingOnlyTarget[1].records[0]
    .evidence!.premium!.webGlContrast.find((entry) => entry.state === "playing")!;
  playingWithoutPlayingOnlyEvidence.targetContract = playingWithoutPlayingOnlyEvidence.targetContract
    .filter((target) => target.evidenceId !== playingOnlyTarget.evidenceId);
  playingWithoutPlayingOnlyEvidence.targetEvidence = playingWithoutPlayingOnlyEvidence.targetEvidence
    .filter((target) => target.evidenceId !== playingOnlyTarget.evidenceId);
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(playingWithoutPlayingOnlyTarget),
    /projected target contract drifted/,
    "playing evidence must retain every state-dependent target"
  );

  const droppedWebGlTargetContractOnly = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  droppedWebGlTargetContractOnly[1].records[0].evidence!.premium!.webGlContrast[0].targetContract.pop();
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(droppedWebGlTargetContractOnly),
    /projected target contract drifted/,
    "durable verification must revalidate the provider target contract, not only target evidence"
  );

  const invertedWebGlCaptureWindow = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const invertedCapture = invertedWebGlCaptureWindow[1].records[0]
    .evidence!.premium!.webGlContrast[0];
  invertedCapture.captureEndedAtMs = invertedCapture.captureStartedAtMs - 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(invertedWebGlCaptureWindow),
    /WebGL retained executable evidence failed exact revalidation/,
    "durable verification must reject impossible capture lifecycles"
  );

  const webGlQueryDrift = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  webGlQueryDrift[1].records[0].evidence!.premium!.webGlContrast[0].capturedUrl += "&unexpected=1";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(webGlQueryDrift),
    /compositor binding digest drifted/
  );

  const droppedWebGlTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  droppedWebGlTarget[1].records[0].evidence!.premium!.webGlContrast[0].targetEvidence.pop();
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(droppedWebGlTarget),
    /target evidence is not the exact scene-derived set/
  );

  const inventedWebGlTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  inventedWebGlTarget[1].records[0].evidence!.premium!.webGlContrast[0].targetEvidence.push({
    arcLengthBucketCount: 1,
    cameraProjectionDigest: "a".repeat(64),
    corePixelCount: 999,
    endpointMatchCount: 1,
    evidenceId: "invented-role",
    expectedRegion: { maxX: 1, maxY: 1, minX: 0, minY: 0 },
    largestConnectedCorePixelCount: 999,
    matchedArcLengthBucketCount: 1,
    matchedSpatialSampleCount: 1,
    maximumConsecutiveMissingBuckets: 0,
    objectId: "invented-object",
    offCorridorCorePixelCount: 0,
    offCorridorCorePixelRatio: 0,
    onPathCorePixelCount: 999,
    passed: true,
    primitiveId: "invented-primitive",
    projectedGeometryDigest: "b".repeat(64),
    projectedPointCount: 1,
    requiredSpatialSampleCount: 1,
    role: "invented",
    segmentCount: 0,
    spatialCoverageRatio: 1,
    topology: "point"
  });
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(inventedWebGlTarget),
    /target evidence is not the exact scene-derived set/
  );

  const renamedWebGlRole = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  renamedWebGlRole[1].records[0].evidence!.premium!.webGlContrast[0].targetEvidence[0].role = "wrong-role";
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(renamedWebGlRole),
    /role attribution drifted/
  );

  const failedWebGlTarget = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  failedWebGlTarget[1].records[0].evidence!.premium!.webGlContrast[0].targetEvidence[0].passed = false;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(failedWebGlTarget),
    /target failed/,
    "durable evidence cannot type-narrow a failed provider target into a pass"
  );

  const terminalWebGlIssue = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  terminalWebGlIssue[1].records[0].evidence!.premium!.webGlContrast[0]
    .terminalIssues.push("synthetic-terminal-failure");
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(terminalWebGlIssue),
    /WebGL terminal audit recorded issues/,
    "durable evidence must preserve provider terminal issues"
  );

  const weakWebGlCore = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  weakWebGlCore[1].records[0].evidence!.premium!.webGlContrast[0].targetEvidence[0].corePixelCount = 1;
  weakWebGlCore[1].records[0].evidence!.premium!.webGlContrast[0]
    .targetEvidence[0].largestConnectedCorePixelCount = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(weakWebGlCore),
    /lacks the required terminal core pixels/
  );

  const weakWebGlConnectedCore = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  weakWebGlConnectedCore[1].records[0].evidence!.premium!.webGlContrast[0]
    .targetEvidence[0].largestConnectedCorePixelCount = 1;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(weakWebGlConnectedCore),
    /lacks the required connected terminal core/
  );

  const forgedWebGlSourceContract = cloneCoverageArtifactsSharingCanvasReceipts(exact) as unknown as Array<Record<string, any>>;
  forgedWebGlSourceContract[1].records[0].evidence.premium.webGlContrast[0].sourceContract =
    `forged:${CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT}:suffix`;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedWebGlSourceContract as never),
    /source contract is not the exact reviewed contract/
  );

  const forgedWebGlPaletteContract = cloneCoverageArtifactsSharingCanvasReceipts(exact) as unknown as Array<Record<string, any>>;
  forgedWebGlPaletteContract[1].records[0].evidence.premium.webGlContrast[0].visualPaletteSourceContract =
    `forged:${MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT}`;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedWebGlPaletteContract as never),
    /palette source contract is not the exact reviewed contract/
  );

  const ignoredOrExtraEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  ignoredOrExtraEvidence[0].records[0].auditEvidence!.push(
    "ignored-expected-superseded-request: synthetic exemption"
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(ignoredOrExtraEvidence),
    /unrecognized, duplicate, forged, skipped, exempted, or extra audit evidence/
  );

  const duplicateUxEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  duplicateUxEvidence[0].records[0].auditEvidence!.push(
    duplicateUxEvidence[0].records[0].auditEvidence!.find((entry) => entry.startsWith("ux-ready:"))!
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(duplicateUxEvidence),
    /expected exactly 1 UX-ready evidence entry/,
    "duplicate otherwise-valid evidence must not certify a record"
  );

  const forgedAllowedPrefix = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  forgedAllowedPrefix[0].records[0].auditEvidence!.push(
    "ux-ready:primary:ignored-by-prefix-only-parser:1ms:budget=30000ms"
  );
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(forgedAllowedPrefix),
    /unrecognized, duplicate, forged/,
    "a forged string sharing an allowed prefix must not certify a record"
  );

  const duplicateTerminalEvidence = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const terminalRecordIndex = duplicateTerminalEvidence[0].records.findIndex((record) =>
    record.auditEvidence?.some((entry) => entry.startsWith("terminal-quiescence:"))
  );
  assert.ok(terminalRecordIndex >= 0, "synthetic ledger lacks terminal evidence fixture");
  duplicateTerminalEvidence[0].records[terminalRecordIndex] = cloneCoverageRecordSharingCanvasReceipts(
    duplicateTerminalEvidence[0].records[terminalRecordIndex]
  );
  const terminalRecord = duplicateTerminalEvidence[0].records[terminalRecordIndex];
  terminalRecord.auditEvidence!.push("terminal-quiescence:quiescent=true:waited=2ms:pending=0");
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(duplicateTerminalEvidence),
    /exactly one terminal quiescence evidence entry|duplicate terminal quiescence evidence/,
    "terminal evidence must occur exactly once per artifact axis"
  );

  const missingDirectoryUi = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  missingDirectoryUi[0].records[0].evidence!.uiGates = missingDirectoryUi[0].records[0].evidence!.uiGates
    .filter((gate) => gate.state !== "after-reset");
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(missingDirectoryUi), /missing or extra .* UI gate/);

  const noModelChange = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  noModelChange[0].records[0].evidence!.signatureControl!.modelChanged = false;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(noModelChange), /model-change/);

  const redrawOnlyModelChange = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  redrawOnlyModelChange[0].records[0].evidence!.signatureControl!.changedModelFingerprint =
    redrawOnlyModelChange[0].records[0].evidence!.signatureControl!.defaultModelFingerprint;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(redrawOnlyModelChange), /stable model fingerprint/);

  const resetNotRestored = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  resetNotRestored[0].records[0].evidence!.reset!.restoredDefault = false;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(resetNotRestored), /reset restoration/);

  const resetFingerprintMismatch = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  resetFingerprintMismatch[0].records[0].evidence!.reset!.restoredControlFingerprint = "7".repeat(64);
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(resetFingerprintMismatch), /default control fingerprint/);

  const resetVisualDrift = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  resetVisualDrift[0].records[0].evidence!.reset!.surfaceChangedPixelRatio =
    CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO + 0.01;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(resetVisualDrift),
    /changed-pixel ratio exceeded tolerance/
  );

  const resetEdgeDrift = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  resetEdgeDrift[0].records[0].evidence!.reset!.surfaceEdgeMismatchRatio =
    CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO + 0.01;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(resetEdgeDrift),
    /edge-mismatch ratio exceeded tolerance/
  );

  const stabilityDowngrade = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  stabilityDowngrade[0].records[0].evidence!.reset!.restoredSurfaceStable = false;
  stabilityDowngrade[0].records[0].evidence!.reset!.surfaceComparison = "dynamic-semantic";
  stabilityDowngrade[0].records[0].evidence!.reset!.surfaceChangedPixelRatio = null;
  stabilityDowngrade[0].records[0].evidence!.reset!.surfaceEdgeMismatchRatio = null;
  stabilityDowngrade[0].records[0].evidence!.reset!.surfaceMeanAbsoluteDiffRatio = null;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(stabilityDowngrade),
    /changed the measured surface stability class/,
    "a stable default cannot be downgraded to dynamic reset evidence"
  );

  const fabricatedDynamicReset = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  fabricatedDynamicReset[0].records[0].evidence!.reset!.surfaceComparison = "dynamic-semantic";
  fabricatedDynamicReset[0].records[0].evidence!.reset!.surfaceChangedPixelRatio = null;
  fabricatedDynamicReset[0].records[0].evidence!.reset!.surfaceEdgeMismatchRatio = null;
  fabricatedDynamicReset[0].records[0].evidence!.reset!.surfaceMeanAbsoluteDiffRatio = null;
  assert.throws(
    () => verifyCaliforniaVisualizationCoverageArtifacts(fabricatedDynamicReset),
    /dynamic reset comparison cannot replace available stable-pixel evidence/
  );

  const premiumNotPaused = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  premiumNotPaused[1].records[0].evidence!.premium!.control.finalState = "playing" as "paused";
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(premiumNotPaused), /exact paused/);

  const premiumStatic = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const playing = premiumStatic[1].records[0].evidence!.premium!.frames.find((frame) => frame.state === "playing")!;
  playing.changedPixelRatioFromDefault = 0;
  playing.meanAbsoluteDiffRatioFromDefault = 0;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(premiumStatic), /meaningful playing frame change/);

  const premiumCaptureRace = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const racedPlaying = premiumCaptureRace[1].records[0].evidence!.premium!.frames
    .find((frame) => frame.state === "playing")!;
  racedPlaying.playbackStateAfterCapture = "paused";
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(premiumCaptureRace), /playback state after capture/);

  const premiumResetDrift = cloneCoverageArtifactsSharingCanvasReceipts(exact);
  const reset = premiumResetDrift[1].records[0].evidence!.premium!.frames.find((frame) => frame.state === "reset")!;
  reset.changedPixelRatioFromDefault = 0.9;
  reset.meanAbsoluteDiffRatioFromDefault = 0.5;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(premiumResetDrift), /reset frame did not return/);
});

test("California Canvas paper proof stops at the adapter-owned opaque surface", () => {
  const firstSite = californiaCanvasEssentialPaintSites[0]!;
  const firstBenchId = String(firstSite.benchId);
  const firstLab = californiaVisualizationQaInventory.labs.find((lab) =>
    [lab.assignment.primary, ...(lab.assignment.related ?? [])].some((benchId) =>
      String(benchId) === firstBenchId
    )
  )!;
  const gate = buildSyntheticCanvasGraphicsGate({
    axisId: "paper-stack-canary",
    benchId: firstBenchId,
    capturedUrl: `https://qa.invalid/student/tools/visualizations?${new URLSearchParams({
      grade: firstLab.grade,
      lab: firstLab.labId,
      track: "all"
    }).toString()}`,
    receiptOrdinal: 890_001,
    selectedSites: [firstSite],
    stateKey: "default"
  });
  const expectation = {
    benchId: firstBenchId,
    capturedUrl: gate.canvasGraphicsEvidence.capturedUrl,
    maxAgeMs: 0,
    nowEpochMs: gate.canvasGraphicsEvidence.capturedAtEpochMs,
    runtimeRunId: gate.canvasGraphicsEvidence.runtimeRunId,
    stateKey: gate.canvasGraphicsEvidence.stateKey,
    surfaceKey: gate.canvasGraphicsEvidence.surfaceKey
  };
  const outerGlassLayer = {
    backdropFilter: "blur(12px)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backgroundImage: "linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))",
    boxShadow: "rgba(15, 23, 42, 0.2) 0px 8px 24px 0px",
    elementIdentity: "section.outer-glass-shell",
    filter: "none",
    isPaperSurface: false,
    maskImage: "none",
    mixBlendMode: "normal",
    opacity: 0.9,
    withinPaperStack: false
  } as const;

  const outsideEvidence = structuredClone(gate.canvasGraphicsEvidence);
  outsideEvidence.canvases[0]!.paperProof.compositingLayers = [
    ...outsideEvidence.canvases[0]!.paperProof.compositingLayers,
    outerGlassLayer
  ];
  const sealedOutsideEvidence = sealSyntheticCanvasEvidence(outsideEvidence);
  assert.deepEqual(
    verifyCaliforniaCanvasGraphicsStateEvidence(
      sealedOutsideEvidence,
      expectation,
      californiaCanvasGraphicsSourceContract
    ),
    [],
    "an opaque #fbfbf8 paper surface must terminate background compositing from outer app chrome"
  );

  const insideEvidence = structuredClone(gate.canvasGraphicsEvidence);
  insideEvidence.canvases[0]!.paperProof.compositingLayers = [
    insideEvidence.canvases[0]!.paperProof.compositingLayers[0]!,
    { ...outerGlassLayer, elementIdentity: "div.inner-glass-layer", withinPaperStack: true },
    ...insideEvidence.canvases[0]!.paperProof.compositingLayers.slice(1)
  ];
  const sealedInsideEvidence = sealSyntheticCanvasEvidence(insideEvidence);
  assert.match(
    verifyCaliforniaCanvasGraphicsStateEvidence(
      sealedInsideEvidence,
      expectation,
      californiaCanvasGraphicsSourceContract
    ).join("|"),
    /unresolved-compositing-layer/,
    "the same compositing effects must remain forbidden between Canvas pixels and the opaque paper"
  );
});

test("California Canvas text QA readback does not contaminate graphics runtime evidence", { timeout: 30_000 }, async () => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the Canvas audit interop canary: ${String(error)}`);
  }

  try {
    const page = await browser.newPage({ viewport: { height: 600, width: 800 } });
    await installCaliforniaCanvasTextAudit(page);
    const runtime = await installCaliforniaCanvasGraphicsRuntime(page, {
      benchIds: ["CountingLab"],
      runtimeRunId: "canvas-text-readback-canary-20260821"
    });
    const binding = runtime.bindings.find((entry) => entry.benchId === "CountingLab");
    assert.ok(binding, "CountingLab must expose one reviewed Canvas binding for the interop canary");

    const origin = "https://canvas-audit-interop.test";
    await page.route(`${origin}/**`, (route) => route.fulfill({
      body: "<!doctype html><meta charset=utf-8><title>canvas-audit-interop</title>",
      contentType: "text/html",
      status: 200
    }));
    await page.goto(origin);
    const issues = await page.evaluate(async (bindingKey) => {
      document.body.innerHTML = `
        <section id="root" data-viz-signature-lab>
          <div data-viz-surface data-viz-surface-kind="signature-canvas"
               style="background:#fbfbf8;color-scheme:light">
            <canvas data-viz-signature-paper-layer height="120" width="240"></canvas>
          </div>
        </section>
      `;
      const root = document.querySelector<HTMLElement>("#root")!;
      const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
      const context = canvas.getContext("2d")!;
      const graphics = (globalThis as typeof globalThis & {
        __californiaCanvasGraphicsRuntime?: {
          collect(
            root: HTMLElement,
            request: { benchId: string; stateKey: string; surfaceKey: string }
          ): Promise<{ canvases: readonly { issues: readonly string[] }[] }>;
          registerContext(
            bindingKey: string,
            context: CanvasRenderingContext2D
          ): CanvasRenderingContext2D;
          version: number;
        };
        __californiaCanvasTextAudit?: {
          contrastInputs(root: HTMLElement): unknown[];
          version: number;
        };
      }).__californiaCanvasGraphicsRuntime;
      const textAudit = (globalThis as typeof globalThis & {
        __californiaCanvasTextAudit?: {
          contrastInputs(root: HTMLElement): unknown[];
          version: number;
        };
      }).__californiaCanvasTextAudit;
      if (!graphics || graphics.version !== 1 || !textAudit || textAudit.version !== 4) {
        throw new Error("California Canvas audit interop runtimes are unavailable");
      }
      graphics.registerContext(bindingKey, context);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = "24px sans-serif";
      context.fillStyle = "#111827";
      context.fillText("5", 24, 48);
      textAudit.contrastInputs(root);
      const evidence = await graphics.collect(root, {
        benchId: "CountingLab",
        stateKey: "interop",
        surfaceKey: "default"
      });
      return evidence.canvases.flatMap((entry) => entry.issues);
    }, binding.key);

    assert.equal(
      issues.some((issue) => issue === "unsupported-runtime-api:getImageData"),
      false,
      `text-audit native readback must not be attributed to product Canvas code: ${issues.join("|")}`
    );
  } finally {
    await browser?.close();
  }
});

test("California Canvas background proof crosses only one antialias or outline fringe", { timeout: 30_000 }, async () => {
  const fillSite = californiaCanvasGraphicsSourceContract.paintSites.find((site) =>
    String(site.benchId) === "TeenNumbersLab" && site.operation === "fill" &&
    site.paintExpression === "col" && Boolean(site.authoredPathGroupKey)
  );
  const outlineSite = fillSite && californiaCanvasGraphicsSourceContract.paintSites.find((site) =>
    String(site.benchId) === "TeenNumbersLab" && site.operation === "stroke" &&
    site.authoredPathGroupKey === fillSite.authoredPathGroupKey
  );
  const binding = californiaCanvasGraphicsSourceContract.bindings.find((entry) =>
    String(entry.benchId) === "TeenNumbersLab"
  );
  assert.ok(fillSite && outlineSite && binding,
    "TeenNumbersLab must retain one reviewed fill+outline group for the neighbor canary");

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the Canvas neighbor canary: ${String(error)}`);
  }

  try {
    const page = await browser.newPage({ viewport: { height: 400, width: 600 } });
    await installCaliforniaCanvasGraphicsRuntime(page, {
      benchIds: ["TeenNumbersLab"],
      contract: californiaCanvasGraphicsSourceContract,
      runtimeRunId: "canvas-neighbor-radius-canary-20260821"
    });
    const origin = "https://canvas-neighbor-canary.test";
    await page.route(`${origin}/**`, (route) => route.fulfill({
      body: "<!doctype html><meta charset=utf-8><title>canvas-neighbor-canary</title>",
      contentType: "text/html",
      status: 200
    }));
    await page.goto(origin);
    const evidence = await page.evaluate(({ bindingKey, fillKey, outlineKey }) => {
      document.body.innerHTML = `
        <section id="root" data-viz-signature-lab>
          <div data-viz-signature-paper-surface style="background:#fbfbf8;color-scheme:light">
            <canvas data-viz-signature-paper-layer height="160" width="240"></canvas>
          </div>
        </section>
      `;
      const root = document.querySelector<HTMLElement>("#root")!;
      const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
      const context = canvas.getContext("2d")!;
      const graphics = (globalThis as typeof globalThis & {
        __californiaCanvasGraphicsRuntime?: {
          collect(
            root: HTMLElement,
            request: { benchId: string; stateKey: string; surfaceKey: string }
          ): Promise<CaliforniaCanvasGraphicsStateEvidence>;
          invoke(
            sourceSiteKey: string,
            context: CanvasRenderingContext2D,
            operation: "fill" | "stroke",
            thunk: () => unknown
          ): unknown;
          registerContext(
            bindingKey: string,
            context: CanvasRenderingContext2D
          ): CanvasRenderingContext2D;
        };
      }).__californiaCanvasGraphicsRuntime;
      if (!graphics) throw new Error("California Canvas graphics runtime is unavailable");
      graphics.registerContext(bindingKey, context);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(120, 80, 28, 0, Math.PI * 2);
      context.fillStyle = "#3f74a6";
      graphics.invoke(fillKey, context, "fill", () => context.fill());
      context.strokeStyle = "#1c2b3a";
      context.lineWidth = 1;
      graphics.invoke(outlineKey, context, "stroke", () => context.stroke());
      return graphics.collect(root, {
        benchId: "TeenNumbersLab",
        stateKey: "outlined-fill",
        surfaceKey: "neighbor-canary"
      });
    }, {
      bindingKey: binding!.key,
      fillKey: fillSite!.sourceSiteKey,
      outlineKey: outlineSite!.sourceSiteKey
    });
    const canvas = evidence.canvases[0]!;
    const fillEvidence = canvas.siteEvidence.find((site) =>
      site.sourceSiteKey === fillSite!.sourceSiteKey
    );
    assert.ok(fillEvidence,
      `a conforming fill enclosed by a one-pixel outline must remain evidence: ${canvas.issues.join("|")}`);
    assert.ok(fillEvidence.backgroundNeighborPixelCount > 0,
      "the bounded two-pixel search must reach stable paper beyond one outline/antialias fringe");
    assert.equal(
      canvas.issues.some((issue) =>
        issue === `connected-background-missing:${fillSite!.sourceSiteKey}`
      ),
      false
    );
  } finally {
    await browser?.close();
  }
});

test("California Canvas v5 aggregate hard-negatives stay compact and fail closed", () => {
  const firstSite = californiaCanvasEssentialPaintSites[0]!;
  const firstBenchId = String(firstSite.benchId);
  const firstLab = californiaVisualizationQaInventory.labs.find((lab) =>
    [lab.assignment.primary, ...(lab.assignment.related ?? [])].some((benchId) =>
      String(benchId) === firstBenchId
    )
  )!;
  const firstCapturedUrl = `https://qa.invalid/student/tools/visualizations?${new URLSearchParams({
    grade: firstLab.grade,
    lab: firstLab.labId,
    track: "all"
  }).toString()}`;
  const firstGate = buildSyntheticCanvasGraphicsGate({
    axisId: "compact-negative",
    benchId: firstBenchId,
    capturedUrl: firstCapturedUrl,
    receiptOrdinal: 900_001,
    selectedSites: [firstSite],
    stateKey: "default"
  });

  const duplicateReceiptGate = buildSyntheticCanvasGraphicsGate({
    axisId: "compact-negative",
    benchId: firstBenchId,
    capturedUrl: firstCapturedUrl,
    receiptId: firstGate.canvasGraphicsEvidence.receiptId,
    receiptOrdinal: 900_002,
    selectedSites: [firstSite],
    stateKey: "after-control"
  });
  assert.throws(
    () => verifyDirectoryCanvasGraphicsAggregate([firstGate, duplicateReceiptGate]),
    /duplicate Canvas graphics receipt/,
    "two independently valid state payloads cannot reuse one executable receipt identity"
  );

  const mixedRuntimeGate = buildSyntheticCanvasGraphicsGate({
    axisId: "compact-negative",
    benchId: firstBenchId,
    capturedUrl: firstCapturedUrl,
    receiptOrdinal: 900_003,
    runtimeRunId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    selectedSites: [firstSite],
    stateKey: "after-reset"
  });
  assert.throws(
    () => verifyDirectoryCanvasGraphicsAggregate([firstGate, mixedRuntimeGate]),
    /directory Canvas graphics receipts mix runtime runs/,
    "a complete receipt from another composed runtime run cannot enter the matrix ledger"
  );

  const omittedSourceSite = californiaCanvasEssentialPaintSites.find((site) =>
    (californiaCanvasEssentialSitesByBench.get(String(site.benchId))?.length ?? 0) > 1
  )!;
  let receiptOrdinal = 910_000;
  const compactMissingSourceGates = [...californiaCanvasEssentialSitesByBench.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([benchId, benchSites]) => {
      const lab = californiaVisualizationQaInventory.labs.find((candidate) =>
        [candidate.assignment.primary, ...(candidate.assignment.related ?? [])].some((candidateBenchId) =>
          String(candidateBenchId) === benchId
        )
      );
      assert.ok(lab, `${benchId}: compact aggregate fixture has no catalog route owner`);
      const selectedSites = benchSites.filter((site) =>
        site.sourceSiteKey !== omittedSourceSite.sourceSiteKey
      );
      assert.ok(selectedSites.length > 0, `${benchId}: compact omission removed every source site`);
      receiptOrdinal += 1;
      return buildSyntheticCanvasGraphicsGate({
        axisId: "compact-missing-source",
        benchId,
        capturedUrl: `https://qa.invalid/student/tools/visualizations?${new URLSearchParams({
          grade: lab.grade,
          lab: lab.labId,
          track: "all"
        }).toString()}`,
        receiptOrdinal,
        selectedSites,
        stateKey: "default"
      });
    });
  assert.throws(
    () => verifyDirectoryCanvasGraphicsAggregate(compactMissingSourceGates),
    /aggregate Canvas essential source coverage count drifted|aggregate Canvas essential source coverage digest drifted/,
    "a source site omitted by every otherwise-valid receipt must keep aggregate coverage red"
  );
});

test("California Visualization aggregate enforces terminal evidence per axis and the hard recovery duration", () => {
  const missingTerminalAxis = syntheticExactArtifacts();
  missingTerminalAxis[0].terminalQuiescenceByAxis = missingTerminalAxis[0].terminalQuiescenceByAxis!
    .filter((terminal) => terminal.axisId !== expectedAxisIds[1]);
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(missingTerminalAxis), /terminal quiescence.*axis/);

  const overtime = syntheticExactArtifacts();
  overtime[0].records[0].durationMs = EXPECTED_RECOVERY_DEADLINE_MS + 1;
  assert.throws(() => verifyCaliforniaVisualizationCoverageArtifacts(overtime), /exceeded 60000ms/);
});

test("California reset visual tolerance accepts antialiasing noise and rejects a wrong graph", async () => {
  const width = 40;
  const height = 30;
  const basePixels = Buffer.alloc(width * height * 3, 240);
  const antialiasedPixels = Buffer.from(basePixels);
  for (let pixel = 0; pixel < width * 2; pixel += 1) {
    const offset = pixel * 3;
    antialiasedPixels[offset] -= 4;
    antialiasedPixels[offset + 1] -= 4;
    antialiasedPixels[offset + 2] -= 4;
  }
  const wrongGraphPixels = Buffer.from(basePixels);
  for (let y = 5; y < 25; y += 1) {
    for (let x = 5; x < 35; x += 1) {
      const offset = (y * width + x) * 3;
      wrongGraphPixels[offset] = 20;
      wrongGraphPixels[offset + 1] = 20;
      wrongGraphPixels[offset + 2] = 20;
    }
  }
  const encode = (pixels: Buffer) => sharp(pixels, {
    raw: { channels: 3, height, width }
  }).png().toBuffer();
  const [basePng, antialiasedPng, wrongGraphPng] = await Promise.all([
    encode(basePixels),
    encode(antialiasedPixels),
    encode(wrongGraphPixels)
  ]);

  const antialiasing = await compareSignatureResetVisuals(basePng, antialiasedPng);
  assert.equal(antialiasing.withinTolerance, true, "small antialiasing noise should pass reset tolerance");
  assert.equal(antialiasing.changedPixelRatio, 0, "sub-threshold channel noise should not count as changed pixels");
  const wrongGraph = await compareSignatureResetVisuals(basePng, wrongGraphPng);
  assert.equal(wrongGraph.withinTolerance, false, "a materially different graph must fail reset tolerance");
  assert.ok(
    wrongGraph.changedPixelRatio > CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO ||
    wrongGraph.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO ||
    wrongGraph.meanAbsoluteDiffRatio > CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO
  );

  const thinWidth = 800;
  const thinHeight = 400;
  const thinDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const thinShifted = Buffer.from(thinDefault);
  const paintHorizontalLine = (pixels: Buffer, y: number, value: number) => {
    for (let lineY = y; lineY < y + 2; lineY += 1) {
      for (let x = 0; x < thinWidth; x += 1) {
        const offset = (lineY * thinWidth + x) * 3;
        pixels[offset] = value;
        pixels[offset + 1] = value;
        pixels[offset + 2] = value;
      }
    }
  };
  paintHorizontalLine(thinDefault, 100, 20);
  paintHorizontalLine(thinShifted, 100, 240);
  paintHorizontalLine(thinShifted, 300, 20);
  const encodeThin = (pixels: Buffer) => sharp(pixels, {
    raw: { channels: 3, height: thinHeight, width: thinWidth }
  }).png().toBuffer();
  const [thinDefaultPng, thinShiftedPng] = await Promise.all([
    encodeThin(thinDefault),
    encodeThin(thinShifted)
  ]);
  const thinLineShift = await compareSignatureResetVisuals(thinDefaultPng, thinShiftedPng);
  assert.ok(
    thinLineShift.changedPixelRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO &&
      thinLineShift.meanAbsoluteDiffRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
    "the thin-line canary must specifically exercise a change hidden by whole-frame pixel averages"
  );
  assert.ok(
    thinLineShift.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    "moving a thin mathematical curve must exceed the edge-mismatch tolerance"
  );
  assert.equal(thinLineShift.withinTolerance, false, "a moved thin mathematical curve must fail reset evidence");

  const griddedDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const griddedShifted = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const paintGrid = (pixels: Buffer) => {
    for (let y = 0; y < thinHeight; y += 20) {
      paintHorizontalLine(pixels, y, 170);
    }
    for (let x = 0; x < thinWidth; x += 20) {
      for (let y = 0; y < thinHeight; y += 1) {
        const offset = (y * thinWidth + x) * 3;
        pixels[offset] = 170;
        pixels[offset + 1] = 170;
        pixels[offset + 2] = 170;
      }
    }
  };
  paintGrid(griddedDefault);
  paintGrid(griddedShifted);
  paintHorizontalLine(griddedDefault, 103, 20);
  paintHorizontalLine(griddedShifted, 303, 20);
  const [griddedDefaultPng, griddedShiftedPng] = await Promise.all([
    encodeThin(griddedDefault),
    encodeThin(griddedShifted)
  ]);
  const griddedThinLineShift = await compareSignatureResetVisuals(griddedDefaultPng, griddedShiftedPng);
  assert.ok(
    griddedThinLineShift.changedPixelRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO &&
      griddedThinLineShift.meanAbsoluteDiffRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
    "the gridded canary must exercise a moved curve diluted by unchanged axes/grid pixels"
  );
  assert.ok(
    griddedThinLineShift.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    "unchanged graph chrome and grid edges must not dilute a moved mathematical curve"
  );
  assert.equal(
    griddedThinLineShift.withinTolerance,
    false,
    "a moved thin curve on a typical graph grid must fail reset evidence"
  );

  const sameGeometryDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const sameGeometryNoise = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  paintGrid(sameGeometryDefault);
  paintGrid(sameGeometryNoise);
  paintHorizontalLine(sameGeometryDefault, 103, 204);
  paintHorizontalLine(sameGeometryNoise, 103, 205);
  const [sameGeometryDefaultPng, sameGeometryNoisePng] = await Promise.all([
    encodeThin(sameGeometryDefault),
    encodeThin(sameGeometryNoise)
  ]);
  const sameGeometryComparison = await compareSignatureResetVisuals(
    sameGeometryDefaultPng,
    sameGeometryNoisePng
  );
  assert.equal(
    sameGeometryComparison.withinTolerance,
    true,
    "a threshold-adjacent 1/255 luminance drift on an unchanged primitive must not become edge displacement"
  );
  assert.ok(
    sameGeometryComparison.edgeMismatchRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    "same-geometry edges must remain matched despite small luminance drift"
  );

  const dashedDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const dashedShifted = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  paintGrid(dashedDefault);
  paintGrid(dashedShifted);
  const paintDashedLine = (pixels: Buffer, y: number, dash = 5, gap = 5) => {
    for (let start = 0; start < thinWidth; start += dash + gap) {
      for (let x = start; x < Math.min(thinWidth, start + dash); x += 1) {
        for (let lineY = y; lineY < y + 2; lineY += 1) {
          const offset = (lineY * thinWidth + x) * 3;
          pixels[offset] = 20;
          pixels[offset + 1] = 20;
          pixels[offset + 2] = 20;
        }
      }
    }
  };
  paintDashedLine(dashedDefault, 103);
  paintDashedLine(dashedShifted, 303);
  const [dashedDefaultPng, dashedShiftedPng] = await Promise.all([
    encodeThin(dashedDefault),
    encodeThin(dashedShifted)
  ]);
  const dashedLineShift = await compareSignatureResetVisuals(dashedDefaultPng, dashedShiftedPng);
  assert.ok(
    dashedLineShift.changedPixelRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO &&
      dashedLineShift.meanAbsoluteDiffRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
    "the dashed canary must remain below whole-frame averaging thresholds"
  );
  assert.ok(
    dashedLineShift.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    "disconnected dashes forming one mathematical curve must be evaluated as a coherent changed structure"
  );
  assert.equal(dashedLineShift.withinTolerance, false, "a moved dashed curve on a grid must fail reset evidence");

  const diagonalDashedDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const diagonalDashedShifted = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  paintGrid(diagonalDashedDefault);
  paintGrid(diagonalDashedShifted);
  const paintDiagonalDashes = (pixels: Buffer, yOffset: number) => {
    for (let x = 20; x < thinWidth - 20; x += 1) {
      if ((x - 20) % 30 >= 10) continue;
      const y = Math.floor(45 + x * 0.25) + yOffset;
      for (let pointY = y; pointY < y + 2; pointY += 1) {
        const offset = (pointY * thinWidth + x) * 3;
        pixels[offset] = 20;
        pixels[offset + 1] = 20;
        pixels[offset + 2] = 20;
      }
    }
  };
  paintDiagonalDashes(diagonalDashedDefault, 0);
  paintDiagonalDashes(diagonalDashedShifted, 100);
  const [diagonalDashedDefaultPng, diagonalDashedShiftedPng] = await Promise.all([
    encodeThin(diagonalDashedDefault),
    encodeThin(diagonalDashedShifted)
  ]);
  const diagonalDashedShift = await compareSignatureResetVisuals(
    diagonalDashedDefaultPng,
    diagonalDashedShiftedPng
  );
  assert.ok(
    diagonalDashedShift.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    `a moved dash=10/gap=20 diagonal curve must survive grid dilution: ${JSON.stringify(diagonalDashedShift)}`
  );
  assert.equal(
    diagonalDashedShift.withinTolerance,
    false,
    "a visibly moved sparse diagonal dashed curve must fail reset evidence"
  );

  const dottedDefault = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  const dottedShifted = Buffer.alloc(thinWidth * thinHeight * 3, 240);
  paintGrid(dottedDefault);
  paintGrid(dottedShifted);
  const paintDottedCurve = (pixels: Buffer, yOffset: number) => {
    for (let x = 20; x < thinWidth - 20; x += 15) {
      const y = Math.floor(45 + x * 0.25) + yOffset;
      for (let pointY = y; pointY < y + 2; pointY += 1) {
        for (let pointX = x; pointX < x + 2; pointX += 1) {
          const offset = (pointY * thinWidth + pointX) * 3;
          pixels[offset] = 20;
          pixels[offset + 1] = 20;
          pixels[offset + 2] = 20;
        }
      }
    }
  };
  paintDottedCurve(dottedDefault, 0);
  paintDottedCurve(dottedShifted, 100);
  const [dottedDefaultPng, dottedShiftedPng] = await Promise.all([
    encodeThin(dottedDefault),
    encodeThin(dottedShifted)
  ]);
  const dottedCurveShift = await compareSignatureResetVisuals(dottedDefaultPng, dottedShiftedPng);
  assert.ok(
    dottedCurveShift.edgeMismatchRatio > CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO,
    `nearby discrete marks forming a curve must not evade structural reset comparison: ` +
      `${JSON.stringify(dottedCurveShift)}`
  );
  assert.equal(dottedCurveShift.withinTolerance, false, "a moved dotted curve on a grid must fail reset evidence");
});

test("California visit deadline closes the page and drains the timed-out operation before rejecting", async () => {
  const helpers = await import("./california-visualization-qa-helpers") as unknown as Record<string, unknown>;
  assert.equal(typeof helpers.CaliforniaVisitDeadline, "function", "deadline helper must be exported");
  const Deadline = helpers.CaliforniaVisitDeadline as new (
    page: { close(options: { runBeforeUnload: boolean }): Promise<void> },
    startedAt: number,
    recoveryBudgetMs: number
  ) => { run<T>(action: string, operation: () => Promise<T>): Promise<T> };
  let closeCalled = false;
  let settleOperation!: () => void;
  let operationSettled = false;
  const page = {
    async close(options: { runBeforeUnload: boolean }) {
      assert.deepEqual(options, { runBeforeUnload: false });
      closeCalled = true;
      settleOperation();
    }
  };
  const deadline = new Deadline(page, Date.now(), 20);
  const operation = new Promise<void>((resolve) => {
    settleOperation = () => {
      operationSettled = true;
      resolve();
    };
  });

  await assert.rejects(
    () => deadline.run("hung-browser-evaluate", () => operation),
    /visit-recovery-deadline-exceeded: hung-browser-evaluate/
  );
  assert.equal(closeCalled, true);
  assert.equal(operationSettled, true, "deadline rejection must wait for the original operation to settle");
});

test("California signature reset pixels come from the intrinsic visible learner Canvas", { timeout: 40_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the intrinsic Canvas reset canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const page = await browser.newPage({ viewport: { height: 600, width: 800 } });
  await page.evaluate("globalThis.__name = function(value) { return value; }");
  const benchId = "CountingLab" as const;

  const installResetFixture = async (mode: "changed" | "dynamic" | "same") => {
    await page.setContent(`
      <style>
        html, body { margin: 0; min-height: 1600px; }
        #global-header {
          background: #0f172a;
          color: white;
          height: 64px;
          inset: 0 0 auto;
          position: fixed;
          z-index: 20;
        }
        #signature { margin-top: 96px; }
        [data-viz-surface] {
          background: #f8fafc;
          border: 1px solid #94a3b8;
          height: 900px;
          width: 360px;
        }
        #scroll-shell {
          align-items: center;
          background: #f59e0b;
          display: flex;
          height: 64px;
          position: sticky;
          top: 64px;
          z-index: 10;
        }
        html[data-scrolled-shell="true"] #scroll-shell { background: #7c3aed; }
        canvas { display: block; height: 160px; margin: 220px auto 24px; width: 240px; }
        button { display: block; height: 44px; margin: 0 auto; width: 120px; }
      </style>
      <header id="global-header">Global fixed navigation</header>
      <div id="switcher" data-viz-active-signature-bench-id="${benchId}"></div>
      <section id="signature" data-viz-signature-lab>
        <div data-viz-surface>
          <div id="scroll-shell">Default shell position</div>
          <canvas data-viz-mark height="160" width="240"></canvas>
          <button data-viz-reset-model type="button">Reset model</button>
        </div>
      </section>
    `);
    await page.locator("#signature").evaluate((root, resetMode) => {
      const paint = (canvas: HTMLCanvasElement, changed: boolean) => {
        const context = canvas.getContext("2d")!;
        context.fillStyle = changed ? "#dc2626" : "#2563eb";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "#ffffff";
        context.lineWidth = 8;
        context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
      };
      const animate = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext("2d")!;
        let revision = 0;
        const frame = () => {
          if (!canvas.isConnected) return;
          revision += 1;
          const encodedRevision = revision & 0xffffff;
          context.fillStyle = `rgb(${encodedRevision & 0xff}, ${(encodedRevision >> 8) & 0xff}, ${(encodedRevision >> 16) & 0xff})`;
          context.fillRect(0, 0, canvas.width, canvas.height);
          requestAnimationFrame(frame);
        };
        frame();
      };
      const initial = root.querySelector<HTMLCanvasElement>("canvas")!;
      if (resetMode === "dynamic") animate(initial);
      else paint(initial, false);
      root.querySelector<HTMLButtonElement>("[data-viz-reset-model]")!.addEventListener("click", () => {
        const oldCanvas = root.querySelector<HTMLCanvasElement>("canvas")!;
        const replacement = document.createElement("canvas");
        replacement.width = oldCanvas.width;
        replacement.height = oldCanvas.height;
        replacement.setAttribute("data-viz-mark", "");
        oldCanvas.replaceWith(replacement);
        if (resetMode === "dynamic") animate(replacement);
        else paint(replacement, resetMode === "changed");
        document.documentElement.dataset.scrolledShell = "true";
        root.querySelector<HTMLElement>("#scroll-shell")!.textContent = "Scrolled sticky shell position";
        window.scrollTo(0, 240);
      });
    }, mode);
    await page.evaluate(() => window.scrollTo(0, 0));
    return {
      root: page.locator("#signature"),
      surface: page.locator("#signature [data-viz-surface]"),
      switcher: page.locator("#switcher")
    };
  };

  await t.test("sticky shell and scroll drift outside an unchanged Canvas do not fail reset", async () => {
    const fixture = await installResetFixture("same");
    const defaultState = await captureSignatureBenchDefaultState(fixture.root, 2_000);
    assert.equal(defaultState.surfaceStable, true);
    await page.evaluate(() => window.scrollTo(0, 0));
    const outerBefore = await fixture.surface.screenshot({ animations: "disabled", type: "png" });
    const evidence = await resetSignatureBench(
      page,
      fixture.root,
      fixture.switcher,
      benchId,
      2_000,
      defaultState
    );
    const outerAfter = await fixture.surface.screenshot({ animations: "disabled", type: "png" });
    const outerComparison = await compareSignatureResetVisuals(outerBefore, outerAfter);
    assert.equal(
      outerComparison.withinTolerance,
      false,
      "the canary must prove the tall shell itself drifted across the sticky-scroll reset"
    );
    assert.equal(evidence.surfaceComparison, "stable-pixel-tolerance");
    assert.equal(evidence.defaultSurfaceFingerprint, evidence.restoredSurfaceFingerprint);
    assert.equal(evidence.surfaceChangedPixelRatio, 0);
  });

  await t.test("a changed intrinsic Canvas still fails reset even when controls and semantics match", async () => {
    const fixture = await installResetFixture("changed");
    const defaultState = await captureSignatureBenchDefaultState(fixture.root, 2_000);
    await assert.rejects(
      () => resetSignatureBench(page, fixture.root, fixture.switcher, benchId, 2_000, defaultState),
      /failed to restore the stable visual model within tolerance/,
      "a replacement Canvas with different mathematical paint must remain a hard reset failure"
    );
  });

  await t.test("a visible shell without an intrinsic Canvas fails closed", async () => {
    await page.setContent(`
      <section id="missing-canvas" data-viz-signature-lab>
        <div data-viz-surface style="height:160px;width:240px">No learner Canvas</div>
      </section>
    `);
    await assert.rejects(
      () => captureSignatureBenchDefaultState(page.locator("#missing-canvas"), 2_000),
      /visible intrinsic learner Canvas/i
    );
  });

  await t.test("a hidden intrinsic Canvas fails closed", async () => {
    await page.setContent(`
      <section id="hidden-canvas" data-viz-signature-lab>
        <div data-viz-surface style="height:160px;width:240px">
          <canvas data-viz-mark height="160" style="display:none" width="240"></canvas>
        </div>
      </section>
    `);
    await assert.rejects(
      () => captureSignatureBenchDefaultState(page.locator("#hidden-canvas"), 2_000),
      /visible intrinsic learner Canvas/i
    );
  });

  await t.test("a dynamic Canvas retains semantic-only reset evidence", async () => {
    const fixture = await installResetFixture("dynamic");
    const defaultState = await captureSignatureBenchDefaultState(fixture.root, 2_000);
    assert.equal(defaultState.surfaceStable, false);
    const evidence = await resetSignatureBench(
      page,
      fixture.root,
      fixture.switcher,
      benchId,
      2_000,
      defaultState
    );
    assert.equal(evidence.surfaceComparison, "dynamic-semantic");
    assert.equal(evidence.surfaceChangedPixelRatio, null);
    assert.equal(evidence.defaultControlFingerprint, evidence.restoredControlFingerprint);
    assert.equal(evidence.defaultModelFingerprint, evidence.restoredModelFingerprint);
  });
});

test("California control/reset and premium playback evidence reject redraw and lifecycle races", { timeout: 90_000 }, async (t) => {
  const helpers = await import("./california-visualization-qa-helpers") as unknown as Record<string, unknown>;
  assert.equal(
    typeof helpers.captureSignatureBenchDefaultState,
    "function",
    "stable signature default-state capture must be exported"
  );
  const captureDefault = helpers.captureSignatureBenchDefaultState as (
    root: Locator,
    timeout: number
  ) => Promise<unknown>;
  const smokeControl = helpers.smokeSignatureBenchControl as (
    root: Locator,
    timeout: number,
    options: { defaultState: unknown; structured: true }
  ) => Promise<{ modelChanged: boolean }>;
  const resetBench = helpers.resetSignatureBench as (
    page: unknown,
    root: Locator,
    switcher: Locator,
    benchId: string,
    timeout: number,
    defaultState: unknown
  ) => Promise<unknown>;
  const smokePremium = helpers.smokePremiumDirectControls as (
    panel: Locator,
    timeout: number,
    options: { onPlaying: () => Promise<void>; structured: true }
  ) => Promise<{ finalState: string }>;

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the evidence lifecycle canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const page = await browser.newPage({ viewport: { height: 600, width: 800 } });
  await installCaliforniaCanvasTextAudit(page);
  await page.goto("data:text/html,<meta charset=utf-8><title>california-evidence-canary</title>");
  await page.evaluate("globalThis.__name = function(value) { return value; }");

  const quiescenceOrigin = "https://california-quiescence.test";
  let releaseHangingRequest!: () => void;
  const hangingRequestGate = new Promise<void>((resolve) => { releaseHangingRequest = resolve; });
  await page.route(`${quiescenceOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/brief-prefetch") {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      await route.fulfill({ body: "brief", contentType: "text/plain", status: 200 });
      return;
    }
    if (pathname === "/never-quiet") {
      await hangingRequestGate;
      await route.fulfill({ body: "released", contentType: "text/plain", status: 200 });
      return;
    }
    await route.fulfill({
      body: "<!doctype html><title>quiescence canary</title>",
      contentType: "text/html",
      status: 200
    });
  });
  await page.goto(quiescenceOrigin);
  const navigationContext = {
    action: "open-directory-lab",
    axis: {
      id: "desktop-en-light",
      language: "en" as const,
      locale: "en-HK",
      theme: "light" as const,
      viewport: "desktop" as const
    },
    benchId: "algebra-tiles",
    labId: "quiescence-canary",
    routeKind: "directory" as const
  };

  const positiveDiagnostics = new CaliforniaBrowserDiagnostics(page, quiescenceOrigin);
  const briefRequestStarted = page.waitForRequest(`${quiescenceOrigin}/brief-prefetch`);
  let briefFetch: Promise<string> | undefined;
  const scheduleBriefRequest = new Promise<void>((resolve) => {
    setTimeout(() => {
      briefFetch = page.evaluate((url) => fetch(url).then((response) => response.text()),
        `${quiescenceOrigin}/brief-prefetch`);
      resolve();
    }, 60);
  });
  let positiveActionCalled = false;
  const positiveIssues: string[] = [];
  const positiveEvidence: string[] = [];
  const positiveStartedAt = Date.now();
  const positiveAction = runCaliforniaQaAction({
    action: async () => { positiveActionCalled = true; },
    context: navigationContext,
    diagnostics: positiveDiagnostics,
    evidence: positiveEvidence,
    issues: positiveIssues,
    page,
    timeout: 1_000
  });
  await scheduleBriefRequest;
  await briefRequestStarted;
  assert.equal(await positiveAction, true, "a finite prefetch must finish before a destructive navigation action proceeds");
  const positiveElapsedMs = Date.now() - positiveStartedAt;
  assert.ok(briefFetch, "the between-poll network canary must dispatch its request");
  assert.equal(await briefFetch, "brief");
  assert.ok(
    positiveElapsedMs >= 180,
    `a request completing between 25ms polls must restart the full quiet window (elapsed=${positiveElapsedMs}ms)`
  );
  assert.equal(positiveActionCalled, true);
  assert.deepEqual(positiveIssues, []);
  assert.ok(
    positiveEvidence.some((entry) =>
      /^pre-navigation-quiescence:quiescent=true:waited=\d+ms:pending=0:diagnostics=0$/.test(entry)
    ),
    "successful destructive navigation must record strict pre-action quiescence"
  );
  positiveDiagnostics.dispose();

  const negativeDiagnostics = new CaliforniaBrowserDiagnostics(page, quiescenceOrigin);
  const hangingRequestStarted = page.waitForRequest(`${quiescenceOrigin}/never-quiet`);
  const hangingFetch = page.evaluate((url) => fetch(url).then((response) => response.text()),
    `${quiescenceOrigin}/never-quiet`);
  await hangingRequestStarted;
  let negativeActionCalled = false;
  const negativeIssues: string[] = [];
  const negativeEvidence: string[] = [];
  assert.equal(await runCaliforniaQaAction({
    action: async () => { negativeActionCalled = true; },
    context: navigationContext,
    diagnostics: negativeDiagnostics,
    evidence: negativeEvidence,
    issues: negativeIssues,
    page,
    timeout: 100
  }), false, "destructive navigation must fail closed when the old page never becomes network-quiet");
  assert.equal(negativeActionCalled, false, "navigation action must not run after failed pre-action quiescence");
  assert.ok(
    negativeIssues.some((issue) =>
      issue.includes("pre-navigation-quiescence:open-directory-lab") && issue.includes("network-not-quiescent")
    )
  );
  assert.ok(
    negativeEvidence.some((entry) =>
      /^pre-navigation-quiescence:quiescent=false:waited=\d+ms:pending=1:diagnostics=0$/.test(entry)
    )
  );
  releaseHangingRequest();
  assert.equal(await hangingFetch, "released");
  negativeDiagnostics.dispose();

  await t.test("broad diagnostics ignore only the exact rendered California RSC cancellation", async () => {
    const labId = "us-ca-math-k-k-cc-count-sequence";
    const pagePath = `/student/tools/visualizations?grade=K&track=all&lab=${labId}`;
    await page.goto(`${quiescenceOrigin}${pagePath}`);
    await page.setContent(`
      <a data-tour="student-lesson" href="/student/lessons/${labId}">Lesson</a>
      <a href="/student/tools/visualizations">Directory</a>
    `);
    const requestUrl = `${quiescenceOrigin}/student/lessons/${labId}?_rsc=exact-canary`;
    const requestHeaders = {
      "next-url": "/student/tools/visualizations",
      rsc: "1",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors"
    };
    const makeRequest = () => ({
      allHeaders: async () => requestHeaders,
      failure: () => ({ errorText: "net::ERR_ABORTED" }),
      isNavigationRequest: () => false,
      method: () => "GET",
      resourceType: () => "fetch",
      url: () => requestUrl
    }) as unknown as Request;
    const hooks = (diagnostics: CaliforniaBrowserDiagnostics) => diagnostics as unknown as {
      onRequestFailed: (request: Request) => void;
      onResponse: (response: {
        headers(): Record<string, string>;
        request(): Request;
        status(): number;
        url(): string;
      }) => void;
    };

    const exactDiagnostics = new CaliforniaBrowserDiagnostics(page, quiescenceOrigin);
    const exactRequest = makeRequest();
    hooks(exactDiagnostics).onResponse({
      headers: () => ({ "content-type": "text/x-component; charset=utf-8" }),
      request: () => exactRequest,
      status: () => 200,
      url: () => requestUrl
    });
    hooks(exactDiagnostics).onRequestFailed(exactRequest);
    assert.deepEqual(
      (await exactDiagnostics.drainAfterPending()).diagnostics,
      [],
      "the exact 200 rendered California RSC cancellation must not fail broad QA"
    );
    exactDiagnostics.dispose();

    const hardNegativeDiagnostics = new CaliforniaBrowserDiagnostics(page, quiescenceOrigin);
    const hardNegativeRequest = makeRequest();
    hooks(hardNegativeDiagnostics).onResponse({
      headers: () => ({ "content-type": "text/x-component; charset=utf-8" }),
      request: () => hardNegativeRequest,
      status: () => 204,
      url: () => requestUrl
    });
    hooks(hardNegativeDiagnostics).onRequestFailed(hardNegativeRequest);
    const hardNegative = (await hardNegativeDiagnostics.drainAfterPending()).diagnostics;
    assert.equal(hardNegative.length, 1, "a non-200 aborted request must remain a broad-QA failure");
    assert.equal(hardNegative[0]?.kind, "request-failed");
    assert.match(hardNegative[0]?.detail ?? "", /"responseStatus":204/);
    hardNegativeDiagnostics.dispose();
  });

  await page.unroute(`${quiescenceOrigin}/**`);
  await page.goto("data:text/html,<meta charset=utf-8><title>california-evidence-canary</title>");
  await page.evaluate("globalThis.__name = function(value) { return value; }");

  await page.setContent(`
    <main id="protected-canvas-viewport-proof" style="height:1200px;position:relative">
      <canvas height="120" style="height:120px;width:200px" width="200"></canvas>
      <button style="height:44px;position:absolute;top:300px;width:100px">Protected Canvas viewport</button>
    </main>
  `);
  await page.locator("#protected-canvas-viewport-proof").evaluate((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2563eb";
    context.fillRect(10, 10, 80, 60);
    const trackedContext = context as unknown as {
      getImageData: (...args: unknown[]) => ImageData;
      putImageData: (...args: unknown[]) => void;
    };
    const nativeGetImageData = trackedContext.getImageData.bind(context);
    const nativePutImageData = trackedContext.putImageData.bind(context);
    let getImageDataCalls = 0;
    let putImageDataCalls = 0;
    trackedContext.getImageData = (...args: unknown[]) => {
      getImageDataCalls += 1;
      return nativeGetImageData(...args);
    };
    trackedContext.putImageData = (...args: unknown[]) => {
      putImageDataCalls += 1;
      return nativePutImageData(...args);
    };
    const canaryGlobal = globalThis as typeof globalThis & {
      __californiaCanvasGraphicsRuntime?: { version: number };
      __protectedCanvasViewportReadbackCounts?: () => { getImageDataCalls: number; putImageDataCalls: number };
    };
    canaryGlobal.__californiaCanvasGraphicsRuntime = { version: 1 };
    canaryGlobal.__protectedCanvasViewportReadbackCounts = () => ({
      getImageDataCalls,
      putImageDataCalls
    });
  });
  await page.evaluate(() => window.scrollTo(0, 340));
  await collectVisualizationUiFindings(page.locator("#protected-canvas-viewport-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.deepEqual(
    await page.evaluate(() => {
      const canaryGlobal = globalThis as typeof globalThis & {
        __californiaCanvasGraphicsRuntime?: { version: number };
        __protectedCanvasViewportReadbackCounts?: () => {
          getImageDataCalls: number;
          putImageDataCalls: number;
        };
      };
      const counts = canaryGlobal.__protectedCanvasViewportReadbackCounts?.();
      delete canaryGlobal.__californiaCanvasGraphicsRuntime;
      delete canaryGlobal.__protectedCanvasViewportReadbackCounts;
      return counts;
    }),
    { getImageDataCalls: 0, putImageDataCalls: 0 },
    "generic viewport restoration must not call product-facing Canvas read/write APIs while the graphics runtime owns the Canvas"
  );

  await page.setContent(`
    <main id="viewport-proof" style="height:1200px;position:relative">
      <button id="viewport-only" style="position:absolute;top:300px;width:100px;height:44px">Viewport only</button>
    </main>
  `);
  await page.evaluate(() => window.scrollTo(0, 340));
  const originalScrollTop = await page.evaluate(() => window.scrollY);
  const viewportOnlyFindings = await collectVisualizationUiFindings(page.locator("#viewport-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.equal(
    viewportOnlyFindings.some((finding) => finding.includes("button(Viewport only)")),
    false,
    "a viewport-only partial target must be centered, stabilized, and remeasured before it can pass"
  );
  assert.ok(
    Math.abs(await page.evaluate(() => window.scrollY) - originalScrollTop) <= 1,
    "viewport-only proof must restore the page scroll position"
  );

  await page.setContent(`
    <main id="nested-scroll-proof" style="height:1400px;position:relative">
      <div id="nested-scroller" style="height:120px;overflow:auto;position:absolute;top:300px;width:300px">
        <div style="height:600px;position:relative">
          <button id="nested-viewport-only" style="height:44px;position:absolute;top:120px;width:120px">
            Nested viewport only
          </button>
        </div>
      </div>
    </main>
  `);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>("#nested-scroller")!.scrollTop = 100;
    window.scrollTo(0, 340);
  });
  const originalNestedScroll = await page.evaluate(() => ({
    ancestor: document.querySelector<HTMLElement>("#nested-scroller")!.scrollTop,
    window: window.scrollY
  }));
  const nestedViewportFindings = await collectVisualizationUiFindings(page.locator("#nested-scroll-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.equal(
    nestedViewportFindings.some((finding) => finding.includes("button(Nested viewport only)")),
    false,
    "a nested-scroll viewport recheck must not create a control finding after successful restoration"
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      ancestor: document.querySelector<HTMLElement>("#nested-scroller")!.scrollTop,
      window: window.scrollY
    })),
    originalNestedScroll,
    "viewport-only proof must restore every scrollable ancestor as well as the window"
  );

  await page.setContent(`
    <main id="below-fold-proof" style="height:1200px;position:relative">
      <button style="height:10px;position:absolute;top:850px;width:10px">Below fold tiny</button>
      <span style="position:absolute;left:20px;top:900px">Collision below fold</span>
      <span style="position:absolute;left:20px;top:900px">Collision below fold</span>
      <p class="sr-only" style="height:1px;overflow:hidden;position:absolute;width:1px">
        Screen reader status
      </p>
    </main>
  `);
  await page.evaluate(() => window.scrollTo(0, 0));
  const belowFoldFindings = await collectVisualizationUiFindings(page.locator("#below-fold-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.ok(
    belowFoldFindings.some((finding) => finding.startsWith("touch-target-small:button(Below fold tiny)")),
    "the whole-route audit must measure a fully below-fold undersized control"
  );
  assert.ok(
    belowFoldFindings.some((finding) => finding.startsWith("dom-text-overlap:span(Collision below fold)")),
    "the whole-route audit must detect fully below-fold text collisions"
  );
  assert.equal(
    belowFoldFindings.some((finding) =>
      finding.startsWith("text-clipped-by-viewport:span(Collision below fold)")
    ),
    false,
    "ordinary below-fold text must not be mislabeled as viewport-clipped"
  );
  assert.equal(
    belowFoldFindings.some((finding) => finding.includes("p(Screen reader status)")),
    false,
    "screen-reader-only status text must be excluded from visual clipping findings"
  );
  assert.ok(
    Math.abs(await page.evaluate(() => window.scrollY)) <= 1,
    "below-fold audit must restore the original window scroll position"
  );

  await page.setContent(`
    <main id="scroll-context-proof" style="height:160px;position:relative;width:700px">
      <div id="horizontal-context" style="height:100px;overflow:auto;width:100px">
        <div style="height:100px;position:relative;width:600px">
          <button style="height:44px;left:400px;position:absolute;top:10px;width:80px">Hidden inner</button>
          <span style="left:400px;position:absolute;top:60px">Hidden inner text</span>
        </div>
      </div>
      <button style="height:44px;left:400px;position:absolute;top:10px;width:80px">Visible outer</button>
      <span style="left:400px;position:absolute;top:60px">Visible outer text</span>
    </main>
  `);
  const scrollContextFindings = await collectVisualizationUiFindings(page.locator("#scroll-context-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.equal(
    scrollContextFindings.some((finding) =>
      (finding.startsWith("dom-text-overlap:") || finding.startsWith("controls-overlap:")) &&
      finding.includes("Hidden inner")
    ),
    false,
    "elements clipped in a separate scroll context must not collide with unrelated page coordinates"
  );
  assert.equal(
    await page.locator("#horizontal-context").evaluate((element) => element.scrollLeft),
    0,
    "scroll-context audit must restore the horizontal container"
  );

  await page.setContent(`
    <main id="ancestor-proof">
      <div style="height:4px;overflow:hidden">
        <button style="width:100px;height:44px">Ancestor clipped</button>
      </div>
    </main>
  `);
  const ancestorFindings = await collectVisualizationUiFindings(page.locator("#ancestor-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.ok(
    ancestorFindings.some((finding) => finding.startsWith("touch-target-clipped:button(Ancestor clipped)")),
    "a true clipping ancestor must remain a hard UI-gate failure"
  );
  assert.ok(
    ancestorFindings.some((finding) => finding.startsWith("touch-target-small:button(Ancestor clipped)")),
    "ancestor-clipped targets must be sized from their effective visible rectangle"
  );

  await page.setContent(`
    <main id="clipped-surface-proof">
      <div style="height:0;overflow:hidden">
        <div data-viz-surface style="height:160px;width:240px">
          <canvas data-viz-mark height="160" style="height:160px;width:240px" width="240"></canvas>
        </div>
      </div>
    </main>
  `);
  const clippedSurfaceFindings = await collectVisualizationUiFindings(page.locator("#clipped-surface-proof"), {
    id: "desktop-en-light",
    language: "en",
    locale: "en-HK",
    theme: "light",
    viewport: "desktop"
  });
  assert.ok(
    clippedSurfaceFindings.some((finding) => finding.startsWith("surface-clipped-by-ancestor:")),
    "a fully ancestor-clipped visualization surface must fail the UI gate"
  );
  assert.ok(
    clippedSurfaceFindings.some((finding) => finding.startsWith("canvas-clipped-by-ancestor:")),
    "a nonzero Canvas buffer must not certify a Canvas that the learner cannot see"
  );

  await page.setContent(`
    <div id="switcher" data-viz-active-signature-bench-id="algebra-tiles"></div>
    <section id="noop" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <input aria-label="No-op parameter" type="range" min="0" max="1" value="0">
      <button data-viz-reset-model type="button">Reset</button>
    </section>
  `);
  await page.locator("#noop").evaluate((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
    const context = canvas.getContext("2d")!;
    const redraw = () => {
      if (!canvas.isConnected) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#2563eb";
      context.fillRect(20, 20, 100, 80);
      requestAnimationFrame(redraw);
    };
    redraw();
  });
  const noopDefault = await captureDefault(page.locator("#noop"), 2_000);
  await assert.rejects(
    () => smokeControl(page.locator("#noop"), 2_000, { defaultState: noopDefault, structured: true }),
    /model-response|stable visual|mathematical state/i,
    "drawRevision-only repainting must not prove a no-op control changed the model"
  );

  await page.setContent(`
    <section id="button-label-noop" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <button id="label-only-control" aria-pressed="false" type="button">Show option</button>
      <button data-viz-reset-model type="button">Reset</button>
    </section>
  `);
  await page.locator("#button-label-noop").evaluate((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2563eb";
    context.fillRect(20, 20, 100, 80);
    const button = root.querySelector<HTMLButtonElement>("#label-only-control")!;
    button.addEventListener("click", () => {
      const pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!pressed));
      button.textContent = pressed ? "Show option" : "Hide option";
    });
  });
  const buttonLabelDefault = await captureDefault(page.locator("#button-label-noop"), 2_000);
  await assert.rejects(
    () => smokeControl(page.locator("#button-label-noop"), 2_000, {
      defaultState: buttonLabelDefault,
      structured: true
    }),
    /model-response|stable visual|mathematical state/i,
    "a button changing only its own text or ARIA state must not count as mathematical model response"
  );

  await page.setContent(`
    <section id="button-svg-noop" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <button id="svg-only-control" aria-label="Change icon" type="button">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12h20"></path></svg>
      </button>
      <button data-viz-reset-model type="button">Reset</button>
    </section>
  `);
  await page.locator("#button-svg-noop").evaluate((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2563eb";
    context.fillRect(20, 20, 100, 80);
    root.querySelector<HTMLButtonElement>("#svg-only-control")!.addEventListener("click", () => {
      root.querySelector<SVGPathElement>("path")!.setAttribute("d", "M12 2v20");
    });
  });
  const buttonSvgDefault = await captureDefault(page.locator("#button-svg-noop"), 2_000);
  await assert.rejects(
    () => smokeControl(page.locator("#button-svg-noop"), 2_000, {
      defaultState: buttonSvgDefault,
      structured: true
    }),
    /model-response|stable visual|mathematical state/i,
    "a button mutating only an icon SVG nested inside itself must not count as mathematical model response"
  );

  await page.setContent(`
    <section id="oscillating-semantics" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <output data-viz-model-state="0">0</output>
    </section>
  `);
  await page.locator("#oscillating-semantics").evaluate((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2563eb";
    context.fillRect(20, 20, 100, 80);
    const output = root.querySelector<HTMLOutputElement>("output")!;
    let revision = 0;
    const oscillate = () => {
      if (!output.isConnected) return;
      revision += 1;
      output.value = String(revision);
      output.setAttribute("data-viz-model-state", String(revision));
      requestAnimationFrame(oscillate);
    };
    oscillate();
  });
  await assert.rejects(
    () => captureDefault(page.locator("#oscillating-semantics"), 2_000),
    /stable controls and mathematical semantics/i,
    "a once-stable snapshot followed by oscillating semantics must never be returned as stable evidence"
  );

  await page.setContent(`
    <div id="switcher" data-viz-active-signature-bench-id="algebra-tiles"></div>
    <section id="changed" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <input aria-label="Model parameter" type="range" min="0" max="1" value="0">
      <button data-viz-reset-model type="button">Reset</button>
    </section>
  `);
  await page.locator("#changed").evaluate((root) => {
    const input = root.querySelector<HTMLInputElement>("input")!;
    const draw = (canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d")!;
      context.fillStyle = input.value === "0" ? "#2563eb" : "#dc2626";
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
    draw(root.querySelector<HTMLCanvasElement>("canvas")!);
    input.addEventListener("input", () => draw(root.querySelector<HTMLCanvasElement>("canvas")!));
    root.querySelector<HTMLButtonElement>("[data-viz-reset-model]")!.addEventListener("click", () => {
      const oldCanvas = root.querySelector<HTMLCanvasElement>("canvas")!;
      const replacement = document.createElement("canvas");
      replacement.width = oldCanvas.width;
      replacement.height = oldCanvas.height;
      replacement.setAttribute("data-viz-mark", "");
      oldCanvas.replaceWith(replacement);
      draw(replacement); // Deliberately preserves the changed input/model instead of restoring the default.
    });
  });
  const changedDefault = await captureDefault(page.locator("#changed"), 5_000);
  assert.equal(
    (await smokeControl(page.locator("#changed"), 5_000, {
      defaultState: changedDefault,
      structured: true
    })).modelChanged,
    true
  );
  await assert.rejects(
    () => resetBench(
      page,
      page.locator("#changed"),
      page.locator("#switcher"),
      "algebra-tiles",
      5_000,
      changedDefault
    ),
    /restore.*default|default.*fingerprint/i,
    "replacing the Canvas without restoring the control/model must not fabricate reset evidence"
  );

  await page.setContent(`
    <div id="switcher" data-viz-active-signature-bench-id="algebra-tiles"></div>
    <section id="stable-to-dynamic" data-viz-signature-lab>
      <div data-viz-surface style="width:240px;height:160px"><canvas data-viz-mark width="240" height="160"></canvas></div>
      <button data-viz-reset-model type="button">Reset</button>
    </section>
  `);
  await page.locator("#stable-to-dynamic").evaluate((root) => {
    const initial = root.querySelector<HTMLCanvasElement>("canvas")!;
    const initialContext = initial.getContext("2d")!;
    initialContext.fillStyle = "#2563eb";
    initialContext.fillRect(0, 0, initial.width, initial.height);
    root.querySelector<HTMLButtonElement>("[data-viz-reset-model]")!.addEventListener("click", () => {
      const oldCanvas = root.querySelector<HTMLCanvasElement>("canvas")!;
      const replacement = document.createElement("canvas");
      replacement.width = oldCanvas.width;
      replacement.height = oldCanvas.height;
      replacement.setAttribute("data-viz-mark", "");
      oldCanvas.replaceWith(replacement);
      const context = replacement.getContext("2d")!;
      let revision = 0;
      const animate = () => {
        if (!replacement.isConnected) return;
        revision += 1;
        context.fillStyle = `rgb(${revision % 251}, ${(revision * 7) % 251}, ${(revision * 17) % 251})`;
        context.fillRect(0, 0, replacement.width, replacement.height);
        requestAnimationFrame(animate);
      };
      animate();
    });
  });
  const stableDefault = await captureDefault(page.locator("#stable-to-dynamic"), 5_000);
  await assert.rejects(
    () => resetBench(
      page,
      page.locator("#stable-to-dynamic"),
      page.locator("#switcher"),
      "algebra-tiles",
      5_000,
      stableDefault
    ),
    /surface stability class/i,
    "a stable default must not be downgraded to dynamic semantic-only reset evidence"
  );

  await page.setContent(`
    <section id="premium" style="width:480px;height:260px">
      <div data-viz-manim-control-dock data-viz-manim-presentation="learner"
        data-viz-manim-authoring-controls-visible="false">
        <div data-viz-manim-playback-state="paused" style="width:460px;height:220px">
          <button type="button" data-viz-manim-playback-toggle>Play</button>
          <div data-viz-manim-timeline-scrubber role="slider" tabindex="0" aria-label="Animation timeline"
            aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0" style="width:240px;height:44px"></div>
          <button type="button" data-viz-three-reset-camera>Reset camera</button>
        </div>
      </div>
    </section>
  `);
  await page.locator("#premium").evaluate((panel) => {
    const runtime = panel.querySelector<HTMLElement>("[data-viz-manim-playback-state]")!;
    const playback = panel.querySelector<HTMLButtonElement>("[data-viz-manim-playback-toggle]")!;
    const timeline = panel.querySelector<HTMLElement>("[data-viz-manim-timeline-scrubber]")!;
    const setPlaying = (playing: boolean) => {
      runtime.setAttribute("data-viz-manim-playback-state", playing ? "playing" : "paused");
      playback.textContent = playing ? "Pause" : "Play";
    };
    playback.addEventListener("click", () => setPlaying(runtime.getAttribute("data-viz-manim-playback-state") !== "playing"));
    timeline.addEventListener("keydown", (event) => {
      if (event.key === "Home") timeline.setAttribute("aria-valuenow", "0");
      if (event.key === "End") timeline.setAttribute("aria-valuenow", "1000");
    });
    panel.querySelector<HTMLButtonElement>("[data-viz-three-reset-camera]")!.addEventListener("click", () => {
      timeline.setAttribute("aria-valuenow", "0");
      setPlaying(true);
    });
    window.setInterval(() => {
      if (runtime.getAttribute("data-viz-manim-playback-state") !== "playing") return;
      timeline.setAttribute("aria-valuenow", String(Math.min(1000, Number(timeline.getAttribute("aria-valuenow")) + 25)));
    }, 20);
  });
  const premiumEvidence = await smokePremium(page.locator("#premium"), 2_000, {
    structured: true,
    onPlaying: async () => {
      await page.locator("#premium [data-viz-manim-playback-state]").evaluate((runtime) => {
        runtime.setAttribute("data-viz-manim-playback-state", "paused");
        runtime.querySelector<HTMLElement>("[data-viz-manim-playback-toggle]")!.textContent = "Play";
      });
    }
  });
  assert.equal(premiumEvidence.finalState, "paused", "natural pause during capture must not be toggled back to playing");
});

const ledgerDirectory = process.env.CA_VIZ_COVERAGE_LEDGER_DIR?.trim();
const producerSuccessSha256 = process.env.CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256?.trim();
test("California Visualization full coverage ledger aggregate", async () => {
  assert.ok(
    ledgerDirectory,
    "CA_VIZ_COVERAGE_LEDGER_DIR is required: synthetic canaries do not certify the California full matrix"
  );
  assert.match(
    producerSuccessSha256 ?? "",
    /^[a-f0-9]{64}$/,
    "CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256 is required from the external successful Playwright producer"
  );
  const fullMatrixConfig = readCaliforniaQaConfig();
  assertCaliforniaFormalQaConfig(fullMatrixConfig);
  const expectedCurrentProvenance = buildCaliforniaCoverageProvenance(fullMatrixConfig, {
    requireRunIdentity: true
  });
  const provenance = buildCaliforniaVisualizationCoverageRunIdentity(expectedCurrentProvenance);
  const workItems = expectedWorkItemContracts(fullMatrixConfig);
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: [...workItems.keys()],
    provenance
  });
  const sealed = await sealCaliforniaVisualizationCoverageArtifactRun<CoverageArtifact>({
    expectedMatrix,
    ledgerRoot: ledgerDirectory!,
    producerSuccessReceipt: {
      fileName: CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
      sha256: producerSuccessSha256!
    },
    provenance,
    validateAggregate(artifacts) {
      verifyCaliforniaVisualizationCoverageArtifacts(
        artifacts.map((artifact) => artifact.payload),
        expectedCurrentProvenance,
        workItems
      );
    },
    validatePayload(payload) {
      assert.equal(payload.provenance.matrixRunId, provenance.matrixRunId,
        `${payload.workItem.id}: lifecycle payload matrix identity drifted`);
    }
  });
  assert.match(sealed.sealReceipt.sha256, /^[a-f0-9]{64}$/,
    "California broad terminal seal lacks its external SHA-256 receipt");
  console.log(
    `California Visualization broad coverage sealed: ${sealed.artifacts.length} artifacts; ` +
    `${sealed.sealReceipt.fileName}=${sealed.sealReceipt.sha256}`
  );
});
