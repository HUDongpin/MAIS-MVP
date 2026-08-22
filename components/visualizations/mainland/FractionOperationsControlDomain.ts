export const FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID =
  "fraction-operations-divisor-nonzero-v1" as const;

export const FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION = 1 as const;

export const FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT = Object.freeze({
  domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  id: "fraction-operations-action-receipt-v1",
  version: 1,
} as const);

export type FractionOperationsMode =
  | "equivalence"
  | "compare"
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "simplify"
  | "estimate";

export type FractionOperationsEvaluatedOperation = Exclude<
  FractionOperationsMode,
  "estimate"
>;

export type FractionOperationsControlId =
  | "left-numerator"
  | "left-denominator"
  | "right-numerator"
  | "right-denominator";

export type FractionOperationsDomainState = Readonly<{
  mode: FractionOperationsMode;
  evaluatedOperation: FractionOperationsEvaluatedOperation;
  leftNumerator: number;
  leftDenominator: number;
  rightNumerator: number;
  rightDenominator: number;
}>;

export type FractionOperationsDomainRequest =
  | Readonly<{
      kind: "controller";
      mode: FractionOperationsMode;
      evaluatedOperation: FractionOperationsEvaluatedOperation;
    }>
  | Readonly<{
      kind: "control";
      controlId: FractionOperationsControlId;
      value: number;
    }>;

export type FractionOperationsActionRequest =
  | FractionOperationsDomainRequest
  | Readonly<{ kind: "initial" }>
  | Readonly<{ kind: "reset" }>;

export type FractionOperationsDivisorProjection = Readonly<{
  domainId: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID;
  affectedControlId: "right-numerator";
  before: 0;
  after: 1;
  projection: "exclude-zero";
  reason: "division-divisor-cannot-be-zero";
  controllerInputs: Readonly<{
    mode: FractionOperationsMode;
    evaluatedOperation: "divide";
  }>;
}>;

export type FractionOperationsDivisorTransitionPlan = Readonly<{
  domainId: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID;
  domainVersion: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION;
  request: FractionOperationsDomainRequest;
  requested: FractionOperationsDomainState;
  expected: FractionOperationsDomainState;
  projections: readonly FractionOperationsDivisorProjection[];
}>;

export type FractionOperationsDivisorTransitionReceipt = Readonly<{
  domainId: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID;
  domainVersion: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION;
  request: FractionOperationsDomainRequest;
  requested: FractionOperationsDomainState;
  expected: FractionOperationsDomainState;
  observed: FractionOperationsDomainState;
  projections: readonly FractionOperationsDivisorProjection[];
  matchesExpected: boolean;
}>;

type FractionOperationsActionReceiptBase = Readonly<{
  before: FractionOperationsDomainState;
  domainId: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID;
  domainVersion: typeof FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION;
  expected: FractionOperationsDomainState;
  matchesExpected: true;
  observed: FractionOperationsDomainState;
  projections: readonly FractionOperationsDivisorProjection[];
  request: FractionOperationsActionRequest;
  requested: FractionOperationsDomainState;
  version: typeof FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id;
}>;

export type FractionOperationsAcceptedActionReceipt =
  FractionOperationsActionReceiptBase &
    Readonly<{
      accepted: true;
      rejection: null;
      requestedValidity: "accepted-as-requested" | "requires-projection";
      status: "accepted";
    }>;

export type FractionOperationsRejectedActionReceipt =
  FractionOperationsActionReceiptBase &
    Readonly<{
      accepted: false;
      rejection: "DIRECT_DIVISOR_ZERO_REQUEST";
      requestedValidity: "rejected-invalid";
      status: "rejected";
    }>;

export type FractionOperationsActionReceipt =
  | FractionOperationsAcceptedActionReceipt
  | FractionOperationsRejectedActionReceipt;

export type FractionOperationsDivisorDomainErrorCode =
  | "INVALID_STATE"
  | "INVALID_CONTROLLER"
  | "INVALID_CONTROL"
  | "INVALID_INTEGER"
  | "DENOMINATOR_OUT_OF_RANGE"
  | "DIRECT_DIVISOR_ZERO_REQUEST";

