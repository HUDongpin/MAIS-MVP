import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { CasSession } from "../cas/computeEngine.server";
import { quadPyramid, triPyramid, cuboid, prism } from "../bodies";
import {
  centralConicSlopeProduct,
  eccentricityRangeFromFocalRatio,
  rangeOverLineFamily,
  setupLineConicIntersection,
} from "../analytic/analyticKernel.server";
import {
  regularQuadPyramidLinePlaneAngleFormula,
  solveCubeLinePlaneAngle,
  solveRegularQuadPyramidLinePlaneAngle,
} from "../geometry/solvers.server";
import {
  boxVolume,
  dihedralHalfPlaneCos,
  lineLineAngleCos,
  pointPlaneDistance,
  prismVolume,
  pyramidVolume,
  tetrahedronVolume,
} from "../geometry/exact.server";
import type { MathJsonExpr } from "../shared/types";

const SOURCE_REVISION = "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc" as const;
const BODY_NAMES = ["quadPyramid", "triPyramid", "cuboid", "triangularPrism"] as const;

interface BodyOracle {
  readonly vertices: readonly string[];
  readonly edgeCount: number;
}

interface ExactRangeOracle {
  readonly lower: string;
  readonly upper: string;
  readonly lowerClosed: boolean;
  readonly upperClosed: boolean;
}

interface EllipseFocalChordOracle {
  readonly A: string;
  readonly B: string;
  readonly C: string;
  readonly discriminant: string;
  readonly firstSum: string;
  readonly firstProduct: string;
  readonly dotProduct: string;
  readonly dotProductRange: ExactRangeOracle;
  readonly chordLengthSquared: string;
  readonly chordLengthRange: ExactRangeOracle;
  readonly triangleArea: string;
  readonly triangleAreaRange: ExactRangeOracle;
  readonly centralSlopeProduct: string;
}

interface EdulabGoldenFixture {
  readonly schemaVersion: 1;
  readonly purpose: string;
  readonly sourceRevision: typeof SOURCE_REVISION;
  readonly oracleEnvironment: {
    readonly pythonVersion: string;
    readonly sympyVersion: string;
    readonly mpmathVersion: string;
    readonly executedGeneratePy: boolean;
    readonly executedHtml: boolean;
  };
  readonly generationEvidence: {
    readonly fullOracleSha256: string;
    readonly generatorSha256: string;
    readonly fullOracleAssertionCount: number;
    readonly supplementalAssertionCount: number;
  };
  readonly sourceFiles: Readonly<
    Record<"bodies.py" | "geometry_kernel.py" | "conics.py" | "analytic_kernel.py", string>
  >;
  readonly sourceObservedSemantics: {
    readonly bodies: Readonly<Record<(typeof BODY_NAMES)[number], BodyOracle>> & {
      readonly hasCubeExport: boolean;
    };
    readonly conics: {
      readonly parabolaConvention: string;
      readonly translatedLatexMayContainDoubleMinus: boolean;
      readonly translatedHyperbolaLatexOmitsCenter: boolean;
      readonly invalidOrientationFallsThroughToY: boolean;
      readonly eagerBoardFloatConversion: boolean;
    };
    readonly geometry: Readonly<Record<
      | "pyramidLinePlaneAngleSin"
      | "cubeLinePlaneAngleSin"
      | "cubeSkewLineAngleCos"
      | "cubePointPlaneDistance"
      | "regularTetrahedronDihedralCos"
      | "regularTetrahedronVolume"
      | "boxVolume_2_3_4"
      | "prismVolume_7_5"
      | "pyramidVolume_4_3"
      | "generalPyramidLinePlaneAngleSin",
      string
    >>;
    readonly analytic: {
      readonly ellipseFocalChord: EllipseFocalChordOracle;
      readonly parabolaFocalChordDotProduct: string;
      readonly hyperbolaFocalRatioK3: ExactRangeOracle;
    };
  };
  readonly maisRequiredSemantics: {
    readonly inputValidation: string;
    readonly translatedConics: string;
    readonly rangeProof: string;
    readonly cubeTopology: string;
    readonly coordinateHandedness: string;
    readonly casBoundary: string;
    readonly pythonRuntimeRequired: boolean;
  };
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(
    value !== null && typeof value === "object" && !Array.isArray(value),
    true,
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function expectExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    `${label} schema keys changed`,
  );
}

