import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import * as resetLedger from "./hk-visualization-range-state-ledger";
import {
  auditHkVisualizationDependentTransitionSequenceObservation,
  auditHkVisualizationDependentTransitionSequenceReceipt,
  auditHkP6BudgetBoundaryObservation,
  auditHkP6AveragesLineGraphObservation,
  bindHkP6BudgetBoundaryStates,
  bindHkP6AveragesLineGraphBoundaryStates,
  buildHkVisualizationDependentTransitionSequencePlans,
  buildHkVisualizationPassThroughResetActionPlan,
  buildHkVisualizationRangeStatePlan,
  hashHkVisualizationDependentTransitionSequenceObservation,
  hashHkVisualizationDependentTransitionSequencePlan,
  hashHkVisualizationDependentTransitionCanonicalVisibleBaseline,
  auditHkVisualizationPassThroughResetObservation,
  HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS,
  HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_TOPIC_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS,
  hkVisualizationDependentTransitionDeadlineBudgetMs,
  hkVisualizationDependentTransitionSequenceCountForLab,
  sanitizeHkVisualizationDiagnosticText,
  sanitizeHkVisualizationDiagnosticUrl,
  projectExactHkDependentTransitionLiveRangeDescriptors,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_DEADLINE_BUDGET_MS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_EXPECTED_COUNT,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_IDS,
  type HkVisualizationDependentTransitionSequenceObservation,
  type HkVisualizationDependentTransitionSequencePlan,
  type HkP6BudgetBoundaryKind,
  type HkP6BudgetBoundaryObservation,
  type HkP6AveragesLineGraphObservation,
  type HkVisualizationRangeDescriptor,
} from "./hk-visualization-range-state-ledger";
import {
  buildHkFractionBarRangeStatePlan,
  HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS,
  HK_FRACTION_BAR_LAB_ID,
  HK_FRACTION_BAR_MODE_IDS,
  HK_FRACTION_BAR_RANGE_DOMAIN_ID,
} from "./hk-visualization-fraction-range-domain";
import { HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS } from "./hk-visualization-range-domains";

const amount = Object.freeze({
  controlId: "amount",
  initial: 1,
  maximum: 2,
  minimum: 0,
  step: 1,
} satisfies HkVisualizationRangeDescriptor);

const p6AveragesRanges = Object.freeze([
  { controlId: "value1", initial: 4, maximum: 12, minimum: 0, step: 1 },
  { controlId: "value2", initial: 8, maximum: 12, minimum: 0, step: 1 },
  { controlId: "value3", initial: 6, maximum: 12, minimum: 0, step: 1 },
  { controlId: "value4", initial: 10, maximum: 12, minimum: 0, step: 1 },
  { controlId: "seriesBShift", initial: 2, maximum: 2, minimum: 0, step: 1 },
] satisfies readonly HkVisualizationRangeDescriptor[]);

const p6BudgetRanges = Object.freeze([
  { controlId: "budget", initial: 120, maximum: 200, minimum: 50, step: 1 },
  { controlId: "count", initial: 3, maximum: 6, minimum: 1, step: 1 },
  { controlId: "unitPrice", initial: 24, maximum: 40, minimum: 5, step: 1 },
  { controlId: "extraCost", initial: 18, maximum: 50, minimum: 0, step: 1 },
] satisfies readonly HkVisualizationRangeDescriptor[]);

const dependentTransitionCases = Object.freeze([
  {
    descriptors: [
      { controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 },
      { controlId: "knownPart", initial: 7, maximum: 12, minimum: 0, step: 1 },
    ],
    domainId: "number-bond-v1" as const,
    labId: "p1-counting-number-bonds",
    modeId: "__default__",
  },
  {
    descriptors: [
      { controlId: "start", initial: 6, maximum: 20, minimum: 0, step: 1 },
      { controlId: "step", initial: 5, maximum: 14, minimum: 0, step: 1 },
    ],
    domainId: "bounded-step-v1" as const,
    labId: "p1-addition-subtraction",
    modeId: "add",
  },
  {
    descriptors: [
      { controlId: "start", initial: 6, maximum: 20, minimum: 0, step: 1 },
      { controlId: "step", initial: 5, maximum: 6, minimum: 0, step: 1 },
    ],
    domainId: "bounded-step-v1" as const,
    labId: "p1-addition-subtraction",
    modeId: "subtract",
  },
  {
    descriptors: [
      { controlId: "price", initial: 32, maximum: 99, minimum: 1, step: 1 },
      { controlId: "payment", initial: 50, maximum: 100, minimum: 32, step: 1 },
    ],
    domainId: "payment-at-least-price-v1" as const,
    labId: "p2-money-time",
    modeId: "money",
  },
  {
    descriptors: [
      { controlId: "firstNumber", initial: 24, maximum: 60, minimum: 1, step: 1 },
      { controlId: "candidateDivisor", initial: 6, maximum: 24, minimum: 1, step: 1 },
    ],
    domainId: "divisor-within-number-v1" as const,
    labId: "p4-large-numbers",
    modeId: "factor-pairs",
  },
  {
    descriptors: [
      { controlId: "firstNumerator", initial: 1, maximum: 1, minimum: 0, step: 1 },
      { controlId: "firstDenominator", initial: 2, maximum: 6, minimum: 2, step: 1 },
      { controlId: "secondNumerator", initial: 1, maximum: 2, minimum: 0, step: 1 },
      { controlId: "secondDenominator", initial: 3, maximum: 6, minimum: 2, step: 1 },
      { controlId: "thirdNumerator", initial: 1, maximum: 3, minimum: 0, step: 1 },
      { controlId: "thirdDenominator", initial: 4, maximum: 6, minimum: 2, step: 1 },
    ],
    domainId: "proper-fractions-v1" as const,
    labId: "p5-fractions-operations",
    modeId: "three",
  },
  {
    descriptors: [
      { controlId: "length", initial: 4, maximum: 5, minimum: 1, step: 1 },
      { controlId: "width", initial: 3, maximum: 4, minimum: 1, step: 1 },
      { controlId: "height", initial: 3, maximum: 4, minimum: 1, step: 1 },
      { controlId: "visibleLayers", initial: 2, maximum: 3, minimum: 1, step: 1 },
    ],
    domainId: "visible-layers-v1" as const,
    labId: "p5-volume",
    modeId: "__default__",
  },
  {
    descriptors: [
      { controlId: "a", initial: 6, maximum: 10, minimum: 2, step: 1 },
      { controlId: "b", initial: 2, maximum: 9, minimum: 1, step: 1 },
    ],
    domainId: "identity-positive-a-gt-b-v1" as const,
    labId: "identities-square-patterns",
    modeId: "square-sum",
  },
] satisfies readonly Readonly<{
  descriptors: readonly HkVisualizationRangeDescriptor[];
  domainId: Exclude<Parameters<typeof buildHkVisualizationDependentTransitionSequencePlans>[0]["domainId"], "configured-fraction-bar-v1">;
  labId: string;
  modeId: string;
}>[]);

const visible = () => ({
  ariaHiddenAncestor: false,
  hiddenAncestor: false,
  inertAncestor: false,
  visuallyVisible: true,
});

const resetHash = (label: string) => createHash("sha256").update(label).digest("hex");

function resetLayerPair(
  layer: "public" | "raw" | "visible",
  beforeHash: string,
  afterHash: string,
) {
  return {
    afterHash,
    beforeHash,
    layer,
    pairHash: createHash("sha256")
      .update(JSON.stringify({
        afterHash,
        beforeHash,
        contractVersion: "hk-viz-pass-through-reset.v3",
        kind: "pass-through-reset-layer-pair",
        layer,
      }))
      .digest("hex"),
  } as const;
}

function resetLayerPairs(changed: boolean) {
  return ["public", "raw", "visible"].map((layer) => {
    const beforeHash = resetHash(`${layer}:before`);
    const afterHash = changed ? resetHash(`${layer}:after`) : beforeHash;
    return resetLayerPair(
      layer as "public" | "raw" | "visible",
      beforeHash,
      afterHash,
    );
  });
}

function resetV3Metadata(actionKind: "restoring" | "canonical-noop") {
  const canonicalFingerprint = "captured-canonical";
  return {
    afterEndpoint: Object.freeze({ endpoint: "after" }),
    afterFingerprint: canonicalFingerprint,
    beforeEndpoint: Object.freeze({ endpoint: "before" }),
    beforeFingerprint:
      actionKind === "restoring"
        ? "deliberate-noncanonical"
        : canonicalFingerprint,
    canonicalFingerprint,
    layerEndpointHashCount: 6 as const,
    layerPairs: resetLayerPairs(actionKind === "restoring"),
    layerReceiptCount: 3 as const,
  };
}

const exactResetPerturbations = {
  "advanced-functions": {
    beforeState: { comparison: 0, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 0,
  },
  calculus: {
    beforeState: { comparison: 1, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  },
  "data-handling": {
    beforeState: { comparison: 1, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  },
  "differentiation-intro": {
    beforeState: { comparison: 1, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  },
  "p2-multiplication-foundations": {
    beforeState: { comparison: 1, height: 3, mode: 0, value: 4 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  },
  "p3-fractions-intro": {
    beforeState: { comparison: 0, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 0,
  },
  "statistics-s1": {
    beforeState: { comparison: 1, height: 3, mode: 0, value: 5 },
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  },
} as const;

test("pass-through Reset v3 freezes the exact independent comparison perturbation authority", () => {
  assert.deepEqual(
    (resetLedger as any).HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS,
    exactResetPerturbations,
  );
});

test("pass-through Reset v3 plans controlled canonical restoration before perturbing an already-noncanonical state", () => {
  const planner = (resetLedger as any)
    .planHkVisualizationPassThroughResetPrecondition;
  assert.equal(typeof planner, "function");
  assert.deepEqual(
    planner({
      canonicalFingerprint: "captured-canonical",
      currentFingerprint: "unknown-noncanonical",
      labId: "p2-multiplication-foundations",
    }),
    {
      canonicalFingerprint: "captured-canonical",
      expectedBeforeState:
        exactResetPerturbations["p2-multiplication-foundations"].beforeState,
      perturbation:
        exactResetPerturbations["p2-multiplication-foundations"],
      requiresCanonicalRestore: true,
    },
  );
});

test("pass-through Reset v3 rejects wrong perturb selector, target, and exact before tuple", () => {
  const auditor = (resetLedger as any)
    .auditHkVisualizationPassThroughResetPrecondition;
  assert.equal(typeof auditor, "function");
  const authority = exactResetPerturbations["p2-multiplication-foundations"];
  for (const [mutation, pattern] of [
    [{ ...authority, selector: 'input[type="range"]' }, /selector/],
    [{ ...authority, targetValue: 2 }, /target/],
    [{ ...authority, beforeState: { ...authority.beforeState, comparison: 2 } }, /before tuple/],
  ] as const) {
    assert.match(
      auditor("p2-multiplication-foundations", mutation).join(" | "),
      pattern,
    );
  }
});

test("pass-through Reset v3 rejects restoring fingerprint drift and requires exact before/after tuples", () => {
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS["p2-multiplication-foundations"];
  const beforeState = exactResetPerturbations["p2-multiplication-foundations"].beforeState;
  const base = {
    ...resetV3Metadata("restoring"),
    activationKey: "Enter" as const,
    actionKind: "restoring" as const,
    afterFingerprint: "captured-canonical",
    afterState: expected,
    beforeFingerprint: "deliberate-noncanonical",
    beforeState,
    canonicalFingerprint: "captured-canonical",
    expectedState: expected,
    labId: "p2-multiplication-foundations",
    layerPairs: resetLayerPairs(true),
    phase: "reset",
  };
  assert.deepEqual(auditHkVisualizationPassThroughResetObservation(base as any), []);
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      afterFingerprint: "drifted-after",
    } as any).join(" | "),
    /after fingerprint/,
  );
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      beforeFingerprint: "captured-canonical",
    } as any).join(" | "),
    /before fingerprint/,
  );
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      beforeState: { ...beforeState, comparison: 2 },
    } as any).join(" | "),
    /before tuple/,
  );
});

test("pass-through Reset v3 rejects no-op public, raw, or visible endpoint drift", () => {
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS["p2-multiplication-foundations"];
  const base = {
    ...resetV3Metadata("canonical-noop"),
    activationKey: "Space" as const,
    actionKind: "canonical-noop" as const,
    afterFingerprint: "captured-canonical",
    afterState: expected,
    beforeFingerprint: "captured-canonical",
    beforeState: expected,
    canonicalFingerprint: "captured-canonical",
    expectedState: expected,
    labId: "p2-multiplication-foundations",
    layerPairs: resetLayerPairs(false),
    phase: "reset-space-idempotent",
  };
  assert.deepEqual(auditHkVisualizationPassThroughResetObservation(base as any), []);
  for (const layer of ["public", "raw", "visible"] as const) {
    const layerPairs = resetLayerPairs(false).map((pair) =>
      pair.layer === layer
        ? resetLayerPair(layer, pair.beforeHash, resetHash(`${layer}:drift`))
        : pair,
    );
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...base,
        layerPairs,
      } as any).join(" | "),
      new RegExp(`${layer}.*no-op|no-op.*${layer}`),
    );
  }
});

function fullResetV3RestoringObservation() {
  const labId = "p2-multiplication-foundations" as const;
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  return {
    ...resetV3Metadata("restoring"),
    activationKey: "Enter" as const,
    actionKind: "restoring" as const,
    afterState: expected,
    beforeState: exactResetPerturbations[labId].beforeState,
    expectedState: expected,
    labId,
    phase: "reset",
  };
}

function withoutResetV3Field(
  field: "afterEndpoint" | "beforeEndpoint" | "layerEndpointHashCount" | "layerReceiptCount",
) {
  const observation: Record<string, unknown> = {
    ...fullResetV3RestoringObservation(),
  };
  delete observation[field];
  return observation;
}

for (const endpoint of ["beforeEndpoint", "afterEndpoint"] as const) {
  test(`pass-through Reset v3 rejects missing ${endpoint}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation(
        withoutResetV3Field(endpoint) as any,
      ).join(" | "),
      new RegExp(`${endpoint.replace("Endpoint", " endpoint")}.*plain object`, "i"),
    );
  });

  test(`pass-through Reset v3 rejects null ${endpoint}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...fullResetV3RestoringObservation(),
        [endpoint]: null,
      } as any).join(" | "),
      new RegExp(`${endpoint.replace("Endpoint", " endpoint")}.*plain object`, "i"),
    );
  });

  test(`pass-through Reset v3 rejects non-object ${endpoint}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...fullResetV3RestoringObservation(),
        [endpoint]: "not-an-endpoint",
      } as any).join(" | "),
      new RegExp(`${endpoint.replace("Endpoint", " endpoint")}.*plain object`, "i"),
    );
  });

  test(`pass-through Reset v3 rejects array ${endpoint}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...fullResetV3RestoringObservation(),
        [endpoint]: [],
      } as any).join(" | "),
      new RegExp(`${endpoint.replace("Endpoint", " endpoint")}.*plain object`, "i"),
    );
  });
}

