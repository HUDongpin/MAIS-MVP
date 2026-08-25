import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { isValidLearningAnalyticsEventLog } from "../../lib/learningAnalytics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";

type JsonRecord = Record<string, unknown>;

const appStateCollections = [
  "gamification_events",
  "learning_events",
  "lesson_progress",
  "reward_point_ledger",
  "visualization_events",
  "visualization_sessions",
] as const;

type AppStateCollection = (typeof appStateCollections)[number];
type TopicScope = "selected" | "sibling";

export type VisualizationLessonProgressEvidence = {
  readonly lessonSlug: string;
  readonly status: string;
  readonly topicId: string;
};

export type VisualizationLessonSessionEvidence = {
  readonly completedAt: string | null;
  readonly explored: boolean;
  readonly moduleId: string;
  readonly source: string;
  readonly topicId: string;
  readonly updatedAt: string;
};

export type VisualizationLessonLearningEventEvidence = {
  readonly createdAt: string;
  readonly id: string;
  readonly source: string;
  readonly topicId: string;
  readonly type: string;
};

export type VisualizationLessonVisualizationEventEvidence = {
  readonly createdAt: string;
  readonly id: string;
  readonly source: string;
  readonly topicId: string;
};

export type VisualizationLessonRewardEvidence = {
  readonly amount: number;
  readonly createdAt: string;
  readonly reason: "visualization-complete";
  readonly sourceKey: string;
  readonly studentId: string;
};

export type VisualizationLessonGamificationEvidence = {
  readonly createdAt: string;
  readonly economyVersion: string;
  readonly id: string;
  readonly rewardPoints: number;
  readonly source: "visualization-complete";
  readonly sourceKey: string;
  readonly status: string;
  readonly studentId: string;
  readonly xp: number;
};

export type VisualizationLessonAppStateScope = {
  readonly gamificationEvents: readonly VisualizationLessonGamificationEvidence[];
  readonly learningEvents: readonly VisualizationLessonLearningEventEvidence[];
  readonly lessonProgress: readonly VisualizationLessonProgressEvidence[];
  readonly rewards: readonly VisualizationLessonRewardEvidence[];
  readonly sessions: readonly VisualizationLessonSessionEvidence[];
  readonly visualizationEvents: readonly VisualizationLessonVisualizationEventEvidence[];
};

export type VisualizationLessonMalformedEvidence = {
  readonly collection: AppStateCollection;
  readonly index?: number;
  readonly reason: string;
  readonly rowSha256?: string;
};

export type VisualizationLessonAppStateSnapshot = {
  readonly malformed: readonly VisualizationLessonMalformedEvidence[];
  readonly moduleId: string;
  readonly payloadByteLength: number;
  readonly payloadSha256: string;
  readonly revision: number;
  readonly selected: VisualizationLessonAppStateScope;
  readonly selectedTopicId: string;
  readonly siblingTopicIds: readonly string[];
  readonly siblings: VisualizationLessonAppStateScope;
  readonly updatedAt: string;
  readonly userId: string;
  readonly visualizationSliceSha256: string;
};

type AppStateClassifierInput = {
  readonly moduleId: string;
  readonly payloadBytes: string;
  readonly revision: number;
  readonly selectedTopicId: string;
  readonly siblingTopicIds: readonly string[];
  readonly updatedAt: string;
  readonly userId: string;
};

type AppStateReaderInput = Omit<AppStateClassifierInput, "payloadBytes" | "revision" | "updatedAt"> & {
  readonly databasePath: string;
};

type ObservedWrite = {
  readonly body: unknown;
  readonly method: string;
  readonly pathname: string;
};

export type VisualizationLessonAllowedMountWrite = {
  readonly index: number;
  readonly kind:
    | "analytics-empty-handshake"
    | "lesson-page-view"
    | "lesson-progress-start"
    | "safe-read";
  readonly method: string;
  readonly pathname: string;
};

export type VisualizationLessonMountWriteViolation = {
  readonly index: number;
  readonly method: string;
  readonly pathname: string;
  readonly reason: string;
};

export type VisualizationLessonMountWriteVerdict = {
  readonly allowed: readonly VisualizationLessonAllowedMountWrite[];
  readonly ok: boolean;
  readonly violations: readonly VisualizationLessonMountWriteViolation[];
};

type MountExpected = {
  readonly grade: string;
  readonly lessonSlug: string;
  readonly moduleId: string;
  readonly selectedTopicId: string;
  readonly siblingTopicIds: readonly string[];
  readonly userId: string;
};

type MountReceipt = {
  readonly activeRoot: {
    readonly activeLabId: string;
    readonly count: number;
    readonly moduleId: string;
    readonly sessionOwner: string;
    readonly topicId: string;
    readonly visible: boolean;
  };
  readonly apiSessions: readonly unknown[];
  readonly digest: {
    readonly current: string;
    readonly previous: string;
    readonly stablePolls: number;
  };
  readonly dispatchedControlEventCount: number;
  readonly inFlightRelevantWriteKeys: readonly string[];
  readonly lessonProgressStartAck: null | {
    readonly method: string;
    readonly pathname: string;
    readonly responseBytes: string;
    readonly status: number;
    readonly writeIndex: number;
  };
  readonly lessonPageViewAck: null | {
    readonly method: string;
    readonly pathname: string;
    readonly responseBytes: string;
    readonly status: number;
    readonly writeIndex: number;
  };
  readonly outbox: {
    readonly sessionDigestAfter: string;
    readonly sessionDigestBefore: string;
    readonly sessionRecords: readonly unknown[];
    readonly visualizationDigestAfter: string;
    readonly visualizationDigestBefore: string;
    readonly visualizationRecords: readonly unknown[];
  };
  readonly raw: VisualizationLessonAppStateSnapshot;
  readonly visibleEnabledControlKeys: readonly string[];
  readonly writes: readonly ObservedWrite[];
};

export type VisualizationLessonMountTerminalVerdict = {
  readonly hardFailures: readonly string[];
  readonly pending: readonly string[];
  readonly rawPayloadSha256: string;
  readonly rawRevision: number;
  readonly terminal: boolean;
  readonly terminalDigest: string;
};

