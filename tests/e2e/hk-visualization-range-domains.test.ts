import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHkVisualizationRangeBoundaryEvidence,
  getHkDedicatedDynamicRangeDomain,
  getHkDedicatedDynamicRangeDomainForLab,
  HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS,
  HK_DEDICATED_DYNAMIC_RANGE_DOMAINS,
  type HkDedicatedDynamicRangeDomainId,
  type HkVisualizationRangeDomainDescriptor,
  type HkVisualizationRangeDomainState
} from "./hk-visualization-range-domains";
import { buildHkVisualizationRangeStatePlan } from "./hk-visualization-range-state-ledger";

const descriptor = (
  controlId: string,
  minimum: number,
  maximum: number,
  step: number,
  initial: number
) => Object.freeze({ controlId, initial, maximum, minimum, step } satisfies HkVisualizationRangeDomainDescriptor);

const fixtures = Object.freeze({
  "number-bond-v1": {
    labId: "p1-counting-number-bonds", modeId: "whole",
    descriptors: [descriptor("total", 0, 20, 1, 12), descriptor("knownPart", 0, 12, 1, 7)]
  },
  "bounded-step-v1": {
    labId: "p1-addition-subtraction", modeId: "add",
    descriptors: [descriptor("start", 0, 20, 1, 6), descriptor("step", 0, 14, 1, 5)]
  },
  "payment-at-least-price-v1": {
    labId: "p2-money-time", modeId: "money",
    descriptors: [descriptor("price", 1, 99, 1, 32), descriptor("payment", 32, 100, 1, 50)]
  },
  "divisor-within-number-v1": {
    labId: "p4-large-numbers", modeId: "factor-pairs",
    descriptors: [descriptor("firstNumber", 1, 60, 1, 24), descriptor("candidateDivisor", 1, 24, 1, 6)]
  },
  "proper-fractions-v1": {
    labId: "p5-fractions-operations", modeId: "three",
    descriptors: [
      descriptor("firstNumerator", 0, 1, 1, 1), descriptor("firstDenominator", 2, 6, 1, 2),
      descriptor("secondNumerator", 0, 2, 1, 1), descriptor("secondDenominator", 2, 6, 1, 3),
      descriptor("thirdNumerator", 0, 3, 1, 1), descriptor("thirdDenominator", 2, 6, 1, 4)
    ]
  },
  "visible-layers-v1": {
    labId: "p5-volume", modeId: "volume",
    descriptors: [descriptor("height", 1, 4, 1, 3), descriptor("visibleLayers", 1, 3, 1, 2)]
  },
  "triangle-validity-v1": {
    labId: "angles", modeId: "triangle",
    descriptors: [
      descriptor("ax", -8, 8, 0.25, -4), descriptor("ay", -5, 5, 0.25, -2),
      descriptor("bx", -8, 8, 0.25, 4), descriptor("by", -5, 5, 0.25, -2),
      descriptor("cx", -8, 8, 0.25, 1), descriptor("cy", -5, 5, 0.25, 3)
    ]
  },
  "nonzero-quadratic-a-v1": {
    labId: "quadratic-patterns", modeId: "graph",
    descriptors: [
      descriptor("a", -3, 3, 0.25, 1), descriptor("b", -6, 6, 0.5, -2), descriptor("c", -6, 6, 0.5, -3)
    ]
  },
  "identity-positive-a-gt-b-v1": {
    labId: "identities-square-patterns", modeId: "square-sum",
    descriptors: [descriptor("a", 2, 10, 1, 6), descriptor("b", 1, 9, 1, 2)]
  }
} satisfies Readonly<Record<HkDedicatedDynamicRangeDomainId, {
  descriptors: readonly HkVisualizationRangeDomainDescriptor[];
  labId: string;
  modeId: string;
}>>);

