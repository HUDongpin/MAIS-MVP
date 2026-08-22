import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  buildMultiDigitOperationsModel,
  type MultiDigitBaseOperation,
  type MultiDigitOperation,
  type MultiDigitOperationsInput,
} from "../../components/visualizations/mainland/MultiDigitOperationsModel";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { G01_PRODUCTION_PLAN } from "./china-mainland-g01-production-plan";

export type G01ProductionProject = "desktop-chrome" | "mobile-chrome";

export const G01_RUNNER_INVOCATION_ENV_JSON =
  "MAIS_G01_RUNNER_INVOCATION_JSON";
export const G01_RUNNER_INVOCATION_ENV_SHA256 =
  "MAIS_G01_RUNNER_INVOCATION_SHA256";

const G01_RUNNER_INVOCATION_CORE = {
  args: [
    "test",
    "tests/e2e/china-mainland-g01-production-browser.spec.ts",
    "--config=playwright.config.ts",
    "--workers=1",
    "--retries=0",
    "--reporter=line",
  ],
  configuredProjects: ["desktop-chrome", "mobile-chrome"],
  playwrightVersion: "1.59.1",
  reporter: "line",
  retries: 0,
  schemaVersion: "china-mainland-g01-runner-invocation.v1",
  spec: "tests/e2e/china-mainland-g01-production-browser.spec.ts",
  workers: 1,
} as const;

export const G01_CANONICAL_RUNNER_INVOCATION = Object.freeze({
  ...G01_RUNNER_INVOCATION_CORE,
  args: Object.freeze([...G01_RUNNER_INVOCATION_CORE.args]),
  authority: "caller-environment-contract-only" as const,
  authorityAvailable: false as const,
  configuredProjects: Object.freeze([
    ...G01_RUNNER_INVOCATION_CORE.configuredProjects,
  ]),
  invocationSha256: g01ProductionReceiptSha256(G01_RUNNER_INVOCATION_CORE),
  releaseReady: false as const,
  runnerReceiptSha256: null,
});

export type G01RunnerInvocationEvidence = {
  args: string[];
  authority: "caller-environment-contract-only";
  authorityAvailable: false;
  configuredProjects: G01ProductionProject[];
  invocationSha256: string;
  playwrightVersion: "1.59.1";
  releaseReady: false;
  reporter: "line";
  retries: 0;
  runnerReceiptSha256: null;
  schemaVersion: "china-mainland-g01-runner-invocation.v1";
  spec: "tests/e2e/china-mainland-g01-production-browser.spec.ts";
  workers: 1;
};

type G01StateObservation = {
  activeStrategyStep: number;
  exactOperation: MultiDigitBaseOperation;
  left: number;
  mode: MultiDigitOperation;
  right: number;
  roundingPlace: number;
  stateKey: string;
};

type G01ControlEvidence = {
  controlId: string | null;
  kind: "button" | "none" | "range" | "select";
  max: number | null;
  min: number | null;
  options: Array<number | string>;
  selected: number | string | null;
  step: number | null;
};

type G01AnalyticsEventReceipt = {
  actionId: string;
  eventId: string;
  labId: string;
  source: string;
  stateId: string;
  subactionId: string;
  type: "visualization-action";
};

export type G01RawAnalyticsEventEvidence = {
  id: string;
  source: string;
  topicId: string;
  type: "visualization-action";
};

export type G01RawAnalyticsDeliveryEvidence = {
  acknowledgedEventIds: string[];
  endpoint: "/api/learning-events";
  events: G01RawAnalyticsEventEvidence[];
  method: "POST";
  ownerUserId: string | null;
  rawBodyText: string | null;
  rawEventIds: string[];
  requestMalformedReason: string | null;
  responseMalformedReason: string | null;
  responseStatus: number | null;
};

export type G01AnalyticsTerminalEvidence = {
  consumedEventIds: string[];
  observedDeliveryCount: number;
  observedDeliveryEventIds: string[];
  observedRawEventIds: string[];
  postQuiescent: true;
  serializedEventIds: string[];
};

type G01AnalyticsRequestEventIdentity = {
  eventId: string;
  source: string;
  topicId: string;
  type: "visualization-action";
};

type G01AnalyticsEvidence = {
  endpoint: "/api/learning-events";
  method: "POST";
  request: {
    bodyEventIdentities: [G01AnalyticsRequestEventIdentity];
    eventIds: [string];
    ownerHeader: "x-mais-analytics-user-id";
    userId: string;
  };
  response: {
    acknowledgedEventIds: [string];
    status: 200;
  };
};

type G01PhysicalSubactionReceipt = {
  analyticsEvidence: G01AnalyticsEvidence;
  analyticsEvents: G01AnalyticsEventReceipt[];
  method: string;
  subactionId: string;
};

export type G01SessionSnapshot = {
  completedAt: string | null;
  explored: true;
  moduleId: "configured-visualization-lab";
  source: string;
  topicId: string;
  updatedAt: string;
};

type G01SessionSetReceipt = {
  count: number;
  sessions: G01SessionSnapshot[];
  userId: string;
};

type G01UiScan = {
  candidatePairCount: number;
  controlCount: number;
  htmlTextCount: number;
  paintedMarkCount: number;
  svgTextCount: number;
  surfaceCount: number;
};

type G01ResetReceipt = {
  analyticsSubaction: G01PhysicalSubactionReceipt;
  exact: true;
  observation: G01StateObservation;
  resetControlCount: 1;
};

export type G01VisualStateReceipt = {
  axisId: string;
  identity: {
    activeLabId: string;
    configuredModelCount: 1;
    genericFallbackCount: 0;
    playApplicable: false;
    renderer: "mainland-multi-digit-operations";
    resetControlCount: 1;
  };
  labId: string;
  locale: "en" | "zh" | "zh-Hans";
  project: G01ProductionProject;
  reset: G01ResetReceipt;
  scrollAudits: Array<{
    clippedElementCount: 0;
    collisionIssueCount: 0;
    contrastCheckedTextCount: number;
    contrastIssueCount: 0;
    horizontalOverflowPixels: 0;
    scrollId: "page-bottom" | "page-top" | "visualization-center";
    touchTargetCheckedCount: number;
    touchTargetIssueCount: 0;
    uiScan: G01UiScan;
  }>;
  stateId: string;
  theme: "dark" | "light";
};

export type G01InteractionStateReceipt = {
  action: {
    actionId: string;
    method: string;
    modality: "keyboard-mouse" | "none" | "touch";
    realInput: boolean;
    subactions: G01PhysicalSubactionReceipt[];
  };
  analyticsEvents: G01AnalyticsEventReceipt[];
  axisId: string;
  control: G01ControlEvidence;
  genericFallbackCount: 0;
  labId: string;
  observation: G01StateObservation;
  resetAfter: G01ResetReceipt | null;
  scenarioId: string;
  stateId: string;
  uiScan: G01UiScan;
};

