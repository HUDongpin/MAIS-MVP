/**
 * Pure pass-through range-domain contract for the shared HK P3 fraction bar.
 *
 * This file deliberately does not register the domain in the nine-item HK
 * dedicated registry. It is a structural adapter that the shared Configured
 * consumer and the range-state ledger can consume once their owner releases
 * the production integration.
 */

export const HK_FRACTION_BAR_LAB_ID = "p3-fractions-intro" as const;
export const HK_FRACTION_BAR_RANGE_DOMAIN_ID =
  "fraction-bar-numerator-v1" as const;
export const HK_FRACTION_BAR_CONTROL_IDS = Object.freeze([
  "value",
  "comparison",
] as const);
export const HK_FRACTION_BAR_MODE_IDS = Object.freeze([
  "fraction",
  "equivalent",
  "compare",
] as const);
export const HK_FRACTION_BAR_APPLICATION_ORDER = HK_FRACTION_BAR_CONTROL_IDS;

export type HkFractionBarControlId =
  (typeof HK_FRACTION_BAR_CONTROL_IDS)[number];
export type HkFractionBarModeId = (typeof HK_FRACTION_BAR_MODE_IDS)[number];
export type HkFractionBarRawState = Readonly<{
  comparison: number;
  value: number;
}>;
export type HkFractionBarMathematicalState = Readonly<{
  denominator: number;
  equivalentDenominator: number;
  equivalentNumerator: number;
  numerator: number;
  value: number;
  zeroFraction: boolean;
}>;

export type HkFractionBarRangeDescriptor = Readonly<{
  controlId: HkFractionBarControlId;
  initial: number;
  maximum: number;
  minimum: number;
  step: number;
}>;

export type HkFractionBarDescriptorExpectation = Readonly<{
  controlId: HkFractionBarControlId;
  domainId: typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  enabled: true;
  excludedValues: readonly number[];
  maximum: number;
  minimum: number;
  step: 1;
  value: number;
  visibility: "range";
}>;

export type HkFractionBarRangeDomainEdge = Readonly<{
  affectedControlIds: readonly ["comparison"];
  projection: "clamp-max";
  reason: string;
  sourceControlId: "value";
}>;

export type HkFractionBarRangeProjectionEvidence = Readonly<{
  affectedControlId: "comparison";
  affectedValueAfter: number;
  affectedValueBefore: number;
  declaredControllerId: "value";
  domainId: typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  projection: "clamp-max";
  reason: string;
  triggerControlId: "value";
  triggerRequestedValue: number;
}>;

export type HkFractionBarCanonicalization = Readonly<{
  applicationOrder: readonly HkFractionBarControlId[];
  canonicalState: HkFractionBarRawState;
  domainId: typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  mathematicalState: HkFractionBarMathematicalState;
  projections: readonly HkFractionBarRangeProjectionEvidence[];
  requestedState: Readonly<Partial<HkFractionBarRawState>>;
  valid: boolean;
}>;

export type HkFractionBarRangePlanAction = Readonly<{
  affectedControlIds: readonly HkFractionBarControlId[];
  controlId: HkFractionBarControlId;
  expectedValue: number;
  projectedByControllerIds: readonly HkFractionBarControlId[];
  requestedValue: number;
}>;

export type HkFractionBarRangePlanEntry = Readonly<{
  actionSignature: string;
  actions: readonly HkFractionBarRangePlanAction[];
  applicationOrder: readonly HkFractionBarControlId[];
  boundaryId: HkFractionBarBoundaryId;
  canonicalState: HkFractionBarRawState;
  domainId: typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  expectedDescriptors: readonly HkFractionBarDescriptorExpectation[];
  expectedFractionState: HkFractionBarMathematicalState;
  expectedSignature: string;
  expectedValues: readonly HkFractionBarRangeStateValue[];
  id: string;
  labId: typeof HK_FRACTION_BAR_LAB_ID;
  modeId: HkFractionBarModeId;
  projectionEvidence: readonly HkFractionBarRangeProjectionEvidence[];
  reason: `domain-boundary:${HkFractionBarBoundaryId}`;
  requestedSignature: string;
  requestedState: Readonly<Partial<HkFractionBarRawState>>;
  requestedValues: readonly HkFractionBarRangeStateValue[];
  signature: string;
  startingSignature: string;
  startingState: HkFractionBarRawState;
  startingValues: readonly HkFractionBarRangeStateValue[];
  transitionSignature: string;
}>;