function expectString(value: unknown, label: string): string {
  assert.equal(typeof value, "string", `${label} must be a string`);
  return value as string;
}

function expectBoolean(value: unknown, label: string): boolean {
  assert.equal(typeof value, "boolean", `${label} must be a boolean`);
  return value as boolean;
}

function expectSafeInteger(value: unknown, label: string): number {
  assert.equal(
    typeof value === "number" && Number.isSafeInteger(value),
    true,
    `${label} must be a safe integer`,
  );
  return value as number;
}

function expectLiteral<T extends string | number | boolean>(
  value: unknown,
  expected: T,
  label: string,
): T {
  assert.equal(value, expected, `${label} changed`);
  return expected;
}

function expectSha256(value: unknown, label: string): string {
  const sha = expectString(value, label);
  assert.match(sha, /^[a-f0-9]{64}$/, `${label} must be a lowercase SHA-256`);
  return sha;
}

function parseStringRecord<const Keys extends readonly string[]>(
  value: unknown,
  keys: Keys,
  label: string,
): Readonly<Record<Keys[number], string>> {
  const record = expectRecord(value, label);
  expectExactKeys(record, keys, label);
  return Object.fromEntries(
    keys.map((key) => [key, expectString(record[key], `${label}.${key}`)]),
  ) as Readonly<Record<Keys[number], string>>;
}

function parseBodyOracle(value: unknown, label: string): BodyOracle {
  const record = expectRecord(value, label);
  expectExactKeys(record, ["vertices", "edgeCount"], label);
  assert.equal(Array.isArray(record.vertices), true, `${label}.vertices must be an array`);
  const vertices = record.vertices as unknown[];
  assert.equal(
    vertices.every((vertex) => typeof vertex === "string"),
    true,
    `${label}.vertices must contain strings`,
  );
  return {
    vertices: vertices as string[],
    edgeCount: expectSafeInteger(record.edgeCount, `${label}.edgeCount`),
  };
}

function parseExactRangeOracle(value: unknown, label: string): ExactRangeOracle {
  const record = expectRecord(value, label);
  expectExactKeys(
    record,
    ["lower", "upper", "lowerClosed", "upperClosed"],
    label,
  );
  return {
    lower: expectString(record.lower, `${label}.lower`),
    upper: expectString(record.upper, `${label}.upper`),
    lowerClosed: expectBoolean(record.lowerClosed, `${label}.lowerClosed`),
    upperClosed: expectBoolean(record.upperClosed, `${label}.upperClosed`),
  };
}