for (const [countField, expectedCount] of [
  ["layerReceiptCount", 3],
  ["layerEndpointHashCount", 6],
] as const) {
  test(`pass-through Reset v3 rejects missing ${countField}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation(
        withoutResetV3Field(countField) as any,
      ).join(" | "),
      new RegExp(`${countField}.*${expectedCount}`, "i"),
    );
  });

  test(`pass-through Reset v3 rejects wrong ${countField}`, () => {
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...fullResetV3RestoringObservation(),
        [countField]: expectedCount - 1,
      } as any).join(" | "),
      new RegExp(`${countField}.*${expectedCount}`, "i"),
    );
  });
}

test("pass-through Reset v3 rejects missing, duplicate, reordered, endpoint-hash, and pair-hash drift", () => {
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS["p2-multiplication-foundations"];
  const beforeState = exactResetPerturbations["p2-multiplication-foundations"].beforeState;
  const base = {
    ...resetV3Metadata("restoring"),
    activationKey: "Space" as const,
    actionKind: "restoring" as const,
    afterFingerprint: "captured-canonical",
    afterState: expected,
    beforeFingerprint: "deliberate-noncanonical",
    beforeState,
    canonicalFingerprint: "captured-canonical",
    expectedState: expected,
    labId: "p2-multiplication-foundations",
    layerPairs: resetLayerPairs(true),
    phase: "reset-space",
  };
  const cases = [
    [base.layerPairs.slice(0, 2), /exact three|missing/],
    [[base.layerPairs[0], base.layerPairs[0], base.layerPairs[2]], /duplicate|order/],
    [[base.layerPairs[1], base.layerPairs[0], base.layerPairs[2]], /order/],
    [[{ ...base.layerPairs[0], beforeHash: "bad" }, ...base.layerPairs.slice(1)], /endpoint hash/],
    [[{ ...base.layerPairs[0], pairHash: resetHash("bad-pair") }, ...base.layerPairs.slice(1)], /pair hash/],
  ] as const;
  for (const [layerPairs, pattern] of cases) {
    assert.match(
      auditHkVisualizationPassThroughResetObservation({
        ...base,
        layerPairs,
      } as any).join(" | "),
      pattern,
    );
  }
});

test("pass-through Reset v3 independently plans exact topic-aware Enter/Space restoration followed by R(R(s)) canonical no-op", () => {
  assert.equal(
    Object.keys(HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS).length,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_TOPIC_COUNT,
  );
  assert.deepEqual(HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS, {
    "advanced-functions": { comparison: 5, height: 3, mode: 0, value: 5 },
    calculus: { comparison: 4, height: 3, mode: 0, value: 5 },
    "data-handling": { comparison: 2, height: 3, mode: 0, value: 5 },
    "differentiation-intro": { comparison: 4, height: 3, mode: 0, value: 5 },
    "p2-multiplication-foundations": { comparison: 5, height: 3, mode: 0, value: 4 },
    "p3-fractions-intro": { comparison: 4, height: 3, mode: 0, value: 5 },
    "statistics-s1": { comparison: 2, height: 3, mode: 0, value: 5 },
  });

  for (const [labId, expected] of Object.entries(
    HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS,
  )) {
    const actions = buildHkVisualizationPassThroughResetActionPlan(labId);
    assert.equal(actions.length, HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_COUNT);
    assert.deepEqual(
      actions.map(({ activationKey, actionKind, phase }) => ({
        activationKey,
        actionKind,
        phase,
      })),
      [
        { activationKey: "Enter", actionKind: "restoring", phase: "reset" },
        { activationKey: "Space", actionKind: "restoring", phase: "reset-space" },
        {
          activationKey: "Space",
          actionKind: "canonical-noop",
          phase: "reset-space-idempotent",
        },
      ],
    );
    assert.deepEqual(
      actions.map(({ actionKind }) => actionKind),
      [
        HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS[0],
        HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS[0],
        HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS[1],
      ],
    );
    for (const action of actions) assert.deepEqual(action.expectedState, expected);

    const nonCanonical = exactResetPerturbations[
      labId as keyof typeof exactResetPerturbations
    ].beforeState;
    assert.deepEqual(
      auditHkVisualizationPassThroughResetObservation({
        ...resetV3Metadata("restoring"),
        activationKey: "Enter",
        actionKind: "restoring",
        afterState: expected,
        beforeState: nonCanonical,
        expectedState: expected,
        labId,
        phase: "reset",
      }),
      [],
    );
    assert.deepEqual(
      auditHkVisualizationPassThroughResetObservation({
        ...resetV3Metadata("canonical-noop"),
        activationKey: "Space",
        actionKind: "canonical-noop",
        afterState: expected,
        beforeState: expected,
        expectedState: expected,
        labId,
        phase: "reset-space-idempotent",
      }),
      [],
    );
  }
});

test("pass-through Reset v3 rejects topic, action, tuple, restoration, and idempotency drift", () => {
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS["p2-multiplication-foundations"];
  const base = {
    ...resetV3Metadata("restoring"),
    activationKey: "Enter" as const,
    actionKind: "restoring" as const,
    afterState: expected,
    beforeState: { ...expected, comparison: 4 },
    expectedState: expected,
    labId: "p2-multiplication-foundations",
    phase: "reset",
  };
  assert.throws(
    () => buildHkVisualizationPassThroughResetActionPlan("unknown-topic"),
    /unknown pass-through Reset topic/,
  );
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      expectedState: { ...expected, value: 5 },
    }).join(" | "),
    /expected Reset tuple drifted/,
  );
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      beforeState: expected,
    }).join(" | "),
    /restoring action started canonical/,
  );
  assert.match(
    auditHkVisualizationPassThroughResetObservation({
      ...base,
      ...resetV3Metadata("canonical-noop"),
      actionKind: "canonical-noop",
      activationKey: "Space",
      phase: "reset-space-idempotent",
      beforeState: { ...expected, height: 2 },
    }).join(" | "),
    /canonical no-op did not start canonical/,
  );
});

function p6BudgetObservation(
  boundary: HkP6BudgetBoundaryKind,
  workflowStep: "represent" | "solve" | "check",
): HkP6BudgetBoundaryObservation {
  const input = boundary === "positive-remaining"
    ? { budget: 60, count: 5, unitPrice: 10, extraCost: 0 }
    : boundary === "exact-zero"
      ? { budget: 50, count: 5, unitPrice: 10, extraCost: 0 }
      : { budget: 50, count: 5, unitPrice: 10, extraCost: 10 };
  const itemCost = input.count * input.unitPrice;
  const totalSpending = itemCost + input.extraCost;
  const remaining = input.budget - totalSpending;
  const withinBudget = remaining >= 0;
  const overspend = Math.max(0, -remaining);
  const scaleTotal = Math.max(input.budget, totalSpending);
  const budgetWidth = 470 * input.budget / scaleTotal;
  const itemWidth = 470 * itemCost / scaleTotal;
  const extraWidth = 470 * input.extraCost / scaleTotal;
  const remainderWidth = withinBudget ? 470 * remaining / scaleTotal : 0;
  const overspendWidth = withinBudget ? 0 : 470 * overspend / scaleTotal;
  const dedicatedState = { workflowStep, ...input };
  const common = {
    boundary,
    dedicatedState,
    derived: { itemCost, overspend, remaining, totalSpending, withinBudget },
    phase: `p6-budget-${workflowStep}-${boundary}`,
    serializedDedicatedState: JSON.stringify(dedicatedState),
  } as const;
  if (workflowStep === "represent") {
    return {
      ...common,
      surface: {
        kind: "represent",
        attributes: {
          budget: input.budget,
          extraCost: input.extraCost,
          itemCost,
          overspend,
          remaining,
          scaleTotal,
          totalSpending,
          withinBudget: String(withinBudget),
        },
        geometry: {
          comparisonScale: { height: 92, width: 470, x: 85, y: 128 },
          extra: { height: 92, width: extraWidth, x: 85 + itemWidth, y: 128 },
          item: { height: 92, width: itemWidth, x: 85, y: 128 },
          marker: { budget: input.budget, x1: 85 + budgetWidth, x2: 85 + budgetWidth, y1: 112, y2: 246 },
          overspend: withinBudget ? null : { height: 18, overspend, width: overspendWidth, x: 85 + budgetWidth, y: 226 },
          remainder: withinBudget ? { height: 92, remaining, width: remainderWidth, x: 85 + itemWidth + extraWidth, y: 128 } : null,
        },
        visibility: {
          comparisonScale: visible(),
          extra: extraWidth > 0 ? visible() : { ...visible(), visuallyVisible: false },
          item: visible(),
          marker: visible(),
          overspend: withinBudget ? null : visible(),
          remainder: withinBudget
            ? remainderWidth > 0 ? visible() : { ...visible(), visuallyVisible: false }
            : null,
          surface: visible(),
        },
      },
    };
  }
  if (workflowStep === "solve") {
    return {
      ...common,
      surface: {
        kind: "solve",
        result: {
          height: 68,
          kind: withinBudget ? "remaining" : "overspend",
          overspend,
          remaining,
          totalSpending,
          value: withinBudget ? remaining : overspend,
          width: 140,
          withinBudget: String(withinBudget),
          x: 466,
          y: 202,
        },
        visibility: { result: visible(), surface: visible() },
      },
    };
  }
  return {
    ...common,
    surface: {
      kind: "check",
      balance: {
        left: withinBudget ? totalSpending + remaining : input.budget + overspend,
        overspend,
        remaining,
        right: withinBudget ? input.budget : totalSpending,
        status: withinBudget ? "within-budget" : "over-budget",
        totalSpending,
        withinBudget: String(withinBudget),
      },
      geometry: {
        beam: { x1: 128, x2: 512, y1: 246, y2: 246 },
        leftCard: { height: 72, width: 172, x: 106, y: 126 },
        rightCard: { height: 72, width: 172, x: 362, y: 126 },
      },
      visibility: {
        beam: visible(),
        leftCard: visible(),
        rightCard: visible(),
        surface: visible(),
      },
    },
  };
}

function p6Observation(shift: number): HkP6AveragesLineGraphObservation {
  const hours = [9, 10, 11, 12] as const;
  const seriesA = [4, 8, 6, 10] as const;
  const x = (index: number) => 94 + index * 92;
  const y = (value: number) => 276 - (value / 14) * (276 - 34);
  const pointsA = seriesA.map((value, index) => ({
    hour: hours[index],
    value,
    x: x(index),
    y: y(value),
  }));
  const pointsB = seriesA.map((value, index) => ({
    hour: hours[index],
    value: value + shift,
    x: x(index),
    y: y(value + shift),
  }));
  const segments = (
    points: HkP6AveragesLineGraphObservation["points"]["A"],
  ) => points.slice(0, -1).map((point, index) => ({
    fromHour: point.hour,
    fromValue: point.value,
    toHour: points[index + 1].hour,
    toValue: points[index + 1].value,
    x1: point.x,
    x2: points[index + 1].x,
    y1: point.y,
    y2: points[index + 1].y,
  }));
  const meanA = 7;
  const meanB = meanA + shift;
  const visible = () => ({
    ariaHiddenAncestor: false,
    hiddenAncestor: false,
    inertAncestor: false,
    visuallyVisible: true,
  });
  return {
    dedicatedState: {
      mode: "broken-line",
      seriesBShift: shift,
      seriesCount: 2,
      values: [...seriesA],
    },
    flags: {
      seriesCoincident: shift === 0 ? "true" : "false",
      seriesMeansEqual: shift === 0 ? "true" : "false",
    },
    meanLines: {
      A: { value: meanA, y: y(meanA) },
      B: { value: meanB, y: y(meanB) },
    },
    phase: `p6-shift-${shift}`,
    points: { A: pointsA, B: pointsB },
    seriesBShift: shift,
    serializedDedicatedState: JSON.stringify({
      mode: "broken-line",
      seriesBShift: shift,
      seriesCount: 2,
      value1: 4,
      value2: 8,
      value3: 6,
      value4: 10,
    }),
    segments: { A: segments(pointsA), B: segments(pointsB) },
    tableRows: hours.map((hour, index) => ({
      hour,
      seriesA: seriesA[index],
      seriesB: seriesA[index] + shift,
    })),
    visibility: {
      graph: visible(),
      meanLines: { A: [visible()], B: [visible()] },
      meanReadout: visible(),
      points: {
        A: pointsA.map(visible),
        B: pointsB.map(visible),
      },
      segments: {
        A: segments(pointsA).map(visible),
        B: segments(pointsB).map(visible),
      },
      table: visible(),
      tableRows: hours.map(visible),
    },
  };
}

test("P6 two-series planner binds an executed zero-shift equality state followed by an ordinary positive state", () => {
  const basePlan = buildHkVisualizationRangeStatePlan("2", p6AveragesRanges);
  const plan = bindHkP6AveragesLineGraphBoundaryStates(
    "p6-ratio-proportion",
    "2",
    p6AveragesRanges,
    basePlan,
  );
  const zeroIndex = plan.findIndex(({ reasons }) =>
    reasons.includes("semantic-boundary:p6-series-shift-zero"),
  );
  const positiveIndex = plan.findIndex(({ reasons }) =>
    reasons.includes("semantic-boundary:p6-series-shift-positive"),
  );
  assert.ok(zeroIndex >= 0);
  assert.ok(positiveIndex > zeroIndex);
  assert.equal(plan[zeroIndex].values.at(-1)?.value, 0);
  assert.ok((plan[positiveIndex].values.at(-1)?.value ?? 0) > 0);
  assert.equal(plan[zeroIndex].reasons.includes("control:seriesBShift:minimum"), true);
  assert.equal(plan[positiveIndex].reasons.includes("control:seriesBShift:midpoint"), true);
});

test("P6 boundary binder fails closed if reset, range, order, or required controls drift", () => {
  for (const descriptors of [
    p6AveragesRanges.map((range) => range.controlId === "seriesBShift" ? { ...range, initial: 0 } : range),
    p6AveragesRanges.map((range) => range.controlId === "seriesBShift" ? { ...range, minimum: 1 } : range),
    [...p6AveragesRanges].reverse(),
    p6AveragesRanges.slice(0, -1),
  ]) {
    const plan = buildHkVisualizationRangeStatePlan("2", descriptors);
    assert.throws(
      () => bindHkP6AveragesLineGraphBoundaryStates(
        "p6-ratio-proportion",
        "2",
        descriptors,
        plan,
      ),
      /must retain|reset=2|execute shift=0/,
    );
  }
});

test("canonical browser helper binds, persists, audits, and receipt-checks both P6 semantic states", () => {
  const helper = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(helper, /rangePlan\s*=\s*bindHkP6AveragesLineGraphBoundaryStates\(/);
  assert.match(helper, /result\.p6AveragesLineGraphObservations\.push\(observation\)/);
  assert.match(helper, /auditHkP6AveragesLineGraphObservation\(observation\)/);
  assert.match(helper, /await\s+auditHkP6AveragesLineGraphState\(workspace,\s*result,\s*phase\)/);
  assert.match(helper, /Missing HK effective-visibility inspector/);
  assert.match(helper, /target\s+instanceof\s+SVGLineElement[\s\S]*?target\.getTotalLength\(\)\s*>\s*1/);
  assert.match(helper, /p3FractionNumerator\s*===\s*0[\s\S]*?whole bar fill[\s\S]*?equivalent bar fill/);
  assert.match(helper, /zero fraction fill must have exact width=0/);
  assert.match(helper, /zero fraction .*requires one learner-visible group, background, and value label/);
  assert.match(helper, /zero fraction .*must retain every visible partition/);
  assert.match(helper, /visibility:\s*\{[\s\S]*?graph:\s*visibilityEvidence\(graph\)[\s\S]*?table:\s*visibilityEvidence\(table\)/);
  assert.match(helper, /semantic-boundary:p6-series-shift-zero/);
  assert.match(helper, /semantic-boundary:p6-series-shift-positive/);
  assert.match(helper, /observations\.length\s*!==\s*1/);
});

test("P6 visible graph oracle proves exact zero coincidence and exact positive translation", () => {
  assert.deepEqual(auditHkP6AveragesLineGraphObservation(p6Observation(0)), []);
  assert.deepEqual(auditHkP6AveragesLineGraphObservation(p6Observation(2)), []);
});

test("P6 visible graph oracle fails closed on table, point, segment, mean, or equality-flag drift", () => {
  const base = p6Observation(0);
  const corruptions: HkP6AveragesLineGraphObservation[] = [
    { ...base, tableRows: base.tableRows.map((row, index) => index === 3 ? { ...row, seriesB: row.seriesB + 1 } : row) },
    { ...base, points: { ...base.points, B: base.points.B.map((point, index) => index === 2 ? { ...point, y: point.y + 1 } : point) } },
    { ...base, segments: { ...base.segments, B: base.segments.B.map((segment, index) => index === 1 ? { ...segment, x2: segment.x2 + 1 } : segment) } },
    { ...base, meanLines: { ...base.meanLines, B: { ...base.meanLines.B, value: base.meanLines.B.value + 1 } } },
    { ...base, flags: { ...base.flags, seriesCoincident: "false" } },
    { ...base, serializedDedicatedState: "{malformed" },
    {
      ...base,
      dedicatedState: { ...base.dedicatedState, values: [5, 8, 6, 10] },
      serializedDedicatedState: JSON.stringify({
        mode: "broken-line",
        seriesBShift: 0,
        seriesCount: 2,
        value1: 5,
        value2: 8,
        value3: 6,
        value4: 10,
      }),
    },
    { ...base, visibility: { ...base.visibility, graph: { ...base.visibility.graph, visuallyVisible: false } } },
    { ...base, visibility: { ...base.visibility, points: { ...base.visibility.points, B: base.visibility.points.B.map((evidence, index) => index === 1 ? { ...evidence, hiddenAncestor: true } : evidence) } } },
  ];
  for (const observation of corruptions) {
    assert.ok(auditHkP6AveragesLineGraphObservation(observation).length > 0);
  }
});

test("P6 budget planner appends positive remaining, exact zero, and positive overspend in exact order for every evidence-bearing workflow", () => {
  for (const modeId of ["represent", "solve", "check"] as const) {
    const basePlan = buildHkVisualizationRangeStatePlan(modeId, p6BudgetRanges);
    const plan = bindHkP6BudgetBoundaryStates(
      "p6-pre-secondary-problem-solving",
      modeId,
      p6BudgetRanges,
      basePlan,
    );
    const semanticEntries = plan.filter(({ reasons }) =>
      reasons.some((reason) => reason.startsWith("semantic-boundary:p6-budget-")),
    );
    assert.deepEqual(
      semanticEntries.map(({ reasons }) => reasons.find((reason) =>
        reason.startsWith("semantic-boundary:p6-budget-"),
      )),
      [
        "semantic-boundary:p6-budget-positive-remaining",
        "semantic-boundary:p6-budget-exact-zero",
        "semantic-boundary:p6-budget-positive-overspend",
      ],
    );
    assert.deepEqual(
      semanticEntries.map(({ signature }) => signature),
      [
        "budget=60|count=5|unitPrice=10|extraCost=0",
        "budget=50|count=5|unitPrice=10|extraCost=0",
        "budget=50|count=5|unitPrice=10|extraCost=10",
      ],
    );
    assert.deepEqual(plan.slice(-3), semanticEntries);
  }
  const planMode = buildHkVisualizationRangeStatePlan("plan", p6BudgetRanges);
  assert.equal(
    bindHkP6BudgetBoundaryStates(
      "p6-pre-secondary-problem-solving",
      "plan",
      p6BudgetRanges,
      planMode,
    ),
    planMode,
  );
});

test("P6 budget binder fails closed on control order or a target-blocking range drift", () => {
  for (const descriptors of [
    [...p6BudgetRanges].reverse(),
    p6BudgetRanges.slice(0, -1),
    p6BudgetRanges.map((range) => range.controlId === "budget" ? { ...range, minimum: 61 } : range),
    p6BudgetRanges.map((range) => range.controlId === "count" ? { ...range, step: 3 } : range),
  ]) {
    const plan = buildHkVisualizationRangeStatePlan("solve", descriptors);
    assert.throws(
      () => bindHkP6BudgetBoundaryStates(
        "p6-pre-secondary-problem-solving",
        "solve",
        descriptors,
        plan,
      ),
      /must retain|cannot execute|exact control order/,
    );
  }
});

test("P6 budget oracle proves positive remaining, exact zero, and positive overspend on all visible workflow surfaces", () => {
  for (const boundary of ["positive-remaining", "exact-zero", "positive-overspend"] as const) {
    for (const workflowStep of ["represent", "solve", "check"] as const) {
      assert.deepEqual(
        auditHkP6BudgetBoundaryObservation(
          p6BudgetObservation(boundary, workflowStep),
        ),
        [],
      );
    }
  }
});

test("P6 budget oracle rejects hidden evidence, wrong geometry, and a self-consistent but wrong exact-zero state", () => {
  const exact = p6BudgetObservation("exact-zero", "represent");
  if (exact.surface.kind !== "represent") {
    throw new Error("P6 exact-zero test fixture must use the represent surface.");
  }
  const hidden = {
    ...exact,
    surface: {
      ...exact.surface,
      visibility: {
        ...exact.surface.visibility,
        surface: { ...exact.surface.visibility.surface, hiddenAncestor: true },
      },
    },
  } satisfies HkP6BudgetBoundaryObservation;
  const wrongGeometry = {
    ...exact,
    surface: {
      ...exact.surface,
      geometry: {
        ...exact.surface.geometry,
        marker: { ...exact.surface.geometry.marker, x1: exact.surface.geometry.marker.x1 + 5 },
      },
    },
  } satisfies HkP6BudgetBoundaryObservation;
  const wrongState = p6BudgetObservation("positive-remaining", "represent");
  const selfConsistentWrongExact = {
    ...wrongState,
    boundary: "exact-zero" as const,
  } satisfies HkP6BudgetBoundaryObservation;
  const wrongSerialized = {
    ...exact,
    serializedDedicatedState: JSON.stringify({ ...exact.dedicatedState, budget: 51 }),
  } satisfies HkP6BudgetBoundaryObservation;
  for (const observation of [hidden, wrongGeometry, selfConsistentWrongExact, wrongSerialized]) {
    assert.ok(auditHkP6BudgetBoundaryObservation(observation).length > 0);
  }
});

test("canonical helper binds, durably records, audits, and receipt-checks all P6 budget boundary states", () => {
  const helper = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(helper, /rangePlan\s*=\s*bindHkP6BudgetBoundaryStates\(/);
  assert.match(helper, /result\.p6BudgetBoundaryObservations\.push\(observation\)/);
  assert.match(helper, /auditHkP6BudgetBoundaryObservation\(observation\)/);
  assert.match(helper, /await\s+auditHkP6BudgetBoundaryState\(workspace,\s*result,\s*phase\)/);
  assert.match(helper, /const\s+boundary\s*=\s*p6BudgetBoundaryForPhase\(result,\s*phase\);\s*if\s*\(!boundary\)\s*return;/);
  assert.match(helper, /observedObservationPhases\.length\s*!==\s*expectedObservationPhases\.length/);
  assert.match(helper, /phase\s*!==\s*expectedObservationPhases\[index\]/);
  assert.match(helper, /semantic-boundary:p6-budget-positive-remaining/);
  assert.match(helper, /semantic-boundary:p6-budget-exact-zero/);
  assert.match(helper, /semantic-boundary:p6-budget-positive-overspend/);
  assert.match(helper, /P6_BUDGET_BOUNDARY_RECEIPT/);
});

const fractionBarRanges = Object.freeze([
  Object.freeze({
    controlId: "value",
    initial: 5,
    maximum: 9,
    minimum: 1,
    step: 1,
  }),
  Object.freeze({
    controlId: "comparison",
    initial: 4,
    maximum: 6,
    minimum: 0,
    step: 1,
  }),
] satisfies readonly HkVisualizationRangeDescriptor[]);

test("one range executes three unique states while retaining all min/mid/max and endpoint reasons", () => {
  const plan = buildHkVisualizationRangeStatePlan("measure", [amount]);
  assert.equal(plan.length, 3);
  assert.deepEqual(
    plan.map((entry) => entry.signature),
    ["amount=1", "amount=0", "amount=2"],
  );
  assert.equal(new Set(plan.map((entry) => entry.signature)).size, plan.length);
  const reasons = plan.flatMap((entry) => entry.reasons);
  assert.deepEqual(
    new Set(reasons),
    new Set([
      "mode:measure:base",
      "control:amount:minimum",
      "control:amount:midpoint",
      "control:amount:maximum",
      "endpoint-combination:0",
      "endpoint-combination:1",
    ]),
  );
});

test("two ranges retain every endpoint vector exactly once in deterministic order", () => {
  const plan = buildHkVisualizationRangeStatePlan("two-range", [
    amount,
    { controlId: "height", initial: 15, maximum: 20, minimum: 10, step: 5 },
  ]);
  assert.equal(plan.length, 9);
  assert.equal(new Set(plan.map((entry) => entry.id)).size, plan.length);
  assert.equal(new Set(plan.map((entry) => entry.signature)).size, plan.length);
  const endpointReasons = plan
    .flatMap((entry) => entry.reasons)
    .filter((reason) => reason.startsWith("endpoint-combination:"));
  assert.deepEqual(endpointReasons, [
    "endpoint-combination:0",
    "endpoint-combination:1",
    "endpoint-combination:2",
    "endpoint-combination:3",
  ]);
  assert.deepEqual(
    buildHkVisualizationRangeStatePlan("two-range", [
      amount,
      { controlId: "height", initial: 15, maximum: 20, minimum: 10, step: 5 },
    ]),
    plan,
  );
});

test("midpoints are quantized to the declared step instead of inventing an unreachable value", () => {
  const plan = buildHkVisualizationRangeStatePlan("quantized", [
    { controlId: "odd-span", initial: 1, maximum: 5, minimum: 0, step: 2 },
  ]);
  const midpointEntry = plan.find((entry) =>
    entry.reasons.includes("control:odd-span:midpoint"),
  );
  assert.equal(midpointEntry?.signature, "odd-span=2");
});

test("invalid or duplicate range descriptors fail closed", () => {
  assert.throws(
    () => buildHkVisualizationRangeStatePlan("duplicate", [amount, amount]),
    /duplicated/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan("invalid-step", [
        { ...amount, step: Number.NaN },
      ]),
    /finite/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan("invalid-bounds", [
        { ...amount, minimum: 2 },
      ]),
    /minimum < maximum/,
  );
});

test("exhaustive endpoint coverage never silently truncates a model with too many visible ranges", () => {
  const descriptors = Array.from({ length: 13 }, (_, index) => ({
    controlId: `control-${index}`,
    initial: 0.5,
    maximum: 1,
    minimum: 0,
    step: 0.5,
  }));
  assert.throws(
    () => buildHkVisualizationRangeStatePlan("too-many", descriptors),
    /must not be silently truncated/,
  );
});

test("static Cartesian plans remain strict and carry no implicit projection permission", () => {
  const descriptors = [
    { controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 },
    { controlId: "knownPart", initial: 7, maximum: 12, minimum: 0, step: 1 },
  ];
  const plan = buildHkVisualizationRangeStatePlan("whole", descriptors);
  assert.ok(plan.every((entry) => entry.domainId === null));
  assert.ok(
    plan.every((entry) => entry.requestedSignature === entry.expectedSignature),
  );
  assert.ok(plan.every((entry) => entry.projectionEvidence.length === 0));
  assert.ok(plan.some((entry) => entry.signature === "total=0|knownPart=7"));
  assert.ok(plan.some((entry) => entry.signature === "total=0|knownPart=12"));
});

test("declared number-bond domain canonicalizes infeasible Cartesian requests and adds the expanded live boundary", () => {
  const plan = buildHkVisualizationRangeStatePlan(
    "whole",
    [
      { controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 },
      { controlId: "knownPart", initial: 7, maximum: 12, minimum: 0, step: 1 },
    ],
    {
      domainId: "number-bond-v1",
      labId: "p1-counting-number-bonds",
    },
  );
  assert.ok(plan.every((entry) => entry.domainId === "number-bond-v1"));
  assert.equal(
    new Set(
      plan.map(
        (entry) =>
          `${entry.startingSignature}>>${entry.actionSignature}>>${entry.expectedSignature}`,
      ),
    ).size,
    plan.length,
  );
  assert.ok(
    plan.some(
      (entry) =>
        entry.requestedSignature === "total=0|knownPart=7" &&
        entry.expectedSignature === "total=0|knownPart=0" &&
        entry.projectionEvidence.some(
          ({ declaredControllerId }) => declaredControllerId === "total",
        ),
    ),
  );
  const expanded = plan.find(({ boundaryIds }) =>
    boundaryIds.includes("maximum-whole-all-known"),
  );
  assert.equal(expanded?.expectedSignature, "total=20|knownPart=20");
  assert.deepEqual(expanded?.applicationOrder, ["total", "knownPart"]);
});

test("distinct projection requests landing on one canonical state remain separate executable transitions", () => {
  const plan = buildHkVisualizationRangeStatePlan(
    "whole",
    [
      { controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 },
      { controlId: "knownPart", initial: 7, maximum: 12, minimum: 0, step: 1 },
    ],
    { domainId: "number-bond-v1", labId: "p1-counting-number-bonds" },
  );
  const projectedZeroStates = plan.filter(
    (entry) =>
      entry.expectedSignature === "total=0|knownPart=0" &&
      entry.projectionEvidence.length > 0,
  );
  assert.ok(projectedZeroStates.length >= 2);
  assert.equal(
    new Set(projectedZeroStates.map(({ actionSignature }) => actionSignature))
      .size,
    projectedZeroStates.length,
  );
  assert.equal(
    new Set(projectedZeroStates.map(({ id }) => id)).size,
    projectedZeroStates.length,
  );
  assert.ok(
    projectedZeroStates.some(
      (entry) =>
        entry.actions.find(({ controlId }) => controlId === "knownPart")
          ?.allowProjectedAbsence === true,
    ),
  );
  const controllerAction = projectedZeroStates[0].actions.find(
    ({ controlId }) => controlId === "total",
  );
  const dependentAction = projectedZeroStates[0].actions.find(
    ({ controlId }) => controlId === "knownPart",
  );
  assert.deepEqual(controllerAction?.affectedControlIds, ["knownPart"]);
  assert.deepEqual(controllerAction?.projectedByControllerIds, []);
  assert.deepEqual(dependentAction?.affectedControlIds, []);
  assert.deepEqual(dependentAction?.projectedByControllerIds, ["total"]);
  assert.deepEqual(dependentAction?.projectedAbsenceRequirements, {
    controllerMustPrecede: true,
    expectedFixedValue: 0,
    expectedVisibility: "fixed",
    projection: "clamp-and-visibility",
    requireExactControllerMetadata: true,
    requireExactlyOneFixedParameterNode: true,
    requireSerializedStateMatch: true,
  });
});

test("dynamic plan exposes reset/replay start, ordered requests, and exact projected observation separately", () => {
  const plan = buildHkVisualizationRangeStatePlan(
    "graph",
    [
      { controlId: "a", initial: 1, maximum: 3, minimum: -3, step: 0.25 },
      { controlId: "b", initial: -2, maximum: 6, minimum: -6, step: 0.5 },
      { controlId: "c", initial: -3, maximum: 6, minimum: -6, step: 0.5 },
    ],
    {
      domainId: "nonzero-quadratic-a-v1",
      labId: "quadratic-patterns",
    },
  );
  const projected = plan.find(
    (entry) =>
      entry.requestedValues.some(
        ({ controlId, value }) => controlId === "a" && value === 0,
      ) &&
      entry.expectedValues.some(
        ({ controlId, value }) => controlId === "a" && value === -0.25,
      ),
  );
  assert.ok(projected);
  assert.equal(projected.startingSignature, "a=1|b=-2|c=-3");
  assert.notEqual(projected.requestedSignature, projected.expectedSignature);
  assert.equal(projected.signature, projected.expectedSignature);
  assert.deepEqual(projected.applicationOrder, ["a", "b", "c"]);
  assert.ok(
    projected.projectionEvidence.some(
      ({ projection }) => projection === "exclude-zero",
    ),
  );
});

test("proper-fraction planner orders each denominator before its numerator and reaches numerator five", () => {
  const plan = buildHkVisualizationRangeStatePlan(
    "three",
    [
      {
        controlId: "firstNumerator",
        initial: 1,
        maximum: 1,
        minimum: 0,
        step: 1,
      },
      {
        controlId: "firstDenominator",
        initial: 2,
        maximum: 6,
        minimum: 2,
        step: 1,
      },
      {
        controlId: "secondNumerator",
        initial: 1,
        maximum: 2,
        minimum: 0,
        step: 1,
      },
      {
        controlId: "secondDenominator",
        initial: 3,
        maximum: 6,
        minimum: 2,
        step: 1,
      },
    ],
    {
      domainId: "proper-fractions-v1",
      labId: "p5-fractions-operations",
    },
  );
  assert.ok(
    plan.every((entry) => {
      for (const prefix of ["first", "second"] as const) {
        const denominatorIndex = entry.applicationOrder.indexOf(
          `${prefix}Denominator`,
        );
        const numeratorIndex = entry.applicationOrder.indexOf(
          `${prefix}Numerator`,
        );
        if (denominatorIndex >= 0 && numeratorIndex >= 0)
          assert.ok(denominatorIndex < numeratorIndex);
      }
      return true;
    }),
  );
  assert.ok(
    plan.some((entry) =>
      entry.expectedSignature.includes("firstNumerator=5|firstDenominator=6"),
    ),
  );
  const base = plan.find((entry) => entry.reasons.includes("mode:three:base"));
  assert.equal(base?.requestedSignature, base?.expectedSignature);
  assert.notEqual(base?.actionSignature, base?.expectedSignature);
  assert.ok(
    plan.every((entry) =>
      entry.expectedValues.every(({ value }) => Number.isFinite(value)),
    ),
  );
});

test("dynamic domain lookup is lab-bound and missing required controls fail closed", () => {
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan("whole", [amount], {
        domainId: "number-bond-v1",
        labId: "wrong-lab",
      }),
    /belongs to/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan(
        "whole",
        [{ controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 }],
        {
          domainId: "number-bond-v1",
          labId: "p1-counting-number-bonds",
        },
      ),
    /required range knownPart is missing/,
  );
});

test("shared fraction bar remains outside the exact nine dedicated registry entries", () => {
  assert.equal(HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS.length, 9);
  assert.ok(
    !new Set<string>(HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS).has(
      HK_FRACTION_BAR_RANGE_DOMAIN_ID,
    ),
  );
});

test("shared fraction bar ledger preserves the exact nine chained transitions in every mode", () => {
  const sourcePlan = buildHkFractionBarRangeStatePlan();
  const ledgerPlans = HK_FRACTION_BAR_MODE_IDS.map((modeId) =>
    buildHkVisualizationRangeStatePlan(modeId, fractionBarRanges, {
      domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
      labId: HK_FRACTION_BAR_LAB_ID,
    }),
  );
  const aggregate = ledgerPlans.flat();

  assert.equal(
    aggregate.length,
    HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.totalStateCount,
  );
  assert.equal(new Set(aggregate.map(({ id }) => id)).size, aggregate.length);
  assert.equal(
    new Set(
      ledgerPlans.flatMap((plan, modeIndex) =>
        plan.map(
          ({ startingSignature, actionSignature, expectedSignature }) =>
            `${HK_FRACTION_BAR_MODE_IDS[modeIndex]}:${startingSignature}>>${actionSignature}>>${expectedSignature}`,
        ),
      ),
    ).size,
    aggregate.length,
  );
  assert.deepEqual(
    aggregate.map(({ id }) => id),
    sourcePlan.map(({ id }) => id),
  );

  for (const [index, modeId] of HK_FRACTION_BAR_MODE_IDS.entries()) {
    const plan = ledgerPlans[index];
    const sourceEntries = sourcePlan.filter((entry) => entry.modeId === modeId);
    assert.equal(
      plan.length,
      HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.stateCountPerMode,
    );
    assert.deepEqual(
      plan.map(({ id }) => id),
      sourceEntries.map(({ id }) => id),
    );
    assert.ok(
      plan.every((entry) => entry.domainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID),
    );
    assert.ok(
      plan.every(
        (entry) =>
          entry.applicationOrder.join("|") === "value|comparison" ||
          entry.applicationOrder.length === 1,
      ),
    );
    assert.ok(
      plan.every((entry) =>
        entry.expectedDescriptors.every(
          (descriptor) =>
            descriptor.domainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID,
        ),
      ),
    );
  }
});

test("shared fraction bar ledger keeps clamp projection and refuses numerator resurrection", () => {
  const plan = buildHkVisualizationRangeStatePlan(
    "fraction",
    fractionBarRanges,
    {
      domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
      labId: HK_FRACTION_BAR_LAB_ID,
    },
  );
  const clamp = plan.find(({ boundaryIds }) =>
    boundaryIds.includes("denominator-decrease-clamp"),
  );
  const noResurrection = plan.find(({ boundaryIds }) =>
    boundaryIds.includes("denominator-increase-no-resurrection"),
  );

  assert.equal(clamp?.startingSignature, "value=9|comparison=10");
  assert.equal(clamp?.actionSignature, "value=5");
  assert.equal(clamp?.expectedSignature, "value=5|comparison=6");
  assert.deepEqual(clamp?.applicationOrder, ["value"]);
  assert.deepEqual(clamp?.actions[0], {
    affectedControlIds: ["comparison"],
    allowProjectedAbsence: false,
    controlId: "value",
    expectedValue: 5,
    projectedAbsenceRequirements: null,
    projectedByControllerIds: [],
    requestedValue: 5,
  });
  assert.deepEqual(clamp?.projectionEvidence, [
    {
      affectedControlId: "comparison",
      affectedValueAfter: 6,
      affectedValueBefore: 10,
      declaredControllerId: "value",
      domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
      projection: "clamp-max",
      reason:
        "raw-numerator-must-remain-between-zero-and-current-denominator-inclusive",
      triggerControlId: "value",
      triggerRequestedValue: 5,
    },
  ]);
  assert.equal(noResurrection?.startingSignature, "value=5|comparison=6");
  assert.equal(noResurrection?.actionSignature, "value=9");
  assert.equal(noResurrection?.expectedSignature, "value=9|comparison=6");
  assert.equal(noResurrection?.projectionEvidence.length, 0);
});

test("shared fraction bar ledger fails closed for wrong identity, mode, fixed maximum, or descriptor order", () => {
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan("fraction", fractionBarRanges, {
        domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
        labId: "wrong-lab",
      }),
    /belongs to/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan("whole", fractionBarRanges, {
        domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
        labId: HK_FRACTION_BAR_LAB_ID,
      }),
    /not an executable fraction mode/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan(
        "fraction",
        [fractionBarRanges[0], { ...fractionBarRanges[1], maximum: 9 }],
        {
          domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
          labId: HK_FRACTION_BAR_LAB_ID,
        },
      ),
    /must equal/,
  );
  assert.throws(
    () =>
      buildHkVisualizationRangeStatePlan(
        "fraction",
        [fractionBarRanges[1], fractionBarRanges[0]],
        {
          domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
          labId: HK_FRACTION_BAR_LAB_ID,
        },
      ),
    /exact control order/,
  );
});

test("dependent transition v8 sequence contract is independent, exact, and fail-closed", async () => {
  const ledger = await import("./hk-visualization-range-state-ledger") as Record<string, unknown>;
  assert.equal(
    ledger.HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION,
    "hk-viz-dependent-transition-sequence.v8",
  );
  assert.equal(
    ledger.HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_EXPECTED_COUNT,
    11,
  );
  assert.equal(
    typeof ledger.buildHkVisualizationDependentTransitionSequencePlans,
    "function",
  );
  assert.equal(
    typeof ledger.auditHkVisualizationDependentTransitionSequenceReceipt,
    "function",
  );
});

test("dependent transition v8 preserves first-class theme across observation, baseline, and receipt headers", () => {
  const plan = allDependentTransitionPlans()[0];
  const observation = observationForDependentTransitionPlan(
    plan,
    `cell:${plan.labId}:en:light:desktop`,
  ) as unknown as Record<string, unknown>;
  assert.equal(observation.theme, "light");
  const baseline = observation.canonicalVisibleBaseline as Record<string, unknown>;
  assert.equal(baseline.theme, "light");
  assert.deepEqual(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint: `canonical:${plan.labId}`,
    cellId: String(observation.cellId),
    expectedPlans: [plan],
    language: "en",
    observations: [observation as unknown as HkVisualizationDependentTransitionSequenceObservation],
    theme: "light",
  } as never), []);
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint: `canonical:${plan.labId}`,
    cellId: String(observation.cellId),
    expectedPlans: [plan],
    language: "en",
    observations: [observation as unknown as HkVisualizationDependentTransitionSequenceObservation],
    theme: "dark",
  } as never).some((issue) => /theme|header|cell/i.test(issue)));
});

test("dependent transition v8 plans carry independently recomputable durable ancestry-scale aggregates", () => {
  const plan = allDependentTransitionPlans()[0];
  const aggregateContract = plan.phases[0].visibleMathProjectionContract as
    unknown as Record<string, unknown>;
  assert.deepEqual(Object.keys(aggregateContract).sort(), [
    "contractIds", "elementCount", "expectedAncestryScaleSummaries",
    "expectedHashes", "selectors",
  ]);
  const expectedByLanguage = aggregateContract.expectedAncestryScaleSummaries as
    Record<string, Record<string, Record<string, unknown>>>;
  const summary = expectedByLanguage.en.light;
  assert.deepEqual(Object.keys(summary).sort(), [
    "chainCount", "contractCount", "entryCount", "hash", "policyVersion",
    "scaleWitnessCount",
  ]);
  assert.equal(
    summary.policyVersion,
    "visible-math-aggregate-ancestry-scale-summary.v1",
  );
  assert.equal(summary.contractCount, aggregateContract.contractIds instanceof Array
    ? aggregateContract.contractIds.length
    : -1);
  assert.ok(Number(summary.chainCount) >= Number(summary.contractCount));
  assert.ok(Number(summary.entryCount) >= Number(summary.chainCount));
  assert.equal(
    Number(summary.scaleWitnessCount),
    Number(summary.contractCount) * 3,
  );
  assert.match(String(summary.hash), /^[0-9a-f]{64}$/u);
});

test("dependent transition v8 receipt serializes and mutation-binds phase baseline and restoration aggregate summaries", () => {
  const plan = allDependentTransitionPlans()[0];
  const observation = observationForDependentTransitionPlan(plan);
  const serialized = JSON.parse(JSON.stringify(observation)) as
    Record<string, unknown>;
  const phase = (serialized.phases as Array<Record<string, unknown>>)[0];
  const baseline = serialized.canonicalVisibleBaseline as Record<string, unknown>;
  const restoration = serialized.postSequenceRestoration as Record<string, unknown>;
  for (const [label, container] of [
    ["phase", phase], ["baseline", baseline], ["restoration", restoration],
  ] as const) {
    const aggregate = container.visibleMathProjection as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(aggregate).sort(),
      ["ancestryScaleSummary", "elementCount", "hash"],
      label,
    );
    const summary = aggregate.ancestryScaleSummary as Record<string, unknown>;
    assert.deepEqual(Object.keys(summary).sort(), [
      "chainCount", "contractCount", "entryCount", "hash", "policyVersion",
      "scaleWitnessCount",
    ], label);
    assert.match(String(summary.hash), /^[0-9a-f]{64}$/u, label);
  }

  for (const location of ["phase", "baseline", "restoration"] as const) {
    const corrupted = structuredClone(observation);
    const aggregate = location === "phase"
      ? corrupted.phases[0].visibleMathProjection
      : location === "baseline"
        ? corrupted.canonicalVisibleBaseline.visibleMathProjection
        : corrupted.postSequenceRestoration.visibleMathProjection;
    const summary = (aggregate as unknown as {
      ancestryScaleSummary: { chainCount: number };
    }).ancestryScaleSummary;
    summary.chainCount += 1;
    let rejectedOrAudited = false;
    try {
      const rehashed = rehashDependentTransitionObservation(corrupted);
      rejectedOrAudited =
        auditHkVisualizationDependentTransitionSequenceObservation(
          plan,
          rehashed,
        ).some((issue) =>
          /projection|summary|ancestry|scale|baseline|restoration/i.test(issue)
        );
    } catch {
      rejectedOrAudited = true;
    }
    assert.equal(rejectedOrAudited, true, location);
  }

  const malformed = structuredClone(observation) as unknown as {
    phases: Array<{ visibleMathProjection: Record<string, unknown> }>;
  };
  const malformedSummary = (
    malformed.phases[0].visibleMathProjection.ancestryScaleSummary
  ) as Record<string, unknown>;
  delete malformedSummary.hash;
  assert.throws(
    () => hashHkVisualizationDependentTransitionSequenceObservation(
      malformed as unknown as HkVisualizationDependentTransitionSequenceObservation,
    ),
    /exact schema|summary|hash/i,
  );
});

test("dependent transition deadline budget uses the independent per-lab exact sequence count", () => {
  const literalCounts = {
    "p1-counting-number-bonds": 1,
    "p1-addition-subtraction": 2,
    "p2-money-time": 1,
    "p4-large-numbers": 1,
    "p5-fractions-operations": 3,
    "p5-volume": 1,
    "identities-square-patterns": 2,
  } as const;
  assert.deepEqual(
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB,
    literalCounts,
  );
  assert.equal(
    Object.values(literalCounts).reduce((sum, count) => sum + count, 0),
    11,
  );
  for (const [labId, count] of Object.entries(literalCounts)) {
    assert.equal(
      hkVisualizationDependentTransitionSequenceCountForLab(labId),
      count,
    );
    assert.equal(
      hkVisualizationDependentTransitionDeadlineBudgetMs(labId),
      count * HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_DEADLINE_BUDGET_MS,
    );
  }
  assert.equal(hkVisualizationDependentTransitionSequenceCountForLab("unowned"), 0);
  assert.equal(hkVisualizationDependentTransitionDeadlineBudgetMs("unowned"), 0);
  assert.equal(
    hkVisualizationDependentTransitionDeadlineBudgetMs(),
    3 * HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_DEADLINE_BUDGET_MS,
  );

  const helper = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(helper, /hkVisualizationDependentTransitionDeadlineBudgetMs\(labId\)/);
  assert.match(
    helper,
    /hkVisualizationCellDeadlineMs\(\s*interactionDepth,\s*lab\.labId,?\s*\)/,
  );
  assert.doesNotMatch(
    helper,
    /dependentTransitionSequenceObservations\.length\s*\*/,
  );

  const machineSpec = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    "utf8",
  );
  assert.match(
    machineSpec,
    /hkVisualizationCellDeadlineMs\(\s*options\.interactionDepth,\s*lab\.labId,?\s*\)/,
  );
  assert.doesNotMatch(
    machineSpec,
    /hkVisualizationCellDeadlineMs\(\s*options\.interactionDepth\s*\)/,
  );
});

function allDependentTransitionPlans() {
  return dependentTransitionCases.flatMap((entry) =>
    buildHkVisualizationDependentTransitionSequencePlans(entry),
  );
}

// This literal table is intentionally test-owned: it does not import, map, or
// spread the producer definitions. Tuple shapes are:
// descriptor=[id,initial,max,min,step], action/value=[id,value],
// public=[key,value], visible=[name,attribute,stringValue,occurrence], and
// restoration descriptor=[id,max,min,step,visibility,enabled,domain,excluded].
const independentDependentTransitionLiteralTable = Object.freeze([
  {
    sequenceId: "p1-number-bond-known-part", labId: "p1-counting-number-bonds",
    modeId: "__default__", domainId: "number-bond-v1", modePreparation: [],
    controllerControlId: "total", dependentControlId: "knownPart",
    expectedLiveDescriptors: [["total", 12, 20, 0, 1], ["knownPart", 7, 12, 0, 1]],
    descriptorEnvelope: [["total", 12, 20, 0, 1], ["knownPart", 7, 20, 0, 1]],
    phases: [
      { phase: "pre", actions: [["total", 20], ["knownPart", 20]], values: [["total", 20], ["knownPart", 20]], publicState: [["total", 20], ["knownPart", 20]], visible: [["counter-set", "data-viz-total", "20", 0], ["known-part-node", "__text", "20", 0], ["missing-part-node", "__text", "0", 0]], selector: '[data-viz-name="counter-set"], [data-viz-name="known-part-node"], [data-viz-name="missing-part-node"]' },
      { phase: "clamp", actions: [["total", 0]], values: [["total", 0], ["knownPart", 0]], publicState: [["total", 0], ["knownPart", 0]], visible: [["counter-set", "data-viz-total", "0", 0], ["known-part-node", "__text", "0", 0], ["missing-part-node", "__text", "0", 0]], selector: '[data-viz-name="counter-set"], [data-viz-name="known-part-node"], [data-viz-name="missing-part-node"]' },
      { phase: "expand", actions: [["total", 20]], values: [["total", 20], ["knownPart", 0]], publicState: [["total", 20], ["knownPart", 0]], visible: [["counter-set", "data-viz-total", "20", 0], ["known-part-node", "__text", "0", 0], ["missing-part-node", "__text", "20", 0]], selector: '[data-viz-name="counter-set"], [data-viz-name="known-part-node"], [data-viz-name="missing-part-node"]' },
    ],
    restoration: { modeId: "__default__", values: [["total", 12], ["knownPart", 7]], publicState: [["total", 12], ["knownPart", 7]], descriptors: [["total", 20, 0, 1, "range", true, "number-bond-v1", []], ["knownPart", 12, 0, 1, "range", true, "number-bond-v1", []]] },
  },
  {
    sequenceId: "p1-add-step", labId: "p1-addition-subtraction", modeId: "add",
    domainId: "bounded-step-v1", modePreparation: [["operation", "add"]],
    controllerControlId: "start", dependentControlId: "step",
    expectedLiveDescriptors: [["start", 6, 20, 0, 1], ["step", 5, 14, 0, 1]],
    descriptorEnvelope: [["start", 6, 20, 0, 1], ["step", 5, 20, 0, 1]],
    phases: [
      { phase: "pre", actions: [["start", 0], ["step", 20]], values: [["start", 0], ["step", 20]], publicState: [["operation", "add"], ["start", 0], ["step", 20]], visible: [["directed-jump", "data-viz-operation", "add", 0], ["directed-jump", "data-viz-start", "0", 0], ["directed-jump", "data-viz-step", "20", 0], ["directed-jump", "data-viz-end", "20", 0]], selector: '[data-viz-name="directed-jump"]' },
      { phase: "clamp", actions: [["start", 20]], values: [["start", 20], ["step", 0]], publicState: [["operation", "add"], ["start", 20], ["step", 0]], visible: [["stationary-point", "data-viz-value", "20", 0]], selector: '[data-viz-name="stationary-point"]' },
      { phase: "expand", actions: [["start", 0]], values: [["start", 0], ["step", 0]], publicState: [["operation", "add"], ["start", 0], ["step", 0]], visible: [["stationary-point", "data-viz-value", "0", 0]], selector: '[data-viz-name="stationary-point"]' },
    ],
    restoration: { modeId: "add", values: [["start", 6], ["step", 5]], publicState: [["operation", "add"], ["start", 6], ["step", 5]], descriptors: [["start", 20, 0, 1, "range", true, "bounded-step-v1", []], ["step", 14, 0, 1, "range", true, "bounded-step-v1", []]] },
  },
  {
    sequenceId: "p1-subtract-step", labId: "p1-addition-subtraction", modeId: "subtract",
    domainId: "bounded-step-v1", modePreparation: [["operation", "subtract"]],
    controllerControlId: "start", dependentControlId: "step",
    expectedLiveDescriptors: [["start", 6, 20, 0, 1], ["step", 5, 6, 0, 1]],
    descriptorEnvelope: [["start", 6, 20, 0, 1], ["step", 5, 20, 0, 1]],
    phases: [
      { phase: "pre", actions: [["start", 20], ["step", 20]], values: [["start", 20], ["step", 20]], publicState: [["operation", "subtract"], ["start", 20], ["step", 20]], visible: [["directed-jump", "data-viz-operation", "subtract", 0], ["directed-jump", "data-viz-start", "20", 0], ["directed-jump", "data-viz-step", "20", 0], ["directed-jump", "data-viz-end", "0", 0]], selector: '[data-viz-name="directed-jump"]' },
      { phase: "clamp", actions: [["start", 0]], values: [["start", 0], ["step", 0]], publicState: [["operation", "subtract"], ["start", 0], ["step", 0]], visible: [["stationary-point", "data-viz-value", "0", 0]], selector: '[data-viz-name="stationary-point"]' },
      { phase: "expand", actions: [["start", 20]], values: [["start", 20], ["step", 0]], publicState: [["operation", "subtract"], ["start", 20], ["step", 0]], visible: [["stationary-point", "data-viz-value", "20", 0]], selector: '[data-viz-name="stationary-point"]' },
    ],
    restoration: { modeId: "add", values: [["start", 6], ["step", 5]], publicState: [["operation", "add"], ["start", 6], ["step", 5]], descriptors: [["start", 20, 0, 1, "range", true, "bounded-step-v1", []], ["step", 14, 0, 1, "range", true, "bounded-step-v1", []]] },
  },
  {
    sequenceId: "p2-payment-at-least-price", labId: "p2-money-time", modeId: "money",
    domainId: "payment-at-least-price-v1", modePreparation: [["model", "money"]],
    controllerControlId: "price", dependentControlId: "payment",
    expectedLiveDescriptors: [["price", 32, 99, 1, 1], ["payment", 50, 100, 32, 1]],
    descriptorEnvelope: [["price", 32, 99, 1, 1], ["payment", 50, 100, 32, 1]],
    phases: [
      { phase: "pre", actions: [["price", 1], ["payment", 1]], values: [["price", 1], ["payment", 1]], publicState: [["mode", "money"], ["price", 1], ["payment", 1], ["hour", 9], ["halfHour", true]], visible: [["payment-bar", "data-viz-payment", "1", 0], ["price-segment", "data-viz-price", "1", 0]], selector: '[data-viz-name="payment-bar"], [data-viz-name="price-segment"]' },
      { phase: "clamp", actions: [["price", 99]], values: [["price", 99], ["payment", 99]], publicState: [["mode", "money"], ["price", 99], ["payment", 99], ["hour", 9], ["halfHour", true]], visible: [["payment-bar", "data-viz-payment", "99", 0], ["price-segment", "data-viz-price", "99", 0]], selector: '[data-viz-name="payment-bar"], [data-viz-name="price-segment"]' },
      { phase: "expand", actions: [["price", 1]], values: [["price", 1], ["payment", 99]], publicState: [["mode", "money"], ["price", 1], ["payment", 99], ["hour", 9], ["halfHour", true]], visible: [["payment-bar", "data-viz-payment", "99", 0], ["price-segment", "data-viz-price", "1", 0]], selector: '[data-viz-name="payment-bar"], [data-viz-name="price-segment"]' },
    ],
    restoration: { modeId: "money", values: [["price", 32], ["payment", 50]], publicState: [["mode", "money"], ["price", 32], ["payment", 50], ["hour", 9], ["halfHour", true]], descriptors: [["price", 99, 1, 1, "range", true, "payment-at-least-price-v1", []], ["payment", 100, 32, 1, "range", true, "payment-at-least-price-v1", []]] },
  },
  {
    sequenceId: "p4-divisor-within-number", labId: "p4-large-numbers", modeId: "factor-pairs",
    domainId: "divisor-within-number-v1", modePreparation: [["model", "factor-pairs"]],
    controllerControlId: "firstNumber", dependentControlId: "candidateDivisor",
    expectedLiveDescriptors: [["firstNumber", 24, 60, 1, 1], ["candidateDivisor", 6, 24, 1, 1]],
    descriptorEnvelope: [["firstNumber", 24, 60, 1, 1], ["candidateDivisor", 6, 60, 1, 1]],
    phases: [
      { phase: "pre", actions: [["firstNumber", 60], ["candidateDivisor", 60]], values: [["firstNumber", 60], ["candidateDivisor", 60]], publicState: [["mode", "factor-pairs"], ["firstNumber", 60], ["secondNumber", 18], ["candidateDivisor", 60]], visible: [["remainder-test", "data-viz-dividend", "60", 0], ["remainder-test", "data-viz-divisor", "60", 0]], selector: '[data-viz-name="remainder-test"]' },
      { phase: "clamp", actions: [["firstNumber", 1]], values: [["firstNumber", 1], ["candidateDivisor", 1]], publicState: [["mode", "factor-pairs"], ["firstNumber", 1], ["secondNumber", 18], ["candidateDivisor", 1]], visible: [["remainder-test", "data-viz-dividend", "1", 0], ["remainder-test", "data-viz-divisor", "1", 0]], selector: '[data-viz-name="remainder-test"]' },
      { phase: "expand", actions: [["firstNumber", 60]], values: [["firstNumber", 60], ["candidateDivisor", 1]], publicState: [["mode", "factor-pairs"], ["firstNumber", 60], ["secondNumber", 18], ["candidateDivisor", 1]], visible: [["remainder-test", "data-viz-dividend", "60", 0], ["remainder-test", "data-viz-divisor", "1", 0]], selector: '[data-viz-name="remainder-test"]' },
    ],
    restoration: { modeId: "factor-pairs", values: [["firstNumber", 24], ["candidateDivisor", 6]], publicState: [["mode", "factor-pairs"], ["firstNumber", 24], ["secondNumber", 18], ["candidateDivisor", 6]], descriptors: [["firstNumber", 60, 1, 1, "range", true, "divisor-within-number-v1", []], ["candidateDivisor", 24, 1, 1, "range", true, "divisor-within-number-v1", []]] },
  },
  {
    sequenceId: "p5-first-proper-fraction", labId: "p5-fractions-operations", modeId: "three", domainId: "proper-fractions-v1",
    modePreparation: [["operation", "subtract"], ["term-count", "three"]], controllerControlId: "firstDenominator", dependentControlId: "firstNumerator",
    expectedLiveDescriptors: [["firstNumerator", 1, 1, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 2, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 3, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    descriptorEnvelope: [["firstNumerator", 1, 5, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 2, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 3, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    phases: [
      { phase: "pre", actions: [["firstDenominator", 6], ["firstNumerator", 5]], values: [["firstNumerator", 5], ["firstDenominator", 6], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "5/6"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "5", 0], ["source-fraction-bar", "data-viz-denominator", "6", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "clamp", actions: [["firstDenominator", 2]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "expand", actions: [["firstDenominator", 6]], values: [["firstNumerator", 1], ["firstDenominator", 6], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/6"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "6", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
    ],
    restoration: { modeId: "three", values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "add"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], descriptors: [["firstNumerator", 1, 0, 1, "range", true, "proper-fractions-v1", []], ["firstDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["secondNumerator", 2, 0, 1, "range", true, "proper-fractions-v1", []], ["secondDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["thirdNumerator", 3, 0, 1, "range", true, "proper-fractions-v1", []], ["thirdDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []]] },
  },
  {
    sequenceId: "p5-second-proper-fraction", labId: "p5-fractions-operations", modeId: "three", domainId: "proper-fractions-v1",
    modePreparation: [["operation", "subtract"], ["term-count", "three"]], controllerControlId: "secondDenominator", dependentControlId: "secondNumerator",
    expectedLiveDescriptors: [["firstNumerator", 1, 1, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 2, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 3, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    descriptorEnvelope: [["firstNumerator", 1, 1, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 5, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 3, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    phases: [
      { phase: "pre", actions: [["secondDenominator", 6], ["secondNumerator", 5]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 5], ["secondDenominator", 6], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "5/6"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "5", 1], ["source-fraction-bar", "data-viz-denominator", "6", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "clamp", actions: [["secondDenominator", 2]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 2], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/2"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "2", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "expand", actions: [["secondDenominator", 6]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 6], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/6"], ["thirdFraction", "1/4"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "6", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "4", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
    ],
    restoration: { modeId: "three", values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "add"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], descriptors: [["firstNumerator", 1, 0, 1, "range", true, "proper-fractions-v1", []], ["firstDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["secondNumerator", 2, 0, 1, "range", true, "proper-fractions-v1", []], ["secondDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["thirdNumerator", 3, 0, 1, "range", true, "proper-fractions-v1", []], ["thirdDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []]] },
  },
  {
    sequenceId: "p5-third-proper-fraction", labId: "p5-fractions-operations", modeId: "three", domainId: "proper-fractions-v1",
    modePreparation: [["operation", "subtract"], ["term-count", "three"]], controllerControlId: "thirdDenominator", dependentControlId: "thirdNumerator",
    expectedLiveDescriptors: [["firstNumerator", 1, 1, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 2, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 3, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    descriptorEnvelope: [["firstNumerator", 1, 1, 0, 1], ["firstDenominator", 2, 6, 2, 1], ["secondNumerator", 1, 2, 0, 1], ["secondDenominator", 3, 6, 2, 1], ["thirdNumerator", 1, 5, 0, 1], ["thirdDenominator", 4, 6, 2, 1]],
    phases: [
      { phase: "pre", actions: [["thirdDenominator", 6], ["thirdNumerator", 5]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 5], ["thirdDenominator", 6]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "5/6"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "5", 2], ["source-fraction-bar", "data-viz-denominator", "6", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "clamp", actions: [["thirdDenominator", 2]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 2]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/2"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "2", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
      { phase: "expand", actions: [["thirdDenominator", 6]], values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 6]], publicState: [["operation", "subtract"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/6"]], visible: [["source-fraction-bar", "data-viz-numerator", "1", 0], ["source-fraction-bar", "data-viz-denominator", "2", 0], ["source-fraction-bar", "data-viz-numerator", "1", 1], ["source-fraction-bar", "data-viz-denominator", "3", 1], ["source-fraction-bar", "data-viz-numerator", "1", 2], ["source-fraction-bar", "data-viz-denominator", "6", 2]], selector: '[data-viz-name="source-fraction-bar"]' },
    ],
    restoration: { modeId: "three", values: [["firstNumerator", 1], ["firstDenominator", 2], ["secondNumerator", 1], ["secondDenominator", 3], ["thirdNumerator", 1], ["thirdDenominator", 4]], publicState: [["operation", "add"], ["termCount", "three"], ["firstFraction", "1/2"], ["secondFraction", "1/3"], ["thirdFraction", "1/4"]], descriptors: [["firstNumerator", 1, 0, 1, "range", true, "proper-fractions-v1", []], ["firstDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["secondNumerator", 2, 0, 1, "range", true, "proper-fractions-v1", []], ["secondDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []], ["thirdNumerator", 3, 0, 1, "range", true, "proper-fractions-v1", []], ["thirdDenominator", 6, 2, 1, "range", true, "proper-fractions-v1", []]] },
  },
  {
    sequenceId: "p5-visible-volume-layers", labId: "p5-volume", modeId: "__default__",
    domainId: "visible-layers-v1", modePreparation: [], controllerControlId: "height", dependentControlId: "visibleLayers",
    expectedLiveDescriptors: [["length", 4, 5, 1, 1], ["width", 3, 4, 1, 1], ["height", 3, 4, 1, 1], ["visibleLayers", 2, 3, 1, 1]],
    descriptorEnvelope: [["length", 4, 5, 1, 1], ["width", 3, 4, 1, 1], ["height", 3, 4, 1, 1], ["visibleLayers", 2, 4, 1, 1]],
    phases: [
      { phase: "pre", actions: [["height", 4], ["visibleLayers", 4]], values: [["length", 4], ["width", 3], ["height", 4], ["visibleLayers", 4]], publicState: [["length", 4], ["width", 3], ["height", 4], ["visibleLayers", 4]], visible: [["layer-stack", "data-viz-visible-layers", "4", 0], ["layer-stack", "data-viz-total-layers", "4", 0]], selector: '[data-viz-name="layer-stack"]' },
      { phase: "clamp", actions: [["height", 1]], values: [["length", 4], ["width", 3], ["height", 1], ["visibleLayers", 1]], publicState: [["length", 4], ["width", 3], ["height", 1], ["visibleLayers", 1]], visible: [["layer-stack", "data-viz-visible-layers", "1", 0], ["layer-stack", "data-viz-total-layers", "1", 0]], selector: '[data-viz-name="layer-stack"]' },
      { phase: "expand", actions: [["height", 4]], values: [["length", 4], ["width", 3], ["height", 4], ["visibleLayers", 1]], publicState: [["length", 4], ["width", 3], ["height", 4], ["visibleLayers", 1]], visible: [["layer-stack", "data-viz-visible-layers", "1", 0], ["layer-stack", "data-viz-total-layers", "4", 0]], selector: '[data-viz-name="layer-stack"]' },
    ],
    restoration: { modeId: "__default__", values: [["length", 4], ["width", 3], ["height", 3], ["visibleLayers", 2]], publicState: [["length", 4], ["width", 3], ["height", 3], ["visibleLayers", 2]], descriptors: [["length", 5, 1, 1, "range", true, "visible-layers-v1", []], ["width", 4, 1, 1, "range", true, "visible-layers-v1", []], ["height", 4, 1, 1, "range", true, "visible-layers-v1", []], ["visibleLayers", 3, 1, 1, "range", true, "visible-layers-v1", []]] },
  },
  {
    sequenceId: "s3-identity-a-projects-b", labId: "identities-square-patterns", modeId: "square-sum",
    domainId: "identity-positive-a-gt-b-v1", modePreparation: [["model", "square-sum"]], controllerControlId: "a", dependentControlId: "b",
    expectedLiveDescriptors: [["a", 6, 10, 2, 1], ["b", 2, 9, 1, 1]], descriptorEnvelope: [["a", 6, 10, 2, 1], ["b", 2, 9, 1, 1]],
    phases: [
      { phase: "pre", actions: [["a", 10], ["b", 9]], values: [["a", 10], ["b", 9]], publicState: [["a", 10], ["b", 9], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "10", 0], ["identity-square-whole", "data-viz-b", "9", 0]], selector: '[data-viz-name="identity-square-whole"]' },
      { phase: "clamp", actions: [["a", 2]], values: [["a", 2], ["b", 1]], publicState: [["a", 2], ["b", 1], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "2", 0], ["identity-square-whole", "data-viz-b", "1", 0]], selector: '[data-viz-name="identity-square-whole"]' },
      { phase: "expand", actions: [["a", 10]], values: [["a", 10], ["b", 1]], publicState: [["a", 10], ["b", 1], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "10", 0], ["identity-square-whole", "data-viz-b", "1", 0]], selector: '[data-viz-name="identity-square-whole"]' },
    ],
    restoration: { modeId: "square-sum", values: [["a", 6], ["b", 2]], publicState: [["a", 6], ["b", 2], ["activeMode", "square-sum"]], descriptors: [["a", 10, 2, 1, "range", true, "identity-positive-a-gt-b-v1", []], ["b", 9, 1, 1, "range", true, "identity-positive-a-gt-b-v1", []]] },
  },
  {
    sequenceId: "s3-identity-b-projects-a", labId: "identities-square-patterns", modeId: "square-sum",
    domainId: "identity-positive-a-gt-b-v1", modePreparation: [["model", "square-sum"]], controllerControlId: "b", dependentControlId: "a",
    expectedLiveDescriptors: [["a", 6, 10, 2, 1], ["b", 2, 9, 1, 1]], descriptorEnvelope: [["a", 6, 10, 2, 1], ["b", 2, 9, 1, 1]],
    phases: [
      { phase: "pre", actions: [["a", 2], ["b", 1]], values: [["a", 2], ["b", 1]], publicState: [["a", 2], ["b", 1], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "2", 0], ["identity-square-whole", "data-viz-b", "1", 0]], selector: '[data-viz-name="identity-square-whole"]' },
      { phase: "clamp", actions: [["b", 9]], values: [["a", 10], ["b", 9]], publicState: [["a", 10], ["b", 9], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "10", 0], ["identity-square-whole", "data-viz-b", "9", 0]], selector: '[data-viz-name="identity-square-whole"]' },
      { phase: "expand", actions: [["b", 1]], values: [["a", 10], ["b", 1]], publicState: [["a", 10], ["b", 1], ["activeMode", "square-sum"]], visible: [["identity-square-whole", "data-viz-a", "10", 0], ["identity-square-whole", "data-viz-b", "1", 0]], selector: '[data-viz-name="identity-square-whole"]' },
    ],
    restoration: { modeId: "square-sum", values: [["a", 6], ["b", 2]], publicState: [["a", 6], ["b", 2], ["activeMode", "square-sum"]], descriptors: [["a", 10, 2, 1, "range", true, "identity-positive-a-gt-b-v1", []], ["b", 9, 1, 1, "range", true, "identity-positive-a-gt-b-v1", []]] },
  },
] as const);

function compactDependentTransitionPlan(
  plan: HkVisualizationDependentTransitionSequencePlan,
) {
  const descriptor = ({ controlId, initial, maximum, minimum, step }: HkVisualizationRangeDescriptor) =>
    [controlId, initial, maximum, minimum, step];
  const values = (items: readonly Readonly<{ controlId: string; value: number }>[]) =>
    items.map(({ controlId, value }) => [controlId, value]);
  const publicState = (items: readonly Readonly<{ key: string; value: boolean | number | string }>[]) =>
    items.map(({ key, value }) => [key, value]);
  const literalVisibleAttributes = new Set([
    "counter-set\u0000data-viz-total",
    "known-part-node\u0000__text",
    "missing-part-node\u0000__text",
    "directed-jump\u0000data-viz-operation",
    "directed-jump\u0000data-viz-start",
    "directed-jump\u0000data-viz-step",
    "directed-jump\u0000data-viz-end",
    "stationary-point\u0000data-viz-value",
    "payment-bar\u0000data-viz-payment",
    "price-segment\u0000data-viz-price",
    "remainder-test\u0000data-viz-dividend",
    "remainder-test\u0000data-viz-divisor",
    "source-fraction-bar\u0000data-viz-numerator",
    "source-fraction-bar\u0000data-viz-denominator",
    "layer-stack\u0000data-viz-visible-layers",
    "layer-stack\u0000data-viz-total-layers",
    "identity-square-whole\u0000data-viz-a",
    "identity-square-whole\u0000data-viz-b",
  ]);
  return {
    sequenceId: plan.sequenceId,
    labId: plan.labId,
    modeId: plan.modeId,
    domainId: plan.domainId,
    modePreparation: plan.modePreparation.map(({ groupId, modeId }) => [groupId, modeId]),
    controllerControlId: plan.controllerControlId,
    dependentControlId: plan.dependentControlId,
    expectedLiveDescriptors: plan.expectedLiveDescriptors.map(descriptor),
    descriptorEnvelope: plan.descriptorEnvelope.map(descriptor),
    phases: plan.phases.map((phase) => ({
      phase: phase.phase,
      actions: phase.actions.map(({ controlId, requestedValue }) => [controlId, requestedValue]),
      values: values(phase.expectedValues),
      publicState: publicState(phase.expectedPublicState),
      visible: phase.visibleBindings
        .filter(({ vizName, attribute }) =>
          literalVisibleAttributes.has(`${vizName}\u0000${attribute}`)
        )
        .map(({ vizName, attribute, expectedValue, occurrence }) => [vizName, attribute, expectedValue, occurrence]),
      selector: phase.visibleSelector,
    })),
    restoration: {
      modeId: plan.postSequenceRestoration.modeId,
      values: values(plan.postSequenceRestoration.expectedValues),
      publicState: publicState(plan.postSequenceRestoration.expectedPublicState),
      descriptors: plan.postSequenceRestoration.expectedDescriptors.map((item) => [
        item.controlId,
        item.maximum,
        item.minimum,
        item.step,
        item.visibility,
        item.enabled,
        item.domainId,
        [...item.excludedValues],
      ]),
    },
  };
}

function observationForDependentTransitionPlan(
  plan: HkVisualizationDependentTransitionSequencePlan,
  cellId = `cell:${plan.labId}:en:light:desktop`,
  language: "en" | "zh" | "zh-Hans" = "en",
): HkVisualizationDependentTransitionSequenceObservation {
  const themes = cellId.split(/[/:]/u).filter(
    (part): part is "dark" | "light" => part === "dark" || part === "light",
  );
  assert.equal(themes.length, 1);
  const theme = themes[0];
  const surface = {
    renderedSize: { height: 360, width: 640 },
    scrollport: {
      clientHeight: 360,
      clientWidth: 390,
      maxScrollLeft: 250,
      scrollHeight: 360,
      scrollWidth: 640,
    },
    tagName: "svg" as const,
    viewBox: { height: 360, width: 640, x: 0, y: 0 },
  };
  const visibleSnapshot = (
    visibleBindings: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleBindings"],
    visibleTextContracts: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleTextContracts"],
    visibleMathContracts: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleMathContracts"],
    visibleMathProjectionContract: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleMathProjectionContract"],
  ) => {
    const byName = new Map<string, Array<Map<string, string>>>();
    for (const binding of visibleBindings) {
      const elements = byName.get(binding.vizName) ?? [];
      while (elements.length <= binding.occurrence) {
        elements.push(new Map([["data-viz-name", binding.vizName]]));
      }
      if (!["__tag", "__text"].includes(binding.attribute)) {
        elements[binding.occurrence].set(binding.attribute, binding.expectedValue);
      }
      byName.set(binding.vizName, elements);
    }
    let elementIndex = 0;
    const visibleElements = [...byName.entries()].flatMap(([vizName, elements]) =>
      elements.map((attributes, occurrence) => {
        const x = 130 + elementIndex * 170;
        elementIndex += 1;
        const tagName = visibleBindings.find((binding) =>
          binding.vizName === vizName &&
          binding.occurrence === occurrence &&
          binding.attribute === "__tag"
        )?.expectedValue ?? "g";
        const text = visibleTextContracts.find((contract) =>
          contract.vizName === vizName && contract.occurrence === occurrence
        )?.expectedTexts[language] ?? "";
        const mathContract = visibleMathContracts.find((contract) =>
          contract.vizName === vizName && contract.occurrence === occurrence
        );
        assert.ok(mathContract);
        return {
          attributes: [...attributes].sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          ),
          learnerVisible: true,
          paintedSubtree: {
            elementCount: mathContract.elementCount,
            hash: mathContract.expectedHashes[language],
          },
          renderedGeometry: { height: 80, width: 120, x, y: 140 },
          tagName,
          textHash: createHash("sha256").update(text).digest("hex"),
          userGeometry: { height: 80, width: 120, x, y: 140 },
        };
      }),
    );
    return {
      surface,
      visibleElements,
      visibleMathProjection: {
        ancestryScaleSummary:
          visibleMathProjectionContract.expectedAncestryScaleSummaries[
            language
          ][theme],
        elementCount: visibleMathProjectionContract.elementCount,
        hash: visibleMathProjectionContract.expectedHashes[language][theme],
      },
    };
  };
  const phases = plan.phases.map((phase) => {
    const snapshot = visibleSnapshot(
      phase.visibleBindings,
      phase.visibleTextContracts,
      phase.visibleMathContracts,
      phase.visibleMathProjectionContract,
    );
    return {
      controls: phase.expectedValues.map((value, index) => ({
        controlId: value.controlId,
        descriptor: phase.expectedDescriptors[index],
        value: value.value,
      })),
      id: phase.id,
      phase: phase.phase,
      rawSerializedPublicState: JSON.stringify(
        Object.fromEntries(
          phase.expectedPublicState.map(({ key, value }) => [key, value]),
        ),
      ),
      resetCountSincePreviousPhase: phase.resetCountSincePreviousPhase,
      stateSignature: phase.expectedStateSignature,
      surface: snapshot.surface,
      visibleElements: snapshot.visibleElements,
      visibleMathProjection: snapshot.visibleMathProjection,
    };
  });
  const canonicalSnapshot = visibleSnapshot(
    plan.postSequenceRestoration.visibleBindings,
    plan.postSequenceRestoration.visibleTextContracts,
    plan.postSequenceRestoration.visibleMathContracts,
    plan.postSequenceRestoration.visibleMathProjectionContract,
  );
  const unhashedBaseline = {
    baselineHash: "",
    canonicalFingerprint: `canonical:${plan.labId}`,
    cellId,
    language,
    planHash: plan.planHash,
    sequenceId: plan.sequenceId,
    surface: canonicalSnapshot.surface,
    theme,
    visibleElements: canonicalSnapshot.visibleElements,
    visibleMathProjection: canonicalSnapshot.visibleMathProjection,
  };
  const canonicalVisibleBaseline = {
    ...unhashedBaseline,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        unhashedBaseline,
      ),
  };
  const unhashed = {
    cellId,
    canonicalVisibleBaseline,
    domainId: plan.domainId,
    labId: plan.labId,
    language,
    modePreparation: plan.modePreparation,
    modeId: plan.modeId,
    observationHash: "",
    phases,
    planHash: plan.planHash,
    postSequenceRestoration: {
      afterFingerprint: `canonical:${plan.labId}`,
      beforeFingerprint: `expanded:${plan.sequenceId}`,
      canonicalFingerprint: `canonical:${plan.labId}`,
      controls: plan.postSequenceRestoration.expectedValues.map((value, index) => ({
        controlId: value.controlId,
        descriptor: plan.postSequenceRestoration.expectedDescriptors[index],
        value: value.value,
      })),
      rawSerializedPublicState: JSON.stringify(Object.fromEntries(
        plan.postSequenceRestoration.expectedPublicState.map(({ key, value }) => [key, value]),
      )),
      resetClickCount: 1,
      stateSignature: plan.postSequenceRestoration.expectedStateSignature,
      canonicalVisibleBaselineHash: canonicalVisibleBaseline.baselineHash,
      surface: canonicalSnapshot.surface,
      visibleElements: canonicalSnapshot.visibleElements,
      visibleMathProjection: canonicalSnapshot.visibleMathProjection,
    },
    schemaVersion: plan.schemaVersion,
    sequenceId: plan.sequenceId,
    theme,
  } satisfies HkVisualizationDependentTransitionSequenceObservation;
  return {
    ...unhashed,
    observationHash:
      hashHkVisualizationDependentTransitionSequenceObservation(unhashed),
  };
}

function rehashDependentTransitionObservation(
  observation: HkVisualizationDependentTransitionSequenceObservation,
) {
  const unhashed = { ...observation, observationHash: "" };
  return {
    ...unhashed,
    observationHash:
      hashHkVisualizationDependentTransitionSequenceObservation(unhashed),
  };
}

test("dependent transition plans freeze exact 11 order, exact three phases, and no resurrection", () => {
  const plans = allDependentTransitionPlans();
  assert.equal(plans.length, HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_EXPECTED_COUNT);
  assert.deepEqual(
    plans.map(({ sequenceId }) => sequenceId),
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_IDS,
  );
  assert.ok(plans.every(({ phases }) =>
    phases.length === 3 &&
    phases.every(({ phase }, index) => phase === HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS[index]) &&
    phases.map(({ resetCountSincePreviousPhase }) => resetCountSincePreviousPhase).join(",") === "1,0,0",
  ));
  for (const plan of plans) {
    const clampValue = plan.phases[1].expectedValues.find(
      ({ controlId }) => controlId === plan.dependentControlId,
    )?.value;
    const expandValue = plan.phases[2].expectedValues.find(
      ({ controlId }) => controlId === plan.dependentControlId,
    )?.value;
    assert.equal(expandValue, clampValue, plan.sequenceId);
    assert.equal(plan.planHash.length, 64);
  }
  assert.deepEqual(
    buildHkVisualizationDependentTransitionSequencePlans({
      descriptors: fractionBarRanges,
      domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
      labId: HK_FRACTION_BAR_LAB_ID,
      modeId: "fraction",
    }),
    [],
  );
});

test("dependent transition producer matches the independent literal exact-11 contract", () => {
  const plans = allDependentTransitionPlans();
  assert.equal(independentDependentTransitionLiteralTable.length, 11);
  assert.deepEqual(
    plans.map(compactDependentTransitionPlan),
    independentDependentTransitionLiteralTable,
  );
  const source = fs.readFileSync(
    "tests/e2e/hk-visualization-range-state-ledger.test.ts",
    "utf8",
  );
  const literalSlice = source.slice(
    source.indexOf("const independentDependentTransitionLiteralTable"),
    source.indexOf("function compactDependentTransitionPlan"),
  );
  assert.doesNotMatch(literalSlice, /\.map\s*\(/);
  assert.doesNotMatch(literalSlice, /\.flatMap\s*\(/);
  assert.doesNotMatch(literalSlice, /\.\.\.\s*\(/);
  assert.doesNotMatch(
    literalSlice,
    /HK_VISUALIZATION_DEPENDENT_TRANSITION|dependentTransitionCases|buildHkVisualizationDependentTransition/,
  );
});

test("dependent transition helper range seam validates exact seven-key live shape before five-key projection", () => {
  const live = [
    {
      initial: 24,
      maximum: 60,
      minimum: 1,
      step: 1,
      contractIndex: 0,
      controlId: "firstNumber",
      selector: '[data-control="firstNumber"]',
    },
    {
      initial: 6,
      maximum: 24,
      minimum: 1,
      step: 1,
      contractIndex: 2,
      controlId: "candidateDivisor",
      selector: '[data-control="candidateDivisor"]',
    },
  ];
  const contractControlIds = ["firstNumber", "secondNumber", "candidateDivisor"];
  const contractSelectors = [
    '[data-control="firstNumber"]',
    '[data-control="secondNumber"]',
    '[data-control="candidateDivisor"]',
  ];
  assert.deepEqual(
    projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds,
      contractSelectors,
      liveRanges: live,
    }),
    [
      { controlId: "firstNumber", initial: 24, maximum: 60, minimum: 1, step: 1 },
      { controlId: "candidateDivisor", initial: 6, maximum: 24, minimum: 1, step: 1 },
    ],
  );
  const permutedLive = live.map((range) => ({
    selector: range.selector,
    controlId: range.controlId,
    contractIndex: range.contractIndex,
    step: range.step,
    minimum: range.minimum,
    maximum: range.maximum,
    initial: range.initial,
  }));
  assert.deepEqual(
    projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds,
      contractSelectors,
      liveRanges: permutedLive,
    }),
    [
      { controlId: "firstNumber", initial: 24, maximum: 60, minimum: 1, step: 1 },
      { controlId: "candidateDivisor", initial: 6, maximum: 24, minimum: 1, step: 1 },
    ],
  );
  assert.throws(
    () => projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds: [
        "firstNumber",
        "firstNumber",
        "candidateDivisor",
      ],
      contractSelectors,
      liveRanges: live,
    }),
    /unique.*control|control.*unique/i,
  );
  assert.throws(
    () => projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds,
      contractSelectors: [
        contractSelectors[0],
        contractSelectors[0],
        contractSelectors[2],
      ],
      liveRanges: live,
    }),
    /unique.*selector|selector.*unique/i,
  );
  const huge = "x".repeat(8_193);
  assert.throws(
    () => projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds: [huge, ...contractControlIds.slice(1)],
      contractSelectors,
      liveRanges: [{ ...live[0], controlId: huge }, live[1]],
    }),
    /byte limit/i,
  );

  const corruptions: unknown[] = [
    [{ ...live[0], unexpected: true }, live[1]],
    [{ ...live[0], maximum: Number.NaN }, live[1]],
    [{ ...live[0], contractIndex: -1 }, live[1]],
    [{ ...live[0], contractIndex: 0.5 }, live[1]],
    [live[0], { ...live[1], contractIndex: 0 }],
    [live[0], { ...live[1], contractIndex: 1 }],
    [live[0], { ...live[1], controlId: "secondNumber" }],
    [live[0], { ...live[1], selector: contractSelectors[1] }],
  ];
  const inherited = Object.create({ inherited: true });
  Object.assign(inherited, live[0]);
  corruptions.push([inherited, live[1]]);
  const nonEnumerable = { ...live[0] };
  Object.defineProperty(nonEnumerable, "hidden", { enumerable: false, value: true });
  corruptions.push([nonEnumerable, live[1]]);
  const symbolKey = { ...live[0], [Symbol("hidden")]: true };
  corruptions.push([symbolKey, live[1]]);
  const accessorRange = { ...live[0] };
  Object.defineProperty(accessorRange, "maximum", {
    enumerable: true,
    get: () => live[0].maximum,
  });
  corruptions.push([accessorRange, live[1]]);
  corruptions.push([new Proxy(live[0], {}), live[1]]);
  const sparse = [live[0], live[1]];
  delete sparse[0];
  corruptions.push(sparse);
  for (const liveRanges of corruptions) {
    assert.throws(
      () => projectExactHkDependentTransitionLiveRangeDescriptors({
        contractControlIds,
        contractSelectors,
        liveRanges,
      }),
      /exact|plain|dense|finite|contractIndex|controlId|selector/i,
    );
  }
});

test("dependent transition schemas reject negative zero before JSON or hash aliasing", () => {
  const live = [{
    initial: 24,
    maximum: 60,
    minimum: -0,
    step: 1,
    contractIndex: 0,
    controlId: "firstNumber",
    selector: '[data-control="firstNumber"]',
  }];
  assert.throws(
    () => projectExactHkDependentTransitionLiveRangeDescriptors({
      contractControlIds: ["firstNumber"],
      contractSelectors: ['[data-control="firstNumber"]'],
      liveRanges: live,
    }),
    /negative zero/i,
  );

  const plan = allDependentTransitionPlans()[0];
  const phase = plan.phases[0];
  const planCorruptions = [
    {
      ...plan,
      phases: [{
        ...phase,
        expectedValues: [
          { ...phase.expectedValues[0], value: -0 },
          ...phase.expectedValues.slice(1),
        ],
      }, ...plan.phases.slice(1)],
    },
    {
      ...plan,
      phases: [{
        ...phase,
        expectedDescriptors: [{
          ...phase.expectedDescriptors[0],
          excludedValues: [-0],
        }, ...phase.expectedDescriptors.slice(1)],
      }, ...plan.phases.slice(1)],
    },
    {
      ...plan,
      postSequenceRestoration: {
        ...plan.postSequenceRestoration,
        expectedValues: [{
          ...plan.postSequenceRestoration.expectedValues[0],
          value: -0,
        }, ...plan.postSequenceRestoration.expectedValues.slice(1)],
      },
    },
  ];
  for (const corrupted of planCorruptions) {
    assert.throws(
      () => hashHkVisualizationDependentTransitionSequencePlan(
        corrupted as HkVisualizationDependentTransitionSequencePlan,
      ),
      /negative zero/i,
    );
  }

  const clean = observationForDependentTransitionPlan(plan);
  const observationCorruptions = [
    {
      ...clean,
      phases: [{
        ...clean.phases[0],
        controls: [{
          ...clean.phases[0].controls[0],
          value: -0,
        }, ...clean.phases[0].controls.slice(1)],
      }, ...clean.phases.slice(1)],
    },
    {
      ...clean,
      postSequenceRestoration: {
        ...clean.postSequenceRestoration,
        controls: [{
          ...clean.postSequenceRestoration.controls[0],
          descriptor: {
            ...clean.postSequenceRestoration.controls[0].descriptor,
            excludedValues: [-0],
          },
        }, ...clean.postSequenceRestoration.controls.slice(1)],
      },
    },
  ];
  for (const corrupted of observationCorruptions) {
    assert.throws(
      () => hashHkVisualizationDependentTransitionSequenceObservation(
        corrupted as HkVisualizationDependentTransitionSequenceObservation,
      ),
      /negative zero/i,
    );
  }
});

test("dependent transition schema traversal has one cumulative budget before hashing", () => {
  const plan = allDependentTransitionPlans()[0];
  const multiplicative = {
    ...plan,
    phases: Array.from({ length: 512 }, () => plan.phases[0]),
  } as unknown as HkVisualizationDependentTransitionSequencePlan;
  assert.throws(
    () => hashHkVisualizationDependentTransitionSequencePlan(multiplicative),
    /cumulative.*budget/i,
  );
});

test("dependent transition visible audit rejects rehashed changed text and offscreen geometry", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const phase = clean.phases[0];
  const changedText = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [{
        ...phase.visibleElements[0],
        textHash: createHash("sha256")
          .update("SECRET_VISUAL_TEXT_SHOULD_NEVER_BE_ACCEPTED")
          .digest("hex"),
      }, ...phase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  const offscreen = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [{
        ...phase.visibleElements[0],
        userGeometry: {
          ...phase.visibleElements[0].userGeometry,
          x: 999_999,
        },
      }, ...phase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, changedText)
      .some((issue) => /visible|text|baseline|bounds/i.test(issue)),
  );
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, offscreen)
      .some((issue) => /visible|geometry|bounds|viewport|model/i.test(issue)),
  );
});

test("dependent transition visible math rejects fully rehashed wrong in-bounds path, rect, and circle geometry", () => {
  const cases = [
    { sequenceId: "p1-add-step", phaseIndex: 0, tagName: "path" },
    { sequenceId: "p2-payment-at-least-price", phaseIndex: 0, tagName: "rect" },
    { sequenceId: "p1-add-step", phaseIndex: 1, tagName: "circle" },
  ] as const;
  for (const expected of cases) {
    const plan = allDependentTransitionPlans().find(
      ({ sequenceId }) => sequenceId === expected.sequenceId,
    );
    assert.ok(plan);
    const clean = observationForDependentTransitionPlan(plan);
    const phase = clean.phases[expected.phaseIndex];
    const element = phase.visibleElements[0];
    assert.equal(element.tagName, expected.tagName);
    const corrupted = rehashDependentTransitionObservation({
      ...clean,
      phases: clean.phases.map((candidate, index) => index === expected.phaseIndex
        ? {
            ...candidate,
            visibleElements: [{
              ...element,
              paintedSubtree: {
                ...element.paintedSubtree,
                hash: createHash("sha256")
                  .update(`fully-rehashed-wrong-in-bounds-${expected.tagName}`)
                  .digest("hex"),
              },
              renderedGeometry: {
                ...element.renderedGeometry,
                x: element.renderedGeometry.x + 1,
              },
              userGeometry: {
                ...element.userGeometry,
                x: element.userGeometry.x + 1,
              },
            }, ...candidate.visibleElements.slice(1)],
          }
        : candidate),
    });
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(plan, corrupted)
        .some((issue) => /visible math|painted subtree|geometry contract/i.test(issue)),
      `${expected.sequenceId}:${expected.tagName} accepted rehashed wrong in-bounds math geometry`,
    );
  }
});

test("dependent transition visible math rejects a fully rehashed wrong primitive count", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const phase = clean.phases[0];
  const element = phase.visibleElements[0];
  const corrupted = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [{
        ...element,
        paintedSubtree: {
          elementCount: element.paintedSubtree.elementCount + 1,
          hash: createHash("sha256")
            .update("fully-rehashed-wrong-primitive-count")
            .digest("hex"),
        },
      }, ...phase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, corrupted)
      .some((issue) => /visible math|painted subtree|primitive count/i.test(issue)),
  );
});

test("dependent transition visible math rejects a fully rehashed contradictory descendant data-viz attribute", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p4-divisor-within-number",
  );
  assert.ok(plan);
  const clean = observationForDependentTransitionPlan(plan);
  const phase = clean.phases[0];
  const element = phase.visibleElements[0];
  const corrupted = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [{
        ...element,
        paintedSubtree: {
          ...element.paintedSubtree,
          hash: createHash("sha256")
            .update("rehashed-descendant:data-viz-remainder=contradictory")
            .digest("hex"),
        },
      }, ...phase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, corrupted)
      .some((issue) => /visible math|painted subtree|semantic attribute/i.test(issue)),
  );
});

test("dependent transition visible math rejects a fully rehashed hidden critical descendant", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p5-visible-volume-layers",
  );
  assert.ok(plan);
  const clean = observationForDependentTransitionPlan(plan);
  const phase = clean.phases[0];
  const element = phase.visibleElements[0];
  const corrupted = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [{
        ...element,
        paintedSubtree: {
          ...element.paintedSubtree,
          hash: createHash("sha256")
            .update("rehashed-hidden-critical-descendant")
            .digest("hex"),
        },
      }, ...phase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, corrupted)
      .some((issue) => /visible math|painted subtree|critical descendant/i.test(issue)),
  );
});

type DesiredVisibleMathColor = Readonly<
  | { kind: "none" }
  | {
      alpha: number;
      blue: number;
      green: number;
      kind: "solid-srgb";
      red: number;
    }
>;

type DesiredVisibleMathProjection = Readonly<{
  nodes: readonly Readonly<{
    computedGeometry: readonly (readonly [string, string])[];
    computedRender: Readonly<Record<string, string>>;
    coordinateMatrix: readonly number[];
    geometryAttributes: readonly (readonly [string, string])[];
    learnerVisible: boolean;
    paint: null | Readonly<{
      fill: DesiredVisibleMathColor;
      fillOpacity: number;
      opacity: number;
      stroke: DesiredVisibleMathColor;
      strokeOpacity: number;
      strokeWidth: number;
    }>;
    parentIndex: number;
    opacityFactors: Readonly<{
      localOpacity: number;
      svgAncestorOpacityProduct: number;
      wrapperOpacityProduct: number;
    }>;
    semanticAttributes: readonly (readonly [string, string])[];
    tagName: string;
    textHash: string;
  }>[];
  surface: Readonly<{
    ancestryScaleSummary: Readonly<{
      ancestorHash: string;
      chainCount: number;
      effectHash: string;
      entryCount: number;
      policyVersion: "visible-math-ancestry-scale-summary.v1";
      scaleHash: string;
      scaleWitnessCount: 3;
    }>;
    documentAncestorAudit: Readonly<{
      bodyOverflowX: "hidden";
      clippingAncestorCount: 2;
      opacityProduct: number;
      policy: "safe-effects-through-document-element-v3";
    }>;
    ownerProjection: Readonly<{
      ariaLabelHash: string;
      attributeCount: number;
      attributeNames: readonly string[];
      attributeSummaryHash: string;
      dataVizInteractive: "absent" | "false" | "true";
      effectPolicy: "safe-owner-effects-v2";
      opacity: number;
      role: "group" | "img";
      surfaceIdentity: string;
      titleDescTopology: readonly Readonly<{
        tagName: "desc" | "title";
        textHash: string;
      }>[];
    }>;
    preserveAspectRatio: string;
    scrollportCssTransform: "none";
    svgCssTransform: "none";
    viewBox: Readonly<{ height: number; width: number; x: number; y: number }>;
    viewportMatrix: readonly number[];
    wrapperTopology: readonly Readonly<{
      animationName: "none";
      clipPath: "none";
      contentVisibility: "visible";
      cssTransform: "none";
      display: "block" | "grid";
      filter: "none";
      isolation: "auto";
      mask: "none";
      mixBlendMode: "normal";
      opacity: number;
      overflowX: "auto" | "visible";
      overflowY: "auto" | "visible";
      perspective: "none";
      role: string;
      rotate: "none";
      scale: "none";
      tagName: string;
      topicId: string;
      transitionDuration: "0s";
      translate: "none";
      visibility: "visible";
      zoom: number;
    }>[];
  }>;
}>;

type RawVisibleMathProjection = {
  nodes: Array<{
    computedGeometry: Array<[string, string]>;
    computedRender: Record<string, string>;
    coordinateMatrix: string[];
    cssTransform: string;
    effectivePaint: null | {
      clipPath: string;
      fill: string;
      fillOpacity: string;
      filter: string;
      mask: string;
      opacity: string;
      stroke: string;
      strokeOpacity: string;
      strokeWidth: string;
    };
    geometryAttributes: Array<[string, string]>;
    learnerVisible: boolean;
    parentIndex: number;
    opacityFactors: {
      localOpacity: string;
      svgAncestorOpacityProduct: string;
      wrapperOpacityProduct: string;
    };
    semanticAttributes: Array<[string, string]>;
    tagName: string;
    textHash: string;
    unsupportedIntermediateTransform: boolean;
  }>;
  surface: {
    documentAncestors: Array<{
      animationDuration: string;
      animationName: string;
      attributes: Array<[string, string]>;
      backdropFilter: string;
      clip: string;
      clipPath: string;
      contentVisibility: string;
      contain: string;
      cssTransform: string;
      display: string;
      filter: string;
      isolation: string;
      mask: string;
      maskImage: string;
      mixBlendMode: string;
      opacity: string;
      overflowX: string;
      overflowY: string;
      perspective: string;
      role: string;
      rotate: string;
      scale: string;
      tagName: string;
      transitionDuration: string;
      transitionProperty: string;
      translate: string;
      visibility: string;
      webkitBackdropFilter: string;
      zoom: string;
    }>;
    layoutSize: { height: number; width: number };
    ownerProjection: {
      attributes: Array<[string, string]>;
      computedEffects: {
        animationDuration: string;
        animationName: string;
        backdropFilter: string;
        clip: string;
        clipPath: string;
        contentVisibility: string;
        contain: string;
        cssTransform: string;
        display: string;
        filter: string;
        isolation: string;
        mask: string;
        maskImage: string;
        mixBlendMode: string;
        opacity: string;
        overflowX: string;
        overflowY: string;
        perspective: string;
        rotate: string;
        scale: string;
        transitionDuration: string;
        transitionProperty: string;
        translate: string;
        visibility: string;
        webkitBackdropFilter: string;
        zoom: string;
      };
      surfaceIdentity: string;
      titleDescTopology: Array<{ tagName: string; textHash: string }>;
    };
    preserveAspectRatio: string;
    renderedSize: { height: number; width: number };
    scrollportCssTransform: string;
    svgCssTransform: string;
    viewBox: { height: number; width: number; x: number; y: number };
    viewportMatrix: string[];
    wrapperTopology: Array<{
      animationName: string;
      clipPath: string;
      contentVisibility: string;
      cssTransform: string;
      display: string;
      filter: string;
      isolation: string;
      mask: string;
      mixBlendMode: string;
      opacity: string;
      overflowX: string;
      overflowY: string;
      perspective: string;
      role: string;
      rotate: string;
      scale: string;
      tagName: string;
      topicId: string;
      transitionDuration: string;
      translate: string;
      visibility: string;
      zoom: string;
    }>;
  };
};

function rawCssColor(color: DesiredVisibleMathColor) {
  if (color.kind === "none") return "none";
  assert.equal(typeof color.red, "number");
  assert.equal(typeof color.green, "number");
  assert.equal(typeof color.blue, "number");
  assert.equal(typeof color.alpha, "number");
  return color.alpha === 1
    ? `rgb(${color.red}, ${color.green}, ${color.blue})`
    : `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
}

function rawSafeSurfaceEffects(opacity = 1) {
  return {
    animationDuration: "0s",
    animationName: "none",
    backdropFilter: "none",
    clip: "auto",
    clipPath: "none",
    contentVisibility: "visible",
    contain: "none",
    cssTransform: "none",
    display: "block",
    filter: "none",
    isolation: "auto",
    mask: "none",
    maskImage: "none",
    mixBlendMode: "normal",
    opacity: String(opacity),
    overflowX: "visible",
    overflowY: "visible",
    perspective: "none",
    rotate: "none",
    scale: "none",
    transitionDuration: "0s",
    transitionProperty: "all",
    translate: "none",
    visibility: "visible",
    webkitBackdropFilter: "none",
    zoom: "1",
  };
}

function independentProductDocumentAncestors(args: Readonly<{
  analyticsSource: string;
  grade: string;
  labId: string;
  language: "en" | "zh" | "zh-Hans";
  theme: "dark" | "light";
}>): RawVisibleMathProjection["surface"]["documentAncestors"] {
  const { analyticsSource, grade, labId, language, theme } = args;
  const href = `/visualization-lab?grade=${grade}&track=all&lab=${labId}`;
  const safe = () => ({ ...rawSafeSurfaceEffects(1) });
  const workspaceLabel = {
    en: "Visualization Lab workspace",
    zh: "可視化實驗室工作區",
    "zh-Hans": "可视化实验室工作区",
  } as const;
  const htmlLanguage = {
    en: "en-HK",
    zh: "zh-Hant-HK",
    "zh-Hans": "zh-Hans-CN",
  } as const;
  return [
    {
      ...safe(),
      attributes: [
        ["class", "min-w-0"],
        ["data-hk-viz-dispatcher", "v1"],
        ["data-hk-viz-dispatcher-lab-id", labId],
        [
          "data-hk-viz-dispatcher-target",
          labId === "identities-square-patterns" ? "secondary" : "primary",
        ],
      ],
      role: "model-parent",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [
        ["class", "min-w-0"],
        ["data-viz-lesson-session-owner", "external-card"],
        ["data-viz-module-id", "configured-visualization-lab"],
        ["data-viz-production-renderer", "hk-dedicated"],
        ["data-viz-topic-id", labId],
      ],
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [
        ["data-viz-lab-runtime-ready-probe", labId],
        ["data-viz-lab-runtime-root", "true"],
      ],
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [["data-viz-card-body", "true"]],
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [
        ["class", "overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-6"],
        ["data-viz-card", "true"],
        ["data-viz-explore-gate", "engaged"],
        ["data-viz-module-id", `${analyticsSource}:${labId}:${labId}`],
        ["data-viz-save-state", "saved"],
        ["data-viz-topic-id", labId],
      ],
      overflowX: "hidden",
      overflowY: "hidden",
      role: "ancestor",
      tagName: "section",
    },
    {
      ...safe(),
      attributes: [["class", "min-w-0"]],
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [
        ["class", "rounded-[1.35rem] bg-white/95 p-4 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 sm:p-7"],
        ["data-lab-id", labId],
        ["data-viz-copy-controls-ready", "true"],
        ["data-viz-current-grade", grade],
        ["data-viz-current-track", "HK"],
        ["data-viz-direct-lab-href", href],
      ],
      role: "ancestor",
      tagName: "section",
    },
    {
      ...safe(),
      attributes: [
        ["aria-label", workspaceLabel[language]],
        ["class", "scroll-mt-24"],
        ["data-viz-active-grade", grade],
        ["data-viz-active-lab-id", labId],
        ["data-viz-direct-lab-href", href],
        ["data-viz-lab-runtime-status", "lab"],
        ["data-viz-link-status", "ok"],
        ["data-viz-panel-mode", "lab"],
        ["data-viz-requested-lab-id", labId],
        [
          "data-viz-young-learner-mode",
          grade === "P1" || grade === "P2" ? "true" : "false",
        ],
        ["id", `lab-example-${labId}`],
      ],
      role: "ancestor",
      tagName: "section",
    },
    {
      ...safe(),
      attributes: [[
        "class",
        "relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:py-8",
      ]],
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [[
        "class",
        "min-h-full overflow-hidden bg-transparent text-slate-950",
      ]],
      overflowX: "hidden",
      overflowY: "hidden",
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [["class", "flex-1 pb-20 sm:pb-0"]],
      role: "ancestor",
      tagName: "main",
    },
    {
      ...safe(),
      attributes: [["class", "relative z-10 flex min-h-screen flex-col"]],
      display: "flex",
      role: "ancestor",
      tagName: "div",
    },
    {
      ...safe(),
      attributes: [["class", "overflow-x-hidden"]],
      overflowX: "hidden",
      overflowY: "auto",
      role: "body",
      tagName: "body",
    },
    {
      ...safe(),
      attributes: theme === "dark"
        ? [["class", "dark"], ["lang", htmlLanguage[language]]]
        : [["lang", htmlLanguage[language]]],
      role: "document-element",
      tagName: "html",
    },
  ];
}

function independentP1AddProductDocumentAncestors() {
  return independentProductDocumentAncestors({
    analyticsSource: "coordinate-plane",
    grade: "P1",
    labId: "p1-addition-subtraction",
    language: "en",
    theme: "light",
  });
}

const OWNER_LABEL_AUTHORITIES = Object.freeze([
  "Number bond counters and part-whole diagram",
  "數的組合計數物和部分—整體圖",
  "数的组合计数物和部分—整体图",
  "Addition and subtraction number-line walk",
  "加減法數線步行",
  "加减法数线步行",
  "Hong Kong dollar payment and change bar",
  "港幣付款和找續長條",
  "港币付款和找零长条",
  "Factor pairs and common HCF/LCM lists",
  "因數對與 HCF／LCM 公共列表",
  "因数对与 HCF／LCM 公共列表",
  "Unlike fraction bars converted to a common partition and combined",
  "異分母分數條轉成共同分割後合併",
  "异分母分数条转成共同分割后合并",
  "Cuboid built from visible unit-cube layers",
  "由可見單位立方體層建成的長方體",
  "由可见单位正方体层建成的长方体",
  "Exact area model for square identities",
  "平方恆等式的精確面積模型",
  "平方恒等式的精确面积模型",
]);

function ownerLabelForProjection(projection: DesiredVisibleMathProjection) {
  return OWNER_LABEL_AUTHORITIES.find((candidate) =>
    createHash("sha256").update(candidate).digest("hex") ===
      projection.surface.ownerProjection.ariaLabelHash
  ) ?? "bounded primary owner";
}

const desiredVisibleMathContext = new WeakMap<object, Readonly<{
  language: "en" | "zh" | "zh-Hans";
  theme: "dark" | "light";
}>>();

const PRODUCT_ANCESTOR_META = Object.freeze({
  "p1-counting-number-bonds": {
    analyticsSource: "coordinate-plane",
    grade: "P1",
  },
  "p1-addition-subtraction": {
    analyticsSource: "coordinate-plane",
    grade: "P1",
  },
  "p2-money-time": { analyticsSource: "probability", grade: "P2" },
  "p4-large-numbers": { analyticsSource: "geometry", grade: "P4" },
  "p5-fractions-operations": { analyticsSource: "geometry", grade: "P5" },
  "p5-volume": { analyticsSource: "geometry", grade: "P5" },
  "identities-square-patterns": { analyticsSource: "geometry", grade: "S3" },
});

function rawVisibleMathProjectionFromExpected(
  projection: DesiredVisibleMathProjection,
): RawVisibleMathProjection {
  const viewBoxText = [
    projection.surface.viewBox.x,
    projection.surface.viewBox.y,
    projection.surface.viewBox.width,
    projection.surface.viewBox.height,
  ].join(" ");
  const legacyAttributeContract = (
    projection.surface.ownerProjection as unknown as Record<string, unknown>
  ).attributeContract;
  const primaryOwner =
    projection.surface.ownerProjection.dataVizInteractive === "absent" ||
    legacyAttributeContract === "primary-svg-owner-v1";
  const ownerLabel = ownerLabelForProjection(projection);
  const context = desiredVisibleMathContext.get(projection);
  assert.ok(context, "desired visible-math fixture omitted its language/theme context");
  const labId = projection.surface.ownerProjection.surfaceIdentity ===
      "identity-square-patterns"
    ? "identities-square-patterns"
    : projection.surface.ownerProjection.surfaceIdentity as keyof typeof PRODUCT_ANCESTOR_META;
  const productMeta = PRODUCT_ANCESTOR_META[labId];
  assert.ok(productMeta, `desired visible-math fixture omitted product metadata for ${labId}`);
  return {
    nodes: projection.nodes.map((candidate) => ({
      computedGeometry: candidate.computedGeometry.map(
        ([name, value]) => [name, value],
      ),
      computedRender: { ...candidate.computedRender },
      coordinateMatrix: candidate.coordinateMatrix.map(String),
      cssTransform: "none",
      effectivePaint: candidate.paint === null ? null : {
        clipPath: "none",
        fill: rawCssColor(candidate.paint.fill),
        fillOpacity: String(candidate.paint.fillOpacity),
        filter: "none",
        mask: "none",
        opacity: String(candidate.paint.opacity),
        stroke: rawCssColor(candidate.paint.stroke),
        strokeOpacity: String(candidate.paint.strokeOpacity),
        strokeWidth: String(candidate.paint.strokeWidth),
      },
      geometryAttributes: candidate.geometryAttributes.map(
        ([name, value]) => [name, value],
      ),
      learnerVisible: candidate.learnerVisible,
      parentIndex: candidate.parentIndex,
      opacityFactors: {
        localOpacity: String(candidate.opacityFactors.localOpacity),
        svgAncestorOpacityProduct: String(
          candidate.opacityFactors.svgAncestorOpacityProduct,
        ),
        wrapperOpacityProduct: String(
          candidate.opacityFactors.wrapperOpacityProduct,
        ),
      },
      semanticAttributes: candidate.semanticAttributes.map(
        ([name, value]) => [name, value],
      ),
      tagName: candidate.tagName,
      textHash: candidate.textHash,
      unsupportedIntermediateTransform: false,
    })),
    surface: {
      documentAncestors: independentProductDocumentAncestors({
        ...productMeta,
        labId,
        language: context.language,
        theme: context.theme,
      }),
      layoutSize: {
        height: projection.surface.viewBox.height,
        width: projection.surface.viewBox.width,
      },
      ownerProjection: {
        attributes: primaryOwner
          ? [
              ["aria-label", ownerLabel],
              ["class", "block h-auto min-h-[360px] w-full min-w-[640px] overflow-visible"],
              ["data-viz-surface", ""],
              ["preserveAspectRatio", projection.surface.preserveAspectRatio],
              ["role", "img"],
              ["viewBox", viewBoxText],
            ]
          : [
              ["aria-label", ownerLabel],
              ["class", "aspect-[8/5] h-auto w-full min-w-[640px] overflow-visible"],
              ["data-hk-viz-surface", projection.surface.ownerProjection.surfaceIdentity ?? "bounded-secondary-surface"],
              ["data-viz-interactive", projection.surface.ownerProjection.dataVizInteractive ?? "false"],
              ["data-viz-surface", ""],
              ["role", projection.surface.ownerProjection.role ?? "img"],
              ["viewBox", viewBoxText],
            ],
        computedEffects: rawSafeSurfaceEffects(
          projection.surface.ownerProjection.opacity,
        ),
        titleDescTopology:
          projection.surface.ownerProjection.titleDescTopology.map((entry) => ({
            ...entry,
          })),
        surfaceIdentity: projection.surface.ownerProjection.surfaceIdentity,
      },
      preserveAspectRatio: projection.surface.preserveAspectRatio,
      renderedSize: {
        height: projection.surface.viewBox.height,
        width: projection.surface.viewBox.width,
      },
      scrollportCssTransform: "none",
      svgCssTransform: "none",
      viewBox: { ...projection.surface.viewBox },
      viewportMatrix: ["1", "0", "0", "1", "0", "0"],
      wrapperTopology: projection.surface.wrapperTopology.map((entry) => ({
        ...entry,
        opacity: String(entry.opacity),
        zoom: String(entry.zoom),
      })),
    },
  };
}

async function desiredVisibleMathHarness(
  sequenceId: string,
  phaseIndex = 0,
  theme: "dark" | "light" = "light",
  language: "en" | "zh" | "zh-Hans" = "en",
) {
  const manifest = await import(
    "./hk-visualization-dependent-visible-math-contract"
  ) as unknown as Record<string, unknown>;
  const project = manifest
    .projectHkVisualizationDependentVisibleMathRawProjection;
  const buildExpected = manifest
    .buildHkVisualizationDependentVisibleMathExpectedProjections;
  assert.equal(
    typeof project,
    "function",
    "actual helper-owned visible-math projector seam is missing",
  );
  assert.equal(
    typeof buildExpected,
    "function",
    "independent expected visible-math projection builder is missing",
  );
  const plan = allDependentTransitionPlans().find(
    (candidate) => candidate.sequenceId === sequenceId,
  );
  assert.ok(plan);
  const phase = plan.phases[phaseIndex];
  assert.ok(phase);
  const state = Object.fromEntries(
    phase.expectedValues.map(({ controlId, value }) => [controlId, value]),
  );
  const expected = (buildExpected as (args: Readonly<{
    fractionOperation: "add" | "subtract";
    language: "en" | "zh" | "zh-Hans";
    modeId: string;
    sequenceId: string;
    state: Readonly<Record<string, number>>;
    theme: "dark" | "light";
  }>) => readonly Readonly<{
    contractId: string;
    hash: string;
    projection: DesiredVisibleMathProjection;
  }>[])(
    {
      fractionOperation: "subtract",
      language,
      modeId: plan.modeId,
      sequenceId,
      state,
      theme,
    },
  );
  assert.ok(expected.length > 0);
  expected.forEach(({ projection }) => {
    desiredVisibleMathContext.set(projection, { language, theme });
  });
  return {
    expected,
    project: project as (raw: unknown) => Readonly<{
      hash: string;
      projection: DesiredVisibleMathProjection;
    }>,
  };
}

test("dependent visible-math actual projector rejects inherited paint corruption and unsupported clipping", async () => {
  const { expected, project } = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const target = expected.find(({ contractId }) => contractId === "counter-set");
  assert.ok(target);
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(project(clean).hash, target.hash);
  const paintedIndex = target.projection.nodes.findIndex(
    ({ paint }) =>
      paint?.fill.kind === "solid-srgb" && paint.stroke.kind === "solid-srgb",
  );
  assert.ok(paintedIndex >= 0);
  const paintCorruptions = [
    { fill: "none" },
    { fill: "rgba(0, 0, 0, 0)" },
    { fillOpacity: "0" },
    { stroke: "none" },
    { stroke: "transparent" },
    { strokeOpacity: "0" },
    { strokeWidth: "0" },
    { opacity: "0" },
    { mask: "url(#mask)" },
    { filter: "url(#filter)" },
    { clipPath: "url(#clip)" },
    { stroke: "rgba(65, 43, 21, 0.000001)" },
    { stroke: "rgb(255, 0, 255)" },
    { stroke: "url(#paint-server)" },
    { stroke: "context-stroke" },
  ];
  for (const paintDelta of paintCorruptions) {
    const raw = structuredClone(clean);
    const effectivePaint = raw.nodes[paintedIndex].effectivePaint;
    assert.ok(effectivePaint);
    Object.assign(effectivePaint, paintDelta);
    let rejected = false;
    try {
      rejected = project(raw).hash !== target.hash;
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, JSON.stringify(paintDelta));
  }
});

test("dependent visible-math expected and actual paint receipts bind theme and exact final solid sRGB", async () => {
  const light = await desiredVisibleMathHarness("p1-number-bond-known-part", 1, "light");
  const dark = await desiredVisibleMathHarness("p1-number-bond-known-part", 1, "dark");
  const lightCounter = light.expected.find(({ contractId }) => contractId === "counter-set");
  const darkCounter = dark.expected.find(({ contractId }) => contractId === "counter-set");
  assert.ok(lightCounter);
  assert.ok(darkCounter);
  assert.notEqual(lightCounter.hash, darkCounter.hash);
  assert.equal(light.project(rawVisibleMathProjectionFromExpected(lightCounter.projection)).hash, lightCounter.hash);
  assert.equal(dark.project(rawVisibleMathProjectionFromExpected(darkCounter.projection)).hash, darkCounter.hash);
  const themeSwap = rawVisibleMathProjectionFromExpected(lightCounter.projection);
  const darkEmpty = darkCounter.projection.nodes.find((node) =>
    node.semanticAttributes.some(([name, value]) => name === "data-viz-part" && value === "empty")
  );
  const lightEmptyIndex = lightCounter.projection.nodes.findIndex((node) =>
    node.semanticAttributes.some(([name, value]) => name === "data-viz-part" && value === "empty")
  );
  assert.ok(darkEmpty?.paint);
  assert.ok(lightEmptyIndex >= 0);
  const swappedPaint = themeSwap.nodes[lightEmptyIndex].effectivePaint;
  assert.ok(swappedPaint);
  swappedPaint.fill = rawCssColor(darkEmpty.paint.fill);
  swappedPaint.stroke = rawCssColor(darkEmpty.paint.stroke);
  assert.notEqual(light.project(themeSwap).hash, lightCounter.hash);
  const connector = light.expected.find(({ contractId }) => contractId === "known-connector");
  assert.ok(connector);
  const equivalentSolid = rawVisibleMathProjectionFromExpected(connector.projection);
  const path = equivalentSolid.nodes.find(({ tagName }) => tagName === "path");
  assert.ok(path?.effectivePaint);
  const color = path.effectivePaint.stroke.match(/^rgb\((\d+), (\d+), (\d+)\)$/u);
  assert.ok(color);
  path.effectivePaint.stroke = `rgba(${color[1]}, ${color[2]}, ${color[3]}, 1)`;
  assert.equal(light.project(equivalentSolid).hash, connector.hash);
});

test("dependent visible-math canonicalizers reject malformed SVG comma-wsp and accept bounded signed exponents", async () => {
  const connectorHarness = await desiredVisibleMathHarness("p1-number-bond-known-part");
  const connector = connectorHarness.expected.find(({ contractId }) => contractId === "known-connector");
  assert.ok(connector);
  const connectorRaw = rawVisibleMathProjectionFromExpected(connector.projection);
  const pathIndex = connectorRaw.nodes.findIndex(({ tagName }) => tagName === "path");
  const dIndex = connectorRaw.nodes[pathIndex].geometryAttributes.findIndex(([name]) => name === "d");
  assert.ok(pathIndex >= 0 && dIndex >= 0);
  for (const path of [
    "M,,260,,238,,L,,214,,276,,", ",M260 238 L214 276",
    "M260 238 L214 276,", "M260\u00a0238 L214 276",
  ]) {
    const malformed = structuredClone(connectorRaw);
    malformed.nodes[pathIndex].geometryAttributes[dIndex][1] = path;
    assert.throws(() => connectorHarness.project(malformed), /path|separator|geometry|comma|whitespace|malformed/i, path);
  }
  const validPath = structuredClone(connectorRaw);
  validPath.nodes[pathIndex].geometryAttributes[dIndex][1] =
    "M+2.6e2 +2.38e2 L+2.14e2 +2.76e2";
  assert.equal(connectorHarness.project(validPath).hash, connector.hash);

  const arrowHarness = await desiredVisibleMathHarness("p1-add-step");
  const arrow = arrowHarness.expected.find(({ contractId }) => contractId === "jump-arrowhead");
  assert.ok(arrow);
  const arrowRaw = rawVisibleMathProjectionFromExpected(arrow.projection);
  const polygonIndex = arrowRaw.nodes.findIndex(({ tagName }) => tagName === "polygon");
  const pointsIndex = arrowRaw.nodes[polygonIndex].geometryAttributes.findIndex(([name]) => name === "points");
  assert.ok(polygonIndex >= 0 && pointsIndex >= 0);
  for (const points of [",1,2 3,4", "1,,2 3,4", "1,2 3,4,", "1,2\u00a03,4"]) {
    const malformed = structuredClone(arrowRaw);
    malformed.nodes[polygonIndex].geometryAttributes[pointsIndex][1] = points;
    assert.throws(() => arrowHarness.project(malformed), /points|separator|coordinate|geometry|comma|whitespace|malformed/i, points);
  }
  const validPoints = structuredClone(arrowRaw);
  const pointNumbers = arrowRaw.nodes[polygonIndex].geometryAttributes[pointsIndex][1]
    .match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/gu);
  assert.ok(pointNumbers && pointNumbers.length === 6);
  validPoints.nodes[polygonIndex].geometryAttributes[pointsIndex][1] =
    `${Number(pointNumbers[0]) >= 0 ? "+" : ""}${pointNumbers[0]}e0,${Number(pointNumbers[1]) >= 0 ? "+" : ""}${pointNumbers[1]}e0 ` +
    `${Number(pointNumbers[2]) >= 0 ? "+" : ""}${pointNumbers[2]}e0,${Number(pointNumbers[3]) >= 0 ? "+" : ""}${pointNumbers[3]}e0 ` +
    `${Number(pointNumbers[4]) >= 0 ? "+" : ""}${pointNumbers[4]}e0,${Number(pointNumbers[5]) >= 0 ? "+" : ""}${pointNumbers[5]}e0`;
  assert.equal(arrowHarness.project(validPoints).hash, arrow.hash);

  const emptyCounterHarness = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
    1,
  );
  const counter = emptyCounterHarness.expected.find(
    ({ contractId }) => contractId === "counter-set",
  );
  assert.ok(counter);
  const counterRaw = rawVisibleMathProjectionFromExpected(counter.projection);
  const dashedIndex = counterRaw.nodes.findIndex(({ geometryAttributes }) =>
    geometryAttributes.some(([name]) => name === "stroke-dasharray")
  );
  const dashIndex = counterRaw.nodes[dashedIndex].geometryAttributes.findIndex(([name]) => name === "stroke-dasharray");
  assert.ok(dashedIndex >= 0 && dashIndex >= 0);
  for (const dasharray of [",5 4", "5,,4", "5 4,", "5\u00a04"]) {
    const malformed = structuredClone(counterRaw);
    malformed.nodes[dashedIndex].geometryAttributes[dashIndex][1] = dasharray;
    assert.throws(() => emptyCounterHarness.project(malformed), /dash|separator|geometry|comma|whitespace|malformed/i, dasharray);
  }
  const validDash = structuredClone(counterRaw);
  validDash.nodes[dashedIndex].geometryAttributes[dashIndex][1] = "+5e0, +4e0";
  assert.equal(emptyCounterHarness.project(validDash).hash, counter.hash);
});

