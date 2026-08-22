import {
  SIGNED_REAL_NUMBER_LINE_DOMAIN,
  SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  type SignedRealNumberLineExactMode,
  type SignedRealNumberLineLabId,
} from "./SignedRealNumberLineModel";

export const SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT = Object.freeze({
  family: "signed-real-number-line" as const,
  groupId: "G03" as const,
  version: "signed-real-number-line-control-domain-v1" as const,
});

export const SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT = Object.freeze({
  family: "signed-real-number-line" as const,
  groupId: "G03" as const,
  version: "signed-real-number-line-action-receipt-v1" as const,
});

export type SignedRealNumberLineJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly SignedRealNumberLineJsonValue[]
  | SignedRealNumberLineJsonObject;

export type SignedRealNumberLineJsonObject = {
  readonly [key: string]: SignedRealNumberLineJsonValue;
};

export type SignedRealNumberLineActionRequest =
  | {
      kind: "control";
      control: string;
      value: string | number;
    }
  | {
      kind: "controller";
      controller: string;
      value: string | number;
    }
  | {
      kind: "initial" | "reset";
      topicId: string;
    };

export type SignedRealNumberLineActionSnapshot = {
  labId: string;
  mode: string;
  configuredState: string;
  input: SignedRealNumberLineJsonObject;
  controlState: SignedRealNumberLineJsonObject;
  pendingRequest: SignedRealNumberLineActionRequest | null;
};

type SignedRealNumberLineActionReceiptBase = {
  version: typeof SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT.version;
  request: SignedRealNumberLineActionRequest;
  before: SignedRealNumberLineActionSnapshot;
  requested: SignedRealNumberLineActionSnapshot;
  expected: SignedRealNumberLineActionSnapshot;
  observed: SignedRealNumberLineActionSnapshot;
  projections: readonly SignedRealNumberLineControlProjection[];
};

export type SignedRealNumberLineAcceptedActionReceipt =
  SignedRealNumberLineActionReceiptBase & {
    status: "accepted";
    rejection: null;
  };

export type SignedRealNumberLineRejectedActionReceipt =
  SignedRealNumberLineActionReceiptBase & {
    status: "rejected";
    rejection: SignedRealNumberLineControlDomainErrorCode;
  };

export type SignedRealNumberLineActionReceipt =
  | SignedRealNumberLineAcceptedActionReceipt
  | SignedRealNumberLineRejectedActionReceipt;

export type SignedRealNumberLineControlNumberKind =
  | "rational"
  | "radical"
  | "quadratic-surd";

export type SignedRealNumberLineControlName =
  | "mode"
  | "number-kind"
  | "value-sign"
  | "value-radicand"
  | "right-rational-numerator"
  | "right-rational-denominator"
  | "right-surd-coefficient-numerator"
  | "right-surd-coefficient-denominator"
  | "right-surd-radicand";

export type SignedRealNumberLineControlState = {
  labId: SignedRealNumberLineLabId;
  mode: SignedRealNumberLineExactMode;
  numberKind: SignedRealNumberLineControlNumberKind;
  valueSign: -1 | 1;
  valueRadicand: number;
  rightRationalNumerator: number;
  rightRationalDenominator: number;
  rightSurdCoefficientNumerator: number;
  rightSurdCoefficientDenominator: number;
  rightSurdRadicand: number;
};

export type SignedRealNumberLineControlRequest =
  | { control: "mode"; value: SignedRealNumberLineExactMode }
  | { control: "number-kind"; value: SignedRealNumberLineControlNumberKind }
  | { control: "value-sign"; value: -1 | 1 }
  | {
      control:
        | "value-radicand"
        | "right-rational-numerator"
        | "right-rational-denominator"
        | "right-surd-coefficient-numerator"
        | "right-surd-coefficient-denominator"
        | "right-surd-radicand";
      value: number;
    };

export type SignedRealNumberLineControlProjection = {
  affectedControl: SignedRealNumberLineControlName;
  previousValue: string | number;
  expectedValue: string | number;
  projection:
    | "canonical-zero-sign"
    | "exclude-zero-divisor"
    | "mode-number-kind";
  reason:
    | "zero-has-no-negative-sign"
    | "division-requires-nonzero-rational-divisor"
    | "division-requires-nonzero-surd-coefficient"
    | "division-requires-nonzero-surd-radicand"
    | "mode-requires-number-kind";
};

