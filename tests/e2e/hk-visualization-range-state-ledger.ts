import {
  buildHkVisualizationRangeBoundaryEvidence,
  getHkDedicatedDynamicRangeDomain,
  type HkDedicatedDynamicRangeDomainId,
  type HkVisualizationRangeDescriptorExpectation,
  type HkVisualizationRangeProjectionEvidence,
} from "./hk-visualization-range-domains";
import {
  assertHkFractionBarRangeStatePlan,
  assertObservedHkFractionBarDescriptors,
  buildHkFractionBarRangeStatePlan,
  getHkFractionBarRangeDomain,
  HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS,
  HK_FRACTION_BAR_MODE_IDS,
  HK_FRACTION_BAR_RANGE_DOMAIN_ID,
  type HkFractionBarModeId,
  type HkFractionBarRangePlanEntry,
  type HkFractionBarRangeProjectionEvidence,
} from "./hk-visualization-fraction-range-domain";
import { createHash } from "node:crypto";
import { isProxy } from "node:util/types";
import {
  buildHkVisualizationDependentVisibleMathAggregateContract,
  buildHkVisualizationDependentVisibleMathContracts,
  type HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary,
  type HkVisualizationDependentVisibleMathAggregateContract,
  type HkVisualizationDependentVisibleMathAggregateObservation,
  type HkVisualizationDependentVisibleMathContract,
  type HkVisualizationDependentVisibleMathTheme,
} from "./hk-visualization-dependent-visible-math-contract";

/**
 * The fraction bar is intentionally a shared/pass-through range domain, not
 * a tenth entry in the dedicated range-domain registry. Keep this union local
 * to the executable ledger so the dedicated registry's public identity stays
 * exactly nine domains.
 */
export type HkExecutableDynamicRangeDomainId =
  HkDedicatedDynamicRangeDomainId | typeof HK_FRACTION_BAR_RANGE_DOMAIN_ID;

type HkExecutableRangeProjectionEvidence =
  HkVisualizationRangeProjectionEvidence | HkFractionBarRangeProjectionEvidence;

export type HkVisualizationRangeDescriptor = Readonly<{
  controlId: string;
  initial: number;
  maximum: number;
  minimum: number;
  step: number;
}>;

export const HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION =
  "hk-viz-pass-through-reset.v3" as const;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_TOPIC_COUNT = 7 as const;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_COUNT = 3 as const;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS = Object.freeze([
  "restoring",
  "canonical-noop",
] as const);

export type HkVisualizationPassThroughResetState = Readonly<{
  comparison: number;
  height: number;
  mode: number;
  value: number;
}>;

export type HkVisualizationPassThroughResetActionKind =
  (typeof HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_KINDS)[number];

export type HkVisualizationPassThroughResetActionPlanEntry = Readonly<{
  activationKey: "Enter" | "Space";
  actionKind: HkVisualizationPassThroughResetActionKind;
  actionIndex: number;
  expectedState: HkVisualizationPassThroughResetState;
  phase: "reset" | "reset-space" | "reset-space-idempotent";
}>;

export const HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS = Object.freeze([
  "public",
  "raw",
  "visible",
] as const);

export type HkVisualizationPassThroughResetLayerId =
  (typeof HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS)[number];

export type HkVisualizationPassThroughResetLayerPair = Readonly<{
  afterHash: string;
  beforeHash: string;
  layer: HkVisualizationPassThroughResetLayerId;
  pairHash: string;
}>;

export type HkVisualizationPassThroughResetObservation = Readonly<{
  activationKey: "Enter" | "Space";
  actionKind: HkVisualizationPassThroughResetActionKind;
  afterEndpoint: unknown;
  afterFingerprint: string;
  afterState: HkVisualizationPassThroughResetState;
  beforeEndpoint: unknown;
  beforeFingerprint: string;
  beforeState: HkVisualizationPassThroughResetState;
  canonicalFingerprint: string;
  expectedState: HkVisualizationPassThroughResetState;
  labId: string;
  layerEndpointHashCount: 6;
  layerPairs: readonly HkVisualizationPassThroughResetLayerPair[];
  layerReceiptCount: 3;
  phase: string;
}>;

/**
 * Independent browser-acceptance reset authority. This deliberately does not
 * import the production semantic-control table: a shared wrong fallback must
 * not be able to make both the UI and its release oracle agree.
 */
export const HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS = Object.freeze({
  "advanced-functions": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 5 }),
  calculus: Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "data-handling": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
  "differentiation-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "p2-multiplication-foundations": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 4 }),
  "p3-fractions-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "statistics-s1": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
} as const satisfies Readonly<Record<string, HkVisualizationPassThroughResetState>>);

export type HkVisualizationPassThroughResetPerturbation = Readonly<{
  beforeState: HkVisualizationPassThroughResetState;
  controlId: "comparison";
  selector: '[data-viz-parameter="comparison"]';
  targetValue: number;
}>;

/**
 * Independent A11 Reset precondition authority. These exact comparison targets
 * are intentionally literal and must never be derived from production reset
 * plans or from whichever enabled range happens to appear first in the DOM.
 */
export const HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS = Object.freeze({
  "advanced-functions": Object.freeze({
    beforeState: Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 0,
  }),
  calculus: Object.freeze({
    beforeState: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  }),
  "data-handling": Object.freeze({
    beforeState: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  }),
  "differentiation-intro": Object.freeze({
    beforeState: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  }),
  "p2-multiplication-foundations": Object.freeze({
    beforeState: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 4 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  }),
  "p3-fractions-intro": Object.freeze({
    beforeState: Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 0,
  }),
  "statistics-s1": Object.freeze({
    beforeState: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
    controlId: "comparison",
    selector: '[data-viz-parameter="comparison"]',
    targetValue: 1,
  }),
} as const satisfies Readonly<
  Record<string, HkVisualizationPassThroughResetPerturbation>
>);

export function planHkVisualizationPassThroughResetPrecondition(args: Readonly<{
  canonicalFingerprint: string;
  currentFingerprint: string;
  labId: string;
}>) {
  const perturbation = HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[
    args.labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS
  ];
  if (!perturbation) {
    throw new Error(`unknown pass-through Reset perturbation topic ${args.labId}`);
  }
  if (!args.canonicalFingerprint.trim()) {
    throw new Error("pass-through Reset canonical fingerprint must be nonblank");
  }
  return Object.freeze({
    canonicalFingerprint: args.canonicalFingerprint,
    expectedBeforeState: perturbation.beforeState,
    perturbation,
    requiresCanonicalRestore:
      args.currentFingerprint !== args.canonicalFingerprint,
  });
}

export function auditHkVisualizationPassThroughResetPrecondition(
  labId: string,
  observed: HkVisualizationPassThroughResetPerturbation,
): readonly string[] {
  const issues: string[] = [];
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[
    labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS
  ];
  if (!expected) return Object.freeze([`unknown pass-through Reset perturbation topic ${labId}`]);
  if (observed.selector !== expected.selector) {
    issues.push("pass-through Reset perturb selector drifted");
  }
  if (observed.controlId !== expected.controlId) {
    issues.push("pass-through Reset perturb control drifted");
  }
  if (observed.targetValue !== expected.targetValue) {
    issues.push("pass-through Reset perturb target drifted");
  }
  if (!samePassThroughResetState(observed.beforeState, expected.beforeState)) {
    issues.push("pass-through Reset perturb exact before tuple drifted");
  }
  return Object.freeze(issues);
}

export function hashHkVisualizationPassThroughResetLayerPair(
  pair: Readonly<{
    afterHash: string;
    beforeHash: string;
    layer: HkVisualizationPassThroughResetLayerId;
  }>,
) {
  return createHash("sha256")
    .update(JSON.stringify({
      afterHash: pair.afterHash,
      beforeHash: pair.beforeHash,
      contractVersion: HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
      kind: "pass-through-reset-layer-pair",
      layer: pair.layer,
    }))
    .digest("hex");
}

function samePassThroughResetState(
  left: HkVisualizationPassThroughResetState,
  right: HkVisualizationPassThroughResetState,
) {
  return left.comparison === right.comparison
    && left.height === right.height
    && left.mode === right.mode
    && left.value === right.value;
}

export function buildHkVisualizationPassThroughResetActionPlan(
  labId: string,
): readonly HkVisualizationPassThroughResetActionPlanEntry[] {
  const expectedState = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[
    labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS
  ];
  if (!expectedState) {
    throw new Error(`unknown pass-through Reset topic ${labId}`);
  }
  return Object.freeze([
    Object.freeze({
      activationKey: "Enter" as const,
      actionIndex: 0,
      actionKind: "restoring" as const,
      expectedState,
      phase: "reset" as const,
    }),
    Object.freeze({
      activationKey: "Space" as const,
      actionIndex: 1,
      actionKind: "restoring" as const,
      expectedState,
      phase: "reset-space" as const,
    }),
    Object.freeze({
      activationKey: "Space" as const,
      actionIndex: 2,
      actionKind: "canonical-noop" as const,
      expectedState,
      phase: "reset-space-idempotent" as const,
    }),
  ]);
}

export function auditHkVisualizationPassThroughResetObservation(
  observation: HkVisualizationPassThroughResetObservation,
): readonly string[] {
  const issues: string[] = [];
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[
    observation.labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS
  ];
  if (!expected) return Object.freeze([`unknown pass-through Reset topic ${observation.labId}`]);
  const action = buildHkVisualizationPassThroughResetActionPlan(
    observation.labId,
  ).find(({ activationKey, actionKind }) =>
    activationKey === observation.activationKey
    && actionKind === observation.actionKind
  );
  if (!action) {
    issues.push(`unknown Reset action identity for ${observation.phase}`);
  } else {
    const phaseMatches = action.actionIndex === 0
      ? observation.phase === action.phase
        || /^range-state:reset:hk-state:\d{5}$/.test(observation.phase)
      : observation.phase === action.phase;
    if (!phaseMatches) {
      issues.push(`Reset phase drifted for ${observation.activationKey}:${observation.actionKind}`);
    }
  }
  if (!samePassThroughResetState(observation.expectedState, expected)) {
    issues.push("expected Reset tuple drifted from the independent topic plan");
  }
  if (!samePassThroughResetState(observation.afterState, expected)) {
    issues.push("Reset after-state did not equal the independent topic plan");
  }
  if (
    typeof observation.canonicalFingerprint !== "string"
    || !observation.canonicalFingerprint.trim()
  ) {
    issues.push("Reset canonical fingerprint must be nonblank");
  }
  if (observation.afterFingerprint !== observation.canonicalFingerprint) {
    issues.push("Reset after fingerprint did not restore captured canonical fingerprint");
  }
  for (const [endpointName, endpoint] of [
    ["before", observation.beforeEndpoint],
    ["after", observation.afterEndpoint],
  ] as const) {
    if (
      endpoint === null
      || typeof endpoint !== "object"
      || Array.isArray(endpoint)
      || Object.getPrototypeOf(endpoint) !== Object.prototype
    ) {
      issues.push(`Reset ${endpointName} endpoint must be a plain object`);
    }
  }
  if (observation.layerReceiptCount !== 3) {
    issues.push("Reset layerReceiptCount must equal 3");
  }
  if (observation.layerEndpointHashCount !== 6) {
    issues.push("Reset layerEndpointHashCount must equal 6");
  }
  const layerPairs = Array.isArray(observation.layerPairs)
    ? observation.layerPairs
    : [];
  if (layerPairs.length !== HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS.length) {
    issues.push("Reset requires exact three ordered layer pairs");
  }
  const observedLayerIds = layerPairs.map((pair) => pair?.layer);
  if (
    new Set(observedLayerIds).size !== observedLayerIds.length
    || observedLayerIds.some(
      (layer, index) => layer !== HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS[index],
    )
  ) {
    issues.push("Reset layer pairs are duplicated or out of order");
  }
  for (const pair of layerPairs) {
    if (!pair || !HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS.includes(pair.layer)) {
      continue;
    }
    if (
      !/^[a-f0-9]{64}$/.test(pair.beforeHash)
      || !/^[a-f0-9]{64}$/.test(pair.afterHash)
    ) {
      issues.push(`${pair.layer} Reset layer endpoint hash drifted`);
      continue;
    }
    if (
      pair.pairHash !== hashHkVisualizationPassThroughResetLayerPair(pair)
    ) {
      issues.push(`${pair.layer} Reset layer pair hash drifted`);
    }
  }
  if (observation.actionKind === "restoring") {
    if (samePassThroughResetState(observation.beforeState, expected)) {
      issues.push("restoring action started canonical instead of deliberate noncanonical state");
    }
    const perturbation = HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[
      observation.labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS
    ];
    if (
      !perturbation
      || !samePassThroughResetState(
        observation.beforeState,
        perturbation.beforeState,
      )
    ) {
      issues.push("restoring action exact before tuple drifted");
    }
    if (observation.beforeFingerprint === observation.canonicalFingerprint) {
      issues.push("restoring action before fingerprint remained canonical");
    }
    for (const pair of layerPairs) {
      if (pair?.beforeHash === pair?.afterHash) {
        issues.push(`${pair.layer} restoring layer did not change across Reset`);
      }
    }
  } else if (!samePassThroughResetState(observation.beforeState, expected)) {
    issues.push("canonical no-op did not start canonical");
  } else if (!samePassThroughResetState(observation.beforeState, observation.afterState)) {
    issues.push("canonical no-op changed the Reset tuple");
  } else {
    if (observation.beforeFingerprint !== observation.canonicalFingerprint) {
      issues.push("canonical no-op before fingerprint was not canonical");
    }
    for (const pair of layerPairs) {
      if (pair?.beforeHash !== pair?.afterHash) {
        issues.push(`${pair.layer} canonical no-op layer endpoints drifted`);
      }
    }
  }
  return Object.freeze(issues);
}

const HK_DEPENDENT_TRANSITION_LIVE_RANGE_KEYS = Object.freeze([
  "initial",
  "maximum",
  "minimum",
  "step",
  "contractIndex",
  "controlId",
  "selector",
] as const);

export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS = Object.freeze({
  arrayItems: 512,
  cumulativeNodes: 20_000,
  cumulativeStringBytes: 262_144,
  diagnosticBytes: 768,
  hashPayloadBytes: 524_288,
  issues: 64,
  stringBytes: 8_192,
  visibleAttributeBytes: 256,
  visibleAttributes: 16,
  visibleElements: 8,
  visiblePaintedSubtreeAttributes: 32,
  visiblePaintedSubtreeElements: 320,
  visiblePaintedSubtreePayloadBytes: 131_072,
  visiblePaintedSubtreeTextBytes: 4_096,
  visiblePaintedSubtreeTextNodes: 256,
  visibleTextBytes: 512,
} as const);

function assertCumulativeDependentTransitionSchemaBudget(
  label: string,
  root: unknown,
) {
  const stack: unknown[] = [root];
  let observedNodes = 0;
  let observedStringBytes = 0;
  while (stack.length > 0) {
    const candidate = stack.pop();
    observedNodes += 1;
    if (
      observedNodes >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.cumulativeNodes
    ) {
      throw new Error(`${label} exact schema cumulative node budget exceeded.`);
    }
    if (typeof candidate === "string") {
      observedStringBytes += Buffer.byteLength(candidate, "utf8");
      if (
        observedStringBytes >
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .cumulativeStringBytes
      ) {
        throw new Error(`${label} exact schema cumulative string budget exceeded.`);
      }
      continue;
    }
    if (
      candidate === null ||
      typeof candidate === "number" ||
      typeof candidate === "boolean" ||
      typeof candidate === "undefined"
    ) continue;
    if (Array.isArray(candidate)) {
      assertDenseArray(`${label}.array`, candidate);
      for (let index = candidate.length - 1; index >= 0; index -= 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          candidate,
          String(index),
        );
        if (!descriptor || !("value" in descriptor)) {
          throw new Error(`${label} exact schema cumulative array entry drifted.`);
        }
        stack.push(descriptor.value);
      }
      continue;
    }
    if (typeof candidate === "object") {
      const keys = exactOwnEnumerableDataKeys(`${label}.object`, candidate);
      if (keys.length > 32) {
        throw new Error(`${label} exact schema cumulative object-key budget exceeded.`);
      }
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        observedStringBytes += Buffer.byteLength(key, "utf8");
        if (
          observedStringBytes >
          HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
            .cumulativeStringBytes
        ) {
          throw new Error(`${label} exact schema cumulative string budget exceeded.`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !("value" in descriptor)) {
          throw new Error(`${label} exact schema cumulative property drifted.`);
        }
        stack.push(descriptor.value);
      }
      continue;
    }
    throw new Error(`${label} exact schema cumulative value type is unsupported.`);
  }
}

/**
 * Fail-closed boundary between the browser helper's runtime range inventory
 * and the five-field domain descriptor contract. Runtime-only ownership
 * metadata is validated here and is never copied into producer expectations.
 */
export function projectExactHkDependentTransitionLiveRangeDescriptors(args: Readonly<{
  contractControlIds: readonly string[];
  contractSelectors: readonly string[];
  liveRanges: unknown;
}>): readonly HkVisualizationRangeDescriptor[] {
  assertCumulativeDependentTransitionSchemaBudget(
    "dependent-transition live range projection",
    args,
  );
  assertDenseArray(
    "dependent-transition contract control IDs",
    args.contractControlIds,
  );
  assertDenseArray(
    "dependent-transition contract selectors",
    args.contractSelectors,
  );
  args.contractControlIds.forEach((controlId, index) =>
    assertStringValue(
      `dependent-transition contract control IDs[${index}]`,
      controlId,
    )
  );
  args.contractSelectors.forEach((selector, index) =>
    assertStringValue(
      `dependent-transition contract selectors[${index}]`,
      selector,
    )
  );
  if (new Set(args.contractControlIds).size !== args.contractControlIds.length) {
    throw new Error(
      "Dependent-transition contract control IDs must be unique.",
    );
  }
  if (new Set(args.contractSelectors).size !== args.contractSelectors.length) {
    throw new Error(
      "Dependent-transition contract selectors must be unique.",
    );
  }
  assertDenseArray("dependent-transition live ranges", args.liveRanges);
  if (args.contractControlIds.length !== args.contractSelectors.length) {
    throw new Error(
      "Dependent-transition contract controlId/selector lists must have equal length.",
    );
  }
  let previousContractIndex = -1;
  const seen = new Set<number>();
  return Object.freeze(args.liveRanges.map((candidate, listIndex) => {
    assertExactPlainObjectKeySet(
      `dependent-transition live range[${listIndex}]`,
      candidate,
      HK_DEPENDENT_TRANSITION_LIVE_RANGE_KEYS,
    );
    const range = candidate as Record<
      (typeof HK_DEPENDENT_TRANSITION_LIVE_RANGE_KEYS)[number],
      unknown
    >;
    for (const key of ["initial", "maximum", "minimum", "step"] as const) {
      if (
        typeof range[key] !== "number" ||
        !Number.isFinite(range[key]) ||
        Object.is(range[key], -0)
      ) {
        throw new Error(
          `Dependent-transition live range[${listIndex}].${key} must be finite and must not be negative zero.`,
        );
      }
    }
    if (
      typeof range.contractIndex !== "number" ||
      !Number.isInteger(range.contractIndex) ||
      range.contractIndex < 0 ||
      seen.has(range.contractIndex) ||
      range.contractIndex <= previousContractIndex
    ) {
      throw new Error(
        `Dependent-transition live range[${listIndex}] contractIndex must be unique, nonnegative, and strictly increasing.`,
      );
    }
    if (
      typeof range.controlId !== "string" ||
      range.controlId !== args.contractControlIds[range.contractIndex]
    ) {
      throw new Error(
        `Dependent-transition live range[${listIndex}] controlId does not match the static contract index.`,
      );
    }
    if (
      typeof range.selector !== "string" ||
      range.selector !== args.contractSelectors[range.contractIndex]
    ) {
      throw new Error(
        `Dependent-transition live range[${listIndex}] selector does not match the static contract index.`,
      );
    }
    seen.add(range.contractIndex);
    previousContractIndex = range.contractIndex;
    const initial = range.initial as number;
    const maximum = range.maximum as number;
    const minimum = range.minimum as number;
    const step = range.step as number;
    return Object.freeze({
      controlId: range.controlId,
      initial,
      maximum,
      minimum,
      step,
    });
  }));
}

export type HkVisualizationRangeStateReason =
  | `mode:${string}:base`
  | `control:${string}:minimum`
  | `control:${string}:midpoint`
  | `control:${string}:maximum`
  | `endpoint-combination:${number}`
  | `domain-boundary:${string}`
  | `semantic-boundary:${string}`;

export type HkVisualizationRangeStateValue = Readonly<{
  controlId: string;
  value: number;
}>;

export type HkVisualizationRangeApplicationAction = Readonly<{
  affectedControlIds: readonly string[];
  allowProjectedAbsence: boolean;
  controlId: string;
  expectedValue: number;
  projectedAbsenceRequirements: Readonly<{
    controllerMustPrecede: true;
    expectedFixedValue: number;
    expectedVisibility: "fixed";
    projection: "clamp-and-visibility";
    requireExactControllerMetadata: true;
    requireExactlyOneFixedParameterNode: true;
    requireSerializedStateMatch: true;
  }> | null;
  projectedByControllerIds: readonly string[];
  requestedValue: number;
}>;

export type HkVisualizationRangePlanDescriptorExpectation = Readonly<
  Omit<HkVisualizationRangeDescriptorExpectation, "domainId"> & {
    domainId: HkExecutableDynamicRangeDomainId | null;
  }
>;

export type HkVisualizationRangeStatePlanEntry = Readonly<{
  actionSignature: string;
  applicationOrder: readonly string[];
  actions: readonly HkVisualizationRangeApplicationAction[];
  boundaryIds: readonly string[];
  domainId: HkExecutableDynamicRangeDomainId | null;
  expectedSignature: string;
  expectedDescriptors: readonly HkVisualizationRangePlanDescriptorExpectation[];
  expectedValues: readonly HkVisualizationRangeStateValue[];
  id: string;
  projectionEvidence: readonly HkExecutableRangeProjectionEvidence[];
  reasons: readonly HkVisualizationRangeStateReason[];
  requestedSignature: string;
  requestedValues: readonly HkVisualizationRangeStateValue[];
  signature: string;
  startingSignature: string;
  startingValues: readonly HkVisualizationRangeStateValue[];
  values: readonly HkVisualizationRangeStateValue[];
}>;

/**
 * Chronological dependent-control evidence is deliberately separate from the
 * canonical range-state ledger. The configured P3 fraction bar is
 * intentionally excluded here because its existing chained 0..d inclusive
 * contract already proves denominator clamp/no-resurrection independently.
 * Folding it into this receipt would weaken that exact configured contract and
 * would change the canonical 918-cell state identities.
 */
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION =
  // v8 preserves v7 theme/paint/privacy semantics while making compact
  // ancestry/scale evidence durable at aggregate receipt level and binding
  // tag-aware computed SVG geometry from external CSS.
  "hk-viz-dependent-transition-sequence.v8" as const;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_EXPECTED_COUNT =
  11 as const;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_DEADLINE_BUDGET_MS =
  15_000 as const;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB =
  Object.freeze({
    "p1-counting-number-bonds": 1,
    "p1-addition-subtraction": 2,
    "p2-money-time": 1,
    "p4-large-numbers": 1,
    "p5-fractions-operations": 3,
    "p5-volume": 1,
    "identities-square-patterns": 2,
  } as const);
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS = Object.freeze([
  "pre",
  "clamp",
  "expand",
] as const);

export type HkVisualizationDependentTransitionPhaseId =
  (typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS)[number];

export type HkVisualizationDependentTransitionSequenceId =
  | "p1-number-bond-known-part"
  | "p1-add-step"
  | "p1-subtract-step"
  | "p2-payment-at-least-price"
  | "p4-divisor-within-number"
  | "p5-first-proper-fraction"
  | "p5-second-proper-fraction"
  | "p5-third-proper-fraction"
  | "p5-visible-volume-layers"
  | "s3-identity-a-projects-b"
  | "s3-identity-b-projects-a";

export type HkVisualizationDependentTransitionAction = Readonly<{
  controlId: string;
  requestedValue: number;
}>;