test("dependent visible-math actual projector rejects viewBox, PAR, wrapper, CSS, and CTM drift", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(project(clean).hash, target.hash);
  const corruptions = [
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.viewBox.width += 1;
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.preserveAspectRatio = "none";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.scrollportCssTransform = "matrix(1,0,0,1,1,0)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.svgCssTransform = "matrix(1,0,0,1,1,0)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[0].cssTransform = "matrix(1,0,0,1,1,0)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology.splice(1, 0, structuredClone(raw.surface.wrapperTopology[1]));
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology.splice(1, 1);
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      [raw.surface.wrapperTopology[0], raw.surface.wrapperTopology[1]] =
        [raw.surface.wrapperTopology[1], raw.surface.wrapperTopology[0]];
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].opacity = "0.000001";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].clipPath = "url(#clip)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].filter = "url(#filter)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].mask = "url(#mask)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].display = "none";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].visibility = "hidden";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[1].contentVisibility = "hidden";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology[0].role = raw.surface.wrapperTopology[1].role;
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.wrapperTopology.at(-1)!.topicId = "wrong-topic";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.surface.viewportMatrix[4] = String(
        Number(raw.surface.viewportMatrix[4]) + 1,
      );
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.nodes[0].cssTransform = "matrix(1,0,0,1,1,0)";
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.nodes[0].coordinateMatrix[4] = String(
        Number(raw.nodes[0].coordinateMatrix[4]) + 1,
      );
    },
    (raw: ReturnType<typeof rawVisibleMathProjectionFromExpected>) => {
      raw.nodes[0].unsupportedIntermediateTransform = true;
    },
  ];
  for (const corrupt of corruptions) {
    const raw = structuredClone(clean);
    corrupt(raw);
    let rejected = false;
    try {
      rejected = project(raw).hash !== target.hash;
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true);
  }
  const equivalentViewport = structuredClone(clean);
  equivalentViewport.surface.viewportMatrix[0] = String(
    Number(equivalentViewport.surface.viewportMatrix[0]) + 5e-13,
  );
  assert.equal(project(equivalentViewport).hash, target.hash);
  const meaningfulViewport = structuredClone(clean);
  meaningfulViewport.surface.viewportMatrix[0] = String(
    Number(meaningfulViewport.surface.viewportMatrix[0]) + 1e-4,
  );
  assert.notEqual(project(meaningfulViewport).hash, target.hash);
});