export type SignedRealNumberLineControlDomainDescriptor = {
  domainId: string;
  labId: SignedRealNumberLineLabId;
  mode: SignedRealNumberLineExactMode;
  allowedNumberKinds: readonly SignedRealNumberLineControlNumberKind[];
  dependencies: readonly {
    trigger: SignedRealNumberLineControlName;
    affects: readonly SignedRealNumberLineControlName[];
    projection: SignedRealNumberLineControlProjection["projection"];
  }[];
  divisorKind: "none" | "rational" | "quadratic-surd";
};

export type SignedRealNumberLineControlTransitionPlan = {
  version: typeof SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT.version;
  descriptorId: string;
  before: SignedRealNumberLineControlState;
  requested: SignedRealNumberLineControlRequest;
  expected: SignedRealNumberLineControlState;
  projections: readonly SignedRealNumberLineControlProjection[];
  expectedStateKey: string;
};

export type SignedRealNumberLineControlTransitionReceipt =
  SignedRealNumberLineControlTransitionPlan & {
    observed: SignedRealNumberLineControlState;
    observedStateKey: string;
    status: "pass";
  };

export type SignedRealNumberLineControlDomainErrorCode =
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "MODE_NOT_ALLOWED_FOR_TOPIC"
  | "NUMBER_KIND_NOT_ALLOWED"
  | "CONTROL_VALUE_OUT_OF_DOMAIN"
  | "DIRECT_REQUEST_VIOLATES_DOMAIN"
  | "UNKNOWN_CONTROL"
  | "INVALID_CONTROL_STATE"
  | "OBSERVED_STATE_MISMATCH";

export class SignedRealNumberLineControlDomainError extends RangeError {
  readonly code: SignedRealNumberLineControlDomainErrorCode;

