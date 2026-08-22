import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_RESET_INPUTS,
  SymbolicExpressionsDomainError,
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsInput,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "./SymbolicExpressionsModel";

export const SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT = deepFreeze({
  id: "symbolic-expressions-scenarios-v1",
  labIds: SYMBOLIC_EXPRESSIONS_LAB_IDS,
  modeAllowlists: SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  version: 1,
} as const);

export type SymbolicExpressionsScenarioControlId =
  | "candidate-denominator"
  | "candidate-numerator"
  | "coefficient-a"
  | "coefficient-b"
  | "coefficient-c"
  | "coefficient-d"
  | "constant-a"
  | "constant-b"
  | "domain-denominator"
  | "domain-numerator"
  | "excluded-root"
  | "value-denominator"
  | "value-numerator";

export type SymbolicExpressionsControlDomainState = {
  readonly candidateDenominator: number;
  readonly candidateNumerator: number;
  readonly coefficientA: number;
  readonly coefficientB: number;
  readonly coefficientC: number;
  readonly coefficientD: number;
  readonly constantA: number;
  readonly constantB: number;
  readonly domainDenominator: number;
  readonly domainNumerator: number;
  readonly excludedRoot: number;
  readonly labId: SymbolicExpressionsLabId;
  readonly mode: SymbolicExpressionsMode;
  readonly valueDenominator: number;
  readonly valueNumerator: number;
};

export type SymbolicExpressionsControlDomainErrorCode =
  | "CONTROL_NOT_VISIBLE"
  | "DIRECT_CONTROL_OUT_OF_RANGE"
  | "INVALID_CONTROLLER"
  | "INVALID_CONTROL_VALUE"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_STATE"
  | "MODE_NOT_ALLOWED"
  | "MODEL_REJECTED_STATE";

export class SymbolicExpressionsControlDomainError extends RangeError {
  readonly causeCode: SymbolicExpressionsDomainError["code"] | null;
  readonly code: SymbolicExpressionsControlDomainErrorCode;

