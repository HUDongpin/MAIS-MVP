export type DiagramPoint = { x: number; y: number };

export type MathAngleContractSpace = "svg" | "canvas" | "world";

/**
 * Machine-readable geometry for an angle mark.  Keeping the signed sweep is
 * essential: a zero-degree angle and a full turn have identical endpoints,
 * while reflex angles cannot be reconstructed from endpoints alone.
 */
export type MathAngleContract = {
  version: 1;
  id: string;
  space: MathAngleContractSpace;
  origin: DiagramPoint;
  radius: number;
  start: DiagramPoint;
  end: DiagramPoint;
  startRay: DiagramPoint;
  endRay: DiagramPoint;
  sweepRadians: number;
};

export type DiagramBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type DiagramOverflowDirection = "up" | "down" | "left" | "right";

/**
 * Returns the SVG-space point a positive radius away from a vertex on a
 * mathematical ray. SVG's y-axis points down, so a positive mathematical
 * angle subtracts its sine component from y.
 */
export function svgPointOnRay(vertex: DiagramPoint, radius: number, angleRadians: number): DiagramPoint {
  if (!Number.isFinite(radius) || radius < 0 || !Number.isFinite(angleRadians)) {
    throw new RangeError("SVG ray geometry requires a finite, non-negative radius and finite angle");
  }
  return {
    x: vertex.x + radius * Math.cos(angleRadians),
    y: vertex.y - radius * Math.sin(angleRadians)
  };
}

function normalizedDirection(direction: DiagramPoint, label: string): DiagramPoint {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length <= 1e-12) {
    throw new RangeError(`${label} must be a finite, non-zero direction`);
  }
  return { x: direction.x / length, y: direction.y / length };
}

function finiteDiagramPoint(point: DiagramPoint | null | undefined): point is DiagramPoint {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function normalizedDirectionOrNull(direction: DiagramPoint | null | undefined): DiagramPoint | null {
  if (!finiteDiagramPoint(direction)) return null;
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length <= 1e-12) return null;
  return { x: direction.x / length, y: direction.y / length };
}

export function buildMathAngleContract({
  endRay,
  id,
  origin,
  radius,
  space = "svg",
  startRay,
  sweepRadians
}: {
  endRay: DiagramPoint;
  id: string;
  origin: DiagramPoint;
  radius: number;
  space?: MathAngleContractSpace;
  startRay: DiagramPoint;
  sweepRadians: number;
}): MathAngleContract {
  if (!id.trim()) throw new RangeError("Math angle contract requires a stable id");
  if (![origin.x, origin.y, radius, sweepRadians].every(Number.isFinite) || radius < 0) {
    throw new RangeError("Math angle contract requires finite geometry and a non-negative radius");
  }
  const normalizedStartRay = normalizedDirection(startRay, "startRay");
  const normalizedEndRay = normalizedDirection(endRay, "endRay");
  return {
    version: 1,
    id,
    space,
    origin,
    radius,
    start: {
      x: origin.x + normalizedStartRay.x * radius,
      y: origin.y + normalizedStartRay.y * radius
    },
    end: {
      x: origin.x + normalizedEndRay.x * radius,
      y: origin.y + normalizedEndRay.y * radius
    },
    startRay: normalizedStartRay,
    endRay: normalizedEndRay,
    sweepRadians
  };
}

export function serializeMathAngleContract(contract: MathAngleContract) {
  return JSON.stringify(contract);
}

