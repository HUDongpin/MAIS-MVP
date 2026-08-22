import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import sharp from "sharp";
import {
  CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
  CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256,
  CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasTerminalOperation
} from "./california-canvas-graphics-source-contract";

export const CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION = 1;
export const CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION = 5;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION = 5;
export const CALIFORNIA_CANVAS_GRAPHICS_MIN_CONTRAST_RATIO = 3;
export const CALIFORNIA_CANVAS_GRAPHICS_MIN_CONNECTED_CORE_PIXELS = 4;
export const CALIFORNIA_CANVAS_GRAPHICS_MIN_CORE_COVERAGE_RATIO = 0.5;
export const CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS = 15_000;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE = 0;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO = 0;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO = 0;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PIXELS = 4_194_304;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PNG_BYTES = 16 * 1024 * 1024;
export const CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PROOF_BYTES = 8 * 1024;
const CALIFORNIA_CANVAS_GRAPHICS_MODULE_RUN_ID = randomBytes(16).toString("hex");

export type CaliforniaControlledRangeAttributeMutation = {
  attributeName: string | null;
  oldValue: string | null;
};

/**
 * React's controlled-input synchronization can temporarily detach a range
 * input from its absent named group, rewrite its already-current type, and
 * restore the absent name. Chromium reports those three net-zero writes as
 * attribute mutations even though final form semantics and layout are exact.
 */
export function isCaliforniaExactNetZeroControlledRangeNormalization(
  records: readonly CaliforniaControlledRangeAttributeMutation[],
  finalName: string | null,
  finalType: string | null
) {
  return finalName === null && finalType === "range" && records.length >= 3 &&
    records.every((record) =>
      record.attributeName === "name"
        ? record.oldValue === null || record.oldValue === ""
        : record.attributeName === "type" && record.oldValue === "range"
    ) &&
    records.some((record) => record.attributeName === "name" && record.oldValue === null) &&
    records.some((record) => record.attributeName === "name" && record.oldValue === "") &&
    records.some((record) => record.attributeName === "type" && record.oldValue === "range");
}

type ExpectedRuntimeSite = {
  contextKey: string;
  expectedIdentitySha256: string;
  operation: CaliforniaCanvasTerminalOperation;
  role: "background" | "decorative" | "essential";
  sourceSiteKey: string;
};

type ExpectedRuntimeBinding = {
  benchId: string;
  key: string;
};

export type CaliforniaCanvasGraphicsRuntimeConfig = {
  benchExpectedEssential: Record<string, {
    count: number;
    digest: string;
    keys: readonly string[];
  }>;
  bindings: readonly ExpectedRuntimeBinding[];
  externalCompositePaper: typeof CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER;
  runtimeRunId: string;
  sourceContractSha256: string;
  sourceExpectedEssentialCount: number;
  sourceExpectedEssentialDigest: string;
  sourceProductSha256: string;
  sites: readonly ExpectedRuntimeSite[];
  version: typeof CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION;
};

export type CaliforniaCanvasGraphicsCompositingLayerProof = {
  backdropFilter: string;
  backgroundColor: string;
  backgroundImage: string;
  boxShadow: string;
  elementIdentity: string;
  filter: string;
  isPaperSurface: boolean;
  maskImage: string;
  mixBlendMode: string;
  opacity: number;
  withinPaperStack: boolean;
};

export type CaliforniaCanvasGraphicsSiteEvidence = {
  backgroundNeighborPixelCount: number;
  changedPixelCount: number;
  clearEpoch: number;
  corePixelCount: number;
  corePixelCoverageRatio: number;
  invocationCount: number;
  largestConnectedCorePixelCount: number;
  latestRafEpoch: number;
  minimumCoreContrastRatio: number;
  operation: CaliforniaCanvasTerminalOperation;
  paintServerKinds: readonly string[];
  role: "essential";
  sourceSiteKey: string;
  terminalVisiblePixelCount: number;
};

export type CaliforniaCanvasGraphicsPaperProof = {
  canvasBackgroundColor: string;
  canvasBackgroundImage: string;
  canvasOpacity: number;
  compositingLayers: readonly CaliforniaCanvasGraphicsCompositingLayerProof[];
  effectiveOpaqueBackgroundColor: string;
  expectedPaperColor: typeof CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER;
  paperOpaque: boolean;
  surfaceBackgroundColor: string;
  surfaceColorScheme: string;
};

export type CaliforniaCanvasGraphicsCanvasEvidence = {
  backingHeight: number;
  backingWidth: number;
  benchId: string;
  bindingKey: string;
  canvasIdentity: string;
  compositedOpaquePixelRatio: number;
  cssHeight: number;
  cssWidth: number;
  domCanvasIndex: number;
  issues: readonly string[];
  latestClearEpoch: number;
  latestClearWasFull: boolean;
  latestPaintRafEpoch: number;
  latestSettledRafEpoch: number;
  minimumNumericNonTextContrastRatio: number;
  observedSourceSiteCount: number;
  observedSourceSiteDigest: string;
  observedSourceSiteKeys: readonly string[];
  paperProof: CaliforniaCanvasGraphicsPaperProof;
  pendingRafCount: number;
  qaReadbackCount: number;
  qaReadbackMode: "native-existing-2d-context";
  roleBackgroundNeighborPixelCount: number;
  roleConnectedCorePixelCount: number;
  roleCorePixelCount: number;
  runtimeCanvasId: number;
  siteEvidence: readonly CaliforniaCanvasGraphicsSiteEvidence[];
  sourcePaintRevision: number;
  terminalRasterSha256: string;
};

export type CaliforniaCanvasGraphicsStateEvidence = {
  benchExpectedEssentialCount: number;
  benchExpectedEssentialDigest: string;
  capturedAtEpochMs: number;
  capturedAtPerformanceMs: number;
  capturedUrl: string;
  captureFenceSignature: string;
  canvases: readonly CaliforniaCanvasGraphicsCanvasEvidence[];
  evidenceSha256: string;
  issues: readonly string[];
  observedSourceSiteCount: number;
  observedSourceSiteDigest: string;
  observedSourceSiteKeys: readonly string[];
  receiptId: string;
  rootRuntimeId: number;
  runtimeRunId: string;
  runtimeSessionId: string;
  runtimeVersion: typeof CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION;
  sourceContractSha256: string;
  sourceExpectedEssentialCount: number;
  sourceExpectedEssentialDigest: string;
  sourceProductSha256: string;
  stateKey: string;
  surfaceKey: string;
};

export type CaliforniaCanvasGraphicsContrastConsumeCanvasAck = {
  backingHeight: number;
  backingWidth: number;
  bindingKey: string;
  canvasIdentity: string;
  domCanvasIndex: number;
  finalCompositor: CaliforniaCanvasGraphicsFinalCompositorProof;
  runtimeCanvasId: number;
  sourcePaintRevision: number;
  terminalPixelSnapshotSha256: string;
  terminalRasterSha256: string;
};

export type CaliforniaCanvasGraphicsFinalCompositorRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type CaliforniaCanvasGraphicsFinalCompositorSize = {
  height: number;
  width: number;
};

export type CaliforniaCanvasGraphicsFinalCompositorRaster =
  CaliforniaCanvasGraphicsFinalCompositorSize & {
    pngByteLength: number;
    pngSha256: string;
    rgbaSha256: string;
  };

export type CaliforniaCanvasGraphicsPaintEnvironmentKindCounts = {
  animation: number;
  cssom: number;
  focus: number;
  font: number;
  fullscreen: number;
  media: number;
  pointer: number;
  scroll: number;
  state: number;
  viewport: number;
};

export type CaliforniaCanvasGraphicsPaintEnvironmentSnapshot = {
  animationFingerprintSha256: string;
  epoch: number;
  fingerprintSha256: string;
  focusFingerprintSha256: string;
  fontFingerprintSha256: string;
  fullscreenFingerprintSha256: string;
  kindCounts: CaliforniaCanvasGraphicsPaintEnvironmentKindCounts;
  mediaFingerprintSha256: string;
  pointerFingerprintSha256: string;
  scrollFingerprintSha256: string;
  stateFingerprintSha256: string;
  viewportFingerprintSha256: string;
};

export type CaliforniaCanvasGraphicsFinalCompositorComparison = {
  changedPixelCount: number;
  changedPixelRatio: number;
  channelTolerance: number;
  maxChangedPixelRatio: number;
  maxMeanAbsoluteDiffRatio: number;
  maximumChannelDifference: number;
  meanAbsoluteDiffRatio: number;
  passed: true;
  pixelCount: number;
};

export type CaliforniaCanvasGraphicsFinalCompositorProof = {
  backingSize: CaliforniaCanvasGraphicsFinalCompositorSize;
  bindingKey: string;
  bindingSha256: string;
  canvasIdentity: string;
  canvasPageRect: CaliforniaCanvasGraphicsFinalCompositorRect;
  captureScrollOffset: { x: number; y: number };
  captureViewportClip: CaliforniaCanvasGraphicsFinalCompositorRect;
  captureViewportSize: CaliforniaCanvasGraphicsFinalCompositorSize;
  capturedUrl: string;
  clip: CaliforniaCanvasGraphicsFinalCompositorRect;
  comparison: CaliforniaCanvasGraphicsFinalCompositorComparison;
  compositor: CaliforniaCanvasGraphicsFinalCompositorRaster;
  cssSize: CaliforniaCanvasGraphicsFinalCompositorSize;
  deviceScaleFactor: number;
  domCanvasIndex: number;
  evidenceSha256: string;
  layoutFenceAfterSha256: string;
  layoutFenceBeforeSha256: string;
  paintEnvironment: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot;
  receiptId: string;
  reference: CaliforniaCanvasGraphicsFinalCompositorRaster;
  runtimeCanvasId: number;
  sourcePaintRevision: number;
  stateKey: string;
  surfaceKey: string;
  terminalRasterSha256: string;
  version: typeof CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION;
};

export type CaliforniaCanvasGraphicsFinalCompositorCapturePlan = {
  captureToken: string;
  canvases: readonly (Omit<CaliforniaCanvasGraphicsFinalCompositorProof,
    "bindingSha256" | "comparison" | "compositor" | "layoutFenceAfterSha256" |
    "reference">)[];
};

type CaliforniaCanvasGraphicsFinalCompositorCaptureResult = {
  captureToken: string;
  comparison: CaliforniaCanvasGraphicsFinalCompositorComparison;
  compositor: CaliforniaCanvasGraphicsFinalCompositorRaster;
  compositorPngBase64: string;
  reference: CaliforniaCanvasGraphicsFinalCompositorRaster;
  referencePngBase64: string;
  runtimeCanvasId: number;
};

export type CaliforniaCanvasGraphicsContrastConsumeAck = {
  ackNonce: string;
  ackSha256: string;
  ackVersion: typeof CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION;
  acknowledgedAtEpochMs: number;
  acknowledgedAtPerformanceMs: number;
  auditedRootIdentity: string;
  canvasSetDigest: string;
  canvases: readonly CaliforniaCanvasGraphicsContrastConsumeCanvasAck[];
  captureFenceSignature: string;
  capturedUrl: string;
  contrastConsumedAtEpochMs: number;
  contrastConsumedAtPerformanceMs: number;
  evidenceSha256: string;
  paintEnvironment: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot;
  receiptId: string;
  rootRuntimeId: number;
  runtimeRunId: string;
  runtimeSessionId: string;
  sourceContractSha256: string;
  sourceProductSha256: string;
  stateKey: string;
  surfaceKey: string;
};

export type CaliforniaCanvasGraphicsAckedStateEvidence = {
  contrastConsumeAck: CaliforniaCanvasGraphicsContrastConsumeAck;
  evidence: CaliforniaCanvasGraphicsStateEvidence;
};

export type CaliforniaCanvasGraphicsStateExpectation = {
  benchId: string;
  capturedUrl?: string;
  maxAgeMs?: number;
  nowEpochMs?: number;
  stateKey: string;
  surfaceKey: string;
  runtimeRunId?: string;
};

export type CaliforniaCanvasGraphicsSettlement = {
  activityAgeMs: number;
  latestSettledRafEpoch: number;
  pendingRafCount: number;
  registeredCanvasCount: number;
  signature: string;
};

type RuntimePageApi = {
  collect(
    root: HTMLElement,
    request: { benchId: string; stateKey: string; surfaceKey: string }
  ): Promise<CaliforniaCanvasGraphicsStateEvidence>;
  installIntoCanvasAudit(): boolean;
  invoke(
    sourceSiteKey: string,
    context: CanvasRenderingContext2D,
    operation: CaliforniaCanvasTerminalOperation,
    thunk: () => unknown
  ): unknown;
  registerContext(
    bindingKey: string,
    context: CanvasRenderingContext2D | null
  ): CanvasRenderingContext2D;
  registerForContrast(
    root: HTMLElement,
    receiptId: string,
    evidenceSha256: string
  ): void;
  assertFinalCompositorEnvironment(
    root: HTMLElement,
    request: {
      captureToken: string;
      receiptId: string;
      stage: string;
    }
  ): Promise<void>;
  prepareFinalCompositor(
    root: HTMLElement,
    request: {
      evidenceSha256: string;
      receiptId: string;
      runtimeRunId: string;
      stateKey: string;
      surfaceKey: string;
    }
  ): Promise<CaliforniaCanvasGraphicsFinalCompositorCapturePlan>;
  confirmFinalCompositorReference(
    root: HTMLElement,
    request: {
      captureToken: string;
      receiptId: string;
      runtimeCanvasId: number;
    }
  ): Promise<void>;
  rejectFinalCompositor(
    root: HTMLElement,
    request: { captureToken: string; receiptId: string }
  ): void;
  takeContrastConsumeAck(
    root: HTMLElement,
    request: {
      evidenceSha256: string;
      receiptId: string;
      runtimeRunId: string;
      stateKey: string;
      surfaceKey: string;
      finalCompositorResults: readonly CaliforniaCanvasGraphicsFinalCompositorCaptureResult[];
    }
  ): Promise<CaliforniaCanvasGraphicsContrastConsumeAck>;
  requestAnimationFrame(benchId: string, callback: FrameRequestCallback): number;
  cancelAnimationFrame(benchId: string, handle: number): void;
  settlement(benchId: string): CaliforniaCanvasGraphicsSettlement;
  version: 1;
};

type RuntimeWindow = Window & {
  __californiaCanvasGraphicsRuntime?: RuntimePageApi;
};

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stableValue(entry)]));
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

async function persistCaliforniaFinalCompositorDiagnostic(options: {
  compositor: Buffer;
  compositorHeight: number;
  compositorRgba?: Buffer;
  compositorWidth: number;
  identity: Record<string, unknown>;
  reference: Buffer;
  referenceHeight: number;
  referenceRgba?: Buffer;
  referenceWidth: number;
}) {
  const requestedRoot = process.env.CA_VIZ_FINAL_COMPOSITOR_DIAGNOSTIC_DIR?.trim();
  if (!requestedRoot) return null;
  const diagnosticRoot = path.resolve(requestedRoot);
  const starshipPrefix = `/Volumes/Starship${path.sep}`;
  if (!diagnosticRoot.startsWith(starshipPrefix) ||
      !diagnosticRoot.split(path.sep).includes(".tmp")) {
    throw new Error(
      "CA_VIZ_FINAL_COMPOSITOR_DIAGNOSTIC_DIR must be an absolute Starship .tmp path"
    );
  }
  await mkdir(diagnosticRoot, { recursive: true });
  const identitySha256 = sha256(stableSerialize(options.identity));
  const prefix = `final-compositor-${identitySha256.slice(0, 24)}`;
  const referenceName = `${prefix}.reference.png`;
  const compositorName = `${prefix}.compositor.png`;
  await writeFile(path.join(diagnosticRoot, referenceName), options.reference, { flag: "wx" });
  await writeFile(path.join(diagnosticRoot, compositorName), options.compositor, { flag: "wx" });
  let differenceName: string | null = null;
  let differenceBounds: { bottom: number; left: number; right: number; top: number } | null = null;
  let changedPixelCount = 0;
  if (options.referenceRgba && options.compositorRgba &&
      options.referenceWidth === options.compositorWidth &&
      options.referenceHeight === options.compositorHeight &&
      options.referenceRgba.length === options.compositorRgba.length) {
    const difference = Buffer.alloc(options.referenceRgba.length);
    let left = options.referenceWidth;
    let right = -1;
    let top = options.referenceHeight;
    let bottom = -1;
    for (let offset = 0; offset < options.referenceRgba.length; offset += 4) {
      const pixelIndex = offset / 4;
      let changed = false;
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = Math.abs(
          options.referenceRgba[offset + channel]! - options.compositorRgba[offset + channel]!
        );
        difference[offset + channel] = Math.min(255, delta * 4);
        changed ||= delta > 0;
      }
      difference[offset + 3] = 255;
      if (changed) {
        changedPixelCount += 1;
        const x = pixelIndex % options.referenceWidth;
        const y = Math.floor(pixelIndex / options.referenceWidth);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (changedPixelCount > 0) differenceBounds = { bottom, left, right, top };
    differenceName = `${prefix}.difference-x4.png`;
    const differencePng = await sharp(difference, {
      raw: {
        channels: 4,
        height: options.referenceHeight,
        width: options.referenceWidth
      }
    }).png().toBuffer();
    await writeFile(path.join(diagnosticRoot, differenceName), differencePng, { flag: "wx" });
  }
  const metadataName = `${prefix}.json`;
  await writeFile(path.join(diagnosticRoot, metadataName), JSON.stringify({
    ...options.identity,
    changedPixelCount,
    compositor: {
      height: options.compositorHeight,
      pngSha256: sha256(options.compositor),
      rgbaSha256: options.compositorRgba ? sha256(options.compositorRgba) : null,
      width: options.compositorWidth
    },
    differenceBounds,
    differenceName,
    reference: {
      height: options.referenceHeight,
      pngSha256: sha256(options.reference),
      rgbaSha256: options.referenceRgba ? sha256(options.referenceRgba) : null,
      width: options.referenceWidth
    },
    schemaVersion: 1
  }, null, 2) + "\n", { flag: "wx" });
  return {
    compositorName,
    differenceBounds,
    differenceName,
    metadataName,
    referenceName
  };
}

async function captureCaliforniaFinalCompositorPageClip(
  page: Page,
  clip: CaliforniaCanvasGraphicsFinalCompositorRect
) {
  if (![clip.x, clip.y, clip.width, clip.height].every(Number.isSafeInteger) ||
      clip.x < 0 || clip.y < 0 || clip.width < 1 || clip.height < 1 ||
      clip.width * clip.height > CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PIXELS) {
    throw new Error("california-canvas-final-compositor-page-clip-invalid");
  }
  const clipped = await page.screenshot({
    caret: "initial",
    clip,
    scale: "css",
    type: "png"
  });
  const metadata = await sharp(clipped).metadata();
  if (!Number.isSafeInteger(metadata.width) || !Number.isSafeInteger(metadata.height) ||
      !metadata.width || !metadata.height ||
      metadata.width !== clip.width || metadata.height !== clip.height) {
    throw new Error(
      "california-canvas-final-compositor-document-clip-size-mismatch:" +
      `expected=${clip.width}x${clip.height}:` +
      `actual=${metadata.width ?? "missing"}x${metadata.height ?? "missing"}`
    );
  }
  if (clipped.length < 1 ||
      clipped.length > CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PNG_BYTES) {
    throw new Error("california-canvas-final-compositor-page-clip-png-byte-cap");
  }
  return clipped;
}

function digestKeys(keys: readonly string[]) {
  return sha256(keys.slice().sort().join("\n"));
}

function finalCompositorProofPayload(
  proof: CaliforniaCanvasGraphicsFinalCompositorProof
) {
  const { bindingSha256: _bindingSha256, ...payload } = proof;
  return payload;
}

export function californiaCanvasGraphicsFinalCompositorBindingSha256(
  proof: Omit<CaliforniaCanvasGraphicsFinalCompositorProof, "bindingSha256">
) {
  return sha256(stableSerialize(proof));
}

function paintEnvironmentSnapshotPayload(
  snapshot: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot
) {
  const { fingerprintSha256: _fingerprintSha256, ...payload } = snapshot;
  return payload;
}

export function verifyCaliforniaCanvasGraphicsPaintEnvironmentSnapshot(
  snapshot: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot | undefined
) {
  const issues: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return ["paint-environment-snapshot-missing"];
  }
  const shaPattern = /^[0-9a-f]{64}$/;
  const expectedKinds = [
    "animation",
    "cssom",
    "focus",
    "font",
    "fullscreen",
    "media",
    "pointer",
    "scroll",
    "state",
    "viewport"
  ];
  const actualKinds = snapshot.kindCounts && typeof snapshot.kindCounts === "object"
    ? Object.keys(snapshot.kindCounts).sort()
    : [];
  if (JSON.stringify(actualKinds) !== JSON.stringify(expectedKinds)) {
    issues.push("paint-environment-kind-set-invalid");
  }
  const counts = expectedKinds.map((kind) =>
    snapshot.kindCounts?.[kind as keyof CaliforniaCanvasGraphicsPaintEnvironmentKindCounts]
  );
  if (!Number.isSafeInteger(snapshot.epoch) || snapshot.epoch < 0 ||
      counts.some((count) => !Number.isSafeInteger(count) || (count ?? -1) < 0) ||
      counts.reduce((sum, count) => sum + (count ?? 0), 0) !== snapshot.epoch) {
    issues.push("paint-environment-epoch-or-count-invalid");
  }
  for (const value of [
    snapshot.animationFingerprintSha256,
    snapshot.fingerprintSha256,
    snapshot.focusFingerprintSha256,
    snapshot.fontFingerprintSha256,
    snapshot.fullscreenFingerprintSha256,
    snapshot.mediaFingerprintSha256,
    snapshot.pointerFingerprintSha256,
    snapshot.scrollFingerprintSha256,
    snapshot.stateFingerprintSha256,
    snapshot.viewportFingerprintSha256
  ]) {
    if (!shaPattern.test(value ?? "")) issues.push("paint-environment-fingerprint-invalid");
  }
  if (shaPattern.test(snapshot.fingerprintSha256 ?? "") &&
      snapshot.fingerprintSha256 !== sha256(stableSerialize(
        paintEnvironmentSnapshotPayload(snapshot)
      ))) {
    issues.push("paint-environment-combined-fingerprint-mismatch");
  }
  return [...new Set(issues)];
}

export function compareCaliforniaCanvasGraphicsFinalCompositorRgba(options: {
  compositor: Uint8Array;
  height: number;
  reference: Uint8Array;
  width: number;
}): CaliforniaCanvasGraphicsFinalCompositorComparison {
  const pixelCount = options.width * options.height;
  if (!Number.isSafeInteger(options.width) || !Number.isSafeInteger(options.height) ||
      options.width < 1 || options.height < 1 || pixelCount >
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PIXELS ||
      options.reference.length !== pixelCount * 4 ||
      options.compositor.length !== pixelCount * 4) {
    throw new Error("california-canvas-final-compositor-rgba-dimensions-invalid");
  }
  let changedPixelCount = 0;
  let maximumChannelDifference = 0;
  let totalAbsoluteDifference = 0;
  for (let offset = 0; offset < pixelCount * 4; offset += 4) {
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const difference = Math.abs(
        options.reference[offset + channel]! - options.compositor[offset + channel]!
      );
      totalAbsoluteDifference += difference;
      maximumChannelDifference = Math.max(maximumChannelDifference, difference);
      if (difference > CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE) {
        pixelChanged = true;
      }
    }
    if (pixelChanged) changedPixelCount += 1;
  }
  const changedPixelRatio = changedPixelCount / pixelCount;
  const meanAbsoluteDiffRatio = totalAbsoluteDifference / (pixelCount * 4 * 255);
  const passed = changedPixelRatio <=
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO &&
    meanAbsoluteDiffRatio <=
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO;
  if (!passed) {
    throw new Error(
      "california-canvas-final-compositor-comparison-rejected:" +
      `changed=${changedPixelCount}/${pixelCount}:mean=${meanAbsoluteDiffRatio}:` +
      `max-channel=${maximumChannelDifference}`
    );
  }
  return {
    changedPixelCount,
    changedPixelRatio,
    channelTolerance: CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE,
    maxChangedPixelRatio:
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO,
    maxMeanAbsoluteDiffRatio:
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
    maximumChannelDifference,
    meanAbsoluteDiffRatio,
    passed: true,
    pixelCount
  };
}