function parseGoldenFixture(value: unknown): EdulabGoldenFixture {
  const root = expectRecord(value, "fixture");
  expectExactKeys(
    root,
    [
      "schemaVersion",
      "purpose",
      "sourceRevision",
      "oracleEnvironment",
      "generationEvidence",
      "sourceFiles",
      "sourceObservedSemantics",
      "maisRequiredSemantics",
    ],
    "fixture",
  );

  const environment = expectRecord(root.oracleEnvironment, "fixture.oracleEnvironment");
  expectExactKeys(
    environment,
    ["pythonVersion", "sympyVersion", "mpmathVersion", "executedGeneratePy", "executedHtml"],
    "fixture.oracleEnvironment",
  );
  const evidence = expectRecord(root.generationEvidence, "fixture.generationEvidence");
  expectExactKeys(
    evidence,
    ["fullOracleSha256", "generatorSha256", "fullOracleAssertionCount", "supplementalAssertionCount"],
    "fixture.generationEvidence",
  );
  const sourceFiles = parseStringRecord(
    root.sourceFiles,
    ["bodies.py", "geometry_kernel.py", "conics.py", "analytic_kernel.py"] as const,
    "fixture.sourceFiles",
  );
  for (const [name, sha] of Object.entries(sourceFiles)) {
    expectSha256(sha, `fixture.sourceFiles.${name}`);
  }

  const observed = expectRecord(root.sourceObservedSemantics, "fixture.sourceObservedSemantics");
  expectExactKeys(observed, ["bodies", "conics", "geometry", "analytic"], "fixture.sourceObservedSemantics");
  const bodiesRecord = expectRecord(observed.bodies, "fixture.sourceObservedSemantics.bodies");
  expectExactKeys(
    bodiesRecord,
    [...BODY_NAMES, "hasCubeExport"],
    "fixture.sourceObservedSemantics.bodies",
  );
  const bodies = {
    quadPyramid: parseBodyOracle(bodiesRecord.quadPyramid, "bodies.quadPyramid"),
    triPyramid: parseBodyOracle(bodiesRecord.triPyramid, "bodies.triPyramid"),
    cuboid: parseBodyOracle(bodiesRecord.cuboid, "bodies.cuboid"),
    triangularPrism: parseBodyOracle(bodiesRecord.triangularPrism, "bodies.triangularPrism"),
    hasCubeExport: expectBoolean(bodiesRecord.hasCubeExport, "bodies.hasCubeExport"),
  };

  const conicsRecord = expectRecord(observed.conics, "fixture.sourceObservedSemantics.conics");
  expectExactKeys(
    conicsRecord,
    [
      "parabolaConvention",
      "translatedLatexMayContainDoubleMinus",
      "translatedHyperbolaLatexOmitsCenter",
      "invalidOrientationFallsThroughToY",
      "eagerBoardFloatConversion",
    ],
    "fixture.sourceObservedSemantics.conics",
  );
  const geometryKeys = [
    "pyramidLinePlaneAngleSin",
    "cubeLinePlaneAngleSin",
    "cubeSkewLineAngleCos",
    "cubePointPlaneDistance",
    "regularTetrahedronDihedralCos",
    "regularTetrahedronVolume",
    "boxVolume_2_3_4",
    "prismVolume_7_5",
    "pyramidVolume_4_3",
    "generalPyramidLinePlaneAngleSin",
  ] as const;
  const geometry = parseStringRecord(
    observed.geometry,
    geometryKeys,
    "fixture.sourceObservedSemantics.geometry",
  );

  const analyticRecord = expectRecord(observed.analytic, "fixture.sourceObservedSemantics.analytic");
  expectExactKeys(
    analyticRecord,
    ["ellipseFocalChord", "parabolaFocalChordDotProduct", "hyperbolaFocalRatioK3"],
    "fixture.sourceObservedSemantics.analytic",
  );
  const ellipseRecord = expectRecord(analyticRecord.ellipseFocalChord, "analytic.ellipseFocalChord");
  expectExactKeys(
    ellipseRecord,
    [
      "A",
      "B",
      "C",
      "discriminant",
      "firstSum",
      "firstProduct",
      "dotProduct",
      "dotProductRange",
      "chordLengthSquared",
      "chordLengthRange",
      "triangleArea",
      "triangleAreaRange",
      "centralSlopeProduct",
    ],
    "analytic.ellipseFocalChord",
  );
  const ellipseStrings = parseStringRecord(
    Object.fromEntries(
      [
        "A",
        "B",
        "C",
        "discriminant",
        "firstSum",
        "firstProduct",
        "dotProduct",
        "chordLengthSquared",
        "triangleArea",
        "centralSlopeProduct",
      ].map((key) => [key, ellipseRecord[key]]),
    ),
    [
      "A",
      "B",
      "C",
      "discriminant",
      "firstSum",
      "firstProduct",
      "dotProduct",
      "chordLengthSquared",
      "triangleArea",
      "centralSlopeProduct",
    ] as const,
    "analytic.ellipseFocalChord.expressions",
  );

  const required = expectRecord(root.maisRequiredSemantics, "fixture.maisRequiredSemantics");
  expectExactKeys(
    required,
    [
      "inputValidation",
      "translatedConics",
      "rangeProof",
      "cubeTopology",
      "coordinateHandedness",
      "casBoundary",
      "pythonRuntimeRequired",
    ],
    "fixture.maisRequiredSemantics",
  );

  return {
    schemaVersion: expectLiteral(root.schemaVersion, 1, "fixture.schemaVersion"),
    purpose: expectString(root.purpose, "fixture.purpose"),
    sourceRevision: expectLiteral(root.sourceRevision, SOURCE_REVISION, "fixture.sourceRevision"),
    oracleEnvironment: {
      pythonVersion: expectString(environment.pythonVersion, "oracleEnvironment.pythonVersion"),
      sympyVersion: expectString(environment.sympyVersion, "oracleEnvironment.sympyVersion"),
      mpmathVersion: expectString(environment.mpmathVersion, "oracleEnvironment.mpmathVersion"),
      executedGeneratePy: expectBoolean(environment.executedGeneratePy, "oracleEnvironment.executedGeneratePy"),
      executedHtml: expectBoolean(environment.executedHtml, "oracleEnvironment.executedHtml"),
    },
    generationEvidence: {
      fullOracleSha256: expectSha256(evidence.fullOracleSha256, "generationEvidence.fullOracleSha256"),
      generatorSha256: expectSha256(evidence.generatorSha256, "generationEvidence.generatorSha256"),
      fullOracleAssertionCount: expectSafeInteger(evidence.fullOracleAssertionCount, "generationEvidence.fullOracleAssertionCount"),
      supplementalAssertionCount: expectSafeInteger(evidence.supplementalAssertionCount, "generationEvidence.supplementalAssertionCount"),
    },
    sourceFiles,
    sourceObservedSemantics: {
      bodies,
      conics: {
        parabolaConvention: expectString(conicsRecord.parabolaConvention, "conics.parabolaConvention"),
        translatedLatexMayContainDoubleMinus: expectBoolean(conicsRecord.translatedLatexMayContainDoubleMinus, "conics.translatedLatexMayContainDoubleMinus"),
        translatedHyperbolaLatexOmitsCenter: expectBoolean(conicsRecord.translatedHyperbolaLatexOmitsCenter, "conics.translatedHyperbolaLatexOmitsCenter"),
        invalidOrientationFallsThroughToY: expectBoolean(conicsRecord.invalidOrientationFallsThroughToY, "conics.invalidOrientationFallsThroughToY"),
        eagerBoardFloatConversion: expectBoolean(conicsRecord.eagerBoardFloatConversion, "conics.eagerBoardFloatConversion"),
      },
      geometry,
      analytic: {
        ellipseFocalChord: {
          ...ellipseStrings,
          dotProductRange: parseExactRangeOracle(ellipseRecord.dotProductRange, "analytic.ellipseFocalChord.dotProductRange"),
          chordLengthRange: parseExactRangeOracle(ellipseRecord.chordLengthRange, "analytic.ellipseFocalChord.chordLengthRange"),
          triangleAreaRange: parseExactRangeOracle(ellipseRecord.triangleAreaRange, "analytic.ellipseFocalChord.triangleAreaRange"),
        },
        parabolaFocalChordDotProduct: expectString(analyticRecord.parabolaFocalChordDotProduct, "analytic.parabolaFocalChordDotProduct"),
        hyperbolaFocalRatioK3: parseExactRangeOracle(analyticRecord.hyperbolaFocalRatioK3, "analytic.hyperbolaFocalRatioK3"),
      },
    },
    maisRequiredSemantics: {
      inputValidation: expectString(required.inputValidation, "maisRequiredSemantics.inputValidation"),
      translatedConics: expectString(required.translatedConics, "maisRequiredSemantics.translatedConics"),
      rangeProof: expectString(required.rangeProof, "maisRequiredSemantics.rangeProof"),
      cubeTopology: expectString(required.cubeTopology, "maisRequiredSemantics.cubeTopology"),
      coordinateHandedness: expectString(required.coordinateHandedness, "maisRequiredSemantics.coordinateHandedness"),
      casBoundary: expectString(required.casBoundary, "maisRequiredSemantics.casBoundary"),
      pythonRuntimeRequired: expectBoolean(required.pythonRuntimeRequired, "maisRequiredSemantics.pythonRuntimeRequired"),
    },
  };
}