export type HkVisualizationDependentTransitionVisibleBinding = Readonly<{
  attribute: string;
  expectedValue: string;
  occurrence: number;
  vizName: string;
}>;

export type HkVisualizationDependentTransitionVisibleTextContract = Readonly<{
  expectedTexts: Readonly<{
    en: string;
    zh: string;
    "zh-Hans": string;
  }>;
  occurrence: number;
  vizName: string;
}>;

export type HkVisualizationDependentTransitionLanguage =
  | "en"
  | "zh"
  | "zh-Hans";

export type HkVisualizationDependentTransitionRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

export type HkVisualizationDependentTransitionSurfaceObservation = Readonly<{
  renderedSize: Readonly<{
    height: number;
    width: number;
  }>;
  scrollport: Readonly<{
    clientHeight: number;
    clientWidth: number;
    maxScrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
  }>;
  tagName: "svg";
  viewBox: HkVisualizationDependentTransitionRect;
}>;

export type HkVisualizationDependentTransitionPhasePlan = Readonly<{
  actions: readonly HkVisualizationDependentTransitionAction[];
  expectedDescriptors: readonly HkVisualizationRangePlanDescriptorExpectation[];
  expectedPublicState: readonly Readonly<{
    key: string;
    value: boolean | number | string;
  }>[];
  expectedStateSignature: string;
  expectedValues: readonly HkVisualizationRangeStateValue[];
  id: string;
  phase: HkVisualizationDependentTransitionPhaseId;
  resetCountSincePreviousPhase: 0 | 1;
  visibleMathProjectionContract: HkVisualizationDependentVisibleMathAggregateContract;
  visibleBindings: readonly HkVisualizationDependentTransitionVisibleBinding[];
  visibleMathContracts: readonly HkVisualizationDependentVisibleMathContract[];
  visibleSelector: string;
  visibleTextContracts: readonly HkVisualizationDependentTransitionVisibleTextContract[];
}>;

export type HkVisualizationDependentTransitionSequencePlan = Readonly<{
  controllerControlId: string;
  dependentControlId: string;
  descriptorEnvelope: readonly HkVisualizationRangeDescriptor[];
  expectedLiveDescriptors: readonly HkVisualizationRangeDescriptor[];
  domainId: HkDedicatedDynamicRangeDomainId;
  labId: string;
  modePreparation: readonly Readonly<{
    groupId: string;
    modeId: string;
  }>[];
  modeId: string;
  phases: readonly HkVisualizationDependentTransitionPhasePlan[];
  planHash: string;
  postSequenceRestoration: Readonly<{
    expectedDescriptors: readonly HkVisualizationRangePlanDescriptorExpectation[];
    expectedPublicState: readonly Readonly<{
      key: string;
      value: boolean | number | string;
    }>[];
    expectedStateSignature: string;
    expectedValues: readonly HkVisualizationRangeStateValue[];
    modeId: string;
    resetClickCount: 1;
    visibleMathProjectionContract: HkVisualizationDependentVisibleMathAggregateContract;
    visibleBindings: readonly HkVisualizationDependentTransitionVisibleBinding[];
    visibleMathContracts: readonly HkVisualizationDependentVisibleMathContract[];
    visibleSelector: string;
    visibleTextContracts: readonly HkVisualizationDependentTransitionVisibleTextContract[];
  }>;
  schemaVersion: typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION;
  sequenceId: HkVisualizationDependentTransitionSequenceId;
}>;

export type HkVisualizationDependentTransitionControlObservation = Readonly<{
  controlId: string;
  descriptor: HkVisualizationRangePlanDescriptorExpectation;
  value: number;
}>;

export type HkVisualizationDependentTransitionVisibleElementObservation =
  Readonly<{
    attributes: readonly (readonly [string, string])[];
    learnerVisible: boolean;
    paintedSubtree: Readonly<{
      elementCount: number;
      hash: string;
    }>;
    renderedGeometry: HkVisualizationDependentTransitionRect;
    tagName: string;
    textHash: string;
    userGeometry: HkVisualizationDependentTransitionRect;
  }>;

export type HkVisualizationDependentTransitionPhaseObservation = Readonly<{
  controls: readonly HkVisualizationDependentTransitionControlObservation[];
  id: string;
  phase: HkVisualizationDependentTransitionPhaseId;
  rawSerializedPublicState: string;
  resetCountSincePreviousPhase: number;
  stateSignature: string;
  surface: HkVisualizationDependentTransitionSurfaceObservation;
  visibleElements: readonly HkVisualizationDependentTransitionVisibleElementObservation[];
  visibleMathProjection: HkVisualizationDependentVisibleMathAggregateObservation;
}>;

export type HkVisualizationDependentTransitionCanonicalVisibleBaseline =
  Readonly<{
    baselineHash: string;
    canonicalFingerprint: string;
    cellId: string;
    language: HkVisualizationDependentTransitionLanguage;
    planHash: string;
    sequenceId: HkVisualizationDependentTransitionSequenceId;
    surface: HkVisualizationDependentTransitionSurfaceObservation;
    visibleElements: readonly HkVisualizationDependentTransitionVisibleElementObservation[];
    visibleMathProjection: HkVisualizationDependentVisibleMathAggregateObservation;
    theme: HkVisualizationDependentVisibleMathTheme;
  }>;

export type HkVisualizationDependentTransitionRestorationObservation = Readonly<{
  afterFingerprint: string;
  beforeFingerprint: string;
  canonicalFingerprint: string;
  controls: readonly HkVisualizationDependentTransitionControlObservation[];
  rawSerializedPublicState: string;
  resetClickCount: number;
  stateSignature: string;
  canonicalVisibleBaselineHash: string;
  surface: HkVisualizationDependentTransitionSurfaceObservation;
  visibleElements: readonly HkVisualizationDependentTransitionVisibleElementObservation[];
  visibleMathProjection: HkVisualizationDependentVisibleMathAggregateObservation;
}>;

export type HkVisualizationDependentTransitionSequenceObservation = Readonly<{
  cellId: string;
  canonicalVisibleBaseline: HkVisualizationDependentTransitionCanonicalVisibleBaseline;
  domainId: HkDedicatedDynamicRangeDomainId;
  labId: string;
  language: HkVisualizationDependentTransitionLanguage;
  modePreparation: readonly Readonly<{
    groupId: string;
    modeId: string;
  }>[];
  modeId: string;
  observationHash: string;
  phases: readonly HkVisualizationDependentTransitionPhaseObservation[];
  planHash: string;
  postSequenceRestoration: HkVisualizationDependentTransitionRestorationObservation;
  schemaVersion: typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION;
  sequenceId: HkVisualizationDependentTransitionSequenceId;
  theme: HkVisualizationDependentVisibleMathTheme;
}>;

type HkVisualizationDependentTransitionDefinition = Readonly<{
  clamp: HkVisualizationDependentTransitionAction;
  controllerControlId: string;
  dependentControlId: string;
  domainId: HkDedicatedDynamicRangeDomainId;
  envelopeMaximums: Readonly<Record<string, number>>;
  expand: HkVisualizationDependentTransitionAction;
  labId: string;
  modePreparation: readonly Readonly<{
    groupId: string;
    modeId: string;
  }>[];
  modeId: string;
  pre: readonly HkVisualizationDependentTransitionAction[];
  sequenceId: HkVisualizationDependentTransitionSequenceId;
}>;

function freezeDependentTransitionDescriptors(
  descriptors: readonly HkVisualizationRangeDescriptor[],
) {
  return Object.freeze(descriptors.map((descriptor) => Object.freeze({ ...descriptor })));
}

const HK_P5_PROPER_FRACTION_EXPECTED_LIVE_DESCRIPTORS =
  freezeDependentTransitionDescriptors([
    { controlId: "firstNumerator", initial: 1, maximum: 1, minimum: 0, step: 1 },
    { controlId: "firstDenominator", initial: 2, maximum: 6, minimum: 2, step: 1 },
    { controlId: "secondNumerator", initial: 1, maximum: 2, minimum: 0, step: 1 },
    { controlId: "secondDenominator", initial: 3, maximum: 6, minimum: 2, step: 1 },
    { controlId: "thirdNumerator", initial: 1, maximum: 3, minimum: 0, step: 1 },
    { controlId: "thirdDenominator", initial: 4, maximum: 6, minimum: 2, step: 1 },
  ]);

export const HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS =
  Object.freeze({
    "p1-number-bond-known-part": freezeDependentTransitionDescriptors([
      { controlId: "total", initial: 12, maximum: 20, minimum: 0, step: 1 },
      { controlId: "knownPart", initial: 7, maximum: 12, minimum: 0, step: 1 },
    ]),
    "p1-add-step": freezeDependentTransitionDescriptors([
      { controlId: "start", initial: 6, maximum: 20, minimum: 0, step: 1 },
      { controlId: "step", initial: 5, maximum: 14, minimum: 0, step: 1 },
    ]),
    "p1-subtract-step": freezeDependentTransitionDescriptors([
      { controlId: "start", initial: 6, maximum: 20, minimum: 0, step: 1 },
      { controlId: "step", initial: 5, maximum: 6, minimum: 0, step: 1 },
    ]),
    "p2-payment-at-least-price": freezeDependentTransitionDescriptors([
      { controlId: "price", initial: 32, maximum: 99, minimum: 1, step: 1 },
      { controlId: "payment", initial: 50, maximum: 100, minimum: 32, step: 1 },
    ]),
    "p4-divisor-within-number": freezeDependentTransitionDescriptors([
      { controlId: "firstNumber", initial: 24, maximum: 60, minimum: 1, step: 1 },
      { controlId: "candidateDivisor", initial: 6, maximum: 24, minimum: 1, step: 1 },
    ]),
    "p5-first-proper-fraction": HK_P5_PROPER_FRACTION_EXPECTED_LIVE_DESCRIPTORS,
    "p5-second-proper-fraction": HK_P5_PROPER_FRACTION_EXPECTED_LIVE_DESCRIPTORS,
    "p5-third-proper-fraction": HK_P5_PROPER_FRACTION_EXPECTED_LIVE_DESCRIPTORS,
    "p5-visible-volume-layers": freezeDependentTransitionDescriptors([
      { controlId: "length", initial: 4, maximum: 5, minimum: 1, step: 1 },
      { controlId: "width", initial: 3, maximum: 4, minimum: 1, step: 1 },
      { controlId: "height", initial: 3, maximum: 4, minimum: 1, step: 1 },
      { controlId: "visibleLayers", initial: 2, maximum: 3, minimum: 1, step: 1 },
    ]),
    "s3-identity-a-projects-b": freezeDependentTransitionDescriptors([
      { controlId: "a", initial: 6, maximum: 10, minimum: 2, step: 1 },
      { controlId: "b", initial: 2, maximum: 9, minimum: 1, step: 1 },
    ]),
    "s3-identity-b-projects-a": freezeDependentTransitionDescriptors([
      { controlId: "a", initial: 6, maximum: 10, minimum: 2, step: 1 },
      { controlId: "b", initial: 2, maximum: 9, minimum: 1, step: 1 },
    ]),
  } satisfies Readonly<Record<
    HkVisualizationDependentTransitionSequenceId,
    readonly HkVisualizationRangeDescriptor[]
  >>);

const HK_VISUALIZATION_DEPENDENT_TRANSITION_DEFINITIONS = Object.freeze(([
  {
    clamp: { controlId: "total", requestedValue: 0 },
    controllerControlId: "total",
    dependentControlId: "knownPart",
    domainId: "number-bond-v1",
    envelopeMaximums: { knownPart: 20 },
    expand: { controlId: "total", requestedValue: 20 },
    labId: "p1-counting-number-bonds",
    modePreparation: [],
    modeId: "__default__",
    pre: [
      { controlId: "total", requestedValue: 20 },
      { controlId: "knownPart", requestedValue: 20 },
    ],
    sequenceId: "p1-number-bond-known-part",
  },
  {
    clamp: { controlId: "start", requestedValue: 20 },
    controllerControlId: "start",
    dependentControlId: "step",
    domainId: "bounded-step-v1",
    envelopeMaximums: { step: 20 },
    expand: { controlId: "start", requestedValue: 0 },
    labId: "p1-addition-subtraction",
    modePreparation: [{ groupId: "operation", modeId: "add" }],
    modeId: "add",
    pre: [
      { controlId: "start", requestedValue: 0 },
      { controlId: "step", requestedValue: 20 },
    ],
    sequenceId: "p1-add-step",
  },
  {
    clamp: { controlId: "start", requestedValue: 0 },
    controllerControlId: "start",
    dependentControlId: "step",
    domainId: "bounded-step-v1",
    envelopeMaximums: { step: 20 },
    expand: { controlId: "start", requestedValue: 20 },
    labId: "p1-addition-subtraction",
    modePreparation: [{ groupId: "operation", modeId: "subtract" }],
    modeId: "subtract",
    pre: [
      { controlId: "start", requestedValue: 20 },
      { controlId: "step", requestedValue: 20 },
    ],
    sequenceId: "p1-subtract-step",
  },
  {
    clamp: { controlId: "price", requestedValue: 99 },
    controllerControlId: "price",
    dependentControlId: "payment",
    domainId: "payment-at-least-price-v1",
    envelopeMaximums: { payment: 100 },
    expand: { controlId: "price", requestedValue: 1 },
    labId: "p2-money-time",
    modePreparation: [{ groupId: "model", modeId: "money" }],
    modeId: "money",
    pre: [
      { controlId: "price", requestedValue: 1 },
      { controlId: "payment", requestedValue: 1 },
    ],
    sequenceId: "p2-payment-at-least-price",
  },
  {
    clamp: { controlId: "firstNumber", requestedValue: 1 },
    controllerControlId: "firstNumber",
    dependentControlId: "candidateDivisor",
    domainId: "divisor-within-number-v1",
    envelopeMaximums: { candidateDivisor: 60 },
    expand: { controlId: "firstNumber", requestedValue: 60 },
    labId: "p4-large-numbers",
    modePreparation: [{ groupId: "model", modeId: "factor-pairs" }],
    modeId: "factor-pairs",
    pre: [
      { controlId: "firstNumber", requestedValue: 60 },
      { controlId: "candidateDivisor", requestedValue: 60 },
    ],
    sequenceId: "p4-divisor-within-number",
  },
  ...(["first", "second", "third"] as const).map((prefix) => ({
    clamp: { controlId: `${prefix}Denominator`, requestedValue: 2 },
    controllerControlId: `${prefix}Denominator`,
    dependentControlId: `${prefix}Numerator`,
    domainId: "proper-fractions-v1" as const,
    envelopeMaximums: { [`${prefix}Numerator`]: 5 },
    expand: { controlId: `${prefix}Denominator`, requestedValue: 6 },
    labId: "p5-fractions-operations",
    modePreparation: [
      { groupId: "operation", modeId: "subtract" },
      { groupId: "term-count", modeId: "three" },
    ],
    modeId: "three",
    pre: [
      { controlId: `${prefix}Denominator`, requestedValue: 6 },
      { controlId: `${prefix}Numerator`, requestedValue: 5 },
    ],
    sequenceId: `p5-${prefix}-proper-fraction` as HkVisualizationDependentTransitionSequenceId,
  })),
  {
    clamp: { controlId: "height", requestedValue: 1 },
    controllerControlId: "height",
    dependentControlId: "visibleLayers",
    domainId: "visible-layers-v1",
    envelopeMaximums: { visibleLayers: 4 },
    expand: { controlId: "height", requestedValue: 4 },
    labId: "p5-volume",
    modePreparation: [],
    modeId: "__default__",
    pre: [
      { controlId: "height", requestedValue: 4 },
      { controlId: "visibleLayers", requestedValue: 4 },
    ],
    sequenceId: "p5-visible-volume-layers",
  },
  {
    clamp: { controlId: "a", requestedValue: 2 },
    controllerControlId: "a",
    dependentControlId: "b",
    domainId: "identity-positive-a-gt-b-v1",
    envelopeMaximums: {},
    expand: { controlId: "a", requestedValue: 10 },
    labId: "identities-square-patterns",
    modePreparation: [{ groupId: "model", modeId: "square-sum" }],
    modeId: "square-sum",
    pre: [
      { controlId: "a", requestedValue: 10 },
      { controlId: "b", requestedValue: 9 },
    ],
    sequenceId: "s3-identity-a-projects-b",
  },
  {
    clamp: { controlId: "b", requestedValue: 9 },
    controllerControlId: "b",
    dependentControlId: "a",
    domainId: "identity-positive-a-gt-b-v1",
    envelopeMaximums: {},
    expand: { controlId: "b", requestedValue: 1 },
    labId: "identities-square-patterns",
    modePreparation: [{ groupId: "model", modeId: "square-sum" }],
    modeId: "square-sum",
    pre: [
      { controlId: "a", requestedValue: 2 },
      { controlId: "b", requestedValue: 1 },
    ],
    sequenceId: "s3-identity-b-projects-a",
  },
] as unknown) as readonly HkVisualizationDependentTransitionDefinition[]);

if (
  HK_VISUALIZATION_DEPENDENT_TRANSITION_DEFINITIONS.length !==
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_EXPECTED_COUNT
) {
  throw new Error("Dependent-transition definition cardinality drifted from exact 11.");
}

export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_IDS = Object.freeze(
  HK_VISUALIZATION_DEPENDENT_TRANSITION_DEFINITIONS.map(({ sequenceId }) =>
    sequenceId,
  ),
);

export function hkVisualizationDependentTransitionSequenceIdsForLab(
  labId: string,
) {
  return Object.freeze(
    HK_VISUALIZATION_DEPENDENT_TRANSITION_DEFINITIONS
      .filter((definition) => definition.labId === labId)
      .map(({ sequenceId }) => sequenceId),
  );
}

export function hkVisualizationDependentTransitionSequenceCountForLab(
  labId: string,
) {
  return HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB[
    labId as keyof typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB
  ] ?? 0;
}

export function hkVisualizationDependentTransitionDeadlineBudgetMs(
  labId?: string,
) {
  const sequenceCount = labId === undefined
    ? Math.max(
        ...Object.values(
          HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_COUNT_BY_LAB,
        ),
      )
    : hkVisualizationDependentTransitionSequenceCountForLab(labId);
  return sequenceCount *
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_DEADLINE_BUDGET_MS;
}

function sha256Json(value: unknown) {
  const hash = createHash("sha256");
  let payloadBytes = 0;
  const update = (chunk: string) => {
    payloadBytes += Buffer.byteLength(chunk, "utf8");
    if (
      payloadBytes >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.hashPayloadBytes
    ) {
      throw new Error(
        "Dependent-transition hash payload exceeded the exact schema byte limit.",
      );
    }
    hash.update(chunk);
  };
  const visit = (candidate: unknown): void => {
    if (candidate === null) {
      update("null");
      return;
    }
    if (typeof candidate === "string") {
      update(JSON.stringify(candidate));
      return;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate) || Object.is(candidate, -0)) {
        throw new Error(
          "Dependent-transition hash payload rejects non-finite numbers and negative zero.",
        );
      }
      update(JSON.stringify(candidate));
      return;
    }
    if (typeof candidate === "boolean") {
      update(candidate ? "true" : "false");
      return;
    }
    if (Array.isArray(candidate)) {
      update("[");
      for (let index = 0; index < candidate.length; index += 1) {
        if (index > 0) update(",");
        visit(candidate[index]);
      }
      update("]");
      return;
    }
    if (typeof candidate === "object") {
      const keys = Object.keys(candidate);
      update("{");
      for (let index = 0; index < keys.length; index += 1) {
        if (index > 0) update(",");
        const key = keys[index];
        update(JSON.stringify(key));
        update(":");
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !("value" in descriptor)) {
          throw new Error(
            "Dependent-transition hash payload requires own data properties.",
          );
        }
        visit(descriptor.value);
      }
      update("}");
      return;
    }
    throw new Error(
      "Dependent-transition hash payload contains an unsupported value type.",
    );
  };
  visit(value);
  return hash.digest("hex");
}

export function fingerprintHkVisualizationDependentTransitionDiagnostic(
  value: string,
) {
  return `bytes=${Buffer.byteLength(value, "utf8")},sha256=${createHash("sha256").update(value).digest("hex")}`;
}

/**
 * Untrusted browser/runtime diagnostics must never be copied into durable
 * failure receipts. Keep only a bounded length + digest fingerprint.
 */
export function sanitizeHkVisualizationDiagnosticText(value: string) {
  return fingerprintHkVisualizationDependentTransitionDiagnostic(value);
}

/** Fingerprint the complete URL; retain no origin, path, query, or fragment. */
export function sanitizeHkVisualizationDiagnosticUrl(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const HK_VISUALIZATION_STANDARD_DIAGNOSTIC_METHODS = Object.freeze(new Set([
  "CONNECT", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT",
  "TRACE",
] as const));

const HK_VISUALIZATION_DIAGNOSTIC_KINDS = Object.freeze(new Set([
  "bad-response", "console-error", "page-error", "request-failed",
] as const));

const HK_VISUALIZATION_DIAGNOSTIC_RESOURCE_TYPES = Object.freeze(new Set([
  "console", "diagnostic-limit", "document", "eventsource", "fetch", "font",
  "image", "manifest", "media", "other", "script", "stylesheet", "texttrack",
  "websocket", "xhr",
] as const));

const HK_VISUALIZATION_DIAGNOSTIC_PHASES = Object.freeze(new Set([
  "bootstrap", "contract:language-theme", "diagnostics:cardinality",
  "interactions", "manifest-contract", "navigation", "preferences:language",
  "preferences:theme", "readiness:active-lab", "readiness:panel",
  "readiness:workspace", "route-contract", "surface-contract",
] as const));

export type HkVisualizationDurableDiagnostic = Readonly<{
  kind: "bad-response" | "console-error" | "page-error" | "request-failed";
  message: string;
  method?: "CONNECT" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "OTHER" |
    "PATCH" | "POST" | "PUT" | "TRACE";
  methodBytes?: number;
  methodSha256?: string;
  phase: string;
  resourceType?: string;
  status?: number;
  url?: string;
}>;

function safeHkVisualizationDiagnosticLabel(
  kind: "phase" | "resource",
  value: string,
) {
  return `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 55)}`;
}

/**
 * The sole constructor for diagnostics retained in durable cell results.
 * It never echoes an untrusted message, URL, nonstandard method, phase, or
 * resource type, and it emits at most nine bounded fields.
 */
export function constructHkVisualizationDiagnostic(input: Readonly<{
  kind: HkVisualizationDurableDiagnostic["kind"];
  message: string;
  method?: string;
  phase: string;
  resourceType?: string;
  status?: number;
  url?: string;
}>): HkVisualizationDurableDiagnostic {
  if (!HK_VISUALIZATION_DIAGNOSTIC_KINDS.has(input.kind)) {
    throw new Error("Diagnostic kind is outside the fixed durable enum.");
  }
  const method = input.method === undefined ? undefined :
    HK_VISUALIZATION_STANDARD_DIAGNOSTIC_METHODS.has(
      input.method as "CONNECT",
    ) ? input.method as Exclude<HkVisualizationDurableDiagnostic["method"], "OTHER" | undefined> :
      "OTHER" as const;
  if (
    input.status !== undefined &&
    (!Number.isSafeInteger(input.status) || input.status < 100 || input.status > 599)
  ) {
    throw new Error("Diagnostic HTTP status is outside the bounded integer range.");
  }
  const resourceType = input.resourceType === undefined ? undefined :
    HK_VISUALIZATION_DIAGNOSTIC_RESOURCE_TYPES.has(
      input.resourceType as "other",
    ) ? input.resourceType :
      safeHkVisualizationDiagnosticLabel("resource", input.resourceType);
  const arbitraryMethod = input.method !== undefined && method === "OTHER";
  return Object.freeze({
    kind: input.kind,
    message: `message{${sanitizeHkVisualizationDiagnosticText(input.message)}}`,
    ...(method === undefined ? {} : { method }),
    ...(arbitraryMethod ? {
      methodBytes: Buffer.byteLength(input.method!, "utf8"),
      methodSha256: createHash("sha256").update(input.method!).digest("hex"),
    } : {}),
    phase: HK_VISUALIZATION_DIAGNOSTIC_PHASES.has(
      input.phase as "bootstrap",
    ) ? input.phase : safeHkVisualizationDiagnosticLabel("phase", input.phase),
    ...(resourceType === undefined ? {} : { resourceType }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.url === undefined ? {} : {
      url: sanitizeHkVisualizationDiagnosticUrl(input.url),
    }),
  });
}

function safeDiagnosticFingerprint(value: string) {
  return fingerprintHkVisualizationDependentTransitionDiagnostic(value);
}

function safeStringListFingerprint(values: readonly string[]) {
  const hash = createHash("sha256");
  hash.update(`count=${values.length}\u0000`);
  for (const value of values) {
    hash.update(`${Buffer.byteLength(value, "utf8")}\u0000`);
    hash.update(value);
    hash.update("\u0000");
  }
  return `count=${values.length},sha256=${hash.digest("hex")}`;
}

function safeJsonDiagnosticFingerprint(value: unknown) {
  try {
    const serialized = JSON.stringify(value);
    return safeDiagnosticFingerprint(
      serialized === undefined ? "<undefined>" : serialized,
    );
  } catch {
    return "unserializable=true";
  }
}

function boundedDiagnostic(message: string) {
  if (
    Buffer.byteLength(message, "utf8") <=
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.diagnosticBytes
  ) return message;
  return `Dependent-transition diagnostic exceeded the byte limit (${safeDiagnosticFingerprint(message)}).`;
}

function finalizeDependentTransitionIssues(issues: readonly string[]) {
  const exact = issues.slice(
    0,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.issues,
  ).map(boundedDiagnostic);
  if (
    issues.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.issues
  ) {
    exact[exact.length - 1] =
      "Dependent-transition issue cardinality exceeded the receipt limit.";
  }
  return Object.freeze(exact);
}

function appendDependentTransitionIssue(
  issues: string[],
  message: string,
) {
  if (
    issues.length <
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.issues
  ) {
    issues.push(boundedDiagnostic(message));
    return;
  }
  issues[issues.length - 1] =
    "Dependent-transition issue cardinality exceeded the receipt limit.";
}

function assertDenseArray(
  label: string,
  value: unknown,
): asserts value is unknown[] {
  let array = false;
  let prototype: object | null = null;
  try {
    if (isProxy(value)) {
      throw new Error(`${label} exact schema rejects proxy arrays.`);
    }
    array = Array.isArray(value);
    prototype = array ? Object.getPrototypeOf(value) : null;
  } catch {
    throw new Error(`${label} exact schema introspection failed.`);
  }
  if (!array || prototype !== Array.prototype) {
    throw new Error(`${label} exact schema requires a plain dense array.`);
  }
  const arrayValue = value as unknown[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    lengthDescriptor = Object.getOwnPropertyDescriptor(arrayValue, "length");
  } catch {
    throw new Error(`${label} exact schema length introspection failed.`);
  }
  const exactLength = lengthDescriptor && "value" in lengthDescriptor
    ? lengthDescriptor.value
    : null;
  if (
    typeof exactLength !== "number" ||
    !Number.isSafeInteger(exactLength) ||
    exactLength < 0
  ) {
    throw new Error(`${label} exact schema length is invalid.`);
  }
  if (
    exactLength >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.arrayItems
  ) {
    throw new Error(`${label} exact schema cardinality exceeded the array limit.`);
  }
  const expectedKeys = [
    ...Array.from({ length: exactLength }, (_, index) => String(index)),
    "length",
  ];
  let ownKeys: readonly PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(arrayValue);
  } catch {
    throw new Error(`${label} exact schema key introspection failed.`);
  }
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(`${label} exact schema requires a dense array with no extra keys.`);
  }
  for (let index = 0; index < arrayValue.length; index += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(arrayValue, String(index));
    } catch {
      throw new Error(`${label}[${index}] exact schema descriptor introspection failed.`);
    }
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new Error(`${label}[${index}] exact schema must be own enumerable.`);
    }
  }
}

