import type { LearningAnalyticsEventSource } from "@/types";
import { isCanonicalVisualizationSessionIdentity } from "./visualizationSessionContract";

export type VisualizationSessionOutboxStorage = Pick<
  Storage,
  "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

export type VisualizationSessionOutboxRecord = {
  userId: string;
  moduleId: string;
  topicId: string;
  source: LearningAnalyticsEventSource;
  queuedAt: number;
};

export type VisualizationSessionOutboxScope = Pick<
  VisualizationSessionOutboxRecord,
  "userId" | "moduleId" | "topicId"
>;

export const visualizationSessionOutboxUpdatedEventName =
  "mais:visualization-session-outbox-updated";
export const visualizationSessionOutboxAcknowledgedEventName =
  "mais:visualization-session-outbox-acknowledged";
export const visualizationSessionOutboxFailedEventName =
  "mais:visualization-session-outbox-failed";

const visualizationSessionOutboxStoragePrefix =
  "mais:visualization-session-outbox:v1:";
const visualizationSessionOutboxQuarantineStoragePrefix =
  "mais:visualization-session-outbox-quarantine:v1:";
const visualizationSessionOutboxLegacyTerminalStoragePrefix =
  "mais:visualization-session-outbox-legacy-terminal:v1:";
const visualizationSessionPhysicalStorageKeys = new WeakMap<object, string>();

const validVisualizationSessionSources: Record<
  LearningAnalyticsEventSource,
  true
> = {
  "adaptive-learning": true,
  dashboard: true,
  practice: true,
  progress: true,
  lesson: true,
  "ai-tutor": true,
  "mistake-book": true,
  "visualization-lab": true,
  "function-graph": true,
  "function-model": true,
  geometry: true,
  probability: true,
  "coordinate-plane": true,
  "trig-wave": true,
  "calculus-stats": true,
  "learning-path": true,
  navigation: true
};

const visualizationSessionRecordKeys = [
  "userId",
  "moduleId",
  "topicId",
  "source",
  "queuedAt"
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasExactEnumerableOwnKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
) {
  try {
    const ownKeys = Reflect.ownKeys(value);
    return (
      ownKeys.length === expectedKeys.length &&
      expectedKeys.every(
        (key) => Object.prototype.propertyIsEnumerable.call(value, key)
      )
    );
  } catch {
    return false;
  }
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isVisualizationSessionSource(
  value: unknown
): value is LearningAnalyticsEventSource {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(validVisualizationSessionSources, value)
  );
}

function isExactVisualizationSessionOutboxRecord(
  current: VisualizationSessionOutboxRecord,
  expected: VisualizationSessionOutboxRecord
) {
  return (
    current.userId === expected.userId &&
    current.moduleId === expected.moduleId &&
    current.topicId === expected.topicId &&
    current.source === expected.source &&
    current.queuedAt === expected.queuedAt
  );
}

export function isVisualizationSessionOutboxRecord(
  value: unknown
): value is VisualizationSessionOutboxRecord {
  if (!isPlainObject(value)) return false;

  try {
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== visualizationSessionRecordKeys.length ||
      visualizationSessionRecordKeys.some(
        (key) => !Object.prototype.propertyIsEnumerable.call(value, key)
      )
    ) {
      return false;
    }

    return (
      isCanonicalVisualizationSessionIdentity(value.userId) &&
      isCanonicalVisualizationSessionIdentity(value.moduleId) &&
      isCanonicalVisualizationSessionIdentity(value.topicId) &&
      isVisualizationSessionSource(value.source) &&
      typeof value.queuedAt === "number" &&
      Number.isSafeInteger(value.queuedAt) &&
      value.queuedAt >= 0
    );
  } catch {
    return false;
  }
}

function assertNonEmptyId(value: string, name: string) {
  if (!isCanonicalVisualizationSessionIdentity(value)) {
    throw new TypeError(`${name} must be a canonical visualization-session identity.`);
  }
}

