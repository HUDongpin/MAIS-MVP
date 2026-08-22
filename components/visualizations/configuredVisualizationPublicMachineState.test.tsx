import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";

import { AppProviders } from "../providers/AppProviders";
import {
  CONFIGURED_VISUALIZATION_PUBLIC_MACHINE_STATE_ENVELOPE_KEYS,
  ConfiguredVisualizationLabDirect,
  deriveConfiguredVisualizationMachineState,
  projectConfiguredVisualizationPublicMachineState
} from "./ConfiguredVisualizationLab";
import {
  HK_PASS_THROUGH_LAB_IDS,
  type HKPassThroughLabId
} from "./hk/hkVisualizationLabRegistry";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import {
  getConfiguredVisualizationSemanticControlContract,
  getConfiguredVisualizationSemanticResetPlan
} from "./configuredVisualizationSemanticControls";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const router: AppRouterInstance = {
  back() {},
  forward() {},
  prefetch() {},
  push() {},
  refresh() {},
  replace() {}
};

const inputEnvelope = [
  "comparison",
  "height",
  "mode",
  "model",
  "strand",
  "topic",
  "value",
  "variant"
] as const;

const presentationEnvelope = [
  "activeMode",
  "check",
  "formula",
  "kind",
  "selectedCurveOnly",
  "semanticFamily"
] as const;

const exactPublicKeysByTopic: Readonly<Record<HKPassThroughLabId, readonly string[]>> = {
  "p2-multiplication-foundations": [
    "columns",
    "comparison",
    "formula",
    "height",
    "kind",
    "mode",
    "model",
    "rows",
    "strand",
    "topic",
    "total",
    "value",
    "variant"
  ],
  "p3-fractions-intro": [
    "comparison",
    "denominator",
    "equivalentDenominator",
    "equivalentNumerator",
    "formula",
    "height",
    "kind",
    "mode",
    "model",
    "numerator",
    "strand",
    "topic",
    "value",
    "variant"
  ],
  "statistics-s1": [
    "check",
    "comparison",
    "formula",
    "height",
    "kind",
    "mean",
    "mode",
    "model",
    "semanticFamily",
    "spread",
    "strand",
    "topic",
    "value",
    "variant"
  ],
  "data-handling": [
    "check",
    "comparison",
    "formula",
    "height",
    "kind",
    "mean",
    "mode",
    "model",
    "semanticFamily",
    "spread",
    "strand",
    "topic",
    "value",
    "variant"
  ],
  "advanced-functions": [
    "check",
    "comparison",
    "family",
    "formula",
    "height",
    "kind",
    "mode",
    "model",
    "scale",
    "selectedCurveOnly",
    "semanticFamily",
    "strand",
    "topic",
    "value",
    "variant",
    "verticalShift"
  ],
  "differentiation-intro": [
    "activeMode",
    "check",
    "comparison",
    "curvature",
    "formula",
    "height",
    "kind",
    "mode",
    "model",
    "probeX",
    "semanticFamily",
    "slope",
    "strand",
    "topic",
    "value",
    "variant"
  ],
  calculus: [
    "activeMode",
    "check",
    "comparison",
    "curvature",
    "formula",
    "height",
    "kind",
    "mode",
    "model",
    "probeX",
    "semanticFamily",
    "slope",
    "strand",
    "topic",
    "value",
    "variant"
  ]
};

const privateCompatibilityDebris = {
  controllerValue: 5,
  displayMode: 2,
  eqDen: 12,
  eqNum: 8,
  family: "should-not-cross-topic",
  multiplier: 2,
  resultDenominator: 12,
  resultNumerator: 8,
  standardDeviation: 2,
  summaryOnly: true,
  symmetryResidual: 0,
  variance: 4
};

const projectionInputs: Readonly<
  Record<HKPassThroughLabId, Readonly<{ comparison: number; family: string; height: number; mode: number; value: number }>>
