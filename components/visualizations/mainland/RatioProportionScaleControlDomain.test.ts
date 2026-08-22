import assert from "node:assert/strict";
import test from "node:test";

import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODES,
  RATIO_PROPORTION_SCALE_UNITS,
  buildRatioProportionScaleState,
  type RatioProportionScaleInput,
  type RatioProportionScaleMode,
} from "./RatioProportionScaleModel";
import {
  RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT,
  RatioProportionScaleControlDomainError,
  auditRatioProportionScaleControlTransition,
  createRatioProportionScaleAcceptedActionReceipt,
  createRatioProportionScaleControlDomainState,
  createRatioProportionScaleRejectedActionReceipt,
  getRatioProportionScaleControlDomainDescriptor,
  planRatioProportionScaleControlTransition,
  type RatioProportionScaleControlDomainState,
  type RatioProportionScaleNumericControlId,
  type RatioProportionScaleVisibleControlId,
} from "./RatioProportionScaleControlDomain";

const LAB_ID = "pep-primary-p6-lower-ratio-proportion-scale" as const;

const expectedVisibleControls = {
  "direct-proportion": ["mode", "ratio-a", "ratio-b", "scale-factor"],
  "equivalent-ratios": ["mode", "ratio-a", "ratio-b", "scale-factor"],
  "inverse-proportion": ["mode", "ratio-a", "ratio-b", "scale-factor"],
  "scale-drawing": [
    "mode",
    "scale-factor",
    "drawing-length",
    "drawing-unit",
    "actual-unit",
  ],
} as const satisfies Record<
  RatioProportionScaleMode,
  readonly RatioProportionScaleVisibleControlId[]
>;

function modelInput(
  state: RatioProportionScaleControlDomainState,
): RatioProportionScaleInput {
  return {
    actualUnit: state.actualUnit,
    drawingLength: state.drawingLength,
    drawingUnit: state.drawingUnit,
    labId: state.labId,
    mode: state.mode,
    ratioA: state.ratioA,
    ratioB: state.ratioB,
    scaleFactor: state.scaleFactor,
  };
}

function applyMode(
  current: RatioProportionScaleControlDomainState,
  mode: RatioProportionScaleMode,
) {
  return planRatioProportionScaleControlTransition(current, {
    controllerId: "mode",
    kind: "controller",
    value: mode,
  }).expected;
}

function assertDomainError(
  callback: () => unknown,
  code: RatioProportionScaleControlDomainError["code"],
) {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof RatioProportionScaleControlDomainError &&
      error.code === code,
  );
}

test("declares one exact Lab and four versioned topic-mode control domains", () => {
  assert.equal(RATIO_PROPORTION_SCALE_LAB_ID, LAB_ID);
  assert.deepEqual(RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT, {
    id: "ratio-proportion-scale-controls-v1",
    labId: LAB_ID,
    modes: RATIO_PROPORTION_SCALE_MODES,
    version: 1,
  });
  const ids = RATIO_PROPORTION_SCALE_MODES.map(
    (mode) =>
      getRatioProportionScaleControlDomainDescriptor(LAB_ID, mode).domainId,
  );
  assert.deepEqual(ids, [
    "ratio-proportion-scale-equivalent-ratios-v1",
    "ratio-proportion-scale-direct-proportion-v1",
    "ratio-proportion-scale-inverse-proportion-v1",
    "ratio-proportion-scale-scale-drawing-v1",
  ]);
  assert.equal(new Set(ids).size, 4);
  assert(Object.isFrozen(RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT));
  assert(Object.isFrozen(RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT.modes));
});

test("descriptors expose only mode-relevant required controls and explicit domains", () => {
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const descriptor = getRatioProportionScaleControlDomainDescriptor(
      LAB_ID,
      mode,
    );
    assert.equal(descriptor.labId, LAB_ID);
    assert.equal(descriptor.mode, mode);
    assert.equal(descriptor.domainVersion, 1);
    assert.deepEqual(descriptor.visibleControls, expectedVisibleControls[mode]);
    assert.deepEqual(descriptor.requiredControls, expectedVisibleControls[mode]);
    assert.deepEqual(descriptor.dependencies, []);
    assert.equal(
      descriptor.independence,
      "all-visible-controls-use-static-model-safe-domains",
    );

    for (const domain of Object.values(descriptor.numericDomains)) {
      assert.deepEqual(domain, {
        kind: "integer",
        max: 10_000,
        min: 1,
        step: 1,
      });
    }

    if (mode === "scale-drawing") {
      assert.deepEqual(descriptor.unitDomains, {
        "actual-unit": {
          kind: "enum",
          options: RATIO_PROPORTION_SCALE_UNITS,
        },
        "drawing-unit": {
          kind: "enum",
          options: RATIO_PROPORTION_SCALE_UNITS,
        },
      });
    } else {
      assert.deepEqual(descriptor.unitDomains, {});
    }
    assert(Object.isFrozen(descriptor));
    assert(Object.isFrozen(descriptor.visibleControls));
    assert(Object.isFrozen(descriptor.numericDomains));
    assert(Object.isFrozen(descriptor.unitDomains));
  }
});

