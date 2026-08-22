import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from "@playwright/test";

import {
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  planSymbolicExpressionsControlTransition,
  SymbolicExpressionsControlDomainError,
  symbolicExpressionsControlDescriptorFor,
  type SymbolicExpressionsControlDomainState,
  type SymbolicExpressionsScenarioControlId,
} from "../../components/visualizations/mainland/SymbolicExpressionsControlDomain";
import {
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "../../components/visualizations/mainland/SymbolicExpressionsModel";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import { chinaVisualizationCollisionReceipt } from "./china-visualization-collision-receipt";
import { G07_PRODUCTION_PLAN } from "./china-mainland-g07-production-plan";
import {
  G07_APPROVED_PLAN_CANONICAL_SHA256,
  G07_SELECTED_CRITICAL_SOURCES_VERSION,
  assertG07TrustedRunnerAuthority,
  deriveG07PhysicalStepProjection,
  deriveG07RequiredSetupCategories,
  expectedAnalyticsEventType,
  g07DomIdentityFingerprint,
  readG07RunnerInvocationEnvironment,
  sealG07ProductionBrowserPayload,
  validateG07ProductionBrowserReceipt,
  type G07InteractionStateReceipt,
  type G07DomElementIdentity,
  type G07LocaleThemeSetupTransition,
  type G07MobileMenuObservation,
  type G07PhysicalInputEntry,
  type G07ProductionBrowserPayload,
  type G07ProductionProject,
  type G07RangeTouchAttempt,
  type G07RawAnalyticsDelivery,
  type G07RawSessionCheckpoint,
  type G07RunnerInvocationEvidence,
  type G07TapEvidence,
  type G07VisualStateReceipt,
  type G07VerticalSwipeAttempt,
} from "./china-mainland-g07-production-receipt";
import { closeLearnerStartSetupIfVisible, uniqueSuffix } from "./helpers";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";

const SUPPORTED_PROJECTS = ["desktop-chrome", "mobile-chrome"] as const;
const SCROLL_POSITIONS = ["page-top", "visualization-center", "page-bottom"] as const;
const MODULE_ID = "configured-visualization-lab" as const;
const ANALYTICS_QUIET_INTERVAL_MS = 250;
const EVENT_TIMESTAMP_TOLERANCE_MS = 1_000;
const MAX_RANGE_TOUCH_ATTEMPTS = 1 as const;

type Locale = "en" | "zh" | "zh-Hans";
type Theme = "dark" | "light";
type LiveSession = {
  completedAt?: unknown;
  explored?: unknown;
  moduleId?: unknown;
  source?: unknown;
  topicId?: unknown;
  updatedAt?: unknown;
};
type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};
type RuntimeCounters = {
  directionalSwipes: G07ProductionBrowserPayload["touchEvidence"]["directionalSwipes"];
  physicalInputEntries: G07PhysicalInputEntry[];
  realSwipeCount: number;
  realTapCount: number;
  rangeTouchAttempts: G07RangeTouchAttempt[];
  sessionPostCount: number;
  setupTransitions: G07LocaleThemeSetupTransition[];
  swipeMoveCount: number;
};

type PhysicalInputContext = Pick<
  G07PhysicalInputEntry,
  "category" | "direction" | "labId" | "stateId"
> & { setupPhaseId?: string | null; targetIdentity?: string };
type CapturedAnalyticsDelivery = {
  captureSequence: number;
  deliveryId: string;
  ownerUserId: string | null;
  parsedRequestBody: unknown;
  parsedResponseBody: unknown;
  rawRequestBody: string;
  rawResponseBody: string;
  request: Request;
  requestObservedAt: string;
  requestObservedMonotonicMs: number;
  responseBodyReady: boolean;
  responseStatus: number | null;
  temporal: G07RawAnalyticsDelivery["temporal"] | null;
};
type AnalyticsHarness = {
  consumedDeliveryIds: Set<string>;
  consumedEventIds: Set<string>;
  dispose: () => void;
  rawDeliveries: CapturedAnalyticsDelivery[];
};
type GlobalCaptureSequence = { next: number };

const SELECTED_CRITICAL_SOURCE_PATHS = [
  "tests/e2e/china-mainland-g07-production-plan.ts",
  "tests/e2e/china-mainland-g07-production-receipt.ts",
  "tests/e2e/china-mainland-g07-production-browser.spec.ts",
  "components/visualizations/mainland/SymbolicExpressionsLab.tsx",
  "components/visualizations/mainland/SymbolicExpressionsControlDomain.ts",
  "components/visualizations/mainland/SymbolicExpressionsModel.ts",
  "components/visualizations/mainland/SymbolicExpressionsVisualModel.tsx",
  "components/visualizations/ConfiguredVisualizationLab.tsx",
  "tests/e2e/china-visualization-collision-receipt.ts",
  "tests/e2e/hk-visualization-collision-scanner.ts",
  "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  "data/visualizationLabs.ts",
  "components/providers/AppProviders.tsx",
  "lib/learningAnalytics.ts",
  "tests/e2e/helpers.ts",
  "lib/server/userStore.ts",
  "lib/server/userStore/studentActivityPersistence.ts",
  "lib/server/sessionCookie.ts",
  "lib/visualizationSessionOutbox.ts",
  "lib/visualizationSessionRequestBody.ts",
  "lib/visualizationSessionContract.ts",
  "lib/server/visualizationSessionEligibility.ts",
  "lib/server/auth.ts",
  "app/api/learning-events/route.ts",
  "app/api/visualization-sessions/route.ts",
  "app/api/auth/register/route.ts",
  "types/index.ts",
] as const;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function selectedCriticalSourceEvidence() {
  const repositoryRoot = new URL("../../", import.meta.url);
  return SELECTED_CRITICAL_SOURCE_PATHS.map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(new URL(path, repositoryRoot)))
      .digest("hex"),
  }));
}

function projectPhysicalInputTotals(entries: G07PhysicalInputEntry[]) {
  const byCategory = {
    "horizontal-scroll": 0,
    "locale-menu-open": 0,
    "locale-menu-restore": 0,
    "locale-option": 0,
    "locale-selector": 0,
    mode: 0,
    "range-calibration": 0,
    reset: 0,
    "theme-toggle": 0,
    "vertical-scroll": 0,
  };
  let moves = 0;
  let swipes = 0;
  let taps = 0;
  for (const entry of entries) {
    byCategory[entry.category] += 1;
    if (entry.kind === "tap") taps += 1;
    else {
      swipes += 1;
      moves += entry.moveCount;
    }
  }
  return { byCategory, moves, swipes, taps };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function exactKeys(value: unknown, keys: readonly string[], label: string) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an exact object.`);
  expect(Object.keys(value).sort(), `${label}: exact keys`).toEqual([...keys].sort());
}

function applicationPath(value: string) {
  const url = new URL(value);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
  ) return null;
  return url.pathname;
}

function monotonicWallClock() {
  const monotonicMs = performance.now();
  return {
    clockOriginEpochMs: performance.timeOrigin,
    iso: new Date(performance.timeOrigin + monotonicMs).toISOString(),
    monotonicMs,
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
    if (pathname) {
      diagnostics.requestFailures.push(
        `${request.method()} ${pathname}: ${request.failure()?.errorText ?? "unknown"}`,
      );
    }
  });
  return diagnostics;
}

function installSessionPostCounter(page: Page, counters: RuntimeCounters) {
  const listener = (request: Request) => {
    if (
      request.method() === "POST" &&
      applicationPath(request.url()) === "/api/visualization-sessions"
    ) counters.sessionPostCount += 1;
  };
  page.on("request", listener);
  return () => page.off("request", listener);
}

function installAnalyticsHarness(
  page: Page,
  globalCaptureSequence: GlobalCaptureSequence,
): AnalyticsHarness {
  const harness: AnalyticsHarness = {
    consumedDeliveryIds: new Set(),
    consumedEventIds: new Set(),
    dispose: () => undefined,
    rawDeliveries: [],
  };
  const onRequest = (request: Request) => {
    if (
      request.method() !== "POST" ||
      applicationPath(request.url()) !== "/api/learning-events"
    ) return;
    const rawRequestBody = request.postData() ?? "";
    const observed = monotonicWallClock();
    let ownerUserId: string | null = null;
    try {
      const encoded = request.headers()["x-mais-analytics-user-id"];
      ownerUserId = encoded ? decodeURIComponent(encoded) : null;
    } catch {
      ownerUserId = null;
    }
    harness.rawDeliveries.push({
      captureSequence: globalCaptureSequence.next,
      deliveryId: `delivery:${globalCaptureSequence.next++}:${observed.monotonicMs}`,
      ownerUserId,
      parsedRequestBody: parseJson(rawRequestBody),
      parsedResponseBody: null,
      rawRequestBody,
      rawResponseBody: "",
      request,
      requestObservedAt: observed.iso,
      requestObservedMonotonicMs: observed.monotonicMs,
      responseBodyReady: false,
      responseStatus: null,
      temporal: null,
    });
  };
  const onResponse = async (response: Response) => {
    if (applicationPath(response.url()) !== "/api/learning-events") return;
    const delivery = harness.rawDeliveries.find(
      (candidate) => candidate.request === response.request(),
    );
    if (!delivery) return;
    delivery.responseStatus = response.status();
    delivery.rawResponseBody = await response.text().catch(() => "");
    delivery.parsedResponseBody = parseJson(delivery.rawResponseBody);
    delivery.responseBodyReady = true;
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

async function readJson<T>(
  response: JsonResponseLike,
  label: string,
  expectedStatus = 200,
): Promise<T> {
  const text = await response.text();
  expect(response.status(), `${label}: ${text}`).toBe(expectedStatus);
  const parsed = parseJson(text);
  if (parsed === null) throw new TypeError(`${label}: response is malformed JSON.`);
  return parsed as T;
}

function projectFrom(testInfo: TestInfo): G07ProductionProject {
  expect(
    testInfo.config.projects.map(({ name }) => name),
    "G07 requires both projects; FullConfig is a canary and never CLI authority",
  ).toEqual([...SUPPORTED_PROJECTS]);
  expect(testInfo.retry, "G07 forbids retry narrowing").toBe(0);
  expect(testInfo.config.shard, "G07 forbids shard narrowing").toBeNull();
  for (const configuredProject of testInfo.config.projects) {
    expect(configuredProject.retries).toBe(0);
    expect(configuredProject.grepInvert).toBeNull();
  }
  if (!SUPPORTED_PROJECTS.includes(testInfo.project.name as G07ProductionProject)) {
    throw new TypeError(`${testInfo.project.name}: unsupported G07 project.`);
  }
  return testInfo.project.name as G07ProductionProject;
}

function requireG07ProductionRunnerAuthority(): G07RunnerInvocationEvidence {
  const callerEvidence = readG07RunnerInvocationEnvironment(process.env);
  // PW1.59 owns CLI narrowing in internal cliArgs, cliGrep, cliGrepInvert,
  // and cliProjectFilter. Caller JSON+SHA cannot own native spawn/wait.
  return assertG07TrustedRunnerAuthority(callerEvidence);
}

function expectedInteractionAxis(project: G07ProductionProject) {
  const axis = G07_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: G07 interaction axis is absent.`);
  return axis;
}

