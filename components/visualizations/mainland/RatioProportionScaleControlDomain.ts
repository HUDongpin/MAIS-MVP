import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODES,
  RATIO_PROPORTION_SCALE_UNITS,
  buildRatioProportionScaleState,
  resetRatioProportionScaleInput,
  type RatioProportionScaleMode,
  type RatioProportionScaleUnit,
} from "./RatioProportionScaleModel";

export const RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT = deepFreeze({
  id: "ratio-proportion-scale-controls-v1",
  labId: RATIO_PROPORTION_SCALE_LAB_ID,
  modes: [...RATIO_PROPORTION_SCALE_MODES],
  version: 1,
} as const);

export const RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT = deepFreeze({
  id: "ratio-proportion-scale-action-receipt-v1",
  labId: RATIO_PROPORTION_SCALE_LAB_ID,
  version: 1,
} as const);

export type RatioProportionScaleNumericControlId =
  | "drawing-length"
  | "ratio-a"
  | "ratio-b"
  | "scale-factor";

export type RatioProportionScaleUnitControlId =
  | "actual-unit"
  | "drawing-unit";

export type RatioProportionScaleVisibleControlId =
  | RatioProportionScaleNumericControlId
  | RatioProportionScaleUnitControlId
  | "mode";

export type RatioProportionScaleControlDomainState = Readonly<{
  actualUnit: RatioProportionScaleUnit;
  drawingLength: number;
  drawingUnit: RatioProportionScaleUnit;
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
  mode: RatioProportionScaleMode;
  ratioA: number;
  ratioB: number;
  scaleFactor: number;
}>;

export type RatioProportionScaleControlDomainRequest =
  | Readonly<{
      controllerId: "mode";
      kind: "controller";
      value: RatioProportionScaleMode;
    }>
  | Readonly<{
      controllerId: RatioProportionScaleUnitControlId;
      kind: "controller";
      value: RatioProportionScaleUnit;
    }>
  | Readonly<{
      controlId: RatioProportionScaleNumericControlId;
      kind: "control";
      value: number;
    }>
  | Readonly<{ kind: "reset" }>;

export type RatioProportionScaleActionRequest =
  | RatioProportionScaleControlDomainRequest
  | Readonly<{ kind: "initial" }>;

export type RatioProportionScaleControlProjection = never;

export type RatioProportionScaleControlTransitionPlan = Readonly<{
  domainId: string;
  domainVersion: 1;
  expected: RatioProportionScaleControlDomainState;
  projections: readonly RatioProportionScaleControlProjection[];
  request: RatioProportionScaleControlDomainRequest;
  requested: RatioProportionScaleControlDomainState;
}>;

export type RatioProportionScaleControlDrift = Readonly<{
  expected: number | string;
  key: keyof RatioProportionScaleControlDomainState;
  observed: number | string;
}>;

export type RatioProportionScaleControlTransitionReceipt =
  RatioProportionScaleControlTransitionPlan &
    Readonly<{
      drift: readonly RatioProportionScaleControlDrift[];
      matchesExpected: boolean;
      observed: RatioProportionScaleControlDomainState;
    }>;

type RatioProportionScaleActionReceiptBase = Readonly<{
  before: RatioProportionScaleControlDomainState;
  expected: RatioProportionScaleControlDomainState;
  observed: RatioProportionScaleControlDomainState;
  projections: readonly RatioProportionScaleControlProjection[];
  request: RatioProportionScaleActionRequest;
  requested: RatioProportionScaleControlDomainState;
  version: typeof RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id;
}>;

export type RatioProportionScaleAcceptedActionReceipt =
  RatioProportionScaleActionReceiptBase &
    Readonly<{
      rejection: null;
      status: "accepted";
    }>;

export type RatioProportionScaleRejectedActionReceipt =
  RatioProportionScaleActionReceiptBase &
    Readonly<{
      rejection: RatioProportionScaleControlDomainErrorCode;
      status: "rejected";
    }>;

export type RatioProportionScaleActionReceipt =
  | RatioProportionScaleAcceptedActionReceipt
  | RatioProportionScaleRejectedActionReceipt;

