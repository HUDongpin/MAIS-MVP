import { isValidGradeId } from "../data/grades";
import type {
  GradeId,
  LearningAnalyticsEvent,
  LearningAnalyticsEventSource,
  LearningAnalyticsEventType,
  LearningAnalyticsExportSummary,
  LearningAnalyticsInput,
  LearningAnalyticsSummary
} from "@/types";

export const analyticsWindowDays = 7;
export const maxStoredLearningAnalyticsEvents = 500;
export const learningAnalyticsUpdatedEventName = "hk-math-learning-analytics-updated";
export const learningAnalyticsFlushRequestedEventName =
  "mais:learning-analytics-flush-requested";
export const throttledLearningAnalyticsFlushMs = 1000;

function isNonNullRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function learningAnalyticsDeliveryPauseTransition(
  wasPaused: boolean,
  nextPaused: boolean
) {
  return {
    paused: nextPaused,
    wakeVisualizationSessions: wasPaused && !nextPaused
  };
}

export function visualizationSessionOutboxRetryDelayMs(failedAttempt: number) {
  if (!Number.isSafeInteger(failedAttempt) || failedAttempt < 1) return 1_000;
  if (failedAttempt <= 5) {
    return Math.min(8_000, 1_000 * (2 ** (failedAttempt - 1)));
  }
  // Exhausting the short exponential window must not strand a durable
  // session forever. Continue at a bounded recovery cadence until an ACK or
  // an explicit online/visibility/outbox signal resets the attempt counter.
  return 30_000;
}

export async function withRequiredLearningAnalyticsClearLock<T>(
  lockManager: Pick<LockManager, "request"> | null | undefined,
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  if (!lockManager || typeof lockManager.request !== "function") {
    throw new Error("Web Locks are required for exact-user learning-analytics clear coordination.");
  }
  return lockManager.request(
    `mais:learning-analytics-clear:${encodeURIComponent(userId)}`,
    { mode: "exclusive" },
    task
  );
}

const learningAnalyticsDeliveryGenerationField = "__maisLearningAnalyticsGeneration";
const learningAnalyticsBoundaryTokenField = "__maisLearningAnalyticsBoundaryToken";
const learningAnalyticsPhysicalCommitField = Symbol(
  "mais.learning-analytics.preserve-physical-commit"
);

export const learningAnalyticsLocalStorageConcurrencyGuarantee =
  "independent-event-keys-with-server-idempotency-no-cross-tab-cas";

type GenerationalLearningAnalyticsEvent = LearningAnalyticsEvent & {
  [learningAnalyticsDeliveryGenerationField]?: number;
  [learningAnalyticsBoundaryTokenField]?: string;
  [learningAnalyticsPhysicalCommitField]?: number;
};

export function isDurableLearningAnalyticsDeliveryResponse(
  status: number,
  value: unknown,
  expectedUserId: string,
  expectedGeneration: number,
  expectedEventIds: ReadonlySet<string>
) {
  const record = value as {
    accepted?: unknown;
    acknowledgedEventIds?: unknown;
    acknowledgedUserId?: unknown;
    dispositions?: unknown;
    durablyPersisted?: unknown;
    generation?: unknown;
    ignored?: unknown;
  } | null;
  const acknowledgedEventIds = Array.isArray(record?.acknowledgedEventIds) &&
    record.acknowledgedEventIds.every((eventId) => typeof eventId === "string")
    ? record.acknowledgedEventIds as string[]
    : null;
  const dispositions = Array.isArray(record?.dispositions) &&
    record.dispositions.every(isNonNullRecord)
    ? record.dispositions as Array<{ id?: unknown; disposition?: unknown }>
    : null;
  const acknowledgedIdSet = acknowledgedEventIds ? new Set(acknowledgedEventIds) : null;
  const dispositionIdSet = dispositions ? new Set(dispositions.map((entry) => entry.id)) : null;
  return (
    status === 200 &&
    record?.acknowledgedUserId === expectedUserId &&
    record?.ignored !== true &&
    record?.durablyPersisted === true &&
    record?.generation === expectedGeneration &&
    typeof record.accepted === "number" &&
    Number.isSafeInteger(record.accepted) &&
    record.accepted >= 0 &&
    record.accepted <= expectedEventIds.size &&
    acknowledgedEventIds !== null &&
    acknowledgedIdSet?.size === acknowledgedEventIds.length &&
    acknowledgedIdSet?.size === expectedEventIds.size &&
    [...expectedEventIds].every((eventId) => acknowledgedIdSet?.has(eventId)) &&
    dispositions !== null &&
    dispositionIdSet?.size === dispositions.length &&
    dispositionIdSet?.size === expectedEventIds.size &&
    record.accepted === dispositions.filter((entry) => entry.disposition === "inserted").length &&
    dispositions.every((entry) =>
      typeof entry.id === "string" &&
      expectedEventIds.has(entry.id) &&
      (entry.disposition === "inserted" || entry.disposition === "already-persisted")
    )
  );
}

export function isLearningAnalyticsClearAcknowledgement(
  status: number,
  value: unknown,
  expectedUserId: string,
  baseGeneration: number
) {
  const record = value as {
    acknowledgedUserId?: unknown;
    clearedAt?: unknown;
    durablyPersisted?: unknown;
    generation?: unknown;
    ignored?: unknown;
    ok?: unknown;
  } | null;
  return (
    status === 200 &&
    record?.ok === true &&
    record.acknowledgedUserId === expectedUserId &&
    record.ignored !== true &&
    record.durablyPersisted === true &&
    typeof record.generation === "number" &&
    Number.isSafeInteger(record.generation) &&
    record.generation > baseGeneration &&
    isCanonicalIsoTimestamp(record.clearedAt)
  );
}

export type LearningAnalyticsGenerationMismatchReceipt =
  | {
      clearedAt: string;
      currentGeneration: number;
      direction: "forward";
    }
  | {
      clearedAt: null;
      currentGeneration: number;
      direction: "authoritative-lower";
    };

export function readLearningAnalyticsGenerationMismatchReceipt(
  status: number,
  value: unknown,
  expectedUserId: string,
  sentGeneration: number,
  expectedEventIds: ReadonlySet<string>
): LearningAnalyticsGenerationMismatchReceipt | null {
  const record = value as {
    accepted?: unknown;
    acknowledgedEventIds?: unknown;
    acknowledgedUserId?: unknown;
    clearedAt?: unknown;
    currentGeneration?: unknown;
    dispositions?: unknown;
    durablyPersisted?: unknown;
    ignored?: unknown;
    reason?: unknown;
  } | null;
  if (
    status !== 409 ||
    record?.accepted !== 0 ||
    record.acknowledgedUserId !== expectedUserId ||
    record.ignored === true ||
    record.durablyPersisted !== false ||
    record.reason !== "generation-mismatch" ||
    !Array.isArray(record.acknowledgedEventIds) ||
    record.acknowledgedEventIds.length !== 0 ||
    !Array.isArray(record.dispositions) ||
    !record.dispositions.every(isNonNullRecord) ||
    typeof record.currentGeneration !== "number" ||
    !Number.isSafeInteger(record.currentGeneration) ||
    record.currentGeneration < 0 ||
    record.currentGeneration === sentGeneration
  ) return null;

  const dispositions = record.dispositions as Array<{
    id?: unknown;
    disposition?: unknown;
  }>;
  const dispositionIds = new Set<string>();
  if (
    dispositions.length !== expectedEventIds.size ||
    dispositions.some((entry) => {
      if (
        typeof entry.id !== "string" ||
        entry.disposition !== "stale-generation" ||
        !expectedEventIds.has(entry.id) ||
        dispositionIds.has(entry.id)
      ) return true;
      dispositionIds.add(entry.id);
      return false;
    })
  ) return null;

  if (record.currentGeneration > sentGeneration) {
    if (!isCanonicalIsoTimestamp(record.clearedAt)) return null;
    return {
      clearedAt: record.clearedAt,
      currentGeneration: record.currentGeneration,
      direction: "forward"
    };
  }
  if (record.clearedAt !== null) return null;
  return {
    clearedAt: null,
    currentGeneration: record.currentGeneration,
    direction: "authoritative-lower"
  };
}

export function withLearningAnalyticsDeliveryGeneration(
  event: LearningAnalyticsEvent,
  generation: number
): LearningAnalyticsEvent {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error("Learning-analytics generation must be a non-negative safe integer.");
  }
  const preservePhysicalCommit =
    physicalLearningAnalyticsCommitSequence(event);
  return {
    ...learningAnalyticsEventForDelivery(event),
    ...(preservePhysicalCommit !== null
      ? { [learningAnalyticsPhysicalCommitField]: preservePhysicalCommit }
      : {}),
    [learningAnalyticsDeliveryGenerationField]: generation
  } as GenerationalLearningAnalyticsEvent;
}

export function learningAnalyticsDeliveryGeneration(event: LearningAnalyticsEvent) {
  return storedLearningAnalyticsDeliveryGeneration(event) ?? 0;
}

function storedLearningAnalyticsDeliveryGeneration(event: LearningAnalyticsEvent) {
  const generation = (event as GenerationalLearningAnalyticsEvent)[learningAnalyticsDeliveryGenerationField];
  return typeof generation === "number" && Number.isSafeInteger(generation) && generation >= 0
    ? generation
    : null;
}

export function learningAnalyticsEventForDelivery(event: LearningAnalyticsEvent) {
  const {
    [learningAnalyticsDeliveryGenerationField]: _generation,
    [learningAnalyticsBoundaryTokenField]: _boundaryToken,
    [learningAnalyticsPhysicalCommitField]: _physicalCommit,
    ...deliveryEvent
  } = event as GenerationalLearningAnalyticsEvent;
  return deliveryEvent as LearningAnalyticsEvent;
}

export function learningAnalyticsEventsForPublicProjection(
  events: readonly LearningAnalyticsEvent[]
) {
  return events.map(learningAnalyticsEventForDelivery);
}

function learningAnalyticsEventForInternalStorage(
  event: LearningAnalyticsEvent
) {
  const {
    [learningAnalyticsDeliveryGenerationField]: _generation,
    [learningAnalyticsBoundaryTokenField]: _boundaryToken,
    ...storageEvent
  } = event as GenerationalLearningAnalyticsEvent;
  return storageEvent as LearningAnalyticsEvent;
}

function withLearningAnalyticsBoundaryToken(
  event: LearningAnalyticsEvent,
  boundaryToken: string
): LearningAnalyticsEvent {
  const preservePhysicalCommit =
    physicalLearningAnalyticsCommitSequence(event);
  return {
    ...learningAnalyticsEventForDelivery(event),
    ...(preservePhysicalCommit !== null
      ? { [learningAnalyticsPhysicalCommitField]: preservePhysicalCommit }
      : {}),
    [learningAnalyticsBoundaryTokenField]: boundaryToken
  } as GenerationalLearningAnalyticsEvent;
}

function withLearningAnalyticsDurabilityLineage(
  event: LearningAnalyticsEvent,
  generation: number,
  boundaryToken: string | null
) {
  const generational = withLearningAnalyticsDeliveryGeneration(event, generation);
  return boundaryToken
    ? {
        ...generational,
        [learningAnalyticsBoundaryTokenField]: boundaryToken
      } as GenerationalLearningAnalyticsEvent
    : generational;
}

function learningAnalyticsBoundaryToken(event: LearningAnalyticsEvent) {
  const value = (event as GenerationalLearningAnalyticsEvent)[
    learningAnalyticsBoundaryTokenField
  ];
  return isNonEmptyProtocolId(value) ? value : null;
}

const dayMs = 24 * 60 * 60 * 1000;
const eventTypes = new Set<LearningAnalyticsEventType>([
  "mouse-click",
  "keyboard",
  "answer-correct",
  "answer-wrong",
  "hint-request",
  "visualization-slider",
  "visualization-drag",
  "visualization-probe",
  "visualization-simulate",
  "visualization-reset",
  "visualization-complete",
  "page-view",
  "mistake-review"
]);
const eventSources = new Set<LearningAnalyticsEventSource>([
  "adaptive-learning",
  "dashboard",
  "practice",
  "progress",
  "lesson",
  "ai-tutor",
  "mistake-book",
  "visualization-lab",
  "function-graph",
  "function-model",
  "geometry",
  "probability",
  "coordinate-plane",
  "trig-wave",
  "calculus-stats",
  "learning-path",
  "navigation"
]);
const highFrequencyLearningAnalyticsEventTypes = new Set<LearningAnalyticsEventType>([
  "visualization-slider",
  "visualization-drag",
  "visualization-probe"
]);

export function preservePhysicalLearningAnalyticsCommit(
  event: LearningAnalyticsEvent,
  sequence = 0
): LearningAnalyticsEvent {
  if (!isHighFrequencyLearningAnalyticsEvent(event)) {
    throw new TypeError(
      "Only high-frequency learning analytics can opt into physical-commit preservation."
    );
  }
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new TypeError(
      "A preserved physical learning-analytics commit requires a non-negative safe sequence."
    );
  }
  return {
    ...event,
    [learningAnalyticsPhysicalCommitField]: sequence
  } as GenerationalLearningAnalyticsEvent;
}

export function createPhysicalLearningAnalyticsCommit(
  event: LearningAnalyticsEvent,
  sequence: number,
  collisionToken: string
): LearningAnalyticsEvent {
  if (
    typeof collisionToken !== "string" ||
    collisionToken.length === 0 ||
    collisionToken !== collisionToken.trim() ||
    collisionToken.length > 231
  ) {
    throw new TypeError(
      "A physical learning-analytics commit requires a canonical collision token."
    );
  }
  return preservePhysicalLearningAnalyticsCommit(
    {
      ...event,
      id: `physical:${collisionToken}`
    },
    sequence
  );
}

function physicalLearningAnalyticsCommitSequence(event: LearningAnalyticsEvent) {
  const sequence = (event as GenerationalLearningAnalyticsEvent)[
    learningAnalyticsPhysicalCommitField
  ];
  return typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence >= 0
    ? sequence
    : null;
}

export function isPreservedPhysicalLearningAnalyticsCommit(
  event: Pick<LearningAnalyticsEvent, "type"> | LearningAnalyticsEvent
) {
  return physicalLearningAnalyticsCommitSequence(event as LearningAnalyticsEvent) !== null;
}

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function countEvents(events: LearningAnalyticsEvent[], type: LearningAnalyticsEventType) {
  return events.filter((event) => event.type === type).length;
}

export function sanitizeAnalyticsId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "guest";
}

export function createLearningAnalyticsEvent(
  input: LearningAnalyticsInput,
  grade: GradeId,
  now: Date = new Date()
): LearningAnalyticsEvent {
  const timestamp = now.toISOString();
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
    type: input.type,
    source: input.source,
    timestamp,
    grade,
    topicId: input.topicId,
    questionId: input.questionId,
    classId: input.classId,
    assignmentId: input.assignmentId,
    competencyId: input.competencyId,
    durationSeconds:
      typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds > 0
        ? Math.round(input.durationSeconds)
        : undefined
  };
}

export function isHighFrequencyLearningAnalyticsEvent(
  event: Pick<LearningAnalyticsEvent | LearningAnalyticsInput, "type">
) {
  return highFrequencyLearningAnalyticsEventTypes.has(event.type);
}

function coalescedLearningAnalyticsEventKey(event: LearningAnalyticsEvent) {
  const semanticKey = [
    event.type,
    event.source,
    event.grade,
    event.topicId,
    event.questionId ?? "",
    event.classId ?? "",
    event.assignmentId ?? "",
    event.competencyId ?? ""
  ].join("\u001f");
  return isPreservedPhysicalLearningAnalyticsCommit(event)
    ? `${semanticKey}\u001f${event.id}`
    : semanticKey;
}