function expectedInteractionStateIds(project: G07ProductionProject) {
  const axisId = expectedInteractionAxis(project).axisId;
  return G07_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function expectedVisualAxes(project: G07ProductionProject) {
  return G07_PRODUCTION_PLAN.coverage.visualAxes.filter(
    (axis) => axis.project === project,
  );
}

function expectedVisualStateIds(project: G07ProductionProject) {
  const axes = expectedVisualAxes(project);
  return G07_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    axes.some(({ axisId }) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function scenarioIdFrom(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) throw new TypeError(`${stateId}: invalid G07 state.`);
  return stateId.slice(prefix.length);
}

async function registerMainlandStudent(page: Page, testInfo: TestInfo, labId: string) {
  const lab = getVisualizationLabByLabId(labId);
  if (!lab || lab.labId !== labId || lab.topicId !== labId || lab.moduleId !== MODULE_ID) {
    throw new TypeError(`${labId}: exact G07 catalog identity is absent.`);
  }
  if (!["MAINLAND_BNU", "MAINLAND_HJB", "MAINLAND_PEP"].includes(lab.publisher ?? "")) {
    throw new TypeError(`${labId}: non-Mainland G07 publisher.`);
  }
  const suffix = `${uniqueSuffix(testInfo)}-${labId}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g07-c2-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: lab.publisher, region: "MAINLAND" },
      curriculumTrack: lab.curriculumTrack,
      email: username,
      grade: lab.grade,
      language: "zh-Hans",
      name: `G07 C2 ${suffix}`,
      password: "start12345",
      role: "student",
      theme: "light",
      username,
    },
  });
  const body = await readJson<{ user?: { id?: unknown; username?: unknown } }>(
    response,
    `${labId}: disposable learner registration`,
  );
  expect(body.user?.username).toBe(username);
  if (typeof body.user?.id !== "string" || body.user.id.length === 0) {
    throw new TypeError(`${labId}: registered learner has no exact ID.`);
  }
  return { analyticsSource: lab.analyticsSource, userId: body.user.id };
}

async function visualizationSessions(page: Page): Promise<LiveSession[]> {
  const response = await page.request.get("/api/visualization-sessions");
  const body = await readJson<{ sessions?: unknown }>(response, "G07 session reread");
  if (!Array.isArray(body.sessions)) throw new TypeError("G07 session reread has no array.");
  return body.sessions as LiveSession[];
}

function durableSessionSnapshot(session: LiveSession) {
  if (
    session.explored !== true ||
    session.moduleId !== MODULE_ID ||
    typeof session.topicId !== "string" ||
    typeof session.source !== "string" ||
    typeof session.updatedAt !== "string" ||
    (session.completedAt !== null && typeof session.completedAt !== "string")
  ) throw new TypeError(`Incomplete G07 durable session: ${JSON.stringify(session)}.`);
  const catalog = getVisualizationLabByLabId(session.topicId);
  if (!catalog || catalog.analyticsSource !== session.source) {
    throw new TypeError(`${session.topicId}: durable source drift.`);
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

function exactG07Sessions(sessions: readonly LiveSession[]) {
  return sessions
    .filter(({ topicId }) => G07_PRODUCTION_PLAN.labIds.includes(topicId as never))
    .map(durableSessionSnapshot)
    .sort(
      (left, right) =>
        G07_PRODUCTION_PLAN.labIds.indexOf(left.topicId as never) -
        G07_PRODUCTION_PLAN.labIds.indexOf(right.topicId as never),
    );
}

function expectSiblingSessionsUnchanged(
  sessions: readonly LiveSession[],
  targetLabId: string,
  siblingBaseline: ReturnType<typeof exactG07Sessions>,
) {
  expect(
    exactG07Sessions(sessions).filter(({ topicId }) => topicId !== targetLabId),
    `${targetLabId}: all six same-user sibling sessions remain exact`,
  ).toEqual(siblingBaseline);
}

async function seedSiblingSessions(page: Page, targetLabId: string, expectedUserId: string) {
  const siblingIds = G07_PRODUCTION_PLAN.labIds.filter(
    (labId) => labId !== targetLabId,
  );
  for (const siblingLabId of siblingIds) {
    const sibling = getVisualizationLabByLabId(siblingLabId);
    if (!sibling) throw new TypeError(`${siblingLabId}: missing sibling catalog.`);
    const response = await page.request.post("/api/visualization-sessions", {
      data: { moduleId: MODULE_ID, source: sibling.analyticsSource, topicId: siblingLabId },
      headers: { "x-mais-visualization-user-id": encodeURIComponent(expectedUserId) },
    });
    const body = await readJson<{ acknowledgedUserId?: unknown; durablyPersisted?: unknown; session?: LiveSession }>(
      response,
      `${siblingLabId}: sibling seed`,
    );
    expect(body).toMatchObject({
      acknowledgedUserId: expectedUserId,
      durablyPersisted: true,
      session: { explored: true, topicId: siblingLabId },
    });
  }
  const sessions = await visualizationSessions(page);
  const exact = exactG07Sessions(sessions);
  expect(exact.map(({ topicId }) => topicId)).toEqual(siblingIds);
  return exact;
}

function sessionSet(sessions: readonly LiveSession[], targetLabId: string, userId: string, target: boolean) {
  const snapshots = exactG07Sessions(sessions).filter(({ topicId }) =>
    target ? topicId === targetLabId : topicId !== targetLabId,
  );
  return { count: snapshots.length, sessions: snapshots, userId };
}

async function captureRawSessionCheckpoint(
  page: Page,
  checkpointId: string,
  targetLabId: string,
  userId: string,
  globalCaptureSequence: GlobalCaptureSequence,
  projectClockOriginEpochMs: number,
  followingAnalyticsExpected = true,
): Promise<G07RawSessionCheckpoint> {
  const response = await page.request.get("/api/visualization-sessions");
  const rawResponseBody = await response.text();
  expect(response.status(), `${targetLabId}:${checkpointId} raw session status`).toBe(200);
  const parsedResponseBody = parseJson(rawResponseBody);
  exactKeys(parsedResponseBody, ["sessions"], `${targetLabId}:${checkpointId} raw session response`);
  const rawSessions = (parsedResponseBody as { sessions: unknown }).sessions;
  if (!Array.isArray(rawSessions)) {
    throw new TypeError(`${targetLabId}:${checkpointId}: raw session response has no array.`);
  }
  if (rawSessions.some((session) =>
    !isRecord(session) ||
    typeof session.topicId !== "string" ||
    !G07_PRODUCTION_PLAN.labIds.includes(session.topicId as never)
  )) throw new TypeError(`${targetLabId}:${checkpointId}: surplus non-G07 raw session.`);
  const fullRecords = rawSessions.map((session, index) => {
    exactKeys(session, ["completedAt", "explored", "moduleId", "source", "topicId", "updatedAt"], `${targetLabId}:${checkpointId} full record ${index}`);
    return durableSessionSnapshot(session as LiveSession);
  });
  expect(
    rawSessions,
    `${targetLabId}:${checkpointId}: unfiltered raw session records`,
  ).toEqual(fullRecords);
  const captured = monotonicWallClock();
  expect(captured.clockOriginEpochMs, `${targetLabId}:${checkpointId} project clock origin`).toBe(projectClockOriginEpochMs);
  return {
    capturedAt: captured.iso,
    capturedMonotonicMs: captured.monotonicMs,
    checkpointId,
    clockOriginEpochMs: projectClockOriginEpochMs,
    followingAnalyticsCaptureSequence: followingAnalyticsExpected ? globalCaptureSequence.next : null,
    fullRecords,
    parsedResponseBody: { sessions: structuredClone(fullRecords) },
    projections: {
      siblings: sessionSet(fullRecords, targetLabId, userId, false),
      target: sessionSet(fullRecords, targetLabId, userId, true),
    },
    precedingAnalyticsCaptureSequence: globalCaptureSequence.next === 0 ? null : globalCaptureSequence.next - 1,
    rawResponseBody,
  };
}

function durabilityStage(
  stage: "final" | "first" | "mount" | "reload" | "reset" | "second",
  sessions: readonly LiveSession[],
  targetLabId: string,
  userId: string,
  postCount: 0 | 1,
  acknowledgementStatus: 200 | null,
) {
  return {
    acknowledgementStatus,
    postCount,
    siblings: sessionSet(sessions, targetLabId, userId, false),
    stage,
    target: sessionSet(sessions, targetLabId, userId, true),
  };
}

async function activeRoot(page: Page, labId: string) {
  const lesson = page.locator("section#visualization");
  await expect(lesson).toHaveCount(1);
  const root = lesson.locator(`[data-viz-active-lab-id=${JSON.stringify(labId)}]`);
  await expect(root).toHaveCount(1);
  await expect(root).toBeVisible({ timeout: 30_000 });
  await expect(root).toHaveAttribute("data-viz-topic-id", labId);
  await expect(root).toHaveAttribute("data-viz-lesson-session-owner", "first-control-interaction");
  await expect(root.locator('[data-mainland-symbolic-expressions="true"]')).toHaveCount(1);
  await expect(root.locator('[data-viz-range-domain-id="symbolic-expressions-scenarios-v1"]')).toHaveCount(1);
  await expect(root.locator("[data-viz-configured-model]")).toHaveCount(1);
  await expect(root.locator("[data-viz-renderer-mode]")).toHaveCount(0);
  await expect(root.locator(`[data-viz-reset-model][data-viz-reset-module-id=${JSON.stringify(MODULE_ID)}][data-viz-reset-topic-id=${JSON.stringify(labId)}]`)).toHaveCount(1);
  return root;
}

async function settle(root: Locator, label: string) {
  let prior = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await root.page().waitForTimeout(50);
    const current = await root.locator("[data-mainland-symbolic-expressions]").getAttribute("data-viz-configured-state");
    if (current && current === prior) return;
    prior = current ?? "";
  }
  throw new TypeError(`${label}: G07 state did not settle.`);
}

function parseDomainState(value: string | null, label: string) {
  const parsed = value ? parseJson(value) : null;
  if (!isRecord(parsed)) throw new TypeError(`${label}: missing domain state JSON.`);
  return parsed as SymbolicExpressionsControlDomainState;
}

async function observeState(root: Locator) {
  const renderer = root.locator("[data-mainland-symbolic-expressions]");
  const observed = parseDomainState(await renderer.getAttribute("data-viz-domain-observed"), "G07 observed state");
  const requested = parseDomainState(await renderer.getAttribute("data-viz-domain-requested"), "G07 requested state");
  const accepted = (await renderer.getAttribute("data-viz-domain-accepted")) === "true";
  const errorCode = await renderer.getAttribute("data-viz-domain-error");
  const causeCode = await renderer.getAttribute("data-viz-domain-cause");
  const projectionReasons = ((await renderer.getAttribute("data-viz-domain-projection-reasons")) ?? "").split(",").filter(Boolean);
  const modelStateKey = buildSymbolicExpressionsModel(
    buildSymbolicExpressionsScenarioInput(observed),
  ).stateKey;
  return {
    accepted,
    error: errorCode ? { causeCode, code: errorCode } : null,
    modelStateKey,
    observed,
    projectionReasons,
    requested,
  };
}

async function resetReceipt(root: Locator, labId: string) {
  await expect(root.locator("[data-viz-reset-model]")).toHaveCount(1);
  const observation = await observeState(root);
  expect(observation.observed).toEqual(
    createSymbolicExpressionsControlDomainState(labId as SymbolicExpressionsLabId),
  );
  return { exact: true as const, observation, resetControlCount: 1 as const };
}

async function uiScan(root: Locator, label: string) {
  const collision = chinaVisualizationCollisionReceipt(
    await scanHkVisualizationCollisions(root, label),
  );
  const contrast = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(contrast.checkedTextCount).toBeGreaterThan(0);
  expect(contrast.worst).not.toBeNull();
  expect(contrast.issues).toEqual([]);
  const layout = await root.evaluate((element) => {
    const controls = Array.from(element.querySelectorAll<HTMLElement>(
      '[data-viz-mode-button], [data-viz-parameter], [data-viz-reset-model]',
    )).filter((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none";
    });
    const rootRect = element.getBoundingClientRect();
    const clippedElementCount = controls.filter((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
    }).length;
    const touchTargetIssueCount = controls.filter((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).length;
    const clientWidth = document.documentElement.clientWidth;
    return {
      clippedElementCount,
      horizontalOverflowPixels: Math.max(0, document.documentElement.scrollWidth - clientWidth, document.body.scrollWidth - clientWidth),
      touchTargetCheckedCount: controls.length,
      touchTargetIssueCount,
    };
  });
  expect(layout.clippedElementCount, `${label}: clipped controls`).toBe(0);
  expect(layout.horizontalOverflowPixels, `${label}: page overflow`).toBe(0);
  expect(layout.touchTargetCheckedCount, `${label}: touch targets`).toBeGreaterThan(0);
  expect(layout.touchTargetIssueCount, `${label}: small touch targets`).toBe(0);
  return {
    clippedElementCount: layout.clippedElementCount as 0,
    collisionIssueCount: 0 as const,
    contrastCheckedTextCount: contrast.checkedTextCount,
    contrastIssueCount: 0 as const,
    horizontalOverflowPixels: layout.horizontalOverflowPixels as 0,
    touchTargetCheckedCount: layout.touchTargetCheckedCount,
    touchTargetIssueCount: layout.touchTargetIssueCount as 0,
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

function recordMobilePhysicalInput(
  counters: RuntimeCounters,
  context: PhysicalInputContext,
  kind: "swipe" | "tap",
  tapEvidence: G07TapEvidence | null = null,
) {
  const entry: G07PhysicalInputEntry = {
    analyticsBound: false,
    category: context.category,
    deliveryId: null,
    direction: context.direction,
    eventId: null,
    kind,
    labId: context.labId,
    method: kind === "tap" ? "page.touchscreen.tap" : "cdp:Input.dispatchTouchEvent",
    moveCount: kind === "tap" ? 0 : 4,
    sequence: counters.physicalInputEntries.length,
    setupPhaseId: context.setupPhaseId ?? null,
    stateId: context.stateId,
    tapEvidence,
    targetIdentity: context.targetIdentity ?? context.category,
  };
  counters.physicalInputEntries.push(entry);
  if (kind === "tap") counters.realTapCount += 1;
  else {
    counters.realSwipeCount += 1;
    counters.swipeMoveCount += 4;
  }
  return entry.sequence;
}

async function tapEvidenceAt(
  page: Page,
  locator: Locator,
  targetRect: { height: number; width: number; x: number; y: number },
  x: number,
  y: number,
  targetIdentity: string,
): Promise<G07TapEvidence> {
  const viewport = page.viewportSize();
  if (!viewport) throw new TypeError(`${targetIdentity}: tap viewport is absent.`);
  const hitProof = await locator.evaluate((element, point) => {
    const identity = (candidate: Element) => {
      const tagName = candidate.tagName.toLowerCase();
      const type = candidate.getAttribute("type");
      const explicitRole = candidate.getAttribute("role");
      const role = explicitRole ??
        (tagName === "button" ? "button" : tagName === "input" && type === "range" ? "slider" : null);
      return {
        ariaLabel: candidate.getAttribute("aria-label"),
        dataVizMode: candidate.getAttribute("data-viz-mode"),
        dataVizModeButton: candidate.getAttribute("data-viz-mode-button"),
        dataVizParameter: candidate.getAttribute("data-viz-parameter"),
        dataVizResetModel: candidate.getAttribute("data-viz-reset-model"),
        dataVizResetModuleId: candidate.getAttribute("data-viz-reset-module-id"),
        dataVizResetTopicId: candidate.getAttribute("data-viz-reset-topic-id"),
        id: tagName === "input" && type === "range"
          ? null
          : candidate.getAttribute("id"),
        name: candidate.getAttribute("name"),
        role,
        tagName,
        type,
      };
    };
    const hit = document.elementFromPoint(point.x, point.y);
    const targetIdentity = identity(element);
    if (!hit) {
      return {
        hitAncestorIdentities: [],
        hitTestMatched: false,
        rawHitIdentity: null,
        targetIdentity,
        targetIsHit: false,
      };
    }
    const hitAncestorIdentities: ReturnType<typeof identity>[] = [];
    let current: Element | null = hit;
    while (current) {
      hitAncestorIdentities.push(identity(current));
      if (current === element) break;
      current = current.parentElement;
    }
    return {
      hitAncestorIdentities,
      hitTestMatched: current === element,
      rawHitIdentity: identity(hit),
      targetIdentity,
      targetIsHit: hit === element,
    };
  }, { x, y });
  expect(hitProof.hitTestMatched, `${targetIdentity}: document.elementFromPoint target hit`).toBe(true);
  if (!hitProof.rawHitIdentity || hitProof.hitAncestorIdentities.length === 0) {
    throw new TypeError(`${targetIdentity}: document.elementFromPoint raw hit identity is absent.`);
  }
  const rawHitIdentity = hitProof.rawHitIdentity as G07DomElementIdentity;
  const targetDomIdentity = hitProof.targetIdentity as G07DomElementIdentity;
  const hitAncestorIdentities = hitProof.hitAncestorIdentities as G07DomElementIdentity[];
  const rawHitFingerprint = g07DomIdentityFingerprint(rawHitIdentity);
  const targetFingerprint = g07DomIdentityFingerprint(targetDomIdentity);
  const hitAncestorFingerprints = hitAncestorIdentities.map(g07DomIdentityFingerprint);
  const hitTargetFingerprint = hitAncestorFingerprints.at(-1)!;
  expect(hitTargetFingerprint, `${targetIdentity}: actual hit resolves to target fingerprint`).toBe(targetFingerprint);
  return {
    boxCapturedAfterScrollIntoView: true,
    hitAncestorFingerprints,
    hitAncestorIdentities,
    hitTargetFingerprint,
    hitTestMatched: true,
    hitTestMethod: "document.elementFromPoint",
    rawHitFingerprint,
    rawHitIdentity,
    targetFingerprint,
    targetIdentity: targetDomIdentity,
    targetIsHit: hitProof.targetIsHit,
    targetRect,
    viewportHeight: viewport.height,
    viewportWidth: viewport.width,
    x,
    y,
  };
}

async function realActivate(
  page: Page,
  locator: Locator,
  project: G07ProductionProject,
  counters: RuntimeCounters,
  context: PhysicalInputContext,
) {
  await expect(locator).toHaveCount(1);
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new TypeError("G07 physical target has no bounding box.");
  if (project === "mobile-chrome") {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const targetIdentity = context.targetIdentity ?? context.category;
    const tapEvidence = await tapEvidenceAt(page, locator, box, x, y, targetIdentity);
    await page.touchscreen.tap(x, y);
    recordMobilePhysicalInput(counters, context, "tap", tapEvidence);
    return "page.touchscreen.tap";
  }
  if ((await locator.getAttribute("type")) === "range") {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return "page.mouse.click";
  }
  await locator.press("Enter");
  return "locator.press:Enter";
}

type SubactionDescriptor = Pick<
  G07InteractionStateReceipt["action"]["subactions"][number],
  "kind" | "subactionId" | "target"
>;
type SubactionRecorder = (
  descriptor: SubactionDescriptor,
  action: () => Promise<string>,
) => Promise<G07InteractionStateReceipt["action"]["subactions"][number]>;

async function collectSubactionAnalytics(
  page: Page,
  harness: AnalyticsHarness,
  counters: RuntimeCounters,
  descriptor: SubactionDescriptor,
  expectedUserId: string,
  action: () => Promise<string>,
) {
  const preActionCount = harness.rawDeliveries.length;
  const prePhysicalInputCount = counters.physicalInputEntries.length;
  await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
  expect(harness.rawDeliveries.length, `${descriptor.subactionId}: pre-subaction analytics window must be quiet`).toBe(preActionCount);
  const actionStarted = monotonicWallClock();
  const method = await action();
  await expect.poll(
    () => harness.rawDeliveries.length - preActionCount,
    { message: `${descriptor.subactionId}: zero per-subaction analytics POST`, timeout: 10_000 },
  ).toBe(1);
  const delivery = harness.rawDeliveries[preActionCount];
  if (!delivery) throw new TypeError(`${descriptor.subactionId}: raw delivery disappeared.`);
  await expect.poll(() => ({
    responseBodyReady: delivery.responseBodyReady,
    responseStatus: delivery.responseStatus,
  })).toEqual({ responseBodyReady: true, responseStatus: 200 });
  expect(delivery.responseStatus, `${descriptor.subactionId}: responseStatus`).toBe(200);
  expect(delivery.responseBodyReady, `${descriptor.subactionId}: responseBodyReady`).toBe(true);
  const actionSettled = monotonicWallClock();
  await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
  expect(harness.rawDeliveries.length, `${descriptor.subactionId}: post-action analytics window must stay quiet`).toBe(preActionCount + 1);
  expect(delivery.ownerUserId).toBe(expectedUserId);
  exactKeys(delivery.parsedRequestBody, ["events", "generation"], `${descriptor.subactionId} request`);
  const requestBody = delivery.parsedRequestBody as { events: unknown[]; generation: unknown };
  expect(requestBody.events).toHaveLength(1);
  expect(Number.isSafeInteger(requestBody.generation)).toBe(true);
  const event = requestBody.events[0];
  exactKeys(event, ["grade", "id", "source", "timestamp", "topicId", "type"], `${descriptor.subactionId} event`);
  const exactEvent = event as Record<string, unknown>;
  expect(exactEvent.type).toBe(expectedAnalyticsEventType(descriptor));
  expect(typeof exactEvent.id).toBe("string");
  exactKeys(delivery.parsedResponseBody, ["acknowledgedEventIds"], `${descriptor.subactionId} ACK`);
  expect((delivery.parsedResponseBody as { acknowledgedEventIds: unknown }).acknowledgedEventIds).toEqual([exactEvent.id]);
  delivery.temporal = {
    actionSettledAt: actionSettled.iso,
    actionSettledMonotonicMs: actionSettled.monotonicMs,
    actionStartedAt: actionStarted.iso,
    actionStartedMonotonicMs: actionStarted.monotonicMs,
    clockOriginEpochMs: actionStarted.clockOriginEpochMs,
    postActionQuiet: true,
    preActionQuiet: true,
    quietIntervalMs: ANALYTICS_QUIET_INTERVAL_MS,
    requestObservedAt: delivery.requestObservedAt,
    requestObservedMonotonicMs: delivery.requestObservedMonotonicMs,
    toleranceMs: EVENT_TIMESTAMP_TOLERANCE_MS,
  };
  harness.consumedDeliveryIds.add(delivery.deliveryId);
  harness.consumedEventIds.add(String(exactEvent.id));
  if (method === "page.touchscreen.tap" || method === "cdp:Input.dispatchTouchEvent") {
    const physicalInputs = counters.physicalInputEntries.slice(prePhysicalInputCount);
    expect(physicalInputs, `${descriptor.subactionId}: one physical input per analytics delivery`).toHaveLength(1);
    const physicalInput = physicalInputs[0]!;
    physicalInput.analyticsBound = true;
    physicalInput.deliveryId = delivery.deliveryId;
    physicalInput.eventId = String(exactEvent.id);
  }
  return {
    deliveryId: delivery.deliveryId,
    eventId: String(exactEvent.id),
    kind: descriptor.kind,
    method,
    subactionId: descriptor.subactionId,
    target: descriptor.target,
  };
}

async function setRangeThroughRealInput(
  page: Page,
  root: Locator,
  range: Locator,
  requested: number,
  project: G07ProductionProject,
  stateId: string,
  labId: string,
  counters: RuntimeCounters,
  descriptor: SubactionDescriptor,
  record: SubactionRecorder,
) {
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const step = Number((await range.getAttribute("step")) ?? "1");
  if (!Number.isSafeInteger(requested) || requested < min || requested > max || step !== 1) {
    throw new TypeError(`${descriptor.subactionId}: invalid live range target.`);
  }
  const ratio = (requested - min) / (max - min);
  let trackStartX = Number.NaN;
  let trackEndX = Number.NaN;
  let touchX = Number.NaN;
  const beforeObservedValue = Number(await range.inputValue());
  const beforeObservation = await observeState(root);
  const controlId = descriptor.target.split(":")[1] as SymbolicExpressionsScenarioControlId | undefined;
  if (!controlId) throw new TypeError(`${descriptor.subactionId}: range control identity absent.`);
  let expectedAccepted = true;
  let expectedReducerError: G07RangeTouchAttempt["expectedReducerError"] = null;
  try {
    planSymbolicExpressionsControlTransition(beforeObservation.observed, {
      controlId,
      kind: "control",
      value: requested,
    });
  } catch (error) {
    if (!(error instanceof SymbolicExpressionsControlDomainError)) throw error;
    expectedAccepted = false;
    expectedReducerError = { causeCode: error.causeCode, code: error.code };
  }
  let afterObservedValue = Number.NaN;
  const physicalSubaction = await record(descriptor, async () => {
    const current = beforeObservedValue;
    if (project === "desktop-chrome" && (requested === min || requested === max || Math.abs(requested - current) === 1)) {
      const key = requested === min ? "Home" : requested === max ? "End" : requested > current ? "ArrowRight" : "ArrowLeft";
      await range.press(key);
      await settle(root, descriptor.subactionId);
      return `locator.press:${key}`;
    }
    await range.scrollIntoViewIfNeeded();
    const box = await range.boundingBox();
    if (!box) throw new TypeError(`${descriptor.subactionId}: range has no box.`);
    const thumb = Math.min(10, box.width / 20);
    trackStartX = box.x + thumb;
    trackEndX = box.x + box.width - thumb;
    touchX = trackStartX + ratio * (trackEndX - trackStartX);
    const x = touchX;
    const y = box.y + box.height / 2;
    if (project === "mobile-chrome") {
      const attemptedValue = min + Math.round((ratio * (max - min)) / step) * step;
      expect(attemptedValue, `${descriptor.subactionId}: exact requested touch attempt`).toBe(requested);
      const tapEvidence = await tapEvidenceAt(page, range, box, x, y, descriptor.target);
      await page.touchscreen.tap(x, y);
      recordMobilePhysicalInput(counters, {
        category: "range-calibration",
        direction: null,
        labId,
        stateId,
        targetIdentity: descriptor.target,
      }, "tap", tapEvidence);
      await settle(root, descriptor.subactionId);
      afterObservedValue = Number(await range.inputValue());
      const reducerObservation = await observeState(root);
      expect(reducerObservation.accepted, `${descriptor.subactionId}: expected reducer acceptance`).toBe(expectedAccepted);
      expect(reducerObservation.error, `${descriptor.subactionId}: expected reducer rejection`).toEqual(expectedReducerError);
      if (expectedAccepted) {
        expect(
          afterObservedValue,
          `${descriptor.subactionId}: calibrated real touch range must reach the exact requested value`,
        ).toBe(requested);
      } else {
        expect(
          afterObservedValue,
          `${descriptor.subactionId}: unchanged observed input after rejected real-touch attempt`,
        ).toBe(beforeObservedValue);
      }
      return "page.touchscreen.tap";
    }
    await page.mouse.click(x, y);
    await settle(root, descriptor.subactionId);
    return "page.mouse.click";
  });
  if (project === "mobile-chrome") {
    const physicalInput = counters.physicalInputEntries.find(
      ({ deliveryId }) => deliveryId === physicalSubaction.deliveryId,
    );
    if (
      !physicalInput ||
      physicalInput.eventId !== physicalSubaction.eventId ||
      physicalInput.category !== "range-calibration" ||
      !physicalInput.tapEvidence
    ) throw new TypeError(`${descriptor.subactionId}: exact range physical analytics tap disappeared.`);
    const tapEvidence = physicalInput.tapEvidence;
    counters.rangeTouchAttempts.push({
      afterObservedValue,
      attemptNumber: 1,
      attemptedValue: requested,
      beforeObservedValue,
      controlId,
      deliveryId: physicalSubaction.deliveryId,
      eventId: physicalSubaction.eventId,
      expectedAccepted,
      expectedReducerError,
      labId,
      max,
      maxAttempts: MAX_RANGE_TOUCH_ATTEMPTS,
      min,
      physicalInputSequence: physicalInput.sequence,
      requestedValue: requested,
      stateId,
      step: 1,
      targetRect: structuredClone(tapEvidence.targetRect),
      touchX,
      touchY: tapEvidence.y,
      trackEndX,
      trackStartX,
      viewportHeight: tapEvidence.viewportHeight,
      viewportWidth: tapEvidence.viewportWidth,
    });
  }
}

function topicPlan(labId: string) {
  const topic = G07_PRODUCTION_PLAN.topics.find((candidate) => candidate.labId === labId);
  if (!topic) throw new TypeError(`${labId}: G07 topic plan absent.`);
  return topic;
}

function controlFieldValue(state: SymbolicExpressionsControlDomainState, controlId: string) {
  const fields: Record<string, keyof SymbolicExpressionsControlDomainState> = {
    "candidate-denominator": "candidateDenominator",
    "candidate-numerator": "candidateNumerator",
    "coefficient-a": "coefficientA",
    "coefficient-b": "coefficientB",
    "coefficient-c": "coefficientC",
    "coefficient-d": "coefficientD",
    "constant-a": "constantA",
    "constant-b": "constantB",
    "domain-denominator": "domainDenominator",
    "domain-numerator": "domainNumerator",
    "excluded-root": "excludedRoot",
    "value-denominator": "valueDenominator",
    "value-numerator": "valueNumerator",
  };
  const field = fields[controlId];
  if (!field || typeof state[field] !== "number") throw new TypeError(`${controlId}: invalid field.`);
  return state[field] as number;
}

async function performScenarioAction(
  page: Page,
  root: Locator,
  labId: string,
  stateId: string,
  scenarioId: string,
  project: G07ProductionProject,
  counters: RuntimeCounters,
  record: SubactionRecorder,
) {
  if (scenarioId === "reset") {
    await record(
      { kind: "primary", subactionId: "primary:reset", target: "reset" },
      () => realActivate(page, root.locator("[data-viz-reset-model]"), project, counters, { category: "reset", direction: null, labId, stateId, targetIdentity: "reset" }),
    );
    await settle(root, scenarioId);
    return;
  }
  if (scenarioId.startsWith("mode:")) {
    const mode = scenarioId.slice("mode:".length);
    await record(
      { kind: "primary", subactionId: `primary:mode:${mode}`, target: `mode:${mode}` },
      () => realActivate(page, root.locator(`[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`), project, counters, { category: "mode", direction: null, labId, stateId, targetIdentity: `mode:${mode}` }),
    );
    await settle(root, scenarioId);
    return;
  }
  if (scenarioId === "first") {
    const reset = createSymbolicExpressionsControlDomainState(labId as SymbolicExpressionsLabId);
    const descriptor = symbolicExpressionsControlDescriptorFor(labId as SymbolicExpressionsLabId, reset.mode);
    const control = descriptor.controls[0]!;
    const current = controlFieldValue(reset, control.controlId);
    const requested = current < control.max ? current + 1 : current - 1;
    await setRangeThroughRealInput(
      page,
      root,
      root.locator(`[data-viz-parameter=${JSON.stringify(control.controlId)}]`),
      requested,
      project,
      stateId,
      labId,
      counters,
      {
        kind: "primary",
        subactionId: `primary:range:${control.controlId}:increment`,
        target: `range:${control.controlId}:increment`,
      },
      record,
    );
    return;
  }
  const [, mode, controlId, endpoint] = scenarioId.split(":");
  if (!mode || !controlId || !endpoint) throw new TypeError(`${scenarioId}: unsupported G07 scenario.`);
  const resetMode = topicPlan(labId).reset.controlState.mode;
  if (mode !== resetMode) {
    await record(
      { kind: "setup", subactionId: `setup:mode:${mode}`, target: `mode:${mode}` },
      () => realActivate(page, root.locator(`[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`), project, counters, { category: "mode", direction: null, labId, stateId, targetIdentity: `mode:${mode}` }),
    );
    await settle(root, `setup:${scenarioId}`);
  }
  const descriptor = symbolicExpressionsControlDescriptorFor(
    labId as SymbolicExpressionsLabId,
    mode as SymbolicExpressionsMode,
  );
  const live = descriptor.controls.find((control) => control.controlId === controlId);
  const plannedControl = topicPlan(labId).modes
    .find((candidate) => candidate.mode === mode)?.controls
    .find((control) => control.controlId === controlId);
  const planned = plannedControl?.endpoints.find(
    (candidate) => candidate.endpoint === endpoint,
  );
  if (!live || !planned || typeof planned.value !== "number") {
    throw new TypeError(`${scenarioId}: exact live control/endpoint absent.`);
  }
  expect({ max: live.max, min: live.min, step: live.step }).toEqual({
    max: plannedControl?.max,
    min: plannedControl?.min,
    step: 1,
  });
  await setRangeThroughRealInput(
    page,
    root,
    root.locator(`[data-viz-parameter=${JSON.stringify(controlId)}]`),
    planned.value,
    project,
    stateId,
    labId,
    counters,
    {
      kind: "primary",
      subactionId: `primary:range:${controlId}:${endpoint}`,
      target: `range:${controlId}:${endpoint}`,
    },
    record,
  );
}

async function controlEvidence(root: Locator, labId: string, scenarioId: string) {
  if (scenarioId === "initial" || scenarioId === "reset") {
    return {
      controlId: null,
      kind: "none" as const,
      max: null,
      min: null,
      options: [],
      requested: null,
      step: null,
    };
  }
  if (scenarioId.startsWith("mode:")) {
    const options = await root.locator("[data-viz-mode-button]").evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-viz-mode") ?? ""),
    );
    return {
      controlId: "mode",
      kind: "button" as const,
      max: null,
      min: null,
      options,
      requested: scenarioId.slice("mode:".length),
      step: null,
    };
  }
  let controlId: string;
  let requested: number;
  if (scenarioId === "first") {
    const reset = createSymbolicExpressionsControlDomainState(labId as SymbolicExpressionsLabId);
    const descriptor = symbolicExpressionsControlDescriptorFor(labId as SymbolicExpressionsLabId, reset.mode);
    const control = descriptor.controls[0]!;
    controlId = control.controlId;
    const current = controlFieldValue(reset, controlId);
    requested = current < control.max ? current + 1 : current - 1;
  } else {
    const [, mode, parsedControlId, endpoint] = scenarioId.split(":");
    controlId = parsedControlId!;
    const planned = topicPlan(labId).modes
      .find((candidate) => candidate.mode === mode)?.controls
      .find((control) => control.controlId === controlId)?.endpoints
      .find((candidate) => candidate.endpoint === endpoint);
    if (!planned || typeof planned.value !== "number") {
      throw new TypeError(`${scenarioId}: planned endpoint absent.`);
    }
    requested = planned.value;
  }
  const range = root.locator(`[data-viz-parameter=${JSON.stringify(controlId)}]`);
  return {
    controlId,
    kind: "range" as const,
    max: Number(await range.getAttribute("max")),
    min: Number(await range.getAttribute("min")),
    options: [],
    requested,
    step: Number(await range.getAttribute("step")),
  };
}

async function interactionReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axisId: string,
  project: G07ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  userId: string,
  afterPrimary?: () => Promise<void>,
): Promise<G07InteractionStateReceipt> {
  const scenarioId = scenarioIdFrom(stateId, labId, axisId);
  if (scenarioId === "initial") {
    return {
      action: { actionId: stateId, modality: "none", realInput: false, subactions: [] },
      axisId,
      control: await controlEvidence(root, labId, scenarioId),
      genericFallbackCount: await root.locator("[data-viz-renderer-mode]").count() as 0,
      labId,
      observation: await observeState(root),
      resetAfter: null,
      scenarioId,
      stateId,
      uiScan: await uiScan(root, stateId),
    };
  }
  const subactions: G07InteractionStateReceipt["action"]["subactions"] = [];
  const record: SubactionRecorder = async (descriptor, action) => {
    const receipt = await collectSubactionAnalytics(
      page,
      analytics,
      counters,
      descriptor,
      userId,
      action,
    );
    subactions.push(receipt);
    return receipt;
  };
  await performScenarioAction(page, root, labId, stateId, scenarioId, project, counters, record);
  if (afterPrimary) await afterPrimary();
  const observation = await observeState(root);
  const control = await controlEvidence(root, labId, scenarioId);
  const scan = await uiScan(root, stateId);
  let resetAfter: G07InteractionStateReceipt["resetAfter"] = null;
  if (scenarioId !== "reset") {
    await record(
      { kind: "reset", subactionId: "reset:reset", target: "reset" },
      () => realActivate(page, root.locator("[data-viz-reset-model]"), project, counters, { category: "reset", direction: null, labId, stateId, targetIdentity: "reset" }),
    );
    await settle(root, `${stateId}:reset`);
    resetAfter = await resetReceipt(root, labId);
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
    genericFallbackCount: await root.locator("[data-viz-renderer-mode]").count() as 0,
    labId,
    observation,
    resetAfter,
    scenarioId,
    stateId,
    uiScan: scan,
  };
}

async function setLocale(
  page: Page,
  locale: Locale,
  project: G07ProductionProject,
  counters: RuntimeCounters,
  labId: string,
  stateId: string,
  setupPhaseId: string,
) {
  const expectedLang = locale === "en"
    ? /^en(?:-|$)/u
    : locale === "zh"
      ? /^zh-Hant(?:-|$)/u
      : /^zh-Hans(?:-|$)/u;
  if (expectedLang.test((await page.locator("html").getAttribute("lang")) ?? "")) {
    return false;
  }
  await realActivate(
    page,
    page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i }),
    project,
    counters,
    { category: "locale-selector", direction: null, labId, setupPhaseId, stateId, targetIdentity: "locale-selector" },
  );
  const label = locale === "en"
    ? /Use English|使用英文/i
    : locale === "zh"
      ? /Use Traditional Chinese|使用繁體中文|使用繁体中文/i
      : /Use Simplified Chinese|使用簡體中文|使用简体中文/i;
  await realActivate(page, page.getByRole("menuitemradio", { name: label }), project, counters, { category: "locale-option", direction: null, labId, setupPhaseId, stateId, targetIdentity: "locale-option" });
  await expect(page.locator("html")).toHaveAttribute("lang", expectedLang);
  return true;
}

function mobileMenuTrigger(page: Page) {
  return page.getByRole("button", {
    name: /open mobile menu|開啟手機選單|打开手机菜单/i,
  });
}

function languageSelector(page: Page) {
  return page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i });
}

function themeToggle(page: Page) {
  return page.getByRole("button", {
    name: /Switch to dark mode|Switch to light mode|切換至深色模式|切換至淺色模式|切换至深色模式|切换至浅色模式/i,
  });
}

async function observeMobileMenuSurface(page: Page): Promise<G07MobileMenuObservation> {
  const trigger = mobileMenuTrigger(page);
  const triggerVisible = await trigger.isVisible().catch(() => false);
  const rawExpanded = triggerVisible ? await trigger.getAttribute("aria-expanded") : "false";
  if (rawExpanded !== "true" && rawExpanded !== "false") {
    throw new TypeError("G07 mobile menu trigger lacks exact aria-expanded state.");
  }
  const panelVisible = triggerVisible
    ? await trigger.evaluate((element) => {
        const header = element.closest("header");
        const nav = element.closest("nav");
        if (!header || !nav) return false;
        return Array.from(header.children).some((candidate) => {
          if (candidate === nav) return false;
          const style = getComputedStyle(candidate);
          return style.display !== "none" && style.visibility !== "hidden" &&
            candidate.getClientRects().length > 0;
        });
      })
    : false;
  const localeControl = languageSelector(page);
  const themeControl = themeToggle(page);
  const localeSelectorActionable =
    await localeControl.isVisible().catch(() => false) &&
    await localeControl.isEnabled().catch(() => false);
  const themeToggleActionable =
    await themeControl.isVisible().catch(() => false) &&
    await themeControl.isEnabled().catch(() => false);
  return {
    localeSelectorActionable,
    panelVisible,
    themeToggleActionable,
    triggerAriaExpanded: rawExpanded === "true",
    triggerVisible,
  };
}

async function setTheme(
  page: Page,
  theme: Theme,
  project: G07ProductionProject,
  counters: RuntimeCounters,
  labId: string,
  stateId: string,
  setupPhaseId: string,
) {
  const isDark = await page.locator("html").evaluate((element) =>
    element.classList.contains("dark"),
  );
  if (isDark === (theme === "dark")) return false;
  await realActivate(
    page,
    themeToggle(page),
    project,
    counters,
    { category: "theme-toggle", direction: null, labId, setupPhaseId, stateId, targetIdentity: "theme-toggle" },
  );
  await expect.poll(() =>
    page.locator("html").evaluate((element) => element.classList.contains("dark")),
  ).toBe(theme === "dark");
  return true;
}

async function observeCurrentLocaleTheme(page: Page): Promise<{
  htmlLang: "en" | "zh-Hans" | "zh-Hant";
  locale: Locale;
  theme: Theme;
}> {
  const html = page.locator("html");
  const rawHtmlLang = (await html.getAttribute("lang")) ?? "";
  const locale: Locale = /^en(?:-|$)/u.test(rawHtmlLang)
    ? "en"
    : /^zh-Hant(?:-|$)/u.test(rawHtmlLang)
      ? "zh"
      : /^zh-Hans(?:-|$)/u.test(rawHtmlLang)
        ? "zh-Hans"
        : (() => { throw new TypeError(`G07 unsupported html lang ${rawHtmlLang}.`); })();
  const theme = await html.evaluate((element) =>
    element.classList.contains("dark") ? "dark" as const : "light" as const,
  );
  return {
    htmlLang: locale === "zh" ? "zh-Hant" : locale,
    locale,
    theme,
  };
}

async function applyLocaleThemeSetup(
  page: Page,
  requested: { locale: Locale; theme: Theme },
  project: G07ProductionProject,
  counters: RuntimeCounters,
  labId: string,
  stateId: string,
) {
  const phaseId = `setup:${stateId}`;
  const before = await observeCurrentLocaleTheme(page);
  const physicalStart = counters.physicalInputEntries.length;
  const menuBefore = project === "mobile-chrome"
    ? await observeMobileMenuSurface(page)
    : null;
  const requiredCategories = menuBefore === null
    ? []
    : deriveG07RequiredSetupCategories(menuBefore, before, requested);
  const openRequired = requiredCategories.includes("locale-menu-open");
  let menuAfterOpen: G07MobileMenuObservation | null = null;
  if (openRequired) {
    expect(menuBefore?.triggerVisible, `${phaseId}: menu trigger visible before exact open`).toBe(true);
    expect(menuBefore?.triggerAriaExpanded, `${phaseId}: menu initially collapsed`).toBe(false);
    expect(menuBefore?.panelVisible, `${phaseId}: menu panel initially hidden`).toBe(false);
    await realActivate(page, mobileMenuTrigger(page), project, counters, {
      category: "locale-menu-open",
      direction: null,
      labId,
      setupPhaseId: phaseId,
      stateId,
      targetIdentity: "locale-menu-open",
    });
    menuAfterOpen = await observeMobileMenuSurface(page);
    expect(menuAfterOpen.triggerAriaExpanded, `${phaseId}: menu expanded after open`).toBe(true);
    expect(menuAfterOpen.panelVisible, `${phaseId}: actual menu panel visible after open`).toBe(true);
    if (before.locale !== requested.locale) {
      expect(menuAfterOpen.localeSelectorActionable, `${phaseId}: locale control actionable after menu open`).toBe(true);
    }
    if (before.theme !== requested.theme) {
      expect(menuAfterOpen.themeToggleActionable, `${phaseId}: theme control actionable after menu open`).toBe(true);
    }
  }
  const localeChanged = await setLocale(page, requested.locale, project, counters, labId, stateId, phaseId);
  const themeChanged = await setTheme(page, requested.theme, project, counters, labId, stateId, phaseId);
  if (openRequired) {
    await realActivate(page, mobileMenuTrigger(page), project, counters, {
      category: "locale-menu-restore",
      direction: null,
      labId,
      setupPhaseId: phaseId,
      stateId,
      targetIdentity: "locale-menu-restore",
    });
  }
  const menuAfterRestore = project === "mobile-chrome"
    ? await observeMobileMenuSurface(page)
    : null;
  const after = await observeLocaleTheme(page, requested.locale, requested.theme);
  if (project !== "mobile-chrome") return;
  if (!menuBefore || !menuAfterRestore) throw new TypeError(`${phaseId}: mobile menu observations disappeared.`);
  expect(menuAfterRestore, `${phaseId}: menu restored to its exact original state`).toEqual(menuBefore);
  expect(localeChanged, `${phaseId}: locale action derived from observed before/requested`).toBe(before.locale !== requested.locale);
  expect(themeChanged, `${phaseId}: theme action derived from observed before/requested`).toBe(before.theme !== requested.theme);
  const physicalEntries = counters.physicalInputEntries.slice(physicalStart);
  expect(physicalEntries.map(({ category }) => category), `${phaseId}: derived locale/theme physical sequence`).toEqual(requiredCategories);
  expect(physicalEntries.every((entry) => entry.setupPhaseId === phaseId), `${phaseId}: physical phase binding`).toBe(true);
  counters.setupTransitions.push({
    after,
    before,
    labId,
    menu: {
      afterOpen: menuAfterOpen,
      afterRestore: menuAfterRestore,
      before: menuBefore,
      openRequired,
      restoreRequired: openRequired,
    },
    phaseId,
    physicalInputSequences: physicalEntries.map(({ sequence }) => sequence),
    requested,
    requiredCategories,
    stateId,
  });
}

async function observeLocaleTheme(page: Page, locale: Locale, theme: Theme) {
  const html = page.locator("html");
  const htmlLang = await html.getAttribute("lang");
  const observedTheme = await html.evaluate((element) =>
    element.classList.contains("dark") ? "dark" as const : "light" as const,
  );
  const expectedHtmlLang: "en" | "zh-Hans" | "zh-Hant" =
    locale === "zh" ? "zh-Hant" : locale;
  expect(htmlLang, "G07 interaction html lang").toBe(expectedHtmlLang);
  expect(observedTheme, "G07 interaction html theme").toBe(theme);
  return { htmlLang: expectedHtmlLang, locale, theme };
}

async function realHorizontalSwipe(
  page: Page,
  root: Locator,
  counters: RuntimeCounters,
  analyticsHarness: AnalyticsHarness,
  labId: string,
  userId: string,
  direction: "toward-end" | "toward-start",
) {
  await expect(root).toHaveAttribute("data-mainland-symbolic-expressions", labId);
  const scroller = root.locator('[data-viz-local-scroll="horizontal"]');
  await expect(scroller).toHaveCount(1);
  const box = await scroller.boundingBox();
  if (!box) throw new TypeError("G07 local scroll has no box.");
  const geometry = await scroller.evaluate((element) => ({
    beforeScrollLeft: element.scrollLeft,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  const towardEndDirection = direction === "toward-end";
  const swipeAnalytics = await collectSubactionAnalytics(
    page,
    analyticsHarness,
    counters,
    {
      kind: "swipe",
      subactionId: `swipe:${direction}`,
      target: `local-scroll:${direction}`,
    },
    userId,
    async () => {
      const session = await page.context().newCDPSession(page);
      const startX = box.x + box.width * (towardEndDirection ? 0.8 : 0.2);
      const endX = box.x + box.width * (towardEndDirection ? 0.2 : 0.8);
      const y = box.y + Math.min(box.height / 2, 180);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y }],
      });
      for (let index = 1; index <= 4; index += 1) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: startX + ((endX - startX) * index) / 4, y }],
        });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      recordMobilePhysicalInput(counters, {
        category: "horizontal-scroll",
        direction,
        labId,
        stateId: `swipe:${direction}`,
        targetIdentity: `local-scroll:${direction}`,
      }, "swipe");
      return "cdp:Input.dispatchTouchEvent";
    },
  );
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).not.toBe(
    geometry.beforeScrollLeft,
  );
  const afterScrollLeft = await scroller.evaluate((element) => element.scrollLeft);
  const signedDisplacement = afterScrollLeft - geometry.beforeScrollLeft;
  if (towardEndDirection ? signedDisplacement <= 0 : signedDisplacement >= 0) {
    throw new TypeError(`${direction}: wrong local-scroll displacement.`);
  }
  counters.directionalSwipes.push({
    analytics: swipeAnalytics,
    afterScrollLeft,
    beforeScrollLeft: geometry.beforeScrollLeft,
    clientWidth: geometry.clientWidth,
    direction,
    labId,
    moveCount: 4,
    protocol: "cdp:Input.dispatchTouchEvent",
    scrollerId: "horizontal",
    scrollWidth: geometry.scrollWidth,
    signedDisplacement,
  });
  if (direction === "toward-start") {
    const [towardEnd] = counters.directionalSwipes;
    if (
      !towardEnd ||
      geometry.beforeScrollLeft !== towardEnd.afterScrollLeft ||
      afterScrollLeft !== towardEnd.beforeScrollLeft ||
      signedDisplacement !== -towardEnd.signedDisplacement
    ) throw new TypeError("G07 two-way swipe did not preserve continuity and exact return.");
  }
}

async function pageScrollGeometry(page: Page, root: Locator) {
  return root.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    return {
      centerTolerancePx: 40 as const,
      documentMaxScrollY: Math.max(
        0,
        document.documentElement.scrollHeight - viewportHeight,
        document.body.scrollHeight - viewportHeight,
      ),
      rootBottom: rect.bottom,
      rootCenter: (rect.top + rect.bottom) / 2,
      rootDocumentBottom: rect.bottom + window.scrollY,
      rootDocumentTop: rect.top + window.scrollY,
      rootTop: rect.top,
      scrollY: window.scrollY,
      viewportCenter: viewportHeight / 2,
      viewportHeight,
    };
  });
}

function reachedScrollLandmark(
  geometry: Awaited<ReturnType<typeof pageScrollGeometry>>,
  scrollId: (typeof SCROLL_POSITIONS)[number],
) {
  return scrollId === "page-top"
    ? geometry.scrollY <= 1
    : scrollId === "page-bottom"
      ? geometry.scrollY >= geometry.documentMaxScrollY - 1
      : Math.abs(geometry.rootCenter - geometry.viewportCenter) <=
        geometry.centerTolerancePx;
}

async function realMobileVerticalSwipe(
  page: Page,
  direction: "down-page" | "up-page",
  counters: RuntimeCounters,
  labId: string,
  stateId: string,
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new TypeError("G07 mobile page swipe has no viewport.");
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
  return recordMobilePhysicalInput(counters, {
    category: "vertical-scroll",
    direction,
    labId,
    stateId,
    targetIdentity: `page-scroll:${stateId}`,
  }, "swipe");
}

async function reachScrollPosition(
  page: Page,
  root: Locator,
  scrollId: (typeof SCROLL_POSITIONS)[number],
  project: G07ProductionProject,
  counters: RuntimeCounters,
  labId: string,
  stateId: string,
) {
  const initialGeometry = await pageScrollGeometry(page, root);
  if (project === "desktop-chrome") {
    if (scrollId === "page-top") await page.keyboard.press("Home");
    if (scrollId === "visualization-center") await root.scrollIntoViewIfNeeded();
    if (scrollId === "page-bottom") await page.keyboard.press("End");
    await expect.poll(async () =>
      reachedScrollLandmark(await pageScrollGeometry(page, root), scrollId),
    ).toBe(true);
    return {
      initialGeometry,
      scrollMethod: scrollId === "visualization-center"
        ? "locator.scrollIntoViewIfNeeded" as const
        : "page.keyboard.press" as const,
      verticalSwipeAttempts: [] as G07VerticalSwipeAttempt[],
    };
  }
  if (reachedScrollLandmark(initialGeometry, scrollId)) {
    return {
      initialGeometry,
      scrollMethod: "already-at-landmark" as const,
      verticalSwipeAttempts: [] as G07VerticalSwipeAttempt[],
    };
  }
  const verticalSwipeAttempts: G07VerticalSwipeAttempt[] = [];
  let beforeGeometry = initialGeometry;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const direction = scrollId === "page-top"
      ? "up-page"
      : scrollId === "page-bottom"
        ? "down-page"
        : beforeGeometry.rootCenter > beforeGeometry.viewportCenter
          ? "down-page"
          : "up-page";
    const physicalInputSequence = await realMobileVerticalSwipe(page, direction, counters, labId, stateId);
    await expect.poll(async () => (await pageScrollGeometry(page, root)).scrollY).not.toBe(beforeGeometry.scrollY);
    const afterGeometry = await pageScrollGeometry(page, root);
    const targetReached = reachedScrollLandmark(afterGeometry, scrollId);
    verticalSwipeAttempts.push({
      afterGeometry,
      afterScrollY: afterGeometry.scrollY,
      attemptNumber: attempt + 1,
      beforeGeometry,
      beforeScrollY: beforeGeometry.scrollY,
      direction,
      method: "cdp:Input.dispatchTouchEvent:vertical",
      moveCount: 4,
      physicalInputSequence,
      signedDisplacement: afterGeometry.scrollY - beforeGeometry.scrollY,
      targetReached,
    });
    if (targetReached) {
      return {
        initialGeometry,
        scrollMethod: "cdp:Input.dispatchTouchEvent:vertical" as const,
        verticalSwipeAttempts,
      };
    }
    beforeGeometry = afterGeometry;
  }
  throw new TypeError(`${scrollId}: real CDP page scroll landmark not reached.`);
}

async function visualReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axis: { axisId: string; locale: string; project: string; theme: string },
  project: G07ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  userId: string,
): Promise<G07VisualStateReceipt> {
  if (
    (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
    (axis.theme !== "dark" && axis.theme !== "light") ||
    axis.project !== project
  ) throw new TypeError(`${axis.axisId}: invalid G07 visual axis.`);
  await applyLocaleThemeSetup(page, { locale: axis.locale, theme: axis.theme }, project, counters, labId, stateId);
  const resetAction = await collectSubactionAnalytics(
    page,
    analytics,
    counters,
    { kind: "primary", subactionId: "primary:reset", target: "reset" },
    userId,
    () => realActivate(page, root.locator("[data-viz-reset-model]"), project, counters, { category: "reset", direction: null, labId, stateId, targetIdentity: "reset" }),
  );
  await settle(root, `${stateId}:reset`);
  const reset = await resetReceipt(root, labId);
  if (project === "mobile-chrome" && counters.directionalSwipes.length === 0) {
    await realHorizontalSwipe(page, root, counters, analytics, labId, userId, "toward-end");
    await realHorizontalSwipe(page, root, counters, analytics, labId, userId, "toward-start");
  }
  const scrollAudits: G07VisualStateReceipt["scrollAudits"] = [];
  for (const scrollId of SCROLL_POSITIONS) {
    const scroll = await reachScrollPosition(page, root, scrollId, project, counters, labId, stateId);
    scrollAudits.push({
      ...await uiScan(root, `${stateId}:${scrollId}`),
      geometry: await pageScrollGeometry(page, root),
      initialGeometry: scroll.initialGeometry,
      scrollId,
      scrollMethod: scroll.scrollMethod,
      verticalSwipeAttempts: scroll.verticalSwipeAttempts,
    });
  }
  return {
    axisId: axis.axisId,
    identity: {
      activeLabId: labId,
      configuredModelCount: await root.locator("[data-viz-configured-model]").count() as 1,
      genericFallbackCount: await root.locator("[data-viz-renderer-mode]").count() as 0,
      playApplicable: false,
      renderer: "mainland-symbolic-expressions",
      resetControlCount: await root.locator("[data-viz-reset-model]").count() as 1,
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

function finalizedRawDeliveries(harness: AnalyticsHarness) {
  return harness.rawDeliveries.map((delivery): G07RawAnalyticsDelivery => {
    if (
      !delivery.temporal ||
      !delivery.responseBodyReady ||
      delivery.responseStatus !== 200 ||
      !isRecord(delivery.parsedRequestBody) ||
      !isRecord(delivery.parsedResponseBody)
    ) throw new TypeError(`${delivery.deliveryId}: malformed/unsettled raw analytics delivery.`);
    return {
      captureSequence: delivery.captureSequence,
      deliveryId: delivery.deliveryId,
      ownerHeader: "x-mais-analytics-user-id",
      ownerUserId: delivery.ownerUserId ?? "",
      parsedRequestBody: delivery.parsedRequestBody as G07RawAnalyticsDelivery["parsedRequestBody"],
      parsedResponseBody: delivery.parsedResponseBody as G07RawAnalyticsDelivery["parsedResponseBody"],
      rawRequestBody: delivery.rawRequestBody,
      rawResponseBody: delivery.rawResponseBody,
      responseBodyReady: true,
      responseStatus: 200,
      serializedRequestBody: delivery.rawRequestBody,
      serializedResponseBody: delivery.rawResponseBody,
      temporal: delivery.temporal,
    };
  });
}

test.describe("Mainland G07 exact production browser receipt", () => {
  test("requires native authority before producing all G07 browser evidence", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60 * 60_000);
    const runnerInvocation = requireG07ProductionRunnerAuthority();
    const project = projectFrom(testInfo);
    if (project === "mobile-chrome") expect(testInfo.project.use.hasTouch).toBe(true);
    const diagnostics = installDiagnostics(page);
    const counters: RuntimeCounters = {
      directionalSwipes: [],
      physicalInputEntries: [],
      rangeTouchAttempts: [],
      realSwipeCount: 0,
      realTapCount: 0,
      sessionPostCount: 0,
      setupTransitions: [],
      swipeMoveCount: 0,
    };
    const globalCaptureSequence: GlobalCaptureSequence = { next: 0 };
    const projectClockOriginEpochMs = performance.timeOrigin;
    const analytics = installAnalyticsHarness(page, globalCaptureSequence);
    installSessionPostCounter(page, counters);
    await installHkVisualizationEffectiveVisibilityInspector(page);

    const interactionAxis = expectedInteractionAxis(project);
    const interactionStateIds = expectedInteractionStateIds(project);
    const visualAxes = expectedVisualAxes(project);
    const visualStateIds = expectedVisualStateIds(project);
    const interactionStates: G07InteractionStateReceipt[] = [];
    const visualStates: G07VisualStateReceipt[] = [];
    const durabilityReceipts: G07ProductionBrowserPayload["durabilityReceipts"] = [];
    for (const [labSequenceIndex, labId] of G07_PRODUCTION_PLAN.labIds.entries()) {
      const student = await registerMainlandStudent(page, testInfo, labId);
      const rawSessionCheckpointChain: G07RawSessionCheckpoint[] = [];
      const afterRegistrationCheckpoint = await captureRawSessionCheckpoint(
        page,
        "post-registration",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
      );
      rawSessionCheckpointChain.push(afterRegistrationCheckpoint);
      expect(afterRegistrationCheckpoint.fullRecords).toEqual([]);
      const siblingBaseline = await seedSiblingSessions(page, labId, student.userId);
      const afterSiblingSeedCheckpoint = await captureRawSessionCheckpoint(
        page,
        "after-sibling-seed",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
      );
      rawSessionCheckpointChain.push(afterSiblingSeedCheckpoint);
      expect(afterSiblingSeedCheckpoint.fullRecords).toEqual(siblingBaseline);
      const mountPostBaseline = counters.sessionPostCount;
      const response = await page.goto(
        `/student/lessons/${encodeURIComponent(labId)}`,
        { waitUntil: "domcontentloaded" },
      );
      expect(response?.status()).toBeLessThan(400);
      await closeLearnerStartSetupIfVisible(page);
      let root = await activeRoot(page, labId);
      await settle(root, `${labId}:mount`);
      await resetReceipt(root, labId);
      await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
      expect(analytics.rawDeliveries, `${labId}: mount raw learning deliveries`).toEqual([]);
      const mountSessions = await visualizationSessions(page);
      expectSiblingSessionsUnchanged(mountSessions, labId, siblingBaseline);
      expect(sessionSet(mountSessions, labId, student.userId, true).count).toBe(0);
      const stages: G07ProductionBrowserPayload["durabilityReceipts"][number]["stages"] = [
        durabilityStage("mount", mountSessions, labId, student.userId, 0, null),
      ];

      if (
        (interactionAxis.locale !== "en" && interactionAxis.locale !== "zh" && interactionAxis.locale !== "zh-Hans") ||
        (interactionAxis.theme !== "dark" && interactionAxis.theme !== "light")
      ) throw new TypeError(`${interactionAxis.axisId}: invalid interaction locale/theme.`);
      await applyLocaleThemeSetup(page, { locale: interactionAxis.locale, theme: interactionAxis.theme }, project, counters, labId, `interaction:${labId}:${interactionAxis.axisId}:before-initial`);
      const beforeInitial = await observeLocaleTheme(
        page,
        interactionAxis.locale,
        interactionAxis.theme,
      );

      const labStateIds = interactionStateIds.filter((stateId) =>
        stateId.startsWith(`interaction:${labId}:${interactionAxis.axisId}:`),
      );
      const initialStateId = labStateIds[0];
      const firstStateId = labStateIds[1];
      const secondStateId = labStateIds[2];
      if (
        !initialStateId?.endsWith(":initial") ||
        !firstStateId?.endsWith(":first") ||
        !secondStateId
      ) throw new TypeError(`${labId}: canonical initial/first/second order drifted.`);
      interactionStates.push(await interactionReceipt(
        page,
        root,
        initialStateId,
        labId,
        interactionAxis.axisId,
        project,
        counters,
        analytics,
        student.userId,
      ));

      const firstPostBaseline = counters.sessionPostCount;
      const firstAckPromise = page.waitForResponse((candidate) =>
        candidate.request().method() === "POST" &&
        applicationPath(candidate.url()) === "/api/visualization-sessions",
      );
      interactionStates.push(await interactionReceipt(
        page,
        root,
        firstStateId,
        labId,
        interactionAxis.axisId,
        project,
        counters,
        analytics,
        student.userId,
        async () => {
          const acknowledgement = await firstAckPromise;
          expect(acknowledgement.status()).toBe(200);
          expect(decodeURIComponent(
            acknowledgement.request().headers()["x-mais-visualization-user-id"] ?? "",
          )).toBe(student.userId);
          const afterFirstCheckpoint = await captureRawSessionCheckpoint(
            page,
            "after-first",
            labId,
            student.userId,
            globalCaptureSequence,
            projectClockOriginEpochMs,
          );
          rawSessionCheckpointChain.push(afterFirstCheckpoint);
          const firstSessions = afterFirstCheckpoint.fullRecords;
          expectSiblingSessionsUnchanged(firstSessions, labId, siblingBaseline);
          expect(sessionSet(firstSessions, labId, student.userId, true).count).toBe(1);
          stages.push(durabilityStage("first", firstSessions, labId, student.userId, 1, 200));
        },
      ));
      const afterResetCheckpoint = await captureRawSessionCheckpoint(
        page,
        "after-reset",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
      );
      rawSessionCheckpointChain.push(afterResetCheckpoint);
      const resetSessions = afterResetCheckpoint.fullRecords;
      expectSiblingSessionsUnchanged(resetSessions, labId, siblingBaseline);
      stages.push(durabilityStage("reset", resetSessions, labId, student.userId, 0, null));

      interactionStates.push(await interactionReceipt(
        page,
        root,
        secondStateId,
        labId,
        interactionAxis.axisId,
        project,
        counters,
        analytics,
        student.userId,
      ));
      const afterSecondCheckpoint = await captureRawSessionCheckpoint(
        page,
        "after-second",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
      );
      rawSessionCheckpointChain.push(afterSecondCheckpoint);
      const secondSessions = afterSecondCheckpoint.fullRecords;
      expectSiblingSessionsUnchanged(secondSessions, labId, siblingBaseline);
      stages.push(durabilityStage("second", secondSessions, labId, student.userId, 0, null));

      await page.reload({ waitUntil: "domcontentloaded" });
      await closeLearnerStartSetupIfVisible(page);
      await applyLocaleThemeSetup(page, { locale: interactionAxis.locale, theme: interactionAxis.theme }, project, counters, labId, `interaction:${labId}:${interactionAxis.axisId}:after-reload`);
      const afterReload = await observeLocaleTheme(
        page,
        interactionAxis.locale,
        interactionAxis.theme,
      );
      root = await activeRoot(page, labId);
      await settle(root, `${labId}:reload`);
      const afterReloadCheckpoint = await captureRawSessionCheckpoint(
        page,
        "after-reload",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
      );
      rawSessionCheckpointChain.push(afterReloadCheckpoint);
      const reloadSessions = afterReloadCheckpoint.fullRecords;
      expectSiblingSessionsUnchanged(reloadSessions, labId, siblingBaseline);
      stages.push(durabilityStage("reload", reloadSessions, labId, student.userId, 0, null));

      for (const stateId of labStateIds.slice(3)) {
        interactionStates.push(await interactionReceipt(
          page,
          root,
          stateId,
          labId,
          interactionAxis.axisId,
          project,
          counters,
          analytics,
          student.userId,
        ));
      }
      for (const [visualIndex, axis] of visualAxes.entries()) {
        const stateId = `visual:${labId}:${axis.axisId}:reset`;
        if (!visualStateIds.includes(stateId)) {
          throw new TypeError(`${stateId}: missing frozen visual state.`);
        }
        visualStates.push(await visualReceipt(
          page,
          root,
          stateId,
          labId,
          axis,
          project,
          counters,
          analytics,
          student.userId,
        ));
        const afterVisualCheckpoint = await captureRawSessionCheckpoint(
          page,
          `after-visual:${axis.axisId}`,
          labId,
          student.userId,
          globalCaptureSequence,
          projectClockOriginEpochMs,
          !(labSequenceIndex === G07_PRODUCTION_PLAN.labIds.length - 1 && visualIndex === visualAxes.length - 1),
        );
        rawSessionCheckpointChain.push(afterVisualCheckpoint);
      }

      const finalCheckpoint = await captureRawSessionCheckpoint(
        page,
        "final",
        labId,
        student.userId,
        globalCaptureSequence,
        projectClockOriginEpochMs,
        labSequenceIndex < G07_PRODUCTION_PLAN.labIds.length - 1,
      );
      rawSessionCheckpointChain.push(finalCheckpoint);
      const finalSessions = finalCheckpoint.fullRecords;
      expectSiblingSessionsUnchanged(finalSessions, labId, siblingBaseline);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      expect(counters.sessionPostCount - mountPostBaseline).toBe(1);
      stages.push(durabilityStage("final", finalSessions, labId, student.userId, 0, null));
      expect(stages.map(({ stage }) => stage)).toEqual([
        "mount", "first", "reset", "second", "reload", "final",
      ]);
      expect(rawSessionCheckpointChain.map(({ checkpointId }) => checkpointId)).toEqual([
        "post-registration",
        "after-sibling-seed",
        "after-first",
        "after-reset",
        "after-second",
        "after-reload",
        ...visualAxes.map(({ axisId }) => `after-visual:${axisId}`),
        "final",
      ]);
      const stableRawSessionCheckpoint = rawSessionCheckpointChain[2];
      if (!stableRawSessionCheckpoint) throw new TypeError(`${labId}: after-first raw checkpoint absent.`);
      for (const checkpoint of rawSessionCheckpointChain.slice(3)) {
        expect(checkpoint.rawResponseBody, `${labId}: stable raw session bytes`).toBe(
          stableRawSessionCheckpoint.rawResponseBody,
        );
        expect(checkpoint.fullRecords, `${labId}: stable full session records`).toEqual(
          stableRawSessionCheckpoint.fullRecords,
        );
      }
      const target = sessionSet(finalSessions, labId, student.userId, true);
      const sessionId = `${target.sessions[0]?.moduleId}:${target.sessions[0]?.topicId}:${target.sessions[0]?.source}`;
      const labInteractionSubactions = interactionStates
        .filter((state) => state.labId === labId)
        .flatMap(({ action }) => action.subactions);
      const labVisualSubactions = visualStates
        .filter((state) => state.labId === labId)
        .map(({ resetAction }) => resetAction);
      const captureSequenceFor = (deliveryId: string) => {
        const delivery = analytics.rawDeliveries.find((candidate) => candidate.deliveryId === deliveryId);
        if (!delivery) throw new TypeError(`${labId}: phase delivery ${deliveryId} absent.`);
        return delivery.captureSequence;
      };
      const interactionLastCaptureSequence = captureSequenceFor(
        labInteractionSubactions.at(-1)!.deliveryId,
      );
      const visualFirstCaptureSequence = captureSequenceFor(
        labVisualSubactions[0]!.deliveryId,
      );
      const visualLastCaptureSequence = captureSequenceFor(
        labVisualSubactions.at(-1)!.deliveryId,
      );
      durabilityReceipts.push({
        final: {
          exactlyOnce: true,
          noSiblingMutation: true,
          sameUser: true,
          serverBacked: true,
          survivedReload: true,
        },
        interactionSurfaceEvidence: { afterReload, beforeInitial },
        labId,
        phaseBoundary: {
          clockOriginEpochMs: finalCheckpoint.clockOriginEpochMs,
          finalCheckpoint: {
            captureSequence: visualLastCaptureSequence,
            capturedAt: finalCheckpoint.capturedAt,
            capturedMonotonicMs: finalCheckpoint.capturedMonotonicMs,
          },
          interactionLastCaptureSequence,
          labSequenceIndex,
          nextLabFirstCaptureSequence:
            labSequenceIndex + 1 < G07_PRODUCTION_PLAN.labIds.length
              ? globalCaptureSequence.next
              : null,
          visualFirstCaptureSequence,
          visualLastCaptureSequence,
        },
        rawSessionCheckpointChain,
        sessionId,
        stages,
        userId: student.userId,
      });

      const finalRawCount = analytics.rawDeliveries.length;
      await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
      expect(
        analytics.rawDeliveries.length,
        `${labId}: no delayed/surplus raw delivery`,
      ).toBe(finalRawCount);
    }

    expect(interactionStates.map((receipt) => receipt.stateId)).toEqual(interactionStateIds);
    expect(visualStates.map((receipt) => receipt.stateId)).toEqual(visualStateIds);
    const projectTerminalRawCount = analytics.rawDeliveries.length;
    await page.waitForTimeout(ANALYTICS_QUIET_INTERVAL_MS);
    const projectQuiescentRawCount = analytics.rawDeliveries.length;
    const lateDeliveryCount = projectQuiescentRawCount - projectTerminalRawCount;
    expect(lateDeliveryCount, "G07 project terminal analytics quiescence").toBe(0);
    const rawDeliveries = finalizedRawDeliveries(analytics);
    const consumedDeliveryIds = [...analytics.consumedDeliveryIds];
    const consumedEventIds = [...analytics.consumedEventIds];
    const capturedRawDeliveryIds = rawDeliveries.map(({ deliveryId }) => deliveryId);
    expect(capturedRawDeliveryIds, "G07 global raw analytics listener equality").toEqual(consumedDeliveryIds);
    analytics.dispose();
    const rawEventIds = rawDeliveries.map(
      ({ parsedRequestBody }) => parsedRequestBody.events[0].id,
    );
    const parsedEventIds = rawDeliveries.map(
      ({ parsedRequestBody }) => parsedRequestBody.events[0].id,
    );
    const serializedEventIds = rawDeliveries.map(({ serializedRequestBody }) =>
      (parseJson(serializedRequestBody) as G07RawAnalyticsDelivery["parsedRequestBody"])
        .events[0].id,
    );
    // Raw delivery order is the terminal serialization order. The public gate
    // independently proves that this ordered ledger is an exact permutation of
    // the event IDs referenced by every interaction and visual reset receipt.
    const receiptEventIds = [...rawEventIds];
    const payload: G07ProductionBrowserPayload = {
      analyticsLedger: {
        consumedDeliveryIds,
        consumedEventIds,
        exactTerminalEquality: true,
        lateDeliveryCount: lateDeliveryCount as 0,
        listenerLifetime: {
          disposedAfterTerminalQuiescence: true,
          installedBeforeRelevantPageActions: true,
          installedOnce: true,
          projectQuiescentRawCount,
          projectTerminalRawCount,
        },
        parsedEventIds,
        rawDeliveries,
        rawEventIds,
        receiptEventIds,
        serializedEventIds,
        surplusDeliveryIds: [],
        unconsumedDeliveryIds: [],
      },
      diagnostics: {
        consoleErrors: diagnostics.consoleErrors as [],
        pageErrors: diagnostics.pageErrors as [],
        requestFailures: diagnostics.requestFailures as [],
      },
      durabilityReceipts,
      execution: {
        complete: false,
        projectsTogether: ["desktop-chrome", "mobile-chrome"],
        retries: 0,
        shard: null,
        skipped: 0,
        unexpected: 0,
      },
      fullVisualInteractionCartesian: false,
      groupId: "G07",
      interactionAxisId: interactionAxis.axisId,
      interactionStates,
      labIds: [...G07_PRODUCTION_PLAN.labIds],
      planCanonicalSha256: G07_APPROVED_PLAN_CANONICAL_SHA256,
      playApplicable: false,
      project,
      runnerInvocation,
      schemaVersion: "china-mainland-g07-production-browser-receipt.v1",
      sourceEvidence: {
        selectedCriticalSources: selectedCriticalSourceEvidence(),
        selectionKind: "selected-critical-sources",
        selectionVersion: G07_SELECTED_CRITICAL_SOURCES_VERSION,
        transitiveClosureClaimed: false,
      },
      touchEvidence: project === "mobile-chrome"
        ? {
            directionalSwipes: counters.directionalSwipes,
            hasTouch: true,
            physicalInputLedger: {
              analyticsBoundEntrySequences: counters.physicalInputEntries.filter(({ analyticsBound }) => analyticsBound).map(({ sequence }) => sequence),
              entries: counters.physicalInputEntries,
              orderedStepProjection: [],
              totals: projectPhysicalInputTotals(counters.physicalInputEntries),
            },
            rangeTouchAttempts: counters.rangeTouchAttempts,
            realSwipeCount: counters.realSwipeCount,
            realTapCount: counters.realTapCount,
            setupTransitions: counters.setupTransitions,
            swipeMoveCount: counters.swipeMoveCount,
            swipeProtocol: "cdp:Input.dispatchTouchEvent",
          }
          : {
            directionalSwipes: [],
            hasTouch: false,
            physicalInputLedger: { analyticsBoundEntrySequences: [], entries: [], orderedStepProjection: [], totals: projectPhysicalInputTotals([]) },
            rangeTouchAttempts: [],
            realSwipeCount: 0,
            realTapCount: 0,
            setupTransitions: [],
            swipeMoveCount: 0,
            swipeProtocol: "none",
          },
      visualAxisIds: visualAxes.map(({ axisId }) => axisId),
      visualStates,
    };
    if (project === "mobile-chrome") {
      payload.touchEvidence.physicalInputLedger.orderedStepProjection =
        deriveG07PhysicalStepProjection(payload);
    }
    const receipt = sealG07ProductionBrowserPayload(payload);
    validateG07ProductionBrowserReceipt(receipt, project);
    await testInfo.attach(`china-mainland-g07-production-${project}.json`, {
      body: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
      contentType: "application/json",
    });
  });
});