function safeOwnKeyFingerprints(keys: readonly PropertyKey[]) {
  // Four cryptographic fingerprints are enough to diagnose shape drift while
  // keeping even adversarial key sets below the diagnostic byte ceiling.
  return keys.slice(0, 4).map((key) => {
    const kind = typeof key === "symbol" ? "symbol" : "string";
    const text = typeof key === "symbol" ? (key.description ?? "") : String(key);
    return `${kind}{${safeDiagnosticFingerprint(text)}}`;
  });
}

function exactOwnEnumerableDataKeys(
  label: string,
  value: unknown,
) {
  let prototype: object | null = null;
  try {
    prototype = value !== null && typeof value === "object"
      ? Object.getPrototypeOf(value)
      : null;
  } catch {
    throw new Error(`${label} exact schema introspection failed.`);
  }
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    isProxy(value) ||
    prototype !== Object.prototype
  ) {
    throw new Error(`${label} exact schema requires one plain object.`);
  }
  let ownKeys: readonly PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(value);
  } catch {
    throw new Error(`${label} exact schema key introspection failed.`);
  }
  if (
    ownKeys.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.arrayItems
  ) {
    throw new Error(`${label} exact schema key cardinality exceeded the object limit.`);
  }
  for (const key of ownKeys) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw new Error(`${label} exact schema descriptor introspection failed.`);
    }
    if (
      typeof key !== "string" ||
      !descriptor?.enumerable ||
      !("value" in descriptor)
    ) {
      throw new Error(
        `${label} exact schema requires string own enumerable data keys only.`,
      );
    }
  }
  return ownKeys as readonly string[];
}

function assertExactPlainObjectKeySet(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  const ownKeys = exactOwnEnumerableDataKeys(label, value);
  const expected = new Set(expectedKeys);
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key) => !expected.has(key))
  ) {
    throw new Error(boundedDiagnostic(
      `${label} exact schema key set drifted: expectedCount=${expectedKeys.length}, observedCount=${ownKeys.length}, observed=${JSON.stringify(safeOwnKeyFingerprints(ownKeys))}.`,
    ));
  }
}

function assertExactPlainObjectKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  const ownKeys = exactOwnEnumerableDataKeys(label, value);
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(boundedDiagnostic(
      `${label} exact schema ordered keys drifted: expectedCount=${expectedKeys.length}, observedCount=${ownKeys.length}, observed=${JSON.stringify(safeOwnKeyFingerprints(ownKeys))}.`,
    ));
  }
  for (const key of expectedKeys) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw new Error(`${label}.${key} exact schema descriptor introspection failed.`);
    }
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new Error(`${label}.${key} exact schema must be own enumerable.`);
    }
  }
}

function assertFiniteNumberValue(
  label: string,
  value: unknown,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Object.is(value, -0)
  ) {
    throw new Error(
      `${label} exact schema requires a finite number other than negative zero.`,
    );
  }
}

function assertStringValue(
  label: string,
  value: unknown,
  maximumBytes: number =
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.stringBytes,
): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${label} exact schema requires a string.`);
  }
  if (
    Buffer.byteLength(value, "utf8") >
    maximumBytes
  ) {
    throw new Error(`${label} exact schema string exceeded the byte limit.`);
  }
}

function assertDependentTransitionLanguage(
  label: string,
  value: unknown,
): asserts value is HkVisualizationDependentTransitionLanguage {
  if (value !== "en" && value !== "zh" && value !== "zh-Hans") {
    throw new Error(`${label} exact schema requires en, zh, or zh-Hans.`);
  }
}

function assertDependentTransitionTheme(
  label: string,
  value: unknown,
): asserts value is HkVisualizationDependentVisibleMathTheme {
  if (value !== "dark" && value !== "light") {
    throw new Error(`${label} exact schema requires dark or light.`);
  }
}

function assertRangeDescriptorShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "controlId", "initial", "maximum", "minimum", "step",
  ]);
  assertStringValue(`${label}.controlId`, value.controlId);
  for (const key of ["initial", "maximum", "minimum", "step"] as const) {
    assertFiniteNumberValue(`${label}.${key}`, value[key]);
  }
}

function assertDomainDescriptorShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "controlId", "enabled", "excludedValues", "maximum", "minimum", "step",
    "visibility", "domainId",
  ]);
  assertStringValue(`${label}.controlId`, value.controlId);
  if (typeof value.enabled !== "boolean") {
    throw new Error(`${label}.enabled exact schema requires a boolean.`);
  }
  assertDenseArray(`${label}.excludedValues`, value.excludedValues);
  value.excludedValues.forEach((item, index) =>
    assertFiniteNumberValue(`${label}.excludedValues[${index}]`, item)
  );
  for (const key of ["maximum", "minimum", "step"] as const) {
    assertFiniteNumberValue(`${label}.${key}`, value[key]);
  }
  assertStringValue(`${label}.visibility`, value.visibility);
  if (value.domainId !== null) assertStringValue(`${label}.domainId`, value.domainId);
}

function assertValueBindingShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["controlId", "value"]);
  assertStringValue(`${label}.controlId`, value.controlId);
  assertFiniteNumberValue(`${label}.value`, value.value);
}

function assertPublicBindingShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["key", "value"]);
  assertStringValue(`${label}.key`, value.key);
  if (!["boolean", "number", "string"].includes(typeof value.value)) {
    throw new Error(`${label}.value exact schema requires boolean/number/string.`);
  }
  if (typeof value.value === "number") {
    assertFiniteNumberValue(`${label}.value`, value.value);
  }
  if (typeof value.value === "string") {
    assertStringValue(`${label}.value`, value.value);
  }
}

function assertVisibleBindingShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "attribute", "expectedValue", "occurrence", "vizName",
  ]);
  assertStringValue(
    `${label}.attribute`,
    value.attribute,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
  assertStringValue(
    `${label}.expectedValue`,
    value.expectedValue,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
  assertFiniteNumberValue(`${label}.occurrence`, value.occurrence);
  if (!Number.isInteger(value.occurrence as number) || (value.occurrence as number) < 0) {
    throw new Error(`${label}.occurrence exact schema requires a nonnegative integer.`);
  }
  assertStringValue(
    `${label}.vizName`,
    value.vizName,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
}

function assertVisibleTextContractShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "expectedTexts", "occurrence", "vizName",
  ]);
  assertExactPlainObjectKeys(`${label}.expectedTexts`, value.expectedTexts, [
    "en", "zh", "zh-Hans",
  ]);
  for (const language of ["en", "zh", "zh-Hans"] as const) {
    assertStringValue(
      `${label}.expectedTexts.${language}`,
      value.expectedTexts[language],
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleTextBytes,
    );
  }
  assertFiniteNumberValue(`${label}.occurrence`, value.occurrence);
  if (!Number.isInteger(value.occurrence as number) || (value.occurrence as number) < 0) {
    throw new Error(`${label}.occurrence exact schema requires a nonnegative integer.`);
  }
  assertStringValue(
    `${label}.vizName`,
    value.vizName,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
}

function assertVisibleMathContractShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "elementCount", "expectedHashes", "occurrence", "vizName",
  ]);
  assertFiniteNumberValue(`${label}.elementCount`, value.elementCount);
  if (
    !Number.isInteger(value.elementCount as number) ||
    (value.elementCount as number) < 1 ||
    (value.elementCount as number) >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
        .visiblePaintedSubtreeElements
  ) {
    throw new Error(`${label}.elementCount exact schema is outside its bounded positive range.`);
  }
  assertExactPlainObjectKeys(`${label}.expectedHashes`, value.expectedHashes, [
    "en", "zh", "zh-Hans",
  ]);
  for (const language of ["en", "zh", "zh-Hans"] as const) {
    assertStringValue(
      `${label}.expectedHashes.${language}`,
      value.expectedHashes[language],
    );
    if (!/^[0-9a-f]{64}$/.test(value.expectedHashes[language] as string)) {
      throw new Error(`${label}.expectedHashes.${language} requires lowercase SHA-256.`);
    }
  }
  assertFiniteNumberValue(`${label}.occurrence`, value.occurrence);
  if (!Number.isInteger(value.occurrence as number) || (value.occurrence as number) < 0) {
    throw new Error(`${label}.occurrence exact schema requires a nonnegative integer.`);
  }
  assertStringValue(
    `${label}.vizName`,
    value.vizName,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
}

function assertVisibleMathAggregateAncestryScaleSummaryShape(
  label: string,
  value: unknown,
): asserts value is HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary {
  assertExactPlainObjectKeys(label, value, [
    "chainCount", "contractCount", "entryCount", "hash", "policyVersion",
    "scaleWitnessCount",
  ]);
  if (
    value.policyVersion !==
      "visible-math-aggregate-ancestry-scale-summary.v1"
  ) {
    throw new Error(`${label}.policyVersion drifted.`);
  }
  for (const key of [
    "chainCount", "contractCount", "entryCount", "scaleWitnessCount",
  ] as const) {
    assertFiniteNumberValue(`${label}.${key}`, value[key]);
    if (!Number.isInteger(value[key] as number) || (value[key] as number) < 1) {
      throw new Error(`${label}.${key} requires a positive bounded integer.`);
    }
  }
  const contractCount = value.contractCount as number;
  const chainCount = value.chainCount as number;
  const entryCount = value.entryCount as number;
  const scaleWitnessCount = value.scaleWitnessCount as number;
  if (
    contractCount > 32 ||
    chainCount < contractCount ||
    entryCount < chainCount ||
    scaleWitnessCount !== contractCount * 3 ||
    entryCount >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
        .visiblePaintedSubtreeElements
  ) {
    throw new Error(`${label} aggregate ancestry/scale counts drifted.`);
  }
  assertStringValue(`${label}.hash`, value.hash);
  if (!/^[0-9a-f]{64}$/u.test(value.hash as string)) {
    throw new Error(`${label}.hash requires lowercase SHA-256.`);
  }
}

function assertVisibleMathProjectionAggregateContractShape(
  label: string,
  value: unknown,
) {
  assertExactPlainObjectKeys(label, value, [
    "contractIds", "elementCount", "expectedAncestryScaleSummaries",
    "expectedHashes", "selectors",
  ]);
  assertDenseArray(`${label}.contractIds`, value.contractIds);
  assertDenseArray(`${label}.selectors`, value.selectors);
  const contractIds = value.contractIds;
  const selectors = value.selectors;
  if (
    contractIds.length < 1 ||
    contractIds.length > 32 ||
    selectors.length !== contractIds.length
  ) {
    throw new Error(`${label} exact contract topology is outside its bounded range.`);
  }
  const seen = new Set<string>();
  contractIds.forEach((contractId, index) => {
    assertStringValue(`${label}.contractIds[${index}]`, contractId);
    if (!contractId || seen.has(contractId)) {
      throw new Error(`${label}.contractIds must be exact, nonblank, and unique.`);
    }
    seen.add(contractId);
  });
  assertFiniteNumberValue(`${label}.elementCount`, value.elementCount);
  if (
    !Number.isInteger(value.elementCount as number) ||
    (value.elementCount as number) < 1 ||
    (value.elementCount as number) >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
        .visiblePaintedSubtreeElements
  ) {
    throw new Error(`${label}.elementCount is outside the bounded exact range.`);
  }
  assertExactPlainObjectKeys(`${label}.expectedHashes`, value.expectedHashes, [
    "en", "zh", "zh-Hans",
  ]);
  assertExactPlainObjectKeys(
    `${label}.expectedAncestryScaleSummaries`,
    value.expectedAncestryScaleSummaries,
    ["en", "zh", "zh-Hans"],
  );
  for (const language of ["en", "zh", "zh-Hans"] as const) {
    assertExactPlainObjectKeys(
      `${label}.expectedAncestryScaleSummaries.${language}`,
      value.expectedAncestryScaleSummaries[language],
      ["dark", "light"],
    );
    assertExactPlainObjectKeys(
      `${label}.expectedHashes.${language}`,
      value.expectedHashes[language],
      ["dark", "light"],
    );
    for (const theme of ["dark", "light"] as const) {
      assertVisibleMathAggregateAncestryScaleSummaryShape(
        `${label}.expectedAncestryScaleSummaries.${language}.${theme}`,
        value.expectedAncestryScaleSummaries[language][theme],
      );
      if (
        value.expectedAncestryScaleSummaries[language][theme].contractCount !==
          contractIds.length
      ) {
        throw new Error(
          `${label}.expectedAncestryScaleSummaries.${language}.${theme} contract count drifted.`,
        );
      }
      assertStringValue(
        `${label}.expectedHashes.${language}.${theme}`,
        value.expectedHashes[language][theme],
      );
      if (!/^[0-9a-f]{64}$/u.test(value.expectedHashes[language][theme] as string)) {
        throw new Error(`${label}.expectedHashes.${language}.${theme} requires lowercase SHA-256.`);
      }
    }
  }
  selectors.forEach((selector, index) => {
    assertExactPlainObjectKeys(`${label}.selectors[${index}]`, selector, [
      "captureRoot", "contractId", "occurrence", "selector",
    ]);
    if (selector.captureRoot !== "self" && selector.captureRoot !== "parent") {
      throw new Error(`${label}.selectors[${index}].captureRoot is invalid.`);
    }
    assertStringValue(`${label}.selectors[${index}].contractId`, selector.contractId);
    assertStringValue(`${label}.selectors[${index}].selector`, selector.selector);
    assertFiniteNumberValue(`${label}.selectors[${index}].occurrence`, selector.occurrence);
    if (
      selector.contractId !== contractIds[index] ||
      !selector.selector.trim() ||
      !Number.isInteger(selector.occurrence as number) ||
      (selector.occurrence as number) < 0
    ) {
      throw new Error(`${label}.selectors[${index}] exact topology drifted.`);
    }
  });
}

function assertVisibleMathProjectionAggregateObservationShape(
  label: string,
  value: unknown,
) {
  assertExactPlainObjectKeys(label, value, [
    "ancestryScaleSummary", "elementCount", "hash",
  ]);
  assertVisibleMathAggregateAncestryScaleSummaryShape(
    `${label}.ancestryScaleSummary`,
    value.ancestryScaleSummary,
  );
  assertFiniteNumberValue(`${label}.elementCount`, value.elementCount);
  if (
    !Number.isInteger(value.elementCount as number) ||
    (value.elementCount as number) < 1 ||
    (value.elementCount as number) >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
        .visiblePaintedSubtreeElements
  ) {
    throw new Error(`${label}.elementCount is outside the bounded exact range.`);
  }
  assertStringValue(`${label}.hash`, value.hash);
  if (!/^[0-9a-f]{64}$/u.test(value.hash as string)) {
    throw new Error(`${label}.hash requires lowercase SHA-256.`);
  }
}

function assertModePreparationShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["groupId", "modeId"]);
  assertStringValue(`${label}.groupId`, value.groupId);
  assertStringValue(`${label}.modeId`, value.modeId);
}

function assertActionShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["controlId", "requestedValue"]);
  assertStringValue(`${label}.controlId`, value.controlId);
  assertFiniteNumberValue(`${label}.requestedValue`, value.requestedValue);
}

function assertPhasePlanShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "actions", "expectedDescriptors", "expectedPublicState",
    "expectedStateSignature", "expectedValues", "id", "phase",
    "resetCountSincePreviousPhase", "visibleMathProjectionContract",
    "visibleBindings", "visibleMathContracts", "visibleSelector",
    "visibleTextContracts",
  ]);
  assertDenseArray(`${label}.actions`, value.actions);
  value.actions.forEach((item, index) => assertActionShape(`${label}.actions[${index}]`, item));
  assertDenseArray(`${label}.expectedDescriptors`, value.expectedDescriptors);
  value.expectedDescriptors.forEach((item, index) =>
    assertDomainDescriptorShape(`${label}.expectedDescriptors[${index}]`, item)
  );
  assertDenseArray(`${label}.expectedPublicState`, value.expectedPublicState);
  value.expectedPublicState.forEach((item, index) =>
    assertPublicBindingShape(`${label}.expectedPublicState[${index}]`, item)
  );
  assertStringValue(`${label}.expectedStateSignature`, value.expectedStateSignature);
  assertDenseArray(`${label}.expectedValues`, value.expectedValues);
  value.expectedValues.forEach((item, index) =>
    assertValueBindingShape(`${label}.expectedValues[${index}]`, item)
  );
  assertStringValue(`${label}.id`, value.id);
  assertStringValue(`${label}.phase`, value.phase);
  assertFiniteNumberValue(
    `${label}.resetCountSincePreviousPhase`,
    value.resetCountSincePreviousPhase,
  );
  assertDenseArray(`${label}.visibleBindings`, value.visibleBindings);
  if (
    value.visibleBindings.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributes
  ) {
    throw new Error(`${label}.visibleBindings exceeded the visible attribute limit.`);
  }
  value.visibleBindings.forEach((item, index) =>
    assertVisibleBindingShape(`${label}.visibleBindings[${index}]`, item)
  );
  assertDenseArray(`${label}.visibleMathContracts`, value.visibleMathContracts);
  if (
    value.visibleMathContracts.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleMathContracts exceeded the visible element limit.`);
  }
  value.visibleMathContracts.forEach((item, index) =>
    assertVisibleMathContractShape(`${label}.visibleMathContracts[${index}]`, item)
  );
  assertVisibleMathProjectionAggregateContractShape(
    `${label}.visibleMathProjectionContract`,
    value.visibleMathProjectionContract,
  );
  assertStringValue(`${label}.visibleSelector`, value.visibleSelector);
  assertDenseArray(`${label}.visibleTextContracts`, value.visibleTextContracts);
  if (
    value.visibleTextContracts.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleTextContracts exceeded the visible element limit.`);
  }
  value.visibleTextContracts.forEach((item, index) =>
    assertVisibleTextContractShape(`${label}.visibleTextContracts[${index}]`, item)
  );
}

function assertRestorationPlanShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "expectedDescriptors", "expectedPublicState", "expectedStateSignature",
    "expectedValues", "modeId", "resetClickCount",
    "visibleMathProjectionContract", "visibleBindings", "visibleMathContracts",
    "visibleSelector", "visibleTextContracts",
  ]);
  assertDenseArray(`${label}.expectedDescriptors`, value.expectedDescriptors);
  value.expectedDescriptors.forEach((item, index) =>
    assertDomainDescriptorShape(`${label}.expectedDescriptors[${index}]`, item)
  );
  assertDenseArray(`${label}.expectedPublicState`, value.expectedPublicState);
  value.expectedPublicState.forEach((item, index) =>
    assertPublicBindingShape(`${label}.expectedPublicState[${index}]`, item)
  );
  assertStringValue(`${label}.expectedStateSignature`, value.expectedStateSignature);
  assertDenseArray(`${label}.expectedValues`, value.expectedValues);
  value.expectedValues.forEach((item, index) =>
    assertValueBindingShape(`${label}.expectedValues[${index}]`, item)
  );
  assertStringValue(`${label}.modeId`, value.modeId);
  if (value.resetClickCount !== 1) {
    throw new Error(`${label}.resetClickCount exact schema requires one.`);
  }
  assertDenseArray(`${label}.visibleBindings`, value.visibleBindings);
  if (
    value.visibleBindings.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributes
  ) {
    throw new Error(`${label}.visibleBindings exceeded the visible attribute limit.`);
  }
  value.visibleBindings.forEach((item, index) =>
    assertVisibleBindingShape(`${label}.visibleBindings[${index}]`, item)
  );
  assertDenseArray(`${label}.visibleMathContracts`, value.visibleMathContracts);
  if (
    value.visibleMathContracts.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleMathContracts exceeded the visible element limit.`);
  }
  value.visibleMathContracts.forEach((item, index) =>
    assertVisibleMathContractShape(`${label}.visibleMathContracts[${index}]`, item)
  );
  assertVisibleMathProjectionAggregateContractShape(
    `${label}.visibleMathProjectionContract`,
    value.visibleMathProjectionContract,
  );
  assertStringValue(`${label}.visibleSelector`, value.visibleSelector);
  assertDenseArray(`${label}.visibleTextContracts`, value.visibleTextContracts);
  if (
    value.visibleTextContracts.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleTextContracts exceeded the visible element limit.`);
  }
  value.visibleTextContracts.forEach((item, index) =>
    assertVisibleTextContractShape(`${label}.visibleTextContracts[${index}]`, item)
  );
}

export function assertHkVisualizationDependentTransitionSequencePlanShape(
  plan: unknown,
): asserts plan is HkVisualizationDependentTransitionSequencePlan {
  assertCumulativeDependentTransitionSchemaBudget(
    "dependent-transition plan",
    plan,
  );
  assertExactPlainObjectKeys("dependent-transition plan", plan, [
    "controllerControlId", "dependentControlId", "descriptorEnvelope",
    "expectedLiveDescriptors", "domainId", "labId", "modePreparation",
    "modeId", "phases", "planHash", "postSequenceRestoration",
    "schemaVersion", "sequenceId",
  ]);
  assertStringValue("dependent-transition plan.controllerControlId", plan.controllerControlId);
  assertStringValue("dependent-transition plan.dependentControlId", plan.dependentControlId);
  for (const key of ["descriptorEnvelope", "expectedLiveDescriptors"] as const) {
    assertDenseArray(`dependent-transition plan.${key}`, plan[key]);
    plan[key].forEach((item, index) =>
      assertRangeDescriptorShape(`dependent-transition plan.${key}[${index}]`, item)
    );
  }
  for (const key of ["domainId", "labId", "modeId", "planHash", "schemaVersion", "sequenceId"] as const) {
    assertStringValue(`dependent-transition plan.${key}`, plan[key]);
  }
  assertDenseArray("dependent-transition plan.modePreparation", plan.modePreparation);
  plan.modePreparation.forEach((item, index) =>
    assertModePreparationShape(`dependent-transition plan.modePreparation[${index}]`, item)
  );
  assertDenseArray("dependent-transition plan.phases", plan.phases);
  plan.phases.forEach((item, index) =>
    assertPhasePlanShape(`dependent-transition plan.phases[${index}]`, item)
  );
  assertRestorationPlanShape(
    "dependent-transition plan.postSequenceRestoration",
    plan.postSequenceRestoration,
  );
}

function assertAttributeTupleShape(label: string, value: unknown) {
  assertDenseArray(label, value);
  if (value.length !== 2) {
    throw new Error(`${label} exact schema requires a two-string tuple.`);
  }
  assertStringValue(
    `${label}[0]`,
    value[0],
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
  assertStringValue(
    `${label}[1]`,
    value[1],
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
  );
}

function assertVisibleElementShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "attributes", "learnerVisible", "paintedSubtree", "renderedGeometry",
    "tagName", "textHash", "userGeometry",
  ]);
  assertDenseArray(`${label}.attributes`, value.attributes);
  if (
    value.attributes.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributes
  ) {
    throw new Error(`${label}.attributes exceeded the visible attribute limit.`);
  }
  const attributes = value.attributes as unknown[];
  const names = new Set<string>();
  attributes.forEach((item, index) => {
    assertAttributeTupleShape(`${label}.attributes[${index}]`, item);
    const name = (item as unknown[])[0] as string;
    if (names.has(name)) {
      throw new Error(
        `${label}.attributes exact schema rejects a duplicate attribute (${safeDiagnosticFingerprint(name)}).`,
      );
    }
    const previousName = index > 0
      ? ((attributes[index - 1] as unknown[])[0] as string)
      : null;
    if (previousName !== null && previousName >= name) {
      throw new Error(
        `${label}.attributes exact schema requires strict canonical name order.`,
      );
    }
    names.add(name);
  });
  if (typeof value.learnerVisible !== "boolean") {
    throw new Error(`${label}.learnerVisible exact schema requires a boolean.`);
  }
  assertExactPlainObjectKeys(`${label}.paintedSubtree`, value.paintedSubtree, [
    "elementCount", "hash",
  ]);
  assertFiniteNumberValue(
    `${label}.paintedSubtree.elementCount`,
    value.paintedSubtree.elementCount,
  );
  if (
    !Number.isInteger(value.paintedSubtree.elementCount as number) ||
    (value.paintedSubtree.elementCount as number) < 1 ||
    (value.paintedSubtree.elementCount as number) >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
        .visiblePaintedSubtreeElements
  ) {
    throw new Error(
      `${label}.paintedSubtree.elementCount exact schema is outside its bounded positive range.`,
    );
  }
  assertStringValue(`${label}.paintedSubtree.hash`, value.paintedSubtree.hash);
  if (!/^[0-9a-f]{64}$/.test(value.paintedSubtree.hash as string)) {
    throw new Error(
      `${label}.paintedSubtree.hash exact schema requires lowercase SHA-256.`,
    );
  }
  assertRectShape(`${label}.renderedGeometry`, value.renderedGeometry);
  assertStringValue(`${label}.tagName`, value.tagName);
  assertStringValue(`${label}.textHash`, value.textHash);
  if (!/^[0-9a-f]{64}$/.test(value.textHash as string)) {
    throw new Error(`${label}.textHash exact schema requires lowercase SHA-256.`);
  }
  assertRectShape(`${label}.userGeometry`, value.userGeometry);
}

function assertRectShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["height", "width", "x", "y"]);
  for (const key of ["height", "width", "x", "y"] as const) {
    assertFiniteNumberValue(`${label}.${key}`, value[key]);
  }
}

function assertSurfaceObservationShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "renderedSize", "scrollport", "tagName", "viewBox",
  ]);
  assertExactPlainObjectKeys(`${label}.renderedSize`, value.renderedSize, [
    "height", "width",
  ]);
  assertFiniteNumberValue(
    `${label}.renderedSize.height`,
    value.renderedSize.height,
  );
  assertFiniteNumberValue(
    `${label}.renderedSize.width`,
    value.renderedSize.width,
  );
  assertExactPlainObjectKeys(`${label}.scrollport`, value.scrollport, [
    "clientHeight", "clientWidth", "maxScrollLeft", "scrollHeight",
    "scrollWidth",
  ]);
  for (const key of [
    "clientHeight", "clientWidth", "maxScrollLeft", "scrollHeight",
    "scrollWidth",
  ] as const) {
    assertFiniteNumberValue(`${label}.scrollport.${key}`, value.scrollport[key]);
  }
  if (value.tagName !== "svg") {
    throw new Error(`${label}.tagName exact schema requires svg.`);
  }
  assertRectShape(`${label}.viewBox`, value.viewBox);
}

function assertControlObservationShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, ["controlId", "descriptor", "value"]);
  assertStringValue(`${label}.controlId`, value.controlId);
  assertDomainDescriptorShape(`${label}.descriptor`, value.descriptor);
  assertFiniteNumberValue(`${label}.value`, value.value);
}

function assertPhaseObservationShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "controls", "id", "phase", "rawSerializedPublicState",
    "resetCountSincePreviousPhase", "stateSignature", "surface",
    "visibleElements", "visibleMathProjection",
  ]);
  assertDenseArray(`${label}.controls`, value.controls);
  value.controls.forEach((item, index) =>
    assertControlObservationShape(`${label}.controls[${index}]`, item)
  );
  for (const key of ["id", "phase", "rawSerializedPublicState", "stateSignature"] as const) {
    assertStringValue(`${label}.${key}`, value[key]);
  }
  assertFiniteNumberValue(
    `${label}.resetCountSincePreviousPhase`,
    value.resetCountSincePreviousPhase,
  );
  assertDenseArray(`${label}.visibleElements`, value.visibleElements);
  if (
    value.visibleElements.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleElements exceeded the visible element limit.`);
  }
  value.visibleElements.forEach((item, index) =>
    assertVisibleElementShape(`${label}.visibleElements[${index}]`, item)
  );
  assertVisibleMathProjectionAggregateObservationShape(
    `${label}.visibleMathProjection`,
    value.visibleMathProjection,
  );
  assertSurfaceObservationShape(`${label}.surface`, value.surface);
}

function assertCanonicalVisibleBaselineShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "baselineHash", "canonicalFingerprint", "cellId", "language", "planHash",
    "sequenceId", "surface", "theme", "visibleElements", "visibleMathProjection",
  ]);
  for (const key of [
    "baselineHash", "canonicalFingerprint", "cellId", "language", "planHash",
    "sequenceId",
  ] as const) assertStringValue(`${label}.${key}`, value[key]);
  assertDependentTransitionLanguage(`${label}.language`, value.language);
  assertDependentTransitionTheme(`${label}.theme`, value.theme);
  assertSurfaceObservationShape(`${label}.surface`, value.surface);
  assertDenseArray(`${label}.visibleElements`, value.visibleElements);
  if (
    value.visibleElements.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleElements exceeded the visible element limit.`);
  }
  value.visibleElements.forEach((item, index) =>
    assertVisibleElementShape(`${label}.visibleElements[${index}]`, item)
  );
  assertVisibleMathProjectionAggregateObservationShape(
    `${label}.visibleMathProjection`,
    value.visibleMathProjection,
  );
}

function assertRestorationObservationShape(label: string, value: unknown) {
  assertExactPlainObjectKeys(label, value, [
    "afterFingerprint", "beforeFingerprint", "canonicalFingerprint", "controls",
    "rawSerializedPublicState", "resetClickCount", "stateSignature",
    "canonicalVisibleBaselineHash", "surface", "visibleElements",
    "visibleMathProjection",
  ]);
  for (const key of [
    "afterFingerprint", "beforeFingerprint", "canonicalFingerprint",
    "rawSerializedPublicState", "stateSignature",
  ] as const) assertStringValue(`${label}.${key}`, value[key]);
  assertDenseArray(`${label}.controls`, value.controls);
  value.controls.forEach((item, index) =>
    assertControlObservationShape(`${label}.controls[${index}]`, item)
  );
  assertFiniteNumberValue(`${label}.resetClickCount`, value.resetClickCount);
  assertStringValue(
    `${label}.canonicalVisibleBaselineHash`,
    value.canonicalVisibleBaselineHash,
  );
  assertSurfaceObservationShape(`${label}.surface`, value.surface);
  assertDenseArray(`${label}.visibleElements`, value.visibleElements);
  if (
    value.visibleElements.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements
  ) {
    throw new Error(`${label}.visibleElements exceeded the visible element limit.`);
  }
  value.visibleElements.forEach((item, index) =>
    assertVisibleElementShape(`${label}.visibleElements[${index}]`, item)
  );
  assertVisibleMathProjectionAggregateObservationShape(
    `${label}.visibleMathProjection`,
    value.visibleMathProjection,
  );
}

export function assertHkVisualizationDependentTransitionSequenceObservationShape(
  observation: unknown,
): asserts observation is HkVisualizationDependentTransitionSequenceObservation {
  assertCumulativeDependentTransitionSchemaBudget(
    "dependent-transition observation",
    observation,
  );
  assertExactPlainObjectKeys("dependent-transition observation", observation, [
    "cellId", "canonicalVisibleBaseline", "domainId", "labId", "language", "modePreparation", "modeId",
    "observationHash", "phases", "planHash", "postSequenceRestoration",
    "schemaVersion", "sequenceId", "theme",
  ]);
  assertCanonicalVisibleBaselineShape(
    "dependent-transition observation.canonicalVisibleBaseline",
    observation.canonicalVisibleBaseline,
  );
  for (const key of [
    "cellId", "domainId", "labId", "language", "modeId", "observationHash", "planHash",
    "schemaVersion", "sequenceId",
  ] as const) assertStringValue(`dependent-transition observation.${key}`, observation[key]);
  assertDependentTransitionLanguage(
    "dependent-transition observation.language",
    observation.language,
  );
  assertDependentTransitionTheme(
    "dependent-transition observation.theme",
    observation.theme,
  );
  assertDenseArray("dependent-transition observation.modePreparation", observation.modePreparation);
  observation.modePreparation.forEach((item, index) =>
    assertModePreparationShape(`dependent-transition observation.modePreparation[${index}]`, item)
  );
  assertDenseArray("dependent-transition observation.phases", observation.phases);
  observation.phases.forEach((item, index) =>
    assertPhaseObservationShape(`dependent-transition observation.phases[${index}]`, item)
  );
  assertRestorationObservationShape(
    "dependent-transition observation.postSequenceRestoration",
    observation.postSequenceRestoration,
  );
}

export function hashHkVisualizationDependentTransitionSequencePlan(
  plan: HkVisualizationDependentTransitionSequencePlan,
) {
  assertHkVisualizationDependentTransitionSequencePlanShape(plan);
  const { planHash: _ignored, ...payload } = plan;
  return sha256Json(payload);
}

export function hashHkVisualizationDependentTransitionSequenceObservation(
  observation: HkVisualizationDependentTransitionSequenceObservation,
) {
  assertHkVisualizationDependentTransitionSequenceObservationShape(observation);
  const { observationHash: _ignored, ...payload } = observation;
  return sha256Json(payload);
}

export function hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
  baseline: HkVisualizationDependentTransitionCanonicalVisibleBaseline,
) {
  assertCumulativeDependentTransitionSchemaBudget(
    "dependent-transition canonical visible baseline",
    baseline,
  );
  assertCanonicalVisibleBaselineShape(
    "dependent-transition canonical visible baseline",
    baseline,
  );
  const { baselineHash: _ignored, ...payload } = baseline;
  return sha256Json(payload);
}

function valuesForDependentTransitionState(
  descriptors: readonly HkVisualizationRangeDescriptor[],
  state: Readonly<Record<string, number>>,
) {
  return Object.freeze(
    descriptors.map(({ controlId }) =>
      Object.freeze({ controlId, value: state[controlId] }),
    ),
  );
}

function publicStateForDependentTransition(
  definition: HkVisualizationDependentTransitionDefinition,
  state: Readonly<Record<string, number>>,
  restorationOperation?: "add",
) {
  const value = (controlId: string) => state[controlId];
  let entries: readonly Readonly<{
    key: string;
    value: boolean | number | string;
  }>[];
  switch (definition.sequenceId) {
    case "p1-number-bond-known-part":
      entries = [
        { key: "total", value: value("total") },
        { key: "knownPart", value: value("knownPart") },
      ];
      break;
    case "p1-add-step":
    case "p1-subtract-step":
      entries = [
        { key: "operation", value: restorationOperation ?? definition.modeId },
        { key: "start", value: value("start") },
        { key: "step", value: value("step") },
      ];
      break;
    case "p2-payment-at-least-price":
      entries = [
        { key: "mode", value: "money" },
        { key: "price", value: value("price") },
        { key: "payment", value: value("payment") },
        { key: "hour", value: 9 },
        { key: "halfHour", value: true },
      ];
      break;
    case "p4-divisor-within-number":
      entries = [
        { key: "mode", value: "factor-pairs" },
        { key: "firstNumber", value: value("firstNumber") },
        // secondNumber belongs to the wider model state, but is fixed and
        // hidden in factor-pairs. It remains semantic public state only.
        { key: "secondNumber", value: 18 },
        { key: "candidateDivisor", value: value("candidateDivisor") },
      ];
      break;
    case "p5-first-proper-fraction":
    case "p5-second-proper-fraction":
    case "p5-third-proper-fraction": {
      const prefix = definition.controllerControlId.replace("Denominator", "");
      entries = [
        { key: "operation", value: restorationOperation ?? "subtract" },
        { key: "termCount", value: "three" },
        ...(["first", "second", "third"] as const).map((fractionPrefix) => ({
          key: `${fractionPrefix}Fraction`,
          value: `${value(`${fractionPrefix}Numerator`)}/${value(`${fractionPrefix}Denominator`)}`,
        })),
      ];
      break;
    }
    case "p5-visible-volume-layers":
      entries = [
        { key: "length", value: value("length") },
        { key: "width", value: value("width") },
        { key: "height", value: value("height") },
        { key: "visibleLayers", value: value("visibleLayers") },
      ];
      break;
    case "s3-identity-a-projects-b":
    case "s3-identity-b-projects-a":
      entries = [
        { key: "a", value: value("a") },
        { key: "b", value: value("b") },
        { key: "activeMode", value: "square-sum" },
      ];
      break;
  }
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

function visiblePlanForDependentTransition(
  definition: HkVisualizationDependentTransitionDefinition,
  phase: HkVisualizationDependentTransitionPhaseId,
  state: Readonly<Record<string, number>>,
  modeId = definition.modeId,
  fractionOperation: "add" | "subtract" = "subtract",
) {
  const binding = (
    vizName: string,
    attribute: string,
    expectedValue: string | number,
    occurrence = 0,
  ) => Object.freeze({
    attribute,
    expectedValue: String(expectedValue).replace(/\s+/g, " ").trim(),
    occurrence,
    vizName,
  });
  const textContract = (
    vizName: string,
    expectedTexts: readonly string[],
    occurrence = 0,
  ) => {
    if (expectedTexts.length !== 1 && expectedTexts.length !== 3) {
      throw new Error(
        "Dependent-transition text contract requires one shared or three localized strings.",
      );
    }
    const normalized = expectedTexts.map((text) =>
      text.normalize("NFC").replace(/\s+/g, " ").trim()
    );
    return Object.freeze({
      expectedTexts: Object.freeze({
        en: normalized[0],
        zh: normalized[1] ?? normalized[0],
        "zh-Hans": normalized[2] ?? normalized[0],
      }),
      occurrence,
      vizName,
    });
  };
  switch (definition.sequenceId) {
    case "p1-number-bond-known-part":
      return Object.freeze({
        bindings: Object.freeze([
          binding("counter-set", "__tag", "g"),
          binding("counter-set", "data-viz-total", state.total),
          binding("known-part-node", "__tag", "g"),
          binding("known-part-node", "__text", state.knownPart),
          binding("missing-part-node", "__tag", "g"),
          binding("missing-part-node", "__text", state.total - state.knownPart),
        ]),
        selector: '[data-viz-name="counter-set"], [data-viz-name="known-part-node"], [data-viz-name="missing-part-node"]',
        texts: Object.freeze([
          textContract("counter-set", [""]),
          textContract("known-part-node", [String(state.knownPart)]),
          textContract("missing-part-node", [String(state.total - state.knownPart)]),
        ]),
      });
    case "p1-add-step":
    case "p1-subtract-step": {
      const operation = modeId;
      const end = operation === "add"
        ? state.start + state.step
        : state.start - state.step;
      const stationary = state.step === 0;
      const startX = 70 + state.start * 25;
      const endX = 70 + end * 25;
      const path = `M${startX} 220 Q${(startX + endX) / 2} ${120 - Math.abs(endX - startX) * 0.08} ${endX} 220`;
      return Object.freeze({
        bindings: Object.freeze(stationary
          ? [
              binding("stationary-point", "__tag", "circle"),
              binding("stationary-point", "data-viz-value", state.start),
              binding("stationary-point", "cx", startX),
              binding("stationary-point", "cy", 245),
              binding("stationary-point", "r", 15),
            ]
          : [
              binding("directed-jump", "__tag", "path"),
              binding("directed-jump", "data-viz-operation", operation),
              binding("directed-jump", "data-viz-start", state.start),
              binding("directed-jump", "data-viz-step", state.step),
              binding("directed-jump", "data-viz-end", end),
              binding("directed-jump", "d", path),
            ]),
        selector: stationary
          ? '[data-viz-name="stationary-point"]'
          : '[data-viz-name="directed-jump"]',
        texts: Object.freeze([
          textContract(stationary ? "stationary-point" : "directed-jump", [""]),
        ]),
      });
    }
    case "p2-payment-at-least-price": {
      const paymentBarWidth = 488;
      const priceSegmentWidth = paymentBarWidth * state.price / state.payment;
      return Object.freeze({
        bindings: Object.freeze([
          binding("payment-bar", "__tag", "rect"),
          binding("payment-bar", "data-viz-payment", state.payment),
          binding("payment-bar", "x", 76),
          binding("payment-bar", "y", 228),
          binding("payment-bar", "width", paymentBarWidth),
          binding("payment-bar", "height", 70),
          binding("price-segment", "__tag", "rect"),
          binding("price-segment", "data-viz-price", state.price),
          binding("price-segment", "x", 76),
          binding("price-segment", "y", 228),
          binding("price-segment", "width", priceSegmentWidth),
          binding("price-segment", "height", 70),
        ]),
        selector: '[data-viz-name="payment-bar"], [data-viz-name="price-segment"]',
        texts: Object.freeze([
          textContract("payment-bar", [""]),
          textContract("price-segment", [""]),
        ]),
      });
    }
    case "p4-divisor-within-number": {
      const quotient = Math.floor(state.firstNumber / state.candidateDivisor);
      const remainder = state.firstNumber % state.candidateDivisor;
      const factor = remainder === 0;
      const prefix = `${state.firstNumber} ÷ ${state.candidateDivisor} = ${quotient} r ${remainder} · `;
      return Object.freeze({
        bindings: Object.freeze([
          binding("remainder-test", "__tag", "g"),
          binding("remainder-test", "data-viz-dividend", state.firstNumber),
          binding("remainder-test", "data-viz-divisor", state.candidateDivisor),
          binding("remainder-test", "data-viz-quotient", quotient),
          binding("remainder-test", "data-viz-remainder", remainder),
          binding("remainder-test", "data-viz-is-factor", String(factor)),
        ]),
        selector: '[data-viz-name="remainder-test"]',
        texts: Object.freeze([
          textContract("remainder-test", factor
            ? [`${prefix}✓ factor`, `${prefix}✓ 因數`, `${prefix}✓ 因数`]
            : [`${prefix}✕ not a factor`, `${prefix}✕ 不是因數`, `${prefix}✕ 不是因数`]),
        ]),
      });
    }
    case "p5-first-proper-fraction":
    case "p5-second-proper-fraction":
    case "p5-third-proper-fraction": {
      const prefixes = ["first", "second", "third"] as const;
      const greatestCommonDivisor = (left: number, right: number): number =>
        right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
      const leastCommonMultiple = (left: number, right: number) =>
        Math.abs(left * right) / greatestCommonDivisor(left, right);
      const commonDenominator = prefixes.reduce(
        (current, prefix) => leastCommonMultiple(
          current,
          state[`${prefix}Denominator`],
        ),
        1,
      );
      return Object.freeze({
        bindings: Object.freeze(prefixes.flatMap((prefix, occurrence) => [
          binding("source-fraction-bar", "__tag", "g", occurrence),
          binding("source-fraction-bar", "data-viz-numerator", state[`${prefix}Numerator`], occurrence),
          binding("source-fraction-bar", "data-viz-denominator", state[`${prefix}Denominator`], occurrence),
          binding("source-fraction-bar", "data-viz-common-numerator", state[`${prefix}Numerator`] * commonDenominator / state[`${prefix}Denominator`], occurrence),
          binding("source-fraction-bar", "data-viz-common-denominator", commonDenominator, occurrence),
        ])),
        selector: '[data-viz-name="source-fraction-bar"]',
        texts: Object.freeze(prefixes.map((prefix, occurrence) => {
          const numerator = state[`${prefix}Numerator`];
          const denominator = state[`${prefix}Denominator`];
          const commonNumerator = numerator * commonDenominator / denominator;
          return textContract(
            "source-fraction-bar",
            [`${numerator}/${denominator} ≡ ${commonNumerator}/${commonDenominator}${occurrence > 0 ? (fractionOperation === "add" ? "+" : "−") : ""}`],
            occurrence,
          );
        })),
      });
    }
    case "p5-visible-volume-layers":
      return Object.freeze({
        bindings: Object.freeze([
          binding("layer-stack", "__tag", "g"),
          binding("layer-stack", "data-viz-visible-layers", state.visibleLayers),
          binding("layer-stack", "data-viz-total-layers", state.height),
          binding("layer-stack", "data-viz-layer-size", state.length * state.width),
          binding("layer-stack", "data-viz-volume", state.length * state.width * state.height),
        ]),
        selector: '[data-viz-name="layer-stack"]',
        texts: Object.freeze([textContract("layer-stack", [""])]),
      });
    case "s3-identity-a-projects-b":
    case "s3-identity-b-projects-a":
      return Object.freeze({
        bindings: Object.freeze([
          binding("identity-square-whole", "__tag", "g"),
          binding("identity-square-whole", "data-viz-a", state.a),
          binding("identity-square-whole", "data-viz-b", state.b),
          binding("identity-square-whole", "data-viz-area", (state.a + state.b) ** 2),
        ]),
        selector: '[data-viz-name="identity-square-whole"]',
        texts: Object.freeze([textContract("identity-square-whole", [""])]),
      });
  }
  throw new Error(
    `Missing visible dependent-transition contract for sequence{${safeDiagnosticFingerprint(definition.sequenceId)}} at phase-index{${safeDiagnosticFingerprint(phase)}}.`,
  );
}

export function buildHkVisualizationDependentTransitionSequencePlans(args: Readonly<{
  descriptors: readonly HkVisualizationRangeDescriptor[];
  domainId: HkExecutableDynamicRangeDomainId;
  labId: string;
  modeId: string;
}>): readonly HkVisualizationDependentTransitionSequencePlan[] {
  assertDenseArray("dependent-transition builder descriptors", args.descriptors);
  args.descriptors.forEach((descriptor, index) =>
    assertRangeDescriptorShape(
      `dependent-transition builder descriptors[${index}]`,
      descriptor,
    )
  );
  assertStringValue("dependent-transition builder domainId", args.domainId);
  assertStringValue("dependent-transition builder labId", args.labId);
  assertStringValue("dependent-transition builder modeId", args.modeId);
  if (args.domainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID) return Object.freeze([]);
  const definitions = HK_VISUALIZATION_DEPENDENT_TRANSITION_DEFINITIONS.filter(
    (definition) =>
      definition.labId === args.labId && definition.modeId === args.modeId,
  );
  if (definitions.length === 0) return Object.freeze([]);
  const ids = args.descriptors.map(({ controlId }) => controlId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Dependent-transition descriptors contain duplicate control IDs.");
  }
  return Object.freeze(definitions.map((definition) => {
    const sequenceLabel =
      `sequence{${safeDiagnosticFingerprint(definition.sequenceId)}}`;
    if (definition.domainId !== args.domainId) {
      throw new Error(
        `${sequenceLabel} domain identity drifted: required{${safeDiagnosticFingerprint(definition.domainId)}}, observed{${safeDiagnosticFingerprint(args.domainId)}}.`,
      );
    }
    const expectedLiveDescriptors =
      HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS[
        definition.sequenceId
      ];
    if (JSON.stringify(args.descriptors) !== JSON.stringify(expectedLiveDescriptors)) {
      throw new Error(
        `${sequenceLabel} expected live descriptor contract drifted: expected{${safeJsonDiagnosticFingerprint(expectedLiveDescriptors)}}, observed{${safeJsonDiagnosticFingerprint(args.descriptors)}}.`,
      );
    }
    for (const controlId of [
      definition.controllerControlId,
      definition.dependentControlId,
    ]) {
      if (!ids.includes(controlId)) {
        throw new Error(
          `${sequenceLabel} is active but required control{${safeDiagnosticFingerprint(controlId)}} is missing.`,
        );
      }
    }
    const descriptorEnvelope = Object.freeze(args.descriptors.map((descriptor) => {
      for (const key of ["initial", "maximum", "minimum", "step"] as const) {
        finiteNumber(
          `${sequenceLabel}.descriptor{${safeDiagnosticFingerprint(descriptor.controlId)}}.${key}`,
          descriptor[key],
        );
      }
      const maximum = definition.envelopeMaximums[descriptor.controlId]
        ?? descriptor.maximum;
      if (
        !(descriptor.minimum < maximum) ||
        descriptor.initial < descriptor.minimum ||
        descriptor.initial > maximum ||
        !(descriptor.step > 0)
      ) {
        throw new Error(
          `${sequenceLabel} descriptor envelope is invalid for control{${safeDiagnosticFingerprint(descriptor.controlId)}}.`,
        );
      }
      return Object.freeze({ ...descriptor, maximum });
    }));
    const domain = getHkDedicatedDynamicRangeDomain(
      definition.domainId,
      definition.labId,
    );
    let state: Readonly<Record<string, number>> = Object.freeze(
      Object.fromEntries(descriptorEnvelope.map(({ controlId, initial }) => [controlId, initial])),
    );
    const phaseContracts = [
      { actions: definition.pre, phase: "pre" as const, reset: 1 as const },
      { actions: [definition.clamp], phase: "clamp" as const, reset: 0 as const },
      { actions: [definition.expand], phase: "expand" as const, reset: 0 as const },
    ];
    const phases = Object.freeze(phaseContracts.map((phaseContract) => {
      for (const action of phaseContract.actions) {
        const projected = domain.canonicalize({
          currentState: state,
          descriptors: descriptorEnvelope,
          modeId: definition.modeId,
          requestedState: { [action.controlId]: action.requestedValue },
        });
        if (!projected.valid || !domain.isValid(projected.canonicalState, definition.modeId)) {
          throw new Error(
            `${sequenceLabel}:phase{${safeDiagnosticFingerprint(phaseContract.phase)}} produced an invalid canonical state.`,
          );
        }
        state = projected.canonicalState;
      }
      const expectedValues = valuesForDependentTransitionState(
        descriptorEnvelope,
        state,
      );
      const visible = visiblePlanForDependentTransition(
        definition,
        phaseContract.phase,
        state,
      );
      return Object.freeze({
        actions: Object.freeze(phaseContract.actions.map((action) => Object.freeze({ ...action }))),
        expectedDescriptors: Object.freeze(descriptorEnvelope.map((descriptor) =>
          domain.descriptorFor(state, definition.modeId, descriptor),
        )),
        expectedPublicState: publicStateForDependentTransition(definition, state),
        expectedStateSignature: signatureForHkVisualizationRangeValues(expectedValues),
        expectedValues,
        id: `${definition.sequenceId}:${phaseContract.phase}`,
        phase: phaseContract.phase,
        resetCountSincePreviousPhase: phaseContract.reset,
        visibleMathProjectionContract:
          buildHkVisualizationDependentVisibleMathAggregateContract({
            fractionOperation: "subtract",
            modeId: definition.modeId,
            sequenceId: definition.sequenceId,
            state,
          }),
        visibleBindings: visible.bindings,
        visibleMathContracts:
          buildHkVisualizationDependentVisibleMathContracts({
            fractionOperation: "subtract",
            modeId: definition.modeId,
            sequenceId: definition.sequenceId,
            state,
          }),
        visibleSelector: visible.selector,
        visibleTextContracts: visible.texts,
      });
    }));
    const clampDependent = phases[1].expectedValues.find(
      ({ controlId }) => controlId === definition.dependentControlId,
    )?.value;
    const expandDependent = phases[2].expectedValues.find(
      ({ controlId }) => controlId === definition.dependentControlId,
    )?.value;
    if (
      clampDependent === undefined ||
      expandDependent === undefined ||
      !Object.is(clampDependent, expandDependent)
    ) {
      throw new Error(
        `${sequenceLabel} does not prove exact dependent no-resurrection after expansion.`,
      );
    }
    const restorationModeId = definition.sequenceId === "p1-subtract-step"
      ? "add"
      : definition.modeId;
    const restorationState = Object.freeze(Object.fromEntries(
      expectedLiveDescriptors.map(({ controlId, initial }) => [controlId, initial]),
    ));
    if (!domain.isValid(restorationState, restorationModeId)) {
      throw new Error(
        `${sequenceLabel} canonical restoration state violates domain{${safeDiagnosticFingerprint(definition.domainId)}}.`,
      );
    }
    const restorationExpectedValues = valuesForDependentTransitionState(
      descriptorEnvelope,
      restorationState,
    );
    const postSequenceRestoration = Object.freeze({
      expectedDescriptors: Object.freeze(descriptorEnvelope.map((descriptor) =>
        domain.descriptorFor(restorationState, restorationModeId, descriptor),
      )),
      expectedPublicState: publicStateForDependentTransition(
        definition,
        restorationState,
        definition.sequenceId === "p1-add-step" ||
          definition.sequenceId === "p1-subtract-step" ||
          definition.domainId === "proper-fractions-v1"
          ? "add"
          : undefined,
      ),
      expectedStateSignature:
        signatureForHkVisualizationRangeValues(restorationExpectedValues),
      expectedValues: restorationExpectedValues,
      modeId: restorationModeId,
      resetClickCount: 1 as const,
      visibleMathProjectionContract:
        buildHkVisualizationDependentVisibleMathAggregateContract({
          fractionOperation: "add",
          modeId: restorationModeId,
          sequenceId: definition.sequenceId,
          state: restorationState,
        }),
      visibleBindings: visiblePlanForDependentTransition(
        definition,
        "expand",
        restorationState,
        restorationModeId,
        "add",
      ).bindings,
      visibleMathContracts:
        buildHkVisualizationDependentVisibleMathContracts({
          fractionOperation: "add",
          modeId: restorationModeId,
          sequenceId: definition.sequenceId,
          state: restorationState,
        }),
      visibleSelector: visiblePlanForDependentTransition(
        definition,
        "expand",
        restorationState,
        restorationModeId,
        "add",
      ).selector,
      visibleTextContracts: visiblePlanForDependentTransition(
        definition,
        "expand",
        restorationState,
        restorationModeId,
        "add",
      ).texts,
    });
    const unhashed = {
      controllerControlId: definition.controllerControlId,
      dependentControlId: definition.dependentControlId,
      descriptorEnvelope,
      expectedLiveDescriptors,
      domainId: definition.domainId,
      labId: definition.labId,
      modePreparation: Object.freeze(definition.modePreparation.map((item) =>
        Object.freeze({ ...item }),
      )),
      modeId: definition.modeId,
      phases,
      planHash: "",
      postSequenceRestoration,
      schemaVersion: HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION,
      sequenceId: definition.sequenceId,
    } satisfies HkVisualizationDependentTransitionSequencePlan;
    return Object.freeze({
      ...unhashed,
      planHash: hashHkVisualizationDependentTransitionSequencePlan(unhashed),
    });
  }));
}

function attributeMap(
  observation: HkVisualizationDependentTransitionVisibleElementObservation,
) {
  return new Map(observation.attributes);
}

function auditDependentTransitionVisibleMathProjection(
  label: string,
  language: HkVisualizationDependentTransitionLanguage,
  theme: HkVisualizationDependentVisibleMathTheme | null,
  expected: HkVisualizationDependentVisibleMathAggregateContract,
  actual: HkVisualizationDependentVisibleMathAggregateObservation,
  issues: string[],
) {
  const expectedSummary = theme === null
    ? null
    : expected.expectedAncestryScaleSummaries[language][theme];
  if (
    theme === null ||
    actual.elementCount !== expected.elementCount ||
    actual.hash !== expected.expectedHashes[language][theme] ||
    expectedSummary === null ||
    JSON.stringify(actual.ancestryScaleSummary) !==
      JSON.stringify(expectedSummary)
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: complete visible-math projection drifted; exact independent contract topology, inherited paint, SVG/PAR/CTM, semantic attributes, text, and canonical numeric geometry must match.`,
    );
  }
}

