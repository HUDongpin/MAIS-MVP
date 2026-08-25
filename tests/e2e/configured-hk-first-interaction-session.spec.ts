import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  expect,
  test,
  type APIResponse,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

import {
  getVisualizationLabByLabId,
  type FeaturedLabDefinition,
} from "../../data/visualizationLabs";
import { isValidLearningAnalyticsEventLog } from "../../lib/learningAnalytics";
import {
  lessonHrefForTopicId,
  lessonSlugForTopicId,
} from "../../lib/lessonLinks";
import { visualizationCompletionRewardSourceKey } from "../../lib/server/userStore/gamificationRewardRedemptionPersistence";
import {
  closeLearnerStartSetupIfVisible,
  collectPageErrors,
  expectNoPageErrors,
  uniqueSuffix,
} from "./helpers";

const configuredModuleId = "configured-visualization-lab" as const;
const exactTopicIds = [
  "identities-square-patterns",
  "arc-length-sector-area",
] as const;
const sourceIdentityPaths = [
  "app/api/visualization-sessions/route.ts",
  "components/providers/AppProviders.tsx",
  "components/visualizations/ConfiguredVisualizationLab.tsx",
  "data/visualizationLabs.ts",
  "lib/server/userStore.ts",
  "lib/server/userStore/studentActivityPersistence.ts",
  "lib/visualizationSessionOutbox.ts",
  "tests/e2e/configured-hk-first-interaction-session.spec.ts",
] as const;

type ExactTopicId = (typeof exactTopicIds)[number];
type InteractionKind = "click-only" | "input-change-only";
type SessionIdentity = {
  moduleId: string;
  source: string;
  topicId: string;
};
type SessionRow = SessionIdentity & {
  completedAt: string | null;
  explored: boolean;
  updatedAt: string;
};
type RawActivity = {
  assignments: Array<Record<string, unknown>>;
  gamificationEvents: Array<{
    createdAt: string;
    economyVersion: string;
    id: string;
    status: string;
    rewardPoints: number;
    source: string;
    sourceKey: string;
    studentId: string;
    xp: number;
  }>;
  lessonProgress: Array<{
    status: string;
    topicId: string;
  }>;
  learningEvents: Array<{
    createdAt: string;
    id: string;
    source: string;
    topicId: string;
    type: string;
  }>;
  rewards: Array<{
    amount: number;
    createdAt: string;
    reason: string;
    sourceKey: string;
    studentId: string;
  }>;
  rawSliceBytes: string;
  sessions: Array<SessionRow>;
  submissions: Array<Record<string, unknown>>;
  visualizationEvents: Array<{
    createdAt: string;
    id: string;
    source: string;
    topicId: string;
  }>;
};
type ObservedSessionPost = {
  body: unknown;
  encodedOwner: string | null;
};
type ObservedWrite = {
  body: unknown;
  method: string;
  pathname: string;
};
type RequestFailure = {
  errorText: string;
  method: string;
  pathname: string;
};
type FailedWriteResponse = {
  method: string;
  pathname: string;
  status: number;
};

const labs = new Map<ExactTopicId, FeaturedLabDefinition>();
for (const topicId of exactTopicIds) {
  const lab = getVisualizationLabByLabId(topicId);
  if (
    !lab ||
    lab.curriculumTrack !== "HK" ||
    lab.grade !== "S3" ||
    lab.moduleId !== configuredModuleId
  ) {
    throw new TypeError(`${topicId}: exact HK S3 configured lab is missing.`);
  }
  labs.set(topicId, lab);
}

const cases = [
  {
    interaction: "click-only",
    siblingTopicId: "arc-length-sector-area",
    topicId: "identities-square-patterns",
  },
  {
    interaction: "input-change-only",
    siblingTopicId: "identities-square-patterns",
    topicId: "arc-length-sector-area",
  },
] as const satisfies ReadonlyArray<{
  interaction: InteractionKind;
  siblingTopicId: ExactTopicId;
  topicId: ExactTopicId;
}>;

function exactSourceIdentity() {
  const entries = sourceIdentityPaths.map((relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const sha256 = createHash("sha256")
      .update(readFileSync(absolutePath))
      .digest("hex");
    return { path: relativePath, sha256 };
  });
  const aggregate = createHash("sha256")
    .update(
      entries
        .map(({ path: relativePath, sha256 }) => `${sha256}  ${relativePath}\n`)
        .join(""),
    )
    .digest("hex");
  return { aggregate, entries };
}

