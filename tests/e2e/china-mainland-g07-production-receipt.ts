import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  symbolicExpressionsControlDescriptorFor,
  type SymbolicExpressionsControlDomainState,
  type SymbolicExpressionsScenarioControlId,
} from "../../components/visualizations/mainland/SymbolicExpressionsControlDomain";
import {
  createSymbolicExpressionsLabUiState,
  reduceSymbolicExpressionsLabUiState,
  type SymbolicExpressionsLabTransitionReceipt,
} from "../../components/visualizations/mainland/SymbolicExpressionsLab";
import {
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "../../components/visualizations/mainland/SymbolicExpressionsModel";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import type { LearningAnalyticsEventType } from "../../types";
import { G07_PRODUCTION_PLAN } from "./china-mainland-g07-production-plan";

export type G07ProductionProject = "desktop-chrome" | "mobile-chrome";

export const G07_APPROVED_PLAN_CANONICAL_SHA256 =
  "c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477";
export const G07_SELECTED_CRITICAL_SOURCES_VERSION =
  "china-mainland-g07-selected-critical-sources.v2";

export const G07_RUNNER_INVOCATION_ENV_JSON =
  "MAIS_G07_RUNNER_INVOCATION_JSON";
export const G07_RUNNER_INVOCATION_ENV_SHA256 =
  "MAIS_G07_RUNNER_INVOCATION_SHA256";

const G07_RUNNER_CORE = {
  args: [
    "test",
    "tests/e2e/china-mainland-g07-production-browser.spec.ts",
    "--config=playwright.config.ts",
    "--workers=1",
    "--retries=0",
    "--reporter=line",
  ],
  cliSelectionCanary: {
    internalFields: ["cliArgs", "cliGrep", "cliGrepInvert", "cliProjectFilter"],
    playwrightVersion: "1.59.1",
    publicFullConfigIsCliAuthority: false,
    sourcePath: "node_modules/playwright/lib/testActions.js",
  },
  configuredProjects: ["desktop-chrome", "mobile-chrome"],
  playwrightVersion: "1.59.1",
  reporter: "line",
  retries: 0,
  schemaVersion: "china-mainland-g07-runner-invocation.v1",
  spec: "tests/e2e/china-mainland-g07-production-browser.spec.ts",
  workers: 1,
} as const;

export type G07RunnerInvocationEvidence = {
  args: string[];
  authority: "caller-environment-contract-only";
  authorityAvailable: false;
  cliSelectionCanary: {
    internalFields: ["cliArgs", "cliGrep", "cliGrepInvert", "cliProjectFilter"];
    playwrightVersion: "1.59.1";
    publicFullConfigIsCliAuthority: false;
    sourcePath: "node_modules/playwright/lib/testActions.js";
  };
  configuredProjects: G07ProductionProject[];
  invocationSha256: string;
  playwrightVersion: "1.59.1";
  releaseReady: false;
  reporter: "line";
  retries: 0;
  runnerReceiptSha256: null;
  schemaVersion: "china-mainland-g07-runner-invocation.v1";
  spec: "tests/e2e/china-mainland-g07-production-browser.spec.ts";
  workers: 1;
};

export const G07_CANONICAL_RUNNER_INVOCATION = Object.freeze({
  ...structuredClone(G07_RUNNER_CORE),
  authority: "caller-environment-contract-only" as const,
  authorityAvailable: false as const,
  invocationSha256: g07ProductionReceiptSha256(G07_RUNNER_CORE),
  releaseReady: false as const,
  runnerReceiptSha256: null,
}) as unknown as G07RunnerInvocationEvidence;

const SELECTED_CRITICAL_SOURCE_PATHS = [
  "tests/e2e/china-mainland-g07-production-plan.ts",
  "tests/e2e/china-mainland-g07-production-receipt.ts",
  "tests/e2e/china-mainland-g07-production-browser.spec.ts",
  "components/visualizations/mainland/SymbolicExpressionsLab.tsx",
  "components/visualizations/mainland/SymbolicExpressionsControlDomain.ts",
  "components/visualizations/mainland/SymbolicExpressionsModel.ts",
  "components/visualizations/mainland/SymbolicExpressionsVisualModel.tsx",
  "components/visualizations/ConfiguredVisualizationLab.tsx",
  "tests/e2e/china-visualization-collision-receipt.ts",
  "tests/e2e/hk-visualization-collision-scanner.ts",
  "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  "data/visualizationLabs.ts",
  "components/providers/AppProviders.tsx",
  "components/layout/Navbar.tsx",
  "components/ui/LanguageToggle.tsx",
  "components/ui/ThemeToggle.tsx",
  "lib/i18n.ts",
  "lib/learningAnalytics.ts",
  "tests/e2e/helpers.ts",
  "lib/server/userStore.ts",
  "lib/server/userStore/studentActivityPersistence.ts",
  "lib/server/sessionCookie.ts",
  "lib/visualizationSessionOutbox.ts",
  "lib/visualizationSessionRequestBody.ts",
  "lib/visualizationSessionContract.ts",
  "lib/server/visualizationSessionEligibility.ts",
  "lib/server/auth.ts",
  "app/api/learning-events/route.ts",
  "app/api/visualization-sessions/route.ts",
  "app/api/auth/register/route.ts",
  "types/index.ts",
] as const;

const EVENT_TIMESTAMP_TOLERANCE_MS = 1_000;
const QUIET_INTERVAL_MS = 250;
const SCROLL_IDS = [
  "page-top",
  "visualization-center",
  "page-bottom",
] as const;

type G07ControlEvidence = {
  controlId: string | null;
  kind: "button" | "none" | "range";
  max: number | null;
  min: number | null;
  options: string[];
  requested: number | string | null;
  step: number | null;
};

type G07StateObservation = {
  accepted: boolean;
  error: { causeCode: string | null; code: string } | null;
  modelStateKey: string;
  observed: SymbolicExpressionsControlDomainState;
  projectionReasons: string[];
  requested: SymbolicExpressionsControlDomainState;
};

type G07UiScan = {
  candidatePairCount: number;
  controlCount: number;
  htmlTextCount: number;
  paintedMarkCount: number;
  surfaceCount: number;
  svgTextCount: number;
};

type G07UiAudit = {
  clippedElementCount: 0;
  collisionIssueCount: 0;
  contrastCheckedTextCount: number;
  contrastIssueCount: 0;
  horizontalOverflowPixels: 0;
  touchTargetCheckedCount: number;
  touchTargetIssueCount: 0;
  uiScan: G07UiScan;
};

type G07ResetReceipt = {
  exact: true;
  observation: G07StateObservation;
  resetControlCount: 1;
};

type G07InteractionSurfaceObservation = {
  htmlLang: "en" | "zh-Hans" | "zh-Hant";
  locale: "en" | "zh" | "zh-Hans";
  theme: "dark" | "light";
};

type G07AnalyticsEventType = Extract<
  LearningAnalyticsEventType,
  "visualization-probe" | "visualization-reset" | "visualization-slider"
>;

type G07AnalyticsSubaction = {
  deliveryId: string;
  eventId: string;
  kind: "primary" | "reset" | "setup" | "swipe";
  method: string;
  subactionId: string;
  target: string;
};

const PHYSICAL_INPUT_CATEGORIES = [
  "horizontal-scroll",
  "locale-menu-open",
  "locale-menu-restore",
  "locale-option",
  "locale-selector",
  "mode",
  "range-calibration",
  "reset",
  "theme-toggle",
  "vertical-scroll",
] as const;

type G07PhysicalInputCategory = (typeof PHYSICAL_INPUT_CATEGORIES)[number];

export type G07DomElementIdentity = {
  ariaLabel: string | null;
  dataVizMode: string | null;
  dataVizModeButton: string | null;
  dataVizParameter: string | null;
  dataVizResetModel: string | null;
  dataVizResetModuleId: string | null;
  dataVizResetTopicId: string | null;
  id: string | null;
  name: string | null;
  role: string | null;
  tagName: string;
  type: string | null;
};

export type G07TapEvidence = {
  boxCapturedAfterScrollIntoView: true;
  hitAncestorIdentities: G07DomElementIdentity[];
  hitAncestorFingerprints: string[];
  hitTargetFingerprint: string;
  hitTestMatched: true;
  hitTestMethod: "document.elementFromPoint";
  rawHitIdentity: G07DomElementIdentity;
  rawHitFingerprint: string;
  targetFingerprint: string;
  targetIdentity: G07DomElementIdentity;
  targetIsHit: boolean;
  targetRect: { height: number; width: number; x: number; y: number };
  viewportHeight: number;
  viewportWidth: number;
  x: number;
  y: number;
};

export type G07PhysicalInputEntry = {
  analyticsBound: boolean;
  category: G07PhysicalInputCategory;
  deliveryId: string | null;
  direction: "down-page" | "toward-end" | "toward-start" | "up-page" | null;
  eventId: string | null;
  kind: "swipe" | "tap";
  labId: string | null;
  method: "cdp:Input.dispatchTouchEvent" | "page.touchscreen.tap";
  moveCount: 0 | 4;
  sequence: number;
  setupPhaseId: string | null;
  stateId: string | null;
  tapEvidence: G07TapEvidence | null;
  targetIdentity: string;
};

type G07ScrollGeometry = {
  centerTolerancePx: 40;
  documentMaxScrollY: number;
  rootBottom: number;
  rootCenter: number;
  rootDocumentBottom: number;
  rootDocumentTop: number;
  rootTop: number;
  scrollY: number;
  viewportCenter: number;
  viewportHeight: number;
};

export type G07VerticalSwipeAttempt = {
  afterGeometry: G07ScrollGeometry;
  afterScrollY: number;
  attemptNumber: number;
  beforeGeometry: G07ScrollGeometry;
  beforeScrollY: number;
  direction: "down-page" | "up-page";
  method: "cdp:Input.dispatchTouchEvent:vertical";
  moveCount: 4;
  physicalInputSequence: number;
  signedDisplacement: number;
  targetReached: boolean;
};

export type G07LocaleThemeSetupTransition = {
  after: G07InteractionSurfaceObservation;
  before: G07InteractionSurfaceObservation;
  labId: string;
  menu: {
    afterOpen: G07MobileMenuObservation | null;
    afterRestore: G07MobileMenuObservation;
    before: G07MobileMenuObservation;
    openRequired: boolean;
    restoreRequired: boolean;
  };
  phaseId: string;
  physicalInputSequences: number[];
  requested: { locale: "en" | "zh" | "zh-Hans"; theme: "dark" | "light" };
  requiredCategories: G07SetupPhysicalInputCategory[];
  stateId: string;
};

export type G07MobileMenuObservation = {
  localeSelectorActionable: boolean;
  panelVisible: boolean;
  themeToggleActionable: boolean;
  triggerAriaExpanded: boolean;
  triggerVisible: boolean;
};

type G07SetupPhysicalInputCategory = Extract<
  G07PhysicalInputCategory,
  "locale-menu-open" | "locale-menu-restore" | "locale-option" | "locale-selector" | "theme-toggle"
>;

export type G07PhysicalStepProjectionEntry = {
  labId: string;
  physicalInputSequence: number;
  referenceId: string;
  stateId: string;
  stepKind: "analytics" | "horizontal" | "setup" | "vertical";
};

export type G07RawAnalyticsDelivery = {
  captureSequence: number;
  deliveryId: string;
  ownerHeader: "x-mais-analytics-user-id";
  ownerUserId: string;
  parsedRequestBody: {
    events: [{
      grade: string;
      id: string;
      source: string;
      timestamp: string;
      topicId: string;
      type: G07AnalyticsEventType;
    }];
    generation: number;
  };
  parsedResponseBody: { acknowledgedEventIds: [string] };
  rawRequestBody: string;
  rawResponseBody: string;
  responseBodyReady: true;
  responseStatus: 200;
  serializedRequestBody: string;
  serializedResponseBody: string;
  temporal: {
    actionSettledAt: string;
    actionSettledMonotonicMs: number;
    actionStartedAt: string;
    actionStartedMonotonicMs: number;
    clockOriginEpochMs: number;
    postActionQuiet: true;
    preActionQuiet: true;
    quietIntervalMs: 250;
    requestObservedAt: string;
    requestObservedMonotonicMs: number;
    toleranceMs: 1000;
  };
};

export type G07VisualStateReceipt = {
  axisId: string;
  identity: {
    activeLabId: string;
    configuredModelCount: 1;
    genericFallbackCount: 0;
    playApplicable: false;
    renderer: "mainland-symbolic-expressions";
    resetControlCount: 1;
  };
  labId: string;
  locale: "en" | "zh" | "zh-Hans";
  project: G07ProductionProject;
  reset: G07ResetReceipt;
  resetAction: G07AnalyticsSubaction;
  scrollAudits: Array<G07UiAudit & {
    geometry: G07ScrollGeometry;
    initialGeometry: G07ScrollGeometry;
    scrollId: (typeof SCROLL_IDS)[number];
    scrollMethod:
      | "already-at-landmark"
      | "cdp:Input.dispatchTouchEvent:vertical"
      | "locator.scrollIntoViewIfNeeded"
      | "page.keyboard.press";
    verticalSwipeAttempts: G07VerticalSwipeAttempt[];
  }>;
  stateId: string;
  theme: "dark" | "light";
};

export type G07InteractionStateReceipt = {
  action: {
    actionId: string;
    modality: "keyboard-mouse" | "none" | "touch";
    realInput: boolean;
    subactions: G07AnalyticsSubaction[];
  };
  axisId: string;
  control: G07ControlEvidence;
  genericFallbackCount: 0;
  labId: string;
  observation: G07StateObservation;
  resetAfter: G07ResetReceipt | null;
  scenarioId: string;
  stateId: string;
  uiScan: G07UiAudit;
};

type SessionSnapshot = {
  completedAt: string | null;
  explored: true;
  moduleId: "configured-visualization-lab";
  source: string;
  topicId: string;
  updatedAt: string;
};

type SessionSet = {
  count: number;
  sessions: SessionSnapshot[];
  userId: string;
};

export type G07RawSessionCheckpoint = {
  capturedAt: string;
  capturedMonotonicMs: number;
  checkpointId: string;
  clockOriginEpochMs: number;
  followingAnalyticsCaptureSequence: number | null;
  fullRecords: SessionSnapshot[];
  parsedResponseBody: { sessions: SessionSnapshot[] };
  projections: { siblings: SessionSet; target: SessionSet };
  precedingAnalyticsCaptureSequence: number | null;
  rawResponseBody: string;
};

export type G07RangeTouchAttempt = {
  afterObservedValue: number;
  attemptNumber: 1;
  attemptedValue: number;
  beforeObservedValue: number;
  controlId: string;
  deliveryId: string;
  eventId: string;
  expectedAccepted: boolean;
  expectedReducerError: { causeCode: string | null; code: string } | null;
  labId: string;
  max: number;
  maxAttempts: 1;
  min: number;
  physicalInputSequence: number;
  requestedValue: number;
  stateId: string;
  step: 1;
  targetRect: { height: number; width: number; x: number; y: number };
  touchX: number;
  touchY: number;
  trackEndX: number;
  trackStartX: number;
  viewportHeight: number;
  viewportWidth: number;
};

type G07PhaseBoundary = {
  clockOriginEpochMs: number;
  finalCheckpoint: {
    captureSequence: number;
    capturedAt: string;
    capturedMonotonicMs: number;
  };
  interactionLastCaptureSequence: number;
  labSequenceIndex: number;
  nextLabFirstCaptureSequence: number | null;
  visualFirstCaptureSequence: number;
  visualLastCaptureSequence: number;
};

type DurabilityStage = {
  acknowledgementStatus: 200 | null;
  postCount: 0 | 1;
  siblings: SessionSet;
  stage: "final" | "first" | "mount" | "reload" | "reset" | "second";
  target: SessionSet;
};

export type G07ProductionBrowserPayload = {
  analyticsLedger: {
    consumedDeliveryIds: string[];
    consumedEventIds: string[];
    exactTerminalEquality: true;
    lateDeliveryCount: 0;
    listenerLifetime: {
      disposedAfterTerminalQuiescence: true;
      installedBeforeRelevantPageActions: true;
      installedOnce: true;
      projectQuiescentRawCount: number;
      projectTerminalRawCount: number;
    };
    parsedEventIds: string[];
    rawDeliveries: G07RawAnalyticsDelivery[];
    rawEventIds: string[];
    receiptEventIds: string[];
    serializedEventIds: string[];
    surplusDeliveryIds: [];
    unconsumedDeliveryIds: [];
  };
  diagnostics: { consoleErrors: []; pageErrors: []; requestFailures: [] };
  durabilityReceipts: Array<{
    final: {
      exactlyOnce: true;
      noSiblingMutation: true;
      sameUser: true;
      serverBacked: true;
      survivedReload: true;
    };
    interactionSurfaceEvidence: {
      afterReload: G07InteractionSurfaceObservation;
      beforeInitial: G07InteractionSurfaceObservation;
    };
    labId: string;
    phaseBoundary: G07PhaseBoundary;
    rawSessionCheckpointChain: G07RawSessionCheckpoint[];
    sessionId: string;
    stages: DurabilityStage[];
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
  groupId: "G07";
  interactionAxisId: string;
  interactionStates: G07InteractionStateReceipt[];
  labIds: string[];
  planCanonicalSha256: string;
  playApplicable: false;
  project: G07ProductionProject;
  runnerInvocation: G07RunnerInvocationEvidence;
  schemaVersion: "china-mainland-g07-production-browser-receipt.v1";
  sourceEvidence: {
    selectedCriticalSources: Array<{ path: string; sha256: string }>;
    selectionKind: "selected-critical-sources";
    selectionVersion: typeof G07_SELECTED_CRITICAL_SOURCES_VERSION;
    transitiveClosureClaimed: false;
  };
  touchEvidence: {
    directionalSwipes: Array<{
      analytics: G07AnalyticsSubaction;
      afterScrollLeft: number;
      beforeScrollLeft: number;
      clientWidth: number;
      direction: "toward-end" | "toward-start";
      labId: string;
      moveCount: 4;
      protocol: "cdp:Input.dispatchTouchEvent";
      scrollerId: "horizontal";
      scrollWidth: number;
      signedDisplacement: number;
    }>;
    hasTouch: boolean;
    physicalInputLedger: {
      analyticsBoundEntrySequences: number[];
      entries: G07PhysicalInputEntry[];
      orderedStepProjection: G07PhysicalStepProjectionEntry[];
      totals: {
        byCategory: Record<G07PhysicalInputCategory, number>;
        moves: number;
        swipes: number;
        taps: number;
      };
    };
    rangeTouchAttempts: G07RangeTouchAttempt[];
    realSwipeCount: number;
    realTapCount: number;
    swipeMoveCount: number;
    swipeProtocol: "cdp:Input.dispatchTouchEvent" | "none";
    setupTransitions: G07LocaleThemeSetupTransition[];
  };
  visualAxisIds: string[];
  visualStates: G07VisualStateReceipt[];
};

export type G07ProductionBrowserReceipt = {
  payload: G07ProductionBrowserPayload;
  payloadSha256: string;
};

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

function parseJsonBytes(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new TypeError(`${label} raw bytes are malformed JSON.`);
  }
}

export function g07ProductionReceiptSha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

const G07_DOM_ELEMENT_IDENTITY_KEYS = [
  "ariaLabel",
  "dataVizMode",
  "dataVizModeButton",
  "dataVizParameter",
  "dataVizResetModel",
  "dataVizResetModuleId",
  "dataVizResetTopicId",
  "id",
  "name",
  "role",
  "tagName",
  "type",
] as const satisfies readonly (keyof G07DomElementIdentity)[];

export function g07DomIdentityFingerprint(identity: G07DomElementIdentity) {
  return `g07-dom:${g07ProductionReceiptSha256(identity)}`;
}

export function g07CanonicalRunnerInvocationEnvironment() {
  const json = canonicalJson(G07_CANONICAL_RUNNER_INVOCATION);
  return { json, sha256: g07ProductionReceiptSha256(G07_CANONICAL_RUNNER_INVOCATION) };
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
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())
  ) {
    throw new TypeError(`${label} keys are not exact.`);
  }
}

