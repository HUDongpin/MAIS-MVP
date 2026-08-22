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

import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
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
import { G01_PRODUCTION_PLAN } from "./china-mainland-g01-production-plan";
import {
  assertG01TrustedRunnerAuthority,
  sealG01ProductionBrowserPayload,
  g01DurableSessionId,
  g01SerializedAnalyticsEventIds,
  readG01RunnerInvocationEnvironment,
  validateG01AnalyticsTerminalEvidence,
  validateG01ProductionBrowserReceipt,
  validateG01RawAnalyticsDeliveryWindow,
  type G01InteractionStateReceipt,
  type G01ProductionBrowserPayload,
  type G01ProductionProject,
  type G01RawAnalyticsDeliveryEvidence,
  type G01RunnerInvocationEvidence,
  type G01SessionSnapshot,
  type G01VisualStateReceipt,
} from "./china-mainland-g01-production-receipt";

const SUPPORTED_PROJECTS = ["desktop-chrome", "mobile-chrome"] as const;
const SCROLL_POSITIONS = ["page-top", "visualization-center", "page-bottom"] as const;
const MODE_OPTIONS = ["add", "subtract", "multiply", "divide", "estimate-check"] as const;
const MODULE_ID = "configured-visualization-lab" as const;

type Locale = "en" | "zh" | "zh-Hans";
type Theme = "dark" | "light";
type RawAnalyticsEvent = {
  id: string;
  source: string;
  topicId: string;
  type: "visualization-action";
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
  realSwipeCount: number;
  realTapCount: number;
  sessionPostCount: number;
  swipeMoveCount: number;
};
type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};
type AnalyticsHarness = {
  consumedAnalyticsEventIds: Set<string>;
  deliveries: Array<G01RawAnalyticsDeliveryEvidence & {
    request: Request;
  }>;
};

function sha256File(path: URL) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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

