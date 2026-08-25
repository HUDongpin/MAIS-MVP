import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import type {
  APIResponse,
  BrowserContext,
  Frame,
  Locator,
  Page,
  Request,
  Response as PlaywrightResponse,
  TestInfo,
} from "@playwright/test";

import {
  learningAnalyticsBoundaryLineageStorageKey,
  learningAnalyticsClearFenceStorageKey,
  learningAnalyticsGenerationHandshakeStorageKey,
  learningAnalyticsGenerationStorageKey,
  learningAnalyticsGenerationTransitionStorageKey,
  readLearningAnalyticsClearFence,
  readLearningAnalyticsGenerationHandshake,
  readLearningAnalyticsGenerationTransition,
} from "../../lib/learningAnalytics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";

import {
  VisualizationLessonTerminalDeadlineError,
  assertStarshipVisualizationDatabasePath,
  classifyVisualizationLessonMountWrites,
  readVisualizationLessonAppState,
  validateVisualizationLessonDuplicateReplay,
  validateVisualizationLessonFirstInteraction,
  validateVisualizationLessonMountTerminalReceipt,
  type VisualizationLessonAppStateSnapshot,
  type VisualizationLessonDuplicateReplayReceipt,
  type VisualizationLessonFirstInteractionReceipt,
  type VisualizationLessonMountTerminalVerdict,
} from "./visualization-lesson-session-durability";

type JsonRecord = Record<string, unknown>;

const observerKey = "__maisVisualizationLessonDurabilityBrowserV1";
const exactSessionPath = "/api/visualization-sessions";
const exactLessonProgressPath = "/api/lesson-progress";
const exactLearningEventsPath = "/api/learning-events";
const exactLearnerProfilePath = "/api/me/learner-profile";
const exactLearnerProfileSetupBody = Object.freeze({
  answers: Object.freeze({ challenge: "balanced", goal: "repair", help: "hint" }),
  status: "skipped",
});
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const terminalNetworkQuiescenceMs = 125;
const terminalNetworkPollMs = 5;
const requiredManifestPathLabels = [
  "browserProfileEvidencePath",
  "browserProcessEvidencePath",
  "browserTempDir",
  "crashDumpDir",
  "databasePath",
  "e2eRunRoot",
  "nextDistDir",
  "nextTsconfigPath",
  "nodeCompileCacheDir",
  "npmCacheDir",
  "outputDir",
  "pathManifestPath",
  "reportDir",
  "repositoryRoot",
  "serverCommandOwnerPidPath",
  "serverLogPath",
] as const;

type StorageFamily =
  | "analytics-confirmed"
  | "analytics-corrupt"
  | "analytics-clear-fence"
  | "analytics-boundary-lineage"
  | "analytics-legacy"
  | "analytics-quarantine"
  | "analytics-unconfirmed"
  | "analytics-generation"
  | "analytics-generation-handshake"
  | "analytics-generation-transition"
  | "completion-telemetry"
  | "session-legacy-terminal"
  | "session-live"
  | "session-quarantine";

type RawStorageEntry = {
  readonly key: string;
  readonly raw: string;
};

type BrowserStorageEntry = RawStorageEntry & {
  readonly family: StorageFamily;
  readonly parsed: unknown;
  readonly rawSha256: string;
};

export type VisualizationLessonBrowserStorageReceipt = {
  readonly digest: string;
  readonly entries: readonly BrowserStorageEntry[];
  readonly liveAnalyticsRecords: readonly unknown[];
  readonly liveSessionRecords: readonly unknown[];
  readonly outboxEntries: readonly BrowserStorageEntry[];
  readonly poisonKeys: readonly string[];
  readonly protocolControlEntries: readonly BrowserStorageEntry[];
};

type RootControlSnapshot = {
  readonly ariaPressed: string | null;
  readonly dataPressed: readonly (readonly [string, string | null])[];
  readonly key: string;
  readonly max: string | null;
  readonly min: string | null;
  readonly options: readonly {
    readonly disabled: boolean;
    readonly selected: boolean;
    readonly value: string;
  }[];
  readonly step: string | null;
  readonly tag: string;
  readonly type: string | null;
  readonly value: string | null;
};

type BrowserRootSnapshot = {
  readonly activeLabId: string | null;
  readonly controls: readonly RootControlSnapshot[];
  readonly count: number;
  readonly matchesRootSelector: boolean;
  readonly moduleId: string | null;
  readonly sessionOwner: string | null;
  readonly topicId: string | null;
  readonly visible: boolean;
};

type InteractionEventReceipt = {
  readonly controlKey: string;
  readonly key: string | null;
  readonly sequence: number;
  readonly type: "change" | "click" | "input" | "keyup" | "pointerup";
};

export type VisualizationLessonExpectedButtonClick = {
  readonly controlKey: string;
  readonly eventTypes: readonly ["pointerup", "click"];
};

export type VisualizationLessonButtonClickControlEvents = readonly [
  {
    readonly controlKey: string;
    readonly key: null;
    readonly sequence: number;
    readonly type: "pointerup";
  },
  {
    readonly controlKey: string;
    readonly key: null;
    readonly sequence: number;
    readonly type: "click";
  },
];

export type VisualizationLessonTwoButtonClickControlLedger = readonly [
  ...VisualizationLessonButtonClickControlEvents,
  ...VisualizationLessonButtonClickControlEvents,
];

export type VisualizationLessonControlObserverStopReceipt = {
  readonly active: false;
  readonly adapterId: string;
  readonly eventCount: 4;
  readonly events: VisualizationLessonTwoButtonClickControlLedger;
  readonly eventsSha256: string;
  readonly lastSequence: 4;
  readonly removalCount: 1;
  readonly removedEventTypes: readonly ["change", "click", "input", "keyup", "pointerup"];
  readonly removedExactlyOnce: true;
  readonly removedListenerCount: 5;
  readonly stopId: string;
};

type BrowserPageLocationReceipt = {
  readonly hash: string;
  readonly href: string;
  readonly origin: string;
  readonly pathname: string;
  readonly search: string;
};

type BrowserHistoryDriftReceipt = {
  readonly after: string;
  readonly before: string;
  readonly kind: string;
  readonly sequence: number;
};

type BrowserTopologyEventReceipt = {
  readonly kind:
    | "auxiliary-frame-navigated"
    | "context-page"
    | "frame-attached"
    | "frame-detached"
    | "identity-drift"
    | "page-popup";
  readonly sequence: number;
  readonly url: string;
};

type BrowserTopologySnapshotReceipt = {
  readonly frameCount: 1;
  readonly mainFrameUrl: string;
  readonly pageCount: 1;
  readonly pageUrl: string;
};

type BrowserListenerCleanupReceipt = {
  readonly applicationTopologyObserverRemoved: boolean;
  readonly contextPageListenerRemoved: true;
  readonly pageListenerEvents: readonly [
    "frameattached",
    "framedetached",
    "framenavigated",
    "popup",
    "request",
    "requestfailed",
    "requestfinished",
    "response",
  ];
  readonly removedExactlyOnce: true;
  readonly storageEventListenerRemoved: boolean;
  readonly totalRemoved: 9;
};

type BrowserStorageEventReceipt = {
  readonly key: string | null;
  readonly newValue: string | null;
  readonly oldValue: string | null;
  readonly sequence: number;
  readonly url: string;
};

type BrowserApplicationTopologyEventReceipt = {
  readonly kind: "dom-auxiliary-created" | "window-open";
  readonly sequence: number;
  readonly tagName: string | null;
  readonly targetUrl: string | null;
};

type BrowserPostSealViolationReceipt = {
  readonly epoch: number;
  readonly kind: string;
  readonly sequence: number;
};

type BrowserSealSnapshotReceipt = {
  readonly digests: {
    readonly locationSha256: string;
    readonly observerSha256: string;
    readonly storageSha256: string;
  };
  readonly epoch: number;
  readonly postSealViolations: readonly BrowserPostSealViolationReceipt[];
  readonly sealId: string;
  readonly state: "invalid" | "sealed";
};

type InteractionObserverSnapshot = {
  readonly controlObserverActive: boolean;
  readonly controlObserverFrozenEventCount: number;
  readonly controlObserverLedgerFrozen: boolean;
  readonly controlObserverRemovalCount: number;
  readonly controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null;
  readonly events: readonly InteractionEventReceipt[];
  readonly initialStorage: readonly RawStorageEntry[];
  readonly listenerErrors: readonly string[];
  readonly location: BrowserPageLocationReceipt;
  readonly navigationDrifts: readonly BrowserHistoryDriftReceipt[];
  readonly storageEvents: readonly BrowserStorageEventReceipt[];
  readonly topologyEvents: readonly BrowserApplicationTopologyEventReceipt[];
  readonly storageError: string | null;
  readonly version: 1;
};

type BrowserResponseReceipt = {
  readonly body: unknown;
  readonly bytes: string;
  readonly bytesSha256: string;
  readonly status: number;
};

export type VisualizationLessonBrowserRequestIdentityReceipt = {
  readonly finished: boolean;
  readonly hash: string;
  readonly id: number;
  readonly method: string;
  readonly origin: string;
  readonly pathname: string;
  readonly requestBodySha256: string | null;
  readonly responseSha256: string | null;
  readonly search: string;
  readonly status: number | null;
  readonly url: string;
};

export type VisualizationLessonApiRequestReceipt = {
  readonly completedAt: string;
  readonly method: "GET" | "PATCH" | "POST";
  readonly origin: string;
  readonly pathname: string;
  readonly requestBodySha256: string | null;
  readonly requestBytes: string | null;
  readonly responseBytes: string;
  readonly responseSha256: string;
  readonly responseUrl: string;
  readonly startedAt: string;
  readonly statusCode: number;
  readonly url: string;
};

export type VisualizationLessonBrowserMountAcknowledgementReceipt =
  VisualizationLessonBrowserRequestIdentityReceipt & {
    readonly requestBody: unknown;
    readonly requestBytes: string;
    readonly responseBytes: string;
  };

export type VisualizationLessonBrowserMutationLedgerReceipt =
  VisualizationLessonBrowserRequestIdentityReceipt & {
    readonly authorizedPhase: "first-control" | "mount";
    readonly requestBody: unknown;
    readonly requestBytes: string;
    readonly responseBytes: string;
  };

type ObservedBrowserRequest = {
  readonly headers: Readonly<Record<string, string>>;
  readonly hash: string;
  readonly id: number;
  readonly method: string;
  readonly origin: string;
  readonly pathname: string;
  readonly request: Request;
  readonly requestBody: unknown;
  readonly requestBytes: string | null;
  readonly search: string;
  readonly url: string;
  failed: string | null;
  finished: boolean;
  response: BrowserResponseReceipt | null;
  responseRead: boolean;
};

type StarshipPathManifestReceipt = {
  readonly pathManifestPath: string;
  readonly paths: Readonly<Record<string, string>>;
  readonly runId: string;
  readonly schemaVersion: 1;
};

export type VisualizationLessonDurabilityBrowserAdapterInput = {
  readonly page: Page;
  readonly testInfo: TestInfo;
  readonly expected: {
    readonly appOrigin: string;
    readonly grade: string;
    readonly userId: string;
    readonly moduleId: "configured-visualization-lab";
    readonly selectedTopicId: string;
    readonly siblingTopicIds: readonly string[];
    readonly lessonSlug: string;
    readonly source: string;
  };
  readonly databasePath: string;
  readonly rootSelector: string;
  readonly controlSelector: string;
  readonly readRuntimeDigest: (root: Locator) => Promise<unknown>;
};

export type VisualizationLessonLearnerProfileSetupReceipt = {
  readonly appOrigin: string;
  readonly completedAt: string;
  readonly method: "PATCH";
  readonly pathname: "/api/me/learner-profile";
  readonly request: VisualizationLessonApiRequestReceipt;
  readonly requestBodySha256: string;
  readonly responseBytes: string;
  readonly responseSha256: string;
  readonly shouldShowOnboarding: false;
  readonly skippedAt: string;
  readonly startedAt: string;
  readonly status: "skipped";
  readonly statusCode: 200;
  readonly userId: string;
};

export type VisualizationLessonRealControlFence = {
  readonly adapterId: string;
  readonly browserSessionPostCount: number;
  readonly eventCount: number;
  readonly expectedControl: VisualizationLessonExpectedButtonClick;
  readonly networkSequence: number;
  readonly ordinal: 1 | 2;
  readonly storageDigest: string;
};

export type VisualizationLessonBrowserMountReceipt = {
  readonly acknowledgements: {
    readonly lessonPageView: VisualizationLessonBrowserMountAcknowledgementReceipt | null;
    readonly lessonProgressStart: VisualizationLessonBrowserMountAcknowledgementReceipt | null;
  };
  readonly browserDigest: string;
  readonly controlEventCount: 0;
  readonly durability: VisualizationLessonMountTerminalVerdict | null;
  readonly initialStorage: VisualizationLessonBrowserStorageReceipt;
  readonly networkRequestCount: number;
  readonly rawIncluded: boolean;
  readonly root: BrowserRootSnapshot;
  readonly storage: VisualizationLessonBrowserStorageReceipt;
};

export type VisualizationLessonBrowserFirstInteractionReceipt = {
  readonly adapterId: string;
  readonly browserDigest: string;
  readonly browserEventCount: number;
  readonly browserSessionPostCount: 1;
  readonly controlEvents: VisualizationLessonButtonClickControlEvents;
  readonly durability: VisualizationLessonFirstInteractionReceipt | null;
  readonly expectedControl: VisualizationLessonExpectedButtonClick;
  readonly ordinal: 1;
  readonly rawIncluded: boolean;
  readonly requestBody: unknown;
  readonly requestBytes: string;
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly requestId: number;
  readonly requestOrigin: string;
  readonly requestPathname: string;
  readonly requestUrl: string;
  readonly response: BrowserResponseReceipt;
  readonly storage: VisualizationLessonBrowserStorageReceipt;
};

export type VisualizationLessonBrowserSecondInteractionReceipt = {
  readonly browserDigest: string;
  readonly browserEventCount: number;
  readonly browserSessionPostCount: 1;
  readonly controlEvents: VisualizationLessonButtonClickControlEvents;
  readonly controlObserverStop: VisualizationLessonControlObserverStopReceipt;
  readonly expectedControl: VisualizationLessonExpectedButtonClick;
  readonly ordinal: 2;
  readonly storage: VisualizationLessonBrowserStorageReceipt;
};

export type VisualizationLessonBrowserReplayReceipt = {
  readonly directReplayCount: 1;
  readonly duplicate: VisualizationLessonDuplicateReplayReceipt;
  readonly request: VisualizationLessonApiRequestReceipt;
  readonly responseBytes: string;
  readonly responseSha256: string;
};

export type VisualizationLessonDurabilityFinalReceipt = {
  readonly apiRequests: readonly VisualizationLessonApiRequestReceipt[];
  readonly browserSessionPostCount: 1;
  readonly controlEvents: {
    readonly first: VisualizationLessonButtonClickControlEvents;
    readonly second: VisualizationLessonButtonClickControlEvents;
  };
  readonly controlObserverStop: VisualizationLessonControlObserverStopReceipt;
  readonly coverage: "browser" | "full-raw-replay";
  readonly directReplayCount: 0 | 1;
  readonly expectedControl: {
    readonly first: VisualizationLessonExpectedButtonClick;
    readonly second: VisualizationLessonExpectedButtonClick;
  };
  readonly first: VisualizationLessonBrowserFirstInteractionReceipt;
  readonly identity: {
    readonly appOrigin: string;
    readonly grade: string;
    readonly lessonPathname: string;
    readonly lessonSlug: string;
    readonly moduleId: "configured-visualization-lab";
    readonly selectedTopicId: string;
    readonly siblingTopicIds: readonly string[];
    readonly source: string;
    readonly userId: string;
  };
  readonly learnerProfileSetup: VisualizationLessonLearnerProfileSetupReceipt;
  readonly manifest: StarshipPathManifestReceipt;
  readonly mount: VisualizationLessonBrowserMountReceipt;
  readonly mutations: readonly VisualizationLessonBrowserMutationLedgerReceipt[];
  readonly navigation: {
    readonly historyDrifts: readonly BrowserHistoryDriftReceipt[];
    readonly location: BrowserPageLocationReceipt;
    readonly mainFrameNavigations: readonly {
      readonly sequence: number;
      readonly url: string;
    }[];
  };
  readonly projectName: string;
  readonly replay: VisualizationLessonBrowserReplayReceipt | null;
  readonly requests: readonly VisualizationLessonBrowserRequestIdentityReceipt[];
  readonly second: VisualizationLessonBrowserSecondInteractionReceipt;
  readonly seal: BrowserSealSnapshotReceipt & {
    readonly compositeSha256: string;
    readonly linearization:
      "browser-task-sealed-after-immutable-snapshot-digests-and-confirmed-after-125ms";
    readonly networkSha256: string;
    readonly terminalEpoch: number;
  };
  readonly storage: VisualizationLessonBrowserStorageReceipt;
  readonly storageEvents: readonly BrowserStorageEventReceipt[];
  readonly testOutputDir: string;
  readonly title: string;
  readonly topology: {
    readonly applicationEvents: readonly BrowserApplicationTopologyEventReceipt[];
    readonly arm: BrowserTopologySnapshotReceipt;
    readonly current: BrowserTopologySnapshotReceipt;
    readonly events: readonly BrowserTopologyEventReceipt[];
    readonly listenerCleanup: BrowserListenerCleanupReceipt;
  };
};

export class VisualizationLessonBrowserDurabilityError extends Error {
  readonly code = "VISUALIZATION_LESSON_BROWSER_DURABILITY" as const;

  constructor(message: string) {
    super(`VISUALIZATION_LESSON_BROWSER_DURABILITY: ${message}`);
    this.name = "VisualizationLessonBrowserDurabilityError";
  }
}

type PreparedLearnerProfileMetadata = {
  readonly appOrigin: string;
  readonly completedAtMs: number;
  readonly context: BrowserContext;
  readonly page: Page;
  readonly requestContext: Page["request"];
  readonly startedAtMs: number;
};

