import fs from "node:fs";
import { expect, test, type ElementHandle } from "@playwright/test";
import { visualizationLabCatalog, type FeaturedLabDefinition } from "../../data/visualizationLabs";
import {
  MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT,
  mathSceneVisualPalette
} from "../../components/visualizations/three/manim/mathSceneVisualPalette";
import type { MathSceneSpec, Vec3 } from "../../components/visualizations/three/manim/mathSceneTypes";
import { installCaliforniaCanvasTextAudit } from "./california-canvas-text-audit";
import {
  CALIFORNIA_PREMIUM_WEBGL_CAPTURE_MAX_AGE_MS,
  CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
  CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
  auditCaliforniaPremiumWebGlRetainedContrastEvidence,
  auditCaliforniaPremiumWebGlGraphicsContracts,
  auditCaliforniaPremiumWebGlScreenshot,
  buildCaliforniaPremiumWebGlSceneForLab,
  californiaPremiumWebGlCompositorBindingSha256,
  californiaPremiumWebGlExpectedSceneProjectionForLab,
  californiaPremiumWebGlExpectedTargetContractForLab,
  californiaPremiumWebGlReviewedContracts,
  captureAndRegisterCaliforniaPremiumWebGlContrastEvidence,
  captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence,
  deriveCaliforniaLivePremiumWebGlLabs,
  installCaliforniaPremiumWebGlContrastProvider,
  type CaliforniaPremiumWebGlLabContract,
  type CaliforniaPremiumWebGlCaptureStateKey,
  type CaliforniaPremiumWebGlExpectedTargetContract,
  type CaliforniaPremiumWebGlRegisteredContrastEvidence,
  type CaliforniaPremiumWebGlScreenshotInput,
  type CaliforniaPremiumWebGlVisualPalette
} from "./california-premium-webgl-graphics-contract";

function cloneCatalog() {
  return structuredClone(visualizationLabCatalog) as FeaturedLabDefinition[];
}

function clonePalette() {
  return structuredClone(mathSceneVisualPalette) as unknown as CaliforniaPremiumWebGlVisualPalette;
}

function mutateScene(
  mutate: (scene: MathSceneSpec, lab: FeaturedLabDefinition) => void
) {
  return (lab: FeaturedLabDefinition) => {
    const source = buildCaliforniaPremiumWebGlSceneForLab(lab);
    if (!source) return null;
    const scene = structuredClone(source) as MathSceneSpec;
    mutate(scene, lab);
    return scene;
  };
}

function issueText(issues: string[]) {
  return issues.join("\n");
}

function rgb(hex: string): [number, number, number] {
  const normalized = hex.replace(/^#/, "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function syntheticScreenshot(
  lab: CaliforniaPremiumWebGlLabContract,
  options: {
    background?: [number, number, number];
    dishonestAttributes?: Record<string, string>;
    edgeOnly?: boolean;
    omitEvidenceId?: string;
  } = {}
): CaliforniaPremiumWebGlScreenshotInput {
  const width = 180;
  const height = 112;
  const data = new Uint8Array(width * height * 4);
  const background = options.background ?? rgb(mathSceneVisualPalette.background.color);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = background[0];
    data[offset + 1] = background[1];
    data[offset + 2] = background[2];
    data[offset + 3] = 255;
  }

  const paint = (x: number, y: number, color: [number, number, number]) => {
    const offset = (y * width + x) * 4;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
  };

  lab.screenshotTargets.forEach((target, index) => {
    if (target.evidenceId === options.omitEvidenceId) return;
    const targetColor = target.displayColors[0];
    const color = options.edgeOnly
      ? targetColor.map((channel, channelIndex) => Math.round(
        background[channelIndex] + (channel - background[channelIndex]) * 0.2
      )) as [number, number, number]
      : targetColor;
    const y = 8 + index * 14;
    for (let row = 0; row < 3; row += 1) {
      for (let x = 12; x < 38; x += 1) paint(x, y + row, color);
    }
  });

  return {
    channels: 4,
    data,
    height,
    untrustedDomAttributes: options.dishonestAttributes,
    width
  };
}