export class FractionOperationsDivisorDomainError extends Error {
  readonly code: FractionOperationsDivisorDomainErrorCode;

  constructor(code: FractionOperationsDivisorDomainErrorCode, message: string) {
    super(message);
    this.name = "FractionOperationsDivisorDomainError";
    this.code = code;
  }
}

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

const LEFT_DENOMINATOR_BOUNDS = deepFreeze({
  minimum: 1,
  maximum: 24,
  step: 1,
} as const);

const RIGHT_DENOMINATOR_BOUNDS = deepFreeze({
  minimum: 1,
  maximum: 24,
  step: 1,
} as const);

export const FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR = deepFreeze({
  domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
  kind: "projected" as const,
  controllerInputs: ["mode", "evaluated-operation"] as const,
  affectedControlIds: ["right-numerator"] as const,
  projection: "exclude-zero" as const,
  projectionReason: "division-divisor-cannot-be-zero" as const,
  denominatorBounds: {
    "left-denominator": LEFT_DENOMINATOR_BOUNDS,
    "right-denominator": RIGHT_DENOMINATOR_BOUNDS,
  },
  unresolvedDomains: [
    "signed-physical-interpretation",
    "proper-area-model",
  ] as const,
});

const MODES = new Set<FractionOperationsMode>([
  "equivalence",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "simplify",
  "estimate",
]);

const EVALUATED_OPERATIONS = new Set<FractionOperationsEvaluatedOperation>([
  "equivalence",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "simplify",
]);

const ESTIMATE_OPERATIONS = new Set<FractionOperationsEvaluatedOperation>([
  "add",
  "subtract",
  "multiply",
  "divide",
]);

const cloneState = (
  value: FractionOperationsDomainState,
): FractionOperationsDomainState => ({
  mode: value.mode,
  evaluatedOperation: value.evaluatedOperation,
  leftNumerator: value.leftNumerator,
  leftDenominator: value.leftDenominator,
  rightNumerator: value.rightNumerator,
  rightDenominator: value.rightDenominator,
});

const validateInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value)) {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_INTEGER",
      `${label} must be a finite safe integer.`,
    );
  }
};

const validateDenominator = (value: number, label: string): void => {
  validateInteger(value, label);
  if (value < 1 || value > 24) {
    throw new FractionOperationsDivisorDomainError(
      "DENOMINATOR_OUT_OF_RANGE",
      `${label} must be between 1 and 24 inclusive.`,
    );
  }
};

const isValidControllerPair = (
  mode: FractionOperationsMode,
  evaluatedOperation: FractionOperationsEvaluatedOperation,
): boolean => {
  if (!MODES.has(mode) || !EVALUATED_OPERATIONS.has(evaluatedOperation)) {
    return false;
  }
  if (mode === "estimate") return ESTIMATE_OPERATIONS.has(evaluatedOperation);
  return mode === evaluatedOperation;
};

const validateControllerPair = (
  mode: FractionOperationsMode,
  evaluatedOperation: FractionOperationsEvaluatedOperation,
  errorCode: "INVALID_STATE" | "INVALID_CONTROLLER",
): void => {
  if (!isValidControllerPair(mode, evaluatedOperation)) {
    throw new FractionOperationsDivisorDomainError(
      errorCode,
      `Mode ${String(mode)} cannot evaluate operation ${String(evaluatedOperation)}.`,
    );
  }
};

const validateState = (
  value: FractionOperationsDomainState,
  allowProjectedZero: boolean,
): void => {
  if (value === null || typeof value !== "object") {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_STATE",
      "Fraction operations domain state must be an object.",
    );
  }
  validateControllerPair(value.mode, value.evaluatedOperation, "INVALID_STATE");
  validateInteger(value.leftNumerator, "leftNumerator");
  validateDenominator(value.leftDenominator, "leftDenominator");
  validateInteger(value.rightNumerator, "rightNumerator");
  validateDenominator(value.rightDenominator, "rightDenominator");
  if (
    !allowProjectedZero &&
    value.evaluatedOperation === "divide" &&
    value.rightNumerator === 0
  ) {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_STATE",
      "A persisted divide state cannot use a zero right numerator.",
    );
  }
};

