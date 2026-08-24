import type { AnalyticRangeSolutionDto, ExactSecantIntersectionDto } from "../analytic/types";
import type { BodyTopology } from "../bodies";
import type { ConicRenderSpec, Quadratic2D } from "../conics/model";
import type { GeometrySolutionDto } from "../geometry/solutionTypes";

/** JSON-only payload crossing the Server Component to Client Component boundary. */
export interface MathKernelDemoPayload {
  readonly schemaVersion: 1;
  readonly geometry: {
    readonly solution: GeometrySolutionDto;
    readonly topology: BodyTopology;
    readonly renderEdgeLength: number;
  };
  readonly analytic: {
    readonly solution: AnalyticRangeSolutionDto;
    readonly conic: ConicRenderSpec;
    readonly quadratic: Quadratic2D<number>;
    readonly initialSlopeQuarter: number;
    readonly exactIntersection: ExactSecantIntersectionDto;
  };
}
