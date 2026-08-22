import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsMode,
} from "./SymbolicExpressionsModel";
import {
  SymbolicExpressionsControlDomainError,
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  planSymbolicExpressionsControlTransition,
  symbolicExpressionsControlDescriptorFor,
  type SymbolicExpressionsControlDomainState,
} from "./SymbolicExpressionsControlDomain";
import {
  SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY,
  SYMBOLIC_EXPRESSIONS_VISUAL_COPY,
  SymbolicExpressionsVisualModel,
  buildSymbolicExpressionsVisualReceipt,
} from "./SymbolicExpressionsVisualModel";

const BNU_EXPRESSIONS =
  "bnu-junior-s1-upper-algebraic-expressions" as const;
const BNU_FRACTIONS =
  "bnu-junior-s2-lower-algebraic-fractions-equations" as const;
const HJB_POLYNOMIALS =
  "hjb-junior-s1-upper-polynomial-add-subtract" as const;
const HJB_SIMPLE =
  "hjb-primary-p6-lower-simple-algebraic-expressions" as const;
const PEP_POLYNOMIALS =
  "pep-junior-s2-upper-polynomials-fractions" as const;

const reactGlobal = globalThis as unknown as { React?: typeof React };
let hadOwnReact = false;
let previousReact: typeof React | undefined;

before(() => {
  hadOwnReact = Object.prototype.hasOwnProperty.call(reactGlobal, "React");
  previousReact = reactGlobal.React;
  reactGlobal.React = React;
});

after(() => {
  if (hadOwnReact) reactGlobal.React = previousReact;
  else delete reactGlobal.React;
});

function stateFor(
  labId: Parameters<typeof createSymbolicExpressionsControlDomainState>[0],
  mode: SymbolicExpressionsMode,
) {
  return planSymbolicExpressionsControlTransition(
    createSymbolicExpressionsControlDomainState(labId),
    { controllerId: "mode", kind: "controller", value: mode as never },
  ).expected;
}

function modelFor(state: SymbolicExpressionsControlDomainState) {
  return buildSymbolicExpressionsModel(
    buildSymbolicExpressionsScenarioInput(state),
  );
}

function render(state: SymbolicExpressionsControlDomainState) {
  return renderModel(modelFor(state));
}

function renderModel(
  model: ReturnType<typeof buildSymbolicExpressionsModel>,
) {
  return renderModelInLocale(model, "en");
}

function renderModelInLocale(
  model: ReturnType<typeof buildSymbolicExpressionsModel>,
  locale: "en" | "zh" | "zhHans",
) {
  return renderToStaticMarkup(
    <SymbolicExpressionsVisualModel
      model={model}
      t={(copy) => copy[locale] ?? copy.zh ?? copy.en}
    />,
  );
}

function count(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function geometryReceipt(markup: string) {
  const encoded = markup.match(/data-viz-geometry-receipt="([^"]+)"/u)?.[1];
  assert.ok(encoded, "geometry receipt is missing");
  return JSON.parse(
    encoded.replace(/&quot;/gu, '"').replace(/&amp;/gu, "&"),
  ) as unknown;
}

function coefficientsFromMarks(
  marks: readonly { coefficient: number; degree: number }[],
) {
  const maximumDegree = Math.max(0, ...marks.map(({ degree }) => degree));
  const result = Array.from({ length: maximumDegree + 1 }, () => 0);
  for (const mark of marks) result[mark.degree] += mark.coefficient;
  while (result.length > 1 && result.at(-1) === 0) result.pop();
  return result;
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]+)"`, "u"))?.[1] ?? null;
}

function renderedAlgebraTiles(markup: string) {
  return [...markup.matchAll(/<rect\b[^>]*data-viz-name="algebra-tile"[^>]*>/gu)].map(
    ([tag]) => ({
      degree: Number(attribute(tag, "data-viz-degree")),
      sign: attribute(tag, "data-viz-sign"),
      stage: attribute(tag, "data-viz-stage"),
      unitValue: Number(attribute(tag, "data-viz-unit-value")),
    }),
  );
}

function coefficientsFromRenderedTiles(
  tiles: ReturnType<typeof renderedAlgebraTiles>,
  stage: string,
) {
  const stageTiles = tiles.filter((tile) => tile.stage === stage);
  const maximumDegree = Math.max(0, ...stageTiles.map(({ degree }) => degree));
  const result = Array.from({ length: maximumDegree + 1 }, () => 0);
  for (const tile of stageTiles) result[tile.degree] += tile.unitValue;
  while (result.length > 1 && result.at(-1) === 0) result.pop();
  return result;
}