  constructor(
    code: SymbolicExpressionsControlDomainErrorCode,
    message: string,
    causeCode: SymbolicExpressionsDomainError["code"] | null = null,
  ) {
    super(message);
    this.name = "SymbolicExpressionsControlDomainError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

export type SymbolicExpressionsScenarioControlDescriptor = {
  readonly controlId: SymbolicExpressionsScenarioControlId;
  readonly max: number;
  readonly min: number;
  readonly step: 1;
};

export type SymbolicExpressionsControlDescriptor = {
  readonly allowedModes: readonly SymbolicExpressionsMode[];
  readonly controls: readonly SymbolicExpressionsScenarioControlDescriptor[];
  readonly domainId: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id;
  readonly domainVersion: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version;
  readonly labId: SymbolicExpressionsLabId;
  readonly mode: SymbolicExpressionsMode;
  readonly requiredControls: readonly SymbolicExpressionsScenarioControlId[];
  readonly scenarioId:
    | "binary-polynomial-coefficients"
    | "common-factor-domain"
    | "factor-pair"
    | "fractional-linear-equation"
    | "linear-equation"
    | "like-term-coefficients"
    | "polynomial-substitution";
  readonly visibleControls: readonly SymbolicExpressionsScenarioControlId[];
};

export type SymbolicExpressionsControlDomainRequest =
  | {
      readonly controllerId: "mode";
      readonly kind: "controller";
      readonly value: SymbolicExpressionsMode;
    }
  | {
      readonly controlId: SymbolicExpressionsScenarioControlId;
      readonly kind: "control";
      readonly value: number;
    }
  | { readonly kind: "reset" };

export type SymbolicExpressionsControlProjection = {
  readonly affectedControlId:
    | "candidate-numerator"
    | "coefficient-a"
    | "constant-a"
    | "domain-numerator";
  readonly from: number;
  readonly projection:
    | "replace-degenerate-value"
    | "replace-excluded-value";
  readonly reason:
    | "domain-value-cannot-equal-cancelled-factor-root"
    | "factor-choice-must-remain-nonzero"
    | "fractional-linear-equation-needs-a-unique-slope"
    | "fractional-linear-solution-must-respect-domain"
    | "linear-equation-needs-a-nonzero-slope"
    | "solve-candidate-cannot-equal-denominator-root";
  readonly to: number;
};

export type SymbolicExpressionsControlTransitionPlan = {
  readonly domainId: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id;
  readonly domainVersion: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version;
  readonly expected: SymbolicExpressionsControlDomainState;
  readonly projections: readonly SymbolicExpressionsControlProjection[];
  readonly request: SymbolicExpressionsControlDomainRequest;
  readonly requested: SymbolicExpressionsControlDomainState;
};

export type SymbolicExpressionsControlDrift = {
  readonly expected: number | string;
  readonly key: keyof SymbolicExpressionsControlDomainState;
  readonly observed: number | string;
};

export type SymbolicExpressionsControlTransitionReceipt =
  SymbolicExpressionsControlTransitionPlan & {
    readonly drift: readonly SymbolicExpressionsControlDrift[];
    readonly matchesExpected: boolean;
    readonly observed: SymbolicExpressionsControlDomainState;
  };

const BNU_FRACTIONS =
  "bnu-junior-s2-lower-algebraic-fractions-equations" as const;
const PEP_EQUATIONS =
  "pep-junior-s1-upper-expressions-linear-equations" as const;

const STATE_KEYS = [
  "candidateDenominator",
  "candidateNumerator",
  "coefficientA",
  "coefficientB",
  "coefficientC",
  "coefficientD",
  "constantA",
  "constantB",
  "domainDenominator",
  "domainNumerator",
  "excludedRoot",
  "labId",
  "mode",
  "valueDenominator",
  "valueNumerator",
] as const satisfies readonly (keyof SymbolicExpressionsControlDomainState)[];

const FIELD_FOR_CONTROL = deepFreeze({
  "candidate-denominator": "candidateDenominator",
  "candidate-numerator": "candidateNumerator",
  "coefficient-a": "coefficientA",
  "coefficient-b": "coefficientB",
  "coefficient-c": "coefficientC",
  "coefficient-d": "coefficientD",
  "constant-a": "constantA",
  "constant-b": "constantB",
  "domain-denominator": "domainDenominator",
  "domain-numerator": "domainNumerator",
  "excluded-root": "excludedRoot",
  "value-denominator": "valueDenominator",
  "value-numerator": "valueNumerator",
} as const satisfies Record<
  SymbolicExpressionsScenarioControlId,
  keyof SymbolicExpressionsControlDomainState
>);

const VISIBLE_CONTROLS = deepFreeze({
  add: [
    "constant-a",
    "coefficient-a",
    "coefficient-b",
    "constant-b",
    "coefficient-c",
    "coefficient-d",
  ],
  "collect-like-terms": [
    "coefficient-a",
    "coefficient-b",
    "coefficient-c",
    "constant-a",
  ],
  expand: ["constant-a", "coefficient-a", "constant-b", "coefficient-b"],
  factor: ["constant-a", "coefficient-a", "constant-b", "coefficient-b"],
  "fraction-simplify": [
    "constant-a",
    "coefficient-a",
    "excluded-root",
    "domain-numerator",
    "domain-denominator",
  ],
  solve: [
    "constant-a",
    "coefficient-a",
    "constant-b",
    "candidate-numerator",
    "candidate-denominator",
  ],
  substitute: [
    "constant-a",
    "coefficient-a",
    "coefficient-b",
    "value-numerator",
    "value-denominator",
  ],
  subtract: [
    "constant-a",
    "coefficient-a",
    "coefficient-b",
    "constant-b",
    "coefficient-c",
    "coefficient-d",
  ],
} as const satisfies Record<
  SymbolicExpressionsMode,
  readonly SymbolicExpressionsScenarioControlId[]
>);

const BASE_RESET_FIELDS = deepFreeze({
  candidateDenominator: 1,
  candidateNumerator: 3,
  coefficientA: 1,
  coefficientB: 1,
  coefficientC: -2,
  coefficientD: 1,
  constantA: 2,
  constantB: 3,
  domainDenominator: 1,
  domainNumerator: 2,
  excludedRoot: 1,
  valueDenominator: 1,
  valueNumerator: 2,
});

const RESET_STATES = deepFreeze({
  "bnu-junior-s1-upper-algebraic-expressions": {
    ...BASE_RESET_FIELDS,
    coefficientA: 3,
    coefficientB: 5,
    coefficientC: -2,
    constantA: 4,
    mode: "collect-like-terms",
  },
  "bnu-junior-s2-lower-algebraic-fractions-equations": {
    ...BASE_RESET_FIELDS,
    candidateNumerator: 3,
    coefficientA: 0,
    constantA: 2,
    constantB: 1,
    excludedRoot: 1,
    mode: "solve",
  },
  "hjb-junior-s1-upper-algebraic-fractions": {
    ...BASE_RESET_FIELDS,
    coefficientA: 1,
    constantA: 1,
    domainNumerator: 2,
    excludedRoot: 1,
    mode: "fraction-simplify",
  },
  "hjb-junior-s1-upper-polynomial-add-subtract": {
    ...BASE_RESET_FIELDS,
    coefficientA: -2,
    coefficientB: 3,
    coefficientC: 4,
    coefficientD: 1,
    constantA: 1,
    constantB: -5,
    mode: "subtract",
  },
  "hjb-primary-p6-lower-simple-algebraic-expressions": {
    ...BASE_RESET_FIELDS,
    coefficientA: 3,
    coefficientB: 0,
    constantA: -2,
    mode: "substitute",
    valueNumerator: 4,
  },
  "pep-junior-s1-upper-expressions-linear-equations": {
    ...BASE_RESET_FIELDS,
    candidateNumerator: 3,
    coefficientA: 2,
    constantA: 1,
    constantB: 7,
    mode: "solve",
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    ...BASE_RESET_FIELDS,
    coefficientA: 1,
    coefficientB: 1,
    constantA: -4,
    constantB: -4,
    mode: "expand",
  },
} as const satisfies Record<
  SymbolicExpressionsLabId,
  Omit<SymbolicExpressionsControlDomainState, "labId">
>);

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isLabId(value: unknown): value is SymbolicExpressionsLabId {
  return (SYMBOLIC_EXPRESSIONS_LAB_IDS as readonly unknown[]).includes(value);
}

function isMode(value: unknown): value is SymbolicExpressionsMode {
  return Object.values(SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST)
    .flat()
    .includes(value as never);
}

function modeAllowed(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
): boolean {
  return (
    SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId] as readonly SymbolicExpressionsMode[]
  ).includes(mode);
}

function stateSnapshot(
  state: SymbolicExpressionsControlDomainState,
): SymbolicExpressionsControlDomainState {
  return deepFreeze({
    candidateDenominator: state.candidateDenominator,
    candidateNumerator: state.candidateNumerator,
    coefficientA: state.coefficientA,
    coefficientB: state.coefficientB,
    coefficientC: state.coefficientC,
    coefficientD: state.coefficientD,
    constantA: state.constantA,
    constantB: state.constantB,
    domainDenominator: state.domainDenominator,
    domainNumerator: state.domainNumerator,
    excludedRoot: state.excludedRoot,
    labId: state.labId,
    mode: state.mode,
    valueDenominator: state.valueDenominator,
    valueNumerator: state.valueNumerator,
  });
}

function assertSafeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_CONTROL_VALUE",
      `${label} must be a finite safe integer.`,
    );
  }
}

