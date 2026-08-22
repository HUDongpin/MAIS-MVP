import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  buildDecimalArithmeticState,
  decimalArithmeticResetInput,
  type DecimalArithmeticInput,
  type DecimalArithmeticOperation,
} from "../../components/visualizations/mainland/DecimalArithmeticModel";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { isValidLearningAnalyticsEvent } from "../../lib/learningAnalytics";
import type { LearningAnalyticsEventType } from "../../types";
import { G02_PRODUCTION_PLAN } from "./china-mainland-g02-production-plan";

export type G02ProductionProject = "desktop-chrome" | "mobile-chrome";

export const G02_RUNNER_INVOCATION_ENV_JSON =
  "MAIS_G02_RUNNER_INVOCATION_JSON";
export const G02_RUNNER_INVOCATION_ENV_SHA256 =
  "MAIS_G02_RUNNER_INVOCATION_SHA256";

const G02_RUNNER_INVOCATION_CORE = {
  args: [
    "test",
    "tests/e2e/china-mainland-g02-production-browser.spec.ts",
    "--config=playwright.config.ts",
    "--workers=1",
    "--retries=0",
    "--reporter=line",
  ],
  configuredProjects: ["desktop-chrome", "mobile-chrome"],
  playwrightVersion: "1.59.1",
  reporter: "line",
  retries: 0,
  schemaVersion: "china-mainland-g02-runner-invocation.v1",
  spec: "tests/e2e/china-mainland-g02-production-browser.spec.ts",
  workers: 1,
} as const;

export const G02_CANONICAL_RUNNER_INVOCATION = Object.freeze({
  ...G02_RUNNER_INVOCATION_CORE,
  args: Object.freeze([...G02_RUNNER_INVOCATION_CORE.args]),
  authority: "caller-environment-contract-only" as const,
  authorityAvailable: false as const,
  configuredProjects: Object.freeze([
    ...G02_RUNNER_INVOCATION_CORE.configuredProjects,
  ]),
  invocationSha256: g02ProductionReceiptSha256(G02_RUNNER_INVOCATION_CORE),
  releaseReady: false as const,
  runnerReceiptSha256: null,
});

export type G02RunnerInvocationEvidence = {
  args: string[];
  authority: "caller-environment-contract-only";
  authorityAvailable: false;
  configuredProjects: G02ProductionProject[];
  invocationSha256: string;
  playwrightVersion: "1.59.1";
  releaseReady: false;
  reporter: "line";
  retries: 0;
  runnerReceiptSha256: null;
  schemaVersion: "china-mainland-g02-runner-invocation.v1";
  spec: "tests/e2e/china-mainland-g02-production-browser.spec.ts";
  workers: 1;
};

const RAW_SOURCE_PATHS = [
  "tests/e2e/china-mainland-g02-production-plan.ts",
  "tests/e2e/china-mainland-g02-production-receipt.ts",
  "tests/e2e/china-mainland-g02-production-browser.spec.ts",
  "tests/e2e/china-mainland-g01-g02-production-routing.spec.ts",
] as const;
// ISO timestamps serialize to integer milliseconds; 2 ms covers only the two
// endpoint-rounding boundaries and must never become a delayed-event allowance.
const G02_CLOCK_PRECISION_TOLERANCE_MS = 2;

type G02StateObservation = {
  evaluatedOperation: Exclude<DecimalArithmeticOperation, "estimate-check">;
  leftScale: number;
  leftUnscaled: number;
  operation: DecimalArithmeticOperation;
  precision: number;
  rightScale: number;
  rightUnscaled: number;
  stateKey: string;
};

type G02ControlEvidence = {
  controlId: string | null;
  kind: "button" | "none" | "range";
  max: number | null;
  min: number | null;
  options: string[];
  selected: number | string | null;
  step: number | null;
};

type G02UiScan = {
  candidatePairCount: number;
  controlCount: number;
  htmlTextCount: number;
  paintedMarkCount: number;
  surfaceCount: number;
  svgTextCount: number;
};

type G02UiAudit = {
  clippedElementCount: 0;
  collisionIssueCount: 0;
  contrastCheckedTextCount: number;
  contrastIssueCount: 0;
  horizontalOverflowPixels: 0;
  touchTargetCheckedCount: number;
  touchTargetIssueCount: 0;
  uiScan: G02UiScan;
};

type G02ResetReceipt = {
  exact: true;
  observation: G02StateObservation;
  resetControlCount: 1;
};

type G02AnalyticsEvidence = {
  endpoint: "/api/learning-events";
  method: "POST";
  request: {
    body: {
      events: [{
        grade: string;
        id: string;
        source: string;
        timestamp: string;
        topicId: string;
        type: G02AnalyticsEventType;
      }];
      generation: number;
    };
    eventIds: [string];
    ownerHeader: "x-mais-analytics-user-id";
    userId: string;
  };
  response: {
    acknowledgedEventIds: [string];
    status: 200;
  };
};

export type G02AnalyticsEventType = Extract<
  LearningAnalyticsEventType,
  "visualization-probe" | "visualization-reset" | "visualization-slider"
>;

type G02AnalyticsEvent = {
  actionId: string;
  eventId: string;
  labId: string;
  source: string;
  stateId: string;
  subactionId: string;
  topicId: string;
  type: G02AnalyticsEventType;
  userId: string;
};

type G02CalibrationDelivery = {
  analyticsCaptureSequence: number;
  analyticsEvidence: G02AnalyticsEvidence;
  event: G02AnalyticsEvent;
  requestObservedAt: string;
  requestObservedMonotonicMs: number;
};

type G02RangeCalibrationAttempt = {
  afterValue: number;
  attemptIndex: number;
  beforeValue: number;
  coordinate: { x: number; y: number };
  delivery: G02CalibrationDelivery;
  physicalCaptureSequence: number;
  plannedRole: "bisection-correction" | "final-settling-attempt" | "midpoint-no-op-probe";
  settledAt: string;
  settledMonotonicMs: number;
  startedAt: string;
  startedMonotonicMs: number;
  valueChanged: boolean;
  wallClockMinusMonotonicOriginMs: number;
};

type G02RangeCalibrationEvidence = {
  aggregateTapCount: number;
  attempts: G02RangeCalibrationAttempt[];
  commitPolicy: "one-visualization-slider-event-per-physical-tap-including-native-no-op";
  consumedDeliveryEventIds: string[];
  finalSettlingAttemptIndex: number;
  inputGeometry: {
    admissibleMaxX: number;
    admissibleMaxY: number;
    admissibleMinX: number;
    admissibleMinY: number;
    height: number;
    midpointX: number;
    tapY: number;
    viewportHeight: number;
    viewportWidth: number;
    width: number;
    x: number;
    y: number;
  };
  retainedDeliveryEventIds: string[];
  targetValue: number;
  terminalValue: number;
  valueChangingAttemptCount: number;
};

type G02AnalyticsSubaction = {
  analyticsEvidence: G02AnalyticsEvidence;
  calibrationEvidence: G02RangeCalibrationEvidence | null;
  event: G02AnalyticsEvent;
  kind: "primary" | "reset" | "setup";
  method: string;
  subactionId: string;
  target: string;
  temporal: {
    actionSettledAt: string;
    actionSettledMonotonicMs: number;
    actionStartedAt: string;
    actionStartedMonotonicMs: number;
    captureSequence: number;
    postActionQualifyingDeliveryCount: number;
    postActionQuiet: true;
    preActionQualifyingDeliveryCount: number;
    preActionQuiet: true;
    originToleranceMs: 2;
    quietIntervalMs: number;
    requestObservedAt: string;
    requestObservedMonotonicMs: number;
    toleranceMs: 2;
    wallClockMinusMonotonicOriginMs: number;
  };
};

export type G02VisualStateReceipt = {
  axisId: string;
  headerTransition: null | {
    fromAxisId: string;
    fromBoundary: {
      capturedAt: string;
      capturedMonotonicMs: number;
      documentMaxScrollY: number;
      rootDocumentBottom: number;
      rootDocumentCenter: number;
      rootDocumentTop: number;
      scrollY: number;
      viewport: { height: number; width: number };
      wallClockMinusMonotonicOriginMs: number;
    };
    fromScrollId: "page-bottom";
    fromStateId: string;
    labId: string;
    toAxisId: string;
    toHeader: {
      capturedAt: string;
      capturedMonotonicMs: number;
      coordinate: { x: number; y: number };
      preparation: "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport";
      targetFingerprint: {
        id: string | null;
        role: string | null;
        tagName: string;
        withinHeader: true;
      };
      targetRect: { height: number; width: number; x: number; y: number };
      viewport: { height: number; width: number };
      wallClockMinusMonotonicOriginMs: number;
    };
    toStateId: string;
    transitionSequence: number;
  };
  identity: {
    activeLabId: string;
    configuredModelCount: 1;
    genericFallbackCount: 0;
    playApplicable: false;
    renderer: "mainland-decimal-arithmetic";
    resetControlCount: 1;
  };
  labId: string;
  locale: "en" | "zh" | "zh-Hans";
  project: G02ProductionProject;
  reset: G02ResetReceipt;
  resetAction: G02AnalyticsSubaction;
  scrollAudits: Array<G02UiAudit & {
    capturedAt: string;
    capturedMonotonicMs: number;
    geometry: {
      centerTolerancePx: 40;
      documentMaxScrollY: number;
      rootBottom: number;
      rootCenter: number;
      rootDocumentBottom: number;
      rootDocumentCenter: number;
      rootDocumentTop: number;
      rootTop: number;
      scrollY: number;
      viewportCenter: number;
      viewportHeight: number;
      viewportWidth: number;
    };
    scrollMethod: "cdp:Input.dispatchTouchEvent:vertical" | "locator.scrollIntoViewIfNeeded" | "page.keyboard.press";
    scrollId: "page-bottom" | "page-top" | "visualization-center";
    wallClockMinusMonotonicOriginMs: number;
  }>;
  stateId: string;
  theme: "dark" | "light";
};

export type G02InteractionStateReceipt = {
  action: {
    actionId: string;
    modality: "keyboard-mouse" | "none" | "touch";
    realInput: boolean;
    subactions: G02AnalyticsSubaction[];
  };
  axisId: string;
  control: G02ControlEvidence;
  genericFallbackCount: 0;
  labId: string;
  observation: G02StateObservation;
  resetAfter: G02ResetReceipt | null;
  scenarioId: string;
  stateId: string;
  uiScan: G02UiAudit;
};

type SiblingCount = { labId: string; sessionCount: number };
type G02SessionSnapshot = {
  completedAt: string | null;
  explored: true;
  moduleId: "configured-visualization-lab";
  source: string;
  topicId: string;
  updatedAt: string;
};

export type G02ProductionBrowserPayload = {
  analyticsCoverage: {
    capturedQualifyingDeliveryCount: number;
    capturedQualifyingEventIds: string[];
    consumedReceiptEventIds: string[];
    exact: true;
    lateDeliveryCount: 0;
    unconsumedEventIds: [];
  };
  diagnostics: { consoleErrors: []; pageErrors: []; requestFailures: [] };
  durabilityReceipts: Array<{
    afterVisualFinal: {
      captureBoundary: {
        afterActionCaptureSequence: number;
        beforeNextActionCaptureSequence: number | null;
        capturedAt: string;
        capturedMonotonicMs: number;
        labSequenceIndex: number;
        wallClockMinusMonotonicOriginMs: number;
      };
      postCount: 0;
      siblingCounts: SiblingCount[];
      siblings: { count: 3; sessions: G02SessionSnapshot[]; userId: string };
      target: { count: 1; sessions: [G02SessionSnapshot]; userId: string };
    };
    final: {
      exactlyOnce: true;
      noSiblingMutation: true;
      serverBacked: true;
      survivedReload: true;
    };
    firstAction: {
      acknowledgementStatus: 200;
      completedBeforeReset: true;
      postCount: 1;
      sessionCount: 1;
    };
    labId: string;
    lessonId: string;
    mount: { postCount: 0; sessionCount: 0 };
    reload: { sameSession: true; sessionCount: 1 };
    rawSessionCheckpoints: {
      afterFirst: G02SessionSnapshot[];
      afterRegistration: [];
      afterReload: G02SessionSnapshot[];
      afterReset: G02SessionSnapshot[];
      afterSecond: G02SessionSnapshot[];
      afterSiblingSeed: G02SessionSnapshot[];
      afterVisualFinal: G02SessionSnapshot[];
    };
    reset: { postCount: 0; sessionCount: 1 };
    secondAction: { postCount: 0; sessionCount: 1 };
    sequence: [
      "mount-baseline",
      "primary-first-action",
      "session-post-200",
      "pre-reset-reread",
      "reset",
      "second-action",
      "reload-reread",
      "visual-axes",
      "after-visual-final",
    ];
    sessionId: string;
    siblings: {
      afterFirst: SiblingCount[];
      afterReload: SiblingCount[];
      afterReset: SiblingCount[];
      afterSecond: SiblingCount[];
      afterVisualFinal: SiblingCount[];
      baseline: SiblingCount[];
    };
    userId: string;
  }>;
  execution: {
    complete: false;
    projectsTogether: ["desktop-chrome", "mobile-chrome"];
    retries: 0;
    shard: null;
    skipped: 0;
    unexpected: 0;
  };
  fullVisualInteractionCartesian: false;
  groupId: "G02";
  interactionAxisId: string;
  interactionSurfaceObservations: Array<{
    axisId: string;
    htmlLang: "en" | "zh-Hans" | "zh-Hant";
    labId: string;
    locale: "en" | "zh" | "zh-Hans";
    phase: "after-reload" | "before-initial";
    setupActions: [];
    setupTapCount: number;
    theme: "dark" | "light";
  }>;
  interactionStates: G02InteractionStateReceipt[];
  labIds: string[];
  planCanonicalSha256: string;
  playApplicable: false;
  project: G02ProductionProject;
  runnerInvocation: G02RunnerInvocationEvidence;
  schemaVersion: "china-mainland-g02-production-browser-receipt.v1";
  sourceEvidence: {
    rawFiles: Array<{ path: string; sha256: string }>;
  };
  touchEvidence: {
    directionalSwipes: Array<{
      afterScrollLeft: number;
      beforeScrollLeft: number;
      direction: "toward-end" | "toward-start";
      moveCount: 4;
      protocol: "cdp:Input.dispatchTouchEvent";
      signedDisplacement: number;
    }>;
    hasTouch: boolean;
    nonUiSessionSeed: {
      postCount: number;
      transport: "page.request.post";
    };
    realSwipeCount: number;
    realTapCount: number;
    roundTrip: {
      continuityTolerancePx: 2;
      returnRegionFraction: 0.25;
    } | null;
    swipeMoveCount: number;
    swipeProtocol: "cdp:Input.dispatchTouchEvent" | "none";
    tapEntries: Array<{
      after: {
        capturedAt: string;
        capturedMonotonicMs: number;
        wallClockMinusMonotonicOriginMs: number;
      };
      axisId: string;
      before: {
        capturedAt: string;
        capturedMonotonicMs: number;
        wallClockMinusMonotonicOriginMs: number;
      };
      calibrationPhysicalCaptureSequence: number | null;
      category: "calibration-attempt" | "interaction-axis-setup" | "interaction-non-range" | "visual-axis-setup" | "visual-reset";
      coordinate: { x: number; y: number };
      labId: string;
      phase: "interaction" | "interaction-axis-after-reload" | "interaction-axis-before-initial" | "visual-axis-setup" | "visual-reset";
      preparation: "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport";
      rangeMeasurement: null | {
        afterValue: number;
        beforeValue: number;
        valueChanged: boolean;
      };
      stateId: string;
      subactionId: string;
      tapSequence: number;
      target: string;
      targetRect: { height: number; width: number; x: number; y: number };
      viewport: { height: number; width: number };
    }>;
    tapCategoryCounts: {
      calibrationAttemptCount: number;
      interactionAxisSetupTapCount: number;
      interactionNonRangeTapCount: number;
      sessionSeedTapCount: number;
      visualAxisSetupTapCount: number;
      visualResetTapCount: number;
    };
  };
  visualAxisIds: string[];
  visualStates: G02VisualStateReceipt[];
};

export type G02ProductionBrowserReceipt = {
  payload: G02ProductionBrowserPayload;
  payloadSha256: string;
};

const PAYLOAD_KEYS = [
  "analyticsCoverage",
  "diagnostics",
  "durabilityReceipts",
  "execution",
  "fullVisualInteractionCartesian",
  "groupId",
  "interactionAxisId",
  "interactionSurfaceObservations",
  "interactionStates",
  "labIds",
  "planCanonicalSha256",
  "playApplicable",
  "project",
  "runnerInvocation",
  "schemaVersion",
  "sourceEvidence",
  "touchEvidence",
  "visualAxisIds",
  "visualStates",
] as const;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function g02ProductionReceiptSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function g02CanonicalRunnerInvocationEnvironment() {
  const json = canonicalJson(G02_CANONICAL_RUNNER_INVOCATION);
  return {
    json,
    sha256: g02ProductionReceiptSha256(G02_CANONICAL_RUNNER_INVOCATION),
  };
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, any> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function exactKeys(value: unknown, keys: readonly string[], label: string) {
  assertRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} keys are not exact.`);
  }
}

function assertExact(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} does not match the exact G02 contract.`);
  }
}

export function readG02RunnerInvocationEnvironment(
  environment: Record<string, string | undefined>,
): G02RunnerInvocationEvidence {
  const rawJson = environment[G02_RUNNER_INVOCATION_ENV_JSON];
  const rawSha256 = environment[G02_RUNNER_INVOCATION_ENV_SHA256];
  if (!rawJson || !rawSha256) {
    throw new TypeError("G02 runner invocation environment is missing.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    throw new TypeError("G02 runner invocation JSON is malformed.");
  }
  if (rawSha256 !== g02ProductionReceiptSha256(parsed)) {
    throw new TypeError("G02 runner invocation environment SHA-256 mismatch.");
  }
  if (rawJson !== canonicalJson(parsed)) {
    throw new TypeError("G02 runner invocation JSON is not canonical.");
  }
  if (canonicalJson(parsed) !== canonicalJson(G02_CANONICAL_RUNNER_INVOCATION)) {
    throw new TypeError("G02 exact runner invocation environment does not match the exact contract.");
  }
  return structuredClone(parsed) as G02RunnerInvocationEvidence;
}

export function assertG02TrustedRunnerAuthority(
  evidence: G02RunnerInvocationEvidence,
): never {
  if (canonicalJson(evidence) !== canonicalJson(G02_CANONICAL_RUNNER_INVOCATION)) {
    throw new TypeError("G02 exact runner invocation evidence does not match the exact contract.");
  }
  throw new TypeError(
    "G02 production coverage unavailable: caller JSON plus SHA-256 has no trusted native runner/spawn/wait/immutable-receipt authority; direct Playwright, desktop-only, grep narrowing, grep-invert narrowing, shard, retry, and project narrowing cannot be release ready.",
  );
}

function rawSourceEvidence() {
  return RAW_SOURCE_PATHS.map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(new URL(`../../${path}`, import.meta.url)))
      .digest("hex"),
  }));
}