export function coalesceLearningAnalyticsEvents(events: LearningAnalyticsEvent[]) {
  const coalesced: LearningAnalyticsEvent[] = [];
  const highFrequencyIndexes = new Map<string, number>();

  events.forEach((event) => {
    if (!isHighFrequencyLearningAnalyticsEvent(event)) {
      coalesced.push(event);
      return;
    }

    const key = coalescedLearningAnalyticsEventKey(event);
    const existingIndex = highFrequencyIndexes.get(key);
    if (typeof existingIndex === "number") {
      coalesced[existingIndex] = event;
      return;
    }

    highFrequencyIndexes.set(key, coalesced.length);
    coalesced.push(event);
  });

  return coalesced;
}

export function selectLearningAnalyticsDeliveryBatch(
  events: readonly LearningAnalyticsEvent[],
  maximumBatchSize: number
) {
  if (!Number.isSafeInteger(maximumBatchSize) || maximumBatchSize < 1) {
    return [];
  }
  const bounded = events.slice(0, maximumBatchSize);
  const firstPhysicalCommitIndex = bounded.findIndex(
    isPreservedPhysicalLearningAnalyticsCommit
  );
  if (firstPhysicalCommitIndex === 0) return bounded.slice(0, 1);
  if (firstPhysicalCommitIndex > 0) {
    return bounded.slice(0, firstPhysicalCommitIndex);
  }
  return bounded;
}

export type LearningAnalyticsOutboxStorage = Pick<
  Storage,
  "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

const legacyLearningAnalyticsOutboxStoragePrefix = "mais:learning-analytics-outbox:v1:";
const learningAnalyticsOutboxStoragePrefix = "mais:learning-analytics-outbox:v2:";
const unconfirmedLearningAnalyticsOutboxStoragePrefix =
  "mais:learning-analytics-unconfirmed-outbox:v1:";
const learningAnalyticsGenerationStoragePrefix = "mais:learning-analytics-generation:v1:";
const learningAnalyticsClearFenceStoragePrefix = "mais:learning-analytics-clear-fence:v1:";
const learningAnalyticsGenerationHandshakeStoragePrefix =
  "mais:learning-analytics-generation-handshake:v1:";
const learningAnalyticsGenerationTransitionStoragePrefix =
  "mais:learning-analytics-generation-transition:v1:";
const learningAnalyticsBoundaryLineageStoragePrefix =
  "mais:learning-analytics-boundary-lineage:v1:";
const learningAnalyticsQuarantineStoragePrefix =
  "mais:learning-analytics-generation-quarantine:v1:";
const learningAnalyticsCorruptOutboxStoragePrefix =
  "mais:learning-analytics-corrupt-outbox:v1:";
const visualizationCompletionTelemetryStoragePrefix =
  "mais:viz-completion-telemetry:v1:";

type LearningAnalyticsStoredRecordState<T> =
  | { status: "absent" }
  | { status: "corrupt" }
  | { status: "valid"; value: T };

export type LearningAnalyticsClearFence = {
  version: 2;
  phase: "collecting" | "prepared";
  userId: string;
  baseGeneration: number;
  requestedAt: string;
  requestId: string;
  deleteAttemptedAt: string | null;
  clearedStorageKeys: string[];
  clearedCompletionStorageKeys: string[];
  completionClaims: LearningAnalyticsCompletionClaim[];
};

export type LearningAnalyticsGenerationHandshake = {
  version: 2;
  phase: "collecting" | "prepared";
  userId: string;
  generation: number;
  startedAt: string;
  requestId: string;
  existingUnconfirmedEventIds: string[];
};

export type LearningAnalyticsGenerationTransition = {
  version: 2;
  phase: "collecting" | "prepared";
  userId: string;
  kind: "forward-clear" | "authoritative-lower";
  fromGeneration: number;
  toGeneration: number;
  boundaryClearedAt: string | null;
  preserveEventIds: string[];
  quarantineEventIds: string[];
  preserveUnconfirmedStorageKeys: string[];
  quarantineConfirmedStorageKeys: string[];
  quarantineUnconfirmedStorageKeys: string[];
  clearedCompletionStorageKeys: string[];
  preparedAt: string;
  transitionId: string;
  preserveAllUnconfirmed: boolean;
  completionClaims: LearningAnalyticsCompletionClaim[];
};

type LearningAnalyticsBoundaryLineage = {
  version: 1;
  userId: string;
  generation: number;
  preservedBoundaryTokens: string[];
};

type LearningAnalyticsCompletionClaim = {
  storageKey: string;
  originalValue: string;
  claimedValue: string;
};

type LegacyLearningAnalyticsClearFence = Omit<
  LearningAnalyticsClearFence,
  "version" | "phase" | "completionClaims"
> & { version: 1 };
type LegacyLearningAnalyticsGenerationHandshake = Omit<
  LearningAnalyticsGenerationHandshake,
  "version" | "phase"
> & { version: 1 };
type LegacyLearningAnalyticsGenerationTransition = Omit<
  LearningAnalyticsGenerationTransition,
  | "version"
  | "phase"
  | "completionClaims"
  | "preserveUnconfirmedStorageKeys"
  | "quarantineConfirmedStorageKeys"
  | "quarantineUnconfirmedStorageKeys"
> & { version: 1 };

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyProtocolId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 240;
}

function readStoredProtocolRecord<T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  normalize: (value: unknown) => T | null
): LearningAnalyticsStoredRecordState<T> {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: "corrupt" };
  }
  if (raw === null) return { status: "absent" };
  try {
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalize(parsed);
    return normalized
      ? { status: "valid", value: normalized }
      : { status: "corrupt" };
  } catch {
    return { status: "corrupt" };
  }
}

function hasUniqueProtocolIds(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every(isNonEmptyProtocolId) &&
    new Set(value).size === value.length;
}

function hasUniqueStorageKeys(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((key) => typeof key === "string" && key.length > 0) &&
    new Set(value).size === value.length;
}

function isLearningAnalyticsClearStorageKey(key: string, userId: string) {
  const legacyKey = `${legacyLearningAnalyticsOutboxStoragePrefix}${encodeURIComponent(userId)}`;
  return (
    key.startsWith(learningAnalyticsOutboxStorageKey(userId)) ||
    key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId)) ||
    key.startsWith(learningAnalyticsQuarantineStorageKey(userId)) ||
    key.startsWith(learningAnalyticsCorruptOutboxStorageKey(userId, "confirmed")) ||
    key.startsWith(learningAnalyticsCorruptOutboxStorageKey(userId, "unconfirmed")) ||
    key === legacyKey ||
    key === `${legacyKey}:quarantine`
  );
}

type LearningAnalyticsStorageSnapshot<T> =
  | { status: "available"; value: T }
  | { status: "unavailable" };

function stableStorageKeySnapshot(
  storage: Pick<Storage, "key" | "length">,
  predicate: (key: string) => boolean
): LearningAnalyticsStorageSnapshot<string[]> {
  let previous: string[] | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const length = storage.length;
      const keys: string[] = [];
      // Reverse enumeration is resilient to a peer deleting a lower index
      // while this snapshot is being collected. Repeated identical snapshots
      // are required before any destructive protocol uses the result.
      for (let index = length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && predicate(key)) keys.push(key);
      }
      const current = [...new Set(keys)].sort();
      if (
        previous !== null &&
        current.length === previous.length &&
        current.every((key, index) => key === previous?.[index])
      ) return { status: "available", value: current };
      previous = current;
    } catch {
      return { status: "unavailable" };
    }
  }
  return { status: "unavailable" };
}

function learningAnalyticsClearStorageKeys(
  storage: Pick<Storage, "key" | "length">,
  userId: string
) {
  const snapshot = stableStorageKeySnapshot(
    storage,
    (key) => isLearningAnalyticsClearStorageKey(key, userId)
  );
  if (snapshot.status === "unavailable") {
    throw new Error("Learning-analytics storage enumeration is unavailable.");
  }
  return snapshot.value;
}

function isVisualizationCompletionTelemetryStorageKey(key: string, userId: string) {
  return key.startsWith(visualizationCompletionTelemetryStorageKey(userId));
}

function visualizationCompletionTelemetryStorageKeys(
  storage: Pick<Storage, "key" | "length">,
  userId: string
) {
  const snapshot = stableStorageKeySnapshot(
    storage,
    (key) => isVisualizationCompletionTelemetryStorageKey(key, userId)
  );
  if (snapshot.status === "unavailable") {
    throw new Error("Visualization completion storage enumeration is unavailable.");
  }
  return snapshot.value;
}

function isLearningAnalyticsCompletionClaim(
  value: unknown,
  expectedUserId: string
): value is LearningAnalyticsCompletionClaim {
  const record = value as Partial<LearningAnalyticsCompletionClaim> | null;
  return (
    typeof record?.storageKey === "string" &&
    isVisualizationCompletionTelemetryStorageKey(record.storageKey, expectedUserId) &&
    typeof record.originalValue === "string" &&
    typeof record.claimedValue === "string" &&
    record.claimedValue.length > 0
  );
}

function normalizeLearningAnalyticsClearFence(
  value: unknown,
  expectedUserId: string
): LearningAnalyticsClearFence | null {
  const record = value as Partial<LearningAnalyticsClearFence> &
    Partial<LegacyLearningAnalyticsClearFence> | null;
  const commonIsValid =
    record?.userId === expectedUserId &&
    isNonNegativeSafeInteger(record.baseGeneration) &&
    isCanonicalIsoTimestamp(record.requestedAt) &&
    isNonEmptyProtocolId(record.requestId) &&
    (record.deleteAttemptedAt === null || isCanonicalIsoTimestamp(record.deleteAttemptedAt)) &&
    hasUniqueStorageKeys(record.clearedStorageKeys) &&
    record.clearedStorageKeys.every((key) =>
      isLearningAnalyticsClearStorageKey(key, expectedUserId)
    ) &&
    hasUniqueStorageKeys(record.clearedCompletionStorageKeys) &&
    record.clearedCompletionStorageKeys.every((key) =>
      isVisualizationCompletionTelemetryStorageKey(key, expectedUserId)
    );
  if (!commonIsValid) return null;
  if (record.version === 1) {
    // Old markers predate the writer gate. Normalize them to a collecting v2
    // marker and distrust their pre-marker snapshots; the next mutating step
    // will durably publish v2 before classifying any row.
    return {
      version: 2,
      phase: "collecting",
      userId: expectedUserId,
      baseGeneration: record.baseGeneration!,
      requestedAt: record.requestedAt!,
      requestId: record.requestId!,
      deleteAttemptedAt: record.deleteAttemptedAt ?? null,
      clearedStorageKeys: [],
      clearedCompletionStorageKeys: [],
      completionClaims: []
    };
  }
  if (
    record.version !== 2 ||
    (record.phase !== "collecting" && record.phase !== "prepared") ||
    !Array.isArray(record.completionClaims) ||
    !record.completionClaims.every((claim) =>
      isLearningAnalyticsCompletionClaim(claim, expectedUserId)
    )
  ) return null;
  return record as LearningAnalyticsClearFence;
}

function normalizeLearningAnalyticsGenerationHandshake(
  value: unknown,
  expectedUserId: string
): LearningAnalyticsGenerationHandshake | null {
  const record = value as Partial<LearningAnalyticsGenerationHandshake> &
    Partial<LegacyLearningAnalyticsGenerationHandshake> | null;
  if (
    record?.userId !== expectedUserId ||
    !isNonNegativeSafeInteger(record.generation) ||
    !isCanonicalIsoTimestamp(record.startedAt) ||
    !isNonEmptyProtocolId(record.requestId) ||
    !hasUniqueProtocolIds(record.existingUnconfirmedEventIds)
  ) return null;
  if (record.version === 1) {
    return {
      version: 2,
      phase: "collecting",
      userId: expectedUserId,
      generation: record.generation,
      startedAt: record.startedAt,
      requestId: record.requestId,
      existingUnconfirmedEventIds: []
    };
  }
  return record.version === 2 &&
    (record.phase === "collecting" || record.phase === "prepared")
    ? record as LearningAnalyticsGenerationHandshake
    : null;
}

function normalizeLearningAnalyticsGenerationTransition(
  value: unknown,
  expectedUserId: string
): LearningAnalyticsGenerationTransition | null {
  const record = value as Partial<LearningAnalyticsGenerationTransition> &
    Partial<LegacyLearningAnalyticsGenerationTransition> | null;
  if (
    record?.userId !== expectedUserId ||
    (record.kind !== "forward-clear" && record.kind !== "authoritative-lower") ||
    !isNonNegativeSafeInteger(record.fromGeneration) ||
    !isNonNegativeSafeInteger(record.toGeneration) ||
    !hasUniqueProtocolIds(record.preserveEventIds) ||
    !hasUniqueProtocolIds(record.quarantineEventIds) ||
    !hasUniqueStorageKeys(record.clearedCompletionStorageKeys) ||
    !record.clearedCompletionStorageKeys.every((key) =>
      isVisualizationCompletionTelemetryStorageKey(key, expectedUserId)
    ) ||
    !isCanonicalIsoTimestamp(record.preparedAt) ||
    !isNonEmptyProtocolId(record.transitionId) ||
    typeof record.preserveAllUnconfirmed !== "boolean"
  ) return null;
  const directionIsValid = record.kind === "forward-clear"
    ? record.toGeneration > record.fromGeneration &&
      isCanonicalIsoTimestamp(record.boundaryClearedAt)
    : record.toGeneration < record.fromGeneration &&
      record.boundaryClearedAt === null;
  if (!directionIsValid) return null;
  if (record.version === 1) {
    return {
      version: 2,
      phase: "collecting",
      userId: expectedUserId,
      kind: record.kind,
      fromGeneration: record.fromGeneration,
      toGeneration: record.toGeneration,
      boundaryClearedAt: record.boundaryClearedAt as string | null,
      preserveEventIds: [],
      quarantineEventIds: [],
      preserveUnconfirmedStorageKeys: [],
      quarantineConfirmedStorageKeys: [],
      quarantineUnconfirmedStorageKeys: [],
      clearedCompletionStorageKeys: [],
      preparedAt: record.preparedAt,
      transitionId: record.transitionId,
      preserveAllUnconfirmed: false,
      completionClaims: []
    };
  }
  const exactRevisionKeysAreValid =
    hasUniqueStorageKeys(record.preserveUnconfirmedStorageKeys) &&
    record.preserveUnconfirmedStorageKeys.every((key) =>
      key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(expectedUserId))
    ) &&
    hasUniqueStorageKeys(record.quarantineConfirmedStorageKeys) &&
    record.quarantineConfirmedStorageKeys.every((key) =>
      key.startsWith(learningAnalyticsOutboxStorageKey(expectedUserId))
    ) &&
    hasUniqueStorageKeys(record.quarantineUnconfirmedStorageKeys) &&
    record.quarantineUnconfirmedStorageKeys.every((key) =>
      key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(expectedUserId))
    );
  if (record.version === 2 && !exactRevisionKeysAreValid) {
    // A marker written by the pre-revision protocol cannot safely reuse its
    // ID-only prepared classification. Re-open collection under the already
    // durable writer gate and classify the physical rows again.
    return {
      ...(record as LearningAnalyticsGenerationTransition),
      phase: "collecting",
      preserveEventIds: [],
      quarantineEventIds: [],
      preserveUnconfirmedStorageKeys: [],
      quarantineConfirmedStorageKeys: [],
      quarantineUnconfirmedStorageKeys: []
    };
  }
  if (
    record.version !== 2 ||
    (record.phase !== "collecting" && record.phase !== "prepared") ||
    !Array.isArray(record.completionClaims) ||
    !record.completionClaims.every((claim) =>
      isLearningAnalyticsCompletionClaim(claim, expectedUserId)
    ) ||
    !exactRevisionKeysAreValid
  ) return null;
  return record as LearningAnalyticsGenerationTransition;
}

export function learningAnalyticsClearFenceStorageKey(userId: string) {
  return `${learningAnalyticsClearFenceStoragePrefix}${encodeURIComponent(userId)}`;
}

export function learningAnalyticsGenerationHandshakeStorageKey(userId: string) {
  return `${learningAnalyticsGenerationHandshakeStoragePrefix}${encodeURIComponent(userId)}`;
}

