import type { HKVisualizationRangeDomainId } from "../../components/visualizations/hk/hkVisualizationLessonContracts";

export const HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS = Object.freeze([
  "number-bond-v1",
  "bounded-step-v1",
  "payment-at-least-price-v1",
  "divisor-within-number-v1",
  "proper-fractions-v1",
  "visible-layers-v1",
  "triangle-validity-v1",
  "nonzero-quadratic-a-v1",
  "identity-positive-a-gt-b-v1"
] as const satisfies readonly HKVisualizationRangeDomainId[]);

export type HkDedicatedDynamicRangeDomainId = typeof HK_DEDICATED_DYNAMIC_RANGE_DOMAIN_IDS[number];

export type HkVisualizationRangeDomainDescriptor = Readonly<{
  controlId: string;
  initial: number;
  maximum: number;
  minimum: number;
  step: number;
}>;

export type HkVisualizationRangeDomainState = Readonly<Record<string, number>>;

export type HkVisualizationRangeProjection =
  | "clamp-and-visibility"
  | "clamp-min"
  | "clamp-max"
  | "project-valid-triangle"
  | "exclude-zero"
  | "preserve-positive-order";

export type HkVisualizationRangeDomainEdge = Readonly<{
  affectedControlIds: readonly string[];
  projection: HkVisualizationRangeProjection;
  reason: string;
  sourceControlId: string;
}>;

export type HkVisualizationRangeProjectionEvidence = Readonly<{
  affectedControlId: string;
  affectedValueAfter: number;
  affectedValueBefore: number;
  declaredControllerId: string;
  domainId: HkDedicatedDynamicRangeDomainId;
  projection: HkVisualizationRangeProjection;
  reason: string;
  triggerControlId: string;
  triggerRequestedValue: number;
}>;

export type HkVisualizationRangeDescriptorExpectation = Readonly<{
  controlId: string;
  domainId: HkDedicatedDynamicRangeDomainId;
  enabled: boolean;
  excludedValues: readonly number[];
  maximum: number;
  minimum: number;
  step: number;
  visibility: "range" | "fixed";
}>;

export type HkVisualizationRangeCanonicalization = Readonly<{
  applicationOrder: readonly string[];
  canonicalState: HkVisualizationRangeDomainState;
  domainId: HkDedicatedDynamicRangeDomainId;
  projections: readonly HkVisualizationRangeProjectionEvidence[];
  requestedState: HkVisualizationRangeDomainState;
  valid: boolean;
}>;

export type HkVisualizationRangeBoundaryEvidence = Readonly<{
  boundaryId: string;
  canonicalState: HkVisualizationRangeDomainState;
  domainId: HkDedicatedDynamicRangeDomainId;
  expectedDescriptors: readonly HkVisualizationRangeDescriptorExpectation[];
  projections: readonly HkVisualizationRangeProjectionEvidence[];
  requestedState: HkVisualizationRangeDomainState;
  startingState: HkVisualizationRangeDomainState;
  valid: boolean;
}>;

type CanonicalizeArgs = Readonly<{
  currentState: HkVisualizationRangeDomainState;
  descriptors: readonly HkVisualizationRangeDomainDescriptor[];
  modeId: string;
  requestedState: HkVisualizationRangeDomainState;
}>;

type BoundaryRequest = Readonly<{
  boundaryId: string;
  requestedOverrides: HkVisualizationRangeDomainState;
  startingOverrides?: HkVisualizationRangeDomainState;
}>;

export type HkVisualizationDynamicRangeDomainContract = Readonly<{
  affectedBy: Readonly<Record<string, readonly string[]>>;
  applicationOrder: readonly string[];
  canonicalize: (args: CanonicalizeArgs) => HkVisualizationRangeCanonicalization;
  descriptorFor: (
    state: HkVisualizationRangeDomainState,
    modeId: string,
    descriptor: HkVisualizationRangeDomainDescriptor
  ) => HkVisualizationRangeDescriptorExpectation;
  domainId: HkDedicatedDynamicRangeDomainId;
  edges: readonly HkVisualizationRangeDomainEdge[];
  isApplicable: (modeId: string, controlIds: ReadonlySet<string>) => boolean;
  isValid: (state: HkVisualizationRangeDomainState, modeId: string) => boolean;
  labId: string;
  requiredControlIds: readonly string[];
}>;

type MutableState = Record<string, number>;
type DomainDefinition = Readonly<{
  applicationOrder: readonly string[];
  boundaryRequests: (
    descriptors: readonly HkVisualizationRangeDomainDescriptor[],
    modeId: string
  ) => readonly BoundaryRequest[];
  descriptorFor?: (
    state: HkVisualizationRangeDomainState,
    modeId: string,
    descriptor: HkVisualizationRangeDomainDescriptor
  ) => Omit<HkVisualizationRangeDescriptorExpectation, "domainId">;
  domainId: HkDedicatedDynamicRangeDomainId;
  edges: readonly HkVisualizationRangeDomainEdge[];
  isApplicable?: (modeId: string, controlIds: ReadonlySet<string>) => boolean;
  isValid: (state: HkVisualizationRangeDomainState, modeId: string) => boolean;
  labId: string;
  projectRequest: (
    state: MutableState,
    controlId: string,
    requestedValue: number,
    context: ProjectionContext
  ) => void;
  requiredControlIds: readonly string[];
}>;

