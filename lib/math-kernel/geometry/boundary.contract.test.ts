import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";

const implementationFiles = [
  "core.ts",
  "numeric.ts",
  "exact.server.ts",
  "solids.ts",
  "coordinates.ts",
  "solvers.server.ts",
] as const;

function source(file: string): string {
  return readFileSync(resolve(process.cwd(), "lib/math-kernel/geometry", file), "utf8");
}

test("client-safe geometry modules are renderer, React, DOM, Three, CAS, and server independent", () => {
  for (const file of ["core.ts", "numeric.ts", "solids.ts", "coordinates.ts"] as const) {
    const text = source(file);
    assert.doesNotMatch(text, /(?:from|import\s*)\s*["'][^"']*\.server["']/);
    assert.doesNotMatch(
      text,
      /@cortex-js|compute-engine|(?:from|import\s*)\s*["'](?:react(?:-dom)?|@react-three\/[^"']+|three(?:\/[^"']*)?)["']|\bdocument\b|\bwindow\b/,
    );
  }
});

test("exact and solver modules begin with the server-only guard", () => {
  assert.equal(source("exact.server.ts").split(/\r?\n/, 1)[0], 'import "server-only";');
  assert.equal(source("solvers.server.ts").split(/\r?\n/, 1)[0], 'import "server-only";');
  assert.doesNotMatch(source("exact.server.ts"), /@cortex-js/);
  assert.doesNotMatch(source("solvers.server.ts"), /@cortex-js/);
});

test("ported geometry files identify the fixed Apache-2.0 source revision", () => {
  for (const file of implementationFiles) {
    const text = source(file);
    assert.match(text, /Apache-2\.0/);
    assert.match(text, /cf0bc1d68b4ea64307f57d7fac64667e6a3148cc/);
  }
});

test("geometry degeneracies expose stable public error codes", () => {
  assert.deepEqual(
    {
      zeroDirection: KERNEL_ERROR_CODES.zeroDirection,
      collinearPlanePoints: KERNEL_ERROR_CODES.collinearPlanePoints,
      degeneratePlane: KERNEL_ERROR_CODES.degeneratePlane,
      degenerateEdge: KERNEL_ERROR_CODES.degenerateEdge,
      degenerateHalfPlane: KERNEL_ERROR_CODES.degenerateHalfPlane,
      nonRealExpression: KERNEL_ERROR_CODES.nonRealExpression,
      invalidScale: KERNEL_ERROR_CODES.invalidScale,
    },
    {
      zeroDirection: "ZERO_DIRECTION",
      collinearPlanePoints: "COLLINEAR_PLANE_POINTS",
      degeneratePlane: "DEGENERATE_PLANE",
      degenerateEdge: "DEGENERATE_EDGE",
      degenerateHalfPlane: "DEGENERATE_HALF_PLANE",
      nonRealExpression: "NON_REAL_EXPRESSION",
      invalidScale: "INVALID_SCALE",
    },
  );
});
