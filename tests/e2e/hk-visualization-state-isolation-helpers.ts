import {
  HK_VISUALIZATION_LESSON_CONTRACTS,
  type HKVisualizationLessonContract
} from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import {
  HK_VISUALIZATION_LAB_IDS,
  type HKVisualizationLabId
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { isValidLearningAnalyticsEventLog } from "../../lib/learningAnalytics";
import type { GradeId, LearningAnalyticsEventSource } from "../../types";

export const HK_VISUALIZATION_STATE_ISOLATION_SCHEMA_VERSION =
  "hk-viz-state-isolation.v1" as const;

export const HK_VISUALIZATION_LEARNING_EVENT_SOURCES = Object.freeze([
  "visualization-lab",
  "function-graph",
  "function-model",
  "geometry",
  "probability",
  "coordinate-plane",
  "trig-wave",
  "calculus-stats"
] as const satisfies readonly LearningAnalyticsEventSource[]);

const hkVisualizationLearningEventSourceSet = new Set<LearningAnalyticsEventSource>(
  HK_VISUALIZATION_LEARNING_EVENT_SOURCES
);

export const HK_VISUALIZATION_RENDER_ONLY_WRITE_API_FAMILIES = Object.freeze([
  "/api/visualization-sessions",
  "/api/gamification",
  "/api/rewards",
  "/api/teacher/gamification",
  "/api/teacher/rewards",
  "/api/teacher/reward-awards"
] as const);

function isApiFamilyPath(pathname: string, family: string) {
  return pathname === family || pathname.startsWith(`${family}/`);
}

export const HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS = Object.freeze([
  "identities-square-patterns",
  "arc-length-sector-area"
] as const);

export const HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS = Object.freeze({
  auth: "auth/disposable-hk-student",
  getAnalyticsAfterDuplicate: "get/analytics-after-a-duplicate",
  getAnalyticsBeforeDuplicate: "get/analytics-before-a-duplicate",
  getAfterADuplicate: "get/pair-after-a-duplicate",
  getAfterAUpdate: "get/pair-after-a-update",
  getBeforeUpdate: "get/pair-before-update",
  getGamificationAfterDuplicate: "get/gamification-after-a-duplicate",
  getGamificationBeforeDuplicate: "get/gamification-before-a-duplicate",
  postADuplicate: "post/identities-square-patterns/second-idempotent-repeat",
  postAInitial: "post/identities-square-patterns/initial",
  postAUpdate: "post/identities-square-patterns/first-idempotent-repeat",
  postBInitial: "post/arc-length-sector-area/initial"
} as const);

export type HkVisualizationStateIsolationTopicId =
  (typeof HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS)[number];

export type HkVisualizationSessionRecord = {
  completedAt: string | null;
  explored: boolean;
  moduleId: string;
  source: string;
  topicId: string;
  updatedAt: string | null;
};

export type HkVisualizationSessionSnapshot = {
  bodyReadable: boolean;
  invalidRecordCount: number;
  invalidRecordIndexes: number[];
  rawRecordCount: number | null;
  records: HkVisualizationSessionRecord[];
};

export type HkVisualizationStateIsolationExchange = {
  body: unknown;
  method: "GET" | "POST";
  ok: boolean;
  ownerHeaderUserId?: string;
  request?: Readonly<{
    moduleId: "configured-visualization-lab";
    source: LearningAnalyticsEventSource;
    topicId: HkVisualizationStateIsolationTopicId;
  }>;
  status: number;
  stepId: string;
};

export type HkVisualizationStateIsolationEvidence = {
  contract: {
    authenticatedDisposableHkStudent: boolean;
    exactOwnerBoundPostAcknowledgements: boolean;
    exactPostRecords: boolean;
    exactRawGetRecordCounts: boolean;
    exactResetModuleTopicSelectors: boolean;
    exactTwoTopicRecordsOnEveryGet: boolean;
    duplicateWriteNoSecondEventOrReward: boolean;
    duplicateWritePreservedTopicACompletion: boolean;
    idempotentSameTripleNoDuplicate: boolean;
    noInvalidRawGetRecords: boolean;
    noDuplicateTopicRecords: boolean;
    noNumericStatePayload: boolean;
    noUnexpectedSharedModuleRecords: boolean;
    sharedModuleDistinctTopics: boolean;
    topicAStableAfterCompletedRepost: boolean;
    topicBStableAfterTopicAReposts: boolean;
  };
  exchanges: HkVisualizationStateIsolationExchange[];
  failures: string[];
  generatedAt: string;
  ledger: {
    duplicateStepIds: string[];
    executedStepIds: string[];
    missingStepIds: string[];
    plannedStepIds: string[];
  };
  observed: {
    duplicateTopicIds: string[];
    getSnapshots: {
      afterADuplicate: HkVisualizationSessionRecord[];
      afterAUpdate: HkVisualizationSessionRecord[];
      beforeUpdate: HkVisualizationSessionRecord[];
    };
    getSnapshotDiagnostics: {
      afterADuplicate: HkVisualizationSessionSnapshot;
      afterAUpdate: HkVisualizationSessionSnapshot;
      beforeUpdate: HkVisualizationSessionSnapshot;
    };
    duplicateSideEffects: {
      after: HkVisualizationRenderNoWriteSnapshot;
      before: HkVisualizationRenderNoWriteSnapshot;
    };
    missingTopicIds: HkVisualizationStateIsolationTopicId[];
    postRecords: Array<HkVisualizationSessionRecord | null>;
    unexpectedTopicIds: string[];
  };
  plan: HkVisualizationStateIsolationPlan;
  schemaVersion: typeof HK_VISUALIZATION_STATE_ISOLATION_SCHEMA_VERSION;
  status: "failed" | "passed";
};

export type HkVisualizationStateIsolationPlan = Readonly<{
  expectedRecordCount: 2;
  moduleId: "configured-visualization-lab";
  steps: readonly string[];
  topics: readonly Readonly<{
    analyticsSource: LearningAnalyticsEventSource;
    grade: GradeId;
    moduleId: "configured-visualization-lab";
    resetSelector: string;
    stateSelector: string;
    topicId: HkVisualizationStateIsolationTopicId;
  }>[];
}>;

const stateIsolationContracts = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS.map(
  (topicId) => HK_VISUALIZATION_LESSON_CONTRACTS[topicId]
);

export type HkVisualizationPersistenceTopicPlan = Readonly<{
  analyticsSource: LearningAnalyticsEventSource;
  grade: GradeId;
  moduleId: "configured-visualization-lab";
  resetSelector: string;
  stateSelector: string;
  topicId: HKVisualizationLabId;
}>;

function persistenceTopicPlan(
  contract: HKVisualizationLessonContract
): HkVisualizationPersistenceTopicPlan {
  const lab = getVisualizationLabByLabId(contract.topicId);
  if (
    !lab
    || lab.curriculumTrack !== "HK"
    || lab.labId !== contract.topicId
    || lab.topicId !== contract.topicId
    || lab.grade !== contract.grade
    || lab.moduleId !== "configured-visualization-lab"
    || contract.moduleId !== "configured-visualization-lab"
  ) {
    throw new Error(
      `HK visualization persistence plan is not catalog-exact for ${contract.topicId}.`
    );
  }

  return Object.freeze({
    analyticsSource: lab.analyticsSource,
    grade: lab.grade,
    moduleId: contract.moduleId,
    resetSelector: contract.selectors.reset,
    stateSelector: contract.selectors.state,
    topicId: contract.topicId
  });
}

export const HK_VISUALIZATION_STATE_ISOLATION_PLAN = Object.freeze({
  expectedRecordCount: 2,
  moduleId: "configured-visualization-lab",
  steps: Object.freeze([
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.auth,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAInitial,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postBInitial,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getBeforeUpdate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAUpdate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsBeforeDuplicate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationBeforeDuplicate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postADuplicate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsAfterDuplicate,
    HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationAfterDuplicate
  ]),
  topics: Object.freeze(stateIsolationContracts.map((contract) => Object.freeze({
    ...persistenceTopicPlan(contract),
    topicId: contract.topicId as HkVisualizationStateIsolationTopicId
  })))
} as const satisfies HkVisualizationStateIsolationPlan);

export const HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN = Object.freeze({
  expectedRecordCount: 51,
  legacyAndNewTopicIds: Object.freeze([
    "quadratic-patterns",
    "circles",
    "identities-square-patterns",
    "arc-length-sector-area"
  ] as const),
  moduleId: "configured-visualization-lab",
  topics: Object.freeze(HK_VISUALIZATION_LAB_IDS.map((topicId) =>
    persistenceTopicPlan(HK_VISUALIZATION_LESSON_CONTRACTS[topicId])
  ))
} as const);

export const HK_VISUALIZATION_GRADE_SCOPE_IDS = Object.freeze([
  "P1", "P2", "P3", "P4", "P5", "P6",
  "S1", "S2", "S3", "S4", "S5", "S6"
] as const satisfies readonly GradeId[]);

export type HkVisualizationAllTopicsPostObservation = Readonly<{
  body: unknown;
  ok: boolean;
  ownerHeaderUserId: string;
  request: Readonly<{
    moduleId: "configured-visualization-lab";
    source: LearningAnalyticsEventSource;
    topicId: HKVisualizationLabId;
  }>;
  status: number;
}>;

export type HkVisualizationGradeScopeInput = Readonly<{
  authenticatedGradeMatchedHkStudent: boolean;
  beforeSessionsBody: unknown;
  executedTopicIds: readonly string[];
  finalSessionsBody: unknown;
  grade: GradeId;
  ownerUserId: string;
  postResults: readonly HkVisualizationAllTopicsPostObservation[];
}>;

export type HkVisualizationAllTopicsStateEvidence = {
  contract: {
    exact12GradeMatchedOwnerScopes: boolean;
    exact51DistinctTriples: boolean;
    exactCatalogExploredRecordShape: boolean;
    exactCatalogSourcePerTopic: boolean;
    exactEmptyBeforeGetPerOwner: boolean;
    exactOwnerBoundPostAcknowledgements: boolean;
    exactPerGradeRawGetCounts: boolean;
    exactRawGetRecordCount: boolean;
    exactRegistryTopicSet: boolean;
    legacyAndNewIdsAreFourSeparateRecords: boolean;
    noInvalidRawGetRecords: boolean;
    noDuplicateTriples: boolean;
    noUnexpectedTriples: boolean;
  };
  failures: string[];
  ledger: {
    duplicateCellIds: string[];
    executedCellIds: string[];
    missingCellIds: string[];
    plannedCellIds: string[];
  };
  observed: {
    duplicateTopicIds: string[];
    duplicateTripleIds: string[];
    gradeRawRecordCounts: Partial<Record<GradeId, number | null>>;
    invalidRecordCount: number;
    invalidRecordIndexes: number[];
    missingTopicIds: HKVisualizationLabId[];
    ownerScopeCount: number;
    rawRecordCount: number | null;
    records: HkVisualizationSessionRecord[];
    unexpectedTopicIds: string[];
  };
  plan: typeof HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN;
  status: "failed" | "passed";
};

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestampOrNull(value: unknown): value is string | null {
  return value === null
    || (typeof value === "string"
      && value.trim().length > 0
      && Number.isFinite(Date.parse(value)));
}

function sessionRecord(value: unknown): HkVisualizationSessionRecord | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.moduleId !== "string" || value.moduleId.trim().length === 0
    || typeof value.topicId !== "string" || value.topicId.trim().length === 0
    || typeof value.source !== "string" || value.source.trim().length === 0
    || typeof value.explored !== "boolean"
    || !Object.prototype.hasOwnProperty.call(value, "completedAt")
    || !Object.prototype.hasOwnProperty.call(value, "updatedAt")
    || !isIsoTimestampOrNull(value.completedAt)
    || !isIsoTimestampOrNull(value.updatedAt)
  ) return null;

  return {
    completedAt: value.completedAt,
    explored: value.explored,
    moduleId: value.moduleId,
    source: value.source,
    topicId: value.topicId,
    updatedAt: value.updatedAt
  };
}