class SympyExactParser {
  private index = 0;

  constructor(private readonly source: string) {
    if (source.length === 0 || source.length > 512) {
      throw new Error("SymPy oracle expression length is outside the test grammar limit.");
    }
  }

  parse(): MathJsonExpr {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new Error(`Unsupported SymPy oracle syntax at offset ${this.index}.`);
    }
    return value;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }

  private consume(token: string): boolean {
    this.skipWhitespace();
    if (!this.source.startsWith(token, this.index)) return false;
    this.index += token.length;
    return true;
  }

  private require(token: string): void {
    if (!this.consume(token)) {
      throw new Error(`Expected ${token} at offset ${this.index}.`);
    }
  }

  private parseExpression(): MathJsonExpr {
    let value = this.parseTerm();
    for (;;) {
      if (this.consume("+")) value = ["Add", value, this.parseTerm()];
      else if (this.consume("-")) value = ["Subtract", value, this.parseTerm()];
      else return value;
    }
  }

  private parseTerm(): MathJsonExpr {
    let value = this.parseUnary();
    for (;;) {
      if (this.consume("*")) {
        if (this.source.startsWith("*", this.index)) {
          throw new Error(`Unexpected power token at offset ${this.index - 1}.`);
        }
        value = ["Multiply", value, this.parseUnary()];
      } else if (this.consume("/")) value = ["Divide", value, this.parseUnary()];
      else return value;
    }
  }

  private parseUnary(): MathJsonExpr {
    if (this.consume("+")) return this.parseUnary();
    if (this.consume("-")) return ["Negate", this.parseUnary()];
    return this.parsePower();
  }

  private parsePower(): MathJsonExpr {
    const base = this.parsePrimary();
    return this.consume("**")
      ? ["Power", base, this.parseUnary()]
      : base;
  }

  private parsePrimary(): MathJsonExpr {
    this.skipWhitespace();
    if (this.consume("(")) {
      const value = this.parseExpression();
      this.require(")");
      return value;
    }
    if (this.source.startsWith("sqrt", this.index)) {
      this.index += "sqrt".length;
      this.require("(");
      const value = this.parseExpression();
      this.require(")");
      return ["Sqrt", value];
    }
    const symbol = this.source[this.index];
    if (symbol === "m" || symbol === "a" || symbol === "h") {
      this.index += 1;
      return symbol;
    }
    const start = this.index;
    while (/\d/.test(this.source[this.index] ?? "")) this.index += 1;
    if (this.index > start) {
      const value = Number(this.source.slice(start, this.index));
      if (!Number.isSafeInteger(value)) {
        throw new Error("SymPy oracle integer is outside the safe JSON range.");
      }
      return value;
    }
    throw new Error(`Unsupported SymPy oracle token at offset ${this.index}.`);
  }
}