const cloneRequest = (
  request: FractionOperationsDomainRequest,
): FractionOperationsDomainRequest => {
  if (request.kind === "controller") {
    return {
      kind: "controller",
      mode: request.mode,
      evaluatedOperation: request.evaluatedOperation,
    };
  }
  return {
    kind: "control",
    controlId: request.controlId,
    value: request.value,
  };
};

const cloneActionRequest = (
  request: FractionOperationsActionRequest,
): FractionOperationsActionRequest => {
  if (request.kind === "initial" || request.kind === "reset") {
    return { kind: request.kind };
  }
  return cloneRequest(request);
};

const stateWithControlValue = (
  current: FractionOperationsDomainState,
  controlId: FractionOperationsControlId,
  value: number,
): FractionOperationsDomainState => {
  validateInteger(value, controlId);
  switch (controlId) {
    case "left-numerator":
      return { ...current, leftNumerator: value };
    case "right-numerator":
      return { ...current, rightNumerator: value };
    case "left-denominator":
      validateDenominator(value, controlId);
      return { ...current, leftDenominator: value };
    case "right-denominator":
      validateDenominator(value, controlId);
      return { ...current, rightDenominator: value };
    default: {
      const exhaustive: never = controlId;
      throw new FractionOperationsDivisorDomainError(
        "INVALID_CONTROL",
        `Unsupported fraction operations control ${String(exhaustive)}.`,
      );
    }
  }
};

export const planFractionOperationsDivisorTransition = (
  current: FractionOperationsDomainState,
  request: FractionOperationsDomainRequest,
): FractionOperationsDivisorTransitionPlan => {
  validateState(current, false);

  let requested: FractionOperationsDomainState;
  let expected: FractionOperationsDomainState;
  let projections: readonly FractionOperationsDivisorProjection[] = [];

  if (request.kind === "controller") {
    validateControllerPair(
      request.mode,
      request.evaluatedOperation,
      "INVALID_CONTROLLER",
    );
    requested = {
      ...cloneState(current),
      mode: request.mode,
      evaluatedOperation: request.evaluatedOperation,
    };
    validateState(requested, true);

    if (
      requested.evaluatedOperation === "divide" &&
      requested.rightNumerator === 0
    ) {
      expected = { ...requested, rightNumerator: 1 };
      projections = [{
        domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
        affectedControlId: "right-numerator",
        before: 0,
        after: 1,
        projection: "exclude-zero",
        reason: "division-divisor-cannot-be-zero",
        controllerInputs: {
          mode: requested.mode,
          evaluatedOperation: "divide",
        },
      }];
    } else {
      expected = cloneState(requested);
    }
  } else if (request.kind === "control") {
    if (
      request.controlId === "right-numerator" &&
      request.value === 0 &&
      current.evaluatedOperation === "divide"
    ) {
      throw new FractionOperationsDivisorDomainError(
        "DIRECT_DIVISOR_ZERO_REQUEST",
        "A direct zero divisor request is invalid while divide is active.",
      );
    }
    requested = stateWithControlValue(current, request.controlId, request.value);
    validateState(requested, false);
    expected = cloneState(requested);
  } else {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_CONTROL",
      "Fraction operations transition request is invalid.",
    );
  }

  validateState(expected, false);
  return deepFreeze({
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    request: cloneRequest(request),
    requested: cloneState(requested),
    expected: cloneState(expected),
    projections,
  });
};

const statesEqual = (
  left: FractionOperationsDomainState,
  right: FractionOperationsDomainState,
): boolean =>
  left.mode === right.mode &&
  left.evaluatedOperation === right.evaluatedOperation &&
  left.leftNumerator === right.leftNumerator &&
  left.leftDenominator === right.leftDenominator &&
  left.rightNumerator === right.rightNumerator &&
  left.rightDenominator === right.rightDenominator;