test("every per-mode reset is deterministic, deeply frozen, and exact-model valid", () => {
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const first = createRatioProportionScaleControlDomainState(LAB_ID, mode);
    const second = createRatioProportionScaleControlDomainState(LAB_ID, mode);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.equal(first.mode, mode);
    assert.equal(first.labId, LAB_ID);
    assert(Object.isFrozen(first));
    assert.doesNotThrow(() => buildRatioProportionScaleState(modelInput(first)));

    const changed = { ...first, scaleFactor: first.scaleFactor + 1 };
    const reset = planRatioProportionScaleControlTransition(changed, {
      kind: "reset",
    });
    assert.deepEqual(reset.expected, first);
    assert.deepEqual(reset.requested, first);
    assert.deepEqual(reset.projections, []);
  }
});

test("all visible numeric controls accept both static boundaries and remain model-valid", () => {
  let checked = 0;
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const descriptor = getRatioProportionScaleControlDomainDescriptor(
      LAB_ID,
      mode,
    );
    let current = createRatioProportionScaleControlDomainState(LAB_ID, mode);
    for (const controlId of Object.keys(
      descriptor.numericDomains,
    ) as RatioProportionScaleNumericControlId[]) {
      for (const value of [1, 10_000]) {
        const plan = planRatioProportionScaleControlTransition(current, {
          controlId,
          kind: "control",
          value,
        });
        assert.deepEqual(plan.projections, []);
        assert.deepEqual(plan.requested, plan.expected);
        assert.doesNotThrow(() =>
          buildRatioProportionScaleState(modelInput(plan.expected)),
        );
        current = plan.expected;
        checked += 1;
      }
    }
  }
  assert.equal(checked, 22);
});

test("direct numeric requests reject zero, noninteger, nonfinite, unsafe, and over-max values without projection", () => {
  let checked = 0;
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const current = createRatioProportionScaleControlDomainState(LAB_ID, mode);
    const descriptor = getRatioProportionScaleControlDomainDescriptor(
      LAB_ID,
      mode,
    );
    for (const controlId of Object.keys(
      descriptor.numericDomains,
    ) as RatioProportionScaleNumericControlId[]) {
      for (const value of [
        0,
        -1,
        1.5,
        10_001,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER,
      ]) {
        assertDomainError(
          () =>
            planRatioProportionScaleControlTransition(current, {
              controlId,
              kind: "control",
              value,
            }),
          Number.isSafeInteger(value)
            ? "DIRECT_CONTROL_OUT_OF_RANGE"
            : "INVALID_CONTROL_VALUE",
        );
        checked += 1;
      }
    }
  }
  assert.equal(checked, 77);
});

test("hidden numeric and unit controls hard reject instead of mutating dormant state", () => {
  const ratio = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "direct-proportion",
  );
  const scale = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "scale-drawing",
  );
  assertDomainError(
    () =>
      planRatioProportionScaleControlTransition(ratio, {
        controlId: "drawing-length",
        kind: "control",
        value: 10,
      }),
    "CONTROL_NOT_VISIBLE",
  );
  for (const controllerId of ["drawing-unit", "actual-unit"] as const) {
    assertDomainError(
      () =>
        planRatioProportionScaleControlTransition(ratio, {
          controllerId,
          kind: "controller",
          value: "mm",
        }),
      "CONTROL_NOT_VISIBLE",
    );
  }
  for (const controlId of ["ratio-a", "ratio-b"] as const) {
    assertDomainError(
      () =>
        planRatioProportionScaleControlTransition(scale, {
          controlId,
          kind: "control",
          value: 10,
        }),
      "CONTROL_NOT_VISIBLE",
    );
  }
});

