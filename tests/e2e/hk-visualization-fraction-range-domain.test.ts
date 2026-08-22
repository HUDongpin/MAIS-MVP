import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHkFractionBarRangeDomainIdentity,
  assertHkFractionBarRangeStatePlan,
  assertObservedHkFractionBarDescriptors,
  buildHkFractionBarRangeStatePlan,
  fractionBarDescriptorsForState,
  fractionBarMathematicalState,
  getHkFractionBarRangeDomain,
  HK_FRACTION_BAR_APPLICATION_ORDER,
  HK_FRACTION_BAR_CONTROL_IDS,
  HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS,
  HK_FRACTION_BAR_LAB_ID,
  HK_FRACTION_BAR_MODE_IDS,
  HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT,
  HK_FRACTION_BAR_RANGE_DOMAIN_ID,
  HK_FRACTION_BAR_RANGE_EDGE,
  type HkFractionBarRangePlanEntry,
} from "./hk-visualization-fraction-range-domain";

test("pass-through identity and edge metadata are exact without changing the dedicated nine-domain registry", () => {
  assert.equal(HK_FRACTION_BAR_LAB_ID, "p3-fractions-intro");
  assert.equal(HK_FRACTION_BAR_RANGE_DOMAIN_ID, "fraction-bar-numerator-v1");
  assert.deepEqual(HK_FRACTION_BAR_CONTROL_IDS, ["value", "comparison"]);
  assert.deepEqual(HK_FRACTION_BAR_APPLICATION_ORDER, ["value", "comparison"]);
  assert.deepEqual(HK_FRACTION_BAR_MODE_IDS, [
    "fraction",
    "equivalent",
    "compare",
  ]);
  assert.equal(
    getHkFractionBarRangeDomain(
      HK_FRACTION_BAR_RANGE_DOMAIN_ID,
      HK_FRACTION_BAR_LAB_ID,
    ),
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT,
  );
  assert.deepEqual(HK_FRACTION_BAR_RANGE_EDGE, {
    affectedControlIds: ["comparison"],
    projection: "clamp-max",
    reason:
      "raw-numerator-must-remain-between-zero-and-current-denominator-inclusive",
    sourceControlId: "value",
  });
  assert.deepEqual(HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.affectedBy, {
    comparison: ["value"],
    value: [],
  });
});

test("wrong lab, domain, and control identities fail closed", () => {
  assert.throws(
    () =>
      getHkFractionBarRangeDomain(
        "proper-fractions-v1",
        HK_FRACTION_BAR_LAB_ID,
      ),
    /Unknown pass-through fraction range domain/,
  );
  assert.throws(
    () =>
      getHkFractionBarRangeDomain(
        HK_FRACTION_BAR_RANGE_DOMAIN_ID,
        "p5-fractions-operations",
      ),
    /belongs to p3-fractions-intro/,
  );
  assert.throws(
    () =>
      assertHkFractionBarRangeDomainIdentity(
        "fraction-bar-numerator-v2",
        HK_FRACTION_BAR_LAB_ID,
      ),
    /Unknown/,
  );
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isApplicable(
      "fraction",
      new Set(["denominator", "numerator"]),
    ),
    false,
  );
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isApplicable(
      "fraction",
      new Set(["value", "comparison", "decoy"]),
    ),
    false,
  );
});

test("all three semantic modes use one exact raw domain and malformed modes fail closed", () => {
  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    assert.equal(
      HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isApplicable(
        modeId,
        new Set(HK_FRACTION_BAR_CONTROL_IDS),
      ),
      true,
    );
    assert.equal(
      HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isValid(
        { comparison: 4, value: 5 },
        modeId,
      ),
      true,
    );
  }
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isApplicable(
      "proper-only",
      new Set(HK_FRACTION_BAR_CONTROL_IDS),
    ),
    false,
  );
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isValid(
      { comparison: 4, value: 5 },
      "proper-only",
    ),
    false,
  );
  assert.throws(
    () =>
      HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.canonicalize({
        currentState: { comparison: 4, value: 5 },
        descriptors: fractionBarDescriptorsForState({
          comparison: 4,
          value: 5,
        }),
        modeId: "proper-only",
        requestedState: { comparison: 5 },
      }),
    /mode must be one of/,
  );
});