export type G01ProductionBrowserPayload = {
  analyticsTerminal: G01AnalyticsTerminalEvidence;
  diagnostics: {
    consoleErrors: [];
    pageErrors: [];
    requestFailures: [];
  };
  durabilityReceipts: Array<{
    final: {
      exactlyOnce: true;
      noSiblingMutation: true;
      serverBacked: true;
      survivedReload: true;
    };
    firstAction: { acknowledgementStatus: 200; postCount: 1; sessionCount: 1 };
    labId: string;
    lessonId: string;
    mount: { postCount: 0; sessionCount: 0 };
    reload: { sameSession: true; sessionCount: 1 };
    resetAfter: { postCount: 0; sessionCount: 1 };
    secondAction: { postCount: 0; sessionCount: 1 };
    sessionId: string;
    setupSubactions: G01PhysicalSubactionReceipt[];
    siblingSnapshots: {
      baseline: G01SessionSetReceipt;
      final: G01SessionSetReceipt;
      first: G01SessionSetReceipt;
      mount: G01SessionSetReceipt;
      reload: G01SessionSetReceipt;
      reset: G01SessionSetReceipt;
      second: G01SessionSetReceipt;
    };
    targetSession: G01SessionSnapshot;
    targetSnapshots: {
      final: G01SessionSetReceipt;
      first: G01SessionSetReceipt;
      mount: G01SessionSetReceipt;
      reload: G01SessionSetReceipt;
      reset: G01SessionSetReceipt;
      second: G01SessionSetReceipt;
    };
    userId: string;
  }>;
  execution: {
    complete: boolean;
    configuredProjects: G01ProductionProject[];
    expectedStatus: "passed";
    projectsTogether: true;
    retries: 0;
    shard: null;
    skipped: 0;
    unexpected: 0;
  };
  fullVisualInteractionCartesian: false;
  groupId: "G01";
  interactionAxisId: string;
  interactionStates: G01InteractionStateReceipt[];
  labIds: string[];
  planCanonicalSha256: string;
  playApplicable: false;
  project: G01ProductionProject;
  runnerInvocation: G01RunnerInvocationEvidence;
  schemaVersion: "china-mainland-g01-production-browser-receipt.v1";
  sourceEvidence: {
    planSha256: string;
    producerSha256: string;
    receiptValidatorSha256: string;
    routingSpecSha256: string;
  };
  touchEvidence: {
    hasTouch: boolean;
    realSwipeCount: number;
    realTapCount: number;
    swipeMoveCount: number;
    swipeProtocol: "cdp:Input.dispatchTouchEvent" | "none";
  };
  visualAxisIds: string[];
  visualStates: G01VisualStateReceipt[];
};

export type G01ProductionBrowserReceipt = {
  payload: G01ProductionBrowserPayload;
  payloadSha256: string;
};

const PAYLOAD_KEYS = [
  "analyticsTerminal",
  "diagnostics",
  "durabilityReceipts",
  "execution",
  "fullVisualInteractionCartesian",
  "groupId",
  "interactionAxisId",
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

function rawFileSha256(path: URL) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expectedSourceEvidence() {
  return {
    planSha256: rawFileSha256(
      new URL("./china-mainland-g01-production-plan.ts", import.meta.url),
    ),
    producerSha256: rawFileSha256(
      new URL("./china-mainland-g01-production-browser.spec.ts", import.meta.url),
    ),
    receiptValidatorSha256: rawFileSha256(
      new URL("./china-mainland-g01-production-receipt.ts", import.meta.url),
    ),
    routingSpecSha256: rawFileSha256(
      new URL("./china-mainland-g01-g02-production-routing.spec.ts", import.meta.url),
    ),
  };
}

const RESET_OBSERVATION = expectedObservation("reset");

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

export function g01ProductionReceiptSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalRunnerInvocationEvidence(): G01RunnerInvocationEvidence {
  return structuredClone(G01_CANONICAL_RUNNER_INVOCATION) as G01RunnerInvocationEvidence;
}

export function g01CanonicalRunnerInvocationEnvironment() {
  const json = canonicalJson(G01_CANONICAL_RUNNER_INVOCATION);
  return Object.freeze({
    json,
    sha256: g01ProductionReceiptSha256(G01_CANONICAL_RUNNER_INVOCATION),
  });
}

export function readG01RunnerInvocationEnvironment(
  environment: Record<string, string | undefined>,
): G01RunnerInvocationEvidence {
  const rawJson = environment[G01_RUNNER_INVOCATION_ENV_JSON];
  const rawSha256 = environment[G01_RUNNER_INVOCATION_ENV_SHA256];
  if (!rawJson || !rawSha256) {
    throw new TypeError("G01 runner invocation environment is missing.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    throw new TypeError("G01 runner invocation JSON is malformed.");
  }
  if (rawSha256 !== g01ProductionReceiptSha256(parsed)) {
    throw new TypeError("G01 runner invocation environment SHA-256 mismatch.");
  }
  if (rawJson !== canonicalJson(parsed)) {
    throw new TypeError("G01 runner invocation JSON is not canonical.");
  }
  if (canonicalJson(parsed) !== canonicalJson(G01_CANONICAL_RUNNER_INVOCATION)) {
    throw new TypeError("G01 exact runner invocation environment does not match the exact G01 contract.");
  }
  return structuredClone(parsed) as G01RunnerInvocationEvidence;
}

export function assertG01TrustedRunnerAuthority(
  evidence: G01RunnerInvocationEvidence,
): never {
  if (canonicalJson(evidence) !== canonicalJson(G01_CANONICAL_RUNNER_INVOCATION)) {
    throw new TypeError("G01 exact runner invocation evidence does not match the exact G01 contract.");
  }
  throw new TypeError(
    "G01 production coverage unavailable: caller environment JSON plus SHA-256 has no trusted dedicated runner authority.",
  );
}

export function validateG01RawAnalyticsDeliveryWindow(
  deliveries: readonly G01RawAnalyticsDeliveryEvidence[],
  binding: {
    expectedSource: string;
    expectedUserId: string;
    labId: string;
  },
) {
  if (deliveries.length !== 1) {
    throw new TypeError(
      `G01 analytics window requires exactly one raw delivery; actual=${deliveries.length}.`,
    );
  }
  const delivery = deliveries[0]!;
  if (delivery.requestMalformedReason !== null) {
    throw new TypeError(`G01 analytics request is malformed: ${delivery.requestMalformedReason}.`);
  }
  if (delivery.responseMalformedReason !== null) {
    throw new TypeError(`G01 analytics response is malformed: ${delivery.responseMalformedReason}.`);
  }
  if (
    delivery.endpoint !== "/api/learning-events" ||
    delivery.method !== "POST" ||
    delivery.ownerUserId !== binding.expectedUserId ||
    delivery.responseStatus !== 200 ||
    delivery.rawBodyText === null
  ) {
    throw new TypeError("G01 analytics delivery endpoint, owner, raw body, or status drifted.");
  }
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(delivery.rawBodyText) as unknown;
  } catch {
    throw new TypeError("G01 analytics raw request body is not JSON.");
  }
  if (!isAnalyticsRequestBody(rawBody)) {
    throw new TypeError("G01 analytics raw request body has no events array.");
  }
  if (delivery.events.length !== 1) {
    throw new TypeError("G01 analytics raw delivery must contain exactly one parsed event.");
  }
  const event = delivery.events[0]!;
  const rawBodyEventIds = rawBody.events.map((candidate) =>
    typeof candidate === "object" && candidate !== null &&
      typeof (candidate as { id?: unknown }).id === "string"
      ? (candidate as { id: string }).id
      : null);
  if (rawBodyEventIds.some((eventId) => eventId === null)) {
    throw new TypeError("G01 analytics raw request body contains a malformed event identity.");
  }
  assertExact(rawBodyEventIds, [event.id], "G01 analytics raw body event IDs");
  const rawBodyEvent = rawBody.events[0] as Record<string, unknown>;
  if (
    rawBodyEvent.source !== event.source ||
    rawBodyEvent.topicId !== event.topicId ||
    rawBodyEvent.type !== event.type
  ) {
    throw new TypeError("G01 analytics parsed event is not bound to the raw request body.");
  }
  if (
    !event.id.trim() ||
    event.source !== binding.expectedSource ||
    event.topicId !== binding.labId ||
    event.type !== "visualization-action"
  ) {
    throw new TypeError("G01 analytics event source, topic, type, or identity drifted.");
  }
  assertExact(delivery.rawEventIds, [event.id], "G01 analytics raw event IDs");
  assertExact(
    delivery.acknowledgedEventIds,
    [event.id],
    "G01 analytics acknowledged event IDs",
  );
  return event;
}

function isAnalyticsRequestBody(
  value: unknown,
): value is { events: unknown[] } {
  return typeof value === "object" && value !== null &&
    Array.isArray((value as { events?: unknown }).events);
}

function exactSortedUniqueEventIds(ids: readonly string[], label: string) {
  if (ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new TypeError(`${label} contains an empty event ID.`);
  }
  const sorted = [...ids].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new TypeError(`${label} contains duplicate event IDs.`);
  }
  if (JSON.stringify(ids) !== JSON.stringify(sorted)) {
    throw new TypeError(`${label} is not in canonical sorted order.`);
  }
  return sorted;
}