export function hkVisualizationSessionRecordFromPostBody(body: unknown) {
  if (!isRecord(body)) return null;
  return sessionRecord(body.session);
}

export function hkVisualizationPersistenceTopicForId(topicId: string) {
  return HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.find(
    (topic) => topic.topicId === topicId
  ) ?? null;
}

export function isExactHkExploredVisualizationSession(
  session: HkVisualizationSessionRecord | null,
  topicId?: string
) {
  const expected = topicId
    ? hkVisualizationPersistenceTopicForId(topicId)
    : session
      ? hkVisualizationPersistenceTopicForId(session.topicId)
      : null;
  return session !== null
    && expected !== null
    && session.moduleId === expected.moduleId
    && session.topicId === expected.topicId
    && session.source === expected.analyticsSource
    && session.explored === true
    && typeof session.completedAt === "string"
    && typeof session.updatedAt === "string";
}

export function isExactHkVisualizationSessionAcknowledgement(
  body: unknown,
  ownerUserId: string,
  topicId: string
) {
  if (!isRecord(body)) return false;
  const keys = Object.keys(body).sort();
  return keys.length === 3
    && keys[0] === "acknowledgedUserId"
    && keys[1] === "durablyPersisted"
    && keys[2] === "session"
    && body.acknowledgedUserId === ownerUserId
    && body.durablyPersisted === true
    && isExactHkExploredVisualizationSession(
      hkVisualizationSessionRecordFromPostBody(body),
      topicId
    );
}

