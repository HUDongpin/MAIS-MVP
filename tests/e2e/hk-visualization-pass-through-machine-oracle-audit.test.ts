import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS,
  type HKVisualizationPassThroughMathOracleContract
} from "./hk-visualization-pass-through-math-oracle-contract";
import {
  HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE,
  assertHkVisualizationPassThroughRawRendererOwnerIdentity,
  auditHkVisualizationPassThroughOracleObservation,
  recordHkVisualizationScrollObservationPhase,
  type HkVisualizationPassThroughOracleObservation
} from "./hk-visualization-machine-acceptance-helpers";

const helperSource = readFileSync(
  "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
  "utf8"
);

test("browser observation captures and independently audits the exact raw semantic renderer owner", () => {
  assert.match(helperSource, /contract\.rawRendererState\.broadOwnerSelector/u);
  assert.match(helperSource, /contract\.rawRendererState\.identitySelector/u);
  assert.match(helperSource, /contract\.rawRendererState\.attribute/u);
  assert.match(helperSource, /const rawRendererStateBroadEvidence =/u);
  assert.match(helperSource, /const rawRendererStateIdentityEvidence =/u);
  assert.match(helperSource, /assertHkVisualizationPassThroughRawRendererOwnerIdentity/u);
  assert.match(
    helperSource,
    /serializedState:\s*await rawRendererStateIdentityOwner\.getAttribute/u,
    "Serialized private state must be read from the exact identity owner, never merely the broad owner.",
  );
  assert.match(
    helperSource,
    /selectorEvidence:\s*rawRendererStateBroadEvidence/u,
    "The durable raw observation must preserve broad-owner evidence without changing the adapter schema.",
  );
  assert.match(helperSource, /const rawRendererState = \{/u);
  assert.match(helperSource, /auditHkVisualizationPassThroughRawRendererState/u);
  assert.match(
    helperSource,
    /formulaText:\s*observation\.formulaText/u,
    "The visible geometry auditor must receive the learner-visible formula text.",
  );
  assert.match(helperSource, /rawRendererState:\s*observation\.rawRendererState/u);
  assert.match(
    helperSource,
    /result\.passThroughOracleObservations\.push\(observation\)/u,
    "Every audited state must retain its public/raw/visible observation in the cell receipt."
  );
});

test("raw renderer broad and identity owners must each be unique, visible, and the same DOM node", () => {
  const exactVisible = { count: 1, learnerVisibleCount: 1 } as const;
  assert.doesNotThrow(() =>
    assertHkVisualizationPassThroughRawRendererOwnerIdentity(
      "p3-fractions-intro",
      exactVisible,
      exactVisible,
      true,
    ),
  );

  for (const [label, broadEvidence, identityEvidence, sameDomNode] of [
    ["broad duplicate", { count: 2, learnerVisibleCount: 2 }, exactVisible, false],
    ["broad hidden", { count: 1, learnerVisibleCount: 0 }, exactVisible, false],
    ["identity duplicate", exactVisible, { count: 2, learnerVisibleCount: 2 }, false],
    ["identity hidden", exactVisible, { count: 1, learnerVisibleCount: 0 }, false],
    ["different nodes", exactVisible, exactVisible, false],
  ] as const) {
    assert.throws(
      () =>
        assertHkVisualizationPassThroughRawRendererOwnerIdentity(
          "p3-fractions-intro",
          broadEvidence,
          identityEvidence,
          sameDomNode,
        ),
      /raw renderer (?:broad owner|identity owner|selectors)/u,
      label,
    );
  }
});

test("runtime scroll audit-entry phases retain duplicates for independent fail-closed validation", () => {
  const phases: string[] = [];
  recordHkVisualizationScrollObservationPhase(phases, "initial");
  recordHkVisualizationScrollObservationPhase(phases, "reset-enter");
  recordHkVisualizationScrollObservationPhase(phases, "reset-enter");
  assert.deepEqual(phases, ["initial", "reset-enter", "reset-enter"]);
  assert.throws(
    () => recordHkVisualizationScrollObservationPhase(phases, " reset-space"),
    /non-empty and canonical/u
  );
});

function contractFor(labId: string) {
  const contract = HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.find(
    (candidate) => candidate.labId === labId
  );
  assert.ok(contract, `Missing pass-through oracle contract for ${labId}.`);
  return contract;
}

function defaultKind(contract: HKVisualizationPassThroughMathOracleContract) {
  if (contract.labId === "p2-multiplication-foundations") return "array";
  if (contract.labId === "p3-fractions-intro") return "fraction";
  if (contract.labId === "advanced-functions") return "advanced-functions";
  if (contract.labId === "differentiation-intro" || contract.labId === "calculus") return "calculus";
  return "statistics";
}

function validObservation(
  contract: HKVisualizationPassThroughMathOracleContract,
  overrides: Partial<HkVisualizationPassThroughOracleObservation> = {}
): HkVisualizationPassThroughOracleObservation {
  const activeModeIds = contract.modeSelectors.length > 0
    ? [contract.modeSelectors[0].modeId]
    : [];
  const state: Record<string, unknown> = {
    activeMode: contract.labId === "differentiation-intro" || contract.labId === "calculus"
      ? "tangent"
      : contract.reset.modeId ?? undefined,
    check: "verified",
    comparison: 4,
    formula: "verified visible formula",
    height: 3,
    kind: defaultKind(contract),
    mode: 0,
    model: contract.modelId,
    semanticFamily: contract.modelId,
    selectedCurveOnly: contract.labId === "advanced-functions" ? true : undefined,
    strand: null,
    topic: contract.topicId,
    value: contract.labId === "p3-fractions-intro" ? 4 / 6 : 5,
    variant: contract.catalogVariant,
    ...contract.reset.state
  };
  const rawState = contract.labId === "p2-multiplication-foundations"
    ? { ...state, family: contract.modelId, kind: "array", product: state.total }
    : contract.labId === "p3-fractions-intro"
      ? {
          ...state,
          family: contract.modelId,
          kind: "fraction",
          resultDenominator: state.equivalentDenominator,
          resultNumerator: state.equivalentNumerator
        }
      : contract.labId === "advanced-functions"
        ? {
            family: contract.modelId,
            kind: "advanced-functions",
            metrics: {
              primaryFamily: state.family,
              scaleParameter: state.scale,
              verticalShift: state.verticalShift
            },
            variant: contract.labId
          }
        : contract.labId === "differentiation-intro" || contract.labId === "calculus"
          ? {
              family: contract.modelId,
              kind: "calculus",
              metrics: {
                curvature: state.curvature,
                functionValue: 0.5 * Number(state.curvature) * Number(state.probeX) ** 2 + 0.35,
                probeX: state.probeX,
                tangentSlope: state.slope
              },
              variant: contract.labId
            }
          : {
              family: contract.modelId,
              kind: "distribution",
              metrics: { mean: state.mean, spread: state.spread },
              variant: contract.labId
            };
  return {
    activeModeIds,
    formulaText: "verified visible formula",
    labId: contract.labId,
    modelIdentity: {
      moduleId: contract.moduleId,
      templateId: contract.templateId,
      topicId: contract.topicId
    },
    phase: "default-state",
    rawRendererState: {
      attribute: contract.rawRendererState.attribute,
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      serializedState: JSON.stringify(rawState)
    },
    selectorEvidence: {
      formula: { count: 1, learnerVisibleCount: 1 },
      model: { count: 1, learnerVisibleCount: 1 },
      reset: { count: 1, learnerVisibleCount: 1 },
      root: { count: 1, learnerVisibleCount: 1 },
      state: { count: 1, learnerVisibleCount: 1 }
    },
    modeSelectorEvidence: Object.fromEntries(contract.modeSelectors.map(({ modeId }) => [
      modeId,
      { count: 1, learnerVisibleCount: 1 }
    ])),
    state,
    visibleEvidenceText: "verified visible formula",
    visibleMathMarks: {},
    visibleNamedMarks: contract.namedVisibleMarks.map(({ name }) => name),
    ...overrides
  };
}

function issueCodes(observation: HkVisualizationPassThroughOracleObservation) {
  const contract = contractFor(observation.labId);
  return new Set(
    auditHkVisualizationPassThroughOracleObservation(contract, observation)
      .map(({ code }) => code)
  );
}

test("configured oracle envelope is explicit and excludes topic-math compatibility debris", () => {
  assert.deepEqual(HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE, {
    inputStateKeys: ["comparison", "height", "mode", "model", "strand", "topic", "value", "variant"],
    presentationStateKeys: ["activeMode", "check", "formula", "kind", "selectedCurveOnly", "semanticFamily"]
  });
  const allEnvelopeKeys = new Set<string>([
    ...HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE.inputStateKeys,
    ...HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE.presentationStateKeys
  ]);
  for (const forbiddenExtra of [
    "eqNum",
    "eqDen",
    "resultNumerator",
    "resultDenominator",
    "controllerValue",
    "displayMode",
    "multiplier",
    "standardDeviation",
    "variance",
    "summaryOnly",
    "symmetryResidual"
  ]) {
    assert.equal(allEnvelopeKeys.has(forbiddenExtra), false, forbiddenExtra);
  }
});

test("all seven exact pass-through observations pass the per-state oracle", () => {
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    assert.deepEqual(
      auditHkVisualizationPassThroughOracleObservation(contract, validObservation(contract)),
      [],
      contract.labId
    );
  }
});