export type RatioProportionScaleControlDomainErrorCode =
  | "CONTROL_NOT_VISIBLE"
  | "DIRECT_CONTROL_OUT_OF_RANGE"
  | "INVALID_CONTROL_VALUE"
  | "INVALID_CONTROLLER"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_STATE"
  | "INVALID_UNIT";

export class RatioProportionScaleControlDomainError extends RangeError {
  readonly code: RatioProportionScaleControlDomainErrorCode;

  constructor(
    code: RatioProportionScaleControlDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RatioProportionScaleControlDomainError";
    this.code = code;
  }
}

type NumericControlDomain = Readonly<{
  kind: "integer";
  max: 10_000;
  min: 1;
  step: 1;
}>;

type UnitControlDomain = Readonly<{
  kind: "enum";
  options: readonly RatioProportionScaleUnit[];
}>;

export type RatioProportionScaleControlDomainDescriptor = Readonly<{
  dependencies: readonly never[];
  domainId:
    | "ratio-proportion-scale-direct-proportion-v1"
    | "ratio-proportion-scale-equivalent-ratios-v1"
    | "ratio-proportion-scale-inverse-proportion-v1"
    | "ratio-proportion-scale-scale-drawing-v1";
  domainVersion: 1;
  independence: "all-visible-controls-use-static-model-safe-domains";
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
  mode: RatioProportionScaleMode;
  numericDomains: Readonly<
    Partial<Record<RatioProportionScaleNumericControlId, NumericControlDomain>>
  >;
  requiredControls: readonly RatioProportionScaleVisibleControlId[];
  unitDomains: Readonly<
    Partial<Record<RatioProportionScaleUnitControlId, UnitControlDomain>>
  >;
  visibleControls: readonly RatioProportionScaleVisibleControlId[];
}>;

const MAX_CONTROL_VALUE = 10_000;

const NUMERIC_DOMAIN = deepFreeze({
  kind: "integer",
  max: MAX_CONTROL_VALUE,
  min: 1,
  step: 1,
} as const);

const UNIT_DOMAIN = deepFreeze({
  kind: "enum",
  options: [...RATIO_PROPORTION_SCALE_UNITS],
} as const);

const RATIO_NUMERIC_DOMAINS = deepFreeze({
  "ratio-a": NUMERIC_DOMAIN,
  "ratio-b": NUMERIC_DOMAIN,
  "scale-factor": NUMERIC_DOMAIN,
});

const SCALE_NUMERIC_DOMAINS = deepFreeze({
  "drawing-length": NUMERIC_DOMAIN,
  "scale-factor": NUMERIC_DOMAIN,
});

const SCALE_UNIT_DOMAINS = deepFreeze({
  "actual-unit": UNIT_DOMAIN,
  "drawing-unit": UNIT_DOMAIN,
});

const RATIO_VISIBLE_CONTROLS = deepFreeze([
  "mode",
  "ratio-a",
  "ratio-b",
  "scale-factor",
] as const);

const SCALE_VISIBLE_CONTROLS = deepFreeze([
  "mode",
  "scale-factor",
  "drawing-length",
  "drawing-unit",
  "actual-unit",
] as const);

const DOMAIN_IDS = deepFreeze({
  "direct-proportion": "ratio-proportion-scale-direct-proportion-v1",
  "equivalent-ratios": "ratio-proportion-scale-equivalent-ratios-v1",
  "inverse-proportion": "ratio-proportion-scale-inverse-proportion-v1",
  "scale-drawing": "ratio-proportion-scale-scale-drawing-v1",
} as const);