function parseSympyExact(source: string): MathJsonExpr {
  return new SympyExactParser(source).parse();
}

const fixturePath = resolve(
  process.cwd(),
  "lib/math-kernel/test-fixtures/edulab-cf0bc1d-sympy-1.14.0.golden.json",
);
const rawFixture: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
const fixture = parseGoldenFixture(rawFixture);

const session = new CasSession();

function assertExact(actual: unknown, expected: unknown): void {
  assert.deepEqual(session.compareExactMathJson(actual, expected), {
    ok: true,
    value: "equal",
  });
}

test("curated oracle pins source, toolchain, hashes, and the source/MAIS semantic boundary", () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(
    fixture.sourceRevision,
    "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  );
  assert.deepEqual(fixture.oracleEnvironment, {
    pythonVersion: "3.14.6",
    sympyVersion: "1.14.0",
    mpmathVersion: "1.3.0",
    executedGeneratePy: false,
    executedHtml: false,
  });
  assert.deepEqual(fixture.generationEvidence, {
    fullOracleSha256: "e8814590dfb31411ef53c7ce8a056993702e566a34e8cb940a9b8d7696143fd8",
    generatorSha256: "7afe653e9971127d4d793340d5716d4f035b80304f91fb1594b03f2a4a76d9e2",
    fullOracleAssertionCount: 25,
    supplementalAssertionCount: 6,
  });
  assert.equal(fixture.sourceObservedSemantics.bodies.hasCubeExport, false);
  assert.equal(fixture.maisRequiredSemantics.pythonRuntimeRequired, false);
});