  constructor(
    code: SignedRealNumberLineControlDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SignedRealNumberLineControlDomainError";
    this.code = code;
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

function cloneJsonSafe(
  value: unknown,
  path: string,
): SignedRealNumberLineJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new SignedRealNumberLineControlDomainError(
        "INVALID_CONTROL_STATE",
        `${path} must contain only finite canonical numbers.`,
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((child, index) =>
      cloneJsonSafe(child, `${path}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SignedRealNumberLineControlDomainError(
        "INVALID_CONTROL_STATE",
        `${path} must be a plain JSON object.`,
      );
    }
    const result: Record<string, SignedRealNumberLineJsonValue> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = cloneJsonSafe(child, `${path}.${key}`);
    }
    return result;
  }
  throw new SignedRealNumberLineControlDomainError(
    "INVALID_CONTROL_STATE",
    `${path} is not JSON-safe.`,
  );
}

function stableJson(value: SignedRealNumberLineJsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((child) => stableJson(child)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableJson(
          (value as { readonly [key: string]: SignedRealNumberLineJsonValue })[
            key
          ],
        )}`,
    )
    .join(",")}}`;
}

function normalizeActionRequest(
  requestInput: SignedRealNumberLineActionRequest,
): SignedRealNumberLineActionRequest {
  const request = cloneJsonSafe(
    requestInput,
    "action request",
  ) as SignedRealNumberLineActionRequest;
  if (
    request.kind === "control" &&
    (!request.control ||
      (typeof request.value !== "string" &&
        typeof request.value !== "number"))
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "UNKNOWN_CONTROL",
      "A control action requires an exact control and value.",
    );
  }
  if (
    request.kind === "controller" &&
    (!request.controller ||
      (typeof request.value !== "string" &&
        typeof request.value !== "number"))
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "UNKNOWN_CONTROL",
      "A controller action requires an exact controller and value.",
    );
  }
  if (
    (request.kind === "initial" || request.kind === "reset") &&
    !request.topicId
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_LAB_ID",
      "An initial or reset action requires an exact topic ID.",
    );
  }
  return request;
}

function normalizeActionSnapshot(
  snapshotInput: SignedRealNumberLineActionSnapshot,
  path: string,
): SignedRealNumberLineActionSnapshot {
  const snapshot = cloneJsonSafe(
    snapshotInput,
    path,
  ) as SignedRealNumberLineActionSnapshot;
  if (
    !snapshot.labId ||
    !snapshot.mode ||
    !snapshot.configuredState ||
    !snapshot.input ||
    !snapshot.controlState
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_CONTROL_STATE",
      `${path} is missing a full learner-state field.`,
    );
  }
  return snapshot;
}

function normalizeActionProjections(
  projectionsInput: readonly SignedRealNumberLineControlProjection[],
): readonly SignedRealNumberLineControlProjection[] {
  return cloneJsonSafe(
    projectionsInput,
    "action projections",
  ) as unknown as readonly SignedRealNumberLineControlProjection[];
}

function assertRequestedSnapshotBindsRequest(
  requested: SignedRealNumberLineActionSnapshot,
  request: SignedRealNumberLineActionRequest,
) {
  if (
    requested.pendingRequest === null ||
    stableJson(requested.pendingRequest) !== stableJson(request)
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "OBSERVED_STATE_MISMATCH",
      "Requested state does not bind the exact learner action.",
    );
  }
}

export function createSignedRealNumberLineAcceptedActionReceipt(input: {
  request: SignedRealNumberLineActionRequest;
  before: SignedRealNumberLineActionSnapshot;
  requested: SignedRealNumberLineActionSnapshot;
  expected: SignedRealNumberLineActionSnapshot;
  observed: SignedRealNumberLineActionSnapshot;
  projections: readonly SignedRealNumberLineControlProjection[];
}): SignedRealNumberLineAcceptedActionReceipt {
  const request = normalizeActionRequest(input.request);
  const before = normalizeActionSnapshot(input.before, "before state");
  const requested = normalizeActionSnapshot(input.requested, "requested state");
  const expected = normalizeActionSnapshot(input.expected, "expected state");
  const observed = normalizeActionSnapshot(input.observed, "observed state");
  assertRequestedSnapshotBindsRequest(requested, request);
  if (stableJson(observed) !== stableJson(expected)) {
    throw new SignedRealNumberLineControlDomainError(
      "OBSERVED_STATE_MISMATCH",
      "The observed state does not exactly match expected state.",
    );
  }
  return deepFreeze({
    version: SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT.version,
    status: "accepted" as const,
    rejection: null,
    request,
    before,
    requested,
    expected,
    observed,
    projections: normalizeActionProjections(input.projections),
  });
}

export function createSignedRealNumberLineRejectedActionReceipt(input: {
  request: SignedRealNumberLineActionRequest;
  before: SignedRealNumberLineActionSnapshot;
  requested: SignedRealNumberLineActionSnapshot;
  rejection: SignedRealNumberLineControlDomainErrorCode;
}): SignedRealNumberLineRejectedActionReceipt {
  const request = normalizeActionRequest(input.request);
  const before = normalizeActionSnapshot(input.before, "before state");
  const requested = normalizeActionSnapshot(input.requested, "requested state");
  assertRequestedSnapshotBindsRequest(requested, request);
  return deepFreeze({
    version: SIGNED_REAL_NUMBER_LINE_ACTION_RECEIPT_CONTRACT.version,
    status: "rejected" as const,
    rejection: input.rejection,
    request,
    before,
    requested,
    expected: before,
    observed: before,
    projections: [] as const,
  });
}

function allowedNumberKinds(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
): readonly SignedRealNumberLineControlNumberKind[] {
  const kind = SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId].kind;
  if (kind === "rational") return ["rational"];
  if (kind === "quadratic-radical") return ["quadratic-surd"];
  if (mode === "radical" || mode === "square-root" || mode === "cube-root") {
    return ["radical"];
  }
  return ["rational", "radical"];
}

function descriptorFor(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
): SignedRealNumberLineControlDomainDescriptor {
  const dependencies: Array<
    SignedRealNumberLineControlDomainDescriptor["dependencies"][number]
  > = [
    {
      trigger: "value-radicand",
      affects: ["value-sign"],
      projection: "canonical-zero-sign",
    },
  ];
  if (mode === "divide") {
    dependencies.push({
      trigger: "mode",
      affects: ["right-rational-numerator"],
      projection: "exclude-zero-divisor",
    });
  }
  if (mode === "radical-divide") {
    dependencies.push({
      trigger: "mode",
      affects: [
        "right-surd-coefficient-numerator",
        "right-surd-radicand",
      ],
      projection: "exclude-zero-divisor",
    });
  }
  return {
    domainId: `signed-real-number-line:${labId}:${mode}:v1`,
    labId,
    mode,
    allowedNumberKinds: allowedNumberKinds(labId, mode),
    dependencies,
    divisorKind:
      mode === "divide"
        ? "rational"
        : mode === "radical-divide"
          ? "quadratic-surd"
          : "none",
  };
}

function buildDescriptors() {
  const result = {} as Record<
    SignedRealNumberLineLabId,
    Partial<
      Record<
        SignedRealNumberLineExactMode,
        SignedRealNumberLineControlDomainDescriptor
      >
    >
  >;
  for (const labId of SIGNED_REAL_NUMBER_LINE_LAB_IDS) {
    const byMode: Partial<
      Record<
        SignedRealNumberLineExactMode,
        SignedRealNumberLineControlDomainDescriptor
      >
    > = {};
    for (const mode of SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId]
      .allowedModes) {
      byMode[mode] = descriptorFor(labId, mode);
    }
    result[labId] = byMode;
  }
  return deepFreeze(result);
}

export const SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS =
  buildDescriptors();

function validateLabId(value: unknown): SignedRealNumberLineLabId {
  if (
    typeof value !== "string" ||
    !SIGNED_REAL_NUMBER_LINE_LAB_IDS.includes(
      value as SignedRealNumberLineLabId,
    )
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_LAB_ID",
      `Unknown G03 lab ID: ${String(value)}.`,
    );
  }
  return value as SignedRealNumberLineLabId;
}

function validateMode(value: unknown): SignedRealNumberLineExactMode {
  if (typeof value !== "string") {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_MODE",
      `Invalid G03 mode: ${String(value)}.`,
    );
  }
  return value as SignedRealNumberLineExactMode;
}

export function getSignedRealNumberLineControlDomainDescriptor(
  labIdInput: SignedRealNumberLineLabId,
  modeInput: SignedRealNumberLineExactMode,
): SignedRealNumberLineControlDomainDescriptor {
  const labId = validateLabId(labIdInput);
  const mode = validateMode(modeInput);
  const descriptor =
    SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS[labId][mode];
  if (!descriptor) {
    throw new SignedRealNumberLineControlDomainError(
      "MODE_NOT_ALLOWED_FOR_TOPIC",
      `${mode} is not allowed for ${labId}.`,
    );
  }
  return descriptor;
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function integerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  field: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "CONTROL_VALUE_OUT_OF_DOMAIN",
      `${field} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return canonicalNumber(value);
}

function validateNumberKind(
  value: unknown,
): SignedRealNumberLineControlNumberKind {
  if (
    value !== "rational" &&
    value !== "radical" &&
    value !== "quadratic-surd"
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "NUMBER_KIND_NOT_ALLOWED",
      `Unsupported number kind: ${String(value)}.`,
    );
  }
  return value;
}