export type HkFractionBarRangeStateValue = Readonly<{
  controlId: HkFractionBarControlId;
  value: number;
}>;

export type HkFractionBarRangeDomainContract = Readonly<{
  affectedBy: Readonly<{
    comparison: readonly ["value"];
    value: readonly [];
  }>;
  applicationOrder: readonly HkFractionBarControlId[];
  canonicalize: (
    args: HkFractionBarCanonicalizeArgs,
  ) => HkFractionBarCanonicalization;
  descriptorFor: (
    state: HkFractionBarRawState,
    modeId: string,
    descriptor: HkFractionBarRangeDescriptor,
  ) => HkFractionBarDescriptorExpectation;
  domainId: typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  edges: readonly [HkFractionBarRangeDomainEdge];
  isApplicable: (modeId: string, controlIds: ReadonlySet<string>) => boolean;
  isValid: (state: Readonly<Record<string, number>>, modeId: string) => boolean;
  labId: typeof HK_FRACTION_BAR_LAB_ID;
  requiredControlIds: readonly HkFractionBarControlId[];
}>;

export type HkFractionBarCanonicalizeArgs = Readonly<{
  currentState: Readonly<Record<string, number>>;
  descriptors: readonly Readonly<{
    controlId: string;
    initial: number;
    maximum: number;
    minimum: number;
    step: number;
  }>[];
  domainId?: string;
  labId?: string;
  modeId: string;
  requestedState: Readonly<Record<string, number>>;
}>;

const EDGE_REASON =
  "raw-numerator-must-remain-between-zero-and-current-denominator-inclusive";

export const HK_FRACTION_BAR_RANGE_EDGE = Object.freeze({
  affectedControlIds: Object.freeze(["comparison"] as const),
  projection: "clamp-max" as const,
  reason: EDGE_REASON,
  sourceControlId: "value" as const,
}) satisfies HkFractionBarRangeDomainEdge;

export const HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS = Object.freeze({
  modeCount: HK_FRACTION_BAR_MODE_IDS.length,
  stateCountPerMode: 9,
  totalStateCount: HK_FRACTION_BAR_MODE_IDS.length * 9,
});

const MODE_ID_SET = new Set<string>(HK_FRACTION_BAR_MODE_IDS);
const CONTROL_ID_SET = new Set<string>(HK_FRACTION_BAR_CONTROL_IDS);

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exactRawState(
  candidate: Readonly<Record<string, number>>,
  label: string,
): HkFractionBarRawState {
  const keys = Object.keys(candidate).sort();
  const expectedKeys = [...HK_FRACTION_BAR_CONTROL_IDS].sort();
  if (!same(keys, expectedKeys)) {
    throw new Error(
      `${label} must contain exactly raw controls value and comparison; observed ${JSON.stringify(keys)}.`,
    );
  }
  const value = candidate.value;
  const comparison = candidate.comparison;
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error(`${label}.value must be an integer from 1 through 9.`);
  }
  if (
    !Number.isInteger(comparison) ||
    comparison < 0 ||
    comparison > value + 1
  ) {
    throw new Error(
      `${label}.comparison must be an integer from 0 through value+1 (${value + 1}).`,
    );
  }
  return Object.freeze({ comparison, value });
}

function exactRequestedState(
  candidate: Readonly<Record<string, number>>,
): Readonly<Partial<HkFractionBarRawState>> {
  const keys = Object.keys(candidate);
  if (keys.length === 0) {
    throw new Error("Fraction range requestedState must not be empty.");
  }
  for (const key of keys) {
    if (!CONTROL_ID_SET.has(key)) {
      throw new Error(`Fraction range requested undeclared control ${key}.`);
    }
    if (!Number.isInteger(candidate[key])) {
      throw new Error(
        `Fraction range request ${key} must be a finite integer.`,
      );
    }
  }
  return Object.freeze({ ...candidate }) as Readonly<
    Partial<HkFractionBarRawState>
  >;
}

function assertModeId(modeId: string): asserts modeId is HkFractionBarModeId {
  if (!MODE_ID_SET.has(modeId)) {
    throw new Error(
      `Fraction range mode must be one of ${HK_FRACTION_BAR_MODE_IDS.join(", ")}; observed ${JSON.stringify(modeId)}.`,
    );
  }
}