const DESCRIPTORS = deepFreeze({
  "direct-proportion": {
    dependencies: [],
    domainId: DOMAIN_IDS["direct-proportion"],
    domainVersion: 1,
    independence: "all-visible-controls-use-static-model-safe-domains",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "direct-proportion",
    numericDomains: RATIO_NUMERIC_DOMAINS,
    requiredControls: RATIO_VISIBLE_CONTROLS,
    unitDomains: {},
    visibleControls: RATIO_VISIBLE_CONTROLS,
  },
  "equivalent-ratios": {
    dependencies: [],
    domainId: DOMAIN_IDS["equivalent-ratios"],
    domainVersion: 1,
    independence: "all-visible-controls-use-static-model-safe-domains",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "equivalent-ratios",
    numericDomains: RATIO_NUMERIC_DOMAINS,
    requiredControls: RATIO_VISIBLE_CONTROLS,
    unitDomains: {},
    visibleControls: RATIO_VISIBLE_CONTROLS,
  },
  "inverse-proportion": {
    dependencies: [],
    domainId: DOMAIN_IDS["inverse-proportion"],
    domainVersion: 1,
    independence: "all-visible-controls-use-static-model-safe-domains",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "inverse-proportion",
    numericDomains: RATIO_NUMERIC_DOMAINS,
    requiredControls: RATIO_VISIBLE_CONTROLS,
    unitDomains: {},
    visibleControls: RATIO_VISIBLE_CONTROLS,
  },
  "scale-drawing": {
    dependencies: [],
    domainId: DOMAIN_IDS["scale-drawing"],
    domainVersion: 1,
    independence: "all-visible-controls-use-static-model-safe-domains",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "scale-drawing",
    numericDomains: SCALE_NUMERIC_DOMAINS,
    requiredControls: SCALE_VISIBLE_CONTROLS,
    unitDomains: SCALE_UNIT_DOMAINS,
    visibleControls: SCALE_VISIBLE_CONTROLS,
  },
} satisfies Record<
  RatioProportionScaleMode,
  RatioProportionScaleControlDomainDescriptor
>);

const STATE_KEYS = [
  "labId",
  "mode",
  "ratioA",
  "ratioB",
  "scaleFactor",
  "drawingLength",
  "drawingUnit",
  "actualUnit",
] as const satisfies readonly (keyof RatioProportionScaleControlDomainState)[];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function isMode(value: unknown): value is RatioProportionScaleMode {
  return (RATIO_PROPORTION_SCALE_MODES as readonly unknown[]).includes(value);
}

function isUnit(value: unknown): value is RatioProportionScaleUnit {
  return (RATIO_PROPORTION_SCALE_UNITS as readonly unknown[]).includes(value);
}

function stateSnapshot(
  state: RatioProportionScaleControlDomainState,
): RatioProportionScaleControlDomainState {
  return deepFreeze({
    actualUnit: state.actualUnit,
    drawingLength: state.drawingLength,
    drawingUnit: state.drawingUnit,
    labId: state.labId,
    mode: state.mode,
    ratioA: state.ratioA,
    ratioB: state.ratioB,
    scaleFactor: state.scaleFactor,
  });
}

function requestSnapshot(
  request: RatioProportionScaleControlDomainRequest,
): RatioProportionScaleControlDomainRequest {
  if (request.kind === "reset") return deepFreeze({ kind: "reset" });
  if (request.kind === "control") {
    return deepFreeze({
      controlId: request.controlId,
      kind: "control",
      value: request.value,
    });
  }
  return deepFreeze({
    controllerId: request.controllerId,
    kind: "controller",
    value: request.value,
  } as RatioProportionScaleControlDomainRequest);
}

function actionRequestSnapshot(
  request: RatioProportionScaleActionRequest,
): RatioProportionScaleActionRequest {
  if (request.kind === "initial") return deepFreeze({ kind: "initial" });
  return requestSnapshot(request);
}

function assertLabId(value: unknown): asserts value is typeof RATIO_PROPORTION_SCALE_LAB_ID {
  if (value !== RATIO_PROPORTION_SCALE_LAB_ID) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_LAB_ID",
      `Unsupported ratio/proportion/scale Lab ${String(value)}.`,
    );
  }
}

function assertMode(value: unknown): asserts value is RatioProportionScaleMode {
  if (!isMode(value)) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_MODE",
      `Unsupported ratio/proportion/scale mode ${String(value)}.`,
    );
  }
}

function assertUnit(value: unknown): asserts value is RatioProportionScaleUnit {
  if (!isUnit(value)) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_UNIT",
      `Unsupported ratio/proportion/scale unit ${String(value)}.`,
    );
  }
}