const preparedLearnerProfileReceipts = new WeakMap<object, PreparedLearnerProfileMetadata>();
const consumedLearnerProfileReceipts = new WeakSet<object>();
const learnerProfileReceiptMaxAgeMs = 30_000;

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Evidence contains a non-finite number.");
    return JSON.stringify(value);
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === undefined) {
    throw new TypeError(`Evidence contains a non-JSON ${typeof value}.`);
  }
  if (seen.has(value)) throw new TypeError("Evidence contains a cycle.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry, seen)).join(",")}]`;
    if (!isPlainRecord(value)) throw new TypeError("Evidence contains a non-plain object.");
    const keys = Object.keys(value).sort(compareExactStrings);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function sha256(bytes: string) {
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

function evidenceSha256(value: unknown) {
  return sha256(canonicalJson(value));
}

function compareExactStrings(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

function jsonCloneFrozen<T>(value: T, label: string): T {
  let bytes: string;
  try {
    bytes = JSON.stringify(value);
  } catch (error) {
    throw new TypeError(`${label} is not JSON-safe: ${String(error)}`);
  }
  if (bytes === undefined) throw new TypeError(`${label} is not JSON-safe.`);
  return deepFreeze(JSON.parse(bytes) as T);
}

function assertCanonicalIdentity(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 256 ||
    value.trim() !== value
  ) {
    throw new TypeError(`${label} must be a canonical non-empty identity.`);
  }
}

function assertExactOwnKeys(value: unknown, expectedKeys: readonly string[], label: string) {
  if (!isPlainRecord(value)) {
    throw new VisualizationLessonBrowserDurabilityError(`${label} is not an object.`);
  }
  const actual = Reflect.ownKeys(value);
  const expected = [...expectedKeys].sort(compareExactStrings);
  if (
    actual.some((key) => typeof key !== "string") ||
    actual.length !== expected.length ||
    (actual as string[]).sort(compareExactStrings).join("\u0000") !== expected.join("\u0000")
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} keys are not exact; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}.`,
    );
  }
  return value;
}

function canonicalExpectedButtonClick(
  value: unknown,
): VisualizationLessonExpectedButtonClick {
  assertExactOwnKeys(value, ["controlKey", "eventTypes"], "expectedButtonClick");
  const candidate = value as JsonRecord;
  assertCanonicalIdentity(candidate.controlKey, "expectedButtonClick.controlKey");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(candidate.controlKey)) {
    throw new VisualizationLessonBrowserDurabilityError(
      "expectedButtonClick.controlKey is not a canonical learner-control key.",
    );
  }
  if (!Array.isArray(candidate.eventTypes)) {
    throw new VisualizationLessonBrowserDurabilityError(
      "expectedButtonClick.eventTypes must be the exact button-click tuple [pointerup, click].",
    );
  }
  const eventTypeKeys = Reflect.ownKeys(candidate.eventTypes);
  if (
    eventTypeKeys.length !== 3 ||
    eventTypeKeys[0] !== "0" ||
    eventTypeKeys[1] !== "1" ||
    eventTypeKeys[2] !== "length" ||
    candidate.eventTypes[0] !== "pointerup" ||
    candidate.eventTypes[1] !== "click"
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      "expectedButtonClick.eventTypes must be exactly [pointerup, click] with no extra keys.",
    );
  }
  return deepFreeze({
    controlKey: candidate.controlKey,
    eventTypes: ["pointerup", "click"],
  });
}

function exactButtonClickControlEvents(
  events: readonly InteractionEventReceipt[],
  fence: VisualizationLessonRealControlFence,
  phase: "first" | "second",
): VisualizationLessonButtonClickControlEvents {
  const delta = events.slice(fence.eventCount);
  if (delta.length === 0) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${phase} real-control event is absent; the exact button click requires pointerup then click.`,
    );
  }
  if (delta.length !== fence.expectedControl.eventTypes.length) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${phase} real-control button click requires exactly ${fence.expectedControl.eventTypes.length} observer events; actual=${delta.length}.`,
    );
  }
  for (const [index, event] of delta.entries()) {
    const expectedType = fence.expectedControl.eventTypes[index]!;
    const expectedSequence = fence.eventCount + index + 1;
    if (
      !hasExactOwnKeys(event, ["controlKey", "key", "sequence", "type"]) ||
      event.controlKey !== fence.expectedControl.controlKey ||
      event.key !== null ||
      event.sequence !== expectedSequence ||
      event.type !== expectedType
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `${phase} real-control button click observer delta is not exact at index ${index}; expected=${canonicalJson({
          controlKey: fence.expectedControl.controlKey,
          key: null,
          sequence: expectedSequence,
          type: expectedType,
        })} actual=${canonicalJson(event)}.`,
      );
    }
  }
  return deepFreeze(delta.map((event) => ({ ...event })) as unknown as VisualizationLessonButtonClickControlEvents);
}

const controlObserverEventTypes = ["change", "click", "input", "keyup", "pointerup"] as const;

function exactTwoButtonClickControlLedger(
  value: unknown,
  label: string,
): VisualizationLessonTwoButtonClickControlLedger {
  if (!Array.isArray(value)) {
    throw new VisualizationLessonBrowserDurabilityError(`${label} is not an array.`);
  }
  const arrayKeys = Reflect.ownKeys(value);
  if (
    arrayKeys.length !== 5 ||
    arrayKeys[0] !== "0" ||
    arrayKeys[1] !== "1" ||
    arrayKeys[2] !== "2" ||
    arrayKeys[3] !== "3" ||
    arrayKeys[4] !== "length"
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} must contain exactly four dense events with no extra keys.`,
    );
  }
  const expectedTypes = ["pointerup", "click", "pointerup", "click"] as const;
  const events = value as unknown as InteractionEventReceipt[];
  for (const [index, event] of events.entries()) {
    if (
      !hasExactOwnKeys(event, ["controlKey", "key", "sequence", "type"]) ||
      typeof event.controlKey !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(event.controlKey) ||
      event.key !== null ||
      event.sequence !== index + 1 ||
      event.type !== expectedTypes[index]
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `${label} is not the exact ordered two-button-click ledger at index ${index}: ${canonicalJson(event)}.`,
      );
    }
  }
  if (events[0]!.controlKey !== events[1]!.controlKey || events[2]!.controlKey !== events[3]!.controlKey) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} does not bind each pointerup/click pair to one exact learner control.`,
    );
  }
  return deepFreeze(
    events.map((event) => ({ ...event })) as unknown as VisualizationLessonTwoButtonClickControlLedger,
  );
}

function canonicalControlObserverStopReceipt(
  value: unknown,
  adapterId: string,
  label: string,
): VisualizationLessonControlObserverStopReceipt {
  assertExactOwnKeys(value, [
    "active",
    "adapterId",
    "eventCount",
    "events",
    "eventsSha256",
    "lastSequence",
    "removalCount",
    "removedEventTypes",
    "removedExactlyOnce",
    "removedListenerCount",
    "stopId",
  ], label);
  const candidate = value as JsonRecord;
  const events = exactTwoButtonClickControlLedger(candidate.events, `${label}.events`);
  if (!Array.isArray(candidate.removedEventTypes)) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label}.removedEventTypes is not the exact control-listener tuple.`,
    );
  }
  const removedEventTypeKeys = Reflect.ownKeys(candidate.removedEventTypes);
  if (
    removedEventTypeKeys.length !== 6 ||
    removedEventTypeKeys[0] !== "0" ||
    removedEventTypeKeys[1] !== "1" ||
    removedEventTypeKeys[2] !== "2" ||
    removedEventTypeKeys[3] !== "3" ||
    removedEventTypeKeys[4] !== "4" ||
    removedEventTypeKeys[5] !== "length" ||
    candidate.removedEventTypes.some(
      (eventType, index) => eventType !== controlObserverEventTypes[index],
    )
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label}.removedEventTypes is not exactly ${canonicalJson(controlObserverEventTypes)}.`,
    );
  }
  if (
    candidate.active !== false ||
    candidate.adapterId !== adapterId ||
    candidate.eventCount !== 4 ||
    typeof candidate.eventsSha256 !== "string" ||
    candidate.eventsSha256 !== evidenceSha256(events) ||
    candidate.lastSequence !== 4 ||
    candidate.removalCount !== 1 ||
    candidate.removedExactlyOnce !== true ||
    candidate.removedListenerCount !== 5 ||
    candidate.stopId !== `${adapterId}:control-observer-stop:1`
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} does not prove this adapter's exact once-only inactive four-event observer stop.`,
    );
  }
  return deepFreeze({
    active: false,
    adapterId,
    eventCount: 4,
    events,
    eventsSha256: candidate.eventsSha256,
    lastSequence: 4,
    removalCount: 1,
    removedEventTypes: [...controlObserverEventTypes],
    removedExactlyOnce: true,
    removedListenerCount: 5,
    stopId: candidate.stopId,
  });
}

function canonicalStarshipPath(label: string, value: unknown) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    !value.startsWith("/Volumes/Starship/") ||
    path.resolve(value) !== value ||
    path.normalize(value) !== value ||
    value.includes("\u0000")
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} is not one canonical absolute /Volumes/Starship child: ${JSON.stringify(value)}.`,
    );
  }
  let ancestor = value;
  const missing: string[] = [];
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    missing.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  const canonical = path.join(realpathSync.native(ancestor), ...missing);
  if (!canonical.startsWith("/Volumes/Starship/")) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} resolves outside /Volumes/Starship: ${canonical}.`,
    );
  }
  if (canonical !== value) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} is a symlink or non-canonical alias; actual=${JSON.stringify(value)} resolved=${JSON.stringify(canonical)}.`,
    );
  }
  return canonical;
}

function isChildPath(candidate: string, parent: string) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function storageMatchers(userId: string) {
  const user = encodeURIComponent(userId);
  const exactKeys: string[] = [
    learningAnalyticsBoundaryLineageStorageKey(userId),
    learningAnalyticsClearFenceStorageKey(userId),
    learningAnalyticsGenerationStorageKey(userId),
    learningAnalyticsGenerationHandshakeStorageKey(userId),
    learningAnalyticsGenerationTransitionStorageKey(userId),
    `mais:learning-analytics-outbox:v1:${user}`,
    `mais:learning-analytics-outbox:v1:${user}:quarantine`,
  ];
  const prefixes: string[] = [
    `mais:visualization-session-outbox:v1:${user}/`,
    `mais:visualization-session-outbox-quarantine:v1:${user}:`,
    `mais:visualization-session-outbox-legacy-terminal:v1:${user}:`,
    `mais:learning-analytics-outbox:v2:${user}:`,
    `mais:learning-analytics-unconfirmed-outbox:v1:${user}:`,
    `mais:learning-analytics-generation-quarantine:v1:${user}:`,
    `mais:learning-analytics-corrupt-outbox:v1:${user}:`,
    `mais:viz-completion-telemetry:v1:${user}/`,
  ];
  return {
    exactKeys,
    prefixes,
  };
}

function storageFamilyForKey(key: string, userId: string): StorageFamily {
  const user = encodeURIComponent(userId);
  if (key === learningAnalyticsBoundaryLineageStorageKey(userId)) return "analytics-boundary-lineage";
  if (key === learningAnalyticsClearFenceStorageKey(userId)) return "analytics-clear-fence";
  if (key === learningAnalyticsGenerationStorageKey(userId)) return "analytics-generation";
  if (key === learningAnalyticsGenerationHandshakeStorageKey(userId)) return "analytics-generation-handshake";
  if (key === learningAnalyticsGenerationTransitionStorageKey(userId)) return "analytics-generation-transition";
  if (key.startsWith(`mais:visualization-session-outbox:v1:${user}/`)) return "session-live";
  if (key.startsWith(`mais:visualization-session-outbox-quarantine:v1:${user}:`)) return "session-quarantine";
  if (key.startsWith(`mais:visualization-session-outbox-legacy-terminal:v1:${user}:`)) return "session-legacy-terminal";
  if (key.startsWith(`mais:learning-analytics-outbox:v2:${user}:`)) return "analytics-confirmed";
  if (key.startsWith(`mais:learning-analytics-unconfirmed-outbox:v1:${user}:`)) return "analytics-unconfirmed";
  if (key.startsWith(`mais:learning-analytics-generation-quarantine:v1:${user}:`)) return "analytics-quarantine";
  if (key.startsWith(`mais:learning-analytics-corrupt-outbox:v1:${user}:`)) return "analytics-corrupt";
  if (key.startsWith(`mais:viz-completion-telemetry:v1:${user}/`)) return "completion-telemetry";
  if (
    key === `mais:learning-analytics-outbox:v1:${user}` ||
    key === `mais:learning-analytics-outbox:v1:${user}:quarantine`
  ) return "analytics-legacy";
  throw new VisualizationLessonBrowserDurabilityError(
    `unclassified storage key escaped the exact family inventory: ${JSON.stringify(key)}.`,
  );
}

function hasExactOwnKeys(value: unknown, expectedKeys: readonly string[]) {
  if (!isPlainRecord(value)) return false;
  const actual = Reflect.ownKeys(value);
  return actual.every((key): key is string => typeof key === "string") &&
    actual.length === expectedKeys.length &&
    [...actual].sort(compareExactStrings).join("\u0000") ===
      [...expectedKeys].sort(compareExactStrings).join("\u0000");
}

function validProtocolId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 240;
}

function validateProtocolControlStorageEntries(
  entries: readonly BrowserStorageEntry[],
  userId: string,
) {
  const byKey = new Map(entries.map(({ key, raw }) => [key, raw]));
  const storage = {
    getItem(key: string) {
      return byKey.get(key) ?? null;
    },
  };
  const fail = (entry: BrowserStorageEntry, reason: string): never => {
    throw new VisualizationLessonBrowserDurabilityError(
      `analytics protocol marker is poison because its production schema is invalid; key=${JSON.stringify(entry.key)} family=${entry.family} reason=${reason}.`,
    );
  };
  for (const entry of entries) {
    switch (entry.family) {
      case "analytics-generation": {
        if (
          typeof entry.parsed !== "number" ||
          !Number.isSafeInteger(entry.parsed) ||
          entry.parsed < 0
        ) fail(entry, "generation-not-non-negative-safe-integer");
        break;
      }
      case "analytics-clear-fence": {
        const version = isPlainRecord(entry.parsed) ? entry.parsed.version : null;
        const exactKeys = version === 1
          ? [
              "baseGeneration", "clearedCompletionStorageKeys", "clearedStorageKeys",
              "deleteAttemptedAt", "requestId", "requestedAt", "userId", "version",
            ]
          : [
              "baseGeneration", "clearedCompletionStorageKeys", "clearedStorageKeys",
              "completionClaims", "deleteAttemptedAt", "phase", "requestId", "requestedAt",
              "userId", "version",
            ];
        if (
          !hasExactOwnKeys(entry.parsed, exactKeys) ||
          readLearningAnalyticsClearFence(storage, userId).status !== "valid"
        ) fail(entry, "clear-fence-normalization-failed");
        break;
      }
      case "analytics-generation-handshake": {
        const version = isPlainRecord(entry.parsed) ? entry.parsed.version : null;
        const exactKeys = version === 1
          ? ["existingUnconfirmedEventIds", "generation", "requestId", "startedAt", "userId", "version"]
          : ["existingUnconfirmedEventIds", "generation", "phase", "requestId", "startedAt", "userId", "version"];
        if (
          !hasExactOwnKeys(entry.parsed, exactKeys) ||
          readLearningAnalyticsGenerationHandshake(storage, userId).status !== "valid"
        ) fail(entry, "generation-handshake-normalization-failed");
        break;
      }
      case "analytics-generation-transition": {
        const version = isPlainRecord(entry.parsed) ? entry.parsed.version : null;
        const exactKeys = version === 1
          ? [
              "boundaryClearedAt", "clearedCompletionStorageKeys", "fromGeneration", "kind",
              "preparedAt", "preserveAllUnconfirmed", "preserveEventIds", "quarantineEventIds",
              "toGeneration", "transitionId", "userId", "version",
            ]
          : [
              "boundaryClearedAt", "clearedCompletionStorageKeys", "completionClaims",
              "fromGeneration", "kind", "phase", "preparedAt", "preserveAllUnconfirmed",
              "preserveEventIds", "preserveUnconfirmedStorageKeys",
              "quarantineConfirmedStorageKeys", "quarantineEventIds",
              "quarantineUnconfirmedStorageKeys", "toGeneration", "transitionId", "userId",
              "version",
            ];
        if (
          !hasExactOwnKeys(entry.parsed, exactKeys) ||
          readLearningAnalyticsGenerationTransition(storage, userId).status !== "valid"
        ) fail(entry, "generation-transition-normalization-failed");
        break;
      }
      case "analytics-boundary-lineage": {
        const record = entry.parsed;
        if (
          !hasExactOwnKeys(record, ["generation", "preservedBoundaryTokens", "userId", "version"]) ||
          !isPlainRecord(record) ||
          record.version !== 1 ||
          record.userId !== userId ||
          typeof record.generation !== "number" ||
          !Number.isSafeInteger(record.generation) ||
          record.generation < 0 ||
          !Array.isArray(record.preservedBoundaryTokens) ||
          !record.preservedBoundaryTokens.every(validProtocolId) ||
          new Set(record.preservedBoundaryTokens).size !== record.preservedBoundaryTokens.length
        ) fail(entry, "boundary-lineage-normalization-failed");
        break;
      }
      default:
        break;
    }
  }
}

function parseStorageSnapshot(rawEntries: readonly RawStorageEntry[], userId: string) {
  const sorted = [...rawEntries].sort((left, right) => compareExactStrings(left.key, right.key));
  const seen = new Set<string>();
  const entries: BrowserStorageEntry[] = [];
  for (const entry of sorted) {
    if (seen.has(entry.key)) {
      throw new VisualizationLessonBrowserDurabilityError(
        `storage snapshot contains duplicate key ${JSON.stringify(entry.key)}.`,
      );
    }
    seen.add(entry.key);
    if (typeof entry.raw !== "string") {
      throw new VisualizationLessonBrowserDurabilityError(
        `storage value is unavailable for ${JSON.stringify(entry.key)}.`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry.raw) as unknown;
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `storage JSON parsing failed for ${JSON.stringify(entry.key)}: ${String(error)}.`,
      );
    }
    entries.push({
      family: storageFamilyForKey(entry.key, userId),
      key: entry.key,
      parsed,
      raw: entry.raw,
      rawSha256: sha256(entry.raw),
    });
  }
  const liveSessionRecords = entries
    .filter(({ family }) => family === "session-live")
    .map(({ parsed }) => parsed);
  const liveAnalyticsRecords = entries
    .filter(({ family }) =>
      family === "analytics-confirmed" ||
      family === "analytics-unconfirmed" ||
      family === "analytics-legacy" ||
      family === "completion-telemetry")
    .map(({ parsed }) => parsed);
  const poisonKeys = entries
    .filter(({ family, key }) =>
      family === "session-quarantine" ||
      family === "session-legacy-terminal" ||
      family === "analytics-quarantine" ||
      family === "analytics-corrupt" ||
      (family === "analytics-legacy" && key.endsWith(":quarantine")))
    .map(({ key }) => key);
  const protocolControlFamilies = new Set<StorageFamily>([
    "analytics-boundary-lineage",
    "analytics-clear-fence",
    "analytics-generation",
    "analytics-generation-handshake",
    "analytics-generation-transition",
  ]);
  const protocolControlEntries = entries.filter(({ family }) =>
    protocolControlFamilies.has(family)
  );
  validateProtocolControlStorageEntries(protocolControlEntries, userId);
  const outboxEntries = entries.filter(({ family }) =>
    !protocolControlFamilies.has(family)
  );
  return deepFreeze({
    digest: evidenceSha256(entries.map(({ key, raw }) => ({ key, raw }))),
    entries,
    liveAnalyticsRecords,
    liveSessionRecords,
    outboxEntries,
    poisonKeys,
    protocolControlEntries,
  } satisfies VisualizationLessonBrowserStorageReceipt);
}

function parseJsonBytes(bytes: string, label: string) {
  if (typeof bytes !== "string" || bytes.length === 0) {
    throw new VisualizationLessonBrowserDurabilityError(`${label} response bytes are empty.`);
  }
  try {
    return JSON.parse(bytes) as unknown;
  } catch (error) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} response JSON parsing failed: ${String(error)}.`,
    );
  }
}

function isLocalApplicationUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function canonicalApplicationOrigin(value: unknown) {
  if (typeof value !== "string") {
    throw new TypeError("expected.appOrigin must be one exact origin string.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new TypeError(`expected.appOrigin is invalid: ${String(error)}.`);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.origin !== value ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new TypeError(
      `expected.appOrigin must be one canonical local HTTP(S) scheme/host/port origin; actual=${JSON.stringify(value)}.`,
    );
  }
  return url.origin;
}

function browserRequestIsMutation(record: ObservedBrowserRequest) {
  return !safeMethods.has(record.method);
}

function requestKey(record: ObservedBrowserRequest) {
  return `${record.id}:${record.method} ${record.origin}${record.pathname}`;
}

function exactApiSessionsEnvelope(response: APIResponse, bytes: string, label: string) {
  if (response.status() !== 200) {
    throw new VisualizationLessonBrowserDurabilityError(
      `${label} status is not exactly 200; actual=${response.status()} bytes=${JSON.stringify(bytes)}.`,
    );
  }
  const body = assertExactOwnKeys(parseJsonBytes(bytes, label), ["sessions"], `${label} body`);
  const sessions = body.sessions;
  if (!Array.isArray(sessions)) {
    throw new VisualizationLessonBrowserDurabilityError(`${label} sessions is not an array.`);
  }
  return { body: { sessions }, responseBytes: bytes, status: response.status() };
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function exactApiTarget(appOrigin: string, pathname: string) {
  const target = new URL(pathname, `${appOrigin}/`);
  if (
    target.origin !== appOrigin ||
    target.pathname !== pathname ||
    target.search !== "" ||
    target.hash !== "" ||
    target.href !== `${appOrigin}${pathname}`
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `API target is not exact; origin=${JSON.stringify(appOrigin)} pathname=${JSON.stringify(pathname)} target=${target.href}.`,
    );
  }
  return target.href;
}

function exactApiRequestReceipt({
  appOrigin,
  completedAtMs,
  method,
  pathname,
  requestBytes,
  response,
  responseBytes,
  startedAtMs,
}: {
  readonly appOrigin: string;
  readonly completedAtMs: number;
  readonly method: "GET" | "PATCH" | "POST";
  readonly pathname: string;
  readonly requestBytes: string | null;
  readonly response: APIResponse;
  readonly responseBytes: string;
  readonly startedAtMs: number;
}): VisualizationLessonApiRequestReceipt {
  const url = exactApiTarget(appOrigin, pathname);
  const responseUrl = response.url();
  let parsedResponseUrl: URL;
  try {
    parsedResponseUrl = new URL(responseUrl);
  } catch (error) {
    throw new VisualizationLessonBrowserDurabilityError(
      `API response URL is invalid for ${method} ${pathname}: ${String(error)}.`,
    );
  }
  if (
    responseUrl !== url ||
    parsedResponseUrl.origin !== appOrigin ||
    parsedResponseUrl.pathname !== pathname ||
    parsedResponseUrl.search !== "" ||
    parsedResponseUrl.hash !== ""
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `API response URL target drifted for ${method} ${pathname}; expected=${url} actual=${responseUrl}.`,
    );
  }
  return deepFreeze({
    completedAt: new Date(completedAtMs).toISOString(),
    method,
    origin: appOrigin,
    pathname,
    requestBodySha256: requestBytes === null ? null : sha256(requestBytes),
    requestBytes,
    responseBytes,
    responseSha256: sha256(responseBytes),
    responseUrl,
    startedAt: new Date(startedAtMs).toISOString(),
    statusCode: response.status(),
    url,
  });
}