export function verifyCaliforniaCanvasGraphicsFinalCompositorProof(
  proof: CaliforniaCanvasGraphicsFinalCompositorProof | undefined,
  canvas: CaliforniaCanvasGraphicsCanvasEvidence,
  evidence: CaliforniaCanvasGraphicsStateEvidence
) {
  const issues: string[] = [];
  if (!proof) return ["final-compositor-proof-missing"];
  const shaPattern = /^[0-9a-f]{64}$/;
  if (proof.version !== CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION) {
    issues.push("final-compositor-version-mismatch");
  }
  if (proof.receiptId !== evidence.receiptId ||
      proof.evidenceSha256 !== evidence.evidenceSha256 ||
      proof.capturedUrl !== evidence.capturedUrl || proof.stateKey !== evidence.stateKey ||
      proof.surfaceKey !== evidence.surfaceKey) {
    issues.push("final-compositor-receipt-evidence-state-url-mismatch");
  }
  if (proof.sourcePaintRevision !== canvas.sourcePaintRevision ||
      proof.bindingKey !== canvas.bindingKey || proof.canvasIdentity !== canvas.canvasIdentity ||
      proof.domCanvasIndex !== canvas.domCanvasIndex ||
      proof.runtimeCanvasId !== canvas.runtimeCanvasId ||
      proof.terminalRasterSha256 !== canvas.terminalRasterSha256 ||
      proof.backingSize.width !== canvas.backingWidth ||
      proof.backingSize.height !== canvas.backingHeight ||
      proof.cssSize.width !== canvas.cssWidth || proof.cssSize.height !== canvas.cssHeight) {
    issues.push("final-compositor-source-revision-or-size-mismatch");
  }
  const integralPositiveSize = (size: CaliforniaCanvasGraphicsFinalCompositorSize) =>
    Number.isSafeInteger(size.width) && Number.isSafeInteger(size.height) &&
    size.width > 0 && size.height > 0;
  const finitePositiveSize = (size: CaliforniaCanvasGraphicsFinalCompositorSize) =>
    Number.isFinite(size.width) && Number.isFinite(size.height) &&
    size.width > 0 && size.height > 0;
  const sameCssCoordinate = (left: number, right: number) =>
    Math.abs(left - right) <= 1e-7;
  const integralRect = (rect: CaliforniaCanvasGraphicsFinalCompositorRect) =>
    Number.isSafeInteger(rect.x) && Number.isSafeInteger(rect.y) && rect.x >= 0 && rect.y >= 0 &&
    integralPositiveSize(rect);
  const finitePositiveRect = (rect: CaliforniaCanvasGraphicsFinalCompositorRect) =>
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0;
  const expectedClip = finitePositiveRect(proof.canvasPageRect)
    ? {
        height: Math.ceil(proof.canvasPageRect.y + proof.canvasPageRect.height) -
          Math.floor(proof.canvasPageRect.y),
        width: Math.ceil(proof.canvasPageRect.x + proof.canvasPageRect.width) -
          Math.floor(proof.canvasPageRect.x),
        x: Math.floor(proof.canvasPageRect.x),
        y: Math.floor(proof.canvasPageRect.y)
      }
    : null;
  const viewportRect = finitePositiveRect(proof.canvasPageRect) &&
      Number.isSafeInteger(proof.captureScrollOffset?.x) &&
      Number.isSafeInteger(proof.captureScrollOffset?.y)
    ? {
        height: proof.canvasPageRect.height,
        width: proof.canvasPageRect.width,
        x: proof.canvasPageRect.x - proof.captureScrollOffset.x,
        y: proof.canvasPageRect.y - proof.captureScrollOffset.y
      }
    : null;
  const expectedViewportClip = viewportRect
    ? {
        height: Math.ceil(viewportRect.y + viewportRect.height) - Math.floor(viewportRect.y),
        width: Math.ceil(viewportRect.x + viewportRect.width) - Math.floor(viewportRect.x),
        x: Math.floor(viewportRect.x),
        y: Math.floor(viewportRect.y)
      }
    : null;
  if (!integralPositiveSize(proof.backingSize) || !finitePositiveSize(proof.cssSize) ||
      !integralRect(proof.clip) || !finitePositiveRect(proof.canvasPageRect) ||
      !integralPositiveSize(proof.captureViewportSize) ||
      !integralRect(proof.captureViewportClip) ||
      !Number.isSafeInteger(proof.captureScrollOffset?.x) ||
      !Number.isSafeInteger(proof.captureScrollOffset?.y) ||
      proof.captureScrollOffset.x < 0 || proof.captureScrollOffset.y < 0 ||
      !sameCssCoordinate(proof.canvasPageRect.width, proof.cssSize.width) ||
      !sameCssCoordinate(proof.canvasPageRect.height, proof.cssSize.height) ||
      !expectedClip || proof.clip.x !== expectedClip.x || proof.clip.y !== expectedClip.y ||
      proof.clip.width !== expectedClip.width || proof.clip.height !== expectedClip.height ||
      !expectedViewportClip ||
      proof.captureViewportClip.x !== expectedViewportClip.x ||
      proof.captureViewportClip.y !== expectedViewportClip.y ||
      proof.captureViewportClip.width !== expectedViewportClip.width ||
      proof.captureViewportClip.height !== expectedViewportClip.height ||
      proof.captureViewportClip.x + proof.captureViewportClip.width >
        proof.captureViewportSize.width ||
      proof.captureViewportClip.y + proof.captureViewportClip.height >
        proof.captureViewportSize.height ||
      proof.clip.width * proof.clip.height >
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PIXELS ||
      !Number.isFinite(proof.deviceScaleFactor) || proof.deviceScaleFactor <= 0) {
    issues.push("final-compositor-bounded-geometry-invalid");
  }
  for (const [label, raster] of [
    ["reference", proof.reference],
    ["compositor", proof.compositor]
  ] as const) {
    if (!integralPositiveSize(raster) || raster.width !== proof.clip.width ||
        raster.height !== proof.clip.height || !Number.isSafeInteger(raster.pngByteLength) ||
        raster.pngByteLength < 1 || raster.pngByteLength >
          CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PNG_BYTES ||
        !shaPattern.test(raster.pngSha256) || !shaPattern.test(raster.rgbaSha256)) {
      issues.push(`final-compositor-${label}-raster-invalid`);
    }
  }
  if (proof.reference.rgbaSha256 !== proof.compositor.rgbaSha256) {
    issues.push("final-compositor-reference-compositor-rgba-mismatch");
  }
  if (!shaPattern.test(proof.layoutFenceBeforeSha256) ||
      proof.layoutFenceAfterSha256 !== proof.layoutFenceBeforeSha256) {
    issues.push("final-compositor-layout-fence-mismatch");
  }
  issues.push(...verifyCaliforniaCanvasGraphicsPaintEnvironmentSnapshot(
    proof.paintEnvironment
  ).map((issue) => `final-compositor-${issue}`));
  const comparison = proof.comparison;
  const pixelCount = proof.clip.width * proof.clip.height;
  if (comparison.passed !== true || comparison.pixelCount !== pixelCount ||
      comparison.channelTolerance !==
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE ||
      comparison.maxChangedPixelRatio !==
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO ||
      comparison.maxMeanAbsoluteDiffRatio !==
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO ||
      comparison.changedPixelCount !== 0 || comparison.changedPixelRatio !== 0 ||
      comparison.meanAbsoluteDiffRatio !== 0 || comparison.maximumChannelDifference !== 0) {
    issues.push("final-compositor-full-pixel-comparison-invalid");
  }
  if (!shaPattern.test(proof.bindingSha256) || proof.bindingSha256 !==
      californiaCanvasGraphicsFinalCompositorBindingSha256(finalCompositorProofPayload(proof))) {
    issues.push("final-compositor-binding-sha-mismatch");
  }
  if (Buffer.byteLength(stableSerialize(proof), "utf8") >
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PROOF_BYTES) {
    issues.push("final-compositor-proof-byte-cap-exceeded");
  }
  return [...new Set(issues)];
}

let cachedContract: CaliforniaCanvasGraphicsSourceContract | null = null;
function defaultContract() {
  cachedContract ??= buildCaliforniaCanvasGraphicsSourceContract();
  return cachedContract;
}

type CaliforniaCanvasGraphicsVerificationContractIndex = {
  benchExpectedEssential: ReadonlyMap<string, {
    count: number;
    digest: string;
    keys: readonly string[];
  }>;
  expectedEssentialCount: number;
  expectedEssentialDigest: string;
  expectedEssentialKeys: readonly string[];
  expectedSites: ReadonlyMap<
    string,
    CaliforniaCanvasGraphicsSourceContract["paintSites"][number]
  >;
};

const verificationContractIndexes = new WeakMap<
  CaliforniaCanvasGraphicsSourceContract,
  CaliforniaCanvasGraphicsVerificationContractIndex
>();

/**
 * The offline ledgers verify thousands of receipts against one immutable
 * source contract. Index that contract once; receipt hashes, raster evidence,
 * site evidence and ACKs are still recomputed independently for every state.
 */
function verificationContractIndex(
  contract: CaliforniaCanvasGraphicsSourceContract
): CaliforniaCanvasGraphicsVerificationContractIndex {
  const cached = verificationContractIndexes.get(contract);
  if (cached) return cached;
  const essentialSites = contract.paintSites.filter((site) => site.role === "essential");
  const expectedEssentialKeys = essentialSites.map((site) => site.sourceSiteKey).sort();
  const keysByBench = new Map<string, string[]>();
  for (const site of essentialSites) {
    const benchId = String(site.benchId);
    const keys = keysByBench.get(benchId) ?? [];
    keys.push(site.sourceSiteKey);
    keysByBench.set(benchId, keys);
  }
  const benchExpectedEssential = new Map(
    [...keysByBench].map(([benchId, keys]) => {
      const sortedKeys = keys.sort();
      return [benchId, {
        count: sortedKeys.length,
        digest: digestKeys(sortedKeys),
        keys: sortedKeys
      }] as const;
    })
  );
  const index: CaliforniaCanvasGraphicsVerificationContractIndex = {
    benchExpectedEssential,
    expectedEssentialCount: expectedEssentialKeys.length,
    expectedEssentialDigest: digestKeys(expectedEssentialKeys),
    expectedEssentialKeys,
    expectedSites: new Map(essentialSites.map((site) => [site.sourceSiteKey, site]))
  };
  verificationContractIndexes.set(contract, index);
  return index;
}

export function buildCaliforniaCanvasGraphicsRuntimeConfig(
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract(),
  benchIds?: readonly string[],
  runtimeRunId = CALIFORNIA_CANVAS_GRAPHICS_MODULE_RUN_ID
): CaliforniaCanvasGraphicsRuntimeConfig {
  if (!/^[a-z0-9:_-]{16,128}$/i.test(runtimeRunId)) {
    throw new Error("California Canvas graphics runtime run ID is invalid");
  }
  const selected = benchIds ? new Set(benchIds) : null;
  const allEssentialKeys = contract.paintSites.filter((site) => site.role === "essential")
    .map((site) => site.sourceSiteKey).sort();
  const selectedSites = contract.paintSites.filter((site) =>
    !selected || selected.has(String(site.benchId))
  );
  const selectedBindings = contract.bindings.filter((binding) =>
    !selected || selected.has(String(binding.benchId))
  );
  const selectedBenches = [...new Set(selectedBindings.map((binding) => String(binding.benchId)))].sort();
  return {
    benchExpectedEssential: Object.fromEntries(selectedBenches.map((benchId) => {
      const keys = contract.paintSites.filter((site) =>
        String(site.benchId) === benchId && site.role === "essential"
      ).map((site) => site.sourceSiteKey).sort();
      return [benchId, { count: keys.length, digest: digestKeys(keys), keys }];
    })),
    bindings: selectedBindings.map((binding) => ({
      benchId: String(binding.benchId),
      key: binding.key
    })),
    externalCompositePaper: CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
    runtimeRunId,
    sourceContractSha256: contract.contractSha256,
    sourceExpectedEssentialCount: allEssentialKeys.length,
    sourceExpectedEssentialDigest: digestKeys(allEssentialKeys),
    sourceProductSha256: contract.sourceSha256,
    sites: selectedSites.map((site) => ({
      contextKey: site.canvasContextKeys[0],
      expectedIdentitySha256: site.expectedIdentitySha256,
      operation: site.operation,
      role: site.role,
      sourceSiteKey: site.sourceSiteKey
    })),
    version: CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION
  };
}

function evidencePayload(evidence: CaliforniaCanvasGraphicsStateEvidence) {
  const { evidenceSha256: _evidenceSha256, ...payload } = evidence;
  return payload;
}

function contrastConsumeAckPayload(ack: CaliforniaCanvasGraphicsContrastConsumeAck) {
  const { ackSha256: _ackSha256, ...payload } = ack;
  return payload;
}

export function verifyCaliforniaCanvasGraphicsStateEvidence(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const issues: string[] = [];
  const contractIndex = verificationContractIndex(contract);
  const expectedSites = contractIndex.expectedSites;
  const benchExpected = contractIndex.benchExpectedEssential.get(
    evidence.canvases[0]?.benchId ?? ""
  ) ?? { count: 0, digest: digestKeys([]), keys: [] };
  if (evidence.runtimeVersion !== CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION) {
    issues.push(`runtime-version:${evidence.runtimeVersion}!=${CALIFORNIA_CANVAS_GRAPHICS_RUNTIME_VERSION}`);
  }
  if (!/^[a-z0-9:_-]{16,128}$/i.test(evidence.runtimeRunId)) {
    issues.push("runtime-run-id-invalid");
  }
  if (expectation?.runtimeRunId && evidence.runtimeRunId !== expectation.runtimeRunId) {
    issues.push("runtime-run-id-mismatch");
  }
  if (evidence.rootRuntimeId < 1 || !evidence.captureFenceSignature.trim()) {
    issues.push("capture-fence-or-root-identity-invalid");
  }
  if (evidence.sourceContractSha256 !== contract.contractSha256 ||
      evidence.sourceContractSha256 !== CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256) {
    issues.push("source-contract-sha-mismatch");
  }
  if (evidence.sourceProductSha256 !== contract.sourceSha256 ||
      evidence.sourceProductSha256 !== CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256) {
    issues.push("source-product-sha-mismatch");
  }
  if (evidence.sourceExpectedEssentialCount !== contractIndex.expectedEssentialCount) {
    issues.push(`source-expected-essential-count:${evidence.sourceExpectedEssentialCount}!=${contractIndex.expectedEssentialCount}`);
  }
  if (evidence.sourceExpectedEssentialDigest !== contractIndex.expectedEssentialDigest) {
    issues.push("source-expected-essential-digest-mismatch");
  }
  if (evidence.canvases.length === 0) issues.push("visible-canvas-evidence-missing");
  if (expectation) {
    if (evidence.stateKey !== expectation.stateKey) issues.push("state-key-mismatch");
    if (evidence.surfaceKey !== expectation.surfaceKey) issues.push("surface-key-mismatch");
    if (evidence.canvases.some((canvas) => canvas.benchId !== expectation.benchId)) {
      issues.push("bench-id-mismatch");
    }
    if (expectation.capturedUrl && evidence.capturedUrl !== expectation.capturedUrl) {
      issues.push("captured-url-mismatch");
    }
  }
  const now = expectation?.nowEpochMs ?? Date.now();
  const maxAge = expectation?.maxAgeMs ?? CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS;
  if (!Number.isSafeInteger(evidence.capturedAtEpochMs) || evidence.capturedAtEpochMs <= 0 ||
      !Number.isFinite(evidence.capturedAtPerformanceMs) || evidence.capturedAtPerformanceMs < 0) {
    issues.push("capture-timestamp-invalid");
  } else if (evidence.capturedAtEpochMs > now + 1_000 ||
      now - evidence.capturedAtEpochMs > maxAge) {
    issues.push("evidence-stale-or-future");
  }
  if (!/^[-0-9a-f]{12,}$/i.test(evidence.receiptId) || !evidence.runtimeSessionId.trim()) {
    issues.push("one-shot-identity-invalid");
  }
  if (evidence.evidenceSha256 !== sha256(stableSerialize(evidencePayload(evidence)))) {
    issues.push("evidence-sha-mismatch");
  }
  if (evidence.issues.length > 0) issues.push(...evidence.issues.map((issue) => `state:${issue}`));

  const observedKeys = evidence.observedSourceSiteKeys.slice();
  const sortedObserved = observedKeys.slice().sort();
  if (new Set(observedKeys).size !== observedKeys.length ||
      JSON.stringify(observedKeys) !== JSON.stringify(sortedObserved)) {
    issues.push("observed-source-site-set-not-unique-sorted");
  }
  if (evidence.observedSourceSiteCount !== observedKeys.length) {
    issues.push("forged-observed-source-site-count");
  }
  if (evidence.observedSourceSiteDigest !== digestKeys(observedKeys)) {
    issues.push("observed-source-site-digest-mismatch");
  }
  for (const key of observedKeys) {
    const site = expectedSites.get(key);
    if (!site) issues.push(`unknown-or-nonessential-source-site:${key}`);
  }
  if (observedKeys.length === 0) issues.push("no-terminal-essential-source-site-evidence");

  const canvasObservedKeys = new Set<string>();
  const canvasIdentities = new Set<string>();
  const stateBenchIds = new Set<string>();
  for (const canvas of evidence.canvases) {
    stateBenchIds.add(canvas.benchId);
    if (canvas.issues.length > 0) {
      issues.push(...canvas.issues.map((issue) => `${canvas.bindingKey}:${issue}`));
    }
    if (!(canvas.backingWidth > 0 && canvas.backingHeight > 0 &&
          canvas.cssWidth > 0 && canvas.cssHeight > 0)) {
      issues.push(`${canvas.bindingKey}:invalid-canvas-dimensions`);
    }
    if (!canvas.canvasIdentity.trim() || canvasIdentities.has(canvas.canvasIdentity) ||
        canvas.domCanvasIndex < 0 || canvas.runtimeCanvasId < 1) {
      issues.push(`${canvas.bindingKey}:canvas-identity-invalid-or-reused`);
    }
    canvasIdentities.add(canvas.canvasIdentity);
    if (canvas.latestClearEpoch < 1 || !canvas.latestClearWasFull) {
      issues.push(`${canvas.bindingKey}:missing-full-clear-epoch`);
    }
    if (canvas.pendingRafCount !== 0) issues.push(`${canvas.bindingKey}:pending-raf`);
    if (canvas.latestPaintRafEpoch > canvas.latestSettledRafEpoch) {
      issues.push(`${canvas.bindingKey}:raf-stale-frame`);
    }
    if (canvas.paperProof.expectedPaperColor !== CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER ||
        !canvas.paperProof.paperOpaque ||
        canvas.paperProof.effectiveOpaqueBackgroundColor.toLowerCase() !== "rgb(251, 251, 248)" ||
        canvas.paperProof.canvasBackgroundImage !== "none" ||
        canvas.paperProof.compositingLayers.length < 2) {
      issues.push(`${canvas.bindingKey}:paper-background-mismatch-or-transparent`);
    }
    const paperLayers = canvas.paperProof.compositingLayers.filter((layer) =>
      layer.withinPaperStack
    );
    const paperSurfaces = paperLayers.filter((layer) => layer.isPaperSurface);
    if (paperLayers.length < 2 || paperSurfaces.length !== 1 ||
        paperSurfaces[0]?.backgroundColor !== "rgb(251, 251, 248)" ||
        paperLayers.some((layer) =>
          layer.opacity !== 1 || layer.filter !== "none" || layer.backdropFilter !== "none" ||
          layer.mixBlendMode !== "normal" || layer.maskImage !== "none"
        ) || paperLayers.some((layer) =>
          layer.backgroundImage !== "none" || layer.boxShadow !== "none" ||
          (layer.backgroundColor !== "rgba(0, 0, 0, 0)" &&
            layer.backgroundColor !== "transparent" &&
            layer.backgroundColor !== "rgb(251, 251, 248)")
        )) {
      issues.push(`${canvas.bindingKey}:unresolved-compositing-layer`);
    }
    if (canvas.compositedOpaquePixelRatio !== 1) {
      issues.push(`${canvas.bindingKey}:terminal-composite-not-opaque`);
    }
    if (canvas.qaReadbackMode !== "native-existing-2d-context" ||
        canvas.sourcePaintRevision < 1 ||
        canvas.qaReadbackCount < canvas.sourcePaintRevision * 2 + 1) {
      issues.push(`${canvas.bindingKey}:qa-readback-or-source-revision-invalid`);
    }
    if (!/^[0-9a-f]{64}$/.test(canvas.terminalRasterSha256)) {
      issues.push(`${canvas.bindingKey}:terminal-raster-sha-invalid`);
    }
    if (canvas.observedSourceSiteCount !== canvas.observedSourceSiteKeys.length ||
        canvas.observedSourceSiteDigest !== digestKeys(canvas.observedSourceSiteKeys)) {
      issues.push(`${canvas.bindingKey}:forged-canvas-source-site-set`);
    }
    if (canvas.observedSourceSiteKeys.length === 0 || canvas.siteEvidence.length === 0) {
      issues.push(`${canvas.bindingKey}:canvas-essential-source-site-evidence-missing`);
    }
    const siteKeys = canvas.siteEvidence.map((site) => site.sourceSiteKey).sort();
    if (JSON.stringify(siteKeys) !== JSON.stringify(canvas.observedSourceSiteKeys)) {
      issues.push(`${canvas.bindingKey}:site-evidence-set-mismatch`);
    }
    for (const site of canvas.siteEvidence) {
      canvasObservedKeys.add(site.sourceSiteKey);
      const expected = expectedSites.get(site.sourceSiteKey);
      if (!expected || String(expected.benchId) !== canvas.benchId ||
          expected.canvasContextKeys[0] !== canvas.bindingKey ||
          expected.operation !== site.operation) {
        issues.push(`${canvas.bindingKey}:source-site-identity-mismatch:${site.sourceSiteKey}`);
      }
      if (site.minimumCoreContrastRatio < CALIFORNIA_CANVAS_GRAPHICS_MIN_CONTRAST_RATIO) {
        issues.push(`${canvas.bindingKey}:low-contrast:${site.sourceSiteKey}`);
      }
      if (site.largestConnectedCorePixelCount <
          CALIFORNIA_CANVAS_GRAPHICS_MIN_CONNECTED_CORE_PIXELS) {
        issues.push(`${canvas.bindingKey}:unconnected-or-tiny-core:${site.sourceSiteKey}`);
      }
      if (site.corePixelCoverageRatio < CALIFORNIA_CANVAS_GRAPHICS_MIN_CORE_COVERAGE_RATIO ||
          Math.abs(site.corePixelCoverageRatio -
            (site.terminalVisiblePixelCount > 0
              ? site.corePixelCount / site.terminalVisiblePixelCount
              : 0)) > 1e-9) {
        issues.push(`${canvas.bindingKey}:insufficient-contrast-core-coverage:${site.sourceSiteKey}`);
      }
      if (site.backgroundNeighborPixelCount < 1) {
        issues.push(`${canvas.bindingKey}:connected-background-missing:${site.sourceSiteKey}`);
      }
      if (site.terminalVisiblePixelCount < site.largestConnectedCorePixelCount ||
          site.corePixelCount < site.largestConnectedCorePixelCount ||
          site.changedPixelCount < site.terminalVisiblePixelCount ||
          site.invocationCount < 1 || site.clearEpoch !== canvas.latestClearEpoch ||
          site.latestRafEpoch > canvas.latestSettledRafEpoch) {
        issues.push(`${canvas.bindingKey}:forged-role-pixel-count:${site.sourceSiteKey}`);
      }
    }
    if (canvas.sourcePaintRevision < canvas.siteEvidence.reduce(
      (sum, site) => sum + site.invocationCount,
      0
    )) {
      issues.push(`${canvas.bindingKey}:forged-source-paint-revision`);
    }
    const minimum = canvas.siteEvidence.length > 0
      ? Math.min(...canvas.siteEvidence.map((site) => site.minimumCoreContrastRatio))
      : 0;
    if (Math.abs(canvas.minimumNumericNonTextContrastRatio - minimum) > 1e-9) {
      issues.push(`${canvas.bindingKey}:forged-minimum-contrast`);
    }
    if (canvas.roleCorePixelCount !== canvas.siteEvidence.reduce(
      (sum, site) => sum + site.corePixelCount,
      0
    ) || canvas.roleConnectedCorePixelCount !== canvas.siteEvidence.reduce(
      (sum, site) => sum + site.largestConnectedCorePixelCount,
      0
    ) || canvas.roleBackgroundNeighborPixelCount !== canvas.siteEvidence.reduce(
      (sum, site) => sum + site.backgroundNeighborPixelCount,
      0
    )) {
      issues.push(`${canvas.bindingKey}:forged-role-aggregate-count`);
    }
  }
  if (stateBenchIds.size !== 1) issues.push("state-mixed-bench-canvases");
  if (JSON.stringify([...canvasObservedKeys].sort()) !== JSON.stringify(sortedObserved)) {
    issues.push("state-canvas-observed-site-union-mismatch");
  }
  if (evidence.canvases.length > 0) {
    if (evidence.benchExpectedEssentialCount !== benchExpected.count ||
        evidence.benchExpectedEssentialDigest !== benchExpected.digest) {
      issues.push("bench-expected-essential-contract-mismatch");
    }
  }
  return [...new Set(issues)];
}

export function assertCaliforniaCanvasGraphicsStateEvidence(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const issues = verifyCaliforniaCanvasGraphicsStateEvidence(evidence, expectation, contract);
  if (issues.length > 0) {
    throw new Error(`California Canvas graphics state evidence failed: ${issues.join("|")}`);
  }
  return evidence;
}

export function verifyCaliforniaCanvasGraphicsContrastConsumeAck(
  ack: CaliforniaCanvasGraphicsContrastConsumeAck,
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const issues: string[] = [];
  if (ack.ackVersion !== CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION) {
    issues.push("contrast-ack-version-mismatch");
  }
  if (!/^[0-9a-f]{64}$/.test(ack.ackNonce) || !/^[0-9a-f]{64}$/.test(ack.ackSha256)) {
    issues.push("contrast-ack-identity-invalid");
  }
  if (ack.ackSha256 !== sha256(stableSerialize(contrastConsumeAckPayload(ack)))) {
    issues.push("contrast-ack-sha-mismatch");
  }
  if (ack.receiptId !== evidence.receiptId || ack.evidenceSha256 !== evidence.evidenceSha256) {
    issues.push("contrast-ack-receipt-or-evidence-mismatch");
  }
  if (ack.runtimeRunId !== evidence.runtimeRunId ||
      ack.runtimeSessionId !== evidence.runtimeSessionId ||
      ack.stateKey !== evidence.stateKey || ack.surfaceKey !== evidence.surfaceKey ||
      ack.capturedUrl !== evidence.capturedUrl) {
    issues.push("contrast-ack-run-session-state-surface-url-mismatch");
  }
  if (ack.rootRuntimeId !== evidence.rootRuntimeId ||
      ack.auditedRootIdentity !== `${evidence.runtimeSessionId}:root-${evidence.rootRuntimeId}` ||
      ack.captureFenceSignature !== evidence.captureFenceSignature) {
    issues.push("contrast-ack-root-or-capture-fence-mismatch");
  }
  if (ack.sourceContractSha256 !== evidence.sourceContractSha256 ||
      ack.sourceContractSha256 !== contract.contractSha256 ||
      ack.sourceProductSha256 !== evidence.sourceProductSha256 ||
      ack.sourceProductSha256 !== contract.sourceSha256) {
    issues.push("contrast-ack-source-identity-mismatch");
  }
  if (expectation) {
    if (expectation.runtimeRunId && ack.runtimeRunId !== expectation.runtimeRunId) {
      issues.push("contrast-ack-runtime-run-mismatch");
    }
    if (ack.stateKey !== expectation.stateKey || ack.surfaceKey !== expectation.surfaceKey ||
        (expectation.capturedUrl != null && ack.capturedUrl !== expectation.capturedUrl) ||
        evidence.canvases.some((canvas) => canvas.benchId !== expectation.benchId)) {
      issues.push("contrast-ack-expectation-mismatch");
    }
  }
  if (!Number.isSafeInteger(ack.contrastConsumedAtEpochMs) ||
      !Number.isSafeInteger(ack.acknowledgedAtEpochMs) ||
      !Number.isFinite(ack.contrastConsumedAtPerformanceMs) ||
      !Number.isFinite(ack.acknowledgedAtPerformanceMs) ||
      ack.contrastConsumedAtEpochMs < evidence.capturedAtEpochMs ||
      ack.acknowledgedAtEpochMs < ack.contrastConsumedAtEpochMs ||
      ack.contrastConsumedAtPerformanceMs < evidence.capturedAtPerformanceMs ||
      ack.acknowledgedAtPerformanceMs < ack.contrastConsumedAtPerformanceMs) {
    issues.push("contrast-ack-timestamp-invalid");
  }
  const now = expectation?.nowEpochMs ?? Date.now();
  const maxAge = expectation?.maxAgeMs ?? CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS;
  if (ack.acknowledgedAtEpochMs > now + 1_000 ||
      now - ack.acknowledgedAtEpochMs > maxAge) {
    issues.push("contrast-ack-stale-or-future");
  }
  issues.push(...verifyCaliforniaCanvasGraphicsPaintEnvironmentSnapshot(
    ack.paintEnvironment
  ).map((issue) => `contrast-ack-${issue}`));
  const expectedCanvases = evidence.canvases.slice().sort((left, right) =>
    left.domCanvasIndex - right.domCanvasIndex
  );
  const actualCanvases = ack.canvases.slice();
  if (actualCanvases.length !== expectedCanvases.length || actualCanvases.length === 0 ||
      JSON.stringify(actualCanvases.map((canvas) => canvas.domCanvasIndex)) !==
        JSON.stringify(actualCanvases.map((canvas) => canvas.domCanvasIndex).slice().sort(
          (left, right) => left - right
        ))) {
    issues.push("contrast-ack-canvas-set-invalid");
  }
  for (let index = 0; index < Math.max(actualCanvases.length, expectedCanvases.length); index += 1) {
    const actual = actualCanvases[index];
    const expected = expectedCanvases[index];
    if (!actual || !expected || actual.backingHeight !== expected.backingHeight ||
        actual.backingWidth !== expected.backingWidth || actual.bindingKey !== expected.bindingKey ||
        actual.canvasIdentity !== expected.canvasIdentity ||
        actual.domCanvasIndex !== expected.domCanvasIndex ||
        actual.runtimeCanvasId !== expected.runtimeCanvasId ||
        actual.sourcePaintRevision !== expected.sourcePaintRevision ||
        actual.terminalRasterSha256 !== expected.terminalRasterSha256 ||
        !/^[0-9a-f]{64}$/.test(actual.terminalPixelSnapshotSha256)) {
      issues.push(`contrast-ack-canvas-mismatch:${index}`);
    }
    if (actual && expected) {
      issues.push(...verifyCaliforniaCanvasGraphicsFinalCompositorProof(
        actual.finalCompositor,
        expected,
        evidence
      ).map((issue) => `${issue}:${index}`));
      if (actual.finalCompositor &&
          stableSerialize(actual.finalCompositor.paintEnvironment) !==
            stableSerialize(ack.paintEnvironment)) {
        issues.push(`contrast-ack-paint-environment-mismatch:${index}`);
      }
    }
  }
  if (ack.canvasSetDigest !== sha256(stableSerialize(actualCanvases))) {
    issues.push("contrast-ack-canvas-set-digest-mismatch");
  }
  return [...new Set(issues)];
}