test("raw value 1..9 maps to denominator 2..10 and comparison is inclusive 0..d", () => {
  assert.deepEqual(fractionBarMathematicalState({ comparison: 0, value: 9 }), {
    denominator: 10,
    equivalentDenominator: 20,
    equivalentNumerator: 0,
    numerator: 0,
    value: 0,
    zeroFraction: true,
  });
  assert.deepEqual(fractionBarMathematicalState({ comparison: 10, value: 9 }), {
    denominator: 10,
    equivalentDenominator: 20,
    equivalentNumerator: 20,
    numerator: 10,
    value: 1,
    zeroFraction: false,
  });
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isValid(
      { comparison: 10, value: 9 },
      "fraction",
    ),
    true,
  );
  assert.equal(
    HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.isValid(
      { comparison: 11, value: 9 },
      "fraction",
    ),
    false,
  );
});

test("comparison descriptor maximum is live value+1 and rejects the production fixed-max-nine defect", () => {
  for (const value of [1, 5, 9]) {
    const state = { comparison: Math.min(4, value + 1), value };
    const descriptors = fractionBarDescriptorsForState(state);
    const comparison = descriptors.find(
      ({ controlId }) => controlId === "comparison",
    );
    assert.equal(comparison?.minimum, 0);
    assert.equal(comparison?.maximum, value + 1);
    assert.equal(comparison?.step, 1);
    assert.doesNotThrow(() =>
      assertObservedHkFractionBarDescriptors({
        descriptors,
        modeId: "fraction",
        state,
      }),
    );
  }

  const stateAtTen = { comparison: 4, value: 9 };
  const fixedMaxNine = fractionBarDescriptorsForState(stateAtTen).map(
    (descriptor) =>
      descriptor.controlId === "comparison"
        ? { ...descriptor, maximum: 9 }
        : descriptor,
  );
  assert.throws(
    () =>
      assertObservedHkFractionBarDescriptors({
        descriptors: fixedMaxNine,
        modeId: "fraction",
        state: stateAtTen,
      }),
    /descriptor.*maximum.*10/i,
  );
});

