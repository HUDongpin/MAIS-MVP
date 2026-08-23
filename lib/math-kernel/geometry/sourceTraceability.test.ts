import assert from "node:assert/strict";
import { test } from "node:test";

import { GEOMETRY_SOURCE_TRACEABILITY } from "./sourceTraceability";

const EXPECTED_SOURCE_CAPABILITIES = [
  "V",
  "midpoint",
  "normal_from_points",
  "simplify_vec",
  "line_plane_angle_sin",
  "line_line_angle_cos",
  "point_plane_distance",
  "dihedral_cos",
  "dihedral_cos_from_normals",
  "volume_box",
  "volume_prism",
  "volume_pyramid",
  "volume_tetra",
  "tex",
  "is_clean",
  "tex_vec",
  "regular_quad_pyramid",
  "cuboid",
  "cube",
  "regular_tetrahedron",
  "to_three",
  "solve_pyramid",
  "solve_cube",
] as const;

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("geometry source traceability is a versioned complete 23-capability contract", () => {
  assert.equal(GEOMETRY_SOURCE_TRACEABILITY.schemaVersion, 1);
  assert.equal(
    GEOMETRY_SOURCE_TRACEABILITY.sourceRevision,
    "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  );
  assert.equal(GEOMETRY_SOURCE_TRACEABILITY.license, "Apache-2.0");
  assert.deepEqual(
    GEOMETRY_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source),
    EXPECTED_SOURCE_CAPABILITIES,
  );
  assert.equal(
    new Set(
      GEOMETRY_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source),
    ).size,
    23,
  );
  assert.equal(
    GEOMETRY_SOURCE_TRACEABILITY.capabilities.every(
      (entry) => entry.typescript.length > 0 && entry.disposition.length > 0,
    ),
    true,
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(GEOMETRY_SOURCE_TRACEABILITY)),
    GEOMETRY_SOURCE_TRACEABILITY,
  );
  assertDeepFrozen(GEOMETRY_SOURCE_TRACEABILITY);
});
