import assert from "node:assert/strict";
import { test } from "node:test";

import { ANALYTIC_SOURCE_TRACEABILITY } from "./sourceTraceability";

const expected = [
  "tex",
  "fnum",
  "is_clean",
  "interval_latex",
  "chord_setup",
  "_xy_from_y",
  "dot_product_expr",
  "chord_len_sq_expr",
  "triangle_area_expr",
  "range_over_m",
  "is_constant_in_m",
  "slope_product_central",
  "ecc_range_focal_ratio",
] as const;

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("analytic source traceability is versioned, complete, JSON-safe, and immutable", () => {
  assert.equal(ANALYTIC_SOURCE_TRACEABILITY.schemaVersion, 1);
  assert.equal(ANALYTIC_SOURCE_TRACEABILITY.sourceRevision, "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc");
  assert.equal(ANALYTIC_SOURCE_TRACEABILITY.license, "Apache-2.0");
  assert.deepEqual(ANALYTIC_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source), expected);
  assert.equal(new Set(ANALYTIC_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source)).size, expected.length);
  assert.deepEqual(JSON.parse(JSON.stringify(ANALYTIC_SOURCE_TRACEABILITY)), ANALYTIC_SOURCE_TRACEABILITY);
  assertDeepFrozen(ANALYTIC_SOURCE_TRACEABILITY);
});