export const auditFractionOperationsDivisorTransition = (
  plan: FractionOperationsDivisorTransitionPlan,
  observed: FractionOperationsDomainState,
): FractionOperationsDivisorTransitionReceipt => {
  validateState(observed, false);
  const observedSnapshot = cloneState(observed);
  return deepFreeze({
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    request: cloneRequest(plan.request),
    requested: cloneState(plan.requested),
    expected: cloneState(plan.expected),
    observed: observedSnapshot,
    projections: plan.projections.map((projection) => ({
      ...projection,
      controllerInputs: { ...projection.controllerInputs },
    })),
    matchesExpected: statesEqual(plan.expected, observedSnapshot),
  });
};

export const createFractionOperationsAcceptedActionReceipt = (input: {
  before: FractionOperationsDomainState;
  expected: FractionOperationsDomainState;
  observed: FractionOperationsDomainState;
  projections: readonly FractionOperationsDivisorProjection[];
  request: FractionOperationsActionRequest;
  requested: FractionOperationsDomainState;
}): FractionOperationsAcceptedActionReceipt => {
  validateState(input.before, false);
  validateState(input.requested, true);
  validateState(input.expected, false);
  validateState(input.observed, false);
  if (!statesEqual(input.expected, input.observed)) {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_STATE",
      "Accepted action receipt observed state must exactly match expected state.",
    );
  }
  if (input.request.kind === "initial") {
    if (
      !statesEqual(input.before, input.requested) ||
      !statesEqual(input.requested, input.expected) ||
      input.projections.length !== 0
    ) {
      throw new FractionOperationsDivisorDomainError(
        "INVALID_STATE",
        "Initial action receipt must preserve one exact state without projections.",
      );
    }
  } else if (input.request.kind === "reset") {
    if (
      !statesEqual(input.requested, input.expected) ||
      input.projections.length !== 0
    ) {
      throw new FractionOperationsDivisorDomainError(
        "INVALID_STATE",
        "Reset action receipt must expose the exact reset state without projections.",
      );
    }
  } else {
    const plan = planFractionOperationsDivisorTransition(
      input.before,
      input.request,
    );
    if (
      !statesEqual(plan.requested, input.requested) ||
      !statesEqual(plan.expected, input.expected) ||
      JSON.stringify(plan.projections) !== JSON.stringify(input.projections)
    ) {
      throw new FractionOperationsDivisorDomainError(
        "INVALID_STATE",
        "Accepted action receipt must exactly match the production transition plan.",
      );
    }
  }
  const projections = input.projections.map((projection) => ({
    ...projection,
    controllerInputs: { ...projection.controllerInputs },
  }));
  return deepFreeze({
    accepted: true as const,
    before: cloneState(input.before),
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    expected: cloneState(input.expected),
    matchesExpected: true as const,
    observed: cloneState(input.observed),
    projections,
    rejection: null,
    request: cloneActionRequest(input.request),
    requested: cloneState(input.requested),
    requestedValidity:
      projections.length > 0
        ? "requires-projection" as const
        : "accepted-as-requested" as const,
    status: "accepted" as const,
    version: FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id,
  });
};

export const createFractionOperationsRejectedActionReceipt = (input: {
  before: FractionOperationsDomainState;
  rejection: FractionOperationsDivisorDomainErrorCode;
  request: FractionOperationsDomainRequest;
}): FractionOperationsRejectedActionReceipt => {
  validateState(input.before, false);
  if (
    input.rejection !== "DIRECT_DIVISOR_ZERO_REQUEST" ||
    input.request.kind !== "control" ||
    input.request.controlId !== "right-numerator" ||
    input.request.value !== 0 ||
    input.before.evaluatedOperation !== "divide"
  ) {
    throw new FractionOperationsDivisorDomainError(
      "INVALID_STATE",
      "Rejected action receipt requires the exact direct zero divisor request.",
    );
  }
  const before = cloneState(input.before);
  const requested = stateWithControlValue(
    before,
    input.request.controlId,
    input.request.value,
  );
  validateState(requested, true);
  return deepFreeze({
    accepted: false as const,
    before,
    domainId: FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    domainVersion: FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
    expected: cloneState(before),
    matchesExpected: true as const,
    observed: cloneState(before),
    projections: [] as const,
    rejection: input.rejection,
    request: cloneRequest(input.request),
    requested: cloneState(requested),
    requestedValidity: "rejected-invalid" as const,
    status: "rejected" as const,
    version: FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id,
  });
};