function postSession(exchange: HkVisualizationStateIsolationExchange) {
  return hkVisualizationSessionRecordFromPostBody(exchange.body);
}

export function hkVisualizationSessionSnapshotFromBody(
  body: unknown
): HkVisualizationSessionSnapshot {
  if (!isRecord(body) || !Array.isArray(body.sessions)) {
    return {
      bodyReadable: false,
      invalidRecordCount: 0,
      invalidRecordIndexes: [],
      rawRecordCount: null,
      records: []
    };
  }

  const parsed = body.sessions.map(sessionRecord);
  const invalidRecordIndexes = parsed.flatMap((record, index) => record === null ? [index] : []);
  return {
    bodyReadable: true,
    invalidRecordCount: invalidRecordIndexes.length,
    invalidRecordIndexes,
    rawRecordCount: body.sessions.length,
    records: parsed.filter((record): record is HkVisualizationSessionRecord => record !== null)
  };
}

export function hkVisualizationSessionRecordsFromBody(body: unknown) {
  return hkVisualizationSessionSnapshotFromBody(body).records;
}

function listedSessionSnapshot(exchange: HkVisualizationStateIsolationExchange | undefined) {
  return hkVisualizationSessionSnapshotFromBody(exchange?.body);
}

function selectorContractExact(contract: HKVisualizationLessonContract) {
  return contract.moduleId === "configured-visualization-lab"
    && contract.topicId === contract.labId
    && contract.selectors.state.trim().length > 0
    && contract.selectors.reset.includes(
      '[data-viz-reset-module-id="configured-visualization-lab"]'
    )
    && contract.selectors.reset.includes(
      `[data-viz-reset-topic-id="${contract.topicId}"]`
    );
}

