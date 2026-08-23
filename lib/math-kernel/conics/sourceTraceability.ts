/**
 * Versioned capability and semantic-change map for the modified TypeScript
 * rewrite of Edulab conics.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 */

export interface ConicSourceCapabilityTrace {
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

export const CONICS_SOURCE_TRACEABILITY = deepFreeze({
  schemaVersion: 1,
  sourceModule: "skills/edu-analytic-geometry/lib/conics.py",
  sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  license: "Apache-2.0",
  capabilities: [
    {
      source: "_f",
      typescript: ["conics.exact.server.exactConicToNumeric"],
      disposition: "replaced by validated finite conversion of the complete exact model",
    },
    {
      source: "_sq_latex",
      typescript: ["conics.exact.server.toEquationExact", "shared.ExactValueDto.latex"],
      disposition: "replaced by LaTeX serialization from authoritative expanded MathJSON",
    },
    {
      source: "_term",
      typescript: ["conics.exact.server.toEquationExact"],
      disposition: "replaced by one structured equation serializer rather than hand-built term strings",
    },
    {
      source: "ellipse",
      typescript: ["conics.numeric.ellipseNumeric", "conics.exact.server.ellipseExact"],
      disposition: "ported with explicit major-axis proof or override and strict positive semiaxes",
    },
    {
      source: "hyperbola",
      typescript: ["conics.numeric.hyperbolaNumeric", "conics.exact.server.hyperbolaExact"],
      disposition: "ported with strict x/y orientation and translated equations that include the center",
    },
    {
      source: "parabola",
      typescript: ["conics.numeric.parabolaNumeric", "conics.exact.server.parabolaExact"],
      disposition: "ported with one vertex name, strict orientation, nonzero p, and the source y²=2px convention",
    },
    {
      source: "circle",
      typescript: ["conics.numeric.circleNumeric", "conics.exact.server.circleExact"],
      disposition: "ported with strict positive radius and correct signs for translated centers",
    },
  ] satisfies readonly ConicSourceCapabilityTrace[],
  semanticCorrections: [
    "Translated equations are derived from expanded coefficients, eliminating x--1 and equivalent sign defects.",
    "Translated hyperbola LaTeX now represents both center coordinates instead of silently showing an origin equation.",
    "Symbolic ellipse axes are never guessed: exact order must be proved or the application supplies majorAxis.",
    "Renderer data, foci, directrices, vertices, eccentricity, and LaTeX all derive from one validated model.",
  ],
});