export function learningAnalyticsGenerationTransitionStorageKey(userId: string) {
  return `${learningAnalyticsGenerationTransitionStoragePrefix}${encodeURIComponent(userId)}`;
}

export function learningAnalyticsBoundaryLineageStorageKey(userId: string) {
  return `${learningAnalyticsBoundaryLineageStoragePrefix}${encodeURIComponent(userId)}`;
}

function readLearningAnalyticsBoundaryLineage(
  storage: Pick<Storage, "getItem">,
  userId: string
): LearningAnalyticsBoundaryLineage | null {
  let raw: string | null;
  try {
    raw = storage.getItem(learningAnalyticsBoundaryLineageStorageKey(userId));
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<LearningAnalyticsBoundaryLineage> | null;
    return value?.version === 1 &&
      value.userId === userId &&
      isNonNegativeSafeInteger(value.generation) &&
      hasUniqueProtocolIds(value.preservedBoundaryTokens)
      ? value as LearningAnalyticsBoundaryLineage
      : null;
  } catch {
    return null;
  }
}

function recordLearningAnalyticsBoundaryLineage(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  generation: number,
  boundaryTokens: readonly string[]
) {
  if (!isNonNegativeSafeInteger(generation)) {
    throw new TypeError("Invalid learning-analytics boundary generation.");
  }
  const existing = readLearningAnalyticsBoundaryLineage(storage, userId);
  const preservedBoundaryTokens = [...new Set([
    ...(existing?.generation === generation
      ? existing.preservedBoundaryTokens
      : []),
    ...boundaryTokens.filter(isNonEmptyProtocolId)
  ])].sort();
  const lineage: LearningAnalyticsBoundaryLineage = {
    version: 1,
    userId,
    generation,
    preservedBoundaryTokens
  };
  storage.setItem(
    learningAnalyticsBoundaryLineageStorageKey(userId),
    JSON.stringify(lineage)
  );
  return lineage;
}

export function learningAnalyticsDurabilityLineageIsRecoverable(
  storage: Pick<Storage, "getItem">,
  userId: string,
  originalGeneration: number,
  boundaryToken: string | null,
  currentGeneration: number
) {
  if (
    !isNonNegativeSafeInteger(originalGeneration) ||
    !isNonNegativeSafeInteger(currentGeneration)
  ) return false;
  if (originalGeneration === currentGeneration) return true;
  if (!boundaryToken) return false;
  const lineage = readLearningAnalyticsBoundaryLineage(storage, userId);
  return lineage?.generation === currentGeneration &&
    lineage.preservedBoundaryTokens.includes(boundaryToken);
}

export function learningAnalyticsQuarantineStorageKey(userId: string, eventId?: string) {
  const prefix = `${learningAnalyticsQuarantineStoragePrefix}${encodeURIComponent(userId)}:`;
  return typeof eventId === "string"
    ? `${prefix}${encodeURIComponent(eventId)}`
    : prefix;
}

export function learningAnalyticsCorruptOutboxStorageKey(
  userId: string,
  source: "confirmed" | "unconfirmed",
  originalStorageKey?: string
) {
  const prefix = `${learningAnalyticsCorruptOutboxStoragePrefix}${encodeURIComponent(userId)}:${source}:`;
  return typeof originalStorageKey === "string"
    ? `${prefix}${encodeURIComponent(originalStorageKey)}`
    : prefix;
}

export function visualizationCompletionTelemetryStorageKey(
  userId: string,
  moduleId?: string,
  topicId?: string,
  protocolRevision?: string
) {
  const prefix = `${visualizationCompletionTelemetryStoragePrefix}${encodeURIComponent(userId)}/`;
  if (typeof moduleId !== "string" || typeof topicId !== "string") return prefix;
  const scopeKey = `${prefix}${encodeURIComponent(moduleId)}/${encodeURIComponent(topicId)}`;
  return typeof protocolRevision === "string"
    ? `${scopeKey}/revision/${encodeURIComponent(protocolRevision)}`
    : scopeKey;
}

export type VisualizationCompletionTelemetryMarker = {
  version: 2;
  phase: "pending" | "complete";
  userId: string;
  moduleId: string;
  topicId: string;
  token: string;
  eventId: string;
  eventTimestamp: string;
  protocolRevision: string;
};

export type VisualizationCompletionTelemetryState =
  | { status: "absent" }
  | { status: "corrupt" }
  | {
      status: "pending" | "complete";
      marker: VisualizationCompletionTelemetryMarker;
    };

function completionIdentityIsCanonical(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    value === value.trim()
  );
}

function completionIdentityHash(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function visualizationCompletionTelemetryEventId(
  userId: string,
  moduleId: string,
  topicId: string
) {
  if (
    !completionIdentityIsCanonical(userId) ||
    !completionIdentityIsCanonical(moduleId) ||
    !completionIdentityIsCanonical(topicId)
  ) throw new TypeError("Completion telemetry identity must be canonical.");
  const identity = JSON.stringify([userId, moduleId, topicId]);
  return `viz-completion-v2-${[
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35
  ].map((seed) => completionIdentityHash(identity, seed)).join("")}`;
}

function isVisualizationCompletionTelemetryMarker(
  value: unknown,
  userId: string,
  moduleId: string,
  topicId: string,
  protocolRevision: string
): value is VisualizationCompletionTelemetryMarker {
  const marker = value as Partial<VisualizationCompletionTelemetryMarker> | null;
  return (
    marker?.version === 2 &&
    (marker.phase === "pending" || marker.phase === "complete") &&
    marker.userId === userId &&
    marker.moduleId === moduleId &&
    marker.topicId === topicId &&
    marker.protocolRevision === protocolRevision &&
    isNonEmptyProtocolId(marker.protocolRevision) &&
    isNonEmptyProtocolId(marker.token) &&
    marker.token === marker.token.trim() &&
    marker.eventId === visualizationCompletionTelemetryEventId(
      userId,
      moduleId,
      topicId
    ) &&
    isCanonicalIsoTimestamp(marker.eventTimestamp)
  );
}

function visualizationCompletionTelemetryProtocolRevision(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  const boundaryToken = learningAnalyticsActiveWriterGateToken(storage, userId);
  if (boundaryToken) return `boundary:${boundaryToken}`;
  return `generation:${readLearningAnalyticsGeneration(storage, userId)}`;
}

function visualizationCompletionTelemetryRevisionCanRebase(
  storage: Pick<Storage, "getItem">,
  userId: string,
  fromRevision: string,
  toRevision: string
) {
  if (fromRevision === toRevision) return true;
  if (!fromRevision.startsWith("boundary:") || !toRevision.startsWith("generation:")) {
    return false;
  }
  const boundaryToken = fromRevision.slice("boundary:".length);
  const generation = Number(toRevision.slice("generation:".length));
  const lineage = readLearningAnalyticsBoundaryLineage(storage, userId);
  return Number.isSafeInteger(generation) && generation >= 0 &&
    lineage?.generation === generation &&
    lineage.preservedBoundaryTokens.includes(boundaryToken);
}

export function readVisualizationCompletionTelemetryOnce(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  moduleId: string,
  topicId: string
): VisualizationCompletionTelemetryState {
  const storageKey = visualizationCompletionTelemetryStorageKey(
    userId,
    moduleId,
    topicId
  );
  let protocolRevision: string;
  try {
    protocolRevision = visualizationCompletionTelemetryProtocolRevision(
      storage,
      userId
    );
  } catch {
    return { status: "corrupt" };
  }
  const revisionStorageKey = visualizationCompletionTelemetryStorageKey(
    userId,
    moduleId,
    topicId,
    protocolRevision
  );
  let raw: string | null;
  try {
    raw = storage.getItem(revisionStorageKey);
  } catch {
    return { status: "corrupt" };
  }
  if (raw === null) {
    const lineage = readLearningAnalyticsBoundaryLineage(storage, userId);
    let currentGeneration: number;
    try {
      currentGeneration = readLearningAnalyticsGeneration(storage, userId);
    } catch {
      return { status: "corrupt" };
    }
    let recovered: VisualizationCompletionTelemetryMarker | null = null;
    for (const boundaryToken of lineage?.generation === currentGeneration
      ? lineage.preservedBoundaryTokens
      : []) {
      const boundaryRevision = `boundary:${boundaryToken}`;
      const boundaryStorageKey = visualizationCompletionTelemetryStorageKey(
        userId,
        moduleId,
        topicId,
        boundaryRevision
      );
      let boundaryRaw: string | null;
      try {
        boundaryRaw = storage.getItem(boundaryStorageKey);
      } catch {
        return { status: "corrupt" };
      }
      if (boundaryRaw === null) continue;
      try {
        const parsed: unknown = JSON.parse(boundaryRaw);
        if (!isVisualizationCompletionTelemetryMarker(
          parsed,
          userId,
          moduleId,
          topicId,
          boundaryRevision
        )) continue;
        if (
          !recovered ||
          (recovered.phase === "pending" && parsed.phase === "complete") ||
          (recovered.phase === parsed.phase &&
            parsed.eventTimestamp < recovered.eventTimestamp)
        ) recovered = parsed;
      } catch {
        return { status: "corrupt" };
      }
    }
    if (recovered) {
      const rebased: VisualizationCompletionTelemetryMarker = {
        ...recovered,
        protocolRevision
      };
      try {
        storage.setItem(revisionStorageKey, JSON.stringify(rebased));
      } catch {
        // The boundary-lineage revision remains a durable exact-once marker.
        return { status: recovered.phase, marker: recovered };
      }
      return { status: rebased.phase, marker: rebased };
    }
    if (lineage?.generation === currentGeneration) {
      // Once a durable causal boundary exists, an unversioned legacy value
      // written later cannot prove whether it predates or follows a clear.
      // Ignore it rather than resurrecting pre-clear completion state.
      return { status: "absent" };
    }
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return { status: "corrupt" };
    }
    if (raw === null) return { status: "absent" };
  }
  if (raw === "1") {
    const marker: VisualizationCompletionTelemetryMarker = {
      version: 2,
      phase: "complete",
      userId,
      moduleId,
      topicId,
      token: "legacy-v1-complete",
      eventId: visualizationCompletionTelemetryEventId(userId, moduleId, topicId),
      eventTimestamp: new Date(0).toISOString(),
      protocolRevision
    };
    try {
      storage.setItem(revisionStorageKey, JSON.stringify(marker));
    } catch {
      // The legacy complete marker still fails closed against duplication.
    }
    return { status: "complete", marker };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isVisualizationCompletionTelemetryMarker(
      parsed,
      userId,
      moduleId,
      topicId,
      protocolRevision
    )) return { status: "corrupt" };
    return { status: parsed.phase, marker: parsed };
  } catch {
    return { status: "corrupt" };
  }
}

export function beginVisualizationCompletionTelemetryOnce(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  moduleId: string,
  topicId: string,
  token: string
) {
  if (!isNonEmptyProtocolId(token) || token !== token.trim()) {
    throw new TypeError("Completion telemetry token must be canonical.");
  }
  const existing = readVisualizationCompletionTelemetryOnce(
    storage,
    userId,
    moduleId,
    topicId
  );
  if (existing.status === "corrupt") {
    throw new Error("A corrupt completion telemetry marker must fail closed.");
  }
  if (existing.status === "pending" || existing.status === "complete") {
    return existing;
  }
  const marker: VisualizationCompletionTelemetryMarker = {
    version: 2,
    phase: "pending",
    userId,
    moduleId,
    topicId,
    token,
    eventId: visualizationCompletionTelemetryEventId(userId, moduleId, topicId),
    eventTimestamp: new Date().toISOString(),
    protocolRevision: visualizationCompletionTelemetryProtocolRevision(
      storage,
      userId
    )
  };
  let stabilizedMarker = marker;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    storage.setItem(
      visualizationCompletionTelemetryStorageKey(
        userId,
        moduleId,
        topicId,
        stabilizedMarker.protocolRevision
      ),
      JSON.stringify(stabilizedMarker)
    );
    const currentRevision = visualizationCompletionTelemetryProtocolRevision(
      storage,
      userId
    );
    if (currentRevision === stabilizedMarker.protocolRevision) {
      return { status: "pending" as const, marker: stabilizedMarker };
    }
    if (!visualizationCompletionTelemetryRevisionCanRebase(
      storage,
      userId,
      stabilizedMarker.protocolRevision,
      currentRevision
    )) {
      // A newly installed clear/fence owns the old revision. Rewriting a
      // pre-boundary pending marker under that boundary would resurrect work
      // that the clear has already claimed.
      return { status: "pending" as const, marker: stabilizedMarker };
    }
    stabilizedMarker = {
      ...stabilizedMarker,
      protocolRevision: currentRevision
    };
  }
  throw new Error("Completion telemetry protocol did not stabilize.");
}

export function completeVisualizationCompletionTelemetryOnce(
  storage: Pick<Storage, "getItem" | "setItem">,
  marker: VisualizationCompletionTelemetryMarker
) {
  if (!isVisualizationCompletionTelemetryMarker(
    marker,
    marker.userId,
    marker.moduleId,
    marker.topicId,
    marker.protocolRevision
  ) || marker.phase !== "pending") return false;
  const current = readVisualizationCompletionTelemetryOnce(
    storage,
    marker.userId,
    marker.moduleId,
    marker.topicId
  );
  if (
    current.status !== "pending" ||
    current.marker.token !== marker.token ||
    current.marker.eventId !== marker.eventId
  ) return false;
  let completeMarker: VisualizationCompletionTelemetryMarker = {
    ...current.marker,
    phase: "complete"
  };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const storageKey = visualizationCompletionTelemetryStorageKey(
      marker.userId,
      marker.moduleId,
      marker.topicId,
      completeMarker.protocolRevision
    );
    storage.setItem(storageKey, JSON.stringify(completeMarker));
    const currentRevision = visualizationCompletionTelemetryProtocolRevision(
      storage,
      marker.userId
    );
    if (currentRevision !== completeMarker.protocolRevision) {
      if (!visualizationCompletionTelemetryRevisionCanRebase(
        storage,
        marker.userId,
        completeMarker.protocolRevision,
        currentRevision
      )) return false;
      completeMarker = { ...completeMarker, protocolRevision: currentRevision };
      continue;
    }
    const reread = readVisualizationCompletionTelemetryOnce(
      storage,
      marker.userId,
      marker.moduleId,
      marker.topicId
    );
    return (
      reread.status === "complete" &&
      reread.marker.token === marker.token &&
      reread.marker.eventId === marker.eventId
    );
  }
  return false;
}

export function clearVisualizationCompletionTelemetryForUser(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
) {
  const prefix = visualizationCompletionTelemetryStorageKey(userId);
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}

export function clearVisualizationCompletionTelemetryStorageKeys(
  storage: Pick<Storage, "removeItem">,
  userId: string,
  storageKeys: readonly string[]
) {
  const keys = [...new Set(storageKeys)].filter((key) =>
    isVisualizationCompletionTelemetryStorageKey(key, userId)
  );
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}

export function readLearningAnalyticsClearFence(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  return readStoredProtocolRecord(
    storage,
    learningAnalyticsClearFenceStorageKey(userId),
    (value) => normalizeLearningAnalyticsClearFence(value, userId)
  );
}

export function readLearningAnalyticsGenerationHandshake(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  return readStoredProtocolRecord(
    storage,
    learningAnalyticsGenerationHandshakeStorageKey(userId),
    (value) => normalizeLearningAnalyticsGenerationHandshake(value, userId)
  );
}

export function readLearningAnalyticsGenerationTransition(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  return readStoredProtocolRecord(
    storage,
    learningAnalyticsGenerationTransitionStorageKey(userId),
    (value) => normalizeLearningAnalyticsGenerationTransition(value, userId)
  );
}

function completionClaimValue(requestId: string, storageKey: string) {
  return JSON.stringify({
    version: 2,
    requestId,
    storageKey
  });
}