export function validateG01AnalyticsTerminalEvidence(
  candidate: unknown,
  expectedSerializedEventIds: readonly string[],
): candidate is G01AnalyticsTerminalEvidence {
  exactKeys(candidate, [
    "consumedEventIds",
    "observedDeliveryCount",
    "observedDeliveryEventIds",
    "observedRawEventIds",
    "postQuiescent",
    "serializedEventIds",
  ], "G01 analytics terminal evidence");
  const value = candidate as G01AnalyticsTerminalEvidence;
  const expected = [...expectedSerializedEventIds].sort();
  exactSortedUniqueEventIds(expected, "G01 expected serialized event IDs");
  for (const [label, ids] of [
    ["consumed", value.consumedEventIds],
    ["observed delivery", value.observedDeliveryEventIds],
    ["observed raw", value.observedRawEventIds],
    ["serialized", value.serializedEventIds],
  ] as const) {
    assertExact(
      exactSortedUniqueEventIds(ids, `G01 ${label} event IDs`),
      expected,
      `G01 analytics terminal ${label} exact set`,
    );
  }
  if (
    value.postQuiescent !== true ||
    value.observedDeliveryCount !== expected.length
  ) {
    throw new TypeError("G01 analytics terminal delivery count/quiescence is not exact; surplus or late POST detected.");
  }
  return true;
}

function exactKeys(value: unknown, keys: readonly string[], label: string) {
  assertRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} keys are not exact.`);
  }
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, any> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function assertExact(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} does not match the exact G01 contract.`);
  }
}

function expectedAxisIds(project: G01ProductionProject) {
  return G01_PRODUCTION_PLAN.coverage.visualAxes
    .filter((axis) => axis.project === project)
    .map((axis) => axis.axisId);
}