function assertCoverage(
  state: SymbolicExpressionsControlDomainState,
  expectedKind: string,
) {
  const model = modelFor(state);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  if (receipt.status !== "supported") return;
  assert.equal(receipt.kind, expectedKind);
  assert.ok(receipt.markCount > 0);
  assert.ok(receipt.marks.length > 0);
  assert.equal(receipt.marks.length, receipt.markCount);
  assert.ok(receipt.marks.every(({ owner }) => owner === "symbolic-expressions"));
  const markup = render(state);
  assert.equal(count(markup, /data-viz-painted-mark="true"/gu), receipt.markCount);
  assert.match(markup, new RegExp(`data-viz-symbolic-visual="${expectedKind}"`, "u"));
  assert.match(markup, /data-viz-owner="symbolic-expressions"/u);
  assert.deepEqual(geometryReceipt(markup), receipt);
}

test("collect-like-terms algebra tiles preserve source ownership, signs, degrees, and coefficient reconstruction", () => {
  const model = modelFor(
    createSymbolicExpressionsControlDomainState(BNU_EXPRESSIONS),
  );
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "collect-like-terms");
  if (receipt.status !== "supported" || receipt.kind !== "collect-like-terms") return;
  const source = receipt.marks.filter(({ stage }) => stage === "source");
  const result = receipt.marks.filter(({ stage }) => stage === "result");
  assert.deepEqual(coefficientsFromMarks(source), [4, 1, 5]);
  assert.deepEqual(coefficientsFromMarks(result), [4, 1, 5]);
  assert.ok(source.some(({ sign }) => sign === "negative"));
  assert.ok(source.some(({ degree }) => degree === 2));
  assert.deepEqual(receipt.coefficientResidual, [0]);

  const markup = render(createSymbolicExpressionsControlDomainState(BNU_EXPRESSIONS));
  assert.equal(count(markup, /data-viz-name="algebra-tile"/gu), receipt.markCount);
  assert.match(markup, /data-viz-stage="source"/u);
  assert.match(markup, /data-viz-stage="result"/u);
});

test("painted algebra-tile multiplicity reconstructs 5x, -4x, zero cancellation, and 137 visible units from SVG elements", () => {
  const collected = buildSymbolicExpressionsModel({
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [
      { coefficient: 5, degree: 1 },
      { coefficient: -4, degree: 1 },
      { coefficient: 0, degree: 0 },
    ],
  });
  const collectedTiles = renderedAlgebraTiles(renderModel(collected));
  assert.equal(
    collectedTiles.filter(({ stage }) => stage === "source").length,
    9,
  );
  assert.deepEqual(coefficientsFromRenderedTiles(collectedTiles, "source"), [0, 1]);
  assert.deepEqual(coefficientsFromRenderedTiles(collectedTiles, "result"), [0, 1]);
  assert.equal(collectedTiles.some(({ sign }) => sign === "zero"), false);
  assert.ok(collectedTiles.every(({ unitValue }) => Math.abs(unitValue) === 1));

  const cancelled = buildSymbolicExpressionsModel({
    labId: HJB_POLYNOMIALS,
    left: [5],
    mode: "add",
    right: [-5],
  });
  const cancelledTiles = renderedAlgebraTiles(renderModel(cancelled));
  assert.equal(
    cancelledTiles.filter(({ stage }) => stage === "result").length,
    0,
  );

  const largeConstant = buildSymbolicExpressionsModel({
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [{ coefficient: 137, degree: 0 }],
  });
  const largeTiles = renderedAlgebraTiles(renderModel(largeConstant));
  assert.equal(
    largeTiles.filter(({ stage }) => stage === "source").length,
    137,
  );
  assert.equal(
    largeTiles.filter(({ stage }) => stage === "result").length,
    137,
  );
  assert.deepEqual(coefficientsFromRenderedTiles(largeTiles, "source"), [137]);
  assert.deepEqual(coefficientsFromRenderedTiles(largeTiles, "result"), [137]);
});

