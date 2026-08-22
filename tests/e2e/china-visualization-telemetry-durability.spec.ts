import {
  expect,
  test,
  type APIResponse,
  type Page,
  type Request,
  type Route,
  type TestInfo
} from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import {
  buildVisualizationLabHref,
  buildVisualizationSessionModuleId
} from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog, type FeaturedLabDefinition } from "../../data/visualizationLabs";
import {
  isLearningAnalyticsClearAcknowledgement,
  learningAnalyticsClearFenceStorageKey,
  learningAnalyticsGenerationStorageKey,
  learningAnalyticsOutboxRecordStorageKey,
  learningAnalyticsOutboxStorageKey,
  unconfirmedLearningAnalyticsOutboxStorageKey,
  withLearningAnalyticsDeliveryGeneration
} from "../../lib/learningAnalytics";
import {
  visualizationSessionOutboxStorageKey,
  visualizationSessionOutboxUpdatedEventName,
  type VisualizationSessionOutboxRecord
} from "../../lib/visualizationSessionOutbox";
import { visualizationCompletionRewardSourceKey } from "../../lib/server/userStore/gamificationRewardRedemptionPersistence";
import { closeLearnerStartSetupIfVisible, uniqueSuffix } from "./helpers";

type DurationEvidenceEntry = {
  durationMs: number;
  failure: string | null;
  label: string;
  outcome: "failed" | "finished";
  startedAt: string;
  status: number | null;
};

type RegisteredStudent = {
  grade: FeaturedLabDefinition["grade"];
  userId: string;
  username: string;
};

type LearningDelivery = {
  accepted?: number;
  acknowledgedEventIds?: string[];
  acknowledgedUserId?: string;
  clearedAt?: string;
  currentGeneration?: number;
  dispositions?: Array<{
    disposition?: string;
    id?: string;
  }>;
  durablyPersisted?: boolean;
  generation?: number;
  ignored?: boolean;
  ok?: boolean;
  reason?: string;
};

type DurableLearningEventRow = {
  duration_seconds: number | null;
  id: string;
  source: string;
  topic_id: string;
  type: string;
};

type VisualizationSession = {
  completedAt?: string | null;
  explored?: boolean;
  moduleId?: string;
  source?: string;
  topicId?: string;
  updatedAt?: string | null;
};

type VisualizationDelivery = {
  acknowledgedUserId?: string;
  durablyPersisted?: boolean;
  session?: VisualizationSession;
};

type SessionIdentity = {
  moduleId: string;
  source: VisualizationSessionOutboxRecord["source"];
  topicId: string;
};

type VisualizationOutboxTraceEntry = {
  at: number;
  records: Array<[string, string]>;
};

type VisualizationOutboxTraceWindow = Window & {
  __maisVisualizationOutboxUpdateTrace?: VisualizationOutboxTraceEntry[];
};

const configuredMainlandLabs = visualizationLabCatalog.filter((lab) =>
  lab.publisher === "MAINLAND_PEP" &&
  lab.grade === "P1" &&
  lab.moduleId === "configured-visualization-lab"
);

if (configuredMainlandLabs.length < 4) {
  throw new Error(
    `Telemetry durability package needs four PEP P1 configured labs; found ${configuredMainlandLabs.length}.`
  );
}

const apiTopicLabA = configuredMainlandLabs[0]!;
const apiTopicLabB = configuredMainlandLabs[1]!;
const failedReplayLab = configuredMainlandLabs[2]!;
const keepaliveNavigationLab = configuredMainlandLabs[3]!;

async function attachDurationEvidence(
  testInfo: TestInfo,
  entries: DurationEvidenceEntry[]
) {
  const safeTitle = testInfo.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  await testInfo.attach(`china-viz-telemetry-duration-${safeTitle}.json`, {
    body: Buffer.from(JSON.stringify({
      durationEvidenceVersion: 1,
      entries: entries.slice().sort((left, right) =>
        left.startedAt.localeCompare(right.startedAt) || left.label.localeCompare(right.label)
      ),
      generatedAt: new Date().toISOString(),
      project: testInfo.project.name,
      test: testInfo.title
    }, null, 2)),
    contentType: "application/json"
  });
}

async function timedApiResponse(
  evidence: DurationEvidenceEntry[],
  label: string,
  operation: () => Promise<APIResponse>
) {
  const startedAtMs = Date.now();
  try {
    const response = await operation();
    evidence.push({
      durationMs: Math.max(0, Date.now() - startedAtMs),
      failure: null,
      label,
      outcome: "finished",
      startedAt: new Date(startedAtMs).toISOString(),
      status: response.status()
    });
    return response;
  } catch (error) {
    evidence.push({
      durationMs: Math.max(0, Date.now() - startedAtMs),
      failure: error instanceof Error ? error.message : String(error),
      label,
      outcome: "failed",
      startedAt: new Date(startedAtMs).toISOString(),
      status: null
    });
    throw error;
  }
}

async function timedStep<T>(
  evidence: DurationEvidenceEntry[],
  label: string,
  operation: () => Promise<T>
) {
  const startedAtMs = Date.now();
  try {
    const result = await operation();
    evidence.push({
      durationMs: Math.max(0, Date.now() - startedAtMs),
      failure: null,
      label,
      outcome: "finished",
      startedAt: new Date(startedAtMs).toISOString(),
      status: null
    });
    return result;
  } catch (error) {
    evidence.push({
      durationMs: Math.max(0, Date.now() - startedAtMs),
      failure: error instanceof Error ? error.message : String(error),
      label,
      outcome: "failed",
      startedAt: new Date(startedAtMs).toISOString(),
      status: null
    });
    throw error;
  }
}

async function readJson<T>(response: APIResponse, expectedStatus: number) {
  if (response.status() !== expectedStatus) {
    const responseBody = await response.text().catch(() => "");
    expect(response.status(), responseBody).toBe(expectedStatus);
  }
  return await response.json() as T;
}

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  evidence: DurationEvidenceEntry[],
  label: string,
  lab: FeaturedLabDefinition = apiTopicLabA
): Promise<RegisteredStudent> {
  const suffix = `${uniqueSuffix(testInfo)}-${label}-${Math.random().toString(36).slice(2, 8)}`
    .replace(/[^a-z0-9-]+/gi, "-")
    .toLowerCase()
    .slice(0, 90);
  const username = `china-viz-durable-${suffix}@example.test`;
  const response = await timedApiResponse(evidence, `${label}:register`, () =>
    page.request.post("/api/auth/register", {
      data: {
        role: "student",
        name: `China Visualization Durability ${label}`,
        username,
        email: username,
        password: "start12345",
        grade: lab.grade,
        curriculumTrack: "MAINLAND_PEP_HIGH",
        curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
        language: "zh-Hans",
        theme: "light"
      }
    })
  );
  const payload = await readJson<{
    user?: { id?: string; role?: string };
    settings?: { selectedGrade?: string };
  }>(response, 200);
  expect(payload.user?.role).toBe("student");
  expect(payload.settings?.selectedGrade).toBe(lab.grade);
  expect(payload.user?.id).toEqual(expect.any(String));
  return {
    grade: lab.grade,
    userId: payload.user!.id!,
    username
  };
}

function parseRequestBody(request: Request): unknown {
  try {
    return JSON.parse(request.postData() ?? "null") as unknown;
  } catch {
    return null;
  }
}

function isApiPost(request: Request, pathname: string) {
  return request.method() === "POST" && new URL(request.url()).pathname === pathname;
}

function learningRequestContainsIds(request: Request, eventIds: readonly string[]) {
  if (!isApiPost(request, "/api/learning-events")) return false;
  const body = parseRequestBody(request) as {
    events?: Array<{ id?: unknown }>;
  } | null;
  const requestIds = new Set((body?.events ?? []).map((event) => event.id));
  return eventIds.every((eventId) => requestIds.has(eventId));
}

function learningRequestGeneration(request: Request) {
  const body = parseRequestBody(request) as { generation?: unknown } | null;
  return typeof body?.generation === "number" ? body.generation : null;
}

function learningRequestEventIds(request: Request) {
  return learningRequestEvents(request)
    .map((event) => event.id)
    .filter((eventId): eventId is string => typeof eventId === "string");
}

function learningRequestEvents(request: Request) {
  const body = parseRequestBody(request) as {
    events?: Array<{
      durationSeconds?: unknown;
      id?: unknown;
      source?: unknown;
      topicId?: unknown;
      type?: unknown;
    }>;
  } | null;
  return body?.events ?? [];
}

function learningRequestOwner(request: Request) {
  const encodedOwner = request.headers()["x-mais-analytics-user-id"];
  if (!encodedOwner) return null;
  try {
    return decodeURIComponent(encodedOwner);
  } catch {
    return null;
  }
}

function requireNonNegativeSafeInteger(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) throw new Error(`${label} must be a non-negative safe integer.`);
  return value;
}