function visualizationLearningEvents(body: unknown) {
  const rawEventIds: string[] = [];
  if (!isRecord(body) || !Array.isArray(body.events)) {
    return {
      events: [] as RawAnalyticsEvent[],
      rawEventIds,
      requestMalformedReason: "body.events is not an array",
    };
  }
  const events: RawAnalyticsEvent[] = [];
  for (const [index, candidate] of body.events.entries()) {
    if (!isRecord(candidate)) {
      return {
        events,
        rawEventIds,
        requestMalformedReason: `events[${index}] is not an object`,
      };
    }
    const id = candidate.id;
    if (typeof id === "string") rawEventIds.push(id);
    const source = candidate.source;
    const topicId = candidate.topicId;
    const type = candidate.type;
    if (
      typeof id !== "string" || id.trim().length === 0 ||
      typeof source !== "string" || source.trim().length === 0 ||
      typeof topicId !== "string" || topicId.trim().length === 0 ||
      type !== "visualization-action"
    ) {
      return {
        events,
        rawEventIds,
        requestMalformedReason: `events[${index}] is not an exact visualization-action`,
      };
    }
    events.push({ id, source, topicId, type });
  }
  if (events.length === 0) {
    return { events, rawEventIds, requestMalformedReason: "events is empty" };
  }
  return { events, rawEventIds, requestMalformedReason: null };
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

function installAnalyticsHarness(page: Page, counters: RuntimeCounters): AnalyticsHarness {
  const harness: AnalyticsHarness = {
    consumedAnalyticsEventIds: new Set<string>(),
    deliveries: [],
  };
  page.on("request", (request) => {
    const pathname = applicationPath(request.url());
    if (request.method() === "POST" && pathname === "/api/visualization-sessions") {
      counters.sessionPostCount += 1;
    }
    if (request.method() === "POST" && pathname === "/api/learning-events") {
      const rawBodyText = request.postData();
      const parsed = visualizationLearningEvents(parseJson(rawBodyText));
      let ownerUserId: string | null = null;
      try {
        const encodedOwner = request.headers()["x-mais-analytics-user-id"];
        ownerUserId = encodedOwner ? decodeURIComponent(encodedOwner) : null;
      } catch {
        ownerUserId = null;
      }
      harness.deliveries.push({
        acknowledgedEventIds: [],
        endpoint: "/api/learning-events",
        events: parsed.events,
        method: "POST",
        ownerUserId,
        rawBodyText,
        rawEventIds: parsed.rawEventIds,
        request,
        requestMalformedReason: parsed.requestMalformedReason,
        responseMalformedReason: "response not observed",
        responseStatus: null,
      });
    }
  });
  page.on("response", async (response) => {
    if (applicationPath(response.url()) !== "/api/learning-events") return;
    const delivery = harness.deliveries.find(
      (candidate) => candidate.request === response.request(),
    );
    if (!delivery) return;
    delivery.responseStatus = response.status();
    const rawResponseText = await response.text().catch(() => null);
    const body = parseJson(rawResponseText);
    if (!isRecord(body) || !Array.isArray(body.acknowledgedEventIds)) {
      delivery.responseMalformedReason = "acknowledgedEventIds is not an array";
      return;
    }
    if (!body.acknowledgedEventIds.every(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    )) {
      delivery.responseMalformedReason = "acknowledgedEventIds contains a malformed ID";
      return;
    }
    delivery.acknowledgedEventIds = [...body.acknowledgedEventIds];
    delivery.responseMalformedReason = null;
  });
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

function requireG01ProductionRunnerAuthority(): G01RunnerInvocationEvidence {
  try {
    const runnerInvocation = readG01RunnerInvocationEnvironment(process.env);
    // A direct Playwright call, desktop-only/grep narrowing, or caller-forged
    // exact JSON+SHA cannot mint release authority. C2 has no native runner that
    // owns spawn/wait plus an immutable receipt, so coverage unavailable is the
    // only honest result until a dedicated runner is assigned in a future slice.
    return assertG01TrustedRunnerAuthority(runnerInvocation);
  } catch (error) {
    throw new TypeError(
      `G01 production coverage unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function projectFrom(testInfo: TestInfo): G01ProductionProject {
  const configuredProjects = testInfo.config.projects.map(({ name }) => name);
  expect(
    configuredProjects,
    "G01 config declares the canonical two-project set; runner selection authority is separate",
  ).toEqual([...SUPPORTED_PROJECTS]);
  for (const configuredProject of testInfo.config.projects) {
    expect(configuredProject.retries, `${configuredProject.name}: configured retries`).toBe(0);
  }
  expect(testInfo.expectedStatus, "G01 production project must expect passed status").toBe("passed");
  expect(SUPPORTED_PROJECTS).toContain(testInfo.project.name);
  if (!SUPPORTED_PROJECTS.includes(testInfo.project.name as G01ProductionProject)) {
    throw new TypeError(`Unsupported exact G01 project ${testInfo.project.name}.`);
  }
  expect(testInfo.retry, "G01 production evidence forbids retries").toBe(0);
  expect(testInfo.config.shard, "G01 production evidence forbids shards").toBeNull();
  return testInfo.project.name as G01ProductionProject;
}

function expectedInteractionAxis(project: G01ProductionProject) {
  const axis = G01_PRODUCTION_PLAN.coverage.interactionAxes.find(
    (candidate) => candidate.project === project,
  );
  if (!axis) throw new TypeError(`${project}: G01 interaction axis is absent.`);
  return axis;
}

function expectedInteractionStateIds(project: G01ProductionProject) {
  const axisId = expectedInteractionAxis(project).axisId;
  return G01_PRODUCTION_PLAN.logicalStates.interactionStateIds.filter((stateId) =>
    stateId.includes(`:${axisId}:`),
  );
}

function expectedVisualAxes(project: G01ProductionProject) {
  return G01_PRODUCTION_PLAN.coverage.visualAxes.filter(
    (axis) => axis.project === project,
  );
}

function expectedVisualStateIds(project: G01ProductionProject) {
  const axes = expectedVisualAxes(project);
  return G01_PRODUCTION_PLAN.logicalStates.visualStateIds.filter((stateId) =>
    axes.some(({ axisId }) => stateId.endsWith(`:${axisId}:reset`)),
  );
}

function scenarioIdFrom(stateId: string, labId: string, axisId: string) {
  const prefix = `interaction:${labId}:${axisId}:`;
  if (!stateId.startsWith(prefix)) throw new TypeError(`${stateId}: invalid G01 state identity.`);
  return stateId.slice(prefix.length);
}

async function registerMainlandStudent(page: Page, testInfo: TestInfo, labId: string) {
  const lab = getVisualizationLabByLabId(labId);
  if (!lab || lab.labId !== labId || lab.topicId !== labId || lab.moduleId !== MODULE_ID) {
    throw new TypeError(`${labId}: exact G01 catalog identity is absent.`);
  }
  if (lab.publisher !== "MAINLAND_BNU" && lab.publisher !== "MAINLAND_HJB") {
    throw new TypeError(`${labId}: expected a BNU or HJB publisher.`);
  }
  const suffix = `${uniqueSuffix(testInfo)}-${labId}`
    .replace(/[^a-z0-9-]+/giu, "-")
    .slice(0, 100);
  const username = `g01-c2-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      curriculumProfile: { publisher: lab.publisher, region: "MAINLAND" },
      curriculumTrack: lab.curriculumTrack,
      email: username,
      grade: lab.grade,
      language: "zh-Hans",
      name: `G01 C2 ${suffix}`,
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

function sessionSnapshot(session: LiveSession): G01SessionSnapshot {
  const sessionKeys = Object.keys(session).sort();
  expect(sessionKeys, "exact server session keys").toEqual([
    "completedAt",
    "explored",
    "moduleId",
    "source",
    "topicId",
    "updatedAt",
  ]);
  if (
    session.completedAt !== null ||
    session.explored !== true ||
    session.moduleId !== MODULE_ID ||
    typeof session.topicId !== "string" ||
    typeof session.source !== "string" ||
    typeof session.updatedAt !== "string" ||
    !session.updatedAt.trim()
  ) throw new TypeError(`Incomplete durable session: ${JSON.stringify(session)}.`);
  return {
    completedAt: null,
    explored: true,
    moduleId: MODULE_ID,
    source: session.source,
    topicId: session.topicId,
    updatedAt: session.updatedAt,
  };
}

function targetSessions(sessions: readonly LiveSession[], labId: string) {
  return sessions.filter(({ topicId }) => topicId === labId);
}

function siblingSessionSnapshot(sessions: readonly LiveSession[], labId: string) {
  return sessions
    .filter(({ topicId }) => topicId !== labId)
    .map(sessionSnapshot)
    .sort((left, right) => left.topicId.localeCompare(right.topicId));
}

function sessionSetReceipt(userId: string, sessions: readonly LiveSession[]) {
  const snapshots = sessions.map(sessionSnapshot)
    .sort((left, right) => left.topicId.localeCompare(right.topicId));
  return { count: snapshots.length, sessions: snapshots, userId };
}

function siblingSessionSetReceipt(
  userId: string,
  sessions: readonly LiveSession[],
  labId: string,
) {
  const snapshots = siblingSessionSnapshot(sessions, labId);
  return { count: snapshots.length, sessions: snapshots, userId };
}

function expectSiblingSessionsUnchanged(
  sessions: readonly LiveSession[],
  labId: string,
  siblingBaseline: readonly G01SessionSnapshot[],
) {
  expect(
    siblingSessionSnapshot(sessions, labId),
    `${labId}: same-user sibling sessions must remain byte-for-byte stable`,
  ).toEqual(siblingBaseline);
}

async function seedSiblingSession(
  page: Page,
  siblingLabId: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
) {
  const sibling = getVisualizationLabByLabId(siblingLabId);
  if (!sibling) throw new TypeError(`${siblingLabId}: sibling catalog row is absent.`);
  const response = await page.goto(`/student/lessons/${encodeURIComponent(siblingLabId)}`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBeLessThan(400);
  await closeLearnerStartSetupIfVisible(page);
  const root = page.locator(
    `[data-viz-active-lab-id=${JSON.stringify(siblingLabId)}]`,
  );
  await expect(root).toHaveCount(1);
  await expect(root).toBeVisible({ timeout: 30_000 });
  const range = root.locator('input[type="range"][data-viz-parameter]').first();
  await expect(range).toBeVisible();
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const before = Number(await range.inputValue());
  const target = before < max ? before + 1 : Math.max(min, before - 1);
  const sessionAck = page.waitForResponse((candidate) =>
    candidate.request().method() === "POST" &&
    applicationPath(candidate.url()) === "/api/visualization-sessions",
  );
  const seedStateId = `sibling-seed:${siblingLabId}`;
  const subactions: G01InteractionStateReceipt["action"]["subactions"] = [];
  const record: PhysicalSubactionRecorder = async (label, action) => {
    const receipt = await collectSubactionAnalytics(
      analytics,
      seedStateId,
      siblingLabId,
      expectedUserId,
      sibling.analyticsSource,
      `${seedStateId}:subaction:${subactions.length + 1}`,
      async () => `${label}|${await action()}`,
    );
    subactions.push(receipt);
    return receipt;
  };
  await setRangeThroughRealInput(page, range, target, project, counters, record);
  expect(subactions.length).toBeGreaterThan(0);
  const ack = await sessionAck;
  expect(ack.status()).toBe(200);
  const ackBody = await readJson<{ acknowledgedUserId?: unknown; session?: LiveSession }>(
    ack,
    `${siblingLabId}: sibling seed ACK`,
  );
  expect(ackBody).toMatchObject({
    acknowledgedUserId: expectedUserId,
    session: { explored: true, topicId: siblingLabId },
  });
  if (!ackBody.session) throw new TypeError(`${siblingLabId}: sibling seed session is absent.`);
  expect(sessionSnapshot(ackBody.session)).toEqual(
    sessionSnapshot(targetSessions(await visualizationSessions(page), siblingLabId)[0]!),
  );
  return subactions;
}

async function seedSiblingSessions(
  page: Page,
  targetLabId: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
) {
  const siblingIds = G01_PRODUCTION_PLAN.labIds
    .filter((siblingLabId) => siblingLabId !== targetLabId)
    .sort();
  expect(siblingIds).toHaveLength(G01_PRODUCTION_PLAN.labIds.length - 1);
  const setupSubactions: G01InteractionStateReceipt["action"]["subactions"] = [];
  for (const siblingLabId of siblingIds) {
    setupSubactions.push(...await seedSiblingSession(
      page,
      siblingLabId,
      project,
      counters,
      analytics,
      expectedUserId,
    ));
  }
  const sessions = await visualizationSessions(page);
  const siblingBaseline = siblingSessionSnapshot(sessions, targetLabId);
  expect(siblingBaseline.map(({ topicId }) => topicId).sort()).toEqual(
    [...siblingIds].sort(),
  );
  expect(targetSessions(sessions, targetLabId)).toEqual([]);
  return { setupSubactions, siblingBaseline };
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
  await expect(root.locator('[data-mainland-multi-digit-operations="v1"]')).toHaveCount(1);
  await expect(root.locator('[data-viz-configured-model="multi-digit-operations-v1"]')).toHaveCount(1);
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
  throw new Error(`${label}: G01 configured state did not settle.`);
}

function stateField(stateKey: string, key: string) {
  const value = stateKey.match(new RegExp(`(?:^|\\|)${key}=([^|]+)`, "u"))?.[1];
  if (value === undefined) throw new TypeError(`${stateKey}: missing ${key}.`);
  return value;
}

async function observeState(root: Locator) {
  const renderer = root.locator('[data-viz-configured-model="multi-digit-operations-v1"]');
  const stateKey = await renderer.getAttribute("data-viz-configured-state");
  const activeStrategyStep = Number(await renderer.getAttribute("data-viz-active-strategy-step"));
  if (!stateKey) throw new TypeError("G01 renderer has no configured state receipt.");
  const mode = stateField(stateKey, "operation");
  const exactOperation = stateField(stateKey, "exact");
  if (!MODE_OPTIONS.includes(mode as (typeof MODE_OPTIONS)[number])) {
    throw new TypeError(`${stateKey}: unsupported mode.`);
  }
  if (!["add", "subtract", "multiply", "divide"].includes(exactOperation)) {
    throw new TypeError(`${stateKey}: unsupported exact operation.`);
  }
  const rounding = stateField(stateKey, "rounding");
  return {
    activeStrategyStep,
    exactOperation: exactOperation as "add" | "subtract" | "multiply" | "divide",
    left: Number(stateField(stateKey, "left")),
    mode: mode as (typeof MODE_OPTIONS)[number],
    right: Number(stateField(stateKey, "right")),
    // Ordinary modes deliberately serialize rounding="-". Every logical
    // state begins from a live reset whose hidden estimate default is 10.
    roundingPlace: rounding === "-" ? 10 : Number(rounding),
    stateKey,
  };
}

async function resetObservationReceipt(root: Locator) {
  const resetControl = root.locator("[data-viz-reset-model]");
  await expect(resetControl).toHaveCount(1);
  const observation = await observeState(root);
  expect(observation).toMatchObject({
    activeStrategyStep: 0,
    exactOperation: "multiply",
    left: 347,
    mode: "multiply",
    right: 26,
    roundingPlace: 10,
  });
  return { exact: true as const, observation, resetControlCount: 1 as const };
}

async function resetReceipt(
  root: Locator,
  analyticsSubaction: G01InteractionStateReceipt["action"]["subactions"][number],
) {
  return { analyticsSubaction, ...await resetObservationReceipt(root) };
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
  project: G01ProductionProject,
  counters: RuntimeCounters,
) {
  await expect(locator).toHaveCount(1);
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  if (project === "mobile-chrome") {
    const box = await locator.boundingBox();
    if (!box) throw new TypeError("Mobile real-input target has no bounding box.");
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    counters.realTapCount += 1;
    return "page.touchscreen.tap";
  }
  await locator.click();
  return "locator.click";
}

async function setSelectThroughRealInput(
  page: Page,
  select: Locator,
  value: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  record: PhysicalSubactionRecorder,
  label: string,
) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLOptionElement).value),
  );
  const index = options.indexOf(value);
  if (index < 0) throw new TypeError(`Select has no exact option ${value}.`);
  const pointer = await record(`${label}-pointer`, () =>
    realTapOrClick(page, select, project, counters));
  const keyboard = await record(`${label}-keyboard`, async () => {
    await select.press("Home");
    for (let step = 0; step < index; step += 1) await select.press("ArrowDown");
    await select.press("Enter");
    return "locator.press(Home/ArrowDown/Enter)";
  });
  await expect(select).toHaveValue(value);
  return `${pointer.method}+${keyboard.method}`;
}

type PhysicalSubactionRecorder = (
  label: string,
  action: () => Promise<string>,
) => Promise<G01InteractionStateReceipt["action"]["subactions"][number]>;

async function setRangeThroughRealInput(
  page: Page,
  range: Locator,
  target: number,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  record: PhysicalSubactionRecorder,
) {
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const step = Number((await range.getAttribute("step")) ?? "1");
  if (!Number.isSafeInteger(target) || target < min || target > max || step !== 1) {
    throw new TypeError(`Invalid exact range target ${target} for [${min}, ${max}].`);
  }
  const box = await range.boundingBox();
  if (!box) throw new TypeError("Exact range target has no real bounding box.");
  const methods: string[] = [];
  if (target === min || target === max) {
    const pointer = await record("physical-pointer", () =>
      realTapOrClick(page, range, project, counters));
    methods.push(pointer.method);
    const correction = await record("keyboard-correction", async () => {
      await range.press(target === min ? "Home" : "End");
      return "locator.press(Home/End)";
    });
    methods.push(correction.method);
  } else {
    const ratio = (target - min) / (max - min);
    const thumbRadius = Math.min(10, box.width / 20);
    const x = box.x + thumbRadius + ratio * (box.width - thumbRadius * 2);
    const y = box.y + box.height / 2;
    const pointer = await record("physical-pointer", async () => {
      if (project === "mobile-chrome") {
        await page.touchscreen.tap(x, y);
        counters.realTapCount += 1;
        return "page.touchscreen.tap";
      }
      await page.mouse.click(x, y);
      return "page.mouse.click";
    });
    methods.push(pointer.method);
    let observed = Number(await range.inputValue());
    if (!Number.isSafeInteger(observed)) throw new TypeError("Range emitted a non-integer value.");
    const correctionCount = Math.abs(target - observed);
    expect(correctionCount, "physical pointer range correction budget").toBeLessThanOrEqual(4096);
    const correction = await record("keyboard-correction", async () => {
      if (observed === target) {
        const away = target > min ? "ArrowLeft" : "ArrowRight";
        const back = away === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
        await range.press(away);
        observed = Number(await range.inputValue());
        await range.press(back);
        observed = Number(await range.inputValue());
        return `locator.press(${away}/${back})`;
      }
      const key = observed < target ? "ArrowRight" : "ArrowLeft";
      while (observed !== target) {
        await range.press(key);
        observed = Number(await range.inputValue());
      }
      return `locator.press(${key})`;
    });
    methods.push(correction.method);
  }
  const observed = Number(await range.inputValue());
  if (!Number.isSafeInteger(observed)) throw new TypeError("Range emitted a non-integer value.");
  await expect(range).toHaveValue(String(target));
  return methods.join("+");
}

async function waitForAnalyticsQuiescence(
  harness: AnalyticsHarness,
  label: string,
  quietWindowMs = 300,
) {
  const timeoutAt = Date.now() + 10_000;
  let previousCount = harness.deliveries.length;
  let stableSince = Date.now();
  while (Date.now() < timeoutAt) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const currentCount = harness.deliveries.length;
    if (currentCount !== previousCount) {
      previousCount = currentCount;
      stableSince = Date.now();
      continue;
    }
    if (Date.now() - stableSince >= quietWindowMs) return currentCount;
  }
  throw new TypeError(`${label}: analytics stream did not reach quiescence.`);
}

async function collectSubactionAnalytics(
  harness: AnalyticsHarness,
  stateId: string,
  labId: string,
  expectedUserId: string,
  expectedSource: string,
  subactionId: string,
  action: () => Promise<string>,
) {
  await waitForAnalyticsQuiescence(harness, `${subactionId}:pre-quiesce`);
  const start = harness.deliveries.length;
  const method = await action();
  await expect.poll(
    () => harness.deliveries.length - start,
    { message: `${subactionId}: zero per-action analytics evidence`, timeout: 10_000 },
  ).toBeGreaterThan(0);
  await expect.poll(
    () => harness.deliveries.slice(start).every((delivery) =>
      delivery.responseStatus !== null &&
      delivery.responseMalformedReason !== "response not observed"),
    { message: `${subactionId}: learning-event response was not observed`, timeout: 10_000 },
  ).toBe(true);
  await waitForAnalyticsQuiescence(harness, `${subactionId}:post-quiesce`);
  const deliveries = harness.deliveries.slice(start);
  const rawEvent = validateG01RawAnalyticsDeliveryWindow(deliveries, {
    expectedSource,
    expectedUserId,
    labId,
  });
  if (harness.consumedAnalyticsEventIds.has(rawEvent.id)) {
    throw new TypeError(`${stateId}: analytics event ${rawEvent.id} was replayed across actions.`);
  }
  harness.consumedAnalyticsEventIds.add(rawEvent.id);
  const event: G01InteractionStateReceipt["analyticsEvents"][number] = {
    actionId: stateId,
    eventId: rawEvent.id,
    labId,
    source: rawEvent.source,
    stateId,
    subactionId,
    type: "visualization-action",
  };
  const analyticsEvents: G01InteractionStateReceipt["analyticsEvents"] = [event];
  const delivery = deliveries[0]!;
  return {
    analyticsEvidence: {
      endpoint: "/api/learning-events" as const,
      method: "POST" as const,
      request: {
        bodyEventIdentities: [{
          eventId: event.eventId,
          source: event.source,
          topicId: event.labId,
          type: event.type,
        }] as [{
          eventId: string;
          source: string;
          topicId: string;
          type: "visualization-action";
        }],
        eventIds: [event.eventId] as [string],
        ownerHeader: "x-mais-analytics-user-id" as const,
        userId: expectedUserId,
      },
      response: {
        acknowledgedEventIds: [...delivery.acknowledgedEventIds] as [string],
        status: delivery.responseStatus as 200,
      },
    },
    analyticsEvents,
    method,
    subactionId,
  };
}

async function selectMode(
  page: Page,
  root: Locator,
  mode: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
) {
  const button = root.locator(
    `[data-viz-mode-button][data-viz-mode=${JSON.stringify(mode)}]`,
  );
  const method = await realTapOrClick(page, button, project, counters);
  await settle(root, `mode:${mode}`);
  await expect(root.locator("[data-viz-configured-model]")).toHaveAttribute("data-viz-mode", mode);
  return method;
}

async function realReset(
  page: Page,
  root: Locator,
  project: G01ProductionProject,
  counters: RuntimeCounters,
) {
  const method = await realTapOrClick(page, root.locator("[data-viz-reset-model]"), project, counters);
  await settle(root, "reset");
  await resetObservationReceipt(root);
  return method;
}

async function controlEvidence(
  root: Locator,
  scenarioId: string,
): Promise<G01InteractionStateReceipt["control"]> {
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
  if (scenarioId.startsWith("mode:")) {
    const selected = scenarioId.slice("mode:".length);
    const buttons = root.locator("[data-viz-mode-button]");
    const options = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-viz-mode") ?? ""),
    );
    return {
      controlId: "mode",
      kind: "button",
      max: null,
      min: null,
      options,
      selected,
      step: null,
    };
  }
  const selectScenario = scenarioId.startsWith("estimate-from:")
    ? { controlId: "estimate-operation", value: scenarioId.slice("estimate-from:".length) }
    : scenarioId.startsWith("option:estimate-check:rounding-place:")
      ? { controlId: "rounding-place", value: scenarioId.split(":").at(-1)! }
      : null;
  if (selectScenario) {
    const select = root.locator(
      `select[data-viz-parameter=${JSON.stringify(selectScenario.controlId)}]`,
    );
    const rawOptions = await select.locator("option").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value),
    );
    const numeric = selectScenario.controlId === "rounding-place";
    return {
      controlId: selectScenario.controlId,
      kind: "select",
      max: null,
      min: null,
      options: numeric ? rawOptions.map(Number) : rawOptions,
      selected: numeric ? Number(await select.inputValue()) : await select.inputValue(),
      step: null,
    };
  }
  const parameter = scenarioId === "first"
    ? "strategy-step"
    : scenarioId.split(":").at(-2);
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
  stateId: string,
  labId: string,
  scenarioId: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
  expectedSource: string,
) {
  const subactions: G01InteractionStateReceipt["action"]["subactions"] = [];
  const record: PhysicalSubactionRecorder = async (label, action) => {
    const subactionId = `${stateId}:subaction:${subactions.length + 1}`;
    const receipt = await collectSubactionAnalytics(
      analytics,
      stateId,
      labId,
      expectedUserId,
      expectedSource,
      subactionId,
      async () => `${label}|${await action()}`,
    );
    subactions.push(receipt);
    return receipt;
  };
  if (scenarioId === "first") {
    const range = root.locator('input[type="range"][data-viz-parameter="strategy-step"]');
    await setRangeThroughRealInput(page, range, 1, project, counters, record);
    await settle(root, scenarioId);
  } else if (scenarioId.startsWith("mode:")) {
    await record("mode", () => selectMode(
      page, root, scenarioId.slice("mode:".length), project, counters));
  } else if (scenarioId.startsWith("estimate-from:")) {
    await record("mode", () => selectMode(page, root, "estimate-check", project, counters));
    const exactOperation = scenarioId.slice("estimate-from:".length);
    await setSelectThroughRealInput(
      page,
      root.locator('select[data-viz-parameter="estimate-operation"]'),
      exactOperation,
      project,
      counters,
      record,
      "select-estimate-operation",
    );
    await settle(root, scenarioId);
  } else if (scenarioId.startsWith("option:estimate-check:rounding-place:")) {
    await record("mode", () => selectMode(page, root, "estimate-check", project, counters));
    await setSelectThroughRealInput(
      page,
      root.locator('select[data-viz-parameter="rounding-place"]'),
      scenarioId.split(":").at(-1)!,
      project,
      counters,
      record,
      "select-rounding-place",
    );
    await settle(root, scenarioId);
  } else if (scenarioId.startsWith("endpoint:")) {
    const parts = scenarioId.split(":");
    const estimated = parts[1] === "estimate-check";
    const mode = parts[1]!;
    const exactOperation = estimated ? parts[2]! : mode;
    const parameter = estimated ? parts[3]! : parts[2]!;
    const endpoint = estimated ? parts[4]! : parts[3]!;
    await record("mode", () => selectMode(page, root, mode, project, counters));
    if (estimated) {
      await setSelectThroughRealInput(
        page,
        root.locator('select[data-viz-parameter="estimate-operation"]'),
        exactOperation,
        project,
        counters,
        record,
        "select-estimate-operation",
      );
      if (exactOperation === "divide" && parameter === "operand-b" && endpoint === "min") {
        await setSelectThroughRealInput(
          page,
          root.locator('select[data-viz-parameter="rounding-place"]'),
          "1",
          project,
          counters,
          record,
          "select-rounding-place",
        );
      }
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
    await setRangeThroughRealInput(page, range, target, project, counters, record);
    await settle(root, scenarioId);
  } else if (scenarioId === "reset") {
    await record("reset", () => realReset(page, root, project, counters));
  } else {
    throw new TypeError(`${scenarioId}: unsupported exact G01 interaction scenario.`);
  }
  return {
    analyticsEvents: subactions.flatMap(({ analyticsEvents }) => analyticsEvents),
    method: subactions.map(({ method }) => method).join("+"),
    subactions,
  };
}

async function interactionReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axisId: string,
  project: G01ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
  expectedSource: string,
  firstPrimaryGate?: () => Promise<void>,
): Promise<G01InteractionStateReceipt> {
  const scenarioId = scenarioIdFrom(stateId, labId, axisId);
  if (scenarioId === "initial") {
    const scan = await uiScan(root, stateId);
    return {
      action: { actionId: stateId, method: "none", modality: "none", realInput: false, subactions: [] },
      analyticsEvents: [],
      axisId,
      control: await controlEvidence(root, scenarioId),
      genericFallbackCount: await root.locator("[data-viz-renderer-mode]").count() as 0,
      labId,
      observation: await observeState(root),
      resetAfter: null,
      scenarioId,
      stateId,
      uiScan: scan.uiScan,
    };
  }
  const primary = await performScenarioAction(
    page,
    root,
    stateId,
    labId,
    scenarioId,
    project,
    counters,
    analytics,
    expectedUserId,
    expectedSource,
  );
  if (firstPrimaryGate) await firstPrimaryGate();
  const observation = await observeState(root);
  const control = await controlEvidence(root, scenarioId);
  const scan = await uiScan(root, stateId);
  const genericFallbackCount = await root.locator("[data-viz-renderer-mode]").count();
  expect(genericFallbackCount).toBe(0);
  let resetAfter: G01InteractionStateReceipt["resetAfter"] = null;
  if (scenarioId !== "reset") {
    const resetSubaction = await collectSubactionAnalytics(
      analytics,
      `${stateId}:reset-after`,
      labId,
      expectedUserId,
      expectedSource,
      `${stateId}:reset-after:subaction:1`,
      () => realReset(page, root, project, counters),
    );
    resetAfter = await resetReceipt(root, resetSubaction);
  }
  return {
    action: {
      actionId: stateId,
      method: primary.method,
      modality: project === "mobile-chrome" ? "touch" : "keyboard-mouse",
      realInput: true,
      subactions: primary.subactions,
    },
    analyticsEvents: primary.analyticsEvents,
    axisId,
    control,
    genericFallbackCount: genericFallbackCount as 0,
    labId,
    observation,
    resetAfter,
    scenarioId,
    stateId,
    uiScan: scan.uiScan,
  };
}

