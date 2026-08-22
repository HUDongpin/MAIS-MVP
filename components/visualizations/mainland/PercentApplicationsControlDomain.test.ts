import assert from "node:assert/strict";
import test from "node:test";

import {
  PERCENT_APPLICATIONS_LAB_IDS,
  PERCENT_APPLICATIONS_MODES,
  buildPercentApplicationsState,
  type PercentApplicationsInput,
} from "./PercentApplicationsModel";
import {
  PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT,
  PercentApplicationsControlDomainError,
  auditPercentApplicationsControlTransition,
  createPercentApplicationsControlDomainState,
  percentApplicationsControlContractFor,
  planPercentApplicationsControlTransition,
  type PercentApplicationsControlDomainState,
} from "./PercentApplicationsControlDomain";

const BNU_LAB_ID = "bnu-primary-p6-upper-percentage-applications" as const;
const PEP_LAB_ID = "pep-primary-p6-upper-percent-fractions" as const;

function modelInput(
  state: PercentApplicationsControlDomainState,
): PercentApplicationsInput {
  return {
    amount: state.amount,
    base: state.base,
    inverseDirection: state.inverseDirection,
    labId: state.labId,
    mode: state.mode,
    newValue: state.newValue,
    rateBasisPoints: state.rateBasisPoints,
  };
}

function applyController(
  current: PercentApplicationsControlDomainState,
  controllerId: "inverse-direction" | "mode",
  value: "decrease" | "increase" | (typeof PERCENT_APPLICATIONS_MODES)[number],
) {
  return planPercentApplicationsControlTransition(current, {
    controllerId,
    kind: "controller",
    value,
  }).expected;
}

test("declares the exact two-topic, seven-mode dynamic rate domain", () => {
  assert.equal(
    PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id,
    "percent-applications-rate-v1",
  );
  assert.equal(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.version, 1);
  assert.deepEqual(
    PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.labIds,
    PERCENT_APPLICATIONS_LAB_IDS,
  );
  assert.deepEqual(
    PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.modes,
    PERCENT_APPLICATIONS_MODES,
  );
  assert(Object.isFrozen(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT));
  assert(Object.isFrozen(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.labIds));
  assert(Object.isFrozen(PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.modes));
});

test("exposes mode-specific visible and required controls with exact rate bounds", () => {
  const expected = {
    convert: { controls: ["rate-basis-points"], min: 0, max: 50_000 },
    "find-part": {
      controls: ["base", "rate-basis-points"],
      min: 0,
      max: 50_000,
    },
    "find-whole": {
      controls: ["amount", "rate-basis-points"],
      min: 1,
      max: 50_000,
    },
    increase: {
      controls: ["base", "rate-basis-points"],
      min: 0,
      max: 50_000,
    },
    decrease: {
      controls: ["base", "rate-basis-points"],
      min: 0,
      max: 10_000,
    },
    discount: {
      controls: ["base", "rate-basis-points"],
      min: 0,
      max: 10_000,
    },
    inverse: {
      controls: [
        "new-value",
        "rate-basis-points",
        "inverse-direction",
      ],
      min: 0,
      max: 50_000,
    },
  } as const;

  for (const mode of PERCENT_APPLICATIONS_MODES) {
    const contract = percentApplicationsControlContractFor(mode, "increase");
    assert.deepEqual(contract.visibleControls, expected[mode].controls);
    assert.deepEqual(contract.requiredControls, expected[mode].controls);
    assert.deepEqual(contract.rate, {
      max: expected[mode].max,
      min: expected[mode].min,
      step: 1,
    });
    assert(Object.isFrozen(contract));
  }
  assert.equal(
    percentApplicationsControlContractFor("inverse", "decrease").rate.max,
    9_999,
  );
});

test("controller transitions are the only source of persistent clamp projections", () => {
  const high = {
    ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
    mode: "increase" as const,
    rateBasisPoints: 50_000,
  };
  const narrowed = planPercentApplicationsControlTransition(high, {
    controllerId: "mode",
    kind: "controller",
    value: "discount",
  });

  assert.equal(narrowed.requested.rateBasisPoints, 50_000);
  assert.equal(narrowed.expected.rateBasisPoints, 10_000);
  assert.deepEqual(narrowed.projections, [
    {
      controlId: "rate-basis-points",
      from: 50_000,
      projection: "clamp-max",
      reason: "discount-rate-cannot-exceed-100-percent",
      to: 10_000,
    },
  ]);

  const widened = applyController(narrowed.expected, "mode", "increase");
  const narrowedAgain = applyController(widened, "mode", "discount");
  assert.equal(widened.rateBasisPoints, 10_000);
  assert.equal(narrowedAgain.rateBasisPoints, 10_000);
});