test("an all-zero reachable collection renders one truthful zero marker and no invented algebra tile", () => {
  const model = buildSymbolicExpressionsModel({
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [
      { coefficient: 0, degree: 1 },
      { coefficient: 0, degree: 2 },
      { coefficient: 0, degree: 1 },
      { coefficient: 0, degree: 0 },
    ],
  });
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "collect-like-terms");
  if (receipt.status !== "supported" || receipt.kind !== "collect-like-terms") return;
  assert.deepEqual(receipt.resultCoefficients, [0]);
  assert.deepEqual(receipt.coefficientResidual, [0]);
  assert.equal(receipt.markCount, 1);
  assert.deepEqual(
    receipt.marks.map(({ coefficient, exact, name, stage, unitCount, unitValue }) => ({
      coefficient,
      exact,
      name,
      stage,
      unitCount,
      unitValue,
    })),
    [
      {
        coefficient: 0,
        exact: "0",
        name: "zero-expression",
        stage: "result",
        unitCount: 0,
        unitValue: 0,
      },
    ],
  );
  const markup = renderModel(model);
  assert.equal(count(markup, /data-viz-name="zero-expression"/gu), 1);
  assert.equal(count(markup, /data-viz-painted-mark="true"/gu), 1);
  assert.equal(count(markup, /data-viz-name="algebra-tile"/gu), 0);
  assert.match(markup, /data-viz-zero-result="true"/u);
  assert.match(markup, />0</u);
  assert.deepEqual(geometryReceipt(markup), receipt);
});

test("addition and subtraction tiles reconstruct left, signed-right, and result coefficients", () => {
  const state = stateFor(HJB_POLYNOMIALS, "subtract");
  const model = modelFor(state);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "binary-polynomial");
  if (receipt.status !== "supported" || receipt.kind !== "binary-polynomial") return;
  const stage = (name: string) =>
    coefficientsFromMarks(receipt.marks.filter((mark) => mark.stage === name));
  assert.deepEqual(stage("left"), [1, -2, 3]);
  assert.deepEqual(stage("right"), [-5, 4, 1]);
  assert.deepEqual(stage("signed-right"), [5, -4, -1]);
  assert.deepEqual(stage("result"), [6, -6, 2]);
  assert.equal(receipt.operator, "−");
  assert.deepEqual(receipt.coefficientResidual, [0]);
  assertCoverage(state, "binary-polynomial");
});

test("all-zero binary add and subtract render one exact zero result without invented tiles", () => {
  for (const labId of [BNU_EXPRESSIONS, HJB_POLYNOMIALS] as const) {
    for (const mode of ["add", "subtract"] as const) {
      const model = buildSymbolicExpressionsModel({
        labId,
        left: [0],
        mode,
        right: [0],
      });
      assert.equal(model.result.kind, "polynomial");
      if (model.result.kind !== "polynomial") continue;
      assert.deepEqual(model.result.polynomial.coefficients, [0]);
      const receipt = buildSymbolicExpressionsVisualReceipt(model);
      assert.equal(receipt.status, "supported");
      assert.equal(receipt.kind, "binary-polynomial");
      if (receipt.status !== "supported" || receipt.kind !== "binary-polynomial") continue;
      assert.equal(receipt.markCount, 1);
      assert.deepEqual(
        receipt.marks.map(({ exact, name, stage, unitCount, unitValue }) => ({
          exact,
          name,
          stage,
          unitCount,
          unitValue,
        })),
        [
          {
            exact: "0",
            name: "zero-expression",
            stage: "result",
            unitCount: 0,
            unitValue: 0,
          },
        ],
      );
      const markup = renderModel(model);
      assert.equal(count(markup, /data-viz-name="zero-expression"/gu), 1);
      assert.equal(count(markup, /data-viz-painted-mark="true"/gu), 1);
      assert.equal(count(markup, /data-viz-name="algebra-tile"/gu), 0);
      assert.match(markup, /data-viz-zero-result="true"/u);
      assert.deepEqual(geometryReceipt(markup), receipt);
    }
  }
});