function boundsForControl(
  controlId: SymbolicExpressionsScenarioControlId,
): { max: number; min: number; step: 1 } {
  if (
    controlId === "candidate-denominator" ||
    controlId === "domain-denominator" ||
    controlId === "value-denominator"
  ) {
    return { max: 12, min: 1, step: 1 };
  }
  if (
    controlId === "candidate-numerator" ||
    controlId === "domain-numerator" ||
    controlId === "value-numerator"
  ) {
    return { max: 120, min: -120, step: 1 };
  }
  if (controlId === "constant-a" || controlId === "constant-b") {
    return { max: 24, min: -24, step: 1 };
  }
  if (controlId === "excluded-root") {
    return { max: 8, min: -8, step: 1 };
  }
  return { max: 12, min: -12, step: 1 };
}

function visibleControlsFor(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
): readonly SymbolicExpressionsScenarioControlId[] {
  if (mode === "solve" && labId === BNU_FRACTIONS) {
    return [
      "constant-a",
      "coefficient-a",
      "constant-b",
      "excluded-root",
      "candidate-numerator",
      "candidate-denominator",
    ];
  }
  return VISIBLE_CONTROLS[mode];
}

function scenarioIdFor(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
): SymbolicExpressionsControlDescriptor["scenarioId"] {
  switch (mode) {
    case "collect-like-terms":
      return "like-term-coefficients";
    case "add":
    case "subtract":
      return "binary-polynomial-coefficients";
    case "expand":
    case "factor":
      return "factor-pair";
    case "substitute":
      return "polynomial-substitution";
    case "fraction-simplify":
      return "common-factor-domain";
    case "solve":
      return labId === BNU_FRACTIONS
        ? "fractional-linear-equation"
        : "linear-equation";
  }
}