test("selector, topic, mode, mark, formula, and forbidden-claim evidence fail closed", () => {
  const fraction = contractFor("p3-fractions-intro");
  assert.ok(issueCodes(validObservation(fraction, {
    selectorEvidence: {
      ...validObservation(fraction).selectorEvidence,
      state: { count: 2, learnerVisibleCount: 2 }
    }
  })).has("exact-selector"));
  assert.ok(issueCodes(validObservation(fraction, {
    modelIdentity: { moduleId: fraction.moduleId, templateId: fraction.templateId, topicId: "statistics-s1" }
  })).has("topic-model-identity"));
  assert.ok(issueCodes(validObservation(fraction, { activeModeIds: [] })).has("active-mode"));
  assert.ok(issueCodes(validObservation(fraction, { visibleNamedMarks: [] })).has("named-visible-mark"));
  assert.ok(issueCodes(validObservation(fraction, { formulaText: "" })).has("visible-formula"));

  const calculus = contractFor("calculus");
  assert.ok(issueCodes(validObservation(calculus, {
    visibleEvidenceText: "Tangent plus secant and accumulated area"
  })).has("forbidden-claim"));
});

test("payload validation requires canonical math keys and rejects all known redundant hidden fields", () => {
  const fraction = contractFor("p3-fractions-intro");
  const baseline = validObservation(fraction);
  assert.ok(issueCodes({
    ...baseline,
    state: { ...baseline.state, numerator: undefined }
  }).has("required-math-key"));
  for (const extra of [
    "eqNum",
    "eqDen",
    "resultNumerator",
    "resultDenominator",
    "controllerValue",
    "displayMode",
    "multiplier"
  ]) {
    assert.ok(issueCodes({
      ...baseline,
      state: { ...baseline.state, [extra]: 1 }
    }).has("unexpected-math-key"), extra);
  }
  for (const labId of ["statistics-s1", "data-handling"]) {
    const contract = contractFor(labId);
    const observation = validObservation(contract);
    for (const extra of ["standardDeviation", "variance", "summaryOnly", "symmetryResidual"]) {
      assert.ok(issueCodes({
        ...observation,
        state: { ...observation.state, [extra]: 1 }
      }).has("unexpected-math-key"), `${labId}:${extra}`);
    }
  }
});