function assertIndependentTriangleGeometry(
  state: HkVisualizationRangeDomainState,
  context: string
) {
  const vertices = [
    { x: state.ax, y: state.ay },
    { x: state.bx, y: state.by },
    { x: state.cx, y: state.cy }
  ];
  const area = Math.abs(
    (state.bx - state.ax) * (state.cy - state.ay)
      - (state.by - state.ay) * (state.cx - state.ax)
  ) / 2;
  const minimumSide = Math.min(
    Math.hypot(state.ax - state.bx, state.ay - state.by),
    Math.hypot(state.bx - state.cx, state.by - state.cy),
    Math.hypot(state.cx - state.ax, state.cy - state.ay)
  );
  const angles = vertices.map((vertex, index) => {
    const first = vertices[(index + 1) % vertices.length];
    const second = vertices[(index + 2) % vertices.length];
    const firstVector = { x: first.x - vertex.x, y: first.y - vertex.y };
    const secondVector = { x: second.x - vertex.x, y: second.y - vertex.y };
    const denominator = Math.hypot(firstVector.x, firstVector.y)
      * Math.hypot(secondVector.x, secondVector.y);
    const cosine = (
      firstVector.x * secondVector.x + firstVector.y * secondVector.y
    ) / denominator;
    return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
  });

  assert.ok(Number.isFinite(area) && area >= 0.25, `${context}: area must be at least 0.25.`);
  assert.ok(
    Number.isFinite(minimumSide) && minimumSide >= 2.5,
    `${context}: minimum side must be at least 2.5.`
  );
  for (const [index, angle] of angles.entries()) {
    assert.ok(Number.isFinite(angle), `${context}: angle ${index} must be finite.`);
    assert.ok(angle > 0 && angle < 180, `${context}: angle ${index} must be strictly interior.`);
  }
  assert.ok(
    Math.abs(angles.reduce((sum, angle) => sum + angle, 0) - 180) <= 1e-8,
    `${context}: angles must sum to 180 degrees.`
  );
}

test("registry is an exact nine-domain one-to-one lab mapping with explicit edges and inverse affectedBy", () => {
  assert.equal(HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS.length, 9);
  assert.equal(new Set(HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS).size, 9);
  assert.equal(new Set(Object.values(HK_DEDICATED_DYNAMIC_RANGE_DOMAINS).map(({ labId }) => labId)).size, 9);
  for (const domainId of HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS) {
    const contract = getHkDedicatedDynamicRangeDomain(domainId, fixtures[domainId].labId);
    assert.equal(getHkDedicatedDynamicRangeDomainForLab(contract.labId), contract);
    assert.ok(contract.edges.length > 0);
    for (const edge of contract.edges) {
      assert.ok(edge.sourceControlId.length > 0);
      assert.ok(edge.affectedControlIds.length > 0);
      assert.ok(edge.reason.length > 0);
      for (const affectedControlId of edge.affectedControlIds) {
        assert.ok(contract.affectedBy[affectedControlId]?.includes(edge.sourceControlId));
      }
    }
  }
  assert.throws(
    () => getHkDedicatedDynamicRangeDomain("number-bond-v1", "wrong-lab"),
    /belongs to/
  );
});

test("all exact production boundaries canonicalize to valid states with no missing domain evidence", () => {
  for (const domainId of HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS) {
    const fixture = fixtures[domainId];
    const boundaries = buildHkVisualizationRangeBoundaryEvidence({ domainId, ...fixture });
    assert.ok(boundaries.length > 0, `${domainId} must declare exact reachable boundaries`);
    assert.equal(new Set(boundaries.map(({ boundaryId }) => boundaryId)).size, boundaries.length);
    assert.ok(boundaries.every(({ valid }) => valid), `${domainId} returned an invalid boundary`);
    const contract = getHkDedicatedDynamicRangeDomain(domainId, fixture.labId);
    assert.ok(boundaries.every(({ canonicalState }) => contract.isValid(canonicalState, fixture.modeId)));
  }
});

test("one-way primary domains project only their declared dependent and expose expanded live boundaries", () => {
  const cases = [
    ["number-bond-v1", "maximum-whole-all-known", { total: 20, knownPart: 20 }],
    ["payment-at-least-price-v1", "minimum-price-exact-payment", { price: 1, payment: 1 }],
    ["divisor-within-number-v1", "maximum-number-self-divisor", { firstNumber: 60, candidateDivisor: 60 }],
    ["visible-layers-v1", "maximum-height-all-layers", { height: 4, visibleLayers: 4 }]
  ] as const;
  for (const [domainId, boundaryId, expected] of cases) {
    const fixture = fixtures[domainId];
    const boundary = buildHkVisualizationRangeBoundaryEvidence({ domainId, ...fixture })
      .find((item) => item.boundaryId === boundaryId);
    assert.deepEqual(boundary?.canonicalState, expected);
  }
});

