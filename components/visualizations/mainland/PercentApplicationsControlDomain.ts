import {
  PERCENT_APPLICATIONS_LAB_IDS,
  PERCENT_APPLICATIONS_MODES,
  type PercentApplicationsLabId,
  type PercentApplicationsMode,
  type PercentChangeDirection,
} from "./PercentApplicationsModel";

export const PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT = deepFreeze({
  id: "percent-applications-rate-v1",
  labIds: [...PERCENT_APPLICATIONS_LAB_IDS],
  modes: [...PERCENT_APPLICATIONS_MODES],
  version: 1,
} as const);

export type PercentApplicationsNumericControlId =
  | "amount"
  | "base"
  | "new-value"
  | "rate-basis-points";

export type PercentApplicationsVisibleControlId =
  | PercentApplicationsNumericControlId
  | "inverse-direction";

export type PercentApplicationsControlDomainState = {
  readonly amount: number;
  readonly base: number;
  readonly inverseDirection: PercentChangeDirection;
  readonly labId: PercentApplicationsLabId;
  readonly mode: PercentApplicationsMode;
  readonly newValue: number;
  readonly rateBasisPoints: number;
};

export type PercentApplicationsControlDomainErrorCode =
  | "CONTROL_NOT_VISIBLE"
  | "DIRECT_CONTROL_OUT_OF_RANGE"
  | "INVALID_CONTROL_VALUE"
  | "INVALID_CONTROLLER"
  | "INVALID_DIRECTION"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_STATE";

export class PercentApplicationsControlDomainError extends RangeError {
  readonly code: PercentApplicationsControlDomainErrorCode;

  constructor(
    code: PercentApplicationsControlDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PercentApplicationsControlDomainError";
    this.code = code;
  }
}

export type PercentApplicationsControlDomainRequest =
  | {
      readonly controllerId: "inverse-direction" | "mode";
      readonly kind: "controller";
      readonly value: PercentApplicationsMode | PercentChangeDirection;
    }
  | {
      readonly controlId: PercentApplicationsNumericControlId;
      readonly kind: "control";
      readonly value: number;
    }
  | { readonly kind: "reset" };

export type PercentApplicationsRateProjection = {
  readonly controlId: "rate-basis-points";
  readonly from: number;
  readonly projection: "clamp-max" | "clamp-min";
  readonly reason:
    | "decrease-rate-cannot-exceed-100-percent"
    | "discount-rate-cannot-exceed-100-percent"
    | "find-whole-rate-must-be-positive"
    | "inverse-decrease-must-remain-below-100-percent";
  readonly to: number;
};

export type PercentApplicationsControlTransitionPlan = {
  readonly domainId: typeof PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id;
  readonly domainVersion: typeof PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.version;
  readonly expected: PercentApplicationsControlDomainState;
  readonly projections: readonly PercentApplicationsRateProjection[];
  readonly request: PercentApplicationsControlDomainRequest;
  readonly requested: PercentApplicationsControlDomainState;
};

export type PercentApplicationsControlDrift = {
  readonly expected: number | string;
  readonly key: keyof PercentApplicationsControlDomainState;
  readonly observed: number | string;
};

export type PercentApplicationsControlTransitionReceipt =
  PercentApplicationsControlTransitionPlan & {
    readonly drift: readonly PercentApplicationsControlDrift[];
    readonly matchesExpected: boolean;
    readonly observed: PercentApplicationsControlDomainState;
  };

const MAX_QUANTITY = 1_000_000;

const RESET_STATE_FIELDS = deepFreeze({
  amount: 36,
  base: 240,
  inverseDirection: "increase" as const,
  mode: "find-part" as const,
  newValue: 120,
  rateBasisPoints: 1_500,
});

const VISIBLE_CONTROLS = deepFreeze({
  convert: ["rate-basis-points"],
  decrease: ["base", "rate-basis-points"],
  discount: ["base", "rate-basis-points"],
  increase: ["base", "rate-basis-points"],
  inverse: ["new-value", "rate-basis-points", "inverse-direction"],
  "find-part": ["base", "rate-basis-points"],
  "find-whole": ["amount", "rate-basis-points"],
} satisfies Record<PercentApplicationsMode, PercentApplicationsVisibleControlId[]>);

const STATE_KEYS = [
  "amount",
  "base",
  "inverseDirection",
  "labId",
  "mode",
  "newValue",
  "rateBasisPoints",
] as const satisfies readonly (keyof PercentApplicationsControlDomainState)[];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function stateSnapshot(
  state: PercentApplicationsControlDomainState,
): PercentApplicationsControlDomainState {
  return deepFreeze({
    amount: state.amount,
    base: state.base,
    inverseDirection: state.inverseDirection,
    labId: state.labId,
    mode: state.mode,
    newValue: state.newValue,
    rateBasisPoints: state.rateBasisPoints,
  });
}

