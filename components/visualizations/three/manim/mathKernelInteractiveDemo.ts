/** Browser-only interaction bridge for the analytic math-kernel demo. */

import { intersectLineConicNumeric } from "../../../../lib/math-kernel/analytic/numeric";
import type {
  AnalyticRangeSolutionDto,
  ExactIntersectionResultDto,
  NumericSecantIntersection,
} from "../../../../lib/math-kernel/analytic/types";
import type {
  ConicRenderSpec,
  Quadratic2D,
} from "../../../../lib/math-kernel/conics/model";
import {
  KERNEL_ERROR_CODES,
  type MathKernelErrorCode,
} from "../../../../lib/math-kernel/shared/errors";
import type { KernelResult } from "../../../../lib/math-kernel/shared/types";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildAnalyticKernelDemoScene,
  type AnalyticKernelDemoInput,
} from "./mathKernelDemoScenes";

export interface InteractiveAnalyticKernelDemoInput {
  readonly solution: AnalyticRangeSolutionDto;
  readonly conic: ConicRenderSpec;
  readonly quadratic: Quadratic2D<number>;
  readonly inverseSlope: number;
  readonly locale: AnalyticKernelDemoInput["locale"];
  /**
   * When present, this is the authoritative server result for the same slope.
   * Its finite approximations replace the transient browser coordinates.
   */
  readonly exactIntersection?: ExactIntersectionResultDto | null;
}

export interface InteractiveAnalyticKernelDemoResult {
  readonly scene: MathSceneSpec;
  readonly intersection: NumericSecantIntersection;
  readonly renderSource: "numeric" | "exact";
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
): KernelResult<T> {
  return { ok: false, error: { code, message } };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function finiteApprox(value: { readonly approx: number | null }): number | null {
  return typeof value.approx === "number" && Number.isFinite(value.approx)
    ? Object.is(value.approx, -0) ? 0 : value.approx
    : null;
}

function exactSecantToNumeric(
  exactIntersection: ExactIntersectionResultDto,
  numericIntersection: NumericSecantIntersection,
): KernelResult<NumericSecantIntersection> {
  if (exactIntersection.kind !== "secant") {
    return fail(
      KERNEL_ERROR_CODES.invalidIntersection,
      "The exact focal-line result must be a real secant.",
    );
  }

  const x1 = finiteApprox(exactIntersection.points[0][0]);
  const y1 = finiteApprox(exactIntersection.points[0][1]);
  const x2 = finiteApprox(exactIntersection.points[1][0]);
  const y2 = finiteApprox(exactIntersection.points[1][1]);
  const chordLengthSquared = finiteApprox(exactIntersection.chordLengthSquared);
  if (
    x1 === null || y1 === null || x2 === null || y2 === null ||
    chordLengthSquared === null
  ) {
    return fail(
      KERNEL_ERROR_CODES.exactToNumberFailed,
      "The exact focal-line result cannot be converted to finite render coordinates.",
    );
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const endpointDistanceSquared = dx * dx + dy * dy;
  if (!Number.isFinite(endpointDistanceSquared)) {
    return fail(
      KERNEL_ERROR_CODES.exactToNumberFailed,
      "The exact focal-line endpoint distance is not a finite render value.",
    );
  }
  const tolerance = Math.max(
    1e-12,
    1e-10 * Math.max(endpointDistanceSquared, chordLengthSquared),
  );
  if (
    endpointDistanceSquared <= 0 ||
    chordLengthSquared <= 0 ||
    Math.abs(endpointDistanceSquared - chordLengthSquared) > tolerance
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidIntersection,
      "The exact focal-line endpoints and chord length are inconsistent.",
    );
  }

  return {
    ok: true,
    value: deepFreeze({
      ...numericIntersection,
      points: [[x1, y1], [x2, y2]],
      chordLengthSquared,
    }),
  };
}

/**
 * Rebuild only the browser render segment while a learner drags m. No CAS or
 * exact-expression code is reachable from this module.
 */
export function buildInteractiveAnalyticKernelDemo(
  input: InteractiveAnalyticKernelDemoInput,
): KernelResult<InteractiveAnalyticKernelDemoResult> {
  const intersection = intersectLineConicNumeric(input.quadratic, {
    orientation: "xFromY",
    through: [1, 0],
    parameter: input.inverseSlope,
  });
  if (!intersection.ok) return intersection;
  if (intersection.value.kind !== "secant") {
    return fail(
      KERNEL_ERROR_CODES.invalidIntersection,
      "The focal-line demo requires a real secant with two endpoints.",
    );
  }

  const renderIntersection = input.exactIntersection === undefined || input.exactIntersection === null
    ? { ok: true, value: intersection.value } as const
    : exactSecantToNumeric(input.exactIntersection, intersection.value);
  if (!renderIntersection.ok) return renderIntersection;

  const scene = buildAnalyticKernelDemoScene({
    solution: input.solution,
    conic: input.conic,
    segments: [{
      id: "focal-chord",
      from: renderIntersection.value.points[0],
      to: renderIntersection.value.points[1],
    }],
    inverseSlope: input.inverseSlope,
    chordLengthSquared: renderIntersection.value.chordLengthSquared,
    locale: input.locale,
  });
  if (!scene.ok) return scene;

  return {
    ok: true,
    value: deepFreeze({
      scene: scene.value,
      intersection: renderIntersection.value,
      renderSource: input.exactIntersection === undefined || input.exactIntersection === null
        ? "numeric"
        : "exact",
    }),
  };
}
