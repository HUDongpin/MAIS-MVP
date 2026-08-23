/**
 * Versioned capability map for the modified TypeScript rewrite of Edulab
 * bodies.py at cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for attribution and the modification notice.
 */

export interface BodySourceCapabilityTrace {
  readonly source: string;
  readonly typescript: readonly string[];
  readonly disposition: string;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const BODIES_SOURCE_TRACEABILITY = deepFreeze({
  schemaVersion: 1,
  sourceModule: "skills/edu-solid-geometry/lib/bodies.py",
  sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  license: "Apache-2.0",
  capabilities: [
    {
      source: "_edge",
      typescript: ["bodies.edge"],
      disposition: "kept as a private immutable edge constructor",
    },
    {
      source: "quad_pyramid",
      typescript: ["bodies.quadPyramid"],
      disposition: "ported with stable source order and strict four-base-vertex validation",
    },
    {
      source: "tri_pyramid",
      typescript: ["bodies.triPyramid"],
      disposition: "ported with stable source order and strict three-base-vertex validation",
    },
    {
      source: "cuboid",
      typescript: ["bodies.cuboid"],
      disposition: "ported with stable source order and strict paired four-vertex bases",
    },
    {
      source: "prism",
      typescript: ["bodies.prism"],
      disposition: "ported for matching bases of at least three vertices",
    },
  ] satisfies readonly BodySourceCapabilityTrace[],
  maisExtensions: [
    {
      typescript: "bodies.cube",
      disposition: "MAIS-only semantic alias that delegates to cuboid without duplicating topology",
    },
    {
      typescript: "bodies.validateBodyTopology",
      disposition: "MAIS-only fail-closed validation for identifiers, endpoints, self-loops, and duplicate edges",
    },
  ],
});