export function assertCaliforniaCanvasGraphicsContrastConsumeAck(
  ack: CaliforniaCanvasGraphicsContrastConsumeAck,
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const issues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    ack,
    evidence,
    expectation,
    contract
  );
  if (issues.length > 0) {
    throw new Error(`California Canvas contrast consume ACK failed: ${issues.join("|")}`);
  }
  return ack;
}

const consumedReceiptIds = new Set<string>();
const consumedContrastAckIds = new Set<string>();
/**
 * Structural one-shot primitive retained for focused negative tests. It is not
 * a release-acceptance consume: aggregate coverage requires an ACKed receipt.
 */
export function consumeCaliforniaCanvasGraphicsStateEvidence(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  assertCaliforniaCanvasGraphicsStateEvidence(evidence, expectation, contract);
  if (consumedReceiptIds.has(evidence.receiptId)) {
    throw new Error(`California Canvas graphics receipt was already consumed: ${evidence.receiptId}`);
  }
  consumedReceiptIds.add(evidence.receiptId);
  return evidence;
}

export function consumeCaliforniaCanvasGraphicsAckedStateEvidence(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  contrastConsumeAck: CaliforniaCanvasGraphicsContrastConsumeAck,
  expectation?: CaliforniaCanvasGraphicsStateExpectation,
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
): CaliforniaCanvasGraphicsAckedStateEvidence {
  assertCaliforniaCanvasGraphicsStateEvidence(evidence, expectation, contract);
  assertCaliforniaCanvasGraphicsContrastConsumeAck(
    contrastConsumeAck,
    evidence,
    expectation,
    contract
  );
  const ackIdentity = `${contrastConsumeAck.receiptId}:${contrastConsumeAck.ackNonce}`;
  if (consumedReceiptIds.has(evidence.receiptId) || consumedContrastAckIds.has(ackIdentity)) {
    throw new Error(
      `California Canvas ACK or state receipt was already consumed: ${ackIdentity}`
    );
  }
  consumedReceiptIds.add(evidence.receiptId);
  consumedContrastAckIds.add(ackIdentity);
  return { contrastConsumeAck, evidence };
}

export function verifyCaliforniaCanvasGraphicsAggregateCoverage(
  receipts: readonly (
    CaliforniaCanvasGraphicsAckedStateEvidence | CaliforniaCanvasGraphicsStateEvidence
  )[],
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const issues: string[] = [];
  const receiptIds = new Set<string>();
  const logicalStates = new Set<string>();
  const observed = new Set<string>();
  const runtimeRunIds = new Set<string>();
  for (const receipt of receipts) {
    const acked = "evidence" in receipt && "contrastConsumeAck" in receipt
      ? receipt as CaliforniaCanvasGraphicsAckedStateEvidence
      : null;
    const evidence = acked?.evidence ?? receipt as CaliforniaCanvasGraphicsStateEvidence;
    if (!acked) {
      issues.push(`${evidence.receiptId}:browser-contrast-consume-ack-missing`);
    }
    // Aggregate verification is an offline immutable-artifact check. Live
    // freshness has already been enforced by collect/register/contrast and
    // one-shot Node consumption. Rebind the receipt to its own capture instant
    // so a long exhaustive run cannot make an earlier valid receipt stale.
    issues.push(...verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
      benchId: evidence.canvases[0]?.benchId ?? "missing",
      capturedUrl: evidence.capturedUrl,
      maxAgeMs: 0,
      nowEpochMs: evidence.capturedAtEpochMs,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    }, contract)
      .map((issue) => `${evidence.receiptId}:${issue}`));
    if (acked) {
      issues.push(...verifyCaliforniaCanvasGraphicsContrastConsumeAck(
        acked.contrastConsumeAck,
        evidence,
        {
          benchId: evidence.canvases[0]?.benchId ?? "missing",
          capturedUrl: evidence.capturedUrl,
          maxAgeMs: 0,
          nowEpochMs: acked.contrastConsumeAck.acknowledgedAtEpochMs,
          runtimeRunId: evidence.runtimeRunId,
          stateKey: evidence.stateKey,
          surfaceKey: evidence.surfaceKey
        },
        contract
      ).map((issue) => `${evidence.receiptId}:${issue}`));
    }
    if (receiptIds.has(evidence.receiptId)) issues.push(`duplicate-receipt:${evidence.receiptId}`);
    receiptIds.add(evidence.receiptId);
    runtimeRunIds.add(evidence.runtimeRunId);
    const logicalState = [
      [...new Set(evidence.canvases.map((canvas) => canvas.benchId))].sort().join(","),
      evidence.capturedUrl,
      evidence.stateKey,
      evidence.surfaceKey
    ].join("|");
    if (logicalStates.has(logicalState)) {
      issues.push(`duplicate-logical-state-receipt:${logicalState}`);
    }
    logicalStates.add(logicalState);
    for (const key of evidence.observedSourceSiteKeys) observed.add(key);
  }
  if (runtimeRunIds.size !== 1) {
    issues.push(`mixed-runtime-run:${[...runtimeRunIds].sort().join(",")}`);
  }
  const expected = contract.paintSites.filter((site) => site.role === "essential")
    .map((site) => site.sourceSiteKey).sort();
  const actual = [...observed].sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((key) => !actualSet.has(key));
  const extra = actual.filter((key) => !expectedSet.has(key));
  if (missing.length > 0) issues.push(`aggregate-essential-sites-missing:${missing.join(",")}`);
  if (extra.length > 0) issues.push(`aggregate-source-sites-extra:${extra.join(",")}`);
  if (actual.length !== expected.length) {
    issues.push(`aggregate-essential-count:${actual.length}!=${expected.length}`);
  }
  return {
    expectedCount: expected.length,
    expectedDigest: digestKeys(expected),
    issues: [...new Set(issues)],
    observedCount: actual.length,
    observedDigest: digestKeys(actual),
    observedSourceSiteKeys: actual
  };
}

export function assertCaliforniaCanvasGraphicsAggregateCoverage(
  receipts: readonly (
    CaliforniaCanvasGraphicsAckedStateEvidence | CaliforniaCanvasGraphicsStateEvidence
  )[],
  contract: CaliforniaCanvasGraphicsSourceContract = defaultContract()
) {
  const result = verifyCaliforniaCanvasGraphicsAggregateCoverage(receipts, contract);
  if (result.issues.length > 0) {
    throw new Error(`California Canvas aggregate graphics coverage failed: ${result.issues.join("|")}`);
  }
  return result;
}