test("TypeScript body order and counts reproduce the pinned source oracle", () => {
  for (const [name, result] of [
    ["quadPyramid", quadPyramid()],
    ["triPyramid", triPyramid()],
    ["cuboid", cuboid()],
    ["triangularPrism", prism()],
  ] as const) {
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.deepEqual(result.value.vertices, fixture.sourceObservedSemantics.bodies[name].vertices);
    assert.equal(result.value.edges.length, fixture.sourceObservedSemantics.bodies[name].edgeCount);
  }
});

test("TypeScript exact geometry reproduces the pinned and supplemental SymPy goldens", () => {
  const oracle = fixture.sourceObservedSemantics.geometry;
  const cube = {
    A: [0, 0, 0] as const,
    B: [1, 0, 0] as const,
    C: [1, 1, 0] as const,
    A1: [0, 0, 1] as const,
  };
  const tetrahedron = {
    A: [1, 1, 1] as const,
    B: [1, -1, -1] as const,
    C: [-1, 1, -1] as const,
    D: [-1, -1, 1] as const,
  };
  const cases = [
    [lineLineAngleCos(
      [cube.C[0] - cube.A1[0], cube.C[1] - cube.A1[1], cube.C[2] - cube.A1[2]],
      [cube.B[0] - cube.A[0], cube.B[1] - cube.A[1], cube.B[2] - cube.A[2]],
    ), parseSympyExact(oracle.cubeSkewLineAngleCos)],
    [pointPlaneDistance(cube.A1, cube.A, [0, 0, 1]), parseSympyExact(oracle.cubePointPlaneDistance)],
    [
      dihedralHalfPlaneCos(
        tetrahedron.A,
        tetrahedron.B,
        tetrahedron.C,
        tetrahedron.D,
      ),
      parseSympyExact(oracle.regularTetrahedronDihedralCos),
    ],
    [
      tetrahedronVolume(tetrahedron.A, tetrahedron.B, tetrahedron.C, tetrahedron.D),
      parseSympyExact(oracle.regularTetrahedronVolume),
    ],
    [boxVolume(2, 3, 4), parseSympyExact(oracle.boxVolume_2_3_4)],
    [prismVolume(7, 5), parseSympyExact(oracle.prismVolume_7_5)],
    [pyramidVolume(4, 3), parseSympyExact(oracle.pyramidVolume_4_3)],
  ] as const;
  for (const [result, expected] of cases) {
    assert.equal(result.ok, true);
    if (result.ok) assertExact(result.value.mathJson, expected);
  }
  const pyramidSolution = solveRegularQuadPyramidLinePlaneAngle();
  assert.equal(pyramidSolution.ok, true);
  if (pyramidSolution.ok) {
    assertExact(
      pyramidSolution.value.answer.mathJson,
      parseSympyExact(oracle.pyramidLinePlaneAngleSin),
    );
  }
  const cubeSolution = solveCubeLinePlaneAngle();
  assert.equal(cubeSolution.ok, true);
  if (cubeSolution.ok) {
    assertExact(
      cubeSolution.value.answer.mathJson,
      parseSympyExact(oracle.cubeLinePlaneAngleSin),
    );
  }
  assertExact(
    regularQuadPyramidLinePlaneAngleFormula("a", "h"),
    parseSympyExact(oracle.generalPyramidLinePlaneAngleSin),
  );
});