test("scale-drawing exposes every explicit unit transition with no hidden normalization", () => {
  let current = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "scale-drawing",
  );
  let checked = 0;
  for (const controllerId of ["drawing-unit", "actual-unit"] as const) {
    for (const value of RATIO_PROPORTION_SCALE_UNITS) {
      const plan = planRatioProportionScaleControlTransition(current, {
        controllerId,
        kind: "controller",
        value,
      });
      assert.deepEqual(plan.requested, plan.expected);
      assert.deepEqual(plan.projections, []);
      assert.equal(
        controllerId === "drawing-unit"
          ? plan.expected.drawingUnit
          : plan.expected.actualUnit,
        value,
      );
      assert.doesNotThrow(() =>
        buildRatioProportionScaleState(modelInput(plan.expected)),
      );
      current = plan.expected;
      checked += 1;
    }
  }
  assert.equal(checked, 8);
});

test("invalid unit and mode controller values fail closed", () => {
  const scale = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "scale-drawing",
  );
  assertDomainError(
    () =>
      planRatioProportionScaleControlTransition(scale, {
        controllerId: "actual-unit",
        kind: "controller",
        value: "mile" as "m",
      }),
    "INVALID_UNIT",
  );
  assertDomainError(
    () =>
      planRatioProportionScaleControlTransition(scale, {
        controllerId: "mode",
        kind: "controller",
        value: "ratio-looking" as "scale-drawing",
      }),
    "INVALID_MODE",
  );
});

test("all mode transitions preserve independent controls and never resurrect a projected value", () => {
  let current: RatioProportionScaleControlDomainState = {
    actualUnit: "km",
    drawingLength: 10_000,
    drawingUnit: "mm",
    labId: LAB_ID,
    mode: "scale-drawing",
    ratioA: 9_999,
    ratioB: 10_000,
    scaleFactor: 10_000,
  };
  const original = { ...current };
  for (const targetMode of RATIO_PROPORTION_SCALE_MODES) {
    const plan = planRatioProportionScaleControlTransition(current, {
      controllerId: "mode",
      kind: "controller",
      value: targetMode,
    });
    assert.deepEqual(plan.projections, []);
    assert.deepEqual(plan.requested, plan.expected);
    assert.deepEqual(
      { ...plan.expected, mode: original.mode },
      original,
    );
    assert.doesNotThrow(() =>
      buildRatioProportionScaleState(modelInput(plan.expected)),
    );
    current = plan.expected;
  }
  const back = applyMode(current, "scale-drawing");
  assert.deepEqual(back, original);
});

test("the full source-target-mode, unit, and numeric-boundary matrix is model-safe with zero projections", () => {
  let checked = 0;
  for (const sourceMode of RATIO_PROPORTION_SCALE_MODES) {
    for (const targetMode of RATIO_PROPORTION_SCALE_MODES) {
      for (const drawingUnit of RATIO_PROPORTION_SCALE_UNITS) {
        for (const actualUnit of RATIO_PROPORTION_SCALE_UNITS) {
          for (const boundary of [1, 10_000]) {
            const current: RatioProportionScaleControlDomainState = {
              ...createRatioProportionScaleControlDomainState(
                LAB_ID,
                sourceMode,
              ),
              actualUnit,
              drawingLength: boundary,
              drawingUnit,
              ratioA: boundary,
              ratioB: boundary,
              scaleFactor: boundary,
            };
            const plan = planRatioProportionScaleControlTransition(current, {
              controllerId: "mode",
              kind: "controller",
              value: targetMode,
            });
            assert.deepEqual(plan.projections, []);
            assert.deepEqual(plan.requested, plan.expected);
            assert.doesNotThrow(() =>
              buildRatioProportionScaleState(modelInput(plan.expected)),
            );
            checked += 1;
          }
        }
      }
    }
  }
  assert.equal(checked, 512);
});

test("transition and audit receipts are immutable, JSON-safe, and preserve requested/expected/observed evidence", () => {
  const current = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "equivalent-ratios",
  );
  const plan = planRatioProportionScaleControlTransition(current, {
    controlId: "scale-factor",
    kind: "control",
    value: 10_000,
  });
  const receipt = auditRatioProportionScaleControlTransition(
    plan,
    plan.expected,
  );
  assert.equal(receipt.matchesExpected, true);
  assert.deepEqual(receipt.drift, []);
  assert.deepEqual(receipt.requested, plan.requested);
  assert.deepEqual(receipt.expected, plan.expected);
  assert.deepEqual(receipt.observed, plan.expected);
  assert.deepEqual(receipt.projections, []);
  assert(Object.isFrozen(plan));
  assert(Object.isFrozen(receipt));
  assert(Object.isFrozen(receipt.request));
  assert(Object.isFrozen(receipt.requested));
  assert(Object.isFrozen(receipt.expected));
  assert(Object.isFrozen(receipt.observed));
  assert(Object.isFrozen(receipt.projections));
  assert(Object.isFrozen(receipt.drift));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(receipt)));
});