export function buildHkVisualizationStateIsolationEvidence(args: {
  authenticatedDisposableHkStudent: boolean;
  authenticatedUserId: string;
  exchanges: HkVisualizationStateIsolationExchange[];
  generatedAt?: string;
}): HkVisualizationStateIsolationEvidence {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const plannedStepIds = [...HK_VISUALIZATION_STATE_ISOLATION_PLAN.steps];
  const executedStepIds = args.exchanges.map((exchange) => exchange.stepId);
  const executedStepIdSet = new Set(executedStepIds);
  const missingStepIds = plannedStepIds.filter((stepId) => !executedStepIdSet.has(stepId));
  const duplicateStepIds = duplicateValues(executedStepIds);
  const postSteps = [
    { stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAInitial, topicId: HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0] },
    { stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postBInitial, topicId: HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1] },
    { stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postAUpdate, topicId: HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0] },
    { stepId: HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.postADuplicate, topicId: HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0] }
  ] as const;
  const postRecords = postSteps.map(({ stepId }) => {
    const exchange = args.exchanges.find((candidate) => candidate.stepId === stepId);
    return exchange ? postSession(exchange) : null;
  });
  const snapshotForStep = (stepId: string) => listedSessionSnapshot(
    args.exchanges.find((candidate) => candidate.stepId === stepId)
  );
  const getSnapshotDiagnostics = {
    beforeUpdate: snapshotForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getBeforeUpdate),
    afterAUpdate: snapshotForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate),
    afterADuplicate: snapshotForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate)
  };
  const getSnapshots = {
    beforeUpdate: getSnapshotDiagnostics.beforeUpdate.records,
    afterAUpdate: getSnapshotDiagnostics.afterAUpdate.records,
    afterADuplicate: getSnapshotDiagnostics.afterADuplicate.records
  };
  const bodyForStep = (stepId: string) => args.exchanges.find(
    (candidate) => candidate.stepId === stepId
  )?.body;
  const duplicateSideEffects = {
    before: buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsBeforeDuplicate),
      rewardsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationBeforeDuplicate),
      sessionsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterAUpdate)
    }),
    after: buildHkVisualizationRenderNoWriteSnapshot({
      analyticsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAnalyticsAfterDuplicate),
      rewardsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getGamificationAfterDuplicate),
      sessionsBody: bodyForStep(HK_VISUALIZATION_STATE_ISOLATION_STEP_IDS.getAfterADuplicate)
    })
  };
  const allSnapshots = Object.entries(getSnapshots);
  const allSnapshotDiagnostics = Object.entries(getSnapshotDiagnostics);
  const listedSharedModuleRecords = getSnapshots.afterADuplicate;
  const expectedTopicIds = new Set<string>(HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS);
  const listedTopicIds = listedSharedModuleRecords.map((session) => session.topicId);
  const listedTopicIdSet = new Set(listedTopicIds);
  const missingTopicIds = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS.filter(
    (topicId) => !listedTopicIdSet.has(topicId)
  );
  const unexpectedTopicIds = [...listedTopicIdSet]
    .filter((topicId) => !expectedTopicIds.has(topicId))
    .sort();
  const duplicateTopicIds = duplicateValues(listedTopicIds);

  const sharedModuleDistinctTopics = new Set(stateIsolationContracts.map((contract) => contract.moduleId)).size === 1
    && new Set(stateIsolationContracts.map((contract) => contract.topicId)).size === 2;
  const exactResetModuleTopicSelectors = stateIsolationContracts.every(selectorContractExact);
  const noNumericStatePayload = args.exchanges
    .filter((exchange) => exchange.method === "POST")
    .every((exchange) => {
      const request = exchange.request;
      if (!request) return false;
      return Object.keys(request).every(
        (key) => key === "moduleId" || key === "topicId" || key === "source"
      );
    });
  const exactOwnerBoundPostAcknowledgements = postSteps.every(({ stepId, topicId }) => {
    const exchange = args.exchanges.find((candidate) => candidate.stepId === stepId);
    const expected = hkVisualizationPersistenceTopicForId(topicId);
    return Boolean(
      args.authenticatedUserId.trim().length > 0
      && exchange
      && expected
      && exchange.ownerHeaderUserId === args.authenticatedUserId
      && exchange.request?.moduleId === expected.moduleId
      && exchange.request.topicId === expected.topicId
      && exchange.request.source === expected.analyticsSource
      && isExactHkVisualizationSessionAcknowledgement(
        exchange.body,
        args.authenticatedUserId,
        topicId
      )
    );
  });
  const exactPostRecords = postRecords.every((session, index) =>
    isExactHkExploredVisualizationSession(session, postSteps[index].topicId)
  );
  const exactPair = (records: HkVisualizationSessionRecord[]) => records.length === 2
    && new Set(records.map((session) => session.topicId)).size === 2
    && records.every((session) =>
      session.moduleId === HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId
      && expectedTopicIds.has(session.topicId)
      && isExactHkExploredVisualizationSession(session, session.topicId)
    );
  const noInvalidRawGetRecords = allSnapshotDiagnostics.every(([, snapshot]) =>
    snapshot.bodyReadable && snapshot.invalidRecordCount === 0
  );
  const exactRawGetRecordCounts = allSnapshotDiagnostics.every(([, snapshot]) =>
    snapshot.rawRecordCount === HK_VISUALIZATION_STATE_ISOLATION_PLAN.expectedRecordCount
  );
  const exactTwoTopicRecordsOnEveryGet = allSnapshots.every(([, records]) => exactPair(records))
    && noInvalidRawGetRecords
    && exactRawGetRecordCounts;
  const noUnexpectedSharedModuleRecords = allSnapshots.every(([, records]) =>
    records.every((session) =>
      session.moduleId === HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId
      && expectedTopicIds.has(session.topicId)
    )
  );
  const unexpectedSharedModuleRecords = allSnapshots.flatMap(([snapshotId, records]) =>
    records
      .filter((session) =>
        session.moduleId !== HK_VISUALIZATION_STATE_ISOLATION_PLAN.moduleId
        || !expectedTopicIds.has(session.topicId)
      )
      .map((session) => `${snapshotId}:${session.moduleId}/${session.topicId}`)
  );
  const noDuplicateTopicRecords = allSnapshots.every(([, records]) =>
    duplicateValues(records.map((session) => session.topicId)).length === 0
  );
  const topicB = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[1];
  const topicBRecord = (records: HkVisualizationSessionRecord[]) =>
    records.find((session) => session.topicId === topicB) ?? null;
  const topicBBefore = topicBRecord(getSnapshots.beforeUpdate);
  const topicBStableAfterTopicAReposts = topicBBefore !== null
    && JSON.stringify(topicBBefore) === JSON.stringify(topicBRecord(getSnapshots.afterAUpdate))
    && JSON.stringify(topicBBefore) === JSON.stringify(topicBRecord(getSnapshots.afterADuplicate));
  const topicA = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS[0];
  const topicARecord = (records: HkVisualizationSessionRecord[]) =>
    records.find((session) => session.topicId === topicA) ?? null;
  const topicABefore = topicARecord(getSnapshots.beforeUpdate);
  const topicAAfterUpdate = topicARecord(getSnapshots.afterAUpdate);
  const topicAStableAfterCompletedRepost = topicABefore !== null
    && topicAAfterUpdate !== null
    && JSON.stringify(topicABefore) === JSON.stringify(topicAAfterUpdate);
  const topicAAfterDuplicate = topicARecord(getSnapshots.afterADuplicate);
  const idempotentSameTripleNoDuplicate = getSnapshots.afterADuplicate.filter(
    (session) => session.topicId === topicA
  ).length === 1
    && topicAAfterUpdate !== null
    && topicAAfterDuplicate !== null
    && JSON.stringify(topicAAfterUpdate) === JSON.stringify(topicAAfterDuplicate);
  const duplicateWritePreservedTopicACompletion = topicAAfterUpdate !== null
    && topicAAfterDuplicate !== null
    && topicAAfterUpdate.completedAt === topicAAfterDuplicate.completedAt;
  const duplicateSideEffectsReadable = duplicateSideEffects.before.readable.analytics
    && duplicateSideEffects.before.readable.rewards
    && duplicateSideEffects.before.readable.sessions
    && duplicateSideEffects.after.readable.analytics
    && duplicateSideEffects.after.readable.rewards
    && duplicateSideEffects.after.readable.sessions;
  const duplicateWriteNoSecondEventOrReward = duplicateSideEffectsReadable
    && duplicateSideEffects.before.visualizationEventCount
      === duplicateSideEffects.after.visualizationEventCount
    && canonicalJson(duplicateSideEffects.before.rewardState)
      === canonicalJson(duplicateSideEffects.after.rewardState);

  const contract = {
    authenticatedDisposableHkStudent: args.authenticatedDisposableHkStudent,
    exactOwnerBoundPostAcknowledgements,
    exactPostRecords,
    exactRawGetRecordCounts,
    exactResetModuleTopicSelectors,
    exactTwoTopicRecordsOnEveryGet,
    duplicateWriteNoSecondEventOrReward,
    duplicateWritePreservedTopicACompletion,
    idempotentSameTripleNoDuplicate,
    noInvalidRawGetRecords,
    noDuplicateTopicRecords,
    noNumericStatePayload,
    noUnexpectedSharedModuleRecords,
    sharedModuleDistinctTopics,
    topicAStableAfterCompletedRepost,
    topicBStableAfterTopicAReposts
  };
  const failures: string[] = [];
  if (!contract.authenticatedDisposableHkStudent) failures.push("disposable-hk-student-authentication-not-proven");
  if (!contract.sharedModuleDistinctTopics) failures.push("plan-must-use-one-module-with-two-distinct-topic-ids");
  if (!contract.exactResetModuleTopicSelectors) failures.push("reset-or-state-selector-contract-drift");
  if (!contract.noNumericStatePayload) failures.push("numeric-or-extra-state-payload-was-sent");
  if (!contract.exactOwnerBoundPostAcknowledgements) {
    failures.push("post-owner-header-or-durable-acknowledgement-was-not-exact");
  }
  if (missingStepIds.length > 0) failures.push(`missing-steps=[${missingStepIds.join(", ")}]`);
  if (duplicateStepIds.length > 0) failures.push(`duplicate-steps=[${duplicateStepIds.join(", ")}]`);
  for (const exchange of args.exchanges) {
    if (!exchange.ok) failures.push(`${exchange.stepId}-http-status=${exchange.status}`);
  }
  if (!contract.exactPostRecords) failures.push("post-responses-did-not-preserve-exact-module-topic-pairs");
  for (const [snapshotId, snapshot] of allSnapshotDiagnostics) {
    if (!snapshot.bodyReadable) failures.push(`raw-get-body-unreadable snapshot=${snapshotId}`);
    if (snapshot.invalidRecordCount > 0) {
      failures.push(
        `invalid-raw-get-records snapshot=${snapshotId} count=${snapshot.invalidRecordCount} `
        + `indexes=[${snapshot.invalidRecordIndexes.join(", ")}]`
      );
    }
    if (snapshot.rawRecordCount !== HK_VISUALIZATION_STATE_ISOLATION_PLAN.expectedRecordCount) {
      failures.push(
        `raw-get-record-count snapshot=${snapshotId} expected=${HK_VISUALIZATION_STATE_ISOLATION_PLAN.expectedRecordCount} `
        + `actual=${snapshot.rawRecordCount ?? "unreadable"}`
      );
    }
  }
  if (!contract.exactTwoTopicRecordsOnEveryGet) {
    for (const [snapshotId, records] of allSnapshots) {
      if (exactPair(records)) continue;
      const snapshotTopicIds = new Set(records.map((session) => session.topicId));
      const snapshotMissingTopicIds = HK_VISUALIZATION_STATE_ISOLATION_TOPIC_IDS.filter(
        (topicId) => !snapshotTopicIds.has(topicId)
      );
      failures.push(
        `shared-module-topic-isolation snapshot=${snapshotId} expected=2 actual=${records.length} `
        + `missingTopicIds=[${snapshotMissingTopicIds.join(", ")}]`
      );
    }
  }
  if (!contract.topicAStableAfterCompletedRepost) {
    failures.push("completed-topic-a-changed-after-idempotent-repost");
  }
  if (!contract.topicBStableAfterTopicAReposts) failures.push("topic-b-changed-while-reposting-topic-a");
  if (!contract.idempotentSameTripleNoDuplicate) failures.push("duplicate-write-created-more-than-one-topic-a-row");
  if (!contract.duplicateWritePreservedTopicACompletion) {
    failures.push("duplicate-write-recreated-topic-a-completion");
  }
  if (!contract.duplicateWriteNoSecondEventOrReward) {
    failures.push("duplicate-write-created-a-second-visualization-event-or-reward");
  }
  if (!contract.noUnexpectedSharedModuleRecords) {
    failures.push(`unexpected-get-records=[${unexpectedSharedModuleRecords.join(", ")}]`);
  }
  if (!contract.noDuplicateTopicRecords) {
    failures.push(`duplicate-shared-module-topic-ids=[${duplicateTopicIds.join(", ")}]`);
  }

  return {
    contract,
    exchanges: args.exchanges,
    failures,
    generatedAt,
    ledger: { duplicateStepIds, executedStepIds, missingStepIds, plannedStepIds },
    observed: {
      duplicateTopicIds,
      duplicateSideEffects,
      getSnapshots,
      getSnapshotDiagnostics,
      missingTopicIds,
      postRecords,
      unexpectedTopicIds
    },
    plan: HK_VISUALIZATION_STATE_ISOLATION_PLAN,
    schemaVersion: HK_VISUALIZATION_STATE_ISOLATION_SCHEMA_VERSION,
    status: failures.length === 0 ? "passed" : "failed"
  };
}