function dependentTransitionThemeFromCellId(
  cellId: string,
): HkVisualizationDependentVisibleMathTheme | null {
  const matches = cellId.split(/[/:]/u).filter(
    (part): part is HkVisualizationDependentVisibleMathTheme =>
      part === "dark" || part === "light",
  );
  return matches.length === 1 ? matches[0] : null;
}

function auditDependentTransitionVisibleElements(
  label: string,
  language: HkVisualizationDependentTransitionLanguage,
  expectedBindings: readonly HkVisualizationDependentTransitionVisibleBinding[],
  expectedTextContracts: readonly HkVisualizationDependentTransitionVisibleTextContract[],
  expectedMathContracts: readonly HkVisualizationDependentVisibleMathContract[],
  actualElements: readonly HkVisualizationDependentTransitionVisibleElementObservation[],
  surface: HkVisualizationDependentTransitionSurfaceObservation,
  issues: string[],
) {
  const pixelEpsilon = 0.75;
  const rectIsPositive = (rect: HkVisualizationDependentTransitionRect) =>
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 && rect.height > 0;
  const contained = (
    inner: HkVisualizationDependentTransitionRect,
    outer: HkVisualizationDependentTransitionRect,
    epsilon: number,
  ) =>
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon;
  const renderedSurfaceRect = {
    height: surface.renderedSize.height,
    width: surface.renderedSize.width,
    x: 0,
    y: 0,
  };
  const userEpsilon = Math.max(
    0.05,
    pixelEpsilon * surface.viewBox.width / surface.renderedSize.width,
    pixelEpsilon * surface.viewBox.height / surface.renderedSize.height,
  );
  const scrollport = surface.scrollport;
  if (
    surface.tagName !== "svg" ||
    !rectIsPositive(surface.viewBox) ||
    !rectIsPositive(renderedSurfaceRect) ||
    [
      scrollport.clientHeight,
      scrollport.clientWidth,
      scrollport.maxScrollLeft,
      scrollport.scrollHeight,
      scrollport.scrollWidth,
    ].some((value) => !Number.isFinite(value) || value < 0) ||
    scrollport.clientHeight <= 0 ||
    scrollport.clientWidth <= 0 ||
    scrollport.scrollHeight + pixelEpsilon < scrollport.clientHeight ||
    scrollport.scrollWidth + pixelEpsilon < scrollport.clientWidth ||
    Math.abs(
      scrollport.maxScrollLeft -
      Math.max(0, scrollport.scrollWidth - scrollport.clientWidth),
    ) > pixelEpsilon ||
    surface.renderedSize.width > scrollport.scrollWidth + pixelEpsilon ||
    surface.renderedSize.height > scrollport.scrollHeight + pixelEpsilon
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: exact owned SVG/viewBox/scrollport surface evidence drifted.`,
    );
  }
  const visibleNames = new Set(expectedBindings.map(({ vizName }) => vizName));
  const expectedElementCount = [...visibleNames].reduce((total, vizName) =>
    total + Math.max(
      ...expectedBindings
        .filter((binding) => binding.vizName === vizName)
        .map(({ occurrence }) => occurrence),
    ) + 1,
  0);
  if (actualElements.length !== expectedElementCount) {
    appendDependentTransitionIssue(issues,
      `${label}: visible element topology count ${actualElements.length} expected ${expectedElementCount}; duplicate or decoy evidence is forbidden.`,
    );
  }
  const expectedTopology: string[] = [];
  const expectedTopologyKeys = new Set<string>();
  for (const binding of expectedBindings) {
    const key = `${binding.vizName}\u0000${binding.occurrence}`;
    if (!expectedTopologyKeys.has(key)) {
      expectedTopologyKeys.add(key);
      expectedTopology.push(key);
    }
  }
  const actualOccurrences = new Map<string, number>();
  const actualTopology = actualElements.map((element) => {
    const vizName = attributeMap(element).get("data-viz-name") ?? "__missing__";
    const occurrence = actualOccurrences.get(vizName) ?? 0;
    actualOccurrences.set(vizName, occurrence + 1);
    return `${vizName}\u0000${occurrence}`;
  });
  if (
    actualTopology.length !== expectedTopology.length ||
    actualTopology.some((item, index) => item !== expectedTopology[index])
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: visible element exact ordered vizName/occurrence topology drifted.`,
    );
  }
  const expectedTextTopology = expectedTextContracts.map(
    ({ vizName, occurrence }) => `${vizName}\u0000${occurrence}`,
  );
  if (
    expectedTextTopology.length !== expectedTopology.length ||
    expectedTextTopology.some((item, index) => item !== expectedTopology[index])
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: producer text contract does not cover exact visible topology.`,
    );
  }
  const expectedMathTopology = expectedMathContracts.map(
    ({ vizName, occurrence }) => `${vizName}\u0000${occurrence}`,
  );
  if (
    expectedMathTopology.length !== expectedTopology.length ||
    expectedMathTopology.some((item, index) => item !== expectedTopology[index])
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: independent visible math contract does not cover exact visible topology.`,
    );
  }
  for (const vizName of visibleNames) {
    const expectedCount = Math.max(
      ...expectedBindings
        .filter((binding) => binding.vizName === vizName)
        .map(({ occurrence }) => occurrence),
    ) + 1;
    const actualCount = actualElements.filter((element) =>
      attributeMap(element).get("data-viz-name") === vizName,
    ).length;
    if (actualCount !== expectedCount) {
      appendDependentTransitionIssue(
        issues,
        `${label}: visible element-name fingerprint ${safeDiagnosticFingerprint(vizName)} exact count ${actualCount} expected ${expectedCount}.`,
      );
    }
  }
  for (const topologyKey of expectedTopology) {
    const [vizName, occurrenceText] = topologyKey.split("\u0000");
    const occurrence = Number(occurrenceText);
    const matches = actualElements.filter((element) =>
      attributeMap(element).get("data-viz-name") === vizName,
    );
    const target = matches[occurrence];
    const mathContract = expectedMathContracts.find((contract) =>
      contract.vizName === vizName && contract.occurrence === occurrence
    );
    const elementBindings = expectedBindings.filter((binding) =>
      binding.vizName === vizName && binding.occurrence === occurrence
    );
    const tagBinding = elementBindings.find(({ attribute }) =>
      attribute === "__tag"
    );
    const expectedAttributes = [
      ["data-viz-name", vizName] as const,
      ...elementBindings
        .filter(({ attribute }) => !attribute.startsWith("__"))
        .map(({ attribute, expectedValue }) =>
          [attribute, expectedValue] as const
        ),
    ].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    if (
      !target ||
      !target.learnerVisible ||
      !tagBinding ||
      target.tagName !== tagBinding.expectedValue ||
      JSON.stringify(target.attributes) !== JSON.stringify(expectedAttributes)
    ) {
      appendDependentTransitionIssue(
        issues,
        `${label}: visible binding at occurrence=${occurrence}, name=${safeDiagnosticFingerprint(vizName)} is absent, hidden, wrong-tagged, or not the exact producer-whitelisted attribute set.`,
      );
    }
    if (
      !target ||
      !mathContract ||
      target.paintedSubtree.elementCount !== mathContract.elementCount ||
      target.paintedSubtree.hash !== mathContract.expectedHashes[language]
    ) {
      appendDependentTransitionIssue(
        issues,
        `${label}: visible math painted subtree geometry contract drifted at occurrence=${occurrence}, name=${safeDiagnosticFingerprint(vizName)}; primitive count, semantic attributes, critical-descendant visibility, text, and user-space geometry must match the independent manifest.`,
      );
    }
  }
  for (const contract of expectedTextContracts) {
    const matches = actualElements.filter((element) =>
      attributeMap(element).get("data-viz-name") === contract.vizName,
    );
    const target = matches[contract.occurrence];
    const expectedTextHash = createHash("sha256").update(
      contract.expectedTexts[language].normalize("NFC").replace(/\s+/g, " ").trim(),
    ).digest("hex");
    if (!target || target.textHash !== expectedTextHash) {
      appendDependentTransitionIssue(
        issues,
        `${label}: selected element exact language-bound text digest drifted.`,
      );
    }
  }
  for (const element of actualElements) {
    if (
      !rectIsPositive(element.renderedGeometry) ||
      !rectIsPositive(element.userGeometry) ||
      !contained(
        element.renderedGeometry,
        renderedSurfaceRect,
        pixelEpsilon,
      ) ||
      !contained(element.userGeometry, surface.viewBox, userEpsilon)
    ) {
      appendDependentTransitionIssue(
        issues,
        `${label}: selected element escaped the owned SVG viewBox or surface-relative rendered bounds.`,
      );
    }
  }
}

function canonicalVisibleSnapshotsMatch(
  baseline: HkVisualizationDependentTransitionCanonicalVisibleBaseline,
  restoration: HkVisualizationDependentTransitionRestorationObservation,
) {
  const pixelEpsilon = 0.75;
  const numbersMatch = (left: number, right: number, epsilon = pixelEpsilon) =>
    Number.isFinite(left) && Number.isFinite(right) &&
    Math.abs(left - right) <= epsilon;
  const rectsMatch = (
    left: HkVisualizationDependentTransitionRect,
    right: HkVisualizationDependentTransitionRect,
    epsilon = pixelEpsilon,
  ) => ["height", "width", "x", "y"].every((key) =>
    numbersMatch(
      left[key as keyof HkVisualizationDependentTransitionRect],
      right[key as keyof HkVisualizationDependentTransitionRect],
      epsilon,
    )
  );
  const leftSurface = baseline.surface;
  const rightSurface = restoration.surface;
  const userEpsilon = Math.max(
    0.05,
    pixelEpsilon * leftSurface.viewBox.width / leftSurface.renderedSize.width,
    pixelEpsilon * leftSurface.viewBox.height / leftSurface.renderedSize.height,
  );
  const surfaceMatches = leftSurface.tagName === rightSurface.tagName &&
    rectsMatch(leftSurface.viewBox, rightSurface.viewBox, userEpsilon) &&
    numbersMatch(leftSurface.renderedSize.height, rightSurface.renderedSize.height) &&
    numbersMatch(leftSurface.renderedSize.width, rightSurface.renderedSize.width) &&
    ([
      "clientHeight", "clientWidth", "maxScrollLeft", "scrollHeight",
      "scrollWidth",
    ] as const).every((key) =>
      numbersMatch(leftSurface.scrollport[key], rightSurface.scrollport[key])
    );
  return surfaceMatches &&
    JSON.stringify(baseline.visibleMathProjection.ancestryScaleSummary) ===
      JSON.stringify(
        restoration.visibleMathProjection.ancestryScaleSummary,
      ) &&
    baseline.visibleMathProjection.elementCount ===
      restoration.visibleMathProjection.elementCount &&
    baseline.visibleMathProjection.hash === restoration.visibleMathProjection.hash &&
    baseline.visibleElements.length === restoration.visibleElements.length &&
    baseline.visibleElements.every((left, index) => {
      const right = restoration.visibleElements[index];
      return Boolean(right) &&
        JSON.stringify(left.attributes) === JSON.stringify(right.attributes) &&
        left.learnerVisible === right.learnerVisible &&
        left.paintedSubtree.elementCount ===
          right.paintedSubtree.elementCount &&
        left.paintedSubtree.hash === right.paintedSubtree.hash &&
        left.tagName === right.tagName &&
        left.textHash === right.textHash &&
        rectsMatch(left.renderedGeometry, right.renderedGeometry) &&
        rectsMatch(left.userGeometry, right.userGeometry, userEpsilon);
    });
}