function expectedAxisIds(project: G02ProductionProject) {
  return G02_PRODUCTION_PLAN.coverage.visualAxes
    .filter((axis) => axis.project === project)
    .map((axis) => axis.axisId);
}

function expectedMobileVisualAxisSetupTapCount() {
  const axes = G02_PRODUCTION_PLAN.coverage.visualAxes.filter(
    ({ project }) => project === "mobile-chrome",
  );
  const tapsPerLab = axes.reduce(
    (state, axis) => {
      // Each changed locale is one menu-open, one selector-open, and one
      // menuitemradio tap. Each changed theme is one toggle tap. The visual
      // phase starts from the selected mobile interaction axis.
      state.tapCount += axis.locale === state.locale ? 0 : 3;
      state.tapCount += axis.theme === state.theme ? 0 : 1;
      state.locale = axis.locale;
      state.theme = axis.theme;
      return state;
    },
    { locale: "zh-Hans", tapCount: 0, theme: "dark" },
  ).tapCount;
  return G02_PRODUCTION_PLAN.labIds.length * tapsPerLab;
}

function expectedInteractionAxis(project: G02ProductionProject): {
  axisId: string;
  locale: "en" | "zh" | "zh-Hans";
  project: string;
  theme: "dark" | "light";
} {
  const axis = G02_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: missing G02 interaction axis.`);
  if (
    (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
    (axis.theme !== "dark" && axis.theme !== "light")
  ) throw new TypeError(`${project}: unsupported G02 interaction surface.`);
  return {
    axisId: axis.axisId,
    locale: axis.locale,
    project: axis.project,
    theme: axis.theme,
  };
}

function expectedInteractionAxisId(project: G02ProductionProject) {
  return expectedInteractionAxis(project).axisId;
}

function expectedVisualIds(project: G02ProductionProject) {
  const axes = new Set(expectedAxisIds(project));
  return G02_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    [...axes].some((axisId) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function expectedInteractionIds(project: G02ProductionProject) {
  const axisId = expectedInteractionAxisId(project);
  return G02_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function scenarioFromStateId(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) {
    throw new TypeError(`${stateId}: invalid G02 state prefix.`);
  }
  return stateId.slice(prefix.length);
}

function endpointValue(controlId: string, endpoint: string) {
  const range =
    controlId === "operand-a"
      ? { max: 9_999, min: 0 }
      : controlId === "operand-b"
        ? { max: 9_999, min: 1 }
        : controlId === "decimal-scale"
          ? { max: 3, min: 0 }
          : controlId === "precision"
            ? { max: 4, min: 0 }
            : null;
  if (!range) throw new TypeError(`${controlId}: unknown G02 range control.`);
  const value =
    endpoint === "min"
      ? range.min
      : endpoint === "max"
        ? range.max
        : endpoint === "mid"
          ? Math.floor((range.min + range.max) / 2)
          : Number.NaN;
  if (!Number.isInteger(value)) {
    throw new TypeError(`${endpoint}: unknown G02 endpoint.`);
  }
  return { ...range, value };
}

function scenarioInput(scenarioId: string): DecimalArithmeticInput {
  const input = structuredClone(decimalArithmeticResetInput);
  if (scenarioId === "first") input.left.unscaled += 1;
  if (scenarioId.startsWith("mode:")) {
    const operation = scenarioId.slice("mode:".length) as DecimalArithmeticOperation;
    input.operation = operation;
    input.estimateOperation = operation === "estimate-check" ? "add" : undefined;
  }
  if (scenarioId.startsWith("estimate-from:")) {
    input.operation = "estimate-check";
    input.estimateOperation = scenarioId.slice("estimate-from:".length) as Exclude<
      DecimalArithmeticOperation,
      "estimate-check"
    >;
  }
  if (scenarioId.startsWith("endpoint:")) {
    const [, operationText, controlId, endpoint] = scenarioId.split(":");
    const operation = operationText as DecimalArithmeticOperation;
    input.operation = operation;
    input.estimateOperation = operation === "estimate-check" ? "add" : undefined;
    const next = endpointValue(controlId!, endpoint!);
    if (controlId === "operand-a") input.left.unscaled = next.value;
    if (controlId === "operand-b") input.right.unscaled = next.value;
    if (controlId === "decimal-scale") {
      input.left.scale = next.value;
      input.right.scale = Math.min(3, next.value + 1);
    }
    if (controlId === "precision") input.precision = next.value;
  }
  return input;
}

function expectedObservation(scenarioId: string): G02StateObservation {
  const state = buildDecimalArithmeticState(scenarioInput(scenarioId));
  const stateKey = [
    state.version,
    `operation=${state.operation}`,
    `evaluated=${state.evaluatedOperation}`,
    `left=${state.left.unscaled}@${state.left.scale}`,
    `right=${state.right.unscaled}@${state.right.scale}`,
    `precision=${state.estimate.precision}`,
  ].join("|");
  return {
    evaluatedOperation: state.evaluatedOperation,
    leftScale: state.left.scale,
    leftUnscaled: state.left.unscaled,
    operation: state.operation,
    precision: state.estimate.precision,
    rightScale: state.right.scale,
    rightUnscaled: state.right.unscaled,
    stateKey,
  };
}

const RESET_OBSERVATION = expectedObservation("reset");

function expectedControl(scenarioId: string): G02ControlEvidence {
  if (scenarioId === "initial" || scenarioId === "reset") {
    return {
      controlId: null,
      kind: "none",
      max: null,
      min: null,
      options: [],
      selected: null,
      step: null,
    };
  }
  if (scenarioId === "first") {
    return {
      controlId: "operand-a",
      kind: "range",
      max: 9_999,
      min: 0,
      options: [],
      selected: 126,
      step: 1,
    };
  }
  if (scenarioId.startsWith("mode:") || scenarioId.startsWith("estimate-from:")) {
    return {
      controlId: "operation",
      kind: "button",
      max: null,
      min: null,
      options: ["add", "subtract", "multiply", "divide", "estimate-check"],
      selected: scenarioId.startsWith("mode:")
        ? scenarioId.slice("mode:".length)
        : "estimate-check",
      step: null,
    };
  }
  const [, , controlId, endpoint] = scenarioId.split(":");
  const range = endpointValue(controlId!, endpoint!);
  return {
    controlId: controlId!,
    kind: "range",
    max: range.max,
    min: range.min,
    options: [],
    selected: range.value,
    step: 1,
  };
}

type ExpectedSubaction = {
  kind: "primary" | "reset" | "setup";
  subactionId: string;
  target: string;
};

function expectedSubactions(scenarioId: string): ExpectedSubaction[] {
  if (scenarioId === "initial") return [];
  if (scenarioId === "reset") {
    return [{ kind: "primary", subactionId: "primary:reset", target: "reset" }];
  }
  const primaryAndReset = (primary: string, setup: ExpectedSubaction[] = []) => [
    ...setup,
    { kind: "primary" as const, subactionId: `primary:${primary}`, target: primary },
    { kind: "reset" as const, subactionId: "reset:reset", target: "reset" },
  ];
  if (scenarioId === "first") return primaryAndReset("range:operand-a:increment");
  if (scenarioId.startsWith("mode:")) {
    return primaryAndReset(`mode:${scenarioId.slice("mode:".length)}`);
  }
  if (scenarioId.startsWith("estimate-from:")) {
    const operation = scenarioId.slice("estimate-from:".length);
    const setup =
      operation === "add"
        ? []
        : [{ kind: "setup" as const, subactionId: `setup:mode:${operation}`, target: `mode:${operation}` }];
    return primaryAndReset("mode:estimate-check", setup);
  }
  const [, operation, controlId, endpoint] = scenarioId.split(":");
  const setup =
    operation === "add"
      ? []
      : operation === "estimate-check"
        ? [{ kind: "setup" as const, subactionId: "setup:mode:estimate-check", target: "mode:estimate-check" }]
        : [{ kind: "setup" as const, subactionId: `setup:mode:${operation}`, target: `mode:${operation}` }];
  return primaryAndReset(`range:${controlId}:${endpoint}`, setup);
}

export function expectedG02AnalyticsEventType(
  subaction: Pick<G02AnalyticsSubaction, "kind" | "target">,
): G02AnalyticsEventType {
  if (subaction.target === "reset") return "visualization-reset";
  if (subaction.target.startsWith("range:")) return "visualization-slider";
  if (subaction.target.startsWith("mode:")) return "visualization-probe";
  throw new TypeError(`${subaction.target}: unsupported G02 analytics semantics.`);
}

function assertNonHollowUiScan(scan: unknown, label: string) {
  exactKeys(
    scan,
    [
      "candidatePairCount",
      "controlCount",
      "htmlTextCount",
      "paintedMarkCount",
      "surfaceCount",
      "svgTextCount",
    ],
    label,
  );
  const value = scan as G02UiScan;
  for (const key of Object.keys(value) as Array<keyof G02UiScan>) {
    if (!Number.isInteger(value[key]) || value[key] <= 0) {
      throw new TypeError(`${label}.${key} must prove a non-hollow UI scan.`);
    }
  }
}

function validateUiAudit(audit: unknown, label: string) {
  exactKeys(
    audit,
    [
      "clippedElementCount",
      "collisionIssueCount",
      "contrastCheckedTextCount",
      "contrastIssueCount",
      "horizontalOverflowPixels",
      "touchTargetCheckedCount",
      "touchTargetIssueCount",
      "uiScan",
    ],
    label,
  );
  const value = audit as G02UiAudit;
  assertExact(
    [
      value.clippedElementCount,
      value.collisionIssueCount,
      value.contrastIssueCount,
      value.horizontalOverflowPixels,
      value.touchTargetIssueCount,
    ],
    [0, 0, 0, 0, 0],
    `${label} issue scan`,
  );
  if (
    !Number.isInteger(value.contrastCheckedTextCount) ||
    value.contrastCheckedTextCount <= 0 ||
    !Number.isInteger(value.touchTargetCheckedCount) ||
    value.touchTargetCheckedCount <= 0
  ) {
    throw new TypeError(`${label}: hollow contrast or touch-target scan.`);
  }
  assertNonHollowUiScan(value.uiScan, `${label} UI scan`);
}

function validateCalibrationDelivery(
  delivery: unknown,
  attempt: G02RangeCalibrationAttempt,
  expected: {
    labId: string;
    project: G02ProductionProject;
    stateId: string;
    userId: string;
  },
  expectedSubactionId: string,
  label: string,
) {
  exactKeys(
    delivery,
    [
      "analyticsCaptureSequence",
      "analyticsEvidence",
      "event",
      "requestObservedAt",
      "requestObservedMonotonicMs",
    ],
    label,
  );
  const value = delivery as G02CalibrationDelivery;
  const catalog = getVisualizationLabByLabId(expected.labId);
  if (!catalog || !catalog.analyticsSource) {
    throw new TypeError(`${label}: exact catalog analytics identity is absent.`);
  }
  if (!Number.isSafeInteger(value.analyticsCaptureSequence) || value.analyticsCaptureSequence < 0) {
    throw new TypeError(`${label}: analytics capture sequence is absent.`);
  }
  exactKeys(
    value.event,
    ["actionId", "eventId", "labId", "source", "stateId", "subactionId", "topicId", "type", "userId"],
    `${label} event`,
  );
  assertExact(
    value.event,
    {
      actionId: expected.stateId,
      eventId: value.event.eventId,
      labId: expected.labId,
      source: catalog.analyticsSource,
      stateId: expected.stateId,
      subactionId: expectedSubactionId,
      topicId: expected.labId,
      type: expectedG02AnalyticsEventType({ kind: "primary", target: "range:calibration" }),
      userId: expected.userId,
    },
    `${label} exact event identity`,
  );
  if (!value.event.eventId) throw new TypeError(`${label}: missing event id.`);
  exactKeys(value.analyticsEvidence, ["endpoint", "method", "request", "response"], `${label} analytics`);
  if (
    value.analyticsEvidence.endpoint !== "/api/learning-events" ||
    value.analyticsEvidence.method !== "POST"
  ) {
    throw new TypeError(`${label}: exact endpoint/method is absent.`);
  }
  exactKeys(
    value.analyticsEvidence.request,
    ["body", "eventIds", "ownerHeader", "userId"],
    `${label} request`,
  );
  exactKeys(value.analyticsEvidence.request.body, ["events", "generation"], `${label} body`);
  if (
    !Number.isSafeInteger(value.analyticsEvidence.request.body.generation) ||
    value.analyticsEvidence.request.body.generation < 0 ||
    value.analyticsEvidence.request.body.events.length !== 1
  ) {
    throw new TypeError(`${label}: request must retain its sole raw event.`);
  }
  const raw = value.analyticsEvidence.request.body.events[0];
  exactKeys(raw, ["grade", "id", "source", "timestamp", "topicId", "type"], `${label} raw event`);
  if (!isValidLearningAnalyticsEvent(raw)) {
    throw new TypeError(`${label}: raw event is outside the production learning-analytics union.`);
  }
  assertExact(
    raw,
    {
      grade: catalog.grade,
      id: value.event.eventId,
      source: catalog.analyticsSource,
      timestamp: raw.timestamp,
      topicId: expected.labId,
      type: expectedG02AnalyticsEventType({ kind: "primary", target: "range:calibration" }),
    },
    `${label} exact raw event`,
  );
  assertExact(
    {
      eventIds: value.analyticsEvidence.request.eventIds,
      ownerHeader: value.analyticsEvidence.request.ownerHeader,
      userId: value.analyticsEvidence.request.userId,
    },
    {
      eventIds: [value.event.eventId],
      ownerHeader: "x-mais-analytics-user-id",
      userId: expected.userId,
    },
    `${label} request envelope`,
  );
  exactKeys(value.analyticsEvidence.response, ["acknowledgedEventIds", "status"], `${label} response`);
  assertExact(
    value.analyticsEvidence.response,
    { acknowledgedEventIds: [value.event.eventId], status: 200 },
    `${label} exact 200 ACK`,
  );
  const startedAt = Date.parse(attempt.startedAt);
  const requestObservedAt = Date.parse(value.requestObservedAt);
  const settledAt = Date.parse(attempt.settledAt);
  const eventTimestamp = Date.parse(raw.timestamp);
  const sampleOrigins = [
    startedAt - attempt.startedMonotonicMs,
    requestObservedAt - value.requestObservedMonotonicMs,
    settledAt - attempt.settledMonotonicMs,
  ];
  if (
    ![startedAt, requestObservedAt, settledAt, eventTimestamp].every(Number.isFinite) ||
    !Number.isFinite(value.requestObservedMonotonicMs) ||
    !(startedAt <= requestObservedAt && requestObservedAt <= settledAt) ||
    !(attempt.startedMonotonicMs <= value.requestObservedMonotonicMs &&
      value.requestObservedMonotonicMs <= attempt.settledMonotonicMs) ||
    sampleOrigins.some((origin) =>
      Math.abs(origin - attempt.wallClockMinusMonotonicOriginMs) >
        G02_CLOCK_PRECISION_TOLERANCE_MS
    ) ||
    eventTimestamp < startedAt - G02_CLOCK_PRECISION_TOLERANCE_MS ||
    eventTimestamp > requestObservedAt + G02_CLOCK_PRECISION_TOLERANCE_MS ||
    eventTimestamp > settledAt + G02_CLOCK_PRECISION_TOLERANCE_MS
  ) {
    throw new TypeError(`${label}: request/event is not owned by this exact tap interval.`);
  }
}

function validateAnalyticsSubaction(
  subaction: unknown,
  expected: {
    control: G02ControlEvidence | null;
    labId: string;
    project: G02ProductionProject;
    stateId: string;
    userId: string;
  },
  label: string,
) {
  exactKeys(
    subaction,
    ["analyticsEvidence", "calibrationEvidence", "event", "kind", "method", "subactionId", "target", "temporal"],
    label,
  );
  const value = subaction as G02AnalyticsSubaction;
  const isMobileRange = expected.project === "mobile-chrome" && value.target.startsWith("range:");
  const expectedEventType = expectedG02AnalyticsEventType(value);
  const catalog = getVisualizationLabByLabId(expected.labId);
  if (
    !catalog ||
    catalog.labId !== expected.labId ||
    catalog.topicId !== expected.labId ||
    !catalog.analyticsSource
  ) {
    throw new TypeError(`${label}: exact catalog analytics identity is absent.`);
  }
  exactKeys(
    value.event,
    ["actionId", "eventId", "labId", "source", "stateId", "subactionId", "topicId", "type", "userId"],
    `${label} event`,
  );
  assertExact(
    {
      actionId: value.event.actionId,
      labId: value.event.labId,
      source: value.event.source,
      stateId: value.event.stateId,
      subactionId: value.event.subactionId,
      topicId: value.event.topicId,
      type: value.event.type,
      userId: value.event.userId,
    },
    {
      actionId: expected.stateId,
      labId: expected.labId,
      source: catalog.analyticsSource,
      stateId: expected.stateId,
      subactionId: value.subactionId,
      topicId: expected.labId,
      type: expectedEventType,
      userId: expected.userId,
    },
    `${label} exact identity`,
  );
  if (!value.event.eventId) throw new TypeError(`${label}: missing exact event id.`);

  exactKeys(value.analyticsEvidence, ["endpoint", "method", "request", "response"], `${label} analytics evidence`);
  if (
    value.analyticsEvidence.endpoint !== "/api/learning-events" ||
    value.analyticsEvidence.method !== "POST"
  ) {
    throw new TypeError(`${label}: exact learning-event endpoint/method missing.`);
  }
  exactKeys(
    value.analyticsEvidence.request,
    ["body", "eventIds", "ownerHeader", "userId"],
    `${label} analytics request`,
  );
  exactKeys(value.analyticsEvidence.request.body, ["events", "generation"], `${label} request body`);
  if (
    !Number.isSafeInteger(value.analyticsEvidence.request.body.generation) ||
    value.analyticsEvidence.request.body.generation < 0 ||
    value.analyticsEvidence.request.body.events.length !== 1
  ) {
    throw new TypeError(`${label}: request must retain exactly one raw event.`);
  }
  const raw = value.analyticsEvidence.request.body.events[0];
  exactKeys(raw, ["grade", "id", "source", "timestamp", "topicId", "type"], `${label} sole raw event`);
  if (!isValidLearningAnalyticsEvent(raw)) {
    throw new TypeError(`${label}: raw event is outside the production learning-analytics union.`);
  }
  assertExact(
    raw,
    {
      grade: catalog.grade,
      id: value.event.eventId,
      source: catalog.analyticsSource,
      timestamp: raw.timestamp,
      topicId: expected.labId,
      type: expectedEventType,
    },
    `${label} sole raw event body`,
  );
  if (!Number.isFinite(Date.parse(raw.timestamp))) {
    throw new TypeError(`${label}: raw event timestamp is not exact JSON time evidence.`);
  }
  assertExact(
    {
      eventIds: value.analyticsEvidence.request.eventIds,
      ownerHeader: value.analyticsEvidence.request.ownerHeader,
      userId: value.analyticsEvidence.request.userId,
    },
    {
      eventIds: [value.event.eventId],
      ownerHeader: "x-mais-analytics-user-id",
      userId: expected.userId,
    },
    `${label} request envelope`,
  );
  exactKeys(value.analyticsEvidence.response, ["acknowledgedEventIds", "status"], `${label} response`);
  assertExact(
    value.analyticsEvidence.response,
    { acknowledgedEventIds: [value.event.eventId], status: 200 },
    `${label} exact response ACK`,
  );

  exactKeys(
    value.temporal,
    [
      "actionSettledAt",
      "actionSettledMonotonicMs",
      "actionStartedAt",
      "actionStartedMonotonicMs",
      "captureSequence",
      "postActionQualifyingDeliveryCount",
      "postActionQuiet",
      "preActionQualifyingDeliveryCount",
      "preActionQuiet",
      "originToleranceMs",
      "quietIntervalMs",
      "requestObservedAt",
      "requestObservedMonotonicMs",
      "toleranceMs",
      "wallClockMinusMonotonicOriginMs",
    ],
    `${label} temporal`,
  );
  const expectedDeliveryCount = value.calibrationEvidence === null
    ? 1
    : value.calibrationEvidence?.attempts.length;
  if (
    !Number.isSafeInteger(value.temporal.captureSequence) ||
    value.temporal.captureSequence < 0 ||
    !Number.isSafeInteger(value.temporal.preActionQualifyingDeliveryCount) ||
    value.temporal.preActionQualifyingDeliveryCount < 0 ||
    !Number.isSafeInteger(expectedDeliveryCount) ||
    Number(expectedDeliveryCount) <= 0 ||
    value.temporal.postActionQualifyingDeliveryCount !==
      value.temporal.preActionQualifyingDeliveryCount + Number(expectedDeliveryCount) ||
    value.temporal.preActionQuiet !== true ||
    value.temporal.postActionQuiet !== true ||
    !Number.isSafeInteger(value.temporal.quietIntervalMs) ||
    value.temporal.quietIntervalMs <= 0 ||
    value.temporal.toleranceMs !== G02_CLOCK_PRECISION_TOLERANCE_MS ||
    value.temporal.originToleranceMs !== G02_CLOCK_PRECISION_TOLERANCE_MS
  ) {
    throw new TypeError(`${label}: temporal request window is not closed.`);
  }
  const actionStartedAt = Date.parse(value.temporal.actionStartedAt);
  const requestObservedAt = Date.parse(value.temporal.requestObservedAt);
  const actionSettledAt = Date.parse(value.temporal.actionSettledAt);
  const eventTimestamp = Date.parse(raw.timestamp);
  const wallClockTimes = [actionStartedAt, requestObservedAt, actionSettledAt];
  const monotonicTimes = [
    value.temporal.actionStartedMonotonicMs,
    value.temporal.requestObservedMonotonicMs,
    value.temporal.actionSettledMonotonicMs,
  ];
  const sampleOrigins = wallClockTimes.map(
    (time, index) => time - monotonicTimes[index]!,
  );
  if (
    !wallClockTimes.every(Number.isFinite) ||
    !monotonicTimes.every((time) => Number.isFinite(time) && time >= 0) ||
    !(actionStartedAt <= requestObservedAt && requestObservedAt <= actionSettledAt) ||
    !(monotonicTimes[0]! <= monotonicTimes[1]! && monotonicTimes[1]! <= monotonicTimes[2]!) ||
    sampleOrigins.some((origin) =>
      Math.abs(origin - value.temporal.wallClockMinusMonotonicOriginMs) >
        G02_CLOCK_PRECISION_TOLERANCE_MS
    ) ||
    Math.max(...sampleOrigins) - Math.min(...sampleOrigins) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
    eventTimestamp < actionStartedAt - G02_CLOCK_PRECISION_TOLERANCE_MS ||
    eventTimestamp > requestObservedAt + G02_CLOCK_PRECISION_TOLERANCE_MS ||
    eventTimestamp > actionSettledAt + G02_CLOCK_PRECISION_TOLERANCE_MS
  ) {
    throw new TypeError(`${label}: event timestamp is stale, delayed, or outside its exact physical subaction interval.`);
  }
  const calibratedMobileRange =
    /^page\.touchscreen\.tap:calibrated-bisection:((?:[1-9]|1[0-9]|2[0-4])):exact-native-value$/u;
  const calibratedMatch = calibratedMobileRange.exec(value.method);
  if (isMobileRange) {
    const calibration = value.calibrationEvidence;
    if (!calibration || !calibratedMatch) {
      throw new TypeError(`${label}: mobile native range lacks exact calibration evidence.`);
    }
    exactKeys(
      calibration,
      [
        "aggregateTapCount",
        "attempts",
        "commitPolicy",
        "consumedDeliveryEventIds",
        "finalSettlingAttemptIndex",
        "inputGeometry",
        "retainedDeliveryEventIds",
        "targetValue",
        "terminalValue",
        "valueChangingAttemptCount",
      ],
      `${label} calibration evidence`,
    );
    if (
      calibration.commitPolicy !==
        "one-visualization-slider-event-per-physical-tap-including-native-no-op" ||
      !Number.isSafeInteger(calibration.aggregateTapCount) ||
      calibration.aggregateTapCount < 3 ||
      calibration.aggregateTapCount > 24 ||
      calibration.aggregateTapCount !== calibration.attempts.length ||
      Number(calibratedMatch[1]) !== calibration.aggregateTapCount ||
      !Number.isSafeInteger(calibration.targetValue) ||
      !Number.isSafeInteger(calibration.terminalValue) ||
      calibration.terminalValue !== calibration.targetValue ||
      calibration.finalSettlingAttemptIndex !== calibration.attempts.length - 1
    ) {
      throw new TypeError(`${label}: calibration method/count/terminal evidence drifts.`);
    }
    const control = expected.control;
    if (
      !control ||
      control.kind !== "range" ||
      !Number.isSafeInteger(control.min) ||
      !Number.isSafeInteger(control.max) ||
      !Number.isSafeInteger(control.step) ||
      !Number.isSafeInteger(control.selected) ||
      Number(control.step) <= 0 ||
      calibration.targetValue !== control.selected
    ) {
      throw new TypeError(`${label}: calibration target is not the exact plan control.selected.`);
    }
    exactKeys(
      calibration.inputGeometry,
      ["admissibleMaxX", "admissibleMaxY", "admissibleMinX", "admissibleMinY", "height", "midpointX", "tapY", "viewportHeight", "viewportWidth", "width", "x", "y"],
      `${label} immutable input geometry`,
    );
    const geometry = calibration.inputGeometry;
    if (
      ![
        geometry.admissibleMaxX,
        geometry.admissibleMaxY,
        geometry.admissibleMinX,
        geometry.admissibleMinY,
        geometry.height,
        geometry.midpointX,
        geometry.tapY,
        geometry.viewportHeight,
        geometry.viewportWidth,
        geometry.width,
        geometry.x,
        geometry.y,
      ].every(Number.isFinite) ||
      !(geometry.width > 2) ||
      !(geometry.height > 0) ||
      !(geometry.viewportHeight > 0) ||
      !(geometry.viewportWidth > 0) ||
      geometry.admissibleMinX !== geometry.x + 0.5 ||
      geometry.admissibleMaxX !== geometry.x + geometry.width - 0.5 ||
      geometry.admissibleMinY !== geometry.y + 0.5 ||
      geometry.admissibleMaxY !== geometry.y + geometry.height - 0.5 ||
      geometry.midpointX !== geometry.x + geometry.width / 2 ||
      geometry.tapY !== geometry.y + geometry.height / 2 ||
      geometry.midpointX < 0 ||
      geometry.midpointX > geometry.viewportWidth ||
      geometry.tapY < 0 ||
      geometry.tapY > geometry.viewportHeight
    ) {
      throw new TypeError(`${label}: immutable input rect/admissible touch geometry drifts.`);
    }
    const deliveryIds: string[] = [];
    let changingCount = 0;
    for (const [attemptIndex, attempt] of calibration.attempts.entries()) {
      exactKeys(
        attempt,
        [
          "afterValue",
          "attemptIndex",
          "beforeValue",
          "coordinate",
          "delivery",
          "physicalCaptureSequence",
          "plannedRole",
          "settledAt",
          "settledMonotonicMs",
          "startedAt",
          "startedMonotonicMs",
          "valueChanged",
          "wallClockMinusMonotonicOriginMs",
        ],
        `${label} calibration attempt ${attemptIndex}`,
      );
      exactKeys(attempt.coordinate, ["x", "y"], `${label} calibration attempt ${attemptIndex} coordinate`);
      const startedAt = Date.parse(attempt.startedAt);
      const settledAt = Date.parse(attempt.settledAt);
      const attemptOrigins = [
        startedAt - attempt.startedMonotonicMs,
        settledAt - attempt.settledMonotonicMs,
      ];
      const expectedRole = attemptIndex === calibration.attempts.length - 1
        ? "final-settling-attempt"
        : attemptIndex === 1
          ? "midpoint-no-op-probe"
          : "bisection-correction";
      if (
        attempt.attemptIndex !== attemptIndex ||
        !Number.isSafeInteger(attempt.physicalCaptureSequence) ||
        attempt.physicalCaptureSequence < 0 ||
        attempt.plannedRole !== expectedRole ||
        !Number.isSafeInteger(attempt.beforeValue) ||
        !Number.isSafeInteger(attempt.afterValue) ||
        attempt.valueChanged !== (attempt.beforeValue !== attempt.afterValue) ||
        (attempt.plannedRole === "midpoint-no-op-probe" && attempt.valueChanged) ||
        attempt.beforeValue < Number(control.min) ||
        attempt.beforeValue > Number(control.max) ||
        attempt.afterValue < Number(control.min) ||
        attempt.afterValue > Number(control.max) ||
        (attempt.beforeValue - Number(control.min)) % Number(control.step) !== 0 ||
        (attempt.afterValue - Number(control.min)) % Number(control.step) !== 0 ||
        ![attempt.coordinate.x, attempt.coordinate.y].every(Number.isFinite) ||
        attempt.coordinate.x < geometry.admissibleMinX ||
        attempt.coordinate.x > geometry.admissibleMaxX ||
        attempt.coordinate.y < geometry.admissibleMinY ||
        attempt.coordinate.y > geometry.admissibleMaxY ||
        attempt.coordinate.y !== geometry.tapY ||
        !Number.isFinite(startedAt) ||
        !Number.isFinite(settledAt) ||
        !Number.isFinite(attempt.startedMonotonicMs) ||
        !Number.isFinite(attempt.settledMonotonicMs) ||
        !(startedAt < settledAt) ||
        !(attempt.startedMonotonicMs < attempt.settledMonotonicMs) ||
        attemptOrigins.some((origin) =>
          Math.abs(origin - attempt.wallClockMinusMonotonicOriginMs) >
            G02_CLOCK_PRECISION_TOLERANCE_MS
        ) ||
        (attemptIndex > 0 &&
          (attempt.beforeValue !== calibration.attempts[attemptIndex - 1]!.afterValue ||
            startedAt <= Date.parse(calibration.attempts[attemptIndex - 1]!.settledAt) ||
            attempt.startedMonotonicMs <= calibration.attempts[attemptIndex - 1]!.settledMonotonicMs ||
            attempt.physicalCaptureSequence <= calibration.attempts[attemptIndex - 1]!.physicalCaptureSequence))
      ) {
        throw new TypeError(`${label}: calibration attempt order/value/time evidence drifts.`);
      }
      if (
        attempt.plannedRole === "midpoint-no-op-probe" &&
        (attemptIndex !== 1 ||
          attempt.coordinate.x !== geometry.midpointX ||
          attempt.coordinate.x !== calibration.attempts[0]!.coordinate.x ||
          attempt.coordinate.y !== calibration.attempts[0]!.coordinate.y)
      ) {
        throw new TypeError(`${label}: planned no-op midpoint is not an exact repeated real tap.`);
      }
      if (attemptIndex === 0 && attempt.coordinate.x !== geometry.midpointX) {
        throw new TypeError(`${label}: first physical calibration tap is not geometry-derived midpoint.`);
      }
      if (attempt.valueChanged) changingCount += 1;
      if (!attempt.delivery) {
        throw new TypeError(`${label}: physical range tap lacks its exact visualization-slider delivery.`);
      }
      const attemptSubactionId = attemptIndex === calibration.attempts.length - 1
        ? value.subactionId
        : `${value.subactionId}:calibration-attempt:${attemptIndex}`;
      validateCalibrationDelivery(
        attempt.delivery,
        attempt,
        expected,
        attemptSubactionId,
        `${label} calibration attempt ${attemptIndex} delivery`,
      );
      deliveryIds.push(attempt.delivery.event.eventId);
    }
    const finalAttempt = calibration.attempts[calibration.finalSettlingAttemptIndex];
    if (
      !finalAttempt ||
      !finalAttempt.valueChanged ||
      finalAttempt.afterValue !== calibration.targetValue ||
      changingCount !== calibration.valueChangingAttemptCount ||
      deliveryIds.length !== calibration.attempts.length
    ) {
      throw new TypeError(`${label}: final settling attempt is not the target-owning commit.`);
    }
    assertExact(
      calibration.retainedDeliveryEventIds,
      deliveryIds,
      `${label} retained calibration delivery ids`,
    );
    assertExact(
      calibration.consumedDeliveryEventIds,
      deliveryIds,
      `${label} consumed calibration delivery ids`,
    );
    assertExact(
      {
        analyticsEvidence: value.analyticsEvidence,
        event: value.event,
        requestObservedAt: value.temporal.requestObservedAt,
        requestObservedMonotonicMs: value.temporal.requestObservedMonotonicMs,
        captureSequence: value.temporal.captureSequence,
      },
      {
        analyticsEvidence: finalAttempt.delivery.analyticsEvidence,
        event: finalAttempt.delivery.event,
        requestObservedAt: finalAttempt.delivery.requestObservedAt,
        requestObservedMonotonicMs: finalAttempt.delivery.requestObservedMonotonicMs,
        captureSequence: finalAttempt.delivery.analyticsCaptureSequence,
      },
      `${label} final settling attempt projection`,
    );
    if (
      Date.parse(value.temporal.actionStartedAt) > Date.parse(calibration.attempts[0]!.startedAt) ||
      value.temporal.actionStartedMonotonicMs > calibration.attempts[0]!.startedMonotonicMs ||
      Date.parse(value.temporal.actionSettledAt) < Date.parse(finalAttempt.settledAt) ||
      value.temporal.actionSettledMonotonicMs < finalAttempt.settledMonotonicMs
    ) {
      throw new TypeError(`${label}: calibration attempts escape the semantic quiet window.`);
    }
  } else if (value.calibrationEvidence !== null) {
    throw new TypeError(`${label}: non-mobile-range subaction carries calibration evidence.`);
  }
  if (
    (expected.project === "mobile-chrome" &&
      (!value.method.includes("touchscreen.tap") ||
        /nativeSetter|evaluate/i.test(value.method) ||
        (value.target.startsWith("range:") && !calibratedMatch) ||
        (!value.target.startsWith("range:") && value.method !== "page.touchscreen.tap"))) ||
    (expected.project === "desktop-chrome" && !/(mouse\.click|locator\.press)/.test(value.method))
  ) {
    throw new TypeError(`${label}: physical input method is not exact.`);
  }
}

function validateReset(reset: unknown, label: string) {
  exactKeys(reset, ["exact", "observation", "resetControlCount"], label);
  assertExact(
    reset,
    { exact: true, observation: RESET_OBSERVATION, resetControlCount: 1 },
    label,
  );
}

function validateVisualState(
  receipt: unknown,
  stateId: string,
  project: G02ProductionProject,
  expectedUserId: string,
) {
  exactKeys(
    receipt,
    ["axisId", "headerTransition", "identity", "labId", "locale", "project", "reset", "resetAction", "scrollAudits", "stateId", "theme"],
    stateId,
  );
  const value = receipt as G02VisualStateReceipt;
  const axis = G02_PRODUCTION_PLAN.coverage.visualAxes.find(
    ({ axisId }) => axisId === value.axisId,
  );
  if (!axis || axis.project !== project) {
    throw new TypeError(`${stateId}: visual axis mismatch.`);
  }
  assertExact(
    [value.stateId, value.labId, value.project, value.locale, value.theme],
    [stateId, stateId.split(":")[1], axis.project, axis.locale, axis.theme],
    `${stateId} identity`,
  );
  assertExact(
    value.identity,
    {
      activeLabId: value.labId,
      configuredModelCount: 1,
      genericFallbackCount: 0,
      playApplicable: false,
      renderer: "mainland-decimal-arithmetic",
      resetControlCount: 1,
    },
    `${stateId} renderer`,
  );
  if (value.headerTransition !== null) {
    exactKeys(
      value.headerTransition,
      ["fromAxisId", "fromBoundary", "fromScrollId", "fromStateId", "labId", "toAxisId", "toHeader", "toStateId", "transitionSequence"],
      `${stateId} prior-bottom header transition`,
    );
    exactKeys(
      value.headerTransition.fromBoundary,
      ["capturedAt", "capturedMonotonicMs", "documentMaxScrollY", "rootDocumentBottom", "rootDocumentCenter", "rootDocumentTop", "scrollY", "viewport", "wallClockMinusMonotonicOriginMs"],
      `${stateId} fresh prior page-bottom boundary`,
    );
    exactKeys(value.headerTransition.fromBoundary.viewport, ["height", "width"], `${stateId} prior-bottom viewport`);
    exactKeys(
      value.headerTransition.toHeader,
      ["capturedAt", "capturedMonotonicMs", "coordinate", "preparation", "targetFingerprint", "targetRect", "viewport", "wallClockMinusMonotonicOriginMs"],
      `${stateId} next header capture`,
    );
    exactKeys(value.headerTransition.toHeader.coordinate, ["x", "y"], `${stateId} header coordinate`);
    exactKeys(value.headerTransition.toHeader.targetRect, ["height", "width", "x", "y"], `${stateId} header rect`);
    exactKeys(value.headerTransition.toHeader.viewport, ["height", "width"], `${stateId} header viewport`);
    exactKeys(value.headerTransition.toHeader.targetFingerprint, ["id", "role", "tagName", "withinHeader"], `${stateId} unobscured next-header target fingerprint`);
    const boundary = value.headerTransition.fromBoundary;
    const { coordinate, targetRect, targetFingerprint, viewport } = value.headerTransition.toHeader;
    if (
      value.headerTransition.toHeader.preparation !== "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport" ||
      value.headerTransition.fromScrollId !== "page-bottom" ||
      targetFingerprint.withinHeader !== true ||
      typeof targetFingerprint.tagName !== "string" ||
      targetFingerprint.tagName.length === 0 ||
      ![
        boundary.capturedMonotonicMs,
        boundary.documentMaxScrollY,
        boundary.rootDocumentBottom,
        boundary.rootDocumentCenter,
        boundary.rootDocumentTop,
        boundary.scrollY,
        boundary.viewport.height,
        boundary.viewport.width,
        boundary.wallClockMinusMonotonicOriginMs,
      ].every(Number.isFinite) ||
      !(boundary.viewport.height > 0) ||
      !(boundary.viewport.width > 0) ||
      ![coordinate.x, coordinate.y, targetRect.x, targetRect.y, targetRect.width, targetRect.height, viewport.width, viewport.height].every(Number.isFinite) ||
      !(targetRect.width > 0) ||
      !(targetRect.height > 0) ||
      coordinate.x < targetRect.x ||
      coordinate.x > targetRect.x + targetRect.width ||
      coordinate.y < targetRect.y ||
      coordinate.y > targetRect.y + targetRect.height ||
      coordinate.x < 0 ||
      coordinate.x > viewport.width ||
      coordinate.y < 0 ||
      coordinate.y > viewport.height
    ) throw new TypeError(`${stateId}: unobscured next-header target fingerprint is not physically actionable.`);
  }
  validateReset(value.reset, `${stateId} reset`);
  const resetAction = value.resetAction;
  validateAnalyticsSubaction(
    resetAction,
    { control: null, labId: value.labId, project, stateId, userId: expectedUserId },
    `${stateId} visual reset action`,
  );
  if (
    resetAction.kind !== "primary" ||
    resetAction.subactionId !== "primary:reset" ||
    resetAction.target !== "reset" ||
    resetAction.event.actionId !== stateId ||
    resetAction.event.stateId !== stateId ||
    resetAction.event.subactionId !== "primary:reset" ||
    resetAction.event.labId !== value.labId ||
    resetAction.event.type !== expectedG02AnalyticsEventType(resetAction)
  ) {
    throw new TypeError(`${stateId}: visual reset lacks its own exact analytics ACK.`);
  }
  assertExact(
    value.scrollAudits.map(({ scrollId }) => scrollId),
    ["page-top", "visualization-center", "page-bottom"],
    `${stateId} canonical scroll positions`,
  );
  for (const audit of value.scrollAudits) {
    exactKeys(
      audit,
      ["capturedAt", "capturedMonotonicMs", "clippedElementCount", "collisionIssueCount", "contrastCheckedTextCount", "contrastIssueCount", "geometry", "horizontalOverflowPixels", "scrollId", "scrollMethod", "touchTargetCheckedCount", "touchTargetIssueCount", "uiScan", "wallClockMinusMonotonicOriginMs"],
      `${stateId} ${audit.scrollId}`,
    );
    validateUiAudit(
      {
        clippedElementCount: audit.clippedElementCount,
        collisionIssueCount: audit.collisionIssueCount,
        contrastCheckedTextCount: audit.contrastCheckedTextCount,
        contrastIssueCount: audit.contrastIssueCount,
        horizontalOverflowPixels: audit.horizontalOverflowPixels,
        touchTargetCheckedCount: audit.touchTargetCheckedCount,
        touchTargetIssueCount: audit.touchTargetIssueCount,
        uiScan: audit.uiScan,
      },
      `${stateId} ${audit.scrollId}`,
    );
    exactKeys(
      audit.geometry,
      ["centerTolerancePx", "documentMaxScrollY", "rootBottom", "rootCenter", "rootDocumentBottom", "rootDocumentCenter", "rootDocumentTop", "rootTop", "scrollY", "viewportCenter", "viewportHeight", "viewportWidth"],
      `${stateId} ${audit.scrollId} geometry`,
    );
    if (
      !Number.isFinite(Date.parse(audit.capturedAt)) ||
      !Number.isFinite(audit.capturedMonotonicMs) ||
      !Number.isFinite(audit.wallClockMinusMonotonicOriginMs) ||
      Math.abs(
        Date.parse(audit.capturedAt) - audit.capturedMonotonicMs -
        audit.wallClockMinusMonotonicOriginMs
      ) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
      !Object.values(audit.geometry).every(Number.isFinite) ||
      audit.geometry.centerTolerancePx !== 40 ||
      audit.geometry.documentMaxScrollY <= 0 ||
      audit.geometry.viewportHeight <= 0 ||
      audit.geometry.viewportWidth <= 0 ||
      audit.geometry.rootBottom <= audit.geometry.rootTop ||
      audit.geometry.rootCenter !== (audit.geometry.rootTop + audit.geometry.rootBottom) / 2 ||
      audit.geometry.rootDocumentTop !== audit.geometry.rootTop + audit.geometry.scrollY ||
      audit.geometry.rootDocumentBottom !== audit.geometry.rootBottom + audit.geometry.scrollY ||
      audit.geometry.rootDocumentCenter !== audit.geometry.rootCenter + audit.geometry.scrollY ||
      audit.geometry.viewportCenter !== audit.geometry.viewportHeight / 2 ||
      audit.geometry.scrollY < 0 ||
      audit.geometry.scrollY > audit.geometry.documentMaxScrollY
    ) {
      throw new TypeError(`${stateId}: invalid scroll geometry.`);
    }
    const expectedMethod = project === "mobile-chrome"
      ? "cdp:Input.dispatchTouchEvent:vertical"
      : audit.scrollId === "visualization-center"
        ? "locator.scrollIntoViewIfNeeded"
        : "page.keyboard.press";
    if (audit.scrollMethod !== expectedMethod) {
      throw new TypeError(`${stateId}: scroll audit is mislabeled or not real input.`);
    }
  }
  const scrollYs = value.scrollAudits.map(({ geometry }) => geometry.scrollY);
  if (!(scrollYs[0]! < scrollYs[1]! && scrollYs[1]! < scrollYs[2]!)) {
    throw new TypeError(`${stateId}: top, center, and bottom scroll geometry must be distinct and ordered.`);
  }
  const [topAudit, centerAudit, bottomAudit] = value.scrollAudits;
  if (
    !topAudit || !centerAudit || !bottomAudit ||
    new Set(value.scrollAudits.map(({ geometry }) => geometry.documentMaxScrollY)).size !== 1 ||
    topAudit.geometry.scrollY > 1 ||
    Math.abs(centerAudit.geometry.rootCenter - centerAudit.geometry.viewportCenter) >
      centerAudit.geometry.centerTolerancePx ||
    bottomAudit.geometry.scrollY < bottomAudit.geometry.documentMaxScrollY - 1
  ) {
    throw new TypeError(`${stateId}: real top, centered visualization, or document bottom landmark was not reached.`);
  }
  if (
    !(topAudit.capturedMonotonicMs < centerAudit.capturedMonotonicMs &&
      centerAudit.capturedMonotonicMs < bottomAudit.capturedMonotonicMs) ||
    !(Date.parse(topAudit.capturedAt) <= Date.parse(centerAudit.capturedAt) &&
      Date.parse(centerAudit.capturedAt) <= Date.parse(bottomAudit.capturedAt))
  ) throw new TypeError(`${stateId}: scroll audit capture chronology is not exact.`);
  const stableDocumentCoordinate = (key: "rootDocumentBottom" | "rootDocumentCenter" | "rootDocumentTop") => {
    const coordinates = value.scrollAudits.map(({ geometry }) => geometry[key]);
    return Math.max(...coordinates) - Math.min(...coordinates) <= 1;
  };
  if (
    new Set(value.scrollAudits.map(({ geometry }) => geometry.viewportHeight)).size !== 1 ||
    new Set(value.scrollAudits.map(({ geometry }) => geometry.viewportWidth)).size !== 1 ||
    !stableDocumentCoordinate("rootDocumentTop") ||
    !stableDocumentCoordinate("rootDocumentBottom") ||
    !stableDocumentCoordinate("rootDocumentCenter")
  ) {
    throw new TypeError(`${stateId}: scroll landmarks do not preserve one physical root in document space.`);
  }
}

function validateInteractionState(
  receipt: unknown,
  stateId: string,
  project: G02ProductionProject,
  expectedUserId: string,
) {
  exactKeys(
    receipt,
    ["action", "axisId", "control", "genericFallbackCount", "labId", "observation", "resetAfter", "scenarioId", "stateId", "uiScan"],
    stateId,
  );
  const value = receipt as G02InteractionStateReceipt;
  const axisId = expectedInteractionAxisId(project);
  const labId = G02_PRODUCTION_PLAN.labIds.find((id) =>
    stateId.startsWith(`interaction:${id}:`),
  );
  if (!labId) throw new TypeError(`${stateId}: unknown lab.`);
  const scenarioId = scenarioFromStateId(stateId, labId, axisId);
  assertExact(
    [value.stateId, value.labId, value.axisId, value.scenarioId, value.genericFallbackCount],
    [stateId, labId, axisId, scenarioId, 0],
    `${stateId} identity`,
  );
  assertExact(value.observation, expectedObservation(scenarioId), `${stateId} live state`);
  assertExact(value.control, expectedControl(scenarioId), `${stateId} control evidence`);
  validateUiAudit(value.uiScan, `${stateId} UI audit`);
  exactKeys(value.action, ["actionId", "modality", "realInput", "subactions"], `${stateId} action`);
  if (scenarioId === "initial") {
    assertExact(
      value.action,
      { actionId: stateId, modality: "none", realInput: false, subactions: [] },
      `${stateId} initial action`,
    );
    if (value.resetAfter !== null) {
      throw new TypeError(`${stateId}: initial state cannot claim reset evidence.`);
    }
    return;
  }
  if (value.action.actionId !== stateId || value.action.realInput !== true) {
    throw new TypeError(`${stateId}: action is not real and exact.`);
  }
  const expected = expectedSubactions(scenarioId);
  assertExact(
    value.action.subactions.map(({ kind, subactionId, target }) => ({ kind, subactionId, target })),
    expected,
    `${stateId} exact compound subactions`,
  );
  for (const subaction of value.action.subactions) {
    validateAnalyticsSubaction(
      subaction,
      { control: value.control, labId, project, stateId, userId: expectedUserId },
      `${stateId} ${subaction.subactionId}`,
    );
    if (project === "mobile-chrome") {
      if (value.action.modality !== "touch" || !subaction.method.includes("touchscreen.tap") || /nativeSetter|evaluate/i.test(subaction.method)) {
        throw new TypeError(`${stateId}: fake mobile touch subaction.`);
      }
    } else if (
      value.action.modality !== "keyboard-mouse" ||
      !/(mouse\.click|locator\.press)/.test(subaction.method)
    ) {
      throw new TypeError(`${stateId}: desktop subaction must use mouse or keyboard.`);
    }
    if (
      subaction.event.actionId !== stateId ||
      subaction.event.stateId !== stateId ||
      subaction.event.subactionId !== subaction.subactionId ||
      subaction.event.labId !== labId ||
      subaction.event.type !== expectedG02AnalyticsEventType(subaction)
    ) {
      throw new TypeError(`${stateId}: analytics event is not subaction-bound.`);
    }
  }
  if (scenarioId === "reset") {
    if (value.resetAfter !== null) {
      throw new TypeError(`${stateId}: reset state cannot add another reset receipt.`);
    }
  } else {
    validateReset(value.resetAfter, `${stateId} reset-after`);
  }
}

export function sealG02ProductionBrowserPayload(
  payload: G02ProductionBrowserPayload,
): G02ProductionBrowserReceipt {
  const owned = structuredClone(payload);
  return { payload: owned, payloadSha256: g02ProductionReceiptSha256(owned) };
}

function expectedSiblingCounts(targetLabId: string, targetCount: number): SiblingCount[] {
  return G02_PRODUCTION_PLAN.labIds.map((labId) => ({
    labId,
    sessionCount: labId === targetLabId ? targetCount : 1,
  }));
}

function validateExactSessionSnapshot(
  session: unknown,
  expectedLabId: string,
  label: string,
) {
  exactKeys(session, ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"], label);
  const value = session as G02SessionSnapshot;
  const catalog = getVisualizationLabByLabId(expectedLabId);
  if (
    !catalog ||
    value.explored !== true ||
    value.moduleId !== "configured-visualization-lab" ||
    value.topicId !== expectedLabId ||
    value.source !== catalog.analyticsSource ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    (value.completedAt !== null &&
      (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))))
  ) {
    throw new TypeError(`${label}: forged or non-G02 session snapshot.`);
  }
}

function validateRawSessionCheckpoint(
  sessions: unknown,
  expectedLabIds: readonly string[],
  label: string,
) {
  if (!Array.isArray(sessions)) throw new TypeError(`${label}: raw sessions must be an array.`);
  assertExact(
    sessions.map((session) => isRecordTopicId(session)),
    expectedLabIds,
    `${label} raw session topic multiset and order`,
  );
  sessions.forEach((session, index) =>
    validateExactSessionSnapshot(session, expectedLabIds[index]!, `${label} session ${index}`),
  );
}

function isRecordTopicId(value: unknown) {
  assertRecord(value, "G02 raw session");
  return value.topicId;
}

export function validateG02UntrustedStructuralReceipt(
  candidate: unknown,
  project: G02ProductionProject,
): candidate is G02ProductionBrowserReceipt {
  exactKeys(candidate, ["payload", "payloadSha256"], "G02 receipt envelope");
  const envelope = candidate as G02ProductionBrowserReceipt;
  if (envelope.payloadSha256 !== g02ProductionReceiptSha256(envelope.payload)) {
    throw new TypeError("G02 receipt payload SHA-256 mismatch.");
  }
  exactKeys(envelope.payload, PAYLOAD_KEYS, "G02 receipt payload");
  const payload = envelope.payload;
  assertExact(
    [payload.schemaVersion, payload.groupId, payload.project, payload.planCanonicalSha256, payload.playApplicable, payload.fullVisualInteractionCartesian],
    ["china-mainland-g02-production-browser-receipt.v1", "G02", project, G02_PRODUCTION_PLAN.canonicalSha256, false, false],
    "G02 receipt header",
  );
  assertExact(payload.labIds, G02_PRODUCTION_PLAN.labIds, "G02 lab order");
  assertExact(payload.visualAxisIds, expectedAxisIds(project), "G02 visual axes");
  assertExact(payload.interactionAxisId, expectedInteractionAxisId(project), "G02 interaction axis");
  const interactionAxis = expectedInteractionAxis(project);
  const expectedHtmlLang = interactionAxis.locale === "zh" ? "zh-Hant" : interactionAxis.locale;
  const expectedInteractionSurfaceObservations = G02_PRODUCTION_PLAN.labIds.flatMap(
    (labId) => (["before-initial", "after-reload"] as const).map((phase) => ({
      axisId: interactionAxis.axisId,
      htmlLang: expectedHtmlLang,
      labId,
      locale: interactionAxis.locale,
      phase,
      setupActions: [] as [],
      setupTapCount: 0,
      theme: interactionAxis.theme,
    })),
  );
  if (!Array.isArray(payload.interactionSurfaceObservations)) {
    throw new TypeError("G02 exact live interaction-axis surface observations are absent.");
  }
  payload.interactionSurfaceObservations.forEach((observation, index) =>
    exactKeys(
      observation,
      ["axisId", "htmlLang", "labId", "locale", "phase", "setupActions", "setupTapCount", "theme"],
      `G02 interaction surface observation ${index}`,
    ),
  );
  assertExact(
    payload.interactionSurfaceObservations,
    expectedInteractionSurfaceObservations,
    "G02 exact live interaction-axis surface observations; passive interaction surface observation requires zero correction actions",
  );
  const visualIds = expectedVisualIds(project);
  const interactionIds = expectedInteractionIds(project);
  assertExact(payload.visualStates.map(({ stateId }) => stateId), visualIds, "G02 visual state IDs");
  assertExact(payload.interactionStates.map(({ stateId }) => stateId), interactionIds, "G02 interaction state IDs");
  if (new Set([...visualIds, ...interactionIds]).size !== visualIds.length + interactionIds.length) {
    throw new TypeError("G02 receipt contains duplicate logical states.");
  }
  const durabilityUsers = new Map(
    payload.durabilityReceipts.map(({ labId, userId }) => [labId, userId]),
  );
  payload.visualStates.forEach((receipt, index) =>
    validateVisualState(
      receipt,
      visualIds[index]!,
      project,
      durabilityUsers.get(receipt.labId) ?? "",
    ),
  );
  const expectedHeaderTransitions: NonNullable<G02VisualStateReceipt["headerTransition"]>[] = [];
  let nextHeaderTransitionSequence = 0;
  let priorHeaderTransitionMonotonicMs = Number.NEGATIVE_INFINITY;
  for (const labId of G02_PRODUCTION_PLAN.labIds) {
    const labVisualStates = payload.visualStates.filter((state) => state.labId === labId);
    for (let index = 0; index < labVisualStates.length; index += 1) {
      const state = labVisualStates[index]!;
      const priorVisualState = labVisualStates[index - 1];
      if (project === "desktop-chrome" || !priorVisualState) {
        if (state.headerTransition !== null) {
          throw new TypeError(`${state.stateId}: unexpected prior-bottom header transition.`);
        }
        continue;
      }
      const transition = state.headerTransition;
      if (!transition) {
        throw new TypeError(`${state.stateId}: prior-bottom header transition is absent.`);
      }
      const priorScrollAudit = priorVisualState.scrollAudits.at(-1);
      if (priorScrollAudit?.scrollId !== "page-bottom") {
        throw new TypeError(`${state.stateId}: prior visual state did not end at page-bottom.`);
      }
      assertExact(
        {
          fromAxisId: transition.fromAxisId,
          fromScrollId: transition.fromScrollId,
          fromStateId: transition.fromStateId,
          labId: transition.labId,
          toAxisId: transition.toAxisId,
          toStateId: transition.toStateId,
          transitionSequence: transition.transitionSequence,
        },
        {
          fromAxisId: priorVisualState.axisId,
          fromScrollId: "page-bottom",
          fromStateId: priorVisualState.stateId,
          labId,
          toAxisId: state.axisId,
          toStateId: state.stateId,
          transitionSequence: nextHeaderTransitionSequence,
        },
        `${state.stateId} exact prior-bottom to next-header transition`,
      );
      const boundary = transition.fromBoundary;
      const toHeader = transition.toHeader;
      assertExact(
        {
          documentMaxScrollY: boundary.documentMaxScrollY,
          rootDocumentBottom: boundary.rootDocumentBottom,
          rootDocumentCenter: boundary.rootDocumentCenter,
          rootDocumentTop: boundary.rootDocumentTop,
          scrollY: boundary.scrollY,
          viewport: boundary.viewport,
        },
        {
          documentMaxScrollY: priorScrollAudit.geometry.documentMaxScrollY,
          rootDocumentBottom: priorScrollAudit.geometry.rootDocumentBottom,
          rootDocumentCenter: priorScrollAudit.geometry.rootDocumentCenter,
          rootDocumentTop: priorScrollAudit.geometry.rootDocumentTop,
          scrollY: priorScrollAudit.geometry.scrollY,
          viewport: {
            height: priorScrollAudit.geometry.viewportHeight,
            width: priorScrollAudit.geometry.viewportWidth,
          },
        },
        `${state.stateId} fresh prior page-bottom boundary`,
      );
      const firstNextTap = payload.touchEvidence.tapEntries.find(
        ({ stateId }) => stateId === state.stateId,
      );
      if (
        !firstNextTap ||
        !Number.isFinite(Date.parse(boundary.capturedAt)) ||
        !Number.isFinite(Date.parse(toHeader.capturedAt)) ||
        boundary.capturedMonotonicMs <= priorScrollAudit.capturedMonotonicMs ||
        boundary.capturedMonotonicMs <= priorHeaderTransitionMonotonicMs ||
        toHeader.capturedMonotonicMs <= boundary.capturedMonotonicMs ||
        firstNextTap.before.capturedMonotonicMs <= toHeader.capturedMonotonicMs ||
        Date.parse(boundary.capturedAt) < Date.parse(priorScrollAudit.capturedAt) ||
        Date.parse(toHeader.capturedAt) < Date.parse(boundary.capturedAt) ||
        Date.parse(firstNextTap.before.capturedAt) < Date.parse(toHeader.capturedAt) ||
        Math.abs(boundary.wallClockMinusMonotonicOriginMs - priorScrollAudit.wallClockMinusMonotonicOriginMs) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(toHeader.wallClockMinusMonotonicOriginMs - boundary.wallClockMinusMonotonicOriginMs) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(firstNextTap.before.wallClockMinusMonotonicOriginMs - toHeader.wallClockMinusMonotonicOriginMs) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(Date.parse(boundary.capturedAt) - boundary.capturedMonotonicMs - boundary.wallClockMinusMonotonicOriginMs) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(Date.parse(toHeader.capturedAt) - toHeader.capturedMonotonicMs - toHeader.wallClockMinusMonotonicOriginMs) > G02_CLOCK_PRECISION_TOLERANCE_MS
      ) throw new TypeError(`${state.stateId}: next exact state first physical tap is not after one fresh header transition.`);
      priorHeaderTransitionMonotonicMs = toHeader.capturedMonotonicMs;
      expectedHeaderTransitions.push(transition);
      nextHeaderTransitionSequence += 1;
    }
  }
  if (
    project === "mobile-chrome" &&
    expectedHeaderTransitions.length !==
      G02_PRODUCTION_PLAN.labIds.length * (expectedAxisIds(project).length - 1)
  ) throw new TypeError("G02 mobile prior-bottom header transition coverage is incomplete.");
  payload.interactionStates.forEach((receipt, index) =>
    validateInteractionState(
      receipt,
      interactionIds[index]!,
      project,
      durabilityUsers.get(receipt.labId) ?? "",
    ),
  );
  const subactions = payload.interactionStates.flatMap(({ action }) => action.subactions)
    .concat(payload.visualStates.map(({ resetAction }) => resetAction));
  const physicalDeliveries = subactions.flatMap((subaction) =>
    subaction.calibrationEvidence
      ? subaction.calibrationEvidence.attempts.flatMap((attempt) =>
          attempt.delivery
            ? [{
                event: attempt.delivery.event,
                temporal: {
                  actionSettledAt: attempt.settledAt,
                  actionSettledMonotonicMs: attempt.settledMonotonicMs,
                  actionStartedAt: attempt.startedAt,
                  actionStartedMonotonicMs: attempt.startedMonotonicMs,
                  captureSequence: attempt.delivery.analyticsCaptureSequence,
                  requestObservedAt: attempt.delivery.requestObservedAt,
                  requestObservedMonotonicMs: attempt.delivery.requestObservedMonotonicMs,
                  wallClockMinusMonotonicOriginMs: attempt.wallClockMinusMonotonicOriginMs,
                },
              }]
            : [],
        )
      : [{ event: subaction.event, temporal: subaction.temporal }],
  );
  const eventIds = physicalDeliveries.map(({ event }) => event.eventId);
  if (new Set(eventIds).size !== eventIds.length) {
    throw new TypeError("G02 subaction event IDs must be globally unique and non-replayable.");
  }
  const orderedDeliveries = [...physicalDeliveries].sort(
    (left, right) => left.temporal.captureSequence - right.temporal.captureSequence,
  );
  const sequences = orderedDeliveries.map(({ temporal }) => temporal.captureSequence);
  assertExact(
    sequences,
    sequences.map((_, index) => index),
    "G02 contiguous physical analytics capture sequence",
  );
  const jointOrigins = orderedDeliveries.flatMap(({ temporal }) => [
    temporal.wallClockMinusMonotonicOriginMs,
    Date.parse(temporal.actionStartedAt) - temporal.actionStartedMonotonicMs,
    Date.parse(temporal.requestObservedAt) - temporal.requestObservedMonotonicMs,
    Date.parse(temporal.actionSettledAt) - temporal.actionSettledMonotonicMs,
  ]).concat(
    subactions.flatMap(({ calibrationEvidence }) =>
      calibrationEvidence?.attempts.flatMap((attempt) => [
        attempt.wallClockMinusMonotonicOriginMs,
        Date.parse(attempt.startedAt) - attempt.startedMonotonicMs,
        Date.parse(attempt.settledAt) - attempt.settledMonotonicMs,
      ]) ?? [],
    ),
  );
  if (
    jointOrigins.length === 0 ||
    !jointOrigins.every(Number.isFinite) ||
    Math.max(...jointOrigins) - Math.min(...jointOrigins) >
      G02_CLOCK_PRECISION_TOLERANCE_MS
  ) {
    throw new TypeError("G02 actions do not share one exact wall-clock-minus-monotonic origin.");
  }
  for (let index = 1; index < orderedDeliveries.length; index += 1) {
    const prior = orderedDeliveries[index - 1]!.temporal;
    const current = orderedDeliveries[index]!.temporal;
    if (
      Date.parse(current.actionStartedAt) <= Date.parse(prior.actionSettledAt) ||
      current.actionStartedMonotonicMs <= prior.actionSettledMonotonicMs
    ) {
      throw new TypeError("G02 captureSequence does not strictly order later action start after prior settle in both clock domains.");
    }
  }
  const orderedSemanticSubactions = [...subactions].sort(
    (left, right) => left.temporal.captureSequence - right.temporal.captureSequence,
  );
  for (let index = 1; index < orderedSemanticSubactions.length; index += 1) {
    const prior = orderedSemanticSubactions[index - 1]!.temporal;
    const current = orderedSemanticSubactions[index]!.temporal;
    if (
      Date.parse(current.actionStartedAt) <= Date.parse(prior.actionSettledAt) ||
      current.actionStartedMonotonicMs <= prior.actionSettledMonotonicMs
    ) {
      throw new TypeError("G02 semantic subactions overlap or reorder their physical attempt windows.");
    }
  }
  const calibrationAttempts = subactions.flatMap(
    ({ calibrationEvidence }) => calibrationEvidence?.attempts ?? [],
  );
  const physicalCalibrationSequences = calibrationAttempts.map(
    ({ physicalCaptureSequence }) => physicalCaptureSequence,
  );
  assertExact(
    physicalCalibrationSequences,
    physicalCalibrationSequences.map((_, index) => index),
    "G02 contiguous ordered calibration tap ledger",
  );
  const orderedEventIds = orderedDeliveries.map(({ event }) => event.eventId);
  exactKeys(
    payload.analyticsCoverage,
    ["capturedQualifyingDeliveryCount", "capturedQualifyingEventIds", "consumedReceiptEventIds", "exact", "lateDeliveryCount", "unconsumedEventIds"],
    "G02 payload-wide analytics coverage",
  );
  assertExact(
    payload.analyticsCoverage,
    {
      capturedQualifyingDeliveryCount: orderedEventIds.length,
      capturedQualifyingEventIds: orderedEventIds,
      consumedReceiptEventIds: orderedEventIds,
      exact: true,
      lateDeliveryCount: 0,
      unconsumedEventIds: [],
    },
    "G02 payload-wide captured-consumed analytics equality",
  );
  assertExact(payload.diagnostics, { consoleErrors: [], pageErrors: [], requestFailures: [] }, "G02 diagnostics");
  assertExact(
    payload.execution,
    { complete: false, projectsTogether: ["desktop-chrome", "mobile-chrome"], retries: 0, shard: null, skipped: 0, unexpected: 0 },
    "G02 execution receipt",
  );
  exactKeys(
    payload.runnerInvocation,
    [
      "args",
      "authority",
      "authorityAvailable",
      "configuredProjects",
      "invocationSha256",
      "playwrightVersion",
      "releaseReady",
      "reporter",
      "retries",
      "runnerReceiptSha256",
      "schemaVersion",
      "spec",
      "workers",
    ],
    "G02 runner invocation evidence",
  );
  assertExact(
    payload.runnerInvocation,
    G02_CANONICAL_RUNNER_INVOCATION,
    "G02 unavailable trusted runner authority",
  );
  exactKeys(payload.sourceEvidence, ["rawFiles"], "G02 source evidence");
  assertExact(payload.sourceEvidence.rawFiles, rawSourceEvidence(), "G02 named raw source hashes");
  assertExact(
    payload.durabilityReceipts.map(({ labId }) => labId),
    G02_PRODUCTION_PLAN.labIds,
    "G02 durability lab order",
  );
  for (const [durabilityIndex, receipt] of payload.durabilityReceipts.entries()) {
    exactKeys(
      receipt,
      ["afterVisualFinal", "final", "firstAction", "labId", "lessonId", "mount", "rawSessionCheckpoints", "reload", "reset", "secondAction", "sequence", "sessionId", "siblings", "userId"],
      `${receipt.labId} durability`,
    );
    if (!receipt.sessionId || !receipt.userId || receipt.lessonId !== receipt.labId) {
      throw new TypeError(`${receipt.labId}: non-exact durable session identity.`);
    }
    assertExact(receipt.mount, { postCount: 0, sessionCount: 0 }, `${receipt.labId} mount`);
    assertExact(
      receipt.firstAction,
      { acknowledgementStatus: 200, completedBeforeReset: true, postCount: 1, sessionCount: 1 },
      `${receipt.labId} first action`,
    );
    assertExact(receipt.reset, { postCount: 0, sessionCount: 1 }, `${receipt.labId} reset`);
    assertExact(receipt.secondAction, { postCount: 0, sessionCount: 1 }, `${receipt.labId} second action`);
    assertExact(receipt.reload, { sameSession: true, sessionCount: 1 }, `${receipt.labId} reload`);
    exactKeys(
      receipt.rawSessionCheckpoints,
      ["afterFirst", "afterRegistration", "afterReload", "afterReset", "afterSecond", "afterSiblingSeed", "afterVisualFinal"],
      `${receipt.labId} raw session checkpoints`,
    );
    const expectedRawSiblingLabIds = G02_PRODUCTION_PLAN.labIds.filter(
      (labId) => labId !== receipt.labId,
    );
    const expectedRawAllLabIds = [...expectedRawSiblingLabIds, receipt.labId];
    validateRawSessionCheckpoint(
      receipt.rawSessionCheckpoints.afterRegistration,
      [],
      `${receipt.labId} after registration`,
    );
    validateRawSessionCheckpoint(
      receipt.rawSessionCheckpoints.afterSiblingSeed,
      expectedRawSiblingLabIds,
      `${receipt.labId} after sibling seed`,
    );
    for (const key of ["afterFirst", "afterReset", "afterSecond", "afterReload", "afterVisualFinal"] as const) {
      validateRawSessionCheckpoint(
        receipt.rawSessionCheckpoints[key],
        expectedRawAllLabIds,
        `${receipt.labId} ${key}`,
      );
    }
    const siblingBaselineSnapshots = receipt.rawSessionCheckpoints.afterSiblingSeed;
    for (const key of ["afterFirst", "afterReset", "afterSecond", "afterReload", "afterVisualFinal"] as const) {
      assertExact(
        receipt.rawSessionCheckpoints[key].slice(0, siblingBaselineSnapshots.length),
        siblingBaselineSnapshots,
        `${receipt.labId} ${key} byte-stable sibling snapshots`,
      );
    }
    const firstTargetSnapshot = receipt.rawSessionCheckpoints.afterFirst.at(-1);
    for (const key of ["afterReset", "afterSecond", "afterReload", "afterVisualFinal"] as const) {
      assertExact(
        receipt.rawSessionCheckpoints[key].at(-1),
        firstTargetSnapshot,
        `${receipt.labId} ${key} byte-stable exactly-once target snapshot`,
      );
    }
    assertExact(
      receipt.sequence,
      ["mount-baseline", "primary-first-action", "session-post-200", "pre-reset-reread", "reset", "second-action", "reload-reread", "visual-axes", "after-visual-final"],
      `${receipt.labId} durability sequence`,
    );
    exactKeys(receipt.siblings, ["afterFirst", "afterReload", "afterReset", "afterSecond", "afterVisualFinal", "baseline"], `${receipt.labId} sibling receipts`);
    assertExact(receipt.siblings.baseline, expectedSiblingCounts(receipt.labId, 0), `${receipt.labId} sibling baseline`);
    for (const key of ["afterFirst", "afterReset", "afterSecond", "afterReload"] as const) {
      assertExact(receipt.siblings[key], expectedSiblingCounts(receipt.labId, 1), `${receipt.labId} sibling ${key}`);
    }
    assertExact(
      receipt.siblings.afterVisualFinal,
      expectedSiblingCounts(receipt.labId, 1),
      `${receipt.labId} sibling after visual final`,
    );
    exactKeys(
      receipt.afterVisualFinal,
      ["captureBoundary", "postCount", "siblingCounts", "siblings", "target"],
      `${receipt.labId} after-visual-final durability`,
    );
    exactKeys(
      receipt.afterVisualFinal.captureBoundary,
      ["afterActionCaptureSequence", "beforeNextActionCaptureSequence", "capturedAt", "capturedMonotonicMs", "labSequenceIndex", "wallClockMinusMonotonicOriginMs"],
      `${receipt.labId} after-visual capture boundary`,
    );
    const interactionSubactions = payload.interactionStates
      .filter(({ labId }) => labId === receipt.labId)
      .flatMap(({ action }) => action.subactions)
      .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence);
    const visualResetActions = payload.visualStates
      .filter(({ labId }) => labId === receipt.labId)
      .map(({ resetAction }) => resetAction)
      .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence);
    const firstInteraction = interactionSubactions[0];
    const lastInteraction = interactionSubactions.at(-1);
    const firstVisualReset = visualResetActions[0];
    const lastVisualReset = visualResetActions.at(-1);
    if (!firstInteraction || !lastInteraction || !firstVisualReset || !lastVisualReset) {
      throw new TypeError(`${receipt.labId}: semantic interaction/visual phases are incomplete.`);
    }
    const boundary = receipt.afterVisualFinal.captureBoundary;
    const capturedAt = Date.parse(boundary.capturedAt);
    const boundaryOrigin = capturedAt - boundary.capturedMonotonicMs;
    const nextLabId = G02_PRODUCTION_PLAN.labIds[durabilityIndex + 1];
    const nextInteraction = nextLabId
      ? payload.interactionStates
          .filter(({ labId }) => labId === nextLabId)
          .flatMap(({ action }) => action.subactions)
          .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence)[0]
      : undefined;
    if (
      boundary.labSequenceIndex !== durabilityIndex ||
      !Number.isSafeInteger(boundary.afterActionCaptureSequence) ||
      boundary.afterActionCaptureSequence !== lastVisualReset.temporal.captureSequence ||
      boundary.beforeNextActionCaptureSequence !==
        (nextInteraction?.temporal.captureSequence ?? null) ||
      !Number.isFinite(capturedAt) ||
      !Number.isFinite(boundary.capturedMonotonicMs) ||
      boundary.capturedMonotonicMs < 0 ||
      !Number.isFinite(boundary.wallClockMinusMonotonicOriginMs) ||
      Math.abs(boundaryOrigin - boundary.wallClockMinusMonotonicOriginMs) >
        G02_CLOCK_PRECISION_TOLERANCE_MS ||
      Math.abs(boundaryOrigin - jointOrigins[0]!) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
      Math.abs(boundary.wallClockMinusMonotonicOriginMs - jointOrigins[0]!) >
        G02_CLOCK_PRECISION_TOLERANCE_MS ||
      lastInteraction.temporal.captureSequence >= firstVisualReset.temporal.captureSequence ||
      Date.parse(lastInteraction.temporal.actionSettledAt) >=
        Date.parse(firstVisualReset.temporal.actionStartedAt) ||
      lastInteraction.temporal.actionSettledMonotonicMs >=
        firstVisualReset.temporal.actionStartedMonotonicMs ||
      Date.parse(lastVisualReset.temporal.actionSettledAt) >= capturedAt ||
      lastVisualReset.temporal.actionSettledMonotonicMs >= boundary.capturedMonotonicMs ||
      (nextInteraction !== undefined &&
        (capturedAt >= Date.parse(nextInteraction.temporal.actionStartedAt) ||
          boundary.capturedMonotonicMs >= nextInteraction.temporal.actionStartedMonotonicMs))
    ) {
      throw new TypeError(`${receipt.labId}: semantic chronology must be interactions, visual resets, afterVisualFinal, then the next plan lab.`);
    }
    assertExact(receipt.afterVisualFinal.postCount, 0, `${receipt.labId} visual axes session POST count`);
    assertExact(
      receipt.afterVisualFinal.siblings.sessions,
      receipt.rawSessionCheckpoints.afterVisualFinal.slice(0, -1),
      `${receipt.labId} final sibling projection from raw checkpoint`,
    );
    assertExact(
      receipt.afterVisualFinal.target.sessions,
      receipt.rawSessionCheckpoints.afterVisualFinal.slice(-1),
      `${receipt.labId} final target projection from raw checkpoint`,
    );
    assertExact(
      receipt.afterVisualFinal.siblingCounts,
      expectedSiblingCounts(receipt.labId, 1),
      `${receipt.labId} after-visual-final sibling counts`,
    );
    assertExact(
      receipt.afterVisualFinal.siblingCounts,
      receipt.siblings.afterVisualFinal,
      `${receipt.labId} authoritative sibling count receipt`,
    );
    for (const [kind, snapshot] of [
      ["target", receipt.afterVisualFinal.target] as const,
      ["siblings", receipt.afterVisualFinal.siblings] as const,
    ]) {
      exactKeys(snapshot, ["count", "sessions", "userId"], `${receipt.labId} ${kind} final snapshot`);
      if (snapshot.userId !== receipt.userId || snapshot.sessions.length !== snapshot.count) {
        throw new TypeError(`${receipt.labId}: ${kind} final snapshot is not same-user exact.`);
      }
      for (const session of snapshot.sessions) {
        exactKeys(session, ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"], `${receipt.labId} ${kind} session`);
        const catalog = getVisualizationLabByLabId(session.topicId);
        if (
          !catalog ||
          session.explored !== true ||
          session.moduleId !== "configured-visualization-lab" ||
          session.source !== catalog.analyticsSource ||
          typeof session.updatedAt !== "string" ||
          !Number.isFinite(Date.parse(session.updatedAt)) ||
          (session.completedAt !== null &&
            (typeof session.completedAt !== "string" || !Number.isFinite(Date.parse(session.completedAt))))
        ) {
          throw new TypeError(`${receipt.labId}: forged ${kind} final session identity.`);
        }
      }
    }
    if (
      receipt.afterVisualFinal.target.sessions[0]?.topicId !== receipt.labId ||
      receipt.afterVisualFinal.siblings.sessions.some(({ topicId }) => topicId === receipt.labId) ||
      new Set(receipt.afterVisualFinal.siblings.sessions.map(({ topicId }) => topicId)).size !== 3
    ) {
      throw new TypeError(`${receipt.labId}: target/sibling final snapshot crossed lab identity.`);
    }
    const exactSiblingLabIds = G02_PRODUCTION_PLAN.labIds.filter(
      (labId) => labId !== receipt.labId,
    );
    assertExact(
      receipt.afterVisualFinal.siblings.sessions.map(({ topicId }) => topicId),
      exactSiblingLabIds,
      `${receipt.labId} exact ordered G02 sibling sessions`,
    );
    receipt.afterVisualFinal.siblings.sessions.forEach((session, index) => {
      const expectedLabId = exactSiblingLabIds[index]!;
      const expectedCatalog = getVisualizationLabByLabId(expectedLabId);
      assertExact(
        {
          moduleId: session.moduleId,
          source: session.source,
          topicId: session.topicId,
        },
        {
          moduleId: "configured-visualization-lab",
          source: expectedCatalog?.analyticsSource,
          topicId: expectedLabId,
        },
        `${receipt.labId} sibling ${index} exact catalog tuple`,
      );
    });
    assertExact(
      receipt.final,
      { exactlyOnce: true, noSiblingMutation: true, serverBacked: true, survivedReload: true },
      `${receipt.labId} final durability`,
    );
  }
  exactKeys(
    payload.touchEvidence,
    ["directionalSwipes", "hasTouch", "nonUiSessionSeed", "realSwipeCount", "realTapCount", "roundTrip", "swipeMoveCount", "swipeProtocol", "tapCategoryCounts", "tapEntries"],
    "G02 touch evidence",
  );
  exactKeys(
    payload.touchEvidence.nonUiSessionSeed,
    ["postCount", "transport"],
    "G02 non-UI sibling seed evidence",
  );
  const exactNonUiSeedCount = payload.labIds.length * (payload.labIds.length - 1);
  assertExact(
    payload.touchEvidence.nonUiSessionSeed,
    { postCount: exactNonUiSeedCount, transport: "page.request.post" },
    "G02 explicit non-UI sibling session seed transport",
  );
  exactKeys(
    payload.touchEvidence.tapCategoryCounts,
    ["calibrationAttemptCount", "interactionAxisSetupTapCount", "interactionNonRangeTapCount", "sessionSeedTapCount", "visualAxisSetupTapCount", "visualResetTapCount"],
    "G02 exact tap category union",
  );
  if (project === "mobile-chrome") {
    const expectedCalibrationAttemptCount = payload.interactionStates
      .flatMap(({ action }) => action.subactions)
      .flatMap(({ calibrationEvidence }) => calibrationEvidence?.attempts ?? []).length;
    const expectedInteractionNonRangeTapCount = payload.interactionStates
      .flatMap(({ action }) => action.subactions)
      .filter(({ calibrationEvidence }) => calibrationEvidence === null).length;
    const counts = payload.touchEvidence.tapCategoryCounts;
    const tapEntries = payload.touchEvidence.tapEntries;
    const categorizedTapUnion = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (
      payload.touchEvidence.hasTouch !== true ||
      !Number.isSafeInteger(payload.touchEvidence.realTapCount) ||
      payload.touchEvidence.realTapCount !== categorizedTapUnion ||
      tapEntries.length !== payload.touchEvidence.realTapCount ||
      !Object.values(counts).every((count) => Number.isSafeInteger(count) && count >= 0) ||
      counts.calibrationAttemptCount !== expectedCalibrationAttemptCount ||
      counts.interactionAxisSetupTapCount !== 0 ||
      counts.interactionNonRangeTapCount !== expectedInteractionNonRangeTapCount ||
      counts.sessionSeedTapCount !== 0 ||
      counts.visualAxisSetupTapCount !== expectedMobileVisualAxisSetupTapCount() ||
      counts.visualResetTapCount !== payload.visualStates.length ||
      payload.touchEvidence.realSwipeCount !== 2 ||
      payload.touchEvidence.swipeMoveCount !== 8 ||
      payload.touchEvidence.swipeProtocol !== "cdp:Input.dispatchTouchEvent"
    ) {
      throw new TypeError("G02 mobile receipt lacks real tap/swipe evidence with hasTouch.");
    }
    const calibrationAttemptLookup = new Map<number, {
      attempt: G02RangeCalibrationAttempt;
      geometry: G02RangeCalibrationEvidence["inputGeometry"];
    }>();
    for (const subaction of payload.interactionStates.flatMap(({ action }) => action.subactions)) {
      for (const attempt of subaction.calibrationEvidence?.attempts ?? []) {
        if (calibrationAttemptLookup.has(attempt.physicalCaptureSequence)) {
          throw new TypeError("G02 calibration tap ledger reuses a physical sequence.");
        }
        calibrationAttemptLookup.set(attempt.physicalCaptureSequence, {
          attempt,
          geometry: subaction.calibrationEvidence!.inputGeometry,
        });
      }
    }
    const observedCategoryCounts = {
      calibrationAttemptCount: 0,
      interactionAxisSetupTapCount: 0,
      interactionNonRangeTapCount: 0,
      sessionSeedTapCount: 0,
      visualAxisSetupTapCount: 0,
      visualResetTapCount: 0,
    };
    type TapEntry = G02ProductionBrowserPayload["touchEvidence"]["tapEntries"][number];
    type TapSemantic = Pick<
      TapEntry,
      "axisId" | "category" | "labId" | "phase" | "stateId" | "subactionId" | "target"
    >;
    const expectedTapSemantics: TapSemantic[] = [];
    for (const labId of G02_PRODUCTION_PLAN.labIds) {
      for (const state of payload.interactionStates.filter((candidate) => candidate.labId === labId)) {
        for (const subaction of state.action.subactions) {
          const semantic: TapSemantic = {
            axisId: state.axisId,
            category: subaction.calibrationEvidence ? "calibration-attempt" : "interaction-non-range",
            labId,
            phase: "interaction",
            stateId: state.stateId,
            subactionId: subaction.subactionId,
            target: subaction.target,
          };
          const physicalCount = subaction.calibrationEvidence?.attempts.length ?? 1;
          for (let attemptIndex = 0; attemptIndex < physicalCount; attemptIndex += 1) {
            expectedTapSemantics.push({ ...semantic });
          }
        }
      }
      let currentLocale = interactionAxis.locale;
      let currentTheme = interactionAxis.theme;
      for (const visualState of payload.visualStates.filter((state) => state.labId === labId)) {
        if (visualState.locale !== currentLocale) {
          expectedTapSemantics.push(
            {
              axisId: visualState.axisId,
              category: "visual-axis-setup",
              labId,
              phase: "visual-axis-setup",
              stateId: visualState.stateId,
              subactionId: "visual-axis-setup:locale:mobile-menu",
              target: "header:mobile-menu",
            },
            {
              axisId: visualState.axisId,
              category: "visual-axis-setup",
              labId,
              phase: "visual-axis-setup",
              stateId: visualState.stateId,
              subactionId: "visual-axis-setup:locale:selector",
              target: "header:language-selector",
            },
            {
              axisId: visualState.axisId,
              category: "visual-axis-setup",
              labId,
              phase: "visual-axis-setup",
              stateId: visualState.stateId,
              subactionId: `visual-axis-setup:locale:${visualState.locale}`,
              target: `header:language-option:${visualState.locale}`,
            },
          );
          currentLocale = visualState.locale;
        }
        if (visualState.theme !== currentTheme) {
          expectedTapSemantics.push({
            axisId: visualState.axisId,
            category: "visual-axis-setup",
            labId,
            phase: "visual-axis-setup",
            stateId: visualState.stateId,
            subactionId: `visual-axis-setup:theme:${visualState.theme}`,
            target: `header:theme-toggle:${visualState.theme}`,
          });
          currentTheme = visualState.theme;
        }
        expectedTapSemantics.push({
          axisId: visualState.axisId,
          category: "visual-reset",
          labId,
          phase: "visual-reset",
          stateId: visualState.stateId,
          subactionId: "primary:reset",
          target: "reset",
        });
      }
    }
    assertExact(
      tapEntries.map(({ axisId, category, labId, phase, stateId, subactionId, target }) => ({
        axisId,
        category,
        labId,
        phase,
        stateId,
        subactionId,
        target,
      })),
      expectedTapSemantics,
      "G02 exact plan-derived raw tap semantic chronology",
    );
    const semanticSubactionLookup = new Map<string, G02AnalyticsSubaction>();
    for (const state of payload.interactionStates) {
      for (const subaction of state.action.subactions) {
        semanticSubactionLookup.set(`${state.stateId}::${subaction.subactionId}`, subaction);
      }
    }
    for (const state of payload.visualStates) {
      semanticSubactionLookup.set(`${state.stateId}::${state.resetAction.subactionId}`, state.resetAction);
    }
    const matchedCalibrationSequences = new Set<number>();
    let priorTap: TapEntry | undefined;
    for (const [tapSequence, entry] of tapEntries.entries()) {
      exactKeys(
        entry,
        ["after", "axisId", "before", "calibrationPhysicalCaptureSequence", "category", "coordinate", "labId", "phase", "preparation", "rangeMeasurement", "stateId", "subactionId", "tapSequence", "target", "targetRect", "viewport"],
        `G02 raw touchscreen tap ${tapSequence}`,
      );
      exactKeys(entry.before, ["capturedAt", "capturedMonotonicMs", "wallClockMinusMonotonicOriginMs"], `G02 raw touchscreen tap ${tapSequence} before`);
      exactKeys(entry.after, ["capturedAt", "capturedMonotonicMs", "wallClockMinusMonotonicOriginMs"], `G02 raw touchscreen tap ${tapSequence} after`);
      exactKeys(entry.coordinate, ["x", "y"], `G02 raw touchscreen tap ${tapSequence} coordinate`);
      exactKeys(entry.targetRect, ["height", "width", "x", "y"], `G02 raw touchscreen tap ${tapSequence} target rect`);
      exactKeys(entry.viewport, ["height", "width"], `G02 raw touchscreen tap ${tapSequence} viewport`);
      const { coordinate, targetRect, viewport } = entry;
      if (
        entry.tapSequence !== tapSequence ||
        entry.preparation !== "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport" ||
        ![
          coordinate.x,
          coordinate.y,
          targetRect.height,
          targetRect.width,
          targetRect.x,
          targetRect.y,
          viewport.height,
          viewport.width,
        ].every(Number.isFinite) ||
        !(targetRect.height > 0) ||
        !(targetRect.width > 0) ||
        !(viewport.height > 0) ||
        !(viewport.width > 0) ||
        coordinate.x < targetRect.x ||
        coordinate.x > targetRect.x + targetRect.width ||
        coordinate.y < targetRect.y ||
        coordinate.y > targetRect.y + targetRect.height ||
        coordinate.x < 0 ||
        coordinate.x > viewport.width ||
        coordinate.y < 0 ||
        coordinate.y > viewport.height
      ) {
        throw new TypeError(`G02 raw touchscreen tap ${tapSequence} coordinate is outside its fresh target rect or live viewport.`);
      }
      if (
        !Number.isFinite(Date.parse(entry.before.capturedAt)) ||
        !Number.isFinite(Date.parse(entry.after.capturedAt)) ||
        !Number.isFinite(entry.before.capturedMonotonicMs) ||
        !Number.isFinite(entry.after.capturedMonotonicMs) ||
        !Number.isFinite(entry.before.wallClockMinusMonotonicOriginMs) ||
        !Number.isFinite(entry.after.wallClockMinusMonotonicOriginMs) ||
        entry.after.capturedMonotonicMs < entry.before.capturedMonotonicMs ||
        Date.parse(entry.after.capturedAt) < Date.parse(entry.before.capturedAt) ||
        Math.abs(
          entry.before.wallClockMinusMonotonicOriginMs -
          entry.after.wallClockMinusMonotonicOriginMs
        ) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(
          Date.parse(entry.before.capturedAt) - entry.before.capturedMonotonicMs -
          entry.before.wallClockMinusMonotonicOriginMs
        ) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        Math.abs(
          Date.parse(entry.after.capturedAt) - entry.after.capturedMonotonicMs -
          entry.after.wallClockMinusMonotonicOriginMs
        ) > G02_CLOCK_PRECISION_TOLERANCE_MS ||
        (priorTap !== undefined &&
          (entry.before.capturedMonotonicMs <= priorTap.after.capturedMonotonicMs ||
            Date.parse(entry.before.capturedAt) < Date.parse(priorTap.after.capturedAt)))
      ) throw new TypeError(`G02 raw touchscreen tap ${tapSequence} breaks strict global physical chronology.`);
      const semanticSubaction = semanticSubactionLookup.get(`${entry.stateId}::${entry.subactionId}`);
      if (
        entry.category !== "visual-axis-setup" &&
        entry.category !== "interaction-axis-setup" &&
        (!semanticSubaction ||
          entry.before.capturedMonotonicMs <
            semanticSubaction.temporal.actionStartedMonotonicMs - G02_CLOCK_PRECISION_TOLERANCE_MS ||
          entry.after.capturedMonotonicMs >
            semanticSubaction.temporal.actionSettledMonotonicMs + G02_CLOCK_PRECISION_TOLERANCE_MS ||
          Math.abs(
            entry.before.wallClockMinusMonotonicOriginMs -
            semanticSubaction.temporal.wallClockMinusMonotonicOriginMs
          ) > G02_CLOCK_PRECISION_TOLERANCE_MS)
      ) throw new TypeError(`G02 raw touchscreen tap ${tapSequence} escapes its exact semantic subaction window.`);
      if (entry.category === "visual-axis-setup") {
        const visualReset = payload.visualStates.find(({ stateId }) => stateId === entry.stateId)?.resetAction;
        if (
          !visualReset ||
          entry.after.capturedMonotonicMs >= visualReset.temporal.actionStartedMonotonicMs ||
          Math.abs(
            entry.before.wallClockMinusMonotonicOriginMs -
            visualReset.temporal.wallClockMinusMonotonicOriginMs
          ) > G02_CLOCK_PRECISION_TOLERANCE_MS
        ) throw new TypeError(`G02 raw touchscreen tap ${tapSequence} is not an ordered pre-reset visual setup.`);
      }
      if (entry.category === "calibration-attempt") {
        observedCategoryCounts.calibrationAttemptCount += 1;
        if (!Number.isSafeInteger(entry.calibrationPhysicalCaptureSequence)) {
          throw new TypeError(`G02 raw touchscreen tap ${tapSequence} lacks its calibration sequence.`);
        }
        const calibration = calibrationAttemptLookup.get(entry.calibrationPhysicalCaptureSequence!);
        if (!calibration || matchedCalibrationSequences.has(entry.calibrationPhysicalCaptureSequence!)) {
          throw new TypeError(`G02 raw touchscreen tap ${tapSequence} does not own one unique calibration attempt.`);
        }
        matchedCalibrationSequences.add(entry.calibrationPhysicalCaptureSequence!);
        if (
          entry.before.capturedAt !== calibration.attempt.startedAt ||
          entry.before.capturedMonotonicMs !== calibration.attempt.startedMonotonicMs ||
          entry.after.capturedMonotonicMs > calibration.attempt.settledMonotonicMs
        ) throw new TypeError(`G02 calibration tap ${tapSequence} is not bound to its physical attempt interval.`);
        assertExact(entry.coordinate, calibration.attempt.coordinate, `G02 calibration tap ${tapSequence} coordinate projection`);
        assertExact(
          entry.targetRect,
          {
            height: calibration.geometry.height,
            width: calibration.geometry.width,
            x: calibration.geometry.x,
            y: calibration.geometry.y,
          },
          `G02 calibration tap ${tapSequence} immutable rect projection`,
        );
        assertExact(
          entry.viewport,
          {
            height: calibration.geometry.viewportHeight,
            width: calibration.geometry.viewportWidth,
          },
          `G02 calibration tap ${tapSequence} live viewport projection`,
        );
        exactKeys(entry.rangeMeasurement, ["afterValue", "beforeValue", "valueChanged"], `G02 calibration tap ${tapSequence} range measurement`);
        assertExact(
          entry.rangeMeasurement,
          {
            afterValue: calibration.attempt.afterValue,
            beforeValue: calibration.attempt.beforeValue,
            valueChanged: calibration.attempt.valueChanged,
          },
          `G02 calibration tap ${tapSequence} exact final native measurement`,
        );
      } else {
        if (entry.calibrationPhysicalCaptureSequence !== null) {
          throw new TypeError(`G02 raw touchscreen tap ${tapSequence} forges a calibration sequence.`);
        }
        if (entry.rangeMeasurement !== null) {
          throw new TypeError(`G02 raw touchscreen tap ${tapSequence} forges a range measurement.`);
        }
        if (entry.category === "interaction-axis-setup") {
          observedCategoryCounts.interactionAxisSetupTapCount += 1;
        } else if (entry.category === "interaction-non-range") {
          observedCategoryCounts.interactionNonRangeTapCount += 1;
        } else if (entry.category === "visual-axis-setup") {
          observedCategoryCounts.visualAxisSetupTapCount += 1;
        } else if (entry.category === "visual-reset") {
          observedCategoryCounts.visualResetTapCount += 1;
        } else {
          throw new TypeError(`G02 raw touchscreen tap ${tapSequence} has an unsupported category.`);
        }
      }
      priorTap = entry;
    }
    assertExact(
      tapEntries
        .filter(({ category }) => category === "calibration-attempt")
        .map(({ calibrationPhysicalCaptureSequence }) => calibrationPhysicalCaptureSequence),
      Array.from({ length: expectedCalibrationAttemptCount }, (_, index) => index),
      "G02 globally increasing calibration physical sequence",
    );
    if (matchedCalibrationSequences.size !== calibrationAttemptLookup.size) {
      throw new TypeError("G02 calibration input geometry does not match its fresh tap ledger.");
    }
    assertExact(observedCategoryCounts, counts, "G02 raw touchscreen tap category projection");
    assertExact(
      payload.touchEvidence.directionalSwipes.map(({ direction }) => direction),
      ["toward-end", "toward-start"],
      "G02 exact directional swipe order",
    );
    for (const [index, swipe] of payload.touchEvidence.directionalSwipes.entries()) {
      exactKeys(swipe, ["afterScrollLeft", "beforeScrollLeft", "direction", "moveCount", "protocol", "signedDisplacement"], `G02 swipe ${index}`);
      if (
        swipe.protocol !== "cdp:Input.dispatchTouchEvent" ||
        swipe.moveCount !== 4 ||
        swipe.signedDisplacement !== swipe.afterScrollLeft - swipe.beforeScrollLeft ||
        (swipe.direction === "toward-end" && swipe.signedDisplacement <= 0) ||
        (swipe.direction === "toward-start" && swipe.signedDisplacement >= 0)
      ) {
        throw new TypeError(`G02 swipe ${index} lacks exact signed physical displacement.`);
      }
    }
    assertExact(
      payload.touchEvidence.roundTrip,
      { continuityTolerancePx: 2, returnRegionFraction: 0.25 },
      "G02 mobile swipe round-trip contract",
    );
    const [outward, returning] = payload.touchEvidence.directionalSwipes;
    if (!outward || !returning || !payload.touchEvidence.roundTrip) {
      throw new TypeError("G02 mobile swipe round trip is incomplete.");
    }
    const continuityGap = Math.abs(returning.beforeScrollLeft - outward.afterScrollLeft);
    const outwardDistance = Math.abs(outward.signedDisplacement);
    const finalDistanceFromInitial = Math.abs(
      returning.afterScrollLeft - outward.beforeScrollLeft,
    );
    if (
      continuityGap > payload.touchEvidence.roundTrip.continuityTolerancePx ||
      finalDistanceFromInitial >
        outwardDistance * payload.touchEvidence.roundTrip.returnRegionFraction ||
      finalDistanceFromInitial >= Math.abs(returning.beforeScrollLeft - outward.beforeScrollLeft)
    ) {
      throw new TypeError("G02 mobile swipes are discontinuous or do not materially return to the initial region.");
    }
  } else {
    assertExact(
      payload.touchEvidence,
      {
        directionalSwipes: [],
        hasTouch: false,
        nonUiSessionSeed: { postCount: exactNonUiSeedCount, transport: "page.request.post" },
        realSwipeCount: 0,
        realTapCount: 0,
        roundTrip: null,
        swipeMoveCount: 0,
        swipeProtocol: "none",
        tapCategoryCounts: {
          calibrationAttemptCount: 0,
          interactionAxisSetupTapCount: 0,
          interactionNonRangeTapCount: 0,
          sessionSeedTapCount: 0,
          visualAxisSetupTapCount: 0,
          visualResetTapCount: 0,
        },
        tapEntries: [],
      },
      "G02 desktop touch evidence",
    );
  }
  return true;
}

export function validateG02ProductionBrowserReceipt(
  candidate: unknown,
  project: G02ProductionProject,
): never {
  validateG02UntrustedStructuralReceipt(candidate, project);
  throw new TypeError(
    "G02 native runner authority and physical provenance are unavailable: caller-sealed JSON cannot authenticate the dedicated browser execution, source hold, supervisor receipt, or outer exit.",
  );
}

const NON_HOLLOW_SCAN: G02UiScan = {
  candidatePairCount: 1,
  controlCount: 1,
  htmlTextCount: 1,
  paintedMarkCount: 1,
  surfaceCount: 1,
  svgTextCount: 1,
};

const NON_HOLLOW_AUDIT: G02UiAudit = {
  clippedElementCount: 0,
  collisionIssueCount: 0,
  contrastCheckedTextCount: 1,
  contrastIssueCount: 0,
  horizontalOverflowPixels: 0,
  touchTargetCheckedCount: 1,
  touchTargetIssueCount: 0,
  uiScan: NON_HOLLOW_SCAN,
};

function resetReceipt(): G02ResetReceipt {
  return {
    exact: true,
    observation: structuredClone(RESET_OBSERVATION),
    resetControlCount: 1,
  };
}

function fixtureSubactions(
  stateId: string,
  labId: string,
  source: string,
  scenarioId: string,
  project: G02ProductionProject,
  userId: string,
  captureSequences: ReadonlyMap<string, readonly number[]>,
  calibrationPhysicalSequences: ReadonlyMap<string, readonly number[]>,
): G02AnalyticsSubaction[] {
  const catalog = getVisualizationLabByLabId(labId);
  if (!catalog) throw new TypeError(`${labId}: missing exact fixture catalog row.`);
  return expectedSubactions(scenarioId).map((expected, index) => {
    const key = `${stateId}::${expected.subactionId}`;
    const deliverySequences = captureSequences.get(key);
    if (!deliverySequences || deliverySequences.length === 0) {
      throw new TypeError(`${stateId}:${expected.subactionId}: missing semantic fixture sequence.`);
    }
    const captureSequence = deliverySequences.at(-1)!;
    const actionStartedMs = Date.parse("2026-08-20T00:00:00.000Z") + captureSequence * 2_000;
    const requestObservedMs = actionStartedMs + 200;
    const actionSettledMs = actionStartedMs + 300;
    const eventReceipt = (
      eventId: string,
      subactionId: string,
      eventTimestampMs: number,
    ): Pick<G02CalibrationDelivery, "analyticsEvidence" | "event"> => {
      const eventType = expectedG02AnalyticsEventType(expected);
      return {
      analyticsEvidence: {
        endpoint: "/api/learning-events",
        method: "POST",
        request: {
          body: {
            events: [{
              grade: catalog.grade,
              id: eventId,
              source,
              timestamp: new Date(eventTimestampMs).toISOString(),
              topicId: labId,
              type: eventType,
            }],
            generation: 0,
          },
          eventIds: [eventId],
          ownerHeader: "x-mais-analytics-user-id",
          userId,
        },
        response: { acknowledgedEventIds: [eventId], status: 200 },
      },
      event: {
        actionId: stateId,
        eventId,
        labId,
        source,
        stateId,
        subactionId,
        topicId: labId,
        type: eventType,
        userId,
      },
      };
    };
    if (project === "mobile-chrome" && expected.target.startsWith("range:")) {
      if (deliverySequences.length !== 3) {
        throw new TypeError(`${key}: fixture needs one delivery for every physical range tap.`);
      }
      const physicalSequences = calibrationPhysicalSequences.get(key);
      const control = expectedControl(scenarioId);
      if (
        !physicalSequences ||
        physicalSequences.length !== 3 ||
        control.kind !== "range" ||
        !Number.isSafeInteger(control.min) ||
        !Number.isSafeInteger(control.max) ||
        !Number.isSafeInteger(control.selected)
      ) {
        throw new TypeError(`${key}: fixture calibration inputs are absent.`);
      }
      const targetValue = Number(control.selected);
      const min = Number(control.min);
      const max = Number(control.max);
      const initialValue = Math.abs(targetValue - min) >= Math.abs(max - targetValue)
        ? min
        : max;
      let correctionValue = Math.trunc((initialValue + targetValue) / 2);
      if (correctionValue === initialValue) correctionValue += targetValue > initialValue ? 1 : -1;
      if (correctionValue === targetValue) correctionValue += initialValue > targetValue ? 1 : -1;
      const earlySequence = deliverySequences[0]!;
      const noOpSequence = deliverySequences[1]!;
      const finalSequence = deliverySequences[2]!;
      const origin = Date.parse("2026-08-20T00:00:00.000Z");
      const correctionStartedMs = origin + earlySequence * 2_000;
      const correctionRequestMs = correctionStartedMs + 200;
      const correctionSettledMs = correctionStartedMs + 300;
      const probeStartedMs = correctionStartedMs + 400;
      const probeRequestMs = correctionStartedMs + 600;
      const probeSettledMs = correctionStartedMs + 700;
      const finalStartedMs = origin + finalSequence * 2_000;
      const finalRequestMs = finalStartedMs + 200;
      const finalSettledMs = finalStartedMs + 300;
      const correctionReceipt = eventReceipt(
        `event:${project}:${stateId}:${index}:calibration-attempt:0`,
        `${expected.subactionId}:calibration-attempt:0`,
        correctionStartedMs + 100,
      );
      const noOpReceipt = eventReceipt(
        `event:${project}:${stateId}:${index}:calibration-attempt:1`,
        `${expected.subactionId}:calibration-attempt:1`,
        probeStartedMs + 100,
      );
      const finalReceipt = eventReceipt(
        `event:${project}:${stateId}:${index}`,
        expected.subactionId,
        finalStartedMs + 100,
      );
      const attempts: G02RangeCalibrationAttempt[] = [
        {
          afterValue: correctionValue,
          attemptIndex: 0,
          beforeValue: initialValue,
          coordinate: { x: 140, y: 20 },
          delivery: {
            analyticsCaptureSequence: earlySequence,
            ...correctionReceipt,
            requestObservedAt: new Date(correctionRequestMs).toISOString(),
            requestObservedMonotonicMs: correctionRequestMs - origin,
          },
          physicalCaptureSequence: physicalSequences[0]!,
          plannedRole: "bisection-correction",
          settledAt: new Date(correctionSettledMs).toISOString(),
          settledMonotonicMs: correctionSettledMs - origin,
          startedAt: new Date(correctionStartedMs).toISOString(),
          startedMonotonicMs: correctionStartedMs - origin,
          valueChanged: true,
          wallClockMinusMonotonicOriginMs: origin,
        },
        {
          afterValue: correctionValue,
          attemptIndex: 1,
          beforeValue: correctionValue,
          coordinate: { x: 140, y: 20 },
          delivery: {
            analyticsCaptureSequence: noOpSequence,
            ...noOpReceipt,
            requestObservedAt: new Date(probeRequestMs).toISOString(),
            requestObservedMonotonicMs: probeRequestMs - origin,
          },
          physicalCaptureSequence: physicalSequences[1]!,
          plannedRole: "midpoint-no-op-probe",
          settledAt: new Date(probeSettledMs).toISOString(),
          settledMonotonicMs: probeSettledMs - origin,
          startedAt: new Date(probeStartedMs).toISOString(),
          startedMonotonicMs: probeStartedMs - origin,
          valueChanged: false,
          wallClockMinusMonotonicOriginMs: origin,
        },
        {
          afterValue: targetValue,
          attemptIndex: 2,
          beforeValue: correctionValue,
          coordinate: { x: 180, y: 20 },
          delivery: {
            analyticsCaptureSequence: finalSequence,
            ...finalReceipt,
            requestObservedAt: new Date(finalRequestMs).toISOString(),
            requestObservedMonotonicMs: finalRequestMs - origin,
          },
          physicalCaptureSequence: physicalSequences[2]!,
          plannedRole: "final-settling-attempt",
          settledAt: new Date(finalSettledMs).toISOString(),
          settledMonotonicMs: finalSettledMs - origin,
          startedAt: new Date(finalStartedMs).toISOString(),
          startedMonotonicMs: finalStartedMs - origin,
          valueChanged: true,
          wallClockMinusMonotonicOriginMs: origin,
        },
      ];
      const deliveryEventIds = attempts.map(({ delivery }) => delivery.event.eventId);
      return {
        analyticsEvidence: finalReceipt.analyticsEvidence,
        calibrationEvidence: {
          aggregateTapCount: attempts.length,
          attempts,
          commitPolicy: "one-visualization-slider-event-per-physical-tap-including-native-no-op",
          consumedDeliveryEventIds: [...deliveryEventIds],
          finalSettlingAttemptIndex: attempts.length - 1,
          inputGeometry: {
            admissibleMaxX: 199.5,
            admissibleMaxY: 29.5,
            admissibleMinX: 80.5,
            admissibleMinY: 10.5,
            height: 20,
            midpointX: 140,
            tapY: 20,
            viewportHeight: 800,
            viewportWidth: 390,
            width: 120,
            x: 80,
            y: 10,
          },
          retainedDeliveryEventIds: [...deliveryEventIds],
          targetValue,
          terminalValue: targetValue,
          valueChangingAttemptCount: attempts.filter(({ valueChanged }) => valueChanged).length,
        },
        event: finalReceipt.event,
        ...expected,
        method: `page.touchscreen.tap:calibrated-bisection:${attempts.length}:exact-native-value`,
        temporal: {
          actionSettledAt: new Date(finalSettledMs).toISOString(),
          actionSettledMonotonicMs: finalSettledMs - origin,
          actionStartedAt: new Date(correctionStartedMs).toISOString(),
          actionStartedMonotonicMs: correctionStartedMs - origin,
          captureSequence: finalSequence,
          postActionQualifyingDeliveryCount: finalSequence + 1,
          postActionQuiet: true,
          preActionQualifyingDeliveryCount: earlySequence,
          preActionQuiet: true,
          originToleranceMs: G02_CLOCK_PRECISION_TOLERANCE_MS,
          quietIntervalMs: 250,
          requestObservedAt: new Date(finalRequestMs).toISOString(),
          requestObservedMonotonicMs: finalRequestMs - origin,
          toleranceMs: G02_CLOCK_PRECISION_TOLERANCE_MS,
          wallClockMinusMonotonicOriginMs: origin,
        },
      };
    }
    const eventId = `event:${project}:${stateId}:${index}`;
    const receipt = eventReceipt(
      eventId,
      expected.subactionId,
      actionStartedMs + 100,
    );
    return {
      analyticsEvidence: receipt.analyticsEvidence,
      calibrationEvidence: null,
      event: receipt.event,
      ...expected,
      method:
        project === "mobile-chrome"
          ? "page.touchscreen.tap"
          : expected.target.startsWith("range:")
            ? "page.mouse.click"
            : "locator.press:Enter",
      temporal: {
        actionSettledAt: new Date(actionSettledMs).toISOString(),
        actionSettledMonotonicMs: captureSequence * 2_000 + 300,
        actionStartedAt: new Date(actionStartedMs).toISOString(),
        actionStartedMonotonicMs: captureSequence * 2_000,
        captureSequence,
        postActionQualifyingDeliveryCount: captureSequence + 1,
        postActionQuiet: true,
        preActionQualifyingDeliveryCount: captureSequence,
        preActionQuiet: true,
        originToleranceMs: G02_CLOCK_PRECISION_TOLERANCE_MS,
        quietIntervalMs: 250,
        requestObservedAt: new Date(requestObservedMs).toISOString(),
        requestObservedMonotonicMs: captureSequence * 2_000 + 200,
        toleranceMs: G02_CLOCK_PRECISION_TOLERANCE_MS,
        wallClockMinusMonotonicOriginMs: Date.parse("2026-08-20T00:00:00.000Z"),
      },
    };
  });
}

export function createG02ProductionReceiptFixture(
  project: G02ProductionProject,
): G02ProductionBrowserReceipt {
  const interactionAxis = expectedInteractionAxis(project);
  const axisId = interactionAxis.axisId;
  const captureSequences = new Map<string, readonly number[]>();
  const calibrationPhysicalSequences = new Map<string, readonly number[]>();
  let nextSequence = 0;
  let nextCalibrationPhysicalSequence = 0;
  for (const labId of G02_PRODUCTION_PLAN.labIds) {
    for (const stateId of expectedInteractionIds(project).filter((candidate) =>
      candidate.startsWith(`interaction:${labId}:${axisId}:`),
    )) {
      const scenarioId = scenarioFromStateId(stateId, labId, axisId);
      for (const subaction of expectedSubactions(scenarioId)) {
        const key = `${stateId}::${subaction.subactionId}`;
        if (project === "mobile-chrome" && subaction.target.startsWith("range:")) {
          captureSequences.set(key, [nextSequence++, nextSequence++, nextSequence++]);
          calibrationPhysicalSequences.set(key, [
            nextCalibrationPhysicalSequence++,
            nextCalibrationPhysicalSequence++,
            nextCalibrationPhysicalSequence++,
          ]);
        } else {
          captureSequences.set(key, [nextSequence++]);
        }
      }
    }
    for (const stateId of expectedVisualIds(project).filter((candidate) =>
      candidate.startsWith(`visual:${labId}:`),
    )) {
      captureSequences.set(`${stateId}::primary:reset`, [nextSequence++]);
    }
  }
  const priorFixtureVisualByLab = new Map<string, {
    axisId: string;
    bottomAudit: G02VisualStateReceipt["scrollAudits"][number];
    stateId: string;
  }>();
  let nextFixtureHeaderTransitionSequence = 0;
  const fixtureOrigin = Date.parse("2026-08-20T00:00:00.000Z");
  const visualStates = expectedVisualIds(project).map((stateId): G02VisualStateReceipt => {
    const labId = G02_PRODUCTION_PLAN.labIds.find((id) =>
      stateId.startsWith(`visual:${id}:`),
    )!;
    const axis = G02_PRODUCTION_PLAN.coverage.visualAxes.find(({ axisId }) =>
      stateId.endsWith(`:${axisId}:reset`),
    )!;
    if (
      (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
      (axis.theme !== "dark" && axis.theme !== "light")
    ) {
      throw new TypeError(`${axis.axisId}: unsupported G02 visual axis.`);
    }
    const resetAction = fixtureSubactions(
      stateId,
      labId,
      getVisualizationLabByLabId(labId)?.analyticsSource ?? "missing",
      "reset",
      project,
      `user:${project}:${labId}`,
      captureSequences,
      calibrationPhysicalSequences,
    )[0]!;
    const scrollAudits: G02VisualStateReceipt["scrollAudits"] =
      (["page-top", "visualization-center", "page-bottom"] as const).map((scrollId, auditIndex) => {
        const viewportHeight = 800;
        const viewportWidth = project === "mobile-chrome" ? 390 : 1_440;
        const scrollY = scrollId === "page-top" ? 0 : scrollId === "visualization-center" ? 500 : 1_000;
        const rootTop = 500 - scrollY;
        const rootBottom = 1_300 - scrollY;
        const rootCenter = (rootTop + rootBottom) / 2;
        const capturedMonotonicMs = resetAction.temporal.actionSettledMonotonicMs +
          (auditIndex + 1) * 100;
        return {
          ...structuredClone(NON_HOLLOW_AUDIT),
          capturedAt: new Date(fixtureOrigin + capturedMonotonicMs).toISOString(),
          capturedMonotonicMs,
          geometry: {
            centerTolerancePx: 40 as const,
            documentMaxScrollY: 1_000,
            rootBottom,
            rootCenter,
            rootDocumentBottom: rootBottom + scrollY,
            rootDocumentCenter: rootCenter + scrollY,
            rootDocumentTop: rootTop + scrollY,
            rootTop,
            scrollY,
            viewportCenter: viewportHeight / 2,
            viewportHeight,
            viewportWidth,
          },
          scrollId,
          scrollMethod: project === "mobile-chrome"
            ? "cdp:Input.dispatchTouchEvent:vertical" as const
            : scrollId === "visualization-center"
              ? "locator.scrollIntoViewIfNeeded" as const
              : "page.keyboard.press" as const,
          wallClockMinusMonotonicOriginMs: fixtureOrigin,
        };
      });
    const priorVisualState = priorFixtureVisualByLab.get(labId);
    const headerTransition: G02VisualStateReceipt["headerTransition"] =
      project === "mobile-chrome" && priorVisualState
        ? {
          fromAxisId: priorVisualState.axisId,
          fromBoundary: {
            capturedAt: new Date(
              fixtureOrigin + priorVisualState.bottomAudit.capturedMonotonicMs + 10,
            ).toISOString(),
            capturedMonotonicMs: priorVisualState.bottomAudit.capturedMonotonicMs + 10,
            documentMaxScrollY: priorVisualState.bottomAudit.geometry.documentMaxScrollY,
            rootDocumentBottom: priorVisualState.bottomAudit.geometry.rootDocumentBottom,
            rootDocumentCenter: priorVisualState.bottomAudit.geometry.rootDocumentCenter,
            rootDocumentTop: priorVisualState.bottomAudit.geometry.rootDocumentTop,
            scrollY: priorVisualState.bottomAudit.geometry.scrollY,
            viewport: {
              height: priorVisualState.bottomAudit.geometry.viewportHeight,
              width: priorVisualState.bottomAudit.geometry.viewportWidth,
            },
            wallClockMinusMonotonicOriginMs: fixtureOrigin,
          },
          fromScrollId: "page-bottom" as const,
          fromStateId: priorVisualState.stateId,
          labId,
          toAxisId: axis.axisId,
          toHeader: {
            capturedAt: new Date(
              fixtureOrigin + priorVisualState.bottomAudit.capturedMonotonicMs + 20,
            ).toISOString(),
            capturedMonotonicMs: priorVisualState.bottomAudit.capturedMonotonicMs + 20,
            coordinate: { x: 195, y: 32 },
            preparation: "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport" as const,
            targetFingerprint: {
              id: null,
              role: "banner",
              tagName: "header",
              withinHeader: true,
            },
            targetRect: { height: 64, width: 390, x: 0, y: 0 },
            viewport: { height: 800, width: 390 },
            wallClockMinusMonotonicOriginMs: fixtureOrigin,
          },
          toStateId: stateId,
          transitionSequence: nextFixtureHeaderTransitionSequence++,
        }
      : null;
    const bottomAudit = scrollAudits.at(-1);
    if (!bottomAudit) throw new TypeError(`${stateId}: fixture bottom audit is absent.`);
    priorFixtureVisualByLab.set(labId, { axisId: axis.axisId, bottomAudit, stateId });
    return {
      axisId: axis.axisId,
      headerTransition,
      identity: { activeLabId: labId, configuredModelCount: 1, genericFallbackCount: 0, playApplicable: false, renderer: "mainland-decimal-arithmetic", resetControlCount: 1 },
      labId,
      locale: axis.locale,
      project,
      reset: resetReceipt(),
      resetAction,
      scrollAudits,
      stateId,
      theme: axis.theme,
    };
  });
  const interactionStates = expectedInteractionIds(project).map((stateId): G02InteractionStateReceipt => {
    const labId = G02_PRODUCTION_PLAN.labIds.find((id) =>
      stateId.startsWith(`interaction:${id}:`),
    )!;
    const scenarioId = scenarioFromStateId(stateId, labId, axisId);
    const source = getVisualizationLabByLabId(labId)?.analyticsSource;
    if (!source) throw new TypeError(`${labId}: missing analytics source.`);
    const initial = scenarioId === "initial";
    const reset = scenarioId === "reset";
    return {
      action: {
        actionId: stateId,
        modality: initial ? "none" : project === "mobile-chrome" ? "touch" : "keyboard-mouse",
        realInput: !initial,
        subactions: fixtureSubactions(
          stateId,
          labId,
          source,
          scenarioId,
          project,
          `user:${project}:${labId}`,
          captureSequences,
          calibrationPhysicalSequences,
        ),
      },
      axisId,
      control: expectedControl(scenarioId),
      genericFallbackCount: 0,
      labId,
      observation: expectedObservation(scenarioId),
      resetAfter: initial || reset ? null : resetReceipt(),
      scenarioId,
      stateId,
      uiScan: structuredClone(NON_HOLLOW_AUDIT),
    };
  });
  const siblingCounts = (targetLabId: string, targetCount: number) =>
    expectedSiblingCounts(targetLabId, targetCount);
  const sessionSnapshot = (labId: string): G02SessionSnapshot => {
    const source = getVisualizationLabByLabId(labId)?.analyticsSource;
    if (!source) throw new TypeError(`${labId}: missing fixture session source.`);
    return {
      completedAt: null,
      explored: true,
      moduleId: "configured-visualization-lab",
      source,
      topicId: labId,
      updatedAt: "2026-08-20T00:00:00.000Z",
    };
  };
  const allSubactions = interactionStates.flatMap(({ action }) => action.subactions)
    .concat(visualStates.map(({ resetAction }) => resetAction));
  const orderedEventIds = allSubactions
    .flatMap((subaction) =>
      subaction.calibrationEvidence
        ? subaction.calibrationEvidence.attempts.map(({ delivery }) => ({
            event: delivery.event,
            captureSequence: delivery.analyticsCaptureSequence,
          }))
        : [{ event: subaction.event, captureSequence: subaction.temporal.captureSequence }],
    )
    .sort((left, right) => left.captureSequence - right.captureSequence)
    .map(({ event }) => event.eventId);
  const rawSiblingSnapshots = (targetLabId: string) =>
    G02_PRODUCTION_PLAN.labIds
      .filter((labId) => labId !== targetLabId)
      .map(sessionSnapshot);
  const rawAllSnapshots = (targetLabId: string) => [
    ...rawSiblingSnapshots(targetLabId),
    sessionSnapshot(targetLabId),
  ];
  type FixtureTapEntry = G02ProductionBrowserPayload["touchEvidence"]["tapEntries"][number];
  type FixtureTapIdentity = Pick<
    FixtureTapEntry,
    "axisId" | "labId" | "phase" | "stateId" | "subactionId" | "target"
  >;
  const fixtureTapEntries: FixtureTapEntry[] = [];
  const pushFixtureTap = (
    category: FixtureTapEntry["category"],
    identity: FixtureTapIdentity,
    startedMonotonicMs: number,
    calibrationPhysicalCaptureSequence: number | null = null,
    geometry: G02RangeCalibrationEvidence["inputGeometry"] | null = null,
    coordinate: { x: number; y: number } | null = null,
    rangeMeasurement: FixtureTapEntry["rangeMeasurement"] = null,
  ) => {
    const targetRect = geometry
      ? { height: geometry.height, width: geometry.width, x: geometry.x, y: geometry.y }
      : { height: 44, width: 100, x: 20, y: 20 };
    const prior = fixtureTapEntries.at(-1);
    if (prior && startedMonotonicMs <= prior.after.capturedMonotonicMs) {
      throw new TypeError("G02 fixture raw tap chronology is not strictly increasing.");
    }
    const origin = Date.parse("2026-08-20T00:00:00.000Z");
    fixtureTapEntries.push({
      after: {
        capturedAt: new Date(origin + startedMonotonicMs + 1).toISOString(),
        capturedMonotonicMs: startedMonotonicMs + 1,
        wallClockMinusMonotonicOriginMs: origin,
      },
      ...identity,
      before: {
        capturedAt: new Date(origin + startedMonotonicMs).toISOString(),
        capturedMonotonicMs: startedMonotonicMs,
        wallClockMinusMonotonicOriginMs: origin,
      },
      calibrationPhysicalCaptureSequence,
      category,
      coordinate: coordinate ?? { x: 70, y: 42 },
      preparation: "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport",
      rangeMeasurement,
      tapSequence: fixtureTapEntries.length,
      targetRect,
      viewport: geometry
        ? { height: geometry.viewportHeight, width: geometry.viewportWidth }
        : { height: 800, width: 390 },
    });
  };
  if (project === "mobile-chrome") {
    for (const labId of G02_PRODUCTION_PLAN.labIds) {
      for (const state of interactionStates.filter((candidate) => candidate.labId === labId)) {
        for (const subaction of state.action.subactions) {
          const identity: FixtureTapIdentity = {
            axisId: state.axisId,
            labId,
            phase: "interaction",
            stateId: state.stateId,
            subactionId: subaction.subactionId,
            target: subaction.target,
          };
        if (subaction.calibrationEvidence) {
          for (const attempt of subaction.calibrationEvidence.attempts) {
            pushFixtureTap(
              "calibration-attempt",
              identity,
              attempt.startedMonotonicMs,
              attempt.physicalCaptureSequence,
              subaction.calibrationEvidence.inputGeometry,
              attempt.coordinate,
              {
                afterValue: attempt.afterValue,
                beforeValue: attempt.beforeValue,
                valueChanged: attempt.valueChanged,
              },
            );
          }
        } else {
          pushFixtureTap(
            "interaction-non-range",
            identity,
            subaction.temporal.actionStartedMonotonicMs,
          );
        }
        }
      }
      let currentLocale: "en" | "zh" | "zh-Hans" = interactionAxis.locale;
      let currentTheme: "dark" | "light" = interactionAxis.theme;
      for (const visualState of visualStates.filter((state) => state.labId === labId)) {
        const setupTaps: Array<Pick<FixtureTapIdentity, "subactionId" | "target">> = [];
        if (visualState.locale !== currentLocale) {
          setupTaps.push(
            { subactionId: "visual-axis-setup:locale:mobile-menu", target: "header:mobile-menu" },
            { subactionId: "visual-axis-setup:locale:selector", target: "header:language-selector" },
            { subactionId: `visual-axis-setup:locale:${visualState.locale}`, target: `header:language-option:${visualState.locale}` },
          );
          currentLocale = visualState.locale;
        }
        if (visualState.theme !== currentTheme) {
          setupTaps.push({
            subactionId: `visual-axis-setup:theme:${visualState.theme}`,
            target: `header:theme-toggle:${visualState.theme}`,
          });
          currentTheme = visualState.theme;
        }
        setupTaps.forEach((setup, index) => pushFixtureTap(
          "visual-axis-setup",
          {
            axisId: visualState.axisId,
            labId,
            phase: "visual-axis-setup",
            stateId: visualState.stateId,
            ...setup,
          },
          visualState.resetAction.temporal.actionStartedMonotonicMs -
            (setupTaps.length - index) * 10,
        ));
        pushFixtureTap(
          "visual-reset",
          {
            axisId: visualState.axisId,
            labId,
            phase: "visual-reset",
            stateId: visualState.stateId,
            subactionId: "primary:reset",
            target: "reset",
          },
          visualState.resetAction.temporal.actionStartedMonotonicMs,
        );
      }
    }
  }
  const fixtureTapCategoryCounts = {
    calibrationAttemptCount: fixtureTapEntries.filter(({ category }) => category === "calibration-attempt").length,
    interactionAxisSetupTapCount: fixtureTapEntries.filter(({ category }) => category === "interaction-axis-setup").length,
    interactionNonRangeTapCount: fixtureTapEntries.filter(({ category }) => category === "interaction-non-range").length,
    sessionSeedTapCount: 0,
    visualAxisSetupTapCount: fixtureTapEntries.filter(({ category }) => category === "visual-axis-setup").length,
    visualResetTapCount: fixtureTapEntries.filter(({ category }) => category === "visual-reset").length,
  };
  const fixtureRealTapCount = fixtureTapEntries.length;
  return sealG02ProductionBrowserPayload({
    analyticsCoverage: {
      capturedQualifyingDeliveryCount: orderedEventIds.length,
      capturedQualifyingEventIds: [...orderedEventIds],
      consumedReceiptEventIds: [...orderedEventIds],
      exact: true,
      lateDeliveryCount: 0,
      unconsumedEventIds: [],
    },
    diagnostics: { consoleErrors: [], pageErrors: [], requestFailures: [] },
    durabilityReceipts: G02_PRODUCTION_PLAN.labIds.map((labId, labSequenceIndex) => {
      const visualResetActions = visualStates
        .filter((state) => state.labId === labId)
        .map(({ resetAction }) => resetAction)
        .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence);
      const lastVisualReset = visualResetActions.at(-1);
      if (!lastVisualReset) throw new TypeError(`${labId}: fixture visual phase is absent.`);
      const nextLabId = G02_PRODUCTION_PLAN.labIds[labSequenceIndex + 1];
      const nextInteraction = nextLabId
        ? interactionStates
            .filter((state) => state.labId === nextLabId)
            .flatMap(({ action }) => action.subactions)
            .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence)[0]
        : undefined;
      const capturedMonotonicMs = lastVisualReset.temporal.actionSettledMonotonicMs + 500;
      const rawFinal = rawAllSnapshots(labId);
      return {
        afterVisualFinal: {
          captureBoundary: {
            afterActionCaptureSequence: lastVisualReset.temporal.captureSequence,
            beforeNextActionCaptureSequence: nextInteraction?.temporal.captureSequence ?? null,
            capturedAt: new Date(
              Date.parse("2026-08-20T00:00:00.000Z") + capturedMonotonicMs,
            ).toISOString(),
            capturedMonotonicMs,
            labSequenceIndex,
            wallClockMinusMonotonicOriginMs: Date.parse("2026-08-20T00:00:00.000Z"),
          },
          postCount: 0,
          siblingCounts: siblingCounts(labId, 1),
          siblings: {
            count: 3,
            sessions: rawFinal.slice(0, -1),
            userId: `user:${project}:${labId}`,
          },
          target: {
            count: 1,
            sessions: rawFinal.slice(-1) as [G02SessionSnapshot],
            userId: `user:${project}:${labId}`,
          },
        },
        final: { exactlyOnce: true, noSiblingMutation: true, serverBacked: true, survivedReload: true },
        firstAction: { acknowledgementStatus: 200, completedBeforeReset: true, postCount: 1, sessionCount: 1 },
        labId,
        lessonId: labId,
        mount: { postCount: 0, sessionCount: 0 },
        rawSessionCheckpoints: {
          afterFirst: rawAllSnapshots(labId),
          afterRegistration: [],
          afterReload: rawAllSnapshots(labId),
          afterReset: rawAllSnapshots(labId),
          afterSecond: rawAllSnapshots(labId),
          afterSiblingSeed: rawSiblingSnapshots(labId),
          afterVisualFinal: rawFinal,
        },
        reload: { sameSession: true, sessionCount: 1 },
        reset: { postCount: 0, sessionCount: 1 },
        secondAction: { postCount: 0, sessionCount: 1 },
        sequence: ["mount-baseline", "primary-first-action", "session-post-200", "pre-reset-reread", "reset", "second-action", "reload-reread", "visual-axes", "after-visual-final"],
        sessionId: `session:${project}:${labId}`,
        siblings: {
          afterFirst: siblingCounts(labId, 1),
          afterReload: siblingCounts(labId, 1),
          afterReset: siblingCounts(labId, 1),
          afterSecond: siblingCounts(labId, 1),
          afterVisualFinal: siblingCounts(labId, 1),
          baseline: siblingCounts(labId, 0),
        },
        userId: `user:${project}:${labId}`,
      };
    }),
    execution: { complete: false, projectsTogether: ["desktop-chrome", "mobile-chrome"], retries: 0, shard: null, skipped: 0, unexpected: 0 },
    fullVisualInteractionCartesian: false,
    groupId: "G02",
    interactionAxisId: axisId,
    interactionSurfaceObservations: G02_PRODUCTION_PLAN.labIds.flatMap((labId) =>
      (["before-initial", "after-reload"] as const).map((phase) => ({
        axisId,
        htmlLang: interactionAxis.locale === "zh" ? "zh-Hant" as const : interactionAxis.locale,
        labId,
        locale: interactionAxis.locale,
        phase,
        setupActions: [] as [],
        setupTapCount: 0,
        theme: interactionAxis.theme,
      })),
    ),
    interactionStates,
    labIds: [...G02_PRODUCTION_PLAN.labIds],
    planCanonicalSha256: G02_PRODUCTION_PLAN.canonicalSha256,
    playApplicable: false,
    project,
    runnerInvocation: structuredClone(G02_CANONICAL_RUNNER_INVOCATION) as G02RunnerInvocationEvidence,
    schemaVersion: "china-mainland-g02-production-browser-receipt.v1",
    sourceEvidence: { rawFiles: rawSourceEvidence() },
    touchEvidence: project === "mobile-chrome"
      ? {
          directionalSwipes: [
            { afterScrollLeft: 100, beforeScrollLeft: 0, direction: "toward-end", moveCount: 4, protocol: "cdp:Input.dispatchTouchEvent", signedDisplacement: 100 },
            { afterScrollLeft: 0, beforeScrollLeft: 100, direction: "toward-start", moveCount: 4, protocol: "cdp:Input.dispatchTouchEvent", signedDisplacement: -100 },
          ],
          hasTouch: true,
          nonUiSessionSeed: {
            postCount: G02_PRODUCTION_PLAN.labIds.length * (G02_PRODUCTION_PLAN.labIds.length - 1),
            transport: "page.request.post",
          },
          realSwipeCount: 2,
          realTapCount: fixtureRealTapCount,
          roundTrip: { continuityTolerancePx: 2, returnRegionFraction: 0.25 },
          swipeMoveCount: 8,
          swipeProtocol: "cdp:Input.dispatchTouchEvent",
          tapCategoryCounts: fixtureTapCategoryCounts,
          tapEntries: fixtureTapEntries,
        }
      : {
          directionalSwipes: [],
          hasTouch: false,
          nonUiSessionSeed: {
            postCount: G02_PRODUCTION_PLAN.labIds.length * (G02_PRODUCTION_PLAN.labIds.length - 1),
            transport: "page.request.post",
          },
          realSwipeCount: 0,
          realTapCount: 0,
          roundTrip: null,
          swipeMoveCount: 0,
          swipeProtocol: "none",
          tapCategoryCounts: fixtureTapCategoryCounts,
          tapEntries: fixtureTapEntries,
        },
    visualAxisIds: expectedAxisIds(project),
    visualStates,
  });
}