function assertIdentityAndMode(
  labId: unknown,
  mode: unknown,
): asserts labId is SymbolicExpressionsLabId {
  if (!isLabId(labId)) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_LAB_ID",
      `Unsupported symbolic-expression Lab ${String(labId)}.`,
    );
  }
  if (!isMode(mode)) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_MODE",
      `Unsupported symbolic-expression mode ${String(mode)}.`,
    );
  }
  if (!modeAllowed(labId, mode)) {
    throw new SymbolicExpressionsControlDomainError(
      "MODE_NOT_ALLOWED",
      `${mode} is not curriculum-authorized for ${labId}.`,
    );
  }
}

function assertStateShape(
  state: SymbolicExpressionsControlDomainState,
  invalidCode: "INVALID_CONTROL_VALUE" | "INVALID_STATE",
): void {
  try {
    assertIdentityAndMode(state.labId, state.mode);
    for (const key of STATE_KEYS) {
      if (key === "labId" || key === "mode") continue;
      assertSafeInteger(state[key], key);
    }
    for (const controlId of Object.keys(
      FIELD_FOR_CONTROL,
    ) as SymbolicExpressionsScenarioControlId[]) {
      const value = state[FIELD_FOR_CONTROL[controlId]];
      const bounds = boundsForControl(controlId);
      if (
        typeof value !== "number" ||
        value < bounds.min ||
        value > bounds.max
      ) {
        throw new SymbolicExpressionsControlDomainError(
          invalidCode,
          `${controlId} must be between ${bounds.min} and ${bounds.max}.`,
        );
      }
    }
  } catch (error) {
    if (
      invalidCode === "INVALID_STATE" &&
      error instanceof SymbolicExpressionsControlDomainError &&
      error.code === "INVALID_CONTROL_VALUE"
    ) {
      throw new SymbolicExpressionsControlDomainError(
        "INVALID_STATE",
        error.message,
      );
    }
    throw error;
  }
}

function multiplyLinearFactors(
  left: readonly [number, number],
  right: readonly [number, number],
): readonly number[] {
  return [
    left[0] * right[0],
    left[0] * right[1] + left[1] * right[0],
    left[1] * right[1],
  ];
}

function normalizePolynomial(values: readonly number[]): readonly number[] {
  const result = [...values];
  while (result.length > 1 && result.at(-1) === 0) result.pop();
  return result;
}