test("every reachable zero/min visible-control state has an explicit nonempty or unsupported visual receipt", () => {
  const auditedModeKeys = new Set<string>();
  const acceptedByMode = new Map<string, number>();
  let acceptedStates = 0;
  for (const labId of [
    BNU_EXPRESSIONS,
    BNU_FRACTIONS,
    "hjb-junior-s1-upper-algebraic-fractions",
    HJB_POLYNOMIALS,
    HJB_SIMPLE,
    "pep-junior-s1-upper-expressions-linear-equations",
    PEP_POLYNOMIALS,
  ] as const) {
    for (const mode of [
      "collect-like-terms",
      "add",
      "subtract",
      "expand",
      "factor",
      "substitute",
      "fraction-simplify",
      "solve",
    ] as const) {
      let initial: SymbolicExpressionsControlDomainState;
      try {
        initial = stateFor(labId, mode);
      } catch (error) {
        if (error instanceof SymbolicExpressionsControlDomainError) continue;
        throw error;
      }
      const modeKey = `${labId}:${mode}`;
      auditedModeKeys.add(modeKey);
      const acceptedBeforeMode = acceptedStates;
      const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
      const queue = [initial];
      const seen = new Set([JSON.stringify(initial)]);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const state = queue[cursor]!;
        const model = modelFor(state);
        const receipt = buildSymbolicExpressionsVisualReceipt(model);
        acceptedStates += 1;
        if (receipt.status === "supported") {
          assert.ok(receipt.markCount > 0, `${modeKey}:${JSON.stringify(state)}`);
          assert.equal(receipt.marks.length, receipt.markCount, modeKey);
        } else {
          assert.match(
            receipt.reason,
            /tile-count-exceeds-visual-domain|zero-factor-has-no-area-partition/u,
            modeKey,
          );
        }
        for (const control of descriptor.controls) {
          const values = [control.min];
          if (control.min <= 0 && control.max >= 0) values.push(0);
          for (const value of new Set(values)) {
            try {
              const next = planSymbolicExpressionsControlTransition(state, {
                controlId: control.controlId,
                kind: "control",
                value,
              }).expected;
              const key = JSON.stringify(next);
              if (!seen.has(key)) {
                seen.add(key);
                queue.push(next);
              }
            } catch (error) {
              if (error instanceof SymbolicExpressionsControlDomainError) continue;
              throw error;
            }
          }
        }
      }
      acceptedByMode.set(modeKey, acceptedStates - acceptedBeforeMode);
    }
  }
  assert.equal(auditedModeKeys.size, 16);
  assert.deepEqual([...acceptedByMode], [
    ["bnu-junior-s1-upper-algebraic-expressions:collect-like-terms", 81],
    ["bnu-junior-s1-upper-algebraic-expressions:add", 729],
    ["bnu-junior-s1-upper-algebraic-expressions:subtract", 729],
    ["bnu-junior-s2-lower-algebraic-fractions-equations:fraction-simplify", 48],
    ["bnu-junior-s2-lower-algebraic-fractions-equations:solve", 98],
    ["hjb-junior-s1-upper-algebraic-fractions:fraction-simplify", 72],
    ["hjb-junior-s1-upper-polynomial-add-subtract:collect-like-terms", 81],
    ["hjb-junior-s1-upper-polynomial-add-subtract:add", 729],
    ["hjb-junior-s1-upper-polynomial-add-subtract:subtract", 729],
    ["hjb-primary-p6-lower-simple-algebraic-expressions:collect-like-terms", 54],
    ["hjb-primary-p6-lower-simple-algebraic-expressions:substitute", 54],
    ["pep-junior-s1-upper-expressions-linear-equations:collect-like-terms", 81],
    ["pep-junior-s1-upper-expressions-linear-equations:solve", 54],
    ["pep-junior-s2-upper-polynomials-fractions:expand", 81],
    ["pep-junior-s2-upper-polynomials-fractions:factor", 72],
    ["pep-junior-s2-upper-polynomials-fractions:fraction-simplify", 72],
  ]);
  assert.equal(acceptedStates, 3_764);
});

test("expand and factor area partitions independently reconstruct every coefficient product", () => {
  const expandedState = stateFor(PEP_POLYNOMIALS, "expand");
  const expandedModel = modelFor(expandedState);
  const expanded = buildSymbolicExpressionsVisualReceipt(expandedModel);
  assert.equal(expanded.status, "supported");
  assert.equal(expanded.kind, "area-expansion");
  if (expanded.status !== "supported" || expanded.kind !== "area-expansion") return;
  assert.equal(expanded.cells.length, 4);
  assert.deepEqual(
    coefficientsFromMarks(
      expanded.cells.map(({ coefficient, degree }) => ({ coefficient, degree })),
    ),
    expanded.resultCoefficients,
  );
  const areaScale =
    (expanded.cells[0]!.width * expanded.cells[0]!.height) /
    expanded.cells[0]!.absoluteAreaUnits;
  for (const cell of expanded.cells) {
    assert.equal(
      cell.absoluteAreaUnits,
      Math.abs(cell.leftCoefficient * cell.rightCoefficient),
    );
    assert.ok(
      Math.abs((cell.width * cell.height) / cell.absoluteAreaUnits - areaScale) <
        1e-9,
      cell.markId,
    );
  }
  assert.deepEqual(expanded.coefficientResidual, [0]);
  assertCoverage(expandedState, "area-expansion");

  const factoredState = stateFor(PEP_POLYNOMIALS, "factor");
  const factored = buildSymbolicExpressionsVisualReceipt(modelFor(factoredState));
  assert.equal(factored.status, "supported");
  assert.equal(factored.kind, "area-factorization");
  if (factored.status !== "supported" || factored.kind !== "area-factorization") return;
  assert.deepEqual(
    coefficientsFromMarks(
      factored.cells.map(({ coefficient, degree }) => ({ coefficient, degree })),
    ),
    factored.originalCoefficients,
  );
  assert.deepEqual(factored.coefficientResidual, [0]);
  assertCoverage(factoredState, "area-factorization");
});