export function visualizationSessionOutboxScope(
  record: VisualizationSessionOutboxScope
): VisualizationSessionOutboxScope {
  assertNonEmptyId(record.userId, "userId");
  assertNonEmptyId(record.moduleId, "moduleId");
  assertNonEmptyId(record.topicId, "topicId");
  return {
    userId: record.userId,
    moduleId: record.moduleId,
    topicId: record.topicId
  };
}

export function visualizationSessionOutboxUserStoragePrefix(userId: string) {
  assertNonEmptyId(userId, "userId");
  return `${visualizationSessionOutboxStoragePrefix}${encodeURIComponent(userId)}/`;
}

export function visualizationSessionOutboxStorageKey(
  scope: VisualizationSessionOutboxScope
) {
  const exactScope = visualizationSessionOutboxScope(scope);
  return [
    visualizationSessionOutboxUserStoragePrefix(exactScope.userId),
    encodeURIComponent(exactScope.moduleId),
    "/",
    encodeURIComponent(exactScope.topicId)
  ].join("");
}

/**
 * The complete durable tuple is the immutable revision identity. Two records
 * with the same tuple are the same idempotent session write; changing source
 * or queue age necessarily produces a different physical key.
 */
export function visualizationSessionOutboxRecordStorageKey(
  record: VisualizationSessionOutboxRecord
) {
  if (!isVisualizationSessionOutboxRecord(record)) {
    throw new TypeError("Invalid visualization session outbox record.");
  }
  return [
    visualizationSessionOutboxStorageKey(visualizationSessionOutboxScope(record)),
    "/revision/",
    encodeURIComponent(record.source),
    "/",
    String(record.queuedAt)
  ].join("");
}

export function visualizationSessionOutboxQuarantineStorageKey(
  userId: string,
  originalStorageKey: string
) {
  assertNonEmptyId(userId, "userId");
  if (typeof originalStorageKey !== "string" || originalStorageKey.length === 0) {
    throw new TypeError("originalStorageKey must be a non-empty string.");
  }
  return `${visualizationSessionOutboxQuarantineStoragePrefix}${encodeURIComponent(userId)}:${encodeURIComponent(originalStorageKey)}`;
}

function visualizationSessionOutboxLegacyTerminalUserStoragePrefix(
  userId: string
) {
  assertNonEmptyId(userId, "userId");
  return `${visualizationSessionOutboxLegacyTerminalStoragePrefix}${encodeURIComponent(userId)}:`;
}

function visualizationSessionOutboxLegacyTerminalStorageKey(
  record: VisualizationSessionOutboxRecord
) {
  return `${visualizationSessionOutboxLegacyTerminalUserStoragePrefix(record.userId)}${encodeURIComponent(
    visualizationSessionOutboxRecordStorageKey(record)
  )}`;
}

function isVisualizationSessionLegacyTerminalRecord(
  value: unknown,
  expected: VisualizationSessionOutboxRecord
) {
  const marker = value as {
    record?: unknown;
    status?: unknown;
    userId?: unknown;
    version?: unknown;
  } | null;
  return (
    marker?.version === 1 &&
    marker.userId === expected.userId &&
    (marker.status === "acknowledged" || marker.status === "quarantined") &&
    isVisualizationSessionOutboxRecord(marker.record) &&
    isExactVisualizationSessionOutboxRecord(marker.record, expected)
  );
}

function visualizationSessionLegacyRevisionIsTerminal(
  storage: Pick<Storage, "getItem">,
  record: VisualizationSessionOutboxRecord
) {
  const raw = storage.getItem(
    visualizationSessionOutboxLegacyTerminalStorageKey(record)
  );
  if (raw === null) return false;
  try {
    return isVisualizationSessionLegacyTerminalRecord(JSON.parse(raw), record);
  } catch {
    return false;
  }
}