function stateKey(state: SignedRealNumberLineControlState): string {
  return [
    SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT.version,
    `lab=${state.labId}`,
    `mode=${state.mode}`,
    `kind=${state.numberKind}`,
    `sign=${state.valueSign}`,
    `radicand=${state.valueRadicand}`,
    `rr=${state.rightRationalNumerator}/${state.rightRationalDenominator}`,
    `rs=${state.rightSurdCoefficientNumerator}/${state.rightSurdCoefficientDenominator}*sqrt(${state.rightSurdRadicand})`,
  ].join("|");
}

function validateState(
  state: SignedRealNumberLineControlState,
): SignedRealNumberLineControlState {
  const descriptor = getSignedRealNumberLineControlDomainDescriptor(
    state.labId,
    state.mode,
  );
  const numberKind = validateNumberKind(state.numberKind);
  if (!descriptor.allowedNumberKinds.includes(numberKind)) {
    throw new SignedRealNumberLineControlDomainError(
      "NUMBER_KIND_NOT_ALLOWED",
      `${numberKind} is not allowed in ${descriptor.domainId}.`,
    );
  }
  if (state.valueSign !== -1 && state.valueSign !== 1) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_CONTROL_STATE",
      "valueSign must be -1 or 1.",
    );
  }
  const valueRadicand = integerInRange(
    state.valueRadicand,
    0,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "valueRadicand",
  );
  if (valueRadicand === 0 && state.valueSign !== 1) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_CONTROL_STATE",
      "Zero must use canonical positive sign state.",
    );
  }
  const rightRationalNumerator = integerInRange(
    state.rightRationalNumerator,
    -SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "rightRationalNumerator",
  );
  const rightRationalDenominator = integerInRange(
    state.rightRationalDenominator,
    1,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "rightRationalDenominator",
  );
  const rightSurdCoefficientNumerator = integerInRange(
    state.rightSurdCoefficientNumerator,
    -SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "rightSurdCoefficientNumerator",
  );
  const rightSurdCoefficientDenominator = integerInRange(
    state.rightSurdCoefficientDenominator,
    1,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "rightSurdCoefficientDenominator",
  );
  const rightSurdRadicand = integerInRange(
    state.rightSurdRadicand,
    0,
    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
    "rightSurdRadicand",
  );
  if (state.mode === "divide" && rightRationalNumerator === 0) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_CONTROL_STATE",
      "Rational division state requires a nonzero divisor numerator.",
    );
  }
  if (
    state.mode === "radical-divide" &&
    (rightSurdCoefficientNumerator === 0 || rightSurdRadicand === 0)
  ) {
    throw new SignedRealNumberLineControlDomainError(
      "INVALID_CONTROL_STATE",
      "Quadratic-radical division state requires a nonzero divisor.",
    );
  }
  return {
    labId: state.labId,
    mode: state.mode,
    numberKind,
    valueSign: state.valueSign,
    valueRadicand,
    rightRationalNumerator,
    rightRationalDenominator,
    rightSurdCoefficientNumerator,
    rightSurdCoefficientDenominator,
    rightSurdRadicand,
  };
}