test("zero-factor expansion is explicitly unsupported and renders no affirmative SVG", () => {
  const base = stateFor(PEP_POLYNOMIALS, "expand");
  const zeroFactor = {
    ...base,
    coefficientA: 0,
    constantA: 0,
  } as SymbolicExpressionsControlDomainState;
  const model = modelFor(zeroFactor);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.deepEqual(receipt, {
    kind: "area-expansion",
    reason: "zero-factor-has-no-area-partition",
    status: "unsupported",
  });
  const markup = render(zeroFactor);
  assert.match(markup, /data-viz-symbolic-visual-status="unsupported"/u);
  assert.doesNotMatch(markup, /<svg/u);
  assert.doesNotMatch(markup, /data-viz-painted-mark="true"/u);
});

test("substitution flow binds every polynomial contribution to the exact rational sum", () => {
  const state = createSymbolicExpressionsControlDomainState(HJB_SIMPLE);
  const model = modelFor(state);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "substitution-flow");
  if (receipt.status !== "supported" || receipt.kind !== "substitution-flow") return;
  assert.deepEqual(receipt.polynomialCoefficients, [-2, 3]);
  assert.equal(receipt.value, "4");
  assert.deepEqual(
    receipt.contributions.map(({ exact }) => exact),
    ["-2", "12"],
  );
  assert.equal(receipt.result, "10");
  assert.equal(receipt.residual, "0");
  assertCoverage(state, "substitution-flow");
});

test("fraction cancellation retains the original denominator exclusion and exact common factor", () => {
  const state = stateFor(PEP_POLYNOMIALS, "fraction-simplify");
  const model = modelFor(state);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "fraction-cancellation");
  if (receipt.status !== "supported" || receipt.kind !== "fraction-cancellation") return;
  assert.deepEqual(receipt.commonFactorCoefficients, [-1, 1]);
  assert.ok(receipt.originalDenominator.includes("x - 1"));
  assert.equal(receipt.simplifiedDenominator, "1");
  assert.deepEqual(receipt.originalRationalExclusions, ["1"]);
  assert.equal(receipt.retainedOriginalRestrictions, true);
  assert.deepEqual(receipt.equivalenceResidual, [0]);
  assert.notEqual(receipt.originalDomainCondition, "1 ≠ 0");
  assertCoverage(state, "fraction-cancellation");
  const markup = render(state);
  assert.equal(count(markup, /data-viz-name="fraction-step"/gu), 6);
  assert.match(markup, /data-viz-stage="original-domain"/u);
});

test("every cancellation factor renders its own before-factor-after step and preserves all original exclusions", () => {
  const model = buildSymbolicExpressionsModel({
    cancelFactors: [
      [-1, 1],
      [-2, 1],
    ],
    fraction: {
      denominator: [2, -1, -2, 1],
      numerator: [2, -3, 1],
    },
    labId: PEP_POLYNOMIALS,
    mode: "fraction-simplify",
  });
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "fraction-cancellation");
  if (receipt.status !== "supported" || receipt.kind !== "fraction-cancellation") return;
  const detailed = receipt as typeof receipt & {
    cancellationSteps: Array<{
      afterDenominator: string;
      afterNumerator: string;
      beforeDenominator: string;
      beforeNumerator: string;
      factor: string;
      index: number;
    }>;
  };
  assert.deepEqual(
    detailed.cancellationSteps.map(({ factor }) => factor),
    ["x - 1", "x - 2"],
  );
  assert.deepEqual(detailed.originalRationalExclusions, ["-1", "1", "2"]);
  assert.equal(detailed.cancellationSteps[0]!.afterNumerator, detailed.cancellationSteps[1]!.beforeNumerator);
  assert.equal(detailed.cancellationSteps[0]!.afterDenominator, detailed.cancellationSteps[1]!.beforeDenominator);
  const markup = renderModel(model);
  assert.equal(count(markup, /data-viz-cancellation-index="0"/gu), 5);
  assert.equal(count(markup, /data-viz-cancellation-index="1"/gu), 5);
  assert.match(markup, />x - 1</u);
  assert.match(markup, />x - 2</u);
});