function expectedInteractionAxisId(project: G01ProductionProject) {
  const axis = G01_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: missing G01 interaction axis.`);
  return axis.axisId;
}

function expectedVisualIds(project: G01ProductionProject) {
  const axes = new Set(expectedAxisIds(project));
  return G01_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    [...axes].some((axisId) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function expectedInteractionIds(project: G01ProductionProject) {
  const axisId = expectedInteractionAxisId(project);
  return G01_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function scenarioFromStateId(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) throw new TypeError(`${stateId}: invalid G01 state prefix.`);
  return stateId.slice(prefix.length);
}

function parseEndpointScenario(scenarioId: string) {
  const parts = scenarioId.split(":");
  if (parts[0] !== "endpoint") return null;
  if (parts[1] === "estimate-check") {
    return {
      controlId: parts[3]!,
      endpoint: parts[4]!,
      exactOperation: parts[2]! as MultiDigitBaseOperation,
      mode: "estimate-check" as const,
    };
  }
  return {
    controlId: parts[2]!,
    endpoint: parts[3]!,
    exactOperation: parts[1]! as MultiDigitBaseOperation,
    mode: parts[1]! as MultiDigitOperation,
  };
}

function endpointValue(
  controlId: string,
  endpoint: string,
  exactOperation: MultiDigitBaseOperation,
) {
  const min = controlId === "operand-b" && exactOperation === "divide" ? 1 : 0;
  const max =
    controlId === "strategy-step"
      ? 3
      : controlId === "operand-b" && exactOperation === "subtract"
        ? MULTI_DIGIT_OPERATIONS_RESET_INPUT.left
        : 999_999;
  const value = endpoint === "min" ? min : endpoint === "max" ? max : Math.floor((min + max) / 2);
  return { max, min, value };
}

function expectedState(scenarioId: string) {
  let mode: MultiDigitOperation = MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation;
  let exactOperation: MultiDigitBaseOperation = MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation;
  let left: number = MULTI_DIGIT_OPERATIONS_RESET_INPUT.left;
  let right: number = MULTI_DIGIT_OPERATIONS_RESET_INPUT.right;
  let roundingPlace = 10;
  let strategyStep = 0;

  if (scenarioId === "first") strategyStep = 1;
  if (scenarioId.startsWith("mode:")) {
    mode = scenarioId.slice("mode:".length) as MultiDigitOperation;
    if (mode !== "estimate-check") exactOperation = mode;
  }
  if (scenarioId.startsWith("estimate-from:")) {
    mode = "estimate-check";
    exactOperation = scenarioId.slice("estimate-from:".length) as MultiDigitBaseOperation;
  }
  const endpoint = parseEndpointScenario(scenarioId);
  if (endpoint) {
    mode = endpoint.mode;
    exactOperation = endpoint.exactOperation;
    const next = endpointValue(endpoint.controlId, endpoint.endpoint, exactOperation).value;
    if (endpoint.controlId === "operand-a") {
      left = next;
      if (exactOperation === "subtract" && right > left) right = left;
    }
    if (endpoint.controlId === "operand-b") right = next;
    if (endpoint.controlId === "strategy-step") strategyStep = next;
    // The model intentionally rejects an estimated divisor that rounds to zero.
    // Exercise the public divide minimum (1) with the public ones-place option,
    // rather than manufacturing state through a JavaScript value setter.
    if (
      mode === "estimate-check" &&
      exactOperation === "divide" &&
      endpoint.controlId === "operand-b" &&
      right < 5
    ) {
      roundingPlace = 1;
    }
  }
  if (scenarioId.startsWith("option:estimate-check:rounding-place:")) {
    mode = "estimate-check";
    roundingPlace = Number(scenarioId.split(":").at(-1));
  }
  return { exactOperation, left, mode, right, roundingPlace, strategyStep };
}

function expectedObservation(scenarioId: string): G01StateObservation {
  const state = expectedState(scenarioId);
  const input: MultiDigitOperationsInput =
    state.mode === "estimate-check"
      ? {
          exactOperation: state.exactOperation,
          left: state.left,
          operation: state.mode,
          right: state.right,
          roundingPlace: state.roundingPlace,
        }
      : {
          left: state.left,
          operation: state.mode,
          right: state.right,
        };
  return {
    activeStrategyStep: state.strategyStep,
    exactOperation: state.exactOperation,
    left: state.left,
    mode: state.mode,
    right: state.right,
    roundingPlace: state.roundingPlace,
    stateKey: buildMultiDigitOperationsModel(input).stateKey,
  };
}

function expectedControl(scenarioId: string): G01ControlEvidence {
  if (scenarioId === "initial" || scenarioId === "reset") {
    return { controlId: null, kind: "none", max: null, min: null, options: [], selected: null, step: null };
  }
  if (scenarioId === "first") {
    return { controlId: "strategy-step", kind: "range", max: 3, min: 0, options: [], selected: 1, step: 1 };
  }
  if (scenarioId.startsWith("mode:")) {
    return {
      controlId: "mode",
      kind: "button",
      max: null,
      min: null,
      options: ["add", "subtract", "multiply", "divide", "estimate-check"],
      selected: scenarioId.slice("mode:".length),
      step: null,
    };
  }
  if (scenarioId.startsWith("estimate-from:")) {
    return {
      controlId: "estimate-operation",
      kind: "select",
      max: null,
      min: null,
      options: ["add", "subtract", "multiply", "divide"],
      selected: scenarioId.slice("estimate-from:".length),
      step: null,
    };
  }
  if (scenarioId.startsWith("option:estimate-check:rounding-place:")) {
    return {
      controlId: "rounding-place",
      kind: "select",
      max: null,
      min: null,
      options: [1, 10, 100, 1_000, 10_000, 100_000],
      selected: Number(scenarioId.split(":").at(-1)),
      step: null,
    };
  }
  const endpoint = parseEndpointScenario(scenarioId);
  if (!endpoint) throw new TypeError(`${scenarioId}: unknown G01 scenario.`);
  const range = endpointValue(endpoint.controlId, endpoint.endpoint, endpoint.exactOperation);
  return {
    controlId: endpoint.controlId,
    kind: "range",
    max: range.max,
    min: range.min,
    options: [],
    selected: range.value,
    step: 1,
  };
}

function assertNonHollowUiScan(scan: unknown, label: string) {
  exactKeys(scan, ["candidatePairCount", "controlCount", "htmlTextCount", "paintedMarkCount", "svgTextCount", "surfaceCount"], label);
  const value = scan as G01UiScan;
  for (const key of Object.keys(value) as Array<keyof G01UiScan>) {
    if (!Number.isInteger(value[key]) || value[key] <= 0) {
      throw new TypeError(`${label}.${key} must prove a non-hollow UI scan.`);
    }
  }
}

function validateVisualState(
  receipt: unknown,
  stateId: string,
  project: G01ProductionProject,
  expectedUserId: string,
  globalEventIds: Set<string>,
) {
  exactKeys(receipt, ["axisId", "identity", "labId", "locale", "project", "reset", "scrollAudits", "stateId", "theme"], stateId);
  const value = receipt as G01VisualStateReceipt;
  const axis = G01_PRODUCTION_PLAN.coverage.visualAxes.find(({ axisId }) => axisId === value.axisId);
  if (!axis || axis.project !== project) throw new TypeError(`${stateId}: visual axis mismatch.`);
  assertExact([value.stateId, value.labId, value.project, value.locale, value.theme], [stateId, stateId.split(":")[1], axis.project, axis.locale, axis.theme], `${stateId} identity`);
  assertExact(value.identity, {
    activeLabId: value.labId,
    configuredModelCount: 1,
    genericFallbackCount: 0,
    playApplicable: false,
    renderer: "mainland-multi-digit-operations",
    resetControlCount: 1,
  }, `${stateId} renderer`);
  validateReset(value.reset, `${stateId} reset`, {
    expectedLabel: "reset",
    expectedSource: getVisualizationLabByLabId(value.labId)?.analyticsSource ?? "",
    expectedSubactionId: `${stateId}:visual-reset:subaction:1`,
    expectedUserId,
    labId: value.labId,
    project,
    stateId: `${stateId}:visual-reset`,
  }, globalEventIds);
  assertExact(value.scrollAudits.map(({ scrollId }) => scrollId), ["page-top", "visualization-center", "page-bottom"], `${stateId} canonical scroll positions`);
  for (const audit of value.scrollAudits) {
    exactKeys(audit, ["clippedElementCount", "collisionIssueCount", "contrastCheckedTextCount", "contrastIssueCount", "horizontalOverflowPixels", "scrollId", "touchTargetCheckedCount", "touchTargetIssueCount", "uiScan"], `${stateId} ${audit.scrollId}`);
    assertExact([audit.clippedElementCount, audit.collisionIssueCount, audit.contrastIssueCount, audit.horizontalOverflowPixels, audit.touchTargetIssueCount], [0, 0, 0, 0, 0], `${stateId} visual issues`);
    if (audit.contrastCheckedTextCount <= 0 || audit.touchTargetCheckedCount <= 0) throw new TypeError(`${stateId}: hollow contrast or touch-target scan.`);
    assertNonHollowUiScan(audit.uiScan, `${stateId} ${audit.scrollId} UI scan`);
  }
}

type G01SubactionBinding = {
  expectedLabel: string;
  expectedSource: string;
  expectedSubactionId: string;
  expectedUserId: string;
  labId: string;
  project: G01ProductionProject;
  stateId: string;
};

function validatePhysicalSubaction(
  subaction: unknown,
  binding: G01SubactionBinding,
  globalEventIds: Set<string>,
) {
  const label = `${binding.stateId} ${binding.expectedSubactionId}`;
  exactKeys(
    subaction,
    ["analyticsEvidence", "analyticsEvents", "method", "subactionId"],
    label,
  );
  const value = subaction as G01PhysicalSubactionReceipt;
  if (value.subactionId !== binding.expectedSubactionId || !value.method.trim()) {
    throw new TypeError(`${label}: subaction identity or method is not exact.`);
  }
  if (/nativeSetter|dispatchEvent|\.fill|selectOption|evaluate/i.test(value.method)) {
    throw new TypeError(`${label}: synthetic subaction method.`);
  }
  const [subactionLabel, physicalMethod] = value.method.split("|", 2);
  if (subactionLabel !== binding.expectedLabel || !physicalMethod) {
    throw new TypeError(`${label}: semantic/physical method binding is not exact.`);
  }
  const keyboardSubaction = subactionLabel === "keyboard-correction" ||
    subactionLabel.endsWith("-keyboard");
  if (keyboardSubaction) {
    if (!physicalMethod.includes("locator.press")) {
      throw new TypeError(`${label}: keyboard subaction has no real key input.`);
    }
  } else if (binding.project === "mobile-chrome") {
    if (!physicalMethod.includes("touchscreen.tap")) {
      throw new TypeError(`${label}: pointer subaction has no real mobile tap.`);
    }
  } else if (!physicalMethod.includes("click")) {
    throw new TypeError(`${label}: pointer subaction has no real desktop click.`);
  }
  if (value.analyticsEvents.length !== 1) {
    throw new TypeError(`${label}: exact plan requires one analytics event per physical subaction.`);
  }
  const [event] = value.analyticsEvents;
  exactKeys(
    event,
    ["actionId", "eventId", "labId", "source", "stateId", "subactionId", "type"],
    `${label} analytics event`,
  );
  if (
    event.actionId !== binding.stateId ||
    event.stateId !== binding.stateId ||
    event.labId !== binding.labId ||
    event.source !== binding.expectedSource ||
    event.subactionId !== binding.expectedSubactionId ||
    event.type !== "visualization-action" ||
    !event.eventId
  ) {
    throw new TypeError(`${label}: analytics event is not exactly subaction-bound.`);
  }
  exactKeys(value.analyticsEvidence, ["endpoint", "method", "request", "response"], `${label} analytics evidence`);
  if (
    value.analyticsEvidence.endpoint !== "/api/learning-events" ||
    value.analyticsEvidence.method !== "POST"
  ) throw new TypeError(`${label}: analytics endpoint or method drifted.`);
  exactKeys(
    value.analyticsEvidence.request,
    ["bodyEventIdentities", "eventIds", "ownerHeader", "userId"],
    `${label} analytics request`,
  );
  exactKeys(
    value.analyticsEvidence.response,
    ["acknowledgedEventIds", "status"],
    `${label} analytics response`,
  );
  assertExact(value.analyticsEvidence.request, {
    bodyEventIdentities: [{
      eventId: event.eventId,
      source: binding.expectedSource,
      topicId: binding.labId,
      type: "visualization-action",
    }],
    eventIds: [event.eventId],
    ownerHeader: "x-mais-analytics-user-id",
    userId: binding.expectedUserId,
  }, `${label} exact analytics request identity`);
  assertExact(value.analyticsEvidence.response, {
    acknowledgedEventIds: [event.eventId],
    status: 200,
  }, `${label} exact analytics ACK identity`);
  if (globalEventIds.has(event.eventId)) {
    throw new TypeError(`${label}: analytics event id ${event.eventId} is reused.`);
  }
  globalEventIds.add(event.eventId);
  return { event, method: value.method, subactionLabel };
}

function validateReset(
  reset: unknown,
  label: string,
  binding: G01SubactionBinding,
  globalEventIds: Set<string>,
) {
  exactKeys(reset, ["analyticsSubaction", "exact", "observation", "resetControlCount"], label);
  const value = reset as G01ResetReceipt;
  assertExact(
    { exact: value.exact, observation: value.observation, resetControlCount: value.resetControlCount },
    { exact: true, observation: RESET_OBSERVATION, resetControlCount: 1 },
    label,
  );
  validatePhysicalSubaction(value.analyticsSubaction, binding, globalEventIds);
}

function expectedPhysicalSubactionLabels(scenarioId: string): string[] {
  if (scenarioId === "initial") return [];
  if (scenarioId === "first") return ["physical-pointer", "keyboard-correction"];
  if (scenarioId.startsWith("mode:")) return ["mode"];
  if (scenarioId.startsWith("estimate-from:")) {
    return [
      "mode",
      "select-estimate-operation-pointer",
      "select-estimate-operation-keyboard",
    ];
  }
  if (scenarioId.startsWith("option:estimate-check:rounding-place:")) {
    return [
      "mode",
      "select-rounding-place-pointer",
      "select-rounding-place-keyboard",
    ];
  }
  if (scenarioId.startsWith("endpoint:")) {
    const parts = scenarioId.split(":");
    const estimated = parts[1] === "estimate-check";
    const labels = ["mode"];
    if (estimated) {
      labels.push(
        "select-estimate-operation-pointer",
        "select-estimate-operation-keyboard",
      );
      if (parts[2] === "divide" && parts[3] === "operand-b" && parts[4] === "min") {
        labels.push(
          "select-rounding-place-pointer",
          "select-rounding-place-keyboard",
        );
      }
    }
    labels.push("physical-pointer", "keyboard-correction");
    return labels;
  }
  if (scenarioId === "reset") return ["reset"];
  throw new TypeError(`${scenarioId}: unsupported G01 physical subaction ledger.`);
}

function validateInteractionState(
  receipt: unknown,
  stateId: string,
  project: G01ProductionProject,
  expectedUserId: string,
  globalEventIds: Set<string>,
) {
  exactKeys(receipt, ["action", "analyticsEvents", "axisId", "control", "genericFallbackCount", "labId", "observation", "resetAfter", "scenarioId", "stateId", "uiScan"], stateId);
  const value = receipt as G01InteractionStateReceipt;
  const axisId = expectedInteractionAxisId(project);
  const labId = G01_PRODUCTION_PLAN.labIds.find((id) => stateId.startsWith(`interaction:${id}:`));
  if (!labId) throw new TypeError(`${stateId}: unknown lab.`);
  const scenarioId = scenarioFromStateId(stateId, labId, axisId);
  assertExact([value.stateId, value.labId, value.axisId, value.scenarioId, value.genericFallbackCount], [stateId, labId, axisId, scenarioId, 0], `${stateId} identity`);
  assertExact(value.observation, expectedObservation(scenarioId), `${stateId} live state`);
  assertExact(value.control, expectedControl(scenarioId), `${stateId} control evidence`);
  assertNonHollowUiScan(value.uiScan, `${stateId} UI scan`);
  exactKeys(value.action, ["actionId", "method", "modality", "realInput", "subactions"], `${stateId} action`);
  if (scenarioId === "initial") {
    assertExact(value.action, { actionId: stateId, method: "none", modality: "none", realInput: false, subactions: [] }, `${stateId} initial action`);
    assertExact(value.analyticsEvents, [], `${stateId} initial analytics`);
    if (value.resetAfter !== null) throw new TypeError(`${stateId}: initial state cannot claim a reset action.`);
    return;
  }
  if (value.action.actionId !== stateId || value.action.realInput !== true) throw new TypeError(`${stateId}: action is not real and exact.`);
  if (project === "mobile-chrome") {
    if (value.action.modality !== "touch" || !value.action.method.includes("touchscreen.tap") || /nativeSetter|evaluate/i.test(value.action.method)) {
      throw new TypeError(`${stateId}: fake mobile touch evidence.`);
    }
  } else if (value.action.modality !== "keyboard-mouse" || !/(click|keyboard)/.test(value.action.method)) {
    throw new TypeError(`${stateId}: desktop action must use click or keyboard.`);
  }
  if (value.action.subactions.length === 0) {
    throw new TypeError(`${stateId}: physical subaction ledger is empty.`);
  }
  const flattenedEvents: G01AnalyticsEventReceipt[] = [];
  const subactionMethods: string[] = [];
  const subactionLabels: string[] = [];
  const expectedAnalyticsSource = getVisualizationLabByLabId(labId)?.analyticsSource;
  if (!expectedAnalyticsSource) throw new TypeError(`${stateId}: exact analytics source is absent.`);
  const expectedLabels = expectedPhysicalSubactionLabels(scenarioId);
  for (const [index, subaction] of value.action.subactions.entries()) {
    const expectedSubactionId = `${stateId}:subaction:${index + 1}`;
    const validated = validatePhysicalSubaction(subaction, {
      expectedLabel: expectedLabels[index] ?? "",
      expectedSource: expectedAnalyticsSource,
      expectedSubactionId,
      expectedUserId,
      labId,
      project,
      stateId,
    }, globalEventIds);
    subactionMethods.push(validated.method);
    subactionLabels.push(validated.subactionLabel);
    flattenedEvents.push(validated.event);
  }
  assertExact(
    subactionLabels,
    expectedLabels,
    `${stateId} exact ordered physical subaction labels`,
  );
  if (value.action.method !== subactionMethods.join("+")) {
    throw new TypeError(`${stateId}: aggregate action method is not the exact subaction ledger.`);
  }
  assertExact(value.analyticsEvents, flattenedEvents, `${stateId} ordered subaction analytics ledger`);
  if (value.analyticsEvents.length === 0) throw new TypeError(`${stateId}: zero per-action analytics evidence.`);
  if (scenarioId === "reset") {
    if (value.resetAfter !== null) throw new TypeError(`${stateId}: reset state cannot add a second reset receipt.`);
  } else {
    validateReset(value.resetAfter, `${stateId} reset-after`, {
      expectedLabel: "reset",
      expectedSource: expectedAnalyticsSource,
      expectedSubactionId: `${stateId}:reset-after:subaction:1`,
      expectedUserId,
      labId,
      project,
      stateId: `${stateId}:reset-after`,
    }, globalEventIds);
  }
}

export function g01DurableSessionId(userId: string, session: G01SessionSnapshot) {
  return createHash("sha256").update(canonicalJson({
    moduleId: session.moduleId,
    source: session.source,
    topicId: session.topicId,
    userId,
  })).digest("hex");
}

function validateSessionSnapshot(
  session: unknown,
  topicId: string,
  label: string,
) {
  exactKeys(
    session,
    ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"],
    label,
  );
  const value = session as G01SessionSnapshot;
  const expectedSource = getVisualizationLabByLabId(topicId)?.analyticsSource;
  if (
    !expectedSource ||
    value.completedAt !== null ||
    value.explored !== true ||
    value.moduleId !== "configured-visualization-lab" ||
    value.source !== expectedSource ||
    value.topicId !== topicId ||
    typeof value.updatedAt !== "string" ||
    !value.updatedAt.trim()
  ) throw new TypeError(`${label}: exact server session identity is not bound.`);
  return value;
}

function validateSessionSet(
  receipt: unknown,
  expectedUserId: string,
  expectedTopicIds: readonly string[],
  label: string,
) {
  exactKeys(receipt, ["count", "sessions", "userId"], label);
  const value = receipt as G01SessionSetReceipt;
  if (value.userId !== expectedUserId || value.count !== expectedTopicIds.length) {
    throw new TypeError(`${label}: same-user session count is not exact.`);
  }
  assertExact(
    value.sessions.map(({ topicId }) => topicId),
    expectedTopicIds,
    `${label} topic order`,
  );
  value.sessions.forEach((session, index) =>
    validateSessionSnapshot(session, expectedTopicIds[index]!, `${label} session ${index + 1}`));
  return value;
}

function validateDurabilityReceipt(
  receipt: unknown,
  labId: string,
  project: G01ProductionProject,
  globalEventIds: Set<string>,
) {
  exactKeys(receipt, [
    "final",
    "firstAction",
    "labId",
    "lessonId",
    "mount",
    "reload",
    "resetAfter",
    "secondAction",
    "sessionId",
    "setupSubactions",
    "siblingSnapshots",
    "targetSession",
    "targetSnapshots",
    "userId",
  ], `${labId} durability`);
  const value = receipt as G01ProductionBrowserPayload["durabilityReceipts"][number];
  if (!value.userId.trim() || value.labId !== labId || value.lessonId !== labId) {
    throw new TypeError(`${labId}: durability owner/lesson identity drifted.`);
  }
  assertExact(value.mount, { postCount: 0, sessionCount: 0 }, `${labId} mount durability`);
  assertExact(value.firstAction, { acknowledgementStatus: 200, postCount: 1, sessionCount: 1 }, `${labId} first durability`);
  assertExact(value.resetAfter, { postCount: 0, sessionCount: 1 }, `${labId} reset durability`);
  assertExact(value.secondAction, { postCount: 0, sessionCount: 1 }, `${labId} second durability`);
  assertExact(value.reload, { sameSession: true, sessionCount: 1 }, `${labId} reload durability`);
  assertExact(value.final, { exactlyOnce: true, noSiblingMutation: true, serverBacked: true, survivedReload: true }, `${labId} final durability`);

  const targetSession = validateSessionSnapshot(value.targetSession, labId, `${labId} target session`);
  if (value.sessionId !== g01DurableSessionId(value.userId, targetSession)) {
    throw new TypeError(`${labId}: sessionId is not bound to the owner and exact server identity.`);
  }
  exactKeys(
    value.targetSnapshots,
    ["final", "first", "mount", "reload", "reset", "second"],
    `${labId} target snapshots`,
  );
  validateSessionSet(value.targetSnapshots.mount, value.userId, [], `${labId} target mount`);
  for (const stage of ["first", "reset", "second", "reload", "final"] as const) {
    const snapshot = validateSessionSet(
      value.targetSnapshots[stage],
      value.userId,
      [labId],
      `${labId} target ${stage}`,
    );
    assertExact(snapshot.sessions, [targetSession], `${labId} target ${stage} identity`);
  }

  const siblingTopicIds = G01_PRODUCTION_PLAN.labIds
    .filter((siblingLabId) => siblingLabId !== labId)
    .sort();
  exactKeys(
    value.siblingSnapshots,
    ["baseline", "final", "first", "mount", "reload", "reset", "second"],
    `${labId} sibling snapshots`,
  );
  const siblingBaseline = validateSessionSet(
    value.siblingSnapshots.baseline,
    value.userId,
    siblingTopicIds,
    `${labId} sibling baseline`,
  );
  for (const stage of ["mount", "first", "reset", "second", "reload", "final"] as const) {
    const snapshot = validateSessionSet(
      value.siblingSnapshots[stage],
      value.userId,
      siblingTopicIds,
      `${labId} sibling ${stage}`,
    );
    assertExact(snapshot, siblingBaseline, `${labId} sibling ${stage} exact equality`);
  }

  const expectedSetup = siblingTopicIds.flatMap((siblingLabId) => [
    { expectedLabel: "physical-pointer", siblingLabId, subactionIndex: 1 },
    { expectedLabel: "keyboard-correction", siblingLabId, subactionIndex: 2 },
  ]);
  if (value.setupSubactions.length !== expectedSetup.length) {
    throw new TypeError(`${labId}: all sibling setup subactions are not serialized.`);
  }
  value.setupSubactions.forEach((subaction, index) => {
    const expected = expectedSetup[index]!;
    const stateId = `sibling-seed:${expected.siblingLabId}`;
    validatePhysicalSubaction(subaction, {
      expectedLabel: expected.expectedLabel,
      expectedSource: getVisualizationLabByLabId(expected.siblingLabId)?.analyticsSource ?? "",
      expectedSubactionId: `${stateId}:subaction:${expected.subactionIndex}`,
      expectedUserId: value.userId,
      labId: expected.siblingLabId,
      project,
      stateId,
    }, globalEventIds);
  });
  return value.userId;
}

export function sealG01ProductionBrowserPayload(payload: G01ProductionBrowserPayload): G01ProductionBrowserReceipt {
  const owned = structuredClone(payload);
  return { payload: owned, payloadSha256: g01ProductionReceiptSha256(owned) };
}

export function g01SerializedAnalyticsEventIds(
  payload: Pick<
    G01ProductionBrowserPayload,
    "durabilityReceipts" | "interactionStates" | "visualStates"
  >,
) {
  const eventIds = [
    ...payload.durabilityReceipts.flatMap(({ setupSubactions }) =>
      setupSubactions.flatMap(({ analyticsEvents }) =>
        analyticsEvents.map(({ eventId }) => eventId))),
    ...payload.interactionStates.flatMap(({ action, resetAfter }) => [
      ...action.subactions.flatMap(({ analyticsEvents }) =>
        analyticsEvents.map(({ eventId }) => eventId)),
      ...(resetAfter?.analyticsSubaction.analyticsEvents.map(({ eventId }) => eventId) ?? []),
    ]),
    ...payload.visualStates.flatMap(({ reset }) =>
      reset.analyticsSubaction.analyticsEvents.map(({ eventId }) => eventId)),
  ];
  return eventIds.sort();
}

export function validateG01UntrustedStructuralReceipt(
  candidate: unknown,
  project: G01ProductionProject,
): candidate is G01ProductionBrowserReceipt {
  exactKeys(candidate, ["payload", "payloadSha256"], "G01 receipt envelope");
  const envelope = candidate as G01ProductionBrowserReceipt;
  if (envelope.payloadSha256 !== g01ProductionReceiptSha256(envelope.payload)) throw new TypeError("G01 receipt payload SHA-256 mismatch.");
  exactKeys(envelope.payload, PAYLOAD_KEYS, "G01 receipt payload");
  const payload = envelope.payload;
  assertExact([
    payload.schemaVersion,
    payload.groupId,
    payload.project,
    payload.planCanonicalSha256,
    payload.playApplicable,
    payload.fullVisualInteractionCartesian,
  ], [
    "china-mainland-g01-production-browser-receipt.v1",
    "G01",
    project,
    G01_PRODUCTION_PLAN.canonicalSha256,
    false,
    false,
  ], "G01 receipt header");
  assertExact(payload.labIds, G01_PRODUCTION_PLAN.labIds, "G01 lab order");
  assertExact(payload.visualAxisIds, expectedAxisIds(project), "G01 visual axes");
  assertExact(payload.interactionAxisId, expectedInteractionAxisId(project), "G01 interaction axis");
  const visualIds = expectedVisualIds(project);
  const interactionIds = expectedInteractionIds(project);
  assertExact(payload.visualStates.map(({ stateId }) => stateId), visualIds, "G01 visual state IDs");
  assertExact(payload.interactionStates.map(({ stateId }) => stateId), interactionIds, "G01 interaction state IDs");
  if (new Set([...visualIds, ...interactionIds]).size !== visualIds.length + interactionIds.length) throw new TypeError("G01 receipt contains duplicate logical states.");
  const globalEventIds = new Set<string>();
  assertExact(payload.durabilityReceipts.map(({ labId }) => labId), G01_PRODUCTION_PLAN.labIds, "G01 durability lab order");
  const durabilityUserIds = new Map<string, string>();
  payload.durabilityReceipts.forEach((receipt, index) => {
    const labId = G01_PRODUCTION_PLAN.labIds[index]!;
    durabilityUserIds.set(
      labId,
      validateDurabilityReceipt(receipt, labId, project, globalEventIds),
    );
  });
  payload.interactionStates.forEach((receipt, index) =>
    validateInteractionState(
      receipt,
      interactionIds[index]!,
      project,
      durabilityUserIds.get(receipt.labId) ?? "",
      globalEventIds,
    ));
  payload.visualStates.forEach((receipt, index) => validateVisualState(
    receipt,
    visualIds[index]!,
    project,
    durabilityUserIds.get(receipt.labId) ?? "",
    globalEventIds,
  ));
  validateG01AnalyticsTerminalEvidence(
    payload.analyticsTerminal,
    [...globalEventIds].sort(),
  );
  assertExact(payload.diagnostics, { consoleErrors: [], pageErrors: [], requestFailures: [] }, "G01 diagnostics");
  assertExact(payload.execution, {
    complete: false,
    configuredProjects: ["desktop-chrome", "mobile-chrome"],
    expectedStatus: "passed",
    projectsTogether: true,
    retries: 0,
    shard: null,
    skipped: 0,
    unexpected: 0,
  }, "G01 execution receipt");
  exactKeys(payload.runnerInvocation, [
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
  ], "G01 runner invocation evidence");
  assertExact(
    payload.runnerInvocation,
    G01_CANONICAL_RUNNER_INVOCATION,
    "G01 unavailable runner authority contract",
  );
  exactKeys(payload.sourceEvidence, ["planSha256", "producerSha256", "receiptValidatorSha256", "routingSpecSha256"], "G01 source evidence");
  assertExact(payload.sourceEvidence, expectedSourceEvidence(), "G01 raw source hashes");
  exactKeys(payload.touchEvidence, ["hasTouch", "realSwipeCount", "realTapCount", "swipeMoveCount", "swipeProtocol"], "G01 touch evidence");
  if (project === "mobile-chrome") {
    if (payload.touchEvidence.hasTouch !== true || payload.touchEvidence.realTapCount <= 0 || payload.touchEvidence.realSwipeCount <= 0 || payload.touchEvidence.swipeMoveCount <= 0 || payload.touchEvidence.swipeProtocol !== "cdp:Input.dispatchTouchEvent") throw new TypeError("G01 mobile receipt lacks real tap/swipe evidence with hasTouch.");
  } else {
    assertExact(payload.touchEvidence, { hasTouch: false, realSwipeCount: 0, realTapCount: 0, swipeMoveCount: 0, swipeProtocol: "none" }, "G01 desktop touch evidence");
    if (!payload.interactionStates.some(({ action }) => action.method.includes("keyboard")) || !payload.interactionStates.some(({ action }) => action.method.includes("click"))) throw new TypeError("G01 desktop receipt requires both keyboard and click evidence.");
  }
  return true;
}

export function validateG01ProductionBrowserReceipt(
  candidate: unknown,
  project: G01ProductionProject,
): never {
  validateG01UntrustedStructuralReceipt(candidate, project);
  throw new TypeError(
    "G01 native runner authority and physical provenance are unavailable: caller-sealed JSON cannot authenticate the dedicated browser execution, source hold, supervisor receipt, or outer exit.",
  );
}

const NON_HOLLOW_SCAN: G01UiScan = {
  candidatePairCount: 1,
  controlCount: 1,
  htmlTextCount: 1,
  paintedMarkCount: 1,
  surfaceCount: 1,
  svgTextCount: 1,
};

function fixtureUserId(project: G01ProductionProject, labId: string) {
  return `fixture-user:${project}:${labId}`;
}

function fixtureSessionSnapshot(labId: string): G01SessionSnapshot {
  const source = getVisualizationLabByLabId(labId)?.analyticsSource;
  if (!source) throw new TypeError(`${labId}: fixture session source is absent.`);
  return {
    completedAt: null,
    explored: true,
    moduleId: "configured-visualization-lab",
    source,
    topicId: labId,
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

function fixtureSessionSet(userId: string, topicIds: readonly string[]): G01SessionSetReceipt {
  return {
    count: topicIds.length,
    sessions: topicIds.map(fixtureSessionSnapshot),
    userId,
  };
}

function fixtureSubaction(
  project: G01ProductionProject,
  stateId: string,
  labId: string,
  userId: string,
  label: string,
  index: number,
): G01PhysicalSubactionReceipt {
  const source = getVisualizationLabByLabId(labId)?.analyticsSource;
  if (!source) throw new TypeError(`${labId}: fixture analytics source is absent.`);
  const subactionId = `${stateId}:subaction:${index}`;
  const eventId = `event:${userId}:${stateId}:${index}`;
  const keyboard = label === "keyboard-correction" || label.endsWith("-keyboard");
  const physicalMethod = keyboard
    ? "locator.press(ArrowRight)"
    : project === "mobile-chrome"
      ? "page.touchscreen.tap"
      : "locator.click";
  const analyticsEvents: G01AnalyticsEventReceipt[] = [{
    actionId: stateId,
    eventId,
    labId,
    source,
    stateId,
    subactionId,
    type: "visualization-action",
  }];
  return {
    analyticsEvidence: {
      endpoint: "/api/learning-events",
      method: "POST",
      request: {
        bodyEventIdentities: [{ eventId, source, topicId: labId, type: "visualization-action" }],
        eventIds: [eventId],
        ownerHeader: "x-mais-analytics-user-id",
        userId,
      },
      response: { acknowledgedEventIds: [eventId], status: 200 },
    },
    analyticsEvents,
    method: `${label}|${physicalMethod}`,
    subactionId,
  };
}

function resetReceipt(analyticsSubaction: G01PhysicalSubactionReceipt): G01ResetReceipt {
  return {
    analyticsSubaction,
    exact: true,
    observation: structuredClone(RESET_OBSERVATION),
    resetControlCount: 1,
  };
}

export function createG01ProductionReceiptFixture(project: G01ProductionProject): G01ProductionBrowserReceipt {
  const durabilityReceipts: G01ProductionBrowserPayload["durabilityReceipts"] =
    G01_PRODUCTION_PLAN.labIds.map((labId) => {
      const userId = fixtureUserId(project, labId);
      const siblingTopicIds = G01_PRODUCTION_PLAN.labIds
        .filter((siblingLabId) => siblingLabId !== labId)
        .sort();
      const siblingBaseline = fixtureSessionSet(userId, siblingTopicIds);
      const targetSession = fixtureSessionSnapshot(labId);
      const targetSet = fixtureSessionSet(userId, [labId]);
      const setupSubactions = siblingTopicIds.flatMap((siblingLabId) => {
        const stateId = `sibling-seed:${siblingLabId}`;
        return [
          fixtureSubaction(project, stateId, siblingLabId, userId, "physical-pointer", 1),
          fixtureSubaction(project, stateId, siblingLabId, userId, "keyboard-correction", 2),
        ];
      });
      return {
        final: { exactlyOnce: true, noSiblingMutation: true, serverBacked: true, survivedReload: true },
        firstAction: { acknowledgementStatus: 200, postCount: 1, sessionCount: 1 },
        labId,
        lessonId: labId,
        mount: { postCount: 0, sessionCount: 0 },
        reload: { sameSession: true, sessionCount: 1 },
        resetAfter: { postCount: 0, sessionCount: 1 },
        secondAction: { postCount: 0, sessionCount: 1 },
        sessionId: g01DurableSessionId(userId, targetSession),
        setupSubactions,
        siblingSnapshots: {
          baseline: structuredClone(siblingBaseline),
          final: structuredClone(siblingBaseline),
          first: structuredClone(siblingBaseline),
          mount: structuredClone(siblingBaseline),
          reload: structuredClone(siblingBaseline),
          reset: structuredClone(siblingBaseline),
          second: structuredClone(siblingBaseline),
        },
        targetSession,
        targetSnapshots: {
          final: structuredClone(targetSet),
          first: structuredClone(targetSet),
          mount: fixtureSessionSet(userId, []),
          reload: structuredClone(targetSet),
          reset: structuredClone(targetSet),
          second: structuredClone(targetSet),
        },
        userId,
      };
    });
  const visualStates = expectedVisualIds(project).map((stateId): G01VisualStateReceipt => {
    const labId = G01_PRODUCTION_PLAN.labIds.find((id) => stateId.startsWith(`visual:${id}:`))!;
    const axis = G01_PRODUCTION_PLAN.coverage.visualAxes.find(({ axisId }) => stateId.endsWith(`:${axisId}:reset`))!;
    if (
      (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
      (axis.theme !== "dark" && axis.theme !== "light")
    ) throw new TypeError(`${axis.axisId}: unsupported G01 visual axis.`);
    return {
      axisId: axis.axisId,
      identity: { activeLabId: labId, configuredModelCount: 1, genericFallbackCount: 0, playApplicable: false, renderer: "mainland-multi-digit-operations", resetControlCount: 1 },
      labId,
      locale: axis.locale,
      project,
      reset: resetReceipt(fixtureSubaction(
        project,
        `${stateId}:visual-reset`,
        labId,
        fixtureUserId(project, labId),
        "reset",
        1,
      )),
      scrollAudits: (["page-top", "visualization-center", "page-bottom"] as const).map((scrollId) => ({ clippedElementCount: 0, collisionIssueCount: 0, contrastCheckedTextCount: 1, contrastIssueCount: 0, horizontalOverflowPixels: 0, scrollId, touchTargetCheckedCount: 1, touchTargetIssueCount: 0, uiScan: structuredClone(NON_HOLLOW_SCAN) })),
      stateId,
      theme: axis.theme,
    };
  });
  const axisId = expectedInteractionAxisId(project);
  const interactionStates = expectedInteractionIds(project).map((stateId): G01InteractionStateReceipt => {
    const labId = G01_PRODUCTION_PLAN.labIds.find((id) => stateId.startsWith(`interaction:${id}:`))!;
    const scenarioId = scenarioFromStateId(stateId, labId, axisId);
    const initial = scenarioId === "initial";
    const reset = scenarioId === "reset";
    const mobile = project === "mobile-chrome";
    const userId = fixtureUserId(project, labId);
    const subactions: G01PhysicalSubactionReceipt[] = expectedPhysicalSubactionLabels(scenarioId)
      .map((label, index) => fixtureSubaction(
        project,
        stateId,
        labId,
        userId,
        label,
        index + 1,
      ));
    const analyticsEvents = subactions.flatMap(({ analyticsEvents }) => analyticsEvents);
    const method = initial ? "none" : subactions.map((subaction) => subaction.method).join("+");
    return {
      action: {
        actionId: stateId,
        method,
        modality: initial ? "none" : mobile ? "touch" : "keyboard-mouse",
        realInput: !initial,
        subactions,
      },
      analyticsEvents,
      axisId,
      control: expectedControl(scenarioId),
      genericFallbackCount: 0,
      labId,
      observation: expectedObservation(scenarioId),
      resetAfter: initial || reset
        ? null
        : resetReceipt(fixtureSubaction(
            project,
            `${stateId}:reset-after`,
            labId,
            userId,
            "reset",
            1,
          )),
      scenarioId,
      stateId,
      uiScan: structuredClone(NON_HOLLOW_SCAN),
    };
  });
  const serializedEventIds = g01SerializedAnalyticsEventIds({
    durabilityReceipts,
    interactionStates,
    visualStates,
  });
  return sealG01ProductionBrowserPayload({
    analyticsTerminal: {
      consumedEventIds: [...serializedEventIds],
      observedDeliveryCount: serializedEventIds.length,
      observedDeliveryEventIds: [...serializedEventIds],
      observedRawEventIds: [...serializedEventIds],
      postQuiescent: true,
      serializedEventIds: [...serializedEventIds],
    },
    diagnostics: { consoleErrors: [], pageErrors: [], requestFailures: [] },
    durabilityReceipts,
    execution: {
      complete: false,
      configuredProjects: ["desktop-chrome", "mobile-chrome"],
      expectedStatus: "passed",
      projectsTogether: true,
      retries: 0,
      shard: null,
      skipped: 0,
      unexpected: 0,
    },
    fullVisualInteractionCartesian: false,
    groupId: "G01",
    interactionAxisId: axisId,
    interactionStates,
    labIds: [...G01_PRODUCTION_PLAN.labIds],
    planCanonicalSha256: G01_PRODUCTION_PLAN.canonicalSha256,
    playApplicable: false,
    project,
    runnerInvocation: canonicalRunnerInvocationEvidence(),
    schemaVersion: "china-mainland-g01-production-browser-receipt.v1",
    sourceEvidence: expectedSourceEvidence(),
    touchEvidence: project === "mobile-chrome" ? { hasTouch: true, realSwipeCount: 1, realTapCount: 809, swipeMoveCount: 4, swipeProtocol: "cdp:Input.dispatchTouchEvent" } : { hasTouch: false, realSwipeCount: 0, realTapCount: 0, swipeMoveCount: 0, swipeProtocol: "none" },
    visualAxisIds: expectedAxisIds(project),
    visualStates,
  });
}
