/**
 * JSON-safe public contracts for the Edulab analytic_kernel.py rewrite.
 * No CAS or renderer types cross this boundary.
 */

import type { Quadratic2D } from "../conics/model";
import type {
  ExactIntervalDto,
  ExactValueDto,
  MathJsonExpr,
  RangeWitnessDto,
  SolutionStepDto,
} from "../shared/types";

/** xFromY means x=m*y+c (m is cotangent/inverse slope). */
export type LineFamilyOrientation = "xFromY" | "yFromX";

export interface LineFamily<S> {
  readonly orientation: LineFamilyOrientation;
  readonly through: readonly [S, S];
  /** The v1 exact line-family contract intentionally exposes one symbol only. */
  readonly parameter?: "m";
}

export type IntersectionKind =
  | "secant"
  | "tangent"
  | "linear-degenerate"
  | "disjoint"
  | "invalid";

export interface NumericLineFamily {
  readonly orientation: LineFamilyOrientation;
  readonly through: readonly [number, number];
  readonly parameter: number;
}

interface NumericIntersectionBase {
  readonly schemaVersion: 1;
  readonly kind: IntersectionKind;
  readonly coefficients: {
    readonly A: number;
    readonly B: number;
    readonly C: number;
    readonly discriminant: number | null;
  };
}

export interface NumericSecantIntersection extends NumericIntersectionBase {
  readonly kind: "secant";
  readonly points: readonly [readonly [number, number], readonly [number, number]];
  readonly chordLengthSquared: number;
}

export interface NumericTangentIntersection extends NumericIntersectionBase {
  readonly kind: "tangent";
  readonly point: readonly [number, number];
}

export interface NumericLinearIntersection extends NumericIntersectionBase {
  readonly kind: "linear-degenerate";
  readonly point: readonly [number, number];
}

export interface NumericDisjointIntersection extends NumericIntersectionBase {
  readonly kind: "disjoint";
}

export interface NumericInvalidIntersection extends NumericIntersectionBase {
  readonly kind: "invalid";
  readonly reason: "coincident" | "constant-nonzero";
}

export type NumericIntersectionResult =
  | NumericSecantIntersection
  | NumericTangentIntersection
  | NumericLinearIntersection
  | NumericDisjointIntersection
  | NumericInvalidIntersection;

export interface LineConicExpressionSetup {
  readonly orientation: LineFamilyOrientation;
  readonly parameter: string;
  readonly intercept: MathJsonExpr;
  readonly A: MathJsonExpr;
  readonly B: MathJsonExpr;
  readonly C: MathJsonExpr;
  readonly discriminant: MathJsonExpr;
  /** Sum of the two y-coordinates for xFromY, or x-coordinates for yFromX. */
  readonly firstSum: MathJsonExpr;
  /** Product of the two y-coordinates for xFromY, or x-coordinates for yFromX. */
  readonly firstProduct: MathJsonExpr;
}

export interface EndpointSymmetricExpressions {
  readonly xSum: MathJsonExpr;
  readonly xProduct: MathJsonExpr;
  readonly ySum: MathJsonExpr;
  readonly yProduct: MathJsonExpr;
}

export interface ExactLineConicSetupDto {
  readonly schemaVersion: 1;
  readonly orientation: LineFamilyOrientation;
  readonly parameter: "m";
  readonly parameterMeaning: "inverse-slope" | "slope";
  readonly intercept: ExactValueDto;
  readonly A: ExactValueDto;
  readonly B: ExactValueDto;
  readonly C: ExactValueDto;
  readonly discriminant: ExactValueDto;
  readonly firstSum: ExactValueDto;
  readonly firstProduct: ExactValueDto;
}

interface ExactIntersectionBaseDto {
  readonly schemaVersion: 1;
  readonly kind: IntersectionKind;
  readonly coefficients: {
    readonly A: ExactValueDto;
    readonly B: ExactValueDto;
    readonly C: ExactValueDto;
    readonly discriminant: ExactValueDto | null;
  };
}

export interface ExactSecantIntersectionDto extends ExactIntersectionBaseDto {
  readonly kind: "secant";
  readonly points: readonly [
    readonly [ExactValueDto, ExactValueDto],
    readonly [ExactValueDto, ExactValueDto],
  ];
  readonly chordLengthSquared: ExactValueDto;
}

