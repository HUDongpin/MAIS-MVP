import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_CHANNEL_TOLERANCE,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_CHANGED_PIXEL_RATIO,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_MEAN_ABSOLUTE_DIFF_RATIO,
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION,
  CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS,
  californiaCanvasGraphicsFinalCompositorBindingSha256,
  compareCaliforniaCanvasGraphicsFinalCompositorRgba,
  consumeCaliforniaCanvasGraphicsAckedStateEvidence,
  consumeCaliforniaCanvasGraphicsStateEvidence,
  verifyCaliforniaCanvasGraphicsAggregateCoverage,
  verifyCaliforniaCanvasGraphicsContrastConsumeAck,
  verifyCaliforniaCanvasGraphicsStateEvidence,
  type CaliforniaCanvasGraphicsAckedStateEvidence,
  type CaliforniaCanvasGraphicsCanvasEvidence,
  type CaliforniaCanvasGraphicsContrastConsumeAck,
  type CaliforniaCanvasGraphicsFinalCompositorProof,
  type CaliforniaCanvasGraphicsPaintEnvironmentSnapshot,
  type CaliforniaCanvasGraphicsSiteEvidence,
  type CaliforniaCanvasGraphicsStateEvidence
} from "./california-canvas-graphics-runtime";
import {
  CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasPaintSite
} from "./california-canvas-graphics-source-contract";

const contract = buildCaliforniaCanvasGraphicsSourceContract();
const essentialSites = contract.paintSites.filter((site) => site.role === "essential");
const now = Date.now();
const capturedUrl = "https://qa.invalid/california-canvas-graphics";

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stableValue(entry)]));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function digestKeys(keys: readonly string[]) {
  return sha256(keys.slice().sort().join("\n"));
}

