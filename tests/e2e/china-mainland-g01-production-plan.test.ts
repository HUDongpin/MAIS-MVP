import assert from "node:assert/strict";
import test from "node:test";

import { MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS } from "../../components/visualizations/mainland/MultiDigitOperationsLab";
import {
  MULTI_DIGIT_OPERATIONS_DOMAIN,
  MULTI_DIGIT_OPERATIONS_RESET_INPUT,
} from "../../components/visualizations/mainland/MultiDigitOperationsModel";
import {
  G01_PRODUCTION_PLAN,
  validateG01ProductionPlan,
} from "./china-mainland-g01-production-plan";

test("G01 plan owns the exact ordered nine-topic producer registry", () => {
  assert.equal(G01_PRODUCTION_PLAN.groupId, "G01");
  assert.deepEqual(
    G01_PRODUCTION_PLAN.labIds,
    MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  );
  assert.equal(new Set(G01_PRODUCTION_PLAN.labIds).size, 9);
  assert.equal(validateG01ProductionPlan(G01_PRODUCTION_PLAN), true);
});

test("G01 topics expose the producer modes, reset, controls, and exact endpoint plans", () => {
  assert.equal(G01_PRODUCTION_PLAN.playApplicable, false);
  for (const topic of G01_PRODUCTION_PLAN.topics) {
    assert.deepEqual(topic.allowedModes, [
      "add",
      "subtract",
      "multiply",
      "divide",
      "estimate-check",
    ]);
    assert.deepEqual(topic.reset, {
      ...MULTI_DIGIT_OPERATIONS_RESET_INPUT,
      exactOperation: MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation,
      roundingPlace: 10,
      strategyStep: 0,
    });

    const multiply = topic.modes.find(({ mode }) => mode === "multiply");
    assert.deepEqual(multiply?.controls, [
      {
        controlId: "operand-a",
        endpoints: [
          { endpoint: "min", value: 0 },
          { endpoint: "mid", value: 499_999 },
          { endpoint: "max", value: 999_999 },
        ],
        kind: "range",
        max: MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand,
        min: MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand,
        step: 1,
      },
      {
        controlId: "operand-b",
        endpoints: [
          { endpoint: "min", value: 0 },
          { endpoint: "mid", value: 499_999 },
          { endpoint: "max", value: 999_999 },
        ],
        kind: "range",
        max: MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand,
        min: MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand,
        step: 1,
      },
      {
        controlId: "strategy-step",
        endpoints: [
          { endpoint: "min", value: 0 },
          { endpoint: "mid", value: 1 },
          { endpoint: "max", value: 3 },
        ],
        kind: "range",
        max: 3,
        min: 0,
        step: 1,
      },
    ]);

    const subtract = topic.modes.find(({ mode }) => mode === "subtract");
    assert.deepEqual(subtract?.controls[1], {
      controlId: "operand-b",
      endpoints: [
        { endpoint: "min", value: 0 },
        {
          endpoint: "mid",
          value: {
            round: "floor",
            sourceMaxControlId: "operand-a",
            sourceMin: 0,
          },
        },
        {
          endpoint: "max",
          value: { sourceControlId: "operand-a" },
        },
      ],
      kind: "range",
      max: { sourceControlId: "operand-a" },
      min: 0,
      step: 1,
    });

    const divide = topic.modes.find(({ mode }) => mode === "divide");
    const divideOperandB = divide?.controls[1];
    assert.ok(divideOperandB && divideOperandB.kind === "range");
    assert.equal(divideOperandB.min, 1);
    assert.deepEqual(divideOperandB.endpoints, [
      { endpoint: "min", value: 1 },
      { endpoint: "mid", value: 500_000 },
      { endpoint: "max", value: 999_999 },
    ]);

    const estimate = topic.modes.find(
      ({ mode }) => mode === "estimate-check",
    );
    assert.deepEqual(estimate?.controls.slice(3), [
      {
        controlId: "estimate-operation",
        kind: "select",
        options: ["add", "subtract", "multiply", "divide"],
      },
      {
        controlId: "rounding-place",
        kind: "select",
        options: MULTI_DIGIT_OPERATIONS_DOMAIN.roundingPlaces,
      },
    ]);
    assert.deepEqual(
      estimate?.estimateOperationVariants.map(
        ({ controls, exactOperation }) => ({
          exactOperation,
          operandB: controls[1],
        }),
      ),
      [
        { exactOperation: "add", operandB: multiply?.controls[1] },
        { exactOperation: "subtract", operandB: subtract?.controls[1] },
        { exactOperation: "multiply", operandB: multiply?.controls[1] },
        { exactOperation: "divide", operandB: divide?.controls[1] },
      ],
    );
  }
});

test("G01 plan import never freezes producer-owned exports", () => {
  assert.equal(Object.isFrozen(MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS), false);
  assert.notEqual(
    G01_PRODUCTION_PLAN.labIds,
    MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  );
});

