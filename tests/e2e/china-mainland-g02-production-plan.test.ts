import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import { AppProviders } from "../../components/providers/AppProviders";
import {
  DecimalArithmeticLab,
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
} from "../../components/visualizations/mainland/DecimalArithmeticLab";
import {
  decimalArithmeticOperations,
  decimalArithmeticResetInput,
} from "../../components/visualizations/mainland/DecimalArithmeticModel";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import {
  G02_PRODUCTION_PLAN,
  validateG02ProductionPlan,
} from "./china-mainland-g02-production-plan";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const router = {
  back() {},
  forward() {},
  prefetch() {
    return Promise.resolve();
  },
  push() {},
  refresh() {},
  replace() {},
};

function liveControlsFor(
  labId: (typeof MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS)[number],
  operation: (typeof decimalArithmeticOperations)[number],
) {
  const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
  assert.ok(lab, `catalog fixture missing ${labId}`);
  const markup = renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router as never },
      React.createElement(
        PathnameContext.Provider,
        { value: "/visualization-lab" },
        React.createElement(
          AppProviders,
          null,
          React.createElement(DecimalArithmeticLab, {
            initialInput: {
              ...decimalArithmeticResetInput,
              estimateOperation:
                operation === "estimate-check" ? "add" : undefined,
              operation,
            },
            lab,
          }),
        ),
      ),
    ),
  );
  return [...markup.matchAll(/<input\b[^>]*data-viz-parameter="([^"]+)"[^>]*>/gu)].map(
    ([tag, controlId]) => {
      const attribute = (name: string) => {
        const match = tag.match(new RegExp(`\\b${name}="([^"]+)"`, "u"));
        assert.ok(match, `${controlId} missing ${name}`);
        return match[1];
      };
      return {
        controlId,
        max: Number(attribute("max")),
        min: Number(attribute("min")),
        step: Number(attribute("step")),
      };
    },
  );
}

test("G02 plan owns the exact ordered four-topic producer registry", () => {
  assert.equal(G02_PRODUCTION_PLAN.groupId, "G02");
  assert.deepEqual(G02_PRODUCTION_PLAN.labIds, MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS);
  assert.equal(new Set(G02_PRODUCTION_PLAN.labIds).size, 4);
  assert.equal(validateG02ProductionPlan(G02_PRODUCTION_PLAN), true);
});

test("G02 topics expose producer modes/reset and exact range endpoint plans", () => {
  assert.equal(G02_PRODUCTION_PLAN.playApplicable, false);
  for (const topic of G02_PRODUCTION_PLAN.topics) {
    assert.deepEqual(topic.allowedModes, decimalArithmeticOperations);
    assert.deepEqual(topic.reset, decimalArithmeticResetInput);
    for (const mode of topic.modes) {
      const expectedControls = liveControlsFor(topic.labId, mode.mode).map(
        ({ controlId, max, min, step }) => ({
          controlId,
          endpoints: [
            { endpoint: "min", value: min },
            { endpoint: "mid", value: Math.floor((min + max) / 2) },
            { endpoint: "max", value: max },
          ],
          kind: "range",
          max,
          min,
          step,
        }),
      );
      assert.deepEqual(mode.controls, expectedControls);
    }
    assert.deepEqual(topic.estimateFromOperations, decimalArithmeticOperations.slice(0, 4));
  }
});

test("G02 plan import never freezes producer-owned exports", () => {
  assert.equal(Object.isFrozen(MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS), false);
  assert.equal(Object.isFrozen(decimalArithmeticOperations), false);
  assert.equal(Object.isFrozen(decimalArithmeticResetInput), false);
  assert.notEqual(
    G02_PRODUCTION_PLAN.labIds,
    MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
  );
  assert.notEqual(
    G02_PRODUCTION_PLAN.topics[0].reset,
    decimalArithmeticResetInput,
  );
});

test("G02 separates 12 visual axes from two interaction axes and includes every estimate origin", () => {
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
  assert.deepEqual(G02_PRODUCTION_PLAN.coverage.visualAxes, expectedVisualAxes);
  assert.deepEqual(G02_PRODUCTION_PLAN.coverage.interactionAxes, [
    expectedVisualAxes[0],
    expectedVisualAxes.at(-1),
  ]);
  assert.equal(G02_PRODUCTION_PLAN.coverage.fullVisualInteractionCartesian, false);
  assert.equal(G02_PRODUCTION_PLAN.coverage.visualState, "reset");
  assert.deepEqual(G02_PRODUCTION_PLAN.logicalStates.counts, {
    interaction: 576,
    total: 624,
    visual: 48,
  });
  assert.equal(
    G02_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
      stateId.includes(":estimate-from:"),
    ).length,
    4 * 2 * 4,
  );
  assert.equal(
    new Set(G02_PRODUCTION_PLAN.logicalStates.allStateIds).size,
    G02_PRODUCTION_PLAN.logicalStates.counts.total,
  );
  assert.match(G02_PRODUCTION_PLAN.canonicalSha256, /^[a-f0-9]{64}$/);
});

test("G02 validator rejects missing, surplus, duplicate, and reordered contract members plus reset drift", async (t) => {
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
    ["reset drift", (candidate) => (candidate.topics[0].reset.precision += 1)],
    ["canonical SHA drift", (candidate) => (candidate.canonicalSha256 = "0".repeat(64))],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const candidate = structuredClone(G02_PRODUCTION_PLAN) as MutablePlan;
      mutate(candidate);
      assert.throws(() => validateG02ProductionPlan(candidate), TypeError);
    });
  }
});

test("G02 production plan is recursively frozen", () => {
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) visit(child);
  };
  visit(G02_PRODUCTION_PLAN);
});