function assertExact(actual: unknown, expected: unknown, label: string) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new TypeError(`${label} does not match the exact G07 contract.`);
  }
}

function validateG07DomElementIdentity(
  identity: unknown,
  label: string,
): asserts identity is G07DomElementIdentity {
  exactKeys(identity, G07_DOM_ELEMENT_IDENTITY_KEYS, label);
  const record = identity as G07DomElementIdentity;
  if (
    typeof record.tagName !== "string" ||
    record.tagName.length === 0 ||
    record.tagName !== record.tagName.toLowerCase() ||
    G07_DOM_ELEMENT_IDENTITY_KEYS
      .filter((key) => key !== "tagName")
      .some((key) => record[key] !== null && typeof record[key] !== "string")
  ) {
    throw new TypeError(`${label} is not an exact raw DOM identity.`);
  }
}

export function readG07RunnerInvocationEnvironment(
  environment: Record<string, string | undefined>,
): G07RunnerInvocationEvidence {
  const json = environment[G07_RUNNER_INVOCATION_ENV_JSON];
  const sha256 = environment[G07_RUNNER_INVOCATION_ENV_SHA256];
  if (!json || !sha256) throw new TypeError("G07 runner invocation environment is missing.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new TypeError("G07 runner invocation JSON is malformed.");
  }
  if (json !== canonicalJson(parsed)) throw new TypeError("G07 runner invocation JSON is not canonical.");
  if (sha256 !== g07ProductionReceiptSha256(parsed)) throw new TypeError("G07 runner invocation SHA-256 mismatch.");
  assertExact(parsed, G07_CANONICAL_RUNNER_INVOCATION, "G07 runner invocation");
  return structuredClone(parsed) as G07RunnerInvocationEvidence;
}

export function assertG07TrustedRunnerAuthority(
  evidence: G07RunnerInvocationEvidence,
): never {
  assertExact(evidence, G07_CANONICAL_RUNNER_INVOCATION, "G07 runner invocation");
  throw new TypeError(
    "G07 trusted native runner authority is unavailable: direct Playwright or caller JSON plus SHA-256 cannot own spawn/wait/immutable-receipt authority, so project/grep/grep-invert/shard/retry narrowing cannot become complete or release ready.",
  );
}

function selectedCriticalSourceEvidence() {
  return SELECTED_CRITICAL_SOURCE_PATHS.map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(new URL(`../../${path}`, import.meta.url)))
      .digest("hex"),
  }));
}

function expectedVisualAxisIds(project: G07ProductionProject) {
  return G07_PRODUCTION_PLAN.coverage.visualAxes
    .filter((axis) => axis.project === project)
    .map(({ axisId }) => axisId);
}