export function verifyMathAngleContract(contract: MathAngleContract, tolerance = 0.01): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Math angle contract tolerance must be finite and non-negative");
  }

  if (contract.version !== 1) issues.push("contract version is not supported");
  if (typeof contract.id !== "string" || !contract.id.trim()) issues.push("contract id is missing");
  if (!(["svg", "canvas", "world"] as const).includes(contract.space)) {
    issues.push("contract space is not supported");
  }

  const originIsFinite = finiteDiagramPoint(contract.origin);
  const radiusIsFinite = Number.isFinite(contract.radius);
  const sweepIsFinite = Number.isFinite(contract.sweepRadians);
  if (!originIsFinite || !radiusIsFinite || !sweepIsFinite) {
    issues.push("contract contains non-finite geometry");
  }
  if (radiusIsFinite && contract.radius < 0) issues.push("contract radius is negative");

  const endpoints = [
    { label: "start", point: contract.start, ray: contract.startRay },
    { label: "end", point: contract.end, ray: contract.endRay }
  ];
  for (const endpoint of endpoints) {
    if (!finiteDiagramPoint(endpoint.point)) {
      issues.push(`${endpoint.label} endpoint is non-finite`);
      continue;
    }
    const unitRay = normalizedDirectionOrNull(endpoint.ray);
    if (!unitRay) {
      issues.push(`${endpoint.label} ray is degenerate`);
      continue;
    }
    if (!originIsFinite || !radiusIsFinite) continue;
    const vector = {
      x: endpoint.point.x - contract.origin.x,
      y: endpoint.point.y - contract.origin.y
    };
    const radiusError = Math.abs(Math.hypot(vector.x, vector.y) - contract.radius);
    if (radiusError > tolerance) issues.push(`${endpoint.label} radius error ${radiusError}`);
    const perpendicularDistance = Math.abs(vector.x * unitRay.y - vector.y * unitRay.x);
    if (perpendicularDistance > tolerance) {
      issues.push(`${endpoint.label} misses its defining ray by ${perpendicularDistance}`);
    }
    if (vector.x * unitRay.x + vector.y * unitRay.y < -tolerance) {
      issues.push(`${endpoint.label} lies on the negative extension of its defining ray`);
    }
    const expectedEndpoint = {
      x: contract.origin.x + unitRay.x * contract.radius,
      y: contract.origin.y + unitRay.y * contract.radius
    };
    const endpointError = Math.hypot(
      endpoint.point.x - expectedEndpoint.x,
      endpoint.point.y - expectedEndpoint.y
    );
    if (endpointError > tolerance) {
      issues.push(`${endpoint.label} differs from its defining ray endpoint by ${endpointError}`);
    }
  }

  const startRay = normalizedDirectionOrNull(contract.startRay);
  const endRay = normalizedDirectionOrNull(contract.endRay);
  if (!startRay || !endRay || !sweepIsFinite) return issues;
  const cosine = Math.cos(contract.sweepRadians);
  const sine = Math.sin(contract.sweepRadians);
  const expectedEndRay = contract.space === "world"
    ? {
        x: startRay.x * cosine - startRay.y * sine,
        y: startRay.x * sine + startRay.y * cosine
      }
    : {
        x: startRay.x * cosine + startRay.y * sine,
        y: -startRay.x * sine + startRay.y * cosine
      };
  const sweepDirectionError = Math.hypot(expectedEndRay.x - endRay.x, expectedEndRay.y - endRay.y);
  if (sweepDirectionError > Math.max(1e-6, tolerance / Math.max(1, contract.radius))) {
    issues.push(`signed sweep misses the end ray by ${sweepDirectionError}`);
  }
  return issues;
}

export type SampledSvgAngleArc = {
  start: DiagramPoint;
  end: DiagramPoint;
  pathLength: number;
  samples: DiagramPoint[];
};

/**
 * Validates the painted order of a pure SVG angle-arc path. In particular,
 * this rejects paths that merely pass near both defining rays but continue
 * beyond one of them before ending, which was the original overflow defect.
 */