function scenarioInputUnchecked(
  state: SymbolicExpressionsControlDomainState,
): SymbolicExpressionsInput {
  const left = normalizePolynomial([
    state.constantA,
    state.coefficientA,
    state.coefficientB,
  ]);
  const right = normalizePolynomial([
    state.constantB,
    state.coefficientC,
    state.coefficientD,
  ]);
  const firstFactor = normalizePolynomial([
    state.constantA,
    state.coefficientA,
  ]);
  const secondFactor = normalizePolynomial([
    state.constantB,
    state.coefficientB,
  ]);

  switch (state.mode) {
    case "collect-like-terms":
      return {
        labId: state.labId,
        mode: state.mode,
        terms: [
          { coefficient: state.coefficientA, degree: 1 },
          { coefficient: state.coefficientB, degree: 2 },
          { coefficient: state.coefficientC, degree: 1 },
          { coefficient: state.constantA, degree: 0 },
        ],
      };
    case "add":
    case "subtract":
      return { labId: state.labId, left, mode: state.mode, right };
    case "expand":
      return {
        factors: [firstFactor, secondFactor],
        labId: state.labId,
        mode: state.mode,
      };
    case "factor":
      return {
        factor: firstFactor,
        labId: state.labId,
        mode: state.mode,
        polynomial: normalizePolynomial(
          multiplyLinearFactors(
            [state.constantA, state.coefficientA],
            [state.constantB, state.coefficientB],
          ),
        ),
      };
    case "substitute":
      return {
        labId: state.labId,
        mode: state.mode,
        polynomial: left,
        value: {
          denominator: state.valueDenominator,
          numerator: state.valueNumerator,
        },
      };
    case "fraction-simplify": {
      const common = [-state.excludedRoot, 1] as const;
      return {
        cancelFactors: [common],
        domainValue: {
          denominator: state.domainDenominator,
          numerator: state.domainNumerator,
        },
        fraction: {
          denominator: common,
          numerator: normalizePolynomial(
            multiplyLinearFactors(common, [state.constantA, state.coefficientA]),
          ),
        },
        labId: state.labId,
        mode: state.mode,
      };
    }
    case "solve":
      return {
        candidate: {
          denominator: state.candidateDenominator,
          numerator: state.candidateNumerator,
        },
        equation:
          state.labId === BNU_FRACTIONS
            ? {
                left: {
                  denominator: [-state.excludedRoot, 1],
                  numerator: normalizePolynomial([
                    state.constantA,
                    state.coefficientA,
                  ]),
                },
                right: {
                  denominator: [1],
                  numerator: [state.constantB],
                },
              }
            : {
                left: {
                  denominator: [1],
                  numerator: normalizePolynomial([
                    state.constantA,
                    state.coefficientA,
                  ]),
                },
                right: {
                  denominator: [1],
                  numerator: [state.constantB],
                },
              },
        labId: state.labId,
        mode: state.mode,
      };
  }
}

function assertModelValid(
  state: SymbolicExpressionsControlDomainState,
  errorCode: "INVALID_STATE" | "MODEL_REJECTED_STATE",
): void {
  try {
    buildSymbolicExpressionsModel(scenarioInputUnchecked(state));
  } catch (error) {
    if (error instanceof SymbolicExpressionsDomainError) {
      throw new SymbolicExpressionsControlDomainError(
        errorCode,
        `The finite scenario was rejected by the exact symbolic model: ${error.message}`,
        error.code,
      );
    }
    throw error;
  }
}

function assertValidState(
  state: SymbolicExpressionsControlDomainState,
  errorCode: "INVALID_STATE" | "MODEL_REJECTED_STATE",
): void {
  assertStateShape(state, errorCode === "INVALID_STATE" ? "INVALID_STATE" : "INVALID_CONTROL_VALUE");
  assertModelValid(state, errorCode);
}

function adjacentAllowedRationalNumerator(root: number, denominator: number) {
  const adjacent = root === 8 ? root - 1 : root + 1;
  return adjacent * denominator;
}

