import type {
  ExactRational,
  ExactRealPoint,
  SignedRealNumberLineModel,
} from "./SignedRealNumberLineModel";

export const SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT = Object.freeze({
  family: "signed-real-number-line" as const,
  groupId: "G03" as const,
  version: "signed-real-number-line-geometry-v1" as const,
  defaultSvgXMin: 70,
  defaultSvgXMax: 890,
});

export type SignedRealNumberLineGeometryInputPoint = {
  semanticId: string;
  model: SignedRealNumberLineModel;
};

export type SignedRealNumberLineCoLocation = {
  exactKey: string;
  ownerId: string;
  memberIds: readonly string[];
  reason: "exact-equality" | "unique-exact-value";
  renderMarker: boolean;
};

export type SignedRealNumberLineGeometryPoint = {
  semanticId: string;
  modelStateKey: string;
  exactSymbolic: string;
  exactKey: string;
  exactValue: ExactRational | null;
  certifiedLower: ExactRational;
  certifiedUpper: ExactRational;
  numericLower: number;
  numericUpper: number;
  pixelLower: number;
  pixelUpper: number;
  renderedX: number;
  pixelErrorBound: number;
  coLocation: SignedRealNumberLineCoLocation;
};

export type SignedRealNumberLineCoLocationGroup = {
  exactKey: string;
  ownerId: string;
  memberIds: readonly string[];
  reason: "exact-equality";
};

export type SignedRealNumberLineGeometry = {
  version: typeof SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version;
  axisMin: number;
  axisMax: number;
  svgXMin: number;
  svgXMax: number;
  pixelsPerUnit: number;
  points: readonly SignedRealNumberLineGeometryPoint[];
  coLocationGroups: readonly SignedRealNumberLineCoLocationGroup[];
  coverage: {
    candidateCount: number;
    markerOwnerCount: number;
    coLocatedGroupCount: number;
    certifiedPointCount: number;
  };
  stateKey: string;
};

export type SignedRealNumberLineGeometryErrorCode =
  | "EMPTY_POINT_SET"
  | "INVALID_SVG_BOUNDS"
  | "INVALID_SEMANTIC_ID"
  | "DUPLICATE_SEMANTIC_ID"
  | "INVALID_MODEL_RECEIPT"
  | "RENDERED_POINT_OUTSIDE_CERTIFIED_INTERVAL";

export class SignedRealNumberLineGeometryError extends RangeError {
  readonly code: SignedRealNumberLineGeometryErrorCode;

