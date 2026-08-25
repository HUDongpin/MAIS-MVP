import assert from "node:assert/strict";
import { test } from "node:test";

import { CasSession } from "../cas/computeEngine.server";
import type { ExactValueDto, MathJsonExpr } from "../shared/types";
import { buildCubeMidpointPerpendicularProof } from "./cubeMidpointPerpendicular.server";

const POINT_IDS = [
  "A",
  "B",
  "C",
  "D",
  "A1",
  "B1",
  "C1",
  "D1",
  "E",
  "F",
  "G",
  "H",
  "N",
] as const;

const TOKEN_IDS = [
  "point-E",
  "point-F",
  "point-G",
  "vector-EF",
  "vector-EG",
  "normal-n",
  "vector-DB1",
  "conclusion",
] as const;

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful cube proof payload.");
  return result.value;
}

function exactEqual(
  session: CasSession,
  value: ExactValueDto,
  expected: MathJsonExpr,
): void {
  assert.equal(
    unwrap(session.compareExactMathJson(value.mathJson, expected)),
    "equal",
  );
}

function exactTuple(
  point: readonly [ExactValueDto, ExactValueDto, ExactValueDto],
): readonly MathJsonExpr[] {
  return point.map((component) => component.mathJson);
}

function tupleLatex(
  point: readonly [ExactValueDto, ExactValueDto, ExactValueDto],
): string {
  return `(${point.map((component) => component.latex).join(", ")})`;
}

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("builds the exact cube, midpoint plane, normal endpoint, and world render points", () => {
  const session = new CasSession();
  const proof = unwrap(buildCubeMidpointPerpendicularProof());

  assert.equal(proof.schemaVersion, 1);
  exactEqual(session, proof.edge, 2);
  assert.deepEqual(Object.keys(proof.points), POINT_IDS);
  assert.deepEqual(exactTuple(proof.points.A), [0, 0, 0]);
  assert.deepEqual(exactTuple(proof.points.B), [2, 0, 0]);
  assert.deepEqual(exactTuple(proof.points.C), [2, 2, 0]);
  assert.deepEqual(exactTuple(proof.points.D), [0, 2, 0]);
  assert.deepEqual(exactTuple(proof.points.A1), [0, 0, 2]);
  assert.deepEqual(exactTuple(proof.points.B1), [2, 0, 2]);
  assert.deepEqual(exactTuple(proof.points.C1), [2, 2, 2]);
  assert.deepEqual(exactTuple(proof.points.D1), [0, 2, 2]);
  assert.deepEqual(exactTuple(proof.points.E), [1, 0, 0]);
  assert.deepEqual(exactTuple(proof.points.F), [2, 1, 0]);
  assert.deepEqual(exactTuple(proof.points.G), [2, 2, 1]);
  assert.deepEqual(exactTuple(proof.points.H), [1, 1, 1]);
  assert.deepEqual(exactTuple(proof.points.N), [2, -1, 1]);

  assert.deepEqual(Object.keys(proof.renderPoints), POINT_IDS);
  assert.deepEqual(proof.renderPoints.C1, [2, 2, 2]);
  assert.deepEqual(proof.renderPoints.E, [1, 0, 0]);
  assert.deepEqual(proof.renderPoints.F, [2, 0, 1]);
  assert.deepEqual(proof.renderPoints.G, [2, 1, 2]);
  assert.deepEqual(proof.renderPoints.H, [1, 1, 1]);
  assert.deepEqual(proof.renderPoints.N, [2, 1, -1]);
  assert.equal(
    Object.values(proof.renderPoints).flat().every(Number.isFinite),
    true,
  );
});

test("derives all proof vectors and exact perpendicularity checks from one CAS session", () => {
  const session = new CasSession();
  const proof = unwrap(buildCubeMidpointPerpendicularProof(session));

  assert.deepEqual(Object.keys(proof.vectors), ["EF", "EG", "normal", "DB1"]);
  assert.deepEqual(exactTuple(proof.vectors.EF.components), [1, 1, 0]);
  assert.deepEqual(exactTuple(proof.vectors.EG.components), [1, 2, 1]);
  assert.deepEqual(exactTuple(proof.vectors.normal.components), [1, -1, 1]);
  assert.deepEqual(exactTuple(proof.vectors.DB1.components), [2, -2, 2]);

  exactEqual(session, proof.checks.db1DotEf, 0);
  exactEqual(session, proof.checks.db1DotEg, 0);
  exactEqual(session, proof.checks.db1NormalScale, 2);
  exactEqual(session, proof.checks.linePlaneAngleSin, 1);
});

test("builds stable formula tokens from the exact DTO latex instead of a second numeric formula", () => {
  const proof = unwrap(buildCubeMidpointPerpendicularProof());
  const tokenById = new Map(
    proof.formula.tokens.map((token) => [token.id, token] as const),
  );

  assert.equal(proof.formula.id, "cube-midpoint-perpendicular-proof");
  assert.deepEqual(proof.formula.tokens.map((token) => token.id), TOKEN_IDS);
  assert.deepEqual(
    proof.formula.tokens.map((token) => token.conceptId),
    [
      "proof-midpoint-e",
      "proof-midpoint-f",
      "proof-midpoint-g",
      "proof-plane-vector-ef",
      "proof-plane-vector-eg",
      "proof-plane-normal",
      "proof-target-line",
      "proof-conclusion",
    ],
    "every teaching beat needs an independent semantic focus",
  );
  assert.equal(tokenById.get("point-E")?.text, `E=${tupleLatex(proof.points.E)}`);
  assert.equal(tokenById.get("point-F")?.text, `F=${tupleLatex(proof.points.F)}`);
  assert.equal(tokenById.get("point-G")?.text, `G=${tupleLatex(proof.points.G)}`);
  assert.equal(
    tokenById.get("vector-EF")?.text,
    `\\overrightarrow{EF}=${tupleLatex(proof.vectors.EF.components)}`,
  );
  assert.equal(
    tokenById.get("vector-EG")?.text,
    `\\overrightarrow{EG}=${tupleLatex(proof.vectors.EG.components)}`,
  );
  assert.equal(
    tokenById.get("normal-n")?.text,
    `\\mathbf n=\\overrightarrow{EF}\\times\\overrightarrow{EG}=${tupleLatex(proof.vectors.normal.components)}`,
  );
  assert.equal(
    tokenById.get("vector-DB1")?.text,
    `\\overrightarrow{DB_1}=${tupleLatex(proof.vectors.DB1.components)}=${proof.checks.db1NormalScale.latex}\\mathbf n`,
  );
  assert.equal(
    tokenById.get("conclusion")?.text,
    "DB_1\\perp\\operatorname{plane}(EFG)",
  );
  for (const token of proof.formula.tokens) {
    assert.equal(typeof token.conceptId, "string");
    assert.notEqual(token.conceptId.length, 0);
    assert.equal(proof.formula.latex.includes(token.text), true);
  }

  assert.deepEqual(proof.proofSteps, [
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
  ]);
});

test("returns a deeply immutable JSON-safe proof DTO with source provenance", () => {
  const proof = unwrap(buildCubeMidpointPerpendicularProof());

  assert.deepEqual(JSON.parse(JSON.stringify(proof)), proof);
  assertDeepFrozen(proof);
  assert.deepEqual(proof.provenance, {
    kernel: "geometry",
    operation: "cubeMidpointPlanePerpendicularProof",
    sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  });
});