async function setLocale(
  page: Page,
  locale: Locale,
  project: G01ProductionProject,
  counters: RuntimeCounters,
) {
  const expectedLang = locale === "en" ? /^en(?:-|$)/u : locale === "zh" ? /^zh-Hant(?:-|$)/u : /^zh-Hans(?:-|$)/u;
  const current = (await page.locator("html").getAttribute("lang")) ?? "";
  if (expectedLang.test(current)) return;
  const mobileMenu = page.getByRole("button", { name: /open mobile menu|開啟手機選單|打开手机菜单/i });
  if (await mobileMenu.isVisible().catch(() => false)) {
    await realTapOrClick(page, mobileMenu, project, counters);
  }
  const selector = page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i });
  await realTapOrClick(page, selector, project, counters);
  const label = locale === "en"
    ? /Use English|使用英文/i
    : locale === "zh"
      ? /Use Traditional Chinese|使用繁體中文|使用繁体中文/i
      : /Use Simplified Chinese|使用簡體中文|使用简体中文/i;
  await realTapOrClick(page, page.getByRole("menuitemradio", { name: label }), project, counters);
  await expect(page.locator("html")).toHaveAttribute("lang", expectedLang);
}

async function setTheme(
  page: Page,
  theme: Theme,
  project: G01ProductionProject,
  counters: RuntimeCounters,
) {
  const dark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
  if (dark === (theme === "dark")) return;
  const toggle = page.getByRole("button", {
    name: /Switch to dark mode|Switch to light mode|切換至深色模式|切換至淺色模式|切换至深色模式|切换至浅色模式/i,
  });
  await realTapOrClick(page, toggle, project, counters);
  await expect.poll(
    () => page.locator("html").evaluate((element) => element.classList.contains("dark")),
  ).toBe(theme === "dark");
}