function paintEnvironmentForEvidence(
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

function seal(evidence: CaliforniaCanvasGraphicsStateEvidence) {
  const copy = structuredClone(evidence);
  const { evidenceSha256: _hash, ...payload } = copy;
  copy.evidenceSha256 = sha256(JSON.stringify(stableValue(payload)));
  return copy;
}

test("font-bound compositor proofs use a new fail-closed ACK and proof schema", () => {
  assert.equal(CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION, 4);
  assert.equal(CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION, 3);
});

function sealAck(ack: CaliforniaCanvasGraphicsContrastConsumeAck) {
  const copy = structuredClone(ack);
  const { ackSha256: _hash, ...payload } = copy;
  copy.ackSha256 = sha256(JSON.stringify(stableValue(payload)));
  return copy;
}

function rebindFinalCompositor(
  proof: CaliforniaCanvasGraphicsFinalCompositorProof
) {
  const copy = structuredClone(proof);
  const { bindingSha256: _bindingSha256, ...payload } = copy;
  copy.bindingSha256 = californiaCanvasGraphicsFinalCompositorBindingSha256(payload);
  return copy;
}

function resealAckCanvasSet(ack: CaliforniaCanvasGraphicsContrastConsumeAck) {
  const copy = structuredClone(ack);
  copy.canvasSetDigest = sha256(JSON.stringify(stableValue(copy.canvases)));
  return sealAck(copy);
}

function finalCompositorForCanvas(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  canvas: CaliforniaCanvasGraphicsCanvasEvidence
): CaliforniaCanvasGraphicsFinalCompositorProof {
  const clip = {
    height: canvas.cssHeight,
    width: canvas.cssWidth,
    x: canvas.domCanvasIndex * canvas.cssWidth,
    y: 0
  };
  const raster = {
    height: clip.height,
    pngByteLength: 128,
    pngSha256: sha256(`${evidence.receiptId}:${canvas.canvasIdentity}:png`),
    rgbaSha256: sha256(`${evidence.receiptId}:${canvas.canvasIdentity}:rgba`),
    width: clip.width
  };
  const fenceSha256 = sha256(
    `${evidence.receiptId}:${canvas.canvasIdentity}:layout-paint-fence`
  );
  const withoutBinding: Omit<CaliforniaCanvasGraphicsFinalCompositorProof,
    "bindingSha256"> = {
      backingSize: { height: canvas.backingHeight, width: canvas.backingWidth },
      bindingKey: canvas.bindingKey,
      canvasIdentity: canvas.canvasIdentity,
      canvasPageRect: clip,
      capturedUrl: evidence.capturedUrl,
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
      cssSize: { height: canvas.cssHeight, width: canvas.cssWidth },
      deviceScaleFactor: 1,
      domCanvasIndex: canvas.domCanvasIndex,
      evidenceSha256: evidence.evidenceSha256,
      layoutFenceAfterSha256: fenceSha256,
      layoutFenceBeforeSha256: fenceSha256,
      paintEnvironment: paintEnvironmentForEvidence(evidence),
      receiptId: evidence.receiptId,
      reference: { ...raster },
      runtimeCanvasId: canvas.runtimeCanvasId,
      sourcePaintRevision: canvas.sourcePaintRevision,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey,
      terminalRasterSha256: canvas.terminalRasterSha256,
      version: CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_VERSION
    };
  return {
    ...withoutBinding,
    bindingSha256: californiaCanvasGraphicsFinalCompositorBindingSha256(withoutBinding)
  };
}

function ackForEvidence(
  evidence: CaliforniaCanvasGraphicsStateEvidence
): CaliforniaCanvasGraphicsContrastConsumeAck {
  const canvases = evidence.canvases.slice().sort((left, right) =>
    left.domCanvasIndex - right.domCanvasIndex
  ).map((canvas) => ({
    backingHeight: canvas.backingHeight,
    backingWidth: canvas.backingWidth,
    bindingKey: canvas.bindingKey,
    canvasIdentity: canvas.canvasIdentity,
    domCanvasIndex: canvas.domCanvasIndex,
    finalCompositor: finalCompositorForCanvas(evidence, canvas),
    runtimeCanvasId: canvas.runtimeCanvasId,
    sourcePaintRevision: canvas.sourcePaintRevision,
    terminalPixelSnapshotSha256: sha256(`${evidence.receiptId}:${canvas.canvasIdentity}:pixels`),
    terminalRasterSha256: canvas.terminalRasterSha256
  }));
  return sealAck({
    ackNonce: sha256(`ack-nonce:${evidence.receiptId}`),
    ackSha256: "",
    ackVersion: CALIFORNIA_CANVAS_GRAPHICS_CONTRAST_ACK_VERSION,
    acknowledgedAtEpochMs: evidence.capturedAtEpochMs + 2,
    acknowledgedAtPerformanceMs: evidence.capturedAtPerformanceMs + 2,
    auditedRootIdentity: `${evidence.runtimeSessionId}:root-${evidence.rootRuntimeId}`,
    canvasSetDigest: sha256(JSON.stringify(stableValue(canvases))),
    canvases,
    captureFenceSignature: evidence.captureFenceSignature,
    capturedUrl: evidence.capturedUrl,
    contrastConsumedAtEpochMs: evidence.capturedAtEpochMs + 1,
    contrastConsumedAtPerformanceMs: evidence.capturedAtPerformanceMs + 1,
    evidenceSha256: evidence.evidenceSha256,
    paintEnvironment: paintEnvironmentForEvidence(evidence),
    receiptId: evidence.receiptId,
    rootRuntimeId: evidence.rootRuntimeId,
    runtimeRunId: evidence.runtimeRunId,
    runtimeSessionId: evidence.runtimeSessionId,
    sourceContractSha256: evidence.sourceContractSha256,
    sourceProductSha256: evidence.sourceProductSha256,
    stateKey: evidence.stateKey,
    surfaceKey: evidence.surfaceKey
  });
}

function acked(
  evidence: CaliforniaCanvasGraphicsStateEvidence
): CaliforniaCanvasGraphicsAckedStateEvidence {
  return { contrastConsumeAck: ackForEvidence(evidence), evidence };
}

function siteEvidence(site: CaliforniaCanvasPaintSite): CaliforniaCanvasGraphicsSiteEvidence {
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

function canvasEvidence(
  benchId: string,
  bindingKey: string,
  sites: readonly CaliforniaCanvasPaintSite[],
  domCanvasIndex: number
): CaliforniaCanvasGraphicsCanvasEvidence {
  const evidence = sites.map(siteEvidence);
  const keys = evidence.map((site) => site.sourceSiteKey).sort();
  return {
    backingHeight: 120,
    backingWidth: 240,
    benchId,
    bindingKey,
    canvasIdentity: `${bindingKey}:runtime-${domCanvasIndex + 1}:dom-${domCanvasIndex}`,
    compositedOpaquePixelRatio: 1,
    cssHeight: 120,
    cssWidth: 240,
    domCanvasIndex,
    issues: [],
    latestClearEpoch: 1,
    latestClearWasFull: true,
    latestPaintRafEpoch: 1,
    latestSettledRafEpoch: 1,
    minimumNumericNonTextContrastRatio: 7.25,
    observedSourceSiteCount: keys.length,
    observedSourceSiteDigest: digestKeys(keys),
    observedSourceSiteKeys: keys,
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
          elementIdentity: "canvas",
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
          elementIdentity: "section#fixture",
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
    qaReadbackCount: sites.length * 2 + 1,
    qaReadbackMode: "native-existing-2d-context",
    roleBackgroundNeighborPixelCount: evidence.length * 12,
    roleConnectedCorePixelCount: evidence.length * 40,
    roleCorePixelCount: evidence.length * 48,
    runtimeCanvasId: domCanvasIndex + 1,
    siteEvidence: evidence,
    sourcePaintRevision: sites.length,
    terminalRasterSha256: sha256(`${benchId}:${bindingKey}:raster`)
  };
}

let receiptSequence = 0;
function evidenceForBench(
  benchId: string,
  selectedSites: readonly CaliforniaCanvasPaintSite[] = essentialSites.filter((site) =>
    String(site.benchId) === benchId
  )
) {
  const benchSites = essentialSites.filter((site) => String(site.benchId) === benchId);
  const sitesByBinding = Map.groupBy(selectedSites, (site) => site.canvasContextKeys[0]);
  const canvases = [...sitesByBinding.entries()].map(([bindingKey, sites], index) =>
    canvasEvidence(benchId, bindingKey, sites, index)
  );
  const keys = selectedSites.map((site) => site.sourceSiteKey).sort();
  const benchKeys = benchSites.map((site) => site.sourceSiteKey).sort();
  receiptSequence += 1;
  return seal({
    benchExpectedEssentialCount: benchKeys.length,
    benchExpectedEssentialDigest: digestKeys(benchKeys),
    capturedAtEpochMs: now,
    capturedAtPerformanceMs: 123.5,
    capturedUrl,
    captureFenceSignature: `fixture-fence:${benchId}`,
    canvases,
    evidenceSha256: "",
    issues: [],
    observedSourceSiteCount: keys.length,
    observedSourceSiteDigest: digestKeys(keys),
    observedSourceSiteKeys: keys,
    receiptId: `${sha256(benchId).slice(0, 16)}-${receiptSequence.toString(16)}`,
    rootRuntimeId: receiptSequence,
    runtimeRunId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    runtimeSessionId: "contract-fixture-session",
    runtimeVersion: 1,
    sourceContractSha256: contract.contractSha256,
    sourceExpectedEssentialCount: essentialSites.length,
    sourceExpectedEssentialDigest: digestKeys(essentialSites.map((site) => site.sourceSiteKey)),
    sourceProductSha256: contract.sourceSha256,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  });
}

function mutate(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  mutation: (draft: CaliforniaCanvasGraphicsStateEvidence) => void,
  reseal = true
) {
  const copy = structuredClone(evidence);
  mutation(copy);
  return reseal ? seal(copy) : copy;
}

function hasIssue(evidence: CaliforniaCanvasGraphicsStateEvidence, pattern: RegExp) {
  const issues = verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    benchId: evidence.canvases[0]?.benchId ?? "missing",
    capturedUrl,
    nowEpochMs: now,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  }, contract);
  assert.match(issues.join("|"), pattern);
}