function syntheticProjectedScreenshot(
  lab: CaliforniaPremiumWebGlLabContract,
  options: {
    adversary?: {
      evidenceId: string;
      fraction?: number;
      kind: "center-only" | "checker" | "omit-prefix" | "omit-suffix" | "solid-region";
    };
    elapsedSeconds?: number;
    injectUnexpectedEvidenceId?: string;
    mutate?: { evidenceId: string; kind: "moved-quadrant" | "wrong-shape" };
    omitEvidenceId?: string;
    stateKey?: CaliforniaPremiumWebGlCaptureStateKey;
  } = {}
) {
  const width = 180;
  const height = 112;
  const stateKey = options.stateKey ?? "terminal-settled";
  const projection = californiaPremiumWebGlExpectedSceneProjectionForLab(lab.labId, stateKey, {
    elapsedSeconds: options.elapsedSeconds,
    height,
    width
  });
  const data = new Uint8Array(width * height * 4);
  const background = rgb(mathSceneVisualPalette.background.color);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = background[0];
    data[offset + 1] = background[1];
    data[offset + 2] = background[2];
    data[offset + 3] = 255;
  }
  const targetById = new Map(lab.screenshotTargets.map((target) => [target.evidenceId, target]));
  const paintDisc = (x: number, y: number, color: [number, number, number], radius = 2) => {
    for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        if (xOffset * xOffset + yOffset * yOffset > radius * radius) continue;
        const pixelX = x + xOffset;
        const pixelY = y + yOffset;
        if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) continue;
        const offset = (pixelY * width + pixelX) * 4;
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = 255;
      }
    }
  };
  const paintLine = (
    start: [number, number],
    end: [number, number],
    color: [number, number, number]
  ) => {
    const startX = start[0] * (width - 1);
    const startY = start[1] * (height - 1);
    const endX = end[0] * (width - 1);
    const endY = end[1] * (height - 1);
    const steps = Math.max(1, Math.ceil(Math.hypot(endX - startX, endY - startY)));
    for (let step = 0; step <= steps; step += 1) {
      const alpha = step / steps;
      paintDisc(
        Math.round(startX + (endX - startX) * alpha),
        Math.round(startY + (endY - startY) * alpha),
        color
      );
    }
  };

  const paintOrder = projection.targetContract.slice().sort((left, right) =>
    (targetById.get(right.evidenceId)?.opacity ?? 1) - (targetById.get(left.evidenceId)?.opacity ?? 1)
  );
  for (const expected of paintOrder) {
    if (expected.evidenceId === options.omitEvidenceId) continue;
    const target = targetById.get(expected.evidenceId);
    if (!target) throw new Error(`synthetic-target-missing:${expected.evidenceId}`);
    let points = expected.projectedPoints.map((point) => [...point] as [number, number]);
    if (options.mutate?.evidenceId === expected.evidenceId) {
      if (options.mutate.kind === "moved-quadrant") {
        points = points.map(([x, y]) => [x + 0.32, y + 0.28]);
      } else {
        const { minX, minY, maxX, maxY } = expected.expectedRegion;
        points = points.map(() => [(minX + maxX) / 2, (minY + maxY) / 2]);
      }
    }
    const color = target.displayColors[0];
    if (options.adversary?.evidenceId === expected.evidenceId && options.adversary.kind === "solid-region") {
      const { minX, minY, maxX, maxY } = expected.expectedRegion;
      for (let y = Math.floor(minY * (height - 1)); y <= Math.ceil(maxY * (height - 1)); y += 1) {
        for (let x = Math.floor(minX * (width - 1)); x <= Math.ceil(maxX * (width - 1)); x += 1) {
          paintDisc(x, y, color, 0);
        }
      }
      continue;
    }
    if (expected.topology === "point") {
      const point = points[0];
      paintDisc(Math.round(point[0] * (width - 1)), Math.round(point[1] * (height - 1)), color, 5);
      continue;
    }
    const adversary = options.adversary?.evidenceId === expected.evidenceId
      ? options.adversary
      : undefined;
    const fraction = adversary?.fraction ?? 0;
    for (let index = 0; index < points.length - 1; index += 1) {
      const normalized = points.length <= 2 ? 0 : index / (points.length - 2);
      if (adversary?.kind === "omit-prefix" && normalized < fraction) continue;
      if (adversary?.kind === "omit-suffix" && normalized > 1 - fraction) continue;
      if (adversary?.kind === "center-only" &&
          (normalized < (1 - fraction) / 2 || normalized > 1 - (1 - fraction) / 2)) continue;
      if (adversary?.kind === "checker" && Math.floor(normalized * 12) % 3 === 0) continue;
      paintLine(points[index], points[index + 1], color);
    }
  }
  if (options.injectUnexpectedEvidenceId) {
    const terminalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(
      lab.labId,
      "terminal-settled",
      { height, width }
    );
    const unexpected = terminalProjection.targetContract.find(
      (target) => target.evidenceId === options.injectUnexpectedEvidenceId
    );
    const target = targetById.get(options.injectUnexpectedEvidenceId);
    if (!unexpected || !target) throw new Error(`synthetic-unexpected-target-missing:${options.injectUnexpectedEvidenceId}`);
    const color = target.displayColors[0];
    if (unexpected.topology === "point") {
      const [x, y] = unexpected.projectedPoints[0];
      paintDisc(Math.round(x * (width - 1)), Math.round(y * (height - 1)), color, 5);
    } else {
      for (let index = 0; index < unexpected.projectedPoints.length - 1; index += 1) {
        paintLine(unexpected.projectedPoints[index], unexpected.projectedPoints[index + 1], color);
      }
    }
  }
  const screenshot: CaliforniaPremiumWebGlScreenshotInput = { channels: 4, data, height, width };
  return { projection, screenshot };
}

function syntheticRetainedEvidence(
  lab: CaliforniaPremiumWebGlLabContract
): CaliforniaPremiumWebGlRegisteredContrastEvidence {
  const { projection, screenshot } = syntheticProjectedScreenshot(lab, {
    elapsedSeconds: 0,
    stateKey: "default"
  });
  const terminal = auditCaliforniaPremiumWebGlScreenshot(
    screenshot,
    lab,
    mathSceneVisualPalette.background.color,
    { elapsedSeconds: 0, stateKey: "default", targetContract: projection.targetContract }
  );
  const captureStartedAtMs = Date.now() - 10;
  const captureToken = "c".repeat(32);
  const capturedUrl = `http://127.0.0.1/student/tools/visualizations/${lab.labId}`;
  const compositorClip = { height: screenshot.height, width: screenshot.width, x: 12, y: 24 };
  const compositorPngSha256 = "d".repeat(64);
  const compositorRgbaSha256 = "e".repeat(64);
  const targetContract = projection.targetContract;
  const evidence: CaliforniaPremiumWebGlRegisteredContrastEvidence = {
    backingHeight: screenshot.height,
    backingWidth: screenshot.width,
    backgroundCorePixelRatio: terminal.backgroundCorePixelRatio,
    bitmapHeight: screenshot.height,
    bitmapPngByteLength: 1024,
    bitmapPngSha256: "a".repeat(64),
    bitmapRgbaSha256: "b".repeat(64),
    bitmapWidth: screenshot.width,
    captureEndedAtMs: captureStartedAtMs + 5,
    captureStartedAtMs,
    captureToken,
    cameraProjectionDigest: projection.cameraProjectionDigest,
    capturedUrl,
    compositorBackgroundCorePixelRatio: terminal.backgroundCorePixelRatio,
    compositorBindingSha256: "0".repeat(64),
    compositorCameraProjectionDigest: projection.cameraProjectionDigest,
    compositorCaptureEndedAtMs: captureStartedAtMs + 9,
    compositorCaptureStartedAtMs: captureStartedAtMs + 6,
    compositorClip,
    compositorElapsedBracket: { after: 0, before: 0 },
    compositorElapsedSeconds: 0,
    compositorFrameIndexBracket: { after: 0, before: 0 },
    compositorHeight: screenshot.height,
    compositorIssues: terminal.issues,
    compositorOpaquePixelRatio: terminal.opaquePixelRatio,
    compositorPngByteLength: 2048,
    compositorPngSha256,
    compositorProjectionAspectRatio: projection.projectionAspectRatio,
    compositorRenderedObjectCount: projection.renderedObjectCount,
    compositorRgbaSha256,
    compositorSceneObjectCount: projection.sceneObjectCount,
    compositorSceneTopologyDigest: projection.sceneTopologyDigest,
    compositorTargetContract: targetContract,
    compositorTargetEvidence: terminal.targetEvidence,
    compositorTimelineValueBracket: { after: 0, before: 0 },
    compositorWidth: screenshot.width,
    cssHeight: screenshot.height,
    cssWidth: screenshot.width,
    cssX: 12,
    cssY: 24,
    devicePixelRatio: 1,
    elapsedSeconds: 0,
    frameIndex: 0,
    labId: lab.labId,
    opaquePixelRatio: terminal.opaquePixelRatio,
    pageX: 12,
    pageY: 24,
    playingCompositorSamples: [],
    playbackState: "paused",
    projectionAspectRatio: projection.projectionAspectRatio,
    providerVersion: CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
    renderedObjectCount: projection.renderedObjectCount,
    rendererElapsedBracket: { after: 0, before: 0 },
    rendererFrameIndexBracket: { after: 0, before: 0 },
    sceneObjectCount: projection.sceneObjectCount,
    sceneTopologyDigest: projection.sceneTopologyDigest,
    compositorResetDifference: null,
    sourceContract: CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
    stateKey: "default",
    targetContract,
    targetEvidence: terminal.targetEvidence,
    terminalIssues: terminal.issues,
    timelineValue: 0,
    timelineValueBracket: { after: 0, before: 0 },
    visualPaletteSourceContract: MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT
  };
  evidence.compositorBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
    captureToken,
    capturedUrl,
    clip: compositorClip,
    compositorElapsedBracket: { after: 0, before: 0 },
    compositorElapsedSeconds: 0,
    compositorFrameIndexBracket: { after: 0, before: 0 },
    compositorPngSha256,
    compositorRgbaSha256,
    stateKey: "default",
    targetContract,
    timelineValueBracket: { after: 0, before: 0 }
  });
  return evidence;
}