function isLabId(value: unknown): value is PercentApplicationsLabId {
  return (PERCENT_APPLICATIONS_LAB_IDS as readonly unknown[]).includes(value);
}

function isMode(value: unknown): value is PercentApplicationsMode {
  return (PERCENT_APPLICATIONS_MODES as readonly unknown[]).includes(value);
}

function isDirection(value: unknown): value is PercentChangeDirection {
  return value === "decrease" || value === "increase";
}

function assertSafeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_CONTROL_VALUE",
      `${label} must be a finite safe integer.`,
    );
  }
}

function assertStateShape(state: PercentApplicationsControlDomainState) {
  if (!isLabId(state.labId)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_LAB_ID",
      `Unsupported percentage-application Lab ${String(state.labId)}.`,
    );
  }
  if (!isMode(state.mode)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_MODE",
      `Unsupported percentage-application mode ${String(state.mode)}.`,
    );
  }
  if (!isDirection(state.inverseDirection)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_DIRECTION",
      `Unsupported inverse direction ${String(state.inverseDirection)}.`,
    );
  }
  for (const [label, value] of [
    ["amount", state.amount],
    ["base", state.base],
    ["newValue", state.newValue],
    ["rateBasisPoints", state.rateBasisPoints],
  ] as const) {
    assertSafeInteger(value, label);
  }
}

function assertValidState(state: PercentApplicationsControlDomainState) {
  assertStateShape(state);
  for (const [label, value] of [
    ["amount", state.amount],
    ["base", state.base],
    ["newValue", state.newValue],
  ] as const) {
    if (value < 0 || value > MAX_QUANTITY) {
      throw new PercentApplicationsControlDomainError(
        "INVALID_STATE",
        `${label} must be between 0 and ${MAX_QUANTITY}.`,
      );
    }
  }
  const rate = percentApplicationsControlContractFor(
    state.mode,
    state.inverseDirection,
  ).rate;
  if (
    state.rateBasisPoints < rate.min ||
    state.rateBasisPoints > rate.max
  ) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_STATE",
      `rateBasisPoints must be between ${rate.min} and ${rate.max} for ${state.mode}.`,
    );
  }
}

function projectionReason(
  mode: PercentApplicationsMode,
  direction: PercentChangeDirection,
  projection: "clamp-max" | "clamp-min",
): PercentApplicationsRateProjection["reason"] {
  if (projection === "clamp-min") {
    return "find-whole-rate-must-be-positive";
  }
  if (mode === "discount") {
    return "discount-rate-cannot-exceed-100-percent";
  }
  if (mode === "decrease") {
    return "decrease-rate-cannot-exceed-100-percent";
  }
  if (mode === "inverse" && direction === "decrease") {
    return "inverse-decrease-must-remain-below-100-percent";
  }
  throw new PercentApplicationsControlDomainError(
    "INVALID_STATE",
    "A rate projection was requested without a documented dependent domain.",
  );
}

export function percentApplicationsControlContractFor(
  mode: PercentApplicationsMode,
  inverseDirection: PercentChangeDirection,
) {
  if (!isMode(mode)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_MODE",
      `Unsupported percentage-application mode ${String(mode)}.`,
    );
  }
  if (!isDirection(inverseDirection)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_DIRECTION",
      `Unsupported inverse direction ${String(inverseDirection)}.`,
    );
  }
  const min = mode === "find-whole" ? 1 : 0;
  const max =
    mode === "decrease" || mode === "discount"
      ? 10_000
      : mode === "inverse" && inverseDirection === "decrease"
        ? 9_999
        : 50_000;
  return deepFreeze({
    rate: { max, min, step: 1 },
    requiredControls: [...VISIBLE_CONTROLS[mode]],
    visibleControls: [...VISIBLE_CONTROLS[mode]],
  } as const);
}

export function createPercentApplicationsControlDomainState(
  labId: PercentApplicationsLabId,
): PercentApplicationsControlDomainState {
  if (!isLabId(labId)) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_LAB_ID",
      `Unsupported percentage-application Lab ${String(labId)}.`,
    );
  }
  return stateSnapshot({ ...RESET_STATE_FIELDS, labId });
}

function projectControllerRate(
  requested: PercentApplicationsControlDomainState,
) {
  const { max, min } = percentApplicationsControlContractFor(
    requested.mode,
    requested.inverseDirection,
  ).rate;
  if (requested.rateBasisPoints > max) {
    const projection: PercentApplicationsRateProjection = {
      controlId: "rate-basis-points",
      from: requested.rateBasisPoints,
      projection: "clamp-max",
      reason: projectionReason(
        requested.mode,
        requested.inverseDirection,
        "clamp-max",
      ),
      to: max,
    };
    return {
      expected: stateSnapshot({ ...requested, rateBasisPoints: max }),
      projections: [projection],
    };
  }
  if (requested.rateBasisPoints < min) {
    const projection: PercentApplicationsRateProjection = {
      controlId: "rate-basis-points",
      from: requested.rateBasisPoints,
      projection: "clamp-min",
      reason: projectionReason(
        requested.mode,
        requested.inverseDirection,
        "clamp-min",
      ),
      to: min,
    };
    return {
      expected: stateSnapshot({ ...requested, rateBasisPoints: min }),
      projections: [projection],
    };
  }
  return { expected: stateSnapshot(requested), projections: [] };
}