function collectCompletionClaims(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  requestId: string,
  preservedBoundaryTokens: readonly string[] = [requestId]
): LearningAnalyticsCompletionClaim[] {
  const preservedRevisionSuffixes = new Set(
    preservedBoundaryTokens.map((token) =>
      `/revision/${encodeURIComponent(`boundary:${token}`)}`
    )
  );
  return visualizationCompletionTelemetryStorageKeys(storage, userId)
    .filter((storageKey) => ![...preservedRevisionSuffixes].some((suffix) =>
      storageKey.endsWith(suffix)
    ))
    .flatMap((storageKey) => {
      const originalValue = storage.getItem(storageKey);
      return originalValue === null
        ? []
        : [{
            storageKey,
            originalValue,
            claimedValue: completionClaimValue(requestId, storageKey)
          }];
    });
}

function collectClearStorageKeysAfterWriterGate(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  boundaryToken: string
) {
  const keys = learningAnalyticsClearStorageKeys(storage, userId);
  const unconfirmedPrefix = unconfirmedLearningAnalyticsOutboxStorageKey(userId);
  return keys.filter((key) => {
    if (!key.startsWith(unconfirmedPrefix)) return true;
    const raw = storage.getItem(key);
    if (raw === null) return false;
    try {
      const parsed: unknown = JSON.parse(raw);
      return !(
        isValidLearningAnalyticsEventLog([parsed]) &&
        learningAnalyticsBoundaryToken(parsed as LearningAnalyticsEvent) ===
          boundaryToken
      );
    } catch {
      return true;
    }
  });
}

function finalizeLearningAnalyticsClearFence(
  storage: LearningAnalyticsOutboxStorage,
  fence: LearningAnalyticsClearFence
) {
  if (fence.phase === "prepared") return fence;
  const completionClaims = fence.completionClaims.length > 0
    ? fence.completionClaims
    : collectCompletionClaims(
        storage,
        fence.userId,
        fence.requestId,
        [fence.requestId]
      );
  const collecting: LearningAnalyticsClearFence = {
    ...fence,
    version: 2,
    phase: "collecting",
    clearedStorageKeys: fence.clearedStorageKeys.length > 0
      ? fence.clearedStorageKeys
      : collectClearStorageKeysAfterWriterGate(
          storage,
          fence.userId,
          fence.requestId
        ),
    clearedCompletionStorageKeys: completionClaims.map(({ storageKey }) =>
      storageKey
    ),
    completionClaims
  };
  // Persist every claim before changing a legacy once-key. A crash can resume
  // from this exact claim list, and marker quota failure remains zero-
  // destructive.
  storage.setItem(
    learningAnalyticsClearFenceStorageKey(fence.userId),
    JSON.stringify(collecting)
  );
  completionClaims.forEach((claim) => {
    const current = storage.getItem(claim.storageKey);
    if (current === claim.originalValue) {
      storage.setItem(claim.storageKey, claim.claimedValue);
    }
  });
  const prepared: LearningAnalyticsClearFence = {
    ...collecting,
    phase: "prepared"
  };
  try {
    storage.setItem(
      learningAnalyticsClearFenceStorageKey(fence.userId),
      JSON.stringify(prepared)
    );
  } catch (error) {
    completionClaims.forEach((claim) => {
      try {
        if (storage.getItem(claim.storageKey) === claim.claimedValue) {
          storage.setItem(claim.storageKey, claim.originalValue);
        }
      } catch {
        // The durable collecting marker retains the claim for restart repair.
      }
    });
    throw error;
  }
  completionClaims.forEach((claim) => {
    if (storage.getItem(claim.storageKey) === claim.claimedValue) {
      storage.removeItem(claim.storageKey);
    }
  });
  return prepared;
}

export function beginLearningAnalyticsClearFence(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  baseGeneration: number,
  requestedAt: string,
  requestId: string
): LearningAnalyticsClearFence {
  if (
    !isNonNegativeSafeInteger(baseGeneration) ||
    !isCanonicalIsoTimestamp(requestedAt) ||
    !isNonEmptyProtocolId(requestId)
  ) throw new TypeError("Invalid learning-analytics clear fence.");
  const existing = readLearningAnalyticsClearFence(storage, userId);
  if (existing.status === "corrupt") {
    throw new Error("A corrupt learning-analytics clear fence must fail closed.");
  }
  if (existing.status === "valid") {
    // Persist the normalized v2 representation before resuming any legacy v1
    // marker. No destructive classification trusts the old snapshot shape.
    storage.setItem(
      learningAnalyticsClearFenceStorageKey(userId),
      JSON.stringify(existing.value)
    );
    return finalizeLearningAnalyticsClearFence(storage, existing.value);
  }
  const fence: LearningAnalyticsClearFence = {
    version: 2,
    phase: "collecting",
    userId,
    baseGeneration,
    requestedAt,
    requestId,
    deleteAttemptedAt: null,
    clearedStorageKeys: [],
    clearedCompletionStorageKeys: [],
    completionClaims: []
  };
  // This collecting marker is the writer linearization point. It must become
  // durable before enumeration, completion claims, or any deletion.
  storage.setItem(learningAnalyticsClearFenceStorageKey(userId), JSON.stringify(fence));
  return finalizeLearningAnalyticsClearFence(storage, fence);
}

export function markLearningAnalyticsClearDeleteAttempted(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  requestId: string,
  attemptedAt: string
) {
  const state = readLearningAnalyticsClearFence(storage, userId);
  if (
    state.status !== "valid" ||
    state.value.requestId !== requestId ||
    !isCanonicalIsoTimestamp(attemptedAt)
  ) throw new Error("Cannot mark an absent, corrupt, or superseded clear fence.");
  const next = { ...state.value, deleteAttemptedAt: attemptedAt };
  storage.setItem(learningAnalyticsClearFenceStorageKey(userId), JSON.stringify(next));
  return next;
}

export function beginLearningAnalyticsGenerationHandshake(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  generation: number,
  startedAt: string,
  requestId: string
): LearningAnalyticsGenerationHandshake {
  if (
    !isNonNegativeSafeInteger(generation) ||
    !isCanonicalIsoTimestamp(startedAt) ||
    !isNonEmptyProtocolId(requestId)
  ) throw new TypeError("Invalid learning-analytics handshake snapshot.");
  const existing = readLearningAnalyticsGenerationHandshake(storage, userId);
  if (existing.status === "corrupt") {
    throw new Error("A corrupt learning-analytics handshake must fail closed.");
  }
  // The marker is an exact-user leader lease held by the Web Lock in the
  // provider. A restarted/peer tab resumes it; overwriting its request id
  // would orphan every writer that already persisted under that token.
  if (existing.status === "valid" && existing.value.phase === "prepared") {
    return existing.value;
  }
  const snapshot: LearningAnalyticsGenerationHandshake = existing.status === "valid"
    ? existing.value
    : {
    version: 2,
    phase: "collecting",
    userId,
    generation,
    startedAt,
    requestId,
    existingUnconfirmedEventIds: []
  };
  // Gate normal writers before discovering which existing rows predate the
  // authoritative handshake.
  storage.setItem(
    learningAnalyticsGenerationHandshakeStorageKey(userId),
    JSON.stringify(snapshot)
  );
  const preparedSnapshot: LearningAnalyticsGenerationHandshake = {
    ...snapshot,
    phase: "prepared",
    existingUnconfirmedEventIds: readUnconfirmedLearningAnalyticsOutbox(
      storage,
      userId
    )
      .filter((event) => learningAnalyticsBoundaryToken(event) === null)
      .map((event) => event.id)
      .sort()
  };
  storage.setItem(
    learningAnalyticsGenerationHandshakeStorageKey(userId),
    JSON.stringify(preparedSnapshot)
  );
  return preparedSnapshot;
}

function exactLearningAnalyticsHandshakeIsHeld(
  storage: LearningAnalyticsOutboxStorage,
  expected: LearningAnalyticsGenerationHandshake
) {
  if (
    learningAnalyticsClientProtocolStatus(storage, expected.userId) !==
    "handshaking"
  ) return false;
  const current = readLearningAnalyticsGenerationHandshake(
    storage,
    expected.userId
  );
  return current.status === "valid" &&
    current.value.version === expected.version &&
    current.value.phase === expected.phase &&
    current.value.userId === expected.userId &&
    current.value.generation === expected.generation &&
    current.value.startedAt === expected.startedAt &&
    current.value.requestId === expected.requestId &&
    current.value.existingUnconfirmedEventIds.length ===
      expected.existingUnconfirmedEventIds.length &&
    current.value.existingUnconfirmedEventIds.every(
      (eventId, index) => eventId === expected.existingUnconfirmedEventIds[index]
    );
}

/**
 * Commits only rows causally owned by one still-held empty handshake. The
 * writer gate remains installed until two consecutive empty snapshots, so a
 * peer writer can never be silently stranded between enumeration and commit.
 */
export function confirmLearningAnalyticsGenerationHandshake(
  storage: LearningAnalyticsOutboxStorage,
  handshake: LearningAnalyticsGenerationHandshake
): "confirmed" | "superseded" | "unavailable" {
  if (!exactLearningAnalyticsHandshakeIsHeld(storage, handshake)) {
    return "superseded";
  }
  if (handshake.phase !== "prepared") return "superseded";
  const preexistingIds = new Set(handshake.existingUnconfirmedEventIds);
  const currentLineageBoundaryTokens = () => {
    const lineage = readLearningAnalyticsBoundaryLineage(
      storage,
      handshake.userId
    );
    return new Set(
      lineage?.generation === handshake.generation
        ? lineage.preservedBoundaryTokens
        : []
    );
  };
  const ownedHandshakeRows = (events: readonly LearningAnalyticsEvent[]) =>
    events.filter((event) => {
      const boundaryToken = learningAnalyticsBoundaryToken(event);
      return boundaryToken === handshake.requestId ||
        (boundaryToken !== null &&
          currentLineageBoundaryTokens().has(boundaryToken)) ||
        (boundaryToken === null && preexistingIds.has(event.id));
    });
  const confirmOwnedRows = (owned: readonly LearningAnalyticsEvent[]) => {
    if (owned.length === 0) return;
    mergeLearningAnalyticsOutbox(
      storage,
      handshake.userId,
      owned.map((event) => withLearningAnalyticsDeliveryGeneration(
        event,
        handshake.generation
      ))
    );
    owned.forEach((event) => {
      storage.removeItem(
        unconfirmedLearningAnalyticsOutboxRecordStorageKey(
          handshake.userId,
          event
        )
      );
    });
  };
  let emptySnapshots = 0;
  try {
    replaceLearningAnalyticsGeneration(
      storage,
      handshake.userId,
      handshake.generation
    );
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (!exactLearningAnalyticsHandshakeIsHeld(storage, handshake)) {
        return "superseded";
      }
      const snapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
        storage,
        handshake.userId
      );
      if (snapshot.status === "unavailable") return "unavailable";
      const owned = ownedHandshakeRows(snapshot.value);
      if (!exactLearningAnalyticsHandshakeIsHeld(storage, handshake)) {
        return "superseded";
      }
      if (owned.length === 0) {
        emptySnapshots += 1;
        if (emptySnapshots < 2) continue;
        recordLearningAnalyticsBoundaryLineage(
          storage,
          handshake.userId,
          handshake.generation,
          [handshake.requestId]
        );
        if (!clearLearningAnalyticsGenerationHandshake(
          storage,
          handshake.userId,
          handshake.requestId
        )) return "superseded";
        // Close the gate before the final drain. A writer that completed while
        // H was still present is now visible here; a writer whose physical set
        // lands later observes the open protocol in its own post-write check
        // and rebases itself. Two stable empty snapshots close the remaining
        // pre-remove window without inventing another gate.
        let postCloseEmptySnapshots = 0;
        for (let closeAttempt = 0; closeAttempt < 8; closeAttempt += 1) {
          if (
            learningAnalyticsClientProtocolStatus(storage, handshake.userId) !== "open" ||
            readLearningAnalyticsGeneration(storage, handshake.userId) !==
              handshake.generation
          ) return "superseded";
          const postCloseSnapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
            storage,
            handshake.userId
          );
          if (postCloseSnapshot.status === "unavailable") return "unavailable";
          const postCloseOwned = ownedHandshakeRows(postCloseSnapshot.value);
          if (postCloseOwned.length === 0) {
            postCloseEmptySnapshots += 1;
            if (postCloseEmptySnapshots >= 2) return "confirmed";
            continue;
          }
          postCloseEmptySnapshots = 0;
          confirmOwnedRows(postCloseOwned);
        }
        return "unavailable";
      }
      emptySnapshots = 0;
      confirmOwnedRows(owned);
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export function clearLearningAnalyticsGenerationHandshake(
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  requestId?: string
) {
  const state = readLearningAnalyticsGenerationHandshake(storage, userId);
  if (state.status === "corrupt") return false;
  if (
    state.status === "valid" &&
    typeof requestId === "string" &&
    state.value.requestId !== requestId
  ) return false;
  storage.removeItem(learningAnalyticsGenerationHandshakeStorageKey(userId));
  return true;
}

export function learningAnalyticsClientProtocolStatus(
  storage: Pick<Storage, "getItem">,
  userId: string
): "open" | "fenced" | "handshaking" | "transitioning" | "corrupt" {
  const fence = readLearningAnalyticsClearFence(storage, userId);
  const handshake = readLearningAnalyticsGenerationHandshake(storage, userId);
  const transition = readLearningAnalyticsGenerationTransition(storage, userId);
  if (
    fence.status === "corrupt" ||
    handshake.status === "corrupt" ||
    transition.status === "corrupt"
  ) return "corrupt";
  if (transition.status === "valid") return "transitioning";
  if (fence.status === "valid") return "fenced";
  if (handshake.status === "valid") return "handshaking";
  return "open";
}

function learningAnalyticsActiveWriterGateToken(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  const transition = readLearningAnalyticsGenerationTransition(storage, userId);
  if (transition.status === "valid") return transition.value.transitionId;
  const fence = readLearningAnalyticsClearFence(storage, userId);
  if (fence.status === "valid") return fence.value.requestId;
  const handshake = readLearningAnalyticsGenerationHandshake(storage, userId);
  return handshake.status === "valid" ? handshake.value.requestId : null;
}

export function learningAnalyticsWriterGateToken(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  return learningAnalyticsActiveWriterGateToken(storage, userId);
}

export function resolveLearningAnalyticsClearHandshake(
  fence: LearningAnalyticsClearFence,
  serverGeneration: number,
  clearedAt: string | null
): "retry-delete" | "complete-forward" | "fail-closed" {
  if (!isNonNegativeSafeInteger(serverGeneration)) return "fail-closed";
  if (serverGeneration === fence.baseGeneration && clearedAt === null) return "retry-delete";
  if (serverGeneration > fence.baseGeneration && isCanonicalIsoTimestamp(clearedAt)) {
    return "complete-forward";
  }
  return "fail-closed";
}

export function learningAnalyticsGenerationStorageKey(userId: string) {
  return `${learningAnalyticsGenerationStoragePrefix}${encodeURIComponent(userId)}`;
}

export function readLearningAnalyticsGeneration(
  storage: Pick<Storage, "getItem">,
  userId: string
) {
  const value = Number(storage.getItem(learningAnalyticsGenerationStorageKey(userId)) ?? "0");
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function storeLearningAnalyticsGeneration(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  generation: number
) {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error("Learning-analytics generation must be a non-negative safe integer.");
  }
  const storedGeneration = Math.max(
    readLearningAnalyticsGeneration(storage, userId),
    generation
  );
  storage.setItem(learningAnalyticsGenerationStorageKey(userId), String(storedGeneration));
  return storedGeneration;
}

export function replaceLearningAnalyticsGeneration(
  storage: Pick<Storage, "setItem">,
  userId: string,
  generation: number
) {
  if (!isNonNegativeSafeInteger(generation)) {
    throw new Error("Learning-analytics generation must be a non-negative safe integer.");
  }
  storage.setItem(learningAnalyticsGenerationStorageKey(userId), String(generation));
  return generation;
}