test("dependent visible-math v8 rejects the rendered-size/viewport alias while retaining independent responsive normalization", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection) as
    RawVisibleMathProjection & {
      surface: RawVisibleMathProjection["surface"] & {
        layoutSize?: { height: number; width: number };
      };
    };
  assert.deepEqual(clean.surface.layoutSize, clean.surface.renderedSize);

  const twoFieldAlias = structuredClone(clean);
  twoFieldAlias.surface.renderedSize.height *= 2;
  twoFieldAlias.surface.renderedSize.width *= 2;
  for (const index of [0, 1, 2, 3, 4, 5]) {
    twoFieldAlias.surface.viewportMatrix[index] = String(
      Number(twoFieldAlias.surface.viewportMatrix[index]) * 2,
    );
  }
  assert.throws(
    () => project(twoFieldAlias),
    /layout|rendered|independent|alias|size/i,
  );

  const responsive = structuredClone(clean);
  assert.ok(responsive.surface.layoutSize);
  responsive.surface.layoutSize.height *= 2;
  responsive.surface.layoutSize.width *= 2;
  responsive.surface.renderedSize.height *= 2;
  responsive.surface.renderedSize.width *= 2;
  for (const index of [0, 1, 2, 3, 4, 5]) {
    responsive.surface.viewportMatrix[index] = String(
      Number(responsive.surface.viewportMatrix[index]) * 2,
    );
  }
  assert.equal(project(responsive).hash, target.hash);
});

