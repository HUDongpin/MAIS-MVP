import assert from "node:assert/strict";
import { test } from "node:test";

import { CONICS_SOURCE_TRACEABILITY } from "./sourceTraceability";

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("conics source traceability records every source function and required semantic correction", () => {
  assert.equal(CONICS_SOURCE_TRACEABILITY.schemaVersion, 1);
  assert.equal(
    CONICS_SOURCE_TRACEABILITY.sourceRevision,
    "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  );
  assert.deepEqual(
    CONICS_SOURCE_TRACEABILITY.capabilities.map((entry) => entry.source),
    ["_f", "_sq_latex", "_term", "ellipse", "hyperbola", "parabola", "circle"],
  );
  assert.equal(CONICS_SOURCE_TRACEABILITY.semanticCorrections.length, 4);
  assert.match(CONICS_SOURCE_TRACEABILITY.semanticCorrections.join(" "), /hyperbola/i);
  assert.match(CONICS_SOURCE_TRACEABILITY.semanticCorrections.join(" "), /majorAxis/);
  assert.match(CONICS_SOURCE_TRACEABILITY.semanticCorrections.join(" "), /sign/i);
  assert.deepEqual(
    JSON.parse(JSON.stringify(CONICS_SOURCE_TRACEABILITY)),
    CONICS_SOURCE_TRACEABILITY,
  );
  assertDeepFrozen(CONICS_SOURCE_TRACEABILITY);
});
