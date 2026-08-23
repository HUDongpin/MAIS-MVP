import assert from "node:assert/strict";
import { test } from "node:test";

import type { MathJsonExpr } from "../shared/types";
import type { ConicModel, Point2D, Quadratic2D } from "./model";

type NumericPoint = Point2D<number>;
type NumericQuadratic = Quadratic2D<number>;
type ExactModel = ConicModel<MathJsonExpr>;

// @ts-expect-error bigint is not JSON-safe.
type RejectBigInt = Point2D<bigint>;
// @ts-expect-error functions are not JSON-safe scalars.
type RejectFunction = Quadratic2D<() => void>;

class VendorScalar {
  readonly value = 1;
  evaluate(): number {
    return this.value;
  }
}

// @ts-expect-error vendor instances must not cross the MAIS public DTO boundary.
type RejectVendorObject = ConicModel<VendorScalar>;

test("conic scalar type contracts accept number and MathJSON", () => {
  const numeric: NumericPoint = [1, 2];
  const quadratic: NumericQuadratic = {
    x2: 1,
    xy: 0,
    y2: 1,
    x: 0,
    y: 0,
    constant: -1,
  };
  const exactKind: ExactModel["kind"] = "circle";

  assert.deepEqual(numeric, [1, 2]);
  assert.equal(quadratic.constant, -1);
  assert.equal(exactKind, "circle");
});