test("source contract derives the exact reviewed California live double-flag identities", () => {
  const derived = deriveCaliforniaLivePremiumWebGlLabs();
  expect(derived.map((lab) => lab.labId)).toEqual(Object.keys(californiaPremiumWebGlReviewedContracts).sort());
  expect(derived.map((lab) => [lab.labId, lab.threeD?.familyId, lab.templateId])).toEqual([
    ["us-ca-math-s4-chapter-04", "three-function-graph", "function-graph"],
    ["us-ca-math-s5-chapter-03", "three-trig-unit-wave", "trig-unit-wave"]
  ]);
  const audit = auditCaliforniaPremiumWebGlGraphicsContracts();
  expect(audit.issues, issueText(audit.issues)).toEqual([]);
  expect(audit.labs).toHaveLength(derived.length);
});

test("source contract keeps renderer background and MathSceneRuntime visual choices palette-driven", () => {
  const paletteSource = fs.readFileSync(
    "components/visualizations/three/manim/mathSceneVisualPalette.ts",
    "utf8"
  );
  const runtimeSource = fs.readFileSync(
    "components/visualizations/three/manim/MathSceneRuntime.tsx",
    "utf8"
  );
  expect(paletteSource).toContain("MANIM_DEFAULT_BACKGROUND_COLOR");
  expect(runtimeSource).toContain("mathSceneColorForRole");
  expect(runtimeSource).toContain("mathSceneVisualPalette.axes.x");
  expect(runtimeSource).toContain("mathSceneVisualPalette.lines.trace");
  expect(runtimeSource).toContain("toneMapped={mathSceneVisualPalette.renderer.toneMapped}");
  expect(runtimeSource).not.toMatch(/function colorForRole/);
  for (const color of ["#38bdf8", "#f472b6", "#e0f2fe", "#facc15", "#22d3ee", "#bae6fd"]) {
    expect(runtimeSource.match(new RegExp(color, "g")) ?? [], `${color} leaked back into runtime`).toHaveLength(0);
  }
});

test("capture bridge binds the exact Canvas bitmap and final page compositor crop without context sampling", () => {
  const contractSource = fs.readFileSync(
    "tests/e2e/california-premium-webgl-graphics-contract.ts",
    "utf8"
  );
  const broadReceiptSource = fs.readFileSync(
    "tests/e2e/california-visualization-labs.spec.ts",
    "utf8"
  );
  expect(contractSource).toContain("ElementHandle<HTMLCanvasElement>");
  expect(contractSource).toContain("canvas.toBlob");
  expect(contractSource).toContain("page.screenshot");
  expect(contractSource).toContain("compositorPngSha256");
  expect(contractSource).toContain("compositorTargetEvidence");
  expect(contractSource).toContain("premium-webgl-pending-evidence-unconsumed");
  expect(contractSource).toContain("Object.freeze(providerApi)");
  expect(contractSource).toContain("configurable: false");
  expect(contractSource).not.toMatch(/canvas\.screenshot\s*\(/);
  expect(contractSource).not.toMatch(/\.getContext\s*\(/);
  expect(contractSource).not.toMatch(/\.readPixels\s*\(/);
  expect(broadReceiptSource).toContain("registration.compositorPng");
  expect(broadReceiptSource).toContain("registration.compositorScreenshot.data");
  expect(broadReceiptSource).toContain("registration.evidence.compositorBindingSha256");
  expect(broadReceiptSource).toContain("registration.evidence.compositorTargetEvidence");
  expect(broadReceiptSource).toContain("premium-webgl-compositor-decoded-rgba-chain");
  expect(broadReceiptSource).toContain("premium-webgl-compositor:");
});

test("source contract fails closed when a California live flag changes or an unreviewed CA lab goes live", () => {
  const disabledCatalog = cloneCatalog();
  const disabled = disabledCatalog.find((lab) => lab.labId === "us-ca-math-s4-chapter-04");
  expect(disabled?.threeD).toBeTruthy();
  disabled!.threeD!.premiumLaunch = false;
  const disabledAudit = auditCaliforniaPremiumWebGlGraphicsContracts(disabledCatalog);
  expect(issueText(disabledAudit.issues)).toContain("california-live-identity-drift");

  const expandedCatalog = cloneCatalog();
  const extra = expandedCatalog.find((lab) =>
    lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH" &&
    !Object.hasOwn(californiaPremiumWebGlReviewedContracts, lab.labId)
  );
  expect(extra?.threeD).toBeTruthy();
  extra!.threeD!.enabled = true;
  extra!.threeD!.premiumLaunch = true;
  const expandedAudit = auditCaliforniaPremiumWebGlGraphicsContracts(expandedCatalog);
  expect(issueText(expandedAudit.issues)).toContain("california-live-identity-drift");
  expect(issueText(expandedAudit.issues)).toContain("missing-reviewed-family-contract");
});

test("source contrast rejects a low function accent and low trace alpha", () => {
  const lowAccentCatalog = cloneCatalog();
  for (const lab of lowAccentCatalog.filter((candidate) =>
    Object.hasOwn(californiaPremiumWebGlReviewedContracts, candidate.labId)
  )) {
    lab.templateConfig.accent = "#334155";
  }
  const lowAccentAudit = auditCaliforniaPremiumWebGlGraphicsContracts(lowAccentCatalog);
  expect(issueText(lowAccentAudit.issues)).toMatch(/function-accent:contrast=.*<3\.0/);

  const lowTraceAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        for (const object of scene.objects) {
          if (object.type === "trace") object.style = { ...object.style, strokeOpacity: 0.08 };
        }
      })
    }
  );
  expect(issueText(lowTraceAudit.issues)).toMatch(/trace.*contrast=.*<3\.0/);
});