export function assertHkFractionBarRangeDomainIdentity(
  domainId: string,
  labId: string,
) {
  if (domainId !== HK_FRACTION_BAR_RANGE_DOMAIN_ID) {
    throw new Error(
      `Unknown pass-through fraction range domain ${JSON.stringify(domainId)}.`,
    );
  }
  if (labId !== HK_FRACTION_BAR_LAB_ID) {
    throw new Error(
      `Dynamic range domain ${domainId} belongs to ${HK_FRACTION_BAR_LAB_ID}, not ${labId}.`,
    );
  }
}

export function fractionBarMathematicalState(
  state: Readonly<Record<string, number>>,
): HkFractionBarMathematicalState {
  const raw = exactRawState(state, "fraction raw state");
  const denominator = raw.value + 1;
  const numerator = raw.comparison;
  return Object.freeze({
    denominator,
    equivalentDenominator: denominator * 2,
    equivalentNumerator: numerator * 2,
    numerator,
    value: numerator / denominator,
    zeroFraction: numerator === 0,
  });
}

export function fractionBarDescriptorsForState(
  state: Readonly<Record<string, number>>,
): readonly HkFractionBarRangeDescriptor[] {
  const raw = exactRawState(state, "fraction descriptor state");
  return Object.freeze([
    Object.freeze({
      controlId: "value" as const,
      initial: raw.value,
      maximum: 9,
      minimum: 1,
      step: 1,
    }),
    Object.freeze({
      controlId: "comparison" as const,
      initial: raw.comparison,
      maximum: raw.value + 1,
      minimum: 0,
      step: 1,
    }),
  ]);
}

export function assertObservedHkFractionBarDescriptors(
  args: Readonly<{
    descriptors: readonly Readonly<{
      controlId: string;
      initial: number;
      maximum: number;
      minimum: number;
      step: number;
    }>[];
    modeId: string;
    state: Readonly<Record<string, number>>;
  }>,
) {
  assertModeId(args.modeId);
  const raw = exactRawState(args.state, "fraction descriptor state");
  const expected = fractionBarDescriptorsForState(raw);
  if (args.descriptors.length !== expected.length) {
    throw new Error(
      `Fraction range descriptors must contain exactly ${expected.length} controls; observed ${args.descriptors.length}.`,
    );
  }
  for (let index = 0; index < expected.length; index += 1) {
    const observed = args.descriptors[index];
    const required = expected[index];
    for (const key of ["initial", "maximum", "minimum", "step"] as const) {
      if (!Number.isFinite(observed[key])) {
        throw new Error(
          `Fraction descriptor ${observed.controlId || index}.${key} must be finite.`,
        );
      }
    }
    if (!same(observed, required)) {
      throw new Error(
        `Fraction descriptor ${index} must equal ${JSON.stringify(required)}; observed ${JSON.stringify(observed)}.`,
      );
    }
  }
}

function descriptorExpectation(
  state: HkFractionBarRawState,
  modeId: string,
  descriptor: HkFractionBarRangeDescriptor,
): HkFractionBarDescriptorExpectation {
  assertModeId(modeId);
  if (!CONTROL_ID_SET.has(descriptor.controlId)) {
    throw new Error(
      `Fraction descriptor references unknown control ${descriptor.controlId}.`,
    );
  }
  const expectedDescriptor = fractionBarDescriptorsForState(state).find(
    ({ controlId }) => controlId === descriptor.controlId,
  );
  if (!expectedDescriptor) {
    throw new Error(`Missing fraction descriptor ${descriptor.controlId}.`);
  }
  return Object.freeze({
    controlId: expectedDescriptor.controlId,
    domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
    enabled: true,
    excludedValues: Object.freeze([]),
    maximum: expectedDescriptor.maximum,
    minimum: expectedDescriptor.minimum,
    step: 1,
    value: state[expectedDescriptor.controlId],
    visibility: "range",
  });
}

