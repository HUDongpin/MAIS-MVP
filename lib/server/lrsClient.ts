import { createHash, timingSafeEqual } from "node:crypto";
import type { CurriculumTrack, LearningAnalyticsEvent, LearningAnalyticsEventType } from "@/types";

type LrsEnv = Record<string, string | undefined>;

export type LrsConfig = {
  enabled: boolean;
  endpoint: string;
  username: string;
  password: string;
  xapiVersion: string;
  activityBaseIri: string;
  timeoutMs: number;
  maxDeliveryAttempts: number;
  retryBaseDelayMs: number;
};

export type LrsConfigStatus = {
  status: "disabled" | "configured" | "missing-config";
  missing: string[];
  configured: {
    endpoint: boolean;
    username: boolean;
    password: boolean;
    smokeSecret: boolean;
  };
};

export type LrsDeliveryResult = {
  status: "disabled" | "queued" | "sent";
  attempted: number;
  accepted: number;
  outbox: LrsOutboxItem[];
};

export type LrsOutboxItem = {
  statementId: string;
  eventId: string;
  attempts: number;
  queuedAt: string;
  nextRetryAt: string;
  reason: LrsDeliveryError["code"];
  httpStatus?: number;
};

export type LrsConnectionResult =
  | {
      status: "disabled" | "missing-config";
      missing: string[];
    }
  | {
      status: "ok";
      httpStatus: number;
    };

type LrsActorContext = {
  userId: string;
  curriculumTrack?: CurriculumTrack;
};

type XapiActivity = {
  id: string;
  objectType: "Activity";
  definition: {
    name: {
      "en-US": string;
    };
    type: string;
  };
};

type XapiStatement = {
  id: string;
  actor: {
    account: {
      homePage: string;
      name: string;
    };
    objectType: "Agent";
  };
  verb: {
    id: string;
    display: {
      "en-US": string;
    };
  };
  object: {
    id: string;
    objectType: "Activity";
    definition: {
      name: {
        "en-US": string;
      };
      type: string;
    };
  };
  result?: {
    completion?: boolean;
    duration?: string;
    success?: boolean;
  };
  context: {
    platform: "MAIS-MVP";
    contextActivities: {
      parent: XapiActivity[];
      grouping: XapiActivity[];
      category: XapiActivity[];
    };
    extensions: Record<string, string | number | boolean>;
  };
  timestamp: string;
};

type LrsFetch = typeof fetch;

const defaultXapiVersion = "1.0.3";
const defaultActivityBaseIri = "https://mais-mvp.local/xapi";
const defaultTimeoutMs = 12000;
const defaultMaxDeliveryAttempts = 3;
const defaultRetryBaseDelayMs = 0;
const minTimeoutMs = 1000;
const maxTimeoutMs = 30000;
const minDeliveryAttempts = 1;
const maxDeliveryAttempts = 5;
const minRetryBaseDelayMs = 0;
const maxRetryBaseDelayMs = 5000;
const statementPath = "/statements";
const lrsSmokeSecretHeader = "x-mais-lrs-smoke-secret";

export const lrsLearningVerbTaxonomy = {
  answered: { id: "http://adlnet.gov/expapi/verbs/answered", display: "answered" },
  completed: { id: "http://adlnet.gov/expapi/verbs/completed", display: "completed" },
  experienced: { id: "http://adlnet.gov/expapi/verbs/experienced", display: "experienced" },
  interacted: { id: "http://adlnet.gov/expapi/verbs/interacted", display: "interacted" },
  reviewed: { id: "http://id.tincanapi.com/verb/reviewed", display: "reviewed" },
  asked: { id: "http://adlnet.gov/expapi/verbs/asked", display: "asked" }
} as const;

type LrsLearningVerb = keyof typeof lrsLearningVerbTaxonomy;

function cleanEnvValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalBoolean(value: string | undefined) {
  const normalized = cleanEnvValue(value).toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeLrsEndpoint(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.pathname.endsWith(statementPath)) {
      url.pathname = url.pathname.slice(0, -statementPath.length) || "/";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function normalizeActivityBaseIri(value: string) {
  const endpoint = normalizeLrsEndpoint(value);
  return endpoint || defaultActivityBaseIri;
}

export function readLrsConfig(env: LrsEnv = process.env): LrsConfig {
  const endpoint = normalizeLrsEndpoint(cleanEnvValue(env.LRS_ENDPOINT));
  const username = cleanEnvValue(env.LRS_USERNAME) || cleanEnvValue(env.LRS_NAME);
  const password = cleanEnvValue(env.LRS_PASSWORD);
  const enabledOverride = parseOptionalBoolean(env.LRS_ENABLED);
  const hasMinimumConfig = Boolean(endpoint && username && password);

  return {
    enabled: enabledOverride ?? hasMinimumConfig,
    endpoint,
    username,
    password,
    xapiVersion: cleanEnvValue(env.LRS_XAPI_VERSION) || defaultXapiVersion,
    activityBaseIri: normalizeActivityBaseIri(cleanEnvValue(env.LRS_ACTIVITY_BASE_IRI) || defaultActivityBaseIri),
    timeoutMs: boundedNumber(env.LRS_REQUEST_TIMEOUT_MS, defaultTimeoutMs, minTimeoutMs, maxTimeoutMs),
    maxDeliveryAttempts: boundedNumber(
      env.LRS_DELIVERY_MAX_ATTEMPTS,
      defaultMaxDeliveryAttempts,
      minDeliveryAttempts,
      maxDeliveryAttempts
    ),
    retryBaseDelayMs: boundedNumber(
      env.LRS_RETRY_BASE_DELAY_MS,
      defaultRetryBaseDelayMs,
      minRetryBaseDelayMs,
      maxRetryBaseDelayMs
    )
  };
}

export function getLrsConfigStatus(env: LrsEnv = process.env): LrsConfigStatus {
  const config = readLrsConfig(env);
  const requiredVariables: Array<[string, boolean]> = [
    ["LRS_ENDPOINT", !config.endpoint],
    ["LRS_USERNAME", !config.username],
    ["LRS_PASSWORD", !config.password]
  ];
  const missing = requiredVariables
    .filter(([, isMissing]) => isMissing)
    .map(([name]) => name);

  return {
    status: !config.enabled ? "disabled" : missing.length ? "missing-config" : "configured",
    missing,
    configured: {
      endpoint: Boolean(config.endpoint),
      username: Boolean(config.username),
      password: Boolean(config.password),
      smokeSecret: Boolean(cleanEnvValue(env.LRS_SMOKE_TEST_SECRET))
    }
  };
}

export function isLrsSmokeRequestAuthorized(request: Request, env: LrsEnv = process.env) {
  const expected = cleanEnvValue(env.LRS_SMOKE_TEST_SECRET);
  if (!expected) return process.env.NODE_ENV !== "production";

  const provided =
    cleanEnvValue(request.headers.get(lrsSmokeSecretHeader) ?? undefined) ||
    cleanEnvValue(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined);
  if (!provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function basicAuthHeader(config: Pick<LrsConfig, "username" | "password">) {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

function statementUrl(config: LrsConfig, statementId: string) {
  const url = new URL(`${config.endpoint}${statementPath}`);
  url.searchParams.set("statementId", statementId);
  return url.toString();
}

function aboutUrl(config: LrsConfig) {
  return `${config.endpoint}/about`;
}

function safeSegment(value: string) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "unknown");
}

function safePath(value: string) {
  return value
    .split("/")
    .map((segment) => safeSegment(segment))
    .filter(Boolean)
    .join("/");
}

export function statementIdForLearningEvent(userId: string, eventId: string) {
  const hex = createHash("sha256").update(`mais-mvp:${userId}:${eventId}`).digest("hex").split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function actorAccountNameForUserId(userId: string) {
  return statementIdForLearningEvent(userId, "actor");
}

function verbForEvent(type: LearningAnalyticsEventType): (typeof lrsLearningVerbTaxonomy)[LrsLearningVerb] {
  if (type === "answer-correct" || type === "answer-wrong") {
    return lrsLearningVerbTaxonomy.answered;
  }
  if (type === "hint-request") {
    return lrsLearningVerbTaxonomy.asked;
  }
  if (type === "visualization-complete") {
    return lrsLearningVerbTaxonomy.completed;
  }
  if (type === "mistake-review") {
    return lrsLearningVerbTaxonomy.reviewed;
  }
  if (type === "page-view") {
    return lrsLearningVerbTaxonomy.experienced;
  }
  return lrsLearningVerbTaxonomy.interacted;
}

function evidenceStrengthForEvent(type: LearningAnalyticsEventType) {
  if (type === "answer-correct" || type === "answer-wrong") return "strong";
  if (type === "page-view" || type === "mouse-click" || type === "keyboard") return "weak";
  return "medium";
}

function activityTypeForEvent(type: LearningAnalyticsEventType) {
  if (type === "answer-correct" || type === "answer-wrong") return "http://adlnet.gov/expapi/activities/cmi.interaction";
  if (type.startsWith("visualization-")) return "http://adlnet.gov/expapi/activities/simulation";
  if (type === "hint-request") return "http://adlnet.gov/expapi/activities/question";
  return "http://adlnet.gov/expapi/activities/lesson";
}

function isoDuration(seconds: number | undefined) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  return `PT${Math.round(seconds)}S`;
}

function xapiActivity(base: string, path: string, name: string, type: string): XapiActivity {
  return {
    id: `${base}/${path}`,
    objectType: "Activity",
    definition: {
      name: {
        "en-US": name
      },
      type
    }
  };
}

function curriculumContextActivities({
  base,
  event,
  curriculumTrack
}: {
  base: string;
  event: LearningAnalyticsEvent;
  curriculumTrack?: CurriculumTrack;
}) {
  return {
    parent: [
      ...(event.classId
        ? [xapiActivity(base, `classes/${safeSegment(event.classId)}`, `Class ${event.classId}`, "http://adlnet.gov/expapi/activities/grouping")]
        : []),
      ...(event.assignmentId
        ? [
            xapiActivity(
              base,
              `assignments/${safeSegment(event.assignmentId)}`,
              `Assignment ${event.assignmentId}`,
              "http://adlnet.gov/expapi/activities/assessment"
            )
          ]
        : [])
    ],
    grouping: [
      ...(curriculumTrack
        ? [
            xapiActivity(
              base,
              `curricula/${safeSegment(curriculumTrack)}`,
              `Curriculum ${curriculumTrack}`,
              "http://adlnet.gov/expapi/activities/course"
            )
          ]
        : []),
      xapiActivity(base, `grades/${safeSegment(event.grade)}`, `Grade ${event.grade}`, "http://adlnet.gov/expapi/activities/grouping"),
      xapiActivity(base, `topics/${safeSegment(event.topicId)}`, `Topic ${event.topicId}`, "http://adlnet.gov/expapi/activities/module"),
      ...(event.competencyId
        ? [
            xapiActivity(
              base,
              `competencies/${safeSegment(event.competencyId)}`,
              `Competency ${event.competencyId}`,
              "http://adlnet.gov/expapi/activities/objective"
            )
          ]
        : [])
    ],
    category: [
      xapiActivity(
        base,
        "categories/learning-analytics",
        "MAIS-MVP learning analytics",
        "http://adlnet.gov/expapi/activities/category"
      )
    ]
  };
}

export function buildLearningAnalyticsStatement({
  config,
  event,
  actor
}: {
  config: Pick<LrsConfig, "activityBaseIri">;
  event: LearningAnalyticsEvent;
  actor: LrsActorContext;
}): XapiStatement {
  const base = config.activityBaseIri.replace(/\/+$/, "");
  const verb = verbForEvent(event.type);
  const objectId = event.questionId
    ? `${base}/activities/${safeSegment(event.source)}/${safeSegment(event.topicId)}/questions/${safeSegment(event.questionId)}`
    : `${base}/activities/${safeSegment(event.source)}/${safeSegment(event.topicId)}`;
  const duration = isoDuration(event.durationSeconds);
  const success = event.type === "answer-correct" ? true : event.type === "answer-wrong" ? false : undefined;
  const contextActivities = curriculumContextActivities({ base, event, curriculumTrack: actor.curriculumTrack });

  return {
    id: statementIdForLearningEvent(actor.userId, event.id),
    actor: {
      objectType: "Agent",
      account: {
        homePage: base,
        name: actorAccountNameForUserId(actor.userId)
      }
    },
    verb: {
      id: verb.id,
      display: {
        "en-US": verb.display
      }
    },
    object: {
      id: objectId,
      objectType: "Activity",
      definition: {
        name: {
          "en-US": `${event.source} ${event.type}`
        },
        type: activityTypeForEvent(event.type)
      }
    },
    result: duration || typeof success === "boolean"
      ? {
          completion: event.type === "visualization-complete" ? true : undefined,
          duration,
          success
        }
      : undefined,
    context: {
      platform: "MAIS-MVP",
      contextActivities,
      extensions: {
        [`${base}/extensions/event-id`]: event.id,
        [`${base}/extensions/event-type`]: event.type,
        [`${base}/extensions/source`]: event.source,
        [`${base}/extensions/grade`]: event.grade,
        [`${base}/extensions/topic-id`]: event.topicId,
        [`${base}/extensions/evidence-strength`]: evidenceStrengthForEvent(event.type),
        [`${base}/extensions/privacy-tier`]: "learner-analytics-minimal",
        ...(event.questionId ? { [`${base}/extensions/question-id`]: event.questionId } : {}),
        ...(event.classId ? { [`${base}/extensions/class-id`]: event.classId } : {}),
        ...(event.assignmentId ? { [`${base}/extensions/assignment-id`]: event.assignmentId } : {}),
        ...(event.competencyId ? { [`${base}/extensions/competency-id`]: event.competencyId } : {}),
        ...(typeof event.durationSeconds === "number" ? { [`${base}/extensions/duration-seconds`]: event.durationSeconds } : {}),
        ...(actor.curriculumTrack ? { [`${base}/extensions/curriculum-track`]: actor.curriculumTrack } : {})
      }
    },
    timestamp: event.timestamp
  };
}

export class LrsDeliveryError extends Error {
  constructor(
    public readonly code: "missing-config" | "timeout" | "http-error" | "request-failed",
    message: string,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "LrsDeliveryError";
  }
}

export class LrsQueryPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LrsQueryPolicyError";
  }
}

type LrsQueryRequester = {
  role: "student" | "teacher" | "admin";
  userId: string;
  ownedClassIds?: string[];
};

type LrsStatementQueryInput = {
  config: Pick<LrsConfig, "activityBaseIri">;
  requester: LrsQueryRequester;
  learnerId?: string;
  classId?: string;
  activityId?: string;
  verb?: LrsLearningVerb | (typeof lrsLearningVerbTaxonomy)[LrsLearningVerb]["id"];
  since?: string;
  until?: string;
  auditReason?: string;
  limit?: number;
};

function normalizeTimeBound(value: string | undefined, label: string) {
  if (!value) throw new LrsQueryPolicyError(`LRS queries require a targeted time window with ${label}.`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new LrsQueryPolicyError(`LRS query ${label} must be a valid timestamp.`);
  }
  return parsed.toISOString();
}

function verbIdForQuery(verb: LrsStatementQueryInput["verb"]) {
  if (!verb) return undefined;
  if (verb in lrsLearningVerbTaxonomy) return lrsLearningVerbTaxonomy[verb as LrsLearningVerb].id;
  const approvedVerb = Object.values(lrsLearningVerbTaxonomy).find((candidate) => candidate.id === verb);
  if (!approvedVerb) {
    throw new LrsQueryPolicyError("LRS query verb must be one of the approved learning verb taxonomy entries.");
  }
  return approvedVerb.id;
}

function activityIri(base: string, activityId: string) {
  if (/^https?:\/\//i.test(activityId)) return activityId;
  return `${base}/activities/${safePath(activityId)}`;
}

function classActivityIri(base: string, classId: string) {
  return `${base}/classes/${safeSegment(classId)}`;
}

function boundedLimit(limit: number | undefined) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 100;
  return Math.min(500, Math.max(1, Math.round(limit)));
}

export function buildLrsStatementQuery(input: LrsStatementQueryInput) {
  const { requester, learnerId, classId, activityId } = input;
  const hasTargetFilter = Boolean(learnerId || classId || activityId || input.verb);
  if (!hasTargetFilter) {
    throw new LrsQueryPolicyError("LRS statements queries must be targeted by learner, class, activity, or verb.");
  }

  const since = normalizeTimeBound(input.since, "since");
  const until = normalizeTimeBound(input.until, "until");
  const base = input.config.activityBaseIri.replace(/\/+$/, "");
  const verb = verbIdForQuery(input.verb);
  const params: {
    agent?: XapiStatement["actor"];
    verb?: string;
    activity?: string;
    related_activities?: true;
    since: string;
    until: string;
    limit: number;
  } = {
    since,
    until,
    limit: boundedLimit(input.limit)
  };
  const postFilters: { activity?: string } = {};

  if (requester.role === "student") {
    const effectiveLearnerId = learnerId ?? requester.userId;
    if (effectiveLearnerId !== requester.userId) {
      throw new LrsQueryPolicyError("Learner LRS queries may only target the requesting learner.");
    }
    params.agent = {
      objectType: "Agent",
      account: {
        homePage: base,
        name: actorAccountNameForUserId(effectiveLearnerId)
      }
    };
  } else if (requester.role === "teacher") {
    if (!classId || !(requester.ownedClassIds ?? []).includes(classId)) {
      throw new LrsQueryPolicyError("Educator LRS queries require an owned class filter.");
    }
    params.activity = classActivityIri(base, classId);
    params.related_activities = true;
    if (activityId) {
      postFilters.activity = activityIri(base, activityId);
    }
  } else {
    if (learnerId) {
      const reason = input.auditReason?.trim();
      if (!reason) {
        throw new LrsQueryPolicyError("Admin learner-detail LRS queries require an audit reason.");
      }
      params.agent = {
        objectType: "Agent",
        account: {
          homePage: base,
          name: actorAccountNameForUserId(learnerId)
        }
      };
    }
    if (classId) {
      params.activity = classActivityIri(base, classId);
      params.related_activities = true;
    } else if (activityId) {
      params.activity = activityIri(base, activityId);
      params.related_activities = true;
    }
  }

  if (verb) params.verb = verb;

  return {
    params,
    postFilters: Object.keys(postFilters).length ? postFilters : undefined,
    audit:
      requester.role === "admin" && learnerId
        ? {
            adminId: requester.userId,
            learnerId,
            reason: input.auditReason?.trim() ?? "",
            generatedAt: new Date(0).toISOString()
          }
        : undefined
  };
}

async function fetchWithTimeout(fetcher: LrsFetch, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LrsDeliveryError("timeout", "LRS request timed out.");
    }
    throw new LrsDeliveryError("request-failed", "LRS request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

async function putStatement({
  config,
  statement,
  fetcher
}: {
  config: LrsConfig;
  statement: XapiStatement;
  fetcher: LrsFetch;
}) {
  const response = await fetchWithTimeout(
    fetcher,
    statementUrl(config, statement.id),
    {
      method: "PUT",
      headers: {
        Authorization: basicAuthHeader(config),
        "Content-Type": "application/json",
        "X-Experience-API-Version": config.xapiVersion
      },
      body: JSON.stringify(statement)
    },
    config.timeoutMs
  );

  if (!response.ok) {
    throw new LrsDeliveryError("http-error", "LRS rejected an xAPI statement.", response.status);
  }
}

function isRetryableLrsDeliveryError(error: unknown) {
  if (!(error instanceof LrsDeliveryError)) return false;
  if (error.code === "timeout" || error.code === "request-failed") return true;
  if (error.code === "http-error") {
    return error.httpStatus === 408 || error.httpStatus === 429 || (typeof error.httpStatus === "number" && error.httpStatus >= 500);
  }
  return false;
}

function retryDelayMs(baseDelayMs: number, attempt: number) {
  return baseDelayMs <= 0 ? 0 : baseDelayMs * Math.max(1, attempt);
}

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function putStatementWithRetry({
  config,
  statement,
  fetcher
}: {
  config: LrsConfig;
  statement: XapiStatement;
  fetcher: LrsFetch;
}) {
  let attempts = 0;
  let lastError: LrsDeliveryError | null = null;

  while (attempts < config.maxDeliveryAttempts) {
    attempts += 1;
    try {
      await putStatement({ config, statement, fetcher });
      return { status: "sent" as const, attempts };
    } catch (error) {
      if (!(error instanceof LrsDeliveryError)) throw error;
      lastError = error;
      if (!isRetryableLrsDeliveryError(error)) throw error;
      if (attempts >= config.maxDeliveryAttempts) break;
      await wait(retryDelayMs(config.retryBaseDelayMs, attempts));
    }
  }

  return {
    status: "queued" as const,
    attempts,
    error: lastError ?? new LrsDeliveryError("request-failed", "LRS request failed.")
  };
}

function outboxItemForStatement({
  statement,
  event,
  attempts,
  error,
  now = new Date()
}: {
  statement: XapiStatement;
  event: LearningAnalyticsEvent;
  attempts: number;
  error: LrsDeliveryError;
  now?: Date;
}): LrsOutboxItem {
  const retryAt = new Date(now.getTime() + Math.max(60_000, attempts * 60_000));
  return {
    statementId: statement.id,
    eventId: event.id,
    attempts,
    queuedAt: now.toISOString(),
    nextRetryAt: retryAt.toISOString(),
    reason: error.code,
    httpStatus: error.httpStatus
  };
}

export async function emitLearningEventsToLrs({
  userId,
  curriculumTrack,
  events,
  env = process.env,
  fetcher = fetch
}: {
  userId: string;
  curriculumTrack?: CurriculumTrack;
  events: LearningAnalyticsEvent[];
  env?: LrsEnv;
  fetcher?: LrsFetch;
}): Promise<LrsDeliveryResult> {
  const status = getLrsConfigStatus(env);
  if (status.status === "disabled") {
    return { status: "disabled", attempted: 0, accepted: 0, outbox: [] };
  }
  if (status.status === "missing-config") {
    throw new LrsDeliveryError("missing-config", "LRS is enabled but missing required environment variables.");
  }

  const config = readLrsConfig(env);
  const statements = events.map((event) =>
    buildLearningAnalyticsStatement({
      config,
      event,
      actor: { userId, curriculumTrack }
    })
  );
  const outbox: LrsOutboxItem[] = [];
  let accepted = 0;

  for (const [index, statement] of statements.entries()) {
    const delivery = await putStatementWithRetry({ config, statement, fetcher });
    if (delivery.status === "sent") {
      accepted += 1;
    } else {
      outbox.push(outboxItemForStatement({ statement, event: events[index], attempts: delivery.attempts, error: delivery.error }));
    }
  }

  return {
    status: outbox.length ? "queued" : "sent",
    attempted: statements.length,
    accepted,
    outbox
  };
}

export async function checkLrsConnection({
  env = process.env,
  fetcher = fetch
}: {
  env?: LrsEnv;
  fetcher?: LrsFetch;
} = {}): Promise<LrsConnectionResult> {
  const status = getLrsConfigStatus(env);
  if (status.status === "disabled" || status.status === "missing-config") {
    return { status: status.status, missing: status.missing };
  }

  const config = readLrsConfig(env);
  const response = await fetchWithTimeout(
    fetcher,
    aboutUrl(config),
    {
      method: "GET",
      headers: {
        Authorization: basicAuthHeader(config),
        "X-Experience-API-Version": config.xapiVersion
      }
    },
    config.timeoutMs
  );

  if (!response.ok) {
    throw new LrsDeliveryError("http-error", "LRS status request was rejected.", response.status);
  }

  return {
    status: "ok",
    httpStatus: response.status
  };
}

export async function sendLrsSmokeStatement({
  env = process.env,
  fetcher = fetch,
  now = new Date()
}: {
  env?: LrsEnv;
  fetcher?: LrsFetch;
  now?: Date;
} = {}) {
  return emitLearningEventsToLrs({
    userId: "mais-lrs-smoke",
    curriculumTrack: "HK",
    events: [{
      id: `lrs-smoke-${now.toISOString()}`,
      type: "page-view",
      source: "dashboard",
      timestamp: now.toISOString(),
      grade: "S3",
      topicId: "lrs-smoke",
      durationSeconds: 1
    }],
    env,
    fetcher
  });
}