type SessionApiEnvelope = {
  readonly body: unknown;
  readonly responseBytes: string;
  readonly status: number;
};

type FirstInteractionInput = {
  readonly api: SessionApiEnvelope;
  readonly expected: {
    readonly moduleId: string;
    readonly selectedTopicId: string;
    readonly siblingTopicIds: readonly string[];
    readonly source: string;
    readonly userId: string;
  };
  readonly raw: VisualizationLessonAppStateSnapshot;
  readonly request: {
    readonly body: unknown;
    readonly method: string;
    readonly pathname: string;
  };
  readonly response: SessionApiEnvelope;
};

export type VisualizationLessonFirstInteractionReceipt = {
  readonly apiResponseBytes: string;
  readonly apiResponseSha256: string;
  readonly appStatePayloadSha256: string;
  readonly appStateRevision: number;
  readonly appStateUpdatedAt: string;
  readonly gamificationEventsSha256: string;
  readonly gamificationRewardPoints: number;
  readonly gamificationXp: number;
  readonly learningEventsSha256: string;
  readonly moduleId: string;
  readonly requestBodySha256: string;
  readonly responseBytes: string;
  readonly responseSha256: string;
  readonly rewardAmount: number;
  readonly rewardsSha256: string;
  readonly rewardSourceKey: string;
  readonly selectedTopicId: string;
  readonly sessionSha256: string;
  readonly source: string;
  readonly userId: string;
  readonly visualizationEventsSha256: string;
  readonly visualizationSliceSha256: string;
};

export type VisualizationLessonDuplicateReplayReceipt = {
  readonly appStateRevision: number;
  readonly idempotent: true;
  readonly responseSha256: string;
  readonly selectedTopicId: string;
  readonly visualizationSliceSha256: string;
};

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