> = {
  "p2-multiplication-foundations": { comparison: 5, family: "equal-groups-array", height: 3, mode: 0, value: 4 },
  "p3-fractions-intro": { comparison: 4, family: "fraction-equivalence", height: 3, mode: 0, value: 5 },
  "statistics-s1": { comparison: 2, family: "statistics-distribution", height: 3, mode: 0, value: 5 },
  "data-handling": { comparison: 2, family: "statistics-distribution", height: 3, mode: 0, value: 5 },
  "advanced-functions": { comparison: 4, family: "function-properties", height: 3, mode: 0, value: 5 },
  "differentiation-intro": { comparison: 4, family: "derivative-rate-area", height: 3, mode: 0, value: 5 },
  calculus: { comparison: 4, family: "derivative-rate-area", height: 3, mode: 0, value: 5 }
};

const crossTopicMathPayload = {
  columns: 5,
  curvature: 0.5,
  denominator: 6,
  equivalentDenominator: 12,
  equivalentNumerator: 8,
  mean: 5,
  numerator: 4,
  probeX: -0.8,
  rows: 4,
  scale: 5 / 6,
  slope: -0.4,
  spread: 2,
  total: 20,
  verticalShift: 0
};

function htmlDecodeAttribute(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function publicStateFromMarkup(markup: string) {
  const serialized = markup.match(/\sdata-viz-configured-state="([^"]*)"/)?.[1];
  assert.ok(serialized, "Configured SSR markup must expose its public machine-state attribute.");
  return JSON.parse(htmlDecodeAttribute(serialized)) as Readonly<Record<string, unknown>>;
}

function renderPassThroughLab(labId: HKPassThroughLabId) {
  const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
  assert.ok(lab, `${labId} must exist in the production visualization catalog.`);
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router },
      React.createElement(
        PathnameContext.Provider,
        { value: "/visualization-lab" },
        React.createElement(
          AppProviders,
          null,
          React.createElement(ConfiguredVisualizationLabDirect, { lab })
        )
      )
    )
  );
}

test("the public configured envelope is frozen independently from topic math payloads", () => {
  assert.deepEqual(CONFIGURED_VISUALIZATION_PUBLIC_MACHINE_STATE_ENVELOPE_KEYS, [
    ...inputEnvelope,
    ...presentationEnvelope
  ]);
  const publicEnvelopeKeys = new Set<string>(
    CONFIGURED_VISUALIZATION_PUBLIC_MACHINE_STATE_ENVELOPE_KEYS
  );
  for (const privateKey of Object.keys(privateCompatibilityDebris)) {
    assert.equal(
      publicEnvelopeKeys.has(privateKey),
      false,
      `${privateKey} must not become part of the generic public envelope.`
    );
  }
});

test("pure public projection gives all seven pass-through topics exact keys with no cross-topic leakage", () => {
  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    const input = projectionInputs[labId];
    const internalState = deriveConfiguredVisualizationMachineState({
      ...input,
      topic: labId,
      variant: labId
    });
    const source = {
      ...crossTopicMathPayload,
      ...internalState,
      ...privateCompatibilityDebris
    };
    const projected = projectConfiguredVisualizationPublicMachineState(labId, source);
    assert.deepEqual(Object.keys(projected).sort(), exactPublicKeysByTopic[labId]);
  }

  const nonPassThroughState = { topic: "integers", privateRendererField: 42 };
  assert.equal(
    projectConfiguredVisualizationPublicMachineState("integers", nonPassThroughState),
    nonPassThroughState,
    "Non-pass-through configured topics must retain their existing state object and behavior."
  );
});

test("production SSR serializes the exact public key set for each of the seven pass-through labs", () => {
  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    const state = publicStateFromMarkup(renderPassThroughLab(labId));
    assert.deepEqual(Object.keys(state).sort(), exactPublicKeysByTopic[labId], labId);
  }
});

test("advanced-functions clamps stale zero input to the same positive a in private and public projections", () => {
  const internal = deriveConfiguredVisualizationMachineState({
    comparison: 5,
    family: "function-properties",
    height: 3,
    mode: 99,
    topic: "advanced-functions",
    value: 0,
    variant: "advanced-functions"
  });
  assert.equal(internal.family, "quadratic");
  assert.equal(internal.scale, 1 / 6);
  assert.ok(Number(internal.scale) > 0);
  assert.match(String(internal.formula), /0\.17x² \+ 0/u);
  const publicState = projectConfiguredVisualizationPublicMachineState(
    "advanced-functions",
    internal
  );
  assert.equal(publicState.scale, 1 / 6);
  assert.equal(publicState.family, "quadratic");
  assert.deepEqual(Object.keys(publicState).sort(), exactPublicKeysByTopic["advanced-functions"]);
});

