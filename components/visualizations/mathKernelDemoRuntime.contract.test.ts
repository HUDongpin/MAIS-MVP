import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type {
  AnalyticRangeSolutionDto,
  ExactIntersectionResultDto,
} from "../../lib/math-kernel/analytic/types";
import type { ConicRenderSpec, Quadratic2D } from "../../lib/math-kernel/conics/model";
import type { ExactValueDto } from "../../lib/math-kernel/shared/types";

const repoRoot = process.cwd();

function exact(
  mathJson: ExactValueDto["mathJson"],
  latex: string,
  decimal: string | null,
  approx: number | null,
): ExactValueDto {
  return { schemaVersion: 1, mathJson, latex, decimal, approx };
}

function analyticSolution(): AnalyticRangeSolutionDto {
  return {
    schemaVersion: 1,
    metric: "chord-length",
    expression: exact("m", "m", null, null),
    interval: {
      lower: {
        kind: "finite",
        value: exact(3, "3", "3", 3),
        closed: true,
        witnesses: [],
      },
      upper: {
        kind: "finite",
        value: exact(4, "4", "4", 4),
        closed: true,
        witnesses: [],
      },
    },
    intervalLatex: "[3,\\ 4]",
    domain: {
      parameter: "m",
      parameterMeaning: "inverse-slope",
      discriminantConstraint: "144m^2+144>0",
      denominatorExclusions: [],
      projectiveEndpoint: {
        line: "horizontal",
        included: true,
        hasRealGeometryWitness: true,
        note: "projective endpoint",
      },
    },
    proof: {
      profile: "centered-axis-aligned-even-rational-v1",
      checkedCriticalPoints: true,
      checkedDomainBoundaries: true,
      checkedPoles: true,
      checkedPositiveInfinity: true,
      checkedNegativeInfinity: true,
      exactNotSampled: true,
    },
    intermediates: [],
    provenance: {
      kernel: "analytic",
      operation: "rangeOverLineFamily",
      sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
    },
  };
}

const conic: ConicRenderSpec = {
  kind: "ellipse",
  sampleCount: 5,
  parameterRange: [0, 2 * Math.PI],
  branches: [{
    id: "curve",
    closed: true,
    points: [[2, 0], [0, Math.sqrt(3)], [-2, 0], [0, -Math.sqrt(3)], [2, 0]],
  }],
};

const quadratic: Quadratic2D<number> = {
  x2: 0.25,
  xy: 0,
  y2: 1 / 3,
  x: 0,
  y: 0,
  constant: -1,
};

function exactSecant(): ExactIntersectionResultDto {
  return {
    schemaVersion: 1,
    kind: "secant",
    coefficients: {
      A: exact(["Rational", 4, 3], "\\frac{4}{3}", "1.3333333333333333", 4 / 3),
      B: exact(0, "0", "0", 0),
      C: exact(-3, "-3", "-3", -3),
      discriminant: exact(16, "16", "16", 16),
    },
    points: [
      [exact(1, "1", "1", 1), exact(["Rational", -3, 2], "-\\frac{3}{2}", "-1.5", -1.5)],
      [exact(1, "1", "1", 1), exact(["Rational", 3, 2], "\\frac{3}{2}", "1.5", 1.5)],
    ],
    chordLengthSquared: exact(9, "9", "9", 9),
  };
}