test("a sealed state binds exact source identity, paper, dimensions, epochs and numeric contrast", () => {
  const benchId = String(essentialSites.find((site) => site.operation === "fillRect")!.benchId);
  const evidence = evidenceForBench(benchId, [essentialSites.find((site) =>
    String(site.benchId) === benchId && site.operation === "fillRect"
  )!]);
  assert.deepEqual(verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    benchId,
    capturedUrl,
    nowEpochMs: now,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  }, contract), []);
  assert.equal(evidence.sourceExpectedEssentialCount, 2_370);
  assert.equal(evidence.canvases[0].qaReadbackCount, 3);
  assert.equal(evidence.canvases[0].sourcePaintRevision, 1);
});

test("forged hashes and counts fail closed even when the other value is plausible", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  hasIssue(mutate(evidence, (draft) => {
    draft.observedSourceSiteCount += 1;
  }), /forged-observed-source-site-count/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].observedSourceSiteCount += 1;
  }), /forged-canvas-source-site-set/);
  hasIssue(mutate(evidence, (draft) => {
    draft.sourceExpectedEssentialCount = 2_368;
  }), /source-expected-essential-count/);
  hasIssue(mutate(evidence, (draft) => {
    draft.evidenceSha256 = "0".repeat(64);
  }, false), /evidence-sha-mismatch/);
});

