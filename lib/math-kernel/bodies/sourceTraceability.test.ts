import assert from "node:assert/strict";
import { test } from "node:test";

import { BODIES_SOURCE_TRACEABILITY } from "./sourceTraceability";

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("bodies source traceability distinguishes the five source capabilities from MAIS extensions", () => {
  assert.equal(BODIES_SOURCE_TRACEABILITY.schemaVersion, 1);
  assert.equal(
    BODIES_SOURCE_TRACEABILITY.sourceRevision,
    "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  );
  assert.deepEqual(
    BODIES_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source),
    ["_edge", "quad_pyramid", "tri_pyramid", "cuboid", "prism"],
  );
  assert.deepEqual(
    BODIES_SOURCE_TRACEABILITY.maisExtensions.map((entry) => entry.typescript),
    ["bodies.cube", "bodies.validateBodyTopology"],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(BODIES_SOURCE_TRACEABILITY)),
    BODIES_SOURCE_TRACEABILITY,
  );
  assertDeepFrozen(BODIES_SOURCE_TRACEABILITY);
});