export function auditHkVisualizationDependentTransitionSequenceObservation(
  plan: HkVisualizationDependentTransitionSequencePlan,
  observation: HkVisualizationDependentTransitionSequenceObservation,
) {
  const issues: string[] = [];
  let label = "dependent-transition@invalid-shape";
  try {
    assertHkVisualizationDependentTransitionSequencePlanShape(plan);
    assertHkVisualizationDependentTransitionSequenceObservationShape(observation);
    label = `dependent-transition[sequence=${safeDiagnosticFingerprint(plan.sequenceId)},cell=${safeDiagnosticFingerprint(observation.cellId || "missing-cell")}]`;
  } catch (error) {
    appendDependentTransitionIssue(
      issues,
      `Dependent-transition exact schema rejected: ${error instanceof Error ? boundedDiagnostic(error.message) : "unknown schema error"}.`,
    );
    return finalizeDependentTransitionIssues(issues);
  }
  if (plan.schemaVersion !== HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION)
    appendDependentTransitionIssue(issues, `${label}: plan schema drifted.`);
  if (
    observation.schemaVersion !== plan.schemaVersion ||
    observation.sequenceId !== plan.sequenceId ||
    observation.labId !== plan.labId ||
    JSON.stringify(observation.modePreparation) !== JSON.stringify(plan.modePreparation) ||
    observation.modeId !== plan.modeId ||
    observation.domainId !== plan.domainId ||
    observation.planHash !== plan.planHash ||
    !observation.cellId.trim()
  ) appendDependentTransitionIssue(issues, `${label}: observation identity/schema/plan hash drifted.`);
  const observationTheme = dependentTransitionThemeFromCellId(observation.cellId);
  if (observationTheme === null || observation.theme !== observationTheme) {
    appendDependentTransitionIssue(
      issues,
      `${label}: first-class theme must bind exactly one light/dark cell identity.`,
    );
  }
  try {
    if (hashHkVisualizationDependentTransitionSequencePlan(plan) !== plan.planHash) {
      appendDependentTransitionIssue(
        issues,
        `${label}: plan content hash does not verify.`,
      );
    }
    if (
      hashHkVisualizationDependentTransitionSequenceObservation(observation) !==
      observation.observationHash
    ) {
      appendDependentTransitionIssue(
        issues,
        `${label}: observation content hash does not verify.`,
      );
    }
  } catch (error) {
    appendDependentTransitionIssue(
      issues,
      `${label}: bounded content hash rejected (${error instanceof Error ? safeDiagnosticFingerprint(error.message) : "unknown=true"}).`,
    );
    return finalizeDependentTransitionIssues(issues);
  }
  if (
    observation.phases.length !== plan.phases.length ||
    plan.phases.length !== HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS.length
  ) appendDependentTransitionIssue(issues, `${label}: phase cardinality is not exact pre/clamp/expand.`);
  for (let index = 0; index < plan.phases.length; index += 1) {
    const expected = plan.phases[index];
    const actual = observation.phases[index];
    if (!actual) continue;
    if (
      actual.phase !== expected.phase ||
      actual.id !== expected.id ||
      actual.resetCountSincePreviousPhase !== expected.resetCountSincePreviousPhase
    ) appendDependentTransitionIssue(issues, `${label}:phase[${index}]: phase ID/order/reset count drifted.`);
    if (actual.stateSignature !== expected.expectedStateSignature)
      appendDependentTransitionIssue(issues, `${label}:phase[${index}]: exact state signature drifted.`);
    if (
      actual.controls.length !== expected.expectedValues.length ||
      actual.controls.some((control, controlIndex) => {
        const value = expected.expectedValues[controlIndex];
        const descriptor = expected.expectedDescriptors[controlIndex];
        return !value || !descriptor ||
          control.controlId !== value.controlId ||
          !Object.is(control.value, value.value) ||
          JSON.stringify(control.descriptor) !== JSON.stringify(descriptor);
      })
    ) appendDependentTransitionIssue(issues, `${label}:phase[${index}]: live value/bounds/visibility drifted.`);
    const expectedSerializedPublicState = JSON.stringify(
      Object.fromEntries(
        expected.expectedPublicState.map(({ key, value }) => [key, value]),
      ),
    );
    if (actual.rawSerializedPublicState !== expectedSerializedPublicState) {
      appendDependentTransitionIssue(
        issues,
        `${label}:phase[${index}]: public state canonical JSON bytes drifted: expected{${safeDiagnosticFingerprint(expectedSerializedPublicState)}}, observed{${safeDiagnosticFingerprint(actual.rawSerializedPublicState)}}.`,
      );
    }
    let publicState: unknown;
    try {
      publicState = JSON.parse(actual.rawSerializedPublicState);
    } catch {
      appendDependentTransitionIssue(issues, `${label}:phase[${index}]: raw serialized public state is malformed.`);
    }
    if (
      publicState !== null &&
      typeof publicState === "object" &&
      !Array.isArray(publicState) &&
      (Object.getPrototypeOf(publicState) === Object.prototype ||
        Object.getPrototypeOf(publicState) === null)
    ) {
      const record = publicState as Record<string, unknown>;
      const expectedKeys = expected.expectedPublicState.map(({ key }) => key);
      const observedKeys = Object.keys(record);
      if (
        observedKeys.length !== expectedKeys.length ||
        observedKeys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
      ) {
        appendDependentTransitionIssue(
          issues,
          `${label}:phase[${index}]: public state exact ordered keys drifted: expected{${safeStringListFingerprint(expectedKeys)}}, observed{${safeStringListFingerprint(observedKeys)}}.`,
        );
      }
      for (let bindingIndex = 0; bindingIndex < expected.expectedPublicState.length; bindingIndex += 1) {
        const binding = expected.expectedPublicState[bindingIndex];
        if (!Object.is(record[binding.key], binding.value)) {
          appendDependentTransitionIssue(
            issues,
            `${label}:phase[${index}]: public state binding[${bindingIndex}] drifted: key{${safeDiagnosticFingerprint(binding.key)}}, observed{${safeJsonDiagnosticFingerprint(record[binding.key])}}, expected{${safeJsonDiagnosticFingerprint(binding.value)}}.`,
          );
        }
      }
    } else {
      appendDependentTransitionIssue(
        issues,
        `${label}:phase[${index}]: raw serialized public state must be one plain object.`,
      );
    }
    auditDependentTransitionVisibleElements(
      `${label}:phase[${index}]`,
      observation.language,
      expected.visibleBindings,
      expected.visibleTextContracts,
      expected.visibleMathContracts,
      actual.visibleElements,
      actual.surface,
      issues,
    );
    auditDependentTransitionVisibleMathProjection(
      `${label}:phase[${index}]`,
      observation.language,
      observationTheme,
      expected.visibleMathProjectionContract,
      actual.visibleMathProjection,
      issues,
    );
  }
  const clampExpected = plan.phases[1]?.expectedValues.find(
    ({ controlId }) => controlId === plan.dependentControlId,
  )?.value;
  const expandExpected = plan.phases[2]?.expectedValues.find(
    ({ controlId }) => controlId === plan.dependentControlId,
  )?.value;
  const clampObserved = observation.phases[1]?.controls.find(
    ({ controlId }) => controlId === plan.dependentControlId,
  )?.value;
  const expandObserved = observation.phases[2]?.controls.find(
    ({ controlId }) => controlId === plan.dependentControlId,
  )?.value;
  if (
    clampExpected === undefined ||
    expandExpected === undefined ||
    !Object.is(clampExpected, expandExpected) ||
    !Object.is(clampObserved, clampExpected) ||
    !Object.is(expandObserved, clampExpected)
  ) appendDependentTransitionIssue(issues, `${label}: expand phase resurrected or failed to retain the exact clamped dependent value.`);
  const restoration = observation.postSequenceRestoration;
  const expectedRestoration = plan.postSequenceRestoration;
  const baseline = observation.canonicalVisibleBaseline;
  if (
    hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(baseline) !==
    baseline.baselineHash
  ) {
    appendDependentTransitionIssue(issues, `${label}: canonical visible baseline content hash does not verify.`);
  }
  if (
    baseline.canonicalFingerprint !== restoration.canonicalFingerprint ||
    baseline.cellId !== observation.cellId ||
    baseline.language !== observation.language ||
    baseline.theme !== observation.theme ||
    baseline.planHash !== plan.planHash ||
    baseline.sequenceId !== plan.sequenceId
  ) {
    appendDependentTransitionIssue(
      issues,
      `${label}: canonical visible baseline identity/header binding drifted.`,
    );
  }
  auditDependentTransitionVisibleElements(
    `${label}:canonical-visible-baseline`,
    observation.language,
    expectedRestoration.visibleBindings,
    expectedRestoration.visibleTextContracts,
    expectedRestoration.visibleMathContracts,
    baseline.visibleElements,
    baseline.surface,
    issues,
  );
  auditDependentTransitionVisibleMathProjection(
    `${label}:canonical-visible-baseline`,
    observation.language,
    observationTheme,
    expectedRestoration.visibleMathProjectionContract,
    baseline.visibleMathProjection,
    issues,
  );
  if (!restoration) {
    appendDependentTransitionIssue(issues, `${label}: post-sequence restoration receipt is missing.`);
  } else {
    if (
      !restoration.canonicalFingerprint.trim() ||
      restoration.beforeFingerprint === restoration.canonicalFingerprint ||
      restoration.afterFingerprint !== restoration.canonicalFingerprint ||
      restoration.resetClickCount !== expectedRestoration.resetClickCount
    ) {
      appendDependentTransitionIssue(issues,
        `${label}: post-sequence restoration must prove noncanonical-before, exactly one Reset click, and canonical-after.`,
      );
    }
    if (
      restoration.canonicalVisibleBaselineHash !== baseline.baselineHash ||
      !canonicalVisibleSnapshotsMatch(baseline, restoration)
    ) {
      appendDependentTransitionIssue(issues,
        `${label}: post-sequence restoration does not deep-match the separately hashed canonical visible baseline within 0.75 CSS px.`,
      );
    }
    if (restoration.stateSignature !== expectedRestoration.expectedStateSignature) {
      appendDependentTransitionIssue(issues, `${label}: post-sequence restoration state signature drifted.`);
    }
    if (
      restoration.controls.length !== expectedRestoration.expectedValues.length ||
      restoration.controls.some((control, controlIndex) => {
        const value = expectedRestoration.expectedValues[controlIndex];
        const descriptor = expectedRestoration.expectedDescriptors[controlIndex];
        return !value || !descriptor ||
          control.controlId !== value.controlId ||
          !Object.is(control.value, value.value) ||
          JSON.stringify(control.descriptor) !== JSON.stringify(descriptor);
      })
    ) {
      appendDependentTransitionIssue(issues,
        `${label}: post-sequence restoration descriptor/value completeness drifted.`,
      );
    }
    const expectedRestorationPublicState = JSON.stringify(Object.fromEntries(
      expectedRestoration.expectedPublicState.map(({ key, value }) => [key, value]),
    ));
    if (restoration.rawSerializedPublicState !== expectedRestorationPublicState) {
      appendDependentTransitionIssue(
        issues,
        `${label}: post-sequence restoration public state canonical JSON bytes drifted: expected{${safeDiagnosticFingerprint(expectedRestorationPublicState)}}, observed{${safeDiagnosticFingerprint(restoration.rawSerializedPublicState)}}.`,
      );
    }
    auditDependentTransitionVisibleElements(
      `${label}:post-sequence-restoration`,
      observation.language,
      expectedRestoration.visibleBindings,
      expectedRestoration.visibleTextContracts,
      expectedRestoration.visibleMathContracts,
      restoration.visibleElements,
      restoration.surface,
      issues,
    );
    auditDependentTransitionVisibleMathProjection(
      `${label}:post-sequence-restoration`,
      observation.language,
      observationTheme,
      expectedRestoration.visibleMathProjectionContract,
      restoration.visibleMathProjection,
      issues,
    );
  }
  return finalizeDependentTransitionIssues(issues);
}

export function auditHkVisualizationDependentTransitionSequenceReceipt(args: Readonly<{
  canonicalFingerprint: string;
  cellId: string;
  expectedPlans: readonly HkVisualizationDependentTransitionSequencePlan[];
  language: HkVisualizationDependentTransitionLanguage;
  observations: readonly HkVisualizationDependentTransitionSequenceObservation[];
  theme: HkVisualizationDependentVisibleMathTheme;
}>) {
  const issues: string[] = [];
  try {
    assertCumulativeDependentTransitionSchemaBudget(
      "dependent-transition receipt input",
      args,
    );
    assertExactPlainObjectKeys("dependent-transition receipt input", args, [
      "canonicalFingerprint", "cellId", "expectedPlans", "language",
      "observations", "theme",
    ]);
    assertStringValue(
      "dependent-transition receipt input.canonicalFingerprint",
      args.canonicalFingerprint,
    );
    assertStringValue("dependent-transition receipt input.cellId", args.cellId);
    assertDependentTransitionLanguage(
      "dependent-transition receipt input.language",
      args.language,
    );
    assertDependentTransitionTheme(
      "dependent-transition receipt input.theme",
      args.theme,
    );
    assertDenseArray("dependent-transition receipt input.expectedPlans", args.expectedPlans);
    args.expectedPlans.forEach((plan) =>
      assertHkVisualizationDependentTransitionSequencePlanShape(plan)
    );
    assertDenseArray("dependent-transition receipt input.observations", args.observations);
    args.observations.forEach((observation) =>
      assertHkVisualizationDependentTransitionSequenceObservationShape(observation)
    );
  } catch (error) {
    appendDependentTransitionIssue(
      issues,
      `Dependent-transition receipt exact schema rejected: ${error instanceof Error ? boundedDiagnostic(error.message) : "unknown schema error"}.`,
    );
    return finalizeDependentTransitionIssues(issues);
  }
  if (!args.canonicalFingerprint.trim()) {
    appendDependentTransitionIssue(
      issues,
      "Dependent-transition receipt requires a nonblank canonicalFingerprint.",
    );
  }
  if (!args.cellId.trim()) {
    appendDependentTransitionIssue(
      issues,
      "Dependent-transition receipt requires a nonblank cellId.",
    );
  }
  if (dependentTransitionThemeFromCellId(args.cellId) !== args.theme) {
    appendDependentTransitionIssue(
      issues,
      "Dependent-transition receipt theme drifted from its cell header.",
    );
  }
  const expectedIds = args.expectedPlans.map(({ sequenceId }) => sequenceId);
  const observedIds = args.observations.map(({ sequenceId }) => sequenceId);
  if (
    expectedIds.length !== observedIds.length ||
    expectedIds.some((id, index) => observedIds[index] !== id) ||
    new Set(expectedIds).size !== expectedIds.length ||
    new Set(observedIds).size !== observedIds.length
  ) {
    appendDependentTransitionIssue(
      issues,
      `Dependent-transition receipt count/order drifted: expected{${safeStringListFingerprint(expectedIds)}}, observed{${safeStringListFingerprint(observedIds)}}.`,
    );
  }
  for (let index = 0; index < args.expectedPlans.length; index += 1) {
    const plan = args.expectedPlans[index];
    const observation = args.observations[index];
    if (!observation) continue;
    const sequenceLabel = `sequence{${safeDiagnosticFingerprint(plan.sequenceId)}}`;
    if (observation.cellId !== args.cellId) {
      appendDependentTransitionIssue(
        issues,
        `${sequenceLabel}: observation cellId drifted from receipt cell.`,
      );
    }
    if (observation.language !== args.language) {
      appendDependentTransitionIssue(
        issues,
        `${sequenceLabel}: observation language drifted from receipt header.`,
      );
    }
    if (
      observation.theme !== args.theme ||
      observation.canonicalVisibleBaseline.theme !== args.theme
    ) {
      appendDependentTransitionIssue(
        issues,
        `${sequenceLabel}: observation/baseline theme drifted from receipt header.`,
      );
    }
    if (
      observation.postSequenceRestoration.canonicalFingerprint !==
      args.canonicalFingerprint
    ) {
      appendDependentTransitionIssue(
        issues,
        `${sequenceLabel}: observation canonicalFingerprint drifted from receipt header.`,
      );
    }
    for (const issue of auditHkVisualizationDependentTransitionSequenceObservation(
      plan,
      observation,
    )) {
      appendDependentTransitionIssue(issues, issue);
    }
  }
  return finalizeDependentTransitionIssues(issues);
}

export type HkP6AveragesLineGraphPointObservation = Readonly<{
  hour: number;
  value: number;
  x: number;
  y: number;
}>;

export type HkP6AveragesLineGraphSegmentObservation = Readonly<{
  fromHour: number;
  fromValue: number;
  toHour: number;
  toValue: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}>;

export type HkP6AveragesLearnerVisibilityEvidence = Readonly<{
  ariaHiddenAncestor: boolean;
  hiddenAncestor: boolean;
  inertAncestor: boolean;
  visuallyVisible: boolean;
}>;

export type HkP6AveragesLineGraphObservation = Readonly<{
  dedicatedState: Readonly<{
    mode: "broken-line";
    seriesBShift: number;
    seriesCount: 2;
    values: readonly [number, number, number, number];
  }>;
  flags: Readonly<{
    seriesCoincident: string | null;
    seriesMeansEqual: string | null;
  }>;
  meanLines: Readonly<{
    A: Readonly<{ value: number; y: number }>;
    B: Readonly<{ value: number; y: number }>;
  }>;
  phase: string;
  points: Readonly<{
    A: readonly HkP6AveragesLineGraphPointObservation[];
    B: readonly HkP6AveragesLineGraphPointObservation[];
  }>;
  seriesBShift: number;
  serializedDedicatedState: string;
  segments: Readonly<{
    A: readonly HkP6AveragesLineGraphSegmentObservation[];
    B: readonly HkP6AveragesLineGraphSegmentObservation[];
  }>;
  tableRows: readonly Readonly<{
    hour: number;
    seriesA: number;
    seriesB: number;
  }>[];
  visibility: Readonly<{
    graph: HkP6AveragesLearnerVisibilityEvidence;
    meanLines: Readonly<{
      A: readonly HkP6AveragesLearnerVisibilityEvidence[];
      B: readonly HkP6AveragesLearnerVisibilityEvidence[];
    }>;
    meanReadout: HkP6AveragesLearnerVisibilityEvidence;
    points: Readonly<{
      A: readonly HkP6AveragesLearnerVisibilityEvidence[];
      B: readonly HkP6AveragesLearnerVisibilityEvidence[];
    }>;
    segments: Readonly<{
      A: readonly HkP6AveragesLearnerVisibilityEvidence[];
      B: readonly HkP6AveragesLearnerVisibilityEvidence[];
    }>;
    table: HkP6AveragesLearnerVisibilityEvidence;
    tableRows: readonly HkP6AveragesLearnerVisibilityEvidence[];
  }>;
}>;

export type HkP6BudgetBoundaryKind =
  | "positive-remaining"
  | "exact-zero"
  | "positive-overspend";

type HkP6BudgetRectGeometry = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

export type HkP6BudgetBoundaryObservation = Readonly<{
  boundary: HkP6BudgetBoundaryKind | null;
  dedicatedState: Readonly<{
    budget: number;
    count: number;
    extraCost: number;
    unitPrice: number;
    workflowStep: "represent" | "solve" | "check";
  }>;
  derived: Readonly<{
    itemCost: number;
    overspend: number;
    remaining: number;
    totalSpending: number;
    withinBudget: boolean;
  }>;
  phase: string;
  serializedDedicatedState: string;
  surface:
    | Readonly<{
        attributes: Readonly<{
          budget: number;
          extraCost: number;
          itemCost: number;
          overspend: number;
          remaining: number;
          scaleTotal: number;
          totalSpending: number;
          withinBudget: string | null;
        }>;
        geometry: Readonly<{
          comparisonScale: HkP6BudgetRectGeometry;
          extra: HkP6BudgetRectGeometry;
          item: HkP6BudgetRectGeometry;
          marker: Readonly<{
            budget: number;
            x1: number;
            x2: number;
            y1: number;
            y2: number;
          }>;
          overspend: (HkP6BudgetRectGeometry & Readonly<{ overspend: number }>) | null;
          remainder: (HkP6BudgetRectGeometry & Readonly<{ remaining: number }>) | null;
        }>;
        kind: "represent";
        visibility: Readonly<{
          comparisonScale: HkP6AveragesLearnerVisibilityEvidence;
          extra: HkP6AveragesLearnerVisibilityEvidence;
          item: HkP6AveragesLearnerVisibilityEvidence;
          marker: HkP6AveragesLearnerVisibilityEvidence;
          overspend: HkP6AveragesLearnerVisibilityEvidence | null;
          remainder: HkP6AveragesLearnerVisibilityEvidence | null;
          surface: HkP6AveragesLearnerVisibilityEvidence;
        }>;
      }>
    | Readonly<{
        kind: "solve";
        result: HkP6BudgetRectGeometry & Readonly<{
          kind: string | null;
          overspend: number;
          remaining: number;
          totalSpending: number;
          value: number;
          withinBudget: string | null;
        }>;
        visibility: Readonly<{
          result: HkP6AveragesLearnerVisibilityEvidence;
          surface: HkP6AveragesLearnerVisibilityEvidence;
        }>;
      }>
    | Readonly<{
        balance: Readonly<{
          left: number;
          overspend: number;
          remaining: number;
          right: number;
          status: string | null;
          totalSpending: number;
          withinBudget: string | null;
        }>;
        geometry: Readonly<{
          beam: Readonly<{ x1: number; x2: number; y1: number; y2: number }>;
          leftCard: HkP6BudgetRectGeometry;
          rightCard: HkP6BudgetRectGeometry;
        }>;
        kind: "check";
        visibility: Readonly<{
          beam: HkP6AveragesLearnerVisibilityEvidence;
          leftCard: HkP6AveragesLearnerVisibilityEvidence;
          rightCard: HkP6AveragesLearnerVisibilityEvidence;
          surface: HkP6AveragesLearnerVisibilityEvidence;
        }>;
      }>;
}>;

export type HkVisualizationDynamicRangePlanOptions = Readonly<{
  domainId: HkExecutableDynamicRangeDomainId;
  labId: string;
}>;

const MAXIMUM_EXHAUSTIVE_RANGE_COUNT = 12;

function finiteNumber(label: string, value: number) {
  if (!Number.isFinite(value) || Object.is(value, -0))
    throw new Error(
      `${label} must be finite and must not be negative zero; received ${String(value)}.`,
    );
  return value;
}

function precisionFor(value: number) {
  const text = String(value).toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1]) || 0;
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

function normalizedNumber(
  value: number,
  descriptor: HkVisualizationRangeDescriptor,
) {
  const precision = Math.min(
    12,
    Math.max(
      precisionFor(descriptor.minimum),
      precisionFor(descriptor.maximum),
      precisionFor(descriptor.step),
    ) + 2,
  );
  return Number(value.toFixed(precision));
}

function midpoint(descriptor: HkVisualizationRangeDescriptor) {
  const stepCount = (descriptor.maximum - descriptor.minimum) / descriptor.step;
  const offset = Math.round(stepCount / 2) * descriptor.step;
  return normalizedNumber(
    Math.min(
      descriptor.maximum,
      Math.max(descriptor.minimum, descriptor.minimum + offset),
    ),
    descriptor,
  );
}

export function signatureForHkVisualizationRangeValues(
  values: readonly HkVisualizationRangeStateValue[],
) {
  return values
    .map(
      ({ controlId, value }) =>
        `${controlId}=${Object.is(value, -0) ? 0 : value}`,
    )
    .join("|");
}

function signatureFor(values: readonly HkVisualizationRangeStateValue[]) {
  return signatureForHkVisualizationRangeValues(values);
}

function valuesFromState(
  descriptors: readonly HkVisualizationRangeDescriptor[],
  state: Readonly<Record<string, number>>,
) {
  return Object.freeze(
    descriptors.map((descriptor) =>
      Object.freeze({
        controlId: descriptor.controlId,
        value: normalizedNumber(state[descriptor.controlId], descriptor),
      }),
    ),
  );
}

const HK_P6_AVERAGES_CONTROL_IDS = Object.freeze([
  "value1",
  "value2",
  "value3",
  "value4",
  "seriesBShift",
] as const);

const HK_P6_BUDGET_CONTROL_CONTRACT = Object.freeze([
  Object.freeze({ controlId: "budget", maximum: 200, minimum: 50, step: 1 }),
  Object.freeze({ controlId: "count", maximum: 6, minimum: 1, step: 1 }),
  Object.freeze({ controlId: "unitPrice", maximum: 40, minimum: 5, step: 1 }),
  Object.freeze({ controlId: "extraCost", maximum: 50, minimum: 0, step: 1 }),
] as const);

const HK_P6_BUDGET_BOUNDARY_STATES = Object.freeze([
  Object.freeze({
    boundary: "positive-remaining" as const,
    state: Object.freeze({ budget: 60, count: 5, extraCost: 0, unitPrice: 10 }),
  }),
  Object.freeze({
    boundary: "exact-zero" as const,
    state: Object.freeze({ budget: 50, count: 5, extraCost: 0, unitPrice: 10 }),
  }),
  Object.freeze({
    boundary: "positive-overspend" as const,
    state: Object.freeze({ budget: 50, count: 5, extraCost: 10, unitPrice: 10 }),
  }),
] as const);

function rangeValue(
  entry: HkVisualizationRangeStatePlanEntry,
  controlId: string,
) {
  return entry.values.find((value) => value.controlId === controlId)?.value;
}

/**
 * Binds two independently named, chronologically executed semantic states to
 * the otherwise generic Cartesian range plan. The zero state must execute
 * before the ordinary positive state so a stale equality result cannot survive
 * the transition back out of coincidence.
 */
