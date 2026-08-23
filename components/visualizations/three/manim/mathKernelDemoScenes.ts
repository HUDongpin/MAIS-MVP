/**
 * Client-safe demonstration wrappers for the first geometry and analytic
 * math-kernel scenes. They accept server-produced DTOs and never invoke CAS.
 */

import type { AnalyticRangeSolutionDto } from "../../../../lib/math-kernel/analytic/types";
import type { BodyTopology } from "../../../../lib/math-kernel/bodies";
import type { ConicRenderSpec } from "../../../../lib/math-kernel/conics/model";
import type { GeometrySolutionDto } from "../../../../lib/math-kernel/geometry/solutionTypes";
import type { KernelResult } from "../../../../lib/math-kernel/shared/types";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  toMathSceneSpec,
  type AnalyticSceneSegmentInput,
  type GeometrySceneVectorInput,
  type MathKernelLocale,
  type MathKernelTeachingInput,
} from "./mathKernelSceneAdapter";

interface DemoTeachingPair {
  readonly geometry: MathKernelTeachingInput;
  readonly analytic: MathKernelTeachingInput;
}

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
  readonly locale: MathKernelLocale;
}

export interface AnalyticKernelDemoInput {
  readonly solution: AnalyticRangeSolutionDto;
  readonly conic: ConicRenderSpec;
  readonly segments: readonly AnalyticSceneSegmentInput[];
  readonly locale: MathKernelLocale;
}

/** Build the first solid-geometry demonstration without recomputing its answer. */
export function buildGeometryKernelDemoScene(
  input: GeometryKernelDemoInput,
): KernelResult<MathSceneSpec> {
  return toMathSceneSpec({
    kind: "geometry",
    model: input.solution,
    topology: input.topology,
    vectors: input.vectors,
    teaching: MATH_KERNEL_DEMO_TEACHING[input.locale].geometry,
  });
}

/** Build the first analytic-geometry demonstration from explicit render data. */
export function buildAnalyticKernelDemoScene(
  input: AnalyticKernelDemoInput,
): KernelResult<MathSceneSpec> {
  return toMathSceneSpec({
    kind: "analytic",
    model: input.solution,
    render: { conic: input.conic, segments: input.segments },
    teaching: MATH_KERNEL_DEMO_TEACHING[input.locale].analytic,
  });
}