test("Configured product initialization and reset consume the topic-aware pure plan without 5/4/0 fallbacks", () => {
  const source = fs.readFileSync(
    "components/visualizations/ConfiguredVisualizationLab.tsx",
    "utf8"
  );
  assert.match(source, /getConfiguredVisualizationSemanticResetPlan/u);
  assert.doesNotMatch(source, /initialSemanticValueControl\?\.initial \?\? 5/u);
  assert.doesNotMatch(source, /initialSemanticComparisonControl\?\.initial \?\? 4/u);
  assert.doesNotMatch(source, /setValue\(nextValue\?\.initial \?\? 5\)/u);
  assert.doesNotMatch(source, /setComparison\(nextComparison\?\.initial \?\? 4\)/u);
  assert.doesNotMatch(source, /setMode\(contract\.modes\[0\]\?\.value \?\? 0\)/u);
});

test("every pass-through reset replaces a deliberately noncanonical state with its exact topic plan", () => {
  const familyByTopic = {
    "p2-multiplication-foundations": "equal-groups-array",
    "p3-fractions-intro": "fraction-equivalence",
    "statistics-s1": "statistics-distribution",
    "data-handling": "statistics-distribution",
    "advanced-functions": "function-properties",
    "differentiation-intro": "derivative-rate-area",
    calculus: "derivative-rate-area"
  } as const;
  const noncanonical = {
    "p2-multiplication-foundations": { comparison: 1, height: 9, mode: 99, value: 1 },
    "p3-fractions-intro": { comparison: 9, height: 9, mode: 99, value: 9 },
    "statistics-s1": { comparison: 1, height: 9, mode: 99, value: 0 },
    "data-handling": { comparison: 4, height: 9, mode: 99, value: 0 },
    "advanced-functions": { comparison: 0, height: 9, mode: 99, value: 10 },
    "differentiation-intro": { comparison: 10, height: 9, mode: 99, value: 0 },
    calculus: { comparison: 10, height: 9, mode: 99, value: 0 }
  } as const;
  const expectedMath = {
    "p2-multiplication-foundations": { columns: 5, rows: 4, total: 20 },
    "p3-fractions-intro": {
      denominator: 6,
      equivalentDenominator: 12,
      equivalentNumerator: 8,
      numerator: 4
    },
    "statistics-s1": { mean: 5, spread: 2 },
    "data-handling": { mean: 5, spread: 2 },
    "advanced-functions": { family: "quadratic", scale: 5 / 6, verticalShift: 0 },
    "differentiation-intro": { curvature: 0.5, probeX: -0.8, slope: -0.4 },
    calculus: { curvature: 0.5, probeX: -0.8, slope: -0.4 }
  } as const;
  for (const topic of HK_PASS_THROUGH_LAB_IDS) {
    const family = familyByTopic[topic];
    const contract = getConfiguredVisualizationSemanticControlContract(family, topic);
    assert.ok(contract, topic);
    const reset = getConfiguredVisualizationSemanticResetPlan(contract, topic);
    const before = deriveConfiguredVisualizationMachineState({
      ...noncanonical[topic],
      family,
      topic,
      variant: topic
    });
    const after = deriveConfiguredVisualizationMachineState({
      ...reset,
      family,
      topic,
      variant: topic
    });
    assert.notDeepEqual(
      projectConfiguredVisualizationPublicMachineState(topic, before),
      projectConfiguredVisualizationPublicMachineState(topic, after),
      `${topic} reset must visibly replace the deliberately noncanonical state.`
    );
    const afterPublic = projectConfiguredVisualizationPublicMachineState(topic, after);
    for (const [key, expected] of Object.entries(expectedMath[topic])) {
      assert.equal(afterPublic[key], expected, `${topic} reset ${key}`);
    }
    assert.equal(after.comparison, reset.comparison, `${topic} reset comparison`);
    assert.equal(after.height, reset.height, `${topic} reset height`);
    assert.equal(after.mode, reset.mode, `${topic} reset mode`);
  }
});