export function assertHkVisualizationStateIsolation(
  evidence: HkVisualizationStateIsolationEvidence
) {
  if (evidence.status === "passed") return;

  throw new Error(
    "HK visualization state isolation hard gate failed: the same moduleId must retain "
    + "two topic-scoped records and must never overwrite or misattach one topic's state to another.\n"
    + evidence.failures.map((failure) => `- ${failure}`).join("\n")
  );
}

export function buildHkVisualizationAllTopicsStateEvidence(args: {
  gradeScopes: readonly HkVisualizationGradeScopeInput[];
}): HkVisualizationAllTopicsStateEvidence {
  const expectedTopicIds = new Set<string>(HK_VISUALIZATION_LAB_IDS);
  const expectedGradeIds = new Set<GradeId>(HK_VISUALIZATION_GRADE_SCOPE_IDS);
  const topicPlanById = new Map(
    HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.map((topic) => [topic.topicId, topic])
  );
  const expectedTopicsForGrade = (grade: GradeId) =>
    HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.topics.filter((topic) => topic.grade === grade);
  const scopes = [...args.gradeScopes];
  const scopeGradeIds = scopes.map((scope) => scope.grade);
  const duplicateGradeIds = duplicateValues(scopeGradeIds);
  const duplicateOwnerIds = duplicateValues(scopes.map((scope) => scope.ownerUserId));
  const scopeSnapshots = scopes.map((scope) => ({
    before: hkVisualizationSessionSnapshotFromBody(scope.beforeSessionsBody),
    final: hkVisualizationSessionSnapshotFromBody(scope.finalSessionsBody),
    scope
  }));
  const ownedRows = scopeSnapshots.flatMap(({ final, scope }) =>
    final.records.map((session) => ({
      grade: scope.grade,
      ownerUserId: scope.ownerUserId,
      session
    }))
  );
  const records = ownedRows.map((row) => row.session);
  const recordTopicIds = records.map((session) => session.topicId);
  const recordTopicIdSet = new Set(recordTopicIds);
  const missingTopicIds = HK_VISUALIZATION_LAB_IDS.filter(
    (topicId) => !recordTopicIdSet.has(topicId)
  );
  const unexpectedTopicIds = [...recordTopicIdSet]
    .filter((topicId) => !expectedTopicIds.has(topicId))
    .sort();
  const duplicateTopicIds = duplicateValues(recordTopicIds);
  const ownedTripleKeys = ownedRows.map(({ ownerUserId, session }) =>
    JSON.stringify([ownerUserId, session.moduleId, session.topicId])
  );
  const duplicateOwnedTripleKeys = new Set(duplicateValues(ownedTripleKeys));
  const duplicateTripleIds = ownedRows
    .filter(({ ownerUserId, session }) => duplicateOwnedTripleKeys.has(
      JSON.stringify([ownerUserId, session.moduleId, session.topicId])
    ))
    .map(({ grade, session }) => `${grade}/${session.moduleId}/${session.topicId}`)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
  const plannedCellIds = HK_VISUALIZATION_LAB_IDS.map((topicId) => `post/${topicId}`);
  const executedCellIds = scopes.flatMap((scope) => scope.executedTopicIds)
    .map((topicId) => `post/${topicId}`);
  const executedCellIdSet = new Set(executedCellIds);
  const missingCellIds = plannedCellIds.filter((cellId) => !executedCellIdSet.has(cellId));
  const duplicateCellIds = duplicateValues(executedCellIds);
  const legacyAndNewRecords = HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.legacyAndNewTopicIds.map(
    (topicId) => records.filter((session) => session.topicId === topicId)
  );
  const gradeRawRecordCounts: Partial<Record<GradeId, number | null>> = {};
  for (const { final, scope } of scopeSnapshots) {
    gradeRawRecordCounts[scope.grade] = final.rawRecordCount;
  }
  const allFinalBodiesReadable = scopeSnapshots.every(({ final }) => final.bodyReadable);
  const allBeforeBodiesReadable = scopeSnapshots.every(({ before }) => before.bodyReadable);
  const invalidRecordCount = scopeSnapshots.reduce(
    (total, { before, final }) => total + before.invalidRecordCount + final.invalidRecordCount,
    0
  );
  const invalidRecordIndexes: number[] = [];
  let rawOffset = 0;
  for (const { final } of scopeSnapshots) {
    invalidRecordIndexes.push(...final.invalidRecordIndexes.map((index) => rawOffset + index));
    rawOffset += final.rawRecordCount ?? final.records.length;
  }
  const rawRecordCount = allFinalBodiesReadable
    ? scopeSnapshots.reduce((total, { final }) => total + (final.rawRecordCount ?? 0), 0)
    : null;

  const exact12GradeMatchedOwnerScopes = scopes.length === HK_VISUALIZATION_GRADE_SCOPE_IDS.length
    && duplicateGradeIds.length === 0
    && duplicateOwnerIds.length === 0
    && scopes.every((scope) =>
      expectedGradeIds.has(scope.grade)
      && scope.authenticatedGradeMatchedHkStudent
      && scope.ownerUserId.trim().length > 0
    )
    && HK_VISUALIZATION_GRADE_SCOPE_IDS.every((grade) => scopeGradeIds.includes(grade));
  const exactEmptyBeforeGetPerOwner = allBeforeBodiesReadable
    && scopeSnapshots.every(({ before }) =>
      before.invalidRecordCount === 0 && before.rawRecordCount === 0 && before.records.length === 0
    );
  const exactPerGradeRawGetCounts = allFinalBodiesReadable
    && scopeSnapshots.every(({ final, scope }) => {
      const expected = expectedTopicsForGrade(scope.grade);
      const expectedIds = new Set<string>(expected.map((topic) => topic.topicId));
      const actualIds = final.records.map((session) => session.topicId);
      return final.invalidRecordCount === 0
        && final.rawRecordCount === expected.length
        && final.records.length === expected.length
        && duplicateValues(actualIds).length === 0
        && actualIds.every((topicId) => expectedIds.has(topicId))
        && expected.every((topic) => actualIds.includes(topic.topicId));
    });
  const exactCatalogSourcePerTopic = ownedRows.every(({ grade, session }) => {
    const expected = topicPlanById.get(session.topicId as HKVisualizationLabId);
    return Boolean(
      expected
      && expected.grade === grade
      && session.moduleId === expected.moduleId
      && session.source === expected.analyticsSource
    );
  });
  const exactCatalogExploredRecordShape = records.every((session) =>
    isExactHkExploredVisualizationSession(session)
  );
  const exactOwnerBoundPostAcknowledgements = scopes.every((scope) => {
    const expectedTopics = expectedTopicsForGrade(scope.grade);
    const expectedIds = new Set(expectedTopics.map((topic) => topic.topicId));
    return scope.postResults.length === expectedTopics.length
      && scope.postResults.every((result) => {
        const expected = topicPlanById.get(result.request.topicId);
        return Boolean(
          expected
          && expected.grade === scope.grade
          && expectedIds.has(result.request.topicId)
          && result.ok
          && result.status === 200
          && result.ownerHeaderUserId === scope.ownerUserId
          && Object.keys(result.request).every(
            (key) => key === "moduleId" || key === "topicId" || key === "source"
          )
          && result.request.moduleId === expected.moduleId
          && result.request.source === expected.analyticsSource
          && isExactHkVisualizationSessionAcknowledgement(
            result.body,
            scope.ownerUserId,
            result.request.topicId
          )
        );
      });
  });
  const exactRegistryTopicSet = missingTopicIds.length === 0
    && unexpectedTopicIds.length === 0;
  const noInvalidRawGetRecords = allBeforeBodiesReadable
    && allFinalBodiesReadable
    && invalidRecordCount === 0;
  const noDuplicateTriples = duplicateOwnedTripleKeys.size === 0
    && duplicateTopicIds.length === 0;
  const noUnexpectedTriples = unexpectedTopicIds.length === 0
    && exactPerGradeRawGetCounts;
  const exactRawGetRecordCount = rawRecordCount
    === HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount;
  const exact51DistinctTriples = exactRawGetRecordCount
    && records.length === HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount
    && new Set(ownedTripleKeys).size === HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount
    && recordTopicIdSet.size === HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount;

  const contract = {
    exact12GradeMatchedOwnerScopes,
    exact51DistinctTriples,
    exactCatalogExploredRecordShape,
    exactCatalogSourcePerTopic,
    exactEmptyBeforeGetPerOwner,
    exactOwnerBoundPostAcknowledgements,
    exactPerGradeRawGetCounts,
    exactRawGetRecordCount,
    exactRegistryTopicSet,
    legacyAndNewIdsAreFourSeparateRecords:
      legacyAndNewRecords.every((matches) => matches.length === 1)
      && new Set(legacyAndNewRecords.map((matches) => matches[0]?.topicId)).size === 4,
    noInvalidRawGetRecords,
    noDuplicateTriples,
    noUnexpectedTriples
  };
  const failures: string[] = [];
  if (!contract.exact12GradeMatchedOwnerScopes) {
    failures.push(
      `grade-matched-owner-scopes expected=12 actual=${scopes.length} `
      + `duplicateGrades=${duplicateGradeIds.length} duplicateOwners=${duplicateOwnerIds.length}`
    );
  }
  for (const { before, final, scope } of scopeSnapshots) {
    const expectedCount = expectedTopicsForGrade(scope.grade).length;
    if (!before.bodyReadable) failures.push(`raw-get-body-unreadable grade=${scope.grade} phase=before`);
    if (!final.bodyReadable) failures.push(`raw-get-body-unreadable grade=${scope.grade} phase=final`);
    if (before.invalidRecordCount > 0 || final.invalidRecordCount > 0) {
      failures.push(
        `invalid-raw-get-records grade=${scope.grade} before=${before.invalidRecordCount} `
        + `final=${final.invalidRecordCount}`
      );
    }
    if (before.rawRecordCount !== 0) {
      failures.push(`raw-get-before-count grade=${scope.grade} expected=0 actual=${before.rawRecordCount ?? "unreadable"}`);
    }
    if (final.rawRecordCount !== expectedCount) {
      failures.push(
        `raw-get-record-count grade=${scope.grade} expected=${expectedCount} `
        + `actual=${final.rawRecordCount ?? "unreadable"}`
      );
    }
  }
  if (!contract.exactOwnerBoundPostAcknowledgements) {
    failures.push("post-owner-header-source-or-durable-acknowledgement-was-not-exact");
  }
  if (!contract.exactRawGetRecordCount) {
    failures.push(
      `aggregate-raw-get-record-count expected=${HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount} `
      + `actual=${rawRecordCount ?? "unreadable"}`
    );
  }
  if (!contract.exact51DistinctTriples) {
    failures.push(
      `exact-distinct-triples expected=${HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN.expectedRecordCount} `
      + `actual=${records.length} unique=${new Set(ownedTripleKeys).size}`
    );
  }
  if (!contract.exactCatalogExploredRecordShape || !contract.exactCatalogSourcePerTopic) {
    failures.push("every-record-must-have-exact-catalog-source-and-explored=true");
  }
  if (!contract.exactRegistryTopicSet) {
    failures.push(
      `registry-topic-set missing=[${missingTopicIds.join(", ")}] unexpected=[${unexpectedTopicIds.join(", ")}]`
    );
  }
  if (!contract.legacyAndNewIdsAreFourSeparateRecords) {
    failures.push("legacy-and-new-topic-ids-must-remain-four-separate-records");
  }
  if (!contract.noDuplicateTriples) {
    failures.push(`duplicate-topic-triples=[${duplicateTopicIds.join(", ")}]`);
  }
  if (!contract.noUnexpectedTriples) failures.push("unexpected-or-cross-grade-topic-triples");
  if (missingCellIds.length > 0) failures.push(`missing-post-cells=[${missingCellIds.join(", ")}]`);
  if (duplicateCellIds.length > 0) failures.push(`duplicate-post-cells=[${duplicateCellIds.join(", ")}]`);

  return {
    contract,
    failures,
    ledger: { duplicateCellIds, executedCellIds, missingCellIds, plannedCellIds },
    observed: {
      duplicateTopicIds,
      duplicateTripleIds,
      gradeRawRecordCounts,
      invalidRecordCount,
      invalidRecordIndexes,
      missingTopicIds,
      ownerScopeCount: scopes.length,
      rawRecordCount,
      records,
      unexpectedTopicIds
    },
    plan: HK_VISUALIZATION_ALL_TOPICS_STATE_PLAN,
    status: failures.length === 0 ? "passed" : "failed"
  };
}