test("source contrast rejects pink-axis alpha, transparent background, and wrong background", () => {
  const lowAxisPalette = clonePalette();
  lowAxisPalette.axes.z.opacity = 0.12;
  const lowAxisAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    { palette: lowAxisPalette }
  );
  expect(issueText(lowAxisAudit.issues)).toMatch(/axis-z:contrast=.*<3\.0/);

  const transparentPalette = clonePalette();
  transparentPalette.background.alpha = 0;
  const transparentAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    { palette: transparentPalette }
  );
  expect(issueText(transparentAudit.issues)).toContain("background-alpha-drift:0!=1");

  const wrongBackgroundPalette = clonePalette();
  wrongBackgroundPalette.background.color = "#ffffff";
  const wrongBackgroundAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    { palette: wrongBackgroundPalette }
  );
  expect(issueText(wrongBackgroundAudit.issues)).toContain("background-color-drift:#ffffff!=#020617");

  const toneMappedPalette = clonePalette();
  toneMappedPalette.renderer.toneMapped = true;
  const toneMappedAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    { palette: toneMappedPalette }
  );
  expect(issueText(toneMappedAudit.issues)).toContain("renderer-tone-mapping-drift:true!=false");
});

test("source IR rejects shadeIn3D, clipping planes, material alpha, and camera drift", () => {
  const shadeAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        const point = scene.objects.find((object) => object.type === "movingPoint");
        if (point) point.uniforms = { ...point.uniforms, shadeIn3D: true };
      })
    }
  );
  expect(issueText(shadeAudit.issues)).toContain("shade-in-3d-not-allowed");

  const clipAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        const curve = scene.objects.find((object) => object.type === "parametricCurve");
        if (curve) curve.uniforms = {
          ...curve.uniforms,
          clippingPlanes: [{ constant: 0, normal: [1, 0, 0] }]
        };
      })
    }
  );
  expect(issueText(clipAudit.issues)).toContain("clipping-plane-count=1!=0");

  const alphaAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        const point = scene.objects.find((object) => object.type === "movingPoint");
        if (point) point.uniforms = { ...point.uniforms, opacity: 0.15 };
      })
    }
  );
  expect(issueText(alphaAudit.issues)).toMatch(/material-opacity=0\.150!=1/);

  const cameraAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        scene.cameraShots[0] = { ...scene.cameraShots[0], fov: 170 };
      })
    }
  );
  expect(issueText(cameraAudit.issues)).toContain("camera-shots-drift");
});

test("source IR rejects a hidden, missing, or invented visual role", () => {
  const hiddenRoleAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        const functionObject = scene.objects.find((object) => object.id === "function-curve" || object.id === "sine-wave");
        if (functionObject && "colorRole" in functionObject) functionObject.colorRole = "";
      })
    }
  );
  expect(issueText(hiddenRoleAudit.issues)).toContain("missing-or-unregistered-color-role:missing");
  expect(issueText(hiddenRoleAudit.issues)).toContain("role=missing!=function");

  const missingObjectAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        scene.objects = scene.objects.filter((object) => object.id !== "moving-probe" && object.id !== "wave-probe");
      })
    }
  );
  expect(issueText(missingObjectAudit.issues)).toContain("scene-object-identity-drift");
  expect(issueText(missingObjectAudit.issues)).toMatch(/(?:moving-probe|wave-probe):missing-reviewed-object/);

  const inventedRoleAudit = auditCaliforniaPremiumWebGlGraphicsContracts(
    visualizationLabCatalog,
    {
      sceneBuilder: mutateScene((scene) => {
        const functionObject = scene.objects.find((object) => object.id === "function-curve" || object.id === "sine-wave");
        if (functionObject && "colorRole" in functionObject) functionObject.colorRole = "self-reported-pass";
      })
    }
  );
  expect(issueText(inventedRoleAudit.issues)).toContain("missing-or-unregistered-color-role:self-reported-pass");
});

test("synthetic color swatches fail object-level projected geometry even with opaque contrast cores", () => {
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  expect(sourceAudit.issues, issueText(sourceAudit.issues)).toEqual([]);
  for (const lab of sourceAudit.labs) {
    const terminal = auditCaliforniaPremiumWebGlScreenshot(syntheticScreenshot(lab), lab);
    expect(issueText(terminal.issues), lab.labId).toContain("spatial-geometry-missing");
    expect(terminal.domSelfReportTrusted).toBe(false);
    expect(terminal.targetEvidence.some((target) => !target.passed)).toBe(true);
  }
});

test("same-color objects remain distinct object-level targets", () => {
  const trigLab = auditCaliforniaPremiumWebGlGraphicsContracts().labs
    .find((lab) => lab.labId === "us-ca-math-s5-chapter-03");
  expect(trigLab).toBeTruthy();
  expect(trigLab!.screenshotTargets.map((target) => target.evidenceId)).toEqual(expect.arrayContaining([
    "phase-radius",
    "wave-probe",
    "sine-wave",
    "unit-circle"
  ]));
  expect(trigLab!.screenshotTargets.map((target) => target.evidenceId)).toHaveLength(
    trigLab!.renderTargets.length
  );
});

test("projected object fixtures pass while moved, missing same-color, and wrong-shape objects fail", () => {
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  for (const lab of sourceAudit.labs) {
    const projected = syntheticProjectedScreenshot(lab);
    const terminal = auditCaliforniaPremiumWebGlScreenshot(
      projected.screenshot,
      lab,
      mathSceneVisualPalette.background.color,
      { stateKey: "terminal-settled", targetContract: projected.projection.targetContract }
    );
    expect(terminal.issues, `${lab.labId}\n${issueText(terminal.issues)}`).toEqual([]);
    expect(terminal.targetEvidence.every((target) => target.passed)).toBe(true);
  }

  const functionLab = sourceAudit.labs.find((lab) => lab.labId === "us-ca-math-s4-chapter-04")!;
  const moved = syntheticProjectedScreenshot(functionLab, {
    mutate: { evidenceId: "function-curve", kind: "moved-quadrant" }
  });
  expect(issueText(auditCaliforniaPremiumWebGlScreenshot(
    moved.screenshot,
    functionLab,
    mathSceneVisualPalette.background.color,
    { stateKey: "terminal-settled", targetContract: moved.projection.targetContract }
  ).issues)).toContain("function-curve:spatial-geometry-missing");

  const trigLab = sourceAudit.labs.find((lab) => lab.labId === "us-ca-math-s5-chapter-03")!;
  const missingSameColor = syntheticProjectedScreenshot(trigLab, { omitEvidenceId: "phase-radius" });
  const missingSameColorIssues = issueText(auditCaliforniaPremiumWebGlScreenshot(
    missingSameColor.screenshot,
    trigLab,
    mathSceneVisualPalette.background.color,
    { stateKey: "terminal-settled", targetContract: missingSameColor.projection.targetContract }
  ).issues);
  expect(missingSameColorIssues).toContain("phase-radius:spatial-geometry-missing");
  expect(missingSameColorIssues).not.toContain("wave-probe:spatial-geometry-missing");

  const wrongShape = syntheticProjectedScreenshot(trigLab, {
    mutate: { evidenceId: "unit-circle", kind: "wrong-shape" }
  });
  expect(issueText(auditCaliforniaPremiumWebGlScreenshot(
    wrongShape.screenshot,
    trigLab,
    mathSceneVisualPalette.background.color,
    { stateKey: "terminal-settled", targetContract: wrongShape.projection.targetContract }
  ).issues)).toContain("unit-circle:spatial-geometry-missing");
});