test("wrong state, surface, URL, bench and source/contract SHA are rejected", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const expectation = {
    benchId,
    capturedUrl,
    nowEpochMs: now,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  };
  assert.match(verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    ...expectation,
    stateKey: "forged"
  }, contract).join("|"), /state-key-mismatch/);
  assert.match(verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    ...expectation,
    surfaceKey: "forged"
  }, contract).join("|"), /surface-key-mismatch/);
  assert.match(verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    ...expectation,
    capturedUrl: "https:\/\/wrong.invalid"
  }, contract).join("|"), /captured-url-mismatch/);
  assert.match(verifyCaliforniaCanvasGraphicsStateEvidence(evidence, {
    ...expectation,
    benchId: "WrongBench"
  }, contract).join("|"), /bench-id-mismatch/);
  hasIssue(mutate(evidence, (draft) => {
    draft.sourceProductSha256 = "0".repeat(64);
  }), /source-product-sha-mismatch/);
  hasIssue(mutate(evidence, (draft) => {
    draft.sourceContractSha256 = "0".repeat(64);
  }), /source-contract-sha-mismatch/);
});

test("stale/future evidence, missing clear, stale rAF and revision drift fail closed", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  hasIssue(mutate(evidence, (draft) => {
    draft.capturedAtEpochMs = now - CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS - 1;
  }), /evidence-stale-or-future/);
  hasIssue(mutate(evidence, (draft) => {
    draft.capturedAtEpochMs = Number.NaN;
  }), /capture-timestamp-invalid/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].latestClearEpoch = 0;
    draft.canvases[0].latestClearWasFull = false;
  }), /missing-full-clear-epoch/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].latestPaintRafEpoch = 2;
    draft.canvases[0].latestSettledRafEpoch = 1;
  }), /raf-stale-frame/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].sourcePaintRevision = 0;
  }), /qa-readback-or-source-revision-invalid|forged-source-paint-revision/);
  hasIssue(mutate(evidence, (draft) => {
    draft.captureFenceSignature = "";
  }), /capture-fence-or-root-identity-invalid/);
  hasIssue(mutate(evidence, (draft) => {
    draft.runtimeRunId = "short";
  }), /runtime-run-id-invalid/);
});

test("background, transparency, low contrast and tiny/unconnected markers fail closed", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].paperProof.paperOpaque = false;
    draft.canvases[0].paperProof.effectiveOpaqueBackgroundColor = "rgba(0, 0, 0, 0)";
  }), /paper-background-mismatch-or-transparent/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].paperProof.canvasBackgroundImage =
      "linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))";
  }), /paper-background-mismatch-or-transparent/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].paperProof.compositingLayers[1].opacity = 0.9;
  }), /paper-background-mismatch-or-transparent|unresolved-compositing-layer/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].paperProof.compositingLayers[1].backgroundImage =
      "linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))";
  }), /paper-background-mismatch-or-transparent|unresolved-compositing-layer/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].compositedOpaquePixelRatio = 0.99;
  }), /terminal-composite-not-opaque/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].siteEvidence[0].minimumCoreContrastRatio = 2.99;
    draft.canvases[0].minimumNumericNonTextContrastRatio = 2.99;
  }), /low-contrast/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].siteEvidence[0].corePixelCoverageRatio = 0.1;
  }), /insufficient-contrast-core-coverage/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].siteEvidence[0].largestConnectedCorePixelCount = 1;
    draft.canvases[0].roleConnectedCorePixelCount = 1;
  }), /unconnected-or-tiny-core/);
  hasIssue(mutate(evidence, (draft) => {
    draft.canvases[0].siteEvidence[0].backgroundNeighborPixelCount = 0;
    draft.canvases[0].roleBackgroundNeighborPixelCount = 0;
  }), /connected-background-missing/);
});