export function createSignedRealNumberLineControlState(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
  overrides: Partial<SignedRealNumberLineControlState> = {},
): SignedRealNumberLineControlState {
  const descriptor = getSignedRealNumberLineControlDomainDescriptor(labId, mode);
  const state = validateState({
    numberKind: descriptor.allowedNumberKinds[0],
    valueSign: 1,
    valueRadicand: 2,
    rightRationalNumerator: 1,
    rightRationalDenominator: 1,
    rightSurdCoefficientNumerator: 1,
    rightSurdCoefficientDenominator: 1,
    rightSurdRadicand: 2,
    ...overrides,
    labId,
    mode,
  });
  return deepFreeze(state);
}

function projection(
  affectedControl: SignedRealNumberLineControlName,
  previousValue: string | number,
  expectedValue: string | number,
  projectionName: SignedRealNumberLineControlProjection["projection"],
  reason: SignedRealNumberLineControlProjection["reason"],
): SignedRealNumberLineControlProjection {
  return {
    affectedControl,
    previousValue,
    expectedValue,
    projection: projectionName,
    reason,
  };
}

export function planSignedRealNumberLineControlTransition(
  currentInput: SignedRealNumberLineControlState,
  request: SignedRealNumberLineControlRequest,
): SignedRealNumberLineControlTransitionPlan {
  const current = validateState(currentInput);
  let expected: SignedRealNumberLineControlState = { ...current };
  const projections: SignedRealNumberLineControlProjection[] = [];
  switch (request.control) {
    case "mode": {
      const descriptor = getSignedRealNumberLineControlDomainDescriptor(
        current.labId,
        request.value,
      );
      expected.mode = request.value;
      if (!descriptor.allowedNumberKinds.includes(expected.numberKind)) {
        const nextKind = descriptor.allowedNumberKinds[0];
        projections.push(
          projection(
            "number-kind",
            expected.numberKind,
            nextKind,
            "mode-number-kind",
            "mode-requires-number-kind",
          ),
        );
        expected.numberKind = nextKind;
      }
      if (request.value === "divide" && expected.rightRationalNumerator === 0) {
        projections.push(
          projection(
            "right-rational-numerator",
            0,
            1,
            "exclude-zero-divisor",
            "division-requires-nonzero-rational-divisor",
          ),
        );
        expected.rightRationalNumerator = 1;
      }
      if (request.value === "radical-divide") {
        if (expected.rightSurdCoefficientNumerator === 0) {
          projections.push(
            projection(
              "right-surd-coefficient-numerator",
              0,
              1,
              "exclude-zero-divisor",
              "division-requires-nonzero-surd-coefficient",
            ),
          );
          expected.rightSurdCoefficientNumerator = 1;
        }
        if (expected.rightSurdRadicand === 0) {
          projections.push(
            projection(
              "right-surd-radicand",
              0,
              1,
              "exclude-zero-divisor",
              "division-requires-nonzero-surd-radicand",
            ),
          );
          expected.rightSurdRadicand = 1;
        }
      }
      break;
    }
    case "number-kind": {
      const nextKind = validateNumberKind(request.value);
      const descriptor = getSignedRealNumberLineControlDomainDescriptor(
        current.labId,
        current.mode,
      );
      if (!descriptor.allowedNumberKinds.includes(nextKind)) {
        throw new SignedRealNumberLineControlDomainError(
          "NUMBER_KIND_NOT_ALLOWED",
          `${nextKind} is not allowed in ${descriptor.domainId}.`,
        );
      }
      expected.numberKind = nextKind;
      break;
    }
    case "value-sign": {
      if (request.value !== -1 && request.value !== 1) {
        throw new SignedRealNumberLineControlDomainError(
          "CONTROL_VALUE_OUT_OF_DOMAIN",
          "value-sign must be -1 or 1.",
        );
      }
      if (current.numberKind !== "radical") {
        throw new SignedRealNumberLineControlDomainError(
          "NUMBER_KIND_NOT_ALLOWED",
          "value-sign is only available for radical controls.",
        );
      }
      if (current.valueRadicand === 0 && request.value === -1) {
        throw new SignedRealNumberLineControlDomainError(
          "DIRECT_REQUEST_VIOLATES_DOMAIN",
          "Zero cannot receive a negative radical sign.",
        );
      }
      expected.valueSign = request.value;
      break;
    }
    case "value-radicand": {
      if (current.numberKind !== "radical") {
        throw new SignedRealNumberLineControlDomainError(
          "NUMBER_KIND_NOT_ALLOWED",
          "value-radicand is only available for radical controls.",
        );
      }
      const value = integerInRange(
        request.value,
        0,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        "value-radicand",
      );
      expected.valueRadicand = value;
      if (value === 0 && expected.valueSign === -1) {
        projections.push(
          projection(
            "value-sign",
            -1,
            1,
            "canonical-zero-sign",
            "zero-has-no-negative-sign",
          ),
        );
        expected.valueSign = 1;
      }
      break;
    }
    case "right-rational-numerator": {
      const value = integerInRange(
        request.value,
        -SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        request.control,
      );
      if (current.mode === "divide" && value === 0) {
        throw new SignedRealNumberLineControlDomainError(
          "DIRECT_REQUEST_VIOLATES_DOMAIN",
          "A rational divisor numerator cannot be zero.",
        );
      }
      expected.rightRationalNumerator = value;
      break;
    }
    case "right-rational-denominator":
      expected.rightRationalDenominator = integerInRange(
        request.value,
        1,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        request.control,
      );
      break;
    case "right-surd-coefficient-numerator": {
      const value = integerInRange(
        request.value,
        -SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        request.control,
      );
      if (current.mode === "radical-divide" && value === 0) {
        throw new SignedRealNumberLineControlDomainError(
          "DIRECT_REQUEST_VIOLATES_DOMAIN",
          "A quadratic-surd divisor coefficient cannot be zero.",
        );
      }
      expected.rightSurdCoefficientNumerator = value;
      break;
    }
    case "right-surd-coefficient-denominator":
      expected.rightSurdCoefficientDenominator = integerInRange(
        request.value,
        1,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        request.control,
      );
      break;
    case "right-surd-radicand": {
      const value = integerInRange(
        request.value,
        0,
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger,
        request.control,
      );
      if (current.mode === "radical-divide" && value === 0) {
        throw new SignedRealNumberLineControlDomainError(
          "DIRECT_REQUEST_VIOLATES_DOMAIN",
          "A quadratic-surd divisor radicand cannot be zero.",
        );
      }
      expected.rightSurdRadicand = value;
      break;
    }
    default:
      throw new SignedRealNumberLineControlDomainError(
        "UNKNOWN_CONTROL",
        `Unknown control request: ${String((request as { control?: unknown }).control)}.`,
      );
  }
  expected = validateState(expected);
  const descriptor = getSignedRealNumberLineControlDomainDescriptor(
    expected.labId,
    expected.mode,
  );
  return deepFreeze({
    version: SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT.version,
    descriptorId: descriptor.domainId,
    before: current,
    requested: request,
    expected,
    projections,
    expectedStateKey: stateKey(expected),
  });
}

export function observeSignedRealNumberLineControlTransition(
  plan: SignedRealNumberLineControlTransitionPlan,
  observedInput: SignedRealNumberLineControlState,
): SignedRealNumberLineControlTransitionReceipt {
  const observed = validateState(observedInput);
  const observedStateKey = stateKey(observed);
  if (observedStateKey !== plan.expectedStateKey) {
    throw new SignedRealNumberLineControlDomainError(
      "OBSERVED_STATE_MISMATCH",
      `Observed ${observedStateKey}; expected ${plan.expectedStateKey}.`,
    );
  }
  return deepFreeze({
    ...plan,
    observed,
    observedStateKey,
    status: "pass" as const,
  });
}