test("reopened RED: partial path paint fails every arc bucket, endpoint, and approved union corridor", () => {
  const lab = auditCaliforniaPremiumWebGlGraphicsContracts().labs
    .find((candidate) => candidate.labId === "us-ca-math-s4-chapter-04")!;
  for (const fraction of [0.1, 0.2, 0.3, 0.4, 0.45]) {
    for (const kind of ["omit-prefix", "omit-suffix"] as const) {
      const partial = syntheticProjectedScreenshot(lab, {
        adversary: { evidenceId: "function-curve", fraction, kind }
      });
      const issues = issueText(auditCaliforniaPremiumWebGlScreenshot(
        partial.screenshot,
        lab,
        mathSceneVisualPalette.background.color,
        { stateKey: "terminal-settled", targetContract: partial.projection.targetContract }
      ).issues);
      expect(issues, `${kind}:${fraction}`).toContain("function-curve:spatial-topology-incomplete");
    }
  }
  for (const adversary of [
    { evidenceId: "function-curve", fraction: 0.6, kind: "center-only" as const },
    { evidenceId: "function-curve", kind: "checker" as const },
    { evidenceId: "function-curve", kind: "solid-region" as const }
  ]) {
    const deceptive = syntheticProjectedScreenshot(lab, { adversary });
    const issues = issueText(auditCaliforniaPremiumWebGlScreenshot(
      deceptive.screenshot,
      lab,
      mathSceneVisualPalette.background.color,
      { stateKey: "terminal-settled", targetContract: deceptive.projection.targetContract }
    ).issues);
    expect(issues, adversary.kind).toMatch(/function-curve:(?:spatial-topology-incomplete|off-corridor-union)/);
  }
});

test("reopened RED: reviewed two-lab semantics reject wrong paths, traces, collapsed or displaced geometry", () => {
  const wrongPath = auditCaliforniaPremiumWebGlGraphicsContracts(visualizationLabCatalog, {
    sceneBuilder: mutateScene((scene) => {
      const probe = scene.objects.find((object) => object.type === "movingPoint");
      const wrongExisting = scene.objects.find((object) =>
        object.type === "parametricCurve" && object.id !== (probe?.type === "movingPoint" ? probe.pathObjectId : "")
      );
      if (probe?.type === "movingPoint") probe.pathObjectId = wrongExisting?.id ?? "probe-trace";
    })
  });
  expect(issueText(wrongPath.issues)).toContain("path-object-id=");

  const wrongTrace = auditCaliforniaPremiumWebGlGraphicsContracts(visualizationLabCatalog, {
    sceneBuilder: mutateScene((scene) => {
      const trace = scene.objects.find((object) => object.type === "trace");
      const wrongExisting = scene.objects.find((object) => object.type === "parametricCurve");
      if (trace?.type === "trace" && wrongExisting) trace.sourceObjectId = wrongExisting.id;
    })
  });
  expect(issueText(wrongTrace.issues)).toContain("source-object-id=");

  const collapsed = auditCaliforniaPremiumWebGlGraphicsContracts(visualizationLabCatalog, {
    sceneBuilder: mutateScene((scene) => {
      for (const object of scene.objects) {
        if (object.type === "parametricCurve") object.samples = object.samples.map(() => [...object.samples[0]] as Vec3);
      }
    })
  });
  expect(issueText(collapsed.issues)).toContain("reviewed-world-extent");
  expect(issueText(collapsed.issues)).toContain("reviewed-world-arc-length");

  const displaced = auditCaliforniaPremiumWebGlGraphicsContracts(visualizationLabCatalog, {
    sceneBuilder: mutateScene((scene) => {
      for (const object of scene.objects) {
        if (object.type === "parametricCurve") {
          object.samples = object.samples.map(([x, y, z]) => [x + 100, y + 100, z] as Vec3);
        }
      }
    })
  });
  expect(issueText(displaced.issues)).toContain("reviewed-geometry-checkpoint-digest");

  const overlapped = auditCaliforniaPremiumWebGlGraphicsContracts(visualizationLabCatalog, {
    sceneBuilder: mutateScene((scene) => {
      const source = scene.objects.find((object) => object.id === "unit-circle");
      const target = scene.objects.find((object) => object.id === "sine-wave");
      if (source?.type === "parametricCurve" && target?.type === "parametricCurve") {
        target.samples = structuredClone(source.samples);
      }
    })
  });
  expect(issueText(overlapped.issues)).toContain("reviewed-geometry-checkpoint-digest");

  for (const labId of Object.keys(californiaPremiumWebGlReviewedContracts)) {
    const catalogLab = visualizationLabCatalog.find((lab) => lab.labId === labId)!;
    const canonicalScene = buildCaliforniaPremiumWebGlSceneForLab(catalogLab)!;
    const playingElapsedSeconds = labId === "us-ca-math-s5-chapter-03" ? 2.2 : 1;
    const defaultProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(labId, "default", {
      elapsedSeconds: 0,
      height: 112,
      width: 180
    });
    const playingProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(labId, "playing", {
      elapsedSeconds: playingElapsedSeconds,
      height: 112,
      width: 180
    });
    expect(defaultProjection.targetContract.length, `${labId}: canonical base must remain meaningful`).toBeGreaterThan(0);
    expect(defaultProjection.targetContract.some((target) => target.objectId === "axes")).toBe(true);
    for (const object of canonicalScene.objects) {
      if (object.type !== "parametricCurve") continue;
      expect(defaultProjection.targetContract.some((target) => target.objectId === object.id),
        `${labId}:${object.id}: unrevealed curve leaked into default`).toBe(false);
      expect(playingProjection.targetContract.some((target) => target.objectId === object.id),
        `${labId}:${object.id}: required playing projection silently disappeared`).toBe(true);
    }

    const offCameraScene = structuredClone(canonicalScene) as MathSceneSpec;
    offCameraScene.alwaysRedraw = [];
    for (const object of offCameraScene.objects) {
      if (object.type === "parametricCurve") {
        object.samples = object.samples.map(([x, y, z]) => [x + 100, y + 100, z] as Vec3);
      }
    }
    expect(() => californiaPremiumWebGlExpectedSceneProjectionForLab(labId, "playing", {
      elapsedSeconds: playingElapsedSeconds,
      height: 112,
      sceneOverride: offCameraScene,
      width: 180
    }), `${labId}: off-camera required projections must fail closed`).toThrow(
      /premium-webgl-required-projection-(?:empty|off-camera)/
    );

    const collapsedScene = structuredClone(canonicalScene) as MathSceneSpec;
    collapsedScene.alwaysRedraw = [];
    for (const object of collapsedScene.objects) {
      if (object.type === "parametricCurve") {
        object.samples = object.samples.map(() => [...object.samples[0]] as Vec3);
      }
    }
    expect(() => californiaPremiumWebGlExpectedSceneProjectionForLab(labId, "playing", {
      elapsedSeconds: playingElapsedSeconds,
      height: 112,
      sceneOverride: collapsedScene,
      width: 180
    }), `${labId}: collapsed required projections must fail closed`).toThrow(
      /premium-webgl-required-projection-(?:degenerate|empty)/
    );
  }
});

