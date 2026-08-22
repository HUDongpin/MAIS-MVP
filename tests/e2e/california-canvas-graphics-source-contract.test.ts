import assert from "node:assert/strict";
import test from "node:test";
import {
  CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
  CALIFORNIA_CANVAS_GRAPHICS_ROLE_REGISTRY,
  CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256,
  analyzeCaliforniaCanvasGraphicsSource,
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  assertExactCaliforniaCanvasPaintSiteKeys,
  buildCaliforniaCanvasGraphicsSourceContract,
  californiaCanvasRuntimeEvidenceRequiredSites,
  type CaliforniaCanvasRoleRegistryEntry
} from "./california-canvas-graphics-source-contract";

function fixture(body: string) {
  return `
    function FixtureLab() {
      const canvasRef = useRef(null);
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = 320;
        const H = 180;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);
        ${body}
      };
      return <canvas ref={canvasRef} />;
    }
  `;
}

function analyze(source: string, roleRegistry: Readonly<Record<string, CaliforniaCanvasRoleRegistryEntry>> = {}) {
  return analyzeCaliforniaCanvasGraphicsSource({
    benchId: "FixtureLab",
    roleRegistry,
    source,
    sourcePath: "components/visualizations/signature/FixtureLab.jsx"
  });
}

let cachedProductionContract: ReturnType<typeof buildCaliforniaCanvasGraphicsSourceContract> | null = null;
function productionContract() {
  cachedProductionContract ??= buildCaliforniaCanvasGraphicsSourceContract();
  return cachedProductionContract;
}

test("California Canvas source contract freezes all 186 benches, 190 contexts, and 2,372 terminal paints", () => {
  const contract = productionContract();
  assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.paintSites), true);
  assert.equal(Object.isFrozen(contract.paintSites[0]), true);
  assert.equal(Object.isFrozen(contract.apiCensus), true);
  assert.equal(Object.isFrozen(contract.apiCensus.terminalGraphicsMethods), true);
  assert.throws(() => {
    (contract.paintSites as unknown as unknown[]).splice(1, 1);
  }, TypeError);
  assert.equal(contract.sourceSha256, CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256);
  assert.deepEqual(contract.counts, {
    animatedSources: 71,
    authoredPathGroups: 255,
    benches: 186,
    canvases: 190,
    clearEpochs: 190,
    clipSites: 20,
    contextAcquisitions2d: 190,
    dynamicAlphaSites: 107,
    dynamicPaintSites: 485,
    gradientPaintSites: 3,
    paintSites: 2_372,
    registrySites: 2,
    shadowPaintSites: 10,
    unresolvedPathFamilies: 0
  });
  assert.deepEqual(contract.apiCensus, {
    animationMethods: {
      cancelAnimationFrame: 96,
      requestAnimationFrame: 150
    },
    canvasPropertyWrites: { height: 190, width: 190 },
    clearMethods: { clearRect: 190 },
    clipMethods: { clip: 20 },
    contextPropertyWrites: {
      fillStyle: 2_119,
      font: 1_273,
      globalAlpha: 52,
      letterSpacing: 3,
      lineCap: 44,
      lineJoin: 48,
      lineWidth: 1_412,
      shadowBlur: 6,
      shadowColor: 3,
      shadowOffsetY: 1,
      strokeStyle: 1_445,
      textAlign: 1_040,
      textBaseline: 916
    },
    gradientMethods: {
      addColorStop: 7,
      createLinearGradient: 2,
      createRadialGradient: 1
    },
    pathMethods: {
      arc: 364,
      arcTo: 296,
      beginPath: 1_562,
      bezierCurveTo: 7,
      closePath: 210,
      ellipse: 17,
      lineTo: 1_568,
      moveTo: 1_478,
      quadraticCurveTo: 14,
      rect: 20,
      roundRect: 9
    },
    stateMethods: {
      restore: 626,
      rotate: 24,
      save: 623,
      scale: 1,
      setLineDash: 539,
      setTransform: 190,
      translate: 28
    },
    terminalGraphicsMethods: {
      fill: 622,
      fillRect: 233,
      stroke: 1_394,
      strokeRect: 123
    },
    textMethods: {
      fillText: 1_449,
      measureText: 274,
      strokeText: 1
    }
  });
  assert.equal(new Set(contract.bindings.map((binding) => binding.key)).size, 190);
  assert.equal(new Set(contract.paintSites.map((site) => site.sourceSiteKey)).size, 2_372);
  assert.equal(contract.paintSites.filter((site) => site.pathFamily.startsWith("unresolved:")).length, 0);
  assert.equal(contract.clipSites.filter((site) => site.pathFamily.startsWith("unresolved:")).length, 0);
  assert.deepEqual(
    contract.paintSites.filter((site) => site.role !== "essential").map((site) => site.role).sort(),
    ["background", "decorative"]
  );
  assert.equal(californiaCanvasRuntimeEvidenceRequiredSites(contract).length, 2_370);
});