export interface ExactTangentIntersectionDto extends ExactIntersectionBaseDto {
  readonly kind: "tangent";
  readonly point: readonly [ExactValueDto, ExactValueDto];
}

export interface ExactLinearIntersectionDto extends ExactIntersectionBaseDto {
  readonly kind: "linear-degenerate";
  readonly point: readonly [ExactValueDto, ExactValueDto];
}

export interface ExactDisjointIntersectionDto extends ExactIntersectionBaseDto {
  readonly kind: "disjoint";
}

export interface ExactInvalidIntersectionDto extends ExactIntersectionBaseDto {
  readonly kind: "invalid";
  readonly reason: "coincident" | "constant-nonzero";
}

export type ExactIntersectionResultDto =
  | ExactSecantIntersectionDto
  | ExactTangentIntersectionDto
  | ExactLinearIntersectionDto
  | ExactDisjointIntersectionDto
  | ExactInvalidIntersectionDto;

export type AnalyticRangeMetric<S = MathJsonExpr> =
  | { readonly kind: "dot-product"; readonly vertex: readonly [S, S] }
  | { readonly kind: "chord-length" }
  | { readonly kind: "chord-length-squared" }
  | {
      readonly kind: "triangle-area";
      readonly vertex: readonly [S, S];
      readonly excludeDegenerate?: boolean;
    };

export interface RangeOverLineFamilyRequest {
  readonly conic: Quadratic2D<MathJsonExpr>;
  readonly line: {
    readonly orientation: LineFamilyOrientation;
    readonly through: readonly [MathJsonExpr, MathJsonExpr];
  };
  readonly metric: AnalyticRangeMetric<MathJsonExpr>;
}

export interface AnalyticRangeDomainDto {
  readonly parameter: "m";
  readonly parameterMeaning: "inverse-slope" | "slope";
  readonly discriminantConstraint: string;
  readonly denominatorExclusions: readonly ExactValueDto[];
  readonly projectiveEndpoint: {
    readonly line: "horizontal" | "vertical";
    readonly included: boolean;
    readonly hasRealGeometryWitness: boolean;
    readonly note: string;
  };
}

export interface AnalyticRangeProofDto {
  readonly profile: "centered-axis-aligned-even-rational-v1";
  readonly checkedCriticalPoints: boolean;
  readonly checkedDomainBoundaries: boolean;
  readonly checkedPoles: boolean;
  readonly checkedPositiveInfinity: true;
  readonly checkedNegativeInfinity: true;
  readonly exactNotSampled: true;
}

export interface AnalyticRangeSolutionDto {
  readonly schemaVersion: 1;
  readonly metric: AnalyticRangeMetric<MathJsonExpr>["kind"];
  readonly expression: ExactValueDto;
  readonly interval: ExactIntervalDto;
  readonly intervalLatex: string;
  readonly domain: AnalyticRangeDomainDto;
  readonly proof: AnalyticRangeProofDto;
  readonly intermediates: readonly SolutionStepDto[];
  readonly provenance: {
    readonly kernel: "analytic";
    readonly operation: "rangeOverLineFamily";
    readonly sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc";
  };
}

export interface ConstantInParameterDto {
  readonly schemaVersion: 1;
  readonly parameter: string;
  readonly constant: boolean;
  readonly value: ExactValueDto;
}

export interface EccentricityRangeSolutionDto {
  readonly schemaVersion: 1;
  readonly k: ExactValueDto;
  readonly interval: ExactIntervalDto;
  readonly intervalLatex: string;
  readonly derivation: readonly SolutionStepDto[];
  readonly provenance: {
    readonly kernel: "analytic";
    readonly operation: "eccentricityRangeFromFocalRatio";
    readonly sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc";
  };
}

export interface AnalyticSolutionDto {
  readonly schemaVersion: 1;
  readonly answer: ExactValueDto | ExactIntervalDto;
  readonly intermediates: readonly SolutionStepDto[];
  readonly witnesses: readonly RangeWitnessDto[];
  readonly provenance: {
    readonly kernel: "analytic";
    readonly operation: string;
    readonly sourceRevision: string;
  };
}