function jsonCloneFrozen<T>(value: T, label: string): T {
  let bytes: string | undefined;
  try {
    bytes = JSON.stringify(value);
  } catch (error) {
    throw new TypeError(`${label} is not JSON-safe: ${String(error)}`);
  }
  if (bytes === undefined) throw new TypeError(`${label} is not JSON-safe.`);
  return deepFreeze(JSON.parse(bytes) as T);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Evidence contains a non-finite number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!isPlainRecord(value)) throw new TypeError("Evidence contains a non-JSON value.");
  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256(bytes: string) {
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

function evidenceSha256(value: unknown) {
  return sha256(canonicalJson(value));
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

function assertCanonicalIdentities(values: readonly string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    assertCanonicalIdentity(value, label);
    if (seen.has(value)) throw new TypeError(`${label} contains a duplicate identity.`);
    seen.add(value);
  }
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function exactOwnStringKeys(value: unknown, expected: readonly string[]) {
  if (!isPlainRecord(value)) return false;
  const actual = Reflect.ownKeys(value);
  return (
    actual.every((key): key is string => typeof key === "string") &&
    actual.length === expected.length &&
    [...actual].sort().join("\u0000") === [...expected].sort().join("\u0000")
  );
}

function visualizationRewardSourceKey(userId: string, moduleId: string, topicId: string) {
  const digest = sha256(JSON.stringify([userId, moduleId, topicId]));
  return `visualization-complete:v2:${digest}`;
}

function emptyScope(): {
  gamificationEvents: VisualizationLessonGamificationEvidence[];
  learningEvents: VisualizationLessonLearningEventEvidence[];
  lessonProgress: VisualizationLessonProgressEvidence[];
  rewards: VisualizationLessonRewardEvidence[];
  sessions: VisualizationLessonSessionEvidence[];
  visualizationEvents: VisualizationLessonVisualizationEventEvidence[];
} {
  return {
    gamificationEvents: [],
    learningEvents: [],
    lessonProgress: [],
    rewards: [],
    sessions: [],
    visualizationEvents: [],
  };
}

export function assertStarshipVisualizationDatabasePath(databasePath: string) {
  const valid =
    typeof databasePath === "string" &&
    databasePath.startsWith("/Volumes/Starship/") &&
    path.isAbsolute(databasePath) &&
    path.resolve(databasePath) === databasePath &&
    path.normalize(databasePath) === databasePath &&
    !databasePath.includes("\u0000") &&
    path.basename(databasePath).length > 0;
  if (!valid) {
    throw new TypeError(
      `STARSHIP_DATABASE_PATH: expected one canonical absolute path beneath /Volumes/Starship; actual=${JSON.stringify(databasePath)}.`,
    );
  }
  return databasePath;
}

export function classifyVisualizationLessonAppState(
  input: AppStateClassifierInput,
): VisualizationLessonAppStateSnapshot {
  assertCanonicalIdentity(input.userId, "userId");
  assertCanonicalIdentity(input.moduleId, "moduleId");
  assertCanonicalIdentity(input.selectedTopicId, "selectedTopicId");
  assertCanonicalIdentities(input.siblingTopicIds, "siblingTopicIds");
  if (input.siblingTopicIds.includes(input.selectedTopicId)) {
    throw new TypeError("selectedTopicId must not also be a sibling topic.");
  }
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) {
    throw new TypeError("app_state revision must be a non-negative safe integer.");
  }
  if (!isCanonicalIso(input.updatedAt)) {
    throw new TypeError("app_state updatedAt must be a canonical ISO timestamp.");
  }
  if (typeof input.payloadBytes !== "string") {
    throw new TypeError("app_state payload must be exact UTF-8 JSON bytes.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.payloadBytes);
  } catch (error) {
    throw new TypeError(`VISUALIZATION_APP_STATE_CLASSIFICATION: invalid JSON payload: ${String(error)}`);
  }
  if (!isPlainRecord(payload)) {
    throw new TypeError("VISUALIZATION_APP_STATE_CLASSIFICATION: payload is not an object.");
  }

  const selected = emptyScope();
  const siblings = emptyScope();
  const malformed: VisualizationLessonMalformedEvidence[] = [];
  const siblingSet = new Set(input.siblingTopicIds);
  const selectedRewardKey = visualizationRewardSourceKey(
    input.userId,
    input.moduleId,
    input.selectedTopicId,
  );
  const siblingRewardKeys = new Map(
    input.siblingTopicIds.map((topicId) => [
      visualizationRewardSourceKey(input.userId, input.moduleId, topicId),
      topicId,
    ]),
  );

  const scopeForTopic = (topicId: unknown): TopicScope | null => {
    if (topicId === input.selectedTopicId) return "selected";
    if (typeof topicId === "string" && siblingSet.has(topicId)) return "sibling";
    return null;
  };
  const bucket = (scope: TopicScope) => (scope === "selected" ? selected : siblings);
  const addMalformed = (
    collection: AppStateCollection,
    reason: string,
    index?: number,
    row?: unknown,
  ) => {
    const evidence: {
      collection: AppStateCollection;
      index?: number;
      reason: string;
      rowSha256?: string;
    } = { collection, reason };
    if (index !== undefined) evidence.index = index;
    if (row !== undefined) evidence.rowSha256 = evidenceSha256(row);
    malformed.push(evidence);
  };
  const rows = (collection: AppStateCollection) => {
    const value = payload[collection];
    if (!Array.isArray(value)) {
      addMalformed(collection, "missing-array");
      return [] as unknown[];
    }
    return value;
  };

  rows("lesson_progress").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("lesson_progress", "malformed-unscoped-row", index, row);
      return;
    }
    if (row.user_id !== input.userId) return;
    const scope = scopeForTopic(row.topic_id);
    if (scope === null) {
      if (typeof row.topic_id !== "string") {
        addMalformed("lesson_progress", "malformed-relevant-row", index, row);
      }
      return;
    }
    const expectedLessonSlug = lessonSlugForTopicId(row.topic_id as string);
    if (row.lesson_slug !== expectedLessonSlug) {
      addMalformed("lesson_progress", "lesson-identity-mismatch", index, row);
      return;
    }
    if (typeof row.status !== "string" || row.status.length === 0) {
      addMalformed("lesson_progress", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).lessonProgress.push({
      lessonSlug: expectedLessonSlug,
      status: row.status,
      topicId: row.topic_id as string,
    });
  });

  rows("visualization_sessions").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("visualization_sessions", "malformed-unscoped-row", index, row);
      return;
    }
    if (row.user_id !== input.userId || row.module_id !== input.moduleId) return;
    const scope = scopeForTopic(row.topic_id);
    if (scope === null) {
      if (typeof row.topic_id !== "string") {
        addMalformed("visualization_sessions", "malformed-relevant-row", index, row);
      }
      return;
    }
    if (
      typeof row.source !== "string" ||
      typeof row.explored !== "boolean" ||
      (row.completed_at !== null && typeof row.completed_at !== "string") ||
      typeof row.updated_at !== "string"
    ) {
      addMalformed("visualization_sessions", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).sessions.push({
      completedAt: row.completed_at as string | null,
      explored: row.explored,
      moduleId: input.moduleId,
      source: row.source,
      topicId: row.topic_id as string,
      updatedAt: row.updated_at,
    });
  });

  rows("learning_events").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("learning_events", "malformed-unscoped-row", index, row);
      return;
    }
    if (row.user_id !== input.userId) return;
    const visualizationType =
      typeof row.type === "string" && row.type.startsWith("visualization-");
    const possibleMalformedVisualization =
      scopeForTopic(row.topic_id) !== null && row.type !== "page-view";
    if (!visualizationType && !possibleMalformedVisualization) return;
    const scope = scopeForTopic(row.topic_id);
    if (
      scope === null ||
      typeof row.id !== "string" ||
      typeof row.source !== "string" ||
      typeof row.topic_id !== "string" ||
      typeof row.type !== "string" ||
      typeof row.created_at !== "string"
    ) {
      addMalformed("learning_events", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).learningEvents.push({
      createdAt: row.created_at,
      id: row.id,
      source: row.source,
      topicId: row.topic_id,
      type: row.type,
    });
  });

  rows("visualization_events").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("visualization_events", "malformed-unscoped-row", index, row);
      return;
    }
    if (row.user_id !== input.userId) return;
    const scope = scopeForTopic(row.topic_id);
    if (scope === null) return;
    if (
      typeof row.id !== "string" ||
      typeof row.source !== "string" ||
      typeof row.topic_id !== "string" ||
      typeof row.created_at !== "string"
    ) {
      addMalformed("visualization_events", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).visualizationEvents.push({
      createdAt: row.created_at,
      id: row.id,
      source: row.source,
      topicId: row.topic_id,
    });
  });

  rows("reward_point_ledger").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("reward_point_ledger", "malformed-unscoped-row", index, row);
      return;
    }
    const scope = row.source_key === selectedRewardKey
      ? "selected"
      : typeof row.source_key === "string" && siblingRewardKeys.has(row.source_key)
        ? "sibling"
        : null;
    if (scope !== null && row.student_id !== input.userId) {
      addMalformed(
        "reward_point_ledger",
        "owner-mismatch-for-expected-source-key",
        index,
        row,
      );
      return;
    }
    if (scope === null) {
      if (row.student_id === input.userId && row.reason === "visualization-complete") {
        addMalformed("reward_point_ledger", "unexpected-reward-source-key", index, row);
      }
      return;
    }
    if (row.reason !== "visualization-complete") {
      addMalformed(
        "reward_point_ledger",
        "unexpected-reason-for-expected-key",
        index,
        row,
      );
      return;
    }
    if (
      typeof row.amount !== "number" ||
      !Number.isFinite(row.amount) ||
      typeof row.source_key !== "string" ||
      typeof row.created_at !== "string"
    ) {
      addMalformed("reward_point_ledger", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).rewards.push({
      amount: row.amount,
      createdAt: row.created_at,
      reason: "visualization-complete",
      sourceKey: row.source_key,
      studentId: input.userId,
    });
  });

  rows("gamification_events").forEach((row, index) => {
    if (!isPlainRecord(row)) {
      addMalformed("gamification_events", "malformed-unscoped-row", index, row);
      return;
    }
    const scope = row.source_key === selectedRewardKey
      ? "selected"
      : typeof row.source_key === "string" && siblingRewardKeys.has(row.source_key)
        ? "sibling"
        : null;
    if (scope !== null && row.student_id !== input.userId) {
      addMalformed(
        "gamification_events",
        "owner-mismatch-for-expected-source-key",
        index,
        row,
      );
      return;
    }
    if (scope === null) {
      if (row.student_id === input.userId && row.source === "visualization-complete") {
        addMalformed("gamification_events", "unexpected-reward-source-key", index, row);
      }
      return;
    }
    if (row.source !== "visualization-complete") {
      addMalformed(
        "gamification_events",
        "unexpected-source-for-expected-key",
        index,
        row,
      );
      return;
    }
    if (
      typeof row.id !== "string" ||
      typeof row.reward_points !== "number" ||
      !Number.isFinite(row.reward_points) ||
      typeof row.xp !== "number" ||
      !Number.isFinite(row.xp) ||
      typeof row.source_key !== "string" ||
      typeof row.status !== "string" ||
      typeof row.economy_version !== "string" ||
      typeof row.created_at !== "string"
    ) {
      addMalformed("gamification_events", "malformed-relevant-row", index, row);
      return;
    }
    bucket(scope).gamificationEvents.push({
      createdAt: row.created_at,
      economyVersion: row.economy_version,
      id: row.id,
      rewardPoints: row.reward_points,
      source: "visualization-complete",
      sourceKey: row.source_key,
      status: row.status,
      studentId: input.userId,
      xp: row.xp,
    });
  });

  const sortScope = (scope: ReturnType<typeof emptyScope>) => {
    scope.lessonProgress.sort((left, right) => left.topicId.localeCompare(right.topicId));
    scope.sessions.sort((left, right) => left.topicId.localeCompare(right.topicId));
    scope.learningEvents.sort((left, right) => left.id.localeCompare(right.id));
    scope.visualizationEvents.sort((left, right) => left.id.localeCompare(right.id));
    scope.rewards.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
    scope.gamificationEvents.sort((left, right) =>
      left.sourceKey.localeCompare(right.sourceKey) || left.id.localeCompare(right.id));
  };
  sortScope(selected);
  sortScope(siblings);
  malformed.sort((left, right) =>
    left.collection.localeCompare(right.collection) ||
    (left.index ?? -1) - (right.index ?? -1) ||
    left.reason.localeCompare(right.reason));

  const slice = { malformed, selected, siblings };
  return deepFreeze({
    malformed,
    moduleId: input.moduleId,
    payloadByteLength: Buffer.byteLength(input.payloadBytes, "utf8"),
    payloadSha256: sha256(input.payloadBytes),
    revision: input.revision,
    selected,
    selectedTopicId: input.selectedTopicId,
    siblingTopicIds: [...input.siblingTopicIds],
    siblings,
    updatedAt: input.updatedAt,
    userId: input.userId,
    visualizationSliceSha256: evidenceSha256(slice),
  });
}

