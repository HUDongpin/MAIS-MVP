import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

import {
  getVisualizationLabByLabId,
} from "../../data/visualizationLabs";
import {
  closeLearnerStartSetupIfVisible,
  uniqueSuffix,
} from "./helpers";
import {
  chinaVisualizationCollisionReceipt,
} from "./china-visualization-collision-receipt";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";
import { G02_PRODUCTION_PLAN } from "./china-mainland-g02-production-plan";
import {
  assertG02TrustedRunnerAuthority,
  expectedG02AnalyticsEventType,
  readG02RunnerInvocationEnvironment,
  sealG02ProductionBrowserPayload,
  validateG02ProductionBrowserReceipt,
  type G02InteractionStateReceipt,
  type G02AnalyticsEventType,
  type G02ProductionBrowserPayload,
  type G02ProductionProject,
  type G02RunnerInvocationEvidence,
  type G02VisualStateReceipt,
} from "./china-mainland-g02-production-receipt";

const SUPPORTED_PROJECTS = ["desktop-chrome", "mobile-chrome"] as const;
const SCROLL_POSITIONS = ["page-top", "visualization-center", "page-bottom"] as const;
const MODE_OPTIONS = ["add", "subtract", "multiply", "divide", "estimate-check"] as const;
const MODULE_ID = "configured-visualization-lab" as const;
const ANALYTICS_QUIET_INTERVAL_MS = 250;
const MOBILE_RANGE_CALIBRATION_MAX_TAPS = 24;
// ISO timestamps serialize to integer milliseconds; 2 ms covers only the two
// endpoint-rounding boundaries and must never become a delayed-event allowance.
const CLOCK_PRECISION_TOLERANCE_MS = 2;

type Locale = "en" | "zh" | "zh-Hans";
type Theme = "dark" | "light";
type RawAnalyticsEvent = {
  grade: string;
  id: string;
  source: string;
  timestamp: string;
  topicId: string;
  type: G02AnalyticsEventType;
};
type LiveSession = {
  completedAt?: unknown;
  explored?: unknown;
  moduleId?: unknown;
  source?: unknown;
  topicId?: unknown;
  updatedAt?: unknown;
};
type RuntimeCounters = {
  calibrationPhysicalCaptureSequence: number;
  captureSequence: number;
  directionalSwipes: G02ProductionBrowserPayload["touchEvidence"]["directionalSwipes"];
  realSwipeCount: number;
  realTapCount: number;
  headerTransitionSequence: number;
  sessionPostCount: number;
  sessionSeedApiPostCount: number;
  swipeMoveCount: number;
  tapCategoryCounts: G02ProductionBrowserPayload["touchEvidence"]["tapCategoryCounts"];
  tapEntries: G02ProductionBrowserPayload["touchEvidence"]["tapEntries"];
};
type TapEntry = G02ProductionBrowserPayload["touchEvidence"]["tapEntries"][number];
type TapSemanticIdentity = Pick<
  TapEntry,
  "axisId" | "labId" | "phase" | "stateId" | "subactionId" | "target"
>;
type TapMoment = TapEntry["before"];
type TapSemanticContext = Pick<TapSemanticIdentity, "axisId" | "labId" | "stateId">;
type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};
type AnalyticsHarness = {
  consumedAnalyticsEventIds: Set<string>;
  deliveries: Array<{
    ownerUserId: string | null;
    rawBody: unknown;
    rawEvents: unknown[] | null;
    rawResponseBody: unknown;
    request: Request;
    requestObservedAt: string;
    requestObservedMonotonicMs: number;
    responseStatus: number | null;
  }>;
  dispose: () => void;
};

const RAW_SOURCE_PATHS = [
  "tests/e2e/china-mainland-g02-production-plan.ts",
  "tests/e2e/china-mainland-g02-production-receipt.ts",
  "tests/e2e/china-mainland-g02-production-browser.spec.ts",
  "tests/e2e/china-mainland-g01-g02-production-routing.spec.ts",
] as const;

function rawSourceEvidence() {
  const repositoryRoot = new URL("../../", import.meta.url);
  return RAW_SOURCE_PATHS.map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(new URL(path, repositoryRoot)))
      .digest("hex"),
  }));
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestBody(request: Request): unknown {
  return parseJson(request.postData());
}

function applicationPath(value: string) {
  const url = new URL(value);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
  ) return null;
  return url.pathname;
}

function exactKeys(value: unknown, keys: readonly string[], label: string) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an exact object.`);
  expect(Object.keys(value).sort(), `${label}: exact keys`).toEqual([...keys].sort());
}

function isExactEmptyAnalyticsHandshake(body: unknown) {
  if (!isRecord(body)) return false;
  if (Object.keys(body).sort().join(",") !== "events,generation") return false;
  return Array.isArray(body.events) && body.events.length === 0 &&
    Number.isSafeInteger(body.generation) && Number(body.generation) >= 0;
}

function qualifyingDeliveries(harness: AnalyticsHarness) {
  return harness.deliveries.filter(({ rawBody }) => !isExactEmptyAnalyticsHandshake(rawBody));
}

function monotonicWallClock() {
  const monotonicMs = performance.now();
  return {
    iso: new Date(performance.timeOrigin + monotonicMs).toISOString(),
    monotonicMs,
    wallClockMinusMonotonicOriginMs: performance.timeOrigin,
  };
}

function tapMoment(sample: ReturnType<typeof monotonicWallClock>): TapMoment {
  return {
    capturedAt: sample.iso,
    capturedMonotonicMs: sample.monotonicMs,
    wallClockMinusMonotonicOriginMs: sample.wallClockMinusMonotonicOriginMs,
  };
}

function installDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const pathname = applicationPath(request.url());
    if (!pathname) return;
    diagnostics.requestFailures.push(
      `${request.method()} ${pathname}: ${request.failure()?.errorText ?? "unknown failure"}`,
    );
  });
  return diagnostics;
}

function installSessionPostCounter(page: Page, counters: RuntimeCounters) {
  const onRequest = (request: Request) => {
    if (
      request.method() === "POST" &&
      applicationPath(request.url()) === "/api/visualization-sessions"
    ) counters.sessionPostCount += 1;
  };
  page.on("request", onRequest);
  return () => page.off("request", onRequest);
}

function installAnalyticsHarness(page: Page): AnalyticsHarness {
  const harness: AnalyticsHarness = {
    consumedAnalyticsEventIds: new Set<string>(),
    deliveries: [],
    dispose: () => undefined,
  };
  const onRequest = (request: Request) => {
    const pathname = applicationPath(request.url());
    if (request.method() === "POST" && pathname === "/api/learning-events") {
      const rawBody = requestBody(request);
      const requestObserved = monotonicWallClock();
      let ownerUserId: string | null = null;
      try {
        const encodedOwner = request.headers()["x-mais-analytics-user-id"];
        ownerUserId = encodedOwner ? decodeURIComponent(encodedOwner) : null;
      } catch {
        ownerUserId = null;
      }
      harness.deliveries.push({
        ownerUserId,
        rawBody,
        rawEvents: isRecord(rawBody) && Array.isArray(rawBody.events)
          ? [...rawBody.events]
          : null,
        rawResponseBody: null,
        request,
        requestObservedAt: requestObserved.iso,
        requestObservedMonotonicMs: requestObserved.monotonicMs,
        responseStatus: null,
      });
    }
  };
  const onResponse = async (response: import("@playwright/test").Response) => {
    if (applicationPath(response.url()) !== "/api/learning-events") return;
    const delivery = harness.deliveries.find(
      (candidate) => candidate.request === response.request(),
    );
    if (!delivery) return;
    delivery.responseStatus = response.status();
    delivery.rawResponseBody = parseJson(await response.text().catch(() => null));
  };
  page.on("request", onRequest);
  page.on("response", onResponse);
  harness.dispose = () => {
    page.off("request", onRequest);
    page.off("response", onResponse);
  };
  return harness;
}

type JsonResponseLike = Pick<APIResponse, "status" | "text">;

async function readJson<T>(response: JsonResponseLike, label: string, status = 200): Promise<T> {
  const text = await response.text();
  expect(response.status(), `${label}: ${text}`).toBe(status);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TypeError(`${label}: response is not JSON: ${text.slice(0, 300)}.`);
  }
}

function projectFrom(testInfo: TestInfo): G02ProductionProject {
  const configuredProjects = testInfo.config.projects.map(({ name }) => name);
  expect(
    configuredProjects,
    "G02 production evidence requires the canonical two-project set without --project narrowing",
  ).toEqual([...SUPPORTED_PROJECTS]);
  const globalGrep = Array.isArray(testInfo.config.grep)
    ? testInfo.config.grep
    : [testInfo.config.grep];
  expect(
    globalGrep.map(({ source, flags }) => ({ flags, source })),
    "G02 production evidence forbids --grep narrowing",
  ).toEqual([{ flags: "", source: ".*" }]);
  expect(testInfo.config.grepInvert, "G02 production evidence forbids --grep-invert narrowing").toBeNull();
  for (const configuredProject of testInfo.config.projects) {
    const projectGrep = Array.isArray(configuredProject.grep)
      ? configuredProject.grep
      : [configuredProject.grep];
    expect(projectGrep.map(({ source, flags }) => ({ flags, source }))).toEqual([
      { flags: "", source: ".*" },
    ]);
    expect(configuredProject.grepInvert).toBeNull();
    expect(configuredProject.retries, "G02 production evidence forbids retries").toBe(0);
  }
  expect(SUPPORTED_PROJECTS).toContain(testInfo.project.name);
  if (!SUPPORTED_PROJECTS.includes(testInfo.project.name as G02ProductionProject)) {
    throw new TypeError(`Unsupported exact G02 project ${testInfo.project.name}.`);
  }
  expect(testInfo.retry, "G02 production evidence forbids retries").toBe(0);
  expect(testInfo.config.shard, "G02 production evidence forbids shards").toBeNull();
  return testInfo.project.name as G02ProductionProject;
}

function requireG02ProductionRunnerAuthority(): G02RunnerInvocationEvidence {
  const callerContract = readG02RunnerInvocationEnvironment(process.env);
  // Exact caller JSON+SHA remains forgeable. Only a future in-scope native
  // runner with spawn/wait plus an immutable receipt may replace this fail-closed boundary.
  return assertG02TrustedRunnerAuthority(callerContract);
}

function expectedInteractionAxis(project: G02ProductionProject) {
  const axis = G02_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: G02 interaction axis is absent.`);
  return axis;
}