export function learningAnalyticsOutboxStorageKey(userId: string, eventId?: string) {
  const userPrefix = `${learningAnalyticsOutboxStoragePrefix}${encodeURIComponent(userId)}:`;
  return typeof eventId === "string"
    ? `${userPrefix}${encodeURIComponent(eventId)}`
    : userPrefix;
}

export function unconfirmedLearningAnalyticsOutboxStorageKey(
  userId: string,
  eventId?: string
) {
  const userPrefix = `${unconfirmedLearningAnalyticsOutboxStoragePrefix}${encodeURIComponent(userId)}:`;
  return typeof eventId === "string"
    ? `${userPrefix}${encodeURIComponent(eventId)}`
    : userPrefix;
}

/**
 * Physical records are immutable within one protocol revision. Reusing a
 * deterministic event id after a clear therefore cannot overwrite the row
 * captured by the older boundary.
 */
export function learningAnalyticsOutboxRecordStorageKey(
  userId: string,
  event: LearningAnalyticsEvent
) {
  const baseKey = learningAnalyticsOutboxStorageKey(userId, event.id);
  const physicalCommitSequence = physicalLearningAnalyticsCommitSequence(event);
  const physicalCommitSuffix = physicalCommitSequence !== null
    ? `/physical-commit/${physicalCommitSequence}`
    : "";
  const generation = storedLearningAnalyticsDeliveryGeneration(event);
  return typeof generation === "number"
    ? `${baseKey}${physicalCommitSuffix}/generation/${generation}`
    : `${baseKey}${physicalCommitSuffix}`;
}

export function unconfirmedLearningAnalyticsOutboxRecordStorageKey(
  userId: string,
  event: LearningAnalyticsEvent
) {
  const baseKey = unconfirmedLearningAnalyticsOutboxStorageKey(userId, event.id);
  const physicalCommitSequence = physicalLearningAnalyticsCommitSequence(event);
  const physicalCommitSuffix = physicalCommitSequence !== null
    ? `/physical-commit/${physicalCommitSequence}`
    : "";
  const boundaryToken = learningAnalyticsBoundaryToken(event);
  const generation = storedLearningAnalyticsDeliveryGeneration(event);
  const generationSuffix = generation === null
    ? ""
    : `/generation/${generation}`;
  const boundarySuffix = boundaryToken
    ? `/boundary/${encodeURIComponent(boundaryToken)}`
    : "";
  return `${baseKey}${physicalCommitSuffix}${generationSuffix}${boundarySuffix}`;
}

function physicalLearningAnalyticsCommitSequenceFromStorageKey(
  key: string,
  source: "confirmed" | "unconfirmed",
  userId: string,
  event: LearningAnalyticsEvent
) {
  if (!isHighFrequencyLearningAnalyticsEvent(event)) return null;
  const baseKey = source === "confirmed"
    ? learningAnalyticsOutboxStorageKey(userId, event.id)
    : unconfirmedLearningAnalyticsOutboxStorageKey(userId, event.id);
  const generation = storedLearningAnalyticsDeliveryGeneration(event);
  const generationSuffix = generation === null
    ? ""
    : `/generation/${generation}`;
  const boundaryToken = learningAnalyticsBoundaryToken(event);
  const boundarySuffix = boundaryToken
    ? `/boundary/${encodeURIComponent(boundaryToken)}`
    : "";
  const prefix = `${baseKey}/physical-commit/`;
  const suffix = `${generationSuffix}${boundarySuffix}`;
  if (!key.startsWith(prefix) || (suffix && !key.endsWith(suffix))) return null;
  const sequenceText = key.slice(
    prefix.length,
    suffix ? key.length - suffix.length : key.length
  );
  const sequence = Number(sequenceText);
  return Number.isSafeInteger(sequence) &&
      sequence >= 0 &&
      String(sequence) === sequenceText
    ? sequence
    : null;
}

function compareLearningAnalyticsEventOrder(
  left: LearningAnalyticsEvent,
  right: LearningAnalyticsEvent
) {
  const timestampDelta =
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
  if (timestampDelta) return timestampDelta;
  const leftPhysicalSequence = physicalLearningAnalyticsCommitSequence(left);
  const rightPhysicalSequence = physicalLearningAnalyticsCommitSequence(right);
  if (leftPhysicalSequence === null && rightPhysicalSequence !== null) return -1;
  if (leftPhysicalSequence !== null && rightPhysicalSequence === null) return 1;
  if (
    leftPhysicalSequence !== null &&
    rightPhysicalSequence !== null &&
    leftPhysicalSequence !== rightPhysicalSequence
  ) {
    return leftPhysicalSequence - rightPhysicalSequence;
  }
  return left.id.localeCompare(right.id);
}

export function mergeOrderedLearningAnalyticsEvents(
  current: LearningAnalyticsEvent[],
  incoming: LearningAnalyticsEvent[]
) {
  const ordered: LearningAnalyticsEvent[] = [];
  const indexById = new Map<string, number>();
  [...current, ...incoming].forEach((event) => {
    const existingIndex = indexById.get(event.id);
    if (typeof existingIndex === "number") return;
    indexById.set(event.id, ordered.length);
    ordered.push(event);
  });

  return coalesceLearningAnalyticsEvents(ordered)
    .sort(compareLearningAnalyticsEventOrder)
    .slice(-maxStoredLearningAnalyticsEvents);
}

export function mergeDurableLearningAnalyticsEvents(
  current: LearningAnalyticsEvent[],
  incoming: LearningAnalyticsEvent[]
) {
  const byId = new Map<string, LearningAnalyticsEvent>();
  [...current, ...incoming].forEach((event) => {
    if (!byId.has(event.id)) byId.set(event.id, event);
  });
  const chronologicallyOrdered = [...byId.values()].sort(
    compareLearningAnalyticsEventOrder
  );

  // Only the explicitly high-frequency visualization samples are lossy. The
  // durable retry queue never applies the 500-row UI history cap to answers,
  // completions, reviews, or ordinary page events.
  return coalesceLearningAnalyticsEvents(chronologicallyOrdered);
}

function learningAnalyticsProtocolRevision(
  event: LearningAnalyticsEvent,
  source: "confirmed" | "unconfirmed"
) {
  if (source === "confirmed") {
    const generation = storedLearningAnalyticsDeliveryGeneration(event);
    return typeof generation === "number" ? `generation:${generation}` : "generation:legacy";
  }
  return [
    `generation:${storedLearningAnalyticsDeliveryGeneration(event) ?? "unknown"}`,
    `boundary:${learningAnalyticsBoundaryToken(event) ?? "open"}`
  ].join("|");
}

function mergeLearningAnalyticsPhysicalRevisions(
  current: LearningAnalyticsEvent[],
  incoming: LearningAnalyticsEvent[],
  source: "confirmed" | "unconfirmed"
) {
  const byRevisionAndId = new Map<string, LearningAnalyticsEvent>();
  [...current, ...incoming].forEach((event) => {
    const revision = learningAnalyticsProtocolRevision(event, source);
    const key = `${revision}\u0000${event.id}`;
    if (!byRevisionAndId.has(key)) byRevisionAndId.set(key, event);
  });
  const groups = new Map<string, LearningAnalyticsEvent[]>();
  byRevisionAndId.forEach((event) => {
    const revision = learningAnalyticsProtocolRevision(event, source);
    groups.set(revision, [...(groups.get(revision) ?? []), event]);
  });
  return [...groups.values()]
    .flatMap((events) => coalesceLearningAnalyticsEvents(events))
    .sort((left, right) => {
      return compareLearningAnalyticsEventOrder(left, right) ||
        learningAnalyticsProtocolRevision(left, source).localeCompare(
          learningAnalyticsProtocolRevision(right, source)
        );
    });
}

function quarantineCorruptLearningAnalyticsOutboxRecord(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  source: "confirmed" | "unconfirmed",
  originalStorageKey: string,
  raw: string
) {
  try {
    storage.setItem(
      learningAnalyticsCorruptOutboxStorageKey(userId, source, originalStorageKey),
      JSON.stringify({
        version: 1,
        userId,
        source,
        originalStorageKey,
        raw
      })
    );
    // Do not authorize deletion from a stale read. A peer may have repaired
    // this immutable slot between our read and quarantine write. Retaining a
    // poison row is fail-closed (and intentionally keeps terminal QA red),
    // while a later exact replacement remains recoverable.
    return true;
  } catch {
    return false;
  }
}

function readLearningAnalyticsEventStoreStrict(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  source: "confirmed" | "unconfirmed"
): LearningAnalyticsStorageSnapshot<LearningAnalyticsEvent[]> {
  const prefix = source === "confirmed"
    ? learningAnalyticsOutboxStorageKey(userId)
    : unconfirmedLearningAnalyticsOutboxStorageKey(userId);
  const keySnapshot = stableStorageKeySnapshot(
    storage,
    (key) => key.startsWith(prefix)
  );
  if (keySnapshot.status === "unavailable") return keySnapshot;
  const events: LearningAnalyticsEvent[] = [];
  for (const key of keySnapshot.value) {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      return { status: "unavailable" };
    }
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const parsedEvent = isValidLearningAnalyticsEventLog([parsed])
        ? parsed as LearningAnalyticsEvent
        : null;
      const canonicalKey = parsedEvent
        ? source === "confirmed"
          ? learningAnalyticsOutboxRecordStorageKey(userId, parsedEvent)
          : unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, parsedEvent)
        : null;
      const physicalSequence = parsedEvent
        ? physicalLearningAnalyticsCommitSequenceFromStorageKey(
            key,
            source,
            userId,
            parsedEvent
          )
        : null;
      const physicalEvent = parsedEvent && physicalSequence !== null
        ? preservePhysicalLearningAnalyticsCommit(parsedEvent, physicalSequence)
        : null;
      const physicalCanonicalKey = physicalEvent
        ? source === "confirmed"
          ? learningAnalyticsOutboxRecordStorageKey(userId, physicalEvent)
          : unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, physicalEvent)
        : null;
      if (parsedEvent && key === canonicalKey) {
        events.push(parsedEvent);
      } else if (physicalEvent && key === physicalCanonicalKey) {
        events.push(physicalEvent);
      } else if (!quarantineCorruptLearningAnalyticsOutboxRecord(
        storage,
        userId,
        source,
        key,
        raw
      )) {
        return { status: "unavailable" };
      }
    } catch {
      if (!quarantineCorruptLearningAnalyticsOutboxRecord(
        storage,
        userId,
        source,
        key,
        raw
      )) return { status: "unavailable" };
    }
  }
  if (source === "confirmed") {
    const legacyKey = `${legacyLearningAnalyticsOutboxStoragePrefix}${encodeURIComponent(userId)}`;
    let legacyValue: string | null;
    try {
      legacyValue = storage.getItem(legacyKey);
    } catch {
      return { status: "unavailable" };
    }
    if (legacyValue) {
      try {
        const parsed: unknown = JSON.parse(legacyValue);
        if (Array.isArray(parsed)) {
          parsed.forEach((entry) => {
            if (isValidLearningAnalyticsEventLog([entry])) {
              events.push(entry as LearningAnalyticsEvent);
            }
          });
        }
      } catch {
        // The legacy aggregate remains recoverable and cannot authorize a
        // destructive transition while unreadable.
        return { status: "unavailable" };
      }
    }
  }
  return {
    status: "available",
    value: source === "unconfirmed"
      ? mergeLearningAnalyticsPhysicalRevisions([], events, "unconfirmed")
      : events
  };
}

function readRawLearningAnalyticsOutboxStrict(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
) {
  return readLearningAnalyticsEventStoreStrict(storage, userId, "confirmed");
}

function readRawLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
) {
  const result = readRawLearningAnalyticsOutboxStrict(storage, userId);
  return result.status === "available" ? result.value : [];
}

function readUnconfirmedLearningAnalyticsOutboxStrict(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
) {
  return readLearningAnalyticsEventStoreStrict(storage, userId, "unconfirmed");
}

export function readUnconfirmedLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
) {
  const result = readUnconfirmedLearningAnalyticsOutboxStrict(storage, userId);
  return result.status === "available" ? result.value : [];
}

export function mergeUnconfirmedLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  events: LearningAnalyticsEvent[]
) {
  const currentSnapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
    storage,
    userId
  );
  if (currentSnapshot.status === "unavailable") {
    throw new Error("Unconfirmed learning-analytics storage is unavailable.");
  }
  const current = currentSnapshot.value;
  const merged = mergeLearningAnalyticsPhysicalRevisions(
    current,
    events,
    "unconfirmed"
  );
  const retainedKeys = new Set(merged.map((event) =>
    unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
  ));
  // A replacement must become durable before its obsolete coalesced peer is
  // removed. Quota/storage failure therefore leaves the prior sample intact.
  merged.forEach((event) => {
    storage.setItem(
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event),
      JSON.stringify(event)
    );
  });
  current.forEach((event) => {
    const storageKey = unconfirmedLearningAnalyticsOutboxRecordStorageKey(
      userId,
      event
    );
    if (!retainedKeys.has(storageKey)) {
      storage.removeItem(
        storageKey
      );
    }
  });
  return merged;
}

export function confirmUnconfirmedLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  generation: number
) {
  const unconfirmed = readUnconfirmedLearningAnalyticsOutbox(storage, userId);
  if (unconfirmed.length === 0) return [];

  const confirmed = unconfirmed.map((event) =>
    withLearningAnalyticsDeliveryGeneration(event, generation)
  );
  // Write the confirmed per-event records before deleting their unconfirmed
  // peers. A crash between the two phases leaves a safe idempotent replay,
  // never an acknowledged-looking gap.
  mergeLearningAnalyticsOutbox(storage, userId, confirmed);
  unconfirmed.forEach((event) => {
    storage.removeItem(
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
    );
  });
  return confirmed;
}

export function readLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  generation?: number
) {
  const rawEvents = readRawLearningAnalyticsOutbox(storage, userId);
  const scopedEvents = typeof generation === "number"
    ? rawEvents.filter((event) => learningAnalyticsDeliveryGeneration(event) === generation)
    : rawEvents;
  return mergeDurableLearningAnalyticsEvents(
    [],
    scopedEvents
  );
}

export function mergeLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  events: LearningAnalyticsEvent[]
) {
  const currentSnapshot = readRawLearningAnalyticsOutboxStrict(storage, userId);
  if (currentSnapshot.status === "unavailable") {
    throw new Error("Confirmed learning-analytics storage is unavailable.");
  }
  const current = currentSnapshot.value;
  const merged = mergeLearningAnalyticsPhysicalRevisions(
    current,
    events,
    "confirmed"
  );
  const retainedKeys = new Set(merged.map((event) =>
    learningAnalyticsOutboxRecordStorageKey(userId, event)
  ));

  // Write every retained/replacement row before destructive compaction. This
  // preserves the last durable sample if a later write throws (for example,
  // localStorage quota exhaustion).
  merged.forEach((event) => {
    storage.setItem(
      learningAnalyticsOutboxRecordStorageKey(userId, event),
      JSON.stringify(event)
    );
  });

  // Remove only event-specific records observed by this merge. A concurrent
  // tab can append a different event key without being overwritten by a later
  // acknowledgement or compaction in this tab.
  current.forEach((event) => {
    const storageKey = learningAnalyticsOutboxRecordStorageKey(userId, event);
    if (!retainedKeys.has(storageKey)) {
      storage.removeItem(storageKey);
    }
  });
  const legacyKey = `${legacyLearningAnalyticsOutboxStoragePrefix}${encodeURIComponent(userId)}`;
  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue) {
    try {
      const parsed: unknown = JSON.parse(legacyValue);
      const fullyValid = Array.isArray(parsed) && parsed.every((entry) =>
        isValidLearningAnalyticsEventLog([entry])
      );
      if (!fullyValid) {
        storage.setItem(`${legacyKey}:quarantine`, legacyValue);
      }
    } catch {
      storage.setItem(`${legacyKey}:quarantine`, legacyValue);
    }
    storage.removeItem(legacyKey);
  }
  return merged;
}