test("a receipt has module-local one-shot consumption semantics", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const expectation = {
    benchId,
    capturedUrl,
    nowEpochMs: now,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  };
  assert.equal(consumeCaliforniaCanvasGraphicsStateEvidence(
    evidence,
    expectation,
    contract
  ).receiptId, evidence.receiptId);
  assert.throws(
    () => consumeCaliforniaCanvasGraphicsStateEvidence(evidence, expectation, contract),
    /already consumed/
  );
});

test("a browser contrast ACK binds the receipt, run, state, root and terminal Canvas set", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const ack = ackForEvidence(evidence);
  const expectation = {
    benchId,
    capturedUrl,
    nowEpochMs: now,
    runtimeRunId: evidence.runtimeRunId,
    stateKey: evidence.stateKey,
    surfaceKey: evidence.surfaceKey
  };
  assert.deepEqual(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(ack, evidence, expectation, contract),
    []
  );
  const wrongState = sealAck(Object.assign(structuredClone(ack), { stateKey: "forged" }));
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      wrongState,
      evidence,
      expectation,
      contract
    ).join("|"),
    /run-session-state-surface-url-mismatch|expectation-mismatch/
  );
  const wrongCanvas = structuredClone(ack);
  wrongCanvas.canvases[0].canvasIdentity = "forged-canvas";
  wrongCanvas.canvasSetDigest = sha256(JSON.stringify(stableValue(wrongCanvas.canvases)));
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      sealAck(wrongCanvas),
      evidence,
      expectation,
      contract
    ).join("|"),
    /contrast-ack-canvas-mismatch/
  );
  const consumed = consumeCaliforniaCanvasGraphicsAckedStateEvidence(
    evidence,
    ack,
    expectation,
    contract
  );
  assert.equal(consumed.contrastConsumeAck.ackSha256, ack.ackSha256);
  assert.throws(
    () => consumeCaliforniaCanvasGraphicsAckedStateEvidence(
      evidence,
      ack,
      expectation,
      contract
    ),
    /already consumed/
  );
  assert.match(
    verifyCaliforniaCanvasGraphicsAggregateCoverage([evidence], contract).issues.join("|"),
    /browser-contrast-consume-ack-missing/
  );
});

test("a browser contrast ACK cannot substitute internal pixels for final page-compositor proof", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const internalOnlyAck = structuredClone(ackForEvidence(evidence));
  delete (internalOnlyAck.canvases[0] as Partial<
    CaliforniaCanvasGraphicsContrastConsumeAck["canvases"][number]
  >).finalCompositor;
  internalOnlyAck.canvasSetDigest = sha256(JSON.stringify(stableValue(
    internalOnlyAck.canvases
  )));
  const resealedInternalOnlyAck = sealAck(internalOnlyAck);
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(resealedInternalOnlyAck, evidence, {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    }, contract).join("|"),
    /final-compositor-proof-missing/,
    "an internal terminal-raster hash must not establish what the student page compositor showed"
  );
});

test("a validly resealed legacy v1 ACK without compositor proof cannot enter v3 artifacts", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const legacy = structuredClone(ackForEvidence(evidence));
  (legacy as unknown as { ackVersion: number }).ackVersion = 1;
  delete (legacy.canvases[0] as Partial<
    CaliforniaCanvasGraphicsContrastConsumeAck["canvases"][number]
  >).finalCompositor;
  const resealedLegacy = resealAckCanvasSet(legacy);
  const issues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    resealedLegacy,
    evidence,
    {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    },
    contract
  ).join("|");
  assert.match(issues, /contrast-ack-version-mismatch/);
  assert.match(issues, /final-compositor-proof-missing/);
});