test("reopened RED: canonical default and reset reject an unrevealed curve painted off approved corridors", () => {
  const lab = auditCaliforniaPremiumWebGlGraphicsContracts().labs
    .find((candidate) => candidate.labId === "us-ca-math-s4-chapter-04")!;
  for (const stateKey of ["default", "reset"] as const) {
    const clean = syntheticProjectedScreenshot(lab, { elapsedSeconds: 0, stateKey });
    expect(auditCaliforniaPremiumWebGlScreenshot(
      clean.screenshot,
      lab,
      mathSceneVisualPalette.background.color,
      { elapsedSeconds: 0, stateKey, targetContract: clean.projection.targetContract }
    ).issues).toEqual([]);

    const injected = syntheticProjectedScreenshot(lab, {
      elapsedSeconds: 0,
      injectUnexpectedEvidenceId: "function-curve",
      stateKey
    });
    expect(issueText(auditCaliforniaPremiumWebGlScreenshot(
      injected.screenshot,
      lab,
      mathSceneVisualPalette.background.color,
      { elapsedSeconds: 0, stateKey, targetContract: injected.projection.targetContract }
    ).issues)).toContain("function-curve:unexpected-state-color-off-corridor");
  }
});

test("reopened RED: retained default and reset require canonical zero renderer time and timeline", () => {
  const lab = auditCaliforniaPremiumWebGlGraphicsContracts().labs[0];
  const nonCanonicalDefault = syntheticRetainedEvidence(lab);
  nonCanonicalDefault.elapsedSeconds = 0.25;
  nonCanonicalDefault.frameIndex = 15;
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(nonCanonicalDefault))).toContain(
    "default-canonical-time"
  );

  const contractSource = fs.readFileSync(
    "tests/e2e/california-premium-webgl-graphics-contract.ts",
    "utf8"
  );
  expect(contractSource).toContain("timelineValue");
  expect(contractSource).toContain("compositorElapsedBracket");
  expect(contractSource).toContain("rendererFrameIndexBracket");
});

test("reopened RED: broad receipts and ledger bind two changing playing compositor captures and reset", () => {
  const contractSource = fs.readFileSync(
    "tests/e2e/california-premium-webgl-graphics-contract.ts",
    "utf8"
  );
  const broadSource = fs.readFileSync("tests/e2e/california-visualization-labs.spec.ts", "utf8");
  const ledgerSource = fs.readFileSync(
    "tests/e2e/california-visualization-coverage-ledger.test.ts",
    "utf8"
  );
  for (const source of [contractSource, broadSource, ledgerSource]) {
    expect(source).toContain("auditCaliforniaPremiumWebGlStateSequence");
    expect(source).toContain("playingCompositorSamples");
    expect(source).toContain("compositorChangedPixelRatioFromPrevious");
    expect(source).toContain("compositorResetDifference");
  }
});

test("synthetic terminal pixels reject wrong background, hidden role, and antialias-edge-only paint", () => {
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  const lab = sourceAudit.labs[0];
  expect(lab).toBeTruthy();

  const wrongBackground = auditCaliforniaPremiumWebGlScreenshot(
    syntheticScreenshot(lab, { background: [255, 255, 255] }),
    lab
  );
  expect(issueText(wrongBackground.issues)).toContain("background-core-missing");

  const hiddenRole = auditCaliforniaPremiumWebGlScreenshot(
    syntheticScreenshot(lab, { omitEvidenceId: "function-curve" }),
    lab
  );
  expect(issueText(hiddenRole.issues)).toContain("function-curve:terminal-core-missing");

  const edgeOnly = auditCaliforniaPremiumWebGlScreenshot(
    syntheticScreenshot(lab, { edgeOnly: true }),
    lab
  );
  expect(issueText(edgeOnly.issues)).toContain("terminal-core-missing");
});

test("synthetic dishonest DOM attributes cannot replace missing terminal pixels", () => {
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  const lab = sourceAudit.labs[0];
  const terminal = auditCaliforniaPremiumWebGlScreenshot(
    syntheticScreenshot(lab, {
      dishonestAttributes: {
        "data-viz-background": mathSceneVisualPalette.background.color,
        "data-viz-contrast": "999",
        "data-viz-required-roles": lab.screenshotTargets.map((target) => target.role).join(","),
        "data-viz-webgl-pass": "true"
      },
      omitEvidenceId: "moving-probe"
    }),
    lab
  );
  expect(terminal.domSelfReportTrusted).toBe(false);
  expect(issueText(terminal.issues)).toContain("moving-probe:terminal-core-missing");
});

test("retained evidence verifier fails closed on dropped, weak, stale, resized, or forged proof", () => {
  const lab = auditCaliforniaPremiumWebGlGraphicsContracts().labs[0];
  expect(lab).toBeTruthy();
  const valid = syntheticRetainedEvidence(lab);
  expect(auditCaliforniaPremiumWebGlRetainedContrastEvidence(valid)).toEqual([]);

  const droppedTarget = structuredClone(valid);
  droppedTarget.targetContract.pop();
  droppedTarget.targetEvidence.pop();
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(droppedTarget))).toContain(
    "target-contract-mismatch"
  );
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(droppedTarget))).toContain(
    "target-evidence-count"
  );

  const weakCore = structuredClone(valid);
  weakCore.targetEvidence[0].corePixelCount = 1;
  weakCore.targetEvidence[0].largestConnectedCorePixelCount = 1;
  weakCore.targetEvidence[0].passed = true;
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(weakCore))).toContain("target-core=1<");
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(weakCore))).toContain("target-pass-invalid");

  const resized = structuredClone(valid);
  resized.bitmapWidth += 1;
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(resized))).toContain(
    "bitmap-backing-size-mismatch"
  );

  const forgedSource = structuredClone(valid);
  forgedSource.sourceContract = "forged" as typeof forgedSource.sourceContract;
  forgedSource.visualPaletteSourceContract = "forged" as typeof forgedSource.visualPaletteSourceContract;
  const forgedIssues = issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(forgedSource));
  expect(forgedIssues).toContain("source-contract-mismatch");
  expect(forgedIssues).toContain("visual-palette-source-contract-mismatch");

  const droppedCompositorTarget = structuredClone(valid);
  droppedCompositorTarget.compositorTargetContract.pop();
  droppedCompositorTarget.compositorTargetEvidence.pop();
  const droppedCompositorIssues = issueText(
    auditCaliforniaPremiumWebGlRetainedContrastEvidence(droppedCompositorTarget)
  );
  expect(droppedCompositorIssues).toContain("compositor-target-contract-mismatch");
  expect(droppedCompositorIssues).toContain("compositor-target-evidence-count");

  const forgedGeometry = structuredClone(valid);
  forgedGeometry.targetContract[0].projectedGeometryDigest = "f".repeat(64);
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(forgedGeometry))).toContain(
    "target-contract-mismatch"
  );

  const forgedObjectCount = structuredClone(valid);
  forgedObjectCount.sceneObjectCount += 1;
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(forgedObjectCount))).toContain(
    "scene-projection-contract-mismatch"
  );

  const forgedCompositorBinding = structuredClone(valid);
  forgedCompositorBinding.compositorBindingSha256 = "f".repeat(64);
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(forgedCompositorBinding))).toContain(
    "compositor-binding-sha256-mismatch"
  );

  const stale = structuredClone(valid);
  expect(issueText(auditCaliforniaPremiumWebGlRetainedContrastEvidence(stale, {
    enforceFreshness: true,
    nowMs: stale.compositorCaptureEndedAtMs + CALIFORNIA_PREMIUM_WEBGL_CAPTURE_MAX_AGE_MS + 1
  }))).toContain("terminal-evidence-stale");
});