type ProjectionContext = Readonly<{
  descriptors: ReadonlyMap<string, HkVisualizationRangeDomainDescriptor>;
  evidence: HkVisualizationRangeProjectionEvidence[];
  modeId: string;
  record: (
    edgeSourceId: string,
    triggerControlId: string,
    affectedControlId: string,
    before: number,
    after: number,
    requestedValue: number
  ) => void;
}>;

const NUMBER_BOND_EDGE = edge(
  "total",
  ["knownPart"],
  "clamp-and-visibility",
  "known-part-must-not-exceed-whole"
);
const BOUNDED_STEP_EDGE = edge(
  "start",
  ["step"],
  "clamp-and-visibility",
  "step-must-remain-on-number-line"
);
const PAYMENT_EDGE = edge(
  "price",
  ["payment"],
  "clamp-min",
  "payment-must-cover-price"
);
const DIVISOR_EDGE = edge(
  "firstNumber",
  ["candidateDivisor"],
  "clamp-max",
  "test-divisor-must-not-exceed-tested-number"
);
const FRACTION_EDGES = Object.freeze([
  edge("firstDenominator", ["firstNumerator"], "clamp-max", "proper-fraction-numerator-must-be-below-denominator"),
  edge("secondDenominator", ["secondNumerator"], "clamp-max", "proper-fraction-numerator-must-be-below-denominator"),
  edge("thirdDenominator", ["thirdNumerator"], "clamp-max", "proper-fraction-numerator-must-be-below-denominator")
]);
const VISIBLE_LAYERS_EDGE = edge(
  "height",
  ["visibleLayers"],
  "clamp-max",
  "revealed-layers-must-not-exceed-height"
);
const TRIANGLE_CONTROL_IDS = Object.freeze(["ax", "ay", "bx", "by", "cx", "cy"] as const);
const TRIANGLE_COORDINATE_BOUNDS = Object.freeze({
  ax: [-8, 8],
  ay: [-5, 5],
  bx: [-8, 8],
  by: [-5, 5],
  cx: [-8, 8],
  cy: [-5, 5]
} as const satisfies Record<(typeof TRIANGLE_CONTROL_IDS)[number], readonly [number, number]>);
const TRIANGLE_EDGES = Object.freeze(TRIANGLE_CONTROL_IDS.map((controlId) => edge(
  controlId,
  TRIANGLE_CONTROL_IDS.filter((candidate) => candidate !== controlId),
  "project-valid-triangle",
  "triangle-must-remain-nondegenerate"
)));
const QUADRATIC_EDGE = edge(
  "a",
  ["a"],
  "exclude-zero",
  "quadratic-leading-coefficient-must-be-nonzero"
);
const IDENTITY_EDGES = Object.freeze([
  edge("a", ["b"], "preserve-positive-order", "identity-lengths-must-remain-positive-with-a-greater-than-b"),
  edge("b", ["a"], "preserve-positive-order", "identity-lengths-must-remain-positive-with-a-greater-than-b")
]);