function expectedInteractionAxisId(project: G07ProductionProject) {
  const axis = G07_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: missing G07 interaction axis.`);
  return axis.axisId;
}

function expectedInteractionSurface(project: G07ProductionProject): G07InteractionSurfaceObservation {
  const axis = G07_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (
    !axis ||
    (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
    (axis.theme !== "dark" && axis.theme !== "light")
  ) throw new TypeError(`${project}: invalid G07 interaction surface axis.`);
  return {
    htmlLang: axis.locale === "zh" ? "zh-Hant" : axis.locale,
    locale: axis.locale,
    theme: axis.theme,
  };
}

function expectedVisualStateIds(project: G07ProductionProject) {
  const axes = expectedVisualAxisIds(project);
  return G07_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    axes.some((axisId) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function expectedInteractionStateIds(project: G07ProductionProject) {
  const axisId = expectedInteractionAxisId(project);
  return G07_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function scenarioFromStateId(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) throw new TypeError(`${stateId}: invalid G07 state identity.`);
  return stateId.slice(prefix.length);
}

function topicPlan(labId: string) {
  const topic = G07_PRODUCTION_PLAN.topics.find((candidate) => candidate.labId === labId);
  if (!topic) throw new TypeError(`${labId}: missing G07 topic plan.`);
  return topic;
}

function modePlan(labId: string, mode: string) {
  const plan = topicPlan(labId).modes.find((candidate) => candidate.mode === mode);
  if (!plan) throw new TypeError(`${labId}:${mode}: missing G07 mode plan.`);
  return plan;
}

function fieldValue(state: SymbolicExpressionsControlDomainState, controlId: string) {
  const field = {
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
  }[controlId] as keyof SymbolicExpressionsControlDomainState | undefined;
  if (!field || typeof state[field] !== "number") throw new TypeError(`${controlId}: unknown G07 control.`);
  return state[field] as number;
}

function observationFromReceipt(receipt: SymbolicExpressionsLabTransitionReceipt) {
  const model = buildSymbolicExpressionsModel(
    buildSymbolicExpressionsScenarioInput(receipt.observed),
  );
  return {
    accepted: receipt.accepted,
    error: receipt.error,
    modelStateKey: model.stateKey,
    observed: receipt.observed,
    projectionReasons: receipt.projections.map(({ reason }) => reason),
    requested: receipt.requested,
  } as G07StateObservation;
}

function expectedScenario(labId: string, scenarioId: string) {
  const typedLabId = labId as SymbolicExpressionsLabId;
  let ui = createSymbolicExpressionsLabUiState(typedLabId);
  if (scenarioId === "initial" || scenarioId === "reset") {
    return observationFromReceipt(ui.receipt);
  }
  if (scenarioId === "first") {
    const descriptor = symbolicExpressionsControlDescriptorFor(
      typedLabId,
      ui.domainState.mode,
    );
    const control = descriptor.controls[0]!;
    const current = fieldValue(ui.domainState, control.controlId);
    const next = current < control.max ? current + 1 : current - 1;
    ui = reduceSymbolicExpressionsLabUiState(ui, {
      controlId: control.controlId,
      kind: "control",
      value: next,
    });
    return observationFromReceipt(ui.receipt);
  }
  if (scenarioId.startsWith("mode:")) {
    ui = reduceSymbolicExpressionsLabUiState(ui, {
      controllerId: "mode",
      kind: "controller",
      value: scenarioId.slice("mode:".length) as SymbolicExpressionsMode,
    });
    return observationFromReceipt(ui.receipt);
  }
  const [, mode, controlId, endpoint] = scenarioId.split(":");
  if (!mode || !controlId || !endpoint) throw new TypeError(`${scenarioId}: invalid G07 scenario.`);
  ui = reduceSymbolicExpressionsLabUiState(ui, {
    controllerId: "mode",
    kind: "controller",
    value: mode as SymbolicExpressionsMode,
  });
  const control = modePlan(labId, mode).controls.find(
    (candidate) => candidate.controlId === controlId,
  );
  const endpointPlan = control?.endpoints.find((candidate) => candidate.endpoint === endpoint);
  if (!control || !endpointPlan || typeof endpointPlan.value !== "number") {
    throw new TypeError(`${scenarioId}: missing G07 endpoint plan.`);
  }
  ui = reduceSymbolicExpressionsLabUiState(ui, {
    controlId: controlId as SymbolicExpressionsScenarioControlId,
    kind: "control",
    value: endpointPlan.value,
  });
  return observationFromReceipt(ui.receipt);
}

function expectedControl(labId: string, scenarioId: string): G07ControlEvidence {
  if (scenarioId === "initial" || scenarioId === "reset") {
    return { controlId: null, kind: "none", max: null, min: null, options: [], requested: null, step: null };
  }
  if (scenarioId.startsWith("mode:")) {
    return {
      controlId: "mode",
      kind: "button",
      max: null,
      min: null,
      options: [...topicPlan(labId).allowedModes],
      requested: scenarioId.slice("mode:".length),
      step: null,
    };
  }
  if (scenarioId === "first") {
    const reset = createSymbolicExpressionsControlDomainState(labId as SymbolicExpressionsLabId);
    const control = modePlan(labId, reset.mode).controls[0]!;
    const current = fieldValue(reset, control.controlId);
    return {
      controlId: control.controlId,
      kind: "range",
      max: control.max,
      min: control.min,
      options: [],
      requested: current < control.max ? current + 1 : current - 1,
      step: control.step,
    };
  }
  const [, mode, controlId, endpoint] = scenarioId.split(":");
  const control = modePlan(labId, mode!).controls.find(
    (candidate) => candidate.controlId === controlId,
  );
  const endpointPlan = control?.endpoints.find((candidate) => candidate.endpoint === endpoint);
  if (!control || !endpointPlan) throw new TypeError(`${scenarioId}: missing G07 control evidence.`);
  return {
    controlId,
    kind: "range",
    max: control.max,
    min: control.min,
    options: [],
    requested: endpointPlan.value,
    step: control.step,
  };
}

function expectedRangeBeforeState(
  labId: string,
  scenarioId: string,
): SymbolicExpressionsControlDomainState {
  let ui = createSymbolicExpressionsLabUiState(labId as SymbolicExpressionsLabId);
  if (scenarioId !== "first") {
    const [, mode] = scenarioId.split(":");
    if (!mode) throw new TypeError(`${scenarioId}: missing range mode.`);
    if (mode !== ui.domainState.mode) {
      ui = reduceSymbolicExpressionsLabUiState(ui, {
        controllerId: "mode",
        kind: "controller",
        value: mode as SymbolicExpressionsMode,
      });
    }
  }
  return ui.domainState;
}

function expectedRangeAttemptCore(labId: string, scenarioId: string) {
  const control = expectedControl(labId, scenarioId);
  if (
    control.kind !== "range" ||
    !control.controlId ||
    typeof control.requested !== "number" ||
    typeof control.min !== "number" ||
    typeof control.max !== "number" ||
    control.step !== 1
  ) throw new TypeError(`${scenarioId}: missing exact range attempt contract.`);
  const expected = expectedScenario(labId, scenarioId);
  const before = expectedRangeBeforeState(labId, scenarioId);
  return {
    afterObservedValue: fieldValue(expected.observed, control.controlId),
    attemptedValue: control.requested,
    beforeObservedValue: fieldValue(before, control.controlId),
    controlId: control.controlId,
    expectedAccepted: expected.accepted,
    expectedReducerError: expected.error,
    labId,
    max: control.max,
    min: control.min,
    requestedValue: control.requested,
    step: 1 as const,
  };
}

type ExpectedSubaction = {
  kind: "primary" | "reset" | "setup" | "swipe";
  subactionId: string;
  target: string;
};

function expectedSubactions(labId: string, scenarioId: string): ExpectedSubaction[] {
  if (scenarioId === "initial") return [];
  if (scenarioId === "reset") return [{ kind: "primary", subactionId: "primary:reset", target: "reset" }];
  const finish = (primary: string, setup: ExpectedSubaction[] = []) => [
    ...setup,
    { kind: "primary" as const, subactionId: `primary:${primary}`, target: primary },
    { kind: "reset" as const, subactionId: "reset:reset", target: "reset" },
  ];
  if (scenarioId === "first") return finish(`range:${expectedControl(labId, scenarioId).controlId}:increment`);
  if (scenarioId.startsWith("mode:")) return finish(`mode:${scenarioId.slice("mode:".length)}`);
  const [, mode, controlId, endpoint] = scenarioId.split(":");
  const resetMode = topicPlan(labId).reset.controlState.mode;
  const setup = mode === resetMode
    ? []
    : [{ kind: "setup" as const, subactionId: `setup:mode:${mode}`, target: `mode:${mode}` }];
  return finish(`range:${controlId}:${endpoint}`, setup);
}

export function expectedAnalyticsEventType(
  subaction: Pick<G07AnalyticsSubaction, "kind" | "target">,
): G07AnalyticsEventType {
  if (subaction.target === "reset") return "visualization-reset";
  if (subaction.target.startsWith("range:")) return "visualization-slider";
  if (subaction.target.startsWith("mode:") || subaction.kind === "swipe") {
    return "visualization-probe";
  }
  throw new TypeError(`${subaction.target}: unsupported G07 analytics semantics.`);
}

function validateUiAudit(value: unknown, label: string) {
  exactKeys(value, ["clippedElementCount", "collisionIssueCount", "contrastCheckedTextCount", "contrastIssueCount", "horizontalOverflowPixels", "touchTargetCheckedCount", "touchTargetIssueCount", "uiScan"], label);
  const audit = value as G07UiAudit;
  assertExact(
    [audit.clippedElementCount, audit.collisionIssueCount, audit.contrastIssueCount, audit.horizontalOverflowPixels, audit.touchTargetIssueCount],
    [0, 0, 0, 0, 0],
    `${label} issue counts`,
  );
  if (audit.contrastCheckedTextCount <= 0 || audit.touchTargetCheckedCount <= 0) throw new TypeError(`${label}: hollow contrast/touch scan.`);
  exactKeys(audit.uiScan, ["candidatePairCount", "controlCount", "htmlTextCount", "paintedMarkCount", "surfaceCount", "svgTextCount"], `${label} UI scan`);
  if (Object.values(audit.uiScan).some((count) => !Number.isInteger(count) || count <= 0)) throw new TypeError(`${label}: hollow UI scan.`);
}

function validateReset(value: unknown, labId: string, label: string) {
  exactKeys(value, ["exact", "observation", "resetControlCount"], label);
  assertExact(value, { exact: true, observation: expectedScenario(labId, "reset"), resetControlCount: 1 }, label);
}

function validateVisualState(
  value: G07VisualStateReceipt,
  expectedStateId: string,
  project: G07ProductionProject,
) {
  exactKeys(value, ["axisId", "identity", "labId", "locale", "project", "reset", "resetAction", "scrollAudits", "stateId", "theme"], expectedStateId);
  const labId = G07_PRODUCTION_PLAN.labIds.find((id) => expectedStateId.startsWith(`visual:${id}:`));
  const axis = G07_PRODUCTION_PLAN.coverage.visualAxes.find(({ axisId }) => expectedStateId.endsWith(`:${axisId}:reset`));
  if (!labId || !axis) throw new TypeError(`${expectedStateId}: invalid visual state.`);
  assertExact([value.stateId, value.labId, value.axisId, value.project, value.locale, value.theme], [expectedStateId, labId, axis.axisId, project, axis.locale, axis.theme], `${expectedStateId} identity`);
  assertExact(value.identity, { activeLabId: labId, configuredModelCount: 1, genericFallbackCount: 0, playApplicable: false, renderer: "mainland-symbolic-expressions", resetControlCount: 1 }, `${expectedStateId} renderer`);
  validateReset(value.reset, labId, `${expectedStateId} reset`);
  assertExact(value.scrollAudits.map(({ scrollId }) => scrollId), SCROLL_IDS, `${expectedStateId} scroll order`);
  const [topAudit, centerAudit, bottomAudit] = value.scrollAudits;
  if (!topAudit || !centerAudit || !bottomAudit) {
    throw new TypeError(`${expectedStateId}: missing exact scroll landmarks.`);
  }
  for (const audit of value.scrollAudits) {
    exactKeys(audit, ["clippedElementCount", "collisionIssueCount", "contrastCheckedTextCount", "contrastIssueCount", "geometry", "horizontalOverflowPixels", "initialGeometry", "scrollId", "scrollMethod", "touchTargetCheckedCount", "touchTargetIssueCount", "uiScan", "verticalSwipeAttempts"], `${expectedStateId} ${audit.scrollId}`);
    exactKeys(audit.geometry, ["centerTolerancePx", "documentMaxScrollY", "rootBottom", "rootCenter", "rootDocumentBottom", "rootDocumentTop", "rootTop", "scrollY", "viewportCenter", "viewportHeight"], `${expectedStateId} ${audit.scrollId} geometry`);
    exactKeys(audit.initialGeometry, ["centerTolerancePx", "documentMaxScrollY", "rootBottom", "rootCenter", "rootDocumentBottom", "rootDocumentTop", "rootTop", "scrollY", "viewportCenter", "viewportHeight"], `${expectedStateId} ${audit.scrollId} initial geometry`);
    const geometryNumbers = Object.values(audit.geometry).filter(
      (item): item is number => typeof item === "number",
    );
    const initialGeometryNumbers = Object.values(audit.initialGeometry).filter(
      (item): item is number => typeof item === "number",
    );
    if (
      geometryNumbers.some((item) => !Number.isFinite(item)) ||
      initialGeometryNumbers.some((item) => !Number.isFinite(item)) ||
      audit.geometry.centerTolerancePx !== 40 ||
      audit.initialGeometry.centerTolerancePx !== 40 ||
      audit.geometry.documentMaxScrollY <= 0 ||
      audit.initialGeometry.documentMaxScrollY !== audit.geometry.documentMaxScrollY ||
      audit.geometry.scrollY < 0 ||
      audit.geometry.scrollY > audit.geometry.documentMaxScrollY ||
      audit.initialGeometry.scrollY < 0 ||
      audit.initialGeometry.scrollY > audit.initialGeometry.documentMaxScrollY ||
      audit.geometry.viewportHeight <= 0 ||
      audit.initialGeometry.viewportHeight !== audit.geometry.viewportHeight ||
      audit.geometry.rootBottom <= audit.geometry.rootTop ||
      audit.initialGeometry.rootBottom <= audit.initialGeometry.rootTop ||
      audit.geometry.rootDocumentBottom <= audit.geometry.rootDocumentTop ||
      audit.initialGeometry.rootDocumentBottom <= audit.initialGeometry.rootDocumentTop ||
      audit.geometry.rootCenter !== (audit.geometry.rootTop + audit.geometry.rootBottom) / 2 ||
      audit.initialGeometry.rootCenter !== (audit.initialGeometry.rootTop + audit.initialGeometry.rootBottom) / 2 ||
      audit.geometry.viewportCenter !== audit.geometry.viewportHeight / 2 ||
      audit.initialGeometry.viewportCenter !== audit.initialGeometry.viewportHeight / 2 ||
      Math.abs(audit.geometry.rootDocumentTop - (audit.geometry.rootTop + audit.geometry.scrollY)) > 1 ||
      Math.abs(audit.geometry.rootDocumentBottom - (audit.geometry.rootBottom + audit.geometry.scrollY)) > 1 ||
      Math.abs(audit.initialGeometry.rootDocumentTop - (audit.initialGeometry.rootTop + audit.initialGeometry.scrollY)) > 1 ||
      Math.abs(audit.initialGeometry.rootDocumentBottom - (audit.initialGeometry.rootBottom + audit.initialGeometry.scrollY)) > 1 ||
      Math.abs(audit.initialGeometry.rootDocumentTop - audit.geometry.rootDocumentTop) > 1 ||
      Math.abs(audit.initialGeometry.rootDocumentBottom - audit.geometry.rootDocumentBottom) > 1
    ) throw new TypeError(`${expectedStateId}: forged scroll geometry.`);
    if (
      (audit.scrollId === "page-top" && audit.geometry.scrollY > 1) ||
      (audit.scrollId === "page-bottom" && audit.geometry.scrollY < audit.geometry.documentMaxScrollY - 1) ||
      (audit.scrollId === "visualization-center" && Math.abs(audit.geometry.rootCenter - audit.geometry.viewportCenter) > audit.geometry.centerTolerancePx)
    ) throw new TypeError(`${expectedStateId}: real page scroll landmark not reached.`);
    const initiallyReached = audit.scrollId === "page-top"
      ? audit.initialGeometry.scrollY <= 1
      : audit.scrollId === "page-bottom"
        ? audit.initialGeometry.scrollY >= audit.initialGeometry.documentMaxScrollY - 1
        : Math.abs(audit.initialGeometry.rootCenter - audit.initialGeometry.viewportCenter) <= audit.initialGeometry.centerTolerancePx;
    if (project === "desktop-chrome") {
      if (
        audit.scrollMethod !== (audit.scrollId === "visualization-center" ? "locator.scrollIntoViewIfNeeded" : "page.keyboard.press") ||
        audit.verticalSwipeAttempts.length !== 0
      ) throw new TypeError(`${expectedStateId}: desktop scroll method or swipe ledger drifted.`);
    } else if (audit.scrollMethod === "already-at-landmark") {
      if (!initiallyReached || audit.verticalSwipeAttempts.length !== 0) {
        throw new TypeError(`${expectedStateId}: already-at-landmark is not supported by the inspected initial geometry.`);
      }
    } else {
      if (
        audit.scrollMethod !== "cdp:Input.dispatchTouchEvent:vertical" ||
        initiallyReached ||
        audit.verticalSwipeAttempts.length === 0
      ) throw new TypeError(`${expectedStateId}: physical vertical scroll path is absent or dishonest.`);
      audit.verticalSwipeAttempts.forEach((attempt, attemptIndex) => {
        exactKeys(attempt, ["afterGeometry", "afterScrollY", "attemptNumber", "beforeGeometry", "beforeScrollY", "direction", "method", "moveCount", "physicalInputSequence", "signedDisplacement", "targetReached"], `${expectedStateId} ${audit.scrollId} vertical swipe ${attemptIndex}`);
        for (const [geometryPhase, geometry] of [["before", attempt.beforeGeometry], ["after", attempt.afterGeometry]] as const) {
          exactKeys(geometry, ["centerTolerancePx", "documentMaxScrollY", "rootBottom", "rootCenter", "rootDocumentBottom", "rootDocumentTop", "rootTop", "scrollY", "viewportCenter", "viewportHeight"], `${expectedStateId} ${audit.scrollId} attempt ${attemptIndex} ${geometryPhase} geometry`);
          if (
            Object.values(geometry).some((item) => !Number.isFinite(item)) ||
            geometry.scrollY < 0 ||
            geometry.scrollY > geometry.documentMaxScrollY ||
            geometry.documentMaxScrollY !== audit.geometry.documentMaxScrollY ||
            geometry.viewportHeight !== audit.geometry.viewportHeight ||
            geometry.viewportCenter !== audit.geometry.viewportCenter ||
            geometry.centerTolerancePx !== audit.geometry.centerTolerancePx ||
            Math.abs(geometry.rootDocumentTop - audit.geometry.rootDocumentTop) > 1 ||
            Math.abs(geometry.rootDocumentBottom - audit.geometry.rootDocumentBottom) > 1 ||
            geometry.rootCenter !== (geometry.rootTop + geometry.rootBottom) / 2 ||
            Math.abs(geometry.rootDocumentTop - (geometry.rootTop + geometry.scrollY)) > 1 ||
            Math.abs(geometry.rootDocumentBottom - (geometry.rootBottom + geometry.scrollY)) > 1
          ) throw new TypeError(`${expectedStateId}: attempt documentMaxScrollY, viewport, or root geometry drifted.`);
        }
        const recomputedTargetReached = audit.scrollId === "page-top"
          ? attempt.afterGeometry.scrollY <= 1
          : audit.scrollId === "page-bottom"
            ? attempt.afterGeometry.scrollY >= attempt.afterGeometry.documentMaxScrollY - 1
            : Math.abs(attempt.afterGeometry.rootCenter - attempt.afterGeometry.viewportCenter) <= attempt.afterGeometry.centerTolerancePx;
        if (
          attempt.attemptNumber !== attemptIndex + 1 ||
          attempt.method !== "cdp:Input.dispatchTouchEvent:vertical" ||
          attempt.moveCount !== 4 ||
          !Number.isSafeInteger(attempt.physicalInputSequence) ||
          (attempt.direction !== "down-page" && attempt.direction !== "up-page") ||
          ![attempt.beforeScrollY, attempt.afterScrollY, attempt.signedDisplacement].every(Number.isFinite) ||
          attempt.beforeScrollY !== attempt.beforeGeometry.scrollY ||
          attempt.afterScrollY !== attempt.afterGeometry.scrollY ||
          attempt.signedDisplacement !== attempt.afterScrollY - attempt.beforeScrollY ||
          (attempt.direction === "down-page" ? attempt.signedDisplacement <= 0 : attempt.signedDisplacement >= 0) ||
          (attemptIndex > 0 && attempt.beforeScrollY !== audit.verticalSwipeAttempts[attemptIndex - 1]!.afterScrollY) ||
          attempt.targetReached !== recomputedTargetReached ||
          attempt.targetReached !== (attemptIndex === audit.verticalSwipeAttempts.length - 1)
        ) throw new TypeError(`${expectedStateId}: forged vertical physical swipe attempt or early termination drift.`);
      });
      if (audit.verticalSwipeAttempts[0]!.beforeScrollY !== audit.initialGeometry.scrollY || audit.verticalSwipeAttempts.at(-1)!.afterScrollY !== audit.geometry.scrollY) {
        throw new TypeError(`${expectedStateId}: vertical swipe geometry lacks continuity with the audit.`);
      }
    }
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
      `${expectedStateId} ${audit.scrollId}`,
    );
  }
  if (
    !(topAudit.geometry.scrollY < centerAudit.geometry.scrollY &&
      centerAudit.geometry.scrollY < bottomAudit.geometry.scrollY) ||
    value.scrollAudits.some(
      ({ geometry }) =>
        geometry.documentMaxScrollY !== topAudit.geometry.documentMaxScrollY ||
        geometry.viewportHeight !== topAudit.geometry.viewportHeight ||
        geometry.viewportCenter !== topAudit.geometry.viewportCenter ||
        geometry.centerTolerancePx !== topAudit.geometry.centerTolerancePx ||
        Math.abs(geometry.rootDocumentTop - topAudit.geometry.rootDocumentTop) > 1 ||
        Math.abs(geometry.rootDocumentBottom - topAudit.geometry.rootDocumentBottom) > 1,
    )
  ) throw new TypeError(`${expectedStateId}: scroll landmarks lack strict order or stable document-space geometry.`);
}

function validateInteractionState(
  value: G07InteractionStateReceipt,
  expectedStateId: string,
  project: G07ProductionProject,
) {
  exactKeys(value, ["action", "axisId", "control", "genericFallbackCount", "labId", "observation", "resetAfter", "scenarioId", "stateId", "uiScan"], expectedStateId);
  const axisId = expectedInteractionAxisId(project);
  const labId = G07_PRODUCTION_PLAN.labIds.find((id) => expectedStateId.startsWith(`interaction:${id}:`));
  if (!labId) throw new TypeError(`${expectedStateId}: missing G07 lab identity.`);
  const scenarioId = scenarioFromStateId(expectedStateId, labId, axisId);
  assertExact([value.stateId, value.labId, value.axisId, value.scenarioId, value.genericFallbackCount], [expectedStateId, labId, axisId, scenarioId, 0], `${expectedStateId} identity`);
  assertExact(value.control, expectedControl(labId, scenarioId), `${expectedStateId} control`);
  assertExact(value.observation, expectedScenario(labId, scenarioId), `${expectedStateId} observation`);
  validateUiAudit(value.uiScan, `${expectedStateId} UI scan`);
  exactKeys(value.action, ["actionId", "modality", "realInput", "subactions"], `${expectedStateId} action`);
  assertExact(value.action.subactions.map(({ kind, subactionId, target }) => ({ kind, subactionId, target })), expectedSubactions(labId, scenarioId), `${expectedStateId} physical subactions`);
  if (scenarioId === "initial") {
    assertExact(value.action, { actionId: expectedStateId, modality: "none", realInput: false, subactions: [] }, `${expectedStateId} initial action`);
    if (value.resetAfter !== null) throw new TypeError(`${expectedStateId}: initial reset drift.`);
  } else {
    if (value.action.actionId !== expectedStateId || value.action.realInput !== true) throw new TypeError(`${expectedStateId}: fake action.`);
    if (project === "mobile-chrome") {
      if (value.action.modality !== "touch" || value.action.subactions.some(({ method }) => method !== "page.touchscreen.tap")) throw new TypeError(`${expectedStateId}: fake touch subaction.`);
    } else if (value.action.modality !== "keyboard-mouse" || value.action.subactions.some(({ method }) => !/(page\.mouse\.click|locator\.press)/u.test(method))) {
      throw new TypeError(`${expectedStateId}: desktop subaction is not physical mouse/keyboard input.`);
    }
    if (scenarioId === "reset") {
      if (value.resetAfter !== null) throw new TypeError(`${expectedStateId}: duplicate reset receipt.`);
    } else validateReset(value.resetAfter, labId, `${expectedStateId} reset-after`);
  }
}

function deliveryEvent(delivery: G07RawAnalyticsDelivery) {
  return delivery.parsedRequestBody.events[0];
}

function validateDelivery(
  delivery: G07RawAnalyticsDelivery,
  subaction: G07AnalyticsSubaction,
  labId: string,
  userId: string,
) {
  exactKeys(delivery, ["captureSequence", "deliveryId", "ownerHeader", "ownerUserId", "parsedRequestBody", "parsedResponseBody", "rawRequestBody", "rawResponseBody", "responseBodyReady", "responseStatus", "serializedRequestBody", "serializedResponseBody", "temporal"], `${subaction.subactionId} raw delivery`);
  if (delivery.deliveryId !== subaction.deliveryId || delivery.ownerUserId !== userId || delivery.ownerHeader !== "x-mais-analytics-user-id" || delivery.responseStatus !== 200 || delivery.responseBodyReady !== true) throw new TypeError(`${subaction.subactionId}: analytics delivery owner/ACK/body-ready mismatch.`);
  if (delivery.rawRequestBody !== delivery.serializedRequestBody || delivery.rawResponseBody !== delivery.serializedResponseBody) throw new TypeError(`${subaction.subactionId}: exact captured analytics bytes drifted.`);
  assertExact(parseJsonBytes(delivery.rawRequestBody, `${subaction.subactionId} request`), delivery.parsedRequestBody, `${subaction.subactionId} raw/parsed request semantics`);
  assertExact(parseJsonBytes(delivery.rawResponseBody, `${subaction.subactionId} response`), delivery.parsedResponseBody, `${subaction.subactionId} raw/parsed response semantics`);
  exactKeys(delivery.parsedRequestBody, ["events", "generation"], `${subaction.subactionId} request`);
  if (!Number.isSafeInteger(delivery.parsedRequestBody.generation) || delivery.parsedRequestBody.events.length !== 1) throw new TypeError(`${subaction.subactionId}: malformed or surplus analytics events.`);
  const event = deliveryEvent(delivery);
  exactKeys(event, ["grade", "id", "source", "timestamp", "topicId", "type"], `${subaction.subactionId} event`);
  const catalog = getVisualizationLabByLabId(labId);
  if (!catalog || event.id !== subaction.eventId || event.topicId !== labId || event.source !== catalog.analyticsSource || event.grade !== catalog.grade || event.type !== expectedAnalyticsEventType(subaction)) throw new TypeError(`${subaction.subactionId}: other-lab or malformed analytics event; event type is unsupported or semantically wrong.`);
  assertExact(delivery.parsedResponseBody, { acknowledgedEventIds: [event.id] }, `${subaction.subactionId} ACK`);
  exactKeys(delivery.temporal, ["actionSettledAt", "actionSettledMonotonicMs", "actionStartedAt", "actionStartedMonotonicMs", "clockOriginEpochMs", "postActionQuiet", "preActionQuiet", "quietIntervalMs", "requestObservedAt", "requestObservedMonotonicMs", "toleranceMs"], `${subaction.subactionId} temporal`);
  const startedAt = Date.parse(delivery.temporal.actionStartedAt);
  const settledAt = Date.parse(delivery.temporal.actionSettledAt);
  const requestAt = Date.parse(delivery.temporal.requestObservedAt);
  const eventAt = Date.parse(event.timestamp);
  if (
    ![startedAt, settledAt, requestAt, eventAt].every(Number.isFinite) ||
    !Number.isFinite(delivery.temporal.clockOriginEpochMs) ||
    delivery.temporal.preActionQuiet !== true ||
    delivery.temporal.postActionQuiet !== true ||
    delivery.temporal.quietIntervalMs !== QUIET_INTERVAL_MS ||
    delivery.temporal.toleranceMs !== EVENT_TIMESTAMP_TOLERANCE_MS ||
    delivery.temporal.actionStartedMonotonicMs > delivery.temporal.requestObservedMonotonicMs ||
    delivery.temporal.requestObservedMonotonicMs > delivery.temporal.actionSettledMonotonicMs ||
    requestAt < startedAt || requestAt > settledAt ||
    Math.abs(startedAt - (delivery.temporal.clockOriginEpochMs + delivery.temporal.actionStartedMonotonicMs)) > 1 ||
    Math.abs(requestAt - (delivery.temporal.clockOriginEpochMs + delivery.temporal.requestObservedMonotonicMs)) > 1 ||
    Math.abs(settledAt - (delivery.temporal.clockOriginEpochMs + delivery.temporal.actionSettledMonotonicMs)) > 1 ||
    Math.abs(requestAt - eventAt) > EVENT_TIMESTAMP_TOLERANCE_MS
  ) throw new TypeError(`${subaction.subactionId}: event is delayed, stale, reused, or outside its exact physical subaction window.`);
}

function sessionSnapshot(labId: string): SessionSnapshot {
  const catalog = getVisualizationLabByLabId(labId);
  if (!catalog) throw new TypeError(`${labId}: missing G07 session catalog row.`);
  return {
    completedAt: null,
    explored: true,
    moduleId: "configured-visualization-lab",
    source: catalog.analyticsSource,
    topicId: labId,
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

function expectedSessionSet(targetLabId: string, userId: string, target: boolean, present: boolean): SessionSet {
  const labIds = target ? [targetLabId] : G07_PRODUCTION_PLAN.labIds.filter((labId) => labId !== targetLabId);
  return { count: present ? labIds.length : 0, sessions: present ? labIds.map(sessionSnapshot) : [], userId };
}

function expectedCheckpointIds(project: G07ProductionProject) {
  return [
    "post-registration",
    "after-sibling-seed",
    "after-first",
    "after-reset",
    "after-second",
    "after-reload",
    ...expectedVisualAxisIds(project).map((axisId) => `after-visual:${axisId}`),
    "final",
  ];
}

function validateSessionSnapshot(value: unknown, expectedLabId: string, label: string) {
  exactKeys(value, ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"], label);
  const session = value as SessionSnapshot;
  const catalog = getVisualizationLabByLabId(expectedLabId);
  if (
    !catalog ||
    session.topicId !== expectedLabId ||
    session.moduleId !== "configured-visualization-lab" ||
    session.explored !== true ||
    session.source !== catalog.analyticsSource ||
    !Number.isFinite(Date.parse(session.updatedAt)) ||
    (session.completedAt !== null && !Number.isFinite(Date.parse(session.completedAt)))
  ) throw new TypeError(`${label}: forged or surplus non-G07 raw session.`);
}

function projectedSessionSet(
  fullRecords: SessionSnapshot[],
  targetLabId: string,
  userId: string,
  target: boolean,
): SessionSet {
  const sessions = fullRecords.filter(({ topicId }) =>
    target ? topicId === targetLabId : topicId !== targetLabId,
  );
  return { count: sessions.length, sessions, userId };
}

function validateRawSessionCheckpointChain(
  chain: G07RawSessionCheckpoint[],
  labId: string,
  userId: string,
  project: G07ProductionProject,
) {
  assertExact(chain.map(({ checkpointId }) => checkpointId), expectedCheckpointIds(project), `${labId} raw session checkpoint chain`);
  const siblingLabIds = G07_PRODUCTION_PLAN.labIds.filter((candidate) => candidate !== labId);
  const fullLabIds = [...siblingLabIds, labId];
  let priorMonotonic = -Infinity;
  for (const [index, checkpoint] of chain.entries()) {
    exactKeys(checkpoint, ["capturedAt", "capturedMonotonicMs", "checkpointId", "clockOriginEpochMs", "followingAnalyticsCaptureSequence", "fullRecords", "parsedResponseBody", "precedingAnalyticsCaptureSequence", "projections", "rawResponseBody"], `${labId} ${checkpoint.checkpointId}`);
    const expectedLabIds = index === 0 ? [] : index === 1 ? siblingLabIds : fullLabIds;
    if (
      !Number.isFinite(checkpoint.capturedMonotonicMs) ||
      checkpoint.capturedMonotonicMs <= priorMonotonic ||
      !Number.isFinite(checkpoint.clockOriginEpochMs) ||
      !Number.isFinite(Date.parse(checkpoint.capturedAt)) ||
      Math.abs(Date.parse(checkpoint.capturedAt) - (checkpoint.clockOriginEpochMs + checkpoint.capturedMonotonicMs)) > 1
    ) throw new TypeError(`${labId}: raw session checkpoints are not one ordered wall/monotonic chain.`);
    priorMonotonic = checkpoint.capturedMonotonicMs;
    exactKeys(checkpoint.parsedResponseBody, ["sessions"], `${labId} ${checkpoint.checkpointId} parsed response`);
    assertExact(parseJsonBytes(checkpoint.rawResponseBody, `${labId} ${checkpoint.checkpointId}`), checkpoint.parsedResponseBody, `${labId} raw checkpoint bytes`);
    assertExact(checkpoint.parsedResponseBody.sessions, checkpoint.fullRecords, `${labId} raw checkpoint bytes or full records drifted`);
    assertExact(checkpoint.fullRecords.map(({ topicId }) => topicId), expectedLabIds, `${labId} raw checkpoint ordered topics`);
    checkpoint.fullRecords.forEach((session, sessionIndex) =>
      validateSessionSnapshot(session, expectedLabIds[sessionIndex]!, `${labId} ${checkpoint.checkpointId} record ${sessionIndex}`),
    );
    exactKeys(checkpoint.projections, ["siblings", "target"], `${labId} ${checkpoint.checkpointId} projections`);
    assertExact(checkpoint.projections, {
      siblings: projectedSessionSet(checkpoint.fullRecords, labId, userId, false),
      target: projectedSessionSet(checkpoint.fullRecords, labId, userId, true),
    }, `${labId} checkpoint projections derived exact`);
  }
  const siblingBaseline = chain[1]!.fullRecords;
  for (const checkpoint of chain.slice(2)) {
    assertExact(checkpoint.fullRecords.slice(0, -1), siblingBaseline, `${labId} raw sibling records stable`);
  }
  const firstStable = chain[2]!;
  for (const checkpoint of chain.slice(3)) {
    if (checkpoint.rawResponseBody !== firstStable.rawResponseBody) {
      throw new TypeError(`${labId}: raw checkpoint bytes or full records drifted.`);
    }
    assertExact(checkpoint.fullRecords, firstStable.fullRecords, `${labId} raw checkpoint bytes or full records drifted`);
  }
}

function validateDurability(
  receipt: G07ProductionBrowserPayload["durabilityReceipts"][number],
  project: G07ProductionProject,
) {
  exactKeys(receipt, ["final", "interactionSurfaceEvidence", "labId", "phaseBoundary", "rawSessionCheckpointChain", "sessionId", "stages", "userId"], `${receipt.labId} durability`);
  if (!G07_PRODUCTION_PLAN.labIds.includes(receipt.labId as never) || !receipt.sessionId || !receipt.userId) throw new TypeError(`${receipt.labId}: invalid durability identity.`);
  exactKeys(receipt.interactionSurfaceEvidence, ["afterReload", "beforeInitial"], `${receipt.labId} interaction surface evidence`);
  const expectedSurface = expectedInteractionSurface(project);
  for (const [stage, observation] of Object.entries(receipt.interactionSurfaceEvidence)) {
    exactKeys(observation, ["htmlLang", "locale", "theme"], `${receipt.labId} ${stage} interaction surface`);
    assertExact(observation, expectedSurface, `${receipt.labId} ${stage} interaction surface`);
  }
  validateRawSessionCheckpointChain(receipt.rawSessionCheckpointChain, receipt.labId, receipt.userId, project);
  assertExact(receipt.stages.map(({ stage }) => stage), ["mount", "first", "reset", "second", "reload", "final"], `${receipt.labId} durability stage order`);
  const baselineSiblings = receipt.stages[0]?.siblings;
  if (!baselineSiblings) throw new TypeError(`${receipt.labId}: sibling baseline is absent.`);
  const expectedSiblingIds = G07_PRODUCTION_PLAN.labIds.filter(
    (labId) => labId !== receipt.labId,
  );
  let firstTarget: SessionSet | null = null;
  receipt.stages.forEach((stage, index) => {
    exactKeys(stage, ["acknowledgementStatus", "postCount", "siblings", "stage", "target"], `${receipt.labId} ${stage.stage}`);
    assertExact(stage.siblings, baselineSiblings, `${receipt.labId} ${stage.stage} six siblings`);
    for (const [kind, set, expectedLabIds] of [
      ["target", stage.target, index === 0 ? [] : [receipt.labId]],
      ["siblings", stage.siblings, expectedSiblingIds],
    ] as const) {
      exactKeys(set, ["count", "sessions", "userId"], `${receipt.labId} ${stage.stage} ${kind}`);
      if (set.userId !== receipt.userId || set.count !== set.sessions.length) {
        throw new TypeError(`${receipt.labId}: ${stage.stage} is not exact same-user durability evidence.`);
      }
      assertExact(set.sessions.map(({ topicId }) => topicId), expectedLabIds, `${receipt.labId} ${stage.stage} ${kind} topics`);
      for (const session of set.sessions) {
        exactKeys(session, ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"], `${receipt.labId} ${stage.stage} ${kind} session`);
        const catalog = getVisualizationLabByLabId(session.topicId);
        if (!catalog || session.moduleId !== "configured-visualization-lab" || session.explored !== true || session.source !== catalog.analyticsSource || !Number.isFinite(Date.parse(session.updatedAt)) || (session.completedAt !== null && !Number.isFinite(Date.parse(session.completedAt)))) {
          throw new TypeError(`${receipt.labId}: ${stage.stage} forged ${kind} session.`);
        }
      }
    }
    if (index === 1) firstTarget = stage.target;
    if (index > 1) assertExact(stage.target, firstTarget, `${receipt.labId} ${stage.stage} stable target`);
    assertExact([stage.postCount, stage.acknowledgementStatus], index === 1 ? [1, 200] : [0, null], `${receipt.labId} ${stage.stage} session POST`);
  });
  assertExact(receipt.final, { exactlyOnce: true, noSiblingMutation: true, sameUser: true, serverBacked: true, survivedReload: true }, `${receipt.labId} durability final`);
}

export function sealG07ProductionBrowserPayload(
  payload: G07ProductionBrowserPayload,
): G07ProductionBrowserReceipt {
  const owned = structuredClone(payload);
  return { payload: owned, payloadSha256: g07ProductionReceiptSha256(owned) };
}

export function validateG07UntrustedStructuralReceipt(
  candidate: unknown,
  project: G07ProductionProject,
): candidate is G07ProductionBrowserReceipt {
  exactKeys(candidate, ["payload", "payloadSha256"], "G07 receipt envelope");
  const envelope = candidate as G07ProductionBrowserReceipt;
  if (envelope.payloadSha256 !== g07ProductionReceiptSha256(envelope.payload)) throw new TypeError("G07 payload SHA-256 mismatch.");
  const payload = envelope.payload;
  if (G07_PRODUCTION_PLAN.canonicalSha256 !== G07_APPROVED_PLAN_CANONICAL_SHA256) {
    throw new TypeError("G07 approved production plan canonical SHA-256 drifted.");
  }
  exactKeys(payload, ["analyticsLedger", "diagnostics", "durabilityReceipts", "execution", "fullVisualInteractionCartesian", "groupId", "interactionAxisId", "interactionStates", "labIds", "planCanonicalSha256", "playApplicable", "project", "runnerInvocation", "schemaVersion", "sourceEvidence", "touchEvidence", "visualAxisIds", "visualStates"], "G07 payload");
  assertExact([payload.schemaVersion, payload.groupId, payload.project, payload.planCanonicalSha256, payload.playApplicable, payload.fullVisualInteractionCartesian], ["china-mainland-g07-production-browser-receipt.v1", "G07", project, G07_APPROVED_PLAN_CANONICAL_SHA256, false, false], "G07 receipt header");
  assertExact(payload.labIds, G07_PRODUCTION_PLAN.labIds, "G07 lab order");
  assertExact(payload.visualAxisIds, expectedVisualAxisIds(project), "G07 visual axes");
  assertExact(payload.interactionAxisId, expectedInteractionAxisId(project), "G07 interaction axis");
  const visualIds = expectedVisualStateIds(project);
  const interactionIds = expectedInteractionStateIds(project);
  assertExact(payload.visualStates.map(({ stateId }) => stateId), visualIds, "G07 visual state IDs");
  assertExact(payload.interactionStates.map(({ stateId }) => stateId), interactionIds, "G07 interaction state IDs");
  payload.visualStates.forEach((value, index) => validateVisualState(value, visualIds[index]!, project));
  payload.interactionStates.forEach((value, index) => validateInteractionState(value, interactionIds[index]!, project));

  exactKeys(payload.touchEvidence, ["directionalSwipes", "hasTouch", "physicalInputLedger", "rangeTouchAttempts", "realSwipeCount", "realTapCount", "setupTransitions", "swipeMoveCount", "swipeProtocol"], "G07 touch evidence");
  const swipeSubactions: Array<{ labId: string; subaction: G07AnalyticsSubaction }> = [];
  if (project === "mobile-chrome") {
    if (payload.touchEvidence.hasTouch !== true || payload.touchEvidence.realSwipeCount < 3 || payload.touchEvidence.swipeMoveCount < 12 || payload.touchEvidence.swipeProtocol !== "cdp:Input.dispatchTouchEvent") throw new TypeError("G07 mobile receipt lacks exact real touch evidence.");
    assertExact(payload.touchEvidence.directionalSwipes.map(({ direction }) => direction), ["toward-end", "toward-start"], "G07 two-way swipe order");
    const [towardEnd, towardStart] = payload.touchEvidence.directionalSwipes;
    if (!towardEnd || !towardStart) throw new TypeError("G07 two-way swipe evidence is absent.");
    for (const swipe of payload.touchEvidence.directionalSwipes) {
      exactKeys(swipe, ["afterScrollLeft", "analytics", "beforeScrollLeft", "clientWidth", "direction", "labId", "moveCount", "protocol", "scrollerId", "scrollWidth", "signedDisplacement"], `G07 ${swipe.direction} swipe`);
      exactKeys(swipe.analytics, ["deliveryId", "eventId", "kind", "method", "subactionId", "target"], `G07 ${swipe.direction} swipe analytics`);
      assertExact(
        { kind: swipe.analytics.kind, method: swipe.analytics.method, subactionId: swipe.analytics.subactionId, target: swipe.analytics.target },
        { kind: "swipe", method: "cdp:Input.dispatchTouchEvent", subactionId: `swipe:${swipe.direction}`, target: `local-scroll:${swipe.direction}` },
        `G07 ${swipe.direction} physical swipe analytics`,
      );
      if (swipe.protocol !== "cdp:Input.dispatchTouchEvent" || swipe.moveCount !== 4 || swipe.scrollerId !== "horizontal" || swipe.labId !== G07_PRODUCTION_PLAN.labIds[0] || swipe.scrollWidth <= swipe.clientWidth || swipe.signedDisplacement !== swipe.afterScrollLeft - swipe.beforeScrollLeft || (swipe.direction === "toward-end" ? swipe.signedDisplacement <= 0 : swipe.signedDisplacement >= 0)) throw new TypeError(`G07 ${swipe.direction}: fake local-scroll geometry or identity.`);
      swipeSubactions.push({ labId: swipe.labId, subaction: swipe.analytics });
    }
    if (
      towardEnd.labId !== towardStart.labId ||
      towardEnd.scrollerId !== towardStart.scrollerId ||
      towardEnd.clientWidth !== towardStart.clientWidth ||
      towardEnd.scrollWidth !== towardStart.scrollWidth ||
      towardStart.beforeScrollLeft !== towardEnd.afterScrollLeft ||
      towardStart.afterScrollLeft !== towardEnd.beforeScrollLeft ||
      towardStart.signedDisplacement !== -towardEnd.signedDisplacement
    ) throw new TypeError("G07 swipes do not prove same-scroller continuity, opposite displacement, and exact return.");
  } else {
    assertExact(payload.touchEvidence, {
      directionalSwipes: [],
      hasTouch: false,
      physicalInputLedger: { analyticsBoundEntrySequences: [], entries: [], orderedStepProjection: [], totals: physicalInputTotals([]) },
      rangeTouchAttempts: [],
      realSwipeCount: 0,
      realTapCount: 0,
      setupTransitions: [],
      swipeMoveCount: 0,
      swipeProtocol: "none",
    }, "G07 desktop touch evidence");
  }

  const interactionSubactions = payload.interactionStates.flatMap(({ action }) =>
    action.subactions.map((subaction) => ({
      labId: action.actionId.split(":")[1]!,
      subaction,
    })),
  );
  const visualSubactions = payload.visualStates.map(({ labId, resetAction }) => ({
    labId,
    subaction: resetAction,
  }));
  const subactions = [...interactionSubactions, ...visualSubactions, ...swipeSubactions];
  const rangeSubactions = payload.interactionStates.flatMap((state) =>
    state.action.subactions
      .filter(({ target }) => target.startsWith("range:"))
      .map((subaction) => ({ state, subaction })),
  );
  if (project === "mobile-chrome") {
    if (payload.touchEvidence.rangeTouchAttempts.length !== rangeSubactions.length) {
      throw new TypeError("G07 bounded real-touch attempt ledger is missing or surplus.");
    }
    payload.touchEvidence.rangeTouchAttempts.forEach((attempt, index) => {
      exactKeys(attempt, ["afterObservedValue", "attemptNumber", "attemptedValue", "beforeObservedValue", "controlId", "deliveryId", "eventId", "expectedAccepted", "expectedReducerError", "labId", "max", "maxAttempts", "min", "physicalInputSequence", "requestedValue", "stateId", "step", "targetRect", "touchX", "touchY", "trackEndX", "trackStartX", "viewportHeight", "viewportWidth"], `G07 range touch attempt ${index}`);
      exactKeys(attempt.targetRect, ["height", "width", "x", "y"], `G07 range touch attempt ${index} target rect`);
      const linked = rangeSubactions[index];
      if (!linked) throw new TypeError("G07 bounded real-touch attempt ledger has no physical subaction.");
      const expected = expectedRangeAttemptCore(linked.state.labId, linked.state.scenarioId);
      assertExact(attempt, {
        ...expected,
        attemptNumber: 1,
        deliveryId: linked.subaction.deliveryId,
        eventId: linked.subaction.eventId,
        maxAttempts: 1,
        physicalInputSequence: attempt.physicalInputSequence,
        stateId: linked.state.stateId,
        targetRect: attempt.targetRect,
        touchX: attempt.touchX,
        touchY: attempt.touchY,
        trackEndX: attempt.trackEndX,
        trackStartX: attempt.trackStartX,
        viewportHeight: attempt.viewportHeight,
        viewportWidth: attempt.viewportWidth,
      }, `G07 ${linked.state.stateId} bounded real-touch attempt ledger`);
      const physicalInput = payload.touchEvidence.physicalInputLedger.entries[
        attempt.physicalInputSequence
      ];
      const tap = physicalInput?.tapEvidence;
      const thumb = Math.min(10, attempt.targetRect.width / 20);
      if (
        !physicalInput ||
        physicalInput.category !== "range-calibration" ||
        physicalInput.analyticsBound !== true ||
        physicalInput.deliveryId !== attempt.deliveryId ||
        physicalInput.eventId !== attempt.eventId ||
        physicalInput.labId !== attempt.labId ||
        physicalInput.stateId !== attempt.stateId ||
        physicalInput.targetIdentity !== linked.subaction.target ||
        !tap ||
        tap.x !== attempt.touchX ||
        tap.y !== attempt.touchY ||
        canonicalJson(tap.targetRect) !== canonicalJson(attempt.targetRect) ||
        tap.viewportHeight !== attempt.viewportHeight ||
        tap.viewportWidth !== attempt.viewportWidth ||
        attempt.trackStartX !== attempt.targetRect.x + thumb ||
        attempt.trackEndX !== attempt.targetRect.x + attempt.targetRect.width - thumb
      ) throw new TypeError(`${attempt.stateId}: range attempt and physical tap geometry/analytics binding drifted.`);
      const ratio = (attempt.touchX - attempt.trackStartX) /
        (attempt.trackEndX - attempt.trackStartX);
      const quantizedAttemptedValue = attempt.min +
        Math.round((ratio * (attempt.max - attempt.min)) / attempt.step) * attempt.step;
      if (
        ![attempt.touchX, attempt.trackEndX, attempt.trackStartX].every(Number.isFinite) ||
        attempt.trackEndX <= attempt.trackStartX ||
        attempt.touchX < attempt.trackStartX ||
        attempt.touchX > attempt.trackEndX ||
        quantizedAttemptedValue !== attempt.attemptedValue ||
        attempt.attemptedValue !== attempt.requestedValue
      ) {
        throw new TypeError(`${attempt.stateId}: real-touch attempt did not target the exact requested value.`);
      }
      if (attempt.expectedAccepted) {
        if (attempt.expectedReducerError !== null || attempt.afterObservedValue !== attempt.requestedValue) {
          throw new TypeError(`${attempt.stateId}: accepted real touch lacks the exact live value.`);
        }
      } else if (
        attempt.expectedReducerError === null ||
        attempt.afterObservedValue !== attempt.beforeObservedValue
      ) {
        throw new TypeError(`${attempt.stateId}: unchanged observed input after rejected real-touch attempt is absent.`);
      }
    });
    if (!payload.touchEvidence.rangeTouchAttempts.some(({ expectedAccepted }) => !expectedAccepted)) {
      throw new TypeError("G07 mobile receipt lacks a rejected reducer endpoint touch.");
    }
  }
  const exactRuntimeSubactions = G07_PRODUCTION_PLAN.labIds.flatMap((labId) => {
    const labInteractions = interactionSubactions.filter((item) => item.labId === labId);
    const labVisuals = visualSubactions.filter((item) => item.labId === labId);
    return labVisuals.flatMap((item, index) => [
      ...(index === 0 ? labInteractions : []),
      item,
      ...(project === "mobile-chrome" && labId === G07_PRODUCTION_PLAN.labIds[0] && index === 0
        ? swipeSubactions
        : []),
    ]);
  });
  if (project === "mobile-chrome") {
    const ledger = payload.touchEvidence.physicalInputLedger;
    const runtimeSubactionByDeliveryId = new Map(
      exactRuntimeSubactions.map(({ subaction }) => [subaction.deliveryId, subaction]),
    );
    exactKeys(ledger, ["analyticsBoundEntrySequences", "entries", "orderedStepProjection", "totals"], "G07 project physical input ledger");
    exactKeys(ledger.totals, ["byCategory", "moves", "swipes", "taps"], "G07 project physical input totals");
    exactKeys(ledger.totals.byCategory, PHYSICAL_INPUT_CATEGORIES, "G07 project physical input category totals");
    assertExact(ledger.entries.map(({ sequence }) => sequence), Array.from({ length: ledger.entries.length }, (_, index) => index), "G07 project physical input sequence");
    for (const entry of ledger.entries) {
      exactKeys(entry, ["analyticsBound", "category", "deliveryId", "direction", "eventId", "kind", "labId", "method", "moveCount", "sequence", "setupPhaseId", "stateId", "tapEvidence", "targetIdentity"], `G07 physical input ${entry.sequence}`);
      if (
        !PHYSICAL_INPUT_CATEGORIES.includes(entry.category) ||
        !entry.targetIdentity ||
        (entry.kind === "tap" && (entry.method !== "page.touchscreen.tap" || entry.moveCount !== 0 || entry.direction !== null || entry.tapEvidence === null)) ||
        (entry.kind === "swipe" && (entry.method !== "cdp:Input.dispatchTouchEvent" || entry.moveCount !== 4 || entry.direction === null || entry.tapEvidence !== null))
      ) throw new TypeError(`G07 physical input ${entry.sequence} has fake touch method/category/move evidence.`);
      if (entry.tapEvidence !== null) {
        const tap = entry.tapEvidence;
        exactKeys(tap, ["boxCapturedAfterScrollIntoView", "hitAncestorFingerprints", "hitAncestorIdentities", "hitTargetFingerprint", "hitTestMatched", "hitTestMethod", "rawHitFingerprint", "rawHitIdentity", "targetFingerprint", "targetIdentity", "targetIsHit", "targetRect", "viewportHeight", "viewportWidth", "x", "y"], `G07 physical tap ${entry.sequence}`);
        exactKeys(tap.targetRect, ["height", "width", "x", "y"], `G07 physical tap ${entry.sequence} target rect`);
        validateG07DomElementIdentity(tap.rawHitIdentity, `G07 physical tap ${entry.sequence} raw hit identity`);
        validateG07DomElementIdentity(tap.targetIdentity, `G07 physical tap ${entry.sequence} target identity`);
        tap.hitAncestorIdentities.forEach((identity, identityIndex) =>
          validateG07DomElementIdentity(identity, `G07 physical tap ${entry.sequence} ancestry identity ${identityIndex}`),
        );
        const recomputedAncestorFingerprints = tap.hitAncestorIdentities.map(g07DomIdentityFingerprint);
        const expectedPlanTarget = entry.analyticsBound
          ? runtimeSubactionByDeliveryId.get(entry.deliveryId ?? "")?.target
          : entry.category;
        if (!expectedPlanTarget) {
          throw new TypeError(`G07 physical input ${entry.sequence} has no plan-derived target.`);
        }
        validateExpectedPhysicalTargetIdentity(
          entry,
          ledger.orderedStepProjection[entry.sequence],
          expectedPlanTarget,
          payload.touchEvidence.setupTransitions.find(({ phaseId }) => phaseId === entry.setupPhaseId),
          tap.targetIdentity,
        );
        if (
          tap.boxCapturedAfterScrollIntoView !== true ||
          tap.hitTestMatched !== true ||
          tap.hitTestMethod !== "document.elementFromPoint" ||
          tap.rawHitFingerprint !== g07DomIdentityFingerprint(tap.rawHitIdentity) ||
          tap.targetFingerprint !== g07DomIdentityFingerprint(tap.targetIdentity) ||
          tap.hitAncestorIdentities.length === 0 ||
          canonicalJson(tap.hitAncestorFingerprints) !== canonicalJson(recomputedAncestorFingerprints) ||
          canonicalJson(tap.hitAncestorIdentities[0]) !== canonicalJson(tap.rawHitIdentity) ||
          canonicalJson(tap.hitAncestorIdentities.at(-1)) !== canonicalJson(tap.targetIdentity) ||
          tap.hitAncestorFingerprints[0] !== tap.rawHitFingerprint ||
          tap.hitAncestorFingerprints.at(-1) !== tap.targetFingerprint ||
          tap.hitTargetFingerprint !== tap.hitAncestorFingerprints.at(-1) ||
          tap.targetIsHit !== (tap.hitAncestorFingerprints.length === 1) ||
          new Set(tap.hitAncestorFingerprints).size !== tap.hitAncestorFingerprints.length ||
          tap.hitAncestorFingerprints.some((fingerprint) => !fingerprint) ||
          ![tap.x, tap.y, tap.viewportWidth, tap.viewportHeight, tap.targetRect.x, tap.targetRect.y, tap.targetRect.width, tap.targetRect.height].every(Number.isFinite) ||
          tap.viewportWidth <= 0 || tap.viewportHeight <= 0 ||
          tap.targetRect.width <= 0 || tap.targetRect.height <= 0 ||
          tap.x < 0 || tap.x >= tap.viewportWidth || tap.y < 0 || tap.y >= tap.viewportHeight ||
          tap.x < tap.targetRect.x || tap.x >= tap.targetRect.x + tap.targetRect.width ||
          tap.y < tap.targetRect.y || tap.y >= tap.targetRect.y + tap.targetRect.height
        ) throw new TypeError(`G07 physical tap ${entry.sequence} lacks viewport/target-rect/elementFromPoint proof.`);
      }
      if (entry.analyticsBound) {
        if (!entry.deliveryId || !entry.eventId || !entry.labId || !entry.stateId || entry.setupPhaseId !== null || !["horizontal-scroll", "mode", "range-calibration", "reset"].includes(entry.category)) {
          throw new TypeError(`G07 physical input ${entry.sequence} has an incomplete analytics binding.`);
        }
      } else if (
        entry.deliveryId !== null ||
        entry.eventId !== null ||
        !["locale-menu-open", "locale-menu-restore", "locale-option", "locale-selector", "theme-toggle", "vertical-scroll"].includes(entry.category)
      ) {
        throw new TypeError(`G07 physical input ${entry.sequence} falsely binds UI/scroll input to analytics.`);
      }
    }
    const totals = physicalInputTotals(ledger.entries);
    assertExact(ledger.totals, totals, "G07 project physical input totals derived exact");
    assertExact(
      ledger.analyticsBoundEntrySequences,
      ledger.entries.filter(({ analyticsBound }) => analyticsBound).map(({ sequence }) => sequence),
      "G07 analytics-bound physical input subset",
    );
    const analyticsBoundEntries = ledger.entries.filter(({ analyticsBound }) => analyticsBound);
    assertExact(
      analyticsBoundEntries.map(({ deliveryId }) => deliveryId),
      exactRuntimeSubactions.map(({ subaction }) => subaction.deliveryId),
      "G07 analytics-bound physical input order",
    );
    assertExact(
      analyticsBoundEntries.map(({ eventId }) => eventId),
      exactRuntimeSubactions.map(({ subaction }) => subaction.eventId),
      "G07 analytics-bound physical event order",
    );
    exactRuntimeSubactions.forEach(({ labId, subaction }, index) => {
      const entry = analyticsBoundEntries[index]!;
      if (
        entry.labId !== labId ||
        entry.category !== physicalCategoryForSubaction(subaction) ||
        entry.kind !== (subaction.kind === "swipe" ? "swipe" : "tap") ||
        entry.targetIdentity !== subaction.target
      ) throw new TypeError(`${subaction.subactionId}: physical input and analytics semantics drifted.`);
    });
    const expectedSetupPhases = expectedSetupPhaseSpecs(project);
    assertExact(
      payload.touchEvidence.setupTransitions.map(({ phaseId }) => phaseId),
      expectedSetupPhases.map(({ phaseId }) => phaseId),
      "G07 exact locale/theme setup phase order",
    );
    let priorSetupAfter: G07InteractionSurfaceObservation | null = null;
    const setupEntrySequences: number[] = [];
    payload.touchEvidence.setupTransitions.forEach((transition, index) => {
      exactKeys(transition, ["after", "before", "labId", "menu", "phaseId", "physicalInputSequences", "requested", "requiredCategories", "stateId"], `G07 setup transition ${transition.phaseId}`);
      exactKeys(transition.before, ["htmlLang", "locale", "theme"], `${transition.phaseId} setup before`);
      exactKeys(transition.after, ["htmlLang", "locale", "theme"], `${transition.phaseId} setup after`);
      exactKeys(transition.requested, ["locale", "theme"], `${transition.phaseId} setup requested`);
      exactKeys(transition.menu, ["afterOpen", "afterRestore", "before", "openRequired", "restoreRequired"], `${transition.phaseId} setup menu`);
      const validateMenuObservation = (observation: G07MobileMenuObservation, label: string) => {
        exactKeys(observation, ["localeSelectorActionable", "panelVisible", "themeToggleActionable", "triggerAriaExpanded", "triggerVisible"], label);
        if (observation.triggerAriaExpanded !== observation.panelVisible) {
          throw new TypeError(`${transition.phaseId}: menu aria-expanded and actual panel visibility drifted.`);
        }
      };
      validateMenuObservation(transition.menu.before, `${transition.phaseId} menu before`);
      validateMenuObservation(transition.menu.afterRestore, `${transition.phaseId} menu after restore`);
      if (transition.menu.afterOpen !== null) {
        validateMenuObservation(transition.menu.afterOpen, `${transition.phaseId} menu after open`);
      }
      const expectedPhase = expectedSetupPhases[index]!;
      if (
        transition.labId !== expectedPhase.labId ||
        transition.stateId !== expectedPhase.stateId ||
        transition.phaseId !== expectedPhase.phaseId ||
        transition.requested.locale !== expectedPhase.locale ||
        transition.requested.theme !== expectedPhase.theme ||
        transition.after.locale !== transition.requested.locale ||
        transition.after.theme !== transition.requested.theme ||
        transition.after.htmlLang !== (transition.requested.locale === "zh" ? "zh-Hant" : transition.requested.locale) ||
        (priorSetupAfter !== null && canonicalJson(transition.before) !== canonicalJson(priorSetupAfter))
      ) throw new TypeError(`${transition.phaseId}: locale/theme setup before/after identity or continuity drifted.`);
      const expectedCategories = deriveG07RequiredSetupCategories(
        transition.menu.before,
        transition.before,
        transition.requested,
      );
      const openRequired = expectedCategories.includes("locale-menu-open");
      if (
        transition.menu.openRequired !== openRequired ||
        transition.menu.restoreRequired !== openRequired ||
        canonicalJson(transition.menu.afterRestore) !== canonicalJson(transition.menu.before) ||
        (openRequired && (
          !transition.menu.before.triggerVisible ||
          transition.menu.before.triggerAriaExpanded ||
          transition.menu.before.panelVisible ||
          transition.menu.afterOpen === null ||
          !transition.menu.afterOpen.triggerVisible ||
          !transition.menu.afterOpen.triggerAriaExpanded ||
          !transition.menu.afterOpen.panelVisible ||
          (transition.before.locale !== transition.requested.locale && !transition.menu.afterOpen.localeSelectorActionable) ||
          (transition.before.theme !== transition.requested.theme && !transition.menu.afterOpen.themeToggleActionable)
        )) ||
        (!openRequired && transition.menu.afterOpen !== null)
      ) throw new TypeError(`${transition.phaseId}: menu open/restore observations do not derive the exact required actions.`);
      assertExact(transition.requiredCategories, expectedCategories, `${transition.phaseId} derived setup categories`);
      if (
        transition.physicalInputSequences.some((sequence, sequenceIndex) =>
          !Number.isSafeInteger(sequence) ||
          (sequenceIndex > 0 && sequence <= transition.physicalInputSequences[sequenceIndex - 1]!)
        )
      ) throw new TypeError(`${transition.phaseId}: setup physical sequence is not exact increasing order.`);
      const phaseEntries = transition.physicalInputSequences.map((sequence) => ledger.entries[sequence]);
      if (phaseEntries.some((entry) => !entry)) throw new TypeError(`${transition.phaseId}: setup physical entry is absent.`);
      assertExact(phaseEntries.map((entry) => entry!.category), expectedCategories, `${transition.phaseId} setup physical category order`);
      for (const entry of phaseEntries) {
        if (
          !entry ||
          entry.setupPhaseId !== transition.phaseId ||
          entry.labId !== transition.labId ||
          entry.stateId !== transition.stateId ||
          entry.analyticsBound !== false ||
          entry.targetIdentity !== entry.category
        ) throw new TypeError(`${transition.phaseId}: setup physical phase binding drifted.`);
      }
      setupEntrySequences.push(...transition.physicalInputSequences);
      priorSetupAfter = transition.after;
    });
    const actualSetupEntrySequences = ledger.entries
      .filter(({ category }) => ["locale-menu-open", "locale-menu-restore", "locale-option", "locale-selector", "theme-toggle"].includes(category))
      .map(({ sequence }) => sequence);
    assertExact(setupEntrySequences, actualSetupEntrySequences, "G07 setup transition physical union/cardinality");
    const verticalAttempts = payload.visualStates.flatMap((state) =>
      state.scrollAudits.flatMap((audit) =>
        audit.verticalSwipeAttempts.map((attempt) => ({ attempt, state })),
      ),
    );
    if (verticalAttempts.length === 0) {
      throw new TypeError("G07 all mobile landmarks were labeled already-at-landmark; no physical vertical scroll was proved.");
    }
    const verticalEntries = ledger.entries.filter(({ category }) => category === "vertical-scroll");
    if (verticalEntries.length !== verticalAttempts.length) {
      throw new TypeError("G07 vertical scroll attempts and project physical ledger differ.");
    }
    verticalAttempts.forEach(({ attempt, state }, index) => {
      const entry = verticalEntries[index]!;
      if (
        entry.sequence !== attempt.physicalInputSequence ||
        entry.direction !== attempt.direction ||
        entry.labId !== state.labId ||
        entry.stateId !== state.stateId
      ) throw new TypeError(`${state.stateId}: vertical scroll attempt lacks exact project-ledger identity.`);
    });
    for (const step of ledger.orderedStepProjection) {
      exactKeys(step, ["labId", "physicalInputSequence", "referenceId", "stateId", "stepKind"], `G07 runtime physical step ${step.physicalInputSequence}`);
    }
    assertExact(
      ledger.orderedStepProjection,
      deriveG07PhysicalStepProjection(payload),
      "G07 expected runtime physical step order",
    );
    assertExact(
      ledger.orderedStepProjection.map(({ physicalInputSequence }) => physicalInputSequence),
      ledger.entries.map(({ sequence }) => sequence),
      "G07 runtime physical step projection exact union/order/cardinality",
    );
    if (
      payload.touchEvidence.realTapCount !== totals.taps ||
      payload.touchEvidence.realSwipeCount !== totals.swipes ||
      payload.touchEvidence.swipeMoveCount !== totals.moves
    ) throw new TypeError("G07 legacy touch totals differ from the project-lifetime physical input ledger.");
  }
  exactKeys(payload.analyticsLedger, ["consumedDeliveryIds", "consumedEventIds", "exactTerminalEquality", "lateDeliveryCount", "listenerLifetime", "parsedEventIds", "rawDeliveries", "rawEventIds", "receiptEventIds", "serializedEventIds", "surplusDeliveryIds", "unconsumedDeliveryIds"], "G07 analytics ledger");
  exactKeys(payload.analyticsLedger.listenerLifetime, ["disposedAfterTerminalQuiescence", "installedBeforeRelevantPageActions", "installedOnce", "projectQuiescentRawCount", "projectTerminalRawCount"], "G07 project analytics listener lifetime");
  const listenerLifetime = payload.analyticsLedger.listenerLifetime;
  if (
    listenerLifetime.installedOnce !== true ||
    listenerLifetime.installedBeforeRelevantPageActions !== true ||
    listenerLifetime.disposedAfterTerminalQuiescence !== true ||
    listenerLifetime.projectQuiescentRawCount !== payload.analyticsLedger.rawDeliveries.length ||
    payload.analyticsLedger.lateDeliveryCount !== listenerLifetime.projectQuiescentRawCount - listenerLifetime.projectTerminalRawCount
  ) throw new TypeError("G07 global raw analytics listener equality or lifetime drifted.");
  if (payload.analyticsLedger.rawDeliveries.length !== subactions.length || payload.analyticsLedger.lateDeliveryCount !== 0 || payload.analyticsLedger.exactTerminalEquality !== true || payload.analyticsLedger.surplusDeliveryIds.length !== 0 || payload.analyticsLedger.unconsumedDeliveryIds.length !== 0) throw new TypeError("G07 raw analytics ledger is missing, surplus, late, or unconsumed.");
  const deliveryIds = payload.analyticsLedger.rawDeliveries.map(({ deliveryId }) => deliveryId);
  const eventIds = payload.analyticsLedger.rawDeliveries.map((delivery) => deliveryEvent(delivery).id);
  if (new Set(deliveryIds).size !== deliveryIds.length || new Set(eventIds).size !== eventIds.length) throw new TypeError("G07 analytics delivery/event ID reuse detected.");
  assertExact(
    payload.analyticsLedger.rawDeliveries.map(({ captureSequence }) => captureSequence),
    Array.from({ length: payload.analyticsLedger.rawDeliveries.length }, (_, index) => index),
    "G07 globalCaptureSequence exact 0..N-1",
  );
  assertExact(
    deliveryIds,
    exactRuntimeSubactions.map(({ subaction }) => subaction.deliveryId),
    "G07 lab-serial setup-primary-reset analytics order",
  );
  const projectClockOriginEpochMs = payload.analyticsLedger.rawDeliveries[0]?.temporal.clockOriginEpochMs;
  payload.analyticsLedger.rawDeliveries.forEach((delivery, index) => {
    if (!Number.isFinite(projectClockOriginEpochMs) || delivery.temporal.clockOriginEpochMs !== projectClockOriginEpochMs) {
      throw new TypeError("G07 analytics deliveries lack one common wall/monotonic origin.");
    }
    const previous = payload.analyticsLedger.rawDeliveries[index - 1];
    if (previous && delivery.temporal.actionStartedMonotonicMs <= previous.temporal.actionSettledMonotonicMs) {
      throw new TypeError("G07 analytics physical subaction windows overlap or are out of order.");
    }
  });
  const projectCheckpoints = payload.durabilityReceipts.flatMap(({ rawSessionCheckpointChain }) => rawSessionCheckpointChain);
  projectCheckpoints.forEach((checkpoint, index) => {
    const wall = Date.parse(checkpoint.capturedAt);
    const previous = projectCheckpoints[index - 1];
    if (
      checkpoint.clockOriginEpochMs !== projectClockOriginEpochMs ||
      !Number.isFinite(wall) ||
      Math.abs(wall - (projectClockOriginEpochMs! + checkpoint.capturedMonotonicMs)) > 1 ||
      (previous !== undefined && (
        checkpoint.capturedMonotonicMs <= previous.capturedMonotonicMs ||
        wall <= Date.parse(previous.capturedAt)
      ))
    ) throw new TypeError("G07 globally strict checkpoint chronology or common project clock origin drifted.");
    const preceding = checkpoint.precedingAnalyticsCaptureSequence === null
      ? undefined
      : payload.analyticsLedger.rawDeliveries[checkpoint.precedingAnalyticsCaptureSequence];
    const following = checkpoint.followingAnalyticsCaptureSequence === null
      ? undefined
      : payload.analyticsLedger.rawDeliveries[checkpoint.followingAnalyticsCaptureSequence];
    if (
      (checkpoint.precedingAnalyticsCaptureSequence !== null && !preceding) ||
      (checkpoint.followingAnalyticsCaptureSequence !== null && !following) ||
      (preceding !== undefined && preceding.temporal.actionSettledMonotonicMs >= checkpoint.capturedMonotonicMs) ||
      (following !== undefined && checkpoint.capturedMonotonicMs >= following.temporal.actionStartedMonotonicMs) ||
      (preceding !== undefined && preceding.temporal.clockOriginEpochMs !== checkpoint.clockOriginEpochMs) ||
      (following !== undefined && following.temporal.clockOriginEpochMs !== checkpoint.clockOriginEpochMs)
    ) throw new TypeError(`${checkpoint.checkpointId}: checkpoint is not inside its surrounding analytics phase window.`);
  });
  payload.durabilityReceipts.forEach((durability, labSequenceIndex) => {
    const phase = durability.phaseBoundary;
    exactKeys(phase, ["clockOriginEpochMs", "finalCheckpoint", "interactionLastCaptureSequence", "labSequenceIndex", "nextLabFirstCaptureSequence", "visualFirstCaptureSequence", "visualLastCaptureSequence"], `${durability.labId} phase boundary`);
    exactKeys(phase.finalCheckpoint, ["captureSequence", "capturedAt", "capturedMonotonicMs"], `${durability.labId} final checkpoint boundary`);
    const labInteractions = interactionSubactions.filter(({ labId }) => labId === durability.labId);
    const labVisuals = visualSubactions.filter(({ labId }) => labId === durability.labId);
    const sequenceFor = (deliveryId: string) => {
      const delivery = payload.analyticsLedger.rawDeliveries.find((candidate) => candidate.deliveryId === deliveryId);
      if (!delivery) throw new TypeError(`${durability.labId}: phase delivery disappeared.`);
      return delivery.captureSequence;
    };
    const interactionSequences = labInteractions.map(({ subaction }) => sequenceFor(subaction.deliveryId));
    const visualSequences = labVisuals.map(({ subaction }) => sequenceFor(subaction.deliveryId));
    const lastVisualDelivery = payload.analyticsLedger.rawDeliveries[visualSequences.at(-1)!];
    const nextLabId = G07_PRODUCTION_PLAN.labIds[labSequenceIndex + 1];
    const nextLabFirst = nextLabId
      ? exactRuntimeSubactions.find(({ labId }) => labId === nextLabId)
      : undefined;
    const expectedNextSequence = nextLabFirst
      ? sequenceFor(nextLabFirst.subaction.deliveryId)
      : null;
    const nextLabFirstDelivery = expectedNextSequence === null
      ? undefined
      : payload.analyticsLedger.rawDeliveries[expectedNextSequence];
    assertExact(phase, {
      clockOriginEpochMs: projectClockOriginEpochMs,
      finalCheckpoint: {
        captureSequence: visualSequences.at(-1),
        capturedAt: phase.finalCheckpoint.capturedAt,
        capturedMonotonicMs: phase.finalCheckpoint.capturedMonotonicMs,
      },
      interactionLastCaptureSequence: interactionSequences.at(-1),
      labSequenceIndex,
      nextLabFirstCaptureSequence: expectedNextSequence,
      visualFirstCaptureSequence: visualSequences[0],
      visualLastCaptureSequence: visualSequences.at(-1),
    }, `${durability.labId} coherent phase boundary`);
    if (
      !lastVisualDelivery ||
      phase.interactionLastCaptureSequence >= phase.visualFirstCaptureSequence ||
      phase.visualFirstCaptureSequence > phase.visualLastCaptureSequence ||
      phase.finalCheckpoint.capturedMonotonicMs <= lastVisualDelivery.temporal.actionSettledMonotonicMs ||
      Math.abs(Date.parse(phase.finalCheckpoint.capturedAt) - (phase.clockOriginEpochMs + phase.finalCheckpoint.capturedMonotonicMs)) > 1 ||
      (phase.nextLabFirstCaptureSequence !== null && phase.nextLabFirstCaptureSequence <= phase.visualLastCaptureSequence)
      || (nextLabFirstDelivery !== undefined && (
        nextLabFirstDelivery.temporal.actionStartedMonotonicMs <= phase.finalCheckpoint.capturedMonotonicMs ||
        Date.parse(nextLabFirstDelivery.temporal.actionStartedAt) <= Date.parse(phase.finalCheckpoint.capturedAt)
      ))
    ) throw new TypeError(`${durability.labId}: coherent phase boundary is absent.`);
    const labStates = payload.interactionStates.filter(({ labId }) => labId === durability.labId);
    const firstState = labStates.find(({ scenarioId }) => scenarioId === "first");
    const secondState = labStates[2];
    const thirdState = labStates[3];
    if (!firstState || !secondState || !thirdState) throw new TypeError(`${durability.labId}: durability interaction phase states are absent.`);
    const firstPrimarySequence = sequenceFor(firstState.action.subactions.find(({ kind }) => kind === "primary")!.deliveryId);
    const firstResetSequence = sequenceFor(firstState.action.subactions.at(-1)!.deliveryId);
    const secondFirstSequence = sequenceFor(secondState.action.subactions[0]!.deliveryId);
    const secondLastSequence = sequenceFor(secondState.action.subactions.at(-1)!.deliveryId);
    const thirdFirstSequence = sequenceFor(thirdState.action.subactions[0]!.deliveryId);
    const priorLabLastSequence = interactionSequences[0] === 0 ? null : interactionSequences[0]! - 1;
    const expectedCheckpointBindings: Array<[number | null, number | null]> = [
      [priorLabLastSequence, interactionSequences[0]!],
      [priorLabLastSequence, interactionSequences[0]!],
      [firstPrimarySequence, firstResetSequence],
      [firstResetSequence, secondFirstSequence],
      [secondLastSequence, thirdFirstSequence],
      [secondLastSequence, thirdFirstSequence],
      ...visualSequences.map((visualSequence, visualIndex): [number | null, number | null] => {
        const following = visualSequences[visualIndex + 1] ?? expectedNextSequence;
        const preceding = following === null
          ? payload.analyticsLedger.rawDeliveries.length - 1
          : following - 1;
        if (preceding < visualSequence) throw new TypeError(`${durability.labId}: visual checkpoint phase window is inverted.`);
        return [preceding, following];
      }),
      [visualSequences.at(-1)!, expectedNextSequence],
    ];
    assertExact(
      durability.rawSessionCheckpointChain.map((checkpoint) => [checkpoint.precedingAnalyticsCaptureSequence, checkpoint.followingAnalyticsCaptureSequence]),
      expectedCheckpointBindings,
      `${durability.labId} exact checkpoint analytics phase bindings`,
    );
    const finalCheckpoint = durability.rawSessionCheckpointChain.at(-1)!;
    if (
      finalCheckpoint.capturedAt !== phase.finalCheckpoint.capturedAt ||
      finalCheckpoint.capturedMonotonicMs !== phase.finalCheckpoint.capturedMonotonicMs ||
      finalCheckpoint.clockOriginEpochMs !== phase.clockOriginEpochMs
    ) throw new TypeError(`${durability.labId}: final checkpoint phase binding drifted.`);
  });
  const receiptDeliveryIds = subactions.map(({ subaction }) => subaction.deliveryId);
  const receiptEventIds = subactions.map(({ subaction }) => subaction.eventId);
  assertExact(
    [...deliveryIds].sort(),
    [...receiptDeliveryIds].sort(),
    "G07 raw/receipt delivery membership equality",
  );
  for (const { labId, subaction } of subactions) {
    const delivery = payload.analyticsLedger.rawDeliveries.find((candidate) => candidate.deliveryId === subaction.deliveryId);
    if (!delivery) throw new TypeError(`${subaction.subactionId}: zero per-subaction analytics POST.`);
    const projectLab = payload.durabilityReceipts.find((candidate) => candidate.labId === labId);
    if (!projectLab) throw new TypeError(`${labId}: analytics owner lacks durability receipt.`);
    validateDelivery(delivery, subaction, labId, projectLab.userId);
  }
  const terminalArrays = [
    payload.analyticsLedger.rawEventIds,
    payload.analyticsLedger.parsedEventIds,
    payload.analyticsLedger.serializedEventIds,
    payload.analyticsLedger.consumedEventIds,
    payload.analyticsLedger.receiptEventIds,
  ];
  for (const ids of terminalArrays) assertExact(ids, eventIds, "G07 raw/parsed/serialized/consumed terminal equality");
  assertExact(
    [...receiptEventIds].sort(),
    [...eventIds].sort(),
    "G07 receipt/raw event membership equality",
  );
  assertExact(payload.analyticsLedger.consumedDeliveryIds, deliveryIds, "G07 consumed delivery equality");
  assertExact(payload.diagnostics, { consoleErrors: [], pageErrors: [], requestFailures: [] }, "G07 diagnostics");
  assertExact(payload.execution, { complete: false, projectsTogether: ["desktop-chrome", "mobile-chrome"], retries: 0, shard: null, skipped: 0, unexpected: 0 }, "G07 incomplete direct execution");
  assertExact(payload.runnerInvocation, G07_CANONICAL_RUNNER_INVOCATION, "G07 unavailable runner authority");
  exactKeys(payload.sourceEvidence, ["selectedCriticalSources", "selectionKind", "selectionVersion", "transitiveClosureClaimed"], "G07 source evidence");
  if (
    payload.sourceEvidence.selectionKind !== "selected-critical-sources" ||
    payload.sourceEvidence.selectionVersion !== G07_SELECTED_CRITICAL_SOURCES_VERSION ||
    payload.sourceEvidence.transitiveClosureClaimed !== false
  ) {
    throw new TypeError("G07 selected critical source contract drifted or made an unsupported recursive-closure claim.");
  }
  assertExact(payload.sourceEvidence.selectedCriticalSources, selectedCriticalSourceEvidence(), "G07 selected critical source hashes");
  assertExact(payload.durabilityReceipts.map(({ labId }) => labId), G07_PRODUCTION_PLAN.labIds, "G07 durability lab order");
  payload.durabilityReceipts.forEach((receipt) => validateDurability(receipt, project));
  return true;
}

export function validateG07ProductionBrowserReceipt(
  candidate: unknown,
  project: G07ProductionProject,
): never {
  validateG07UntrustedStructuralReceipt(candidate, project);
  throw new TypeError(
    "G07 native physical provenance is unavailable: caller-sealed JSON cannot authenticate browser hit-testing, DOM ancestry, or geometry without a trusted native authority.",
  );
}

const UI_SCAN: G07UiScan = {
  candidatePairCount: 1,
  controlCount: 1,
  htmlTextCount: 1,
  paintedMarkCount: 1,
  surfaceCount: 1,
  svgTextCount: 1,
};
const UI_AUDIT: G07UiAudit = {
  clippedElementCount: 0,
  collisionIssueCount: 0,
  contrastCheckedTextCount: 1,
  contrastIssueCount: 0,
  horizontalOverflowPixels: 0,
  touchTargetCheckedCount: 1,
  touchTargetIssueCount: 0,
  uiScan: UI_SCAN,
};

function resetReceipt(labId: string): G07ResetReceipt {
  return { exact: true, observation: expectedScenario(labId, "reset"), resetControlCount: 1 };
}

function fixtureDelivery(
  captureSequence: number,
  deliveryId: string,
  eventId: string,
  eventType: G07AnalyticsEventType,
  labId: string,
  userId: string,
): G07RawAnalyticsDelivery {
  const catalog = getVisualizationLabByLabId(labId)!;
  const clockOriginEpochMs = Date.parse("2026-08-20T00:00:00.000Z");
  const startMonotonicMs = 10_000 + captureSequence * 2_000;
  const start = clockOriginEpochMs + startMonotonicMs;
  const request = start + 100;
  const settled = start + 200;
  const parsedRequestBody: G07RawAnalyticsDelivery["parsedRequestBody"] = {
    events: [{ grade: catalog.grade, id: eventId, source: catalog.analyticsSource, timestamp: new Date(request).toISOString(), topicId: labId, type: eventType }],
    generation: 0,
  };
  const parsedResponseBody = { acknowledgedEventIds: [eventId] as [string] };
  return {
    captureSequence,
    deliveryId,
    ownerHeader: "x-mais-analytics-user-id",
    ownerUserId: userId,
    parsedRequestBody,
    parsedResponseBody,
    rawRequestBody: canonicalJson(parsedRequestBody),
    rawResponseBody: canonicalJson(parsedResponseBody),
    responseBodyReady: true,
    responseStatus: 200,
    serializedRequestBody: canonicalJson(parsedRequestBody),
    serializedResponseBody: canonicalJson(parsedResponseBody),
    temporal: {
      actionSettledAt: new Date(settled).toISOString(),
      actionSettledMonotonicMs: startMonotonicMs + 200,
      actionStartedAt: new Date(start).toISOString(),
      actionStartedMonotonicMs: startMonotonicMs,
      clockOriginEpochMs,
      postActionQuiet: true,
      preActionQuiet: true,
      quietIntervalMs: QUIET_INTERVAL_MS,
      requestObservedAt: new Date(request).toISOString(),
      requestObservedMonotonicMs: startMonotonicMs + 100,
      toleranceMs: EVENT_TIMESTAMP_TOLERANCE_MS,
    },
  };
}

function fixtureSessionCheckpoint(
  checkpointId: string,
  labId: string,
  userId: string,
  fullRecords: SessionSnapshot[],
  capturedMonotonicMs: number,
  precedingAnalyticsCaptureSequence: number | null,
  followingAnalyticsCaptureSequence: number | null,
): G07RawSessionCheckpoint {
  const clockOriginEpochMs = Date.parse("2026-08-20T00:00:00.000Z");
  const parsedResponseBody = { sessions: structuredClone(fullRecords) };
  return {
    capturedAt: new Date(clockOriginEpochMs + capturedMonotonicMs).toISOString(),
    capturedMonotonicMs,
    checkpointId,
    clockOriginEpochMs,
    followingAnalyticsCaptureSequence,
    fullRecords: structuredClone(fullRecords),
    parsedResponseBody,
    projections: {
      siblings: projectedSessionSet(fullRecords, labId, userId, false),
      target: projectedSessionSet(fullRecords, labId, userId, true),
    },
    precedingAnalyticsCaptureSequence,
    rawResponseBody: JSON.stringify(parsedResponseBody),
  };
}

function physicalCategoryForSubaction(
  subaction: Pick<G07AnalyticsSubaction, "kind" | "target">,
): G07PhysicalInputCategory {
  if (subaction.kind === "swipe") return "horizontal-scroll";
  if (subaction.target === "reset") return "reset";
  if (subaction.target.startsWith("mode:")) return "mode";
  if (subaction.target.startsWith("range:")) return "range-calibration";
  throw new TypeError(`${subaction.target}: unsupported G07 physical input category.`);
}

function g07LocalizedDomLabel(
  locale: G07InteractionSurfaceObservation["locale"],
  labels: { en: string; zh: string; zhHans: string },
) {
  return locale === "en" ? labels.en : locale === "zh" ? labels.zh : labels.zhHans;
}

function g07SetupTargetAriaLabel(
  category: G07SetupPhysicalInputCategory,
  transition: G07LocaleThemeSetupTransition,
) {
  const beforeLocale = transition.before.locale;
  switch (category) {
    case "locale-menu-open":
      return g07LocalizedDomLabel(beforeLocale, {
        en: "Open mobile menu",
        zh: "開啟手機選單",
        zhHans: "开启手机选单",
      });
    case "locale-menu-restore":
      return g07LocalizedDomLabel(transition.requested.locale, {
        en: "Open mobile menu",
        zh: "開啟手機選單",
        zhHans: "开启手机选单",
      });
    case "locale-selector":
      return beforeLocale === "en" ? "Language selector" : "語言選擇";
    case "locale-option": {
      const labels = transition.requested.locale === "en"
        ? { en: "Use English", zh: "使用英文", zhHans: "使用英文" }
        : transition.requested.locale === "zh"
          ? { en: "Use Traditional Chinese", zh: "使用繁體中文", zhHans: "使用繁体中文" }
          : { en: "Use Simplified Chinese", zh: "使用簡體中文", zhHans: "使用简体中文" };
      return g07LocalizedDomLabel(beforeLocale, labels);
    }
    case "theme-toggle": {
      const labels = transition.requested.theme === "dark"
        ? { en: "Switch to dark mode", zh: "切換至深色模式", zhHans: "切换至深色模式" }
        : { en: "Switch to light mode", zh: "切換至淺色模式", zhHans: "切换至浅色模式" };
      return g07LocalizedDomLabel(transition.requested.locale, labels);
    }
  }
}

function g07ButtonIdentity(
  ariaLabel: string | null,
  overrides: Partial<G07DomElementIdentity> = {},
): G07DomElementIdentity {
  return {
    ariaLabel,
    dataVizMode: null,
    dataVizModeButton: null,
    dataVizParameter: null,
    dataVizResetModel: null,
    dataVizResetModuleId: null,
    dataVizResetTopicId: null,
    id: null,
    name: null,
    role: "button",
    tagName: "button",
    type: "button",
    ...overrides,
  };
}

function g07RangeControlId(targetIdentity: string): string {
  const [kind, controlId, endpoint, ...surplus] = targetIdentity.split(":");
  if (
    kind !== "range" ||
    !controlId ||
    !endpoint ||
    surplus.length > 0
  ) {
    throw new TypeError(`${targetIdentity}: range plan target is malformed.`);
  }
  return controlId;
}

function validateExpectedPhysicalTargetIdentity(
  entry: G07PhysicalInputEntry,
  step: G07PhysicalStepProjectionEntry | undefined,
  expectedPlanTarget: string,
  transition: G07LocaleThemeSetupTransition | undefined,
  identity: G07DomElementIdentity,
) {
  if (
    !step ||
    step.physicalInputSequence !== entry.sequence ||
    step.labId !== entry.labId ||
    step.stateId !== entry.stateId
  ) {
    throw new TypeError(`G07 physical input ${entry.sequence} lacks its exact ordered physical step.`);
  }
  let expected: G07DomElementIdentity;
  switch (entry.category) {
    case "locale-menu-open":
    case "locale-menu-restore":
    case "locale-selector":
    case "locale-option":
    case "theme-toggle": {
      if (
        step.stepKind !== "setup" ||
        !entry.setupPhaseId ||
        step.referenceId !== `${entry.setupPhaseId}:${entry.category}` ||
        expectedPlanTarget !== entry.category ||
        !transition ||
        transition.phaseId !== entry.setupPhaseId ||
        !transition.requiredCategories.includes(entry.category)
      ) {
        throw new TypeError(`G07 physical input ${entry.sequence} lacks its exact setup plan target.`);
      }
      expected = g07ButtonIdentity(
        g07SetupTargetAriaLabel(entry.category, transition),
        entry.category === "locale-option" ? { role: "menuitemradio" } : {},
      );
      break;
    }
    case "mode": {
      if (
        step.stepKind !== "analytics" ||
        step.referenceId !== entry.deliveryId ||
        !expectedPlanTarget.startsWith("mode:")
      ) throw new TypeError(`G07 physical input ${entry.sequence} lacks its exact mode plan target.`);
      expected = g07ButtonIdentity(null, {
        dataVizMode: expectedPlanTarget.slice("mode:".length),
        dataVizModeButton: "true",
      });
      break;
    }
    case "range-calibration": {
      if (
        step.stepKind !== "analytics" ||
        step.referenceId !== entry.deliveryId ||
        !expectedPlanTarget.startsWith("range:")
      ) throw new TypeError(`G07 physical input ${entry.sequence} lacks its exact range plan target.`);
      const controlId = g07RangeControlId(expectedPlanTarget);
      expected = {
        ariaLabel: null,
        dataVizMode: null,
        dataVizModeButton: null,
        dataVizParameter: controlId,
        dataVizResetModel: null,
        dataVizResetModuleId: null,
        dataVizResetTopicId: null,
        id: null,
        name: null,
        role: "slider",
        tagName: "input",
        type: "range",
      };
      break;
    }
    case "reset": {
      if (
        step.stepKind !== "analytics" ||
        step.referenceId !== entry.deliveryId ||
        expectedPlanTarget !== "reset" ||
        !entry.labId
      ) throw new TypeError(`G07 physical input ${entry.sequence} lacks its exact reset plan target.`);
      expected = g07ButtonIdentity(null, {
        dataVizResetModel: "true",
        dataVizResetModuleId: "configured-visualization-lab",
        dataVizResetTopicId: entry.labId,
      });
      break;
    }
    case "horizontal-scroll":
    case "vertical-scroll":
      throw new TypeError(`G07 physical input ${entry.sequence} cannot attach tap target identity to a swipe.`);
  }
  assertExact(identity, expected, `G07 physical input ${entry.sequence} expected physical step target identity`);
}

function physicalInputTotals(entries: G07PhysicalInputEntry[]) {
  const byCategory = Object.fromEntries(
    PHYSICAL_INPUT_CATEGORIES.map((category) => [category, 0]),
  ) as Record<G07PhysicalInputCategory, number>;
  let moves = 0;
  let swipes = 0;
  let taps = 0;
  for (const entry of entries) {
    byCategory[entry.category] += 1;
    if (entry.kind === "tap") taps += 1;
    else {
      swipes += 1;
      moves += entry.moveCount;
    }
  }
  return { byCategory, moves, swipes, taps };
}

export function deriveG07RequiredSetupCategories(
  menuBefore: G07MobileMenuObservation,
  before: Pick<G07InteractionSurfaceObservation, "locale" | "theme">,
  requested: { locale: "en" | "zh" | "zh-Hans"; theme: "dark" | "light" },
): G07SetupPhysicalInputCategory[] {
  const localeChangeRequired = before.locale !== requested.locale;
  const themeChangeRequired = before.theme !== requested.theme;
  const openRequired =
    (localeChangeRequired && !menuBefore.localeSelectorActionable) ||
    (themeChangeRequired && !menuBefore.themeToggleActionable);
  return [
    ...(openRequired ? ["locale-menu-open" as const] : []),
    ...(localeChangeRequired ? ["locale-selector" as const, "locale-option" as const] : []),
    ...(themeChangeRequired ? ["theme-toggle" as const] : []),
    ...(openRequired ? ["locale-menu-restore" as const] : []),
  ];
}

type G07PhysicalProjectionInput = Pick<
  G07ProductionBrowserPayload,
  "interactionStates" | "labIds" | "visualStates"
> & {
  touchEvidence: Pick<G07ProductionBrowserPayload["touchEvidence"], "directionalSwipes" | "setupTransitions"> & {
    physicalInputLedger: Pick<G07ProductionBrowserPayload["touchEvidence"]["physicalInputLedger"], "entries">;
  };
};

export function deriveG07PhysicalStepProjection(
  payload: G07PhysicalProjectionInput,
): G07PhysicalStepProjectionEntry[] {
  const entries = payload.touchEvidence.physicalInputLedger.entries;
  const byDeliveryId = new Map(
    entries
      .filter(({ deliveryId }) => deliveryId !== null)
      .map((entry) => [entry.deliveryId!, entry]),
  );
  const result: G07PhysicalStepProjectionEntry[] = [];
  const pushEntry = (
    entry: G07PhysicalInputEntry | undefined,
    stepKind: G07PhysicalStepProjectionEntry["stepKind"],
    referenceId: string,
    labId: string,
    stateId: string,
  ) => {
    if (!entry) throw new TypeError(`${referenceId}: expected runtime physical step is absent.`);
    result.push({
      labId,
      physicalInputSequence: entry.sequence,
      referenceId,
      stateId,
      stepKind,
    });
  };
  const appendSetup = (stateId: string, labId: string) => {
    const transition = payload.touchEvidence.setupTransitions.find(
      (candidate) => candidate.labId === labId && candidate.stateId === stateId,
    );
    if (!transition) throw new TypeError(`${stateId}: expected runtime setup transition is absent.`);
    transition.physicalInputSequences.forEach((sequence, index) => {
      const category = transition.requiredCategories[index];
      pushEntry(
        entries[sequence],
        "setup",
        `${transition.phaseId}:${category}`,
        labId,
        stateId,
      );
    });
  };
  const appendSubactions = (
    labId: string,
    stateId: string,
    subactions: readonly G07AnalyticsSubaction[],
  ) => {
    for (const subaction of subactions) {
      pushEntry(
        byDeliveryId.get(subaction.deliveryId),
        subaction.kind === "swipe" ? "horizontal" : "analytics",
        subaction.deliveryId,
        labId,
        stateId,
      );
    }
  };
  for (const labId of payload.labIds) {
    const labInteractions = payload.interactionStates.filter((state) => state.labId === labId);
    if (labInteractions.length < 3) throw new TypeError(`${labId}: expected runtime interaction prefix is absent.`);
    const axisId = labInteractions[0]!.axisId;
    appendSetup(`interaction:${labId}:${axisId}:before-initial`, labId);
    for (const state of labInteractions.slice(1, 3)) {
      appendSubactions(labId, state.stateId, state.action.subactions);
    }
    appendSetup(`interaction:${labId}:${axisId}:after-reload`, labId);
    for (const state of labInteractions.slice(3)) {
      appendSubactions(labId, state.stateId, state.action.subactions);
    }
    const labVisuals = payload.visualStates.filter((state) => state.labId === labId);
    for (const [visualIndex, state] of labVisuals.entries()) {
      appendSetup(state.stateId, labId);
      appendSubactions(labId, state.stateId, [state.resetAction]);
      if (labId === payload.labIds[0] && visualIndex === 0) {
        for (const swipe of payload.touchEvidence.directionalSwipes) {
          appendSubactions(labId, `swipe:${swipe.direction}`, [swipe.analytics]);
        }
      }
      for (const audit of state.scrollAudits) {
        for (const attempt of audit.verticalSwipeAttempts) {
          pushEntry(
            entries[attempt.physicalInputSequence],
            "vertical",
            `${state.stateId}:${audit.scrollId}:attempt:${attempt.attemptNumber}`,
            labId,
            state.stateId,
          );
        }
      }
    }
  }
  return result;
}

function fixtureTargetDomIdentity(
  targetIdentity: string,
  labId: string,
  transition?: G07LocaleThemeSetupTransition,
): G07DomElementIdentity {
  if (targetIdentity === "reset") {
    return g07ButtonIdentity(null, {
      dataVizResetModel: "true",
      dataVizResetModuleId: "configured-visualization-lab",
      dataVizResetTopicId: labId,
    });
  }
  if (targetIdentity.startsWith("mode:")) {
    return g07ButtonIdentity(null, {
      dataVizMode: targetIdentity.slice("mode:".length),
      dataVizModeButton: "true",
    });
  }
  if (targetIdentity.startsWith("range:")) {
    const controlId = g07RangeControlId(targetIdentity);
    return {
      ariaLabel: null,
      dataVizMode: null,
      dataVizModeButton: null,
      dataVizParameter: controlId,
      dataVizResetModel: null,
      dataVizResetModuleId: null,
      dataVizResetTopicId: null,
      id: null,
      name: null,
      role: "slider",
      tagName: "input",
      type: "range",
    };
  }
  if (
    transition &&
    ["locale-menu-open", "locale-menu-restore", "locale-option", "locale-selector", "theme-toggle"].includes(targetIdentity)
  ) {
    const category = targetIdentity as G07SetupPhysicalInputCategory;
    return g07ButtonIdentity(
      g07SetupTargetAriaLabel(category, transition),
      category === "locale-option" ? { role: "menuitemradio" } : {},
    );
  }
  throw new TypeError(`${targetIdentity}: fixture target DOM identity is unsupported.`);
}

function fixtureTapEvidence(
  targetIdentity: string,
  labId: string,
  transition?: G07LocaleThemeSetupTransition,
): G07TapEvidence {
  const targetDomIdentity = fixtureTargetDomIdentity(targetIdentity, labId, transition);
  const fingerprint = g07DomIdentityFingerprint(targetDomIdentity);
  return {
    boxCapturedAfterScrollIntoView: true,
    hitAncestorIdentities: [structuredClone(targetDomIdentity)],
    hitAncestorFingerprints: [fingerprint],
    hitTargetFingerprint: fingerprint,
    hitTestMatched: true,
    hitTestMethod: "document.elementFromPoint",
    rawHitIdentity: structuredClone(targetDomIdentity),
    rawHitFingerprint: fingerprint,
    targetFingerprint: fingerprint,
    targetIdentity: structuredClone(targetDomIdentity),
    targetIsHit: true,
    targetRect: { height: 40, width: 80, x: 20, y: 30 },
    viewportHeight: 844,
    viewportWidth: 390,
    x: 60,
    y: 50,
  };
}

function expectedSetupPhaseSpecs(project: G07ProductionProject): Array<{
  labId: string;
  locale: "en" | "zh" | "zh-Hans";
  phaseId: string;
  stateId: string;
  theme: "dark" | "light";
}> {
  if (project !== "mobile-chrome") return [];
  const interactionAxis = G07_PRODUCTION_PLAN.coverage.interactionAxes.find(({ project: candidate }) => candidate === project)!;
  const visualAxes = G07_PRODUCTION_PLAN.coverage.visualAxes.filter(({ project: candidate }) => candidate === project);
  return G07_PRODUCTION_PLAN.labIds.flatMap((labId) => {
    const beforeInitialStateId = `interaction:${labId}:${interactionAxis.axisId}:before-initial`;
    const afterReloadStateId = `interaction:${labId}:${interactionAxis.axisId}:after-reload`;
    return [
      { labId, locale: interactionAxis.locale as "en" | "zh" | "zh-Hans", phaseId: `setup:${beforeInitialStateId}`, stateId: beforeInitialStateId, theme: interactionAxis.theme as "dark" | "light" },
      { labId, locale: interactionAxis.locale as "en" | "zh" | "zh-Hans", phaseId: `setup:${afterReloadStateId}`, stateId: afterReloadStateId, theme: interactionAxis.theme as "dark" | "light" },
      ...visualAxes.map(({ axisId, locale, theme }) => {
        const stateId = `visual:${labId}:${axisId}:reset`;
        return { labId, locale: locale as "en" | "zh" | "zh-Hans", phaseId: `setup:${stateId}`, stateId, theme: theme as "dark" | "light" };
      }),
    ];
  });
}

export function createG07ProductionReceiptFixture(
  project: G07ProductionProject,
): G07ProductionBrowserReceipt {
  const rawDeliveries: G07RawAnalyticsDelivery[] = [];
  let captureSequence = 0;
  const fixtureSubactions = (labId: string, scenarioId: string, actionId: string) =>
    expectedSubactions(labId, scenarioId).map((expected): G07AnalyticsSubaction => {
      const deliveryId = `delivery:${project}:${captureSequence}`;
      const eventId = `event:${project}:${captureSequence}`;
      rawDeliveries.push(fixtureDelivery(captureSequence++, deliveryId, eventId, expectedAnalyticsEventType(expected), labId, `user:${project}:${labId}`));
      return {
        ...expected,
        deliveryId,
        eventId,
        method: project === "mobile-chrome" ? "page.touchscreen.tap" : expected.target.startsWith("range:") ? "page.mouse.click" : "locator.press:Enter",
      };
    });
  const visualStates = expectedVisualStateIds(project).map((stateId, visualStateIndex): G07VisualStateReceipt => {
    const labId = G07_PRODUCTION_PLAN.labIds.find((id) => stateId.startsWith(`visual:${id}:`))!;
    const axis = G07_PRODUCTION_PLAN.coverage.visualAxes.find(({ axisId }) => stateId.endsWith(`:${axisId}:reset`))!;
    const resetAction = fixtureSubactions(labId, "reset", stateId)[0]!;
    return {
      axisId: axis.axisId,
      identity: { activeLabId: labId, configuredModelCount: 1, genericFallbackCount: 0, playApplicable: false, renderer: "mainland-symbolic-expressions", resetControlCount: 1 },
      labId,
      locale: axis.locale as G07VisualStateReceipt["locale"],
      project,
      reset: resetReceipt(labId),
      resetAction,
      scrollAudits: SCROLL_IDS.map((scrollId) => {
        const viewportHeight = 800;
        const scrollY = scrollId === "page-top" ? 0 : scrollId === "visualization-center" ? 500 : 1_000;
        const rootDocumentTop = 500;
        const rootDocumentBottom = 1_300;
        const geometryFor = (value: number): G07ScrollGeometry => {
          const rootTop = rootDocumentTop - value;
          const rootBottom = rootDocumentBottom - value;
          return { centerTolerancePx: 40, documentMaxScrollY: 1_000, rootBottom, rootCenter: (rootTop + rootBottom) / 2, rootDocumentBottom, rootDocumentTop, rootTop, scrollY: value, viewportCenter: viewportHeight / 2, viewportHeight };
        };
        const geometry = geometryFor(scrollY);
        const alreadyAtLandmark = project === "mobile-chrome" && visualStateIndex === 0 && scrollId === "page-top";
        const initialScrollY = alreadyAtLandmark
          ? scrollY
          : scrollId === "page-top"
            ? 100
            : scrollId === "visualization-center"
              ? 0
              : 500;
        const initialGeometry = geometryFor(initialScrollY);
        const direction = scrollY > initialScrollY ? "down-page" as const : "up-page" as const;
        return {
          ...structuredClone(UI_AUDIT),
          geometry,
          initialGeometry: project === "mobile-chrome" ? initialGeometry : structuredClone(geometry),
          scrollId,
          scrollMethod: project === "mobile-chrome"
            ? alreadyAtLandmark
              ? "already-at-landmark"
              : "cdp:Input.dispatchTouchEvent:vertical"
            : scrollId === "visualization-center"
              ? "locator.scrollIntoViewIfNeeded"
              : "page.keyboard.press",
          verticalSwipeAttempts: project === "mobile-chrome" && !alreadyAtLandmark
            ? [{
                afterGeometry: structuredClone(geometry),
                afterScrollY: scrollY,
                attemptNumber: 1,
                beforeGeometry: structuredClone(initialGeometry),
                beforeScrollY: initialScrollY,
                direction,
                method: "cdp:Input.dispatchTouchEvent:vertical",
                moveCount: 4,
                physicalInputSequence: -1,
                signedDisplacement: scrollY - initialScrollY,
                targetReached: true,
              }]
            : [],
        };
      }),
      stateId,
      theme: axis.theme as G07VisualStateReceipt["theme"],
    };
  });
  const axisId = expectedInteractionAxisId(project);
  const interactionStates = expectedInteractionStateIds(project).map((stateId): G07InteractionStateReceipt => {
    const labId = G07_PRODUCTION_PLAN.labIds.find((id) => stateId.startsWith(`interaction:${id}:`))!;
    const scenarioId = scenarioFromStateId(stateId, labId, axisId);
    const initial = scenarioId === "initial";
    const reset = scenarioId === "reset";
    return {
      action: { actionId: stateId, modality: initial ? "none" : project === "mobile-chrome" ? "touch" : "keyboard-mouse", realInput: !initial, subactions: fixtureSubactions(labId, scenarioId, stateId) },
      axisId,
      control: expectedControl(labId, scenarioId),
      genericFallbackCount: 0,
      labId,
      observation: expectedScenario(labId, scenarioId),
      resetAfter: initial || reset ? null : resetReceipt(labId),
      scenarioId,
      stateId,
      uiScan: structuredClone(UI_AUDIT),
    };
  });
  const swipeSubactions = project === "mobile-chrome"
    ? (["toward-end", "toward-start"] as const).map((direction): G07AnalyticsSubaction => {
        const expected: ExpectedSubaction = {
          kind: "swipe",
          subactionId: `swipe:${direction}`,
          target: `local-scroll:${direction}`,
        };
        const deliveryId = `delivery:${project}:${captureSequence}`;
        const eventId = `event:${project}:${captureSequence}`;
        const labId = G07_PRODUCTION_PLAN.labIds[0];
        rawDeliveries.push(fixtureDelivery(captureSequence++, deliveryId, eventId, expectedAnalyticsEventType(expected), labId, `user:${project}:${labId}`));
        return { ...expected, deliveryId, eventId, method: "cdp:Input.dispatchTouchEvent" };
      })
    : [];
  const orderedSubactions = G07_PRODUCTION_PLAN.labIds.flatMap((labId) => {
    const labInteractions = interactionStates
      .filter((state) => state.labId === labId)
      .flatMap(({ action }) => action.subactions);
    const labVisuals = visualStates.filter((state) => state.labId === labId);
    return labVisuals.flatMap(({ resetAction }, index) => [
      ...(index === 0 ? labInteractions : []),
      resetAction,
      ...(project === "mobile-chrome" && labId === G07_PRODUCTION_PLAN.labIds[0] && index === 0
        ? swipeSubactions
        : []),
    ]);
  });
  const orderedDeliveries = orderedSubactions.map((subaction, index) => {
    const prior = rawDeliveries.find(({ deliveryId }) => deliveryId === subaction.deliveryId);
    if (!prior) throw new TypeError(`${subaction.deliveryId}: fixture delivery disappeared.`);
    return fixtureDelivery(
      index,
      subaction.deliveryId,
      subaction.eventId,
      prior.parsedRequestBody.events[0].type,
      prior.parsedRequestBody.events[0].topicId,
      prior.ownerUserId,
    );
  });
  const eventIds = orderedDeliveries.map((delivery) => deliveryEvent(delivery).id);
  const deliveryIds = orderedDeliveries.map(({ deliveryId }) => deliveryId);
  const deliverySequence = new Map(
    orderedDeliveries.map(({ captureSequence, deliveryId }) => [deliveryId, captureSequence]),
  );
  const deliverySettled = (deliveryId: string) => {
    const sequence = deliverySequence.get(deliveryId);
    if (sequence === undefined) throw new TypeError(`${deliveryId}: fixture phase delivery absent.`);
    return orderedDeliveries[sequence]!.temporal.actionSettledMonotonicMs;
  };
  const rangeTouchAttempts: G07RangeTouchAttempt[] = project === "mobile-chrome"
    ? interactionStates.flatMap((state) =>
        state.action.subactions
          .filter(({ target }) => target.startsWith("range:"))
          .map((subaction) => {
            const expected = expectedRangeAttemptCore(state.labId, state.scenarioId);
            const targetRect = { height: 40, width: 80, x: 20, y: 30 };
            const thumb = Math.min(10, targetRect.width / 20);
            const trackStartX = targetRect.x + thumb;
            const trackEndX = targetRect.x + targetRect.width - thumb;
            const ratio = (expected.requestedValue - expected.min) /
              (expected.max - expected.min);
            return {
              ...expected,
              attemptNumber: 1 as const,
              deliveryId: subaction.deliveryId,
              eventId: subaction.eventId,
              maxAttempts: 1 as const,
              physicalInputSequence: -1,
              stateId: state.stateId,
              targetRect,
              touchX: trackStartX + ratio * (trackEndX - trackStartX),
              touchY: targetRect.y + targetRect.height / 2,
              trackEndX,
              trackStartX,
              viewportHeight: 844,
              viewportWidth: 390,
            };
          }),
      )
    : [];
  const physicalInputEntries: G07PhysicalInputEntry[] = [];
  const setupTransitions: G07LocaleThemeSetupTransition[] = [];
  const appendPhysicalInput = (
    entry: Omit<G07PhysicalInputEntry, "sequence">,
  ) => {
    const physical = { ...entry, sequence: physicalInputEntries.length } as G07PhysicalInputEntry;
    physicalInputEntries.push(physical);
    return physical.sequence;
  };
  if (project === "mobile-chrome") {
    const defaultMenuObservation: G07MobileMenuObservation = {
      localeSelectorActionable: true,
      panelVisible: false,
      themeToggleActionable: true,
      triggerAriaExpanded: false,
      triggerVisible: true,
    };
    let currentSurface: G07InteractionSurfaceObservation = { htmlLang: "en", locale: "en", theme: "light" };
    for (const phase of expectedSetupPhaseSpecs(project)) {
      const before = structuredClone(currentSurface);
      const menuBefore = structuredClone(defaultMenuObservation);
      const requested = { locale: phase.locale, theme: phase.theme };
      const requiredCategories = deriveG07RequiredSetupCategories(menuBefore, before, requested);
      currentSurface = {
        htmlLang: phase.locale === "zh" ? "zh-Hant" : phase.locale,
        locale: phase.locale,
        theme: phase.theme,
      };
      setupTransitions.push({
        after: structuredClone(currentSurface),
        before,
        labId: phase.labId,
        menu: {
          afterOpen: null,
          afterRestore: structuredClone(menuBefore),
          before: menuBefore,
          openRequired: false,
          restoreRequired: false,
        },
        phaseId: phase.phaseId,
        physicalInputSequences: [],
        requested,
        requiredCategories,
        stateId: phase.stateId,
      });
    }
    const appendSubaction = (subaction: G07AnalyticsSubaction, stateId: string) => {
      const delivery = orderedDeliveries.find((candidate) => candidate.deliveryId === subaction.deliveryId)!;
      const direction = subaction.kind === "swipe"
        ? subaction.target.endsWith("toward-end")
          ? "toward-end" as const
          : "toward-start" as const
        : null;
      appendPhysicalInput({
        analyticsBound: true,
        category: physicalCategoryForSubaction(subaction),
        deliveryId: subaction.deliveryId,
        direction,
        eventId: subaction.eventId,
        kind: subaction.kind === "swipe" ? "swipe" : "tap",
        labId: delivery.parsedRequestBody.events[0].topicId,
        method: subaction.kind === "swipe" ? "cdp:Input.dispatchTouchEvent" : "page.touchscreen.tap",
        moveCount: subaction.kind === "swipe" ? 4 : 0,
        setupPhaseId: null,
        stateId,
        tapEvidence: subaction.kind === "swipe" ? null : fixtureTapEvidence(subaction.target, delivery.parsedRequestBody.events[0].topicId),
        targetIdentity: subaction.target,
      });
    };
    const appendSetup = (stateId: string, labId: string) => {
      const transition = setupTransitions.find(
        (candidate) => candidate.labId === labId && candidate.stateId === stateId,
      );
      if (!transition) throw new TypeError(`${stateId}: fixture setup transition disappeared.`);
      transition.physicalInputSequences = transition.requiredCategories.map((category) => appendPhysicalInput({
          analyticsBound: false,
          category,
          deliveryId: null,
          direction: null,
          eventId: null,
          kind: "tap",
          labId,
          method: "page.touchscreen.tap",
          moveCount: 0,
          setupPhaseId: transition.phaseId,
          stateId,
          tapEvidence: fixtureTapEvidence(category, labId, transition),
          targetIdentity: category,
        }));
    };
    for (const labId of G07_PRODUCTION_PLAN.labIds) {
      const labInteractions = interactionStates.filter((state) => state.labId === labId);
      appendSetup(`interaction:${labId}:${axisId}:before-initial`, labId);
      for (const state of labInteractions.slice(1, 3)) {
        state.action.subactions.forEach((subaction) => appendSubaction(subaction, state.stateId));
      }
      appendSetup(`interaction:${labId}:${axisId}:after-reload`, labId);
      for (const state of labInteractions.slice(3)) {
        state.action.subactions.forEach((subaction) => appendSubaction(subaction, state.stateId));
      }
      const labVisuals = visualStates.filter((state) => state.labId === labId);
      for (const [visualIndex, state] of labVisuals.entries()) {
        appendSetup(state.stateId, labId);
        appendSubaction(state.resetAction, state.stateId);
        if (labId === G07_PRODUCTION_PLAN.labIds[0] && visualIndex === 0) {
          swipeSubactions.forEach((subaction) => appendSubaction(subaction, `swipe:${subaction.target.split(":").at(-1)}`));
        }
        for (const audit of state.scrollAudits) {
          for (const attempt of audit.verticalSwipeAttempts) {
            attempt.physicalInputSequence = appendPhysicalInput({
            analyticsBound: false,
            category: "vertical-scroll",
            deliveryId: null,
            direction: attempt.direction,
            eventId: null,
            kind: "swipe",
            labId: state.labId,
            method: "cdp:Input.dispatchTouchEvent",
            moveCount: 4,
            setupPhaseId: null,
            stateId: state.stateId,
            tapEvidence: null,
            targetIdentity: `page-scroll:${state.stateId}`,
          });
          }
        }
      }
    }
    for (const attempt of rangeTouchAttempts) {
      const physicalInput = physicalInputEntries.find(
        ({ deliveryId }) => deliveryId === attempt.deliveryId,
      );
      if (!physicalInput?.tapEvidence) {
        throw new TypeError(`${attempt.stateId}: fixture range physical tap disappeared.`);
      }
      attempt.physicalInputSequence = physicalInput.sequence;
      physicalInput.tapEvidence.x = attempt.touchX;
      physicalInput.tapEvidence.y = attempt.touchY;
      physicalInput.tapEvidence.targetRect = structuredClone(attempt.targetRect);
      physicalInput.tapEvidence.viewportHeight = attempt.viewportHeight;
      physicalInput.tapEvidence.viewportWidth = attempt.viewportWidth;
    }
  }
  const durabilityReceipts: G07ProductionBrowserPayload["durabilityReceipts"] =
    G07_PRODUCTION_PLAN.labIds.map((labId, labSequenceIndex) => {
      const userId = `user:${project}:${labId}`;
      const siblingRecords = G07_PRODUCTION_PLAN.labIds
        .filter((candidate) => candidate !== labId)
        .map(sessionSnapshot);
      const fullRecords = [...siblingRecords, sessionSnapshot(labId)];
      const labInteractions = interactionStates.filter((state) => state.labId === labId);
      const labVisuals = visualStates.filter((state) => state.labId === labId);
      const interactionSubactions = labInteractions.flatMap(({ action }) => action.subactions);
      const visualSubactions = labVisuals.map(({ resetAction }) => resetAction);
      const firstAction = labInteractions.find(({ scenarioId }) => scenarioId === "first")!;
      const secondAction = labInteractions[2]!;
      const firstPrimary = firstAction.action.subactions.find(({ kind }) => kind === "primary")!;
      const firstReset = firstAction.action.subactions.at(-1)!;
      const secondLast = secondAction.action.subactions.at(-1)!;
      const labFirstSequence = deliverySequence.get(interactionSubactions[0]!.deliveryId)!;
      const interactionSequences = interactionSubactions.map(({ deliveryId }) => deliverySequence.get(deliveryId)!);
      const visualSequences = visualSubactions.map(({ deliveryId }) => deliverySequence.get(deliveryId)!);
      const nextLabFirstSequence = labSequenceIndex + 1 < G07_PRODUCTION_PLAN.labIds.length
        ? visualSequences.at(-1)! + 1
        : null;
      const priorLabLastSequence = labFirstSequence === 0 ? null : labFirstSequence - 1;
      let checkpointTime = priorLabLastSequence === null
        ? 1_000
        : orderedDeliveries[priorLabLastSequence]!.temporal.actionSettledMonotonicMs + 300;
      const checkpoint = (
        checkpointId: string,
        records: SessionSnapshot[],
        minimumTime: number,
        precedingAnalyticsCaptureSequence: number | null,
        followingAnalyticsCaptureSequence: number | null,
      ) => {
        checkpointTime = Math.max(checkpointTime + 100, minimumTime);
        return fixtureSessionCheckpoint(
          checkpointId,
          labId,
          userId,
          records,
          checkpointTime,
          precedingAnalyticsCaptureSequence,
          followingAnalyticsCaptureSequence,
        );
      };
      const firstPrimarySequence = deliverySequence.get(firstPrimary.deliveryId)!;
      const firstResetSequence = deliverySequence.get(firstReset.deliveryId)!;
      const secondFirstSequence = deliverySequence.get(secondAction.action.subactions[0]!.deliveryId)!;
      const secondLastSequence = deliverySequence.get(secondLast.deliveryId)!;
      const thirdFirstSequence = deliverySequence.get(labInteractions[3]!.action.subactions[0]!.deliveryId)!;
      const rawSessionCheckpointChain = [
        checkpoint("post-registration", [], checkpointTime, priorLabLastSequence, labFirstSequence),
        checkpoint("after-sibling-seed", siblingRecords, checkpointTime, priorLabLastSequence, labFirstSequence),
        checkpoint("after-first", fullRecords, deliverySettled(firstPrimary.deliveryId) + 100, firstPrimarySequence, firstResetSequence),
        checkpoint("after-reset", fullRecords, deliverySettled(firstReset.deliveryId) + 100, firstResetSequence, secondFirstSequence),
        checkpoint("after-second", fullRecords, deliverySettled(secondLast.deliveryId) + 100, secondLastSequence, thirdFirstSequence),
        checkpoint("after-reload", fullRecords, deliverySettled(secondLast.deliveryId) + 200, secondLastSequence, thirdFirstSequence),
        ...labVisuals.map(({ axisId, resetAction }, visualIndex) => {
          const swipeMinimum = project === "mobile-chrome" && labSequenceIndex === 0 && visualIndex === 0
            ? Math.max(...swipeSubactions.map(({ deliveryId }) => deliverySettled(deliveryId)))
            : 0;
          const following = visualSequences[visualIndex + 1] ?? nextLabFirstSequence;
          const preceding = following === null ? orderedDeliveries.length - 1 : following - 1;
          return checkpoint(`after-visual:${axisId}`, fullRecords, Math.max(deliverySettled(resetAction.deliveryId), swipeMinimum) + 100, preceding, following);
        }),
      ];
      const finalCheckpoint = checkpoint("final", fullRecords, deliverySettled(visualSubactions.at(-1)!.deliveryId) + 300, visualSequences.at(-1)!, nextLabFirstSequence);
      rawSessionCheckpointChain.push(finalCheckpoint);
      const stages = (["mount", "first", "reset", "second", "reload", "final"] as const).map((stage, index): DurabilityStage => ({ acknowledgementStatus: index === 1 ? 200 : null, postCount: index === 1 ? 1 : 0, siblings: expectedSessionSet(labId, userId, false, true), stage, target: expectedSessionSet(labId, userId, true, index > 0) }));
      const interactionSurface = expectedInteractionSurface(project);
      return {
        final: { exactlyOnce: true, noSiblingMutation: true, sameUser: true, serverBacked: true, survivedReload: true },
        interactionSurfaceEvidence: { afterReload: structuredClone(interactionSurface), beforeInitial: structuredClone(interactionSurface) },
        labId,
        phaseBoundary: {
          clockOriginEpochMs: finalCheckpoint.clockOriginEpochMs,
          finalCheckpoint: {
            captureSequence: visualSequences.at(-1)!,
            capturedAt: finalCheckpoint.capturedAt,
            capturedMonotonicMs: finalCheckpoint.capturedMonotonicMs,
          },
          interactionLastCaptureSequence: interactionSequences.at(-1)!,
          labSequenceIndex,
          nextLabFirstCaptureSequence: nextLabFirstSequence,
          visualFirstCaptureSequence: visualSequences[0]!,
          visualLastCaptureSequence: visualSequences.at(-1)!,
        },
        rawSessionCheckpointChain,
        sessionId: `session:${project}:${labId}`,
        stages,
        userId,
      };
    });
  const fixtureDirectionalSwipes: G07ProductionBrowserPayload["touchEvidence"]["directionalSwipes"] =
    project === "mobile-chrome"
      ? [{ afterScrollLeft: 240, analytics: swipeSubactions[0]!, beforeScrollLeft: 0, clientWidth: 360, direction: "toward-end", labId: G07_PRODUCTION_PLAN.labIds[0], moveCount: 4, protocol: "cdp:Input.dispatchTouchEvent", scrollerId: "horizontal", scrollWidth: 704, signedDisplacement: 240 }, { afterScrollLeft: 0, analytics: swipeSubactions[1]!, beforeScrollLeft: 240, clientWidth: 360, direction: "toward-start", labId: G07_PRODUCTION_PLAN.labIds[0], moveCount: 4, protocol: "cdp:Input.dispatchTouchEvent", scrollerId: "horizontal", scrollWidth: 704, signedDisplacement: -240 }]
      : [];
  const orderedStepProjection = project === "mobile-chrome"
    ? deriveG07PhysicalStepProjection({
        interactionStates,
        labIds: [...G07_PRODUCTION_PLAN.labIds],
        touchEvidence: {
          directionalSwipes: fixtureDirectionalSwipes,
          physicalInputLedger: { entries: physicalInputEntries },
          setupTransitions,
        },
        visualStates,
      })
    : [];
  return sealG07ProductionBrowserPayload({
    analyticsLedger: { consumedDeliveryIds: [...deliveryIds], consumedEventIds: [...eventIds], exactTerminalEquality: true, lateDeliveryCount: 0, listenerLifetime: { disposedAfterTerminalQuiescence: true, installedBeforeRelevantPageActions: true, installedOnce: true, projectQuiescentRawCount: orderedDeliveries.length, projectTerminalRawCount: orderedDeliveries.length }, parsedEventIds: [...eventIds], rawDeliveries: orderedDeliveries, rawEventIds: [...eventIds], receiptEventIds: [...eventIds], serializedEventIds: [...eventIds], surplusDeliveryIds: [], unconsumedDeliveryIds: [] },
    diagnostics: { consoleErrors: [], pageErrors: [], requestFailures: [] },
    durabilityReceipts,
    execution: { complete: false, projectsTogether: ["desktop-chrome", "mobile-chrome"], retries: 0, shard: null, skipped: 0, unexpected: 0 },
    fullVisualInteractionCartesian: false,
    groupId: "G07",
    interactionAxisId: axisId,
    interactionStates,
    labIds: [...G07_PRODUCTION_PLAN.labIds],
    planCanonicalSha256: G07_APPROVED_PLAN_CANONICAL_SHA256,
    playApplicable: false,
    project,
    runnerInvocation: structuredClone(G07_CANONICAL_RUNNER_INVOCATION),
    schemaVersion: "china-mainland-g07-production-browser-receipt.v1",
    sourceEvidence: {
      selectedCriticalSources: selectedCriticalSourceEvidence(),
      selectionKind: "selected-critical-sources",
      selectionVersion: G07_SELECTED_CRITICAL_SOURCES_VERSION,
      transitiveClosureClaimed: false,
    },
    touchEvidence: project === "mobile-chrome" ? {
      directionalSwipes: fixtureDirectionalSwipes,
      hasTouch: true,
      physicalInputLedger: {
        analyticsBoundEntrySequences: physicalInputEntries.filter(({ analyticsBound }) => analyticsBound).map(({ sequence }) => sequence),
        entries: physicalInputEntries,
        orderedStepProjection,
        totals: physicalInputTotals(physicalInputEntries),
      },
      rangeTouchAttempts,
      realSwipeCount: physicalInputTotals(physicalInputEntries).swipes,
      realTapCount: physicalInputTotals(physicalInputEntries).taps,
      swipeMoveCount: physicalInputTotals(physicalInputEntries).moves,
      swipeProtocol: "cdp:Input.dispatchTouchEvent",
      setupTransitions,
    } : {
      directionalSwipes: [],
      hasTouch: false,
      physicalInputLedger: { analyticsBoundEntrySequences: [], entries: [], orderedStepProjection: [], totals: physicalInputTotals([]) },
      rangeTouchAttempts: [],
      realSwipeCount: 0,
      realTapCount: 0,
      swipeMoveCount: 0,
      swipeProtocol: "none",
      setupTransitions: [],
    },
    visualAxisIds: expectedVisualAxisIds(project),
    visualStates,
  });
}