/** Browser-local Canvas recorder. Serialized into a Playwright init script. */
function californiaCanvasGraphicsRuntimeInit(
  config: CaliforniaCanvasGraphicsRuntimeConfig,
  exactControlledRangeNormalization: typeof isCaliforniaExactNetZeroControlledRangeNormalization
) {
  type Rgba = [number, number, number, number];
  type Bounds = { bottom: number; left: number; right: number; top: number };
  type PixelSample = { index: number; post: Rgba; pre: Rgba; sequence: number; x: number; y: number };
  type SiteAggregate = {
    changedPixelCount: number;
    clearEpoch: number;
    invocationCount: number;
    latestRafEpoch: number;
    operation: CaliforniaCanvasTerminalOperation;
    paintServerKinds: Set<string>;
    role: "background" | "decorative" | "essential";
    samples: PixelSample[];
    sourceSiteKey: string;
  };
  type CanvasState = {
    bindingKey: string;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    clearEpoch: number;
    clipBounds: Bounds | null;
    clipCoverage: "full" | "none" | "partial-or-unknown";
    lastActivityAt: number;
    latestClearWasFull: boolean;
    latestPaintRafEpoch: number;
    pathBounds: Bounds | null;
    pathCanProveFullCanvasRect: boolean;
    pathOperationCount: number;
    qaReadbackCount: number;
    runtimeCanvasId: number;
    sequence: number;
    siteAggregates: Map<string, SiteAggregate>;
    stack: Array<{
      clipBounds: Bounds | null;
      clipCoverage: CanvasState["clipCoverage"];
    }>;
    unsupportedReasons: string[];
    writerMap: Uint32Array;
    writerSiteBySequence: Map<number, string>;
  };
  type AnimationState = {
    activeEpoch: number;
    lastActivityAt: number;
    latestScheduledEpoch: number;
    latestSettledEpoch: number;
    pending: Map<number, number>;
  };
  type ActiveInvocation = {
    context: CanvasRenderingContext2D;
    expected: ExpectedRuntimeSite;
    observedCount: number;
  };
  type TerminalPixelSnapshot = {
    backingHeight: number;
    backingWidth: number;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    pixels: Uint8ClampedArray;
    sourcePaintRevision: number;
  };
  type ContrastCanvasRegistration = {
    canvas: HTMLCanvasElement;
    canvasEvidence: CaliforniaCanvasGraphicsCanvasEvidence;
    state: CanvasState;
    terminalPixels: TerminalPixelSnapshot;
  };
  type PreparedFinalCompositorCanvas = {
    layoutFence: string;
    paintFence: string;
    plan: CaliforniaCanvasGraphicsFinalCompositorCapturePlan["canvases"][number];
    registration: ContrastCanvasRegistration;
  };
  type PaintEnvironmentKind = keyof CaliforniaCanvasGraphicsPaintEnvironmentKindCounts;
  type ContrastConsumptionState = {
    ackNonce: string;
    consumedCanvasIds: Set<number>;
    contrastConsumedAtEpochMs: number;
    contrastConsumedAtPerformanceMs: number;
    evidence: CaliforniaCanvasGraphicsStateEvidence;
    finalCompositor: {
      canvases: PreparedFinalCompositorCanvas[];
      captureToken: string;
      mutationObserver: MutationObserver;
      mutations: MutationRecord[];
      paintEnvironment: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot;
      confirmedCanvasIds: Set<number>;
      shadowAttachmentEpoch: number;
    } | null;
    registrations: ContrastCanvasRegistration[];
    rejectedReasons: string[];
    root: HTMLElement;
    status: "pending" | "ready" | "capturing" | "returning" | "rejected";
  };
  type IssuedEvidence = {
    canvases: HTMLCanvasElement[];
    evidence: CaliforniaCanvasGraphicsStateEvidence;
    pixelSnapshots: TerminalPixelSnapshot[];
    registered: boolean;
    root: HTMLElement;
  };
  type SurfaceOutcome = {
    canvas: HTMLCanvasElement;
    canvasId: number | null;
    contextKind: "2d" | "bitmaprenderer" | "unknown" | "webgl" | "webgl2";
    essential: boolean;
    hasExecutableNonTextEvidence: boolean;
    hasExecutableTextEvidence: boolean;
    unsupportedReasons: string[];
  };
  type CanvasAuditApi = {
    contrastSurfaceOutcomes(root: HTMLElement, options?: { canvasSelector?: string }): SurfaceOutcome[];
    signature?(root: HTMLElement, options?: { canvasSelector?: string }): {
      canvasCount: number;
      signature: string;
    };
    version: number;
  };

  const runtimeWindow = window as RuntimeWindow & { __californiaCanvasTextAudit?: CanvasAuditApi };
  // One device-pixel fringe is commonly occupied by Canvas antialiasing or by
  // the paired outline of an authored fill+stroke object. Radius two reaches
  // the immediately adjacent stable background without sampling remote UI.
  const backgroundNeighborRadius = 2;
  if (runtimeWindow.__californiaCanvasGraphicsRuntime?.version === 1) return;
  if (config.version !== 1 || config.externalCompositePaper.toLowerCase() !== "#fbfbf8" ||
      !/^[a-z0-9:_-]{16,128}$/i.test(config.runtimeRunId)) {
    throw new Error("california-canvas-graphics-runtime-config-invalid");
  }
  const retainedShadowRoots = new Set<ShadowRoot>();
  const shadowRootByHost = new WeakMap<Element, ShadowRoot>();
  let shadowAttachmentEpoch = 0;
  const nativeAttachShadow = Element.prototype.attachShadow;
  Object.defineProperty(Element.prototype, "attachShadow", {
    configurable: true,
    value: function(this: Element, init: ShadowRootInit) {
      const root = nativeAttachShadow.call(this, init);
      retainedShadowRoots.add(root);
      shadowRootByHost.set(this, root);
      shadowAttachmentEpoch += 1;
      return root;
    },
    writable: true
  });
  const expectedSites = new Map(config.sites.map((site) => [site.sourceSiteKey, site]));
  const expectedBindings = new Map(config.bindings.map((binding) => [binding.key, binding]));
  const statesByContext = new WeakMap<CanvasRenderingContext2D, CanvasState>();
  const statesByCanvas = new WeakMap<HTMLCanvasElement, CanvasState>();
  const allStates = new Set<CanvasState>();
  const gradientStops = new WeakMap<CanvasGradient, Array<{ color: string; offset: number }>>();
  const animationByBench = new Map<string, AnimationState>();
  const issuedEvidence = new Map<string, IssuedEvidence>();
  const pendingContrastByCanvas = new WeakMap<HTMLCanvasElement, {
    canvasEvidence: CaliforniaCanvasGraphicsCanvasEvidence;
    evidence: CaliforniaCanvasGraphicsStateEvidence;
    registeredAt: number;
    root: HTMLElement;
    state: CanvasState;
    terminalPixels: TerminalPixelSnapshot;
    consumption: ContrastConsumptionState;
  }>();
  const contrastConsumptionByReceipt = new Map<string, ContrastConsumptionState>();
  const rootRuntimeIds = new WeakMap<HTMLElement, number>();
  function randomHex(byteLength: number) {
    const entropy = new Uint8Array(byteLength);
    crypto.getRandomValues(entropy);
    return [...entropy].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const runtimeSessionId = randomHex(16);
  let nextCanvasId = 1;
  let nextReceiptSequence = 1;
  let nextRootRuntimeId = 1;
  let activeInvocation: ActiveInvocation | null = null;
  let patchedCanvasAudit: CanvasAuditApi | null = null;

  const paintEnvironmentKinds: readonly PaintEnvironmentKind[] = [
    "animation",
    "cssom",
    "focus",
    "font",
    "fullscreen",
    "media",
    "pointer",
    "scroll",
    "state",
    "viewport"
  ];
  const paintEnvironmentKindCounts: CaliforniaCanvasGraphicsPaintEnvironmentKindCounts = {
    animation: 0,
    cssom: 0,
    focus: 0,
    font: 0,
    fullscreen: 0,
    media: 0,
    pointer: 0,
    scroll: 0,
    state: 0,
    viewport: 0
  };
  const paintEnvironmentHookIssues: string[] = [];
  const paintEnvironmentRecentMutations: Array<{
    epoch: number;
    kind: PaintEnvironmentKind;
    source: string;
  }> = [];
  const paintEnvironmentMediaQueries = new Map<string, MediaQueryList>();
  const patchedPaintEnvironmentDescriptors = new WeakMap<object, Set<PropertyKey>>();
  const paintEnvironmentAnimationIds = new WeakMap<Animation, number>();
  const paintEnvironmentFontFaceIds = new WeakMap<object, number>();
  const paintEnvironmentViewTransitionIds = new WeakMap<object, number>();
  let paintEnvironmentEpoch = 0;
  let paintEnvironmentEpochOverflowed = false;
  let nextPaintEnvironmentAnimationId = 1;
  let nextPaintEnvironmentFontFaceId = 1;
  let nextPaintEnvironmentViewTransitionId = 1;

  function advancePaintEnvironment(kind: PaintEnvironmentKind, source = "unlabeled") {
    if (!Number.isSafeInteger(paintEnvironmentEpoch) ||
        paintEnvironmentEpoch >= Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(paintEnvironmentKindCounts[kind]) ||
        paintEnvironmentKindCounts[kind] >= Number.MAX_SAFE_INTEGER) {
      paintEnvironmentEpochOverflowed = true;
      return;
    }
    paintEnvironmentEpoch += 1;
    paintEnvironmentKindCounts[kind] += 1;
    paintEnvironmentRecentMutations.push({
      epoch: paintEnvironmentEpoch,
      kind,
      source
    });
    if (paintEnvironmentRecentMutations.length > 64) {
      paintEnvironmentRecentMutations.splice(0, paintEnvironmentRecentMutations.length - 64);
    }
  }

  function descriptorOwner(target: object, property: PropertyKey) {
    let candidate: object | null = target;
    while (candidate) {
      if (Object.prototype.hasOwnProperty.call(candidate, property)) return candidate;
      candidate = Object.getPrototypeOf(candidate) as object | null;
    }
    return null;
  }

  function alreadyPatched(owner: object, property: PropertyKey) {
    let properties = patchedPaintEnvironmentDescriptors.get(owner);
    if (!properties) {
      properties = new Set();
      patchedPaintEnvironmentDescriptors.set(owner, properties);
    }
    if (properties.has(property)) return true;
    properties.add(property);
    return false;
  }

  function patchPaintEnvironmentMethod(
    target: object | undefined,
    property: PropertyKey,
    kind: PaintEnvironmentKind,
    requiredLabel?: string
  ) {
    if (!target) {
      if (requiredLabel) paintEnvironmentHookIssues.push(`${requiredLabel}:target-missing`);
      return;
    }
    const owner = descriptorOwner(target, property);
    const descriptor = owner ? Object.getOwnPropertyDescriptor(owner, property) : undefined;
    if (!owner || !descriptor || typeof descriptor.value !== "function" ||
        descriptor.configurable !== true) {
      if (requiredLabel) paintEnvironmentHookIssues.push(`${requiredLabel}:method-unpatchable`);
      return;
    }
    if (alreadyPatched(owner, property)) return;
    const native = descriptor.value as (this: unknown, ...args: unknown[]) => unknown;
    Object.defineProperty(owner, property, {
      ...descriptor,
      value: function(this: unknown, ...args: unknown[]) {
        advancePaintEnvironment(kind, requiredLabel ?? String(property));
        return Reflect.apply(native, this, args);
      }
    });
  }

  function patchPaintEnvironmentSetter(
    target: object | undefined,
    property: PropertyKey,
    kind: PaintEnvironmentKind,
    requiredLabel?: string
  ) {
    if (!target) {
      if (requiredLabel) paintEnvironmentHookIssues.push(`${requiredLabel}:target-missing`);
      return;
    }
    const owner = descriptorOwner(target, property);
    const descriptor = owner ? Object.getOwnPropertyDescriptor(owner, property) : undefined;
    if (!owner || !descriptor || typeof descriptor.set !== "function" ||
        descriptor.configurable !== true) {
      if (requiredLabel) paintEnvironmentHookIssues.push(`${requiredLabel}:setter-unpatchable`);
      return;
    }
    if (alreadyPatched(owner, property)) return;
    const nativeSetter = descriptor.set;
    Object.defineProperty(owner, property, {
      ...descriptor,
      set: function(this: unknown, value: unknown) {
        advancePaintEnvironment(kind, requiredLabel ?? String(property));
        Reflect.apply(nativeSetter, this, [value]);
      }
    });
  }

  function cssPropertyToCamelCase(property: string) {
    const normalized = property.startsWith("-webkit-")
      ? `webkit-${property.slice("-webkit-".length)}`
      : property;
    return normalized.replace(/-([a-z])/g, (_match, character: string) =>
      character.toUpperCase()
    );
  }

  const nativeCssGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
  const nativeCssSetProperty = CSSStyleDeclaration.prototype.setProperty;
  function defineTrackedCssProperty(jsProperty: string, cssProperty: string) {
    if (!jsProperty || jsProperty.startsWith("--")) return;
    const existingOwner = descriptorOwner(CSSStyleDeclaration.prototype, jsProperty);
    if (existingOwner) {
      const descriptor = Object.getOwnPropertyDescriptor(existingOwner, jsProperty);
      if (typeof descriptor?.set === "function") {
        patchPaintEnvironmentSetter(
          CSSStyleDeclaration.prototype,
          jsProperty,
          "cssom",
          cssProperty === "background" ? "CSSStyleDeclaration.background" : undefined
        );
      }
      return;
    }
    try {
      Object.defineProperty(CSSStyleDeclaration.prototype, jsProperty, {
        configurable: true,
        enumerable: true,
        get: function(this: CSSStyleDeclaration) {
          return Reflect.apply(nativeCssGetPropertyValue, this, [cssProperty]) as string;
        },
        set: function(this: CSSStyleDeclaration, value: unknown) {
          advancePaintEnvironment("cssom", `CSSStyleDeclaration.${cssProperty}`);
          Reflect.apply(nativeCssSetProperty, this, [cssProperty, value]);
        }
      });
    } catch {
      paintEnvironmentHookIssues.push(`css-style-property:${jsProperty}:unpatchable`);
    }
  }

  function installComputedCssPropertyHooks() {
    if (!document.documentElement) return;
    const computed = getComputedStyle(document.documentElement);
    for (let index = 0; index < computed.length; index += 1) {
      const cssProperty = computed.item(index);
      if (!cssProperty) continue;
      defineTrackedCssProperty(cssProperty, cssProperty);
      defineTrackedCssProperty(cssPropertyToCamelCase(cssProperty), cssProperty);
    }
  }

  function trackPaintEnvironmentEvent(
    target: EventTarget | null | undefined,
    eventName: string,
    kind: PaintEnvironmentKind
  ) {
    target?.addEventListener(eventName, () => advancePaintEnvironment(kind, eventName), {
      capture: true,
      passive: true
    });
  }

  function patchEveryOwnSetter(
    target: object | undefined,
    kind: PaintEnvironmentKind,
    label: string
  ) {
    if (!target) return;
    for (const property of Reflect.ownKeys(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      if (typeof descriptor?.set === "function") {
        patchPaintEnvironmentSetter(target, property, kind, `${label}.${String(property)}`);
      }
    }
  }

  function installPaintEnvironmentHooks() {
    for (const method of ["setProperty", "removeProperty"] as const) {
      patchPaintEnvironmentMethod(
        CSSStyleDeclaration.prototype,
        method,
        "cssom",
        `CSSStyleDeclaration.${method}`
      );
    }
    patchPaintEnvironmentSetter(
      CSSStyleDeclaration.prototype,
      "cssText",
      "cssom",
      "CSSStyleDeclaration.cssText"
    );
    const explicitCssProperties = [
      "background",
      "background-color",
      "background-image",
      "border",
      "border-radius",
      "box-shadow",
      "clip",
      "clip-path",
      "color",
      "content",
      "display",
      "filter",
      "font",
      "height",
      "inset",
      "left",
      "mask",
      "mask-image",
      "mix-blend-mode",
      "opacity",
      "overflow",
      "position",
      "right",
      "stroke",
      "stroke-width",
      "text-shadow",
      "top",
      "transform",
      "visibility",
      "width",
      "z-index",
      "-webkit-mask-image",
      "-webkit-text-fill-color"
    ];
    for (const cssProperty of explicitCssProperties) {
      defineTrackedCssProperty(cssProperty, cssProperty);
      defineTrackedCssProperty(cssPropertyToCamelCase(cssProperty), cssProperty);
    }
    for (const method of ["insertRule", "deleteRule", "replace", "replaceSync"] as const) {
      patchPaintEnvironmentMethod(
        CSSStyleSheet.prototype,
        method,
        "cssom",
        `CSSStyleSheet.${method}`
      );
    }
    if (typeof CSSGroupingRule !== "undefined") {
      for (const method of ["insertRule", "deleteRule"] as const) {
        patchPaintEnvironmentMethod(
          CSSGroupingRule.prototype,
          method,
          "cssom",
          `CSSGroupingRule.${method}`
        );
      }
    } else {
      paintEnvironmentHookIssues.push("CSSGroupingRule:target-missing");
    }
    if (typeof CSSKeyframesRule !== "undefined") {
      for (const method of ["appendRule", "deleteRule"] as const) {
        patchPaintEnvironmentMethod(
          CSSKeyframesRule.prototype,
          method,
          "cssom",
          `CSSKeyframesRule.${method}`
        );
      }
    } else {
      paintEnvironmentHookIssues.push("CSSKeyframesRule:target-missing");
    }
    patchPaintEnvironmentSetter(
      CSSStyleSheet.prototype,
      "disabled",
      "cssom",
      "StyleSheet.disabled"
    );
    patchPaintEnvironmentSetter(
      Document.prototype,
      "adoptedStyleSheets",
      "cssom",
      "Document.adoptedStyleSheets"
    );
    patchPaintEnvironmentSetter(
      ShadowRoot.prototype,
      "adoptedStyleSheets",
      "cssom",
      "ShadowRoot.adoptedStyleSheets"
    );
    const cssRuleConstructorNames = [
      "CSSConditionRule",
      "CSSContainerRule",
      "CSSFontFaceRule",
      "CSSGroupingRule",
      "CSSImportRule",
      "CSSKeyframeRule",
      "CSSKeyframesRule",
      "CSSLayerBlockRule",
      "CSSLayerStatementRule",
      "CSSMediaRule",
      "CSSNamespaceRule",
      "CSSPageRule",
      "CSSPropertyRule",
      "CSSScopeRule",
      "CSSStartingStyleRule",
      "CSSStyleRule",
      "CSSSupportsRule",
      "MediaList"
    ];
    const runtimeGlobals = globalThis as unknown as Record<string, unknown>;
    for (const constructorName of cssRuleConstructorNames) {
      const constructor = runtimeGlobals[constructorName] as
        { prototype?: object } | undefined;
      patchEveryOwnSetter(constructor?.prototype, "cssom", constructorName);
    }
    if (typeof MediaList !== "undefined") {
      for (const method of ["appendMedium", "deleteMedium"] as const) {
        patchPaintEnvironmentMethod(
          MediaList.prototype,
          method,
          "cssom",
          `MediaList.${method}`
        );
      }
    }
    patchEveryOwnSetter(HTMLStyleElement.prototype, "cssom", "HTMLStyleElement");
    patchEveryOwnSetter(HTMLLinkElement.prototype, "cssom", "HTMLLinkElement");
    const stylePropertyMap = runtimeGlobals.StylePropertyMap as
      { prototype?: object } | undefined;
    if (stylePropertyMap?.prototype) {
      for (const method of ["clear", "delete", "set"] as const) {
        patchPaintEnvironmentMethod(
          stylePropertyMap.prototype,
          method,
          "cssom",
          `StylePropertyMap.${method}`
        );
      }
    }

    for (const method of ["scroll", "scrollBy", "scrollTo"] as const) {
      patchPaintEnvironmentMethod(window, method, "scroll", `Window.${method}`);
      patchPaintEnvironmentMethod(Element.prototype, method, "scroll");
    }
    for (const property of ["scrollLeft", "scrollTop"] as const) {
      patchPaintEnvironmentSetter(Element.prototype, property, "scroll", `Element.${property}`);
    }
    for (const method of ["focus", "blur"] as const) {
      patchPaintEnvironmentMethod(
        HTMLElement.prototype,
        method,
        "focus",
        `HTMLElement.${method}`
      );
      if (typeof SVGElement !== "undefined") {
        patchPaintEnvironmentMethod(SVGElement.prototype, method, "focus");
      }
    }
    patchPaintEnvironmentMethod(window, "focus", "focus");
    patchPaintEnvironmentMethod(window, "blur", "focus");

    patchPaintEnvironmentMethod(
      Element.prototype,
      "requestFullscreen",
      "fullscreen",
      "Element.requestFullscreen"
    );
    patchPaintEnvironmentMethod(
      Document.prototype,
      "exitFullscreen",
      "fullscreen",
      "Document.exitFullscreen"
    );

    for (const property of ["currentTime", "startTime", "playbackRate"] as const) {
      patchPaintEnvironmentSetter(
        Animation.prototype,
        property,
        "animation",
        `Animation.${property}`
      );
    }
    for (const method of [
      "cancel",
      "finish",
      "pause",
      "play",
      "reverse",
      "updatePlaybackRate"
    ] as const) {
      patchPaintEnvironmentMethod(
        Animation.prototype,
        method,
        "animation",
        `Animation.${method}`
      );
    }
    if (typeof document.startViewTransition === "function") {
      patchPaintEnvironmentMethod(
        Document.prototype,
        "startViewTransition",
        "animation",
        "Document.startViewTransition"
      );
    }
    const viewTransition = runtimeGlobals.ViewTransition as
      { prototype?: object } | undefined;
    if (viewTransition?.prototype) {
      for (const method of ["skipTransition", "waitUntil"] as const) {
        patchPaintEnvironmentMethod(
          viewTransition.prototype,
          method,
          "animation",
          `ViewTransition.${method}`
        );
      }
    }
    const viewTransitionTypeSet = runtimeGlobals.ViewTransitionTypeSet as
      { prototype?: object } | undefined;
    if (viewTransitionTypeSet?.prototype) {
      for (const method of ["add", "clear", "delete"] as const) {
        patchPaintEnvironmentMethod(
          viewTransitionTypeSet.prototype,
          method,
          "animation",
          `ViewTransitionTypeSet.${method}`
        );
      }
    }

    if (typeof FontFace === "undefined") {
      paintEnvironmentHookIssues.push("FontFace:target-missing");
    } else {
      patchEveryOwnSetter(FontFace.prototype, "font", "FontFace");
      patchPaintEnvironmentMethod(FontFace.prototype, "load", "font", "FontFace.load");
    }
    const fontFaceSet = runtimeGlobals.FontFaceSet as { prototype?: object } | undefined;
    if (!fontFaceSet?.prototype) {
      paintEnvironmentHookIssues.push("FontFaceSet:target-missing");
    } else {
      patchEveryOwnSetter(fontFaceSet.prototype, "font", "FontFaceSet");
      for (const method of ["add", "clear", "delete", "load"] as const) {
        patchPaintEnvironmentMethod(
          fontFaceSet.prototype,
          method,
          "font",
          `FontFaceSet.${method}`
        );
      }
    }
    for (const eventName of ["loading", "loadingdone", "loadingerror"] as const) {
      trackPaintEnvironmentEvent(document.fonts, eventName, "font");
    }

    for (const [prototype, properties, label] of [
      [HTMLInputElement.prototype, [
        "checked",
        "indeterminate",
        "selectionDirection",
        "selectionEnd",
        "selectionStart",
        "value",
        "valueAsDate",
        "valueAsNumber"
      ], "HTMLInputElement"],
      [HTMLTextAreaElement.prototype, [
        "selectionDirection",
        "selectionEnd",
        "selectionStart",
        "value"
      ], "HTMLTextAreaElement"],
      [HTMLSelectElement.prototype, ["selectedIndex", "value"], "HTMLSelectElement"],
      [HTMLOptionElement.prototype, ["selected"], "HTMLOptionElement"]
    ] as const) {
      for (const property of properties) {
        patchPaintEnvironmentSetter(prototype, property, "state", `${label}.${property}`);
      }
    }
    for (const [prototype, methods, label] of [
      [HTMLInputElement.prototype,
        ["select", "setRangeText", "setSelectionRange", "stepDown", "stepUp"],
        "HTMLInputElement"],
      [HTMLTextAreaElement.prototype,
        ["select", "setRangeText", "setSelectionRange"],
        "HTMLTextAreaElement"],
      [Selection.prototype, [
        "addRange",
        "collapse",
        "collapseToEnd",
        "collapseToStart",
        "deleteFromDocument",
        "empty",
        "extend",
        "modify",
        "removeAllRanges",
        "removeRange",
        "selectAllChildren",
        "setBaseAndExtent"
      ], "Selection"],
      [History.prototype, ["back", "forward", "go", "pushState", "replaceState"], "History"]
    ] as const) {
      for (const method of methods) {
        patchPaintEnvironmentMethod(prototype, method, "state", `${label}.${method}`);
      }
    }
    if (typeof HTMLDialogElement !== "undefined") {
      for (const method of ["close", "show", "showModal"] as const) {
        patchPaintEnvironmentMethod(
          HTMLDialogElement.prototype,
          method,
          "state",
          `HTMLDialogElement.${method}`
        );
      }
    }
    for (const method of ["hidePopover", "showPopover", "togglePopover"] as const) {
      patchPaintEnvironmentMethod(HTMLElement.prototype, method, "state");
    }

    for (const eventName of ["scroll", "scrollend"] as const) {
      trackPaintEnvironmentEvent(window, eventName, "scroll");
      trackPaintEnvironmentEvent(document, eventName, "scroll");
      trackPaintEnvironmentEvent(visualViewport, eventName, "scroll");
    }
    trackPaintEnvironmentEvent(window, "resize", "viewport");
    trackPaintEnvironmentEvent(visualViewport, "resize", "viewport");
    for (const eventName of ["focus", "blur", "focusin", "focusout"] as const) {
      trackPaintEnvironmentEvent(window, eventName, "focus");
      trackPaintEnvironmentEvent(document, eventName, "focus");
    }
    for (const eventName of ["fullscreenchange", "fullscreenerror"] as const) {
      trackPaintEnvironmentEvent(document, eventName, "fullscreen");
    }
    for (const eventName of [
      "animationcancel",
      "animationend",
      "animationiteration",
      "animationstart",
      "transitioncancel",
      "transitionend",
      "transitionrun",
      "transitionstart"
    ] as const) {
      trackPaintEnvironmentEvent(document, eventName, "animation");
    }
    for (const eventName of [
      "mousedown",
      "mouseenter",
      "mouseleave",
      "mousemove",
      "mouseout",
      "mouseover",
      "mouseup",
      "pointercancel",
      "pointerdown",
      "pointerenter",
      "pointerleave",
      "pointermove",
      "pointerout",
      "pointerover",
      "pointerup"
    ] as const) {
      trackPaintEnvironmentEvent(document, eventName, "pointer");
    }
    for (const eventName of [
      "beforetoggle",
      "hashchange",
      "pagehide",
      "pageshow",
      "popstate",
      "selectionchange",
      "toggle",
      "visibilitychange"
    ] as const) {
      trackPaintEnvironmentEvent(window, eventName, "state");
      trackPaintEnvironmentEvent(document, eventName, "state");
    }
    installComputedCssPropertyHooks();
    addEventListener("DOMContentLoaded", installComputedCssPropertyHooks, { once: true });
  }

  installPaintEnvironmentHooks();

  const contextPrototype = CanvasRenderingContext2D.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  const nativeMethods = new Map<string, (...args: unknown[]) => unknown>();
  function nativeMethod(name: string) {
    const method = nativeMethods.get(name) ?? contextPrototype[name];
    if (typeof method !== "function") throw new Error(`canvas-native-method-missing:${name}`);
    return method;
  }
  function patchContextMethod(
    name: string,
    handler: (
      context: CanvasRenderingContext2D,
      original: (...args: unknown[]) => unknown,
      args: unknown[]
    ) => unknown
  ) {
    const original = contextPrototype[name];
    if (typeof original !== "function") return;
    nativeMethods.set(name, original);
    Object.defineProperty(contextPrototype, name, {
      configurable: true,
      value: function(this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (this.canvas.isConnected) {
          advancePaintEnvironment("state", `CanvasRenderingContext2D.${name}`);
        }
        return handler(this, original, args);
      },
      writable: true
    });
  }

  function animationState(benchId: string) {
    let state = animationByBench.get(benchId);
    if (!state) {
      state = {
        activeEpoch: 0,
        lastActivityAt: performance.now(),
        latestScheduledEpoch: 0,
        latestSettledEpoch: 0,
        pending: new Map()
      };
      animationByBench.set(benchId, state);
    }
    return state;
  }

  function cloneBounds(bounds: Bounds | null) {
    return bounds ? { ...bounds } : null;
  }
  function unionBounds(left: Bounds | null, right: Bounds | null): Bounds | null {
    if (!left) return cloneBounds(right);
    if (!right) return cloneBounds(left);
    return {
      bottom: Math.max(left.bottom, right.bottom),
      left: Math.min(left.left, right.left),
      right: Math.max(left.right, right.right),
      top: Math.min(left.top, right.top)
    };
  }
  function intersectBounds(left: Bounds | null, right: Bounds | null): Bounds | null {
    if (!left) return cloneBounds(right);
    if (!right) return cloneBounds(left);
    const intersection = {
      bottom: Math.min(left.bottom, right.bottom),
      left: Math.max(left.left, right.left),
      right: Math.min(left.right, right.right),
      top: Math.max(left.top, right.top)
    };
    return intersection.right > intersection.left && intersection.bottom > intersection.top
      ? intersection
      : null;
  }
  function expandBounds(bounds: Bounds | null, amount: number, offsetX = 0, offsetY = 0) {
    if (!bounds) return null;
    return {
      bottom: bounds.bottom + amount + Math.max(0, offsetY),
      left: bounds.left - amount + Math.min(0, offsetX),
      right: bounds.right + amount + Math.max(0, offsetX),
      top: bounds.top - amount + Math.min(0, offsetY)
    };
  }
  function transformedPoint(context: CanvasRenderingContext2D, x: number, y: number) {
    const matrix = context.getTransform();
    return {
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f
    };
  }
  function pointBounds(context: CanvasRenderingContext2D, points: Array<[number, number]>) {
    const transformed = points.map(([x, y]) => transformedPoint(context, x, y));
    if (transformed.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
    return {
      bottom: Math.max(...transformed.map((point) => point.y)),
      left: Math.min(...transformed.map((point) => point.x)),
      right: Math.max(...transformed.map((point) => point.x)),
      top: Math.min(...transformed.map((point) => point.y))
    };
  }
  function rectangleBounds(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    return pointBounds(context, [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height]
    ]);
  }
  function radialBounds(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number
  ) {
    const matrix = context.getTransform();
    const center = transformedPoint(context, x, y);
    const extentX = Math.abs(radiusX) * Math.hypot(matrix.a, matrix.b) +
      Math.abs(radiusY) * Math.hypot(matrix.c, matrix.d);
    const extentY = Math.abs(radiusX) * Math.hypot(matrix.b, matrix.a) +
      Math.abs(radiusY) * Math.hypot(matrix.d, matrix.c);
    return {
      bottom: center.y + extentY,
      left: center.x - extentX,
      right: center.x + extentX,
      top: center.y - extentY
    };
  }
  function axisAlignedTransformCoversFullCanvas(
    context: CanvasRenderingContext2D,
    bounds: Bounds | null
  ) {
    if (!bounds) return false;
    const matrix = context.getTransform();
    return Math.abs(matrix.b) < 1e-9 && Math.abs(matrix.c) < 1e-9 &&
      matrix.a > 0 && matrix.d > 0 && Math.abs(matrix.e) < 1e-9 && Math.abs(matrix.f) < 1e-9 &&
      bounds.left <= 0.5 && bounds.top <= 0.5 &&
      bounds.right >= context.canvas.width - 0.5 &&
      bounds.bottom >= context.canvas.height - 0.5;
  }
  function addPathBounds(
    context: CanvasRenderingContext2D,
    bounds: Bounds | null,
    exactFullCanvasRect = false
  ) {
    const state = statesByContext.get(context);
    if (!state) return;
    state.pathOperationCount += 1;
    state.pathCanProveFullCanvasRect = state.pathOperationCount === 1 && exactFullCanvasRect;
    state.pathBounds = unionBounds(state.pathBounds, bounds);
  }

  patchContextMethod("beginPath", (context, original, args) => {
    const state = statesByContext.get(context);
    if (state) {
      state.pathBounds = null;
      state.pathCanProveFullCanvasRect = false;
      state.pathOperationCount = 0;
    }
    return original.apply(context, args);
  });
  for (const name of ["moveTo", "lineTo"] as const) {
    patchContextMethod(name, (context, original, args) => {
      addPathBounds(context, pointBounds(context, [[Number(args[0]), Number(args[1])]]));
      return original.apply(context, args);
    });
  }
  patchContextMethod("rect", (context, original, args) => {
    const bounds = rectangleBounds(
      context,
      Number(args[0]),
      Number(args[1]),
      Number(args[2]),
      Number(args[3])
    );
    addPathBounds(context, bounds, axisAlignedTransformCoversFullCanvas(context, bounds));
    return original.apply(context, args);
  });
  patchContextMethod("roundRect", (context, original, args) => {
    addPathBounds(context, rectangleBounds(
      context,
      Number(args[0]),
      Number(args[1]),
      Number(args[2]),
      Number(args[3])
    ));
    return original.apply(context, args);
  });
  patchContextMethod("arc", (context, original, args) => {
    addPathBounds(context, radialBounds(
      context,
      Number(args[0]),
      Number(args[1]),
      Number(args[2]),
      Number(args[2])
    ));
    return original.apply(context, args);
  });
  patchContextMethod("ellipse", (context, original, args) => {
    addPathBounds(context, radialBounds(
      context,
      Number(args[0]),
      Number(args[1]),
      Number(args[2]),
      Number(args[3])
    ));
    return original.apply(context, args);
  });
  patchContextMethod("arcTo", (context, original, args) => {
    const radius = Math.abs(Number(args[4]));
    addPathBounds(context, unionBounds(
      pointBounds(context, [
        [Number(args[0]), Number(args[1])],
        [Number(args[2]), Number(args[3])]
      ]),
      radialBounds(context, Number(args[0]), Number(args[1]), radius, radius)
    ));
    return original.apply(context, args);
  });
  patchContextMethod("quadraticCurveTo", (context, original, args) => {
    addPathBounds(context, pointBounds(context, [
      [Number(args[0]), Number(args[1])],
      [Number(args[2]), Number(args[3])]
    ]));
    return original.apply(context, args);
  });
  patchContextMethod("bezierCurveTo", (context, original, args) => {
    addPathBounds(context, pointBounds(context, [
      [Number(args[0]), Number(args[1])],
      [Number(args[2]), Number(args[3])],
      [Number(args[4]), Number(args[5])]
    ]));
    return original.apply(context, args);
  });
  patchContextMethod("save", (context, original, args) => {
    const state = statesByContext.get(context);
    if (state) state.stack.push({
      clipBounds: cloneBounds(state.clipBounds),
      clipCoverage: state.clipCoverage
    });
    return original.apply(context, args);
  });
  patchContextMethod("restore", (context, original, args) => {
    const result = original.apply(context, args);
    const state = statesByContext.get(context);
    if (state) {
      const saved = state.stack.pop();
      state.clipBounds = saved?.clipBounds ?? null;
      state.clipCoverage = saved?.clipCoverage ?? "none";
    }
    return result;
  });
  patchContextMethod("clip", (context, original, args) => {
    const state = statesByContext.get(context);
    if (state) {
      const hasUntrackedPathArgument = args.length > 0 && typeof args[0] !== "string";
      if (hasUntrackedPathArgument) {
        state.unsupportedReasons.push("unsupported-runtime-Path2D-clip");
        state.clipCoverage = "partial-or-unknown";
      }
      if (hasUntrackedPathArgument) {
        // A Path2D argument is independent of the recorder's current path.
      } else if (!state.pathBounds) {
        state.unsupportedReasons.push("clip-path-bounds-unresolved");
        state.clipCoverage = "partial-or-unknown";
      } else {
        state.clipBounds = intersectBounds(state.clipBounds, state.pathBounds);
        state.clipCoverage = state.clipCoverage !== "partial-or-unknown" &&
          state.pathCanProveFullCanvasRect
          ? "full"
          : "partial-or-unknown";
      }
    }
    return original.apply(context, args);
  });

  for (const name of ["createLinearGradient", "createRadialGradient", "createConicGradient"]) {
    patchContextMethod(name, (context, original, args) => {
      const gradient = original.apply(context, args) as CanvasGradient;
      if (statesByContext.has(context) && gradient) gradientStops.set(gradient, []);
      return gradient;
    });
  }
  const gradientPrototype = CanvasGradient.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const nativeAddColorStop = gradientPrototype.addColorStop;
  if (typeof nativeAddColorStop === "function") {
    Object.defineProperty(gradientPrototype, "addColorStop", {
      configurable: true,
      value: function(this: CanvasGradient, offset: number, color: string) {
        const stops = gradientStops.get(this);
        if (stops) stops.push({ color: String(color), offset: Number(offset) });
        return nativeAddColorStop.call(this, offset, color);
      },
      writable: true
    });
  }

  function ensureWriterMap(state: CanvasState) {
    const length = state.canvas.width * state.canvas.height;
    if (state.writerMap.length !== length) {
      if (state.writerMap.length > 0 || state.sequence > 0) {
        state.unsupportedReasons.push("canvas-backing-store-resized-after-registration");
      }
      state.writerMap = new Uint32Array(length);
      state.writerSiteBySequence.clear();
      state.sequence = 0;
      state.siteAggregates.clear();
      state.qaReadbackCount = 0;
    }
  }
  function readPixelsForQa(
    state: CanvasState,
    left: number,
    top: number,
    width: number,
    height: number
  ) {
    // Deliberately bypass the product-facing patched method. This is QA-only
    // readback from the exact already-acquired native 2-D context and cannot
    // create or advance an authored source-site paint revision.
    state.qaReadbackCount += 1;
    return nativeMethod("getImageData").call(
      state.context,
      left,
      top,
      width,
      height
    ) as ImageData;
  }
  function captureTerminalPixelSnapshot(state: CanvasState): TerminalPixelSnapshot {
    ensureWriterMap(state);
    const sourcePaintRevision = state.sequence;
    let pixels = new Uint8ClampedArray();
    try {
      pixels = new Uint8ClampedArray(readPixelsForQa(
        state,
        0,
        0,
        state.canvas.width,
        state.canvas.height
      ).data);
    } catch (error) {
      state.unsupportedReasons.push(`terminal-raster-unreadable:${String(error)}`);
    }
    if (state.sequence !== sourcePaintRevision) {
      state.unsupportedReasons.push("qa-readback-mutated-source-paint-revision");
    }
    return {
      backingHeight: state.canvas.height,
      backingWidth: state.canvas.width,
      canvas: state.canvas,
      context: state.context,
      pixels,
      sourcePaintRevision
    };
  }
  function terminalPixelSnapshotMatches(snapshot: TerminalPixelSnapshot) {
    if (snapshot.canvas.width !== snapshot.backingWidth ||
        snapshot.canvas.height !== snapshot.backingHeight ||
        snapshot.pixels.length !== snapshot.backingWidth * snapshot.backingHeight * 4) {
      return false;
    }
    try {
      const current = (nativeMethod("getImageData").call(
        snapshot.context,
        0,
        0,
        snapshot.backingWidth,
        snapshot.backingHeight
      ) as ImageData).data;
      if (current.length !== snapshot.pixels.length) return false;
      for (let index = 0; index < current.length; index += 1) {
        if (current[index] !== snapshot.pixels[index]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  function clampCaptureBounds(state: CanvasState, bounds: Bounds | null) {
    if (!bounds) return null;
    const left = Math.max(0, Math.floor(bounds.left));
    const top = Math.max(0, Math.floor(bounds.top));
    const right = Math.min(state.canvas.width, Math.ceil(bounds.right));
    const bottom = Math.min(state.canvas.height, Math.ceil(bounds.bottom));
    return right > left && bottom > top
      ? { bottom, left, right, top }
      : null;
  }
  function paintBounds(
    context: CanvasRenderingContext2D,
    operation: CaliforniaCanvasTerminalOperation,
    args: unknown[]
  ) {
    const state = statesByContext.get(context);
    if (!state) return null;
    let bounds = operation === "fillRect" || operation === "strokeRect"
      ? rectangleBounds(context, Number(args[0]), Number(args[1]), Number(args[2]), Number(args[3]))
      : cloneBounds(state.pathBounds);
    const matrix = context.getTransform();
    const scale = Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d), 1);
    if (operation === "stroke" || operation === "strokeRect") {
      bounds = expandBounds(bounds, Math.max(0.5, context.lineWidth * scale / 2));
    }
    const shadowColor = parseCssColor(context.shadowColor);
    const shadowVisible = (
      context.shadowBlur > 0 || context.shadowOffsetX !== 0 || context.shadowOffsetY !== 0
    ) && (!shadowColor || shadowColor[3] > 0);
    if (shadowVisible) {
      bounds = expandBounds(
        bounds,
        context.shadowBlur * 2 * scale,
        context.shadowOffsetX * scale,
        context.shadowOffsetY * scale
      );
    }
    return clampCaptureBounds(state, intersectBounds(bounds, state.clipBounds));
  }
  function rgbaAt(data: Uint8ClampedArray, offset: number): Rgba {
    return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
  }
  function equalRgba(left: Rgba, right: Rgba) {
    return left[0] === right[0] && left[1] === right[1] &&
      left[2] === right[2] && left[3] === right[3];
  }
  function recordTerminalPaint(
    context: CanvasRenderingContext2D,
    original: (...args: unknown[]) => unknown,
    args: unknown[],
    operation: CaliforniaCanvasTerminalOperation
  ) {
    const state = statesByContext.get(context);
    if (!state) return original.apply(context, args);
    const invocation = activeInvocation;
    if (!invocation || invocation.context !== context || invocation.expected.operation !== operation) {
      state.unsupportedReasons.push(`uninstrumented-or-misattributed-terminal:${operation}`);
      return original.apply(context, args);
    }
    invocation.observedCount += 1;
    if (context.globalCompositeOperation !== "source-over") {
      state.unsupportedReasons.push(`unsupported-composite:${context.globalCompositeOperation}`);
    }
    if (context.filter !== "none") state.unsupportedReasons.push(`unsupported-filter:${context.filter}`);
    const paintStyle = operation.startsWith("fill") ? context.fillStyle : context.strokeStyle;
    let paintServerKind = "solid";
    if (paintStyle instanceof CanvasGradient) {
      paintServerKind = `gradient:${gradientStops.get(paintStyle)?.length ?? 0}-stops`;
      if (!gradientStops.has(paintStyle)) state.unsupportedReasons.push("untracked-gradient-paint-server");
    } else if (paintStyle instanceof CanvasPattern) {
      paintServerKind = "pattern";
      state.unsupportedReasons.push("unsupported-pattern-paint-server");
    }
    const bounds = paintBounds(context, operation, args);
    if (!bounds) {
      state.unsupportedReasons.push(`paint-bounds-unresolved:${invocation.expected.sourceSiteKey}`);
      return original.apply(context, args);
    }
    ensureWriterMap(state);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    let before: ImageData | null = null;
    try {
      before = readPixelsForQa(state, bounds.left, bounds.top, width, height);
    } catch (error) {
      state.unsupportedReasons.push(`prepaint-pixels-unreadable:${String(error)}`);
    }
    const result = original.apply(context, args);
    let after: ImageData | null = null;
    try {
      after = readPixelsForQa(state, bounds.left, bounds.top, width, height);
    } catch (error) {
      state.unsupportedReasons.push(`postpaint-pixels-unreadable:${String(error)}`);
    }
    state.sequence += 1;
    const sequence = state.sequence;
    state.writerSiteBySequence.set(sequence, invocation.expected.sourceSiteKey);
    const benchId = invocation.expected.contextKey.split("/")[0];
    const rafEpoch = animationState(benchId).activeEpoch;
    const existing = state.siteAggregates.get(invocation.expected.sourceSiteKey);
    const aggregate: SiteAggregate = existing ?? {
      changedPixelCount: 0,
      clearEpoch: state.clearEpoch,
      invocationCount: 0,
      latestRafEpoch: 0,
      operation,
      paintServerKinds: new Set(),
      role: invocation.expected.role,
      samples: [],
      sourceSiteKey: invocation.expected.sourceSiteKey
    };
    aggregate.invocationCount += 1;
    aggregate.latestRafEpoch = Math.max(aggregate.latestRafEpoch, rafEpoch);
    aggregate.paintServerKinds.add(paintServerKind);
    state.latestPaintRafEpoch = Math.max(state.latestPaintRafEpoch, rafEpoch);
    if (before && after) {
      const first: PixelSample[] = [];
      const last: PixelSample[] = [];
      const distributed: PixelSample[] = [];
      const stride = Math.max(1, Math.floor((width * height) / 512));
      for (let localIndex = 0; localIndex < width * height; localIndex += 1) {
        const offset = localIndex * 4;
        const pre = rgbaAt(before.data, offset);
        const post = rgbaAt(after.data, offset);
        if (equalRgba(pre, post)) continue;
        const x = bounds.left + (localIndex % width);
        const y = bounds.top + Math.floor(localIndex / width);
        const index = y * state.canvas.width + x;
        state.writerMap[index] = sequence;
        aggregate.changedPixelCount += 1;
        const sample = { index, post, pre, sequence, x, y };
        if (first.length < 256) first.push(sample);
        if (last.length < 256) last.push(sample);
        else last[aggregate.changedPixelCount % 256] = sample;
        if (localIndex % stride === 0 && distributed.length < 512) distributed.push(sample);
      }
      const incoming = [...first, ...distributed, ...last];
      const seenCoordinates = new Set(aggregate.samples.map((sample) =>
        `${sample.sequence}:${sample.index}`
      ));
      for (const sample of incoming) {
        if (aggregate.samples.length >= 32_768) break;
        const key = `${sample.sequence}:${sample.index}`;
        if (!seenCoordinates.has(key)) {
          seenCoordinates.add(key);
          aggregate.samples.push(sample);
        }
      }
    }
    state.siteAggregates.set(invocation.expected.sourceSiteKey, aggregate);
    state.lastActivityAt = performance.now();
    return result;
  }

  for (const operation of ["fill", "stroke", "fillRect", "strokeRect"] as const) {
    patchContextMethod(operation, (context, original, args) =>
      recordTerminalPaint(context, original, args, operation)
    );
  }
  patchContextMethod("clearRect", (context, original, args) => {
    const result = original.apply(context, args);
    const state = statesByContext.get(context);
    if (!state) return result;
    ensureWriterMap(state);
    const bounds = rectangleBounds(
      context,
      Number(args[0]),
      Number(args[1]),
      Number(args[2]),
      Number(args[3])
    );
    const full = axisAlignedTransformCoversFullCanvas(context, bounds) &&
      (state.clipCoverage === "none" || state.clipCoverage === "full");
    state.clearEpoch += 1;
    state.latestClearWasFull = full;
    state.siteAggregates.clear();
    state.writerMap.fill(0);
    state.writerSiteBySequence.clear();
    state.sequence = 0;
    state.qaReadbackCount = 0;
    state.latestPaintRafEpoch = 0;
    state.lastActivityAt = performance.now();
    if (!full) state.unsupportedReasons.push("latest-clear-epoch-not-full-canvas");
    return result;
  });
  for (const name of [
    "createImageData",
    "createPattern",
    "drawFocusIfNeeded",
    "drawImage",
    "getImageData",
    "isPointInPath",
    "isPointInStroke",
    "putImageData",
    "scrollPathIntoView"
  ]) {
    patchContextMethod(name, (context, original, args) => {
      const state = statesByContext.get(context);
      if (state) state.unsupportedReasons.push(`unsupported-runtime-api:${name}`);
      return original.apply(context, args);
    });
  }

  function parseCssColor(value: string): Rgba | null {
    const normalized = value.trim().toLowerCase();
    const rgb = normalized.match(/^rgba?\(\s*([0-9.]+)[, ]+\s*([0-9.]+)[, ]+\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/);
    if (rgb) {
      return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]),
        Math.round((rgb[4] == null ? 1 : Number(rgb[4])) * 255)];
    }
    if (/^#[0-9a-f]{6}$/.test(normalized)) {
      return [
        Number.parseInt(normalized.slice(1, 3), 16),
        Number.parseInt(normalized.slice(3, 5), 16),
        Number.parseInt(normalized.slice(5, 7), 16),
        255
      ];
    }
    return null;
  }
  const paperRgba: Rgba = [251, 251, 248, 255];
  function compositeOnPaper(raw: Rgba): Rgba {
    const alpha = raw[3] / 255;
    return [
      Math.round(raw[0] * alpha + paperRgba[0] * (1 - alpha)),
      Math.round(raw[1] * alpha + paperRgba[1] * (1 - alpha)),
      Math.round(raw[2] * alpha + paperRgba[2] * (1 - alpha)),
      255
    ];
  }
  function linearChannel(value: number) {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }
  function luminance(color: Rgba) {
    return 0.2126 * linearChannel(color[0]) +
      0.7152 * linearChannel(color[1]) +
      0.0722 * linearChannel(color[2]);
  }
  function contrastRatio(left: Rgba, right: Rgba) {
    const a = luminance(left);
    const b = luminance(right);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function byteHex(bytes: ArrayBuffer) {
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async function browserSha256(bytes: Uint8Array | string) {
    const input = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
    return byteHex(await crypto.subtle.digest("SHA-256", input));
  }
  function browserStableValue(value: unknown): unknown {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) return value.map((entry) => browserStableValue(entry) ?? null);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, browserStableValue(entry)]));
  }
  function browserStableSerialize(value: unknown) {
    return JSON.stringify(browserStableValue(value));
  }

  function paperProof(canvas: HTMLCanvasElement) {
    const issues: string[] = [];
    const surface = canvas.closest<HTMLElement>("[data-viz-surface-kind='signature-canvas']");
    const canvasStyle = getComputedStyle(canvas);
    const surfaceStyle = surface ? getComputedStyle(surface) : null;
    const compositingLayers: CaliforniaCanvasGraphicsCompositingLayerProof[] = [];
    if (!surface || !surfaceStyle) issues.push("signature-paper-surface-missing");
    const surfaceColor = surfaceStyle?.backgroundColor ?? "missing";
    if (surfaceColor !== "rgb(251, 251, 248)") issues.push(`paper-color:${surfaceColor}`);
    let currentLayer: HTMLElement | null = canvas;
    let withinPaperStack = true;
    while (currentLayer) {
      const style = getComputedStyle(currentLayer);
      const maskImage = style.getPropertyValue("mask-image") ||
        style.getPropertyValue("-webkit-mask-image") || "none";
      const layer: CaliforniaCanvasGraphicsCompositingLayerProof = {
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
        elementIdentity: [
          currentLayer.tagName.toLowerCase(),
          currentLayer.id ? `#${currentLayer.id}` : "",
          currentLayer.classList.length > 0 ? `.${[...currentLayer.classList].join(".")}` : ""
        ].join(""),
        filter: style.filter,
        isPaperSurface: currentLayer === surface,
        maskImage,
        mixBlendMode: style.mixBlendMode,
        opacity: Number(style.opacity),
        withinPaperStack
      };
      compositingLayers.push(layer);
      if (withinPaperStack && (
        layer.opacity !== 1 || layer.filter !== "none" || layer.backdropFilter !== "none" ||
        layer.mixBlendMode !== "normal" || maskImage !== "none"
      )) {
        issues.push(`ancestor-compositing:${layer.elementIdentity}`);
      }
      const layerColor = parseCssColor(layer.backgroundColor);
      if (withinPaperStack && layer.backgroundImage !== "none") {
        issues.push(`paper-gradient-or-image:${layer.elementIdentity}`);
      }
      if (withinPaperStack && layer.boxShadow !== "none") {
        issues.push(`paper-box-shadow:${layer.elementIdentity}`);
      }
      if (withinPaperStack && layerColor && layerColor[3] > 0 &&
          (layerColor[0] !== 251 || layerColor[1] !== 251 || layerColor[2] !== 248 ||
            layerColor[3] !== 255)) {
        issues.push(`paper-layer-background:${layer.elementIdentity}:${layer.backgroundColor}`);
      }
      for (const pseudo of ["::before", "::after"] as const) {
        const pseudoStyle = getComputedStyle(currentLayer, pseudo);
        if (withinPaperStack &&
            pseudoStyle.content !== "none" && pseudoStyle.content !== "normal" &&
            (pseudoStyle.backgroundImage !== "none" ||
              (parseCssColor(pseudoStyle.backgroundColor)?.[3] ?? 0) > 0 ||
              Number(pseudoStyle.opacity) !== 1 || pseudoStyle.filter !== "none" ||
              pseudoStyle.mixBlendMode !== "normal")) {
          issues.push(`unresolved-pseudo-compositing:${layer.elementIdentity}${pseudo}`);
        }
      }
      if (currentLayer === surface) withinPaperStack = false;
      currentLayer = currentLayer.parentElement;
    }
    const canvasBackground = parseCssColor(canvasStyle.backgroundColor);
    if (canvasBackground && canvasBackground[3] > 0 &&
        (canvasBackground[0] !== 251 || canvasBackground[1] !== 251 || canvasBackground[2] !== 248 ||
          canvasBackground[3] !== 255)) {
      issues.push(`canvas-background-conflicts-with-paper:${canvasStyle.backgroundColor}`);
    }
    let firstOpaqueBackground = "transparent";
    let current: HTMLElement | null = canvas;
    while (current) {
      const color = parseCssColor(getComputedStyle(current).backgroundColor);
      if (color && color[3] === 255) {
        firstOpaqueBackground = getComputedStyle(current).backgroundColor;
        break;
      }
      if (current === surface) break;
      current = current.parentElement;
    }
    if (firstOpaqueBackground !== "rgb(251, 251, 248)") {
      issues.push(`effective-paper-background:${firstOpaqueBackground}`);
    }
    return {
      issues,
      proof: {
        canvasBackgroundColor: canvasStyle.backgroundColor,
        canvasBackgroundImage: canvasStyle.backgroundImage,
        canvasOpacity: Number(canvasStyle.opacity),
        compositingLayers,
        effectiveOpaqueBackgroundColor: firstOpaqueBackground,
        expectedPaperColor: "#fbfbf8" as const,
        paperOpaque: issues.length === 0,
        surfaceBackgroundColor: surfaceColor,
        surfaceColorScheme: surfaceStyle?.colorScheme ?? "missing"
      }
    };
  }

  function rootRuntimeId(root: HTMLElement) {
    let id = rootRuntimeIds.get(root);
    if (!id) {
      id = nextRootRuntimeId++;
      rootRuntimeIds.set(root, id);
    }
    return id;
  }

  function captureFenceSignature(
    root: HTMLElement,
    benchId: string,
    states: readonly CanvasState[]
  ) {
    const animation = animationState(benchId);
    const rootCanvases = [
      ...(root instanceof HTMLCanvasElement ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLCanvasElement>("canvas"))
    ];
    return browserStableSerialize({
      animation: {
        activeEpoch: animation.activeEpoch,
        latestScheduledEpoch: animation.latestScheduledEpoch,
        latestSettledEpoch: animation.latestSettledEpoch,
        pending: [...animation.pending.entries()].sort(([left], [right]) => left - right)
      },
      canvases: rootCanvases.map((canvas, domCanvasIndex) => {
        const state = statesByCanvas.get(canvas);
        const rect = canvas.getBoundingClientRect();
        const paper = paperProof(canvas);
        return {
          backingHeight: canvas.height,
          backingWidth: canvas.width,
          bindingKey: state?.bindingKey ?? "unregistered",
          canvasConnected: canvas.isConnected,
          canvasStateMatches: Boolean(state && state.canvas === canvas && statesByContext.get(state.context) === state),
          clearEpoch: state?.clearEpoch ?? -1,
          clipCoverage: state?.clipCoverage ?? "unregistered",
          cssHeight: rect.height,
          cssWidth: rect.width,
          domCanvasIndex,
          latestClearWasFull: state?.latestClearWasFull ?? false,
          latestPaintRafEpoch: state?.latestPaintRafEpoch ?? -1,
          paperIssues: paper.issues,
          paperProof: paper.proof,
          runtimeCanvasId: state?.runtimeCanvasId ?? -1,
          sourcePaintRevision: state?.sequence ?? -1,
          unsupportedReasons: state?.unsupportedReasons ?? []
        };
      }),
      locationHref: location.href,
      rootConnected: root.isConnected,
      rootRuntimeId: rootRuntimeId(root),
      states: states.map((state) => state.runtimeCanvasId).sort((left, right) => left - right),
      textAuditSignature: runtimeWindow.__californiaCanvasTextAudit?.signature?.(root) ?? null
    });
  }

  function compositorElementIdentity(element: Element) {
    const parts: string[] = [];
    let current: Element | null = element;
    while (current) {
      if (parts.length >= 256) {
        throw new Error("california-canvas-final-compositor-dom-depth-cap-exceeded");
      }
      const parent: Element | null = current.parentElement;
      const currentRoot = current.getRootNode();
      const index = parent
        ? Array.prototype.indexOf.call(parent.children, current)
        : currentRoot instanceof ShadowRoot
          ? Array.prototype.indexOf.call(currentRoot.children, current)
          : 0;
      parts.push(`${current.tagName.toLowerCase()}#${current.id || "-"}:${index}`);
      if (parent) current = parent;
      else if (currentRoot instanceof ShadowRoot) {
        parts.push("::shadow");
        current = currentRoot.host;
      } else current = null;
    }
    return parts.reverse().join(">");
  }

  function compositorMutationDiagnostic(record: MutationRecord) {
    const nodeIdentity = (node: Node) => {
      if (node instanceof Element) return compositorElementIdentity(node);
      const parent = node.parentElement;
      return parent
        ? `${compositorElementIdentity(parent)}::node-${Array.prototype.indexOf.call(
          parent.childNodes,
          node
        )}:${node.nodeType}`
        : `detached-node:${node.nodeType}`;
    };
    const target = nodeIdentity(record.target);
    if (record.type === "attributes") {
      const attributeName = record.attributeName ?? "";
      const currentValue = record.target instanceof Element && attributeName
        ? record.target.getAttribute(attributeName)
        : null;
      const previewValue = (value: string | null) => {
        if (value == null) return null;
        if (attributeName === "class" || attributeName === "style") return value.slice(0, 512);
        return { length: value.length };
      };
      return {
        attributeName,
        currentValue: previewValue(currentValue),
        oldValue: previewValue(record.oldValue),
        target,
        type: record.type
      };
    }
    if (record.type === "characterData") {
      return {
        currentLength: record.target.textContent?.length ?? 0,
        oldLength: record.oldValue?.length ?? 0,
        target,
        type: record.type
      };
    }
    return {
      added: Array.from(record.addedNodes).slice(0, 8).map(nodeIdentity),
      nextSibling: record.nextSibling ? nodeIdentity(record.nextSibling) : null,
      previousSibling: record.previousSibling ? nodeIdentity(record.previousSibling) : null,
      removed: Array.from(record.removedNodes).slice(0, 8).map(nodeIdentity),
      target,
      type: record.type
    };
  }

  function compositorBlockingMutations(records: readonly MutationRecord[]) {
    return records.filter((record) => {
      if (record.type !== "attributes" ||
          !(record.target instanceof HTMLInputElement) ||
          record.target.type !== "range" ||
          (record.attributeName !== "name" && record.attributeName !== "type")) {
        return true;
      }
      const targetRecords = records.filter((candidate) =>
        candidate.type === "attributes" && candidate.target === record.target &&
        (candidate.attributeName === "name" || candidate.attributeName === "type")
      );
      return !exactControlledRangeNormalization(
        targetRecords.map((candidate) => ({
          attributeName: candidate.attributeName,
          oldValue: candidate.oldValue
        })),
        record.target.getAttribute("name"),
        record.target.getAttribute("type")
      );
    });
  }

  function compositorPaintStyle(style: CSSStyleDeclaration) {
    return {
      backdropFilter: style.backdropFilter,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      clipPath: style.clipPath,
      color: style.color,
      content: style.content,
      display: style.display,
      filter: style.filter,
      font: style.font,
      letterSpacing: style.letterSpacing,
      maskImage: style.maskImage,
      mixBlendMode: style.mixBlendMode,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      opacity: style.opacity,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      position: style.position,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      textDecoration: style.textDecoration,
      textShadow: style.textShadow,
      transform: style.transform,
      visibility: style.visibility,
      whiteSpace: style.whiteSpace,
      writingMode: style.writingMode,
      zIndex: style.zIndex
    };
  }

  function compositorElements() {
    const elements: HTMLElement[] = [];
    const seenElements = new Set<Element>();
    const seenRoots = new Set<Document | ShadowRoot>();
    const roots: Array<Document | ShadowRoot> = [document, ...retainedShadowRoots];
    while (roots.length > 0) {
      const root = roots.shift()!;
      if (seenRoots.has(root)) continue;
      seenRoots.add(root);
      for (const element of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
        if (!seenElements.has(element)) {
          seenElements.add(element);
          elements.push(element);
        }
        const shadow = element.shadowRoot ?? shadowRootByHost.get(element);
        if (shadow && !seenRoots.has(shadow)) roots.push(shadow);
      }
    }
    return elements;
  }

  function paintEnvironmentChangedKinds(
    expected: CaliforniaCanvasGraphicsPaintEnvironmentKindCounts
  ) {
    return paintEnvironmentKinds.filter((kind) =>
      paintEnvironmentKindCounts[kind] !== expected[kind]
    );
  }

  function throwPaintEnvironmentDrift(
    expectedEpoch: number,
    expectedCounts: CaliforniaCanvasGraphicsPaintEnvironmentKindCounts,
    stage: string,
    fallbackKind = "untracked"
  ): never {
    const kinds = paintEnvironmentChangedKinds(expectedCounts);
    const recent = paintEnvironmentRecentMutations.filter((mutation) =>
      mutation.epoch > expectedEpoch
    ).slice(-16);
    throw new Error(
      "california-canvas-final-compositor-paint-environment-drift:" +
      `kinds=${kinds.length > 0 ? kinds.join("+") : fallbackKind}:` +
      `stage=${stage}:epoch=${expectedEpoch}->${paintEnvironmentEpoch}:` +
      `recent=${browserStableSerialize(recent)}`
    );
  }

  function animationTimelineValue(value: CSSNumberish | null) {
    if (value == null) return null;
    return typeof value === "number" ? (Number.isFinite(value) ? value : null) : String(value);
  }

  function animationRuntimeId(animation: Animation) {
    let id = paintEnvironmentAnimationIds.get(animation);
    if (!id) {
      id = nextPaintEnvironmentAnimationId++;
      paintEnvironmentAnimationIds.set(animation, id);
    }
    return id;
  }

  function viewTransitionRuntimeId(transition: object) {
    let id = paintEnvironmentViewTransitionIds.get(transition);
    if (!id) {
      id = nextPaintEnvironmentViewTransitionId++;
      paintEnvironmentViewTransitionIds.set(transition, id);
    }
    return id;
  }

  function fontFaceRuntimeId(face: object) {
    let id = paintEnvironmentFontFaceIds.get(face);
    if (!id) {
      id = nextPaintEnvironmentFontFaceId++;
      paintEnvironmentFontFaceIds.set(face, id);
    }
    return id;
  }

  function currentPaintEnvironmentMediaQueries() {
    const queries = new Set([
      "print",
      "screen",
      "(any-hover:hover)",
      "(any-pointer:fine)",
      "(forced-colors:active)",
      "(hover:hover)",
      "(orientation:landscape)",
      "(pointer:fine)",
      "(prefers-color-scheme:dark)",
      "(prefers-color-scheme:light)",
      "(prefers-contrast:more)",
      "(prefers-reduced-motion:reduce)"
    ]);
    const sheets = new Set<CSSStyleSheet>(Array.from(document.styleSheets));
    for (const sheet of document.adoptedStyleSheets) sheets.add(sheet);
    for (const root of retainedShadowRoots) {
      const rootWithSheets = root as ShadowRoot & { styleSheets?: StyleSheetList };
      for (const sheet of Array.from(rootWithSheets.styleSheets ?? [])) sheets.add(sheet);
      for (const sheet of root.adoptedStyleSheets) sheets.add(sheet);
    }
    const seenRules = new Set<CSSRule>();
    const walkRules = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (seenRules.has(rule)) continue;
        seenRules.add(rule);
        if (rule instanceof CSSMediaRule && rule.conditionText.trim()) {
          queries.add(rule.conditionText);
        }
        const grouping = rule as CSSRule & { cssRules?: CSSRuleList };
        if (grouping.cssRules) walkRules(grouping.cssRules);
        if (rule instanceof CSSImportRule && rule.styleSheet) {
          try {
            walkRules(rule.styleSheet.cssRules);
          } catch {
            throw new Error(
              "california-canvas-final-compositor-cross-origin-media-sheet-unreadable"
            );
          }
        }
      }
    };
    for (const sheet of sheets) {
      try {
        walkRules(sheet.cssRules);
      } catch (error) {
        if (String(error).includes("cross-origin-media-sheet-unreadable")) throw error;
        throw new Error(
          "california-canvas-final-compositor-cross-origin-media-sheet-unreadable"
        );
      }
    }
    return [...queries].sort();
  }

  function trackedPaintEnvironmentMediaQueries() {
    return currentPaintEnvironmentMediaQueries().map((query) => {
      let media = paintEnvironmentMediaQueries.get(query);
      if (!media) {
        media = matchMedia(query);
        media.addEventListener("change", () => advancePaintEnvironment("media"));
        paintEnvironmentMediaQueries.set(query, media);
      }
      return { matches: media.matches, query };
    });
  }

  async function capturePaintEnvironmentSnapshot(
    stage: string
  ): Promise<CaliforniaCanvasGraphicsPaintEnvironmentSnapshot> {
    if (paintEnvironmentEpochOverflowed) {
      throw new Error("california-canvas-final-compositor-paint-environment-epoch-overflow");
    }
    if (paintEnvironmentHookIssues.length > 0) {
      throw new Error(
        "california-canvas-final-compositor-paint-environment-hook-unsupported:" +
        [...new Set(paintEnvironmentHookIssues)].sort().join(",")
      );
    }
    const expectedEpoch = paintEnvironmentEpoch;
    const kindCounts = { ...paintEnvironmentKindCounts };
    const elements = compositorElements();
    if (elements.length > 50_000) {
      throw new Error("california-canvas-final-compositor-paint-environment-node-cap-exceeded");
    }

    const activeChain: string[] = [];
    let activeElement: Element | null = document.activeElement;
    while (activeElement) {
      if (activeChain.length >= 256) {
        throw new Error("california-canvas-final-compositor-focus-depth-cap-exceeded");
      }
      activeChain.push(compositorElementIdentity(activeElement));
      const shadow = activeElement.shadowRoot ?? shadowRootByHost.get(activeElement);
      activeElement = shadow?.activeElement ?? null;
    }
    const focusPayload = {
      activeChain,
      documentHasFocus: document.hasFocus(),
      matchingElements: elements.filter((element) => {
        try {
          return element.matches(":focus,:focus-within");
        } catch {
          return false;
        }
      }).map(compositorElementIdentity).sort()
    };

    const scrollPayload = {
      elements: elements.filter((element) =>
        element.scrollLeft !== 0 || element.scrollTop !== 0 ||
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
      ).map((element) => ({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        identity: compositorElementIdentity(element),
        scrollHeight: element.scrollHeight,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        scrollWidth: element.scrollWidth
      })).sort((left, right) => left.identity.localeCompare(right.identity)),
      visualViewport: visualViewport ? {
        height: visualViewport.height,
        offsetLeft: visualViewport.offsetLeft,
        offsetTop: visualViewport.offsetTop,
        pageLeft: visualViewport.pageLeft,
        pageTop: visualViewport.pageTop,
        scale: visualViewport.scale,
        width: visualViewport.width
      } : null,
      window: { scrollX, scrollY }
    };

    const viewportPayload = {
      devicePixelRatio,
      documentClientHeight: document.documentElement.clientHeight,
      documentClientWidth: document.documentElement.clientWidth,
      innerHeight,
      innerWidth,
      outerHeight,
      outerWidth,
      screen: {
        availHeight: screen.availHeight,
        availWidth: screen.availWidth,
        colorDepth: screen.colorDepth,
        height: screen.height,
        pixelDepth: screen.pixelDepth,
        width: screen.width
      },
      visualViewport: visualViewport ? {
        height: visualViewport.height,
        offsetLeft: visualViewport.offsetLeft,
        offsetTop: visualViewport.offsetTop,
        pageLeft: visualViewport.pageLeft,
        pageTop: visualViewport.pageTop,
        scale: visualViewport.scale,
        width: visualViewport.width
      } : null
    };
    const mediaPayload = trackedPaintEnvironmentMediaQueries();

    const captureFontPayload = () => ({
      faces: [...document.fonts].map((face) => {
        const extendedFace = face as FontFace & {
          sizeAdjust: string;
          variant: string;
          variationSettings: string;
        };
        return {
          ascentOverride: extendedFace.ascentOverride,
          descentOverride: extendedFace.descentOverride,
          display: extendedFace.display,
          family: extendedFace.family,
          featureSettings: extendedFace.featureSettings,
          lineGapOverride: extendedFace.lineGapOverride,
          runtimeId: fontFaceRuntimeId(face),
          sizeAdjust: extendedFace.sizeAdjust,
          status: extendedFace.status,
          stretch: extendedFace.stretch,
          style: extendedFace.style,
          unicodeRange: extendedFace.unicodeRange,
          variant: extendedFace.variant,
          variationSettings: extendedFace.variationSettings,
          weight: extendedFace.weight
        };
      }).sort((left, right) => left.runtimeId - right.runtimeId),
      status: document.fonts.status
    });
    const fontPayload = captureFontPayload();

    const fullscreenPayload = {
      element: document.fullscreenElement
        ? compositorElementIdentity(document.fullscreenElement)
        : null,
      enabled: document.fullscreenEnabled
    };

    const animations = new Set<Animation>(document.getAnimations());
    for (const root of retainedShadowRoots) {
      const rootWithAnimations = root as ShadowRoot & {
        getAnimations?: () => Animation[];
      };
      for (const animation of rootWithAnimations.getAnimations?.() ?? []) {
        animations.add(animation);
      }
    }
    const animationEntries = [...animations].map((animation) => {
      const effect = animation.effect;
      const keyframeEffect = effect instanceof KeyframeEffect ? effect : null;
      return {
        currentTime: animationTimelineValue(animation.currentTime),
        effectTiming: effect?.getComputedTiming() ?? null,
        id: animation.id,
        pending: animation.pending,
        playState: animation.playState,
        playbackRate: animation.playbackRate,
        pseudoElement: keyframeEffect?.pseudoElement ?? null,
        replaceState: animation.replaceState,
        runtimeId: animationRuntimeId(animation),
        startTime: animationTimelineValue(animation.startTime),
        target: keyframeEffect?.target
          ? compositorElementIdentity(keyframeEffect.target)
          : null
      };
    }).sort((left, right) => left.runtimeId - right.runtimeId);
    const activeViewTransition = (document as Document & {
      activeViewTransition?: {
        transitionRoot?: Element | null;
        types?: Iterable<string>;
      } | null;
    }).activeViewTransition ?? null;
    const animationPayload = {
      activeViewTransition: activeViewTransition ? {
        runtimeId: viewTransitionRuntimeId(activeViewTransition),
        transitionRoot: activeViewTransition.transitionRoot instanceof Element
          ? compositorElementIdentity(activeViewTransition.transitionRoot)
          : null,
        types: activeViewTransition.types
          ? [...activeViewTransition.types].map(String).sort()
          : []
      } : null,
      animations: animationEntries
    };

    const pointerPayload = elements.filter((element) => {
      try {
        return element.matches(":active,:hover");
      } catch {
        return false;
      }
    }).map(compositorElementIdentity).sort();

    const selection = document.getSelection();
    const selectionNodeIdentity = (node: Node | null) => {
      if (!node) return null;
      if (node instanceof Element) return compositorElementIdentity(node);
      const parent = node.parentElement;
      return parent
        ? `${compositorElementIdentity(parent)}::node-${Array.prototype.indexOf.call(
          parent.childNodes,
          node
        )}:${node.nodeType}`
        : `detached-node:${node.nodeType}`;
    };
    const statePayload = {
      forms: elements.filter((element) =>
        element.matches("input,option,select,textarea")
      ).map((element) => {
        const input = element as HTMLInputElement;
        const option = element as HTMLOptionElement;
        const select = element as HTMLSelectElement;
        const textarea = element as HTMLTextAreaElement;
        return {
          checked: element instanceof HTMLInputElement ? input.checked : null,
          identity: compositorElementIdentity(element),
          indeterminate: element instanceof HTMLInputElement ? input.indeterminate : null,
          selected: element instanceof HTMLOptionElement ? option.selected : null,
          selectedIndex: element instanceof HTMLSelectElement ? select.selectedIndex : null,
          selectionDirection: element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            ? (input.selectionDirection ?? textarea.selectionDirection)
            : null,
          selectionEnd: element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            ? (input.selectionEnd ?? textarea.selectionEnd)
            : null,
          selectionStart: element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            ? (input.selectionStart ?? textarea.selectionStart)
            : null,
          value: element instanceof HTMLInputElement ||
              element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
            ? input.value
            : null
        };
      }).sort((left, right) => left.identity.localeCompare(right.identity)),
      historyLength: history.length,
      locationHash: location.hash,
      locationHref: location.href,
      selection: selection ? {
        anchorNode: selectionNodeIdentity(selection.anchorNode),
        anchorOffset: selection.anchorOffset,
        focusNode: selectionNodeIdentity(selection.focusNode),
        focusOffset: selection.focusOffset,
        isCollapsed: selection.isCollapsed,
        rangeCount: selection.rangeCount,
        type: selection.type
      } : null,
      target: document.querySelector(":target")
        ? compositorElementIdentity(document.querySelector(":target")!)
        : null,
      topLayer: elements.filter((element) => {
        if (element instanceof HTMLDialogElement && element.open) return true;
        try {
          return element.matches(":popover-open");
        } catch {
          return false;
        }
      }).map(compositorElementIdentity).sort(),
      visibilityState: document.visibilityState
    };

    const [
      animationFingerprintSha256,
      focusFingerprintSha256,
      fontFingerprintSha256,
      fullscreenFingerprintSha256,
      mediaFingerprintSha256,
      pointerFingerprintSha256,
      scrollFingerprintSha256,
      stateFingerprintSha256,
      viewportFingerprintSha256
    ] = await Promise.all([
      browserSha256(browserStableSerialize(animationPayload)),
      browserSha256(browserStableSerialize(focusPayload)),
      browserSha256(browserStableSerialize(fontPayload)),
      browserSha256(browserStableSerialize(fullscreenPayload)),
      browserSha256(browserStableSerialize(mediaPayload)),
      browserSha256(browserStableSerialize(pointerPayload)),
      browserSha256(browserStableSerialize(scrollPayload)),
      browserSha256(browserStableSerialize(statePayload)),
      browserSha256(browserStableSerialize(viewportPayload))
    ]);
    if (paintEnvironmentEpoch !== expectedEpoch ||
        paintEnvironmentChangedKinds(kindCounts).length > 0) {
      throwPaintEnvironmentDrift(expectedEpoch, kindCounts, `${stage}-snapshot`);
    }
    // A loaded FontFaceSet is capturable when its complete identity/status
    // payload remains byte-identical across the asynchronous fingerprint
    // work and no tracked font mutation advances the environment epoch. This
    // rejects loading or racing custom fonts without rejecting a settled
    // application merely because its stylesheet declares a FontFace.
    const sealedFontPayload = captureFontPayload();
    if (fontPayload.status !== "loaded" ||
        browserStableSerialize(sealedFontPayload) !== browserStableSerialize(fontPayload)) {
      throwPaintEnvironmentDrift(
        expectedEpoch,
        kindCounts,
        `${stage}-custom-font-state-not-stably-capturable`,
        "font"
      );
    }
    const withoutFingerprint = {
      animationFingerprintSha256,
      epoch: expectedEpoch,
      focusFingerprintSha256,
      fontFingerprintSha256,
      fullscreenFingerprintSha256,
      kindCounts,
      mediaFingerprintSha256,
      pointerFingerprintSha256,
      scrollFingerprintSha256,
      stateFingerprintSha256,
      viewportFingerprintSha256
    };
    const fingerprintSha256 = await browserSha256(browserStableSerialize(withoutFingerprint));
    if (paintEnvironmentEpoch !== expectedEpoch ||
        paintEnvironmentChangedKinds(kindCounts).length > 0) {
      throwPaintEnvironmentDrift(expectedEpoch, kindCounts, `${stage}-seal`);
    }
    return { ...withoutFingerprint, fingerprintSha256 };
  }

  async function assertPaintEnvironmentUnchanged(
    expected: CaliforniaCanvasGraphicsPaintEnvironmentSnapshot,
    stage: string
  ) {
    if (paintEnvironmentEpoch !== expected.epoch ||
        paintEnvironmentChangedKinds(expected.kindCounts).length > 0) {
      throwPaintEnvironmentDrift(expected.epoch, expected.kindCounts, stage);
    }
    const actual = await capturePaintEnvironmentSnapshot(stage);
    if (browserStableSerialize(actual) !== browserStableSerialize(expected)) {
      throwPaintEnvironmentDrift(
        expected.epoch,
        expected.kindCounts,
        stage,
        "fingerprint"
      );
    }
  }

  function compositorLayoutFence(root: HTMLElement, canvas: HTMLCanvasElement) {
    const canvasRect = canvas.getBoundingClientRect();
    const all = compositorElements();
    if (all.length > 50_000) {
      throw new Error("california-canvas-final-compositor-layout-node-cap-exceeded");
    }
    const intersects = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.right > canvasRect.left && rect.left < canvasRect.right &&
        rect.bottom > canvasRect.top && rect.top < canvasRect.bottom;
    });
    if (intersects.length > 4_096) {
      throw new Error("california-canvas-final-compositor-intersection-cap-exceeded");
    }
    for (const element of intersects) {
      if (element.localName.includes("-") &&
          !element.shadowRoot && !shadowRootByHost.has(element)) {
        throw new Error("california-canvas-final-compositor-inaccessible-shadow-host");
      }
    }
    return browserStableSerialize({
      canvas: {
        backingHeight: canvas.height,
        backingWidth: canvas.width,
        pageX: canvasRect.x + scrollX,
        pageY: canvasRect.y + scrollY,
        rect: {
          bottom: canvasRect.bottom,
          height: canvasRect.height,
          left: canvasRect.left,
          right: canvasRect.right,
          top: canvasRect.top,
          width: canvasRect.width
        }
      },
      deviceScaleFactor: devicePixelRatio,
      documentHeight: Math.max(document.documentElement.clientHeight,
        document.documentElement.scrollHeight),
      documentWidth: Math.max(document.documentElement.clientWidth,
        document.documentElement.scrollWidth),
      elements: intersects.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          after: compositorPaintStyle(getComputedStyle(element, "::after")),
          before: compositorPaintStyle(getComputedStyle(element, "::before")),
          childCount: element.childElementCount,
          connected: element.isConnected,
          identity: compositorElementIdentity(element),
          rect: {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width
          },
          style: compositorPaintStyle(getComputedStyle(element))
        };
      }),
      locationHref: location.href,
      rootIdentity: compositorElementIdentity(root),
      rootRuntimeId: rootRuntimeId(root),
      scrollX,
      scrollY,
      viewportHeight: innerHeight,
      viewportWidth: innerWidth
    });
  }

  async function compositorPaintFence(root: HTMLElement, canvas: HTMLCanvasElement) {
    if (document.fonts.status !== "loaded") {
      throw new Error("california-canvas-final-compositor-fonts-not-ready");
    }
    const activeAnimations = document.getAnimations().filter((animation) =>
      animation.playState === "running"
    );
    if (activeAnimations.length > 0) {
      throw new Error("california-canvas-final-compositor-active-animation-or-transition");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const intersecting = compositorElements().filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.right > canvasRect.left && rect.left < canvasRect.right &&
        rect.bottom > canvasRect.top && rect.top < canvasRect.bottom;
    });
    if (intersecting.length > 4_096) {
      throw new Error("california-canvas-final-compositor-paint-input-cap-exceeded");
    }
    let textBytes = 0;
    const inputs = await Promise.all(intersecting.map(async (element) => {
      const style = getComputedStyle(element);
      if (/url\(/i.test(style.backgroundImage)) {
        throw new Error("california-canvas-final-compositor-animated-background-unsupported");
      }
      if (element.matches("video,iframe,object,embed")) {
        throw new Error("california-canvas-final-compositor-dynamic-raster-surface-unsupported");
      }
      const text = Array.from(element.childNodes).map((node, index) =>
        node.nodeType === Node.TEXT_NODE ? `${index}:${node.textContent ?? ""}` : ""
      ).filter(Boolean).join("\u0000");
      textBytes += text.length * 2;
      if (text.length > 16_384 || textBytes > 1_048_576) {
        throw new Error("california-canvas-final-compositor-text-input-cap-exceeded");
      }
      let rasterSha256: string | null = null;
      let image: unknown = null;
      if (element instanceof HTMLCanvasElement) {
        const bytes = await canvasPngBytes(element);
        rasterSha256 = await browserSha256(bytes);
      } else if (element instanceof HTMLImageElement) {
        if (!element.complete || element.naturalWidth < 1 || element.naturalHeight < 1) {
          throw new Error("california-canvas-final-compositor-image-not-decoded");
        }
        const source = element.currentSrc || element.src;
        if (!source.startsWith("data:image/")) {
          throw new Error("california-canvas-final-compositor-external-or-animated-image-unsupported");
        }
        const lower = source.slice(0, 64).toLowerCase();
        if (lower.startsWith("data:image/gif") || lower.startsWith("data:image/webp")) {
          throw new Error("california-canvas-final-compositor-animated-image-unsupported");
        }
        if (lower.startsWith("data:image/svg+xml")) {
          const comma = source.indexOf(",");
          const payload = comma >= 0 ? source.slice(comma + 1) : "";
          const decoded = source.slice(0, comma).includes(";base64")
            ? atob(payload)
            : decodeURIComponent(payload);
          if (/<(?:animate|animateTransform|animateMotion|set|script)\b/i.test(decoded)) {
            throw new Error("california-canvas-final-compositor-animated-image-unsupported");
          }
        } else if (!lower.startsWith("data:image/png") &&
            !lower.startsWith("data:image/jpeg") && !lower.startsWith("data:image/jpg")) {
          throw new Error("california-canvas-final-compositor-image-format-unsupported");
        }
        image = {
          currentSrcSha256: await browserSha256(source),
          naturalHeight: element.naturalHeight,
          naturalWidth: element.naturalWidth
        };
      }
      let svgSha256: string | null = null;
      if (element instanceof SVGElement) {
        if (element.outerHTML.length > 1_048_576) {
          throw new Error("california-canvas-final-compositor-svg-input-cap-exceeded");
        }
        svgSha256 = await browserSha256(element.outerHTML);
      }
      const form = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      return {
        attributes: Array.from(element.attributes).map((attribute) => [
          attribute.name,
          attribute.value
        ]).sort(([left], [right]) => left.localeCompare(right)),
        checked: element instanceof HTMLInputElement ? element.checked : null,
        identity: compositorElementIdentity(element),
        image,
        rasterSha256,
        selectedIndex: element instanceof HTMLSelectElement ? element.selectedIndex : null,
        svgSha256,
        textSha256: text ? await browserSha256(text) : null,
        value: element.matches("input,select,textarea") ? form.value : null
      };
    }));
    return browserStableSerialize({
      fontsStatus: document.fonts.status,
      inputs,
      locationHref: location.href,
      rootIdentity: compositorElementIdentity(root),
      rootRuntimeId: rootRuntimeId(root)
    });
  }

  function boundedCompositorGeometry(
    registration: ContrastCanvasRegistration
  ) {
    const { canvas, canvasEvidence } = registration;
    const rect = canvas.getBoundingClientRect();
    const snapInteger = (value: number) =>
      Math.abs(value - Math.round(value)) <= 1e-7 ? Math.round(value) : value;
    const pageX = snapInteger(rect.x + scrollX);
    const pageY = snapInteger(rect.y + scrollY);
    const rectWidth = snapInteger(rect.width);
    const rectHeight = snapInteger(rect.height);
    const values = [pageX, pageY, rect.x, rect.y, rect.width, rect.height];
    if (values.some((value) => !Number.isFinite(value)) || pageX < 0 || pageY < 0 ||
        rect.x < 0 || rect.y < 0 || !Number.isSafeInteger(scrollX) ||
        !Number.isSafeInteger(scrollY) || scrollX < 0 || scrollY < 0 ||
        rectWidth < 1 || rectHeight < 1 || rectWidth * rectHeight > 4_194_304) {
      throw new Error(
        `california-canvas-final-compositor-bounded-geometry-required:${browserStableSerialize({
          height: rectHeight,
          pageX,
          pageY,
          width: rectWidth
        })}`
      );
    }
    const style = getComputedStyle(canvas);
    const zeroBoxValues = [
      style.borderBottomWidth,
      style.borderLeftWidth,
      style.borderRightWidth,
      style.borderTopWidth,
      style.paddingBottom,
      style.paddingLeft,
      style.paddingRight,
      style.paddingTop
    ].map((value) => Number.parseFloat(value));
    if (zeroBoxValues.some((value) => !Number.isFinite(value) || value !== 0) ||
        style.transform !== "none" || style.imageRendering !== "auto" ||
        style.clipPath !== "none" || style.visibility !== "visible" || style.display === "none") {
      throw new Error("california-canvas-final-compositor-unsupported-css-geometry");
    }
    if (Math.abs(rectWidth - canvasEvidence.cssWidth) > 1e-7 ||
        Math.abs(rectHeight - canvasEvidence.cssHeight) > 1e-7) {
      throw new Error("california-canvas-final-compositor-css-size-drift");
    }
    const clipX = Math.floor(pageX);
    const clipY = Math.floor(pageY);
    const clipRight = Math.ceil(pageX + rectWidth);
    const clipBottom = Math.ceil(pageY + rectHeight);
    const clip = {
      height: clipBottom - clipY,
      width: clipRight - clipX,
      x: clipX,
      y: clipY
    };
    const captureViewportClip = {
      height: Math.ceil(rect.y + rectHeight) - Math.floor(rect.y),
      width: Math.ceil(rect.x + rectWidth) - Math.floor(rect.x),
      x: Math.floor(rect.x),
      y: Math.floor(rect.y)
    };
    if (clip.width < 1 || clip.height < 1 || clip.width * clip.height > 4_194_304) {
      throw new Error("california-canvas-final-compositor-bounded-clip-invalid");
    }
    if (captureViewportClip.width !== clip.width ||
        captureViewportClip.height !== clip.height || captureViewportClip.x < 0 ||
        captureViewportClip.y < 0 ||
        captureViewportClip.x + captureViewportClip.width > innerWidth ||
        captureViewportClip.y + captureViewportClip.height > innerHeight) {
      throw new Error("california-canvas-final-compositor-canvas-not-fully-visible");
    }
    const documentWidth = Math.max(document.documentElement.clientWidth,
      document.documentElement.scrollWidth);
    const documentHeight = Math.max(document.documentElement.clientHeight,
      document.documentElement.scrollHeight);
    if (clipRight > documentWidth || clipBottom > documentHeight) {
      throw new Error("california-canvas-final-compositor-crop-outside-document");
    }
    return {
      canvasPageRect: {
        height: rectHeight,
        width: rectWidth,
        x: pageX,
        y: pageY
      },
      captureScrollOffset: { x: scrollX, y: scrollY },
      captureViewportClip,
      captureViewportSize: { height: innerHeight, width: innerWidth },
      clip
    };
  }

  function browserBase64ToBytes(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  async function canvasPngBytes(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("california-canvas-final-compositor-reference-png-encode-failed"));
    }, "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function decodeCompositorPng(base64: string) {
    const pngBytes = browserBase64ToBytes(base64);
    if (pngBytes.length < 1 || pngBytes.length > 16 * 1024 * 1024) {
      throw new Error("california-canvas-final-compositor-png-byte-cap");
    }
    const bitmap = await createImageBitmap(new Blob([pngBytes], { type: "image/png" }));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("california-canvas-final-compositor-decode-context-missing");
      context.drawImage(bitmap, 0, 0);
      return {
        height: bitmap.height,
        pixels: new Uint8ClampedArray(context.getImageData(
          0, 0, bitmap.width, bitmap.height
        ).data),
        pngBytes,
        width: bitmap.width
      };
    } finally {
      bitmap.close();
    }
  }

  function browserExactComparison(
    reference: Uint8ClampedArray,
    compositor: Uint8ClampedArray,
    width: number,
    height: number
  ): CaliforniaCanvasGraphicsFinalCompositorComparison {
    const pixelCount = width * height;
    if (pixelCount < 1 || pixelCount > 4_194_304 ||
        reference.length !== pixelCount * 4 || compositor.length !== pixelCount * 4) {
      throw new Error("california-canvas-final-compositor-rgba-dimensions-invalid");
    }
    let changedPixelCount = 0;
    let maximumChannelDifference = 0;
    let totalAbsoluteDifference = 0;
    for (let offset = 0; offset < pixelCount * 4; offset += 4) {
      let changed = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const difference = Math.abs(reference[offset + channel]! - compositor[offset + channel]!);
        totalAbsoluteDifference += difference;
        maximumChannelDifference = Math.max(maximumChannelDifference, difference);
        if (difference > 0) changed = true;
      }
      if (changed) changedPixelCount += 1;
    }
    const changedPixelRatio = changedPixelCount / pixelCount;
    const meanAbsoluteDiffRatio = totalAbsoluteDifference / (pixelCount * 4 * 255);
    if (changedPixelCount !== 0 || meanAbsoluteDiffRatio !== 0) {
      throw new Error(
        "california-canvas-final-compositor-comparison-rejected:" +
        `changed=${changedPixelCount}/${pixelCount}:mean=${meanAbsoluteDiffRatio}:` +
        `max-channel=${maximumChannelDifference}`
      );
    }
    return {
      changedPixelCount,
      changedPixelRatio,
      channelTolerance: 0,
      maxChangedPixelRatio: 0,
      maxMeanAbsoluteDiffRatio: 0,
      maximumChannelDifference,
      meanAbsoluteDiffRatio,
      passed: true,
      pixelCount
    };
  }

  function connectedCore(
    pixels: Map<number, { ratio: number; x: number; y: number }>,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const remaining = new Set(pixels.keys());
    let largest = 0;
    let minimumRatio = 0;
    while (remaining.size > 0) {
      const first = remaining.values().next().value as number;
      remaining.delete(first);
      const queue = [first];
      let size = 0;
      let componentMinimum = Number.POSITIVE_INFINITY;
      while (queue.length > 0) {
        const index = queue.pop()!;
        const pixel = pixels.get(index)!;
        size += 1;
        componentMinimum = Math.min(componentMinimum, pixel.ratio);
        for (let dy = -backgroundNeighborRadius; dy <= backgroundNeighborRadius; dy += 1) {
          for (let dx = -backgroundNeighborRadius; dx <= backgroundNeighborRadius; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = pixel.x + dx;
            const ny = pixel.y + dy;
            if (nx < 0 || nx >= canvasWidth || ny < 0 || ny >= canvasHeight) continue;
            const neighbor = ny * canvasWidth + nx;
            if (remaining.delete(neighbor)) queue.push(neighbor);
          }
        }
      }
      if (size > largest) {
        largest = size;
        minimumRatio = componentMinimum;
      }
    }
    return { largest, minimumRatio };
  }

  async function canvasEvidence(
    state: CanvasState,
    rootCanvases: HTMLCanvasElement[],
    benchId: string,
    terminalPixels: TerminalPixelSnapshot
  ): Promise<CaliforniaCanvasGraphicsCanvasEvidence> {
    const issues = state.unsupportedReasons.slice();
    const finalPixels = terminalPixels.pixels;
    if (terminalPixels.canvas !== state.canvas ||
        terminalPixels.backingWidth !== state.canvas.width ||
        terminalPixels.backingHeight !== state.canvas.height ||
        terminalPixels.sourcePaintRevision !== state.sequence) {
      issues.push("terminal-pixel-snapshot-identity-drift");
    }
    const composited = new Uint8Array(finalPixels.length);
    for (let offset = 0; offset < finalPixels.length; offset += 4) {
      const pixel = compositeOnPaper(rgbaAt(finalPixels, offset));
      composited.set(pixel, offset);
    }
    const terminalRasterSha256 = await browserSha256(composited);
    const paper = paperProof(state.canvas);
    issues.push(...paper.issues);
    const animation = animationState(benchId);
    const siteEvidence: CaliforniaCanvasGraphicsSiteEvidence[] = [];
    for (const aggregate of [...state.siteAggregates.values()].sort((left, right) =>
      left.sourceSiteKey.localeCompare(right.sourceSiteKey)
    )) {
      if (aggregate.role !== "essential") continue;
      const terminalVisible = new Map<number, PixelSample>();
      for (const sample of aggregate.samples) {
        const writerSequence = state.writerMap[sample.index];
        if (state.writerSiteBySequence.get(writerSequence) !== aggregate.sourceSiteKey) continue;
        const final = rgbaAt(finalPixels, sample.index * 4);
        if (!equalRgba(final, sample.post)) continue;
        terminalVisible.set(sample.index, sample);
      }
      const core = new Map<number, { ratio: number; x: number; y: number }>();
      for (const [index, sample] of terminalVisible) {
        const ratio = contrastRatio(compositeOnPaper(sample.post), compositeOnPaper(sample.pre));
        if (ratio >= 3) core.set(index, { ratio, x: sample.x, y: sample.y });
      }
      const connected = connectedCore(core, state.canvas.width, state.canvas.height);
      const backgroundNeighbors = new Set<number>();
      for (const [index, pixel] of core) {
        const foreground = compositeOnPaper(rgbaAt(finalPixels, index * 4));
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = pixel.x + dx;
            const ny = pixel.y + dy;
            if (nx < 0 || ny < 0 || nx >= state.canvas.width || ny >= state.canvas.height) continue;
            const neighborIndex = ny * state.canvas.width + nx;
            if (core.has(neighborIndex)) continue;
            const background = compositeOnPaper(rgbaAt(finalPixels, neighborIndex * 4));
            if (contrastRatio(foreground, background) >= 3) backgroundNeighbors.add(neighborIndex);
          }
        }
      }
      const evidence: CaliforniaCanvasGraphicsSiteEvidence = {
        backgroundNeighborPixelCount: backgroundNeighbors.size,
        changedPixelCount: aggregate.changedPixelCount,
        clearEpoch: aggregate.clearEpoch,
        corePixelCount: core.size,
        corePixelCoverageRatio: terminalVisible.size > 0 ? core.size / terminalVisible.size : 0,
        invocationCount: aggregate.invocationCount,
        largestConnectedCorePixelCount: connected.largest,
        latestRafEpoch: aggregate.latestRafEpoch,
        minimumCoreContrastRatio: connected.minimumRatio,
        operation: aggregate.operation,
        paintServerKinds: [...aggregate.paintServerKinds].sort(),
        role: "essential",
        sourceSiteKey: aggregate.sourceSiteKey,
        terminalVisiblePixelCount: terminalVisible.size
      };
      if (connected.largest < 4) issues.push(`unconnected-or-tiny-core:${aggregate.sourceSiteKey}`);
      if (connected.minimumRatio < 3) issues.push(`low-contrast:${aggregate.sourceSiteKey}`);
      if (evidence.corePixelCoverageRatio < 0.5) {
        issues.push(`insufficient-contrast-core-coverage:${aggregate.sourceSiteKey}`);
      }
      if (backgroundNeighbors.size < 1) issues.push(`connected-background-missing:${aggregate.sourceSiteKey}`);
      siteEvidence.push(evidence);
    }
    const passingSiteEvidence = siteEvidence.filter((site) =>
      site.largestConnectedCorePixelCount >= 4 &&
      site.minimumCoreContrastRatio >= 3 &&
      site.corePixelCoverageRatio >= 0.5 &&
      site.backgroundNeighborPixelCount >= 1
    );
    const observedSourceSiteKeys = passingSiteEvidence.map((site) => site.sourceSiteKey).sort();
    const rect = state.canvas.getBoundingClientRect();
    return {
      backingHeight: state.canvas.height,
      backingWidth: state.canvas.width,
      benchId,
      bindingKey: state.bindingKey,
      canvasIdentity: `${state.bindingKey}:runtime-${state.runtimeCanvasId}:dom-${rootCanvases.indexOf(state.canvas)}`,
      compositedOpaquePixelRatio: composited.length > 0 ? 1 : 0,
      cssHeight: rect.height,
      cssWidth: rect.width,
      domCanvasIndex: rootCanvases.indexOf(state.canvas),
      issues: [...new Set(issues)],
      latestClearEpoch: state.clearEpoch,
      latestClearWasFull: state.latestClearWasFull,
      latestPaintRafEpoch: state.latestPaintRafEpoch,
      latestSettledRafEpoch: animation.latestSettledEpoch,
      minimumNumericNonTextContrastRatio: passingSiteEvidence.length > 0
        ? Math.min(...passingSiteEvidence.map((site) => site.minimumCoreContrastRatio))
        : 0,
      observedSourceSiteCount: observedSourceSiteKeys.length,
      observedSourceSiteDigest: await browserSha256(observedSourceSiteKeys.join("\n")),
      observedSourceSiteKeys,
      paperProof: paper.proof,
      pendingRafCount: animation.pending.size,
      qaReadbackCount: state.qaReadbackCount,
      qaReadbackMode: "native-existing-2d-context" as const,
      roleBackgroundNeighborPixelCount: passingSiteEvidence.reduce(
        (sum, site) => sum + site.backgroundNeighborPixelCount,
        0
      ),
      roleConnectedCorePixelCount: passingSiteEvidence.reduce(
        (sum, site) => sum + site.largestConnectedCorePixelCount,
        0
      ),
      roleCorePixelCount: passingSiteEvidence.reduce((sum, site) => sum + site.corePixelCount, 0),
      runtimeCanvasId: state.runtimeCanvasId,
      siteEvidence: passingSiteEvidence,
      sourcePaintRevision: state.sequence,
      terminalRasterSha256
    };
  }

  function browserSemanticEvidenceIssues(evidence: CaliforniaCanvasGraphicsStateEvidence) {
    const issues: string[] = [];
    if (evidence.runtimeVersion !== 1 || evidence.runtimeRunId !== config.runtimeRunId ||
        evidence.sourceContractSha256 !== config.sourceContractSha256 ||
        evidence.sourceProductSha256 !== config.sourceProductSha256 ||
        evidence.sourceExpectedEssentialCount !== config.sourceExpectedEssentialCount ||
        evidence.sourceExpectedEssentialDigest !== config.sourceExpectedEssentialDigest ||
        evidence.rootRuntimeId < 1 || !evidence.captureFenceSignature.trim()) {
      issues.push("state-contract-or-capture-identity");
    }
    issues.push(...evidence.issues.map((issue) => `state:${issue}`));
    const observed = evidence.observedSourceSiteKeys;
    if (observed.length === 0 || evidence.observedSourceSiteCount !== observed.length ||
        new Set(observed).size !== observed.length ||
        JSON.stringify(observed) !== JSON.stringify(observed.slice().sort())) {
      issues.push("state-essential-source-site-set");
    }
    const canvasUnion = new Set<string>();
    const benchIds = new Set<string>();
    for (const canvas of evidence.canvases) {
      benchIds.add(canvas.benchId);
      issues.push(...canvas.issues.map((issue) => `${canvas.bindingKey}:${issue}`));
      if (canvas.latestClearEpoch < 1 || !canvas.latestClearWasFull) {
        issues.push(`${canvas.bindingKey}:missing-full-clear-epoch`);
      }
      if (canvas.pendingRafCount !== 0 ||
          canvas.latestPaintRafEpoch > canvas.latestSettledRafEpoch) {
        issues.push(`${canvas.bindingKey}:raf-not-settled`);
      }
      if (canvas.paperProof.expectedPaperColor !== "#fbfbf8" ||
          !canvas.paperProof.paperOpaque ||
          canvas.paperProof.effectiveOpaqueBackgroundColor !== "rgb(251, 251, 248)" ||
          canvas.paperProof.canvasBackgroundImage !== "none" ||
          canvas.paperProof.compositingLayers.length < 2) {
        issues.push(`${canvas.bindingKey}:paper-proof`);
      }
      const paperLayers = canvas.paperProof.compositingLayers.filter((layer) =>
        layer.withinPaperStack
      );
      if (paperLayers.length < 2 ||
          paperLayers.filter((layer) => layer.isPaperSurface).length !== 1 ||
          paperLayers.some((layer) =>
            layer.opacity !== 1 || layer.filter !== "none" ||
            layer.backdropFilter !== "none" || layer.mixBlendMode !== "normal" ||
            layer.maskImage !== "none"
          ) || paperLayers.some((layer) =>
            layer.backgroundImage !== "none" || layer.boxShadow !== "none" ||
            (layer.backgroundColor !== "rgba(0, 0, 0, 0)" &&
              layer.backgroundColor !== "transparent" &&
              layer.backgroundColor !== "rgb(251, 251, 248)")
          )) {
        issues.push(`${canvas.bindingKey}:paper-layer-proof`);
      }
      if (canvas.compositedOpaquePixelRatio !== 1 ||
          canvas.qaReadbackMode !== "native-existing-2d-context" ||
          canvas.sourcePaintRevision < 1 ||
          canvas.qaReadbackCount < canvas.sourcePaintRevision * 2 + 1 ||
          !/^[0-9a-f]{64}$/.test(canvas.terminalRasterSha256)) {
        issues.push(`${canvas.bindingKey}:raster-or-revision-proof`);
      }
      const canvasKeys = canvas.observedSourceSiteKeys;
      if (canvasKeys.length === 0 || canvas.observedSourceSiteCount !== canvasKeys.length ||
          new Set(canvasKeys).size !== canvasKeys.length ||
          JSON.stringify(canvasKeys) !== JSON.stringify(canvasKeys.slice().sort()) ||
          JSON.stringify(canvas.siteEvidence.map((site) => site.sourceSiteKey).sort()) !==
            JSON.stringify(canvasKeys)) {
        issues.push(`${canvas.bindingKey}:canvas-essential-source-site-set`);
      }
      for (const site of canvas.siteEvidence) {
        canvasUnion.add(site.sourceSiteKey);
        const expected = expectedSites.get(site.sourceSiteKey);
        if (!expected || expected.role !== "essential" ||
            expected.contextKey !== canvas.bindingKey || expected.operation !== site.operation ||
            site.role !== "essential") {
          issues.push(`${canvas.bindingKey}:source-site-identity:${site.sourceSiteKey}`);
        }
        if (site.minimumCoreContrastRatio < 3 ||
            site.largestConnectedCorePixelCount < 4 ||
            site.corePixelCoverageRatio < 0.5 ||
            Math.abs(site.corePixelCoverageRatio -
              (site.terminalVisiblePixelCount > 0
                ? site.corePixelCount / site.terminalVisiblePixelCount
                : 0)) > 1e-9 ||
            site.backgroundNeighborPixelCount < 1 ||
            site.invocationCount < 1 || site.clearEpoch !== canvas.latestClearEpoch ||
            site.latestRafEpoch > canvas.latestSettledRafEpoch ||
            site.changedPixelCount < site.terminalVisiblePixelCount ||
            site.terminalVisiblePixelCount < site.largestConnectedCorePixelCount ||
            site.corePixelCount < site.largestConnectedCorePixelCount) {
          issues.push(`${canvas.bindingKey}:site-semantic:${site.sourceSiteKey}`);
        }
      }
      const minimum = canvas.siteEvidence.length > 0
        ? Math.min(...canvas.siteEvidence.map((site) => site.minimumCoreContrastRatio))
        : 0;
      if (Math.abs(canvas.minimumNumericNonTextContrastRatio - minimum) > 1e-9 ||
          canvas.sourcePaintRevision < canvas.siteEvidence.reduce(
            (sum, site) => sum + site.invocationCount,
            0
          ) ||
          canvas.roleCorePixelCount !== canvas.siteEvidence.reduce(
            (sum, site) => sum + site.corePixelCount,
            0
          ) ||
          canvas.roleConnectedCorePixelCount !== canvas.siteEvidence.reduce(
            (sum, site) => sum + site.largestConnectedCorePixelCount,
            0
          ) ||
          canvas.roleBackgroundNeighborPixelCount !== canvas.siteEvidence.reduce(
            (sum, site) => sum + site.backgroundNeighborPixelCount,
            0
          )) {
        issues.push(`${canvas.bindingKey}:canvas-aggregate-proof`);
      }
    }
    if (evidence.canvases.length === 0 || benchIds.size !== 1 ||
        JSON.stringify([...canvasUnion].sort()) !== JSON.stringify(observed)) {
      issues.push("state-canvas-union-or-bench");
    }
    const benchId = evidence.canvases[0]?.benchId;
    const benchExpected = benchId ? config.benchExpectedEssential[benchId] : null;
    if (!benchExpected || evidence.benchExpectedEssentialCount !== benchExpected.count ||
        evidence.benchExpectedEssentialDigest !== benchExpected.digest) {
      issues.push("bench-expected-essential-contract");
    }
    return [...new Set(issues)];
  }

  function contrastConsumptionCurrentIssues(
    consumption: ContrastConsumptionState,
    requireAllConsumed: boolean
  ) {
    const issues: string[] = [];
    const evidence = consumption.evidence;
    const benchId = evidence.canvases[0]?.benchId ?? "";
    if (!consumption.root.isConnected || rootRuntimeId(consumption.root) !== evidence.rootRuntimeId) {
      issues.push("capture-root-drift");
    }
    if (evidence.capturedUrl !== location.href) issues.push("captured-url-drift");
    if (evidence.capturedAtEpochMs > Date.now() + 1_000 ||
        Date.now() - evidence.capturedAtEpochMs > 15_000) {
      issues.push("evidence-stale");
    }
    for (const registration of consumption.registrations) {
      const { canvas, canvasEvidence, state, terminalPixels } = registration;
      const rect = canvas.getBoundingClientRect();
      const animation = animationState(canvasEvidence.benchId);
      if ((!consumption.root.contains(canvas) && consumption.root !== canvas) ||
          statesByCanvas.get(canvas) !== state || statesByContext.get(state.context) !== state) {
        issues.push(`canvas-root-or-state-drift:${canvasEvidence.runtimeCanvasId}`);
      }
      if (state.sequence !== canvasEvidence.sourcePaintRevision ||
          state.clearEpoch !== canvasEvidence.latestClearEpoch || animation.pending.size > 0 ||
          animation.latestSettledEpoch !== canvasEvidence.latestSettledRafEpoch) {
        issues.push(`source-revision-or-epoch-drift:${canvasEvidence.runtimeCanvasId}`);
      }
      if (canvas.width !== canvasEvidence.backingWidth ||
          canvas.height !== canvasEvidence.backingHeight ||
          Math.abs(rect.width - canvasEvidence.cssWidth) > 0.5 ||
          Math.abs(rect.height - canvasEvidence.cssHeight) > 0.5) {
        issues.push(`canvas-dimensions-drift:${canvasEvidence.runtimeCanvasId}`);
      }
      if (!terminalPixelSnapshotMatches(terminalPixels)) {
        issues.push(`terminal-raster-drift:${canvasEvidence.runtimeCanvasId}`);
      }
    }
    const currentStates = [
      ...(consumption.root instanceof HTMLCanvasElement ? [consumption.root] : []),
      ...Array.from(consumption.root.querySelectorAll<HTMLCanvasElement>("canvas"))
    ].flatMap((canvas) => {
      const state = statesByCanvas.get(canvas);
      return state && state.bindingKey.startsWith(`${benchId}/`) ? [state] : [];
    });
    if (captureFenceSignature(consumption.root, benchId, currentStates) !==
        evidence.captureFenceSignature) {
      issues.push("capture-fence-drift");
    }
    if (requireAllConsumed) {
      const expected = consumption.registrations.map((registration) =>
        registration.canvasEvidence.runtimeCanvasId
      ).sort((left, right) => left - right);
      const actual = [...consumption.consumedCanvasIds].sort((left, right) => left - right);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        issues.push("contrast-canvas-set-not-fully-consumed");
      }
    }
    return [...new Set(issues)];
  }

  function markContrastConsumptionReady(consumption: ContrastConsumptionState) {
    if (consumption.status !== "pending" ||
        consumption.consumedCanvasIds.size !== consumption.registrations.length) return;
    const issues = contrastConsumptionCurrentIssues(consumption, true);
    if (issues.length > 0) {
      consumption.rejectedReasons.push(...issues);
      consumption.status = "rejected";
      return;
    }
    consumption.contrastConsumedAtEpochMs = Date.now();
    consumption.contrastConsumedAtPerformanceMs = performance.now();
    consumption.status = "ready";
  }

  function installIntoCanvasAudit() {
    const canvasApi = runtimeWindow.__californiaCanvasTextAudit;
    if (!canvasApi || canvasApi.version !== 4) return false;
    if (patchedCanvasAudit === canvasApi) return true;
    const original = canvasApi.contrastSurfaceOutcomes.bind(canvasApi);
    canvasApi.contrastSurfaceOutcomes = (root, options = {}) =>
      original(root, options).map((outcome) => {
        if (outcome.contextKind !== "2d") return outcome;
        const pending = pendingContrastByCanvas.get(outcome.canvas);
        if (!pending) return outcome;
        pendingContrastByCanvas.delete(outcome.canvas);
        const rect = outcome.canvas.getBoundingClientRect();
        const reasons: string[] = [];
        const consumption = pending.consumption;
        if (consumption.status !== "pending") reasons.push("contrast-consumption-not-pending");
        if (root !== pending.root || rootRuntimeId(root) !== pending.evidence.rootRuntimeId) {
          reasons.push("capture-root-drift");
        }
        if (pending.evidence.capturedUrl !== location.href) reasons.push("captured-url-drift");
        if (performance.now() - pending.registeredAt > 15_000) reasons.push("evidence-stale");
        const animation = animationState(pending.canvasEvidence.benchId);
      if (pending.state.sequence !== pending.canvasEvidence.sourcePaintRevision ||
            pending.state.clearEpoch !== pending.canvasEvidence.latestClearEpoch ||
            animation.pending.size > 0 ||
            animation.latestSettledEpoch !== pending.canvasEvidence.latestSettledRafEpoch) {
          reasons.push("source-revision-or-epoch-drift");
        }
        if (outcome.canvas.width !== pending.canvasEvidence.backingWidth ||
            outcome.canvas.height !== pending.canvasEvidence.backingHeight ||
            Math.abs(rect.width - pending.canvasEvidence.cssWidth) > 0.5 ||
            Math.abs(rect.height - pending.canvasEvidence.cssHeight) > 0.5) {
          reasons.push("canvas-dimensions-drift");
        }
        if (pending.canvasEvidence.issues.length > 0 || pending.evidence.issues.length > 0) {
          reasons.push("structured-evidence-has-issues");
        }
        const currentStates = [
          ...(root instanceof HTMLCanvasElement ? [root] : []),
          ...Array.from(root.querySelectorAll<HTMLCanvasElement>("canvas"))
        ].flatMap((canvas) => {
          const state = statesByCanvas.get(canvas);
          return state && state.bindingKey.startsWith(`${pending.canvasEvidence.benchId}/`)
            ? [state]
            : [];
        });
        if (captureFenceSignature(root, pending.canvasEvidence.benchId, currentStates) !==
            pending.evidence.captureFenceSignature) {
          reasons.push("capture-fence-drift");
        }
        if (!terminalPixelSnapshotMatches(pending.terminalPixels)) {
          reasons.push("terminal-raster-drift");
        }
        if (reasons.length > 0) {
          consumption.rejectedReasons.push(...reasons);
          consumption.status = "rejected";
          return {
            ...outcome,
            hasExecutableNonTextEvidence: false,
            unsupportedReasons: [
              ...outcome.unsupportedReasons,
              `California 2D graphics evidence rejected: ${reasons.join(",")}`
            ]
          };
        }
        consumption.consumedCanvasIds.add(pending.canvasEvidence.runtimeCanvasId);
        markContrastConsumptionReady(consumption);
        return {
          ...outcome,
          hasExecutableNonTextEvidence: true,
          unsupportedReasons: outcome.unsupportedReasons.filter((reason) =>
            reason !== "Essential 2D Canvas geometry has no executable actual-paint/destination non-text contrast provider" &&
            reason !== "Visible 2D Canvas has neither recorded text contrast evidence nor an executable non-text contrast provider"
          )
        };
      });
    patchedCanvasAudit = canvasApi;
    return true;
  }

  const api: RuntimePageApi = {
    version: 1,
    registerContext(bindingKey, context) {
      const binding = expectedBindings.get(bindingKey);
      if (!binding) throw new Error(`california-canvas-binding-unknown:${bindingKey}`);
      if (!(context instanceof CanvasRenderingContext2D)) {
        throw new Error(`california-canvas-2d-context-required:${bindingKey}`);
      }
      const existing = statesByContext.get(context);
      if (existing) {
        if (existing.bindingKey !== bindingKey) {
          throw new Error(`california-canvas-context-reused:${existing.bindingKey}->${bindingKey}`);
        }
        return context;
      }
      const state: CanvasState = {
        bindingKey,
        canvas: context.canvas,
        context,
        clearEpoch: 0,
        clipBounds: null,
        clipCoverage: "none",
        lastActivityAt: performance.now(),
        latestClearWasFull: false,
        latestPaintRafEpoch: 0,
        pathBounds: null,
        pathCanProveFullCanvasRect: false,
        pathOperationCount: 0,
        qaReadbackCount: 0,
        runtimeCanvasId: nextCanvasId++,
        sequence: 0,
        siteAggregates: new Map(),
        stack: [],
        unsupportedReasons: [],
        writerMap: new Uint32Array(context.canvas.width * context.canvas.height),
        writerSiteBySequence: new Map()
      };
      statesByContext.set(context, state);
      statesByCanvas.set(context.canvas, state);
      allStates.add(state);
      return context;
    },
    invoke(sourceSiteKey, context, operation, thunk) {
      const expected = expectedSites.get(sourceSiteKey);
      const state = statesByContext.get(context);
      if (!expected) throw new Error(`california-canvas-source-site-unknown:${sourceSiteKey}`);
      if (!state) throw new Error(`california-canvas-context-unregistered:${sourceSiteKey}`);
      if (expected.contextKey !== state.bindingKey || expected.operation !== operation) {
        throw new Error(`california-canvas-source-site-misattributed:${sourceSiteKey}`);
      }
      if (activeInvocation) throw new Error("california-canvas-nested-terminal-invocation");
      const invocation: ActiveInvocation = { context, expected, observedCount: 0 };
      activeInvocation = invocation;
      try {
        const result = thunk();
        if (invocation.observedCount !== 1) {
          throw new Error(
            `california-canvas-terminal-call-count:${sourceSiteKey}:${invocation.observedCount}`
          );
        }
        return result;
      } finally {
        activeInvocation = null;
      }
    },
    requestAnimationFrame(benchId, callback) {
      const state = animationState(benchId);
      const epoch = ++state.latestScheduledEpoch;
      state.lastActivityAt = performance.now();
      const handle = window.requestAnimationFrame((timestamp) => {
        state.pending.delete(handle);
        state.activeEpoch = epoch;
        state.lastActivityAt = performance.now();
        try {
          callback(timestamp);
        } finally {
          state.latestSettledEpoch = Math.max(state.latestSettledEpoch, epoch);
          state.activeEpoch = 0;
          state.lastActivityAt = performance.now();
        }
      });
      state.pending.set(handle, epoch);
      return handle;
    },
    cancelAnimationFrame(benchId, handle) {
      const state = animationState(benchId);
      const epoch = state.pending.get(handle);
      window.cancelAnimationFrame(handle);
      state.pending.delete(handle);
      if (epoch != null) state.latestSettledEpoch = Math.max(state.latestSettledEpoch, epoch);
      state.lastActivityAt = performance.now();
    },
    settlement(benchId) {
      const animation = animationState(benchId);
      const states = [...allStates].filter((state) => state.bindingKey.startsWith(`${benchId}/`));
      const lastActivityAt = Math.max(animation.lastActivityAt, ...states.map((state) => state.lastActivityAt));
      return {
        activityAgeMs: performance.now() - lastActivityAt,
        latestSettledRafEpoch: animation.latestSettledEpoch,
        pendingRafCount: animation.pending.size,
        registeredCanvasCount: states.filter((state) => state.canvas.isConnected).length,
        signature: [
          animation.latestSettledEpoch,
          animation.pending.size,
          ...states.map((state) => `${state.bindingKey}:${state.clearEpoch}:${state.sequence}`)
        ].join("|")
      };
    },
    async collect(root, request) {
      if (!request.benchId.trim() || !request.stateKey.trim() || !request.surfaceKey.trim()) {
        throw new Error("california-canvas-graphics-collection-identity-required");
      }
      const benchExpected = config.benchExpectedEssential[request.benchId];
      if (!benchExpected) throw new Error(`california-canvas-bench-not-configured:${request.benchId}`);
      const animation = animationState(request.benchId);
      if (animation.pending.size > 0) throw new Error("california-canvas-graphics-raf-not-settled");
      const rootCanvases = [
        ...(root instanceof HTMLCanvasElement ? [root] : []),
        ...Array.from(root.querySelectorAll<HTMLCanvasElement>("canvas"))
      ];
      const states = rootCanvases.flatMap((canvas) => {
        const state = statesByCanvas.get(canvas);
        return state && state.bindingKey.startsWith(`${request.benchId}/`) ? [state] : [];
      });
      const stateIssues: string[] = [];
      if (states.length === 0) stateIssues.push("registered-visible-canvas-missing");
      const pixelSnapshots = states.map(captureTerminalPixelSnapshot);
      const captureFenceBefore = captureFenceSignature(root, request.benchId, states);
      const canvases = await Promise.all(states.map((state, index) =>
        canvasEvidence(state, rootCanvases, request.benchId, pixelSnapshots[index])
      ));
      const observedSourceSiteKeys = [...new Set(canvases.flatMap((canvas) =>
        canvas.observedSourceSiteKeys
      ))].sort();
      const capturedAtEpochMs = Date.now();
      const capturedAtPerformanceMs = performance.now();
      const receiptId = `${runtimeSessionId}-${nextReceiptSequence++}-${capturedAtEpochMs.toString(16)}`;
      const withoutHash: Omit<CaliforniaCanvasGraphicsStateEvidence, "evidenceSha256"> = {
        benchExpectedEssentialCount: benchExpected.count,
        benchExpectedEssentialDigest: benchExpected.digest,
        capturedAtEpochMs,
        capturedAtPerformanceMs,
        capturedUrl: location.href,
        captureFenceSignature: captureFenceBefore,
        canvases,
        issues: stateIssues,
        observedSourceSiteCount: observedSourceSiteKeys.length,
        observedSourceSiteDigest: await browserSha256(observedSourceSiteKeys.join("\n")),
        observedSourceSiteKeys,
        receiptId,
        rootRuntimeId: rootRuntimeId(root),
        runtimeRunId: config.runtimeRunId,
        runtimeSessionId,
        runtimeVersion: 1,
        sourceContractSha256: config.sourceContractSha256,
        sourceExpectedEssentialCount: config.sourceExpectedEssentialCount,
        sourceExpectedEssentialDigest: config.sourceExpectedEssentialDigest,
        sourceProductSha256: config.sourceProductSha256,
        stateKey: request.stateKey,
        surfaceKey: request.surfaceKey
      };
      const evidence: CaliforniaCanvasGraphicsStateEvidence = {
        ...withoutHash,
        evidenceSha256: await browserSha256(browserStableSerialize(withoutHash))
      };
      const captureFenceAfter = captureFenceSignature(root, request.benchId, states);
      if (captureFenceAfter !== captureFenceBefore) {
        throw new Error("california-canvas-graphics-capture-fence-drift");
      }
      if (pixelSnapshots.some((snapshot) => !terminalPixelSnapshotMatches(snapshot))) {
        throw new Error("california-canvas-graphics-terminal-raster-drift");
      }
      issuedEvidence.set(receiptId, {
        canvases: states.map((state) => state.canvas),
        evidence,
        pixelSnapshots,
        registered: false,
        root
      });
      return evidence;
    },
    registerForContrast(root, receiptId, evidenceSha256) {
      const issued = issuedEvidence.get(receiptId);
      if (!issued || issued.registered || issued.evidence.evidenceSha256 !== evidenceSha256) {
        throw new Error("california-canvas-graphics-one-shot-registration-rejected");
      }
      if (issued.root !== root || rootRuntimeId(root) !== issued.evidence.rootRuntimeId) {
        throw new Error("california-canvas-graphics-registration-root-mismatch");
      }
      const semanticIssues = browserSemanticEvidenceIssues(issued.evidence);
      if (semanticIssues.length > 0) {
        throw new Error(
          `california-canvas-graphics-semantic-registration-rejected:${semanticIssues.join(",")}`
        );
      }
      if (!installIntoCanvasAudit()) throw new Error("california-canvas-text-audit-v4-required");
      const registrations = issued.canvases.map((canvas) => {
        if (!root.contains(canvas) && root !== canvas) {
          throw new Error("california-canvas-graphics-registration-root-mismatch");
        }
        const state = statesByCanvas.get(canvas);
        if (!state) throw new Error("california-canvas-graphics-registration-state-missing");
        const canvasEvidence = issued.evidence.canvases.find((candidate) =>
          candidate.runtimeCanvasId === state.runtimeCanvasId
        );
        if (!canvasEvidence) throw new Error("california-canvas-graphics-canvas-evidence-missing");
        const terminalPixels = issued.pixelSnapshots.find((snapshot) =>
          snapshot.canvas === canvas
        );
        if (!terminalPixels || !terminalPixelSnapshotMatches(terminalPixels)) {
          throw new Error("california-canvas-graphics-registration-terminal-raster-drift");
        }
        const animation = animationState(canvasEvidence.benchId);
        if (state.sequence !== canvasEvidence.sourcePaintRevision ||
            state.clearEpoch !== canvasEvidence.latestClearEpoch ||
            animation.pending.size > 0 ||
            animation.latestSettledEpoch !== canvasEvidence.latestSettledRafEpoch ||
            issued.evidence.capturedUrl !== location.href ||
            issued.evidence.capturedAtEpochMs > Date.now() + 1_000 ||
            Date.now() - issued.evidence.capturedAtEpochMs > 15_000) {
          throw new Error("california-canvas-graphics-registration-stale");
        }
        if (pendingContrastByCanvas.has(canvas)) {
          throw new Error("california-canvas-graphics-contrast-registration-already-pending");
        }
        return { canvas, canvasEvidence, state, terminalPixels };
      });
      const currentFence = captureFenceSignature(
        root,
        registrations[0]?.canvasEvidence.benchId ?? "",
        registrations.map((registration) => registration.state)
      );
      if (currentFence !== issued.evidence.captureFenceSignature) {
        throw new Error("california-canvas-graphics-registration-capture-fence-drift");
      }
      if (contrastConsumptionByReceipt.has(receiptId)) {
        throw new Error("california-canvas-graphics-contrast-consumption-already-exists");
      }
      const consumption: ContrastConsumptionState = {
        ackNonce: randomHex(32),
        consumedCanvasIds: new Set(),
        contrastConsumedAtEpochMs: 0,
        contrastConsumedAtPerformanceMs: 0,
        evidence: issued.evidence,
        finalCompositor: null,
        registrations,
        rejectedReasons: [],
        root,
        status: "pending"
      };
      contrastConsumptionByReceipt.set(receiptId, consumption);
      for (const { canvas, canvasEvidence, state, terminalPixels } of registrations) {
        pendingContrastByCanvas.set(canvas, {
          canvasEvidence,
          consumption,
          evidence: issued.evidence,
          registeredAt: performance.now(),
          root,
          state,
          terminalPixels
        });
      }
      issued.registered = true;
      issuedEvidence.delete(receiptId);
    },
    async assertFinalCompositorEnvironment(root, request) {
      const consumption = contrastConsumptionByReceipt.get(request.receiptId);
      if (!consumption || consumption.root !== root || consumption.status !== "capturing" ||
          !consumption.finalCompositor ||
          consumption.finalCompositor.captureToken !== request.captureToken ||
          !/^(?:before|after)-screenshot-[0-9]+$/.test(request.stage)) {
        throw new Error(
          "california-canvas-final-compositor-paint-environment-checkpoint-identity-mismatch"
        );
      }
      const prepared = consumption.finalCompositor;
      await assertPaintEnvironmentUnchanged(prepared.paintEnvironment, request.stage);
      prepared.mutations.push(...prepared.mutationObserver.takeRecords());
      const blockingMutations = compositorBlockingMutations(prepared.mutations);
      if (blockingMutations.length > 0 ||
          prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch) {
        throw new Error(
          "california-canvas-final-compositor-page-mutation-during-environment-checkpoint:" +
          browserStableSerialize({
            mutations: blockingMutations.slice(0, 16).map(compositorMutationDiagnostic),
            observedMutationCount: prepared.mutations.length,
            shadowAttachmentEpochAfter: shadowAttachmentEpoch,
            shadowAttachmentEpochBefore: prepared.shadowAttachmentEpoch
          })
        );
      }
    },
    async prepareFinalCompositor(root, request) {
      const consumption = contrastConsumptionByReceipt.get(request.receiptId);
      if (!consumption || consumption.status !== "ready") {
        throw new Error(
          "california-canvas-graphics-contrast-consume-ack-not-ready:final-compositor-prepare"
        );
      }
      const evidence = consumption.evidence;
      if (consumption.root !== root || rootRuntimeId(root) !== evidence.rootRuntimeId ||
          request.evidenceSha256 !== evidence.evidenceSha256 ||
          request.runtimeRunId !== evidence.runtimeRunId ||
          request.stateKey !== evidence.stateKey || request.surfaceKey !== evidence.surfaceKey) {
        throw new Error(
          "california-canvas-graphics-contrast-consume-ack-identity-mismatch:" +
          "final-compositor-prepare"
        );
      }
      const preIssues = contrastConsumptionCurrentIssues(consumption, true);
      if (preIssues.length > 0 || consumption.rejectedReasons.length > 0) {
        consumption.rejectedReasons.push(...preIssues);
        consumption.status = "rejected";
        throw new Error(
          `california-canvas-graphics-final-compositor-prepare-stale:${[
            ...consumption.rejectedReasons
          ].join(",")}`
        );
      }
      const mutations: MutationRecord[] = [];
      const mutationObserver = new MutationObserver((records) => mutations.push(...records));
      const mutationOptions: MutationObserverInit = {
        attributeOldValue: true,
        attributes: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true
      };
      const preparedShadowAttachmentEpoch = shadowAttachmentEpoch;
      try {
        consumption.status = "capturing";
        mutationObserver.observe(document.documentElement, mutationOptions);
        for (const shadowRoot of retainedShadowRoots) {
          mutationObserver.observe(shadowRoot, mutationOptions);
        }
        const preparedPaintEnvironment = await capturePaintEnvironmentSnapshot("prepare");
        const ordered = consumption.registrations.slice().sort((left, right) =>
          left.canvasEvidence.domCanvasIndex - right.canvasEvidence.domCanvasIndex
        );
        const captureToken = randomHex(32);
        const prepared = await Promise.all(ordered.map(async (registration) => {
          const geometry = boundedCompositorGeometry(registration);
          const layoutFence = compositorLayoutFence(root, registration.canvas);
          const paintFence = await compositorPaintFence(root, registration.canvas);
          const layoutFenceBeforeSha256 = await browserSha256(browserStableSerialize({
            layoutFence,
            paintFence
          }));
          const postIssues = contrastConsumptionCurrentIssues(consumption, true);
          if (postIssues.length > 0) {
            throw new Error(
              `california-canvas-graphics-final-compositor-plan-stale:${postIssues.join(",")}`
            );
          }
          const plan: CaliforniaCanvasGraphicsFinalCompositorCapturePlan["canvases"][number] = {
            backingSize: {
              height: registration.canvasEvidence.backingHeight,
              width: registration.canvasEvidence.backingWidth
            },
            bindingKey: registration.canvasEvidence.bindingKey,
            canvasIdentity: registration.canvasEvidence.canvasIdentity,
            canvasPageRect: geometry.canvasPageRect,
            captureScrollOffset: geometry.captureScrollOffset,
            captureViewportClip: geometry.captureViewportClip,
            captureViewportSize: geometry.captureViewportSize,
            capturedUrl: evidence.capturedUrl,
            clip: geometry.clip,
            cssSize: {
              height: registration.canvasEvidence.cssHeight,
              width: registration.canvasEvidence.cssWidth
            },
            deviceScaleFactor: devicePixelRatio,
            domCanvasIndex: registration.canvasEvidence.domCanvasIndex,
            evidenceSha256: evidence.evidenceSha256,
            layoutFenceBeforeSha256,
            paintEnvironment: preparedPaintEnvironment,
            receiptId: evidence.receiptId,
            runtimeCanvasId: registration.canvasEvidence.runtimeCanvasId,
            sourcePaintRevision: registration.canvasEvidence.sourcePaintRevision,
            stateKey: evidence.stateKey,
            surfaceKey: evidence.surfaceKey,
            terminalRasterSha256: registration.canvasEvidence.terminalRasterSha256,
            version: 5
          };
          return {
            layoutFence,
            paintFence,
            plan,
            registration
          };
        }));
        const finalIssues = contrastConsumptionCurrentIssues(consumption, true);
        const finalPaintFences = await Promise.all(prepared.map((entry) =>
          compositorPaintFence(root, entry.registration.canvas)
        ));
        await assertPaintEnvironmentUnchanged(
          preparedPaintEnvironment,
          "prepare-finalize"
        );
        mutations.push(...mutationObserver.takeRecords());
        const blockingMutations = compositorBlockingMutations(mutations);
        if (finalIssues.length > 0 || evidence.capturedUrl !== location.href ||
            blockingMutations.length > 0 ||
            preparedShadowAttachmentEpoch !== shadowAttachmentEpoch ||
            prepared.some((entry, index) =>
              compositorLayoutFence(root, entry.registration.canvas) !== entry.layoutFence ||
              finalPaintFences[index] !== entry.paintFence
            )) {
          throw new Error(
            "california-canvas-graphics-final-compositor-prepare-fence-drift:" +
            `${finalIssues.join(",")}:mutations=${blockingMutations.length}:` +
            `observed=${mutations.length}:` +
            `shadow=${preparedShadowAttachmentEpoch}->${shadowAttachmentEpoch}`
          );
        }
        consumption.finalCompositor = {
          canvases: prepared,
          captureToken,
          mutationObserver,
          mutations,
          paintEnvironment: preparedPaintEnvironment,
          confirmedCanvasIds: new Set(),
          shadowAttachmentEpoch: preparedShadowAttachmentEpoch
        };
        return { captureToken, canvases: prepared.map((entry) => entry.plan) };
      } catch (error) {
        mutationObserver.disconnect();
        consumption.finalCompositor = null;
        consumption.status = "rejected";
        contrastConsumptionByReceipt.delete(evidence.receiptId);
        throw error;
      }
    },
    async confirmFinalCompositorReference(root, request) {
      const consumption = contrastConsumptionByReceipt.get(request.receiptId);
      if (!consumption || consumption.root !== root || consumption.status !== "capturing" ||
          !consumption.finalCompositor ||
          consumption.finalCompositor.captureToken !== request.captureToken) {
        throw new Error("california-canvas-final-compositor-confirm-identity-mismatch");
      }
      const prepared = consumption.finalCompositor;
      if (prepared.confirmedCanvasIds.has(request.runtimeCanvasId)) {
        throw new Error("california-canvas-final-compositor-confirm-not-one-shot");
      }
      const entry = prepared.canvases.find((candidate) =>
        candidate.registration.canvasEvidence.runtimeCanvasId === request.runtimeCanvasId
      );
      if (!entry) throw new Error("california-canvas-final-compositor-confirm-canvas-missing");
      await assertPaintEnvironmentUnchanged(prepared.paintEnvironment, "reference-confirm-before");
      prepared.mutations.push(...prepared.mutationObserver.takeRecords());
      if (compositorBlockingMutations(prepared.mutations).length > 0 ||
          prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch ||
          !terminalPixelSnapshotMatches(entry.registration.terminalPixels) ||
          compositorLayoutFence(root, entry.registration.canvas) !== entry.layoutFence ||
          await compositorPaintFence(root, entry.registration.canvas) !== entry.paintFence) {
        throw new Error("california-canvas-final-compositor-confirm-precondition-drift");
      }
      const snapshot = entry.registration.terminalPixels;
      if (!terminalPixelSnapshotMatches(snapshot) ||
          compositorLayoutFence(root, entry.registration.canvas) !== entry.layoutFence ||
          await compositorPaintFence(root, entry.registration.canvas) !== entry.paintFence) {
        throw new Error("california-canvas-final-compositor-confirm-terminal-raster-drift");
      }
      await assertPaintEnvironmentUnchanged(prepared.paintEnvironment, "reference-confirm-after");
      prepared.mutations.push(...prepared.mutationObserver.takeRecords());
      if (compositorBlockingMutations(prepared.mutations).length > 0 ||
          prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch) {
        throw new Error("california-canvas-final-compositor-confirm-environment-drift");
      }
      prepared.confirmedCanvasIds.add(request.runtimeCanvasId);
    },
    rejectFinalCompositor(root, request) {
      const consumption = contrastConsumptionByReceipt.get(request.receiptId);
      if (!consumption || consumption.root !== root || consumption.status !== "capturing" ||
          consumption.finalCompositor?.captureToken !== request.captureToken) {
        throw new Error("california-canvas-final-compositor-reject-identity-mismatch");
      }
      consumption.finalCompositor.mutationObserver.disconnect();
      consumption.finalCompositor = null;
      consumption.status = "rejected";
      contrastConsumptionByReceipt.delete(request.receiptId);
    },
    async takeContrastConsumeAck(root, request) {
      const consumption = contrastConsumptionByReceipt.get(request.receiptId);
      if (!consumption) {
        throw new Error("california-canvas-graphics-contrast-consume-ack-not-ready");
      }
      const evidence = consumption.evidence;
      if (consumption.root !== root || rootRuntimeId(root) !== evidence.rootRuntimeId ||
          request.evidenceSha256 !== evidence.evidenceSha256 ||
          request.runtimeRunId !== evidence.runtimeRunId ||
          request.stateKey !== evidence.stateKey || request.surfaceKey !== evidence.surfaceKey) {
        throw new Error("california-canvas-graphics-contrast-consume-ack-identity-mismatch");
      }
      if (consumption.status !== "capturing" || !consumption.finalCompositor) {
        throw new Error("california-canvas-graphics-contrast-consume-ack-not-ready");
      }
      const preIssues = contrastConsumptionCurrentIssues(consumption, true);
      if (preIssues.length > 0 || consumption.rejectedReasons.length > 0) {
        consumption.rejectedReasons.push(...preIssues);
        consumption.finalCompositor.mutationObserver.disconnect();
        consumption.finalCompositor = null;
        consumption.status = "rejected";
        throw new Error(
          `california-canvas-graphics-contrast-consume-ack-stale:${[
            ...consumption.rejectedReasons
          ].join(",")}`
        );
      }
      try {
        const prepared = consumption.finalCompositor;
        await assertPaintEnvironmentUnchanged(
          prepared.paintEnvironment,
          "browser-finalize-start"
        );
        prepared.mutations.push(...prepared.mutationObserver.takeRecords());
        if (compositorBlockingMutations(prepared.mutations).length > 0 ||
            prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch) {
          throw new Error("california-canvas-final-compositor-page-mutation-during-capture");
        }
        if (request.finalCompositorResults.length !== prepared.canvases.length ||
            new Set(request.finalCompositorResults.map((result) => result.runtimeCanvasId)).size !==
              prepared.canvases.length ||
            prepared.confirmedCanvasIds.size !== prepared.canvases.length) {
          throw new Error("california-canvas-final-compositor-result-set-mismatch");
        }
        const finalProofs = await Promise.all(prepared.canvases.map(async (entry) => {
          const result = request.finalCompositorResults.find((candidate) =>
            candidate.runtimeCanvasId === entry.registration.canvasEvidence.runtimeCanvasId
          );
          if (!result || result.captureToken !== prepared.captureToken) {
            throw new Error("california-canvas-final-compositor-result-identity-mismatch");
          }
          if (!prepared.confirmedCanvasIds.has(result.runtimeCanvasId)) {
            throw new Error("california-canvas-final-compositor-reference-confirmation-missing");
          }
          const referenceDecoded = await decodeCompositorPng(result.referencePngBase64);
          const decoded = await decodeCompositorPng(result.compositorPngBase64);
          if (referenceDecoded.width !== entry.plan.clip.width ||
              referenceDecoded.height !== entry.plan.clip.height ||
              decoded.width !== entry.plan.clip.width || decoded.height !== entry.plan.clip.height) {
            throw new Error("california-canvas-final-compositor-decoded-size-mismatch");
          }
          const reference: CaliforniaCanvasGraphicsFinalCompositorRaster = {
            height: referenceDecoded.height,
            pngByteLength: referenceDecoded.pngBytes.length,
            pngSha256: await browserSha256(referenceDecoded.pngBytes),
            rgbaSha256: await browserSha256(new Uint8Array(
              referenceDecoded.pixels.buffer,
              referenceDecoded.pixels.byteOffset,
              referenceDecoded.pixels.byteLength
            )),
            width: referenceDecoded.width
          };
          const compositor: CaliforniaCanvasGraphicsFinalCompositorRaster = {
            height: decoded.height,
            pngByteLength: decoded.pngBytes.length,
            pngSha256: await browserSha256(decoded.pngBytes),
            rgbaSha256: await browserSha256(new Uint8Array(
              decoded.pixels.buffer,
              decoded.pixels.byteOffset,
              decoded.pixels.byteLength
            )),
            width: decoded.width
          };
          const comparison = browserExactComparison(
            referenceDecoded.pixels,
            decoded.pixels,
            decoded.width,
            decoded.height
          );
          if (browserStableSerialize(reference) !== browserStableSerialize(result.reference) ||
              browserStableSerialize(compositor) !== browserStableSerialize(result.compositor) ||
              browserStableSerialize(comparison) !== browserStableSerialize(result.comparison)) {
            throw new Error("california-canvas-final-compositor-node-result-forged");
          }
          const layoutFenceAfter = compositorLayoutFence(root, entry.registration.canvas);
          const paintFenceAfter = await compositorPaintFence(root, entry.registration.canvas);
          if (layoutFenceAfter !== entry.layoutFence || paintFenceAfter !== entry.paintFence) {
            throw new Error("california-canvas-final-compositor-layout-fence-drift");
          }
          const layoutFenceAfterSha256 = await browserSha256(browserStableSerialize({
            layoutFence: layoutFenceAfter,
            paintFence: paintFenceAfter
          }));
          const withoutBinding: Omit<CaliforniaCanvasGraphicsFinalCompositorProof,
            "bindingSha256"> = {
              ...entry.plan,
              comparison,
              compositor,
              layoutFenceAfterSha256,
              reference
            };
          return {
            ...withoutBinding,
            bindingSha256: await browserSha256(browserStableSerialize(withoutBinding))
          };
        }));
        const postCaptureIssues = contrastConsumptionCurrentIssues(consumption, true);
        const postCapturePaintFences = await Promise.all(prepared.canvases.map((entry) =>
          compositorPaintFence(root, entry.registration.canvas)
        ));
        await assertPaintEnvironmentUnchanged(
          prepared.paintEnvironment,
          "browser-finalize-post-capture"
        );
        prepared.mutations.push(...prepared.mutationObserver.takeRecords());
        const postCaptureBlockingMutations = compositorBlockingMutations(prepared.mutations);
        if (postCaptureIssues.length > 0 || evidence.capturedUrl !== location.href ||
            postCaptureBlockingMutations.length > 0 ||
            prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch ||
            prepared.canvases.some((entry, index) =>
              compositorLayoutFence(root, entry.registration.canvas) !== entry.layoutFence ||
              postCapturePaintFences[index] !== entry.paintFence
            )) {
          throw new Error(
            `california-canvas-final-compositor-post-capture-fence-drift:` +
            `${postCaptureIssues.join(",")}:mutations=${postCaptureBlockingMutations.length}:` +
            `observed=${prepared.mutations.length}`
          );
        }
        consumption.status = "returning";
        const ordered = consumption.registrations.slice().sort((left, right) =>
          left.canvasEvidence.domCanvasIndex - right.canvasEvidence.domCanvasIndex
        );
        const pixelHashes = await Promise.all(ordered.map((registration) => {
          const pixels = registration.terminalPixels.pixels;
          return browserSha256(new Uint8Array(
            pixels.buffer,
            pixels.byteOffset,
            pixels.byteLength
          ));
        }));
        const canvases: CaliforniaCanvasGraphicsContrastConsumeCanvasAck[] = ordered.map(
          (registration, index) => ({
            backingHeight: registration.canvasEvidence.backingHeight,
            backingWidth: registration.canvasEvidence.backingWidth,
            bindingKey: registration.canvasEvidence.bindingKey,
            canvasIdentity: registration.canvasEvidence.canvasIdentity,
            domCanvasIndex: registration.canvasEvidence.domCanvasIndex,
            finalCompositor: finalProofs[index]!,
            runtimeCanvasId: registration.canvasEvidence.runtimeCanvasId,
            sourcePaintRevision: registration.canvasEvidence.sourcePaintRevision,
            terminalPixelSnapshotSha256: pixelHashes[index],
            terminalRasterSha256: registration.canvasEvidence.terminalRasterSha256
          })
        );
        const acknowledgedAtEpochMs = Date.now();
        const acknowledgedAtPerformanceMs = performance.now();
        const withoutHash: Omit<CaliforniaCanvasGraphicsContrastConsumeAck, "ackSha256"> = {
          ackNonce: consumption.ackNonce,
          ackVersion: 5,
          acknowledgedAtEpochMs,
          acknowledgedAtPerformanceMs,
          auditedRootIdentity: `${runtimeSessionId}:root-${evidence.rootRuntimeId}`,
          canvasSetDigest: await browserSha256(browserStableSerialize(canvases)),
          canvases,
          captureFenceSignature: evidence.captureFenceSignature,
          capturedUrl: evidence.capturedUrl,
          contrastConsumedAtEpochMs: consumption.contrastConsumedAtEpochMs,
          contrastConsumedAtPerformanceMs: consumption.contrastConsumedAtPerformanceMs,
          evidenceSha256: evidence.evidenceSha256,
          paintEnvironment: prepared.paintEnvironment,
          receiptId: evidence.receiptId,
          rootRuntimeId: evidence.rootRuntimeId,
          runtimeRunId: evidence.runtimeRunId,
          runtimeSessionId: evidence.runtimeSessionId,
          sourceContractSha256: evidence.sourceContractSha256,
          sourceProductSha256: evidence.sourceProductSha256,
          stateKey: evidence.stateKey,
          surfaceKey: evidence.surfaceKey
        };
        const ack: CaliforniaCanvasGraphicsContrastConsumeAck = {
          ...withoutHash,
          ackSha256: await browserSha256(browserStableSerialize(withoutHash))
        };
        const postIssues = contrastConsumptionCurrentIssues(consumption, true);
        const finalPaintFences = await Promise.all(prepared.canvases.map((entry) =>
          compositorPaintFence(root, entry.registration.canvas)
        ));
        await assertPaintEnvironmentUnchanged(
          prepared.paintEnvironment,
          "ack-return"
        );
        prepared.mutations.push(...prepared.mutationObserver.takeRecords());
        const finalBlockingMutations = compositorBlockingMutations(prepared.mutations);
        if (postIssues.length > 0 || consumption.status !== "returning" ||
            evidence.capturedUrl !== location.href ||
            Date.now() - evidence.capturedAtEpochMs > 15_000 ||
            finalBlockingMutations.length > 0 ||
            prepared.shadowAttachmentEpoch !== shadowAttachmentEpoch ||
            prepared.canvases.some((entry, index) =>
              compositorLayoutFence(root, entry.registration.canvas) !== entry.layoutFence ||
              finalPaintFences[index] !== entry.paintFence
            )) {
          consumption.rejectedReasons.push(...postIssues);
          throw new Error(
            `california-canvas-graphics-contrast-consume-ack-fence-drift:${postIssues.join(",")}`
          );
        }
        prepared.mutationObserver.disconnect();
        consumption.finalCompositor = null;
        contrastConsumptionByReceipt.delete(evidence.receiptId);
        return ack;
      } catch (error) {
        consumption.finalCompositor?.mutationObserver.disconnect();
        consumption.finalCompositor = null;
        consumption.status = "rejected";
        throw error;
      }
    },
    installIntoCanvasAudit
  };

  Object.defineProperty(runtimeWindow, "__californiaCanvasGraphicsRuntime", {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
  installIntoCanvasAudit();
  queueMicrotask(installIntoCanvasAudit);
  addEventListener("DOMContentLoaded", installIntoCanvasAudit, { once: true });
}

/** Install after the Canvas text audit and before the first navigation. */
export async function installCaliforniaCanvasGraphicsRuntime(
  page: Page,
  options: {
    benchIds?: readonly string[];
    contract?: CaliforniaCanvasGraphicsSourceContract;
    runtimeRunId?: string;
  } = {}
) {
  const config = buildCaliforniaCanvasGraphicsRuntimeConfig(
    options.contract ?? defaultContract(),
    options.benchIds,
    options.runtimeRunId
  );
  const source = californiaCanvasGraphicsRuntimeInit.toString();
  const controlledRangeNormalizationSource =
    isCaliforniaExactNetZeroControlledRangeNormalization.toString();
  await page.addInitScript({
    content:
      `globalThis.__name = globalThis.__name || function(target) { return target; }; ` +
      `(${source})(${JSON.stringify(config)}, (${controlledRangeNormalizationSource}));`
  });
  return config;
}

export async function waitForCaliforniaCanvasGraphicsSettled(
  root: Locator,
  benchId: string,
  options: { pollMs?: number; quietMs?: number; timeoutMs?: number } = {}
) {
  const pollMs = options.pollMs ?? 40;
  const quietMs = options.quietMs ?? 180;
  const timeoutMs = options.timeoutMs ?? 5_500;
  const startedAt = Date.now();
  let latest: CaliforniaCanvasGraphicsSettlement | null = null;
  while (Date.now() - startedAt <= timeoutMs) {
    latest = await root.evaluate((element, requestedBenchId) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      void element;
      return api.settlement(requestedBenchId);
    }, benchId);
    if (latest.registeredCanvasCount > 0 && latest.pendingRafCount === 0 &&
        latest.activityAgeMs >= quietMs) return latest;
    await root.page().waitForTimeout(pollMs);
  }
  throw new Error(
    `California Canvas graphics did not settle for ${benchId}: ` +
    `${latest ? stableSerialize(latest) : "no-runtime-snapshot"}`
  );
}