test("G01 separates all 12 visual axes from its two interaction axes and owns exact state IDs", () => {
  const expectedVisualAxes = ["desktop-chrome", "mobile-chrome"].flatMap(
    (project) =>
      ["en", "zh", "zh-Hans"].flatMap((locale) =>
        ["light", "dark"].map((theme) => ({
          axisId: `${project}|${locale}|${theme}`,
          locale,
          project,
          theme,
        })),
      ),
  );
  assert.deepEqual(G01_PRODUCTION_PLAN.coverage.visualAxes, expectedVisualAxes);
  assert.deepEqual(G01_PRODUCTION_PLAN.coverage.interactionAxes, [
    expectedVisualAxes[0],
    expectedVisualAxes.at(-1),
  ]);
  assert.equal(
    G01_PRODUCTION_PLAN.coverage.fullVisualInteractionCartesian,
    false,
  );
  assert.equal(G01_PRODUCTION_PLAN.coverage.visualState, "reset");

  assert.deepEqual(G01_PRODUCTION_PLAN.logicalStates.counts, {
    interaction: 1_620,
    total: 1_728,
    visual: 108,
  });
  assert.equal(
    new Set(G01_PRODUCTION_PLAN.logicalStates.allStateIds).size,
    G01_PRODUCTION_PLAN.logicalStates.counts.total,
  );
  assert.match(G01_PRODUCTION_PLAN.canonicalSha256, /^[a-f0-9]{64}$/);
});

test("G01 validator rejects missing, surplus, duplicate, and reordered contract members plus reset drift", async (t) => {
  type MutablePlan = any;
  const cases: Array<[string, (candidate: MutablePlan) => void]> = [
    ["missing lab", (candidate) => candidate.labIds.pop()],
    ["surplus lab", (candidate) => candidate.labIds.push("surplus-lab")],
    ["duplicate lab", (candidate) => (candidate.labIds[1] = candidate.labIds[0])],
    ["reordered lab", (candidate) => candidate.labIds.reverse()],
    ["missing allowed mode", (candidate) => candidate.topics[0].allowedModes.pop()],
    ["surplus allowed mode", (candidate) => candidate.topics[0].allowedModes.push("surplus-mode")],
    ["duplicate allowed mode", (candidate) => (candidate.topics[0].allowedModes[1] = candidate.topics[0].allowedModes[0])],
    ["reordered allowed mode", (candidate) => candidate.topics[0].allowedModes.reverse()],
    ["missing operational mode", (candidate) => candidate.topics[0].modes.pop()],
    ["surplus operational mode", (candidate) => candidate.topics[0].modes.push({ mode: "surplus-mode" })],
    ["duplicate operational mode", (candidate) => (candidate.topics[0].modes[1] = candidate.topics[0].modes[0])],
    ["reordered operational mode", (candidate) => candidate.topics[0].modes.reverse()],
    ["missing control", (candidate) => candidate.topics[0].modes[0].controls.pop()],
    ["surplus control", (candidate) => candidate.topics[0].modes[0].controls.push({ controlId: "surplus" })],
    ["duplicate control", (candidate) => (candidate.topics[0].modes[0].controls[1] = candidate.topics[0].modes[0].controls[0])],
    ["reordered control", (candidate) => candidate.topics[0].modes[0].controls.reverse()],
    ["missing endpoint", (candidate) => candidate.topics[0].modes[0].controls[0].endpoints.pop()],
    ["surplus endpoint", (candidate) => candidate.topics[0].modes[0].controls[0].endpoints.push({ endpoint: "surplus", value: 7 })],
    ["duplicate endpoint", (candidate) => (candidate.topics[0].modes[0].controls[0].endpoints[1] = candidate.topics[0].modes[0].controls[0].endpoints[0])],
    ["reordered endpoint", (candidate) => candidate.topics[0].modes[0].controls[0].endpoints.reverse()],
    ["missing visual axis", (candidate) => candidate.coverage.visualAxes.pop()],
    ["surplus visual axis", (candidate) => candidate.coverage.visualAxes.push({ axisId: "surplus" })],
    ["duplicate visual axis", (candidate) => (candidate.coverage.visualAxes[1] = candidate.coverage.visualAxes[0])],
    ["reordered visual axis", (candidate) => candidate.coverage.visualAxes.reverse()],
    ["missing interaction axis", (candidate) => candidate.coverage.interactionAxes.pop()],
    ["surplus interaction axis", (candidate) => candidate.coverage.interactionAxes.push({ axisId: "surplus" })],
    ["duplicate interaction axis", (candidate) => (candidate.coverage.interactionAxes[1] = candidate.coverage.interactionAxes[0])],
    ["reordered interaction axis", (candidate) => candidate.coverage.interactionAxes.reverse()],
    ["reset drift", (candidate) => (candidate.topics[0].reset.left += 1)],
    ["canonical SHA drift", (candidate) => (candidate.canonicalSha256 = "0".repeat(64))],
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const candidate = structuredClone(G01_PRODUCTION_PLAN) as MutablePlan;
      mutate(candidate);
      assert.throws(() => validateG01ProductionPlan(candidate), TypeError);
    });
  }
});

test("G01 production plan is recursively frozen", () => {
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) visit(child);
  };
  visit(G01_PRODUCTION_PLAN);
});