function durableLearningEventRows(userId: string) {
  const databasePath = process.env.HK_MATH_DB_PATH?.trim();
  if (!databasePath?.startsWith("/Volumes/Starship/")) {
    throw new Error(
      `HK_MATH_DB_PATH must be an absolute Starship path; received ${JSON.stringify(databasePath ?? null)}.`
    );
  }
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare(
      "SELECT payload FROM app_state WHERE id = ?"
    ).get("primary") as { payload?: unknown } | undefined;
    if (typeof row?.payload !== "string") {
      throw new Error("The durable SQLite app_state primary payload is unavailable.");
    }
    const payload: unknown = JSON.parse(row.payload);
    const events = (payload as { learning_events?: unknown } | null)?.learning_events;
    if (!Array.isArray(events)) {
      throw new Error("The durable SQLite app_state payload has no learning_events array.");
    }
    return events
      .filter((event) =>
        typeof event === "object" &&
        event !== null &&
        !Array.isArray(event) &&
        (event as { user_id?: unknown }).user_id === userId
      )
      .map((event) => {
        const record = event as Record<string, unknown>;
        if (
          typeof record.id !== "string" ||
          typeof record.type !== "string" ||
          typeof record.source !== "string" ||
          typeof record.topic_id !== "string" ||
          (
            typeof record.duration_seconds !== "undefined" &&
            typeof record.duration_seconds !== "number"
          )
        ) throw new Error("A durable SQLite learning-event row is malformed.");
        return {
          duration_seconds: typeof record.duration_seconds === "number"
            ? record.duration_seconds
            : null,
          id: record.id,
          source: record.source,
          topic_id: record.topic_id,
          type: record.type
        } satisfies DurableLearningEventRow;
      })
      .sort((left, right) => left.id.localeCompare(right.id));
  } finally {
    database.close();
  }
}

function exactLearningAcknowledgement(
  eventIds: readonly string[],
  userId: string,
  generation: number,
  disposition: "inserted" | "already-persisted" = "inserted"
): LearningDelivery {
  return {
    accepted: disposition === "inserted" ? eventIds.length : 0,
    acknowledgedEventIds: [...eventIds],
    acknowledgedUserId: userId,
    dispositions: eventIds.map((id) => ({ id, disposition })),
    durablyPersisted: true,
    generation
  };
}

function expectExactLearningAnalyticsClearAcknowledgement(
  delivery: LearningDelivery,
  userId: string,
  baseGeneration: number,
  expectedGeneration: number
) {
  expect(
    isLearningAnalyticsClearAcknowledgement(
      200,
      delivery,
      userId,
      baseGeneration
    )
  ).toBe(true);
  if (typeof delivery.clearedAt !== "string") {
    throw new Error("Learning-analytics clear acknowledgement omitted canonical clearedAt.");
  }
  expect(new Date(delivery.clearedAt).toISOString()).toBe(delivery.clearedAt);
  expect(delivery).toEqual({
    acknowledgedUserId: userId,
    clearedAt: delivery.clearedAt,
    durablyPersisted: true,
    generation: expectedGeneration,
    ok: true
  });
}

async function learningOutboxRecordsForPrefixes(
  page: Page,
  prefixes: readonly string[]
) {
  return await page.evaluate((storagePrefixes) => {
    const records: Array<{ key: string; value: Record<string, unknown> }> = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !storagePrefixes.some((prefix) => key.startsWith(prefix))) continue;
      const serialized = window.localStorage.getItem(key);
      if (!serialized) continue;
      try {
        const value: unknown = JSON.parse(serialized);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          records.push({ key, value: value as Record<string, unknown> });
        }
      } catch {
        // Corrupt records are intentionally ignored by this positive helper.
      }
    }
    return records;
  }, prefixes);
}

async function learningOutboxRecordsForUser(page: Page, userId: string) {
  return learningOutboxRecordsForPrefixes(page, [
    learningAnalyticsOutboxStorageKey(userId)
  ]);
}

async function allLearningOutboxRecordsForUser(page: Page, userId: string) {
  return learningOutboxRecordsForPrefixes(page, [
    learningAnalyticsOutboxStorageKey(userId),
    unconfirmedLearningAnalyticsOutboxStorageKey(userId)
  ]);
}

function matchesSessionRequest(request: Request, identity: SessionIdentity) {
  if (!isApiPost(request, "/api/visualization-sessions")) return false;
  const body = parseRequestBody(request) as {
    moduleId?: unknown;
    source?: unknown;
    topicId?: unknown;
  } | null;
  return body?.moduleId === identity.moduleId &&
    body.topicId === identity.topicId &&
    body.source === identity.source;
}

function visualizationIdentity(lab: FeaturedLabDefinition): SessionIdentity {
  return {
    moduleId: buildVisualizationSessionModuleId(lab),
    source: lab.analyticsSource,
    topicId: lab.topicId
  };
}

async function localStorageValues(page: Page, keys: readonly string[]) {
  return await page.evaluate((storageKeys) =>
    storageKeys.map((key) => window.localStorage.getItem(key)),
  keys);
}

async function installVisualizationOutboxUpdateTrace(page: Page) {
  await page.addInitScript((updatedEventName) => {
    const testWindow = window as VisualizationOutboxTraceWindow;
    testWindow.__maisVisualizationOutboxUpdateTrace = [];
    window.addEventListener(updatedEventName, () => {
      const records: Array<[string, string]> = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith("mais:visualization-session-outbox:v1:")) continue;
        const value = window.localStorage.getItem(key);
        if (value !== null) records.push([key, value]);
      }
      testWindow.__maisVisualizationOutboxUpdateTrace?.push({
        at: performance.now(),
        records
      });
    });
  }, visualizationSessionOutboxUpdatedEventName);
}

async function readVisualizationOutboxUpdateTrace(page: Page) {
  return await page.evaluate(() =>
    (window as VisualizationOutboxTraceWindow).__maisVisualizationOutboxUpdateTrace ?? []
  );
}

function expectEnqueueDispatchBeforeNetwork(
  trace: VisualizationOutboxTraceEntry[],
  outboxKey: string,
  expectedRecord: Omit<VisualizationSessionOutboxRecord, "queuedAt">
) {
  const physicalRecords = new Map(
    trace
      .flatMap((entry) => entry.records)
      .filter(([key]) => key === outboxKey || key.startsWith(`${outboxKey}/revision/`))
  );
  expect(
    [...physicalRecords.keys()],
    "The initial empty outbox update must not count as a durable revision; exactly one physical revision must exist before network delivery."
  ).toHaveLength(1);
  const [physicalKey, serializedRecord] = [...physicalRecords.entries()][0] ?? [];
  expect(
    serializedRecord,
    "The Card must durably enqueue and dispatch the outbox update before the Provider starts POST delivery."
  ).toEqual(expect.any(String));
  expect(JSON.parse(serializedRecord!)).toEqual(expect.objectContaining({
    ...expectedRecord,
    queuedAt: expect.any(Number)
  }));
  expect(physicalKey?.startsWith(`${outboxKey}/revision/`)).toBe(true);
  return physicalKey!;
}

function observeSessionRequest(
  page: Page,
  identity: SessionIdentity,
  evidence: DurationEvidenceEntry[],
  label: string
) {
  let matchedRequest: Request | null = null;
  let startedAtMs = 0;
  let settled = false;
  let resolveStarted!: (started: {
    request: Request;
    traceBeforeNetwork: VisualizationOutboxTraceEntry[];
  }) => void;
  let rejectStarted!: (error: unknown) => void;
  let resolveOutcome!: (outcome: {
    failure: string | null;
    outcome: "failed" | "finished";
    status: number | null;
  }) => void;
  const started = new Promise<{
    request: Request;
    traceBeforeNetwork: VisualizationOutboxTraceEntry[];
  }>((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });
  const outcome = new Promise<{
    failure: string | null;
    outcome: "failed" | "finished";
    status: number | null;
  }>((resolve) => {
    resolveOutcome = resolve;
  });

  const cleanup = () => {
    page.off("request", onRequest);
    page.off("requestfinished", onFinished);
    page.off("requestfailed", onFailed);
  };
  const settle = (
    result: { failure: string | null; outcome: "failed" | "finished"; status: number | null }
  ) => {
    if (settled) return;
    settled = true;
    evidence.push({
      durationMs: Math.max(0, Date.now() - startedAtMs),
      failure: result.failure,
      label,
      outcome: result.outcome,
      startedAt: new Date(startedAtMs).toISOString(),
      status: result.status
    });
    resolveOutcome(result);
  };
  const onRequest = (request: Request) => {
    if (!matchesSessionRequest(request, identity)) return;
    if (matchedRequest) return;
    matchedRequest = request;
    startedAtMs = Date.now();
    void readVisualizationOutboxUpdateTrace(page).then((traceBeforeNetwork) => {
      resolveStarted({ request, traceBeforeNetwork });
    }, rejectStarted);
  };
  const onFinished = (request: Request) => {
    if (request !== matchedRequest) return;
    void request.response().then((response) => {
      settle({ failure: null, outcome: "finished", status: response?.status() ?? null });
    });
  };
  const onFailed = (request: Request) => {
    if (request !== matchedRequest) return;
    settle({
      failure: request.failure()?.errorText ?? "unknown transport failure",
      outcome: "failed",
      status: null
    });
  };

  page.on("request", onRequest);
  page.on("requestfinished", onFinished);
  page.on("requestfailed", onFailed);
  return {
    cleanup,
    outcome,
    started
  };
}