function requestedNumericState(
  current: PercentApplicationsControlDomainState,
  controlId: PercentApplicationsNumericControlId,
  value: number,
) {
  assertSafeInteger(value, controlId);
  const visible = percentApplicationsControlContractFor(
    current.mode,
    current.inverseDirection,
  ).visibleControls as readonly PercentApplicationsVisibleControlId[];
  if (!visible.includes(controlId)) {
    throw new PercentApplicationsControlDomainError(
      "CONTROL_NOT_VISIBLE",
      `${controlId} is not visible in ${current.mode} mode.`,
    );
  }
  if (controlId === "rate-basis-points") {
    const { max, min } = percentApplicationsControlContractFor(
      current.mode,
      current.inverseDirection,
    ).rate;
    if (value < min || value > max) {
      throw new PercentApplicationsControlDomainError(
        "DIRECT_CONTROL_OUT_OF_RANGE",
        `A direct rate request must remain between ${min} and ${max}.`,
      );
    }
    return stateSnapshot({ ...current, rateBasisPoints: value });
  }
  if (value < 0 || value > MAX_QUANTITY) {
    throw new PercentApplicationsControlDomainError(
      "DIRECT_CONTROL_OUT_OF_RANGE",
      `${controlId} must remain between 0 and ${MAX_QUANTITY}.`,
    );
  }
  if (controlId === "amount") {
    return stateSnapshot({ ...current, amount: value });
  }
  if (controlId === "base") {
    return stateSnapshot({ ...current, base: value });
  }
  return stateSnapshot({ ...current, newValue: value });
}

export function planPercentApplicationsControlTransition(
  rawCurrent: PercentApplicationsControlDomainState,
  rawRequest: PercentApplicationsControlDomainRequest,
): PercentApplicationsControlTransitionPlan {
  assertValidState(rawCurrent);
  const current = stateSnapshot(rawCurrent);
  const request = deepFreeze({ ...rawRequest });
  let requested: PercentApplicationsControlDomainState;
  let expected: PercentApplicationsControlDomainState;
  let projections: readonly PercentApplicationsRateProjection[] = [];

  if (request.kind === "reset") {
    requested = createPercentApplicationsControlDomainState(current.labId);
    expected = requested;
  } else if (request.kind === "control") {
    requested = requestedNumericState(
      current,
      request.controlId,
      request.value,
    );
    expected = requested;
  } else if (request.controllerId === "mode") {
    if (!isMode(request.value)) {
      throw new PercentApplicationsControlDomainError(
        "INVALID_CONTROLLER",
        `Mode controller cannot select ${String(request.value)}.`,
      );
    }
    requested = stateSnapshot({ ...current, mode: request.value });
    ({ expected, projections } = projectControllerRate(requested));
  } else {
    if (current.mode !== "inverse") {
      throw new PercentApplicationsControlDomainError(
        "CONTROL_NOT_VISIBLE",
        "inverse-direction is only visible in inverse mode.",
      );
    }
    if (!isDirection(request.value)) {
      throw new PercentApplicationsControlDomainError(
        "INVALID_CONTROLLER",
        `Inverse direction cannot select ${String(request.value)}.`,
      );
    }
    requested = stateSnapshot({
      ...current,
      inverseDirection: request.value,
    });
    ({ expected, projections } = projectControllerRate(requested));
  }

  assertValidState(expected);
  return deepFreeze({
    domainId: PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id,
    domainVersion: PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.version,
    expected: stateSnapshot(expected),
    projections: projections.map((projection) => ({ ...projection })),
    request,
    requested: stateSnapshot(requested),
  });
}

export function auditPercentApplicationsControlTransition(
  plan: PercentApplicationsControlTransitionPlan,
  rawObserved: PercentApplicationsControlDomainState,
): PercentApplicationsControlTransitionReceipt {
  assertStateShape(rawObserved);
  const observed = stateSnapshot(rawObserved);
  const drift: PercentApplicationsControlDrift[] = [];
  for (const key of STATE_KEYS) {
    if (plan.expected[key] !== observed[key]) {
      drift.push({
        expected: plan.expected[key],
        key,
        observed: observed[key],
      });
    }
  }
  return deepFreeze({
    domainId: plan.domainId,
    domainVersion: plan.domainVersion,
    drift,
    expected: stateSnapshot(plan.expected),
    matchesExpected: drift.length === 0,
    observed,
    projections: plan.projections.map((projection) => ({ ...projection })),
    request: { ...plan.request },
    requested: stateSnapshot(plan.requested),
  });
}