function edge(
  sourceControlId: string,
  affectedControlIds: readonly string[],
  projection: HkVisualizationRangeProjection,
  reason: string
): HkVisualizationRangeDomainEdge {
  return Object.freeze({
    affectedControlIds: Object.freeze([...affectedControlIds]),
    projection,
    reason,
    sourceControlId
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 12) {
  return Number(value.toFixed(precision));
}

function descriptorMap(descriptors: readonly HkVisualizationRangeDomainDescriptor[]) {
  return new Map(descriptors.map((descriptor) => [descriptor.controlId, descriptor]));
}

function descriptor(
  descriptors: ReadonlyMap<string, HkVisualizationRangeDomainDescriptor>,
  controlId: string
) {
  const value = descriptors.get(controlId);
  if (!value) throw new Error(`Dynamic range domain is missing descriptor ${controlId}.`);
  return value;
}

function stateFromDescriptors(descriptors: readonly HkVisualizationRangeDomainDescriptor[]) {
  return Object.freeze(Object.fromEntries(descriptors.map(({ controlId, initial }) => [controlId, initial])));
}

function withOverrides(
  state: HkVisualizationRangeDomainState,
  overrides: HkVisualizationRangeDomainState
) {
  return Object.freeze({ ...state, ...overrides });
}

function baseBoundedRequest(
  state: MutableState,
  controlId: string,
  requestedValue: number,
  descriptors: ReadonlyMap<string, HkVisualizationRangeDomainDescriptor>
) {
  const range = descriptor(descriptors, controlId);
  state[controlId] = round(clamp(requestedValue, range.minimum, range.maximum));
}

function dependentProjection(
  state: MutableState,
  context: ProjectionContext,
  edgeSourceId: string,
  triggerControlId: string,
  affectedControlId: string,
  requestedValue: number,
  nextValue: number
) {
  const before = state[affectedControlId];
  if (Object.is(before, nextValue)) return;
  state[affectedControlId] = round(nextValue);
  context.record(edgeSourceId, triggerControlId, affectedControlId, before, state[affectedControlId], requestedValue);
}

function liveBoundProjection(
  state: MutableState,
  context: ProjectionContext,
  controllerId: string,
  controlId: string,
  requestedValue: number,
  minimum: number,
  maximum: number
) {
  const before = state[controlId];
  const after = round(clamp(requestedValue, minimum, maximum));
  state[controlId] = after;
  if (!Object.is(after, requestedValue)) {
    context.record(controllerId, controlId, controlId, before, after, requestedValue);
  }
}

function fractionPairs(state: HkVisualizationRangeDomainState) {
  return ["first", "second", "third"].flatMap((prefix) => (
    `${prefix}Denominator` in state && `${prefix}Numerator` in state
      ? [[`${prefix}Denominator`, `${prefix}Numerator`] as const]
      : []
  ));
}

function triangleArea(state: HkVisualizationRangeDomainState) {
  return Math.abs(
    (state.bx - state.ax) * (state.cy - state.ay)
      - (state.by - state.ay) * (state.cx - state.ax)
  ) / 2;
}

function triangleMinimumSide(state: HkVisualizationRangeDomainState) {
  return Math.min(
    Math.hypot(state.ax - state.bx, state.ay - state.by),
    Math.hypot(state.bx - state.cx, state.by - state.cy),
    Math.hypot(state.cx - state.ax, state.cy - state.ay)
  );
}

function triangleInteriorAngles(state: HkVisualizationRangeDomainState) {
  const vertices = [
    { x: state.ax, y: state.ay },
    { x: state.bx, y: state.by },
    { x: state.cx, y: state.cy }
  ];
  return vertices.map((vertex, index) => {
    const first = vertices[(index + 1) % vertices.length];
    const second = vertices[(index + 2) % vertices.length];
    const firstVector = { x: first.x - vertex.x, y: first.y - vertex.y };
    const secondVector = { x: second.x - vertex.x, y: second.y - vertex.y };
    const denominator = Math.hypot(firstVector.x, firstVector.y)
      * Math.hypot(secondVector.x, secondVector.y);
    if (denominator < 1e-8) return Number.NaN;
    const cosine = (
      firstVector.x * secondVector.x + firstVector.y * secondVector.y
    ) / denominator;
    return Math.acos(clamp(cosine, -1, 1)) * 180 / Math.PI;
  });
}

function triangleStateIsValid(state: HkVisualizationRangeDomainState) {
  const coordinatesAreValid = TRIANGLE_CONTROL_IDS.every((controlId) => {
    const value = state[controlId];
    const [minimum, maximum] = TRIANGLE_COORDINATE_BOUNDS[controlId];
    const gridPosition = (value - minimum) / 0.25;
    return Number.isFinite(value)
      && value >= minimum
      && value <= maximum
      && Math.abs(gridPosition - Math.round(gridPosition)) <= 1e-9;
  });
  const angles = triangleInteriorAngles(state);
  return coordinatesAreValid
    && Number.isFinite(triangleArea(state))
    && triangleArea(state) >= 0.25
    && Number.isFinite(triangleMinimumSide(state))
    && triangleMinimumSide(state) >= 2.5
    && angles.every((angle) => Number.isFinite(angle) && angle > 0 && angle < 180)
    && Math.abs(angles.reduce((sum, angle) => sum + angle, 0) - 180) <= 1e-8;
}

/** Predicts exact projection state; triangleStateIsValid independently audits its geometry. */
function projectTriangleCoordinate(
  current: HkVisualizationRangeDomainState,
  coordinateId: string,
  requestedValue: number
) {
  const requested = { ...current, [coordinateId]: requestedValue };
  if (triangleStateIsValid(requested)) return requested;

  const companionId = `${coordinateId.slice(0, 1)}${coordinateId.endsWith("x") ? "y" : "x"}`;
  const companionIds = [
    companionId,
    ...TRIANGLE_CONTROL_IDS.filter((id) => id !== coordinateId && id !== companionId)
  ];
  const companionStep = 0.25;
  let candidateOrder = 0;
  const nearestCandidate: {
    value: {
      candidate: HkVisualizationRangeDomainState;
      candidateOrder: number;
      squaredDisplacement: number;
    } | null;
  } = { value: null };

  const considerCandidate = (candidate: HkVisualizationRangeDomainState) => {
    const order = candidateOrder++;
    if (candidate[coordinateId] !== requestedValue || !triangleStateIsValid(candidate)) return;
    const squaredDisplacement = TRIANGLE_CONTROL_IDS.reduce((total, id) => (
      total + (candidate[id] - requested[id]) ** 2
    ), 0);
    if (!Number.isFinite(squaredDisplacement)) return;
    if (
      nearestCandidate.value === null
      || squaredDisplacement < nearestCandidate.value.squaredDisplacement
      || (
        squaredDisplacement === nearestCandidate.value.squaredDisplacement
        && order < nearestCandidate.value.candidateOrder
      )
    ) {
      nearestCandidate.value = { candidate, candidateOrder: order, squaredDisplacement };
    }
  };

  for (const candidateCompanionId of companionIds) {
    const companionIsX = candidateCompanionId.endsWith("x");
    const companionMin = companionIsX ? -8 : -5;
    const companionMax = companionIsX ? 8 : 5;
    const startingValue = requested[candidateCompanionId];
    const checkedValues = new Set<number>();
    for (let offset = companionStep; offset <= companionMax - companionMin + companionStep; offset += companionStep) {
      for (const direction of [1, -1]) {
        const companionValue = clamp(round(startingValue + direction * offset, 2), companionMin, companionMax);
        if (checkedValues.has(companionValue)) continue;
        checkedValues.add(companionValue);
        const candidate = { ...requested, [candidateCompanionId]: companionValue };
        considerCandidate(candidate);
      }
    }
  }

  const changedVertex = coordinateId.slice(0, 1);
  for (const fallbackVertex of ["a", "b", "c"].filter((vertex) => vertex !== changedVertex)) {
    for (let fallbackX = -8; fallbackX <= 8; fallbackX += companionStep) {
      for (let fallbackY = -5; fallbackY <= 5; fallbackY += companionStep) {
        const candidate = {
          ...requested,
          [`${fallbackVertex}x`]: fallbackX,
          [`${fallbackVertex}y`]: fallbackY
        };
        considerCandidate(candidate);
      }
    }
  }

  const otherVertices = ["a", "b", "c"].filter((vertex) => vertex !== changedVertex);
  const mirroredBoundaryCandidates = [-1, 1].flatMap((mirror) => [false, true].map((swap) => {
    const firstOther = otherVertices[0];
    const secondOther = otherVertices[1];
    if (coordinateId.endsWith("x")) {
      const changedY = mirror * 5;
      const [firstX, secondX] = swap ? [8, -8] : [-8, 8];
      return {
        ...requested,
        [`${changedVertex}y`]: changedY,
        [`${firstOther}x`]: firstX,
        [`${firstOther}y`]: -changedY,
        [`${secondOther}x`]: secondX,
        [`${secondOther}y`]: -changedY
      };
    }
    const changedX = mirror * 8;
    const [firstY, secondY] = swap ? [5, -5] : [-5, 5];
    return {
      ...requested,
      [`${changedVertex}x`]: changedX,
      [`${firstOther}x`]: -changedX,
      [`${firstOther}y`]: firstY,
      [`${secondOther}x`]: -changedX,
      [`${secondOther}y`]: secondY
    };
  }));
  for (const candidate of mirroredBoundaryCandidates) considerCandidate(candidate);

  if (nearestCandidate.value !== null) return nearestCandidate.value.candidate;
  if (triangleStateIsValid(current)) return current;
  throw new Error("Triangle oracle could not project a finite non-degenerate state.");
}

const DEFINITIONS = Object.freeze([
  {
    applicationOrder: ["total", "knownPart"],
    boundaryRequests: (descriptors) => {
      const ranges = descriptorMap(descriptors);
      const total = descriptor(ranges, "total");
      return [
        boundary("whole-zero-fixed-part", { total: total.minimum, knownPart: 0 }),
        boundary("maximum-whole-zero-known", { total: total.maximum, knownPart: 0 }),
        boundary("maximum-whole-all-known", { total: total.maximum, knownPart: total.maximum })
      ];
    },
    domainId: "number-bond-v1",
    descriptorFor: (state, _modeId, range) => range.controlId === "knownPart"
      ? expectation(range, { maximum: state.total, visibility: state.total > 0 ? "range" : "fixed" })
      : expectation(range),
    edges: [NUMBER_BOND_EDGE],
    isValid: (state) => state.total >= 0 && state.knownPart >= 0 && state.knownPart <= state.total,
    labId: "p1-counting-number-bonds",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId === "total") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, "total", controlId, "knownPart", requestedValue, Math.min(state.knownPart, state.total));
        return;
      }
      if (controlId === "knownPart") {
        liveBoundProjection(state, context, "total", controlId, requestedValue, 0, state.total);
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["total", "knownPart"]
  },
  {
    applicationOrder: ["start", "step"],
    boundaryRequests: (_descriptors, modeId) => modeId === "subtract"
      ? [
          boundary("zero-start-zero-step", { start: 0, step: 0 }),
          boundary("maximum-start-zero-step", { start: 20, step: 0 }),
          boundary("maximum-start-maximum-step", { start: 20, step: 20 })
        ]
      : [
          boundary("zero-start-maximum-step", { start: 0, step: 20 }),
          boundary("maximum-start-zero-step", { start: 20, step: 0 }),
          boundary("mid-start-to-upper-bound", { start: 10, step: 10 })
        ],
    domainId: "bounded-step-v1",
    descriptorFor: (state, modeId, range) => {
      if (range.controlId !== "step") return expectation(range);
      const maximum = modeId === "subtract" ? state.start : 20 - state.start;
      return expectation(range, { maximum, visibility: maximum > 0 ? "range" : "fixed" });
    },
    edges: [BOUNDED_STEP_EDGE],
    isValid: (state, modeId) => state.start >= 0 && state.start <= 20 && state.step >= 0
      && state.step <= (modeId === "subtract" ? state.start : 20 - state.start),
    labId: "p1-addition-subtraction",
    projectRequest: (state, controlId, requestedValue, context) => {
      const maximumStep = () => context.modeId === "subtract" ? state.start : 20 - state.start;
      if (controlId === "start") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, "start", controlId, "step", requestedValue, Math.min(state.step, maximumStep()));
        return;
      }
      if (controlId === "step") {
        liveBoundProjection(state, context, "start", controlId, requestedValue, 0, maximumStep());
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["start", "step"]
  },
  {
    applicationOrder: ["price", "payment"],
    boundaryRequests: (descriptors, modeId) => {
      if (modeId !== "money") return [];
      const ranges = descriptorMap(descriptors);
      const price = descriptor(ranges, "price");
      const payment = descriptor(ranges, "payment");
      return [
        boundary("minimum-price-exact-payment", { price: price.minimum, payment: price.minimum }),
        boundary("maximum-price-exact-payment", { price: price.maximum, payment: price.maximum }),
        boundary("minimum-price-maximum-payment", { price: price.minimum, payment: payment.maximum })
      ];
    },
    domainId: "payment-at-least-price-v1",
    descriptorFor: (state, _modeId, range) => range.controlId === "payment"
      ? expectation(range, { minimum: state.price })
      : expectation(range),
    edges: [PAYMENT_EDGE],
    isApplicable: (modeId) => modeId === "money",
    isValid: (state) => state.price >= 1 && state.payment >= state.price && state.payment <= 100,
    labId: "p2-money-time",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId === "price") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, "price", controlId, "payment", requestedValue, Math.max(state.payment, state.price));
        return;
      }
      if (controlId === "payment") {
        liveBoundProjection(state, context, "price", controlId, requestedValue, state.price, descriptor(context.descriptors, "payment").maximum);
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["price", "payment"]
  },
  {
    applicationOrder: ["firstNumber", "candidateDivisor"],
    boundaryRequests: (descriptors, modeId) => {
      if (modeId !== "factor-pairs") return [];
      const first = descriptor(descriptorMap(descriptors), "firstNumber");
      return [
        boundary("minimum-number-unit-divisor", { firstNumber: first.minimum, candidateDivisor: 1 }),
        boundary("maximum-number-unit-divisor", { firstNumber: first.maximum, candidateDivisor: 1 }),
        boundary("maximum-number-self-divisor", { firstNumber: first.maximum, candidateDivisor: first.maximum })
      ];
    },
    domainId: "divisor-within-number-v1",
    descriptorFor: (state, _modeId, range) => range.controlId === "candidateDivisor"
      ? expectation(range, { maximum: state.firstNumber })
      : expectation(range),
    edges: [DIVISOR_EDGE],
    isApplicable: (modeId) => modeId === "factor-pairs",
    isValid: (state) => state.firstNumber >= 1 && state.candidateDivisor >= 1 && state.candidateDivisor <= state.firstNumber,
    labId: "p4-large-numbers",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId === "firstNumber") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, "firstNumber", controlId, "candidateDivisor", requestedValue, Math.min(state.candidateDivisor, state.firstNumber));
        return;
      }
      if (controlId === "candidateDivisor") {
        liveBoundProjection(state, context, "firstNumber", controlId, requestedValue, 1, state.firstNumber);
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["firstNumber", "candidateDivisor"]
  },
  {
    applicationOrder: [
      "firstDenominator", "firstNumerator",
      "secondDenominator", "secondNumerator",
      "thirdDenominator", "thirdNumerator"
    ],
    boundaryRequests: (descriptors) => {
      const ranges = descriptorMap(descriptors);
      const base = stateFromDescriptors(descriptors);
      const pairChoices = fractionPairs(base).map(([denominatorId, numeratorId]) => {
        const denominator = descriptor(ranges, denominatorId);
        return [
          { id: `${denominatorId}-minimum-zero`, values: { [denominatorId]: denominator.minimum, [numeratorId]: 0 } },
          { id: `${denominatorId}-minimum-proper-maximum`, values: { [denominatorId]: denominator.minimum, [numeratorId]: denominator.minimum - 1 } },
          { id: `${denominatorId}-maximum-zero`, values: { [denominatorId]: denominator.maximum, [numeratorId]: 0 } },
          { id: `${denominatorId}-maximum-proper-maximum`, values: { [denominatorId]: denominator.maximum, [numeratorId]: denominator.maximum - 1 } }
        ];
      });
      return cartesianProduct(pairChoices).map((choices) => boundary(
        `pair-product:${choices.map(({ id }) => id).join("+")}`,
        Object.assign({}, ...choices.map(({ values }) => values))
      ));
    },
    domainId: "proper-fractions-v1",
    descriptorFor: (state, _modeId, range) => {
      const prefix = ["first", "second", "third"].find((candidate) => range.controlId === `${candidate}Numerator`);
      return prefix
        ? expectation(range, { maximum: state[`${prefix}Denominator`] - 1 })
        : expectation(range);
    },
    edges: FRACTION_EDGES,
    isApplicable: (_modeId, controlIds) => ["first", "second", "third"].some((prefix) => (
      controlIds.has(`${prefix}Denominator`) && controlIds.has(`${prefix}Numerator`)
    )),
    isValid: (state) => fractionPairs(state).every(([denominatorId, numeratorId]) => (
      state[denominatorId] >= 2 && state[numeratorId] >= 0 && state[numeratorId] < state[denominatorId]
    )),
    labId: "p5-fractions-operations",
    projectRequest: (state, controlId, requestedValue, context) => {
      const prefix = ["first", "second", "third"].find((candidate) => controlId.startsWith(candidate));
      if (!prefix) {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        return;
      }
      const denominatorId = `${prefix}Denominator`;
      const numeratorId = `${prefix}Numerator`;
      if (controlId === denominatorId) {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, denominatorId, controlId, numeratorId, requestedValue, Math.min(state[numeratorId], state[denominatorId] - 1));
        return;
      }
      liveBoundProjection(state, context, denominatorId, controlId, requestedValue, 0, state[denominatorId] - 1);
    },
    requiredControlIds: ["firstDenominator", "firstNumerator", "secondDenominator", "secondNumerator"]
  },
  {
    applicationOrder: ["height", "visibleLayers"],
    boundaryRequests: (descriptors) => {
      const height = descriptor(descriptorMap(descriptors), "height");
      return [
        boundary("minimum-height-one-layer", { height: height.minimum, visibleLayers: 1 }),
        boundary("maximum-height-one-layer", { height: height.maximum, visibleLayers: 1 }),
        boundary("maximum-height-all-layers", { height: height.maximum, visibleLayers: height.maximum })
      ];
    },
    domainId: "visible-layers-v1",
    descriptorFor: (state, _modeId, range) => range.controlId === "visibleLayers"
      ? expectation(range, { maximum: state.height })
      : expectation(range),
    edges: [VISIBLE_LAYERS_EDGE],
    isValid: (state) => state.height >= 1 && state.visibleLayers >= 1 && state.visibleLayers <= state.height,
    labId: "p5-volume",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId === "height") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        dependentProjection(state, context, "height", controlId, "visibleLayers", requestedValue, Math.min(state.visibleLayers, state.height));
        return;
      }
      if (controlId === "visibleLayers") {
        liveBoundProjection(state, context, "height", controlId, requestedValue, 1, state.height);
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["height", "visibleLayers"]
  },
  {
    applicationOrder: TRIANGLE_CONTROL_IDS,
    boundaryRequests: (descriptors) => [
      ...descriptors.flatMap((range) => [
        boundary(`${range.controlId}-minimum-projection`, { [range.controlId]: range.minimum }),
        boundary(`${range.controlId}-maximum-projection`, { [range.controlId]: range.maximum })
      ]),
      boundary("coincident-a-b-request", { ax: 4, ay: -2 }),
      boundary(
        "chained-collinear-endpoint-regression",
        { cx: -8 },
        { ax: -8, ay: -2, bx: -8, by: 0.5, cx: 1, cy: 0 }
      )
    ],
    domainId: "triangle-validity-v1",
    descriptorFor: (_state, _modeId, range) => expectation(range),
    edges: TRIANGLE_EDGES,
    isValid: (state) => triangleStateIsValid(state),
    labId: "angles",
    projectRequest: (state, controlId, requestedValue, context) => {
      const range = descriptor(context.descriptors, controlId);
      const bounded = round(clamp(requestedValue, range.minimum, range.maximum));
      const before = { ...state };
      const projected = projectTriangleCoordinate(state, controlId, bounded);
      if (!triangleStateIsValid(projected) || projected[controlId] !== bounded) {
        throw new Error(`Triangle projection violated independent geometry after ${controlId}=${bounded}.`);
      }
      Object.assign(state, projected);
      for (const affectedControlId of TRIANGLE_CONTROL_IDS) {
        const directValue = affectedControlId === controlId ? bounded : before[affectedControlId];
        if (!Object.is(state[affectedControlId], directValue)) {
          context.record(controlId, controlId, affectedControlId, before[affectedControlId], state[affectedControlId], requestedValue);
        }
      }
    },
    requiredControlIds: TRIANGLE_CONTROL_IDS
  },
  {
    applicationOrder: ["a", "b", "c"],
    boundaryRequests: (descriptors) => {
      const a = descriptor(descriptorMap(descriptors), "a");
      return [
        boundary("negative-leading-boundary", { a: a.minimum }),
        boundary("positive-leading-boundary", { a: a.maximum }),
        boundary("zero-request-from-positive", { a: 0 }, { a: Math.max(a.step, a.initial) }),
        boundary("zero-request-from-negative", { a: 0 }, { a: -Math.max(a.step, Math.abs(a.initial)) })
      ];
    },
    domainId: "nonzero-quadratic-a-v1",
    descriptorFor: (_state, _modeId, range) => range.controlId === "a"
      ? expectation(range, { excludedValues: [0] })
      : expectation(range),
    edges: [QUADRATIC_EDGE],
    isValid: (state) => Number.isFinite(state.a) && state.a !== 0,
    labId: "quadratic-patterns",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId !== "a") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        return;
      }
      const range = descriptor(context.descriptors, "a");
      const before = state.a;
      let after = round(clamp(requestedValue, range.minimum, range.maximum));
      if (Math.abs(after) < range.step) {
        after = after < 0 || (after === 0 && before > 0) ? -range.step : range.step;
      }
      state.a = after;
      if (!Object.is(after, requestedValue)) context.record("a", "a", "a", before, after, requestedValue);
    },
    requiredControlIds: ["a"]
  },
  {
    applicationOrder: ["a", "b"],
    boundaryRequests: () => [
      boundary("minimum-adjacent-lengths", { a: 2, b: 1 }),
      boundary("maximum-a-minimum-b", { a: 10, b: 1 }),
      boundary("maximum-adjacent-lengths", { a: 10, b: 9 }),
      boundary("a-request-projects-b", { a: 2 }, { a: 6, b: 2 }),
      boundary("b-request-projects-a", { b: 9 }, { a: 6, b: 2 })
    ],
    domainId: "identity-positive-a-gt-b-v1",
    descriptorFor: (_state, _modeId, range) => expectation(range),
    edges: IDENTITY_EDGES,
    isValid: (state) => state.a >= 2 && state.a <= 10 && state.b >= 1 && state.b <= 9 && state.a > state.b,
    labId: "identities-square-patterns",
    projectRequest: (state, controlId, requestedValue, context) => {
      if (controlId === "a") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        if (state.b >= state.a) {
          dependentProjection(state, context, "a", controlId, "b", requestedValue, Math.max(1, state.a - 1));
        }
        return;
      }
      if (controlId === "b") {
        baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
        if (state.b >= state.a) {
          dependentProjection(state, context, "b", controlId, "a", requestedValue, Math.min(10, state.b + 1));
        }
        return;
      }
      baseBoundedRequest(state, controlId, requestedValue, context.descriptors);
    },
    requiredControlIds: ["a", "b"]
  }
] as const satisfies readonly DomainDefinition[]);