function applyModeProjections(
  requested: SymbolicExpressionsControlDomainState,
): {
  expected: SymbolicExpressionsControlDomainState;
  projections: SymbolicExpressionsControlProjection[];
} {
  const mutable = { ...requested };
  const projections: SymbolicExpressionsControlProjection[] = [];

  if (
    requested.mode === "factor" &&
    requested.constantA === 0 &&
    requested.coefficientA === 0
  ) {
    mutable.coefficientA = 1;
    projections.push({
      affectedControlId: "coefficient-a",
      from: 0,
      projection: "replace-degenerate-value",
      reason: "factor-choice-must-remain-nonzero",
      to: 1,
    });
  }

  if (
    requested.mode === "fraction-simplify" &&
    requested.domainNumerator ===
      requested.excludedRoot * requested.domainDenominator
  ) {
    const to = adjacentAllowedRationalNumerator(
      requested.excludedRoot,
      requested.domainDenominator,
    );
    mutable.domainNumerator = to;
    projections.push({
      affectedControlId: "domain-numerator",
      from: requested.domainNumerator,
      projection: "replace-excluded-value",
      reason: "domain-value-cannot-equal-cancelled-factor-root",
      to,
    });
  }

  if (requested.mode === "solve" && requested.labId === BNU_FRACTIONS) {
    if (requested.coefficientA === requested.constantB) {
      const to = requested.constantB < 12 ? requested.constantB + 1 : -12;
      mutable.coefficientA = to;
      projections.push({
        affectedControlId: "coefficient-a",
        from: requested.coefficientA,
        projection: "replace-degenerate-value",
        reason: "fractional-linear-equation-needs-a-unique-slope",
        to,
      });
    }
    if (
      mutable.constantA ===
      -mutable.coefficientA * requested.excludedRoot
    ) {
      const from = mutable.constantA;
      const to = from === 24 ? from - 1 : from + 1;
      mutable.constantA = to;
      projections.push({
        affectedControlId: "constant-a",
        from,
        projection: "replace-degenerate-value",
        reason: "fractional-linear-solution-must-respect-domain",
        to,
      });
    }
    if (
      requested.candidateNumerator ===
      requested.excludedRoot * requested.candidateDenominator
    ) {
      const to = adjacentAllowedRationalNumerator(
        requested.excludedRoot,
        requested.candidateDenominator,
      );
      mutable.candidateNumerator = to;
      projections.push({
        affectedControlId: "candidate-numerator",
        from: requested.candidateNumerator,
        projection: "replace-excluded-value",
        reason: "solve-candidate-cannot-equal-denominator-root",
        to,
      });
    }
  }

  if (
    requested.mode === "solve" &&
    requested.labId === PEP_EQUATIONS &&
    requested.coefficientA === 0
  ) {
    mutable.coefficientA = 1;
    projections.push({
      affectedControlId: "coefficient-a",
      from: 0,
      projection: "replace-degenerate-value",
      reason: "linear-equation-needs-a-nonzero-slope",
      to: 1,
    });
  }

  return { expected: stateSnapshot(mutable), projections };
}

export function symbolicExpressionsControlDescriptorFor(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
): SymbolicExpressionsControlDescriptor {
  assertIdentityAndMode(labId, mode);
  const visibleControls = [...visibleControlsFor(labId, mode)];
  return deepFreeze({
    allowedModes: [...SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]],
    controls: visibleControls.map((controlId) => ({
      controlId,
      ...boundsForControl(controlId),
    })),
    domainId: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id,
    domainVersion: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version,
    labId,
    mode,
    requiredControls: [...visibleControls],
    scenarioId: scenarioIdFor(labId, mode),
    visibleControls,
  });
}

export function buildSymbolicExpressionsScenarioInput(
  state: SymbolicExpressionsControlDomainState,
): SymbolicExpressionsInput {
  assertValidState(state, "INVALID_STATE");
  return deepFreeze(scenarioInputUnchecked(state));
}

