import assert from "node:assert/strict";
import test from "node:test";

import {
  createSymbolicExpressionsControlDomainState,
  symbolicExpressionsControlDescriptorFor,
} from "../../components/visualizations/mainland/SymbolicExpressionsControlDomain";
import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_RESET_INPUTS,
} from "../../components/visualizations/mainland/SymbolicExpressionsModel";
import {
  G07_PRODUCTION_PLAN,
  validateG07ProductionPlan,
} from "./china-mainland-g07-production-plan";

test("G07 plan owns the exact ordered seven-topic producer registry", () => {
  assert.equal(G07_PRODUCTION_PLAN.groupId, "G07");
  assert.deepEqual(G07_PRODUCTION_PLAN.labIds, SYMBOLIC_EXPRESSIONS_LAB_IDS);
  assert.equal(new Set(G07_PRODUCTION_PLAN.labIds).size, 7);
  assert.notEqual(G07_PRODUCTION_PLAN.labIds, SYMBOLIC_EXPRESSIONS_LAB_IDS);
  assert.equal(validateG07ProductionPlan(G07_PRODUCTION_PLAN), true);
});

test("G07 topics derive every allowlist, reset, control, range, and endpoint from the control domain", () => {
  assert.equal(G07_PRODUCTION_PLAN.playApplicable, false);
  for (const topic of G07_PRODUCTION_PLAN.topics) {
    assert.deepEqual(
      topic.allowedModes,
      SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[topic.labId],
    );
    assert.deepEqual(topic.reset, {
      controlState: createSymbolicExpressionsControlDomainState(topic.labId),
      input: SYMBOLIC_EXPRESSIONS_RESET_INPUTS[topic.labId],
    });
    for (const modePlan of topic.modes) {
      const descriptor = symbolicExpressionsControlDescriptorFor(
        topic.labId,
        modePlan.mode,
      );
      assert.deepEqual(modePlan.descriptor, descriptor);
      assert.deepEqual(
        modePlan.controls,
        descriptor.controls.map((control) => ({
          ...control,
          endpoints: [
            { endpoint: "min", value: control.min },
            {
              endpoint: "mid",
              value: Math.floor((control.min + control.max) / 2),
            },
            { endpoint: "max", value: control.max },
          ],
          kind: "range",
        })),
      );
    }
  }
});

test("G07 separates all 12 visual axes from two interaction axes and owns exact state IDs", () => {
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
  assert.deepEqual(G07_PRODUCTION_PLAN.coverage.visualAxes, expectedVisualAxes);
  assert.deepEqual(G07_PRODUCTION_PLAN.coverage.interactionAxes, [
    expectedVisualAxes[0],
    expectedVisualAxes.at(-1),
  ]);
  assert.equal(G07_PRODUCTION_PLAN.coverage.fullVisualInteractionCartesian, false);
  assert.equal(G07_PRODUCTION_PLAN.coverage.visualState, "reset");
  assert.deepEqual(G07_PRODUCTION_PLAN.logicalStates.counts, {
    interaction: 548,
    total: 632,
    visual: 84,
  });
  assert.equal(
    new Set(G07_PRODUCTION_PLAN.logicalStates.allStateIds).size,
    G07_PRODUCTION_PLAN.logicalStates.counts.total,
  );
  assert.match(G07_PRODUCTION_PLAN.canonicalSha256, /^[a-f0-9]{64}$/);
});

test("G07 validator rejects missing, surplus, duplicate, and reordered contract members plus reset drift", async (t) => {
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
    ["reset drift", (candidate) => (candidate.topics[0].reset.controlState.coefficientA += 1)],
    ["canonical SHA drift", (candidate) => (candidate.canonicalSha256 = "0".repeat(64))],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const candidate = structuredClone(G07_PRODUCTION_PLAN) as MutablePlan;
      mutate(candidate);
      assert.throws(() => validateG07ProductionPlan(candidate), TypeError);
    });
  }
});

test("G07 production plan is recursively frozen", () => {
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) visit(child);
  };
  visit(G07_PRODUCTION_PLAN);
});