test("dependent visible-math v8 binds owner title/desc and rejects owner or document-ancestor render effects", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection) as
    RawVisibleMathProjection & {
      surface: RawVisibleMathProjection["surface"] & {
        documentAncestors?: Array<Record<string, unknown>>;
        ownerProjection?: {
          attributes: Array<[string, string]>;
          computedEffects: Record<string, string>;
          titleDescTopology: Array<{ tagName: string; textHash: string }>;
        };
      };
    };
  assert.ok(clean.surface.ownerProjection);
  assert.ok(clean.surface.documentAncestors);
  assert.ok(clean.surface.documentAncestors.length >= 2);
  assert.equal(
    clean.surface.documentAncestors.at(-1)?.role,
    "document-element",
  );
  assert.equal(project(clean).hash, target.hash);

  const ownerAttributeCorruptions: Array<[string, string]> = [
    ["shape-rendering", "crispEdges"],
    ["unknown-render-attribute", "secret-render-mode"],
  ];
  for (const attribute of ownerAttributeCorruptions) {
    const raw = structuredClone(clean);
    assert.ok(raw.surface.ownerProjection);
    raw.surface.ownerProjection.attributes.push(attribute);
    assert.throws(() => project(raw), /owner|attribute|render|allowlist/i);
  }

  const accessibilityBaseline = structuredClone(clean);
  assert.ok(accessibilityBaseline.surface.ownerProjection);
  accessibilityBaseline.surface.ownerProjection.titleDescTopology = [
    {
      tagName: "title",
      textHash: createHash("sha256").update("owner title").digest("hex"),
    },
    {
      tagName: "desc",
      textHash: createHash("sha256").update("owner description").digest("hex"),
    },
  ];
  const baselineHash = project(accessibilityBaseline).hash;
  const titleDescMutations = [
    (raw: typeof accessibilityBaseline) => {
      raw.surface.ownerProjection!.titleDescTopology.push({
        tagName: "desc",
        textHash: createHash("sha256").update("added").digest("hex"),
      });
    },
    (raw: typeof accessibilityBaseline) => {
      raw.surface.ownerProjection!.titleDescTopology.splice(1, 1);
    },
    (raw: typeof accessibilityBaseline) => {
      raw.surface.ownerProjection!.titleDescTopology.reverse();
    },
    (raw: typeof accessibilityBaseline) => {
      raw.surface.ownerProjection!.titleDescTopology[1].textHash =
        createHash("sha256").update("changed description").digest("hex");
    },
  ];
  for (const mutate of titleDescMutations) {
    const raw = structuredClone(accessibilityBaseline);
    mutate(raw);
    assert.notEqual(project(raw).hash, baselineHash);
  }

  const reducedMotion = structuredClone(clean);
  assert.ok(reducedMotion.surface.ownerProjection);
  reducedMotion.surface.ownerProjection.computedEffects.animationDuration = "1e-06s";
  reducedMotion.surface.ownerProjection.computedEffects.transitionDuration = "1e-06s";
  for (const ancestor of reducedMotion.surface.documentAncestors ?? []) {
    ancestor.animationDuration = "1e-06s";
    ancestor.transitionDuration = "1e-06s";
  }
  for (const wrapper of reducedMotion.surface.wrapperTopology) {
    wrapper.transitionDuration = "1e-06s";
  }
  assert.equal(
    project(reducedMotion).hash,
    target.hash,
    "Chrome's exact computed 0.001ms reduced-motion duration must canonicalize to the no-motion surface authority.",
  );
  const longerWrapperMotion = structuredClone(clean);
  longerWrapperMotion.surface.wrapperTopology[0].transitionDuration = "2e-06s";
  assert.throws(
    () => project(longerWrapperMotion),
    /wrapper|transition|duration|keyword/i,
  );

  const effectMutations: Array<readonly [string, string]> = [
    ["cssTransform", "matrix(1, 0, 0, 1, 1, 0)"],
    ["scale", "2"],
    ["translate", "1px"],
    ["rotate", "1deg"],
    ["perspective", "1px"],
    ["zoom", "2"],
    ["display", "none"],
    ["visibility", "hidden"],
    ["contentVisibility", "hidden"],
    ["mixBlendMode", "multiply"],
    ["isolation", "isolate"],
    ["overflowX", "hidden"],
    ["overflowY", "hidden"],
    ["animationName", "pulse"],
    ["animationDuration", "2e-06s"],
    ["animationDuration", "1s"],
    ["transitionDuration", "2e-06s"],
    ["transitionDuration", "1s"],
    ["clip", "rect(0px, 1px, 1px, 0px)"],
    ["clipPath", "inset(1px)"],
    ["mask", "url(#mask)"],
    ["maskImage", "url(#mask)"],
    ["filter", "blur(1px)"],
  ];
  for (const [field, value] of effectMutations) {
    for (const location of ["owner", "ancestor"] as const) {
      const raw = structuredClone(clean);
      const effects = location === "owner"
        ? raw.surface.ownerProjection!.computedEffects
        : raw.surface.documentAncestors![0];
      effects[field] = value;
      assert.throws(
        () => project(raw),
        /owner|ancestor|effect|transform|scale|translate|rotate|perspective|zoom|display|visibility|blend|isolation|overflow|animation|transition|clip|mask|filter/i,
        `${location}:${field}`,
      );
    }
  }
});

test("dependent visible-math v8 carries owner/document opacity and exact cumulative painted alpha", async () => {
  const { expected, project } = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const target = expected.find(({ contractId }) => contractId === "counter-set");
  assert.ok(target);
  const raw = rawVisibleMathProjectionFromExpected(target.projection) as
    RawVisibleMathProjection & {
      surface: RawVisibleMathProjection["surface"] & {
        documentAncestors?: Array<Record<string, unknown>>;
        ownerProjection?: { computedEffects: Record<string, string> };
      };
    };
  const painted = raw.nodes.filter(({ effectivePaint }) => effectivePaint !== null);
  assert.ok(painted.length > 0);
  assert.ok(raw.surface.ownerProjection);
  assert.ok(raw.surface.documentAncestors?.[0]);
  raw.surface.ownerProjection.computedEffects.opacity = "0.5";
  raw.surface.documentAncestors[0].opacity = "0.5";
  for (const node of painted) {
    assert.ok(node.effectivePaint);
    node.opacityFactors.localOpacity = "0.5";
    node.effectivePaint.opacity = "0.125";
  }
  const projected = project(raw);
  const projectedPaint = projected.projection.nodes.find(({ paint }) => paint !== null)?.paint;
  assert.equal(projectedPaint?.opacity, 0.125);
  assert.notEqual(projected.hash, target.hash);
});

test("dependent visible-math v8 hash-binds independent owner attribute authorities", async () => {
  const english = await desiredVisibleMathHarness("p1-add-step", 0, "light", "en");
  const traditional = await desiredVisibleMathHarness("p1-add-step", 0, "light", "zh");
  const target = english.expected[0];
  const traditionalTarget = traditional.expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(english.project(clean).hash, target.hash);
  assert.match(target.projection.surface.ownerProjection.ariaLabelHash, /^[0-9a-f]{64}$/u);
  assert.notEqual(
    target.projection.surface.ownerProjection.ariaLabelHash,
    traditionalTarget.projection.surface.ownerProjection.ariaLabelHash,
  );
  assert.equal(target.projection.surface.ownerProjection.role, "img");
  assert.equal(
    target.projection.surface.ownerProjection.dataVizInteractive,
    "absent",
  );
  assert.equal(
    target.projection.surface.ownerProjection.surfaceIdentity,
    "p1-addition-subtraction",
  );
  assert.deepEqual(
    target.projection.surface.ownerProjection.attributeNames,
    [
      "aria-label", "class", "data-viz-surface", "preserveAspectRatio",
      "role", "viewBox",
    ],
  );
  assert.match(
    target.projection.surface.ownerProjection.attributeSummaryHash,
    /^[0-9a-f]{64}$/u,
  );

  const wrongSafeLabel = structuredClone(clean);
  const ariaLabel = wrongSafeLabel.surface.ownerProjection.attributes.find(
    ([name]) => name === "aria-label",
  );
  assert.ok(ariaLabel);
  ariaLabel[1] = "Safe but wrong owner label";
  assert.notEqual(english.project(wrongSafeLabel).hash, target.hash);

  const secondary = await desiredVisibleMathHarness(
    "s3-identity-a-projects-b",
    0,
    "light",
    "en",
  );
  const secondaryTarget = secondary.expected[0];
  const secondaryClean = rawVisibleMathProjectionFromExpected(
    secondaryTarget.projection,
  );
  assert.equal(secondary.project(secondaryClean).hash, secondaryTarget.hash);
  for (const [name, value] of [
    ["role", "group"],
    ["data-viz-interactive", "true"],
    ["data-hk-viz-surface", "safe-but-wrong-surface"],
  ] as const) {
    const corrupted = structuredClone(secondaryClean);
    const attribute = corrupted.surface.ownerProjection.attributes.find(
      ([candidate]) => candidate === name,
    );
    assert.ok(attribute);
    attribute[1] = value;
    let rejectedOrChanged = false;
    try {
      rejectedOrChanged =
        secondary.project(corrupted).hash !== secondaryTarget.hash;
    } catch {
      rejectedOrChanged = true;
    }
    assert.equal(rejectedOrChanged, true, name);
  }
});

test("dependent visible-math v8 rejects backdrop and containment effects on owner or document ancestors", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(project(clean).hash, target.hash);
  for (const [field, value] of [
    ["backdropFilter", "blur(1px)"],
    ["webkitBackdropFilter", "blur(1px)"],
    ["contain", "paint"],
  ] as const) {
    for (const location of ["owner", "ancestor"] as const) {
      const corrupted = structuredClone(clean);
      const effects = location === "owner"
        ? corrupted.surface.ownerProjection.computedEffects
        : corrupted.surface.documentAncestors[0];
      effects[field] = value;
      assert.throws(
        () => project(corrupted),
        /backdrop|contain|owner|ancestor|effect|default/i,
        `${location}:${field}`,
      );
    }
  }
  const cardIndex = clean.surface.documentAncestors.findIndex(({ attributes }) =>
    attributes.some(([name, value]) =>
      name === "class" && value === "overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-6"
    )
  );
  assert.ok(cardIndex >= 0);
  for (const [field, value] of [
    ["backdropFilter", "blur(12px)"],
    ["webkitBackdropFilter", "blur(12px)"],
    ["backdropFilter", "blur(1px)"],
    ["webkitBackdropFilter", "blur(1px)"],
    ["contain", "paint"],
  ] as const) {
    const corrupted = structuredClone(clean);
    corrupted.surface.documentAncestors[cardIndex][field] = value;
    assert.throws(
      () => project(corrupted),
      /backdrop|contain|ancestor|effect|structural/i,
      `card:${field}:${value}`,
    );
  }
});

test("dependent visible-math v8 binds computed descendant SVG render effects from external CSS", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(project(clean).hash, target.hash);
  assert.ok(Object.keys(clean.nodes[0].computedRender).length >= 20);
  for (const [field, value] of [
    ["mixBlendMode", "multiply"],
    ["isolation", "isolate"],
    ["paintOrder", "stroke"],
    ["vectorEffect", "non-scaling-stroke"],
    ["strokeDasharray", "2 3"],
    ["strokeDashoffset", "1"],
    ["strokeLinecap", "square"],
    ["strokeLinejoin", "bevel"],
    ["shapeRendering", "crispEdges"],
    ["textRendering", "geometricPrecision"],
    ["fontFamily", "Arial"],
    ["fontSize", "17"],
    ["fontWeight", "500"],
    ["fontStyle", "italic"],
    ["fontStretch", "condensed"],
    ["letterSpacing", "1"],
    ["wordSpacing", "1"],
    ["textAnchor", "middle"],
    ["dominantBaseline", "central"],
    ["alignmentBaseline", "middle"],
    ["baselineShift", "sub"],
    ["markerStart", "url(#external-marker)"],
    ["markerMid", "url(#external-marker)"],
    ["markerEnd", "url(#external-marker)"],
  ] as const) {
    const corrupted = structuredClone(clean);
    corrupted.nodes[0].computedRender[field] = value;
    let rejected = false;
    try {
      rejected = project(corrupted).hash !== target.hash;
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, field);
  }
});

test("dependent visible-math v8 canonicalizes Chrome's exact BlinkMacSystemFont alias without weakening font binding", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  const chromeAlias = structuredClone(clean);
  chromeAlias.nodes[0].computedRender.fontFamily =
    'Inter,ui-sans-serif,system-ui,-apple-system,"system-ui","Segoe UI",sans-serif';
  assert.equal(project(chromeAlias).hash, target.hash);

  const differentFamily = structuredClone(clean);
  differentFamily.nodes[0].computedRender.fontFamily = "Arial";
  assert.notEqual(project(differentFamily).hash, target.hash);
});

test("dependent visible-math v8 canonicalizes client-size rounding within half a CSS pixel and rejects larger layout drift", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);

  const rounded = structuredClone(clean);
  rounded.surface.layoutSize.height = rounded.surface.renderedSize.height + 0.25;
  assert.equal(project(rounded).hash, target.hash);

  const drifted = structuredClone(clean);
  drifted.surface.layoutSize.height = drifted.surface.renderedSize.height + 0.75;
  let rejected = false;
  try {
    rejected = project(drifted).hash !== target.hash;
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true);
});

test("dependent visible-math v8 binds exact tag-aware computed rect and circle geometry", async () => {
  const money = await desiredVisibleMathHarness("p2-payment-at-least-price");
  const paymentBar = money.expected.find(({ contractId }) =>
    contractId === "payment-bar"
  );
  assert.ok(paymentBar);
  const rectRaw = rawVisibleMathProjectionFromExpected(paymentBar.projection);
  const rect = rectRaw.nodes.find(({ tagName }) => tagName === "rect") as
    RawVisibleMathProjection["nodes"][number] & {
      computedGeometry?: Array<[string, string]>;
    };
  assert.deepEqual(rect.computedGeometry, [
    ["height", "70"], ["rx", "16"], ["ry", "auto"],
    ["width", "488"], ["x", "76"], ["y", "228"],
  ]);
  assert.equal(money.project(rectRaw).hash, paymentBar.hash);
  const movedRect = structuredClone(rectRaw) as typeof rectRaw & {
    nodes: Array<{ computedGeometry: Array<[string, string]> }>;
  };
  movedRect.nodes[0].computedGeometry.find(([name]) => name === "x")![1] = "77";
  assert.notEqual(money.project(movedRect).hash, paymentBar.hash);
  const malformedRect = structuredClone(rectRaw) as typeof movedRect;
  malformedRect.nodes[0].computedGeometry.find(
    ([name]) => name === "width",
  )![1] = "calc(488px + 1px)";
  assert.throws(
    () => money.project(malformedRect),
    /computed geometry|width|numeric|canonical|malformed/i,
  );

  const numberBond = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const counterSet = numberBond.expected.find(({ contractId }) =>
    contractId === "counter-set"
  );
  assert.ok(counterSet);
  const circleRaw = rawVisibleMathProjectionFromExpected(counterSet.projection);
  const circleIndex = circleRaw.nodes.findIndex(({ tagName }) =>
    tagName === "circle"
  );
  assert.ok(circleIndex >= 0);
  const circle = circleRaw.nodes[circleIndex] as
    RawVisibleMathProjection["nodes"][number] & {
      computedGeometry?: Array<[string, string]>;
    };
  assert.deepEqual(circle.computedGeometry, [
    ["cx", "0"], ["cy", "0"], ["r", "16"],
  ]);
  assert.equal(numberBond.project(circleRaw).hash, counterSet.hash);
  const movedCircle = structuredClone(circleRaw) as typeof circleRaw & {
    nodes: Array<{ computedGeometry: Array<[string, string]> }>;
  };
  movedCircle.nodes[circleIndex].computedGeometry.find(
    ([name]) => name === "cx",
  )![1] = "1";
  assert.notEqual(numberBond.project(movedCircle).hash, counterSet.hash);
});

test("dependent visible-math v8 binds computed path geometry independently of its presentation attribute", async () => {
  const harness = await desiredVisibleMathHarness("p1-add-step");
  const directedJump = harness.expected.find(({ contractId }) =>
    contractId === "directed-jump"
  );
  assert.ok(directedJump);
  const clean = rawVisibleMathProjectionFromExpected(directedJump.projection);
  const path = clean.nodes[0] as RawVisibleMathProjection["nodes"][number] & {
    computedGeometry?: Array<[string, string]>;
  };
  assert.equal(path.tagName, "path");
  assert.deepEqual(path.computedGeometry?.map(([name]) => name), ["d"]);
  assert.equal(
    path.computedGeometry?.[0]?.[1],
    path.geometryAttributes.find(([name]) => name === "d")?.[1],
  );
  assert.equal(harness.project(clean).hash, directedJump.hash);
  const externalCssMutation = structuredClone(clean) as typeof clean & {
    nodes: Array<{ computedGeometry: Array<[string, string]> }>;
  };
  externalCssMutation.nodes[0].computedGeometry[0][1] = "M70 220 L95 220";
  assert.notEqual(
    harness.project(externalCssMutation).hash,
    directedJump.hash,
  );
  const unexpectedField = structuredClone(clean) as typeof externalCssMutation;
  unexpectedField.nodes[0].computedGeometry.push(["x", "1"]);
  assert.throws(
    () => harness.project(unexpectedField),
    /computed geometry|tag|exact|schema|key/i,
  );
});

test("dependent visible-math v8 retains bounded ancestry and normalized scale summaries", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  const baseline = project(clean);
  assert.equal(baseline.hash, target.hash);
  const summary = baseline.projection.surface.ancestryScaleSummary;
  assert.equal(summary.policyVersion, "visible-math-ancestry-scale-summary.v1");
  assert.equal(summary.chainCount, clean.surface.documentAncestors.length);
  assert.equal(summary.scaleWitnessCount, 3);
  assert.ok(summary.entryCount >= summary.chainCount);
  for (const digest of [summary.ancestorHash, summary.effectHash, summary.scaleHash]) {
    assert.match(digest, /^[0-9a-f]{64}$/u);
  }

  const insertedAncestor = structuredClone(clean);
  insertedAncestor.surface.documentAncestors.splice(-2, 0, {
    ...rawSafeSurfaceEffects(1),
    attributes: [["data-v7-safe-ancestor", "inserted"]],
    role: "ancestor",
    tagName: "div",
  });
  let insertedRejectedOrChanged = false;
  try {
    insertedRejectedOrChanged = project(insertedAncestor).hash !== baseline.hash;
  } catch {
    insertedRejectedOrChanged = true;
  }
  assert.equal(insertedRejectedOrChanged, true);

  const responsive = structuredClone(clean);
  responsive.surface.layoutSize.height *= 2;
  responsive.surface.layoutSize.width *= 2;
  responsive.surface.renderedSize.height *= 2;
  responsive.surface.renderedSize.width *= 2;
  responsive.surface.viewportMatrix = responsive.surface.viewportMatrix.map(
    (value) => String(Number(value) * 2),
  );
  assert.equal(project(responsive).hash, baseline.hash);
});