function boundary(
  boundaryId: string,
  requestedOverrides: HkVisualizationRangeDomainState,
  startingOverrides?: HkVisualizationRangeDomainState
): BoundaryRequest {
  return Object.freeze({
    boundaryId,
    requestedOverrides: Object.freeze({ ...requestedOverrides }),
    ...(startingOverrides ? { startingOverrides: Object.freeze({ ...startingOverrides }) } : {})
  });
}

function expectation(
  range: HkVisualizationRangeDomainDescriptor,
  overrides: Partial<Omit<HkVisualizationRangeDescriptorExpectation, "controlId" | "domainId">> = {}
): Omit<HkVisualizationRangeDescriptorExpectation, "domainId"> {
  const visibility = overrides.visibility ?? "range";
  return Object.freeze({
    controlId: range.controlId,
    enabled: overrides.enabled ?? visibility === "range",
    excludedValues: Object.freeze([...(overrides.excludedValues ?? [])]),
    maximum: overrides.maximum ?? range.maximum,
    minimum: overrides.minimum ?? range.minimum,
    step: overrides.step ?? range.step,
    visibility
  });
}

function cartesianProduct<T>(groups: readonly (readonly T[])[]): readonly (readonly T[])[] {
  return groups.reduce<readonly (readonly T[])[]>(
    (products, group) => products.flatMap((product) => group.map((item) => Object.freeze([...product, item]))),
    [Object.freeze([])]
  );
}