function parseRequestBody(request: Request) {
  try {
    return JSON.parse(request.postData() ?? "null") as unknown;
  } catch {
    return null;
  }
}

function isVisualizationCompletionLearningEventWrite(write: ObservedWrite) {
  if (write.pathname !== "/api/learning-events") return false;
  if (!write.body || typeof write.body !== "object" || Array.isArray(write.body)) {
    return false;
  }
  const events = (write.body as Record<string, unknown>).events;
  return (
    Array.isArray(events) &&
    events.some(
      (event) =>
        event !== null &&
        typeof event === "object" &&
        !Array.isArray(event) &&
        (event as Record<string, unknown>).type === "visualization-complete",
    )
  );
}

function isUnexpectedVisualizationWriteBeforeInteraction(write: ObservedWrite) {
  return (
    write.pathname === "/api/visualization-sessions" ||
    write.pathname === "/api/rewards" ||
    write.pathname.startsWith("/api/rewards/") ||
    write.pathname === "/api/gamification" ||
    write.pathname.startsWith("/api/gamification/") ||
    isVisualizationCompletionLearningEventWrite(write)
  );
}

function isExactSessionIdentity(
  value: unknown,
  identity: SessionIdentity,
): value is SessionIdentity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    JSON.stringify(Object.keys(record).sort()) ===
      JSON.stringify(["moduleId", "source", "topicId"]) &&
    record.moduleId === identity.moduleId &&
    record.source === identity.source &&
    record.topicId === identity.topicId
  );
}

type JsonResponseLike = Pick<APIResponse, "status" | "text">;

async function readJson<T>(response: JsonResponseLike, label: string) {
  const text = await response.text();
  expect(response.status(), `${label}: ${text}`).toBe(200);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TypeError(`${label}: response was not JSON.`);
  }
}

function requireCanonicalIso(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new TypeError(`${label}: expected an ISO timestamp.`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError(`${label}: expected a canonical ISO timestamp.`);
  }
  return value;
}