export function acknowledgeLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  acknowledgedEventIds: ReadonlySet<string>,
  acknowledgedEvents: readonly LearningAnalyticsEvent[] = []
) {
  const acknowledgedHighFrequencyBySemanticKey = new Map<
    string,
    LearningAnalyticsEvent
  >();
  acknowledgedEvents.forEach((event) => {
    if (
      !acknowledgedEventIds.has(event.id) ||
      !isHighFrequencyLearningAnalyticsEvent(event)
    ) return;
    const semanticKey = coalescedLearningAnalyticsEventKey(event);
    const current = acknowledgedHighFrequencyBySemanticKey.get(semanticKey);
    if (!current || compareLearningAnalyticsEventRevision(current, event) < 0) {
      acknowledgedHighFrequencyBySemanticKey.set(semanticKey, event);
    }
  });

  // Independent tabs can leave more than one physical key for a lossy
  // high-frequency semantic sample. ACK the exact request snapshot and any
  // older same-generation peer, while retaining a genuinely newer sample
  // created after that request was captured.
  readRawLearningAnalyticsOutbox(storage, userId).forEach((event) => {
    if (!isHighFrequencyLearningAnalyticsEvent(event)) return;
    const acknowledged = acknowledgedHighFrequencyBySemanticKey.get(
      coalescedLearningAnalyticsEventKey(event)
    );
    if (
      acknowledged &&
      learningAnalyticsDeliveryGeneration(event) ===
        learningAnalyticsDeliveryGeneration(acknowledged) &&
      compareLearningAnalyticsEventRevision(event, acknowledged) <= 0
    ) {
      storage.removeItem(learningAnalyticsOutboxRecordStorageKey(userId, event));
    }
  });
  const exactAcknowledgements = new Map(
    acknowledgedEvents
      .filter((event) => acknowledgedEventIds.has(event.id))
      .map((event) => [event.id, event] as const)
  );
  readRawLearningAnalyticsOutbox(storage, userId).forEach((event) => {
    if (!acknowledgedEventIds.has(event.id)) return;
    const exact = exactAcknowledgements.get(event.id);
    if (
      exact &&
      learningAnalyticsProtocolRevision(exact, "confirmed") !==
        learningAnalyticsProtocolRevision(event, "confirmed")
    ) return;
    storage.removeItem(learningAnalyticsOutboxRecordStorageKey(userId, event));
  });
  return readLearningAnalyticsOutbox(storage, userId);
}

function compareLearningAnalyticsEventRevision(
  left: LearningAnalyticsEvent,
  right: LearningAnalyticsEvent
) {
  return compareLearningAnalyticsEventOrder(left, right);
}

export function persistLearningAnalyticsEventsForCurrentProtocol(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  events: LearningAnalyticsEvent[],
  generation: number
): "confirmed" | "unconfirmed" {
  const deliveryEvents = events.map(learningAnalyticsEventForInternalStorage);
  let stagedUnconfirmed: LearningAnalyticsEvent[] = [];
  const removeSupersededUnconfirmed = (
    staged: readonly LearningAnalyticsEvent[],
    retained: readonly LearningAnalyticsEvent[]
  ) => {
    const retainedKeys = new Set(retained.map((event) =>
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
    ));
    staged.forEach((event) => {
      const storageKey = unconfirmedLearningAnalyticsOutboxRecordStorageKey(
        userId,
        event
      );
      if (!retainedKeys.has(storageKey)) storage.removeItem(storageKey);
    });
  };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const protocolStatus = learningAnalyticsClientProtocolStatus(storage, userId);
    const boundaryToken = learningAnalyticsActiveWriterGateToken(storage, userId);

    if (protocolStatus === "open") {
      if (readLearningAnalyticsGeneration(storage, userId) !== generation) {
        const unconfirmed = deliveryEvents.map((event) =>
          withLearningAnalyticsDurabilityLineage(event, generation, null)
        );
        mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, unconfirmed);
        removeSupersededUnconfirmed(stagedUnconfirmed, unconfirmed);
        return "unconfirmed";
      }
      const generationalEvents = deliveryEvents.map((event) =>
        withLearningAnalyticsDeliveryGeneration(event, generation)
      );
      mergeLearningAnalyticsOutbox(storage, userId, generationalEvents);
      if (
        learningAnalyticsClientProtocolStatus(storage, userId) === "open" &&
        readLearningAnalyticsGeneration(storage, userId) === generation
      ) {
        removeSupersededUnconfirmed(stagedUnconfirmed, []);
        return "confirmed";
      }
      // A boundary appeared after the confirmed write. Its independently
      // keyed recovery copy is committed on the next loop iteration before
      // this old-generation revision is removed.
      const nextToken = learningAnalyticsActiveWriterGateToken(storage, userId);
      const recovery = deliveryEvents.map((event) => nextToken
        ? withLearningAnalyticsBoundaryToken(event, nextToken)
        : event
      );
      mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, recovery);
      generationalEvents.forEach((event) => storage.removeItem(
        learningAnalyticsOutboxRecordStorageKey(userId, event)
      ));
      removeSupersededUnconfirmed(stagedUnconfirmed, recovery);
      stagedUnconfirmed = recovery;
      continue;
    }

    const gatedEvents = deliveryEvents.map((event) => boundaryToken
      ? withLearningAnalyticsBoundaryToken(event, boundaryToken)
      : event
    );
    mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, gatedEvents);
    const nextStatus = learningAnalyticsClientProtocolStatus(storage, userId);
    const nextToken = learningAnalyticsActiveWriterGateToken(storage, userId);
    if (nextStatus === protocolStatus && nextToken === boundaryToken) {
      removeSupersededUnconfirmed(stagedUnconfirmed, gatedEvents);
      return "unconfirmed";
    }
    // The gate changed while this tab was committing. Keep the old revision
    // until a copy under the newly observed token (or generation) is durable.
    stagedUnconfirmed = [...stagedUnconfirmed, ...gatedEvents];
  }

  throw new Error("Learning-analytics protocol did not stabilize for this writer.");
}

export function persistLearningAnalyticsEventsWithDurabilityFallback(
  primaryStorage: LearningAnalyticsOutboxStorage,
  fallbackStorage: LearningAnalyticsOutboxStorage,
  userId: string,
  events: LearningAnalyticsEvent[],
  generation: number
): "confirmed" | "unconfirmed" | "fallback" {
  try {
    return persistLearningAnalyticsEventsForCurrentProtocol(
      primaryStorage,
      userId,
      events,
      generation
    );
  } catch {
    // sessionStorage is a separate refresh-durable journal in the provider.
    // It is never read by the network delivery loop; recovery must first move
    // each record into the primary exact-user protocol store.
    const boundaryToken = learningAnalyticsActiveWriterGateToken(
      primaryStorage,
      userId
    );
    mergeUnconfirmedLearningAnalyticsOutbox(
      fallbackStorage,
      userId,
      events.map((event) => withLearningAnalyticsDurabilityLineage(
        event,
        generation,
        boundaryToken
      ))
    );
    return "fallback";
  }
}

export function persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
  primaryStorage: LearningAnalyticsOutboxStorage,
  fallbackStorage: LearningAnalyticsOutboxStorage,
  userId: string,
  events: LearningAnalyticsEvent[],
  generation = readLearningAnalyticsGeneration(primaryStorage, userId)
): "unconfirmed" | "fallback" {
  const boundaryToken = learningAnalyticsActiveWriterGateToken(
    primaryStorage,
    userId
  );
  const durableEvents = events.map((event) =>
    withLearningAnalyticsDurabilityLineage(event, generation, boundaryToken)
  );
  try {
    mergeUnconfirmedLearningAnalyticsOutbox(
      primaryStorage,
      userId,
      durableEvents
    );
    return "unconfirmed";
  } catch {
    mergeUnconfirmedLearningAnalyticsOutbox(
      fallbackStorage,
      userId,
      durableEvents
    );
    return "fallback";
  }
}

export function clearLearningAnalyticsDurabilityFallbackBeforeBoundary(
  fallbackStorage: LearningAnalyticsOutboxStorage,
  userId: string,
  boundaryToken: string | readonly string[]
) {
  const boundaryTokens = new Set(
    typeof boundaryToken === "string" ? [boundaryToken] : boundaryToken
  );
  const snapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
    fallbackStorage,
    userId
  );
  if (snapshot.status === "unavailable") return "unavailable" as const;
  let cleared = 0;
  snapshot.value.forEach((event) => {
    const token = learningAnalyticsBoundaryToken(event);
    if (token && boundaryTokens.has(token)) return;
    fallbackStorage.removeItem(
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
    );
    cleared += 1;
  });
  return { status: "cleared" as const, cleared };
}

export function recoverLearningAnalyticsVolatileEvent(
  primaryStorage: LearningAnalyticsOutboxStorage,
  userId: string,
  event: LearningAnalyticsEvent,
  originalGeneration: number,
  boundaryToken: string | null,
  generation: number
): "recovered" | "discarded" | "deferred" {
  if (!learningAnalyticsDurabilityLineageIsRecoverable(
    primaryStorage,
    userId,
    originalGeneration,
    boundaryToken,
    generation
  )) return "discarded";
  if (
    learningAnalyticsClientProtocolStatus(primaryStorage, userId) !== "open" ||
    readLearningAnalyticsGeneration(primaryStorage, userId) !== generation
  ) return "deferred";
  const recoveryToken = `fallback-recovery-${completionIdentityHash(
    JSON.stringify([
      userId,
      event.id,
      event.timestamp,
      originalGeneration,
      boundaryToken
    ]),
    0x9e3779b9
  )}`;
  const stagingEvent = withLearningAnalyticsDurabilityLineage(
    event,
    originalGeneration,
    recoveryToken
  );
  const stagingStorageKey =
    unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, stagingEvent);
  try {
    // A recovered row is old private work, not a new user action. Its private
    // non-gate revision ensures that a boundary appearing mid-recovery
    // quarantines it instead of promoting it as post-boundary activity.
    mergeUnconfirmedLearningAnalyticsOutbox(
      primaryStorage,
      userId,
      [stagingEvent]
    );
    if (
      learningAnalyticsClientProtocolStatus(primaryStorage, userId) !== "open" ||
      readLearningAnalyticsGeneration(primaryStorage, userId) !== generation
    ) return "deferred";
    const confirmedEvent = withLearningAnalyticsDeliveryGeneration(
      event,
      generation
    );
    mergeLearningAnalyticsOutbox(primaryStorage, userId, [confirmedEvent]);
    if (
      learningAnalyticsClientProtocolStatus(primaryStorage, userId) !== "open" ||
      readLearningAnalyticsGeneration(primaryStorage, userId) !== generation
    ) return "deferred";
    const exactConfirmed = readRawLearningAnalyticsOutbox(
      primaryStorage,
      userId
    ).some((candidate) =>
      learningAnalyticsOutboxRecordStorageKey(userId, candidate) ===
        learningAnalyticsOutboxRecordStorageKey(userId, confirmedEvent) &&
      JSON.stringify(candidate) === JSON.stringify(confirmedEvent)
    );
    if (!exactConfirmed) return "deferred";
    primaryStorage.removeItem(stagingStorageKey);
    return primaryStorage.getItem(stagingStorageKey) === null
      ? "recovered"
      : "deferred";
  } catch {
    return "deferred";
  }
}

export function recoverLearningAnalyticsDurabilityFallback(
  primaryStorage: LearningAnalyticsOutboxStorage,
  fallbackStorage: LearningAnalyticsOutboxStorage,
  userId: string,
  _requestedGeneration: number
) {
  const generation = readLearningAnalyticsGeneration(primaryStorage, userId);
  if (learningAnalyticsClientProtocolStatus(primaryStorage, userId) !== "open") {
    return {
      discarded: [] as LearningAnalyticsEvent[],
      recovered: [] as LearningAnalyticsEvent[],
      remaining: readUnconfirmedLearningAnalyticsOutbox(fallbackStorage, userId)
    };
  }
  const fallbackEvents = readUnconfirmedLearningAnalyticsOutbox(
    fallbackStorage,
    userId
  );
  const recovered: LearningAnalyticsEvent[] = [];
  const discarded: LearningAnalyticsEvent[] = [];
  for (const event of fallbackEvents) {
    const originalGeneration = storedLearningAnalyticsDeliveryGeneration(event);
    const boundaryToken = learningAnalyticsBoundaryToken(event);
    if (originalGeneration === null) {
      fallbackStorage.removeItem(
        unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
      );
      discarded.push(event);
      continue;
    }
    const outcome = recoverLearningAnalyticsVolatileEvent(
      primaryStorage,
      userId,
      event,
      originalGeneration,
      boundaryToken,
      generation
    );
    if (outcome === "discarded") {
      fallbackStorage.removeItem(
        unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
      );
      discarded.push(event);
      continue;
    }
    if (outcome === "recovered") {
      fallbackStorage.removeItem(
        unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
      );
      if (
        fallbackStorage.getItem(
          unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
        ) !== null
      ) continue;
      recovered.push(event);
    }
  }
  return {
    discarded,
    recovered,
    remaining: readUnconfirmedLearningAnalyticsOutbox(fallbackStorage, userId)
  };
}

export function clearLearningAnalyticsOutbox(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  clearedStorageKeys?: readonly string[]
) {
  const keys = typeof clearedStorageKeys === "undefined"
    ? learningAnalyticsClearStorageKeys(storage, userId)
    : [...new Set(clearedStorageKeys)].filter((key) =>
        isLearningAnalyticsClearStorageKey(key, userId)
      );
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}

export function discardLearningAnalyticsOutboxBeforeGeneration(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  generation: number
) {
  const allEvents = readRawLearningAnalyticsOutbox(storage, userId);
  const staleIds = new Set(
    allEvents
      .filter((event) => learningAnalyticsDeliveryGeneration(event) < generation)
      .map((event) => event.id)
  );
  mergeLearningAnalyticsOutbox(storage, userId, allEvents);
  acknowledgeLearningAnalyticsOutbox(storage, userId, staleIds);
  return staleIds;
}

function writeLearningAnalyticsQuarantineEvent(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  event: LearningAnalyticsEvent,
  fromGeneration: number,
  quarantinedAt: string,
  physicalStorageKey?: string
) {
  const baseKey = learningAnalyticsQuarantineStorageKey(userId, event.id);
  const key = physicalStorageKey
    ? `${baseKey}/revision/${encodeURIComponent(physicalStorageKey)}`
    : baseKey;
  const value = JSON.stringify({
    version: 1,
    userId,
    fromGeneration,
    quarantinedAt,
    ...(physicalStorageKey ? { physicalStorageKey } : {}),
    event
  });
  if (storage.getItem(key) === null) storage.setItem(key, value);
  // Preserve the historical ID-level audit slot as an index, while the
  // revision-specific entry above keeps same-ID causal rows independent.
  if (storage.getItem(baseKey) === null) storage.setItem(baseKey, value);
}

function prepareLearningAnalyticsGenerationTransitionMarker(
  storage: LearningAnalyticsOutboxStorage,
  marker: LearningAnalyticsGenerationTransition
) {
  const current = readLearningAnalyticsGenerationTransition(storage, marker.userId);
  if (current.status === "corrupt") {
    throw new Error("A corrupt learning-analytics transition must fail closed.");
  }
  if (current.status === "valid") {
    if (current.value.transitionId !== marker.transitionId) {
      throw new Error("A conflicting learning-analytics transition is already pending.");
    }
    if (current.value.phase === "prepared") return current.value;
  }
  storage.setItem(
    learningAnalyticsGenerationTransitionStorageKey(marker.userId),
    JSON.stringify(marker)
  );
  return marker;
}

function exactLearningAnalyticsTransitionIsHeld(
  storage: Pick<Storage, "getItem">,
  expected: LearningAnalyticsGenerationTransition
) {
  const current = readLearningAnalyticsGenerationTransition(
    storage,
    expected.userId
  );
  return current.status === "valid" &&
    current.value.transitionId === expected.transitionId &&
    current.value.kind === expected.kind &&
    current.value.fromGeneration === expected.fromGeneration &&
    current.value.toGeneration === expected.toGeneration;
}