test("a validly resealed v2 ACK and compositor proof without an environment epoch fail closed", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const legacy = structuredClone(ackForEvidence(evidence));
  (legacy as unknown as { ackVersion: number }).ackVersion = 2;
  delete (legacy as Partial<CaliforniaCanvasGraphicsContrastConsumeAck>).paintEnvironment;
  for (const canvas of legacy.canvases) {
    (canvas.finalCompositor as unknown as { version: number }).version = 1;
    delete (canvas.finalCompositor as Partial<CaliforniaCanvasGraphicsFinalCompositorProof>)
      .paintEnvironment;
    canvas.finalCompositor = rebindFinalCompositor(canvas.finalCompositor);
  }
  const issues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    resealAckCanvasSet(legacy),
    evidence,
    {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    },
    contract
  ).join("|");
  assert.match(issues, /contrast-ack-version-mismatch/);
  assert.match(issues, /contrast-ack-paint-environment-snapshot-missing/);
  assert.match(issues, /final-compositor-version-mismatch/);
  assert.match(issues, /final-compositor-paint-environment-snapshot-missing/);
});

test("a validly resealed v3 ACK and v2 proof without font state fail closed", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const legacy = structuredClone(ackForEvidence(evidence));
  (legacy as unknown as { ackVersion: number }).ackVersion = 3;
  const legacyAckEnvironment = legacy.paintEnvironment as unknown as {
    fontFingerprintSha256?: string;
    kindCounts: { font?: number };
  };
  delete legacyAckEnvironment.fontFingerprintSha256;
  delete legacyAckEnvironment.kindCounts.font;
  for (const canvas of legacy.canvases) {
    (canvas.finalCompositor as unknown as { version: number }).version = 2;
    const legacyProofEnvironment = canvas.finalCompositor.paintEnvironment as unknown as {
      fontFingerprintSha256?: string;
      kindCounts: { font?: number };
    };
    delete legacyProofEnvironment.fontFingerprintSha256;
    delete legacyProofEnvironment.kindCounts.font;
    const environmentPayload = {
      ...legacyProofEnvironment,
      fingerprintSha256: undefined
    };
    canvas.finalCompositor.paintEnvironment.fingerprintSha256 = sha256(
      JSON.stringify(stableValue(environmentPayload))
    );
    canvas.finalCompositor = rebindFinalCompositor(canvas.finalCompositor);
  }
  const ackEnvironmentPayload = {
    ...legacyAckEnvironment,
    fingerprintSha256: undefined
  };
  legacy.paintEnvironment.fingerprintSha256 = sha256(
    JSON.stringify(stableValue(ackEnvironmentPayload))
  );
  const issues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    resealAckCanvasSet(legacy),
    evidence,
    {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    },
    contract
  ).join("|");
  assert.match(issues, /contrast-ack-version-mismatch/);
  assert.match(issues, /paint-environment-kind-set-invalid/);
  assert.match(issues, /paint-environment-fingerprint-invalid/);
  assert.match(issues, /final-compositor-version-mismatch/);
});

test("paint-environment epoch, kind counts and deep fingerprints are all proof-bound", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const malformed = structuredClone(ackForEvidence(evidence));
  malformed.paintEnvironment.kindCounts.cssom += 1;
  const malformedIssues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    sealAck(malformed),
    evidence,
    {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    },
    contract
  ).join("|");
  assert.match(malformedIssues, /paint-environment-epoch-or-count-invalid/);
  assert.match(malformedIssues, /paint-environment-combined-fingerprint-mismatch/);
  assert.match(malformedIssues, /contrast-ack-paint-environment-mismatch/);

  const deepFingerprintForgery = structuredClone(ackForEvidence(evidence));
  deepFingerprintForgery.canvases[0].finalCompositor.paintEnvironment
    .fontFingerprintSha256 = sha256("forged-font-state");
  deepFingerprintForgery.canvases[0].finalCompositor = rebindFinalCompositor(
    deepFingerprintForgery.canvases[0].finalCompositor
  );
  const deepIssues = verifyCaliforniaCanvasGraphicsContrastConsumeAck(
    resealAckCanvasSet(deepFingerprintForgery),
    evidence,
    {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    },
    contract
  ).join("|");
  assert.match(deepIssues, /paint-environment-combined-fingerprint-mismatch/);
  assert.match(deepIssues, /contrast-ack-paint-environment-mismatch/);
});