function assertNumericShape(value: number, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_CONTROL_VALUE",
      `${label} must be a finite safe integer.`,
    );
  }
}

function assertNumericRange(
  value: number,
  label: string,
  errorCode: "DIRECT_CONTROL_OUT_OF_RANGE" | "INVALID_STATE",
) {
  assertNumericShape(value, label);
  if (value < 1 || value > MAX_CONTROL_VALUE) {
    throw new RatioProportionScaleControlDomainError(
      errorCode,
      `${label} must be between 1 and ${MAX_CONTROL_VALUE}.`,
    );
  }
}

function assertValidState(state: RatioProportionScaleControlDomainState) {
  if (state === null || typeof state !== "object") {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_STATE",
      "Ratio/proportion/scale control state must be an object.",
    );
  }
  assertLabId(state.labId);
  assertMode(state.mode);
  assertUnit(state.drawingUnit);
  assertUnit(state.actualUnit);
  for (const [label, value] of [
    ["ratioA", state.ratioA],
    ["ratioB", state.ratioB],
    ["scaleFactor", state.scaleFactor],
    ["drawingLength", state.drawingLength],
  ] as const) {
    assertNumericRange(value, label, "INVALID_STATE");
  }
  try {
    buildRatioProportionScaleState({
      actualUnit: state.actualUnit,
      drawingLength: state.drawingLength,
      drawingUnit: state.drawingUnit,
      labId: state.labId,
      mode: state.mode,
      ratioA: state.ratioA,
      ratioB: state.ratioB,
      scaleFactor: state.scaleFactor,
    });
  } catch (error) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_STATE",
      `Control state is outside the exact model domain: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function getRatioProportionScaleControlDomainDescriptor(
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID,
  mode: RatioProportionScaleMode,
): RatioProportionScaleControlDomainDescriptor {
  assertLabId(labId);
  assertMode(mode);
  return DESCRIPTORS[mode];
}

export function createRatioProportionScaleControlDomainState(
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID,
  mode: RatioProportionScaleMode = "equivalent-ratios",
): RatioProportionScaleControlDomainState {
  assertLabId(labId);
  assertMode(mode);
  const reset = resetRatioProportionScaleInput(mode);
  return stateSnapshot({
    actualUnit: reset.actualUnit,
    drawingLength: reset.drawingLength,
    drawingUnit: reset.drawingUnit,
    labId: reset.labId,
    mode: reset.mode,
    ratioA: reset.ratioA,
    ratioB: reset.ratioB,
    scaleFactor: reset.scaleFactor,
  });
}

function withNumericControl(
  current: RatioProportionScaleControlDomainState,
  controlId: RatioProportionScaleNumericControlId,
  value: number,
) {
  const descriptor = getRatioProportionScaleControlDomainDescriptor(
    current.labId,
    current.mode,
  );
  if (!descriptor.visibleControls.includes(controlId)) {
    throw new RatioProportionScaleControlDomainError(
      "CONTROL_NOT_VISIBLE",
      `${controlId} is not visible in ${current.mode} mode.`,
    );
  }
  assertNumericRange(value, controlId, "DIRECT_CONTROL_OUT_OF_RANGE");
  switch (controlId) {
    case "drawing-length":
      return stateSnapshot({ ...current, drawingLength: value });
    case "ratio-a":
      return stateSnapshot({ ...current, ratioA: value });
    case "ratio-b":
      return stateSnapshot({ ...current, ratioB: value });
    case "scale-factor":
      return stateSnapshot({ ...current, scaleFactor: value });
    default: {
      const exhaustive: never = controlId;
      throw new RatioProportionScaleControlDomainError(
        "INVALID_CONTROLLER",
        `Unsupported numeric control ${String(exhaustive)}.`,
      );
    }
  }
}

function withController(
  current: RatioProportionScaleControlDomainState,
  request: Extract<
    RatioProportionScaleControlDomainRequest,
    { kind: "controller" }
  >,
) {
  if (request.controllerId === "mode") {
    assertMode(request.value);
    return stateSnapshot({ ...current, mode: request.value });
  }
  if (current.mode !== "scale-drawing") {
    throw new RatioProportionScaleControlDomainError(
      "CONTROL_NOT_VISIBLE",
      `${request.controllerId} is only visible in scale-drawing mode.`,
    );
  }
  assertUnit(request.value);
  if (request.controllerId === "drawing-unit") {
    return stateSnapshot({ ...current, drawingUnit: request.value });
  }
  if (request.controllerId === "actual-unit") {
    return stateSnapshot({ ...current, actualUnit: request.value });
  }
  throw new RatioProportionScaleControlDomainError(
    "INVALID_CONTROLLER",
    `Unsupported controller ${String(request.controllerId)}.`,
  );
}

export function planRatioProportionScaleControlTransition(
  rawCurrent: RatioProportionScaleControlDomainState,
  rawRequest: RatioProportionScaleControlDomainRequest,
): RatioProportionScaleControlTransitionPlan {
  assertValidState(rawCurrent);
  const current = stateSnapshot(rawCurrent);
  const request = requestSnapshot(rawRequest);
  let requested: RatioProportionScaleControlDomainState;

  if (request.kind === "reset") {
    requested = createRatioProportionScaleControlDomainState(
      current.labId,
      current.mode,
    );
  } else if (request.kind === "control") {
    requested = withNumericControl(
      current,
      request.controlId,
      request.value,
    );
  } else {
    requested = withController(current, request);
  }

  assertValidState(requested);
  const expected = stateSnapshot(requested);
  const descriptor = getRatioProportionScaleControlDomainDescriptor(
    expected.labId,
    expected.mode,
  );
  return deepFreeze({
    domainId: descriptor.domainId,
    domainVersion: descriptor.domainVersion,
    expected,
    projections: [],
    request,
    requested: stateSnapshot(requested),
  });
}

export function auditRatioProportionScaleControlTransition(
  plan: RatioProportionScaleControlTransitionPlan,
  rawObserved: RatioProportionScaleControlDomainState,
): RatioProportionScaleControlTransitionReceipt {
  assertValidState(rawObserved);
  const observed = stateSnapshot(rawObserved);
  const drift: RatioProportionScaleControlDrift[] = [];
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
    projections: [],
    request: requestSnapshot(plan.request),
    requested: stateSnapshot(plan.requested),
  });
}

export function createRatioProportionScaleAcceptedActionReceipt(input: {
  before: RatioProportionScaleControlDomainState;
  expected: RatioProportionScaleControlDomainState;
  observed: RatioProportionScaleControlDomainState;
  projections: readonly RatioProportionScaleControlProjection[];
  request: RatioProportionScaleActionRequest;
  requested: RatioProportionScaleControlDomainState;
}): RatioProportionScaleAcceptedActionReceipt {
  assertValidState(input.before);
  assertValidState(input.requested);
  assertValidState(input.expected);
  assertValidState(input.observed);
  if (
    STATE_KEYS.some((key) => input.expected[key] !== input.observed[key])
  ) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_STATE",
      "Accepted action receipt observed state must exactly match expected state.",
    );
  }
  if (input.projections.length !== 0) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_STATE",
      "Ratio/proportion/scale actions do not permit hidden projections.",
    );
  }
  return deepFreeze({
    before: stateSnapshot(input.before),
    expected: stateSnapshot(input.expected),
    observed: stateSnapshot(input.observed),
    projections: [] as const,
    rejection: null,
    request: actionRequestSnapshot(input.request),
    requested: stateSnapshot(input.requested),
    status: "accepted" as const,
    version: RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id,
  });
}

export function createRatioProportionScaleRejectedActionReceipt(input: {
  before: RatioProportionScaleControlDomainState;
  rejection: RatioProportionScaleControlDomainErrorCode;
  request: RatioProportionScaleActionRequest;
}): RatioProportionScaleRejectedActionReceipt {
  assertValidState(input.before);
  const before = stateSnapshot(input.before);
  return deepFreeze({
    before,
    expected: before,
    observed: before,
    projections: [] as const,
    rejection: input.rejection,
    request: actionRequestSnapshot(input.request),
    requested: before,
    status: "rejected" as const,
    version: RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id,
  });
}