test("lowering denominator clamps numerator atomically and raising it cannot resurrect stale raw state", () => {
  const contract = HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT;
  const lower = contract.canonicalize({
    currentState: { comparison: 10, value: 9 },
    descriptors: fractionBarDescriptorsForState({ comparison: 10, value: 9 }),
    modeId: "fraction",
    requestedState: { value: 5 },
  });
  assert.deepEqual(lower.applicationOrder, ["value"]);
  assert.deepEqual(lower.canonicalState, { comparison: 6, value: 5 });
  assert.deepEqual(lower.mathematicalState, {
    denominator: 6,
    equivalentDenominator: 12,
    equivalentNumerator: 12,
    numerator: 6,
    value: 1,
    zeroFraction: false,
  });
  assert.deepEqual(lower.projections, [
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

  const raise = contract.canonicalize({
    currentState: lower.canonicalState,
    descriptors: fractionBarDescriptorsForState(lower.canonicalState),
    modeId: "fraction",
    requestedState: { value: 9 },
  });
  assert.deepEqual(raise.canonicalState, { comparison: 6, value: 9 });
  assert.deepEqual(raise.mathematicalState, {
    denominator: 10,
    equivalentDenominator: 20,
    equivalentNumerator: 12,
    numerator: 6,
    value: 0.6,
    zeroFraction: false,
  });
  assert.deepEqual(raise.projections, []);
});

test("controller requests outside their live domains fail closed instead of fabricating dependency projections", () => {
  const contract = HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT;
  const currentState = { comparison: 4, value: 5 };
  const descriptors = fractionBarDescriptorsForState(currentState);

  assert.throws(
    () =>
      contract.canonicalize({
        currentState,
        descriptors,
        modeId: "fraction",
        requestedState: { comparison: 7 },
      }),
    /comparison=7.*outside the live integer domain 0\.\.6/,
  );
  assert.throws(
    () =>
      contract.canonicalize({
        currentState,
        descriptors,
        modeId: "fraction",
        requestedState: { comparison: -1 },
      }),
    /comparison=-1.*outside the live integer domain 0\.\.6/,
  );
  assert.throws(
    () =>
      contract.canonicalize({
        currentState,
        descriptors,
        modeId: "fraction",
        requestedState: { value: 10 },
      }),
    /value=10.*outside the declared integer domain 1\.\.9/,
  );

  const expandThenReachWhole = contract.canonicalize({
    currentState,
    descriptors,
    modeId: "fraction",
    requestedState: { comparison: 10, value: 9 },
  });
  assert.deepEqual(expandThenReachWhole.applicationOrder, [
    "value",
    "comparison",
  ]);
  assert.deepEqual(expandThenReachWhole.canonicalState, {
    comparison: 10,
    value: 9,
  });
  assert.deepEqual(expandThenReachWhole.projections, []);
});

test("every legal numerator and denominator transition canonicalizes exactly across all semantic modes", () => {
  const contract = HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT;

  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    for (let currentValue = 1; currentValue <= 9; currentValue += 1) {
      const currentDenominator = currentValue + 1;
      for (
        let currentNumerator = 0;
        currentNumerator <= currentDenominator;
        currentNumerator += 1
      ) {
        const currentState = {
          comparison: currentNumerator,
          value: currentValue,
        };
        const descriptors = fractionBarDescriptorsForState(currentState);

        for (
          let requestedNumerator = 0;
          requestedNumerator <= currentDenominator;
          requestedNumerator += 1
        ) {
          const direct = contract.canonicalize({
            currentState,
            descriptors,
            modeId,
            requestedState: { comparison: requestedNumerator },
          });
          assert.deepEqual(direct.canonicalState, {
            comparison: requestedNumerator,
            value: currentValue,
          });
          assert.deepEqual(direct.projections, []);
        }

        for (let targetValue = 1; targetValue <= 9; targetValue += 1) {
          const targetDenominator = targetValue + 1;
          const expectedNumerator = Math.min(
            currentNumerator,
            targetDenominator,
          );
          const transition = contract.canonicalize({
            currentState,
            descriptors,
            modeId,
            requestedState: { value: targetValue },
          });
          assert.deepEqual(transition.canonicalState, {
            comparison: expectedNumerator,
            value: targetValue,
          });
          assert.equal(
            transition.mathematicalState.value,
            expectedNumerator / targetDenominator,
          );
          assert.equal(
            transition.projections.length,
            currentNumerator > targetDenominator ? 1 : 0,
          );

          const raiseAgain = contract.canonicalize({
            currentState: transition.canonicalState,
            descriptors: fractionBarDescriptorsForState(
              transition.canonicalState,
            ),
            modeId,
            requestedState: { value: 9 },
          });
          assert.equal(
            raiseAgain.canonicalState.comparison,
            expectedNumerator,
            `${modeId}: d=${currentDenominator}, n=${currentNumerator}, target d=${targetDenominator} resurrected stale numerator`,
          );
        }
      }
    }
  }
});

test("deterministic adapter supplies exactly nine chained states per mode and 27 total", () => {
  const plan = buildHkFractionBarRangeStatePlan();
  assert.deepEqual(HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS, {
    modeCount: 3,
    stateCountPerMode: 9,
    totalStateCount: 27,
  });
  assert.equal(plan.length, 27);
  assert.equal(new Set(plan.map(({ id }) => id)).size, 27);
  assert.equal(
    new Set(plan.map(({ transitionSignature }) => transitionSignature)).size,
    27,
  );
  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    const entries = plan.filter((entry) => entry.modeId === modeId);
    assert.equal(entries.length, 9);
    assert.deepEqual(
      entries.map(({ boundaryId }) => boundaryId),
      [
        "reset-baseline",
        "minimum-denominator-zero",
        "minimum-denominator-whole",
        "maximum-denominator-zero",
        "maximum-denominator-half",
        "maximum-denominator-whole",
        "denominator-decrease-clamp",
        "denominator-increase-no-resurrection",
        "reset",
      ],
    );
    for (let index = 1; index < entries.length; index += 1) {
      assert.deepEqual(
        entries[index].startingState,
        entries[index - 1].canonicalState,
      );
    }
  }
  assert.doesNotThrow(() => assertHkFractionBarRangeStatePlan(plan));
});

test("required zero, whole, clamp, no-resurrection, and reset states are explicit in every mode", () => {
  const plan = buildHkFractionBarRangeStatePlan();
  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    const entry = (boundaryId: HkFractionBarRangePlanEntry["boundaryId"]) => {
      const match = plan.find(
        (candidate) =>
          candidate.modeId === modeId && candidate.boundaryId === boundaryId,
      );
      assert.ok(match, `${modeId}/${boundaryId} must exist`);
      return match;
    };
    assert.deepEqual(entry("maximum-denominator-zero").expectedFractionState, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 0,
      numerator: 0,
      value: 0,
      zeroFraction: true,
    });
    assert.deepEqual(entry("maximum-denominator-whole").expectedFractionState, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 20,
      numerator: 10,
      value: 1,
      zeroFraction: false,
    });
    assert.deepEqual(entry("denominator-decrease-clamp").canonicalState, {
      comparison: 6,
      value: 5,
    });
    assert.deepEqual(
      entry("denominator-decrease-clamp").projectionEvidence.map(
        ({ projection, reason }) => ({ projection, reason }),
      ),
      [
        {
          projection: "clamp-max",
          reason:
            "raw-numerator-must-remain-between-zero-and-current-denominator-inclusive",
        },
      ],
    );
    assert.deepEqual(
      entry("denominator-increase-no-resurrection").canonicalState,
      { comparison: 6, value: 9 },
    );
    assert.deepEqual(entry("reset").canonicalState, {
      comparison: 4,
      value: 5,
    });
    assert.deepEqual(entry("reset").expectedFractionState, {
      denominator: 6,
      equivalentDenominator: 12,
      equivalentNumerator: 8,
      numerator: 4,
      value: 4 / 6,
      zeroFraction: false,
    });
  }
});