export function assertHkVisualizationAllTopicsState(
  evidence: HkVisualizationAllTopicsStateEvidence
) {
  if (evidence.status === "passed") return;
  throw new Error(
    "HK visualization 51-topic persistence hard gate failed: every registry topic must retain "
    + "one distinct (user,module,topic) record, including separate legacy and new S3 IDs.\n"
    + evidence.failures.map((failure) => `- ${failure}`).join("\n")
  );
}

export const HK_VISUALIZATION_RENDER_NO_WRITE_PLAN = Object.freeze({
  lessonRoute: "/student/lessons/p1-counting-number-bonds",
  readOnlyEndpoints: Object.freeze([
    "/api/visualization-sessions",
    "/api/analytics/summary?grade=P1&window=7d",
    "/api/gamification/summary"
  ]),
  steps: Object.freeze([
    "before/visualization-sessions",
    "before/analytics-summary",
    "before/gamification-summary",
    "render/p1-counting-number-bonds",
    "flush/pagehide",
    "after/visualization-sessions",
    "after/analytics-summary",
    "after/gamification-summary"
  ]),
  topicId: "p1-counting-number-bonds"
} as const);

export function hkVisualizationLearningEventFixture(type: string, index = 0) {
  return {
    grade: "P1",
    id: `hk-viz-render-fixture-${index}`,
    source: type.startsWith("visualization-") ? "visualization-lab" : "lesson",
    timestamp: new Date(Date.UTC(2026, 7, 9, 0, 0, index)).toISOString(),
    topicId: "p1-counting-number-bonds",
    type
  };
}