test("accepted and rejected learner action receipts bind the exact request without reusing stale evidence", () => {
  const before = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "equivalent-ratios",
  );
  const acceptedPlan = planRatioProportionScaleControlTransition(before, {
    controlId: "ratio-a",
    kind: "control",
    value: 7,
  });
  const accepted = createRatioProportionScaleAcceptedActionReceipt({
    before,
    expected: acceptedPlan.expected,
    observed: acceptedPlan.expected,
    projections: acceptedPlan.projections,
    request: acceptedPlan.request,
    requested: acceptedPlan.requested,
  });
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.rejection, null);
  assert.deepEqual(accepted.request, {
    controlId: "ratio-a",
    kind: "control",
    value: 7,
  });
  assert.deepEqual(accepted.before, before);
  assert.deepEqual(accepted.requested, { ...before, ratioA: 7 });
  assert.deepEqual(accepted.expected, accepted.requested);
  assert.deepEqual(accepted.observed, accepted.requested);
  assert.deepEqual(accepted.projections, []);

  const rejectedRequest = {
    controlId: "ratio-a",
    kind: "control",
    value: 0,
  } as const;
  const rejected = createRatioProportionScaleRejectedActionReceipt({
    before,
    rejection: "DIRECT_CONTROL_OUT_OF_RANGE",
    request: rejectedRequest,
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.rejection, "DIRECT_CONTROL_OUT_OF_RANGE");
  assert.deepEqual(rejected.request, rejectedRequest);
  assert.deepEqual(rejected.before, before);
  assert.deepEqual(rejected.requested, before);
  assert.deepEqual(rejected.expected, before);
  assert.deepEqual(rejected.observed, before);
  assert.deepEqual(rejected.projections, []);
  assert.notDeepEqual(rejected, accepted);

  for (const receipt of [accepted, rejected]) {
    assert(Object.isFrozen(receipt));
    assert(Object.isFrozen(receipt.request));
    assert(Object.isFrozen(receipt.before));
    assert(Object.isFrozen(receipt.requested));
    assert(Object.isFrozen(receipt.expected));
    assert(Object.isFrozen(receipt.observed));
    assert(Object.isFrozen(receipt.projections));
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(receipt)));
  }
});

test("audit detects every asynchronous drift without rewriting the planned evidence", () => {
  const current = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "scale-drawing",
  );
  const plan = planRatioProportionScaleControlTransition(current, {
    controllerId: "drawing-unit",
    kind: "controller",
    value: "km",
  });
  const observed = {
    ...plan.expected,
    drawingLength: plan.expected.drawingLength + 1,
    drawingUnit: "m" as const,
  };
  const receipt = auditRatioProportionScaleControlTransition(plan, observed);
  assert.equal(receipt.matchesExpected, false);
  assert.deepEqual(receipt.drift, [
    {
      expected: plan.expected.drawingLength,
      key: "drawingLength",
      observed: observed.drawingLength,
    },
    {
      expected: "km",
      key: "drawingUnit",
      observed: "m",
    },
  ]);
  assert.deepEqual(receipt.requested, plan.requested);
  assert.deepEqual(receipt.expected, plan.expected);
});

test("invalid persisted identity, mode, unit, zero, noninteger, and unsafe states fail closed", () => {
  const valid = createRatioProportionScaleControlDomainState(
    LAB_ID,
    "equivalent-ratios",
  );
  const invalidStates = [
    { ...valid, labId: "not-g06" },
    { ...valid, mode: "not-a-mode" },
    { ...valid, drawingUnit: "inch" },
    { ...valid, actualUnit: "mile" },
    { ...valid, ratioA: 0 },
    { ...valid, ratioB: 1.5 },
    { ...valid, scaleFactor: Number.POSITIVE_INFINITY },
    { ...valid, drawingLength: Number.MAX_SAFE_INTEGER },
  ];
  for (const state of invalidStates) {
    assert.throws(
      () =>
        planRatioProportionScaleControlTransition(
          state as RatioProportionScaleControlDomainState,
          { kind: "reset" },
        ),
      RatioProportionScaleControlDomainError,
    );
  }
  assertDomainError(
    () =>
      createRatioProportionScaleControlDomainState(
        "not-g06" as typeof LAB_ID,
        "equivalent-ratios",
      ),
    "INVALID_LAB_ID",
  );
  assertDomainError(
    () =>
      getRatioProportionScaleControlDomainDescriptor(
        LAB_ID,
        "not-a-mode" as "equivalent-ratios",
      ),
    "INVALID_MODE",
  );
});