test.describe("Mainland visualization telemetry durability · desktop focused package", () => {
  test("learning API enforces identity, exact per-ID ACKs, and clear generations", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    try {
      const anonymous = await timedApiResponse(evidence, "learning:anonymous-ignored", () =>
        page.request.post("/api/learning-events", {
          data: "{not-json",
          headers: { "Content-Type": "application/json" }
        })
      );
      const anonymousPayload = await readJson<LearningDelivery>(anonymous, 202);
      expect(anonymousPayload).toEqual(expect.objectContaining({ accepted: 0, ignored: true }));

      const student = await registerMainlandStudent(page, testInfo, evidence, "learning-api");
      const mismatched = await timedApiResponse(evidence, "learning:mismatch-before-json", () =>
        page.request.post("/api/learning-events", {
          data: "{not-json",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Analytics-User-Id": encodeURIComponent(`${student.userId}-stale`)
          }
        })
      );
      const mismatchPayload = await readJson<LearningDelivery & { reason?: string }>(mismatched, 409);
      expect(mismatchPayload).toEqual(expect.objectContaining({
        accepted: 0,
        acknowledgedEventIds: [],
        durablyPersisted: false,
        ignored: true,
        reason: "identity-mismatch"
      }));

      const malformed = await timedApiResponse(evidence, "learning:exact-identity-malformed-json", () =>
        page.request.post("/api/learning-events", {
          data: "{not-json",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
          }
        })
      );
      expect(malformed.status()).toBe(400);

      const before = await readJson<{
        summary?: { eventCount?: number };
      }>(await timedApiResponse(evidence, "learning:summary-before-valid", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(before.summary?.eventCount).toBe(0);

      const event = {
        id: `durable-learning-${student.userId}`,
        type: "page-view",
        source: "visualization-lab",
        timestamp: new Date().toISOString(),
        grade: student.grade,
        topicId: "china-visualization-durable-learning",
        durationSeconds: 17
      };
      const valid = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:valid", () =>
          page.request.post("/api/learning-events", {
            data: { generation: 0, events: [event] },
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expect(valid).toEqual(exactLearningAcknowledgement(
        [event.id],
        student.userId,
        0,
        "inserted"
      ));

      const duplicate = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:duplicate-replay", () =>
          page.request.post("/api/learning-events", {
            data: { generation: 0, events: [event] },
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expect(duplicate).toEqual(exactLearningAcknowledgement(
        [event.id],
        student.userId,
        0,
        "already-persisted"
      ));

      const idConflict = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:id-conflict-empty-ack", () =>
          page.request.post("/api/learning-events", {
            data: {
              generation: 0,
              events: [{ ...event, topicId: `${event.topicId}-changed` }]
            },
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        409
      );
      expect(idConflict).toEqual(expect.objectContaining({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: student.userId,
        currentGeneration: 0,
        dispositions: [{ id: event.id, disposition: "id-conflict" }],
        durablyPersisted: false,
        reason: "id-conflict"
      }));

      const after = await readJson<{
        summary?: { counts?: { pageViews?: number }; eventCount?: number };
      }>(await timedApiResponse(evidence, "learning:summary-after-replay", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(after.summary?.eventCount).toBe(1);
      expect(after.summary?.counts?.pageViews).toBe(1);

      const wrongOwnerClear = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:clear-wrong-owner", () =>
          page.request.delete("/api/learning-events", {
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(`${student.userId}-stale`)
            }
          })
        ),
        409
      );
      expect(wrongOwnerClear).toEqual(expect.objectContaining({
        acknowledgedEventIds: [],
        durablyPersisted: false,
        ignored: true,
        reason: "identity-mismatch"
      }));

      const cleared = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:clear-exact-owner", () =>
          page.request.delete("/api/learning-events", {
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expectExactLearningAnalyticsClearAcknowledgement(
        cleared,
        student.userId,
        0,
        1
      );

      const staleEvent = {
        ...event,
        id: `stale-after-clear-${student.userId}`,
        timestamp: new Date(Date.now() + 1).toISOString()
      };
      const staleGeneration = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:stale-generation-empty-ack", () =>
          page.request.post("/api/learning-events", {
            data: { generation: 0, events: [staleEvent] },
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        409
      );
      expect(staleGeneration).toEqual(expect.objectContaining({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: student.userId,
        currentGeneration: 1,
        dispositions: [{ id: staleEvent.id, disposition: "stale-generation" }],
        durablyPersisted: false,
        reason: "generation-mismatch"
      }));

      const afterStale = await readJson<{
        summary?: { eventCount?: number };
      }>(await timedApiResponse(evidence, "learning:summary-after-stale-generation", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(afterStale.summary?.eventCount).toBe(0);

      const currentEvent = {
        ...event,
        id: `current-after-clear-${student.userId}`,
        timestamp: new Date(Date.now() + 2).toISOString()
      };
      const currentGeneration = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "learning:current-generation-after-clear", () =>
          page.request.post("/api/learning-events", {
            data: { generation: 1, events: [currentEvent] },
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expect(currentGeneration).toEqual(exactLearningAcknowledgement(
        [currentEvent.id],
        student.userId,
        1,
        "inserted"
      ));

      const afterCurrent = await readJson<{
        summary?: { counts?: { pageViews?: number }; eventCount?: number };
      }>(await timedApiResponse(evidence, "learning:summary-after-current-generation", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(afterCurrent.summary?.eventCount).toBe(1);
      expect(afterCurrent.summary?.counts?.pageViews).toBe(1);
    } finally {
      await attachDurationEvidence(testInfo, evidence);
    }
  });

  test("visualization API isolates identity and preserves two same-module topics under concurrent replay", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    try {
      const student = await registerMainlandStudent(page, testInfo, evidence, "visualization-api");
      const mismatchedBody = {
        moduleId: "configured-visualization-lab",
        topicId: "identity-mismatch-topic",
        source: "visualization-lab"
      };
      const missingOwner = await timedApiResponse(evidence, "session:missing-owner", () =>
        page.request.post("/api/visualization-sessions", {
          data: mismatchedBody
        })
      );
      expect(missingOwner.status()).toBe(409);
      const invalidOwner = await timedApiResponse(evidence, "session:invalid-owner", () =>
        page.request.post("/api/visualization-sessions", {
          data: mismatchedBody,
          headers: {
            "X-MAIS-Visualization-User-Id": "%"
          }
        })
      );
      expect(invalidOwner.status()).toBe(409);
      const mismatched = await timedApiResponse(evidence, "session:mismatch", () =>
        page.request.post("/api/visualization-sessions", {
          data: mismatchedBody,
          headers: {
            "X-MAIS-Visualization-User-Id": encodeURIComponent(`${student.userId}-stale`)
          }
        })
      );
      expect(mismatched.status()).toBe(409);

      const afterMismatch = await readJson<{ sessions?: VisualizationSession[] }>(
        await timedApiResponse(evidence, "session:get-after-mismatch", () =>
          page.request.get("/api/visualization-sessions")
        ),
        200
      );
      expect(afterMismatch.sessions ?? []).toEqual([]);

      const sessionInputs = [apiTopicLabA, apiTopicLabB].map((lab) => ({
        moduleId: "configured-visualization-lab",
        source: lab.analyticsSource,
        topicId: lab.topicId
      }));
      const concurrentInputs = [
        sessionInputs[0]!,
        sessionInputs[1]!,
        sessionInputs[0]!,
        sessionInputs[1]!
      ];
      const deliveries = await Promise.all(concurrentInputs.map(async (input, index) =>
        readJson<VisualizationDelivery>(
          await timedApiResponse(evidence, `session:concurrent-${index + 1}`, () =>
            page.request.post("/api/visualization-sessions", {
              data: input,
              headers: {
                "X-MAIS-Visualization-User-Id": encodeURIComponent(student.userId)
              }
            })
          ),
          200
        )
      ));
      deliveries.forEach((delivery, index) => {
        expect(delivery).toEqual(expect.objectContaining({
          acknowledgedUserId: student.userId,
          durablyPersisted: true,
          session: expect.objectContaining({
            explored: true,
            moduleId: concurrentInputs[index]!.moduleId,
            source: concurrentInputs[index]!.source,
            topicId: concurrentInputs[index]!.topicId
          })
        }));
      });

      const sessions = await readJson<{ sessions?: VisualizationSession[] }>(
        await timedApiResponse(evidence, "session:get-durable", () =>
          page.request.get("/api/visualization-sessions")
        ),
        200
      );
      const configuredSessions = (sessions.sessions ?? []).filter((session) =>
        session.moduleId === "configured-visualization-lab"
      );
      expect(configuredSessions).toHaveLength(2);
      expect(configuredSessions.map((session) => session.topicId).sort()).toEqual(
        sessionInputs.map((session) => session.topicId).sort()
      );

      const rewards = await readJson<{
        rewards?: { ledger?: Array<{ reason?: string; sourceKey?: string }> };
      }>(await timedApiResponse(evidence, "session:get-rewards", () =>
        page.request.get("/api/rewards")
      ), 200);
      const expectedSourceKeys = sessionInputs.map((session) =>
        visualizationCompletionRewardSourceKey(
          student.userId,
          session.moduleId,
          session.topicId
        )
      );
      const mismatchedSourceKey = visualizationCompletionRewardSourceKey(
        student.userId,
        mismatchedBody.moduleId,
        mismatchedBody.topicId
      );
      expect((rewards.rewards?.ledger ?? []).some((entry) =>
        entry.sourceKey === mismatchedSourceKey
      )).toBe(false);
      expectedSourceKeys.forEach((sourceKey) => {
        const matchingRewards = (rewards.rewards?.ledger ?? []).filter((entry) =>
          entry.sourceKey === sourceKey
        );
        expect(matchingRewards).toHaveLength(1);
        expect(matchingRewards[0]?.reason).toBe("visualization-complete");
      });
    } finally {
      await attachDurationEvidence(testInfo, evidence);
    }
  });

  test("browser retains per-event learning outbox through invalid and corrupt ACKs, then clears after remount", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/learning-events";
    let allowValidServer = false;
    let relevantAttempts = 0;
    try {
      const student = await registerMainlandStudent(page, testInfo, evidence, "learning-browser");
      await timedStep(evidence, "learning-browser:initial-dashboard", async () => {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      });

      const events = [0, 1].map((index) => ({
        id: `browser-learning-${student.userId}-${index}`,
        type: "page-view",
        source: "visualization-lab",
        timestamp: new Date(Date.now() + index).toISOString(),
        grade: student.grade,
        topicId: `browser-learning-topic-${index}`,
        durationSeconds: 11 + index
      }));
      const eventIds = events.map((event) => event.id);
      const storageKeys = eventIds.map((eventId) =>
        learningAnalyticsOutboxStorageKey(student.userId, eventId)
      );
      await page.evaluate(({ entries }) => {
        entries.forEach(({ key, value }) => window.localStorage.setItem(key, value));
      }, {
        entries: events.map((event, index) => ({
          key: storageKeys[index]!,
          value: JSON.stringify(event)
        }))
      });

      const learningRoute = async (route: Route) => {
        const request = route.request();
        if (!learningRequestContainsIds(request, eventIds)) {
          await route.continue();
          return;
        }
        if (allowValidServer) {
          await route.continue();
          return;
        }

        relevantAttempts += 1;
        const startedAtMs = Date.now();
        const sentIds = learningRequestEventIds(request);
        expect(learningRequestGeneration(request)).toBe(0);
        if (relevantAttempts === 1) {
          await route.fulfill({
            body: JSON.stringify(exactLearningAcknowledgement(
              sentIds,
              `${student.userId}-wrong`,
              0
            )),
            contentType: "application/json",
            status: 200
          });
        } else {
          await route.fulfill({
            body: "{corrupt-json",
            contentType: "application/json",
            status: 200
          });
        }
        evidence.push({
          durationMs: Math.max(0, Date.now() - startedAtMs),
          failure: null,
          label: relevantAttempts === 1
            ? "learning-browser:invalid-ack"
            : "learning-browser:corrupt-ack",
          outcome: "finished",
          startedAt: new Date(startedAtMs).toISOString(),
          status: 200
        });
      };
      await page.route(routePattern, learningRoute);
      await timedStep(evidence, "learning-browser:invalid-ack-reload", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect.poll(() => relevantAttempts).toBeGreaterThanOrEqual(2);
      });

      expect(await localStorageValues(page, storageKeys)).toEqual([
        expect.any(String),
        expect.any(String)
      ]);

      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      allowValidServer = true;
      const validReplayResponse = page.waitForResponse((response) =>
        response.status() === 200 && learningRequestContainsIds(response.request(), eventIds)
      );
      await timedStep(evidence, "learning-browser:valid-remount", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        const response = await validReplayResponse;
        const payload = await response.json() as LearningDelivery;
        const sentIds = learningRequestEventIds(response.request());
        expect(learningRequestGeneration(response.request())).toBe(0);
        expect(sentIds).toEqual(expect.arrayContaining(eventIds));
        expect(payload).toEqual(expect.objectContaining({
          acknowledgedUserId: student.userId,
          durablyPersisted: true,
          generation: 0
        }));
        expect(payload.ignored).not.toBe(true);
        expect(payload.acknowledgedEventIds?.slice().sort()).toEqual(sentIds.slice().sort());
        expect(payload.dispositions?.map((entry) => entry.id).sort()).toEqual(sentIds.slice().sort());
        expect(payload.dispositions?.every((entry) =>
          entry.disposition === "inserted" || entry.disposition === "already-persisted"
        )).toBe(true);
        await expect.poll(async () => await localStorageValues(page, storageKeys)).toEqual([null, null]);
      });
      await page.unroute(routePattern, learningRoute);
    } finally {
      await attachDurationEvidence(testInfo, evidence);
    }
  });

  test("cross-tab cookie revalidation keeps A duration durable and out of B analytics", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/learning-events";
    const observedDeliveries: Array<{
      eventIds: string[];
      generation: number | null;
      owner: string | null;
    }> = [];
    const bInsertedIds = new Set<string>();
    let peerPage: Page | null = null;
    try {
      const studentA = await registerMainlandStudent(page, testInfo, evidence, "identity-a");
      const learningRoute = async (route: Route) => {
        const request = route.request();
        if (!isApiPost(request, "/api/learning-events")) {
          await route.continue();
          return;
        }
        const startedAtMs = Date.now();
        const owner = learningRequestOwner(request);
        const eventIds = learningRequestEventIds(request);
        const generation = learningRequestGeneration(request);
        observedDeliveries.push({ eventIds, generation, owner });

        if (owner === studentA.userId && eventIds.length > 0) {
          await route.fulfill({
            body: JSON.stringify({
              accepted: 0,
              acknowledgedEventIds: [],
              durablyPersisted: false,
              reason: "injected-a-retention"
            }),
            contentType: "application/json",
            status: 503
          });
          evidence.push({
            durationMs: Math.max(0, Date.now() - startedAtMs),
            failure: null,
            label: "identity-switch:a-retained-503",
            outcome: "finished",
            startedAt: new Date(startedAtMs).toISOString(),
            status: 503
          });
          return;
        }

        const upstream = await route.fetch();
        const body = await upstream.body();
        if (owner && upstream.status() === 200) {
          const payload = JSON.parse(body.toString("utf8")) as LearningDelivery;
          payload.dispositions?.forEach((entry) => {
            if (entry.disposition === "inserted" && typeof entry.id === "string") {
              bInsertedIds.add(entry.id);
            }
          });
        }
        await route.fulfill({
          body,
          headers: upstream.headers(),
          status: upstream.status()
        });
        evidence.push({
          durationMs: Math.max(0, Date.now() - startedAtMs),
          failure: null,
          label: owner === studentA.userId
            ? "identity-switch:a-generation-handshake"
            : "identity-switch:b-server-delivery",
          outcome: "finished",
          startedAt: new Date(startedAtMs).toISOString(),
          status: upstream.status()
        });
      };
      await page.route(routePattern, learningRoute);
      await timedStep(evidence, "identity-switch:open-a-dashboard", async () => {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      });
      await expect.poll(async () =>
        (await learningOutboxRecordsForUser(page, studentA.userId)).length
      ).toBeGreaterThan(0);

      const durationStartedAt = Date.now();
      await expect.poll(() => Date.now() - durationStartedAt).toBeGreaterThanOrEqual(5_200);

      peerPage = await page.context().newPage();
      await peerPage.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      const studentB = await registerMainlandStudent(
        peerPage,
        testInfo,
        evidence,
        "identity-b"
      );
      const bDeliveryResponse = page.waitForResponse((response) =>
        response.status() === 200 &&
        isApiPost(response.request(), "/api/learning-events") &&
        learningRequestOwner(response.request()) === studentB.userId &&
        learningRequestEventIds(response.request()).length > 0
      );
      const revalidationResponse = page.waitForResponse((response) =>
        response.status() === 200 &&
        new URL(response.url()).pathname === "/api/auth/session-state"
      );
      await timedStep(evidence, "identity-switch:cross-tab-revalidate", async () => {
        await peerPage!.evaluate(({ syncKey, userId }) => {
          window.localStorage.setItem(syncKey, JSON.stringify({ at: Date.now(), userId }));
        }, {
          syncKey: "hk-math-session-sync",
          userId: studentB.userId
        });
        const response = await revalidationResponse;
        const payload = await response.json() as { user?: { id?: string } };
        expect(payload.user?.id).toBe(studentB.userId);
      });
      await page.bringToFront();

      await expect.poll(async () =>
        (await learningOutboxRecordsForUser(page, studentA.userId)).some((record) =>
          typeof record.value.durationSeconds === "number" && record.value.durationSeconds >= 5
        )
      ).toBe(true);
      const aRecords = await learningOutboxRecordsForUser(page, studentA.userId);
      const aEventIds = aRecords
        .map((record) => record.value.id)
        .filter((eventId): eventId is string => typeof eventId === "string");
      expect(aEventIds.length).toBeGreaterThan(0);

      const bDelivery = await bDeliveryResponse;
      const bPayload = await bDelivery.json() as LearningDelivery;
      const bSentIds = learningRequestEventIds(bDelivery.request());
      expect(learningRequestGeneration(bDelivery.request())).toBe(0);
      expect(bPayload.acknowledgedEventIds?.slice().sort()).toEqual(bSentIds.slice().sort());
      expect(bSentIds.some((eventId) => aEventIds.includes(eventId))).toBe(false);
      expect(observedDeliveries.filter((delivery) => delivery.owner === studentB.userId).every((delivery) =>
        delivery.generation === 0 && delivery.eventIds.every((eventId) => !aEventIds.includes(eventId))
      )).toBe(true);

      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      const bSummary = await readJson<{
        summary?: { eventCount?: number };
      }>(await timedApiResponse(evidence, "identity-switch:b-summary", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(studentB.grade)}&window=7d`)
      ), 200);
      expect(bInsertedIds.size).toBeGreaterThan(0);
      expect(bSummary.summary?.eventCount).toBe(bInsertedIds.size);

      const bRecords = await learningOutboxRecordsForUser(page, studentB.userId);
      expect(bRecords.some((record) => aEventIds.includes(String(record.value.id)))).toBe(false);
      expect((await learningOutboxRecordsForUser(page, studentA.userId)).map((record) => record.value.id)).toEqual(
        expect.arrayContaining(aEventIds)
      );
      await page.unroute(routePattern, learningRoute);
    } finally {
      await peerPage?.close();
      await attachDurationEvidence(testInfo, evidence);
    }
  });

  test("fresh generation-zero device handshakes before recording against a generation-one server", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/learning-events";
    let learningRoute: ((route: Route) => Promise<void>) | null = null;
    const observedBatches: Array<{
      eventIds: string[];
      events: ReturnType<typeof learningRequestEvents>;
      generation: number | null;
      payload: LearningDelivery;
      status: number;
    }> = [];
    try {
      const student = await registerMainlandStudent(page, testInfo, evidence, "fresh-device-handshake");
      const clearDelivery = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "fresh-device:server-clear-to-generation-one", () =>
          page.request.delete("/api/learning-events", {
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expectExactLearningAnalyticsClearAcknowledgement(
        clearDelivery,
        student.userId,
        0,
        1
      );

      await page.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      const generationKey = learningAnalyticsGenerationStorageKey(student.userId);
      const outboxPrefix = learningAnalyticsOutboxStorageKey(student.userId);
      await page.evaluate(({ generationStorageKey, userOutboxPrefix }) => {
        const staleKeys: string[] = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (key?.startsWith(userOutboxPrefix)) staleKeys.push(key);
        }
        staleKeys.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.removeItem(generationStorageKey);
      }, {
        generationStorageKey: generationKey,
        userOutboxPrefix: outboxPrefix
      });
      expect(await localStorageValues(page, [generationKey])).toEqual([null]);

      learningRoute = async (route: Route) => {
        const request = route.request();
        if (!isApiPost(request, "/api/learning-events")) {
          await route.continue();
          return;
        }
        const startedAtMs = Date.now();
        const eventIds = learningRequestEventIds(request);
        const events = learningRequestEvents(request);
        const generation = learningRequestGeneration(request);
        const upstream = await route.fetch();
        const body = await upstream.body();
        const payload = JSON.parse(body.toString("utf8")) as LearningDelivery;
        observedBatches.push({
          eventIds,
          events,
          generation,
          payload,
          status: upstream.status()
        });
        await route.fulfill({
          body,
          headers: upstream.headers(),
          status: upstream.status()
        });
        evidence.push({
          durationMs: Math.max(0, Date.now() - startedAtMs),
          failure: null,
          label: eventIds.length === 0
            ? "fresh-device:generation-handshake"
            : "fresh-device:current-generation-delivery",
          outcome: "finished",
          startedAt: new Date(startedAtMs).toISOString(),
          status: upstream.status()
        });
      };
      await page.route(routePattern, learningRoute);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect.poll(() => observedBatches.length).toBeGreaterThanOrEqual(1);

      const handshake = observedBatches[0]!;
      expect(handshake).toEqual(expect.objectContaining({
        eventIds: [],
        generation: 0,
        status: 409
      }));
      expect(handshake.payload).toEqual(expect.objectContaining({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: student.userId,
        currentGeneration: 1,
        dispositions: [],
        durablyPersisted: false,
        reason: "generation-mismatch"
      }));
      expect(observedBatches.some((batch) =>
        batch.generation === 0 && batch.eventIds.length > 0
      )).toBe(false);

      await expect.poll(() => observedBatches.some((batch) =>
        batch.generation === clearDelivery.generation &&
        batch.status === 200 &&
        batch.events.some((event) =>
          event.type === "page-view" &&
          event.source === "dashboard" &&
          event.topicId === "dashboard"
        )
      ), {
        message: "The initial dashboard page-view must wait for and use the authoritative generation.",
        timeout: 5_000
      }).toBe(true);
      expect(observedBatches.some((batch) =>
        batch.generation === 0 && batch.eventIds.length > 0
      )).toBe(false);
      const currentBatches = observedBatches.filter((batch) =>
        batch.generation === 1 && batch.status === 200 && batch.eventIds.length > 0
      );
      expect(currentBatches).toHaveLength(1);
      const currentBatch = currentBatches[0]!;
      const authoritativeDashboardPageViews = currentBatch.events.filter((event) =>
        event.type === "page-view" &&
        event.source === "dashboard" &&
        event.topicId === "dashboard"
      );
      expect(
        currentBatch.events,
        "A fresh device must emit only its one deferred initial dashboard page-view after authoritative activation."
      ).toHaveLength(1);
      expect(authoritativeDashboardPageViews).toHaveLength(1);
      const authoritativePageViewId = authoritativeDashboardPageViews[0]!.id;
      if (typeof authoritativePageViewId !== "string" || authoritativePageViewId.length === 0) {
        throw new Error("The authoritative initial dashboard page-view must expose one non-empty ID.");
      }
      expect(currentBatch.eventIds).toEqual([authoritativePageViewId]);
      expect(currentBatch.payload.acknowledgedEventIds?.slice().sort()).toEqual(
        currentBatch.eventIds.slice().sort()
      );
      expect(currentBatch.payload.dispositions?.every((entry) =>
        entry.disposition === "inserted" || entry.disposition === "already-persisted"
      )).toBe(true);
      expect(await localStorageValues(page, [generationKey])).toEqual(["1"]);
      await expect.poll(async () =>
        (await allLearningOutboxRecordsForUser(page, student.userId))
          .filter((record) => record.value.id === authoritativePageViewId)
      ).toEqual([]);
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      expect(observedBatches.filter((batch) =>
        batch.generation === clearDelivery.generation &&
        batch.status === 200 &&
        batch.eventIds.length > 0
      )).toHaveLength(1);

      const insertedIds = new Set(
        currentBatch.payload.dispositions
          ?.filter((entry) => entry.disposition === "inserted")
          .map((entry) => entry.id)
          .filter((eventId): eventId is string => typeof eventId === "string") ?? []
      );
      const summary = await readJson<{
        summary?: { eventCount?: number };
      }>(await timedApiResponse(evidence, "fresh-device:summary-after-handshake", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(insertedIds).toEqual(new Set([authoritativePageViewId]));
      expect(summary.summary?.eventCount).toBe(1);
      expect(durableLearningEventRows(student.userId)).toEqual([{
        duration_seconds: null,
        id: authoritativePageViewId,
        source: "dashboard",
        topic_id: "dashboard",
        type: "page-view"
      }]);
    } finally {
      try {
        if (learningRoute && !page.isClosed()) {
          await page.unroute(routePattern, learningRoute);
        }
      } finally {
        await attachDurationEvidence(testInfo, evidence);
      }
    }
  });

  test("clear generation fences a late pre-clear ACK and persists a new-generation event", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/learning-events";
    let peerPage: Page | null = null;
    let learningRoute: ((route: Route) => Promise<void>) | null = null;
    let releaseLateResponse!: () => void;
    let resolveHeldRoute!: () => void;
    const lateResponseGate = new Promise<void>((resolve) => {
      releaseLateResponse = resolve;
    });
    let oldAccepted = false;
    const heldRouteFinished = new Promise<void>((resolve) => {
      resolveHeldRoute = resolve;
    });
    let heldRouteStarted = false;
    let heldRouteSettled = false;
    let oldServerDelivery: LearningDelivery | null = null;
    let oldSentIds: string[] = [];
    let oldRequestGeneration: number | null = null;
    let oldUpstreamStatus: number | null = null;
    const postClearOldReplays: Array<{
      eventIds: string[];
      generation: number | null;
    }> = [];
    try {
      const student = await registerMainlandStudent(page, testInfo, evidence, "clear-generation");
      await page.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      const generationKey = learningAnalyticsGenerationStorageKey(student.userId);
      const [storedGeneration] = await localStorageValues(page, [generationKey]);
      const fixtureGeneration = storedGeneration === null
        ? 0
        : Number(storedGeneration);
      requireNonNegativeSafeInteger(fixtureGeneration, "The fixture generation");
      const oldEvent = withLearningAnalyticsDeliveryGeneration({
        id: `pre-clear-inflight-${student.userId}`,
        type: "page-view",
        source: "visualization-lab",
        timestamp: new Date().toISOString(),
        grade: student.grade,
        topicId: "pre-clear-inflight",
        durationSeconds: 19
      }, fixtureGeneration);
      const oldStorageKey = learningAnalyticsOutboxRecordStorageKey(student.userId, oldEvent);
      await page.evaluate(({ key, value }) => {
        window.localStorage.setItem(key, value);
      }, { key: oldStorageKey, value: JSON.stringify(oldEvent) });

      learningRoute = async (route: Route) => {
        const request = route.request();
        if (!learningRequestContainsIds(request, [oldEvent.id])) {
          await route.continue();
          return;
        }
        const requestGeneration = learningRequestGeneration(request);
        const requestEventIds = learningRequestEventIds(request);
        if (heldRouteStarted) {
          postClearOldReplays.push({
            eventIds: requestEventIds,
            generation: requestGeneration
          });
          await route.continue();
          return;
        }
        heldRouteStarted = true;
        const startedAtMs = Date.now();
        oldSentIds = requestEventIds;
        oldRequestGeneration = requestGeneration;
        const upstream = await route.fetch();
        oldUpstreamStatus = upstream.status();
        const body = await upstream.body();
        oldServerDelivery = JSON.parse(body.toString("utf8")) as LearningDelivery;
        oldAccepted = true;
        await lateResponseGate;
        try {
          await route.fulfill({
            body,
            headers: upstream.headers(),
            status: upstream.status()
          });
        } catch {
          // Adopting the clear generation is allowed to abort the stale client request.
        } finally {
          evidence.push({
            durationMs: Math.max(0, Date.now() - startedAtMs),
            failure: null,
            label: "clear-generation:late-generation-zero-response",
            outcome: "finished",
            startedAt: new Date(startedAtMs).toISOString(),
            status: upstream.status()
          });
          heldRouteSettled = true;
          resolveHeldRoute();
        }
      };
      await page.route(routePattern, learningRoute);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect.poll(() => oldAccepted, { timeout: 5_000 }).toBe(true);
      const capturedOldGeneration = requireNonNegativeSafeInteger(
        oldRequestGeneration,
        "The first held learning-event request generation"
      );
      expect(capturedOldGeneration).toBe(fixtureGeneration);
      expect(oldUpstreamStatus).toBe(200);
      expect(oldServerDelivery).toEqual(exactLearningAcknowledgement(
        oldSentIds,
        student.userId,
        capturedOldGeneration,
        "inserted"
      ));

      const wrongOwnerClear = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "clear-generation:wrong-owner-delete", () =>
          page.request.delete("/api/learning-events", {
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(`${student.userId}-wrong`)
            }
          })
        ),
        409
      );
      expect(wrongOwnerClear).toEqual(expect.objectContaining({
        acknowledgedEventIds: [],
        durablyPersisted: false,
        ignored: true,
        reason: "identity-mismatch"
      }));

      const clearDelivery = await readJson<LearningDelivery>(
        await timedApiResponse(evidence, "clear-generation:exact-owner-delete", () =>
          page.request.delete("/api/learning-events", {
            headers: {
              "X-MAIS-Analytics-User-Id": encodeURIComponent(student.userId)
            }
          })
        ),
        200
      );
      expectExactLearningAnalyticsClearAcknowledgement(
        clearDelivery,
        student.userId,
        capturedOldGeneration,
        capturedOldGeneration + 1
      );
      const nextGeneration = capturedOldGeneration + 1;

      peerPage = await page.context().newPage();
      await peerPage.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      await peerPage.evaluate(({ generation, key }) => {
        window.localStorage.setItem(key, generation);
      }, { generation: String(nextGeneration), key: generationKey });
      await expect.poll(async () =>
        (await localStorageValues(page, [generationKey, oldStorageKey]))
      ).toEqual([String(nextGeneration), null]);

      const newEvent = withLearningAnalyticsDeliveryGeneration({
        id: `post-clear-current-${student.userId}`,
        type: "page-view",
        source: "visualization-lab",
        timestamp: new Date(Date.now() + 1).toISOString(),
        grade: student.grade,
        topicId: "post-clear-current",
        durationSeconds: 23
      }, nextGeneration);
      const newStorageKey = learningAnalyticsOutboxRecordStorageKey(student.userId, newEvent);
      await page.evaluate(({ key, value }) => {
        window.localStorage.setItem(key, value);
      }, { key: newStorageKey, value: JSON.stringify(newEvent) });
      const currentDeliveryResponse = page.waitForResponse((response) =>
        response.status() === 200 &&
        learningRequestContainsIds(response.request(), [newEvent.id])
      );

      releaseLateResponse();
      await heldRouteFinished;
      expect(await localStorageValues(page, [oldStorageKey, newStorageKey])).toEqual([
        null,
        expect.any(String)
      ]);
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      const currentResponse = await currentDeliveryResponse;
      const currentPayload = await currentResponse.json() as LearningDelivery;
      const currentSentIds = learningRequestEventIds(currentResponse.request());
      expect(learningRequestGeneration(currentResponse.request())).toBe(nextGeneration);
      expect(
        postClearOldReplays,
        "A late pre-clear ACK must not requeue any pre-clear event in the new generation."
      ).toEqual([]);
      expect(currentSentIds.some((eventId) => oldSentIds.includes(eventId))).toBe(false);
      expect(currentPayload.acknowledgedEventIds?.slice().sort()).toEqual(currentSentIds.slice().sort());
      expect(currentPayload).toEqual(expect.objectContaining({
        acknowledgedUserId: student.userId,
        durablyPersisted: true,
        generation: nextGeneration
      }));
      await expect.poll(async () =>
        (await localStorageValues(page, [newStorageKey]))[0]
      ).toBeNull();

      const summary = await readJson<{
        summary?: { counts?: { pageViews?: number }; eventCount?: number };
      }>(await timedApiResponse(evidence, "clear-generation:summary-current-only", () =>
        page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
      ), 200);
      expect(summary.summary?.eventCount).toBe(1);
      expect(summary.summary?.counts?.pageViews).toBe(1);
    } finally {
      releaseLateResponse?.();
      try {
        if (heldRouteStarted) {
          await expect.poll(() => heldRouteSettled, { timeout: 5_000 }).toBe(true);
        }
      } finally {
        try {
          if (learningRoute && !page.isClosed()) {
            try {
              await page.unroute(routePattern, learningRoute);
            } catch (error) {
              if (!page.isClosed()) throw error;
            }
          }
        } finally {
          if (peerPage && !peerPage.isClosed()) await peerPage.close();
          await attachDurationEvidence(testInfo, evidence);
        }
      }
    }
  });

  test("same-user peer clear marker cannot restamp old React rows and preserves one post-marker terminal event", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/learning-events";
    let peerPage: Page | null = null;
    let learningRoute: ((route: Route) => Promise<void>) | null = null;
    let releaseLateResponse!: () => void;
    let resolveHeldRoute!: () => void;
    const lateResponseGate = new Promise<void>((resolve) => {
      releaseLateResponse = resolve;
    });
    const heldRouteFinished = new Promise<void>((resolve) => {
      resolveHeldRoute = resolve;
    });
    let heldRouteStarted = false;
    let heldRouteSettled = false;
    let oldAccepted = false;
    let oldServerDelivery: LearningDelivery | null = null;
    let oldSentIds: string[] = [];
    let oldRequestGeneration: number | null = null;
    let oldUpstreamStatus: number | null = null;
    const postMarkerRequests: Array<{
      eventIds: string[];
      events: ReturnType<typeof learningRequestEvents>;
      generation: number | null;
    }> = [];
    const postClearOldReplays: Array<{
      eventIds: string[];
      generation: number | null;
    }> = [];
    try {
      const student = await registerMainlandStudent(page, testInfo, evidence, "peer-clear-marker");
      await page.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      const generationKey = learningAnalyticsGenerationStorageKey(student.userId);
      const clearFenceKey = learningAnalyticsClearFenceStorageKey(student.userId);
      const confirmedPrefix = learningAnalyticsOutboxStorageKey(student.userId);
      const unconfirmedPrefix = unconfirmedLearningAnalyticsOutboxStorageKey(student.userId);
      const [storedGeneration] = await localStorageValues(page, [generationKey]);
      const fixtureGeneration = storedGeneration === null ? 0 : Number(storedGeneration);
      requireNonNegativeSafeInteger(fixtureGeneration, "The peer-clear fixture generation");

      const oldEvent = withLearningAnalyticsDeliveryGeneration({
        id: `peer-pre-clear-${student.userId}`,
        type: "page-view",
        source: "visualization-lab",
        timestamp: new Date().toISOString(),
        grade: student.grade,
        topicId: "peer-pre-clear",
        durationSeconds: 19
      }, fixtureGeneration);
      const oldStorageKey = learningAnalyticsOutboxRecordStorageKey(student.userId, oldEvent);
      await page.evaluate(({ key, value }) => {
        window.localStorage.setItem(key, value);
      }, { key: oldStorageKey, value: JSON.stringify(oldEvent) });

      learningRoute = async (route: Route) => {
        const request = route.request();
        if (!isApiPost(request, "/api/learning-events")) {
          await route.continue();
          return;
        }
        const requestEventIds = learningRequestEventIds(request);
        const requestGeneration = learningRequestGeneration(request);
        const requestEvents = learningRequestEvents(request);
        if (!requestEventIds.includes(oldEvent.id)) {
          postMarkerRequests.push({
            eventIds: requestEventIds,
            events: requestEvents,
            generation: requestGeneration
          });
          await route.continue();
          return;
        }
        if (heldRouteStarted) {
          postClearOldReplays.push({
            eventIds: requestEventIds,
            generation: requestGeneration
          });
          await route.continue();
          return;
        }

        heldRouteStarted = true;
        oldSentIds = requestEventIds;
        oldRequestGeneration = requestGeneration;
        const startedAtMs = Date.now();
        const upstream = await route.fetch();
        oldUpstreamStatus = upstream.status();
        oldAccepted = true;
        const body = await upstream.body();
        oldServerDelivery = JSON.parse(body.toString("utf8")) as LearningDelivery;
        await lateResponseGate;
        try {
          await route.fulfill({
            body,
            headers: upstream.headers(),
            status: upstream.status()
          });
        } catch {
          // The peer generation boundary may abort this stale client request.
        } finally {
          evidence.push({
            durationMs: Math.max(0, Date.now() - startedAtMs),
            failure: null,
            label: "peer-clear:late-pre-marker-response",
            outcome: "finished",
            startedAt: new Date(startedAtMs).toISOString(),
            status: upstream.status()
          });
          heldRouteSettled = true;
          resolveHeldRoute();
        }
      };
      await page.route(routePattern, learningRoute);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect.poll(() => oldAccepted, { timeout: 5_000 }).toBe(true);
      expect(oldRequestGeneration).toBe(fixtureGeneration);
      expect(oldUpstreamStatus).toBe(200);
      expect(oldServerDelivery).toEqual(exactLearningAcknowledgement(
        oldSentIds,
        student.userId,
        fixtureGeneration,
        "inserted"
      ));

      // Keep this real page visible long enough that the peer marker's
      // freeze produces a genuine terminal duration event through the
      // provider, rather than a test-seeded post-boundary record.
      await page.waitForTimeout(5_100);
      peerPage = await page.context().newPage();
      await peerPage.goto("/robots.txt", { waitUntil: "domcontentloaded" });
      const expectedNextGeneration = fixtureGeneration + 1;
      const terminalDelivery = page.waitForResponse((response) => {
        if (response.status() !== 200) return false;
        const request = response.request();
        if (learningRequestGeneration(request) !== expectedNextGeneration) return false;
        return learningRequestEvents(request).some((event) =>
          event.type === "page-view" &&
          event.source === "dashboard" &&
          event.topicId === "dashboard" &&
          typeof event.durationSeconds === "number" &&
          event.durationSeconds >= 5
        );
      });

      const peerClear = await peerPage.evaluate(async ({
        baseGeneration,
        clearFenceStorageKey,
        confirmedStoragePrefix,
        encodedUserId,
        lockName,
        unconfirmedStoragePrefix,
        userId
      }) => {
        if (!navigator.locks || typeof navigator.locks.request !== "function") {
          throw new Error("The exact-user peer clear requires the Web Locks API.");
        }
        return navigator.locks.request(lockName, { mode: "exclusive" }, async () => {
          const clearedStorageKeys: string[] = [];
          for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);
            if (
              key &&
              (key.startsWith(confirmedStoragePrefix) || key.startsWith(unconfirmedStoragePrefix))
            ) clearedStorageKeys.push(key);
          }
          clearedStorageKeys.sort();
          const requestedAt = new Date().toISOString();
          const requestId = `peer-clear-${userId}-${Date.now()}`;
          const collectingMarker = {
            version: 2,
            phase: "collecting",
            userId,
            baseGeneration,
            requestedAt,
            requestId,
            deleteAttemptedAt: null,
            clearedStorageKeys,
            clearedCompletionStorageKeys: [],
            completionClaims: []
          };
          // This storage write is the peer-owned writer linearization point.
          window.localStorage.setItem(clearFenceStorageKey, JSON.stringify(collectingMarker));
          const preparedMarker = { ...collectingMarker, phase: "prepared" };
          window.localStorage.setItem(clearFenceStorageKey, JSON.stringify(preparedMarker));
          clearedStorageKeys.forEach((key) => window.localStorage.removeItem(key));
          const attemptedMarker = {
            ...preparedMarker,
            deleteAttemptedAt: new Date().toISOString()
          };
          window.localStorage.setItem(clearFenceStorageKey, JSON.stringify(attemptedMarker));
          const response = await fetch("/api/learning-events", {
            method: "DELETE",
            headers: {
              "X-MAIS-Analytics-User-Id": encodedUserId
            }
          });
          return {
            clearedStorageKeys,
            payload: await response.json() as unknown,
            status: response.status
          };
        });
      }, {
        baseGeneration: fixtureGeneration,
        clearFenceStorageKey: clearFenceKey,
        confirmedStoragePrefix: confirmedPrefix,
        encodedUserId: encodeURIComponent(student.userId),
        lockName: `mais:learning-analytics-clear:${encodeURIComponent(student.userId)}`,
        unconfirmedStoragePrefix: unconfirmedPrefix,
        userId: student.userId
      });
      expect(peerClear.clearedStorageKeys).toContain(oldStorageKey);
      expect(peerClear.status).toBe(200);
      expectExactLearningAnalyticsClearAcknowledgement(
        peerClear.payload as LearningDelivery,
        student.userId,
        fixtureGeneration,
        expectedNextGeneration
      );

      const terminalResponse = await terminalDelivery;
      const terminalEvents = learningRequestEvents(terminalResponse.request()).filter((event) =>
        event.type === "page-view" &&
        event.source === "dashboard" &&
        event.topicId === "dashboard" &&
        typeof event.durationSeconds === "number" &&
        event.durationSeconds >= 5
      );
      expect(terminalEvents).toHaveLength(1);
      const terminalEventId = terminalEvents[0]!.id;
      if (typeof terminalEventId !== "string" || terminalEventId.length === 0) {
        throw new Error("The post-marker terminal page-view must expose one non-empty ID.");
      }
      const terminalRequestIds = learningRequestEventIds(terminalResponse.request());
      expect(terminalRequestIds).toEqual([terminalEventId]);
      const terminalPayload = await terminalResponse.json() as LearningDelivery;
      expect(terminalPayload).toEqual(exactLearningAcknowledgement(
        terminalRequestIds,
        student.userId,
        expectedNextGeneration,
        "inserted"
      ));

      releaseLateResponse();
      await heldRouteFinished;
      await expect.poll(async () =>
        localStorageValues(page, [generationKey, clearFenceKey])
      ).toEqual([String(expectedNextGeneration), null]);
      await expect.poll(async () =>
        (await allLearningOutboxRecordsForUser(page, student.userId))
          .filter((record) => record.value.id === oldEvent.id || record.value.id === terminalEventId)
      ).toEqual([]);
      expect(postClearOldReplays).toEqual([]);

      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      const remountDelivery = page.waitForResponse((response) => {
        if (response.status() !== 200) return false;
        const request = response.request();
        return learningRequestGeneration(request) === expectedNextGeneration &&
          learningRequestEvents(request).some((event) =>
            event.type === "page-view" &&
            event.source === "dashboard" &&
            event.topicId === "dashboard" &&
            event.id !== terminalEventId &&
            typeof event.durationSeconds === "undefined"
          );
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      const remountResponse = await remountDelivery;
      const remountEvents = learningRequestEvents(remountResponse.request());
      expect(remountEvents).toHaveLength(1);
      const remountEvent = remountEvents[0]!;
      expect(remountEvent).toEqual(expect.objectContaining({
        source: "dashboard",
        topicId: "dashboard",
        type: "page-view"
      }));
      expect(remountEvent.durationSeconds).toBeUndefined();
      const remountEventId = remountEvent.id;
      if (typeof remountEventId !== "string" || remountEventId.length === 0) {
        throw new Error("The remounted initial dashboard page-view must expose one non-empty ID.");
      }
      const remountRequestIds = learningRequestEventIds(remountResponse.request());
      expect(remountRequestIds).toEqual([remountEventId]);
      expect(remountRequestIds).not.toContain(oldEvent.id);
      expect(remountRequestIds).not.toContain(terminalEventId);
      const remountPayload = await remountResponse.json() as LearningDelivery;
      expect(remountPayload).toEqual(exactLearningAcknowledgement(
        remountRequestIds,
        student.userId,
        expectedNextGeneration,
        "inserted"
      ));
      await expect.poll(async () =>
        (await allLearningOutboxRecordsForUser(page, student.userId))
          .filter((record) => record.value.id === oldEvent.id || record.value.id === terminalEventId)
      ).toEqual([]);
      expect(postClearOldReplays).toEqual([]);
      expect(
        postMarkerRequests.filter((request) => request.eventIds.includes(terminalEventId))
      ).toHaveLength(1);

      await expect.poll(() => durableLearningEventRows(student.userId).filter((event) =>
        event.id === terminalEventId
      )).toEqual([expect.objectContaining({
        duration_seconds: expect.any(Number),
        id: terminalEventId,
        source: "dashboard",
        topic_id: "dashboard",
        type: "page-view"
      })]);
      const durableRows = durableLearningEventRows(student.userId);
      expect(durableRows).toHaveLength(2);
      expect(durableRows).toEqual(expect.arrayContaining([
        {
          duration_seconds: terminalEvents[0]!.durationSeconds,
          id: terminalEventId,
          source: "dashboard",
          topic_id: "dashboard",
          type: "page-view"
        },
        {
          duration_seconds: null,
          id: remountEventId,
          source: "dashboard",
          topic_id: "dashboard",
          type: "page-view"
        }
      ]));
      expect(durableRows.some((event) => event.id === oldEvent.id)).toBe(false);
      expect(new Set(durableRows.map((event) => event.id)).size).toBe(2);
      expect(durableRows
        .filter((event) => typeof event.duration_seconds === "number" && event.duration_seconds >= 5)
        .map((event) => event.id)
      ).toEqual([terminalEventId]);

      const summary = await readJson<{ summary?: { eventCount?: number } }>(
        await timedApiResponse(evidence, "peer-clear:summary-after-remount", () =>
          page.request.get(`/api/analytics/summary?grade=${encodeURIComponent(student.grade)}&window=7d`)
        ),
        200
      );
      expect(summary.summary?.eventCount).toBe(durableRows.length);
    } finally {
      releaseLateResponse?.();
      try {
        if (heldRouteStarted) {
          await expect.poll(() => heldRouteSettled, { timeout: 5_000 }).toBe(true);
        }
      } finally {
        try {
          if (learningRoute && !page.isClosed()) {
            try {
              await page.unroute(routePattern, learningRoute);
            } catch (error) {
              if (!page.isClosed()) throw error;
            }
          }
        } finally {
          if (peerPage && !peerPage.isClosed()) await peerPage.close();
          await attachDurationEvidence(testInfo, evidence);
        }
      }
    }
  });

  test("failed visualization POST remains exact in outbox and a remounted provider replays it", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const routePattern = "**/api/visualization-sessions";
    const identity = visualizationIdentity(failedReplayLab);
    let failSessionPosts = true;
    let failedAttempts = 0;
    let firstRequestTrace: VisualizationOutboxTraceEntry[] | null = null;
    try {
      const student = await registerMainlandStudent(
        page,
        testInfo,
        evidence,
        "session-browser-replay",
        failedReplayLab
      );
      const outboxKey = visualizationSessionOutboxStorageKey({
        userId: student.userId,
        moduleId: identity.moduleId,
        topicId: identity.topicId
      });
      await installVisualizationOutboxUpdateTrace(page);
      await timedStep(evidence, "session-browser:open-failing-lab", async () => {
        await page.goto(buildVisualizationLabHref(failedReplayLab), { waitUntil: "domcontentloaded" });
        await closeLearnerStartSetupIfVisible(page);
      });

      const sessionRoute = async (route: Route) => {
        const request = route.request();
        if (!matchesSessionRequest(request, identity) || !failSessionPosts) {
          await route.continue();
          return;
        }
        failedAttempts += 1;
        const startedAtMs = Date.now();
        const traceBeforeNetwork = await readVisualizationOutboxUpdateTrace(page);
        if (firstRequestTrace === null) firstRequestTrace = traceBeforeNetwork;
        await route.fulfill({
          body: JSON.stringify({ error: "Injected visualization persistence failure." }),
          contentType: "application/json",
          status: 503
        });
        evidence.push({
          durationMs: Math.max(0, Date.now() - startedAtMs),
          failure: null,
          label: "session-browser:injected-503",
          outcome: "finished",
          startedAt: new Date(startedAtMs).toISOString(),
          status: 503
        });
      };
      await page.route(routePattern, sessionRoute);

      const card = page.locator(
        `[data-viz-card][data-viz-module-id=${JSON.stringify(identity.moduleId)}]` +
        `[data-viz-topic-id=${JSON.stringify(identity.topicId)}]`
      );
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-viz-explore-gate", /awaiting-interaction|dwell|engaged/);
      await card.locator("[data-viz-card-body]").click({ position: { x: 12, y: 12 } });
      await expect.poll(() => failedAttempts).toBeGreaterThanOrEqual(1);
      await expect(card).toHaveAttribute("data-viz-save-state", "error");
      const physicalOutboxKey = expectEnqueueDispatchBeforeNetwork(firstRequestTrace ?? [], outboxKey, {
        userId: student.userId,
        moduleId: identity.moduleId,
        source: identity.source,
        topicId: identity.topicId
      });

      const durableRecord = await page.evaluate((key) => {
        const serialized = window.localStorage.getItem(key);
        return serialized ? JSON.parse(serialized) as unknown : null;
      }, physicalOutboxKey) as VisualizationSessionOutboxRecord | null;
      expect(durableRecord).toEqual(expect.objectContaining({
        userId: student.userId,
        moduleId: identity.moduleId,
        source: identity.source,
        topicId: identity.topicId,
        queuedAt: expect.any(Number)
      }));

      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      failSessionPosts = false;
      const replayResponse = page.waitForResponse((response) =>
        response.status() === 200 && matchesSessionRequest(response.request(), identity)
      );
      await timedStep(evidence, "session-browser:provider-remount-replay", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        const response = await replayResponse;
        const delivery = await response.json() as VisualizationDelivery;
        expect(delivery).toEqual(expect.objectContaining({
          acknowledgedUserId: student.userId,
          durablyPersisted: true,
          session: expect.objectContaining(identity)
        }));
        await expect.poll(async () =>
          (await localStorageValues(page, [physicalOutboxKey]))[0]
        ).toBeNull();
      });

      const sessions = await readJson<{ sessions?: VisualizationSession[] }>(
        await timedApiResponse(evidence, "session-browser:get-after-replay", () =>
          page.request.get("/api/visualization-sessions")
        ),
        200
      );
      expect((sessions.sessions ?? []).filter((session) =>
        session.moduleId === identity.moduleId && session.topicId === identity.topicId
      )).toEqual([
        expect.objectContaining({
          explored: true,
          moduleId: identity.moduleId,
          source: identity.source,
          topicId: identity.topicId
        })
      ]);
      await page.unroute(routePattern, sessionRoute);
    } finally {
      await attachDurationEvidence(testInfo, evidence);
    }
  });

  test("provider-owned keepalive delivery follows durable Card dispatch and survives navigation", async ({ page }, testInfo) => {
    const evidence: DurationEvidenceEntry[] = [];
    const identity = visualizationIdentity(keepaliveNavigationLab);
    let observation: ReturnType<typeof observeSessionRequest> | null = null;
    try {
      const student = await registerMainlandStudent(
        page,
        testInfo,
        evidence,
        "session-keepalive-navigation",
        keepaliveNavigationLab
      );
      const outboxKey = visualizationSessionOutboxStorageKey({
        userId: student.userId,
        moduleId: identity.moduleId,
        topicId: identity.topicId
      });
      await installVisualizationOutboxUpdateTrace(page);
      await timedStep(evidence, "keepalive:open-provider-owned-lab", async () => {
        await page.goto(buildVisualizationLabHref(keepaliveNavigationLab), { waitUntil: "domcontentloaded" });
        await closeLearnerStartSetupIfVisible(page);
      });

      const card = page.locator(
        `[data-viz-card][data-viz-module-id=${JSON.stringify(identity.moduleId)}]` +
        `[data-viz-topic-id=${JSON.stringify(identity.topicId)}]`
      );
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-viz-explore-gate", /awaiting-interaction|dwell|engaged/);

      observation = observeSessionRequest(page, identity, evidence, "keepalive:provider-post");
      await card.locator("[data-viz-card-body]").click({ position: { x: 12, y: 12 } });
      const started = await observation.started;
      const physicalOutboxKey = expectEnqueueDispatchBeforeNetwork(started.traceBeforeNetwork, outboxKey, {
        userId: student.userId,
        moduleId: identity.moduleId,
        source: identity.source,
        topicId: identity.topicId
      });
      const navigationStartedAt = Date.now();
      const [outcome] = await Promise.all([
        observation.outcome,
        page.goto("/dashboard", { waitUntil: "domcontentloaded" })
      ]);
      evidence.push({
        durationMs: Math.max(0, Date.now() - navigationStartedAt),
        failure: null,
        label: "keepalive:immediate-navigation",
        outcome: "finished",
        startedAt: new Date(navigationStartedAt).toISOString(),
        status: null
      });
      expect(outcome.failure ?? "").not.toMatch(/ERR_ABORTED/i);
      expect(outcome).toEqual(expect.objectContaining({
        failure: null,
        outcome: "finished",
        status: 200
      }));
      await timedStep(evidence, "keepalive:post-navigation-provider-ack", async () => {
        await expect.poll(async () =>
          (await localStorageValues(page, [physicalOutboxKey]))[0]
        ).toBeNull();
      });

      const sessions = await readJson<{ sessions?: VisualizationSession[] }>(
        await timedApiResponse(evidence, "keepalive:get-durable-session", () =>
          page.request.get("/api/visualization-sessions")
        ),
        200
      );
      expect((sessions.sessions ?? []).filter((session) =>
        session.moduleId === identity.moduleId && session.topicId === identity.topicId
      )).toEqual([
        expect.objectContaining({
          explored: true,
          moduleId: identity.moduleId,
          source: identity.source,
          topicId: identity.topicId
        })
      ]);
    } finally {
      observation?.cleanup();
      await attachDurationEvidence(testInfo, evidence);
    }
  });
});