test("equation balance exposes original sides, cross-polynomial step, exact solution, candidate residual, and exclusions", () => {
  const state = createSymbolicExpressionsControlDomainState(BNU_FRACTIONS);
  const model = modelFor(state);
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "equation-balance");
  if (receipt.status !== "supported" || receipt.kind !== "equation-balance") return;
  assert.match(receipt.originalEquation, /=/u);
  assert.deepEqual(receipt.crossResidualCoefficients, [3, -1]);
  assert.equal(receipt.solution, "3");
  assert.equal(receipt.solutionResidual, "0");
  assert.equal(receipt.candidate?.value, "3");
  assert.equal(receipt.candidate?.residual, "0");
  assert.equal(receipt.candidate?.isSolution, true);
  assert.deepEqual(receipt.rationalExclusions, ["1"]);
  assertCoverage(state, "equation-balance");
  const markup = render(state);
  assert.match(markup, /data-viz-name="equation-balance-beam"/u);
  assert.match(markup, /data-viz-stage="candidate-residual"/u);
});

test("fractional solve renders both original denominator conditions and zero, one, or multiple exact exclusions", () => {
  const cases = [
    {
      exclusions: [] as string[],
      input: {
        candidate: { denominator: 1, numerator: 3 },
        equation: {
          left: { denominator: [1], numerator: [1, 2] },
          right: { denominator: [1], numerator: [7] },
        },
        labId: "pep-junior-s1-upper-expressions-linear-equations" as const,
        mode: "solve" as const,
      },
      kind: "linear" as const,
    },
    {
      exclusions: ["1"],
      input: {
        candidate: { denominator: 1, numerator: 3 },
        equation: {
          left: { denominator: [-1, 1], numerator: [2] },
          right: { denominator: [1], numerator: [1] },
        },
        labId: BNU_FRACTIONS,
        mode: "solve" as const,
      },
      kind: "fractional-linear" as const,
    },
    {
      exclusions: ["-1", "1"],
      input: {
        candidate: { denominator: 1, numerator: -3 },
        equation: {
          left: { denominator: [-1, 1], numerator: [2] },
          right: { denominator: [1, 1], numerator: [1] },
        },
        labId: BNU_FRACTIONS,
        mode: "solve" as const,
      },
      kind: "fractional-linear" as const,
    },
  ];
  for (const { exclusions, input, kind } of cases) {
    const model = buildSymbolicExpressionsModel(input);
    const receipt = buildSymbolicExpressionsVisualReceipt(model);
    assert.equal(receipt.status, "supported");
    assert.equal(receipt.kind, "equation-balance");
    if (receipt.status !== "supported" || receipt.kind !== "equation-balance") continue;
    const detailed = receipt as typeof receipt & {
      equationKind: "fractional-linear" | "linear";
      leftDomainCondition: string | null;
      rightDomainCondition: string | null;
    };
    assert.equal(detailed.equationKind, kind);
    assert.deepEqual(detailed.rationalExclusions, exclusions);
    assert.equal(detailed.leftDomainCondition === null, kind === "linear");
    assert.equal(detailed.rightDomainCondition === null, kind === "linear");
    const markup = renderModel(model);
    assert.equal(
      count(markup, /data-viz-stage="left-domain"/gu),
      kind === "linear" ? 0 : 1,
    );
    assert.equal(
      count(markup, /data-viz-stage="right-domain"/gu),
      kind === "linear" ? 0 : 1,
    );
    assert.equal(
      count(markup, /data-viz-stage="excluded-value"/gu),
      exclusions.length,
    );
    for (const exclusion of exclusions) {
      assert.match(markup, new RegExp(`>x ≠ ${exclusion}<`, "u"));
    }
  }
});

