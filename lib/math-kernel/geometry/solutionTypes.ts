/**
 * JSON-safe geometry-solution contracts shared by Next.js server code and
 * client-safe visualization adapters. This module intentionally imports no
 * CAS implementation, renderer, React, or server-only boundary.
 */

import type { ExactValueDto, SolutionStepDto } from "../shared/types";

export interface GeometrySolutionProvenanceDto {
  readonly kernel: "geometry";
  readonly operation: "regularQuadPyramidLinePlaneAngle" | "cubeLinePlaneAngle";
  readonly sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc";
}

export interface GeometrySolutionDto {
  readonly schemaVersion: 1;
  readonly answer: ExactValueDto;
  readonly points: Readonly<Record<string, readonly ExactValueDto[]>>;
  /**
   * World-space coordinates already transformed by the server solver.
   * Consumers must not apply mathZUpToWorldYUp() a second time.
   */
  readonly renderPoints: Readonly<Record<string, readonly [number, number, number]>>;
  readonly intermediates: readonly SolutionStepDto[];
  readonly provenance: GeometrySolutionProvenanceDto;
}
