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
  status: "disabled" | "sent";
  attempted: number;
  accepted: number;
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
      category: Array<{
        id: string;
        objectType: "Activity";
        definition: {
          name: {
            "en-US": string;
          };
          type: string;
        };
      }>;
    };
    extensions: Record<string, string | number | boolean>;
  };
  timestamp: string;
};

type LrsFetch = typeof fetch;

const defaultXapiVersion = "1.0.3";
const defaultActivityBaseIri = "https://mais-mvp.local/xapi";
const defaultTimeoutMs = 12000;
const minTimeoutMs = 1000;
const maxTimeoutMs = 30000;
const statementPath = "/statements";
const lrsSmokeSecretHeader = "x-mais-lrs-smoke-secret";

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
    timeoutMs: boundedNumber(env.LRS_REQUEST_TIMEOUT_MS, defaultTimeoutMs, minTimeoutMs, maxTimeoutMs)
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

export function statementIdForLearningEvent(userId: string, eventId: string) {
  const hex = createHash("sha256").update(`mais-mvp:${userId}:${eventId}`).digest("hex").split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function verbForEvent(type: LearningAnalyticsEventType) {
  if (type === "answer-correct" || type === "answer-wrong") {
    return { id: "http://adlnet.gov/expapi/verbs/answered", display: "answered" };
  }
  if (type === "hint-request") {
    return { id: "http://adlnet.gov/expapi/verbs/asked", display: "asked" };
  }
  if (type === "visualization-complete") {
    return { id: "http://adlnet.gov/expapi/verbs/completed", display: "completed" };
  }
  if (type === "mistake-review") {
    return { id: "http://id.tincanapi.com/verb/reviewed", display: "reviewed" };
  }
  if (type === "page-view") {
    return { id: "http://adlnet.gov/expapi/verbs/experienced", display: "experienced" };
  }
  return { id: "http://adlnet.gov/expapi/verbs/interacted", display: "interacted" };
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

  return {
    id: statementIdForLearningEvent(actor.userId, event.id),
    actor: {
      objectType: "Agent",
      account: {
        homePage: base,
        name: actor.userId
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
      contextActivities: {
        category: [{
          id: `${base}/categories/learning-analytics`,
          objectType: "Activity",
          definition: {
            name: {
              "en-US": "MAIS-MVP learning analytics"
            },
            type: "http://adlnet.gov/expapi/activities/category"
          }
        }]
      },
      extensions: {
        [`${base}/extensions/event-id`]: event.id,
        [`${base}/extensions/event-type`]: event.type,
        [`${base}/extensions/source`]: event.source,
        [`${base}/extensions/grade`]: event.grade,
        [`${base}/extensions/topic-id`]: event.topicId,
        ...(event.questionId ? { [`${base}/extensions/question-id`]: event.questionId } : {}),
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
    return { status: "disabled", attempted: 0, accepted: 0 };
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

  for (const statement of statements) {
    await putStatement({ config, statement, fetcher });
  }

  return {
    status: "sent",
    attempted: statements.length,
    accepted: statements.length
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