function canonicalizeFractionBar(
  args: HkFractionBarCanonicalizeArgs,
): HkFractionBarCanonicalization {
  assertHkFractionBarRangeDomainIdentity(
    args.domainId ?? HK_FRACTION_BAR_RANGE_DOMAIN_ID,
    args.labId ?? HK_FRACTION_BAR_LAB_ID,
  );
  assertModeId(args.modeId);
  const current = exactRawState(args.currentState, "fraction currentState");
  assertObservedHkFractionBarDescriptors({
    descriptors: args.descriptors,
    modeId: args.modeId,
    state: current,
  });
  const requested = exactRequestedState(args.requestedState);
  const requestedControlIds = Object.keys(
    requested,
  ) as HkFractionBarControlId[];
  const applicationOrder = HK_FRACTION_BAR_APPLICATION_ORDER.filter(
    (controlId) => requestedControlIds.includes(controlId),
  );
  const mutable = { ...current };
  const projections: HkFractionBarRangeProjectionEvidence[] = [];

  const recordProjection = (
    triggerRequestedValue: number,
    affectedValueBefore: number,
    affectedValueAfter: number,
  ) => {
    projections.push(
      Object.freeze({
        affectedControlId: "comparison",
        affectedValueAfter,
        affectedValueBefore,
        declaredControllerId: "value",
        domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
        projection: "clamp-max",
        reason: EDGE_REASON,
        triggerControlId: "value",
        triggerRequestedValue,
      }),
    );
  };

  for (const controlId of applicationOrder) {
    const requestedValue = requested[controlId];
    if (requestedValue === undefined) {
      throw new Error(`Fraction application order lost ${controlId}.`);
    }
    if (controlId === "value") {
      if (requestedValue < 1 || requestedValue > 9) {
        throw new Error(
          `Fraction range request value=${requestedValue} is outside the declared integer domain 1..9.`,
        );
      }
      mutable.value = requestedValue;
      const before = mutable.comparison;
      const after = Math.min(before, mutable.value + 1);
      mutable.comparison = after;
      if (after !== before) {
        recordProjection(requestedValue, before, after);
      }
      continue;
    }

    const liveMaximum = mutable.value + 1;
    if (requestedValue < 0 || requestedValue > liveMaximum) {
      throw new Error(
        `Fraction range request comparison=${requestedValue} is outside the live integer domain 0..${liveMaximum}.`,
      );
    }
    mutable.comparison = requestedValue;
  }

  const canonicalState = exactRawState(mutable, "fraction canonicalState");
  return Object.freeze({
    applicationOrder: Object.freeze([...applicationOrder]),
    canonicalState,
    domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
    mathematicalState: fractionBarMathematicalState(canonicalState),
    projections: Object.freeze(projections),
    requestedState: requested,
    valid: true,
  });
}

export const HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT = Object.freeze({
  affectedBy: Object.freeze({
    comparison: Object.freeze(["value"] as const),
    value: Object.freeze([] as const),
  }),
  applicationOrder: HK_FRACTION_BAR_APPLICATION_ORDER,
  canonicalize: canonicalizeFractionBar,
  descriptorFor: descriptorExpectation,
  domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
  edges: Object.freeze([HK_FRACTION_BAR_RANGE_EDGE] as const),
  isApplicable: (modeId: string, controlIds: ReadonlySet<string>) =>
    MODE_ID_SET.has(modeId) &&
    controlIds.size === HK_FRACTION_BAR_CONTROL_IDS.length &&
    HK_FRACTION_BAR_CONTROL_IDS.every((controlId) => controlIds.has(controlId)),
  isValid: (state: Readonly<Record<string, number>>, modeId: string) => {
    try {
      assertModeId(modeId);
      exactRawState(state, "fraction state");
      return true;
    } catch {
      return false;
    }
  },
  labId: HK_FRACTION_BAR_LAB_ID,
  requiredControlIds: HK_FRACTION_BAR_CONTROL_IDS,
}) satisfies HkFractionBarRangeDomainContract;

export function getHkFractionBarRangeDomain(domainId: string, labId: string) {
  assertHkFractionBarRangeDomainIdentity(domainId, labId);
  return HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT;
}

const BOUNDARY_SEQUENCE = Object.freeze([
  boundary(
    "reset-baseline",
    { comparison: 4, value: 5 },
    { comparison: 4, value: 5 },
    { comparison: 4, value: 5 },
  ),
  boundary(
    "minimum-denominator-zero",
    { comparison: 4, value: 5 },
    { comparison: 0, value: 1 },
    { comparison: 0, value: 1 },
  ),
  boundary(
    "minimum-denominator-whole",
    { comparison: 0, value: 1 },
    { comparison: 2 },
    { comparison: 2, value: 1 },
  ),
  boundary(
    "maximum-denominator-zero",
    { comparison: 2, value: 1 },
    { comparison: 0, value: 9 },
    { comparison: 0, value: 9 },
  ),
  boundary(
    "maximum-denominator-half",
    { comparison: 0, value: 9 },
    { comparison: 5 },
    { comparison: 5, value: 9 },
  ),
  boundary(
    "maximum-denominator-whole",
    { comparison: 5, value: 9 },
    { comparison: 10 },
    { comparison: 10, value: 9 },
  ),
  boundary(
    "denominator-decrease-clamp",
    { comparison: 10, value: 9 },
    { value: 5 },
    { comparison: 6, value: 5 },
  ),
  boundary(
    "denominator-increase-no-resurrection",
    { comparison: 6, value: 5 },
    { value: 9 },
    { comparison: 6, value: 9 },
  ),
  boundary(
    "reset",
    { comparison: 6, value: 9 },
    { comparison: 4, value: 5 },
    { comparison: 4, value: 5 },
  ),
] as const);