test("a zero-diff claim cannot carry different decoded reference and compositor RGBA hashes", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const forged = structuredClone(ackForEvidence(evidence));
  const proof = forged.canvases[0].finalCompositor;
  proof.compositor.rgbaSha256 = sha256("different-decoded-compositor-rgba");
  forged.canvases[0].finalCompositor = rebindFinalCompositor(proof);
  const resealed = resealAckCanvasSet(forged);
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(resealed, evidence, {
      benchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    }, contract).join("|"),
    /final-compositor-reference-compositor-rgba-mismatch/,
    "valid inner/outer hashes must not let a false zero-diff claim unlink decoded RGBA"
  );
});

test("validly rebound source-revision and layout-fence forgeries still fail semantic checks", () => {
  const benchId = String(essentialSites[0].benchId);
  const evidence = evidenceForBench(benchId, [essentialSites[0]]);
  const sourceForged = structuredClone(ackForEvidence(evidence));
  sourceForged.canvases[0].finalCompositor.sourcePaintRevision += 1;
  sourceForged.canvases[0].finalCompositor = rebindFinalCompositor(
    sourceForged.canvases[0].finalCompositor
  );
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      resealAckCanvasSet(sourceForged),
      evidence,
      {
        benchId,
        capturedUrl,
        nowEpochMs: now,
        runtimeRunId: evidence.runtimeRunId,
        stateKey: evidence.stateKey,
        surfaceKey: evidence.surfaceKey
      },
      contract
    ).join("|"),
    /final-compositor-source-revision-or-size-mismatch/
  );

  const layoutForged = structuredClone(ackForEvidence(evidence));
  layoutForged.canvases[0].finalCompositor.layoutFenceAfterSha256 =
    sha256("post-screenshot-layout-paint-drift");
  layoutForged.canvases[0].finalCompositor = rebindFinalCompositor(
    layoutForged.canvases[0].finalCompositor
  );
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(
      resealAckCanvasSet(layoutForged),
      evidence,
      {
        benchId,
        capturedUrl,
        nowEpochMs: now,
        runtimeRunId: evidence.runtimeRunId,
        stateKey: evidence.stateKey,
        surfaceKey: evidence.surfaceKey
      },
      contract
    ).join("|"),
    /final-compositor-layout-fence-mismatch/
  );
});

test("two same-receipt canvases cannot exchange validly rebound compositor proofs", () => {
  const multiCanvasBenchId = [...new Set(essentialSites.map((site) => String(site.benchId)))]
    .find((benchId) => new Set(essentialSites.filter((site) =>
      String(site.benchId) === benchId
    ).map((site) => site.canvasContextKeys[0])).size >= 2);
  assert.ok(multiCanvasBenchId, "source contract needs a reviewed multi-Canvas bench canary");
  const evidence = evidenceForBench(multiCanvasBenchId);
  assert.ok(evidence.canvases.length >= 2, "multi-Canvas canary collapsed to one Canvas");
  const swapped = structuredClone(ackForEvidence(evidence));
  const firstProof = swapped.canvases[0].finalCompositor;
  const secondProof = swapped.canvases[1].finalCompositor;
  swapped.canvases[0].finalCompositor = rebindFinalCompositor(secondProof);
  swapped.canvases[1].finalCompositor = rebindFinalCompositor(firstProof);
  const resealed = resealAckCanvasSet(swapped);
  assert.match(
    verifyCaliforniaCanvasGraphicsContrastConsumeAck(resealed, evidence, {
      benchId: multiCanvasBenchId,
      capturedUrl,
      nowEpochMs: now,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    }, contract).join("|"),
    /final-compositor-source-revision-or-size-mismatch/,
    "canvasIdentity/runtimeCanvasId/domCanvasIndex/bindingKey must bind each nested proof"
  );
});