test("fractional solve stages preserve structural identities with and without an optional candidate", () => {
  const base = {
    equation: {
      left: { denominator: [-1, 1], numerator: [2] },
      right: { denominator: [1], numerator: [1] },
    },
    labId: BNU_FRACTIONS,
    mode: "solve" as const,
  };
  const absent = buildSymbolicExpressionsVisualReceipt(
    buildSymbolicExpressionsModel(base),
  );
  assert.equal(absent.status, "supported");
  assert.equal(absent.kind, "equation-balance");
  if (absent.status !== "supported" || absent.kind !== "equation-balance") return;
  assert.equal(absent.candidate, null);
  const absentStages = new Map(absent.marks.map((mark) => [mark.stage, mark.exact]));
  assert.equal(absentStages.has("candidate-residual"), false);
  assert.equal(absentStages.get("left-domain"), "x - 1 ≠ 0");
  assert.equal(absentStages.get("right-domain"), "1 ≠ 0");
  assert.equal(absentStages.get("excluded-value"), "x ≠ 1");
  assert.deepEqual(
    absent.marks.map(({ stage }) => stage),
    [
      "left-side",
      "right-side",
      "left-cross-product",
      "right-cross-product",
      "solution",
      "left-domain",
      "right-domain",
      "excluded-value",
    ],
  );
  const absentMarkup = renderModel(buildSymbolicExpressionsModel(base));
  assert.equal(count(absentMarkup, /data-viz-stage="candidate-residual"/gu), 0);
  assert.equal(count(absentMarkup, /data-viz-stage="left-domain"/gu), 1);
  assert.equal(count(absentMarkup, /data-viz-stage="right-domain"/gu), 1);
  assert.equal(count(absentMarkup, /data-viz-stage="excluded-value"/gu), 1);

  const presentModel = buildSymbolicExpressionsModel({
    ...base,
    candidate: { denominator: 1, numerator: 3 },
  });
  const present = buildSymbolicExpressionsVisualReceipt(presentModel);
  assert.equal(present.status, "supported");
  assert.equal(present.kind, "equation-balance");
  if (present.status !== "supported" || present.kind !== "equation-balance") return;
  const presentStages = new Map(present.marks.map((mark) => [mark.stage, mark.exact]));
  assert.equal(presentStages.get("candidate-residual"), "0");
  assert.equal(presentStages.get("left-domain"), "x - 1 ≠ 0");
  assert.equal(presentStages.get("right-domain"), "1 ≠ 0");
  assert.equal(presentStages.get("excluded-value"), "x ≠ 1");
});

test("candidate residual geometry is horizontal only for zero and tilts from exact left/right values otherwise", () => {
  const model = buildSymbolicExpressionsModel({
    candidate: { denominator: 1, numerator: 4 },
    equation: {
      left: { denominator: [-1, 1], numerator: [2] },
      right: { denominator: [1], numerator: [1] },
    },
    labId: BNU_FRACTIONS,
    mode: "solve",
  });
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  assert.equal(receipt.status, "supported");
  assert.equal(receipt.kind, "equation-balance");
  if (receipt.status !== "supported" || receipt.kind !== "equation-balance") return;
  const balance = (receipt as typeof receipt & {
    balance: {
      beam: { leftY: number; rightY: number };
      leftValue: string;
      residual: string;
      rightValue: string;
      status: "balanced" | "unbalanced";
    };
  }).balance;
  assert.equal(balance.status, "unbalanced");
  assert.equal(balance.residual, "-1/3");
  assert.equal(balance.leftValue, "2/3");
  assert.equal(balance.rightValue, "1");
  assert.notEqual(balance.beam.leftY, balance.beam.rightY);
  const markup = renderModel(model);
  assert.match(markup, /data-viz-balance-status="unbalanced"/u);
  assert.match(markup, /data-viz-balance-left-value="2\/3"/u);
  assert.match(markup, /data-viz-balance-right-value="1"/u);
  assert.doesNotMatch(markup, /data-viz-name="equation-balance-beam" d="M 95 103 H 625"/u);
});

test("all seven supported work surfaces have nonzero independent owner and geometry coverage", () => {
  const cases = [
    [createSymbolicExpressionsControlDomainState(BNU_EXPRESSIONS), "collect-like-terms"],
    [stateFor(HJB_POLYNOMIALS, "add"), "binary-polynomial"],
    [stateFor(PEP_POLYNOMIALS, "expand"), "area-expansion"],
    [stateFor(PEP_POLYNOMIALS, "factor"), "area-factorization"],
    [createSymbolicExpressionsControlDomainState(HJB_SIMPLE), "substitution-flow"],
    [stateFor(PEP_POLYNOMIALS, "fraction-simplify"), "fraction-cancellation"],
    [createSymbolicExpressionsControlDomainState(BNU_FRACTIONS), "equation-balance"],
  ] as const;
  for (const [state, kind] of cases) assertCoverage(state, kind);
});