test("formal fraction fields win over the value alias and inclusive endpoints remain valid", () => {
  const contract = contractFor("p3-fractions-intro");
  for (const numerator of [0, 10]) {
    const state = {
      ...validObservation(contract).state,
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: numerator * 2,
      numerator,
      value: numerator / 10
    };
    assert.deepEqual(
      auditHkVisualizationPassThroughOracleObservation(
        contract,
        validObservation(contract, { state })
      ),
      []
    );
  }
  assert.ok(issueCodes(validObservation(contract, {
    state: { ...validObservation(contract).state, value: 0.123 }
  })).has("compatibility-alias"));
});

test("topic-specific equations and reset-state evidence are checked, not just state shape", () => {
  const p2 = contractFor("p2-multiplication-foundations");
  assert.ok(issueCodes(validObservation(p2, {
    state: { ...validObservation(p2).state, total: 19 }
  })).has("math-invariant"));

  const calculus = contractFor("calculus");
  assert.ok(issueCodes(validObservation(calculus, {
    state: { ...validObservation(calculus).state, slope: 999 }
  })).has("math-invariant"));
  assert.ok(issueCodes(validObservation(calculus, {
    phase: "reset",
    state: { ...validObservation(calculus).state, probeX: 0 }
  })).has("reset-state"));
});

test("mode-less contracts reject a reintroduced phantom visible mode", () => {
  const contract = contractFor("advanced-functions");
  assert.ok(issueCodes(validObservation(contract, {
    activeModeIds: ["comparison"],
    modeSelectorEvidence: {
      comparison: { count: 1, learnerVisibleCount: 1 }
    }
  })).has("active-mode"));
});