export function readVisualizationLessonAppState(
  input: AppStateReaderInput,
): VisualizationLessonAppStateSnapshot {
  const databasePath = assertStarshipVisualizationDatabasePath(input.databasePath);
  let resolvedPath: string;
  try {
    resolvedPath = realpathSync.native(databasePath);
  } catch (error) {
    throw new TypeError(`VISUALIZATION_APP_STATE_READ: database path is unavailable: ${String(error)}`);
  }
  if (resolvedPath !== databasePath) {
    throw new TypeError(
      `STARSHIP_DATABASE_PATH: database path must not traverse a symlink; actual=${JSON.stringify(databasePath)} resolved=${JSON.stringify(resolvedPath)}.`,
    );
  }

  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database
      .prepare("SELECT payload, revision, updated_at FROM app_state WHERE id = ?")
      .get("primary") as
      | { payload?: unknown; revision?: unknown; updated_at?: unknown }
      | undefined;
    if (
      typeof row?.payload !== "string" ||
      typeof row.revision !== "number" ||
      typeof row.updated_at !== "string"
    ) {
      throw new TypeError("VISUALIZATION_APP_STATE_READ: exact primary revision is unavailable.");
    }
    return classifyVisualizationLessonAppState({
      moduleId: input.moduleId,
      payloadBytes: row.payload,
      revision: row.revision,
      selectedTopicId: input.selectedTopicId,
      siblingTopicIds: input.siblingTopicIds,
      updatedAt: row.updated_at,
      userId: input.userId,
    });
  } finally {
    database.close();
  }
}

function validAnalyticsEnvelope(body: unknown) {
  return (
    isPlainRecord(body) &&
    exactOwnStringKeys(body, ["events", "generation"]) &&
    Number.isSafeInteger(body.generation) &&
    (body.generation as number) >= 0 &&
    Array.isArray(body.events)
  );
}

function exactLessonPageView(
  event: unknown,
  lessonSlug: string,
  expectedGrade: string,
) {
  return (
    isPlainRecord(event) &&
    exactOwnStringKeys(event, ["grade", "id", "source", "timestamp", "topicId", "type"]) &&
    isValidLearningAnalyticsEventLog([event]) &&
    typeof event.id === "string" &&
    event.id.length > 0 &&
    event.grade === expectedGrade &&
    event.type === "page-view" &&
    event.source === "lesson" &&
    event.topicId === `student-lessons-${lessonSlug}` &&
    typeof event.timestamp === "string" &&
    event.timestamp.length > 0
  );
}

