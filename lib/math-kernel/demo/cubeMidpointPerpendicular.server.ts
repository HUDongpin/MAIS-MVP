import "server-only";

import { CasSession } from "../cas/computeEngine.server";
import {
  vecAdd,
  vecDot,
  vecScale,
  vecSub,
  type Vec3,
} from "../geometry/core";
import { mathZUpToWorldYUp } from "../geometry/coordinates";
import {
  exactGeometryScalarOps,
  formatExactVec3Latex,
  linePlaneAngleSin,
  midpoint,
  normalFromPoints,
  vec3,
} from "../geometry/exact.server";
import { cubeCoordinatesRaw } from "../geometry/solids";
import {
  KERNEL_ERROR_CODES,
  type MathKernelErrorCode,
} from "../shared/errors";
import type {
  ExactValueDto,
  ExactVec3Dto,
  KernelResult,
  MathJsonExpr,
} from "../shared/types";
import type {
  CubeMidpointPerpendicularFormulaDto,
  CubeMidpointPerpendicularFormulaTokenDto,
  CubeMidpointPerpendicularPointId,
  CubeMidpointPerpendicularProofDto,
  CubeMidpointPerpendicularProofStepDto,
  ExactPoint3Dto,
} from "./cubeMidpointPerpendicular.types";