export type HkFractionBarBoundaryId =
  (typeof BOUNDARY_SEQUENCE)[number]["boundaryId"];

function boundary<BoundaryId extends string>(
  boundaryId: BoundaryId,
  startingState: HkFractionBarRawState,
  requestedState: Readonly<Partial<HkFractionBarRawState>>,
  expectedState: HkFractionBarRawState,
) {
  return Object.freeze({
    boundaryId,
    expectedState: Object.freeze({ ...expectedState }),
    requestedState: Object.freeze({ ...requestedState }),
    startingState: Object.freeze({ ...startingState }),
  });
}

function valuesForState(
  state: HkFractionBarRawState,
): readonly HkFractionBarRangeStateValue[] {
  return Object.freeze(
    HK_FRACTION_BAR_CONTROL_IDS.map((controlId) =>
      Object.freeze({ controlId, value: state[controlId] }),
    ),
  );
}

function valuesForRequest(
  requestedState: Readonly<Partial<HkFractionBarRawState>>,
  applicationOrder: readonly HkFractionBarControlId[],
): readonly HkFractionBarRangeStateValue[] {
  return Object.freeze(
    applicationOrder.map((controlId) => {
      const value = requestedState[controlId];
      if (value === undefined) {
        throw new Error(`Fraction request lost ${controlId}.`);
      }
      return Object.freeze({ controlId, value });
    }),
  );
}

function signature(values: readonly HkFractionBarRangeStateValue[]) {
  return values
    .map(({ controlId, value }) => `${controlId}=${value}`)
    .join("|");
}

function fullRequestedState(
  startingState: HkFractionBarRawState,
  requestedState: Readonly<Partial<HkFractionBarRawState>>,
) {
  return Object.freeze({ ...startingState, ...requestedState });
}

function buildUncheckedPlan(): readonly HkFractionBarRangePlanEntry[] {
  const entries: HkFractionBarRangePlanEntry[] = [];
  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    for (const [boundaryIndex, request] of BOUNDARY_SEQUENCE.entries()) {
      const descriptors = fractionBarDescriptorsForState(request.startingState);
      const canonical = HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.canonicalize({
        currentState: request.startingState,
        descriptors,
        modeId,
        requestedState: request.requestedState,
      });
      if (!same(canonical.canonicalState, request.expectedState)) {
        throw new Error(
          `Internal fraction boundary ${request.boundaryId} expected ${JSON.stringify(request.expectedState)}, received ${JSON.stringify(canonical.canonicalState)}.`,
        );
      }
      const startingValues = valuesForState(request.startingState);
      const requestedValues = valuesForRequest(
        request.requestedState,
        canonical.applicationOrder,
      );
      const expectedValues = valuesForState(canonical.canonicalState);
      const expectedDescriptors = Object.freeze(
        fractionBarDescriptorsForState(canonical.canonicalState).map(
          (descriptor) =>
            HK_FRACTION_BAR_RANGE_DOMAIN_CONTRACT.descriptorFor(
              canonical.canonicalState,
              modeId,
              descriptor,
            ),
        ),
      );
      const startingSignature = signature(startingValues);
      const actionSignature = signature(requestedValues);
      const expectedSignature = signature(expectedValues);
      const requestedSignature = signature(
        valuesForState(
          fullRequestedState(request.startingState, request.requestedState),
        ),
      );
      const transitionSignature = `${modeId}:${startingSignature}>>${actionSignature}>>${expectedSignature}`;
      entries.push(
        Object.freeze({
          actionSignature,
          actions: Object.freeze(
            canonical.applicationOrder.map((controlId) => {
              const requestedValue = canonical.requestedState[controlId];
              if (requestedValue === undefined) {
                throw new Error(`Fraction plan lost requested ${controlId}.`);
              }
              return Object.freeze({
                affectedControlIds:
                  controlId === "value"
                    ? Object.freeze(["comparison"] as const)
                    : Object.freeze([]),
                controlId,
                expectedValue: canonical.canonicalState[controlId],
                projectedByControllerIds:
                  controlId === "comparison"
                    ? Object.freeze(["value"] as const)
                    : Object.freeze([]),
                requestedValue,
              });
            }),
          ),
          applicationOrder: canonical.applicationOrder,
          boundaryId: request.boundaryId,
          canonicalState: canonical.canonicalState,
          domainId: HK_FRACTION_BAR_RANGE_DOMAIN_ID,
          expectedDescriptors,
          expectedFractionState: canonical.mathematicalState,
          expectedSignature,
          expectedValues,
          id: `${modeId}:fraction-range:${String(boundaryIndex).padStart(2, "0")}:${request.boundaryId}`,
          labId: HK_FRACTION_BAR_LAB_ID,
          modeId,
          projectionEvidence: canonical.projections,
          reason: `domain-boundary:${request.boundaryId}`,
          requestedSignature,
          requestedState: canonical.requestedState,
          requestedValues,
          signature: expectedSignature,
          startingSignature,
          startingState: request.startingState,
          startingValues,
          transitionSignature,
        }),
      );
    }
  }
  return Object.freeze(entries);
}