export type HkVisualizationPersistedRewardState = {
  gamificationEvents: Record<string, unknown>[];
  rewardPointLedger: Record<string, unknown>[];
  rewardRedemptions: Record<string, unknown>[];
};

export type HkVisualizationRenderNoWriteSnapshot = {
  readable: {
    analytics: boolean;
    persistedRewards: boolean;
    rewards: boolean;
    sessions: boolean;
  };
  persistedRewardState: HkVisualizationPersistedRewardState | null;
  rewardState: {
    badgeState: Array<{ earned: boolean; id: string; progress: number }>;
    level: unknown;
    questCompletion: Array<{
      claimed: boolean;
      completed: boolean;
      id: string;
      progress: number;
      target: number;
    }>;
    recentEvents: unknown[];
    rewardSummary: unknown;
    streakDays: number;
    xp: number;
  } | null;
  sessions: HkVisualizationSessionRecord[];
  visualizationEventCount: number | null;
};

export type HkVisualizationRenderNoWriteEvidence = {
  after: HkVisualizationRenderNoWriteSnapshot;
  before: HkVisualizationRenderNoWriteSnapshot;
  contract: {
    noRewardWrite: boolean;
    noSessionWrite: boolean;
    noVisualizationEventWrite: boolean;
    noVisualizationWriteRequest: boolean;
    readOnlyEvidenceComplete: boolean;
  };
  failures: string[];
  ledger: {
    duplicateStepIds: string[];
    executedStepIds: string[];
    missingStepIds: string[];
    plannedStepIds: string[];
  };
  observedVisualizationWriteRequests: string[];
  plan: typeof HK_VISUALIZATION_RENDER_NO_WRITE_PLAN;
  status: "failed" | "passed";
};

function isHkVisualizationPersistedRewardState(
  value: unknown
): value is HkVisualizationPersistedRewardState {
  return isRecord(value)
    && Object.keys(value).length === 3
    && Array.isArray(value.gamificationEvents)
    && value.gamificationEvents.every(isRecord)
    && Array.isArray(value.rewardPointLedger)
    && value.rewardPointLedger.every(isRecord)
    && Array.isArray(value.rewardRedemptions)
    && value.rewardRedemptions.every(isRecord);
}