test("dependent visible-math v8 binds the independently sourced real owner-to-document product chain", async () => {
  const dispatcherSource = fs.readFileSync(
    "components/visualizations/hk/HKVisualizationLab.tsx",
    "utf8",
  );
  const configuredSource = fs.readFileSync(
    "components/visualizations/ConfiguredVisualizationLab.tsx",
    "utf8",
  );
  const cardSource = fs.readFileSync(
    "components/visualizations/VisualizationCard.tsx",
    "utf8",
  );
  const pageSource = fs.readFileSync(
    "components/visualizations/VisualizationLabPage.tsx",
    "utf8",
  );
  const layoutSource = fs.readFileSync("app/layout.tsx", "utf8");
  assert.match(
    dispatcherSource,
    /data-hk-viz-dispatcher="v1"[\s\S]*data-hk-viz-dispatcher-lab-id=\{lab\.labId\}[\s\S]*className="min-w-0"/u,
  );
  assert.match(
    configuredSource,
    /className="min-w-0"[\s\S]*data-viz-lesson-session-owner=\{ownsActiveLabIdentity \? "first-control-interaction" : "external-card"\}[\s\S]*data-viz-production-renderer=\{productionRenderer\}/u,
  );
  assert.match(
    cardSource,
    /className="overflow-hidden rounded-\[1\.5rem\] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900\/5 dark:border-white\/10 dark:bg-slate-900 dark:shadow-none sm:p-6"[\s\S]*<div data-viz-card-body/u,
  );
  assert.match(
    pageSource,
    /data-viz-lab-runtime-root[\s\S]*data-viz-lab-runtime-ready-probe=\{readyLabId\}[\s\S]*<LoadedLabComponent/u,
  );
  assert.match(
    pageSource,
    /className="min-h-full overflow-hidden bg-transparent text-slate-950"[\s\S]*className="relative mx-auto w-full max-w-\[1500px\] px-4 py-6 sm:py-8"[\s\S]*className="scroll-mt-24"/u,
  );
  assert.match(
    pageSource,
    /const effectiveTrackFilter: VisualizationTrackFilter = currentUser \? "all" : trackFilter/u,
  );
  assert.match(
    layoutSource,
    /<body className="overflow-x-hidden">[\s\S]*<div className="relative z-10 flex min-h-screen flex-col">[\s\S]*<main className="flex-1 pb-20 sm:pb-0">/u,
  );

  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const realProductChain = independentP1AddProductDocumentAncestors();
  const attributeValue = (
    ancestorIndex: number,
    attributeName: string,
  ) => realProductChain[ancestorIndex].attributes.find(
    ([name]) => name === attributeName,
  )?.[1];
  assert.equal(attributeValue(2, "data-viz-lab-runtime-root"), "true");
  assert.equal(attributeValue(3, "data-viz-card-body"), "true");
  assert.equal(attributeValue(4, "data-viz-card"), "true");
  assert.equal(attributeValue(7, "data-viz-young-learner-mode"), "true");
  const raw = rawVisibleMathProjectionFromExpected(target.projection);
  raw.surface.documentAncestors = realProductChain;
  const observed = project(raw);
  assert.equal(realProductChain.length, 14);
  assert.equal(observed.projection.surface.ancestryScaleSummary.chainCount, 14);
  assert.equal(observed.hash, target.hash);
});

test("dependent visible-math v8 rejects noncanonical and over-budget document ancestor attributes", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  assert.equal(project(clean).hash, target.hash);
  const corruptions = [
    (raw: RawVisibleMathProjection) => {
      raw.surface.documentAncestors[0].attributes = Array.from(
        { length: 65 },
        (_, index) => [`data-entry-${String(index).padStart(3, "0")}`, "x"],
      );
    },
    (raw: RawVisibleMathProjection) => {
      raw.surface.documentAncestors[0].attributes = [
        ["data-duplicate", "a"], ["data-duplicate", "b"],
      ];
    },
    (raw: RawVisibleMathProjection) => {
      raw.surface.documentAncestors[0].attributes = [
        ["data-z", "z"], ["data-a", "a"],
      ];
    },
    (raw: RawVisibleMathProjection) => {
      const attributes = Array.from(
        { length: 600 },
        (_, index) => [`data-chain-${String(index).padStart(3, "0")}`, "x"],
      ) as Array<[string, string]>;
      for (let index = 0; index < raw.surface.documentAncestors.length; index += 1) {
        raw.surface.documentAncestors[index].attributes = attributes.slice(
          index * 150,
          (index + 1) * 150,
        );
      }
    },
  ];
  for (const corrupt of corruptions) {
    const raw = structuredClone(clean);
    corrupt(raw);
    assert.throws(
      () => project(raw),
      /ancestor|attribute|count|byte|budget|canonical|order|duplicate|bound/i,
    );
  }
});

test("dependent visible-math v8 verifies nontrivial fill and stroke alpha with every cumulative opacity factor", async () => {
  const { expected, project } = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const target = expected.find(({ contractId }) => contractId === "counter-set");
  assert.ok(target);
  const raw = rawVisibleMathProjectionFromExpected(target.projection);
  const paintedIndex = raw.nodes.findIndex(({ effectivePaint }) =>
    effectivePaint !== null
  );
  assert.ok(paintedIndex >= 0);
  const painted = raw.nodes[paintedIndex];
  assert.ok(painted.effectivePaint);
  painted.effectivePaint.fill = "rgba(40, 80, 120, 0.5)";
  painted.effectivePaint.fillOpacity = "0.5";
  painted.effectivePaint.stroke = "rgba(12, 34, 56, 0.5)";
  painted.effectivePaint.strokeOpacity = "0.5";
  painted.effectivePaint.strokeWidth = "2";
  painted.opacityFactors.localOpacity = "0.5";
  painted.opacityFactors.svgAncestorOpacityProduct = "0.5";
  raw.surface.wrapperTopology[0].opacity = "0.5";
  raw.surface.ownerProjection.computedEffects.opacity = "0.5";
  raw.surface.documentAncestors[0].opacity = "0.5";
  for (const node of raw.nodes) {
    node.opacityFactors.wrapperOpacityProduct = "0.5";
    if (node.effectivePaint !== null) node.effectivePaint.opacity = "0.125";
  }
  painted.effectivePaint.opacity = "0.03125";
  const baseline = project(raw);
  const baselinePaint = baseline.projection.nodes[paintedIndex].paint;
  assert.equal(baselinePaint?.fill.kind, "solid-srgb");
  assert.equal(baselinePaint?.stroke.kind, "solid-srgb");
  assert.equal(
    baselinePaint?.fill.kind === "solid-srgb" ? baselinePaint.fill.alpha : -1,
    0.5,
  );
  assert.equal(
    baselinePaint?.stroke.kind === "solid-srgb" ? baselinePaint.stroke.alpha : -1,
    0.5,
  );
  assert.equal(baselinePaint?.fillOpacity, 0.5);
  assert.equal(baselinePaint?.strokeOpacity, 0.5);
  assert.equal(baselinePaint?.opacity, 0.03125);
  assert.deepEqual(
    baseline.projection.nodes[paintedIndex].opacityFactors,
    {
      localOpacity: 0.5,
      svgAncestorOpacityProduct: 0.5,
      wrapperOpacityProduct: 0.5,
    },
  );

  for (const [label, paintChannel, corrupt] of [
    ["fill-rgba-alpha", "fill", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].effectivePaint!.fill =
        "rgba(40, 80, 120, 0.001)";
    }],
    ["fill-opacity", "fill", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].effectivePaint!.fillOpacity = "0.001";
    }],
    ["stroke-rgba-alpha", "stroke", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].effectivePaint!.stroke =
        "rgba(12, 34, 56, 0.001)";
    }],
    ["stroke-opacity", "stroke", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].effectivePaint!.strokeOpacity = "0.001";
    }],
  ] as const) {
    const candidate = structuredClone(raw);
    corrupt(candidate);
    const corrupted = project(candidate);
    assert.notEqual(corrupted.hash, baseline.hash, label);
    assert.equal(
      corrupted.projection.nodes[paintedIndex].paint?.[paintChannel].kind,
      "none",
      `${label} must cross the learner-visible alpha threshold`,
    );
  }

  for (const [label, corrupt] of [
    ["node-opacity", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].opacityFactors.localOpacity = "1";
    }],
    ["svg-ancestor-opacity", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].opacityFactors.svgAncestorOpacityProduct = "1";
    }],
    ["wrapper-factor", (candidate: RawVisibleMathProjection) => {
      candidate.nodes[paintedIndex].opacityFactors.wrapperOpacityProduct = "1";
    }],
    ["wrapper-topology-opacity", (candidate: RawVisibleMathProjection) => {
      candidate.surface.wrapperTopology[0].opacity = "1";
    }],
    ["owner-opacity", (candidate: RawVisibleMathProjection) => {
      candidate.surface.ownerProjection.computedEffects.opacity = "1";
    }],
    ["document-opacity", (candidate: RawVisibleMathProjection) => {
      candidate.surface.documentAncestors[0].opacity = "1";
    }],
  ] as const) {
    const candidate = structuredClone(raw);
    corrupt(candidate);
    assert.throws(
      () => project(candidate),
      /opacity|factor|product|cumulative|wrapper|owner|document/i,
      label,
    );
  }

  const belowThreshold = structuredClone(raw);
  belowThreshold.nodes[paintedIndex].effectivePaint!.fill =
    "rgba(40, 80, 120, 0.001)";
  belowThreshold.nodes[paintedIndex].effectivePaint!.stroke =
    "rgba(12, 34, 56, 0.001)";
  assert.throws(
    () => project(belowThreshold),
    /alpha|visible|threshold|paint/i,
  );
});

test("dependent visible-math projector binds explicit title/desc topology and hardens own-property schemas", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  const withDesc = structuredClone(clean);
  withDesc.nodes.push({
    computedGeometry: [],
    computedRender: { ...clean.nodes[0].computedRender },
    coordinateMatrix: ["1", "0", "0", "1", "0", "0"],
    cssTransform: "none",
    effectivePaint: null,
    geometryAttributes: [],
    learnerVisible: false,
    opacityFactors: {
      localOpacity: "1",
      svgAncestorOpacityProduct: "1",
      wrapperOpacityProduct: "1",
    },
    parentIndex: 0,
    semanticAttributes: [],
    tagName: "desc",
    textHash: createHash("sha256").update("bounded accessibility description").digest("hex"),
    unsupportedIntermediateTransform: false,
  });
  assert.notEqual(project(withDesc).hash, target.hash);
  const changedDesc = structuredClone(withDesc);
  changedDesc.nodes.at(-1)!.textHash = createHash("sha256").update("changed description").digest("hex");
  assert.notEqual(project(changedDesc).hash, project(withDesc).hash);

  const symbolKey = structuredClone(clean) as unknown as Record<PropertyKey, unknown>;
  symbolKey[Symbol("hidden")] = true;
  assert.throws(() => project(symbolKey), /symbol|schema|plain object/i);
  const nonEnumerable = structuredClone(clean) as unknown as Record<string, unknown>;
  Object.defineProperty(nonEnumerable, "hidden", { enumerable: false, value: true });
  assert.throws(() => project(nonEnumerable), /schema|keys|data property/i);
  const accessor = structuredClone(clean) as unknown as Record<string, unknown>;
  const nodes = accessor.nodes;
  Object.defineProperty(accessor, "nodes", { enumerable: true, get: () => nodes });
  assert.throws(() => project(accessor), /data property|plain object|schema/i);
  assert.throws(() => project(new Proxy(clean, {})), /plain object|proxy|schema/i);
  const unknownAttribute = structuredClone(clean);
  unknownAttribute.nodes[0].geometryAttributes.push(["dx", "1"]);
  unknownAttribute.nodes[0].geometryAttributes.sort(([left], [right]) => left.localeCompare(right));
  assert.throws(() => project(unknownAttribute), /allowlist|geometry attribute/i);
  const manifest = await import("./hk-visualization-dependent-visible-math-contract");
  const aggregateEntry = {
    contractId: "explicit-accessibility-topology",
    projection: target.projection,
  } as Record<string, unknown>;
  Object.defineProperty(aggregateEntry, "hidden", { enumerable: false, value: true });
  assert.throws(
    () => manifest.aggregateHkVisualizationDependentVisibleMathActualProjections(
      [aggregateEntry] as never,
    ),
    /schema|keys|data property/i,
  );
});

test("dependent visible-math v8 rejects hostile projection graphs before hashing or aggregate mapping", async () => {
  const { expected } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  assert.ok(target);
  const manifest = await import(
    "./hk-visualization-dependent-visible-math-contract"
  ) as unknown as Record<string, unknown>;
  const aggregate = manifest
    .aggregateHkVisualizationDependentVisibleMathActualProjections as (
      projections: readonly unknown[],
    ) => unknown;
  assert.equal(typeof aggregate, "function");

  const assertPrivacySafeRejection = (
    operation: () => unknown,
    forbiddenMarker: string,
  ) => {
    assert.throws(operation, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(Buffer.byteLength(error.message, "utf8") <= 256);
      assert.ok(!error.message.includes(forbiddenMarker));
      assert.match(error.message, /bounded|budget|descriptor|plain|schema|count/i);
      return true;
    });
  };

  let accessorCalls = 0;
  const accessorProjection = structuredClone(target.projection) as
    Record<string, unknown>;
  const nodes = accessorProjection.nodes;
  Object.defineProperty(accessorProjection, "nodes", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return nodes;
    },
  });
  assertPrivacySafeRejection(
    () => aggregate([{
      contractId: "accessor-projection",
      projection: accessorProjection,
    }]),
    "accessor-projection-private",
  );
  assert.equal(accessorCalls, 0, "projection accessors must never execute");

  const toJsonMarker = "PRIVATE_TO_JSON_MARKER_71bd";
  let toJsonCalls = 0;
  const toJsonProjection = structuredClone(target.projection) as
    Record<string, unknown>;
  Object.defineProperty(toJsonProjection, "toJSON", {
    enumerable: true,
    value() {
      toJsonCalls += 1;
      throw new Error(toJsonMarker);
    },
  });
  assertPrivacySafeRejection(
    () => aggregate([{
      contractId: "to-json-projection",
      projection: toJsonProjection,
    }]),
    toJsonMarker,
  );
  assert.equal(toJsonCalls, 0, "projection toJSON must never execute");

  const cyclicMarker = "PRIVATE_CYCLE_MARKER_90c1";
  const cyclicProjection = structuredClone(target.projection) as
    Record<string, unknown>;
  cyclicProjection[cyclicMarker] = cyclicProjection;
  assertPrivacySafeRejection(
    () => aggregate([{
      contractId: "cyclic-projection",
      projection: cyclicProjection,
    }]),
    cyclicMarker,
  );

  let preLimitHashCalls = 0;
  const overCount = Array.from({ length: 33 }, (_, index) => {
    const projection = structuredClone(target.projection) as
      Record<string, unknown>;
    Object.defineProperty(projection, "toJSON", {
      enumerable: true,
      value() {
        preLimitHashCalls += 1;
        return projection;
      },
    });
    return {
      contractId: `over-count-${index}`,
      projection,
    };
  });
  assertPrivacySafeRejection(
    () => aggregate(overCount),
    "over-count-private",
  );
  assert.equal(
    preLimitHashCalls,
    0,
    "aggregate cardinality must be rejected before mapping or hashing",
  );
});