const SOURCE_REVISION = "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc" as const;
const EDGE: MathJsonExpr = 2;
const EXACT_OPS = exactGeometryScalarOps;

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return {
    ok: false,
    error: details === undefined
      ? { code, message }
      : { code, message, details },
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function rawVector(vector: ExactVec3Dto): Vec3<MathJsonExpr> {
  return [
    vector.components[0].mathJson,
    vector.components[1].mathJson,
    vector.components[2].mathJson,
  ];
}

function exactPoint(
  point: Vec3<MathJsonExpr>,
  session: CasSession,
): KernelResult<ExactPoint3Dto> {
  const exact = vec3(point[0], point[1], point[2], session);
  return exact.ok ? { ok: true, value: exact.value.components } : exact;
}

function exactPointRecord(
  rawPoints: Readonly<Record<CubeMidpointPerpendicularPointId, Vec3<MathJsonExpr>>>,
  session: CasSession,
): KernelResult<
  Readonly<Record<CubeMidpointPerpendicularPointId, ExactPoint3Dto>>
> {
  const points = {} as Record<
    CubeMidpointPerpendicularPointId,
    ExactPoint3Dto
  >;
  for (const [id, point] of Object.entries(rawPoints) as readonly [
    CubeMidpointPerpendicularPointId,
    Vec3<MathJsonExpr>,
  ][]) {
    const exact = exactPoint(point, session);
    if (!exact.ok) return exact;
    points[id] = exact.value;
  }
  return { ok: true, value: points };
}

function renderPointRecord(
  points: Readonly<Record<CubeMidpointPerpendicularPointId, ExactPoint3Dto>>,
): KernelResult<
  Readonly<
    Record<
      CubeMidpointPerpendicularPointId,
      readonly [number, number, number]
    >
  >
> {
  const renderPoints = {} as Record<
    CubeMidpointPerpendicularPointId,
    readonly [number, number, number]
  >;
  for (const [id, point] of Object.entries(points) as readonly [
    CubeMidpointPerpendicularPointId,
    ExactPoint3Dto,
  ][]) {
    const numeric = point.map((component) => component.approx);
    if (
      numeric.some((component) =>
        typeof component !== "number" || !Number.isFinite(component)
      )
    ) {
      return fail(
        KERNEL_ERROR_CODES.exactToNumberFailed,
        `Point ${id} cannot be represented by finite renderer coordinates.`,
        { point: id },
      );
    }
    const transformed = mathZUpToWorldYUp([
      numeric[0] as number,
      numeric[1] as number,
      numeric[2] as number,
    ]);
    if (!transformed.ok) return transformed;
    renderPoints[id] = transformed.value;
  }
  return { ok: true, value: renderPoints };
}

function scalarDto(
  expression: MathJsonExpr,
  session: CasSession,
): KernelResult<ExactValueDto> {
  return session.toCanonicalExactValueDto(expression);
}

function proveEqual(
  left: MathJsonExpr,
  right: MathJsonExpr,
  label: string,
  session: CasSession,
): KernelResult<true> {
  const comparison = session.compareExactMathJson(left, right);
  if (!comparison.ok) return comparison;
  if (comparison.value === "equal") return { ok: true, value: true };
  return fail(
    KERNEL_ERROR_CODES.casOperationFailed,
    `${label} could not be proven exactly.`,
    { comparison: comparison.value },
  );
}

function tupleLatex(
  components: ExactPoint3Dto,
  session: CasSession,
): KernelResult<string> {
  return formatExactVec3Latex(
    { schemaVersion: 1, components },
    session,
  );
}

function buildFormula(
  points: Readonly<Record<CubeMidpointPerpendicularPointId, ExactPoint3Dto>>,
  vectors: CubeMidpointPerpendicularProofDto["vectors"],
  checks: CubeMidpointPerpendicularProofDto["checks"],
  session: CasSession,
): KernelResult<CubeMidpointPerpendicularFormulaDto> {
  const pointE = tupleLatex(points.E, session);
  if (!pointE.ok) return pointE;
  const pointF = tupleLatex(points.F, session);
  if (!pointF.ok) return pointF;
  const pointG = tupleLatex(points.G, session);
  if (!pointG.ok) return pointG;
  const vectorEf = tupleLatex(vectors.EF.components, session);
  if (!vectorEf.ok) return vectorEf;
  const vectorEg = tupleLatex(vectors.EG.components, session);
  if (!vectorEg.ok) return vectorEg;
  const normal = tupleLatex(vectors.normal.components, session);
  if (!normal.ok) return normal;
  const vectorDb1 = tupleLatex(vectors.DB1.components, session);
  if (!vectorDb1.ok) return vectorDb1;

  const tokens: readonly CubeMidpointPerpendicularFormulaTokenDto[] = [
    {
      id: "point-E",
      conceptId: "proof-midpoint-e",
      text: `E=${pointE.value}`,
    },
    {
      id: "point-F",
      conceptId: "proof-midpoint-f",
      text: `F=${pointF.value}`,
    },
    {
      id: "point-G",
      conceptId: "proof-midpoint-g",
      text: `G=${pointG.value}`,
    },
    {
      id: "vector-EF",
      conceptId: "proof-plane-vector-ef",
      text: `\\overrightarrow{EF}=${vectorEf.value}`,
    },
    {
      id: "vector-EG",
      conceptId: "proof-plane-vector-eg",
      text: `\\overrightarrow{EG}=${vectorEg.value}`,
    },
    {
      id: "normal-n",
      conceptId: "proof-plane-normal",
      text: `\\mathbf n=\\overrightarrow{EF}\\times\\overrightarrow{EG}=${normal.value}`,
    },
    {
      id: "vector-DB1",
      conceptId: "proof-target-line",
      text: `\\overrightarrow{DB_1}=${vectorDb1.value}=${checks.db1NormalScale.latex}\\mathbf n`,
    },
    {
      id: "conclusion",
      conceptId: "proof-conclusion",
      text: "DB_1\\perp\\operatorname{plane}(EFG)",
    },
  ];

  return {
    ok: true,
    value: {
      id: "cube-midpoint-perpendicular-proof",
      latex: [
        "\\begin{gathered}",
        `${tokens[0].text},\\quad ${tokens[1].text},\\quad ${tokens[2].text}\\\\`,
        `${tokens[3].text},\\quad ${tokens[4].text},\\quad ${tokens[5].text}\\\\`,
        `${tokens[6].text}\\quad\\Longrightarrow\\quad ${tokens[7].text}`,
        "\\end{gathered}",
      ].join(""),
      tokens,
    },
  };
}

/**
 * Build the fixed, exact proof that DB1 is perpendicular to plane EFG in the
 * edge-2 cube. Every renderer coordinate and formula fragment is derived from
 * the same request-scoped exact values.
 */
export function buildCubeMidpointPerpendicularProof(
  session = new CasSession(),
): KernelResult<CubeMidpointPerpendicularProofDto> {
  const cube = cubeCoordinatesRaw(EXACT_OPS, EDGE);
  const e = midpoint(cube.A, cube.B, session);
  if (!e.ok) return e;
  const f = midpoint(cube.B, cube.C, session);
  if (!f.ok) return f;
  const g = midpoint(cube.C, cube.C1, session);
  if (!g.ok) return g;

  const eRaw = rawVector(e.value);
  const fRaw = rawVector(f.value);
  const gRaw = rawVector(g.value);
  const efRaw = vecSub(EXACT_OPS, fRaw, eRaw);
  const egRaw = vecSub(EXACT_OPS, gRaw, eRaw);
  const normal = normalFromPoints(eRaw, fRaw, gRaw, session);
  if (!normal.ok) return normal;
  const normalRaw = rawVector(normal.value);
  const db1Raw = vecSub(EXACT_OPS, cube.B1, cube.D);
  const hRaw = vecAdd(EXACT_OPS, eRaw, vecSub(EXACT_OPS, gRaw, fRaw));
  const nRaw = vecAdd(EXACT_OPS, eRaw, normalRaw);

  const ef = vec3(efRaw[0], efRaw[1], efRaw[2], session);
  if (!ef.ok) return ef;
  const eg = vec3(egRaw[0], egRaw[1], egRaw[2], session);
  if (!eg.ok) return eg;
  const db1 = vec3(db1Raw[0], db1Raw[1], db1Raw[2], session);
  if (!db1.ok) return db1;

  const dotEfExpression = vecDot(EXACT_OPS, db1Raw, efRaw);
  const dotEgExpression = vecDot(EXACT_OPS, db1Raw, egRaw);
  const dotEfProof = proveEqual(
    dotEfExpression,
    0,
    "DB1 dot EF",
    session,
  );
  if (!dotEfProof.ok) return dotEfProof;
  const dotEgProof = proveEqual(
    dotEgExpression,
    0,
    "DB1 dot EG",
    session,
  );
  if (!dotEgProof.ok) return dotEgProof;

  const normalScaleExpression = EXACT_OPS.div(db1Raw[0], normalRaw[0]);
  const scaledNormal = vecScale(EXACT_OPS, normalScaleExpression, normalRaw);
  for (let index = 0; index < 3; index += 1) {
    const componentProof = proveEqual(
      scaledNormal[index],
      db1Raw[index],
      `DB1-normal parallel component ${index}`,
      session,
    );
    if (!componentProof.ok) return componentProof;
  }

  const angleSin = linePlaneAngleSin(db1Raw, normalRaw, session);
  if (!angleSin.ok) return angleSin;
  const angleProof = proveEqual(
    angleSin.value.mathJson,
    1,
    "DB1-plane EFG angle sine",
    session,
  );
  if (!angleProof.ok) return angleProof;

  const edge = scalarDto(EDGE, session);
  if (!edge.ok) return edge;
  const db1DotEf = scalarDto(dotEfExpression, session);
  if (!db1DotEf.ok) return db1DotEf;
  const db1DotEg = scalarDto(dotEgExpression, session);
  if (!db1DotEg.ok) return db1DotEg;
  const db1NormalScale = scalarDto(normalScaleExpression, session);
  if (!db1NormalScale.ok) return db1NormalScale;

  const rawPoints: Readonly<
    Record<CubeMidpointPerpendicularPointId, Vec3<MathJsonExpr>>
  > = {
    ...cube,
    E: eRaw,
    F: fRaw,
    G: gRaw,
    H: hRaw,
    N: nRaw,
  };
  const points = exactPointRecord(rawPoints, session);
  if (!points.ok) return points;
  const renderPoints = renderPointRecord(points.value);
  if (!renderPoints.ok) return renderPoints;

  const vectors: CubeMidpointPerpendicularProofDto["vectors"] = {
    EF: ef.value,
    EG: eg.value,
    normal: normal.value,
    DB1: db1.value,
  };
  const checks: CubeMidpointPerpendicularProofDto["checks"] = {
    db1DotEf: db1DotEf.value,
    db1DotEg: db1DotEg.value,
    db1NormalScale: db1NormalScale.value,
    linePlaneAngleSin: angleSin.value,
  };
  const formula = buildFormula(points.value, vectors, checks, session);
  if (!formula.ok) return formula;

  const proofSteps: readonly CubeMidpointPerpendicularProofStepDto[] = [
    {
      id: "locate-midpoints",
      formulaTokenIds: ["point-E", "point-F", "point-G"],
    },
    {
      id: "build-plane-vectors",
      formulaTokenIds: ["vector-EF", "vector-EG"],
    },
    {
      id: "compute-plane-normal",
      formulaTokenIds: ["normal-n"],
    },
    {
      id: "compare-target-direction",
      formulaTokenIds: ["vector-DB1", "normal-n"],
    },
    {
      id: "conclude-perpendicular",
      formulaTokenIds: ["conclusion"],
    },
  ];

  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      edge: edge.value,
      points: points.value,
      renderPoints: renderPoints.value,
      vectors,
      checks,
      formula: formula.value,
      proofSteps,
      provenance: {
        kernel: "geometry",
        operation: "cubeMidpointPlanePerpendicularProof",
        sourceRevision: SOURCE_REVISION,
      },
    }),
  };
}