test("plan validator rejects fixed max nine and stale numerator resurrection", () => {
  const plan = buildHkFractionBarRangeStatePlan();
  const fixedMaxNine = replacePlanEntry(
    plan,
    "fraction",
    "maximum-denominator-whole",
    (entry) => ({
      ...entry,
      expectedDescriptors: entry.expectedDescriptors.map((descriptor) =>
        descriptor.controlId === "comparison"
          ? { ...descriptor, maximum: 9 }
          : descriptor,
      ),
    }),
  );
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(fixedMaxNine),
    /descriptor drifted/,
  );

  const staleResurrection = replacePlanEntry(
    plan,
    "fraction",
    "denominator-increase-no-resurrection",
    (entry) => ({
      ...entry,
      canonicalState: { comparison: 10, value: 9 },
    }),
  );
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(staleResurrection),
    /canonical state drifted/,
  );
});

test("malformed descriptors, requested controls, and raw states fail closed", () => {
  const reset = { comparison: 4, value: 5 };
  const descriptors = fractionBarDescriptorsForState(reset);
  assert.throws(
    () =>
      assertObservedHkFractionBarDescriptors({
        descriptors: descriptors.slice(0, 1),
        modeId: "fraction",
        state: reset,
      }),
    /exactly 2 controls/,
  );
  assert.throws(
    () =>
      assertObservedHkFractionBarDescriptors({
        descriptors: [descriptors[1], descriptors[0]],
        modeId: "fraction",
        state: reset,
      }),
    /descriptor 0/,
  );
  assert.throws(
    () =>
      assertObservedHkFractionBarDescriptors({
        descriptors: [descriptors[0], { ...descriptors[1], step: 0 }],
        modeId: "fraction",
        state: reset,
      }),
    /descriptor 1/,
  );
  assert.throws(
    () =>
      HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.canonicalize({
        currentState: reset,
        descriptors,
        modeId: "fraction",
        requestedState: { numerator: 5 },
      }),
    /undeclared control numerator/,
  );
  assert.throws(
    () => fractionBarMathematicalState({ comparison: 7, value: 5 }),
    /comparison must be an integer from 0 through value\+1/,
  );
});

test("plan validator rejects missing, extra, duplicate, malformed-mode, and wrong-identity evidence", () => {
  const plan = buildHkFractionBarRangeStatePlan();
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(plan.slice(0, -1)),
    /expected 27 states, observed 26/,
  );
  assert.throws(
    () => assertHkFractionBarRangeStatePlan([...plan, plan[0]]),
    /expected 27 states, observed 28/,
  );

  const duplicate = [...plan];
  duplicate[1] = duplicate[0];
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(duplicate),
    /duplicate state ids/,
  );

  const malformedMode = [
    { ...plan[0], modeId: "proper-only" },
    ...plan.slice(1),
  ] as unknown as readonly HkFractionBarRangePlanEntry[];
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(malformedMode),
    /malformed modes|mode.*expected 9 states/i,
  );

  const wrongDomain = [
    { ...plan[0], domainId: "proper-fractions-v1" },
    ...plan.slice(1),
  ] as unknown as readonly HkFractionBarRangePlanEntry[];
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(wrongDomain),
    /Unknown pass-through fraction range domain/,
  );

  const wrongLab = [
    { ...plan[0], labId: "p5-fractions-operations" },
    ...plan.slice(1),
  ] as unknown as readonly HkFractionBarRangePlanEntry[];
  assert.throws(
    () => assertHkFractionBarRangeStatePlan(wrongLab),
    /belongs to p3-fractions-intro/,
  );
});

function replacePlanEntry(
  plan: readonly HkFractionBarRangePlanEntry[],
  modeId: HkFractionBarRangePlanEntry["modeId"],
  boundaryId: HkFractionBarRangePlanEntry["boundaryId"],
  replace: (entry: HkFractionBarRangePlanEntry) => HkFractionBarRangePlanEntry,
) {
  return plan.map((entry) =>
    entry.modeId === modeId && entry.boundaryId === boundaryId
      ? replace(entry)
      : entry,
  );
}