test("the final-compositor comparator visits every pixel and rejects a last-pixel mutation", () => {
  const width = 64;
  const height = 32;
  const reference = new Uint8Array(width * height * 4).fill(127);
  const honest = compareCaliforniaCanvasGraphicsFinalCompositorRgba({
    compositor: reference.slice(),
    height,
    reference,
    width
  });
  assert.equal(honest.pixelCount, width * height);
  assert.equal(honest.changedPixelCount, 0);
  const lastPixelChanged = reference.slice();
  lastPixelChanged[lastPixelChanged.length - 1] += 1;
  assert.throws(
    () => compareCaliforniaCanvasGraphicsFinalCompositorRgba({
      compositor: lastPixelChanged,
      height,
      reference,
      width
    }),
    /final-compositor-comparison-rejected:changed=1\/2048/,
    "a full-pixel contract cannot omit even the final alpha channel"
  );
});

test("aggregate ledger requires the exact 2,370-site union and unique receipts", () => {
  const benchIds = [...new Set(essentialSites.map((site) => String(site.benchId)))].sort();
  const complete = benchIds.map((benchId) => acked(evidenceForBench(benchId)));
  const passing = verifyCaliforniaCanvasGraphicsAggregateCoverage(complete, contract);
  assert.equal(passing.expectedCount, 2_370);
  assert.equal(passing.observedCount, 2_370);
  assert.deepEqual(passing.issues, []);

  const historical = complete.map((receipt) => acked(mutate(receipt.evidence, (draft) => {
    draft.capturedAtEpochMs = now - CALIFORNIA_CANVAS_GRAPHICS_MAX_EVIDENCE_AGE_MS - 1;
  })));
  assert.throws(() => consumeCaliforniaCanvasGraphicsStateEvidence(historical[0].evidence, {
    benchId: historical[0].evidence.canvases[0].benchId,
    capturedUrl,
    nowEpochMs: now,
    runtimeRunId: historical[0].evidence.runtimeRunId,
    stateKey: historical[0].evidence.stateKey,
    surfaceKey: historical[0].evidence.surfaceKey
  }, contract), /evidence-stale-or-future/);
  assert.deepEqual(
    verifyCaliforniaCanvasGraphicsAggregateCoverage(historical, contract).issues,
    [],
    "offline aggregate integrity must not reinterpret a historical receipt as live evidence"
  );

  const firstBench = String(essentialSites[0].benchId);
  const omittedKey = essentialSites.find((site) => String(site.benchId) === firstBench)!.sourceSiteKey;
  const incomplete = complete.map((receipt) => {
    if (receipt.evidence.canvases[0]?.benchId !== firstBench) return receipt;
    return acked(evidenceForBench(firstBench, essentialSites.filter((site) =>
      String(site.benchId) === firstBench && site.sourceSiteKey !== omittedKey
    )));
  });
  assert.match(
    verifyCaliforniaCanvasGraphicsAggregateCoverage(incomplete, contract).issues.join("|"),
    /aggregate-essential-sites-missing|aggregate-essential-count/
  );

  const duplicateReceipt = complete.map((receipt, index) => index === complete.length - 1
    ? acked(mutate(receipt.evidence, (draft) => {
      draft.receiptId = complete[0].evidence.receiptId;
    }))
    : receipt);
  assert.match(
    verifyCaliforniaCanvasGraphicsAggregateCoverage(duplicateReceipt, contract).issues.join("|"),
    /duplicate-receipt/
  );
});

test("aggregate ledger rejects mixed run IDs and duplicate logical state receipts", () => {
  const benchIds = [...new Set(essentialSites.map((site) => String(site.benchId)))].sort();
  const complete = benchIds.map((benchId) => {
    const evidence = evidenceForBench(benchId);
    Object.assign(evidence, { runtimeRunId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    return acked(seal(evidence));
  });
  const mixedRun = complete.map((receipt, index) => index === complete.length - 1
    ? acked(seal(Object.assign(structuredClone(receipt.evidence), {
      runtimeRunId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    })))
    : receipt);
  assert.match(
    verifyCaliforniaCanvasGraphicsAggregateCoverage(mixedRun, contract).issues.join("|"),
    /mixed-runtime-run/
  );

  const repeatedState = acked(seal(Object.assign(structuredClone(complete[0].evidence), {
    receiptId: `${complete[0].evidence.receiptId}-a`
  })));
  assert.match(
    verifyCaliforniaCanvasGraphicsAggregateCoverage([...complete, repeatedState], contract)
      .issues.join("|"),
    /duplicate-logical-state-receipt/
  );
});
