import type { ExactValueDto, ExactVec3Dto } from "../shared/types";

export type CubeMidpointPerpendicularPointId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "A1"
  | "B1"
  | "C1"
  | "D1"
  | "E"
  | "F"
  | "G"
  | "H"
  | "N";

export type CubeMidpointPerpendicularVectorId =
  | "EF"
  | "EG"
  | "normal"
  | "DB1";

export type CubeMidpointPerpendicularFormulaTokenId =
  | "point-E"
  | "point-F"
  | "point-G"
  | "vector-EF"
  | "vector-EG"
  | "normal-n"
  | "vector-DB1"
  | "conclusion";

export type CubeMidpointPerpendicularProofStepId =
  | "locate-midpoints"
  | "build-plane-vectors"
  | "compute-plane-normal"
  | "compare-target-direction"
  | "conclude-perpendicular";

export type ExactPoint3Dto = readonly [
  ExactValueDto,
  ExactValueDto,
  ExactValueDto,
];

export interface CubeMidpointPerpendicularFormulaTokenDto {
  readonly id: CubeMidpointPerpendicularFormulaTokenId;
  readonly conceptId: string;
  /** Exact display fragment assembled from the same DTO values as the scene. */
  readonly text: string;
}

export interface CubeMidpointPerpendicularFormulaDto {
  readonly id: "cube-midpoint-perpendicular-proof";
  /** Authoritative KaTeX formula assembled from `tokens`, not recomputed by UI code. */
  readonly latex: string;
  readonly tokens: readonly CubeMidpointPerpendicularFormulaTokenDto[];
}

/** Language-neutral sequencing; locale-owned teaching copy stays outside the kernel DTO. */
export interface CubeMidpointPerpendicularProofStepDto {
  readonly id: CubeMidpointPerpendicularProofStepId;
  readonly formulaTokenIds: readonly CubeMidpointPerpendicularFormulaTokenId[];
}

export interface CubeMidpointPerpendicularProofDto {
  readonly schemaVersion: 1;
  readonly edge: ExactValueDto;
  readonly points: Readonly<
    Record<CubeMidpointPerpendicularPointId, ExactPoint3Dto>
  >;
  /** World y-up coordinates, transformed exactly once by the server builder. */
  readonly renderPoints: Readonly<
    Record<
      CubeMidpointPerpendicularPointId,
      readonly [number, number, number]
    >
  >;
  readonly vectors: Readonly<
    Record<CubeMidpointPerpendicularVectorId, ExactVec3Dto>
  >;
  readonly checks: {
    readonly db1DotEf: ExactValueDto;
    readonly db1DotEg: ExactValueDto;
    readonly db1NormalScale: ExactValueDto;
    readonly linePlaneAngleSin: ExactValueDto;
  };
  readonly formula: CubeMidpointPerpendicularFormulaDto;
  readonly proofSteps: readonly CubeMidpointPerpendicularProofStepDto[];
  readonly provenance: {
    readonly kernel: "geometry";
    readonly operation: "cubeMidpointPlanePerpendicularProof";
    readonly sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc";
  };
}