test("inverse direction controls the 50000 versus 9999 basis-point maximum", () => {
  const inverseIncrease = {
    ...createPercentApplicationsControlDomainState(PEP_LAB_ID),
    inverseDirection: "increase" as const,
    mode: "inverse" as const,
    rateBasisPoints: 50_000,
  };
  const narrowed = planPercentApplicationsControlTransition(inverseIncrease, {
    controllerId: "inverse-direction",
    kind: "controller",
    value: "decrease",
  });
  assert.equal(narrowed.expected.rateBasisPoints, 9_999);
  assert.deepEqual(narrowed.projections, [
    {
      controlId: "rate-basis-points",
      from: 50_000,
      projection: "clamp-max",
      reason: "inverse-decrease-must-remain-below-100-percent",
      to: 9_999,
    },
  ]);
  const widened = applyController(
    narrowed.expected,
    "inverse-direction",
    "increase",
  );
  assert.equal(widened.rateBasisPoints, 9_999);
});

test("find-whole projects a controller-carried zero rate but rejects a direct zero", () => {
  const zero = {
    ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
    mode: "convert" as const,
    rateBasisPoints: 0,
  };
  const narrowed = planPercentApplicationsControlTransition(zero, {
    controllerId: "mode",
    kind: "controller",
    value: "find-whole",
  });
  assert.equal(narrowed.expected.rateBasisPoints, 1);
  assert.deepEqual(narrowed.projections, [
    {
      controlId: "rate-basis-points",
      from: 0,
      projection: "clamp-min",
      reason: "find-whole-rate-must-be-positive",
      to: 1,
    },
  ]);

  assert.throws(
    () =>
      planPercentApplicationsControlTransition(narrowed.expected, {
        controlId: "rate-basis-points",
        kind: "control",
        value: 0,
      }),
    (error: unknown) =>
      error instanceof PercentApplicationsControlDomainError &&
      error.code === "DIRECT_CONTROL_OUT_OF_RANGE",
  );
});

test("direct rate requests hard reject instead of masquerading as projections", () => {
  const discount = {
    ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
    mode: "discount" as const,
  };
  const inverseDecrease = {
    ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
    inverseDirection: "decrease" as const,
    mode: "inverse" as const,
  };

  for (const [state, value] of [
    [discount, 10_001],
    [inverseDecrease, 10_000],
  ] as const) {
    assert.throws(
      () =>
        planPercentApplicationsControlTransition(state, {
          controlId: "rate-basis-points",
          kind: "control",
          value,
        }),
      (error: unknown) =>
        error instanceof PercentApplicationsControlDomainError &&
        error.code === "DIRECT_CONTROL_OUT_OF_RANGE",
    );
  }
});

test("accepted dynamic boundary states remain valid in the exact math model", () => {
  const cases: PercentApplicationsControlDomainState[] = [
    {
      ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
      mode: "convert",
      rateBasisPoints: 50_000,
    },
    {
      ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
      mode: "find-whole",
      rateBasisPoints: 1,
    },
    {
      ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
      mode: "discount",
      rateBasisPoints: 10_000,
    },
    {
      ...createPercentApplicationsControlDomainState(PEP_LAB_ID),
      inverseDirection: "decrease",
      mode: "inverse",
      rateBasisPoints: 9_999,
    },
  ];

  for (const state of cases) {
    assert.doesNotThrow(() => buildPercentApplicationsState(modelInput(state)));
  }
});

test("reset is lab-scoped, deterministic, frozen, and model-valid", () => {
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    const current = {
      ...createPercentApplicationsControlDomainState(labId),
      mode: "inverse" as const,
      rateBasisPoints: 9_999,
    };
    const reset = planPercentApplicationsControlTransition(current, {
      kind: "reset",
    });
    assert.deepEqual(
      reset.expected,
      createPercentApplicationsControlDomainState(labId),
    );
    assert.equal(reset.expected.labId, labId);
    assert.deepEqual(reset.projections, []);
    assert(Object.isFrozen(reset));
    assert.doesNotThrow(() =>
      buildPercentApplicationsState(modelInput(reset.expected)),
    );
  }
});