export function classifyVisualizationLessonMountWrites({
  expectedGrade,
  expectedLessonSlug,
  writes,
}: {
  readonly expectedGrade: string;
  readonly expectedLessonSlug: string;
  readonly writes: readonly ObservedWrite[];
}): VisualizationLessonMountWriteVerdict {
  assertCanonicalIdentity(expectedGrade, "expectedGrade");
  assertCanonicalIdentity(expectedLessonSlug, "expectedLessonSlug");
  const allowed: VisualizationLessonAllowedMountWrite[] = [];
  const violations: VisualizationLessonMountWriteViolation[] = [];

  writes.forEach((write, index) => {
    const method = typeof write.method === "string" ? write.method.toUpperCase() : "";
    const pathname = typeof write.pathname === "string" ? write.pathname : "";
    const allow = (kind: VisualizationLessonAllowedMountWrite["kind"]) => {
      allowed.push({ index, kind, method, pathname });
    };
    const reject = (reason: string) => {
      violations.push({ index, method, pathname, reason });
    };

    if (!pathname.startsWith("/") || pathname.includes("?") || !method) {
      reject("malformed-request-receipt");
      return;
    }
    if (method === "GET" || method === "HEAD") {
      allow("safe-read");
      return;
    }
    if (method === "POST" && pathname === "/api/lesson-progress") {
      if (
        exactOwnStringKeys(write.body, ["action", "slug"]) &&
        (write.body as JsonRecord).action === "start" &&
        (write.body as JsonRecord).slug === expectedLessonSlug
      ) {
        allow("lesson-progress-start");
      } else {
        reject("lesson-progress-not-exact-start");
      }
      return;
    }
    if (method === "POST" && pathname === "/api/learning-events") {
      if (!validAnalyticsEnvelope(write.body)) {
        reject("malformed-learning-event-envelope");
        return;
      }
      const events = (write.body as JsonRecord).events as unknown[];
      if (events.length === 0) {
        allow("analytics-empty-handshake");
        return;
      }
      if (events.every((event) =>
        exactLessonPageView(event, expectedLessonSlug, expectedGrade))) {
        allow("lesson-page-view");
      } else {
        reject("learning-event-not-page-view");
      }
      return;
    }
    reject("mutation-not-allowed-before-first-control-interaction");
  });

  return deepFreeze({ allowed, ok: violations.length === 0, violations });
}

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

function scopeHasVisualizationEvidence(scope: VisualizationLessonAppStateScope) {
  return (
    scope.gamificationEvents.length > 0 ||
    scope.learningEvents.length > 0 ||
    scope.rewards.length > 0 ||
    scope.sessions.length > 0 ||
    scope.visualizationEvents.length > 0
  );
}