async function registerHkStudent(
  page: Page,
  testInfo: TestInfo,
  topicId: ExactTopicId,
) {
  const suffix = `${uniqueSuffix(testInfo)}-${topicId}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .toLowerCase()
    .slice(0, 90);
  const username = `hk-first-interaction-${suffix}@example.test`;
  const payload = await readJson<{
    user?: { id?: unknown; role?: unknown; username?: unknown };
  }>(
    await page.request.post("/api/auth/register", {
      data: {
        curriculumProfile: {
          publisher: "HK_UNITED_PRIME_MIA",
          region: "HK",
        },
        curriculumTrack: "HK",
        email: username,
        grade: "S3",
        language: "en",
        name: `HK exact interaction ${suffix}`,
        password: "start12345",
        role: "student",
        theme: "dark",
        username,
      },
    }),
    `${topicId}: disposable HK student registration`,
  );
  expect(payload.user?.role).toBe("student");
  expect(payload.user?.username).toBe(username);
  if (typeof payload.user?.id !== "string" || !payload.user.id.trim()) {
    throw new TypeError(`${topicId}: registration exposed no exact user id.`);
  }
  return { userId: payload.user.id, username };
}

function readRawActivity(userId: string): RawActivity {
  const databasePath = process.env.HK_MATH_DB_PATH?.trim();
  if (!databasePath?.startsWith("/Volumes/Starship/")) {
    throw new TypeError(
      `HK_MATH_DB_PATH must be an absolute Starship path; actual=${JSON.stringify(databasePath ?? null)}.`,
    );
  }
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as { payload?: unknown } | undefined;
    if (typeof row?.payload !== "string") {
      throw new TypeError("SQLite app_state primary payload is unavailable.");
    }
    const payload = JSON.parse(row.payload) as {
      assignments?: unknown;
      class_enrollments?: unknown;
      gamification_events?: unknown;
      lesson_progress?: unknown;
      learning_events?: unknown;
      reward_point_ledger?: unknown;
      submissions?: unknown;
      visualization_events?: unknown;
      visualization_sessions?: unknown;
    };
    if (
      !Array.isArray(payload.assignments) ||
      !Array.isArray(payload.class_enrollments) ||
      !Array.isArray(payload.gamification_events) ||
      !Array.isArray(payload.lesson_progress) ||
      !Array.isArray(payload.learning_events) ||
      !Array.isArray(payload.reward_point_ledger) ||
      !Array.isArray(payload.submissions) ||
      !Array.isArray(payload.visualization_events) ||
      !Array.isArray(payload.visualization_sessions)
    ) {
      throw new TypeError("SQLite activity arrays are unavailable.");
    }

    const assignmentTargets = new Set<string>([
      configuredModuleId,
      ...exactTopicIds,
    ]);
    const studentClassIds = new Set(
      payload.class_enrollments
        .filter(
          (candidate): candidate is Record<string, unknown> =>
            typeof candidate === "object" &&
            candidate !== null &&
            !Array.isArray(candidate) &&
            candidate.student_id === userId &&
            typeof candidate.class_id === "string",
        )
        .map((candidate) => candidate.class_id as string),
    );
    const assignments = payload.assignments
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          typeof candidate.id === "string" &&
          typeof candidate.class_id === "string" &&
          studentClassIds.has(candidate.class_id) &&
          candidate.content_type === "visualization" &&
          candidate.status === "active" &&
          (candidate.target_id === undefined ||
            candidate.target_id === null ||
            candidate.target_id === "" ||
            (typeof candidate.target_id === "string" &&
              assignmentTargets.has(candidate.target_id))),
      )
      .map((candidate) => structuredClone(candidate))
      .sort((left, right) =>
        String(left.id).localeCompare(String(right.id)),
      );
    const submissions = payload.submissions
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          typeof candidate.id === "string" &&
          candidate.student_id === userId,
      )
      .map((candidate) => structuredClone(candidate))
      .sort((left, right) =>
        String(left.id).localeCompare(String(right.id)),
      );

    const lessonProgress = payload.lesson_progress
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.user_id === userId &&
          exactTopicIds.includes(candidate.topic_id as ExactTopicId),
      )
      .map((candidate) => {
        if (
          typeof candidate.topic_id !== "string" ||
          typeof candidate.status !== "string"
        ) {
          throw new TypeError("SQLite lesson-progress row is malformed.");
        }
        return {
          status: candidate.status,
          topicId: candidate.topic_id,
        };
      })
      .sort((left, right) => left.topicId.localeCompare(right.topicId));

    const sessions = payload.visualization_sessions
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.user_id === userId &&
          candidate.module_id === configuredModuleId &&
          exactTopicIds.includes(candidate.topic_id as ExactTopicId),
      )
      .map((candidate) => {
        if (
          typeof candidate.module_id !== "string" ||
          typeof candidate.topic_id !== "string" ||
          typeof candidate.source !== "string" ||
          typeof candidate.explored !== "boolean" ||
          (candidate.completed_at !== null &&
            typeof candidate.completed_at !== "string") ||
          typeof candidate.updated_at !== "string"
        ) {
          throw new TypeError("SQLite visualization-session row is malformed.");
        }
        return {
          completedAt: candidate.completed_at,
          explored: candidate.explored,
          moduleId: candidate.module_id,
          source: candidate.source,
          topicId: candidate.topic_id,
          updatedAt: candidate.updated_at,
        };
      })
      .sort((left, right) => left.topicId.localeCompare(right.topicId));

    const learningEvents = payload.learning_events
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.user_id === userId &&
          typeof candidate.type === "string" &&
          candidate.type.startsWith("visualization-"),
      )
      .map((candidate) => {
        if (
          typeof candidate.id !== "string" ||
          typeof candidate.source !== "string" ||
          typeof candidate.topic_id !== "string" ||
          typeof candidate.type !== "string" ||
          typeof candidate.created_at !== "string"
        ) {
          throw new TypeError("SQLite learning-event row is malformed.");
        }
        return {
          createdAt: candidate.created_at,
          id: candidate.id,
          source: candidate.source,
          topicId: candidate.topic_id,
          type: candidate.type,
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    const visualizationEvents = payload.visualization_events
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.user_id === userId,
      )
      .map((candidate) => {
        if (
          typeof candidate.id !== "string" ||
          typeof candidate.source !== "string" ||
          typeof candidate.topic_id !== "string" ||
          typeof candidate.created_at !== "string"
        ) {
          throw new TypeError("SQLite visualization-event row is malformed.");
        }
        return {
          createdAt: candidate.created_at,
          id: candidate.id,
          source: candidate.source,
          topicId: candidate.topic_id,
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    const rewards = payload.reward_point_ledger
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.student_id === userId &&
          candidate.reason === "visualization-complete",
      )
      .map((candidate) => {
        if (
          typeof candidate.student_id !== "string" ||
          typeof candidate.amount !== "number" ||
          typeof candidate.reason !== "string" ||
          typeof candidate.source_key !== "string" ||
          typeof candidate.created_at !== "string"
        ) {
          throw new TypeError("SQLite visualization reward row is malformed.");
        }
        return {
          amount: candidate.amount,
          createdAt: candidate.created_at,
          reason: candidate.reason,
          sourceKey: candidate.source_key,
          studentId: candidate.student_id,
        };
      })
      .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));

    const gamificationEvents = payload.gamification_events
      .filter(
        (candidate): candidate is Record<string, unknown> =>
          typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          candidate.student_id === userId &&
          candidate.source === "visualization-complete",
      )
      .map((candidate) => {
        if (
          typeof candidate.id !== "string" ||
          typeof candidate.student_id !== "string" ||
          typeof candidate.reward_points !== "number" ||
          typeof candidate.xp !== "number" ||
          typeof candidate.source !== "string" ||
          typeof candidate.source_key !== "string" ||
          typeof candidate.status !== "string" ||
          typeof candidate.economy_version !== "string" ||
          typeof candidate.created_at !== "string"
        ) {
          throw new TypeError("SQLite gamification-event row is malformed.");
        }
        return {
          createdAt: candidate.created_at,
          economyVersion: candidate.economy_version,
          id: candidate.id,
          rewardPoints: candidate.reward_points,
          source: candidate.source,
          sourceKey: candidate.source_key,
          status: candidate.status,
          studentId: candidate.student_id,
          xp: candidate.xp,
        };
      })
      .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));

    const rawRecords = (values: unknown[], predicate: (record: Record<string, unknown>) => boolean) =>
      values
        .filter(
          (candidate): candidate is Record<string, unknown> =>
            typeof candidate === "object" &&
            candidate !== null &&
            !Array.isArray(candidate) &&
            predicate(candidate as Record<string, unknown>),
        )
        .map((candidate) => structuredClone(candidate))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        );
    const rawSliceBytes = JSON.stringify({
      assignments,
      gamificationEvents: rawRecords(
        payload.gamification_events,
        (candidate) =>
          candidate.student_id === userId &&
          candidate.source === "visualization-complete",
      ),
      learningEvents: rawRecords(
        payload.learning_events,
        (candidate) =>
          candidate.user_id === userId &&
          typeof candidate.type === "string" &&
          candidate.type.startsWith("visualization-"),
      ),
      rewards: rawRecords(
        payload.reward_point_ledger,
        (candidate) =>
          candidate.student_id === userId &&
          candidate.reason === "visualization-complete",
      ),
      sessions: rawRecords(
        payload.visualization_sessions,
        (candidate) =>
          candidate.user_id === userId &&
          candidate.module_id === configuredModuleId &&
          exactTopicIds.includes(candidate.topic_id as ExactTopicId),
      ),
      submissions,
      visualizationEvents: rawRecords(
        payload.visualization_events,
        (candidate) =>
          candidate.user_id === userId,
      ),
    });

    return {
      assignments,
      gamificationEvents,
      learningEvents,
      lessonProgress,
      rawSliceBytes,
      rewards,
      sessions,
      submissions,
      visualizationEvents,
    };
  } finally {
    database.close();
  }
}

async function apiSessions(page: Page) {
  const payload = await readJson<{ sessions?: SessionRow[] }>(
    await page.request.get("/api/visualization-sessions"),
    "visualization-session server reread",
  );
  if (!Array.isArray(payload.sessions)) {
    throw new TypeError("Visualization-session API exposed no sessions array.");
  }
  return payload.sessions;
}

async function installInteractionTrace(page: Page, rootSelector: string) {
  await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) {
      throw new TypeError(`Missing interaction trace root ${selector}.`);
    }
    const traceWindow = window as Window & {
      __configuredHkInteractionTrace?: string[];
    };
    traceWindow.__configuredHkInteractionTrace = [];
    for (const eventType of [
      "change",
      "click",
      "input",
      "keyup",
      "pointerup",
    ]) {
      root.addEventListener(
        eventType,
        (event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(
              'button, input, select, textarea, [role="button"], [role="slider"]',
            )
          ) {
            traceWindow.__configuredHkInteractionTrace?.push(event.type);
          }
        },
        true,
      );
    }
  }, rootSelector);
}

async function interactionTrace(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window & { __configuredHkInteractionTrace?: string[] }
      ).__configuredHkInteractionTrace ?? [],
  );
}

async function performExactInteraction(
  page: Page,
  rootSelector: string,
  interaction: InteractionKind,
) {
  await page.evaluate(() => {
    const traceWindow = window as Window & {
      __configuredHkInteractionTrace?: string[];
    };
    traceWindow.__configuredHkInteractionTrace = [];
  });
  const root = page.locator(rootSelector);
  if (interaction === "click-only") {
    const mode = root.locator(
      '[data-viz-mode-button][data-viz-active="false"]',
    ).first();
    await expect(mode).toBeVisible();
    const modeId = await mode.getAttribute("data-viz-mode");
    expect(modeId).toEqual(expect.any(String));
    const selectedMode = root.locator(
      `[data-viz-mode-button][data-viz-mode=${JSON.stringify(modeId)}]`,
    );
    await selectedMode.evaluate((element) => (element as HTMLElement).click());
    await expect(selectedMode).toHaveAttribute("data-viz-active", "true");
    expect(await interactionTrace(page)).toEqual(["click"]);
    return { control: "mode", value: modeId };
  }

  const range = root.locator('input[type="range"][data-viz-parameter]').first();
  await expect(range).toBeVisible();
  const parameter = await range.getAttribute("data-viz-parameter");
  const before = Number(await range.inputValue());
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const step = Number(await range.getAttribute("step"));
  const next = before + step <= max ? before + step : before - step;
  expect(Number.isFinite(next) && next >= min && next <= max).toBe(true);
  expect(next).not.toBe(before);
  await range.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, next);
  await expect(range).toHaveValue(String(next));
  await expect
    .poll(async () => {
      const serialized = await root
        .locator("[data-hk-viz-state]")
        .getAttribute("data-hk-viz-state");
      if (!serialized || !parameter) return null;
      return (JSON.parse(serialized) as Record<string, unknown>)[parameter];
    })
    .toBe(next);
  expect(await interactionTrace(page)).toEqual(["input", "change"]);
  return { control: parameter, value: next };
}

test.describe("HK configured lesson first-interaction session boundary", () => {
  for (const exactCase of cases) {
    test(`${exactCase.topicId} records one exact session from ${exactCase.interaction}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      expect(testInfo.project.name).toBe("desktop-chrome");
      const pageErrors = collectPageErrors(page);
      const failedWriteResponses: FailedWriteResponse[] = [];
      const observedWrites: ObservedWrite[] = [];
      const requestFailures: RequestFailure[] = [];
      const visualizationDirectoryWarmups: string[] = [];
      page.on("request", (request) => {
        const requestUrl = new URL(request.url());
        if (
          request.method() === "GET" &&
          requestUrl.pathname === "/student/tools/visualizations"
        ) {
          visualizationDirectoryWarmups.push(request.url());
        }
        if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return;
        observedWrites.push({
          body: parseRequestBody(request),
          method: request.method(),
          pathname: requestUrl.pathname,
        });
      });
      page.on("requestfailed", (request) => {
        requestFailures.push({
          errorText: request.failure()?.errorText ?? "unknown request failure",
          method: request.method(),
          pathname: new URL(request.url()).pathname,
        });
      });
      page.on("response", (response) => {
        const request = response.request();
        if (
          ["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
          (response.status() >= 200 && response.status() < 300)
        ) {
          return;
        }
        failedWriteResponses.push({
          method: request.method(),
          pathname: new URL(response.url()).pathname,
          status: response.status(),
        });
      });
      const lab = labs.get(exactCase.topicId)!;
      const identity: SessionIdentity = {
        moduleId: configuredModuleId,
        source: lab.analyticsSource,
        topicId: exactCase.topicId,
      };
      const sessionPosts: ObservedSessionPost[] = [];
      page.on("request", (request) => {
        if (
          request.method() !== "POST" ||
          new URL(request.url()).pathname !== "/api/visualization-sessions"
        ) {
          return;
        }
        sessionPosts.push({
          body: parseRequestBody(request),
          encodedOwner:
            request.headers()["x-mais-visualization-user-id"] ?? null,
        });
      });

      const student = await registerHkStudent(
        page,
        testInfo,
        exactCase.topicId,
      );
      expect(readRawActivity(student.userId)).toEqual({
        assignments: [],
        gamificationEvents: [],
        learningEvents: [],
        lessonProgress: [],
        rawSliceBytes: expect.any(String),
        rewards: [],
        sessions: [],
        submissions: [],
        visualizationEvents: [],
      });

      const navigation = await page.goto(
        lessonHrefForTopicId(exactCase.topicId),
        { waitUntil: "domcontentloaded" },
      );
      expect(navigation?.status()).toBeLessThan(400);
      await closeLearnerStartSetupIfVisible(page);

      const rootSelector = `[data-viz-active-lab-id=${JSON.stringify(exactCase.topicId)}]`;
      const activeRoots = page.locator(rootSelector);
      await expect(activeRoots).toHaveCount(1);
      await expect(activeRoots).toBeVisible({ timeout: 30_000 });
      await expect(activeRoots).toHaveAttribute(
        "data-viz-lesson-session-owner",
        "first-control-interaction",
      );
      await expect(activeRoots).toHaveAttribute(
        "data-viz-module-id",
        configuredModuleId,
      );

      await page.waitForTimeout(5_500);
      expect(
        visualizationDirectoryWarmups,
        "Navbar hydration must not warm the dynamic Visualization directory before a learner chooses that link.",
      ).toEqual([]);
      expect(sessionPosts).toEqual([]);
      expect(await apiSessions(page)).toEqual([]);
      expect(readRawActivity(student.userId)).toEqual({
        assignments: [],
        gamificationEvents: [],
        learningEvents: [],
        lessonProgress: [
          {
            status: "in-progress",
            topicId: exactCase.topicId,
          },
        ],
        rawSliceBytes: expect.any(String),
        rewards: [],
        sessions: [],
        submissions: [],
        visualizationEvents: [],
      });
      expect(
        observedWrites.filter(
          (write) => write.pathname === "/api/lesson-progress",
        ),
      ).toEqual([
        {
          body: {
            action: "start",
            slug: lessonSlugForTopicId(exactCase.topicId),
          },
          method: "POST",
          pathname: "/api/lesson-progress",
        },
      ]);
      expect(
        observedWrites.filter(isUnexpectedVisualizationWriteBeforeInteraction),
      ).toEqual([]);

      const focusControl = activeRoots
        .locator('[data-viz-mode-button], input[type="range"]')
        .first();
      await expect(focusControl).toBeVisible();
      await focusControl.focus();
      await page.keyboard.press("Tab");
      await page.waitForTimeout(1_200);
      expect(sessionPosts).toEqual([]);
      expect(await apiSessions(page)).toEqual([]);

      await installInteractionTrace(page, rootSelector);
      const responsePromise = page.waitForResponse(
        (response) => {
          if (
            response.request().method() !== "POST" ||
            new URL(response.url()).pathname !== "/api/visualization-sessions"
          ) {
            return false;
          }
          const body = parseRequestBody(response.request());
          return isExactSessionIdentity(body, identity);
        },
        { timeout: 30_000 },
      );
      const interactionEvidence = await performExactInteraction(
        page,
        rootSelector,
        exactCase.interaction,
      );
      const deliveryResponse = await responsePromise;
      const delivery = await readJson<{
        acknowledgedUserId?: unknown;
        durablyPersisted?: unknown;
        session?: unknown;
      }>(deliveryResponse, `${exactCase.topicId}: first interaction ACK`);
      const deliveredSession = delivery.session as
        | Record<string, unknown>
        | null
        | undefined;
      const completedAt = requireCanonicalIso(
        deliveredSession?.completedAt,
        `${exactCase.topicId}: completedAt`,
      );
      const updatedAt = requireCanonicalIso(
        deliveredSession?.updatedAt,
        `${exactCase.topicId}: updatedAt`,
      );
      expect(updatedAt).toBe(completedAt);
      expect(delivery).toEqual({
        acknowledgedUserId: student.userId,
        durablyPersisted: true,
        session: {
          completedAt,
          explored: true,
          moduleId: identity.moduleId,
          source: identity.source,
          topicId: identity.topicId,
          updatedAt,
        },
      });
      expect(sessionPosts).toEqual([
        {
          body: identity,
          encodedOwner: encodeURIComponent(student.userId),
        },
      ]);

      await performExactInteraction(
        page,
        rootSelector,
        exactCase.interaction,
      );
      await page.waitForTimeout(1_500);
      expect(sessionPosts).toHaveLength(1);

      const expectedSession: SessionRow = {
        completedAt,
        explored: true,
        moduleId: identity.moduleId,
        source: identity.source,
        topicId: identity.topicId,
        updatedAt,
      };
      expect(await apiSessions(page)).toEqual([expectedSession]);
      const raw = readRawActivity(student.userId);
      expect(raw.lessonProgress).toEqual([
        {
          status: "in-progress",
          topicId: exactCase.topicId,
        },
      ]);
      expect(raw.sessions).toEqual([expectedSession]);
      expect(
        raw.sessions.some(
          (session) => session.topicId === exactCase.siblingTopicId,
        ),
      ).toBe(false);
      const rewardSourceKey = visualizationCompletionRewardSourceKey(
        student.userId,
        configuredModuleId,
        exactCase.topicId,
      );
      expect(raw.assignments).toEqual([]);
      expect(raw.submissions).toEqual([]);
      expect(raw.learningEvents).toEqual([]);
      expect(raw.visualizationEvents).toEqual([]);
      expect(raw.rewards).toEqual([
        {
          amount: 20,
          createdAt: completedAt,
          reason: "visualization-complete",
          sourceKey: rewardSourceKey,
          studentId: student.userId,
        },
      ]);
      expect(raw.gamificationEvents).toEqual([
        {
          createdAt: completedAt,
          economyVersion: expect.any(String),
          id: expect.any(String),
          rewardPoints: 20,
          source: "visualization-complete",
          sourceKey: rewardSourceKey,
          status: "awarded",
          studentId: student.userId,
          xp: 45,
        },
      ]);

      const rawBytesBeforeServerReplay = JSON.stringify(raw);
      const apiBytesBeforeServerReplay = JSON.stringify(
        await apiSessions(page),
      );
      const replayDelivery = await readJson<{
        acknowledgedUserId?: unknown;
        durablyPersisted?: unknown;
        session?: unknown;
      }>(
        await page.request.post("/api/visualization-sessions", {
          data: identity,
          headers: {
            "x-mais-visualization-user-id": encodeURIComponent(
              student.userId,
            ),
          },
        }),
        `${exactCase.topicId}: exact completed-session replay`,
      );
      expect(replayDelivery).toEqual(delivery);
      expect(JSON.stringify(await apiSessions(page))).toBe(
        apiBytesBeforeServerReplay,
      );
      expect(JSON.stringify(readRawActivity(student.userId))).toBe(
        rawBytesBeforeServerReplay,
      );
      expect(sessionPosts).toHaveLength(1);
      const supportedWritePaths = new Set([
        "/api/learning-events",
        "/api/lesson-progress",
        "/api/visualization-sessions",
      ]);
      expect(
        observedWrites.filter(
          (write) => !supportedWritePaths.has(write.pathname),
        ),
      ).toEqual([]);
      for (const write of observedWrites.filter(
        (candidate) => candidate.pathname === "/api/learning-events",
      )) {
        expect(write.method).toBe("POST");
        expect(write.body).toEqual({
          events: expect.any(Array),
          generation: expect.any(Number),
        });
        const body = write.body as {
          events: unknown;
          generation: number;
        };
        expect(Number.isSafeInteger(body.generation)).toBe(true);
        expect(body.generation).toBeGreaterThanOrEqual(0);
        expect(isValidLearningAnalyticsEventLog(body.events)).toBe(true);
        expect(
          (body.events as Array<{ type: string }>).some((event) =>
            event.type.startsWith("visualization-"),
          ),
        ).toBe(false);
      }
      expect(failedWriteResponses).toEqual([]);
      expect(requestFailures).toEqual([]);
      expect(visualizationDirectoryWarmups).toEqual([]);

      const sourceIdentity = exactSourceIdentity();
      await testInfo.attach(
        `configured-hk-first-interaction-${exactCase.topicId}.json`,
        {
          body: Buffer.from(
            JSON.stringify(
              {
                apiSessions: await apiSessions(page),
                failedWriteResponses,
                eventTrace: await interactionTrace(page),
                interaction: interactionEvidence,
                rawActivity: raw,
                requestFailures,
                sessionPosts,
                sourceIdentity,
                userId: student.userId,
                visualizationDirectoryWarmups,
                writes: observedWrites,
              },
              null,
              2,
            ),
          ),
          contentType: "application/json",
        },
      );
      expectNoPageErrors(pageErrors);
    });
  }
});