export function createSymbolicExpressionsControlDomainState(
  labId: SymbolicExpressionsLabId,
): SymbolicExpressionsControlDomainState {
  if (!isLabId(labId)) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_LAB_ID",
      `Unsupported symbolic-expression Lab ${String(labId)}.`,
    );
  }
  const state = stateSnapshot({ labId, ...RESET_STATES[labId] });
  assertValidState(state, "INVALID_STATE");
  const input = scenarioInputUnchecked(state);
  if (canonicalJson(input) !== canonicalJson(SYMBOLIC_EXPRESSIONS_RESET_INPUTS[labId])) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_STATE",
      `The finite scenario reset does not reconstruct the exact upstream reset for ${labId}.`,
    );
  }
  return state;
}

export function planSymbolicExpressionsControlTransition(
  current: SymbolicExpressionsControlDomainState,
  request: SymbolicExpressionsControlDomainRequest,
): SymbolicExpressionsControlTransitionPlan {
  assertValidState(current, "INVALID_STATE");

  let requested: SymbolicExpressionsControlDomainState;
  let expected: SymbolicExpressionsControlDomainState;
  let projections: SymbolicExpressionsControlProjection[] = [];

  if (request.kind === "reset") {
    requested = createSymbolicExpressionsControlDomainState(current.labId);
    expected = requested;
  } else if (request.kind === "controller") {
    if (request.controllerId !== "mode") {
      throw new SymbolicExpressionsControlDomainError(
        "INVALID_CONTROLLER",
        `Unsupported symbolic-expression controller ${String(request.controllerId)}.`,
      );
    }
    if (!isMode(request.value)) {
      throw new SymbolicExpressionsControlDomainError(
        "INVALID_MODE",
        `Unsupported symbolic-expression mode ${String(request.value)}.`,
      );
    }
    if (!modeAllowed(current.labId, request.value)) {
      throw new SymbolicExpressionsControlDomainError(
        "MODE_NOT_ALLOWED",
        `${request.value} is not curriculum-authorized for ${current.labId}.`,
      );
    }
    requested = stateSnapshot({ ...current, mode: request.value });
    const projected = applyModeProjections(requested);
    expected = projected.expected;
    projections = projected.projections;
    assertValidState(expected, "INVALID_STATE");
  } else {
    assertSafeInteger(request.value, request.controlId);
    const descriptor = symbolicExpressionsControlDescriptorFor(
      current.labId,
      current.mode,
    );
    const control = descriptor.controls.find(
      ({ controlId }) => controlId === request.controlId,
    );
    if (!control) {
      throw new SymbolicExpressionsControlDomainError(
        "CONTROL_NOT_VISIBLE",
        `${request.controlId} is not visible in ${current.labId}:${current.mode}.`,
      );
    }
    if (request.value < control.min || request.value > control.max) {
      throw new SymbolicExpressionsControlDomainError(
        "DIRECT_CONTROL_OUT_OF_RANGE",
        `${request.controlId} must be between ${control.min} and ${control.max}.`,
      );
    }
    requested = stateSnapshot({
      ...current,
      [FIELD_FOR_CONTROL[request.controlId]]: request.value,
    });
    assertValidState(requested, "MODEL_REJECTED_STATE");
    expected = requested;
  }

  return deepFreeze({
    domainId: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id,
    domainVersion: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version,
    expected,
    projections,
    request: { ...request },
    requested,
  });
}

export function auditSymbolicExpressionsControlTransition(
  plan: SymbolicExpressionsControlTransitionPlan,
  observed: SymbolicExpressionsControlDomainState,
): SymbolicExpressionsControlTransitionReceipt {
  assertValidState(observed, "INVALID_STATE");
  const observedSnapshot = stateSnapshot(observed);
  const drift = STATE_KEYS.flatMap((key) =>
    plan.expected[key] === observedSnapshot[key]
      ? []
      : [
          {
            expected: plan.expected[key],
            key,
            observed: observedSnapshot[key],
          } satisfies SymbolicExpressionsControlDrift,
        ],
  );
  return deepFreeze({
    ...plan,
    drift,
    matchesExpected: drift.length === 0,
    observed: observedSnapshot,
  });
}