test("production capture API rejects arbitrary state keys before Canvas access", async () => {
  await expect(captureAndRegisterCaliforniaPremiumWebGlContrastEvidence({
    canvas: null as never,
    labId: "us-ca-math-s4-chapter-04",
    stateKey: "terminal-settled" as never
  })).rejects.toThrow("premium-webgl-state-key-not-allowed:terminal-settled");
});

for (const catalogLab of deriveCaliforniaLivePremiumWebGlLabs()) {
  test(`real Chromium terminal screenshot corroborates ${catalogLab.labId} roles and background`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await installCaliforniaCanvasTextAudit(page);
    await installCaliforniaPremiumWebGlContrastProvider(page);
    const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
    expect(sourceAudit.issues, issueText(sourceAudit.issues)).toEqual([]);
    const lab = sourceAudit.labs.find((candidate) => candidate.labId === catalogLab.labId);
    expect(lab).toBeTruthy();

    await page.goto(`/student/tools/visualizations/${encodeURIComponent(catalogLab.labId)}`, {
      waitUntil: "domcontentloaded"
    });
    const continueAsGuest = page.getByRole("button", { name: "Continue as guest" });
    const timeline = page.getByRole("slider", { name: "MAIS Manim timeline" }).first();
    await expect.poll(async () =>
      await continueAsGuest.isVisible() || await timeline.isVisible(),
    { timeout: 30_000 }).toBe(true);
    if (await continueAsGuest.isVisible()) await continueAsGuest.click();
    await expect(timeline).toBeVisible({ timeout: 30_000 });
    const playbackRoot = page.locator("[data-viz-manim-playback-state]").first();
    const playbackToggle = page.locator("[data-viz-manim-playback-toggle]").first();
    await expect(playbackRoot).toHaveAttribute("data-viz-manim-playback-state", /^(?:paused|playing)$/);
    if (await playbackRoot.getAttribute("data-viz-manim-playback-state") === "playing") {
      await playbackToggle.click();
    }
    await expect(playbackRoot).toHaveAttribute("data-viz-manim-playback-state", "paused");
    await timeline.press("End");
    await expect(playbackRoot).toHaveAttribute("data-viz-manim-playback-state", "scrubbing");
    await expect(timeline).toHaveAttribute("aria-valuenow", "1000");
    for (const expectedValue of [950, 900, 850, 800, 750]) {
      await timeline.press("ArrowLeft");
      await expect(timeline).toHaveAttribute("aria-valuenow", String(expectedValue));
    }
    if (await continueAsGuest.isVisible()) await continueAsGuest.click();
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));

    const visibleCanvases = page.locator("main canvas:visible");
    await expect(visibleCanvases).toHaveCount(1);
    const canvasLocator = visibleCanvases.first();
    await expect(canvasLocator).toBeVisible();
    const canvasHandle = await canvasLocator.elementHandle();
    if (!canvasHandle) throw new Error("terminal-webgl-canvas-handle-missing");
    if (!await canvasHandle.evaluate((element) => element instanceof HTMLCanvasElement)) {
      throw new Error("terminal-webgl-element-is-not-canvas");
    }
    const canvas = canvasHandle as ElementHandle<HTMLCanvasElement>;

    if (catalogLab.labId === "us-ca-math-s4-chapter-04") {
      const nonCanvasHandle = await page.locator("[data-viz-manim-playback-state]").first().elementHandle();
      if (!nonCanvasHandle) throw new Error("terminal-webgl-non-canvas-canary-handle-missing");
      await expect(captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence({
        canvas: nonCanvasHandle as unknown as ElementHandle<HTMLCanvasElement>,
        labId: catalogLab.labId
      })).rejects.toThrow("premium-webgl-provider-canvas-required");
    }

    if (catalogLab.labId === "us-ca-math-s4-chapter-04") {
      for (const canaryKind of ["sibling", "pseudo", "img", "background", "clip", "mask"] as const) {
        await canvas.evaluate(async (element, kind) => {
          const rect = element.getBoundingClientRect();
          if (kind === "sibling") {
            const overlay = document.createElement("div");
            overlay.id = "premium-webgl-compositor-overlay-canary";
            Object.assign(overlay.style, {
              background: "rgb(255, 255, 255)",
              height: `${rect.height}px`,
              left: `${rect.left}px`,
              pointerEvents: "none",
              position: "fixed",
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              zIndex: "2147483647"
            });
            document.body.append(overlay);
            return;
          }
          if (kind === "pseudo") {
            const root = element.closest<HTMLElement>("[data-viz-manim-playback-state]");
            if (!root) throw new Error("premium-webgl-pseudo-canary-root-missing");
            root.setAttribute("data-premium-webgl-pseudo-canary", "true");
            const style = document.createElement("style");
            style.id = "premium-webgl-pseudo-canary-style";
            style.textContent = `[data-premium-webgl-pseudo-canary=\"true\"]::after{content:\"\";` +
              `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;` +
              `height:${rect.height}px;background:#fff;pointer-events:none;z-index:2147483647}`;
            document.head.append(style);
            return;
          }
          if (kind === "img") {
            const overlay = document.createElement("img");
            overlay.id = "premium-webgl-compositor-img-canary";
            overlay.alt = "";
            overlay.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
              "width='8' height='8'%3E%3Crect width='8' height='8' fill='white'/%3E%3C/svg%3E";
            Object.assign(overlay.style, {
              height: `${rect.height}px`,
              left: `${rect.left}px`,
              pointerEvents: "none",
              position: "fixed",
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              zIndex: "2147483647"
            });
            document.body.append(overlay);
            await overlay.decode();
            return;
          }
          if (kind === "background") {
            if (!element.parentElement) throw new Error("premium-webgl-background-canary-parent-missing");
            element.parentElement.setAttribute("data-premium-webgl-background-canary", "true");
            element.parentElement.style.background = "rgb(255, 255, 255)";
            element.style.opacity = "0";
            return;
          }
          if (kind === "clip") {
            element.style.clipPath = "inset(0 0 0 100%)";
            return;
          }
          element.style.maskImage = "linear-gradient(transparent, transparent)";
          element.style.setProperty("-webkit-mask-image", "linear-gradient(transparent, transparent)");
        }, canaryKind);
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
        await expect(captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence({
          canvas,
          labId: catalogLab.labId
        }), canaryKind).rejects.toThrow("premium-webgl-compositor-raster-contract-failed");
        await canvas.evaluate((element, kind) => {
          if (kind === "sibling") document.querySelector("#premium-webgl-compositor-overlay-canary")?.remove();
          if (kind === "pseudo") {
            document.querySelector("#premium-webgl-pseudo-canary-style")?.remove();
            element.closest<HTMLElement>("[data-viz-manim-playback-state]")
              ?.removeAttribute("data-premium-webgl-pseudo-canary");
          }
          if (kind === "img") document.querySelector("#premium-webgl-compositor-img-canary")?.remove();
          if (kind === "background") {
            element.style.removeProperty("opacity");
            element.parentElement?.style.removeProperty("background");
            element.parentElement?.removeAttribute("data-premium-webgl-background-canary");
          }
          if (kind === "clip") element.style.removeProperty("clip-path");
          if (kind === "mask") {
            element.style.removeProperty("mask-image");
            element.style.removeProperty("-webkit-mask-image");
          }
        }, canaryKind);
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      }
    }

    const registration = await captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence({
      canvas,
      labId: catalogLab.labId,
      testHooks: {
        beforeRegister: async ({ evidence }) => {
          const pendingReplacementRejection = await canvas.evaluate(async (element, request) => {
            type ProviderApi = {
              capture(canvasElement: HTMLCanvasElement, captureRequest: typeof request): Promise<unknown>;
              version: number;
            };
            const provider = (window as Window & {
              __californiaPremiumWebGlContrastProvider?: ProviderApi;
            }).__californiaPremiumWebGlContrastProvider;
            if (!provider || provider.version !== 3) return "provider-missing";
            try {
              await provider.capture(element, request);
              return "unexpected-capture-pass";
            } catch (error) {
              return error instanceof Error ? error.message : String(error);
            }
          }, {
            labId: evidence.labId,
            stateKey: evidence.stateKey,
            targetContract: evidence.targetContract
          });
          expect(pendingReplacementRejection).toContain("pending-evidence-unconsumed");
        }
      }
    });
    const terminal = registration.terminal;

    await testInfo.attach(`${catalogLab.labId}-terminal-webgl.png`, {
      body: registration.bitmapPng,
      contentType: "image/png"
    });
    await testInfo.attach(`${catalogLab.labId}-terminal-webgl-compositor.png`, {
      body: registration.compositorPng,
      contentType: "image/png"
    });
    await testInfo.attach(`${catalogLab.labId}-terminal-webgl-audit.json`, {
      body: Buffer.from(JSON.stringify({ evidence: registration.evidence, terminal }, null, 2)),
      contentType: "application/json"
    });
    expect(terminal.issues, issueText(terminal.issues)).toEqual([]);
    expect(terminal.domSelfReportTrusted).toBe(false);
    expect(terminal.targetEvidence.every((target) => target.passed)).toBe(true);
    expect(registration.compositorTerminal.issues).toEqual([]);
    expect(registration.compositorTerminal.targetEvidence.every((target) => target.passed)).toBe(true);
    expect(registration.evidence.bitmapWidth).toBe(registration.evidence.backingWidth);
    expect(registration.evidence.bitmapHeight).toBe(registration.evidence.backingHeight);

    const registeredReplacementRejection = await canvas.evaluate((element, evidence) => {
      type ProviderApi = {
        register(canvasElement: HTMLCanvasElement, registeredEvidence: typeof evidence): void;
        version: number;
      };
      const provider = (window as Window & {
        __californiaPremiumWebGlContrastProvider?: ProviderApi;
      }).__californiaPremiumWebGlContrastProvider;
      if (!provider || provider.version !== 3) return "provider-missing";
      try {
        provider.register(element, evidence);
        return "unexpected-registration-pass";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    }, registration.evidence);
    expect(registeredReplacementRejection).toContain("registered-evidence-unconsumed");

    const providerOutcomes = await canvas.evaluate((element) => {
      type SurfaceOutcome = {
        canvas: HTMLCanvasElement;
        contextKind: string;
        hasExecutableNonTextEvidence: boolean;
        unsupportedReasons: string[];
      };
      type CanvasAuditApi = {
        contrastSurfaceOutcomes(root: HTMLElement): SurfaceOutcome[];
      };
      const api = (window as Window & {
        __californiaCanvasTextAudit?: CanvasAuditApi;
      }).__californiaCanvasTextAudit;
      const root = document.querySelector<HTMLElement>("main");
      if (!api || !root) throw new Error("canvas-audit-provider-fixture-missing");
      const summarize = () => {
        const outcome = api.contrastSurfaceOutcomes(root).find((candidate) => candidate.canvas === element);
        if (!outcome) throw new Error("webgl-surface-outcome-missing");
        return {
          contextKind: outcome.contextKind,
          hasExecutableNonTextEvidence: outcome.hasExecutableNonTextEvidence,
          unsupportedReasons: outcome.unsupportedReasons
        };
      };
      return { consumed: summarize(), reused: summarize() };
    });
    expect(providerOutcomes.consumed.contextKind).toMatch(/^webgl2?$/);
    expect(providerOutcomes.consumed.hasExecutableNonTextEvidence).toBe(true);
    expect(providerOutcomes.consumed.unsupportedReasons).toEqual([]);
    expect(providerOutcomes.reused.hasExecutableNonTextEvidence).toBe(false);
    expect(providerOutcomes.reused.unsupportedReasons).toContain(
      "Visible WebGL visualization has no executable material/background and terminal-raster contrast provider"
    );

    if (catalogLab.labId === "us-ca-math-s4-chapter-04") {
      await expect(captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence({
        canvas,
        labId: catalogLab.labId,
        testHooks: {
          beforeRegister: async () => {
            await canvas.evaluate((element) => {
              element.replaceWith(element.cloneNode(true));
            });
          }
        }
      })).rejects.toThrow(/canvas-detached|playback-root-missing/);
      await expect(page.locator("main canvas:visible")).toHaveCount(1);
    } else {
      await expect(captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence({
        canvas,
        labId: catalogLab.labId,
        testHooks: {
          mutateEvidenceBeforeRegister: (evidence) => {
            evidence.bitmapWidth += 1;
          }
        }
      })).rejects.toThrow("capture-bitmap-size-mismatch");
    }
  });
}