function exactLearningAnalyticsFenceIsCompatible(
  storage: Pick<Storage, "getItem">,
  expected: LearningAnalyticsStoredRecordState<LearningAnalyticsClearFence>,
  marker: LearningAnalyticsGenerationTransition
) {
  const current = readLearningAnalyticsClearFence(storage, marker.userId);
  if (expected.status === "absent") return current.status === "absent";
  if (expected.status !== "valid" || current.status !== "valid") return false;
  return current.value.requestId === expected.value.requestId &&
    current.value.baseGeneration === expected.value.baseGeneration &&
    current.value.baseGeneration === marker.fromGeneration;
}

function transitionWriterGateTokens(
  storage: LearningAnalyticsOutboxStorage,
  marker: LearningAnalyticsGenerationTransition,
  fence: LearningAnalyticsStoredRecordState<LearningAnalyticsClearFence>
) {
  const tokens = new Set([marker.transitionId]);
  if (fence.status === "valid") tokens.add(fence.value.requestId);
  const handshake = readLearningAnalyticsGenerationHandshake(
    storage,
    marker.userId
  );
  if (handshake.status === "valid") tokens.add(handshake.value.requestId);
  return tokens;
}

function drainLearningAnalyticsTransitionRows(
  storage: LearningAnalyticsOutboxStorage,
  marker: LearningAnalyticsGenerationTransition,
  gateTokens: ReadonlySet<string>
): LearningAnalyticsStorageSnapshot<{
  preserveEventIds: string[];
  quarantineEventIds: string[];
  preserveUnconfirmedStorageKeys: string[];
  quarantineConfirmedStorageKeys: string[];
  quarantineUnconfirmedStorageKeys: string[];
}> {
  let previousSignature: string | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const confirmed = readRawLearningAnalyticsOutboxStrict(
      storage,
      marker.userId
    );
    const unconfirmed = readUnconfirmedLearningAnalyticsOutboxStrict(
      storage,
      marker.userId
    );
    if (
      confirmed.status === "unavailable" ||
      unconfirmed.status === "unavailable"
    ) return { status: "unavailable" };

    const preserveIds = new Set(marker.preserveEventIds);
    const preserveUnconfirmedStorageKeys = new Set(
      marker.preserveUnconfirmedStorageKeys
    );
    const quarantineConfirmed = new Map<string, LearningAnalyticsEvent>();
    const quarantineUnconfirmed = new Map<string, LearningAnalyticsEvent>();
    const alreadyAtTargetGeneration =
      readLearningAnalyticsGeneration(storage, marker.userId) ===
      marker.toGeneration;
    confirmed.value.forEach((event) => {
      const storageKey = learningAnalyticsOutboxRecordStorageKey(
        marker.userId,
        event
      );
      if (
        learningAnalyticsDeliveryGeneration(event) === marker.toGeneration &&
        (preserveIds.has(event.id) || alreadyAtTargetGeneration)
      ) {
        preserveIds.add(event.id);
        return;
      }
      quarantineConfirmed.set(storageKey, event);
    });
    unconfirmed.value.forEach((event) => {
      const storageKey = unconfirmedLearningAnalyticsOutboxRecordStorageKey(
        marker.userId,
        event
      );
      const token = learningAnalyticsBoundaryToken(event);
      if (token && gateTokens.has(token)) {
        preserveIds.add(event.id);
        preserveUnconfirmedStorageKeys.add(storageKey);
      } else {
        quarantineUnconfirmed.set(storageKey, event);
      }
    });
    const quarantineIds = [...new Set([
      ...quarantineConfirmed.values(),
      ...quarantineUnconfirmed.values()
    ].map((event) => event.id))].sort();
    for (const [storageKey, event] of [
      ...quarantineConfirmed,
      ...quarantineUnconfirmed
    ]) {
      writeLearningAnalyticsQuarantineEvent(
        storage,
        marker.userId,
        event,
        marker.fromGeneration,
        marker.preparedAt,
        storageKey
      );
    }
    const preserveEventIds = [...preserveIds].sort();
    const exactPreserveKeys = [...preserveUnconfirmedStorageKeys].sort();
    const exactConfirmedQuarantineKeys = [...quarantineConfirmed.keys()].sort();
    const exactUnconfirmedQuarantineKeys = [...quarantineUnconfirmed.keys()].sort();
    const signature = JSON.stringify({
      confirmed: confirmed.value.map((event) => [
        event.id,
        learningAnalyticsDeliveryGeneration(event)
      ]).sort(),
      unconfirmed: unconfirmed.value.map((event) => [
        event.id,
        learningAnalyticsBoundaryToken(event)
      ]).sort(),
      preserveEventIds,
      quarantineIds,
      preserveUnconfirmedStorageKeys: exactPreserveKeys,
      quarantineConfirmedStorageKeys: exactConfirmedQuarantineKeys,
      quarantineUnconfirmedStorageKeys: exactUnconfirmedQuarantineKeys
    });
    if (signature === previousSignature) {
      return {
        status: "available",
        value: {
          preserveEventIds,
          quarantineEventIds: quarantineIds,
          preserveUnconfirmedStorageKeys: exactPreserveKeys,
          quarantineConfirmedStorageKeys: exactConfirmedQuarantineKeys,
          quarantineUnconfirmedStorageKeys: exactUnconfirmedQuarantineKeys
        }
      };
    }
    previousSignature = signature;
  }
  return { status: "unavailable" };
}

function finalizeLearningAnalyticsGenerationTransitionMarker(
  storage: LearningAnalyticsOutboxStorage,
  marker: LearningAnalyticsGenerationTransition,
  fence: LearningAnalyticsStoredRecordState<LearningAnalyticsClearFence>
) {
  if (
    !exactLearningAnalyticsTransitionIsHeld(storage, marker) ||
    !exactLearningAnalyticsFenceIsCompatible(storage, fence, marker)
  ) throw new Error("The learning-analytics transition was superseded.");
  if (marker.phase === "prepared") return marker;
  const gateTokens = transitionWriterGateTokens(storage, marker, fence);
  let collecting = marker;
  if (
    marker.kind === "forward-clear" &&
    fence.status === "absent" &&
    marker.completionClaims.length === 0
  ) {
    const completionClaims = collectCompletionClaims(
      storage,
      marker.userId,
      marker.transitionId,
      [...transitionWriterGateTokens(storage, marker, fence)]
    );
    collecting = {
      ...marker,
      completionClaims,
      clearedCompletionStorageKeys: completionClaims.map(({ storageKey }) =>
        storageKey
      )
    };
    // Claims must be recoverable before a legacy once value changes.
    prepareLearningAnalyticsGenerationTransitionMarker(storage, collecting);
    completionClaims.forEach((claim) => {
      if (storage.getItem(claim.storageKey) === claim.originalValue) {
        storage.setItem(claim.storageKey, claim.claimedValue);
      }
    });
  }
  const drained = drainLearningAnalyticsTransitionRows(
    storage,
    collecting,
    gateTokens
  );
  if (drained.status === "unavailable") {
    throw new Error("Learning-analytics transition storage is unavailable.");
  }
  const prepared: LearningAnalyticsGenerationTransition = {
    ...collecting,
    phase: "prepared",
    preserveEventIds: drained.value.preserveEventIds,
    quarantineEventIds: drained.value.quarantineEventIds,
    preserveUnconfirmedStorageKeys:
      drained.value.preserveUnconfirmedStorageKeys,
    quarantineConfirmedStorageKeys:
      drained.value.quarantineConfirmedStorageKeys,
    quarantineUnconfirmedStorageKeys:
      drained.value.quarantineUnconfirmedStorageKeys
  };
  try {
    storage.setItem(
      learningAnalyticsGenerationTransitionStorageKey(marker.userId),
      JSON.stringify(prepared)
    );
  } catch (error) {
    collecting.completionClaims.forEach((claim) => {
      try {
        if (storage.getItem(claim.storageKey) === claim.claimedValue) {
          storage.setItem(claim.storageKey, claim.originalValue);
        }
      } catch {
        // The collecting marker retains an exact restart claim.
      }
    });
    throw error;
  }
  collecting.completionClaims.forEach((claim) => {
    if (storage.getItem(claim.storageKey) === claim.claimedValue) {
      storage.removeItem(claim.storageKey);
    }
  });
  return prepared;
}

export function prepareLearningAnalyticsForwardGenerationTransition(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  fromGeneration: number,
  toGeneration: number,
  clearedAt: string,
  transitionId: string,
  preparedAt = new Date().toISOString()
) {
  if (
    !isNonNegativeSafeInteger(fromGeneration) ||
    !isNonNegativeSafeInteger(toGeneration) ||
    toGeneration <= fromGeneration ||
    !isCanonicalIsoTimestamp(clearedAt) ||
    !isCanonicalIsoTimestamp(preparedAt) ||
    !isNonEmptyProtocolId(transitionId)
  ) throw new TypeError("Invalid forward learning-analytics generation transition.");
  const existing = readLearningAnalyticsGenerationTransition(storage, userId);
  if (existing.status === "corrupt") {
    throw new Error("A corrupt learning-analytics transition must fail closed.");
  }
  if (existing.status === "valid") {
    if (
      existing.value.kind !== "forward-clear" ||
      existing.value.fromGeneration !== fromGeneration ||
      existing.value.toGeneration !== toGeneration
    ) throw new Error("A conflicting learning-analytics transition is already pending.");
    storage.setItem(
      learningAnalyticsGenerationTransitionStorageKey(userId),
      JSON.stringify(existing.value)
    );
    const existingFence = readLearningAnalyticsClearFence(storage, userId);
    return finalizeLearningAnalyticsGenerationTransitionMarker(
      storage,
      existing.value,
      existingFence
    );
  }
  const fence = readLearningAnalyticsClearFence(storage, userId);
  if (fence.status === "corrupt") {
    throw new Error("A corrupt learning-analytics clear fence must fail closed.");
  }
  const boundaryClearedAt = fence.status === "valid"
    ? fence.value.requestedAt
    : clearedAt;
  const preserveAllUnconfirmed = fence.status === "valid";
  const clearedCompletionStorageKeys = fence.status === "valid"
    ? fence.value.clearedCompletionStorageKeys
    : [];
  if (fence.status === "valid") {
    // The clear's linearization point is the exact key snapshot captured
    // before its durable fence was written. Delete only those keys. A peer
    // event created after the snapshot survives even when it shares the same
    // millisecond timestamp as the clear request.
    clearLearningAnalyticsOutbox(storage, userId, fence.value.clearedStorageKeys);
  }
  const collecting = prepareLearningAnalyticsGenerationTransitionMarker(storage, {
    version: 2,
    phase: "collecting",
    userId,
    kind: "forward-clear",
    fromGeneration,
    toGeneration,
    boundaryClearedAt,
    preserveEventIds: [],
    quarantineEventIds: [],
    preserveUnconfirmedStorageKeys: [],
    quarantineConfirmedStorageKeys: [],
    quarantineUnconfirmedStorageKeys: [],
    clearedCompletionStorageKeys,
    preparedAt,
    transitionId,
    preserveAllUnconfirmed,
    completionClaims: fence.status === "valid"
      ? fence.value.completionClaims
      : []
  });
  return finalizeLearningAnalyticsGenerationTransitionMarker(
    storage,
    collecting,
    fence
  );
}

export function prepareLearningAnalyticsLowerGenerationRecovery(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  fromGeneration: number,
  toGeneration: number,
  handshakeRequestId: string,
  preparedAt: string,
  transitionId: string
) {
  if (
    !isNonNegativeSafeInteger(fromGeneration) ||
    !isNonNegativeSafeInteger(toGeneration) ||
    toGeneration >= fromGeneration ||
    !isCanonicalIsoTimestamp(preparedAt) ||
    !isNonEmptyProtocolId(handshakeRequestId) ||
    !isNonEmptyProtocolId(transitionId)
  ) throw new TypeError("Invalid lower learning-analytics generation recovery.");
  const existing = readLearningAnalyticsGenerationTransition(storage, userId);
  if (existing.status === "corrupt") {
    throw new Error("A corrupt learning-analytics transition must fail closed.");
  }
  if (existing.status === "valid") {
    if (
      existing.value.kind !== "authoritative-lower" ||
      existing.value.fromGeneration !== fromGeneration ||
      existing.value.toGeneration !== toGeneration
    ) throw new Error("A conflicting learning-analytics transition is already pending.");
    storage.setItem(
      learningAnalyticsGenerationTransitionStorageKey(userId),
      JSON.stringify(existing.value)
    );
    return finalizeLearningAnalyticsGenerationTransitionMarker(
      storage,
      existing.value,
      readLearningAnalyticsClearFence(storage, userId)
    );
  }
  const fence = readLearningAnalyticsClearFence(storage, userId);
  if (fence.status !== "absent") {
    throw new Error("A lower-generation recovery cannot bypass an outstanding clear fence.");
  }
  const snapshot = readLearningAnalyticsGenerationHandshake(storage, userId);
  if (
    snapshot.status !== "valid" ||
    snapshot.value.requestId !== handshakeRequestId ||
    snapshot.value.generation !== fromGeneration
  ) throw new Error("Lower recovery requires the exact held empty-handshake snapshot.");

  const collecting = prepareLearningAnalyticsGenerationTransitionMarker(storage, {
    version: 2,
    phase: "collecting",
    userId,
    kind: "authoritative-lower",
    fromGeneration,
    toGeneration,
    boundaryClearedAt: null,
    preserveEventIds: [],
    quarantineEventIds: [],
    preserveUnconfirmedStorageKeys: [],
    quarantineConfirmedStorageKeys: [],
    quarantineUnconfirmedStorageKeys: [],
    clearedCompletionStorageKeys: [],
    preparedAt,
    transitionId,
    preserveAllUnconfirmed: false,
    completionClaims: []
  });
  return finalizeLearningAnalyticsGenerationTransitionMarker(
    storage,
    collecting,
    fence
  );
}