test("bounded-step respects add and subtract mode-specific domains including hidden zero-step endpoints", () => {
  const fixture = fixtures["bounded-step-v1"];
  const add = buildHkVisualizationRangeBoundaryEvidence({ domainId: "bounded-step-v1", ...fixture });
  const subtract = buildHkVisualizationRangeBoundaryEvidence({
    domainId: "bounded-step-v1", ...fixture, modeId: "subtract"
  });
  assert.deepEqual(add.find(({ boundaryId }) => boundaryId === "zero-start-maximum-step")?.canonicalState, {
    start: 0, step: 20
  });
  assert.deepEqual(subtract.find(({ boundaryId }) => boundaryId === "zero-start-zero-step")?.canonicalState, {
    start: 0, step: 0
  });
  assert.deepEqual(subtract.find(({ boundaryId }) => boundaryId === "maximum-start-maximum-step")?.canonicalState, {
    start: 20, step: 20
  });
});

test("proper-fraction domains cover every visible numerator/denominator pair at true dynamic maxima", () => {
  const fixture = fixtures["proper-fractions-v1"];
  const boundaries = buildHkVisualizationRangeBoundaryEvidence({
    domainId: "proper-fractions-v1", ...fixture
  });
  assert.equal(boundaries.length, 4 ** 3);
  const allHigh = boundaries.find(({ boundaryId }) => (
    ["first", "second", "third"].every((prefix) => boundaryId.includes(`${prefix}Denominator-maximum-proper-maximum`))
  ));
  assert.ok(allHigh);
  for (const prefix of ["first", "second", "third"] as const) {
    assert.equal(allHigh.canonicalState[`${prefix}Denominator`], 6);
    assert.equal(allHigh.canonicalState[`${prefix}Numerator`], 5);
  }
});

test("descriptorFor exposes exact live bounds, fixed visibility, steps, and excluded values", () => {
  const numberBond = getHkDedicatedDynamicRangeDomain("number-bond-v1", "p1-counting-number-bonds");
  assert.deepEqual(numberBond.descriptorFor(
    { total: 0, knownPart: 0 },
    "whole",
    fixtures["number-bond-v1"].descriptors[1]
  ), {
    controlId: "knownPart", domainId: "number-bond-v1", enabled: false, excludedValues: [], maximum: 0, minimum: 0, step: 1, visibility: "fixed"
  });

  const payment = getHkDedicatedDynamicRangeDomain("payment-at-least-price-v1", "p2-money-time");
  assert.equal(payment.descriptorFor(
    { price: 99, payment: 99 },
    "money",
    fixtures["payment-at-least-price-v1"].descriptors[1]
  ).minimum, 99);
  assert.equal(payment.descriptorFor(
    { price: 99, payment: 99 },
    "money",
    fixtures["payment-at-least-price-v1"].descriptors[1]
  ).enabled, true);

  const quadratic = getHkDedicatedDynamicRangeDomain("nonzero-quadratic-a-v1", "quadratic-patterns");
  assert.deepEqual(quadratic.descriptorFor(
    { a: 1, b: -2, c: -3 },
    "graph",
    fixtures["nonzero-quadratic-a-v1"].descriptors[0]
  ).excludedValues, [0]);
});

test("triangle endpoint requests preserve the exact area and minimum-side production invariant", () => {
  const fixture = fixtures["triangle-validity-v1"];
  const boundaries = buildHkVisualizationRangeBoundaryEvidence({
    domainId: "triangle-validity-v1", ...fixture
  });
  assert.equal(boundaries.length, 14);
  assert.ok(boundaries.some(({ projections }) => projections.length > 0));
  for (const { canonicalState } of boundaries) {
    assertIndependentTriangleGeometry(canonicalState, "triangle boundary");
  }

  const chainedBoundary = boundaries.find(({ boundaryId }) => (
    boundaryId === "chained-collinear-endpoint-regression"
  ));
  assert.deepEqual(chainedBoundary?.startingState, {
    ax: -8, ay: -2, bx: -8, by: 0.5, cx: 1, cy: 0
  });
  assert.deepEqual(chainedBoundary?.requestedState, { cx: -8 });
  assert.equal(chainedBoundary?.canonicalState.cx, -8);

  const executablePlan = buildHkVisualizationRangeStatePlan(
    fixture.modeId,
    fixture.descriptors,
    { domainId: "triangle-validity-v1", labId: fixture.labId }
  );
  assert.equal(executablePlan.length, 97);
  const chainedEntry = executablePlan.find(({ boundaryIds }) => (
    boundaryIds.includes("chained-collinear-endpoint-regression")
  ));
  assert.equal(chainedEntry?.startingSignature, "ax=-8|ay=-2|bx=-8|by=0.5|cx=1|cy=0");
  assert.equal(chainedEntry?.actionSignature, "cx=-8");
  assert.equal(chainedEntry?.expectedSignature, "ax=-8|ay=-5|bx=8|by=-5|cx=-8|cy=5");
});

