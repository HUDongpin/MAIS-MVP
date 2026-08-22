import assert from "node:assert/strict";
import test from "node:test";

import {
  chinaVisualizationRangeStateExecutionMismatch,
  chinaVisualizationRangeStateSignaturesMatch,
  independentChinaVisualizationRangeStateExecutionPlan,
  type ChinaVisualizationRangeStateSignatureEntry
} from "./china-visualization-range-state-execution";

const requested: ChinaVisualizationRangeStateSignatureEntry[] = [
  { disabled: false, id: "value", index: 0, max: 10, min: 0, value: 0 },
  { disabled: false, id: "comparison", index: 1, max: 10, min: 0, value: 10 }
];
const independentPlan = independentChinaVisualizationRangeStateExecutionPlan(requested);

test("an exact full-control signature is eligible for a state execution receipt", () => {
  assert.equal(
    chinaVisualizationRangeStateSignaturesMatch(requested, requested.map((entry) => ({ ...entry }))),
    true
  );
  assert.equal(
    chinaVisualizationRangeStateExecutionMismatch(
      '["lab","direct/range-endpoints=value:0,comparison:10"]',
      "before-scan",
      independentPlan,
      requested
    ),
    null
  );
});

test("a dependent second slider clamping the first slider is a RANGE_STATE_EXECUTION mismatch", () => {
  const observed = [
    { ...requested[0], value: 3 },
    { ...requested[1] }
  ];
  const mismatch = chinaVisualizationRangeStateExecutionMismatch(
    '["lab","direct/range-endpoints=value:0,comparison:10"]',
    "before-scan",
    independentPlan,
    observed
  );

  assert.ok(mismatch);
  assert.equal(mismatch.phase, "before-scan");
  assert.deepEqual(mismatch.requested, requested);
  assert.deepEqual(mismatch.expected, requested);
  assert.deepEqual(mismatch.observed, observed);
  assert.equal(chinaVisualizationRangeStateSignaturesMatch(requested, observed), false);
});

test("count, identity, order, disabled-state, and non-finite drift all fail closed", () => {
  assert.equal(chinaVisualizationRangeStateSignaturesMatch(requested, requested.slice(0, 1)), false);
  assert.equal(chinaVisualizationRangeStateSignaturesMatch(requested, [...requested].reverse()), false);
  assert.equal(
    chinaVisualizationRangeStateSignaturesMatch(requested, [
      { ...requested[0], id: "comparison" },
      requested[1]
    ]),
    false
  );
  assert.equal(
    chinaVisualizationRangeStateSignaturesMatch(requested, [
      { ...requested[0], disabled: true },
      requested[1]
    ]),
    false
  );
  assert.equal(
    chinaVisualizationRangeStateSignaturesMatch(requested, [
      { ...requested[0], value: Number.NaN },
      requested[1]
    ]),
    false
  );
});

test("post-scan async drift reports the after-scan phase and cannot be mistaken for pre-scan success", () => {
  const observed = [requested[0], { ...requested[1], value: 9 }];
  const mismatch = chinaVisualizationRangeStateExecutionMismatch(
    '["lab","direct/range-endpoints=value:0,comparison:10"]',
    "after-scan",
    independentPlan,
    observed
  );

  assert.ok(mismatch);
  assert.equal(mismatch.phase, "after-scan");
  assert.equal(mismatch.observed[1].value, 9);
});

test("only an explicit versioned projected domain may distinguish requested from expected", () => {
  const projectedExpected = [
    { ...requested[0], value: 6 },
    requested[1]
  ];
  const projectedPlan = {
    affectedControlIds: ["value"],
    controllerInputs: ["comparison"],
    domainId: "proper-fraction-denominator-controls-numerator",
    domainKind: "projected" as const,
    domainVersion: 1,
    expected: projectedExpected,
    projection: "numerator.max=denominator-1",
    requested
  };

  assert.equal(
    chinaVisualizationRangeStateExecutionMismatch(
      '["lab","dynamic-domain"]',
      "before-scan",
      projectedPlan,
      projectedExpected
    ),
    null
  );
  const undeclared = chinaVisualizationRangeStateExecutionMismatch(
    '["lab","undeclared-clamp"]',
    "before-scan",
    independentPlan,
    projectedExpected
  );
  assert.ok(undeclared);
  assert.equal(undeclared.domainId, "independent-controls");
});