export function buildHkVisualizationRenderNoWriteSnapshot(args: {
  analyticsBody: unknown;
  persistedRewardState?: unknown;
  rewardsBody: unknown;
  sessionsBody: unknown;
}): HkVisualizationRenderNoWriteSnapshot {
  const sessionSnapshot = hkVisualizationSessionSnapshotFromBody(args.sessionsBody);
  const sessionsReadable = sessionSnapshot.bodyReadable
    && sessionSnapshot.invalidRecordCount === 0;
  const sessions = sessionsReadable ? sessionSnapshot.records : [];
  const analyticsSummary = isRecord(args.analyticsBody) && isRecord(args.analyticsBody.summary)
    ? args.analyticsBody.summary
    : null;
  const analyticsCounts = analyticsSummary && isRecord(analyticsSummary.counts)
    ? analyticsSummary.counts
    : null;
  const visualizationEventCount = analyticsCounts
    && typeof analyticsCounts.visualizationEvents === "number"
    ? analyticsCounts.visualizationEvents
    : null;
  const gamification = isRecord(args.rewardsBody) && isRecord(args.rewardsBody.gamification)
    ? args.rewardsBody.gamification
    : null;
  const badgeState = gamification && Array.isArray(gamification.badges)
    ? gamification.badges.map((badge) => {
        if (!isRecord(badge)
          || typeof badge.id !== "string"
          || typeof badge.earned !== "boolean"
          || typeof badge.progress !== "number") return null;
        return { earned: badge.earned, id: badge.id, progress: badge.progress };
      })
    : null;
  const questCompletion = gamification && Array.isArray(gamification.quests)
    ? gamification.quests.map((questProgress) => {
        if (!isRecord(questProgress)
          || !isRecord(questProgress.quest)
          || typeof questProgress.quest.id !== "string"
          || typeof questProgress.completed !== "boolean"
          || typeof questProgress.claimed !== "boolean"
          || typeof questProgress.progress !== "number"
          || typeof questProgress.target !== "number") return null;
        return {
          claimed: questProgress.claimed,
          completed: questProgress.completed,
          id: questProgress.quest.id,
          progress: questProgress.progress,
          target: questProgress.target
        };
      })
    : null;
  const rewardState = gamification
    && typeof gamification.xp === "number"
    && isRecord(gamification.level)
    && typeof gamification.streakDays === "number"
    && badgeState !== null
    && badgeState.every((badge) => badge !== null)
    && questCompletion !== null
    && questCompletion.every((quest) => quest !== null)
    && Array.isArray(gamification.recentEvents)
    && isRecord(gamification.rewardSummary)
    ? {
        badgeState: badgeState as Array<{ earned: boolean; id: string; progress: number }>,
        // generatedAt and studentId are intentionally excluded. The fields
        // below are the stable learner reward state that must not change from
        // a render-only or duplicate visualization write.
        level: gamification.level,
        questCompletion: questCompletion as Array<{
          claimed: boolean;
          completed: boolean;
          id: string;
          progress: number;
          target: number;
        }>,
        recentEvents: gamification.recentEvents,
        rewardSummary: gamification.rewardSummary,
        streakDays: gamification.streakDays,
        xp: gamification.xp
      }
    : null;
  const rawPersistedRewards = isHkVisualizationPersistedRewardState(
    args.persistedRewardState
  )
    ? args.persistedRewardState
    : null;
  const persistedRewardState = rawPersistedRewards
    ? {
        gamificationEvents: rawPersistedRewards.gamificationEvents.map((record) => ({ ...record })),
        rewardPointLedger: rawPersistedRewards.rewardPointLedger.map((record) => ({ ...record })),
        rewardRedemptions: rawPersistedRewards.rewardRedemptions.map((record) => ({ ...record }))
      }
    : null;

  return {
    readable: {
      analytics: visualizationEventCount !== null,
      persistedRewards: persistedRewardState !== null,
      rewards: rewardState !== null,
      sessions: sessionsReadable
    },
    persistedRewardState,
    rewardState,
    sessions,
    visualizationEventCount
  };
}

export function describeHkVisualizationRenderOnlyWrite(
  method: string,
  pathname: string,
  postData: string | null
) {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") {
    return null;
  }
  const isAlwaysForbiddenWrite = HK_VISUALIZATION_RENDER_ONLY_WRITE_API_FAMILIES.some(
    (family) => isApiFamilyPath(pathname, family)
  );
  if (pathname !== "/api/learning-events") {
    return isAlwaysForbiddenWrite
      ? `${normalizedMethod} ${pathname}`
      : null;
  }

  let body: unknown;
  try {
    body = postData ? JSON.parse(postData) as unknown : null;
  } catch {
    return `${normalizedMethod} ${pathname} unparseable-learning-events-payload`;
  }
  const rawEvents = isRecord(body) && Array.isArray(body.events) ? body.events : null;
  if (!isValidLearningAnalyticsEventLog(rawEvents)) {
    return `${normalizedMethod} ${pathname} unparseable-learning-events-payload`;
  }
  const visualizationEventTypes = rawEvents.flatMap((event) => {
    if (event.type.startsWith("visualization-")) return [event.type];
    return hkVisualizationLearningEventSourceSet.has(event.source)
      ? [`${event.type}@${event.source}`]
      : [];
  });
  if (visualizationEventTypes.length === 0) return null;
  return `${normalizedMethod} ${pathname} visualization-event-types=[${visualizationEventTypes.join(", ")}]`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).sort().join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? "undefined";
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`
  ).join(",")}}`;
}

export function buildHkVisualizationRenderNoWriteEvidence(args: {
  after: HkVisualizationRenderNoWriteSnapshot;
  before: HkVisualizationRenderNoWriteSnapshot;
  executedStepIds: readonly string[];
  observedVisualizationWriteRequests: readonly string[];
}): HkVisualizationRenderNoWriteEvidence {
  const plannedStepIds = [...HK_VISUALIZATION_RENDER_NO_WRITE_PLAN.steps];
  const executedStepIds = [...args.executedStepIds];
  const executedStepIdSet = new Set(executedStepIds);
  const missingStepIds = plannedStepIds.filter((stepId) => !executedStepIdSet.has(stepId));
  const duplicateStepIds = duplicateValues(executedStepIds);
  const readOnlyEvidenceComplete = Object.values(args.before.readable).every(Boolean)
    && Object.values(args.after.readable).every(Boolean);
  const contract = {
    noRewardWrite:
      canonicalJson(args.before.persistedRewardState)
        === canonicalJson(args.after.persistedRewardState),
    noSessionWrite: canonicalJson(args.before.sessions) === canonicalJson(args.after.sessions),
    noVisualizationEventWrite:
      args.before.visualizationEventCount === args.after.visualizationEventCount,
    noVisualizationWriteRequest: args.observedVisualizationWriteRequests.length === 0,
    readOnlyEvidenceComplete
  };
  const failures: string[] = [];
  if (!contract.readOnlyEvidenceComplete) failures.push("read-only-session-event-reward-evidence-incomplete");
  if (!contract.noSessionWrite) failures.push("lesson-render-created-or-changed-a-visualization-session");
  if (!contract.noVisualizationEventWrite) failures.push("lesson-render-created-a-visualization-event");
  if (!contract.noRewardWrite) failures.push("lesson-render-created-or-changed-a-reward-record");
  if (!contract.noVisualizationWriteRequest) {
    failures.push(`unexpected-visualization-write-requests=[${args.observedVisualizationWriteRequests.join(", ")}]`);
  }
  if (missingStepIds.length > 0) failures.push(`missing-read-probe-steps=[${missingStepIds.join(", ")}]`);
  if (duplicateStepIds.length > 0) failures.push(`duplicate-read-probe-steps=[${duplicateStepIds.join(", ")}]`);

  return {
    after: args.after,
    before: args.before,
    contract,
    failures,
    ledger: { duplicateStepIds, executedStepIds, missingStepIds, plannedStepIds },
    observedVisualizationWriteRequests: [...args.observedVisualizationWriteRequests],
    plan: HK_VISUALIZATION_RENDER_NO_WRITE_PLAN,
    status: failures.length === 0 ? "passed" : "failed"
  };
}

export function assertHkVisualizationRenderNoWrite(
  evidence: HkVisualizationRenderNoWriteEvidence
) {
  if (evidence.status === "passed") return;
  throw new Error(
    "HK visualization render-only hard gate failed: embedding a lesson lab without learner interaction "
    + "must create no visualization session, visualization event, or reward.\n"
    + evidence.failures.map((failure) => `- ${failure}`).join("\n")
  );
}