export function bindHkP6AveragesLineGraphBoundaryStates(
  labId: string,
  modeId: string,
  descriptors: readonly HkVisualizationRangeDescriptor[],
  plan: readonly HkVisualizationRangeStatePlanEntry[],
) {
  if (labId !== "p6-ratio-proportion" || modeId !== "2") return plan;
  const observedControlIds = descriptors.map(({ controlId }) => controlId);
  if (
    observedControlIds.length !== HK_P6_AVERAGES_CONTROL_IDS.length
    || observedControlIds.some(
      (controlId, index) => controlId !== HK_P6_AVERAGES_CONTROL_IDS[index],
    )
  ) {
    throw new Error(
      `p6-ratio-proportion two-series ranges must retain ${HK_P6_AVERAGES_CONTROL_IDS.join(", ")}; observed ${observedControlIds.join(", ")}.`,
    );
  }
  const shift = descriptors.at(-1);
  if (
    !shift
    || shift.initial !== 2
    || shift.minimum !== 0
    || shift.maximum !== 2
    || shift.step !== 1
  ) {
    throw new Error(
      `p6-ratio-proportion seriesBShift must retain reset=2 and domain 0..2 step 1; observed ${JSON.stringify(shift)}.`,
    );
  }
  const zeroIndex = plan.findIndex(
    (entry) =>
      entry.reasons.includes("control:seriesBShift:minimum")
      && rangeValue(entry, "seriesBShift") === 0,
  );
  const positiveIndex = plan.findIndex(
    (entry, index) =>
      index > zeroIndex
      && entry.reasons.includes("control:seriesBShift:midpoint")
      && (rangeValue(entry, "seriesBShift") ?? 0) > 0,
  );
  if (zeroIndex < 0 || positiveIndex <= zeroIndex) {
    throw new Error(
      "p6-ratio-proportion two-series plan must execute shift=0 before a named ordinary shift>0 state.",
    );
  }
  return Object.freeze(plan.map((entry, index) => {
    const semanticReason = index === zeroIndex
      ? "semantic-boundary:p6-series-shift-zero" as const
      : index === positiveIndex
        ? "semantic-boundary:p6-series-shift-positive" as const
        : null;
    if (!semanticReason) return entry;
    return Object.freeze({
      ...entry,
      reasons: Object.freeze([...entry.reasons, semanticReason]),
    });
  }));
}

function p6BudgetSemanticPlanEntry(
  modeId: string,
  boundary: HkP6BudgetBoundaryKind,
  state: Readonly<Record<string, number>>,
  descriptors: readonly HkVisualizationRangeDescriptor[],
  template: HkVisualizationRangeStatePlanEntry,
  inheritedReasons: readonly HkVisualizationRangeStateReason[],
): HkVisualizationRangeStatePlanEntry {
  const values = Object.freeze(descriptors.map((descriptor) => {
    const value = finiteNumber(
      `p6 budget ${boundary}.${descriptor.controlId}`,
      state[descriptor.controlId],
    );
    const stepOffset = (value - descriptor.minimum) / descriptor.step;
    if (
      value < descriptor.minimum
      || value > descriptor.maximum
      || Math.abs(stepOffset - Math.round(stepOffset)) > 1e-9
    ) {
      throw new Error(
        `p6 budget ${boundary} cannot execute ${descriptor.controlId}=${value} in [${descriptor.minimum}, ${descriptor.maximum}] step ${descriptor.step}.`,
      );
    }
    return Object.freeze({ controlId: descriptor.controlId, value });
  }));
  const signature = signatureFor(values);
  const reason = `semantic-boundary:p6-budget-${boundary}` as const;
  return Object.freeze({
    actionSignature: signature,
    applicationOrder: Object.freeze(values.map(({ controlId }) => controlId)),
    actions: Object.freeze(values.map(({ controlId, value }) => Object.freeze({
      affectedControlIds: Object.freeze([]),
      allowProjectedAbsence: false,
      controlId,
      expectedValue: value,
      projectedAbsenceRequirements: null,
      projectedByControllerIds: Object.freeze([]),
      requestedValue: value,
    }))),
    boundaryIds: Object.freeze([]),
    domainId: null,
    expectedDescriptors: Object.freeze([...template.expectedDescriptors]),
    expectedSignature: signature,
    expectedValues: values,
    id: `${modeId}:semantic:p6-budget-${boundary}`,
    projectionEvidence: Object.freeze([]),
    reasons: Object.freeze([
      ...inheritedReasons.filter((candidate) => candidate !== reason),
      reason,
    ]),
    requestedSignature: signature,
    requestedValues: values,
    signature,
    startingSignature: template.startingSignature,
    startingValues: Object.freeze([...template.startingValues]),
    values,
  });
}

/**
 * Appends three exact economic boundary states to every workflow that exposes
 * an independently auditable learner surface. The fixed order crosses from a
 * positive remainder through exactly zero and then into positive overspend so
 * stale branch state cannot masquerade as current evidence.
 */
export function bindHkP6BudgetBoundaryStates(
  labId: string,
  modeId: string,
  descriptors: readonly HkVisualizationRangeDescriptor[],
  plan: readonly HkVisualizationRangeStatePlanEntry[],
) {
  if (labId !== "p6-pre-secondary-problem-solving") return plan;
  if (!(modeId === "represent" || modeId === "solve" || modeId === "check")) {
    return plan;
  }
  if (descriptors.length !== HK_P6_BUDGET_CONTROL_CONTRACT.length) {
    throw new Error(
      `p6 budget must retain exact control order ${HK_P6_BUDGET_CONTROL_CONTRACT.map(({ controlId }) => controlId).join(", ")}.`,
    );
  }
  for (let index = 0; index < HK_P6_BUDGET_CONTROL_CONTRACT.length; index += 1) {
    const expected = HK_P6_BUDGET_CONTROL_CONTRACT[index];
    const observed = descriptors[index];
    if (
      !observed
      || observed.controlId !== expected.controlId
      || observed.minimum !== expected.minimum
      || observed.maximum !== expected.maximum
      || observed.step !== expected.step
    ) {
      throw new Error(
        `p6 budget ${modeId} must retain ${expected.controlId} ${expected.minimum}..${expected.maximum} step ${expected.step} at control index ${index}; observed ${JSON.stringify(observed)}.`,
      );
    }
  }
  const template = plan[0];
  if (!template) {
    throw new Error(`p6 budget ${modeId} cannot execute semantic boundaries without a base range plan.`);
  }
  const targetSignatures = new Set(
    HK_P6_BUDGET_BOUNDARY_STATES.map(({ state }) => signatureFor(
      descriptors.map(({ controlId }) => ({
        controlId,
        value: (state as Readonly<Record<string, number>>)[controlId],
      })),
    )),
  );
  const inheritedBySignature = new Map(
    plan
      .filter(({ signature }) => targetSignatures.has(signature))
      .map(({ reasons, signature }) => [signature, reasons] as const),
  );
  const retained = plan.filter(({ signature }) => !targetSignatures.has(signature));
  const semantic = HK_P6_BUDGET_BOUNDARY_STATES.map(({ boundary, state }) => {
    const signature = signatureFor(
      descriptors.map(({ controlId }) => ({
        controlId,
        value: (state as Readonly<Record<string, number>>)[controlId],
      })),
    );
    return p6BudgetSemanticPlanEntry(
      modeId,
      boundary,
      state,
      descriptors,
      template,
      inheritedBySignature.get(signature) ?? [],
    );
  });
  const combined = Object.freeze([...retained, ...semantic]);
  if (
    new Set(combined.map(({ id }) => id)).size !== combined.length
    || new Set(combined.map(({ signature }) => signature)).size !== combined.length
  ) {
    throw new Error(`p6 budget ${modeId} semantic plan contains duplicate ids or signatures.`);
  }
  return combined;
}

function p6NumbersClose(left: number, right: number) {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function p6BudgetVisibilityIssues(
  label: string,
  evidence: HkP6AveragesLearnerVisibilityEvidence,
  requirePaint: boolean,
) {
  const issues: string[] = [];
  if (
    evidence.hiddenAncestor
    || evidence.inertAncestor
    || evidence.ariaHiddenAncestor
  ) {
    issues.push(`${label} must not be hidden, inert, or aria-hidden.`);
  }
  if (requirePaint && !evidence.visuallyVisible) {
    issues.push(`${label} must be visibly painted on the learner surface.`);
  }
  return issues;
}

function p6BudgetRectIssues(
  label: string,
  observed: HkP6BudgetRectGeometry,
  expected: HkP6BudgetRectGeometry,
) {
  return (["x", "y", "width", "height"] as const).flatMap((key) =>
    p6NumbersClose(observed[key], expected[key])
      ? []
      : [`${label}.${key} must equal ${expected[key]}; observed ${observed[key]}.`],
  );
}

/** Independent raw-state, arithmetic, visibility, and geometry oracle for P6 budget boundaries. */
export function auditHkP6BudgetBoundaryObservation(
  observation: HkP6BudgetBoundaryObservation,
) {
  const issues: string[] = [];
  const state = observation.dedicatedState;
  let parsedState: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(observation.serializedDedicatedState) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsedState = parsed as Record<string, unknown>;
    }
  } catch {
    // The single fail-closed issue below covers malformed JSON.
  }
  if (!parsedState) {
    issues.push("serialized P6 budget dedicated state must be readable object JSON.");
  }
  for (const key of ["budget", "count", "unitPrice", "extraCost"] as const) {
    if (!Number.isFinite(state[key])) {
      issues.push(`dedicated P6 budget ${key} must be finite.`);
    }
    if (!p6NumbersClose(Number(parsedState?.[key]), state[key])) {
      issues.push(`serialized P6 budget ${key} must match parsed dedicated state.`);
    }
  }
  if (parsedState?.workflowStep !== state.workflowStep) {
    issues.push("serialized P6 budget workflowStep must match parsed dedicated state.");
  }
  if (
    state.budget < 50 || state.budget > 200
    || state.count < 1 || state.count > 6 || !Number.isInteger(state.count)
    || state.unitPrice < 5 || state.unitPrice > 40
    || state.extraCost < 0 || state.extraCost > 50
  ) {
    issues.push("dedicated P6 budget state must remain within the four production control domains.");
  }
  const expectedItemCost = state.count * state.unitPrice;
  const expectedTotalSpending = expectedItemCost + state.extraCost;
  const expectedRemaining = state.budget - expectedTotalSpending;
  const expectedWithinBudget = expectedRemaining >= 0;
  const expectedOverspend = Math.max(0, -expectedRemaining);
  const expectedDerived = {
    itemCost: expectedItemCost,
    overspend: expectedOverspend,
    remaining: expectedRemaining,
    totalSpending: expectedTotalSpending,
  } as const;
  for (const [key, expected] of Object.entries(expectedDerived) as Array<
    [keyof typeof expectedDerived, number]
  >) {
    if (!p6NumbersClose(observation.derived[key], expected)) {
      issues.push(`derived P6 budget ${key} must equal ${expected}; observed ${observation.derived[key]}.`);
    }
  }
  if (observation.derived.withinBudget !== expectedWithinBudget) {
    issues.push(`withinBudget must be ${String(expectedWithinBudget)} at remaining=${expectedRemaining}.`);
  }
  if (observation.boundary) {
    const expectedBoundary = HK_P6_BUDGET_BOUNDARY_STATES.find(
      ({ boundary }) => boundary === observation.boundary,
    );
    if (!expectedBoundary) {
      issues.push(`unknown P6 budget boundary ${observation.boundary}.`);
    } else {
      for (const key of ["budget", "count", "unitPrice", "extraCost"] as const) {
        if (!p6NumbersClose(state[key], expectedBoundary.state[key])) {
          issues.push(
            `${observation.boundary} must execute exact ${key}=${expectedBoundary.state[key]}; observed ${state[key]}.`,
          );
        }
      }
    }
  }
  if (observation.surface.kind !== state.workflowStep) {
    issues.push(`visible P6 budget surface ${observation.surface.kind} must match workflowStep ${state.workflowStep}.`);
  }

  if (observation.surface.kind === "represent") {
    const { attributes, geometry, visibility } = observation.surface;
    const expectedScaleTotal = Math.max(state.budget, expectedTotalSpending);
    const expectedBudgetWidth = 470 * state.budget / expectedScaleTotal;
    const expectedItemWidth = 470 * expectedItemCost / expectedScaleTotal;
    const expectedExtraWidth = 470 * state.extraCost / expectedScaleTotal;
    const expectedRemainderWidth = expectedWithinBudget
      ? 470 * expectedRemaining / expectedScaleTotal
      : 0;
    const expectedOverspendWidth = expectedWithinBudget
      ? 0
      : 470 * expectedOverspend / expectedScaleTotal;
    const expectedAttributes = {
      budget: state.budget,
      extraCost: state.extraCost,
      itemCost: expectedItemCost,
      overspend: expectedOverspend,
      remaining: expectedRemaining,
      scaleTotal: expectedScaleTotal,
      totalSpending: expectedTotalSpending,
    } as const;
    for (const [key, expected] of Object.entries(expectedAttributes) as Array<
      [keyof typeof expectedAttributes, number]
    >) {
      if (!p6NumbersClose(attributes[key], expected)) {
        issues.push(`visible budget bar ${key} must equal ${expected}; observed ${attributes[key]}.`);
      }
    }
    if (attributes.withinBudget !== String(expectedWithinBudget)) {
      issues.push(`visible budget bar withinBudget must be ${String(expectedWithinBudget)}.`);
    }
    issues.push(...p6BudgetRectIssues(
      "comparison scale",
      geometry.comparisonScale,
      { height: 92, width: 470, x: 85, y: 128 },
    ));
    issues.push(...p6BudgetRectIssues(
      "item spending bar",
      geometry.item,
      { height: 92, width: expectedItemWidth, x: 85, y: 128 },
    ));
    issues.push(...p6BudgetRectIssues(
      "extra spending bar",
      geometry.extra,
      { height: 92, width: expectedExtraWidth, x: 85 + expectedItemWidth, y: 128 },
    ));
    const expectedMarkerX = 85 + expectedBudgetWidth;
    if (
      !p6NumbersClose(geometry.marker.budget, state.budget)
      || !p6NumbersClose(geometry.marker.x1, expectedMarkerX)
      || !p6NumbersClose(geometry.marker.x2, expectedMarkerX)
      || !p6NumbersClose(geometry.marker.y1, 112)
      || !p6NumbersClose(geometry.marker.y2, 246)
    ) {
      issues.push("visible budget marker must occupy the exact scaled budget coordinate.");
    }
    if (expectedWithinBudget) {
      if (!geometry.remainder) {
        issues.push("within-budget represent surface must expose one remainder segment, including exact width zero.");
      } else {
        issues.push(...p6BudgetRectIssues(
          "remaining bar",
          geometry.remainder,
          {
            height: 92,
            width: expectedRemainderWidth,
            x: 85 + expectedItemWidth + expectedExtraWidth,
            y: 128,
          },
        ));
        if (!p6NumbersClose(geometry.remainder.remaining, expectedRemaining)) {
          issues.push("remaining bar attribute must equal signed remaining budget.");
        }
      }
      if (geometry.overspend) {
        issues.push("within-budget represent surface must not expose an overspend segment.");
      }
    } else {
      if (geometry.remainder) {
        issues.push("over-budget represent surface must not expose a remainder segment.");
      }
      if (!geometry.overspend) {
        issues.push("over-budget represent surface must expose one positive overspend segment.");
      } else {
        issues.push(...p6BudgetRectIssues(
          "overspend bar",
          geometry.overspend,
          { height: 18, width: expectedOverspendWidth, x: expectedMarkerX, y: 226 },
        ));
        if (!p6NumbersClose(geometry.overspend.overspend, expectedOverspend)) {
          issues.push("overspend bar attribute must equal positive overspend.");
        }
      }
    }
    for (const [label, evidence, requirePaint] of [
      ["budget bar surface", visibility.surface, true],
      ["comparison scale", visibility.comparisonScale, true],
      ["item spending bar", visibility.item, expectedItemWidth > 0],
      ["extra spending bar", visibility.extra, expectedExtraWidth > 0],
      ["budget marker", visibility.marker, true],
    ] as const) {
      issues.push(...p6BudgetVisibilityIssues(label, evidence, requirePaint));
    }
    if (visibility.remainder) {
      issues.push(...p6BudgetVisibilityIssues(
        "remaining bar",
        visibility.remainder,
        expectedRemainderWidth > 0,
      ));
    }
    if (visibility.overspend) {
      issues.push(...p6BudgetVisibilityIssues(
        "overspend bar",
        visibility.overspend,
        expectedOverspendWidth > 0,
      ));
    }
  } else if (observation.surface.kind === "solve") {
    const { result, visibility } = observation.surface;
    const expectedKind = expectedWithinBudget ? "remaining" : "overspend";
    const expectedValue = expectedWithinBudget ? expectedRemaining : expectedOverspend;
    if (
      result.kind !== expectedKind
      || !p6NumbersClose(result.value, expectedValue)
      || !p6NumbersClose(result.totalSpending, expectedTotalSpending)
      || !p6NumbersClose(result.remaining, expectedRemaining)
      || !p6NumbersClose(result.overspend, expectedOverspend)
      || result.withinBudget !== String(expectedWithinBudget)
    ) {
      issues.push("visible solve result must bind exact spending, remaining/overspend branch, and value.");
    }
    issues.push(...p6BudgetRectIssues(
      "solve result card",
      result,
      { height: 68, width: 140, x: 466, y: 202 },
    ));
    issues.push(...p6BudgetVisibilityIssues("solve surface", visibility.surface, true));
    issues.push(...p6BudgetVisibilityIssues("solve result card", visibility.result, true));
  } else {
    const { balance, geometry, visibility } = observation.surface;
    const expectedLeft = expectedWithinBudget
      ? expectedTotalSpending + expectedRemaining
      : state.budget + expectedOverspend;
    const expectedRight = expectedWithinBudget ? state.budget : expectedTotalSpending;
    if (
      !p6NumbersClose(balance.left, expectedLeft)
      || !p6NumbersClose(balance.right, expectedRight)
      || balance.status !== (expectedWithinBudget ? "within-budget" : "over-budget")
      || !p6NumbersClose(balance.totalSpending, expectedTotalSpending)
      || !p6NumbersClose(balance.remaining, expectedRemaining)
      || !p6NumbersClose(balance.overspend, expectedOverspend)
      || balance.withinBudget !== String(expectedWithinBudget)
    ) {
      issues.push("visible check balance must bind exact equal totals, status, spending, remaining, and overspend.");
    }
    if (
      !p6NumbersClose(geometry.beam.x1, 128)
      || !p6NumbersClose(geometry.beam.x2, 512)
      || !p6NumbersClose(geometry.beam.y1, 246)
      || !p6NumbersClose(geometry.beam.y2, 246)
    ) {
      issues.push("visible check beam must remain horizontal at the exact comparison geometry.");
    }
    issues.push(...p6BudgetRectIssues(
      "check left card",
      geometry.leftCard,
      { height: 72, width: 172, x: 106, y: 126 },
    ));
    issues.push(...p6BudgetRectIssues(
      "check right card",
      geometry.rightCard,
      { height: 72, width: 172, x: 362, y: 126 },
    ));
    issues.push(...p6BudgetVisibilityIssues("check surface", visibility.surface, true));
    issues.push(...p6BudgetVisibilityIssues("check beam", visibility.beam, true));
    issues.push(...p6BudgetVisibilityIssues("check left card", visibility.leftCard, true));
    issues.push(...p6BudgetVisibilityIssues("check right card", visibility.rightCard, true));
  }
  return Object.freeze(issues);
}