function terminalizeMatchingLegacyVisualizationSessionRevision(
  storage: Pick<Storage, "getItem" | "setItem">,
  record: VisualizationSessionOutboxRecord,
  status: "acknowledged" | "quarantined"
) {
  const legacyStorageKey = visualizationSessionOutboxStorageKey(
    visualizationSessionOutboxScope(record)
  );
  const legacyRaw = storage.getItem(legacyStorageKey);
  if (legacyRaw === null) return true;
  const legacyRecord = parseStoredRecord(legacyRaw, legacyStorageKey, false);
  if (
    !legacyRecord ||
    !isExactVisualizationSessionOutboxRecord(legacyRecord, record)
  ) return true;
  const terminalStorageKey =
    visualizationSessionOutboxLegacyTerminalStorageKey(record);
  storage.setItem(terminalStorageKey, JSON.stringify({
    version: 1,
    userId: record.userId,
    status,
    record
  }));
  const terminalRaw = storage.getItem(terminalStorageKey);
  if (terminalRaw === null) return false;
  try {
    return isVisualizationSessionLegacyTerminalRecord(
      JSON.parse(terminalRaw),
      record
    );
  } catch {
    return false;
  }
}

function quarantineVisualizationSessionOutboxValue(
  storage: VisualizationSessionOutboxStorage,
  userId: string,
  originalStorageKey: string,
  raw: string,
  reason: string,
  removeImmutableRecord = false
) {
  const quarantineKey = visualizationSessionOutboxQuarantineStorageKey(
    userId,
    originalStorageKey
  );
  try {
    const quarantineArtifact = JSON.stringify({
      version: 1,
      userId,
      originalStorageKey,
      quarantinedAt: new Date().toISOString(),
      reason,
      raw
    });
    storage.setItem(quarantineKey, quarantineArtifact);
    if (storage.getItem(quarantineKey) !== quarantineArtifact) return false;
    // A malformed slot cannot authorize deletion after a stale read. Leaving
    // it visible is fail-closed; an immutable valid peer revision remains
    // independently readable and deliverable.
    if (removeImmutableRecord) {
      storage.removeItem(originalStorageKey);
      return storage.getItem(originalStorageKey) === null;
    }
    return true;
  } catch {
    // Retain the poison record when recoverable quarantine is unavailable.
    return false;
  }
}

export function quarantineVisualizationSessionOutboxRecord(
  storage: VisualizationSessionOutboxStorage,
  record: VisualizationSessionOutboxRecord,
  reason: string
) {
  if (!isVisualizationSessionOutboxRecord(record)) {
    throw new TypeError("Invalid visualization session outbox record.");
  }
  const recordStorageKey = visualizationSessionPhysicalStorageKeys.get(record) ??
    visualizationSessionOutboxRecordStorageKey(record);
  let raw: string | null;
  try {
    raw = storage.getItem(recordStorageKey);
  } catch {
    return false;
  }
  if (raw === null) return true;
  const current = parseStoredRecord(raw, recordStorageKey);
  if (!current || !isExactVisualizationSessionOutboxRecord(current, record)) {
    return false;
  }
  try {
    if (!terminalizeMatchingLegacyVisualizationSessionRevision(
      storage,
      record,
      "quarantined"
    )) return false;
  } catch {
    return false;
  }
  return quarantineVisualizationSessionOutboxValue(
    storage,
    record.userId,
    recordStorageKey,
    raw,
    reason,
    true
  );
}

export function visualizationSessionOutboxDeliveryDisposition(
  status: number,
  value: unknown = null
) {
  if (status === 200) return "ack-candidate" as const;
  if (status === 400) return "quarantine-and-continue" as const;
  if (
    status === 403 &&
    isPlainObject(value) &&
    value.reason === "curriculum-scope-mismatch"
  ) return "quarantine-and-continue" as const;
  if (status === 401 || status === 403) return "retry-after-auth" as const;
  return "retry" as const;
}