test("triangle oracle independently rejects degenerate geometry after every production regression request", () => {
  const fixture = fixtures["triangle-validity-v1"];
  const contract = getHkDedicatedDynamicRangeDomain("triangle-validity-v1", fixture.labId);
  const ranges = new Map(fixture.descriptors.map((range) => [range.controlId, range]));
  const requests = [
    ["ax", -8],
    ["bx", -8],
    ["cy", 0],
    ["cx", -8]
  ] as const;
  let state: HkVisualizationRangeDomainState = Object.freeze({
    ax: -4, ay: -2, bx: 4, by: -2, cx: 1, cy: 3
  });

  for (const [index, [controlId, requestedValue]] of requests.entries()) {
    const canonical = contract.canonicalize({
      currentState: state,
      descriptors: fixture.descriptors,
      modeId: fixture.modeId,
      requestedState: { [controlId]: requestedValue }
    });
    assert.ok(canonical.valid, `regression step ${index + 1} must canonicalize to a valid state.`);
    assert.equal(
      canonical.canonicalState[controlId],
      requestedValue,
      `regression step ${index + 1} must preserve requested ${controlId}.`
    );
    for (const [coordinateId, value] of Object.entries(canonical.canonicalState)) {
      const range = ranges.get(coordinateId);
      assert.ok(range, `regression step ${index + 1} returned undeclared ${coordinateId}.`);
      assert.ok(Number.isFinite(value), `regression step ${index + 1} ${coordinateId} must be finite.`);
      assert.ok(value >= range.minimum && value <= range.maximum);
      assert.ok(
        Math.abs((value - range.minimum) / range.step - Math.round((value - range.minimum) / range.step)) <= 1e-9,
        `regression step ${index + 1} ${coordinateId} must remain on its declared grid.`
      );
    }
    assertIndependentTriangleGeometry(
      canonical.canonicalState,
      `regression step ${index + 1}: ${controlId}=${requestedValue}`
    );
    state = canonical.canonicalState;
  }
});

test("quadratic zero and identity ordering requests retain explicit projection evidence", () => {
  const quadratic = buildHkVisualizationRangeBoundaryEvidence({
    domainId: "nonzero-quadratic-a-v1", ...fixtures["nonzero-quadratic-a-v1"]
  });
  assert.equal(quadratic.find(({ boundaryId }) => boundaryId === "zero-request-from-positive")?.canonicalState.a, -0.25);
  assert.equal(quadratic.find(({ boundaryId }) => boundaryId === "zero-request-from-negative")?.canonicalState.a, 0.25);
  assert.ok(quadratic.filter(({ boundaryId }) => boundaryId.startsWith("zero-request")).every(({ projections }) => (
    projections.some(({ projection }) => projection === "exclude-zero")
  )));

  const identities = buildHkVisualizationRangeBoundaryEvidence({
    domainId: "identity-positive-a-gt-b-v1", ...fixtures["identity-positive-a-gt-b-v1"]
  });
  const aProjection = identities.find(({ boundaryId }) => boundaryId === "a-request-projects-b");
  const bProjection = identities.find(({ boundaryId }) => boundaryId === "b-request-projects-a");
  assert.deepEqual(aProjection?.canonicalState, { a: 2, b: 1 });
  assert.deepEqual(bProjection?.canonicalState, { a: 10, b: 9 });
  assert.equal(aProjection?.projections[0]?.declaredControllerId, "a");
  assert.equal(bProjection?.projections[0]?.declaredControllerId, "b");
});

test("mode-inapplicable domains return no boundaries instead of inventing dynamic behavior", () => {
  assert.deepEqual(buildHkVisualizationRangeBoundaryEvidence({
    domainId: "payment-at-least-price-v1",
    ...fixtures["payment-at-least-price-v1"],
    modeId: "time"
  }), []);
  assert.deepEqual(buildHkVisualizationRangeBoundaryEvidence({
    domainId: "divisor-within-number-v1",
    ...fixtures["divisor-within-number-v1"],
    modeId: "common-hcf-lcm"
  }), []);
});