test("dependent visible-math v8 caps dense arrays and cumulative projection hash payloads before allocation", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  assert.ok(target);
  const contractSource = fs.readFileSync(
    "tests/e2e/hk-visualization-dependent-visible-math-contract.ts",
    "utf8",
  );
  const denseStart = contractSource.indexOf("function denseArray(");
  const denseEnd = contractSource.indexOf("\nfunction boundedString(", denseStart);
  assert.ok(denseStart >= 0 && denseEnd > denseStart);
  const denseSource = contractSource.slice(denseStart, denseEnd);
  const lengthCap = denseSource.indexOf("value.length > maximumLength");
  const ownKeys = denseSource.indexOf("Reflect.ownKeys");
  assert.ok(lengthCap >= 0, "dense arrays require a call-specific maximumLength");
  assert.ok(
    ownKeys < 0 || lengthCap < ownKeys,
    "dense-array length cap must run before Reflect.ownKeys",
  );
  assert.doesNotMatch(
    denseSource,
    /Array\.from\s*\(\s*\{\s*length:\s*value\.length/u,
    "dense-array validation must not allocate from hostile length",
  );
  assert.match(
    contractSource,
    /denseArray\([\s\S]{0,80}"dependent visible-math raw projection\.nodes",[\s\S]{0,80}raw\.nodes,[\s\S]{0,80}VISIBLE_MATH_MAX_NODES/u,
  );
  assert.match(
    contractSource,
    /denseArray\([\s\S]{0,80}"dependent visible-math actual projections",[\s\S]{0,80}projections,[\s\S]{0,80}32/u,
  );

  const cleanRaw = rawVisibleMathProjectionFromExpected(target.projection);
  const oversizedDense = structuredClone(cleanRaw);
  oversizedDense.nodes = Array.from(
    { length: 769 },
    () => structuredClone(cleanRaw.nodes[0]),
  );
  const oversizedSparse = structuredClone(cleanRaw);
  const sparseNodes = [] as RawVisibleMathProjection["nodes"];
  sparseNodes.length = 1_000_000;
  oversizedSparse.nodes = sparseNodes;
  for (const [label, raw] of [
    ["dense", oversizedDense],
    ["sparse", oversizedSparse],
  ] as const) {
    assert.throws(() => project(raw), (error: unknown) => {
      assert.ok(error instanceof Error, label);
      assert.ok(Buffer.byteLength(error.message, "utf8") <= 256, label);
      assert.match(error.message, /bounded|dense-array|length|schema/i, label);
      return true;
    });
  }

  const manifest = await import(
    "./hk-visualization-dependent-visible-math-contract"
  ) as unknown as Record<string, unknown>;
  const aggregate = manifest
    .aggregateHkVisualizationDependentVisibleMathActualProjections as (
      projections: readonly unknown[],
    ) => unknown;
  const oversizedProjection = structuredClone(target.projection) as
    DesiredVisibleMathProjection & { nodes: DesiredVisibleMathProjection["nodes"] };
  const template = structuredClone(target.projection.nodes[0]);
  oversizedProjection.nodes = Array.from({ length: 768 }, (_, index) => ({
    ...structuredClone(template),
    computedRender: {
      ...structuredClone(template.computedRender),
      fontFamily: `${index}:` + "x".repeat(500),
    },
    parentIndex: index === 0 ? -1 : 0,
  }));
  assert.throws(
    () => aggregate([{
      contractId: "over-budget-projection",
      projection: oversizedProjection,
    }]),
    /cumulative|payload|budget|bounded/i,
  );
});

test("dependent visible-math v8 pre-limits hostile strings and accounts escaped JSON before final hashing", async () => {
  const { expected, project } = await desiredVisibleMathHarness("p1-add-step");
  const target = expected[0];
  assert.ok(target);
  const manifest = await import(
    "./hk-visualization-dependent-visible-math-contract"
  ) as unknown as Record<string, unknown>;
  assert.equal(
    manifest.HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_RESOURCE_GUARANTEE,
    "enumerable-transport-fields-v1",
  );
  const aggregate = manifest
    .aggregateHkVisualizationDependentVisibleMathActualProjections as (
      projections: readonly unknown[],
    ) => unknown;

  const contractSource = fs.readFileSync(
    "tests/e2e/hk-visualization-dependent-visible-math-contract.ts",
    "utf8",
  );
  const boundedStart = contractSource.indexOf("function boundedString(");
  const boundedEnd = contractSource.indexOf(
    "\nfunction boundedDescriptorSafeJson(",
    boundedStart,
  );
  assert.ok(boundedStart >= 0 && boundedEnd > boundedStart);
  const boundedSource = contractSource.slice(boundedStart, boundedEnd);
  const utf16Precheck = boundedSource.indexOf(
    "value.length > VISIBLE_MATH_MAX_STRING_BYTES",
  );
  const boundedEncode = boundedSource.indexOf(".encode(value)");
  assert.ok(utf16Precheck >= 0 && boundedEncode > utf16Precheck);

  const hashStart = contractSource.indexOf(
    "function boundedDescriptorSafeJson(",
  );
  const hashEnd = contractSource.indexOf("\nfunction canonicalNumber(", hashStart);
  assert.ok(hashStart >= 0 && hashEnd > hashStart);
  const hashSource = contractSource.slice(hashStart, hashEnd);
  assert.match(
    hashSource,
    /candidate\.length > VISIBLE_MATH_MAX_STRING_BYTES[\s\S]*?encoder\.encode\(candidate\)/u,
  );
  assert.match(
    hashSource,
    /payloadBytes[\s\S]*?JSON\.stringify\(canonical\)/u,
  );
  assert.doesNotMatch(hashSource, /encoder\.encode\(serialized\)/u);

  const originalTextEncoder = globalThis.TextEncoder;
  const hostileEncodeMarker = "HOSTILE_FULL_STRING_ENCODE_7f09";
  const encodedInputLengths: number[] = [];
  class GuardedTextEncoder extends originalTextEncoder {
    override encode(input = "") {
      encodedInputLengths.push(input.length);
      if (input.length > 4_096) throw new Error(hostileEncodeMarker);
      return super.encode(input);
    }
  }
  Object.defineProperty(globalThis, "TextEncoder", {
    configurable: true,
    value: GuardedTextEncoder,
    writable: true,
  });
  try {
    const assertPrelimited = (
      operation: () => unknown,
      expectedMessage = /bounded|budget|string|payload|schema/i,
    ) => {
      assert.throws(operation, (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes(hostileEncodeMarker));
        assert.ok(Buffer.byteLength(error.message, "utf8") <= 256);
        assert.match(error.message, expectedMessage);
        return true;
      });
    };

    const hugeAscii = rawVisibleMathProjectionFromExpected(target.projection);
    hugeAscii.nodes[0].tagName = "a".repeat(1_000_000);
    assertPrelimited(() => project(hugeAscii));

    const overByteMultibyte = rawVisibleMathProjectionFromExpected(
      target.projection,
    );
    overByteMultibyte.nodes[0].tagName = "界".repeat(200);
    assertPrelimited(() => project(overByteMultibyte));

    const hugeKeyProjection = structuredClone(target.projection) as
      Record<string, unknown>;
    hugeKeyProjection["k".repeat(1_000_000)] = true;
    assertPrelimited(() => aggregate([{
      contractId: "hostile-key-projection",
      projection: hugeKeyProjection,
    }]));

    const escapedPayloadProjection = structuredClone(target.projection) as
      DesiredVisibleMathProjection & {
        nodes: DesiredVisibleMathProjection["nodes"];
      };
    const template = structuredClone(target.projection.nodes[0]);
    escapedPayloadProjection.nodes = Array.from(
      { length: 180 },
      (_, index) => ({
        ...structuredClone(template),
        computedRender: {
          ...structuredClone(template.computedRender),
          fontFamily: "\u0000".repeat(500),
        },
        parentIndex: index === 0 ? -1 : 0,
      }),
    );
    assertPrelimited(() => aggregate([{
      contractId: "escaped-payload-projection",
      projection: escapedPayloadProjection,
    }]), /payload/i);
    assert.ok(
      encodedInputLengths.every((length) => length <= 4_096),
      "no untrusted full string may reach TextEncoder before an O(1) precheck",
    );
  } finally {
    Object.defineProperty(globalThis, "TextEncoder", {
      configurable: true,
      value: originalTextEncoder,
      writable: true,
    });
  }

  const hiddenTransport = rawVisibleMathProjectionFromExpected(
    target.projection,
  ) as unknown as Record<string, unknown>;
  for (let index = 0; index < 4_096; index += 1) {
    Object.defineProperty(hiddenTransport, `hidden-${index}`, {
      enumerable: false,
      value: index,
    });
  }
  assert.throws(() => project(hiddenTransport), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.ok(Buffer.byteLength(error.message, "utf8") <= 256);
    assert.match(error.message, /exact schema|keys|data property/i);
    return true;
  });
});

test("dependent visible-math v8 helper pre-limits DOM collections and never labels attributes as computed geometry", () => {
  const helperSource = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  const captureStart = helperSource.indexOf("const rawVisibleMathProjections =");
  const captureEnd = helperSource.indexOf(
    "const visibleMathProjection =",
    captureStart,
  );
  assert.ok(captureStart >= 0 && captureEnd > captureStart);
  const captureSource = helperSource.slice(captureStart, captureEnd);
  assert.match(
    captureSource,
    /const selectorMatches = modelElement\.querySelectorAll\(selector\);[\s\S]*?selectorMatches\.length[\s\S]*?Array\.from\(selectorMatches\)/u,
    "selector NodeList cardinality must be checked before materialization",
  );
  assert.match(
    captureSource,
    /const descendantNodes = root\.querySelectorAll\("\*"\);[\s\S]*?descendantNodes\.length[\s\S]*?Array\.from\(descendantNodes\)/u,
    "descendant NodeList cardinality must be checked before materialization",
  );
  assert.match(
    captureSource,
    /while \(wrapper\) \{\s*if \(wrapperElements\.length >= 6\)/u,
    "wrapper ancestry must cap in-loop before push",
  );
  assert.match(
    captureSource,
    /while \(documentAncestor\) \{\s*if \(documentAncestorElements\.length >= 24\)/u,
    "document ancestry must cap in-loop before push",
  );
  const geometryStart = captureSource.indexOf("const computedGeometry =");
  const geometryEnd = captureSource.indexOf("const computedRender =", geometryStart);
  assert.ok(geometryStart >= 0 && geometryEnd > geometryStart);
  const geometrySource = captureSource.slice(geometryStart, geometryEnd);
  assert.doesNotMatch(
    geometrySource,
    /getAttribute\(name\)/u,
    "presentation attributes must not masquerade as computed geometry",
  );
  assert.match(
    geometrySource,
    /if \(!computedGeometryValue\)/u,
    "tag-required computed geometry must fail closed when computed style is blank",
  );
  const helperBoundedStart = captureSource.indexOf(
    "const boundedString = (label: string, value: string)",
  );
  const helperBoundedEnd = captureSource.indexOf(
    "const cssNumber =",
    helperBoundedStart,
  );
  assert.ok(helperBoundedStart >= 0 && helperBoundedEnd > helperBoundedStart);
  const helperBoundedSource = captureSource.slice(
    helperBoundedStart,
    helperBoundedEnd,
  );
  assert.match(
    helperBoundedSource,
    /value\.length > context\.visibleAttributeBytes[\s\S]*?utf8Bytes\(value\)/u,
  );
  assert.match(
    captureSource,
    /const maximumRawAttributeCount =[\s\S]*?if \(element\.attributes\.length > maximumRawAttributeCount\)/u,
    "NamedNodeMap must be capped before attribute traversal",
  );
  assert.match(
    captureSource,
    /semanticAttributes\.length \+ geometryAttributes\.length >=[\s\S]*?visiblePaintedSubtreeAttributeLimit[\s\S]*?\.push\(/u,
    "captured attributes must cap in-loop before push and sort",
  );
  assert.match(
    captureSource,
    /element\.childNodes\.length >[\s\S]*?visiblePaintedSubtreeTextNodeLimit[\s\S]*?for \(let childIndex/u,
    "child topology must be conservatively capped before text traversal",
  );
  assert.match(
    captureSource,
    /part\.length >[\s\S]*?visiblePaintedSubtreeTextBytes - textBytes[\s\S]*?utf8Bytes\(part\)[\s\S]*?directTextParts\.push\(part\)/u,
    "text must be length-prechecked before encode, join, and normalize",
  );
});

test("dependent visible-math browser capture bounds every dynamic return string and audits raw payload before serialization", () => {
  const helperSource = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  const captureStart = helperSource.indexOf("const rawVisibleMathProjections =");
  const captureEnd = helperSource.indexOf(
    "const visibleMathProjection =",
    captureStart,
  );
  assert.ok(captureStart >= 0 && captureEnd > captureStart);
  const captureSource = helperSource.slice(captureStart, captureEnd);
  assert.match(
    helperSource,
    /HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS/u,
    "the browser evaluate context must carry the independent literal transport limits",
  );
  assert.match(
    captureSource,
    /const topicId = boundedString\([\s\S]*?modelElement\.getAttribute\("data-hk-viz-topic"\)/u,
    "topicId must be bounded immediately at its DOM source",
  );
  assert.match(
    captureSource,
    /const candidateClip = boundedString\([\s\S]*?getPropertyValue\("clip-path"\)[\s\S]*?const candidateFilter = boundedString\([\s\S]*?getPropertyValue\("filter"\)[\s\S]*?const candidateMask = boundedString\(/u,
    "inherited clip/filter/mask strings must be bounded before assignment",
  );
  assert.match(
    captureSource,
    /fill: boundedString\([\s\S]*?computed\.fill[\s\S]*?stroke: boundedString\([\s\S]*?computed\.stroke/u,
    "computed fill and stroke strings must be bounded before the raw return graph",
  );
  assert.match(
    captureSource,
    /const cssTransform = boundedString\([\s\S]*?const preserveAspectRatio = boundedString\(/u,
    "node and surface transforms must be bounded before return",
  );
  assert.match(
    captureSource,
    /contractId: boundedString\([\s\S]*?selection\.contractId/u,
    "contractId must be bounded before the raw return graph",
  );
  assert.match(
    captureSource,
    /surfaceIdentity: boundedString\([\s\S]*?scrollportCssTransform: boundedString\([\s\S]*?svgCssTransform: boundedString\(/u,
    "surface identity and owner transforms must be bounded before return",
  );
  assert.match(
    captureSource,
    /rawTransportProjectionPayloadBytes:[\s\S]*?rawTransportAggregatePayloadBytes:/u,
    "per-projection and aggregate literal payload limits must cross the evaluate boundary",
  );
  assert.match(
    captureSource,
    /const rawTransportProjections = await Promise\.all[\s\S]*?auditRawTransportProjections\(rawTransportProjections\);[\s\S]*?return rawTransportProjections;/u,
    "bounded raw traversal must complete before Playwright serializes the return value",
  );
});

test("dependent visible-math browser transport pure auditor pre-limits hostile and cumulative payloads without marker echo", async () => {
  const manifest = await import(
    "./hk-visualization-dependent-visible-math-contract"
  ) as unknown as Record<string, unknown>;
  const limits = manifest
    .HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS as
    Readonly<{
      aggregatePayloadBytes: number;
      arrayItems: number;
      objectKeys: number;
      projectionCount: number;
      projectionNodes: number;
      projectionPayloadBytes: number;
      stringBytes: number;
    }> | undefined;
  const audit = manifest
    .auditHkVisualizationDependentVisibleMathBrowserTransport as
    ((projections: readonly unknown[]) => Readonly<{
      aggregatePayloadBytes: number;
      projectionCount: number;
    }>) | undefined;
  assert.ok(limits, "browser transport limits must be an exported literal authority");
  assert.equal(typeof audit, "function", "browser transport pure auditor is missing");
  const currentHarness = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const currentRawTransport = currentHarness.expected.map((entry) => ({
    contractId: entry.contractId,
    raw: rawVisibleMathProjectionFromExpected(entry.projection),
  }));
  const currentReceipt = audit!(currentRawTransport);
  assert.equal(currentReceipt.projectionCount, currentRawTransport.length);
  assert.ok(currentReceipt.aggregatePayloadBytes <= limits!.aggregatePayloadBytes);
  const clean = [{
    contractId: "clean-contract",
    raw: {
      nodes: [{
        effectivePaint: {
          fill: "rgb(1, 2, 3)",
          filter: "none",
          mask: "none",
          stroke: "rgb(4, 5, 6)",
        },
      }],
      topicId: "p1-addition-and-subtraction",
    },
  }];
  const receipt = audit!(clean);
  assert.equal(receipt.projectionCount, 1);
  assert.ok(receipt.aggregatePayloadBytes > 0);
  assert.ok(receipt.aggregatePayloadBytes <= limits!.aggregatePayloadBytes);

  const marker = "RAW_TRANSPORT_MARKER_C84A";
  const assertPrivateRejection = (value: readonly unknown[], pattern: RegExp) => {
    assert.throws(() => audit!(value), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(marker));
      assert.ok(Buffer.byteLength(error.message, "utf8") <= 256);
      assert.match(error.message, pattern);
      return true;
    });
  };
  assertPrivateRejection([{
    contractId: "topic-overflow",
    raw: { topicId: marker.repeat(50_000) },
  }], /bounded|string|transport/i);
  for (const field of ["filter", "mask", "fill", "stroke"] as const) {
    assertPrivateRejection([{
      contractId: `${field}-overflow`,
      raw: {
        effectivePaint: {
          [field]: `url(#${marker.repeat(50_000)})`,
        },
      },
    }], /bounded|string|transport/i);
  }

  const individuallyBounded = "x".repeat(220);
  assertPrivateRejection([{
    contractId: "projection-cumulative-overflow",
    raw: {
      a: Array.from({ length: 600 }, () => individuallyBounded),
      b: Array.from({ length: 600 }, () => individuallyBounded),
      c: Array.from({ length: 600 }, () => individuallyBounded),
      d: Array.from({ length: 600 }, () => individuallyBounded),
    },
  }], /projection|payload|budget/i);
  const aggregateOverflow = Array.from({ length: 8 }, (_, index) => ({
    contractId: `aggregate-${index}`,
    raw: {
      left: Array.from({ length: 600 }, () => individuallyBounded),
      right: Array.from({ length: 600 }, () => individuallyBounded),
    },
  }));
  assertPrivateRejection(aggregateOverflow, /aggregate|payload|budget/i);
});

test("dependent visible-math exact11 topology and cross-phase hashes match an independent literal matrix", () => {
  const literalMatrix = [
    {
      sequenceId: "p1-number-bond-known-part",
      phases: [
        [35, ["counter-set", "whole-node", "known-part-node", "missing-part-node", "known-connector", "missing-connector"]],
        [35, ["counter-set", "whole-node", "known-part-node", "missing-part-node", "known-connector", "missing-connector"]],
        [35, ["counter-set", "whole-node", "known-part-node", "missing-part-node", "known-connector", "missing-connector"]],
      ],
      restoration: [35, ["counter-set", "whole-node", "known-part-node", "missing-part-node", "known-connector", "missing-connector"]],
    },
    {
      sequenceId: "p1-add-step",
      phases: [
        [4, ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
        [1, ["stationary-point"]],
        [1, ["stationary-point"]],
      ],
      restoration: [4, ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
    },
    {
      sequenceId: "p1-subtract-step",
      phases: [
        [4, ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
        [1, ["stationary-point"]],
        [1, ["stationary-point"]],
      ],
      restoration: [4, ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
    },
    {
      sequenceId: "p2-payment-at-least-price",
      phases: [
        [4, ["payment-bar", "price-segment-model"]],
        [4, ["payment-bar", "price-segment-model"]],
        [6, ["payment-bar", "price-segment-model", "change-segment-model"]],
      ],
      restoration: [7, ["payment-bar", "price-segment-model", "change-segment-model"]],
    },
    {
      sequenceId: "p4-divisor-within-number",
      phases: [
        [25, ["factor-pair-array"]],
        [10, ["factor-pair-array"]],
        [25, ["factor-pair-array"]],
      ],
      restoration: [19, ["factor-pair-array"]],
    },
    {
      sequenceId: "p5-first-proper-fraction",
      phases: [
        [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
      ],
      restoration: [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    },
    {
      sequenceId: "p5-second-proper-fraction",
      phases: [
        [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [48, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
      ],
      restoration: [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    },
    {
      sequenceId: "p5-third-proper-fraction",
      phases: [
        [54, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [54, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
        [54, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
      ],
      restoration: [72, ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    },
    {
      sequenceId: "p5-visible-volume-layers",
      phases: [
        [249, ["cuboid-footprint", "layer-stack", "dimension-arrows"]],
        [69, ["cuboid-footprint", "layer-stack", "dimension-arrows"]],
        [69, ["cuboid-footprint", "layer-stack", "dimension-arrows"]],
      ],
      restoration: [129, ["cuboid-footprint", "layer-stack", "dimension-arrows"]],
    },
    {
      sequenceId: "s3-identity-a-projects-b",
      phases: [
        [7, ["identity-square-whole"]],
        [7, ["identity-square-whole"]],
        [7, ["identity-square-whole"]],
      ],
      restoration: [7, ["identity-square-whole"]],
    },
    {
      sequenceId: "s3-identity-b-projects-a",
      phases: [
        [7, ["identity-square-whole"]],
        [7, ["identity-square-whole"]],
        [7, ["identity-square-whole"]],
      ],
      restoration: [7, ["identity-square-whole"]],
    },
  ] as const;
  const plans = allDependentTransitionPlans();
  assert.equal(literalMatrix.length, 11);
  assert.deepEqual(
    plans.map(({ sequenceId }) => sequenceId),
    literalMatrix.map(({ sequenceId }) => sequenceId),
  );
  for (const literal of literalMatrix) {
    const plan = plans.find(({ sequenceId }) => sequenceId === literal.sequenceId);
    assert.ok(plan);
    assert.deepEqual(
      plan.phases.map(({ visibleMathProjectionContract }) => [
        visibleMathProjectionContract.elementCount,
        visibleMathProjectionContract.contractIds,
      ]),
      literal.phases,
      `${literal.sequenceId} phase topology`,
    );
    assert.deepEqual(
      [
        plan.postSequenceRestoration.visibleMathProjectionContract.elementCount,
        plan.postSequenceRestoration.visibleMathProjectionContract.contractIds,
      ],
      literal.restoration,
    );
    const crossPhaseHashes = [
      ...plan.phases.map(
        ({ visibleMathProjectionContract }) =>
          visibleMathProjectionContract.expectedHashes.en.light,
      ),
      plan.postSequenceRestoration.visibleMathProjectionContract.expectedHashes.en.light,
    ];
    assert.equal(
      new Set(crossPhaseHashes).size,
      crossPhaseHashes.length,
      `${literal.sequenceId} visible math must bind each exact state independently`,
    );
  }
});

test("dependent visible-math topology is independent and complete for every affected exact11 surface", async () => {
  const cases = [
    ["p1-number-bond-known-part", ["counter-set", "whole-node", "known-part-node", "missing-part-node", "known-connector", "missing-connector"]],
    ["p1-add-step", ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
    ["p1-subtract-step", ["directed-jump", "jump-arrowhead", "start-point", "end-point"]],
    ["p2-payment-at-least-price", ["payment-bar", "price-segment-model"]],
    ["p4-divisor-within-number", ["factor-pair-array"]],
    ["p5-first-proper-fraction", ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    ["p5-second-proper-fraction", ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    ["p5-third-proper-fraction", ["source-fraction-bar:0", "source-fraction-bar:1", "source-fraction-bar:2", "signed-result-line"]],
    ["p5-visible-volume-layers", ["cuboid-footprint", "layer-stack", "dimension-arrows"]],
    ["s3-identity-a-projects-b", ["identity-square-whole"]],
    ["s3-identity-b-projects-a", ["identity-square-whole"]],
  ] as const;
  for (const [sequenceId, contractIds] of cases) {
    const { expected, project } = await desiredVisibleMathHarness(sequenceId);
    assert.deepEqual(expected.map(({ contractId }) => contractId), contractIds);
    for (const target of expected) {
      const clean = rawVisibleMathProjectionFromExpected(target.projection);
      assert.equal(project(clean).hash, target.hash);
      const missing = structuredClone(clean);
      missing.nodes.pop();
      let missingRejected = false;
      try {
        missingRejected = project(missing).hash !== target.hash;
      } catch {
        missingRejected = true;
      }
      assert.equal(missingRejected, true);
      const extra = structuredClone(clean);
      extra.nodes.push(structuredClone(extra.nodes.at(-1)!));
      let extraRejected = false;
      try {
        extraRejected = project(extra).hash !== target.hash;
      } catch {
        extraRejected = true;
      }
      assert.equal(extraRejected, true);
    }
  }
  const moneyExpand = await desiredVisibleMathHarness(
    "p2-payment-at-least-price",
    2,
  );
  assert.deepEqual(
    moneyExpand.expected.map(({ contractId }) => contractId),
    ["payment-bar", "price-segment-model", "change-segment-model"],
  );
});

test("dependent transition receipt selects the exact light/dark visible-math hash for phases and restoration", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p1-number-bond-known-part",
  );
  assert.ok(plan);
  const dark = observationForDependentTransitionPlan(
    plan,
    `cell:${plan.labId}:en:dark:desktop`,
  );
  assert.deepEqual(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, dark),
    [],
  );
  const wrongThemeHash = rehashDependentTransitionObservation({
    ...dark,
    phases: [{
      ...dark.phases[0],
      visibleMathProjection: {
        ...dark.phases[0].visibleMathProjection,
        hash: plan.phases[0].visibleMathProjectionContract.expectedHashes.en.light,
      },
    }, ...dark.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, wrongThemeHash)
      .some((issue) => /visible-math projection drifted|visible math/i.test(issue)),
  );
});

test("dependent visible-math numeric canonicalizer accepts equivalent float order and rejects meaningful or malformed geometry", async () => {
  const { expected, project } = await desiredVisibleMathHarness(
    "p2-payment-at-least-price",
    2,
  );
  const target = expected.find(
    ({ contractId }) => contractId === "price-segment-model",
  );
  assert.ok(target);
  const clean = rawVisibleMathProjectionFromExpected(target.projection);
  const rectIndex = clean.nodes.findIndex(({ tagName }) => tagName === "rect");
  assert.ok(rectIndex >= 0);
  const widthIndex = clean.nodes[rectIndex].geometryAttributes.findIndex(
    ([name]) => name === "width",
  );
  assert.ok(widthIndex >= 0);
  const exactWidth = Number(
    clean.nodes[rectIndex].geometryAttributes[widthIndex][1],
  );
  const equivalent = structuredClone(clean);
  equivalent.nodes[rectIndex].geometryAttributes[widthIndex][1] =
    String(exactWidth + 5e-13);
  assert.equal(project(equivalent).hash, target.hash);
  const meaningful = structuredClone(clean);
  meaningful.nodes[rectIndex].geometryAttributes[widthIndex][1] =
    String(exactWidth + 1e-4);
  assert.notEqual(project(meaningful).hash, target.hash);
  for (const invalid of ["-0", "NaN", "Infinity", "1e999", "1px", "M 0 ???"] ) {
    const malformed = structuredClone(clean);
    malformed.nodes[rectIndex].geometryAttributes[widthIndex][1] = invalid;
    assert.throws(() => project(malformed), /numeric|geometry|finite|malformed|negative zero/i);
  }

  const connectorHarness = await desiredVisibleMathHarness(
    "p1-number-bond-known-part",
  );
  const connector = connectorHarness.expected.find(
    ({ contractId }) => contractId === "known-connector",
  );
  assert.ok(connector);
  const connectorRaw = rawVisibleMathProjectionFromExpected(
    connector.projection,
  );
  const pathIndex = connectorRaw.nodes.findIndex(
    ({ tagName }) => tagName === "path",
  );
  assert.ok(pathIndex >= 0);
  const dIndex = connectorRaw.nodes[pathIndex].geometryAttributes.findIndex(
    ([name]) => name === "d",
  );
  assert.ok(dIndex >= 0);
  const forbiddenPaths = [
    // Relative commands are not equivalent to the exact absolute exact11 grammar.
    "m260 238 l214 276",
    // Unsupported command, truncated Q, an extra coordinate, and implicit repetition.
    "M260 238 C250 240 220 270 214 276",
    "M260 238 Q225 260 214",
    "M260 238 L214 276 99",
    "M260 238 214 276",
  ];
  for (const path of forbiddenPaths) {
    const malformed = structuredClone(connectorRaw);
    malformed.nodes[pathIndex].geometryAttributes[dIndex][1] = path;
    assert.throws(
      () => connectorHarness.project(malformed),
      /path|geometry|command|arity|grammar|malformed/i,
      path,
    );
  }

  const jumpHarness = await desiredVisibleMathHarness("p1-add-step");
  const arrow = jumpHarness.expected.find(
    ({ contractId }) => contractId === "jump-arrowhead",
  );
  assert.ok(arrow);
  const arrowRaw = rawVisibleMathProjectionFromExpected(arrow.projection);
  const pointsNode = arrowRaw.nodes.findIndex(({ tagName }) => tagName === "polygon");
  assert.ok(pointsNode >= 0);
  const pointsIndex = arrowRaw.nodes[pointsNode].geometryAttributes.findIndex(
    ([name]) => name === "points",
  );
  assert.ok(pointsIndex >= 0);
  for (const points of ["1,2 3", "1,2 3,4 5", "1,2 nope,4"]) {
    const malformed = structuredClone(arrowRaw);
    malformed.nodes[pointsNode].geometryAttributes[pointsIndex][1] = points;
    assert.throws(
      () => jumpHarness.project(malformed),
      /points|coordinate|geometry|malformed/i,
      points,
    );
  }
});

test("dependent transition visible receipt binds exact locale and accepts scroll-reachable mobile geometry", () => {
  const p4 = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p4-divisor-within-number",
  );
  const p5 = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p5-first-proper-fraction",
  );
  assert.ok(p4);
  assert.ok(p5);

  const zh = observationForDependentTransitionPlan(
    p4,
    `cell:${p4.labId}:zh:light:mobile`,
    "zh",
  );
  assert.deepEqual(
    auditHkVisualizationDependentTransitionSequenceObservation(p4, zh),
    [],
  );
  const firstPhase = zh.phases[0];
  const englishText = p4.phases[0].visibleTextContracts[0].expectedTexts.en;
  const wrongLocale = rehashDependentTransitionObservation({
    ...zh,
    phases: [{
      ...firstPhase,
      visibleElements: [{
        ...firstPhase.visibleElements[0],
        textHash: createHash("sha256").update(englishText).digest("hex"),
      }, ...firstPhase.visibleElements.slice(1)],
    }, ...zh.phases.slice(1)],
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(p4, wrongLocale)
      .some((issue) => /language-bound text/i.test(issue)),
  );
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceReceipt({
      canonicalFingerprint: zh.postSequenceRestoration.canonicalFingerprint,
      cellId: zh.cellId,
      expectedPlans: [p4],
      language: "en",
      observations: [zh],
      theme: zh.theme,
    }).some((issue) => /language.*receipt header/i.test(issue)),
  );

  const mobileScrollable = observationForDependentTransitionPlan(
    p5,
    `cell:${p5.labId}:en:light:mobile`,
  );
  const rightmost = mobileScrollable.phases[0].visibleElements.at(-1);
  assert.ok(rightmost);
  assert.ok(
    rightmost.renderedGeometry.x + rightmost.renderedGeometry.width >
      mobileScrollable.phases[0].surface.scrollport.clientWidth,
  );
  assert.ok(
    rightmost.renderedGeometry.x + rightmost.renderedGeometry.width <=
      mobileScrollable.phases[0].surface.renderedSize.width,
  );
  assert.deepEqual(
    auditHkVisualizationDependentTransitionSequenceObservation(
      p5,
      mobileScrollable,
    ),
    [],
  );
  assert.ok(
    !("scrollLeft" in mobileScrollable.phases[0].surface.scrollport),
    "receipt must remain invariant to instantaneous scroller position",
  );
});

test("dependent transition canonical visible baseline uses an explicit 0.75 CSS-pixel restoration epsilon", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const first = clean.postSequenceRestoration.visibleElements[0];
  const shifted = (delta: number) => rehashDependentTransitionObservation({
    ...clean,
    postSequenceRestoration: {
      ...clean.postSequenceRestoration,
      visibleElements: [{
        ...first,
        renderedGeometry: {
          ...first.renderedGeometry,
          x: first.renderedGeometry.x + delta,
        },
      }, ...clean.postSequenceRestoration.visibleElements.slice(1)],
    },
  });
  assert.deepEqual(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      shifted(0.74),
    ),
    [],
  );
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      shifted(0.76),
    ).some((issue) => /deep-match.*0\.75 CSS px/i.test(issue)),
  );

  const userShifted = (delta: number) =>
    rehashDependentTransitionObservation({
      ...clean,
      postSequenceRestoration: {
        ...clean.postSequenceRestoration,
        visibleElements: [{
          ...first,
          userGeometry: {
            ...first.userGeometry,
            x: first.userGeometry.x + delta,
          },
        }, ...clean.postSequenceRestoration.visibleElements.slice(1)],
      },
    });
  assert.deepEqual(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      userShifted(0.74),
    ),
    [],
  );
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      userShifted(0.76),
    ).some((issue) => /deep-match.*0\.75 CSS px/i.test(issue)),
  );
});

test("dependent transition phase and restoration text digests cannot swap P5 subtract/add semantics", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p5-first-proper-fraction",
  );
  assert.ok(plan);
  const clean = observationForDependentTransitionPlan(plan);
  const phase = clean.phases[0];
  const subtractText = plan.phases[0].visibleTextContracts[1].expectedTexts.en;
  const addText = plan.postSequenceRestoration.visibleTextContracts[1]
    .expectedTexts.en;
  assert.ok(subtractText.endsWith("−"));
  assert.ok(addText.endsWith("+"));

  const wrongPhase = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...phase,
      visibleElements: [
        phase.visibleElements[0],
        {
          ...phase.visibleElements[1],
          textHash: createHash("sha256").update(addText).digest("hex"),
        },
        ...phase.visibleElements.slice(2),
      ],
    }, ...clean.phases.slice(1)],
  });
  const wrongRestoration = rehashDependentTransitionObservation({
    ...clean,
    postSequenceRestoration: {
      ...clean.postSequenceRestoration,
      visibleElements: [
        clean.postSequenceRestoration.visibleElements[0],
        {
          ...clean.postSequenceRestoration.visibleElements[1],
          textHash: createHash("sha256").update(subtractText).digest("hex"),
        },
        ...clean.postSequenceRestoration.visibleElements.slice(2),
      ],
    },
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(plan, wrongPhase)
      .some((issue) => /language-bound text/i.test(issue)),
  );
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      wrongRestoration,
    ).some((issue) => /language-bound text|deep-match/i.test(issue)),
  );
});

test("dependent transition baseline and restoration bind zh-Hans without cross-locale fallback", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p4-divisor-within-number",
  );
  assert.ok(plan);
  const clean = observationForDependentTransitionPlan(
    plan,
    `cell:${plan.labId}:zh-Hans:dark:mobile`,
    "zh-Hans",
  );
  const zhText = plan.postSequenceRestoration.visibleTextContracts[0]
    .expectedTexts.zh;
  const wrongHash = createHash("sha256").update(zhText).digest("hex");
  const baselineElements = [{
    ...clean.canonicalVisibleBaseline.visibleElements[0],
    textHash: wrongHash,
  }];
  const unhashedBaseline = {
    ...clean.canonicalVisibleBaseline,
    baselineHash: "",
    visibleElements: baselineElements,
  };
  const wrongBaseline = {
    ...unhashedBaseline,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        unhashedBaseline,
      ),
  };
  const wrongRestoration = {
    ...clean.postSequenceRestoration,
    visibleElements: [{
      ...clean.postSequenceRestoration.visibleElements[0],
      textHash: wrongHash,
    }],
  };
  for (const corruption of [
    rehashDependentTransitionObservation({
      ...clean,
      canonicalVisibleBaseline: wrongBaseline,
    }),
    rehashDependentTransitionObservation({
      ...clean,
      postSequenceRestoration: wrongRestoration,
    }),
  ]) {
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(
        plan,
        corruption,
      ).some((issue) => /language-bound text|deep-match/i.test(issue)),
    );
  }
});

test("dependent transition diagnostics hash untrusted text and strip URL query/hash bytes", () => {
  const secret = "SECRET_DIAGNOSTIC_MARKER_0f21";
  const sanitizedText = sanitizeHkVisualizationDiagnosticText(
    `${secret}${"x".repeat(20_000)}`,
  );
  const sanitizedUrl = sanitizeHkVisualizationDiagnosticUrl(
    `https://example.test/safe/path?token=${secret}#${secret}`,
  );
  const malformedUrl = sanitizeHkVisualizationDiagnosticUrl(
    `${secret}${"?".repeat(20_000)}`,
  );
  const secretPathUrl = sanitizeHkVisualizationDiagnosticUrl(
    `https://example.test/${secret}?token=${secret}#${secret}`,
  );
  for (const value of [
    sanitizedText,
    sanitizedUrl,
    malformedUrl,
    secretPathUrl,
  ]) {
    assert.ok(!value.includes(secret));
    assert.ok(Buffer.byteLength(value, "utf8") <= 768);
  }
  assert.match(sanitizedUrl, /^[0-9a-f]{64}$/u);
  assert.match(sanitizedText, /^bytes=\d+,sha256=[0-9a-f]{64}$/);
  assert.match(malformedUrl, /^[0-9a-f]{64}$/u);
  const helperSource = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(helperSource, /sanitizeHkVisualizationDiagnosticText\(failureText\)/);
  assert.match(helperSource, /sanitizeHkVisualizationDiagnosticText\(error\.message\)/);
  assert.match(helperSource, /sanitizeHkVisualizationDiagnosticText\(message\.text\(\)\)/);
  assert.match(helperSource, /constructHkVisualizationDiagnostic\(input\)/);
  assert.doesNotMatch(helperSource, /url\.pathname\}\$\{url\.search/);
  assert.match(
    helperSource,
    /result\.actualFinalUrl\s*=\s*sanitizeHkVisualizationDiagnosticUrl\(page\.url\(\)\)/,
  );
});

test("v8 durable diagnostic constructor fingerprints arbitrary methods and bounds every untrusted field", async () => {
  const ledger = await import("./hk-visualization-range-state-ledger") as
    Record<string, unknown>;
  const construct = ledger.constructHkVisualizationDiagnostic;
  assert.equal(typeof construct, "function");
  const build = construct as (input: Record<string, unknown>) => Record<string, unknown>;
  const secret = "sk-live-owner-secret-marker";
  const oversized = `${secret}:${"x".repeat(20_000)}`;
  const diagnostic = build({
    kind: "request-failed",
    message: oversized,
    method: `PURGE-${oversized}`,
    phase: oversized,
    resourceType: oversized,
    url: `https://${secret}.example.test/private/${secret}?token=${secret}#${secret}`,
  });
  const serialized = JSON.stringify(diagnostic);
  assert.doesNotMatch(serialized, new RegExp(secret, "u"));
  assert.equal(diagnostic.method, "OTHER");
  assert.equal(
    diagnostic.methodBytes,
    Buffer.byteLength(`PURGE-${oversized}`, "utf8"),
  );
  assert.match(String(diagnostic.methodSha256), /^[0-9a-f]{64}$/u);
  assert.ok(Buffer.byteLength(String(diagnostic.message), "utf8") <= 768);
  assert.ok(Buffer.byteLength(String(diagnostic.phase), "utf8") <= 64);
  assert.ok(Buffer.byteLength(String(diagnostic.resourceType), "utf8") <= 64);
  assert.ok(Buffer.byteLength(String(diagnostic.url), "utf8") <= 64);
  assert.doesNotMatch(String(diagnostic.url), /private|token|secret/i);

  for (const method of [
    "CONNECT", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST",
    "PUT", "TRACE",
  ]) {
    assert.equal(build({
      kind: "bad-response",
      message: "bounded",
      method,
      phase: "navigation",
      resourceType: "document",
      status: 500,
      url: "https://example.test/path?secret=1",
    }).method, method);
  }
});

test("v8 diagnostic fingerprints OWNER_MARKER_8C33 in every unknown phase and resource label", async () => {
  const ledger = await import("./hk-visualization-range-state-ledger") as
    Record<string, unknown>;
  const construct = ledger.constructHkVisualizationDiagnostic;
  assert.equal(typeof construct, "function");
  const build = construct as (input: Record<string, unknown>) =>
    Record<string, unknown>;
  const marker = "OWNER_MARKER_8C33";
  const diagnostic = build({
    kind: "request-failed",
    message: `message-${marker}`,
    method: "GET",
    phase: marker,
    resourceType: marker,
    url: `https://example.test/${marker}`,
  });
  const serialized = JSON.stringify(diagnostic);
  assert.doesNotMatch(serialized, /OWNER_MARKER_8C33/u);
  assert.match(String(diagnostic.phase), /^phase:[0-9a-f]{55}$/u);
  assert.match(String(diagnostic.resourceType), /^resource:[0-9a-f]{55}$/u);

  const allowed = build({
    kind: "bad-response",
    message: "bounded",
    phase: "navigation",
    resourceType: "document",
    status: 500,
  });
  assert.equal(allowed.phase, "navigation");
  assert.equal(allowed.resourceType, "document");

  const safeLookingButUnknown = build({
    kind: "request-failed",
    message: "bounded",
    phase: "owner-safe-label",
    resourceType: "worker",
  });
  assert.match(String(safeLookingButUnknown.phase), /^phase:[0-9a-f]{55}$/u);
  assert.match(
    String(safeLookingButUnknown.resourceType),
    /^resource:[0-9a-f]{55}$/u,
  );
});

test("durable cell failures are capped and retain no raw message, phase, selector, or details", async () => {
  const helperModule = await import(
    "./hk-visualization-machine-acceptance-helpers"
  ) as unknown as Record<string, unknown>;
  const append = helperModule.appendBoundedHkVisualizationFailureReceipt as (
    failures: Array<Record<string, unknown>>,
    code: string,
    message: string,
    phase?: string,
    selector?: string,
    details?: unknown,
  ) => void;
  assert.equal(typeof append, "function");
  const failures: Array<Record<string, unknown>> = [];
  const secret = "SECRET_FAILURE_RECEIPT_MARKER_8C33";
  append(
    failures,
    secret,
    `${secret}:valid-looking-code`,
    secret,
    secret,
    { secret },
  );
  assert.equal(failures[0].code, "UNTRUSTED_FAILURE_CODE");
  for (let index = 0; index < 65; index += 1) {
    append(
      failures,
      `UNTRUSTED-${index}-${secret}`,
      `${secret}:message:${index}${"x".repeat(2_000)}`,
      `${secret}:phase:${index}`,
      `[data-secret="${secret}:${index}"]`,
      { [`${secret}:key`]: `${secret}:value:${index}` },
    );
  }
  assert.equal(failures.length, 64);
  assert.equal(failures.at(-1)?.code, "FAILURE_RECEIPT_LIMIT");
  const serialized = JSON.stringify(failures);
  assert.ok(!serialized.includes(secret));
  assert.ok(failures.every((failure) =>
    typeof failure.message === "string" &&
    Buffer.byteLength(failure.message, "utf8") <= 768
  ));
  assert.deepEqual(failures[0].details, { reason: "details-redacted" });

  const helperSource = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(helperSource, /document\.fonts\.status/);
  assert.match(helperSource, /document\.fonts\.ready/);
  assert.match(helperSource, /Promise\.race/);

  const getterSecret = `${secret}:GETTER`;
  const overCap = Array.from({ length: 80 }, () => ({
    code: "RANGE_STATE_PLAN",
    message: "bounded",
  })) as Array<Record<string, unknown>>;
  Object.defineProperty(overCap[0], "message", {
    enumerable: true,
    get() {
      throw new Error(getterSecret);
    },
  });
  assert.doesNotThrow(() => append(
    overCap,
    "RANGE_STATE_PLAN",
    getterSecret,
  ));
  assert.equal(overCap.length, 64);
  assert.equal(overCap.at(-1)?.code, "FAILURE_RECEIPT_LIMIT");
  assert.ok(!JSON.stringify(overCap.slice(1)).includes(getterSecret));
});

test("dependent transition producer binds exact visible topology, text, and mathematical SVG attributes", () => {
  const requiredSemanticAttributes = new Map<string, readonly string[]>([
    ["p1-number-bond-known-part", ["data-viz-total", "__text"]],
    ["p1-add-step", ["d", "cx", "cy", "r"]],
    ["p1-subtract-step", ["d", "cx", "cy", "r"]],
    ["p2-payment-at-least-price", ["x", "y", "width", "height"]],
    ["p4-divisor-within-number", ["data-viz-dividend", "data-viz-divisor", "data-viz-quotient", "data-viz-remainder"]],
    ["p5-first-proper-fraction", ["data-viz-numerator", "data-viz-denominator", "data-viz-common-numerator", "data-viz-common-denominator"]],
    ["p5-second-proper-fraction", ["data-viz-numerator", "data-viz-denominator", "data-viz-common-numerator", "data-viz-common-denominator"]],
    ["p5-third-proper-fraction", ["data-viz-numerator", "data-viz-denominator", "data-viz-common-numerator", "data-viz-common-denominator"]],
    ["p5-visible-volume-layers", ["data-viz-visible-layers", "data-viz-total-layers", "data-viz-layer-size", "data-viz-volume"]],
    ["s3-identity-a-projects-b", ["data-viz-a", "data-viz-b", "data-viz-area"]],
    ["s3-identity-b-projects-a", ["data-viz-a", "data-viz-b", "data-viz-area"]],
  ]);
  for (const plan of allDependentTransitionPlans()) {
    const surfaces = [...plan.phases, plan.postSequenceRestoration];
    const observedAttributes = new Set(
      surfaces.flatMap(({ visibleBindings }) =>
        visibleBindings.map(({ attribute }) => attribute)
      ),
    );
    assert.ok(observedAttributes.has("__tag"));
    for (const attribute of requiredSemanticAttributes.get(plan.sequenceId) ?? []) {
      assert.ok(
        observedAttributes.has(attribute),
        `${plan.sequenceId} must compute visible attribute ${attribute}`,
      );
    }
    for (const surface of surfaces) {
      const topology = [...new Set(surface.visibleBindings.map(
        ({ vizName, occurrence }) => `${vizName}\u0000${occurrence}`,
      ))];
      assert.deepEqual(
        surface.visibleTextContracts.map(
          ({ vizName, occurrence }) => `${vizName}\u0000${occurrence}`,
        ),
        topology,
      );
      assert.ok(surface.visibleTextContracts.every(({ expectedTexts }) =>
        Object.keys(expectedTexts).join(",") === "en,zh,zh-Hans"
      ));
    }
  }

  const p4 = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p4-divisor-within-number",
  );
  assert.ok(p4);
  for (const phase of p4.phases) {
    const state = Object.fromEntries(
      phase.expectedPublicState.map(({ key, value }) => [key, value]),
    ) as Record<string, number | string | boolean>;
    const first = Number(state.firstNumber);
    const divisor = Number(state.candidateDivisor);
    const quotient = Math.floor(first / divisor);
    const remainder = first % divisor;
    const prefix = `${first} ÷ ${divisor} = ${quotient} r ${remainder} · `;
    assert.deepEqual(phase.visibleTextContracts[0].expectedTexts, remainder === 0
      ? { en: `${prefix}✓ factor`, zh: `${prefix}✓ 因數`, "zh-Hans": `${prefix}✓ 因数` }
      : { en: `${prefix}✕ not a factor`, zh: `${prefix}✕ 不是因數`, "zh-Hans": `${prefix}✕ 不是因数` });
  }

  const fractionPlans = allDependentTransitionPlans().filter(({ sequenceId }) =>
    sequenceId.startsWith("p5-") && sequenceId.endsWith("-proper-fraction")
  );
  for (const plan of fractionPlans) {
    assert.ok(plan.phases.every(({ visibleTextContracts }) =>
      visibleTextContracts.slice(1).every(({ expectedTexts }) =>
        Object.values(expectedTexts).every((text) => text.endsWith("−"))
      )
    ));
    assert.ok(plan.postSequenceRestoration.visibleTextContracts.slice(1).every(
      ({ expectedTexts }) =>
        Object.values(expectedTexts).every((text) => text.endsWith("+")),
    ));
  }
});

test("dependent transition schema and diagnostics cap size and never echo secret markers", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const secret = "SECRET_MARKER_8f542117";
  const hugeCellId = `${secret}${"x".repeat(20_000)}`;
  let schemaError = "";
  try {
    hashHkVisualizationDependentTransitionSequenceObservation({
      ...clean,
      cellId: hugeCellId,
    });
  } catch (error) {
    schemaError = error instanceof Error ? error.message : String(error);
  }
  assert.ok(schemaError.length > 0);
  assert.ok(!schemaError.includes(secret));
  assert.ok(Buffer.byteLength(schemaError, "utf8") <= 768);

  const unknownKeyPlan = {
    ...plan,
    [`${secret}${"k".repeat(10_000)}`]: true,
  };
  let keyError = "";
  try {
    hashHkVisualizationDependentTransitionSequencePlan(
      unknownKeyPlan as HkVisualizationDependentTransitionSequencePlan,
    );
  } catch (error) {
    keyError = error instanceof Error ? error.message : String(error);
  }
  assert.ok(keyError.length > 0);
  assert.ok(!keyError.includes(secret));
  assert.ok(Buffer.byteLength(keyError, "utf8") <= 768);

  const rawSecret = rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 0
      ? { ...phase, rawSerializedPublicState: `{"${secret}":1}` }
      : phase),
  });
  const issues = auditHkVisualizationDependentTransitionSequenceObservation(
    plan,
    rawSecret,
  );
  assert.ok(issues.length > 0);
  assert.ok(issues.length <= 64);
  assert.ok(issues.every((issue) =>
    !issue.includes(secret) && Buffer.byteLength(issue, "utf8") <= 768
  ));

  const overCardinality = [...clean.phases];
  while (overCardinality.length <= 520) overCardinality.push(clean.phases[0]);
  let cardinalityError = "";
  try {
    hashHkVisualizationDependentTransitionSequenceObservation({
      ...clean,
      phases: overCardinality,
    });
  } catch (error) {
    cardinalityError = error instanceof Error ? error.message : String(error);
  }
  assert.ok(/limit|cardinality|maximum|cap/i.test(cardinalityError));
  assert.ok(Buffer.byteLength(cardinalityError, "utf8") <= 768);

  const largeButIndividuallyBoundedPhase = {
    ...clean.phases[0],
    rawSerializedPublicState: "x".repeat(8_000),
  };
  let hashPayloadError = "";
  try {
    hashHkVisualizationDependentTransitionSequenceObservation({
      ...clean,
      phases: Array.from({ length: 70 }, () => largeButIndividuallyBoundedPhase),
    });
  } catch (error) {
    hashPayloadError = error instanceof Error ? error.message : String(error);
  }
  assert.match(hashPayloadError, /(?:hash payload.*limit|cumulative string budget)/i);
  assert.ok(Buffer.byteLength(hashPayloadError, "utf8") <= 768);

  const secretCellObservation = rehashDependentTransitionObservation({
    ...clean,
    cellId: `${secret}:cell`,
  });
  const receiptIssues = auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint: clean.postSequenceRestoration.canonicalFingerprint,
    cellId: "different-cell",
    expectedPlans: [plan],
    language: clean.language,
    observations: [secretCellObservation],
    theme: clean.theme,
  });
  assert.ok(receiptIssues.length > 0);
  assert.ok(receiptIssues.every((issue) =>
    !issue.includes(secret) && Buffer.byteLength(issue, "utf8") <= 768
  ));

  const firstPhase = clean.phases[0];
  const firstElement = firstPhase.visibleElements[0];
  const secretAttributes = [
    ...firstElement.attributes,
    [`data-secret-${secret}`, `${secret}:attribute-value`] as const,
  ].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const secretAttributeObservation = rehashDependentTransitionObservation({
    ...clean,
    phases: [{
      ...firstPhase,
      visibleElements: [{
        ...firstElement,
        attributes: secretAttributes,
      }, ...firstPhase.visibleElements.slice(1)],
    }, ...clean.phases.slice(1)],
  });
  const secretAttributeIssues =
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      secretAttributeObservation,
    );
  assert.ok(secretAttributeIssues.length > 0);
  assert.ok(secretAttributeIssues.every((issue) => !issue.includes(secret)));

  assert.throws(
    () => rehashDependentTransitionObservation({
      ...clean,
      phases: [{
        ...firstPhase,
        visibleElements: [{
          ...firstElement,
          attributes: [["data-viz-name", "x".repeat(257)]],
        }, ...firstPhase.visibleElements.slice(1)],
      }, ...clean.phases.slice(1)],
    }),
    /attribute.*byte limit|byte limit.*attribute/i,
  );
  assert.throws(
    () => rehashDependentTransitionObservation({
      ...clean,
      phases: [{
        ...firstPhase,
        visibleElements: Array.from(
          { length: 9 },
          () => firstElement,
        ),
      }, ...clean.phases.slice(1)],
    }),
    /visible element.*limit|limit.*visible element/i,
  );
});

test("P4 factor-pairs keeps hidden secondNumber out of all live descriptor and control lists", () => {
  const plan = allDependentTransitionPlans().find(
    ({ sequenceId }) => sequenceId === "p4-divisor-within-number",
  );
  assert.ok(plan);
  assert.deepEqual(
    plan.expectedLiveDescriptors.map(({ controlId }) => controlId),
    ["firstNumber", "candidateDivisor"],
  );
  assert.deepEqual(
    plan.descriptorEnvelope.map(({ controlId }) => controlId),
    ["firstNumber", "candidateDivisor"],
  );
  assert.ok(plan.phases.every((phase) =>
    phase.expectedValues.map(({ controlId }) => controlId).join(",") ===
      "firstNumber,candidateDivisor" &&
    phase.expectedDescriptors.map(({ controlId }) => controlId).join(",") ===
      "firstNumber,candidateDivisor"
  ));
  assert.deepEqual(
    plan.postSequenceRestoration.expectedValues.map(({ controlId }) => controlId),
    ["firstNumber", "candidateDivisor"],
  );
  assert.deepEqual(
    plan.phases[0].expectedPublicState,
    [
      { key: "mode", value: "factor-pairs" },
      { key: "firstNumber", value: 60 },
      { key: "secondNumber", value: 18 },
      { key: "candidateDivisor", value: 60 },
    ],
  );
  assert.throws(
    () => buildHkVisualizationDependentTransitionSequencePlans({
      descriptors: [
        { controlId: "firstNumber", initial: 24, maximum: 60, minimum: 1, step: 1 },
        { controlId: "secondNumber", initial: 18, maximum: 60, minimum: 1, step: 1 },
        { controlId: "candidateDivisor", initial: 6, maximum: 24, minimum: 1, step: 1 },
      ],
      domainId: "divisor-within-number-v1",
      labId: "p4-large-numbers",
      modeId: "factor-pairs",
    }),
    /expected live descriptor/i,
  );
});

test("dependent transition plan and observation hashes reject recursively malformed exact schemas", () => {
  const plan = allDependentTransitionPlans()[0];
  const observation = observationForDependentTransitionPlan(plan);
  const planMutations: unknown[] = [
    { ...plan, unexpected: true },
    { ...plan, modePreparation: [{ groupId: "model", modeId: "x", unexpected: true }] },
    { ...plan, descriptorEnvelope: [{ ...plan.descriptorEnvelope[0], unexpected: true }, ...plan.descriptorEnvelope.slice(1)] },
    { ...plan, expectedLiveDescriptors: [{ ...plan.expectedLiveDescriptors[0], unexpected: true }, ...plan.expectedLiveDescriptors.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], unexpected: true }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], actions: [{ ...plan.phases[0].actions[0], unexpected: true }] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], expectedDescriptors: [{ ...plan.phases[0].expectedDescriptors[0], unexpected: true }, ...plan.phases[0].expectedDescriptors.slice(1)] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], expectedValues: [{ ...plan.phases[0].expectedValues[0], unexpected: true }, ...plan.phases[0].expectedValues.slice(1)] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], expectedPublicState: [{ ...plan.phases[0].expectedPublicState[0], unexpected: true }, ...plan.phases[0].expectedPublicState.slice(1)] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], visibleBindings: [{ ...plan.phases[0].visibleBindings[0], unexpected: true }, ...plan.phases[0].visibleBindings.slice(1)] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], visibleTextContracts: [{ ...plan.phases[0].visibleTextContracts[0], unexpected: true }, ...plan.phases[0].visibleTextContracts.slice(1)] }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], visibleMathProjectionContract: { ...plan.phases[0].visibleMathProjectionContract, unexpected: true } }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], visibleMathProjectionContract: { ...plan.phases[0].visibleMathProjectionContract, selectors: [{ ...plan.phases[0].visibleMathProjectionContract.selectors[0], unexpected: true }, ...plan.phases[0].visibleMathProjectionContract.selectors.slice(1)] } }, ...plan.phases.slice(1)] },
    { ...plan, phases: [{ ...plan.phases[0], visibleMathProjectionContract: { ...plan.phases[0].visibleMathProjectionContract, expectedHashes: { ...plan.phases[0].visibleMathProjectionContract.expectedHashes, unexpected: true } } }, ...plan.phases.slice(1)] },
    { ...plan, postSequenceRestoration: { ...plan.postSequenceRestoration, unexpected: true } },
    { ...plan, postSequenceRestoration: { ...plan.postSequenceRestoration, visibleBindings: [{ ...plan.postSequenceRestoration.visibleBindings[0], unexpected: true }, ...plan.postSequenceRestoration.visibleBindings.slice(1)] } },
    { ...plan, postSequenceRestoration: { ...plan.postSequenceRestoration, visibleTextContracts: [{ ...plan.postSequenceRestoration.visibleTextContracts[0], unexpected: true }, ...plan.postSequenceRestoration.visibleTextContracts.slice(1)] } },
    { ...plan, postSequenceRestoration: { ...plan.postSequenceRestoration, visibleMathProjectionContract: { ...plan.postSequenceRestoration.visibleMathProjectionContract, unexpected: true } } },
  ];
  const planWithNullPrototype = Object.assign(Object.create(null), plan);
  planMutations.push(planWithNullPrototype);
  const planWithAccessor = { ...plan };
  Object.defineProperty(planWithAccessor, "labId", {
    enumerable: true,
    get: () => plan.labId,
  });
  planMutations.push(planWithAccessor);
  const hostilePlanProxy = new Proxy(plan, {
    ownKeys() {
      throw new Error("unbounded hostile payload must not escape");
    },
  });
  planMutations.push(hostilePlanProxy);
  for (const mutation of planMutations) {
    assert.throws(
      () => hashHkVisualizationDependentTransitionSequencePlan(
        mutation as HkVisualizationDependentTransitionSequencePlan,
      ),
      /exact schema/i,
    );
  }

  const firstPhase = observation.phases[0];
  const firstElement = firstPhase.visibleElements[0];
  const observationMutations: unknown[] = [
    { ...observation, unexpected: true },
    { ...observation, phases: [{ ...firstPhase, unexpected: true }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, controls: [{ ...firstPhase.controls[0], unexpected: true }, ...firstPhase.controls.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, controls: [{ ...firstPhase.controls[0], descriptor: { ...firstPhase.controls[0].descriptor, unexpected: true } }, ...firstPhase.controls.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, unexpected: true }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, paintedSubtree: { ...firstElement.paintedSubtree, unexpected: true } }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, renderedGeometry: { ...firstElement.renderedGeometry, unexpected: true } }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, userGeometry: { ...firstElement.userGeometry, unexpected: true } }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, surface: { ...firstPhase.surface, unexpected: true } }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, surface: { ...firstPhase.surface, viewBox: { ...firstPhase.surface.viewBox, unexpected: true } } }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleMathProjection: { ...firstPhase.visibleMathProjection, unexpected: true } }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, attributes: [["data-viz-name", "counter-set", "extra"]] }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, attributes: [["data-viz-name", "counter-set"], ["data-viz-name", "counter-set"]] }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, phases: [{ ...firstPhase, visibleElements: [{ ...firstElement, attributes: [["data-viz-name", "counter-set"], ["data-viz-name", "conflicting"]] }, ...firstPhase.visibleElements.slice(1)] }, ...observation.phases.slice(1)] },
    { ...observation, postSequenceRestoration: { ...observation.postSequenceRestoration, unexpected: true } },
    { ...observation, canonicalVisibleBaseline: { ...observation.canonicalVisibleBaseline, unexpected: true } },
    { ...observation, canonicalVisibleBaseline: { ...observation.canonicalVisibleBaseline, visibleMathProjection: { ...observation.canonicalVisibleBaseline.visibleMathProjection, unexpected: true } } },
    { ...observation, canonicalVisibleBaseline: { ...observation.canonicalVisibleBaseline, surface: { ...observation.canonicalVisibleBaseline.surface, scrollport: { ...observation.canonicalVisibleBaseline.surface.scrollport, unexpected: true } } } },
    { ...observation, postSequenceRestoration: { ...observation.postSequenceRestoration, surface: { ...observation.postSequenceRestoration.surface, unexpected: true } } },
    { ...observation, postSequenceRestoration: { ...observation.postSequenceRestoration, visibleMathProjection: { ...observation.postSequenceRestoration.visibleMathProjection, unexpected: true } } },
  ];
  const sparsePhases = [...observation.phases];
  delete sparsePhases[1];
  observationMutations.push({ ...observation, phases: sparsePhases });
  for (const mutation of observationMutations) {
    assert.throws(
      () => hashHkVisualizationDependentTransitionSequenceObservation(
        mutation as HkVisualizationDependentTransitionSequenceObservation,
      ),
      /exact schema/i,
    );
  }
});

