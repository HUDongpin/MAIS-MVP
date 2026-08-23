/**
 * Serializable conic domain model, rewritten from Edulab conics.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import type { JsonValue } from "../shared/types";

export type ConicAxis = "x" | "y";
export type Point2D<S extends JsonValue> = readonly [S, S];

export interface Quadratic2D<S extends JsonValue> {
  readonly x2: S;
  readonly xy: S;
  readonly y2: S;
  readonly x: S;
  readonly y: S;
  readonly constant: S;
}

export interface Directrix<S extends JsonValue> {
  readonly axis: ConicAxis;
  readonly value: S;
}

export interface EllipseModel<S extends JsonValue> {
  readonly kind: "ellipse";
  /** x-direction and y-direction semiaxes, respectively. */
  readonly a: S;
  readonly b: S;
  readonly center: Point2D<S>;
  readonly majorAxis: ConicAxis;
  readonly c: S;
  readonly eccentricity: S;
  readonly foci: readonly [Point2D<S>, Point2D<S>];
  readonly directrices: readonly [Directrix<S>, Directrix<S>];
  readonly vertices: readonly [
    Point2D<S>,
    Point2D<S>,
    Point2D<S>,
    Point2D<S>,
  ];
  readonly quadratic: Quadratic2D<S>;
}

export interface HyperbolaModel<S extends JsonValue> {
  readonly kind: "hyperbola";
  /** Transverse and conjugate semiaxes, respectively. */
  readonly a: S;
  readonly b: S;
  readonly center: Point2D<S>;
  readonly orientation: ConicAxis;
  readonly c: S;
  readonly eccentricity: S;
  readonly foci: readonly [Point2D<S>, Point2D<S>];
  readonly directrices: readonly [Directrix<S>, Directrix<S>];
  readonly vertices: readonly [Point2D<S>, Point2D<S>];
  readonly asymptoteSlopes: readonly [S, S];
  readonly quadratic: Quadratic2D<S>;
}

export interface ParabolaModel<S extends JsonValue> {
  readonly kind: "parabola";
  readonly p: S;
  readonly vertex: Point2D<S>;
  readonly orientation: ConicAxis;
  readonly focus: Point2D<S>;
  readonly directrix: Directrix<S>;
  readonly quadratic: Quadratic2D<S>;
}

export interface CircleModel<S extends JsonValue> {
  readonly kind: "circle";
  readonly r: S;
  readonly center: Point2D<S>;
  readonly vertices: readonly [
    Point2D<S>,
    Point2D<S>,
    Point2D<S>,
    Point2D<S>,
  ];
  readonly quadratic: Quadratic2D<S>;
}

export type ConicModel<S extends JsonValue> =
  | EllipseModel<S>
  | HyperbolaModel<S>
  | ParabolaModel<S>
  | CircleModel<S>;

export interface ConicRenderBranch {
  readonly id: "curve" | "negative" | "positive";
  readonly closed: boolean;
  readonly points: readonly Point2D<number>[];
}

export interface ConicRenderSpec {
  readonly kind: ConicModel<number>["kind"];
  readonly sampleCount: number;
  readonly parameterRange: readonly [number, number];
  readonly branches: readonly ConicRenderBranch[];
}

export function toQuadratic2D<S extends JsonValue>(
  model: ConicModel<S>,
): Quadratic2D<S> {
  return model.quadratic;
}