export function verifySampledSvgAngleArc(
  contract: MathAngleContract,
  painted: SampledSvgAngleArc,
  tolerance = 0.02
): string[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Sampled SVG angle tolerance must be finite and non-negative");
  }
  const issues = verifyMathAngleContract(contract, Math.min(tolerance, 0.01));
  if (contract.space !== "svg") {
    issues.push("sampled SVG angle requires an SVG-space contract");
    return issues;
  }
  if (!finiteDiagramPoint(contract.origin) || !Number.isFinite(contract.radius) ||
    contract.radius < 0 || !Number.isFinite(contract.sweepRadians)) {
    return issues;
  }
  if (!finiteDiagramPoint(painted.start) || !finiteDiagramPoint(painted.end) ||
    !Number.isFinite(painted.pathLength) || painted.pathLength < 0 ||
    !Array.isArray(painted.samples) || painted.samples.length === 0 ||
    painted.samples.some((point) => !finiteDiagramPoint(point))) {
    issues.push("painted arc samples are malformed or non-finite");
    return issues;
  }

  const startError = Math.hypot(
    painted.start.x - contract.start.x,
    painted.start.y - contract.start.y
  );
  const endError = Math.hypot(
    painted.end.x - contract.end.x,
    painted.end.y - contract.end.y
  );
  if (startError > tolerance) issues.push(`painted path starts ${startError} away from the contract start`);
  if (endError > tolerance) issues.push(`painted path ends ${endError} away from the contract end`);

  const expectedLength = contract.radius * Math.abs(contract.sweepRadians);
  const lengthError = Math.abs(painted.pathLength - expectedLength);
  const lengthTolerance = Math.max(0.05, expectedLength * 0.0005);
  if (lengthError > lengthTolerance) {
    issues.push(`painted path length differs from the signed-sweep arc length by ${lengthError}`);
  }
  if (contract.radius <= 1e-12 && Math.abs(contract.sweepRadians) > 1e-12) {
    issues.push("non-zero angle sweep has zero painted radius");
    return issues;
  }

  let maximumRadiusError = 0;
  const mathematicalAngles: number[] = [];
  for (const point of painted.samples) {
    const relative = { x: point.x - contract.origin.x, y: point.y - contract.origin.y };
    maximumRadiusError = Math.max(maximumRadiusError, Math.abs(Math.hypot(relative.x, relative.y) - contract.radius));
    if (contract.radius > 1e-12) mathematicalAngles.push(Math.atan2(-relative.y, relative.x));
  }
  if (maximumRadiusError > tolerance) {
    issues.push(`painted path leaves its contract radius by ${maximumRadiusError}`);
  }

  if (mathematicalAngles.length > 1) {
    let paintedSweep = 0;
    for (let index = 1; index < mathematicalAngles.length; index += 1) {
      let step = mathematicalAngles[index] - mathematicalAngles[index - 1];
      while (step <= -Math.PI) step += Math.PI * 2;
      while (step > Math.PI) step -= Math.PI * 2;
      paintedSweep += step;
    }
    const sweepError = Math.abs(paintedSweep - contract.sweepRadians);
    const sweepTolerance = Math.max(0.002, tolerance / Math.max(1, contract.radius));
    if (sweepError > sweepTolerance) {
      issues.push(`painted path signed sweep differs from its contract by ${sweepError}`);
    }
  }

  return issues;
}

/**
 * SVG path for a signed mathematical sweep. Positive sweeps are
 * counterclockwise in mathematical coordinates, hence SVG sweep flag 0.
 * Full turns are split into two arcs so equal endpoints do not collapse.
 */
export function svgAngleArcPath(contract: MathAngleContract): string {
  if (contract.space !== "svg") throw new RangeError("svgAngleArcPath requires an SVG-space contract");
  if (contract.radius === 0 || Math.abs(contract.sweepRadians) <= 1e-12) {
    return `M ${contract.start.x} ${contract.start.y}`;
  }
  const direction = contract.sweepRadians >= 0 ? 0 : 1;
  const absoluteSweep = Math.abs(contract.sweepRadians);
  if (absoluteSweep >= Math.PI * 2 - 1e-9) {
    const start = normalizedDirection(contract.startRay, "startRay");
    const middle = {
      x: contract.origin.x - start.x * contract.radius,
      y: contract.origin.y - start.y * contract.radius
    };
    return `M ${contract.start.x} ${contract.start.y} A ${contract.radius} ${contract.radius} 0 1 ${direction} ${middle.x} ${middle.y} A ${contract.radius} ${contract.radius} 0 1 ${direction} ${contract.end.x} ${contract.end.y}`;
  }
  const largeArc = absoluteSweep > Math.PI ? 1 : 0;
  return `M ${contract.start.x} ${contract.start.y} A ${contract.radius} ${contract.radius} 0 ${largeArc} ${direction} ${contract.end.x} ${contract.end.y}`;
}

export function trianglePixelArea(a: DiagramPoint, b: DiagramPoint, c: DiagramPoint) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

export function isPointInsideDiagramBounds(point: DiagramPoint, bounds: DiagramBounds, inset = 0) {
  return point.x >= bounds.left + inset && point.x <= bounds.right - inset &&
    point.y >= bounds.top + inset && point.y <= bounds.bottom - inset;
}

export function isCircleInsideDiagramBounds(
  center: DiagramPoint,
  radius: number,
  bounds: DiagramBounds,
  inset = 0
) {
  if (!Number.isFinite(radius) || radius < 0) return false;
  return center.x - radius >= bounds.left + inset &&
    center.x + radius <= bounds.right - inset &&
    center.y - radius >= bounds.top + inset &&
    center.y + radius <= bounds.bottom - inset;
}