export function buildHkFractionBarRangeStatePlan() {
  return buildUncheckedPlan();
}

export function assertHkFractionBarRangeStatePlan(
  candidate: readonly HkFractionBarRangePlanEntry[],
) {
  if (
    candidate.length !== HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.totalStateCount
  ) {
    throw new Error(
      `Fraction range plan expected ${HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.totalStateCount} states, observed ${candidate.length}.`,
    );
  }
  const unknownModes = candidate
    .map(({ modeId }) => modeId)
    .filter((modeId) => !MODE_ID_SET.has(modeId));
  if (unknownModes.length > 0) {
    throw new Error(
      `Fraction range plan contains malformed modes ${JSON.stringify(unknownModes)}.`,
    );
  }
  for (const modeId of HK_FRACTION_BAR_MODE_IDS) {
    const modeEntries = candidate.filter((entry) => entry.modeId === modeId);
    if (
      modeEntries.length !==
      HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.stateCountPerMode
    ) {
      throw new Error(
        `Fraction range mode ${modeId} expected ${HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.stateCountPerMode} states, observed ${modeEntries.length}.`,
      );
    }
  }
  if (new Set(candidate.map(({ id }) => id)).size !== candidate.length) {
    throw new Error("Fraction range plan contains duplicate state ids.");
  }
  if (
    new Set(candidate.map(({ transitionSignature }) => transitionSignature))
      .size !== candidate.length
  ) {
    throw new Error(
      "Fraction range plan contains duplicate executable transitions.",
    );
  }

  const expected = buildUncheckedPlan();
  for (let index = 0; index < expected.length; index += 1) {
    const observed = candidate[index];
    const canonical = expected[index];
    assertHkFractionBarRangeDomainIdentity(observed.domainId, observed.labId);
    assertModeId(observed.modeId);
    if (!same(observed.canonicalState, canonical.canonicalState)) {
      throw new Error(
        `Fraction range plan ${canonical.id} canonical state drifted: expected ${JSON.stringify(canonical.canonicalState)}, observed ${JSON.stringify(observed.canonicalState)}.`,
      );
    }
    if (
      !same(observed.expectedFractionState, canonical.expectedFractionState)
    ) {
      throw new Error(
        `Fraction range plan ${canonical.id} mathematical state drifted.`,
      );
    }
    if (!same(observed.expectedDescriptors, canonical.expectedDescriptors)) {
      throw new Error(
        `Fraction range plan ${canonical.id} descriptor drifted: expected ${JSON.stringify(canonical.expectedDescriptors)}, observed ${JSON.stringify(observed.expectedDescriptors)}.`,
      );
    }
    if (!same(observed.projectionEvidence, canonical.projectionEvidence)) {
      throw new Error(
        `Fraction range plan ${canonical.id} projection evidence drifted.`,
      );
    }
    if (!same(observed, canonical)) {
      throw new Error(
        `Fraction range plan ${canonical.id} structural transition drifted.`,
      );
    }
  }
}