  constructor(code: SignedRealNumberLineGeometryErrorCode, message: string) {
    super(message);
    this.name = "SignedRealNumberLineGeometryError";
    this.code = code;
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SignedRealNumberLineGeometryError(
      "INVALID_MODEL_RECEIPT",
      `${field} must be finite.`,
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function rationalValue(value: ExactRational): number {
  if (
    !Number.isSafeInteger(value.numerator) ||
    !Number.isSafeInteger(value.denominator) ||
    value.denominator <= 0
  ) {
    throw new SignedRealNumberLineGeometryError(
      "INVALID_MODEL_RECEIPT",
      "Certified rational bounds must use safe integers and positive denominators.",
    );
  }
  return finiteNumber(
    value.numerator / value.denominator,
    "certified rational value",
  );
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function normalizedRational(value: ExactRational): ExactRational {
  const divisor = gcd(value.numerator, value.denominator);
  const sign = value.denominator < 0 ? -1 : 1;
  return {
    numerator: Object.is((sign * value.numerator) / divisor, -0)
      ? 0
      : (sign * value.numerator) / divisor,
    denominator: Math.abs(value.denominator / divisor),
  };
}

function canonicalRadicalKey(point: Extract<ExactRealPoint, { kind: "radical" }>): string {
  const coefficient = normalizedRational(
    point.coefficient ?? { numerator: 1, denominator: 1 },
  );
  let outside = 1;
  let remaining = point.radicand;
  for (let factor = 2; factor ** point.index <= remaining; factor += 1) {
    const power = factor ** point.index;
    while (remaining % power === 0) {
      outside *= factor;
      remaining /= power;
    }
  }
  const scaled = normalizedRational({
    numerator: coefficient.numerator * outside,
    denominator: coefficient.denominator,
  });
  return `d:${point.sign}:${point.index}:${remaining}:${scaled.numerator}/${scaled.denominator}`;
}

function exactKey(point: ExactRealPoint): string {
  if (point.kind === "rational") {
    const exact = normalizedRational(point);
    return `r:${exact.numerator}/${exact.denominator}`;
  }
  return canonicalRadicalKey(point);
}

function exactRational(point: ExactRealPoint): ExactRational | null {
  return point.kind === "rational" ? normalizedRational(point) : null;
}

function assertSemanticId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    value.length > 128
  ) {
    throw new SignedRealNumberLineGeometryError(
      "INVALID_SEMANTIC_ID",
      "semanticId must be nonempty, trimmed, and at most 128 characters.",
    );
  }
  return value;
}

function mapToPixel(
  value: number,
  axisMin: number,
  pixelsPerUnit: number,
  svgXMin: number,
): number {
  return finiteNumber(
    svgXMin + (value - axisMin) * pixelsPerUnit,
    "pixel coordinate",
  );
}

export function buildSignedRealNumberLineGeometry(input: {
  points: readonly SignedRealNumberLineGeometryInputPoint[];
  svgXMin?: number;
  svgXMax?: number;
}): SignedRealNumberLineGeometry {
  if (!Array.isArray(input.points) || input.points.length === 0) {
    throw new SignedRealNumberLineGeometryError(
      "EMPTY_POINT_SET",
      "At least one exact point is required.",
    );
  }
  const svgXMin = finiteNumber(
    input.svgXMin ?? SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.defaultSvgXMin,
    "svgXMin",
  );
  const svgXMax = finiteNumber(
    input.svgXMax ?? SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.defaultSvgXMax,
    "svgXMax",
  );
  if (svgXMax <= svgXMin) {
    throw new SignedRealNumberLineGeometryError(
      "INVALID_SVG_BOUNDS",
      "svgXMax must be greater than svgXMin.",
    );
  }

  const semanticIds = new Set<string>();
  const candidates = input.points.map(({ semanticId: rawId, model }) => {
    const semanticId = assertSemanticId(rawId);
    if (semanticIds.has(semanticId)) {
      throw new SignedRealNumberLineGeometryError(
        "DUPLICATE_SEMANTIC_ID",
        `Duplicate semanticId: ${semanticId}.`,
      );
    }
    semanticIds.add(semanticId);
    const exactValue = exactRational(model.point);
    const certifiedLower = exactValue ?? normalizedRational(model.approximation.interval.lower);
    const certifiedUpper = exactValue ?? normalizedRational(model.approximation.interval.upper);
    const numericLower = rationalValue(certifiedLower);
    const numericUpper = rationalValue(certifiedUpper);
    if (numericLower > numericUpper) {
      throw new SignedRealNumberLineGeometryError(
        "INVALID_MODEL_RECEIPT",
        `${semanticId} has inverted certified bounds.`,
      );
    }
    const renderedValue = exactValue
      ? rationalValue(exactValue)
      : finiteNumber(model.approximation.value, `${semanticId}.approximation.value`);
    if (renderedValue < numericLower || renderedValue > numericUpper) {
      throw new SignedRealNumberLineGeometryError(
        "RENDERED_POINT_OUTSIDE_CERTIFIED_INTERVAL",
        `${semanticId} rendered value is outside its certified interval.`,
      );
    }
    return {
      semanticId,
      model,
      exactValue,
      certifiedLower,
      certifiedUpper,
      numericLower,
      numericUpper,
      renderedValue,
      exactKey: exactKey(model.point),
    };
  });

  const maximumMagnitude = Math.max(
    0,
    ...candidates.flatMap(({ numericLower, numericUpper }) => [
      Math.abs(numericLower),
      Math.abs(numericUpper),
    ]),
  );
  const halfRange = Math.max(2, Math.ceil(maximumMagnitude * 1.25));
  const axisMin = -halfRange;
  const axisMax = halfRange;
  const pixelsPerUnit = finiteNumber(
    (svgXMax - svgXMin) / (axisMax - axisMin),
    "pixelsPerUnit",
  );

  const exactGroups = new Map<string, string[]>();
  for (const candidate of candidates) {
    const members = exactGroups.get(candidate.exactKey) ?? [];
    members.push(candidate.semanticId);
    exactGroups.set(candidate.exactKey, members);
  }
  for (const members of exactGroups.values()) members.sort();

  const points = candidates.map((candidate) => {
    const memberIds = exactGroups.get(candidate.exactKey);
    if (!memberIds) {
      throw new SignedRealNumberLineGeometryError(
        "INVALID_MODEL_RECEIPT",
        `Missing exact group for ${candidate.semanticId}.`,
      );
    }
    const ownerId = memberIds[0];
    const pixelLower = mapToPixel(
      candidate.numericLower,
      axisMin,
      pixelsPerUnit,
      svgXMin,
    );
    const pixelUpper = mapToPixel(
      candidate.numericUpper,
      axisMin,
      pixelsPerUnit,
      svgXMin,
    );
    const renderedX = mapToPixel(
      candidate.renderedValue,
      axisMin,
      pixelsPerUnit,
      svgXMin,
    );
    const pixelErrorBound = candidate.exactValue
      ? 0
      : finiteNumber(
          Math.max(
            rationalValue(candidate.model.approximation.errorBound) *
              pixelsPerUnit,
            Math.abs(renderedX - pixelLower),
            Math.abs(pixelUpper - renderedX),
          ),
          `${candidate.semanticId}.pixelErrorBound`,
        );
    return {
      semanticId: candidate.semanticId,
      modelStateKey: candidate.model.stateKey,
      exactSymbolic: candidate.model.point.symbolic,
      exactKey: candidate.exactKey,
      exactValue: candidate.exactValue,
      certifiedLower: candidate.certifiedLower,
      certifiedUpper: candidate.certifiedUpper,
      numericLower: candidate.numericLower,
      numericUpper: candidate.numericUpper,
      pixelLower,
      pixelUpper,
      renderedX,
      pixelErrorBound,
      coLocation: {
        exactKey: candidate.exactKey,
        ownerId,
        memberIds,
        reason:
          memberIds.length > 1 ? "exact-equality" : "unique-exact-value",
        renderMarker: candidate.semanticId === ownerId,
      },
    } satisfies SignedRealNumberLineGeometryPoint;
  });

  const coLocationGroups = [...exactGroups.entries()]
    .filter(([, memberIds]) => memberIds.length > 1)
    .map(([groupExactKey, memberIds]) => ({
      exactKey: groupExactKey,
      ownerId: memberIds[0],
      memberIds,
      reason: "exact-equality" as const,
    }))
    .sort((left, right) => left.exactKey.localeCompare(right.exactKey));
  const markerOwnerCount = points.filter(
    ({ coLocation }) => coLocation.renderMarker,
  ).length;
  const stateKey = [
    SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version,
    `axis=${axisMin}:${axisMax}`,
    `svg=${svgXMin}:${svgXMax}`,
    ...points.map(
      (point) =>
        `${point.semanticId}:${point.exactKey}:${point.renderedX}:${point.coLocation.ownerId}`,
    ),
  ].join("|");

  return deepFreeze({
    version: SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT.version,
    axisMin,
    axisMax,
    svgXMin,
    svgXMax,
    pixelsPerUnit,
    points,
    coLocationGroups,
    coverage: {
      candidateCount: points.length,
      markerOwnerCount,
      coLocatedGroupCount: coLocationGroups.length,
      certifiedPointCount: points.length,
    },
    stateKey,
  });
}