test("visual copy is complete in three languages and student text hides implementation contracts", () => {
  for (const [key, value] of Object.entries(SYMBOLIC_EXPRESSIONS_VISUAL_COPY)) {
    assert.ok(value, key);
    assert.equal(typeof value.en, "string", `${key}.en`);
    assert.equal(typeof value.zh, "string", `${key}.zh`);
    assert.equal(typeof value.zhHans, "string", `${key}.zhHans`);
    assert.match(value.zh, /[\u3400-\u9fff]/u, `${key}.zh`);
    assert.match(value.zhHans!, /[\u3400-\u9fff]/u, `${key}.zhHans`);
  }
  const markup = render(createSymbolicExpressionsControlDomainState(BNU_FRACTIONS));
  const visible = markup.replace(/<[^>]*>/gu, " ");
  assert.doesNotMatch(
    visible,
    /symbolic-transform-suite-v1|symbolic-expressions-scenarios-v1|algebraic-fraction-domain|polynomial-visible-tiles/u,
  );
});

test("learner-visible SVG stage labels are localized and never expose internal stage or status IDs", () => {
  const collect = buildSymbolicExpressionsModel({
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [
      { coefficient: 2, degree: 1 },
      { coefficient: -1, degree: 1 },
    ],
  });
  const binary = modelFor(stateFor(HJB_POLYNOMIALS, "subtract"));
  const expected = {
    en: [
      "Original terms",
      "Combined expression",
      "First expression",
      "Second expression",
      "Operation-adjusted expression",
    ],
    zh: ["原來的項", "合併後的式", "第一個式", "第二個式", "按運算調整後的式"],
    zhHans: ["原来的项", "合并后的式", "第一个式", "第二个式", "按运算调整后的式"],
  } as const;
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY, {
    left: { en: expected.en[2], zh: expected.zh[2], zhHans: expected.zhHans[2] },
    result: { en: expected.en[1], zh: expected.zh[1], zhHans: expected.zhHans[1] },
    right: { en: expected.en[3], zh: expected.zh[3], zhHans: expected.zhHans[3] },
    "signed-right": { en: expected.en[4], zh: expected.zh[4], zhHans: expected.zhHans[4] },
    source: { en: expected.en[0], zh: expected.zh[0], zhHans: expected.zhHans[0] },
  });
  const internalStageOrStatus =
    /\b(?:source|result|left|right|product|contribution|sum|supported|unsupported)\b|signed-right|candidate-residual|left-domain|right-domain|excluded-value|original-domain|not-applicable|symbolic-expressions/u;
  for (const locale of ["en", "zh", "zhHans"] as const) {
    const markup = `${renderModelInLocale(collect, locale)}${renderModelInLocale(binary, locale)}`;
    const visible = markup.replace(/<[^>]*>/gu, " ");
    for (const label of expected[locale]) assert.match(visible, new RegExp(label, "u"));
    assert.doesNotMatch(visible, internalStageOrStatus, locale);
  }

  const allModels = [
    collect,
    binary,
    modelFor(stateFor(PEP_POLYNOMIALS, "expand")),
    modelFor(stateFor(PEP_POLYNOMIALS, "factor")),
    modelFor(createSymbolicExpressionsControlDomainState(HJB_SIMPLE)),
    modelFor(stateFor(PEP_POLYNOMIALS, "fraction-simplify")),
    modelFor(createSymbolicExpressionsControlDomainState(BNU_FRACTIONS)),
  ];
  for (const model of allModels) {
    const receipt = buildSymbolicExpressionsVisualReceipt(model);
    assert.equal(receipt.status, "supported");
    if (receipt.status !== "supported") continue;
    const internalIds = new Set([
      receipt.kind,
      receipt.status,
      ...receipt.marks.flatMap(({ name, owner, stage }) => [name, owner, stage]),
      "symbolic-transform-suite-v1",
      "symbolic-expressions-scenarios-v1",
      "not-applicable",
    ]);
    for (const locale of ["en", "zh", "zhHans"] as const) {
      const svg = renderModelInLocale(model, locale).match(/<svg\b[\s\S]*?<\/svg>/u)?.[0];
      assert.ok(svg, `${model.labId}:${model.mode}:${locale}`);
      const renderedTextNodes = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gu)]
        .map(([, text]) => text!.replace(/<[^>]*>/gu, " ").trim())
        .filter(Boolean);
      for (const internalId of internalIds) {
        assert.equal(
          renderedTextNodes.includes(internalId),
          false,
          `${model.labId}:${model.mode}:${locale}:${internalId}`,
        );
      }
    }
  }
});
