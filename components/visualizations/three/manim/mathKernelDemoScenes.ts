/**
 * Client-safe demonstration wrappers for the first geometry and analytic
 * math-kernel scenes. They accept server-produced DTOs and never invoke CAS.
 */

import type { AnalyticRangeSolutionDto } from "../../../../lib/math-kernel/analytic/types";
import type { BodyTopology } from "../../../../lib/math-kernel/bodies";
import type { ConicRenderSpec } from "../../../../lib/math-kernel/conics/model";
import type { GeometrySolutionDto } from "../../../../lib/math-kernel/geometry/solutionTypes";
import { KERNEL_ERROR_CODES } from "../../../../lib/math-kernel/shared/errors";
import type { KernelResult } from "../../../../lib/math-kernel/shared/types";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  toMathSceneSpec,
  type AnalyticSceneSegmentInput,
  type GeometryScenePlaneInput,
  type GeometrySceneVectorInput,
  type MathKernelLocale,
  type MathKernelTeachingInput,
} from "./mathKernelSceneAdapter";

interface DemoTeachingPair {
  readonly geometry: MathKernelTeachingInput;
  readonly analytic: MathKernelTeachingInput;
}

const MATH_KERNEL_PARAMETER_LABELS = Object.freeze({
  en: Object.freeze({
    renderEdgeLength: "Rendered cube edge length",
    angleSin: "Line-plane angle sine",
    inverseSlope: "Inverse slope m",
    chordLengthSquared: "Chord length squared",
  }),
  "zh-CN": Object.freeze({
    renderEdgeLength: "正方体渲染棱长",
    angleSin: "线面角正弦",
    inverseSlope: "反斜率 m",
    chordLengthSquared: "弦长平方",
  }),
  "zh-HK": Object.freeze({
    renderEdgeLength: "正方體渲染棱長",
    angleSin: "線面角正弦",
    inverseSlope: "反斜率 m",
    chordLengthSquared: "弦長平方",
  }),
} satisfies Readonly<Record<MathKernelLocale, Readonly<Record<string, string>>>>);

/** Explicit locale coverage; translation lookup remains owned by MAIS i18n. */
export const MATH_KERNEL_DEMO_TEACHING: Readonly<
  Record<MathKernelLocale, DemoTeachingPair>
> = Object.freeze({
  en: Object.freeze({
    geometry: Object.freeze({
      titleKey: "visualization.mathKernel.geometryDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.geometryDemo.explanation",
      ]),
      locale: "en",
    }),
    analytic: Object.freeze({
      titleKey: "visualization.mathKernel.analyticDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.analyticDemo.explanation",
      ]),
      locale: "en",
    }),
  }),
  "zh-CN": Object.freeze({
    geometry: Object.freeze({
      titleKey: "visualization.mathKernel.geometryDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.geometryDemo.explanation",
      ]),
      locale: "zh-CN",
    }),
    analytic: Object.freeze({
      titleKey: "visualization.mathKernel.analyticDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.analyticDemo.explanation",
      ]),
      locale: "zh-CN",
    }),
  }),
  "zh-HK": Object.freeze({
    geometry: Object.freeze({
      titleKey: "visualization.mathKernel.geometryDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.geometryDemo.explanation",
      ]),
      locale: "zh-HK",
    }),
    analytic: Object.freeze({
      titleKey: "visualization.mathKernel.analyticDemo.title",
      explanationKeys: Object.freeze([
        "visualization.mathKernel.analyticDemo.explanation",
      ]),
      locale: "zh-HK",
    }),
  }),
});

export interface GeometryKernelDemoInput {
  readonly solution: GeometrySolutionDto;
  readonly topology: BodyTopology;
  readonly vectors?: readonly GeometrySceneVectorInput[];
  readonly planes?: readonly GeometryScenePlaneInput[];
  /** Server-declared render input, retained in scene export/replay metadata. */
  readonly renderEdgeLength: number;
  readonly locale: MathKernelLocale;
}

export interface AnalyticKernelDemoInput {
  readonly solution: AnalyticRangeSolutionDto;
  readonly conic: ConicRenderSpec;
  readonly segments: readonly AnalyticSceneSegmentInput[];
  readonly inverseSlope: number;
  readonly chordLengthSquared: number;
  readonly locale: MathKernelLocale;
}

/** Build the first solid-geometry demonstration without recomputing its answer. */
export function buildGeometryKernelDemoScene(
  input: GeometryKernelDemoInput,
): KernelResult<MathSceneSpec> {
  const labels = MATH_KERNEL_PARAMETER_LABELS[input.locale];
  const derived = input.solution.answer.approx;
  return toMathSceneSpec({
    kind: "geometry",
    model: input.solution,
    topology: input.topology,
    vectors: input.vectors,
    planes: input.planes,
    parameters: [
      {
        conceptId: "geometry-edge",
        id: "cube-render-edge-length",
        label: labels.renderEdgeLength,
        min: 0,
        role: "control",
        value: input.renderEdgeLength,
      },
      ...(typeof derived === "number" && Number.isFinite(derived)
        ? [{
            conceptId: "geometry-line-plane-angle",
            id: "line-plane-angle-sin",
            label: labels.angleSin,
            min: 0,
            max: 1,
            role: "derived" as const,
            value: derived,
          }]
        : []),
    ],
    teaching: MATH_KERNEL_DEMO_TEACHING[input.locale].geometry,
  });
}

/** Build the first analytic-geometry demonstration from explicit render data. */
export function buildAnalyticKernelDemoScene(
  input: AnalyticKernelDemoInput,
): KernelResult<MathSceneSpec> {
  if (input.solution.metric !== "chord-length") {
    return {
      ok: false,
      error: {
        code: KERNEL_ERROR_CODES.invalidInput,
        message: "The analytic kernel demo only supports chord-length range solutions.",
      },
    };
  }
  const labels = MATH_KERNEL_PARAMETER_LABELS[input.locale];
  return toMathSceneSpec({
    kind: "analytic",
    model: input.solution,
    render: { conic: input.conic, segments: input.segments },
    parameters: [
      {
        conceptId: "analytic-segment-focal-chord",
        id: "inverse-slope",
        label: labels.inverseSlope,
        min: -2,
        max: 2,
        role: "control",
        value: input.inverseSlope,
      },
      {
        conceptId: "analytic-segment-focal-chord",
        id: "chord-length-squared",
        label: labels.chordLengthSquared,
        min: 0,
        role: "derived",
        value: input.chordLengthSquared,
      },
    ],
    teaching: MATH_KERNEL_DEMO_TEACHING[input.locale].analytic,
  });
}