async function realHorizontalSwipe(
  page: Page,
  root: Locator,
  counters: RuntimeCounters,
) {
  const scroller = root.locator("[data-viz-scroll-container]");
  await expect(scroller).toHaveCount(1);
  const box = await scroller.boundingBox();
  if (!box) throw new TypeError("G01 mobile scroll container has no real bounding box.");
  const before = await scroller.evaluate((element) => element.scrollLeft);
  const context = page.context();
  const session = await context.newCDPSession(page);
  const y = box.y + Math.min(box.height / 2, 180);
  const startX = box.x + box.width * 0.8;
  const endX = box.x + box.width * 0.2;
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
}

async function visualReceipt(
  page: Page,
  root: Locator,
  stateId: string,
  labId: string,
  axis: { axisId: string; locale: string; project: string; theme: string },
  project: G01ProductionProject,
  counters: RuntimeCounters,
  analytics: AnalyticsHarness,
  expectedUserId: string,
  expectedSource: string,
): Promise<G01VisualStateReceipt> {
  if (
    (axis.locale !== "en" && axis.locale !== "zh" && axis.locale !== "zh-Hans") ||
    (axis.theme !== "dark" && axis.theme !== "light") ||
    axis.project !== project
  ) throw new TypeError(`${axis.axisId}: invalid G01 visual axis.`);
  await setLocale(page, axis.locale, project, counters);
  await setTheme(page, axis.theme, project, counters);
  const resetSubaction = await collectSubactionAnalytics(
    analytics,
    `${stateId}:visual-reset`,
    labId,
    expectedUserId,
    expectedSource,
    `${stateId}:visual-reset:subaction:1`,
    () => realReset(page, root, project, counters),
  );
  const reset = await resetReceipt(root, resetSubaction);
  if (project === "mobile-chrome") await realHorizontalSwipe(page, root, counters);
  const scrollAudits: G01VisualStateReceipt["scrollAudits"] = [];
  for (const scrollId of SCROLL_POSITIONS) {
    if (scrollId === "page-top") await page.keyboard.press("Home");
    if (scrollId === "visualization-center") await root.scrollIntoViewIfNeeded();
    if (scrollId === "page-bottom") await page.keyboard.press("End");
    await page.waitForTimeout(50);
    const scan = await uiScan(root, `${stateId}:${scrollId}`);
    scrollAudits.push({
      clippedElementCount: scan.clippedElementCount as 0,
      collisionIssueCount: 0,
      contrastCheckedTextCount: scan.contrastCheckedTextCount,
      contrastIssueCount: 0,
      horizontalOverflowPixels: scan.horizontalOverflowPixels as 0,
      scrollId,
      touchTargetCheckedCount: scan.touchTargetCheckedCount,
      touchTargetIssueCount: scan.touchTargetIssueCount as 0,
      uiScan: scan.uiScan,
    });
  }
  const configuredModelCount = await root.locator("[data-viz-configured-model]").count();
  const genericFallbackCount = await root.locator("[data-viz-renderer-mode]").count();
  const resetControlCount = await root.locator("[data-viz-reset-model]").count();
  expect([configuredModelCount, genericFallbackCount, resetControlCount]).toEqual([1, 0, 1]);
  return {
    axisId: axis.axisId,
    identity: {
      activeLabId: labId,
      configuredModelCount: configuredModelCount as 1,
      genericFallbackCount: genericFallbackCount as 0,
      playApplicable: false,
      renderer: "mainland-multi-digit-operations",
      resetControlCount: resetControlCount as 1,
    },
    labId,
    locale: axis.locale,
    project,
    reset,
    scrollAudits,
    stateId,
    theme: axis.theme,
  };
}