function affectedByFor(edges: readonly HkVisualizationRangeDomainEdge[]) {
  const affectedBy: Record<string, string[]> = {};
  for (const { sourceControlId, affectedControlIds } of edges) {
    for (const affectedControlId of affectedControlIds) {
      (affectedBy[affectedControlId] ??= []).push(sourceControlId);
    }
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(affectedBy).map(([controlId, sourceIds]) => [controlId, Object.freeze(sourceIds)])
  ));
}

function makeContract(definition: DomainDefinition): HkVisualizationDynamicRangeDomainContract {
  const bySource = new Map(definition.edges.map((item) => [item.sourceControlId, item]));
  const canonicalize = (args: CanonicalizeArgs): HkVisualizationRangeCanonicalization => {
    const descriptors = descriptorMap(args.descriptors);
    const state: MutableState = { ...args.currentState };
    const requestedState = Object.freeze({ ...args.requestedState });
    const evidence: HkVisualizationRangeProjectionEvidence[] = [];
    const record: ProjectionContext["record"] = (
      edgeSourceId,
      triggerControlId,
      affectedControlId,
      before,
      after,
      requestedValue
    ) => {
      const declaredEdge = bySource.get(edgeSourceId);
      if (!declaredEdge || !declaredEdge.affectedControlIds.includes(affectedControlId)) {
        throw new Error(
          `Dynamic range projection ${triggerControlId}->${affectedControlId} is not declared by ${definition.domainId}.`
        );
      }
      evidence.push(Object.freeze({
        affectedControlId,
        affectedValueAfter: after,
        affectedValueBefore: before,
        declaredControllerId: edgeSourceId,
        domainId: definition.domainId,
        projection: declaredEdge.projection,
        reason: declaredEdge.reason,
        triggerControlId,
        triggerRequestedValue: requestedValue
      }));
    };
    const requestedControlIds = Object.keys(requestedState);
    const ordered = [
      ...definition.applicationOrder.filter((controlId) => requestedControlIds.includes(controlId)),
      ...requestedControlIds.filter((controlId) => !definition.applicationOrder.includes(controlId))
    ];
    for (const controlId of ordered) {
      const requestedValue = requestedState[controlId];
      if (!Number.isFinite(requestedValue)) {
        throw new Error(`${definition.domainId}.${controlId} request must be finite.`);
      }
      if (!descriptors.has(controlId)) {
        throw new Error(`${definition.domainId} requested undeclared range ${controlId}.`);
      }
      definition.projectRequest(state, controlId, requestedValue, {
        descriptors,
        evidence,
        modeId: args.modeId,
        record
      });
    }
    const canonicalState = Object.freeze({ ...state });
    return Object.freeze({
      applicationOrder: Object.freeze(ordered),
      canonicalState,
      domainId: definition.domainId,
      projections: Object.freeze(evidence),
      requestedState,
      valid: definition.isValid(canonicalState, args.modeId)
    });
  };

  return Object.freeze({
    affectedBy: affectedByFor(definition.edges),
    applicationOrder: Object.freeze([...definition.applicationOrder]),
    canonicalize,
    descriptorFor: (state, modeId, range) => Object.freeze({
      ...(definition.descriptorFor?.(state, modeId, range) ?? expectation(range)),
      domainId: definition.domainId
    }),
    domainId: definition.domainId,
    edges: Object.freeze([...definition.edges]),
    isApplicable: definition.isApplicable ?? ((_modeId, controlIds) => (
      definition.requiredControlIds.some((controlId) => controlIds.has(controlId))
    )),
    isValid: definition.isValid,
    labId: definition.labId,
    requiredControlIds: Object.freeze([...definition.requiredControlIds])
  });
}