export async function collectCaliforniaCanvasGraphicsStateEvidence(options: {
  benchId: string;
  root: Locator;
  stateKey: string;
  surfaceKey: string;
  wait?: { pollMs?: number; quietMs?: number; timeoutMs?: number };
}) {
  await waitForCaliforniaCanvasGraphicsSettled(options.root, options.benchId, options.wait);
  return options.root.evaluate((element, request) => {
    const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
    if (!api) throw new Error("california-canvas-graphics-runtime-missing");
    return api.collect(element as HTMLElement, request);
  }, {
    benchId: options.benchId,
    stateKey: options.stateKey,
    surfaceKey: options.surfaceKey
  });
}

export async function registerCaliforniaCanvasGraphicsEvidenceForContrast(options: {
  contract?: CaliforniaCanvasGraphicsSourceContract;
  evidence: CaliforniaCanvasGraphicsStateEvidence;
  root: Locator;
}) {
  assertCaliforniaCanvasGraphicsStateEvidence(options.evidence, {
    benchId: options.evidence.canvases[0]?.benchId ?? "missing",
    capturedUrl: options.root.page().url(),
    runtimeRunId: options.evidence.runtimeRunId,
    stateKey: options.evidence.stateKey,
    surfaceKey: options.evidence.surfaceKey
  }, options.contract ?? defaultContract());
  await options.root.evaluate((element, receipt) => {
    const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
    if (!api) throw new Error("california-canvas-graphics-runtime-missing");
    api.registerForContrast(
      element as HTMLElement,
      receipt.receiptId,
      receipt.evidenceSha256
    );
  }, {
    evidenceSha256: options.evidence.evidenceSha256,
    receiptId: options.evidence.receiptId
  });
}