test("receipts preserve immutable JSON-safe requested, expected, and observed evidence", () => {
  const current = {
    ...createPercentApplicationsControlDomainState(BNU_LAB_ID),
    mode: "increase" as const,
    rateBasisPoints: 50_000,
  };
  const plan = planPercentApplicationsControlTransition(current, {
    controllerId: "mode",
    kind: "controller",
    value: "decrease",
  });
  const receipt = auditPercentApplicationsControlTransition(
    plan,
    plan.expected,
  );
  assert.equal(receipt.matchesExpected, true);
  assert.notEqual(receipt.requested, receipt.expected);
  assert.notEqual(receipt.expected, receipt.observed);
  assert.deepEqual(receipt.observed, plan.expected);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(receipt)));
  assert(Object.isFrozen(receipt));
  assert(Object.isFrozen(receipt.requested));
  assert(Object.isFrozen(receipt.expected));
  assert(Object.isFrozen(receipt.observed));
  assert(Object.isFrozen(receipt.projections));
});

test("audits asynchronous drift without rewriting requested or expected state", () => {
  const current = createPercentApplicationsControlDomainState(BNU_LAB_ID);
  const plan = planPercentApplicationsControlTransition(current, {
    controlId: "rate-basis-points",
    kind: "control",
    value: 2_500,
  });
  const observed = { ...plan.expected, rateBasisPoints: 2_499 };
  const receipt = auditPercentApplicationsControlTransition(plan, observed);
  assert.equal(receipt.matchesExpected, false);
  assert.equal(receipt.expected.rateBasisPoints, 2_500);
  assert.equal(receipt.observed.rateBasisPoints, 2_499);
  assert.deepEqual(receipt.drift, [
    {
      expected: 2_500,
      key: "rateBasisPoints",
      observed: 2_499,
    },
  ]);
});

test("all controller transitions project only the documented dependent rate", () => {
  const seedRates = [0, 1, 9_999, 10_000, 50_000] as const;
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    for (const sourceMode of PERCENT_APPLICATIONS_MODES) {
      for (const targetMode of PERCENT_APPLICATIONS_MODES) {
        for (const inverseDirection of ["decrease", "increase"] as const) {
          for (const rateBasisPoints of seedRates) {
            const sourceContract = percentApplicationsControlContractFor(
              sourceMode,
              inverseDirection,
            );
            if (
              rateBasisPoints < sourceContract.rate.min ||
              rateBasisPoints > sourceContract.rate.max
            ) {
              continue;
            }
            const current = {
              ...createPercentApplicationsControlDomainState(labId),
              inverseDirection,
              mode: sourceMode,
              rateBasisPoints,
            };
            const plan = planPercentApplicationsControlTransition(current, {
              controllerId: "mode",
              kind: "controller",
              value: targetMode,
            });
            const targetContract = percentApplicationsControlContractFor(
              targetMode,
              inverseDirection,
            );
            assert(
              plan.expected.rateBasisPoints >= targetContract.rate.min &&
                plan.expected.rateBasisPoints <= targetContract.rate.max,
            );
            assert.deepEqual(
              Object.keys(plan.expected).filter(
                (key) =>
                  plan.expected[
                    key as keyof PercentApplicationsControlDomainState
                  ] !==
                  plan.requested[
                    key as keyof PercentApplicationsControlDomainState
                  ],
              ),
              plan.projections.length > 0 ? ["rateBasisPoints"] : [],
            );
            assert.doesNotThrow(() =>
              buildPercentApplicationsState(modelInput(plan.expected)),
            );
          }
        }
      }
    }
  }
});

test("rejects non-integer, non-finite, invalid identity, and hidden-control writes", () => {
  const current = createPercentApplicationsControlDomainState(BNU_LAB_ID);
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    assert.throws(
      () =>
        planPercentApplicationsControlTransition(current, {
          controlId: "rate-basis-points",
          kind: "control",
          value,
        }),
      PercentApplicationsControlDomainError,
    );
  }
  assert.throws(
    () =>
      planPercentApplicationsControlTransition(current, {
        controlId: "amount",
        kind: "control",
        value: 10,
      }),
    (error: unknown) =>
      error instanceof PercentApplicationsControlDomainError &&
      error.code === "CONTROL_NOT_VISIBLE",
  );
  assert.throws(
    () =>
      createPercentApplicationsControlDomainState(
        "not-a-percent-topic" as typeof BNU_LAB_ID,
      ),
    PercentApplicationsControlDomainError,
  );
});