function expectedInteractionStateIds(project: G02ProductionProject) {
  const axisId = expectedInteractionAxis(project).axisId;
  return G02_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function expectedVisualAxes(project: G02ProductionProject) {
  return G02_PRODUCTION_PLAN.coverage.visualAxes.filter(
    (axis) => axis.project === project,
  );
}

function expectedVisualStateIds(project: G02ProductionProject) {
  const axes = expectedVisualAxes(project);
  return G02_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    axes.some(({ axisId }) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function scenarioIdFrom(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) throw new TypeError(`${stateId}: invalid G02 state identity.`);
  return stateId.slice(prefix.length);
}

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  labId: string,
  interactionAxis: { locale: string; theme: string },
) {
  const lab = getVisualizationLabByLabId(labId);
  if (!lab || lab.labId !== labId || lab.topicId !== labId || lab.moduleId !== MODULE_ID) {
    throw new TypeError(`${labId}: exact G02 catalog identity is absent.`);
  }
  if (lab.publisher !== "MAINLAND_BNU" && lab.publisher !== "MAINLAND_HJB") {
    throw new TypeError(`${labId}: expected a BNU or HJB publisher.`);
  }
  const suffix = `${uniqueSuffix(testInfo)}-${labId}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g02-c2-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: lab.publisher, region: "MAINLAND" },
      curriculumTrack: lab.curriculumTrack,
      email: username,
      grade: lab.grade,
      language: interactionAxis.locale,
      name: `G02 C2 ${suffix}`,
      password: "start12345",
      role: "student",
      theme: interactionAxis.theme,
      username,
    },
  });
  const body = await readJson<{ user?: { id?: unknown; username?: unknown } }>(
    response,
    `${labId}: disposable learner registration`,
  );
  expect(body.user?.username).toBe(username);
  if (typeof body.user?.id !== "string" || body.user.id.trim().length === 0) {
    throw new TypeError(`${labId}: disposable learner has no exact id.`);
  }
  return { analyticsSource: lab.analyticsSource, userId: body.user.id };
}

async function visualizationSessions(page: Page): Promise<LiveSession[]> {
  const response = await page.request.get("/api/visualization-sessions");
  const body = await readJson<{ sessions?: unknown }>(response, "visualization session reread");
  if (!Array.isArray(body.sessions)) {
    throw new TypeError("Visualization session reread has no live sessions array.");
  }
  return body.sessions as LiveSession[];
}

function canonicalSessionIdentity(session: LiveSession) {
  if (
    session.explored !== true ||
    typeof session.moduleId !== "string" ||
    typeof session.topicId !== "string" ||
    typeof session.source !== "string"
  ) throw new TypeError(`Incomplete durable session: ${JSON.stringify(session)}.`);
  return `${session.moduleId}:${session.topicId}:${session.source}`;
}

function durableSessionSnapshot(session: LiveSession) {
  if (
    session.explored !== true ||
    session.moduleId !== MODULE_ID ||
    typeof session.topicId !== "string" ||
    typeof session.source !== "string" ||
    (session.completedAt !== null && typeof session.completedAt !== "string") ||
    typeof session.updatedAt !== "string"
  ) {
    throw new TypeError(`Incomplete exact durable session snapshot: ${JSON.stringify(session)}.`);
  }
  const catalog = getVisualizationLabByLabId(session.topicId);
  if (!catalog || session.source !== catalog.analyticsSource) {
    throw new TypeError(`${session.topicId}: durable session source is not the exact catalog source.`);
  }
  return {
    completedAt: session.completedAt,
    explored: true as const,
    moduleId: MODULE_ID,
    source: session.source,
    topicId: session.topicId,
    updatedAt: session.updatedAt,
  };
}

function targetSessions(sessions: readonly LiveSession[], labId: string) {
  return sessions.filter(({ topicId }) => topicId === labId);
}

function exactG02SessionSnapshot(sessions: readonly LiveSession[]) {
  return sessions
    .filter(({ topicId }) =>
      G02_PRODUCTION_PLAN.labIds.includes(topicId as (typeof G02_PRODUCTION_PLAN.labIds)[number]),
    )
    .map((session) => ({ ...session }))
    .sort(
      (left, right) =>
        G02_PRODUCTION_PLAN.labIds.indexOf(left.topicId as (typeof G02_PRODUCTION_PLAN.labIds)[number]) -
        G02_PRODUCTION_PLAN.labIds.indexOf(right.topicId as (typeof G02_PRODUCTION_PLAN.labIds)[number]),
    );
}

function exactRawSessionCheckpoint(
  sessions: readonly LiveSession[],
  expectedLabIds: readonly string[],
  label: string,
) {
  expect(sessions, `${label}: exact unfiltered raw session count`).toHaveLength(
    expectedLabIds.length,
  );
  expect(
    sessions.map(({ topicId }) => topicId),
    `${label}: exact unfiltered raw topic multiset and order before serialization`,
  ).toEqual(expectedLabIds);
  const snapshots = sessions.map(durableSessionSnapshot);
  expect(
    snapshots.map(({ topicId }) => topicId),
    `${label}: exact serialized raw topic multiset and order`,
  ).toEqual(expectedLabIds);
  return snapshots;
}

function expectSiblingSessionsUnchanged(
  sessions: readonly LiveSession[],
  labId: string,
  siblingBaseline: readonly LiveSession[],
) {
  expect(
    exactG02SessionSnapshot(sessions).filter(({ topicId }) => topicId !== labId),
    `${labId}: same-user sibling sessions must remain byte-for-byte stable`,
  ).toEqual(siblingBaseline);
}

function exactSiblingCounts(sessions: readonly LiveSession[]) {
  return G02_PRODUCTION_PLAN.labIds.map((labId) => ({
    labId,
    sessionCount: targetSessions(sessions, labId).length,
  }));
}

async function seedSiblingSession(
  page: Page,
  siblingLabId: string,
  counters: RuntimeCounters,
  expectedUserId: string,
) {
  const sibling = getVisualizationLabByLabId(siblingLabId);
  if (!sibling) throw new TypeError(`${siblingLabId}: sibling catalog row is absent.`);
  const response = await page.request.post("/api/visualization-sessions", {
    data: {
      moduleId: MODULE_ID,
      source: sibling.analyticsSource,
      topicId: siblingLabId,
    },
    headers: {
      "X-MAIS-Visualization-User-Id": encodeURIComponent(expectedUserId),
    },
  });
  counters.sessionSeedApiPostCount += 1;
  expect(response.status()).toBe(200);
  const ackBody = await readJson<{ acknowledgedUserId?: unknown; session?: LiveSession }>(
    response,
    `${siblingLabId}: sibling seed ACK`,
  );
  expect(ackBody).toMatchObject({
    acknowledgedUserId: expectedUserId,
    session: { explored: true, topicId: siblingLabId },
  });
}

async function seedSiblingSessions(
  page: Page,
  targetLabId: string,
  counters: RuntimeCounters,
  expectedUserId: string,
) {
  const siblingIds = G02_PRODUCTION_PLAN.labIds.filter((labId) => labId !== targetLabId);
  for (const siblingLabId of siblingIds) {
    await seedSiblingSession(
      page,
      siblingLabId,
      counters,
      expectedUserId,
    );
  }
  const sessions = await visualizationSessions(page);
  const expectedSiblingLabIds = G02_PRODUCTION_PLAN.labIds.filter(
    (labId) => labId !== targetLabId,
  );
  const rawSiblingSeed = exactRawSessionCheckpoint(
    sessions,
    expectedSiblingLabIds,
    `${targetLabId}: after sibling seed`,
  );
  const siblingBaseline = exactG02SessionSnapshot(sessions).filter(
    ({ topicId }) => topicId !== targetLabId,
  );
  expect(siblingBaseline).toHaveLength(G02_PRODUCTION_PLAN.labIds.length - 1);
  expect(targetSessions(sessions, targetLabId)).toEqual([]);
  return { rawSiblingSeed, seededSessions: sessions, siblingBaseline };
}

async function activeRoot(page: Page, labId: string) {
  const lessonSection = page.locator("section#visualization");
  await expect(lessonSection).toHaveCount(1);
  await expect(lessonSection).toBeVisible({ timeout: 30_000 });
  const root = lessonSection.locator(
    `[data-viz-active-lab-id=${JSON.stringify(labId)}]`,
  );
  await expect(root).toHaveCount(1);
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-viz-lesson-session-owner", "first-control-interaction");
  await expect(root).toHaveAttribute("data-viz-topic-id", labId);
  await expect(
    root.locator(`[data-mainland-decimal-arithmetic=${JSON.stringify(labId)}]`),
  ).toHaveCount(1);
  await expect(root.locator('[data-viz-configured-model="decimal-arithmetic-v1"]')).toHaveCount(1);
  await expect(root.locator("[data-viz-renderer-mode]")).toHaveCount(0);
  await expect(root.locator("[data-viz-configured-model]")).toHaveCount(1);
  await expect(
    root.locator(
      `[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(MODULE_ID)}][data-viz-reset-topic-id=${JSON.stringify(labId)}]`,
    ),
  ).toHaveCount(1);
  return root;
}

async function settle(root: Locator, label: string) {
  let prior = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await root.page().waitForTimeout(50);
    const current = await root.locator("[data-viz-configured-state]").getAttribute("data-viz-configured-state");
    if (current?.trim() && current === prior) return;
    prior = current ?? "";
  }
  throw new Error(`${label}: G02 configured state did not settle.`);
}

function stateField(stateKey: string, key: string) {
  const value = stateKey.match(new RegExp(`(?:^|\\|)${key}=([^|]+)`, "u"))?.[1];
  if (value === undefined) throw new TypeError(`${stateKey}: missing ${key}.`);
  return value;
}

async function observeState(root: Locator) {
  const renderer = root.locator('[data-viz-configured-model="decimal-arithmetic-v1"]');
  const stateKey = await renderer.getAttribute("data-viz-configured-state");
  if (!stateKey) throw new TypeError("G02 renderer has no configured state receipt.");
  const operation = stateField(stateKey, "operation");
  const evaluatedOperation = stateField(stateKey, "evaluated");
  if (!MODE_OPTIONS.includes(operation as (typeof MODE_OPTIONS)[number])) {
    throw new TypeError(`${stateKey}: unsupported mode.`);
  }
  if (!["add", "subtract", "multiply", "divide"].includes(evaluatedOperation)) {
    throw new TypeError(`${stateKey}: unsupported evaluated operation.`);
  }
  const [leftUnscaled, leftScale] = stateField(stateKey, "left").split("@").map(Number);
  const [rightUnscaled, rightScale] = stateField(stateKey, "right").split("@").map(Number);
  return {
    evaluatedOperation: evaluatedOperation as "add" | "subtract" | "multiply" | "divide",
    leftScale,
    leftUnscaled,
    operation: operation as (typeof MODE_OPTIONS)[number],
    precision: Number(stateField(stateKey, "precision")),
    rightScale,
    rightUnscaled,
    stateKey,
  };
}

async function resetReceipt(root: Locator) {
  const resetControl = root.locator("[data-viz-reset-model]");
  await expect(resetControl).toHaveCount(1);
  const observation = await observeState(root);
  expect(observation).toMatchObject({
    evaluatedOperation: "add",
    leftScale: 1,
    leftUnscaled: 125,
    operation: "add",
    precision: 2,
    rightScale: 2,
    rightUnscaled: 375,
  });
  return { exact: true as const, observation, resetControlCount: 1 as const };
}

async function uiScan(root: Locator, label: string) {
  const collision = chinaVisualizationCollisionReceipt(
    await scanHkVisualizationCollisions(root, label),
  );
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount, `${label}: contrast candidate count`).toBeGreaterThan(0);
  expect(contrast.worst, `${label}: contrast evidence`).not.toBeNull();
  expect(contrast.issues, `${label}: contrast issues`).toEqual([]);
  const layout = await root.evaluate((element) => {
    const targets = Array.from(
      element.querySelectorAll<HTMLElement>(
        '[data-viz-mode-button], input[type="range"][data-viz-control="range"], select[data-viz-parameter], [data-viz-reset-model]',
      ),
    ).filter((target) => {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none";
    });
    const touchIssues = targets.filter((target) => {
      const rect = target.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).length;
    const rootRect = element.getBoundingClientRect();
    const clipped = Array.from(
      element.querySelectorAll<HTMLElement>("[data-viz-mode-button], [data-viz-parameter], [data-viz-state-summary]"),
    ).filter((target) => {
      const rect = target.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 &&
        (rect.right > rootRect.right + 1 || rect.left < rootRect.left - 1);
    }).length;
    const documentWidth = document.documentElement.clientWidth;
    return {
      clipped,
      horizontalOverflowPixels: Math.max(
        0,
        document.documentElement.scrollWidth - documentWidth,
        document.body.scrollWidth - documentWidth,
      ),
      touchIssueCount: touchIssues,
      touchTargetCount: targets.length,
    };
  });
  expect(layout.clipped, `${label}: clipped learner elements`).toBe(0);
  expect(layout.horizontalOverflowPixels, `${label}: page horizontal overflow`).toBe(0);
  expect(layout.touchTargetCount, `${label}: touch target candidates`).toBeGreaterThan(0);
  expect(layout.touchIssueCount, `${label}: undersized touch targets`).toBe(0);
  return {
    contrastCheckedTextCount: contrast.checkedTextCount,
    clippedElementCount: layout.clipped,
    horizontalOverflowPixels: layout.horizontalOverflowPixels,
    touchTargetCheckedCount: layout.touchTargetCount,
    touchTargetIssueCount: layout.touchIssueCount,
    uiScan: {
      candidatePairCount: collision.totalCandidatePairCount,
      controlCount: collision.learnerControlCount,
      htmlTextCount: collision.htmlTextFragmentCount,
      paintedMarkCount: collision.paintedMarkCount,
      surfaceCount: collision.canvasSurfaceCount + collision.svgSurfaceCount,
      svgTextCount: collision.svgTextFragmentCount,
    },
  };
}

async function realTapOrClick(
  page: Page,
  locator: Locator,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  category: "interaction-axis-setup" | "interaction-non-range" | "visual-axis-setup" | "visual-reset",
  identity: TapSemanticIdentity,
) {
  await expect(locator).toHaveCount(1);
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  if (project === "mobile-chrome") {
    const prepared = await prepareRawTouchTarget(page, locator);
    const coordinate = {
      x: prepared.targetRect.x + prepared.targetRect.width / 2,
      y: prepared.targetRect.y + prepared.targetRect.height / 2,
    };
    assertRawTouchCoordinateInsidePreparation(prepared, coordinate);
    const before = tapMoment(monotonicWallClock());
    await page.touchscreen.tap(coordinate.x, coordinate.y);
    const after = tapMoment(monotonicWallClock());
    recordRawTouchTap(counters, category, prepared, coordinate, null, identity, before, after, null);
    return "page.touchscreen.tap";
  }
  const box = await locator.boundingBox();
  if (!box) throw new TypeError("Desktop real-input target has no bounding box.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return "page.mouse.click";
}

type RawTouchPreparation = Pick<
  G02ProductionBrowserPayload["touchEvidence"]["tapEntries"][number],
  "preparation" | "targetRect" | "viewport"
>;

async function prepareRawTouchTarget(
  page: Page,
  locator: Locator,
): Promise<RawTouchPreparation> {
  await locator.scrollIntoViewIfNeeded();
  const targetRect = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (
    !targetRect ||
    !viewport ||
    !(targetRect.width > 0) ||
    !(targetRect.height > 0) ||
    !(viewport.width > 0) ||
    !(viewport.height > 0)
  ) {
    throw new TypeError("Raw touchscreen target lacks a fresh positive rect/live viewport.");
  }
  return {
    preparation: "locator.scrollIntoViewIfNeeded+fresh-bounding-box+live-viewport",
    targetRect: { ...targetRect },
    viewport: { ...viewport },
  };
}

function assertRawTouchCoordinateInsidePreparation(
  prepared: RawTouchPreparation,
  coordinate: { x: number; y: number },
) {
  const { targetRect, viewport } = prepared;
  if (
    ![coordinate.x, coordinate.y].every(Number.isFinite) ||
    coordinate.x < targetRect.x ||
    coordinate.x > targetRect.x + targetRect.width ||
    coordinate.y < targetRect.y ||
    coordinate.y > targetRect.y + targetRect.height ||
    coordinate.x < 0 ||
    coordinate.x > viewport.width ||
    coordinate.y < 0 ||
    coordinate.y > viewport.height
  ) {
    throw new TypeError("Raw touchscreen coordinate is outside its fresh target rect/live viewport.");
  }
}

function recordRawTouchTap(
  counters: RuntimeCounters,
  category: TapEntry["category"],
  prepared: RawTouchPreparation,
  coordinate: { x: number; y: number },
  calibrationPhysicalCaptureSequence: number | null,
  identity: TapSemanticIdentity,
  before: TapMoment,
  after: TapMoment,
  rangeMeasurement: TapEntry["rangeMeasurement"],
) {
  counters.tapEntries.push({
    after: { ...after },
    ...identity,
    before: { ...before },
    calibrationPhysicalCaptureSequence,
    category,
    coordinate: { ...coordinate },
    preparation: prepared.preparation,
    rangeMeasurement,
    tapSequence: counters.tapEntries.length,
    targetRect: { ...prepared.targetRect },
    viewport: { ...prepared.viewport },
  });
  counters.realTapCount += 1;
  if (category === "calibration-attempt") {
    counters.tapCategoryCounts.calibrationAttemptCount += 1;
  } else if (category === "interaction-axis-setup") {
    counters.tapCategoryCounts.interactionAxisSetupTapCount += 1;
  } else if (category === "interaction-non-range") {
    counters.tapCategoryCounts.interactionNonRangeTapCount += 1;
  } else if (category === "visual-axis-setup") {
    counters.tapCategoryCounts.visualAxisSetupTapCount += 1;
  } else {
    counters.tapCategoryCounts.visualResetTapCount += 1;
  }
}

type SubactionDescriptor = Pick<
  G02InteractionStateReceipt["action"]["subactions"][number],
  "kind" | "subactionId" | "target"
>;

type RecordedSubaction = G02InteractionStateReceipt["action"]["subactions"][number];
type CalibrationAttempt = NonNullable<RecordedSubaction["calibrationEvidence"]>["attempts"][number];
type CalibrationAttemptDraft = Omit<CalibrationAttempt, "delivery">;
type CalibrationInputGeometry = NonNullable<RecordedSubaction["calibrationEvidence"]>["inputGeometry"];
type PhysicalActionResult = string | {
  calibrationAttempts: CalibrationAttemptDraft[];
  inputGeometry: CalibrationInputGeometry;
  method: string;
  targetValue: number;
  terminalValue: number;
};

type PhysicalSubactionRecorder = (
  descriptor: SubactionDescriptor,
  action: () => Promise<PhysicalActionResult>,
) => Promise<RecordedSubaction>;

async function calibrateMobileNativeRange(
  page: Page,
  range: Locator,
  min: number,
  max: number,
  target: number,
  counters: RuntimeCounters,
  identity: TapSemanticIdentity,
) {
  const initialPreparation = await prepareRawTouchTarget(page, range);
  const box = initialPreparation.targetRect;
  if (!(box.width > 2) || !(max > min)) {
    throw new TypeError("Mobile native range calibration lacks finite physical geometry.");
  }
  const calibrationAttempts: CalibrationAttemptDraft[] = [];
  const inputGeometry: CalibrationInputGeometry = {
    admissibleMaxX: box.x + box.width - 0.5,
    admissibleMaxY: box.y + box.height - 0.5,
    admissibleMinX: box.x + 0.5,
    admissibleMinY: box.y + 0.5,
    height: box.height,
    midpointX: box.x + box.width / 2,
    tapY: box.y + box.height / 2,
    viewportHeight: initialPreparation.viewport.height,
    viewportWidth: initialPreparation.viewport.width,
    width: box.width,
    x: box.x,
    y: box.y,
  };
  const y = inputGeometry.tapY;
  const tapAndObserve = async (
    candidateX: number,
    plannedRole: CalibrationAttemptDraft["plannedRole"],
  ) => {
    const beforeValue = Number(await range.inputValue());
    const prepared = await prepareRawTouchTarget(page, range);
    expect(prepared.targetRect, "Mobile range target rect must remain immutable after fresh preparation").toEqual(
      initialPreparation.targetRect,
    );
    expect(prepared.viewport, "Mobile range live viewport must remain immutable during one calibration").toEqual(
      initialPreparation.viewport,
    );
    const coordinate = { x: candidateX, y };
    assertRawTouchCoordinateInsidePreparation(prepared, coordinate);
    const started = monotonicWallClock();
    await page.touchscreen.tap(candidateX, y);
    const tapped = monotonicWallClock();
    const physicalCaptureSequence = counters.calibrationPhysicalCaptureSequence++;
    const afterValue = Number(await range.inputValue());
    const rangeMeasurement = {
      afterValue,
      beforeValue,
      valueChanged: beforeValue !== afterValue,
    };
    recordRawTouchTap(
      counters,
      "calibration-attempt",
      prepared,
      coordinate,
      physicalCaptureSequence,
      identity,
      tapMoment(started),
      tapMoment(tapped),
      rangeMeasurement,
    );
    await page.waitForTimeout(0);
    const settled = monotonicWallClock();
    if (!Number.isFinite(afterValue) || afterValue < min || afterValue > max) {
      throw new TypeError("Mobile range calibration observed an invalid native value.");
    }
    calibrationAttempts.push({
      afterValue,
      attemptIndex: calibrationAttempts.length,
      beforeValue,
      coordinate,
      physicalCaptureSequence,
      plannedRole,
      settledAt: settled.iso,
      settledMonotonicMs: settled.monotonicMs,
      startedAt: started.iso,
      startedMonotonicMs: started.monotonicMs,
      valueChanged: beforeValue !== afterValue,
      wallClockMinusMonotonicOriginMs: started.wallClockMinusMonotonicOriginMs,
    });
    return afterValue;
  };
  const driveTo = async (desired: number) => {
    const visited = new Set<string>();
    let lowerX = box.x + 0.5;
    let upperX = box.x + box.width - 0.5;
    const targetRatio = (desired - min) / (max - min);
    let candidateX = lowerX + targetRatio * (upperX - lowerX);
    while (calibrationAttempts.length < MOBILE_RANGE_CALIBRATION_MAX_TAPS) {
      const key = candidateX.toFixed(6);
      if (visited.has(key)) return false;
      visited.add(key);
      const observed = await tapAndObserve(candidateX, "bisection-correction");
      if (observed === desired) return true;
      if (observed < desired) lowerX = candidateX;
      else upperX = candidateX;
      candidateX = (lowerX + upperX) / 2;
    }
    return false;
  };
  const midpointX = inputGeometry.midpointX;
  const midpointValue = await tapAndObserve(midpointX, "bisection-correction");
  const repeatedMidpointValue = await tapAndObserve(
    midpointX,
    "midpoint-no-op-probe",
  );
  if (repeatedMidpointValue !== midpointValue) {
    throw new TypeError("Mobile range planned no-op midpoint repeat changed native value.");
  }
  if (repeatedMidpointValue === target) {
    const detour = target === min ? target + 1 : target - 1;
    if (!(await driveTo(detour))) {
      throw new TypeError("Mobile range calibration could not create a value-changing final target attempt.");
    }
  }
  if (!(await driveTo(target))) {
    throw new TypeError("mobile range calibration could not reach exact native value");
  }
  const finalAttempt = calibrationAttempts.at(-1);
  if (!finalAttempt || finalAttempt.afterValue !== target || !finalAttempt.valueChanged) {
    throw new TypeError("mobile range calibration final attempt did not own the target commit");
  }
  finalAttempt.plannedRole = "final-settling-attempt";
  await expect(range).toHaveValue(String(target));
  return { calibrationAttempts, inputGeometry };
}

async function setRangeThroughRealInput(
  page: Page,
  root: Locator,
  range: Locator,
  target: number,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  descriptor: SubactionDescriptor,
  identity: TapSemanticIdentity,
  record: PhysicalSubactionRecorder,
) {
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const step = Number((await range.getAttribute("step")) ?? "1");
  if (!Number.isSafeInteger(target) || target < min || target > max || step !== 1) {
    throw new TypeError(`Invalid exact range target ${target} for [${min}, ${max}].`);
  }
  const current = Number(await range.inputValue());
  const receipt = await record(descriptor, async () => {
    let method: string;
    if (
      project === "desktop-chrome" &&
      (target === min || target === max || Math.abs(target - current) === 1)
    ) {
      const key = target === min
        ? "Home"
        : target === max
          ? "End"
          : target > current
            ? "ArrowRight"
            : "ArrowLeft";
      await range.press(key);
      method = `locator.press(${key})`;
    } else if (project === "mobile-chrome") {
      const { calibrationAttempts, inputGeometry } = await calibrateMobileNativeRange(
        page,
        range,
        min,
        max,
        target,
        counters,
        identity,
      );
      await expect(range).toHaveValue(String(target));
      await settle(root, descriptor.subactionId);
      return {
        calibrationAttempts,
        inputGeometry,
        method: `page.touchscreen.tap:calibrated-bisection:${calibrationAttempts.length}:exact-native-value`,
        targetValue: target,
        terminalValue: Number(await range.inputValue()),
      };
    } else {
      await range.scrollIntoViewIfNeeded();
      const box = await range.boundingBox();
      if (!box) throw new TypeError("Exact desktop range target has no fresh real bounding box.");
      const ratio = (target - min) / (max - min);
      const thumbRadius = Math.min(10, box.width / 20);
      const x = box.x + thumbRadius + ratio * (box.width - thumbRadius * 2);
      const y = box.y + box.height / 2;
      await page.mouse.click(x, y);
      method = "page.mouse.click";
    }
    await expect(range).toHaveValue(String(target));
    await settle(root, descriptor.subactionId);
    return method;
  });
  await expect(range).toHaveValue(String(target));
  return receipt.method;
}

async function collectSubactionAnalytics(
  page: Page,
  harness: AnalyticsHarness,
  counters: RuntimeCounters,
  stateId: string,
  labId: string,
  expectedUserId: string,
  expectedSource: string,
  descriptor: SubactionDescriptor,
  action: () => Promise<PhysicalActionResult>,
): Promise<RecordedSubaction> {
  const preActionQualifyingDeliveryCount = qualifyingDeliveries(harness).length;
  await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
  expect(
    qualifyingDeliveries(harness).length,
    `${descriptor.subactionId}: pre-subaction analytics window must be quiet`,
  ).toBe(preActionQualifyingDeliveryCount);
  const actionStarted = monotonicWallClock();
  const actionResult = await action();
  const calibrationAttempts = typeof actionResult === "string"
    ? null
    : actionResult.calibrationAttempts;
  const valueChangingAttemptCount = calibrationAttempts?.filter(
    ({ valueChanged }) => valueChanged,
  ).length ?? 1;
  const attemptDeliveryCount = calibrationAttempts?.length ?? 1;
  if (calibrationAttempts && typeof actionResult !== "string") {
    await expect.poll(
      () => qualifyingDeliveries(harness).length - preActionQualifyingDeliveryCount,
      {
        message: `${descriptor.subactionId}: zero per-physical-range-tap visualization-slider request`,
        timeout: 10_000,
      },
    ).toBe(attemptDeliveryCount);
  } else {
    await expect.poll(
      () => qualifyingDeliveries(harness).length - preActionQualifyingDeliveryCount,
      { message: `${descriptor.subactionId}: zero per-subaction analytics request`, timeout: 10_000 },
    ).toBe(1);
  }
  const capturedDeliveries = qualifyingDeliveries(harness).slice(
    preActionQualifyingDeliveryCount,
    preActionQualifyingDeliveryCount + attemptDeliveryCount,
  );
  for (const [deliveryIndex, delivery] of capturedDeliveries.entries()) {
    await expect.poll(
      () => delivery.responseStatus,
      {
        message: `${descriptor.subactionId}: learning-event response ${deliveryIndex} was not observed`,
        timeout: 10_000,
      },
    ).toBe(200);
  }
  const actionSettled = monotonicWallClock();
  await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
  const postActionQualifyingDeliveryCount = qualifyingDeliveries(harness).length;
  expect(
    postActionQualifyingDeliveryCount,
    `${descriptor.subactionId}: post-action analytics window must stay quiet`,
  ).toBe(preActionQualifyingDeliveryCount + attemptDeliveryCount);
  const catalog = getVisualizationLabByLabId(labId);
  if (!catalog) throw new TypeError(`${labId}: exact analytics catalog row disappeared.`);
  const serializeDelivery = (
    delivery: AnalyticsHarness["deliveries"][number],
    interval: {
      settledAt: string;
      settledMonotonicMs: number;
      startedAt: string;
      startedMonotonicMs: number;
      wallClockMinusMonotonicOriginMs: number;
    },
    subactionId: string,
  ): NonNullable<CalibrationAttempt["delivery"]> => {
    expect(delivery.ownerUserId, `${subactionId}: x-mais-analytics-user-id`).toBe(expectedUserId);
    exactKeys(delivery.rawBody, ["events", "generation"], `${subactionId}: raw request body`);
    const rawBody = delivery.rawBody as { events: unknown[]; generation: unknown };
    expect(Number.isSafeInteger(rawBody.generation)).toBe(true);
    expect(Number(rawBody.generation)).toBeGreaterThanOrEqual(0);
    expect(delivery.rawEvents, `${subactionId}: exact raw events array`).toHaveLength(1);
    expect(rawBody.events, `${subactionId}: body and retained raw array`).toEqual(delivery.rawEvents);
    const rawEvent = delivery.rawEvents?.[0];
    exactKeys(
      rawEvent,
      ["grade", "id", "source", "timestamp", "topicId", "type"],
      `${subactionId}: sole full-shape raw event`,
    );
    const event = rawEvent as RawAnalyticsEvent;
    expect(event.grade, `${subactionId}: exact catalog grade`).toBe(catalog.grade);
    expect(event.id, `${subactionId}: nonempty event id`).toMatch(/\S/u);
    expect(Number.isFinite(Date.parse(event.timestamp)), `${subactionId}: timestamp`).toBe(true);
    const eventTimestamp = Date.parse(event.timestamp);
    const actionStartedAt = Date.parse(interval.startedAt);
    const requestObservedAt = Date.parse(delivery.requestObservedAt);
    const actionSettledAt = Date.parse(interval.settledAt);
    expect(actionStartedAt).toBeLessThanOrEqual(requestObservedAt);
    expect(requestObservedAt).toBeLessThanOrEqual(actionSettledAt);
    expect(interval.startedMonotonicMs).toBeLessThanOrEqual(delivery.requestObservedMonotonicMs);
    expect(delivery.requestObservedMonotonicMs).toBeLessThanOrEqual(interval.settledMonotonicMs);
    expect(eventTimestamp).toBeGreaterThanOrEqual(actionStartedAt - CLOCK_PRECISION_TOLERANCE_MS);
    expect(eventTimestamp).toBeLessThanOrEqual(requestObservedAt + CLOCK_PRECISION_TOLERANCE_MS);
    expect(eventTimestamp).toBeLessThanOrEqual(actionSettledAt + CLOCK_PRECISION_TOLERANCE_MS);
    const sampleOrigins = [
      actionStartedAt - interval.startedMonotonicMs,
      requestObservedAt - delivery.requestObservedMonotonicMs,
      actionSettledAt - interval.settledMonotonicMs,
    ];
    expect(Math.max(...sampleOrigins) - Math.min(...sampleOrigins)).toBeLessThanOrEqual(
      CLOCK_PRECISION_TOLERANCE_MS,
    );
    for (const origin of sampleOrigins) {
      expect(Math.abs(origin - interval.wallClockMinusMonotonicOriginMs)).toBeLessThanOrEqual(
        CLOCK_PRECISION_TOLERANCE_MS,
      );
    }
    expect(event.topicId, `${subactionId}: exact topic timing`).toBe(labId);
    expect(event.source, `${subactionId}: exact source timing`).toBe(expectedSource);
    const expectedEventType = expectedG02AnalyticsEventType(descriptor);
    expect(event.type, `${subactionId}: exact physical event type`).toBe(expectedEventType);
    if (!isRecord(delivery.rawResponseBody)) {
      throw new TypeError(`${subactionId}: learning-event response body is not an object.`);
    }
    expect(delivery.rawResponseBody.acknowledgedEventIds, `${subactionId}: exact ACK ids`).toEqual([event.id]);
    if (harness.consumedAnalyticsEventIds.has(event.id)) {
      throw new TypeError(`${stateId}: preceding analytics event ${event.id} replayed for a later subaction.`);
    }
    harness.consumedAnalyticsEventIds.add(event.id);
    const analyticsCaptureSequence = counters.captureSequence++;
    return {
      analyticsCaptureSequence,
      analyticsEvidence: {
        endpoint: "/api/learning-events",
        method: "POST",
        request: {
          body: {
            events: [{ ...event }] as [RawAnalyticsEvent],
            generation: rawBody.generation as number,
          },
          eventIds: [event.id],
          ownerHeader: "x-mais-analytics-user-id",
          userId: expectedUserId,
        },
        response: { acknowledgedEventIds: [event.id], status: 200 },
      },
      event: {
        actionId: stateId,
        eventId: event.id,
        labId,
        source: event.source,
        stateId,
        subactionId,
        topicId: event.topicId,
        type: expectedEventType,
        userId: expectedUserId,
      },
      requestObservedAt: delivery.requestObservedAt,
      requestObservedMonotonicMs: delivery.requestObservedMonotonicMs,
    };
  };
  if (calibrationAttempts && typeof actionResult !== "string") {
    const attempts: CalibrationAttempt[] = calibrationAttempts.map((attempt, attemptIndex) => {
      const matchingDeliveries = capturedDeliveries.filter(({
        requestObservedAt,
        requestObservedMonotonicMs,
      }) =>
        Date.parse(requestObservedAt) >=
          Date.parse(attempt.startedAt) - CLOCK_PRECISION_TOLERANCE_MS &&
        Date.parse(requestObservedAt) <=
          Date.parse(attempt.settledAt) + CLOCK_PRECISION_TOLERANCE_MS &&
        requestObservedMonotonicMs >=
          attempt.startedMonotonicMs - CLOCK_PRECISION_TOLERANCE_MS &&
        requestObservedMonotonicMs <=
          attempt.settledMonotonicMs + CLOCK_PRECISION_TOLERANCE_MS
      );
      expect(
        matchingDeliveries,
        `${descriptor.subactionId}: calibration attempt ${attemptIndex} exact delivery cardinality`,
      ).toHaveLength(1);
      const attemptSubactionId = attemptIndex === calibrationAttempts.length - 1
        ? descriptor.subactionId
        : `${descriptor.subactionId}:calibration-attempt:${attemptIndex}`;
      return {
        afterValue: attempt.afterValue,
        attemptIndex: attempt.attemptIndex,
        beforeValue: attempt.beforeValue,
        coordinate: { ...attempt.coordinate },
        delivery: serializeDelivery(matchingDeliveries[0]!, attempt, attemptSubactionId),
        physicalCaptureSequence: attempt.physicalCaptureSequence,
        plannedRole: attempt.plannedRole,
        settledAt: attempt.settledAt,
        settledMonotonicMs: attempt.settledMonotonicMs,
        startedAt: attempt.startedAt,
        startedMonotonicMs: attempt.startedMonotonicMs,
        valueChanged: attempt.valueChanged,
        wallClockMinusMonotonicOriginMs: attempt.wallClockMinusMonotonicOriginMs,
      };
    });
    const finalSettlingAttemptIndex = attempts.length - 1;
    const finalAttempt = attempts[finalSettlingAttemptIndex];
    if (!finalAttempt?.delivery || finalAttempt.afterValue !== actionResult.targetValue) {
      throw new TypeError(`${descriptor.subactionId}: finalAttempt.delivery is not target-owning.`);
    }
    const retainedDeliveryEventIds = attempts.map(({ delivery }) => delivery.event.eventId);
    return {
      analyticsEvidence: finalAttempt.delivery.analyticsEvidence,
      calibrationEvidence: {
        aggregateTapCount: attempts.length,
        attempts,
        commitPolicy: "one-visualization-slider-event-per-physical-tap-including-native-no-op" as const,
        consumedDeliveryEventIds: [...retainedDeliveryEventIds],
        finalSettlingAttemptIndex,
        inputGeometry: { ...actionResult.inputGeometry },
        retainedDeliveryEventIds,
        targetValue: actionResult.targetValue,
        terminalValue: actionResult.terminalValue,
        valueChangingAttemptCount,
      },
      event: {
        ...finalAttempt.delivery.event,
        subactionId: descriptor.subactionId,
      },
      ...descriptor,
      method: actionResult.method,
      temporal: {
        actionSettledAt: actionSettled.iso,
        actionSettledMonotonicMs: actionSettled.monotonicMs,
        actionStartedAt: actionStarted.iso,
        actionStartedMonotonicMs: actionStarted.monotonicMs,
        captureSequence: finalAttempt.delivery.analyticsCaptureSequence,
        postActionQualifyingDeliveryCount,
        postActionQuiet: true,
        preActionQualifyingDeliveryCount,
        preActionQuiet: true,
        originToleranceMs: CLOCK_PRECISION_TOLERANCE_MS as 2,
        quietIntervalMs: ANALYTICS_QUIET_INTERVAL_MS,
        requestObservedAt: finalAttempt.delivery.requestObservedAt,
        requestObservedMonotonicMs: finalAttempt.delivery.requestObservedMonotonicMs,
        toleranceMs: CLOCK_PRECISION_TOLERANCE_MS as 2,
        wallClockMinusMonotonicOriginMs: actionStarted.wallClockMinusMonotonicOriginMs,
      },
    };
  }
  if (typeof actionResult !== "string") {
    throw new TypeError(`${descriptor.subactionId}: calibrated action retained no physical attempts.`);
  }
  const delivery = capturedDeliveries[0];
  if (!delivery) throw new TypeError(`${descriptor.subactionId}: analytics delivery disappeared.`);
  const serialized = serializeDelivery(
    delivery,
    {
      settledAt: actionSettled.iso,
      settledMonotonicMs: actionSettled.monotonicMs,
      startedAt: actionStarted.iso,
      startedMonotonicMs: actionStarted.monotonicMs,
      wallClockMinusMonotonicOriginMs: actionStarted.wallClockMinusMonotonicOriginMs,
    },
    descriptor.subactionId,
  );
  return {
    analyticsEvidence: serialized.analyticsEvidence,
    calibrationEvidence: null,
    event: {
      ...serialized.event,
      subactionId: descriptor.subactionId,
    },
    ...descriptor,
    method: actionResult,
    temporal: {
      actionSettledAt: actionSettled.iso,
      actionSettledMonotonicMs: actionSettled.monotonicMs,
      actionStartedAt: actionStarted.iso,
      actionStartedMonotonicMs: actionStarted.monotonicMs,
      captureSequence: serialized.analyticsCaptureSequence,
      postActionQualifyingDeliveryCount,
      postActionQuiet: true,
      preActionQualifyingDeliveryCount,
      preActionQuiet: true,
      originToleranceMs: CLOCK_PRECISION_TOLERANCE_MS as 2,
      quietIntervalMs: ANALYTICS_QUIET_INTERVAL_MS,
      requestObservedAt: serialized.requestObservedAt,
      requestObservedMonotonicMs: serialized.requestObservedMonotonicMs,
      toleranceMs: CLOCK_PRECISION_TOLERANCE_MS as 2,
      wallClockMinusMonotonicOriginMs: actionStarted.wallClockMinusMonotonicOriginMs,
    },
  };
}

async function selectMode(
  page: Page,
  root: Locator,
  mode: string,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  identity: TapSemanticIdentity,
) {
  const button = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
  );
  const method = await realTapOrClick(
    page,
    button,
    project,
    counters,
    "interaction-non-range",
    identity,
  );
  await settle(root, `mode:${mode}`);
  await expect(root.locator("[data-viz-configured-model]")).toHaveAttribute("data-viz-mode", mode);
  return method;
}

async function realReset(
  page: Page,
  root: Locator,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  category: "interaction-non-range" | "visual-reset",
  identity: TapSemanticIdentity,
) {
  const method = await realTapOrClick(
    page,
    root.locator("[data-viz-reset-model]"),
    project,
    counters,
    category,
    identity,
  );
  await settle(root, "reset");
  await resetReceipt(root);
  return method;
}

async function controlEvidence(
  root: Locator,
  scenarioId: string,
): Promise<G02InteractionStateReceipt["control"]> {
  if (scenarioId === "initial" || scenarioId === "reset") {
    return {
      controlId: null,
      kind: "none",
      max: null,
      min: null,
      options: [],
      selected: null,
      step: null,
    };
  }
  if (scenarioId.startsWith("mode:") || scenarioId.startsWith("estimate-from:")) {
    const selected = scenarioId.startsWith("mode:")
      ? scenarioId.slice("mode:".length)
      : "estimate-check";
    const buttons = root.locator("[data-viz-mode-button]");
    const options = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-viz-mode") ?? ""),
    );
    return {
      controlId: "operation",
      kind: "button",
      max: null,
      min: null,
      options,
      selected,
      step: null,
    };
  }
  const parameter = scenarioId === "first"
    ? "operand-a"
    : scenarioId.split(":")[2];
  if (!parameter) throw new TypeError(`${scenarioId}: range parameter is absent.`);
  const range = root.locator(
    `input[type="range"][data-viz-parameter=${JSON.stringify(parameter)}]`,
  );
  await expect(range).toHaveCount(1);
  return {
    controlId: parameter,
    kind: "range",
    max: Number(await range.getAttribute("max")),
    min: Number(await range.getAttribute("min")),
    options: [],
    selected: Number(await range.inputValue()),
    step: Number((await range.getAttribute("step")) ?? "1"),
  };
}

async function performScenarioAction(
  page: Page,
  root: Locator,
  scenarioId: string,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  tapContext: TapSemanticContext,
  record: PhysicalSubactionRecorder,
) {
  const interactionIdentity = (descriptor: SubactionDescriptor): TapSemanticIdentity => ({
    ...tapContext,
    phase: "interaction",
    subactionId: descriptor.subactionId,
    target: descriptor.target,
  });
  if (scenarioId === "first") {
    const range = root.locator('input[type="range"][data-viz-parameter="operand-a"]');
    const descriptor = { kind: "primary", subactionId: "primary:range:operand-a:increment", target: "range:operand-a:increment" } as const;
    await setRangeThroughRealInput(
      page,
      root,
      range,
      126,
      project,
      counters,
      descriptor,
      interactionIdentity(descriptor),
      record,
    );
    await settle(root, scenarioId);
  } else if (scenarioId.startsWith("mode:")) {
    const mode = scenarioId.slice("mode:".length);
    const descriptor = { kind: "primary", subactionId: `primary:mode:${mode}`, target: `mode:${mode}` } as const;
    await record(
      descriptor,
      () => selectMode(page, root, mode, project, counters, interactionIdentity(descriptor)),
    );
  } else if (scenarioId.startsWith("estimate-from:")) {
    const exactOperation = scenarioId.slice("estimate-from:".length);
    if (exactOperation !== "add") {
      const descriptor = { kind: "setup", subactionId: `setup:mode:${exactOperation}`, target: `mode:${exactOperation}` } as const;
      await record(
        descriptor,
        () => selectMode(page, root, exactOperation, project, counters, interactionIdentity(descriptor)),
      );
    }
    const descriptor = { kind: "primary", subactionId: "primary:mode:estimate-check", target: "mode:estimate-check" } as const;
    await record(
      descriptor,
      () => selectMode(page, root, "estimate-check", project, counters, interactionIdentity(descriptor)),
    );
    await settle(root, scenarioId);
  } else if (scenarioId.startsWith("endpoint:")) {
    const [, mode, parameter, endpoint] = scenarioId.split(":");
    if (mode !== "add") {
      const descriptor = { kind: "setup", subactionId: `setup:mode:${mode}`, target: `mode:${mode}` } as const;
      await record(
        descriptor,
        () => selectMode(page, root, mode!, project, counters, interactionIdentity(descriptor)),
      );
    }
    const range = root.locator(
      `input[type="range"][data-viz-parameter=${JSON.stringify(parameter)}]`,
    );
    const min = Number(await range.getAttribute("min"));
    const max = Number(await range.getAttribute("max"));
    const target = endpoint === "min"
      ? min
      : endpoint === "max"
        ? max
        : Math.floor((min + max) / 2);
    const descriptor = { kind: "primary", subactionId: `primary:range:${parameter}:${endpoint}`, target: `range:${parameter}:${endpoint}` } as const;
    await setRangeThroughRealInput(
      page,
      root,
      range,
      target,
      project,
      counters,
      descriptor,
      interactionIdentity(descriptor),
      record,
    );
    await settle(root, scenarioId);
  } else if (scenarioId === "reset") {
    const descriptor = { kind: "primary", subactionId: "primary:reset", target: "reset" } as const;
    await record(
      descriptor,
      () => realReset(page, root, project, counters, "interaction-non-range", interactionIdentity(descriptor)),
    );
  } else {
    throw new TypeError(`${scenarioId}: unsupported exact G02 interaction scenario.`);
  }
}

async function interactionReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axisId: string,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
  expectedSource: string,
  firstPrimaryGate?: () => Promise<void>,
): Promise<G02InteractionStateReceipt> {
  const scenarioId = scenarioIdFrom(stateId, labId, axisId);
  if (scenarioId === "initial") {
    const scan = await uiScan(root, stateId);
    return {
      action: { actionId: stateId, modality: "none", realInput: false, subactions: [] },
      axisId,
      control: await controlEvidence(root, scenarioId),
      genericFallbackCount: await root.locator("[data-viz-renderer-mode]").count() as 0,
      labId,
      observation: await observeState(root),
      resetAfter: null,
      scenarioId,
      stateId,
      uiScan: {
        ...scan,
        clippedElementCount: scan.clippedElementCount as 0,
        collisionIssueCount: 0,
        contrastIssueCount: 0,
        horizontalOverflowPixels: scan.horizontalOverflowPixels as 0,
        touchTargetIssueCount: scan.touchTargetIssueCount as 0,
      },
    };
  }
  const subactions: G02InteractionStateReceipt["action"]["subactions"] = [];
  const record: PhysicalSubactionRecorder = async (descriptor, action) => {
    const receipt = await collectSubactionAnalytics(
      page,
      analytics,
      counters,
      stateId,
      labId,
      expectedUserId,
      expectedSource,
      descriptor,
      action,
    );
    subactions.push(receipt);
    return receipt;
  };
  const tapContext: TapSemanticContext = { axisId, labId, stateId };
  await performScenarioAction(page, root, scenarioId, project, counters, tapContext, record);
  if (firstPrimaryGate) await firstPrimaryGate();
  const observation = await observeState(root);
  const control = await controlEvidence(root, scenarioId);
  const scan = await uiScan(root, stateId);
  const genericFallbackCount = await root.locator("[data-viz-renderer-mode]").count();
  expect(genericFallbackCount).toBe(0);
  let resetAfter: G02InteractionStateReceipt["resetAfter"] = null;
  if (scenarioId !== "reset") {
    const resetDescriptor = { kind: "reset", subactionId: "reset:reset", target: "reset" } as const;
    await record(
      resetDescriptor,
      () => realReset(
        page,
        root,
        project,
        counters,
        "interaction-non-range",
        {
          ...tapContext,
          phase: "interaction",
          subactionId: resetDescriptor.subactionId,
          target: resetDescriptor.target,
        },
      ),
    );
    resetAfter = await resetReceipt(root);
  }
  return {
    action: {
      actionId: stateId,
      modality: project === "mobile-chrome" ? "touch" : "keyboard-mouse",
      realInput: true,
      subactions,
    },
    axisId,
    control,
    genericFallbackCount: genericFallbackCount as 0,
    labId,
    observation,
    resetAfter,
    scenarioId,
    stateId,
    uiScan: {
      ...scan,
      clippedElementCount: scan.clippedElementCount as 0,
      collisionIssueCount: 0,
      contrastIssueCount: 0,
      horizontalOverflowPixels: scan.horizontalOverflowPixels as 0,
      touchTargetIssueCount: scan.touchTargetIssueCount as 0,
    },
  };
}

async function setLocale(
  page: Page,
  locale: Locale,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  setupContext: TapSemanticContext & {
    category: "interaction-axis-setup" | "visual-axis-setup";
    phase: "interaction-axis-after-reload" | "interaction-axis-before-initial" | "visual-axis-setup";
  },
) {
  const expectedLang = locale === "en" ? "en" : locale === "zh" ? "zh-Hant" : "zh-Hans";
  const current = (await page.locator("html").getAttribute("lang")) ?? "";
  if (current === expectedLang) return;
  const identity = (subactionId: string, target: string): TapSemanticIdentity => ({
    axisId: setupContext.axisId,
    labId: setupContext.labId,
    phase: setupContext.phase,
    stateId: setupContext.stateId,
    subactionId,
    target,
  });
  const mobileMenu = page.getByRole("button", { name: /open mobile menu|開啟手機選單|打开手机菜单/i });
  if (await mobileMenu.isVisible().catch(() => false)) {
    await realTapOrClick(
      page,
      mobileMenu,
      project,
      counters,
      setupContext.category,
      identity(`${setupContext.phase}:locale:mobile-menu`, "header:mobile-menu"),
    );
  }
  const selector = page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i });
  await realTapOrClick(
    page,
    selector,
    project,
    counters,
    setupContext.category,
    identity(`${setupContext.phase}:locale:selector`, "header:language-selector"),
  );
  const label = locale === "en"
    ? /Use English|使用英文/i
    : locale === "zh"
      ? /Use Traditional Chinese|使用繁體中文|使用繁体中文/i
      : /Use Simplified Chinese|使用簡體中文|使用简体中文/i;
  await realTapOrClick(
    page,
    page.getByRole("menuitemradio", { name: label }),
    project,
    counters,
    setupContext.category,
    identity(`${setupContext.phase}:locale:${locale}`, `header:language-option:${locale}`),
  );
  await expect(page.locator("html")).toHaveAttribute("lang", expectedLang);
}

async function assertMobileHeaderActionableAfterPriorPageBottom(
  page: Page,
  root: Locator,
  project: G02ProductionProject,
  priorVisualState: G02VisualStateReceipt | null,
  nextState: { axisId: string; labId: string; stateId: string },
  counters: RuntimeCounters,
) {
  if (project !== "mobile-chrome" || !priorVisualState) return null;
  const priorScrollAudit = priorVisualState.scrollAudits.at(-1);
  if (
    priorVisualState.labId !== nextState.labId ||
    priorScrollAudit?.scrollId !== "page-bottom"
  ) throw new TypeError(`${nextState.stateId}: invalid prior visual page-bottom boundary.`);
  const fromGeometry = await pageScrollGeometry(page, root);
  const fromCaptured = monotonicWallClock();
  expect(
    {
      documentMaxScrollY: fromGeometry.documentMaxScrollY,
      rootDocumentBottom: fromGeometry.rootDocumentBottom,
      rootDocumentCenter: fromGeometry.rootDocumentCenter,
      rootDocumentTop: fromGeometry.rootDocumentTop,
      scrollY: fromGeometry.scrollY,
      viewport: {
        height: fromGeometry.viewportHeight,
        width: fromGeometry.viewportWidth,
      },
    },
    `${nextState.stateId}: live page-bottom geometry immediately before header scroll`,
  ).toEqual({
    documentMaxScrollY: priorScrollAudit.geometry.documentMaxScrollY,
    rootDocumentBottom: priorScrollAudit.geometry.rootDocumentBottom,
    rootDocumentCenter: priorScrollAudit.geometry.rootDocumentCenter,
    rootDocumentTop: priorScrollAudit.geometry.rootDocumentTop,
    scrollY: priorScrollAudit.geometry.scrollY,
    viewport: {
      height: priorScrollAudit.geometry.viewportHeight,
      width: priorScrollAudit.geometry.viewportWidth,
    },
  });
  const header = page.locator("header").first();
  const prepared = await prepareRawTouchTarget(page, header);
  const coordinate = {
    x: prepared.targetRect.x + prepared.targetRect.width / 2,
    y: prepared.targetRect.y + prepared.targetRect.height / 2,
  };
  assertRawTouchCoordinateInsidePreparation(prepared, coordinate);
  const observedFingerprint = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return {
      id: element?.id || null,
      role: element?.getAttribute("role") ?? null,
      tagName: element?.tagName.toLowerCase() ?? "",
      withinHeader: Boolean(element?.closest("header")),
    };
  }, coordinate);
  if (!observedFingerprint.withinHeader || observedFingerprint.tagName.length === 0) {
    throw new TypeError(`${nextState.stateId}: header center is obscured or has no live target.`);
  }
  const toHeaderCaptured = monotonicWallClock();
  return {
    fromAxisId: priorVisualState.axisId,
    fromBoundary: {
      capturedAt: fromCaptured.iso,
      capturedMonotonicMs: fromCaptured.monotonicMs,
      documentMaxScrollY: fromGeometry.documentMaxScrollY,
      rootDocumentBottom: fromGeometry.rootDocumentBottom,
      rootDocumentCenter: fromGeometry.rootDocumentCenter,
      rootDocumentTop: fromGeometry.rootDocumentTop,
      scrollY: fromGeometry.scrollY,
      viewport: {
        height: fromGeometry.viewportHeight,
        width: fromGeometry.viewportWidth,
      },
      wallClockMinusMonotonicOriginMs: fromCaptured.wallClockMinusMonotonicOriginMs,
    },
    fromScrollId: "page-bottom" as const,
    fromStateId: priorVisualState.stateId,
    labId: nextState.labId,
    toAxisId: nextState.axisId,
    toHeader: {
      capturedAt: toHeaderCaptured.iso,
      capturedMonotonicMs: toHeaderCaptured.monotonicMs,
      coordinate,
      preparation: prepared.preparation,
      targetFingerprint: {
        ...observedFingerprint,
        withinHeader: true as const,
      },
      targetRect: prepared.targetRect,
      viewport: prepared.viewport,
      wallClockMinusMonotonicOriginMs:
        toHeaderCaptured.wallClockMinusMonotonicOriginMs,
    },
    toStateId: nextState.stateId,
    transitionSequence: counters.headerTransitionSequence++,
  };
}

async function setTheme(
  page: Page,
  theme: Theme,
  project: G02ProductionProject,
  counters: RuntimeCounters,
  setupContext: TapSemanticContext & {
    category: "interaction-axis-setup" | "visual-axis-setup";
    phase: "interaction-axis-after-reload" | "interaction-axis-before-initial" | "visual-axis-setup";
  },
) {
  const dark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
  if (dark === (theme === "dark")) return;
  const toggle = page.getByRole("button", {
    name: /Switch to dark mode|Switch to light mode|切換至深色模式|切換至淺色模式|切换至深色模式|切换至浅色模式/i,
  });
  await realTapOrClick(
    page,
    toggle,
    project,
    counters,
    setupContext.category,
    {
      axisId: setupContext.axisId,
      labId: setupContext.labId,
      phase: setupContext.phase,
      stateId: setupContext.stateId,
      subactionId: `${setupContext.phase}:theme:${theme}`,
      target: `header:theme-toggle:${theme}`,
    },
  );
  await expect.poll(
    () => page.locator("html").evaluate((element) => element.classList.contains("dark")),
  ).toBe(theme === "dark");
}

async function observeInteractionSurface(
  page: Page,
  interactionAxis: { axisId: string; locale: string; theme: string },
  observation: {
    labId: string;
    phase: "after-reload" | "before-initial";
  },
): Promise<G02ProductionBrowserPayload["interactionSurfaceObservations"][number]> {
  if (
    (interactionAxis.locale !== "en" && interactionAxis.locale !== "zh" && interactionAxis.locale !== "zh-Hans") ||
    (interactionAxis.theme !== "dark" && interactionAxis.theme !== "light")
  ) throw new TypeError(`${interactionAxis.axisId}: unsupported interaction surface.`);
  const expectedHtmlLang = interactionAxis.locale === "zh" ? "zh-Hant" : interactionAxis.locale;
  const htmlLang = await page.locator("html").getAttribute("lang");
  const dark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
  expect(htmlLang, `${observation.labId}: exact live interaction locale`).toBe(expectedHtmlLang);
  expect(dark, `${observation.labId}: exact live interaction theme`).toBe(interactionAxis.theme === "dark");
  return {
    axisId: interactionAxis.axisId,
    htmlLang: expectedHtmlLang,
    labId: observation.labId,
    locale: interactionAxis.locale,
    phase: observation.phase,
    setupActions: [],
    setupTapCount: 0,
    theme: interactionAxis.theme,
  };
}

async function realHorizontalSwipe(
  page: Page,
  root: Locator,
  counters: RuntimeCounters,
  direction: "toward-end" | "toward-start",
) {
  const scroller = root.locator("[data-viz-scroll-container]");
  await expect(scroller).toHaveCount(1);
  const box = await scroller.boundingBox();
  if (!box) throw new TypeError("G02 mobile scroll container has no real bounding box.");
  const before = await scroller.evaluate((element) => element.scrollLeft);
  const maxScroll = await scroller.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(maxScroll, "G02 mobile horizontal swipe requires real overflow").toBeGreaterThan(0);
  const context = page.context();
  const session = await context.newCDPSession(page);
  const y = box.y + Math.min(box.height / 2, 180);
  const swipeTowardEnd = direction === "toward-end";
  const startX = box.x + box.width * (swipeTowardEnd ? 0.8 : 0.2);
  const endX = box.x + box.width * (swipeTowardEnd ? 0.2 : 0.8);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y }],
  });
  const moveCount = 4;
  for (let index = 1; index <= moveCount; index += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX + ((endX - startX) * index) / moveCount, y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  counters.realSwipeCount += 1;
  counters.swipeMoveCount += moveCount;
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).not.toBe(before);
  const after = await scroller.evaluate((element) => element.scrollLeft);
  const signedDisplacement = after - before;
  if (
    (direction === "toward-end" && signedDisplacement <= 0) ||
    (direction === "toward-start" && signedDisplacement >= 0)
  ) {
    throw new TypeError(`${direction}: horizontal swipe has wrong signed displacement.`);
  }
  const evidence = {
    afterScrollLeft: after,
    beforeScrollLeft: before,
    direction,
    moveCount: 4 as const,
    protocol: "cdp:Input.dispatchTouchEvent" as const,
    signedDisplacement,
  };
  counters.directionalSwipes.push(evidence);
  return evidence;
}

async function pageScrollGeometry(page: Page, root: Locator) {
  return root.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const rootCenter = (rect.top + rect.bottom) / 2;
    return {
      centerTolerancePx: 40 as const,
      documentMaxScrollY: Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
      ),
      rootBottom: rect.bottom,
      rootCenter,
      rootDocumentBottom: rect.bottom + scrollY,
      rootDocumentCenter: rootCenter + scrollY,
      rootDocumentTop: rect.top + scrollY,
      rootTop: rect.top,
      scrollY,
      viewportCenter: viewportHeight / 2,
      viewportHeight,
      viewportWidth,
    };
  });
}

function reachedScrollLandmark(
  geometry: Awaited<ReturnType<typeof pageScrollGeometry>>,
  scrollId: (typeof SCROLL_POSITIONS)[number],
) {
  return geometry.documentMaxScrollY > 0 && (scrollId === "page-top"
    ? geometry.scrollY <= 1
    : scrollId === "page-bottom"
      ? geometry.scrollY >= geometry.documentMaxScrollY - 1
      : Math.abs(geometry.rootCenter - geometry.viewportCenter) <=
        geometry.centerTolerancePx);
}

async function realMobileVerticalSwipe(page: Page, direction: "down-page" | "up-page") {
  const viewport = page.viewportSize();
  if (!viewport) throw new TypeError("G02 mobile vertical swipe has no viewport.");
  const session = await page.context().newCDPSession(page);
  const x = viewport.width / 2;
  const startY = viewport.height * (direction === "down-page" ? 0.78 : 0.22);
  const endY = viewport.height * (direction === "down-page" ? 0.22 : 0.78);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY }],
  });
  for (let index = 1; index <= 4; index += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: startY + ((endY - startY) * index) / 4 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await page.waitForTimeout(50);
}

async function reachRealScrollPosition(
  page: Page,
  root: Locator,
  scrollId: (typeof SCROLL_POSITIONS)[number],
  project: G02ProductionProject,
) {
  if (project === "desktop-chrome") {
    if (scrollId === "page-top") await page.keyboard.press("Home");
    if (scrollId === "visualization-center") await root.scrollIntoViewIfNeeded();
    if (scrollId === "page-bottom") await page.keyboard.press("End");
    await expect.poll(
      async () => reachedScrollLandmark(await pageScrollGeometry(page, root), scrollId),
      { message: `${scrollId}: desktop physical input did not reach exact landmark` },
    ).toBe(true);
    return scrollId === "visualization-center"
      ? "locator.scrollIntoViewIfNeeded" as const
      : "page.keyboard.press" as const;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const geometry = await pageScrollGeometry(page, root);
    const finished = reachedScrollLandmark(geometry, scrollId);
    if (finished) return "cdp:Input.dispatchTouchEvent:vertical" as const;
    const direction = scrollId === "page-top"
      ? "up-page"
      : scrollId === "page-bottom"
        ? "down-page"
        : geometry.rootCenter > geometry.viewportCenter
          ? "down-page"
          : "up-page";
    await realMobileVerticalSwipe(page, direction);
  }
  throw new TypeError(`${scrollId}: real mobile CDP scroll did not reach its audited position.`);
}

async function visualReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axis: { axisId: string; locale: string; project: string; theme: string },
  project: G02ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
  expectedSource: string,
  priorVisualState: G02VisualStateReceipt | null,
): Promise<G02VisualStateReceipt> {
  if (
    (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
    (axis.theme !== "dark" && axis.theme !== "light") ||
    axis.project !== project
  ) throw new TypeError(`${axis.axisId}: invalid G02 visual axis.`);
  const headerTransition = await assertMobileHeaderActionableAfterPriorPageBottom(
    page,
    root,
    project,
    priorVisualState,
    { axisId: axis.axisId, labId, stateId },
    counters,
  );
  const visualSetupContext = {
    axisId: axis.axisId,
    category: "visual-axis-setup" as const,
    labId,
    phase: "visual-axis-setup" as const,
    stateId,
  };
  await setLocale(page, axis.locale, project, counters, visualSetupContext);
  await setTheme(page, axis.theme, project, counters, visualSetupContext);
  const resetAction = await collectSubactionAnalytics(
    page,
    analytics,
    counters,
    stateId,
    labId,
    expectedUserId,
    expectedSource,
    { kind: "primary", subactionId: "primary:reset", target: "reset" },
    () => realReset(
      page,
      root,
      project,
      counters,
      "visual-reset",
      {
        axisId: axis.axisId,
        labId,
        phase: "visual-reset",
        stateId,
        subactionId: "primary:reset",
        target: "reset",
      },
    ),
  );
  const reset = await resetReceipt(root);
  if (project === "mobile-chrome" && counters.directionalSwipes.length === 0) {
    await realHorizontalSwipe(page, root, counters, "toward-end");
    await realHorizontalSwipe(page, root, counters, "toward-start");
  }
  const scrollAudits: G02VisualStateReceipt["scrollAudits"] = [];
  for (const scrollId of SCROLL_POSITIONS) {
    const scrollMethod = await reachRealScrollPosition(page, root, scrollId, project);
    const geometry = await pageScrollGeometry(page, root);
    const scan = await uiScan(root, `${stateId}:${scrollId}`);
    const scrollCaptured = monotonicWallClock();
    scrollAudits.push({
      capturedAt: scrollCaptured.iso,
      capturedMonotonicMs: scrollCaptured.monotonicMs,
      clippedElementCount: scan.clippedElementCount as 0,
      collisionIssueCount: 0,
      contrastCheckedTextCount: scan.contrastCheckedTextCount,
      contrastIssueCount: 0,
      geometry: {
        centerTolerancePx: geometry.centerTolerancePx,
        documentMaxScrollY: geometry.documentMaxScrollY,
        rootBottom: geometry.rootBottom,
        rootCenter: geometry.rootCenter,
        rootDocumentBottom: geometry.rootDocumentBottom,
        rootDocumentCenter: geometry.rootDocumentCenter,
        rootDocumentTop: geometry.rootDocumentTop,
        rootTop: geometry.rootTop,
        scrollY: geometry.scrollY,
        viewportCenter: geometry.viewportCenter,
        viewportHeight: geometry.viewportHeight,
        viewportWidth: geometry.viewportWidth,
      },
      horizontalOverflowPixels: scan.horizontalOverflowPixels as 0,
      scrollId,
      scrollMethod,
      touchTargetCheckedCount: scan.touchTargetCheckedCount,
      touchTargetIssueCount: scan.touchTargetIssueCount as 0,
      uiScan: scan.uiScan,
      wallClockMinusMonotonicOriginMs:
        scrollCaptured.wallClockMinusMonotonicOriginMs,
    });
  }
  const configuredModelCount = await root.locator("[data-viz-configured-model]").count();
  const genericFallbackCount = await root.locator("[data-viz-renderer-mode]").count();
  const resetControlCount = await root.locator("[data-viz-reset-model]").count();
  expect([configuredModelCount, genericFallbackCount, resetControlCount]).toEqual([1, 0, 1]);
  return {
    axisId: axis.axisId,
    headerTransition,
    identity: {
      activeLabId: labId,
      configuredModelCount: configuredModelCount as 1,
      genericFallbackCount: genericFallbackCount as 0,
      playApplicable: false,
      renderer: "mainland-decimal-arithmetic",
      resetControlCount: resetControlCount as 1,
    },
    labId,
    locale: axis.locale,
    project,
    reset,
    resetAction,
    scrollAudits,
    stateId,
    theme: axis.theme,
  };
}

test.describe("Mainland G02 exact production browser receipt", () => {
  test("requires trusted native runner authority before producing G02 learner evidence", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60 * 60_000);
    const runnerInvocation = requireG02ProductionRunnerAuthority();
    const project = projectFrom(testInfo);
    const viewport = page.viewportSize();
    if (!viewport) throw new TypeError(`${project}: missing real viewport.`);
    if (project === "desktop-chrome") {
      expect(viewport).toEqual({ width: 1440, height: 1100 });
    } else {
      expect(viewport.width).toBeLessThanOrEqual(500);
      expect(viewport.height).toBeGreaterThanOrEqual(700);
    }
    const diagnostics = installDiagnostics(page);
    const counters: RuntimeCounters = {
      calibrationPhysicalCaptureSequence: 0,
      captureSequence: 0,
      directionalSwipes: [],
      headerTransitionSequence: 0,
      realSwipeCount: 0,
      realTapCount: 0,
      sessionPostCount: 0,
      sessionSeedApiPostCount: 0,
      swipeMoveCount: 0,
      tapCategoryCounts: {
        calibrationAttemptCount: 0,
        interactionAxisSetupTapCount: 0,
        interactionNonRangeTapCount: 0,
        sessionSeedTapCount: 0,
        visualAxisSetupTapCount: 0,
        visualResetTapCount: 0,
      },
      tapEntries: [],
    };
    installSessionPostCounter(page, counters);
    await installHkVisualizationEffectiveVisibilityInspector(page);

    const interactionAxis = expectedInteractionAxis(project);
    const interactionStateIds = expectedInteractionStateIds(project);
    const visualAxes = expectedVisualAxes(project);
    const visualStateIds = expectedVisualStateIds(project);
    const interactionStates: G02InteractionStateReceipt[] = [];
    const interactionSurfaceObservations: G02ProductionBrowserPayload["interactionSurfaceObservations"] = [];
    const visualStates: G02VisualStateReceipt[] = [];
    const durabilityReceipts: G02ProductionBrowserPayload["durabilityReceipts"] = [];
    const capturedQualifyingEventIds: string[] = [];
    const consumedReceiptEventIds: string[] = [];

    for (const [labSequenceIndex, labId] of G02_PRODUCTION_PLAN.labIds.entries()) {
      const student = await registerMainlandStudent(page, testInfo, labId, interactionAxis);
      const registeredSessions = await visualizationSessions(page);
      expect(registeredSessions, `${labId}: raw sessions immediately after registration`).toEqual([]);
      const rawAfterRegistration: [] = [];
      const { rawSiblingSeed, seededSessions, siblingBaseline } = await seedSiblingSessions(
        page,
        labId,
        counters,
        student.userId,
      );
      const baselineCounts = exactSiblingCounts(seededSessions);
      expect(targetSessions(seededSessions, labId)).toEqual([]);
      const expectedAllSessionLabIds = [
        ...G02_PRODUCTION_PLAN.labIds.filter((candidate) => candidate !== labId),
        labId,
      ];
      const analytics = installAnalyticsHarness(page);
      const mountPosts = counters.sessionPostCount;
      const mountAnalyticsDeliveries = qualifyingDeliveries(analytics).length;
      const response = await page.goto(`/student/lessons/${encodeURIComponent(labId)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);
      await closeLearnerStartSetupIfVisible(page);
      let root = await activeRoot(page, labId);
      await settle(root, `${labId}:mount`);
      await resetReceipt(root);
      interactionSurfaceObservations.push(
        await observeInteractionSurface(
          page,
          interactionAxis,
          { labId, phase: "before-initial" },
        ),
      );
      await page.waitForTimeout(5_500);
      expect(counters.sessionPostCount - mountPosts).toBe(0);
      const afterMount = await visualizationSessions(page);
      exactRawSessionCheckpoint(
        afterMount,
        G02_PRODUCTION_PLAN.labIds.filter((candidate) => candidate !== labId),
        `${labId}: after mount`,
      );
      expect(targetSessions(afterMount, labId)).toEqual([]);
      expectSiblingSessionsUnchanged(afterMount, labId, siblingBaseline);
      expect(
        qualifyingDeliveries(analytics).length - mountAnalyticsDeliveries,
        `${labId}: mount must not create a qualifying learning-event request`,
      ).toBe(0);

      const labStateIds = interactionStateIds.filter((stateId) =>
        stateId.startsWith(`interaction:${labId}:${interactionAxis.axisId}:`),
      );
      const initialStateId = labStateIds[0];
      const firstStateId = labStateIds[1];
      if (!initialStateId?.endsWith(":initial") || !firstStateId?.endsWith(":first")) {
        throw new TypeError(`${labId}: G02 initial/first plan order drifted.`);
      }
      interactionStates.push(
        await interactionReceipt(
          page,
          root,
          initialStateId,
          labId,
          interactionAxis.axisId,
          project,
          counters,
          analytics,
          student.userId,
          student.analyticsSource,
        ),
      );

      const firstPostBaseline = counters.sessionPostCount;
      const firstAckPromise = page.waitForResponse((candidate) =>
        candidate.request().method() === "POST" &&
        applicationPath(candidate.url()) === "/api/visualization-sessions",
      );
      let acknowledgementStatus: 200 | null = null;
      let afterFirst: LiveSession[] | null = null;
      let rawAfterFirst: ReturnType<typeof durableSessionSnapshot>[] | null = null;
      let sessionId: string | null = null;
      interactionStates.push(
        await interactionReceipt(
          page,
          root,
          firstStateId,
          labId,
          interactionAxis.axisId,
          project,
          counters,
          analytics,
          student.userId,
          student.analyticsSource,
          async () => {
            const firstAck = await firstAckPromise;
            expect(firstAck.status()).toBe(200);
            acknowledgementStatus = 200;
            const firstSessionRequest = firstAck.request();
            expect(
              decodeURIComponent(firstSessionRequest.headers()["x-mais-visualization-user-id"] ?? ""),
            ).toBe(student.userId);
            expect(requestBody(firstSessionRequest)).toEqual({
              moduleId: MODULE_ID,
              source: student.analyticsSource,
              topicId: labId,
            });
            const acknowledgement = await readJson<{
              acknowledgedUserId?: unknown;
              durablyPersisted?: unknown;
              session?: LiveSession;
            }>(firstAck, `${labId}: first-action session ACK`, 200);
            expect(acknowledgement).toMatchObject({
              acknowledgedUserId: student.userId,
              durablyPersisted: true,
              session: {
                explored: true,
                moduleId: MODULE_ID,
                source: student.analyticsSource,
                topicId: labId,
              },
            });
            afterFirst = await visualizationSessions(page);
            rawAfterFirst = exactRawSessionCheckpoint(
              afterFirst,
              expectedAllSessionLabIds,
              `${labId}: after first action`,
            );
            expect(targetSessions(afterFirst, labId)).toHaveLength(1);
            expectSiblingSessionsUnchanged(afterFirst, labId, siblingBaseline);
            sessionId = canonicalSessionIdentity(targetSessions(afterFirst, labId)[0]!);
            expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
          },
        ),
      );
      if (acknowledgementStatus !== 200 || !afterFirst || !rawAfterFirst || !sessionId) {
        throw new TypeError(`${labId}: first session POST/200 gate did not finish before reset.`);
      }
      const afterReset = await visualizationSessions(page);
      const rawAfterReset = exactRawSessionCheckpoint(
        afterReset,
        expectedAllSessionLabIds,
        `${labId}: after reset`,
      );
      expect(targetSessions(afterReset, labId)).toHaveLength(1);
      expect(canonicalSessionIdentity(targetSessions(afterReset, labId)[0]!)).toBe(sessionId);
      expectSiblingSessionsUnchanged(afterReset, labId, siblingBaseline);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);

      const secondStateId = labStateIds[2];
      if (!secondStateId?.endsWith(":mode:add")) {
        throw new TypeError(`${labId}: G02 canonical second action is absent.`);
      }
      interactionStates.push(
        await interactionReceipt(
          page,
          root,
          secondStateId,
          labId,
          interactionAxis.axisId,
          project,
          counters,
          analytics,
          student.userId,
          student.analyticsSource,
        ),
      );
      const afterSecond = await visualizationSessions(page);
      const rawAfterSecond = exactRawSessionCheckpoint(
        afterSecond,
        expectedAllSessionLabIds,
        `${labId}: after second action`,
      );
      expect(targetSessions(afterSecond, labId)).toHaveLength(1);
      expect(canonicalSessionIdentity(targetSessions(afterSecond, labId)[0]!)).toBe(sessionId);
      expectSiblingSessionsUnchanged(afterSecond, labId, siblingBaseline);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);

      await page.reload({ waitUntil: "domcontentloaded" });
      await closeLearnerStartSetupIfVisible(page);
      root = await activeRoot(page, labId);
      await settle(root, `${labId}:reload`);
      interactionSurfaceObservations.push(
        await observeInteractionSurface(
          page,
          interactionAxis,
          { labId, phase: "after-reload" },
        ),
      );
      const afterReload = await visualizationSessions(page);
      const rawAfterReload = exactRawSessionCheckpoint(
        afterReload,
        expectedAllSessionLabIds,
        `${labId}: after reload`,
      );
      expect(targetSessions(afterReload, labId)).toHaveLength(1);
      expect(canonicalSessionIdentity(targetSessions(afterReload, labId)[0]!)).toBe(sessionId);
      expectSiblingSessionsUnchanged(afterReload, labId, siblingBaseline);

      for (const stateId of labStateIds.slice(3)) {
        interactionStates.push(
          await interactionReceipt(
            page,
            root,
            stateId,
            labId,
            interactionAxis.axisId,
            project,
            counters,
            analytics,
            student.userId,
            student.analyticsSource,
          ),
        );
      }
      let priorVisualState: G02VisualStateReceipt | null = null;
      for (const axis of visualAxes) {
        const stateId = `visual:${labId}:${axis.axisId}:reset`;
        if (!visualStateIds.includes(stateId)) {
          throw new TypeError(`${stateId}: visual state is absent from the frozen plan.`);
        }
        const visualStateReceipt = await visualReceipt(
          page,
          root,
          stateId,
          labId,
          axis,
          project,
          counters,
          analytics,
          student.userId,
          student.analyticsSource,
          priorVisualState,
        );
        visualStates.push(visualStateReceipt);
        priorVisualState = visualStateReceipt;
        const priorVisualAxisEndedAtPageBottom =
          priorVisualState.scrollAudits.at(-1)?.scrollId === "page-bottom";
        expect(
          priorVisualAxisEndedAtPageBottom,
          `${stateId}: visual axis must finish at the audited page-bottom boundary`,
        ).toBe(true);
      }

      const afterVisualFinal = await visualizationSessions(page);
      const afterVisualFinalCaptured = monotonicWallClock();
      const rawAfterVisualFinal = exactRawSessionCheckpoint(
        afterVisualFinal,
        expectedAllSessionLabIds,
        `${labId}: after all visual axes`,
      );
      const afterVisualTarget = targetSessions(afterVisualFinal, labId);
      expect(afterVisualTarget).toHaveLength(1);
      expect(canonicalSessionIdentity(afterVisualTarget[0]!)).toBe(sessionId);
      expectSiblingSessionsUnchanged(afterVisualFinal, labId, siblingBaseline);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      const finalQualifyingCount = qualifyingDeliveries(analytics).length;
      await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
      expect(
        qualifyingDeliveries(analytics).length,
        `${labId}: no late/unconsumed analytics delivery after all visual axes`,
      ).toBe(finalQualifyingCount);
      const labCapturedIds = qualifyingDeliveries(analytics).map(({ rawEvents }, index) => {
        if (rawEvents?.length !== 1 || !isRecord(rawEvents[0]) || typeof rawEvents[0].id !== "string") {
          throw new TypeError(`${labId}: qualifying delivery ${index} is not exactly consumable.`);
        }
        return rawEvents[0].id;
      });
      const labConsumedIds = [...analytics.consumedAnalyticsEventIds];
      expect(labCapturedIds, `${labId}: payload-wide captured/consumed event ids`).toEqual(labConsumedIds);
      capturedQualifyingEventIds.push(...labCapturedIds);
      consumedReceiptEventIds.push(...labConsumedIds);
      analytics.dispose();

      const finalSiblingSessions = exactG02SessionSnapshot(afterVisualFinal)
        .filter(({ topicId }) => topicId !== labId)
        .map(durableSessionSnapshot);
      expect(
        finalSiblingSessions.map(({ topicId }) => topicId),
        `${labId}: exact ordered final G02 siblings`,
      ).toEqual(G02_PRODUCTION_PLAN.labIds.filter((candidate) => candidate !== labId));
      const lastVisualReset = visualStates
        .filter((state) => state.labId === labId)
        .map(({ resetAction }) => resetAction)
        .sort((left, right) => left.temporal.captureSequence - right.temporal.captureSequence)
        .at(-1);
      if (!lastVisualReset) throw new TypeError(`${labId}: completed visual phase is absent.`);
      durabilityReceipts.push({
        afterVisualFinal: {
          captureBoundary: {
            afterActionCaptureSequence: lastVisualReset.temporal.captureSequence,
            beforeNextActionCaptureSequence:
              labSequenceIndex + 1 < G02_PRODUCTION_PLAN.labIds.length
                ? counters.captureSequence
                : null,
            capturedAt: afterVisualFinalCaptured.iso,
            capturedMonotonicMs: afterVisualFinalCaptured.monotonicMs,
            labSequenceIndex,
            wallClockMinusMonotonicOriginMs:
              afterVisualFinalCaptured.wallClockMinusMonotonicOriginMs,
          },
          postCount: counters.sessionPostCount - firstPostBaseline - 1 as 0,
          siblingCounts: exactSiblingCounts(afterVisualFinal),
          siblings: {
            count: finalSiblingSessions.length as 3,
            sessions: finalSiblingSessions,
            userId: student.userId,
          },
          target: {
            count: afterVisualTarget.length as 1,
            sessions: [durableSessionSnapshot(afterVisualTarget[0]!)],
            userId: student.userId,
          },
        },
        final: {
          exactlyOnce: true,
          noSiblingMutation: true,
          serverBacked: true,
          survivedReload: true,
        },
        firstAction: {
          acknowledgementStatus: 200,
          completedBeforeReset: true,
          postCount: 1,
          sessionCount: targetSessions(afterFirst, labId).length as 1,
        },
        labId,
        lessonId: labId,
        mount: { postCount: 0, sessionCount: 0 },
        rawSessionCheckpoints: {
          afterFirst: rawAfterFirst,
          afterRegistration: rawAfterRegistration,
          afterReload: rawAfterReload,
          afterReset: rawAfterReset,
          afterSecond: rawAfterSecond,
          afterSiblingSeed: rawSiblingSeed,
          afterVisualFinal: rawAfterVisualFinal,
        },
        reload: {
          sameSession: true,
          sessionCount: targetSessions(afterReload, labId).length as 1,
        },
        reset: {
          postCount: 0,
          sessionCount: targetSessions(afterReset, labId).length as 1,
        },
        secondAction: {
          postCount: 0,
          sessionCount: targetSessions(afterSecond, labId).length as 1,
        },
        sequence: ["mount-baseline", "primary-first-action", "session-post-200", "pre-reset-reread", "reset", "second-action", "reload-reread", "visual-axes", "after-visual-final"],
        sessionId,
        siblings: {
          afterFirst: exactSiblingCounts(afterFirst),
          afterReload: exactSiblingCounts(afterReload),
          afterReset: exactSiblingCounts(afterReset),
          afterSecond: exactSiblingCounts(afterSecond),
          afterVisualFinal: exactSiblingCounts(afterVisualFinal),
          baseline: baselineCounts,
        },
        userId: student.userId,
      });
    }

    expect(interactionStates.map((receipt) => receipt.stateId)).toEqual(interactionStateIds);
    expect(visualStates.map((receipt) => receipt.stateId)).toEqual(visualStateIds);
    expect(diagnostics.consoleErrors).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.requestFailures).toEqual([]);
    const payload: G02ProductionBrowserPayload = {
      analyticsCoverage: {
        capturedQualifyingDeliveryCount: capturedQualifyingEventIds.length,
        capturedQualifyingEventIds,
        consumedReceiptEventIds,
        exact: true,
        lateDeliveryCount: 0,
        unconsumedEventIds: [],
      },
      diagnostics: { consoleErrors: [], pageErrors: [], requestFailures: [] },
      durabilityReceipts,
      execution: { complete: false, projectsTogether: ["desktop-chrome", "mobile-chrome"], retries: 0, shard: null, skipped: 0, unexpected: 0 },
      fullVisualInteractionCartesian: false,
      groupId: "G02",
      interactionAxisId: interactionAxis.axisId,
      interactionSurfaceObservations,
      interactionStates,
      labIds: [...G02_PRODUCTION_PLAN.labIds],
      planCanonicalSha256: G02_PRODUCTION_PLAN.canonicalSha256,
      playApplicable: false,
      project,
      runnerInvocation,
      schemaVersion: "china-mainland-g02-production-browser-receipt.v1",
      sourceEvidence: { rawFiles: rawSourceEvidence() },
      touchEvidence: project === "mobile-chrome"
        ? {
            directionalSwipes: counters.directionalSwipes,
            hasTouch: true,
            nonUiSessionSeed: {
              postCount: counters.sessionSeedApiPostCount,
              transport: "page.request.post",
            },
            realSwipeCount: counters.realSwipeCount,
            realTapCount: counters.realTapCount,
            roundTrip: { continuityTolerancePx: 2, returnRegionFraction: 0.25 },
            swipeMoveCount: counters.swipeMoveCount,
            swipeProtocol: "cdp:Input.dispatchTouchEvent",
            tapCategoryCounts: counters.tapCategoryCounts,
            tapEntries: counters.tapEntries,
          }
        : {
            directionalSwipes: [],
            hasTouch: false,
            nonUiSessionSeed: {
              postCount: counters.sessionSeedApiPostCount,
              transport: "page.request.post",
            },
            realSwipeCount: 0,
            realTapCount: 0,
            roundTrip: null,
            swipeMoveCount: 0,
            swipeProtocol: "none",
            tapCategoryCounts: counters.tapCategoryCounts,
            tapEntries: counters.tapEntries,
          },
      visualAxisIds: visualAxes.map(({ axisId }) => axisId),
      visualStates,
    };
    const receipt = sealG02ProductionBrowserPayload(payload);
    validateG02ProductionBrowserReceipt(receipt, project);
    await testInfo.attach(`china-mainland-g02-production-${project}.json`, {
      body: Buffer.from(JSON.stringify(receipt, null, 2)),
      contentType: "application/json",
    });
  });
});