test.describe("Mainland G01 exact production browser receipt", () => {
  test("fails closed without trusted runner authority before producing any G01 receipt", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60 * 60_000);
    const runnerInvocation = requireG01ProductionRunnerAuthority();
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
      realSwipeCount: 0,
      realTapCount: 0,
      sessionPostCount: 0,
      swipeMoveCount: 0,
    };
    const analytics = installAnalyticsHarness(page, counters);
    await installHkVisualizationEffectiveVisibilityInspector(page);

    const interactionAxis = expectedInteractionAxis(project);
    const interactionStateIds = expectedInteractionStateIds(project);
    const visualAxes = expectedVisualAxes(project);
    const visualStateIds = expectedVisualStateIds(project);
    const interactionStates: G01InteractionStateReceipt[] = [];
    const visualStates: G01VisualStateReceipt[] = [];
    const durabilityReceipts: G01ProductionBrowserPayload["durabilityReceipts"] = [];

    for (const labId of G01_PRODUCTION_PLAN.labIds) {
      const student = await registerMainlandStudent(page, testInfo, labId);
      const { setupSubactions, siblingBaseline } = await seedSiblingSessions(
        page,
        labId,
        project,
        counters,
        analytics,
        student.userId,
      );
      const mountPosts = counters.sessionPostCount;
      await waitForAnalyticsQuiescence(analytics, `${labId}:mount:pre-quiesce`);
      const mountDeliveryStart = analytics.deliveries.length;
      const response = await page.goto(`/student/lessons/${encodeURIComponent(labId)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);
      await closeLearnerStartSetupIfVisible(page);
      let root = await activeRoot(page, labId);
      await settle(root, `${labId}:mount`);
      await resetObservationReceipt(root);
      await page.waitForTimeout(5_500);
      await waitForAnalyticsQuiescence(analytics, `${labId}:mount:post-quiesce`);
      expect(counters.sessionPostCount - mountPosts).toBe(0);
      const afterMount = await visualizationSessions(page);
      expect(targetSessions(afterMount, labId)).toEqual([]);
      expectSiblingSessionsUnchanged(afterMount, labId, siblingBaseline);
      const siblingBaselineReceipt = {
        count: siblingBaseline.length,
        sessions: structuredClone(siblingBaseline),
        userId: student.userId,
      };
      const siblingMountReceipt = siblingSessionSetReceipt(student.userId, afterMount, labId);
      const targetMountReceipt = sessionSetReceipt(
        student.userId,
        targetSessions(afterMount, labId),
      );
      expect(analytics.deliveries.slice(mountDeliveryStart)).toEqual([]);

      const labStateIds = interactionStateIds.filter((stateId) =>
        stateId.startsWith(`interaction:${labId}:${interactionAxis.axisId}:`),
      );
      const initialStateId = labStateIds[0];
      const firstStateId = labStateIds[1];
      if (!initialStateId?.endsWith(":initial") || !firstStateId?.endsWith(":first")) {
        throw new TypeError(`${labId}: G01 initial/first plan order drifted.`);
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
      let acknowledgementStatus = 0;
      let afterFirstTarget: LiveSession[] = [];
      let sessionId = "";
      let targetSession: G01SessionSnapshot | null = null;
      let siblingFirstReceipt: ReturnType<typeof siblingSessionSetReceipt> | null = null;
      let targetFirstReceipt: ReturnType<typeof sessionSetReceipt> | null = null;
      const firstPrimaryGate = async () => {
        const firstAck = await firstAckPromise;
        acknowledgementStatus = firstAck.status();
        expect(acknowledgementStatus).toBe(200);
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
        const afterFirst = await visualizationSessions(page);
        expectSiblingSessionsUnchanged(afterFirst, labId, siblingBaseline);
        siblingFirstReceipt = siblingSessionSetReceipt(student.userId, afterFirst, labId);
        afterFirstTarget = targetSessions(afterFirst, labId);
        expect(afterFirstTarget).toHaveLength(1);
        targetFirstReceipt = sessionSetReceipt(student.userId, afterFirstTarget);
        targetSession = sessionSnapshot(afterFirstTarget[0]!);
        sessionId = g01DurableSessionId(student.userId, targetSession);
        if (!acknowledgement.session) {
          throw new TypeError(`${labId}: first-action ACK has no exact target session.`);
        }
        expect(sessionSnapshot(acknowledgement.session)).toEqual(targetSession);
        expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      };
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
          firstPrimaryGate,
        ),
      );
      expect(acknowledgementStatus).toBe(200);
      expect(afterFirstTarget).toHaveLength(1);
      expect(sessionId).not.toBe("");
      if (!targetSession || !siblingFirstReceipt || !targetFirstReceipt) {
        throw new TypeError(`${labId}: first-action durable snapshots were not sealed.`);
      }

      // interactionReceipt performs a real reset after the first state. That
      // second learner action must reuse the same server-backed session.
      const afterSecond = await visualizationSessions(page);
      expectSiblingSessionsUnchanged(afterSecond, labId, siblingBaseline);
      const afterSecondTarget = targetSessions(afterSecond, labId);
      expect(afterSecondTarget).toHaveLength(1);
      expect(sessionSnapshot(afterSecondTarget[0]!)).toEqual(targetSession);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      const siblingResetReceipt = siblingSessionSetReceipt(student.userId, afterSecond, labId);
      const targetResetReceipt = sessionSetReceipt(student.userId, afterSecondTarget);

      await page.reload({ waitUntil: "domcontentloaded" });
      await closeLearnerStartSetupIfVisible(page);
      root = await activeRoot(page, labId);
      await settle(root, `${labId}:reload`);
      const afterReload = await visualizationSessions(page);
      expectSiblingSessionsUnchanged(afterReload, labId, siblingBaseline);
      const afterReloadTarget = targetSessions(afterReload, labId);
      expect(afterReloadTarget).toHaveLength(1);
      expect(sessionSnapshot(afterReloadTarget[0]!)).toEqual(targetSession);
      const siblingReloadReceipt = siblingSessionSetReceipt(student.userId, afterReload, labId);
      const targetReloadReceipt = sessionSetReceipt(student.userId, afterReloadTarget);

      for (const stateId of labStateIds.slice(2)) {
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
      const afterInteractions = await visualizationSessions(page);
      expectSiblingSessionsUnchanged(afterInteractions, labId, siblingBaseline);
      const afterInteractionsTarget = targetSessions(afterInteractions, labId);
      expect(afterInteractionsTarget).toHaveLength(1);
      expect(sessionSnapshot(afterInteractionsTarget[0]!)).toEqual(targetSession);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      const siblingSecondReceipt = siblingSessionSetReceipt(student.userId, afterInteractions, labId);
      const targetSecondReceipt = sessionSetReceipt(student.userId, afterInteractionsTarget);

      for (const axis of visualAxes) {
        const stateId = `visual:${labId}:${axis.axisId}:reset`;
        if (!visualStateIds.includes(stateId)) {
          throw new TypeError(`${stateId}: visual state is absent from the frozen plan.`);
        }
        visualStates.push(
          await visualReceipt(
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
          ),
        );
      }
      const finalSessions = await visualizationSessions(page);
      expectSiblingSessionsUnchanged(finalSessions, labId, siblingBaseline);
      const finalTarget = targetSessions(finalSessions, labId);
      expect(finalTarget).toHaveLength(1);
      expect(sessionSnapshot(finalTarget[0]!)).toEqual(targetSession);
      expect(counters.sessionPostCount - firstPostBaseline).toBe(1);
      const siblingFinalReceipt = siblingSessionSetReceipt(student.userId, finalSessions, labId);
      const targetFinalReceipt = sessionSetReceipt(student.userId, finalTarget);
      durabilityReceipts.push({
        final: {
          exactlyOnce: true,
          noSiblingMutation: true,
          serverBacked: true,
          survivedReload: true,
        },
        firstAction: {
          acknowledgementStatus: 200,
          postCount: 1,
          sessionCount: afterFirstTarget.length as 1,
        },
        labId,
        lessonId: labId,
        mount: { postCount: 0, sessionCount: 0 },
        reload: {
          sameSession: true,
          sessionCount: afterReloadTarget.length as 1,
        },
        resetAfter: {
          postCount: 0,
          sessionCount: afterSecondTarget.length as 1,
        },
        secondAction: {
          postCount: 0,
          sessionCount: afterInteractionsTarget.length as 1,
        },
        sessionId,
        setupSubactions,
        siblingSnapshots: {
          baseline: siblingBaselineReceipt,
          final: siblingFinalReceipt,
          first: siblingFirstReceipt,
          mount: siblingMountReceipt,
          reload: siblingReloadReceipt,
          reset: siblingResetReceipt,
          second: siblingSecondReceipt,
        },
        targetSession,
        targetSnapshots: {
          final: targetFinalReceipt,
          first: targetFirstReceipt,
          mount: targetMountReceipt,
          reload: targetReloadReceipt,
          reset: targetResetReceipt,
          second: targetSecondReceipt,
        },
        userId: student.userId,
      });
    }

    expect(interactionStates.map((receipt) => receipt.stateId)).toEqual(interactionStateIds);
    expect(visualStates.map((receipt) => receipt.stateId)).toEqual(visualStateIds);
    expect(diagnostics.consoleErrors).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.requestFailures).toEqual([]);
    const producerPath = new URL("./china-mainland-g01-production-browser.spec.ts", import.meta.url);
    const planPath = new URL("./china-mainland-g01-production-plan.ts", import.meta.url);
    const receiptPath = new URL("./china-mainland-g01-production-receipt.ts", import.meta.url);
    const routingPath = new URL("./china-mainland-g01-g02-production-routing.spec.ts", import.meta.url);
    await waitForAnalyticsQuiescence(analytics, "G01 terminal post-quiesce", 1_000);
    const serializedEventIds = g01SerializedAnalyticsEventIds({
      durabilityReceipts,
      interactionStates,
      visualStates,
    });
    const observedDeliveryEventIds = analytics.deliveries
      .flatMap(({ events }) => events.map(({ id }) => id))
      .sort();
    const observedRawEventIds = analytics.deliveries
      .flatMap(({ rawEventIds }) => rawEventIds)
      .sort();
    const consumedEventIds = [...analytics.consumedAnalyticsEventIds].sort();
    const analyticsTerminal = {
      consumedEventIds,
      observedDeliveryCount: analytics.deliveries.length,
      observedDeliveryEventIds,
      observedRawEventIds,
      postQuiescent: true as const,
      serializedEventIds,
    };
    expect(validateG01AnalyticsTerminalEvidence(
      analyticsTerminal,
      serializedEventIds,
    )).toBe(true);
    const payload: G01ProductionBrowserPayload = {
      analyticsTerminal,
      diagnostics: { consoleErrors: [], pageErrors: [], requestFailures: [] },
      durabilityReceipts,
      execution: {
        complete: false,
        configuredProjects: [...SUPPORTED_PROJECTS],
        expectedStatus: "passed",
        projectsTogether: true,
        retries: 0,
        shard: null,
        skipped: 0,
        unexpected: 0,
      },
      fullVisualInteractionCartesian: false,
      groupId: "G01",
      interactionAxisId: interactionAxis.axisId,
      interactionStates,
      labIds: [...G01_PRODUCTION_PLAN.labIds],
      planCanonicalSha256: G01_PRODUCTION_PLAN.canonicalSha256,
      playApplicable: false,
      project,
      runnerInvocation,
      schemaVersion: "china-mainland-g01-production-browser-receipt.v1",
      sourceEvidence: {
        planSha256: sha256File(planPath),
        producerSha256: sha256File(producerPath),
        receiptValidatorSha256: sha256File(receiptPath),
        routingSpecSha256: sha256File(routingPath),
      },
      touchEvidence: project === "mobile-chrome"
        ? {
            hasTouch: true,
            realSwipeCount: counters.realSwipeCount,
            realTapCount: counters.realTapCount,
            swipeMoveCount: counters.swipeMoveCount,
            swipeProtocol: "cdp:Input.dispatchTouchEvent",
          }
        : {
            hasTouch: false,
            realSwipeCount: 0,
            realTapCount: 0,
            swipeMoveCount: 0,
            swipeProtocol: "none",
          },
      visualAxisIds: visualAxes.map(({ axisId }) => axisId),
      visualStates,
    };
    const receipt = sealG01ProductionBrowserPayload(payload);
    validateG01ProductionBrowserReceipt(receipt, project);
    await testInfo.attach(`china-mainland-g01-production-${project}.json`, {
      body: Buffer.from(JSON.stringify(receipt, null, 2)),
      contentType: "application/json",
    });
  });
});