test("each lexical Canvas context owns exactly one clear epoch", () => {
  const contract = productionContract();
  const counts = new Map<string, number>();
  for (const epoch of contract.clearEpochSites) {
    for (const key of epoch.canvasContextKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.deepEqual(
    contract.bindings.map((binding) => [binding.key, counts.get(binding.key)]),
    contract.bindings.map((binding) => [binding.key, 1])
  );
});

test("transparent pixels retain an explicit external paper prerequisite, not source evidence", () => {
  const contract = productionContract();
  assert.equal(CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER, "#fbfbf8");
  assert.deepEqual(contract.runtimePrerequisites, {
    externalCompositePaper: "#fbfbf8",
    externalCompositePaperSourceProven: false
  });
});

test("a missing middle paint source site cannot self-shrink the exact expected set", () => {
  const complete = analyze(fixture(`
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#111';
    ctx.strokeRect(4, 4, 40, 20);
    ctx.fillStyle = '#c81e4f';
    ctx.fillRect(8, 8, 12, 12);
  `));
  const missingMiddle = analyze(fixture(`
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c81e4f';
    ctx.fillRect(8, 8, 12, 12);
  `));
  assert.equal(complete.paintSites.length, 3);
  assert.equal(missingMiddle.paintSites.length, 2);
  assert.throws(
    () => assertExactCaliforniaCanvasPaintSiteKeys(
      complete.paintSites.map((site) => site.sourceSiteKey),
      missingMiddle.paintSites.map((site) => site.sourceSiteKey)
    ),
    /paint-site coverage is not exact.*missing=/
  );
});

test("moving a paint call changes its terminal-order source identity", () => {
  const first = analyze(fixture(`
    ctx.fillStyle = '#c81e4f';
    ctx.fillRect(1, 2, 30, 40);
    ctx.strokeStyle = '#1c2b3a';
    ctx.strokeRect(1, 2, 30, 40);
  `));
  const moved = analyze(fixture(`
    ctx.strokeStyle = '#1c2b3a';
    ctx.strokeRect(1, 2, 30, 40);
    ctx.fillStyle = '#c81e4f';
    ctx.fillRect(1, 2, 30, 40);
  `));
  assert.throws(
    () => assertExactCaliforniaCanvasPaintSiteKeys(
      first.paintSites.map((site) => site.sourceSiteKey),
      moved.paintSites.map((site) => site.sourceSiteKey)
    ),
    /paint-site coverage is not exact/
  );
});

test("helper-authored paths freeze every middle segment and do not become opaque exemptions", () => {
  const complete = analyze(fixture(`
    const authoredShape = () => {
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(20, 2);
      ctx.lineTo(20, 20);
      ctx.closePath();
    };
    authoredShape();
    ctx.fillStyle = '#c81e4f';
    ctx.fill();
  `));
  const missingSegment = analyze(fixture(`
    const authoredShape = () => {
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(20, 20);
      ctx.closePath();
    };
    authoredShape();
    ctx.fillStyle = '#c81e4f';
    ctx.fill();
  `));
  assert.match(complete.paintSites[0].pathFamily, /^helper-path:authoredShape:/);
  assert.notEqual(complete.paintSites[0].pathFamily, missingSegment.paintSites[0].pathFamily);
  assert.throws(
    () => assertExactCaliforniaCanvasPaintSiteKeys(
      complete.paintSites.map((site) => site.sourceSiteKey),
      missingSegment.paintSites.map((site) => site.sourceSiteKey)
    ),
    /paint-site coverage is not exact/
  );
});

test("fill and stroke group only with the same proven authored path and control flow", () => {
  const analysis = analyze(fixture(`
    ctx.beginPath();
    ctx.rect(1, 1, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(40, 40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40, 40, 8, 0, Math.PI * 2);
    ctx.stroke();
  `));
  assert.ok(analysis.paintSites[0].authoredPathGroupKey);
  assert.equal(
    analysis.paintSites[0].authoredPathGroupKey,
    analysis.paintSites[1].authoredPathGroupKey
  );
  assert.equal(analysis.paintSites[2].authoredPathGroupKey, null);
  assert.equal(analysis.paintSites[3].authoredPathGroupKey, null);
});

test("dynamic color, alpha, and conditional shadow inputs remain runtime-required", () => {
  const analysis = analyze(fixture(`
    const color = chooseColor();
    const alpha = opacityForState();
    if (glow) ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.rect(0, 0, 20, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(200,30,79,0.2)';
    ctx.fillRect(0, 0, W, H);
  `));
  assert.equal(analysis.paintSites[0].colorAlphaClass, "dynamic");
  assert.equal(analysis.paintSites[0].alphaClass, "dynamic");
  assert.equal(analysis.paintSites[0].shadowClass, "dynamic");
  assert.equal(analysis.paintSites[1].colorAlphaClass, "static-translucent");
  assert.equal(analysis.paintSites[1].alphaClass, "static-opaque");
  assert.equal(analysis.paintSites[1].shadowClass, "static-none");
});

test("arbitrary clip path families are distinct and Path2D-like clip arguments fail closed", () => {
  const analysis = analyze(fixture(`
    ctx.beginPath();
    ctx.rect(0, 0, 20, 20);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(10, 10, 8, 0, Math.PI * 2);
    ctx.clip('evenodd');
  `));
  assert.equal(analysis.clipSites.length, 2);
  assert.notEqual(analysis.clipSites[0].pathFamily, analysis.clipSites[1].pathFamily);
  assert.throws(
    () => analyze(fixture(`
      ctx.beginPath();
      ctx.rect(0, 0, 20, 20);
      ctx.clip(shape);
    `)),
    /unsupported arbitrary clip argument family/
  );
});

test("requestAnimationFrame and clear epochs are censused and duplicate/missing epochs fail", () => {
  const analysis = analyze(fixture(`
    requestAnimationFrame(draw);
    cancelAnimationFrame(raf);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
  `));
  assert.deepEqual(Object.fromEntries(analysis.apiCensus.animationMethods), {
    cancelAnimationFrame: 1,
    requestAnimationFrame: 1
  });
  assert.equal(analysis.clearEpochSites.length, 1);
  assert.throws(
    () => analyze(fixture(`
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
    `)),
    /has 2 clearRect epochs/
  );
  assert.throws(
    () => analyze(fixture("ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);")
      .replace("ctx.clearRect(0, 0, W, H);", "")),
    /has 0 clearRect epochs/
  );
});

test("unsupported draw, Path2D, pattern, compositing, filter, and pixel APIs fail closed", () => {
  const unsupportedBodies = [
    "ctx.drawImage(image, 0, 0);",
    "const p = new Path2D(); ctx.fill(p);",
    "ctx.createPattern(image, 'repeat');",
    "ctx.globalCompositeOperation = 'multiply';",
    "ctx.filter = 'blur(2px)';",
    "ctx.getImageData(0, 0, 1, 1);",
    "ctx.putImageData(imageData, 0, 0);",
    "ctx.createImageData(1, 1);"
  ];
  for (const body of unsupportedBodies) {
    assert.throws(() => analyze(fixture(body)), /unsupported/);
  }
  assert.throws(() => analyze(fixture("ctx.magicPaint();")), /uncensused Canvas context method/);
});

test("role registry rejects stale keys, identity lies, and false background geometry", () => {
  const baseline = analyze(fixture(`
    ctx.fillStyle = '#fbfbf8';
    ctx.fillRect(0, 0, W, H);
  `));
  const site = baseline.paintSites[0];
  assert.throws(
    () => analyze(fixture("ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);"), {
      stale: {
        claim: "full-canvas-background",
        expectedIdentitySha256: site.expectedIdentitySha256,
        rationale: "stale canary",
        role: "background"
      }
    }),
    /stale\/unknown key/
  );
  assert.throws(
    () => analyze(fixture("ctx.fillStyle = '#fbfbf8'; ctx.fillRect(0, 0, W, H);"), {
      [site.sourceSiteKey]: {
        claim: "full-canvas-background",
        expectedIdentitySha256: "0".repeat(64),
        rationale: "identity-lie canary",
        role: "background"
      }
    }),
    /identity lie/
  );

  const partial = analyze(fixture("ctx.fillStyle = '#fbfbf8'; ctx.fillRect(4, 4, 20, 20);"));
  const partialSite = partial.paintSites[0];
  assert.throws(
    () => analyze(fixture("ctx.fillStyle = '#fbfbf8'; ctx.fillRect(4, 4, 20, 20);"), {
      [partialSite.sourceSiteKey]: {
        claim: "full-canvas-background",
        expectedIdentitySha256: partialSite.expectedIdentitySha256,
        rationale: "geometry-lie canary",
        role: "background"
      }
    }),
    /not an exact full-canvas fillRect/
  );
});

test("the reviewed registry is tiny and source-exact", () => {
  assert.equal(Object.keys(CALIFORNIA_CANVAS_GRAPHICS_ROLE_REGISTRY).length, 2);
  const contract = productionContract();
  for (const [key, entry] of Object.entries(CALIFORNIA_CANVAS_GRAPHICS_ROLE_REGISTRY)) {
    const site = contract.paintSites.find((candidate) => candidate.sourceSiteKey === key);
    assert.ok(site);
    assert.equal(site.expectedIdentitySha256, entry.expectedIdentitySha256);
    assert.equal(site.role, entry.role);
  }
});