test("post-sequence restoration rebinds canonical learner-visible evidence and rejects stale, hidden, empty, duplicate, or decoy surfaces", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  assert.ok(plan.postSequenceRestoration.visibleSelector.trim());
  assert.ok(plan.postSequenceRestoration.visibleBindings.length > 0);
  assert.ok(clean.postSequenceRestoration.visibleElements.length > 0);
  const first = clean.postSequenceRestoration.visibleElements[0];
  const staleAttributes = first.attributes.map(([name, value]) =>
    name === "data-viz-total" ? [name, "999"] as const : [name, value] as const
  );
  const corruptions = [
    { ...clean.postSequenceRestoration, visibleElements: [] },
    { ...clean.postSequenceRestoration, visibleElements: [{ ...first, attributes: staleAttributes }, ...clean.postSequenceRestoration.visibleElements.slice(1)] },
    { ...clean.postSequenceRestoration, visibleElements: [{ ...first, learnerVisible: false }, ...clean.postSequenceRestoration.visibleElements.slice(1)] },
    {
      ...clean.postSequenceRestoration,
      visibleElements: [{
        ...first,
        paintedSubtree: {
          ...first.paintedSubtree,
          hash: createHash("sha256")
            .update("stale-unselected-critical-descendant")
            .digest("hex"),
        },
      }, ...clean.postSequenceRestoration.visibleElements.slice(1)],
    },
    { ...clean.postSequenceRestoration, visibleElements: [{ ...first, renderedGeometry: { ...first.renderedGeometry, width: 0 } }, ...clean.postSequenceRestoration.visibleElements.slice(1)] },
    { ...clean.postSequenceRestoration, visibleElements: [...clean.postSequenceRestoration.visibleElements, { ...first }] },
    { ...clean.postSequenceRestoration, visibleElements: [...clean.postSequenceRestoration.visibleElements, { ...first, attributes: [["data-viz-name", "decoy"]] as const }] },
    { ...clean.postSequenceRestoration, visibleElements: [...clean.postSequenceRestoration.visibleElements].reverse() },
    {
      ...clean.postSequenceRestoration,
      surface: {
        ...clean.postSequenceRestoration.surface,
        scrollport: {
          ...clean.postSequenceRestoration.surface.scrollport,
          maxScrollLeft:
            clean.postSequenceRestoration.surface.scrollport.maxScrollLeft + 1,
        },
      },
    },
  ];
  for (const postSequenceRestoration of corruptions) {
    const corrupted = rehashDependentTransitionObservation({
      ...clean,
      postSequenceRestoration,
    });
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(plan, corrupted)
        .some((issue) => /post-sequence-restoration.*visible|topology count|deep-match/i.test(issue)),
    );
  }

  const staleBaselineElements = [{
    ...clean.canonicalVisibleBaseline.visibleElements[0],
    textHash: createHash("sha256").update("stale baseline").digest("hex"),
  }, ...clean.canonicalVisibleBaseline.visibleElements.slice(1)];
  const unhashedStaleBaseline = {
    ...clean.canonicalVisibleBaseline,
    baselineHash: "",
    visibleElements: staleBaselineElements,
  };
  const staleBaseline = {
    ...unhashedStaleBaseline,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        unhashedStaleBaseline,
      ),
  };
  const baselineMismatch = rehashDependentTransitionObservation({
    ...clean,
    canonicalVisibleBaseline: staleBaseline,
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      baselineMismatch,
    ).some((issue) => /baseline|deep-match|text/i.test(issue)),
  );
});

test("dependent transition receipt owns an independent canonical fingerprint header and exact input schema", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const canonicalFingerprint = `canonical:${plan.labId}`;
  assert.deepEqual(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint,
    cellId: clean.cellId,
    expectedPlans: [plan],
    language: clean.language,
    observations: [clean],
    theme: clean.theme,
  }), []);
  const internallyCoherentWrongFingerprint = rehashDependentTransitionObservation({
    ...clean,
    postSequenceRestoration: {
      ...clean.postSequenceRestoration,
      afterFingerprint: "canonical:wrong-cell",
      canonicalFingerprint: "canonical:wrong-cell",
    },
  });
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint,
    cellId: clean.cellId,
    expectedPlans: [plan],
    language: clean.language,
    observations: [internallyCoherentWrongFingerprint],
    theme: clean.theme,
  }).some((issue) => issue.includes("receipt header")));
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint,
    cellId: clean.cellId,
    expectedPlans: [plan],
    language: clean.language,
    observations: [clean],
    theme: clean.theme,
    unexpected: true,
  } as never).some((issue) => issue.includes("receipt exact schema")));
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    cellId: clean.cellId,
    canonicalFingerprint,
    expectedPlans: [plan],
    language: clean.language,
    theme: clean.theme,
    observations: [clean],
  } as never).some((issue) => issue.includes("receipt exact schema")));
});

test("dependent transition builder rejects live descriptor drift before planning", () => {
  const numberBond = dependentTransitionCases[0];
  assert.throws(
    () => buildHkVisualizationDependentTransitionSequencePlans({
      ...numberBond,
      descriptors: numberBond.descriptors.map((descriptor) =>
        descriptor.controlId === "total"
          ? { ...descriptor, maximum: 99 }
          : descriptor
      ),
    }),
    /expected live descriptor/i,
  );
});

test("dependent transition receipt accepts independently built plans and exact observations", () => {
  const plans = allDependentTransitionPlans();
  for (const plan of plans) {
    const observation = observationForDependentTransitionPlan(plan);
    assert.deepEqual(
      auditHkVisualizationDependentTransitionSequenceObservation(
        plan,
        observation,
      ),
      [],
    );
    assert.deepEqual(
      auditHkVisualizationDependentTransitionSequenceReceipt({
        canonicalFingerprint: observation.postSequenceRestoration.canonicalFingerprint,
        cellId: observation.cellId,
        expectedPlans: [plan],
        language: observation.language,
        observations: [observation],
        theme: observation.theme,
      }),
      [],
    );
  }
});

test("dependent transition public state requires exact canonical JSON bytes", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const nonCanonicalRawStates = [
    '{"total":20,"total":20,"knownPart":20}',
    '{ "total":20,"knownPart":20}',
    '{"knownPart":20,"total":20}',
    '{"total":20e0,"knownPart":20}',
    '{"total":20.0,"knownPart":20}',
    '{"total":20,"knownPart":-0}',
  ];

  for (const rawSerializedPublicState of nonCanonicalRawStates) {
    const corruption = rehashDependentTransitionObservation({
      ...clean,
      phases: clean.phases.map((phase, index) => index === 0
        ? { ...phase, rawSerializedPublicState }
        : phase),
    });
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(
        plan,
        corruption,
      ).some((issue) => issue.includes("canonical JSON bytes")),
      rawSerializedPublicState,
    );
  }
});

test("post-add restoration rejects the expanded descriptor and preserves the next subtract step", () => {
  const plans = allDependentTransitionPlans();
  const addPlan = plans.find(({ sequenceId }) => sequenceId === "p1-add-step");
  const subtractPlan = plans.find(({ sequenceId }) => sequenceId === "p1-subtract-step");
  assert.ok(addPlan);
  assert.ok(subtractPlan);
  const clean = observationForDependentTransitionPlan(addPlan);
  const expandedStep = addPlan.phases[2].expectedDescriptors.find(
    ({ controlId }) => controlId === "step",
  );
  const restoredStep = addPlan.postSequenceRestoration.expectedDescriptors.find(
    ({ controlId }) => controlId === "step",
  );
  const subtractStep = subtractPlan.expectedLiveDescriptors.find(
    ({ controlId }) => controlId === "step",
  );
  assert.equal(expandedStep?.maximum, 20);
  assert.equal(restoredStep?.maximum, 14);
  assert.equal(subtractStep?.maximum, 6);

  const missingStep = rehashDependentTransitionObservation({
    ...clean,
    postSequenceRestoration: {
      ...clean.postSequenceRestoration,
      controls: clean.postSequenceRestoration.controls.filter(
        ({ controlId }) => controlId !== "step",
      ),
    },
  });
  assert.ok(
    auditHkVisualizationDependentTransitionSequenceObservation(
      addPlan,
      missingStep,
    ).some((issue) => issue.includes("restoration descriptor/value completeness")),
  );
});

test("post-sequence restoration requires noncanonical-before, exact one click, and canonical-after", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const corruptions = [
    {
      ...clean.postSequenceRestoration,
      beforeFingerprint: clean.postSequenceRestoration.canonicalFingerprint,
    },
    {
      ...clean.postSequenceRestoration,
      afterFingerprint: "still-expanded",
    },
    {
      ...clean.postSequenceRestoration,
      resetClickCount: 0,
    },
    {
      ...clean.postSequenceRestoration,
      resetClickCount: 2,
    },
  ];
  for (const postSequenceRestoration of corruptions) {
    const corruption = rehashDependentTransitionObservation({
      ...clean,
      postSequenceRestoration,
    });
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(
        plan,
        corruption,
      ).some((issue) => issue.includes("noncanonical-before")),
    );
  }
});

test("dependent transition receipt rejects reset, resurrection, bounds, public-state, visible, hash, count, and order drift", () => {
  const plan = allDependentTransitionPlans()[0];
  const clean = observationForDependentTransitionPlan(plan);
  const corruptions: HkVisualizationDependentTransitionSequenceObservation[] = [];

  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) =>
      index === 2 ? { ...phase, resetCountSincePreviousPhase: 1 } : phase,
    ),
  }));
  for (const rawSerializedPublicState of ["null", "[]", "42"]) {
    corruptions.push(rehashDependentTransitionObservation({
      ...clean,
      phases: clean.phases.map((phase, index) => index === 1
        ? { ...phase, rawSerializedPublicState }
        : phase),
    }));
  }
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 1 ? {
      ...phase,
      visibleElements: [
        ...phase.visibleElements,
        { ...phase.visibleElements[0] },
      ],
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    modePreparation: [{ groupId: "unexpected", modeId: "unexpected" }],
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 2 ? {
      ...phase,
      controls: phase.controls.map((control) =>
        control.controlId === plan.dependentControlId
          ? { ...control, value: 20 }
          : control,
      ),
      stateSignature: phase.stateSignature.replace("knownPart=0", "knownPart=20"),
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 1 ? {
      ...phase,
      controls: phase.controls.map((control) =>
        control.controlId === plan.dependentControlId
          ? { ...control, descriptor: { ...control.descriptor, maximum: 1 } }
          : control,
      ),
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 1 ? {
      ...phase,
      rawSerializedPublicState: JSON.stringify({ total: 0, knownPart: 1 }),
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 1 ? {
      ...phase,
      visibleElements: phase.visibleElements.map((element) => ({
        ...element,
        renderedGeometry: { ...element.renderedGeometry, width: 0 },
        learnerVisible: false,
      })),
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: clean.phases.map((phase, index) => index === 1 ? {
      ...phase,
      visibleMathProjection: {
        ...phase.visibleMathProjection,
        elementCount: phase.visibleMathProjection.elementCount + 1,
        hash: createHash("sha256")
          .update("fully-rehashed-wrong-visible-math-projection")
          .digest("hex"),
      },
    } : phase),
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    canonicalVisibleBaseline: {
      ...clean.canonicalVisibleBaseline,
      visibleMathProjection: {
        ...clean.canonicalVisibleBaseline.visibleMathProjection,
        hash: createHash("sha256")
          .update("fully-rehashed-wrong-visible-math-baseline")
          .digest("hex"),
      },
    },
  }));
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    postSequenceRestoration: {
      ...clean.postSequenceRestoration,
      visibleMathProjection: {
        ...clean.postSequenceRestoration.visibleMathProjection,
        hash: createHash("sha256")
          .update("fully-rehashed-wrong-visible-math-restoration")
          .digest("hex"),
      },
    },
  }));
  corruptions.push({ ...clean, observationHash: "0".repeat(64) });
  corruptions.push(rehashDependentTransitionObservation({
    ...clean,
    phases: [clean.phases[1], clean.phases[0], clean.phases[2]],
  }));

  for (const corruption of corruptions) {
    assert.ok(
      auditHkVisualizationDependentTransitionSequenceObservation(
        plan,
        corruption,
      ).length > 0,
    );
  }
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint: clean.postSequenceRestoration.canonicalFingerprint,
    cellId: clean.cellId,
    expectedPlans: [plan],
    language: clean.language,
    observations: [],
    theme: clean.theme,
  }).length > 0);
  assert.ok(auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint: clean.postSequenceRestoration.canonicalFingerprint,
    cellId: clean.cellId,
    expectedPlans: [plan, plan],
    language: clean.language,
    observations: [clean, clean],
    theme: clean.theme,
  }).length > 0);
});

test("canonical helper owns a separate no-reset dependent-transition collector and never folds configured P3 into it", () => {
  const ledger = fs.readFileSync(
    "tests/e2e/hk-visualization-range-state-ledger.ts",
    "utf8",
  );
  const helper = fs.readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  assert.match(ledger, /configured P3[\s\S]*?intentionally excluded[\s\S]*?0\.\.d/i);
  assert.match(helper, /dependentTransitionSequenceObservations/);
  assert.match(helper, /executeHkVisualizationDependentTransitionSequences/);
  assert.match(helper, /projectExactHkDependentTransitionLiveRangeDescriptors\(\{/);
  assert.match(helper, /resetCountSincePreviousPhase/);
  assert.match(
    helper,
    /let\s+resetCountSincePreviousPhase\s*=\s*[\s\S]*?await\s+resetAndPrepareHkDependentTransitionMode\(/,
  );
  assert.match(helper, /observedResetClickCount\s*\+=\s*1/);
  assert.match(helper, /resetCountSincePreviousPhase\s*=\s*0/);
  const collector = helper.slice(
    helper.indexOf("async function executeHkVisualizationDependentTransitionSequences"),
    helper.indexOf("async function visibleDeclaredRanges"),
  );
  assert.equal(
    (collector.match(/resetAndPrepareHkDependentTransitionMode\(/g) ?? []).length,
    1,
  );
  const phaseLoop = collector.slice(collector.indexOf("for (const phase of plan.phases)"));
  assert.doesNotMatch(phaseLoop, /resetAndPrepareHkDependentTransitionMode\(/);
  assert.match(helper, /auditHkVisualizationDependentTransitionSequenceReceipt/);
  assert.match(helper, /postSequenceRestoration/);
  assert.match(helper, /canonicalVisibleBaseline/);
  assert.match(helper, /userGeometry/);
  assert.match(helper, /renderedGeometry/);
  assert.match(helper, /allowedAttributeNames/);
  assert.match(helper, /owner\.getScreenCTM/);
  assert.match(helper, /fingerprintHkVisualizationDependentTransitionDiagnostic\(\s*errorMessage\(error\)/);
  assert.match(helper, /latestError\s*=\s*fingerprintHkVisualizationDependentTransitionDiagnostic/);
  assert.match(helper, /undeclaredVisibleRanges\.map/);
  assert.doesNotMatch(helper, /data-viz-dynamic-model="true"/);
  assert.doesNotMatch(
    helper,
    /JSON\.stringify\(undeclaredVisibleRanges\)(?!\.map)/,
  );
  assert.match(helper, /beforeFingerprint/);
  assert.match(helper, /afterFingerprint/);
  assert.match(helper, /canonicalFingerprint/);
  assert.match(helper, /plan\.postSequenceRestoration/);
  assert.match(helper, /const\s+visibleSnapshot\s*=\s*await\s+observeHkDependentTransitionVisibleElements/);
  assert.match(helper, /visibleElements:\s*visibleSnapshot\.visibleElements/);
  assert.match(helper, /projectHkVisualizationDependentVisibleMathRawProjection/);
  assert.match(helper, /aggregateHkVisualizationDependentVisibleMathActualProjections/);
  assert.match(helper, /selections:\s*phase\.visibleMathProjectionContract\.selectors/);
  const rawProjectionCapture = helper.slice(
    helper.indexOf("const rawVisibleMathProjections"),
    helper.indexOf("const visibleMathProjection ="),
  );
  assert.ok(rawProjectionCapture.length > 0);
  assert.doesNotMatch(rawProjectionCapture, /phase\.visibleSelector/);
  assert.match(rawProjectionCapture, /root\.querySelectorAll\("\*"\)/);
  assert.match(rawProjectionCapture, /getComputedStyle\(paintAncestor\)/);
  assert.match(rawProjectionCapture, /cumulativeOpacity\s*\*=\s*opacity/);
  assert.match(rawProjectionCapture, /getPropertyValue\("clip-path"\)/);
  assert.match(rawProjectionCapture, /owner\.getScreenCTM\(\)/);
  assert.match(rawProjectionCapture, /preserveAspectRatio/);
  assert.match(rawProjectionCapture, /wrapperTopology/);
  assert.match(rawProjectionCapture, /documentAncestorElements/);
  assert.match(rawProjectionCapture, /documentAncestors/);
  assert.match(rawProjectionCapture, /globalThis\.document\.documentElement/);
  assert.match(rawProjectionCapture, /surfaceEffectAudit/);
  assert.match(rawProjectionCapture, /scale:\s*value\("scale",\s*"none"\)/);
  assert.match(rawProjectionCapture, /ownerProjection/);
  assert.match(rawProjectionCapture, /exactAttributes\(owner\)/);
  assert.match(rawProjectionCapture, /ownerTitleDescTopology/);
  assert.match(rawProjectionCapture, /layoutSize/);
  assert.match(rawProjectionCapture, /owner\.clientWidth/);
  assert.match(rawProjectionCapture, /roleForWrapper/);
  assert.match(rawProjectionCapture, /primary-svg-frame/);
  assert.match(rawProjectionCapture, /secondary-compact-frame/);
  assert.match(rawProjectionCapture, /paintAncestor\s*===\s*globalThis\.document\.documentElement/);
  assert.match(rawProjectionCapture, /unrecognized render-affecting attribute/);
  assert.match(rawProjectionCapture, /forbiddenRenderAttributeNames/);
  for (const family of [
    "dx", "dy", "textLength", "lengthAdjust", "pathLength",
    "stroke-dashoffset", "marker-start", "marker-mid", "marker-end",
    "vector-effect", "dominant-baseline", "alignment-baseline",
    "baseline-shift", "class", "style", "font-family", "font-style",
    "font-stretch", "letter-spacing", "word-spacing",
  ]) assert.match(rawProjectionCapture, new RegExp(family));
  assert.match(rawProjectionCapture, /accessibilityTagNames/);
  assert.match(helper, /theme:\s*result\.theme/);
  assert.match(helper, /visibleMathProjection:\s*visibleSnapshot\.visibleMathProjection/);
});