export async function prepareVisualizationLessonLearnerProfileBeforeArm({
  appOrigin,
  page,
  userId,
}: {
  readonly appOrigin: string;
  readonly page: Page;
  readonly userId: string;
}): Promise<VisualizationLessonLearnerProfileSetupReceipt> {
  assertCanonicalIdentity(userId, "learner profile userId");
  const expectedAppOrigin = canonicalApplicationOrigin(appOrigin);
  if (page.url() !== "about:blank") {
    throw new VisualizationLessonBrowserDurabilityError(
      `learner profile setup must run before navigation; current URL=${page.url()}.`,
    );
  }
  const requestBytes = JSON.stringify(exactLearnerProfileSetupBody);
  const requestContext = page.request;
  const context = page.context();
  const startedAtMs = Date.now();
  const response = await requestContext.patch(
    exactApiTarget(expectedAppOrigin, exactLearnerProfilePath),
    {
      data: requestBytes,
      headers: { "Content-Type": "application/json" },
      maxRedirects: 0,
    },
  );
  const responseBytes = await response.text();
  const completedAtMs = Date.now();
  if (
    completedAtMs < startedAtMs ||
    completedAtMs - startedAtMs > learnerProfileReceiptMaxAgeMs
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `learner profile setup exceeded its bounded preparation window; started=${startedAtMs} completed=${completedAtMs}.`,
    );
  }
  const request = exactApiRequestReceipt({
    appOrigin: expectedAppOrigin,
    completedAtMs,
    method: "PATCH",
    pathname: exactLearnerProfilePath,
    requestBytes,
    response,
    responseBytes,
    startedAtMs,
  });
  if (response.status() !== 200) {
    throw new VisualizationLessonBrowserDurabilityError(
      `learner profile setup status is not exactly 200; actual=${response.status()} bytes=${JSON.stringify(responseBytes)}.`,
    );
  }
  const body = assertExactOwnKeys(
    parseJsonBytes(responseBytes, "learner profile setup"),
    ["learnerProfile", "shouldShowOnboarding"],
    "learner profile setup body",
  );
  const learnerProfile = assertExactOwnKeys(
    body.learnerProfile,
    [
      "answers",
      "initializedFrom",
      "questionnaireVersion",
      "skippedAt",
      "status",
      "updatedAt",
      "userId",
    ],
    "learner profile setup learnerProfile",
  );
  const answers = assertExactOwnKeys(
    learnerProfile.answers,
    ["challenge", "goal", "help"],
    "learner profile setup answers",
  );
  if (
    body.shouldShowOnboarding !== false ||
    learnerProfile.userId !== userId ||
    learnerProfile.status !== "skipped" ||
    learnerProfile.questionnaireVersion !== "learner-start-v1" ||
    learnerProfile.initializedFrom !== "login-onboarding" ||
    answers.goal !== "repair" ||
    answers.challenge !== "balanced" ||
    answers.help !== "hint" ||
    !isCanonicalIso(learnerProfile.skippedAt) ||
    learnerProfile.updatedAt !== learnerProfile.skippedAt ||
    Date.parse(learnerProfile.skippedAt) < startedAtMs ||
    Date.parse(learnerProfile.skippedAt) > completedAtMs
  ) {
    throw new VisualizationLessonBrowserDurabilityError(
      `learner profile setup acknowledgement is not the exact skipped identity: ${canonicalJson(body)}.`,
    );
  }
  if (page.url() !== "about:blank") {
    throw new VisualizationLessonBrowserDurabilityError(
      `learner profile setup navigated the page unexpectedly; current URL=${page.url()}.`,
    );
  }
  const receipt = deepFreeze({
    appOrigin: expectedAppOrigin,
    completedAt: request.completedAt,
    method: "PATCH" as const,
    pathname: "/api/me/learner-profile" as const,
    request,
    requestBodySha256: sha256(requestBytes),
    responseBytes,
    responseSha256: sha256(responseBytes),
    shouldShowOnboarding: false as const,
    skippedAt: learnerProfile.skippedAt as string,
    startedAt: request.startedAt,
    status: "skipped" as const,
    statusCode: 200 as const,
    userId,
  });
  preparedLearnerProfileReceipts.set(receipt, {
    appOrigin: expectedAppOrigin,
    completedAtMs,
    context,
    page,
    requestContext,
    startedAtMs,
  });
  return receipt;
}

function syntheticPendingVerdict(
  pending: readonly string[],
  hardFailures: readonly string[],
  terminalDigest: string,
): VisualizationLessonMountTerminalVerdict {
  return deepFreeze({
    hardFailures: [...hardFailures],
    pending: [...pending],
    rawPayloadSha256: "0".repeat(64),
    rawRevision: 0,
    terminal: false,
    terminalDigest,
  });
}