test("TypeScript analytic setup and exact intervals reproduce every requested oracle golden", () => {
  const analyticOracle = fixture.sourceObservedSemantics.analytic;
  const ellipseOracle = analyticOracle.ellipseFocalChord;
  const conic = { x2: 3, xy: 0, y2: 4, x: 0, y: 0, constant: -12 } as const;
  const setup = setupLineConicIntersection({
    conic,
    line: { orientation: "xFromY", through: [1, 0] },
  });
  assert.equal(setup.ok, true);
  if (setup.ok) {
    for (const key of ["A", "B", "C", "discriminant", "firstSum", "firstProduct"] as const) {
      assertExact(setup.value[key].mathJson, parseSympyExact(ellipseOracle[key]));
    }
  }

  for (const { metric, oracle, expression } of [
    {
      metric: { kind: "dot-product" as const, vertex: [-1, 0] as const },
      oracle: ellipseOracle.dotProductRange,
      expression: ellipseOracle.dotProduct,
    },
    {
      metric: { kind: "chord-length" as const },
      oracle: ellipseOracle.chordLengthRange,
      expression: null,
    },
    {
      metric: { kind: "triangle-area" as const, vertex: [0, 0] as const, excludeDegenerate: true },
      oracle: ellipseOracle.triangleAreaRange,
      expression: ellipseOracle.triangleArea,
    },
  ] as const) {
    const result = rangeOverLineFamily({
      conic,
      line: { orientation: "xFromY", through: [1, 0] },
      metric,
    });
    assert.equal(result.ok, true);
    if (
      !result.ok ||
      result.value.interval.lower.kind !== "finite" ||
      result.value.interval.upper.kind !== "finite"
    ) continue;
    assertExact(result.value.interval.lower.value.mathJson, parseSympyExact(oracle.lower));
    assertExact(result.value.interval.upper.value.mathJson, parseSympyExact(oracle.upper));
    assert.equal(result.value.interval.lower.closed, oracle.lowerClosed);
    assert.equal(result.value.interval.upper.closed, oracle.upperClosed);
    if (expression !== null) {
      assertExact(result.value.expression.mathJson, parseSympyExact(expression));
    }
  }

  const chordSquared = rangeOverLineFamily({
    conic,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "chord-length-squared" },
  });
  assert.equal(chordSquared.ok, true);
  if (chordSquared.ok) {
    assertExact(
      chordSquared.value.expression.mathJson,
      parseSympyExact(ellipseOracle.chordLengthSquared),
    );
  }

  const centralSlope = centralConicSlopeProduct({
    a: 2,
    b: ["Sqrt", 3],
    center: [0, 0],
    point: [2, 0],
  });
  assert.equal(centralSlope.ok, true);
  if (centralSlope.ok) {
    assertExact(centralSlope.value.mathJson, parseSympyExact(ellipseOracle.centralSlopeProduct));
  }

  const parabola = rangeOverLineFamily({
    conic: { x2: 0, xy: 0, y2: 1, x: -4, y: 0, constant: 0 },
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "dot-product", vertex: [0, 0] },
  });
  assert.equal(parabola.ok, true);
  if (parabola.ok) {
    assertExact(
      parabola.value.expression.mathJson,
      parseSympyExact(analyticOracle.parabolaFocalChordDotProduct),
    );
  }

  const eccentricity = eccentricityRangeFromFocalRatio(3);
  assert.equal(eccentricity.ok, true);
  if (
    eccentricity.ok &&
    eccentricity.value.interval.lower.kind === "finite" &&
    eccentricity.value.interval.upper.kind === "finite"
  ) {
    const oracle = analyticOracle.hyperbolaFocalRatioK3;
    assertExact(eccentricity.value.interval.lower.value.mathJson, parseSympyExact(oracle.lower));
    assertExact(eccentricity.value.interval.upper.value.mathJson, parseSympyExact(oracle.upper));
    assert.equal(eccentricity.value.interval.lower.closed, oracle.lowerClosed);
    assert.equal(eccentricity.value.interval.upper.closed, oracle.upperClosed);
  }
});

test("the fixture-only SymPy parser rejects decimal and arbitrary-function syntax", () => {
  assert.throws(() => parseSympyExact("1.5"), /Unsupported SymPy oracle syntax/);
  assert.throws(() => parseSympyExact("sin(m)"), /Unsupported SymPy oracle token/);
});

test("the production math-kernel script has no Python or SymPy runtime dependency", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string>; dependencies: Record<string, string> };
  assert.doesNotMatch(packageJson.scripts["test:math-kernel"], /python|sympy/i);
  assert.equal("sympy" in packageJson.dependencies, false);
});