function rebaseVisualizationCompletionTelemetryAcrossTransition(
  storage: LearningAnalyticsOutboxStorage,
  marker: LearningAnalyticsGenerationTransition,
  gateTokens: ReadonlySet<string>
) {
  const prefix = visualizationCompletionTelemetryStorageKey(marker.userId);
  const snapshot = stableStorageKeySnapshot(
    storage,
    (key) => key.startsWith(prefix)
  );
  if (snapshot.status === "unavailable") return false;
  const allowedRevisions = new Set(
    [...gateTokens].map((token) => `boundary:${token}`)
  );
  const byScope = new Map<string, VisualizationCompletionTelemetryMarker>();
  for (const storageKey of snapshot.value) {
    let raw: string | null;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return false;
    }
    if (raw === null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidate = parsed as Partial<VisualizationCompletionTelemetryMarker>;
    if (
      typeof candidate.moduleId !== "string" ||
      typeof candidate.topicId !== "string" ||
      typeof candidate.protocolRevision !== "string" ||
      !allowedRevisions.has(candidate.protocolRevision) ||
      !isVisualizationCompletionTelemetryMarker(
        parsed,
        marker.userId,
        candidate.moduleId,
        candidate.topicId,
        candidate.protocolRevision
      ) ||
      visualizationCompletionTelemetryStorageKey(
        marker.userId,
        candidate.moduleId,
        candidate.topicId,
        candidate.protocolRevision
      ) !== storageKey
    ) continue;
    const validCandidate = parsed as VisualizationCompletionTelemetryMarker;
    const scopeKey = `${validCandidate.moduleId}\u0000${validCandidate.topicId}`;
    const current = byScope.get(scopeKey);
    if (
      !current ||
      (current.phase === "pending" && validCandidate.phase === "complete") ||
      (current.phase === validCandidate.phase &&
        validCandidate.eventTimestamp < current.eventTimestamp)
    ) byScope.set(scopeKey, validCandidate);
  }
  const targetRevision = `generation:${marker.toGeneration}`;
  for (const candidate of byScope.values()) {
    const targetStorageKey = visualizationCompletionTelemetryStorageKey(
      marker.userId,
      candidate.moduleId,
      candidate.topicId,
      targetRevision
    );
    let targetMarker: VisualizationCompletionTelemetryMarker | null = null;
    const targetRaw = storage.getItem(targetStorageKey);
    if (targetRaw !== null) {
      try {
        const parsed: unknown = JSON.parse(targetRaw);
        if (isVisualizationCompletionTelemetryMarker(
          parsed,
          marker.userId,
          candidate.moduleId,
          candidate.topicId,
          targetRevision
        )) targetMarker = parsed;
      } catch {
        return false;
      }
    }
    const source = targetMarker?.phase === "complete"
      ? targetMarker
      : candidate.phase === "complete"
        ? candidate
        : targetMarker ?? candidate;
    const rebased: VisualizationCompletionTelemetryMarker = {
      ...source,
      protocolRevision: targetRevision
    };
    storage.setItem(targetStorageKey, JSON.stringify(rebased));
    const verifiedRaw = storage.getItem(targetStorageKey);
    if (verifiedRaw === null) return false;
    try {
      const verified: unknown = JSON.parse(verifiedRaw);
      if (!isVisualizationCompletionTelemetryMarker(
        verified,
        marker.userId,
        candidate.moduleId,
        candidate.topicId,
        targetRevision
      ) || (source.phase === "complete" && verified.phase !== "complete")) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function adoptCurrentGenerationLineageRows(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  generation: number
) {
  let emptySnapshots = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (
      learningAnalyticsClientProtocolStatus(storage, userId) !== "open" ||
      readLearningAnalyticsGeneration(storage, userId) !== generation
    ) return "unavailable" as const;
    const lineage = readLearningAnalyticsBoundaryLineage(storage, userId);
    const boundaryTokens = new Set(
      lineage?.generation === generation
        ? lineage.preservedBoundaryTokens
        : []
    );
    const snapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
      storage,
      userId
    );
    if (snapshot.status === "unavailable") return "unavailable" as const;
    const owned = snapshot.value.filter((event) => {
      const token = learningAnalyticsBoundaryToken(event);
      return token !== null && boundaryTokens.has(token);
    });
    if (owned.length === 0) {
      emptySnapshots += 1;
      if (emptySnapshots >= 2) return "adopted" as const;
      continue;
    }
    emptySnapshots = 0;
    mergeLearningAnalyticsOutbox(
      storage,
      userId,
      owned.map((event) =>
        withLearningAnalyticsDeliveryGeneration(event, generation)
      )
    );
    owned.forEach((event) => storage.removeItem(
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
    ));
  }
  return "unavailable" as const;
}

export function resumeLearningAnalyticsGenerationTransition(
  storage: LearningAnalyticsOutboxStorage,
  userId: string
): "absent" | "completed" | "corrupt" | "unavailable" {
  // Browser callers must hold the exact-user Web Lock for the entire
  // prepare/resume control-plane transaction. localStorage offers no CAS, so
  // identity rechecks are defense in depth rather than a substitute for that
  // cross-tab serialization contract.
  const state = readLearningAnalyticsGenerationTransition(storage, userId);
  if (state.status === "absent") {
    if (learningAnalyticsClientProtocolStatus(storage, userId) === "open") {
      const generation = readLearningAnalyticsGeneration(storage, userId);
      if (
        adoptCurrentGenerationLineageRows(storage, userId, generation) ===
        "unavailable"
      ) return "unavailable";
    }
    return "absent";
  }
  if (state.status === "corrupt") return "corrupt";
  const fence = readLearningAnalyticsClearFence(storage, userId);
  if (
    fence.status === "corrupt" ||
    (state.value.kind === "authoritative-lower" && fence.status !== "absent")
  ) return "corrupt";
  try {
    if (
      !exactLearningAnalyticsTransitionIsHeld(storage, state.value) ||
      !exactLearningAnalyticsFenceIsCompatible(storage, fence, state.value)
    ) return "unavailable";
    const prepared = finalizeLearningAnalyticsGenerationTransitionMarker(
      storage,
      state.value,
      fence
    );
    const drained = drainLearningAnalyticsTransitionRows(
      storage,
      prepared,
      transitionWriterGateTokens(storage, prepared, fence)
    );
    if (drained.status === "unavailable") return "unavailable";
    const marker: LearningAnalyticsGenerationTransition = {
      ...prepared,
      preserveEventIds: drained.value.preserveEventIds,
      quarantineEventIds: drained.value.quarantineEventIds,
      preserveUnconfirmedStorageKeys:
        drained.value.preserveUnconfirmedStorageKeys,
      quarantineConfirmedStorageKeys:
        drained.value.quarantineConfirmedStorageKeys,
      quarantineUnconfirmedStorageKeys:
        drained.value.quarantineUnconfirmedStorageKeys
    };
    if (
      !exactLearningAnalyticsTransitionIsHeld(storage, prepared) ||
      !exactLearningAnalyticsFenceIsCompatible(storage, fence, prepared)
    ) return "unavailable";
    storage.setItem(
      learningAnalyticsGenerationTransitionStorageKey(userId),
      JSON.stringify(marker)
    );
    const confirmedSnapshot = readRawLearningAnalyticsOutboxStrict(storage, userId);
    const unconfirmedSnapshot = readUnconfirmedLearningAnalyticsOutboxStrict(
      storage,
      userId
    );
    if (
      confirmedSnapshot.status === "unavailable" ||
      unconfirmedSnapshot.status === "unavailable"
    ) return "unavailable";
    if (
      !exactLearningAnalyticsTransitionIsHeld(storage, marker) ||
      !exactLearningAnalyticsFenceIsCompatible(storage, fence, marker)
    ) return "unavailable";
    const preserveIds = new Set(marker.preserveEventIds);
    const gateTokens = transitionWriterGateTokens(storage, marker, fence);
    const preservedUnconfirmedKeys = new Set(
      marker.preserveUnconfirmedStorageKeys
    );
    const preservedUnconfirmed = unconfirmedSnapshot.value.filter((event) => {
      const storageKey = unconfirmedLearningAnalyticsOutboxRecordStorageKey(
        userId,
        event
      );
      const boundaryToken = learningAnalyticsBoundaryToken(event);
      const preserve = preservedUnconfirmedKeys.has(storageKey) || Boolean(
        boundaryToken && gateTokens.has(boundaryToken)
      );
      if (preserve) {
        preservedUnconfirmedKeys.add(storageKey);
        preserveIds.add(event.id);
      }
      return preserve;
    });

    // Force legacy aggregate rows into independently keyed storage before
    // selective removal. Only already-rebased target-generation rows survive.
    mergeLearningAnalyticsOutbox(storage, userId, confirmedSnapshot.value);
    confirmedSnapshot.value.forEach((event) => {
      if (
        preserveIds.has(event.id) &&
        learningAnalyticsDeliveryGeneration(event) === marker.toGeneration
      ) return;
      const storageKey = learningAnalyticsOutboxRecordStorageKey(userId, event);
      writeLearningAnalyticsQuarantineEvent(
        storage,
        userId,
        event,
        marker.fromGeneration,
        marker.preparedAt,
        storageKey
      );
      storage.removeItem(storageKey);
    });
    unconfirmedSnapshot.value.forEach((event) => {
      const storageKey = unconfirmedLearningAnalyticsOutboxRecordStorageKey(
        userId,
        event
      );
      if (preservedUnconfirmedKeys.has(storageKey)) return;
      writeLearningAnalyticsQuarantineEvent(
        storage,
        userId,
        event,
        marker.fromGeneration,
        marker.preparedAt,
        storageKey
      );
      storage.removeItem(storageKey);
    });
    replaceLearningAnalyticsGeneration(storage, userId, marker.toGeneration);
    const confirmedPreserved = preservedUnconfirmed.map((event) =>
      withLearningAnalyticsDeliveryGeneration(event, marker.toGeneration)
    );
    mergeLearningAnalyticsOutbox(
      storage,
      userId,
      confirmedPreserved
    );
    preservedUnconfirmed.forEach((event) => storage.removeItem(
      unconfirmedLearningAnalyticsOutboxRecordStorageKey(userId, event)
    ));

    if (!rebaseVisualizationCompletionTelemetryAcrossTransition(
      storage,
      marker,
      gateTokens
    )) return "unavailable";

    recordLearningAnalyticsBoundaryLineage(
      storage,
      userId,
      marker.toGeneration,
      [...transitionWriterGateTokens(storage, marker, fence)]
    );

    storage.removeItem(learningAnalyticsGenerationHandshakeStorageKey(userId));
    if (
      !exactLearningAnalyticsTransitionIsHeld(storage, marker) ||
      !exactLearningAnalyticsFenceIsCompatible(storage, fence, marker)
    ) return "unavailable";
    storage.removeItem(learningAnalyticsClearFenceStorageKey(userId));
    // Remove the marker last. Every preceding mutation is idempotent, so a
    // restart can replay the transition without reviving a quarantined row.
    if (!exactLearningAnalyticsTransitionIsHeld(storage, marker)) {
      return "unavailable";
    }
    storage.removeItem(learningAnalyticsGenerationTransitionStorageKey(userId));
    if (
      adoptCurrentGenerationLineageRows(
        storage,
        userId,
        marker.toGeneration
      ) === "unavailable"
    ) return "unavailable";
    return "completed";
  } catch {
    return "unavailable";
  }
}

export function finishLearningAnalyticsForwardGenerationTransition(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  fromGeneration: number,
  toGeneration: number,
  clearedAt: string,
  transitionId: string,
  preparedAt = new Date().toISOString()
) {
  prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    fromGeneration,
    toGeneration,
    clearedAt,
    transitionId,
    preparedAt
  );
  return resumeLearningAnalyticsGenerationTransition(storage, userId);
}

export function finishLearningAnalyticsLowerGenerationRecovery(
  storage: LearningAnalyticsOutboxStorage,
  userId: string,
  fromGeneration: number,
  toGeneration: number,
  handshakeRequestId: string,
  preparedAt: string,
  transitionId: string
) {
  prepareLearningAnalyticsLowerGenerationRecovery(
    storage,
    userId,
    fromGeneration,
    toGeneration,
    handshakeRequestId,
    preparedAt,
    transitionId
  );
  return resumeLearningAnalyticsGenerationTransition(storage, userId);
}

function isOptionalCompactAnalyticsId(value: unknown) {
  return typeof value === "undefined" || (typeof value === "string" && value.trim().length > 0 && value.length <= 160);
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

export function isValidLearningAnalyticsEvent(value: unknown): value is LearningAnalyticsEvent {
  const record = value as Partial<LearningAnalyticsEvent> | null;
  const durationIsValid =
    typeof record?.durationSeconds === "undefined" ||
    (typeof record.durationSeconds === "number" &&
      Number.isSafeInteger(record.durationSeconds) &&
      record.durationSeconds > 0);

  return (
    typeof record?.id === "string" &&
    record.id.trim().length > 0 &&
    typeof record?.type === "string" &&
    eventTypes.has(record.type as LearningAnalyticsEventType) &&
    typeof record?.source === "string" &&
    eventSources.has(record.source as LearningAnalyticsEventSource) &&
    isCanonicalIsoTimestamp(record?.timestamp) &&
    isValidGradeId(record?.grade) &&
    typeof record?.topicId === "string" &&
    (typeof record?.questionId === "undefined" || typeof record.questionId === "string") &&
    isOptionalCompactAnalyticsId(record?.classId) &&
    isOptionalCompactAnalyticsId(record?.assignmentId) &&
    isOptionalCompactAnalyticsId(record?.competencyId) &&
    durationIsValid
  );
}

export function isValidLearningAnalyticsEventLog(value: unknown): value is LearningAnalyticsEvent[] {
  return Array.isArray(value) && value.every(isValidLearningAnalyticsEvent);
}

export function getRollingLearningAnalyticsEvents(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
) {
  const nowMs = toTime(options.now ?? new Date());
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const earliestMs = nowMs - windowDays * dayMs;

  return events
    .filter((event) => {
      const eventMs = toTime(event.timestamp);
      return eventMs >= earliestMs && eventMs <= nowMs;
    })
    .sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));
}

export function buildDailyLearningAnalyticsBuckets(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
) {
  const now = new Date(options.now ?? new Date());
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      events: 0,
      answers: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      durationSeconds: 0
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  getRollingLearningAnalyticsEvents(events, { now, windowDays }).forEach((event) => {
    const date = event.timestamp.slice(0, 10);
    const bucket = bucketMap.get(date);
    if (!bucket) return;

    bucket.events += 1;
    if (event.type === "answer-correct" || event.type === "answer-wrong") {
      bucket.answers += 1;
      if (event.type === "answer-correct") bucket.correctAnswers += 1;
      if (event.type === "answer-wrong") bucket.wrongAnswers += 1;
      bucket.durationSeconds += event.durationSeconds ?? 0;
    }
  });

  return buckets;
}

export function summarizeLearningAnalytics(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
): LearningAnalyticsSummary {
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const rollingEvents = getRollingLearningAnalyticsEvents(events, { now: options.now, windowDays });
  const correctAnswers = countEvents(rollingEvents, "answer-correct");
  const wrongAnswers = countEvents(rollingEvents, "answer-wrong");
  const totalAnswers = correctAnswers + wrongAnswers;
  const answerDurations = rollingEvents
    .filter((event) => event.type === "answer-correct" || event.type === "answer-wrong")
    .map((event) => event.durationSeconds)
    .filter((duration): duration is number => typeof duration === "number");
  const visualizationEvents = rollingEvents.filter((event) => event.type.startsWith("visualization-")).length;
  const firstEventAt = rollingEvents[0]?.timestamp ?? null;
  const lastEventAt = rollingEvents[rollingEvents.length - 1]?.timestamp ?? null;
  const averageSeconds = answerDurations.length
    ? Math.round(answerDurations.reduce((total, duration) => total + duration, 0) / answerDurations.length)
    : null;

  return {
    windowDays,
    eventCount: rollingEvents.length,
    hasActivity: rollingEvents.length > 0,
    firstEventAt,
    lastEventAt,
    counts: {
      mouseClicks: countEvents(rollingEvents, "mouse-click"),
      keyboardEvents: countEvents(rollingEvents, "keyboard"),
      correctAnswers,
      wrongAnswers,
      hintRequests: countEvents(rollingEvents, "hint-request"),
      visualizationEvents,
      pageViews: countEvents(rollingEvents, "page-view"),
      mistakeReviews: countEvents(rollingEvents, "mistake-review")
    },
    answerStats: {
      total: totalAnswers,
      accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : null
    },
    duration: {
      averageSeconds,
      buckets: {
        fast: answerDurations.filter((duration) => duration < 60).length,
        steady: answerDurations.filter((duration) => duration >= 60 && duration <= 180).length,
        slow: answerDurations.filter((duration) => duration > 180).length
      }
    },
    engagementScore: rollingEvents.length
      ? Math.min(
          99,
          Math.round(
            48 +
              Math.min(26, (countEvents(rollingEvents, "mouse-click") + countEvents(rollingEvents, "keyboard")) / 3) +
              Math.min(25, (visualizationEvents + countEvents(rollingEvents, "hint-request") + totalAnswers) * 2)
          )
        )
      : null
  };
}

export function exportLearningAnalyticsSummary({
  events,
  studentId,
  grade,
  now = new Date(),
  windowDays = analyticsWindowDays
}: {
  events: LearningAnalyticsEvent[];
  studentId: string;
  grade: GradeId;
  now?: Date | string;
  windowDays?: number;
}): LearningAnalyticsExportSummary {
  const generatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  return {
    generatedAt,
    studentId: sanitizeAnalyticsId(studentId),
    grade,
    summary: summarizeLearningAnalytics(events, { now, windowDays }),
    privacy: "Summary export excludes raw event timestamps, typed answers, coordinates, and individual selected answers."
  };
}