export function validateVisualizationLessonMountTerminalReceipt({
  expected,
  receipt,
}: {
  readonly expected: MountExpected;
  readonly receipt: MountReceipt;
}): VisualizationLessonMountTerminalVerdict {
  assertCanonicalIdentity(expected.grade, "grade");
  assertCanonicalIdentity(expected.lessonSlug, "lessonSlug");
  assertCanonicalIdentity(expected.moduleId, "moduleId");
  assertCanonicalIdentity(expected.selectedTopicId, "selectedTopicId");
  assertCanonicalIdentity(expected.userId, "userId");
  assertCanonicalIdentities(expected.siblingTopicIds, "siblingTopicIds");
  const derivedLessonSlug = lessonSlugForTopicId(expected.selectedTopicId);
  if (expected.lessonSlug !== derivedLessonSlug) {
    throw new TypeError(
      `lessonSlug must equal lessonSlugForTopicId(selectedTopicId); expected=${JSON.stringify(derivedLessonSlug)} actual=${JSON.stringify(expected.lessonSlug)}.`,
    );
  }
  const pending: string[] = [];
  const hardFailures: string[] = [];
  const writes = classifyVisualizationLessonMountWrites({
    expectedGrade: expected.grade,
    expectedLessonSlug: expected.lessonSlug,
    writes: receipt.writes,
  });
  const lessonStartWrites = writes.allowed.filter(
    (write) => write.kind === "lesson-progress-start",
  );
  const lessonPageViewWrites = writes.allowed.filter(
    (write) => write.kind === "lesson-page-view",
  );

  if (receipt.activeRoot.count === 0 || !receipt.activeRoot.visible) {
    pushUnique(pending, "active-root-not-mounted");
  } else if (receipt.activeRoot.count !== 1) {
    pushUnique(hardFailures, "active-root-count-not-one");
  } else if (
    receipt.activeRoot.activeLabId !== expected.selectedTopicId ||
    receipt.activeRoot.topicId !== expected.selectedTopicId ||
    receipt.activeRoot.moduleId !== expected.moduleId ||
    receipt.activeRoot.sessionOwner !== "first-control-interaction"
  ) {
    pushUnique(hardFailures, "active-root-identity-mismatch");
  }

  if (receipt.visibleEnabledControlKeys.length === 0) {
    pushUnique(pending, "learner-control-not-ready");
  } else if (
    new Set(receipt.visibleEnabledControlKeys).size !== receipt.visibleEnabledControlKeys.length ||
    receipt.visibleEnabledControlKeys.some((key) =>
      typeof key !== "string" || key.length === 0 || key.trim() !== key)
  ) {
    pushUnique(hardFailures, "learner-control-receipt-malformed");
  }

  if (
    lessonStartWrites.length > 1 ||
    (lessonStartWrites.length === 0 && receipt.lessonProgressStartAck !== null)
  ) {
    pushUnique(hardFailures, "lesson-progress-start-write-count-not-one");
  }
  if (receipt.lessonProgressStartAck === null) {
    pushUnique(pending, "lesson-progress-start-not-acknowledged");
  } else {
    let exactAck = false;
    try {
      const body = JSON.parse(receipt.lessonProgressStartAck.responseBytes) as unknown;
      const bodyRecord = isPlainRecord(body) ? body : null;
      exactAck =
        receipt.lessonProgressStartAck.method === "POST" &&
        receipt.lessonProgressStartAck.pathname === "/api/lesson-progress" &&
        receipt.lessonProgressStartAck.status === 200 &&
        Number.isSafeInteger(receipt.lessonProgressStartAck.writeIndex) &&
        lessonStartWrites.length === 1 &&
        receipt.lessonProgressStartAck.writeIndex === lessonStartWrites[0]?.index &&
        bodyRecord !== null &&
        exactOwnStringKeys(bodyRecord, ["lesson"]) &&
        isPlainRecord(bodyRecord.lesson) &&
        bodyRecord.lesson.slug === expected.lessonSlug &&
        bodyRecord.lesson.topicId === expected.selectedTopicId &&
        bodyRecord.lesson.status === "in-progress";
    } catch {
      exactAck = false;
    }
    if (!exactAck) pushUnique(hardFailures, "lesson-progress-start-ack-invalid");
  }

  if (
    lessonPageViewWrites.length > 1 ||
    (lessonPageViewWrites.length === 0 && receipt.lessonPageViewAck !== null)
  ) {
    pushUnique(hardFailures, "lesson-page-view-write-count-not-one");
  }
  if (receipt.lessonPageViewAck === null) {
    pushUnique(pending, "lesson-page-view-not-acknowledged");
  } else {
    let exactAck = false;
    try {
      const writeIndex = receipt.lessonPageViewAck.writeIndex;
      const write = receipt.writes[writeIndex];
      const writeBody = write?.body;
      const events = isPlainRecord(writeBody) && Array.isArray(writeBody.events)
        ? writeBody.events
        : [];
      const event = events[0];
      const eventId = isPlainRecord(event) && typeof event.id === "string"
        ? event.id
        : null;
      const generation = isPlainRecord(writeBody) ? writeBody.generation : null;
      const body = JSON.parse(receipt.lessonPageViewAck.responseBytes) as unknown;
      const bodyRecord = isPlainRecord(body) ? body : null;
      const dispositions = bodyRecord !== null && Array.isArray(bodyRecord.dispositions)
        ? bodyRecord.dispositions
        : [];
      exactAck =
        receipt.lessonPageViewAck.method === "POST" &&
        receipt.lessonPageViewAck.pathname === "/api/learning-events" &&
        receipt.lessonPageViewAck.status === 200 &&
        Number.isSafeInteger(writeIndex) &&
        lessonPageViewWrites.length === 1 &&
        writeIndex === lessonPageViewWrites[0]?.index &&
        events.length === 1 &&
        exactLessonPageView(event, expected.lessonSlug, expected.grade) &&
        bodyRecord !== null &&
        exactOwnStringKeys(bodyRecord, [
          "accepted",
          "acknowledgedEventIds",
          "acknowledgedUserId",
          "dispositions",
          "durablyPersisted",
          "generation",
        ]) &&
        bodyRecord.accepted === 1 &&
        Array.isArray(bodyRecord.acknowledgedEventIds) &&
        bodyRecord.acknowledgedEventIds.length === 1 &&
        bodyRecord.acknowledgedEventIds[0] === eventId &&
        bodyRecord.acknowledgedUserId === expected.userId &&
        bodyRecord.durablyPersisted === true &&
        bodyRecord.generation === generation &&
        dispositions.length === 1 &&
        exactOwnStringKeys(dispositions[0], ["disposition", "id"]) &&
        (dispositions[0] as JsonRecord).id === eventId &&
        (dispositions[0] as JsonRecord).disposition === "inserted";
    } catch {
      exactAck = false;
    }
    if (!exactAck) pushUnique(hardFailures, "lesson-page-view-ack-invalid");
  }

  if (receipt.inFlightRelevantWriteKeys.length > 0) {
    pushUnique(pending, "relevant-write-in-flight");
  }
  if (
    receipt.digest.stablePolls < 2 ||
    receipt.digest.current.length === 0 ||
    receipt.digest.current !== receipt.digest.previous
  ) {
    pushUnique(pending, "terminal-digest-not-stable");
  }

  if (!Number.isSafeInteger(receipt.dispatchedControlEventCount) || receipt.dispatchedControlEventCount < 0) {
    pushUnique(hardFailures, "control-event-count-malformed");
  } else if (receipt.dispatchedControlEventCount !== 0) {
    pushUnique(hardFailures, "control-event-before-terminal-mount");
  }
  if (
    receipt.outbox.sessionRecords.length > 0 ||
    receipt.outbox.visualizationRecords.length > 0
  ) {
    pushUnique(hardFailures, "mount-outbox-not-empty");
  }
  if (
    receipt.outbox.sessionDigestBefore !== receipt.outbox.sessionDigestAfter ||
    receipt.outbox.visualizationDigestBefore !== receipt.outbox.visualizationDigestAfter
  ) {
    pushUnique(hardFailures, "mount-outbox-mutated");
  }
  if (receipt.apiSessions.length !== 0) {
    pushUnique(hardFailures, "mount-api-session-not-empty");
  }

  const raw = receipt.raw;
  if (
    raw.userId !== expected.userId ||
    raw.moduleId !== expected.moduleId ||
    raw.selectedTopicId !== expected.selectedTopicId ||
    canonicalJson(raw.siblingTopicIds) !== canonicalJson(expected.siblingTopicIds)
  ) {
    pushUnique(hardFailures, "mount-raw-identity-mismatch");
  }
  if (raw.malformed.length > 0) {
    pushUnique(hardFailures, "mount-raw-malformed");
  }
  if (
    raw.selected.lessonProgress.length !== 1 ||
    raw.selected.lessonProgress[0]?.topicId !== expected.selectedTopicId ||
    raw.selected.lessonProgress[0]?.lessonSlug !== expected.lessonSlug ||
    raw.selected.lessonProgress[0]?.status !== "in-progress"
  ) {
    pushUnique(pending, "raw-lesson-progress-not-durable");
  }
  if (scopeHasVisualizationEvidence(raw.selected)) {
    pushUnique(hardFailures, "mount-selected-visualization-state-not-empty");
  }
  if (scopeHasVisualizationEvidence(raw.siblings)) {
    pushUnique(hardFailures, "mount-sibling-visualization-state-not-empty");
  }

  if (!writes.ok) pushUnique(hardFailures, "mount-write-allowlist-violation");

  return deepFreeze({
    hardFailures,
    pending,
    rawPayloadSha256: raw.payloadSha256,
    rawRevision: raw.revision,
    terminal: hardFailures.length === 0 && pending.length === 0,
    terminalDigest: receipt.digest.current,
  });
}