/**
 * Final browser-consume -> page-compositor -> browser-finalize -> Node-consume
 * fence. Call only after the exact contrast scanner has consumed every Canvas.
 * `prepareFinalCompositor` is the one-shot authorization for the exact
 * page-level crops. The page compositor is captured on both sides of a
 * browser-side byte-for-byte check that the connected Canvas still equals the
 * frozen terminal raster. Node and then the browser independently require the
 * two complete CSS-pixel crops to be exactly equal before sealing the ACK.
 */
export async function consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence(options: {
  benchId: string;
  contract?: CaliforniaCanvasGraphicsSourceContract;
  evidence: CaliforniaCanvasGraphicsStateEvidence;
  root: Locator;
  runtimeRunId: string;
  stateKey: string;
  surfaceKey: string;
}) {
  const contract = options.contract ?? defaultContract();
  const expectation: CaliforniaCanvasGraphicsStateExpectation = {
    benchId: options.benchId,
    capturedUrl: options.root.page().url(),
    runtimeRunId: options.runtimeRunId,
    stateKey: options.stateKey,
    surfaceKey: options.surfaceKey
  };
  assertCaliforniaCanvasGraphicsStateEvidence(options.evidence, expectation, contract);
  const capturePlan = await options.root.evaluate((element, request) => {
    const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
    if (!api) throw new Error("california-canvas-graphics-runtime-missing");
    return api.prepareFinalCompositor(element as HTMLElement, request);
  }, {
    evidenceSha256: options.evidence.evidenceSha256,
    receiptId: options.evidence.receiptId,
    runtimeRunId: options.runtimeRunId,
    stateKey: options.stateKey,
    surfaceKey: options.surfaceKey
  });
  const finalCompositorResults: CaliforniaCanvasGraphicsFinalCompositorCaptureResult[] = [];
  let contrastConsumeAck: CaliforniaCanvasGraphicsContrastConsumeAck;
  try {
  for (const [canvasIndex, canvasPlan] of capturePlan.canvases.entries()) {
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      return api.assertFinalCompositorEnvironment(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId,
      stage: `before-screenshot-${canvasIndex * 2}`
    });
    const compositorPng = await captureCaliforniaFinalCompositorPageClip(
      options.root.page(),
      canvasPlan.captureViewportClip
    );
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      return api.assertFinalCompositorEnvironment(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId,
      stage: `after-screenshot-${canvasIndex * 2}`
    });
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      return api.confirmFinalCompositorReference(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId,
      runtimeCanvasId: canvasPlan.runtimeCanvasId
    });
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      return api.assertFinalCompositorEnvironment(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId,
      stage: `before-screenshot-${canvasIndex * 2 + 1}`
    });
    const referencePng = await captureCaliforniaFinalCompositorPageClip(
      options.root.page(),
      canvasPlan.captureViewportClip
    );
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) throw new Error("california-canvas-graphics-runtime-missing");
      return api.assertFinalCompositorEnvironment(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId,
      stage: `after-screenshot-${canvasIndex * 2 + 1}`
    });
    if (referencePng.length < 1 || referencePng.length >
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PNG_BYTES ||
        compositorPng.length < 1 || compositorPng.length >
        CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PNG_BYTES) {
      throw new Error("california-canvas-final-compositor-png-byte-cap");
    }
    const referenceDecoded = await sharp(referencePng).ensureAlpha().raw().toBuffer({
      resolveWithObject: true
    });
    const compositorDecoded = await sharp(compositorPng).ensureAlpha().raw().toBuffer({
      resolveWithObject: true
    });
    const diagnosticIdentity = {
      benchId: options.benchId,
      canvasPageRect: canvasPlan.canvasPageRect,
      captureScrollOffset: canvasPlan.captureScrollOffset,
      captureViewportClip: canvasPlan.captureViewportClip,
      captureViewportSize: canvasPlan.captureViewportSize,
      clip: canvasPlan.clip,
      evidenceSha256: options.evidence.evidenceSha256,
      receiptId: options.evidence.receiptId,
      runtimeCanvasId: canvasPlan.runtimeCanvasId,
      stateKey: options.stateKey,
      surfaceKey: options.surfaceKey
    };
    if (referenceDecoded.info.channels !== 4 ||
        referenceDecoded.info.width !== canvasPlan.clip.width ||
        referenceDecoded.info.height !== canvasPlan.clip.height ||
        compositorDecoded.info.channels !== 4 ||
        compositorDecoded.info.width !== canvasPlan.clip.width ||
        compositorDecoded.info.height !== canvasPlan.clip.height) {
      const diagnostic = await persistCaliforniaFinalCompositorDiagnostic({
        compositor: compositorPng,
        compositorHeight: compositorDecoded.info.height,
        compositorRgba: compositorDecoded.info.channels === 4
          ? compositorDecoded.data
          : undefined,
        compositorWidth: compositorDecoded.info.width,
        identity: diagnosticIdentity,
        reference: referencePng,
        referenceHeight: referenceDecoded.info.height,
        referenceRgba: referenceDecoded.data,
        referenceWidth: referenceDecoded.info.width
      });
      throw new Error(
        "california-canvas-final-compositor-screenshot-size-mismatch:" +
        `expected=${canvasPlan.clip.width}x${canvasPlan.clip.height}:` +
        `reference=${referenceDecoded.info.width}x${referenceDecoded.info.height}:` +
        `compositor=${compositorDecoded.info.width}x${compositorDecoded.info.height}:` +
        `diagnostic=${stableSerialize(diagnostic)}`
      );
    }
    let comparison: CaliforniaCanvasGraphicsFinalCompositorComparison;
    try {
      comparison = compareCaliforniaCanvasGraphicsFinalCompositorRgba({
        compositor: compositorDecoded.data,
        height: compositorDecoded.info.height,
        reference: referenceDecoded.data,
        width: compositorDecoded.info.width
      });
    } catch (error) {
      if (!(error instanceof Error) ||
          !error.message.startsWith("california-canvas-final-compositor-comparison-rejected:")) {
        throw error;
      }
      const diagnostic = await persistCaliforniaFinalCompositorDiagnostic({
        compositor: compositorPng,
        compositorHeight: compositorDecoded.info.height,
        compositorRgba: compositorDecoded.data,
        compositorWidth: compositorDecoded.info.width,
        identity: diagnosticIdentity,
        reference: referencePng,
        referenceHeight: referenceDecoded.info.height,
        referenceRgba: referenceDecoded.data,
        referenceWidth: referenceDecoded.info.width
      });
      throw new Error(`${error.message}:diagnostic=${stableSerialize(diagnostic)}`);
    }
    finalCompositorResults.push({
      captureToken: capturePlan.captureToken,
      comparison,
      compositor: {
        height: compositorDecoded.info.height,
        pngByteLength: compositorPng.length,
        pngSha256: sha256(compositorPng),
        rgbaSha256: sha256(compositorDecoded.data),
        width: compositorDecoded.info.width
      },
      compositorPngBase64: compositorPng.toString("base64"),
      reference: {
        height: referenceDecoded.info.height,
        pngByteLength: referencePng.length,
        pngSha256: sha256(referencePng),
        rgbaSha256: sha256(referenceDecoded.data),
        width: referenceDecoded.info.width
      },
      referencePngBase64: referencePng.toString("base64"),
      runtimeCanvasId: canvasPlan.runtimeCanvasId
    });
  }
  contrastConsumeAck = await options.root.evaluate((element, request) => {
    const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
    if (!api) throw new Error("california-canvas-graphics-runtime-missing");
    return api.takeContrastConsumeAck(element as HTMLElement, request);
  }, {
    evidenceSha256: options.evidence.evidenceSha256,
    finalCompositorResults,
    receiptId: options.evidence.receiptId,
    runtimeRunId: options.runtimeRunId,
    stateKey: options.stateKey,
    surfaceKey: options.surfaceKey
  });
  } catch (error) {
    await options.root.evaluate((element, request) => {
      const api = (window as RuntimeWindow).__californiaCanvasGraphicsRuntime;
      if (!api) return;
      api.rejectFinalCompositor(element as HTMLElement, request);
    }, {
      captureToken: capturePlan.captureToken,
      receiptId: options.evidence.receiptId
    }).catch(() => undefined);
    throw error;
  }
  return consumeCaliforniaCanvasGraphicsAckedStateEvidence(
    options.evidence,
    contrastConsumeAck,
    {
      ...expectation,
      nowEpochMs: Date.now()
    },
    contract
  );
}

/** One-shot integration adapter for a state ledger and the existing contrast collector. */
export async function collectVerifyAndRegisterCaliforniaCanvasGraphicsEvidence(options: {
  benchId: string;
  contract?: CaliforniaCanvasGraphicsSourceContract;
  root: Locator;
  stateKey: string;
  surfaceKey: string;
  wait?: { pollMs?: number; quietMs?: number; timeoutMs?: number };
}) {
  const evidence = await collectCaliforniaCanvasGraphicsStateEvidence(options);
  assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
    benchId: options.benchId,
    capturedUrl: options.root.page().url(),
    stateKey: options.stateKey,
    surfaceKey: options.surfaceKey
  }, options.contract ?? defaultContract());
  await registerCaliforniaCanvasGraphicsEvidenceForContrast({
    contract: options.contract ?? defaultContract(),
    evidence,
    root: options.root
  });
  return evidence;
}