export function clampPointToDiagramBounds(point: DiagramPoint, bounds: DiagramBounds, inset = 0) {
  const left = bounds.left + inset;
  const right = bounds.right - inset;
  const top = bounds.top + inset;
  const bottom = bounds.bottom - inset;
  const visible = {
    x: Math.min(right, Math.max(left, point.x)),
    y: Math.min(bottom, Math.max(top, point.y))
  };

  return {
    clipped: visible.x !== point.x || visible.y !== point.y,
    point: visible
  };
}

/** Clips y = slope*x + intercept to the square [-range, range]^2. */
export function clipLinearFunctionToSquare(
  slope: number,
  intercept: number,
  range: number
): [DiagramPoint, DiagramPoint] | null {
  if (![slope, intercept, range].every(Number.isFinite) || range <= 0) {
    throw new RangeError("Linear-function clipping requires finite coefficients and a positive range");
  }
  if (Math.abs(slope) <= 1e-12) {
    return Math.abs(intercept) <= range
      ? [{ x: -range, y: intercept }, { x: range, y: intercept }]
      : null;
  }

  const boundaryXs = [(-range - intercept) / slope, (range - intercept) / slope]
    .sort((a, b) => a - b);
  const minimumX = Math.max(-range, boundaryXs[0]);
  const maximumX = Math.min(range, boundaryXs[1]);
  if (minimumX > maximumX + 1e-9) return null;
  return [
    { x: minimumX, y: slope * minimumX + intercept },
    { x: maximumX, y: slope * maximumX + intercept }
  ];
}

/**
 * Clips the square [-range, range]^2 to one side of y = slope*x + intercept.
 * The returned vertices remain in mathematical coordinates (positive y up).
 */
export function clipSquareByLinearHalfPlane({
  intercept,
  keepAbove,
  range,
  slope
}: {
  intercept: number;
  keepAbove: boolean;
  range: number;
  slope: number;
}): DiagramPoint[] {
  if (![slope, intercept, range].every(Number.isFinite) || range <= 0) {
    throw new RangeError("Half-plane clipping requires finite coefficients and a positive range");
  }

  const square: DiagramPoint[] = [
    { x: -range, y: -range },
    { x: range, y: -range },
    { x: range, y: range },
    { x: -range, y: range }
  ];
  const signedDistance = (point: DiagramPoint) => point.y - slope * point.x - intercept;
  const isInside = (distance: number) => keepAbove ? distance >= -1e-9 : distance <= 1e-9;
  const clipped: DiagramPoint[] = [];

  for (let index = 0; index < square.length; index += 1) {
    const previous = square[(index + square.length - 1) % square.length];
    const current = square[index];
    const previousDistance = signedDistance(previous);
    const currentDistance = signedDistance(current);
    const previousInside = isInside(previousDistance);
    const currentInside = isInside(currentDistance);

    if (previousInside !== currentInside) {
      const denominator = previousDistance - currentDistance;
      const t = Math.min(1, Math.max(0, previousDistance / denominator));
      clipped.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t
      });
    }
    if (currentInside) clipped.push(current);
  }

  return clipped.filter((point, index, all) => {
    const previous = all[(index + all.length - 1) % all.length];
    return !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1e-9;
  });
}

export function diagramOverflowIndicator(rawPoint: DiagramPoint, boundedPoint: DiagramPoint): {
  direction: DiagramOverflowDirection;
  symbol: "↑" | "↓" | "←" | "→";
} | null {
  const dx = rawPoint.x - boundedPoint.x;
  const dy = rawPoint.y - boundedPoint.y;
  if (Math.abs(dx) <= 1e-9 && Math.abs(dy) <= 1e-9) return null;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0
      ? { direction: "up", symbol: "↑" }
      : { direction: "down", symbol: "↓" };
  }

  return dx < 0
    ? { direction: "left", symbol: "←" }
    : { direction: "right", symbol: "→" };
}

export function groupCoincidentDiagramPoints<T extends { point: DiagramPoint }>(items: T[], threshold: number): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const group = groups.find((candidate) => candidate.some((member) =>
      Math.hypot(member.point.x - item.point.x, member.point.y - item.point.y) <= threshold
    ));
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups;
}
