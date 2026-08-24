import "server-only";

import {
  intersectLineConicExact,
  rangeOverLineFamily,
} from "../analytic/analyticKernel.server";
import type { ExactIntersectionResultDto } from "../analytic/types";
import { cube } from "../bodies";
import {
  ellipseExact,
  exactConicToNumeric,
} from "../conics/exact.server";
import { toConicRenderSpec } from "../conics/numeric";
import { solveCubeLinePlaneAngle } from "../geometry/solvers.server";
import {
  KERNEL_ERROR_CODES,
  type MathKernelErrorCode,
} from "../shared/errors";
import type { KernelResult, MathJsonExpr } from "../shared/types";
import type { MathKernelDemoPayload } from "./types";

const MIN_SLOPE_QUARTER = -8;
const MAX_SLOPE_QUARTER = 8;
const DEMO_CUBE_EDGE = 1;
const DEMO_RENDER_SCALE = 2;
let demoPayloadCache: MathKernelDemoPayload | undefined;
const exactIntersectionCache = new Map<number, ExactIntersectionResultDto>();

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

function exactDemoEllipse() {
  return ellipseExact({
    a: 2,
    b: ["Sqrt", 3],
    center: [0, 0],
    majorAxis: "x",
  });
}

export function isDemoSlopeQuarter(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_SLOPE_QUARTER &&
    value <= MAX_SLOPE_QUARTER
  );
}

/**
 * Build the JSON-only server payload used by the browser demo. The numeric
 * render model and the exact proof model both originate from one exact conic.
 */
export function buildMathKernelDemoPayload(): KernelResult<MathKernelDemoPayload> {
  if (demoPayloadCache) return { ok: true, value: demoPayloadCache };

  const topology = cube();
  if (!topology.ok) return topology;

  const geometry = solveCubeLinePlaneAngle({
    edge: DEMO_CUBE_EDGE,
    scale: DEMO_RENDER_SCALE,
  });
  if (!geometry.ok) return geometry;

  const exactEllipse = exactDemoEllipse();
  if (!exactEllipse.ok) return exactEllipse;

  const numericEllipse = exactConicToNumeric(exactEllipse.value);
  if (!numericEllipse.ok) return numericEllipse;

  const conic = toConicRenderSpec(numericEllipse.value, { sampleCount: 193 });
  if (!conic.ok) return conic;

  const range = rangeOverLineFamily({
    conic: exactEllipse.value.quadratic,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "chord-length" },
  });
  if (!range.ok) return range;

  const exactIntersection = exactDemoIntersectionForSlopeQuarter(0);
  if (!exactIntersection.ok) return exactIntersection;
  if (exactIntersection.value.kind !== "secant") {
    return fail(
      KERNEL_ERROR_CODES.casOperationFailed,
      "The fixed initial demo line must produce a real secant.",
    );
  }

  demoPayloadCache = deepFreeze({
    schemaVersion: 1,
    geometry: {
      solution: geometry.value,
      topology: topology.value,
      renderEdgeLength: DEMO_CUBE_EDGE * DEMO_RENDER_SCALE,
    },
    analytic: {
      solution: range.value,
      conic: conic.value,
      quadratic: numericEllipse.value.quadratic,
      initialSlopeQuarter: 0,
      exactIntersection: exactIntersection.value,
    },
  });
  return { ok: true, value: demoPayloadCache };
}

/**
 * Recompute the dragged focal secant exactly. The endpoint accepts one small
 * integer numerator only; it is not a general user-expression CAS surface.
 */
export function exactDemoIntersectionForSlopeQuarter(
  slopeQuarter: unknown,
): KernelResult<ExactIntersectionResultDto> {
  if (!isDemoSlopeQuarter(slopeQuarter)) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "slopeQuarter must be an integer from -8 through 8.",
    );
  }

  const cached = exactIntersectionCache.get(slopeQuarter);
  if (cached) return { ok: true, value: cached };

  const exactEllipse = exactDemoEllipse();
  if (!exactEllipse.ok) return exactEllipse;
  const parameter: MathJsonExpr = slopeQuarter === 0
    ? 0
    : ["Rational", slopeQuarter, 4];
  const result = intersectLineConicExact({
    conic: exactEllipse.value.quadratic,
    line: {
      orientation: "xFromY",
      through: [1, 0],
      parameter,
    },
  });
  if (result.ok) exactIntersectionCache.set(slopeQuarter, result.value);
  return result;
}