function parseStoredRecord(
  serialized: string,
  storageKey: string,
  rememberPhysicalKey = true
): VisualizationSessionOutboxRecord | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isVisualizationSessionOutboxRecord(parsed)) return null;
    if (
      visualizationSessionOutboxRecordStorageKey(parsed) !== storageKey &&
      visualizationSessionOutboxStorageKey(
        visualizationSessionOutboxScope(parsed)
      ) !== storageKey
    ) {
      return null;
    }
    if (rememberPhysicalKey) {
      visualizationSessionPhysicalStorageKeys.set(parsed, storageKey);
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists one logical visualization session. A valid existing record wins so
 * duplicate effects and retry attempts keep their original queue age. A
 * malformed value at the same exact key is repaired by the incoming record.
 */
export function queueVisualizationSessionOutbox(
  storage: VisualizationSessionOutboxStorage,
  record: VisualizationSessionOutboxRecord
): VisualizationSessionOutboxRecord {
  if (!isVisualizationSessionOutboxRecord(record)) {
    throw new TypeError("Invalid visualization session outbox record.");
  }

  const durableRecord: VisualizationSessionOutboxRecord = {
    userId: record.userId,
    moduleId: record.moduleId,
    topicId: record.topicId,
    source: record.source,
    queuedAt: record.queuedAt
  };
  const currentRecord = readVisualizationSessionOutbox(
    storage,
    durableRecord.userId
  ).find((candidate) =>
    candidate.moduleId === durableRecord.moduleId &&
    candidate.topicId === durableRecord.topicId &&
    candidate.source === durableRecord.source
  );
  if (currentRecord) return currentRecord;

  const storageKey = visualizationSessionOutboxRecordStorageKey(durableRecord);
  const terminalStorageKey =
    visualizationSessionOutboxLegacyTerminalStorageKey(durableRecord);
  storage.removeItem(terminalStorageKey);
  if (storage.getItem(terminalStorageKey) !== null) {
    throw new Error("Could not reopen a terminal visualization-session revision.");
  }
  storage.setItem(storageKey, JSON.stringify(durableRecord));
  visualizationSessionPhysicalStorageKeys.set(durableRecord, storageKey);
  return durableRecord;
}

function compareExactStrings(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function readVisualizationSessionOutbox(
  storage: VisualizationSessionOutboxStorage,
  userId: string
) {
  const userPrefix = visualizationSessionOutboxUserStoragePrefix(userId);
  const recordsByPhysicalKey = new Map<
    string,
    VisualizationSessionOutboxRecord
  >();
  let storageLength: number;
  const candidateKeys: string[] = [];

  try {
    storageLength = storage.length;
  } catch {
    return [];
  }

  // Snapshot in reverse before quarantine removes any key. localStorage's
  // numeric indexes shift on deletion; mutating during a forward walk can
  // otherwise skip the record immediately following a poison entry.
  for (let index = storageLength - 1; index >= 0; index -= 1) {
    let storageKey: string | null;
    try {
      storageKey = storage.key(index);
    } catch {
      continue;
    }
    if (storageKey?.startsWith(userPrefix)) candidateKeys.push(storageKey);
  }

  for (const storageKey of candidateKeys) {

    let serialized: string | null;
    try {
      serialized = storage.getItem(storageKey);
    } catch {
      continue;
    }
    if (serialized === null) continue;

    const record = parseStoredRecord(serialized, storageKey);
    if (record) {
      const immutableStorageKey =
        visualizationSessionOutboxRecordStorageKey(record);
      let durableRecord = record;
      if (visualizationSessionLegacyRevisionIsTerminal(storage, record)) {
        continue;
      }
      if (storageKey !== immutableStorageKey) {
        let immutableRaw: string | null;
        try {
          immutableRaw = storage.getItem(immutableStorageKey);
          if (immutableRaw === null) {
            storage.setItem(immutableStorageKey, JSON.stringify(record));
            immutableRaw = storage.getItem(immutableStorageKey);
          }
        } catch {
          continue;
        }
        if (immutableRaw === null) continue;
        const immutableRecord = parseStoredRecord(
          immutableRaw,
          immutableStorageKey
        );
        if (
          !immutableRecord ||
          !isExactVisualizationSessionOutboxRecord(immutableRecord, record)
        ) {
          quarantineVisualizationSessionOutboxValue(
            storage,
            userId,
            immutableStorageKey,
            immutableRaw,
            "invalid-immutable-migration-record"
          );
          continue;
        }
        durableRecord = immutableRecord;
      }
      recordsByPhysicalKey.set(immutableStorageKey, durableRecord);
    } else {
      quarantineVisualizationSessionOutboxValue(
        storage,
        userId,
        storageKey,
        serialized,
        "invalid-legacy-record"
      );
    }
  }

  return [...recordsByPhysicalKey.values()].sort((left, right) => {
    const queuedAtDelta = left.queuedAt - right.queuedAt;
    if (queuedAtDelta !== 0) return queuedAtDelta;
    const moduleDelta = compareExactStrings(left.moduleId, right.moduleId);
    if (moduleDelta !== 0) return moduleDelta;
    const topicDelta = compareExactStrings(left.topicId, right.topicId);
    return topicDelta || compareExactStrings(left.source, right.source);
  });
}

export function acknowledgeVisualizationSessionOutbox(
  storage: VisualizationSessionOutboxStorage,
  record: VisualizationSessionOutboxRecord
) {
  if (!isVisualizationSessionOutboxRecord(record)) return false;
  const recordStorageKey = visualizationSessionPhysicalStorageKeys.get(record) ??
    visualizationSessionOutboxRecordStorageKey(record);
  let raw: string | null;
  try {
    raw = storage.getItem(recordStorageKey);
  } catch {
    return false;
  }
  if (raw === null) return true;
  const current = parseStoredRecord(raw, recordStorageKey);
  if (!current || !isExactVisualizationSessionOutboxRecord(current, record)) {
    return false;
  }
  try {
    if (!terminalizeMatchingLegacyVisualizationSessionRevision(
      storage,
      record,
      "acknowledged"
    )) return false;
    storage.removeItem(recordStorageKey);
    return storage.getItem(recordStorageKey) === null;
  } catch {
    return false;
  }
}

export function isVisualizationSessionOutboxAcknowledgement(
  status: number,
  value: unknown,
  record: VisualizationSessionOutboxRecord
) {
  if (
    status !== 200 ||
    !isPlainObject(value) ||
    !hasExactEnumerableOwnKeys(value, [
      "acknowledgedUserId",
      "durablyPersisted",
      "session"
    ]) ||
    !isPlainObject(value.session) ||
    !hasExactEnumerableOwnKeys(value.session, [
      "completedAt",
      "explored",
      "moduleId",
      "source",
      "topicId",
      "updatedAt"
    ])
  ) return false;

  const response = value;
  const session = value.session;
  return (
    response.acknowledgedUserId === record.userId &&
    response.durablyPersisted === true &&
    session.explored === true &&
    session.moduleId === record.moduleId &&
    session.topicId === record.topicId &&
    session.source === record.source &&
    isCanonicalIsoTimestamp(session.completedAt) &&
    isCanonicalIsoTimestamp(session.updatedAt)
  );
}

export function clearVisualizationSessionOutboxForUser(
  storage: VisualizationSessionOutboxStorage,
  userId: string
) {
  const userPrefix = visualizationSessionOutboxUserStoragePrefix(userId);
  const legacyTerminalPrefix =
    visualizationSessionOutboxLegacyTerminalUserStoragePrefix(userId);
  const keysToRemove: string[] = [];
  const storageLength = storage.length;

  // Snapshot before deleting so localStorage's shifting numeric indexes cannot
  // cause every second key to be skipped.
  for (let index = 0; index < storageLength; index += 1) {
    const storageKey = storage.key(index);
    if (
      storageKey?.startsWith(userPrefix) ||
      storageKey?.startsWith(legacyTerminalPrefix)
    ) keysToRemove.push(storageKey);
  }

  keysToRemove.forEach((storageKey) => storage.removeItem(storageKey));
  return keysToRemove.length;
}