test("the client demo derives a live secant scene with the browser numeric kernel", async () => {
  const sourcePath = path.join(
    repoRoot,
    "components/visualizations/three/manim/mathKernelInteractiveDemo.ts",
  );
  assert.equal(
    fs.existsSync(sourcePath),
    true,
    "the client-safe interactive demo builder must exist",
  );

  const modulePath = "./three/manim/" + "mathKernelInteractiveDemo";
  const module = await import(modulePath) as {
    buildInteractiveAnalyticKernelDemo(input: {
      readonly solution: AnalyticRangeSolutionDto;
      readonly conic: ConicRenderSpec;
      readonly quadratic: Quadratic2D<number>;
      readonly inverseSlope: number;
      readonly locale: "en" | "zh-CN" | "zh-HK";
      readonly exactIntersection?: ExactIntersectionResultDto | null;
    }): {
      readonly ok: boolean;
      readonly error?: { readonly code: string };
      readonly value?: {
        readonly scene: {
          readonly familyId: string;
          readonly formulas: readonly { readonly latex: string }[];
          readonly parameters?: readonly {
            readonly id: string;
            readonly role: string;
            readonly value: number;
          }[];
          readonly objects: readonly {
            readonly id: string;
            readonly type: string;
            readonly samples?: readonly (readonly [number, number, number])[];
          }[];
        };
        readonly intersection: { readonly kind: string; readonly chordLengthSquared?: number };
        readonly renderSource: "numeric" | "exact";
      };
    };
  };

  const result = module.buildInteractiveAnalyticKernelDemo({
    solution: analyticSolution(),
    conic,
    quadratic,
    inverseSlope: 0,
    locale: "zh-HK",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value?.intersection.kind, "secant");
  assert.equal(result.value?.intersection.chordLengthSquared, 9);
  assert.equal(result.value?.renderSource, "numeric");
  assert.equal(result.value?.scene.familyId, "three-conic-sections-deep");
  assert.equal(result.value?.scene.formulas[0]?.latex, "[3,\\ 4]");
  assert.deepEqual(
    result.value?.scene.parameters?.map(({ id, role, value }) => ({ id, role, value })),
    [
      { id: "inverse-slope", role: "control", value: 0 },
      { id: "chord-length-squared", role: "derived", value: 9 },
    ],
  );

  const exactResult = module.buildInteractiveAnalyticKernelDemo({
    solution: analyticSolution(),
    conic,
    quadratic,
    inverseSlope: 0,
    locale: "zh-HK",
    exactIntersection: exactSecant(),
  });
  assert.equal(exactResult.ok, true);
  assert.equal(exactResult.value?.renderSource, "exact");
  const exactSegment = exactResult.value?.scene.objects.find(
    (object) => object.id === "analytic-segment-focal-chord",
  );
  assert.ok(exactSegment && exactSegment.type === "parametricCurve");
  assert.deepEqual(exactSegment.samples, [[1, -1.5, 0], [1, 1.5, 0]]);

  const inconsistent = JSON.parse(JSON.stringify(exactSecant())) as ExactIntersectionResultDto;
  if (inconsistent.kind !== "secant") throw new Error("fixture must be a secant");
  const inconsistentResult = module.buildInteractiveAnalyticKernelDemo({
    solution: analyticSolution(),
    conic,
    quadratic,
    inverseSlope: 0,
    locale: "en",
    exactIntersection: {
      ...inconsistent,
      chordLengthSquared: exact(4, "4", "4", 4),
    },
  });
  assert.equal(inconsistentResult.ok, false);
  assert.equal(inconsistentResult.error?.code, "INVALID_INTERSECTION");

  const degenerateResult = module.buildInteractiveAnalyticKernelDemo({
    solution: analyticSolution(),
    conic,
    quadratic,
    inverseSlope: 0,
    locale: "en",
    exactIntersection: {
      ...inconsistent,
      points: [inconsistent.points[0], inconsistent.points[0]],
      chordLengthSquared: exact(0, "0", "0", 0),
    },
  });
  assert.equal(degenerateResult.ok, false);
  assert.equal(degenerateResult.error?.code, "INVALID_INTERSECTION");
});

test("the browser route consumes exact DTOs through the existing MathSceneSpec renderer", () => {
  const pagePath = path.join(repoRoot, "app/visualization-lab/math-kernel-demo/page.tsx");
  const apiPath = path.join(repoRoot, "app/api/math-kernel-demo/analytic-exact/route.ts");
  const clientPath = path.join(repoRoot, "components/visualizations/MathKernelDemoLab.tsx");
  const canvasTypesPath = path.join(repoRoot, "components/visualizations/three/threeDSceneTypes.ts");
  const canvasPath = path.join(repoRoot, "components/visualizations/three/ThreeDLabCanvas.tsx");
  const formulaOverlayPath = path.join(
    repoRoot,
    "components/visualizations/three/manim/MathFormulaOverlay.tsx",
  );

  for (const filePath of [pagePath, apiPath, clientPath]) {
    assert.equal(fs.existsSync(filePath), true, `${path.relative(repoRoot, filePath)} must exist`);
  }

  const page = fs.readFileSync(pagePath, "utf8");
  const api = fs.readFileSync(apiPath, "utf8");
  const client = fs.readFileSync(clientPath, "utf8");
  const canvasTypes = fs.readFileSync(canvasTypesPath, "utf8");
  const canvas = fs.readFileSync(canvasPath, "utf8");
  const formulaOverlay = fs.readFileSync(formulaOverlayPath, "utf8");

  assert.match(page, /buildMathKernelDemoPayload/);
  assert.match(page, /MathKernelDemoLab/);
  assert.match(page, /initialScene=/);
  assert.match(page, /params\?\.scene/);
  assert.match(api, /exactDemoIntersectionForSlopeQuarter/);
  assert.match(client, /^"use client";/);
  assert.match(client, /buildInteractiveAnalyticKernelDemo/);
  assert.match(client, /parseExactDemoResponse/);
  assert.match(client, /\/api\/math-kernel-demo\/analytic-exact/);
  assert.match(client, /data-math-kernel-demo-locale/);
  assert.match(client, /lang=\{locale\}/);
  assert.match(client, /runtimeCopy=/);
  assert.match(client, /sceneUnavailable/);
  assert.match(client, /data-math-kernel-demo-scene/);
  assert.match(client, /data-math-kernel-render-source/);
  assert.match(client, /data-math-kernel-render-points/);
  assert.match(client, /data-math-kernel-exact-math-json/);
  assert.match(client, /lastExactSlopeQuarter/);
  assert.match(canvasTypes, /scene\?: MathSceneSpec;/);
  assert.match(canvasTypes, /runtimeCopy\?: ThreeDLabRuntimeCopy;/);
  assert.match(canvas, /scene \?\? buildMathSceneSpecForThreeDFamily/);
  assert.match(canvas, /runtimeCopy\.timelineAriaLabel/);
  assert.match(formulaOverlay, /runtimeCopy\.regionAriaLabel/);
  assert.match(formulaOverlay, /runtimeCopy\.formulaAriaLabel/);
  assert.match(
    formulaOverlay,
    /<MathText[^>]+renderBareMath[^>]+normalizeMath=\{false\}/,
    "bare ExactValueDto LaTeX must be rendered by KaTeX without mutating the DTO",
  );
});