export const HK_DEDICATED_DYNAMIC_RANGE_DOMAINS = Object.freeze(
  Object.fromEntries(DEFINITIONS.map((definition) => [definition.domainId, makeContract(definition)]))
) as Readonly<Record<HkDedicatedDynamicRangeDomainId, HkVisualizationDynamicRangeDomainContract>>;

const DYNAMIC_DOMAIN_BY_LAB_ID = new Map(
  Object.values(HK_DEDICATED_DYNAMIC_RANGE_DOMAINS).map((contract) => [contract.labId, contract])
);

export function getHkDedicatedDynamicRangeDomain(
  domainId: HkDedicatedDynamicRangeDomainId,
  labId?: string
) {
  const contract = HK_DEDICATED_DYNAMIC_RANGE_DOMAINS[domainId];
  if (!contract) throw new Error(`Unknown dedicated dynamic range domain ${String(domainId)}.`);
  if (labId !== undefined && contract.labId !== labId) {
    throw new Error(`Dynamic range domain ${domainId} belongs to ${contract.labId}, not ${labId}.`);
  }
  return contract;
}

export function getHkDedicatedDynamicRangeDomainForLab(labId: string) {
  return DYNAMIC_DOMAIN_BY_LAB_ID.get(labId) ?? null;
}

export function buildHkVisualizationRangeBoundaryEvidence(args: Readonly<{
  descriptors: readonly HkVisualizationRangeDomainDescriptor[];
  domainId: HkDedicatedDynamicRangeDomainId;
  labId: string;
  modeId: string;
}>) {
  const contract = getHkDedicatedDynamicRangeDomain(args.domainId, args.labId);
  const definition = DEFINITIONS.find((candidate) => candidate.domainId === args.domainId);
  if (!definition) throw new Error(`Missing boundary definition for ${args.domainId}.`);
  const baseState = stateFromDescriptors(args.descriptors);
  const activeControlIds = new Set(args.descriptors.map(({ controlId }) => controlId));
  if (!contract.isApplicable(args.modeId, activeControlIds)) return Object.freeze([]);
  for (const controlId of contract.requiredControlIds) {
    if (!activeControlIds.has(controlId)) {
      throw new Error(`${args.domainId} is active in ${args.modeId} but required range ${controlId} is missing.`);
    }
  }

  return Object.freeze(definition.boundaryRequests(args.descriptors, args.modeId).map((request) => {
    const startingState = withOverrides(baseState, request.startingOverrides ?? {});
    const requestedState = Object.freeze({ ...request.requestedOverrides });
    const canonical = contract.canonicalize({
      currentState: startingState,
      descriptors: args.descriptors,
      modeId: args.modeId,
      requestedState
    });
    return Object.freeze({
      boundaryId: request.boundaryId,
      canonicalState: canonical.canonicalState,
      domainId: args.domainId,
      expectedDescriptors: Object.freeze(args.descriptors.map((range) => (
        contract.descriptorFor(canonical.canonicalState, args.modeId, range)
      ))),
      projections: canonical.projections,
      requestedState,
      startingState,
      valid: canonical.valid
    } satisfies HkVisualizationRangeBoundaryEvidence);
  }));
}