/** Independent numeric/geometry oracle for the visible P6 two-series graph. */
export function auditHkP6AveragesLineGraphObservation(
  observation: HkP6AveragesLineGraphObservation,
) {
  const issues: string[] = [];
  const hours = [9, 10, 11, 12] as const;
  const expectedX = (index: number) => 94 + index * 92;
  const expectedY = (value: number) => 276 - (value / 14) * (276 - 34);
  const shift = observation.seriesBShift;
  let parsedDedicatedState: unknown;
  try {
    parsedDedicatedState = JSON.parse(observation.serializedDedicatedState);
  } catch {
    issues.push("serialized dedicated state must be readable JSON.");
  }
  if (
    observation.dedicatedState.mode !== "broken-line"
    || observation.dedicatedState.seriesCount !== 2
    || !p6NumbersClose(observation.dedicatedState.seriesBShift, shift)
    || observation.dedicatedState.values.length !== 4
    || observation.dedicatedState.values.some((value) => !Number.isFinite(value))
    || !parsedDedicatedState
    || typeof parsedDedicatedState !== "object"
    || Array.isArray(parsedDedicatedState)
    || (parsedDedicatedState as Record<string, unknown>).mode !== "broken-line"
    || (parsedDedicatedState as Record<string, unknown>).seriesCount !== 2
    || !p6NumbersClose(
      Number((parsedDedicatedState as Record<string, unknown>).seriesBShift),
      shift,
    )
    || observation.dedicatedState.values.some(
      (value, index) => !p6NumbersClose(
        Number((parsedDedicatedState as Record<string, unknown>)[`value${index + 1}`]),
        value,
      ),
    )
  ) {
    issues.push("serialized and parsed dedicated state must both bind broken-line, two-series, and the exact shift.");
  }
  if (!Number.isFinite(shift) || shift < 0 || shift > 2) {
    issues.push(`seriesBShift must be finite in [0,2]; observed ${String(shift)}.`);
  }
  if (observation.tableRows.length !== 4) {
    issues.push(`table must expose 4 rows; observed ${observation.tableRows.length}.`);
  }
  if (observation.points.A.length !== 4 || observation.points.B.length !== 4) {
    issues.push(
      `series points must expose 4 A and 4 B points; observed ${observation.points.A.length}/${observation.points.B.length}.`,
    );
  }
  if (observation.segments.A.length !== 3 || observation.segments.B.length !== 3) {
    issues.push(
      `series segments must expose 3 A and 3 B segments; observed ${observation.segments.A.length}/${observation.segments.B.length}.`,
    );
  }
  if (
    observation.visibility.tableRows.length !== 4
    || observation.visibility.points.A.length !== 4
    || observation.visibility.points.B.length !== 4
    || observation.visibility.segments.A.length !== 3
    || observation.visibility.segments.B.length !== 3
    || observation.visibility.meanLines.A.length !== 1
    || observation.visibility.meanLines.B.length !== 1
  ) {
    issues.push("visibility evidence must cover the graph, table, all 4+4 points, all 3+3 segments, readout, and both mean lines exactly.");
  }
  const visibilityEvidence = [
    ["graph", observation.visibility.graph],
    ["table", observation.visibility.table],
    ["mean readout", observation.visibility.meanReadout],
    ...observation.visibility.tableRows.map((evidence, index) => [`table row ${index}`, evidence] as const),
    ...observation.visibility.points.A.map((evidence, index) => [`series A point ${index}`, evidence] as const),
    ...observation.visibility.points.B.map((evidence, index) => [`series B point ${index}`, evidence] as const),
    ...observation.visibility.segments.A.map((evidence, index) => [`series A segment ${index}`, evidence] as const),
    ...observation.visibility.segments.B.map((evidence, index) => [`series B segment ${index}`, evidence] as const),
    ...observation.visibility.meanLines.A.map((evidence, index) => [`series A mean line ${index}`, evidence] as const),
    ...observation.visibility.meanLines.B.map((evidence, index) => [`series B mean line ${index}`, evidence] as const),
  ] as const;
  for (const [label, evidence] of visibilityEvidence) {
    if (
      !evidence.visuallyVisible
      || evidence.hiddenAncestor
      || evidence.inertAncestor
      || evidence.ariaHiddenAncestor
    ) {
      issues.push(`${label} must be learner-visible on the active graph surface.`);
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const row = observation.tableRows[index];
    const pointA = observation.points.A[index];
    const pointB = observation.points.B[index];
    if (!row || !pointA || !pointB) continue;
    const expectedHour = hours[index];
    if (row.hour !== expectedHour || pointA.hour !== expectedHour || pointB.hour !== expectedHour) {
      issues.push(`row/point ${index} must bind hour ${expectedHour}.`);
    }
    if (!p6NumbersClose(row.seriesB, row.seriesA + shift)) {
      issues.push(`table row ${index} must satisfy B=A+shift.`);
    }
    if (!p6NumbersClose(row.seriesA, observation.dedicatedState.values[index])) {
      issues.push(`table row ${index} series A must match dedicated state value${index + 1}.`);
    }
    if (!p6NumbersClose(pointA.value, row.seriesA) || !p6NumbersClose(pointB.value, row.seriesB)) {
      issues.push(`point ${index} values must match the same table row.`);
    }
    for (const [series, point] of [["A", pointA], ["B", pointB]] as const) {
      if (!p6NumbersClose(point.x, expectedX(index)) || !p6NumbersClose(point.y, expectedY(point.value))) {
        issues.push(`series ${series} point ${index} must occupy the exact visible graph coordinate.`);
      }
    }
    if (!p6NumbersClose(pointA.x, pointB.x)) {
      issues.push(`series A/B point ${index} must share its time coordinate.`);
    }
    if (shift === 0 && (!p6NumbersClose(pointA.value, pointB.value) || !p6NumbersClose(pointA.y, pointB.y))) {
      issues.push(`zero-shift A/B point ${index} must exactly coincide.`);
    }
    if (shift > 0 && !(pointB.y < pointA.y)) {
      issues.push(`positive-shift B point ${index} must be visibly above A.`);
    }
  }

  for (let index = 0; index < 3; index += 1) {
    const segmentA = observation.segments.A[index];
    const segmentB = observation.segments.B[index];
    const pointA0 = observation.points.A[index];
    const pointA1 = observation.points.A[index + 1];
    const pointB0 = observation.points.B[index];
    const pointB1 = observation.points.B[index + 1];
    if (!segmentA || !segmentB || !pointA0 || !pointA1 || !pointB0 || !pointB1) continue;
    for (const [series, segment, from, to] of [
      ["A", segmentA, pointA0, pointA1],
      ["B", segmentB, pointB0, pointB1],
    ] as const) {
      if (
        segment.fromHour !== from.hour
        || segment.toHour !== to.hour
        || !p6NumbersClose(segment.fromValue, from.value)
        || !p6NumbersClose(segment.toValue, to.value)
        || !p6NumbersClose(segment.x1, from.x)
        || !p6NumbersClose(segment.y1, from.y)
        || !p6NumbersClose(segment.x2, to.x)
        || !p6NumbersClose(segment.y2, to.y)
      ) {
        issues.push(`series ${series} segment ${index} must exactly join its adjacent visible points.`);
      }
    }
    if (shift === 0 && (
      !p6NumbersClose(segmentA.x1, segmentB.x1)
      || !p6NumbersClose(segmentA.x2, segmentB.x2)
      || !p6NumbersClose(segmentA.y1, segmentB.y1)
      || !p6NumbersClose(segmentA.y2, segmentB.y2)
    )) {
      issues.push(`zero-shift A/B segment ${index} endpoints must exactly coincide.`);
    }
    if (shift > 0 && !(segmentB.y1 < segmentA.y1 && segmentB.y2 < segmentA.y2)) {
      issues.push(`positive-shift B segment ${index} must be visibly above A at both endpoints.`);
    }
  }

  const expectedMeanA = observation.tableRows.length === 4
    ? observation.tableRows.reduce((total, row) => total + row.seriesA, 0) / 4
    : Number.NaN;
  const expectedMeanB = expectedMeanA + shift;
  if (
    !p6NumbersClose(observation.meanLines.A.value, expectedMeanA)
    || !p6NumbersClose(observation.meanLines.B.value, expectedMeanB)
    || !p6NumbersClose(observation.meanLines.A.y, expectedY(expectedMeanA))
    || !p6NumbersClose(observation.meanLines.B.y, expectedY(expectedMeanB))
  ) {
    issues.push("series mean values and visible mean-line geometry must match the table datasets.");
  }
  const expectedEqual = shift === 0;
  if (observation.flags.seriesCoincident !== String(expectedEqual)) {
    issues.push(`data-viz-series-coincident must be ${String(expectedEqual)}.`);
  }
  if (observation.flags.seriesMeansEqual !== String(expectedEqual)) {
    issues.push(`data-viz-series-means-equal must be ${String(expectedEqual)}.`);
  }
  if (expectedEqual && !p6NumbersClose(observation.meanLines.A.value, observation.meanLines.B.value)) {
    issues.push("zero-shift series means must be exactly equal.");
  }
  if (!expectedEqual && !p6NumbersClose(observation.meanLines.B.value, observation.meanLines.A.value + shift)) {
    issues.push("positive-shift series mean B must equal mean A plus shift.");
  }
  return Object.freeze(issues);
}

/**
 * Deterministic range-state plan for one visible model/mode.
 *
 * Every control contributes minimum/midpoint/maximum requests. Every binary
 * endpoint vector is also represented. When two requirements name the same
 * numeric vector (for example a one-slider minimum and endpoint mask 0), the
 * static state occurs once and carries both reasons instead of being executed
 * twice. A declared dynamic domain instead keeps every unique executable
 * starting-state/request/expected-state transition, even when two transitions
 * intentionally land on the same canonical visual state.
 */
export function buildHkVisualizationRangeStatePlan(
  modeId: string,
  rawDescriptors: readonly HkVisualizationRangeDescriptor[],
  dynamicOptions?: HkVisualizationDynamicRangePlanOptions,
): readonly HkVisualizationRangeStatePlanEntry[] {
  if (!modeId.trim()) throw new Error("Range-state modeId must be non-empty.");
  if (rawDescriptors.length > MAXIMUM_EXHAUSTIVE_RANGE_COUNT) {
    throw new Error(
      `Range-state plan has ${rawDescriptors.length} visible ranges; exhaustive 2^n execution is capped at ${MAXIMUM_EXHAUSTIVE_RANGE_COUNT} and must not be silently truncated.`,
    );
  }

  const seenControlIds = new Set<string>();
  const descriptors = rawDescriptors.map((descriptor) => {
    const controlId = descriptor.controlId.trim();
    if (!controlId) throw new Error("Range-state controlId must be non-empty.");
    if (seenControlIds.has(controlId))
      throw new Error(`Range-state controlId ${controlId} is duplicated.`);
    seenControlIds.add(controlId);
    const minimum = finiteNumber(`${controlId}.minimum`, descriptor.minimum);
    const maximum = finiteNumber(`${controlId}.maximum`, descriptor.maximum);
    const step = finiteNumber(`${controlId}.step`, descriptor.step);
    const initial = finiteNumber(`${controlId}.initial`, descriptor.initial);
    if (!(minimum < maximum))
      throw new Error(`${controlId} must have minimum < maximum.`);
    if (!(step > 0))
      throw new Error(`${controlId} must have a positive numeric step.`);
    if (initial < minimum || initial > maximum) {
      throw new Error(
        `${controlId}.initial ${initial} lies outside [${minimum}, ${maximum}].`,
      );
    }
    return Object.freeze({ controlId, initial, maximum, minimum, step });
  });
  if (descriptors.length === 0) return Object.freeze([]);

  const entries: Array<{
    applicationOrder: string[];
    actionSignature: string;
    actions: HkVisualizationRangeApplicationAction[];
    boundaryIds: string[];
    domainId: HkExecutableDynamicRangeDomainId | null;
    expectedSignature: string;
    expectedDescriptors: HkVisualizationRangePlanDescriptorExpectation[];
    expectedValues: readonly HkVisualizationRangeStateValue[];
    id: string;
    projectionEvidence: HkExecutableRangeProjectionEvidence[];
    reasons: HkVisualizationRangeStateReason[];
    requestedSignature: string;
    requestedValues: readonly HkVisualizationRangeStateValue[];
    signature: string;
    startingSignature: string;
    startingValues: readonly HkVisualizationRangeStateValue[];
    values: readonly HkVisualizationRangeStateValue[];
  }> = [];
  const bySignature = new Map<string, (typeof entries)[number]>();
  const baseValues = descriptors.map(({ controlId, initial }) =>
    Object.freeze({ controlId, value: initial }),
  );

  const add = (
    reason: HkVisualizationRangeStateReason,
    rawValues: readonly HkVisualizationRangeStateValue[],
  ) => {
    const values = Object.freeze(
      rawValues.map((value, index) =>
        Object.freeze({
          controlId: descriptors[index].controlId,
          value: normalizedNumber(value.value, descriptors[index]),
        }),
      ),
    );
    const signature = signatureFor(values);
    const existing = bySignature.get(signature);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      return;
    }
    const entry = {
      applicationOrder: values.map(({ controlId }) => controlId),
      actionSignature: signature,
      actions: values.map(({ controlId, value }) =>
        Object.freeze({
          affectedControlIds: Object.freeze([]),
          allowProjectedAbsence: false,
          controlId,
          expectedValue: value,
          projectedAbsenceRequirements: null,
          projectedByControllerIds: Object.freeze([]),
          requestedValue: value,
        }),
      ),
      boundaryIds: [],
      domainId: null,
      expectedSignature: signature,
      expectedDescriptors: descriptors.map((range) =>
        Object.freeze({
          controlId: range.controlId,
          domainId: null,
          enabled: true,
          excludedValues: Object.freeze([]),
          maximum: range.maximum,
          minimum: range.minimum,
          step: range.step,
          visibility: "range" as const,
        }),
      ),
      expectedValues: values,
      id: `${modeId}:range-state:${String(entries.length).padStart(4, "0")}`,
      projectionEvidence: [],
      reasons: [reason],
      requestedSignature: signature,
      requestedValues: values,
      signature,
      startingSignature: signatureFor(baseValues),
      startingValues: baseValues,
      values,
    };
    bySignature.set(signature, entry);
    entries.push(entry);
  };

  add(`mode:${modeId}:base`, baseValues);
  for (
    let controlIndex = 0;
    controlIndex < descriptors.length;
    controlIndex += 1
  ) {
    const descriptor = descriptors[controlIndex];
    for (const [label, value] of [
      ["minimum", descriptor.minimum],
      ["midpoint", midpoint(descriptor)],
      ["maximum", descriptor.maximum],
    ] as const) {
      const values = baseValues.map((item, index) =>
        index === controlIndex
          ? Object.freeze({ controlId: item.controlId, value })
          : item,
      );
      add(`control:${descriptor.controlId}:${label}`, values);
    }
  }

  const endpointCombinationCount = 2 ** descriptors.length;
  for (let mask = 0; mask < endpointCombinationCount; mask += 1) {
    const values = descriptors.map((descriptor, index) =>
      Object.freeze({
        controlId: descriptor.controlId,
        value:
          (mask & (2 ** index)) === 0 ? descriptor.minimum : descriptor.maximum,
      }),
    );
    add(`endpoint-combination:${mask}`, values);
  }

  if (dynamicOptions) {
    return buildDynamicPlan(modeId, descriptors, entries, dynamicOptions);
  }

  const frozen = entries.map((entry) =>
    Object.freeze({
      ...entry,
      applicationOrder: Object.freeze([...entry.applicationOrder]),
      actions: Object.freeze([...entry.actions]),
      boundaryIds: Object.freeze([...entry.boundaryIds]),
      expectedDescriptors: Object.freeze([...entry.expectedDescriptors]),
      projectionEvidence: Object.freeze([...entry.projectionEvidence]),
      reasons: Object.freeze([...entry.reasons]),
    }),
  );
  const signatures = new Set(frozen.map((entry) => entry.signature));
  const ids = new Set(frozen.map((entry) => entry.id));
  if (signatures.size !== frozen.length || ids.size !== frozen.length) {
    throw new Error(
      "Range-state planner produced a duplicate state or ledger id.",
    );
  }
  return Object.freeze(frozen);
}

function fractionModeId(modeId: string): HkFractionBarModeId {
  if (!(HK_FRACTION_BAR_MODE_IDS as readonly string[]).includes(modeId)) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} is active but ${JSON.stringify(modeId)} is not an executable fraction mode.`,
    );
  }
  return modeId as HkFractionBarModeId;
}

function adaptFractionBarPlanEntry(
  entry: HkFractionBarRangePlanEntry,
): HkVisualizationRangeStatePlanEntry {
  return Object.freeze({
    actionSignature: entry.actionSignature,
    applicationOrder: Object.freeze([...entry.applicationOrder]),
    actions: Object.freeze(
      entry.actions.map((action) =>
        Object.freeze({
          affectedControlIds: Object.freeze([...action.affectedControlIds]),
          allowProjectedAbsence: false,
          controlId: action.controlId,
          expectedValue: action.expectedValue,
          projectedAbsenceRequirements: null,
          projectedByControllerIds: Object.freeze([
            ...action.projectedByControllerIds,
          ]),
          requestedValue: action.requestedValue,
        }),
      ),
    ),
    boundaryIds: Object.freeze([entry.boundaryId]),
    domainId: entry.domainId,
    expectedDescriptors: Object.freeze(
      entry.expectedDescriptors.map((descriptor) =>
        Object.freeze({ ...descriptor }),
      ),
    ),
    expectedSignature: entry.expectedSignature,
    expectedValues: Object.freeze([...entry.expectedValues]),
    id: entry.id,
    projectionEvidence: Object.freeze([...entry.projectionEvidence]),
    reasons: Object.freeze([entry.reason]),
    requestedSignature: entry.requestedSignature,
    requestedValues: Object.freeze([...entry.requestedValues]),
    signature: entry.signature,
    startingSignature: entry.startingSignature,
    startingValues: Object.freeze([...entry.startingValues]),
    values: Object.freeze([...entry.requestedValues]),
  });
}

function buildFractionBarDynamicPlan(
  modeId: string,
  descriptors: readonly HkVisualizationRangeDescriptor[],
  options: HkVisualizationDynamicRangePlanOptions,
): readonly HkVisualizationRangeStatePlanEntry[] {
  const contract = getHkFractionBarRangeDomain(options.domainId, options.labId);
  const fractionMode = fractionModeId(modeId);
  const controlIds = new Set(descriptors.map(({ controlId }) => controlId));
  if (!contract.isApplicable(fractionMode, controlIds)) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} is active in ${fractionMode} but must expose exactly ${contract.requiredControlIds.join(", ")}.`,
    );
  }
  for (let index = 0; index < contract.requiredControlIds.length; index += 1) {
    if (descriptors[index]?.controlId !== contract.requiredControlIds[index]) {
      throw new Error(
        `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} descriptors must retain the exact control order ${contract.requiredControlIds.join(", ")}.`,
      );
    }
  }
  const currentState = Object.freeze(
    Object.fromEntries(
      descriptors.map(({ controlId, initial }) => [controlId, initial]),
    ),
  );
  assertObservedHkFractionBarDescriptors({
    descriptors,
    modeId: fractionMode,
    state: currentState,
  });

  const sourcePlan = buildHkFractionBarRangeStatePlan();
  assertHkFractionBarRangeStatePlan(sourcePlan);
  const modeEntries = sourcePlan.filter(
    (entry) => entry.modeId === fractionMode,
  );
  if (
    modeEntries.length !==
    HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.stateCountPerMode
  ) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} ${fractionMode} plan expected ${HK_FRACTION_BAR_EXPECTED_PLAN_COUNTS.stateCountPerMode} states, observed ${modeEntries.length}.`,
    );
  }
  if (new Set(modeEntries.map(({ id }) => id)).size !== modeEntries.length) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} ${fractionMode} plan contains duplicate state ids.`,
    );
  }
  if (
    new Set(modeEntries.map(({ transitionSignature }) => transitionSignature))
      .size !== modeEntries.length
  ) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} ${fractionMode} plan contains duplicate executable transitions.`,
    );
  }
  return Object.freeze(modeEntries.map(adaptFractionBarPlanEntry));
}

function buildDynamicPlan(
  modeId: string,
  descriptors: readonly HkVisualizationRangeDescriptor[],
  rawEntries: readonly Readonly<{
    reasons: readonly HkVisualizationRangeStateReason[];
    values: readonly HkVisualizationRangeStateValue[];
  }>[],
  options: HkVisualizationDynamicRangePlanOptions,
) {
  if (options.domainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID) {
    return buildFractionBarDynamicPlan(modeId, descriptors, options);
  }
  const contract = getHkDedicatedDynamicRangeDomain(
    options.domainId,
    options.labId,
  );
  const controlIds = new Set(descriptors.map(({ controlId }) => controlId));
  if (!contract.isApplicable(modeId, controlIds)) {
    return buildHkVisualizationRangeStatePlan(modeId, descriptors);
  }
  for (const controlId of contract.requiredControlIds) {
    if (!controlIds.has(controlId)) {
      throw new Error(
        `${options.domainId} is active in ${modeId} but required range ${controlId} is missing.`,
      );
    }
  }

  const baseState = Object.freeze(
    Object.fromEntries(
      descriptors.map(({ controlId, initial }) => [controlId, initial]),
    ),
  );
  if (!contract.isValid(baseState, modeId)) {
    throw new Error(
      `${options.domainId} initial state is outside its declared dynamic domain.`,
    );
  }
  const baseValues = valuesFromState(descriptors, baseState);
  const candidates: Array<{
    boundaryIds: string[];
    expectedDescriptors: readonly HkVisualizationRangePlanDescriptorExpectation[];
    expectedValues: readonly HkVisualizationRangeStateValue[];
    projectionEvidence: HkVisualizationRangeProjectionEvidence[];
    reasons: HkVisualizationRangeStateReason[];
    requestedValues: readonly HkVisualizationRangeStateValue[];
    startingValues: readonly HkVisualizationRangeStateValue[];
  }> = rawEntries.map((rawEntry) => {
    const requestedState = Object.freeze(
      Object.fromEntries(
        rawEntry.values.map(({ controlId, value }) => [controlId, value]),
      ),
    );
    const canonical = contract.canonicalize({
      currentState: baseState,
      descriptors,
      modeId,
      requestedState,
    });
    if (!canonical.valid) {
      throw new Error(
        `${options.domainId} canonicalized an invalid ${modeId} range state.`,
      );
    }
    const requestedById = new Map(
      rawEntry.values.map((item) => [item.controlId, item]),
    );
    const requestedValues = Object.freeze(
      canonical.applicationOrder.map((controlId) => {
        const requested = requestedById.get(controlId);
        if (!requested)
          throw new Error(
            `${options.domainId} application order references missing ${controlId}.`,
          );
        return requested;
      }),
    );
    return {
      boundaryIds: [],
      expectedDescriptors: descriptors.map((range) =>
        contract.descriptorFor(canonical.canonicalState, modeId, range),
      ),
      expectedValues: valuesFromState(descriptors, canonical.canonicalState),
      projectionEvidence: [...canonical.projections],
      reasons: [...rawEntry.reasons],
      requestedValues,
      startingValues: baseValues,
    };
  });

  for (const boundaryEvidence of buildHkVisualizationRangeBoundaryEvidence({
    descriptors,
    domainId: options.domainId,
    labId: options.labId,
    modeId,
  })) {
    const requestedById = new Map(
      Object.entries(boundaryEvidence.requestedState),
    );
    const requestedValues = Object.freeze(
      contract.applicationOrder.flatMap((controlId) =>
        requestedById.has(controlId)
          ? [
              Object.freeze({
                controlId,
                value: requestedById.get(controlId) as number,
              }),
            ]
          : [],
      ),
    );
    candidates.push({
      boundaryIds: [boundaryEvidence.boundaryId],
      expectedDescriptors: boundaryEvidence.expectedDescriptors,
      expectedValues: valuesFromState(
        descriptors,
        boundaryEvidence.canonicalState,
      ),
      projectionEvidence: [...boundaryEvidence.projections],
      reasons: [`domain-boundary:${boundaryEvidence.boundaryId}`],
      requestedValues,
      startingValues: valuesFromState(
        descriptors,
        boundaryEvidence.startingState,
      ),
    });
  }

  const entries: Array<{
    actionSignature: string;
    applicationOrder: readonly string[];
    actions: HkVisualizationRangeApplicationAction[];
    boundaryIds: string[];
    domainId: HkDedicatedDynamicRangeDomainId;
    expectedSignature: string;
    expectedDescriptors: readonly HkVisualizationRangePlanDescriptorExpectation[];
    expectedValues: readonly HkVisualizationRangeStateValue[];
    id: string;
    projectionEvidence: HkVisualizationRangeProjectionEvidence[];
    reasons: HkVisualizationRangeStateReason[];
    requestedSignature: string;
    requestedValues: readonly HkVisualizationRangeStateValue[];
    signature: string;
    startingSignature: string;
    startingValues: readonly HkVisualizationRangeStateValue[];
    values: readonly HkVisualizationRangeStateValue[];
  }> = [];
  const byTransitionSignature = new Map<string, (typeof entries)[number]>();
  for (const candidate of candidates) {
    const expectedSignature = signatureFor(candidate.expectedValues);
    const actionSignature = signatureFor(candidate.requestedValues);
    const requestedState = new Map(
      candidate.startingValues.map(({ controlId, value }) => [
        controlId,
        value,
      ]),
    );
    for (const { controlId, value } of candidate.requestedValues)
      requestedState.set(controlId, value);
    const requestedSignature = signatureFor(
      valuesFromState(descriptors, Object.fromEntries(requestedState)),
    );
    const startingSignature = signatureFor(candidate.startingValues);
    const transitionSignature = `${startingSignature}>>${actionSignature}>>${expectedSignature}`;
    const existing = byTransitionSignature.get(transitionSignature);
    if (existing) {
      for (const reason of candidate.reasons)
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      for (const boundaryId of candidate.boundaryIds) {
        if (!existing.boundaryIds.includes(boundaryId))
          existing.boundaryIds.push(boundaryId);
      }
      for (const evidence of candidate.projectionEvidence) {
        if (
          !existing.projectionEvidence.some(
            (item) => JSON.stringify(item) === JSON.stringify(evidence),
          )
        ) {
          existing.projectionEvidence.push(evidence);
        }
      }
      continue;
    }
    const entry = {
      actionSignature,
      applicationOrder: candidate.requestedValues.map(
        ({ controlId }) => controlId,
      ),
      actions: candidate.requestedValues.map(({ controlId, value }) => {
        const expectedValue = candidate.expectedValues.find(
          (item) => item.controlId === controlId,
        )?.value;
        if (expectedValue === undefined)
          throw new Error(
            `${options.domainId} lacks expected value for ${controlId}.`,
          );
        const projectedByControllerIds = contract.affectedBy[controlId] ?? [];
        const affectedControlIds =
          contract.edges.find(
            ({ sourceControlId }) => sourceControlId === controlId,
          )?.affectedControlIds ?? [];
        const allowProjectedAbsence = candidate.projectionEvidence.some(
          (evidence) =>
            evidence.affectedControlId === controlId &&
            evidence.projection === "clamp-and-visibility" &&
            projectedByControllerIds.includes(evidence.declaredControllerId),
        );
        return Object.freeze({
          affectedControlIds: Object.freeze([...affectedControlIds]),
          allowProjectedAbsence,
          controlId,
          expectedValue,
          projectedAbsenceRequirements: allowProjectedAbsence
            ? Object.freeze({
                controllerMustPrecede: true as const,
                expectedFixedValue: expectedValue,
                expectedVisibility: "fixed" as const,
                projection: "clamp-and-visibility" as const,
                requireExactControllerMetadata: true as const,
                requireExactlyOneFixedParameterNode: true as const,
                requireSerializedStateMatch: true as const,
              })
            : null,
          projectedByControllerIds: Object.freeze([
            ...projectedByControllerIds,
          ]),
          requestedValue: value,
        });
      }),
      boundaryIds: [...candidate.boundaryIds],
      domainId: options.domainId,
      expectedSignature,
      expectedDescriptors: candidate.expectedDescriptors,
      expectedValues: candidate.expectedValues,
      id: `${modeId}:range-state:${String(entries.length).padStart(4, "0")}`,
      projectionEvidence: [...candidate.projectionEvidence],
      reasons: [...candidate.reasons],
      requestedSignature,
      requestedValues: candidate.requestedValues,
      signature: expectedSignature,
      startingSignature,
      startingValues: candidate.startingValues,
      values: candidate.requestedValues,
    };
    entries.push(entry);
    byTransitionSignature.set(transitionSignature, entry);
  }

  const frozen = entries.map((entry) =>
    Object.freeze({
      ...entry,
      applicationOrder: Object.freeze([...entry.applicationOrder]),
      actions: Object.freeze([...entry.actions]),
      boundaryIds: Object.freeze([...entry.boundaryIds]),
      expectedDescriptors: Object.freeze([...entry.expectedDescriptors]),
      projectionEvidence: Object.freeze([...entry.projectionEvidence]),
      reasons: Object.freeze([...entry.reasons]),
    }),
  );
  if (new Set(frozen.map(({ id }) => id)).size !== frozen.length) {
    throw new Error(
      "Dynamic range-state planner produced a duplicate ledger id.",
    );
  }
  const transitionSignatures = frozen.map(
    (entry) =>
      `${entry.startingSignature}>>${entry.actionSignature}>>${entry.expectedSignature}`,
  );
  if (new Set(transitionSignatures).size !== frozen.length) {
    throw new Error(
      "Dynamic range-state planner produced a duplicate executable transition.",
    );
  }
  return Object.freeze(frozen);
}