function parseEnvelope(envelope: SessionApiEnvelope, label: string) {
  if (!Number.isSafeInteger(envelope.status) || envelope.status !== 200) {
    throw new TypeError(`FIRST_INTERACTION_DURABILITY: ${label}-status is not exactly 200.`);
  }
  if (typeof envelope.responseBytes !== "string" || envelope.responseBytes.length === 0) {
    throw new TypeError(`FIRST_INTERACTION_DURABILITY: ${label}-response-bytes are missing.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(envelope.responseBytes);
  } catch (error) {
    throw new TypeError(`FIRST_INTERACTION_DURABILITY: ${label}-response-bytes are invalid JSON: ${String(error)}`);
  }
  if (canonicalJson(parsed) !== canonicalJson(envelope.body)) {
    throw new TypeError(`FIRST_INTERACTION_DURABILITY: ${label}-response body differs from exact bytes.`);
  }
  return parsed;
}

function exactSession(value: unknown, expected: FirstInteractionInput["expected"]): value is VisualizationLessonSessionEvidence {
  return (
    exactOwnStringKeys(value, [
      "completedAt",
      "explored",
      "moduleId",
      "source",
      "topicId",
      "updatedAt",
    ]) &&
    (value as JsonRecord).completedAt !== null &&
    isCanonicalIso((value as JsonRecord).completedAt) &&
    (value as JsonRecord).explored === true &&
    (value as JsonRecord).moduleId === expected.moduleId &&
    (value as JsonRecord).source === expected.source &&
    (value as JsonRecord).topicId === expected.selectedTopicId &&
    isCanonicalIso((value as JsonRecord).updatedAt)
  );
}

function assertNoSiblingDurability(raw: VisualizationLessonAppStateSnapshot) {
  if (raw.siblings.sessions.length > 0) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: sibling-session evidence is not isolated.");
  }
  if (raw.siblings.rewards.length > 0) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: sibling-reward evidence is not isolated.");
  }
  if (raw.siblings.gamificationEvents.length > 0) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: sibling-gamification evidence is not isolated.");
  }
  if (raw.siblings.learningEvents.length > 0 || raw.siblings.visualizationEvents.length > 0) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: sibling-event evidence is not isolated.");
  }
}

export function validateVisualizationLessonFirstInteraction(
  input: FirstInteractionInput,
): VisualizationLessonFirstInteractionReceipt {
  const expected = input.expected;
  assertCanonicalIdentity(expected.userId, "userId");
  assertCanonicalIdentity(expected.moduleId, "moduleId");
  assertCanonicalIdentity(expected.selectedTopicId, "selectedTopicId");
  assertCanonicalIdentity(expected.source, "source");
  assertCanonicalIdentities(expected.siblingTopicIds, "siblingTopicIds");

  if (
    input.request.method !== "POST" ||
    input.request.pathname !== "/api/visualization-sessions"
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: request target is not the exact session POST.");
  }
  if (
    !exactOwnStringKeys(input.request.body, ["moduleId", "source", "topicId"]) ||
    (input.request.body as JsonRecord).moduleId !== expected.moduleId ||
    (input.request.body as JsonRecord).source !== expected.source ||
    (input.request.body as JsonRecord).topicId !== expected.selectedTopicId
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: request-body is not the exact three-key identity.");
  }

  const response = parseEnvelope(input.response, "POST");
  if (
    !exactOwnStringKeys(response, ["acknowledgedUserId", "durablyPersisted", "session"]) ||
    (response as JsonRecord).acknowledgedUserId !== expected.userId ||
    (response as JsonRecord).durablyPersisted !== true ||
    !exactSession((response as JsonRecord).session, expected)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: exact durable POST acknowledgement is invalid.");
  }
  const responseSession = (response as JsonRecord).session as VisualizationLessonSessionEvidence;
  if (responseSession.completedAt !== responseSession.updatedAt) {
    throw new TypeError(
      "FIRST_INTERACTION_DURABILITY: first session completion timestamp must equal updatedAt.",
    );
  }

  const api = parseEnvelope(input.api, "GET");
  if (!exactOwnStringKeys(api, ["sessions"]) || !Array.isArray((api as JsonRecord).sessions)) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: API reread has no exact sessions array.");
  }
  const apiSessions = (api as JsonRecord).sessions as unknown[];
  if (
    apiSessions.length !== 1 ||
    !exactSession(apiSessions[0], expected) ||
    canonicalJson(apiSessions[0]) !== canonicalJson(responseSession)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: API reread is not the exact selected session.");
  }

  const raw = input.raw;
  if (
    raw.userId !== expected.userId ||
    raw.moduleId !== expected.moduleId ||
    raw.selectedTopicId !== expected.selectedTopicId ||
    canonicalJson(raw.siblingTopicIds) !== canonicalJson(expected.siblingTopicIds)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: raw app_state identity mismatch.");
  }
  if (raw.malformed.length > 0) {
    throw new TypeError(
      `FIRST_INTERACTION_DURABILITY: raw reward/session/event evidence is malformed (${raw.malformed.map((entry) => `${entry.collection}:${entry.reason}`).join(",")}).`,
    );
  }
  assertNoSiblingDurability(raw);
  if (
    raw.selected.sessions.length !== 1 ||
    canonicalJson(raw.selected.sessions[0]) !== canonicalJson(responseSession)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: raw selected session is not exact.");
  }
  if (
    raw.selected.lessonProgress.length !== 1 ||
    raw.selected.lessonProgress[0]?.topicId !== expected.selectedTopicId ||
    raw.selected.lessonProgress[0]?.lessonSlug !==
      lessonSlugForTopicId(expected.selectedTopicId) ||
    raw.selected.lessonProgress[0]?.status !== "in-progress"
  ) {
    throw new TypeError(
      "FIRST_INTERACTION_DURABILITY: selected lesson-progress is not the exact in-progress tuple.",
    );
  }
  if (
    raw.selected.learningEvents.length !== 0 ||
    raw.selected.visualizationEvents.length !== 0
  ) {
    throw new TypeError(
      "FIRST_INTERACTION_DURABILITY: selected-event stores must remain exactly empty for the session route.",
    );
  }

  const rewardSourceKey = visualizationRewardSourceKey(
    expected.userId,
    expected.moduleId,
    expected.selectedTopicId,
  );
  const reward = raw.selected.rewards[0];
  if (
    raw.selected.rewards.length !== 1 ||
    reward?.studentId !== expected.userId ||
    reward.sourceKey !== rewardSourceKey ||
    reward.reason !== "visualization-complete" ||
    reward.amount !== 20 ||
    !isCanonicalIso(reward.createdAt)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: reward tuple is not exact and unique.");
  }
  if (reward.createdAt !== responseSession.updatedAt) {
    throw new TypeError(
      "FIRST_INTERACTION_DURABILITY: reward timestamp does not match the first session write.",
    );
  }
  const gamification = raw.selected.gamificationEvents[0];
  if (
    raw.selected.gamificationEvents.length !== 1 ||
    gamification?.studentId !== expected.userId ||
    gamification.sourceKey !== rewardSourceKey ||
    gamification.source !== "visualization-complete" ||
    gamification.rewardPoints !== 20 ||
    gamification.xp !== 45 ||
    gamification.status !== "awarded" ||
    gamification.economyVersion !== "v1" ||
    !isCanonicalIso(gamification.createdAt)
  ) {
    throw new TypeError("FIRST_INTERACTION_DURABILITY: gamification tuple is not exact and unique.");
  }
  if (gamification.createdAt !== responseSession.updatedAt) {
    throw new TypeError(
      "FIRST_INTERACTION_DURABILITY: gamification timestamp does not match the first session write.",
    );
  }

  const receipt: VisualizationLessonFirstInteractionReceipt = {
    apiResponseBytes: input.api.responseBytes,
    apiResponseSha256: sha256(input.api.responseBytes),
    appStatePayloadSha256: raw.payloadSha256,
    appStateRevision: raw.revision,
    appStateUpdatedAt: raw.updatedAt,
    gamificationEventsSha256: evidenceSha256(raw.selected.gamificationEvents),
    gamificationRewardPoints: gamification.rewardPoints,
    gamificationXp: gamification.xp,
    learningEventsSha256: evidenceSha256(raw.selected.learningEvents),
    moduleId: expected.moduleId,
    requestBodySha256: evidenceSha256(input.request.body),
    responseBytes: input.response.responseBytes,
    responseSha256: sha256(input.response.responseBytes),
    rewardAmount: reward.amount,
    rewardsSha256: evidenceSha256(raw.selected.rewards),
    rewardSourceKey,
    selectedTopicId: expected.selectedTopicId,
    sessionSha256: evidenceSha256(responseSession),
    source: expected.source,
    userId: expected.userId,
    visualizationEventsSha256: evidenceSha256(raw.selected.visualizationEvents),
    visualizationSliceSha256: raw.visualizationSliceSha256,
  };
  return deepFreeze(receipt);
}

export function validateVisualizationLessonDuplicateReplay({
  first,
  replay,
}: {
  readonly first: VisualizationLessonFirstInteractionReceipt;
  readonly replay: VisualizationLessonFirstInteractionReceipt;
}): VisualizationLessonDuplicateReplayReceipt {
  const comparisons: ReadonlyArray<{
    label: string;
    left: unknown;
    right: unknown;
  }> = [
    { label: "identity", left: [first.userId, first.moduleId, first.selectedTopicId, first.source], right: [replay.userId, replay.moduleId, replay.selectedTopicId, replay.source] },
    { label: "app-state-revision", left: first.appStateRevision, right: replay.appStateRevision },
    { label: "app-state-updated-at", left: first.appStateUpdatedAt, right: replay.appStateUpdatedAt },
    { label: "app-state-payload-bytes", left: first.appStatePayloadSha256, right: replay.appStatePayloadSha256 },
    { label: "visualization-slice", left: first.visualizationSliceSha256, right: replay.visualizationSliceSha256 },
    { label: "request-body", left: first.requestBodySha256, right: replay.requestBodySha256 },
    { label: "response-bytes", left: first.responseBytes, right: replay.responseBytes },
    { label: "response-hash", left: first.responseSha256, right: replay.responseSha256 },
    { label: "api-response-bytes", left: first.apiResponseBytes, right: replay.apiResponseBytes },
    { label: "api-response-hash", left: first.apiResponseSha256, right: replay.apiResponseSha256 },
    { label: "session", left: first.sessionSha256, right: replay.sessionSha256 },
    { label: "reward", left: [first.rewardSourceKey, first.rewardAmount, first.rewardsSha256], right: [replay.rewardSourceKey, replay.rewardAmount, replay.rewardsSha256] },
    { label: "gamification-event", left: [first.gamificationRewardPoints, first.gamificationXp, first.gamificationEventsSha256], right: [replay.gamificationRewardPoints, replay.gamificationXp, replay.gamificationEventsSha256] },
    { label: "learning-events", left: first.learningEventsSha256, right: replay.learningEventsSha256 },
    { label: "visualization-events", left: first.visualizationEventsSha256, right: replay.visualizationEventsSha256 },
  ];
  for (const comparison of comparisons) {
    if (canonicalJson(comparison.left) !== canonicalJson(comparison.right)) {
      throw new TypeError(
        `DUPLICATE_REPLAY_NOT_IDEMPOTENT: ${comparison.label} changed between first delivery and replay.`,
      );
    }
  }
  return deepFreeze({
    appStateRevision: first.appStateRevision,
    idempotent: true as const,
    responseSha256: first.responseSha256,
    selectedTopicId: first.selectedTopicId,
    visualizationSliceSha256: first.visualizationSliceSha256,
  });
}

export class VisualizationLessonTerminalDeadlineError extends Error {
  readonly code = "VISUALIZATION_LESSON_TERMINAL_DEADLINE" as const;
  readonly deadlineMs: number;
  readonly lastReceipt: VisualizationLessonMountTerminalVerdict;

  constructor({
    deadlineMs,
    lastReceipt,
  }: {
    readonly deadlineMs: number;
    readonly lastReceipt: VisualizationLessonMountTerminalVerdict;
  }) {
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
      throw new TypeError("VISUALIZATION_LESSON_TERMINAL_DEADLINE requires a positive safe deadlineMs.");
    }
    const frozenReceipt = jsonCloneFrozen(
      lastReceipt,
      "VISUALIZATION_LESSON_TERMINAL_DEADLINE lastReceipt",
    );
    super(
      `${deadlineMs}ms deadline reached before visualization lesson mount became terminal; pending=${JSON.stringify(frozenReceipt.pending)} hardFailures=${JSON.stringify(frozenReceipt.hardFailures)}.`,
    );
    this.name = "VisualizationLessonTerminalDeadlineError";
    this.deadlineMs = deadlineMs;
    this.lastReceipt = frozenReceipt;
  }
}