export function createVisualizationLessonDurabilityBrowserAdapter(
  input: VisualizationLessonDurabilityBrowserAdapterInput,
) {
  const databasePath = assertStarshipVisualizationDatabasePath(input.databasePath);
  const expectedAppOrigin = canonicalApplicationOrigin(input.expected.appOrigin);
  const expectedLessonPathname = `/student/lessons/${encodeURIComponent(input.expected.lessonSlug)}`;
  assertCanonicalIdentity(input.expected.grade, "expected.grade");
  assertCanonicalIdentity(input.expected.userId, "expected.userId");
  assertCanonicalIdentity(input.expected.moduleId, "expected.moduleId");
  assertCanonicalIdentity(input.expected.selectedTopicId, "expected.selectedTopicId");
  assertCanonicalIdentity(input.expected.lessonSlug, "expected.lessonSlug");
  assertCanonicalIdentity(input.expected.source, "expected.source");
  const derivedLessonSlug = lessonSlugForTopicId(input.expected.selectedTopicId);
  if (input.expected.lessonSlug !== derivedLessonSlug) {
    throw new TypeError(
      `expected.lessonSlug must equal lessonSlugForTopicId(expected.selectedTopicId); expected=${JSON.stringify(derivedLessonSlug)} actual=${JSON.stringify(input.expected.lessonSlug)}.`,
    );
  }
  if (input.expected.moduleId !== "configured-visualization-lab") {
    throw new TypeError("expected.moduleId must be configured-visualization-lab.");
  }
  const siblingSet = new Set<string>();
  for (const siblingTopicId of input.expected.siblingTopicIds) {
    assertCanonicalIdentity(siblingTopicId, "expected.siblingTopicIds[]");
    if (siblingTopicId === input.expected.selectedTopicId || siblingSet.has(siblingTopicId)) {
      throw new TypeError("expected.siblingTopicIds must be unique and exclude selectedTopicId.");
    }
    siblingSet.add(siblingTopicId);
  }
  if (!input.rootSelector.trim() || !input.controlSelector.trim()) {
    throw new TypeError("rootSelector and controlSelector must be non-empty.");
  }

  const adapterId = `viz-durability-${randomUUID()}`;
  const page = input.page;
  const networkByRequest = new Map<Request, ObservedBrowserRequest>();
  const orderedNetwork: ObservedBrowserRequest[] = [];
  const responseTasks = new Map<Request, Promise<void>>();
  const apiRequestReceipts: VisualizationLessonApiRequestReceipt[] = [];
  const hardErrors: string[] = [];
  const topologyEvents: BrowserTopologyEventReceipt[] = [];
  const mainFrameNavigations: Array<{ sequence: number; url: string }> = [];
  const initialStorageMatchers = storageMatchers(input.expected.userId);
  const terminalStorageMatchers = storageMatchers(input.expected.userId);
  let armed = false;
  let learnerProfileSetupReceipt: VisualizationLessonLearnerProfileSetupReceipt | null = null;
  let manifest: StarshipPathManifestReceipt | null = null;
  let networkSequence = 0;
  let terminalEpoch = 0;
  let directReplayCount = 0;
  let mountReceipt: VisualizationLessonBrowserMountReceipt | null = null;
  let firstReceipt: VisualizationLessonBrowserFirstInteractionReceipt | null = null;
  let secondReceipt: VisualizationLessonBrowserSecondInteractionReceipt | null = null;
  let replayReceipt: VisualizationLessonBrowserReplayReceipt | null = null;
  let firstFence: VisualizationLessonRealControlFence | null = null;
  let secondFence: VisualizationLessonRealControlFence | null = null;
  let terminalMountMutationIds: readonly number[] | null = null;
  let exactLessonNavigationSeen = false;
  let secondControlFinishState: "failed" | "idle" | "running" | "sealed" = "idle";
  let controlObserverCleanupExpectedLedger: VisualizationLessonTwoButtonClickControlLedger | null = null;
  let controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null = null;
  let finalReceiptState: "failed" | "idle" | "running" | "sealed" = "idle";
  let armedContext: BrowserContext | null = null;
  let armedMainFrame: Frame | null = null;
  let armTopology: BrowserTopologySnapshotReceipt | null = null;
  let listenerCleanupState: "active" | "not-installed" | "removed" = "not-installed";
  let listenerCleanupReceipt: BrowserListenerCleanupReceipt | null = null;

  const assertExactLessonPageUrl = (): BrowserPageLocationReceipt => {
    let navigatedUrl: URL;
    try {
      navigatedUrl = new URL(page.url());
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `navigated lesson page URL is invalid: ${String(error)}.`,
      );
    }
    if (
      navigatedUrl.origin !== expectedAppOrigin ||
      navigatedUrl.pathname !== expectedLessonPathname ||
      navigatedUrl.search !== "" ||
      navigatedUrl.hash !== ""
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `navigated lesson page URL is not exact; expected=${expectedAppOrigin}${expectedLessonPathname} actual=${page.url()}.`,
      );
    }
    return deepFreeze({
      hash: navigatedUrl.hash,
      href: navigatedUrl.href,
      origin: navigatedUrl.origin,
      pathname: navigatedUrl.pathname,
      search: navigatedUrl.search,
    });
  };

  const pushHard = (message: string) => {
    if (!hardErrors.includes(message)) hardErrors.push(message);
  };

  const advanceTerminalEpoch = () => {
    terminalEpoch += 1;
  };

  const recordPageTopologyViolation = (
    kind: "context-page" | "page-popup",
    candidate: Page,
  ) => {
    let url = "<unavailable>";
    try {
      url = candidate.url();
    } catch {
      // The topology violation is already terminal even if the new Page cannot expose a URL.
    }
    topologyEvents.push({
      kind,
      sequence: topologyEvents.length + 1,
      url,
    });
    advanceTerminalEpoch();
    pushHard(
      `browser topology violation ${kind}; url=${JSON.stringify(url)} sequence=${topologyEvents.length}`,
    );
  };

  const captureContextPage = (candidate: Page) => {
    recordPageTopologyViolation("context-page", candidate);
  };

  const capturePopup = (candidate: Page) => {
    recordPageTopologyViolation("page-popup", candidate);
  };

  const recordFrameTopologyViolation = (
    kind: "auxiliary-frame-navigated" | "frame-attached" | "frame-detached",
    candidate: Frame,
  ) => {
    let url = "<unavailable>";
    try {
      url = candidate.url();
    } catch {
      // The attachment is terminal even if the Frame cannot expose a URL.
    }
    topologyEvents.push({
      kind,
      sequence: topologyEvents.length + 1,
      url,
    });
    advanceTerminalEpoch();
    pushHard(
      `browser topology violation ${kind}; url=${JSON.stringify(url)} sequence=${topologyEvents.length}`,
    );
  };

  const captureFrameAttached = (candidate: Frame) => {
    recordFrameTopologyViolation("frame-attached", candidate);
  };

  const captureFrameDetached = (candidate: Frame) => {
    recordFrameTopologyViolation("frame-detached", candidate);
  };

  const throwIfHard = () => {
    if (hardErrors.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `hard browser evidence failure(s): ${JSON.stringify(hardErrors)}.`,
      );
    }
  };

  const assertBoundTopology = (label: string): BrowserTopologySnapshotReceipt => {
    let pageCount = -1;
    let frameCount = -1;
    let currentContext: BrowserContext | null = null;
    let currentMainFrame: Frame | null = null;
    let currentMainFrameUrl = "<unavailable>";
    let currentPageUrl = "<unavailable>";
    let mainFrameUrlMatched = false;
    let valid = false;
    try {
      currentContext = page.context();
      currentMainFrame = page.mainFrame();
      currentMainFrameUrl = currentMainFrame.url();
      currentPageUrl = page.url();
      mainFrameUrlMatched = currentMainFrameUrl === currentPageUrl;
      const pages = armedContext?.pages() ?? [];
      const frames = page.frames();
      pageCount = pages.length;
      frameCount = frames.length;
      valid =
        armedContext !== null &&
        armedMainFrame !== null &&
        currentContext === armedContext &&
        currentMainFrame === armedMainFrame &&
        pages.length === 1 &&
        pages[0] === page &&
        frames.length === 1 &&
        frames[0] === armedMainFrame &&
        armedMainFrame.parentFrame() === null &&
        armedMainFrame.page() === page &&
        mainFrameUrlMatched;
    } catch {
      valid = false;
    }
    if (!valid) {
      if (!topologyEvents.some(({ kind }) => kind === "identity-drift")) {
        topologyEvents.push({
          kind: "identity-drift",
          sequence: topologyEvents.length + 1,
          url: currentPageUrl,
        });
        advanceTerminalEpoch();
      }
      pushHard(
        `browser topology identity drift at ${label}; pageCount=${pageCount} frameCount=${frameCount} contextMatched=${currentContext === armedContext} mainFrameMatched=${currentMainFrame === armedMainFrame} mainFrameUrlMatched=${mainFrameUrlMatched} pageUrl=${JSON.stringify(currentPageUrl)} mainFrameUrl=${JSON.stringify(currentMainFrameUrl)}`,
      );
      throwIfHard();
    }
    return {
      frameCount: frameCount as 1,
      mainFrameUrl: currentMainFrameUrl,
      pageCount: pageCount as 1,
      pageUrl: currentPageUrl,
    };
  };

  const readManifest = () => {
    const manifestPath = canonicalStarshipPath(
      "PLAYWRIGHT_PATH_MANIFEST_PATH",
      process.env.PLAYWRIGHT_PATH_MANIFEST_PATH,
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `path manifest cannot be read as JSON: ${String(error)}.`,
      );
    }
    if (!isPlainRecord(parsed) || !isPlainRecord(parsed.contract) || !isPlainRecord(parsed.paths)) {
      throw new VisualizationLessonBrowserDurabilityError("path manifest shape is malformed.");
    }
    if (
      parsed.schemaVersion !== 1 ||
      parsed.status !== "preflight-passed" ||
      parsed.contract.mutablePathsOnlyOnStarship !== true ||
      parsed.contract.starshipRoot !== "/Volumes/Starship" ||
      parsed.contract.serverCommandOwnerPidSemantics !==
        "shell-command-owner-that-execs-npm-start" ||
      typeof parsed.runId !== "string" ||
      parsed.runId.length === 0
    ) {
      throw new VisualizationLessonBrowserDurabilityError("path manifest contract is not preflight-passed v1.");
    }
    const manifestPathLabels = Object.keys(parsed.paths).sort(compareExactStrings);
    if (
      manifestPathLabels.join("\u0000") !==
      [...requiredManifestPathLabels].sort(compareExactStrings).join("\u0000")
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `path manifest labels are not exact: ${JSON.stringify(manifestPathLabels)}.`,
      );
    }
    const paths: Record<string, string> = {};
    for (const [label, value] of Object.entries(parsed.paths)) {
      paths[label] = canonicalStarshipPath(`manifest.paths.${label}`, value);
    }
    if (paths.pathManifestPath !== manifestPath) {
      throw new VisualizationLessonBrowserDurabilityError("manifest does not self-bind pathManifestPath.");
    }
    if (paths.databasePath !== databasePath) {
      throw new VisualizationLessonBrowserDurabilityError(
        `databasePath differs from the run manifest; input=${databasePath} manifest=${paths.databasePath}.`,
      );
    }
    if (paths.repositoryRoot !== process.cwd()) {
      throw new VisualizationLessonBrowserDurabilityError(
        `manifest repositoryRoot differs from cwd; cwd=${process.cwd()} manifest=${paths.repositoryRoot}.`,
      );
    }
    if (!isChildPath(paths.e2eRunRoot!, paths.repositoryRoot!)) {
      throw new VisualizationLessonBrowserDurabilityError(
        `manifest e2eRunRoot is outside repositoryRoot: ${paths.e2eRunRoot}.`,
      );
    }
    for (const [label, value] of Object.entries(paths)) {
      if (label === "repositoryRoot" || label === "e2eRunRoot") continue;
      const owner = label === "nextTsconfigPath" ? paths.repositoryRoot! : paths.e2eRunRoot!;
      if (!isChildPath(value, owner)) {
        throw new VisualizationLessonBrowserDurabilityError(
          `manifest ${label} is outside ${label === "nextTsconfigPath" ? "repositoryRoot" : "e2eRunRoot"}: ${value}.`,
        );
      }
    }
    if (!paths.outputDir || !isChildPath(input.testInfo.outputDir, paths.outputDir)) {
      throw new VisualizationLessonBrowserDurabilityError(
        `testInfo.outputDir is outside manifest outputDir: ${input.testInfo.outputDir}.`,
      );
    }
    if (
      typeof input.testInfo.project.outputDir !== "string" ||
      input.testInfo.project.outputDir !== paths.outputDir
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `testInfo.project.outputDir differs from manifest outputDir: ${String(input.testInfo.project.outputDir)}.`,
      );
    }
    if (
      !isPlainRecord(parsed.process) ||
      parsed.process.cwd !== paths.repositoryRoot ||
      !Number.isSafeInteger(parsed.process.pid) ||
      (parsed.process.pid as number) <= 0 ||
      !Number.isSafeInteger(parsed.process.ppid) ||
      (parsed.process.ppid as number) <= 0
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        "path manifest process receipt is absent or malformed.",
      );
    }
    return deepFreeze({
      pathManifestPath: manifestPath,
      paths,
      runId: parsed.runId,
      schemaVersion: 1 as const,
    });
  };

  const captureRequest = (request: Request) => {
    try {
      const url = new URL(request.url());
      const method = request.method().toUpperCase();
      if (
        safeMethods.has(method) &&
        (!isLocalApplicationUrl(request.url()) || !url.pathname.startsWith("/api/"))
      ) return;
      if (networkByRequest.has(request)) {
        pushHard(`duplicate request-object event for ${request.method()} ${url.pathname}`);
        return;
      }
      const requestBytes = request.postData();
      let requestBody: unknown = null;
      if (!safeMethods.has(method)) {
        if (requestBytes === null || requestBytes.length === 0) {
          pushHard(`missing mutation request bytes for ${method} ${url.pathname}`);
        } else {
          try {
            requestBody = JSON.parse(requestBytes) as unknown;
          } catch (error) {
            pushHard(`request JSON parsing failed for ${method} ${url.pathname}: ${String(error)}`);
          }
        }
      }
      const record: ObservedBrowserRequest = {
        failed: null,
        finished: false,
        hash: url.hash,
        headers: { ...request.headers() },
        id: ++networkSequence,
        method,
        origin: url.origin,
        pathname: url.pathname,
        request,
        requestBody,
        requestBytes,
        response: null,
        responseRead: false,
        search: url.search,
        url: request.url(),
      };
      networkByRequest.set(request, record);
      orderedNetwork.push(record);
      advanceTerminalEpoch();
      if (url.origin !== expectedAppOrigin) {
        pushHard(
          `browser request origin scheme/host/port mismatch for ${method} ${url.pathname}; expected=${expectedAppOrigin} actual=${url.origin}`,
        );
      }
      if (
        !safeMethods.has(method) &&
        [exactSessionPath, exactLessonProgressPath, exactLearningEventsPath].includes(url.pathname) &&
        (
          url.search !== "" ||
          url.hash !== "" ||
          request.url() !== `${expectedAppOrigin}${url.pathname}`
        )
      ) {
        pushHard(
          `durability-owned mutation URL target is not exact with empty search/hash for ${method}; expected=${expectedAppOrigin}${url.pathname} actual=${request.url()}`,
        );
      }
    } catch (error) {
      pushHard(`request listener failed: ${String(error)}`);
    }
  };

  const captureResponse = async (response: PlaywrightResponse) => {
    try {
      const request = response.request();
      const record = networkByRequest.get(request);
      if (!record) return;
      const bytes = await response.text();
      const body = parseJsonBytes(bytes, `${record.method} ${record.pathname}`);
      record.response = {
        body,
        bytes,
        bytesSha256: sha256(bytes),
        status: response.status(),
      };
      record.responseRead = true;
      if (
        browserRequestIsMutation(record) &&
        (response.status() < 200 || response.status() >= 300)
      ) {
        pushHard(
          `completed browser mutation returned non-2xx status ${response.status()} for ${record.method} ${record.origin}${record.pathname}`,
        );
      }
    } catch (error) {
      pushHard(`response listener failed: ${String(error)}`);
    }
  };

  const registerResponseTask = (response: PlaywrightResponse) => {
    const request = response.request();
    if (!networkByRequest.has(request)) return;
    if (responseTasks.has(request)) {
      pushHard(`duplicate response task for captured request ${request.method()} ${request.url()}`);
      advanceTerminalEpoch();
      return;
    }
    advanceTerminalEpoch();
    const task = captureResponse(response).finally(() => {
      responseTasks.delete(request);
      advanceTerminalEpoch();
    });
    responseTasks.set(request, task);
    void task;
  };

  const captureFinished = (request: Request) => {
    try {
      const record = networkByRequest.get(request);
      if (record) {
        record.finished = true;
        advanceTerminalEpoch();
      }
    } catch (error) {
      pushHard(`requestfinished listener failed: ${String(error)}`);
    }
  };

  const captureFailed = (request: Request) => {
    try {
      const record = networkByRequest.get(request);
      if (!record) return;
      const failure = request.failure()?.errorText ?? "unknown";
      record.failed = failure;
      record.finished = true;
      advanceTerminalEpoch();
      pushHard(`requestfailed ${record.method} ${record.pathname}: ${failure}`);
    } catch (error) {
      pushHard(`requestfailed listener failed: ${String(error)}`);
    }
  };

  const captureMainFrameNavigation = (frame: Frame) => {
    try {
      if (frame !== armedMainFrame || frame !== page.mainFrame()) {
        recordFrameTopologyViolation("auxiliary-frame-navigated", frame);
        return;
      }
      const url = frame.url();
      if (url === "about:blank" && !exactLessonNavigationSeen) return;
      mainFrameNavigations.push({
        sequence: mainFrameNavigations.length + 1,
        url,
      });
      advanceTerminalEpoch();
      let exact = false;
      try {
        const parsed = new URL(url);
        exact = parsed.origin === expectedAppOrigin &&
          parsed.pathname === expectedLessonPathname &&
          parsed.search === "" &&
          parsed.hash === "";
      } catch {
        exact = false;
      }
      if (!exactLessonNavigationSeen && exact) {
        exactLessonNavigationSeen = true;
        return;
      }
      pushHard(
        `irreversible main-frame navigation drift observed after durability arm; url=${JSON.stringify(url)} sequence=${mainFrameNavigations.length}`,
      );
    } catch (error) {
      pushHard(`main-frame navigation listener failed: ${String(error)}`);
    }
  };

  const removeBoundListenersExactlyOnce = (
    browserObservers: {
      readonly applicationTopologyObserverRemoved: boolean;
      readonly storageEventListenerRemoved: boolean;
    } = {
      applicationTopologyObserverRemoved: false,
      storageEventListenerRemoved: false,
    },
  ): BrowserListenerCleanupReceipt => {
    if (listenerCleanupState !== "active" || armedContext === null) {
      if (listenerCleanupState === "removed" && listenerCleanupReceipt !== null) {
        return listenerCleanupReceipt;
      }
      throw new VisualizationLessonBrowserDurabilityError(
        `browser topology listener cleanup is not active; state=${listenerCleanupState}.`,
      );
    }
    listenerCleanupState = "removed";
    armedContext.off("page", captureContextPage);
    page.off("frameattached", captureFrameAttached);
    page.off("framedetached", captureFrameDetached);
    page.off("framenavigated", captureMainFrameNavigation);
    page.off("popup", capturePopup);
    page.off("request", captureRequest);
    page.off("requestfailed", captureFailed);
    page.off("requestfinished", captureFinished);
    page.off("response", registerResponseTask);
    listenerCleanupReceipt = deepFreeze({
      applicationTopologyObserverRemoved:
        browserObservers.applicationTopologyObserverRemoved,
      contextPageListenerRemoved: true as const,
      pageListenerEvents: [
        "frameattached",
        "framedetached",
        "framenavigated",
        "popup",
        "request",
        "requestfailed",
        "requestfinished",
        "response",
      ] as const,
      removedExactlyOnce: true as const,
      storageEventListenerRemoved: browserObservers.storageEventListenerRemoved,
      totalRemoved: 9 as const,
    });
    return listenerCleanupReceipt;
  };

  const relevantInflight = (afterSequence = 0) =>
    orderedNetwork.filter(
      (record) =>
        record.id > afterSequence &&
        browserRequestIsMutation(record) &&
        record.failed === null &&
        (!record.finished || !record.responseRead),
    );

  const capturedRequestInflight = () =>
    orderedNetwork.filter(
      (record) =>
        record.failed === null &&
        (
          !record.finished ||
          !record.responseRead ||
          record.response === null ||
          responseTasks.has(record.request)
        ),
    );

  const browserSessionPosts = () =>
    orderedNetwork.filter(
      (record) => record.method === "POST" && record.pathname === exactSessionPath,
    );

  const browserMutationsAfter = (sequence: number) =>
    orderedNetwork.filter(
      (record) => record.id > sequence && browserRequestIsMutation(record),
    );

  const hasExactCanonicalPostTarget = (
    record: ObservedBrowserRequest,
    pathname: string,
  ) => (
    record.method === "POST" &&
    record.origin === expectedAppOrigin &&
    record.pathname === pathname &&
    record.search === "" &&
    record.hash === "" &&
    record.url === `${expectedAppOrigin}${pathname}`
  );

  const parseObserverSnapshot = (value: unknown) => {
    if (
      !isPlainRecord(value) ||
      !hasExactOwnKeys(value, [
        "controlObserverActive",
        "controlObserverFrozenEventCount",
        "controlObserverLedgerFrozen",
        "controlObserverRemovalCount",
        "controlObserverStopReceipt",
        "events",
        "initialStorage",
        "listenerErrors",
        "location",
        "navigationDrifts",
        "storageError",
        "storageEvents",
        "topologyEvents",
        "version",
      ]) ||
      value.version !== 1 ||
      !Array.isArray(value.events)
    ) {
      throw new VisualizationLessonBrowserDurabilityError("pre-navigation interaction observer is absent or malformed.");
    }
    if (
      !Array.isArray(value.initialStorage) ||
      !Array.isArray(value.listenerErrors) ||
      !Array.isArray(value.navigationDrifts) ||
      !Array.isArray(value.storageEvents) ||
      !Array.isArray(value.topologyEvents) ||
      !hasExactOwnKeys(value.location, ["hash", "href", "origin", "pathname", "search"])
    ) {
      throw new VisualizationLessonBrowserDurabilityError("observer initial storage receipt is malformed.");
    }
    let controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null = null;
    if (
      value.controlObserverActive === true &&
      value.controlObserverFrozenEventCount === 0 &&
      value.controlObserverLedgerFrozen === false &&
      value.controlObserverRemovalCount === 0 &&
      value.controlObserverStopReceipt === null
    ) {
      controlObserverStopReceipt = null;
    } else if (
      value.controlObserverActive === false &&
      value.controlObserverFrozenEventCount === 4 &&
      value.controlObserverLedgerFrozen === true &&
      value.controlObserverRemovalCount === 1 &&
      value.controlObserverStopReceipt !== null
    ) {
      controlObserverStopReceipt = canonicalControlObserverStopReceipt(
        value.controlObserverStopReceipt,
        adapterId,
        "interaction observer stop receipt",
      );
    } else {
      throw new VisualizationLessonBrowserDurabilityError(
        `interaction control observer lifecycle is impossible; active=${canonicalJson(value.controlObserverActive)} frozenEventCount=${canonicalJson(value.controlObserverFrozenEventCount)} ledgerFrozen=${canonicalJson(value.controlObserverLedgerFrozen)} removalCount=${canonicalJson(value.controlObserverRemovalCount)} stopReceipt=${canonicalJson(value.controlObserverStopReceipt)}.`,
      );
    }
    const snapshot = value as unknown as InteractionObserverSnapshot;
    if (snapshot.storageError !== null) {
      throw new VisualizationLessonBrowserDurabilityError(
        `pre-navigation storage scan failed: ${snapshot.storageError}.`,
      );
    }
    if (snapshot.listenerErrors.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `interaction listener failed: ${JSON.stringify(snapshot.listenerErrors)}.`,
      );
    }
    if (snapshot.navigationDrifts.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `irreversible history/navigation drift ledger is non-empty: ${canonicalJson(snapshot.navigationDrifts)}.`,
      );
    }
    const auxiliaryTags = new Set(["embed", "frame", "iframe", "object"]);
    for (const [index, event] of snapshot.topologyEvents.entries()) {
      if (
        !hasExactOwnKeys(event, ["kind", "sequence", "tagName", "targetUrl"]) ||
        event.sequence !== index + 1 ||
        (
          event.kind === "window-open"
            ? event.tagName !== null ||
              (event.targetUrl !== null && typeof event.targetUrl !== "string")
            : event.kind === "dom-auxiliary-created"
              ? typeof event.tagName !== "string" ||
                !auxiliaryTags.has(event.tagName) ||
                event.targetUrl !== null
              : true
        )
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `browser topology application event is malformed at index ${index}: ${canonicalJson(event)}.`,
        );
      }
    }
    if (snapshot.topologyEvents.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser topology application event ledger is non-empty: ${canonicalJson(snapshot.topologyEvents)}.`,
      );
    }
    const exactLocation = assertExactLessonPageUrl();
    if (canonicalJson(snapshot.location) !== canonicalJson(exactLocation)) {
      throw new VisualizationLessonBrowserDurabilityError(
        `observer location differs from the exact lesson location: ${canonicalJson(snapshot.location)}.`,
      );
    }
    return deepFreeze({
      ...snapshot,
      controlObserverStopReceipt,
    });
  };

  const readObserver = async () => {
    let value: unknown;
    try {
      value = await page.evaluate(
        ({ key }) => {
          const current = (window as unknown as Record<string, unknown>)[key] as {
            controlObserverActive?: unknown;
            controlObserverFrozenEventCount?: unknown;
            controlObserverLedgerFrozen?: unknown;
            controlObserverRemovalCount?: unknown;
            controlObserverStopReceipt?: unknown;
            events?: unknown;
            initialStorage?: unknown;
            listenerErrors?: unknown;
            navigationDrifts?: unknown;
            storageError?: unknown;
            storageEvents?: unknown;
            topologyEvents?: unknown;
            version?: unknown;
          } | undefined;
          return current === undefined ? null : {
            controlObserverActive: current.controlObserverActive,
            controlObserverFrozenEventCount: current.controlObserverFrozenEventCount,
            controlObserverLedgerFrozen: current.controlObserverLedgerFrozen,
            controlObserverRemovalCount: current.controlObserverRemovalCount,
            controlObserverStopReceipt: JSON.parse(JSON.stringify(current.controlObserverStopReceipt)),
            events: JSON.parse(JSON.stringify(current.events)),
            initialStorage: JSON.parse(JSON.stringify(current.initialStorage)),
            listenerErrors: JSON.parse(JSON.stringify(current.listenerErrors)),
            location: {
              hash: window.location.hash,
              href: window.location.href,
              origin: window.location.origin,
              pathname: window.location.pathname,
              search: window.location.search,
            },
            navigationDrifts: JSON.parse(JSON.stringify(current.navigationDrifts)),
            storageError: current.storageError,
            storageEvents: JSON.parse(JSON.stringify(current.storageEvents)),
            topologyEvents: JSON.parse(JSON.stringify(current.topologyEvents)),
            version: current.version,
          };
        },
        { key: observerKey, operation: "visualization-durability-observer" },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `interaction observer read failed: ${String(error)}.`,
      );
    }
    return parseObserverSnapshot(value);
  };

  const readStorage = async () => {
    let raw: unknown;
    try {
      raw = await page.evaluate(
        ({ exactKeys, prefixes }) => {
          const matches = (key: string) =>
            exactKeys.includes(key) || prefixes.some((prefix) => key.startsWith(prefix));
          const entries: Array<{ key: string; raw: string }> = [];
          for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);
            if (!key || !matches(key)) continue;
            const value = window.localStorage.getItem(key);
            if (value === null) throw new Error(`localStorage value disappeared for ${key}`);
            entries.push({ key, raw: value });
          }
          entries.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
          return entries;
        },
        {
          exactKeys: [...terminalStorageMatchers.exactKeys],
          operation: "visualization-durability-storage",
          prefixes: [...terminalStorageMatchers.prefixes],
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `localStorage scan failed: ${String(error)}.`,
      );
    }
    if (!Array.isArray(raw)) {
      throw new VisualizationLessonBrowserDurabilityError("localStorage scan did not return an array.");
    }
    return parseStorageSnapshot(raw as RawStorageEntry[], input.expected.userId);
  };

  const assertFinalStorage = (storage: VisualizationLessonBrowserStorageReceipt) => {
    if (storage.poisonKeys.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final storage contains poison families: ${JSON.stringify(storage.poisonKeys)}.`,
      );
    }
    if (
      storage.liveAnalyticsRecords.length > 0 ||
      storage.liveSessionRecords.length > 0 ||
      storage.outboxEntries.length > 0
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final storage contains live analytics/session outbox evidence; analytics=${storage.liveAnalyticsRecords.length} sessions=${storage.liveSessionRecords.length} outbox=${JSON.stringify(storage.outboxEntries.map(({ key }) => key))}.`,
      );
    }
    return storage;
  };

  const readFinalSealSnapshot = async () => {
    let value: unknown;
    try {
      value = await page.evaluate(
        async ({ adapterId, exactKeys, key, prefixes }) => {
          const current = (window as unknown as Record<string, unknown>)[key] as {
            activeSeal: {
              digests: {
                locationSha256: string;
                observerSha256: string;
                storageSha256: string;
              } | null;
              epoch: number;
              postSealViolations: BrowserPostSealViolationReceipt[];
              sealId: string;
              snapshots: {
                location: string;
                observer: string;
                storage: string;
              } | null;
              state: "sealing" | "sealed";
            } | null;
            controlObserverActive: boolean;
            controlObserverFrozenEventCount: number;
            controlObserverLedgerFrozen: boolean;
            controlObserverRemovalCount: number;
            controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null;
            epoch: number;
            events: InteractionEventReceipt[];
            initialStorage: RawStorageEntry[];
            listenerErrors: string[];
            navigationDrifts: BrowserHistoryDriftReceipt[];
            nextSealId: number;
            storageError: string | null;
            storageEvents: BrowserStorageEventReceipt[];
            topologyEvents: BrowserApplicationTopologyEventReceipt[];
            version: 1;
          } | undefined;
          if (current === undefined) return null;
          current.activeSeal = null;
          current.nextSealId += 1;
          const sealId = `${adapterId}:${current.nextSealId}`;
          const epoch = current.epoch;
          current.activeSeal = {
            digests: null,
            epoch,
            postSealViolations: [],
            sealId,
            snapshots: null,
            state: "sealing",
          };
          const location = {
            hash: window.location.hash,
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
          };
          const observer = {
            controlObserverActive: current.controlObserverActive,
            controlObserverFrozenEventCount: current.controlObserverFrozenEventCount,
            controlObserverLedgerFrozen: current.controlObserverLedgerFrozen,
            controlObserverRemovalCount: current.controlObserverRemovalCount,
            controlObserverStopReceipt: JSON.parse(JSON.stringify(current.controlObserverStopReceipt)),
            events: JSON.parse(JSON.stringify(current.events)),
            initialStorage: JSON.parse(JSON.stringify(current.initialStorage)),
            listenerErrors: JSON.parse(JSON.stringify(current.listenerErrors)),
            location,
            navigationDrifts: JSON.parse(JSON.stringify(current.navigationDrifts)),
            storageError: current.storageError,
            storageEvents: JSON.parse(JSON.stringify(current.storageEvents)),
            topologyEvents: JSON.parse(JSON.stringify(current.topologyEvents)),
            version: current.version,
          };
          const matches = (storageKey: string) =>
            exactKeys.includes(storageKey) ||
            prefixes.some((prefix) => storageKey.startsWith(prefix));
          const storage: Array<{ key: string; raw: string }> = [];
          for (let index = 0; index < window.localStorage.length; index += 1) {
            const storageKey = window.localStorage.key(index);
            if (!storageKey || !matches(storageKey)) continue;
            const raw = window.localStorage.getItem(storageKey);
            if (raw === null) throw new Error(`localStorage value disappeared for ${storageKey}`);
            storage.push({ key: storageKey, raw });
          }
          storage.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
          const digest = async (input: unknown) => {
            const bytes = new TextEncoder().encode(JSON.stringify(input));
            const hash = await crypto.subtle.digest("SHA-256", bytes);
            return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
          };
          const [locationSha256, observerSha256, storageSha256] = await Promise.all([
            digest(location),
            digest(observer),
            digest(storage),
          ]);
          const digests = { locationSha256, observerSha256, storageSha256 };
          const activeSeal = current.activeSeal;
          const valid =
            activeSeal !== null &&
            activeSeal.sealId === sealId &&
            current.epoch === epoch &&
            activeSeal.postSealViolations.length === 0;
          if (activeSeal !== null && activeSeal.sealId === sealId) {
            activeSeal.digests = digests;
            activeSeal.snapshots = {
              location: JSON.stringify(location),
              observer: JSON.stringify(observer),
              storage: JSON.stringify(storage),
            };
            if (valid) activeSeal.state = "sealed";
          }
          return {
            observer,
            seal: {
              digests,
              epoch,
              postSealViolations:
                activeSeal !== null && activeSeal.sealId === sealId
                  ? JSON.parse(JSON.stringify(activeSeal.postSealViolations))
                  : [{ epoch: current.epoch, kind: "seal-owner-replaced", sequence: 1 }],
              sealId,
              state: valid ? "sealed" : "invalid",
            },
            storage,
          };
        },
        {
          adapterId,
          exactKeys: [...terminalStorageMatchers.exactKeys],
          key: observerKey,
          operation: "visualization-durability-final-seal-snapshot",
          prefixes: [...terminalStorageMatchers.prefixes],
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final observer/storage/location seal snapshot failed: ${String(error)}.`,
      );
    }
    if (
      !isPlainRecord(value) ||
      !hasExactOwnKeys(value, ["observer", "seal", "storage"]) ||
      !Array.isArray(value.storage) ||
      !isPlainRecord(value.seal) ||
      !hasExactOwnKeys(value.seal, ["digests", "epoch", "postSealViolations", "sealId", "state"]) ||
      !isPlainRecord(value.seal.digests) ||
      !hasExactOwnKeys(value.seal.digests, ["locationSha256", "observerSha256", "storageSha256"]) ||
      !Number.isSafeInteger(value.seal.epoch) ||
      (value.seal.epoch as number) < 0 ||
      !Array.isArray(value.seal.postSealViolations) ||
      typeof value.seal.sealId !== "string" ||
      !value.seal.sealId.startsWith(`${adapterId}:`) ||
      (value.seal.state !== "invalid" && value.seal.state !== "sealed") ||
      !Object.values(value.seal.digests).every(
        (digest) => typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest),
      )
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        "final observer/storage/location seal snapshot is malformed.",
      );
    }
    return deepFreeze({
      observer: parseObserverSnapshot(value.observer),
      seal: value.seal as BrowserSealSnapshotReceipt,
      storage: assertFinalStorage(
        parseStorageSnapshot(value.storage as RawStorageEntry[], input.expected.userId),
      ),
    });
  };

  const confirmFinalBrowserSeal = async (candidateSeal: BrowserSealSnapshotReceipt) => {
    let value: unknown;
    try {
      value = await page.evaluate(
        ({ exactKeys, key, prefixes, sealId }) => {
          const current = (window as unknown as Record<string, unknown>)[key] as {
            activeSeal?: unknown;
            controlObserverActive?: unknown;
            controlObserverFrozenEventCount?: unknown;
            controlObserverLedgerFrozen?: unknown;
            controlObserverRemovalCount?: unknown;
            controlObserverStopReceipt?: unknown;
            epoch?: unknown;
            events?: unknown;
            initialStorage?: unknown;
            listenerErrors?: unknown;
            navigationDrifts?: unknown;
            storageError?: unknown;
            storageEvents?: unknown;
            topologyEvents?: unknown;
            applicationTopologyObserverActive?: unknown;
            storageObserverActive?: unknown;
            stopApplicationTopologyObserver?: unknown;
            stopStorageObserver?: unknown;
            version?: unknown;
          } | undefined;
          if (current === undefined || !current.activeSeal) return null;
          const activeSeal = current.activeSeal as {
            epoch?: unknown;
            postSealViolations?: unknown;
            sealId?: unknown;
            snapshots?: unknown;
            state?: unknown;
          };
          if (activeSeal.sealId !== sealId) return null;
          const location = {
            hash: window.location.hash,
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
          };
          const observer = {
            controlObserverActive: current.controlObserverActive,
            controlObserverFrozenEventCount: current.controlObserverFrozenEventCount,
            controlObserverLedgerFrozen: current.controlObserverLedgerFrozen,
            controlObserverRemovalCount: current.controlObserverRemovalCount,
            controlObserverStopReceipt: JSON.parse(JSON.stringify(current.controlObserverStopReceipt)),
            events: JSON.parse(JSON.stringify(current.events)),
            initialStorage: JSON.parse(JSON.stringify(current.initialStorage)),
            listenerErrors: JSON.parse(JSON.stringify(current.listenerErrors)),
            location,
            navigationDrifts: JSON.parse(JSON.stringify(current.navigationDrifts)),
            storageError: current.storageError,
            storageEvents: JSON.parse(JSON.stringify(current.storageEvents)),
            topologyEvents: JSON.parse(JSON.stringify(current.topologyEvents)),
            version: current.version,
          };
          const matches = (storageKey: string) =>
            exactKeys.includes(storageKey) || prefixes.some((prefix) => storageKey.startsWith(prefix));
          const storage: Array<{ key: string; raw: string }> = [];
          for (let index = 0; index < window.localStorage.length; index += 1) {
            const storageKey = window.localStorage.key(index);
            if (!storageKey || !matches(storageKey)) continue;
            const raw = window.localStorage.getItem(storageKey);
            if (raw === null) throw new Error(`localStorage value disappeared for ${storageKey}`);
            storage.push({ key: storageKey, raw });
          }
          storage.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
          const snapshots = activeSeal.snapshots as {
            location?: unknown;
            observer?: unknown;
            storage?: unknown;
          } | null;
          const confirmationMatched =
            activeSeal.state === "sealed" &&
            activeSeal.epoch === current.epoch &&
            Array.isArray(activeSeal.postSealViolations) &&
            activeSeal.postSealViolations.length === 0 &&
            snapshots !== null &&
            snapshots.location === JSON.stringify(location) &&
            snapshots.observer === JSON.stringify(observer) &&
            snapshots.storage === JSON.stringify(storage) &&
            current.applicationTopologyObserverActive === true &&
            current.controlObserverActive === false &&
            current.controlObserverFrozenEventCount === 4 &&
            current.controlObserverLedgerFrozen === true &&
            current.controlObserverRemovalCount === 1 &&
            current.controlObserverStopReceipt !== null &&
            Array.isArray(current.events) &&
            Object.isFrozen(current.events) &&
            current.events.length === 4 &&
            current.events.every((event) =>
              typeof event === "object" && event !== null && Object.isFrozen(event)
            ) &&
            current.storageObserverActive === true;
          if (
            confirmationMatched &&
            typeof current.stopApplicationTopologyObserver === "function" &&
            typeof current.stopStorageObserver === "function"
          ) {
            current.stopApplicationTopologyObserver();
            current.applicationTopologyObserverActive = false;
            current.stopStorageObserver();
            current.storageObserverActive = false;
          }
          return {
            ...JSON.parse(JSON.stringify(activeSeal)),
            applicationTopologyObserverRemoved:
              confirmationMatched && current.applicationTopologyObserverActive === false,
            confirmationMatched,
            currentEpoch: current.epoch,
            observer,
            storageObserverRemoved: confirmationMatched && current.storageObserverActive === false,
            storage,
          };
        },
        {
          exactKeys: [...terminalStorageMatchers.exactKeys],
          key: observerKey,
          operation: "visualization-durability-final-seal-confirm",
          prefixes: [...terminalStorageMatchers.prefixes],
          sealId: candidateSeal.sealId,
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final browser seal confirmation failed: ${String(error)}.`,
      );
    }
    if (
      !isPlainRecord(value) ||
      !hasExactOwnKeys(
        value,
        ["applicationTopologyObserverRemoved", "confirmationMatched", "currentEpoch", "digests", "epoch", "observer", "postSealViolations", "sealId", "snapshots", "state", "storage", "storageObserverRemoved"],
      ) ||
      value.confirmationMatched !== true ||
      value.applicationTopologyObserverRemoved !== true ||
      value.sealId !== candidateSeal.sealId ||
      value.state !== "sealed" ||
      !Number.isSafeInteger(value.currentEpoch) ||
      !Number.isSafeInteger(value.epoch) ||
      !Array.isArray(value.postSealViolations) ||
      !Array.isArray(value.storage) ||
      value.storageObserverRemoved !== true ||
      !isPlainRecord(value.digests)
    ) return null;
    const observer = parseObserverSnapshot(value.observer);
    const storage = assertFinalStorage(
      parseStorageSnapshot(value.storage as RawStorageEntry[], input.expected.userId),
    );
    const freshDigests = {
      locationSha256: evidenceSha256(observer.location),
      observerSha256: evidenceSha256(observer),
      storageSha256: evidenceSha256(
        storage.entries.map(({ key: storageKey, raw }) => ({ key: storageKey, raw })),
      ),
    };
    if (
      canonicalJson(freshDigests) !== canonicalJson(candidateSeal.digests) ||
      canonicalJson(value.digests) !== canonicalJson(candidateSeal.digests)
    ) return null;
    return deepFreeze(value as {
      readonly currentEpoch: number;
      readonly applicationTopologyObserverRemoved: true;
      readonly confirmationMatched: true;
      readonly digests: BrowserSealSnapshotReceipt["digests"];
      readonly epoch: number;
      readonly observer: InteractionObserverSnapshot;
      readonly postSealViolations: readonly BrowserPostSealViolationReceipt[];
      readonly sealId: string;
      readonly state: "sealed";
      readonly storage: readonly RawStorageEntry[];
      readonly storageObserverRemoved: true;
    });
  };

  const removeBrowserObserversAfterFailure = async () => {
    const expectedControlEvents = controlObserverStopReceipt?.events ??
      controlObserverCleanupExpectedLedger;
    const trustedControlEvents = expectedControlEvents === null
      ? null
      : exactTwoButtonClickControlLedger(
        expectedControlEvents,
        "failed final trusted control observer cleanup ledger",
      );
    let value: unknown;
    try {
      value = await page.evaluate(
        ({ expectedEvents, key }) => {
          const current = (window as unknown as Record<string, unknown>)[key] as {
            applicationTopologyObserverActive?: unknown;
            controlObserverActive?: unknown;
            controlObserverFrozenEventCount?: unknown;
            controlObserverLedgerFrozen?: unknown;
            controlObserverRemovalCount?: unknown;
            events?: unknown;
            freezeControlObserverLedger?: unknown;
            storageObserverActive?: unknown;
            stopApplicationTopologyObserver?: unknown;
            stopControlObserver?: unknown;
            stopStorageObserver?: unknown;
          } | undefined;
          if (current === undefined) return null;
          if (
            current.applicationTopologyObserverActive === true &&
            typeof current.stopApplicationTopologyObserver === "function"
          ) current.stopApplicationTopologyObserver();
          if (
            current.controlObserverActive === true &&
            typeof current.stopControlObserver === "function"
          ) current.stopControlObserver();
          if (
            current.controlObserverActive !== false ||
            current.controlObserverRemovalCount !== 1
          ) throw new Error("control observer cleanup did not reach exact inactive once-removed state");
          let controlObserverLedgerFreezeError: string | null = null;
          if (expectedEvents !== null) {
            try {
              if (typeof current.freezeControlObserverLedger !== "function") {
                throw new Error("protected control observer ledger freezer is absent");
              }
              current.freezeControlObserverLedger(expectedEvents);
            } catch (error) {
              controlObserverLedgerFreezeError = String(error);
            }
          }
          const liveEvents = current.events;
          const controlObserverLedgerObjectFrozen =
            Array.isArray(liveEvents) &&
            Object.isFrozen(liveEvents) &&
            liveEvents.every((event) => Object.isFrozen(event));
          if (
            current.storageObserverActive === true &&
            typeof current.stopStorageObserver === "function"
          ) current.stopStorageObserver();
          return {
            applicationTopologyObserverRemoved:
              current.applicationTopologyObserverActive === false,
            controlEventListenerRemoved:
              current.controlObserverActive === false,
            controlObserverFrozenEventCount: current.controlObserverFrozenEventCount,
            controlObserverLedgerFrozen: current.controlObserverLedgerFrozen,
            controlObserverLedgerFreezeError,
            controlObserverLedgerObjectFrozen,
            controlObserverRemovalCount: current.controlObserverRemovalCount,
            storageEventListenerRemoved: current.storageObserverActive === false,
          };
        },
        {
          expectedEvents: trustedControlEvents,
          key: observerKey,
          operation: "visualization-durability-browser-observer-cleanup",
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `failed final could not remove browser observers: ${String(error)}.`,
      );
    }
    if (
      !isPlainRecord(value) ||
      !hasExactOwnKeys(value, [
        "applicationTopologyObserverRemoved",
        "controlEventListenerRemoved",
        "controlObserverFrozenEventCount",
        "controlObserverLedgerFrozen",
        "controlObserverLedgerFreezeError",
        "controlObserverLedgerObjectFrozen",
        "controlObserverRemovalCount",
        "storageEventListenerRemoved",
      ]) ||
      value.applicationTopologyObserverRemoved !== true ||
      value.controlEventListenerRemoved !== true ||
      value.controlObserverRemovalCount !== 1 ||
      value.storageEventListenerRemoved !== true
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `failed final browser observer cleanup receipt is malformed: ${canonicalJson(value)}.`,
      );
    }
    if (trustedControlEvents !== null) {
      if (
        value.controlObserverFrozenEventCount !== 4 ||
        value.controlObserverLedgerFrozen !== true ||
        value.controlObserverLedgerFreezeError !== null ||
        value.controlObserverLedgerObjectFrozen !== true
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `failed final browser observer cleanup could not freeze the trusted exact control ledger: ${canonicalJson(value)}.`,
        );
      }
    } else if (
      value.controlObserverFrozenEventCount !== 0 ||
      value.controlObserverLedgerFrozen !== false ||
      value.controlObserverLedgerFreezeError !== null ||
      value.controlObserverLedgerObjectFrozen !== false
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `failed final browser observer cleanup exposed an impossible untrusted-ledger lifecycle: ${canonicalJson(value)}.`,
      );
    }
    return {
      applicationTopologyObserverRemoved: true as const,
      controlEventListenerRemoved: true as const,
      controlObserverFrozenEventCount: trustedControlEvents === null ? 0 as const : 4 as const,
      controlObserverLedgerFrozen: trustedControlEvents === null ? false as const : true as const,
      controlObserverLedgerObjectFrozen: trustedControlEvents === null ? false as const : true as const,
      controlObserverRemovalCount: 1 as const,
      storageEventListenerRemoved: true as const,
    };
  };

  const animationBarrier = async () => {
    assertExactLessonPageUrl();
    try {
      await page.evaluate(async ({ operation: _operation }) => {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }, { operation: "visualization-durability-animation-barrier" });
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `font/double-rAF barrier failed: ${String(error)}.`,
      );
    }
    assertExactLessonPageUrl();
  };

  const readRootSnapshot = async (root: Locator): Promise<BrowserRootSnapshot> => {
    const count = await page.locator(input.rootSelector).count();
    let snapshot: Omit<BrowserRootSnapshot, "count">;
    try {
      snapshot = await root.evaluate(
        (element, { controlSelector, rootSelector }) => {
          const rootElement = element as HTMLElement;
          const rootStyle = getComputedStyle(rootElement);
          const rootRect = rootElement.getBoundingClientRect();
          const controls = Array.from(rootElement.querySelectorAll<HTMLElement>(controlSelector))
            .filter((control) => {
              if (control.closest("[data-viz-lesson-action-slot]")) return false;
              if (control.getAttribute("aria-disabled") === "true") return false;
              if (
                (control instanceof HTMLButtonElement ||
                  control instanceof HTMLInputElement ||
                  control instanceof HTMLSelectElement ||
                  control instanceof HTMLTextAreaElement) &&
                control.disabled
              ) return false;
              const style = getComputedStyle(control);
              const rect = control.getBoundingClientRect();
              return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
            })
            .map((control) => {
              const key =
                control.getAttribute("data-viz-parameter") ??
                control.getAttribute("data-viz-mode") ??
                control.getAttribute("data-viz-action") ??
                control.getAttribute("data-viz-reset-topic-id") ??
                control.getAttribute("name") ??
                control.id ??
                control.getAttribute("aria-label") ??
                "";
              const input = control instanceof HTMLInputElement ? control : null;
              const select = control instanceof HTMLSelectElement ? control : null;
              const textarea = control instanceof HTMLTextAreaElement ? control : null;
              return {
                ariaPressed: control.getAttribute("aria-pressed"),
                dataPressed: [
                  ["data-viz-mode-active", control.getAttribute("data-viz-mode-active")],
                  ["data-viz-strand-active", control.getAttribute("data-viz-strand-active")],
                  ["data-viz-active", control.getAttribute("data-viz-active")],
                ] as const,
                key,
                max: input?.getAttribute("max") ?? null,
                min: input?.getAttribute("min") ?? null,
                options: select
                  ? Array.from(select.options).map((option) => ({
                      disabled: option.disabled,
                      selected: option.selected,
                      value: option.value,
                    }))
                  : [],
                step: input?.getAttribute("step") ?? null,
                tag: control.tagName.toLowerCase(),
                type: input?.type ?? null,
                value: input?.value ?? select?.value ?? textarea?.value ?? control.getAttribute("aria-valuenow"),
              };
            });
          return {
            activeLabId: rootElement.getAttribute("data-viz-active-lab-id"),
            controls,
            matchesRootSelector: rootElement.matches(rootSelector),
            moduleId: rootElement.getAttribute("data-viz-module-id"),
            sessionOwner: rootElement.getAttribute("data-viz-lesson-session-owner"),
            topicId: rootElement.getAttribute("data-viz-topic-id"),
            visible:
              rootRect.width > 1 &&
              rootRect.height > 1 &&
              rootStyle.display !== "none" &&
              rootStyle.visibility !== "hidden",
          };
        },
        {
          controlSelector: input.controlSelector,
          operation: "visualization-durability-root-snapshot",
          rootSelector: input.rootSelector,
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `root/control snapshot failed: ${String(error)}.`,
      );
    }
    const full = { ...snapshot, count };
    if (
      full.count > 1 ||
      (full.count === 1 && !full.matchesRootSelector) ||
      (full.count === 1 && (
        full.activeLabId !== input.expected.selectedTopicId ||
        full.topicId !== input.expected.selectedTopicId ||
        full.moduleId !== input.expected.moduleId ||
        full.sessionOwner !== "first-control-interaction"
      ))
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `active root identity is not exact: ${canonicalJson(full)}.`,
      );
    }
    const keys = full.controls.map(({ key }) => key);
    if (
      keys.some((key) => !key || key.trim() !== key) ||
      new Set(keys).size !== keys.length
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `visible enabled control keys are empty or duplicated: ${JSON.stringify(keys)}.`,
      );
    }
    return deepFreeze(full);
  };

  const stableBrowserSnapshot = async (
    root: Locator,
    previousDigest: string,
  ) => {
    await animationBarrier();
    throwIfHard();
    const [rootSnapshot, observer, storage, runtimeDigest] = await Promise.all([
      readRootSnapshot(root),
      readObserver(),
      readStorage(),
      input.readRuntimeDigest(root),
    ]);
    canonicalJson(runtimeDigest);
    const digest = evidenceSha256({
      location: observer.location,
      root: rootSnapshot,
      runtime: runtimeDigest,
      storage: storage.entries.map(({ key, raw }) => ({ key, raw })),
    });
    return {
      digest,
      observer,
      location: observer.location,
      root: rootSnapshot,
      stablePolls: digest === previousDigest ? 2 : 1,
      storage,
    };
  };

  const readSessionApi = async (label: string) => {
    const url = exactApiTarget(expectedAppOrigin, exactSessionPath);
    const startedAtMs = Date.now();
    const response = await page.request.get(url, { maxRedirects: 0 });
    const bytes = await response.text();
    const completedAtMs = Date.now();
    apiRequestReceipts.push(exactApiRequestReceipt({
      appOrigin: expectedAppOrigin,
      completedAtMs,
      method: "GET",
      pathname: exactSessionPath,
      requestBytes: null,
      response,
      responseBytes: bytes,
      startedAtMs,
    }));
    return exactApiSessionsEnvelope(response, bytes, label);
  };

  const readRaw = (): VisualizationLessonAppStateSnapshot =>
    readVisualizationLessonAppState({
      databasePath,
      moduleId: input.expected.moduleId,
      selectedTopicId: input.expected.selectedTopicId,
      siblingTopicIds: input.expected.siblingTopicIds,
      userId: input.expected.userId,
    });

  const responseAckFor = (record: ObservedBrowserRequest, writeIndex: number) =>
    record.response === null
      ? null
      : {
          method: record.method,
          pathname: record.pathname,
          responseBytes: record.response.bytes,
          status: record.response.status,
          writeIndex,
        };

  const browserRequestIdentity = (
    record: ObservedBrowserRequest,
  ): VisualizationLessonBrowserRequestIdentityReceipt => deepFreeze({
    finished: record.finished,
    hash: record.hash,
    id: record.id,
    method: record.method,
    origin: record.origin,
    pathname: record.pathname,
    requestBodySha256: record.requestBytes === null ? null : sha256(record.requestBytes),
    responseSha256: record.response?.bytesSha256 ?? null,
    search: record.search,
    status: record.response?.status ?? null,
    url: record.url,
  });

  const browserMountAcknowledgement = (
    record: ObservedBrowserRequest,
  ): VisualizationLessonBrowserMountAcknowledgementReceipt => {
    if (record.requestBytes === null || record.response === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount acknowledgement is missing exact request/response bytes for ${requestKey(record)}.`,
      );
    }
    return deepFreeze({
      ...browserRequestIdentity(record),
      requestBody: jsonCloneFrozen(record.requestBody, "mount acknowledgement request body"),
      requestBytes: record.requestBytes,
      responseBytes: record.response.bytes,
    });
  };

  const exactTerminalMutation = (
    record: ObservedBrowserRequest,
    authorizedPhase: VisualizationLessonBrowserMutationLedgerReceipt["authorizedPhase"],
  ): VisualizationLessonBrowserMutationLedgerReceipt => {
    if (
      record.method !== "POST" ||
      record.origin !== expectedAppOrigin ||
      record.search !== "" ||
      record.hash !== "" ||
      record.url !== `${expectedAppOrigin}${record.pathname}` ||
      ![exactSessionPath, exactLessonProgressPath, exactLearningEventsPath].includes(record.pathname) ||
      record.requestBytes === null ||
      !record.finished ||
      !record.responseRead ||
      record.response === null
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `authorized ${authorizedPhase} mutation is not one byte-terminal canonical target: ${requestKey(record)} url=${record.url}.`,
      );
    }
    return deepFreeze({
      ...browserRequestIdentity(record),
      authorizedPhase,
      requestBody: jsonCloneFrozen(record.requestBody, `${authorizedPhase} mutation request body`),
      requestBytes: record.requestBytes,
      responseBytes: record.response.bytes,
    });
  };

  const mountWrites = () => orderedNetwork.map((record) => ({
    body: record.requestBody,
    method: record.method,
    pathname: record.pathname,
  }));

  const exactNonEmptyPageViewRecord = (record: ObservedBrowserRequest) => {
    if (record.method !== "POST" || record.pathname !== exactLearningEventsPath) return false;
    if (!isPlainRecord(record.requestBody) || !Array.isArray(record.requestBody.events)) return false;
    return record.requestBody.events.length > 0;
  };

  const lessonProgressStartIndexes = () => orderedNetwork
    .map((record, index) => ({ index, record }))
    .filter(({ record }) => record.method === "POST" && record.pathname === exactLessonProgressPath);

  const lessonPageViewIndexes = () => orderedNetwork
    .map((record, index) => ({ index, record }))
    .filter(({ record }) => exactNonEmptyPageViewRecord(record));

  const assertResponseTerminal = (record: ObservedBrowserRequest, label: string) => {
    if (!record.finished || !record.responseRead || record.response === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        `${label} is not response-bytes/requestfinished terminal.`,
      );
    }
    return record.response;
  };

  const assertBrowserMountAcks = (
    writes: readonly { body: unknown; method: string; pathname: string }[],
    startIndexes: readonly { index: number; record: ObservedBrowserRequest }[],
    pageViewIndexes: readonly { index: number; record: ObservedBrowserRequest }[],
  ) => {
    const allowlist = classifyVisualizationLessonMountWrites({
      expectedGrade: input.expected.grade,
      expectedLessonSlug: input.expected.lessonSlug,
      writes,
    });
    if (!allowlist.ok) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount write allowlist failed: ${canonicalJson(allowlist.violations)}.`,
      );
    }
    const handshakeIndexes = allowlist.allowed
      .filter(({ kind }) => kind === "analytics-empty-handshake")
      .map(({ index }) => ({ index, record: orderedNetwork[index]! }));
    const mountMutationCount = orderedNetwork.filter(browserRequestIsMutation).length;
    if (startIndexes.length > 1) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount emitted ${startIndexes.length} lesson-progress start writes.`,
      );
    }
    if (pageViewIndexes.length > 1) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount emitted ${pageViewIndexes.length} non-empty page-view writes.`,
      );
    }
    if (
      handshakeIndexes.length > 1 ||
      mountMutationCount > 3
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount mutation ledger must contain at most one lesson start, one analytics handshake, and one page-view before terminal; mutationCount=${mountMutationCount} handshakeCount=${handshakeIndexes.length}.`,
      );
    }
    if (
      startIndexes.length === 1 &&
      handshakeIndexes.length === 1 &&
      pageViewIndexes.length === 1
    ) {
      const semanticOrder = allowlist.allowed
        .filter(({ kind }) => kind !== "safe-read")
        .map(({ kind }) => kind);
      const expectedSemanticOrder = [
        "lesson-progress-start",
        "analytics-empty-handshake",
        "lesson-page-view",
      ];
      if (canonicalJson(semanticOrder) !== canonicalJson(expectedSemanticOrder)) {
        throw new VisualizationLessonBrowserDurabilityError(
          `semantic mount mutation order must be lesson-start then analytics handshake then page-view; actual=${canonicalJson(semanticOrder)}.`,
        );
      }
    }
    if (startIndexes.length === 1 && startIndexes[0]!.record.response !== null) {
      const response = assertResponseTerminal(startIndexes[0]!.record, "lesson-progress start ACK");
      const body = assertExactOwnKeys(response.body, ["lesson"], "lesson-progress start ACK body");
      if (
        response.status !== 200 ||
        !isPlainRecord(body.lesson) ||
        body.lesson.slug !== input.expected.lessonSlug ||
        body.lesson.topicId !== input.expected.selectedTopicId ||
        body.lesson.status !== "in-progress"
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `lesson-progress start ACK identity is invalid: ${canonicalJson(response.body)}.`,
        );
      }
    }
    if (pageViewIndexes.length === 1 && pageViewIndexes[0]!.record.response !== null) {
      const record = pageViewIndexes[0]!.record;
      const response = assertResponseTerminal(record, "lesson page-view ACK");
      const requestBody = assertExactOwnKeys(
        record.requestBody,
        ["events", "generation"],
        "lesson page-view request body",
      );
      const events = requestBody.events;
      const event = Array.isArray(events) ? events[0] : null;
      const eventId = isPlainRecord(event) ? event.id : null;
      const body = assertExactOwnKeys(response.body, [
        "accepted",
        "acknowledgedEventIds",
        "acknowledgedUserId",
        "dispositions",
        "durablyPersisted",
        "generation",
      ], "lesson page-view ACK body");
      const dispositions = body.dispositions;
      if (
        response.status !== 200 ||
        !Array.isArray(events) ||
        events.length !== 1 ||
        !isPlainRecord(event) ||
        typeof eventId !== "string" ||
        !Array.isArray(body.acknowledgedEventIds) ||
        body.acknowledgedEventIds.length !== 1 ||
        body.acknowledgedEventIds[0] !== eventId ||
        body.acknowledgedUserId !== input.expected.userId ||
        body.accepted !== 1 ||
        body.durablyPersisted !== true ||
        body.generation !== requestBody.generation ||
        !Array.isArray(dispositions) ||
        dispositions.length !== 1 ||
        !isPlainRecord(dispositions[0]) ||
        dispositions[0].id !== eventId ||
        dispositions[0].disposition !== "inserted"
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `lesson page-view ACK is not exact and correlated: ${canonicalJson(response.body)}.`,
        );
      }
    }
    let analyticsHandshakeAcknowledged = false;
    if (handshakeIndexes.length === 1 && handshakeIndexes[0]!.record.response !== null) {
      const record = handshakeIndexes[0]!.record;
      const response = assertResponseTerminal(record, "analytics handshake ACK");
      const requestBody = assertExactOwnKeys(
        record.requestBody,
        ["events", "generation"],
        "analytics handshake request body",
      );
      const body = assertExactOwnKeys(response.body, [
        "accepted",
        "acknowledgedEventIds",
        "acknowledgedUserId",
        "dispositions",
        "durablyPersisted",
        "generation",
      ], "analytics handshake ACK body");
      if (
        response.status !== 200 ||
        !Array.isArray(requestBody.events) ||
        requestBody.events.length !== 0 ||
        !Number.isSafeInteger(requestBody.generation) ||
        (requestBody.generation as number) < 0 ||
        body.accepted !== 0 ||
        !Array.isArray(body.acknowledgedEventIds) ||
        body.acknowledgedEventIds.length !== 0 ||
        body.acknowledgedUserId !== input.expected.userId ||
        !Array.isArray(body.dispositions) ||
        body.dispositions.length !== 0 ||
        body.durablyPersisted !== true ||
        body.generation !== requestBody.generation
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `analytics handshake ACK is not exact and correlated: ${canonicalJson(response.body)}.`,
        );
      }
      analyticsHandshakeAcknowledged = true;
    }
    return { analyticsHandshakeAcknowledged };
  };

  const buildMountVerdict = async (
    snapshot: Awaited<ReturnType<typeof stableBrowserSnapshot>>,
    initialStorage: VisualizationLessonBrowserStorageReceipt,
    includeRaw: boolean,
  ) => {
    const writes = mountWrites();
    const startIndexes = lessonProgressStartIndexes();
    const pageViewIndexes = lessonPageViewIndexes();
    const { analyticsHandshakeAcknowledged } = assertBrowserMountAcks(
      writes,
      startIndexes,
      pageViewIndexes,
    );
    const api = await readSessionApi("mount visualization-session reread");
    if (snapshot.storage.poisonKeys.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `mount storage contains quarantine/corrupt/legacy poison: ${JSON.stringify(snapshot.storage.poisonKeys)}.`,
      );
    }
    const initialSessionDigest = evidenceSha256(
      initialStorage.outboxEntries.filter(({ family }) => family.startsWith("session-")).map(({ key, raw }) => ({ key, raw })),
    );
    const currentSessionDigest = evidenceSha256(
      snapshot.storage.outboxEntries.filter(({ family }) => family.startsWith("session-")).map(({ key, raw }) => ({ key, raw })),
    );
    const initialVisualizationDigest = evidenceSha256(
      initialStorage.outboxEntries.filter(({ family }) => !family.startsWith("session-")).map(({ key, raw }) => ({ key, raw })),
    );
    const currentVisualizationDigest = evidenceSha256(
      snapshot.storage.outboxEntries.filter(({ family }) => !family.startsWith("session-")).map(({ key, raw }) => ({ key, raw })),
    );
    const receiptWithoutRaw = {
      activeRoot: {
        activeLabId: snapshot.root.activeLabId ?? "",
        count: snapshot.root.count,
        moduleId: snapshot.root.moduleId ?? "",
        sessionOwner: snapshot.root.sessionOwner ?? "",
        topicId: snapshot.root.topicId ?? "",
        visible: snapshot.root.visible,
      },
      apiSessions: api.body.sessions,
      digest: {
        current: snapshot.digest,
        previous: snapshot.digest,
        stablePolls: snapshot.stablePolls,
      },
      dispatchedControlEventCount: snapshot.observer.events.length,
      inFlightRelevantWriteKeys: relevantInflight().map(requestKey),
      lessonProgressStartAck:
        startIndexes.length === 1
          ? responseAckFor(startIndexes[0]!.record, startIndexes[0]!.index)
          : null,
      lessonPageViewAck:
        pageViewIndexes.length === 1
          ? responseAckFor(pageViewIndexes[0]!.record, pageViewIndexes[0]!.index)
          : null,
      outbox: {
        sessionDigestAfter: currentSessionDigest,
        sessionDigestBefore: initialSessionDigest,
        sessionRecords: snapshot.storage.liveSessionRecords,
        visualizationDigestAfter: currentVisualizationDigest,
        visualizationDigestBefore: initialVisualizationDigest,
        visualizationRecords: snapshot.storage.liveAnalyticsRecords,
      },
      visibleEnabledControlKeys: snapshot.root.controls.map(({ key }) => key),
      writes,
    };
    if (!includeRaw) {
      const pending: string[] = [];
      const hard: string[] = [];
      if (snapshot.root.count === 0 || !snapshot.root.visible) pending.push("active-root-not-mounted");
      if (snapshot.root.controls.length === 0) pending.push("learner-control-not-ready");
      if (startIndexes.length !== 1 || startIndexes[0]?.record.response === null) pending.push("lesson-progress-start-not-acknowledged");
      if (pageViewIndexes.length !== 1 || pageViewIndexes[0]?.record.response === null) pending.push("lesson-page-view-not-acknowledged");
      if (!analyticsHandshakeAcknowledged) pending.push("analytics-handshake-not-acknowledged");
      if (relevantInflight().length > 0) pending.push("relevant-write-in-flight");
      if (snapshot.stablePolls < 2) pending.push("terminal-digest-not-stable");
      if (snapshot.observer.events.length !== 0) hard.push("control-event-before-terminal-mount");
      if (api.body.sessions.length > 0) hard.push("mount-api-session-not-empty");
      if (snapshot.storage.outboxEntries.length > 0) hard.push("mount-outbox-not-empty");
      return syntheticPendingVerdict(pending, hard, snapshot.digest);
    }
    const raw = readRaw();
    const verdict = validateVisualizationLessonMountTerminalReceipt({
      expected: {
        grade: input.expected.grade,
        lessonSlug: input.expected.lessonSlug,
        moduleId: input.expected.moduleId,
        selectedTopicId: input.expected.selectedTopicId,
        siblingTopicIds: input.expected.siblingTopicIds,
        userId: input.expected.userId,
      },
      receipt: { ...receiptWithoutRaw, raw },
    });
    if (analyticsHandshakeAcknowledged) return verdict;
    return deepFreeze({
      ...verdict,
      pending: [...verdict.pending, "analytics-handshake-not-acknowledged"],
      terminal: false,
    });
  };

  const assertExactBrowserSessionPost = (record: ObservedBrowserRequest) => {
    if (record.requestBytes === null) {
      throw new VisualizationLessonBrowserDurabilityError("browser session POST has no exact request bytes.");
    }
    const body = assertExactOwnKeys(
      record.requestBody,
      ["moduleId", "source", "topicId"],
      "browser session POST body",
    );
    if (
      body.moduleId !== input.expected.moduleId ||
      body.topicId !== input.expected.selectedTopicId ||
      body.source !== input.expected.source
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser session POST identity mismatch: ${canonicalJson(body)}.`,
      );
    }
    let owner: string;
    try {
      owner = decodeURIComponent(record.headers["x-mais-visualization-user-id"] ?? "");
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser session owner header is not decodable: ${String(error)}.`,
      );
    }
    if (owner !== input.expected.userId) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser session owner header mismatch: ${JSON.stringify(owner)}.`,
      );
    }
    if ((record.headers["content-type"] ?? "").toLowerCase() !== "application/json") {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser session content-type is not exact application/json: ${JSON.stringify(record.headers["content-type"])}.`,
      );
    }
    if (!record.finished || !record.responseRead || record.response === null) {
      throw new VisualizationLessonBrowserDurabilityError("browser session POST is not response-bytes/requestfinished terminal.");
    }
    return { body, requestBytes: record.requestBytes };
  };

  const firstInteractionFromRecord = async (
    record: ObservedBrowserRequest,
    includeRaw: boolean,
  ) => {
    const exact = assertExactBrowserSessionPost(record);
    const api = await readSessionApi("first interaction visualization-session reread");
    const response = assertResponseTerminal(record, "browser session POST ACK");
    const responseBody = assertExactOwnKeys(
      response.body,
      ["acknowledgedUserId", "durablyPersisted", "session"],
      "browser session POST ACK body",
    );
    const session = assertExactOwnKeys(
      responseBody.session,
      ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"],
      "browser session POST ACK session",
    );
    if (
      response.status !== 200 ||
      responseBody.acknowledgedUserId !== input.expected.userId ||
      responseBody.durablyPersisted !== true ||
      session.explored !== true ||
      session.moduleId !== input.expected.moduleId ||
      session.topicId !== input.expected.selectedTopicId ||
      session.source !== input.expected.source ||
      !isCanonicalIso(session.completedAt) ||
      !isCanonicalIso(session.updatedAt) ||
      session.completedAt !== session.updatedAt ||
      api.body.sessions.length !== 1 ||
      canonicalJson(api.body.sessions[0]) !== canonicalJson(session)
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser session ACK/API identity is not exact: response=${canonicalJson(response.body)} api=${canonicalJson(api.body)}.`,
      );
    }
    if (!includeRaw) return { api, durability: null, exact, raw: null };
    const raw = readRaw();
    const durability = validateVisualizationLessonFirstInteraction({
      api,
      expected: {
        moduleId: input.expected.moduleId,
        selectedTopicId: input.expected.selectedTopicId,
        siblingTopicIds: input.expected.siblingTopicIds,
        source: input.expected.source,
        userId: input.expected.userId,
      },
      raw,
      request: {
        body: record.requestBody,
        method: record.method,
        pathname: record.pathname,
      },
      response: {
        body: record.response!.body,
        responseBytes: record.response!.bytes,
        status: record.response!.status,
      },
    });
    return { api, durability, exact, raw };
  };

  const armBeforeNavigation = async ({
    learnerProfileSetup,
  }: {
    readonly learnerProfileSetup: VisualizationLessonLearnerProfileSetupReceipt;
  }) => {
    if (armed) {
      throw new VisualizationLessonBrowserDurabilityError("armBeforeNavigation may run exactly once.");
    }
    if (page.url() !== "about:blank") {
      throw new VisualizationLessonBrowserDurabilityError(
        `observer must be armed before navigation; current URL=${page.url()}.`,
      );
    }
    const prepared = preparedLearnerProfileReceipts.get(learnerProfileSetup);
    const receiptAgeMs = prepared === undefined ? Number.POSITIVE_INFINITY : Date.now() - prepared.completedAtMs;
    if (
      prepared === undefined ||
      consumedLearnerProfileReceipts.has(learnerProfileSetup) ||
      prepared.page !== page ||
      prepared.context !== page.context() ||
      prepared.requestContext !== page.request ||
      prepared.appOrigin !== expectedAppOrigin ||
      learnerProfileSetup.appOrigin !== expectedAppOrigin ||
      learnerProfileSetup.userId !== input.expected.userId ||
      receiptAgeMs < 0 ||
      receiptAgeMs > learnerProfileReceiptMaxAgeMs ||
      Date.parse(learnerProfileSetup.startedAt) !== prepared.startedAtMs ||
      Date.parse(learnerProfileSetup.completedAt) !== prepared.completedAtMs
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        "armBeforeNavigation requires this Page/context's fresh, unconsumed, verified learner profile setup receipt for the expected user and app origin.",
      );
    }
    consumedLearnerProfileReceipts.add(learnerProfileSetup);
    learnerProfileSetupReceipt = learnerProfileSetup;
    manifest = readManifest();
    const context = page.context();
    const mainFrame = page.mainFrame();
    const initialPages = context.pages();
    const initialFrames = page.frames();
    if (
      initialPages.length !== 1 ||
      initialPages[0] !== page ||
      initialFrames.length !== 1 ||
      initialFrames[0] !== mainFrame ||
      mainFrame.parentFrame() !== null ||
      mainFrame.page() !== page
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `browser topology at arm must contain exactly the bound Page and its one main Frame; pages=${initialPages.length} frames=${initialFrames.length}.`,
      );
    }
    armedContext = context;
    armedMainFrame = mainFrame;
    context.on("page", captureContextPage);
    page.on("frameattached", captureFrameAttached);
    page.on("framedetached", captureFrameDetached);
    page.on("popup", capturePopup);
    page.on("request", captureRequest);
    page.on("response", registerResponseTask);
    page.on("requestfinished", captureFinished);
    page.on("requestfailed", captureFailed);
    page.on("framenavigated", captureMainFrameNavigation);
    listenerCleanupState = "active";
    assertBoundTopology("arm-listeners-installed");
    await page.addInitScript(
      ({
        auxiliaryElementTags,
        controlSelector,
        exactKeys,
        expectedLessonUrl,
        key,
        observeApplicationTopology: _observeApplicationTopology,
        observeClosedShadowTopology: _observeClosedShadowTopology,
        observeStorageEvents: _observeStorageEvents,
        prefixes,
        rootSelector,
      }) => {
        const matchesStorageKey = (storageKey: string) =>
          exactKeys.includes(storageKey) || prefixes.some((prefix) => storageKey.startsWith(prefix));
        const scanInitialStorage = () => {
          const entries: Array<{ key: string; raw: string }> = [];
          for (let index = 0; index < window.localStorage.length; index += 1) {
            const storageKey = window.localStorage.key(index);
            if (!storageKey || !matchesStorageKey(storageKey)) continue;
            const raw = window.localStorage.getItem(storageKey);
            if (raw === null) throw new Error(`localStorage value disappeared for ${storageKey}`);
            entries.push({ key: storageKey, raw });
          }
          return entries.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
        };
        const state: {
          activeSeal: {
            digests: {
              locationSha256: string;
              observerSha256: string;
              storageSha256: string;
            } | null;
            epoch: number;
            postSealViolations: BrowserPostSealViolationReceipt[];
            sealId: string;
            snapshots: {
              location: string;
              observer: string;
              storage: string;
            } | null;
            state: "sealing" | "sealed";
          } | null;
          controlObserverActive: boolean;
          controlObserverFrozenEventCount: number;
          controlObserverLedgerFrozen: boolean;
          controlObserverRemovalCount: number;
          controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null;
          epoch: number;
          events: InteractionEventReceipt[];
          initialStorage: Array<{ key: string; raw: string }>;
            listenerErrors: string[];
            navigationDrifts: BrowserHistoryDriftReceipt[];
            nextSealId: number;
          storageError: string | null;
          storageEvents: BrowserStorageEventReceipt[];
          topologyEvents: BrowserApplicationTopologyEventReceipt[];
          applicationTopologyObserverActive: boolean;
          storageObserverActive: boolean;
          freezeControlObserverLedger: ((expectedEvents: readonly InteractionEventReceipt[]) => number) | null;
          sealControlObserverStopReceipt: ((receipt: VisualizationLessonControlObserverStopReceipt) => void) | null;
          stopApplicationTopologyObserver: (() => void) | null;
          stopControlObserver: (() => number) | null;
          stopStorageObserver: (() => void) | null;
            version: 1;
        } = {
          activeSeal: null,
          controlObserverActive: false,
          controlObserverFrozenEventCount: 0,
          controlObserverLedgerFrozen: false,
          controlObserverRemovalCount: 0,
          controlObserverStopReceipt: null,
          epoch: 0,
          events: [],
          initialStorage: [],
          listenerErrors: [],
          navigationDrifts: [],
          nextSealId: 0,
          storageError: null,
          storageEvents: [],
          topologyEvents: [],
          applicationTopologyObserverActive: false,
          storageObserverActive: false,
          freezeControlObserverLedger: null,
          sealControlObserverStopReceipt: null,
          stopApplicationTopologyObserver: null,
          stopControlObserver: null,
          stopStorageObserver: null,
          version: 1,
        };
        let controlObserverActive = false;
        let controlObserverFrozenEventCount = 0;
        let controlObserverLedgerFrozen = false;
        let controlObserverRemovalCount = 0;
        let controlObserverStopReceipt: VisualizationLessonControlObserverStopReceipt | null = null;
        const controlObserverEvents = state.events;
        Object.defineProperties(state, {
          controlObserverActive: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverActive,
          },
          controlObserverFrozenEventCount: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverFrozenEventCount,
          },
          controlObserverLedgerFrozen: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverLedgerFrozen,
          },
          controlObserverRemovalCount: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverRemovalCount,
          },
          controlObserverStopReceipt: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverStopReceipt,
          },
          events: {
            configurable: false,
            enumerable: true,
            get: () => controlObserverEvents,
          },
        });
        const advanceSealEpoch = (kind: string) => {
          state.epoch += 1;
          const activeSeal = state.activeSeal;
          if (activeSeal !== null) {
            activeSeal.postSealViolations.push({
              epoch: state.epoch,
              kind,
              sequence: activeSeal.postSealViolations.length + 1,
            });
          }
        };
        const recordApplicationTopologyEvent = (
          kind: BrowserApplicationTopologyEventReceipt["kind"],
          tagName: string | null,
          targetUrl: string | null,
        ) => {
          state.topologyEvents.push({
            kind,
            sequence: state.topologyEvents.length + 1,
            tagName,
            targetUrl,
          });
          advanceSealEpoch(`application-topology:${kind}:${tagName ?? targetUrl ?? "unknown"}`);
        };
        const auxiliaryElementTagSet = new Set(auxiliaryElementTags);
        const observedAuxiliaryElements = new WeakSet<Element>();
        const recordAuxiliaryElement = (element: Element) => {
          const tagName = element.localName.toLowerCase();
          if (
            !auxiliaryElementTagSet.has(tagName) ||
            observedAuxiliaryElements.has(element)
          ) return;
          observedAuxiliaryElements.add(element);
          recordApplicationTopologyEvent("dom-auxiliary-created", tagName, null);
        };
        const inspectAuxiliaryNode = (node: Node) => {
          if (!(node instanceof Element)) return;
          recordAuxiliaryElement(node);
          for (const element of node.querySelectorAll(auxiliaryElementTags.join(","))) {
            recordAuxiliaryElement(element);
          }
        };
        const nativeCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function durabilityCreateElement(
          this: Document,
          localName: string,
          options?: ElementCreationOptions,
        ) {
          const element = nativeCreateElement.call(this, localName, options);
          recordAuxiliaryElement(element);
          return element;
        } as typeof Document.prototype.createElement;
        const applicationTopologyObserver = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) inspectAuxiliaryNode(node);
          }
        });
        applicationTopologyObserver.observe(document, { childList: true, subtree: true });
        const nativeAttachShadow = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function durabilityAttachShadow(
          init: ShadowRootInit,
        ) {
          const shadowRoot = nativeAttachShadow.call(this, init);
          applicationTopologyObserver.observe(shadowRoot, { childList: true, subtree: true });
          return shadowRoot;
        };
        state.applicationTopologyObserverActive = true;
        state.stopApplicationTopologyObserver = () => {
          if (!state.applicationTopologyObserverActive) return;
          applicationTopologyObserver.disconnect();
          state.applicationTopologyObserverActive = false;
        };
        window.open = ((url?: string | URL) => {
          let targetUrl: string | null = null;
          try {
            if (url !== undefined) targetUrl = String(url);
          } catch {
            targetUrl = "<unserializable>";
          }
          recordApplicationTopologyEvent("window-open", null, targetUrl);
          return null;
        }) as typeof window.open;
        const recordNavigationDrift = (kind: string, before: string) => {
          const after = window.location.href;
          advanceSealEpoch(kind);
          if (after === expectedLessonUrl) return;
          state.navigationDrifts.push({
            after,
            before,
            kind,
            sequence: state.navigationDrifts.length + 1,
          });
        };
        const nativePushState = history.pushState.bind(history);
        const nativeReplaceState = history.replaceState.bind(history);
        history.pushState = ((...args: Parameters<History["pushState"]>) => {
          const before = window.location.href;
          nativePushState(...args);
          recordNavigationDrift("history.pushState", before);
        }) as History["pushState"];
        history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
          const before = window.location.href;
          nativeReplaceState(...args);
          recordNavigationDrift("history.replaceState", before);
        }) as History["replaceState"];
        window.addEventListener("popstate", () => recordNavigationDrift("popstate", expectedLessonUrl));
        window.addEventListener("hashchange", () => recordNavigationDrift("hashchange", expectedLessonUrl));
        const nativeSetItem = Storage.prototype.setItem;
        const nativeRemoveItem = Storage.prototype.removeItem;
        const nativeClear = Storage.prototype.clear;
        Storage.prototype.setItem = function storageSetItem(storageKey: string, value: string) {
          nativeSetItem.call(this, storageKey, value);
          if (this === window.localStorage && matchesStorageKey(storageKey)) {
            advanceSealEpoch(`localStorage.setItem:${storageKey}`);
          }
        };
        Storage.prototype.removeItem = function storageRemoveItem(storageKey: string) {
          const tracked = this === window.localStorage && matchesStorageKey(storageKey);
          nativeRemoveItem.call(this, storageKey);
          if (tracked) advanceSealEpoch(`localStorage.removeItem:${storageKey}`);
        };
        Storage.prototype.clear = function storageClear() {
          let tracked = false;
          if (this === window.localStorage) {
            for (let index = 0; index < this.length; index += 1) {
              const storageKey = this.key(index);
              if (storageKey && matchesStorageKey(storageKey)) {
                tracked = true;
                break;
              }
            }
          }
          nativeClear.call(this);
          if (tracked) advanceSealEpoch("localStorage.clear");
        };
        const storageEventListener = (event: StorageEvent) => {
          if (event.storageArea !== window.localStorage) return;
          if (event.key !== null && !matchesStorageKey(event.key)) return;
          state.storageEvents.push({
            key: event.key,
            newValue: event.newValue,
            oldValue: event.oldValue,
            sequence: state.storageEvents.length + 1,
            url: event.url,
          });
          advanceSealEpoch(`storage-event:${event.key ?? "clear"}`);
        };
        window.addEventListener("storage", storageEventListener);
        state.storageObserverActive = true;
        state.stopStorageObserver = () => {
          if (!state.storageObserverActive) return;
          window.removeEventListener("storage", storageEventListener);
          state.storageObserverActive = false;
        };
        try {
          state.initialStorage = scanInitialStorage();
        } catch (error) {
          state.storageError = String(error);
          advanceSealEpoch("initialStorage.scanError");
        }
        const eventTypes = ["change", "click", "input", "keyup", "pointerup"] as const;
        const nativeDocumentAddEventListener = Document.prototype.addEventListener;
        const nativeDocumentRemoveEventListener = Document.prototype.removeEventListener;
        const listener = (event: Event) => {
          try {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const root = target.closest(rootSelector);
            if (!root || target.closest("[data-viz-lesson-action-slot]")) return;
            const control = target.closest<HTMLElement>(controlSelector);
            if (!control || !root.contains(control)) return;
            if (control.getAttribute("aria-disabled") === "true") return;
            if (
              (control instanceof HTMLButtonElement ||
                control instanceof HTMLInputElement ||
                control instanceof HTMLSelectElement ||
                control instanceof HTMLTextAreaElement) &&
              control.disabled
            ) return;
            const controlKey =
              control.getAttribute("data-viz-parameter") ??
              control.getAttribute("data-viz-mode") ??
              control.getAttribute("data-viz-action") ??
              control.getAttribute("data-viz-reset-topic-id") ??
              control.getAttribute("name") ??
              control.id ??
              control.getAttribute("aria-label") ??
              "";
            if (!controlKey) throw new Error("real control event exposed no unique key");
            state.events.push({
              controlKey,
              key: event instanceof KeyboardEvent ? event.key : null,
              sequence: state.events.length + 1,
              type: event.type as InteractionEventReceipt["type"],
            });
            advanceSealEpoch(`control:${event.type}:${controlKey}`);
          } catch (error) {
            state.listenerErrors.push(String(error));
            advanceSealEpoch(`control-listener-error:${String(error)}`);
          }
        };
        eventTypes.forEach((eventType) => {
          nativeDocumentAddEventListener.call(document, eventType, listener, true);
        });
        controlObserverActive = true;
        const stopControlObserver = () => {
          if (!controlObserverActive) return 0;
          eventTypes.forEach((eventType) => {
            nativeDocumentRemoveEventListener.call(document, eventType, listener, true);
          });
          controlObserverActive = false;
          controlObserverRemovalCount += 1;
          advanceSealEpoch("control-observer-stop");
          return eventTypes.length;
        };
        const freezeControlObserverLedger = (
          expectedEvents: readonly InteractionEventReceipt[],
        ) => {
          const exactDenseLedger = (candidate: unknown) => {
            if (!Array.isArray(candidate)) return false;
            const arrayKeys = Reflect.ownKeys(candidate);
            if (
              arrayKeys.length !== 5 ||
              arrayKeys[0] !== "0" ||
              arrayKeys[1] !== "1" ||
              arrayKeys[2] !== "2" ||
              arrayKeys[3] !== "3" ||
              arrayKeys[4] !== "length"
            ) return false;
            const expectedTypes = ["pointerup", "click", "pointerup", "click"];
            return candidate.every((event, index) => {
              if (typeof event !== "object" || event === null || Array.isArray(event)) return false;
              const eventKeys = Reflect.ownKeys(event);
              const typedEvent = event as InteractionEventReceipt;
              return eventKeys.length === 4 &&
                eventKeys.every((eventKey): eventKey is string => typeof eventKey === "string") &&
                [...eventKeys].sort().join("\u0000") ===
                  ["controlKey", "key", "sequence", "type"].sort().join("\u0000") &&
                typeof typedEvent.controlKey === "string" &&
                /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(typedEvent.controlKey) &&
                typedEvent.key === null &&
                typedEvent.sequence === index + 1 &&
                typedEvent.type === expectedTypes[index];
            });
          };
          const matchesExpectedLedger = () =>
            exactDenseLedger(controlObserverEvents) &&
            exactDenseLedger(expectedEvents) &&
            controlObserverEvents.every((event, index) => {
              const expected = expectedEvents[index]!;
              return event.controlKey === expected.controlKey &&
                event.key === expected.key &&
                event.sequence === expected.sequence &&
                event.type === expected.type;
            });
          if (!matchesExpectedLedger()) {
            throw new Error("control observer ledger does not match trusted exact cleanup evidence");
          }
          if (controlObserverLedgerFrozen) {
            if (
              !Object.isFrozen(controlObserverEvents) ||
              !controlObserverEvents.every((event) => Object.isFrozen(event)) ||
              controlObserverFrozenEventCount !== controlObserverEvents.length ||
              !matchesExpectedLedger()
            ) throw new Error("control observer frozen ledger lifecycle drifted");
            return controlObserverFrozenEventCount;
          }
          controlObserverEvents.forEach((event) => Object.freeze(event));
          if (
            !controlObserverEvents.every((event) => Object.isFrozen(event)) ||
            !matchesExpectedLedger()
          ) throw new Error("control observer original events did not freeze exactly");
          Object.freeze(controlObserverEvents);
          if (
            !Object.isFrozen(controlObserverEvents) ||
            !controlObserverEvents.every((event) => Object.isFrozen(event)) ||
            !matchesExpectedLedger()
          ) throw new Error("control observer original ledger did not freeze");
          controlObserverFrozenEventCount = controlObserverEvents.length;
          controlObserverLedgerFrozen = true;
          return controlObserverFrozenEventCount;
        };
        const sealControlObserverStopReceipt = (
          receipt: VisualizationLessonControlObserverStopReceipt,
        ) => {
          if (
            controlObserverActive ||
            !Object.isFrozen(controlObserverEvents) ||
            controlObserverEvents.length !== 4 ||
            !controlObserverEvents.every((event) => Object.isFrozen(event)) ||
            controlObserverFrozenEventCount !== 4 ||
            !controlObserverLedgerFrozen ||
            controlObserverRemovalCount !== 1 ||
            controlObserverStopReceipt !== null
          ) throw new Error("control observer stop receipt cannot be sealed from this lifecycle");
          controlObserverStopReceipt = receipt;
        };
        Object.defineProperties(state, {
          freezeControlObserverLedger: {
            configurable: false,
            enumerable: false,
            value: freezeControlObserverLedger,
            writable: false,
          },
          sealControlObserverStopReceipt: {
            configurable: false,
            enumerable: false,
            value: sealControlObserverStopReceipt,
            writable: false,
          },
          stopControlObserver: {
            configurable: false,
            enumerable: false,
            value: stopControlObserver,
            writable: false,
          },
        });
        window.addEventListener("error", (event) => {
          const message = `window-error:${event.message}`;
          state.listenerErrors.push(message);
          advanceSealEpoch(message);
        });
        window.addEventListener("unhandledrejection", (event) => {
          const message = `unhandled-rejection:${String(event.reason)}`;
          state.listenerErrors.push(message);
          advanceSealEpoch(message);
        });
        Object.defineProperty(window, key, {
          configurable: false,
          enumerable: false,
          value: state,
          writable: false,
        });
      },
      {
        auxiliaryElementTags: ["embed", "frame", "iframe", "object"],
        controlSelector: input.controlSelector,
        exactKeys: [...initialStorageMatchers.exactKeys],
        expectedLessonUrl: `${expectedAppOrigin}${expectedLessonPathname}`,
        key: observerKey,
        observeApplicationTopology: true,
        observeClosedShadowTopology: true,
        prefixes: [...initialStorageMatchers.prefixes],
        observeStorageEvents: true,
        rootSelector: input.rootSelector,
      },
    );
    armTopology = deepFreeze(assertBoundTopology("arm-init-script-installed"));
    armed = true;
  };

  const waitForMountTerminal = async ({
    root,
    deadlineMs,
    includeRaw,
  }: {
    readonly root: Locator;
    readonly deadlineMs: number;
    readonly includeRaw: boolean;
  }) => {
    if (!armed) throw new VisualizationLessonBrowserDurabilityError("armBeforeNavigation must run first.");
    if (mountReceipt !== null) {
      throw new VisualizationLessonBrowserDurabilityError("mount terminal may be recorded exactly once.");
    }
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
      throw new TypeError("deadlineMs must be a positive safe integer.");
    }
    assertBoundTopology("mount-start");
    assertExactLessonPageUrl();
    const deadline = Date.now() + deadlineMs;
    let previousDigest = "";
    let lastVerdict: VisualizationLessonMountTerminalVerdict = syntheticPendingVerdict(
      ["mount-not-polled"],
      [],
      "",
    );
    let initialStorage: VisualizationLessonBrowserStorageReceipt | null = null;
    while (Date.now() < deadline) {
      assertBoundTopology("mount-poll");
      throwIfHard();
      const snapshot = await stableBrowserSnapshot(root, previousDigest);
      assertBoundTopology("mount-snapshot");
      previousDigest = snapshot.digest;
      if (initialStorage === null) {
        initialStorage = parseStorageSnapshot(
          snapshot.observer.initialStorage,
          input.expected.userId,
        );
        if (initialStorage.poisonKeys.length > 0) {
          throw new VisualizationLessonBrowserDurabilityError(
            `pre-navigation storage contains poison: ${JSON.stringify(initialStorage.poisonKeys)}.`,
          );
        }
        if (initialStorage.entries.length > 0) {
          throw new VisualizationLessonBrowserDurabilityError(
            `pre-navigation durability storage must be exactly empty; staleKeys=${JSON.stringify(initialStorage.entries.map(({ key }) => key))}.`,
          );
        }
      }
      if (snapshot.observer.events.length !== 0) {
        throw new VisualizationLessonBrowserDurabilityError(
          `real control event occurred before terminal mount: ${canonicalJson(snapshot.observer.events)}.`,
        );
      }
      if (
        snapshot.stablePolls < 2 ||
        snapshot.root.count !== 1 ||
        !snapshot.root.visible ||
        snapshot.root.controls.length === 0 ||
        relevantInflight().length > 0
      ) {
        lastVerdict = syntheticPendingVerdict(
          [
            ...(snapshot.stablePolls < 2 ? ["terminal-digest-not-stable"] : []),
            ...(snapshot.root.count !== 1 || !snapshot.root.visible ? ["active-root-not-mounted"] : []),
            ...(snapshot.root.controls.length === 0 ? ["learner-control-not-ready"] : []),
            ...(relevantInflight().length > 0 ? ["relevant-write-in-flight"] : []),
          ],
          [],
          snapshot.digest,
        );
        continue;
      }
      lastVerdict = await buildMountVerdict(snapshot, initialStorage, includeRaw);
      assertBoundTopology("mount-verdict");
      if (lastVerdict.hardFailures.length > 0) {
        throw new VisualizationLessonBrowserDurabilityError(
          `mount terminal validator hard-failed: ${JSON.stringify(lastVerdict.hardFailures)}.`,
        );
      }
      if (!lastVerdict.terminal && includeRaw) continue;
      if (!includeRaw && lastVerdict.pending.length > 0) continue;
      mountReceipt = deepFreeze({
        acknowledgements: {
          lessonPageView:
            lessonPageViewIndexes().length === 1
              ? browserMountAcknowledgement(lessonPageViewIndexes()[0]!.record)
              : null,
          lessonProgressStart:
            lessonProgressStartIndexes().length === 1
              ? browserMountAcknowledgement(lessonProgressStartIndexes()[0]!.record)
              : null,
        },
        browserDigest: snapshot.digest,
        controlEventCount: 0 as const,
        durability: includeRaw ? lastVerdict : null,
        initialStorage,
        networkRequestCount: orderedNetwork.length,
        rawIncluded: includeRaw,
        root: snapshot.root,
        storage: snapshot.storage,
      });
      const mountMutations = orderedNetwork.filter(browserRequestIsMutation);
      if (mountMutations.length !== 3) {
        throw new VisualizationLessonBrowserDurabilityError(
          `terminal mount mutation ledger must contain exactly three authorized records; actual=${mountMutations.length}.`,
        );
      }
      mountMutations.forEach((record) => exactTerminalMutation(record, "mount"));
      terminalMountMutationIds = deepFreeze(mountMutations.map(({ id }) => id));
      return mountReceipt;
    }
    throw new VisualizationLessonTerminalDeadlineError({
      deadlineMs,
      lastReceipt: lastVerdict,
    });
  };

  const armRealControl = async (armInput: {
    readonly expectedButtonClick: VisualizationLessonExpectedButtonClick;
    readonly ordinal: 1 | 2;
  }) => {
    assertExactOwnKeys(
      armInput,
      ["expectedButtonClick", "ordinal"],
      "real-control arm input",
    );
    const { ordinal } = armInput;
    const expectedControl = canonicalExpectedButtonClick(armInput.expectedButtonClick);
    if (mountReceipt === null) {
      throw new VisualizationLessonBrowserDurabilityError("mount terminal must precede real control fences.");
    }
    if (ordinal === 1 && (firstFence !== null || firstReceipt !== null)) {
      throw new VisualizationLessonBrowserDurabilityError("first real-control fence may be armed exactly once.");
    }
    if (ordinal === 2 && (firstReceipt === null || secondFence !== null || secondReceipt !== null)) {
      throw new VisualizationLessonBrowserDurabilityError("second real-control fence requires one finished first control.");
    }
    assertBoundTopology(`control-fence-${ordinal}-start`);
    throwIfHard();
    assertExactLessonPageUrl();
    if (relevantInflight().length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `cannot arm a control fence with mutation in flight: ${JSON.stringify(relevantInflight().map(requestKey))}.`,
      );
    }
    const [observer, storage] = await Promise.all([readObserver(), readStorage()]);
    assertBoundTopology(`control-fence-${ordinal}-read`);
    if (storage.outboxEntries.length > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `cannot arm a control fence with non-empty durability outbox storage: ${JSON.stringify(storage.outboxEntries.map(({ key }) => key))}.`,
      );
    }
    const fence = deepFreeze({
      adapterId,
      browserSessionPostCount: browserSessionPosts().length,
      eventCount: observer.events.length,
      expectedControl,
      networkSequence,
      ordinal,
      storageDigest: storage.digest,
    } satisfies VisualizationLessonRealControlFence);
    if (ordinal === 1) firstFence = fence;
    else secondFence = fence;
    return fence;
  };

  const assertFence = (
    fence: VisualizationLessonRealControlFence,
    ordinal: 1 | 2,
  ) => {
    const expectedFence = ordinal === 1 ? firstFence : secondFence;
    if (fence.adapterId !== adapterId || fence.ordinal !== ordinal || fence !== expectedFence) {
      throw new VisualizationLessonBrowserDurabilityError(
        `${ordinal === 1 ? "first" : "second"} control fence is foreign, stale, or fabricated.`,
      );
    }
  };

  const finishFirstRealControl = async (finishInput: {
    readonly fence: VisualizationLessonRealControlFence;
    readonly root: Locator;
    readonly includeRaw: boolean;
  }) => {
    assertExactOwnKeys(
      finishInput,
      ["fence", "includeRaw", "root"],
      "first real-control finish input",
    );
    const { fence, includeRaw, root } = finishInput;
    assertFence(fence, 1);
    if (firstReceipt !== null) {
      throw new VisualizationLessonBrowserDurabilityError("first real control may finish exactly once.");
    }
    assertBoundTopology("first-control-start");
    const immediateObserver = await readObserver();
    assertBoundTopology("first-control-observer");
    exactButtonClickControlEvents(immediateObserver.events, fence, "first");
    const deadline = Date.now() + 30_000;
    let record: ObservedBrowserRequest | null = null;
    while (Date.now() < deadline) {
      assertBoundTopology("first-control-network-poll");
      await animationBarrier();
      assertBoundTopology("first-control-network-barrier");
      throwIfHard();
      const phaseMutations = browserMutationsAfter(fence.networkSequence);
      if (phaseMutations.length > 1) {
        throw new VisualizationLessonBrowserDurabilityError(
          `first-control mutation ledger requires exactly one new mutation, the canonical session POST; actual=${canonicalJson(phaseMutations.map(browserRequestIdentity))}.`,
        );
      }
      if (phaseMutations.length === 1) {
        if (!hasExactCanonicalPostTarget(phaseMutations[0]!, exactSessionPath)) {
          throw new VisualizationLessonBrowserDurabilityError(
            `first-control mutation ledger contains a non-canonical session target: ${canonicalJson(browserRequestIdentity(phaseMutations[0]!))}.`,
          );
        }
        if (relevantInflight(fence.networkSequence).length === 0) {
          record = phaseMutations[0]!;
          break;
        }
      }
    }
    if (record === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        `first control session POST never became response-bytes/requestfinished terminal; count=${browserSessionPosts().length} inflight=${JSON.stringify(relevantInflight(fence.networkSequence).map(requestKey))}.`,
      );
    }
    let previousDigest = "";
    let previousNetworkSequence = -1;
    let stable: Awaited<ReturnType<typeof stableBrowserSnapshot>> | null = null;
    while (Date.now() < deadline) {
      assertBoundTopology("first-control-settle-poll");
      const snapshot = await stableBrowserSnapshot(root, previousDigest);
      assertBoundTopology("first-control-settle-snapshot");
      previousDigest = snapshot.digest;
      const phaseMutations = browserMutationsAfter(fence.networkSequence);
      if (phaseMutations.length !== 1 || phaseMutations[0] !== record) {
        throw new VisualizationLessonBrowserDurabilityError(
          `first-control mutation ledger drifted during settle; actual=${canonicalJson(phaseMutations.map(browserRequestIdentity))}.`,
        );
      }
      exactButtonClickControlEvents(snapshot.observer.events, fence, "first");
      if (snapshot.storage.poisonKeys.length > 0) {
        throw new VisualizationLessonBrowserDurabilityError(
          `first interaction storage contains poison: ${JSON.stringify(snapshot.storage.poisonKeys)}.`,
        );
      }
      if (
        snapshot.stablePolls >= 2 &&
        relevantInflight(fence.networkSequence).length === 0 &&
        networkSequence === previousNetworkSequence &&
        snapshot.storage.outboxEntries.length === 0
      ) {
        stable = snapshot;
        break;
      }
      previousNetworkSequence = networkSequence;
    }
    if (stable === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        "first interaction never reached stable DOM/network/empty-outbox terminal state.",
      );
    }
    exactTerminalMutation(record, "first-control");
    const validated = await firstInteractionFromRecord(record, includeRaw);
    assertBoundTopology("first-control-validated");
    const controlEvents = exactButtonClickControlEvents(
      stable.observer.events,
      fence,
      "first",
    );
    firstReceipt = deepFreeze({
      adapterId,
      browserDigest: stable.digest,
      browserEventCount: stable.observer.events.length,
      browserSessionPostCount: 1 as const,
      controlEvents,
      durability: validated.durability,
      expectedControl: fence.expectedControl,
      ordinal: 1 as const,
      rawIncluded: includeRaw,
      requestBody: jsonCloneFrozen(record.requestBody, "first request body"),
      requestBytes: validated.exact.requestBytes,
      requestHeaders: { ...record.headers },
      requestId: record.id,
      requestOrigin: record.origin,
      requestPathname: record.pathname,
      requestUrl: record.url,
      response: record.response!,
      storage: stable.storage,
    });
    return firstReceipt;
  };

  const stopControlObserverAtomically = async (
    secondControlEvents: VisualizationLessonButtonClickControlEvents,
  ) => {
    if (firstReceipt === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        "control observer stop requires the exact first interaction receipt.",
      );
    }
    const expectedEvents = exactTwoButtonClickControlLedger(
      [...firstReceipt.controlEvents, ...secondControlEvents],
      "expected control observer stop ledger",
    );
    controlObserverCleanupExpectedLedger = expectedEvents;
    const eventsSha256 = evidenceSha256(expectedEvents);
    const stopId = `${adapterId}:control-observer-stop:1`;
    let value: unknown;
    try {
      value = await page.evaluate(
        ({ adapterId: expectedAdapterId, eventsSha256: expectedEventsSha256, expectedEvents: trustedEvents, key, removedEventTypes, stopId: expectedStopId }) => {
          const current = (window as unknown as Record<string, unknown>)[key] as {
            controlObserverActive?: unknown;
            controlObserverFrozenEventCount?: unknown;
            controlObserverLedgerFrozen?: unknown;
            controlObserverRemovalCount?: unknown;
            controlObserverStopReceipt?: unknown;
            events?: unknown;
            freezeControlObserverLedger?: unknown;
            sealControlObserverStopReceipt?: unknown;
            stopControlObserver?: unknown;
          } | undefined;
          const exactOwnKeys = (candidate: unknown, expectedKeys: readonly string[]) => {
            if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return false;
            const actualKeys = Reflect.ownKeys(candidate);
            return actualKeys.every((candidateKey): candidateKey is string => typeof candidateKey === "string") &&
              actualKeys.length === expectedKeys.length &&
              [...actualKeys].sort().join("\u0000") === [...expectedKeys].sort().join("\u0000");
          };
          const exactDenseArray = (candidate: unknown, length: number) => {
            if (!Array.isArray(candidate)) return false;
            const keys = Reflect.ownKeys(candidate);
            if (keys.length !== length + 1 || keys[length] !== "length") return false;
            return Array.from({ length }, (_, index) => String(index)).every(
              (expectedKey, index) => keys[index] === expectedKey,
            );
          };
          const validateLedger = (candidate: unknown) => {
            if (!exactDenseArray(candidate, 4) || !exactDenseArray(trustedEvents, 4)) return false;
            const actualEvents = candidate as InteractionEventReceipt[];
            const expectedControlEvents = trustedEvents as unknown as readonly InteractionEventReceipt[];
            const expectedTypes = ["pointerup", "click", "pointerup", "click"];
            return actualEvents.every((event, index) => {
              const expected = expectedControlEvents[index];
              return exactOwnKeys(event, ["controlKey", "key", "sequence", "type"]) &&
                exactOwnKeys(expected, ["controlKey", "key", "sequence", "type"]) &&
                typeof event.controlKey === "string" &&
                event.controlKey === expected.controlKey &&
                event.key === null &&
                expected.key === null &&
                event.sequence === index + 1 &&
                expected.sequence === index + 1 &&
                event.type === expectedTypes[index] &&
                expected.type === expectedTypes[index];
            });
          };
          if (
            current === undefined ||
            current.controlObserverActive !== true ||
            current.controlObserverFrozenEventCount !== 0 ||
            current.controlObserverLedgerFrozen !== false ||
            current.controlObserverRemovalCount !== 0 ||
            current.controlObserverStopReceipt !== null ||
            typeof current.freezeControlObserverLedger !== "function" ||
            typeof current.sealControlObserverStopReceipt !== "function" ||
            typeof current.stopControlObserver !== "function" ||
            !validateLedger(current.events)
          ) {
            throw new Error("control observer cannot stop from a non-exact active four-event state");
          }
          const beforeRemoval = JSON.stringify(current.events);
          const removedListenerCount = current.stopControlObserver();
          if (
            removedListenerCount !== 5 ||
            Reflect.get(current, "controlObserverActive") !== false ||
            Reflect.get(current, "controlObserverRemovalCount") !== 1 ||
            current.controlObserverStopReceipt !== null ||
            !validateLedger(current.events) ||
            JSON.stringify(current.events) !== beforeRemoval
          ) {
            throw new Error("control observer ledger or lifecycle changed during atomic removal");
          }
          const frozenEventCount = current.freezeControlObserverLedger(trustedEvents);
          const liveEvents = current.events as InteractionEventReceipt[];
          if (
            frozenEventCount !== 4 ||
            Reflect.get(current, "controlObserverFrozenEventCount") !== 4 ||
            Reflect.get(current, "controlObserverLedgerFrozen") !== true ||
            !Object.isFrozen(liveEvents) ||
            !liveEvents.every((event) => Object.isFrozen(event)) ||
            !validateLedger(liveEvents) ||
            JSON.stringify(liveEvents) !== beforeRemoval
          ) {
            throw new Error("original control event ledger did not freeze with exact dense keys and values");
          }
          const events = liveEvents.map((event) =>
            Object.freeze({
              controlKey: event.controlKey,
              key: null,
              sequence: event.sequence,
              type: event.type,
            })
          ) as unknown as VisualizationLessonTwoButtonClickControlLedger;
          Object.freeze(events);
          const exactRemovedEventTypes = [...removedEventTypes] as ["change", "click", "input", "keyup", "pointerup"];
          Object.freeze(exactRemovedEventTypes);
          const receipt = Object.freeze({
            active: false as const,
            adapterId: expectedAdapterId,
            eventCount: 4 as const,
            events,
            eventsSha256: expectedEventsSha256,
            lastSequence: 4 as const,
            removalCount: 1 as const,
            removedEventTypes: exactRemovedEventTypes,
            removedExactlyOnce: true as const,
            removedListenerCount: 5 as const,
            stopId: expectedStopId,
          });
          current.sealControlObserverStopReceipt(receipt);
          if (
            Reflect.get(current, "controlObserverFrozenEventCount") !== 4 ||
            Reflect.get(current, "controlObserverLedgerFrozen") !== true ||
            current.controlObserverStopReceipt !== receipt
          ) {
            throw new Error("control observer stop receipt did not seal by exact browser identity");
          }
          return JSON.parse(JSON.stringify(receipt));
        },
        {
          adapterId,
          eventsSha256,
          expectedEvents,
          key: observerKey,
          operation: "visualization-durability-control-observer-stop",
          removedEventTypes: [...controlObserverEventTypes],
          stopId,
        },
      );
    } catch (error) {
      throw new VisualizationLessonBrowserDurabilityError(
        `atomic control observer stop failed: ${String(error)}.`,
      );
    }
    const receipt = canonicalControlObserverStopReceipt(
      value,
      adapterId,
      "atomic control observer stop receipt",
    );
    if (
      receipt.eventsSha256 !== eventsSha256 ||
      canonicalJson(receipt.events) !== canonicalJson(expectedEvents)
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        "atomic control observer stop receipt does not bind the exact first-plus-second control ledger.",
      );
    }
    return receipt;
  };

  const finishSecondRealControl = async (finishInput: {
    readonly fence: VisualizationLessonRealControlFence;
    readonly root: Locator;
  }) => {
    assertExactOwnKeys(
      finishInput,
      ["fence", "root"],
      "second real-control finish input",
    );
    const { fence, root } = finishInput;
    assertFence(fence, 2);
    if (secondControlFinishState !== "idle") {
      throw new VisualizationLessonBrowserDurabilityError(
        `second real control may finish exactly once; already ${secondControlFinishState}.`,
      );
    }
    secondControlFinishState = "running";
    try {
    assertBoundTopology("second-control-start");
    const immediateObserver = await readObserver();
    assertBoundTopology("second-control-observer");
    exactButtonClickControlEvents(immediateObserver.events, fence, "second");
    const deadline = Date.now() + 30_000;
    if (fence.browserSessionPostCount !== 1) {
      throw new VisualizationLessonBrowserDurabilityError(
        `second control fence did not begin with exactly one browser session POST; count=${fence.browserSessionPostCount}.`,
      );
    }
    let previousDigest = "";
    let stableSignature = "";
    let quiescentSince = 0;
    let stable: Awaited<ReturnType<typeof stableBrowserSnapshot>> | null = null;
    while (Date.now() < deadline) {
      assertBoundTopology("second-control-settle-poll");
      const snapshot = await stableBrowserSnapshot(root, previousDigest);
      assertBoundTopology("second-control-settle-snapshot");
      previousDigest = snapshot.digest;
      throwIfHard();
      const phaseMutations = browserMutationsAfter(fence.networkSequence);
      if (phaseMutations.length !== 0) {
        const duplicateSession = phaseMutations.some(
          (record) => record.method === "POST" && record.pathname === exactSessionPath,
        );
        throw new VisualizationLessonBrowserDurabilityError(
          `second-control mutation ledger permits zero new mutations${duplicateSession ? "; duplicate browser session POST observed" : ""}; actual=${canonicalJson(phaseMutations.map(browserRequestIdentity))}.`,
        );
      }
      const posts = browserSessionPosts();
      if (
        posts.length !== 1 ||
        posts.some((record) => record.id > fence.networkSequence)
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          `second control created a duplicate browser session POST; total=${posts.length}.`,
        );
      }
      exactButtonClickControlEvents(snapshot.observer.events, fence, "second");
      if (snapshot.storage.outboxEntries.length > 0) {
        throw new VisualizationLessonBrowserDurabilityError(
          `second interaction left durability outbox storage non-empty: ${JSON.stringify(snapshot.storage.outboxEntries.map(({ key }) => key))}.`,
        );
      }
      if (
        snapshot.stablePolls >= 2 &&
        relevantInflight(fence.networkSequence).length === 0
      ) {
        const signature = `${networkSequence}:${snapshot.digest}`;
        if (signature !== stableSignature) {
          stableSignature = signature;
          quiescentSince = Date.now();
        } else if (Date.now() - quiescentSince >= terminalNetworkQuiescenceMs) {
          stable = snapshot;
          break;
        }
      } else {
        stableSignature = "";
        quiescentSince = 0;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, terminalNetworkPollMs));
    }
    if (stable === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        "second interaction never reached stable DOM/network/empty-outbox terminal state.",
      );
    }
    assertBoundTopology("second-control-terminal");
    const controlEvents = exactButtonClickControlEvents(
      stable.observer.events,
      fence,
      "second",
    );
    const stoppedControlObserver = await stopControlObserverAtomically(controlEvents);
    controlObserverStopReceipt = stoppedControlObserver;
    secondReceipt = deepFreeze({
      browserDigest: stable.digest,
      browserEventCount: stable.observer.events.length,
      browserSessionPostCount: 1 as const,
      controlEvents,
      controlObserverStop: stoppedControlObserver,
      expectedControl: fence.expectedControl,
      ordinal: 2 as const,
      storage: stable.storage,
    });
    secondControlFinishState = "sealed";
    return secondReceipt;
    } catch (error) {
      secondControlFinishState = "failed";
      let browserCleanupError: unknown = null;
      let outerCleanupError: unknown = null;
      if (listenerCleanupState === "active") {
        try {
          await removeBrowserObserversAfterFailure();
        } catch (cleanupError) {
          browserCleanupError = cleanupError;
        }
        try {
          removeBoundListenersExactlyOnce();
        } catch (cleanupError) {
          outerCleanupError = cleanupError;
        }
      }
      if (browserCleanupError !== null || outerCleanupError !== null) {
        throw new VisualizationLessonBrowserDurabilityError(
          `second real control failed and cleanup also failed; original=${String(error)} browserCleanup=${String(browserCleanupError)} outerCleanup=${String(outerCleanupError)}.`,
        );
      }
      throw error;
    }
  };

  const replayFirstDeliveryExactly = async ({
    first,
  }: {
    readonly first: VisualizationLessonBrowserFirstInteractionReceipt;
  }) => {
    assertBoundTopology("direct-replay-start");
    if (first !== firstReceipt || first.adapterId !== adapterId) {
      throw new VisualizationLessonBrowserDurabilityError("replay requires this adapter's exact first receipt.");
    }
    if (secondReceipt === null) {
      throw new VisualizationLessonBrowserDurabilityError("replay requires the second browser control fence first.");
    }
    if (first.durability === null || !first.rawIncluded) {
      throw new VisualizationLessonBrowserDurabilityError("full replay requires first-interaction raw evidence.");
    }
    if (directReplayCount !== 0 || replayReceipt !== null) {
      throw new VisualizationLessonBrowserDurabilityError("direct replay may run exactly once.");
    }
    if (browserSessionPosts().length !== 1) {
      throw new VisualizationLessonBrowserDurabilityError("browser POST count drifted before direct replay.");
    }
    directReplayCount += 1;
    const replayUrl = exactApiTarget(expectedAppOrigin, exactSessionPath);
    const replayStartedAtMs = Date.now();
    const response = await page.request.fetch(replayUrl, {
      data: first.requestBytes,
      headers: {
        "Content-Type": "application/json",
        "X-MAIS-Visualization-User-Id": encodeURIComponent(input.expected.userId),
      },
      maxRedirects: 0,
      method: "POST",
    });
    assertBoundTopology("direct-replay-response");
    const responseBytes = await response.text();
    assertBoundTopology("direct-replay-response-bytes");
    const replayCompletedAtMs = Date.now();
    const request = exactApiRequestReceipt({
      appOrigin: expectedAppOrigin,
      completedAtMs: replayCompletedAtMs,
      method: "POST",
      pathname: exactSessionPath,
      requestBytes: first.requestBytes,
      response,
      responseBytes,
      startedAtMs: replayStartedAtMs,
    });
    apiRequestReceipts.push(request);
    const responseBody = parseJsonBytes(responseBytes, "direct duplicate replay");
    const api = await readSessionApi("direct replay visualization-session reread");
    assertBoundTopology("direct-replay-api-reread");
    const raw = readRaw();
    const replayDurability = validateVisualizationLessonFirstInteraction({
      api,
      expected: {
        moduleId: input.expected.moduleId,
        selectedTopicId: input.expected.selectedTopicId,
        siblingTopicIds: input.expected.siblingTopicIds,
        source: input.expected.source,
        userId: input.expected.userId,
      },
      raw,
      request: {
        body: first.requestBody,
        method: "POST",
        pathname: exactSessionPath,
      },
      response: {
        body: responseBody,
        responseBytes,
        status: response.status(),
      },
    });
    const duplicate = validateVisualizationLessonDuplicateReplay({
      first: first.durability,
      replay: replayDurability,
    });
    assertBoundTopology("direct-replay-validated");
    if (browserSessionPosts().length !== 1) {
      throw new VisualizationLessonBrowserDurabilityError(
        "APIRequestContext replay was incorrectly counted as a second browser POST.",
      );
    }
    replayReceipt = deepFreeze({
      directReplayCount: 1 as const,
      duplicate,
      request,
      responseBytes,
      responseSha256: sha256(responseBytes),
    });
    return replayReceipt;
  };

  const assertFinalNetworkLedger = () => {
    throwIfHard();
    const location = assertExactLessonPageUrl();
    if (capturedRequestInflight().length > 0 || responseTasks.size > 0) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final receipt has captured request/response task in flight: ${JSON.stringify(capturedRequestInflight().map(requestKey))}; responseTasks=${responseTasks.size}.`,
      );
    }
    if (browserSessionPosts().length !== 1) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final browser session POST count is not one: ${browserSessionPosts().length}.`,
      );
    }
    if (terminalMountMutationIds === null || firstReceipt === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        "final mutation ledger is missing the terminal mount or first-control boundary.",
      );
    }
    const browserMutations = orderedNetwork.filter(browserRequestIsMutation);
    const expectedMutationIds = [...terminalMountMutationIds, firstReceipt.requestId];
    if (
      browserMutations.length !== expectedMutationIds.length ||
      browserMutations.some((record, index) => record.id !== expectedMutationIds[index])
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `complete ordered mutation ledger does not reconstruct mount plus one first-control session and zero afterward; expectedIds=${JSON.stringify(expectedMutationIds)} actual=${canonicalJson(browserMutations.map(browserRequestIdentity))}.`,
      );
    }
    const terminalMountMutationIdSet = new Set(terminalMountMutationIds);
    return {
      location,
      mutationLedger: browserMutations.map((record) =>
        exactTerminalMutation(
          record,
          terminalMountMutationIdSet.has(record.id) ? "mount" : "first-control",
        )
      ),
      networkSequence,
      terminalEpoch,
    };
  };

  const assertFinalControlLedger = (observer: InteractionObserverSnapshot) => {
    if (firstReceipt === null || secondReceipt === null || controlObserverStopReceipt === null) {
      throw new VisualizationLessonBrowserDurabilityError(
        "final control ledger is missing first, second, or atomic stop evidence.",
      );
    }
    const expectedEvents = [
      ...firstReceipt.controlEvents,
      ...secondReceipt.controlEvents,
    ];
    if (
      canonicalJson(observer.events) !== canonicalJson(expectedEvents) ||
      observer.controlObserverActive !== false ||
      observer.controlObserverFrozenEventCount !== 4 ||
      observer.controlObserverLedgerFrozen !== true ||
      observer.controlObserverRemovalCount !== 1 ||
      observer.controlObserverStopReceipt === null ||
      canonicalJson(observer.controlObserverStopReceipt) !== canonicalJson(controlObserverStopReceipt) ||
      secondReceipt.controlObserverStop !== controlObserverStopReceipt
    ) {
      throw new VisualizationLessonBrowserDurabilityError(
        `final control observer differs from the exact inactive once-stopped two-click ledger; expected=${canonicalJson(controlObserverStopReceipt)} actual=${canonicalJson(observer)}.`,
      );
    }
  };

  const waitForFinalRequestTerminal = async (deadline: number) => {
    while (Date.now() < deadline) {
      throwIfHard();
      assertExactLessonPageUrl();
      if (capturedRequestInflight().length === 0 && responseTasks.size === 0) return;
      await new Promise<void>((resolve) => setTimeout(resolve, terminalNetworkPollMs));
    }
    throw new VisualizationLessonBrowserDurabilityError(
      `final receipt did not reach failed-or-response-bytes/requestfinished terminal state for every captured request; inflight=${JSON.stringify(capturedRequestInflight().map(requestKey))}; responseTasks=${responseTasks.size}.`,
    );
  };

  const waitForFinalQuiescence = async (deadline: number) => {
    let stableTerminalEpoch = -1;
    let quiescentSince = 0;
    while (Date.now() < deadline) {
      throwIfHard();
      assertExactLessonPageUrl();
      if (capturedRequestInflight().length > 0 || responseTasks.size > 0) {
        stableTerminalEpoch = -1;
        quiescentSince = 0;
      } else {
        const network = assertFinalNetworkLedger();
        if (stableTerminalEpoch !== network.terminalEpoch) {
          stableTerminalEpoch = network.terminalEpoch;
          quiescentSince = Date.now();
        } else if (Date.now() - quiescentSince >= terminalNetworkQuiescenceMs) {
          return network;
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, terminalNetworkPollMs));
    }
    throw new VisualizationLessonBrowserDurabilityError(
      "final receipt never reached a condition-based stable network quiescence window.",
    );
  };

  const finalReceipt = async (): Promise<VisualizationLessonDurabilityFinalReceipt> => {
    if (finalReceiptState !== "idle") {
      throw new VisualizationLessonBrowserDurabilityError(
        `final receipt is consumable exactly once; already ${finalReceiptState}.`,
      );
    }
    finalReceiptState = "running";
    try {
      assertBoundTopology("final-start");
      throwIfHard();
      assertExactLessonPageUrl();
      if (
        learnerProfileSetupReceipt === null ||
        manifest === null ||
        mountReceipt === null ||
        firstReceipt === null ||
        secondReceipt === null ||
        controlObserverStopReceipt === null
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          "final receipt requires learner profile setup, arm, mount, first control, and second control evidence.",
        );
      }
      const finalDeadline = Date.now() + 30_000;
      const coverage =
        replayReceipt !== null && mountReceipt.rawIncluded && firstReceipt.rawIncluded
          ? "full-raw-replay" as const
          : "browser" as const;
      if (
        (coverage === "full-raw-replay") !== (replayReceipt !== null) ||
        directReplayCount !== (replayReceipt === null ? 0 : 1)
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          "final coverage and replay evidence are inconsistent.",
        );
      }

      let finalSeal: Awaited<ReturnType<typeof readFinalSealSnapshot>> | null = null;
      let finalNetwork: ReturnType<typeof assertFinalNetworkLedger> | null = null;
      let finalSealConfirmation: Awaited<ReturnType<typeof confirmFinalBrowserSeal>> | null = null;
      let finalTopology: BrowserTopologySnapshotReceipt | null = null;
      while (Date.now() < finalDeadline) {
        const quiescentNetwork = await waitForFinalQuiescence(finalDeadline);
        assertBoundTopology("final-after-network-quiescence");
        const beforeSealNetwork = assertFinalNetworkLedger();
        if (
          beforeSealNetwork.networkSequence !== quiescentNetwork.networkSequence ||
          beforeSealNetwork.terminalEpoch !== quiescentNetwork.terminalEpoch
        ) continue;

        const candidateSeal = await readFinalSealSnapshot();
        assertBoundTopology("final-after-snapshot");
        assertFinalControlLedger(candidateSeal.observer);
        if (candidateSeal.seal.state !== "sealed") continue;
        if (capturedRequestInflight().length > 0 || responseTasks.size > 0) {
          await waitForFinalRequestTerminal(finalDeadline);
          continue;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, terminalNetworkQuiescenceMs));
        assertBoundTopology("final-before-confirmation");
        const sealConfirmation = await confirmFinalBrowserSeal(candidateSeal.seal);
        const confirmedTopology = assertBoundTopology("final-confirmed");
        const afterSealNetwork = assertFinalNetworkLedger();
        if (
          afterSealNetwork.networkSequence !== beforeSealNetwork.networkSequence ||
          afterSealNetwork.terminalEpoch !== beforeSealNetwork.terminalEpoch
        ) continue;
        if (
          sealConfirmation === null ||
          sealConfirmation.currentEpoch !== candidateSeal.seal.epoch ||
          sealConfirmation.epoch !== candidateSeal.seal.epoch ||
          sealConfirmation.postSealViolations.length !== 0 ||
          canonicalJson(sealConfirmation.digests) !== canonicalJson(candidateSeal.seal.digests)
        ) continue;
        finalSeal = candidateSeal;
        finalNetwork = afterSealNetwork;
        finalSealConfirmation = sealConfirmation;
        finalTopology = confirmedTopology;
        break;
      }
      if (
        armTopology === null ||
        finalSeal === null ||
        finalNetwork === null ||
        finalSealConfirmation === null ||
        finalTopology === null
      ) {
        throw new VisualizationLessonBrowserDurabilityError(
          "final observer/storage/location seal never matched a stable validated network sequence.",
        );
      }

      const listenerCleanup = removeBoundListenersExactlyOnce({
        applicationTopologyObserverRemoved:
          finalSealConfirmation.applicationTopologyObserverRemoved,
        storageEventListenerRemoved: finalSealConfirmation.storageObserverRemoved,
      });
      const networkSha256 = evidenceSha256(orderedNetwork.map(browserRequestIdentity));
      const compositeSha256 = evidenceSha256({
        browserEpoch: finalSealConfirmation.epoch,
        digests: finalSealConfirmation.digests,
        networkSha256,
        sealId: finalSealConfirmation.sealId,
        terminalEpoch: finalNetwork.terminalEpoch,
      });
      const receipt = deepFreeze({
        apiRequests: [learnerProfileSetupReceipt.request, ...apiRequestReceipts],
        browserSessionPostCount: 1 as const,
        controlEvents: {
          first: firstReceipt.controlEvents,
          second: secondReceipt.controlEvents,
        },
        controlObserverStop: controlObserverStopReceipt,
        coverage,
        directReplayCount: directReplayCount as 0 | 1,
        expectedControl: {
          first: firstReceipt.expectedControl,
          second: secondReceipt.expectedControl,
        },
        first: firstReceipt,
        identity: {
          appOrigin: expectedAppOrigin,
          grade: input.expected.grade,
          lessonPathname: expectedLessonPathname,
          lessonSlug: input.expected.lessonSlug,
          moduleId: input.expected.moduleId,
          selectedTopicId: input.expected.selectedTopicId,
          siblingTopicIds: [...input.expected.siblingTopicIds],
          source: input.expected.source,
          userId: input.expected.userId,
        },
        learnerProfileSetup: learnerProfileSetupReceipt,
        manifest,
        mount: mountReceipt,
        mutations: finalNetwork.mutationLedger,
        navigation: {
          historyDrifts: [...finalSeal.observer.navigationDrifts],
          location: finalNetwork.location,
          mainFrameNavigations: mainFrameNavigations.map(({ sequence, url }) => ({ sequence, url })),
        },
        projectName: input.testInfo.project.name,
        replay: replayReceipt,
        requests: orderedNetwork.map(browserRequestIdentity),
        second: secondReceipt,
        seal: {
          ...finalSeal.seal,
          compositeSha256,
          linearization:
            "browser-task-sealed-after-immutable-snapshot-digests-and-confirmed-after-125ms" as const,
          networkSha256,
          postSealViolations: [...finalSealConfirmation.postSealViolations],
          terminalEpoch: finalNetwork.terminalEpoch,
        },
        storage: finalSeal.storage,
        storageEvents: [...finalSealConfirmation.observer.storageEvents],
        testOutputDir: input.testInfo.outputDir,
        title: input.testInfo.title,
        topology: {
          applicationEvents: finalSealConfirmation.observer.topologyEvents.map(
            ({ kind, sequence, tagName, targetUrl }) => ({
              kind,
              sequence,
              tagName,
              targetUrl,
            }),
          ),
          arm: armTopology,
          current: finalTopology,
          events: topologyEvents.map(({ kind, sequence, url }) => ({ kind, sequence, url })),
          listenerCleanup,
        },
      });
      finalReceiptState = "sealed";
      return receipt;
    } catch (error) {
      finalReceiptState = "failed";
      if (listenerCleanupState === "active") {
        let browserCleanupError: unknown = null;
        let outerCleanupError: unknown = null;
        try {
          await removeBrowserObserversAfterFailure();
        } catch (cleanupError) {
          browserCleanupError = cleanupError;
        }
        try {
          removeBoundListenersExactlyOnce();
        } catch (cleanupError) {
          outerCleanupError = cleanupError;
        }
        if (browserCleanupError !== null || outerCleanupError !== null) {
          throw new VisualizationLessonBrowserDurabilityError(
            `final receipt failed and cleanup also failed; original=${String(error)} browserCleanup=${String(browserCleanupError)} outerCleanup=${String(outerCleanupError)}.`,
          );
        }
      }
      throw error;
    }
  };

  return Object.freeze({
    armBeforeNavigation,
    waitForMountTerminal,
    armRealControl,
    finishFirstRealControl,
    finishSecondRealControl,
    replayFirstDeliveryExactly,
    finalReceipt,
  });
}
